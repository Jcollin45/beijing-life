// 🏨 京华大酒店 · Floor B1 — the interior architecture
//
// This floor's own module. Registered into HotelFit (declared in js/hotel.js). Nothing else in
// the build writes to this file, and you must not write to anyone else's.
//
// Programme for this level, from HOTEL.md:
//   loading dock, laundry, staff lockers and canteen, housekeeping store, engineering and security
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
//   scene key   hotelB1
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
//     node /private/tmp/claude-501/-Users-jonahcollins-Desktop-Chinesegame/a3cc9bcf-53f0-4e3d-a6a3-24cb996ed8a1/scratchpad/floorprobe.js hotelB1 -22 22 -15 15 15.6 -3.7
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
//   * `node --check js/hotel-fB1.js` after every edit. A backtick inside a template literal
//     ends the string mid-statement; that has broken this project three times.
//
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// WHAT WAS ACTUALLY HERE, AND WHAT THIS FILE ADDS
//
// js/hotel-service.js furnished B1 into seven convincing departments and then left them standing
// in one 1,017 m² hall: 39 colliders, every one of them a piece of equipment, and not a single
// partition. The measured proof is the flood fill — before this file, a body could walk from the
// canteen tables straight into the washing machines without passing anything.
//
// The fit-out did leave the plan behind, though, and it is worth reading before inventing one.
// Five `portalZ`/`portalX` door frames already stand at exact coordinates with no wall around
// them, and three `zSign` boards are fixed at wall depth with no wall behind them. Those eight
// objects ARE the architect's drawing, and every partition below is set to them:
//
//   portal  z=-5.35  x -7.10..-1.50   洗衣房      laundry goods opening off the staff hall
//   portal  z= 6.10  x -6.30..-1.70   员工更衣室  staff changing, off the service corridor
//   portal  z= 5.62  x  2.85.. 6.85   布草间      housekeeping store, off the service corridor
//   portal  z= 7.35  x -15.00..-10.40 工程部      engineering plant, off the service corridor
//   portalX x= 6.35  z -11.05..-7.85  保安部      security, off the staff hall
//   zSign   z= 5.26  x -9.75..-5.35   水洗 · 烘干 carried on the corridor bulkhead below
//   zSign   z=12.95  x  2.10.. 7.60   客房部工作间 carried on the store's north wall
//   screen  z= 4.14  x -16.55..-10.95 员工食堂     the canteen's north wall, already built + solid
//
// Three places where the fit-out's own colliders overlap each other leave no line for a wall at
// all; each is called out at the wall that had to dodge it. They are listed again at the end.
// ---------------------------------------------------------------------------------------------

