// 🏨 京华大酒店 · Floor 10 — the interior architecture
//
// This floor's own module. Registered into HotelFit (declared in js/hotel.js). Nothing else in
// the build writes to this file, and you must not write to anyone else's.
//
// Programme for this level, from HOTEL.md:
//   executive lounge, breakfast, library and business tables
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
//   scene key   hotel10
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
//     node /private/tmp/claude-501/-Users-jonahcollins-Desktop-Chinesegame/a3cc9bcf-53f0-4e3d-a6a3-24cb996ed8a1/scratchpad/floorprobe.js hotel10 -22 22 -15 15 15.6 -3.7
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
//   * `node --check js/hotel-f10.js` after every edit. A backtick inside a template literal
//     ends the string mid-statement; that has broken this project three times.
//
// ---------------------------------------------------------------------------------------------

// THE PLAN AUTHORED HERE
//
// A club floor is supposed to be open, so this is not a corridor with cells hung off it.  It is a
// threshold, an edge and four defined zones:
//
//   x = 11.20   THE RECEPTION THRESHOLD.  A full-height walnut line across the plate that turns
//               the lift bank into an arrival gallery and everything west of it into the club.
//               Three ways through it and no more: a 3.40 m ceremonial portal on the guest spine
//               at z -3.70, a 1.65 m staff opening on the service spine at z 5.10, and nothing
//               else.  The host desk stands inside it.
//   z = 14.1    THE GLAZED EDGE.  The fit-out's skyline runs x -13.5..11.5 and the shell parks a
//               13.2 m sign board in front of the middle of it.  Rather than fight either, the
//               board is framed as the lounge's feature panel between two tall joinery units, and
//               the glass either side of it is given real window bays: piers, a brass sill rail
//               and window seats you can sit in.
//   ZONES       breakfast (walled, two ways in), boardroom (walled, one door), quiet business
//               alcove (screened, open), library (bookcase walls, open south), reading room
//               (walled, one 2.80 m portal), lounge (open, screened from the library), and two
//               back-of-house pantries the guest never sees into.
//
// Every partition below is box + solid + blocker, and every opening is a gap between two solids.
// The flood fill from the lift landing reaches all of it; nothing is stranded.

const Hotel10Fit = Object.freeze({ floor:'hotel10', api:1 });

