// 🚻 Toilets + charging — 洗手间 (男/女) and the 充电站 cluster
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    washrooms x 18.9 .. 21.8, +z side; charging x 5.6 .. 7.7  (airside)
//   camera  D-wc (new)
//
// 洗手间 (男/女) and the 充电站 cluster. Teaches 洗手 / 充电.
//
// The camera IS the acceptance test. Render your shot with `node .audit.js D-wc`, open the
// PNG, and look at it. A zone whose code boots but whose shot is black, empty, or unchanged has
// not shipped. You own your row(s) in .audit.js and nobody else's.
//
// ---------------------------------------------------------------------------------------------
// WHERE THIS ACTUALLY STANDS
//
// The source table once assigned both this zone and the smoking room to x 6..8 on the +z wall.
// That put a 3.4 m opaque toilet core across 83% of the smoking room's only glass face and almost
// all of its door. The older inline toilet then occupied the café wall at x 17.1..21.7, so both
// apparent alternatives were collisions.
//
// The detailed core now owns the free east end of the service spine at x 18.9..21.8. Its south
// face stays at z 5.4 with a screen wall in front, while the café stops at x 18.5 and the smoking
// room remains clear at x 4.4..8.0. The charging island stays near x 6.6,z 1.3, where it serves the
// concourse without pretending to be part of the restroom doorway.
//
// The duplicate shell charging bench and its sealed 19 cm seam have been removed; this island is
// the single airside charging point.
//
// ---------------------------------------------------------------------------------------------
// THE BAFFLE, AND WHY THE NUMBERS ARE THE WAY THEY ARE
//
// `clampMove` (js/build.js) inflates every collider by the 0.30 m body radius, so a gap of g metres
// between two colliders leaves g − 0.60 m of walkable band, and a 0.60 m gap is not a doorway, it
// is a wall. The lobby here is the slot between the screen and the block:
//
//     screen back face   z 4.12          walkable band starts  4.12 + 0.30 = 4.42
//     block front face   z 5.40          walkable band ends    5.40 − 0.30 = 5.10
//                                        → 0.68 m of clear run, the whole 2.5 m width
//
// and it is open at BOTH ends. Two mouths is the whole point: a screen wall with one mouth is an
// alcove, a screen wall with a mouth narrower than 0.60 is a player standing in a corner unable to
// walk out of it, and this repo has shipped both. Walked with a flood fill, not looked at.
//
// The screen is 2.35 m tall against a 2.10 m door, and it spans the two main leaves, so no sight
// line from the concourse reaches either leaf. The 无障碍
// door is deliberately NOT behind it — it is on the west return, in the open, signed from the
// concourse, which is where an accessible WC has to be.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET — read this before you add anything
//
// The airport draws at ~15.6 ms a frame today (60+ fps) with 4,141 props. Fifteen zones adding
// freely is how that becomes 30 ms. Your budget is **250 props**, and the rules that decide
// whether a prop is cheap or expensive are not obvious:
//
//   * Props BATCH by mesh + mode + corner radius + bevel + textures. Fifty identical seats are
//     one draw call. Fifty seats in fifty slightly different colours are still one draw call —
//     colour, gloss, alpha and glow travel per instance. Vary those freely.
//   * ANYTHING TRANSLUCENT (alpha < 0.999) DOES NOT BATCH, one draw call each, because batching
//     reorders drawing and transparency depends on order. Haze, glass, steam: use them where they
//     earn it and count them.
//   * Glyphs DO batch now (as of 2026-08-04 — the atlas cell is a per-instance attribute), so
//     real writing is cheap. Use real characters; that is the whole point of the game.
//   * A distinct `round`, `bevel`, `mat` or `matScale` value starts a NEW batch. Reuse the
//     shell's materials off `A` (A.M_STONE, A.M_METAL, …) rather than inventing your own.
//
// This zone spends **nothing** on translucency — not one prop under alpha 0.999. The toilet doors
// are opaque dark leaves rather than the smoked glass the shell's `toilets()` factory uses,
// because a door you cannot see through is the whole subject and 0.9 alpha bought nothing but
// three extra draw calls. All tiling is A.M_TILE at its one scale: block, screen, skirtings and
// both floor patches are the same batch.
//
// Check yourself: `node .fpscheck.js airport` must stay under 16.7 ms median. If your zone pushes
// it over, say so in your report rather than shipping it.
//
// ---------------------------------------------------------------------------------------------

