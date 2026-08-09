// 🏨 京华大酒店 · Floor 4 — the interior architecture
//
// This floor's own module. Registered into HotelFit (declared in js/hotel.js). Nothing else in
// the build writes to this file, and you must not write to anyone else's.
//
// Programme for this level, from HOTEL.md:
//   spa reception, treatment rooms, pool, gym and changing rooms
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
//   scene key   hotel4
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
//     node /private/tmp/claude-501/-Users-jonahcollins-Desktop-Chinesegame/a3cc9bcf-53f0-4e3d-a6a3-24cb996ed8a1/scratchpad/floorprobe.js hotel4 -22 22 -15 15 15.6 -3.7
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
//   * `node --check js/hotel-f4.js` after every edit. A backtick inside a template literal
//     ends the string mid-statement; that has broken this project three times.
//
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// WHAT THIS MODULE ACTUALLY BUILDS — the measured plan
//
// js/hotel-service.js (the shared fit-out, which this module must NOT edit) furnished the whole
// plate and left 29 colliders on it — the fewest of any level in the hotel. Every one of them is a
// piece of furniture: the reception desk, six locker banks, five cardio machines, two benches, the
// cable rig, the drinking fountain, three treatment beds with their trolleys and stools, and the
// pool. Not one is a wall. The two 更衣 portals, the 理疗室 portal and the 健身房 portal are
// bronze frames with a head and two posts and NO solid at all, so today the player walks through
// the frame, through the locker room, through the treatment bed's room and out the far side.
//
// On a spa floor that is not a styling defect. Privacy IS the programme here: a treatment room or
// a changing room without walls is the wrong building. So this module supplies the building.
//
//   south corridor   z -6.24..-5.14, running x -17.84..10.34. The floor's spine. Reception, the
//                    wet suite and both changing rooms open south off it; the gym opens north.
//   reception        x -17.84..-4.98, z -13.94..-6.40. Contains the fire-stair landing, so the
//                    stair stays inside a room rather than in open plate. Two 1.10 m doors.
//   treatment wing   two rooms west, x -17.84..-11.94, split at z -0.58..-0.42. Each has a 1.10 m
//                    door in its east wall, placed inside the gap the fit-out's own silk screens
//                    already left at x -11.72. The fit-out's 理疗室 portal at x -10.65 keeps its
//                    job as the wing's threshold marker and is deliberately left free-standing.
//   wet suite        x -4.98..1.14 — NEW programme in 48 m² of plate the fit-out left empty
//                    between reception and the changing rooms: sauna, steam room and hot plunge.
//   changing         x 1.30..10.18, z -13.94..-6.24, split into 女 and 男 by a party wall at
//                    x 5.60..5.76. Each has a 1.10 m door under its own bronze portal.
//   gym              x -5.88..7.00, z -5.14..1.58, entered through the fit-out's 5.86 m 健身房
//                    portal; doors east (on the guest spine at z -3.70) and west (on the spine's
//                    pool leg). Glazed screen along the water.
//   pool hall        walled east and north; its south edge east of the water closed at z 1.58.
//   lounge / court   放松茶廊 walled at x -17.84..-11.29, z 8.06..14.30, with a 静心庭 court south.
//   arrival hall     x 7.00..17.70 in front of the lift bank, walled from the service hall.
//   service hall     x 8.46..17.70, z 2.62..14.30, staff only, with a new 布草间 off it.
//   SE rooms         x 10.34..17.70, z -13.94..-9.06 — a couples' suite and a third treatment
//                    room, so 36 m² of south-east plate is programme instead of blank mass.
//
// CONFLICTS LEFT IN PLACE — see the report; none of them is fixed by reaching into the fit-out.
//   * The 女更衣 and 男更衣 portals at z -5.62 open into ONE room whose bench, vanity mirror and
//     towel-return cabinet are all centred on x 6.2 — i.e. shared between the two sexes. The
//     party wall goes at x 5.60..5.76, the only line between the two locker banks that misses the
//     bench, the plinth and the cabinet; it does cross the 3.55 m mirror, which then reads as one
//     vanity either side of a pier. Showers exist only on the west side, so three more are added
//     to the men's room and a bench to the women's.
//   * The 健身房 portal frame at z -4.72 is 0.62 m from the 更衣 portal frames at z -5.62. Two
//     walls on those two lines would leave a 0.62 m corridor — 0.02 m of walkable band after the
//     0.30 m body radius, i.e. sealed. The gym's south wall therefore goes at z -5.30..-5.14 with
//     a lined reveal running north to meet the portal, which also keeps 1.36 m of clear floor in
//     front of the treadmill row instead of 0.80 m.
//   * The 理疗室 and 健身房 portal signs face INTO their own rooms (`face` argument), so they are
//     read from inside rather than from the corridor. Left alone; new corridor signage is added.

try {
  Glyphs.need('水疗接待理室一二三双人更衣男女桑拿房蒸汽汤池湿区泳健身放松茶廊静心庭布草间' +
    '员工通道安全楼梯电梯厅淋浴前客服务四楼康体请勿区域按摩休息毛巾冷热' +
    '干里温度很高进去先湿慢呼吸最多待十分钟恒三九次泡冲洗房可以两位同时接受单全护理是的' +
    '开启贵重物品随身保管有氧力量伸展毛巾站救生员池畔恒温泳道浅水深');
} catch (_) {}

