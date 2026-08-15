// 自行车 — the cycles district. STREET.md's S18, and BIG-UPDATES.md's own words for it:
// bicycles are "the single most Beijing form of transport, absent". `bike()` at street.js:502
// builds parked bicycles — six leaning on a wall, five in a rack — and until this file nothing
// on two wheels moved anywhere in this game.
//
// What this district owns, and nothing else:
//   - one rider in each painted 非机动车道, widely phase-staggered: enough to establish bicycle
//     life without putting a bicycle person in a pedestrian or shared-surface route;
//   - 电动车 — faster, quieter and represented here by one 外卖 rider, the most recognisable
//     single figure on a Chinese street in 2026;
//   - three widely spaced 共享单车 in an invented operator's colour, kept out of the footway;
//   - both road riders stopping at the 红绿灯 and filtering to the front of the queue, which is the one
//     thing a bicycle does that a car cannot;
//   - and the west flow continuing behind the 公交站台 and 安全岛 in its own 2.25 m protected
//     track, without the former 1.50 m pinch or a last-second deflection.
//
// It deliberately does NOT build the bike-lane paint, the kerb, the bollards, the crossing, the
// island, any signal head, or any parked bicycle: street.js and js/street-road.js draw every one
// of those, and a second copy of a road is worse than no road. The EAST 非机动车道 carries one
// ordinary open-frame bicycle, leaving its paint and the business/metro elevation legible.
//
// ---------------------------------------------------------------------------------------------
// WHICH WAY A BICYCLE GOES HERE, measured rather than assumed
//
// China drives on the right, so a vehicle's kerb is on its right. In a right-handed frame with y
// up, "right" is forward × up, and ẑ × ŷ = -x̂ — so a machine travelling +z has the WEST kerb on
// its right. The painted lane hugs the west kerb, therefore **the west 非机动车道 runs +z**. That
// agrees with js/street-traffic.js, which reached the same answer from the 公交车站 being on the
// west pavement, and it makes -z north. street.js's own comment at 2281 is the odd one out.
//
// The east painted lane carries the legitimate -z return direction. Its lone bicycle begins more
// than ninety metres from the west-lane moped, so the title/crossing frame never starts as a cohort.
//
// ---------------------------------------------------------------------------------------------
// Why every rider is primitives and not js/figure.js
//
// `drawFigure` is immediate mode — it issues R.draw per limb inside the frame loop and hands back
// nothing a district builder can push into a prop list. And `.audit.js:327` records this street as
// FILL-RATE-BOUND, not geometry-bound, while `build.js` carries colour, gloss, alpha and glow PER
// INSTANCE: a few riders made of six meshes cost the draw calls of one, where the same number of
// immediate-mode figures costs several dozen. A seated rider is nine primitives. That is the
// trade, and on this street it is not close.
//
// ---------------------------------------------------------------------------------------------
// The two rules a moving prop in this engine has to obey
//
//  1. `finish()` computes `p.cx/cy/cz` once, off the matrix the prop was built with, and the draw
//     loop culls against those. Move `p.m` without moving the centre and the bicycle is culled
//     while it is on screen, or drawn while it is behind you. Every write to `p.m` below is
//     followed by the three centre fields.
//  2. `pick()` ray-tests `p.ob`, which is the BUILD position and never moves — and it blocks on
//     ANY prop, tagged or not, because an untagged prop in front of a labelled one is a wall. Six
//     hundred stale boxes stacked at the local origin, which is the middle of the alley outside
//     your own front door, would kill every label in the district. So `machine()` strips `ob` off
//     every part it makes, and no moving prop carries a tag either.
//
// Nothing here allocates per frame. `M.mul` takes an output matrix, `p.m` is already a
// Float32Array(16) of its own, and the local matrices the animated parts need are written in place
// by the two little builders below. A tick that allocates six hundred matrices a frame is a tick
// that spends its life in the collector.
//
// ---------------------------------------------------------------------------------------------
// WHERE THE FLOW ACTUALLY IS — measured in the live scene, because it was queried
//
// Counting this district's own props by x band (they are identifiable: `machine()` is the only
// thing in the game that leaves `p.ob === null` rather than deleting it), with the shell, the road
// and the traffic all built:
//
//     west 非机动车道  x 25.42..27.67    one 外卖 moped
//     platform/median  x 27.67..29.47      independent of both moving tracks
//     motor lanes      x 29.47..35.17      one 623 bus in the south path
//     east 非机动车道  x 35.17..37.42    one bicycle; parking is beyond it on the footway edge
//     west pavement    x 23.42..25.42      pedestrian run kept clear
//     hutong/shared surface              no bicycle people; the pedestrian route stays clear
//
// Not one moving prop is on the carriageway's footway. A count of props *tagged* 自行车/电动车/外卖
// reads 51 on the walkway and 0 on the road, but none of those 51 are this district's: they are
// street.js's own parked row at (-5.0, 3.05), the only `bike()` call in the shell that passes
// `tagIt`. Nothing here carries a tag at all, for the reason in rule 2 below.
//
// A former neighbour walking a bicycle used this hutong's centre line and could wait there for the
// player. That read as a seated bicycle person blocking the walkway, so the complete moving rig is
// deliberately absent. Shared surfaces are pedestrian space; moving riders stay in protected lanes.
//
// ---------------------------------------------------------------------------------------------
// TICKETS
//
//   Mech — FIXED WHILE THIS WAS BEING WRITTEN, recorded because it cost an afternoon and because
//   the fallback it forced is still in this file. `buildDistricts()` used to run *inside* `build()`,
//   which is called before `const S` is declared, so every district read S out of the temporal dead
//   zone and died — swallowed by the registry's try/catch, so the street looked fine and not one of
//   the nine districts was ever built. Verified in the browser at the time: nine lines of "StreetFit
//   <name>: Cannot access 'S' before initialization". street.js now calls `buildDistricts()` after
//   the declaration and every district builds. `lateKit()` at the bottom of this file is the
//   workaround it forced, kept as insurance while the whole army is still editing street.js, and
//   safe to delete once the shell settles: it is unreachable on the normal path.
//
//   Foreman — resolved: traffic now has one motor lane each way and the old x 36.30 car lane has
//   been removed. The east 非机动车道 is reserved for cycles and parked shared bikes; its single
//   return rider is phase-staggered from the west-lane delivery moped.
//
//   The old footway rack and its two dumped bicycles have also been moved into a marked kerbside
//   bay at the outer edge of the east cycle track.
(() => {
  'use strict';

  // Registered at load, which is the only moment certainly before the atlas is drawn.
  try { Glyphs.need('速达青燕单车'); } catch (_) {}

  // ---------------------------------------------------------------- the invented operators
  // Never a real brand, ever. 青燕 is "green swallow" — 燕 is Beijing's own character, the one in
  // 燕京 — and 橙风 is "orange wind". Both made up for this street. The 外卖 box says 速达,
  // "arrives fast", which is a description of the job and not a company.
  const OPS = [{ name: '青燕单车', hex: '#2fa08a' }, { name: '橙风单车', hex: '#e07a2c' }];
  const DELIVERY = '速达';

  // ---------------------------------------------------------------- the palette
  //
  // Held here rather than taken off `S.col`, so `machine()` runs identically on the real toolkit
  // and on the fallback one. Every entry is a hex string turned into a colour by `C` at build
  // time and never indexed by anything that could come back undefined — a prop whose colour is
  // undefined takes the whole game down on the first frame.
  const HX = {
    tyre: '#22262b', steel: '#a7adb2', steelD: '#7b8288', charcoal: '#33383d',
    shell: '#d8dbd8', canvas: '#c9b493', wicker: '#8a7048', hair: '#241c18',
    wood: '#6c5340', woodD: '#5b4634', crate: '#8f5b3a', head: '#fff2cf', tail: '#e4442e',
    clear: '#cfd8d4', canopy: '#7fb8c4', lid: '#f0efe9', ink: '#fbf6ec', board: '#f4f1e6',
  };
  const G_METAL = .58, G_CLOTH = .04, G_WOOD = .20;

  // ---------------------------------------------------------------- the road, measured
  //
  // Anchored on js/street-road.js's published contract when it is there, and on the same numbers
  // as literals when it is not, so this district is never left guessing at a lane centre.
  const FALLBACK = {
    lane: { bikeW: 26.545, wrong: 36.295 },
    stop: { flow: -4.00, wrong: 3.60 },
    island: { x0: 27.67, z0: -3.60, z1: 3.00 },
    cycle: 66, green: 30, amber: 3,
  };
  function roadSignal() {
    try {
      const r = StreetFit['road'];
      return r && r.signal && typeof r.signal.go === 'function' ? r.signal : null;
    } catch (_) { return null; }
  }
  // Green for the motor traffic on this road, which is the aspect a bicycle in its lane obeys.
  // Read through the road district when it is present so that cars and bicycles never disagree
  // about the colour of the same lamp; its own clock only when it is not.
  let SIG = null;
  function phaseNow(t) {
    if (SIG) { try { return SIG.phase(t); } catch (_) { SIG = null; } }
    const u = ((t % FALLBACK.cycle) + FALLBACK.cycle) % FALLBACK.cycle;
    return u < FALLBACK.green ? 'green'
         : u < FALLBACK.green + FALLBACK.amber ? 'amber' : 'red';
  }

  // ---------------------------------------------------------------- matrices, written in place
  //
  // trans(x, y, z) · rotX(a) · scale(sx, sy, sz) — the sagittal-plane transform, which is what a
  // pedalling leg, a turning wheel and a frame tube all are. Column-major, composed in the same
  // order `Build.transform` composes an `{ rx }` option, so an animated part and a static one
  // built beside it land in exactly the same place. Checked against `Build.transform` numerically.
  function sag(o, x, y, z, a, sx, sy, sz) {
    const c = Math.cos(a), s = Math.sin(a);
    o[0] = sx;  o[1] = 0;       o[2] = 0;       o[3] = 0;
    o[4] = 0;   o[5] = c * sy;  o[6] = s * sy;  o[7] = 0;
    o[8] = 0;   o[9] = -s * sz; o[10] = c * sz; o[11] = 0;
    o[12] = x;  o[13] = y;      o[14] = z;      o[15] = 1;
  }
  // trans(px, 0, pz) · rotY(yaw) · rotZ(lean) — where the machine is and how far over it is
  // heeled. The lean is about the machine's own forward axis, which is local z, so it is a rotZ:
  // that single rotation is what makes a bicycle read as a bicycle and not as a model on a rail.
  function pivot(o, px, pz, yaw, lean) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cl = Math.cos(lean), sl = Math.sin(lean);
    o[0] = cy * cl;  o[1] = sl;  o[2] = -sy * cl; o[3] = 0;
    o[4] = -cy * sl; o[5] = cl;  o[6] = sy * sl;  o[7] = 0;
    o[8] = sy;       o[9] = 0;   o[10] = cy;      o[11] = 0;
    o[12] = px;      o[13] = 0;  o[14] = pz;      o[15] = 1;
  }

  // ---------------------------------------------------------------- state
  const lanes = [];                     // ordered streams; a rider follows the rider in front
  const all = [];                       // every mover, for the lamps
  let built = false, lastT = -1, dark0 = -1, hidden = false;
  const FRONT_FIRST = (a, b) => b.s - a.s;
  const damp = (value, target, rate, dt) =>
    value + (target - value) * (1 - Math.exp(-rate * Math.max(0, dt || 0)));
  const smoothUnit = value => {
    const u = Math.max(0, Math.min(1, value));
    return u * u * (3 - 2 * u);
  };
  const PIV = new Float32Array(16), TMP = new Float32Array(16), LOC = new Float32Array(16),
        ST0 = new Float32Array(16), ST1 = new Float32Array(16), ST2 = new Float32Array(16);
  // Parked out of the world: four hundred metres down and four kilometres east, which is outside
  // the main pass's far plane on one comparison and outside the shadow pass's light box on another.
  const FARX = 4000, FARY = -400;

  // ---------------------------------------------------------------- the machines
  //
  // Everything is built at the local origin with +z forward, +x to the rider's left and y up, and
  // the matrix each part comes back with is kept as its rest pose. Per frame the rest pose is
  // multiplied through the pivot; the parts that also deform — wheels, cranks, legs — have their
  // own local matrix rewritten first. Nothing is built at a world position, so a machine can be
  // anywhere, and the same code builds the ones that move and the ones standing in the rack.
  function machine(K, kind, o) {
    const C = K.C;
    const m = { kind, rigid: [], spokes: [], cranks: [], legs: [], lamps: [] };
    const keep = (p, extra) => {
      m.rigid.push({ p, m0: new Float32Array(p.m), ...(extra || {}) });
      return p;
    };
    const METAL = { gloss: G_METAL }, CLOTH = { gloss: G_CLOTH, mode: 7 }, SKIN = { gloss: .16 };
    const TYRE = C(HX.tyre), STEEL = C(HX.steel), STEELD = C(HX.steelD), DARK = C(HX.charcoal);
    const EYE = C('#241b18'), MOUTH = C('#8a4540');
    const skin = o.skin, hair = C(HX.hair);

    // A capsule running from one place to another, for the parts that are not in the sagittal
    // plane — an arm reaching across to a handlebar grip. `Build.transform` composes rotY then
    // rotX and a capsule stands along its own +y, so: tip it by rx for the rise, swing it by ry
    // for the bearing.
    const link = (a, b, dia, color, opt) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      const L = Math.hypot(dx, dy, dz) || 1e-4;
      return K.cap((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, dia, L, dia, color,
        { ry: Math.atan2(dx, dz), rx: Math.acos(Math.max(-1, Math.min(1, dy / L))), ...opt });
    };
    // A frame tube between two points in the sagittal plane. Every bicycle in the world is six of
    // these, and it is the six that say "bicycle" from thirty metres, long before the wheels do.
    const tube = (y0, z0, y1, z1, d, c) => {
      const dy = y1 - y0, dz = z1 - z0, L = Math.hypot(dy, dz) || 1e-4;
      keep(K.cap(0, (y0 + y1) / 2, (z0 + z1) / 2, d, L, d, c,
        { rx: Math.atan2(dz, dy), gloss: .34 }));
    };
    // A wheel: a genuinely open segmented tyre ring and spokes. The old solid cylinder read as a
    // rank of black discs when five parked bikes lined up in the business/metro oblique view. Short
    // overlapping capsules retain a round silhouette while preserving visible air through every
    // wheel; the animated bars make moving machines read as rolling rather than sliding.
    const wheel = (x, z, r, nBar, bar, steerable = false) => {
      if (steerable) m.frontZ = z;
      const tyreD = Math.min(.050, r * .145), rr = r - tyreD * .50, segN = 12;
      const segL = 2 * rr * Math.sin(Math.PI / segN) + tyreD * .58;
      for (let i = 0; i < segN; i++) {
        const a = (i + .5) * Math.PI * 2 / segN;
        keep(K.cap(x, r + Math.cos(a) * rr, z + Math.sin(a) * rr,
          tyreD, segL, tyreD, TYRE,
          { rx: Math.atan2(Math.cos(a), -Math.sin(a)), gloss: .24 }),
        steerable ? { front: true, steerZ: z } : null);
      }
      for (let i = 0; i < nBar; i++) {
        const off = (i * Math.PI) / nBar;
        m.spokes.push({ p: K.box(x, r, z, .030, r * 1.86, .034, bar,
          { hard: true, rx: off, gloss: G_METAL }), x, z, r, off,
          front: steerable, steerZ: z });
      }
    };
    // A small face on the local +z side of a head. These parts go through `keep`, so they inherit
    // the bicycle's pivot and can never lag behind or float beside a moving rider.
    const face = (x, y, z, scale = 1) => {
      for (const side of [-1, 1])
        keep(K.ball(x + side * .035 * scale, y + .012 * scale, z + .101 * scale,
          .012 * scale, .016 * scale, .011 * scale, EYE, { gloss: .08 }));
      for (const side of [-1, 1])
        keep(K.box(x + side * .035 * scale, y + .043 * scale, z + .100 * scale,
          .035 * scale, .009 * scale, .009 * scale, hair,
          { hard: true, rz: side * .08, gloss: .10 }));
      for (const side of [-1, 1])
        keep(K.ball(x + side * .099 * scale, y - .002 * scale, z + .006 * scale,
          .018 * scale, .030 * scale, .014 * scale, skin, SKIN));
      keep(K.ball(x, y - .012 * scale, z + .111 * scale,
        .012 * scale, .014 * scale, .012 * scale, skin, SKIN));
      keep(K.box(x, y - .052 * scale, z + .105 * scale,
        .046 * scale, .010 * scale, .012 * scale, MOUTH, { hard: true, gloss: .06 }));
    };
    // Head, hair, torso, two arms. How far forward the torso is folded is the clearest difference
    // between the two kinds at a distance: a bicycle rider is bent over the bars, a 电动车 rider
    // sits bolt upright with their hands out in front of them.
    const rider = (hipY, hipZ, shoY, shoZ, headY, headZ, handX, handY, handZ, coat) => {
      const build = o.build || 1;
      keep(K.cap(0, (hipY + shoY) / 2, (hipZ + shoZ) / 2, .35 * build,
        Math.hypot(shoY - hipY, shoZ - hipZ) + .16, .27, coat,
        { rx: Math.atan2(shoZ - hipZ, shoY - hipY), ...CLOTH }));
      keep(K.cap(0, headY - .105, headZ - .006, .075, .16, .072, skin, SKIN));
      keep(K.ball(0, headY, headZ, .098, .112, .105, skin, SKIN));
      keep(K.ball(0, headY + .038, headZ - .022, .105, .092, .108, hair, { gloss: .14 }));
      if (o.hairStyle === 1)
        keep(K.ball(-.052, headY + .026, headZ + .052, .064, .052, .080, hair, { gloss: .13 }));
      else if (o.hairStyle === 2)
        keep(K.cap(.085, headY + .015, headZ - .012, .050, .18, .050, hair,
          { rz: -.25, gloss: .13 }));
      face(0, headY, headZ);
      for (const side of [-1, 1]) {
        const sh = [side * .155 * build, shoY - .04, shoZ + .02];
        const hand = [side * handX, handY, handZ];
        const elbow = [
          (sh[0] + hand[0]) * .5 + side * .070,
          (sh[1] + hand[1]) * .5 - .090,
          (sh[2] + hand[2]) * .5 - .015,
        ];
        keep(link(sh, elbow, .108, coat, CLOTH));
        keep(link(elbow, hand, .092, coat, CLOTH));
        keep(K.ball(hand[0], hand[1], hand[2], .050, .043, .058, skin, SKIN));
      }
    };
    // 头盔. Worn on a bicycle here by close to nobody and by every 外卖 rider, which is exactly why
    // it is on the street: it is what tells the two apart at forty metres.
    const helmet = (y, z, c) => {
      keep(K.ball(0, y, z, .118, .100, .124, c, { gloss: .44 }));
      keep(K.box(0, y - .040, z + .110, .19, .028, .09, c, { gloss: .44 }));
    };

    if (kind === 'bike' || kind === 'trike') {
      const trike = kind === 'trike';
      const WR = trike ? .30 : .335, FZ = trike ? .62 : .53, RZ = trike ? -.78 : -.53;
      const BBY = .265, BBZ = -.06;
      wheel(0, FZ, WR, 2, STEEL, true);
      if (trike) {
        for (const side of [-.40, .40]) wheel(side, RZ, WR, 2, STEELD);
        keep(K.cap(0, WR, RZ, .05, .96, .05, STEELD, { rz: Math.PI / 2, ...METAL }));
      } else wheel(0, RZ, WR, 2, STEEL);
      // the diamond: seat tube, down tube, top tube, chain stay, seat stay, fork, steerer
      const SEATY = .805, SEATZ = -.30, HEADT = .95, HEADB = .615, HEADZ = .47;
      tube(BBY, BBZ, SEATY - .06, SEATZ + .02, .048, o.frame);
      tube(BBY, BBZ, HEADB, HEADZ - .01, .050, o.frame);
      tube(SEATY - .09, SEATZ + .03, HEADT - .07, HEADZ, .046, o.frame);
      tube(BBY, BBZ, WR, RZ, .038, o.frame);
      if (!trike) tube(SEATY - .09, SEATZ + .03, WR, RZ, .034, o.frame);
      tube(HEADB, HEADZ, WR, FZ, .040, STEELD);
      keep(K.cap(0, HEADT - .10, HEADZ + .015, .046, .40, .046, STEELD, { rx: .12, ...METAL }));
      keep(K.ball(0, SEATY, SEATZ, .115, .035, .170, TYRE,
        { mode:7,gloss: .30 }));
      keep(K.cap(0, HEADT + .07, HEADZ + .04, .028, .48, .028, DARK,
        { rz: Math.PI / 2, gloss: .34 }));
      // 车筐, the wire basket on the front. Half the bicycles in this city have one and the other
      // half have a rack; nobody rides a bare frame around with nowhere to put anything.
      if (o.basket)
        keep(K.taper(0, .80, HEADZ + .14, .30, .26, .26, o.basketCol || STEELD, { gloss: .34 }));
      if (trike) {
        keep(K.box(0, .56, RZ + .04, 1.00, .08, 1.30, C(HX.wood), { hard: true, gloss: G_WOOD }));
        for (const side of [-.50, .50])
          keep(K.box(side, .70, RZ + .04, .05, .30, 1.30, C(HX.woodD),
            { hard: true, gloss: G_WOOD }));
        keep(K.box(0, .72, RZ + .58, .96, .34, .05, C(HX.woodD), { hard: true, gloss: G_WOOD }));
        for (let i = 0; i < 3; i++)
          keep(K.box(-.26 + i * .27, .78, RZ - .10 + (i % 2) * .34, .30, .36, .32,
            i % 2 ? C(HX.canvas) : C(HX.crate), { gloss: .18, ry: .2 - i * .18 }));
      } else keep(K.box(0, .79, -.44, .23, .035, .34, STEELD, { gloss: .34 }));

      if (o.pushed) {
        // Somebody walking a bike along beside them: the other half of what a hutong full of
        // bicycles looks like. No hands on the bars from the saddle — the walker is off to one
        // side with one hand on the grip and the other swinging.
        const W = o.wside, hipY = .92, shoY = 1.42, wx = W * .46;
        keep(K.cap(wx, (hipY + shoY) / 2, -.04, .35, shoY - hipY + .18, .27, o.coat,
          { rx: -.06, ...CLOTH }));
        keep(K.ball(wx, shoY + .16, .01, .098, .112, .105, skin, SKIN));
        keep(K.ball(wx, shoY + .20, -.02, .105, .092, .108, hair, { gloss: .14 }));
        face(wx, shoY + .16, .01);
        keep(link([wx - W * .13, shoY - .04, -.02], [W * .22, .99, HEADZ + .02], .105, o.coat, CLOTH));
        keep(link([wx + W * .13, shoY - .04, -.02], [W * .62, 1.02, -.16], .105, o.coat, CLOTH));
        for (const side of [-1, 1])
          m.legs.push({ hip: [wx + side * .09, hipY, -.05], up: .47, lo: .49, dia: [.135, .115],
            thigh: K.cap(wx + side * .09, hipY - .235, -.05, .135, .47, .135, o.trouser, CLOTH),
            shin: K.cap(wx + side * .09, hipY - .715, -.05, .115, .49, .115, o.trouser, CLOTH),
            shoe: K.box(wx + side * .09, .06, .10, .15, .075, .28, DARK, { gloss: .24 }),
            walk: side > 0 ? 0 : Math.PI });
      } else if (!o.noRider) {
        const HIPY = .875, HIPZ = -.245, SHOY = 1.335, SHOZ = .045, CR = .168;
        rider(HIPY, HIPZ, SHOY, SHOZ, 1.485, .105, .225, .99, HEADZ + .05, o.coat);
        if (o.helmet) helmet(1.545, .095, o.helmet);
        if (o.bag) keep(K.box(0, 1.20, -.30, .30, .34, .17, o.bag, CLOTH));
        if (o.child) {
          // A child on the rear rack with both legs over one side, which is how they ride and how
          // they have always ridden.
          keep(K.cap(.10, 1.02, -.46, .24, .40, .20, o.childCoat, { rx: -.05, ...CLOTH }));
          keep(K.ball(.10, 1.24, -.44, .078, .088, .082, skin, SKIN));
          keep(K.ball(.10, 1.275, -.465, .084, .072, .086, hair, { gloss: .14 }));
          face(.10, 1.24, -.44, .78);
          for (const dz of [-.10, .10])
            keep(K.cap(.235, .77, -.46 + dz, .085, .38, .085, o.childCoat, { rz: -.5, ...CLOTH }));
        }
        for (const side of [-1, 1]) {
          const px = side * .082;
          m.cranks.push({ p: K.box(px, BBY, BBZ, .085, .022, .115, DARK,
            { hard: true, gloss: .34 }), x: px, y: BBY, z: BBZ, r: CR,
            off: side > 0 ? 0 : Math.PI });
          m.legs.push({ hip: [px, HIPY, HIPZ], up: .455, lo: .47, dia: [.145, .118],
            thigh: K.cap(px, HIPY - .225, HIPZ, .145, .455, .145, o.trouser, CLOTH),
            shin: K.cap(px, HIPY - .69, HIPZ, .118, .47, .118, o.trouser, CLOTH),
            shoe: K.box(px, .06, .10, .14, .075, .27, DARK, { gloss: .24 }),
            support: !trike && side < 0,
            crank: [BBY, BBZ, CR], off: side > 0 ? 0 : Math.PI });
        }
      }
      m.wheelR = WR;
      m.gear = o.pushed ? 4.6 : trike ? 2.1 : 1.55;   // crank/stride radians per metre travelled
      m.bias = o.pushed ? -.10 : 0;                   // a pushed bike leans on the hand holding it
      // Three wheels do not lean, and neither does a bike being walked: both stay flat and just
      // track sideways. Heeling a flatbed cart into a weave looks wrong long before anybody can
      // say why.
      m.tilt = (trike || o.pushed) ? 0 : 1;
      // Collider half-width includes bars, hands and the support-foot pose, not just the frame.
      // The pushed machine also includes the walker standing alongside it.
      // The pushed rig includes the neighbour's full walking stride beside the frame: its
      // measured emitted half-envelope reaches .788 m while moving and .769 m at rest.
      m.wide = trike ? .52 : o.pushed ? .80 : .34;
    }

    if (kind === 'moped') {
      // 电动车. Small wheels, a step-through deck, a fat saddle, and a rider sitting straight up
      // with their feet flat on the board — none of which is a bicycle and all of which reads at a
      // glance. Three bars in the wheel rather than two: these run mag wheels, not spokes.
      const WR = .245;
      wheel(0, .605, WR, 3, STEELD, true);
      wheel(0, -.585, WR, 3, STEELD);
      // Visible alloy hubs, curved mudguards, an ellipsoidal battery fairing and a moulded saddle
      // replace the three stacked boxes that previously made every 电动车 read as a trolley.
      keep(K.cyl(0,WR,.605,WR*.60,.018,STEELD,
        {rz:Math.PI/2,gloss:.46}));
      keep(K.cyl(0,WR,-.585,WR*.60,.018,STEELD,
        {rz:Math.PI/2,gloss:.46}));
      keep(K.ball(0,.40,.605,.19,.060,.28,o.frame,
        {mode:7,gloss:.34}));
      keep(K.ball(0,.40,-.585,.20,.060,.29,o.frame,
        {mode:7,gloss:.34}));
      keep(K.ball(0, .315, -.02, .20, .075, .52, o.frame,
        {mode:7,gloss: .34 }));
      keep(K.ball(0, .565, -.44, .19, .23, .27, o.frame,
        {mode:7,gloss: .34 }));
      keep(K.ball(0, .835, -.37, .18, .045, .30, TYRE,
        {mode:7,gloss: .26 }));
      keep(K.taper(0, .615, .44, .32, .62, .33, o.frame, { rx: -.13, gloss: .34 }));
      keep(K.cap(0, .90, .47, .05, .52, .05, STEELD, { rx: -.13, ...METAL }));
      keep(K.cap(0, 1.075, .495, .032, .58, .032, DARK, { rz: Math.PI / 2, gloss: .34 }));
      for(const side of [-1,1]) {
        keep(link([side*.20,1.07,.49],[side*.37,1.27,.47],.025,STEELD,METAL));
        keep(K.ball(side*.37,1.27,.47,.075,.052,.038,DARK,
          {mode:7,gloss:.54}));
        keep(K.ball(side*.37,1.27,.502,.060,.040,.010,C(HX.clear),
          {mode:1,gloss:.78}));
        keep(K.ball(side*.20,.73,.555,.050,.035,.025,C('#e7a12c'),
          {mode:1,glow:.025,gloss:.40}));
      }
      // Lamps, driven off the clock in the tick. A 电动车 with no headlight after dark is the one
      // thing about them everybody notices. Emissive, but two small boxes per machine is nothing
      // like `mode: 1` on every character of a sign, which is what smears a district into a
      // half-transparent copy of itself.
      m.lamps.push(keep(K.ball(0, .755, .585, .12, .065, .040, C(HX.head),
        { mode: 1, gloss: .5, glow: 0 })));
      m.lamps.push(keep(K.ball(0, .70, -.665, .10, .040, .030, C(HX.tail),
        { mode: 1, gloss: .4, glow: 0 })));
      // 挡风被 — the quilted apron buttoned over the bars, on all winter and most of the rest of
      // the year too. street.js:873 builds one on the parked pair; this is the moving version.
      if (o.quilt) {
        keep(K.ball(0, .955, .375, .31, .21, .17, o.quilt, CLOTH));
        keep(K.ball(0, .675, .335, .27, .18, .15, o.quilt, CLOTH));
        for (const side of [-.27, .27])
          keep(K.ball(side, 1.00, .40, .12, .13, .09, o.quilt, CLOTH));
      }
      // 雨棚 — the canopy over the whole machine. Illegal, ubiquitous, and the most recognisable
      // silhouette on a wet Beijing street.
      if (o.canopy) {
        for (const side of [-.30, .30])
          keep(K.cap(side, 1.28, -.46, .028, .90, .028, STEELD, { rx: .10, ...METAL }));
        keep(K.ball(0, 1.79, .00, .43, .045, .71, o.canopy, { mode: 7, gloss: .42 }));
        keep(K.box(0, 1.43, .70, .82, .78, .05, C(HX.clear), { hard: true, rx: -.22, gloss: .5 }));
        keep(K.box(0, 1.76, .66, .88, .12, .26, o.canopy, { hard: true, rx: -.22, gloss: .42 }));
      }
      // 外卖. The box on the back, the jacket the same colour as the box, and two characters on
      // each side of it — each side, because half this flow is pointed the other way. Lit, never
      // emissive: glowing sign text is the trap that hazes this whole district, and this is sign
      // text.
      if (o.food) {
        // A strapped insulated pod, not a purple cube carried above the rear wheel.  The rounded
        // shell and lid keep the useful delivery silhouette without reintroducing a dominant box.
        keep(K.ball(0, 1.05, -.70, .25, .235, .23, o.food,
          { mode: 7, gloss: .34 }));
        keep(K.ball(0, 1.30, -.70, .24, .035, .22, C(HX.lid),
          { mode: 7, gloss: .30 }));
        for (const side of [-.18, .18])
          keep(K.cap(side, 1.05, -.70, .014, .38, .014, C(HX.lid),
            { gloss: .32 }));
        keep(K.ball(0, .99, -.935, .10, .035, .012, C(HX.tail),
          { mode: 1, glow: .018, gloss: .38 }));
        for (const side of [-1, 1])
          for (const g of K.glyphs(side * .24, 1.05, -.70, side * Math.PI / 2, DELIVERY,
              { size: .17, gap: .03, color: C(HX.ink), gloss: .12, lift: .014 }))
            m.rigid.push({ p: g, m0: new Float32Array(g.m) });
      }
      const HIPY = .995, HIPZ = -.30, SHOY = 1.475, SHOZ = -.175;
      rider(HIPY, HIPZ, SHOY, SHOZ, 1.635, -.115, .36, 1.27, .47, o.coat);
      if (o.helmet) helmet(1.695, -.125, o.helmet);
      // Legs rest on the deck while moving. At a full stop the nearside leg is solved down to the
      // road, just like a real rider balancing a heavy 电动车 instead of freezing on both pegs.
      for (const side of [-1, 1]) {
        const px = side * .105;
        m.legs.push({ hip: [px, HIPY - .04, HIPZ + .02], up: .48, lo: .50,
          dia: [.155, .125], moped: true, support: side < 0,
          thigh: K.cap(px, .79, -.10, .155, .48, .155, o.trouser, CLOTH),
          shin: K.cap(px, .57, .17, .125, .50, .125, o.trouser, CLOTH),
          shoe: K.box(px, .385, .30, .11, .07, .26, DARK, { gloss: .26 }),
          shoeSize: [.11, .07, .26] });
      }
      m.wheelR = WR;
      m.gear = 0;
      m.bias = 0;
      m.tilt = 1;
      // Mirror-to-mirror is 0.89 m. The former .64 m collider left up to 12.5 cm of each stopped
      // mirror/hand rig walk-through; .45 is the complete stopped support-foot envelope.
      // The animated riding lean puts the emitted mirror/rig envelope .469 m off centre.
      m.wide = .47;
    }

    // Rule 2 at the top of the file: strip the pick box off every part. `p.ob` is where the prop
    // was BUILT, which for all of these is the local origin — the middle of the alley, outside
    // your own front door — and `pick()` blocks on any prop with an `ob`, tagged or not.
    const bare = p => {
      if (!p) return;
      p.ob = null;
      // Moving props must keep the packed batch-cull centre in step with their matrix. Static rack
      // bicycles use the same builder with `noRider` and deliberately retain the cheap static path.
      if (!o.noRider) p.dynamic = true;
    };
    for (const r of m.rigid) bare(r.p);
    for (const w of m.spokes) bare(w.p);
    for (const c of m.cranks) bare(c.p);
    for (const g of m.legs) { bare(g.thigh); bare(g.shin); bare(g.shoe); }
    return m;
  }

  // ---------------------------------------------------------------- one machine, one frame
  function place(m) {
    pivot(PIV, m.px, m.pz, m.yaw, m.lean);
    const steering = m.frontZ !== undefined && Math.abs(m.steer || 0) > 1e-4;
    if (steering) {
      M.trans(0, 0, m.frontZ, ST0);
      M.rotY(m.steer, ST1);
      M.mul(ST0, ST1, ST2);
      M.trans(0, 0, -m.frontZ, ST1);
      M.mul(ST2, ST1, ST0);
    }
    for (const r of m.rigid) {
      const p = r.p;
      if (steering && r.front) {
        M.mul(ST0, r.m0, LOC);
        M.mul(PIV, LOC, p.m);
      } else M.mul(PIV, r.m0, p.m);
      p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    }
    for (const w of m.spokes) {
      sag(TMP, w.x, w.r, w.z, m.spin + w.off, .030, w.r * 1.86, .034);
      const p = w.p;
      if (steering && w.front) {
        M.mul(ST0, TMP, LOC);
        M.mul(PIV, LOC, p.m);
      } else M.mul(PIV, TMP, p.m);
      p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    }
    for (const c of m.cranks) {
      const a = m.crank + c.off;
      sag(TMP, c.x, c.y + Math.cos(a) * c.r, c.z + Math.sin(a) * c.r, 0, .085, .022, .115);
      const p = c.p;
      M.mul(PIV, TMP, p.m);
      p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    }
    // Legs: two bones solved to wherever the foot has to be. Pedalling is the honest version of
    // this — the foot is on the pedal, the pedal is on a crank, and the knee falls out of it — and
    // a walk is the same solver with the foot on an arc instead of a circle.
    for (const g of m.legs) {
      let fy, fz;
      if (g.walk !== undefined) {
        // The foot has to come down onto the paving and stay there through the stance half, or the
        // walker skates. -.855 puts the shin capsule's rounded end on the ground at full stretch.
        const a = m.crank + g.walk;
        fy = -.002 + Math.max(0, Math.sin(a)) * .11;
        // Through the grounded half of the stride the world-space foot must travel backwards
        // relative to the advancing hip. The old plus sign drove it forwards and made the person
        // walking this bicycle skate on every step.
        fz = g.hip[2] - Math.cos(a) * .24;
      } else if (g.moped) {
        fy = .40;
        fz = .24;
        if (g.support && m.stopK > 0) {
          fy += (-.002 - fy) * m.stopK;
          fz += (-.08 - fz) * m.stopK;
        }
      } else {
        const a = m.crank + g.off;
        fy = g.crank[0] + Math.cos(a) * g.crank[2];
        fz = g.crank[1] + Math.sin(a) * g.crank[2];
        // At a full stop the near leg comes off the pedal and settles onto the road. The blend
        // begins only once the wheels are almost still, so the foot never sweeps through a turning
        // crank and the rider no longer balances impossibly on two frozen pedals at a red light.
        if (g.support && m.stopK > 0) {
          fy += (-.002 - fy) * m.stopK;
          fz += (-.08 - fz) * m.stopK;
        }
      }
      let dy = fy - g.hip[1], dz = fz - g.hip[2];
      let d = Math.hypot(dy, dz) || 1e-4;
      const reach = (g.up + g.lo) * .992;
      // A foot further off than the leg is long is a leg that stretches. Pull the foot in instead:
      // at the bottom of a stroke the two are a couple of centimetres apart and nobody can see it,
      // whereas a rubber shin is visible from across the road.
      if (d > reach) {
        const k = reach / d;
        dy *= k; dz *= k; d = reach; fy = g.hip[1] + dy; fz = g.hip[2] + dz;
      }
      const uy = dy / d, uz = dz / d;
      const mm = (g.up * g.up - g.lo * g.lo + d * d) / (2 * d);
      const hh = Math.sqrt(Math.max(0, g.up * g.up - mm * mm));
      // The knee goes in front of the hip→foot line. The hip is above the foot, so uy is negative
      // and the perpendicular (uz, -uy) is the one whose z component is positive — which is
      // forward, which is where a knee is.
      const ky = g.hip[1] + mm * uy + hh * uz;
      const kz = g.hip[2] + mm * uz - hh * uy;
      const ay = ky - g.hip[1], az = kz - g.hip[2], aL = Math.hypot(ay, az) || 1e-4;
      sag(TMP, g.hip[0], g.hip[1] + ay / 2, g.hip[2] + az / 2, Math.atan2(az, ay),
        g.dia[0], aL, g.dia[0]);
      M.mul(PIV, TMP, g.thigh.m);
      g.thigh.cx = g.thigh.m[12]; g.thigh.cy = g.thigh.m[13]; g.thigh.cz = g.thigh.m[14];
      const by = fy - ky, bz = fz - kz, bL = Math.hypot(by, bz) || 1e-4;
      sag(TMP, g.hip[0], ky + by / 2, kz + bz / 2, Math.atan2(bz, by), g.dia[1], bL, g.dia[1]);
      M.mul(PIV, TMP, g.shin.m);
      g.shin.cx = g.shin.m[12]; g.shin.cy = g.shin.m[13]; g.shin.cz = g.shin.m[14];
      if (g.shoe) {
        const ss = g.shoeSize || [.15, .075, .28];
        sag(TMP, g.hip[0], fy + ss[1] * .54, fz + ss[2] * .34, 0, ss[0], ss[1], ss[2]);
        M.mul(PIV, TMP, g.shoe.m);
        g.shoe.cx = g.shoe.m[12]; g.shoe.cy = g.shoe.m[13]; g.shoe.cz = g.shoe.m[14];
      }
    }
    if (m.shadow) {
      const sm = m.shadow.m, cy = Math.cos(m.yaw), sy = Math.sin(m.yaw);
      const sw = Math.max(.72, m.wide * 2.25), sd = m.len * .76;
      sm[0] = cy * sw; sm[1] = 0; sm[2] = -sy * sw; sm[3] = 0;
      sm[4] = 0; sm[5] = 1; sm[6] = 0; sm[7] = 0;
      sm[8] = sy * sd; sm[9] = 0; sm[10] = cy * sd; sm[11] = 0;
      sm[12] = m.px; sm[13] = .021; sm[14] = m.pz; sm[15] = 1;
    }
    if (m.sol) {
      const cs = Math.abs(Math.cos(m.yaw)), sn = Math.abs(Math.sin(m.yaw));
      const hw = cs * m.wide + sn * m.len * .5;
      const hd = sn * m.wide + cs * m.len * .5;
      m.sol.x0 = m.px - hw; m.sol.x1 = m.px + hw;
      m.sol.z0 = m.pz - hd; m.sol.z1 = m.pz + hd;
      // Moving cycles brake for the body; only a genuinely stopped queue becomes a walk-around
      // obstacle. This avoids a fast collider shoving the player sideways while still removing the
      // old walk-through red-light queue.
      m.sol.open = m.stowed || m.v > .45;
    }
  }

  function stow(m) {
    if (m.stowed) return;
    m.stowed = true;
    const put = p => { p.m[12] = FARX; p.m[13] = FARY; p.cx = FARX; p.cy = FARY; };
    for (const r of m.rigid) put(r.p);
    for (const w of m.spokes) put(w.p);
    for (const c of m.cranks) put(c.p);
    for (const g of m.legs) { put(g.thigh); put(g.shin); put(g.shoe); }
    if (m.shadow) m.shadow.m[13] = FARY;
    if (m.sol) m.sol.open = true;
  }

  // ---------------------------------------------------------------- where one machine is
  //
  // Split out of the tick so the builder can call it once and put everything down in its starting
  // place: `finish()` reads the cull centre off whatever matrix a prop is holding when it runs.
  // `dt === 0` does the arithmetic without advancing anything.
  function step(m, t, dt) {
    const L = m.lane;
    const oldX = m.px, oldZ = m.pz;
    if (dt) {
      m.s += m.v * dt;
      if (m.s > L.len) m.s -= L.len; else if (m.s < 0) m.s += L.len;
      // Weave is distance-led, not wall-clock-led. A stopped rider therefore freezes the path phase
      // instead of sliding and steering sideways on motionless wheels at the signal.
      m.weaveT += dt * Math.min(1, m.v / Math.max(1.2, m.vFree));
      // A support foot begins descending as the machine rolls through walking pace instead of
      // switching on at one exact speed. Exponential damping keeps the same leg timing after a
      // 30, 60 or 120 Hz frame and cannot complete the move in one slow frame.
      const supports = m.kind === 'bike' || m.kind === 'moped';
      const stopTarget = supports ? 1 - smoothUnit((m.v - .10) / .45) : 0;
      m.stopK = damp(m.stopK, stopTarget, stopTarget > m.stopK ? 4.8 : 7.0, dt);
    }
    // The weave: two slow sines a couple of octaves apart, so the path never visibly repeats and
    // never looks like a sine wave either. A rider who does not weave is a rider on a rail, and
    // the give-away is that the whole flow stays in step with itself.
    const w = m.w, sw = L.sway, wt = m.weaveT;
    const s1 = Math.sin(wt * w[1] + w[2]), s2 = Math.sin(wt * w[4] + w[5]);
    const lat = (s1 * w[0] + s2 * w[3]) * sw;
    const dlat = (Math.cos(wt * w[1] + w[2]) * w[0] * w[1]
                + Math.cos(wt * w[4] + w[5]) * w[3] * w[4]) * sw;
    // The lean follows the sideways *acceleration*, not the sideways speed. Those are ninety
    // degrees out of phase on a weave, and using the speed stands the machine bolt upright at the
    // outside of every swing — the one moment it should be heeled hardest — and hardest over as it
    // crosses the middle going straight. Nobody can name what is wrong with it; everybody sees it.
    const along = L.cross + L.dir * m.s;
    // Optional authored squeeze support remains for other road contracts, but this street publishes
    // no squeeze: its 1.80 m platform/refuge is an independent strip and the complete 2.25 m cycle
    // track continues behind it without a lateral snap.
    let mid = L.off, j = 1, pinch = 0;
    const sq = L.sq;
    if (sq) {
      const out = Math.max(sq.a0 - along, along - sq.a1);
      const raw = 1 - Math.min(1, Math.max(0, out / 8.0));
      const k = raw * raw * (3 - 2 * raw);
      if (k > 0) { mid += (sq.to - mid) * k; j = 1 - k * (1 - sq.j); pinch = k; }
    }
    let across = mid + (lat + m.fan) * j;
    if (L.axis === 'z' && L.xMin !== undefined) {
      // Reserve handlebar/body width plus a turning allowance inside the paint. At the refuge the
      // east edge contracts to the island face, so even a leaning trike remains physically inside
      // the 1.5 m squeeze rather than merely keeping its centre line there.
      const lo = L.xMin + m.wide + .26;
      const edge = pinch > 0 && Number.isFinite(L.pinchEdge)
        ? L.xMax - pinch * (L.xMax - L.pinchEdge) : L.xMax;
      const hi = edge - m.wide - .26;
      across = lo <= hi ? Math.max(lo, Math.min(hi, across)) : (lo + hi) * .5;
    }
    if (L.axis === 'z') { m.pz = along; m.px = across; }
    else { m.px = along; m.pz = across; }
    // Heading. A lane along z with dir -1 points at π; one along x with dir +1 points at π/2.
    const base = L.axis === 'z' ? (L.dir > 0 ? 0 : Math.PI)
                                : (L.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    // `dlat` is metres of sideways per second; over the speed it is a slope, and the arctangent of
    // a slope is the direction the machine is actually pointing.
    const drift = Math.atan2(dlat, Math.max(1.2, m.v));
    // Which way "across" runs relative to "along" flips with both the axis and the direction, and
    // getting it wrong is a flow that steers out of its own weave instead of into it.
    const hand = (L.axis === 'z' ? 1 : -1) * L.dir;
    let nextYaw = base + drift * hand;
    if (dt && m.v > .04) {
      const dx = m.px - oldX, dz = m.pz - oldZ, moved = Math.hypot(dx, dz);
      // The complete path tangent includes the island deflection and filtering offset as well as
      // weave. Ignore the one large displacement at the recycle seam.
      if (moved > 1e-4 && moved < 3) nextYaw = Math.atan2(dx, dz);
    } else if (dt) nextYaw = m.yaw;
    if (L.axis === 'z') {
      // A road cycle can steer, but it cannot rotate broadside in one frame. Besides looking like
      // a crash, that makes a long trike's swept body cross both the kerb and lane line. The long,
      // eased island approach above never needs more than this ten-degree steering envelope.
      let roadTurn = nextYaw - base;
      while (roadTurn > Math.PI) roadTurn -= Math.PI * 2;
      while (roadTurn < -Math.PI) roadTurn += Math.PI * 2;
      nextYaw = base + Math.max(-.18, Math.min(.18, roadTurn));
    }
    let requestedTurn = nextYaw - m.yaw;
    while (requestedTurn > Math.PI) requestedTurn -= Math.PI * 2;
    while (requestedTurn < -Math.PI) requestedTurn += Math.PI * 2;
    // The route tangent can change abruptly when filtering or an island clamp consumes a lateral
    // step. It is a target, not permission for the complete rider to rotate in one frame. Ease the
    // wrapped error and cap it at an ordinary bicycle steering rate; steering and lean below use
    // the turn actually applied, so neither spikes in anticipation of a snap the body did not do.
    let turn = requestedTurn;
    if (dt) {
      turn *= 1 - Math.exp(-10 * dt);
      const maxTurn = 1.65 * dt;
      turn = Math.max(-maxTurn, Math.min(maxTurn, turn));
      m.yaw += turn;
    } else m.yaw = nextYaw;
    const steerTarget = dt && m.v > .18
      ? Math.max(-.34, Math.min(.34, Math.atan((turn / Math.max(dt, 1e-3)) * 1.06 / m.v)))
      : 0;
    m.steer = damp(m.steer, steerTarget, 9.0, dt || 1 / 60);
    // Lean comes from the actual heading change. It therefore follows island and queue steering too,
    // and eases upright once the machine has stopped and the support foot is on the ground.
    const leanTarget = dt && m.v > .08
      ? m.bias - Math.max(-.20, Math.min(.20, (turn / Math.max(dt, 1e-3)) * m.v / 9.81)) * m.tilt
      : m.bias;
    m.lean = damp(m.lean, leanTarget, 7.5, dt || 1 / 60);
    if (dt) {
      const circle = Math.PI * 2;
      m.spin = (m.spin + m.v * dt / m.wheelR) % circle;
      // Keep a nearly planted support foot from being yanked back onto a moving pedal on launch.
      // The crank resumes progressively as the foot comes home.
      if (m.gear)
        m.crank = (m.crank + m.v * dt * m.gear * (1 - .85 * m.stopK)) % circle;
    }
  }

  // ================================================================ the build
  function build(K) {
    // Its own seeded stream, so this district always builds the same street and adding a rider
    // here never shifts a colour four hundred lines away in somebody else's file.
    let seed = 20260418;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const pick = a => a[Math.min(a.length - 1, Math.floor(rnd() * a.length))];
    const C = K.C;

    SIG = roadSignal();
    // The lane centres, from the shell's own corrected contract first. `S.road` used to carry
    // `mid ± 2.6` — 29.90, which is inside the painted 非机动车道, and 35.10, which is a lane line
    // rather than a lane centre. It now carries the four measured ones and this district reads
    // those; the road district's signal is the second source and the literals the third, so a lane
    // centre is never guessed at.
    const LN = (K.road && K.road.bikeW) ? K.road : (SIG && SIG.lanes ? SIG.lanes : null);
    const IS = SIG && SIG.island ? SIG.island : FALLBACK.island;
    const BP = SIG && SIG.busPlatform ? SIG.busPlatform : null;
    // The front tyre is measured against the painted bar in the tick. Keeping the target itself on
    // the shared road contract avoids the two-metre disagreement the old centre-based offset caused.
    const SL = SIG && SIG.stopLine ? SIG.stopLine : null;
    const STOP_FLOW = SL ? SL.north : FALLBACK.stop.flow;
    const STOP_RETURN = SL ? SL.south : FALLBACK.stop.wrong;
    // One centre in each painted cycle track. The west stream travels +z and the east stream -z,
    // keeping moving bicycles out of both footways and out of the motor lanes.
    const OFF_FLOW = LN ? LN.bikeW - .20 : FALLBACK.lane.bikeW;
    // Hold the moving line 22 cm inside the painted centre. Its handlebar envelope then retains
    // visible air from the kerb and the separate footway furnishing bay.
    const OFF_RETURN = (LN && Number.isFinite(LN.bikeE) ? LN.bikeE : 36.295) - .22;

    const COATS = ['#2a3646', '#39423a', '#5a4a42', '#7d2f2c', '#3d4f5c', '#8a7f6a',
                   '#2f3f3a', '#b0472f', '#4a4358', '#d9d3c4'].map(C);
    const TROUSERS = ['#2b2f36', '#39343a', '#4a4a50', '#2f3a44', '#5b5148'].map(C);
    const FRAMES = ['#2f86bd', '#d9662f', '#4c8a86', '#33383d', '#7a4630',
                    '#3f6d55', '#7b8288', '#9d3728'].map(C);
    const SKINS = ['#e4b08d', '#d79f7c', '#eeba98', '#c98f6b'].map(C);
    const FOOD = C(OPS[1].hex);                       // 外卖 jacket-and-box colour

    // ------------------------------------------------ the lanes
    //
    // Recycling runs far beyond the road's declared walk zone (S.road.z0..z1 = ±13.5), because a
    // bicycle that vanishes at thirteen — or beside the hotel at forty-eight — vanishes in sight.
    const RZ1 = 96, RZ0 = -RZ1, RLEN = RZ1 - RZ0;
    // The protected island is now an independent 1.80 m strip. Both cycle tracks retain their
    // complete width at the platform and refuge, so no squeeze target or artificial lateral swing
    // exists in the route.
    const BW0 = SIG && SIG.laneEdges ? SIG.laneEdges.bikeW[0] : 25.42;
    const BW1 = SIG && SIG.laneEdges ? SIG.laneEdges.bikeW[1] : 27.67;
    const BE0 = SIG && SIG.laneEdges ? SIG.laneEdges.bikeE[0] : 35.17;
    const BE1 = SIG && SIG.laneEdges ? SIG.laneEdges.bikeE[1] : 37.42;
    const lane = (axis, dir, off, len, cross, stop, spread, sway, sq) => {
      const L = { axis, dir, off, len, cross, stop, spread, sway, sq: sq || null,
                  list: [], live: [] };
      lanes.push(L); return L;
    };
    // `s` runs 0 at the entry end to `len` at the exit end whichever way round that is, so "the one
    // in front" is always the one with the larger s and the follow model never has to know which
    // way it is pointing.
    const flow  = lane('z', +1, OFF_FLOW,  RLEN, RZ0, STOP_FLOW - RZ0,  .30, 1);
    flow.xMin = BW0; flow.xMax = BW1;
    const returnFlow=lane('z',-1,OFF_RETURN,RLEN,RZ1,RZ1-STOP_RETURN,.18,.45);
    returnFlow.xMin=BE0;returnFlow.xMax=BE1;
    const born = [];
    function add(L, s, kind, o, spec) {
      const m = machine(K, kind, o);
      m.lane = L; m.s = s; m.v = spec.v; m.vFree = spec.v; m.len = spec.len;
      m.gap = spec.gap; m.acc = spec.acc; m.brake = spec.brake; m.rank = spec.rank;
      m.spin = rnd() * 6.28; m.crank = rnd() * 6.28;
      m.w = [.10 + rnd() * .12, .50 + rnd() * .45, rnd() * 6.28,
             .025 + rnd() * .030, 1.2 + rnd() * .7, rnd() * 6.28];
      m.fan = 0; m.yaw = 0; m.lean = 0; m.steer = 0; m.px = 0; m.pz = 0; m.stowed = false;
      m.weaveT = rnd() * 18; m.stopK = 0;
      m.sol = K.solid(0, 0, -900, -900); m.sol.open = true;
      m.shadow = K.shade(0, -900, Math.max(.72, m.wide * 2.25), m.len * .76, .22);
      L.list.push(m); all.push(m); born.push(m);
      return m;
    }
    const MOPED = { len: 2.00, gap: 2.45, acc: 2.4, brake: 4.6 };
    const BIKE  = { len: 1.76, gap: 2.25, acc: 1.6, brake: 3.2 };
    const dress = () => ({
      frame: pick(FRAMES), coat: pick(COATS), trouser: pick(TROUSERS), skin: pick(SKINS),
      basket: rnd() < .55, basketCol: rnd() < .5 ? C(HX.steelD) : C(HX.wicker),
      build: .92 + rnd() * .16, hairStyle: Math.floor(rnd() * 3),
    });

    // ---- on the road. The return bicycle starts more than ninety metres from the delivery moped,
    // in the opposite painted track. They therefore provide two directions of life without an
    // authored title/crossing cohort, and both use the already accepted open-ring machine builder.
    add(flow, .35 * RLEN, 'moped', { ...dress(), frame: C(HX.charcoal), coat: FOOD,
      helmet: FOOD, food: FOOD }, { ...MOPED, v: 6.4 + rnd() * .8, rank: .06 });
    add(returnFlow,.18*RLEN,'bike',{...dress(),frame:C('#3f6d55'),basket:true},
      {...BIKE,v:4.4+rnd()*.5,rank:.10});
    // ------------------------------------------------ 共享单车, in a marked kerbside bay
    //
    // The rack and two dumped bikes used to occupy the west footway. They now stand parallel to the
    // east kerb in its furnishing band, 35 cm beyond the live cycle edge. Their collider ends at
    // x38.45, leaving 3.03 m of building-side pavement to the x41.48 frontage. The address opposite
    // the south civic frontage is also clear of the z4.5 lamp, z6 tree, z6.4 gantry and their swept
    // maintenance footprints; the old z4.55..10.47 rank intersected all three.
    // Three machines at 2.60 m centres read as individual parked addresses, not a tyre wall. The
    // 1.30 m-long bicycle envelopes retain about 1.30 m of visible air between neighbours.
    const RKX = 38.10, RK0 = -50.60, RKSTEP = 2.60, RKN = 3, WORD = { tag: '自行车' };
    for (let i = 0; i < RKN; i++) {
      const z = RK0 + i * RKSTEP, op = OPS[i % 2];
      const b = machine(K, 'bike', { frame: C(op.hex), skin: SKINS[0], noRider: true,
        basket: true, basketCol: C(op.hex) });
      b.px = RKX; b.pz = z; b.yaw = i % 2 ? .035 : -.025;
      b.lean = i % 2 ? .045 : -.035; b.spin = 0; b.crank = 0;
      place(b);
      K.shade(RKX, z, .78, 1.45, .24);
    }
    const RKC = RK0 + RKSTEP * (RKN - 1) / 2;
    K.box(RKX + .23, .20, RKC, .10, .12, RKSTEP * (RKN - 1) + 1.20, C(OPS[0].hex),
      { hard: true, gloss: .34, ...WORD });
    K.box(RKX + .23, .07, RKC, .17, .10, RKSTEP * (RKN - 1) + 1.20, C(HX.steelD),
      { hard: true, gloss: .34 });
    // The operator board faces the east footway, where the player reads it from across the kerb.
    K.cyl(RKX + .12, 1.05, RK0 - .72, .045, 2.10, C(HX.steelD), { gloss: .44, ...WORD });
    K.box(RKX + .18, 1.86, RK0 - .72, .05, .40, .80, C(OPS[0].hex),
      { hard: true, gloss: .38, ...WORD });
    K.glyphs(RKX + .205, 1.86, RK0 - .72, Math.PI / 2, OPS[0].name,
      { size: .19, gap: .035, color: C(HX.board), gloss: .12, lift: .012, ...WORD });
    K.solid(RKX - .33, RKX + .35, RK0 - .72, RK0 + RKSTEP * (RKN - 1) + .72);
    K.thing('自行车', RKX + .16, 1.10, RKC, '这些共享单车扫码就能骑。',
      'You can scan the code on these shared bikes and ride off.',
      '共享单车 gòngxiǎng dānchē — shared bikes. 扫码 sǎomǎ is scanning the code on the frame.',
      { focus: [39.12, RKC], reach: 2.4 });

    for (const m of born) { step(m, 0, 0); place(m); }
    if (K.seal) K.seal();
  }

  // ================================================================ the toolkit, both ways in
  //
  // The real one, off the shell's `S`. Only the eleven calls this district makes, so the fallback
  // below has eleven things to reproduce and not the whole of `Build.scene`.
  function kitOf(S) {
    return {
      C: S.C, box: S.box, cyl: S.cyl, ball: S.ball, cap: S.cap, taper: S.taper,
      glyphs: S.glyphs, solid: S.solid, shade: S.shade, thing: S.thing,
      AX0: S.AX0, AX1: S.AX1, road: S.road, seal: null, count: null,
    };
  }

  // ---------------------------------------------------------------- the way in when S is dead
  //
  // Everything below exists only because of the street.js temporal-dead-zone bug in the ticket at
  // the top of this file. It rebuilds the eleven calls above on top of the *finished* scene, and
  // — this is the part that matters on a fill-rate-bound street — it joins the batches `finish()`
  // already made instead of adding its own. A district appended after `finish` with no batching
  // costs one draw call per prop, which for hundreds of bicycle parts is the exact regression
  // `44-parade` exists to catch. Delete this block the day street.js declares S before build().
  const deferredWords = [];
  function lateKit() {
    let sc = null;
    try { sc = (typeof Street === 'undefined') ? null : Street; } catch (_) { return null; }
    if (!sc || !sc.props || !sc.solids || typeof M === 'undefined') return null;
    const mine = [];
    const put = p => {
      const m = p.m;
      p.cx = m[12]; p.cy = m[13]; p.cz = m[14];
      p.r = .5 * Math.hypot(Math.hypot(m[0], m[1], m[2]), Math.hypot(m[4], m[5], m[6]),
                            Math.hypot(m[8], m[9], m[10]));
      sc.props.push(p); mine.push(p); return p;
    };
    const xform = (x, y, z, sx, sy, sz, o) => {
      let r = M.ident();
      if (o.ry) r = M.mul(r, M.rotY(o.ry));
      if (o.rx) r = M.mul(r, M.rotX(o.rx));
      if (o.rz) r = M.mul(r, M.rotZ(o.rz));
      return M.mul(M.trans(x, y, z), M.mul(r, M.scale(sx, sy, sz)));
    };
    const shape = (mesh, x, y, z, sx, sy, sz, color, o = {}) =>
      put({ mesh, m: xform(x, y, z, sx, sy, sz, o), color,
            ob: { x, y, z, ry: o.ry || 0, sx, sy, sz }, ...o });
    return {
      C,
      box: (x, y, z, sx, sy, sz, c, o = {}) =>
        shape(o.hard ? 'box' : 'softBox', x, y, z, sx, sy, sz, c, o),
      cyl: (x, y, z, r, h, c, o = {}) => shape('cyl', x, y, z, r * 2, h, r * 2, c, o),
      ball: (x, y, z, rx, ry, rz, c, o = {}) =>
        shape('ball', x, y, z, rx * 2, ry * 2, rz * 2, c, o),
      cap: (x, y, z, sx, sy, sz, c, o = {}) => shape('capsule', x, y, z, sx, sy, sz, c, o),
      taper: (x, y, z, sx, sy, sz, c, o = {}) => shape('taper', x, y, z, sx, sy, sz, c, o),
      glyphs(x, y, z, yaw, text, o = {}) {
        const size = o.size || .26, gap = o.gap === undefined ? size * .14 : o.gap;
        const chars = [...Glyphs.need(text)];
        const step2 = size + gap, span = chars.length * step2 - gap;
        const lift = o.lift === undefined ? .012 : o.lift, out = [];
        chars.forEach((ch, i) => {
          if (ch === ' ') return;
          const t = -span / 2 + step2 * (i + .5);
          const ox = o.vertical ? 0 : t, oy = o.vertical ? -t : 0;
          const mm = M.mul(M.trans(x, y, z), M.mul(M.rotY(yaw),
            M.mul(M.trans(ox, oy, lift), M.mul(M.rotX(Math.PI / 2), M.scale(size, 1, size)))));
          out.push(put({ mesh: 'quad', m: mm, color: o.color, ch,
            mode: o.mode === undefined ? 0 : o.mode,
            gloss: o.gloss === undefined ? .10 : o.gloss,
            glow: o.glow || 0, alpha: o.alpha === undefined ? 1 : o.alpha, tag: o.tag }));
        });
        return out;
      },
      solid(x0, x1, z0, z1) {
        const s = { x0, x1, z0, z1, open: false }; sc.solids.push(s); return s;
      },
      shade(x, z, w, d, a = .42, y = .020) {
        const s = { m: M.trs(x, y, z, 0, w, 1, d), a };
        sc.shadows.push(s); return s;
      },
      // The one thing the late path cannot do. game.js is inside an IIFE, so the hook it keeps for
      // a thing that arrives after a room has been adopted is not reachable, and a thing pushed
      // straight into `scene.things` has no label element — the frame loop reads `th.el` on every
      // thing it draws and takes the game down on the first frame. So the word is deferred. It
      // comes back on its own the moment street.js declares S before it calls build.
      thing(hz, x, y, z, sentence, tr, note, o = {}) {
        deferredWords.push(hz);
        return { hz, pos: [x, y, z], sentence, tr, note, tag: o.tag || hz,
                 focus: o.focus || [x, z], reach: o.reach || 1.5 };
      },
      AX0: -27.0, AX1: 25.5,             // street.js:117, the alley extent
      road: { bikeW: 26.545, south: 31.07, north: 33.92, bikeE: 36.295 },
      count: () => mine.length,
      // Join the batches `finish()` already built rather than making new ones. Every prop here is
      // a plain mesh with no texture, no material and the default corner radius, which is exactly
      // the key half a dozen of the shell's own batches already carry — so the bicycle
      // parts cost their instance rows and not one extra draw call.
      seal() {
        if (!sc.batches) sc.batches = [];
        const fresh = new Map();
        for (const p of mine) {
          if (p.ch || (p.alpha !== undefined && p.alpha < .999)) { p.batch = null; continue; }
          const mesh = p.mesh || 'box', mode = p.mode || 0;
          let hit = null;
          for (const b of sc.batches) {
            const q = b.opt;
            if (b.mesh !== mesh || (q.mode || 0) !== mode) continue;
            if (q.round !== undefined || q.bevel !== undefined) continue;
            if (q.tex || q.mat || q.nrm || q.matScale) continue;
            if (q.matAmt !== undefined || q.nrmAmt !== undefined) continue;
            hit = b; break;
          }
          if (!hit) {
            const key = mesh + '|' + mode;
            hit = fresh.get(key);
            if (!hit) {
              hit = { mesh, props: [], opt: { mode } };
              fresh.set(key, hit); sc.batches.push(hit);
            }
          }
          hit.props.push(p); p.batch = hit;
        }
        // A batch of one is a draw call either way and costs an instance upload on top.
        for (const b of fresh.values())
          if (b.props.length <= 1) {
            for (const p of b.props) p.batch = null;
            const i = sc.batches.indexOf(b); if (i >= 0) sc.batches.splice(i, 1);
          }
        try { if (typeof R === 'object' && R && R.setAtlas) Glyphs.upload(); } catch (_) {}
      },
    };
  }

  // Distance from one rider's front envelope to a world-space obstacle, measured along that
  // rider's lane. Infinity means it is beside or behind the machine and cannot constrain it.
  function obstacleGap(m, ox, oz, halfAlong, halfAcross) {
    const L = m.lane;
    const fx = L.axis === 'z' ? 0 : L.dir, fz = L.axis === 'z' ? L.dir : 0;
    const dx = ox - m.px, dz = oz - m.pz;
    const along = dx * fx + dz * fz - m.len * .5 - halfAlong;
    const across = Math.abs(dx * -fz + dz * fx);
    if (along < -m.len || along > 28 || across > m.wide + halfAcross + .10) return Infinity;
    return along;
  }

  function trafficGap(m) {
    let best = Infinity, st = null;
    try { st = StreetFit['traffic'] && StreetFit['traffic'].state; } catch (_) {}
    if (!st) return best;
    const zLane = m.lane.axis === 'z';
    for (const v of st.V) {
      if (v.still && v.sol && v.sol.open) continue;
      const ry = v.base + (v.yaw || 0), cs = Math.abs(Math.cos(ry)), sn = Math.abs(Math.sin(ry));
      const hz = (cs * v.len + sn * v.wid) * .5;
      const hx = (sn * v.len + cs * v.wid) * .5;
      const g = obstacleGap(m, v.x0 + v.xoff, v.sgn * v.u, zLane ? hz : hx, zLane ? hx : hz);
      if (g < best) best = g;
    }
    return best;
  }

  // Alley machines also respect the scene's authored solids. The road streams have dedicated
  // signal, bus and player rules; scanning the scene only for the lone hutong rider keeps shop
  // steps, stalls and newly-added street furniture from becoming things a bicycle ghosts through
  // without turning every road rider into an expensive all-solids query.
  function sceneGap(m) {
    if (m.lane.axis !== 'x') return Infinity;
    let sc = null;
    try { sc = typeof Street === 'undefined' ? null : Street; } catch (_) {}
    if (!sc || !sc.solids) return Infinity;
    let best = Infinity;
    for (const s of sc.solids) {
      if (!s || s === m.sol || s.open) continue;
      const hw = (s.x1 - s.x0) * .5, hd = (s.z1 - s.z0) * .5;
      const g = obstacleGap(m, (s.x0 + s.x1) * .5, (s.z0 + s.z1) * .5, hw, hd);
      if (g < best) best = g;
    }
    return best;
  }

  // ================================================================ the tick
  function tick(t, body, mins) {
    if (!built) {
      const k = lateKit();
      if (!k) return;
      built = true;                       // one attempt; a second would double the whole flow
      try { build(k); StreetFit['cycles'].propCount = k.count(); }
      catch (e) { console.error('street-cycles late build: ' + (e && e.message)); }
    }
    if (hidden) {
      for (const m of all) stow(m);
      lastT = t;
      return;
    }
    const dt = lastT < 0 ? 0 : Math.min(.12, t - lastT);
    lastT = t;

    // How busy the street is. Both protected-track riders run through the day and peaks. No bicycle
    // person is authored on a pedestrian/shared surface. A machine outside the density envelope is
    // stowed and skipped entirely.
    let density = .58, dark = 0;
    if (mins !== undefined) {
      const h = (mins / 60) % 24;
      if ((h >= 7 && h < 9.5) || (h >= 17 && h < 19.5)) density = .78;
      else if (h >= 22.5 || h < 5.5) density = .16;
      else if (h < 6.5 || h >= 21) density = .34;
      // Lit by 19:15, out again by 06:00, with a ramp either side so a headlight does not snap on
      // between one frame and the next.
      dark = h > 12 ? Math.max(0, Math.min(1, (h - 17.4) / 1.8))
                    : 1 - Math.max(0, Math.min(1, (h - 5.4) / 1.6));
    }
    const liveSignal = SIG || roadSignal();
    StreetFit['cycles'].state.emergencyActive = !!(liveSignal && liveSignal.emergency &&
      liveSignal.emergency.active(t));
    const phase = phaseNow(t), hold = phase !== 'green';

    for (const L of lanes) {
      // Who is in the flow this hour, in order. The sort is what lets a queue at the lights build
      // from the front instead of every rider braking on its own. The current sparse flow makes
      // this cheap, and preserving the ring rule prevents future additions regressing the seam.
      const live = L.live;
      live.length = 0;
      for (const m of L.list) {
        if (m.rank > density) { stow(m); continue; }
        m.stowed = false;
        live.push(m);
      }
      live.sort(FRONT_FIRST);
      for (let i = 0; i < live.length; i++) {
        const m = live[i];
        let want = m.vFree, hardGap = Infinity, bodyGap = Infinity;
        // A ring, not a queue: the one in front of the leader is the one at the far end of the
        // lane, which is where the leader meets it after it recycles. Without the wrap the fastest
        // 电动车 in the lane drives through the back of the flow at the seam — far out in
        // the haze, which is exactly where nobody would think to look for it.
        const lead = live.length > 1 ? live[i === 0 ? live.length - 1 : i - 1] : null;
        if (lead) {
          const gap = lead.s - m.s - (m.len + lead.len) * .5 + (i === 0 ? L.len : 0);
          hardGap = Math.min(hardGap, gap);
          want = Math.min(want, Math.max(0, (gap - m.gap) * 1.55));
        }
        // The 红绿灯. Really only the leader sees it; everybody else is already stopping behind
        // somebody who is.
        if (L.stop !== null && hold) {
          const d = L.stop - m.s - m.len * .5;
          const dilemma = phase === 'amber'
            && d < m.v * .9 + (m.v * m.v) / Math.max(.1, 2 * m.brake) + .35;
          // Once the front wheel has committed across the paint it continues through the junction;
          // stopping a rider on the zebra when amber turns red was the most visible zombie-like
          // behaviour in this controller.
          // `.22` is the resting reserve, not the commitment line. Keep holding through tiny
          // integration round-off anywhere before the paint; only a front wheel genuinely beyond
          // the stop line (`d <= 0`) is committed and allowed to clear the junction.
          if (d > 0 && d < 26 && !dilemma) {
            hardGap = Math.min(hardGap, d + m.gap - .22);
            want = Math.min(want, Math.max(0, (d - .22) * 1.35));
          }
        }
        // The player is a real road user. Keep a complete three-metre standing/turning pocket in
        // front of the body, not merely a collision-sized gap. This matters most at HOME_OUT, the
        // lock-ups and metro2, but applying it consistently also prevents a road rider from
        // flanking the player on the zebra. The single alley start is authored outside every
        // sensitive pocket, so a fresh establishing view never begins with a trapped rider.
        if (body && Number.isFinite(body.x) && Number.isFinite(body.z)) {
          // A person reading one of the lock-up fronts stands near the north wall, outside the
          // bicycle's collision-width corridor but still inside the same tiny public room. Treat
          // the full alley section as shared space so the rider waits before that view instead of
          // slicing through its middle; road tracks retain the physical-width lateral test.
          const gap = obstacleGap(m, body.x, body.z, .36, L.axis === 'x' ? 3.0 : .36);
          if (Number.isFinite(gap)) {
            hardGap = Math.min(hardGap, gap);
            bodyGap = Math.min(bodyGap, gap);
            want = Math.min(want, Math.max(0, (gap - 3.20) * 1.55));
          }
        }
        // Every traffic vehicle is tested so an unusual stalled or deflected vehicle is respected.
        // The protected-stop bus normally remains far enough inside its motor lane to be irrelevant.
        let obstacle = trafficGap(m);
        if (Number.isFinite(obstacle)) {
          hardGap = Math.min(hardGap, obstacle);
          want = Math.min(want, Math.max(0, (obstacle - m.gap) * 1.55));
        }
        obstacle = sceneGap(m);
        if (Number.isFinite(obstacle)) {
          hardGap = Math.min(hardGap, obstacle);
          want = Math.min(want, Math.max(0, (obstacle - m.gap) * 1.55));
        }
        const dv = want - m.v;
        m.v += dv > 0 ? Math.min(dv, m.acc * dt) : Math.max(dv, -m.brake * dt);
        if (dt && Number.isFinite(hardGap)) {
          // Ordinary leaders retain the authored machine gap. A player owns the larger 3.20 m
          // standing/turning pocket promised above; the prior cap ignored that reserve and allowed
          // braking inertia to carry a moped down to its ordinary 2.45 m following distance.
          let free = Math.max(0, hardGap - m.gap);
          if (Number.isFinite(bodyGap)) free = Math.min(free, Math.max(0, bodyGap - 3.20));
          if (m.v * dt > free) m.v = free / dt;
        }
        if (m.v < .01) m.v = 0;
        // Keep the current singleton lanes centred. The filtering seat remains future-safe for a
        // later second rider, but one bicycle must not drift sideways as if making room for a queue
        // that this deliberately sparse release does not build.
        const still = 1 - Math.min(1, m.v / 2.0);
        const seat = live.length > 1 ? ((i % 3) - 1) * L.spread : 0;
        if (m.v > .18)
          m.fan = damp(m.fan, seat * still, m.v * 1.35, dt);
        step(m, t, dt);
        place(m);
      }
    }

    // Lamps last, and only when the number has moved: writing every lamp each frame for a value
    // that changes twice a day is needless work.
    if (dark !== dark0) {
      dark0 = dark;
      for (const m of all)
        for (let i = 0; i < m.lamps.length; i++) m.lamps[i].glow = dark * (i === 0 ? .55 : .40);
    }
  }

  // ================================================================ registration
  StreetFit['cycles'] = S => {
    built = true;                                   // and so the tick never late-builds on top
    const n0 = S.props.length;
    build(kitOf(S));
    StreetFit['cycles'].propCount = S.props.length - n0;   // read it for the perf canary
  };
  StreetFit['cycles'].tick = tick;
  StreetFit['cycles'].show = on => { hidden = !on; };
  StreetFit['cycles'].state = { lanes, all, emergencyActive:false };
  // Empty once street.js declares S before it calls build; anything in it is a word this district
  // built the sign for but could not put in the dictionary.
  StreetFit['cycles'].deferredWords = deferredWords;
})();
