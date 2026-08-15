// 🏨 京华大酒店 · Floor 11 — the interior architecture
//
// This floor's own module. Registered into HotelFit (declared in js/hotel.js). Nothing else in
// the build writes to this file, and you must not write to anyone else's.
//
// Programme for this level, from HOTEL.md:
//   suites including a full living / dining / bed / bath sequence
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
//   scene key   hotel11
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
//     node /private/tmp/claude-501/-Users-jonahcollins-Desktop-Chinesegame/a3cc9bcf-53f0-4e3d-a6a3-24cb996ed8a1/scratchpad/floorprobe.js hotel11 -22 22 -15 15 15.6 -3.7
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
//   * `node --check js/hotel-f11.js` after every edit. A backtick inside a template literal
//     ends the string mid-statement; that has broken this project three times.
//
// ---------------------------------------------------------------------------------------------

HotelFit.register('hotel11', A => {
  const { box, cyl, ball, capsule, taper, flat, glyphs, solid, blocker, shade, glow, thing } = A;
  const { C, col, RX, RZ, H } = A;
  const { light, luminous, onTick } = A;
  const TAU = Math.PI * 2;

  // Local finishes. The shell palette is deliberately narrow; a suite floor needs plaster,
  // limestone, silk and paper alongside it.
  const c = {
    stone:col.stone, stoneL:col.stoneL, dark:col.dark,
    plaster:C('#ded8cb'), plasterL:C('#efe8db'), limestone:C('#d6cab9'), limestoneL:C('#ece2d2'),
    walnut:col.walnut, walnutL:col.walnutL, walnutD:C('#2c2421'),
    bronze:col.bronze, bronzeL:col.bronzeL, bronzeD:col.bronzeD,
    lacquer:col.lacquer, lacquerD:C('#57231f'), celadon:col.celadon, celadonL:C('#bed0c5'),
    jade:col.jade, ink:col.ink, inkL:C('#4c5454'),
    silk:C('#b39781'), silkL:C('#ded0bc'), silkRose:C('#a86f66'), silkBlue:C('#7d8f99'),
    carpet:C('#584842'), carpetL:C('#786158'), paper:C('#f0e7d7'), white:col.white,
    warm:col.warm, glass:col.glass, glassD:col.glassD, water:col.water, steel:col.steel,
    green:col.green, towel:C('#ebe6dc'), tea:C('#7a552e'), night:C('#141a22'),
  };

  try {
    Glyphs.need('京华套房江山云锦行政起居餐厅主卧衣帽间石材浴室书房玄关电梯前厅备餐间' +
      '布草间疏散前室安全出口客用长廊客房服务套房管家更衣主浴淋浴梳妆衣柜行李' +
      '楼层索引请勿打扰打扫房间收藏茶室书画卧室浴缸盥洗客厅餐区服务通道消防' +
      '云锦阁江山阁景观露台夜景灯光温泉');
  } catch (_) {}

  // ============================================================================================
  // 1 · PARTITION PRIMITIVES
  //
  // `hard:true` is a silhouette flag and nothing more (build.js:48). Every one of these helpers
  // therefore emits three things from ONE set of extents, so the collider can never drift away
  // from the wall: the box you see (centre + size), the solid that stops the body (min/max) and
  // the blocker that stops the chase eye sliding through a single-sided surface.
  // ============================================================================================
  const T = .18, TH = T / 2, WH = 3.56;          // thickness, half-thickness, partition height

  // Wall running north/south: xc is the centre line, z0..z1 the extent.
  function wallX(xc, z0, z1, tag, face) {
    if (z1 - z0 < .02) return;
    const zc = (z0 + z1) / 2, d = z1 - z0;
    Build.partition(0, WH, (yc, hh, pf) =>
      box(xc, yc, zc, T, hh, d, face || c.plaster, { hard:true, mode:14, gloss:.11, tag, ...pf }));
    box(xc, .17, zc, T + .05, .22, d, c.walnutD, { hard:true, gloss:.28, tag });
    box(xc, WH - .07, zc, T + .05, .10, d, c.bronzeD, { hard:true, gloss:.58, tag, partition:true });
    solid(xc - TH, xc + TH, z0, z1);
    blocker(xc - TH, xc + TH, z0, z1, WH);
  }

  // Wall running east/west: zc is the centre line, x0..x1 the extent.
  function wallZ(zc, x0, x1, tag, face) {
    if (x1 - x0 < .02) return;
    const xc = (x0 + x1) / 2, w = x1 - x0;
    Build.partition(0, WH, (yc, hh, pf) =>
      box(xc, yc, zc, w, hh, T, face || c.plaster, { hard:true, mode:14, gloss:.11, tag, ...pf }));
    box(xc, .17, zc, w, .22, T + .05, c.walnutD, { hard:true, gloss:.28, tag });
    box(xc, WH - .07, zc, w, .10, T + .05, c.bronzeD, { hard:true, gloss:.58, tag, partition:true });
    solid(x0, x1, zc - TH, zc + TH);
    blocker(x0, x1, zc - TH, zc + TH, WH);
  }

  // An opening in an x-wall. The head carries NO solid; the two reveals do, so the clear run a
  // body actually gets is (z1 - z0) - 0.28. Openings below 1.60 are therefore never used here.
  function openX(xc, z0, z1, tag, accent) {
    const zc = (z0 + z1) / 2, d = z1 - z0;
    box(xc, 3.19, zc, T, .74, d, c.plaster, { hard:true, mode:14, gloss:.11, tag });
    box(xc, WH - .07, zc, T + .05, .10, d, c.bronzeD, { hard:true, gloss:.58, tag });
    for (const s of [-1, 1]) {
      const ze = s < 0 ? z0 + .07 : z1 - .07;
      box(xc, 1.41, ze, T + .07, 2.82, .14, c.walnutD, { hard:true, mode:6, gloss:.32, tag });
      box(xc, .13, ze, T + .13, .26, .22, c.bronzeD, { hard:true, gloss:.58, tag });
      solid(xc - TH, xc + TH, s < 0 ? z0 : z1 - .14, s < 0 ? z0 + .14 : z1);
    }
    box(xc, 2.86, zc, T + .07, .14, d - .28, c.walnutD, { hard:true, mode:6, gloss:.32, tag });
    if (accent) luminous(box(xc, 2.94, zc, T - .04, .05, d - .40, accent,
      { hard:true, mode:1, tag }), .022, .13);
    blocker(xc - TH, xc + TH, z0, z1, WH);
  }

  // An opening in a z-wall.
  function openZ(zc, x0, x1, tag, accent) {
    const xc = (x0 + x1) / 2, w = x1 - x0;
    box(xc, 3.19, zc, w, .74, T, c.plaster, { hard:true, mode:14, gloss:.11, tag });
    box(xc, WH - .07, zc, w, .10, T + .05, c.bronzeD, { hard:true, gloss:.58, tag });
    for (const s of [-1, 1]) {
      const xe = s < 0 ? x0 + .07 : x1 - .07;
      box(xe, 1.41, zc, .14, 2.82, T + .07, c.walnutD, { hard:true, mode:6, gloss:.32, tag });
      box(xe, .13, zc, .22, .26, T + .13, c.bronzeD, { hard:true, gloss:.58, tag });
      solid(s < 0 ? x0 : x1 - .14, s < 0 ? x0 + .14 : x1, zc - TH, zc + TH);
    }
    box(xc, 2.86, zc, w - .28, .14, T + .07, c.walnutD, { hard:true, mode:6, gloss:.32, tag });
    if (accent) luminous(box(xc, 2.94, zc, w - .40, .05, T - .04, accent,
      { hard:true, mode:1, tag }), .022, .13);
    blocker(x0, x1, zc - TH, zc + TH, WH);
  }

  // A run of wall with openings punched in it. `gaps` are [from,to] pairs in the run's axis.
  function runX(xc, a, b, gaps, tag, face, accent) {
    let at = a;
    for (const [g0, g1] of gaps) {
      wallX(xc, at, g0, tag, face); openX(xc, g0, g1, tag, accent); at = g1;
    }
    wallX(xc, at, b, tag, face);
  }
  function runZ(zc, a, b, gaps, tag, face, accent) {
    let at = a;
    for (const [g0, g1] of gaps) {
      wallZ(zc, at, g0, tag, face); openZ(zc, g0, g1, tag, accent); at = g1;
    }
    wallZ(zc, at, b, tag, face);
  }

  // Name plate over a suite door, read from the gallery/lobby side.
  function nameplate(x, y, z, yaw, hz, en, accent) {
    box(x, y, z, 1.28, .40, .07, c.ink, { hard:true, ry:yaw, gloss:.36, tag:hz });
    glyphs(x + Math.sin(yaw) * .045, y + .06, z + Math.cos(yaw) * .045, yaw, hz,
      { size:.13, gap:.030, color:accent || c.bronzeL, mode:1, glow:.03, lift:.006, tag:hz });
    if (en) glyphs(x + Math.sin(yaw) * .045, y - .13, z + Math.cos(yaw) * .045, yaw, en,
      { size:.052, gap:.012, color:c.bronzeL, mode:1, lift:.006, tag:hz });
  }

  // ============================================================================================
  // 2 · CAMERA ROOMS
  // Registered smallest-first so a wet room wins over the bedroom that contains it. Every
  // rectangle below is the room a partition actually encloses, not an aspiration.
  // ============================================================================================
  if (A.cameraRoom) {
    A.cameraRoom('hotel11-1102-bath',       4.77,  8.51, -10.99, -8.49, 2.35);
    A.cameraRoom('hotel11-1102-bedroom',    4.77,  8.51, -14.50, -11.19, 2.45);
    A.cameraRoom('hotel11-1102-study',     12.69, 17.56, -14.50, -11.39, 2.45);
    A.cameraRoom('hotel11-1102-entry',     12.69, 17.56, -11.21, -8.49, 2.35);
    A.cameraRoom('hotel11-1102-living',     8.69, 12.51, -14.50, -8.49, 2.75);
    A.cameraRoom('hotel11-linen',         -21.55, -18.04, -14.50, -9.19, 2.35);
    A.cameraRoom('hotel11-suite-pantry',   10.39, 12.51,  2.19,  7.06, 2.35);
    A.cameraRoom('hotel11-study',           4.77, 12.51, -8.31, -5.39, 2.55);
    A.cameraRoom('hotel11-tea-lounge',     10.39, 17.56,  7.24, 14.50, 3.05);
    A.cameraRoom('hotel11-master-bath',   -21.55, -14.54, -2.31,  5.21, 2.85);
    A.cameraRoom('hotel11-dressing',      -21.55, -14.54,  5.39, 14.50, 2.85);
    A.cameraRoom('hotel11-west-vestibule',-21.55, -14.54, -14.50, -2.49, 2.65);
    A.cameraRoom('hotel11-stone-bath',    -14.36, -7.09, -14.50, -4.99, 2.85);
    A.cameraRoom('hotel11-suite-living',   -6.91,  4.59, -14.50, -4.99, 3.15);
    A.cameraRoom('hotel11-suite-bedroom', -14.36, -3.09,  1.89, 14.50, 3.05);
    A.cameraRoom('hotel11-suite-dining',   -2.91, 10.21,  2.19, 14.50, 3.15);
    A.cameraRoom('hotel11-suite-foyer',     6.99, 12.51, -5.21,  2.01, 2.85);
    A.cameraRoom('hotel11-gallery-east',   -2.91,  6.99, -4.81,  2.01, 3.05);
    A.cameraRoom('hotel11-gallery-west',  -14.36, -2.91, -4.81,  1.71, 3.05);
    A.cameraRoom('hotel11-lift-lobby',     12.69, 17.61, -8.31,  7.06, 3.25);
  }

  // ============================================================================================
  // 3 · SHELL REPAIRS — the dead ground behind the lift core
  //
  // The passenger bank (x 17.70..18.81, z -10.00..2.62) and the service car (17.87..18.55,
  // 3.55..6.65) already carry solids from the core, but the 3 m of plate behind and between them
  // is open floor the player could walk into and see the back of every single-sided lift wall.
  // In a real tower that is shaft, riser and plant. Fill it, and give the gaps a face.
  // ============================================================================================
  const EB = 21.78;                                     // inner face of the east shell wall
  for (const [z0, z1, x0] of [[-14.60, -9.98, 17.70], [-9.98, 2.58, 18.85], [2.58, 3.52, 17.70],
                              [3.52, 6.70, 18.60], [6.70, 14.60, 17.70]]) {
    solid(x0, EB, z0, z1); blocker(x0, EB, z0, z1, H);
  }
  // Visible returns where that fill meets an occupied room.
  for (const [z0, z1] of [[2.58, 3.52], [6.70, 14.60]]) {
    box(17.78, WH / 2, (z0 + z1) / 2, .20, WH, z1 - z0, c.limestone,
      { hard:true, mode:14, gloss:.15, tag:'电梯井' });
    box(17.78, WH - .07, (z0 + z1) / 2, .25, .10, z1 - z0, c.bronzeD,
      { hard:true, gloss:.58, tag:'电梯井' });
  }

  // ============================================================================================
  // 4 · THE PLAN
  //
  // Two junior suites and one floor-through presidential suite off a single lift lobby, plus the
  // back-of-house strip that keeps the fire stair out of a private suite.
  //
  //   lobby      x 12.60..17.70  z -8.40..7.15     arrival, all three cars and the service car
  //   1102       x  4.68..17.65  z -14.60..-8.40   江山套房 · entry, study, living, bed, bath
  //   tea lounge x 10.30..17.65  z  7.15..14.60    云锦茶室 · shared amenity + floor directory
  //   pantry     x 10.30..12.60  z  2.10..7.15     butler's pantry, lobby to dining
  //   京华套房   the rest: foyer -> gallery -> living -> dining -> bedroom -> dressing -> bath
  //   west strip x -21.70..-14.45 z -14.60..-2.40  escape vestibule, stair, linen
  //
  // Openings are quoted as the structural gap; the two reveals inside each one take 0.28 m, so
  // the clear run is 0.28 less than the number in the call. Nothing here is below 1.60.
  // ============================================================================================

  // ---- transverse walls (constant x) ----
  // Lobby west wall. Suite 京华 portal on the carpet runner, the 1102 inner door, the pantry door.
  runX(12.60, -14.60, 7.15,
    [[-10.70, -9.10], [-4.75, -2.25], [4.60, 6.20]], '套房隔墙', c.plaster, c.lacquer);
  // Living-room east wall. The existing 套房电视 at x 4.50 hangs on its west face.
  runX(4.68, -14.60, -5.30, [], '起居室隔墙');
  // West wall of the bedroom/bath block: gallery-to-vestibule opening, and the dressing door.
  runX(-14.45, -14.60, 14.60, [[-4.90, -2.40], [8.50, 10.30]], '西隔墙', c.plaster, c.jade);
  // Dining east wall with the butler's pantry door.
  runX(10.30, 2.10, 14.60, [[4.60, 6.20]], '餐厅隔墙');
  // Inside 1102: living to bedroom. The opening sits low in the run because 1102's bedroom takes
  // the south bay — that is the only exterior wall this suite has, and a bedroom with no window
  // is not worth building.
  runX(8.60, -14.60, -8.40, [[-13.60, -12.00]], '江山套房');
  // Linen store, off the escape vestibule.
  runX(-17.95, -14.60, -9.10, [[-12.40, -10.80]], '布草间');
  // 1102 east wall, closing the plate against the lift-shaft fill.
  runX(17.65, -14.60, -8.40, [], '江山套房', c.limestone);
  // The existing 玄关 ink screen (hotel-guests.js:1363) is 3.1 m of opaque walnut with no
  // collider at all — a wall you walk through. Give it one, stop it 0.40 m short of its south
  // end so the guest spine at z -3.70 keeps 0.20 m of shoulder, and return it into the dining
  // wall so it reads as a spirit screen with one way round rather than a 0.58 m slot.
  solid(6.81, 6.99, -3.20, 1.42); blocker(6.81, 6.99, -3.20, 1.42, 3.10);
  wallX(6.90, 1.42, 2.10, '玄关', c.walnutD);

  // ---- longitudinal walls (constant z) ----
  // Gallery south wall: the stone bath door, then the 4.2 m reveal into the living room.
  runZ(-4.90, -14.54, 4.77, [[-9.05, -7.08], [-2.90, 1.30]], '客用长廊', c.plaster, c.celadon);
  // The same wall steps 0.40 m south past the screen so the way round it is a full 1.40 m.
  runZ(-5.30, 4.59, 12.69, [[8.70, 10.30]], '书房隔墙');
  // Gallery north wall east of the existing 主卧 partition, with the dining portal.
  runZ(2.10, -3.09, 12.69, [[0.60, 4.20]], '餐厅隔墙', c.plaster, c.lacquer);
  // Lobby south wall / 1102 front door.
  runZ(-8.40, 4.59, 17.74, [[13.90, 15.70]], '江山套房', c.plaster, c.lacquer);
  // Lobby north wall. A 3.2 m reveal into the tea lounge, not a door: the shared shell stands a
  // 楼层索引 directory totem at (13.55, 10.55) on EVERY floor (js/hotel.js:362) with its lit face
  // turned west, so this block has to stay one open public room with 2.8 m of reading space in
  // front of that totem. A guest suite here would have walled the building's own directory in.
  runZ(7.15, 10.21, 17.74, [[13.40, 16.60]], '云锦茶室', c.plaster, c.jade);
  runZ(-11.30, 12.51, 17.74, [[14.60, 16.20]], '江山套房');
  runZ(-11.10, 4.59, 8.69, [[5.60, 7.20]], '江山套房');
  // North-west wing: dressing over master bath, and the vestibule's north wall.
  runZ(5.30, -21.70, -14.54, [[-18.60, -17.00]], '主浴', c.plaster, c.jade);
  runZ(-2.40, -21.70, -14.54, [], '疏散前室');
  runZ(-9.10, -21.70, -17.86, [], '布草间');
  // The existing 主卧/餐厅 partition (hotel-guests.js:1375) stops 0.65 m short of the north
  // shell. Close the crack rather than leave a slot the camera can see daylight through.
  wallX(-3.00, 13.80, 14.60, '主卧隔墙');
  // An antechamber in front of the principal bedroom. Its opening lines up with the existing
  // 主卧 door at x -9.45 so the two read as one axis on approach, and it clears the existing
  // 套房 bench at z 3.76..5.24 by 0.27 m.
  runZ(5.60, -14.54, -3.09, [[-10.65, -8.25]], '主卧前室', c.plaster, c.celadon);

  // ============================================================================================
  // 5 · FIT-OUT HELPERS
  // ============================================================================================
  const rndFrom = seed => { let s = (Math.round(Math.abs(seed) * 1000) % 2147483647) + 7;
    return () => (s = (s * 48271) % 2147483647) / 2147483647; };

  function field(x, z, w, d, fill, tag, border) {
    flat(x, .018, z, w, d, border || c.walnutD, { mode:7, gloss:.16, tag });
    flat(x, .023, z, Math.max(.2, w - .30), Math.max(.2, d - .30), fill, { mode:7, gloss:.035, tag });
    for (const s of [-1, 1])
      flat(x + s * (w / 2 - .26), .027, z + s * (d / 2 - .26), .16, .16, c.bronzeL,
        { ry:Math.PI / 4, gloss:.64, tag });
  }

  function raft(x, z, w, d, tag) {
    box(x, 4.03, z, w, .10, d, c.plasterL, { hard:true, mode:14, gloss:.10, tag:tag || '天花' });
    for (const s of [-1, 1]) {
      box(x + s * w / 2, 3.95, z, .12, .16, d, c.walnutL, { hard:true, gloss:.29, tag:tag || '天花' });
      box(x, 3.95, z + s * d / 2, w, .16, .12, c.walnutL, { hard:true, gloss:.29, tag:tag || '天花' });
    }
  }

  function lantern(x, y, z, s, tag) {
    s = s || 1; tag = tag || '灯笼';
    capsule(x, y + .44 * s, z, .012, .84 * s, .012, c.bronzeD, { gloss:.60, tag });
    box(x, y, z, .30 * s, .34 * s, .30 * s, c.silkL, { mode:1, gloss:.05, tag });
    luminous(box(x, y, z, .25 * s, .29 * s, .25 * s, c.warm, { mode:1, tag }), .05, .30);
    box(x, y + .19 * s, z, .36 * s, .05 * s, .36 * s, c.walnutD, { hard:true, gloss:.30, tag });
    box(x, y - .19 * s, z, .34 * s, .04 * s, .34 * s, c.walnutD, { hard:true, gloss:.30, tag });
  }

  // yaw is the direction the front face looks toward; (sin yaw, cos yaw) is its outward normal
  // and (cos yaw, -sin yaw) runs along the piece, matching the plaque/portal convention already
  // used on floors 9 and 10.
  const nrm = yaw => [Math.sin(yaw), Math.cos(yaw)];
  const along = yaw => [Math.cos(yaw), -Math.sin(yaw)];
  const put = (x, z, yaw, u, o) => {
    const a = along(yaw), n = nrm(yaw);
    return [x + a[0] * u + n[0] * o, z + a[1] * u + n[1] * o];
  };

  function inkPanel(x, y, z, yaw, w, h, seed, tag) {
    const r = rndFrom(seed || (x * 7 + z * 13));
    let p = put(x, z, yaw, 0, 0);
    box(p[0], y, p[1], w + .12, h + .12, .07, c.walnutD, { hard:true, ry:yaw, gloss:.30, tag });
    p = put(x, z, yaw, 0, .04);
    box(p[0], y, p[1], w, h, .02, c.paper, { hard:true, ry:yaw, mode:1, gloss:.04, tag });
    const n = Math.max(5, Math.round(w * h * 2.0));
    for (let i = 0; i < n; i++) {
      const u = (r() - .5) * w * .80, v = (r() - .5) * h * .74;
      p = put(x, z, yaw, u, .053);
      box(p[0], y + v, p[1], .06 + r() * w * .22, .014 + r() * .055, .012,
        r() < .28 ? c.inkL : c.ink, { hard:true, ry:yaw, mode:1, gloss:.05, tag });
    }
    p = put(x, z, yaw, w * .40, .055);
    box(p[0], y - h * .30, p[1], .10, .13, .012, c.lacquer, { hard:true, ry:yaw, mode:1, tag });
  }

  function cityWindow(x, z, yaw, w, h, tag) {
    const r = rndFrom(x * 11 + z * 5);
    let p = put(x, z, yaw, 0, 0);
    box(p[0], 1.06 + h / 2, p[1], w + .36, h + .36, .22, c.limestone,
      { hard:true, ry:yaw, mode:14, gloss:.14, tag });
    // `put`'s last argument steps along the OUTWARD normal, so a larger offset is nearer the room.
    // The sky pane used to sit at .09 with the towers at .072 and their lit strips at .058 — both
    // behind a 0.04-deep slab, i.e. buried inside it — so every city window on this floor rendered
    // as one flat block of c.night with no city in it. This is the same defect js/hotel-guests.js
    // records against floor 10's ink panel. Layering now runs sky .055, towers .088, lights .102,
    // and every layer stays inside the reveal's front face at .11.
    p = put(x, z, yaw, 0, .055);
    box(p[0], 1.06 + h / 2, p[1], w, h, .04, c.night, { hard:true, ry:yaw, mode:1, gloss:.10, tag });
    for (let i = 0; i < 5; i++) {
      const u = (r() - .5) * w * .92, bw = .26 + r() * .52, bh = .28 + r() * h * .52;
      p = put(x, z, yaw, u, .088);
      box(p[0], 1.06 + bh / 2, p[1], bw, bh, .02, c.inkL,
        { hard:true, ry:yaw, mode:1, gloss:.08, tag });
      p = put(x, z, yaw, u, .102);
      luminous(box(p[0], 1.06 + bh * .62, p[1], bw * .60, .05, .016, c.warm,
        { hard:true, ry:yaw, mode:1, tag }), .02, .36);
    }
    for (const s of [-1, 1]) {
      p = put(x, z, yaw, s * w / 2, .05);
      capsule(p[0], 1.06 + h / 2, p[1], .034, h, .034, c.bronzeD, { gloss:.62, tag });
    }
    p = put(x, z, yaw, 0, .10);
    box(p[0], 1.02, p[1], w + .32, .10, .32, c.limestoneL, { hard:true, ry:yaw, gloss:.20, tag });
  }

  function consoleTable(x, z, yaw, w, tag) {
    let p = put(x, z, yaw, 0, 0);
    box(p[0], .77, p[1], w, .07, .44, c.limestone, { hard:true, ry:yaw, mode:7, gloss:.24, tag });
    box(p[0], .48, p[1], w - .22, .52, .38, c.walnut, { ry:yaw, mode:7, gloss:.30, tag });
    for (const s of [-1, 1]) {
      const q = put(x, z, yaw, s * (w / 2 - .09), 0);
      capsule(q[0], .36, q[1], .045, .70, .045, c.bronzeD, { gloss:.60, tag });
    }
    for (const s of [-1, 1]) {
      const q = put(x, z, yaw, s * w * .21, -.20);
      box(q[0], .52, q[1], w * .36, .30, .025, c.walnutL, { hard:true, ry:yaw, gloss:.28, tag });
      const q2 = put(x, z, yaw, s * w * .21, -.23);
      capsule(q2[0], .52, q2[1], .020, .16, .020, c.bronzeL,
        { ry:yaw, rz:Math.PI / 2, gloss:.72, tag });
    }
    const bx = Math.abs(Math.cos(yaw)) * w / 2 + Math.abs(Math.sin(yaw)) * .24;
    const bz = Math.abs(Math.sin(yaw)) * w / 2 + Math.abs(Math.cos(yaw)) * .24;
    solid(x - bx, x + bx, z - bz, z + bz);
  }

  function vessel(x, y, z, s, colour, tag) {
    taper(x, y + .16 * s, z, .20 * s, .34 * s, .20 * s, colour, { mode:7, gloss:.26, tag });
    ball(x, y + .05 * s, z, .17 * s, .13 * s, .17 * s, colour, { mode:7, gloss:.26, tag });
    cyl(x, y + .35 * s, z, .07 * s, .05 * s, colour, { gloss:.30, tag });
  }

  function branches(x, y, z, s, tag) {
    const r = rndFrom(x * 3 + z * 17);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU + r();
      capsule(x + Math.cos(a) * .06 * s, y + .30 * s, z + Math.sin(a) * .06 * s,
        .014, .62 * s, .014, c.walnutD, { rz:Math.cos(a) * .30, rx:Math.sin(a) * .30, gloss:.30, tag });
      ball(x + Math.cos(a) * .20 * s, y + .60 * s, z + Math.sin(a) * .20 * s,
        .07 * s, .05 * s, .07 * s, i % 2 ? c.silkRose : c.paper, { mode:7, gloss:.05, tag });
    }
  }

  function armchair(x, z, yaw, upholstery, tag) {
    let p = put(x, z, yaw, 0, 0);
    box(p[0], .40, p[1], .70, .20, .70, upholstery, { ry:yaw, mode:7, gloss:.03, tag });
    box(p[0], .21, p[1], .58, .18, .58, c.walnut, { ry:yaw, mode:7, gloss:.30, tag });
    p = put(x, z, yaw, 0, -.30);
    box(p[0], .70, p[1], .70, .62, .13, upholstery, { ry:yaw, mode:7, gloss:.03, tag });
    for (const s of [-1, 1]) {
      const q = put(x, z, yaw, s * .32, .02);
      box(q[0], .58, q[1], .11, .20, .60, c.walnutL, { hard:true, ry:yaw, gloss:.30, tag });
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const q = put(x, z, yaw, sx * .27, sz * .27);
      capsule(q[0], .13, q[1], .028, .26, .028, c.bronzeD, { gloss:.58, tag });
    }
    solid(x - .42, x + .42, z - .42, z + .42);
  }

  function sofa(x, z, yaw, w, upholstery, tag) {
    let p = put(x, z, yaw, 0, 0);
    box(p[0], .20, p[1], w, .18, .88, c.walnutD, { ry:yaw, mode:7, gloss:.28, tag });
    box(p[0], .42, p[1], w - .14, .22, .84, upholstery, { ry:yaw, mode:7, gloss:.03, tag });
    p = put(x, z, yaw, 0, -.34);
    box(p[0], .72, p[1], w - .14, .50, .18, c.silkL, { ry:yaw, mode:7, gloss:.03, tag });
    for (const s of [-1, 1]) {
      const q = put(x, z, yaw, s * (w / 2 - .09), 0);
      box(q[0], .56, q[1], .18, .44, .84, c.walnutL, { hard:true, ry:yaw, gloss:.30, tag });
    }
    for (let i = 0; i < 3; i++) {
      const q = put(x, z, yaw, (i - 1) * w * .29, -.26);
      box(q[0], .66, q[1], .38, .34, .14, i === 1 ? c.celadonL : c.silkRose,
        { ry:yaw, mode:7, gloss:.03, tag });
    }
    solid(x - Math.abs(Math.cos(yaw) * w / 2) - .40, x + Math.abs(Math.cos(yaw) * w / 2) + .40,
      z - Math.abs(Math.sin(yaw) * w / 2) - .40, z + Math.abs(Math.sin(yaw) * w / 2) + .40);
  }

  function lowTable(x, z, w, d, tag) {
    box(x, .36, z, w, .07, d, c.walnut, { hard:true, mode:7, gloss:.32, tag });
    box(x, .40, z, w - .16, .02, d - .16, c.limestoneL, { hard:true, gloss:.24, tag });
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      capsule(x + sx * (w / 2 - .09), .17, z + sz * (d / 2 - .09), .030, .34, .030, c.bronzeD,
        { gloss:.60, tag });
    solid(x - w / 2 - .04, x + w / 2 + .04, z - d / 2 - .04, z + d / 2 + .04);
  }

  function teaTray(x, y, z, tag) {
    box(x, y + .02, z, .44, .035, .30, c.walnutD, { hard:true, gloss:.34, tag });
    taper(x - .10, y + .10, z, .14, .13, .14, c.celadonL, { mode:7, gloss:.34, tag });
    capsule(x - .10, y + .17, z, .012, .07, .012, c.bronzeL, { gloss:.70, tag });
    for (let i = 0; i < 3; i++)
      cyl(x + .07 + (i % 2) * .11, y + .055, z + (i - 1) * .09, .036, .05, c.paper,
        { gloss:.30, tag });
  }

  function planter(x, z, r, tag) {
    taper(x, .22, z, r * 1.7, .44, r * 1.7, c.celadon, { mode:7, gloss:.28, tag });
    cyl(x, .45, z, r * .82, .05, c.walnutD, { gloss:.22, tag });
    const rd = rndFrom(x * 9 + z * 4);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU, t = .45 + rd() * .40;
      capsule(x + Math.cos(a) * r * .34, .48 + t / 2, z + Math.sin(a) * r * .34, .018, t, .018,
        c.green, { rz:Math.cos(a) * .34, rx:Math.sin(a) * .34, mode:7, gloss:.08, tag });
      ball(x + Math.cos(a) * r * .74, .50 + t, z + Math.sin(a) * r * .74, .13, .06, .13,
        c.green, { mode:7, gloss:.07, tag });
    }
    solid(x - r * .95, x + r * .95, z - r * .95, z + r * .95);
  }

  function bedSet(x, z, yaw, w, tag, accent) {
    let p = put(x, z, yaw, 0, 0);
    box(p[0], .28, p[1], w, .44, 2.06, c.walnutD, { hard:true, ry:yaw, mode:7, gloss:.28, tag });
    box(p[0], .56, p[1], w - .10, .24, 2.00, c.silkL, { ry:yaw, mode:7, gloss:.03, tag });
    p = put(x, z, yaw, 0, .48);
    box(p[0], .70, p[1], w - .12, .16, 1.00, accent || c.silk, { ry:yaw, mode:7, gloss:.04, tag });
    for (const s of [-1, 1]) {
      const q = put(x, z, yaw, s * w * .23, -.68);
      box(q[0], .76, q[1], w * .40, .20, .46, c.paper, { ry:yaw, mode:7, gloss:.04, tag });
      const q2 = put(x, z, yaw, s * w * .23, -.60);
      box(q2[0], .84, q2[1], w * .30, .14, .32, c.silkL, { ry:yaw, mode:7, gloss:.04, tag });
    }
    p = put(x, z, yaw, 0, -1.06);
    box(p[0], 1.34, p[1], w + .34, 2.68, .14, c.walnut, { hard:true, ry:yaw, mode:6, gloss:.30, tag });
    p = put(x, z, yaw, 0, -1.14);
    box(p[0], 1.52, p[1], w + .02, 1.70, .04, accent || c.silk, { hard:true, ry:yaw, mode:1, gloss:.05, tag });
    for (let i = -2; i <= 2; i++) {
      const q = put(x, z, yaw, i * (w + .02) * .19, -1.17);
      capsule(q[0], 1.52, q[1], .012, 1.66, .012, c.bronzeL, { gloss:.68, tag });
    }
    const bx = Math.abs(Math.cos(yaw)) * w / 2 + Math.abs(Math.sin(yaw)) * 1.05;
    const bz = Math.abs(Math.sin(yaw)) * w / 2 + Math.abs(Math.cos(yaw)) * 1.05;
    solid(x - bx, x + bx, z - bz, z + bz);
  }

  function bedside(x, z, yaw, tag) {
    let p = put(x, z, yaw, 0, 0);
    box(p[0], .26, p[1], .48, .48, .42, c.walnut, { hard:true, ry:yaw, mode:7, gloss:.30, tag });
    box(p[0], .52, p[1], .54, .05, .48, c.limestone, { hard:true, ry:yaw, gloss:.24, tag });
    p = put(x, z, yaw, 0, -.19);
    capsule(p[0], .30, p[1], .018, .14, .018, c.bronzeL, { ry:yaw, rz:Math.PI / 2, gloss:.72, tag });
    p = put(x, z, yaw, 0, 0);
    capsule(p[0], .68, p[1], .022, .28, .022, c.bronzeD, { gloss:.62, tag });
    taper(p[0], .92, p[1], .24, .26, .24, c.silkL, { mode:1, gloss:.06, tag });
    luminous(ball(p[0], .86, p[1], .10, .09, .10, c.warm, { mode:1, tag }), .04, .30);
    solid(x - .34, x + .34, z - .34, z + .34);
  }

  function wardrobeRun(x, z0, z1, yaw, tag) {
    const d = z1 - z0, zc = (z0 + z1) / 2, n = Math.max(2, Math.round(d / 1.05));
    let p = put(x, zc, yaw, 0, 0);
    box(p[0], 1.28, p[1], d, 2.56, .62, c.walnut, { hard:true, ry:yaw, mode:6, gloss:.30, tag });
    box(p[0], 2.62, p[1], d + .06, .12, .70, c.walnutD, { hard:true, ry:yaw, gloss:.30, tag });
    box(p[0], .06, p[1], d, .12, .66, c.walnutD, { hard:true, ry:yaw, gloss:.26, tag });
    const rd = rndFrom(x + z0);
    for (let i = 0; i < n; i++) {
      const u = (i - (n - 1) / 2) * (d / n);
      // Open bays with bronze mullions rather than glazed doors: an opaque door panel would have
      // hidden every garment behind it, and translucent ones do not batch.
      for (const sm of [-1, 1]) {
        const qm = put(x, zc, yaw, u + sm * (d / n - .04) / 2, -.30);
        capsule(qm[0], 1.30, qm[1], .022, 2.32, .022, c.bronzeD, { gloss:.62, tag });
      }
      let q = put(x, zc, yaw, u, -.30);
      capsule(q[0], 2.48, q[1], .018, d / n - .04, .018, c.bronzeL,
        { ry:yaw, rz:Math.PI / 2, gloss:.68, tag });
      // hanging garments behind the open bay
      q = put(x, zc, yaw, u, -.12);
      capsule(q[0], 1.88, q[1], .016, d / n - .10, .016, c.bronze,
        { ry:yaw, rz:Math.PI / 2, gloss:.68, tag });
      for (let k = 0; k < 3; k++) {
        const q2 = put(x, zc, yaw, u + (k - 1) * .18, -.10);
        box(q2[0], 1.42, q2[1], .12, .86, .22,
          [c.silkL, c.silkBlue, c.ink, c.silkRose][(k + i) % 4],
          { ry:yaw, mode:7, gloss:.04, tag });
      }
      // folded stack on the shelf above
      const q3 = put(x, zc, yaw, u, -.14);
      box(q3[0], 2.34, q3[1], d / n - .22, .20, .34, c.paper, { ry:yaw, mode:7, gloss:.04, tag });
    }
    const bx = Math.abs(Math.cos(yaw)) * d / 2 + Math.abs(Math.sin(yaw)) * .33;
    const bz = Math.abs(Math.sin(yaw)) * d / 2 + Math.abs(Math.cos(yaw)) * .33;
    solid(x - bx, x + bx, zc - bz, zc + bz);
  }

  function vanityRun(x, z, yaw, w, tag) {
    let p = put(x, z, yaw, 0, 0);
    box(p[0], .40, p[1], w, .68, .58, c.walnut, { hard:true, ry:yaw, mode:6, gloss:.30, tag });
    box(p[0], .78, p[1], w + .10, .09, .66, c.limestone, { hard:true, ry:yaw, mode:7, gloss:.24, tag });
    box(p[0], .05, p[1], w - .14, .10, .50, c.walnutD, { hard:true, ry:yaw, gloss:.24, tag });
    const two = w > 1.9 ? [-1, 1] : [0];
    for (const s of two) {
      const q = put(x, z, yaw, s * w * .24, -.02);
      cyl(q[0], .83, q[1], .23, .07, c.white, { gloss:.34, tag });
      const q2 = put(x, z, yaw, s * w * .24, .14);
      capsule(q2[0], 1.00, q2[1], .028, .32, .028, c.bronze, { gloss:.68, tag });
      capsule(q2[0], 1.14, put(x, z, yaw, s * w * .24, .06)[1], .026, .22, .026, c.bronze,
        { rx:Math.PI / 2, gloss:.68, tag });
      // mirror over each basin
      const q3 = put(x, z, yaw, s * w * .24, .26);
      box(q3[0], 1.90, q3[1], w * .40, 1.46, .07, c.bronzeD, { hard:true, ry:yaw, gloss:.62, tag });
      const q4 = put(x, z, yaw, s * w * .24, .225);
      box(q4[0], 1.90, q4[1], w * .34, 1.32, .025, c.glassD, { hard:true, ry:yaw, mode:1, gloss:.86, tag });
      const q5 = put(x, z, yaw, s * w * .24 + w * .21, .21);
      capsule(q5[0], 1.86, q5[1], .026, 1.10, .026, c.bronze, { gloss:.66, tag });
      luminous(box(q5[0], 1.86, q5[1], .05, 1.00, .05, c.warm, { mode:1, tag }), .03, .26);
    }
    for (const s of [-1, 1]) {
      const q = put(x, z, yaw, s * (w / 2 - .16), -.24);
      box(q[0], .44, q[1], w * .30, .44, .03, c.walnutL, { hard:true, ry:yaw, gloss:.28, tag });
      const q2 = put(x, z, yaw, s * (w / 2 - .16), -.27);
      capsule(q2[0], .44, q2[1], .020, .18, .020, c.bronzeL, { ry:yaw, rz:Math.PI / 2, gloss:.72, tag });
    }
    const bx = Math.abs(Math.cos(yaw)) * w / 2 + Math.abs(Math.sin(yaw)) * .34;
    const bz = Math.abs(Math.sin(yaw)) * w / 2 + Math.abs(Math.cos(yaw)) * .34;
    solid(x - bx, x + bx, z - bz, z + bz);
  }

  function stoneTub(x, z, yaw, tag) {
    let p = put(x, z, yaw, 0, 0);
    box(p[0], .10, p[1], 1.74, .20, .86, c.walnutD, { hard:true, ry:yaw, mode:7, gloss:.24, tag });
    box(p[0], .40, p[1], 1.86, .58, .96, c.limestoneL, { ry:yaw, mode:7, gloss:.26, tag });
    box(p[0], .66, p[1], 1.62, .06, .72, c.water, { hard:true, ry:yaw, mode:1, gloss:.84, tag });
    for (const s of [-1, 1]) {
      const q = put(x, z, yaw, s * .93, 0);
      box(q[0], .70, q[1], .10, .10, .98, c.limestone, { hard:true, ry:yaw, mode:7, gloss:.26, tag });
      const q2 = put(x, z, yaw, 0, s * .49);
      box(q2[0], .70, q2[1], 1.90, .10, .10, c.limestone, { hard:true, ry:yaw, mode:7, gloss:.26, tag });
    }
    p = put(x, z, yaw, .74, .60);
    capsule(p[0], .52, p[1], .032, 1.00, .032, c.bronze, { gloss:.68, tag });
    capsule(p[0], 1.02, put(x, z, yaw, .74, .44)[1], .030, .30, .030, c.bronze,
      { rx:Math.PI / 2, gloss:.68, tag });
    p = put(x, z, yaw, -.66, .58);
    box(p[0], .78, p[1], .34, .10, .24, c.walnut, { hard:true, ry:yaw, gloss:.30, tag });
    cyl(p[0], .87, p[1], .07, .09, c.celadonL, { gloss:.32, tag });
    const bx = Math.abs(Math.cos(yaw)) * .98 + Math.abs(Math.sin(yaw)) * .54;
    const bz = Math.abs(Math.sin(yaw)) * .98 + Math.abs(Math.cos(yaw)) * .54;
    solid(x - bx, x + bx, z - bz, z + bz);
  }

  // Enclosure is drawn with opaque dark-tinted glazing rather than alpha: anything under 0.999
  // alpha breaks batching and costs a draw call each, and a shower needs four panes.
  // `gx`/`gz` say which face carries glazing (+1, -1 or 0 for none). The other faces are the real
  // tiled walls the unit is tucked against, and at least one side must be left at 0 or the
  // enclosure has no way in — which is exactly how the first pass stranded two bathrooms.
  function shower(x, z, w, d, tag, gx, gz) {
    gx = gx === undefined ? -1 : gx; gz = gz === undefined ? 0 : gz;
    flat(x, .029, z, w, d, c.celadonL, { mode:7, gloss:.18, mat:'tile', matScale:.28, matAmt:.20, tag });
    for (const s of [-1, 1]) {
      flat(x + s * w * .49, .033, z, .035, d, c.bronzeD, { gloss:.46, tag });
      flat(x, .033, z + s * d * .49, w, .035, c.bronzeD, { gloss:.46, tag });
    }
    if (gz) {
      const zp = z + gz * d / 2;
      box(x, 1.30, zp, w, 2.56, .035, c.glassD, { hard:true, mode:1, gloss:.80, tag });
      for (const y of [.06, 2.60])
        capsule(x, y, zp, .032, w, .032, c.bronze, { rz:Math.PI / 2, gloss:.68, tag });
      for (const s of [-1, 1])
        capsule(x + s * w / 2, 1.30, zp, .034, 2.58, .034, c.bronze, { gloss:.68, tag });
      solid(x - w / 2 - .04, x + w / 2 + .04, zp - .07, zp + .07);
    }
    if (gx) {
      const xp = x + gx * w / 2;
      box(xp, 1.30, z, .035, 2.56, d, c.glassD, { hard:true, mode:1, gloss:.80, tag });
      for (const y of [.06, 2.60])
        capsule(xp, y, z, .032, d, .032, c.bronze, { rx:Math.PI / 2, gloss:.68, tag });
      for (const s of [-1, 1])
        capsule(xp, 1.30, z + s * d / 2, .034, 2.58, .034, c.bronze, { gloss:.68, tag });
      solid(xp - .07, xp + .07, z - d / 2 - .04, z + d / 2 + .04);
    }
    // Rose, riser and controls go on a real wall, never on the glass.
    const hx = x - (gx || -1) * w * .36, hz = z - (gz || 0) * d * .30;
    cyl(hx, 2.26, hz, .13, .05, c.bronzeD, { gloss:.64, tag });
    cyl(hx, 2.19, hz, .11, .03, c.steel, { gloss:.50, tag });
    box(hx, 1.22, hz, .16, .34, .10, c.bronzeD, { mode:7, gloss:.56, tag });
    capsule(hx, 1.74, hz, .018, .90, .018, c.bronze, { gloss:.66, tag });
    flat(x, .037, z, .30, .12, c.steel, { mode:1, gloss:.52, tag });
  }

  function wc(x, z, yaw, tag) {
    let p = put(x, z, yaw, 0, 0);
    taper(p[0], .22, p[1], .30, .44, .34, c.white, { ry:yaw, gloss:.28, tag });
    ball(p[0], .44, p[1], .20, .13, .26, c.white, { ry:yaw, mode:7, gloss:.29, tag });
    p = put(x, z, yaw, 0, .26);
    box(p[0], .52, p[1], .38, .58, .18, c.white, { hard:true, ry:yaw, mode:7, gloss:.29, tag });
    box(p[0], .82, p[1], .42, .05, .22, c.limestone, { hard:true, ry:yaw, gloss:.22, tag });
    p = put(x, z, yaw, .12, .32);
    cyl(p[0], .86, p[1], .035, .03, c.bronzeL, { gloss:.70, tag });
    solid(x - .34, x + .34, z - .34, z + .34);
  }

  function towelRail(x, z, yaw, w, tag) {
    let p = put(x, z, yaw, 0, 0);
    capsule(p[0], 1.26, p[1], .028, w, .028, c.bronze, { ry:yaw, rz:Math.PI / 2, gloss:.68, tag });
    for (const s of [-1, 1]) {
      const q = put(x, z, yaw, s * w * .46, .05);
      capsule(q[0], 1.26, q[1], .022, .12, .022, c.bronzeD, { ry:yaw, rx:Math.PI / 2, gloss:.60, tag });
      const q2 = put(x, z, yaw, s * w * .22, -.05);
      box(q2[0], .97, q2[1], w * .30, .54, .07, c.towel, { ry:yaw, mode:7, gloss:.02, tag });
    }
  }

  function writingDesk(x, z, yaw, w, tag) {
    let p = put(x, z, yaw, 0, 0);
    box(p[0], .73, p[1], w, .07, .70, c.walnut, { hard:true, ry:yaw, mode:6, gloss:.32, tag });
    box(p[0], .56, p[1], w - .30, .28, .58, c.walnutL, { hard:true, ry:yaw, gloss:.28, tag });
    for (const s of [-1, 1]) {
      const q = put(x, z, yaw, s * (w / 2 - .10), 0);
      capsule(q[0], .35, q[1], .042, .70, .042, c.walnutD, { gloss:.30, tag });
      const q2 = put(x, z, yaw, s * w * .22, -.30);
      capsule(q2[0], .56, q2[1], .020, .16, .020, c.bronzeL, { ry:yaw, rz:Math.PI / 2, gloss:.72, tag });
    }
    p = put(x, z, yaw, -w * .26, .04);
    box(p[0], .78, p[1], .40, .02, .30, c.paper, { hard:true, ry:yaw, mode:1, gloss:.04, tag });
    p = put(x, z, yaw, w * .28, .06);
    capsule(p[0], .84, p[1], .020, .16, .020, c.bronzeD, { rz:.5, gloss:.62, tag });
    cyl(p[0] + .12, .79, p[1], .07, .06, c.celadon, { gloss:.32, tag });
    solid(x - Math.abs(Math.cos(yaw) * w / 2) - .38, x + Math.abs(Math.cos(yaw) * w / 2) + .38,
      z - Math.abs(Math.sin(yaw) * w / 2) - .38, z + Math.abs(Math.sin(yaw) * w / 2) + .38);
  }

  function deskChair(x, z, yaw, upholstery, tag) {
    let p = put(x, z, yaw, 0, 0);
    box(p[0], .44, p[1], .48, .09, .48, upholstery, { ry:yaw, mode:7, gloss:.03, tag });
    p = put(x, z, yaw, 0, -.21);
    box(p[0], .74, p[1], .46, .52, .07, c.walnut, { hard:true, ry:yaw, mode:6, gloss:.30, tag });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const q = put(x, z, yaw, sx * .20, sz * .20);
      capsule(q[0], .20, q[1], .022, .40, .022, c.walnut, { gloss:.30, tag });
    }
    solid(x - .32, x + .32, z - .32, z + .32);
  }

  function shelfWall(x, z0, z1, yaw, tag) {
    const d = z1 - z0, zc = (z0 + z1) / 2;
    let p = put(x, zc, yaw, 0, 0);
    box(p[0], 1.40, p[1], d, 2.80, .40, c.walnut, { hard:true, ry:yaw, mode:6, gloss:.30, tag });
    box(p[0], 2.86, p[1], d + .08, .12, .48, c.walnutD, { hard:true, ry:yaw, gloss:.30, tag });
    const rd = rndFrom(x * 5 + z0 * 3);
    for (let i = 0; i < 4; i++) {
      const y = .46 + i * .64;
      const q = put(x, zc, yaw, 0, -.06);
      box(q[0], y, q[1], d - .12, .04, .34, c.walnutL, { hard:true, ry:yaw, gloss:.28, tag });
      let u = -d / 2 + .18;
      while (u < d / 2 - .22) {
        const bw = .11 + rd() * .19, bh = .22 + rd() * .12;
        const q2 = put(x, zc, yaw, u + bw / 2, -.10);
        box(q2[0], y + .02 + bh / 2, q2[1], bw, bh, .24,
          [c.lacquer, c.ink, c.celadon, c.silkL, c.jade][Math.floor(rd() * 5)],
          { ry:yaw, mode:7, gloss:.10, tag });
        u += bw + .030;
        if (rd() < .18) u += .20;
      }
    }
    const bx = Math.abs(Math.cos(yaw)) * d / 2 + Math.abs(Math.sin(yaw)) * .24;
    const bz = Math.abs(Math.sin(yaw)) * d / 2 + Math.abs(Math.cos(yaw)) * .24;
    solid(x - bx, x + bx, zc - bz, zc + bz);
  }

  const W = -Math.PI / 2, E = Math.PI / 2, N = 0, S = Math.PI;   // facings, by outward normal

  // ============================================================================================
  // 6 · 电梯前厅 — the arrival lobby
  // Was the north-east corner of a 1,132 m² hall; now a 69 m² room with all three cars, the
  // service car, and a door to each of the two suites.
  // ============================================================================================
  field(15.15, -.60, 4.30, 14.60, c.stoneL, '电梯前厅', c.dark);
  raft(15.15, -3.70, 3.90, 5.60, '电梯前厅');
  raft(15.15, 3.60, 3.90, 4.40, '电梯前厅');
  for (const z of [-6.30, -3.70, -1.10, 3.60]) lantern(15.15, 3.10, z, 1.05, '前厅灯笼');
  // One real point light per major room only. Peer floors ship 0-4 of these; the lanterns and
  // luminous fittings carry the rest of the mood at no per-pixel cost.
  light(15.15, 2.90, -3.70, c.warm, .95, 6.2);
  inkPanel(12.71, 1.94, -6.60, E, 2.40, 1.55, 311, '前厅水墨');
  consoleTable(12.90, .30, W, 1.70, '前厅条案');
  vessel(12.90, .81, .30, 1.05, c.celadon, '前厅条案');
  branches(12.90, 1.10, .30, 1.0, '前厅条案');
  planter(13.10, -7.60, .48, '前厅绿化');
  planter(16.90, 6.40, .44, '前厅绿化');
  for (const [zz, up] of [[-7.30, c.celadon], [-5.90, c.silkL]])
    armchair(16.70, zz, W, up, '前厅座椅');
  lowTable(16.70, -6.60, .62, .58, '前厅几');
  teaTray(16.70, .40, -6.60, '前厅几');
  nameplate(16.60, 2.16, -8.27, N, '江山套房', 'JIANGSHAN SUITE', c.lacquer);
  nameplate(12.30, 2.16, 7.02, S, '云锦茶室', 'YUNJIN TEA ROOM', c.jade);
  nameplate(12.73, 2.16, -1.60, E, '京华套房', 'JINGHUA GRAND SUITE', c.bronzeL);
  thing('电梯前厅', 15.15, 1.30, -.60, '十一层只有两套套房和一间茶室，前厅因此不设走廊。',
    'The eleventh floor holds only two suites and a tea room, so the landing needs no corridor.',
    '前厅 is an entrance hall or lobby.', { tag:'电梯前厅', focus:[14.4, -1.2], reach:2.4 });

  // ============================================================================================
  // 7 · 云锦茶室 — the shared tea room, wrapped around the building's floor directory
  // ============================================================================================
  field(14.00, 11.30, 6.60, 5.90, c.silk, '云锦茶室', c.walnutD);
  raft(14.00, 11.30, 6.00, 5.30, '云锦茶室');
  for (const x of [12.10, 15.90]) lantern(x, 3.06, 11.30, 1.1, '茶室灯笼');
  light(14.00, 2.85, 11.60, c.warm, .90, 6.0);
  cityWindow(16.30, 14.60, S, 3.20, 1.90, '茶室景观');
  cityWindow(11.60, 14.60, S, 2.20, 1.90, '茶室景观');
  inkPanel(10.41, 2.02, 9.10, E, 2.60, 1.60, 727, '茶室水墨');
  // Tea counter along the west wall, clear of the pantry door and the directory.
  box(10.86, .45, 12.30, .70, .90, 3.00, c.walnut, { hard:true, mode:6, gloss:.30, tag:'茶室茶台' });
  box(10.86, .93, 12.30, .82, .07, 3.12, c.limestone, { hard:true, mode:7, gloss:.24, tag:'茶室茶台' });
  box(10.86, .06, 12.30, .60, .12, 2.86, c.walnutD, { hard:true, gloss:.24, tag:'茶室茶台' });
  solid(10.44, 11.28, 10.74, 13.86);
  for (let i = 0; i < 4; i++)
    cyl(10.86, 1.03, 11.10 + i * .80, .10, .13, i % 2 ? c.celadonL : c.celadon,
      { gloss:.32, tag:'茶室茶具' });
  teaTray(10.86, .97, 13.60, '茶室茶具');
  for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++)
    box(11.14, 1.62 + i * .52, 11.30 + k * .68, .30, .04, .56, c.walnutL,
      { hard:true, gloss:.28, tag:'茶室陈列' });
  for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++)
    taper(11.14, 1.74 + i * .52, 11.32 + k * .68, .13, .20, .13,
      [c.celadon, c.lacquer, c.jade, c.celadonL, c.ink][(i + k) % 5],
      { mode:7, gloss:.22, tag:'茶室陈列' });
  // Two low tea tables with floor cushions, set away from the directory's reading zone.
  for (const [tx, tz] of [[14.60, 12.60], [15.90, 9.30]]) {
    box(tx, .30, tz, 1.20, .08, .80, c.walnut, { hard:true, mode:6, gloss:.32, tag:'茶席' });
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      capsule(tx + sx * .52, .14, tz + sz * .32, .034, .28, .034, c.walnutD, { gloss:.30, tag:'茶席' });
    teaTray(tx, .34, tz, '茶席');
    for (const s of [-1, 1])
      box(tx + s * .95, .11, tz, .58, .22, .58, s < 0 ? c.silkRose : c.celadonL,
        { mode:7, gloss:.03, tag:'茶席坐垫' });
    solid(tx - .70, tx + .70, tz - .50, tz + .50);
  }
  planter(16.90, 8.10, .46, '茶室绿化');
  glyphs(10.44, 2.86, 12.30, E, '云锦茶室',
    { size:.17, gap:.045, color:c.bronzeL, mode:1, glow:.035, lift:.008, tag:'云锦茶室' });
  thing('云锦茶室', 14.60, 1.20, 12.60, '套房客人可以在这里喝茶，看京城夜景。',
    'Suite guests take tea here and watch the city lights.',
    '茶室 is a tea room.', { tag:'云锦茶室', focus:[14.6, 11.4], reach:2.2 });

  // ============================================================================================
  // 8 · 备餐间 — the butler's pantry, on the published service spine [[16,5.1],[9,5.1],[9,10]]
  // ============================================================================================
  flat(11.45, .020, 4.62, 2.00, 4.60, c.limestoneL,
    { mode:7, gloss:.18, mat:'tile', matScale:.40, matAmt:.18, tag:'备餐间' });
  // Counter and tall cabinet both stop clear of z 4.60..6.20: that band is the service door line
  // through BOTH side walls, and the published serviceSpine runs [[16,5.1],[9,5.1],[9,10]]
  // straight along it. Furniture parked there severs the lift-to-dining route.
  box(10.62, .46, 3.55, .58, .92, 1.50, c.walnutL, { hard:true, mode:6, gloss:.26, tag:'备餐间' });
  box(10.62, .95, 3.55, .66, .07, 1.60, c.steel, { hard:true, gloss:.44, tag:'备餐间' });
  solid(10.40, 10.94, 2.80, 4.30);
  for (let i = 0; i < 3; i++)
    box(10.62, 1.72 + i * .46, 3.55, .40, .04, 1.36, c.walnutL,
      { hard:true, gloss:.26, tag:'备餐间' });
  for (let i = 0; i < 8; i++)
    cyl(10.62, 1.80 + Math.floor(i / 4) * .46, 3.05 + (i % 4) * .42, .10, .10,
      i % 3 ? c.paper : c.celadonL, { gloss:.30, tag:'备餐间' });
  box(12.28, .48, 6.65, .44, .96, .70, c.steel, { hard:true, gloss:.40, tag:'备餐间' });
  solid(12.06, 12.51, 6.30, 7.00);
  luminous(box(11.45, 3.32, 4.62, 1.20, .06, .16, c.white, { hard:true, mode:1, tag:'备餐间' }), .10, .16);
  thing('备餐间', 11.45, 1.20, 4.62, '客房服务从服务梯经备餐间送进套房餐厅。',
    'Room service reaches the suite dining room from the service lift through this pantry.',
    '备餐间 is a butler pantry.', { tag:'备餐间', focus:[11.8, 4.6], reach:2.0 });

  // ============================================================================================
  // 9 · 玄关 — the suite entry, east of the existing spirit screen
  // ============================================================================================
  field(9.90, -1.60, 4.60, 6.60, c.carpetL, '玄关');
  raft(9.90, -1.60, 4.20, 6.00, '玄关');
  for (const z of [-3.40, .20]) lantern(9.90, 3.06, z, 1.0, '玄关灯笼');
  consoleTable(12.29, -1.90, E, 1.60, '玄关条案');
  vessel(12.29, .81, -2.20, .95, c.lacquer, '玄关条案');
  branches(12.29, 1.06, -1.55, .95, '玄关条案');
  // Luggage bench and a coat niche, the two things an arriving guest actually uses.
  box(11.95, .44, 1.10, .52, .16, 1.30, c.walnut, { hard:true, mode:6, gloss:.30, tag:'行李架' });
  for (const sz of [-1, 1]) for (const sx of [-1, 1])
    capsule(11.95 + sx * .20, .21, 1.10 + sz * .52, .028, .42, .028, c.bronzeD, { gloss:.60, tag:'行李架' });
  box(11.95, .58, 1.10, .46, .12, 1.16, c.silkL, { mode:7, gloss:.03, tag:'行李架' });
  solid(11.60, 12.30, .40, 1.80);
  glyphs(12.48, 2.30, -1.90, W, '玄关',
    { size:.15, gap:.045, color:c.bronzeL, mode:1, glow:.03, lift:.008, tag:'玄关' });
  thing('行李车', 11.95, .90, 1.10, '行李员把行李放在玄关的长凳上。',
    'The bell staff set luggage on the bench in the entrance hall.',
    '行李 means luggage; 玄关 is an entrance hall.', { tag:'行李架', focus:[11.1, 1.1], reach:1.8 });

  // ============================================================================================
  // 10 · 客用长廊 — the suite's own gallery. 19 m long, so it is furnished as a room with bays
  // rather than left as circulation.
  // ============================================================================================
  raft(-4.20, -1.40, 20.00, 5.20, '长廊');
  for (const x of [-12.60, -8.40, -4.20, 0.00, 4.20]) lantern(x, 3.08, -1.40, 1.0, '长廊灯笼');
  light(-8.40, 2.86, -1.40, c.warm, .85, 6.4);
  // A seating bay in the middle of the gallery gives the hall a destination.
  field(-4.30, -1.30, 5.20, 4.20, c.carpet, '长廊小坐', c.walnutD);
  for (const [ax, ay] of [[-6.10, E], [-2.50, W]]) armchair(ax, -1.30, ay,
    ax < -4 ? c.celadon : c.silkRose, '长廊座椅');
  lowTable(-4.30, -1.30, .96, .68, '长廊几');
  teaTray(-4.30, .40, -1.30, '长廊几');
  for (const [cx, w] of [[-11.80, 1.80], [2.60, 1.60]]) consoleTable(cx, -4.59, S, w, '长廊条案');
  vessel(-11.80, .81, -4.59, 1.0, c.jade, '长廊条案');
  branches(2.60, 1.06, -4.59, 1.0, '长廊条案');
  // Ink scrolls hung on the north face of the existing 主卧 partition.
  inkPanel(-12.60, 2.05, 1.68, S, 2.00, 1.40, 101, '长廊水墨');
  inkPanel(-6.10, 2.05, 1.68, S, 2.20, 1.40, 202, '长廊水墨');
  inkPanel(-1.40, 2.05, 1.98, S, 1.80, 1.30, 303, '长廊水墨');
  planter(-13.90, -3.90, .46, '长廊绿化');
  planter(4.10, -3.90, .46, '长廊绿化');
  thing('客房', -4.30, 1.20, -1.30, '长廊把起居室、餐厅、主卧和浴室串成一条动线。',
    'The gallery threads the living room, dining room, bedroom and bathroom into one sequence.',
    '长廊 is a long gallery.', { tag:'长廊', focus:[-4.3, -2.6], reach:2.3 });

  // ============================================================================================
  // 11 · 书房 — the suite study, off the entry hall
  // ============================================================================================
  field(8.60, -6.85, 7.30, 2.50, c.carpet, '书房');
  raft(8.60, -6.85, 6.90, 2.20, '书房');
  shelfWall(5.00, -8.10, -5.70, W, '书房书架');
  // The room is only 2.9 m deep, so the desk has to sit hard against the south wall or its
  // collider leaves less than a body's width between it and the doorway.
  writingDesk(9.60, -7.75, N, 2.00, '书房书桌');
  deskChair(9.60, -6.95, S, c.silkL, '书房椅');
  inkPanel(12.49, 1.98, -6.85, W, 1.90, 1.30, 909, '书房水墨');
  lantern(8.60, 3.06, -6.85, .95, '书房灯');
  planter(11.90, -7.90, .42, '书房绿化');
  glyphs(6.60, 2.42, -5.17, N, '书房',
    { size:.14, gap:.045, color:c.bronzeL, mode:1, glow:.03, lift:.008, tag:'书房' });
  thing('书房', 8.60, 1.20, -6.85, '套房书房面向长廊，书架上放着京城的画册。',
    'The suite study opens off the gallery, its shelves holding albums of the city.',
    '书房 is a study.', { tag:'书房', focus:[8.6, -7.4], reach:2.0 });

  // ============================================================================================
  // 12 · 主卧前室 — the bedroom antechamber the new z=5.60 partition creates
  // ============================================================================================
  field(-8.80, 3.70, 10.60, 3.10, c.carpet, '主卧前室');
  for (const x of [-12.40, -5.20]) lantern(x, 3.06, 3.70, .95, '前室灯');
  consoleTable(-12.90, 2.10, S, 1.60, '前室条案');
  vessel(-12.90, .81, 2.10, 1.0, c.celadonL, '前室条案');
  inkPanel(-14.35, 2.00, 3.70, E, 2.20, 1.45, 515, '前室水墨');
  planter(-3.90, 2.70, .42, '前室绿化');
  glyphs(-11.60, 2.44, 5.49, S, '主卧',
    { size:.15, gap:.05, color:c.celadonL, mode:1, glow:.03, lift:.008, tag:'主卧前室' });

  // ============================================================================================
  // 13 · 衣帽间 — dressing room, the middle of the bedroom / dressing / bath tail
  // ============================================================================================
  field(-18.00, 9.90, 6.60, 8.60, c.carpet, '衣帽间');
  raft(-18.00, 9.90, 6.10, 8.00, '衣帽间');
  for (const z of [7.40, 12.40]) lantern(-18.00, 3.06, z, 1.0, '衣帽间灯');
  wardrobeRun(-21.45, 6.60, 13.60, W, '衣帽间');
  wardrobeRun(-14.80, 6.60, 8.20, E, '衣帽间');
  wardrobeRun(-14.80, 10.60, 13.60, E, '衣帽间');
  // Island of drawers with a stone top, the piece that makes it a room and not a corridor.
  box(-18.00, .44, 9.90, 1.30, .88, 2.60, c.walnut, { hard:true, mode:6, gloss:.30, tag:'衣帽间中岛' });
  box(-18.00, .92, 9.90, 1.46, .08, 2.76, c.limestone, { hard:true, mode:7, gloss:.24, tag:'衣帽间中岛' });
  box(-18.00, .05, 9.90, 1.10, .10, 2.40, c.walnutD, { hard:true, gloss:.24, tag:'衣帽间中岛' });
  solid(-18.78, -17.22, 8.48, 11.32);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    box(-18.00 + s * .66, .44, 9.90 + (i - 1) * .84, .03, .58, .70, c.walnutL,
      { hard:true, gloss:.28, tag:'衣帽间中岛' });
    capsule(-18.00 + s * .69, .44, 9.90 + (i - 1) * .84, .020, .22, .020, c.bronzeL,
      { rx:Math.PI / 2, gloss:.72, tag:'衣帽间中岛' });
  }
  for (const [ox, oz, oc] of [[-.30, .60, c.celadonL], [.28, -.10, c.lacquer], [-.10, -.80, c.silkL]])
    box(-18.00 + ox, 1.00, 9.90 + oz, .26, .10, .20, oc, { mode:7, gloss:.18, tag:'衣帽间中岛' });
  // Full-height mirror and a luggage bench at the bath end.
  box(-14.62, 1.55, 5.80, .09, 2.60, 1.10, c.bronzeD, { hard:true, gloss:.62, tag:'穿衣镜' });
  box(-14.57, 1.55, 5.80, .03, 2.40, .94, c.glassD, { hard:true, mode:1, gloss:.88, tag:'穿衣镜' });
  box(-20.40, .46, 6.20, 1.10, .18, .52, c.walnut, { hard:true, mode:6, gloss:.30, tag:'行李架' });
  box(-20.40, .60, 6.20, 1.00, .12, .44, c.silkL, { mode:7, gloss:.03, tag:'行李架' });
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    capsule(-20.40 + sx * .44, .22, 6.20 + sz * .18, .026, .44, .026, c.bronzeD, { gloss:.60, tag:'行李架' });
  solid(-21.05, -19.75, 5.86, 6.54);
  glyphs(-14.35, 2.44, 8.05, E, '衣帽间',
    { size:.15, gap:.045, color:c.bronzeL, mode:1, glow:.03, lift:.008, tag:'衣帽间' });
  thing('衣帽间', -18.00, 1.25, 9.90, '衣帽间在主卧和主浴之间，是套房动线的中段。',
    'The dressing room sits between the bedroom and the master bath, midway along the suite sequence.',
    '衣帽间 is a dressing room.', { tag:'衣帽间', focus:[-18.0, 8.4], reach:2.2 });

  // ============================================================================================
  // 14 · 主浴 — the master bath, the end of the sequence
  // ============================================================================================
  flat(-18.00, .020, 1.40, 6.60, 7.30, c.limestoneL,
    { mode:7, gloss:.20, mat:'tile', matScale:.38, matAmt:.22, tag:'主浴' });
  raft(-18.00, 1.40, 6.10, 6.70, '主浴');
  for (const z of [-.60, 3.40]) lantern(-18.00, 3.04, z, .95, '主浴灯');
  light(-18.00, 2.82, 1.40, c.warm, .90, 5.6);
  cityWindow(-21.62, 1.40, E, 2.60, 1.70, '主浴景观');
  stoneTub(-19.60, 1.40, E, '主浴浴缸');
  vanityRun(-14.88, 3.00, E, 2.30, '主浴盥洗');
  // Tucked into the south-east corner: real stone on the east and south, one glazed screen on the
  // west, and the north side left open as the way in.
  shower(-15.70, -1.25, 2.10, 1.90, '主浴淋浴', -1, 0);
  wc(-20.42, -1.30, W, '主浴坐便');
  box(-20.80, 1.30, -1.30, .16, 2.60, 2.20, c.limestone,
    { hard:true, mode:14, gloss:.16, tag:'主浴隔屏' });
  solid(-20.88, -20.72, -2.40, -.20);
  towelRail(-14.60, .60, E, 1.10, '主浴毛巾');
  planter(-20.90, 4.60, .44, '主浴绿化');
  glyphs(-19.60, 2.60, 5.43, N, '主浴',
    { size:.16, gap:.05, color:c.jade, mode:1, glow:.03, lift:.008, tag:'主浴' });
  thing('主浴', -18.00, 1.20, 1.40, '主浴用整面石材，浴缸对着城市窗景。',
    'The master bath is lined in stone, its tub set against the city window.',
    '主浴 is the master bathroom.', { tag:'主浴', focus:[-18.0, 3.0], reach:2.3 });

  // ============================================================================================
  // 15 · 疏散前室 and 布草间 — back of house, and the reason the fire stair is not inside a suite
  // ============================================================================================
  flat(-16.20, .019, -7.60, 3.10, 13.60, c.stoneL,
    { mode:7, gloss:.13, mat:'tile', matScale:.60, matAmt:.16, tag:'疏散前室' });
  for (const z of [-4.20, -10.60]) lantern(-16.20, 3.02, z, .82, '前室灯');
  luminous(box(-17.60, 2.44, -7.10, .08, .34, .74, c.green,
    { hard:true, mode:1, tag:'安全出口' }), .16, .34);
  glyphs(-17.66, 2.44, -7.10, E, '安全出口',
    { size:.085, gap:.022, color:c.white, mode:1, glow:.12, lift:.006, tag:'安全出口' });
  glyphs(-17.85, 2.40, -13.40, E, '布草间',
    { size:.11, gap:.03, color:c.bronzeL, mode:1, glow:.03, lift:.006, tag:'布草间' });
  // Linen store: shelving both sides and a housekeeping trolley bay.
  flat(-19.75, .019, -11.80, 3.20, 5.00, c.stoneL,
    { mode:7, gloss:.13, mat:'tile', matScale:.60, matAmt:.16, tag:'布草间' });
  for (const [sx, sz0, sz1] of [[-21.20, -14.00, -9.60], [-18.30, -14.00, -12.80]]) {
    const d = sz1 - sz0, zc = (sz0 + sz1) / 2, yaw = sx < -20 ? E : W;
    box(sx, 1.10, zc, .44, 2.20, d, c.steel, { hard:true, gloss:.34, tag:'布草间' });
    for (let i = 0; i < 3; i++) {
      box(sx + (yaw === E ? .06 : -.06), .48 + i * .68, zc, .34, .04, d - .10, c.steel,
        { hard:true, gloss:.36, tag:'布草间' });
      for (let k = 0; k < Math.max(2, Math.round(d / .76)); k++)
        box(sx + (yaw === E ? .10 : -.10), .64 + i * .68, sz0 + .40 + k * .76, .30, .30, .58,
          (i + k) % 3 ? c.towel : c.silkL, { mode:7, gloss:.03, tag:'布草间' });
    }
    solid(sx - .26, sx + .26, sz0, sz1);
  }
  lantern(-19.75, 3.00, -11.80, .78, '布草间灯');
  thing('布草间', -19.75, 1.20, -11.80, '客房部把干净的床品和毛巾存放在这里。',
    'Housekeeping keeps clean linen and towels in this store.',
    '布草间 is a linen room.', { tag:'布草间', focus:[-18.6, -11.6], reach:2.0 });
  thing('安全出口', -16.20, 1.20, -4.60, '疏散前室把楼梯和长廊连起来，不必穿过任何套房。',
    'The escape lobby links the stair to the gallery without crossing a private suite.',
    '疏散 means evacuation; 前室 is a lobby.', { tag:'疏散前室', focus:[-16.2, -3.4], reach:2.2 });

  // ============================================================================================
  // 16 · 江山套房 — the second suite: entry, study, living, bedroom, bath
  // ============================================================================================
  // -- entry --
  field(15.10, -9.90, 4.40, 2.40, c.carpetL, '江山玄关');
  lantern(15.10, 3.04, -9.90, .95, '江山灯');
  consoleTable(17.34, -9.90, E, 1.50, '江山条案');
  vessel(17.34, .81, -9.90, .95, c.lacquer, '江山条案');
  inkPanel(16.60, 1.96, -8.50, S, 1.70, 1.20, 606, '江山水墨');
  // -- study, south of the entry --
  field(15.10, -12.90, 4.40, 2.60, c.carpet, '江山书房');
  shelfWall(17.34, -13.90, -11.90, E, '江山书架');
  writingDesk(14.20, -13.40, N, 1.70, '江山书桌');
  deskChair(14.20, -12.55, S, c.silkL, '江山椅');
  lantern(15.10, 3.04, -12.90, .90, '江山灯');
  cityWindow(15.10, -14.60, N, 2.60, 1.75, '江山景观');
  // -- living room. A 2.20 m sofa's collider is 3.00 m wide in a 3.82 m room: it would have cut
  //    the room in two and stranded the bedroom behind it, so this one is 1.80 m against the west
  //    wall with a 1.2 m lane past its east end. --
  field(10.60, -11.40, 3.30, 5.40, c.carpetL, '江山起居');
  raft(10.60, -11.40, 3.10, 5.00, '江山起居');
  cityWindow(10.60, -14.60, N, 2.60, 1.80, '江山起居景观');
  sofa(9.99, -11.60, S, 1.80, c.silk, '江山沙发');
  lowTable(10.20, -13.20, 1.00, .70, '江山茶几');
  teaTray(10.20, .42, -13.20, '江山茶几');
  armchair(11.80, -13.20, W, c.celadon, '江山座椅');
  box(8.77, 1.60, -10.20, .10, 1.06, 1.80, c.ink, { hard:true, mode:1, gloss:.42, tag:'江山电视' });
  box(8.83, 1.60, -10.20, .03, .96, 1.66, c.inkL, { hard:true, mode:1, gloss:.30, tag:'江山电视' });
  lantern(10.60, 3.04, -9.60, .90, '江山灯');
  light(10.60, 2.82, -11.40, c.warm, .75, 5.0);
  // -- bedroom, south bay, on the only exterior wall the suite has --
  field(6.60, -12.90, 3.50, 3.10, c.carpet, '江山卧室');
  bedSet(5.95, -13.20, E, 1.80, '江山大床', c.silkBlue);
  bedside(5.20, -11.95, E, '江山床头柜');
  cityWindow(7.20, -14.60, N, 2.00, 1.60, '江山卧室景观');
  lantern(7.60, 3.04, -12.60, .88, '江山灯');
  // -- bath, north bay: stone on the north and east, one glazed screen, open to the south --
  flat(6.60, .020, -9.75, 3.50, 2.30, c.limestoneL,
    { mode:7, gloss:.20, mat:'tile', matScale:.36, matAmt:.22, tag:'江山浴室' });
  vanityRun(5.55, -8.75, N, 1.40, '江山盥洗');
  shower(7.55, -9.30, 1.70, 1.50, '江山淋浴', -1, 0);
  wc(8.16, -10.50, E, '江山坐便');
  towelRail(4.81, -9.90, W, .90, '江山毛巾');
  lantern(6.20, 3.02, -10.10, .85, '江山灯');
  thing('客房', 10.70, 1.20, -11.90, '江山套房从玄关进门，依次是书房、起居室、卧室和浴室。',
    'The Jiangshan Suite runs entry, study, living room, bedroom and bath in that order.',
    '套房 is a suite.', { tag:'江山套房', focus:[10.7, -10.6], reach:2.3 });
  thing('客房', 6.60, 1.20, -9.90, '卧室的窗对着南面的城市。',
    'The bedroom window faces the city to the south.',
    '卧室 is a bedroom.', { tag:'江山大床', focus:[7.6, -9.9], reach:2.0 });

  // ============================================================================================
  // 17 · Additions to the rooms the fit-out module already furnished
  // The existing pieces stay exactly where they are; these fill the space the new walls define.
  // ============================================================================================
  // -- 餐厅: the dining room is 12 m deep, so it gets a buffet run, a screen and a window seat --
  cityWindow(1.40, 14.60, S, 3.00, 1.90, '餐厅景观');
  cityWindow(-1.40, 14.60, S, 1.90, 1.90, '餐厅景观');
  box(-1.30, .46, 4.10, 3.00, .92, .56, c.walnut, { hard:true, mode:6, gloss:.30, tag:'餐厅备餐台' });
  box(-1.30, .95, 4.10, 3.14, .07, .64, c.limestone, { hard:true, mode:7, gloss:.24, tag:'餐厅备餐台' });
  solid(-2.84, 0.24, 3.78, 4.42);
  for (let i = 0; i < 4; i++)
    cyl(-2.40 + i * .74, 1.05, 4.10, .11, .13, i % 2 ? c.celadon : c.celadonL,
      { gloss:.32, tag:'餐厅备餐台' });
  inkPanel(-2.91, 2.10, 8.60, E, 2.60, 1.70, 404, '餐厅水墨');
  for (const x of [0.60, 3.40, 6.20]) lantern(x, 3.10, 12.80, 1.0, '餐厅灯笼');
  light(3.40, 2.90, 8.55, c.warm, 1.00, 6.6);
  planter(-2.10, 12.90, .48, '餐厅绿化');
  planter(9.40, 3.10, .44, '餐厅绿化');
  // -- 主卧: the north wall gets reading lights and the west wall a mirror bay --
  light(-8.50, 2.88, 9.60, c.warm, .85, 6.2);
  for (const x of [-13.40, -4.20]) lantern(x, 3.08, 7.20, 1.0, '主卧灯笼');
  inkPanel(-3.09, 2.05, 8.20, W, 2.20, 1.50, 808, '主卧水墨');
  // -- 起居室 and 石材浴室 --
  light(-1.00, 2.90, -8.40, c.warm, 1.00, 6.8);
  for (const x of [-4.60, 2.60]) lantern(x, 3.10, -6.00, 1.05, '起居室灯笼');
  raft(-1.00, -8.90, 9.60, 7.40, '起居室');
  cityWindow(-5.60, -14.60, N, 2.40, 1.85, '起居室景观');
  cityWindow(3.30, -14.60, N, 2.40, 1.85, '起居室景观');
  planter(3.90, -5.60, .46, '起居室绿化');
  planter(-6.10, -5.60, .46, '起居室绿化');
  towelRail(-14.34, -6.40, W, 1.00, '石材浴室');
  // 石材浴室 was the one room in the suite sequence with no key of its own — H259 asks for four
  // rooms each with its own light and this floor had lanterns and a `light()` over the living
  // room, the bedroom, the dining room, 主浴, 衣帽间 and the corridor, and nothing at all over the
  // bath the floor is named for. Two lanterns on the bath's own axis and a warm key over the tub,
  // at the same magnitudes the other rooms use.
  for (const z of [-11.20, -6.60]) lantern(-10.75, 3.06, z, .95, '石材浴室灯');
  light(-9.90, 2.84, -10.60, c.warm, .90, 6.0);
  glyphs(-13.20, 2.20, -12.22, N, '衣帽间',
    { size:.12, gap:.035, color:c.bronzeL, mode:1, glow:.03, lift:.006, tag:'衣帽间' });
});

