// 🏨 京华大酒店 · Floor 12 — the interior architecture
//
// This floor's own module. Registered into HotelFit (declared in js/hotel.js). Nothing else in
// the build writes to this file, and you must not write to anyone else's.
//
// Programme for this level, from HOTEL.md:
//   rooftop Chinese dining, sky lounge and a usable terrace
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
//   scene key   hotel12
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
//     node /private/tmp/claude-501/-Users-jonahcollins-Desktop-Chinesegame/a3cc9bcf-53f0-4e3d-a6a3-24cb996ed8a1/scratchpad/floorprobe.js hotel12 -22 22 -15 15 15.6 -3.7
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
//   * `node --check js/hotel-f12.js` after every edit. A backtick inside a template literal
//     ends the string mid-statement; that has broken this project three times.
//
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// THE PLAN THIS MODULE BUILDS
//
// Floor 12 is the only level with an outside. Everything below follows from one line — the
// envelope — and from the fact that the fit-out (js/hotel-guests.js, not editable here) already
// put its furniture on the plate and cannot be moved:
//
//   * 云端中餐厅  x [-13.68, +1.68]  z [-14.80, -5.03]   enclosed dining room. Its north wall and
//                 the 1.50 m door in it were already authored by the fit; this module adds the
//                 east and west walls, a service door east and a pantry door west, and closes the
//                 clerestory band up to the slab so it is a room rather than three sides.
//   * 备餐间      x [-22.00, -13.50] z [-14.80, -5.12]   plating pantry and the fire-stair
//                 discharge. Two ways out: north to the gallery, east into the dining room.
//   * 包间 松鹤厅 x [+1.68, +7.60]   z [-14.80, -7.40]   private dining
//   * 包间 竹韵厅 x [+7.78, +13.30]  z [-14.80, -7.40]   private dining
//   * 西廊        x [-21.15,  0.00]  z [ -5.03, +1.51]   the terrace foyer: the guest spine's
//                 west run, the ink-wash wall, and the inside face of the glazed elevation.
//   * 天际酒廊    x [  0.09, 13.30]  z [ -1.30, 14.40]   sky lounge and, new here, the bar.
//   * 观景露台    x [-20.55,  0.00]  z [  1.75, 13.53]   OPEN DECK. 250 m2 of roof outside the
//                 glass, held by a continuous parapet.
//
// THE ENVELOPE is an L: a south run along z = 1.60 from the west parapet to x = 0, and an east
// run along x = 0.00 from z = 1.51 up to the north parapet. Mullions, heads and sills are opaque
// so they batch; the glass behind them is five long panes and four sliding leaves, because
// alpha < 0.999 costs a draw call each and forty panes would cost forty.
//
// THE PARAPET. The shell does stop the player at the plate edge, but not with a collider: there
// is no solid() anywhere on the perimeter. hotel.js:172-180 builds four full-height exterior
// walls (geometry only) and hotel.js:181-184 adds blockers, which stop the camera; what actually
// holds the body is build.js clampMove clamping into `baseZone`, x +/-21.70, z +/-14.70 inflated
// by the 0.30 m radius. So you cannot fall off — but on the terrace the stop was an invisible
// line 0.9 m short of a painted wall. The parapet below is real: stone upstand, bronze posts,
// glass and coping, with a continuous run of solids listed at PARAPET SOLIDS.
// ---------------------------------------------------------------------------------------------

