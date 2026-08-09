// 大学城 — the university district, four stops down the line.
//
// What you see when you come up the steps at a Chinese university is not lawns and cloisters: it
// is a wide swept forecourt, a gate with the institution's name cut into stone beside it, a
// teaching block eight bays long with a slogan across the top of it, a sea of bicycles under a
// canopy, a noticeboard nobody has cleared since term started, and a canteen the whole place
// walks to at eleven. The words this district teaches are 上课 and 食堂.
//
// Outdoors, like the park and the hutong: the renderer puts the sky over it and takes the sun off
// the clock, and there is no room shell to set.
const Campus = Lazy('Campus', () => {
  const col = {
    pave: C('#9a958b'), paveD: C('#827d74'), paveL: C('#aaa49a'), kerb: C('#b3ada3'),
    grass: C('#5b7343'), grassD: C('#496035'),
    render: C('#c3bdaf'), renderD: C('#a8a294'), renderL: C('#d2ccbe'),
    brick: C('#9a6c56'), brickD: C('#7d5644'),
    stone: C('#918c83'), stoneD: C('#6f6a62'), stoneL: C('#a9a39b'),
    trunk: C('#5b4a38'), trunkL: C('#74604a'),
    leaf: C('#4f7a3c'), leafD: C('#3c6130'),
    red: C('#a8372a'), redD: C('#7f2a20'), gold: C('#c9992f'), goldL: C('#e0b850'),
    cream: C('#e6dcc6'), white: C('#eceae2'),
    steel: C('#a7adb2'), steelD: C('#7b8288'), chrome: C('#c6ccd0'),
    charcoal: C('#33383d'), black: C('#22262b'),
    blue: C('#2f6392'), blueSign: C('#1f4f8f'), teal: C('#4c8a86'),
    glassDay: C('#9fb6c4'), glassDark: C('#3d4650'),
    bike1: C('#2f86bd'), bike2: C('#d9662f'), bike3: C('#3f7a4e'), bike4: C('#c0b33a'),
    tarp: C('#3f6d55'), yellow: C('#d9b02f'), orange: C('#cf7a2b'),
  };
  const G = { matte: .05, wood: .20, paint: .16, metal: .58, glass: .80, fabric: .04 };

  // ---------------------------------------------------------------- surfaces
  // A tiling material multiplies the prop's colour by its own photograph, normalised against mid
  // grey — the renderer's own words for it are that this "leaves the chosen colour where it was
  // and lets only the variation through". It does that only when the photograph happens to
  // average mid grey, and most of them do not. Measured off assets/textures, as sRGB means:
  //
  //   PavingStones138 (152,144,112) and Bricks104 (167,120,100) land on it — near enough neutral.
  //   Concrete034 (185,185,185) and PaintedPlaster017 (190,190,188) are half a stop over.
  //   Tiles141 (211,203,195) and Fabric081C (202,202,202) rather more.
  //   Metal049A is (252,251,246) — a near-white plate, which at matAmt .30 doubles the value of
  //   anything wearing it. The first pass of this file put it on the bike shelter and the gate
  //   truss, and turned both from dark galvanised tube into pale grey against a pale wall.
  //   Road007 is (79,79,77) and goes the other way, taking a fifth off the basketball court.
  //
  // MEAN is that measurement as the factor the shader applies at matAmt 1; `held` divides a
  // palette colour by exactly what the material is about to multiply it by. col was chosen
  // deliberately — this is what keeps it, and leaves the texture doing only its own job.
  //
  // The table is a fact about the eight image files, not a taste, so it is only wrong if one of
  // them is swapped for a different photograph — at which point every surface wearing it drifts
  // in value and this is the first place to look. It belongs beside MATERIALS in js/assets.js,
  // where one measurement would serve every scene; it lives here because that file is not mine.
  const MEAN = { paving: 1.14, brick: 1.06, concrete: 2.21, plaster: 2.32,
                 tile: 2.72, fabric: 2.68, metal: 4.33, asphalt: 0.35 };
  const s2l = v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  const l2s = v => v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055;
  const held = (c, s) => {
    const k = 1 + (MEAN[s.mat] - 1) * s.matAmt;
    return c.map(v => Math.min(1, Math.max(0, l2s(s2l(v) / k))));
  };
  // Eleven surfaces for the whole campus, because a campus is built out of about eleven things.
  // `matScale` is one repeat in metres, so each is set to what the thing actually is: 68 cm
  // forecourt slabs, a 32 cm wall tile, brick four courses to a repeat, and rendered walls
  // coarse enough that nobody counts them.
  const S = {
    pave:  { mat: 'paving',   matScale: .68, matAmt: .36 },  // forecourt, ground, station apron
    path:  { mat: 'paving',   matScale: .54, matAmt: .36 },  // the gate spine and the bike pad
    court: { mat: 'asphalt',  matScale: 2.4, matAmt: .34 },  // the half court, poured not laid
    rend:  { mat: 'concrete', matScale: 2.4, matAmt: .30 },  // teaching block and dormitory
    lib:   { mat: 'concrete', matScale: 3.0, matAmt: .28 },  // the library, the one with a budget
    stone: { mat: 'concrete', matScale: 1.4, matAmt: .30 },  // piers, stele, steps, sills, kerb
    plas:  { mat: 'plaster',  matScale: 2.1, matAmt: .30 },  // the canteen and the kiosk
    brick: { mat: 'brick',    matScale: .92, matAmt: .34 },  // every plinth on the campus
    tile:  { mat: 'tile',     matScale: .32, matAmt: .38 },  // the canteen's tiled lower front
    steel: { mat: 'metal',    matScale: .40, matAmt: .30 },  // truss, bike frame, board, cart
    tarp:  { mat: 'fabric',   matScale: .85, matAmt: .32 },  // the sheet over the bicycles
  };

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, flat, glyphs,
          solid, blocker, shade, glow, thing } = B;

  // ---------------------------------------------------------------- dimensions
  const RX = 19.0, RZ = 13.0;
  const GX = -3.0;                        // the gate, in the -z boundary
  const TZ = RZ - 2.2;                    // the teaching block's frontage
  const OUT = { x: -11.4, z: -RZ + 3.20, yaw: 0 };

  const litProps = [], panes = [], lampPools = [], cartSteam = [], flagPanels = [];
  function litten(p, k) { litProps.push({ p, k }); return p; }
  // A facade window is the same everywhere in the game: a dark reveal sunk into the wall, a pane
  // of glass that takes the sky by day and a lit room by night, a frame cross, and a concrete
  // sill. The campus used to put single panes flush on a flat wall, which read as a sheet of
  // coloured card rather than a window. `n` is which way the wall faces along z, so the same
  // helper does the teaching block (facing -z) and the library (facing -x).
  function pane(p, warm) { panes.push({ p, warm }); return p; }
  function fwin(x, y, z, w, h, n = -1) {
    const d = q => z + n * q;
    box(x, y, d(.030), w + .14, h + .14, .06, col.glassDark, { hard: true, gloss: .20 });
    const warm = rnd();
    pane(box(x, y, d(.055), w, h, .02, col.glassDay,
      { hard: true, mode: 1, gloss: G.glass }), warm);
    box(x, y, d(.070), .045, h, .02, col.steel, { hard: true, gloss: G.metal });
    box(x, y, d(.070), w, .045, .02, col.steel, { hard: true, gloss: G.metal });
    box(x, y - h / 2 - .055, d(.085), w + .26, .07, .17, col.renderD,
      { hard: true, gloss: G.paint });
    return warm;
  }
  // The split air-conditioner bolted outside every upper-floor window, with its bracket. The
  // one detail that says "people work in here" louder than any other.
  function acBox(x, y, z, n = -1) {
    box(x, y, z + n * .30, .84, .50, .36, col.white, { hard: true, gloss: .26 });
    for (let i = -2; i <= 2; i++)
      box(x + i * .13, y, z + n * .50, .05, .38, .03, col.steelD, { hard: true, gloss: .3 });
    for (const s of [-1, 1])
      box(x + s * .34, y - .30, z + n * .28, .06, .08, .30, col.steelD,
        { hard: true, gloss: .3 });
  }

  let seed = 0x2c9f70;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = a => a[(rnd() * a.length) | 0];

  // ---------------------------------------------------------------- parts
  function tree(cx, cz, h) {
    capsule(cx, h * .40, cz, .15, h * .84, .15, col.trunkL, { gloss: G.wood });
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399;
      ball(cx + Math.sin(a) * .60, h * .78 + (i % 3) * .26, cz + Math.cos(a) * .60,
        .90, .72, .90, i % 2 ? col.leaf : col.leafD, { gloss: .12, mode: 15, ry: a });
    }
    solid(cx - .28, cx + .28, cz - .28, cz + .28);
    shade(cx, cz, 2.8, 2.8, .26);
  }

  // 自行车 one bike in a rack: two wheels, a frame, bars and a saddle. Six props, and there are
  // two dozen of them, because a bicycle park with four bikes in it is a bicycle park nobody uses.
  function bike(cx, cz, ry, c) {
    const T = { tag: '自行车', ry };
    for (const o of [-.50, .50])
      cyl(cx + Math.sin(ry) * o, .33, cz + Math.cos(ry) * o, .33, .045, col.charcoal,
        { ...T, rx: Math.PI / 2, gloss: .30 });
    capsule(cx, .50, cz, .04, .96, .04, c, { ...T, rz: Math.PI / 2, gloss: .34 });
    capsule(cx - Math.sin(ry) * .18, .48, cz - Math.cos(ry) * .18, .035, .42, .035, c,
      { ...T, rx: -.5, gloss: .34 });
    capsule(cx + Math.sin(ry) * .44, .74, cz + Math.cos(ry) * .44, .028, .46, .028,
      col.steelD, { ...T, rz: Math.PI / 2, gloss: G.metal });
    box(cx - Math.sin(ry) * .24, .74, cz - Math.cos(ry) * .24, .24, .06, .11, col.black,
      { ...T, gloss: .26 });
  }

  function build() {
    // ================================================================ ground
    // A campus forecourt is almost all ground, so the ground is where the surface work pays.
    // mode 9 already rules it into slabs and dirties the joints; the `paving` material goes
    // underneath that and puts stone inside each slab, read triplanar in world space so no quad
    // here needs a UV. The repeat is set near the 0.62 m the mode-9 grid uses, so the
    // photographed stones sit roughly a slab to a slab rather than drifting across the joints.
    flat(0, 0, 0, RX * 2 + 10, RZ * 2 + 10, held(col.pave, S.pave), { mode: 9, gloss: .12, ...S.pave });
    // The forecourt, and the joints that make it read as laid rather than poured.
    flat(0, .006, 0, RX * 2 - 4, RZ * 1.4, held(col.paveL, S.pave),
      { mode: 9, gloss: .14, ...S.pave });
    for (let i = -8; i <= 8; i++) flat(i * 2.1, .008, 0, .05, RZ * 1.4, col.paveD, { gloss: .10 });
    for (let i = -4; i <= 4; i++) flat(0, .008, i * 2.1, RX * 2 - 4, .05, col.paveD, { gloss: .10 });
    // a lighter centre path from the gate to the teaching-block steps, the spine every forecourt
    // has, wider slabs so it reads as a different surface from the gridded forecourt around it.
    flat(GX, .010, (-RZ + TZ) / 2, 4.4, TZ + RZ, held(col.paveL, S.path),
      { mode: 9, gloss: .14, ...S.path });
    for (let z = -RZ + 2.0; z < TZ - 2.0; z += 1.8)
      flat(GX, .012, z, 4.0, .10, col.paveD, { gloss: .10 });
    // a kerb around the forecourt's edge, the line that separates swept paving from ground
    for (const s of [-1, 1])
      box(s * (RX - 2.0), .08, 0, .26, .16, RZ * 1.4, held(col.kerb, S.stone),
        { hard: true, gloss: .18, ...S.stone });
    // grass either side of the gate path — mode 10 aggregate, not mode 9 slabs, which ruled the
    // lawn into paving squares
    for (const s of [-1, 1])
      flat(GX + s * 7.4, .004, -RZ + 4.2, 8.4, 5.6, col.grass, { mode: 10, gloss: .08 });

    // ================================================================ 教学楼 the teaching block
    // Eight bays, five floors, a slab canopy over the entrance and the slogan along the parapet.
    // The shell is one repeated bay; what makes it read as a building rather than a slab is the
    // layered facade — brick plinth, string course, windows set into reveals with sills, AC units
    // outside the upper floors, a parapet with a tile cap — the same vocabulary the hutong uses.
    const FL = 3.30, FLOORS = 5, BH = FL * FLOORS + 1.2;
    // mode 14 is the painted-render shading — broad patchiness and damp at the bottom of the
    // wall — and it stays. S.rend goes under it: a dozen repeats across a thirty-metre wall,
    // close enough to read as a rendered surface, coarse enough that nobody counts them.
    box(0, BH / 2, TZ + 5.0, 30.0, BH, 10.0, held(col.render, S.rend),
      { hard: true, mode: 14, gloss: G.paint, ...S.rend });
    // brick plinth up to first-floor level — a facing on the front wall, not a solid the depth
    // of the building, so it does not become a brick shelf lying across the forecourt.
    // mode 11 draws the running bond; the material puts the fired face inside each one, at a
    // repeat well clear of mode 11's own 7.6 cm courses so the two do not moiré.
    box(0, 1.10, TZ - .04, 30.0, 2.20, .30, held(col.brick, S.brick),
      { hard: true, mode: 11, gloss: G.matte, ...S.brick });
    box(0, 2.20, TZ - .05, 30.10, .14, .22, col.renderL,
      { hard: true, gloss: G.paint });
    for (let f = 1; f < FLOORS; f++) {
      // a string course under every floor, the line that breaks a tall wall into storeys
      box(0, f * FL + .05, TZ - .02, 30.04, .18, .22, col.renderL,
        { hard: true, gloss: G.paint });
      for (let i = 0; i < 8; i++) {
        const wx = -13.1 + i * 3.75;
        fwin(wx, f * FL + 1.30, TZ, 2.40, 1.60);
        // a third of the upper windows have an AC unit, the way a real block does
        if (f > 1 && (i * 3 + f) % 3 === 0) acBox(wx + 1.35, f * FL + .55, TZ);
      }
    }
    // the parapet: a render cap, a tile cap on top of it, and the front edge reads as a real
    // cornice instead of the wall simply ending.
    // The cap takes the wall's material as well as its colour. A textured wall under a smooth
    // cap reads as a seam rather than a cornice — the cap is the same render, weathered harder.
    box(0, BH + .30, TZ + 5.0, 30.6, .60, 10.4, held(col.renderD, S.rend),
      { hard: true, gloss: G.paint, ...S.rend });
    box(0, BH + .62, TZ + 5.0, 30.7, .10, 10.5, col.stoneD,
      { hard: true, mode: 13, gloss: .18 });
    // the entrance: a canopy on two columns, glazed doors and the steps up to them
    box(0, 3.10, TZ - 1.70, 9.60, .34, 3.60, held(col.renderD, S.rend),
      { hard: true, gloss: G.paint, ...S.rend });
    for (const s of [-1, 1])
      cyl(s * 4.10, 1.55, TZ - 3.10, .30, 3.10, held(col.renderL, S.stone),
        { gloss: G.paint, ...S.stone });
    for (let i = 0; i < 3; i++)
      box(0, .09 + i * .18, TZ - 3.66 + i * .46, 9.20 - i * .5, .18, .46, held(col.stoneL, S.stone),
        { hard: true, gloss: G.matte, ...S.stone });
    for (const gx of [-2.4, -.8, .8, 2.4])
      panes.push(box(gx, 1.62, TZ - .18, 1.44, 2.70, .06, col.glassDark,
        { tag: '教学楼', hard: true, mode: 1, gloss: G.glass }));
    box(0, 3.06, TZ - .22, 8.00, .10, .10, col.steel,
      { tag: '教学楼', hard: true, gloss: G.metal });
    // the slogan across the parapet, and the building's own name over the doors
    // The forecourt is on the -z side of this building, so the slogan and the name both face -z.
    // Cut into the front face of the parapet (now a real cornice), not floating in front of it.
    for (const g of glyphs(0, BH + .34, TZ - .08, Math.PI, '厚德博学',
        { size: .50, gap: .28, color: col.redD, mode: 1, tag: '教学楼' })) litten(g, .4);
    box(0, 3.48, TZ - .12, 5.60, .52, .10, col.redD,
      { tag: '教学楼', hard: true, gloss: .22 });
    for (const g of glyphs(0, 3.48, TZ - .18, Math.PI, '第一教学楼',
        { size: .26, gap: .09, color: col.goldL, mode: 1, tag: '教学楼' })) litten(g, .9);
    solid(-15.2, 15.2, TZ - 3.9, RZ + 10);
    blocker(-15.2, 15.2, TZ - 3.9, RZ + 10, BH + 1);
    thing('教学楼', 0, 4.30, TZ - 4.00, '第一节课在第一教学楼。',
      'The first class is in teaching block one.',
      '教学 teaching + 楼 building. 上课 is to go to class, 下课 when it ends.',
      { focus: [0, TZ - 5.6], reach: 3.0 });
    // 教室 — the door itself. Walk up to the entrance and you can go in: a separate anchor from
    // the 上课 one above, placed tight against the doors so it wins when you stand on the
    // threshold, while 上课 wins out on the forecourt.
    thing('教室', 0, 3.00, TZ - 1.40, '教学楼里是教室。',
      'Inside the teaching block is a classroom.',
      '教 to teach + 室 room. 进 is to enter; 出 to go out.',
      { focus: [0, TZ - 3.40], reach: 2.6 });

    // ================================================================ 书桌 a study table by the steps
    // Out under the canopy, where students actually sit between classes: a table, two stools, a
    // book left open on it. A free, quiet alternative to 上课 — sit and 复习 your notes.
    const DX = 4.2, DZ = TZ - 4.0;
    box(DX, .74, DZ, 1.40, .06, .80, col.trunkL, { hard: true, gloss: G.wood });
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      box(DX + sx * .60, .37, DZ + sz * .32, .08, .74, .08, col.trunkL,
        { hard: true, gloss: G.wood });
    // a book left open on it, spine along the table
    box(DX, .78, DZ, .42, .03, .30, col.cream, { hard: true, gloss: .14 });
    box(DX, .80, DZ, .02, .03, .30, col.redD, { hard: true });
    for (const s of [-1, 1]) {
      cyl(DX + s * .85, .46, DZ, .045, .90, col.trunkL, { gloss: G.wood });
      box(DX + s * .85, .46, DZ, .36, .08, .36, col.trunkL,
        { hard: true, ry: Math.PI / 4, gloss: G.wood });
    }
    solid(DX - .80, DX + .80, DZ - .45, DZ + .45);
    shade(DX, DZ, 1.8, 1.2, .22);
    thing('书桌', DX, .74, DZ, '书桌上有人忘了书。', 'Somebody left a book on the desk.',
      '书 book + 桌 table. 复习 is to review; 学习 to study.',
      { focus: [DX, DZ + 1.2], reach: 1.8 });

    // ================================================================ 打印 the photocopy kiosk
    // A little kiosk by the teaching-block steps, the place every exam season queues out of: a
    // counter with a copier on it, a stack of paper reams, a serving hatch, and a sign. Cheap,
    // always open, and the only thing on the forecourt that is actually busy at midnight.
    const PX = 6.4, PZ = 1.0;
    box(PX, .60, PZ, 1.60, 1.20, 1.00, held(col.render, S.plas),
      { hard: true, mode: 14, gloss: G.paint, ...S.plas });
    box(PX, .30, PZ, 1.64, .60, 1.04, held(col.brick, S.brick),
      { hard: true, mode: 11, gloss: G.matte, ...S.brick });
    box(PX, 1.22, PZ, 1.66, .16, 1.04, col.renderD, { hard: true, gloss: G.paint });
    // the serving hatch: a dark glazed opening in the front, with a counter ledge under it
    box(PX, .92, PZ - .52, 1.10, .56, .04, col.glassDark,
      { hard: true, mode: 1, alpha: .6, gloss: G.glass });
    box(PX, .64, PZ - .50, 1.20, .10, .22, col.trunkL, { hard: true, gloss: G.wood });
    // the copier on the counter inside, visible through the hatch
    box(PX, 1.00, PZ + .10, .70, .50, .60, col.white, { hard: true, gloss: .26 });
    box(PX, 1.20, PZ + .10, .50, .10, .50, col.steelD, { hard: true, gloss: G.metal });
    box(PX, .90, PZ + .10, .52, .02, .50, col.glassDark,
      { hard: true, mode: 1, gloss: G.glass });
    // a stack of paper reams on the counter
    for (let i = 0; i < 3; i++)
      box(PX - .50, .76 + i * .10, PZ + .20, .26, .08, .34, col.cream,
        { hard: true, gloss: .14, ry: (i % 2) * .12 });
    // a lit print-queue LED on the copier
    litten(box(PX - .20, 1.26, PZ + .10, .04, .04, .04, C('#7fd9a6'),
      { hard: true, mode: 1, glow: .3 }), .8);
    // The kiosk is the one thing on this forecourt still open at midnight, and the strip over
    // the hatch is why you can find it. Sat just outside the glass so it lights the counter
    // ledge and a metre of paving in front of it rather than the inside of a closed box.
    B.light(PX, 1.18, PZ - .64, [1.00, 0.94, 0.80], .45, 1.8);
    // the sign board on the roof, inlined
    box(PX, 1.56, PZ - .10, 1.30, .40, .14, col.redD, { hard: true, gloss: .26 });
    for (const g of glyphs(PX, 1.56, PZ - .18, Math.PI, '复印打印',
        { size: .18, gap: .06, color: col.goldL, mode: 1, tag: '打印' })) litten(g, .6);
    solid(PX - .85, PX + .85, PZ - .55, PZ + .55);
    shade(PX, PZ, 2.2, 1.6, .22);
    thing('打印', PX, 1.10, PZ, '打印一份，两毛。', 'One copy, twenty fen.',
      '复 again + 印 to print. 打印 is to print; 两毛 is twenty fen.',
      { focus: [PX, PZ - 1.4], reach: 1.8 });

    // ================================================================ 图书馆 the library
    // A squatter block at the +x end, turned to face across the forecourt, with a stone facing and
    // a run of tall windows: the one building on a campus of this vintage that got a budget. The
    // windows face -x, so their reveal/pane/sill stack is built along x rather than z — the same
    // layered idea as fwin, oriented the other way.
    const LX = RX - 4.6;
    box(LX + 3.0, 6.40, 1.0, 9.00, 12.80, 14.0, held(col.stoneL, S.lib),
      { hard: true, mode: 14, gloss: G.paint, ...S.lib });
    // a stone base course, the library's own plinth. Half the repeat of the wall above it, so
    // the base course reads as a different, denser stone rather than more of the same wall.
    box(LX - 1.44, 1.20, 1.0, .34, 2.40, 13.4, held(col.stone, S.stone),
      { hard: true, mode: 14, gloss: G.matte, ...S.stone });
    for (let i = 0; i < 5; i++) {
      const wz = -4.4 + i * 2.7;
      // dark reveal sunk into the stone, then the glass, then the frame and transom bars
      box(LX - 1.52, 5.40, wz, .20, 7.40, 1.84, col.glassDark,
        { hard: true, gloss: .20 });
      pane(box(LX - 1.60, 5.40, wz, .06, 7.00, 1.60, col.glassDay,
        { hard: true, mode: 1, gloss: G.glass }), rnd());
      for (let k = 0; k < 3; k++)
        box(LX - 1.64, 3.10 + k * 2.30, wz, .05, .11, 1.60, col.steel,
          { hard: true, gloss: G.metal });
      // a sill at the base of each tall window
      box(LX - 1.50, 1.78, wz, .26, .10, 1.92, held(col.stoneD, S.stone),
        { hard: true, gloss: G.matte, ...S.stone });
    }
    // the parapet cap and a thin tile crown, matching the teaching block's cornice
    box(LX + 3.0, 12.98, 1.0, 9.40, .60, 14.4, held(col.stoneD, S.lib),
      { hard: true, gloss: G.paint, ...S.lib });
    box(LX + 3.0, 13.30, 1.0, 9.50, .10, 14.5, col.stoneD,
      { hard: true, mode: 13, gloss: .18 });
    // the entrance, at the near end, with the name down the jamb
    box(LX - 1.60, 1.50, -5.90, .40, 3.00, 2.60, held(col.stone, S.stone),
      { tag: '图书馆', hard: true, gloss: G.matte, ...S.stone });
    panes.push(box(LX - 1.84, 1.40, -5.90, .07, 2.60, 2.10, col.glassDark,
      { tag: '图书馆', hard: true, mode: 1, gloss: G.glass }));
    box(LX - 1.62, 3.34, -5.90, .60, .52, 2.80, col.redD,
      { tag: '图书馆', hard: true, gloss: .22 });
    for (const g of glyphs(LX - 1.94, 3.34, -5.90, -Math.PI / 2, '图书馆',
        { size: .30, gap: .12, color: col.goldL, mode: 1, tag: '图书馆' })) litten(g, .9);
    solid(LX - 1.6, RX + 8, -6.2, 8.2);
    blocker(LX - 1.6, RX + 8, -6.2, 8.2, 13.6);
    thing('图书馆', LX - 2.20, 2.60, -5.90, '图书馆里很安静。', 'It is very quiet in the library.',
      '图书 books + 馆 hall. 看书 is to read; 安静 is quiet.',
      { focus: [LX - 3.7, -5.90], reach: 2.6 })
      .exit = { place: 'library', at: { x: 1.40, z: -3.30, yaw: Math.PI * .02 } };

    // ================================================================ 食堂 the canteen
    // Low, wide, and the busiest door on the campus at eleven o'clock. A tiled lower front, a
    // steel roller shutter half up, and the menu board beside it. The shell gets the same layered
    // treatment as the teaching block: a tiled plinth, a parapet cap with a tile crown, and the
    // signboard carried on a red band across the top.
    const CX = -RX + 5.0;
    // `plaster` rather than the teaching block's concrete: the canteen is a rendered and painted
    // shed, not a concrete-framed block, and giving the two buildings different materials is
    // most of what stops a campus reading as one extruded wall in four colours.
    box(CX - 3.2, 2.60, 4.6, 9.00, 5.20, 11.0, held(col.renderD, S.plas),
      { hard: true, mode: 14, gloss: G.paint, ...S.plas });
    // a tiled plinth facing on the +x wall, low and clean, the canteen's version of a plinth.
    // It is described as tiled and now it is: a 32 cm tile, the size the wall of every canteen
    // in the country is lined with, and the one place on this campus where the repeat is meant
    // to be countable.
    box(CX + 1.24, .70, 4.6, .30, 1.40, 11.0, held(col.stoneL, S.tile),
      { hard: true, mode: 14, gloss: G.matte, ...S.tile });
    box(CX + 1.25, 1.42, 4.6, .32, .10, 11.1, col.stoneD, { hard: true, gloss: G.matte });
    // the parapet cap, with a tile crown matching the other two buildings
    box(CX - 3.2, 5.34, 4.6, 9.40, .36, 11.4, held(col.renderL, S.plas),
      { hard: true, gloss: G.paint, ...S.plas });
    box(CX - 3.2, 5.54, 4.6, 9.50, .10, 11.5, col.renderD,
      { hard: true, mode: 13, gloss: .18 });
    // The door: two jambs and a head, then a lit slab, then the glazing over it. A single charcoal
    // box the width of the doorway is not a frame, it is a black rectangle, and it stood in front
    // of both the glass and everything the glass was meant to show.
    for (const s of [-1, 1])
      box(CX + 1.20, 1.60, -.20 + s * 1.62, .34, 3.20, .32, col.charcoal,
        { tag: '食堂', hard: true, gloss: .26 });
    box(CX + 1.20, 3.06, -.20, .34, .34, 3.60, col.charcoal,
      { tag: '食堂', hard: true, gloss: .26 });
    // No glazing across it: the shutter is up at eleven and the door is open. Behind it a lit slab,
    // and against the light three dark shapes, which is all you ever see of a canteen from outside.
    litten(box(CX + 1.02, 1.42, -.20, .05, 2.72, 2.94, C('#e8d6a8'),
      { tag: '食堂', hard: true, mode: 1, glow: .34 }), .5);
    // and the light that slab is standing in for. A canteen door with the shutter up throws a
    // wedge of it across the paving outside and up the jambs, and the emissive panel alone did
    // none of that — it was a bright rectangle in front of a wall that stayed exactly as dark as
    // the wall beside it. Placed a little outside the opening, where the spill actually is.
    B.light(CX + 1.55, 1.90, -.20, [1.00, 0.90, 0.70], .75, 3.0);
    for (const [oz, ow, oh, oy] of [[-1.06, .52, 1.34, 1.02], [.08, .42, 1.62, 1.18],
                                    [1.00, .46, 1.22, .98]])
      box(CX + 1.06, oy, -.20 + oz, .04, oh, ow, col.charcoal,
        { tag: '食堂', hard: true, mode: 1, alpha: .76 });
    box(CX + 1.06, 3.28, -.20, .16, .44, 3.60, col.steel,
      { tag: '食堂', hard: true, gloss: G.metal });
    box(CX + 1.30, 3.90, .40, .50, .72, 4.60, col.red, { tag: '食堂', hard: true, gloss: .22 });
    for (const g of glyphs(CX + 1.58, 3.90, .40, Math.PI / 2, '学生食堂',
        { size: .34, gap: .13, color: col.goldL, mode: 1, tag: '食堂' })) litten(g, .9);
    // the price board by the door, which is the point of a canteen
    box(CX + 1.06, 1.70, -3.10, .07, 1.30, 1.90, col.white,
      { tag: '食堂', hard: true, gloss: .22 });
    glyphs(CX + 1.10, 2.10, -3.10, Math.PI / 2, '今日菜价',
      { size: .13, gap: .04, color: col.redD, mode: 1, tag: '食堂' });
    // Four dishes and what they cost, not four ruled lines. The board faces +x, so a reader sees
    // +z on their left: the dish goes at the larger z and the price at the smaller.
    [['米饭', '一元'], ['青菜', '三元'], ['豆腐', '四元'], ['红烧肉', '八元']]
      .forEach(([dish, price], i) => {
        const y = 1.82 - i * .24;
        glyphs(CX + 1.10, y, -2.62, Math.PI / 2, dish,
          { size: .11, gap: .03, color: col.charcoal, mode: 1, tag: '食堂' });
        glyphs(CX + 1.10, y, -3.66, Math.PI / 2, price,
          { size: .11, gap: .03, color: col.redD, mode: 1, tag: '食堂' });
      });
    solid(CX - 8, CX + 1.3, -1.2, 11.0);
    blocker(CX - 8, CX + 1.3, -1.2, 11.0, 5.6);
    thing('食堂', CX + 1.60, 2.40, -.20, '食堂的饭又便宜又快。',
      'The canteen food is cheap and quick.',
      '食 food + 堂 hall. 便宜 is cheap; a canteen meal is eight kuai.',
      { focus: [CX + 3.1, -.20], reach: 2.6 });

    // ================================================================ 售货机 the vending machine
    // Beside the canteen, where there always is one: drinks behind glass, a coin slot, a flap at
    // the knee. Sells a can for five kuai — a mood top-up between classes the canteen is shut for.
    const VX = CX + 1.20, VZ = 4.6;
    box(VX, 1.10, VZ, .56, 2.20, .80, col.blue, { hard: true, gloss: .26 });
    box(VX, 2.30, VZ, .60, .16, .84, col.steelD, { hard: true, gloss: G.metal });
    box(VX, 1.20, VZ - .42, .50, 1.60, .04, col.glassDark,
      { hard: true, mode: 1, gloss: G.glass });
    // three shelves of bottles, a column each
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++)
        cyl(VX - .18 + c * .12, .62 + r * .50, VZ - .44, .045, .36,
          pick([col.bike1, col.bike2, col.bike3, col.yellow]),
          { gloss: .30 });
    box(VX, .30, VZ - .42, .50, .08, .04, col.steelD, { hard: true, gloss: G.metal });
    box(VX, 1.95, VZ - .44, .16, .10, .02, C('#ffcf87'), { hard: true, mode: 1, glow: .2 });
    glyphs(VX, .92, VZ - .44, Math.PI / 2, '冷饮',
      { size: .14, gap: .04, color: col.goldL, mode: 1 });
    solid(VX - .30, VX + .30, VZ - .40, VZ - .10);
    shade(VX, VZ - .10, 1.4, 1.0, .22);
    thing('售货机', VX, 1.10, VZ, '售货机里有冷饮。', 'The vending machine has cold drinks.',
      '售 to sell + 货 goods + 机 machine. 五块 a can.',
      { focus: [VX, VZ - 1.0], reach: 1.8 });

    // ================================================================ 煎饼摊 the food cart
    // A jianbing cart out on the forecourt near the canteen, the cheapest hot breakfast in the
    // city and the reason the forecourt smells of sesame oil at eight. A flat griddle, not a
    // steamer stack — jianbing is a flat pancake — with steam rising off it and a striped canopy.
    const FX = -9.6, FZ = 2.2;
    box(FX, .92, FZ, 2.20, .10, 1.00, held(col.steel, S.steel),
      { hard: true, gloss: .40, tag: '煎饼', ...S.steel });
    box(FX, .68, FZ, 2.00, .46, .86, held(col.steelD, S.steel),
      { hard: true, gloss: .34, tag: '煎饼', ...S.steel });
    for (const [ox, oz] of [[-1.0, -.40], [1.0, -.40], [-1.0, .40], [1.0, .40]])
      cyl(FX + ox, .34, FZ + oz, .09, .68, col.charcoal, { gloss: .3, tag: '煎饼' });
    // a wheel at the back so it reads as a cart, not a table
    cyl(FX, .34, FZ + .60, .26, .06, col.charcoal,
      { rx: Math.PI / 2, gloss: .3, tag: '煎饼' });
    // the griddle: a dark hot plate, a ring of batter around it, a spreader, an egg
    box(FX - .55, 1.00, FZ, .72, .04, .72, col.charcoal,
      { hard: true, mode: 1, gloss: .30, tag: '煎饼' });
    cyl(FX - .55, 1.03, FZ, .30, .02, C('#e8d8b0'),
      { hard: true, mode: 7, gloss: .20, tag: '煎饼' });
    ball(FX - .40, 1.05, FZ + .12, .07, .04, .07, C('#f0e6c8'),
      { mode: 7, gloss: .20, tag: '煎饼' });
    // a batter pot and a brush in a jar at the back of the cart
    cyl(FX + .50, 1.08, FZ - .30, .16, .30, col.white,
      { hard: true, gloss: .26, tag: '煎饼' });
    cyl(FX + .20, 1.06, FZ - .30, .07, .20, col.steelD,
      { hard: true, gloss: .3, tag: '煎饼' });
    // steam off the griddle — additive balls, animated by tick. Stored so their transforms bob.
    for (let i = 0; i < 3; i++) {
      const p = ball(FX - .55 + (i - 1) * .14, 1.12 + i * .22, FZ,
        .20 - i * .03, .16 - i * .04, .20 - i * .03, C('#eeece4'),
        { mode: 1, alpha: .18 - i * .05, tag: '煎饼' });
      // stash the base scale columns so tick can grow the puff multiplicatively, not absolutely
      p.sx0 = p.m[0]; p.sy0 = p.m[5]; p.sz0 = p.m[10];
      cartSteam.push({ p, x: FX - .55 + (i - 1) * .14, z: FZ, y0: 1.12 + i * .22, ph: i * .9 });
    }
    // striped red/cream canopy pitched toward the customer (the forecourt, +x)
    for (const [ox, oy] of [[-1.20, 2.30], [1.20, 2.30], [-1.20, 2.62], [1.20, 2.62]])
      capsule(FX + ox, oy / 2, FZ + .80, .03, oy, .03, col.steelD, { gloss: .34, tag: '煎饼' });
    for (let i = 0; i < 7; i++)
      box(FX - 1.10 + i * .37, 2.46, FZ + .20, .37, .08, 1.50,
        i % 2 ? col.cream : col.red, { hard: true, rx: -.26, gloss: .24, tag: '煎饼' });
    box(FX, 2.10, FZ + .95, 2.60, .22, .07, col.redD,
      { hard: true, gloss: .24, tag: '煎饼' });
    for (let i = 0; i < 9; i++)
      ball(FX - 1.20 + i * .30, 1.98, FZ + .95, .13, .07, .04, col.redD,
        { gloss: .24, tag: '煎饼' });
    // the sign, inlined (campus has no signBoard helper)
    box(FX + 1.30, 2.00, FZ, .14, .56, .90, col.redD,
      { hard: true, gloss: .26, tag: '煎饼' });
    for (const g of glyphs(FX + 1.42, 2.00, FZ, Math.PI / 2, '煎饼',
        { size: .22, gap: .06, color: col.goldL, mode: 1, tag: '煎饼' })) litten(g, .5);
    // a folding table and two stools in front of it, where you eat standing
    box(FX + 2.20, .72, FZ, 1.00, .06, .60, col.trunkL,
      { hard: true, gloss: G.wood, tag: '煎饼' });
    for (const [ox, oz] of [[-.4, -.24], [.4, -.24], [-.4, .24], [.4, .24]])
      capsule(FX + 2.20 + ox, .36, FZ + oz, .03, .72, .03, col.steelD,
        { gloss: .34, tag: '煎饼' });
    for (const s of [-1, 1]) {
      taper(FX + 2.20 + s * .55, .20, FZ - .70, .30, .40, .30, col.steel,
        { gloss: .30, tag: '煎饼' });
      box(FX + 2.20 + s * .55, .42, FZ - .70, .32, .04, .32, col.steel,
        { hard: true, gloss: .30, tag: '煎饼' });
    }
    solid(FX - 1.25, FX + 1.30, FZ - .70, FZ + .70);
    shade(FX, FZ, 3.2, 2.2, .30);
    thing('煎饼', FX, 2.00, FZ, '一个煎饼，加蛋，四块。',
      'One jianbing, with an egg. Four kuai.',
      '煎 to pan-fry + 饼 flatbread. The cheapest hot breakfast on the campus.',
      { focus: [FX + 1.6, FZ], reach: 2.0 });

    // ================================================================ 大学 the gate
    // Two piers, a steel truss between them with the university's name across it, and the stele
    // beside it with the same name cut into stone. Both, because both are always there.
    for (const s of [-1, 1]) {
      box(GX + s * 4.20, 2.10, -RZ, 1.10, 4.20, 1.10, held(col.stoneL, S.stone),
        { tag: '大学', hard: true, gloss: G.matte, ...S.stone });
      box(GX + s * 4.20, 4.34, -RZ, 1.34, .28, 1.34, held(col.stoneD, S.stone),
        { tag: '大学', hard: true, gloss: G.matte, ...S.stone });
    }
    // The truss carries the university's name and nothing may be allowed to make that harder to
    // read: the glyphs are their own quads standing a decimetre clear of the steel, so the
    // material below is only ever behind them, and the colour it wears is the dark galvanised
    // grey col.steelD always meant — `held` is what keeps it there under a near-white plate.
    const TR = held(col.steelD, S.steel);
    box(GX, 4.00, -RZ, 8.40, .30, .34, TR,
      { tag: '大学', hard: true, gloss: G.metal, ...S.steel });
    box(GX, 4.62, -RZ, 8.40, .18, .28, TR,
      { tag: '大学', hard: true, gloss: G.metal, ...S.steel });
    for (let i = 0; i < 9; i++)
      box(GX - 3.8 + i * .95, 4.31, -RZ, .10, .60, .20, TR,
        { tag: '大学', hard: true, gloss: G.metal, ...S.steel });
    // Both faces of the truss. Lettered on the inside only, the name of the university was a bare
    // steel lattice to everybody arriving at it.
    for (const g of glyphs(GX, 5.20, -RZ + .10, 0, '北京文华大学',
        { size: .48, gap: .20, color: col.redD, mode: 1, tag: '大学' })) litten(g, .8);
    for (const g of glyphs(GX, 5.20, -RZ - .10, Math.PI, '北京文华大学',
        { size: .48, gap: .20, color: col.redD, mode: 1, tag: '大学' })) litten(g, .8);
    // the stele
    // The stele's face carries cut charcoal characters straight onto the stone, so its material
    // is held to the bottom of the band — enough grain to say quarried, not enough to break up
    // the ground the name is read against.
    box(GX + 6.60, 1.10, -RZ + 1.40, 2.40, 2.20, .44, held(col.stoneL, S.stone),
      { tag: '大学', hard: true, gloss: G.matte, ...S.stone });
    box(GX + 6.60, .12, -RZ + 1.40, 2.80, .24, .80, held(col.stoneD, S.stone),
      { tag: '大学', hard: true, gloss: G.matte, ...S.stone });
    glyphs(GX + 6.60, 1.30, -RZ + 1.17, Math.PI, '文华大学',
      { size: .34, gap: .14, color: col.charcoal, mode: 1, tag: '大学', lift: .02 });
    // 石狮子 a stone lion on a plinth flanking each pier, the campus-gate tell. Simplified from
    // the hutong's: a plinth, a seated body, a head with a mane ring, a muzzle. Faces inward.
    for (const s of [-1, 1]) {
      const lx = GX + s * 3.0, lz = -RZ + .30, face = s > 0 ? 1 : -1, T = { tag: '大学' };
      box(lx, .21, lz, .58, .42, .54, col.stoneD, { hard: true, gloss: .24, ...T });
      box(lx, .45, lz, .50, .07, .46, col.stone, { hard: true, gloss: .26, ...T });
      box(lx, .68, lz + .09 * face, .32, .40, .30, col.stone, { gloss: .24, round: .09, ...T });
      box(lx, .78, lz - .09 * face, .28, .48, .26, col.stone, { gloss: .24, round: .09, ...T });
      ball(lx, 1.06, lz - .12 * face, .14, .14, .14, col.stone, { gloss: .26, ...T });
      for (let i = 0; i < 8; i++) {
        const a = i * .785;
        ball(lx + Math.sin(a) * .145, 1.05 + Math.cos(a) * .138, lz - .01 * face,
          .048, .048, .046, col.stoneD, { gloss: .22, ...T });
      }
      ball(lx, 1.02, lz - .24 * face, .072, .062, .062, col.stone, { gloss: .26, ...T });
      ball(lx, 1.01, lz - .29 * face, .022, .02, .02, col.charcoal, { gloss: .30, ...T });
      for (const t of [-1, 1]) {
        ball(lx + t * .06, 1.08, lz - .24 * face, .022, .022, .02, col.charcoal,
          { gloss: .34, ...T });
        box(lx + t * .10, .60, lz - .21 * face, .10, .30, .12, col.stone,
          { hard: true, gloss: .26, ...T });
      }
      ball(lx, .52, lz - .30 * face, .09, .09, .09, col.stoneD, { gloss: .28, ...T });
      solid(lx - .34, lx + .34, lz - .30, lz + .26);
    }
    solid(GX + 5.3, GX + 7.9, -RZ + 1.0, -RZ + 1.9);
    thing('大学', GX, 5.60, -RZ + .60, '我在文华大学上学。', 'I study at Wenhua University.',
      '大 big + 学 study. 上学 is to attend school; 大学生 is a university student.',
      { focus: [GX, -RZ + 2.6], reach: 3.0 });

    // ================================================================ 自行车 the bicycle park
    // Two rows under a canopy, packed. This is the single most recognisable thing about a Chinese
    // campus and it costs almost nothing: six props a bike and the same bike two dozen times.
    const KX = -10.6, KZ = 3.6;
    flat(KX, .006, KZ, 8.6, 6.4, held(col.paveD, S.path), { mode: 9, gloss: .10, ...S.path });
    // The frame of the shelter is galvanised tube and angle, and the material is what stops six
    // posts and two purlins reading as six grey cylinders — while `held` keeps them the dark
    // tube they were, which is the whole reason a bike shelter reads against a pale wall.
    const KS = held(col.steelD, S.steel);
    for (const s of [-1, 1]) {
      for (const o of [-3.4, 0, 3.4])
        cyl(KX + o, 1.24, KZ + s * 2.9, .075, 2.48, KS, { gloss: G.metal, ...S.steel });
      box(KX, 2.52, KZ + s * 2.9, 8.20, .14, .28, KS,
        { hard: true, gloss: G.metal, ...S.steel });
    }
    // and the sheet over it is a tarpaulin, which mode 7 already weaves; the fabric gives it the
    // slack and the dirt a tarpaulin has after a winter of it.
    box(KX, 2.76, KZ, 8.80, .12, 6.40, held(col.tarp, S.tarp),
      { hard: true, mode: 7, gloss: .10, ...S.tarp });
    for (const s of [-1, 1]) {
      for (let i = 0; i < 12; i++) {
        const bx = KX - 3.9 + i * .71;
        box(bx, .09, KZ + s * 1.55, .10, .18, .70, KS,
          { hard: true, gloss: G.metal, ...S.steel });
        bike(bx, KZ + s * 1.30, s > 0 ? 0 : Math.PI,
          [col.bike1, col.bike2, col.bike3, col.bike4][(i + (s > 0 ? 1 : 0)) % 4]);
      }
    }
    solid(KX - 4.5, KX + 4.5, KZ - 3.2, KZ + 3.2);
    shade(KX, KZ, 9.4, 7.0, .30);
    thing('自行车', KX + 4.80, 1.10, KZ, '这么多自行车，我的在哪儿？',
      'So many bicycles. Where is mine?',
      '自行车 — self-run vehicle. 骑车 is to ride one.',
      { focus: [KX + 5.9, KZ], reach: 2.2 });
    // 共享单车 shared bikes scattered across the forecourt, the ones nobody put back in the rack.
    // A few kicked over or parked at a tilt, the way a real forecourt always has them.
    // The court's own origin is declared up here because one of the strays is parked beside it
    // and `const` further down the same function is a dead page, not a hoisted variable.
    const CTX = 12.0, CTZ = -8.0;
    const sharedBikes = [
      [LX - 5.0, 1.5, .4], [LX - 6.2, -2.0, -.6], [GX + 5.0, 1.0, 2.1],
      [CTX - 5.5, CTZ + 2.0, .9], [3.2, 4.2, -.2], [-5.0, -4.5, .8],
    ];
    sharedBikes.forEach(([bx, bz, ry], i) => {
      bike(bx, bz, ry, [col.bike1, col.bike2, col.bike3, col.bike4][i % 4]);
      // one in three tipped slightly, as if the kickstand missed
      if (i % 3 === 2) shade(bx, bz, 1.6, .5, .14);
    });

    // ================================================================ 布告板 the noticeboard
    // Three panels of glass with paper behind it, half of it out of date, which is the only place
    // on a campus where anything is actually announced.
    const NX = 5.6, NZ = -6.4;
    // Frame and legs only. The paper behind the glass and the 通知 header are what this thing is
    // for, and neither takes a material: a noticeboard whose notices have picked up a texture is
    // a noticeboard nobody can read.
    for (const s of [-1, 1])
      box(NX + s * 2.90, .95, NZ, .16, 1.90, .28, held(col.steelD, S.steel),
        { hard: true, gloss: G.metal, ...S.steel });
    for (let i = 0; i < 3; i++) {
      const px = NX - 2.0 + i * 2.0;
      box(px, 1.50, NZ, 1.86, 1.42, .14, held(col.steel, S.steel),
        { tag: '布告板', hard: true, gloss: G.metal, ...S.steel });
      box(px, 1.50, NZ - .08, 1.70, 1.28, .03, col.cream,
        { tag: '布告板', hard: true, gloss: .18 });
      for (let k = 0; k < 4; k++)
        box(px - .55 + (k % 2) * 1.05, 1.78 - ((k / 2) | 0) * .58, NZ - .10,
          .82, .50, .01, pick([col.white, C('#e8dcc0'), C('#dfe6ea'), C('#eadfdf')]),
          { tag: '布告板', hard: true, gloss: .14, ry: (rnd() - .5) * .04 });
      panes.push(box(px, 1.50, NZ - .12, 1.70, 1.28, .02, col.glassDay,
        { tag: '布告板', hard: true, mode: 1, alpha: .22, gloss: G.glass }));
    }
    box(NX, 2.36, NZ, 6.20, .34, .18, col.blueSign,
      { tag: '布告板', hard: true, gloss: .24 });
    glyphs(NX, 2.36, NZ - .11, Math.PI, '通知',
      { size: .19, gap: .07, color: col.white, mode: 1, tag: '布告板' });
    solid(NX - 3.1, NX + 3.1, NZ - .30, NZ + .30);
    thing('布告板', NX, 2.72, NZ - .40, '布告板上都是通知。',
      'The noticeboard is covered in notices.',
      '布告 notice + 板 board. 通知 is an announcement.',
      { focus: [NX, NZ - 1.7], reach: 2.4 });

    // ================================================================ 篮球场 the basketball court
    // One half court, painted, with a hoop at the end of it. It is where the campus is at six in
    // the evening and it is four lines of paint and a backboard.
    // The court's own surface is the one bit of ground here that is poured, not laid, so it takes
    // `asphalt` rather than paving: coarse aggregate over the whole slab instead of stone inside
    // each square. Scaled well above the mode-9 grid so the two do not beat against each other.
    flat(CTX, .006, CTZ, 11.0, 7.4, held(C('#7c6f5c'), S.court),
      { mode: 9, gloss: .12, ...S.court });
    for (const [ox, oz, sx, sz] of [[0, -3.6, 11.0, .10], [0, 3.6, 11.0, .10],
                                    [-5.4, 0, .10, 7.4], [5.4, 0, .10, 7.4],
                                    [3.4, 0, .10, 3.6], [4.6, 0, 1.7, .10]])
      flat(CTX + ox, .009, CTZ + oz, sx, sz, col.cream, { gloss: .12 });
    for (let i = 0; i < 15; i++) {
      const a = -Math.PI / 2 + i * (Math.PI / 14);
      flat(CTX + 3.4 + Math.sin(a) * 1.85, .009, CTZ + Math.cos(a) * 1.85, .16, .16,
        col.cream, { gloss: .12 });
    }
    cyl(CTX + 5.60, 1.60, CTZ, .09, 3.20, col.charcoal, { tag: '篮球场', gloss: .28 });
    box(CTX + 5.20, 3.30, CTZ, .90, .10, .12, col.charcoal,
      { tag: '篮球场', hard: true, gloss: .28 });
    box(CTX + 4.72, 3.34, CTZ, .10, 1.05, 1.80, col.white,
      { tag: '篮球场', hard: true, gloss: .24 });
    box(CTX + 4.66, 3.20, CTZ, .02, .58, .90, col.orange,
      { tag: '篮球场', hard: true, mode: 1 });
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5;
      box(CTX + 4.50, 3.06, CTZ + Math.sin(a) * .23, .035, .035, .035, col.orange,
        { tag: '篮球场', hard: true, gloss: .30, ry: a });
    }
    cyl(CTX + 4.50, 3.06, CTZ, .23, .03, col.orange, { tag: '篮球场', gloss: .30 });
    for (let i = 0; i < 5; i++)
      cyl(CTX + 4.50, 2.94 - i * .05, CTZ, .21 - i * .03, .012, col.white,
        { tag: '篮球场', mode: 1, alpha: .7 });
    ball(CTX + 2.4, .13, CTZ - 1.2, .13, .13, .13, col.orange, { gloss: .28 });
    solid(CTX + 5.4, CTX + 5.8, CTZ - .2, CTZ + .2);
    thing('篮球场', CTX + 3.60, 1.70, CTZ, '晚上在篮球场打球。',
      'We play basketball on the court in the evening.',
      '篮球 basketball + 场 ground. 打球 is to play a ball game.',
      { focus: [CTX + 1.9, CTZ], reach: 2.6 });

    // ================================================================ 宿舍 the dormitory
    // A six-storey dormitory along the -z edge, right of the gate, facing +z into the campus.
    // A grid of windows, AC units, a brick plinth, and a ground-floor entrance with the name
    // above it — the same layered-facade vocabulary as the teaching block.
    const FLa = 3.00, FLOORa = 6, BHa = FLa * FLOORa + 1.0;
    const Dx = 7.5, Dz = -10.5;
    box(Dx, BHa / 2, Dz - 2.0, 12.0, BHa, 4.0, held(col.render, S.rend),
      { hard: true, mode: 14, gloss: G.paint, ...S.rend });
    // brick plinth — the same surface as the teaching block's, because on a campus like this the
    // two plinths were laid by the same yard in the same year.
    box(Dx, 1.10, Dz + .04, 12.0, 2.20, .30, held(col.brick, S.brick),
      { hard: true, mode: 11, gloss: G.matte, ...S.brick });
    box(Dx, 2.20, Dz + .05, 12.10, .14, .22, col.renderL,
      { hard: true, gloss: G.paint });
    // string course + windows + AC on floors 2–6
    for (let f = 1; f < FLOORa; f++) {
      box(Dx, f * FLa + .05, Dz + .02, 12.04, .18, .22, col.renderL,
        { hard: true, gloss: G.paint });
      for (let i = 0; i < 5; i++) {
        const wx = Dx - 4.8 + i * 2.4;
        fwin(wx, f * FLa + 1.30, Dz, 1.80, 1.50, 1);
        if (f > 1 && (i * 3 + f) % 3 === 0) acBox(wx + .90, f * FLa + .50, Dz, 1);
      }
    }
    // parapet
    box(Dx, BHa + .30, Dz - 2.0, 12.6, .60, 4.4, held(col.renderD, S.rend),
      { hard: true, gloss: G.paint, ...S.rend });
    box(Dx, BHa + .62, Dz - 2.0, 12.7, .10, 4.5, col.stoneD,
      { hard: true, mode: 13, gloss: .18 });
    // entrance: jambs, head, glazed doors, steps
    for (const s of [-1, 1])
      box(Dx + s * 1.20, 1.60, Dz + .22, .24, 2.80, .24, col.charcoal,
        { tag: '宿舍', hard: true, gloss: .26 });
    box(Dx, 3.00, Dz + .22, 2.80, .34, .24, col.charcoal,
      { tag: '宿舍', hard: true, gloss: .26 });
    panes.push(box(Dx, 1.62, Dz - .06, 2.40, 2.70, .06, col.glassDark,
      { tag: '宿舍', hard: true, mode: 1, gloss: G.glass }));
    box(Dx, 3.06, Dz - .10, 2.40, .10, .10, col.steel,
      { tag: '宿舍', hard: true, gloss: G.metal });
    for (let i = 0; i < 3; i++)
      box(Dx, .09 + i * .18, Dz + .60 + i * .46, 2.40 - i * .12, .18, .46, held(col.stoneL, S.stone),
        { hard: true, gloss: G.matte, ...S.stone });
    // name above the door
    box(Dx, 3.48, Dz - .08, 3.60, .52, .10, col.redD,
      { tag: '宿舍', hard: true, gloss: .22 });
    for (const g of glyphs(Dx, 3.48, Dz - .14, 0, '学生宿舍',
        { size: .22, gap: .08, color: col.goldL, mode: 1, tag: '宿舍' })) litten(g, .9);
    solid(Dx - 6.0, Dx + 6.0, Dz - 4.0, Dz + .3);
    blocker(Dx - 6.0, Dx + 6.0, Dz - 4.0, Dz + .3, BHa + 1);
    thing('宿舍', Dx, 4.00, Dz + 1.0, '宿舍楼是学生住的地方。',
      'The dormitory is where the students live.',
      '宿 to lodge + 舍 house. The student dormitory.',
      { focus: [Dx, Dz + 2.2], reach: 2.6 });

    // ================================================================ 地铁站 back to the line
    const MX = -11.4, MZ = -RZ + 1.30;
    flat(MX, .006, MZ + .5, 3.6, 3.6, held(col.paveL, S.pave), { mode: 9, gloss: .12, ...S.pave });
    flat(MX, .012, MZ + .70, 2.10, 1.70, col.black, { gloss: .08 });
    for (let i = 0; i < 6; i++)
      box(MX, .016, MZ + .06 + i * .22 - i * i * .012, 1.84, .01, .055,
        i < 3 ? col.kerb : col.stoneD, { hard: true, gloss: .14 });
    for (const s of [-1, 1]) {
      box(MX + s * 1.14, .48, MZ + .70, .16, .96, 1.80, held(col.stone, S.stone),
        { hard: true, gloss: G.matte, ...S.stone });
      box(MX + s * 1.14, .98, MZ + .70, .22, .07, 1.86, col.kerb, { hard: true, gloss: .20 });
      box(MX + s * 1.20, 1.30, MZ + 1.64, .13, 2.60, .13, col.steelD,
        { hard: true, gloss: G.metal });
    }
    box(MX, 2.62, MZ + 1.06, 2.86, .12, 2.00, col.renderL, { hard: true, gloss: G.paint });
    // A batten under the canopy and the light it is. This is where the player arrives, and a
    // subway mouth with a lit sign over an unlit stair is the one bit of street furniture
    // everybody has stood under and would notice was wrong.
    litten(box(MX, 2.53, MZ + 1.06, 1.60, .05, .28, C('#fbf3e0'),
      { hard: true, mode: 1, glow: .10 }), .9);
    B.light(MX, 2.42, MZ + 1.06, [1.00, 0.95, 0.82], .60, 2.4);
    box(MX, 2.40, MZ + .08, 2.86, .34, .10, col.blueSign, { hard: true, gloss: .26 });
    // Both faces. The campus is at +z and the stair is at -z, so a sign on one side only is blank
    // to everybody crossing the forecourt looking for the station.
    for (const [gz, gyaw, dz, dgz] of [[MZ + .02, Math.PI, MZ + .01, MZ - .02],
                                       [MZ + .14, 0, MZ + .15, MZ + .18]]) {
      for (const g of glyphs(MX + .32, 2.40, gz, gyaw, '地铁站',
          { size: .20, gap: .05, color: col.white, mode: 1 })) litten(g, .9);
      // rx, not rz: about z the disc stands on edge and the roundel reads as a white bar.
      cyl(MX - .94, 2.40, dz, .145, .03, col.white, { rx: Math.PI / 2, mode: 1, gloss: .20 });
      for (const g of glyphs(MX - .94, 2.40, dgz, gyaw, '地',
          { size: .17, gap: 0, color: col.blueSign, mode: 1 })) litten(g, .5);
    }
    box(MX - 1.96, 1.55, MZ - .16, .16, 3.10, .16, col.steelD, { hard: true, gloss: G.metal });
    box(MX - 1.96, 2.60, MZ - .20, .52, 1.60, .14, col.blueSign, { hard: true, gloss: .26 });
    for (const g of glyphs(MX - 1.96, 2.58, MZ - .28, Math.PI, '大学城',
        { size: .17, gap: .05, vertical: true, color: col.white, mode: 1 })) litten(g, .9);
    solid(MX - 2.10, MX + 1.30, MZ - .30, MZ + 1.80);
    shade(MX, MZ + .6, 3.4, 2.6, .28);
    thing('地铁站', MX, 2.92, MZ - .30, '坐地铁回去吧。', "Let's take the subway back.",
      '地铁 subway + 站 stop. Four stops back into town.',
      { focus: [MX, MZ - 1.55], reach: 2.4 }).station = '大学城';

    // ================================================================ the small stuff
    tree(-16.4, -7.6, 6.2); tree(-16.6, 1.0, 6.4); tree(-16.4, 9.0, 6.0);
    tree(GX - 8.2, -RZ + 6.0, 5.6); tree(GX + 8.6, -RZ + 6.4, 5.8);
    tree(2.0, -3.6, 5.4); tree(8.4, -1.0, 5.6);
    // benches, bins and a drinking fountain round the forecourt
    for (const [bx, bz, ry] of [[-2.2, -3.4, 0], [2.6, -3.4, 0], [-6.4, -1.0, Math.PI / 2],
                                [7.2, 4.4, Math.PI]]) {
      for (const s of [-1, 1])
        box(bx + Math.cos(ry) * s * .72, .22, bz - Math.sin(ry) * s * .72,
          .14, .44, .44, col.stone, { hard: true, ry, gloss: G.matte });
      for (let i = 0; i < 4; i++)
        box(bx - Math.sin(ry) * (-.15 + i * .11), .45, bz - Math.cos(ry) * (-.15 + i * .11),
          1.56, .05, .09, col.trunkL, { hard: true, ry, gloss: G.wood });
      solid(bx - .82, bx + .82, bz - .32, bz + .32);
      shade(bx, bz, 2.0, 1.0, .24);
    }
    // 长椅 — two of the forecourt benches are sit-able. The other two stay scenery, the way a
    // real forecourt has one bench in the sun and three nobody sits on.
    thing('长椅', -2.2, .48, -3.4, '树下的长椅总有人。', 'The bench under the tree is always taken.',
      '长 long + 椅 chair. 坐下 is to sit down.',
      { focus: [-2.2, -2.6], reach: 1.8 });
    thing('长椅', -6.4, .48, -1.0, '坐一会儿再走。', 'Sit a while before you go.',
      '长 long + 椅 chair. 坐 is to sit.',
      { focus: [-5.4, -1.0], reach: 1.8 });
    // 饮水机 the drinking fountains: a teal column with a basin. The prop is already there; this
    // makes the first one usable, so a thirsty walk between classes has a free answer.
    for (const [bx, bz] of [[-.4, -3.6], [-6.6, 1.4], [5.0, 4.6], [NX - 3.6, NZ + .4]]) {
      cyl(bx, .38, bz, .21, .76, col.teal, { gloss: .26 });
      cyl(bx, .78, bz, .22, .06, col.charcoal, { gloss: .24 });
      // a chrome spout and a steel basin ring, so it reads as a fountain rather than a post
      capsule(bx, .78, bz, .022, .18, .022, col.chrome, { rx: 1.2, gloss: G.metal });
      box(bx, .66, bz, .30, .06, .30, col.steelD, { hard: true, gloss: G.metal });
      solid(bx - .24, bx + .24, bz - .24, bz + .24);
    }
    thing('饮水机', -.4, .78, -3.6, '饮水机的水不要钱。', 'The water from the fountain is free.',
      '饮水 drinking water + 机 machine. 喝 is to drink.',
      { focus: [-.4, -2.8], reach: 1.6 });
    // lamp standards, warm at night. The lamp head lifts its glow and a pool of warm light
    // spreads on the paving underneath it, the way every forecourt is lit after dark.
    //
    // Those two are what a lamp *looks* like — a bright emissive lens and a painted patch on the
    // paving — and until now that was all there was: a student standing directly under one at
    // midnight was lit by the night sky and got nothing whatever from the lantern above their
    // head. `B.light` is the lamp itself. It sits just under the lens rather than at it, so the
    // head casts its own shadow upward the way a shade does, and the radius is set to a little
    // over the pool the glow decal paints, because the two are meant to be the same lamp.
    // The renderer takes the nearest eight to the camera and outdoors switches them with the
    // sun, so these come on when the daylight goes and cost nothing before then.
    for (const [lx, lz] of [[GX - 5.0, -RZ + 5.0], [GX + 5.0, -RZ + 5.0], [-4.0, 5.0],
                            [6.0, 5.0], [CTX - 4.0, CTZ + 4.2]]) {
      cyl(lx, 2.30, lz, .085, 4.60, col.charcoal, { gloss: .28 });
      box(lx, 4.72, lz, .56, .20, .40, col.charcoal, { hard: true, gloss: .28 });
      litten(box(lx, 4.56, lz, .46, .10, .32, C('#ffe6ae'),
        { hard: true, mode: 1, glow: .10 }), 1);
      lampPools.push(glow(M.trs(lx, .03, lz, 0, 6.0, 1, 6.0), C('#ffd79a'), 0));
      B.light(lx, 4.40, lz, [1.00, 0.88, 0.66], .95, 4.6);
      solid(lx - .13, lx + .13, lz - .13, lz + .13);
    }
    // and the flagpole, which every one of these forecourts has in the middle of it
    cyl(GX, 4.20, -RZ + 7.4, .09, 8.40, col.white, { gloss: .30 });
    box(GX, .22, -RZ + 7.4, 1.30, .44, 1.30, held(col.stoneL, S.stone),
      { hard: true, gloss: G.matte, ...S.stone });
    // Three joined panels let the cloth ripple out of plane while its hoist stays on the pole.
    // One rigid 1.1 m slab could only flap like a signboard.
    const flagLeft = GX + .03, flagW = 1.10 / 3, flagZ = -RZ + 7.4;
    for (let i = 0; i < 3; i++) {
      const p = box(flagLeft + (i + .5) * flagW, 7.70, flagZ, flagW + .006, .72, .04, col.red,
        { hard: true, mode: 7, gloss: G.fabric });
      flagPanels.push({ p, w: flagW, h: .72, d: .04, phase: i * .73 });
      // Every panel can sweep anywhere inside the complete flag, so all three share one safe
      // packed cull sphere rather than disappearing at the edge of the view mid-flutter.
      p.fixed = true; p.cx = GX + .58; p.cy = 7.70; p.cz = flagZ; p.r = .78;
    }
    solid(GX - .8, GX + .8, -RZ + 6.7, -RZ + 8.1);
  }

  build();

  // The glazing on all three buildings goes warm after dark, one pane at a time, and the lamp
  // pools spread under the standards. `panes` holds a mix of bare props (the doors and the older
  // entrances) and {p, warm} wrappers (the facade windows off fwin), so unwrap either here.
  function setNight(k) {
    const soft = k * k * (3 - 2 * k);
    for (const { p, k: kk } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) + soft * kk * .34;
    for (const g of lampPools) g.a = soft * .30;
    for (let i = 0; i < panes.length; i++) {
      const entry = panes[i], p = entry.p || entry;
      const on = (i * 2654435761 % 100) / 100 < .42;
      if (!p.color0) p.color0 = p.color;
      p.color = soft > .5 && on ? C('#ffcf87') : p.color0;
      p.glow = soft > .5 && on ? .34 * soft : 0;
    }
  }
  // Steam off the jianbing griddle: each puff rises, spreads, fades and resets — a slow loop, so
  // the forecourt has one moving thing in it even when nobody is about. The transform's y is its
  // translation entry (m[13]); alpha rides on the prop directly; scale grows off the base columns.
  function tick(t) {
    for (const s of cartSteam) {
      const u = (t * .22 + s.ph) % 1;
      s.p.m[13] = s.y0 + u * .55;
      s.p.alpha = (1 - u) * .18;
      const spread = 1 + u * .9;
      s.p.m[0] = s.p.sx0 * spread;
      s.p.m[5] = s.p.sy0 * spread * .8;
      s.p.m[10] = s.p.sz0 * spread;
    }
    // The hoist edge stays fixed to the pole and each panel begins where the previous one ends.
    // Weather controls the amplitude; the second frequency prevents a mechanical sine wave.
    const wind = typeof Weather !== 'undefined' && Weather.now ? Weather.now.wind : .18;
    let x = GX + .03, z = -RZ + 7.4;
    for (let i = 0; i < flagPanels.length; i++) {
      const q = flagPanels[i];
      const a = Math.sin(t * (1.02 + i * .07) + q.phase) * (.018 + wind * (.055 + i * .018))
              + Math.sin(t * 2.17 + q.phase * 1.8) * (.005 + wind * .009);
      const c = Math.cos(a), s = Math.sin(a), m = q.p.m;
      m[0] = c * q.w; m[1] = 0; m[2] = -s * q.w; m[3] = 0;
      m[4] = 0; m[5] = q.h; m[6] = 0; m[7] = 0;
      m[8] = s * q.d; m[9] = 0; m[10] = c * q.d; m[11] = 0;
      m[12] = x + c * q.w * .5; m[13] = 7.70; m[14] = z - s * q.w * .5; m[15] = 1;
      x += c * q.w; z -= s * q.w;
    }
  }

  return B.finish({
    setNight, tick, RX, RZ, OUT,
    label: '大学城', labelK: '大学城 · campus',
    indoor: false, cutaway: false, near: .18, far: 700,
    fogNear: 30, fogD: .0058, expose: .52,
    spawn: { x: -11.4, z: -RZ + 3.20, yaw: 0 },
    zones: [{ id: 'campus', x0: -RX + .4, x1: RX - .4, z0: -RZ + .4, z1: RZ - .4,
              light: [0, 4.0, -RZ + 8.0] }],
    roomAt() { return this.zones[0]; },
  });
});
