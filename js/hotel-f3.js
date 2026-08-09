// 🏨 京华大酒店 · Floor 3 — the interior architecture
//
// This floor's own module. Registered into HotelFit (declared in js/hotel.js). Nothing else in
// the build writes to this file, and you must not write to anyone else's.
//
// Programme for this level, from HOTEL.md:
//   ballroom, pre-function gallery, wedding salon, meeting rooms and business centre
//
// ---------------------------------------------------------------------------------------------
// WHY THIS FILE EXISTS
//
// The fit-out modules furnished all thirteen levels and furnished them well. What nobody built
// was the building. Measured with the scene's own `clampMove` at the real 0.30 m body radius,
// every authored level is ONE connected walkable region of roughly 950 m² — a 44 m x 30 m hall
// with furniture standing in it. There are no room walls, no doorways and no corridors anywhere
// in the hotel.
//
// On some floors the plan already exists, but only as camera metadata. js/hotel.js:637 registers
// `hotel5-room501`, `hotel5-room502`, `hotel5-room503`, `hotel5-bath503`, `hotel5-linen`,
// `hotel5-guest-corridor` and `hotel5-lift-landing` with exact rectangles, and says outright that
// they "do not alter walking/collision zones". hotel-f6/f7/f9.js call `cameraRoom(...)` the same
// way. So the camera believes in rooms the player walks straight through.
//
// Your job is to make the plan real: partitions, door openings, reveals, jambs, thresholds and
// the collision that makes them mean something — and to leave the floor legible, not mazy.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   scene key   hotel3
//   shell       RX 22, RZ 15, H 4.35  (the plate is 44 m x 30 m x 4.35 m — A.RX / A.RZ / A.H)
//   lift bank   x 18.15, cars at z -7.20 / -3.70 / -0.20, service car z 5.10
//   landing     [16.15, -3.70]        — where the player arrives from the lift
//   stairs      x -18.0, z -7.1, landing [-16.0, -7.1]
//   spawn       [15.6, -3.70] facing -x   (on floor 1 it is the entrance, [0, -12.55])
//   route       A.route — passenger / service / stair anchors and the guest spine
//
// **Every one of those has to stay reachable.** The lift landing, the stair landing and the guest
// spine are the floor's skeleton; a partition that seals any of them off strands the player on a
// level they cannot leave.
//
// ---------------------------------------------------------------------------------------------
// THE TOOLKIT
//
// Your builder is called with `A`, and it is the same `A` the fit-out module got:
//
//   geometry    A.box A.cyl A.ball A.capsule A.taper A.flat A.glyphs A.shade A.glow A.thing
//   collision   A.solid(x0, x1, z0, z1)  — THE ONLY THING THAT STOPS A BODY. Note it takes
//               EXTENTS, not centre+size, and it is a 2D footprint: no height, no rotation.
//   camera      A.blocker(x0, x1, z0, z1, top)  — stops the CAMERA sliding through a mass.
//               Not collision. Every surface is single-sided, so without it the eye sees
//               straight through your wall from the far side.
//   colour      A.col (wall wallD ceiling stone stoneL dark accent bronze bronzeD bronzeL walnut
//               walnutL lacquer celadon jade ink glass glassD warm white steel red green water
//               carpet), A.C('#rrggbb') for anything else
//   shell       A.RX A.RZ A.H A.floor A.meta A.levels A.departments A.core A.route
//   motion      A.onTick(fn)  — scene-local, dispatched once a frame. Do not start your own timer.
//   light       A.light(...)  A.luminous(p, day, night)  — night dimming is handled for you
//   camera      A.cameraRoom(id, x0, x1, z0, z1, near) — register the room you just BUILT, so the
//               chase camera stops clipping through it. Nested rooms register BEFORE the room
//               that contains them, so the smallest authored volume wins.
//
// THE COLLISION TRAP — read this twice, it is the one that wastes a whole run.
//
// `hard:true` does NOT make a collider. build.js:48 uses it only to pick the sharp-edged
// 'box' mesh instead of the rounded 'softBox' — it is a silhouette flag for architectural
// trim, and nothing in clampMove has ever looked at it. A partition built with box(...,
// {hard:true}) alone is a wall you walk straight through: exactly the defect you are here
// to fix, rebuilt by hand.
//
// There is no `wall` primitive. A partition is TWO calls, and you need both:
//
//     A.box(cx, cy, cz, w, h, d, colour, { hard: true });   // what you SEE (centre + size)
//     A.solid(x0, x1, z0, z1);                              // what STOPS you (extents!)
//
// Mind the argument shapes — box takes a centre and a size, solid takes a min/max footprint.
// Mixing them up puts the collider somewhere the wall is not, and the flood fill will show it
// as a blockage in open floor with a walk-through wall beside it.
//
// A DOORWAY IS NOT A GAP IN THE GEOMETRY. `solid` has no height and no opening, so the way to
// make a door is to split the run into two solids with clear space between them, and hang the
// head/lintel above as geometry with no solid of its own:
//
//     A.solid(-8.00, -2.55, 4.90, 5.10);   // wall, west of the door
//     A.solid(-1.45,  6.00, 4.90, 5.10);   // wall, east of the door   -> a 1.10 m opening
//
// Give the wall real thickness (0.12–0.20 m reads right), a head over each opening, and a
// jamb/reveal so it is not a card standing on the floor. Add A.blocker(...) on the same
// footprint so the chase camera cannot slide through it, and A.cameraRoom(...) for the room
// you have just enclosed.
//
// ---------------------------------------------------------------------------------------------
// THE ONE RULE THAT MATTERS: NEVER PLACE A WALL OR A DOOR BY EYE
//
// `clampMove` inflates every collider by the 0.30 m body radius, so a doorway needs about 0.60 m
// of clear run before a body fits through it at all, and appreciably more before it feels like a
// door rather than a squeeze. A 0.90–1.10 m clear opening is the number to aim for.
//
// The proof is a flood fill, never a coordinate. Run this before you build and after every wall
// you add:
//
//     node /private/tmp/claude-501/-Users-jonahcollins-Desktop-Chinesegame/a3cc9bcf-53f0-4e3d-a6a3-24cb996ed8a1/scratchpad/floorprobe.js hotel3 -22 22 -15 15 15.6 -3.7
//
// It floods from the lift landing and prints an ASCII map: `.` reachable, `o` standable but
// WALLED OFF, `#` blocked. Two failure modes, both of which pass a screenshot:
//
//   * any `o` cell  — floor the player can see and can never stand on. Always a bug.
//   * a room that is all `#` — you built a solid block, not a room. Also always a bug.
//
// A finished floor is several `.` regions joined by door-width necks, all still reachable from
// the lift landing at [15.6, -3.70], with zero `o`.
//
// ---------------------------------------------------------------------------------------------
// FRAME RATE — you have room, and you should spend it
//
// Measured on the real GPU at quality 高: this floor renders in roughly 4.5–5.5 ms median and
// 8–10 ms at p95, against a 16.7 ms budget for 60 fps, at about 80 draw calls. That is six to
// eight milliseconds of genuine headroom, and partitions BUY frame time back by occluding what is
// behind them. Build the architecture properly.
//
// Spend it well anyway. Props batch by mesh + mode + round + bevel + textures; **colour, gloss,
// alpha and glow travel per instance and are free**, so fifty differently-coloured boxes of the
// same size are one draw call. Anything with `alpha < 0.999` does **not** batch and costs a draw
// call each — glazing, water and anything see-through is the expensive category, so a screen wall
// of forty translucent panes is forty calls. Keep this floor under about 2,600 props.
//
// **Do NOT run `node .fpscheck.js`.** It takes the whole GPU exclusively and there are thirteen
// of you; a timing run beside twelve other renders is not a slow reading, it is a meaningless
// one. The frame-rate gate is run centrally at the end. `node .audit.js <shot>` is fine.
//
// ---------------------------------------------------------------------------------------------
// HOUSE RULES
//
//   * **No real brand names or logos, ever.** Invented Chinese names only, everywhere, including
//     art, signage and packaging. The hotel is 京华大酒店 and that is the only fixed name.
//   * Signs are bilingual where a real luxury hotel would be; Chinese stays primary. Call
//     `Glyphs.need('...')` for any character you write, or it renders blank.
//   * Do not edit js/hotel.js, js/hotel-lift.js, js/game.js, js/gl.js, index.html, or any other
//     floor's module. If you need something the shell does not give you, report it — do not reach.
//   * `node --check js/hotel-f3.js` after every edit. A backtick inside a template literal
//     ends the string mid-statement; that has broken this project three times.
//
// ---------------------------------------------------------------------------------------------

