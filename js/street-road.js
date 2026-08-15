// 马路 — the road district. What is painted on the carriageway and what stands beside it.
//
// The shell (js/street.js) already lays the asphalt, the kerbs, the pavements both sides, the
// bike-lane paint, a zebra, the manholes, gully grates, made-good patches, the bollards, the
// pavement railing, the lamps, the trees, the bus shelter, the parked bus and one signal mast.
// None of that is rebuilt here. What was missing is everything that says *how the road works*:
// which lane is which, where you may cross, when you may cross, and how long you have.
//
// ---------------------------------------------------------------------------------------------
// THE ROAD-SPACE VERDICT  (STREET.md problem 3, street.js:2299)
//
// The comment is wrong; the road is right. Measured off the shell:
//
//     23.42 – 25.42   west clear footway  2.00 m      no shelter or furnishing consumes it
//     25.42 – 27.67   西侧非机动车道     2.25 m      behind the protected boarding island
//     27.67 – 29.47   separator/platform  1.80 m      .90 m r=.45 centre band before furniture
//     29.47 – 32.67   南行/公交           3.20 m      2.82 m swept 623 envelope + .19 m/side
//     32.67 – 35.17   北行机动车道        2.50 m      2.04 m car envelope + .23 m/side
//     35.17 – 37.42   东侧非机动车道      2.25 m
//     37.42 – 41.48   east footway         4.06 m      exactly 2.00 m past 商务区 metro
//
// That is 双向两车道 plus a 非机动车道 each side: a 朝阳区 支路, the kind of road a 胡同 actually
// comes out onto. The former 9.84 m asphalt-only accounting could not fit two cycle tracks, the
// emitted 623 envelope, an opposing lane and any independent platform. This uses the complete
// public right-of-way instead: the west cycle track runs behind a real island, while the east edge
// stays fixed so the 商务区 metro never becomes an obstacle in a painted route.
//
// ---------------------------------------------------------------------------------------------
// THE CROSSING
//
// Two-stage, the Chinese way. A centre-line refuge would consume one of the two motor paths, so on
// this 支路 with a 非机动车道 the 二次过街 island
// goes on the 机非隔离带 instead — you cross the bike lane, wait on the island behind the 隔离栏,
// and cross the carriageway on the pedestrian green. That is what is built here, and it costs no
// motor lane a single centimetre.
//
// The island is 1.80 m wide and raised only at its two ends; the crossing runs through it at road
// level, because this engine walks a body at y = 0 and a 15 cm kerb across a pedestrian route is a
// body wading through concrete. Its west 0.30 m is the shelter furnishing strip and the remaining
// 1.50 m is continuous platform clear width.
//
// ---------------------------------------------------------------------------------------------
// THE LIGHTS, AND THE INTERFACE THE TRAFFIC AGENT READS
//
//     StreetFit.road.signal.phase(t)   -> 'green' | 'amber' | 'red'   for motor traffic
//     StreetFit.road.signal.go(t)      -> boolean, may a car cross the stop line
//     StreetFit.road.signal.secs(t)    -> seconds left in the aspect now showing
//     StreetFit.road.signal.stopLine   -> { north: -4.00, south: 3.60 }   z of each stop bar
//     StreetFit.road.signal.lanes      -> the four lane centres above
//     StreetFit.road.signal.emergency  -> deterministic fire-priority interlock and clock state
//     StreetFit.road.signal.now        -> the same, cached, rewritten every tick
//
// All of it is pure and set at file load, so it can be read from another district's builder
// whatever order the files happen to register in. `t` is the same wall clock in seconds the shell
// hands every district tick.
//
// ---------------------------------------------------------------------------------------------
// ONE BUG FOUND ON THE WAY IN, NOW FIXED IN THE SHELL
//
// This district was written against a `buildDistricts()` that was called from the end of `build()`,
// which is above the `const S` it passes — so `f(S)` read S out of the temporal dead zone and every
// district in the game died with "Cannot access 'S' before initialization", swallowed by the
// registry's own try/catch. The street looked fine and not one district was ever built. The Mech
// has since moved the call below `S` (js/street.js, the note at `buildDistricts`) and all nine
// build. Recorded here because it is the failure mode this registry will have again: a builder that
// throws is silent by design, so a district that has quietly stopped building looks exactly like a
// district that has nothing to say.
(() => {
  'use strict';

  // Every digit, registered at load so the countdowns can swap `ch` per second. `need` has to run
  // before the atlas is drawn, and script load is the only moment that is certainly true.
  try { Glyphs.need('0123456789'); } catch (_) {}

  // ---------------------------------------------------------------- the road, measured
  const RD0 = 25.42, RD1 = 37.42;                        // continuous public road-space edges
  const KW = RD0, KE = RD1;                              // kerb faces, road side
  const BW0 = 25.42, BW1 = 27.67;                        // 西侧非机动车道
  const ISX0 = 27.67, ISX1 = 29.47;                      // 1.80 m island / protected separator
  const MS0 = 29.47, MS1 = 32.67;                        // 南行公交/机动车道
  const MN0 = 32.67, MN1 = 35.17;                        // 北行机动车道
  const BE0 = 35.17, BE1 = 37.42;                        // 东侧非机动车道
  const MID = MS1;                                       // 双黄线 between the motor lanes
  const CZ0 = -2.50, CZ1 = 2.10;                         // the shell's zebra, in z
  const ISZ0 = -3.60, ISZ1 = 3.00;
  const ISD0 = -2.72, ISD1 = 2.16;                       // the flush deck the crossing runs over
  const BPZ0 = -14.80, BPZ1 = ISZ0;                      // 公交 boarding platform, joined to refuge
  const BCZ0 = -11.20, BCZ1 = -7.90;                    // broad crossing from shelter to platform
  const RAILX = 29.46;                                   // rail face retains .15 m from straight 623
  const SLN = -4.00, SLS = 3.60;                         // 停止线, north- and south-side bars

  // The decal stack, in millimetres above the ground plane. The shell's own road markings are at
  // 8–9 mm, its west bike-lane surface at 6 and its asphalt at 4.  This district's east surface is
  // relaid at 12 mm: the former 6 mm copy sat only 2 mm above 188 m of asphalt, below far-view depth
  // precision.  Nothing new is ever laid on a plane something else already occupies:
  //
  //    12.0   east bike-lane surface   (the shell's west one is at 6.0, on disjoint x)
  //    14.0   the ghost of an older centre line        14.5   the made-good trench
  //    15.5   the trench's seams                       16.5   YP — lane lines, stop bars, the island
  //    20.5   tyre polish across the zebra             22.0   the east 机非线, over the old dashes
  //    29.5   tactile block on the island              38.5   its ridges
  //
  // Where a new line would cross a manhole (x 35.30) it is broken rather than lifted over it.
  const YP = .0165, YT = .0145;

  // ---------------------------------------------------------------- 红绿灯, the phase
  //
  // 66 seconds. A long red, a short amber, an all-red pause each way, and a flashing green at the
  // end of the walk — which is as much a part of reading as Chinese as the countdown is.
  //
  //    0 – 30   motor GREEN            ped red, counting down to 35
  //   30 – 33   motor AMBER
  //   33 – 35   ALL RED
  //   35 – 55   motor red, ped WALK    counting down to 62
  //   55 – 62   motor red, ped FLASHING GREEN
  //   62 – 66   ALL RED
  //
  // Motor red totals 33 s against 30 s of green, so the wait is the long half — which is what a
  // pedestrian crossing on a 支路 is for.
  const CYCLE = 66, G_END = 30, A_END = 33, W0 = 35, W1 = 55, F1 = 62;
  const wrap = t => ((t % CYCLE) + CYCLE) % CYCLE;

  // Fire priority is a scheduled interval on the same clock every street controller receives. It
  // is deliberately not a wall-clock timeout: a paused scene, a deterministic replay and the Node
  // mobility gate all observe the same start/end instants. The token prevents an old dispatch from
  // cancelling a newer one.
  const emergencyState = {
    active: false, source: null, start: Infinity, until: -Infinity, token: 0,
  };
  const EMERGENCY = {
    controls: ['bikeW', 'south', 'north', 'bikeE'],
    state: emergencyState,
    activate(source, at, duration) {
      if (typeof source !== 'string' || !source || !Number.isFinite(at) ||
          !Number.isFinite(duration) || duration <= 0) return 0;
      emergencyState.source = source;
      emergencyState.start = at;
      emergencyState.until = at + duration;
      emergencyState.token++;
      emergencyState.active = this.active(SIGNAL.now.t);
      return emergencyState.token;
    },
    cancel(token) {
      if (!Number.isInteger(token) || token !== emergencyState.token ||
          emergencyState.until <= emergencyState.start) return false;
      emergencyState.source = null;
      emergencyState.start = Infinity;
      emergencyState.until = -Infinity;
      emergencyState.active = false;
      return true;
    },
    active(t) {
      return Number.isFinite(t) && t >= emergencyState.start && t < emergencyState.until;
    },
    remaining(t) {
      return this.active(t) ? Math.max(0, emergencyState.until - t) : 0;
    },
  };

  const SIGNAL = {
    cycle: CYCLE,
    // What the motor traffic on this road is being shown.
    phase(t) {
      if (EMERGENCY.active(t)) return 'red';
      const u = wrap(t); return u < G_END ? 'green' : u < A_END ? 'amber' : 'red';
    },
    // May a car cross the stop line. Amber is deliberately false: whether a car already past the
    // bar keeps going is the traffic agent's decision, not the light's.
    go(t) { return !EMERGENCY.active(t) && wrap(t) < G_END; },
    // Seconds left in the aspect now showing, 1..n, the way a Chinese vehicle countdown reads.
    secs(t) {
      if (EMERGENCY.active(t)) return Math.max(1, Math.ceil(EMERGENCY.remaining(t)));
      const u = wrap(t);
      return Math.max(1, Math.ceil(u < G_END ? G_END - u : u < A_END ? A_END - u : CYCLE - u));
    },
    // What the pedestrian is being shown.
    ped(t) {
      if (EMERGENCY.active(t)) return 'stop';
      const u = wrap(t);
      return u < W0 ? 'stop' : u < W1 ? 'walk' : u < F1 ? 'flash' : 'stop';
    },
    pedSecs(t) {
      if (EMERGENCY.active(t)) return Math.max(1, Math.ceil(EMERGENCY.remaining(t)));
      const u = wrap(t);
      if (u >= W0 && u < F1) return Math.max(1, Math.ceil(F1 - u));
      return Math.max(1, Math.ceil(u < W0 ? W0 - u : CYCLE - u + W0));
    },
    // Where a car has to stop. The west lane runs +z and meets the north-side bar; the east lane
    // runs -z and meets the south-side bar. The names are geographic sides, not travel directions.
    stopLine: { north: SLN, south: SLS },
    crossing: {
      z0: CZ0, z1: CZ1, blocked: true,
      stages: {
        cycle: { x0: KW, x1: ISX0, blocked: true },
        carriageway: { x0: ISX1, x1: KE, blocked: true },
      },
    },
    // The lane centres this district has marked the road for.
    //
    // Centres are derived from the published edges. Keeping one source of truth matters here: the
    // old literal south centre put a lane-width bus exactly on both paint lines, while its mirrors
    // extended another quarter-metre into the cycle track and opposing lane.
    lanes: { bikeW: (BW0 + BW1) / 2, south: (MS0 + MS1) / 2,
             north: (MN0 + MN1) / 2, bikeE: (BE0 + BE1) / 2 },
    laneEdges: { bikeW: [BW0, BW1], south: [MS0, MS1], north: [MN0, MN1], bikeE: [BE0, BE1] },
    // The refuge is an independent strip. Cycles keep their complete protected track beside it;
    // there is no zero-width r=.45 island and no 1.50 m bicycle pinch to steer through.
    island: { x0: ISX0, x1: ISX1, z0: ISZ0, z1: ISZ1, bikeSqueeze: [BW0, BW1] },
    // The bus remains in its motor lane beside this platform. Passengers cross only the cycle
    // track from the shelter; they no longer step onto a zebra hidden beneath an eleven-metre bus.
    busPlatform: { x0: ISX0, x1: ISX1, z0: BPZ0, z1: BPZ1,
                   furnishing: [ISX0, ISX0 + .30], clear: [ISX0 + .30, ISX1],
                   cycleCrossing: { z0: BCZ0, z1: BCZ1 } },
    // North of the base road the public patient route ends at the cycle-track kerb. Emergency
    // vehicles cross the protected track only on this one marked, priority-controlled table.
    hospitalAccess: {
      footway: [23.20, BW0], cycle: [BW0, BW1],
      ambulanceCrossing: { z: 35.55, width: 3.88, controls: ['bikeW'] },
    },
    loadingBay: null,
    kerbs: { west: KW, east: KE },
    emergency: EMERGENCY,
    now: { t: 0, phase: 'green', secs: 30, ped: 'stop', pedSecs: 35, mayCross: false,
           emergency: false, emergencySource: null },
  };

  // ---------------------------------------------------------------- what the tick drives
  const heads = [];          // every signal head, this file's and the shell's
  const crossingGates = [];  // invisible stage-boundary gates, opened only for walk/clearance
  let built = false;

  // Lamp colours, held as literals rather than rebuilt per frame — and never looked up by an index
  // that could miss, because a prop whose colour comes back undefined takes the whole game down.
  const RED_ON = [1.00, .29, .20], RED_OFF = [.14, .062, .046];
  const AMB_ON = [1.00, .76, .26], AMB_OFF = [.11, .086, .032];
  const GRN_ON = [.27, .88, .48], GRN_OFF = [.052, .105, .072];

  // ================================================================ the builder
  function build(S) {
    if (built) return;
    built = true;
    // The shell's props as they stood before this district added any of its own, so the search for
    // the existing signal mast at the bottom cannot pick up one of my own lamps by mistake.
    const P0 = S.props.slice();
    const { box, cyl, ball, flat, taper, glyphs, solid, thing, cap, C } = S;

    const PAINT = C('#cdc7b4'), PAINTW = C('#ded8c6');
    const BIKE = C('#6b5148'), TRENCH = C('#2f312c'), SEAM = C('#252723');
    const SCUFF = C('#4e4c47'), GHOST = C('#8f8a76'), STUD = C('#d8d2be'), STUDA = C('#c98a2e');
    const CONC = C('#a9a292'), CONCD = C('#8b8474'), TACT = C('#d8ac2c'), TACTD = C('#c39a22');
    const RAIL = C('#cfd6cf'), RAILD = C('#8e968f'), POLE = C('#5a6167'), POLED = C('#3a3f44');
    const CASE = C('#2c3035'), DARKR = C('#24100c'), DARKG = C('#0d1a12'), DARKA = C('#1c1608');
    const LITR = C('#ff4a33'), LITG = C('#46e07a');
    const SIGNB = C('#1f4f8f'), SIGNW = C('#eeeade'), SIGNK = C('#22262b'), SIGNR = C('#b8322a');
    const ROADMAT = { mat: 'concrete', matScale: 3.00, matAmt: .14 };
    const CONMAT = { mat: 'concrete', matScale: .95, matAmt: .12 };

    // ---------------------------------------------------------- 车道线, the lane markings
    //
    // Long thin quads rather than many short ones: this street is fill-rate bound, and a line
    // drawn as thirty pieces is thirty draw calls for a hundred metres of paint. Every one of them
    // is broken at the crossing, because that is where road markings stop.

    // The east 非机动车道, surfaced to match the west one the shell lays against the moved kerb.
    flat((BE0 + BE1) / 2, .012, 0, BE1 - BE0, 188, BIKE, { mode: 10, gloss: .18, ...ROADMAT });

    // The 1.80 m protected separator is part of the continuous road-space section. At the stop it
    // becomes the boarding platform; at the zebra it becomes the refuge. Between those places the
    // subdued paving makes the cycle/motor separation explicit without a forest of blocky props.
    flat((ISX0 + ISX1) / 2, .012, 0, ISX1 - ISX0, 188, CONCD,
      { mode: 9, gloss: .16, ...CONMAT });

    // 机非分界线 west — the cycle-side edge of the protected separator. It hands over to the
    // flush platform/refuge where passengers cross, but remains visually continuous elsewhere.
    for (const [z0, z1] of [[-90, BPZ0], [ISZ1, 90]])
      flat(BW1, YP, (z0 + z1) / 2, .15, z1 - z0, PAINT, { gloss: .10 });
    // 机非分界线 east — the shell's former dashes, re-lined solid. A road that has been marked
    // over its old lines is what every road in this city is, and the ghost of the dashes under
    // 22 cm of new paint is why it is drawn that wide. Broken at the crossing and at the three
    // manhole covers on x 35.30, which the line would otherwise slice through.
    for (const [z0, z1] of [[-90, -28.6], [-27.6, ISZ0], [ISZ1, 33.4], [34.4, 90]])
      flat(BE0, .0220, (z0 + z1) / 2, .22, z1 - z0, PAINT, { gloss: .10 });
    // 边缘线 — the outer edge of the east bike lane, against the kerb.
    for (const [z0, z1] of [[-90, ISZ0], [ISZ1, 90]])
      flat(KE - .22, YP, (z0 + z1) / 2, .12, z1 - z0, PAINT, { gloss: .09 });

    // 停止线. Both run from the centre line out to the kerb, over the bike lane too — bikes hold
    // at the same bar.
    flat((MN0 + KE) / 2, YP, SLS, KE - MN0 - .10, .42, PAINTW, { gloss: .10 });
    // The west-lane bar is in two pieces because the guard rail stands between them, which is
    // what a stop line does when a 隔离栏 crosses it.
    flat((BW0 + BW1) / 2, YP, SLN, BW1 - BW0 - .10, .42, PAINTW, { gloss: .10 });
    flat((MS0 + MS1) / 2, YP, SLN, MS1 - MS0 - .10, .42, PAINTW, { gloss: .10 });

    // 导向箭头 — a straight-ahead arrow in each motor lane, back from its stop bar. There is no
    // dashed centre line on this road to draw, because a two-lane road at a signalised crossing
    // carries a solid 双黄线 and the shell already paints it; the arrows are what a Chinese driver
    // actually reads off the surface, and they are also the clearest statement that each of these
    // is one lane going one way.
    arrow(SIGNAL.lanes.south, -7.70, 1);
    arrow(SIGNAL.lanes.north, 7.30, -1);
    function arrow(cx, cz, dir) {
      flat(cx, YP, cz, .24, 2.60, PAINTW, { gloss: .10 });
      const tip = cz + dir * 1.90;
      for (const sd of [-1, 1])
        flat(cx + sd * .275, YP, tip - dir * .475, .22, 1.10, PAINTW,
          { ry: Math.atan2(sd * .5, -dir * .864), gloss: .10 });
    }

    // Wear. Two polished bands where every tyre in the city has crossed the zebra, and the ghost
    // of an older centre line 34 cm off the current one — the cheapest single thing that stops new
    // paint on old asphalt reading as a decal.
    for (const zz of [-1.55, 1.15])
      flat((MS0 + KE) / 2, .0205, zz, KE - MS0, .74, SCUFF, { mode: 10, gloss: .26, ...ROADMAT });
    for (const [z0, z1] of [[-24, -12], [14, 26]])
      flat(MID - .34, .0140, (z0 + z1) / 2, .10, z1 - z0, GHOST, { gloss: .06 });

    // 沟槽 — a trench cut across the northbound lane and made good: darker, a seam either side,
    // and the lane markings drawn back over the top of it, because it was re-lined afterwards.
    flat((MN0 + KE) / 2, YT, 9.05, KE - MN0, 1.34, TRENCH, { mode: 10, gloss: .17, ...ROADMAT });
    for (const zz of [8.38, 9.72])
      flat((MN0 + KE) / 2, .018, zz, KE - MN0, .07, SEAM, { gloss: .08 });

    // 道钉 — cats-eyes down the centre line, between the two yellows. One mesh, one mode, one
    // size: the whole run batches into a single draw call.
    for (let i = 0, z = -25.5; z <= 25.5; z += 3.0, i++) {
      if (Math.abs(z) < 4.4) continue;
      box(MID, .019, z, .11, .026, .09, (i % 2 ? STUD : STUDA),
        { hard: true, gloss: .62, mode: 1, glow: .06 });
    }

    // ---------------------------------------------------------- 公交站台 + 安全岛
    // A 1.80 m flush boarding island connects the shelter to the refuge. Cycles keep a distinct
    // 2.25 m bypass behind it; the west 0.30 m carries slim shelter furniture and the remaining
    // 1.50 m stays clear. Keeping the deck flush preserves the walkable crossing contract.
    const ISXC = (ISX0 + ISX1) / 2, ISW = ISX1 - ISX0;
    flat(ISXC, YP, (BPZ0 + BPZ1) / 2, ISW, BPZ1 - BPZ0, CONCD,
      { mode: 9, gloss: .18, ...CONMAT });
    // Continuous tactile edge at the bus side, with a darker worn centre so the platform reads as
    // civic paving rather than one new rectangular block laid on the road.
    flat(ISX1 - .10, .0295, (BPZ0 + BPZ1) / 2, .16, BPZ1 - BPZ0 - .18, TACT,
      { mode: 9, gloss: .20 });
    flat(ISX0 + .48, .0245, (BPZ0 + BPZ1) / 2, .36, BPZ1 - BPZ0 - .34, CONC,
      { mode: 10, gloss: .12, ...CONMAT });
    // Low cycle-side kerb, interrupted only where passengers cross from the shelter.
    for (const [z0, z1] of [[BPZ0, BCZ0], [BCZ1, BPZ1]])
      box(ISX0 + .05, .026, (z0 + z1) / 2, .10, .05, z1 - z0, CONC,
        { hard: true, gloss: .18 });

    // The existing refuge is the north end of the same protected strip.
    box(ISXC, .066, (ISZ0 + ISD0) / 2, ISW, .13, ISD0 - ISZ0, CONC,
      { hard: true, mode: 9, gloss: .16, ...CONMAT });
    box(ISXC, .066, (ISD1 + ISZ1) / 2, ISW, .13, ISZ1 - ISD1, CONC,
      { hard: true, mode: 9, gloss: .16, ...CONMAT });
    // the deck the crossing runs over, flush, and the tactile block laid on it
    flat(ISXC, YP, (ISD0 + ISD1) / 2, ISW, ISD1 - ISD0, CONCD,
      { mode: 9, gloss: .18, ...CONMAT });
    flat(ISXC, .0295, (CZ0 + CZ1) / 2, ISW - .12, CZ1 - CZ0 - .30, TACT,
      { mode: 9, gloss: .20 });
    for (let z = CZ0 + .45; z < CZ1 - .25; z += .40)
      box(ISXC, .0385, z, ISW - .20, .012, .09, TACTD, { hard: true, gloss: .22 });
    // A low kerb line each side of the deck: high enough to read as an island, low enough that
    // walking over it is walking over it.
    for (const x of [ISX0 + .05, ISX1 - .05])
      box(x, .026, (ISD0 + ISD1) / 2, .10, .05, ISD1 - ISD0, CONC, { hard: true, gloss: .18 });
    // Hazard boards on the two noses, each facing the traffic that meets it.
    for (const [zz, out] of [[ISZ0 - .03, -.035], [ISZ1 + .03, .035]]) {
      box(ISXC, .40, zz, ISW - .16, .46, .05, C('#e0bb2c'),
        { hard: true, gloss: .26, mode: 1, tag: '人行横道' });
      for (let i = -1; i <= 1; i++)
        box(ISXC + i * .42, .40, zz + out, .16, .46, .012, SIGNK,
          { hard: true, gloss: .20, mode: 1, rz: .38 });
      cyl(ISXC, .70, zz, .045, .62, RAIL, { gloss: .40 });
    }

    // ---------------------------------------------------------- 机非隔离栏, the guard rail
    //
    // The fence between the carriageway and the bike lane that every Chinese arterial has, and what
    // makes the crossing read as the way through rather than as a place you happen to walk across.
    //
    // NO COLLIDER, and that is a measured decision rather than laziness. A solid rail plus the
    // moving vehicle colliders can seal a 90 cm refuge or platform even though the visible route is
    // open; `clampMove` spends another 30 cm on the player's body radius. Every railing the shell
    // builds itself (the pavement rail and bollards included) follows the same scenery-only rule.
    // The bus-side rail opens along the complete boarding face and resumes beyond the bus's nose.
    // The cycle side deliberately remains open: a second rail there made the 90 cm platform read
    // as a cage and left no generous place for a passenger to turn after crossing from the shelter.
    function railRun(x, z0, z1) {
      const n = Math.max(2, Math.round((z1 - z0) / 2.8));
      for (let i = 0; i <= n; i++) {
        const pz = z0 + (z1 - z0) * (i / n);
        cap(x, .53, pz, .055, 1.02, .055, RAILD, { gloss: .42 });
        cyl(x, 1.06, pz, .048, .05, RAIL, { gloss: .44 });
      }
      for (const y of [.96, .32])
        cap(x, y, (z0 + z1) / 2, .035, z1 - z0, .035, RAIL, { rx: Math.PI / 2, gloss: .42 });
    }
    for (const [z0, z1] of [[-6.10, ISZ0], [ISZ1, 13.40]]) railRun(RAILX, z0, z1);

    // ---------------------------------------------------------- 缘石坡道, the dropped kerbs
    // A ramp cut through the shell's continuous kerb at each end of the crossing, and the yellow
    // warning block a Chinese footway lays at the top of one.
    ramp(KW + .36, -.135);
    ramp(KE - .36, .135);
    tactile(KW - .60, -0.20, .52, CZ1 - CZ0 + .20);
    tactile(KE + .64, -0.20, .52, CZ1 - CZ0 + .20);

    // ---------------------------------------------------------- 站台过街, uncontrolled cycle crossing
    // The former second zebra crossed the complete 9.84 m road directly beneath the dwelling bus.
    // Its eastern half was unusable and visually promised a crossing that traffic never observed.
    // Passengers now cross only the west cycle track from the shelter to the protected platform;
    // the signalised zebra remains the sole route across motor traffic.
    const BCZC = (BCZ0 + BCZ1) / 2, BCD = BCZ1 - BCZ0;
    for (let x = KW + .40; x < ISX0 - .18; x += .67)
      flat(x, YP, BCZC, .34, BCD, PAINTW, { gloss: .10 });
    // One dropped kerb at the footway. The platform deck is already flush at the other end.
    box(KW + .36, .085, BCZC, 1.30, .055, BCD, CONC,
      { hard: true, rz: -.135, mode: 9, gloss: .18, ...CONMAT });
    for (const s of [-1, 1])
      box(KW + .36, .105, BCZC + s * (BCD / 2 + .11), 1.30, .16, .20, CONC,
        { hard: true, rz: -.074, mode: 9, gloss: .18 });
    tactile(KW - .60, BCZC, .52, BCD + .20);
    flat(ISX0 + .18, .0315, BCZC, .24, BCD - .18, TACT, { mode: 9, gloss: .20 });

    // Four thin boundary gates make this an actual two-stage crossing. A person in the west cycle
    // stage may clear to the footway or refuge after the signal changes; a person in the carriageway
    // stage may clear to the refuge or east footway. A body waiting on the refuge is in neither
    // stage, so it cannot use "already crossing" to step into live motor traffic.
    const gate = (stage, side, x0, x1) => {
      const solidGate = solid(x0, x1, CZ0 - .10, CZ1 + .10);
      crossingGates.push({ stage, side, solid: solidGate });
    };
    gate('cycle', 'west', KW + .08, KW + .18);
    gate('cycle', 'refuge', ISX0 - .18, ISX0 - .08);
    gate('carriageway', 'refuge', ISX1 + .08, ISX1 + .18);
    gate('carriageway', 'east', KE - .18, KE - .08);

    function ramp(cx, tilt) {
      box(cx, .085, (CZ0 + CZ1) / 2, 1.30, .055, CZ1 - CZ0, CONC,
        { hard: true, rz: tilt, mode: 9, gloss: .18, ...CONMAT });
      for (const s of [-1, 1])
        box(cx, .105, (CZ0 + CZ1) / 2 + s * ((CZ1 - CZ0) / 2 + .11), 1.30, .16, .20, CONC,
          { hard: true, rz: tilt * .55, mode: 9, gloss: .18 });
    }
    function tactile(cx, cz, w, d) {
      flat(cx, .0135, cz, w, d, TACT, { mode: 9, gloss: .20 });
      for (let z = cz - d / 2 + .24; z < cz + d / 2 - .14; z += .30)
        box(cx, .0245, z, w - .10, .014, .10, TACTD, { hard: true, gloss: .22 });
    }

    // ---------------------------------------------------------- loading, deliberately absent
    //
    // The former white rectangle at x 27.92..30.00 was painted directly over the live west cycle
    // track. Moving it into the 623 lane would only exchange that contradiction for one in which a
    // bus drove through every occupied loading space. There is no independently tapered service
    // pocket in this cross-section, so the truthful contract is `SIGNAL.loadingBay === null` and no
    // bay paint. Loading belongs in a later off-street/service-pocket ticket with its own route.

    // ---------------------------------------------------------- 人行灯, the pedestrian signals
    //
    // Three heads, each facing the pedestrian it is for. West→east is the crossing the player
    // makes, so both of its signals face -x: the one on the island governs the bike lane, the one
    // on the far kerb governs the carriageway. The third faces +x, for the other direction.
    //
    // The countdown is the object. Two digits 23 cm tall on a black field, red while you wait and
    // green while you walk, exactly as the LED units on every Beijing crossing do it. Sign TEXT is
    // never given a glow — the field behind it is what emits, or the bloom turns a junction into a
    // half-transparent copy of itself.
    pedPole(27.82, 2.72, 2.62, -Math.PI / 2, 2.28);      // refuge furnishing edge — stage one
    pedPole(37.92, 2.95, 2.90, -Math.PI / 2, 2.46);      // far kerb — stage two, the hero
    pedPole(27.82, 3.30, 2.90, Math.PI / 2, 2.40);       // median edge, for the way back

    function pedPole(x, z, h, yaw, hy) {
      cyl(x, .10, z, .17, .20, POLED, { gloss: .28, ...CONMAT });
      taper(x, h / 2, z, .092, h, .092, POLE, { gloss: .42 });
      cyl(x, h + .03, z, .052, .06, RAIL, { gloss: .44 });
      pedHead(x, hy, z, yaw);
    }

    // One head. `yaw` is the way it looks: -π/2 west, +π/2 east, π south. Every part is placed in
    // (out, up, side) and rotated once, so a head can face any way without being rewritten.
    function pedHead(x, y, z, yaw) {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const at = (out, up, side) => [x + s * out + c * side, y + up, z + c * out - s * side];
      const put = (out, up, side, sx, sy, sz, colr, o = {}) => {
        const p = at(out, up, side);
        return box(p[0], p[1], p[2], sx, sy, sz, colr, { hard: true, ry: yaw, ...o });
      };
      put(0, 0, 0, .36, .70, .22, CASE, { gloss: .34, tag: '人行横道' });
      put(.07, .40, 0, .40, .06, .30, CASE, { gloss: .30 });                    // the hood
      for (const [up, dark] of [[.155, DARKR], [-.165, DARKG]])
        put(.126, up, 0, .30, .28, .012, dark, { mode: 1, gloss: .12 });
      // 站立的人 — the red standing figure, on top
      const red = [
        put(.148, .247, 0, .052, .052, .012, DARKR, { mode: 1 }),
        put(.148, .175, 0, .086, .090, .012, DARKR, { mode: 1 }),
        put(.148, .100, -.026, .030, .072, .012, DARKR, { mode: 1 }),
        put(.148, .100, .026, .030, .072, .012, DARKR, { mode: 1 }),
      ];
      // 行走的人 — the green walking figure below it, legs and one arm swung
      const green = [
        put(.148, -.073, 0, .050, .050, .012, DARKG, { mode: 1 }),
        put(.148, -.142, .004, .080, .086, .012, DARKG, { mode: 1 }),
        put(.148, -.222, -.036, .028, .080, .012, DARKG, { mode: 1, rz: .40 }),
        put(.148, -.218, .042, .028, .080, .012, DARKG, { mode: 1, rz: -.34 }),
        put(.148, -.130, .052, .026, .062, .012, DARKG, { mode: 1, rz: .70 }),
      ];
      put(0, -.545, 0, .34, .40, .20, CASE, { gloss: .34, tag: '人行横道' });
      put(.112, -.545, 0, .29, .33, .012, C('#0b0c0d'), { mode: 1, gloss: .10 });
      const d = at(.124, -.545, 0);
      const digits = glyphs(d[0], d[1], d[2], yaw, '88',
        { size: .235, gap: .012, color: LITR, mode: 1, glow: .50, lift: .010 });
      heads.push({ red, green, digits });
    }

    // ---------------------------------------------------------- 人行横道 signs
    // The blue square with the pictogram, facing the traffic it warns, plus the plate underneath
    // that spells the word — not standard signing, but this is a game about reading and a sign
    // with nothing written on it teaches nobody anything.
    // Set back from the crossing on the approach side of each direction, which is where a warning
    // sign goes and also keeps them off the two signal poles.
    // The west plate shares the shell's signal mast. A second full-height pole only 76 cm away
    // made two black bars across PHARMACY_OUT; the short bracket keeps the warning in its proper
    // approach position without turning the branch threshold into a pole corral.
    crossSign(28.20, 3.06, -4.60, Math.PI, { mount: [27.82, -5.90] });
    crossSign(37.98, 3.10, 3.40, 0);            // east kerb, read by northbound traffic

    // The short shelter-to-platform crossing deliberately gets no motor-traffic warning plates:
    // it never enters a motor lane. Its tactile landing, interrupted rail and compact zebra make
    // the passenger route explicit without falsely advertising a second road crossing.

    function crossSign(x, y, z, yaw, support = null) {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const at = (out, up, side) => [x + s * out + c * side, y + up, z + c * out - s * side];
      const put = (out, up, side, sx, sy, sz, colr, o = {}) => {
        const p = at(out, up, side);
        return box(p[0], p[1], p[2], sx, sy, sz, colr, { hard: true, ry: yaw, ...o });
      };
      put(0, 0, 0, .66, .66, .035, SIGNB, { gloss: .30, tag: '人行横道' });
      put(.026, 0, 0, .58, .58, .030, SIGNW, { mode: 1, gloss: .18, tag: '人行横道' });
      for (let i = -2; i <= 2; i++)                                   // zebra under the feet
        put(.056, -.185, i * .098, .054, .16, .010, SIGNK, { mode: 1 });
      put(.056, .200, -.020, .072, .072, .010, SIGNK, { mode: 1 });   // the walking figure
      put(.056, .098, -.010, .105, .130, .010, SIGNK, { mode: 1 });
      put(.056, -.020, -.062, .046, .140, .010, SIGNK, { mode: 1, rz: .34 });
      put(.056, -.014, .052, .046, .140, .010, SIGNK, { mode: 1, rz: -.30 });
      put(.056, .100, .070, .040, .110, .010, SIGNK, { mode: 1, rz: .78 });
      put(0, -.475, 0, .84, .24, .030, SIGNW, { gloss: .22, tag: '人行横道' });
      const p = at(.020, -.475, 0);
      glyphs(p[0], p[1], p[2], yaw, '人行横道',
        { size: .150, gap: .028, color: SIGNK, gloss: .10, lift: .008, tag: '人行横道' });
      // Behind the plate, not through it. The near-side plate is bracketed to the existing signal
      // mast; the far-side plate retains its own post because no other support exists there.
      const bz = z - c * .07, bx = x - s * .07;
      if (support && support.mount) {
        const [mx, mz] = support.mount, dx = bx - mx, dz = bz - mz;
        cap((bx + mx) / 2, y - .21, (bz + mz) / 2, .032, Math.hypot(dx, dz), .032, POLE,
          { ry: -Math.atan2(dz, dx), rz: Math.PI / 2, gloss: .42 });
        cap(bx, y - .08, bz, .030, .28, .030, POLE, { gloss: .42 });
      } else {
        cyl(bx, (y + .26) / 2, bz, .055, y + .26, POLE, { gloss: .42 });
        cyl(bx, .07, bz, .13, .14, POLED, { gloss: .28 });
      }
    }

    // ---------------------------------------------------------- 限速 and the 电子警察
    // Beyond the junction rather than in the bank/pharmacy establishing pocket. At -7.90 the pole
    // and two plates sat directly in BANK_OUT's foreground beside the legacy advert and bin; the
    // first north-side move also stranded its label beyond the authored walk zone. This repeat is
    // on accessible south pavement and remains legible to +z traffic leaving the signals.
    speedSign(27.82, 7.85, Math.PI);
    gantry(38.30, 6.40);

    function speedSign(x, z, yaw) {
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      cyl(x - fx * .04, 1.28, z - fz * .04, .062, 2.56, POLE, { gloss: .42 });
      cyl(x - fx * .04, .07, z - fz * .04, .14, .14, POLED, { gloss: .28 });
      // white disc in a red ring with black numerals, facing the approaching traffic
      cyl(x + fx * .04, 2.34, z + fz * .04, .335, .045, SIGNR,
        { rx: Math.PI / 2, ry: yaw, gloss: .26, tag: '限速' });
      cyl(x + fx * .062, 2.34, z + fz * .062, .262, .036, SIGNW,
        { rx: Math.PI / 2, ry: yaw, mode: 1, gloss: .16, tag: '限速' });
      glyphs(x + fx * .094, 2.34, z + fz * .094, yaw, '30',
        { size: .30, gap: .015, color: SIGNK, gloss: .10, lift: .008, tag: '限速' });
      box(x + fx * .04, 1.83, z + fz * .04, .60, .26, .035, SIGNW,
        { hard: true, ry: yaw, gloss: .22, tag: '限速' });
      glyphs(x + fx * .060, 1.83, z + fz * .060, yaw, '限速',
        { size: .170, gap: .030, color: SIGNK, gloss: .10, lift: .008, tag: '限速' });
    }

    // The cantilever mast over the carriageway: the northbound 红绿灯 with its own countdown, a
    // repeater at the kerb for a driver already under the arm, and the 电子警察 speed camera on
    // the same arm, which is where a Chinese one lives.
    function gantry(x, z) {
      cyl(x, .22, z, .30, .44, POLED, { gloss: .26, ...CONMAT, tag: '红绿灯' });
      taper(x, 3.20, z, .27, 6.00, .27, POLE, { gloss: .38, tag: '红绿灯' });
      cap(x - 2.30, 5.94, z, .085, 4.90, .085, POLE,
        { rz: Math.PI / 2, gloss: .38, tag: '红绿灯' });
      cap(x - .70, 5.35, z, .05, 1.66, .05, POLE, { rz: 1.00, gloss: .36, tag: '红绿灯' });
      vehHead(SIGNAL.lanes.north, 5.32, z, 0, true);     // over the east, -z lane
      vehHead(x - .30, 3.05, z - .05, 0, false);         // the kerbside repeater
      // 电子警察 — the enforcement camera, its sunshade and the infra-red bank beside it
      const cx = 35.35;
      box(cx, 5.62, z, .46, .30, .30, C('#dfdcd2'), { hard: true, gloss: .34, tag: '红绿灯' });
      box(cx - .04, 5.80, z, .52, .05, .34, C('#cfccc2'), { hard: true, gloss: .30 });
      cyl(cx - .25, 5.60, z, .075, .17, C('#15181b'), { rz: Math.PI / 2, gloss: .58 });
      cyl(cx - .35, 5.60, z, .058, .02, C('#2b3b46'),
        { rz: Math.PI / 2, gloss: .82, mode: 1, glow: .04 });
      box(cx + .48, 5.66, z, .30, .26, .34, C('#2a2e33'), { hard: true, gloss: .30 });
      for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++)
        cyl(cx + .34, 5.74 - i * .08, z - .08 + k * .08, .022, .012, C('#5b2320'),
          { rz: Math.PI / 2, mode: 1, glow: .05, gloss: .50 });
      // A second 红绿灯 label on this side of the road. `pick` sends the player to whichever
      // thing wearing the tag is nearest where the ray landed, so two are better than one here:
      // the shell's own focus is on the far pavement, twelve metres away.
      thing('红绿灯', SIGNAL.lanes.north, 6.05, z, '绿灯亮了，可以走了。',
        'The green light is on, you can go.',
        '红绿灯 hóng-lǜ-dēng, red-green-light. The number under it counts the seconds down.',
        // Clear of the kerb furnishing band and the crossing approach.
        { focus: [36.30, z + .20], reach: 3.0, tag: '红绿灯' });
    }

    // A three-aspect vehicle head, laid out like the shell's own so the two read as one system.
    function vehHead(x, y, z, yaw, count) {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const at = (out, up, side) => [x + s * out + c * side, y + up, z + c * out - s * side];
      const put = (out, up, side, sx, sy, sz, colr, o = {}) => {
        const p = at(out, up, side);
        return box(p[0], p[1], p[2], sx, sy, sz, colr, { hard: true, ry: yaw, ...o });
      };
      put(0, 0, 0, .40, 1.16, .36, CASE, { gloss: .34, tag: '红绿灯' });
      const veh = [];
      for (const [up, dark] of [[.40, DARKR], [0, DARKA], [-.40, DARKG]]) {
        put(.10, up + .21, 0, .40, .05, .30, CASE, { gloss: .30 });         // the visor
        const p = at(.19, up, 0);
        veh.push(cyl(p[0], p[1], p[2], .125, .055, dark,
          { rx: Math.PI / 2, ry: yaw, mode: 1, glow: .05, tag: '红绿灯' }));
      }
      let digits = null;
      if (count) {
        put(0, -.86, 0, .34, .40, .30, CASE, { gloss: .34, tag: '红绿灯' });
        put(.155, -.86, 0, .29, .33, .012, C('#0b0c0d'), { mode: 1, gloss: .10 });
        const p = at(.168, -.86, 0);
        digits = glyphs(p[0], p[1], p[2], yaw, '88',
          { size: .245, gap: .014, color: LITG, mode: 1, glow: .50, lift: .010, tag: '红绿灯' });
      }
      heads.push({ veh, digits });
    }

    // ---------------------------------------------------------- 公交站, what the shelter lacked
    //
    // The shell builds the shelter, roof, glass, bench and route board. Use its real kerb-side
    // datum (RD0-1.35): the previous RD0-2.60 annotations floated 1.25 m away from their panel.
    // The only added furniture now sits inside the shelter's existing footprint, never in the
    // bank/pharmacy turning pocket.
    const bsz = -12.0, BX = 27.82;
    glyphs(BX, 2.66, bsz - 2.86, -Math.PI / 2, '623路',
      { size: .135, gap: .022, color: C('#1f2a33'), gloss: .10, lift: .006, tag: '公交车站' });
    glyphs(BX, 2.66, bsz - 2.24, -Math.PI / 2, '杨柳胡同东口',
      { size: .098, gap: .018, color: C('#1f2a33'), gloss: .10, lift: .006, tag: '公交车站' });
    ['三里屯', '工体北门', '团结湖', '呼家楼'].forEach((nm, i) => {
      glyphs(BX, 2.455 - i * .19, bsz - 2.44, -Math.PI / 2, nm,   // between the shell's own bars
        { size: .080, gap: .016, color: C('#3a4149'), gloss: .10, lift: .006, tag: '公交车站' });
    });
    box(BX + .01, 1.44, bsz - 2.60, .02, .05, .80, C('#b04430'),
      { hard: true, gloss: .20, tag: '公交车站' });

    // 垃圾桶 — the 56 cm pair cannot honestly fit the shelter's 30 cm furnishing strip. It stands
    // on the protected median immediately beyond the platform nose, wholly outside the footway,
    // cycle track, passenger clear strip and motor sweep.
    binPair(28.10, -15.55);
    function binPair(x, z) {
      for (const [oz, colr, lbl] of
           [[-.27, C('#2f6f9c'), '可回收物'], [.27, C('#5a6168'), '其他垃圾']]) {
        const bz = z + oz;
        taper(x, .34, bz, .40, .62, .40, colr, { gloss: .32, tag: '垃圾桶' });
        ball(x, .66, bz, .22, .075, .22, C('#38423f'),
          { mode: 7, gloss: .32, tag: '垃圾桶' });
        box(x - .205, .51, bz, .025, .12, .22, colr,
          { hard: true, gloss: .34, tag: '垃圾桶' });
        box(x - .222, .58, bz, .018, .070, .15, C('#15181b'), { hard: true, gloss: .20 });
        glyphs(x - .235, .28, bz, -Math.PI / 2, lbl,
          { size: .050, gap: .009, color: C('#e9e5da'), gloss: .10, lift: .006, tag: '垃圾桶' });
        cyl(x, .035, bz, .22, .07, C('#3a3f44'), { gloss: .24 });
      }
      solid(x - .28, x + .28, z - .60, z + .60);
    }

    // The live Street cast already supplies 乘客 here from 06:00–22:00, with a complete rig,
    // schedule, shadow and avoidance state.  The former capsule mannequin duplicated her at the
    // stop and could never blink, move, hold a bag correctly or leave after service ended.

    // ---------------------------------------------------------- 下水道, two more covers
    // The shell's covers are all round and all on the motor lanes. A square gully in the new east
    // bike lane and a services cover beside it are what the rest of a road surface is made of.
    box(36.94, .012, -6.40, .46, .024, .78, C('#33373a'), { hard: true, gloss: .34 });
    for (let k = 0; k < 5; k++)
      box(36.94, .026, -6.72 + k * .16, .36, .010, .055, C('#1c1f22'), { hard: true });
    cyl(36.10, .011, 4.80, .34, .016, C('#4a4640'), { hard: true, mode: 10, gloss: .30 });
    cyl(36.10, .019, 4.80, .27, .014, C('#413d38'), { hard: true, gloss: .26 });

    // ---------------------------------------------------------- the words
    thing('人行横道', 28.57, 2.35, 2.30, '过马路要走人行横道。',
      'To cross the road, use the pedestrian crossing.',
      '人行横道 rénxíng-héngdào, the marked crossing. Everyone calls it 斑马线, the zebra line.',
      { focus: [26.10, 1.60], reach: 2.6, tag: '人行横道' });
    thing('限速', 27.82, 2.34, 7.85, '这条路限速三十。',
      'The speed limit on this road is thirty.',
      '限 to limit + 速 speed. The red ring means it is an order, not a suggestion.',
      // Read from the open shop-side strip beyond the crossing, never from the cycle track.
      { focus: [25.12, 7.85], reach: 2.6, tag: '限速' });
    thing('垃圾桶', 28.10, .80, -15.55, '垃圾桶就在公交站旁边。',
      'The bin is right beside the bus stop.',
      '垃圾 rubbish + 桶 a bucket. The blue half takes 可回收物, the recyclables.',
      { focus: [28.65, -14.20], reach: 2.4, tag: '垃圾桶' });

    // ---------------------------------------------------------- adopt the shell's own signal
    //
    // street.js:2566 builds a mast with three aspects and a countdown reading a hardcoded 28,
    // under a comment saying the street is the one place that never gets a per-frame tick. It does
    // now. Rather than stand a second mast next to it, this finds the props it already made and
    // drives them, so both heads on this junction always agree.
    //
    // `glow0` is written as well as `glow`: setNight (street.js:3711) captures glow0 once and
    // recomputes glow from it every frame, so anything that writes glow alone is overwritten by
    // the next lighting update.
    let vr = null, va = null, vg = null;
    const vd = [];
    for (const p of P0) {
      if (p.tag !== '红绿灯') continue;
      if (p.mesh === 'cyl' && p.ob && Math.abs(p.ob.z) < .25) {
        if (Math.abs(p.ob.y - 5.77) < .06) vr = p;
        else if (Math.abs(p.ob.y - 5.35) < .06) va = p;
        else if (Math.abs(p.ob.y - 4.93) < .06) vg = p;
      } else if (p.ch && p.m) vd.push(p);
    }
    vd.sort((a, b) => a.m[12] - b.m[12]);
    if (vr || va || vg) heads.push({ veh: [vr, va, vg], digits: vd.length === 2 ? vd : null });

    // Enough light at the crossing for the signals to read after dark, from three sources rather
    // than from a hundred small emissive quads, which is what smears a junction into a haze.
    S.light(28.57, 2.60, 2.72, [1.00, .74, .60], .30, 5.0);
    S.light(37.90, 2.80, 2.95, [1.00, .80, .64], .34, 5.6);
    S.light(SIGNAL.lanes.north, 5.10, 6.40, [.86, 1.00, .90], .26, 6.0);

    // What this district cost, for the perf canary. Read it as StreetFit.road.propCount.
    StreetFit['road'].propCount = S.props.length - P0.length;
  }

  // ================================================================ the tick
  //
  // Colour, not geometry: an aspect switches by writing its colour and its glow, so nothing here
  // rebuilds a matrix and the whole junction costs about forty float writes a frame.
  function tick(t, body) {
    if (!built) return;                       // the builder has not run; there is nothing to drive
    const u = wrap(t);
    const priority = EMERGENCY.active(t);
    const ph = priority ? 2 : u < G_END ? 0 : u < A_END ? 1 : 2; // green / amber / red
    const pw = priority ? 0 : u < W0 ? 0 : u < W1 ? 1 : u < F1 ? 2 : 0;
    // A flashing green flashes. It is most of what makes a Chinese crossing read as one rather
    // than as a green that happens to be about to end.
    const walking = pw === 1 || (pw === 2 && (t * 2) % 1 < .55);

    const vSecs = priority ? Math.max(1, Math.ceil(EMERGENCY.remaining(t)))
      : Math.max(1, Math.ceil(ph === 0 ? G_END - u : ph === 1 ? A_END - u : CYCLE - u));
    const pSecs = priority ? vSecs : (u >= W0 && u < F1) ? Math.max(1, Math.ceil(F1 - u))
      : Math.max(1, Math.ceil(u < W0 ? W0 - u : CYCLE - u + W0));
    const now = SIGNAL.now;
    now.t = t;
    now.phase = ph === 0 ? 'green' : ph === 1 ? 'amber' : 'red';
    now.secs = vSecs;
    now.ped = pw === 0 ? 'stop' : pw === 1 ? 'walk' : 'flash';
    now.pedSecs = pSecs;
    now.mayCross = !priority && pw === 1;
    now.emergency = priority;
    now.emergencySource = priority ? emergencyState.source : null;
    emergencyState.active = priority;

    // Flashing green is time to finish, not time to start. Clearance applies only to the stage a
    // body physically occupies; the refuge itself is never treated as a committed carriageway.
    const onZebra = !!body && Number.isFinite(body.x) && Number.isFinite(body.z) &&
      body.z > CZ0 - .45 && body.z < CZ1 + .45;
    const clearingCycle = onZebra && body.x > KW + .18 && body.x < ISX0 - .18;
    const clearingCarriageway = onZebra && body.x > ISX1 + .18 && body.x < KE - .18;
    const stageOpen = {
      cycle: now.mayCross || clearingCycle,
      carriageway: now.mayCross || clearingCarriageway,
    };
    for (const gate of crossingGates) gate.solid.open = stageOpen[gate.stage];
    SIGNAL.crossing.stages.cycle.blocked = !stageOpen.cycle;
    SIGNAL.crossing.stages.carriageway.blocked = !stageOpen.carriageway;
    SIGNAL.crossing.blocked = !stageOpen.cycle || !stageOpen.carriageway;

    for (const h of heads) {
      if (h.red) {
        setParts(h.red, !walking, RED_ON, RED_OFF);
        setParts(h.green, walking, GRN_ON, GRN_OFF);
        // The figure flashes; the number does not. It stays the colour of the phase, which is what
        // the LED units do — a countdown blinking red and green would read as a fault.
        setDigits(h.digits, pSecs, pw === 0 ? RED_ON : GRN_ON);
      } else if (h.veh) {
        setLamp(h.veh[0], ph === 2, RED_ON, RED_OFF);
        setLamp(h.veh[1], ph === 1, AMB_ON, AMB_OFF);
        setLamp(h.veh[2], ph === 0, GRN_ON, GRN_OFF);
        setDigits(h.digits, vSecs, ph === 2 ? RED_ON : ph === 1 ? AMB_ON : GRN_ON);
      }
    }
  }
  function setLamp(p, on, onC, offC) {
    if (!p) return;
    p.color = on ? onC : offC;
    p.glow0 = on ? .55 : .03; p.glow = p.glow0;
  }
  function setParts(list, on, onC, offC) {
    if (!list) return;
    for (const p of list) {
      p.color = on ? onC : offC;
      p.glow0 = on ? .48 : .02; p.glow = p.glow0;
    }
  }
  function setDigits(d, n, colr) {
    if (!d || d.length !== 2) return;
    const v = Math.max(0, Math.min(99, n | 0));
    d[0].ch = String((v / 10) | 0); d[1].ch = String(v % 10);
    d[0].color = colr; d[1].color = colr;
    d[0].glow0 = .55; d[0].glow = .55;
    d[1].glow0 = .55; d[1].glow = .55;
  }

  // ================================================================ registration
  StreetFit['road'] = S => { build(S); };
  StreetFit['road'].tick = tick;
  StreetFit['road'].signal = SIGNAL;
})();