HotelFit.register('hotel12', A => {
  const { box, cyl, ball, capsule, taper, flat, glyphs, solid, blocker, shade, glow, thing } = A;
  const { C, col, RX, RZ, H } = A;
  const { onTick, luminous, light, cameraRoom } = A;

  try {
    Glyphs.need('云端中餐厅天际酒廊观景露台青铜亭女儿墙备餐间包间松鹤竹韵风雨花园露台吧台' +
      '迎宾台京城夜景灯笼暖炉屋顶花园服务通道员工楼梯厅西廊东廊私宴雅座请勿倚靠栏杆' +
      '十二楼云顶天台开放式酒水茶点星空');
  } catch (_) {}

  // ------------------------------------------------------------------ palette and shorthands
  const c = { ...col,
    walnutD: C('#33241c'), limestone: C('#cdc4b0'), limestoneD: C('#a2998a'),
    night: C('#0c1219'), deck: C('#7a6b57'), silk: C('#91735c'), silkL: C('#c8b69c'),
    celadonL: C('#b3c7ba'), leaf: C('#4f6d51'), leafD: C('#334f31'), ember: C('#df8a3b'),
  };
  const CEIL = 4.09;          // underside of the shared shell slab (hotel.js: H-.13, .26 thick)
  const WH = .09;             // half a 0.18 m partition
  const PH = 3.16;            // interior partition height — matches the fit's authored dining wall
  const EH = 4.06;            // the envelope runs to the slab; inside and outside are not the same room

  // A prop that will be moved every frame must carry its own cull sphere, or `finish` derives one
  // from the transform it had at build time and the draw loop culls it while it is still on screen.
  const fixed = (p, r) => { p.ob = null; p.fixed = true;
    p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14]; p.r = r; return p; };

  // ------------------------------------------------------------------ partition helpers
  // Two calls, every time: the box is what you see, the solid is what stops you. The solid range
  // is passed separately because a wall that dies into the shell must have its COLLIDER run past
  // the walkable limit even though its GEOMETRY stops at the wall face — otherwise a 30 cm ribbon
  // of floor survives behind it that the player can see and never reach.
  function partZ(x0, x1, z, h, tag, colour, sx0, sx1) {
    if (x1 - x0 < .02) return;
    const w = x1 - x0, cx = (x0 + x1) / 2;
    Build.partition(0, h, (yc, hh, pf) =>
      box(cx, yc, z, w, hh, WH * 2, colour, { hard: true, mode: 14, gloss: .12, tag, ...pf }));
    for (const s of [-1, 1]) {
      box(cx, .11, z + s * (WH + .018), w, .22, .035, c.walnutD, { hard: true, mode: 6, gloss: .28, tag });
      box(cx, h - .07, z + s * (WH + .018), w, .085, .035, c.bronzeD, { hard: true, gloss: .58, tag, partition: true });
    }
    solid(sx0 === undefined ? x0 : sx0, sx1 === undefined ? x1 : sx1, z - WH, z + WH);
    blocker(sx0 === undefined ? x0 : sx0, sx1 === undefined ? x1 : sx1, z - WH, z + WH, h);
  }
  function partX(x, z0, z1, h, tag, colour, sz0, sz1) {
    if (z1 - z0 < .02) return;
    const d = z1 - z0, cz = (z0 + z1) / 2;
    Build.partition(0, h, (yc, hh, pf) =>
      box(x, yc, cz, WH * 2, hh, d, colour, { hard: true, mode: 14, gloss: .12, tag, ...pf }));
    for (const s of [-1, 1]) {
      box(x + s * (WH + .018), .11, cz, .035, .22, d, c.walnutD, { hard: true, mode: 6, gloss: .28, tag });
      box(x + s * (WH + .018), h - .07, cz, .035, .085, d, c.bronzeD, { hard: true, gloss: .58, tag, partition: true });
    }
    solid(x - WH, x + WH, sz0 === undefined ? z0 : sz0, sz1 === undefined ? z1 : sz1);
    blocker(x - WH, x + WH, sz0 === undefined ? z0 : sz0, sz1 === undefined ? z1 : sz1, h);
  }
  // The band between a 3.16 m partition and the 4.09 m slab. Opaque ink infill behind a bronze
  // lattice: it closes the room without a single translucent surface.
  function clereZ(x0, x1, z, y0, tag) {
    const h = CEIL - y0; if (h < .12 || x1 - x0 < .05) return;
    const w = x1 - x0, cx = (x0 + x1) / 2;
    box(cx, y0 + h / 2, z, w, h, .075, c.ink, { hard: true, gloss: .22, tag });
    const n = Math.max(1, Math.round(w / .95));
    for (let i = 0; i <= n; i++)
      box(x0 + w * i / n, y0 + h / 2, z, .045, h, .105, c.bronzeD, { hard: true, gloss: .58, tag });
    box(cx, y0 + .035, z, w, .07, .115, c.bronze, { hard: true, gloss: .62, tag });
    box(cx, CEIL - .035, z, w, .07, .115, c.bronze, { hard: true, gloss: .62, tag });
  }
  function clereX(x, z0, z1, y0, tag) {
    const h = CEIL - y0; if (h < .12 || z1 - z0 < .05) return;
    const d = z1 - z0, cz = (z0 + z1) / 2;
    box(x, y0 + h / 2, cz, .075, h, d, c.ink, { hard: true, gloss: .22, tag });
    const n = Math.max(1, Math.round(d / .95));
    for (let i = 0; i <= n; i++)
      box(x, y0 + h / 2, z0 + d * i / n, .105, h, .045, c.bronzeD, { hard: true, gloss: .58, tag });
    box(x, y0 + .035, cz, .115, .07, d, c.bronze, { hard: true, gloss: .62, tag });
    box(x, CEIL - .035, cz, .115, .07, d, c.bronze, { hard: true, gloss: .62, tag });
  }
  // Head, jambs and reveal over a clear opening. Carries no solid of its own — the opening is the
  // clear run between the two solids either side of it.
  function headZ(x0, x1, z, h, hz, en, accent) {
    const w = x1 - x0, cx = (x0 + x1) / 2, top = 2.28;
    for (const s of [-1, 1]) {
      const x = s < 0 ? x0 : x1;
      box(x + s * .075, top / 2, z, .15, top, .34, c.walnutD, { hard: true, mode: 6, gloss: .32, tag: hz });
      cyl(x + s * .075, top / 2, z - .19, .012, top - .30, c.bronzeL, { gloss: .66, tag: hz });
      cyl(x + s * .075, top / 2, z + .19, .012, top - .30, c.bronzeL, { gloss: .66, tag: hz });
    }
    // A 0.92 m beam, then an open bronze grille to the head. Filling the whole 2.28-4.06 band with
    // timber made a slab half the height of the opening and blacked out the room beyond it.
    const hb = Math.min(h - top, .92);
    box(cx, top + hb / 2, z, w + .30, hb, .34, c.walnutD, { hard: true, mode: 6, gloss: .32, tag: hz });
    if (h - top - hb > .14) {
      const g0 = top + hb, gh = h - g0;
      for (let i = 0; i <= Math.round(w / .34); i++)
        box(x0 + w * i / Math.max(1, Math.round(w / .34)), g0 + gh / 2, z, .035, gh, .10,
          c.bronzeD, { hard: true, gloss: .60, tag: hz });
      box(cx, h - .04, z, w + .30, .09, .30, c.bronze, { hard: true, gloss: .64, tag: hz });
    }
    for (const s of [-1, 1]) {
      luminous(box(cx, top + .17, z + s * .175, w - .12, .085, .035, accent || c.lacquer,
        { hard: true, mode: 1, tag: hz }), .022, .14);
      glyphs(cx, top + .56, z + s * .195, s < 0 ? Math.PI : 0, hz,
        { size: Math.min(.17, (w - .10) / Math.max(2, [...hz].length)), gap: .028,
          color: c.white, mode: 1, glow: .04, lift: .008, tag: hz });
      if (en) glyphs(cx, top + .33, z + s * .195, s < 0 ? Math.PI : 0, en,
        { size: Math.min(.058, (w + .10) / Math.max(2, en.length)), gap: .012,
          color: c.bronzeL, mode: 1, lift: .008, tag: hz });
    }
  }
  function headX(x, z0, z1, h, hz, en, accent) {
    const d = z1 - z0, cz = (z0 + z1) / 2, top = 2.28;
    for (const s of [-1, 1]) {
      const z = s < 0 ? z0 : z1;
      box(x, top / 2, z + s * .075, .34, top, .15, c.walnutD, { hard: true, mode: 6, gloss: .32, tag: hz });
      for (const q of [-1, 1])
        cyl(x + q * .19, top / 2, z + s * .075, .012, top - .30, c.bronzeL, { gloss: .66, tag: hz });
    }
    const hb = Math.min(h - top, .92);
    box(x, top + hb / 2, cz, .34, hb, d + .30, c.walnutD, { hard: true, mode: 6, gloss: .32, tag: hz });
    if (h - top - hb > .14) {
      const g0 = top + hb, gh = h - g0, n = Math.max(1, Math.round(d / .34));
      for (let i = 0; i <= n; i++)
        box(x, g0 + gh / 2, z0 + d * i / n, .10, gh, .035, c.bronzeD, { hard: true, gloss: .60, tag: hz });
      box(x, h - .04, cz, .30, .09, d + .30, c.bronze, { hard: true, gloss: .64, tag: hz });
    }
    for (const s of [-1, 1]) {
      luminous(box(x + s * .175, top + .17, cz, .035, .085, d - .12, accent || c.jade,
        { hard: true, mode: 1, tag: hz }), .022, .14);
      glyphs(x + s * .195, top + .56, cz, s * Math.PI / 2, hz,
        { size: Math.min(.17, (d - .10) / Math.max(2, [...hz].length)), gap: .028,
          color: c.white, mode: 1, glow: .04, lift: .008, tag: hz });
      if (en) glyphs(x + s * .195, top + .33, cz, s * Math.PI / 2, en,
        { size: Math.min(.058, (d + .10) / Math.max(2, en.length)), gap: .012,
          color: c.bronzeL, mode: 1, lift: .008, tag: hz });
    }
  }

  // ------------------------------------------------------------------ furniture helpers
  // A note that cost a render cycle: `capsule` here is a spindle, not a rod. Its hemispherical
  // caps scale with sy, so at sx << sy the cylindrical middle vanishes and what draws is two long
  // cones meeting at a point, floating clear of the floor — visible on the fit's own lounge posts.
  // Anything meant to read as a straight column, leg, stem or baluster is built with `cyl`.
  function chairAt(x, z, yaw, tag, cloth) {
    const s = Math.sin(yaw), co = Math.cos(yaw);
    box(x, .43, z, .50, .07, .48, cloth, { ry: yaw, mode: 7, gloss: .05, tag });
    box(x - s * .245, .73, z - co * .245, .50, .56, .07, cloth, { ry: yaw, mode: 7, gloss: .05, tag });
    box(x - s * .265, 1.02, z - co * .265, .46, .06, .05, c.bronzeD, { ry: yaw, gloss: .58, tag });
    for (const a of [[-.20, -.19], [.20, -.19], [-.20, .19], [.20, .19]])
      cyl(x + co * a[0] + s * a[1], .20, z - s * a[0] + co * a[1], .018, .40,
        c.bronzeD, { gloss: .56, tag });
  }
  function roundTop(x, z, r, top, tag) {
    cyl(x, .035, z, r * .62, .07, c.bronzeD, { gloss: .58, tag });
    cyl(x, .37, z, .055, .60, c.bronzeD, { gloss: .60, tag });
    cyl(x, .72, z, r, .065, top, { mode: 7, gloss: .30, tag });
    cyl(x, .757, z, r - .07, .018, c.bronzeL, { mode: 7, gloss: .52, tag });
  }
  function lanternAt(x, y, z, r, cloth, tag, drop) {
    cyl(x, y + r + (drop || .34) / 2, z, .011, drop || .34, c.bronzeD, { tag });
    const p = ball(x, y, z, r, r * 1.42, r, cloth, { mode: 1, glow: .20, tag });
    cyl(x, y + r * 1.42, z, r * .30, .045, c.bronzeD, { gloss: .60, tag });
    cyl(x, y - r * 1.42, z, r * .26, .04, c.bronzeD, { gloss: .60, tag });
    return p;
  }

  // ------------------------------------------------------------------ scene-local motion
  // One list, one tick. Every entry rotates about its own hanging point, not about the world
  // origin, so a lantern twelve metres out sways instead of swinging on a twelve-metre arm.
  // M.mul allocates a Float32Array unless it is handed an output buffer, so every entry carries
  // its own scratch and result: the tick then runs at zero allocations a frame.
  const swayers = [], rotBuf = new Float32Array(16);
  const addSway = (p, px, py, pz, amp, ph, rad, axis) => {
    fixed(p, rad);
    const base = M.mul(M.trans(-px, -py, -pz), p.m);
    swayers.push({ p, T: M.trans(px, py, pz), base, amp, ph, axis: axis || 'z',
      tmp: new Float32Array(16), out: new Float32Array(16) });
  };

  // ===============================================================================================
  // 1.  THE ENVELOPE — the glazed line between the warm rooms and the open roof
  // ===============================================================================================
  // Opaque mullions, sills and heads (they batch); the glass behind them is five long panes.
  const GLASS = { hard: true, mode: 1, alpha: .26, gloss: .82 };

  function paneZ(x0, x1, z, tag) {
    box((x0 + x1) / 2, 2.02, z, x1 - x0, 3.74, .05, c.glass, { ...GLASS, tag });
  }
  function paneX(x, z0, z1, tag) {
    box(x, 2.02, (z0 + z1) / 2, .05, 3.74, z1 - z0, c.glass, { ...GLASS, tag });
  }
  function frameZ(x0, x1, z, tag) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    box(cx, .085, z, w, .17, .34, c.limestoneD, { hard: true, gloss: .24, tag });     // sill
    box(cx, EH - .13, z, w, .26, .34, c.walnutD, { hard: true, mode: 6, gloss: .30, tag }); // head
    box(cx, EH - .30, z, w, .07, .30, c.bronze, { hard: true, gloss: .64, tag });
    box(cx, 2.34, z, w, .085, .26, c.bronzeD, { hard: true, gloss: .60, tag });        // transom
    const n = Math.max(1, Math.round(w / 1.55));
    for (let i = 0; i <= n; i++)
      box(x0 + w * i / n, 2.06, z, .085, 3.80, .26, c.bronzeD, { hard: true, gloss: .60, tag });
  }
  function frameX(x, z0, z1, tag) {
    const d = z1 - z0, cz = (z0 + z1) / 2;
    box(x, .085, cz, .34, .17, d, c.limestoneD, { hard: true, gloss: .24, tag });
    box(x, EH - .13, cz, .34, .26, d, c.walnutD, { hard: true, mode: 6, gloss: .30, tag });
    box(x, EH - .30, cz, .30, .07, d, c.bronze, { hard: true, gloss: .64, tag });
    box(x, 2.34, cz, .26, .085, d, c.bronzeD, { hard: true, gloss: .60, tag });
    const n = Math.max(1, Math.round(d / 1.55));
    for (let i = 0; i <= n; i++)
      box(x, 2.06, z0 + d * i / n, .26, 3.80, .085, c.bronzeD, { hard: true, gloss: .60, tag });
  }
  // Sliding leaves. Deliberately NO solid: the opening between the flanking solids is permanently
  // clear, so the flood fill can never find the terrace walled off because the doors happened to
  // be shut when it ran. The leaves are open long before the player reaches them.
  const doorLeaves = [];
  function slidersZ(x0, x1, z, tag) {          // opening runs along x, leaves slide along x
    const w = (x1 - x0) / 2, cx = (x0 + x1) / 2;
    for (const s of [-1, 1]) {
      const lx = cx + s * w / 2;
      const g = box(lx, 1.95, z, w - .05, 3.62, .05, c.glass, { ...GLASS, tag });
      const f = box(lx + s * (w / 2 - .05), 1.95, z, .09, 3.62, .12, c.bronze, { hard: true, gloss: .68, tag });
      const h = box(lx, 1.02, z, w - .05, .075, .11, c.bronzeL, { hard: true, gloss: .66, tag });
      for (const p of [g, f, h]) { fixed(p, w);
        doorLeaves.push({ p, s, m0: p.m, ax: 'x', travel: w - .07,
          slide: new Float32Array(16), out: new Float32Array(16) }); }
    }
  }
  function slidersX(x, z0, z1, tag) {          // opening runs along z, leaves slide along z
    const d = (z1 - z0) / 2, cz = (z0 + z1) / 2;
    for (const s of [-1, 1]) {
      const lz = cz + s * d / 2;
      const g = box(x, 1.95, lz, .05, 3.62, d - .05, c.glass, { ...GLASS, tag });
      const f = box(x, 1.95, lz + s * (d / 2 - .05), .12, 3.62, .09, c.bronze, { hard: true, gloss: .68, tag });
      const h = box(x, 1.02, lz, .11, .075, d - .05, c.bronzeL, { hard: true, gloss: .66, tag });
      for (const p of [g, f, h]) { fixed(p, d);
        doorLeaves.push({ p, s, m0: p.m, ax: 'z', travel: d - .07,
          slide: new Float32Array(16), out: new Float32Array(16) }); }
    }
  }

  // ---- south run, z = 1.60. Two openings: the guest doors on the dining-room axis, and a
  // narrower service/exit door at the west end.
  const ZE = 1.60;
  frameZ(-21.15, -18.70, ZE, '露台门'); paneZ(-21.10, -18.75, ZE, '露台门');
  frameZ(-17.70, -7.25, ZE, '露台门');  paneZ(-17.65, -7.30, ZE, '露台门');
  frameZ(-5.45, 0.09, ZE, '露台门');    paneZ(-5.50, 0.14, ZE, '露台门');
  solid(-22.00, -18.70, ZE - WH, ZE + WH);        // ENVELOPE SOLID  (runs past the walkable limit)
  solid(-17.70, -7.25, ZE - WH, ZE + WH);         // ENVELOPE SOLID
  solid(-5.45, 0.09, ZE - WH, ZE + WH);           // ENVELOPE SOLID
  blocker(-22.00, 0.09, ZE - WH, ZE + WH, EH);
  headZ(-18.70, -17.70, ZE, EH - .26, '露台', 'TERRACE', c.jade);
  headZ(-7.25, -5.45, ZE, EH - .26, '观景露台', 'SKY TERRACE', c.lacquer);
  slidersZ(-18.70, -17.70, ZE, '露台门');
  slidersZ(-7.25, -5.45, ZE, '露台门');

  // ---- east run, x = 0.00, from the south run up to the north parapet. One wide opening out of
  // the sky lounge, sitting in the gap the fit left between its two south and two north settees.
  const XE = 0.00;
  frameX(XE, 1.51, 4.70, '露台门'); paneX(XE, 1.56, 4.75, '露台门');
  frameX(XE, 6.50, 13.83, '露台门'); paneX(XE, 6.45, 13.83, '露台门');
  solid(XE - WH, XE + WH, 1.51, 4.70);            // ENVELOPE SOLID
  solid(XE - WH, XE + WH, 6.50, 15.00);           // ENVELOPE SOLID (runs past the walkable limit)
  blocker(XE - WH, XE + WH, 1.51, 15.00, EH);
  headX(XE, 4.70, 6.50, EH - .26, '天台门', 'TO TERRACE', c.lacquer);
  slidersX(XE, 4.70, 6.50, '露台门');

  const doorThing = thing('露台门', -6.35, 1.45, 1.35,
    '推开这道玻璃门就是屋顶露台，风声和京城的灯火都在外面。',
    'These glass doors open onto the roof terrace, where the wind and the city lights are.',
    '露台 is a terrace; 推门 means to push a door open.', { tag: '露台门', focus: [-6.35, .40], reach: 2.4 });

  // ===============================================================================================
  // 2.  THE PARAPET — the only thing between the deck and thirty-eight storeys of air
  // ===============================================================================================
  // PARAPET SOLIDS (the complete list; every one runs past the walkable limit so nothing survives
  // behind it, and together with the two envelope runs they close the terrace on all four sides):
  //
  //     solid(-22.00, -20.85,   1.51, 15.00)   west edge
  //     solid(-22.00,   0.09,  13.83, 15.00)   north edge
  //     (south edge  = envelope south run, z 1.51..1.69)
  //     (east edge   = envelope east run,  x -0.09..0.09)
  //
  // The fit already stood a 2 m glass screen at z = 13.78 from x -17.1 to +2.1 with no collider
  // at all; the north solid sits 0.05 m behind it, so that screen finally stops people.
  const PARA = { hard: true, gloss: .22 };
  function parapetRun(ax, at, a0, a1, tag) {
    const n = Math.max(2, Math.round((a1 - a0) / 2.55));
    const mid = (a0 + a1) / 2, len = a1 - a0;
    if (ax === 'z') {                                   // parapet runs along x at constant z
      box(mid, .21, at, len, .42, .34, c.limestone, { ...PARA, mat: 'tile', matScale: .6, matAmt: .18, tag });
      box(mid, .445, at, len, .05, .40, c.limestoneD, { ...PARA, tag });
      box(mid, 1.12, at, len, .085, .26, c.bronze, { hard: true, gloss: .66, tag });   // coping
      box(mid, 1.155, at, len, .05, .17, c.bronzeL, { hard: true, gloss: .70, tag });
      for (let i = 0; i <= n; i++)
        cyl(a0 + len * i / n, .78, at, .020, .70, c.bronzeD, { gloss: .62, tag });
      cyl(mid, .70, at + .05, .014, len, c.bronzeD, { rz: Math.PI / 2, gloss: .60, tag });
    } else {                                            // parapet runs along z at constant x
      box(at, .21, mid, .34, .42, len, c.limestone, { ...PARA, mat: 'tile', matScale: .6, matAmt: .18, tag });
      box(at, .445, mid, .40, .05, len, c.limestoneD, { ...PARA, tag });
      box(at, 1.12, mid, .26, .085, len, c.bronze, { hard: true, gloss: .66, tag });
      box(at, 1.155, mid, .17, .05, len, c.bronzeL, { hard: true, gloss: .70, tag });
      for (let i = 0; i <= n; i++)
        cyl(at, .78, a0 + len * i / n, .020, .70, c.bronzeD, { gloss: .62, tag });
      // A capsule is a cylinder along its own Y: a run along world z needs rx, not a fat sz.
      cyl(at + .05, .70, mid, .014, len, c.bronzeD, { rx: Math.PI / 2, gloss: .60, tag });
    }
  }
  parapetRun('x', -20.98, 1.55, 13.80, '女儿墙');
  parapetRun('z', 14.02, -20.90, -17.10, '女儿墙');     // the stretch the fit's glass screen misses
  solid(-22.00, -20.85, 1.51, 15.00);                   // PARAPET SOLID — west
  solid(-22.00, 0.09, 13.83, 15.00);                    // PARAPET SOLID — north
  blocker(-22.00, -20.85, 1.51, 15.00, 1.30);
  blocker(-22.00, 0.09, 13.83, 15.00, 1.30);
  // Glass above the upstand: two long panes west, one filling the north gap. Three draw calls.
  box(-20.94, 1.14, 7.02, .04, 1.32, 5.30, c.glass, { ...GLASS, alpha: .22, tag: '女儿墙' });
  box(-20.94, 1.14, 12.10, .04, 1.32, 3.30, c.glass, { ...GLASS, alpha: .22, tag: '女儿墙' });
  box(-19.00, 1.14, 13.98, 3.72, 1.32, .04, c.glass, { ...GLASS, alpha: .22, tag: '女儿墙' });
  for (const q of [[-20.90, 1.90], [-20.90, 5.60], [-20.90, 9.30], [-20.90, 13.20]])
    luminous(box(q[0] + .10, .30, q[1], .055, .09, .34, c.warm, { hard: true, mode: 1, tag: '女儿墙' }), .01, .20);
  thing('女儿墙', -20.60, 1.05, 7.60, '女儿墙上是黄铜扶手，别倚得太靠外。',
    'A bronze handrail caps the parapet — do not lean out too far.',
    '女儿墙 is a parapet wall; 扶手 is a handrail.', { tag: '女儿墙', focus: [-19.90, 7.60], reach: 2.2 });

  // ===============================================================================================
  // 3.  THE ROOMS — walls the fit-out never had
  // ===============================================================================================
  // ---- 云端中餐厅. The fit authored the north wall (z -5.12, x -13.5..1.5, 1.50 m door at
  // x -7.10..-5.60) and its two solids. Everything else is here.
  partX(-13.59, -14.80, -9.20, PH, '墙', c.wall);        // west wall, south of the pantry door
  partX(-13.59, -8.20, -5.03, PH, '墙', c.wall);         // west wall, north of it
  clereX(-13.59, -14.80, -5.03, PH, '墙');
  headX(-13.59, -9.20, -8.20, PH, '备餐间', 'PANTRY', c.jade);
  partX(1.59, -14.80, -7.00, PH, '墙', c.wall);          // east wall, south of the service door
  partX(1.59, -6.00, -5.03, PH, '墙', c.wall);
  clereX(1.59, -14.80, -5.03, PH, '墙');
  headX(1.59, -7.00, -6.00, PH, '服务通道', 'SERVICE', c.jade);
  clereZ(-13.50, 1.50, -5.12, PH, '墙');                 // closes the fit's north wall to the slab

  // ---- 备餐间: plating pantry, and where the fire stair discharges. Its north wall lines through
  // with the dining room's, so the gallery reads as one clean elevation.
  partZ(-21.30, -16.60, -5.12, PH, '备餐间', c.wallD, -22.00, -16.60);
  partZ(-15.60, -13.50, -5.12, PH, '备餐间', c.wallD);
  clereZ(-21.30, -16.60, -5.12, PH, '备餐间');
  clereZ(-15.60, -13.50, -5.12, PH, '备餐间');
  headZ(-16.60, -15.60, -5.12, PH, '备餐间', 'PANTRY', c.jade);

  // ---- 包间: two private dining rooms off the south side of the guest spine.
  partZ(1.68, 3.60, -7.31, PH, '包间', c.wall);
  partZ(4.60, 9.40, -7.31, PH, '包间', c.wall);
  partZ(10.40, 13.30, -7.31, PH, '包间', c.wall);
  clereZ(1.68, 3.60, -7.31, PH, '包间'); clereZ(4.60, 9.40, -7.31, PH, '包间');
  clereZ(10.40, 13.30, -7.31, PH, '包间');
  headZ(3.60, 4.60, -7.31, PH, '松鹤厅', 'PINE & CRANE', c.lacquer);
  headZ(9.40, 10.40, -7.31, PH, '竹韵厅', 'BAMBOO', c.jade);
  partX(7.69, -14.80, -7.22, PH, '包间', c.wall);
  clereX(7.69, -14.80, -7.22, PH, '包间');
  partX(13.39, -14.80, -7.22, PH, '包间', c.wall);
  clereX(13.39, -14.80, -7.22, PH, '包间');

  // ===============================================================================================
  // 4.  FLOORS — one field per room, laid over the fit's overlapping rugs
  // ===============================================================================================
  // The fit's terrace deck runs to x +3.4 and its lounge carpet starts at x +0.5, so the two
  // overlap by nearly three metres. Inside the envelope that overlap is now indoors; this field
  // sits above both and gives the lounge a floor that stops at its own wall.
  flat(6.62, .031, 6.50, 12.95, 15.50, c.carpet, { mode: 7, gloss: .05, tag: '天际酒廊' });
  flat(6.62, .034, 6.50, 12.55, 15.10, c.walnutD, { mode: 7, gloss: .10, tag: '天际酒廊' });
  flat(6.62, .037, 6.50, 12.10, 14.70, c.carpet, { mode: 7, gloss: .04, tag: '天际酒廊' });
  // Terrace deck: the fit's stops at x -17.4, and the west third of the roof was bare shell.
  flat(-10.42, .030, 7.62, 20.90, 12.05, c.deck,
    { mode: 7, gloss: .22, mat: 'tile', matScale: .78, matAmt: .24, tag: '观景露台' });
  flat(-10.42, .034, 7.62, 20.50, 11.70, c.limestone,
    { mode: 7, gloss: .19, mat: 'tile', matScale: .70, matAmt: .22, tag: '观景露台' });
  for (const x of [-16.9, -10.4, -3.9])
    flat(x, .038, 7.62, .07, 11.60, c.bronzeD, { gloss: .55, tag: '观景露台' });
  // Gallery, pantry and the private rooms.
  flat(-10.60, .026, -1.80, 21.00, 6.30, c.stoneL, { mode: 7, gloss: .16, mat: 'tile', matScale: .66, matAmt: .18, tag: '西廊' });
  flat(-17.55, .026, -9.95, 7.60, 9.50, c.stone, { mode: 7, gloss: .13, tag: '备餐间' });
  flat(4.64, .026, -11.05, 5.80, 7.30, c.carpet, { mode: 7, gloss: .04, tag: '松鹤厅' });
  flat(4.64, .030, -11.05, 5.30, 6.80, c.walnutD, { mode: 7, gloss: .09, tag: '松鹤厅' });
  flat(10.54, .026, -11.05, 5.40, 7.30, c.carpet, { mode: 7, gloss: .04, tag: '竹韵厅' });
  flat(10.54, .030, -11.05, 4.90, 6.80, c.walnutD, { mode: 7, gloss: .09, tag: '竹韵厅' });

  // ===============================================================================================
  // 5.  THE TERRACE — an open deck, and it has to read as sky, not as a room with the lights off
  // ===============================================================================================
  // The shared shell puts a 0.26 m slab over the whole plate at y 4.09 and no floor module can
  // remove it, so the roof is faked the only honest way available: a night soffit tight under the
  // slab, dark enough to lose its edges, with the pavilion silhouetted against it.
  // The soffit runs right into the west and north walls: stopping it short left a metre-wide strip
  // of lit shell ceiling along the roof edge, which is the one place the eye is looking.
  box(-10.84, 4.02, 8.15, 21.73, .07, 13.11, c.night, { hard: true, mode: 1, glow: .015, tag: '星空' });
  // Bronze fascia on the two edges that face the building — the eaves of the pavilion. The other
  // two die into the wall and need none.
  box(-10.84, 3.95, 1.62, 21.93, .21, .10, c.bronzeD, { hard: true, gloss: .58, tag: '星空' });
  box(0.00, 3.95, 8.15, .10, .21, 13.11, c.bronzeD, { hard: true, gloss: .58, tag: '星空' });
  for (let i = 0; i < 34; i++) {
    const a = (i * 2.399) % 1, b = (i * 5.711) % 1;
    luminous(ball(-21.2 + a * 21.0, 3.975, 2.0 + b * 12.4, .028, .012, .028, c.white,
      { mode: 1, tag: '星空' }), .06, .30);
  }
  // The fit painted its skyline boards 2.70 m tall, which leaves a bright cream band of shell wall
  // between the top of the city and the slab — from the deck that band is most of what you see
  // above the parapet, and it reads as a room, not as night. Carry the night down to the rooftops
  // and fill the two stretches of wall the boards never reached.
  box(-10.80, 3.64, 14.71, 21.85, .74, .05, c.night, { hard: true, mode: 1, glow: .012, tag: '星空' });
  box(-21.71, 3.64, 8.00, .05, .74, 13.45, c.night, { hard: true, mode: 1, glow: .012, tag: '星空' });
  box(-17.85, 1.82, 14.71, 7.75, 2.92, .05, c.night, { hard: true, mode: 1, glow: .012, tag: '星空' });
  box(-21.71, 1.82, 14.10, .05, 2.92, 1.25, c.night, { hard: true, mode: 1, glow: .012, tag: '星空' });
  for (let i = 0; i < 22; i++) {
    const a = (i * 3.673) % 1, b = (i * 7.13) % 1;
    luminous(box(-21.4 + a * 7.3, .55 + b * 2.2, 14.68, .10, .055, .03,
      i % 4 ? c.warm : c.celadonL, { hard: true, mode: 1, tag: '星空' }), .12, .34);
  }
  // Inside the gallery, the fit's west skyline board runs 1.1 m past the envelope line, so the city
  // appeared indoors. A plaster return closes the gallery's west end over it.
  box(-21.66, 2.03, -1.76, .06, 4.06, 6.62, c.wall, { hard: true, mode: 14, gloss: .12, tag: '西廊' });

  // Bronze pavilion frame — the floor's identity, and the thing that makes the terrace a room
  // without walls.
  const PX = [-19.00, -14.20, -9.40, -4.60], PZ = [3.30, 9.90];
  for (const x of PX) for (const z of PZ) {
    cyl(x, .06, z, .26, .12, c.bronzeD, { gloss: .56, tag: '青铜亭' });
    // cyl, not capsule: a capsule's hemispherical caps scale with sy, so a 3.4 m post built from
    // one tapers to a spike and stops short of the floor (visible on the fit's own lounge posts).
    cyl(x, 1.76, z, .105, 3.40, c.bronze, { gloss: .68, tag: '青铜亭' });
    for (const s of [-1, 1]) {                                    // dougong-derived bracket
      capsule(x + s * .22, 3.30, z, .05, .46, .05, c.bronzeD, { rz: s * .62, gloss: .64, tag: '青铜亭' });
      capsule(x, 3.30, z + s * .22, .05, .46, .05, c.bronzeD, { rx: -s * .62, gloss: .64, tag: '青铜亭' });
    }
    box(x, 3.52, z, .46, .10, .46, c.bronzeL, { hard: true, gloss: .70, tag: '青铜亭' });
  }
  for (const z of PZ) cyl(-11.80, 3.62, z, .040, 15.20, c.bronze, { rz: Math.PI / 2, gloss: .68, tag: '青铜亭' });
  for (const x of PX) cyl(x, 3.76, 6.60, .034, 7.00, c.bronze, { rx: Math.PI / 2, gloss: .68, tag: '青铜亭' });
  for (let i = 0; i <= 12; i++) {                                  // rafters
    const x = -19.0 + i * 1.20;
    cyl(x, 3.88, 6.60, .018, 6.90, c.bronzeD, { rx: Math.PI / 2, gloss: .60, tag: '青铜亭' });
  }
  thing('青铜亭', -11.80, 2.10, 6.60, '青铜亭架是仿斗拱做的，屋顶花园就在它下面。',
    'The bronze pavilion frame reinterprets dougong brackets; the roof garden sits beneath it.',
    '斗拱 dougong are the bracket sets of a Chinese timber roof.',
    { tag: '青铜亭', focus: [-11.80, 6.60], reach: 2.6 });

  // Lanterns on the two cross beams. They sway with the weather, about their own hooks.
  const lit = [];
  for (let i = 0; i < 7; i++) for (const z of PZ) {
    const x = -19.0 + i * 2.40;
    const p = lanternAt(x, 3.02, z, .19, i % 3 === 0 ? c.lacquer : c.warm, '灯笼', .42);
    luminous(p, .16, .40);
    addSway(p, x, 3.60, z, .085, i * .83 + (z > 6 ? 1.7 : 0), .40, 'z');
    lit.push(p);
  }
  thing('灯笼', -16.60, 2.60, 3.30, '露台的灯笼随风轻轻摆，风大的时候摆得更明显。',
    'The terrace lanterns sway with the wind, and swing wider when it picks up.',
    '灯笼 is a lantern; 风 is wind.', { tag: '灯笼', focus: [-16.60, 4.10], reach: 2.4 });

  // Wind-aware planting along the inside of the glazed elevation. Each clump's blades lean on the
  // same wind value the lanterns use, a beat behind them.
  const PLANT = [-19.80, -16.60, -13.40, -10.20, -3.80];
  for (let k = 0; k < PLANT.length; k++) {
    const x = PLANT[k], z = 2.45;
    box(x, .30, z, .84, .60, .84, c.limestone, { hard: true, gloss: .22, mat: 'tile', matScale: .5, matAmt: .18, tag: '风雨花园' });
    box(x, .615, z, .90, .07, .90, c.bronzeD, { hard: true, gloss: .60, tag: '风雨花园' });
    box(x, .625, z, .70, .06, .70, c.leafD, { mode: 15, gloss: .06, tag: '风雨花园' });
    solid(x - .45, x + .45, z - .45, z + .45);                    // planters are real obstacles
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, rr = .16 + (i % 3) * .07;
      const bx = x + Math.cos(a) * rr, bz = z + Math.sin(a) * rr;
      const p = capsule(bx, 1.20, bz, .035, 1.16, .035,
        i % 2 ? c.leaf : c.leafD, { mode: 15, rz: Math.cos(a) * .16, rx: -Math.sin(a) * .16, gloss: .08, tag: '风雨花园' });
      addSway(p, bx, .64, bz, .105, k * 1.31 + i * .55, 1.30, i % 2 ? 'z' : 'x');
    }
    ball(x, .72, z, .30, .13, .30, c.leafD, { mode: 15, gloss: .06, tag: '风雨花园' });
  }
  thing('风雨花园', -13.40, 1.10, 3.20, '风雨花园里种的是耐风的芒草，屋顶风大，别的花活不下来。',
    'The weather garden is planted with wind-tolerant grasses; little else survives the roof wind.',
    '耐风 means wind-tolerant; 芒草 is silvergrass.',
    { tag: '风雨花园', focus: [-13.40, 3.60], reach: 2.3 });

  // Terrace tables, in the two bays the fit left empty, plus braziers for the dusk shots.
  for (const q of [[-18.30, 4.90, c.silkL], [-18.30, 8.30, c.celadonL], [-18.30, 11.80, c.silkL],
                   [-12.60, 4.90, c.celadonL], [-8.40, 4.90, c.silkL], [-4.20, 4.90, c.celadonL]]) {
    roundTop(q[0], q[1], .56, c.limestone, '露台雅座');
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + .5;
      chairAt(q[0] + Math.sin(a) * 1.02, q[1] + Math.cos(a) * 1.02, a + Math.PI, '露台雅座', q[2]);
    }
    cyl(q[0], .80, q[1], .075, .10, c.bronzeD, { gloss: .60, tag: '露台雅座' });
    luminous(taper(q[0], .93, q[1], .085, .21, .085, c.warm, { mode: 1, gloss: .20, tag: '露台雅座' }), .05, .30);
  }
  thing('露台雅座', -18.30, .95, 8.30, '露台的座位朝西，日落的时候整面墙都是金色的。',
    'The terrace seats face west; at sunset the whole wall turns gold.',
    '雅座 is a good table; 日落 is sunset.', { tag: '露台雅座', focus: [-17.20, 8.30], reach: 2.3 });

  for (const q of [[-16.40, 6.60], [-6.60, 8.40]]) {
    cyl(q[0], .09, q[1], .46, .18, c.bronzeD, { gloss: .58, tag: '暖炉' });
    cyl(q[0], .52, q[1], .055, .72, c.bronzeD, { gloss: .60, tag: '暖炉' });
    cyl(q[0], .90, q[1], .34, .22, c.bronze, { gloss: .66, tag: '暖炉' });
    const f = luminous(ball(q[0], .96, q[1], .24, .16, .24, c.ember, { mode: 1, tag: '暖炉' }), .22, .46);
    taper(q[0], 1.24, q[1], .44, .30, .44, c.bronzeD, { gloss: .62, tag: '暖炉' });
    solid(q[0] - .40, q[0] + .40, q[1] - .40, q[1] + .40);
    addSway(f, q[0], .96, q[1], .045, q[0], .40, 'x');
  }
  thing('暖炉', -16.40, 1.00, 6.60, '露台的铜暖炉入夜就点着，风口那一桌全靠它。',
    'The bronze brazier is lit after dark; the table in the draught depends on it.',
    '暖炉 is a heater or brazier.', { tag: '暖炉', focus: [-15.60, 6.60], reach: 2.0 });

  light(-13.0, 2.60, 6.60, [1, .78, .50], .40, 11.0);
  light(-18.6, 2.20, 10.60, [1, .80, .55], .28, 7.5);
  glow(M.trs(-11.80, .042, 6.60, 0, 15.0, 1, 8.0), c.warm, .030);

  // ===============================================================================================
  // 6.  SKY LOUNGE — the bar the programme asked for and the floor never had
  // ===============================================================================================
  // Sits along the north elevation so the panorama the fit painted on the shell wall is what you
  // drink in front of. Counter and back-bar carry solids; the service run between them stays open
  // at both ends, so nothing behind the bar is stranded.
  box(8.10, .55, 12.30, 7.00, 1.10, .80, c.walnutD, { hard: true, mode: 6, gloss: .30, tag: '吧台' });
  box(8.10, 1.13, 12.30, 7.24, .09, .96, c.ink, { hard: true, gloss: .46, tag: '吧台' });
  box(8.10, 1.175, 12.30, 7.00, .03, .80, c.bronzeL, { hard: true, gloss: .62, tag: '吧台' });
  box(8.10, .30, 11.84, 6.90, .06, .07, c.bronze, { hard: true, gloss: .66, tag: '吧台' });   // foot rail
  for (let i = 0; i < 9; i++)
    box(4.75 + i * .84, .58, 11.90, .05, .96, .035, c.bronzeD, { hard: true, gloss: .58, tag: '吧台' });
  solid(4.55, 11.65, 11.90, 12.72);                     // counter
  blocker(4.55, 11.65, 11.90, 12.72, 1.25);
  box(8.10, 1.10, 14.24, 7.20, 2.20, .42, c.walnutD, { hard: true, mode: 6, gloss: .28, tag: '吧台' });
  for (const y of [.72, 1.24, 1.76]) {
    box(8.10, y, 14.05, 6.90, .05, .30, c.bronze, { hard: true, gloss: .64, tag: '吧台' });
    luminous(box(8.10, y + .14, 14.16, 6.80, .035, .05, c.warm, { hard: true, mode: 1, tag: '吧台' }), .03, .22);
    for (let i = 0; i < 13; i++) {
      const bx = 4.85 + i * .55, hgt = .22 + ((i * 7) % 5) * .035;
      cyl(bx, y + .04 + hgt / 2, 14.02, .048, hgt, [c.jade, c.celadon, c.lacquer, c.bronzeL, c.ink][i % 5],
        { gloss: .68, tag: '吧台' });
    }
  }
  box(8.10, 2.30, 14.24, 7.40, .18, .50, c.bronzeD, { hard: true, gloss: .60, tag: '吧台' });
  glyphs(8.10, 2.62, 13.96, 0, '天际吧台', { size: .19, gap: .05, color: c.bronzeL, mode: 1, glow: .05, lift: .01, tag: '吧台' });
  glyphs(8.10, 2.36, 13.96, 0, 'SKY BAR', { size: .075, gap: .022, color: c.white, mode: 1, lift: .01, tag: '吧台' });
  solid(4.55, 11.65, 13.90, 15.00);                     // back-bar, run out past the walkable limit
  blocker(4.55, 11.65, 13.90, 15.00, 2.45);
  for (let i = 0; i < 5; i++) {
    const sx = 5.30 + i * 1.42;
    cyl(sx, .04, 11.35, .28, .08, c.bronzeD, { gloss: .58, tag: '吧台' });
    cyl(sx, .38, 11.35, .036, .64, c.bronzeD, { gloss: .60, tag: '吧台' });
    cyl(sx, .74, 11.35, .21, .09, i % 2 ? c.silk : c.celadonL, { mode: 7, gloss: .05, tag: '吧台' });
    cyl(sx, .30, 11.35, .115, .035, c.bronze, { gloss: .62, tag: '吧台' });
  }
  thing('吧台', 8.10, 1.30, 11.60, '天际吧台只做茶酒和小点，正对着京城的夜景。',
    'The sky bar serves tea, spirits and small plates, facing the city at night.',
    '吧台 is a bar counter; 夜景 is a night view.', { tag: '吧台', focus: [8.10, 10.90], reach: 2.5 });

  // A bronze mullion grid across the shell's north wall, in front of the panorama the fit painted
  // there. Opaque, so it batches: a curtain wall for no translucent cost at all.
  for (let i = 0; i <= 9; i++)
    box(.60 + i * 1.40, 2.05, 14.64, .085, 3.90, .10, c.bronzeD, { hard: true, gloss: .60, tag: '天际酒廊' });
  for (const y of [.20, 2.34, 3.96])
    box(6.90, y, 14.64, 13.00, .10, .10, c.bronzeD, { hard: true, gloss: .60, tag: '天际酒廊' });
  // The fit's terrace glass screen overruns into this room's north-west corner; the service
  // station stands in front of it rather than leaving a pane of rail indoors.
  box(2.20, .48, 13.55, 3.70, .96, .62, c.walnutD, { hard: true, mode: 6, gloss: .30, tag: '天际酒廊' });
  box(2.20, .99, 13.55, 3.86, .07, .74, c.limestone, { hard: true, gloss: .28, tag: '天际酒廊' });
  // Runs east far enough to meet the back-bar's collider: a 0.10 m slot between two solids is
  // floor the flood fill can reach and nobody can use, and it reads as a crack in the joinery.
  solid(.25, 4.05, 13.20, 15.00);
  light(8.10, 2.55, 12.30, [1, .80, .56], .42, 8.0);

  // ===============================================================================================
  // 7.  西廊 — the terrace foyer, and the west end of the guest spine
  // ===============================================================================================
  // The fit hung a 3.2 m ink-wash at x -14.0 facing east with nothing behind it. It gets a proper
  // bronze-footed stand rather than a partition, because a wall on that line would cut the spine.
  for (const s of [-1, 1]) {
    cyl(-14.16, 1.62, -3.65 + s * 1.72, .030, 3.10, c.bronzeD, { gloss: .62, tag: '云山水墨' });
    box(-14.16, .10, -3.65 + s * 1.72, .52, .20, .40, c.bronzeD, { hard: true, gloss: .58, tag: '云山水墨' });
  }
  box(-14.16, 3.22, -3.65, .30, .16, 3.62, c.bronze, { hard: true, gloss: .66, tag: '云山水墨' });
  box(-14.30, 1.62, -3.65, .10, 3.00, 3.44, c.ink, { hard: true, gloss: .18, tag: '云山水墨' });

  // Host stand, off the spine centreline so the walking route stays clear.
  box(11.60, .52, -1.70, 1.10, 1.04, .58, c.walnutD, { hard: true, mode: 6, gloss: .32, tag: '迎宾台' });
  box(11.60, 1.06, -1.70, 1.24, .07, .70, c.limestone, { hard: true, gloss: .30, tag: '迎宾台' });
  box(11.60, .54, -1.99, .92, .82, .04, c.lacquer, { hard: true, gloss: .26, tag: '迎宾台' });
  luminous(box(11.60, 1.14, -1.70, .30, .04, .22, c.warm, { hard: true, mode: 1, tag: '迎宾台' }), .04, .26);
  glyphs(11.60, .70, -2.02, Math.PI, '迎宾台', { size: .13, gap: .035, color: c.bronzeL, mode: 1, lift: .008, tag: '迎宾台' });
  solid(11.00, 12.20, -2.05, -1.35);
  thing('迎宾台', 11.60, 1.15, -2.10, '迎宾台在电梯厅口，先在这里报名字再上露台。',
    'The host stand is at the lift hall; guests give their name here before going out to the terrace.',
    '迎宾 means to greet guests.', { tag: '迎宾台', focus: [11.60, -2.90], reach: 2.1 });

  // Gallery bench and planters, against the solid stretch of the glazed elevation.
  for (const x of [-11.30, -1.90]) {
    box(x, .21, .60, 2.60, .42, .52, c.walnutD, { hard: true, mode: 6, gloss: .30, tag: '西廊' });
    box(x, .44, .60, 2.66, .08, .58, c.silk, { mode: 7, gloss: .04, tag: '西廊' });
    solid(x - 1.35, x + 1.35, .32, .90);
  }
  for (let i = 0; i <= 6; i++)
    luminous(ball(-16.0 + i * 2.60, 3.62, -1.20, .10, .15, .10, c.warm, { mode: 1, tag: '西廊' }), .06, .30);
  glyphs(-8.00, 3.00, 1.44, Math.PI, '观景露台', { size: .21, gap: .055, color: c.bronzeL, mode: 1, glow: .05, lift: .012, tag: '西廊' });

  // ===============================================================================================
  // 8.  备餐间 and the 包间 — the rooms behind the new doors
  // ===============================================================================================
  box(-14.10, .48, -12.10, .82, .96, 4.60, c.steel, { hard: true, gloss: .42, tag: '备餐间' });
  box(-14.10, .99, -12.10, .90, .07, 4.70, c.steel, { hard: true, gloss: .58, tag: '备餐间' });
  solid(-14.55, -13.65, -14.45, -9.75);
  for (let i = 0; i < 5; i++) {
    box(-14.10, 1.62, -14.10 + i * .96, .62, .06, .80, c.steel, { hard: true, gloss: .50, tag: '备餐间' });
    box(-14.10, 2.06, -14.10 + i * .96, .62, .06, .80, c.steel, { hard: true, gloss: .50, tag: '备餐间' });
    for (let k = 0; k < 3; k++)
      cyl(-14.10 + (k - 1) * .21, 1.72, -14.10 + i * .96, .095, .14, k % 2 ? c.celadonL : c.white,
        { gloss: .34, tag: '备餐间' });
  }
  box(-19.40, .46, -12.60, 2.60, .92, .78, c.steel, { hard: true, gloss: .40, tag: '备餐间' });
  box(-19.40, .95, -12.60, 2.70, .07, .86, c.steel, { hard: true, gloss: .60, tag: '备餐间' });
  solid(-20.75, -18.05, -13.05, -12.15);
  for (const x of [-20.30, -18.50])
    luminous(box(x, 3.72, -11.60, 1.30, .05, .30, c.white, { hard: true, mode: 1, tag: '备餐间' }), .10, .26);
  glyphs(-16.10, 2.10, -5.30, Math.PI, '备餐间', { size: .15, gap: .04, color: c.bronzeL, mode: 1, lift: .01, tag: '备餐间' });
  thing('备餐间', -16.10, 1.45, -8.20, '备餐间连着安全楼梯，热菜从这儿上桌，也是员工上下的路。',
    'The pantry adjoins the fire stair: dishes are plated here, and it is the staff route up and down.',
    '备餐间 is a plating pantry; 安全楼梯 is a fire stair.',
    { tag: '备餐间', focus: [-16.10, -7.40], reach: 2.5 });

  function privateRoom(cx, cz, hz, en, accent, cloth, seats) {
    cyl(cx, .06, cz, .62, .12, c.bronzeD, { gloss: .56, tag: hz });
    cyl(cx, .40, cz, .065, .70, c.bronzeD, { gloss: .60, tag: hz });
    cyl(cx, .74, cz, 1.30, .15, c.walnut, { gloss: .32, tag: hz });
    const turn = cyl(cx, .845, cz, .60, .05, c.celadonL, { gloss: .76, tag: hz });
    fixed(turn, 1.0);
    const tBase = M.mul(M.trans(-cx, 0, -cz), turn.m), tT = M.trans(cx, 0, cz);
    const tRot = new Float32Array(16), tTmp = new Float32Array(16), tOut = new Float32Array(16);
    onTick(t => { M.rotY(t * .055, tRot); M.mul(tRot, tBase, tTmp); M.mul(tT, tTmp, tOut); turn.m = tOut; });
    solid(cx - 1.35, cx + 1.35, cz - 1.35, cz + 1.35);
    for (let i = 0; i < seats; i++) {
      const a = i / seats * Math.PI * 2;
      chairAt(cx + Math.sin(a) * 1.92, cz + Math.cos(a) * 1.92, a + Math.PI, hz, i % 2 ? cloth : c.silk);
      box(cx + Math.sin(a) * 1.02, .815, cz + Math.cos(a) * 1.02, .28, .015, .28, c.white,
        { hard: true, mode: 7, ry: -a, gloss: .30, tag: hz });
      cyl(cx + Math.sin(a) * .80, .845, cz + Math.cos(a) * .80, .045, .075, c.celadon, { gloss: .40, tag: hz });
    }
    for (let i = 0; i < 3; i++) {
      const p = lanternAt(cx + (i - 1) * .72, 2.62, cz, .155, i === 1 ? c.lacquer : c.warm, hz, 1.32);
      luminous(p, .18, .40);
    }
    box(cx, .44, cz - 2.90, 3.20, .88, .52, c.walnutD, { hard: true, mode: 6, gloss: .30, tag: hz });
    box(cx, .90, cz - 2.90, 3.30, .06, .60, c.limestone, { hard: true, gloss: .30, tag: hz });
    solid(cx - 1.65, cx + 1.65, cz - 3.20, cz - 2.60);
    box(cx, 1.92, cz - 3.14, 2.40, 1.40, .07, c.ink, { hard: true, gloss: .18, tag: hz });
    box(cx, 1.92, cz - 3.19, 2.56, 1.56, .05, c.bronzeD, { hard: true, gloss: .58, tag: hz });
    glyphs(cx, 1.92, cz - 3.11, 0, hz, { size: .32, gap: .09, color: c.bronzeL, mode: 1, glow: .04, lift: .01, tag: hz });
    light(cx, 2.90, cz, [1, .82, .58], .34, 6.0);
    glow(M.trs(cx, .044, cz, 0, 5.0, 1, 5.0), c.warm, .036);
    thing(hz, cx, 1.35, cz + 2.60, `${hz}是可以关起门来吃饭的包间，${en}。`,
      `${hz} is a private dining room that can be closed off.`,
      '包间 is a private room; 转盘 is the lazy Susan on the table.',
      { tag: hz, focus: [cx, cz + 1.9], reach: 2.6 });
  }
  privateRoom(4.64, -11.05, '松鹤厅', 'pine and crane', c.lacquer, c.celadon, 8);
  privateRoom(10.54, -11.05, '竹韵厅', 'bamboo rhyme', c.jade, c.celadonL, 6);

  // ===============================================================================================
  // 9.  MOTION — one tick, weather-linked, no timer of its own
  // ===============================================================================================
  // ---- the day, asked of the one module that owns the question.
  //
  // js/disrupt.js rolls the day once off the calendar and every location the sky can reach asks it
  // the same thing: there is one fog, and the flight board, the metro notice and this roof all ask
  // it what it is doing today. So there is deliberately NO roll here — no Math.random, no counter,
  // no wall clock — and nothing on this floor decides for itself that it is windy.
  //
  // `Weather.now.wind` is still read, for the minute-to-minute envelope only. That is the same
  // shared weather system, not a second opinion: a front that arrives at four in the afternoon
  // should build over twenty minutes rather than step at midnight, and `disruptFor` is a whole-day
  // operational severity that deliberately knows nothing about the hour. The day sets how rough
  // today can get; the envelope decides how much of it is happening now.
  const SHUT = .60;    // storm .68, snow .76 and fog .92 shut the deck. wind .42 and rain .24 do not.
  let dayKnown = -1, daySev = 0, deckOpen = true, thin = null;
  // The rows this floor authored for the open deck, found back off the shared roster rather than
  // through a module-scope variable: nothing in this file may leak a new global. They are the only
  // people the weather and the quality tier are allowed to remove — the terrace is the one room
  // here that has no roof, and they are the only guests who are scenery rather than service.
  const roster = typeof HotelCast !== 'undefined' ? HotelCast : [];
  const deckCast = roster.filter(n =>
    typeof n.hotelGuestId === 'string' && n.hotelGuestId.startsWith('hotel12-deck-'));
  // `npcAwake` (game.js:3969) reads `hours` before `spots`, and `within(0, 0)` is false for every
  // hour of the day, so this is how a shift ends without touching anybody's routine. Null hands the
  // row straight back to its own spot windows. Staff are never thinned: a rooftop restaurant with
  // no diners on it is quiet, but one with no staff on it is shut.
  function apply() {
    for (const n of deckCast) n.hours = (thin || !deckOpen) ? [0, 0] : null;
    if (doorThing) {
      doorThing.sentence = deckOpen
        ? '推开这道玻璃门就是屋顶露台，风声和京城的灯火都在外面。'
        : '今天风雨太大，露台暂停开放，请在室内用餐。';
      doorThing.tr = deckOpen
        ? 'These glass doors open onto the roof terrace, where the wind and the city lights are.'
        : 'The terrace is closed in this weather today; dining is indoors.';
    }
  }
  function readDay() {
    const W = (typeof Weather !== 'undefined' && Weather.now) ? Weather.now : null;
    const d = W && Number.isFinite(W.day) ? W.day : 1;
    // Asked every tick rather than memoised on the day alone. `Weather.force` changes what today is
    // without the calendar moving — the debug key does it and so does the HT12-weather-garden
    // camera — and a memo keyed on the day would answer with the sky from before the override for
    // the rest of that day. This is the trap disrupt.js documents at its own planFor(); Disrupt
    // memoises internally, so asking costs a comparison rather than a roll.
    const sev = (typeof Disrupt !== 'undefined' && Disrupt.today) ? (Disrupt.today(d).sev || 0) : 0;
    // Cast density follows the quality tier for the same reason mesh density does: the bottom two
    // tiers exist because a machine could not hold 60 Hz, and a figure is the most expensive thing
    // in the room. Two property reads and a comparison, not a rebuild.
    const q = (typeof Perf !== 'undefined' && Perf.q) ? Perf.q.en : 'high';
    const lean = q === 'basic' || q === 'low';
    if (d === dayKnown && sev === daySev && lean === thin) return;
    dayKnown = d; daySev = sev; thin = lean; deckOpen = sev < SHUT;
    apply();
  }
  readDay();

  let open = 0;
  onTick((t, body, clock, dt) => {
    readDay();
    const wind = (typeof Weather !== 'undefined' && Weather.now && Number.isFinite(Weather.now.wind))
      ? Weather.now.wind : .14;
    const k = .34 + daySev * 1.70 + wind * .42;
    for (const q of swayers) {
      const a = Math.sin(t * (q.axis === 'x' ? .78 : .72) + q.ph) * q.amp * k;
      q.axis === 'x' ? M.rotX(a, rotBuf) : M.rotZ(a, rotBuf);
      M.mul(rotBuf, q.base, q.tmp); M.mul(q.T, q.tmp, q.out); q.p.m = q.out;
    }
    // The terrace doors ease apart on approach, exactly like the lobby entrance. They carry no
    // collider, so the opening between the flanking solids is clear whatever the leaves are doing.
    const bx = body && Number.isFinite(body.x) ? body.x : 99;
    const bz = body && Number.isFinite(body.z) ? body.z : 99;
    const near = (Math.abs(bz - 1.60) < 4.2 && bx > -20.0 && bx < 1.5) ||
                 (Math.abs(bx) < 4.2 && bz > 2.0 && bz < 10.0);
    const target = near ? 1 : 0;
    open += (target - open) * (1 - Math.exp(-(dt || .016) * (target ? 6.4 : 4.0)));
    for (const q of doorLeaves) {
      const d = q.s * q.travel * open;
      q.ax === 'x' ? M.trans(d, 0, 0, q.slide) : M.trans(0, 0, d, q.slide);
      M.mul(q.slide, q.m0, q.out); q.p.m = q.out;
    }
    A.state.terrace = { doors: +open.toFixed(3), wind: +k.toFixed(3),
                        sev: +daySev.toFixed(3), open: deckOpen, thin: !!thin };
  });
  doorThing.note = '露台 is a terrace; 推门 means to push a door open.';

  // ===============================================================================================
  // 10.  CAMERA ROOMS — registered for volumes that now physically exist
  // ===============================================================================================
  // Smallest first. None of these nest, and none of them narrow walking: build.js clampMove picks
  // the least restrictive zone the body is in, and the shell's floor-wide baseZone always wins.
  // `near` caps the chase distance (game.js:12093-12096), so it is the half-depth of the room the
  // eye has to stay inside, not a taste setting. Measured against each room's short dimension.
  if (cameraRoom) {
    cameraRoom('hotel12-private-b', 7.78, 13.30, -14.55, -7.40, 2.70);
    cameraRoom('hotel12-private-a', 1.68, 7.60, -14.55, -7.40, 2.85);
    cameraRoom('hotel12-pantry', -21.30, -13.68, -14.55, -5.12, 3.10);
    cameraRoom('hotel12-chinese-dining', -13.50, 1.50, -14.55, -5.12, 4.20);
    cameraRoom('hotel12-private-gallery', 1.68, 11.35, -7.22, -5.03, 2.20);
    cameraRoom('hotel12-west-gallery', -21.15, 0.00, -5.03, 1.51, 3.20);
    cameraRoom('hotel12-sky-lounge', 0.09, 13.30, -1.30, 14.40, 4.60);
    cameraRoom('hotel12-lift-landing', 11.45, 17.85, -7.05, 2.05, 3.60);
    // The terrace is the one volume here with no ceiling in the fiction and a real slab in fact,
    // so its `near` is set by height rather than by plan. HT12-overview asks for 14.5 m at pitch
    // 0.32 from lookY 1.52; the eye therefore climbs 14.5*sin(.32) = 4.56 m, to 6.08 — straight
    // through the 4.09 m slab, and with no room registered the shot came back as the OUTSIDE of
    // the roof against a black sky. The largest distance that keeps the eye under the night
    // soffit at 3.98 is (3.98-1.52)/sin(.32) = 7.8, so 6.50 leaves headroom and still frames the
    // whole glazed corner. It clamps nothing else: the other four terrace shots are 5.0-6.0 m.
    cameraRoom('hotel12-terrace', -20.55, -0.09, 1.72, 13.55, 6.50);
  }
});