HotelFit.register('hotelB1', A => {
  const { box, cyl, ball, capsule, taper, flat, glyphs, solid, blocker, shade, glow, thing } = A;
  const { C, col, RX, RZ, H } = A;
  const luminous = A.luminous || (p => p);
  const light = A.light;

  try {
    Glyphs.need(
      '后勤通道货物通道员工通道请刷卡进入保持畅通消防器材灭火器消火栓安全第一注意安全' +
      '配电室备品库垃圾回收间清洁间值班表打卡上下班交接班收货出货暂存区待洗净布草车' +
      '地下一层装卸区洗衣房员工食堂员工更衣室布草间客房部工作间工程部保安部服务通道' +
      '楼梯安全出口小心地滑限高手推车停放处工具间物料架月度检修表厨余纸板玻璃其他待运 · ' +
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ/-'
    );
  } catch (_) {}

  // Finishes chosen to sit inside js/hotel-service.js's own service palette rather than beside it:
  // painted blockwork, a steel skirt that survives trolley wheels, and one departmental colour per
  // door head so a corridor of identical grey openings still tells you which room you are entering.
  const c = {
    paint: C('#c4c2b9'), paintD: C('#bcc2bc'), paintW: C('#bbbeb5'),
    block: C('#b9b8af'), concrete: C('#aaa99f'),
    steel: C('#858c8d'), steelL: C('#b9c1c0'), steelD: C('#485354'),
    green: C('#557b6d'), greenL: C('#86a999'), teal: C('#3f7880'),
    yellow: C('#d2a84e'), red: C('#a83c34'), orange: C('#c46b38'),
    ink: C('#202729'), black: C('#14191b'), white: C('#d6d1c6'),
    warm: C('#ffe0a1'), bronzeD: C('#5e472f'), bronzeL: C('#c5a164'),
    walnut: C('#4b352a'), walnutL: C('#745342'), rubber: C('#343a3b'),
    tileL: C('#bbbdb7'), tileD: C('#59635f'), stoneL: C('#aeb9b4'),
    linen: C('#cec9c1'), linenB: C('#bbcbd0'), glassD: C('#263b42'),
  };

  // The tower material kit, 2026-08-08. Identical tuples to every other hotel module, because
  // build.js:329-331 keys batches on (mat, matScale, matAmt, nrmAmt) — matching numbers let this
  // module's partitions batch with the fit-out's plant instead of doubling the draw calls.
  // Pale values above were regraded at the same time: ART.md puts the ceiling for a non-luminous
  // interior surface at ~0.80 sRGB and painted blockwork was sitting at 0.88-0.95.
  const MAT = {
    stone:  { mat:'plaster', matScale:2.30, matAmt:.16, nrmAmt:.62 },
    timber: { mat:'wood',    matScale:.95,  matAmt:.26, nrmAmt:.34 },
    cloth:  { mat:'fabric',  matScale:.52,  matAmt:.26, nrmAmt:.46 },
    paving: { mat:'concrete',matScale:1.85, matAmt:.17, nrmAmt:.30 },
  };
  const AGED = .34, POLISH = .78;

  // The shell's ceiling slab is box(0, H-.13, 0, ., .26, .) — its underside is at H-.26. Partitions
  // run the full height to that soffit: a service floor has no reason to leave a 200 mm slot over
  // every room, and a wall that reaches the slab is also the only version that occludes anything.
  const WT = .18, WH = H - .26, WY = WH / 2;      // 0.18 m thick, 4.09 m tall
  const DOOR = 2.30, GOODS = 3.00;                // head heights: personnel / goods

  let partitions = 0;

  // HOTEL.md asks for department/floor metadata on key fixtures so a later shifts-and-tasks layer
  // can attach without remodelling. js/hotel-service.js does this with its own `fixture` helper;
  // the four new rooms below carry the same shape so both sets read alike to that future code.
  function fixture(hz, x, z, zh, en, note, department, focus = [x, z], reach = 2.1, y = 1.30) {
    const th = thing(hz, x, y, z, zh, en, note, { tag: hz, focus, reach });
    th.hotelFixture = { floor: A.floor, department, tag: hz, route: A.route };
    return th;
  }

  // A partition is TWO calls with DIFFERENT argument shapes: box() takes a centre and a size,
  // solid() takes a min/max footprint, and `hard:true` is only the sharp-edged-mesh flag — it has
  // never made a collider. Both helpers below take EXTENTS for the run and derive the box centre
  // from them, so the thing you see and the thing that stops you cannot drift apart.
  //
  // No `tag` anywhere in here, deliberately. js/game.js:1982 judges a tagged prop by the centre of
  // its whole tag group, so one shared tag across thirty walls scattered over a 44 x 30 m plate
  // would give them all a single hide/show decision taken at a point in the middle of the floor —
  // the same failure the shell's 墙 group had to opt out of with `nocut`. Untagged partitions are
  // judged one at a time, at their own centres, which is correct.

  function wz(x0, x1, z, o = {}) {                 // wall running along X, at constant Z
    if (x1 - x0 <= .02) return;
    const cx = (x0 + x1) / 2, w = x1 - x0, h = o.h || WH;
    box(cx, h / 2, z, w, h, WT, o.face || c.paint, {...MAT.stone, hard: true, mode: 14, gloss: .11 });
    for (const s of [-1, 1]) {
      box(cx, .135, z + s * (WT / 2 + .022), w, .27, .045, c.steelD, { hard: true, gloss: .34 });
      box(cx, 1.06, z + s * (WT / 2 + .014), w, .07, .028, o.band || c.paintD, { hard: true, gloss: .24 });
      box(cx, h - .10, z + s * (WT / 2 + .020), w, .09, .04, c.steelL, { hard: true, gloss: .42 });
    }
    solid(x0, x1, z - WT / 2 - .01, z + WT / 2 + .01);
    blocker(x0, x1, z - WT / 2 - .03, z + WT / 2 + .03, h + .10);
    partitions++;
  }

  function wx(x, z0, z1, o = {}) {                 // wall running along Z, at constant X
    if (z1 - z0 <= .02) return;
    const cz = (z0 + z1) / 2, d = z1 - z0, h = o.h || WH;
    box(x, h / 2, cz, WT, h, d, o.face || c.paint, {...MAT.stone, hard: true, mode: 14, gloss: .11 });
    for (const s of [-1, 1]) {
      box(x + s * (WT / 2 + .022), .135, cz, .045, .27, d, c.steelD, { hard: true, gloss: .34 });
      box(x + s * (WT / 2 + .014), 1.06, cz, .028, .07, d, o.band || c.paintD, { hard: true, gloss: .24 });
      box(x + s * (WT / 2 + .020), h - .10, cz, .04, .09, d, c.steelL, { hard: true, gloss: .42 });
    }
    solid(x - WT / 2 - .01, x + WT / 2 + .01, z0, z1);
    blocker(x - WT / 2 - .03, x + WT / 2 + .03, z0, z1, h + .10);
    partitions++;
  }

  // A doorway is not a gap in the geometry: the two wall runs either side already carry the only
  // colliders, and everything below hangs in the opening with NO solid of its own. Head, reveal
  // and a departmental colour band, so an opening reads as a door and not as a missing wall.
  function headZ(x0, x1, z, y0, hz, en, accent, side = 0) {
    const cx = (x0 + x1) / 2, w = x1 - x0;
    box(cx, (y0 + WH) / 2, z, w, WH - y0, WT, c.paint, {...MAT.stone, hard: true, mode: 14, gloss: .11 });
    for (const s of [-1, 1]) {
      box(cx, y0 + .075, z + s * (WT / 2 + .020), w, .15, .05, c.steelD, { hard: true, gloss: .40 });
      box(cx, WH - .10, z + s * (WT / 2 + .020), w, .09, .04, c.steelL, { hard: true, gloss: .42 });
      if (accent) luminous(box(cx, y0 + .30, z + s * (WT / 2 + .014), Math.min(w - .30, 2.6), .10, .03,
        accent, { hard: true, mode: 1 }), .03, .13);
    }
    // Reveal linings, but only in openings this file cut. The five heads that sit over the
    // fit-out's own portals already have 0.18 x 0.28 jambs standing in exactly this space, and a
    // second lining inside them is two surfaces fighting for the same pixels.
    if (hz) for (const s of [-1, 1]) box(x0 + (s < 0 ? .045 : w - .045), y0 / 2, z, .09, y0, WT + .10,
      c.steelD, { hard: true, gloss: .38 });
    // Every glyph is its own draw call — build.js:388 leaves them out of the packed batches — so
    // a head only writes a name the opening does not already have. Five of the twelve openings
    // below are the fit-out's own portals and already carry their department name; those get the
    // colour band and nothing else. English goes on the approach face only.
    if (hz) for (const [dz, yaw, s] of [[-(WT / 2 + .028), Math.PI, -1], [WT / 2 + .028, 0, 1]]) {
      glyphs(cx, y0 + .58, z + dz, yaw, hz,
        { size: Math.min(.17, (w - .3) / Math.max(2, [...hz].length)), gap: .03, color: c.white, mode: 1, lift: .007 });
      if (en && (!side || side === s)) glyphs(cx, y0 + .34, z + dz, yaw, en,
        { size: Math.min(.062, (w - .3) / Math.max(2, en.length)), gap: .012, color: c.warm, mode: 1, lift: .006 });
    }
  }

  function headX(x, z0, z1, y0, hz, en, accent, side = 0) {
    const cz = (z0 + z1) / 2, d = z1 - z0;
    box(x, (y0 + WH) / 2, cz, WT, WH - y0, d, c.paint, {...MAT.stone, hard: true, mode: 14, gloss: .11 });
    for (const s of [-1, 1]) {
      box(x + s * (WT / 2 + .020), y0 + .075, cz, .05, .15, d, c.steelD, { hard: true, gloss: .40 });
      box(x + s * (WT / 2 + .020), WH - .10, cz, .04, .09, d, c.steelL, { hard: true, gloss: .42 });
      if (accent) luminous(box(x + s * (WT / 2 + .014), y0 + .30, cz, .03, .10, Math.min(d - .30, 2.6),
        accent, { hard: true, mode: 1 }), .03, .13);
    }
    if (hz) for (const s of [-1, 1]) box(x, y0 / 2, z0 + (s < 0 ? .045 : d - .045), WT + .10, y0, .09,
      c.steelD, { hard: true, gloss: .38 });
    if (hz) for (const [dx, yaw, s] of [[-(WT / 2 + .028), -Math.PI / 2, -1], [WT / 2 + .028, Math.PI / 2, 1]]) {
      glyphs(x + dx, y0 + .58, cz, yaw, hz,
        { size: Math.min(.17, (d - .3) / Math.max(2, [...hz].length)), gap: .03, color: c.white, mode: 1, lift: .007 });
      if (en && (!side || side === s)) glyphs(x + dx, y0 + .34, cz, yaw, en,
        { size: Math.min(.062, (d - .3) / Math.max(2, en.length)), gap: .012, color: c.warm, mode: 1, lift: .006 });
    }
  }

  // ===========================================================================================
  // 1 · LOADING DOCK 装卸区 — x -21.78..-5.63, z -14.78..-7.63
  // The shutter, receiving platform and pallet stacks are already here; what was missing is the
  // back of the room. Goods leave north to the west lobby and east to the staff hall.
  // ===========================================================================================
  wz(-17.84, -13.15, -7.72);                       // north wall, west of the goods opening
  wz(-10.55, -5.63, -7.72);                        // north wall, east of it  -> 2.60 m clear
  headZ(-13.15, -10.55, -7.72, GOODS, '货物通道', 'GOODS ROUTE', c.yellow, 1);
  wx(-5.72, -14.78, -11.90);                       // east wall, south of the opening
  wx(-5.72, -9.90, -7.63);                         // east wall, north of it  -> 2.00 m clear
  headX(-5.72, -11.90, -9.90, GOODS, '装卸区', 'RECEIVING', c.yellow, 1);

  // ===========================================================================================
  // 2 · STAFF CANTEEN 员工食堂 — x -16.91..-11.21, z -1.21..4.05
  // The canteen already owns its north side: the post-and-header servery screen at z 4.04..4.23
  // is solid from x -16.55 to -10.95, so the room needs a west wall, a short infill to reach that
  // screen, a south wall with the door, and an east wall against the washer bank.
  //
  // CONFLICT (1 of 3): the east wall can only stand at x -11.21..-11.03. West of that it would cut
  // the canteen table at (-11.45, 0.15), whose top runs to x -10.775; east of it the washing
  // machines' plinths start at x -11.03. The two existing colliders overlap by 0.27 m, so no clear
  // line exists. The wall is set to the machines and the table butts end-on into it, which is what
  // a table against a wall looks like anyway; the 0.245 m that passes through emerges inside the
  // machine at z 0.05 and is not visible from either room.
  // ===========================================================================================
  wx(-17.00, -1.40, 4.24);                         // west wall
  wz(-17.10, -16.48, 4.14);                        // north infill, west of the existing screen
  wz(-17.10, -14.20, -1.30);                       // south wall, west of the door
  wz(-13.10, -11.03, -1.30);                       // south wall, east of it  -> 1.10 m clear
  headZ(-14.20, -13.10, -1.30, DOOR, '员工食堂', 'STAFF CANTEEN', c.green, -1);
  // The canteen's south wall is its only long blank face. A shift noticeboard is what staff rooms
  // actually put there, and it sits on the wall with no collider of its own.
  box(-15.55, 1.78, -1.185, 2.60, 1.22, .05, c.ink, { hard: true, gloss: .18, tag: '值班表' });
  box(-15.55, 1.78, -1.155, 2.44, 1.08, .02, c.white, { hard: true, mode: 1, gloss: .12, tag: '值班表' });
  for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++)
    box(-16.55 + q * .66, 1.98 - r * .34, -1.145, .52, .26, .014, (r + q) % 3 ? c.paintD : c.greenL,
      { hard: true, mode: 1, gloss: .10, tag: '值班表' });
  glyphs(-15.55, 2.52, -1.145, Math.PI, '交接班 · 值班表',
    { size: .105, gap: .024, color: c.greenL, mode: 1, lift: .006, tag: '值班表' });
  for (const s2 of [-1, 1]) box(-15.55 + s2 * 1.34, 1.78, -1.16, .07, 1.32, .05, c.bronzeD,
    { hard: true, gloss:AGED, tag: '值班表' });

  // ===========================================================================================
  // 3 · LAUNDRY 洗衣房 — x -11.03..3.51, z -5.25..4.21, with the washer bay stepping north to 5.33
  // ===========================================================================================
  wx(-11.12, -5.45, 5.51);                         // west wall: canteen, then corridor, then bay
  wz(-11.22, -7.10, -5.35);                        // south wall, west of the existing portal
  wz(-1.50, 3.70, -5.35);                          // south wall, east of it  -> 5.24 m clear
  headZ(-7.10, -1.50, -5.35, 3.42, null, null, c.teal);      // 洗衣房 portal writes its own name
  wx(3.60, -5.45, -1.20);                          // east wall, south of the cart opening
  wx(3.60, 0.80, 4.40);                            // east wall, north of it  -> 2.00 m clear
  headX(3.60, -1.20, 0.80, GOODS, '布草车', 'LINEN CARTS', c.teal, 1);
  wz(-9.08, -1.60, 4.30);                          // north wall, west of the door
  wz(-0.50, 3.70, 4.30);                           // north wall, east of it  -> 1.10 m clear
  headZ(-1.60, -0.50, 4.30, DOOR, '洗衣房', 'LAUNDRY', c.teal, 1);
  wz(-11.22, -9.28, 5.42);                         // washer bay, north wall (machines back onto it)
  wx(-9.18, 4.20, 5.52);                           // the step between bay depth and room depth
  // Wet-room lining, laundry side only. HT-B1-SVC-overview showed a 4 m tall blank painted plane
  // behind the presses, which is the "unfinished grey space" HOTEL.md rules out for back of house.
  // A tiled dado to 1.72 m with a teal cap is what a real laundry has and costs no collider: it is
  // 40 mm proud of the wall face, clear of the skirting below and covering the painted dado line.
  const tile = (cx, cz, w, d) => {
    box(cx, 1.00, cz, w, 1.44, d, c.tileL, {...MAT.stone, hard: true, mode: 14, gloss: .30 });
    box(cx, 1.745, cz, w, .05, d + .008, c.teal, { hard: true, gloss: .46 });
  };
  for (const [x0, x1] of [[-11.22, -7.10], [-1.50, 3.70]]) tile((x0 + x1) / 2, -5.235, x1 - x0, .04);
  for (const [x0, x1] of [[-9.08, -1.60], [-0.50, 3.70]]) tile((x0 + x1) / 2, 4.185, x1 - x0, .04);
  for (const [z0, z1] of [[-5.45, -1.20], [0.80, 4.40]]) tile(3.485, (z0 + z1) / 2, .04, z1 - z0);
  tile(-11.005, .03, .04, 10.96);

  // ===========================================================================================
  // 4 · ENGINEERING 工程部 — x -21.78..-8.81, z 7.44..14.78
  // ===========================================================================================
  wz(-21.78, -15.00, 7.35);                        // south wall, west of the existing portal
  wz(-10.40, -8.62, 7.35);                         // south wall, east of it  -> 4.24 m clear
  headZ(-15.00, -10.40, 7.35, 3.42, null, null, c.orange);   // 工程部 portal writes its own name
  wx(-8.72, 7.26, 14.78);                          // east wall, against the changing room
  // CONFLICT (2 of 3): the engineering status panel (x -11.375..-8.625) and the locker bank
  // (x -8.82..0.82) already interpenetrate at z 7.89..8.11, so there is no clear line here either.
  // The wall is placed so the panel dies into its west face and the locker bank into its east
  // face — both read as built up to the wall, which is how they would really be installed.

  // ===========================================================================================
  // 5 · STAFF CHANGING 员工更衣室 — x -8.63..0.88, z 6.19..14.78
  // ===========================================================================================
  wz(-8.81, -6.30, 6.10);                          // south wall, west of the existing portal
  wz(-1.70, 1.06, 6.10);                           // south wall, east of it  -> 4.24 m clear
  headZ(-6.30, -1.70, 6.10, 3.42, null, null, c.greenL);     // 员工更衣室 portal writes its own
  wx(0.97, 5.53, 9.80);                            // east wall, south of the connecting door
  wx(0.97, 10.90, 14.78);                          // east wall, north of it  -> 1.10 m clear
  headX(0.97, 9.80, 10.90, DOOR, '布草间', 'LINEN', c.linenB, -1);

  // ===========================================================================================
  // 6 · HOUSEKEEPING STORE 客房部工作间 — x 1.06..9.53, z 5.71..13.01, plus the rear bulk bay
  // Two openings, both earned: the authored portal for staff, and a cart-width goods opening at
  // the east end exactly where the painted 服务通道 route arrives from the service lift.
  // ===========================================================================================
  wz(0.88, 2.85, 5.62);                            // south wall, west of the existing portal
  wz(6.85, 8.42, 5.62);                            // south wall, between portal and goods opening
  headZ(2.85, 6.85, 5.62, 3.42, null, null, c.linenB);       // 布草间 portal writes its own name
  headZ(8.42, 9.53, 5.62, GOODS, '服务通道', 'SERVICE ROUTE', c.green, -1);
  wx(9.62, 5.53, 13.20);                           // east wall
  wz(0.88, 9.71, 13.10);                           // north wall — carries the authored 客房部工作间 board

  // ===========================================================================================
  // 7 · SECURITY 保安部 — x 6.44..13.21, z -14.78..-6.79
  // The CCTV back wall box(13.30, 1.55, -9.45, .18, 2.80, 3.75) was already drawn and, like every
  // other piece on this floor, carried no collider. It is completed upward and given one here
  // rather than duplicated.
  // ===========================================================================================
  wx(6.35, -14.78, -11.05);                        // west wall, south of the existing portalX
  wx(6.35, -7.85, -6.61);                          // west wall, north of it  -> 2.84 m clear
  headX(6.35, -11.05, -7.85, 3.42, null, null, c.red);       // 保安部 portalX writes its own
  wz(6.26, 13.39, -6.70);                          // north wall
  wx(13.30, -14.78, -11.34);                       // east wall, south of the authored CCTV panel
  wx(13.30, -7.56, -6.61);                         // east wall, north of it
  box(13.30, (2.95 + WH) / 2, -9.45, WT, WH - 2.95, 3.75, c.paint, {...MAT.stone, hard: true, mode: 14, gloss: .11 });
  solid(13.20, 13.40, -11.34, -7.56);              // the collider the authored panel never had
  blocker(13.18, 13.42, -11.36, -7.54, WH + .10);

  // ===========================================================================================
  // 8 · THE SERVICE CORRIDOR — what the partitions above actually made
  //
  // Between the canteen/laundry line and the engineering/changing line there is now a continuous
  // 1.60–2.90 m spine running from the west end of the floor to the goods yard, with all four
  // authored portals opening off it. It is the piece the fit-out drew signs for and never got.
  //
  // The 水洗 · 烘干 board sits at z 5.195..5.325 with nothing behind it. Rather than drag the
  // laundry's north wall up to it — which would have pinched the corridor to 0.64 m, below the
  // 0.60 m a 0.30 m body needs to pass at all — the board is given the bulkhead it was drawn for:
  // a high-level duct run at 2.91 m, which is also why the sign was placed at eye-level 3.43.
  // ===========================================================================================
  box(-5.575, 3.50, 5.41, 7.25, 1.18, .30, c.paint, {...MAT.stone, hard: true, mode: 14, gloss: .11 });
  for (const s of [-1, 1]) box(-5.575, 2.94, 5.41 + s * .16, 7.25, .08, .05, c.steelL, { hard: true, gloss: .44 });
  // Colour-coded services under the bulkhead, running on to the engineering pipes at x -10.15.
  for (const [dy, tint] of [[.00, c.teal], [.22, c.orange], [.44, c.greenL]]) {
    capsule(-5.575, 2.36 + dy, 5.30, .075, 7.15, .075, tint, { rz: Math.PI / 2, gloss: .46 });
    for (const x of [-8.6, -6.2, -3.8, -2.3]) cyl(x, 2.36 + dy, 5.30, .125, .06, c.steelD, { rz: Math.PI / 2, gloss: .50 });
  }
  // Cove z is per-lamp: the corridor's north edge steps from the engineering wall down to the
  // changing wall and then to the store wall, and a fitting set by eye lands inside one of them.
  for (const [x, z] of [[-15.6, 5.80], [-12.4, 5.80], [-8.0, 5.30], [-4.4, 5.30], [-1.2, 5.30], [1.9, 4.94]]) {
    box(x, WH - .16, z, 1.30, .10, .34, c.steelD, { hard: true, gloss: .40 });
    luminous(box(x, WH - .23, z, 1.14, .05, .26, c.white, { hard: true, mode: 1 }), .16, .34);
    light(x, WH - .40, z, c.white, .55, 4.2);
  }
  // Painted route: the authored 服务通道 strip stops dead at x 8.6. Carry it west along the spine
  // it now belongs to, and turn it into the four doors, so the floor tells you where to walk.
  for (let i = 0; i < 28; i++) {
    const x = 8.30 - i * .62;
    if (x < -8.80) break;
    flat(x, .031, 5.05, .40, .11, i % 2 ? c.greenL : c.green, { gloss: .22 });
  }
  for (let i = 0; i < 3; i++) flat(-8.95, .031, 5.24 + i * .38, .11, .40, i % 2 ? c.greenL : c.green, { gloss: .22 });
  for (let i = 0; i < 13; i++) {
    const x = -9.30 - i * .62;
    if (x < -16.9) break;
    flat(x, .031, 6.40, .40, .11, i % 2 ? c.greenL : c.green, { gloss: .22 });
  }
  for (const [x, z0, z1] of [[-12.70, 5.70, 7.10], [-4.00, 5.70, 6.00], [4.85, 5.05, 5.45], [-1.05, 4.55, 5.05]])
    for (let i = 0; i * .38 < z1 - z0; i++)
      flat(x, .031, z0 + i * .38 + .12, .40, .11, i % 2 ? c.greenL : c.green, { gloss: .22 });
  // Fire point and a wall-mounted first-aid station: back of house is inspected, so it is signed.
  // Each z below is the north FACE of a real wall plus its proud skirting, not the wall centreline:
  // the canteen servery screen (4.23), the laundry's north wall (4.4345) and security's north wall
  // (-6.5655). All three read from the corridor or yard side.
  for (const [x, z] of [[-13.9, 4.27], [-3.0, 4.45], [7.5, -6.56]]) {
    box(x, .95, z + .07, .52, 1.55, .12, c.red, { hard: true, gloss: .26 });
    cyl(x - .13, .78, z + .17, .095, .52, c.red, { gloss: .40 });
    cyl(x - .13, 1.07, z + .17, .035, .16, c.steelL, { gloss: .58 });
    box(x + .15, .95, z + .16, .20, .26, .10, c.white, { hard: true, gloss: .30 });
    box(x, 1.86, z + .075, .60, .17, .03, c.white, { hard: true, mode: 1, gloss: .20 });
    glyphs(x, 1.86, z + .10, 0, '消防器材', { size: .10, gap: .022, color: c.red, mode: 1, lift: .006 });
  }

  // ===========================================================================================
  // 9 · STAFF ENTRANCE HALL 员工通道 — x -5.62..6.26, z -14.78..-5.45
  // The authored 员工入口 board is on the south shell wall and the hall behind it was bare floor.
  // This is where every shift starts, so it gets the things a shift actually touches: card
  // readers, the duty board, a boot mat, a bench and a clear sightline to the goods yard.
  // ===========================================================================================
  flat(0.30, .019, -10.10, 11.4, 9.0, c.tileD, { mode: 7, gloss: .12, tag: '员工入口' });
  flat(-3.35, .026, -13.55, 3.10, 1.70, c.rubber, { mode: 7, gloss: .06, tag: '员工入口' });
  for (const s of [-1, 1]) {                                            // card-reader gate posts
    box(-3.35 + s * 1.05, .58, -12.30, .30, 1.16, .34, c.steelD, { hard: true, gloss: .38, tag: '员工入口' });
    box(-3.35 + s * 1.05, 1.20, -12.30, .34, .10, .38, c.steelL, { hard: true, gloss: .52, tag: '员工入口' });
    luminous(box(-3.35 + s * .92, 1.02, -12.13, .10, .14, .02, c.greenL,
      { hard: true, mode: 1, tag: '员工入口' }), .06, .17);
    box(-3.35 + s * .93, .98, -12.11, .17, .22, .035, c.ink, { hard: true, gloss: .30, tag: '员工入口' });
    solid(-3.35 + s * 1.05 - .17, -3.35 + s * 1.05 + .17, -12.49, -12.11);
  }
  // The instruction needs something to be written ON. Free glyphs at 1.52 m read, from the entrance
  // camera, as text floating across the door two metres behind them; a gate header at 2.42 m sits
  // above the 2.30 m passage, is carried by the posts, and cannot be confused with the door.
  box(-3.35, 2.42, -12.30, 2.46, .34, .12, c.steelD, { hard: true, gloss: .38, tag: '员工入口' });
  for (const s of [-1, 1]) box(-3.35 + s * 1.05, 2.42, -12.30, .34, .38, .16, c.steel, { hard: true, gloss: .44, tag: '员工入口' });
  for (const [dz, yaw] of [[-.075, Math.PI], [.075, 0]])
    glyphs(-3.35, 2.44, -12.30 + dz, yaw, '请刷卡进入',
      { size: .105, gap: .024, color: c.greenL, mode: 1, lift: .006, tag: '员工入口' });
  fixture('员工入口', -3.35, -12.30, '刷卡进入后勤区，交接班在此签到。',
    'Staff tap in here; shift handover is signed at this gate.',
    '刷卡 means to tap a card. 交接班 is a shift handover.', 'housekeeping', [-3.35, -13.6], 2.2);
  // Duty board and roster, on the east face of the dock wall so it faces the incoming shift.
  box(-5.58, 1.72, -10.20, .07, 1.42, 3.10, c.ink, { hard: true, gloss: .18, tag: '值班表' });
  box(-5.54, 1.72, -10.20, .025, 1.28, 2.94, c.white, { hard: true, mode: 1, gloss: .12, tag: '值班表' });
  glyphs(-5.51, 2.28, -10.20, -Math.PI / 2, '值班表', { size: .13, gap: .03, color: c.ink, mode: 1, lift: .006, tag: '值班表' });
  glyphs(-5.51, 2.08, -10.20, -Math.PI / 2, 'DUTY ROSTER', { size: .052, gap: .011, color: c.steel, mode: 1, lift: .006, tag: '值班表' });
  for (let r = 0; r < 5; r++) for (let q = 0; q < 6; q++)
    box(-5.52, 1.86 - r * .21, -11.42 + q * .47, .02, .085, .38, (r + q) % 3 ? c.paintD : c.greenL,
      { hard: true, mode: 1, gloss: .10, tag: '值班表' });
  for (const y of [.98, 2.46]) box(-5.55, y, -10.20, .06, .06, 3.20, c.bronzeD, { hard: true, gloss:AGED, tag: '值班表' });
  // Bench, boot rack and a wet-floor caddy: the hall is used, not staged.
  box(1.65, .46, -12.90, 2.60, .13, .48, c.walnutL, {...MAT.timber, hard: true, mode: 6, gloss: .24, tag: '员工入口' });
  for (const s of [-1, 1]) box(1.65 + s * 1.08, .23, -12.90, .12, .46, .42, c.steelD, { hard: true, gloss: .40, tag: '员工入口' });
  box(1.65, .16, -12.52, 2.60, .32, .30, c.steel, { hard: true, gloss: .34, tag: '员工入口' });
  solid(0.28, 3.02, -13.16, -12.34);
  for (let i = 0; i < 5; i++) box(0.60 + i * .52, .10, -12.52, .30, .11, .18, i % 2 ? c.ink : c.walnut, { tag: '员工入口' });
  taper(4.25, .38, -11.70, .13, .30, .13, c.yellow, { tag: '员工入口' });
  box(4.25, .68, -11.70, .30, .44, .03, c.yellow, { hard: true, ry: .3, tag: '员工入口' });
  glyphs(4.25, .70, -11.68, .3, '小心地滑', { size: .075, gap: .016, color: c.ink, mode: 1, lift: .005, tag: '员工入口' });
  for (const x of [-4.4, 1.2, 5.0]) light(x, WH - .45, -10.4, c.white, .48, 5.0);

  // ===========================================================================================
  // 10 · WEST BACK-OF-HOUSE CORRIDOR 后勤通道 — x -21.78..-17.10, z -5.34..7.26
  // Walling the canteen at x -17.00 (its own tall units end at -16.85) leaves a 4.7 m spine down
  // the west side linking the fire stair, the dock, the canteen door and engineering. Left empty
  // it would be the "unfinished grey space" HOTEL.md forbids, so it does the job a hotel basement
  // gives this run: refuse and recycling, a cleaner's sink, and the risers.
  // ===========================================================================================
  flat(-19.45, .019, 1.10, 4.55, 12.3, c.tileD, { mode: 7, gloss: .12, tag: '后勤通道' });
  for (const z of [-3.6, 0, 3.6, 6.4]) flat(-19.45, .030, z, 3.90, .11, c.greenL, { gloss: .22, tag: '后勤通道' });
  for (const [z, tint, hz] of [[-1.10, c.green, '厨余'], [.10, c.linenB, '纸板'], [1.30, c.yellow, '玻璃'], [2.50, c.steelD, '其他']]) {
    box(-21.10, .52, z, .78, 1.00, .96, tint, {...MAT.timber, hard: true, mode: 6, gloss: .22, tag: '垃圾回收间' });
    box(-21.10, 1.07, z, .80, .10, .98, c.steelD, { hard: true, gloss: .40, tag: '垃圾回收间' });
    box(-20.68, .68, z, .06, .30, .34, c.steelL, { hard: true, gloss: .52, tag: '垃圾回收间' });
    for (const s of [-1, 1]) cyl(-21.28, .10, z + s * .38, .10, .07, c.rubber, { rz: Math.PI / 2, tag: '垃圾回收间' });
    glyphs(-20.69, 1.22, z, -Math.PI / 2, hz, { size: .085, gap: .02, color: c.white, mode: 1, lift: .006, tag: '垃圾回收间' });
    solid(-21.50, -20.66, z - .50, z + .50);
  }
  box(-21.30, 2.10, .70, .10, 1.30, 4.60, c.paintD, {...MAT.stone, hard: true, mode: 14, gloss: .13, tag: '垃圾回收间' });
  glyphs(-21.23, 2.44, .70, -Math.PI / 2, '垃圾回收间', { size: .135, gap: .032, color: c.greenL, mode: 1, lift: .007, tag: '垃圾回收间' });
  glyphs(-21.23, 2.18, .70, -Math.PI / 2, 'REFUSE / RECYCLING', { size: .052, gap: .011, color: c.white, mode: 1, lift: .006, tag: '垃圾回收间' });
  fixture('垃圾回收间', -20.95, .70, '厨余、纸板和玻璃分四类暂存，夜班运往装卸区。',
    'Food waste, cardboard and glass are sorted here and taken to receiving on nights.',
    '回收 means recycling. 厨余 is food waste.', 'housekeeping', [-19.5, .70], 2.3);
  // Cleaner's sink and mop rack against the canteen wall, plus the riser cupboard doors.
  box(-17.28, .42, 5.30, .48, .84, 1.05, c.steelL, { hard: true, gloss: .44, tag: '清洁间' });
  box(-17.28, .87, 5.30, .50, .07, 1.07, c.steel, { hard: true, gloss: .58, tag: '清洁间' });
  cyl(-17.34, 1.18, 5.30, .022, .40, c.bronzeL, { gloss:POLISH, tag: '清洁间' });
  capsule(-17.30, 1.38, 5.30, .022, .30, .022, c.bronzeL, { rz: Math.PI / 2, gloss:POLISH, tag: '清洁间' });
  for (let i = 0; i < 4; i++) capsule(-17.42, 1.30, 4.85 + i * .30, .022, 1.50, .022, i % 2 ? c.walnutL : c.steelD, { tag: '清洁间' });
  box(-17.10, 1.62, 4.95, .05, 1.20, 1.80, c.steelD, { hard: true, gloss: .38, tag: '清洁间' });
  solid(-17.60, -16.98, 4.70, 5.90);
  for (const z of [-.60, 1.70]) {                                       // riser cupboards
    box(-16.98, 1.42, z, .10, 2.60, 1.10, c.paintD, {...MAT.timber, hard: true, mode: 6, gloss: .22, tag: '后勤通道' });
    for (const s of [-1, 1]) box(-16.92, 1.42, z + s * .53, .045, 2.52, .05, c.steelD, { hard: true, gloss: .44, tag: '后勤通道' });
    cyl(-16.90, 1.30, z + .40, .035, .09, c.bronzeL, { rz: Math.PI / 2, gloss:POLISH, tag: '后勤通道' });
    box(-16.91, 2.34, z, .02, .17, .62, c.yellow, { hard: true, mode: 1, gloss: .20, tag: '后勤通道' });
  }
  glyphs(-16.89, 2.34, -.60, -Math.PI / 2, '配电室', { size: .085, gap: .02, color: c.ink, mode: 1, lift: .005, tag: '后勤通道' });
  glyphs(-16.89, 2.34, 1.70, -Math.PI / 2, '工具间', { size: .085, gap: .02, color: c.ink, mode: 1, lift: .005, tag: '后勤通道' });
  for (const z of [-3.2, .8, 4.8]) light(-19.6, WH - .45, z, c.white, .50, 5.0);
  // Way-finding at the stair landing: three arms, so the fire stair is not a dead end in the plan.
  box(-15.35, 2.62, -7.10, .09, .62, 1.90, c.ink, { hard: true, gloss: .20, tag: '后勤通道' });
  glyphs(-15.29, 2.76, -7.10, -Math.PI / 2, '装卸区 · 员工通道', { size: .095, gap: .022, color: c.white, mode: 1, lift: .006, tag: '后勤通道' });
  glyphs(-15.29, 2.50, -7.10, -Math.PI / 2, '员工食堂 · 工程部', { size: .095, gap: .022, color: c.greenL, mode: 1, lift: .006, tag: '后勤通道' });
  for (const s of [-1, 1]) box(-15.35, 1.62, -7.10 + s * .86, .10, 1.38, .10, c.steelD, { hard: true, gloss: .40, tag: '后勤通道' });

  // ===========================================================================================
  // 11 · GOODS YARD 货物通道 — x 3.70..17.60, z -5.25..5.53
  // The passenger landing, the service-lift landing, the laundry cart door, the store's goods
  // opening and the staff hall all meet in this one room, which is exactly why nothing may be
  // parked in the middle of it. Marked lanes, protected corners, and the stock along the edges.
  // ===========================================================================================
  flat(10.55, .018, .10, 13.5, 10.4, c.tileD, { mode: 7, gloss: .12, tag: '货物通道' });
  for (const z of [-4.35, 4.35]) flat(10.55, .028, z, 13.1, .13, c.yellow, { gloss: .24, tag: '货物通道' });
  for (const x of [4.30, 16.60]) flat(x, .028, .10, .13, 8.5, c.yellow, { gloss: .24, tag: '货物通道' });
  for (let i = 0; i < 11; i++) flat(5.10 + i * .58, .029, -3.20, .40, .40, i % 2 ? c.yellow : c.ink,
    { ry: .78, gloss: .22, tag: '货物通道' });                        // hatched keep-clear at the lifts
  for (const [x, z] of [[14.30, -5.05], [14.30, 1.90], [9.90, -5.05]]) {   // corner bollards
    cyl(x, .48, z, .095, .96, c.yellow, { gloss: .34, tag: '货物通道' });
    box(x, .04, z, .34, .08, .34, c.steelD, { hard: true, gloss: .40, tag: '货物通道' });
    for (const y of [.62, .80]) cyl(x, y, z, .10, .07, c.ink, { gloss: .20, tag: '货物通道' });
    solid(x - .16, x + .16, z - .16, z + .16);
  }
  // Cage trolleys and a linen-cart rank, held on the marked strip against the security wall.
  for (let i = 0; i < 4; i++) {
    const x = 6.30 + i * 1.62;
    box(x, .13, -5.75, 1.20, .16, .82, c.steelD, { hard: true, gloss: .38, tag: '手推车停放处' });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      capsule(x + sx * .50, .68, -5.75 + sz * .34, .028, 1.22, .028, c.steel, { gloss: .48, tag: '手推车停放处' });
      cyl(x + sx * .50, .06, -5.75 + sz * .34, .075, .05, c.rubber, { rz: Math.PI / 2, tag: '手推车停放处' });
    }
    for (let v = 0; v < 5; v++) capsule(x, .34 + v * .28, -6.13, .022, 1.16, .022, c.steel, { rz: Math.PI / 2, gloss: .46, tag: '手推车停放处' });
    if (i < 3) for (let b = 0; b < 3; b++)
      box(x + (b - 1) * .34, .40 + (b % 2) * .30, -5.75, .30, .26, .60, b % 2 ? c.linen : c.linenB,
        {...MAT.cloth,  mode: 7, gloss: .05, tag: '手推车停放处' });
    box(x - .38, .96, -6.11, .26, .17, .02, i % 2 ? c.greenL : c.yellow, { hard: true, mode: 1, tag: '手推车停放处' });
    solid(x - .62, x + .62, -6.20, -5.32);
  }
  flat(9.55, .030, -6.55, 8.10, .13, c.greenL, { gloss: .22, tag: '手推车停放处' });
  // glyphs() builds vertical quads (build.js:127 fixes rotX to PI/2), so this label goes on the
  // security wall behind the rank rather than being painted flat on the slab.
  box(9.55, 1.92, -6.58, 2.70, .46, .04, c.ink, { hard: true, gloss: .18, tag: '手推车停放处' });
  glyphs(9.55, 1.96, -6.55, 0, '手推车停放处', { size: .135, gap: .032, color: c.greenL, mode: 1, lift: .006, tag: '手推车停放处' });
  glyphs(9.55, 1.72, -6.55, 0, 'TROLLEY PARK - KEEP CLEAR', { size: .050, gap: .010, color: c.warm, mode: 1, lift: .006, tag: '手推车停放处' });
  // Pallet racking on the yard's north edge. Twice moved: off the painted 服务通道 strip its own
  // label tells staff to keep clear, and then out of the HT-SVC-B1-route lens at (11.5, 5.10),
  // where a 2.68 m upright 0.28 m from the camera was the entire shot.
  for (const x of [11.30, 15.30]) {
    box(x, .11, 8.60, 2.20, .22, 1.05, c.steelD, { hard: true, gloss: .36, tag: '暂存区' });
    for (const sx of [-1, 1]) box(x + sx * 1.02, 1.45, 8.60, .13, 2.68, 1.05, c.orange, { hard: true, gloss: .32, tag: '暂存区' });
    for (const y of [.92, 1.86, 2.72]) box(x, y, 8.60, 2.02, .09, 1.02, c.steelL, { hard: true, gloss: .42, tag: '暂存区' });
    for (let j = 0; j < 4; j++) {
      const bx = x - .72 + (j % 3) * .72, by = [.98, 1.92, 2.78][j % 3] + .30;
      box(bx, by, 8.60, .60, .52, .80, j % 2 ? c.linenB : c.concrete, { mode: 7, gloss: .07, tag: '暂存区' });
      box(bx, by + .27, 8.60, .62, .035, .82, c.walnutL, { hard: true, gloss: .16, tag: '暂存区' });
    }
    solid(x - 1.12, x + 1.12, 8.03, 9.17);
  }
  glyphs(13.30, 3.36, 8.01, Math.PI, '暂存区 · 待运', { size: .12, gap: .028, color: c.yellow, mode: 1, lift: .007, tag: '暂存区' });
  fixture('暂存区', 13.30, 7.95, '到货和待运布草在此暂存，不得占用通道。',
    'Deliveries and outbound linen wait here; the route itself stays clear.',
    '暂存 means short-term holding.', 'housekeeping', [13.30, 6.90], 2.4, 1.45);
  for (const [x, z] of [[6.6, -3.2], [11.4, -3.2], [6.6, 2.4], [11.4, 2.4], [15.2, 2.4]])
    light(x, WH - .45, z, c.white, .52, 5.2);

  // ===========================================================================================
  // 12 · THE THREE ROOMS THE WALLS CREATED, FURNISHED
  // Enclosing the plate produced spaces the fit-out never had a reason to dress: the west end of
  // engineering, the store's rear bay behind its own north wall, and the pocket between security
  // and the lift bank. All three are reachable, so all three are visible, so all three are built.
  // ===========================================================================================
  // 12a · Engineering switchgear and workbench, x -21.78..-17.0
  flat(-19.40, .020, 11.10, 4.60, 6.90, c.tileD, { mode: 7, gloss: .11, tag: '工程部' });
  for (let i = 0; i < 4; i++) {
    const z = 8.95 + i * 1.30;
    box(-21.20, 1.15, z, .82, 2.30, 1.16, c.steelL, { hard: true, gloss: .40, tag: '配电室' });
    box(-20.76, 1.15, z, .06, 2.16, 1.02, c.steelD, { hard: true, gloss: .48, tag: '配电室' });
    box(-20.72, 1.86, z, .03, .34, .74, c.ink, { hard: true, mode: 1, gloss: .22, tag: '配电室' });
    for (let v = 0; v < 3; v++) luminous(box(-20.71, 1.94 - v * .16, z - .22 + v * .22, .02, .075, .075,
      v === 1 ? c.orange : c.greenL, { hard: true, mode: 1, tag: '配电室' }), .09, .20);
    cyl(-20.74, 1.15, z + .40, .035, .10, c.bronzeL, { rz: Math.PI / 2, gloss:POLISH, tag: '配电室' });
    box(-21.20, 2.36, z, .86, .12, 1.20, c.steelD, { hard: true, gloss: .44, tag: '配电室' });
    solid(-21.64, -20.72, z - .60, z + .60);
  }
  glyphs(-20.69, 2.62, 10.90, -Math.PI / 2, '配电室', { size: .14, gap: .034, color: c.orange, mode: 1, lift: .007, tag: '配电室' });
  glyphs(-20.69, 2.38, 10.90, -Math.PI / 2, 'SWITCHGEAR', { size: .054, gap: .011, color: c.white, mode: 1, lift: .006, tag: '配电室' });
  box(-18.20, .44, 14.05, 3.30, .10, .78, c.walnutL, {...MAT.timber, hard: true, mode: 6, gloss: .22, tag: '工具间' });
  box(-18.20, .22, 14.05, 3.10, .34, .62, c.steelD, { hard: true, gloss: .36, tag: '工具间' });
  box(-18.20, 1.62, 14.50, 3.10, 1.30, .06, c.paintD, {...MAT.timber, hard: true, mode: 6, gloss: .20, tag: '工具间' });
  for (let i = 0; i < 9; i++) {
    const x = -19.55 + i * .34;
    box(x, 1.42 + (i % 3) * .28, 14.44, .09, .34 + (i % 2) * .14, .05, i % 3 ? c.steelD : c.orange,
      { hard: true, gloss: .40, tag: '工具间' });
    box(x, 1.86, 14.45, .12, .035, .035, c.bronzeD, { hard: true, gloss:AGED, tag: '工具间' });
  }
  for (let i = 0; i < 4; i++) box(-19.40 + i * .60, .59, 14.05, .40, .20, .34, i % 2 ? c.red : c.teal,
    {...MAT.timber,  hard: true, mode: 6, gloss: .26, tag: '工具间' });
  glyphs(-18.20, 2.44, 14.44, Math.PI, '工具间 · 月度检修表', { size: .105, gap: .024, color: c.white, mode: 1, lift: .006, tag: '工具间' });
  solid(-19.90, -16.50, 13.60, 14.50);
  fixture('工具间', -18.20, 13.50, '工具、备件和月度检修表都挂在工程部西墙。',
    'Tools, spares and the monthly inspection sheet live on the engineering west wall.',
    '检修 means inspection and repair.', 'engineering', [-18.20, 12.60], 2.2, 1.20);
  for (const z of [9.6, 13.4]) light(-19.4, WH - .45, z, c.white, .50, 5.0);

  // 12b · The store's rear bulk bay, behind the authored 客房部工作间 board.
  // The bay is 1.58 m deep. The first racking here was 0.84 m deep, leaving a 0.64 m aisle — which
  // is 0.04 m once clampMove inflates by the 0.30 m body radius, and the flood fill duly reported
  // the whole bay as unreachable. 0.45 m racking hard against the shell leaves 1.08 m. This is the
  // reason the rule is "never place a wall or a door by eye": the drawing looked fine.
  flat(5.20, .020, 13.98, 8.40, 1.50, c.tileL, { mode: 7, gloss: .12, tag: '备品库' });
  for (const x of [2.30, 5.10, 7.90]) {
    box(x, .10, 14.52, 2.40, .20, .45, c.steelD, { hard: true, gloss: .36, tag: '备品库' });
    for (const sx of [-1, 1]) box(x + sx * 1.12, 1.42, 14.52, .11, 2.62, .45, c.steelD, { hard: true, gloss: .40, tag: '备品库' });
    for (const y of [.86, 1.68, 2.50]) {
      box(x, y, 14.52, 2.22, .075, .43, c.steelL, { hard: true, gloss: .44, tag: '备品库' });
      for (let j = 0; j < 3; j++) box(x - .74 + j * .74, y + .28, 14.52, .64, .44, .36,
        (j + y) % 2 ? c.linen : c.linenB, { mode: 7, gloss: .05, tag: '备品库' });
    }
    solid(x - 1.24, x + 1.24, 14.28, 14.76);
  }
  box(6.60, 2.20, 13.25, 1.90, .58, .07, c.paintD, {...MAT.timber, hard: true, mode: 6, gloss: .20, tag: '备品库' });
  glyphs(6.60, 2.30, 13.30, 0, '备品库', { size: .12, gap: .028, color: c.ink, mode: 1, lift: .006, tag: '备品库' });
  glyphs(6.60, 2.08, 13.30, 0, 'BULK STORE', { size: .050, gap: .010, color: c.steel, mode: 1, lift: .006, tag: '备品库' });
  light(5.2, WH - .45, 14.0, c.white, .46, 4.6);

  // 12c · The pocket between security and the lift bank: inbound goods holding
  flat(15.45, .019, -10.60, 4.00, 8.20, c.tileD, { mode: 7, gloss: .12, tag: '收货暂存' });
  for (const z of [-13.4, -8.6]) flat(15.45, .029, z, 3.70, .12, c.yellow, { gloss: .24, tag: '收货暂存' });
  for (const z of [-12.55, -10.35]) {
    box(15.55, .12, z, 3.30, .24, 1.10, c.steelD, { hard: true, gloss: .36, tag: '收货暂存' });
    for (const sx of [-1, 1]) box(15.55 + sx * 1.56, 1.42, z, .13, 2.60, 1.10, c.orange, { hard: true, gloss: .32, tag: '收货暂存' });
    for (const y of [.96, 1.84]) box(15.55, y, z, 3.10, .085, 1.06, c.steelL, { hard: true, gloss: .42, tag: '收货暂存' });
    for (let j = 0; j < 4; j++) box(14.35 + j * .82, [1.30, 2.18][j % 2], z, .68, .58, .86,
      j % 3 ? c.concrete : c.walnutL, { mode: 7, gloss: .08, tag: '收货暂存' });
    solid(13.92, 17.18, z - .62, z + .62);
  }
  box(13.50, 1.90, -8.20, .07, .96, 2.20, c.ink, { hard: true, gloss: .18, tag: '收货暂存' });
  glyphs(13.55, 2.10, -8.20, Math.PI / 2, '收货暂存', { size: .115, gap: .027, color: c.yellow, mode: 1, lift: .006, tag: '收货暂存' });
  glyphs(13.55, 1.86, -8.20, Math.PI / 2, 'INBOUND HOLDING', { size: .048, gap: .010, color: c.white, mode: 1, lift: .006, tag: '收货暂存' });
  for (const z of [-12.6, -8.4]) light(15.4, WH - .45, z, c.white, .48, 4.8);

  // ===========================================================================================
  // 13 · CAMERA ROOMS — registered for the volumes that now genuinely exist
  // These affect chase-camera clipping only; the walls above are what stops a body. The lift
  // landing nests inside the goods yard, so it is registered first and the smallest volume wins.
  // ===========================================================================================
  if (A.cameraRoom) {
    A.cameraRoom('hotelB1-lift-landing', 13.60, 17.60, -5.20, -1.60, 3.10);
    A.cameraRoom('hotelB1-canteen', -16.91, -11.21, -1.21, 4.05, 2.85);
    A.cameraRoom('hotelB1-security', 6.44, 13.21, -14.78, -6.79, 3.35);
    A.cameraRoom('hotelB1-store', 1.06, 9.53, 5.71, 13.01, 3.30);
    A.cameraRoom('hotelB1-store-bay', 1.06, 9.53, 13.19, 14.78, 2.35);
    A.cameraRoom('hotelB1-changing', -8.63, 0.88, 6.19, 14.78, 3.35);
    A.cameraRoom('hotelB1-engineering', -21.78, -8.81, 7.44, 14.78, 3.55);
    A.cameraRoom('hotelB1-laundry', -11.03, 3.51, -5.25, 4.21, 3.55);
    A.cameraRoom('hotelB1-corridor', -17.10, 3.51, 4.40, 7.26, 2.75);
    A.cameraRoom('hotelB1-boh-corridor', -21.78, -17.10, -5.34, 7.26, 2.95);
    A.cameraRoom('hotelB1-dock', -21.78, -5.82, -14.78, -7.82, 3.60);
    A.cameraRoom('hotelB1-staff-hall', -5.62, 6.26, -14.78, -5.45, 3.40);
    A.cameraRoom('hotelB1-goods-yard', 3.69, 17.60, -6.79, 5.53, 3.75);
  }

  // Two deterministic indicators, both scene-local and both cheap: the dock's goods-route beacon
  // and the plant-room duty lamp. Nothing here drives geometry, only glow.
  const beacon = box(-11.85, 3.34, -7.62, .17, .17, .09, c.yellow, { hard: true, mode: 1, gloss: .30 });
  const duty = box(-12.70, 3.34, 7.24, .17, .17, .09, c.greenL, { hard: true, mode: 1, gloss: .30 });
  // Both are driven from section 14's tick below — one onTick per floor module, not two.

  // ===========================================================================================
  // 14 · SECOND GOODS BAY, ON A SCHEDULE — H212
  //
  // js/hotel-service.js's dock is complete but static: one shutter that never moves, and stock
  // that is in exactly the same place at 04:00 and at 16:00. A dock reads as parked storage until
  // something arrives. The west 5 m of the dock (x -21.78..-16.95) was the only bare slab left on
  // this level — hotel-service's tile stops at x -16.95 and its shutter at x -16.10 — so the
  // second bay goes there, clear of the fire-stair footprint (z -8.86..-5.34) by 3.3 m.
  //
  // Everything below runs off the GAME CLOCK, not the frame clock: five booked slots, a shutter
  // that is only up inside a slot's window, and an apron whose load count is a function of the
  // hour. The tick is gated to once a game-minute, so the cost per frame is one comparison.
  // ===========================================================================================
  try { Glyphs.need('今到二号卸口供应商已在途报修处理中完成工单时鲜食饮耗材制服0123456789'); } catch (_) {}

  // The animation flags every moving prop in this repo needs: `ob:null, fixed:true` takes the prop
  // out of the static batch so a per-frame matrix is honoured, and `_m0` keeps the built matrix so
  // every frame is a transform of the original rather than an accumulation.
  const anim = (p, x, y, z, r = 1) => { p.ob = null; p.fixed = true; p.cx = x; p.cy = y; p.cz = z; p.r = r; p._m0 = p.m; return p; };

  const BX = -19.00, BW = 3.80;                    // bay 2 centre and clear width
  flat(-19.30, .019, -11.60, 4.90, 6.30, c.tileD, { mode: 7, gloss: .12, tag: '装卸区' });
  for (const s of [-1, 1]) flat(BX + s * 1.95, .028, -12.40, .13, 4.60, c.yellow, { gloss: .24, tag: '装卸区' });
  flat(BX, .028, -10.20, BW, .13, c.yellow, { gloss: .24, tag: '装卸区' });
  // Dark bay mouth behind the curtain, so a raised shutter reveals a throat and not the void.
  box(BX, 1.72, -14.86, BW + .16, 3.30, .09, c.black, { hard: true, mode: 7, gloss: .04, tag: '装卸区' });
  box(BX, 3.46, -14.73, BW + .30, .32, .22, c.steelD, { hard: true, gloss: .38, tag: '装卸区' });
  for (const s of [-1, 1]) box(BX + s * (BW / 2 + .16), 1.70, -14.68, .30, 3.34, .28, c.yellow,
    { hard: true, gloss: .30, tag: '装卸区' });
  box(BX, 3.68, -14.60, 2.60, .40, .06, c.green, { hard: true, gloss: .26, tag: '装卸区' });
  glyphs(BX, 3.70, -14.56, 0, '二号卸货口', { size: .12, gap: .028, color: c.white, mode: 1, lift: .006, tag: '装卸区' });
  // Twelve slats. Shut, they sit at 0.40..2.82; open, they stack under the head beam. The travel
  // is stored per slat so the curtain gathers rather than sliding as one plate.
  const slats = [];
  for (let i = 0; i < 12; i++) {
    const yShut = .40 + i * .22, yOpen = 3.24 - i * .055;
    const p = box(BX, yShut, -14.79, BW, .17, .055, i % 2 ? c.steel : c.steelL,
      { hard: true, gloss: .38, tag: '装卸区' });
    anim(p, BX, yShut, -14.79, 2.2); p._travel = yOpen - yShut; slats.push(p);
  }

  // Three apron bays. Each holds one delivery, and each delivery is a wrapped pallet that is on
  // the slab only between its own arrival and the porter run that takes it inside.
  //
  // NO COLLIDER, deliberately. A collider that appears and disappears with the load would be a
  // 4.4 m barrier across the apron in every check that builds the scene without ticking it —
  // .hotelcheck.js's flood fill does exactly that — and the three bays sit 0.31 m apart, which is
  // half of what a 0.30 m body needs to pass. hotel-service's own dock racks and the show kitchen
  // upstairs are non-colliding for the same reason, so this is the floor's existing convention.
  const loads = [];
  for (let j = 0; j < 3; j++) {
    const x = -20.55 + j * 1.55, z = -12.30, parts = [];
    parts.push(box(x, .07, z, 1.16, .14, .92, c.walnutL, {...MAT.timber, hard: true, mode: 6, gloss: .18, tag: '收货暂存' }));
    for (const dz of [-.28, .28]) parts.push(box(x, .05, z + dz, 1.16, .10, .16, c.walnut, {...MAT.timber, hard: true, mode: 6, tag: '收货暂存' }));
    for (let k = 0; k < 3; k++) parts.push(box(x, .30 + k * .40, z, 1.00 - k * .10, .38, .78 - k * .06,
      k % 2 ? c.linenB : c.concrete, { mode: 7, gloss: .07, tag: '收货暂存' }));
    parts.push(box(x, .70, z, 1.06, 1.24, .86, c.tileL, { hard: true, mode: 1, alpha: .26, gloss: .52, tag: '收货暂存' }));
    parts.push(box(x, 1.34, z - .40, .58, .30, .02, c.white, { hard: true, mode: 1, tag: '收货暂存' }));
    parts.push(box(x - .16, 1.30, z - .414, .22, .06, .015, [c.green, c.orange, c.teal][j], { hard: true, mode: 1, tag: '收货暂存' }));
    for (const p of parts) anim(p, x, .70, z, 1.4);
    loads.push({ parts });
  }

  // ---- 今日到货 · the schedule made legible -------------------------------------------------
  // On the dock's own north wall, south face (the wall is 0.18 thick at z -7.72, so its face is
  // -7.81 and the board stands 0.035 proud of that). Five booked slots; the lamp is the state.
  const SLOTS = [[360, '鲜食'], [570, '布草'], [780, '饮品'], [1050, '耗材'], [1260, '回收']];
  const HHMM = ['06', '09', '13', '17', '21'];
  box(-15.60, 1.86, -7.845, 3.00, 1.86, .05, c.ink, { hard: true, gloss: .18, tag: '装卸区' });
  box(-15.60, 1.78, -7.875, 2.84, 1.56, .02, c.paint, { hard: true, mode: 1, gloss: .10, tag: '装卸区' });
  for (const s of [-1, 1]) box(-15.60 + s * 1.50, 1.86, -7.86, .06, 1.90, .05, c.bronzeD, { hard: true, gloss:AGED, tag: '装卸区' });
  glyphs(-15.60, 2.62, -7.878, Math.PI, '今日到货', { size: .125, gap: .030, color: c.yellow, mode: 1, lift: .006, tag: '装卸区' });
  glyphs(-15.60, 2.40, -7.878, Math.PI, 'INBOUND TODAY', { size: .050, gap: .010, color: c.white, mode: 1, lift: .006, tag: '装卸区' });
  const slotLamps = [];
  for (let i = 0; i < SLOTS.length; i++) {
    const y = 2.14 - i * .28;
    box(-15.60, y, -7.888, 2.70, .21, .012, i % 2 ? c.paintW : c.paintD, { hard: true, mode: 1, gloss: .08, tag: '装卸区' });
    glyphs(-16.62, y, -7.896, Math.PI, HHMM[i], { size: .085, gap: .020, color: c.ink, mode: 1, lift: .005, tag: '装卸区' });
    glyphs(-15.72, y, -7.896, Math.PI, SLOTS[i][1], { size: .085, gap: .020, color: c.ink, mode: 1, lift: .005, tag: '装卸区' });
    slotLamps.push(box(-14.44, y, -7.898, .17, .12, .014, c.steel, { hard: true, mode: 1, gloss: .20, tag: '装卸区' }));
  }

  // ---- 工程部工单 · the works board the engineering room never had — H214 --------------------
  // On this file's own engineering/changing party wall (x -8.72, so the engineering face is
  // -8.81), 3.5 m north of hotel-service's 工程状态 panel and clear of its pipe runs at z 9.25..
  // 10.35. Six standing jobs; the lamp and the strip move through 报修 -> 处理中 -> 已完成 on the
  // game clock, so the same board is not showing the same six states at breakfast and at midnight.
  const JOBS = ['客房', '洗衣', '空调', '电梯', '厨房', '泳池'];
  box(-8.845, 1.90, 11.50, .07, 2.06, 2.90, c.ink, { hard: true, gloss: .18, tag: '工程部' });
  box(-8.875, 1.84, 11.50, .02, 1.76, 2.72, c.paint, { hard: true, mode: 1, gloss: .10, tag: '工程部' });
  for (const z of [10.08, 12.92]) box(-8.86, 1.90, z, .05, 2.10, .06, c.bronzeD, { hard: true, gloss:AGED, tag: '工程部' });
  glyphs(-8.885, 2.66, 11.50, -Math.PI / 2, '工程工单', { size: .12, gap: .029, color: c.orange, mode: 1, lift: .006, tag: '工程部' });
  glyphs(-8.885, 2.44, 11.50, -Math.PI / 2, 'WORKS BOARD', { size: .050, gap: .010, color: c.white, mode: 1, lift: .006, tag: '工程部' });
  const jobLamps = [], jobBars = [];
  for (let i = 0; i < JOBS.length; i++) {
    const z = 12.55 - i * .42;
    box(-8.888, 1.74, z, .012, .30, .38, i % 2 ? c.paintW : c.paintD, { hard: true, mode: 1, gloss: .08, tag: '工程部' });
    glyphs(-8.896, 1.74, z, -Math.PI / 2, JOBS[i], { size: .080, gap: .018, color: c.ink, mode: 1, lift: .005, tag: '工程部' });
    jobBars.push(box(-8.898, 1.22, z, .012, .085, .34, c.steel, { hard: true, mode: 1, gloss: .12, tag: '工程部' }));
    jobLamps.push(box(-8.900, 1.74, z - .30, .014, .11, .11, c.steel, { hard: true, mode: 1, gloss: .20, tag: '工程部' }));
  }

  // ---- the tick ------------------------------------------------------------------------------
  // Two clocks. `t` eases the shutter, which has to look mechanical; everything else is keyed to
  // the game clock and recomputed once a game-minute, because a delivery schedule that re-derives
  // itself sixty times a second is the same schedule at sixty times the cost.
  const LAMP = { due: c.yellow, here: c.greenL, later: c.steelD, open: c.orange, done: c.green };
  let lastMin = -1, shutterU = 0, shutterTarget = 0;
  A.onTick((t, body, clock, dt) => {
    beacon.glow = .06 + .20 * (0.5 + 0.5 * Math.sin(t * 3.1));
    duty.glow = .05 + .09 * (0.5 + 0.5 * Math.sin(t * 0.85));

    const min = Math.floor(Number(clock) || 0) % 1440;
    if (min !== lastMin) {
      lastMin = min;
      let arrived = 0, open = false;
      for (let i = 0; i < SLOTS.length; i++) {
        const dm = min - SLOTS[i][0];
        if (dm >= 0) arrived++;
        if (dm >= 0 && dm < 18) open = true;
        slotLamps[i].color = dm < 0 ? (dm > -45 ? LAMP.due : LAMP.later)
          : (dm < 18 ? LAMP.open : LAMP.here);
        slotLamps[i].glow = dm >= 0 && dm < 18 ? .22 : .05;
      }
      shutterTarget = open ? 1 : 0;
      // Apron bay j carries the j-th most recent delivery, and only while it is still waiting to
      // be taken inside — 210 game-minutes, after which the porters have moved it and the bay is
      // clear. Before the first slot of the day the apron is empty, which is the point.
      for (let j = 0; j < 3; j++) {
        const k = arrived - 1 - j;
        const age = k >= 0 ? min - SLOTS[k][0] : -1;
        const on = k >= 0 && age >= 0 && age < 210;
        const q = loads[j];
        if (q.on !== on) {
          q.on = on;
          for (const p of q.parts) p.m = on ? p._m0 : M.mul(M.trans(0, -9.5, 0), p._m0);
        }
      }
      // Works board: six jobs on a four-hour rota, so each one is somewhere different in its own
      // cycle. j = 0 raised, 1 in hand, 2 done — deterministic, and it never needs a random.
      for (let i = 0; i < JOBS.length; i++) {
        const phase = Math.floor(((min + i * 47) % 240) / 80);
        jobLamps[i].color = [c.red, LAMP.due, LAMP.done][phase];
        jobLamps[i].glow = phase === 2 ? .06 : .20;
        jobBars[i].color = [c.red, LAMP.due, LAMP.done][phase];
      }
      A.state.b1 = {
        deliveries: { slots: SLOTS.length, arrived, shutter: open ? 'open' : 'shut',
          onApron: loads.filter(q => q.on).length },
        works: { jobs: JOBS.length, board: '工程工单' },
      };
    }
    // Ease the curtain. 1.6 s end to end, and the whole cost when nothing is moving is one abs().
    if (Math.abs(shutterU - shutterTarget) > .0005) {
      const step = Math.min(1, (dt || .016) / 1.6);
      shutterU += (shutterTarget - shutterU) * Math.min(1, step * 4);
      const u = shutterU * shutterU * (3 - 2 * shutterU);
      for (const p of slats) p.m = M.mul(M.trans(0, u * p._travel, 0), p._m0);
    }
  });

  // ===========================================================================================
  // 15 · USED, NOT STORED — H213
  // Three rooms read as showroom-clean in HT-B1-canteen and HT-B1-linen-lockers: bare tabletops,
  // shut lockers, a bulk bay that has never been picked from. None of that needs new geometry —
  // it needs the objects a shift leaves behind. Everything here is small, untagged where it is
  // scenery and tagged where it belongs to a fixture card, and none of it carries a collider.
  // ===========================================================================================
  // Canteen: two of hotel-service's three tables mid-meal (tops are at y 0.81, 1.35 x 0.78).
  for (const [tx, tz] of [[-13.65, .15], [-12.55, 2.55]]) {
    for (const [dx, dz, ry] of [[-.30, -.20, .10], [.30, .20, Math.PI - .14]]) {
      const x = tx + dx, z = tz + dz;
      box(x, .82, z, .38, .022, .28, c.steelL, { hard: true, ry, gloss: .34, tag: '员工食堂' });
      cyl(x - .05, .875, z, .085, .085, c.white, { ry, gloss: .22, tag: '员工食堂' });
      cyl(x - .05, .915, z, .070, .015, c.greenL, { ry, mode: 7, gloss: .10, tag: '员工食堂' });
      cyl(x + .12, .875, z - .04, .042, .085, c.tileL, { ry, gloss: .26, tag: '员工食堂' });
      for (const s of [-1, 1]) capsule(x + .14, .835, z + .09 + s * .012, .008, .22, .008,
        c.walnutL, { ry: ry + .5, rz: Math.PI / 2, tag: '员工食堂' });
    }
    cyl(tx + .02, .885, tz, .055, .13, c.teal, { gloss: .30, tag: '员工食堂' });
  }
  // Tea flask on the servery end and a used-tray trolley by the door, where a canteen puts them.
  cyl(-16.05, 1.02, .30, .13, .42, c.steelL, { gloss: .46, tag: '员工食堂' });
  cyl(-16.05, 1.25, .30, .14, .05, c.steelD, { gloss: .40, tag: '员工食堂' });
  box(-15.93, 1.00, .30, .07, .10, .12, c.ink, { hard: true, gloss: .24, tag: '员工食堂' });
  box(-11.75, .58, 3.35, .78, .05, .54, c.steelL, { hard: true, gloss: .42, tag: '员工食堂' });
  box(-11.75, .26, 3.35, .74, .05, .50, c.steelL, { hard: true, gloss: .40, tag: '员工食堂' });
  for (const dx of [-.32, .32]) for (const dz of [-.22, .22]) {
    capsule(-11.75 + dx, .32, 3.35 + dz, .018, .56, .018, c.steelD, { gloss: .38, tag: '员工食堂' });
    cyl(-11.75 + dx, .045, 3.35 + dz, .045, .035, c.rubber, { rz: Math.PI / 2, tag: '员工食堂' });
  }
  for (let i = 0; i < 4; i++) box(-11.75, .615 + i * .018, 3.35, .36, .018, .27, c.steelL,
    { hard: true, ry: .06 * i, gloss: .34, tag: '员工食堂' });
  capsule(-11.75, .78, 3.10, .018, .74, .018, c.steelD, { rz: Math.PI / 2, gloss: .38, tag: '员工食堂' });

  // Changing room: a bench in the aisle with a shift's worth of things left on it, and coat hooks
  // on this file's own east wall (x 0.97, so the room face is 0.88) north of the 布草间 door.
  box(-4.10, .44, 9.95, 2.20, .10, .40, c.walnutL, {...MAT.timber, hard: true, mode: 6, gloss: .22, tag: '员工更衣室' });
  for (const s of [-1, 1]) box(-4.10 + s * .92, .22, 9.95, .10, .44, .36, c.steelD, { hard: true, gloss: .40, tag: '员工更衣室' });
  solid(-5.28, -2.92, 9.71, 10.19);
  for (let i = 0; i < 3; i++) box(-4.86 + i * .30, .54, 9.95, .27, .10, .34, i === 1 ? c.linenB : c.white,
    { mode: 7, gloss: .05, ry: .04 * i, tag: '员工更衣室' });
  taper(-3.42, .62, 9.95, .22, .34, .17, c.green, { mode: 7, gloss: .09, ry: .3, tag: '员工更衣室' });
  capsule(-3.42, .80, 9.86, .015, .30, .015, c.walnut, { rz: Math.PI / 2, ry: .3, tag: '员工更衣室' });
  cyl(-3.05, .10, 9.80, .085, .19, c.rubber, { ry: .4, gloss: .14, tag: '员工更衣室' });
  cyl(-2.86, .10, 9.86, .085, .19, c.rubber, { ry: -.2, gloss: .14, tag: '员工更衣室' });
  for (let i = 0; i < 4; i++) {
    const z = 11.60 + i * .48;
    cyl(.845, 1.72, z, .022, .10, c.bronzeL, { rz: Math.PI / 2, gloss:POLISH, tag: '员工更衣室' });
    if (i === 3) continue;
    taper(.70, 1.34, z, .19, .72, .13, i % 2 ? c.greenL : c.linen, {...MAT.cloth, mode: 7, gloss: .05, tag: '员工更衣室' });
    box(.70, 1.66, z, .26, .09, .05, i % 2 ? c.greenL : c.linen, {...MAT.cloth, mode: 7, gloss: .05, tag: '员工更衣室' });
  }
  box(.86, 2.16, 12.10, .03, .34, 1.40, c.ink, { hard: true, gloss: .18, tag: '员工更衣室' });
  glyphs(.845, 2.16, 12.10, -Math.PI / 2, '交接班 · 制服', { size: .075, gap: .017, color: c.white, mode: 1, lift: .005, tag: '员工更衣室' });

  // Bulk store: a picking trolley in the bay aisle, part-emptied shelf ends and a count sheet.
  // The aisle here is 1.08 m (racking at z 14.28..14.76, the store wall face at z 13.19); a
  // 0.52 m trolley on its centreline leaves 0.28 m either side and takes no collider.
  box(6.35, .60, 13.74, .92, .05, .52, c.steelL, { hard: true, gloss: .42, tag: '备品库' });
  box(6.35, .28, 13.74, .88, .05, .48, c.steelL, { hard: true, gloss: .40, tag: '备品库' });
  for (const dx of [-.38, .38]) for (const dz of [-.20, .20]) {
    capsule(6.35 + dx, .33, 13.74 + dz, .018, .58, .018, c.steelD, { gloss: .38, tag: '备品库' });
    cyl(6.35 + dx, .045, 13.74 + dz, .045, .035, c.rubber, { rz: Math.PI / 2, tag: '备品库' });
  }
  for (let i = 0; i < 3; i++) box(6.05 + i * .30, .70, 13.74, .27, .16, .38, i % 2 ? c.linen : c.linenB,
    {...MAT.cloth,  mode: 7, gloss: .05, ry: .05 * i, tag: '备品库' });
  capsule(6.35, .84, 13.50, .018, .84, .018, c.steelD, { rz: Math.PI / 2, gloss: .38, tag: '备品库' });
  box(6.72, .865, 13.52, .30, .015, .22, c.white, { hard: true, mode: 1, ry: -.12, tag: '备品库' });
  box(6.72, .873, 13.52, .10, .012, .05, c.orange, { hard: true, mode: 1, ry: -.12, tag: '备品库' });
  // Two shelf ends picked down to the deck, so the racking is not three identical full bays.
  for (const [x, y] of [[1.56, 1.96], [8.64, 1.14]]) box(x, y, 14.52, .58, .40, .34, c.tileD,
    { mode: 7, gloss: .05, tag: '备品库' });

  // -------------------------------------------------------------------------------------------
  // LEFT FOR THE OWNER OF js/hotel-service.js — three places where its own colliders overlap each
  // other, so no partition line exists between them. Nothing was moved; the walls dodged instead.
  //   1. canteen table (-11.45, 0.15) reaches x -10.775; washer plinths start x -11.03  (0.27 m)
  //   2. engineering panel reaches x -8.625; locker bank starts x -8.82 at z 7.89..8.11 (0.20 m)
  //   3. linen shelves reach x 9.02 while the painted 服务通道 strip runs x 8.63..9.37, so the
  //      route's own paint passes under the shelving for 0.39 m
  // -------------------------------------------------------------------------------------------


  A.state.partitions = partitions;
});