(() => {
  try {
    Glyphs.need(
      '十楼行政酒廊行政楼层接待台礼宾员工通道会议室阅览室备餐间衣帽间报刊架咖啡' +
      '城市天际京华大酒店早餐图书室商务桌茶台会员服务安全楼梯静音洽谈私人书刊' +
      '藏书角落热茶点心自助餐台电源网络请勿打扰预订清洁布草杯具消毒行李寄存' +
      '晨报晚报期刊阅读灯窗边座位视听幕布长桌客用毛巾水吧调酒瓷器' +
      '凭房卡进入门禁' +
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    );
  } catch (_) {}

  const TAU = Math.PI * 2;
  // Wall geometry constants.  T is the half-thickness the solids use, so the collider and the
  // box that draws it can never drift apart: every wall helper below derives both from these.
  const T = 0.09, WH = 3.58;
  // The shell's inner faces.  Runs stop here rather than at the standable limit so a partition
  // meets the perimeter instead of leaving a lit slot the camera can see daylight through.
  const NX = 21.78, NZ = 14.78;

  function palette(A) {
    return {
      plaster:A.C('#ded6c7'), plasterL:A.C('#ece4d5'), limestone:A.C('#d5cbba'),
      limestoneL:A.C('#ebe2d2'), limestoneD:A.C('#b3a894'),
      walnut:A.C('#46332a'), walnutL:A.C('#77563f'), walnutD:A.C('#2b2320'),
      walnutM:A.C('#5b4132'),
      brass:A.C('#a8813f'), brassL:A.C('#d2ac64'), brassD:A.C('#6a4f28'),
      celadon:A.C('#8ba798'), celadonL:A.C('#c2d1c5'), jade:A.C('#46705f'),
      lacquer:A.C('#8c322b'), ink:A.C('#23262a'), inkL:A.C('#4a5054'),
      silk:A.C('#b39a85'), silkL:A.C('#ded1bf'), silkD:A.C('#8a7460'),
      leather:A.C('#6b4c39'), leatherD:A.C('#3d2b21'),
      carpet:A.C('#54453d'), carpetL:A.C('#7b6759'), carpetD:A.C('#3b312d'),
      glass:A.C('#8fabb4'), glassD:A.C('#26363e'), steel:A.C('#878d8f'),
      white:A.C('#f6f0e5'), paper:A.C('#f1e8d7'), warm:A.C('#ffe3a8'),
      green:A.C('#52705c'), city:A.C('#33434e'), cityL:A.C('#6b828c'),
      night:A.C('#101a22'), tea:A.C('#7a552e'), rose:A.C('#a1655a'),
      blue:A.C('#3b6076'),
    };
  }

  const at = (x, z, yaw, u, v) =>
    [x + Math.cos(yaw) * u + Math.sin(yaw) * v, z - Math.sin(yaw) * u + Math.cos(yaw) * v];
  // Deterministic per-run variation. Books, bottles and crockery want to look counted rather
  // than stamped, and a seeded hash keeps every reload identical.
  const rnd = s => { const v = Math.sin(s * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  // --------------------------------------------------------------------------- partitions
  // A partition is what you SEE plus what STOPS you plus what stops the CAMERA, and all three
  // come from the same numbers.  wallX runs north-south at a given x; wallZ runs east-west at a
  // given z.  Neither takes an opening: a doorway is two calls with a gap between them.
  //
  // TAGS, and why none of the architecture below carries one.  `hiddenProp` (js/game.js) tests a
  // TAGGED prop by the centre of its whole tag group, not by its own position — that is why the
  // shell has to mark its envelope `nocut`, since its four perimeter walls average to (0,0).  On
  // this floor every room name also tags furniture: `行政酒廊` is a sofa field at (3,9), `早餐`
  // is a buffet at (-6,-10), `图书室` is a bookcase at (-10,6).  A 29 m threshold wall that
  // joined any of those groups would be judged several metres from where it stands and would
  // blink in and out of the cutaway.  Untagged props are judged at their own centre, which is
  // the only honest point for a wall, so every helper here drops the tag it is passed.  The
  // argument stays in the signature because it records which room the run belongs to, and the
  // rooms are still pickable through their furniture and signage.
  //
  // RODS.  `capsule` is a limb, not a rail: js/gl.js:1466 builds it hemisphere / cylinder /
  // hemisphere with each cap a QUARTER of `sy` and scaled by `sy`, not `sx`.  A 15 m ladder rail
  // called as a capsule is two 3.8 m cones with a short band between them, and an upright one
  // tapers to a point where it meets the floor.  Every rail, mullion, stem, baluster and leg on
  // this floor is `cyl(x, y, z, r, h, ...)` with r = half the width a capsule would have taken.
  // Capsule survives only for rounded pulls, coat hooks, a lamp elbow and a tap spout.
  //
  // FACING.  `at(x, z, yaw, u, v)` moves +v along (sin yaw, cos yaw), and a glyph quad written
  // at yaw faces (sin yaw, cos yaw) too.  So the visible face of anything — a sign panel, a
  // shelf, a lamp shade on its bracket — goes at POSITIVE v, and joinery is laid out
  // back-to-front: carcass against the wall, lit panel in front of it, shelves in front of that.
  // A negative offset buries the graphic inside its own board, where it survives every prop
  // count and every flood fill and shows up only when you open the render.
  function wallX(A, c, x, z0, z1, tag = '墙', h = WH) {
    if (z1 <= z0) return;
    // Untagged on purpose: see the note on tags at the head of this section. `tag` stays in
    // the signature because it documents which room the run belongs to.
    tag = undefined;

    const d = z1 - z0, zc = (z0 + z1) / 2;
    Build.partition(0, h, (yc, hh, pf) =>
      A.box(x, yc, zc, T * 2, hh, d, c.plaster, { hard:true, mode:14, gloss:.11, tag, ...pf }));
    for (const s of [-1, 1]) {
      A.box(x + s * (T + .014), .155, zc, .028, .31, d, c.walnutD, { hard:true, gloss:.28, tag });
      A.box(x + s * (T + .014), h - .11, zc, .028, .15, d, c.brassD, { hard:true, gloss:.56, tag, partition:true });
    }
    A.solid(x - T, x + T, z0, z1);
    A.blocker(x - T - .02, x + T + .02, z0, z1, h);
  }

  function wallZ(A, c, x0, x1, z, tag = '墙', h = WH) {
    if (x1 <= x0) return;
    // Untagged on purpose: see the note on tags at the head of this section. `tag` stays in
    // the signature because it documents which room the run belongs to.
    tag = undefined;

    const w = x1 - x0, xc = (x0 + x1) / 2;
    Build.partition(0, h, (yc, hh, pf) =>
      A.box(xc, yc, z, w, hh, T * 2, c.plaster, { hard:true, mode:14, gloss:.11, tag, ...pf }));
    for (const s of [-1, 1]) {
      A.box(xc, .155, z + s * (T + .014), w, .31, .028, c.walnutD, { hard:true, gloss:.28, tag });
      A.box(xc, h - .11, z + s * (T + .014), w, .15, .028, c.brassD, { hard:true, gloss:.56, tag, partition:true });
    }
    A.solid(x0, x1, z - T, z + T);
    A.blocker(x0, x1, z - T - .02, z + T + .02, h);
  }

  // Panelled walnut wainscot on one face of a wall, for the rooms a guest actually stands in.
  // `n` is the world-space normal direction (+1 or -1) of the face being dressed.
  function panelX(A, c, x, z0, z1, n, tag, top = 1.12) {
    // Untagged on purpose: see the note on tags at the head of this section. `tag` stays in
    // the signature because it documents which room the run belongs to.
    tag = undefined;

    const fx = x + n * (T + .028);
    const d = z1 - z0, zc = (z0 + z1) / 2;
    A.box(fx, top / 2, zc, .036, top, d, c.walnutM, { hard:true, mode:6, gloss:.30, tag });
    A.box(fx + n * .020, top + .045, zc, .062, .09, d, c.walnut, { hard:true, mode:6, gloss:.32, tag });
    const n2 = Math.max(1, Math.round(d / 1.90));
    for (let i = 0; i < n2; i++) {
      const zz = z0 + (i + .5) * d / n2;
      A.box(fx + n * .014, top / 2, zz, .026, top - .30, d / n2 - .16, c.walnut,
        { hard:true, mode:6, gloss:.33, tag });
    }
  }

  function panelZ(A, c, x0, x1, z, n, tag, top = 1.12) {
    // Untagged on purpose: see the note on tags at the head of this section. `tag` stays in
    // the signature because it documents which room the run belongs to.
    tag = undefined;

    const fz = z + n * (T + .028);
    const w = x1 - x0, xc = (x0 + x1) / 2;
    A.box(xc, top / 2, fz, w, top, .036, c.walnutM, { hard:true, mode:6, gloss:.30, tag });
    A.box(xc, top + .045, fz + n * .020, w, .09, .062, c.walnut, { hard:true, mode:6, gloss:.32, tag });
    const n2 = Math.max(1, Math.round(w / 1.90));
    for (let i = 0; i < n2; i++) {
      const xx = x0 + (i + .5) * w / n2;
      A.box(xx, top / 2, fz + n * .014, w / n2 - .16, top - .30, .026, c.walnut,
        { hard:true, mode:6, gloss:.33, tag });
    }
  }

  // An opening in a wallX: jambs sit OUTSIDE the clear run, so the reveal never eats the
  // doorway the flood fill measured.  No solid anywhere in here — the gap between the two wall
  // solids is the door.
  function portalX(A, c, x, z0, z1, hz, en, accent, head = 3.02, tag = hz) {
    // Untagged on purpose: see the note on tags at the head of this section. `tag` stays in
    // the signature because it documents which room the run belongs to.
    tag = undefined;

    const w = z1 - z0, zc = (z0 + z1) / 2;
    for (const s of [-1, 1]) {
      const zj = s < 0 ? z0 - .09 : z1 + .09;
      A.box(x, head / 2, zj, .48, head, .18, c.walnut, { hard:true, mode:6, gloss:.31, tag });
      A.cyl(x - .25, head / 2, zj + s * .085, .012, head - .26, c.brassL,
        { gloss:.68, tag });
      A.box(x, .115, zj, .56, .23, .27, c.brassD, { hard:true, gloss:.58, tag });
    }
    A.box(x, head + .30, zc, .48, .60, w + .18, c.walnut, { hard:true, mode:6, gloss:.31, tag });
    // A head lower than the wall leaves a slot of nothing above it. Fill it back in with the
    // same plaster the wall is made of, and the opening reads as a door rather than a gap.
    const over = WH - (head + .60);
    if (over > .02)
      A.box(x, head + .60 + over / 2, zc, T * 2, over, w, c.plaster,
        { hard:true, mode:14, gloss:.11, tag });
    for (const s of [-1, 1]) {
      A.luminous(A.box(x + s * .245, head + .30, zc, .028, .34, w - .34, accent,
        { hard:true, mode:1, tag }), .025, .13);
      const yaw = s < 0 ? -Math.PI / 2 : Math.PI / 2;
      A.glyphs(x + s * .268, head + .38, zc, yaw, hz,
        { size:Math.min(.19, (w - .60) / Math.max(2, [...hz].length)), gap:.028, color:c.white,
          mode:1, glow:.035, lift:.007, tag });
      if (en && s > 0) A.glyphs(x + s * .268, head + .09, zc, yaw, en,
        { size:Math.min(.062, (w - .50) / Math.max(2, en.length)), gap:.012, color:c.brassL,
          mode:1, lift:.007, tag });
    }
    A.box(x, .022, zc, .44, .044, w, c.brassD, { hard:true, gloss:.62, tag });
  }

  // The same, for an opening in a wallZ.
  function portalZ(A, c, x0, x1, z, hz, en, accent, head = 3.02, tag = hz) {
    // Untagged on purpose: see the note on tags at the head of this section. `tag` stays in
    // the signature because it documents which room the run belongs to.
    tag = undefined;

    const w = x1 - x0, xc = (x0 + x1) / 2;
    for (const s of [-1, 1]) {
      const xj = s < 0 ? x0 - .09 : x1 + .09;
      A.box(xj, head / 2, z, .18, head, .48, c.walnut, { hard:true, mode:6, gloss:.31, tag });
      A.cyl(xj + s * .085, head / 2, z - .25, .012, head - .26, c.brassL,
        { gloss:.68, tag });
      A.box(xj, .115, z, .27, .23, .56, c.brassD, { hard:true, gloss:.58, tag });
    }
    A.box(xc, head + .30, z, w + .18, .60, .48, c.walnut, { hard:true, mode:6, gloss:.31, tag });
    const over = WH - (head + .60);
    if (over > .02)
      A.box(xc, head + .60 + over / 2, z, w, over, T * 2, c.plaster,
        { hard:true, mode:14, gloss:.11, tag });
    for (const s of [-1, 1]) {
      A.luminous(A.box(xc, head + .30, z + s * .245, w - .34, .34, .028, accent,
        { hard:true, mode:1, tag }), .025, .13);
      const yaw = s < 0 ? Math.PI : 0;
      A.glyphs(xc, head + .38, z + s * .268, yaw, hz,
        { size:Math.min(.19, (w - .60) / Math.max(2, [...hz].length)), gap:.028, color:c.white,
          mode:1, glow:.035, lift:.007, tag });
      if (en && s > 0) A.glyphs(xc, head + .09, z + s * .268, yaw, en,
        { size:Math.min(.062, (w - .50) / Math.max(2, en.length)), gap:.012, color:c.brassL,
          mode:1, lift:.007, tag });
    }
    A.box(xc, .022, z, w, .044, .44, c.brassD, { hard:true, gloss:.62, tag });
  }

  // A leaf parked flat against the wall beside its own opening.  Back-of-house doors read as
  // doors this way without ever owning a collider that could seal a pantry.
  function parkedLeaf(A, c, x, z, yaw, w, tag) {
    const p = at(x, z, yaw, 0, 0);
    A.box(p[0], 1.44, p[1], w, 2.66, .075, c.walnut, { ry:yaw, mode:6, gloss:.33, tag });
    const f = at(x, z, yaw, 0, .055);
    A.box(f[0], 1.46, f[1], w - .18, 2.40, .022, c.walnutD, { hard:true, ry:yaw, gloss:.30, tag });
    const h = at(x, z, yaw, w * .34, .075);
    A.capsule(h[0], 1.06, h[1], .022, .34, .022, c.brassL, { ry:yaw, gloss:.70, tag });
  }

  // --------------------------------------------------------------------------- ceiling
  // Zones on a club floor are made overhead as much as in plan.  A raft drops the ceiling,
  // takes the light out of the general field and gives a zone a lid without a single wall.
  function raft(A, c, x, z, w, d, tag = '天花', accent) {
    // Untagged on purpose: see the note on tags at the head of this section. `tag` stays in
    // the signature because it documents which room the run belongs to.
    tag = undefined;

    const y = A.H - .30;
    A.box(x, y, z, w, .17, d, c.walnutL, { hard:true, mode:6, gloss:.28, tag });
    for (const p of [A.box(x, y - .105, z, w - .36, .030, d - .36, accent || c.warm,
      { hard:true, mode:1, gloss:.08, tag })]) A.luminous(p, .032, .19);
    for (const s of [-1, 1])
      A.cyl(x + s * (w / 2 - .24), y - .13, z, .010, d - .60, c.brass,
        { rx:Math.PI / 2, gloss:.66, tag });
  }

  // A shallow coffer field, for a long run where a single raft would read as a lid.
  function coffers(A, c, x0, x1, z, d, n, tag = '天花') {
    // Untagged on purpose: see the note on tags at the head of this section. `tag` stays in
    // the signature because it documents which room the run belongs to.
    tag = undefined;

    const y = A.H - .26, w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const xc = x0 + (i + .5) * w;
      A.box(xc, y, z, w - .16, .14, d, c.walnutL, { hard:true, mode:6, gloss:.27, tag });
      A.luminous(A.box(xc, y - .085, z, w - .58, .026, d - .42, c.warm,
        { hard:true, mode:1, tag }), .030, .17);
    }
    for (const s of [-1, 1])
      A.cyl((x0 + x1) / 2, y - .10, z + s * (d / 2 + .05), .011, x1 - x0, c.brass,
        { rz:Math.PI / 2, gloss:.66, tag });
  }

  function pendant(A, c, x, z, drop = 1.05, scale = 1, tag = '吊灯') {
    const y = A.H - .18;
    A.cyl(x, y - .06, z, .085 * scale, .09, c.walnutD, { gloss:.30, tag });
    A.cyl(x, y - drop / 2, z, .008 * scale, drop, c.brass, { gloss:.68, tag });
    A.cyl(x, y - drop, z, .21 * scale, .015, c.brassD, { gloss:.62, tag });
    A.taper(x, y - drop - .13 * scale, z, .40 * scale, .27 * scale, .40 * scale, c.brass,
      { gloss:.60, tag });
    A.luminous(A.ball(x, y - drop - .21 * scale, z, .10 * scale, .075 * scale, .10 * scale,
      c.warm, { mode:1, tag }), .05, .32);
  }

  function sconce(A, c, x, y, z, yaw, tag = '壁灯') {
    const b = at(x, z, yaw, 0, 0);
    A.box(b[0], y, b[1], .10, .40, .22, c.walnutD, { hard:true, ry:yaw, mode:6, gloss:.30, tag });
    const a = at(x, z, yaw, 0, .11);
    A.capsule(a[0], y, a[1], .020, .16, .020, c.brass, { rx:Math.PI / 2, ry:yaw, gloss:.68, tag });
    const s = at(x, z, yaw, 0, .22);
    A.taper(s[0], y, s[1], .19, .26, .19, c.silkL, { mode:7, gloss:.05, tag });
    A.luminous(A.ball(s[0], y, s[1], .075, .095, .075, c.warm, { mode:1, tag }), .06, .30);
  }

  // --------------------------------------------------------------------------- joinery
  // Books are the floor's material.  A run is a carcass, real shelves and BLOCKS of spines
  // rather than individual volumes: three to five books per box keeps a 10 m wall of books at a
  // couple of hundred props instead of a couple of thousand, and reads identically at any
  // distance a player stands.
  function bookBlocks(A, c, x0, x1, y, faceAxis, face, seed, tag, deep = .19) {
    const pal = [c.lacquer, c.jade, c.walnutM, c.silkL, c.blue, c.brassD, c.leather, c.celadon];
    let u = x0 + .05;
    let k = seed;
    while (u < x1 - .38) {
      k++;
      const w = .48 + rnd(k) * .40, hh = .21 + rnd(k * 3.1) * .09;
      if (u + w > x1 - .05) break;
      const col = pal[Math.floor(rnd(k * 7.3) * pal.length)];
      const lean = rnd(k * 11.9) < .12 ? .16 : 0;
      if (faceAxis === 'x')
        A.box(face, y + hh / 2, u + w / 2, deep, hh, w, col,
          { hard:true, rx:lean, gloss:.16, tag });
      else
        A.box(u + w / 2, y + hh / 2, face, w, hh, deep, col,
          { hard:true, rz:lean, gloss:.16, tag });
      u += w + .012;
    }
  }

  // A bookcase standing along z at x, its spines facing `n` (+1 => east).
  function bookWallX(A, c, x, z0, z1, n, h, seed, tag, shelves = 4) {
    const d = z1 - z0, zc = (z0 + z1) / 2, deep = .34;
    A.box(x, h / 2, zc, deep, h, d, c.walnutD, { hard:true, mode:6, gloss:.29, tag });
    A.box(x - n * .015, .105, zc, deep, .21, d, c.walnut, { hard:true, mode:6, gloss:.31, tag });
    A.box(x - n * .015, h + .075, zc, deep + .06, .15, d + .06, c.walnut,
      { hard:true, mode:6, gloss:.32, tag });
    const y0 = .26, step = (h - .46) / shelves;
    for (let i = 0; i < shelves; i++) {
      const y = y0 + i * step;
      A.box(x + n * .045, y - .022, zc, .25, .044, d - .08, c.walnutL,
        { hard:true, mode:6, gloss:.30, tag });
      A.cyl(x + n * .175, y - .020, zc, .006, d - .16, c.brass,
        { rx:Math.PI / 2, gloss:.68, tag });
      bookBlocks(A, c, z0 + .06, z1 - .06, y, 'x', x + n * .055, seed + i * 37, tag);
    }
    for (let i = 0; i <= Math.max(1, Math.round(d / 3.6)); i++) {
      const z = z0 + i * d / Math.max(1, Math.round(d / 3.6));
      A.box(x + n * .010, h / 2, z, .30, h - .12, .055, c.walnut, { hard:true, mode:6, gloss:.31, tag });
    }
  }

  // The same run laid along x at z.
  function bookWallZ(A, c, z, x0, x1, n, h, seed, tag, shelves = 4) {
    const w = x1 - x0, xc = (x0 + x1) / 2, deep = .34;
    A.box(xc, h / 2, z, w, h, deep, c.walnutD, { hard:true, mode:6, gloss:.29, tag });
    A.box(xc, .105, z - n * .015, w, .21, deep, c.walnut, { hard:true, mode:6, gloss:.31, tag });
    A.box(xc, h + .075, z - n * .015, w + .06, .15, deep + .06, c.walnut,
      { hard:true, mode:6, gloss:.32, tag });
    const y0 = .26, step = (h - .46) / shelves;
    for (let i = 0; i < shelves; i++) {
      const y = y0 + i * step;
      A.box(xc, y - .022, z + n * .045, w - .08, .044, .25, c.walnutL,
        { hard:true, mode:6, gloss:.30, tag });
      A.cyl(xc, y - .020, z + n * .175, .006, w - .16, c.brass,
        { rz:Math.PI / 2, gloss:.68, tag });
      bookBlocks(A, c, x0 + .06, x1 - .06, y, 'z', z + n * .055, seed + i * 53, tag);
    }
    const cols = Math.max(1, Math.round(w / 3.6));
    for (let i = 0; i <= cols; i++)
      A.box(x0 + i * w / cols, h / 2, z - n * .010, .055, h - .12, .30, c.walnut,
        { hard:true, mode:6, gloss:.31, tag });
  }

  // --------------------------------------------------------------------------- seating
  function clubChair(A, c, x, z, yaw, tag, hide = c.leather) {
    A.B.modelOr('arm_chair_01', x, 0, z, 1, { ry:yaw, tag, gloss:.22 }, () => {
      const p = (u, v) => at(x, z, yaw, u, v);
      A.box(x, .34, z, .60, .10, .58, c.walnutD, { ry:yaw, gloss:.28, tag });
      A.box(x, .45, z, .68, .17, .66, hide, { ry:yaw, mode:7, gloss:.09, tag });
      const b = p(0, -.29);
      A.box(b[0], .79, b[1], .70, .70, .13, c.walnutD, { ry:yaw, gloss:.29, tag });
      A.box(b[0] + Math.sin(yaw) * .05, .81, b[1] + Math.cos(yaw) * .05, .56, .56, .07, hide,
        { ry:yaw, mode:7, gloss:.09, tag });
      for (const s of [-1, 1]) {
        const a = p(s * .33, -.02);
        A.box(a[0], .64, a[1], .11, .30, .56, c.walnut, { ry:yaw, mode:7, gloss:.30, tag });
      }
      for (const sx of [-1, 1]) {
        const l = p(sx * .25, 0);
        A.cyl(l[0], .13, l[1], .017, .54, c.brassD, { rx:Math.PI / 2, gloss:.54, tag });
      }
      const cr = p(0, -.35);
      A.cyl(cr[0], 1.13, cr[1], .013, .60, c.brassL, { rz:Math.PI / 2, ry:yaw, gloss:.70, tag });
    });
    A.shade(x, z, .80, .80, .18);
  }

  function boardChair(A, c, x, z, yaw, tag, hide) {
    const p = (u, v) => at(x, z, yaw, u, v);
    A.box(x, .45, z, .52, .10, .50, hide, { ry:yaw, mode:7, gloss:.10, tag });
    const b = p(0, -.24);
    A.box(b[0], .78, b[1], .50, .62, .09, hide, { ry:yaw, mode:7, gloss:.10, tag });
    A.box(b[0] - Math.sin(yaw) * .05, .78, b[1] - Math.cos(yaw) * .05, .54, .66, .05, c.walnutD,
      { hard:true, ry:yaw, gloss:.30, tag });
    A.cyl(x, .22, z, .025, .44, c.brassD, { gloss:.56, tag });
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * TAU + yaw;
      A.cyl(x + Math.sin(a) * .22, .045, z + Math.cos(a) * .22, .015, .38, c.brassD,
        { rz:Math.sin(a) * .30, rx:-Math.cos(a) * .30, gloss:.56, tag });
    }
    A.shade(x, z, .62, .62, .16);
  }

  // A window seat: the piece that makes a glazed edge somewhere you go rather than something
  // you look at.  Plinth, cushion, bolsters and a brass rail behind.
  function windowSeat(A, c, x0, x1, z, tag) {
    const w = x1 - x0, xc = (x0 + x1) / 2;
    A.box(xc, .105, z, w, .21, .62, c.walnutD, { hard:true, mode:6, gloss:.28, tag });
    A.box(xc, .32, z, w - .06, .24, .66, c.walnut, { hard:true, mode:6, gloss:.31, tag });
    A.box(xc, .47, z, w - .10, .13, .62, c.silkL, { mode:7, gloss:.03, tag });
    const n = Math.max(2, Math.round(w / 1.55));
    for (let i = 0; i < n; i++)
      A.box(x0 + (i + .5) * w / n, .70, z + .21, w / n - .16, .34, .16, i % 2 ? c.celadon : c.silk,
        { mode:7, gloss:.03, tag });
    for (let i = 0; i <= n; i++)
      A.box(x0 + i * w / n, .30, z, .055, .40, .68, c.walnutD, { hard:true, mode:6, gloss:.30, tag });
    A.solid(x0, x1, z - .34, z + .34);
    A.shade(xc, z, w, .80, .16);
  }

  function sideTable(A, c, x, z, r, tag, top) {
    A.cyl(x, .48, z, r, .055, top || c.limestone, { gloss:.24, tag });
    A.cyl(x, .445, z, r - .02, .030, c.walnutD, { gloss:.30, tag });
    A.cyl(x, .23, z, .0225, .44, c.brassD, { gloss:.58, tag });
    A.cyl(x, .022, z, r * .62, .044, c.brassD, { gloss:.60, tag });
    A.shade(x, z, r * 2.4, r * 2.4, .16);
  }

  function floorLamp(A, c, x, z, tag = '阅读灯') {
    A.cyl(x, .028, z, .17, .056, c.brassD, { gloss:.60, tag });
    A.cyl(x, .78, z, .011, 1.50, c.brass, { gloss:.68, tag });
    A.capsule(x, 1.52, z, .020, .30, .020, c.brass, { rz:-.75, gloss:.68, tag });
    A.taper(x - .19, 1.60, z, .26, .22, .26, c.silkL, { mode:7, gloss:.05, tag });
    A.luminous(A.ball(x - .19, 1.56, z, .085, .075, .085, c.warm, { mode:1, tag }), .05, .30);
  }

  function planter(A, c, x, z, s = 1, tag = '绿化') {
    A.cyl(x, .045, z, .30 * s, .09, c.brassD, { gloss:.56, tag });
    A.taper(x, .30 * s, z, .60 * s, .48 * s, .60 * s, c.limestoneD, { gloss:.20, tag });
    A.box(x, .55 * s, z, .52 * s, .06, .52 * s, c.walnutD, { hard:true, gloss:.26, tag });
    A.cyl(x, .95 * s, z, .017 * s, .82 * s, c.walnutM, { gloss:.28, tag });
    for (const [dx, dy, dz, r] of [[-.24, 1.32, .04, .30], [.22, 1.40, -.05, .27],
      [.02, 1.58, .06, .24], [-.08, 1.20, -.22, .22]])
      A.ball(x + dx * s, dy * s, z + dz * s, r * s, r * .74 * s, r * .84 * s, c.green,
        { mode:15, gloss:.09, tag });
  }

  // --------------------------------------------------------------------------- graphics
  function plaque(A, c, x, y, z, yaw, hz, en, w, accent) {
    A.box(x, y, z, w, .52, .07, c.walnut, { hard:true, ry:yaw, mode:6, gloss:.32, tag:hz });
    // Positive v is the way the board faces, and a glyph quad at yaw faces the same way. A
    // negative offset here put every plaque's lettering behind its own backboard.
    const f = at(x, z, yaw, 0, .045);
    A.luminous(A.box(f[0], y, f[1], w - .10, .42, .022, accent,
      { hard:true, ry:yaw, mode:1, tag:hz }), .020, .11);
    const g = at(x, z, yaw, 0, .070);
    A.glyphs(g[0], y + .07, g[1], yaw, hz,
      { size:Math.min(.145, (w - .30) / Math.max(2, [...hz].length)), gap:.024, color:c.white,
        mode:1, glow:.03, lift:.005, tag:hz });
    if (en) A.glyphs(g[0], y - .13, g[1], yaw, en,
      { size:Math.min(.055, (w - .26) / Math.max(2, en.length)), gap:.011, color:c.brassL,
        mode:1, lift:.005, tag:hz });
  }

  // A framed ink-wash panel: hills, a river reach, a seal.  Cheap, and it gives every long wall
  // on this floor something to terminate on.
  function inkPanel(A, c, x, y, z, yaw, w, h, seed, tag = '水墨') {
    const f = (u, v) => at(x, z, yaw, u, v);
    A.box(x, y, z, w, h, .09, c.walnut, { hard:true, ry:yaw, mode:6, gloss:.33, tag });
    const p0 = f(0, .058);
    A.box(p0[0], y, p0[1], w - .16, h - .16, .022, c.paper, { hard:true, ry:yaw, mode:1, gloss:.05, tag });
    for (let i = 0; i < 3; i++) {
      const u = -w * .28 + i * w * .27, sc = .5 + rnd(seed + i) * .55;
      const p = f(u, .082);
      A.ball(p[0], y - h * .10 + sc * h * .06, p[1], w * .16 * sc, h * .17 * sc, .012,
        i % 2 ? c.celadon : c.cityL, { ry:yaw, mode:1, alpha:.999, gloss:.03, tag });
    }
    for (const [u, dy, ww, hh, cc] of [[-w * .12, -h * .30, w * .46, .016, c.inkL],
      [w * .16, -h * .36, w * .32, .012, c.cityL]]) {
      const p = f(u, .094);
      A.box(p[0], y + dy, p[1], ww, hh, .012, cc, { hard:true, ry:yaw, mode:1, gloss:.03, tag });
    }
    const tw = f(-w * .26, .098);
    A.box(tw[0], y - h * .06, tw[1], .045, h * .34, .012, c.ink, { hard:true, ry:yaw, mode:1, tag });
    for (let i = 0; i < 2; i++) {
      const e = f(-w * .26, .104);
      A.box(e[0], y - h * .20 + i * h * .17, e[1], w * .13 - i * .016, .024, .012, c.ink,
        { hard:true, ry:yaw, mode:1, tag });
    }
    const sl = f(w * .34, .104);
    A.box(sl[0], y - h * .30, sl[1], .11, .11, .012, c.lacquer,
      { hard:true, ry:yaw, mode:1, glow:.02, tag });
  }

  // ============================================================================ the plan
  function buildPlan(A, c) {
    // Camera rooms, smallest authored volume FIRST so a nested one wins the lookup.  These do
    // not move a single collider; they only tell the chase camera how much room it has.
    A.cameraRoom('hotel10-pantry-club',    14.64, 21.35,   8.24, 14.35, 2.55);
    A.cameraRoom('hotel10-pantry-service',-21.35,-18.08, -14.35,-10.29, 2.45);
    A.cameraRoom('hotel10-boardroom',       1.19, 11.11, -14.35, -8.64, 3.20);
    A.cameraRoom('hotel10-business-alcove', 1.19, 11.11,  -8.46, -5.15, 3.10);
    A.cameraRoom('hotel10-breakfast',     -13.36,  1.01, -14.35, -5.24, 4.20);
    A.cameraRoom('hotel10-service-hall',  -21.35,-13.54, -14.35, -5.24, 3.30);
    A.cameraRoom('hotel10-reading',       -21.35,-10.42,   2.49, 14.35, 5.00);
    A.cameraRoom('hotel10-library',       -10.45, -1.85,  -2.30, 14.35, 5.00);
    A.cameraRoom('hotel10-lounge',         -1.75, 11.11,   3.40, 14.35, 7.40);
    A.cameraRoom('hotel10-club-gallery',  -14.20, 11.11,  -5.15,  3.40, 4.40);
    A.cameraRoom('hotel10-lift-landing',   11.29, 17.85,  -9.95,  8.06, 6.50);

    // ---------------------------------------------------------------- THE RECEPTION THRESHOLD
    // One line at x 11.20 with exactly three states: wall, ceremonial portal on the guest spine,
    // staff opening on the service spine.  This is what makes an open-plan club floor private.
    wallX(A, c, 11.20, -NZ, -5.40, '行政酒廊');
    portalX(A, c, 11.20, -5.40, -2.00, '行政酒廊', 'EXECUTIVE CLUB', c.lacquer, 3.02);
    wallX(A, c, 11.20, -2.00, 4.30, '行政酒廊');
    portalX(A, c, 11.20, 4.30, 5.95, '员工通道', 'STAFF', c.jade, 2.70);
    wallX(A, c, 11.20, 5.95, NZ, '行政酒廊');
    panelX(A, c, 11.20, -5.40, -2.00, -1, '行政酒廊', 1.16);
    panelX(A, c, 11.20, -2.00, 4.30, -1, '行政酒廊', 1.16);
    panelX(A, c, 11.20, -9.60, -5.40, 1, '行政酒廊', 1.16);
    panelX(A, c, 11.20, -2.00, 4.30, 1, '行政酒廊', 1.16);

    // ---------------------------------------------------------------- BREAKFAST enclosure
    // The fit-out already built the north wall (z -5.15, x -13.4..1.0) with its own 1.40 m door
    // at x -7.4.  These are the two returns it never had, so the room has corners.
    wallX(A, c, 1.10, -NZ, -5.07, '早餐');
    post(A, 1.06, -5.15, c.plaster, '早餐');
    wallX(A, c, -13.45, -NZ, -9.30, '早餐');
    portalX(A, c, -13.45, -9.30, -5.15, '早餐', 'BREAKFAST', c.celadon, 3.02);

    // ---------------------------------------------------------------- BOARDROOM
    wallZ(A, c, 1.19, 4.10, -8.55, '会议室');
    wallZ(A, c, 5.25, 6.60, -8.55, '会议室');
    wallZ(A, c, 9.40, 11.11, -8.55, '会议室');
    portalZ(A, c, 4.10, 5.25, -8.55, '会议室', 'BOARD ROOM', c.lacquer, 2.86);
    panelZ(A, c, 1.19, 4.10, -8.55, 1, '会议室', 1.16);
    // A glazed screen rather than more plaster, so the alcove has something worth seeing through
    // and the board room is not a sealed box.  Two translucent panes, and two is the whole cost.
    glazedScreenZ(A, c, 6.60, 9.40, -8.55, '会议室');
    panelZ(A, c, 9.40, 11.11, -8.55, 1, '会议室', 1.16);

    // ---------------------------------------------------------------- SERVICE HALL and stair
    // The fire stair keeps a door of its own rather than opening straight into the club.
    wallZ(A, c, -NX, -17.20, -5.15, '安全楼梯');
    wallZ(A, c, -15.80, -13.54, -5.15, '安全楼梯');
    portalZ(A, c, -17.20, -15.80, -5.15, '安全楼梯', 'FIRE STAIR', c.lacquer, 2.86);

    // ---------------------------------------------------------------- BACK-OF-HOUSE pantries
    wallZ(A, c, -NX, -20.30, -10.20, '备餐间');
    wallZ(A, c, -19.25, -17.99, -10.20, '备餐间');
    portalZ(A, c, -20.30, -19.25, -10.20, '备餐间', 'PANTRY', c.jade, 2.62);
    wallX(A, c, -17.99, -NZ, -10.11, '备餐间');
    parkedLeaf(A, c, -18.80, -10.42, 0, .96, '备餐间');

    wallX(A, c, 14.55, 8.06, NZ, '备餐间');
    wallZ(A, c, 14.46, 15.55, 8.15, '备餐间');
    wallZ(A, c, 16.60, NX, 8.15, '备餐间');
    portalZ(A, c, 15.55, 16.60, 8.15, '备餐间', 'PANTRY', c.jade, 2.62);
    parkedLeaf(A, c, 17.14, 8.42, 0, .96, '备餐间');

    // ---------------------------------------------------------------- READING ROOM
    wallZ(A, c, -NX, -17.60, 2.40, '阅览室');
    wallZ(A, c, -14.80, -10.20, 2.40, '阅览室');
    portalZ(A, c, -17.60, -14.80, 2.40, '阅览室', 'READING ROOM', c.celadon, 3.02);
    panelZ(A, c, -NX, -17.60, 2.40, -1, '阅览室', 1.16);
    panelZ(A, c, -14.80, -10.20, 2.40, -1, '阅览室', 1.16);

    // ---------------------------------------------------------------- LIBRARY spine
    // The fit-out's 15.8 m bookcase at x -10.2 was drawn but never collided: the player walked
    // through a wall of books.  Give it its collider, close its north end and the library and
    // the reading room become two rooms sharing one piece of joinery.
    A.solid(-10.42, -9.98, -2.20, 13.60);
    A.blocker(-10.44, -9.96, -2.20, 13.60, 3.42);
    A.box(-10.20, 3.50, 5.70, .52, .17, 15.86, c.walnut, { hard:true, mode:6, gloss:.32, tag:'图书室' });
    A.box(-10.20, .11, 5.70, .50, .22, 15.86, c.walnut, { hard:true, mode:6, gloss:.31, tag:'图书室' });
    bookWallX(A, c, -10.20, 13.60, NZ, 1, 3.34, 611, '图书室', 3);
    A.solid(-10.42, -9.98, 13.60, NZ);
    A.blocker(-10.44, -9.96, 13.60, NZ, 3.42);

    // ---------------------------------------------------------------- the ink screen
    // A freestanding club screen closing the west end of the gallery.  The fit-out already hung
    // a 3.4 m ink painting on thin air at x -14.0 facing east; this is the wall it wanted.
    A.box(-14.10, WH / 2, -3.52, .30, WH, 3.85, c.plaster, { hard:true, mode:14, gloss:.11, tag:'京城水墨' });
    A.box(-14.10, .16, -3.52, .38, .32, 3.93, c.limestone, { hard:true, gloss:.20, tag:'京城水墨' });
    A.box(-14.10, WH - .09, -3.52, .40, .18, 3.97, c.brassD, { hard:true, gloss:.58, tag:'京城水墨' });
    for (const z of [-5.42, -1.63])
      A.cyl(-14.10, WH / 2, z, .017, WH - .30, c.brassL, { gloss:.68, tag:'京城水墨' });
    A.solid(-14.25, -13.95, -5.45, -1.60);
    A.blocker(-14.27, -13.93, -5.45, -1.60, 3.60);
    inkPanel(A, c, -14.27, 1.98, -3.52, -Math.PI / 2, 3.10, 1.66, 91, '京城水墨');
    sconce(A, c, -14.28, 2.42, -5.05, -Math.PI / 2, '京城水墨');

    // ---------------------------------------------------------------- library / lounge screen
    // Waist-and-shoulder joinery, not a wall: it divides two zones you can see across, and it
    // gets a collider because a bookcase is a real barrier.  Two ways round it.
    for (const [z0, z1, sd] of [[2.00, 7.10, 221], [8.60, 13.45, 337]]) {
      const zc = (z0 + z1) / 2, d = z1 - z0;
      A.box(-1.90, .095, zc, .72, .19, d, c.walnutD, { hard:true, mode:6, gloss:.28, tag:'图书室' });
      A.box(-1.90, .96, zc, .34, 1.55, d, c.walnut, { hard:true, mode:6, gloss:.31, tag:'图书室' });
      A.box(-1.90, 1.79, zc, .76, .12, d + .06, c.walnutL, { hard:true, mode:6, gloss:.30, tag:'图书室' });
      // Shelves stand PROUD of the carcass on both faces. Sunk inside it they were invisible,
      // which is the same fault as a sign written on the back of its own board.
      for (const n of [-1, 1]) for (let i = 0; i < 2; i++) {
        const y = .52 + i * .60;
        A.box(-1.90 + n * .22, y - .020, zc, .22, .040, d - .10, c.walnutL,
          { hard:true, mode:6, gloss:.30, tag:'图书室' });
        if (n < 0) bookBlocks(A, c, z0 + .08, z1 - .08, y, 'x', -1.90 + n * .24, sd + i * 41,
          '图书室', .17);
        else for (let k = 0; k < 3; k++)
          A.taper(-1.90 + n * .24, y + .13, z0 + (k + .5) * d / 3, .19, .26, .19,
            k % 2 ? c.celadon : c.jade, { gloss:.30, tag:'瓷器' });
      }
      const posts = Math.max(1, Math.round(d / 2.6));
      for (let i = 0; i <= posts; i++) {
        const zz = z0 + i * d / posts;
        A.box(-1.90, 1.02, zz, .68, 1.66, .075, c.walnutD, { hard:true, mode:6, gloss:.31, tag:'图书室' });
        A.cyl(-1.90, 2.02, zz, .013, .44, c.brass, { gloss:.68, tag:'图书室' });
      }
      A.cyl(-1.90, 1.88, zc, .011, d, c.brassL, { rx:Math.PI / 2, gloss:.70, tag:'图书室' });
      A.solid(-2.07, -1.73, z0, z1);
      A.blocker(-2.09, -1.71, z0, z1, 2.30);
    }

    // ---------------------------------------------------------------- furniture that is a wall
    // The buffet counter and the club credenza were drawn without colliders, so guests walked
    // through 9 m of stone.  These are the only two pieces of the existing fit-out given one:
    // both are freestanding in open floor, so neither can strand anything behind it.
    A.solid(-10.62, -1.78, -12.32, -11.10);
    A.blocker(-10.64, -1.76, -12.34, -11.08, 1.30);
    A.solid(8.00, 10.00, 5.86, 6.64);
    A.blocker(7.98, 10.02, 5.84, 6.66, 1.20);
  }

  // Full-height glazing set in a bronze frame, running along x at z.  Opaque frame, opaque
  // spandrels, and exactly two translucent leaves for the whole screen: alpha < 0.999 does not
  // batch, so every extra pane is another draw call for the same piece of architecture.
  function glazedScreenZ(A, c, x0, x1, z, tag) {
    // Untagged on purpose: see the note on tags at the head of this section. `tag` stays in
    // the signature because it documents which room the run belongs to.
    tag = undefined;

    const w = x1 - x0, xc = (x0 + x1) / 2;
    A.box(xc, .34, z, w, .68, T * 2, c.walnut, { hard:true, mode:6, gloss:.31, tag });
    A.box(xc, WH - .28, z, w, .56, T * 2, c.plaster, { hard:true, mode:14, gloss:.11, tag });
    for (const s of [-1, 1]) {
      A.box(x0 + (s < 0 ? .07 : w - .07), 1.66, z, .14, 2.06, .22, c.walnutD,
        { hard:true, mode:6, gloss:.30, tag });
      A.box(xc, .155, z + s * (T + .014), w, .31, .028, c.walnutD, { hard:true, gloss:.28, tag });
      A.box(xc, WH - .11, z + s * (T + .014), w, .15, .028, c.brassD, { hard:true, gloss:.56, tag });
    }
    A.box(xc, 1.66, z, w - .28, .07, .17, c.brass, { hard:true, gloss:.66, tag });
    A.box(xc, 2.70, z, w - .28, .06, .17, c.brass, { hard:true, gloss:.66, tag });
    A.box(xc, .70, z, w - .28, .06, .17, c.brass, { hard:true, gloss:.66, tag });
    for (let i = 1; i < Math.round(w / .70); i++)
      A.cyl(x0 + i * w / Math.round(w / .70), 1.66, z, .010, 1.94, c.brassL,
        { gloss:.70, tag });
    for (const [yy, hh] of [[1.18, .90], [2.18, .98]])
      A.box(xc, yy, z, w - .20, hh, .022, c.glass,
        { hard:true, mode:1, alpha:.34, gloss:.80, tag });
    A.solid(x0, x1, z - T, z + T);
    A.blocker(x0, x1, z - T - .02, z + T + .02, WH);
  }

  // A short corner post, for where one of our walls meets a wall we do not own.  It carries no
  // solid: the two wall runs it joins already own the collision on both sides of it.
  function post(A, x, z, colour, tag) {
    tag = undefined;
    A.box(x, WH / 2, z, .30, WH, .30, colour, { hard:true, mode:14, gloss:.11, tag });
    A.box(x, WH - .10, z, .34, .16, .34, colour, { hard:true, gloss:.30, tag });
  }

  // ============================================================================ arrival
  // East of the threshold. This was 9 m of undivided plate in front of the lift bank; it is now
  // a lift lobby with a cloakroom, a bench and something to look at while the car comes.
  function buildArrival(A, c) {
    A.flat(14.6, .013, -1.30, 6.30, 17.6, c.limestone,
      { mode:7, gloss:.17, tag:'电梯' });
    A.flat(14.6, .015, -1.30, 5.90, 17.2, c.limestoneL, { mode:7, gloss:.15, tag:'电梯' });
    for (const z of [-9.95, 7.35])
      A.flat(14.6, .019, z, 5.90, .055, c.brass, { gloss:.64, tag:'电梯' });

    // Cloakroom and luggage bay, recessed into the threshold wall's east face.
    const CZ = -7.55;
    // Built as a real niche — back panel, lined return, two side cheeks and a head — because a
    // single carcass box would have swallowed every coat and case hung inside it.
    A.box(11.66, 1.28, CZ, .14, 2.56, 2.10, c.walnut, { hard:true, mode:6, gloss:.31, tag:'衣帽间' });
    A.box(11.75, 1.32, CZ, .045, 2.28, 1.88, c.walnutD, { hard:true, gloss:.24, tag:'衣帽间' });
    for (const s2 of [-1, 1])
      A.box(12.02, 1.28, CZ + s2 * 1.02, .72, 2.56, .14, c.walnut,
        { hard:true, mode:6, gloss:.31, tag:'衣帽间' });
    A.box(12.02, 2.64, CZ, .72, .16, 2.10, c.walnut, { hard:true, mode:6, gloss:.32, tag:'衣帽间' });
    A.box(12.02, .08, CZ, .78, .16, 2.16, c.brassD, { hard:true, gloss:.58, tag:'衣帽间' });
    A.cyl(11.98, 1.86, CZ, .011, 1.76, c.brassL, { rx:Math.PI / 2, gloss:.70, tag:'衣帽间' });
    for (let i = 0; i < 6; i++) {
      const z = CZ - .78 + i * .31;
      A.box(12.06, 1.44, z, .30, .74, .055,
        [c.ink, c.walnutM, c.silkD, c.blue, c.leather][i % 5], { mode:7, gloss:.05, tag:'衣帽间' });
      A.capsule(11.98, 1.83, z, .010, .12, .010, c.brassL, { gloss:.70, tag:'衣帽间' });
    }
    A.box(11.98, .74, CZ, .58, .05, 1.86, c.walnutL, { hard:true, mode:6, gloss:.30, tag:'衣帽间' });
    for (let i = 0; i < 3; i++) {
      const z = CZ - .62 + i * .62;
      A.box(12.02, .95, z, .46, .34, .50, i ? c.leatherD : c.walnutM,
        { mode:7, gloss:.12, tag:'衣帽间' });
      A.capsule(12.02, 1.14, z, .014, .26, .014, c.brassL, { rz:Math.PI / 2, gloss:.70, tag:'衣帽间' });
    }
    A.luminous(A.box(11.98, 2.52, CZ, .34, .026, 1.80, c.warm,
      { hard:true, mode:1, tag:'衣帽间' }), .035, .20);
    A.solid(11.29, 12.42, CZ - 1.10, CZ + 1.10);
    A.blocker(11.29, 12.44, CZ - 1.12, CZ + 1.12, 2.72);
    plaque(A, c, 12.42, 2.86, CZ, Math.PI / 2, '衣帽间', 'CLOAKROOM', 1.55, c.jade);

    // A stone bench and planters make the wait for the car a place rather than a corridor.
    A.box(12.30, .21, 2.30, .60, .42, 2.20, c.limestone, { hard:true, gloss:.22, tag:'电梯' });
    A.box(12.30, .45, 2.30, .66, .12, 2.26, c.limestoneL, { hard:true, gloss:.26, tag:'电梯' });
    A.box(12.30, .53, 2.30, .54, .07, 2.06, c.leather, { mode:7, gloss:.10, tag:'电梯' });
    A.solid(11.95, 12.62, 1.18, 3.42);
    A.shade(12.30, 2.30, .90, 2.5, .18);
    planter(A, c, 12.55, -4.65, .92, '绿化');
    planter(A, c, 12.55, -2.75, .92, '绿化');
    sconce(A, c, 11.42, 2.28, -1.10, Math.PI / 2, '电梯');
    pendant(A, c, 13.60, -5.90, .95, 1.0, '吊灯');
    pendant(A, c, 13.60, 3.30, .95, 1.0, '吊灯');
    A.light(13.2, 2.90, -3.70, [1, .84, .60], .40, 7.6);

    A.thing('衣帽间', 12.42, 1.40, CZ, '行政楼层的衣帽间可以寄存大衣和随身行李。',
      'The executive floor cloakroom takes coats and hand luggage.',
      '衣帽间 is a cloakroom; 行李寄存 is left luggage.',
      { tag:'衣帽间', focus:[13.10, CZ], reach:2.1 });
  }

  // ============================================================================ the access gate
  //
  // H258. `HOTEL_LOUNGE = { floor:'hotel10', minLevel:9 }` has been sitting in js/data.js:3030
  // since H146, and grepping the whole tree for it returns the declaration and the export and
  // nothing else — the rule that the club belongs to 行政套房 and 京华套房 was real in the data and
  // completely invisible in the building. This is the rule standing in the portal.
  //
  // A rope and a reader, not a leaf, and that is a deliberate choice rather than a shortcut. A shut
  // door the player walks straight through is the exact defect HOTEL-TENANT.md's collider section
  // is about, and a door that actually STOPS an unqualified guest would seal the only guest route
  // off the lift landing onto this floor — the thing the same page says strands a player on a level
  // they cannot leave. A hip-height rope across a club entrance is what a hotel executive lounge
  // physically has, it is honest about being a courtesy barrier, and both of its states read from
  // six metres: hooked across with a red reader, or unclipped and hanging with a green one.
  //
  // The hard refusal — a lounge that will not serve you — is `js/stay.js` and `js/game.js`, which
  // this lane does not own. Reported, not reached into.
  const GATE_HIDE = M.trs(0, -70, 0, 0, .001, .001, .001);
  function buildAccessGate(A, c) {
    const GX = 11.62, Z0 = -4.95, Z1 = -2.45, ROPE_Y = .95;
    for (const z of [Z0, Z1]) {
      A.cyl(GX, .035, z, .21, .07, c.brassD, { gloss:.58, tag:'门禁' });
      A.cyl(GX, .10, z, .15, .06, c.brass, { gloss:.66, tag:'门禁' });
      A.cyl(GX, .55, z, .034, .90, c.brass, { gloss:.68, tag:'门禁' });
      A.ball(GX, 1.03, z, .058, .075, .058, c.brassL, { gloss:.72, tag:'门禁' });
      A.cyl(GX, .96, z, .050, .05, c.brassD, { gloss:.60, tag:'门禁' });
    }
    // Two states of one rope. Hooked: two slightly dipped runs meeting in the middle. Unclipped:
    // a short fall hanging from the north post. Exactly one of them is ever up.
    const hooked = [], loose = [];
    const mid = (Z0 + Z1) / 2;
    // rx, not rz. A capsule's long axis is y by default; rz turns it along x and rx along z —
    // js/hotel-f10.js:1127's ladder rail is the worked example of a run along z. The rope spans
    // between two posts that differ in z, so it is an rx rotation, and the length argument is the
    // FULL span rather than a half-length.
    for (const [za, zb, dy] of [[Z0, mid, -.045], [mid, Z1, -.045]])
      hooked.push(A.capsule(GX, ROPE_Y + dy, (za + zb) / 2, .026, Math.abs(zb - za), .026,
        c.lacquer, { rx:Math.PI / 2, mode:7, gloss:.05, tag:'门禁' }));
    hooked.push(A.ball(GX, ROPE_Y - .10, mid, .045, .075, .045, c.brassL, { gloss:.70, tag:'门禁' }));
    loose.push(A.capsule(GX, .60, Z0 + .10, .026, .74, .026, c.lacquer,
      { mode:7, gloss:.05, tag:'门禁' }));
    loose.push(A.ball(GX, .24, Z0 + .10, .045, .075, .045, c.brassL, { gloss:.70, tag:'门禁' }));
    for (const p of [...hooked, ...loose]) { p.fixed = true; p.cx = GX; p.cy = 1.0; p.cz = mid; p.r = 3.4; }
    const hookedM = hooked.map(p => p.m), looseM = loose.map(p => p.m);

    // The reader, on the lift side of the line where a guest meets it first.
    A.box(GX + .52, .48, Z0 - .62, .30, .96, .30, c.walnutD, { hard:true, mode:6, gloss:.30, tag:'门禁' });
    A.box(GX + .52, .06, Z0 - .62, .40, .12, .40, c.brassD, { hard:true, gloss:.58, tag:'门禁' });
    A.box(GX + .52, 1.00, Z0 - .62, .34, .07, .34, c.limestoneL, { hard:true, gloss:.24, tag:'门禁' });
    const lamp = A.luminous(A.box(GX + .52, 1.05, Z0 - .62, .17, .022, .17, c.lacquer,
      { hard:true, mode:1, tag:'门禁' }), .10, .30);
    A.cyl(GX + .52, 1.06, Z0 - .62, .055, .026, c.brassL, { gloss:.72, tag:'门禁' });
    plaque(A, c, GX + .06, 2.06, Z1 + .34, -Math.PI / 2, '凭房卡进入', 'KEY CARD REQUIRED', 1.55, c.lacquer);

    // Entitlement, read lazily. Stay.key() is a floor and a room number and nothing else, so the
    // grade level comes from Stay.GRADES by floor — which is what makes this a property of the room
    // that was bought (H146) rather than a flag somebody can set. Everything is guarded: the floor
    // builds in harnesses that have no js/stay.js at all, and there it stands open.
    const entitled = () => {
      try {
        if (typeof Stay === 'undefined' || !Stay.key) return true;
        const k = Stay.key();
        if (!k || k.lost) return false;
        const min = (typeof HOTEL_LOUNGE !== 'undefined' && HOTEL_LOUNGE.minLevel) || 9;
        const g = (Stay.GRADES || []).find(q => q.floor === k.floor);
        return !!g && g.level >= min;
      } catch (_) { return true; }
    };
    let toldAt = -99, was = null;
    A.onTick((t, body) => {
      const bx = body && Number.isFinite(body.x) ? body.x : 99;
      const bz = body && Number.isFinite(body.z) ? body.z : 99;
      const near = Math.hypot(bx - GX, bz - mid) < 3.0;
      const open = near && entitled();
      if (!near) toldAt = -99;
      else if (!open && t - toldAt > 8 && typeof say === 'function') {
        toldAt = t;
        say('行政酒廊只对行政套房和京华套房开放。',
            'The executive lounge is for junior and signature suites only.');
      }
      if (open === was) return;                    // two matrix writes a shift, not per frame
      was = open;
      for (let i = 0; i < hooked.length; i++) hooked[i].m = open ? GATE_HIDE : hookedM[i];
      for (let i = 0; i < loose.length; i++) loose[i].m = open ? looseM[i] : GATE_HIDE;
      lamp.color = open ? c.jade : c.lacquer;
    });
    for (const p of loose) p.m = GATE_HIDE;        // hooked across until somebody walks up to it

    A.thing('门禁', GX + .52, 1.24, Z0 - .62, '行政楼层门禁：行政套房和京华套房的房卡才刷得开。',
      'Executive floor access: only junior-suite and signature-suite key cards open it.',
      '门禁 is access control; 房卡 is a room key card.',
      { tag:'门禁', focus:[GX + 1.15, Z0 - .62], reach:2.0 });
  }

  // ============================================================================ club gallery
  // The spine from the portal west to the ink screen, plus the quiet business alcove hung off
  // its south side. The alcove is screened, not walled: that is the difference between a club
  // and an office.
  function buildGallery(A, c) {
    coffers(A, c, -13.20, 10.40, -3.65, 2.55, 6, '天花');
    A.flat(-1.40, .026, -3.65, 24.0, 2.86, c.carpetL, { mode:7, gloss:.03, tag:'行政酒廊' });
    A.flat(-1.40, .029, -3.65, 23.4, 2.28, c.carpet, { mode:7, gloss:.03, tag:'行政酒廊' });
    for (const z of [-4.79, -2.51])
      A.flat(-1.40, .031, z, 23.4, .045, c.brass, { gloss:.62, tag:'行政酒廊' });

    // Host desk, inside the threshold and facing whoever comes through it.
    const DX = 9.45, DZ = -.95;
    A.box(DX, .09, DZ, 2.30, .18, .96, c.walnutD, { hard:true, mode:6, gloss:.27, tag:'接待台' });
    A.box(DX, .53, DZ, 2.42, .82, 1.02, c.walnut, { hard:true, mode:6, gloss:.33, tag:'接待台' });
    A.box(DX, .97, DZ, 2.60, .07, 1.16, c.limestoneL, { hard:true, gloss:.26, tag:'接待台' });
    A.box(DX - .06, .55, DZ - .54, 2.10, .70, .030, c.brass, { hard:true, gloss:.66, tag:'接待台' });
    for (const s of [-1, 1])
      A.cyl(DX + s * 1.14, .53, DZ, .013, .78, c.brassL, { gloss:.70, tag:'接待台' });
    A.box(DX + .55, 1.03, DZ + .10, .40, .045, .30, c.ink, { hard:true, gloss:.38, tag:'接待台' });
    A.box(DX - .62, 1.06, DZ + .06, .28, .10, .22, c.paper, { mode:7, gloss:.06, tag:'接待台' });
    A.cyl(DX - .18, 1.06, DZ + .18, .085, .11, c.celadonL, { gloss:.30, tag:'接待台' });
    A.solid(8.20, 10.70, -1.54, -.36);
    A.blocker(8.18, 10.72, -1.56, -.34, 1.15);
    A.shade(DX, DZ, 2.7, 1.3, .18);
    plaque(A, c, 11.06, 2.30, -.95, -Math.PI / 2, '接待台', 'RECEPTION', 1.65, c.brass);
    inkPanel(A, c, 11.06, 2.06, 2.60, -Math.PI / 2, 2.30, 1.30, 209, '京城水墨');
    sconce(A, c, 11.06, 2.46, -3.95, -Math.PI / 2, '行政酒廊');
    floorLamp(A, c, 10.55, -2.35, '阅读灯');

    A.thing('接待台', 10.05, 1.10, DZ, '行政楼层接待台办理登记、预订和会议室安排。',
      'The executive floor desk handles check-in, reservations and the board room.',
      '接待台 is a reception desk; 预订 means to book.',
      { tag:'接待台', focus:[8.60, -2.55], reach:2.2 });

    // ---- quiet business alcove: four screened two-person tables under a dropped ceiling.
    A.flat(6.15, .022, -6.80, 9.70, 3.10, c.carpetD, { mode:7, gloss:.03, tag:'洽谈室' });
    A.flat(6.15, .026, -6.80, 9.20, 2.62, c.carpet, { mode:7, gloss:.03, tag:'洽谈室' });
    raft(A, c, 6.15, -6.90, 9.30, 2.50, '天花');
    for (let i = 0; i < 3; i++) {
      const x = [2.35, 7.40, 9.85][i];
      // Back-to-back banquette against the boardroom wall, with a shoulder-height screen
      // between each pair. Screens get a solid; they are a metre of real joinery.
      A.box(x, .11, -7.70, 1.86, .22, .70, c.walnutD, { hard:true, mode:6, gloss:.28, tag:'洽谈室' });
      A.box(x, .34, -7.70, 1.94, .28, .74, c.walnut, { hard:true, mode:6, gloss:.31, tag:'洽谈室' });
      A.box(x, .50, -7.70, 1.82, .10, .66, c.leather, { mode:7, gloss:.10, tag:'洽谈室' });
      A.box(x, .88, -7.98, 1.90, .82, .16, c.leather, { mode:7, gloss:.10, tag:'洽谈室' });
      A.cyl(x, 1.30, -8.02, .013, 1.80, c.brassL, { rz:Math.PI / 2, gloss:.70, tag:'洽谈室' });
      A.box(x, .70, -6.80, 1.24, .07, 1.10, c.walnut, { hard:true, mode:6, gloss:.33, tag:'洽谈室' });
      A.box(x, .66, -6.80, 1.12, .05, .98, c.walnutD, { hard:true, gloss:.30, tag:'洽谈室' });
      A.cyl(x, .36, -6.80, .024, .62, c.brassD, { gloss:.58, tag:'洽谈室' });
      A.cyl(x, .028, -6.80, .30, .056, c.brassD, { gloss:.58, tag:'洽谈室' });
      A.cyl(x + .38, .745, -6.80, .055, .022, c.brassD, { gloss:.64, tag:'洽谈室' });
      clubChair(A, c, x, -5.92, Math.PI, '洽谈室', c.silkD);
      A.solid(x - 1.00, x + 1.00, -8.10, -7.34);
      A.shade(x, -6.80, 1.5, 1.4, .16);
      const sx = [3.60, 8.62, null][i];
      if (sx !== null) {
        A.box(sx, .95, -6.95, .085, 1.68, 1.90, c.walnutD, { hard:true, mode:6, gloss:.30, tag:'洽谈室' });
        A.box(sx, 1.62, -6.95, .12, .10, 1.98, c.walnutL, { hard:true, mode:6, gloss:.30, tag:'洽谈室' });
        for (let k = 0; k < 4; k++)
          A.box(sx, .68 + k * .30, -6.95, .11, .045, 1.74, c.brassD,
            { hard:true, gloss:.58, tag:'洽谈室' });
        A.solid(sx - .05, sx + .05, -7.90, -6.00);
      }
      if (i !== 2) pendant(A, c, x, -6.80, .78, .88, '吊灯');
    }
    plaque(A, c, 6.15, 2.30, -8.42, 0, '洽谈室', 'QUIET TABLES', 2.10, c.jade);
    A.light(6.15, 2.60, -6.90, [1, .84, .60], .34, 6.4);
    A.thing('洽谈室', 6.15, 1.10, -6.10, '这些商务桌背对早餐厅，谈话不会被听见。',
      'These business tables back onto the breakfast room, out of earshot.',
      '洽谈 means to talk business.', { tag:'洽谈室', focus:[6.15, -5.60], reach:2.2 });
  }

  // ============================================================================ breakfast
  // The fit-out gave this room a buffet, three tables and a wall. What it never had was a back
  // of house, an east side, or anything to look at from the buffet camera.
  function buildBreakfast(A, c) {
    A.flat(-6.20, .019, -9.55, 14.9, 9.40, c.walnutD, { mode:7, gloss:.14, tag:'早餐' });
    raft(A, c, -6.50, -7.65, 11.4, 3.40, '天花');
    for (const x of [-9.30, -3.70]) pendant(A, c, x, -7.75, 1.00, 1.05, '吊灯');

    // ---- servery back-bar along the south wall. This is the whole background of HT10-breakfast.
    const BZ = -14.30;
    A.box(-5.60, 1.32, BZ, 13.10, 2.64, .56, c.walnut, { hard:true, mode:6, gloss:.31, tag:'早餐台' });
    A.box(-5.60, .10, BZ + .06, 13.10, .20, .62, c.walnutD, { hard:true, mode:6, gloss:.28, tag:'早餐台' });
    A.box(-5.60, 2.74, BZ + .04, 13.30, .18, .68, c.brassD, { hard:true, gloss:.58, tag:'早餐台' });
    A.box(-5.75, .92, BZ + .57, 12.70, .10, .62, c.limestoneL, { hard:true, gloss:.26, tag:'早餐台' });
    A.box(-5.75, .48, BZ + .55, 12.60, .78, .52, c.walnutM, { hard:true, mode:6, gloss:.30, tag:'早餐台' });
    for (let i = 0; i < 7; i++) {
      const x = -11.30 + i * 1.96;
      A.box(x, .48, BZ + .82, 1.70, .62, .030, c.walnutD, { hard:true, gloss:.29, tag:'早餐台' });
      // Glazed warming cabinets, alternating with open crockery shelves.
      if (i % 3 === 1) {
        A.box(x, 1.52, BZ + .28, 1.10, 1.02, .06, c.walnutD, { hard:true, gloss:.30, tag:'早餐台' });
        A.luminous(A.box(x, 1.52, BZ + .33, .94, .86, .022, c.warm,
          { hard:true, mode:1, gloss:.20, tag:'早餐台' }), .05, .22);
        for (let k = 0; k < 2; k++)
          A.cyl(x - .28 + k * .48, 1.045, BZ + .55, .11, .10, c.celadonL, { gloss:.30, tag:'瓷器' });
      } else {
        for (let s = 0; s < 2; s++) {
          const y = 1.20 + s * .62;
          A.box(x, y, BZ + .30, 1.66, .045, .40, c.walnutL, { hard:true, mode:6, gloss:.30, tag:'早餐台' });
          for (let k = 0; k < 3; k++)
            A.cyl(x - .48 + k * .48, y + .10, BZ + .30, .085, .15,
              (k + s) % 2 ? c.white : c.celadonL, { gloss:.32, tag:'瓷器' });
        }
      }
    }
    A.cyl(-5.60, 2.60, BZ + .30, .013, 12.70, c.brass, { rz:Math.PI / 2, gloss:.68, tag:'早餐台' });
    for (const x of [-9.34, -1.50]) sconce(A, c, x, 2.28, BZ + .32, 0, '早餐台');
    plaque(A, c, -5.60, 2.98, BZ + .34, 0, '行政早餐台', 'BREAKFAST SERVERY', 3.10, c.jade);
    A.solid(-12.16, 1.01, -14.62, -13.42);
    A.blocker(-12.18, 1.03, -14.64, -13.40, 2.90);
    A.light(-6.30, 2.35, -13.05, [1, .82, .56], .40, 7.0);

    // ---- banquette along the east wall, so the room has a side to sit at as well as a middle.
    for (let i = 0; i < 3; i++) {
      const z = -12.40 + i * 2.35;
      A.box(.62, .11, z, .78, .22, 2.00, c.walnutD, { hard:true, mode:6, gloss:.28, tag:'早餐' });
      A.box(.62, .36, z, .84, .30, 2.06, c.walnut, { hard:true, mode:6, gloss:.31, tag:'早餐' });
      A.box(.62, .53, z, .74, .10, 1.94, c.silkL, { mode:7, gloss:.03, tag:'早餐' });
      A.box(.90, .92, z, .18, .84, 2.00, c.celadon, { mode:7, gloss:.03, tag:'早餐' });
      A.cyl(.86, 1.38, z, .013, 1.94, c.brassL, { rx:Math.PI / 2, gloss:.70, tag:'早餐' });
      A.box(-.42, .70, z, 1.02, .07, .96, c.walnut, { hard:true, mode:6, gloss:.33, tag:'早餐' });
      A.cyl(-.42, .36, z, .023, .62, c.brassD, { gloss:.58, tag:'早餐' });
      A.cyl(-.42, .028, z, .28, .056, c.brassD, { gloss:.58, tag:'早餐' });
      clubChair(A, c, -1.28, z, -Math.PI / 2, '椅子', c.silkD);
      A.solid(.24, 1.02, z - 1.05, z + 1.05);
      A.shade(0, z, 2.2, 2.2, .16);
    }
    // A lantern wall of celadon panels: an internal room needs its own light source to look at.
    for (let i = 0; i < 4; i++) {
      const z = -12.60 + i * 2.30;
      A.box(1.00, 2.26, z, .09, 1.50, 1.36, c.walnutD, { hard:true, mode:6, gloss:.30, tag:'早餐' });
      A.luminous(A.box(.930, 2.26, z, .026, 1.26, 1.14, c.celadonL,
        { hard:true, mode:1, gloss:.12, tag:'早餐' }), .045, .24);
      for (const q of [-1, 1])
        A.cyl(.910, 2.26, z + q * .58, .010, 1.32, c.brass, { gloss:.68, tag:'早餐' });
    }
    A.light(.30, 2.40, -9.40, [.86, 1, .92], .30, 6.2);

    A.thing('早餐台', -6.30, 1.30, -13.35, '备餐台后面是行政楼层的早餐厨房和保温柜。',
      'Behind the servery are the executive floor breakfast kitchen and warming cabinets.',
      '早餐台 is a breakfast servery.', { tag:'早餐台', focus:[-6.30, -12.60], reach:2.2 });
  }

  // ============================================================================ board room
  function buildBoardroom(A, c) {
    A.flat(6.15, .020, -11.50, 9.60, 5.40, c.walnutD, { mode:7, gloss:.13, tag:'会议室' });
    A.flat(6.15, .024, -11.50, 9.00, 4.86, c.carpetD, { mode:7, gloss:.03, tag:'会议室' });
    raft(A, c, 6.15, -11.55, 7.60, 3.00, '天花');
    for (const x of [4.55, 7.75]) pendant(A, c, x, -11.55, .96, 1.02, '吊灯');
    A.light(6.15, 2.70, -11.55, [1, .85, .62], .46, 7.2);

    // ---- the table. One slab, two trestle bases, a brass inlay and a row of power grommets.
    A.box(6.15, .715, -11.55, 6.40, .09, 1.52, c.walnut, { hard:true, mode:6, gloss:.36, tag:'会议室' });
    A.box(6.15, .655, -11.55, 6.20, .07, 1.34, c.walnutD, { hard:true, mode:6, gloss:.31, tag:'会议室' });
    A.box(6.15, .755, -11.55, 5.40, .012, .70, c.leatherD, { mode:7, gloss:.14, tag:'会议室' });
    A.cyl(6.15, .762, -12.31, .010, 6.20, c.brassL, { rz:Math.PI / 2, gloss:.70, tag:'会议室' });
    A.cyl(6.15, .762, -10.79, .010, 6.20, c.brassL, { rz:Math.PI / 2, gloss:.70, tag:'会议室' });
    for (const s of [-1, 1]) {
      A.box(6.15 + s * 2.05, .33, -11.55, .22, .68, 1.16, c.walnutD, { hard:true, mode:6, gloss:.30, tag:'会议室' });
      A.box(6.15 + s * 2.05, .055, -11.55, .48, .11, 1.34, c.brassD, { hard:true, gloss:.58, tag:'会议室' });
    }
    for (const x of [4.35, 6.15, 7.95])
      A.cyl(x, .762, -11.55, .060, .022, c.brassD, { gloss:.64, tag:'电源' });
    A.solid(2.85, 9.45, -12.40, -10.70);
    A.shade(6.15, -11.55, 7.0, 2.4, .20);
    for (let i = 0; i < 3; i++) {
      boardChair(A, c, 4.35 + i * 1.80, -12.72, 0, '会议椅', c.leather);
      boardChair(A, c, 4.35 + i * 1.80, -10.38, Math.PI, '会议椅', c.leather);
    }
    boardChair(A, c, 2.55, -11.55, -Math.PI / 2, '会议椅', c.leather);
    boardChair(A, c, 9.75, -11.55, Math.PI / 2, '会议椅', c.leather);
    for (let i = 0; i < 2; i++) {
      const x = 4.90 + i * 2.50;
      A.box(x, .775, -12.10, .21, .015, .30, c.paper, { mode:7, gloss:.05, tag:'会议室' });
      A.cyl(x + .20, .80, -12.06, .036, .075, c.celadonL, { gloss:.32, tag:'杯具' });
      A.box(x, .775, -11.00, .21, .015, .30, c.paper, { mode:7, gloss:.05, tag:'会议室' });
      A.cyl(x + .20, .80, -11.04, .036, .075, c.celadonL, { gloss:.32, tag:'杯具' });
    }

    // ---- credenza and screen. The east wall is the presenting wall, facing the long table.
    A.box(6.15, .10, -13.82, 5.40, .20, .52, c.walnutD, { hard:true, mode:6, gloss:.28, tag:'会议室' });
    A.box(6.15, .43, -13.82, 5.56, .50, .58, c.walnut, { hard:true, mode:6, gloss:.32, tag:'会议室' });
    A.box(6.15, .71, -13.82, 5.70, .07, .66, c.limestoneL, { hard:true, gloss:.25, tag:'会议室' });
    for (let i = 0; i < 3; i++) {
      A.box(4.35 + i * 1.80, .43, -13.52, 1.64, .38, .028, c.walnutD, { hard:true, gloss:.30, tag:'会议室' });
      A.capsule(4.35 + i * 1.80, .43, -13.49, .018, .34, .018, c.brassL, { rz:Math.PI / 2, gloss:.70, tag:'会议室' });
    }
    A.solid(3.30, 9.00, -14.15, -13.50);
    A.cyl(4.30, .82, -13.82, .13, .16, c.celadon, { gloss:.32, tag:'热茶' });
    A.cyl(8.00, .80, -13.82, .16, .11, c.limestone, { gloss:.22, tag:'点心' });
    for (let i = 0; i < 3; i++)
      A.ball(7.72 + i * .28, .90, -13.88, .055, .045, .055,
        i % 2 ? c.rose : c.tea, { mode:7, gloss:.14, tag:'点心' });
    const scr = A.box(11.02, 1.86, -11.55, .07, 1.42, 2.46, c.ink,
      { hard:true, mode:1, glow:.05, gloss:.40, tag:'视听' });
    A.box(11.09, 1.86, -11.55, .06, 1.58, 2.62, c.walnutD, { hard:true, mode:6, gloss:.32, tag:'视听' });
    A.cyl(11.00, 1.86, -12.82, .010, 1.50, c.brassL, { gloss:.70, tag:'视听' });
    A.cyl(11.00, 1.86, -10.28, .010, 1.50, c.brassL, { gloss:.70, tag:'视听' });
    inkPanel(A, c, 1.28, 2.00, -11.55, Math.PI / 2, 2.60, 1.40, 47, '京城水墨');
    sconce(A, c, 1.30, 2.34, -13.30, Math.PI / 2, '会议室');
    sconce(A, c, 1.30, 2.34, -9.70, Math.PI / 2, '会议室');
    plaque(A, c, 6.15, 2.28, -8.68, Math.PI, '会议室', 'BOARD ROOM', 1.90, c.lacquer);

    A.thing('会议室', 6.15, 1.10, -10.30, '行政会议室可以预订，配屏幕、电源和茶点服务。',
      'The executive board room can be booked, with a screen, power and tea service.',
      '会议室 is a meeting room; 预订 means to book it.',
      { tag:'会议室', focus:[6.15, -9.60], reach:2.3 });
    A.onTick((t) => {
      // The screen wakes in office hours and sleeps at night: a lit rectangle in a dark room is
      // the one thing that makes an empty board room look booked.
      const on = Math.sin(t * .21) > -.4;
      scr.glow = on ? .075 + .02 * Math.sin(t * .9) : .006;
      scr.color = on ? (Math.sin(t * .13) > 0 ? c.blue : c.jade) : c.ink;
    });
  }

  // ============================================================================ library
  function buildLibrary(A, c) {
    A.flat(-6.00, .019, 5.60, 7.60, 16.0, c.walnutD, { mode:7, gloss:.13, tag:'图书室' });
    A.flat(-6.00, .023, 5.60, 7.10, 15.4, c.carpet, { mode:7, gloss:.03, tag:'图书室' });
    raft(A, c, -5.70, 5.75, 4.60, 12.6, '天花');
    for (const z of [1.10, 4.20, 7.30, 10.40]) {
      if (z === 1.10 || z === 7.30) pendant(A, c, -5.70, z + 1.55, .92, .95, '吊灯');
      // The four business tables were drawn without colliders. They are freestanding in a 2.4 m
      // aisle on both sides, so a collider here cannot pinch the route to anything.
      A.solid(-7.60, -3.80, z - .42, z + .42);
      A.shade(-5.70, z, 4.1, 1.1, .18);
    }
    A.light(-5.70, 2.70, 5.70, [1, .85, .62], .42, 8.0);

    for (let i = 0; i < 5; i++)
      A.box(-9.82, .75 + i * .39 - .148, 5.70, .34, .038, 15.76, c.walnutL,
        { hard:true, mode:6, gloss:.30, tag:'图书室' });
    for (let i = 0; i <= 5; i++)
      A.box(-9.84, 1.52, -2.16 + i * 3.15, .30, 2.86, .055, c.walnut,
        { hard:true, mode:6, gloss:.31, tag:'图书室' });

    // A rolling ladder on the bookcase rail: the one prop that says this wall is used.
    A.cyl(-9.86, 2.42, 5.70, .011, 15.4, c.brass, { rx:Math.PI / 2, gloss:.70, tag:'图书室' });
    for (const s of [-1, 1])
      A.cyl(-9.72, 1.36 + s * 1.06, 8.90, .015, 2.56, c.brass, { rx:.09, gloss:.66, tag:'图书室' });
    for (let i = 0; i < 7; i++)
      A.box(-9.72, .34 + i * .34, 8.90 - .03 * i, .10, .036, .48, c.walnutL,
        { hard:true, mode:6, gloss:.30, tag:'图书室' });
    A.cyl(-9.72, .05, 8.62, .075, .07, c.brassD, { rx:Math.PI / 2, gloss:.58, tag:'图书室' });
    A.cyl(-9.72, .05, 9.18, .075, .07, c.brassD, { rx:Math.PI / 2, gloss:.58, tag:'图书室' });

    // Atlas table at the library's south end, where the gallery hands you over to the books.
    A.box(-6.60, .70, -.90, 2.30, .09, 1.10, c.walnut, { hard:true, mode:6, gloss:.35, tag:'长桌' });
    A.box(-6.60, .64, -.90, 2.14, .07, .96, c.walnutD, { hard:true, mode:6, gloss:.31, tag:'长桌' });
    for (const s of [-1, 1]) {
      A.box(-6.60 + s * .86, .33, -.90, .16, .62, .84, c.walnutD, { hard:true, mode:6, gloss:.30, tag:'长桌' });
      A.box(-6.60 + s * .86, .055, -.90, .38, .11, .98, c.brassD, { hard:true, gloss:.58, tag:'长桌' });
    }
    A.box(-6.90, .762, -.90, .58, .045, .42, c.paper, { hard:true, mode:7, gloss:.06, tag:'期刊' });
    A.box(-6.10, .757, -1.02, .40, .035, .30, c.celadonL, { hard:true, mode:7, gloss:.06, tag:'期刊' });
    A.solid(-7.60, -5.60, -1.50, -.30);
    A.shade(-6.60, -.90, 2.6, 1.4, .18);
    clubChair(A, c, -6.60, .20, Math.PI, '阅读椅', c.silkD);
    floorLamp(A, c, -8.10, -.60, '阅读灯');

    // Periodicals stand against the bookcase, and a pair of reading chairs at the window end.
    A.box(-9.40, .58, 2.10, .48, 1.16, 1.30, c.walnut, { hard:true, mode:6, gloss:.32, tag:'报刊架' });
    A.box(-9.40, 1.18, 2.10, .54, .07, 1.36, c.limestoneL, { hard:true, gloss:.25, tag:'报刊架' });
    for (let i = 0; i < 3; i++) {
      A.box(-9.12, .34 + i * .36, 2.10, .26, .030, 1.14, c.walnutL,
        { hard:true, mode:6, gloss:.30, tag:'报刊架', rx:.20 });
      A.box(-9.10, .42 + i * .36, 2.10, .22, .022, .92, i % 2 ? c.paper : c.silkL,
        { hard:true, mode:7, gloss:.05, tag:'期刊', rx:.20 });
    }
    A.solid(-9.68, -9.10, 1.42, 2.78);
    plaque(A, c, -9.10, 1.72, 2.10, Math.PI / 2, '报刊架', 'PRESS', 1.20, c.jade);

    clubChair(A, c, -8.55, 12.55, .55, '阅读椅', c.leather);
    clubChair(A, c, -6.95, 12.55, -.55, '阅读椅', c.leather);
    sideTable(A, c, -7.75, 12.90, .34, '茶几', c.limestoneL);
    floorLamp(A, c, -9.10, 13.40, '阅读灯');
    A.flat(-7.75, .017, 12.70, 4.20, 3.00, c.carpetL, { mode:7, gloss:.03, tag:'图书室' });

    A.thing('长桌', -6.60, 1.00, -.30, '长桌上摊着北京城市地图和当日报刊。',
      'The long table carries Beijing city maps and the day papers.',
      '长桌 is a long table; 期刊 are periodicals.',
      { tag:'长桌', focus:[-6.60, .40], reach:2.0 });
  }

  // ============================================================================ reading room
  // The largest single room on the plate and the one the old plan had no idea what to do with.
  // One 2.80 m portal, a wall of books on three sides, and nothing in it that makes a noise.
  function buildReading(A, c) {
    A.flat(-15.90, .019, 8.40, 10.60, 11.50, c.walnutD, { mode:7, gloss:.13, tag:'阅览室' });
    A.flat(-15.90, .023, 8.40, 10.00, 10.90, c.carpet, { mode:7, gloss:.03, tag:'阅览室' });
    raft(A, c, -16.20, 5.20, 8.20, 4.20, '天花');
    raft(A, c, -16.20, 11.60, 8.20, 3.60, '天花');
    A.light(-16.20, 2.70, 8.20, [1, .84, .60], .48, 9.0);

    bookWallX(A, c, -21.55, 3.10, 13.90, 1, 3.18, 401, '藏书', 3);
    bookWallZ(A, c, 14.45, -21.20, -18.35, -1, 3.18, 509, '藏书', 3);
    // Panelled joinery carries the north wall east of the niche, so the run has two materials.
    A.box(-15.02, 1.62, 14.42, 2.85, 3.10, .40, c.walnutD, { hard:true, mode:6, gloss:.29, tag:'藏书' });
    for (let i = 0; i < 3; i++)
      A.box(-15.02, 1.62, 14.20, .78, 2.62, .028, c.walnutM,
        { hard:true, mode:6, gloss:.31, tag:'藏书', ry:0 });
    A.box(-15.02, 3.24, 14.20, 2.95, .14, .46, c.walnut, { hard:true, mode:6, gloss:.32, tag:'藏书' });
    // A lit niche in the middle of the north wall of books, so the run has a centre.
    A.box(-17.40, 1.72, 14.48, 1.70, 2.30, .40, c.walnutD, { hard:true, mode:6, gloss:.29, tag:'藏书' });
    A.luminous(A.box(-17.40, 1.72, 14.26, 1.44, 2.04, .026, c.warm,
      { hard:true, mode:1, gloss:.14, tag:'藏书' }), .05, .26);
    for (let i = 0; i < 2; i++) {
      A.box(-17.40, .78 + i * .84, 14.20, 1.32, .045, .32, c.walnutL,
        { hard:true, mode:6, gloss:.30, tag:'藏书' });
      A.cyl(-17.75 + (i % 2) * .30, .94 + i * .84, 14.20, .14, .26,
        i % 2 ? c.celadon : c.limestoneL, { gloss:.30, tag:'瓷器' });
    }
    A.solid(-21.40, -13.55, 14.24, NZ);
    A.blocker(-21.42, -13.53, 14.22, NZ, 3.40);

    // Two chair clusters and one long reading table. Nothing here is on the route to anywhere.
    A.flat(-18.30, .027, 5.90, 5.20, 4.60, c.carpetL, { mode:7, gloss:.03, tag:'阅览室' });
    for (const [x, z, yaw] of [[-19.55, 5.10, .95], [-17.15, 5.10, -.95],
      [-19.55, 6.90, 2.20], [-17.15, 6.90, -2.20]])
      clubChair(A, c, x, z, yaw, '阅读椅', c.leather);
    sideTable(A, c, -18.35, 6.00, .40, '茶几', c.limestoneL);
    floorLamp(A, c, -20.20, 7.70, '阅读灯');
    floorLamp(A, c, -16.50, 4.30, '阅读灯');

    A.box(-16.10, .715, 10.70, 1.30, .09, 4.20, c.walnut, { hard:true, mode:6, gloss:.35, tag:'长桌' });
    A.box(-16.10, .655, 10.70, 1.16, .07, 4.00, c.walnutD, { hard:true, mode:6, gloss:.31, tag:'长桌' });
    for (const z of [9.05, 12.35]) {
      A.box(-16.10, .33, z, 1.00, .68, .20, c.walnutD, { hard:true, mode:6, gloss:.30, tag:'长桌' });
      A.box(-16.10, .055, z, 1.16, .11, .46, c.brassD, { hard:true, gloss:.58, tag:'长桌' });
    }
    A.solid(-16.80, -15.40, 8.55, 12.85);
    A.shade(-16.10, 10.70, 1.9, 4.7, .20);
    for (let i = 0; i < 2; i++) {
      const z = 9.70 + i * 2.00;
      boardChair(A, c, -16.98, z, -Math.PI / 2, '阅读椅', c.silkD);
      boardChair(A, c, -15.22, z, Math.PI / 2, '阅读椅', c.silkD);
      // A shaded reading lamp per place, brass on walnut: the room's whole light at night.
      A.cyl(-16.10, .765, z, .10, .040, c.brassD, { gloss:.64, tag:'阅读灯' });
      A.cyl(-16.10, .95, z, .010, .34, c.brass, { gloss:.68, tag:'阅读灯' });
      A.taper(-16.10, 1.20, z, .30, .20, .30, c.jade, { gloss:.22, tag:'阅读灯' });
      A.luminous(A.ball(-16.10, 1.12, z, .075, .060, .075, c.warm, { mode:1, tag:'阅读灯' }), .045, .28);
      A.box(-16.42, .768, z, .22, .020, .30, c.paper, { hard:true, mode:7, gloss:.05, tag:'期刊' });
    }

    // Newspaper rack with real poles, and a tea trolley the attendant leaves by the portal.
    A.box(-13.20, 1.14, 6.40, .44, .10, 1.70, c.walnutD, { hard:true, mode:6, gloss:.30, tag:'报刊架' });
    for (const s of [-1, 1])
      A.cyl(-13.20, .60, 6.40 + s * .78, .017, 1.14, c.brassD, { gloss:.58, tag:'报刊架' });
    A.box(-13.20, .045, 6.40, .52, .09, 1.86, c.brassD, { hard:true, gloss:.58, tag:'报刊架' });
    for (let i = 0; i < 3; i++) {
      const z = 5.94 + i * .40;
      A.cyl(-13.20, 1.10, z, .008, .40, c.walnut, { rx:Math.PI / 2, gloss:.30, tag:'报刊架' });
      A.box(-13.14, .78, z, .30, .58, .022, i % 2 ? c.paper : c.silkL,
        { hard:true, mode:7, gloss:.05, tag:'晨报' });
    }
    A.solid(-13.45, -12.95, 5.50, 7.30);

    inkPanel(A, c, -10.46, 2.06, 4.20, -Math.PI / 2, 2.40, 1.32, 133, '京城水墨');
    sconce(A, c, -10.48, 2.44, 9.60, -Math.PI / 2, '阅览室');
    for (const z of [5.40, 11.40]) pendant(A, c, -19.90, z, 1.05, 1.00, '吊灯');

    A.thing('阅览室', -13.90, 1.20, 4.60, '阅览室收藏京城地方志、建筑图册和中外期刊，请保持安静。',
      'The reading room keeps Beijing local histories, architecture folios and periodicals. Quiet, please.',
      '阅览室 is a reading room; 藏书 is a book collection.',
      { tag:'阅览室', focus:[-13.20, 4.20], reach:2.3 });
  }

  // ============================================================================ lounge
  // The lounge is deliberately NOT walled — a club lounge is meant to be open.  What it gets
  // instead is a back: the shell parks a 13.2 m sign board across the north wall, so it is
  // framed between two tall joinery units and becomes the thing the seating faces.
  function buildLounge(A, c) {
    raft(A, c, 3.10, 7.60, 9.60, 4.00, '天花');
    raft(A, c, 3.10, 11.60, 9.60, 3.20, '天花');
    pendant(A, c, .10, 7.60, 1.05, 1.22, '吊灯');
    pendant(A, c, 5.90, 11.60, 1.05, 1.22, '吊灯');
    A.light(3.10, 2.80, 9.20, [1, .85, .62], .50, 9.5);

    // ---- feature joinery flanking the shell's floor sign, which stays legible in the middle.
    // Tagged with the window wall it belongs to rather than 行政酒廊: hiddenProp judges a tagged
    // prop at the centre of its whole tag group, and the lounge's group is the sofa field 6 m
    // south of here. Depths run front-to-back — carcass at the wall, lit back panel in front of
    // it, shelves in front of that — because an opaque carcass hides anything sunk inside it.
    for (const [x0, x1, sd] of [[-6.55, -2.60, 701], [2.30, 6.55, 823]]) {
      const w = x1 - x0, xc = (x0 + x1) / 2;
      A.box(xc, 1.18, 14.40, w, 2.36, .40, c.walnutD, { hard:true, mode:6, gloss:.30, tag:'城市天际' });
      A.box(xc, .11, 14.36, w + .06, .22, .46, c.walnut, { hard:true, mode:6, gloss:.31, tag:'城市天际' });
      A.box(xc, 2.42, 14.36, w + .08, .16, .48, c.walnut, { hard:true, mode:6, gloss:.32, tag:'城市天际' });
      A.luminous(A.box(xc, 1.36, 14.17, w - .22, 1.86, .026, c.warm,
        { hard:true, mode:1, gloss:.12, tag:'城市天际' }), .035, .20);
      for (let i = 0; i < 3; i++) {
        const y = .64 + i * .66;
        A.box(xc, y, 14.04, w - .16, .045, .27, c.walnutL, { hard:true, mode:6, gloss:.31, tag:'城市天际' });
        A.cyl(xc, y + .015, 13.92, .006, w - .24, c.brass, { rz:Math.PI / 2, gloss:.68, tag:'城市天际' });
        if (i % 2) bookBlocks(A, c, x0 + .18, x1 - .18, y, 'z', 14.00, sd + i * 29, '城市天际', .17);
        else for (let k = 0; k < 3; k++) {
          const xx = x0 + .70 + k * (w - 1.40) / 2;
          if (k % 2) A.cyl(xx, y + .13, 14.00, .105, .26, k % 4 ? c.celadon : c.limestoneL,
            { gloss:.32, tag:'瓷器' });
          else A.taper(xx, y + .15, 14.00, .22, .30, .22, k % 3 ? c.jade : c.lacquer,
            { gloss:.30, tag:'瓷器' });
        }
      }
      const cols = Math.max(1, Math.round(w / 2.4));
      for (let i = 0; i <= cols; i++)
        A.box(x0 + i * w / cols, 1.22, 14.02, .085, 2.28, .30, c.walnut,
          { hard:true, mode:6, gloss:.32, tag:'城市天际' });
      A.solid(x0, x1, 13.92, NZ);
      A.blocker(x0, x1, 13.90, NZ, 2.70);
      A.light(xc, 2.10, 13.55, [1, .84, .58], .26, 4.6);
    }
    // Console and a celadon vessel under the sign, so the middle bay is composed too. Its
    // collider leaves a walk of 0.76 m to the library screen and 1.25 m to the east unit.
    A.box(0, .68, 14.06, 2.30, .08, .48, c.walnut, { hard:true, mode:6, gloss:.35, tag:'城市天际' });
    A.box(0, .40, 14.10, 2.10, .48, .30, c.walnutD, { hard:true, mode:6, gloss:.30, tag:'城市天际' });
    for (const s of [-1, 1])
      A.cyl(s * 1.02, .35, 14.06, .019, .68, c.brassD, { gloss:.58, tag:'城市天际' });
    A.taper(0, .92, 14.06, .46, .40, .46, c.celadon, { gloss:.34, tag:'瓷器' });
    A.cyl(0, 1.14, 14.06, .09, .06, c.celadonL, { gloss:.34, tag:'瓷器' });
    for (const [dx, dy, r] of [[-.16, 1.42, .17], [.14, 1.50, .15], [0, 1.66, .13]])
      A.ball(dx, dy, 14.06, r, r * .82, r * .70, c.green, { mode:15, gloss:.10, tag:'绿化' });
    for (const s of [-1, 1]) {
      A.box(s * 6.80, 1.72, 14.30, .26, 3.44, .50, c.walnut, { hard:true, mode:6, gloss:.32, tag:'城市天际' });
      A.cyl(s * 6.80, 1.72, 14.02, .013, 2.90, c.brassL, { gloss:.70, tag:'城市天际' });
      A.solid(s * 6.80 - .14, s * 6.80 + .14, 13.85, NZ);
    }
    A.solid(-1.00, 1.00, 13.86, NZ);
    A.box(0, 3.06, 14.20, 14.4, .22, .56, c.brassD, { hard:true, gloss:.58, tag:'城市天际' });

    // ---- the club bar, on the west face of the threshold. It is what HT10-service-route sees.
    const BX = 10.90;
    A.box(BX, 1.30, 8.30, .58, 2.60, 4.40, c.walnutD, { hard:true, mode:6, gloss:.30, tag:'水吧' });
    A.box(BX - .06, .11, 8.30, .62, .22, 4.46, c.walnut, { hard:true, mode:6, gloss:.31, tag:'水吧' });
    A.box(BX - .06, 2.66, 8.30, .64, .16, 4.52, c.walnut, { hard:true, mode:6, gloss:.32, tag:'水吧' });
    A.luminous(A.box(BX - .32, 1.50, 8.30, .026, 1.94, 4.06, c.warm,
      { hard:true, mode:1, gloss:.12, tag:'水吧' }), .035, .21);
    for (let i = 0; i < 3; i++) {
      const y = .78 + i * .62;
      A.box(BX - .48, y, 8.30, .26, .045, 4.20, c.walnutL, { hard:true, mode:6, gloss:.31, tag:'水吧' });
      A.cyl(BX - .60, y + .015, 8.30, .006, 4.12, c.brass, { rx:Math.PI / 2, gloss:.68, tag:'水吧' });
      for (let k = 0; k < 5; k++) {
        const z = 6.60 + k * .80 + (i % 2) * .26;
        if (z > 10.10) continue;
        if (i < 2) A.cyl(BX - .52, y + .105, z, .052, .21, [c.jade, c.tea, c.celadon, c.lacquer][k % 4],
          { gloss:.42, tag:'调酒' });
        else A.cyl(BX - .52, y + .065, z, .048, .13, c.celadonL, { gloss:.34, tag:'杯具' });
      }
    }
    A.box(BX - 1.08, .49, 8.30, .82, .98, 3.60, c.walnut, { hard:true, mode:6, gloss:.33, tag:'水吧' });
    A.box(BX - 1.10, 1.02, 8.30, .96, .09, 3.76, c.limestoneL, { hard:true, gloss:.28, tag:'水吧' });
    A.box(BX - 1.08, .11, 8.30, .70, .22, 3.50, c.walnutD, { hard:true, mode:6, gloss:.28, tag:'水吧' });
    A.cyl(BX - 1.54, .74, 8.30, .013, 3.40, c.brassL, { rx:Math.PI / 2, gloss:.70, tag:'水吧' });
    A.cyl(BX - 1.10, 1.20, 6.95, .16, .28, c.brassD, { gloss:.62, tag:'咖啡' });
    A.capsule(BX - 1.32, 1.16, 6.95, .030, .34, .030, c.brassL, { rz:Math.PI / 2, gloss:.70, tag:'咖啡' });
    for (let k = 0; k < 3; k++)
      A.cyl(BX - .96 + (k % 2) * .22, 1.11, 8.05 + k * .52, .052, .10, c.celadonL, { gloss:.34, tag:'杯具' });
    A.solid(9.32, 11.20, 6.40, 10.20);
    A.blocker(9.30, 11.22, 6.38, 10.22, 2.80);
    plaque(A, c, 10.45, 2.34, 5.72, Math.PI, '会员水吧', 'CLUB BAR', 1.75, c.brass);
    A.light(10.30, 2.20, 8.30, [1, .82, .56], .32, 5.4);
    for (let i = 0; i < 3; i++) {
      const z = 6.90 + i * 1.40;
      A.cyl(8.92, .32, z, .19, .09, c.leather, { mode:7, gloss:.12, tag:'水吧' });
      A.cyl(8.92, .18, z, .025, .30, c.brassD, { gloss:.58, tag:'水吧' });
      A.cyl(8.92, .022, z, .21, .044, c.brassD, { gloss:.58, tag:'水吧' });
    }
    A.thing('会员水吧', 9.65, 1.20, 8.30, '会员水吧下午供茶，傍晚供酒和小食。',
      'The club bar pours tea in the afternoon and drinks and small plates in the evening.',
      '水吧 is a drinks bar; 会员 means member.',
      { tag:'会员水吧', focus:[8.35, 8.30], reach:2.3 });
  }

  // ============================================================================ the glazed edge
  // The fit-out's skyline is one flat band of glass.  These are the bays: piers off the glass,
  // a brass sill rail at hand height, and seats deep enough to sit in and look out of.
  function buildSkylineEdge(A, c) {
    const bays = [[-13.30, -10.60], [-9.60, -6.90], [7.45, 11.00]];
    for (const [x0, x1] of bays) {
      const xc = (x0 + x1) / 2, w = x1 - x0;
      windowSeat(A, c, x0 + .16, x1 - .16, 14.02, '窗边座位');
      A.cyl(xc, .96, 14.36, .014, w - .10, c.brass, { rz:Math.PI / 2, gloss:.70, tag:'城市天际' });
      for (const s of [-1, 1])
        A.cyl(x0 + (s < 0 ? .14 : w - .14), .52, 14.36, .013, .88, c.brassD,
          { gloss:.62, tag:'城市天际' });
      // Deep reveals: a pier each side and a soffit, so the glass sits in a wall thickness.
      for (const px of [x0 - .16, x1 + .16]) {
        A.box(px, 1.86, 14.28, .30, 3.72, .58, c.walnut, { hard:true, mode:6, gloss:.32, tag:'城市天际' });
        A.cyl(px, 1.86, 13.98, .013, 3.20, c.brassL, { gloss:.70, tag:'城市天际' });
        A.solid(px - .15, px + .15, 14.00, NZ);
      }
      A.box(xc, 3.60, 14.28, w + .34, .34, .58, c.walnut, { hard:true, mode:6, gloss:.32, tag:'城市天际' });
      A.luminous(A.box(xc, 3.40, 14.02, w + .10, .030, .16, c.warm,
        { hard:true, mode:1, tag:'城市天际' }), .030, .18);
      A.light(xc, 2.20, 13.90, [.92, .95, 1], .20, 4.2);
    }
    plaque(A, c, 9.20, 2.44, 13.96, Math.PI, '城市天际', 'CITY SKYLINE', 2.10, c.blue);
    A.thing('城市天际', 9.20, 1.30, 13.40, '从行政楼层可以看见长安街一线的灯火。',
      'From the executive floor you can see the lights along the Chang an avenue line.',
      '天际 means skyline; 窗边座位 is a window seat.',
      { tag:'城市天际', focus:[9.20, 12.90], reach:2.2 });
  }

  // ============================================================================ back of house
  function buildPantries(A, c) {
    // ---- club pantry, off the arrival gallery beside the service lift.
    A.flat(18.00, .020, 11.30, 6.60, 6.00, c.limestoneD, { mode:7, gloss:.16, tag:'备餐间' });
    A.flat(18.00, .024, 11.30, 6.20, 5.60, c.limestoneL, { mode:7, gloss:.18, tag:'备餐间' });
    A.box(18.10, .45, 14.30, 6.00, .90, .62, c.steel, { hard:true, gloss:.42, tag:'备餐间' });
    A.box(18.10, .93, 14.30, 6.10, .07, .70, c.steel, { hard:true, gloss:.55, tag:'备餐间' });
    A.solid(15.05, 21.20, 13.95, 14.62);
    for (let i = 0; i < 2; i++) {
      A.box(16.60 + i * 2.90, .45, 14.02, 2.60, .70, .030, c.steel, { hard:true, gloss:.44, tag:'备餐间' });
      A.capsule(16.60 + i * 2.90, .45, 13.99, .018, .50, .018, c.steel, { rz:Math.PI / 2, gloss:.62, tag:'备餐间' });
    }
    A.box(16.30, .955, 14.28, .78, .05, .52, c.steel, { hard:true, gloss:.62, tag:'备餐间' });
    A.cyl(16.30, 1.16, 14.50, .011, .40, c.steel, { gloss:.64, tag:'备餐间' });
    A.capsule(16.30, 1.33, 14.40, .020, .24, .020, c.steel, { rx:.9, gloss:.64, tag:'备餐间' });
    const urn = A.cyl(19.30, 1.13, 14.26, .17, .34, c.steel, { gloss:.52, tag:'咖啡' });
    A.box(20.90, 1.32, 11.90, .40, .045, 3.60, c.steel, { hard:true, gloss:.48, tag:'备餐间' });
    for (let k = 0; k < 3; k++)
      A.cyl(20.90, 1.42, 10.75 + k * 1.15, .085, .18, k % 2 ? c.white : c.celadonL,
        { gloss:.32, tag:'杯具' });
    A.box(21.14, 1.62, 11.90, .10, 2.20, 3.80, c.steel, { hard:true, gloss:.40, tag:'备餐间' });
    A.solid(20.66, 21.20, 10.00, 13.80);
    for (let i = 0; i < 1; i++) {
      const x = 16.10 + i * 1.60, z = 10.10;
      A.box(x, .78, z, .90, .045, .58, c.steel, { hard:true, gloss:.50, tag:'布草' });
      A.box(x, .42, z, .86, .045, .54, c.steel, { hard:true, gloss:.50, tag:'布草' });
      for (const sx of [-1, 1]) for (const sz of [-1, 1])
        A.cyl(x + sx * .40, .38, z + sz * .24, .011, .76, c.steel, { gloss:.55, tag:'布草' });
      A.box(x, .90, z, .74, .20, .44, c.white, { mode:7, gloss:.04, tag:'布草' });
      A.solid(x - .50, x + .50, z - .34, z + .34);
    }
    A.box(14.72, 1.90, 11.00, .06, .90, 1.30, c.walnutD, { hard:true, mode:6, gloss:.28, tag:'备餐间' });
    A.box(14.76, 1.90, 11.00, .020, .74, 1.14, c.paper, { hard:true, mode:1, gloss:.06, tag:'备餐间' });
    pendant(A, c, 18.10, 11.20, .62, .78, '备餐间');
    A.light(18.00, 2.90, 11.30, [1, .96, .88], .34, 6.2);
    A.thing('备餐间', 15.20, 1.20, 9.20, '备餐间连着服务梯，行政楼层的茶点从这里出去。',
      'The pantry adjoins the service lift; the floor tea service goes out from here.',
      '备餐间 is a pantry; 服务梯 is the goods lift.',
      { tag:'备餐间', focus:[16.05, 8.80], reach:2.2 });

    // ---- breakfast back of house, behind the servery and on the staff route from the stair.
    A.flat(-19.70, .020, -12.30, 3.10, 3.90, c.limestoneD, { mode:7, gloss:.16, tag:'备餐间' });
    A.box(-21.06, .46, -12.30, .52, .92, 3.60, c.steel, { hard:true, gloss:.42, tag:'备餐间' });
    A.box(-21.06, .94, -12.30, .60, .07, 3.70, c.steel, { hard:true, gloss:.55, tag:'备餐间' });
    A.solid(-21.32, -20.80, -14.15, -10.45);
    for (let s = 0; s < 2; s++) {
      A.box(-21.10, 1.44 + s * .56, -12.30, .34, .045, 3.20, c.steel, { hard:true, gloss:.48, tag:'备餐间' });
      for (let k = 0; k < 3; k++)
        A.cyl(-21.10, 1.54 + s * .56, -13.40 + k * 1.05, .072, .17, k % 2 ? c.white : c.celadonL,
          { gloss:.32, tag:'杯具' });
    }
    A.box(-18.52, .44, -13.45, .66, .88, 1.70, c.steel, { hard:true, gloss:.44, tag:'员工通道' });
    A.box(-18.52, .90, -13.45, .74, .06, 1.80, c.steel, { hard:true, gloss:.55, tag:'布草' });
    A.solid(-18.85, -18.20, -14.30, -12.60);
    for (let i = 0; i < 2; i++)
      A.box(-18.55, 1.06 + i * .15, -13.30 + (i % 2) * .30, .58, .14, .44, i % 2 ? c.white : c.silkL,
        { mode:7, gloss:.04, tag:'布草' });
    A.box(-18.52, .44, -11.70, .66, .88, 1.00, c.steel, { hard:true, gloss:.44, tag:'备餐间' });
    A.box(-18.52, .90, -11.70, .74, .06, 1.10, c.steel, { hard:true, gloss:.55, tag:'备餐间' });
    A.solid(-18.85, -18.20, -12.20, -11.20);
    A.cyl(-18.52, 1.06, -11.70, .13, .26, c.steel, { gloss:.52, tag:'热茶' });
    pendant(A, c, -19.70, -12.20, .60, .66, '备餐间');
    A.light(-19.70, 2.90, -12.20, [1, .96, .88], .30, 5.0);

    // ---- the service hall between them: the stair, a trolley bay and a linen shelf.
    A.flat(-17.60, .019, -8.10, 7.40, 5.60, c.limestoneD, { mode:7, gloss:.15, tag:'员工通道' });
    A.box(-14.20, 1.42, -11.35, .48, 2.60, 2.40, c.walnutD, { hard:true, mode:6, gloss:.28, tag:'布草' });
    for (let s = 0; s < 4; s++)
      A.box(-14.28, .58 + s * .62, -11.35, .40, .050, 2.20, c.walnutL,
        { hard:true, mode:6, gloss:.30, tag:'布草' });
    for (let s = 0; s < 4; s++) for (let k = 0; k < 2; k++)
      A.box(-14.30, .72 + s * .62, -11.90 + k * 1.10, .32, .22, .92,
        (s + k) % 3 ? c.white : c.silkL, { mode:7, gloss:.04, tag:'布草' });
    A.solid(-14.48, -13.90, -12.60, -10.10);
    A.blocker(-14.50, -13.88, -12.62, -10.08, 2.80);
    pendant(A, c, -16.90, -9.20, .56, .74, '员工通道');
    A.light(-16.60, 2.90, -8.40, [1, .96, .88], .32, 6.0);
    A.thing('员工通道', -15.60, 1.20, -8.60, '员工通道从安全楼梯经备餐间通到早餐台后场。',
      'The staff route runs from the fire stair through the pantry to the back of the servery.',
      '员工通道 is a staff passage.', { tag:'员工通道', focus:[-16.20, -8.10], reach:2.2 });
    return urn;
  }

  // ============================================================================ motion
  function buildLife(A, c) {
    // Hoisted scratch matrices. `M.mul`, `M.trans` and `M.scale` each allocate a fresh
    // Float32Array(16) when they are not given an output (js/math.js:7,17,18), and these two
    // ticks ran fifty-six of those allocations every frame for as long as the player stood on
    // this floor. Every one of them is avoidable: `S`/`S2`/`S3` are reused per prop, and `out`
    // is the prop's own permanent matrix, rewritten in place while the renderer keeps reading
    // the same array. `out` starts as a copy of the base so a prop is never submitted with an
    // all-zero matrix in the frames before the first tick.
    //
    // The one rule `M.mul(a, b, o)` imposes: `o` must not alias `a`. It reads a[] throughout
    // while it writes o[], so an aliased first argument corrupts the later columns. Below, the
    // output is always `out` and the arguments are always a scratch or a base — never `out`.
    const S = new Float32Array(16), S2 = new Float32Array(16), S3 = new Float32Array(16);
    // Distant traffic behind the glazing. Twelve small warm marks on one slow loop, culled to a
    // fixed sphere so they cost nothing when the player is anywhere else on the plate.
    const lane = [];
    for (let i = 0; i < 12; i++) {
      const p = A.box(-13.0 + i * 2.05, .60, 14.62, .17, .040, .030, i % 3 ? c.warm : c.rose,
        { hard:true, mode:1, glow:.22, tag:'城市天际' });
      p.fixed = true; p.cx = 0; p.cy = .60; p.cz = 14.6; p.r = 26;
      lane.push({ p, m: p.m, out: new Float32Array(p.m), i });
    }
    A.onTick((t) => {
      for (const q of lane) {
        const dx = ((t * .28 + q.i * 2.05) % 25) - q.i * 2.05;
        M.trans(dx, 0, 0, S);
        q.p.m = M.mul(S, q.m, q.out);
      }
    });
    // Steam off the pantry urn and the bar coffee, four marks each, same trick.
    const puffs = [];
    for (const [x, y, z] of [[19.30, 1.34, 14.26], [10.06, 1.38, 6.95]])
      for (let i = 0; i < 4; i++) {
        const p = A.ball(x, y + .10 + i * .12, z, .035, .030, .035, A.col.white,
          { mode:1, alpha:.999, glow:.02, tag:'热茶' });
        p.fixed = true; p.cx = x; p.cy = y; p.cz = z; p.r = 3.2;
        puffs.push({ p, m: p.m, out: new Float32Array(p.m), i, k: puffs.length });
      }
    A.onTick((t) => {
      for (const q of puffs) {
        const u = (t * .34 + q.i * .25 + q.k * .07) % 1, k = 1 + u * 1.5;
        M.scale(k, k, k, S2);
        M.mul(q.m, S2, S3);
        M.trans(Math.sin(t * .8 + q.k) * .045, u * .46, 0, S);
        q.p.m = M.mul(S, S3, q.out);
      }
    });
  }

  // ============================================================================ interactions
  Object.assign(HotelUse.hotel10, {
    '接待台':{ zh:'在接待台登记', py:'zài jiēdàitái dēngjì', en:'check in at the club desk',
      secs:2.4, mins:8, gain:{ mood:4 }, pose:{ type:'talk' } },
    '会议室':{ zh:'用会议室', py:'yòng huìyìshì', en:'use the board room',
      secs:4.0, mins:55, gain:{ rest:-10, mood:3 }, pose:{ type:'type', seatY:.50 } },
    '洽谈室':{ zh:'在洽谈桌工作', py:'zài qiàtánzhuō gōngzuò', en:'work at a quiet table',
      secs:3.6, mins:40, gain:{ rest:-7, mood:3 }, pose:{ type:'type', seatY:.50 } },
    '阅览室':{ zh:'在阅览室看书', py:'zài yuèlǎnshì kànshū', en:'read in the reading room',
      secs:3.8, mins:35, gain:{ mood:10, rest:8 }, pose:{ type:'sit', seatY:.48 } },
    '长桌':{ zh:'看城市地图', py:'kàn chéngshì dìtú', en:'study the city maps',
      secs:2.6, mins:12, gain:{ mood:5 }, pose:{ type:'stand' } },
    '会员水吧':{ zh:'在水吧喝一杯', py:'zài shuǐbā hē yì bēi', en:'take a drink at the club bar',
      secs:3.0, mins:22, gain:{ rest:9, mood:8 }, pose:{ type:'drink', seatY:.48 } },
    '城市天际':{ zh:'看城市天际线', py:'kàn chéngshì tiānjìxiàn', en:'look out at the skyline',
      secs:3.0, mins:15, gain:{ mood:11, rest:4 }, pose:{ type:'stand' } },
    '早餐台':{ zh:'看备餐台', py:'kàn bèicāntái', en:'inspect the servery',
      secs:1.8, mins:3, gain:{}, pose:{ type:'check' } },
    '衣帽间':{ zh:'寄存大衣', py:'jìcún dàyī', en:'leave a coat',
      secs:2.0, mins:4, gain:{ mood:2 }, pose:{ type:'carry' } },
    '备餐间':{ zh:'查看备餐间', py:'chákàn bèicānjiān', en:'check the pantry',
      secs:2.0, mins:5, gain:{ clean:3 }, pose:{ type:'work' } },
    '员工通道':{ zh:'走员工通道', py:'zǒu yuángōng tōngdào', en:'take the staff route',
      secs:1.6, mins:2, gain:{}, pose:{ type:'walk' } },
    // The gate answers with the card in your pocket, so this row is a getter: a builder runs once
    // and would bake whichever stay was open when the page loaded.
    '门禁':{ zh:'刷房卡', py:'shuā fángkǎ', en:'present your key card at the club gate',
      secs:1.8, mins:1, gain:{}, pose:{ type:'check' },
      get done(){ try {
        if (typeof Stay === 'undefined' || !Stay.key) return '门开了。';
        const k = Stay.key();
        const g = k && !k.lost && (Stay.GRADES || []).find(q => q.floor === k.floor);
        const min = (typeof HOTEL_LOUNGE !== 'undefined' && HOTEL_LOUNGE.minLevel) || 9;
        return g && g.level >= min ? `${g.hz}的房卡，绳子解开了。` : '读卡器亮红灯，绳子没解开。';
      } catch (_) { return '门开了。'; } },
      get doneTr(){ try {
        if (typeof Stay === 'undefined' || !Stay.key) return 'The gate opens.';
        const k = Stay.key();
        const g = k && !k.lost && (Stay.GRADES || []).find(q => q.floor === k.floor);
        const min = (typeof HOTEL_LOUNGE !== 'undefined' && HOTEL_LOUNGE.minLevel) || 9;
        return g && g.level >= min ? `A ${g.en} card — the rope comes off.`
                                   : 'The reader shows red and the rope stays hooked.';
      } catch (_) { return 'The gate opens.'; } },
    },
  });

  // ============================================================================ THE FLOOR
  HotelFit.register('hotel10', A => {
    const c = palette(A);
    buildPlan(A, c);
    buildArrival(A, c);
    buildAccessGate(A, c);
    buildGallery(A, c);
    buildBreakfast(A, c);
    buildBoardroom(A, c);
    buildLibrary(A, c);
    buildReading(A, c);
    buildLounge(A, c);
    buildPantries(A, c);
    buildSkylineEdge(A, c);
    buildLife(A, c);
  });
})();