// =================================================================================================
// 11.  THE PEOPLE — the rooms this module built, staffed
// =================================================================================================
// Pushed at module scope, not inside the builder: game.js:1332 folds HotelCast into NPCS while the
// page loads, long before anybody rides to the twelfth floor, and a roster row added at build time
// would never be seen.
//
// Every position below stands on geometry authored in THIS file, for one reason. `chair()` in
// js/hotel-guests.js puts its backrest at +ry, so the fit's banquet rings — written
// `chair(x + sin(a)*r, z + cos(a)*r, a + PI)` — have the backrest between the sitter and the table
// and the sitter facing outward. `chairAt()` in this file is the opposite convention (back at
// -yaw, occupant faces +yaw), so its rings are correct. Seating anybody new on the fit's rings
// would put a chair back in their lap; that is reported rather than papered over, and nothing here
// sits on a chair this module did not build.
//
// Figures are the most expensive thing that can be added to a room, so the count is deliberately
// small and every row is hour-gated. Peak concurrency is at dinner; before eleven in the morning
// the restaurant is shut and the floor is empty, which is what a rooftop restaurant does.
(() => {
  // `hair` is a parameter and not a function of the seed, because js/speech.js:81 reads the
  // hairstyle to decide whether the baked voice is a woman's — 'bun' is in its WOMANS_HAIR list.
  // Seeding it meant the bartender's sex was decided by whether 51221 happened to be odd, and it
  // came out a man with a bun and a woman's voice.
  const staffLook = (seed, jacket, apron, hair) => ({
    skin: ['#d8a57e', '#c9916b', '#e1af87'][seed % 3],
    hair: ['#29221f', '#352a25', '#211d1a'][seed % 3],
    hairStyle: hair, top: '#efe7d8', pants: '#33373c', shoe: '#26282b',
    jacket, apron, scarf: '#9b7442', collar: 'mandarin', uniform: 'staff',
    tall: .96 + (seed % 4) * .025, wide: .93 + (seed % 3) * .025, faceSeed: seed,
  });
  const guestLook = (seed, top, style) => ({
    skin: ['#d9a67e', '#c88f68', '#e1b088'][seed % 3],
    hair: ['#2c2521', '#3a302a', '#211c19'][seed % 3],
    hairStyle: style || 'short', top, pants: '#39434a', shoe: '#e6dfd3',
    collar: seed % 2 ? 'crew' : 'shirt',
    tall: .94 + (seed % 5) * .025, wide: .91 + (seed % 3) * .035, faceSeed: seed,
  });

  // 餐饮部 keeps its lacquer-red service jacket on this floor; 工程部 keeps B1's slate blue. That
  // is the department read at walking distance, and it is the same pairing the other floors use.
  const FB = '#6a3d35', FBD = '#8a5a3c', ENG = '#4f6264';

  const cast = [
    // ---- 餐饮部 · the sky bar. Section 6 built the counter and the back-bar and left the service
    // run between them open at its east end; this is the only person who works inside it.
    { hotelGuestId: 'hotel12-bar-shi-yan', hz: '酒廊调酒师', name: '石岩', py: 'Shí Yán',
      place: 'hotel12', dept: 'food-beverage', temper: 'dry', gender: 'male', ageBand: 'adult',
      look: staffLook(51221, FB, '#2f2b28', 'short'),
      spots: [{ h0: 16, h1: 24, at: [8.10, 13.31], face: Math.PI, act: 'vend' }],
      lines: [['天际吧台只做茶、酒和小点，厨房在楼下。',
               'The sky bar serves tea, spirits and small plates; the kitchen is downstairs.'],
              ['坐吧台可以看着调，坐沙发我给您端过去。',
               'At the counter you can watch; on the sofas I bring it over.'],
              ['风大的晚上露台关，酒廊照常开。',
               'On windy nights the terrace closes but the lounge stays open.']] },

    // ---- 餐饮部 · the plating pantry in section 8. He stands west of the steel counter, so the
    // 备餐间 door frames a working kitchen rather than an empty steel room.
    { hotelGuestId: 'hotel12-pantry-zou-ping', hz: '备餐间厨师', name: '邹平', py: 'Zōu Píng',
      place: 'hotel12', dept: 'food-beverage', temper: 'brusque', gender: 'male', ageBand: 'mature',
      look: staffLook(51222, FBD, '#cfc6b4', 'short'),
      spots: [{ h0: 10.5, h1: 23, at: [-15.10, -12.10], face: Math.PI / 2, act: 'work', held: null }],
      lines: [['热菜在这儿装盘，出门就是餐厅。',
               'Dishes are plated here and go straight through to the dining room.'],
              ['安全楼梯在后面，员工都走那边。',
               'The fire stair is behind me; the staff all use it.']] },

    // ---- 餐饮部 · the host stand in section 7, on the lift-landing side of the spine.
    { hotelGuestId: 'hotel12-host-min-jia', hz: '迎宾员', name: '闵佳', py: 'Mǐn Jiā',
      place: 'hotel12', dept: 'food-beverage', temper: 'poised', gender: 'female', ageBand: 'young',
      look: staffLook(51223, FB, null, 'bun'),
      spots: [{ h0: 11, h1: 24, at: [11.60, -0.90], face: Math.PI, act: 'hands' }],
      lines: [['请问您几位？订了包间还是露台？',
               'How many are you? Did you book a private room or the terrace?'],
              ['松鹤厅坐八位，竹韵厅坐六位。',
               'The Songhe room seats eight, the Zhuyun room six.'],
              ['露台看天气，风大就不开了。',
               'The terrace depends on the weather; in a strong wind it does not open.']] },

    // ---- 餐饮部 · the dining room at dinner. She works the zero-waste service counter on the
    // south wall, which is what HT12-chinese-dining looks at and what was empty after five.
    { hotelGuestId: 'hotel12-server-chang-yue', hz: '中餐厅服务员', name: '常悦', py: 'Cháng Yuè',
      place: 'hotel12', dept: 'food-beverage', temper: 'warm', gender: 'female', ageBand: 'adult',
      look: staffLook(51224, FB, '#b8a892', 'bun'),
      spots: [{ h0: 11, h1: 17, at: [-6.00, -12.70], face: Math.PI, act: 'work', held: null },
              // The service aisle south of the three banquet tables, not between two chairs: the
              // rings are 2.0 m radius, so the only clear standing room is behind them.
              { h0: 17, h1: 23, at: [-3.20, -12.20], face: 0, act: 'carry', held: 'tray' }],
      lines: [['这道要趁热吃，凉了就不是那个味儿了。',
               'Eat this while it is hot; cold it is not the same dish.'],
              ['转盘慢慢转，别抢。',
               'Turn the lazy Susan slowly, there is no hurry.'],
              ['要茶还是要热水？',
               'Would you like tea, or hot water?']] },

    // ---- 工程部 · HOTEL_DEPARTMENTS gives engineering floors B1 *and* 12, and until now the roof
    // half of that line was a claim with nobody behind it. This is the second engineer, not 马建国
    // wearing two hats: one name is one person, and the basement engineer is a named character with
    // his own face on B1 who does not also appear twelve storeys up.
    { hotelGuestId: 'hotel12-engineer-qi-chuan', hz: '工程部技工', name: '祁川', py: 'Qí Chuān',
      place: 'hotel12', dept: 'engineering', temper: 'steady', gender: 'male', ageBand: 'adult',
      look: staffLook(51225, ENG, null, 'short'),
      spots: [{ h0: 9.5, h1: 10.5, at: [-19.00, 4.30], face: Math.PI, act: 'check' }],
      lines: [['青铜亭架和灯笼线路每天早上看一遍。',
               'The pavilion frame and the lantern wiring get checked every morning.'],
              ['屋顶的风比楼下大得多，螺栓要常紧。',
               'The wind up here is far stronger than downstairs; the bolts need watching.']] },

    // ---- 观景露台 · two on the west table, facing each other across it. Both carry the
    // hotel12-deck- prefix, which is what section 9 looks for when the day is too rough to sit
    // outside: on a storm, snow or fog day these two are not on the roof at all.
    { hotelGuestId: 'hotel12-deck-diner-a', hz: '客人', place: 'hotel12', temper: 'genial',
      gender: 'female', ageBand: 'adult',
      seatY: .47, look: guestLook(51232, '#8a5f4c', 'bun'),
      spots: [{ h0: 17, h1: 23, at: [-17.811, 9.195], face: 3.6416, act: 'eat' }] },
    { hotelGuestId: 'hotel12-deck-diner-b', hz: '客人', place: 'hotel12', temper: 'patient',
      gender: 'male', ageBand: 'mature',
      seatY: .47, look: guestLook(51233, '#556b63', 'short'),
      spots: [{ h0: 17, h1: 23, at: [-17.769, 7.429], face: 5.7360, act: 'drink' }] },
  ];

  // The loader normally evaluates a module once, but a development reload or a harness recovering
  // from a partial page can evaluate it again. Stable ids make this exact-once without conflating
  // the deliberately repeated label 客人.
  if (typeof HotelCast !== 'undefined')
    for (const n of cast)
      if (!HotelCast.some(q => q.hotelGuestId === n.hotelGuestId)) HotelCast.push(n);
})();