// ===========================================================================================
// 16 · THE THREE FIXTURE CARDS THIS FILE OPENED AND NEVER FILLED
// .hotelcheck.js reports 垃圾回收间, 暂存区 and 工具间 as dead interaction labels: all three are
// this file's own `fixture()` calls, so all three are this file's to close. A prompt that walks
// the player to a card with nothing behind it is the opposite of an operational back of house.
// ===========================================================================================
Object.assign(HotelUse.hotelB1, {
  '垃圾回收间': { zh: '分类垃圾', py: 'fēnlèi lājī', en: 'sort the waste',
    secs: 2.6, mins: 8, gain: { rest: -2 }, pose: { type: 'check' },
    done: '厨余、纸板、玻璃和其他分了四桶，夜班运走。',
    doneTr: 'Food waste, cardboard, glass and general are in their four bins for the night run.' },
  '暂存区': { zh: '清点暂存', py: 'qīngdiǎn zàncún', en: 'count the holding bay',
    secs: 2.4, mins: 6, gain: { mood: 2 }, pose: { type: 'check' },
    done: '到货和待运的数量对上了，通道也没被占。',
    doneTr: 'Inbound and outbound both match the sheet, and the route is still clear.' },
  '工具间': { zh: '看检修表', py: 'kàn jiǎnxiū biǎo', en: 'read the inspection sheet',
    secs: 2.2, mins: 4, gain: { mood: 3 }, pose: { type: 'read' },
    done: '这个月的检修都签了字，缺的备件也记上了。',
    doneTr: 'This month’s inspections are all signed off and the missing spares are listed.' },
});
