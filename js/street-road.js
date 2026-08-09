// 马路 — the road district. What is painted on the carriageway and what stands beside it.
//
// The shell (js/street.js) already lays the asphalt, the kerbs, the pavements both sides, the
// bike-lane paint, a zebra, the manholes, gully grates, made-good patches, the bollards, the
// pavement railing, the lamps, the trees, the bus shelter, the parked bus and one signal mast.
// None of that is rebuilt here. What was missing is everything that says *how the road works*:
// which lane is which, where you may cross, when you may cross, and how long you have.
//
// ---------------------------------------------------------------------------------------------
// THE "SIX-LANE" VERDICT  (STREET.md problem 3, street.js:2299)
//
// The comment is wrong; the road is right. Measured off the shell:
//
//     27.28 – 27.58   west kerb                      37.42 – 37.72   east kerb
//     27.58 – 27.80   gutter, gully grates            9.84 m clear between the kerb faces
//     27.80 – 30.20   西侧非机动车道   2.40 m         painted by the shell (street.js:1098)
//     30.20 – 32.50   南行机动车道     2.30 m         the double yellow at 32.50 is the shell's
//     32.50 – 35.10   北行机动车道     2.60 m         the dashed line at 35.10 is the shell's
//     35.10 – 37.42   东侧非机动车道   2.32 m         surfaced here, to match the west side
//
// That is 双向两车道 plus a 非机动车道 each side: a 朝阳区 支路, the kind of road a 胡同 actually
// comes out onto. Six lanes needs about 24 m of carriageway; at RD0 = 27.5 that puts the far kerb
// at 51.5 — eleven metres past SW1 = 41.0 and ten past the far building line FX = 41.6. Widening
// would mean rebuilding the whole eastern half of the district, and it would turn the hutong into
// the highway the Urbanist role exists to prevent. Three motor lanes is no better: 7.22 m of motor
// carriageway is 2.4 m a lane, and 2.4 m is not a lane.
//
// The strongest evidence is the shell's own five parked cars. Against the lane centres derived
// above (29.00 / 31.35 / 33.80 / 36.26) they sit at 33.8, 36.2, 33.9, 31.3, 28.9 — three of them
// on a lane centre to within 5 cm, and the other two parked in the bike lanes, which in 北京 is
// exactly where cars are parked. The road was always a two-lane road. Only the comment said six.
//
// So nothing is widened. The lanes are marked honestly for two, and the ticket to the Mech is a
// comment change plus the two wrong numbers in the S contract (see SIGNAL.lanes below).
//
// ---------------------------------------------------------------------------------------------
// THE CROSSING
//
// Two-stage, the Chinese way — but staged where a 10 m road has room for it. A refuge astride the
// centre line is impossible here: with cars 2.04 m wide in a 2.30 m lane there is 41 cm of air at
// the centre line, and an island needs a metre. On a 支路 with a 非机动车道 the 二次过街 island
// goes on the 机非隔离带 instead — you cross the bike lane, wait on the island behind the 隔离栏,
// and cross the carriageway on the pedestrian green. That is what is built here, and it costs no
// motor lane a single centimetre.
//
// The island is 0.90 m wide and raised only at its two ends; the crossing runs through it at road
// level, because this engine walks a body at y = 0 and a 15 cm kerb across a pedestrian route is a
// body wading through concrete. Nothing on the island carries a collider — a solid on a 90 cm
// island is a sealed island.
//
// ---------------------------------------------------------------------------------------------
// THE LIGHTS, AND THE INTERFACE THE TRAFFIC AGENT READS
//
//     StreetFit.road.signal.phase(t)   -> 'green' | 'amber' | 'red'   for motor traffic
//     StreetFit.road.signal.go(t)      -> boolean, may a car cross the stop line
//     StreetFit.road.signal.secs(t)    -> seconds left in the aspect now showing
//     StreetFit.road.signal.stopLine   -> { north: -4.00, south: 3.60 }   z of each stop bar
//     StreetFit.road.signal.lanes      -> the four lane centres above
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
  const RD0 = 27.5, RD1 = 37.5, MID = (RD0 + RD1) / 2;   // 32.50, the shell's double yellow
  const KW = 27.58, KE = 37.42;                          // kerb faces, road side
  const BW0 = 27.80, BW1 = 30.20;                        // 西侧非机动车道
  const MS0 = 30.20, MS1 = 32.50;                        // 南行机动车道
  const MN0 = 32.50, MN1 = 35.10;                        // 北行机动车道
  const BE0 = 35.10, BE1 = 37.42;                        // 东侧非机动车道
  const CZ0 = -2.50, CZ1 = 2.10;                         // the shell's zebra, in z
  const ISX0 = 29.30, ISX1 = 30.20;                      // 安全岛, the refuge
  const ISZ0 = -3.60, ISZ1 = 3.00;
  const ISD0 = -2.72, ISD1 = 2.16;                       // the flush deck the crossing runs over
  const RAILX = 30.14;                                   // 机非隔离栏 — clear of a car in MS by 13 cm
  const SLN = -4.00, SLS = 3.60;                         // 停止线, north- and south-side bars

  // The decal stack, in millimetres above the ground plane. The shell's own road markings are at
  // 8–9 mm, its bike-lane surface at 6 and its asphalt at 4, so nothing new is ever laid on a plane
  // something else already occupies and every new layer clears the one under it by at least ten:
  //
  //     6.0   east bike-lane surface   (the shell's west one is at exactly this, on other x)
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

  const SIGNAL = {
    cycle: CYCLE,
    // What the motor traffic on this road is being shown.
    phase(t) { const u = wrap(t); return u < G_END ? 'green' : u < A_END ? 'amber' : 'red'; },
    // May a car cross the stop line. Amber is deliberately false: whether a car already past the
    // bar keeps going is the traffic agent's decision, not the light's.
    go(t) { return wrap(t) < G_END; },
    // Seconds left in the aspect now showing, 1..n, the way a Chinese vehicle countdown reads.
    secs(t) {
      const u = wrap(t);
      return Math.max(1, Math.ceil(u < G_END ? G_END - u : u < A_END ? A_END - u : CYCLE - u));
    },
    // What the pedestrian is being shown.
    ped(t) {
      const u = wrap(t);
      return u < W0 ? 'stop' : u < W1 ? 'walk' : u < F1 ? 'flash' : 'stop';
    },
    pedSecs(t) {
      const u = wrap(t);
      if (u >= W0 && u < F1) return Math.max(1, Math.ceil(F1 - u));
      return Math.max(1, Math.ceil(u < W0 ? W0 - u : CYCLE - u + W0));
    },
    // Where a car has to stop. The west lane runs +z and meets the north-side bar; the east lane
    // runs -z and meets the south-side bar. The names are geographic sides, not travel directions.
    stopLine: { north: SLN, south: SLS },
    crossing: { z0: CZ0, z1: CZ1, blocked: true },
    // The lane centres this district has marked the road for.
    //
    // TICKET, Mech: `S.road.south` is 29.90, which is inside the shell's own painted bike lane,
    // and `S.road.north` is 35.10, which is a lane *line*, not a lane centre. A car driven down
    // either of them is a car in a bike lane. They should become the four numbers below.
    lanes: { bikeW: 29.00, south: 31.35, north: 33.80, bikeE: 36.26 },
    laneEdges: { bikeW: [BW0, BW1], south: [MS0, MS1], north: [MN0, MN1], bikeE: [BE0, BE1] },
    // The refuge sits in the east 0.90 m of the west bike lane, so a bicycle passing z -3.60..3.00
    // has 27.80–29.30 to ride in and has to deflect. That is what the island is for and what the
    // cycles district should steer around; no motor lane is touched.
    island: { x0: ISX0, x1: ISX1, z0: ISZ0, z1: ISZ1, bikeSqueeze: [BW0, ISX0] },
    kerbs: { west: KW, east: KE },
    now: { t: 0, phase: 'green', secs: 30, ped: 'stop', pedSecs: 35, mayCross: false },
  };

  // ---------------------------------------------------------------- what the tick drives
  const heads = [];          // every signal head, this file's and the shell's
  const crossingGates = [];  // invisible kerb-line gates, opened only for the walk phase
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
    const { box, cyl, flat, taper, glyphs, solid, thing, cap, C } = S;

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

    // The east 非机动车道, surfaced to match the west one the shell already lays. Without it the
    // dashed line at 35.10 has nothing on either side of it and reads as a motorway lane divider.
    flat((BE0 + BE1) / 2, .006, 0, BE1 - BE0, 188, BIKE, { mode: 10, gloss: .18, ...ROADMAT });

    // 机非分界线 west — the solid line between the bike lane and the carriageway.
    // Broken at BOTH crossings now — road markings stop where a crossing starts, and there are
    // two of them on this road.
    for (const [z0, z1] of [[-90, -11.00], [-8.40, ISZ0], [ISZ1, 90]])
      flat(BW1, YP, (z0 + z1) / 2, .15, z1 - z0, PAINT, { gloss: .10 });
    // 机非分界线 east — the shell's dashes at 35.10, re-lined solid. A road that has been marked
    // over its old lines is what every road in this city is, and the ghost of the dashes under
    // 22 cm of new paint is why it is drawn that wide. Broken at the crossing and at the three
    // manhole covers on x 35.30, which the line would otherwise slice through.
    for (const [z0, z1] of [[-90, -28.6], [-27.6, -11.00], [-8.40, ISZ0], [ISZ1, 33.4], [34.4, 90]])
      flat(BE0, .0220, (z0 + z1) / 2, .22, z1 - z0, PAINT, { gloss: .10 });
    // 边缘线 — the outer edge of the east bike lane, against the kerb.
    for (const [z0, z1] of [[-90, -11.00], [-8.40, ISZ0], [ISZ1, 90]])
      flat(KE - .22, YP, (z0 + z1) / 2, .12, z1 - z0, PAINT, { gloss: .09 });

    // 停止线. Both run from the centre line out to the kerb, over the bike lane too — bikes hold
    // at the same bar.
    flat((MN0 + KE) / 2 + .05, YP, SLS, KE - MN0 - .1, .42, PAINTW, { gloss: .10 });
    // The west-lane bar is in two pieces because the guard rail stands between them, which is
    // what a stop line does when a 隔离栏 crosses it.
    flat((BW0 + 30.04) / 2, YP, SLN, 30.04 - BW0, .42, PAINTW, { gloss: .10 });
    flat((30.24 + MS1) / 2, YP, SLN, MS1 - 30.24 - .05, .42, PAINTW, { gloss: .10 });

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
      flat((MN0 + KE) / 2, .0155, zz, KE - MN0, .07, SEAM, { gloss: .08 });

    // 道钉 — cats-eyes down the centre line, between the two yellows. One mesh, one mode, one
    // size: the whole run batches into a single draw call.
    for (let i = 0, z = -25.5; z <= 25.5; z += 3.0, i++) {
      if (Math.abs(z) < 4.4) continue;
      box(MID, .019, z, .11, .026, .09, (i % 2 ? STUD : STUDA),
        { hard: true, gloss: .62, mode: 1, glow: .06 });
    }

    // ---------------------------------------------------------- 安全岛, the refuge
    box(29.75, .066, (ISZ0 + ISD0) / 2, .90, .13, ISD0 - ISZ0, CONC,
      { hard: true, mode: 9, gloss: .16, ...CONMAT });
    box(29.75, .066, (ISD1 + ISZ1) / 2, .90, .13, ISZ1 - ISD1, CONC,
      { hard: true, mode: 9, gloss: .16, ...CONMAT });
    // the deck the crossing runs over, flush, and the tactile block laid on it
    flat(29.75, YP, (ISD0 + ISD1) / 2, .90, ISD1 - ISD0, CONCD,
      { mode: 9, gloss: .18, ...CONMAT });
    flat(29.75, .0295, (CZ0 + CZ1) / 2, .78, CZ1 - CZ0 - .30, TACT, { mode: 9, gloss: .20 });
    for (let z = CZ0 + .45; z < CZ1 - .25; z += .40)
      box(29.75, .0385, z, .70, .012, .09, TACTD, { hard: true, gloss: .22 });
    // A low kerb line each side of the deck: high enough to read as an island, low enough that
    // walking over it is walking over it.
    for (const x of [ISX0 + .05, ISX1 - .05])
      box(x, .026, (ISD0 + ISD1) / 2, .10, .05, ISD1 - ISD0, CONC, { hard: true, gloss: .18 });
    // Hazard boards on the two noses, each facing the traffic that meets it.
    for (const [zz, out] of [[ISZ0 - .03, -.035], [ISZ1 + .03, .035]]) {
      box(29.75, .40, zz, .74, .46, .05, C('#e0bb2c'),
        { hard: true, gloss: .26, mode: 1, tag: '人行横道' });
      for (let i = -1; i <= 1; i++)
        box(29.75 + i * .24, .40, zz + out, .12, .46, .012, SIGNK,
          { hard: true, gloss: .20, mode: 1, rz: .38 });
      cyl(29.75, .70, zz, .045, .62, RAIL, { gloss: .40 });
    }

    // ---------------------------------------------------------- 机非隔离栏, the guard rail
    //
    // The fence between the carriageway and the bike lane that every Chinese arterial has, and what
    // makes the crossing read as the way through rather than as a place you happen to walk across.
    //
    // NO COLLIDER, and that is a measured decision rather than laziness. It first shipped with one
    // — two solids, a 6.00 m clear gap at the island, verified walkable end to end. Then the other
    // districts landed and a bus from js/street-traffic.js came to rest with a static solid at
    // x 30.03–32.58, z -6.98–4.22, which is 11 m of vehicle standing on the zebra. With the rail
    // solid as well, the two together sealed the whole east half of the road: `clampMove` at
    // r = 0.30 stopped a body walking east at x 29.73 and one walking west at 32.88, and the island
    // lost two thirds of its standable width. The bus is the anomaly and it is ticketed, but a
    // barrier that turns somebody else's misparked vehicle into a sealed district is not a barrier
    // worth having — and every railing js/street.js builds itself (the pavement rail at RD0-.55,
    // the bollards) is scenery with no collider, so this is the shell's own convention.
    // The west-kerb 公交站 is a real bay, so its rail has the matching opening. The former run to
    // z=-13.40 passed through the bus body for its entire dwell and made both read as toy scenery.
    for (const [z0, z1] of [[-6.10, ISZ0], [ISZ1, 13.40]]) {
      const n = Math.max(2, Math.round((z1 - z0) / 1.9));
      for (let i = 0; i <= n; i++) {
        const pz = z0 + (z1 - z0) * (i / n);
        cap(RAILX, .53, pz, .055, 1.02, .055, RAILD, { gloss: .42 });
        cyl(RAILX, 1.06, pz, .048, .05, RAIL, { gloss: .44 });
      }
      for (const y of [.99, .30])
        cap(RAILX, y, (z0 + z1) / 2, .035, z1 - z0, .035, RAIL, { rx: Math.PI / 2, gloss: .42 });
      for (let z = z0 + .36; z < z1 - .1; z += .36)
        cap(RAILX, .655, z, .022, .66, .022, RAIL, { gloss: .40 });
    }

    // ---------------------------------------------------------- 缘石坡道, the dropped kerbs
    // A ramp cut through the shell's continuous kerb at each end of the crossing, and the yellow
    // warning block a Chinese footway lays at the top of one.
    ramp(27.94, -.135);
    ramp(37.06, .135);
    tactile(26.98, -0.20, .52, CZ1 - CZ0 + .20);
    tactile(38.06, -0.20, .52, CZ1 - CZ0 + .20);

    // ---------------------------------------------------------- 人行横道 二, uncontrolled
    //
    // This road had ONE gap in 9.84 m of barrier, at z -2.50 .. 2.10, and everything the west
    // footway is now for is south of it: 北京银行 at z -11.40 .. -7.10, 药店 at -6.90 .. -3.60,
    // the 公交车站 at -12.0. Coming off the bus and crossing to the office meant walking ten
    // metres north to a gap and ten back. This is the second gap, on the bank's own centre line
    // at z -9.25.
    //
    // No signal, and that is the design, not a shortcut. An uncontrolled 人行横道 between two
    // junctions is the commonest crossing in this city; js/street-traffic.js is not told about
    // it, exactly as a driver is not told about it, and the shell's one signalised crossing keeps
    // being the one that stops the traffic. Paint, two dropped kerbs and two tactile blocks —
    // it adds no collider and no phase, so it cannot trap a body or a car.
    const XZ0 = -11.00, XZ1 = -8.40, XZC = (XZ0 + XZ1) / 2, XD = XZ1 - XZ0;
    // 45 cm bars on a 1.05 m pitch, which is what the shell's own zebra is laid on. Started clear
    // of the kerb faces so no bar half-disappears under a kerb.
    for (let x = KW + .58; x < KE - .45; x += 1.05)
      flat(x, YP, XZC, .45, XD, PAINTW, { gloss: .10 });
    // 缘石坡道 both sides, the same 1.30 m ramp and the same tilt the first crossing uses.
    for (const [cx, tilt] of [[27.94, -.135], [37.06, .135]]) {
      box(cx, .085, XZC, 1.30, .055, XD, CONC,
        { hard: true, rz: tilt, mode: 9, gloss: .18, ...CONMAT });
      for (const s of [-1, 1])
        box(cx, .105, XZC + s * (XD / 2 + .11), 1.30, .16, .20, CONC,
          { hard: true, rz: tilt * .55, mode: 9, gloss: .18 });
    }
    tactile(26.98, XZC, .52, XD + .20);
    tactile(38.06, XZC, .52, XD + .20);

    // The lamps used to be advice only: the player could walk straight into live traffic on red.
    // A thin collider at each kerb makes the crossing enforce the same phase it displays. The tick
    // keeps both open for anybody already on the zebra so a light change never traps them mid-road.
    crossingGates.push(solid(KW + .08, KW + .18, CZ0 - .10, CZ1 + .10));
    crossingGates.push(solid(KE - .18, KE - .08, CZ0 - .10, CZ1 + .10));

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

    // ---------------------------------------------------------- 装卸货泊位, the loading bay
    //
    // B9 of STOREFRONT-UPGRADES.md asks for it "on the west kerb by 银行". The west kerb beside the
    // branch cannot take it, and the numbers say so rather than taste:
    //
    //   -17.60 .. -6.40   the 公交 bay. js/street-traffic.js:681 stops the bus on STOP_U = -12.0,
    //                     and :590 hangs the hull on the centre — an 11.2 m bus (:394) therefore
    //                     rests across the whole of the branch's kerb, z -11.40 .. -7.10.
    //   -11.00 ..  -8.40  人行横道 二, above. No markings cross a crossing.
    //    -4.00            SLN, the northbound stop bar. Nothing is bayed up to a stop line.
    //
    // Which leaves 2.30 m between the bus's nose and the stop bar and 2.10 m between the crossing
    // and the bus's flank: there is no 6 m of free west kerb anywhere south of the bay. So the bay
    // goes at the first clear kerb north of it — 1.20 m off the bus's tail — where a 运钞车 for the
    // branch or a delivery for the corner block would actually stand. It is 5.60 m beyond the road
    // zone's own z0 of -13.50, so no body ever stands on it; it is read from the footway, which at
    // z -13.20 is between 5.6 and 11.6 m away.
    //
    // Paint only, as the ticket says: no collider, no kerb, nothing that could catch a wheel. The
    // bay carries no characters because `glyphs` cannot lie down — js/build.js:136 applies
    // rotX(PI/2) after rotY(yaw), so every glyph quad this engine makes is vertical, and painting
    // 装卸货 as stroke quads is thirty-odd quads on a road that is fill-rate bound.
    {
      const LZ0 = -24.80, LZ1 = -18.80, LZC = (LZ0 + LZ1) / 2, LL = LZ1 - LZ0;
      const LX0 = 27.92, LX1 = 30.00, LXC = (LX0 + LX1) / 2, LW = LX1 - LX0;
      for (const x of [LX0, LX1]) flat(x, YP, LZC, .12, LL, PAINTW, { gloss: .10 });
      for (const z of [LZ0, LZ1]) flat(LXC, YP, z, LW + .12, .12, PAINTW, { gloss: .10 });
      // The amber band down the kerb side is what separates a 装卸货泊位 from an ordinary bay: it
      // is the edge you may not park across. STUDA is this file's own amber, not a new colour.
      flat(LX0 + .40, YP, LZC, .40, LL - .40, STUDA, { gloss: .12 });
      // And the polish, so 12 m² of new paint does not read as a decal laid on old asphalt — the
      // same trick and the same colour as the two tyre bands across the zebra above.
      flat(LXC + .30, .0205, LZC + .60, 1.50, 3.20, SCUFF, { mode: 10, gloss: .26, ...ROADMAT });
    }

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
    pedPole(29.75, 2.72, 2.62, -Math.PI / 2, 2.28);      // on the 安全岛 — stage one
    pedPole(37.92, 2.95, 2.90, -Math.PI / 2, 2.46);      // far kerb — stage two, the hero
    pedPole(26.72, 3.30, 2.90, Math.PI / 2, 2.40);       // near kerb, for the way back

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
    crossSign(26.66, 3.06, -4.60, Math.PI);     // west kerb, read by southbound traffic
    crossSign(37.98, 3.10, 3.40, 0);            // east kerb, read by northbound traffic

    // B10. 人行横道 二 had paint, two dropped kerbs and two tactile blocks and nothing that said
    // what it was. It gets the same plate each side and NOTHING ELSE — no head, no countdown, no
    // phase, no gate. It is uncontrolled by design; a signal head there would be a promise the
    // traffic district was never told to keep.
    //
    // Neither plate is on the 26.66 / 37.98 pair the first crossing uses, and both moves are
    // forced by geometry the brief did not carry:
    //   * west — the shell's shelter (js/street.js:2441, bsx = RD0-1.35 = 26.15) fills
    //     x 25.00..27.10, z -15.70..-8.30 and glazes at 26.99, so 26.66 buries the plate in it and
    //     stands the pole in the bench. Out on the kerb stone at 27.40 there is 41 cm between that
    //     glass and the 27.58 kerb face; the plate's 66 cm overhangs the channel by 15 cm at
    //     2.73 m, which is clear of everything — the bus rests at x >= 28.09. Set back 2.10 m from
    //     XZ0, exactly as the first crossing's west plate is set back from CZ0.
    //   * east — 商务区's metro mouth is at (38.70, -5.20) and the shell's collider round it runs
    //     x 36.65..40.00, z -6.10..-3.90, so the matching 2.10 m set-back would put the pole on the
    //     stair. 3.20 m back, at z -7.60, clears the mouth by 1.50 m.
    crossSign(27.40, 3.06, -13.10, Math.PI);    // west kerb, southbound, 2.10 m back from XZ0
    crossSign(37.98, 3.10, -7.60, 0);           // east kerb, northbound, 3.20 m back from XZ1

    function crossSign(x, y, z, yaw) {
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
      // Behind the plate, not through it, and tall enough to actually reach the sign it carries.
      const bz = z - c * .07, bx = x - s * .07;
      cyl(bx, (y + .26) / 2, bz, .055, y + .26, POLE, { gloss: .42 });
      cyl(bx, .07, bz, .13, .14, POLED, { gloss: .28 });
    }

    // ---------------------------------------------------------- 限速 and the 电子警察
    speedSign(26.60, -7.90, Math.PI);
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
      vehHead(33.80, 5.32, z, 0, true);                  // over the east, -z lane
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
      thing('红绿灯', 33.80, 6.05, z, '绿灯亮了，可以走了。',
        'The green light is on, you can go.',
        '红绿灯 hóng-lǜ-dēng, red-green-light. The number under it counts the seconds down.',
        // Clear of the cycle rack another district parks at z 1.9–4.7 in this bike lane.
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
    // The shell builds the shelter, the roof, the glass, the bench and a blank white route board
    // with seven grey bars on it. A route board with no route on it is the one thing a bus stop
    // cannot be, so: the writing, the bin, the queue rail and the people.
    const bsx = RD0 - 2.6, bsz = -12.0, BX = bsx - .43;      // 2 cm proud of the shell's bars
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

    // 垃圾桶 — the two-bin Chinese street set, recyclables and everything else. Set clear of the
    // shelter's own collider so the footway keeps a walkable lane either side of it.
    binPair(25.90, -6.60);
    function binPair(x, z) {
      box(x, .34, z, .70, .68, 1.10, C('#3f5d48'), { hard: true, gloss: .30, tag: '垃圾桶' });
      box(x, .70, z, .74, .06, 1.14, C('#2f4738'), { hard: true, gloss: .34, tag: '垃圾桶' });
      for (const [oz, colr, lbl] of
           [[-.27, C('#2f6f9c'), '可回收物'], [.27, C('#5a6168'), '其他垃圾']]) {
        box(x - .30, .48, z + oz, .16, .26, .34, colr, { hard: true, gloss: .36, tag: '垃圾桶' });
        box(x - .37, .48, z + oz, .05, .18, .26, C('#15181b'), { hard: true, gloss: .20 });
        glyphs(x - .395, .16, z + oz, -Math.PI / 2, lbl,
          { size: .062, gap: .012, color: C('#e9e5da'), gloss: .10, lift: .006, tag: '垃圾桶' });
      }
      cyl(x, .04, z, .40, .08, C('#3a3f44'), { gloss: .24 });
      solid(x - .36, x + .36, z - .58, z + .58);
    }

    // 排队栏杆 — the guide rail people queue behind. No collider on it: the footway here is
    // three metres wide and a rail with a solid on it is how a pavement gets sealed.
    for (let i = 0; i <= 5; i++) {
      const pz = -10.90 + i * .62;
      cap(26.42, .49, pz, .032, .94, .032, RAILD, { gloss: .42 });
      cyl(26.42, .98, pz, .030, .04, RAIL, { gloss: .44 });
    }
    for (const y of [.92, .40])
      cap(26.42, y, -9.35, .024, 3.10, .024, RAIL, { rx: Math.PI / 2, gloss: .42 });

    // The queue itself. Blocks, not figures: js/figure.js is not on the district toolkit, and at
    // ten metres down a fog-limited street a coat, a head and two sleeves read as somebody waiting,
    // which is all this has to do. Every colour is a literal — a prop whose colour comes back
    // undefined puts the boot overlay up, and that bug has cost this project hours before.
    const QUEUE = [
      [26.10, -10.60, .06, C('#2f3a4a'), C('#d6ab86'), C('#241f1c')],
      [26.16, -9.74, -.22, C('#7a4038'), C('#c9a07c'), C('#3a2f2a')],
      [26.04, -8.96, .34, C('#4c5b46'), C('#e0b894'), C('#1e1c1a')],
    ];
    for (const [x, z, ry, coat, skin, hair] of QUEUE) {
      cyl(x, .40, z, .155, .80, C('#2b2f36'), { ry, gloss: .16 });
      box(x, 1.06, z, .40, .60, .26, coat, { ry, gloss: .10, round: .10 });
      box(x, 1.42, z, .22, .14, .20, skin, { ry, gloss: .10, round: .08 });
      box(x, 1.56, z, .24, .12, .23, hair, { ry, gloss: .08, round: .08 });
      for (const sd of [-.24, .24])
        cap(x + Math.cos(ry) * sd, 1.02, z - Math.sin(ry) * sd, .055, .52, .055, coat,
          { ry, gloss: .10 });
      S.shade(x, z, .92, .92, .30);
    }

    // ---------------------------------------------------------- 下水道, two more covers
    // The shell's covers are all round and all on the motor lanes. A square gully in the new east
    // bike lane and a services cover beside it are what the rest of a road surface is made of.
    box(36.94, .012, -6.40, .46, .024, .78, C('#33373a'), { hard: true, gloss: .34 });
    for (let k = 0; k < 5; k++)
      box(36.94, .026, -6.72 + k * .16, .36, .010, .055, C('#1c1f22'), { hard: true });
    cyl(36.10, .011, 4.80, .34, .016, C('#4a4640'), { hard: true, mode: 10, gloss: .30 });
    cyl(36.10, .019, 4.80, .27, .014, C('#413d38'), { hard: true, gloss: .26 });

    // ---------------------------------------------------------- the words
    thing('人行横道', 27.05, 2.35, 2.30, '过马路要走人行横道。',
      'To cross the road, use the pedestrian crossing.',
      '人行横道 rénxíng-héngdào, the marked crossing. Everyone calls it 斑马线, the zebra line.',
      { focus: [26.10, 1.60], reach: 2.6, tag: '人行横道' });
    thing('限速', 26.60, 2.34, 7.90, '这条路限速三十。',
      'The speed limit on this road is thirty.',
      '限 to limit + 速 speed. The red ring means it is an order, not a suggestion.',
      // On the road side of the kerb: the near footway north of z = 5 is taken up by another
      // district's colliders, and a word you cannot walk up to is not a word.
      { focus: [27.90, 7.90], reach: 2.6, tag: '限速' });
    thing('垃圾桶', 25.90, .80, -6.60, '垃圾桶就在公交站旁边。',
      'The bin is right beside the bus stop.',
      '垃圾 rubbish + 桶 a bucket. The blue half takes 可回收物, the recyclables.',
      { focus: [26.95, -6.60], reach: 2.4, tag: '垃圾桶' });

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
    S.light(29.75, 2.60, 2.72, [1.00, .74, .60], .30, 5.0);
    S.light(37.90, 2.80, 2.95, [1.00, .80, .64], .34, 5.6);
    S.light(33.80, 5.10, 6.40, [.86, 1.00, .90], .26, 6.0);

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
    const ph = u < G_END ? 0 : u < A_END ? 1 : 2;             // green / amber / red
    const pw = u < W0 ? 0 : u < W1 ? 1 : u < F1 ? 2 : 0;      // stop / walk / flashing
    // A flashing green flashes. It is most of what makes a Chinese crossing read as one rather
    // than as a green that happens to be about to end.
    const walking = pw === 1 || (pw === 2 && (t * 2) % 1 < .55);

    const vSecs = Math.max(1, Math.ceil(ph === 0 ? G_END - u : ph === 1 ? A_END - u : CYCLE - u));
    const pSecs = (u >= W0 && u < F1) ? Math.max(1, Math.ceil(F1 - u))
                                      : Math.max(1, Math.ceil(u < W0 ? W0 - u : CYCLE - u + W0));
    const now = SIGNAL.now;
    now.t = t;
    now.phase = ph === 0 ? 'green' : ph === 1 ? 'amber' : 'red';
    now.secs = vSecs;
    now.ped = pw === 0 ? 'stop' : pw === 1 ? 'walk' : 'flash';
    now.pedSecs = pSecs;
    now.mayCross = pw === 1;

    // Flashing green is time to finish, not time to step off the kerb. A body already between the
    // two gates gets an unconditional exit path until it reaches either pavement.
    const alreadyCrossing = !!body && body.x > KW + .18 && body.x < KE - .18
      && body.z > CZ0 - .45 && body.z < CZ1 + .45;
    const openCrossing = now.mayCross || alreadyCrossing;
    for (const gate of crossingGates) gate.open = openCrossing;
    SIGNAL.crossing.blocked = !openCrossing;

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
