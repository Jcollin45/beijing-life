// 🏨 京华大酒店 · Floor 5 — the interior architecture
//
// This floor's own module. Registered into HotelFit (declared in js/hotel.js). Nothing else in
// the build writes to this file, and you must not write to anyone else's.
//
// Programme for this level, from HOTEL.md:
//   standard guest corridor, two complete guestrooms, an accessible room, housekeeping pantry
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
//   scene key   hotel5
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
//     node /private/tmp/claude-501/-Users-jonahcollins-Desktop-Chinesegame/a3cc9bcf-53f0-4e3d-a6a3-24cb996ed8a1/scratchpad/floorprobe.js hotel5 -22 22 -15 15 15.6 -3.7
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
//   * `node --check js/hotel-f5.js` after every edit. A backtick inside a template literal
//     ends the string mid-statement; that has broken this project three times.
//
// ---------------------------------------------------------------------------------------------
// WHAT THIS MODULE ACTUALLY BUILDS — the measured plan
//
// js/hotel-guests.js (fit5) had already laid four of the plan's lines with real `solid()` calls:
// the three guestroom fronts at z -5.24..-5.07 with 1.44 m openings, the 501/502 and 502/503
// party walls, 503's east wall, and the service wall at z 5.00..5.20. Everything else on the
// plate was open floor, and the plan leaked around both ends of every one of those runs.
//
// This module supplies the missing half of the building:
//
//   W1        x -14.29..-14.05, z -15.2..15.2 — the west spine. One wall doing three jobs:
//             room 501's west party wall, the guest corridor's terminated west vista (the
//             fit-out's 北京印象 ink panel at x -14.0 sits on its east face) and the service
//             corridor's west end. A 1.00 m opening at z -1.35..-0.35 is the fire-stair door.
//   E1        x 11.37..11.55 — separates the corridor and the service corridor from the east
//             back-of-house hall. 1.20 m staff door at z 6.39..7.59, on the fit-out's own
//             员工通道 sign.
//   E2        z 2.45..2.61 — the lift landing's north wall, with a 1.60 m opening to the
//             service hall so the floor directory totem at [13.55, 10.55] stays reachable.
//   landing   south wall at z -9.68..-9.52 and west wall at x 11.39..11.55, so the landing is a
//             bay off the corridor's east end rather than half the plate.
//   bath 503  east wall x 5.83..5.99 and a wet-room partition at z -6.36..-6.20, plus a 1.14 m
//             door into the bedroom under the fit-out's existing head. See the CONFLICT note.
//   linen     the fit-out drew the pantry's south and west walls and never gave them colliders;
//             this adds those, the missing east wall, and jambs that bring the trolley door
//             down to 1.40 m.
//   doors     501 and 502 get 1.00 m leaves inside their 1.44 m structural openings, so the
//             accessible room's 1.44 m door is measurably the wide one.
//   masses    every square metre of plate outside the plan is filled solid and faced, so there
//             is no floor the player can see and never stand on. Four sealed room doors (504 —
//             507) explain those masses as the unauthored half of the guest wing.
//
// CONFLICT LEFT IN PLACE — room 503's entry lands inside the accessible bath.
// fit5 puts 503's corridor door at x 4.38..5.82 and the accessible bath at x 1.65..5.85,
// z -9.10..-5.40, so the door's whole x-range is inside the bath footprint: there is no wall
// line that both seals the bath on the north and leaves the room enterable. Rather than bury
// the door or exile the accessible fixtures, the bath is split at z -6.36..-6.20 into a basin
// vestibule (which the door opens into, and which passes east into the bedroom through a 0.96 m
// gap) and the wet room proper. Reported to the coordinator with coordinates.

try {
  Glyphs.need('五零四五零五五零六五零七安全楼梯员工通道客房服务无障碍浴室盥洗前室客房布草间'
    + '一二三至指引');
} catch (_) {}