HotelFit.register('hotel4', A => {
  const { box, cyl, ball, capsule, taper, flat, glyphs, solid, blocker, shade, glow, thing } = A;
  const { C, col, RX, RZ, H } = A;

  // The fit-out's palette, matched exactly (js/hotel-service.js palette()). A partition that does
  // not share the spa's stone and timber reads as a later addition rather than as the building.
  const stoneW = C('#c6c8c1'), stoneWD = C('#adb2ab'), stoneB = C('#2b3a3c');
  const stoneL = C('#aeb9b4'), stoneD = C('#293a3c');
  const timber = C('#4b352a'), timberL = C('#745342'), timberD = C('#2a1e19');
  // The tower material kit, 2026-08-08. Identical tuples to every other hotel module because
  // build.js:329-331 keys batches on (mat, matScale, matAmt, nrmAmt); matching numbers let this
  // module's partitions batch with js/hotel-service.js's spa fittings. AGED/POLISH are the H274
  // specular split — roughness is 1 - gloss (gl.js:778) and gloss is free, being per instance.
  const MAT = {
    stone:  { mat:'plaster', matScale:2.30, matAmt:.16, nrmAmt:.62 },
    timber: { mat:'wood',    matScale:.95,  matAmt:.26, nrmAmt:.34 },
    cloth:  { mat:'fabric',  matScale:.52,  matAmt:.26, nrmAmt:.46 },
    paving: { mat:'concrete',matScale:1.85, matAmt:.17, nrmAmt:.30 },
  };
  const AGED = .34, POLISH = .78;
  const jade = C('#456e61'), celadon = C('#8ca99a'), celadonL = C('#b6c5bb');
  const teal = C('#3f7880'), linen = C('#cec9c1'), ink = C('#202729');
  const bronze = C('#9c7440'), bronzeL = C('#c5a164'), bronzeD = C('#5e472f');
  const warm = C('#ffe0a1'), lacquer = C('#8e302a'), glassC = C('#85a9b1'), waterC = C('#4f8993');

  // Heights. The shell ceiling slab is box(0,H-.13,0,...,.26,...), so its soffit is at H-.26 =
  // 4.09. Every partition runs to 3.16 like the fit-out's own joinery and then carries a bulkhead
  // to the soffit: a wall that stops at 3.16 is a screen, and a 0.93 m slot of daylight over every
  // partition is exactly the kind of thing a screenshot never shows.
  const WH = 3.16, EYE = 4.09;

  // ============================================================================ the plan, as EXTENTS
  // Every number below is a wall FACE. `part()` is the only place extents become box centres, so
  // the collider can never drift off the geometry.
  const T = .16;
  const WW0 = -18.00, WW1 = -17.84;          // west wall
  const SW0 = -14.10, SW1 = -13.94;          // south wall
  const NW0 = 14.30, NW1 = 14.46;            // north wall
  const CS0 = -6.40, CS1 = -6.24;            // south corridor, south wall
  const CN0 = -5.30, CN1 = -5.14;            // south corridor, north wall (gym + treatment 甲)
  const TE0 = -11.94, TE1 = -11.78;          // treatment wing east wall
  const TP0 = -0.58, TP1 = -0.42;            // treatment party wall
  const TN0 = 4.86, TN1 = 5.02;              // treatment 乙 north wall / court south wall
  const LS0 = 7.90, LS1 = 8.06;              // lounge south wall
  const LE0 = -11.45, LE1 = -11.29;          // lounge east wall
  const RE0 = -5.14, RE1 = -4.98;            // reception east wall
  const XE0 = 1.14, XE1 = 1.30;              // wet suite east wall / changing west wall
  const CP0 = 5.30, CP1 = 5.46;              // changing party wall
  const CE0 = 10.18, CE1 = 10.34;            // changing east wall
  const GW0 = -5.88, GW1 = -5.72;            // gym west wall
  const GE0 = 6.84, GE1 = 7.00;              // gym east wall
  const PS0 = 1.58, PS1 = 1.74;              // pool hall south wall, east of the water
  const PE0 = 8.30, PE1 = 8.46;              // pool hall east wall
  const VN0 = 2.46, VN1 = 2.62;              // service hall south wall
  const KW0 = 14.30, KW1 = 14.46;            // linen room west wall
  const KS0 = 7.60, KS1 = 7.76;              // linen room south wall
  const QN0 = -9.06, QN1 = -8.90;            // south-east rooms, north wall
  const QP0 = 14.20, QP1 = 14.36;            // south-east rooms, party wall
  const QE0 = 17.54, QE1 = 17.70;            // south-east rooms, east wall
  const BANK = 17.70, FARX = 18.90;          // lift-bank face, and where the riser zone starts

  // --------------------------------------------------------------------------------- primitives

  // EVERY wall stretch gets its OWN tag. js/game.js hiddenProp judges a tagged prop by the centre
  // of its whole tag group, and the shell's four exterior walls are all tagged 墙 — a group whose
  // centre is the middle of the plate, which no member occupies. Joining that group would make
  // every partition on this floor hide and show as one, judged from a point none of them is near.
  // A per-stretch tag groups a wall with its own skirting, head and jambs, which is the size of
  // group the mechanism was built for. js/home-walls.js:184 is the template.
  let tagN = 0;
  // A wall NEVER shares a tag with the room it encloses. The fit-out tags a whole changing room
  // 更衣室 and a whole treatment wing 理疗室, and those groups' centres sit where the player
  // stands — so a partition joining one is hidden by the cutaway exactly when you are inside the
  // room it is meant to separate. The first render of HT4-changing showed the women's lockers
  // straight through the new party wall for that reason. newTag() keeps the readable prefix and
  // still gives every stretch a group of its own.
  const newTag = (p) => (p || '四楼隔墙') + (++tagN);

  // A partition, given by its footprint EXTENTS. Deliberately the only function in this file that
  // calls both box() and solid(), because they take different argument shapes and the whole defect
  // this module exists to fix is geometry and collision disagreeing.
  function part(x0, x1, z0, z1, o = {}) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    const y0 = o.y0 === undefined ? 0 : o.y0, y1 = o.y1 === undefined ? WH : o.y1;
    const tag = newTag(o.tag);
    Build.partition(y0, y1 - y0, (yc, hh, pf) =>
      box(cx, yc, cz, w, hh, d, o.c || stoneW,
        {...MAT.stone,  hard: true, gloss: o.gloss === undefined ? .12 : o.gloss, tag, nocut: o.nocut, ...pf }));
    if (o.stop !== false) solid(x0, x1, z0, z1);
    if (o.eye !== false) blocker(x0 - .03, x1 + .03, z0 - .03, z1 + .03, o.top || EYE);
    if (o.bulk !== false && y1 >= WH - .01 && y1 < EYE - .02)
      box(cx, (y1 + EYE) / 2, cz, w, EYE - y1, d, stoneWD,
        {...MAT.stone, hard: true, gloss: .10, tag, partition: !o.nocut });
    if (o.trim === false) return;
    // Dark stone skirting. ONE box proud of the wall on both faces rather than two cards, which
    // reads identically and halves the prop cost over ninety wall stretches.
    box(cx, .10, cz, w + (w >= d ? 0 : .12), .20, d + (w >= d ? .12 : 0), stoneB,
      {...MAT.stone,  hard: true, gloss: .30, tag });
  }

  // A visible face on a mass that already carries its own collider. Geometry only.
  const face = (x0, x1, z0, z1, o = {}) =>
    part(x0, x1, z0, z1, Object.assign({ stop: false, eye: false }, o));

  // Unauthored building behind a wall face: collider + camera blocker, no interior. Its only job
  // is that no square metre of plate is standable-but-unreachable.
  function mass(x0, x1, z0, z1) {
    solid(x0, x1, z0, z1);
    blocker(x0 - .04, x1 + .04, z0 - .04, z1 + .04, EYE);
  }

  // A door opening: jambs, head and a bronze threshold. Carries NO collider — the two wall runs
  // either side define the clear width, so every piece here is placed outside it. A jamb standing
  // inside the opening would be a walk-through wall again, only 90 mm of it.
  // axis 'x': the wall runs along x and the opening is an x-range; 'z' is the transpose.
  function opening(axis, a0, a1, b0, b1, o = {}) {
    const bc = (b0 + b1) / 2, t = b1 - b0, head = o.head === undefined ? 2.46 : o.head;
    const jw = .09, tag = newTag(o.tag || '四楼门'), sides = o.sides || [1, 1];
    if (axis === 'x') {
      if (sides[0]) box(a0 - jw / 2, WH / 2, bc, jw, WH, t + .05, timber, { hard: true, gloss: .30, tag });
      if (sides[1]) box(a1 + jw / 2, WH / 2, bc, jw, WH, t + .05, timber, { hard: true, gloss: .30, tag });
      if (head < WH - .02) box((a0 + a1) / 2, (head + WH) / 2, bc, a1 - a0, WH - head, t + .05,
        timber, { hard: true, gloss: .30, tag });
      box((a0 + a1) / 2, .020, bc, a1 - a0 - .02, .040, t + .09, bronzeD, { hard: true, gloss:AGED, tag });
    } else {
      if (sides[0]) box(bc, WH / 2, a0 - jw / 2, t + .05, WH, jw, timber, { hard: true, gloss: .30, tag });
      if (sides[1]) box(bc, WH / 2, a1 + jw / 2, t + .05, WH, jw, timber, { hard: true, gloss: .30, tag });
      if (head < WH - .02) box(bc, (head + WH) / 2, (a0 + a1) / 2, t + .05, WH - head, a1 - a0,
        timber, { hard: true, gloss: .30, tag });
      box(bc, .020, (a0 + a1) / 2, t + .09, .040, a1 - a0 - .02, bronzeD, { hard: true, gloss:AGED, tag });
    }
  }

  // A wall run along z with ONE opening in it, built as two solids with clear space between. This
  // is the whole grammar of a doorway in this engine: `solid` has no height and no hole.
  function portalZ(x0, x1, za, zb, d0, d1, o = {}) {
    const q = o;
    part(x0, x1, za, d0, q);
    part(x0, x1, d1, zb, q);
    opening('z', d0, d1, x0, x1, q);
    // Head over the opening, carrying no collider.
    part(x0, x1, d0, d1, Object.assign({}, q,
      { y0: q.head === undefined ? 2.46 : q.head, y1: WH, stop: false, eye: false, trim: false }));
  }
  function portalXr(z0, z1, xa, xb, d0, d1, o = {}) {
    const q = o;
    part(xa, d0, z0, z1, q);
    part(d1, xb, z0, z1, q);
    opening('x', d0, d1, z0, z1, q);
    part(d0, d1, z0, z1, Object.assign({}, q,
      { y0: q.head === undefined ? 2.46 : q.head, y1: WH, stop: false, eye: false, trim: false }));
  }

  // A bilingual door plate at the height a real one sits. Glyph yaw faces +z at 0 and +x at PI/2,
  // so text is nudged along that normal rather than into the plate behind it.
  function plate(x, y, z, yaw, hz, en, tag) {
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    box(x, y, z, .38, .21, .030, bronzeD, { hard: true, ry: yaw, gloss:AGED, tag });
    const fx = x + nx * .024, fz = z + nz * .024;
    glyphs(fx, y + .034, fz, yaw, hz, { size: .080, gap: .013, color: bronzeL, mode: 1, lift: .006, tag });
    if (en) glyphs(fx, y - .056, fz, yaw, en,
      { size: .040, gap: .009, color: linen, mode: 1, lift: .006, tag });
  }

  // A ceiling downlight: canopy, emissive lens AND a real point light. The shell lights this plate
  // from three coves on the x=0 centreline, which was enough while the floor was one open hall; a
  // room with four walls round it renders black without its own fitting. gl.js keeps only the eight
  // lights nearest the camera, so these cost nothing while the player is elsewhere.
  function downlight(x, z, day = .05, night = .30, power = .28, radius = 5.4) {
    const tag = newTag('筒灯');
    cyl(x, 4.04, z, .16, .07, bronzeD, { gloss:AGED, tag });
    A.luminous(cyl(x, 3.975, z, .125, .035, warm, { mode: 1, tag }), day, night);
    const l = A.light(x, 3.84, z, [1, .86, .66], power, radius); l.on = true; return l;
  }

  // ================================================================= the envelope and its masses
  // Everything outside the plan is filled solid and faced, so there is no floor the player can see
  // and never stand on. The shell's own perimeter box stops at x +/-21.78 and z +/-14.78 and
  // carries no collider at all, so without these the plate walks out to the camera zone limit.
  mass(-21.40, 21.40, -15.30, SW0);                       // south band, behind the south wall
  mass(-21.40, 21.40, NW1, 15.30);                        // north band
  mass(-21.40, WW0, SW1, -8.86);                          // west band, south of the fire stair
  mass(-21.40, WW0, -5.34, 15.30);                        // west band, north of it
  mass(-21.40, WW1, -5.34, CN1);                          // the stub between stair and treatment
  mass(FARX, 21.40, -15.30, 15.30);                       // the riser zone beyond the lift bank
  mass(BANK, FARX, SW0, -10.00);                          // under the bank's sealed south run
  mass(BANK, FARX, VN0, 3.55);                            // between bank and service car
  mass(BANK, FARX, 6.65, NW1);                            // north of the service car

  // West wall. Its east face is treatment / reception / lounge; behind it is structure.
  part(WW0, WW1, SW1, -8.86, { nocut: true });
  for (const [a, b] of [[-5.34, 2.00], [2.00, 9.00], [9.00, NW1]])
    part(WW0, WW1, a, b, { nocut: true });
  face(WW1, -17.70, -8.86, -5.34, { trim: false });        // the fire stair's own east return

  // South wall, from the west wall to the changing suite's east wall, and on east of it as the
  // back of the two south-east rooms.
  for (const [a, b] of [[-17.84, -5.06], [-5.06, 1.22], [1.22, 5.68], [5.68, 10.26],
                        [10.26, 14.28], [14.28, QE1]]) part(a, b, SW0, SW1, { nocut: true });

  // North wall, the full width of the plate.
  for (const [a, b] of [[-17.84, -11.37], [-11.37, -1.00], [-1.00, 8.38], [8.38, BANK]])
    part(a, b, NW0, NW1, { nocut: true });

  // ============================================================ the south corridor: the spine
  // 1.10 m clear between CS1 and CN0, running 28 m from the west wall to the arrival hall. Every
  // private room on the south half of the plate opens off it. The five openings below are the
  // only ways in, and each is 1.10 m — measurably a door rather than a squeeze, and measured by
  // the flood fill rather than asserted here.
  const CDOOR = [
    [-15.80, -14.70, '安全楼梯', 'TO FIRE STAIR'],       // reception, at the stair end
    [-10.65, -9.55, '水疗接待', 'SPA RECEPTION'],        // reception, on the desk's centreline
    [-2.40, -1.30, '湿区', 'WET AREA'],                  // the sauna / steam / plunge suite
    [3.30, 4.40, '女更衣', 'WOMEN'],                     // under the fit-out's own 女更衣 portal
    [7.70, 8.80, '男更衣', 'MEN'],                       // under the fit-out's own 男更衣 portal
  ];
  {
    const edges = [-17.84];
    for (const d of CDOOR) { edges.push(d[0], d[1]); }
    edges.push(CE1);
    for (let i = 0; i < edges.length; i += 2) part(edges[i], edges[i + 1], CS0, CS1);
    for (const d of CDOOR) {
      opening('x', d[0], d[1], CS0, CS1, { head: 2.46, tag: d[2] });
      part(d[0], d[1], CS0, CS1, { y0: 2.46, y1: WH, stop: false, eye: false, trim: false, tag: d[2] });
      plate(d[1] + .34, 1.58, CS0 - .012, Math.PI, d[2], d[3], d[2]);
    }
  }

  // Corridor north side. West of x -11.78 it is treatment 甲's south wall; between -11.78 and
  // -5.88 the corridor opens into the spa hall; east of that it is the gym's south wall, split by
  // the fit-out's 5.86 m 健身房 portal.
  part(-17.84, TE1, CN0, CN1, { tag: '理疗室' });
  part(GW0, -2.73, CN0, CN1, { tag: '健身房' });
  part(3.13, GE1, CN0, CN1, { tag: '健身房' });
  // A lined reveal carries the opening north from the wall to the fit-out's portal posts, so the
  // bronze frame reads as the inner face of a deep threshold instead of a gate loose in the room.
  for (const [a, b] of [[-2.89, -2.73], [3.13, 3.29]]) {
    part(a, b, CN1, -4.58, { c: timberL, gloss: .28, trim: false, bulk: false, tag: '健身房' });
    solid(a, b, CN1, -4.58);
  }
  // Bulkhead across the gym's 5.86 m opening, so the corridor ceiling is continuous over it.
  box(0.20, (WH + EYE) / 2, (CN0 + CN1) / 2, 5.86, EYE - WH, T, stoneWD,
    {...MAT.stone,  hard: true, gloss: .10, tag: '健身房' });
  for (const x of [-14.4, -8.6, -2.4, 3.4, 9.0]) downlight(x, -5.70, .05, .34, .26, 5.2);
  // The corridor is a long dark run; a bronze reveal at skirting height gives it a direction.
  const corrTag = newTag('四楼走廊');
  for (const z of [CS1 + .01, CN0 - .01]) flat(-3.75, .026, z, 28.0, .045, bronze,
    { gloss:AGED, tag: corrTag });
  flat(-3.75, .019, -5.69, 28.0, 1.06, stoneD,
    { mode: 7, gloss: .15, mat: 'tile', matScale: .50, matAmt: .18, tag: corrTag });

  // ====================================================== the south range: reception, wet, changing
  part(RE0, RE1, SW1, CS0, { tag: '水疗接待' });          // reception / wet suite party wall
  part(XE0, XE1, SW1, CS0, { tag: '更衣室' });            // wet suite / changing party wall
  part(CP0, CP1, SW1, CS0, { tag: '更衣室' });            // 女 / 男 party wall
  // Changing east wall. The fit-out's own 4.4 m dark-glass screen already stands on this line at
  // z -12.55..-8.15 with no collider; that stretch gets the collider it never had rather than a
  // second slab of plaster z-fighting with it.
  part(CE0, CE1, SW1, -12.55, { tag: '更衣室' });
  part(CE0, CE1, -8.15, CS1, { tag: '更衣室' });
  mass(CE0, CE1, -12.55, -8.15);
  box((CE0 + CE1) / 2, (2.73 + EYE) / 2, -10.35, T, EYE - 2.73, 4.40, stoneWD,
    {...MAT.stone,  hard: true, gloss: .10, tag: newTag('更衣室顶') });

  // ============================================================== treatment wing, west of the hall
  // Two rooms, each with a 1.10 m door in its east wall placed inside the gap the fit-out's silk
  // screens at x -11.72 already leave (z -4.20..-1.80 and z 0.95..3.35).
  portalZ(TE0, TE1, CN0, TP0, -3.35, -2.25, { tag: '理疗室' });
  portalZ(TE0, TE1, TP1, TN1, 1.75, 2.85, { tag: '理疗室' });
  part(-17.84, TE1, TP0, TP1, { tag: '理疗室' });         // party wall between the two rooms
  part(-17.84, LE1, TN0, TN1);                            // treatment 乙 north / court south
  plate(TE1 + .012, 1.58, -2.80, Math.PI / 2, '理疗室 一', 'TREATMENT 1', '理疗室');
  plate(TE1 + .012, 1.58, 2.30, Math.PI / 2, '理疗室 二', 'TREATMENT 2', '理疗室');

  // ================================================================ relaxation lounge and its court
  portalXr(LS0, LS1, -17.84, LE1, -14.60, -13.50, { tag: '放松茶廊' });
  portalZ(LE0, LE1, LS1, NW0, 8.60, 9.70, { tag: '放松茶廊' });
  plate(LE1 + .012, 1.58, 9.15, Math.PI / 2, '放松茶廊', 'TEA LOUNGE', '放松茶廊');

  // ============================================================================== the fitness room
  // East door on the guest spine's [14,-3.70] -> [5,-3.70] leg; west door on its [0,0] -> [-8,1.10]
  // leg. Both are 1.10 m and both were placed against A.route, not by eye.
  portalZ(GW0, GW1, CN0, PS0, 0.35, 1.45, { tag: '健身房' });
  portalZ(GE0, GE1, CN0, PS0, -4.25, -3.15, { tag: '健身房' });
  plate(GE1 + .012, 1.58, -3.70, Math.PI / 2, '健身房', 'FITNESS', '健身房');

  // ================================================================================== the pool hall
  // South wall east of the water, then the east wall with a staff door on the fit-out's own jade
  // service route (its east-west leg lands at z 4.75..5.45).
  portalXr(PS0, PS1, 6.60, PE1, 7.20, 8.30);
  portalZ(PE0, PE1, PS0, NW0, 4.70, 5.80, { tag: '员工通道' });
  plate(PE1 + .012, 1.58, 6.60, Math.PI / 2, '员工通道', 'STAFF ONLY', '员工通道');

  // ============================================================ service hall and its linen store
  portalXr(VN0, VN1, PE1, BANK, 8.60, 9.70);
  portalZ(KW0, KW1, KS0, NW0, 12.60, 13.70, { tag: '布草间' });
  part(KW1, BANK, KS0, KS1, { tag: '布草间' });
  plate(KW0 - .012, 1.58, 13.15, -Math.PI / 2, '布草间', 'LINEN', '布草间');
  plate(9.70 + .34, 1.58, VN0 - .012, Math.PI, '员工通道', 'STAFF ONLY', newTag('四楼员工牌'));

  // ==================================================== south-east: couples' suite and treatment 三
  {
    const edges = [CE1, 11.70, 12.80, 15.50, 16.60, QE1];
    const qTag = newTag('四楼东理疗');
    for (let i = 0; i < edges.length; i += 2) part(edges[i], edges[i + 1], QN0, QN1, { tag: qTag });
    for (const [a, b, hz, en] of [[11.70, 12.80, '双人理疗室', 'COUPLE SUITE'],
                                  [15.50, 16.60, '理疗室 三', 'TREATMENT 3']]) {
      opening('x', a, b, QN0, QN1, { head: 2.46, tag: hz });
      part(a, b, QN0, QN1, { y0: 2.46, y1: WH, stop: false, eye: false, trim: false, tag: hz });
      plate(b + .34, 1.58, QN1 + .012, 0, hz, en, hz);
    }
  }
  part(QP0, QP1, SW1, QN0);
  part(QE0, QE1, SW1, QN0);
  // ================================================ the wet suite: sauna, steam room and hot plunge
  // 48 m² of plate between reception and the changing rooms carried no programme at all — it was
  // the largest piece of blank floor on the level. A spa's wet suite belongs exactly here, next to
  // the changing rooms and off the same corridor, so that is what goes in it.
  flat(-1.92, .019, -10.17, 6.12, 7.54, stoneD,
    { mode: 7, gloss: .17, mat: 'tile', matScale: .44, matAmt: .22, tag: '湿区' });
  flat(-1.92, .024, -10.17, 5.72, 7.14, stoneL, { mode: 7, gloss: .13, tag: '湿区' });
  // Sauna cabin, lined in timber inside and out so it reads as a box set into the room.
  portalZ(-2.36, -2.20, SW1, -11.20, -12.90, -11.80, { c: timberL, gloss: .26, tag: '桑拿房' });
  part(-4.98, -2.20, -11.20, -11.04, { c: timberL, gloss: .26, tag: '桑拿房' });
  plate(-2.18, 1.58, -12.35, Math.PI / 2, '桑拿房', 'SAUNA', '桑拿房');
  flat(-3.67, .022, -12.57, 2.62, 2.74, timberL, {...MAT.timber, mode: 6, gloss: .16, tag: '桑拿房' });
  for (const [y, z, d] of [[.44, -13.30, .58], [.90, -13.62, .54]]) {
    box(-3.67, y, z, 2.58, .10, d, timberL, {...MAT.timber, hard: true, mode: 6, gloss: .22, tag: '桑拿房' });
    box(-3.67, y - .17, z, 2.40, .24, d - .12, timber, {...MAT.timber, hard: true, mode: 6, gloss: .18, tag: '桑拿房' });
  }
  solid(-4.98, -2.36, -13.94, -13.00);
  box(-4.62, .42, -12.30, .62, .84, .62, stoneB, {...MAT.stone, hard: true, gloss: .26, tag: '桑拿房' });
  for (let i = 0; i < 6; i++) ball(-4.62 + Math.cos(i * 2.4) * .18, .90 + (i % 3) * .06,
    -12.30 + Math.sin(i * 2.4) * .18, .11, .09, .11, stoneL, { gloss: .30, tag: '桑拿房' });
  solid(-4.93, -4.31, -12.61, -11.99);
  A.luminous(box(-3.67, 2.30, -11.12, 2.20, .06, .05, warm, { mode: 1, tag: '桑拿房' }), .22, .34);
  downlight(-3.67, -12.60, .10, .26, .20, 3.4);
  A.thing('桑拿房', -4.60, 1.10, -12.30, '干蒸房里温度很高，进去前请先淋浴。',
    'The dry sauna runs hot; shower before you go in.', '桑拿 is sauna.',
    { tag: '桑拿房', focus: [-3.60, -12.10], reach: 1.9 });

  // Steam room, the same box in glazed tile rather than timber.
  portalZ(-2.36, -2.20, -11.04, -8.56, -10.30, -9.20, { c: celadonL, gloss: .34, tag: '蒸汽房' });
  part(-4.98, -2.20, -8.56, -8.40, { c: celadonL, gloss: .34, tag: '蒸汽房' });
  plate(-2.18, 1.58, -9.75, Math.PI / 2, '蒸汽房', 'STEAM ROOM', '蒸汽房');
  flat(-3.67, .022, -9.80, 2.62, 2.48, celadonL,
    { mode: 7, gloss: .30, mat: 'tile', matScale: .30, matAmt: .26, tag: '蒸汽房' });
  box(-3.67, .46, -10.72, 2.58, .14, .56, stoneL, {...MAT.stone, hard: true, gloss: .32, tag: '蒸汽房' });
  box(-3.67, .22, -10.72, 2.40, .44, .46, stoneW, {...MAT.stone, hard: true, gloss: .26, tag: '蒸汽房' });
  solid(-4.98, -2.36, -11.04, -10.42);
  cyl(-4.86, .30, -9.60, .13, .60, bronzeD, { rz: Math.PI / 2, gloss:AGED, tag: '蒸汽房' });
  A.luminous(ball(-3.67, 2.42, -9.60, .30, .10, .30, celadonL, { mode: 1, tag: '蒸汽房' }), .16, .30);
  downlight(-3.67, -9.20, .09, .24, .18, 3.2);
  A.thing('蒸汽房', -4.60, 1.10, -9.80, '蒸汽房湿度大，请慢慢呼吸，最多待十分钟。',
    'The steam room is humid; breathe slowly and stay ten minutes at most.', '蒸汽 is steam.',
    { tag: '蒸汽房', focus: [-3.60, -9.80], reach: 1.9 });

  // Hot plunge, in the south-east corner of the wet hall. One collider, like the main pool.
  box(0.37, .17, -12.67, 1.54, .34, 2.62, stoneL, {...MAT.stone, hard: true, gloss: .26, tag: '汤池' });
  flat(0.37, .335, -12.67, 1.18, 2.26, waterC, { mode: 1, alpha: .74, gloss: .88, tag: '汤池' });
  for (const s of [-1, 1]) box(0.37 + s * .72, .35, -12.67, .10, .05, 2.62, bronze,
    { hard: true, gloss:AGED, tag: '汤池' });
  for (let i = 0; i < 4; i++) A.luminous(ball(-0.20 + i * .38, .30, -11.46, .07, .02, .07, warm,
    { mode: 1, tag: '汤池' }), .14, .26);
  solid(-0.40, 1.14, -13.98, -11.36);
  glyphs(0.37, .40, -11.40, 0, '汤池', { size: .12, gap: .03, color: bronzeL, mode: 1, lift: .006, tag: '汤池' });
  downlight(0.37, -12.67, .06, .30, .22, 4.0);
  A.thing('汤池', 0.37, 1.00, -11.30, '恒温汤池水温三十九度，泡池前请先冲洗。',
    'The hot plunge is kept at thirty-nine degrees; rinse before you get in.', '汤池 is a hot pool.',
    { tag: '汤池', focus: [0.37, -10.60], reach: 2.0 });

  // Rest bay north of the two cabins: cold bucket, two timber loungers and towels.
  box(-3.60, .44, -6.72, 2.40, .10, .48, timberL, {...MAT.timber, hard: true, mode: 6, gloss: .24, tag: '湿区' });
  box(-3.60, .22, -6.72, 2.20, .30, .36, timber, {...MAT.timber, hard: true, mode: 6, gloss: .20, tag: '湿区' });
  for (const s of [-1, 1]) box(-3.60 + s * 1.06, .22, -6.72, .12, .44, .44, stoneB,
    {...MAT.stone,  hard: true, gloss: .28, tag: '湿区' });
  for (const x of [-4.30, -2.90]) box(x, .56, -6.78, .58, .14, .34, linen,
    {...MAT.cloth,  mode: 7, gloss: .03, tag: '湿区' });
  solid(-4.85, -2.35, -6.98, -6.46);
  taper(-4.40, .55, -7.80, .34, 1.10, .30, timber, { gloss: .26, tag: '湿区' });
  cyl(-4.40, 1.14, -7.80, .34, .06, celadonL, { gloss: .34, tag: '湿区' });
  cyl(-4.40, 1.42, -7.80, .022, .52, bronzeD, { gloss:AGED, tag: '湿区' });
  solid(-4.75, -4.05, -8.15, -7.45);
  downlight(-3.30, -7.40, .05, .28, .22, 4.0);
  glyphs(-1.92, 2.62, CS0 - .02, Math.PI, '湿区 · 桑拿 · 蒸汽 · 汤池',
    { size: .085, gap: .016, color: celadonL, mode: 1, lift: .008, tag: '湿区' });

  // ============================================ the changing rooms the fit-out left symmetrical
  // The fit-out gave the west side three shower cubicles and the east side none, and put the only
  // bench on the east side of x 6.2. Now that a party wall exists, each room needs both.
  for (const x of [8.10, 9.14]) {
    box(x, 1.55, -13.20, .12, 2.75, 1.50, glassC, { hard: true, mode: 1, alpha: .25, gloss: .75, tag: '男淋浴' });
    box(x, .08, -13.20, .20, .16, 1.58, bronzeD, { hard: true, gloss:AGED, tag: '男淋浴' });
    box(x, 2.96, -13.20, .20, .10, 1.58, bronzeD, { hard: true, gloss:AGED, tag: '男淋浴' });
    cyl(x, 1.55, -12.47, .020, 2.75, bronzeD, { gloss:AGED, tag: '男淋浴' });
    solid(x - .06, x + .06, -13.95, -12.45);
  }
  for (const x of [8.62, 9.66]) {
    cyl(x, 2.52, -13.66, .13, .05, bronze, { gloss:AGED, tag: '男淋浴' });
    cyl(x, 2.74, -13.84, .024, .42, bronzeD, { gloss:AGED, tag: '男淋浴' });
    box(x, 1.05, -13.86, .10, .22, .06, bronzeL, { hard: true, gloss:POLISH, tag: '男淋浴' });
  }
  glyphs(8.88, 2.70, -12.36, 0, '淋浴',
    { size: .10, gap: .02, color: celadonL, mode: 1, lift: .007, tag: '男淋浴' });
  // A bench for the women's room, on the same detail as the fit-out's own.
  box(4.30, .06, -11.60, .50, .12, 2.30, stoneD, {...MAT.stone, hard: true, gloss: .12, tag: '女更衣凳' });
  box(4.30, .17, -11.60, .40, .18, 2.14, bronzeD, { hard: true, gloss:AGED, tag: '女更衣凳' });
  box(4.30, .31, -11.60, .34, .28, 2.00, timber, {...MAT.timber, hard: true, mode: 6, gloss: .30, tag: '女更衣凳' });
  box(4.30, .53, -11.60, .70, .16, 2.62, C('#cbbbab'), { mode: 7, gloss: .032, round: .07, tag: '女更衣凳' });
  box(4.30, .625, -11.60, .64, .07, 2.50, C('#d4d1c9'), { mode: 7, gloss: .020, round: .085, tag: '女更衣凳' });
  solid(3.95, 4.65, -12.91, -10.29);
  for (const [x, z] of [[3.20, -8.20], [3.20, -12.60], [8.60, -8.20], [7.00, -12.60]])
    downlight(x, z, .05, .30, .24, 4.4);

  // ====================================== south-east: a couples' suite and a third treatment room
  for (const [x0, x1, hz] of [[CE1, QP0, '双人理疗室'], [QP1, QE0, '理疗室 三']]) {
    const cx = (x0 + x1) / 2;
    flat(cx, .020, -11.50, x1 - x0 - .30, 4.60, stoneL,
      { mode: 7, gloss: .16, mat: 'tile', matScale: .50, matAmt: .18, tag: hz });
    flat(cx, .025, -11.50, x1 - x0 - .90, 4.00, hz === '双人理疗室' ? C('#8ca99a') : C('#aeb9b4'),
      { mode: 7, gloss: .12, tag: hz });
    // A RAISED PLATFORM, not two free-standing beds. Two 1.64 m bed colliders in a 3.86 m room
    // leave 0.28 m between their inflated footprints and 0.92 m of floor stranded behind them —
    // the first flood fill found exactly that, 11 cells at z -13.30, x 11.00..13.50. One platform
    // across the south half is honest about the same furniture and leaves a clear 1.54 m lane.
    const beds = hz === '双人理疗室' ? [cx - .92, cx + .92] : [cx];
    box(cx, .12, -12.57, x1 - x0, .24, 2.74, timberL, {...MAT.timber, hard: true, mode: 6, gloss: .26, tag: hz });
    box(cx, .25, -12.57, x1 - x0 - .12, .04, 2.62, timber, {...MAT.timber, hard: true, mode: 6, gloss: .20, tag: hz });
    for (const s2 of [-1, 1]) box(cx, .26, -12.57 + s2 * 1.37, x1 - x0, .05, .05, bronzeD,
      { hard: true, gloss:AGED, tag: hz });
    solid(x0, x1, SW1, -11.20);
    for (const bx of beds) {
      box(bx, .34, -12.57, .96, .20, 2.06, timberL, {...MAT.timber, hard: true, mode: 6, gloss: .28, round: .02, tag: hz });
      box(bx, .50, -12.57, .92, .16, 2.00, C('#cbbbab'), { mode: 7, gloss: .035, round: .06, tag: hz });
      box(bx, .61, -12.57, .88, .14, 1.94, C('#d4d1c9'), { mode: 7, gloss: .022, round: .085, tag: hz });
      capsule(bx, .78, -13.32, .10, .56, .10, celadon, { rz: Math.PI / 2, gloss: .025, tag: hz });
      for (const sz of [-1, 1]) box(bx, .70, -12.57 + sz * .92, .84, .06, .12, C('#d4d1c9'),
        { mode: 7, gloss: .02, tag: hz });
      shade(bx, -12.57, 1.10, 2.20, .18);
    }
    // Aroma shelf and an ink panel on the south wall, so the closed door has something behind it.
    box(cx, 1.72, SW1 + .07, x1 - x0 - 1.20, 2.10, .10, timber, {...MAT.timber, hard: true, mode: 6, gloss: .30, tag: hz });
    box(cx, 1.72, SW1 + .13, x1 - x0 - 1.60, 1.80, .025, linen, { hard: true, mode: 1, tag: hz });
    for (let i = 0; i < 5; i++) capsule(cx - .8 + i * .4, 1.40 + (i % 2) * .30, SW1 + .16, .026,
      .46 + (i % 3) * .12, .026, ink, { rz: i % 2 ? -.40 : .34, tag: hz });
    box(x0 + .39, .48, -9.73, .78, .96, .54, timberL, {...MAT.timber, hard: true, mode: 6, gloss: .28, tag: hz });
    box(x0 + .39, .98, -9.73, .84, .06, .60, stoneL, {...MAT.stone, hard: true, gloss: .24, tag: hz });
    solid(x0, x0 + .78, -10.00, -9.46);
    for (const [t, dz] of [[.30, -.16], [.55, .16]]) taper(x0 + .39, 1.12, -9.73 + dz, .075,
      .22, .065, t > .4 ? celadon : C('#bbcbd0'), { gloss: .28, tag: hz });
    // H236 · these two rooms used to be lit exactly like the pool hall — same 0.24-power, 4.2 m
    // fitting, twice. A treatment room is dim, warm and low, so the ceiling drops to a third of
    // that and the room's light comes from a standing paper drum at 1.44 m instead.
    downlight(cx, -12.40, .03, .14, .09, 3.8);
    downlight(cx, -10.10, .03, .14, .09, 3.8);
    {
      const lx = x1 - .45, lz = -9.90, tg = newTag('理疗室灯');
      cyl(lx, .04, lz, .19, .06, bronzeD, { gloss:AGED, tag: tg });
      cyl(lx, .78, lz, .016, 1.44, bronzeD, { gloss:AGED, tag: tg });
      cyl(lx, 1.66, lz, .22, .035, bronzeD, { gloss:AGED, tag: tg });
      A.luminous(cyl(lx, 1.48, lz, .21, .33, linen, { mode: 1, gloss: .10, tag: tg }), .13, .32);
      cyl(lx, 1.30, lz, .19, .035, bronzeD, { gloss:AGED, tag: tg });
      const lw = A.light(lx, 1.44, lz, [1, .70, .42], .32, 3.6); lw.on = true;
    }
    A.thing(hz, cx, 1.10, -12.20,
      hz === '双人理疗室' ? '双人房可以两位客人同时接受理疗。' : '单人理疗室提供全身按摩和头部护理。',
      hz === '双人理疗室' ? 'The couples’ suite takes two guests at once.'
        : 'The single treatment room offers full-body massage and head care.',
      '理疗室 is a treatment room.', { tag: hz, focus: [cx, -9.90], reach: 2.0 });
  }

  // =============================================================== the quiet court, 静心庭
  // The bay between treatment 乙 and the tea lounge. Open to the pool's west deck, so it is a
  // place rather than a pocket: raked stone, a water basin, planting and one bench.
  const courtTag = newTag('四楼静庭');
  flat(-14.55, .019, 6.46, 6.30, 2.72, stoneD,
    { mode: 7, gloss: .15, mat: 'tile', matScale: .46, matAmt: .20, tag: courtTag });
  flat(-15.20, .024, 6.46, 4.40, 2.20, stoneL, { mode: 7, gloss: .10, tag: courtTag });
  for (let i = 0; i < 7; i++) flat(-17.10 + i * .62, .028, 6.46, .05, 2.10, stoneW,
    {...MAT.stone,  gloss: .18, tag: courtTag });
  cyl(-12.20, .28, 6.90, .52, .56, stoneB, {...MAT.stone, gloss: .28, tag: courtTag });
  flat(-12.20, .565, 6.90, .86, .86, waterC, { mode: 1, alpha: .72, gloss: .90, tag: courtTag });
  cyl(-12.20, .90, 7.30, .028, .62, bronze, { rx: .5, gloss:AGED, tag: courtTag });
  solid(-12.74, -11.66, 6.36, 7.44);
  box(-15.20, .42, 5.30, 2.20, .16, .44, timberL, {...MAT.timber, hard: true, mode: 6, gloss: .26, tag: courtTag });
  for (const s of [-1, 1]) box(-15.20 + s * .92, .21, 5.30, .12, .42, .40, stoneB,
    {...MAT.stone,  hard: true, gloss: .28, tag: courtTag });
  solid(-16.32, -14.08, 5.08, 5.52);
  for (const x of [-16.90, -14.60]) {
    taper(x, .30, 7.36, .42, .60, .42, stoneB, {...MAT.stone, gloss: .22, tag: courtTag });
    for (let i = 0; i < 6; i++) ball(x + Math.cos(i * 2.4) * .22, .86 + (i % 2) * .20,
      7.36 + Math.sin(i * 2.4) * .22, .24, .16, .18, C('#526f5d'), { mode: 15, gloss: .07, tag: courtTag });
    solid(x - .44, x + .44, 6.92, 7.80);
  }
  for (const x of [-16.10, -12.90]) downlight(x, 6.40, .05, .26, .20, 3.8);
  glyphs(-15.20, 2.30, LS0 - .02, Math.PI, '静心庭',
    { size: .12, gap: .03, color: bronzeL, mode: 1, lift: .008, tag: courtTag });

  // ================================================================ the spa linen store, 布草间
  flat(16.08, .019, 11.03, 3.24, 6.54, stoneL,
    { mode: 7, gloss: .16, mat: 'tile', matScale: .50, matAmt: .18, tag: '布草间' });
  for (const z of [8.60, 10.30, 13.30]) {
    box(17.30, .07, z, .70, .14, 1.40, stoneD, {...MAT.stone, hard: true, gloss: .13, tag: '布草间' });
    box(17.30, 1.02, z, .60, 2.04, 1.30, C('#858c8d'), { hard: true, gloss: .40, tag: '布草间' });
    for (const y of [.52, 1.32]) {
      box(17.24, y, z, .48, .05, 1.22, C('#b9c1c0'), { hard: true, gloss: .46, tag: '布草间' });
      for (const dz of [-.32, .32]) for (let i = 0; i < 2; i++)
        box(17.22, y + .09 + i * .10, z + dz, .40, .09, .40, C('#d4d1c9'),
          { mode: 7, gloss: .02, tag: '布草间' });
    }
    solid(16.95, 17.65, z - .70, z + .70);
  }
  box(15.10, .48, 9.30, 1.02, .96, 1.66, C('#485354'), { hard: true, gloss: .38, tag: '布草间' });
  for (const s of [-1, 1]) cyl(15.10 + s * .40, .09, 9.30 + s * .62, .085, .06, C('#343a3b'),
    { rz: Math.PI / 2, tag: '布草间' });
  solid(14.55, 15.65, 8.42, 10.18);
  for (const z of [9.20, 12.60]) downlight(15.90, z, .05, .30, .24, 4.4);
  glyphs(KW0 - .03, 2.62, 11.00, -Math.PI / 2, '布草间',
    { size: .12, gap: .03, color: bronzeL, mode: 1, lift: .008, tag: '布草间' });

  // ============================================================ the arrival hall in front of the bank
  // The fit-out laid the wayfinding axis and the 四楼 · 康体水疗 sign on the bank wall but left the
  // hall itself empty. Now that it is a room, give it a settee, planting and a terminated vista.
  flat(12.60, .017, -6.90, 9.60, 4.20, stoneD,
    { mode: 7, gloss: .17, mat: 'tile', matScale: .54, matAmt: .20, tag: '电梯厅' });
  box(12.40, .07, -7.60, 2.60, .14, .84, stoneD, {...MAT.stone, hard: true, gloss: .13, tag: '电梯厅' });
  box(12.40, .30, -7.60, 2.44, .34, .72, timberL, {...MAT.timber, hard: true, mode: 6, gloss: .28, tag: '电梯厅' });
  box(12.40, .52, -7.60, 2.52, .14, .80, C('#cbbbab'), { mode: 7, gloss: .03, round: .07, tag: '电梯厅' });
  box(12.40, .90, -7.94, 2.44, .62, .16, celadon, { mode: 7, gloss: .03, round: .06, tag: '电梯厅' });
  solid(11.10, 13.70, -8.06, -7.14);
  for (const x of [10.90, 13.90]) {
    taper(x, .32, -7.60, .44, .64, .44, stoneB, {...MAT.stone, gloss: .22, tag: '电梯厅' });
    for (let i = 0; i < 6; i++) ball(x + Math.cos(i * 2.4) * .22, .92 + (i % 2) * .20,
      -7.60 + Math.sin(i * 2.4) * .22, .24, .16, .18, C('#526f5d'), { mode: 15, gloss: .07, tag: '电梯厅' });
    solid(x - .46, x + .46, -8.06, -7.14);
  }
  // Ink panel terminating the view west along the arrival axis, on the changing suite's east wall.
  const artTag = newTag('四楼水墨');
  box(CE1 + .07, 1.90, -7.90, .12, 2.30, 3.00, timber, {...MAT.timber, hard: true, mode: 6, gloss: .30, tag: artTag });
  box(CE1 + .13, 1.90, -7.90, .025, 2.02, 2.70, linen, { hard: true, mode: 1, tag: artTag });
  for (let i = 0; i < 7; i++) capsule(CE1 + .16, 1.22 + i * .18, -9.10 + i * .38, .028,
    .50 + (i % 3) * .14, .028, ink, { rz: i % 2 ? -.44 : .36, tag: artTag });
  ball(CE1 + .17, 1.30, -6.70, .10, .10, .026, lacquer, { mode: 1, tag: artTag });
  for (const [x, z] of [[9.40, -7.40], [13.20, -7.40], [9.40, 0.60], [13.60, 0.60], [16.20, -0.60]])
    downlight(x, z, .05, .30, .24, 4.6);
  glyphs(CE1 + .16, 2.86, -7.90, Math.PI / 2, '康体水疗',
    { size: .13, gap: .03, color: bronzeL, mode: 1, lift: .008, tag: artTag });

  // ============================================================== poolside screen and room lights
  // The gym's north edge IS the water: the pool's own collider stops the body at z 1.28, so a
  // glazed screen standing on the north half of the coping needs no collider of its own and gives
  // the two rooms a boundary the eye can see. Six panes, so six translucent draw calls.
  for (let i = 0; i < 6; i++) {
    const x = -4.75 + i * 1.92;
    box(x, 1.30, 1.68, 1.86, 2.06, .035, glassC, { hard: true, mode: 1, alpha: .22, gloss: .82, tag: '泳池围栏' });
    cyl(x - .96, 1.30, 1.68, .021, 2.10, bronzeD, { gloss:AGED, tag: '泳池围栏' });
  }
  cyl(0.65, 2.36, 1.68, .023, 11.60, bronzeD, { rz: Math.PI / 2, gloss:AGED, tag: '泳池围栏' });
  cyl(6.17, 1.30, 1.68, .021, 2.10, bronzeD, { gloss:AGED, tag: '泳池围栏' });

  // ==================================================== H233 / H234 · the water at a close view
  // HT4-pool-water and HT4-pool-day both came back with the surface as one flat teal slab. The
  // ripples and caustics js/hotel-service.js animates are under the water plane at alpha 0.30-0.52
  // and do not survive it, and there is no reflection at the pool edge at all — which is the one
  // thing HOTEL.md:217 says must be either right or deliberately suggested, never broken.
  //
  // Everything below sits ON the water (y 0.047) or on the deck, and every piece of it is OPAQUE.
  // That is the whole trick: an alpha < 0.999 prop does not batch and costs a draw call each, and
  // a pale opaque streak a few percent lighter than the water reads as a swell exactly as well as
  // a translucent one. Thirteen animated props, zero added translucent draw calls.
  // The tints are deliberately only a few percent off the water's own #4f8993. The first pass used
  // #7fb6ba swell and #b7c2b2 reflections spanning the full 11.6 m width, and HT4-pool-water came
  // back reading as painted lane markings on a tiled floor — high-contrast bars, dead straight,
  // edge to edge. Contrast and span were the whole problem, not the technique.
  const waterS = C('#57919b'), waterH = C('#5f9aa2'), wetDeck = C('#2f4a4e'), reflW = C('#7ea9a4');
  const anim4 = (p, x, y, z, r = 1) => { p.ob = null; p.fixed = true; p.cx = x; p.cy = y; p.cz = z; p.r = r; p._m0 = p.m; return p; };

  // --- swell. Five streaks between the lane ropes (which float at y 0.105), staggered in x and in
  // length so no two share an end, each with its own drift rate. A band that spans the pool reads
  // as a line painted on it; a band that stops short of both edges reads as a swell.
  const swell = [];
  const SW = [[-6.30, 5.40], [0.60, 6.20], [-4.10, 4.60], [1.90, 5.80], [-5.20, 6.60]];
  for (let i = 0; i < 5; i++) {
    const z = 2.45 + i * 1.28;
    const p = flat(SW[i][0], .0505 + i * .0006, z, SW[i][1], .26 + (i % 2) * .12,
      i % 2 ? waterS : waterH, { mode: 1, gloss: .70, tag: '泳池水面' });
    anim4(p, SW[i][0], .05, z, 4.2); p._i = i; swell.push(p);
  }
  // --- the reflections. Eight lanterns hang at x -8/-4/0/4, z 3.2/6.8 (js/hotel-service.js:1280),
  // so eight columns sit directly beneath them, smeared along z toward the south cameras. This is a
  // painted reflection and is meant to be read as one: it is placed from the fixture positions, it
  // moves with the swell, and it cannot go wrong the way a render-to-texture can.
  const refl = [];
  for (const x of [-8, -4, 0, 4]) for (const z of [3.2, 6.8]) {
    const p = flat(x, .0535, z, .24, 1.15, reflW, { mode: 1, gloss: .82, glow: .05, tag: '泳池水面' });
    anim4(p, x, .053, z, 1.3); p._i = x * .31 + z; refl.push(p);
  }
  // --- the wet edge. A dark, glossy band of deck immediately outside each coping run: the stone a
  // swimmer has just walked over. Opaque, four flats, and it is what makes the coping stop reading
  // as dry pale slab butted against water.
  for (const [x, z, w, d] of [[-2.00, 1.13, 17.00, .46], [-2.00, 8.87, 17.00, .46],
                              [-10.62, 5.00, .46, 7.20], [6.62, 5.00, .46, 7.20]])
    flat(x, .0215, z, w, d, wetDeck, { mode: 7, gloss: .86, tag: '泳池' });
  // Four short warm smears on the wet band under the outer lanterns, so the reflection carries off
  // the water and onto the stone instead of stopping dead at the coping.
  for (const x of [-8, -4, 0, 4]) for (const z of [1.13, 8.87])
    flat(x, .0225, z, .30, .40, reflW, { mode: 1, gloss: .70, glow: .05, tag: '泳池' });

  A.onTick(t => {
    for (const p of swell) {
      const i = p._i;
      p.m = M.mul(M.trans(Math.sin(t * (.13 + i * .021) + i * 1.7) * 1.35, 0,
        Math.sin(t * .09 + i * 2.1) * .09), p._m0);
      p.glow = .012 + .022 * (.5 + .5 * Math.sin(t * .37 + i * .9));
    }
    for (const p of refl) {
      const i = p._i;
      p.m = M.mul(M.trans(Math.sin(t * .21 + i) * .085, 0, Math.sin(t * .16 + i * .7) * .11), p._m0);
      p.glow = .055 + .045 * (.5 + .5 * Math.sin(t * .43 + i));
    }
  });

  // Every newly enclosed room needs its own fitting; the shell lights this plate from three coves
  // on the x=0 centreline and a room with four walls round it renders black without one.
  // The two treatment rooms are NOT in this list — see the treatment lighting below.
  for (const [x, z] of [[-14.60, -11.30], [-9.00, -11.90], [-16.20, -7.30],
                        [-14.20, 11.40],
                        [-8.40, 3.40], [-1.40, 6.20], [11.20, 5.60], [11.20, 11.40]])
    downlight(x, z, .05, .32, .26, 5.6);

  // ================================================== H236 · the treatment rooms are not the pool
  // HT4-treatment came back the brightest white room in the building: the same 0.26-power 5.6 m
  // downlight the pool hall and the service corridor get, on white plaster, at 4.09 m. A treatment
  // room's whole identity is that it is dim, warm and low, so it stops borrowing the wet-side
  // fitting and gets its own — a quarter of the ceiling power, plus a warm lamp at table height
  // which is what actually gives the room its lower centre of gravity.
  //
  // hotel-service's two treatment tables stand at x -14.20, z -3.00 and z 2.15, so the standing
  // lamp goes in the room's east corner beside the table rather than over the client. The two
  // south-east rooms already carry their own pair of downlights and get the same treatment where
  // they are built, further down this file, rather than a third fitting bolted on from here.
  for (const [rx, rz, lx, lz, half] of [[-14.90, -3.00, -12.55, -4.35, 2.70],
                                        [-14.90, 2.15, -12.55, 0.80, 2.70]]) {
    const tg = newTag('理疗室灯');
    downlight(rx, rz, .03, .12, .07, 3.6);
    // Paper drum on a slim stem. Low, warm and physically present, so the pool of light in the
    // shot has a source in the shot — unexplained warm light on a table reads as a bug.
    cyl(lx, .04, lz, .19, .06, bronzeD, { gloss:AGED, tag: tg });
    cyl(lx, .78, lz, .016, 1.44, bronzeD, { gloss:AGED, tag: tg });
    cyl(lx, 1.66, lz, .22, .035, bronzeD, { gloss:AGED, tag: tg });
    A.luminous(cyl(lx, 1.48, lz, .21, .33, linen, { mode: 1, gloss: .10, tag: tg }), .13, .32);
    cyl(lx, 1.30, lz, .19, .035, bronzeD, { gloss:AGED, tag: tg });
    const lw = A.light(lx, 1.44, lz, [1, .70, .42], .32, 3.6); lw.on = true;
    // A dark reveal at skirting height turns white plaster into a room with a floor line.
    for (const s of [-1, 1]) box(rx + s * half, .13, rz, .04, .26, 2.00, stoneB,
      {...MAT.stone,  hard: true, gloss: .30, tag: tg });
  }

  // Dimming the fitting was not enough on its own — HT4-treatment came back only marginally darker,
  // because the room's value structure, not its light level, is what made it read like the pool
  // hall: white plaster floor to soffit on all four faces. A linen wainscot to 1.56 m with a bronze
  // cap fixes that without touching a single light, and it is the finish a treatment room has.
  // The east face is split around each room's own door opening (portalZ at z -3.35..-2.25 and
  // z 1.75..2.85), because a wainscot drawn across a doorway is a wall drawn across a doorway.
  {
    const wain = C('#c0b09a'), wainD = C('#9d8b76');
    const band = (cx, cy, cz, w, h, d, tg) => {
      box(cx, cy, cz, w, h, d, wain, {...MAT.timber, hard: true, mode: 6, gloss: .16, tag: tg });
      box(cx, 1.585, cz, w + (w > d ? 0 : .03), .05, d + (w > d ? .03 : 0), bronzeD,
        { hard: true, gloss:AGED, tag: tg });
    };
    for (const [z0, z1, dz0, dz1] of [[CN1, TP0, -3.35, -2.25], [TP1, TN0, 1.75, 2.85]]) {
      const tg = newTag('理疗室墙裙'), cz = (z0 + z1) / 2, dep = z1 - z0;
      band(-17.78, .78, cz, .04, 1.56, dep - .04, tg);                     // west face
      band(-14.89, .78, z0 + .06, 5.86, 1.56, .04, tg);                    // south face
      band(-14.89, .78, z1 - .06, 5.86, 1.56, .04, tg);                    // north face
      for (const [a, b] of [[z0 + .02, dz0], [dz1, z1 - .02]])             // east face, both sides
        if (b - a > .05) band(-12.00, .78, (a + b) / 2, .04, 1.56, b - a, tg);
      // A darker floor inside the wainscot: the pale stone that reads as clinical under a bright
      // fitting reads as calm under a dim one only once it stops being the brightest surface.
      flat(-14.89, .028, cz, 5.70, dep - .14, wainD, { mode: 7, gloss: .09, tag: tg });
    }
  }

  // ================================================================================ camera contract
  // Registered smallest-first: js/hotel.js roomAt() takes the first authored hit, so a nested
  // volume has to come before the room that contains it. These are the rooms AS BUILT.
  A.cameraRoom('hotel4-sauna', -4.98, -2.36, SW1, -11.20, 2.20);
  A.cameraRoom('hotel4-steam', -4.98, -2.36, -11.04, -8.56, 2.20);
  A.cameraRoom('hotel4-wet', RE1, XE0, SW1, CS0, 2.90);
  A.cameraRoom('hotel4-treat1', WW1, TE0, CN1, TP0, 3.00);
  A.cameraRoom('hotel4-treat2', WW1, TE0, TP1, TN0, 3.00);
  A.cameraRoom('hotel4-treat-couple', CE1, QP0, SW1, QN0, 2.80);
  A.cameraRoom('hotel4-treat3', QP1, QE0, SW1, QN0, 2.70);
  A.cameraRoom('hotel4-changing-w', XE1, CP0, SW1, CS0, 2.40);
  A.cameraRoom('hotel4-changing-m', CP1, CE0, SW1, CS0, 2.60);
  A.cameraRoom('hotel4-linen', KW1, BANK, KS1, NW0, 2.80);
  A.cameraRoom('hotel4-court', WW1, LE0, TN1, LS0, 2.75);
  A.cameraRoom('hotel4-lounge', WW1, LE0, LS1, NW0, 3.20);
  A.cameraRoom('hotel4-reception', WW1, RE0, SW1, CS0, 3.60);
  A.cameraRoom('hotel4-corridor', WW1, CE1, CS1, CN0, 1.60);
  A.cameraRoom('hotel4-gym', GW1, GE0, CN1, PS0, 3.50);
  A.cameraRoom('hotel4-service', PE1, BANK, VN1, NW0, 3.60);
  A.cameraRoom('hotel4-arrival', GE1, BANK, QN1, VN0, 3.80);
  A.cameraRoom('hotel4-pool', TE1, PE0, PS1, NW0, 4.20);


});

