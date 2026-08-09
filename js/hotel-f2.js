// 🏨 京华大酒店 · Floor 2 — the interior architecture
//
// This floor's own module. Registered into HotelFit (declared in js/hotel.js). Nothing else in
// the build writes to this file, and you must not write to anyone else's.
//
// Programme for this level, from HOTEL.md:
//   all-day dining, Chinese restaurant, private dining rooms, show kitchen and back kitchen
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
//   scene key   hotel2
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
//     node /private/tmp/claude-501/-Users-jonahcollins-Desktop-Chinesegame/a3cc9bcf-53f0-4e3d-a6a3-24cb996ed8a1/scratchpad/floorprobe.js hotel2 -22 22 -15 15 15.6 -3.7
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
//   * `node --check js/hotel-f2.js` after every edit. A backtick inside a template literal
//     ends the string mid-statement; that has broken this project three times.
//
// ---------------------------------------------------------------------------------------------

try {
  Glyphs.need(
    '京华宴中餐厅全日餐厅私宴包间明档厨房后厨传菜口服务通道员工通道洗碗间备餐间' +
    '兰亭轩松风阁竹里馆候餐茶廊迎宾请稍候出品口洗碗餐具回收员工止步' +
    '屏风影壁二楼餐饮厅堂雅座茶水推车布草更衣消毒柜' +
    'PRIVATEDININGSHOWKITCHENALLDAYCHINESESTAFFONLYWAITINGLOUNGEDISHWASH123'
  );
} catch (_) {}