// THE PLAN  (every figure below is a SOLID face, so it is the number clampMove actually sees)
//
//   宴会厅 京华一厅   main ballroom      x -15.60 .. 3.15    z -0.25 .. 14.70    ~277 m²
//   宴会厅 京华二厅   junior hall        x -21.70 .. -15.60  z -0.25 .. 14.70     ~91 m²
//   活动隔墙          operable partition x -15.60,  z -0.15 .. 13.30, twelve top-hung leaves
//   宴会前厅          pre-function       x -21.70 .. 12.49   z -5.52 .. -0.25  + east limb
//   京华雅集          south art bay      x -4.10 .. 5.95     z -14.70 .. -5.52
//   婚礼沙龙          wedding salon      x 3.38 .. 12.05     z 0.81 .. 6.72
//   会议前厅          meeting lobby      x 3.38 .. 12.14     z 6.90 .. 8.51
//   会议一 / 会议二   meeting rooms      z 8.69 .. 13.36
//   会议三 / 会议四   meeting rooms      x -13.90 .. -4.10   z -14.70 .. -5.61
//   商务中心          business centre    x 5.95 .. 12.40     z -14.70 .. -5.61
//   楼梯厅·宴会家具库 stair + store      x -21.70 .. -13.90  z -14.70 .. -5.61
//
// Both ballroom halls keep their own door off the gallery, so the flood fill passes with the
// operable wall closed AND open. That is deliberate: a partition that strands a hall when shut
// is a bug that only appears half the time.

