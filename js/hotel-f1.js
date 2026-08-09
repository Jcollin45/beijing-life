// 🏨 京华大酒店 · Floor 1 — the interior architecture
//
// This floor's own module. Registered into HotelFit (declared in js/hotel.js). Nothing else in
// the build writes to this file, and you must not write to anyone else's.
//
// Programme for this level, from HOTEL.md:
//   arrival, lobby, reception, concierge, bell desk, luggage, tea lounge, grand stair
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
//   scene key   hotel
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
//     node /private/tmp/claude-501/-Users-jonahcollins-Desktop-Chinesegame/a3cc9bcf-53f0-4e3d-a6a3-24cb996ed8a1/scratchpad/floorprobe.js hotel -22 22 -15 15 15.6 -3.7
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
//   * `node --check js/hotel-f1.js` after every edit. A backtick inside a template literal
//     ends the string mid-statement; that has broken this project three times.
//
// ---------------------------------------------------------------------------------------------

try {
  Glyphs.need('行李房京华画廊客梯厅服务梯厅水景庭大堂茶廊礼宾部前台门斗大楼梯员工通道' +
    '寄存迎宾台大堂吧长廊庭院入口出口楼层客房服务中心一层平面石阶回廊' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
} catch (_) {}

HotelFit.register('hotel', A => {
  const { box, cyl, ball, capsule, taper, flat, glyphs, solid, blocker, shade, glow, thing } = A;
  const { C, col, RX, RZ, H, light, luminous, onTick, cameraRoom } = A;

  // Underside of the shell ceiling slab: box(0,H-.13,0,...,.26,...) means the plaster stops at
  // 4.09.  Every soffit, beam and cornice below hangs from this datum, never through it.
  const CH = H - .26;

  // Palette matched to the fit-out already standing on this floor (js/hotel-public.js) so the
  // architecture and the furniture read as one building rather than two authors.
  // Values regraded 2026-08-08 in step with js/hotel-public.js — the pale end of this palette was
  // 0.80-0.93 sRGB, above the ~0.80 ceiling ART.md sets for anything that is not a light fitting,
  // and .audit-HT1-ink-stair showed what that costs: a grand stair of untextured near-white slabs.
  const T = {
    stone:C('#c2b7a2'), stoneL:C('#cec6b8'), stoneD:C('#a99b86'), plaster:C('#c4bdab'),
    walnut:C('#493329'), walnutL:C('#76513c'), walnutD:C('#2c211d'),
    bronze:C('#a7783e'), bronzeL:C('#d5aa68'), bronzeD:C('#62452c'),
    lacquer:C('#922f28'), lacquerD:C('#5b2826'), celadon:C('#7f9f8f'), celadonL:C('#a9bcb0'),
    jade:C('#3f6d5e'), ink:C('#202527'), cream:C('#d3ccbf'), warm:C('#ffe1a3'),
    silk:C('#c1a48f'), glassD:C('#26363b'), glass:C('#8daab3'), leaf:C('#536f59'),
  };

  // The tower's material kit. Numerically identical to the copy in js/hotel-public.js on purpose:
  // build.js:329-331 keys batches on (mat, matScale, matAmt, nrmAmt), so matching tuples let this
  // module's partitions batch together with the fit-out's furniture instead of doubling the calls.
  // Change one, change both. Roughness is 1 - gloss (gl.js:778): stone .16-.22, timber .22-.30,
  // aged bronze .34, polished brass .78, textile .03-.09.
  const MAT = {
    stone:  { mat:'plaster', matScale:2.30, matAmt:.16, nrmAmt:.62 },
    timber: { mat:'wood',    matScale:.95,  matAmt:.26, nrmAmt:.34 },
    cloth:  { mat:'fabric',  matScale:.52,  matAmt:.26, nrmAmt:.46 },
    paving: { mat:'concrete',matScale:1.85, matAmt:.17, nrmAmt:.30 },
  };
  const AGED = .34, POLISH = .78;

  // ---------------------------------------------------------------------------------------------
  // PARTITION KIT
  //
  // Everything here takes EXTENTS (x0,x1,z0,z1), never centre+size, because `solid` does and the
  // one way to put a collider where the wall is not is to mix the two conventions in one file.
  // `wall()` converts to centre+size exactly once, at the bottom, for the render call.
  // ---------------------------------------------------------------------------------------------

  const lit = [];

  // Dado, bronze datum and cornice on both exposed faces of a run.  A partition without a base
  // and a head is a card standing on the floor; this is what stops that reading.
  const dress = (x0, x1, z0, z1, o = {}) => {
    const alongX = (x1 - x0) >= (z1 - z0);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const L = (alongX ? x1 - x0 : z1 - z0) + .002;
    const tag = o.tag || '隔墙';
    const band = (y, hh, dep, c, gl, mo) => {
      for (const s of [-1, 1]) {
        if (o.faces === 'lo' && s > 0) continue;
        if (o.faces === 'hi' && s < 0) continue;
        if (alongX) box(cx, y, (s < 0 ? z0 : z1) + s * dep / 2, L, hh, dep, c,
          { hard:true, gloss:gl, mode:mo, tag });
        else box((s < 0 ? x0 : x1) + s * dep / 2, y, cz, dep, hh, L, c,
          { hard:true, gloss:gl, mode:mo, tag });
      }
    };
    const top = o.h ?? CH;
    band(.50, 1.00, .045, T.walnut, .28, 6);            // walnut dado
    band(1.045, .055, .075, T.bronzeL, .70);            // bronze datum
    if (top > 2.60) band(top - .43, .17, .095, T.walnutD, .30, 6);   // cornice bed mould
    if (top > 2.60) band(top - .27, .12, .175, T.stoneL, .20);       // cornice cap
  };

  // One partition: what you SEE, what STOPS you, what stops the CAMERA, and its trim.
  const wall = (x0, x1, z0, z1, o = {}) => {
    const h = o.h ?? CH, y0 = o.y0 ?? 0;
    box((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2, x1 - x0, h, z1 - z0,
      o.c ?? T.plaster, { hard:true, gloss:o.gloss ?? .13, mode:o.mode ?? 14, tag:o.tag || '隔墙' });
    if (o.solid !== false) solid(x0, x1, z0, z1);
    if (o.blocker !== false) blocker(x0 - .03, x1 + .03, z0 - .03, z1 + .03, o.top ?? (y0 + h));
    if (o.dress !== false) dress(x0, x1, z0, z1, { ...o, h });
  };

  // A head over an opening: geometry only, deliberately no solid, so the doorway stays walkable.
  // `deep` reveals the jamb so the opening has thickness instead of being a hole in a card.
  const head = (x0, x1, z0, z1, y0, y1, o = {}) => {
    const tag = o.tag || '门洞';
    box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0,
      o.c ?? T.plaster, { hard:true, gloss:.13, mode:14, tag });
    const alongX = (x1 - x0) >= (z1 - z0);
    // Bronze soffit reveal under the lintel: the edge a real opening always has.
    if (alongX) box((x0 + x1) / 2, y0 + .028, (z0 + z1) / 2, x1 - x0 - .06, .055, z1 - z0 + .05,
      T.bronzeD, { hard:true, gloss:.62, tag });
    else box((x0 + x1) / 2, y0 + .028, (z0 + z1) / 2, x1 - x0 + .05, .055, z1 - z0 - .06,
      T.bronzeD, { hard:true, gloss:.62, tag });
  };

  // Square limestone column with a bronze collar, plinth and capital.  Columns are how this lobby
  // gets a midground: they stand in the room, not against a wall.
  const column = (cx, cz, r = .26, o = {}) => {
    const tag = o.tag || '柱';
    const h = o.h ?? CH;
    box(cx, .10, cz, r * 2 + .16, .20, r * 2 + .16, T.stoneD, {...MAT.stone, hard:true, gloss:.20, tag });
    box(cx, .225, cz, r * 2 + .09, .055, r * 2 + .09, T.bronzeD, { hard:true, gloss:AGED, tag });
    box(cx, (.25 + h - .30) / 2, cz, r * 2, h - .55, r * 2, T.stone,
      {...MAT.stone,  hard:true, gloss:.17, mode:14, tag });
    for (const s of [-1, 1]) {
      box(cx + s * (r + .012), 1.045, cz, .024, .055, r * 2 - .02, T.bronzeL, { hard:true, gloss:POLISH, tag });
      box(cx, 1.045, cz + s * (r + .012), r * 2 - .02, .055, .024, T.bronzeL, { hard:true, gloss:POLISH, tag });
    }
    box(cx, h - .215, cz, r * 2 + .13, .13, r * 2 + .13, T.walnutD, {...MAT.timber, hard:true, gloss:.30, mode:6, tag });
    box(cx, h - .09, cz, r * 2 + .21, .13, r * 2 + .21, T.stoneL, {...MAT.stone, hard:true, gloss:.20, tag });
    solid(cx - r, cx + r, cz - r, cz + r);
    blocker(cx - r - .02, cx + r + .02, cz - r - .02, cz + r + .02, h);
  };

  // A dropped beam between columns.  Geometry only — a beam you can walk under.
  const beam = (x0, x1, z0, z1, y0 = CH - .52, y1 = CH, o = {}) => {
    const tag = o.tag || '梁';
    box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0,
      o.c ?? T.plaster, { hard:true, gloss:.14, mode:14, tag });
    const alongX = (x1 - x0) >= (z1 - z0);
    if (alongX) {
      box((x0 + x1) / 2, y0 + .045, (z0 + z1) / 2, x1 - x0, .09, z1 - z0 + .09, T.walnutD,
        {...MAT.timber, hard:true, gloss:.30, mode:6, tag });
      for (const s of [-1, 1]) box((x0 + x1) / 2, y0 + .16, (s < 0 ? z0 : z1) + s * .028,
        x1 - x0, .045, .055, T.bronzeL, { hard:true, gloss:.68, tag });
    } else {
      box((x0 + x1) / 2, y0 + .045, (z0 + z1) / 2, x1 - x0 + .09, .09, z1 - z0, T.walnutD,
        {...MAT.timber, hard:true, gloss:.30, mode:6, tag });
      for (const s of [-1, 1]) box((s < 0 ? x0 : x1) + s * .028, y0 + .16, (z0 + z1) / 2,
        .055, .045, z1 - z0, T.bronzeL, { hard:true, gloss:.68, tag });
    }
    // Deliberately no blocker: `blocker` has no underside, so one hung on a beam would fence the
    // chase camera out of the floor beneath it as well.
  };

  // A coffer is a frame hung under the slab, not a hole in it: the slab is at 4.09 and cannot be
  // cut, so depth has to be built downward.  Four rails, an inner walnut reveal and a cove.
  const coffer = (x0, x1, z0, z1, o = {}) => {
    const d = o.d ?? .30, y = CH - d / 2, tag = o.tag || '天花';
    const w = o.w ?? .34;
    box((x0 + x1) / 2, y, z0 + w / 2, x1 - x0, d, w, o.c ?? T.plaster, {...MAT.stone, hard:true, gloss:.13, mode:14, tag });
    box((x0 + x1) / 2, y, z1 - w / 2, x1 - x0, d, w, o.c ?? T.plaster, {...MAT.stone, hard:true, gloss:.13, mode:14, tag });
    box(x0 + w / 2, y, (z0 + z1) / 2, w, d, z1 - z0 - w * 2, o.c ?? T.plaster, {...MAT.stone, hard:true, gloss:.13, mode:14, tag });
    box(x1 - w / 2, y, (z0 + z1) / 2, w, d, z1 - z0 - w * 2, o.c ?? T.plaster, {...MAT.stone, hard:true, gloss:.13, mode:14, tag });
    // Walnut reveal on the inner edge of the frame, then a warm cove washing the recessed panel.
    for (const [cx, cz, sw, sd] of [[(x0 + x1) / 2, z0 + w, x1 - x0 - w * 2, .05],
                                    [(x0 + x1) / 2, z1 - w, x1 - x0 - w * 2, .05],
                                    [x0 + w, (z0 + z1) / 2, .05, z1 - z0 - w * 2],
                                    [x1 - w, (z0 + z1) / 2, .05, z1 - z0 - w * 2]]) {
      box(cx, CH - d + .07, cz, sw, .14, sd, T.walnutD, {...MAT.timber, hard:true, gloss:.30, mode:6, tag });
      if (o.cove !== false) lit.push(luminous(box(cx, CH - .055, cz, sw * .96, .03, sd, T.warm,
        { hard:true, mode:1, tag }), .045, .20));
    }
  };

  // A run of base + datum along a wall face.  `n` is the outward normal axis and sign.
  const dadoRun = (x0, x1, z0, z1, hgt, tag) => {
    const alongX = (x1 - x0) >= (z1 - z0);
    box((x0 + x1) / 2, hgt / 2, (z0 + z1) / 2, x1 - x0, hgt, z1 - z0, T.walnut,
      {...MAT.timber, hard:true, gloss:.28, mode:6, tag });
    if (alongX) {
      box((x0 + x1) / 2, hgt + .028, (z0 + z1) / 2, x1 - x0, .055, z1 - z0 + .055, T.bronzeL,
        { hard:true, gloss:POLISH, tag });
      box((x0 + x1) / 2, .075, (z0 + z1) / 2, x1 - x0, .15, z1 - z0 + .04, T.stoneD,
        {...MAT.stone, hard:true, gloss:.20, tag });
    } else {
      box((x0 + x1) / 2, hgt + .028, (z0 + z1) / 2, x1 - x0 + .055, .055, z1 - z0, T.bronzeL,
        { hard:true, gloss:POLISH, tag });
      box((x0 + x1) / 2, .075, (z0 + z1) / 2, x1 - x0 + .04, .15, z1 - z0, T.stoneD,
        {...MAT.stone, hard:true, gloss:.20, tag });
    }
  };
  const corniceRun = (x0, x1, z0, z1, tag) => {
    const alongX = (x1 - x0) >= (z1 - z0);
    const g = [x1 - x0, z1 - z0];
    box((x0 + x1) / 2, CH - .40, (z0 + z1) / 2, g[0], .18, g[1], T.walnutD,
      {...MAT.timber, hard:true, gloss:.30, mode:6, tag });
    box((x0 + x1) / 2, CH - .24, (z0 + z1) / 2,
      alongX ? g[0] : g[0] + .10, .14, alongX ? g[1] + .10 : g[1], T.stoneL,
      { hard:true, gloss:.20, tag });
    box((x0 + x1) / 2, CH - .125, (z0 + z1) / 2,
      alongX ? g[0] : g[0] + .17, .09, alongX ? g[1] + .17 : g[1], T.plaster,
      { hard:true, gloss:.13, mode:14, tag });
  };

  // ---------------------------------------------------------------------------------------------
  // 1 · THE SHELL BECOMES A ROOM
  //
  // The perimeter was geometry with no collider anywhere: at z = -14.4 a body walked the full
  // 44 m width straight through the reception backdrop, the arrivals board and the ginkgo relief.
  // Give the four walls collision, then a base and a head so the panelling hung on them has
  // somewhere to land — every north and south panel on this floor floats clear of the floor.
  // ---------------------------------------------------------------------------------------------

  // South wall, split around the 8 m entrance opening the shell leaves at x -4 .. 4.
  solid(-21.90, -4.06, -14.94, -14.30);
  solid(4.06, 21.90, -14.94, -14.30);
  solid(-21.90, 21.90, 14.30, 14.94);
  solid(-21.90, -21.60, -14.94, 14.94);
  solid(21.60, 21.90, -14.94, 14.94);

  for (const [x0, x1] of [[-21.62, -4.06], [4.06, 21.62]]) {
    dadoRun(x0, x1, -14.46, -14.30, 1.02, '墙裙');
    corniceRun(x0, x1, -14.74, -14.42, '檐口');
  }
  for (const [x0, x1] of [[-21.78, -21.60], [21.60, 21.78]]) {
    dadoRun(x0, x1, -14.30, 14.30, 1.02, '墙裙');
  }
  for (const [x0, x1] of [[-21.78, -21.46], [21.46, 21.78]]) {
    corniceRun(x0, x1, -14.42, 14.42, '檐口');
  }

  // ------------------------------------------------------------------ the north frieze
  // js/hotel.js:402 hangs `screen(0, RZ-.52, 13.2, 2.55, meta.short)` here: a 13 m emissive
  // lacquer panel whose underside stops dead at y 1.52 with bare floor beneath it, and whose
  // walnut frame runs straight through the tea-salon panelling and the lobby wall treatment on
  // either side.  It is shell geometry, so it cannot be moved from this file — but it can be
  // given the wall it obviously wants.  A 1.50 m wainscot brings the floor up to meet its
  // underside, and two full-height piers cut it to length where it used to collide.
  dadoRun(-21.62, -6.58, 14.30, 14.46, 1.50, '墙裙');
  dadoRun(3.48, 6.20, 14.30, 14.46, 1.50, '墙裙');
  dadoRun(6.90, 21.62, 14.30, 14.46, 1.50, '墙裙');
  // Under the ink relief the wainscot drops to a plinth so the painting is not buried.
  dadoRun(-5.78, 2.68, 14.30, 14.46, .30, '墙裙');
  corniceRun(-21.62, 21.62, 14.56, 14.78, '檐口');

  for (const [x0, x1] of [[-6.58, -5.78], [2.68, 3.48], [6.20, 6.90]]) {
    wall(x0, x1, 14.20, 14.62, { c:T.stone, tag:'壁柱', dress:false });
    for (const s of [-1, 1]) box((x0 + x1) / 2 + s * ((x1 - x0) / 2 + .012), 1.045, 14.41,
      .024, .055, .40, T.bronzeL, { hard:true, gloss:.70, tag:'壁柱' });
    box((x0 + x1) / 2, .10, 14.41, x1 - x0 + .16, .20, .50, T.stoneD, {...MAT.stone, hard:true, gloss:.20, tag:'壁柱' });
    box((x0 + x1) / 2, CH - .215, 14.41, x1 - x0 + .13, .13, .50, T.walnutD,
      {...MAT.timber, hard:true, gloss:.30, mode:6, tag:'壁柱' });
    box((x0 + x1) / 2, CH - .09, 14.41, x1 - x0 + .21, .13, .56, T.stoneL, {...MAT.stone, hard:true, gloss:.20, tag:'壁柱' });
    box((x0 + x1) / 2, 2.42, 14.185, x1 - x0 - .30, 1.62, .035, T.jade,
      { hard:true, mode:1, gloss:.22, tag:'壁柱' });
  }
  // The relief's own pale ground sits 5 mm behind the shell's lacquer panel, so the ink mountains
  // are currently painted onto emissive red.  One opaque card in front of the lacquer, still
  // behind the bronze frame and every brush stroke, restores the ink-on-paper reading.
  box(-1.55, 1.72, 14.358, 8.40, 2.60, .04, T.cream, { hard:true, mode:1, gloss:.11, tag:'墨韵北京' });

  // ---------------------------------------------------------------------------------------------
  // 2 · THE ARRIVAL BAND   z -14.3 .. -8.6
  //
  // Vestibule in the middle, concierge and bell to the west, reception to the east.  The shell
  // leaves an 8 m hole at x -4..4; the vestibule fills it as a real threshold with side walls,
  // a lowered ceiling and a single 3.98 m inner portal, so arrival is a compression before the
  // lobby opens up rather than one continuous plain of stone.
  // ---------------------------------------------------------------------------------------------

  // ------------------------------------------------------------------ 门斗 vestibule
  // The shell's automatic leaves at z -15 and the fit's inner leaves at z -11.12 are animated and
  // must never own a collider.  Nothing below touches either leaf: the solids are the side walls
  // and the two cheeks of the inner portal, and the 3.98 m between the cheeks stays clear.
  for (const s of [-1, 1]) {
    wall(s < 0 ? -3.40 : 3.12, s < 0 ? -3.12 : 3.40, -14.78, -10.97, { c:T.stone, tag:'门斗' });
    wall(s < 0 ? -3.40 : 1.99, s < 0 ? -1.99 : 3.40, -11.19, -10.97, { c:T.stone, tag:'门斗' });
  }
  head(-1.99, 1.99, -11.19, -10.97, 3.44, CH, { tag:'门斗' });
  // Lowered vestibule ceiling with a lantern coffer: 3.52 here against 4.09 in the lobby.
  box(0, 3.805, -12.99, 6.80, .57, 3.58, T.plaster, {...MAT.stone, hard:true, gloss:.13, mode:14, tag:'门斗' });
  box(0, 3.46, -12.99, 5.30, .12, 2.40, T.walnutD, {...MAT.timber, hard:true, gloss:.30, mode:6, tag:'门斗' });
  box(0, 3.52, -12.99, 5.05, .05, 2.15, T.bronzeL, { hard:true, gloss:POLISH, tag:'门斗' });
  luminous(box(0, 3.505, -12.99, 4.80, .03, 1.92, T.warm, { hard:true, mode:1, tag:'门斗' }), .075, .30);
  light(0, 3.30, -12.99, [1, .80, .54], .46, 5.4);
  // Threshold stone: a broad band across the doorway you feel yourself cross.
  flat(0, .030, -14.02, 6.16, .70, T.stoneD, { mode:7, gloss:.26, tag:'门斗' });
  for (const z of [-14.33, -13.71]) flat(0, .034, z, 6.16, .05, T.bronze, { gloss:AGED, tag:'门斗' });

  // ------------------------------------------------------------------ 行李房 luggage store
  wall(-17.05, -16.85, -14.78, -12.95, { tag:'行李房' });
  wall(-17.05, -16.85, -11.85, -11.12, { tag:'行李房' });
  head(-17.05, -16.85, -12.95, -11.85, 2.30, CH, { tag:'行李房' });
  wall(-21.78, -16.85, -11.30, -11.12, { tag:'行李房' });
  box(-19.32, 3.40, -12.95, 4.86, 1.38, 3.66, T.plaster, {...MAT.stone, hard:true, gloss:.13, mode:14, tag:'行李房' });
  luminous(box(-19.32, 2.685, -12.95, 3.10, .03, 1.05, T.warm, { hard:true, mode:1, tag:'行李房' }), .06, .26);
  light(-19.32, 2.55, -12.95, [1, .84, .60], .34, 4.4);
  flat(-19.32, .022, -12.80, 4.40, 2.90, T.stoneD, { mode:7, gloss:.10, tag:'行李房' });

  // ------------------------------------------------------------------ 礼宾部 concierge alcove
  wall(-7.66, -7.48, -14.78, -11.90, { tag:'礼宾部' });
  column(-16.20, -11.75, .27, { tag:'礼宾部' });
  column(-8.60, -11.75, .27, { tag:'礼宾部' });
  beam(-16.95, -7.48, -11.99, -11.51, 3.02, CH, { tag:'礼宾部' });
  coffer(-16.85, -11.02, -14.30, -12.05, { tag:'礼宾部' });
  coffer(-11.02, -7.48, -14.30, -12.05, { tag:'礼宾部' });

  // ------------------------------------------------------------------ 前台 reception hall
  // The gallery door cannot sit opposite the check-in counter: the shared fit's reception collider
  // runs to x 13.40, and clampMove inflates it to 13.70 — past this wall line — so a doorway south
  // of z -11.72 has no approach at all.  It goes north of the desk instead.
  wall(13.62, 13.82, -14.44, -11.90, { tag:'前台' });
  wall(13.62, 13.82, -10.60, -8.60, { tag:'前台' });
  head(13.62, 13.82, -11.90, -10.60, 2.34, CH, { tag:'前台' });
  for (const x of [5.20, 8.35, 11.50]) column(x, -8.42, .275, { tag:'前台' });
  beam(3.40, 13.82, -8.62, -8.22, 3.02, CH, { tag:'前台' });
  coffer(3.60, 8.42, -14.30, -8.90, { tag:'前台', d:.24 });
  coffer(8.72, 13.62, -14.30, -8.90, { tag:'前台', d:.24 });

  // ------------------------------------------------------------------ 京华画廊 gallery alcove
  // Everything the reception doorway looks into: the ginkgo relief the shared fit already built
  // on the south-east wall, now inside a room instead of stranded on an open plain.
  wall(13.62, 21.78, -9.90, -9.72, { tag:'京华画廊' });
  coffer(13.94, 21.48, -14.24, -9.96, { tag:'京华画廊', d:.42 });
  light(17.6, 3.10, -12.30, [1, .82, .58], .42, 6.2);

  // ------------------------------------------------------------------ 客梯厅 / 服务梯厅
  wall(13.62, 13.82, -9.72, -5.60, { tag:'客梯厅' });
  wall(13.62, 13.82, -1.80, 2.90, { tag:'客梯厅' });
  head(13.62, 13.82, -5.60, -1.80, 3.28, CH, { tag:'客梯厅' });
  wall(13.62, 21.78, 2.90, 3.08, { tag:'客梯厅' });
  wall(13.62, 13.82, 3.08, 4.60, { tag:'服务梯厅' });
  wall(13.62, 13.82, 5.70, 7.40, { tag:'服务梯厅' });
  head(13.62, 13.82, 4.60, 5.70, 2.30, CH, { tag:'服务梯厅' });
  wall(13.62, 21.78, 7.40, 7.58, { tag:'服务梯厅' });
  coffer(13.98, 17.50, -9.62, -8.40, { tag:'客梯厅' });
  coffer(13.98, 17.50, 1.02, 2.74, { tag:'客梯厅' });
  box(17.75, 3.82, 5.24, 7.60, .54, 4.16, T.plaster, {...MAT.stone, hard:true, gloss:.13, mode:14, tag:'服务梯厅' });
  // Behind both lift banks is shaft, not floor.  Left open it read as a 2.9 m corridor the player
  // could see but never reach — the flood fill's `o`.  Fill it as the masonry it actually is.
  for (const [x0, z0, z1, tg] of [[18.75, -9.72, 2.95, '客梯厅'], [18.50, 3.02, 7.46, '服务梯厅']]) {
    box((x0 + 21.62) / 2, 2.045, (z0 + z1) / 2, 21.62 - x0, CH, z1 - z0, T.plaster,
      {...MAT.stone,  hard:true, gloss:.13, mode:14, tag:tg });
    solid(x0, 21.62, z0, z1);
    blocker(x0 - .03, 21.65, z0 - .03, z1 + .03, CH);
    dadoRun(x0 - .16, x0, z0, z1, 1.02, '墙裙');
    corniceRun(x0 - .32, x0, z0, z1, '檐口');
  }

  // ---------------------------------------------------------------------------------------------
  // 3 · THE LOBBY ORDER   —  one colonnade from the arrival axis to the water court
  //
  // The lobby is 20 m across and had nothing standing in it, which is why the overview reads as a
  // plain with furniture on it.  Two rows of columns on x -6.92 / 2.92 run the whole length,
  // carrying a beam at 3.42 — and the water court is the one bay left open to the full 4.09,
  // so the court is where the room lifts.  That is the section the floor was missing.
  // ---------------------------------------------------------------------------------------------

  // A.route publishes the guest spine through [-7.35, 1.45] and [-7.35, 4.0]; the bay spacing
  // below is chosen so no column collider inflates onto either waypoint.
  const COLX = [-6.92, 2.92];
  for (const cx of COLX) {
    for (const cz of [-6.20, -1.60, 2.30, 4.85, 7.40]) column(cx, cz, .21, { tag:'柱廊' });
    beam(cx - .21, cx + .21, -6.62, 7.82, 3.42, CH, { tag:'柱廊' });
  }
  for (const cz of [-6.20, 2.30, 7.40])
    beam(COLX[0] - .21, COLX[1] + .21, cz - .21, cz + .21, 3.42, CH, { tag:'柱廊' });

  // Lobby coffers.  The shared fit hangs its ginkgo chandelier from rails at y 3.95-4.09 over
  // z -3.65..-2.95, so that bay is deliberately left uncoffered rather than driven through it.
  coffer(-6.71, -1.10, -10.44, -4.30, { tag:'大堂' });
  coffer(-1.10, 2.71, -10.44, -4.30, { tag:'大堂' });
  coffer(-6.71, 2.71, -2.55, 1.90, { tag:'大堂' });
  coffer(4.20, 13.40, -7.80, -1.00, { tag:'大堂' });
  coffer(4.20, 13.40, 0.30, 2.60, { tag:'大堂' });
  light(-2.0, 3.50, -7.00, [1, .82, .58], .40, 8.0);
  light(-2.0, 3.50, 1.20, [1, .82, .58], .34, 7.0);
  light(8.6, 3.50, -4.20, [1, .82, .58], .34, 7.4);

  // ------------------------------------------------------------------ 大楼梯 grand stair hall
  // The stair had no room: it was a flight of limestone standing in open floor.  A colonnade on
  // its open flank, a coffered soffit over the flight and a back wall turn it into a volume, and
  // the dead 4 m aisle behind it becomes an enclosed housekeeping store instead of nothing.
  column(-10.82, 1.70, .19, { tag:'大楼梯' });
  column(-10.82, 4.10, .19, { tag:'大楼梯' });
  beam(-11.01, -10.63, 1.30, 4.50, 3.28, CH, { tag:'大楼梯' });
  coffer(-16.60, -11.44, 1.40, 9.90, { tag:'大楼梯', d:.34 });
  light(-14.0, 3.40, 5.40, [1, .84, .60], .40, 8.2);

  wall(-17.00, -16.82, 1.02, 10.28, { tag:'员工通道' });
  wall(-21.78, -16.82, 10.10, 10.28, { tag:'员工通道' });
  wall(-21.78, -19.80, 1.02, 1.20, { tag:'员工通道' });
  wall(-18.70, -16.82, 1.02, 1.20, { tag:'员工通道' });
  head(-19.80, -18.70, 1.02, 1.20, 2.30, CH, { tag:'员工通道' });
  box(-19.30, 3.42, 5.72, 4.26, .54, 8.82, T.plaster, {...MAT.stone, hard:true, gloss:.13, mode:14, tag:'员工通道' });
  luminous(box(-19.30, 3.13, 5.72, .40, .03, 7.60, T.warm, { hard:true, mode:1, tag:'员工通道' }), .05, .22);
  flat(-19.30, .022, 5.65, 4.20, 8.70, T.stoneD, { mode:7, gloss:.10, tag:'员工通道' });

  // ------------------------------------------------------------------ 大堂茶廊 tea salon
  // Screens, not walls: the salon has to stay visible from the court walk or it stops being a
  // lobby lounge.  A lattice screen across the corridor and a solid one along its east flank
  // give it acoustic separation and a threshold you can see through.
  wall(-11.30, -9.90, 6.05, 6.23, { c:T.walnut, mode:6, gloss:.28, tag:'茶廊' });
  wall(-8.10, -6.58, 6.05, 6.23, { c:T.walnut, mode:6, gloss:.28, tag:'茶廊' });
  head(-9.90, -8.10, 6.05, 6.23, 2.92, CH, { tag:'茶廊' });
  wall(-4.90, -4.72, 8.30, 10.30, { tag:'茶廊' });
  wall(-4.90, -4.72, 11.50, 12.60, { tag:'茶廊' });
  head(-4.90, -4.72, 10.30, 11.50, 2.92, CH, { tag:'茶廊' });
  coffer(-12.20, -5.10, 6.45, 12.40, { tag:'茶廊', d:.28 });
  light(-8.6, 3.40, 9.40, [1, .83, .56], .38, 7.6);

  // Openwork panels in the two screen heads: a threshold you look through, per HOTEL.md.
  for (const [cx, cz, w, ry] of [[-9.00, 6.14, 1.72, 0], [-4.81, 10.90, 1.14, Math.PI / 2]]) {
    for (let i = 0; i < 5; i++) {
      const u = -w / 2 + (i + .5) * w / 5;
      box(cx + Math.cos(ry) * u, 2.44, cz - Math.sin(ry) * u, .055, .92, .055, T.bronze,
        { hard:true, gloss:AGED, ry, tag:'茶廊' });
    }
    for (const y of [2.00, 2.88]) box(cx, y, cz, ry ? .07 : w, .055, ry ? w : .07, T.bronzeL,
      { hard:true, gloss:POLISH, tag:'茶廊' });
  }

  // ---------------------------------------------------------------------------------------------
  // 4 · DOORWAYS THAT SAY WHERE THEY GO, AND SOMETHING TO SEE THROUGH THEM
  // ---------------------------------------------------------------------------------------------

  // yaw -PI/2 faces -x, +PI/2 faces +x, 0 faces +z, PI faces -z.
  const sign = (x, y, z, yaw, zh, en, tag) => {
    box(x + (Math.abs(yaw) > 1 ? Math.sign(yaw) * -.035 : 0), y - .02,
      z + (Math.abs(yaw) > 1 ? 0 : (yaw === 0 ? -.035 : .035)),
      Math.abs(yaw) > 1 ? .05 : zh.length * .30 + .30, .52,
      Math.abs(yaw) > 1 ? zh.length * .30 + .30 : .05, T.walnutD,
      { hard:true, gloss:.30, mode:6, tag });
    glyphs(x, y + .07, z, yaw, zh, { size:.17, gap:.042, color:T.cream, mode:1, glow:.04, lift:.008, tag });
    glyphs(x, y - .16, z, yaw, en, { size:.066, gap:.016, color:T.bronzeL, mode:1, glow:.02, lift:.008, tag });
  };
  // Each sign clears its own lintel: the door heads are at 2.30-2.34, so a sign centred at 2.06
  // would have hung in the opening.  The lift portal is 3.28 high, so its sign goes on the pier
  // beside the opening instead of above it, where the cornice already is.
  sign(-16.79, 2.72, -12.40, Math.PI / 2, '行李房', 'LUGGAGE', '行李房');
  sign(13.56, 2.76, -11.25, -Math.PI / 2, '京华画廊', 'GALLERY', '京华画廊');
  sign(13.56, 2.42, -6.60, -Math.PI / 2, '客梯厅', 'LIFTS', '客梯厅');
  sign(13.56, 2.72, 5.15, -Math.PI / 2, '服务梯厅', 'SERVICE', '服务梯厅');
  sign(-19.25, 2.72, .96, 0, '员工通道', 'STAFF', '员工通道');

  // ------------------------------------------------------------------ 行李房 contents
  for (const z of [-13.90, -12.55]) {
    box(-21.30, .06, z, .58, .12, 1.05, T.bronzeD, { hard:true, gloss:AGED, tag:'行李房' });
    for (const y of [.52, 1.18, 1.84]) {
      box(-21.10, y, z, .96, .055, 1.05, T.stoneD, {...MAT.stone, hard:true, gloss:.34, tag:'行李房' });
      box(-21.10, y - .10, z, .90, .05, .05, T.bronze, { hard:true, gloss:AGED, tag:'行李房' });
    }
    for (const [dy, dz, w, c] of [[.70, -.30, .46, T.walnutL], [.68, .26, .40, T.lacquerD],
                                  [1.36, -.24, .38, T.ink], [1.34, .30, .44, T.walnutL],
                                  [2.02, .02, .50, T.celadon]]) {
      box(-21.08, dy, z + dz, .74, .34, w, c, {...MAT.timber, hard:true, mode:6, gloss:.22, tag:'行李房' });
      box(-20.70, dy, z + dz, .04, .12, w * .5, T.bronzeL, { hard:true, gloss:POLISH, tag:'行李房' });
      box(-20.68, dy - .13, z + dz, .06, .10, .07, T.cream, { hard:true, mode:1, tag:'行李房' });
    }
  }
  box(-18.30, .46, -13.60, 1.35, .92, .70, T.walnut, {...MAT.timber, hard:true, mode:6, gloss:.28, tag:'行李房' });
  box(-18.30, .96, -13.60, 1.50, .09, .84, T.stoneL, {...MAT.stone, hard:true, gloss:.24, tag:'行李房' });
  box(-18.28, 1.06, -13.72, .34, .12, .24, T.ink, { hard:true, gloss:.20, tag:'行李房' });
  for (let i = 0; i < 4; i++) box(-18.62 + i * .19, 1.03, -13.42, .13, .012, .19, T.cream,
    {...MAT.cloth, hard:true, mode:7, tag:'行李房' });
  solid(-21.62, -20.55, -14.30, -12.00);
  solid(-18.98, -17.62, -13.98, -13.22);
  thing('行李房', -18.30, 1.20, -13.20, '行李房存放客人的行李，凭牌领取。',
    'The luggage room holds guests\' bags; collect them with a numbered tag.',
    '行李 luggage + 房 room. 寄存 means left luggage.',
    { tag:'行李房', focus:[-18.90, -11.80], reach:2.1 }).hotelFixture =
    { floor:A.floor, department:'concierge', tag:'行李房', route:A.route };

  // ------------------------------------------------------------------ 京华画廊 contents
  // What the reception doorway looks into: a lit stone plinth on axis with the door, with the
  // shared fit's ginkgo relief filling the wall behind it.
  flat(17.60, .022, -12.40, 6.40, 3.40, T.stoneD, { mode:7, gloss:.12, tag:'京华画廊' });
  for (const x of [15.30, 19.90]) {
    box(x, .30, -12.60, 1.00, .60, 1.00, T.stoneL, {...MAT.stone, hard:true, gloss:.22, tag:'京华画廊' });
    box(x, .625, -12.60, 1.10, .06, 1.10, T.bronzeD, { hard:true, gloss:AGED, tag:'京华画廊' });
    taper(x, .96, -12.60, .30, .62, .30, x < 17 ? T.celadon : T.lacquerD, { gloss:.26, tag:'京华画廊' });
    cyl(x, 1.30, -12.60, .17, .10, T.bronzeL, { gloss:POLISH, tag:'京华画廊' });
    solid(x - .55, x + .55, -13.15, -12.05);
    luminous(box(x, CH - .42, -12.60, .16, .05, .16, T.warm, { hard:true, mode:1, tag:'京华画廊' }), .09, .32);
  }
  box(17.60, .21, -10.65, 2.30, .42, .48, T.walnut, {...MAT.timber, hard:true, mode:6, gloss:.28, tag:'京华画廊' });
  box(17.60, .44, -10.65, 2.42, .06, .56, T.silk, {...MAT.cloth, mode:7, gloss:.06, tag:'京华画廊' });
  for (const s of [-1, 1]) box(17.60 + s * 1.02, .11, -10.65, .10, .22, .40, T.bronzeD,
    { hard:true, gloss:AGED, tag:'京华画廊' });
  solid(16.35, 18.85, -10.92, -10.38);

  // ---------------------------------------------------------------------------------------------
  // 5 · CAMERA ROOMS — the volumes above are now real, so the chase eye must know about them.
  // Smallest first: roomAt() takes the first exact match, and a nested volume has to win.
  // ---------------------------------------------------------------------------------------------
  cameraRoom('hotel1-luggage', -21.60, -17.05, -14.30, -11.30, 2.30);
  cameraRoom('hotel1-vestibule', -3.12, 3.12, -14.30, -11.19, 2.45);
  cameraRoom('hotel1-service-hall', 13.82, 21.60, 3.08, 7.40, 2.85);
  cameraRoom('hotel1-gallery', 13.82, 21.60, -14.30, -9.90, 2.95);
  cameraRoom('hotel1-boh', -21.60, -17.00, 1.20, 10.10, 2.70);
  cameraRoom('hotel1-concierge', -16.85, -7.48, -14.30, -11.62, 3.05);
  cameraRoom('hotel1-reception', 3.40, 13.62, -14.30, -8.45, 3.40);
  cameraRoom('hotel1-lift-hall', 13.82, 21.60, -9.72, 2.90, 3.15);
  cameraRoom('hotel1-tea', -12.30, -4.72, 6.23, 14.00, 3.35);
  cameraRoom('hotel1-stair', -16.82, -10.63, .90, 10.28, 3.45);
  cameraRoom('hotel1-court', -6.90, 2.90, 1.90, 8.42, 3.70);
  cameraRoom('hotel1-lobby', -6.92, 13.62, -11.19, 2.90, 4.05);
});