HotelFit.register('hotel2', A => {
  const { box, cyl, ball, capsule, taper, flat, glyphs, solid, blocker, shade, glow, thing } = A;
  const { C, RX, RZ, H } = A;

  // ------------------------------------------------------------------------------------------
  // PALETTE — walnut, celadon, copper. Deliberately the same hexes the fit-out module mixes in
  // its own `atelier` palette, so a partition meeting an existing screen reads as one building.
  const P = {
    plaster:C('#c3bcad'), plasterD:C('#c2b8a4'), limestone:C('#c2b7a2'), limestoneL:C('#cec6b8'),
    walnut:C('#493329'), walnutL:C('#76513c'), walnutD:C('#2c211d'),
    bronze:C('#a7783e'), bronzeL:C('#d5aa68'), bronzeD:C('#62452c'),
    lacquer:C('#922f28'), celadon:C('#7f9f8f'), celadonL:C('#a9bcb0'), jade:C('#3f6d5e'),
    ink:C('#202527'), cream:C('#d3ccbf'), silk:C('#c1a48f'), copper:C('#b66935'),
    steel:C('#83898b'), steelD:C('#5a6062'), glass:C('#8daab3'), warm:C('#ffe1a3'),
    white:C('#d6d1c6'), leaf:C('#536f59'), tile:C('#bbbdb7'),
  };

  // Values regraded and the tower material kit added 2026-08-08. See js/hotel-public.js for the
  // reasoning; the four tuples below are byte-identical to the copies there and in every other
  // hotel module on purpose, because build.js:329-331 keys batches on (mat, matScale, matAmt,
  // nrmAmt) and matching tuples let this module's partitions batch with the fit-out's furniture.
  const MAT = {
    stone:  { mat:'plaster', matScale:2.30, matAmt:.16, nrmAmt:.62 },
    timber: { mat:'wood',    matScale:.95,  matAmt:.26, nrmAmt:.34 },
    cloth:  { mat:'fabric',  matScale:.52,  matAmt:.26, nrmAmt:.46 },
    paving: { mat:'concrete',matScale:1.85, matAmt:.17, nrmAmt:.30 },
  };
  const AGED = .34, POLISH = .78;

  // Full-height partition: the ceiling slab's underside is H-0.26, so a wall that stops short of
  // it is a stage flat. TT is the built thickness; every solid below is quoted in EXTENTS.
  const WH = H - .26, TT = .16, HT = TT / 2;

  // ------------------------------------------------------------------------------------------
  // WALL PRIMITIVES
  //
  // Two calls per run, always: the box you see, the solid that stops you. The base and cornice
  // are 0.03 m proud of the wall face on each side so the partition has a plinth and a head
  // rather than being a card standing on the floor.
  const wallEW = (z, x0, x1, tag = '墙', face = P.plaster) => {
    const w = x1 - x0; if (w < .03) return;
    const cx = (x0 + x1) / 2;
    Build.partition(0, WH, (yc, hh, pf) =>
      box(cx, yc, z, w, hh, TT, face, {...MAT.stone, hard: true, mode: 14, gloss: .12, tag, ...pf }));
    box(cx, .085, z, w, .17, TT + .06, P.walnutD, {...MAT.timber, hard: true, mode: 6, gloss: .28, tag });
    box(cx, 3.34, z, w, .075, TT + .05, P.bronzeD, { hard: true, gloss:AGED, tag, partition: true });
    solid(x0, x1, z - HT, z + HT);
    blocker(x0 - .02, x1 + .02, z - HT - .02, z + HT + .02, WH);
  };
  const wallNS = (x, z0, z1, tag = '墙', face = P.plaster) => {
    const d = z1 - z0; if (d < .03) return;
    const cz = (z0 + z1) / 2;
    Build.partition(0, WH, (yc, hh, pf) =>
      box(x, yc, cz, TT, hh, d, face, {...MAT.stone, hard: true, mode: 14, gloss: .12, tag, ...pf }));
    box(x, .085, cz, TT + .06, .17, d, P.walnutD, {...MAT.timber, hard: true, mode: 6, gloss: .28, tag });
    box(x, 3.34, cz, TT + .05, .075, d, P.bronzeD, { hard: true, gloss:AGED, tag, partition: true });
    solid(x - HT, x + HT, z0, z1);
    blocker(x - HT - .02, x + HT + .02, z0 - .02, z1 + .02, WH);
  };

  // A cased opening. `solid` has no hole in it, so the two flanking runs are separate walls and
  // the head above the door carries NO collider at all — that is what makes it a door instead of
  // a gap in the render. Reveals are returned into the opening so the wall shows its thickness.
  const doorEW = (z, cx, half, tag, yawSign = 1) => {
    box(cx, (2.34 + WH) / 2, z, half * 2 + .30, WH - 2.34, TT + .02, P.plaster,
      {...MAT.stone,  hard: true, mode: 14, gloss: .12, tag });
    box(cx, 2.30, z, half * 2 + .34, .16, TT + .10, P.walnut, {...MAT.timber, hard: true, mode: 6, gloss: .31, tag });
    for (const s of [-1, 1]) {
      box(cx + s * (half + .075), 1.16, z, .15, 2.32, TT + .10, P.walnut,
        {...MAT.timber,  hard: true, mode: 6, gloss: .31, tag });
      box(cx + s * (half + .02), 1.16, z, .045, 2.24, TT + .13, P.bronzeD,
        { hard: true, gloss:AGED, tag });
    }
    flat(cx, .028, z, half * 2 - .06, TT + .12, P.bronzeD, { gloss:AGED, tag });
    return yawSign;
  };
  const doorNS = (x, cz, half, tag) => {
    box(x, (2.34 + WH) / 2, cz, TT + .02, WH - 2.34, half * 2 + .30, P.plaster,
      {...MAT.stone,  hard: true, mode: 14, gloss: .12, tag });
    box(x, 2.30, cz, TT + .10, .16, half * 2 + .34, P.walnut, {...MAT.timber, hard: true, mode: 6, gloss: .31, tag });
    for (const s of [-1, 1]) {
      box(x, 1.16, cz + s * (half + .075), TT + .10, 2.32, .15, P.walnut,
        {...MAT.timber,  hard: true, mode: 6, gloss: .31, tag });
      box(x, 1.16, cz + s * (half + .02), TT + .13, 2.24, .045, P.bronzeD,
        { hard: true, gloss:AGED, tag });
    }
    flat(x, .028, cz, TT + .12, half * 2 - .06, P.bronzeD, { gloss:AGED, tag });
  };

  // A 屏风 screen wall built the cheap way: opaque walnut slats with air between them. It reads
  // as an open lattice from either side and batches into the same draw call as every other
  // opaque box on the floor. Forty translucent panes would have been forty draw calls.
  const screenEW = (z, x0, x1, tag = '屏风', y0 = .95, y1 = 3.10, accent = P.celadon) => {
    const w = x1 - x0, cx = (x0 + x1) / 2, h = y1 - y0, cy = (y0 + y1) / 2;
    box(cx, y0 - .48, z, w, .96, .18, P.walnut, {...MAT.timber, hard: true, mode: 6, gloss: .30, tag });
    box(cx, y0 - .945, z, w + .06, .09, .24, P.walnutD, {...MAT.timber, hard: true, mode: 6, gloss: .26, tag });
    box(cx, y0 + .01, z, w, .09, .22, P.walnutD, {...MAT.timber, hard: true, mode: 6, gloss: .28, tag });
    box(cx, y1 + .06, z, w, .12, .24, P.walnut, {...MAT.timber, hard: true, mode: 6, gloss: .30, tag });
    box(cx, y1 + .145, z, w, .05, .28, P.bronzeD, { hard: true, gloss:AGED, tag });
    const n = Math.max(3, Math.round(w / .42));
    for (let i = 0; i <= n; i++) {
      const px = x0 + i * w / n;
      box(px, cy, z, .062, h, .11, P.walnut, {...MAT.timber, hard: true, mode: 6, gloss: .30, tag });
    }
    for (const v of [y0 + h * .34, y0 + h * .68]) box(cx, v, z, w, .050, .095, P.walnut,
      {...MAT.timber,  hard: true, mode: 6, gloss: .30, tag });
    for (const v of [y0 + h * .17, y0 + h * .51, y0 + h * .85]) box(cx, v, z, w, .028, .13, accent,
      { hard: true, mode: 1, gloss: .22, tag });
    for (const s of [-1, 1]) box(cx, y0 - .48, z + s * .105, w - .12, .74, .022, accent,
      { hard: true, mode: 1, gloss: .20, tag });
  };
  const screenNS = (x, z0, z1, tag = '屏风', y0 = .95, y1 = 3.10, accent = P.celadon) => {
    const d = z1 - z0, cz = (z0 + z1) / 2, h = y1 - y0, cy = (y0 + y1) / 2;
    box(x, y0 - .48, cz, .18, .96, d, P.walnut, {...MAT.timber, hard: true, mode: 6, gloss: .30, tag });
    box(x, y0 - .945, cz, .24, .09, d + .06, P.walnutD, {...MAT.timber, hard: true, mode: 6, gloss: .26, tag });
    box(x, y0 + .01, cz, .22, .09, d, P.walnutD, {...MAT.timber, hard: true, mode: 6, gloss: .28, tag });
    box(x, y1 + .06, cz, .24, .12, d, P.walnut, {...MAT.timber, hard: true, mode: 6, gloss: .30, tag });
    box(x, y1 + .145, cz, .28, .05, d, P.bronzeD, { hard: true, gloss:AGED, tag });
    const n = Math.max(3, Math.round(d / .42));
    for (let i = 0; i <= n; i++) {
      const pz = z0 + i * d / n;
      box(x, cy, pz, .11, h, .062, P.walnut, {...MAT.timber, hard: true, mode: 6, gloss: .30, tag });
    }
    for (const v of [y0 + h * .34, y0 + h * .68]) box(x, v, cz, .095, .050, d, P.walnut,
      {...MAT.timber,  hard: true, mode: 6, gloss: .30, tag });
    for (const v of [y0 + h * .17, y0 + h * .51, y0 + h * .85]) box(x, v, cz, .13, .028, d, accent,
      { hard: true, mode: 1, gloss: .22, tag });
    for (const s of [-1, 1]) box(x + s * .105, y0 - .48, cz, .022, .74, d - .12, accent,
      { hard: true, mode: 1, gloss: .20, tag });
  };

  // Bilingual door sign, both faces where a guest can approach from both sides.
  // The panel is wide in LOCAL x and thin in LOCAL z, so `ry` turns its face along (sin, cos) —
  // the same vector the glyph offsets use. Getting those two out of step puts a 1.2 m board
  // edge-on through the wall it is supposed to be screwed to.
  const doorSign = (x, y, z, yaw, hz, en, accent = P.jade, tag = hz, both = false) => {
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    box(x, y, z, .86, .40, .10, P.walnutD, {...MAT.timber, hard: true, ry: yaw, mode: 6, gloss: .33, tag });
    for (const s of both ? [-1, 1] : [1]) {
      const q = s > 0 ? yaw : yaw + Math.PI;
      const fx = x + nx * .056 * s, fz = z + nz * .056 * s;
      box(fx, y, fz, .74, .32, .022, accent, { hard: true, ry: q, mode: 1, gloss: .16, tag });
      glyphs(x + nx * .080 * s, y + .06, z + nz * .080 * s, q, hz,
        { size: .115, gap: .026, color: P.cream, mode: 1, glow: .03, lift: .006, tag });
      if (en) glyphs(x + nx * .080 * s, y - .12, z + nz * .080 * s, q, en,
        { size: .046, gap: .010, color: P.bronzeL, mode: 1, lift: .006, tag });
    }
  };

  // ==========================================================================================
  // THE PLAN
  //
  //   z  8.15 .. 14.78   北带 · three enclosed 包间 behind one screen wall, back kitchen, service
  //   z  0.02 ..  7.07   中餐厅 (west) | 明档厨房 show kitchen (east, behind counter and glass)
  //   z -4.60 .. -0.15   京华宴 host gallery — the guest spine, lift landing to west aisle
  //   z -14.78 .. -4.60  候餐茶廊 waiting lounge (west) | 全日餐厅 all-day dining (east)
  //
  // Every coordinate below was checked against the fit-out already standing in hotel-public.js;
  // where a partition would have landed on existing furniture the WALL moved, never the furniture.

  // ---- W1 · gallery north wall, z = -0.15 --------------------------------------------------
  // The 中餐厅 entry keeps hotel-public's 7.4 m portalZ frame at x -10.70..-3.30 and fills it
  // down to a 3.20 m clear opening with two 屏风 leaves, so the entry is still a grand portal.
  wallEW(-.15, -21.86, -10.60, '中餐厅');
  wallEW(-.15, -3.40, 2.68, '中餐厅');
  screenEW(-.15, -10.60, -8.60, '屏风', 1.02, 3.16, P.lacquer);
  screenEW(-.15, -5.40, -3.40, '屏风', 1.02, 3.16, P.lacquer);
  solid(-21.86, -8.60, -.23, -.07);
  solid(-5.40, 2.68, -.23, -.07);
  blocker(-21.88, -8.58, -.26, -.04, WH);
  blocker(-5.42, 2.70, -.26, -.04, WH);

  // ---- W2 · gallery south wall, z = -4.60 ---------------------------------------------------
  wallEW(-4.60, -21.86, -12.95, '候餐茶廊');
  wallEW(-4.60, -11.15, -3.63, '候餐茶廊');
  wallEW(-4.60, -3.47, 4.25, '全日餐厅');
  wallEW(-4.60, 6.05, 13.98, '全日餐厅');
  doorEW(-4.60, -12.05, .90, '候餐茶廊');
  doorEW(-4.60, 5.15, .90, '全日餐厅');

  // ---- W3/W4 · all-day dining side walls ----------------------------------------------------
  wallNS(-3.55, -14.86, -4.52, '全日餐厅');
  wallNS(13.90, -14.86, -4.52, '全日餐厅');

  // ---- W5/W6 · show kitchen flanks ----------------------------------------------------------
  // The east wall carries the staff door on A.route.serviceSpine's own z = 5.10 line, so the
  // service lift reaches the cook line without ever entering the guest gallery.
  wallNS(2.60, -.23, 7.15, '明档厨房');
  wallNS(11.60, -.23, 4.55, '明档厨房');
  wallNS(11.60, 5.65, 7.15, '明档厨房');
  doorNS(11.60, 5.10, .55, '服务通道');

  // ---- W9/W10 · back kitchen envelope -------------------------------------------------------
  wallNS(2.60, 7.15, 14.86, '后厨');
  wallNS(13.08, 6.92, 9.86, '后厨');
  wallEW(9.78, 11.92, 13.00, '后厨');
  wallNS(12.00, 9.70, 14.86, '后厨');
  // The 传菜口 pass unit hotel-public built at x 12.35..13.16 stands against the inside face of
  // that wall. It deliberately gets NO solid: giving the pass one turned the 1.32 m service door
  // beside it into a 0.02 m hairline in the flood fill, and every other rack in this kitchen is
  // non-colliding too, so singling out the pass would have been inconsistent as well as unusable.

  // ---- W11/W12 · the 包间 band --------------------------------------------------------------
  // One screen wall on z = 8.15 with three 1.10 m doors. Rooms one and two keep hotel-public's
  // portalZ frames; room three is new and fills the pocket behind the 中餐厅 identity screen.
  for (const [x0, x1] of [[-16.13, -13.65], [-12.55, -8.00], [-6.90, -2.30], [-1.20, .80]])
    wallEW(8.15, x0, x1, '包间');
  // H225 · the three rooms differ inside — 兰亭轩 is hotel-public's red carpet and ink screen,
  // 松风阁 is this file's lacquer-and-celadon room below, 竹里馆 is hotel-public's jade one — but
  // from the aisle they were three identical lacquer name plates over three identical doors, which
  // is where a guest actually chooses. Each threshold now carries its own accent and its own
  // standing lantern, so the difference is legible before the door rather than only inside it.
  for (const [cx, hz, en, accent, shade] of [
    [-13.10, '兰亭轩', 'PRIVATE 1', P.lacquer, P.silk],
    [-7.45, '松风阁', 'PRIVATE 3', P.celadon, P.celadonL],
    [-1.75, '竹里馆', 'PRIVATE 2', P.jade, P.leaf]]) {
    doorEW(8.15, cx, .55, '包间');
    doorSign(cx + 1.12, 2.02, 8.02, Math.PI, hz, en, accent, '包间');
    // Standing lantern on the aisle side of the jamb. Stone foot, walnut stem, silk shade in the
    // room's own colour, and a bronze cap: five props, no collider, and it is the only thing in
    // the aisle that tells the three doors apart at walking distance.
    const lx = cx - 1.05;
    cyl(lx, .05, 7.70, .21, .09, P.bronzeD, { gloss:AGED, tag: '包间' });
    cyl(lx, .70, 7.70, .035, 1.24, P.walnut, {...MAT.timber, mode: 6, gloss: .28, tag: '包间' });
    A.luminous(taper(lx, 1.52, 7.70, .17, .40, .17, shade,
      { mode: 1, alpha: .90, gloss: .14, tag: '包间' }), .07, .30);
    cyl(lx, 1.74, 7.70, .13, .045, P.bronzeL, { gloss:POLISH, tag: '包间' });
    box(lx, .34, 7.70, .09, .58, .09, accent, { hard: true, mode: 1, gloss: .22, tag: '包间' });
  }
  for (const x of [-16.05, -10.20, -4.70, .72]) wallNS(x, 8.07, 14.86, '包间');

  // ---- W13 · 中餐厅 screen divider ----------------------------------------------------------
  // Splits the 24 m Chinese dining hall into the main 厅堂 and the west 雅座 aisle that leads to
  // the private rooms. A 1.60 m gap, not a door: this is a room divider, not a room boundary.
  screenNS(-15.60, -.07, 3.20, '屏风', .95, 3.10, P.jade);
  screenNS(-15.60, 4.80, 8.07, '屏风', .95, 3.10, P.jade);
  solid(-15.67, -15.53, -.07, 3.20);
  solid(-15.67, -15.53, 4.80, 8.07);
  blocker(-15.69, -15.51, -.09, 3.22, 3.30);
  blocker(-15.69, -15.51, 4.78, 8.09, 3.30);

  // ---- W15 · lounge inner screen ------------------------------------------------------------
  screenEW(-9.60, -14.20, -9.60, '屏风', .95, 3.02, P.celadon);
  screenEW(-9.60, -8.20, -3.63, '屏风', .95, 3.02, P.celadon);
  solid(-14.20, -9.60, -9.68, -9.52);
  solid(-8.20, -3.63, -9.68, -9.52);
  blocker(-14.22, -9.58, -9.70, -9.50, 3.20);
  blocker(-8.22, -3.61, -9.70, -9.50, 3.20);

  // ==========================================================================================
  // W7 · THE SHOW KITCHEN EDGE — see the cooking, do not enter it
  //
  // hotel-public's cook line already stands at z 0.06..1.34 and is 1.46 m high; what it never
  // had was a collider, so a diner walked through the wok range. The counter IS the room
  // boundary here, and it gets one continuous solid plus the end piers and the glass upstand
  // that make it read as a built edge rather than furniture parked in a hall.
  solid(2.52, 11.68, .02, 1.42);
  blocker(2.50, 11.70, .00, 1.44, 1.62);
  for (const [ex, ew] of [[2.75, .30], [11.45, .30]]) {
    box(ex, .70, .70, ew, 1.40, 1.34, P.walnut, {...MAT.timber, hard: true, mode: 6, gloss: .30, tag: '明档厨房' });
    box(ex, 1.44, .70, ew + .06, .10, 1.40, P.copper, { hard: true, gloss: .56, tag: '明档厨房' });
    box(ex, .09, .70, ew + .05, .18, 1.38, P.walnutD, {...MAT.timber, hard: true, mode: 6, gloss: .26, tag: '明档厨房' });
  }
  // Guest-side apron: celadon tile in a bronze grid, so the 8.9 m counter front is not one slab.
  for (let i = 0; i < 12; i++) {
    const px = 2.95 + i * .72;
    box(px, .62, .045, .64, .84, .030, i % 3 === 1 ? P.jade : P.celadon,
      { hard: true, mode: 1, gloss: .21, tag: '明档厨房' });
  }
  capsule(7.10, 1.12, .020, .022, 8.66, .022, P.bronzeL, { rz: Math.PI / 2, gloss:POLISH, tag: '明档厨房' });
  capsule(7.10, .175, .020, .022, 8.66, .022, P.bronzeD, { rz: Math.PI / 2, gloss:AGED, tag: '明档厨房' });
  // Sneeze screen. Two wide panes, not sixteen: alpha < 0.999 does not batch, so this whole
  // 8.6 m run of glass costs exactly two draw calls.
  for (const [gx, gw] of [[4.92, 4.12], [9.28, 4.12]])
    box(gx, 1.74, .09, gw, .50, .022, P.glass,
      { hard: true, mode: 1, alpha: .24, gloss: .84, tag: '明档厨房' });
  for (let i = 0; i < 6; i++) {
    const px = 2.90 + i * 1.72;
    capsule(px, 1.72, .09, .020, .56, .020, P.bronze, { gloss:AGED, tag: '明档厨房' });
    cyl(px, 1.46, .09, .045, .045, P.bronzeD, { gloss:AGED, tag: '明档厨房' });
  }
  capsule(7.10, 2.01, .09, .026, 8.50, .026, P.bronzeL, { rz: Math.PI / 2, gloss:POLISH, tag: '明档厨房' });
  // 出品口 · the plating window the runners actually collect from, cut into the guest edge.
  box(11.05, 1.62, .70, .55, .34, 1.30, P.copper, { hard: true, gloss: .54, tag: '出品口' });
  glyphs(10.99, 1.62, .04, 0, '出品口', { size: .085, gap: .018, color: P.cream, mode: 1, glow: .04,
    lift: .006, tag: '出品口' });

  // ==========================================================================================
  // W8 · SHOW KITCHEN / BACK KITCHEN — the seam this floor is named for
  //
  // hotel-public glazed z = 7.00 from x 2.125..7.975 and 9.875..11.525 and left the rest open.
  // Those two runs become real, the leftover x 11.525..11.68 is closed into the east wall, and
  // the 1.90 m hole between them narrows to a 1.35 m doorway with a jamb pier and a swing pair.
  solid(2.52, 7.98, 6.92, 7.08);
  solid(9.33, 11.68, 6.92, 7.08);
  blocker(2.50, 7.99, 6.90, 7.10, WH);
  blocker(9.31, 11.70, 6.90, 7.10, WH);
  box(9.60, 1.78, 7.00, .55, 3.56, .20, P.steel, { hard: true, gloss: .40, tag: '后厨' });
  box(9.60, .48, 7.00, .58, .96, .24, P.steelD, { hard: true, gloss: .34, tag: '后厨' });
  box(11.60, 1.78, 7.00, .18, 3.56, .20, P.steel, { hard: true, gloss: .40, tag: '后厨' });
  box(8.655, 3.70, 7.00, 1.45, .30, .26, P.walnut, {...MAT.timber, hard: true, mode: 6, gloss: .31, tag: '后厨' });
  box(8.655, 3.50, 7.00, 1.42, .10, .30, P.bronzeD, { hard: true, gloss:AGED, tag: '后厨' });
  // Two leaves standing back against their jambs: a kitchen door that is propped open, which is
  // what a service door between a wok line and a prep room actually looks like at dinner.
  for (const s of [-1, 1]) {
    box(8.655 + s * .60, 1.62, 7.00 + s * .30, .13, 3.20, .58, P.steel,
      { hard: true, ry: s * .48, gloss: .44, tag: '后厨' });
    box(8.655 + s * .60, 2.30, 7.00 + s * .30, .15, .42, .30, P.glass,
      { hard: true, mode: 1, alpha: .28, ry: s * .48, gloss: .80, tag: '后厨' });
  }
  flat(8.655, .028, 7.00, 1.32, .30, P.bronzeD, { gloss:AGED, tag: '后厨' });
  glyphs(8.655, 3.44, 6.86, Math.PI, '员工止步', { size: .095, gap: .020, color: P.bronzeL,
    mode: 1, lift: .006, tag: '后厨' });

  // Service door from the east hall into the back kitchen: the 1.32 m gap left between the show
  // kitchen's east wall and the pass wall, under hotel-public's own 服务 portal.
  box(12.34, 3.70, 7.00, 1.40, .30, .26, P.walnut, {...MAT.timber, hard: true, mode: 6, gloss: .31, tag: '服务通道' });
  for (const s of [-1, 1]) box(12.34 + s * .70, 1.72, 7.00, .16, 3.44, .26, P.walnutD,
    {...MAT.timber,  hard: true, mode: 6, gloss: .29, tag: '服务通道' });
  flat(12.34, .028, 7.00, 1.26, .28, P.bronzeD, { gloss:AGED, tag: '服务通道' });
  doorSign(11.72, 2.30, 6.40, Math.PI / 2, '员工通道', 'STAFF ONLY', P.ink, '服务通道');

  // ==========================================================================================
  // FIT-OUT for the rooms the partitions created. Nothing here touches hotel-public's furniture;
  // these are the volumes that did not exist until the walls above went in.
  const seat = (x, z, ry, c, tag) => {
    box(x, .40, z, .52, .085, .50, P.walnutD, {...MAT.timber, hard: true, mode: 6, gloss: .25, ry, tag });
    box(x, .47, z, .57, .13, .55, c, { gloss: .05, mode: 7, ry, tag });
    const bx = x + Math.sin(ry) * .28, bz = z + Math.cos(ry) * .28;
    box(bx, .80, bz, .57, .68, .11, P.walnutD, {...MAT.timber, gloss: .25, mode: 6, ry, tag });
    box(bx - Math.sin(ry) * .065, .80, bz - Math.cos(ry) * .065, .45, .52, .04, c,
      { gloss: .05, mode: 7, ry, tag });
    for (const dx of [-.22, .22]) for (const dz of [-.20, .20]) {
      const px = x + Math.cos(ry) * dx + Math.sin(ry) * dz;
      const pz = z - Math.sin(ry) * dx + Math.cos(ry) * dz;
      box(px, .20, pz, .05, .40, .05, P.walnut, {...MAT.timber, hard: true, mode: 6, tag });
    }
  };
  const pendant = (x, z, s, tag, y = 3.42) => {
    const top = H - .36, lampTop = y + .25 * s, cord = Math.max(.08, top - lampTop);
    cyl(x, H - .31, z, .15 * s, .10, P.bronzeD, { gloss:AGED, tag });
    capsule(x, (lampTop + top) / 2, z, .022, cord, .022, P.bronze, { gloss:AGED, tag });
    cyl(x, y + .23 * s, z, .20 * s, .045 * s, P.bronzeL, { gloss:POLISH, tag });
    A.luminous(taper(x, y, z, .17 * s, .42 * s, .17 * s, P.warm,
      { mode: 1, alpha: .88, gloss: .18, tag }), .08, .34);
    cyl(x, y - .23 * s, z, .20 * s, .045 * s, P.bronzeL, { gloss:POLISH, tag });
  };
  const sconce = (x, y, z, yaw, tag) => {
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    box(x, y, z, .12, .40, .06, P.walnut, {...MAT.timber, hard: true, ry: yaw, mode: 6, gloss: .30, tag });
    capsule(x + nx * .10, y, z + nz * .10, .022, .20, .022, P.bronzeD,
      { rx: Math.PI / 2, ry: yaw, gloss:AGED, tag });
    A.luminous(taper(x + nx * .22, y, z + nz * .22, .12, .22, .12, P.warm,
      { rx: Math.PI / 2, ry: yaw, mode: 1, gloss: .20, tag }), .07, .30);
  };
  // Framed ink-wash bay: a walnut surround, silk grounds, a bronze branch and a lacquer seal.
  const artBay = (x, y, z, w, h, yaw, tag, accent = P.celadonL) => {
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    box(x, y, z, w, h, .07, P.walnutD, {...MAT.timber, hard: true, ry: yaw, mode: 6, gloss: .31, tag });
    for (let i = 0; i < 3; i++) {
      const u = -w * .33 + i * w * .33;
      box(x + Math.cos(yaw) * u + nx * .045, y, z - Math.sin(yaw) * u + nz * .045,
        w * .29, h - .18, .022, i === 1 ? P.cream : accent,
        { hard: true, ry: yaw, mode: 1, gloss: .08, tag });
    }
    capsule(x + nx * .068, y - h * .04, z + nz * .068, .026, w * .70, .026, P.ink,
      { rz: Math.PI / 2 + .14, ry: yaw, gloss: .10, tag });
    for (let i = 0; i < 4; i++) {
      const u = -w * .28 + i * w * .18;
      ball(x + Math.cos(yaw) * u + nx * .080, y + .06 + Math.sin(i * 1.7) * .20,
        z - Math.sin(yaw) * u + nz * .080, .085, .055, .06, i % 2 ? P.jade : P.bronzeL,
        { mode: 15, gloss: .10, tag });
    }
    box(x + Math.cos(yaw) * w * .33 + nx * .080, y - h * .26, z - Math.sin(yaw) * w * .33 + nz * .080,
      .085, .085, .018, P.lacquer, { hard: true, ry: yaw, mode: 1, glow: .02, tag });
  };
  const credenza = (x, z, w, ry, tag) => {
    box(x, .08, z, w - .10, .16, .50, P.walnutD, {...MAT.timber, hard: true, ry, mode: 6, gloss: .24, tag });
    box(x, .62, z, w, .92, .58, P.walnut, {...MAT.timber, ry, mode: 6, gloss: .30, tag });
    box(x, 1.11, z, w + .09, .10, .66, P.limestoneL, {...MAT.stone, ry, gloss: .23, tag });
    const n = Math.max(2, Math.round(w / .68));
    for (let i = 0; i < n; i++) {
      const u = -w / 2 + (i + .5) * w / n;
      const px = x + Math.cos(ry) * u + Math.sin(ry) * .30;
      const pz = z - Math.sin(ry) * u + Math.cos(ry) * .30;
      box(px, .62, pz, w / n - .07, .70, .028, i % 2 ? P.jade : P.celadon,
        { hard: true, ry, mode: 1, gloss: .20, tag });
      cyl(px, .62, pz + Math.cos(ry) * .022, .030, .030, P.bronzeL,
        { rz: Math.PI / 2, ry, gloss:POLISH, tag });
    }
  };

  // ---- 松风阁 · the third private dining room ----------------------------------------------
  flat(-7.45, .026, 11.45, 5.20, 6.40, P.lacquer, { mode: 7, gloss: .035, tag: '包间' });
  flat(-7.45, .030, 11.45, 4.60, 5.80, P.walnutD, { mode: 7, gloss: .05, tag: '包间' });
  cyl(-7.45, .68, 11.35, .92, .13, P.cream, {...MAT.cloth, gloss: .06, mode: 7, tag: '包间' });
  cyl(-7.45, .36, 11.35, .20, .68, P.walnut, {...MAT.timber, mode: 6, gloss: .28, tag: '包间' });
  const f2Lazy = cyl(-7.45, .775, 11.35, .44, .035, P.celadonL, { gloss: .34, tag: '包间' });
  f2Lazy.ob = null; f2Lazy.fixed = true; f2Lazy.cx = -7.45; f2Lazy.cy = .775; f2Lazy.cz = 11.35;
  f2Lazy.r = 1.2; f2Lazy._m0 = f2Lazy.m;
  const f2Dish = [];
  for (let j = 0; j < 4; j++) {
    const a = j * Math.PI / 2;
    seat(-7.45 + Math.sin(a) * 1.66, 11.35 + Math.cos(a) * 1.66, a, P.silk, '包间');
    cyl(-7.45 + Math.sin(a) * .62, .76, 11.35 + Math.cos(a) * .62, .15, .018, P.white,
      { gloss: .22, tag: '包间' });
    cyl(-7.45 + Math.sin(a) * .78, .79, 11.35 + Math.cos(a) * .78, .045, .11, P.celadon,
      { gloss: .20, tag: '包间' });
    const q = cyl(-7.45 + Math.sin(a) * .24, .82, 11.35 + Math.cos(a) * .24, .105, .025,
      j % 2 ? P.lacquer : P.celadon, { gloss: .22, tag: '包间' });
    q.ob = null; q.fixed = true; q.cx = -7.45; q.cy = .82; q.cz = 11.35; q.r = 1.2; q._m0 = q.m;
    f2Dish.push(q);
  }
  artBay(-7.45, 2.32, 14.62, 3.30, 1.62, Math.PI, '包间', P.celadonL);
  glyphs(-7.45, 3.36, 14.60, Math.PI, '松风阁', { size: .17, gap: .04, color: P.bronzeL, mode: 1,
    glow: .04, lift: .008, tag: '包间' });
  credenza(-9.72, 11.60, 2.10, Math.PI / 2, '包间');
  taper(-9.72, 1.38, 11.60, .17, .30, .14, P.celadon, { gloss: .24, tag: '包间' });
  pendant(-7.45, 11.35, 1.05, '包间', 3.34);
  sconce(-10.09, 2.05, 11.35, Math.PI / 2, '包间');
  sconce(-4.81, 2.05, 11.35, -Math.PI / 2, '包间');
  A.light(-7.45, 3.10, 11.35, [1, .74, .48], .42, 6.2);
  const bao3 = thing('包间', -7.45, 1.20, 11.35, '松风阁是第三间私宴包间，关上门就自成一席。',
    'Songfeng Ge is the third private dining room; with the door shut it is a room of its own.',
    '包间 is a private room; 屏风 is a folding screen.',
    { tag: '包间', focus: [-7.45, 9.30], reach: 2.1 });
  bao3.hotelFixture = { floor: 'hotel2', department: 'food-beverage', tag: '包间', route: A.route };

  // ---- 候餐茶廊 · the waiting tea lounge that the south-west quadrant became ----------------
  flat(-12.30, .022, -6.90, 17.60, 4.20, P.limestone, { mode: 7, gloss: .16, tag: '候餐茶廊' });
  flat(-12.30, .026, -12.20, 17.20, 4.60, P.celadon, { mode: 7, gloss: .04, tag: '候餐茶廊' });
  // Bench positions dodge the 1.80 m lounge door at x -12.95..-11.15 and the stair enclosure
  // hotel.js seals at x <= -17.84; both were checked against their solids, not by eye.
  for (const x of [-16.60, -14.30, -7.60]) {
    box(x, .38, -5.05, 2.30, .12, .62, P.walnutD, {...MAT.timber, hard: true, mode: 6, gloss: .26, tag: '候餐茶廊' });
    box(x, .47, -5.05, 2.40, .16, .68, P.silk, {...MAT.cloth, gloss: .05, mode: 7, tag: '候餐茶廊' });
    box(x, .84, -4.78, 2.40, .60, .14, P.silk, {...MAT.cloth, gloss: .05, mode: 7, tag: '候餐茶廊' });
    for (const dx of [-.95, .95]) for (const dz of [-.22, .22])
      taper(x + dx, .17, -5.05 + dz, .075, .34, .06, P.bronzeD, { gloss:AGED, tag: '候餐茶廊' });
    sconce(x, 2.24, -4.66, Math.PI, '候餐茶廊');
  }
  for (const [x, z] of [[-18.20, -11.60], [-13.60, -11.60], [-7.20, -11.60]]) {
    cyl(x, .49, z, .52, .10, P.walnut, {...MAT.timber, mode: 6, gloss: .30, tag: '候餐茶廊' });
    cyl(x, .25, z, .10, .48, P.walnutD, {...MAT.timber, mode: 6, gloss: .26, tag: '候餐茶廊' });
    cyl(x, .035, z, .30, .06, P.bronzeD, { gloss:AGED, tag: '候餐茶廊' });
    taper(x, .63, z, .11, .17, .11, P.celadon, { gloss: .22, tag: '候餐茶廊' });
    for (const s of [-1, 1]) seat(x + s * 1.18, z, s < 0 ? -Math.PI / 2 : Math.PI / 2,
      P.celadonL, '候餐茶廊');
    shade(x, z, 1.5, 1.3, .20);
  }
  // Tea counter on the south wall, and the 迎宾 podium that meets a guest coming off the stair.
  box(-17.40, .09, -14.10, 4.60, .18, .62, P.walnutD, {...MAT.timber, hard: true, mode: 6, gloss: .26, tag: '茶水' });
  box(-17.40, .60, -14.10, 4.40, .84, .72, P.walnut, {...MAT.timber, mode: 6, gloss: .30, tag: '茶水' });
  box(-17.40, 1.06, -14.10, 4.70, .10, .82, P.limestoneL, {...MAT.stone, gloss: .23, tag: '茶水' });
  for (let i = 0; i < 6; i++) box(-19.30 + i * .76, .60, -13.76, .66, .66, .028,
    i % 2 ? P.jade : P.celadon, { hard: true, mode: 1, gloss: .20, tag: '茶水' });
  for (const x of [-18.70, -17.40, -16.10]) {
    taper(x, 1.28, -14.10, .17, .34, .17, P.celadon, { gloss: .24, tag: '茶水' });
    cyl(x, 1.46, -14.10, .13, .04, P.bronzeL, { gloss:POLISH, tag: '茶水' });
  }
  artBay(-17.40, 2.42, -14.72, 3.60, 1.70, 0, '候餐茶廊', P.silk);
  box(-10.60, .09, -5.40, 1.10, .18, .56, P.walnutD, {...MAT.timber, hard: true, mode: 6, gloss: .26, tag: '迎宾' });
  box(-10.60, .58, -5.40, 1.02, .80, .50, P.walnut, {...MAT.timber, mode: 6, gloss: .30, tag: '迎宾' });
  box(-10.60, 1.02, -5.40, 1.14, .09, .60, P.limestoneL, {...MAT.stone, gloss: .23, tag: '迎宾' });
  box(-10.60, 1.14, -5.66, .74, .16, .05, P.bronzeL, { hard: true, gloss:POLISH, tag: '迎宾' });
  glyphs(-10.60, 1.14, -5.70, Math.PI, '请稍候', { size: .095, gap: .020, color: P.ink, mode: 1,
    lift: .006, tag: '迎宾' });
  for (const [x, z] of [[-20.20, -11.00], [-4.60, -11.20], [-4.60, -6.20]])
    for (let i = 0; i < 5; i++) {
      if (i === 0) { cyl(x, .30, z, .48, .60, P.limestone, {...MAT.stone, gloss: .20, tag: '绿化' });
        cyl(x, .62, z, .50, .07, P.bronze, { gloss:AGED, tag: '绿化' }); continue; }
      ball(x + Math.cos(i * 2.4) * .26, .95 + (i % 3) * .30, z + Math.sin(i * 2.4) * .26,
        .30, .20, .26, i % 2 ? P.leaf : P.jade, { mode: 15, gloss: .09, ry: i, tag: '绿化' });
    }
  for (const [x, z] of [[-17.40, -6.60], [-10.60, -6.60], [-16.40, -11.90], [-8.60, -11.90]])
    pendant(x, z, .92, '候餐茶廊', 3.30);
  A.light(-13.5, 3.20, -6.6, [1, .82, .60], .38, 8.0);
  A.light(-13.5, 3.20, -11.8, [1, .78, .55], .34, 7.4);
  doorSign(-10.35, 2.06, -4.60, 0, '候餐茶廊', 'WAITING LOUNGE', P.celadon, '候餐茶廊', true);
  const teaRoom = thing('候餐茶廊', -14.80, 1.20, -11.60, '候餐茶廊备了热茶，等位的客人可以先坐。',
    'The waiting tea lounge keeps hot tea for guests waiting on a table.',
    '候餐 means waiting for a table; 茶廊 is a tea gallery.',
    { tag: '候餐茶廊', focus: [-14.80, -10.10], reach: 2.0 });
  teaRoom.hotelFixture = { floor: 'hotel2', department: 'food-beverage', tag: '候餐茶廊',
    route: A.route };

  // ---- 洗碗间 · the back hall the service lift actually serves -------------------------------
  flat(17.60, .022, 11.00, 8.20, 7.20, P.tile, { mode: 7, gloss: .14, tag: '洗碗间' });
  for (const z of [8.60, 10.80, 13.00]) {
    box(21.20, .78, z, .90, 1.10, 1.80, P.steel, { hard: true, gloss: .38, tag: '洗碗间' });
    box(21.20, .17, z, .82, .16, 1.66, P.ink, { hard: true, gloss: .18, tag: '洗碗间' });
    box(21.20, 1.36, z, .98, .08, 1.94, P.steel, { hard: true, gloss: .46, tag: '洗碗间' });
    for (let i = 0; i < 2; i++) box(21.30, 1.62 + i * .48, z, .70, .05, 1.70, P.steelD,
      { hard: true, gloss: .40, tag: '洗碗间' });
    for (let i = 0; i < 3; i++) cyl(21.28, 1.70 + (i % 2) * .48, z - .58 + (i % 2) * 1.16,
      .17, .10, i % 2 ? P.white : P.celadonL, { gloss: .24, tag: '洗碗间' });
  }
  solid(20.70, 21.74, 7.60, 13.94);
  for (const [x, z] of [[15.30, 8.40], [15.30, 13.40]]) {
    box(x, .62, z, 1.00, .06, .66, P.steel, { hard: true, gloss: .42, tag: '推车' });
    box(x, .30, z, .96, .05, .62, P.steel, { hard: true, gloss: .40, tag: '推车' });
    for (const dx of [-.42, .42]) for (const dz of [-.26, .26]) {
      capsule(x + dx, .34, z + dz, .022, .60, .022, P.steelD, { gloss: .36, tag: '推车' });
      cyl(x + dx, .045, z + dz, .045, .04, P.ink, { rz: Math.PI / 2, gloss: .22, tag: '推车' });
    }
    capsule(x, .78, z - .30, .022, .90, .022, P.steelD, { rz: Math.PI / 2, gloss: .38, tag: '推车' });
  }
  doorSign(13.24, 2.30, 8.60, Math.PI / 2, '洗碗间', 'DISHWASH', P.jade, '洗碗间');
  glyphs(12.13, 1.72, 12.90, Math.PI / 2, '餐具回收', { size: .105, gap: .022, color: P.bronzeL,
    mode: 1, lift: .006, tag: '洗碗间' });
  A.light(18.4, 3.30, 10.6, [.92, .95, 1], .32, 7.6);

  // ---- restaurant entries and host stands ---------------------------------------------------
  // hotel-public's 京华宴 host desk faces the lift at x 1.0; the all-day room now has a real
  // threshold of its own, so it gets the second stand a floor with two restaurants needs.
  box(6.70, .09, -4.10, 1.20, .18, .58, P.walnutD, {...MAT.timber, hard: true, mode: 6, gloss: .26, tag: '迎宾' });
  box(6.70, .60, -4.10, 1.12, .84, .52, P.walnut, {...MAT.timber, mode: 6, gloss: .30, tag: '迎宾' });
  box(6.70, 1.06, -4.10, 1.24, .09, .62, P.limestoneL, {...MAT.stone, gloss: .23, tag: '迎宾' });
  box(6.70, .60, -4.36, .86, .60, .030, P.jade, { hard: true, mode: 1, gloss: .20, tag: '迎宾' });
  cyl(6.70, 1.22, -4.10, .12, .22, P.celadon, { gloss: .22, tag: '迎宾' });
  doorSign(3.55, 2.06, -4.60, Math.PI, '全日餐厅', 'ALL DAY DINING', P.jade, '全日餐厅', true);
  doorSign(-2.60, 2.10, -.15, Math.PI, '中餐厅', 'CHINESE DINING', P.lacquer, '中餐厅', true);
  // The gallery is 33 m long and hotel-public only lit its eastern end, because until now the
  // west half was undifferentiated hall. Four drops and two lamps carry the spine to the stair.
  for (const x of [-18.20, -11.40, -4.60]) pendant(x, -2.40, .88, '京华宴', 3.44);
  A.light(-17.4, 3.30, -2.40, [1, .80, .58], .36, 8.2);
  A.light(-6.8, 3.30, -2.40, [1, .82, .60], .34, 7.8);

  // ---- camera rooms ------------------------------------------------------------------------
  // Registered smallest-first: the pass niche and the show-kitchen viewing bay sit inside larger
  // volumes, and roomAt takes the first exact match.
  if (A.cameraRoom) {
    A.cameraRoom('hotel2-kitchen-pass', 12.08, 13.00, 7.08, 9.70, 2.30);
    A.cameraRoom('hotel2-show-bay', 2.68, 11.52, -4.52, .02, 2.90);
    A.cameraRoom('hotel2-private-1', -15.97, -10.28, 8.23, 14.78, 2.90);
    A.cameraRoom('hotel2-private-3', -10.12, -4.78, 8.23, 14.78, 2.85);
    A.cameraRoom('hotel2-private-2', -4.62, .64, 8.23, 14.78, 2.85);
    A.cameraRoom('hotel2-show-kitchen', 2.68, 11.52, 1.42, 6.92, 3.05);
    A.cameraRoom('hotel2-back-kitchen', 2.68, 11.92, 7.08, 14.78, 3.35);
    A.cameraRoom('hotel2-all-day', -3.47, 13.82, -14.78, -4.68, 3.60);
    A.cameraRoom('hotel2-tea-lounge', -21.70, -3.63, -14.78, -4.68, 3.55);
    A.cameraRoom('hotel2-chinese', -21.70, 2.52, -.07, 8.07, 3.55);
    A.cameraRoom('hotel2-host-gallery', -21.70, 11.52, -4.52, -.23, 3.20);
    A.cameraRoom('hotel2-service-hall', 13.16, 21.70, 7.08, 14.70, 3.30);
    A.cameraRoom('hotel2-lift-landing', 11.68, 17.84, -7.05, 2.05, 3.65);
  }

  A.onTick(t => {
    const a = t * .068;
    const R = M.mul(M.trans(-7.45, 0, 11.35), M.mul(M.rotY(a), M.trans(7.45, 0, -11.35)));
    f2Lazy.m = M.mul(R, f2Lazy._m0);
    for (const d of f2Dish) d.m = M.mul(R, d._m0);
    A.state.plan = { rooms: 11, privateRooms: 3, doors: 7,
      serviceRoute: ['服务梯 18.15,5.10', '明档厨房 11.60,5.10', '后厨 8.66,7.00'] };
  });


});

// .hotelcheck.js reports 候餐茶廊 as a dead interaction label — it is this file's own `thing()`
// at (-14.80, -11.60) and has never had an action behind it, so the walk-up prompt opens onto
// nothing. The lounge exists to hold a guest who is waiting for a table; that is the action.
Object.assign(HotelUse.hotel2, {
  '候餐茶廊': { zh: '等位喝茶', py: 'děngwèi hē chá', en: 'wait over tea',
    secs: 2.6, mins: 10, gain: { mood: 5, rest: 4 }, pose: { type: 'sit' },
    done: '茶廊的热茶续上了，叫号还没到你。',
    doneTr: 'Your tea is topped up; the lounge has not called your table yet.' },
});