AirFit['wc'] = A => {
  const { box, cyl, ball, cap, taper, wall, flat, glyphs, solid, blocker, glow, thing } = A;
  const { C, G, col } = A;
  const { shade, light, M_TILE, M_METAL, M_WOOD } = A;

  // ============================================================================ the datums
  // The block at the free east end of the service spine, clear of both the café (ending x 18.5)
  // and the smoking-room frontage (x 4.4..8.0).
  const BX0 = 18.90, BX1 = 21.80, BZ0 = 5.40, BZ1 = 6.80;
  const BCX = (BX0 + BX1) / 2, BCZ = (BZ0 + BZ1) / 2;
  const BW = BX1 - BX0, BD = BZ1 - BZ0, BH = 3.40;
  const DH = 2.10, DW = .92;                    // door height and leaf width
  const MENX = 19.58, WOMX = 20.82;             // 男 and 女, on the -z face
  const ACCZ = 6.10;                            // 无障碍, on the -x return
  const NBX = 21.54;                            // the notice bay, east of 女

  // The screen. Set 1.28 m off the block face, which is what buys the 0.68 m walkable lobby.
  // The east end stops at 21.00, leaving a full walkable entry between the screen and the hall's
  // x=22 boundary after the player's body clearance is applied. At 21.35 that route was 5 cm.
  const SX0 = 18.80, SX1 = 21.00, SCX = (SX0 + SX1) / 2, SW = SX1 - SX0;
  const SZ = 4.05, ST = .14, SH = 2.35;
  const SF = SZ - ST / 2 - .005;                // the face of the screen you read from the hall

  // The charging island stays in the open centre of the airside hall, separate from the relocated
  // restroom, café and smoking-room frontages. Its collider ends at z 2.01, leaving the broad
  // east-west concourse band beyond it clear rather than turning sockets into a doorway obstacle.
  const CX = 6.60, CZ = 1.30;

  // Depth runs the other way from what a plan drawing suggests: the camera is at -z, so a detail
  // that must sit IN FRONT of a face goes at a SMALLER z. Every `- .0nn` below is that.
  const PI = Math.PI;

  // ============================================================================ the floor
  // Tile under the washrooms, carpet everywhere else airside: the change of floor is how a
  // terminal tells you the room you are walking into is a wet one, before any sign does.
  flat(BCX, .014, 4.80, BW + .30, 1.90, col.grout, { gloss: .12, ...M_TILE });
  flat(CX, .012, CZ, 1.90, 1.42, col.inlay, { gloss: .10, ...M_TILE });

  // ============================================================================ 洗手间 the core
  box(BCX, BH / 2, BCZ, BW, BH, BD, col.wallD,
    { tag: '洗手间', hard: true, gloss: G.paint, ...M_TILE });
  box(BCX, .07, BCZ, BW + .05, .14, BD + .05, col.band,
    { tag: '洗手间', hard: true, gloss: .20, ...M_TILE });
  // The sign band, sitting ABOVE the screen's 2.35 m so the word 洗手间 is the one thing in this
  // cluster you can read from anywhere on the concourse. Everything else is signed at door height
  // and disappears the moment somebody stands in front of it.
  box(BCX, 3.02, BZ0 - .06, BW - .10, .48, .12, col.blueSign,
    { tag: '洗手间', hard: true, gloss: .26 });
  for (const g of glyphs(BCX - .74, 3.06, BZ0 - .13, PI, '洗手间',
    { size: .30, gap: .09, color: col.white, mode: 1, glow: .18 })) g.tag = '洗手间';
  for (const g of glyphs(BCX + .82, 2.98, BZ0 - .13, PI, 'Toilets',
    { size: .12, gap: .035, color: col.glass, mode: 1, glow: .10 })) g.tag = '洗手间';

  // ---- the two doors. Reveal proud of the face by 30 mm, leaf inset into the reveal.
  function leaf(dx, zh, tint) {
    box(dx, DH / 2, BCZ, DW, DH, BD + .06, col.charcoal,
      { tag: '洗手间', hard: true, gloss: .22 });
    box(dx, DH / 2 - .02, BZ0 - .065, DW - .12, DH - .12, .06, C('#1b1f24'),
      { tag: '洗手间', hard: true, gloss: .40 });
    box(dx + DW / 2 - .17, 1.02, BZ0 - .105, .07, .28, .02, col.chrome,
      { tag: '洗手间', hard: true, gloss: G.metal });
    // the plate over the leaf, read from inside the lobby once you are past the screen
    box(dx, 2.30, BZ0 - .025, .40, .26, .05, col.blueSign, { tag: '洗手间', hard: true, gloss: .26 });
    for (const g of glyphs(dx, 2.30, BZ0 - .065, PI, zh,
      { size: .17, gap: 0, color: tint, mode: 1, glow: .16 })) g.tag = '洗手间';
  }
  leaf(MENX, '男', C('#8fc4e8'));
  leaf(WOMX, '女', C('#e8a0b8'));

  // ---- 无障碍, on the west return, facing down the concourse and clear of the screen.
  box(BX0 + .18, DH / 2, ACCZ, .42, DH, DW, col.charcoal, { tag: '洗手间', hard: true, gloss: .22 });
  box(BX0 - .07, DH / 2 - .02, ACCZ, .06, DH - .12, DW - .12, C('#1b1f24'),
    { tag: '洗手间', hard: true, gloss: .40 });
  box(BX0 - .105, 1.02, ACCZ - DW / 2 + .17, .02, .28, .07, col.chrome,
    { tag: '洗手间', hard: true, gloss: G.metal });
  box(BX0 - .025, 2.30, ACCZ, .05, .32, .84, col.blueSign, { tag: '无障碍', hard: true, gloss: .26 });
  for (const g of glyphs(BX0 - .065, 2.30, ACCZ + .11, -PI / 2, '无障碍',
    { size: .14, gap: .045, color: col.white, mode: 1, glow: .16 })) g.tag = '无障碍';
  // The chair, drawn rather than written, because that is how the sign works. Every extent here is
  // thin in **x**, not in z: this plate faces -x, and a pictogram built for a -z face and then
  // hung on a west wall comes out edge-on and invisible, which is a mistake no render catches
  // because a zero-width white sliver on a blue plate looks like a scratch.
  wheelchair(BX0 - .068, 2.30, ACCZ - .27, .085);
  function wheelchair(x, y, z, s) {
    const w = z, b = z + .12 * s, h = z + .18 * s, f = z + .74 * s;
    cyl(x, y - .30 * s, w, .78 * s, .020, col.white,
      { tag: '无障碍', mode: 1, glow: .14, rx: PI / 2, ry: -PI / 2 });
    box(x, y + .34 * s, b, .020, .92 * s, .30 * s, col.white,
      { tag: '无障碍', hard: true, mode: 1, glow: .14 });
    ball(x, y + .98 * s, h, .020, .27 * s, .27 * s, col.white,
      { tag: '无障碍', mode: 1, glow: .14 });
    box(x, y - .18 * s, f, .020, .26 * s, .92 * s, col.white,
      { tag: '无障碍', hard: true, mode: 1, glow: .14 });
  }

  // ---- 保洁记录表, the cleaning-record sheet. Every Chinese terminal washroom has one screwed to
  // the wall by the door in a steel frame, initialled every two hours, and it is the single detail
  // that says which country this room is in. It sits in the bay east of 女 — the one part of the
  // frontage the screen does not cover, because a record nobody can read is not a record.
  // Every row is inside the sheet: the board runs y 1.205..1.795, the title sits at 1.735 and six
  // rows at a 0.075 pitch bottom out at 1.225. Rows that fall off the bottom edge of their own
  // board are the sort of thing that reads as a rendering fault from three metres away.
  box(NBX, 1.50, BZ0 - .015, .46, .64, .03, col.steelD, { tag: '洗手间', hard: true, gloss: G.metal });
  box(NBX, 1.50, BZ0 - .040, .41, .59, .02, col.white, { tag: '洗手间', hard: true, gloss: .24 });
  for (const g of glyphs(NBX, 1.735, BZ0 - .055, PI, '保洁记录表',
    { size: .052, gap: .014, color: col.blueSign, mode: 1 })) g.tag = '洗手间';
  for (const g of glyphs(NBX, 1.672, BZ0 - .055, PI, '时间 保洁员',
    { size: .038, gap: .008, color: col.steelD, mode: 1 })) g.tag = '洗手间';
  ['06:00 李', '08:00 李', '10:00 王', '12:00 王', '14:00 张', '16:00 张'].forEach((r, i) => {
    for (const g of glyphs(NBX, 1.600 - i * .075, BZ0 - .055, PI, r,
      { size: .042, gap: .010, color: col.charcoal, mode: 1 })) g.tag = '洗手间';
  });

  // ============================================================================ the screen
  box(SCX, SH / 2, SZ, SW, SH, ST, col.wallD,
    { tag: '洗手间', hard: true, gloss: G.paint, ...M_TILE });
  box(SCX, .07, SZ, SW, .14, ST + .06, col.band,
    { tag: '洗手间', hard: true, gloss: .20, ...M_TILE });
  box(SCX, SH + .03, SZ, SW + .04, .06, ST + .06, col.chrome,
    { tag: '洗手间', hard: true, gloss: G.metal });
  box(SCX, 1.96, SF, SW - .14, .44, .06, col.blueSign, { tag: '洗手间', hard: true, gloss: .26 });
  for (const g of glyphs(SCX - .58, 1.99, SF - .04, PI, '洗手间',
    { size: .23, gap: .07, color: col.white, mode: 1, glow: .18 })) g.tag = '洗手间';
  for (const g of glyphs(SCX + .74, 1.93, SF - .04, PI, 'Toilets',
    { size: .10, gap: .03, color: col.glass, mode: 1, glow: .10 })) g.tag = '洗手间';

  // The two pictograms, on white plates lined up with the doors they hide. Built out of primitives
  // rather than written, because the pictogram is the part of this sign a player who reads no
  // Chinese at all still understands — the characters underneath are what the room is teaching.
  function figure(px, female, tint) {
    box(px, 1.20, SF, .56, 1.06, .05, col.white, { tag: '洗手间', hard: true, gloss: .20 });
    const fz = SF - .035;
    ball(px, 1.53, fz, .058, .058, .012, tint, { tag: '洗手间', mode: 1, glow: .10 });
    if (female) {
      taper(px, 1.28, fz, .30, .34, .024, tint, { tag: '洗手间', mode: 1, glow: .10 });
      for (const s of [-1, 1])
        box(px + s * .045, 1.03, fz, .045, .18, .022, tint,
          { tag: '洗手间', hard: true, mode: 1, glow: .10 });
    } else {
      taper(px, 1.30, fz, .30, .30, .024, tint, { tag: '洗手间', mode: 1, glow: .10, rx: PI });
      for (const s of [-1, 1])
        box(px + s * .055, 1.03, fz, .055, .28, .022, tint,
          { tag: '洗手间', hard: true, mode: 1, glow: .10 });
    }
    for (const g of glyphs(px, .78, fz, PI, female ? '女' : '男',
      { size: .16, gap: 0, color: female ? C('#c4547c') : C('#2f6fa8'), mode: 1 })) g.tag = '洗手间';
  }
  figure(MENX, false, C('#2f6fa8'));
  figure(WOMX, true, C('#c4547c'));

  // Both ends are a way in, and both are signed as one. A screen wall that is not signed at its
  // ends is a screen wall a player walks up to and stops at.
  for (const [gx, txt] of [[SX0 + .48, '入口 ←'], [SX1 - .48, '→ 入口']]) {
    for (const g of glyphs(gx, .52, SF - .02, PI, txt,
      { size: .105, gap: .035, color: col.steelD, mode: 1 })) g.tag = '洗手间';
  }
  // The accessible door is round the west return, so from the concourse it is a direction rather
  // than a door. Without this line the only sign for it faces a wall nobody is standing at.
  for (const g of glyphs(SX0 + .52, .32, SF - .02, PI, '无障碍 ←',
    { size: .085, gap: .028, color: col.blueSign, mode: 1 })) g.tag = '无障碍';

  // ---- 小心地滑, the yellow cone, left at the west end of the screen by whoever signed the sheet
  // at 16:00. Placed clear of the walking line rather than in it, and with no collider of its own:
  // a 0.44 m box here inflates to 1.04 m and severs the only mouth this lobby has.
  taper(BX0 - .28, .33, 3.62, .34, .66, .30, col.yellow, { tag: '洗手间', gloss: .30 });
  box(BX0 - .28, .11, 3.62, .34, .10, .30, col.charcoal,
    { tag: '洗手间', hard: true, gloss: .22 });
  box(BX0 - .28, .40, 3.47, .21, .36, .02, col.yellow,
    { tag: '洗手间', hard: true, gloss: .30 });
  for (const g of glyphs(BX0 - .28, .40, 3.455, PI, '小心地滑',
    { size: .062, gap: .012, color: col.charcoal, mode: 1, vertical: true })) g.tag = '洗手间';

  // ---- what makes the lobby a lit room rather than a black slot between two walls.
  light(BCX, 2.30, 4.80, [1.00, 0.93, 0.80], .34, 2.8);
  shade(BCX, 4.80, BW + .40, 2.00, .18);

  // ============================================================================ 充电站
  // A charging island, which in a Chinese terminal is a piece of social furniture and not a socket:
  // people stand at it, sit under it, leave a phone on the shelf and watch it from a metre away.
  // Column, lit crown, a shelf on both faces at standing height, sockets you can count, three
  // stools, and somebody on the floor beside the low socket because the stools were taken.
  const leds = [];
  box(CX, .07, CZ, .62, .14, .62, col.steelD, { tag: '充电站', hard: true, gloss: G.metal });
  box(CX, 1.14, CZ, .46, 2.28, .46, col.white, { tag: '充电站', hard: true, gloss: .30, ...M_METAL });
  box(CX, 2.30, CZ, .52, .05, .52, col.tube, { tag: '充电站', hard: true, mode: 1, glow: .34 });
  box(CX, 2.50, CZ, .62, .34, .62, col.blueSign, { tag: '充电站', hard: true, gloss: .26 });
  box(CX, 2.70, CZ, .66, .05, .66, col.steel, { tag: '充电站', hard: true, gloss: G.metal });
  for (const [gz, yaw] of [[CZ - .315, PI], [CZ + .315, 0]]) {
    for (const g of glyphs(CX, 2.55, gz, yaw, '充电站',
      { size: .17, gap: .05, color: col.white, mode: 1, glow: .20 })) g.tag = '充电站';
    for (const g of glyphs(CX, 2.38, gz, yaw, '免费使用',
      { size: .075, gap: .02, color: col.glass, mode: 1, glow: .10 })) g.tag = '充电站';
  }

  // The shelf. 1.00 is the height a phone gets left at and a person stands to read it.
  for (const s of [-1, 1]) {
    box(CX, .99, CZ + s * .40, 1.32, .05, .36, col.oak,
      { tag: '充电站', mode: 6, gloss: .26, ...M_WOOD });
    for (const bx of [-.52, .52])
      box(CX + bx, .90, CZ + s * .34, .05, .14, .22, col.steelD,
        { tag: '充电站', hard: true, gloss: G.metal });
  }

  // The socket rail. Five 220 V outlets and four USB ports, drawn as things you could plug into
  // rather than as a texture — the sentence this fitting teaches is 手机快没电了 and it only means
  // anything if there is visibly somewhere to put the cable.
  // The rail overlaps 10 mm INTO the column rather than sharing its face. Two coplanar faces at
  // the same depth z-fight, and the flicker only shows up once the camera moves.
  box(CX, 1.36, CZ - .24, 1.04, .42, .04, col.slab, { tag: '充电站', hard: true, gloss: .24 });
  for (let i = 0; i < 5; i++) {
    const sx = CX - .40 + i * .20;
    box(sx, 1.44, CZ - .268, .135, .135, .02, col.charcoal, { tag: '充电站', hard: true, gloss: .20 });
    for (const dx of [-.028, .028])
      box(sx + dx, 1.462, CZ - .282, .012, .036, .012, col.black, { tag: '充电站', hard: true });
    leds.push(box(sx, 1.555, CZ - .278, .038, .038, .014, col.lime,
      { tag: '充电站', hard: true, mode: 1, glow: .28 }));
  }
  for (let i = 0; i < 4; i++)
    box(CX - .30 + i * .20, 1.245, CZ - .268, .072, .032, .02, C('#2a2f36'),
      { tag: '充电站', hard: true, gloss: .22 });
  for (const g of glyphs(CX - .40, 1.185, CZ - .285, PI, '220V',
    { size: .045, gap: .010, color: col.steelD, mode: 1 })) g.tag = '充电站';
  for (const g of glyphs(CX + .41, 1.185, CZ - .285, PI, 'USB',
    { size: .045, gap: .010, color: col.steelD, mode: 1 })) g.tag = '充电站';
  // The notice every one of these carries, and the reason it does. On the column between the rail
  // and the crown, at eye height — under the shelf it would be a plate the camera can never see,
  // because the camera is always above a 1.00 m counter looking down at it.
  box(CX, 1.78, CZ - .235, .62, .14, .02, col.white, { tag: '充电站', hard: true, gloss: .22 });
  for (const g of glyphs(CX, 1.78, CZ - .250, PI, '请看管好随身物品',
    { size: .052, gap: .008, color: col.redD, mode: 1 })) g.tag = '充电站';
  // and the same rail on the far face, plainer, because you only ever see it edge-on
  box(CX, 1.36, CZ + .24, 1.04, .42, .04, col.slab, { tag: '充电站', hard: true, gloss: .24 });
  for (let i = 0; i < 4; i++)
    box(CX - .33 + i * .22, 1.44, CZ + .268, .135, .135, .02, col.charcoal,
      { tag: '充电站', hard: true, gloss: .20 });

  // Three stools, none of them square to the island, because nobody has ever pushed one back.
  for (const [sx, sz] of [[CX - .93, CZ - .30], [CX + .78, CZ - .22], [CX + .70, CZ + .48]]) {
    cyl(sx, .015, sz, .165, .03, col.steelD, { tag: '充电站', gloss: G.metal });
    cyl(sx, .245, sz, .045, .44, col.steelD, { tag: '充电站', gloss: G.metal });
    cyl(sx, .49, sz, .175, .06, col.seat, { tag: '充电站', gloss: .24 });
    shade(sx, sz, .60, .60, .20);
  }

  // Phones on the shelf, plugged in and left. Two upright against the column and one flat.
  for (const [px, pz, ry, tilt] of [[CX - .46, CZ - .40, .35, 0], [CX + .30, CZ - .43, -.55, 0]]) {
    box(px, 1.028, pz, .078, .012, .150, col.charcoal,
      { tag: '充电站', hard: true, gloss: .40, ry, rx: tilt });
    box(px, 1.036, pz, .064, .002, .134, C('#8fbcd4'),
      { tag: '充电站', hard: true, mode: 1, glow: .18, ry, rx: tilt });
    cap(px + .05, 1.03, pz + .16, .006, .26, .006, col.white,
      { tag: '充电站', gloss: .14, rx: PI / 2 - .8, ry });
  }
  box(CX - .04, 1.065, CZ - .40, .09, .10, .17, C('#d8dcdc'),
    { tag: '充电站', hard: true, gloss: .30, ry: .4 });
  box(CX - .04, 1.075, CZ - .50, .035, .008, .012, col.lime,
    { tag: '充电站', hard: true, mode: 1, glow: .22, ry: .4 });

  // The low socket at the foot of the column, and the person using it. Everything about a charging
  // station in a Chinese terminal is in this figure: the stools are taken, the floor is not, and
  // the sockets nobody can reach standing up are the ones that are free.
  box(CX - .325, .17, CZ - .18, .04, .13, .17, col.slab, { tag: '充电站', hard: true, gloss: .24 });
  box(CX - .350, .17, CZ - .18, .01, .05, .06, col.charcoal, { tag: '充电站', hard: true });
  const SIT = { x: CX - .59, z: CZ - .37 };
  cap(SIT.x, .155, SIT.z, .60, .29, .50, C('#33414f'), { tag: '充电站', gloss: .10 });
  cap(SIT.x - .02, .50, SIT.z + .06, .36, .52, .30, C('#7c5f4c'), { tag: '充电站', gloss: .10 });
  ball(SIT.x - .02, .82, SIT.z + .05, .095, .105, .095, C('#c99b76'), { tag: '充电站', gloss: .08 });
  ball(SIT.x - .02, .866, SIT.z + .07, .100, .082, .098, C('#2a2622'), { tag: '充电站', gloss: .12 });
  for (const s of [-1, 1])
    cap(SIT.x + s * .18, .46, SIT.z - .13, .13, .34, .13, C('#7c5f4c'),
      { tag: '充电站', gloss: .10, rx: -.9 });
  box(SIT.x - .02, .60, SIT.z - .24, .075, .135, .012, col.charcoal,
    { tag: '充电站', hard: true, gloss: .40, rx: -.5 });
  box(SIT.x - .02, .604, SIT.z - .247, .062, .118, .002, C('#9fd0e4'),
    { tag: '充电站', hard: true, mode: 1, glow: .20, rx: -.5 });
  cap(CX - .46, .10, CZ - .12, .006, .78, .006, col.white,
    { tag: '充电站', gloss: .14, rz: PI / 2 - .3, ry: .5 });
  // his bag, on the floor at his elbow where it stops anyone taking the space
  box(SIT.x + .06, .19, SIT.z + .38, .30, .38, .22, C('#3e4a3c'), { tag: '充电站', gloss: .12, ry: .3 });
  box(SIT.x + .06, .40, SIT.z + .35, .26, .10, .16, C('#333d33'), { tag: '充电站', gloss: .12, ry: .3 });
  shade(CX, CZ, 2.10, 1.60, .22);
  shade(SIT.x, SIT.z, .95, .90, .20);
  light(CX, 2.05, CZ, [0.86, 0.93, 1.00], .16, 2.0);

  // ============================================================================ the colliders
  // The block, the screen and the island. Nothing else: the stools and the sitter live inside the
  // island's rectangle on purpose, because three separate 0.35 m colliders in the middle of a
  // walking line is how you build a place a player gets caught on.
  solid(BX0, BX1, BZ0, BZ1);
  solid(SX0, SX1, SZ - ST / 2, SZ + ST / 2);
  solid(CX - 1.03, CX + 1.03, CZ - .71, CZ + .71);
  blocker(BX0, BX1, BZ0, BZ1, BH);
  blocker(SX0, SX1, SZ - ST / 2, SZ + ST / 2, SH);
  // Only the column, not the whole island: the eye must not slide inside a 2.75 m opaque totem,
  // but blocking the stools would shove the camera every time the player walks past them.
  blocker(CX - .33, CX + .33, CZ - .33, CZ + .33, 2.75);

  // ============================================================================ the words
  thing('洗手间', SCX, 1.70, SZ - .40, '我去一趟洗手间，你等我一下。',
    "I'm nipping to the loo — wait for me a second.",
    '洗手 to wash your hands + 间 room. 男 men, 女 women, 无障碍 accessible.',
    // z 3.30 and not 2.65: the island's collider inflates to z 2.92, so a focus any nearer than
    // this is a spot the player can be sent to and can never actually stand on.
    { focus: [SCX, 3.30], reach: 2.2 });
  thing('无障碍', BX0 - .30, 1.70, ACCZ, '无障碍卫生间在最西边那扇门。',
    'The accessible toilet is the door on the far west side.',
    '无 without + 障碍 obstacle. 卫生间 is the other word for a toilet.',
    { focus: [BX0 - 1.20, ACCZ], reach: 2.0 });
  thing('充电站', CX, 1.30, CZ - .70, '手机快没电了，去充电站充一会儿。',
    'The phone is nearly flat — go and charge it at the charging point for a bit.',
    '充电 to charge + 站 station. 插座 a socket, 没电了 flat, 充电宝 a power bank.',
    { focus: [CX, CZ - 1.50], reach: 2.0 });

  // Handed to the tick below. A charge light that does not move is a sticker.
  AirFit['wc']._leds = leds;
};

// Anything that moves registers here and the shell dispatches it once a frame. Do not start your
// own timer: `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in minutes.
// A tick that throws is dropped for the rest of the run rather than stopping the terminal.
//
// Five outlets, five charge lamps, one slow sweep up the rail — the only moving thing in this zone
// and the cheapest kind there is, because `glow` is a per-instance attribute and changing it does
// not break the batch the five lamps already share.
AirFit['wc'].tick = (t) => {
  const leds = AirFit['wc']._leds;
  if (!leds || !leds.length) return;
  const k = (t * .42) % 1.35;
  for (let i = 0; i < leds.length; i++)
    leds[i].glow = .12 + .34 * Math.max(0, 1 - Math.abs(k - i / leds.length) * 5);
};
