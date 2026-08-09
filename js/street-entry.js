// 门斗 — the door seam, street side. Registered into StreetFit; see STREET.md problem 1.
//
// What this file is for, in one sentence: going into your own building should be a threshold you
// walk through, not a button you press.
//
// The shell already draws a 单元门 at `S.DOOR` — a brick surround, a concrete canopy on two
// brackets, two security leaves folded flat to the facade, and behind them a flight of stairs in
// forced perspective (street.js:1199). None of that is walkable and none of it is touched here.
// It is a picture of a doorway painted on the front of a block, and the moment you press USE you
// are somewhere else. This file builds the piece that was missing between the two: a 门斗, the
// glazed wind lobby that is bolted onto the front of half the 单元门 in 朝阳区, so that there is a
// metre and a half of roofed, floored, lit room to cross before the door.
//
// ---------------------------------------------------------------- why it projects, and not recesses
//
// The obvious build is a recess: cut a porch into the block and stand in the hole. That is not
// available. The block is one collider — `solid(NB.x0 - .12, NB.x1 + .12, NB.z0, NB.z1 + .10)` —
// and there is no carving a hole in a box, which is the same wall street.js hit when it drew the
// stairs in forced perspective rather than building them. Worse, the alley's walkable zone stops
// at `z0 = -AZ = -2.35`, and `clampMove` spends the 0.30 m body radius on top of that: the body
// cannot stand north of **z = -2.05** anywhere on this street, which is 0.90 m clear of the
// facade. A recess would be a room you can look into and never enter.
//
// So the 门斗 is built the way the real ones are: a later addition standing *out* from the wall,
// under the block's own canopy, on the pavement. That is not a compromise — 加建门斗 is what
// actually happened to these blocks in the nineties, and the aluminium-and-glass box in front of
// a 1980s brick 单元门 is one of the most recognisable objects on a Beijing residential street.
//
// ---------------------------------------------------------------- matching the other side
//
// It has to read as one doorway seen from two sides, so every controlling number is taken from
// the lobby's own 门斗 (`js/home-lobby.js:442`) rather than invented here:
//
//     lobby                                     street (this file)
//     street plane      PZ = -4.94              mouth plane        z = -1.06
//     jambs             x = ±1.84               side frame         x = ±1.80
//     side screens      x = ±1.86               side screens       x = ±1.80
//     head              Y + 2.35                head               y = 2.32
//     porch depth       1.02 m (-4.94→-3.92)    porch depth        1.57 m (-2.63→-1.06)
//     clear walk-through 1.84 m                 clear mouth        1.72 m
//     finish            alu + glass, red header finish             alu + glass, red header
//     header text       杨柳胡同十八号楼          fascia text        杨柳胡同十八号楼
//
// The frame line is ±1.80 rather than the lobby's ±1.84 for one measured reason: the shell's
// canopy brackets are tilted (`rz: ±.20`), which throws a 0.18 m box out to x = 1.703, and the
// letterbox bank's inner edge is at x = 1.89. ±1.80 is the only line with real clearance on both
// sides — 4.7 cm off the bracket, 4.0 cm off the letterboxes. 8 cm on a 3.6 m opening is not a
// difference anybody reads; a box intersecting a bracket is.
//
// ---------------------------------------------------------------- what was deliberately not built
//
// The 信报箱 already exists (street.js, eight boxes with flat numbers on them; 202 is yours —
// it said 301 until item 52, and the flat has been 202 on deck 2 the whole time)
// and so does the notice board. Both now stand immediately *outside* the porch's side screens,
// under the old canopy, which is where half the real ones are; both are still within reach of a
// body standing at z = -2.05. Building a second bank inside the porch would have been two
// letterbox banks two metres apart. Same for the stairs, the canopy and the folded leaves: this
// file adds, it does not restate.
//
// ---------------------------------------------------------------- the one number that hurts
//
// The body stops at z = -2.05, so it stands 0.58 m short of the step. That is the alley zone's
// `z0`, in the shell, not here. See the report: `z0: -2.75` on the alley zone (or a small extra
// zone over the porch footprint) is the one edit that would let you stand on the threshold stone
// instead of in front of it. Everything below is built so that edit changes nothing but how far
// in you can walk.
StreetFit['entry'] = S => {
  const { box, cyl, ball, cap, flat, glyphs, solid, shade, glow, thing, light, C } = S;

  // The four numbers every dimension below is measured from. They are written out rather than
  // used as variables in the geometry on purpose: this file is read next to a render, and a
  // literal -2.615 next to a comment saying what is at -2.585 is checkable in a way that
  // `BZ + .015` is not. The contract is here; the arithmetic is done.
  //
  //   EZ = S.NB.z1 = -2.95   the face of the block. Brick plinth stands proud of it to -2.74
  //                          below y 1.40; the 单元门 surround to -2.79; the render wall is the
  //                          -2.95 plane itself above the plinth.
  //   DX = S.DOOR  =  0      the centre of the 单元门
  //   HW           =  1.80   the side frame line, x = ±HW
  //   MZ           = -1.06   the mouth plane, the front face of the front posts
  //   BZ           = -2.63   the inner face of the rear posts, where the room begins
  const DX = S.DOOR;
  const HW = 1.80;

  // The lobby's own palette, so the two halves of the doorway are the same metal and the same
  // glass. Copied by value rather than by reference because home-lobby.js is another agent's file.
  const alu    = C('#a8afb3'), aluD = C('#8b9296'), steelC = C('#c3c8cb');
  const glassC = C('#cfe0e2');
  const capC   = C('#d0cbbe');                    // the porch roof, a pale render like the canopy
  const paper  = C('#b8332a'), gold = C('#f2d98c');
  const enamel = C('#1f4f8f'), enamelW = C('#eef2f5');
  const stampR = C('#a8352a');                    // the ink 小广告 are stamped in
  const granite = C('#8e8b82'), graniteD = C('#5e5b56');
  const ALU  = { hard: true, gloss: .55 };
  const ALUD = { hard: true, gloss: .42 };
  // Glazing you can see a body through. The lobby's street glass is `alpha: .82` because it is
  // reflecting the sky and standing in front of a lit room; this is the same sheet seen from the
  // outside with a person in it, and at .82 the porch was an opaque grey box with a roof.
  const GLZ  = { hard: true, alpha: .30, gloss: .74 };
  const PLAS = { mat: 'plaster', matScale: 1.60, matAmt: .14 };

  // ---------------------------------------------------------------- the frame
  //
  // Four posts, two rear and two front. The rear pair is 36 cm deep and runs back to z = -2.99,
  // which is *inside* the block: the wall face is at -2.95 below the parapet and the brick plinth
  // stands proud of it to -2.74, so a post that stopped at either of those two planes would have a
  // face lying on a face. Buried, its back and its sides are inside solid geometry and the only
  // thing that draws is the 11 cm of it that clears the plinth.
  for (const s of [-1, 1]) {
    box(s * HW, 1.21, -2.81, .10, 2.42, .36, alu, ALU);           // rear post, tailed into the wall
    box(s * HW, 1.21, -1.11, .10, 2.42, .10, alu, ALU);           // front post
  }

  // The side walls. Solid below the rail, glazed above it — which is both what these are built
  // like and what stops the porch being three sheets of transparency stacked in front of the body.
  // The rail overlaps the top of the dado and the bottom of the glass by a centimetre each, so
  // neither of those two horizontal faces is ever seen; that is what a transom is for.
  for (const s of [-1, 1]) {
    box(s * HW, .45,   -1.895, .026, .90,  1.43, aluD,   ALUD);   // dado
    box(s * HW, .93,   -1.895, .055, .07,  1.43, alu,    ALU);    // transom rail
    box(s * HW, 1.6125,-1.895, .022, 1.315,1.43, glassC, GLZ);    // glazing
    box(s * HW, 2.32,  -1.895, .11,  .12,  1.45, alu,    ALU);    // head beam
    // The mullion that every one of these has halfway along the screen. Wider in x than the glass
    // it crosses, so the glass simply ends inside it.
    box(s * HW, 1.6125, -1.90, .062, 1.315, .05, alu, ALU);
  }
  // The front head, across the whole width.
  box(DX, 2.32, -1.11, 3.70, .12, .11, alu, ALU);

  // The roof. It stops at z = -1.94 and that is not a rounding: the shell's canopy brackets reach
  // out to z = -1.96 at y 1.78..2.74, and a slab at 2.37..2.47 running back past them would pass
  // straight through both. It does not need to go further — the block's own concrete canopy covers
  // z -3.01..-1.69, so the two overlap by 25 cm and the porch is roofed end to end by the pair of
  // them. That is also why the shell's bare bulb at (0, 2.62, -2.43) still works: it hangs in the
  // 34 cm of porch that is under the old canopy rather than under the new slab, directly over the
  // step, which is where a stairwell light belongs.
  box(DX, 2.42, -1.495, 3.86, .10, .89, capC, { hard: true, gloss: .16, ...PLAS });
  // A drip edge along the front of it, and the gutter stub that empties onto the pavement.
  box(DX, 2.355, -1.075, 3.86, .06, .05, aluD, ALUD);
  cyl(HW + .05, 1.20, -1.06, .028, 2.40, aluD, { gloss: .40 });

  // ---------------------------------------------------------------- the mouth
  //
  // Narrower than the porch, the way a 门斗 always is: 3.60 m of frontage with a 1.72 m opening in
  // the middle of it and a fixed light either side. The lobby's inner sliding pair parks at a
  // 1.84 m gap, so the two openings are within 12 cm of each other and the walk through them is
  // the same walk. 1.72 m of opening is 1.12 m of clear run once `clampMove` has taken the body
  // radius off both jambs — nearly twice the 0.60 m an opening needs.
  for (const s of [-1, 1]) {
    box(s * .99, 1.13, -1.11, .26, 2.26, .115, C('#c9ccc8'),
      { hard: true, gloss: .20, ...PLAS });                        // the jamb pilasters
    box(s * 1.435, .45,   -1.11, .60, .90,  .030, aluD,   ALUD);   // fixed light: dado
    box(s * 1.435, .93,   -1.11, .62, .07,  .055, alu,    ALU);    // fixed light: rail
    box(s * 1.435, 1.60,  -1.11, .60, 1.29, .022, glassC, GLZ);    // fixed light: glass
  }
  // The lintel over the opening, which is what the 横批 goes on.
  box(DX, 2.10, -1.11, 1.76, .14, .10, alu, ALU);

  // ---------------------------------------------------------------- 防盗门, one leaf, standing open
  //
  // A real leaf on a real hinge, not a panel painted on a wall. It is hinged on the west jamb and
  // stood back into the porch at about 103 degrees, which is where a door with a closer on it
  // rests when somebody has kicked the wedge under it — and every 单元门 in this city has a wedge
  // under it in the morning.
  //
  // The geometry is written as a centre plus an angle rather than as a hinge, because `box` takes
  // a centre: the leaf runs from (-0.86, -1.107) at the hinge to (-1.06, -1.943) at the free edge,
  // 0.86 m of leaf, so its centre is (-0.96, -1.525) and its yaw is 1.808 rad. Those two numbers
  // and the collider below are the same door; if one moves they all move.
  const LRY = 1.808, LCX = -0.96, LCZ = -1.525;
  box(LCX, 1.03, LCZ, .86, 2.06, .045, C('#2b3036'),
    { hard: true, gloss: .38, ry: LRY, tag: '门斗' });
  // The glazed vision panel in the top half, and the pressed rails that frame it. Both are a
  // touch thicker than the leaf so they read as applied to it rather than cut into it.
  box(LCX, 1.55, LCZ, .62, .78, .052, glassC,
    { hard: true, alpha: .34, gloss: .70, ry: LRY, tag: '门斗' });
  box(LCX, 1.10, LCZ, .70, .06, .050, C('#3a4046'),
    { hard: true, gloss: .34, ry: LRY, tag: '门斗' });
  box(LCX, .38, LCZ, .70, .40, .050, C('#343a40'),
    { hard: true, gloss: .30, ry: LRY, tag: '门斗' });
  // The pull, 72 cm out from the hinge and stood 5 cm off the porch face of the leaf. Worked out
  // along the leaf's own axis rather than eyeballed in world x/z, which is the only way a handle
  // on a door at 103 degrees ends up on the door.
  const LDX = -0.234, LDZ = -0.972;                         // the leaf's own long axis, normalised
  const hx = -0.86 + LDX * .72 + .050 * -LDZ, hz = -1.107 + LDZ * .72 + .050 * LDX;
  cap(hx, 1.05, hz, .018, .34, .018, steelC, { gloss: .55, tag: '门斗' });
  // The two stand-offs that hold the bar off the leaf. Boxes with the leaf's own `ry`, not
  // capsules: `cap` builds along local Y, so a stand-off written as a capsule comes out standing
  // up beside the handle instead of running out through the door.
  for (const d of [-.15, .15])
    box(hx + LDX * d, 1.05, hz + LDZ * d, .028, .028, .062, steelC,
      { hard: true, ry: LRY, gloss: .55, tag: '门斗' });
  // 闭门器 over the hinge, and the wedge on the floor that is the reason the door is open at all.
  box(-0.88, 1.98, -1.20, .22, .07, .09, C('#4a5057'), { hard: true, gloss: .40, ry: LRY });
  box(-1.02, .035, -1.86, .10, .07, .16, C('#6d5f45'), { hard: true, gloss: .12, ry: .18 });

  // 门禁 on the brick jamb inside the porch, at the height a hand actually reaches it. The lobby
  // carries the same reader on the same side of the same door (home-lobby.js:518), which is the
  // point: one entry system, two faces of it.
  // Tagged, because `pick` in js/build.js resolves the interactable off the tag — untagged, the
  // 门禁 registered below would have nothing to bind to and the card would never appear.
  box(1.22, 1.15, -2.770, .11, .17, .05, C('#3a4046'), { hard: true, gloss: .34, tag: '门禁' });
  box(1.22, 1.17, -2.744, .07, .07, .012, C('#59d18a'),
    { hard: true, mode: 1, glow: .18, tag: '门禁' });
  box(1.22, 1.09, -2.746, .045, .012, .010, C('#d9d4c8'), { hard: true, tag: '门禁' });

  // ---------------------------------------------------------------- the step and the 门槛石
  //
  // One step, 13.5 cm, which is the rise the shell's painted flight already starts from (its first
  // tread sits at y = .15) so the two are continuous. The tread stops at x ±1.20 to stay 4.8 cm
  // clear of the folded security leaves, and its back face at z = -2.66 stays 4 cm clear of the
  // reveal jambs; both of those are the shell's, both were measured rather than guessed.
  box(DX, .0675, -2.54, 2.40, .135, .28, granite,
    { hard: true, gloss: .22, mat: 'concrete', matScale: .80, matAmt: .12 });
  // The 门槛石 on top of it. A single dark sill running the width of the opening, standing 1 cm
  // clear of the step under it so neither slab shares a plane with the other. This is the piece
  // that says a doorway rather than a floor: the whole reason a threshold reads as a threshold is
  // that it is a different stone from everything on either side of it. It is set back far enough
  // that the door below stands *on* it, which is what a threshold stone is for.
  box(DX, .170, -2.60, 2.06, .05, .16, graniteD, { hard: true, gloss: .34 });
  shade(DX, -2.42, 2.50, .40, .30, .046);

  // ---------------------------------------------------------------- 单元门, the inner pair
  //
  // Shut, and this is the one addition in the file that is here because of what a render showed
  // rather than because of what the design asked for.
  //
  // The shell's opening has nothing in it. Its dark stairwell volume is at z -3.64..-2.94, which
  // is *inside* the block — street.js:1206 says so itself, "only the last centimetre of it clears
  // the facade" — and the flight in front of it is seven grey nosings 4.5 cm tall painted on the
  // brick. From the pavement, three metres back and at an angle, that reads. From inside a 1.6 m
  // porch, square on, at two metres, it does not: the way into your own building is a brick wall
  // with a blue plate over it. The porch did not create that defect, it removed the last thing
  // that was hiding it.
  //
  // A shut 防盗门 is the honest answer and the only one available without rebuilding somebody
  // else's geometry. It is what is actually in these openings; it covers the brick because a shut
  // door covers what is behind it; it turns USE into what it should always have been — you cross
  // the porch, you are at a locked door, you open it — and when the illusion behind it is finally
  // taken out, nothing here has to change. See the report: the flight, the folded leaves and the
  // dark box should all go, and this stays.
  // Every z below is stacked forward off the leaf face at -2.585 in clear increments — pressed
  // panel to -2.569, vision light to -2.570, the meeting stile to -2.554, the pulls to -2.538 —
  // because a door is half a dozen thin things applied to one slab and none of them may share a
  // plane with the slab or with each other. Written the other way round the first time, every
  // applied piece was a millimetre *behind* the leaf and the door came out as a flat rectangle.
  const DOORC = C('#2f353b'), DOORL = C('#454d55');
  for (const s of [-1, 1]) {
    box(s * .485, 1.24, -2.615, .95, 2.06, .06, DOORC,
      { hard: true, gloss: .34, tag: '楼' });
    // The pressed panel in the bottom half and the barred vision light in the top, which between
    // them are the whole of what makes a steel door read as a steel door and not as a slab.
    box(s * .485, .70, -2.578, .74, .84, .018, DOORL, { hard: true, gloss: .30, tag: '楼' });
    box(s * .485, 1.72, -2.580, .58, .62, .020, C('#181c21'), { hard: true, gloss: .52, tag: '楼' });
    for (let i = -1; i <= 1; i++)
      cap(s * .485 + i * .17, 1.72, -2.558, .016, .62, .016, C('#5c646c'),
        { gloss: .50, tag: '楼' });
  }
  // The meeting stile, standing proud of both leaves, and the two pulls either side of it.
  box(DX, 1.24, -2.596, .06, 2.06, .085, C('#4a525a'), { hard: true, gloss: .40, tag: '楼' });
  for (const s of [-1, 1]) {
    cap(s * .15, 1.05, -2.538, .022, .32, .022, steelC, { gloss: .55, tag: '楼' });
    for (const d of [-.13, .13])
      box(s * .15, 1.05 + d, -2.546, .030, .030, .046, steelC,
        { hard: true, gloss: .55, tag: '楼' });
  }
  // 闭门器 over the leaf that opens, and the transom filling the last 9 cm to the shell's lintel.
  box(-.52, 2.14, -2.560, .30, .075, .085, C('#4a5057'), { hard: true, gloss: .40, tag: '楼' });
  box(DX, 2.315, -2.615, 1.94, .10, .055, C('#20242a'), { hard: true, gloss: .30, tag: '楼' });
  for (let i = -2; i <= 2; i++)
    cap(i * .38, 2.315, -2.576, .014, .09, .014, C('#5c646c'), { gloss: .48, tag: '楼' });
  // 福 on the lower panel of the leaf that gets opened, turned on the diagonal the way it always
  // is. It goes with the couplet at the porch mouth — one household's new year, done in the two
  // places every household does it.
  box(.485, .82, -2.566, .21, .21, .006, paper,
    { hard: true, rz: Math.PI / 4, gloss: .10, tag: '春联' });
  glyphs(.485, .82, -2.561, 0, '福',
    { size: .125, color: gold, gloss: .10, lift: .006, tag: '春联' });
  // And the notice that lives on the door rather than on the board, because it is the one the
  // 物业 wants read on the way in and not on the way past. Taped to the leaf, over the panel,
  // where every one of these actually is.
  box(-.485, .88, -2.556, .34, .26, .006, C('#eceae2'),
    { hard: true, mode: 1, gloss: .08, tag: '通知' });
  glyphs(-.485, .965, -2.550, 0, '通知',
    { size: .058, gap: .009, color: C('#a03028'), gloss: .06, lift: .008, tag: '通知' });
  glyphs(-.485, .855, -2.550, 0, '电动车禁止入楼',
    { size: .034, gap: .006, color: C('#3a3832'), gloss: .06, lift: .008, tag: '通知' });
  for (let k = 0; k < 2; k++)
    box(-.485, .775 - k * .040, -2.552, .22, .009, .003, C('#8d8a83'),
      { hard: true, gloss: .05, tag: '通知' });

  // The porch floor, which is 地砖 rather than the alley's paving and is the other half of the
  // same argument. Held to x ±1.70 so it stops short of the shell's drain cover at x 1.71, and
  // laid at y = .022 — 16 mm over the alley's drain channel decal at .006, which is the nearest
  // thing under it.
  flat(DX, .022, -1.86, 3.40, 1.52, C('#8d8779'),
    { mode: 9, gloss: .30, mat: 'tile', matScale: .34, matAmt: .16 });
  // A brass threshold strip at the mouth. Small, and it is what tells the eye where the floor
  // changes when the light is flat.
  box(DX, .036, -1.09, 3.36, .012, .08, C('#9a8b62'), { hard: true, gloss: .46 });

  // ---------------------------------------------------------------- what has collected in here
  //
  // A porch is a trap for weather. Mud tracked in off the alley in the two back corners where
  // nobody's broom reaches, leaves blown in against the step, grit, and the ends of other people's
  // cigarettes. Everything here is stacked in clear increments over the floor at .022 — smears at
  // .034, leaves at .042, litter at .050 — so nothing is fighting anything for the same pixels.
  for (const s of [-1, 1]) {
    flat(s * 1.24, .034, -2.28, .74, .52, C('#5c5346'),
      { mode: 10, gloss: .06, ry: s * .22, mat: 'concrete', matScale: 1.10, matAmt: .10 });
    flat(s * 1.46, .034, -1.44, .46, .60, C('#655b4c'), { mode: 10, gloss: .06, ry: -s * .30 });
  }
  // Leaves. Positions and angles come off a fixed table rather than a random stream: the street's
  // `rnd()` is a single sequence shared by every builder in the district, and drawing from it here
  // would move somebody else's shutters.
  const LEAF = [
    [-1.38, -2.34,  .5, '#7d6a3a'], [-1.16, -2.16, 2.1, '#8a6a35'], [-0.72, -2.28, 1.2, '#6d6236'],
    [ 1.30, -2.36, -.7, '#7d6a3a'], [ 1.08, -2.10,  .3, '#8f7038'], [ 1.52, -1.78, 2.4, '#6a6134'],
    [-1.55, -1.62, 1.7, '#7a6a3f'], [ 0.42, -2.34, -1.1, '#856b36'], [-0.30, -2.40,  .9, '#6f6438'],
  ];
  // Left at the default lit mode on purpose. `mode: 15` is the foliage shader and it sways in the
  // vertex stage off the model matrix — right for a scholar tree, wrong for a dead leaf lying on
  // a floor, which would have shivered all night.
  for (const [lx, lz, lr, lc] of LEAF)
    flat(lx, .042, lz, .095, .058, C(lc), { gloss: .10, ry: lr });
  // Grit, two cigarette ends and a bottle cap. The cap is the only thing in the corner that is
  // not brown, and it is what makes the rest of it read as dirt rather than as a stain in the map.
  for (const [gx, gz] of [[-1.44, -2.44], [-1.02, -2.36], [1.36, -2.42], [1.18, -2.24], [-1.58, -2.06]])
    box(gx, .028, gz, .035, .012, .030, C('#4f4a41'), { hard: true, gloss: .10 });
  for (const [cx2, cz2, cr] of [[-1.32, -1.96, .7], [1.42, -2.02, -1.2]]) {
    cap(cx2, .050, cz2, .009, .052, .009, C('#ded7c4'),
      { rz: Math.PI / 2, ry: cr, gloss: .08 });
    cap(cx2 + Math.cos(cr) * .030, .050, cz2 - Math.sin(cr) * .030, .0092, .016, .0092,
      C('#8a7a52'), { rz: Math.PI / 2, ry: cr, gloss: .08 });
  }
  ball(1.02, .046, -1.52, .016, .006, .016, C('#9aa3a6'), { gloss: .50 });

  // The post that arrived while you were out. Parcels get left inside the 门斗 and not in the
  // 信报箱, which is the whole reason the 门斗 is worth having, and they are also the one thing in
  // here that has to be a collider — a stack of boxes you walk through is worse than no boxes.
  const PARCEL = [[1.575, .115, -2.44, .34, .23, .26, '#a98a5f'],
                  [1.545, .295, -2.42, .30, .13, .24, '#b5966a'],
                  [1.600, .400, -2.46, .22, .07, .19, '#9d8256']];
  for (const [px, py, pz, pw, ph, pd, pc] of PARCEL) {
    box(px, py, pz, pw, ph, pd, C(pc), { hard: true, gloss: .10, ry: .12 });
    box(px, py + ph / 2 - .004, pz, pw * .18, .008, pd * 1.02, C('#d8cdb4'),
      { hard: true, gloss: .08, ry: .12 });                       // the tape down the middle
  }
  shade(1.57, -2.43, .46, .38, .34, .030);
  solid(1.40, 1.76, -2.60, -2.26);
  // A broom stood in the corner behind them, which is what a 门斗 with parcels in it also has.
  cap(1.68, .62, -2.16, .017, 1.20, .017, C('#8a7048'), { rx: .16, rz: -.10, gloss: .16 });
  box(1.60, .055, -2.02, .10, .09, .26, C('#6b5c3c'), { hard: true, gloss: .10, ry: .10 });

  // ---------------------------------------------------------------- 春联
  //
  // A pair on the mouth jambs and the 横批 across the lintel. On the outermost door, which is
  // where they go once a 门斗 has been added — the couplet follows the door you actually come
  // through, and the lobby's pair (home-lobby.js:497) is on its inner doors for the same reason.
  // Gold on red, `mode` left at the default: the panel is not emissive and neither is the writing,
  // because a dozen small emitters here would put the same bloom haze over the alley that the
  // corridor signs put over the second floor.
  for (const [s, line] of [[1, '春回大地千山秀'], [-1, '日暖神州万木荣']]) {
    box(s * .99, 1.52, -1.036, .17, 1.16, .008, paper, { hard: true, gloss: .10, tag: '春联' });
    glyphs(s * .99, 1.52, -1.032, 0, line,
      { size: .128, gap: .020, vertical: true, color: gold, gloss: .10, lift: .008, tag: '春联' });
  }
  box(DX, 2.10, -1.042, .70, .175, .008, paper, { hard: true, gloss: .10, tag: '春联' });
  glyphs(DX, 2.10, -1.038, 0, '万象更新',
    { size: .11, gap: .016, color: gold, gloss: .10, lift: .008, tag: '春联' });

  // ---------------------------------------------------------------- the signwriting
  //
  // The fascia carries the building's name in the same words the lobby header carries it in
  // (home-lobby.js:492), because that is the single strongest thing that can make two sides of a
  // door be one door. `mode: 1` on the characters and no glow — flat unlit, so gold-on-blue holds
  // at midnight, and the plate behind them is what keeps whatever brightness it has.
  box(DX, 2.30, -1.032, 1.10, .20, .022, enamel, { hard: true, gloss: .30 });
  glyphs(DX, 2.30, -1.021, 0, '杨柳胡同十八号楼',
    { size: .105, gap: .016, color: enamelW, mode: 1, gloss: .16, lift: .010 });
  // And the 门牌 proper, the little enamel plate. Vertical on the east post, which is where the
  // number goes when the frontage is glass and there is no wall left to screw it to.
  box(HW, 1.70, -1.032, .16, .32, .020, enamel, { hard: true, gloss: .34 });
  glyphs(HW, 1.70, -1.021, 0, '十八号',
    { size: .072, gap: .012, vertical: true, color: enamelW, mode: 1, gloss: .16, lift: .008 });
  // 单元 opposite it on the west post. It started on the brick over the reveal, which is where a
  // 单元 plate goes and where the shell already has a blue plate with four blank white rectangles
  // standing in for characters (street.js:1283) — and then the 防盗门 below went in and covered
  // it, because a shut door covers the wall behind it. Out here it pairs with the number, which
  // is the other arrangement every block uses. See the report: the blank plate wants deleting.
  box(-HW, 1.70, -1.032, .16, .32, .020, enamel, { hard: true, gloss: .34 });
  glyphs(-HW, 1.70, -1.021, 0, '一单元',
    { size: .072, gap: .012, vertical: true, color: enamelW, mode: 1, gloss: .16, lift: .008 });

  // ---------------------------------------------------------------- 小广告
  //
  // Stamped in red ink at hand height on the paint and never quite scrubbed off. The same three
  // trades as every other stairwell in the game (home-f5.js:684, home-f11.js:767) and the same ink
  // — the joke only works because it is the same three everywhere. The numbers are the reserved
  // Chinese placeholders, not anybody's line.
  const AD = [
    [-1.52, 1.30, '开锁换锁',  .062, .010],
    [-1.44, 1.19, '13800138000', .034, .006],
    [ 1.44, 1.33, '通下水',    .058, .009],
    [ 1.44, 1.22, '13900139000', .032, .006],
  ];
  for (const [ax, ay, txt, sz, gp] of AD)
    glyphs(ax, ay, -1.093, 0, txt, { size: sz, gap: gp, color: stampR, gloss: .05, lift: .010 });
  // One more inside the porch, on the west screen, where it is at eye level while you wait for
  // somebody to buzz you in. Facing +x, so it reads from the middle of the porch.
  glyphs(-1.786, 1.26, -1.72, Math.PI / 2, '开锁',
    { size: .058, gap: .009, color: stampR, gloss: .05, lift: .012 });
  glyphs(-1.786, 1.15, -1.70, Math.PI / 2, '13800138000',
    { size: .030, gap: .005, color: stampR, gloss: .05, lift: .012 });

  // ---------------------------------------------------------------- the notices
  //
  // Taped to the inside of the glass, which is where the 物业 actually puts them once there is
  // glass to tape them to — the board on the brick outside is for the ones that have been there
  // for years. Facing -x off the east screen and +x off the west, so all three read from inside
  // the porch on the way in.
  //
  // Two ruled lines stand in for the body copy on each. Glyphs at that size came out as grey mush
  // and cost four quads a line, which is the same call street.js made on its own notice board.
  const NOTE = [
    [ 1,  1.62, -1.96, '通知',   '楼道禁止堆物',   '#e8e4d6', '#3c4046'],
    [-1,  1.50, -2.14, '寻猫',   '黄白花三岁',     '#f0ead6', '#a03028'],
  ];
  for (const [s, ny, nz, head, body, pc, ic] of NOTE) {
    const px = s * 1.774, yaw = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    box(px, ny, nz, .006, .30, .26, C(pc), { hard: true, mode: 1, gloss: .08, tag: '通知' });
    glyphs(px, ny + .095, nz, yaw, head,
      { size: .062, gap: .010, color: C(ic), gloss: .06, lift: .010, tag: '通知' });
    glyphs(px, ny - .015, nz, yaw, body,
      { size: .030, gap: .005, color: C('#3a3832'), gloss: .06, lift: .010, tag: '通知' });
    for (let k = 0; k < 2; k++)
      box(px + s * .008, ny - .075 - k * .042, nz, .003, .010, .17, C('#8d8a83'),
        { hard: true, gloss: .05, tag: '通知' });
    // The four corners of tape, which is the detail that says somebody put it there this week.
    for (const [tz, ty] of [[-.11, .13], [.11, .13], [-.11, -.13], [.11, -.13]])
      box(px + s * .004, ny + ty, nz + tz, .002, .045, .045, C('#d8d4c6'),
        { hard: true, alpha: .55, gloss: .30, tag: '通知' });
  }

  // ---------------------------------------------------------------- the bulb, and the sensor
  //
  // A bare lamp on a flex, and a PIR beside it. Every stairwell in this city is on a sensor —
  // 声控 or 人体感应 — and the thing that makes it read is not the lamp, it is the second and a
  // half of dark before it comes on. The tick below is the whole of that behaviour.
  cap(.42, 2.335, -1.62, .008, .10, .008, C('#2a2c2e'), { gloss: .20 });
  cyl(.42, 2.265, -1.62, .042, .07, C('#e4e0d6'), { gloss: .28 });
  const bulb = ball(.42, 2.185, -1.62, .046, .058, .046, C('#ffe9be'), { mode: 1, glow: .0 });
  const bulbLight = light(.42, 2.10, -1.66, [1.0, .90, .72], 0, 3.4);
  const bulbPool  = glow(M.trs(.42, .045, -1.72, 0, 2.80, 1, 2.30), C('#ffd8a2'), 0);
  // The sensor itself, its lens, and the pinhole LED that is the only part of one you ever notice.
  box(.42, 2.325, -1.80, .10, .062, .075, C('#eae6dc'), { hard: true, gloss: .30 });
  ball(.42, 2.300, -1.766, .034, .026, .012, C('#cfcabd'), { gloss: .42 });
  box(.30, 2.325, -1.764, .012, .012, .008, C('#e05a3c'), { hard: true, mode: 1, glow: .05 });

  // ---------------------------------------------------------------- 对讲 the door station
  //
  // The building had no intercom anywhere in it, and that is why the 外卖员 is teleported to your
  // landing: js/game.js sets his x/z straight to the deck-2 door with no buzz-in step, so a
  // stranger walks through a 门禁 unassisted and the 门禁 means nothing. The station is the other
  // half of the reader beside it — you press a flat number, somebody upstairs presses a button.
  // Panel, speaker grille, keypad, the pinhole camera and the call LED.
  box(-1.22, 1.36, -2.770, .15, .34, .05, C('#3a4046'), { hard: true, gloss: .34, tag: '对讲' });
  for (let k = 0; k < 3; k++)
    box(-1.22, 1.47 - k * .022, -2.743, .085, .008, .008, C('#20252a'),
      { hard: true, gloss: .20, tag: '对讲' });                                   // speaker slots
  for (let r = 0; r < 4; r++) for (let c = -1; c <= 1; c++)
    box(-1.22 + c * .034, 1.34 - r * .034, -2.744, .026, .026, .008, C('#7d858c'),
      { hard: true, gloss: .30, tag: '对讲' });                                   // the keypad
  ball(-1.22, 1.512, -2.742, .012, .012, .006, C('#1b1e21'),
    { gloss: .60, tag: '对讲' });                                                 // the camera
  box(-1.22, 1.205, -2.744, .016, .016, .008, C('#d94f3a'),
    { hard: true, mode: 1, glow: .12, tag: '对讲' });                             // the call lamp

  // ---------------------------------------------------------------- 无障碍坡道
  //
  // The step is 13.5 cm and there is a folded pushchair on the landing upstairs
  // (js/home-corridor.js) and an e-bike on charge; both cross this step twice a day. The ramp
  // goes beside the tread rather than over it, in the dead 0.65 m between the open leaf's
  // collider at x -1.09 and the west screen at -1.74 — a strip `clampMove` has already spent on
  // body radius, so the ramp adds nothing to walk round. No `solid`: you walk up it.
  //
  // 0.135 over 0.76 is 1:5.6, which is far too steep for the standard and is exactly what these
  // are. `rx` positive lifts the north end, so it rises into the building.
  box(-1.42, .078, -2.28, .40, .022, .78, C('#7f8489'),
    { hard: true, rx: .176, gloss: .40, tag: '坡道', mat: 'concrete', matScale: .5, matAmt: .10 });
  for (const s of [-1, 1])                                                        // side kerbs
    box(-1.42 + s * .195, .105, -2.28, .022, .05, .78, C('#5e6367'),
      { hard: true, rx: .176, gloss: .34, tag: '坡道' });
  glyphs(-1.42, .155, -2.62, 0, '无障碍坡道',
    { size: .038, gap: .006, color: C('#e6ecef'), gloss: .06, lift: .006, tag: '坡道' });

  // ---------------------------------------------------------------- 3号楼 1单元
  //
  // The fascia over the porch carries the compound address, 杨柳胡同十八号楼, and nothing said
  // which stair this is. The 楼 interactable across the way has claimed 3号楼 the whole time with
  // no surface in the world repeating it, so the one thing you would use to find your own door
  // walking down the alley was a sentence inside a vocabulary card. Blue enamel over the
  // letterbox bank, clear of its top at y 1.875 and under the shell's canopy.
  box(-2.30, 2.15, -2.930, .60, .30, .014, enamel, { hard: true, gloss: .34 });
  glyphs(-2.30, 2.215, -2.920, 0, '3号楼',
    { size: .072, gap: .011, color: enamelW, gloss: .10, lift: .006 });
  glyphs(-2.30, 2.095, -2.920, 0, '1单元',
    { size: .072, gap: .011, color: enamelW, gloss: .10, lift: .006 });

  // ---------------------------------------------------------------- 电动车车位 and the charger
  //
  // The porch door says 电动车禁止入楼 and the corridor upstairs says 电动车严禁, and until now
  // the block forbade a thing nobody could do: js/street-cycles.js moved the rack and both dumped
  // bicycles off the footway into a kerbside bay at the far edge of the east cycle track, so the
  // 单元门 forecourt had nothing on two wheels standing at it. A painted bay and a coin charger
  // against the render between the letterbox bank and 老李面馆 (which ends at x -4.50), north of
  // z = -2.05 where the body cannot stand, so none of it needs a collider or can block anything.
  flat(-3.62, .020, -2.42, 1.60, .95, C('#54637a'), { gloss: .16, tag: '车位' });
  // `glyphs` bakes its own rotX(PI/2) and always stands the character upright facing `yaw`, so a
  // stencil lying on the tarmac is not available; the label goes on the render above the bay,
  // which is where these are painted anyway.
  glyphs(-3.62, .95, -2.930, 0, '电动车车位',
    { size: .076, gap: .012, color: C('#e6ecef'), gloss: .06, lift: .006, tag: '车位' });
  cyl(-4.30, .58, -2.72, .055, 1.16, C('#8b9296'), { gloss: .44 });               // 充电桩 post
  box(-4.30, 1.22, -2.70, .20, .26, .13, C('#3a4046'), { hard: true, gloss: .34 });
  box(-4.30, 1.26, -2.632, .12, .12, .010, C('#59d18a'), { hard: true, mode: 1, glow: .14 });
  // Two of them nose in to the wall. Seven primitives each and no rider — a parked bike is
  // geometry, and the figures in this district are the expensive thing.
  for (const [bx, bc] of [[-3.98, C('#3f4a58')], [-3.24, C('#6d4a56')]]) {
    for (const wz of [-2.74, -2.16])
      cyl(bx, .245, wz, .245, .045, C('#26292c'), { rz: Math.PI / 2, gloss: .30 });
    box(bx, .46, -2.45, .17, .22, .74, bc, { hard: true, gloss: .42 });           // body
    box(bx, .63, -2.20, .30, .09, .26, C('#2b2e31'), { hard: true, gloss: .30 }); // saddle
    cyl(bx, .93, -2.70, .022, .48, C('#9aa1a6'), { rz: Math.PI / 2, gloss: .50 });
    box(bx, .80, -2.78, .30, .20, .16, C('#4a4f54'), { hard: true, gloss: .26 }); // basket
    box(bx, .70, -2.62, .34, .40, .05, C('#8f5d6a'), { hard: true, mode: 7, gloss: .20 });
  }

  // ---------------------------------------------------------------- 垃圾, at the door
  //
  // The block's 垃圾分类 set is twenty metres west at x -21 in js/street-alley.js. Every Beijing
  // 单元门 has two bins within five metres of it, and sorting your rubbish should not be a walk.
  // East of the notice board (which ends at x 2.795) and short of the 超市 fascia at x 4.50.
  for (const [gx, gc, gt] of [[2.98, C('#2f6f4a'), '厨余'], [3.62, C('#3a5f8f'), '可回收']]) {
    cyl(gx, .34, -2.42, .225, .68, gc, { gloss: .30, tag: '垃圾' });
    cyl(gx, .70, -2.42, .235, .05, C('#2b2e31'), { gloss: .34, tag: '垃圾' });     // lid
    box(gx, .13, -2.20, .30, .05, .09, C('#2b2e31'),
      { hard: true, gloss: .30, tag: '垃圾' });                                    // foot pedal
    glyphs(gx, .44, -2.185, 0, gt,
      { size: .058, gap: .009, color: C('#eef2f5'), gloss: .06, lift: .004, tag: '垃圾' });
  }
  glyphs(3.30, 1.16, -2.930, 0, '垃圾分类 人人有责',
    { size: .062, gap: .010, color: C('#cfd6da'), gloss: .06, lift: .006, tag: '垃圾' });

  // ---------------------------------------------------------------- 快递 the waybill
  //
  // Item 65 asked for a parcel stack on the step because the porch supposedly had none. It has
  // had one since the file was written — the three boxes and the broom at line 337 above, left
  // because the lockers downstairs are full — so a second pile two metres from the first would
  // have been two parcel piles two metres apart, which is the mistake this file's own header
  // warns about for the letterboxes. What was actually missing is the word: nothing in the porch
  // ever said 快递, which is the noun for the parcel, the courier and the company all three.
  // A 面单 on the front of the top box, facing the way in.
  box(1.600, .400, -2.365, .17, .105, .003, C('#f0ece0'),
    { hard: true, gloss: .10, ry: .12 });
  glyphs(1.600, .412, -2.360, .12, '快递',
    { size: .044, gap: .007, color: C('#3a3832'), gloss: .06, lift: .004 });
  box(1.600, .366, -2.361, .13, .006, .003, C('#8d8a83'), { hard: true, gloss: .05, ry: .12 });

  // ---------------------------------------------------------------- 晾衣, on the frontage
  //
  // js/home-roof.js builds 屋顶晾晒 twelve storeys up and js/street-alley.js hangs two lines in the
  // alley; the block's own frontage had none. Strung along the wall under the shell's canopy on
  // two brackets rather than on poles, because a pole in the forecourt is a collider in the one
  // place every route to the door passes through.
  // `cyl`, not `cap`: a capsule's hemisphere caps are a quarter of its length each and scale with
  // sy, so a 2.30 m "line" built as one would be two 57 cm bulbs with a stub between them.
  for (const bxr of [2.05, 4.35])
    cyl(bxr, 2.02, -2.80, .016, .16, C('#7d858c'),
      { rx: Math.PI / 2, gloss: .40, tag: '晾衣' });
  cyl(3.20, 2.06, -2.74, .006, 2.30, C('#c9c2b0'),
    { rz: Math.PI / 2, gloss: .12, tag: '晾衣' });
  const WASH = [C('#eceae2'), C('#5f7ba0'), C('#b8b0c4')];
  for (let i = 0; i < 3; i++)
    box(2.45 + i * .72, 1.72, -2.73, .46, .62, .04, WASH[i],
      { hard: true, mode: 7, gloss: .10, ry: (i - 1) * .06, tag: '晾衣' });

  // ---------------------------------------------------------------- 马扎
  //
  // js/street-alley.js brings the stools, the crate and the thermos out at 18:30 — at x 18.5..22.6,
  // the far end of the alley. The place that reliably has three men on stools in a Beijing compound
  // is the 单元门, because that is where the shade and the people passing are. Folded against the
  // wall, which is where they are the rest of the day and which reads right at any hour without
  // a second timed band.
  for (let i = 0; i < 3; i++) {
    const sx = 2.42 + i * .26;
    box(sx, .30, -2.60, .05, .58, .30, C('#5d4a33'),
      { hard: true, gloss: .18, rz: .11 - i * .03, tag: '马扎' });
    box(sx + .03, .30, -2.60, .05, .58, .28, C('#8f5d3a'),
      { hard: true, gloss: .18, rz: .05, tag: '马扎' });
    box(sx + .015, .38, -2.585, .10, .30, .26, C('#3f6f8a'),
      { hard: true, mode: 7, gloss: .12, rz: .08, tag: '马扎' });                 // the canvas
  }
  box(3.28, .21, -2.58, .38, .42, .32, C('#a8825a'),
    { hard: true, gloss: .12, mat: 'card', matScale: .3, matAmt: .14 });          // the crate
  cyl(3.28, .53, -2.58, .055, .22, C('#8f3f3a'), { gloss: .40 });                 // the thermos
  cyl(3.28, .655, -2.58, .038, .04, C('#d6cfc0'), { gloss: .28 });

  // ---------------------------------------------------------------- colliders
  //
  // Everything that is a wall is a wall. `clampMove` inflates each of these by the 0.30 m body
  // radius, so what matters is not the box but the gap left between two of them:
  //
  //     the mouth        x ±0.85 between the pilasters   → 1.12 m of clear run
  //     past the leaf    x -0.53 .. +1.10 at the step    → 1.63 m of clear run
  //     the side screens x ±1.74                         → the porch is 3.48 m inside
  //
  // Both of the first two are well over the 0.60 m an opening needs. Measured by driving the real
  // `clampMove`, not by looking at it — a door leaf that blocks its own doorway does not show up
  // in any picture.
  // `solid` takes x0 < x1 and does not sort them — mirroring a collider by multiplying both ends
  // by -1 hands it a reversed pair, which does not throw and does not block anything either. This
  // wrapper is here so the mirrored half of the porch stops the body the way the built half does.
  const wall = (x0, x1, z0, z1) =>
    solid(Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1));
  for (const s of [-1, 1]) {
    wall(s * 1.86, s * 1.74, -2.62, -1.06);                        // side screens
    wall(s * 1.13, s * .85, -1.18, -1.04);                         // mouth pilasters
    wall(s * 1.75, s * 1.13, -1.14, -1.08);                        // the fixed lights
  }
  wall(-1.09, -0.83, -1.96, -1.10);                                // the open leaf

  // ---------------------------------------------------------------- what there is to read
  //
  // The porch is the way in now. It built the whole threshold — step, 门槛石, leaves, 闭门器,
  // sensor lamp — and registered two things, neither of which took you anywhere, so you walked
  // through a doorway and then pressed a wall three metres up the facade to go home.
  //
  // No `at` on the exit, deliberately. js/game.js:10614 computes `homeLobbyArrival` as
  // `name === 'home' && started && cameFrom !== 'home' && !at`, and only that path calls
  // `World.setFloor(0)` and lands you on HOME_LOBBY_ENTRY. Passing an arrival point here would
  // suppress both and drop you into the building on whatever deck you were last on.
  const porch = thing('门斗', DX, 1.55, -1.58, '门斗里有点暗，感应灯亮了。',
    'It is dim in the porch; the sensor light comes on.',
    '门斗 is the little enclosed porch inside a building door — a wind lobby.',
    { focus: [DX, -1.58], reach: 2.2 });
  porch.exit = { place: 'home' };
  // The reader, which the lobby has carried as a real interactable since it was built
  // (js/home-lobby.js:517) and this side has carried as three untouchable boxes. Reach 2.2
  // because the body stops at z = -2.05 and the jamb it is on is at z = -2.77.
  thing('门禁', 1.22, 1.15, -2.770, '刷卡进楼，门禁滴了一声。',
    'Swipe the card to get in; the reader beeps.',
    '门禁 is the entry control on a building door. 刷卡 is to swipe a card.',
    { focus: [DX, -1.90], reach: 2.2 });
  thing('对讲', -1.22, 1.36, -2.770, '按房号，楼上有人接对讲。',
    'Press the flat number and somebody upstairs answers the intercom.',
    '对讲 — 对 facing + 讲 speak. 楼宇对讲 is the door-entry intercom.',
    { focus: [DX, -1.90], reach: 2.2 });
  thing('春联', .99, 1.55, -1.10, '门口贴着春联，红纸金字。',
    'A couplet is pasted up by the door, gold on red paper.',
    '春联 are the New Year couplets pasted either side of a door.',
    { focus: [.99, -1.30], reach: 1.9 });

  // ---------------------------------------------------------------- 感应灯 the tick
  //
  // Written once per change, never per frame: this is four assignments and it happens twice a
  // visit. `mins` is the game clock and is undefined on the frames before the first `setClock`,
  // so the hour falls back to the middle of the afternoon rather than to zero — a fallback of 0
  // would have the lamp burning through every render that forgot to set a time.
  //
  // The hold is the point. A PIR trips on the way in and stays on for a few seconds after you have
  // gone, so the lamp must not follow the body in and out of a circle; without the hold it strobes
  // on the threshold. Eight seconds is what these are set to and it is long enough that walking
  // out of the porch leaves the light on behind you, which is the bit you actually notice.
  let lit = null, until = 0;
  StreetFit['entry'].tick = (t, body, mins) => {
    const h = mins === undefined ? 14 : (mins / 60) % 24;
    const dark = h < 6.3 || h >= 18.2;
    if (body) {
      const dx = body.x - DX, dz = body.z + 1.75;
      if (dx * dx + dz * dz < 16) until = t + 8;
    }
    const on = dark && t < until;
    if (on === lit) return;
    lit = on;
    bulb.glow      = on ? .34 : 0;
    bulb.color     = on ? C('#fff0cc') : C('#cfc7b4');
    bulbLight.power = on ? .46 : 0;
    bulbPool.a      = on ? .20 : 0;
  };
};