HotelFit.register('hotel5', A => {
  const { box, cyl, ball, capsule, taper, flat, glyphs, solid, blocker, shade, glow, thing } = A;
  const { C, col, RX, RZ, H } = A;

  // Match the fit-out's palette exactly; a partition that does not share the guestroom plaster
  // reads as a later addition rather than as the building.
  const plaster = C('#e6dfd2'), plasterD = C('#d6cdbd'), limestone = C('#d8cfbf');
  const walnutD = C('#2f2623'), walnut = C('#49352c'), walnutL = C('#745444');
  const celadonL = C('#c1d0c5'), silkL = C('#ddd0bf'), ink = C('#25282a');

  // The tower's material kit. The tuples are numerically identical to the copies in
  // js/hotel-f1.js and js/hotel-public.js on purpose: build.js:329-331 keys batches on
  // (mat, matScale, matAmt, nrmAmt), so matching numbers let these partitions batch with the
  // fit-out's furniture instead of doubling the draw calls. Change one, change all.
  // Every name here is already in EAGER_MATERIALS (js/assets.js:187), so none of this adds
  // anything to the boot cost.
  const MAT = {
    stone:  { mat: 'plaster',  matScale: 2.30, matAmt: .16, nrmAmt: .62 },
    timber: { mat: 'wood',     matScale: .95,  matAmt: .26, nrmAmt: .34 },
    cloth:  { mat: 'fabric',   matScale: .52,  matAmt: .26, nrmAmt: .46 },
    paving: { mat: 'concrete', matScale: 1.85, matAmt: .17, nrmAmt: .30 },
  };

  // Heights. The fit-out's plaster runs 0.00..3.16; the shell ceiling soffit is at H-0.26 = 4.09.
  // A partition that stops at 3.16 is a screen, not a wall, so every run carries a bulkhead up to
  // the slab. The perimeter cove at y 4.02..4.06 is interrupted where a wall crosses it, which is
  // what a wall crossing a cove does.
  // BULK_* is the bulkhead used over the FIT-OUT's own walls, whose crown trim tops out at 3.18;
  // it starts at 3.10 so the cornice dies into the soffit instead of leaving a slot of daylight.
  const WH = 3.16, BULK_Y = 3.595, BULK_H = 0.99, EYE = 4.09;

  // ------------------------------------------------------------------- the plan, as coordinates
  // Every number below is an EXTENT (a wall face), never a centre. `part()` is the only place
  // extents are converted to box centres, so the collider can never drift off the geometry.
  const W1_X0 = -14.29, W1_X1 = -14.05;      // west spine wall
  const W1_D0 = -1.35, W1_D1 = -0.35;        // fire-stair door in it, 1.00 m clear
  const SL_X0 = -17.84, SL_X1 = W1_X0;       // stair lobby, interior faces
  const SL_Z0 = -9.30, SL_Z1 = -0.20;
  const E1_X0 = 11.37, E1_X1 = 11.55;        // corridor / service east wall
  const E1_D0 = 6.39, E1_D1 = 7.59;          // staff door, 1.20 m clear
  const E2_Z0 = 2.45, E2_Z1 = 2.61;          // lift landing north wall
  const E2_D0 = 12.25, E2_D1 = 13.85;        // 1.60 m opening to the service hall
  const LAND_Z0 = -9.68, LAND_Z1 = -9.52;    // lift landing south wall
  const FAR_X = 18.85;                       // east riser zone begins here
  const FRONT_Z0 = -5.24, FRONT_Z1 = -5.07;  // fit-out's guestroom front wall, for reference
  const SERV_Z0 = 5.00, SERV_Z1 = 5.20;      // fit-out's service wall, for reference

  // --------------------------------------------------------------------------------- primitives

  // A partition, given by its footprint EXTENTS. This is deliberately the only function in the
  // file that calls both box() and solid(), because they take different argument shapes and the
  // whole defect this module exists to fix is geometry and collision disagreeing.
  function part(x0, x1, z0, z1, o = {}) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    const y0 = o.y0 === undefined ? 0 : o.y0, y1 = o.y1 === undefined ? WH : o.y1;
    const tag = o.tag || '墙';
    box(cx, (y0 + y1) / 2, cz, w, y1 - y0, d, o.c || plaster,
      { ...MAT.stone, hard: true, gloss: o.gloss === undefined ? .10 : o.gloss, tag });
    if (o.stop !== false) solid(x0, x1, z0, z1);
    if (o.eye !== false) blocker(x0 - .03, x1 + .03, z0 - .03, z1 + .03, o.top || EYE);
    // The bulkhead runs from this wall's own top to the slab soffit, with no seam: a 40 mm slot
    // at the head of every partition is exactly the kind of thing a screenshot never shows.
    if (o.bulk !== false && y1 >= WH - .01 && y1 < EYE - .02)
      box(cx, (y1 + EYE) / 2, cz, w, EYE - y1, d, plasterD,
        { ...MAT.stone, hard: true, gloss: .09, tag });
    if (o.trim === false) return;
    // Skirting and picture rail on both long faces: a partition with no base is a card.
    if (w >= d) for (const s of [-1, 1]) {
      const fz = s < 0 ? z0 - .035 : z1 + .035;
      box(cx, .105, fz, w, .21, .07, walnutD, { ...MAT.timber, hard: true, gloss: .29, tag });
      box(cx, 3.075, fz, w, .15, .07, walnutD, { ...MAT.timber, hard: true, gloss: .29, tag });
    } else for (const s of [-1, 1]) {
      const fx = s < 0 ? x0 - .035 : x1 + .035;
      box(fx, .105, cz, .07, .21, d, walnutD, { ...MAT.timber, hard: true, gloss: .29, tag });
      box(fx, 3.075, cz, .07, .15, d, walnutD, { ...MAT.timber, hard: true, gloss: .29, tag });
    }
  }

  // A visible face on a solid mass. Geometry only — the mass already carries the collider, and a
  // second solid on the same line would only make the arithmetic harder to check.
  function face(x0, x1, z0, z1, o = {}) {
    part(x0, x1, z0, z1, Object.assign({ stop: false, eye: false }, o));
  }

  // A structural mass: unauthored building behind a wall face. Solid + camera blocker, no
  // interior. Its only job is that no square metre of plate is standable-but-unreachable.
  function mass(x0, x1, z0, z1) {
    solid(x0, x1, z0, z1);
    blocker(x0 - .04, x1 + .04, z0 - .04, z1 + .04, EYE);
  }

  // A door opening: jambs, lined reveal, head and bronze threshold. Carries no collider of its
  // own — the two wall runs either side of it are what define the clear width, so every piece
  // here is placed OUTSIDE that width. A jamb standing inside the opening would be a walk-through
  // wall again, only 85 mm of it.
  // axis 'x': the wall runs along x and the opening is an x-range; 'z' is the transpose.
  function opening(axis, a0, a1, b0, b1, o = {}) {
    const bc = (b0 + b1) / 2, t = b1 - b0, head = o.head === undefined ? 2.52 : o.head;
    const jw = .085, tag = o.tag || '门洞', sides = o.sides || [1, 1];
    if (axis === 'x') {
      if (sides[0]) box(a0 - jw / 2, WH / 2, bc, jw, WH, t + .06, walnut, { ...MAT.timber, hard: true, gloss: .31, tag });
      if (sides[1]) box(a1 + jw / 2, WH / 2, bc, jw, WH, t + .06, walnut, { ...MAT.timber, hard: true, gloss: .31, tag });
      if (head < WH - .02) box((a0 + a1) / 2, (head + WH) / 2, bc, a1 - a0, WH - head, t + .06,
        walnut, { ...MAT.timber, hard: true, gloss: .31, tag });
      box((a0 + a1) / 2, .022, bc, a1 - a0 - .02, .044, t + .10, A.col.bronzeD,
        { hard: true, gloss: .66, tag });
    } else {
      if (sides[0]) box(bc, WH / 2, a0 - jw / 2, t + .06, WH, jw, walnut, { ...MAT.timber, hard: true, gloss: .31, tag });
      if (sides[1]) box(bc, WH / 2, a1 + jw / 2, t + .06, WH, jw, walnut, { ...MAT.timber, hard: true, gloss: .31, tag });
      if (head < WH - .02) box(bc, (head + WH) / 2, (a0 + a1) / 2, t + .06, WH - head, a1 - a0,
        walnut, { ...MAT.timber, hard: true, gloss: .31, tag });
      box(bc, .022, (a0 + a1) / 2, t + .10, .044, a1 - a0 - .02, A.col.bronzeD,
        { hard: true, gloss: .66, tag });
    }
  }

  // A bilingual door plate. Small, bronze-framed, at the height a real one sits. Glyph yaw in
  // this engine faces +z at 0 and +x at PI/2, so text is nudged along that normal, not into the
  // plate behind it.
  function plate(x, y, z, yaw, hz, en, tag) {
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    box(x, y, z, .40, .215, .028, ink, { hard: true, ry: yaw, gloss: .40, tag });
    box(x + nx * .006, y, z + nz * .006, .365, .180, .034, A.col.bronzeD,
      { hard: true, ry: yaw, gloss: .60, tag });
    const fx = x + nx * .026, fz = z + nz * .026;
    glyphs(fx, y + .035, fz, yaw, hz,
      { size: .082, gap: .014, color: A.col.bronzeL, mode: 1, lift: .006, tag });
    if (en) glyphs(fx, y - .058, fz, yaw, en,
      { size: .042, gap: .009, color: silkL, mode: 1, lift: .006, tag });
  }

  // A guestroom door that never opens: the unauthored half of the wing, made honest instead of
  // hidden. Recessed leaf, jambs, head, handle and number plate, and no collider — the mass
  // behind it already stops the body.
  function blindDoor(x, z, yaw, num, tag) {
    const nx = Math.sin(yaw), nz = Math.cos(yaw);         // outward face normal, matching glyph yaw
    const tx = Math.cos(yaw), tz = -Math.sin(yaw);        // along the wall
    const at = (u, v) => [x + tx * u + nx * v, z + tz * u + nz * v];
    for (const s of [-1, 1]) {
      const p = at(s * .60, .055);
      box(p[0], 1.44, p[1], .13, 2.88, .17, walnutD, { ...MAT.timber, hard: true, ry: yaw, gloss: .32, tag });
    }
    const hd = at(0, .055);
    box(hd[0], 2.965, hd[1], 1.33, .17, .17, walnutD, { ...MAT.timber, hard: true, ry: yaw, gloss: .32, tag });
    const lf = at(0, .035);
    box(lf[0], 1.42, lf[1], 1.04, 2.78, .075, walnut, { ...MAT.timber, hard: true, ry: yaw, gloss: .33, tag });
    const pn = at(0, .075);
    // Woven silk, not a light box. `mode: 1` is emissive: it ignores the room's lighting and
    // renders the panel at full colour, which is why every sealed door read as a backlit slab
    // in HT5-overview. mode 7 is the woven-fabric shader, and the cloth tuple gives it a weave.
    box(pn[0], 1.86, pn[1], .80, 1.42, .022, silkL,
      { ...MAT.cloth, hard: true, ry: yaw, mode: 7, gloss: .05, tag });
    const th = at(0, .055);
    box(th[0], .028, th[1], 1.24, .056, .22, A.col.bronzeD, { hard: true, ry: yaw, gloss: .66, tag });
    const hn = at(.40, .10);
    ball(hn[0], 1.06, hn[1], .055, .055, .045, A.col.bronzeL, { gloss: .74, tag });
    // Outboard of the jamb (which reaches u 0.665 and stands 0.14 proud), or the plate is buried
    // inside it and the room number never renders.
    const pl = at(.92, .018);
    plate(pl[0], 1.62, pl[1], yaw, num, '', tag);
  }

  // A ceiling downlight: canopy, emissive lens AND a real point light. The shell only lights this
  // plate from three coves on the x=0 centreline, which was enough while the floor was one open
  // hall; a room with four walls round it needs its own fitting or it renders black. gl.js caps
  // local lights at eight and game.js keeps the nearest to the camera, so these only cost
  // anything while the player is standing in the room they belong to.
  function downlight(x, z, day = .05, night = .30, power = .30, radius = 5.6) {
    cyl(x, 4.04, z, .17, .07, A.col.bronzeD, { gloss: .62, tag: '筒灯' });
    A.luminous(cyl(x, 3.975, z, .135, .035, A.col.warm, { mode: 1, tag: '筒灯' }), day, night);
    const l = A.light(x, 3.86, z, [1, .84, .62], power, radius); l.on = true; return l;
  }

  // =============================================================================== W1, the spine
  // Room 501's west party wall, the corridor's west end and the service corridor's west end are
  // one plane. Its east face is at x -14.05, which is where the fit-out's ink panel (a 0.10 m
  // deep frame centred on x -14.0) has to sit proud of; the published room501 rect starts at
  // -13.82, so room 501 is built 0.23 m wider than its camera metadata and re-registered below.
  part(W1_X0, W1_X1, -15.20, W1_D0, { tag: '墙' });
  part(W1_X0, W1_X1, W1_D1, 15.20, { tag: '墙' });
  part(W1_X0, W1_X1, W1_D0, W1_D1, { y0: 2.52, y1: WH, stop: false, eye: false, trim: false, tag: '安全楼梯' });
  opening('z', W1_D0, W1_D1, W1_X0, W1_X1, { tag: '安全楼梯' });
  // The 0.25 m step between W1's east face and the fit-out's front-wall run needs a closer, or
  // the corridor's south-west corner is an open slot in the plaster.
  face(W1_X1, -13.80, FRONT_Z0, FRONT_Z1, { trim: false });
  // ...and the same at the service wall, whose collider starts at x -13.90.
  face(W1_X1, -13.88, SERV_Z0, SERV_Z1, { trim: false });

  plate(-14.03, 1.62, -1.72, Math.PI / 2, '安全楼梯', 'FIRE STAIR', '安全楼梯');
  glyphs(-14.02, 2.79, -0.85, Math.PI / 2, '安全楼梯',
    { size: .125, gap: .022, color: A.col.bronzeL, mode: 1, lift: .008, tag: '安全楼梯' });
  glyphs(-14.02, 2.60, -0.85, Math.PI / 2, 'FIRE STAIR',
    { size: .058, gap: .011, color: silkL, mode: 1, lift: .008, tag: '安全楼梯' });

  // ============================================================== the west stair lobby and mass
  // The fire stair's own vestibule is already a closed volume at x -21.94..-17.84, z -8.86..-5.34
  // with its red leaf facing east. The lobby is the piece of plate that lets the corridor reach
  // it; everything else west of W1 is structure.
  mass(-21.70, SL_X0, -15.30, -8.86);
  mass(-21.70, SL_X0, -5.34, 15.30);
  mass(-18.00, W1_X0, -15.30, SL_Z0);
  mass(-18.00, W1_X0, SL_Z1, 15.30);
  mass(-18.00, SL_X0, SL_Z0, -8.86);
  mass(-18.00, SL_X0, -5.34, SL_Z1);
  face(-18.00, W1_X0, SL_Z0 - .16, SL_Z0);
  face(-18.00, W1_X0, SL_Z1, SL_Z1 + .16);
  face(-18.00, SL_X0, SL_Z0 - .16, -8.80);
  face(-18.00, SL_X0, -5.40, SL_Z1 + .16);
  // Landing floor, so the lobby is a finished room rather than raw shell tile.
  flat(-16.05, .019, -4.75, 3.55, 8.90, A.col.stoneL, {...MAT.stone, mode: 7, gloss: .14, tag: '安全楼梯' });
  flat(-16.05, .024, -4.75, 3.10, 8.45, A.col.dark, {...MAT.cloth, mode: 7, gloss: .10, tag: '安全楼梯' });
  for (const z of [-8.30, -1.20]) flat(-16.05, .028, z, 3.10, .06, A.col.bronze,
    { gloss: .62, tag: '安全楼梯' });
  for (const z of [-8.10, -4.80, -1.50]) downlight(-16.05, z, .05, .34);
  // One sealed room opens off the west lobby's outer wall; that is what the mass behind it is.
  // It goes on the x -18.00..-17.84 face, because that is the only side of this lobby with real
  // building behind it — W1's far side is the corridor.
  blindDoor(-17.84, -3.20, Math.PI / 2, '五零七', '客房');
  // Deliberately NO `thing` in this lobby. hotel.js already puts the floor-changing 楼梯
  // interactable at [-17.80, -7.10] with focus [-16.0, -7.10], and build.js's nearestThing picks
  // the closest one — a second label here would shadow the only stair route off this floor.

  // ================================================== room 501 and 502 doors: 1.00 m clear leaves
  // The fit-out left all three guestrooms with the same 1.44 m structural opening. A standard
  // room takes a 1.00 m leaf inside a lined reveal; 503 keeps the full 1.44 m, which is the
  // accessible claim and is measurable in the flood fill rather than asserted here.
  for (const r of [{ x: -10.2, n: '五零一', d: '501' }, { x: -2.6, n: '五零二', d: '502' }]) {
    const oL = r.x - .72, oR = r.x + .72;         // fit-out's structural opening
    const cL = r.x - .50, cR = r.x + .50;         // the leaf we are actually giving it
    for (const [a0, a1] of [[oL, cL], [cR, oR]]) {
      solid(a0, a1, FRONT_Z0, -4.82);
      part(a0, a1, FRONT_Z1, -4.82, { stop: false, trim: false, bulk: false, top: WH });
    }
    opening('x', cL, cR, -5.02, -4.86, { head: 2.62, tag: '客房' });
    plate(r.x + 1.05, 1.62, -5.055, 0, r.n, r.d, '客房');
  }
  // 503's plate matches, so the wide door is a labelled accessible room and not an oversight.
  plate(6.64, 1.62, -5.055, 0, '五零三', '503  ACCESSIBLE', '客房');

  // ============================================================ room 503: the accessible bath
  // fit5's accessible bath already carries a headed 2.77 m south opening at z -9.17 with walnut
  // casings at x 1.71 and 4.362. Filling the west 1.58 m of that run turns it into a 1.14 m
  // accessible door — wider than 501/502's 1.00 m leaves, under the head that is already there.
  solid(1.50, 3.16, -9.32, -9.07);
  solid(4.30, 5.99, -9.32, -9.07);
  part(1.58, 3.16, -9.25, -9.10, { stop: false, eye: false, trim: false, bulk: false, tag: '无障碍浴室' });
  face(4.30, 4.43, -9.25, -9.10, { trim: false, bulk: false });
  face(5.85, 5.99, -9.25, -9.10, { trim: false, bulk: false });
  // fit5 already owns the head over this opening and a walnut casing at x 4.302..4.422, so only
  // the west jamb is ours; a second head here would z-fight with the one that is already there.
  opening('x', 3.16, 4.30, -9.27, -9.08, { head: WH, sides: [1, 0], tag: '无障碍浴室' });
  blocker(1.50, 5.99, -9.34, -9.05, WH);
  box(3.745, BULK_Y, -9.175, 4.49, BULK_H, .19, plasterD, { hard: true, gloss: .09, tag: '无障碍浴室' });
  // East wall and the wet-room partition. The partition line is chosen to clear the WC's transfer
  // rail (which reaches z -6.296) and to leave the knee-clear vanity (z -6.126..-5.466) in the
  // basin vestibule where the room's own entry door lands.
  part(5.83, 5.99, -9.32, -6.36, { tag: '无障碍浴室' });
  part(1.50, 5.99, -6.36, -6.20, { tag: '盥洗前室' });
  plate(2.40, 1.62, -9.335, Math.PI, '无障碍浴室', 'ACCESSIBLE BATH', '无障碍浴室');
  downlight(2.60, -7.90, .045, .26);
  downlight(3.90, -5.72, .045, .26);

  // ================================================================= the housekeeping linen room
  // The fit-out drew this pantry's south and west walls and gave them no colliders, so its own
  // camera could see a linen room the player walked straight through. Jambs bring the trolley
  // door to 1.40 m; the missing east wall closes the room against the service corridor.
  solid(-8.38, -4.90, 9.02, 9.18);
  solid(-3.50, -0.10, 9.02, 9.18);
  face(-5.14, -4.90, 9.00, 9.20, { trim: false, bulk: false });
  face(-3.50, -3.26, 9.00, 9.20, { trim: false, bulk: false });
  opening('x', -4.90, -3.50, 9.00, 9.20, { head: 2.58, tag: '布草间' });
  solid(-8.38, -8.14, 9.02, 15.20);
  face(-8.38, -8.14, 14.05, 14.60);
  part(-0.26, -0.10, 9.02, 14.40, { tag: '布草间' });
  solid(-0.26, -0.10, 14.40, 15.20);
  // A working floor. The pantry stood on raw shell stone (#675e57) — fine while it was an open
  // corner of a 44 m hall lit from every side, black once it has four walls and one bulb. Durable
  // pale tile with a bronze setting-out line, which is what a linen room's floor is.
  flat(-4.20, .019, 11.80, 7.60, 5.10, limestone, { mode: 7, gloss: .16, mat: 'tile', matScale: .52, matAmt: .16, tag: '布草间' });
  flat(-4.20, .024, 11.80, 7.16, 4.66, celadonL, {...MAT.cloth, mode: 7, gloss: .12, tag: '布草间' });
  for (const z of [9.55, 14.05]) flat(-4.20, .028, z, 7.16, .05, A.col.bronze, { gloss: .60, tag: '布草间' });
  downlight(-6.60, 11.60, .05, .32);
  downlight(-2.10, 11.60, .05, .32);
  downlight(-4.20, 13.60, .05, .32);

  // ====================================================== E1: the east wall of the guest floor
  // North of the lift lobby the corridor and the service corridor both stop here. The fit-out's
  // own 员工通道 sign is already mounted on this line at z 5.70 facing the service side, so the
  // staff door goes immediately north of it.
  solid(E1_X0, E1_X1, E2_Z0, E1_D0);
  solid(E1_X0, E1_X1, E1_D1, 15.20);
  part(E1_X0, E1_X1, E2_Z0, 5.01, { stop: false, tag: '员工通道' });       // fit-out owns 5.01..6.39
  part(E1_X0, E1_X1, E1_D1, 14.60, { stop: false, tag: '员工通道' });
  part(E1_X0, E1_X1, E1_D0, E1_D1, { y0: 2.60, y1: WH, stop: false, eye: false, trim: false, tag: '员工通道' });
  part(E1_X0, E1_X1, 5.01, E1_D0, { y0: WH, y1: EYE, stop: false, eye: false, trim: false, bulk: false, tag: '员工通道' });
  opening('z', E1_D0, E1_D1, E1_X0, E1_X1, { head: 2.60, tag: '员工通道' });
  plate(11.57, 1.62, 8.20, Math.PI / 2, '员工通道', 'STAFF', '员工通道');

  // ============================================ E2: the lift landing's north wall, with its gap
  // The shell's floor-directory totem stands at [13.55, 10.55] and is used from [12.0, 10.55], so
  // the service hall behind this wall has to stay walk-in. A 1.60 m opening reads as the landing
  // continuing into back-of-house rather than as a staff door a guest may not use.
  solid(E1_X0, E2_D0, E2_Z0, E2_Z1);
  solid(E2_D1, 17.75, E2_Z0, E2_Z1);
  part(E1_X0, E2_D0, E2_Z0, E2_Z1, { stop: false, tag: '客房服务' });
  part(E2_D1, 17.75, E2_Z0, E2_Z1, { stop: false, tag: '客房服务' });
  part(E2_D0, E2_D1, E2_Z0, E2_Z1, { y0: 2.72, y1: WH, stop: false, eye: false, trim: false, tag: '客房服务' });
  opening('x', E2_D0, E2_D1, E2_Z0, E2_Z1, { head: 2.72, tag: '客房服务' });
  glyphs(13.05, 2.34, E2_Z0 - .02, Math.PI, '客房服务',
    { size: .115, gap: .020, color: A.col.bronzeL, mode: 1, lift: .008, tag: '客房服务' });
  glyphs(13.05, 2.14, E2_Z0 - .02, Math.PI, 'SERVICE',
    { size: .055, gap: .011, color: silkL, mode: 1, lift: .008, tag: '客房服务' });
  for (const z of [4.20, 8.60, 12.60]) downlight(15.20, z, .05, .32);

  // ================================================ the lift landing, and the south-east mass
  // The published landing rect stops at z -7.05, which would stand a wall across the southern
  // car's own portal. The wall goes to z -9.60 instead so all three cars front the landing, and
  // the landing is re-registered below at what was actually built.
  mass(10.42, 21.70, -15.30, LAND_Z0);
  mass(10.42, E1_X1, LAND_Z0, -5.05);
  face(10.47, 17.73, LAND_Z0, LAND_Z1);
  face(E1_X0 + .02, E1_X1, LAND_Z0, -5.04);
  face(10.44, E1_X1, FRONT_Z0, -5.04, { trim: false });    // corridor south wall, run out east
  blindDoor(E1_X1, -7.30, Math.PI / 2, '五零四', '客房');
  blindDoor(13.30, LAND_Z1, 0, '五零五', '客房');
  blindDoor(15.90, LAND_Z1, 0, '五零六', '客房');

  // ------------------------------------------------------------- room directory, and the seam
  // THE BOOKING SEAM, now closed from the stay.js side. `roomNo` is still `level * 100 + i + 1`
  // for i < grade.rooms, but standard.rooms is 7, not 12 (js/stay.js:24) — so the desk can issue
  // 501 to 507 and this plate authors exactly those seven: 501/502/503 are the real rooms,
  // 504–507 the sealed doors above. The former third line advertised 507–512 as an unmodelled
  // west wing to cover the five keys the building did not have; with the grade cut to the door
  // count there is no wing left to explain, and the board is now a literal index of the floor.
  //
  // The invariant that has to hold: standard.rooms === the number of numbered doors on this
  // plate. Change one and change the other, in the same pass, or the desk goes back to issuing
  // keys to nothing.
  {
    const DX = E1_X1, DZ = -5.86, Y = 1.66, F = Math.PI / 2;    // landing's west face, facing +x
    box(DX + .03, Y, DZ, .06, 1.30, 1.44, walnutD, { hard: true, gloss: .32, tag: '客房' });
    box(DX + .07, Y, DZ, .03, 1.10, 1.24, ink, { hard: true, mode: 1, gloss: .34, tag: '客房' });
    glyphs(DX + .095, Y + .40, DZ, F, '客房指引',
      { size: .092, gap: .016, color: A.col.bronzeL, mode: 1, lift: .006, tag: '客房' });
    glyphs(DX + .095, Y + .27, DZ, F, 'GUEST ROOMS',
      { size: .040, gap: .008, color: silkL, mode: 1, lift: .006, tag: '客房' });
    for (const [i, hz, en] of [
      [0, '五零一至五零三', '501 TO 503   WEST'],
      [1, '五零四至五零六', '504 TO 506   LIFT LOBBY'],
      [2, '五零七', '507   WEST STAIR LOBBY'],
    ]) {
      const yy = Y + .08 - i * .21;
      glyphs(DX + .095, yy, DZ + .40, F, hz,
        { size: .058, gap: .010, color: silkL, mode: 1, lift: .006, tag: '客房' });
      glyphs(DX + .095, yy - .085, DZ + .30, F, en,
        { size: .031, gap: .006, color: A.col.bronzeL, mode: 1, lift: .006, tag: '客房' });
    }
  }

  // ====================================================== the east riser zone beyond the lifts
  mass(FAR_X, 21.70, -15.30, 15.30);
  face(FAR_X, FAR_X + .16, E2_Z1, 14.50);

  // ============================================================ bulkheads over the fit-out's own
  // walls. fit5's guestroom fronts, party walls and service wall all stop at 3.16; without a
  // head they are screens with a metre of daylight over the top and every room shares a ceiling.
  const bulk = (x0, x1, z0, z1) => box((x0 + x1) / 2, BULK_Y, (z0 + z1) / 2,
    x1 - x0, BULK_H, z1 - z0, plasterD, { hard: true, gloss: .09, tag: '墙' });
  bulk(-13.80, 10.50, -5.23, -5.07);                        // three guestroom fronts
  for (const x of [-6.28, 1.42, 10.42]) bulk(x, x + .16, -14.50, -5.07);   // party walls
  bulk(-13.90, E1_X1, SERV_Z0, SERV_Z1);                    // service wall
  bulk(-8.30, -0.10, 9.02, 9.18);                           // linen south wall

  // =========================================================================== camera contract
  // Registered smallest-first: hotel.js checks authored rooms before its own hotel5 block, and
  // roomAt() takes the first hit, so a nested volume has to come before the room containing it.
  A.cameraRoom('hotel5-bath503', 1.58, 5.99, -9.32, -6.20, 2.35);
  A.cameraRoom('hotel5-bath503-vestibule', 1.58, 5.99, -6.20, -5.24, 2.30);
  A.cameraRoom('hotel5-linen', -8.14, -0.26, 9.18, 14.60, 2.85);
  // These are the rooms AS BUILT: the party-wall centrelines, so the three rects tile the south
  // range without a seam the camera can fall through. The published rects were drawn against
  // wall faces that the fit-out then built 0.2–0.4 m off.
  A.cameraRoom('hotel5-room501', -14.05, -6.20, -14.55, -5.05, 3.25);
  A.cameraRoom('hotel5-room502', -6.20, 1.50, -14.55, -5.05, 3.25);
  A.cameraRoom('hotel5-room503', 1.50, 10.50, -14.55, -5.05, 3.25);
  A.cameraRoom('hotel5-stair-lobby', SL_X0, W1_X0, SL_Z0, SL_Z1, 2.95);
  A.cameraRoom('hotel5-guest-corridor', W1_X1, E1_X1, -5.18, 5.08, 4.05);
  A.cameraRoom('hotel5-lift-landing', E1_X1, FAR_X, LAND_Z1, E2_Z0, 3.65);
  A.cameraRoom('hotel5-service', W1_X1, E1_X0, SERV_Z1, 14.62, 3.35);
  A.cameraRoom('hotel5-service-hall', E1_X1, FAR_X, E2_Z1, 14.60, 3.35);
});
