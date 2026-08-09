// 厨房 — the kitchen in flat 202
//
// The fitted room registered by HomeWalls spans x 2.2 .. 6.0, z -5.0 .. -2.2.  The cabinets
// begin at x 3.4, leaving the western strip as the clear approach from the doorway; its tiled
// finish still belongs to the kitchen and therefore covers the whole registered room.
// furniture uses the south and east walls, leaving a continuous clear route from the kitchen
// doorway at x 3.3 .. 4.1 to every usable appliance.  All y coordinates are world coordinates
// derived from `A.y0`; nothing in this file relies on the flat always being deck 2.
FlatFit['kitchen'] = A => {
  if (!A || typeof A.box !== 'function' || typeof A.th !== 'function') return;

  const { box, cyl, ball, taper, flat, wall } = A;
  const cap = A.cap || A.capsule;
  // Guarded the same way as `cap` above: this file is built by FlatFit as well as by the deck-2
  // path, and a builder that is absent must degrade to a no-op rather than throw mid-room.
  const model = A.model || (() => null);
  const glyph = A.glyph || A.glyphs || (() => null);
  const stop = A.stop || (() => null);
  const shade = A.shade || (() => null);
  const C = A.C;
  const M = A.M;
  const PI = Math.PI;
  const Y = Number.isFinite(A.y0) ? A.y0 : 3.10;
  const H = 2.60;
  const X0 = 2.20, X1 = 6.00, Z0 = -5.00, Z1 = -1.60;
  const top = Y + .925;

  const K = {
    floor: C('#9a8069'), grout: C('#98948a'), wall: C('#e6ded0'),
    tile: C('#bcb8ac'), tileAlt: C('#b0b4ab'),
    cabinet: C('#bcb8ac'), cabinetD: C('#b5a78f'), kick: C('#655f57'),
    counter: C('#6e7475'), counterEdge: C('#4a5856'),
    steel: C('#aeb5bb'), chrome: C('#a4a9ac'), steelD: C('#70787e'),
    fridge: C('#bfc6cb'), fridgeIn: C('#aeb5bb'), black: C('#24272b'),
    iron: C('#3a2f28'), ironIn: C('#5a4128'), flame: C('#5ba8e8'),
    flameHot: C('#c7eaff'), warm: C('#f3d9a8'), red: C('#a43c2c'),
    redD: C('#793025'), green: C('#4b7d43'), chilli: C('#b12d22'),
    // The kitchen's own two timbers were #ad8557 and #765536, a set nothing else in the flat has.
    // Fitted units are the same board as the wardrobe: FLAT_PALETTE (js/home-walls.js).
    garlic: C('#cdc4b4'), wood: C(FLAT_PALETTE.woodL), woodD: C(FLAT_PALETTE.woodM),
    bamboo: C('#c8a877'), white: C('#c8c7c1'), lit: C('#f2f0e9'), porcelain: C('#ced2ce'),
    blue: C('#3f6f8c'), oil: C('#c49332'), soy: C('#3a2a1e'),
    glass: C('#afc6cd'), water: C('#bde4ee'), paper: C('#d3ccbc'),
  };
  // -------------------------------------------------------------------------- the material kit
  // This room used to spread `A.MAT` straight through, and A.MAT is the *shell's* kit: its tile
  // preset is matScale .34, sized for the lobby's small floor mosaic.  Tiles141 carries a 6x6
  // grid inside one repeat, so .34 makes a 5.6 cm tile — at kitchen viewing distance that
  // aliases into grey smears rather than reading as tile, which is exactly what the before
  // render showed on both the floor and the splashback.
  //
  // `matScale` is metres per repeat, so a tile size wants six of them.  Both tiled surfaces in
  // here already have their grout drawn as geometry, so the texture's pitch is matched to that
  // drawn module rather than to a generic figure — a texture grid at one size crossing a drawn
  // grid at another is worse than no texture at all:
  //
  //   floor        grout bars every .43 m   ->  .43 * 6 = 2.58
  //   splashback   grout bars every .31 m   ->  .31 * 6 = 1.86  (ART.md's 1.8, near enough)
  //
  // The amounts are ART.md's table values, not lowered ones.  They were written lower here first,
  // on the assumption that a high `matAmt` over a pale albedo would lift the surface toward white.
  // Measured on this shot, it does not: mean luminance over the cabinet face went 178.7 -> 178.8
  // across the whole pass, because the shader divides the sampled texel by that material's own
  // measured mean before it multiplies.  So the table's amounts are safe, and the reason this room
  // still looks untextured is not the amounts — see the note at the bottom of this block.
  const floorTile  = { mat: 'tile',  matScale: 2.58, matAmt: .28, nrmAmt: .34 };
  // The splashback is the same glazed wall tile as the 卫生间's, and it now says so: one wet-room
  // tile for the flat, from FLAT_PALETTE (js/home-walls.js). Both rooms were already at 1.86 m per
  // repeat and differed only in relief and gloss, which is a difference nobody chose.
  const tileMat    = { ...FLAT_PALETTE.tileW };
  // Appliance, fitting, worktop, handle, white goods — all one preset.  One world-space scale for
  // all the steel, so the triplanar field stays continuous across it in a single frame instead of
  // changing pitch per object.
  const metalMat   = { ...FLAT_PALETTE.fitting, gloss: .44 };
  // Cabinet carcass and doors: laminate over board, which is what a fitted Beijing kitchen is —
  // and the same board the wardrobe and the bookcase are made of, so the same FLAT_PALETTE timber.
  const woodC      = { ...FLAT_PALETTE.timber };
  // The chopping block and the wooden handles are small solid timber, so their grain is finer
  // than the cabinet board's.  `mode: 6` is the bevel the board already had; it is not a material.
  const woodMat    = { mat: 'wood',  matScale: .32,  matAmt: .28, nrmAmt: .46, mode: 6, gloss: .18 };
  const woodFine   = { mat: 'wood',  matScale: .32,  matAmt: .26, nrmAmt: .46 };
  const hard = { hard: true, gloss: .20 };
  // WHY THIS ROOM STILL LOOKS UNTEXTURED, measured rather than guessed.  Every preset above is
  // applied and correct, and the change it makes is close to invisible: patch standard deviation
  // over the cabinet face moved 4.39 -> 4.27, and the untouched wall next to it measures 4.53.
  // The cause is the value range, not the materials.  Eighteen of this file's thirty-nine base
  // colours sit above 0.80 luminance — `cabinet` .834, `tile` .847, `grout` .826, `fridge` .903,
  // `white` .941 — and against that there is no headroom for a texture to be seen in.  Boosting
  // `matAmt` to force it through is the "brighter rather than textured" failure ART.md names, so
  // it is deliberately NOT done here.  The albedos are the fix and they are being taken down
  // elsewhere; when they are, these amounts are already the right ones and should start reading
  // with no change to this block.
  const whiteMat = metalMat;   // kept as a name so the appliance call sites still read as such

  const TH = (hz, x, y, z, zh, en, note, fx, fz, reach = 1.55) =>
    A.th(hz, x, y, z, zh, en, note, { focus: [fx, fz], reach, tag: hz });

  // Rotate a collection about a vertical hinge.  Fixtures use the names game.js already drives.
  const hinge = (hx, hz, a) => M && M.mul
    ? M.mul(M.trans(hx, 0, hz), M.mul(M.rotY(a), M.trans(-hx, 0, -hz)))
    : null;

  // -------------------------------------------------------------------------- floor and tile
  // The shell's current partition sits at z -2.20, within the documented kitchen envelope.  The
  // finish stops 8 mm short of it so it never fights the dining-room finish on the same plane.
  // `mode: 9` was here, and it is not tile: it is the shader's procedural PAVEMENT, a hardcoded
  // 0.62 m slab grid with hash-varied slab tone and dirt in the joints (js/gl.js:796). On this
  // floor that made three grids at once — the procedural 62 cm slabs, the 43 cm grout bars below,
  // and Tiles141's own 43 cm grid — none of which agree. The deck 4 and bathroom floors had the
  // same inheritance and dropped it for the same reason. The tile material carries the surface now.
  flat((X0 + X1) / 2, Y + .014, (Z0 - 2.208) / 2, X1 - X0 - .02, 2.792,
       K.floor, { ...floorTile, gloss: .20 });
  for (let x = X0 + .43; x < X1; x += .43)
    flat(x, Y + .017, -3.604, .010, 2.772, K.grout, { hard: true, gloss: .18 });
  for (let z = -4.74; z < -2.20; z += .43)
    flat(4.70, Y + .018, z, 2.56, .010, K.grout, { hard: true, gloss: .18 });

  // Ceramic splashbacks.  The lower cabinets stand proud of these, while the 10 mm grout bars
  // and alternating cream/green tiles keep the galley from reading as one grey block.
  wall(4.70, Y + 1.36, -4.946, 2.48, .94, 0, K.tile, tileMat);
  wall(5.946, Y + 1.36, -3.69, 1.52, .94, -PI / 2, K.tileAlt, tileMat);
  for (let x = 3.48; x < 5.95; x += .31)
    box(x, Y + 1.36, -4.934, .009, .94, .010, K.grout, { hard: true, gloss: .14 });
  for (const h of [1.05, 1.36, 1.67])
    box(4.70, Y + h, -4.932, 2.48, .010, .012, K.grout, { hard: true, gloss: .14 });
  for (let z = -4.38; z < -2.94; z += .31)
    box(5.934, Y + 1.36, z, .012, .94, .009, K.grout, { hard: true, gloss: .14 });
  for (const h of [1.05, 1.36, 1.67])
    box(5.932, Y + h, -3.69, .012, .010, 1.52, K.grout, { hard: true, gloss: .14 });

  // -------------------------------------------------------------------------- fitted cabinets
  // South run: prep, hob and rice-cooker bays.  East run: sink and draining board.  Their shared
  // corner is deliberately closed; the clear floor remains x 3.4 .. 5.25, over a metre wide.
  box(4.58, Y + .44, -4.675, 2.28, .82, .61, K.cabinet, { ...hard, ...woodC });
  box(4.58, top - .025, -4.675, 2.32, .050, .65, K.counter, { hard: true, ...metalMat });
  box(4.58, top + .004, -4.342, 2.34, .026, .025, K.counterEdge,
      { hard: true, ...metalMat, gloss: .48 });
  box(4.58, Y + .105, -4.676, 2.22, .16, .52, K.kick,
      { hard: true, ...metalMat, gloss: .16 });
  for (let i = 0; i < 4; i++) {
    const x = 3.75 + i * .56;
    box(x, Y + .48, -4.358, .52, .66, .027, i % 2 ? K.cabinet : K.cabinetD,
        { hard: true, ...woodC, gloss: .23, tag: '厨房' });
    box(x, Y + .735, -4.338, .20, .020, .028, K.steelD,
        { hard: true, ...metalMat, gloss: .62, tag: '厨房' });
  }

  box(5.675, Y + .44, -3.72, .61, .82, 1.34, K.cabinet, { ...hard, ...woodC });
  box(5.675, top - .025, -3.72, .65, .050, 1.40, K.counter, { hard: true, ...metalMat });
  box(5.342, top + .004, -3.72, .025, .026, 1.42, K.counterEdge,
      { hard: true, ...metalMat, gloss: .48 });
  box(5.676, Y + .105, -3.72, .52, .16, 1.28, K.kick,
      { hard: true, ...metalMat, gloss: .16 });
  for (const z of [-4.12, -3.60, -3.08]) {
    box(5.358, Y + .48, z, .027, .66, .47, K.cabinet,
        { hard: true, ...woodC, gloss: .23, tag: '厨房' });
    box(5.338, Y + .735, z, .028, .020, .18, K.steelD,
        { hard: true, ...metalMat, gloss: .62, tag: '厨房' });
  }

  // Two wall cupboards, shallow enough not to loom over the worktop.  The left door is the
  // `cupboard` fixture that opens while 做饭 runs.
  const cupboardDoor = [];
  box(4.72, Y + 1.82, -4.82, 1.34, .72, .27, K.cabinetD,
      { hard: true, ...woodC, gloss: .20 });
  for (const s of [-1, 1]) {
    const cx = 4.72 + s * .335;
    const p = box(cx, Y + 1.82, -4.666, .62, .64, .034, K.cabinet,
      { hard: true, ...woodC, gloss: .25, tag: '厨房' });
    const h = box(cx - s * .235, Y + 1.82, -4.642, .025, .22, .025, K.steelD,
      { hard: true, ...metalMat, gloss: .64, tag: '厨房' });
    if (s < 0) cupboardDoor.push(p, h);
  }
  if (A.mover && M && M.mul)
    // The left leaf is centred at 4.385 and is .62 m wide: 4.075 is its actual outside edge.
    // Pivoting at 4.365 made it spin around its middle like a flap instead of opening on a hinge.
    A.mover('cupboard', cupboardDoor, v => hinge(4.075, -4.666, -1.05 * v));

  // The fitted runs are the only kitchen collision volumes.  The doorway and the whole west-side
  // walking lane remain unobstructed even after clampMove adds the player's 30 cm body radius.
  stop(3.40, 5.76, -5.00, -4.31);
  stop(5.28, 6.00, -4.38, -3.00);
  shade(4.58, -4.68, 2.42, .76, .35);
  shade(5.68, -3.72, .76, 1.50, .34);

  // -------------------------------------------------------------------------- 冰箱 refrigerator
  // A genuinely hollow body makes opening the animated doors reveal shelves and food instead of
  // another solid white box.  It faces west into the clear lane and opens north-to-west.
  const FX = 5.64, FZ = -2.56, FF = 5.285, FH = 1.78;
  box(5.94, Y + FH / 2, FZ, .055, FH, .76, K.fridge,
      { hard: true, ...whiteMat, gloss: .40, tag: '冰箱' });
  for (const s of [-1, 1])
    box(5.62, Y + FH / 2, FZ + s * .365, .66, FH, .045, K.fridge,
        { hard: true, ...whiteMat, gloss: .32, tag: '冰箱' });
  box(5.62, Y + FH - .035, FZ, .66, .07, .76, K.fridge,
      { hard: true, ...whiteMat, gloss: .30, tag: '冰箱' });
  box(5.62, Y + .045, FZ, .66, .09, .76, K.fridge,
      { hard: true, ...whiteMat, gloss: .30, tag: '冰箱' });
  box(5.91, Y + .88, FZ, .020, 1.58, .66, K.fridgeIn,
      { hard: true, ...whiteMat, gloss: .22, tag: '冰箱' });
  for (const h of [.47, .84, 1.16])
    box(5.61, Y + h, FZ, .57, .025, .65, K.glass,
        { hard: true, alpha: .62, gloss: .66, tag: '冰箱' });
  // Food visible through the open door: eggs, greens, milk and yesterday's takeaway box.
  box(5.58, Y + .55, FZ + .18, .16, .28, .13, K.white, { hard: true, gloss: .24, tag: '冰箱' });
  box(5.58, Y + .67, FZ + .18, .17, .06, .14, K.blue, { hard: true, gloss: .28, tag: '冰箱' });
  for (let i = 0; i < 6; i++)
    ball(5.54, Y + .91, FZ - .22 + (i % 3) * .10, .040, .050, .040,
         K.garlic, { gloss: .26, tag: '冰箱' });
  for (let i = 0; i < 4; i++)
    cap(5.58, Y + 1.26 + i * .018, FZ + .19 - i * .06, .035, .23, .035,
        i % 2 ? K.green : C('#78a157'), { rz: PI / 2, ry: .25, gloss: .20, tag: '冰箱' });

  // -------------------------------------------------------------------------- 微波炉 microwave
  // On the fridge, which is where it goes in a flat with 2.3 m of worktop and a hob, a board, a
  // rice cooker and a sink already on it. The counter run is full — measured, not assumed: 案板 at
  // x 3.445..3.875, the hob from 4.10, 电饭煲 .352 wide at 5.20, and the corner at 5.35 is reserved
  // for `A.bagSpot`. The fridge lid at Y + 1.78 is 0.66 x 0.76 of clear top and it is the one
  // surface in this kitchen nothing else wants.
  //
  // It faces west, the way the fridge under it does, into the room's clear lane. Five props: box,
  // door glass, handle, panel, one lit digit strip. No collider — nothing at 1.9 m is in the body's
  // way, and A.stop is a 2D footprint that would fence off the fridge you have to open.
  const MWY = Y + FH + .145, MWZ = FZ - .04;
  box(5.62, MWY, MWZ, .62, .29, .44, K.white, { hard: true, ...whiteMat, gloss: .34, tag: '微波炉' });
  box(5.315, MWY + .01, MWZ - .06, .012, .21, .27, K.glass,
      { hard: true, alpha: .55, gloss: .70, tag: '微波炉' });
  box(5.312, MWY - .01, MWZ + .155, .016, .17, .022, K.steelD,
      { hard: true, ...metalMat, gloss: .52, tag: '微波炉' });
  box(5.313, MWY + .075, MWZ + .11, .010, .045, .10, C('#22282c'),
      { hard: true, mode: 1, glow: .07, tag: '微波炉' });
  A.glyph(5.306, MWY + .075, MWZ + .11, -PI / 2, '八分', { size: .026, color: C('#ff9a4a') });
  TH('微波炉', 5.30, MWY, MWZ, '微波炉放在冰箱上面。', 'The microwave sits on top of the fridge.',
     '微波 microwave + 炉 stove. 热一下 is to warm something up in it.', 4.62, FZ);
  box(5.57, Y + .30, FZ - .12, .24, .12, .27, K.red, { hard: true, gloss: .24, tag: '冰箱' });

  const fridgeDoors = [];
  const fridgePanel = (cy, h) => {
    fridgeDoors.push(box(FF, Y + cy, FZ, .055, h, .72, K.fridge,
      { hard: true, ...whiteMat, gloss: .40, tag: '冰箱' }));
    fridgeDoors.push(box(FF - .032, Y + cy, FZ, .012, h - .08, .64, C('#bfc5bd'),
      { hard: true, ...whiteMat, gloss: .32, tag: '冰箱' }));
  };
  fridgePanel(.48, .86); fridgePanel(1.34, .82);
  for (const h of [.48, 1.34])
    fridgeDoors.push(cap(FF - .055, Y + h, FZ + .25, .025, .36, .025, K.steelD,
      { rz: PI / 2, ...metalMat, gloss: .64, tag: '冰箱' }));
  // A red 福 magnet and a shopping list make this somebody's refrigerator, not an appliance shop.
  fridgeDoors.push(box(FF - .066, Y + 1.46, FZ - .12, .012, .22, .20, K.red,
    { hard: true, gloss: .20, tag: '冰箱' }));
  fridgeDoors.push(...[].concat(glyph(FF - .075, Y + 1.46, FZ - .12, -PI / 2, '福',
    { size: .095, color: K.warm, lift: .004, tag: '冰箱' }) || []));
  fridgeDoors.push(box(FF - .068, Y + 1.13, FZ + .11, .010, .28, .20, K.paper,
    { hard: true, gloss: .12, ry: -.05, tag: '冰箱' }));
  if (A.mover && M && M.mul)
    A.mover('fridge', fridgeDoors, v => hinge(FF, FZ - .36, -1.12 * v));
  stop(5.20, 6.00, -2.99, -2.18);
  shade(FX, FZ, .84, .92, .39);

  // -------------------------------------------------------------------------- 水池 sink
  // A dark inset, bright steel rim and high-arc mixer read clearly from the doorway.  Dirty bowls
  // disappear after 洗碗; running water is the existing `tapK` fader.
  const SX = 5.60, SZ = -3.51;
  box(SX, top + .006, SZ, .47, .030, .59, K.steelD, { hard: true, ...metalMat, tag: '水池' });
  box(SX, top + .016, SZ, .38, .026, .49, C('#4c5a63'),
      { hard: true, ...metalMat, gloss: .58, tag: '水池' });
  for (const [x, z, w, d] of [[SX-.22,SZ,.035,.58],[SX+.22,SZ,.035,.58],
                               [SX,SZ-.275,.47,.035],[SX,SZ+.275,.47,.035]])
    box(x, top + .035, z, w, .032, d, K.chrome, { hard: true, ...metalMat, tag: '水池' });
  // The mixer stays near-polished: chrome is the one fitting in here that should not read as
  // brushed, so it takes the normal map for the highlight roll-off and almost none of the colour.
  cyl(5.82, top + .16, SZ + .20, .024, .31, K.chrome,
      { ...metalMat, matAmt: .09, gloss: .72, tag: '水池' });
  cap(5.70, top + .29, SZ + .20, .020, .28, .020, K.chrome,
      { rz: PI / 2, ...metalMat, matAmt: .09, gloss: .72, tag: '水池' });
  cap(5.57, top + .225, SZ + .20, .018, .15, .018, K.chrome,
      { ...metalMat, matAmt: .09, gloss: .72, tag: '水池' });
  for (const s of [-1, 1])
    cyl(5.79, top + .055, SZ + .20 + s * .10, .035, .035, s < 0 ? K.red : K.blue,
        { gloss: .50, tag: '水池' });
  const water = [
    cyl(5.57, top + .11, SZ + .20, .013, .22, K.water,
      { hard: true, mode: 1, alpha: .50, glow: .04, tag: '水池' }),
    cyl(5.57, top + .020, SZ + .20, .075, .012, K.water,
      { hard: true, mode: 1, alpha: .38, glow: .03, tag: '水池' }),
  ];
  if (A.fader) A.fader('tapK', water, .58);

  const dishes = [];
  for (const [x, z, r, c] of [[5.54,SZ-.10,.12,K.porcelain],[5.63,SZ+.06,.105,K.white]]) {
    dishes.push(taper(x, top + .055, z, r * 2, .075, r * 2, c,
      { rx: PI, gloss: .38, tag: '水池' }));
    dishes.push(cyl(x, top + .088, z, r, .016, K.blue, { gloss: .40, tag: '水池' }));
  }
  dishes.push(cap(5.49, top + .10, SZ + .10, .010, .25, .010, K.bamboo,
    { rz: PI / 2, ry: .4, gloss: .20, tag: '水池' }));
  if (A.mover && M && M.trans)
    A.mover('dishes', dishes, v => M.trans(0, -.50 * (1 - v), 0));
  // Detergent and a steel-wire scrubber beside the basin.
  cyl(5.72, top + .075, SZ - .38, .045, .15, K.green, { gloss: .42, tag: '水池' });
  taper(5.72, top + .16, SZ - .38, .085, .035, .085, K.green, { gloss: .38, tag: '水池' });
  ball(5.56, top + .04, SZ - .40, .060, .035, .060, K.steelD,
       { ...metalMat, gloss: .60, tag: '水池' });

  // -------------------------------------------------------------------------- 灶台 gas hob
  const HX = 4.40, HZ = -4.60;
  box(HX, top + .010, HZ, .94, .035, .52, K.black,
      { hard: true, gloss: .62, tag: '灶台' });
  const flames = [];
  for (const bx of [HX - .24, HX + .24]) {
    cyl(bx, top + .036, HZ, .105, .024, K.iron, { gloss: .30, tag: '灶台' });
    for (let i = 0; i < 6; i++) {
      const a = i * PI / 3;
      box(bx + Math.cos(a) * .115, top + .046, HZ + Math.sin(a) * .115,
          .085, .024, .030, K.iron, { hard: true, ry: -a, gloss: .26, tag: '灶台' });
      flames.push(cap(bx + Math.cos(a) * .070, top + .065, HZ + Math.sin(a) * .070,
        .010, .055, .010, K.flame,
        { mode: 1, glow: .17, rz: Math.cos(a) * .28, rx: -Math.sin(a) * .28, tag: '火' }));
      flames.push(cap(bx + Math.cos(a) * .070, top + .082, HZ + Math.sin(a) * .070,
        .007, .032, .007, K.flameHot,
        { mode: 1, glow: .21, rz: Math.cos(a) * .30, rx: -Math.sin(a) * .30, tag: '火' }));
    }
  }
  for (let i = 0; i < 3; i++)
    cyl(HX - .24 + i * .24, top + .025, HZ + .285, .030, .030, K.steelD,
      { gloss: .58, tag: '灶台' });
  if (A.emitter) A.emitter('burner', flames, .08);

  // 炒锅 on the left ring — seasoned black iron, one wooden handle and a steel wok spatula.
  const WX = HX - .24;
  // A real pan instead of two stacked tapers. The mesh is a stainless wok, but it is tinted with
  // K.iron and left at low gloss on purpose: a Chinese home kitchen cooks in a seasoned black
  // 铁锅, not a shiny Western one, and the model carries no texture to fight the tint. Better
  // silhouette, same material reading as before.
  //
  // Scaled .92 so the pan reads .42 across as the old taper did. At 1.0 the handles span .617 and
  // reach x 4.47, which is inside the soup pot's .154 radius at PX 4.64. The lid is a separate
  // manifest entry and is deliberately not placed: the spatula below rests in the open pan.
  model('wok', WX, top + .05, HZ, .92, { color: K.iron, gloss: .30, tag: '炒锅' });
  box(WX + .02, top + .13, HZ, .12, .012, .10, K.steel,
      { hard: true, ...metalMat, gloss: .65, ry: .6, tag: '炒锅' });
  cap(WX + .19, top + .23, HZ + .12, .014, .34, .014, K.woodD,
      { rz: -.65, rx: .25, ...woodFine, gloss: .20, tag: '炒锅' });

  // A lidded soup pot on the second burner supplies the steam and rattling `potlid` fixtures used
  // during 做饭.  It is separate from the wok, as it would be in a working home kitchen.
  const PX = HX + .24;
  cyl(PX, top + .14, HZ, .145, .22, K.steel, { ...metalMat, tag: '锅' });
  cyl(PX, top + .255, HZ, .154, .025, K.steelD, { ...metalMat, gloss: .58, tag: '锅' });
  for (const s of [-1, 1])
    box(PX + s * .175, top + .17, HZ, .09, .038, .075, K.black,
      { hard: true, gloss: .30, tag: '锅' });
  const potLid = [
    taper(PX, top + .278, HZ, .29, .055, .29, K.steel,
      { ...metalMat, gloss: .60, tag: '锅' }),
    ball(PX, top + .332, HZ, .035, .025, .035, K.black, { gloss: .34, tag: '锅' }),
  ];
  if (A.mover && M && M.trans)
    A.mover('potlid', potLid, v => M.trans(0, .055 * v, 0));
  if (A.steam) A.steam('pot', [PX, top + .33, HZ], 6, .060, .48);

  // -------------------------------------------------------------------------- 抽油烟机 hood
  const EY = Y + 1.67;
  box(HX, EY + .22, -4.76, 1.18, .44, .40, K.steel,
      { hard: true, ...metalMat, tag: '抽油烟机' });
  taper(HX, EY - .02, -4.64, 1.12, .20, .55, K.steel,
      { rx: PI, gloss: .52, ...metalMat, tag: '抽油烟机' });
  for (const s of [-1, 1])
    box(HX + s * .26, EY - .015, -4.51, .48, .018, .30, K.steelD,
      { hard: true, ...metalMat, gloss: .45, rx: s * .10, tag: '抽油烟机' });
  box(HX, EY - .10, -4.48, .58, .026, .055, K.warm,
      { hard: true, mode: 1, glow: .12, tag: '抽油烟机' });
  box(HX, Y + 2.31, -4.82, .36, .42, .24, K.steelD,
      { hard: true, ...metalMat, gloss: .48, tag: '抽油烟机' });
  for (let i = 0; i < 4; i++)
    box(HX - .28 + i * .18, EY + .13, -4.548, .12, .055, .020,
      i === 0 ? K.red : K.black, { hard: true, gloss: .45, tag: '抽油烟机' });

  // The impeller, and it turns.  APARTMENT.md:124 gives wok smoke as the reason this kitchen is
  // behind a door at all, and the hood that answers for it was a static box.  Six blades on a hub
  // set back inside the canopy, so what you see through the grille is movement rather than a fan.
  //
  // Registered as a mover, which is the whole of the frame-rate argument: `parts` are only
  // recomputed when game.js calls `World.setPart`, so an extractor nobody has switched on costs
  // one array entry and zero per-frame work — and one in a kitchen across the building costs the
  // same.  Drive it with a rising value while the hob is lit; the matrix turns ten times a unit.
  const hoodFan = [
    cyl(HX, EY + .02, -4.70, .052, .075, K.steelD, { ...metalMat, rx: PI / 2, gloss: .50,
      tag: '抽油烟机' }),
  ];
  for (let i = 0; i < 6; i++)
    hoodFan.push(box(HX + Math.cos(i * PI / 3) * .105, EY + .02 + Math.sin(i * PI / 3) * .105,
      -4.70, .190, .052, .012, K.steel,
      { hard: true, ...metalMat, gloss: .44, rz: i * PI / 3 + .55, tag: '抽油烟机' }));
  // Spinning about z, not y: the impeller faces the room, so its axis is the one `hinge` does not
  // give.  Same pivot-sandwich shape, built inline.
  if (A.mover && M && M.mul && M.rotZ)
    A.mover('hoodFan', hoodFan, v => M.mul(M.trans(HX, EY + .02, -4.70),
      M.mul(M.rotZ(v * 62.83), M.trans(-HX, -(EY + .02), 4.70))));

  // -------------------------------------------------------------------------- 煤气罐 the cylinder
  // What a Beijing wok burner actually runs on.  Without it the hob reads as an induction plate,
  // which is the one thing this kitchen must not be — the whole 火 / 炒锅 / 抽油烟机 chain in here
  // depends on a flame.  Stood at the end of the run with its regulator and a hose to the hob,
  // which is where it goes when the under-hob cupboard is full of everything else.
  //
  // No `A.stop` on either this or the bin below, and that is measured rather than lazy: the
  // counter's own collider already denies the body everything south of z -4.01 once clampMove
  // inflates it, so a collider here could only take floor from the walking lane west of x 3.10 —
  // and this kitchen has 4.1 m² of standable floor to lose it from.
  const GBX = 3.18, GBZ = -4.72;
  cyl(GBX, Y + .295, GBZ, .145, .55, K.steel, { ...metalMat, gloss: .30, tag: '灶台' });
  cyl(GBX, Y + .578, GBZ, .148, .022, K.steelD, { ...metalMat, gloss: .40, tag: '灶台' });
  cyl(GBX, Y + .625, GBZ, .052, .075, K.steelD, { ...metalMat, gloss: .46, tag: '灶台' });
  box(GBX, Y + .672, GBZ, .130, .055, .095, K.red, { hard: true, gloss: .34, tag: '灶台' });
  box(GBX, Y + .030, GBZ, .310, .030, .310, K.steelD, { hard: true, gloss: .22, tag: '灶台' });
  for (let i = 0; i < 5; i++)
    cyl(GBX + .10 + i * .22, Y + .70 - Math.sin(i * .7) * .05, GBZ + .04, .014, .24,
      K.black, { rz: PI / 2 + (i - 2) * .06, gloss: .26, tag: '灶台' });

  // -------------------------------------------------------------------------- 垃圾桶 the bin
  // A kitchen with a chopping board, a cleaver and a head of garlic and no bin was the single
  // most obvious absence in the room.  Pedal lid, because that is what stands next to a Chinese
  // kitchen counter, and it sits in the strip the counter's inflated collider already owns.
  const BNX = 3.16, BNZ = -4.18;
  cyl(BNX, Y + .155, BNZ, .140, .31, K.cabinetD, { ...woodC, gloss: .26, tag: '垃圾桶' });
  cyl(BNX, Y + .318, BNZ, .146, .028, K.steelD, { ...metalMat, gloss: .44, tag: '垃圾桶' });
  taper(BNX, Y + .348, BNZ, .284, .040, .284, K.steelD,
    { ...metalMat, gloss: .46, tag: '垃圾桶' });
  cap(BNX - .148, Y + .16, BNZ, .014, .30, .014, K.steelD,
    { ...metalMat, gloss: .40, tag: '垃圾桶' });
  box(BNX - .148, Y + .022, BNZ, .11, .020, .075, K.steelD,
    { hard: true, ...metalMat, gloss: .40, tag: '垃圾桶' });
  // The liner, showing at the lip the way one always does.
  cyl(BNX, Y + .345, BNZ, .132, .055, C('#4a5856'), { mode: 7, gloss: .12, tag: '垃圾桶' });
  shade(BNX, BNZ, .34, .34, .30);

  // -------------------------------------------------------------------------- 碗架 the dish rack
  // Bowls and chopsticks are stored below and there was nowhere for the washed ones.  Wall-hung
  // over the draining board with a drip tray under it, which is the standard fitting here and the
  // reason a Chinese kitchen needs no tea towel.  It is at 1.50 m, clear of every body position.
  box(5.86, Y + 1.50, -3.30, .250, .560, .620, K.steelD,
    { hard: true, ...metalMat, gloss: .38, tag: '厨房碗' });
  // Three wires, not fifteen. A rack read from two metres across a 3.8 m kitchen resolves as a
  // banded surface either way, and this is the prop that would otherwise be the single heaviest
  // thing added to this room — the frame budget's rule about LOD-gating anything repeated applies
  // to the count before it applies to the distance.
  for (const zz of [-3.56, -3.30, -3.04])
    cap(5.80, Y + 1.36, zz, .009, .215, .009,
      K.chrome || K.steel, { rx: PI / 2, ...metalMat, gloss: .55, tag: '厨房碗' });
  for (let i = 0; i < 4; i++)
    cyl(5.80, Y + 1.40, -3.52 + i * .145, .066, .058, K.white,
      { rx: PI / 2, gloss: .34, tag: '厨房碗' });
  box(5.86, Y + 1.20, -3.30, .240, .018, .600, K.steel,
    { hard: true, ...metalMat, gloss: .40, tag: '厨房碗' });

  // -------------------------------------------------------------------------- 厨房门 the door
  // js/home-walls.js:196 chose holes over doors for the whole flat and APARTMENT.md:124 says this
  // is the one room that must close: the point of putting a kitchen behind a wall here is the wok
  // smoke, and a hole in a wall does not hold smoke.
  //
  // The opening is x 3.20..4.20 — 1.00, and it got there in two steps that are worth recording
  // because the second is the non-obvious one.  It was 0.80, which .flatcheck.js's clearance rule
  // rejects outright: clampMove inflates each jamb by the 0.30 body radius, so 0.80 leaves a 0.20 m
  // run of legal body centres and the harness samples on a 0.10 m lattice, which can only resolve
  // that run if a cell happens to land in the middle of it.  Widening to 0.90 gave a 0.30 run and
  // fixed three of the five sealed rooms — and this one and the 餐厅 behind it STILL read zero,
  // because a 0.30 run has the lattice landing exactly on both its edges and the pass depends on
  // float equality at the boundary.  1.00 gives 0.40, which clears the lattice by a full step at
  // both ends and is decided by the building rather than by rounding.
  //
  // Built OPEN and folded FLAT back against the kitchen face of the wall, covering x 4.20..5.20 at
  // z -2.271.  It was briefly built square open into the room instead, and the audit render is
  // what threw that out: `.audit-14-kitchen.png` stands the lens in the doorway lane at x 3.72 and
  // a leaf sticking a metre into a galley kitchen filled half the frame and hid the hob, the rice
  // cooker and the whole east run behind it.  A door you have to see past is worse than no door.
  //
  // Flat is clear, checked against all three of this room's colliders: the counter stops at
  // z -4.31, the east run starts at x 5.28, and the fridge geometry's front face is at FF 5.285
  // with its collider padded to 5.20 — so a leaf ending at 5.20 clears the box it is next to by
  // 0.085 and touches the collider's edge without entering it.  It also intrudes nothing on the
  // body's slot through the doorway, x 3.50..3.90, being a metre east of it.
  //
  // The mover swings it through π about the hinge at x 4.20, so v = 0 is open and v = 1 is shut,
  // and its collider starts `open` so an undriven door can never seal the room.  That is note 4 at
  // the head of js/home-walls.js: an open leaf's collider once flood-filled the 次卧 to zero, and
  // that same leaf's collider was still pinching it this wave.
  const kitchenDoor = [];
  kitchenDoor.push(box(4.70, Y + 1.015, -2.271, 1.000, 2.03, .042, K.cabinet,
    { hard: true, ...woodC, gloss: .30, tag: '厨房门' }));
  for (const s of [-1, 1])
    kitchenDoor.push(box(4.70, Y + 1.015 + s * .497, -2.289, .840, .690, .014, K.cabinetD,
      { hard: true, ...woodC, gloss: .26, tag: '厨房门' }));
  kitchenDoor.push(cyl(5.11, Y + 1.03, -2.303, .017, .10, K.steelD,
    { rx: PI / 2, ...metalMat, gloss: .52, tag: '厨房门' }));
  const kitchenDoorStop = stop(3.20, 4.20, -2.31, -2.23);
  if (kitchenDoorStop) kitchenDoorStop.open = true;
  if (A.mover && M && M.mul)
    A.mover('kitchenDoor', kitchenDoor, v => hinge(4.20, -2.271, PI * v));
  FlatFit['kitchen'].door = { leaf: kitchenDoor, stop: kitchenDoorStop, hinge: [4.20, -2.271] };

  // -------------------------------------------------------------------------- 电饭煲 rice cooker
  // A real 电压力锅 mesh rather than five primitives. Its control panel is a texture with legible
  // Chinese on it (排骨, 白米粥, 杂粮饭, 美汤), which is why it faces the room and not the tiles:
  // a player who can read it learns something a player who cannot does not, and that is the
  // whole point of putting Chinese on a surface instead of in a flashcard.
  //
  // RX moved 5.14 -> 5.20. The mesh is .352 wide against the old taper's .27, and the oil bottle
  // at x 4.88 .. 4.98 was inside the difference. Measured, not eyeballed.
  const RX = 5.20, RZ = -4.56;
  model('rice_cooker', RX, top, RZ, 1, { gloss: .34, tag: '电饭煲' });
  // The indicator keeps its own primitive: the mesh has a painted panel but nothing that lights,
  // and this is the only part of the cooker that changes state.
  box(RX - .035, top + .105, RZ + .158, .027, .018, .008, K.red,
      { hard: true, mode: 1, glow: .14, tag: '电饭煲' });

  // -------------------------------------------------------------------------- prep and clutter
  // A thick wooden 案板 with a Chinese cleaver; both sit well away from the active rings.
  const BX = 3.66, BZ = -4.55;
  box(BX, top + .045, BZ, .43, .085, .34, K.wood,
      { hard: true, ...woodMat, tag: '案板' });
  for (const off of [-.10, -.025, .06])
    box(BX + off, top + .090, BZ, .006, .005, .27, K.woodD,
      { hard: true, ry: .25, tag: '案板' });
  box(BX - .02, top + .125, BZ + .02, .24, .11, .018, K.steel,
      { hard: true, ...metalMat, ry: -.18, tag: '菜刀' });
  cap(BX + .17, top + .13, BZ - .02, .020, .18, .020, K.woodD,
      { rz: PI / 2, ry: -.18, ...woodFine, gloss: .20, tag: '菜刀' });

  // Oil and soy always live beside the hob.  Their distinct necks and labels stop them reading as
  // decorative cylinders, and teach the high-frequency cooking word 油.
  cyl(4.93, top + .12, -4.76, .050, .24, K.oil, { alpha: .82, gloss: .62, tag: '油' });
  taper(4.93, top + .265, -4.76, .095, .05, .095, K.oil, { alpha: .82, gloss: .62, tag: '油' });
  cyl(4.93, top + .31, -4.76, .023, .06, K.red, { gloss: .44, tag: '油' });
  cyl(4.81, top + .13, -4.77, .044, .26, K.soy, { gloss: .50 });
  taper(4.81, top + .285, -4.77, .084, .05, .084, K.soy, { gloss: .50 });
  cyl(4.81, top + .33, -4.77, .022, .06, K.redD, { gloss: .42 });

  // Condiment jars and a narrow shelf over the sink.
  box(5.82, Y + 1.46, -3.77, .20, .035, .96, K.steelD,
      { hard: true, ...metalMat, gloss: .54 });
  for (let i = 0; i < 4; i++) {
    const z = -4.04 + i * .22;
    cyl(5.77, Y + 1.55, z, .070, .16, i % 2 ? K.paper : K.glass,
      { alpha: i % 2 ? 1 : .72, gloss: .40 });
    cyl(5.77, Y + 1.64, z, .074, .025, i === 2 ? K.red : K.steelD, { gloss: .46 });
  }

  // Garlic and dried chillies hang from the south-wall rail — storage where a Chinese kitchen
  // actually has it, and colour in an otherwise cream-and-steel room.
  cyl(3.72, Y + 1.62, -4.885, .018, .76, K.steelD,
      { rz: PI / 2, ...metalMat, gloss: .58, tag: '辣椒' });
  for (let i = 0; i < 6; i++) {
    const x = 3.48 + i * .085;
    cap(x, Y + 1.38 - i * .025, -4.84, .027, .16, .027, K.chilli,
      { rz: .25 - i * .08, gloss: .25, tag: '辣椒' });
  }
  for (let i = 0; i < 5; i++) {
    const x = 3.89 + (i % 3) * .065, y = Y + 1.41 - Math.floor(i / 3) * .09;
    ball(x, y, -4.84, .050, .057, .050, K.garlic, { gloss: .22, tag: '蒜' });
    cap(x, y + .12, -4.845, .009, .18, .009, K.green,
      { rz: (i - 2) * .10, gloss: .18, tag: '蒜' });
  }

  // Dish rack on the draining board: four bowls, plates and chopsticks, all compact enough to
  // leave the corner counter available as the takeaway-bag spot.
  box(5.57, top + .035, -4.15, .40, .035, .35, K.steelD,
      { hard: true, ...metalMat, gloss: .55, tag: '厨房碗' });
  for (let i = 0; i < 4; i++)
    taper(5.47 + i * .07, top + .115, -4.15, .16, .075, .16,
      i % 2 ? K.white : K.porcelain, { rz: PI / 2, gloss: .38, tag: '厨房碗' });
  for (let i = 0; i < 4; i++)
    cap(5.72 + (i % 2) * .018, top + .14, -4.19 + i * .030, .006, .24, .006,
      K.bamboo, { rz: .25, rx: -.08, gloss: .20, tag: '筷子' });

  // A frosted transom over the sink and a bright ceiling fitting keep the narrow galley light.
  box(5.93, Y + 2.04, -3.55, .040, .76, 1.00, K.lit,
      { hard: true, ...whiteMat, gloss: .24 });
  box(5.905, Y + 2.04, -3.55, .018, .63, .86, K.glass,
      { hard: true, alpha: .62, gloss: .70 });
  for (const z of [-3.94, -3.16])
    box(5.89, Y + 2.04, z, .025, .66, .035, K.steelD,
        { hard: true, ...metalMat, gloss: .52 });
  box(4.68, Y + 2.50, -3.62, .86, .045, .28, K.lit,
      { hard: true, mode: 1, glow: .17, tag: '厨房灯' });
  A.light(4.68, Y + 2.42, -3.62, [1.0, .91, .76], .50, 3.0);

  // -------------------------------------------------------------------------- contact shadows
  // The three floor-standing volumes (both fitted runs and the refrigerator) were already
  // grounded further up.  Nothing standing on the worktop was, and at this camera height the
  // worktop fills more of the frame than the floor does: the hob, the rice cooker and the
  // chopping board all read as decals floating on grey until they darken the surface under
  // themselves.  `A.shade` takes an explicit y, so the same helper works on a counter as on a
  // floor — the worktop's upper face is exactly `top`, and .003 clears it without z-fighting.
  const CS = top + .003;
  shade(HX, HZ, 1.02, .60, .30, CS);                 // 灶台, the hob's enamelled surround
  shade(RX, RZ, .37, .34, .32, CS);                  // 电饭煲, .352 x .318 x .300 mesh
  shade(BX, BZ, .50, .41, .28, CS);                  // 案板
  shade(5.57, -4.15, .47, .42, .26, CS);             // the draining rack
  shade(4.87, -4.765, .30, .17, .26, CS);            // 油 and the soy bottle, as one pair
  shade(5.72, SZ - .38, .17, .17, .24, CS);          // detergent
  shade(5.56, SZ - .40, .15, .15, .22, CS);          // the wire scrubber
  // The wok and the soup pot are deliberately NOT shaded here.  Both stand on the burner grates
  // with a real 2 cm air gap under them, so a contact shadow tight to their bases would be a
  // lie — what grounds those two is the hob shadow above, which they sit inside.

  // -------------------------------------------------------------------------- interactables
  // Every headword below already exists in vocab.js.  The three gameplay-bearing labels are
  // first: 冰箱 consumes/stows meals, 厨房 cooks, and 水池 washes hands or dirty bowls.
  TH('冰箱', FF - .08, Y + 1.36, FZ,
    '冰箱里有鸡蛋、青菜和昨天的剩菜。',
    'There are eggs, greens and yesterday\'s leftovers in the fridge.',
    '冰箱 bīngxiāng — literally an “ice cabinet.” Open it to eat or put away a delivery.',
    4.72, FZ, 1.60);
  TH('厨房', 4.58, Y + 1.36, -4.44,
    '厨房不大，可是炒菜、煮饭都够用。',
    'The kitchen is small, but it is enough for stir-frying and cooking rice.',
    '厨房 chúfáng. Chinese kitchens are usually enclosed because wok cooking makes smoke.',
    4.48, -3.83, 1.75);
  TH('水池', SX - .17, Y + 1.20, SZ,
    '水池里还有两个脏碗。', 'There are still two dirty bowls in the sink.',
    '水池 shuǐchí — the kitchen sink. 洗碗 means to wash the dishes.',
    4.86, SZ, 1.60);

  TH('灶台', HX, top + .18, HZ,
    '灶台上有两个燃气火眼。', 'There are two gas burners on the hob.',
    '灶台 zàotái — 灶 is the stove and 台 is its raised work surface. It runs on the 煤气罐 ' +
    'standing at the end of the counter: 煤气 town gas + 罐 cylinder, and 液化气 is what is in it.',
    HX, -4.02, 1.45);
  TH('火', HX + .24, top + .16, HZ,
    '做饭以后一定要关火。', 'Always turn off the flame after cooking.',
    '火 huǒ is fire. 开火 starts the burner; 关火 turns it off.',
    HX, -4.02, 1.45);
  TH('炒锅', WX, top + .28, HZ,
    '炒锅已经烧热了，可以下菜。', 'The wok is hot and ready for the ingredients.',
    '炒锅 chǎoguō — 炒 is quick, high-heat stir-frying; 锅 is the pan.',
    HX, -4.02, 1.50);
  TH('锅', PX, top + .38, HZ,
    '锅里正煮着汤。', 'Soup is simmering in the pot.',
    '锅 guō is the general word for a pot or pan.',
    HX, -4.02, 1.50);
  TH('抽油烟机', HX, EY + .18, -4.55,
    '炒菜以前先开抽油烟机。', 'Turn on the extractor before stir-frying.',
    '抽 oil/smoke + 油烟 cooking fumes + 机 machine: the range hood.',
    HX, -3.92, 1.75);
  TH('电饭煲', RX, top + .36, RZ,
    '电饭煲正在保温。', 'The rice cooker is keeping the rice warm.',
    '电饭煲 diànfànbāo cooks rice, then spends most of the day on 保温, keep warm.',
    RX, -4.00, 1.40);
  TH('案板', BX, top + .16, BZ,
    '案板上还留着切菜的刀印。', 'Knife marks remain on the chopping board.',
    '案板 ànbǎn is the chopping board; 切菜 is to chop vegetables.',
    BX, -3.95, 1.35);
  TH('菜刀', BX - .02, top + .24, BZ,
    '这把菜刀又宽又重。', 'This kitchen cleaver is broad and heavy.',
    '菜刀 càidāo — vegetable knife, the rectangular cleaver used for nearly everything.',
    BX, -3.95, 1.35);
  TH('油', 4.93, top + .38, -4.76,
    '炒菜先放一点儿油。', 'Add a little oil before stir-frying.',
    '油 yóu is cooking oil; 加油 also means “keep going!”',
    4.88, -4.02, 1.40);
  TH('辣椒', 3.67, Y + 1.50, -4.83,
    '一串干辣椒挂在墙上。', 'A string of dried chillies hangs on the wall.',
    '辣椒 làjiāo — chilli pepper. 辣 is spicy-hot.',
    3.72, -4.05, 1.50);
  TH('蒜', 3.95, Y + 1.49, -4.83,
    '蒜挂起来以后不容易受潮。', 'Hanging the garlic keeps it from getting damp.',
    '蒜 suàn is garlic; 一头蒜 is a whole bulb.',
    3.95, -4.05, 1.50);
  TH('碗', 5.53, top + .24, -4.15,
    '洗好的碗放在沥水架上。', 'The clean bowls are on the draining rack.',
    '碗 wǎn is a bowl; 一摞碗 is a stack of bowls. The rack over the draining board is a ' +
    '碗架 wǎnjià — 架 is any frame you stand things on, the same 架 as in 书架 and 晾衣架.',
    4.87, -4.13, 1.45);
  TH('筷子', 5.73, top + .29, -4.15,
    '筷子洗好以后要晾干。', 'Chopsticks need to dry after washing.',
    '筷子 kuàizi use the measure word 双: 一双筷子, one pair.',
    4.87, -4.13, 1.50);
  TH('灯', 4.68, Y + 2.54, -3.62,
    '厨房的灯很亮，切菜的时候看得清楚。', 'The kitchen light is bright enough to chop safely.',
    '灯 dēng is a light or lamp; 开灯 turns it on and 关灯 turns it off.',
    4.45, -3.32, 2.15);

  if (A.bagSpot)
    A.bagSpot('厨房', 'chúfáng', 'the kitchen counter', 5.35, top + .05, -4.27);
};
