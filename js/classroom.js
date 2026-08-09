// 教室 — a classroom inside the teaching block, reached through the entrance on the forecourt.
//
// A twelve-seat university Chinese seminar room: a green chalkboard across the front wall with
// the day's lesson on it and the university slogan above it, a teacher's podium, three rows of
// shared desks facing it, fluorescent tubes in a suspended ceiling, and a window wall along one
// side letting the forecourt light in. Its corridor door ultimately leads back out to the campus.
//
// Indoors, like the office and the shop: the renderer takes its light from the ceiling bulb
// and the window, and the room shell is set from RX/H/RZ.
const Classroom = Lazy('Classroom', () => {
  const col = {
    floor: C('#cfc6b4'), floorD: C('#b8af9d'), floorL: C('#ded7c6'),
    wall: C('#e7e2d6'), wallD: C('#cfc9bc'), trim: C('#9a9484'), ceil: C('#dcd6c8'),
    board: C('#2f5d4a'), boardF: C('#264a3a'), chalk: C('#f1ece0'), tray: C('#6b4a32'),
    desk: C('#c9a07a'), deskD: C('#9c764f'), deskTop: C('#d8b48c'),
    metal: C('#8a9097'), metalD: C('#5f656b'), steel: C('#b8bec4'),
    wood: C('#8a6a48'), woodD: C('#5d4530'),
    red: C('#a8372a'), redD: C('#7f2a20'), gold: C('#c9992f'), goldL: C('#e0b850'),
    cream: C('#ece4cf'), white: C('#eceae2'), charcoal: C('#33383d'),
    sky: C('#c2d4e2'), haze: C('#b4bcc0'), glass: C('#9fb6c4'),
    flagR: C('#b2412f'),
    leaf: C('#4f7a3c'), terracotta: C('#a2705a'), mud: C('#6b5a45'),
    blue: C('#3a6ea8'), teal: C('#4c8a86'), green: C('#2f7a4f'), key: C('#3a3f45'),
  };
  const G = { matte: .05, wood: .20, paint: .16, metal: .58, glass: .80, fabric: .04 };

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, flat, wall, glyphs,
          solid, shade, glow, thing } = B;

  // ---------------------------------------------------------------- dimensions
  // The front of the room (the blackboard) is the +z wall; the window is the -z wall; the door
  // is in the +x end of the back. Half-extents in x and z, full height in y.
  const RX = 4.6, RZ = 4.0, H = 2.90;
  const WIN = { x: 0, y: 1.50, z: -RZ + .05, hw: 3.40, hh: .90 };
  const DX = 3.40;                        // the door, in the +x end of the back wall
  const CLK = { x: DX, y: 2.56 };         // the clock, above the door and clear of the board
  // Back out onto the north teaching forecourt, a couple of paces in front of the rebuilt
  // teaching-block steps, facing the building.
  const OUT = { x: -3, z: 47.20, yaw: 0 };

  const litProps = [], tubes = [], doorParts = [], clock = { hour: null, min: null };
  const litten = (p, k) => { litProps.push({ p, k }); return p; };
  function movingDoor(p) {
    const sx=Math.hypot(p.m[0],p.m[1],p.m[2]);
    const sy=Math.hypot(p.m[4],p.m[5],p.m[6]);
    const sz=Math.hypot(p.m[8],p.m[9],p.m[10]);
    doorParts.push({p,m0:new Float32Array(p.m),ob:p.ob&&{...p.ob}});
    p.fixed=true; p.cx=p.m[12]; p.cy=p.m[13]; p.cz=p.m[14];
    p.r=.5*Math.hypot(sx,sy,sz)+.70;
    return p;
  }

  // ---------------------------------------------------------------- parts
  // A shared two-seat student desk: a top, a skirt under it, two stools tucked in. Faces +z
  // (toward the board) by default; `ry` rotates the whole row.
  function desk(cx, cz) {
    const T = { tag: '学生桌' };
    // The grain runs on the surfaces big enough to show it — tops, skirt, seats. The legs are
    // 6 cm square and a tiling material on them is a texture lookup nobody can see.
    const W = { mat: 'wood', matScale: .85, matAmt: .38 };
    box(cx, .74, cz, 1.40, .06, .70, col.deskTop, { hard: true, gloss: G.wood, ...W, ...T });
    box(cx, .70, cz, 1.40, .06, .70, col.deskD, { hard: true, gloss: G.wood, ...W, ...T });
    // a book and a pencil case left on it, so the top is not a bare plank
    box(cx - .30, .78, cz, .30, .03, .22, col.cream, { hard: true, gloss: .14, ...T });
    box(cx + .36, .78, cz, .20, .03, .12, col.red, { hard: true, gloss: .20, ...T });
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      box(cx + sx * .60, .37, cz + sz * .28, .06, .74, .06, col.deskD,
        { hard: true, gloss: G.wood, ...T });
    // two stools, tucked under
    for (const s of [-1, 1]) {
      box(cx + s * .36, .46, cz - .46, .36, .05, .36, col.desk,
        { hard: true, gloss: G.wood, ...W, ...T });
      for (const lx of [-1, 1]) for (const lz of [-1, 1])
        box(cx + s * .36 + lx * .14, .23, cz - .46 + lz * .14, .04, .46, .04, col.deskD,
          { hard: true, gloss: G.wood, ...T });
    }
    solid(cx - .74, cx + .74, cz - .70, cz - .12);
    shade(cx, cz - .30, 1.6, .9, .20);
  }

  function build() {
    // ================================================================ shell
    flat(0, 0, 0, RX * 2, RZ * 2, col.floor,
      { mode: 9, gloss: .10, mat: 'tile', matScale: .35, matAmt: .32 });
    // a lighter inlay stripe down the centre aisle, the one bit of intent in an otherwise
    // utilitarian floor — same tile at the same pitch, so it reads as a change of colour in one
    // floor rather than as a separate slab laid over it
    flat(0, .004, 0, .80, RZ * 2, col.floorL,
      { mode: 9, gloss: .12, mat: 'tile', matScale: .35, matAmt: .28 });
    for (let i = -6; i <= 6; i++) flat(0, .006, i * .70, RX * 2, .04, col.floorD, { gloss: .08 });
    // ceiling
    B.props.push({ mesh: 'quad', color: col.ceil, mode: 1, alpha: 1,
      m: M.mul(M.trans(0, H, 0), M.mul(M.rotZ(Math.PI), M.scale(RX * 2, 1, RZ * 2))) });
    // four walls — single-sided quads the cutaway can drop when the eye is outside them
    for (const [x, y, z, w, h, yaw] of [
      [0, H / 2, RZ, RX * 2, H, Math.PI], [-RX, H / 2, 0, RZ * 2, H, Math.PI / 2],
      [RX, H / 2, 0, RZ * 2, H, -Math.PI / 2], [0, H / 2, -RZ, RX * 2, H, 0],
    ]) wall(x, y, z, w, h, yaw, col.wall,
      { mode: 4, mat: 'plaster', matScale: 2.4, matAmt: .34 });
    // base trim round the room
    for (const [x, z, sx, sz] of [[0, RZ - .04, RX * 2, .08],
                                  [-RX + .04, 0, .08, RZ * 2], [RX - .04, 0, .08, RZ * 2],
                                  [0, -RZ + .04, RX * 2, .08]])
      box(x, .06, z, sx, .12, sz, col.trim, { hard: true, gloss: G.paint });
    // suspended ceiling grid
    for (let i = -4; i <= 4; i++) {
      box(i * .98, H - .01, 0, .03, .02, RZ * 2, col.wallD, { hard: true, gloss: .18 });
      box(0, H - .01, i * .92, RX * 2, .02, .03, col.wallD, { hard: true, gloss: .18 });
    }

    // ================================================================ the window wall (-z)
    // A continuous ribbon of glazing with a sill, looking out onto the forecourt. A backdrop of
    // pale sky and the smudge of the campus gives it depth — the same trick the office uses, so
    // the window reads as outside rather than as a lightbox.
    box(0, .52, -RZ + .10, RX * 2, 1.04, .20, col.wall,
      { hard: true, gloss: G.paint, mat: 'plaster', matScale: 2.4, matAmt: .26 });
    box(0, 1.06, -RZ + .16, RX * 2, .06, .30, col.white, { hard: true, gloss: .28 });
    box(0, H - .16, -RZ + .10, RX * 2, .32, .20, col.wall,
      { hard: true, gloss: G.paint, mat: 'plaster', matScale: 2.4, matAmt: .26 });
    box(0, 1.56, -RZ + .02, RX * 2 - .3, 1.10, .02, col.sky,
      { hard: true, mode: 1, glow: .07 });
    box(0, 1.18, -RZ + .015, RX * 2 - .3, .46, .02, col.haze,
      { hard: true, mode: 1, glow: .05 });
    // a couple of towers' worth of skyline blocks, faint, for the city beyond the campus
    let ts = 0x5a3c91;
    const tr = () => (ts = (ts * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    let tx2 = -RX + .30;
    while (tx2 < RX - .30) {
      const bw = .30 + tr() * .42, bh = .22 + tr() * .50;
      box(tx2 + bw / 2, 1.06 + bh / 2, -RZ + .028, bw * .95, bh, .012,
        C(tr() > .5 ? '#98a6b2' : '#8b98a4'), { hard: true, mode: 1, glow: .03 });
      tx2 += bw + .04 + tr() * .10;
    }
    for (const gx of [-3.30, -1.65, 0, 1.65, 3.30])
      box(gx, 1.56, -RZ + .05, 1.40, 1.06, .03, col.glass,
        { hard: true, mode: 1, alpha: .26, gloss: G.glass, glow: .06 });
    for (const mx of [-4.12, -2.47, -.82, .82, 2.47, 4.12])
      box(mx, 1.54, -RZ + .09, .07, 1.16, .10, col.metalD,
        { hard: true, gloss: G.metal, mat: 'metal', matScale: .45, matAmt: .30 });
    thing('窗户', 2.40, 1.56, -RZ + .34, '窗户外是操场。', 'Outside the window is the sports ground.',
      '窗户 window. 操场 is a sports field / playground.',
      { focus: [2.40, -RZ + 1.30], reach: 1.9 });

    // ================================================================ 黑板 the blackboard (+z, the front)
    // Dark green board across the middle of the front wall, a wood frame, a chalk tray, the
    // day's lesson in chalk, and the school slogan in red above it.
    //
    // Two things about the depths here, both of which cost the room its text once already.
    // The carcass has to sit *behind* the writing surface: it used to be a 20 cm slab whose
    // front face stood 4 cm proud of the green, so the green panel, the chalk and every other
    // fitting on this wall were sealed inside it and the board you read was the carcass.
    // And the board is 5.4 m, not the full 8.6 m of the wall — at full width it swallowed the
    // door, the clock, the class sign and the timetable along with the writing.
    const BW = 5.40, BF = RZ - .21;         // board width; the plane the writing sits on
    box(0, 1.70, RZ - .09, BW, 1.50, .18, col.boardF, { hard: true, gloss: G.matte });
    box(0, 1.66, RZ - .195, BW, 1.40, .03, col.board, { hard: true, mode: 1, gloss: .08 });
    for (const s of [-1, 1])
      box(s * (BW / 2), 1.66, RZ - .21, .08, 1.50, .06, col.woodD,
        { hard: true, gloss: G.wood, mat: 'wood', matScale: .80, matAmt: .36 });
    box(0, .96, RZ - .21, BW, .06, .12, col.tray,
      { hard: true, gloss: G.wood, mat: 'wood', matScale: .70, matAmt: .34 });
    box(-1.2, 1.00, RZ - .24, .26, .04, .04, col.chalk, { hard: true, gloss: .10 });
    // The lesson, in chalk: a sentence the player is meant to read. `yaw` is Math.PI to match
    // the +z wall's own yaw, so the characters face down the room, and a short lift keeps them
    // a clean 9 mm off the green instead of fighting it for pixels.
    glyphs(0, 1.86, BF - .003, Math.PI, '今天学什么',
      { size: .26, gap: .10, lift: .006, color: col.chalk, mode: 1, tag: '黑板' });
    glyphs(0, 1.40, BF - .003, Math.PI, '上课了',
      { size: .22, gap: .08, lift: .006, color: col.chalk, mode: 1, tag: '黑板' });
    // the slogan in red across the top of the board
    box(0, 2.62, RZ - .16, BW + .10, .34, .10, col.redD, { hard: true, gloss: .22 });
    for (const g of glyphs(0, 2.62, BF - .003, Math.PI, '好好学习 天天向上',
        { size: .20, gap: .08, lift: .006, color: col.goldL, mode: 1, tag: '黑板' })) litten(g, .4);
    thing('黑板', 0, 1.70, RZ - .50, '黑板上写着今天的课。', "Today's lesson is on the board.",
      '黑 black + 板 board. 上课 is to start class; 下课 to end it.',
      { focus: [0, RZ - 2.0], reach: 2.4 });

    // ================================================================ 讲台 the teacher's podium
    // A lectern at the front, centred on the board, with the teacher's chair behind it.
    box(0, .50, RZ - 1.30, 1.20, 1.00, .60, col.desk,
      { hard: true, gloss: G.wood, mat: 'wood', matScale: .95, matAmt: .38 });
    box(0, 1.02, RZ - 1.30, 1.00, .06, .50, col.deskTop,
      { hard: true, gloss: G.wood, mat: 'wood', matScale: .95, matAmt: .38 });
    // the lectern's angled top, to read as a podium rather than a low table
    box(0, 1.20, RZ - 1.40, .60, .36, .34, col.desk,
      { hard: true, rx: .42, gloss: G.wood, mat: 'wood', matScale: .95, matAmt: .36 });
    box(0, 1.34, RZ - 1.50, .58, .02, .32, col.cream, { hard: true, gloss: .14 });
    for (const s of [-1, 1]) for (const sz of [-1, 1])
      box(s * .50, .25, RZ - 1.30 + sz * .24, .06, .50, .06, col.deskD,
        { hard: true, gloss: G.wood });
    // A compact chair offset to the teacher's right, behind the lectern and below the board tray.
    const TCX = 1.05, TCZ = RZ - .62;
    box(TCX, .46, TCZ, .46, .05, .42, col.desk,
      { hard: true, gloss: G.wood, mat: 'wood', matScale: .70, matAmt: .34 });
    box(TCX, .72, TCZ + .19, .46, .42, .05, col.deskD,
      { hard: true, gloss: G.wood, mat: 'wood', matScale: .70, matAmt: .34 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      box(TCX + sx * .18, .23, TCZ + sz * .16, .04, .42, .04, col.deskD,
        { hard: true, gloss: G.wood });
    solid(-.72, .72, RZ - 1.66, RZ - .98);
    shade(0, RZ - 1.30, 1.6, 1.0, .20);

    // ================================================================ 学生桌 the desks
    // Three rows of shared desks down the room, facing the board. The first is the 上课 seat.
    desk(-1.6, .6); desk(1.6, .6);
    desk(-1.6, -.6); desk(1.6, -.6);
    desk(-1.6, -1.8); desk(1.6, -1.8);
    // The seminar interaction resolves to the inner stool at the front-left desk.
    thing('学生桌', 0, .74, .6, '研讨课认真听，也要发言。', 'Listen and take part in the seminar.',
      '研讨课 is a seminar. 学生 student + 桌 table.',
      { focus: [0, .6 - 1.1], reach: 1.8 });

    // ================================================================ 门 the corridor door (+z, east end)
    const dz = RZ - .10;
    movingDoor(box(DX, 1.06, dz + .04, 1.18, 2.20, .14, col.woodD,
      { hard: true, gloss: G.wood, mat: 'wood', matScale: .90, matAmt: .36 }));
    movingDoor(box(DX, 1.02, dz, 1.00, 2.06, .07, col.wood,
      { tag: '门', gloss: .28, mat: 'wood', matScale: .90, matAmt: .38 }));
    movingDoor(box(DX, 1.42, dz - .04, .44, .60, .02, col.glass,
      { tag: '门', hard: true, mode: 1, alpha: .40, gloss: G.glass }));
    movingDoor(capsule(DX - .38, 1.02, dz - .09, .026, .22, .026, col.steel,
      { tag: '门', rx: Math.PI / 2, gloss: G.metal }));
    for(const g of glyphs(DX, 1.86, dz - .05, Math.PI, '出口',
      { size: .13, gap: .05, color: col.charcoal, mode: 1, tag: '门' })) movingDoor(g);
    thing('门', DX, 2.30, dz - .20, '下课了，走吧。', 'Class is over. Let us go.',
      'Out through the door and back onto the forecourt.',
      { focus: [DX, dz - 1.05], reach: 1.9 }).exit = { place: 'campus', at: OUT };

    // ================================================================ lights and the small stuff
    // Two fluorescent fittings in the ceiling: lit panels plus a glow blob each, so they read
    // as the room's light source. The zone bulb (in finish) does the actual shading.
    for (const lx of [-1.6, 1.6]) {
      box(lx, H - .04, 0, 1.60, .08, RZ * 1.4, col.white, { hard: true, gloss: .30 });
      litten(box(lx, H - .07, 0, 1.50, .04, RZ * 1.3, C('#fff4d8'),
        { hard: true, mode: 1, glow: .20 }), 1);
      tubes.push(glow(M.trs(lx, H - .09, 0, 0, 1.50, 1, RZ * 1.3), C('#fff4d8'), 0));
    }
    // Real light to go with them. A fluorescent batten is a two-metre line of light, not a bulb,
    // so each fitting gets three points spaced down its length: one lamp in the middle of the
    // ceiling leaves the front and back rows in a gloom no classroom has. Cool white, wide and
    // weak rather than narrow and strong, and the shell keeps its own zone bulb underneath.
    for (const lx of [-1.6, 1.6]) for (const lz of [-2.3, 0, 2.3])
      B.light(lx, H - .30, lz, [1.00, 0.97, 0.90], .36, 2.90);
    // and a pair angled at the board, which is the one surface in here anyone has to read
    for (const lx of [-1.5, 1.5]) B.light(lx, 2.60, RZ - .95, [1.00, 0.96, 0.88], .30, 2.10);
    // A wall clock above the door, the one thing every classroom has. Off the board now — at
    // the old x it hung inside the blackboard — and the hands sit in front of the face rather
    // than behind it, which is where they used to be.
    cyl(CLK.x, CLK.y, dz - .02, .22, .04, col.white, { rx: Math.PI / 2, gloss: .26 });
    cyl(CLK.x, CLK.y, dz - .05, .20, .02, col.wallD, { rx: Math.PI / 2, gloss: .26 });
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      box(CLK.x + Math.sin(a) * .16, CLK.y + Math.cos(a) * .16, dz - .065, .015, .03, .03, col.charcoal,
        { hard: true, rx: Math.PI / 2, ry: a, gloss: .30 });
    }
    clock.hour = box(CLK.x, CLK.y, dz - .075, .012, .12, .016, col.charcoal,
      { hard: true, rx: Math.PI / 2, gloss: .34 });
    clock.min = box(CLK.x, CLK.y, dz - .085, .010, .16, .012, col.charcoal,
      { hard: true, rx: Math.PI / 2, gloss: .34 });
    // the national flag in the front corner, where it always is
    box(-RX + .30, 2.30, RZ - .10, .60, .40, .02, col.flagR,
      { hard: true, mode: 7, gloss: G.fabric, mat: 'fabric', matScale: .45, matAmt: .30 });
    for (const s of [-1, 1]) box(-RX + .30 + s * .28, 2.30, RZ - .12, .012, .44, .012,
      col.gold, { hard: true, gloss: .30 });
    // a broom and a wastebasket in the back corner, the classroom's own clutter
    for (let i = 0; i < 2; i++)
      capsule(-RX + .30 + i * .10, 1.10, -RZ + .40, .018, 1.80, .018, col.woodD,
        { rx: .12 + i * .06, rz: .10, gloss: G.wood });
    cyl(-RX + .70, .30, -RZ + .40, .22, .60, col.steel,
      { gloss: G.metal, mat: 'metal', matScale: .50, matAmt: .30 });

    // ================================================================ 投影仪 projector + screen
    // A white roll-down screen, and a projector on the ceiling at the back. The screen hangs
    // *in front of* the board over its left end — at the old centre depth it was sealed inside
    // the slogan panel, and centred it would have hung across the day's lesson.
    box(-1.95, 2.42, RZ - .235, 1.20, .05, .04, col.white, { hard: true, gloss: .30 });  // screen case
    box(-1.95, 2.15, RZ - .232, 1.16, .48, .012, col.cream, { hard: true, mode: 1, gloss: .18 });  // surface
    // a slight curl at the bottom of the screen to read as rolled
    box(-1.95, 1.90, RZ - .232, 1.14, .03, .016, col.cream, { hard: true, rx: .08, gloss: .18 });
    // projector on the ceiling, centred in the room but at the back near -z
    box(0, H - .14, -RZ + 1.40, .20, .08, .30, col.charcoal, { hard: true, gloss: G.matte });
    box(0, H - .18, -RZ + 1.24, .12, .04, .08, col.metal, { hard: true, gloss: G.metal });
    // a faint cone of light from the projector lens toward the screen
    litten(box(0, H - .18, -RZ + 1.20, .14, .01, .02, C('#e8e0d0'),
      { hard: true, mode: 1, glow: .06 }), .3);

    // ================================================================ teacher's computer on 讲台
    // A monitor facing the teacher (toward -z), with a keyboard.
    box(0, 1.16, RZ - 1.08, .32, .28, .02, col.deskD, { hard: true, gloss: .40 });
    litten(box(0, 1.16, RZ - 1.10, .30, .24, .01, C('#4a6a8a'),
      { hard: true, mode: 1, glow: .14 }), .15);
    box(0, 1.04, RZ - 1.04, .12, .01, .02, col.cream, { hard: true, gloss: .18 });  // stand
    box(0, 1.04, RZ - 1.02, .34, .02, .12, col.charcoal, { hard: true, gloss: .30 });  // keyboard
    box(0, 1.02, RZ - 1.02, .20, .01, .10, col.key, { hard: true, gloss: .20 });  // key surface

    // ================================================================ 书架 bookshelves along the -x wall
    // Three tall shelves between the back and the front, with books.
    const SX = -RX + .14;
    for (const side of [-1, 1]) {
      box(SX + side * .02, 1.10, 0, .06, 1.90, 1.60, col.deskD,
        { hard: true, gloss: G.wood, mat: 'wood', matScale: .90, matAmt: .36 });
      for (let i = 0; i < 4; i++)
        box(SX, .22 + i * .54, 0, .04, .03, 1.50, col.deskD, { hard: true, gloss: G.wood });
    }
    // books: randomly coloured boxes on the shelves
    let bookSeed = 0x7a3e9b;
    const next = () => (bookSeed = (bookSeed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 18; i++) {
      const by = .40 + Math.floor(i / 6) * .54, bz = -.70 + next() * 1.40;
      const bw = .06 + next() * .10, bh = .14 + next() * .12;
      const bcol = [col.red, col.blue, col.teal, col.green, col.gold, col.cream][i % 6];
      box(SX + .04, by + bh / 2, bz, bw, bh, .04, bcol, { hard: true, gloss: .22 });
    }

    // ================================================================ 班级牌 · 课程表 beside the door
    // Both used to hang at x ≈ 1.5–2.2, which is inside the old full-width board, and both were
    // written with yaw 0 — facing into their own backing plate. Read: two plaques of nothing.
    // They live on the strip of wall between the door and the corner now, sign over timetable,
    // written with the wall's own yaw so the characters face down the room.
    const SGX = 4.29;
    box(SGX, 1.86, RZ - .08, .44, .18, .04, col.charcoal, { hard: true, gloss: .26 });
    box(SGX, 1.86, RZ - .105, .42, .16, .02, col.white, { hard: true, mode: 1, gloss: .18 });
    glyphs(SGX, 1.86, RZ - .117, Math.PI, '汉语研讨',
      { size: .08, gap: .02, lift: .005, color: col.charcoal, mode: 1, tag: '班级牌' });
    thing('班级牌', SGX, 1.86, RZ - .30, '大学汉语研讨课的教室。', 'A university Chinese seminar room.',
      '研讨课 is a seminar course. 大学 is university.',
      { focus: [SGX - .20, RZ - .95], reach: 2.0 });

    box(SGX, 1.28, RZ - .06, .26, .38, .03, col.charcoal, { hard: true, gloss: .26 });
    box(SGX, 1.28, RZ - .085, .24, .36, .02, col.cream, { hard: true, mode: 1, gloss: .18 });
    glyphs(SGX, 1.41, RZ - .097, Math.PI, '课程表',
      { size: .06, gap: .015, lift: .005, color: col.charcoal, mode: 1, tag: '课程表' });
    // the ruled week under the heading — centred on the plate, and standing off its face
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      const gx = SGX - .09 + c * .045, gy = 1.33 - r * .05;
      box(gx, gy, RZ - .098, .040, .004, .012, col.wallD, { hard: true, mode: 1, gloss: .12 });
    }
    thing('课程表', SGX, 1.28, RZ - .30, '今天的课表。', "Today's class schedule.",
      '课程 course + 表 table/chart. 课 is a class period; 下课 is class dismissed.',
      { focus: [SGX - .20, RZ - .95], reach: 2.0 });

    // ================================================================ 书包 backpacks on desks
    for (const [bx, bz, bc] of [[1.6, 1.2, col.blue], [1.6, 0, col.teal], [-1.6, -1.2, col.green]]) {
      box(bx + .40, .44, bz - .46, .16, .04, .14, bc, { hard: true, gloss: .28 });  // main body
      box(bx + .40, .52, bz - .48, .12, .14, .10, bc, { hard: true, gloss: .26 });  // top flap
      capsule(bx + .40, .56, bz - .44, .008, .18, .008, col.woodD, { rx: .20, gloss: .18 });  // strap
    }

    // ================================================================ 盆栽 a plant by the window
    // Back-right corner, by the window wall, where a real plant would sit for the light.
    box(RX - .35, .20, -RZ + .50, .18, .36, .18, col.terracotta, { hard: true, gloss: .26 });
    box(RX - .35, .44, -RZ + .50, .14, .04, .14, col.mud, { hard: true, gloss: .06 });
    for (let i = 0; i < 5; i++) {
      const pa = i * 1.26 + .3, pr = .12 + next() * .08, ph = .30 + next() * .18;
      capsule(RX - .35 + Math.cos(pa) * pr, .38 + ph / 2, -RZ + .50 + Math.sin(pa) * pr,
        .012, ph, .012, col.leaf, { rx: .4 + next() * .3, ry: pa, gloss: .14 });
    }
  }

  build();

  // The board's slogan and the ceiling tubes come up softly after dark. There is nobody here at
  // night, so it is a quiet lift rather than the busy night of a lit room.
  function setNight(k) {
    const soft = k * k * (3 - 2 * k);
    for (const { p, k: kk } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) + soft * kk * .30;
    for (const g of tubes) g.a = soft * .10;
  }

  function tick(t, body, mins) {
    const dx=body?body.x-DX:99,dz=body?body.z-(RZ-.72):99;
    let open=1-Math.min(1,Math.hypot(dx,dz)/1.95);
    open=open*open*(3-2*open);
    const a=-1.16*open,c=Math.cos(a),s=Math.sin(a),px=DX+.62,pz=RZ-.10;
    for(let i=0;i<doorParts.length;i++) {
      const q=doorParts[i],p=q.p,m=p.m,b=q.m0;
      for(let j=0;j<3;j++) {
        const o=j*4,x=b[o],z=b[o+2];
        m[o]=c*x+s*z; m[o+1]=b[o+1]; m[o+2]=-s*x+c*z; m[o+3]=b[o+3];
      }
      const x=b[12]-px,z=b[14]-pz;
      m[12]=px+c*x+s*z; m[13]=b[13]; m[14]=pz-s*x+c*z; m[15]=1;
      p.cx=m[12]; p.cy=m[13]; p.cz=m[14];
      if(q.ob) {
        const ox=q.ob.x-px,oz=q.ob.z-pz;
        p.ob.x=px+c*ox+s*oz; p.ob.z=pz-s*ox+c*oz; p.ob.ry=q.ob.ry+a;
      }
    }
    if (!clock.hour) return;
    const hand = (p, z, len, w, ang) => {
      p.m = M.mul(M.trans(CLK.x, CLK.y, z),
        M.mul(M.rotZ(ang), M.mul(M.trans(0, len / 2, 0), M.scale(w, len, .012))));
    };
    // in front of the dial (RZ - .15) rather than buried in it
    hand(clock.hour, RZ - .175, .115, .016, -(mins % 720) / 720 * Math.PI * 2);
    hand(clock.min, RZ - .185, .155, .012, -(mins % 60) / 60 * Math.PI * 2);
  }

  return B.finish({
    setNight, tick, RX, RZ, H, WIN, OUT,
    // The inner stool at the front-left desk, facing the board (+z).
    SEAT_AT: [-1.6 + .36, .6 - .46], SEAT_FACE: 0, SEAT_Y: .46,
    label: '教室', labelK: '教室 · seminar classroom',
    indoor: true, cutaway: true, near: .05, far: 40, expose: 1,
    spawn: { x: DX - .50, z: RZ - 1.10, yaw: Math.PI * 1.02 },
    zones: [{ id: 'classroom', x0: -RX, x1: RX, z0: -RZ, z1: RZ, light: [0, H - .30, 0] }],
    roomAt() { return this.zones[0]; },
  });
});