const HotelF3 = (() => {
  // 'cycle' runs the operable wall on a deterministic programme; 'closed' / 'open' pin it, which
  // is how each state was flood-filled during verification.
  const PARTITION_MODE = 'cycle';

  try {
    Glyphs.need('宴会厅京华一二三四厅活动隔墙宴会前厅婚礼沙龙会议前厅会议室商务中心' +
      '楼梯厅宴会家具库京华雅集安全出口疏散通道员工通道备餐间宴会服务门厅圆桌椅具' +
      '布草推车讲台舞池灯光音响控制室洽谈展陈廊主宾席');
  } catch (_) {}

  HotelFit.register('hotel3', A => {
    const { box, cyl, ball, capsule, taper, flat, glyphs, solid, blocker, shade, glow, thing } = A;
    const { C, col, RX, RZ, H } = A;
    const { light, luminous, onTick, cameraRoom } = A;
    const props0 = A.B.props.length;

    const P = {
      limestone:C('#c2b7a2'), limestoneL:C('#cec6b8'), limestoneD:C('#a99b86'),
      walnut:C('#493329'), walnutL:C('#76513c'), walnutD:C('#2c211d'),
      bronze:C('#a7783e'), bronzeL:C('#d5aa68'), bronzeD:C('#62452c'),
      lacquer:C('#922f28'), celadon:C('#7f9f8f'), celadonL:C('#a9bcb0'),
      jade:C('#3f6d5e'), ink:C('#202527'), silk:C('#c1a48f'), silkRose:C('#a66e68'),
      warm:C('#ffe1a3'), cream:C('#d3ccbf'), plaster:C('#c4bcac'), plasterD:C('#cec1ab'),
      carpet:C('#654947'), carpetGold:C('#b58d54'), glass:C('#8daab3'), glassD:C('#26363b'),
      steel:C('#83898b'), leaf:C('#536f59'),
    };

    // Values regraded and the tower material kit added 2026-08-08 — identical tuples to every
    // other hotel module so partitions batch with the fit-out (build.js:329-331 keys on them).
    const MAT = {
      stone:  { mat:'plaster', matScale:2.30, matAmt:.16, nrmAmt:.62 },
      timber: { mat:'wood',    matScale:.95,  matAmt:.26, nrmAmt:.34 },
      cloth:  { mat:'fabric',  matScale:.52,  matAmt:.26, nrmAmt:.46 },
      paving: { mat:'concrete',matScale:1.85, matAmt:.17, nrmAmt:.30 },
    };
    const AGED = .34, POLISH = .78;

    const WY = H - .26;        // 4.09 — underside of the shell slab; every wall stops here
    const TH = .18;            // thickness that reads as construction rather than card
    const anim = (p,x,y,z,r=1)=>{ p.ob=null; p.fixed=true; p.cx=x; p.cy=y; p.cz=z; p.r=r; return p; };

    // ------------------------------------------------------------------ wall / doorway toolkit
    // Two calls, always: the box is what you see, the solid is what stops you. `wallZ` runs along
    // x (its plane faces z); `wallX` runs along z. Passing `hardness:false` builds the head over a
    // doorway — geometry with no collider, which is the only correct way to bridge an opening.
    function wallZ(x0, x1, z, o = {}) {
      const w = x1 - x0; if (w <= .002) return;
      const th = o.th || TH, cx = (x0 + x1) / 2, tag = o.tag || '墙';
      const y0 = o.y0 || 0, y1 = o.y1 === undefined ? WY : o.y1;
      box(cx, (y0 + y1) / 2, z, w, y1 - y0, th, o.c || P.plaster,
        {...MAT.stone, hard:true, mode:14, gloss:.11, tag});
      if (o.base !== false) box(cx, .065, z, w, .13, th + .05, P.limestoneD,
        {...MAT.stone,hard:true, gloss:.22, tag});
      if (o.cap !== false) box(cx, WY - .10, z, w, .075, th + .045, P.bronzeD,
        {hard:true, gloss:AGED, tag});
      if (o.hardness !== false) {
        solid(x0, x1, z - th / 2, z + th / 2);
        blocker(x0 - .02, x1 + .02, z - th / 2 - .02, z + th / 2 + .02, o.top || WY);
      }
    }
    function wallX(z0, z1, x, o = {}) {
      const d = z1 - z0; if (d <= .002) return;
      const th = o.th || TH, cz = (z0 + z1) / 2, tag = o.tag || '墙';
      const y0 = o.y0 || 0, y1 = o.y1 === undefined ? WY : o.y1;
      box(x, (y0 + y1) / 2, cz, th, y1 - y0, d, o.c || P.plaster,
        {...MAT.stone, hard:true, mode:14, gloss:.11, tag});
      if (o.base !== false) box(x, .065, cz, th + .05, .13, d, P.limestoneD,
        {...MAT.stone,hard:true, gloss:.22, tag});
      if (o.cap !== false) box(x, WY - .10, cz, th + .045, .075, d, P.bronzeD,
        {hard:true, gloss:AGED, tag});
      if (o.hardness !== false) {
        solid(x - th / 2, x + th / 2, z0, z1);
        blocker(x - th / 2 - .02, x + th / 2 + .02, z0 - .02, z1 + .02, o.top || WY);
      }
    }
    // Head, jamb linings, threshold. The linings sit OUTSIDE a..b, so the opening the body meets
    // and the opening the eye reads are the same number.
    function doorZ(a, b, z, o = {}) {
      const th = o.th || TH, ch = o.ch || 2.44, tag = o.tag || '门';
      wallZ(a, b, z, {y0:ch, y1:WY, th, hardness:false, base:false, tag, c:o.c});
      for (const x of [a - .055, b + .055]) box(x, ch / 2, z, .11, ch, th + .07, P.walnut,
        {...MAT.timber,hard:true, mode:6, gloss:.30, tag});
      box((a + b) / 2, ch + .06, z, b - a + .22, .12, th + .07, P.walnut,
        {...MAT.timber,hard:true, mode:6, gloss:.30, tag});
      flat((a + b) / 2, .016, z, b - a + .22, th + .12, P.limestoneL, {mode:7, gloss:.26, tag});
    }
    function doorX(a, b, x, o = {}) {
      const th = o.th || TH, ch = o.ch || 2.44, tag = o.tag || '门';
      wallX(a, b, x, {y0:ch, y1:WY, th, hardness:false, base:false, tag, c:o.c});
      for (const z of [a - .055, b + .055]) box(x, ch / 2, z, th + .07, ch, .11, P.walnut,
        {...MAT.timber,hard:true, mode:6, gloss:.30, tag});
      box(x, ch + .06, (a + b) / 2, th + .07, .12, b - a + .22, P.walnut,
        {...MAT.timber,hard:true, mode:6, gloss:.30, tag});
      flat(x, .016, (a + b) / 2, th + .12, b - a + .22, P.limestoneL, {mode:7, gloss:.26, tag});
    }
    const signZ = (x, z, zh, en, yaw, tag) => {
      box(x, 2.86, z, Math.max(1.05, [...zh].length * .31), .44, .05, P.walnutD,
        {...MAT.timber,hard:true, mode:6, gloss:.30, tag});
      glyphs(x, 2.93, z + (yaw ? -.034 : .034), yaw, zh,
        {size:.150, gap:.038, color:P.bronzeL, mode:1, glow:.045, lift:.007, tag});
      if (en) glyphs(x, 2.70, z + (yaw ? -.034 : .034), yaw, en,
        {size:.055, gap:.013, color:P.cream, mode:1, lift:.006, tag});
    };
    const signX = (x, z, zh, en, yaw, tag) => {
      box(x, 2.86, z, .05, .44, Math.max(1.05, [...zh].length * .31), P.walnutD,
        {...MAT.timber,hard:true, mode:6, gloss:.30, tag});
      glyphs(x + (yaw < 0 ? -.034 : .034), 2.93, z, yaw, zh,
        {size:.150, gap:.038, color:P.bronzeL, mode:1, glow:.045, lift:.007, tag});
      if (en) glyphs(x + (yaw < 0 ? -.034 : .034), 2.70, z, yaw, en,
        {size:.055, gap:.013, color:P.cream, mode:1, lift:.006, tag});
    };
    // Bronze sconce — the device that keeps a long plastered wall from reading as a blank card.
    const sconce = (x, z, yaw, tag) => {
      const sx = Math.sin(yaw), sz = Math.cos(yaw), face = Math.abs(sx) > .5;
      box(x + sx * .075, 2.02, z + sz * .075, face ? .05 : .18, .52, face ? .18 : .05, P.walnutD,
        {...MAT.timber,hard:true, mode:6, gloss:.28, tag});
      luminous(taper(x + sx * .195, 2.14, z + sz * .195, .125, .30, .125, P.warm,
        {mode:1, alpha:.9, gloss:.20, tag}), .07, .30);
    };
    // Small shared furniture, deliberately plain: this module builds architecture, and the
    // pieces below exist only so a room it encloses is not a bare plastered box.
    const chairS = (x, z, ry, c, tag) => {
      box(x, .44, z, .50, .08, .48, c, {hard:true, mode:7, gloss:.06, ry, tag});
      box(x + Math.sin(ry) * .24, .76, z + Math.cos(ry) * .24, .50, .60, .07, c,
        {hard:true, mode:7, gloss:.06, ry, tag});
      box(x, .21, z, .42, .42, .40, P.walnutD, {...MAT.timber,mode:6, gloss:.26, ry, tag});
      cyl(x, .022, z, .21, .035, P.bronzeD, {gloss:AGED, tag});
    };
    const bTable = (x, z, w, d, tag) => {
      box(x, .72, z, w, .09, d, P.walnut, {...MAT.timber,hard:true, mode:6, gloss:.30, tag});
      box(x, .776, z, w + .09, .042, d + .09, P.bronzeL, {hard:true, gloss:POLISH, tag});
      for (const s of [-1, 1]) box(x + s * (w / 2 - .52), .35, z, .28, .66, d - .38, P.walnutD,
        {...MAT.timber,hard:true, mode:6, gloss:.26, tag});
      shade(x, z, w + .55, d + .55, .24);
    };
    const raft = (x, z, w, d, tag) => {
      box(x, WY - .09, z, w, .14, d, P.walnutD, {...MAT.timber,hard:true, mode:6, gloss:.29, tag});
      luminous(box(x, WY - .175, z, w - .36, .030, d - .36, P.warm,
        {hard:true, mode:1, tag}), .035, .17);
      box(x - w / 2 + .03, WY - .10, z, .045, .105, d, P.bronzeL,
        {hard:true, gloss:POLISH, tag});
    };

    // =========================================================================================
    // 1 · BALLROOM SOUTH WALL — the wall the pre-function gallery is read through
    // =========================================================================================
    const BZ = -0.25;                      // ballroom face line
    const GD0 = -8.65, GD1 = -3.75;        // grand doors, 4.90 m clear
    const HB0 = -19.40, HB1 = -17.80;      // 京华二厅 door, 1.60 m
    const SV0 = 1.20, SV1 = 2.50;          // banquet service door, 1.30 m
    wallZ(-21.70, HB0, BZ, {th:.20, tag:'宴会厅'});
    doorZ(HB0, HB1, BZ, {th:.20, ch:2.62, tag:'宴会厅'});
    wallZ(HB1, GD0, BZ, {th:.20, tag:'宴会厅'});
    wallZ(GD1, SV0, BZ, {th:.20, tag:'宴会厅'});
    doorZ(SV0, SV1, BZ, {th:.20, tag:'宴会厅'});
    wallZ(SV1, 3.38, BZ, {th:.20, tag:'宴会厅'});

    // The grand opening keeps the existing bronze portal (head y 3.17–3.51) and its glazed
    // sidelights, and adds the reveal, the head over it and four tall leaves latched open against
    // the returns — so from the gallery the ballroom is genuinely seen THROUGH something.
    wallZ(GD0, GD1, BZ, {y0:3.51, y1:WY, th:.20, hardness:false, base:false, tag:'宴会厅'});
    for (const x of [GD0 - .12, GD1 + .12]) {
      box(x, 1.72, BZ, .24, 3.44, .62, P.walnut, {...MAT.timber,hard:true, mode:6, gloss:.31, tag:'宴会厅'});
      box(x + (x < GD0 ? .11 : -.11), 1.72, BZ, .035, 3.28, .54, P.bronzeL,
        {hard:true, gloss:POLISH, tag:'宴会厅'});
    }
    box((GD0 + GD1) / 2, 3.10, BZ, GD1 - GD0 + .26, .10, .62, P.bronzeL,
      {hard:true, gloss:POLISH, tag:'宴会厅'});
    flat((GD0 + GD1) / 2, .018, BZ, GD1 - GD0 + .34, .84, P.limestoneL,
      {mode:7, gloss:.28, tag:'宴会厅'});
    for (const z of [BZ - .34, BZ + .34]) flat((GD0 + GD1) / 2, .024, z, GD1 - GD0 + .34, .055,
      P.bronzeL, {gloss:.66, tag:'宴会厅'});
    // Four leaves hinged at the two jambs, swung 96° into the hall.
    const LANG = 96 * Math.PI / 180, LW = 1.21;
    for (const [hx, s] of [[GD0, 1], [GD1, -1]]) for (const k of [0, 1]) {
      const dirx = s * Math.cos(LANG), dirz = Math.sin(LANG);
      const cx = hx + dirx * LW / 2 + s * k * .10, cz = BZ + dirz * LW / 2 + k * .09;
      const ry = s > 0 ? -LANG : LANG;
      box(cx, 1.56, cz, LW, 3.06, .075, P.walnut, {...MAT.timber,hard:true, mode:6, gloss:.32, ry, tag:'宴会厅'});
      box(cx, 1.60, cz, LW - .17, 2.84, .028, k ? P.silk : P.silkRose,
        {hard:true, mode:1, gloss:.16, ry, tag:'宴会厅'});
      for (const dy of [-.86, 0, .86]) box(cx, 1.60 + dy, cz, LW - .15, .042, .040, P.bronzeL,
        {hard:true, gloss:POLISH, ry, tag:'宴会厅'});
      capsule(hx + dirx * (LW - .17) + s * k * .10, 1.06, BZ + dirz * (LW - .17) + k * .09,
        .022, .34, .022, P.bronzeL, {rz:Math.PI / 2, ry, gloss:.70, tag:'宴会厅'});
    }
    // No sign over the grand opening: hotel-public's portalZ already letters 京华宴会厅 /
    // GRAND BALLROOM on its head beam at y 3.38, and a second blade at 2.86 would hang straight
    // across the one sightline this whole wall exists to frame.
    signZ(-18.60, BZ - .32, '京华二厅', 'HALL 2', Math.PI, '宴会厅');
    signZ(1.85, BZ - .32, '宴会服务', '', Math.PI, '宴会厅');

    // =========================================================================================
    // 2 · BALLROOM EAST WALL — closes the hall against the salon and 会议一
    // hotel-public's operable-partition solid already covers x 2.92–3.38 over z 1.28–11.62. Only
    // the two ends were ever missing, and the run above the stacked panels never had a head.
    // =========================================================================================
    wallX(BZ - .10, 1.28, 3.15, {th:.46, tag:'宴会厅'});
    wallX(11.62, 14.70, 3.15, {th:.46, tag:'宴会厅'});
    wallX(1.28, 11.62, 3.15, {y0:3.42, y1:WY, th:.46, hardness:false, base:false, tag:'宴会厅'});
    for (const [z0, z1] of [[1.42, 6.55], [6.55, 11.55], [11.55, 14.60]])
      box(3.37, 1.74, (z0 + z1) / 2, .09, 3.32, z1 - z0 - .10, P.silk,
        {...MAT.cloth,hard:true, mode:7, gloss:.06, tag:'墙'});

    // =========================================================================================
    // 3 · THE OPERABLE PARTITION — real geometry, inspectable position, both states walkable
    // The leaves are drawn; `partSolids` is what stops the body, and `.open` is flipped with the
    // leaf position rather than building and unbuilding geometry.
    // =========================================================================================
    const PX = -15.60, PZ0 = -0.15, PZ1 = 13.30;
    const PN = 10, PW = (PZ1 - PZ0 - .30) / PN;
    box(PX, 3.96, (PZ0 + 14.70) / 2, .38, .30, 14.70 - PZ0, P.walnutD,
      {...MAT.timber,hard:true, mode:6, gloss:.29, tag:'活动隔墙'});
    box(PX, 3.78, (PZ0 + 14.70) / 2, .16, .09, 14.70 - PZ0, P.bronzeD,
      {hard:true, gloss:AGED, tag:'活动隔墙'});
    box(PX, .022, (PZ0 + PZ1) / 2, .13, .044, PZ1 - PZ0, P.bronzeL,
      {hard:true, gloss:POLISH, tag:'活动隔墙'});
    // The stacking pocket against the north wall is solid in EVERY state: parked leaves are still
    // 1.4 m of joinery, and pretending otherwise is exactly the defect this file exists to fix.
    solid(-17.22, PX + .10, 13.30, 14.70);
    blocker(-17.26, PX + .14, 13.26, 14.70, WY);
    wallX(13.30, 14.70, -17.16, {th:.12, cap:false, c:P.walnutD, tag:'活动隔墙'});
    wallZ(-17.16, PX + .10, 13.30, {th:.12, hardness:false, cap:false, c:P.walnutD, tag:'活动隔墙'});
    glyphs(-16.35, 1.92, 13.22, Math.PI, '活动隔墙',
      {size:.105, gap:.027, color:P.bronzeL, mode:1, lift:.006, tag:'活动隔墙'});

    const partSolids = [], panels = [];
    for (let i = 0; i < 4; i++) {
      const s = solid(PX - .10, PX + .10,
        PZ0 + i * (PZ1 - PZ0) / 4, PZ0 + (i + 1) * (PZ1 - PZ0) / 4);
      s.open = false; partSolids.push(s);
    }
    for (let i = 0; i < PN; i++) {
      const zc = PZ0 + .15 + (i + .5) * PW, parts = [];
      parts.push(box(PX, 1.98, zc, .11, 3.86, PW - .02, i % 2 ? P.silk : P.walnutL,
        {hard:true, mode:i % 2 ? 7 : 6, gloss:i % 2 ? .06 : .28, tag:'活动隔墙'}));
      for (const s of [-1, 1]) {
        parts.push(box(PX + s * .058, 1.98, zc, .020, 3.68, PW - .22,
          i % 2 ? P.silkRose : P.walnut, {hard:true, mode:1, gloss:.16, tag:'活动隔墙'}));
        parts.push(box(PX + s * .067, 1.98, zc, .014, 3.78, .042, P.bronzeL,
          {hard:true, gloss:.67, tag:'活动隔墙'}));
      }
      parts.push(box(PX, 1.98, zc - PW / 2 + .04, .14, 3.82, .035, P.bronzeD,
        {hard:true, gloss:.62, tag:'活动隔墙'}));
      parts.push(cyl(PX, .085, zc, .062, .05, P.steel, {rz:Math.PI / 2, gloss:.44, tag:'活动隔墙'}));
      // A leaf travels up to 13.6 m into the pocket, so its cull sphere has to enclose BOTH
      // poses. Pinned to the closed position it would be culled away exactly when stacked —
      // the wall would simply stop existing at the far end of its own programme.
      const ox = -15.66 - i * .125, oz = 13.99;
      const cx = (PX + ox) / 2, cz2 = (zc + oz) / 2;
      const cr = Math.hypot(PX - ox, zc - oz) / 2 + 1.30;
      for (const p of parts) { anim(p, cx, 1.98, cz2, cr); p._m0 = p.m; }
      panels.push({parts, cz:zc, ox, oz});
    }

    // =========================================================================================
    // 4 · PRE-FUNCTION GALLERY — its own long volume, with every south room opening off it
    // =========================================================================================
    const GZ = -5.52;
    const C1a = -16.90, C1b = -15.50;   // 楼梯厅 · 宴会家具库
    const M3a = -11.80, M3b = -10.60;   // 会议三
    const M4a = -6.40,  M4b = -5.20;    // 会议四
    const ARa = -3.30,  ARb = 0.30;     // 京华雅集, a 3.60 m ceremonial threshold
    const BCa = 9.95,   BCb = 11.25;    // 商务中心, clear of the 今日活动 board (ends x 9.825)
    wallZ(-21.70, C1a, GZ, {tag:'宴会前厅'});
    doorZ(C1a, C1b, GZ, {tag:'楼梯厅'});
    wallZ(C1b, M3a, GZ, {tag:'宴会前厅'});
    doorZ(M3a, M3b, GZ, {tag:'会议三'});
    wallZ(M3b, M4a, GZ, {tag:'宴会前厅'});
    doorZ(M4a, M4b, GZ, {tag:'会议四'});
    wallZ(M4b, ARa, GZ, {tag:'宴会前厅'});
    wallZ(ARb, BCa, GZ, {tag:'宴会前厅'});
    doorZ(BCa, BCb, GZ, {tag:'商务中心'});
    wallZ(BCb, 12.49, GZ, {tag:'宴会前厅'});
    wallZ(ARa, ARb, GZ, {y0:3.18, y1:WY, hardness:false, base:false, tag:'京华雅集'});
    for (const x of [ARa - .13, ARb + .13]) {
      box(x, 1.59, GZ, .26, 3.18, .46, P.walnut, {...MAT.timber,hard:true, mode:6, gloss:.31, tag:'京华雅集'});
      box(x + (x < ARa ? .12 : -.12), 1.59, GZ, .035, 3.02, .38, P.bronzeL,
        {hard:true, gloss:POLISH, tag:'京华雅集'});
    }
    box((ARa + ARb) / 2, 3.28, GZ, ARb - ARa + .30, .20, .46, P.walnut,
      {...MAT.timber,hard:true, mode:6, gloss:.32, tag:'京华雅集'});
    flat((ARa + ARb) / 2, .018, GZ, ARb - ARa + .30, .52, P.limestoneL,
      {mode:7, gloss:.28, tag:'京华雅集'});
    signZ(-16.20, GZ + .30, '楼梯厅', 'STAIR', 0, '楼梯厅');
    signZ(-11.20, GZ + .30, '会议三', 'MEETING 3', 0, '会议三');
    signZ(-5.80, GZ + .30, '会议四', 'MEETING 4', 0, '会议四');
    signZ(10.60, GZ + .30, '商务中心', 'BUSINESS', 0, '商务中心');
    glyphs((ARa + ARb) / 2, 3.28, GZ + .25, 0, '京华雅集',
      {size:.115, gap:.030, color:P.bronzeL, mode:1, glow:.04, lift:.007, tag:'京华雅集'});

    // =========================================================================================
    // 5 · WEDDING SALON, MEETING LOBBY AND THE TWO NORTH MEETING ROOMS
    // =========================================================================================
    // MB clears hotel-public's meeting display panel (z 13.36–13.50) instead of sitting in it.
    const SZ = 0.72, SN = 6.81, EX = 12.05, MF = 8.60, MD = 8.10, MB = 13.62;
    const SD0 = 4.40, SD1 = 5.60;      // salon north door, off the meeting lobby
    const SE0 = 4.60, SE1 = 6.00;      // salon east door, off the gallery's east limb
    const R1a = 5.35, R1b = 6.65, R2a = 9.55, R2b = 10.85;
    wallZ(3.38, EX + .09, SZ, {tag:'婚礼沙龙'});
    wallZ(3.38, SD0, SN, {tag:'婚礼沙龙'});
    doorZ(SD0, SD1, SN, {tag:'婚礼沙龙'});
    wallZ(SD1, EX - .09, SN, {tag:'婚礼沙龙'});
    wallX(SZ, SE0, EX, {tag:'婚礼沙龙'});
    doorX(SE0, SE1, EX, {tag:'婚礼沙龙'});
    wallX(SE1, SN, EX, {tag:'婚礼沙龙'});
    signZ(5.00, SN + .30, '婚礼沙龙', 'WEDDING SALON', 0, '婚礼沙龙');
    signX(EX + .30, 5.30, '婚礼沙龙', 'WEDDING SALON', Math.PI / 2, '婚礼沙龙');

    // The meeting-room front wall sits 0.60 m behind hotel-public's bronze portals, so each portal
    // stands free in the lobby announcing its room instead of being buried in plaster.
    wallZ(3.38, R1a, MF, {tag:'会议室'});
    doorZ(R1a, R1b, MF, {tag:'会议室'});
    wallZ(R1b, R2a, MF, {tag:'会议室'});
    doorZ(R2a, R2b, MF, {tag:'会议室'});
    wallZ(R2b, EX + .09, MF, {tag:'会议室'});
    wallX(MF, MB, MD, {cap:false, tag:'会议室'});
    wallZ(3.24, MD + .09, MB, {cap:false, tag:'会议室'});
    wallZ(MD - .09, EX + .09, MB, {cap:false, tag:'会议室'});
    solid(3.24, EX + .09, MB, 14.70);
    blocker(3.24, EX + .09, MB, 14.70, WY);
    signZ(6.00, MF - .30, '会议一', 'MEETING 1', Math.PI, '会议室');
    signZ(10.20, MF - .30, '会议二', 'MEETING 2', Math.PI, '会议室');

    // 会议二's east wall steps back 0.35 m opposite the floor directory. Flush, the totem would be
    // left with a 0.41 m slot and nowhere honest to read it from; the niche makes it 0.76 m.
    const NB0 = 9.48, NB1 = 11.62;
    wallX(MF, NB0, EX, {cap:false, tag:'会议室'});
    wallX(NB1, MB, EX, {cap:false, tag:'会议室'});
    wallX(NB0, NB1, EX - .35, {cap:false, tag:'会议室'});
    wallZ(EX - .44, EX + .09, NB0, {cap:false, tag:'会议室'});
    wallZ(EX - .44, EX + .09, NB1, {cap:false, tag:'会议室'});
    flat(EX - .17, .020, (NB0 + NB1) / 2, .40, NB1 - NB0 - .22, P.limestoneL,
      {mode:7, gloss:.24, tag:'楼层索引'});
    sconce(EX - .28, NB0 + .55, Math.PI / 2, '楼层索引');
    sconce(EX - .28, NB1 - .55, Math.PI / 2, '楼层索引');

    // =========================================================================================
    // 6 · SOUTH BAND — stair lobby / banquet store, two meeting rooms, art bay, business centre
    // =========================================================================================
    wallX(-14.70, GZ, -13.99, {cap:false, tag:'会议三'});      // 楼梯厅 | 会议三
    wallX(-14.70, GZ, -8.40, {cap:false, tag:'会议四'});       // 会议三 | 会议四
    wallX(-14.70, GZ, -4.10, {cap:false, tag:'京华雅集'});     // 会议四 | 京华雅集
    wallX(-14.70, GZ, 5.95, {cap:false, tag:'京华雅集'});      // 京华雅集 | 商务中心
    wallX(-14.70, GZ, 12.40, {cap:false, tag:'商务中心'});     // 商务中心 | lift lobby

    // =========================================================================================
    // 7 · CEILINGS — the ballroom finally has one of its own
    // The shell slab soffit is flat at 4.09 across the whole plate. A ballroom needs its own
    // ceiling, and it is what makes the three existing bronze/crystal chandeliers read as hung
    // from architecture rather than stuck to a lid. The coffer grid is set so the chandeliers at
    // x -11.0 / -6.3 / -1.6, z 6.2 fall in the middle of a bay and no beam crosses a drop.
    // =========================================================================================
    const CAX = [-15.60, -13.35, -8.65, -3.95, 0.75, 3.15];
    const CAZ = [-0.25, 3.85, 8.55, 12.55, 14.70];
    const CBX = [-21.70, -18.65, -15.60], CBZ = [-0.25, 4.65, 9.55, 14.70];
    const cofferField = (XS, ZS, skipX, skipZ, tag) => {
      const x0 = XS[0], x1 = XS[XS.length - 1], z0 = ZS[0], z1 = ZS[ZS.length - 1];
      for (const x of XS) if (!skipX.includes(x))
        box(x, 3.97, (z0 + z1) / 2, .30, .24, z1 - z0, P.walnutD,
          {...MAT.timber,hard:true, mode:6, gloss:.28, tag});
      for (const z of ZS) if (!skipZ.includes(z))
        box((x0 + x1) / 2, 3.97, z, x1 - x0, .24, .30, P.walnutD,
          {...MAT.timber,hard:true, mode:6, gloss:.28, tag});
      for (let i = 0; i < XS.length - 1; i++) for (let j = 0; j < ZS.length - 1; j++) {
        const cx = (XS[i] + XS[i + 1]) / 2, cz = (ZS[j] + ZS[j + 1]) / 2;
        const w = XS[i + 1] - XS[i] - .36, d = ZS[j + 1] - ZS[j] - .36;
        if (w < 2.2 || d < 2.2) continue;
        box(cx, 4.055, cz, w, .035, d, P.cream, {...MAT.cloth,hard:true, mode:7, gloss:.08, tag});
        box(cx, 3.895, cz - d / 2 - .02, w + .10, .055, .045, P.bronzeL,
          {hard:true, gloss:POLISH, tag});
        if (w > 3.6 && d > 3.6) luminous(box(cx, 3.915, cz, w - .70, .028, d - .70, P.warm,
          {hard:true, mode:1, tag}), .028, .14);
      }
    };
    cofferField(CAX, CAZ, [-15.60, 3.15], [-0.25, 14.70], '宴会厅天花');
    cofferField(CBX, CBZ, [-21.70, -15.60], [-0.25, 14.70], '宴会厅天花');

    // =========================================================================================
    // 8 · THE ROOMS THIS MODULE ENCLOSED — each gets a floor, a ceiling and a reason to enter
    // =========================================================================================
    // 京华二厅, the junior hall the operable wall creates. Dressed between events: the round tops
    // and chair dollies are parked, which is what a hall looks like the morning after a banquet.
    flat(-18.65, .022, 7.22, 5.92, 14.55, P.carpet, {...MAT.cloth,mode:7, gloss:.035, tag:'京华二厅'});
    for (const z of [0.32, 14.12]) flat(-18.65, .028, z, 5.92, .05, P.bronzeL,
      {gloss:POLISH, tag:'京华二厅'});
    for (let i = 0; i < 5; i++) for (const s of [-1, 1])
      ball(-18.65 + s * 1.42, .034, 1.60 + i * 2.85, .40, .012, .21,
        i % 2 ? P.carpetGold : P.silkRose, {mode:7, gloss:.05, ry:s * .55, tag:'京华二厅'});
    for (const z of [1.95, 7.25, 12.55]) {
      box(-21.58, 2.00, z, .09, 3.24, 2.42, P.silk, {...MAT.cloth,hard:true, mode:7, gloss:.06, tag:'京华二厅'});
      for (const dz of [-1.26, 1.26]) box(-21.54, 2.00, z + dz, .11, 3.34, .11, P.walnutD,
        {...MAT.timber,hard:true, mode:6, gloss:.28, tag:'京华二厅'});
      sconce(-21.50, z, Math.PI / 2, '京华二厅');
    }
    for (const z of [3.6, 10.9]) {
      cyl(-18.65, H - .055, z, .17, .08, P.bronzeD, {gloss:AGED, tag:'京华二厅'});
      capsule(-18.65, 3.72, z, .024, .62, .024, P.bronze, {gloss:AGED, tag:'京华二厅'});
      luminous(taper(-18.65, 3.28, z, .30, .52, .30, P.warm,
        {mode:1, alpha:.9, gloss:.18, tag:'京华二厅'}), .08, .34);
    }
    for (const [x, z] of [[-20.35, 12.1]]) {           // parked round tops
      cyl(x, 1.02, z, 1.02, .085, P.walnutL, {...MAT.timber,rz:Math.PI / 2, ry:.12, mode:6, gloss:.28, tag:'京华二厅'});
      cyl(x, 1.02, z + .13, 1.02, .085, P.walnut, {...MAT.timber,rz:Math.PI / 2, ry:.12, mode:6, gloss:.28, tag:'京华二厅'});
      box(x, .10, z + .06, 1.30, .20, .52, P.steel, {hard:true, gloss:.42, tag:'京华二厅'});
    }
    for (const z of [9.0]) {                                       // chair dollies
      box(-20.45, .11, z, 1.55, .22, .58, P.steel, {hard:true, gloss:.44, tag:'京华二厅'});
      for (let i = 0; i < 6; i++) box(-21.05 + i * .145, .70 + i * .012, z, .13, .96, .50,
        i % 2 ? P.silk : P.silkRose, {hard:true, mode:7, gloss:.06, tag:'京华二厅'});
      for (const dx of [-.62, .62]) cyl(-20.45 + dx, .045, z, .055, .05, P.ink,
        {rz:Math.PI / 2, gloss:.30, tag:'京华二厅'});
    }
    light(-18.65, 3.30, 7.2, [1, .80, .56], .44, 8.4);

    // 京华雅集 — the south art bay. The event-gallery wall hotel-public built at z -14.56 is its
    // focal end, which is exactly why this bay opens to the pre-function hall through a 3.60 m
    // threshold rather than a door.
    flat(0.92, .020, -10.30, 9.60, 8.60, P.limestone, {mode:7, gloss:.16, tag:'京华雅集'});
    for (const x of [-3.60, 5.44]) flat(x, .026, -10.30, .05, 8.60, P.bronzeL,
      {gloss:POLISH, tag:'京华雅集'});
    flat(0.92, .026, -6.10, 9.60, .05, P.bronzeL, {gloss:POLISH, tag:'京华雅集'});
    raft(0.92, -9.60, 7.40, 4.60, '京华雅集');
    for (const s of [-1, 1]) {
      box(0.92 + s * 3.05, .40, -9.60, 1.05, .28, 2.90, P.walnut,
        {...MAT.timber,hard:true, mode:6, gloss:.30, tag:'京华雅集'});
      box(0.92 + s * 3.05, .56, -9.60, .95, .09, 2.78, P.silk,
        {...MAT.cloth,hard:true, mode:7, gloss:.06, tag:'京华雅集'});
      for (const dz of [-1.24, 1.24]) taper(0.92 + s * 3.05, .14, -9.60 + dz, .09, .28, .07,
        P.bronzeD, {gloss:.60, tag:'京华雅集'});
      sconce(s < 0 ? -4.01 : 5.86, -10.30, s < 0 ? Math.PI / 2 : -Math.PI / 2, '京华雅集');
      cyl(0.92 + s * 3.9, .05, -13.10, .42, .10, P.bronzeD, {gloss:AGED, tag:'京华雅集'});
      taper(0.92 + s * 3.9, .48, -13.10, .58, .82, .58, P.limestoneD, {...MAT.stone,gloss:.18, tag:'京华雅集'});
      capsule(0.92 + s * 3.9, 1.42, -13.10, .06, 1.00, .06, P.walnutD, {gloss:.18, tag:'京华雅集'});
      for (let i = 0; i < 6; i++) ball(0.92 + s * 3.9 + Math.cos(i * 2.4) * .26,
        1.90 + (i % 3) * .17, -13.10 + Math.sin(i * 2.4) * .26, .17, .10, .14,
        i % 3 ? P.leaf : P.celadon, {mode:15, gloss:.08, ry:i * 2.4, tag:'京华雅集'});
    }
    light(0.92, 3.20, -10.60, [1, .84, .60], .40, 8.0);

    // 会议三 and 会议四, off the gallery's south wall.
    for (const [cx, w, seats, zh, wW, wE] of
         [[-11.20, 5.10, 4, '会议三', -13.90, -8.49],
          [-6.25, 3.80, 3, '会议四', -8.31, -4.19]]) {
      flat(cx, .022, -10.15, w, 8.70, P.carpet, {...MAT.cloth,mode:7, gloss:.04, tag:'会议室'});
      raft(cx, -10.15, w - 1.1, 2.70, '会议室');
      bTable(cx, -10.15, w - 2.2, 1.45, '会议室');
      for (let i = 0; i < seats; i++) {
        const z = -10.15 + (i - (seats - 1) / 2) * 1.12;
        // The back sits at x + sin(ry)*0.24, so the west rank needs -PI/2 to face the table.
        chairS(cx - w / 2 + 1.02, z, -Math.PI / 2, P.silk, '会议室');
        chairS(cx + w / 2 - 1.02, z, Math.PI / 2, P.silk, '会议室');
      }
      box(cx, 2.08, -14.54, w - .9, 2.44, .13, P.walnutD, {...MAT.timber,hard:true, mode:6, gloss:.29, tag:'会议室'});
      box(cx, 2.08, -14.46, w - 1.2, 2.20, .035, P.silk, {...MAT.cloth,hard:true, mode:7, gloss:.06, tag:'会议室'});
      box(cx, 2.34, -14.42, w - 1.9, 1.28, .05, P.glassD, {hard:true, mode:1, glow:.025, tag:'会议室'});
      for (const s of [-1, 1]) box(cx + s * (w / 2 - .58), 2.08, -14.41, .07, 2.10, .05, P.bronzeL,
        {hard:true, gloss:POLISH, tag:'会议室'});
      glyphs(cx, 1.10, -14.42, 0, zh,
        {size:.13, gap:.032, color:P.bronzeL, mode:1, lift:.006, tag:'会议室'});
      sconce(wW, -9.10, Math.PI / 2, '会议室');
      sconce(wE, -9.10, -Math.PI / 2, '会议室');
      light(cx, 3.24, -10.15, [1, .86, .66], .34, 6.4);
    }

    // 楼梯厅 · 宴会家具库 — the stair lobby doubles as the banquet store, which is why the fire
    // stair on this level is not stranded in the middle of a meeting room.
    flat(-17.90, .020, -11.60, 7.40, 6.00, P.limestoneD, {mode:7, gloss:.12, tag:'宴会家具库'});
    flat(-16.10, .020, -7.40, 3.80, 3.60, P.limestoneD, {mode:7, gloss:.12, tag:'宴会家具库'});
    for (const z of [-13.6, -12.3]) {
      for (let r = 0; r < 3; r++) box(-20.70, .55 + r * 1.02, z, 1.30, .075, 1.10, P.steel,
        {hard:true, gloss:.42, tag:'宴会家具库'});
      for (const dx of [-.60, .60]) box(-20.70 + dx, 1.55, z, .07, 3.05, .07, P.ink,
        {hard:true, gloss:.30, tag:'宴会家具库'});
    }
    for (let i = 0; i < 5; i++) box(-20.66, .78 + (i % 3) * 1.02, -13.6 + (i > 2 ? 1.3 : 0),
      1.00, .32, .90, i % 2 ? P.cream : P.silk, {hard:true, mode:7, gloss:.05, tag:'宴会家具库'});
    for (const [x, z] of [[-17.20, -13.75], [-15.90, -13.75]]) {
      cyl(x, 1.00, z, 1.00, .085, P.walnutL, {...MAT.timber,rz:Math.PI / 2, ry:.06, mode:6, gloss:.28, tag:'宴会家具库'});
      box(x, .10, z, 1.28, .20, .50, P.steel, {hard:true, gloss:.42, tag:'宴会家具库'});
    }
    for (const z of [-10.4]) {
      box(-17.20, .11, z, 1.55, .22, .58, P.steel, {hard:true, gloss:.44, tag:'宴会家具库'});
      for (let i = 0; i < 6; i++) box(-17.80 + i * .145, .70 + i * .012, z, .13, .96, .50,
        i % 2 ? P.silk : P.celadonL, {hard:true, mode:7, gloss:.06, tag:'宴会家具库'});
    }
    box(-14.30, 1.20, -11.30, .32, 2.20, 1.80, P.walnutD, {...MAT.timber,hard:true, mode:6, gloss:.28, tag:'宴会家具库'});
    for (let i = 0; i < 4; i++) box(-14.46, .55 + i * .52, -11.30, .045, .05, 1.66, P.bronzeL,
      {hard:true, gloss:POLISH, tag:'宴会家具库'});
    glyphs(-14.50, 2.52, -11.30, -Math.PI / 2, '宴会家具库',
      {size:.115, gap:.028, color:P.bronzeL, mode:1, lift:.006, tag:'宴会家具库'});
    sconce(-14.03, -8.20, -Math.PI / 2, '宴会家具库');
    sconce(-21.78, -11.60, Math.PI / 2, '宴会家具库');
    light(-17.60, 3.20, -11.20, [1, .84, .62], .34, 7.4);

    // Pre-function gallery: the carpet hotel-public laid stops at x -12.9, and the gallery this
    // module encloses now runs 8 m further west to the stair-hall door. Continue the finish, or
    // the west end of the room reads as unbuilt shell.
    flat(-17.30, .022, -3.25, 8.70, 4.00, P.carpet, {...MAT.cloth,mode:7, gloss:.035, tag:'宴会前厅'});
    for (const z of [-5.02, -1.48]) flat(-17.30, .028, z, 8.70, .055, P.bronzeL,
      {gloss:POLISH, tag:'宴会前厅'});
    for (let i = 0; i < 2; i++) {
      const x = -19.2 + i * 3.6;
      for (const s of [-1, 1]) ball(x + s * .28, .034, -3.25, .42, .012, .22,
        i % 2 ? P.carpetGold : P.silkRose, {mode:7, gloss:.05, ry:s * .55, tag:'宴会前厅'});
      raft(x, -3.25, 2.30, 2.20, '宴会前厅');
    }
    // East limb: the gallery turns north past the lift bank to serve the salon and meeting rooms.
    flat(16.70, .022, 10.60, 7.40, 7.20, P.carpet, {...MAT.cloth,mode:7, gloss:.035, tag:'宴会前厅'});
    for (const x of [13.05, 20.35]) flat(x, .028, 10.60, .05, 7.20, P.bronzeL,
      {gloss:POLISH, tag:'宴会前厅'});
    raft(16.70, 10.60, 5.60, 4.20, '宴会前厅');
    for (const z of [9.0, 12.6]) sconce(21.78, z, -Math.PI / 2, '宴会前厅');
    light(16.70, 3.20, 10.60, [1, .83, .60], .34, 8.0);

    // =========================================================================================
    // 9 · CAMERA ROOMS — the chase eye now has honest wall bounds. Smallest volume first.
    // =========================================================================================
    cameraRoom('hotel3-directory-niche', 11.79, 12.85, 9.48, 11.62, 1.55);
    cameraRoom('hotel3-meeting-lobby', 3.38, 12.14, 6.90, 8.51, 2.35);
    cameraRoom('hotel3-meeting1', 3.24, 8.01, 8.69, 13.53, 2.85);
    cameraRoom('hotel3-meeting2', 8.19, 11.96, 8.69, 13.53, 2.85);
    cameraRoom('hotel3-meeting4', -8.31, -4.19, -14.70, -5.61, 2.85);
    cameraRoom('hotel3-meeting3', -13.90, -8.49, -14.70, -5.61, 3.05);
    cameraRoom('hotel3-store', -21.70, -14.08, -14.70, -5.61, 3.05);
    cameraRoom('hotel3-business', 6.04, 12.31, -14.70, -5.61, 3.10);
    cameraRoom('hotel3-salon', 3.38, 11.96, 0.81, 6.72, 2.95);
    cameraRoom('hotel3-artbay', -4.01, 5.86, -14.70, -5.61, 3.25);
    cameraRoom('hotel3-hall2', -21.70, -15.70, -0.15, 14.70, 3.35);
    cameraRoom('hotel3-ballroom', -15.50, 2.92, -0.15, 14.70, 4.15);
    cameraRoom('hotel3-prefunction', -21.70, 12.40, -5.43, -0.35, 3.55);
    cameraRoom('hotel3-lift-lobby', 12.49, 21.70, -14.70, 14.70, 3.75);

    // =========================================================================================
    // 10 · INTERACTIONS — one per room this module created, none of them dead
    // The HotelUse rows themselves are registered AT LOAD TIME at the foot of this file, not here.
    // =========================================================================================
    const mkThing = (hz, x, z, zh, en, note, focus, reach) => {
      const th = thing(hz, x, 1.24, z, zh, en, note, {tag:hz, focus, reach});
      th.hotelFixture = {floor:A.floor, department:'banqueting', tag:hz, route:A.route};
      return th;
    };
    mkThing('活动隔墙', PX + .12, 6.50, '十二扇顶挂隔墙把宴会厅分成京华一厅和二厅。',
      'Twelve top-hung leaves divide the ballroom into Hall One and Hall Two.',
      '活动隔墙 is an operable partition wall.', [-14.55, 6.50], 2.1);
    mkThing('宴会家具库', -14.55, -11.30, '楼梯厅兼作宴会家具库，圆桌面和椅具都收在这里。',
      'The stair hall doubles as the banquet store for round tops and stacking chairs.',
      '家具 means furniture; 库 is a store.', [-15.60, -11.30], 2.1);
    mkThing('京华雅集', 0.92, -13.60, '雅集廊把宴会前厅的长视线收在一面丝绸与银杏的墙上。',
      'The events gallery closes the pre-function sightline on a wall of silk and ginkgo.',
      '雅集 is a refined gathering.', [0.92, -11.60], 2.4);

    A.state.f3 = {props:0, rooms:14,
      partition:{mode:PARTITION_MODE, state:'closed', u:0}};

    // =========================================================================================
    // 11 · PARTITION PROGRAMME — deterministic, and both end states are flood-fill clean
    // =========================================================================================
    let t0 = 0, u = 0;
    onTick((t, body, clock, dt) => {
      if (!t0) t0 = t;
      if (PARTITION_MODE === 'closed') u = 0;
      else if (PARTITION_MODE === 'open') u = 1;
      else {
        // 96 s programme: 34 s shut, 14 s opening, 34 s stacked, 14 s closing.
        const c = (t - t0) % 96;
        const raw = c < 34 ? 0 : c < 48 ? (c - 34) / 14 : c < 82 ? 1 : 1 - (c - 82) / 14;
        u = raw * raw * (3 - 2 * raw);
      }
      const shut = u < .5;
      for (const s of partSolids) s.open = !shut;
      for (const q of panels) {
        const m = M.trans((q.ox - PX) * u, 0, (q.oz - q.cz) * u);
        for (const p of q.parts) p.m = M.mul(m, p._m0);
      }
      A.state.f3.partition = {mode:PARTITION_MODE, u:+u.toFixed(3),
        state:u < .02 ? 'closed' : u > .98 ? 'open' : (shut ? 'closing' : 'opening'),
        x:PX, from:PZ0, to:PZ1, leaves:PN, blocking:shut};
    });

    A.state.f3.props = A.B.props.length - props0;
  });

  // ------------------------------------------------------------------------------- floor actions
  // AT LOAD TIME, not inside the builder. These used to be assigned from inside the
  // HotelFit.register callback, which only runs when the scene is first built — so js/data.js had
  // nothing to patch at load, and anything attaching opening hours, a dictionary link or a price to
  // one of these rows silently found no row. It cost the systemic-wiring lane the 京华雅集 outlet
  // window before it was diagnosed. js/hotel-f8.js:1306 was the same defect and moved first;
  // .hotelhours.js is the harness that says so, without a browser.
  Object.assign(HotelUse.hotel3, {
    '活动隔墙':{zh:'看活动隔墙', py:'kàn huódòng géqiáng', en:'inspect the operable wall',
      secs:2.2, mins:3, gain:{mood:3}, pose:{type:'check'},
      done:'十二扇隔墙都能推到北墙的收纳位。',
      doneTr:'All twelve leaves run back into the stacking pocket on the north wall.'},
    '宴会家具库':{zh:'清点家具', py:'qīngdiǎn jiājù', en:'count the banquet stock',
      secs:2.6, mins:8, gain:{rest:-2}, pose:{type:'check'},
      done:'圆桌面、椅具和布草的数量都对上了。',
      doneTr:'Round tops, chairs and linen all match the sheet.'},
    '京华雅集':{zh:'看展陈廊', py:'kàn zhǎnchén láng', en:'walk the events gallery',
      secs:2.4, mins:6, gain:{mood:6}, pose:{type:'read'},
      done:'银杏、月洞和丝绸在一面墙上收住了。',
      doneTr:'Ginkgo, moon disc and silk resolve into a single wall.'},
  });

  return Object.freeze({api:1, floor:'hotel3', identity:'banqueting-thresholds'});
})();