// --------------------------------------------------------------------------------- floor actions
// Five of this floor's labelled places carried a `thing` but no action, so walking up to the tea
// salon, the butler pantry, the dressing room, the principal bath or the arrival foyer produced a
// card with nothing on it (.hotelcheck.js `no dead interaction labels`). js/hotel-guests.js's fit11
// already registers 起居室 / 主卧 / 石材浴室 / 套房餐桌 / 客房服务; Object.assign merges, and the
// per-floor module loads after the fit-out, so both sets survive.
//
// These are the suite sequence H259 asks for read as verbs: arrive, take tea, be served, dress,
// bathe. 备餐间 is the butler lane's floor end — the same pantry the 客房服务 trolley works out of.
Object.assign(HotelUse.hotel11, {
  '电梯前厅':{ zh:'看楼层导览', py:'kàn lóucéng dǎolǎn', en:'read the floor plan in the arrival foyer',
    secs:2.0, mins:3, gain:{}, pose:{ type:'check' } },
  '云锦茶室':{ zh:'在茶室喝茶', py:'zài cháshì hē chá', en:'take tea in the salon',
    secs:3.4, mins:30, gain:{ rest:12, mood:11 }, pose:{ type:'drink', seatY:.48 } },
  '备餐间':{ zh:'叫管家送餐', py:'jiào guǎnjiā sòngcān', en:'ask the butler pantry for a tray',
    secs:2.6, mins:8, gain:{ mood:4 }, pose:{ type:'check' } },
  '衣帽间':{ zh:'换一身衣服', py:'huàn yì shēn yīfu', en:'change in the dressing room',
    secs:3.0, mins:12, gain:{ mood:6 }, pose:{ type:'work' } },
  '主浴':{ zh:'在主浴淋浴', py:'zài zhǔyù línyù', en:'shower in the principal bath',
    secs:3.4, mins:20, gain:{ clean:32, rest:6 }, pose:{ type:'scrub' } },
});