// ============================================================== the five cards this file opened
// .hotelcheck.js reports 桑拿房, 蒸汽房, 汤池, 双人理疗室 and 理疗室 三 as dead interaction
// labels. All five are this file's own `A.thing()` calls — the wet suite and the two south-east
// rooms it built — so all five are this file's to close. H236 asks that the treatment rooms are
// enterable AND quiet; a room you can walk into whose card opens onto nothing is neither.
Object.assign(HotelUse.hotel4, {
  '桑拿房': { zh: '进干蒸房', py: 'jìn gānzhēngfáng', en: 'take the dry sauna',
    secs: 2.8, mins: 15, gain: { rest: 8, mood: 5 }, pose: { type: 'sit' },
    done: '干蒸出了汗，出来先冲个凉水。',
    doneTr: 'You sweat it out in the dry heat, then rinse cool on the way out.' },
  '蒸汽房': { zh: '进蒸汽房', py: 'jìn zhēngqìfáng', en: 'take the steam room',
    secs: 2.8, mins: 12, gain: { rest: 7, mood: 5 }, pose: { type: 'sit' },
    done: '蒸汽里待了十分钟，呼吸慢下来了。',
    doneTr: 'Ten minutes in the steam and your breathing has slowed right down.' },
  '汤池': { zh: '泡汤池', py: 'pào tāngchí', en: 'soak in the hot pool',
    secs: 3.0, mins: 18, gain: { rest: 10, mood: 6 }, pose: { type: 'sit' },
    done: '三十九度的水泡到肩膀，走出来腿是软的。',
    doneTr: 'Thirty-nine degrees up to the shoulders; you come out with soft legs.' },
  '双人理疗室': { zh: '预约双人理疗', py: 'yùyuē shuāngrén lǐliáo', en: 'book the couples’ suite',
    secs: 2.6, mins: 6, gain: { mood: 6 }, pose: { type: 'check' },
    done: '双人房排在下午，两张床一起做。',
    doneTr: 'The couples’ suite is booked for the afternoon, both tables together.' },
  '理疗室 三': { zh: '预约理疗', py: 'yùyuē lǐliáo', en: 'book a treatment',
    secs: 2.4, mins: 5, gain: { mood: 5 }, pose: { type: 'check' },
    done: '三号房排上了全身按摩，理疗师会来叫你。',
    doneTr: 'Room three is booked for a full-body massage; the therapist will call you.' },
});
