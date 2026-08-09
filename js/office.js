// 公司 — the office you work in, four floors up in the block across the road.
//
// A small Chinese company in a 1990s tower: a grid of desks with screens on monitor arms, a
// carpet tile floor, a suspended ceiling of light panels, vertical blinds on the window wall,
// a whiteboard nobody has wiped, a water cooler, and a wall of shelves holding ring binders.
// The word this room teaches is 上班 — going in to work — and the desk is where the game's
// existing paid work action happens, so the money you spend in the shop comes from here.
//
// Same convention as the other interiors: the glazing is on the -z wall so daylight projects
// through it, and the way out is tagged 门.
//
// Surfaces and light. Everything large enough to read carries a tiling material now — the
// carpet a fabric weave at half a metre so the pile and the tile seams agree, the walls
// plaster at 2.4 m, the desktops and the shelving a wood at 90 cm, the desk frames and the
// filing metal. `matAmt` stays low throughout: the palette below was chosen, and the texture
// is here to stop four metres of beige being one flat value, not to repaint the room.
//
// And the ceiling panels are real lights, not just bright rectangles. An office is not lit by
// one lamp in the middle — it is lit by a grid, which is most of why the light in one is so
// even and so characterless, and a light per panel is the cheapest way to say that. The
// monitors get one each as well: weak, cold and 20 cm across, because a screen throws a little
// of itself onto the desk in front of it and nothing else in this room is coloured by anything.
const Office = Lazy('Office', () => {
  const col = {
    carpet: C('#6f7076'), carpetD: C('#5c5d63'), wall: C('#dcd9d1'), ceil: C('#eeece6'),
    panel: C('#f6f5ee'), grid: C('#c3c1ba'), trim: C('#b0aca3'),
    steel: C('#a8afb5'), steelD: C('#787f85'), chrome: C('#c7cdd1'),
    white: C('#f1efe8'), cream: C('#e6e0d2'), charcoal: C('#33383e'), black: C('#1d2024'),
    desk: C('#c9c3b4'), deskD: C('#8e887b'), wood: C('#8c6c47'), woodD: C('#5d4630'),
    screen: C('#1b2028'), screenOn: C('#a8c4d8'), key: C('#2a2e34'),
    blue: C('#3a6a92'), blueL: C('#5f8fb6'), navy: C('#28374b'), jade: C('#3f7564'),
    red: C('#a8372a'), gold: C('#cf9c31'), green: C('#4e7a44'), orange: C('#d07a33'),
    glass: C('#c4d7e3'), board: C('#f4f4ef'), marker: C('#3d5f8f'),
    binder: C('#8d6f52'), plant: C('#48793f'), plantD: C('#315a30'), pot: C('#a2634a'),
  };
  const G = { matte: .06, wood: .20, paint: .16, metal: .58, glass: .80, fabric: .05 };

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, wall, flat, glyphs,
          solid, shade, glow, thing } = B;

  // ---------------------------------------------------------------- dimensions
  const RX = 4.4, RZ = 3.4, H = 2.66;
  const WIN = { x: 0, y: 1.52, z: -RZ + .05, hw: 3.60, hh: .80 };
  const DX = 3.35;                        // the door, in the +x end of the back wall
  // Back out onto the far pavement, on the office side of the road.
  const OUT = { x: 39.4, z: 2.20, yaw: -Math.PI * .5 };

  const litProps = [], screens = [], doorParts = [];
  function litten(p, k) { litProps.push({ p, k }); return p; }
  function movingDoor(p) {
    const sx = Math.hypot(p.m[0], p.m[1], p.m[2]);
    const sy = Math.hypot(p.m[4], p.m[5], p.m[6]);
    const sz = Math.hypot(p.m[8], p.m[9], p.m[10]);
    doorParts.push({ p, m0: new Float32Array(p.m), ob: p.ob && { ...p.ob } });
    // The packed cull sphere is built once in finish(), so it has to include the whole hinge arc.
    p.fixed = true; p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    p.r = .5 * Math.hypot(sx, sy, sz) + .70;
    return p;
  }

  let seed = 0x0ff1ce;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = a => a[(rnd() * a.length) | 0];

  // ---------------------------------------------------------------- 本周计划 what there is to do
  // Five jobs written up on the whiteboard, and the board is the only place their numbers live —
  // the panel is built from this list and so is what the desk pays you, so what is on the wall is
  // what you get. `h0`/`h1` are the hours a job exists between: most of them are the working day,
  // and 加班 by definition is not.
  //
  // Roughly ¥60 an hour, which against ¥60 of rent and ¥18 noodles makes one job a day a living
  // and two a comfortable one.
  const TASKS = [
    { hz:'打字', py:'dǎzì', en:'typing up notes', pay:90, secs:5.0, mins:90, h0:9, h1:19,
      gain:{ mood:-8, rest:-9, food:-6 },
      done:'打完了，手有点酸。', doneTr:'Done. My hands ache a bit.' },
    { hz:'打电话', py:'dǎ diànhuà', en:'a morning of phone calls', pay:110, secs:5.2, mins:110,
      h0:9, h1:19, gain:{ mood:-12, rest:-10, food:-7 },
      done:'打了一上午电话，嗓子哑了。',
      doneTr:'A morning on the phone. My voice has gone.' },
    { hz:'做表格', py:'zuò biǎogé', en:'build a spreadsheet', pay:140, secs:5.8, mins:150,
      h0:9, h1:19, gain:{ mood:-14, rest:-14, food:-9 },
      done:'表格做完了，一共三百行。',
      doneTr:'The spreadsheet is done. Three hundred rows of it.' },
    { hz:'写报告', py:'xiě bàogào', en:'write the report', pay:190, secs:6.4, mins:210,
      h0:9, h1:19, gain:{ mood:-18, rest:-20, food:-13 },
      done:'报告交了，经理没看。',
      doneTr:'Report handed in. The manager has not read it.' },
    { hz:'加班', py:'jiābān', en:'work late', pay:260, secs:6.8, mins:240, h0:18, h1:24,
      gain:{ mood:-26, rest:-28, food:-16 },
      done:'加了四个小时的班，楼里就剩我。',
      doneTr:'Four hours of overtime. Last one in the building.' },
  ];

  // ---------------------------------------------------------------- parts
  // One workstation: a desk on a steel frame, a screen on an arm, a keyboard, a task chair,
  // and the litter of somebody's day. `mine` marks the one you sit at, which gets the mug and
  // the notebook and is the one the work action is attached to.
  function workstation(cx, cz, ry, mine) {
    const T = { ry }, tag = mine ? '办公桌' : undefined;
    const O = tag ? { ...T, tag } : T;
    // The top is laminate over board and the frame is powder-coated steel, and until they had
    // a material on them they were two flat values a shade apart. 90 cm of grain is about one
    // board's width, so the run of four desks does not repeat the same plank four times.
    box(cx, .73, cz, 1.50, .05, .74, col.desk,
      { ...O, gloss: .26, mat: 'wood', matScale: .90, matAmt: .34 });
    box(cx, .70, cz + .34, 1.50, .06, .05, col.deskD, { ...O, hard: true, gloss: .24 });
    for (const s of [-1, 1]) {
      box(cx + s * .68, .36, cz, .06, .70, .66, col.steelD,
        { ...O, hard: true, gloss: G.metal, mat: 'metal', matScale: .48, matAmt: .22 });
      box(cx + s * .68, .02, cz, .10, .04, .74, col.steelD, { ...O, hard: true, gloss: G.metal });
    }
    // A modesty panel, so the desks read as a bank rather than four floating boards.
    box(cx, .40, cz + .36, 1.44, .58, .03, col.deskD,
      { ...O, hard: true, gloss: .20, mat: 'wood', matScale: .90, matAmt: .30 });
    // screen on an arm
    capsule(cx + .34, .86, cz + .26, .022, .26, .022, col.steelD, { gloss: G.metal });
    box(cx + .10, 1.06, cz + .24, .50, .04, .04, col.steelD,
      { hard: true, ry, gloss: G.metal });
    box(cx - .06, 1.14, cz + .22, .62, .38, .03, col.screen,
      { ...O, hard: true, gloss: .40 });
    // Something actually on the screen. A single flat panel read as a black slab with a blue
    // wash over it; a title bar and three lines of text is enough to say "somebody's work".
    const lit = litten(box(cx - .06, 1.14, cz + .205, .58, .34, .01, col.screenOn,
      { ...O, hard: true, mode: 1, glow: .22 }), .2);
    const fw = ry > 1 ? -1 : 1;             // which way the screen faces, for the text offset
    box(cx - .06, 1.28, cz + .20 - .002 * fw, .58, .06, .01, C('#5d7d96'),
      { ...O, hard: true, mode: 1, glow: .18 });
    for (let i = 0; i < 4; i++)
      box(cx - .16 + (i % 2) * .04, 1.19 - i * .05, cz + .20 - .002 * fw,
        .34 - (i % 3) * .08, .012, .01, C('#7f9db4'),
        { ...O, hard: true, mode: 1, glow: .14 });
    screens.push({ p: lit, seed: rnd() });
    // A lit screen throws a little of itself forward. It is weak — a monitor is not a lamp —
    // and it is the one cold light in a room otherwise lit entirely by white panels, so the
    // half metre of desk in front of each screen sits a touch bluer than the rest of it.
    // 20 cm in front of the glass, at screen height, so it falls on the keyboard and not the
    // wall. The power is small because the distance is: this sits 33 cm above the desktop and
    // at .30 the inverse square did the rest — every desk in the room came out as a sheet of
    // white paper with the wood only visible on the modesty panel underneath it.
    B.light(cx - .06, 1.06, cz + .02, [0.56, 0.74, 1.00], .10, .55);
    // keyboard, mouse, and a mug
    box(cx - .04, .77, cz - .06, .44, .02, .16, col.key, { ...O, hard: true, gloss: .30 });
    box(cx + .30, .77, cz - .06, .10, .03, .14, col.charcoal, { ...O, gloss: .34 });
    if (mine) {
      cyl(cx - .48, .80, cz - .12, .045, .10, col.white, { ...O, gloss: .30 });
      capsule(cx - .43, .80, cz - .12, .010, .07, .010, col.white, { rz: Math.PI / 2, gloss: .30 });
      box(cx + .52, .76, cz - .14, .22, .02, .30, col.cream, { ...O, hard: true, gloss: .18 });
      box(cx + .52, .775, cz - .14, .20, .01, .28, col.white, { ...O, hard: true, gloss: .16 });
    } else {
      // somebody else's desk: a stack of paper and a bottle of water
      box(cx + .46, .77, cz - .10, .22, .03, .30, col.white, { hard: true, ry, gloss: .18 });
      cyl(cx - .50, .86, cz - .16, .035, .22, C('#bfe0e8'),
        { mode: 1, alpha: .7, gloss: G.glass });
    }
    // Task chair: a gas lift on a five-star base, a seat and a back. It goes on the side of the
    // desk the desk faces, and 60 cm back from the middle of it rather than 82 — the offset was
    // the same for every station regardless of `ry`, which put the far bank's chairs on the wrong
    // side of their own desks, and 82 cm is further than a seated arm reaches, so everybody sat
    // with their hands in the air a foot short of the keyboard.
    const dir = ry > 1 ? 1 : -1;
    const chz = cz + dir * .60;
    cyl(cx, .04, chz, .28, .05, col.charcoal, { gloss: .30 });
    for (let i = 0; i < 5; i++)
      box(cx + Math.sin(i * 1.257) * .17, .04, chz + Math.cos(i * 1.257) * .17,
        .07, .045, .30, col.charcoal, { hard: true, ry: i * 1.257, gloss: .30 });
    capsule(cx, .26, chz, .035, .40, .035, col.steelD, { gloss: G.metal });
    // Chair upholstery is the one soft thing at this end of the room, and a 30 cm weave is
    // what makes it read as the coarse contract fabric a task chair is actually covered in.
    box(cx, .46, chz, .48, .07, .46, col.navy,
      { mode: 7, gloss: G.fabric, mat: 'fabric', matScale: .30, matAmt: .32 });
    box(cx, .72, chz + dir * .22, .46, .50, .07, col.navy,
      { mode: 7, rx: -.12 * dir, gloss: G.fabric, mat: 'fabric', matScale: .30, matAmt: .32 });
    solid(cx - .80, cx + .80, cz - .50, cz + .42);
    shade(cx, cz, 1.9, 1.2, .26);
  }

  // A recessed light panel in the suspended ceiling. Two rows of these is what an office
  // ceiling *is*, and they cost almost nothing.
  function panel(cx, cz) {
    box(cx, H - .02, cz, 1.20, .04, .60, col.grid, { hard: true, gloss: .20 });
    litten(box(cx, H - .05, cz, 1.12, .02, .52, col.panel,
      { hard: true, mode: 1, glow: .40 }), .9);
    glow(M.trs(cx, .02, cz, 0, 3.0, 1, 2.4), C('#eef2f6'), .09);
    // The two above are what the fitting looks like — a bright rectangle in the grid and a soft
    // patch painted on the carpet under it — and neither of them lit anything. This does. It is
    // *very* weak on purpose. Six of them overlap on a floor that the ambient and the ceiling
    // bulb already light to a working brightness, and at a third of this the carpet went to
    // white paper and the desks lost their tops: what these are for is the modelling — the
    // gradient down a wall, the top of a desk brighter than its front — not the exposure.
    // 4000 K, which is the tube every one of these panels in China has in it.
    B.light(cx, H - .14, cz, [0.94, 0.97, 1.00], .13, 2.55);
  }

  function build() {
    // ================================================================ shell
    // Carpet tile, and a fabric weave read triplanar in world space is what says so — 40 cm a
    // repeat, which at eye height is a pile rather than a pattern. The amount is held down
    // because this texture photographs much lighter than the grey the carpet is meant to be:
    // at .34 the floor came out as white paper with a grid ruled on it.
    //
    // The seams below take the same material, and that is not decoration. They are a darker
    // grey drawn on top of the field, so lifting the field and not them widened the gap between
    // the two until the floor read as white ceramic tile with grout in it. Same texture, same
    // amount, same lift: the seams stay exactly as much darker than the carpet as they were.
    const CARPET = { mat: 'fabric', matScale: .40, matAmt: .22 };
    flat(0, 0, 0, RX * 2, RZ * 2, col.carpet, { mode: 7, gloss: .10, ...CARPET });
    B.props.push({ mesh: 'quad', color: col.ceil, mode: 1, alpha: 1,
      m: M.mul(M.trans(0, H, 0), M.mul(M.rotZ(Math.PI), M.scale(RX * 2, 1, RZ * 2))) });
    // Plaster. `nrmAmt` is the number that matters here and it is not the obvious one: the
    // colour map of this material is nearly a flat grey, so almost everything you see of it is
    // its normal map, and that arrives at full strength unless you say otherwise. At 1 the
    // trowel swirls came out a foot across and lit like relief, and three metres of blank
    // office wall turned into a slab of marble. A quarter of it is a skim coat.
    const PLASTER = { mat: 'plaster', matScale: 1.60, matAmt: .22, nrmAmt: .26 };
    for (const [x, y, z, w, h, yaw] of [
      [0, H / 2, RZ, RX * 2, H, Math.PI], [-RX, H / 2, 0, RZ * 2, H, Math.PI / 2],
      [RX, H / 2, 0, RZ * 2, H, -Math.PI / 2], [0, H / 2, -RZ, RX * 2, H, 0],
    ]) wall(x, y, z, w, h, yaw, col.wall, { mode: 4, ...PLASTER });
    for (const [x, z, sx, sz] of [[0, RZ - .04, RX * 2, .08],
                                  [-RX + .04, 0, .08, RZ * 2], [RX - .04, 0, .08, RZ * 2]])
      box(x, .05, z, sx, .10, sz, col.trim, { hard: true, gloss: G.paint });
    // The carpet is tiles, and the seams are the only thing that says so. Left at 98 cm: at the
    // 49 a carpet tile really is, the grid became the loudest thing on the floor and the room
    // read as a bathroom. The weave above is finer than the seams and that is the right way
    // round — the pile is the texture, the seams are only the joints.
    for (let i = -4; i <= 4; i++) {
      flat(i * .98, .004, 0, .02, RZ * 2, col.carpetD, { gloss: .08, ...CARPET });
      flat(0, .004, i * .98, RX * 2, .02, col.carpetD, { gloss: .08, ...CARPET });
    }
    // suspended ceiling grid
    for (let i = -4; i <= 4; i++) {
      box(i * .98, H - .01, 0, .03, .02, RZ * 2, col.grid, { hard: true, gloss: .18 });
      box(0, H - .01, i * .78, RX * 2, .02, .03, col.grid, { hard: true, gloss: .18 });
    }

    // ---- the window wall: a continuous ribbon of glazing with a sill, and vertical blinds
    box(0, .48, -RZ + .10, RX * 2, .96, .20, col.wall,
      { hard: true, gloss: G.paint, ...PLASTER });
    box(0, .99, -RZ + .16, RX * 2, .06, .30, col.white, { hard: true, gloss: .28 });
    box(0, H - .16, -RZ + .10, RX * 2, .32, .20, col.wall,
      { hard: true, gloss: G.paint, ...PLASTER });
    // What is out there matters: this is the one wall anybody looks at, and a pane of flat
    // white behind the mullions read as a lightbox rather than a window. So the glazing gets a
    // backdrop — pale sky above, the city's haze below, and a row of towers standing in it —
    // the same trick the apartment window uses, at a fifth of the cost because it is only ever
    // seen from one side of one room.
    box(0, 1.56, -RZ + .02, RX * 2 - .3, 1.10, .02, C('#c2d4e2'),
      { hard: true, mode: 1, glow: .07 });
    box(0, 1.22, -RZ + .015, RX * 2 - .3, .42, .02, C('#b4bcc0'),
      { hard: true, mode: 1, glow: .05 });
    let tseed = 0x7047e2;
    const trnd = () => (tseed = (tseed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    let tx2 = -RX + .30;
    while (tx2 < RX - .30) {
      const bw = .26 + trnd() * .40, bh = .22 + trnd() * .52;
      box(tx2 + bw / 2, 1.06 + bh / 2, -RZ + .028, bw * .95, bh, .012,
        C(trnd() > .5 ? '#98a6b2' : '#8b98a4'), { hard: true, mode: 1, glow: .03 });
      tx2 += bw + .04 + trnd() * .10;
    }
    for (const gx of [-3.30, -1.65, 0, 1.65, 3.30])
      box(gx, 1.56, -RZ + .05, 1.56, 1.06, .03, col.glass,
        { hard: true, mode: 1, alpha: .26, gloss: G.glass, glow: .06 });
    for (const mx of [-4.12, -2.47, -.82, .82, 2.47, 4.12])
      box(mx, 1.54, -RZ + .09, .07, 1.16, .10, col.steel, { hard: true, gloss: G.metal });
    // Vertical blinds, half of them turned. A window wall with nothing on it reads as a hole.
    capsule(0, 2.16, -RZ + .22, .020, RX * 2 - .2, .020, col.steelD,
      { rz: Math.PI / 2, gloss: G.metal });
    // Turned about a third of the way open, so each slat shows a face. At 1.15 rad they were
    // almost edge-on to the room and the whole set was invisible.
    for (let i = 0; i < 22; i++) {
      const bx = -RX + .30 + i * .38;
      box(bx, 1.56, -RZ + .22, .13, 1.14, .02, col.cream,
        { hard: true, ry: .52 + (i % 3) * .05, mode: 7, gloss: G.fabric });
    }
    thing('窗户', -2.20, 1.56, -RZ + .34, '从这儿能看见马路。',
      'You can see the main road from here.',
      'The same 窗户 as at home — four floors up and twice as wide.',
      { focus: [-2.20, -RZ + 1.30], reach: 1.9 });

    // ================================================================ 门 the way out
    const dz = RZ - .10;
    // The room shell is a single unbroken quad, so a moving leaf would otherwise expose that
    // wall ten centimetres behind it. A shallow elevator-lobby view sits over the shell inside
    // the opening: two steel lift panels, a lit header and the call button. The exit still uses
    // the existing trigger and collision; this is only the credible adjacent space it reveals.
    box(DX, 1.06, RZ - .018, 1.08, 2.12, .018, C('#596169'),
      { hard: true, mode: 1, glow: .025 });
    for (const s of [-1, 1])
      box(DX + s * .255, 1.02, RZ - .030, .49, 1.86, .012,
        s < 0 ? C('#7f878c') : C('#737b81'), { hard: true, mode: 1, glow: .035 });
    box(DX, 1.02, RZ - .045, .018, 1.86, .010, col.charcoal,
      { hard: true, mode: 1, glow: .03 });
    litten(box(DX, 2.02, RZ - .048, .72, .08, .010, C('#ece4cf'),
      { hard: true, mode: 1, glow: .18 }), .35);
    litten(box(DX - .46, 1.16, RZ - .050, .055, .10, .010, C('#7fe0a4'),
      { hard: true, mode: 1, glow: .24 }), .45);
    box(DX, .07, RZ - .050, 1.06, .13, .012, col.steelD,
      { hard: true, gloss: G.metal });
    movingDoor(box(DX, 1.06, dz + .04, 1.18, 2.20, .14, col.woodD,
      { hard: true, gloss: G.wood, mat: 'wood', matScale: .80, matAmt: .34 }));
    movingDoor(box(DX, 1.02, dz, 1.00, 2.06, .07, col.wood,
      { tag: '门', gloss: .28, mat: 'wood', matScale: .80, matAmt: .38 }));
    movingDoor(box(DX, 1.42, dz - .04, .44, .60, .02, col.glass,
      { tag: '门', hard: true, mode: 1, alpha: .40, gloss: G.glass }));
    movingDoor(capsule(DX - .38, 1.02, dz - .09, .026, .22, .026, col.chrome,
      { tag: '门', rx: Math.PI / 2, gloss: G.metal }));
    for (const g of glyphs(DX, 1.86, dz - .05, Math.PI, '出口',
      { size: .13, gap: .05, color: col.charcoal, mode: 1, tag: '门' })) movingDoor(g);
    thing('门', DX, 2.30, dz - .20, '下班了，回家吧。', 'Finished for the day. Home.',
      'Out past the lift and down four floors to the road.',
      { focus: [DX, dz - 1.05], reach: 1.9 }).exit = { place: 'street', at: OUT };

    // ================================================================ the desks
    // Two banks of two facing each other across the room, which is how these offices are
    // always laid out, and one of them is yours.
    workstation(-2.55, -1.30, 0, false);
    workstation(-.85, -1.30, 0, true);
    workstation(-2.55, 1.55, Math.PI, false);
    workstation(-.85, 1.55, Math.PI, false);
    thing('办公桌', -.85, 1.20, -1.72, '这是我的办公桌。', 'This is my desk.',
      '办公 to do office work + 桌 table. 上班 is to go to work; 下班 to leave.',
      { focus: [-.85, -2.10], reach: 1.9 });

    // ---- a jacket over the back of the fourth chair, for the one desk nobody is at.
    box(-2.55, .80, -1.94, .46, .44, .10, col.jade,
      { mode: 7, gloss: G.fabric, mat: 'fabric', matScale: .26, matAmt: .30 });
    box(-2.55, .58, -1.98, .40, .26, .08, col.jade,
      { mode: 7, gloss: G.fabric, mat: 'fabric', matScale: .26, matAmt: .30 });

    // ================================================================ 会议桌 the meeting table
    // A round table with four chairs in the middle of the floor, which is where a company this
    // size holds a meeting: there is no meeting room, there is a table people drag chairs to.
    const mtx = 1.90, mtz = -1.85;
    cyl(mtx, .73, mtz, .68, .05, col.desk,
      { tag: '会议桌', gloss: .26, mat: 'wood', matScale: .90, matAmt: .34 });
    cyl(mtx, .36, mtz, .05, .70, col.steelD, { tag: '会议桌', gloss: G.metal });
    taper(mtx, .04, mtz, .56, .07, .56, col.steelD,
      { tag: '会议桌', gloss: G.metal, mat: 'metal', matScale: .40, matAmt: .22 });
    // the litter of a meeting: a stack of handouts, three mugs and somebody's pen
    box(mtx - .18, .77, mtz + .12, .24, .02, .32, col.white,
      { tag: '会议桌', hard: true, gloss: .18 });
    for (let i = 0; i < 3; i++) {
      const a = 1.1 + i * 2.0;
      cyl(mtx + Math.sin(a) * .40, .80, mtz + Math.cos(a) * .40, .045, .09,
        pick([col.white, col.blue, col.cream]), { tag: '会议桌', gloss: .30 });
    }
    capsule(mtx + .26, .765, mtz - .14, .008, .14, .008, col.marker,
      { tag: '会议桌', rz: Math.PI / 2, ry: .7, gloss: .34 });
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + .5;
      const cxs = mtx + Math.sin(a) * 1.02, czs = mtz + Math.cos(a) * 1.02;
      box(cxs, .45, czs, .44, .06, .42, col.navy,
        { mode: 7, ry: a, gloss: G.fabric, mat: 'fabric', matScale: .30, matAmt: .32 });
      box(cxs + Math.sin(a) * .19, .70, czs + Math.cos(a) * .19, .42, .46, .06, col.navy,
        { mode: 7, ry: a, rx: .12, gloss: G.fabric, mat: 'fabric', matScale: .30, matAmt: .32 });
      for (const [sx2, sz2] of [[-.17, -.17], [.17, -.17], [-.17, .17], [.17, .17]])
        capsule(cxs + sx2, .21, czs + sz2, .020, .42, .020, col.steelD, { gloss: G.metal });
    }
    solid(mtx - 1.35, mtx + 1.35, mtz - 1.35, mtz + 1.35);
    shade(mtx, mtz, 2.9, 2.9, .24);
    thing('会议桌', mtx, 1.14, mtz, '开会开了一个半小时。',
      'The meeting went on for an hour and a half.',
      '会议 meeting + 桌 table. 开会 is to hold or attend one.',
      { focus: [mtx, mtz - 1.55], reach: 2.0 });

    // ================================================================ 打卡机 the time clock
    // By the door, because that is the point of it. On the wall at shoulder height with a little
    // green screen and the roll of paper nobody has changed.
    const pcz = RZ - .95;
    box(RX - .10, 1.44, pcz, .10, .38, .26, col.white, { tag: '打卡机', gloss: .28 });
    box(RX - .17, 1.52, pcz, .04, .14, .18, col.charcoal,
      { tag: '打卡机', hard: true, gloss: .34 });
    litten(box(RX - .19, 1.52, pcz, .01, .09, .13, C('#7fe0a4'),
      { tag: '打卡机', hard: true, mode: 1, glow: .32 }), .5);
    box(RX - .17, 1.34, pcz, .04, .05, .14, col.black,
      { tag: '打卡机', hard: true, gloss: .30 });
    glyphs(RX - .16, 1.70, pcz, -Math.PI / 2, '打卡',
      { size: .085, gap: .02, color: col.charcoal, mode: 1, tag: '打卡机' });
    thing('打卡机', RX - .30, 1.72, pcz, '上班先打卡。', 'You clock in before you start.',
      '打 to strike + 卡 card. 全勤 is the bonus for never being late.',
      { focus: [RX - 1.15, pcz], reach: 1.8 });

    // ================================================================ 白板 the whiteboard
    const wbx = 1.90;
    box(wbx, 1.62, RZ - .10, 2.60, 1.30, .06, col.steel, { tag: '白板', hard: true, gloss: G.metal });
    box(wbx, 1.62, RZ - .15, 2.48, 1.18, .02, col.board, { tag: '白板', hard: true, gloss: .30 });
    box(wbx, .98, RZ - .18, 2.48, .06, .09, col.steelD, { tag: '白板', hard: true, gloss: G.metal });
    for (let i = 0; i < 3; i++)
      capsule(wbx - .70 + i * .16, 1.02, RZ - .21, .014, .11, .014,
        [col.marker, col.red, col.green][i], { rz: Math.PI / 2, gloss: .34 });
    // Somebody's plan, in real characters, plus the boxes and arrows that always go with it.
    glyphs(wbx - .62, 2.06, RZ - .17, Math.PI, '本周计划',
      { size: .15, gap: .04, color: col.marker, mode: 1, tag: '白板' });
    for (let i = 0; i < 3; i++) {
      box(wbx - .74 + i * .02, 1.70 - i * .26, RZ - .17, .52, .015, .01, col.marker,
        { hard: true, mode: 1, tag: '白板' });
      box(wbx + .10, 1.70 - i * .26, RZ - .17, .34, .22, .01, col.board,
        { hard: true, gloss: .28, tag: '白板' });
      box(wbx + .10, 1.81 - i * .26, RZ - .17, .34, .015, .01, C('#8a94a4'),
        { hard: true, mode: 1, tag: '白板' });
    }
    thing('白板', wbx, 2.38, RZ - .26, '白板上写着这周的计划。',
      "This week's plan is written on the whiteboard.",
      '白 white + 板 board. 计划 is a plan.',
      { focus: [wbx, RZ - 1.35], reach: 2.0 });

    // ================================================================ 打印机 the printer
    const px = RX - .60;
    // The cabinet it stands on is the filing in this office, and filing is sheet steel. That
    // photograph is nearly white, so the amount is a third of what it would be for a darker
    // texture — every steel surface in here is a mid grey and is meant to stay one.
    box(px, .40, -.10, .70, .80, .60, col.deskD,
      { gloss: .22, mat: 'metal', matScale: .55, matAmt: .22 });
    box(px, .90, -.10, .80, .22, .70, col.white, { tag: '打印机', gloss: .28 });
    box(px, 1.03, -.10, .74, .06, .62, col.charcoal, { tag: '打印机', hard: true, gloss: .30 });
    box(px - .10, 1.07, -.34, .30, .02, .22, col.white,
      { tag: '打印机', hard: true, gloss: .20 });
    litten(box(px + .26, 1.02, -.42, .06, .02, .04, C('#7fe0a4'),
      { tag: '打印机', hard: true, mode: 1, glow: .30 }), .5);
    for (let i = 0; i < 4; i++)
      box(px, .80 - i * .02, .30, .28, .015, .22, col.white,
        { hard: true, gloss: .18, ry: (rnd() - .5) * .1 });
    solid(px - .42, RX, -.48, .28);
    thing('打印机', px - .20, 1.28, -.10, '打印机又坏了。', 'The printer is broken again.',
      '打印 to print + 机 machine. It is always broken.',
      { focus: [px - 1.05, -.10], reach: 1.8 });

    // ================================================================ 咖啡 the tea point
    // A counter with a kettle, a water cooler and a row of mugs. In a Chinese office this is
    // mostly hot water rather than coffee, but the machine gets the word.
    const kx = RX - .70, kz = 1.90;
    box(kx, .43, kz, .84, .86, .60, col.desk,
      { gloss: .24, mat: 'wood', matScale: .80, matAmt: .32 });
    box(kx, .87, kz, .90, .05, .66, col.deskD,
      { hard: true, gloss: .22, mat: 'wood', matScale: .80, matAmt: .30 });
    box(kx - .18, 1.06, kz, .30, .34, .30, col.charcoal, { tag: '咖啡', gloss: .32 });
    box(kx - .18, 1.15, kz - .17, .22, .12, .04, col.screen,
      { tag: '咖啡', hard: true, mode: 1, glow: .06 });
    litten(box(kx - .18, 1.155, kz - .18, .16, .05, .02, C('#ffb069'),
      { tag: '咖啡', hard: true, mode: 1, glow: .30 }), .6);
    cyl(kx - .18, .93, kz + .02, .05, .08, col.white, { tag: '咖啡', gloss: .30 });
    for (let i = 0; i < 4; i++)
      cyl(kx + .18 + (i % 2) * .14, .95, kz - .14 + ((i / 2) | 0) * .20, .045, .10,
        pick([col.white, col.blue, col.red, col.cream]), { gloss: .30 });
    solid(kx - .48, RX, kz - .38, kz + .38);
    thing('咖啡', kx - .18, 1.36, kz - .22, '先喝杯咖啡再说。',
      "Let's have a coffee first.",
      '咖啡 is a loan word — the sound, not the meaning. 喝 is to drink.',
      { focus: [kx - 1.05, kz], reach: 1.8 });

    // ================================================================ break-room 冰箱 / 微波炉
    // Behind the coffee counter: an upright fridge and a microwave on a shelf.
    const bx = kx, bz = kz + .74;
    box(bx, .92, bz, .66, 1.84, .64, col.white,
      { tag: '冰箱', gloss: .28, mat: 'metal', matScale: .70, matAmt: .14, nrmAmt: .30 });
    box(bx, 1.82, bz, .70, .06, .70, col.steelD, { tag: '冰箱', hard: true, gloss: .24 });
    box(bx, .04, bz, .70, .08, .70, col.steelD, { tag: '冰箱', hard: true, gloss: .24 });
    box(bx, 1.28, bz + .33, .60, .02, .04, col.steelD, { tag: '冰箱', hard: true, gloss: .24 });
    capsule(bx, 1.40, bz + .35, .015, .34, .015, col.steel, { tag: '冰箱', rx: Math.PI / 2, gloss: .40 });
    capsule(bx, .50, bz + .35, .015, .34, .015, col.steel, { tag: '冰箱', rx: Math.PI / 2, gloss: .40 });
    const mx = bx - .52, mz = bz;
    box(mx, .50, mz, .48, .04, .36, col.steelD, { hard: true, gloss: .24 });
    box(mx, .76, mz, .42, .48, .32, col.charcoal, { tag: '微波炉', gloss: .28 });
    box(mx, .76, mz + .16, .42, .48, .02, col.glass, { tag: '微波炉', hard: true, mode: 1, alpha: .26, gloss: .40 });
    box(mx, .96, mz - .02, .36, .06, .24, col.white, { tag: '微波炉', hard: true, gloss: .20 });
    litten(box(mx, .96, mz, .28, .02, .14, col.screenOn, { tag: '微波炉', hard: true, mode: 1, glow: .10 }), .4);
    for (let i = 0; i < 4; i++)
      ball(mx + .12 - i * .06, .88, mz - .14, .012, .008, .012, col.steelD, { tag: '微波炉', hard: true });
    solid(bx - .70, RX, bz - .40, bz + .38);
    thing('冰箱', bx, 2.10, bz, '冰箱里有昨天的剩饭。', 'There is leftover rice in the fridge.',
      '冰 ice + 箱 box. The upright kind; a chest freezer is a 冰柜.',
      { focus: [bx - .60, bz], reach: 1.8 });
    thing('微波炉', mx, 1.20, mz, '把饭热一下。', 'Heat up the food in the microwave.',
      '微 wave + 波 wave + 炉 oven. A microwave oven.',
      { focus: [mx - .60, mz], reach: 1.8 });

    // ================================================================ shelving and clutter
    // A run of shelves along the +x end of the back wall, full of ring binders. Binders are
    // three boxes each and there are a lot of them, so they are the one place in this room
    // worth being careful about: two decks, not five.
    // An open carcass: a back panel, two ends and a top, with the decks between them. Built as
    // one solid box the shelves and every binder on them were sealed inside it, and three
    // metres of the back wall was a blank beige slab.
    // 1.9 m wide, not 3.0: the whiteboard hangs on the same wall from x .60 outward, and the
    // shelves used to run a metre behind it with the binders in that metre sealed out of sight.
    const sx = -.50, sw = 1.90;
    const SHELF = { hard: true, gloss: .22, mat: 'wood', matScale: .90, matAmt: .32 };
    box(sx, .90, RZ - .04, sw, 1.80, .06, col.deskD, SHELF);
    for (const s of [-1, 1])
      box(sx + s * (sw / 2 - .03), .90, RZ - .20, .06, 1.80, .34, col.deskD, SHELF);
    box(sx, 1.82, RZ - .20, sw, .06, .34, col.deskD, SHELF);
    for (let d = 0; d < 4; d++) {
      box(sx, .18 + d * .44, RZ - .20, sw - .12, .04, .32, col.desk,
        { hard: true, gloss: .24, mat: 'wood', matScale: .90, matAmt: .30 });
      if (d > 2) continue;
      for (let i = 0; i < 9; i++) {
        if (rnd() < .12) continue;
        box(sx - .82 + i * .21, .18 + d * .44 + .20, RZ - .20, .17, .36, .26,
          pick([col.binder, col.navy, col.red, col.jade, col.charcoal, col.blue]),
          { hard: true, gloss: .20, ry: (rnd() - .5) * .04 });
      }
    }
    solid(sx - sw / 2 - .02, sx + sw / 2 + .02, RZ - .40, RZ);

    // a plant in the corner, and the bin under the desk — the two props that make an office
    taper(-RX + .42, .18, RZ - .50, .34, .36, .34, col.pot, { gloss: .22 });
    for (let i = 0; i < 9; i++) {
      const a = i * 2.399;
      ball(-RX + .42 + Math.sin(a) * .20, .52 + (i % 3) * .16, RZ - .50 + Math.cos(a) * .20,
        .17, .09, .17, i % 2 ? col.plant : col.plantD, { gloss: .16, ry: a });
    }
    solid(-RX, -RX + .78, RZ - .86, RZ);
    taper(-.20, .14, -1.96, .24, .28, .24, col.charcoal, { gloss: .26 });

    // The grid. Two rows of two over the desks, and one each over the meeting table and the
    // gangway. The sixth is new: with five, everything from the middle of the room to the +x
    // wall — the meeting table, the printer, the tea point — was lit by one fitting three
    // metres away, and now that the panels light the room rather than just sitting in the
    // ceiling being bright, that half of the floor fell off into a corner nobody had lit.
    panel(-2.40, -1.20); panel(-.70, -1.20);
    panel(-2.40, 1.60); panel(-.70, 1.60);
    panel(2.20, .20); panel(2.20, -1.95);

    // 空调 a split unit high on the +x wall
    box(RX - .16, 2.32, -1.90, .22, .34, 1.00, col.white, { tag: '空调', gloss: .27 });
    box(RX - .28, 2.20, -1.90, .06, .05, .88, C('#c9c8c3'), { tag: '空调', hard: true });
    thing('空调', RX - .40, 2.60, -1.90, '空调坏了，很热。',
      'The air conditioning is broken. It is hot.',
      'The same unit as in your flat, and the same argument about the temperature.',
      { focus: [RX - 1.30, -1.90], reach: 1.9 });

    // and the company's name on the wall by the door, which is the word this room teaches
    glyphs(2.05, 2.34, RZ - .12, Math.PI, '北京文化传媒',
      { size: .15, gap: .04, color: col.charcoal, mode: 1 });
  }

  build();

  function setNight(k) {
    const soft = k * k * (3 - 2 * k);
    for (const { p, k: kk } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) + soft * kk * .30;
  }
  // The exit leaf opens as you approach; the screens keep their quiet independent activity.
  function tick(t, body) {
    const dx = body ? body.x - DX : 99, dz = body ? body.z - (RZ - .72) : 99;
    let open = 1 - Math.min(1, Math.hypot(dx, dz) / 1.95);
    open = open * open * (3 - 2 * open);
    const a = -1.16 * open, c = Math.cos(a), s = Math.sin(a);
    const px = DX + .62, pz = RZ - .10;
    for (const q of doorParts) {
      const p = q.p, m = p.m, b = q.m0;
      for (let j = 0; j < 3; j++) {
        const o = j * 4, x = b[o], z = b[o + 2];
        m[o] = c * x + s * z; m[o + 1] = b[o + 1];
        m[o + 2] = -s * x + c * z; m[o + 3] = b[o + 3];
      }
      const x = b[12] - px, z = b[14] - pz;
      m[12] = px + c * x + s * z; m[13] = b[13]; m[14] = pz - s * x + c * z; m[15] = 1;
      if (q.ob) {
        const ox = q.ob.x - px, oz = q.ob.z - pz;
        p.ob.x = px + c * ox + s * oz; p.ob.z = pz - s * ox + c * oz;
        p.ob.ry = q.ob.ry + a;
      }
    }
    for (const s of screens)
      s.p.glow = .20 + .05 * (0.5 + 0.5 * Math.sin(t * (1.1 + s.seed) + s.seed * 9));
  }

  return B.finish({
    setNight, tick, TASKS, RX, RZ, H, WIN, OUT,
    // Where the body goes for a shift and for a meeting: your own task chair, and one of the four
    // round the meeting table. `seatY` is the height of the seat itself.
    SEAT_AT: [-.85, -1.90], SEAT_FACE: 0, SEAT_Y: .50,
    MEET_AT: [1.90 + Math.sin(2.07) * 1.02, -1.85 + Math.cos(2.07) * 1.02],
    MEET_FACE: 2.07 + Math.PI, MEET_Y: .48,
    label: '公司', labelK: '公司 · work',
    indoor: true, cutaway: true, near: .05, far: 40, expose: 1,
    spawn: { x: DX - .50, z: RZ - 1.10, yaw: Math.PI * 1.02 },
    zones: [{ id: 'office', x0: -RX, x1: RX, z0: -RZ, z1: RZ, light: [-1.6, H - .30, .20] }],
    roomAt() { return this.zones[0]; },
  });
});
