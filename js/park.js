// 公园 — the neighbourhood park, two stops down the line.
//
// Not a garden and not a wilderness: a Chinese city park is a piece of civic equipment, and it is
// busy from six in the morning. A paved plaza with a speaker on it and a dozen 大妈 dancing to it,
// a row of primary-coloured exercise machines nobody under sixty uses, a lake with a stone bridge
// over its waist, willows along the water, a pavilion to sit in out of the sun, and old men doing
// 太极 under the trees. The word this place teaches is 锻炼 — to take exercise — because that is
// what everyone here is doing, including the ones sitting down.
//
// Outdoors, so no room shell and no window: the renderer puts a sky dome over it and takes the
// sun off the clock, the same way it does the hutong.
const Park = Lazy('Park', () => {
  const col = {
    // Warmer and a shade duller than the acid green it was. Under this renderer's one directional
    // light a lawn at #5c7442 came back as a billiard table lit by a photographic flash; the park
    // wants late-summer北京 turf, which is olive with the yellow of a dry month in it.
    grass: C('#586c3d'), grassD: C('#465831'), grassL: C('#6a7e48'),
    // The worn verge where a lawn meets a path and everybody has cut the corner. Laid as a thin
    // band down each side of the paving it does more for a path than any amount of kerb detail.
    verge: C('#6d6c4d'),
    path: C('#9d9689'), pathD: C('#847d71'), paveR: C('#a2705a'), kerb: C('#b0aaa0'),
    // Granite: what every kerb, coping and step in a Chinese park is actually cut from, and
    // greyer and colder than the buff paving it edges. That contrast is most of what makes a path
    // read as built rather than painted onto the grass.
    gran: C('#8d8a85'), granD: C('#68665f'), granL: C('#a5a29a'),
    stone: C('#918c83'), stoneD: C('#6f6a62'), stoneL: C('#a8a29a'),
    // Green-brown, not blue-grey. A city lake in Beijing is silty and full of algae; at #3d565c
    // this one came back off the render as a pale slate sheet, which is a municipal swimming pool
    // no matter what shape you cut the outline. The darker base also lets mode 16's grazing sky
    // term do the work — from a standing eye most of the surface is sky anyway.
    water: C('#354c44'), waterD: C('#293b37'), waterL: C('#456254'),
    trunk: C('#5b4a38'), trunkL: C('#74604a'),
    leaf: C('#4f7a3c'), leafD: C('#3c6130'), leafL: C('#6b9450'),
    leafM: C('#5c8742'), leafU: C('#2c4a24'),
    // The clipped box of the hedge and the shrub layer under the trees. Duller and bluer than a
    // tree's own leaf on purpose: mode 15 tints every cluster by its position and pushes it warm,
    // and at the tree greens the whole boundary came back as a wall of bright plastic.
    box1: C('#41593a'), box2: C('#4c6740'), box3: C('#334730'),
    // Waterside planting. Reeds are the yellow-green of a grass, not the blue-green of a leaf.
    reed: C('#7f8e4e'), reedD: C('#61713a'), lily: C('#4a7040'),
    willow: C('#6d8f45'), willowL: C('#83a656'),
    red: C('#a8372a'), redD: C('#7f2a20'), redL: C('#c04b34'),
    // 彩画 the painted banding on the beams under a pavilion eave — cobalt, malachite and a chalky
    // white edge. It is the one detail that separates a Chinese pavilion from a bandstand, and it
    // costs three colours and a row of boxes.
    caiB: C('#2c5f8e'), caiG: C('#2e6b57'), caiW: C('#dad4c4'),
    gold: C('#c9992f'), goldL: C('#e0b850'), cream: C('#e6dcc6'),
    tileR: C('#6b7075'), tileRD: C('#565b60'), tileRL: C('#7e848b'),
    steel: C('#a7adb2'), steelD: C('#7b8288'), white: C('#eceae2'),
    // Park ironwork is painted, never bare: bottle green on the railings, the bins and the
    // lamp columns, which is the standard municipal colour and reads warmer than charcoal.
    iron: C('#2f4238'), ironL: C('#3e5445'),
    charcoal: C('#33383d'), black: C('#22262b'),
    blue: C('#2f6392'), blueSign: C('#1f4f8f'), teal: C('#4c8a86'),
    yellow: C('#d9b02f'), orange: C('#cf7a2b'), pink: C('#c4657a'), purple: C('#7a5f96'),
    plastic: C('#c5453a'),
  };
  const G = { matte: .05, wood: .20, paint: .16, metal: .58, glass: .80, fabric: .04 };

  // ---------------------------------------------------------------- surfaces
  // The tiling materials, named once rather than spelled out at every call. Almost everything
  // built in this park is one of six things — cut granite, a cast kerb, brickwork, painted
  // steel, painted timber, or a clay roof tile — and naming them keeps the repeat and the
  // strength the same across the whole place instead of drifting prop by prop.
  //
  // `matAmt` is the trap. These are triplanar colour maps multiplied into the flat colour, so
  // past about .5 the texture stops being grain and becomes the colour: at .6 the granite coping
  // round the lake went brown, and the pavilion's red posts went back to bare timber. Nothing
  // here is over .42, and the two saturated paints — the red posts and the primary-coloured gym
  // kit — are held down at .28, which is enough to break the plastic sheen and no more.
  //
  // Scales are in metres of one repeat, so they are set to the object: 1.15 m for a metre kerb
  // block, .40 m for a course of roof tiles, .60 m for a bench slat.
  const STONE  = { gloss: G.matte, mat: 'concrete', matScale: 1.70, matAmt: .32 };
  const COPING = { gloss: G.matte, mat: 'concrete', matScale: 1.15, matAmt: .34 };
  const IRON   = { mat: 'metal',    matScale: .45, matAmt: .28 };
  const TIMBER = { mat: 'wood',     matScale: .60, matAmt: .42 };
  const ROOF   = { mat: 'rooftile', matScale: .40, matAmt: .40 };
  const BRICK  = { mat: 'brick',    matScale: .58, matAmt: .38 };

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, flat, glyphs,
          solid, blocker, shade, glow, thing, transform } = B;

  // ---------------------------------------------------------------- dimensions
  const RX = 16.0, RZ = 12.0;             // the fence line
  const GX = -8.0;                        // the gate, in the -z fence
  const LK = { x: 7.4, z: 4.2, rx: 6.2, rz: 4.4 };   // the lake
  const EX = -12.2, EZ = 3.4;             // the outdoor exercise row
  // Where the subway leaves you: on the plaza just inside the gate.
  const OUT = { x: GX, z: -RZ + 2.60, yaw: Math.PI * .0 };

  const litProps = [], sways = [], duckParts = [], pendulumParts = [];
  function litten(p, k) { litProps.push({ p, k }); return p; }
  function movingPart(list, p, cx, cy, cz, r) {
    list.push({ p, m0: new Float32Array(p.m), ob: p.ob && { ...p.ob } });
    p.fixed = true; p.cx = cx; p.cy = cy; p.cz = cz; p.r = r;
    return p;
  }

  let seed = 0x9a4c11;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = a => a[(rnd() * a.length) | 0];

  // ---------------------------------------------------------------- parts
  // 柳树 a willow. The whole character of the water's edge is in these: a short leaning trunk and
  // a curtain of fronds that hangs almost to the ground. Built as a ball of leaves on a stick it
  // was an oak, and an oak by a lake in Beijing is wrong in a way you can see from the gate.
  function willow(cx, cz, h, lean) {
    // The trunk stops under the crown. At full height it came out of the top of the leaves as a
    // bare brown pole, which is the one silhouette a willow does not have.
    capsule(cx, h * .40, cz, .17, h * .80, .17, col.trunk, { rz: lean, gloss: G.wood });
    const tx = cx + Math.sin(lean) * h * .4;
    // The crown, built the same way as the street trees so it reads as a tree first: seven balls
    // at three different heights. All at one height it was a mushroom cap on a stick.
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399;
      ball(tx + Math.sin(a) * .62, h * .68 + (i % 3) * .18, cz + Math.cos(a) * .62,
        .80, .58, .80, i % 2 ? col.willow : col.willowL, { gloss: .12, mode: 15, ry: a });
    }
    ball(tx, h * .655, cz, 1.02, .32, 1.02, col.leafU, { gloss: .08, mode: 15 });
    // The weeping shape is a skirt of drooping blobs tucked in under the crown. Ten separate
    // hanging strands read as tinsel: too far apart to be a curtain, too long to be a fringe, and
    // each one a pale ribbon hanging in clear air below a darker crown.
    for (let i = 0; i < 6; i++) {
      const a = i * 1.0472 + .35;
      sways.push(ball(tx + Math.sin(a) * .94, h * (.52 + (i % 3) * .03),
        cz + Math.cos(a) * .94, .38, h * .145, .38,
        i % 3 ? col.willow : col.willowL, { gloss: .11, mode: 15, ry: a }));
    }
    solid(cx - .30, cx + .30, cz - .30, cz + .30);
    shade(tx, cz, 3.4, 3.4, .28);
  }

  // A plane or a poplar: the ordinary street tree, for the boundary.
  //
  // Seven balls on one ring at one radius, in two greens taken alternately. From the gate — which
  // is where the whole park is seen from — that is a lollipop, and the hutong's own trees have had
  // clustered crowns in five tones for a long time. Same treatment here: rings up the crown, the
  // dark tones underneath and the light ones on top, and the shadow the mass above throws on the
  // mass below as one flattened cluster tucked under the middle of it.
  function tree(cx, cz, h) {
    capsule(cx, h * .30, cz, .16, h * .64, .16, col.trunkL, { gloss: G.wood });
    capsule(cx, h * .64, cz, .115, h * .34, .115, col.trunkL, { gloss: G.wood });
    for (const s2 of [-1, 1])
      capsule(cx + s2 * .30, h * .70, cz + s2 * .16, .07, h * .24, .07, col.trunk,
        { rz: s2 * .58, gloss: G.wood });
    ball(cx, h * .665, cz, 1.24, .38, 1.24, col.leafU, { gloss: .08, mode: 15 });
    const RING = [[.715, 1.00, 5, .82, [1, 3, 3]], [.845, 1.14, 6, .90, [3, 0, 1]],
                  [.965, .76, 4, .78, [2, 0, 2]], [1.055, 0, 1, .72, [2, 2, 2]]];
    const T5 = [col.leaf, col.leafD, col.leafL, col.leafM, col.leafU];
    let li = 0;
    for (const [ry0, rad, n, cr, tone] of RING)
      for (let i = 0; i < n; i++, li++) {
        const a = li * 2.399;
        ball(cx + Math.sin(a) * rad, h * ry0 + ((li % 3) - 1) * .11, cz + Math.cos(a) * rad,
          cr, cr * .78, cr, T5[tone[i % 3]], { gloss: .12, mode: 15, ry: a });
      }
    solid(cx - .28, cx + .28, cz - .28, cz + .28);
    shade(cx, cz, 3.0, 3.0, .26);
  }

  // 长椅 a park bench: a concrete frame and wooden slats, which is every bench in every park.
  function bench(cx, cz, ry) {
    const T = { ry, tag: '长椅' };
    for (const s of [-1, 1])
      box(cx + Math.cos(ry) * s * .74, .22, cz - Math.sin(ry) * s * .74,
        .14, .44, .46, col.stone, { ...T, hard: true, ...STONE, matScale: .80 });
    // The slats take the wood map at .60 — one repeat per slat width, so the grain runs along the
    // bench rather than across it and each of the seven boards is on a different part of it.
    for (let i = 0; i < 4; i++)
      box(cx - Math.sin(ry) * (-.16 + i * .11), .45, cz - Math.cos(ry) * (-.16 + i * .11),
        1.60, .05, .095, col.trunkL, { ...T, hard: true, gloss: G.wood, ...TIMBER });
    for (let i = 0; i < 3; i++)
      box(cx - Math.sin(ry) * .26, .62 + i * .13, cz - Math.cos(ry) * .26,
        1.60, .095, .05, col.trunkL, { ...T, hard: true, rx: -.14, gloss: G.wood, ...TIMBER });
    solid(cx - .84, cx + .84, cz - .34, cz + .38);
    shade(cx, cz, 2.0, 1.0, .24);
    thing('长椅', cx - Math.sin(ry) * .9, .95, cz - Math.cos(ry) * .9,
      '坐在长椅上休息一下。', 'Sit on the bench and rest a while.',
      '长 long + 椅 chair. 休息 is to rest.',
      { focus: [cx - Math.sin(ry) * 1.2, cz - Math.cos(ry) * 1.2], reach: 1.9 });
  }

  // 灌木 a clipped shrub. This is the storey the park did not have: between mown grass and a
  // canopy six metres up there was nothing at all, and planting with no middle reads as trees
  // standing on a carpet. Overlapping mounds rather than one ball, because a shrub that has been
  // cut back for twenty years is lumpy, and in the box greens rather than the tree greens — mode
  // 15 tints every cluster warm by its own position and at leaf green these came out fluorescent.
  function shrub(cx, cz, r, h, n = 4) {
    const T = [col.box1, col.box2, col.box3];
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, d = i ? r * .46 : 0;
      const rr = r * (.84 - (i % 3) * .07);
      ball(cx + Math.sin(a) * d, h * (.50 + (i % 3) * .08), cz + Math.cos(a) * d,
        rr, h * (.58 + (i % 2) * .10), rr, T[i % 3], { gloss: .11, mode: 15, ry: a });
    }
    shade(cx, cz, r * 2.5, r * 2.5, .16);
  }
  // A flowering shrub — the same mound with a scatter of bloom sitting in the top of it, which is
  // what a municipal planting scheme puts at the corners. The flowers are small and half-buried:
  // balls of saturated colour the size of the shrub read as a Christmas tree.
  function bloomShrub(cx, cz, r, h, c) {
    shrub(cx, cz, r, h, 3);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399, d = r * .58 * Math.sqrt((i + .5) / 7);
      ball(cx + Math.sin(a) * d, h * (.66 + (i % 3) * .07), cz + Math.cos(a) * d,
        .085, .055, .085, c, { gloss: .16, ry: a });
    }
  }

  // 芦苇 reeds at the water's edge. Blades on their own bearings, not a clump at one lean: eight
  // capsules all leaning the same way is a shaving brush. Only rz and ry are set, because the
  // wind in tick() rebuilds these matrices from rz and ry alone and would silently drop an rx.
  function reeds(cx, cz, n, h) {
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, d = rnd() * .30;
      const hh = h * (.70 + rnd() * .60);
      const b = sways.push(capsule(cx + Math.sin(a) * d, hh * .5, cz + Math.cos(a) * d,
        .026, hh, .026, i % 3 ? col.reed : col.reedD,
        { gloss: .13, ry: a, rz: (rnd() - .5) * .44 }));
      // A seed head on the taller blades. Without them a reed bed is a patch of long grass; the
      // brown tufts are what say reed at twenty metres, which is the only distance it is seen at.
      if (i % 3 === 0)
        sways.push(capsule(cx + Math.sin(a) * d, hh * .96, cz + Math.cos(a) * d,
          .036, hh * .22, .036, col.trunkL, { gloss: .14, ry: a, rz: (b % 5 - 2) * .06 }));
    }
  }

  // 睡莲 lily pads. Discs, not quads: a flat plane on the surface of the water vanishes the
  // moment the eye drops toward it, and the eye is at 1.6 m for the whole game. Two centimetres
  // of thickness costs nothing and keeps them visible from the bank.
  function lilies(cx, cz, n, spread) {
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, d = spread * Math.sqrt((i + .4) / n);
      const px = cx + Math.sin(a) * d, pz = cz + Math.cos(a) * d;
      cyl(px, .028, pz, .21 + (i % 3) * .05, .022, i % 2 ? col.lily : col.leafD,
        { gloss: .30, ry: a });
      if (i % 4 === 1) {
        ball(px + .16, .075, pz + .10, .062, .055, .062, col.pink, { gloss: .20 });
        ball(px + .16, .108, pz + .10, .032, .040, .032, col.cream, { gloss: .20 });
      }
    }
  }

  // 路灯 a park lamp: two lanterns on a curved bracket over a fluted column, which is the shape
  // every municipal park in China uses. The old one was a pole with a flat box on top and read as
  // a security floodlight on a car park. Only the lantern panels are mode 1 with glow — the column
  // is painted steel, and an emissive column feeds the bloom a lightbox four metres tall.
  // One real point light per column, hung between the two lanterns rather than one in each: the
  // shader takes eight and the park has four lamps, a pavilion and a station entrance, so a pair
  // per column would spend the whole budget on the paths and leave nothing for the buildings.
  // From four metres away the two lanterns are 1.2 m apart and a single source between them is
  // indistinguishable from two.
  //
  // The glow() pools underneath stay: this light makes the column, the bench beside it and the
  // hedge behind it respond, and no point light in a renderer without bounce GI will ever draw
  // the soft patch on the path that the pool does.
  function lamp(lx, lz) {
    cyl(lx, .10, lz, .21, .20, col.granD, { hard: true, ...STONE, matScale: .55 });
    taper(lx, .34, lz, .34, .30, .34, col.iron, { gloss: .30, ...IRON });
    cyl(lx, 2.00, lz, .072, 3.40, col.iron, { gloss: .30, ...IRON, matScale: .30 });
    for (const y of [.62, 1.94]) cyl(lx, y, lz, .092, .09, col.ironL, { gloss: .34, ...IRON });
    // the crossbar the two lanterns hang off, with a collar where it meets the column
    box(lx, 3.60, lz, 1.36, .07, .07, col.iron, { hard: true, gloss: .30, ...IRON });
    cyl(lx, 3.68, lz, .085, .16, col.ironL, { gloss: .32, ...IRON });
    for (const s of [-1, 1]) {
      const hx = lx + s * .58;
      cyl(hx, 3.50, lz, .028, .22, col.iron, { gloss: .30, ...IRON });
      // The lantern: a slightly flared glass box under a little hipped cap and a finial, which is
      // the 宫灯 shape. A plain cube of light is a bulkhead fitting.
      //
      // The glass is the body, and the ironwork is the cap over it and the cone under it. It was
      // built the other way round — a solid iron frustum .30 across with a .265 glass one inside
      // it — which is a lantern with its light sealed in an opaque case. At noon nobody could
      // tell; at nine at night the four columns lit the paths and every lantern on them was a
      // dark green box. That is what the night pass caught and the fixed shot list, all of it
      // between eight in the morning and five in the afternoon, never could.
      //
      // No material on the emissive piece. A mode-1 surface does not take a colour map, it *is*
      // the colour, and multiplying grain into it gives a dirty light rather than a lit one.
      // Same rule everywhere in this file: nothing with `mode: 1` gets a `mat`.
      litten(taper(hx, 3.24, lz, .30, .34, .30, C('#ffe6ae'),
        { rx: Math.PI, mode: 1, glow: .11 }), 1);
      box(hx, 3.44, lz, .34, .045, .34, col.iron, { hard: true, gloss: .30, ...IRON });
      taper(hx, 3.06, lz, .16, .10, .16, col.iron, { gloss: .30, ...IRON });
      glow(M.trs(hx, .02, lz, 0, 4.2, 1, 4.2), C('#ffdca6'), .0, false);
    }
    // Radius 8, not 4: a park lamp on a 3.4 m column lights a circle of path wider than it is
    // tall, and at the lantern's own size the pool of real light sat entirely inside the glow
    // quad and did nothing that the quad was not already doing.
    B.light(lx, 3.18, lz, [1.00, 0.86, 0.62], .95, 8.0);
    solid(lx - .16, lx + .16, lz - .16, lz + .16);
    shade(lx, lz, .9, .9, .22);
  }

  // 垃圾桶 the bin every path in a Chinese park has: two compartments under one hood, 可回收 on
  // one side and 其他垃圾 on the other, on a painted steel frame. The old one was a green drum
  // with a lid, which is a bin from somewhere else.
  function bin(bx, bz, ry) {
    const T = { ry, tag: '垃圾桶' };
    const c = Math.cos(ry), s = Math.sin(ry);
    for (const sd of [-1, 1]) {
      const ox = c * sd * .29, oz = -s * sd * .29;
      box(bx + ox, .40, bz + oz, .50, .68, .40, sd < 0 ? col.iron : col.granD,
        { ...T, hard: true, gloss: .28, ...IRON, matScale: .38 });
      // the mouth: a dark recess in the front face, which is what stops it reading as a crate
      box(bx + ox - s * .21, .52, bz + oz - c * .21, .32, .20, .02, col.black,
        { ...T, hard: true, mode: 1, glow: 0 });
      box(bx + ox, .76, bz + oz, .54, .05, .44, col.steelD,
        { ...T, hard: true, gloss: G.metal, ...IRON, matScale: .30 });
      glyphs(bx + ox - s * .215, .30, bz + oz - c * .215, ry + Math.PI,
        sd < 0 ? '可回收' : '其他',
        { size: .085, gap: .022, color: col.cream, mode: 1, tag: '垃圾桶' });
    }
    // the frame and the little hood over both mouths
    for (const sd of [-1, 1])
      cyl(bx + c * sd * .60, .40, bz - s * sd * .60, .030, .80, col.steelD,
        { ...T, gloss: G.metal, ...IRON, matScale: .25 });
    box(bx, .86, bz, 1.30, .05, .40, col.iron,
      { ...T, hard: true, rx: -.10, gloss: .28, ...IRON, matScale: .34 });
    box(bx, .06, bz, 1.24, .12, .46, col.granD, { ...T, hard: true, ...STONE, matScale: .60 });
    solid(bx - .62, bx + .62, bz - .28, bz + .28);
    shade(bx, bz, 1.8, 1.0, .22);
  }

  function build() {
    // ================================================================ ground
    // Mode 10, not 9: mode 9 is paving slabs, and a lawn ruled into metre squares with dirt in
    // the joints is a municipal five-a-side pitch. 10 is fine aggregate, which grass will take.
    flat(0, 0, 0, RX * 2 + 8, RZ * 2 + 8, col.grass, { mode: 17, gloss: .08 });
    // Tried and reverted: broad quads of the neighbouring greens laid over this to break up forty
    // metres of one flat value. A lawn is never one colour, but a quad has four straight edges and
    // what they read as is rectangles of differently-coloured turf, which is worse than the flat
    // green they were meant to fix. Mottling a lawn is the mode's job, not geometry's.
    // The paths, which are the shape of the park: a loop with a spur to the bridge.
    // Mode 9 rules the slabs; `paving` puts the grain of the stone inside each one, which is what
    // stopped forty metres of path reading as one sheet of grey card with a grid drawn on it. The
    // repeat is set to the slab, not to the path: at 2 m one stone's worth of mottle spanned three
    // slabs and the ruled joints stopped lining up with anything.
    const PAVE = { mode: 9, gloss: .10, mat: 'paving', matScale: .72, matAmt: .38 };
    flat(GX, .006, -RZ + 3.0, 7.6, 6.4, col.path, PAVE);
    flat(0, .006, -RZ + 5.4, RX * 2 - 3.0, 2.6, col.path, PAVE);
    flat(-11.4, .006, 2.0, 2.6, 12.0, col.path, PAVE);
    flat(-2.0, .006, RZ - 2.4, 20.0, 2.4, col.path, PAVE);
    flat(1.2, .006, 1.0, 2.4, 12.0, col.path, PAVE);
    // the red paving of the dance plaza, and the joints in it. Lower matAmt than the grey paths:
    // the plaza is the one warm surface in the middle of the park and at .38 the paving texture
    // pulled the red back towards the same buff as everything else. .62 rather than the paths'
    // .72 because these are the small square pavers a dance square is laid in, not slabs.
    flat(-4.6, .008, -3.4, 8.4, 6.6, col.paveR,
      { mode: 9, gloss: .12, mat: 'paving', matScale: .62, matAmt: .34 });
    for (let i = -4; i <= 4; i++) {
      flat(-4.6 + i * 1.05, .010, -3.4, .04, 6.6, col.pathD, { gloss: .08 });
      flat(-4.6, .010, -3.4 + i * .95, 8.4, .04, col.pathD, { gloss: .08 });
    }

    // ================================================================ 湖 the lake
    // A dark sheet with a lighter one just under it, a stone coping round the edge, and a few
    // reeds. Water in this renderer is a flat quad, so what sells it is the coping and the
    // reflection band along the far side rather than the water itself.
    // Dark and green and barely reflective. At a lighter blue with a bright band across it the
    // lake read as a municipal swimming pool, complete with lanes.
    // The outline is the whole problem. One quad the full LK.x by LK.z, kerbed on four straight
    // sides, is a swimming pool whatever colour you paint it — so the water is built as eleven
    // strips whose widths follow an ellipse, wobbled a little, and the steps between them are
    // buried under a rubble edge rather than a kerb.
    // Mode 10 for the water too. Under mode 9 the lake was ruled into 62 cm squares with darker
    // joints, which is not a texture water has ever had — it is the bottom of a swimming pool.
    const NW = 11;
    for (let i = 0; i < NW; i++) {
      const t = (i + .5) / NW * 2 - 1;
      const hz = LK.rz * Math.sqrt(Math.max(.05, 1 - t * t)) * (1 + Math.sin(i * 1.7) * .05);
      flat(LK.x + t * LK.rx, .012, LK.z + Math.sin(i * .9) * .16,
        LK.rx * 2 / NW + .06, hz * 2, col.water, { mode: 16, gloss: .52 });
    }
    // The neck at the west end, which is what the bridge is for. It runs out to -3.2 rather than
    // -1.7: the deck is 2.3 m wide, so a shorter channel was almost entirely hidden underneath it
    // and the bridge read as a footbridge over a puddle.
    for (let i = 0; i < 5; i++)
      flat(-2.60 + i * 1.05, .012, LK.z + .10, 1.14, 1.90 - i * .08, col.water,
        { mode: 10, gloss: .52 });
    // No colour patches on the sheet: two big quads of a lighter and a darker green sat on the
    // water as two hard-edged rectangles, which is worse than a plain lake.
    // The edge: a low stone kerb in metre lengths laid tangent to the outline. This is what hides
    // the staircase where the strips step, and loose boulders did not — dropped in a dotted ring
    // they read as grey crescents lying in the grass.
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * Math.PI * 2;
      // open at the west end, where the neck runs out to the bridge: a closed ring dammed it
      if (Math.abs(a - Math.PI) < .36) continue;
      // Sat 3.5% outside the outline the kerb left a strip of grass showing the stepped edge it was
      // there to hide, so it straddles the line instead.
      const wob = 1.002 + Math.sin(a * 3.1) * .030;
      const ex = LK.x + Math.cos(a) * LK.rx * wob, ez = LK.z + Math.sin(a) * LK.rz * wob;
      const ry = Math.atan2(-LK.rz * Math.cos(a), -LK.rx * Math.sin(a));
      box(ex, .07, ez, 1.18, .16, .44, i % 3 ? col.stone : col.stoneD, { hard: true, ry, ...COPING });
    }
    for (const s of [-1, 1])
      box(-.80, .07, LK.z + .10 + s * 1.06, 5.20, .16, .44, col.stone, { hard: true, ...COPING });
    box(-3.32, .07, LK.z + .10, .44, .16, 2.56, col.stoneD, { hard: true, ...COPING });
    // 芦苇 reeds where the shore shelves, and 睡莲 lilies on the open water.
    // What was here was fourteen bare blades, all one height and one green, scattered through a
    // rectangle at the near corner — a patch of long grass. `reeds` and `lilies` above give the
    // blades their own bearings, heights and leans and put a seed head on every third one; both
    // were written by an earlier pass and never called. They are called now.
    reeds(LK.x - LK.rx + 1.3, LK.z - LK.rz + 1.5, 13, .90);
    reeds(LK.x - LK.rx + 2.4, LK.z - LK.rz + .55, 8, .78);
    reeds(LK.x + LK.rx - 1.5, LK.z + LK.rz - 1.4, 9, .84);
    reeds(LK.x + 1.0, LK.z + LK.rz + .35, 7, .80);
    lilies(LK.x + 2.6, LK.z + 1.6, 9, 1.50);
    lilies(LK.x - 2.4, LK.z + 1.2, 6, 1.05);
    // 鸭子 a duck: a body, a neck, a dark head and a bill. A body and a small ball on top of it
    // read as a floating pill bottle.
    const duckCull = [LK.x + 1.10, .28, LK.z + .46, .90];
    movingPart(duckParts,
      ball(LK.x + 1.2, .13, LK.z + .60, .17, .12, .26, col.white,
        { tag: '鸭子', gloss: .22, ry: .5 }),
      ...duckCull);
    movingPart(duckParts,
      cyl(LK.x + 1.08, .25, LK.z + .44, .045, .20, col.white,
        { tag: '鸭子', gloss: .20, rx: .3 }),
      ...duckCull);
    movingPart(duckParts,
      ball(LK.x + 1.05, .37, LK.z + .39, .085, .085, .085, col.leafD,
        { tag: '鸭子', gloss: .20 }),
      ...duckCull);
    movingPart(duckParts,
      box(LK.x + 1.00, .355, LK.z + .31, .055, .04, .11, col.gold,
        { tag: '鸭子', hard: true, gloss: .20 }),
      ...duckCull);
    // The duck stays on the water; its action point is on the clear south bank directly opposite.
    // Keeping `pos` on the animal makes the label and action facing honest, while `focus` keeps the
    // player's body outside the lake's radius-expanded collision envelope.
    thing('鸭子', LK.x + 1.10, .55, LK.z + .46, '鸭子在湖里游来游去。',
      'A duck is paddling around the lake.',
      '鸭子 is a duck. 喂鸭子 means to feed a duck.',
      { focus: [LK.x + 1.10, LK.z - LK.rz - .90], reach: 1.9 });
    // The lake is not walkable. Two overlapping blocks rather than one, so the corners the water
    // no longer reaches are not fenced off as if it did.
    solid(LK.x - LK.rx - .3, LK.x + LK.rx + .3, LK.z - LK.rz * .60, LK.z + LK.rz * .60);
    solid(LK.x - LK.rx * .74, LK.x + LK.rx * .74, LK.z - LK.rz - .3, LK.z + LK.rz + .3);
    thing('湖', LK.x - LK.rx + .4, 1.10, LK.z - LK.rz - .1, '湖里有鱼，也有鸭子。',
      'There are fish in the lake, and ducks.',
      '湖 lake. A pond is a 池塘; this is big enough to be a 湖.',
      { focus: [LK.x - LK.rx - .9, LK.z - LK.rz - 1.1], reach: 2.6 });

    // ---- 桥 the stone bridge, over the neck at the near end of the water
    // A humpbacked span: five slabs rising and falling, with balustrades on both sides. Flat, a
    // bridge over a flat lake is a paving stone.
    const BX = LK.x - LK.rx - .9, BZ = LK.z;
    for (let i = 0; i < 7; i++) {
      const t = (i - 3) / 3, y = .34 - t * t * .34;
      box(BX, y, BZ - 3.0 + i * 1.0, 2.30, .16, 1.02, col.stoneL,
        { tag: '桥', hard: true, rx: t * .16, ...COPING });
      // A balustrade, not a parapet: a short panel with a gap either side of it and a rail over
      // the top. Full-depth panels 70 cm high merged into one stepped white wall.
      for (const s of [-1, 1]) {
        box(BX + s * 1.06, y + .30, BZ - 3.0 + i * 1.0, .14, .42, .78, col.stoneL,
          { tag: '桥', hard: true, ...STONE });
        box(BX + s * 1.06, y + .56, BZ - 3.0 + i * 1.0, .21, .11, 1.03, col.stone,
          { tag: '桥', hard: true, rx: t * .16, ...STONE });
        cyl(BX + s * 1.06, y + .70, BZ - 3.0 + i * 1.0, .09, .14, col.stoneD,
          { tag: '桥', ...STONE });
      }
    }
    // The bridge is the only way across, so the water either side of it stays solid and the deck
    // itself is left open — the lake's own collider is cut back for it.
    solid(BX - 1.20, BX - 1.00, BZ - 3.6, BZ + 3.6);
    solid(BX + 1.00, BX + 1.20, BZ - 3.6, BZ + 3.6);
    solid(-3.50, BX - 1.20, LK.z - .95, LK.z + 1.15);
    solid(BX + 1.20, 1.90, LK.z - .95, LK.z + 1.15);
    thing('桥', BX, 1.60, BZ, '从桥上看，湖水很绿。',
      'From the bridge the water looks very green.',
      '桥 bridge. 过桥 is to cross one.',
      { focus: [BX, BZ - 3.9], reach: 2.4 });

    // ================================================================ 亭子 the pavilion
    // Six pillars, a bracketed eave and a tiled hip roof with a finial, on a stone platform on
    // the far side of the water. It is the one piece of traditional building in the park and it is
    // where everybody sits when the sun is high.
    const PX = LK.x + 2.0, PZ = LK.z + LK.rz + 2.9;
    box(PX, .12, PZ, 5.20, .24, 4.60, col.stoneL, { tag: '亭子', hard: true, ...STONE });
    box(PX, .30, PZ, 4.60, .14, 4.00, col.stone, { tag: '亭子', hard: true, ...STONE });
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.PI / 6;
      const cx = PX + Math.sin(a) * 2.00, cz = PZ + Math.cos(a) * 1.70;
      // A 亭子 post is a tree trunk under six coats of red lead, so it takes the timber grain —
      // but only a third of it. At the full .42 the posts read as varnished pine and the pavilion
      // stopped being the one red thing on the far bank.
      cyl(cx, 1.55, cz, .13, 2.40, col.red,
        { tag: '亭子', gloss: .24, mat: 'wood', matScale: .70, matAmt: .28 });
      box(cx, 2.78, cz, .40, .16, .40, col.redD,
        { tag: '亭子', hard: true, gloss: .22, mat: 'wood', matScale: .45, matAmt: .30 });
    }
    box(PX, 2.90, PZ, 5.00, .18, 4.40, col.redD,
      { tag: '亭子', hard: true, gloss: .22, mat: 'wood', matScale: .80, matAmt: .30 });
    // Three shallow courses and an eave that turns up at the corners, rather than four deep ones:
    // stepped evenly it came out as a grey ziggurat with a gold knob on top.
    // The roof tile map is what turns those three grey steps into courses of pantile. Scale is
    // .40 — one repeat is about two rows of tile, and at 1 m the whole roof took a single tile.
    box(PX, 3.04, PZ, 5.60, .16, 5.00, col.tileR, { tag: '亭子', hard: true, gloss: .18, ...ROOF });
    for (let i = 0; i < 3; i++)
      box(PX, 3.18 + i * .26, PZ, 4.70 - i * 1.40, .28, 4.10 - i * 1.24, col.tileR,
        { tag: '亭子', hard: true, gloss: .18, ...ROOF });
    for (const sx2 of [-1, 1]) for (const sz2 of [-1, 1])
      taper(PX + sx2 * 2.55, 3.22, PZ + sz2 * 2.25, .70, .44, .70, col.tileRD,
        { tag: '亭子', hard: true, rx: sz2 * .5, rz: -sx2 * .5, gloss: .18, ...ROOF });
    box(PX, 3.92, PZ, 1.10, .18, 1.00, col.tileRD, { tag: '亭子', hard: true, gloss: .18, ...ROOF });
    cyl(PX, 4.16, PZ, .16, .32, col.gold, { tag: '亭子', gloss: G.metal });
    ball(PX, 4.38, PZ, .15, .17, .15, col.goldL, { tag: '亭子', gloss: G.metal });
    // a bench round the inside of it, and the plaque over the entrance
    for (const s of [-1, 1])
      box(PX + s * 1.70, .58, PZ + .30, .34, .42, 2.60, col.trunkL,
        { tag: '亭子', hard: true, gloss: G.wood, ...TIMBER });
    box(PX, .58, PZ + 1.55, 3.40, .42, .34, col.trunkL,
      { tag: '亭子', hard: true, gloss: G.wood, ...TIMBER });
    box(PX, 2.62, PZ - 2.16, 2.20, .40, .09, col.redD,
      { tag: '亭子', hard: true, gloss: .22, mat: 'wood', matScale: .55, matAmt: .28 });
    // yaw π, not 0: the plaque hangs on the -z face of the lintel and yaw 0 faces +z, so this
    // was cut into the side of the board nobody can stand on.
    glyphs(PX, 2.62, PZ - 2.22, Math.PI, '清风亭',
      { size: .26, gap: .09, color: col.goldL, mode: 1, tag: '亭子' });
    // 宫灯 a lantern hung from the middle of the ceiling, which is what a pavilion that people sit
    // in after dark has. It is here for the light rather than the other way round: a warm point
    // source 2.4 m up under a solid roof is the one place in the park where a local light does
    // something the sun cannot, because the roof shades this floor at every hour of the day.
    // Radius 6, so it stops at the columns and does not wash the lake.
    cyl(PX, 2.72, PZ, .012, .34, col.iron, { tag: '亭子', gloss: .30, ...IRON, matScale: .14 });
    litten(taper(PX, 2.42, PZ, .19, .24, .19, C('#ffdca2'),
      { tag: '亭子', rx: Math.PI, mode: 1, glow: .13 }), 1);
    box(PX, 2.57, PZ, .24, .035, .24, col.redD, { tag: '亭子', hard: true, gloss: .24 });
    ball(PX, 2.28, PZ, .045, .06, .045, col.gold, { tag: '亭子', gloss: G.metal });
    B.light(PX, 2.34, PZ, [1.00, 0.84, 0.58], .80, 6.0);
    // Collision follows the six posts and three fixed benches instead of filling the pavilion with
    // one 5.4 x 4.8 m invisible block. The old volume contradicted the visible open sides, made the
    // benches unusable and forced the interaction focus into the lake. These measured footprints
    // keep two generous south entrances and let the chase camera accompany the player inside.
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const cx = PX + Math.sin(a) * 2.00, cz = PZ + Math.cos(a) * 1.70;
      solid(cx - .25, cx + .25, cz - .25, cz + .25);
    }
    for (const s of [-1, 1])
      solid(PX + s * 1.70 - .22, PX + s * 1.70 + .22, PZ - 1.10, PZ + 1.70);
    solid(PX - 1.80, PX + 1.80, PZ + 1.30, PZ + 1.80);
    shade(PX, PZ, 6.0, 5.4, .32);
    thing('亭子', PX, 3.30, PZ - 2.40, '亭子里有人下棋。',
      'There are people playing chess in the pavilion.',
      '亭 pavilion + 子. Somewhere to sit out of the sun, and there is one in every park.',
      { focus: [PX + 1.0, PZ - 1.25], reach: 2.6 });

    // ================================================================ 广场舞 the dance plaza
    // The speaker on its trolley, turned up too loud, and the paint on the ground everyone lines
    // up on. The dancers themselves are neighbours, not scenery, so they live in the NPC list.
    const SPX = -7.9, SPZ = -3.4;
    box(SPX, .38, SPZ, .52, .70, .40, col.charcoal, { tag: '音箱', gloss: .30 });
    box(SPX, .74, SPZ, .56, .06, .44, col.steelD, { tag: '音箱', hard: true, gloss: G.metal });
    for (const oy of [.28, .52])
      cyl(SPX - .27, oy, SPZ, .13, .04, col.steelD,
        { tag: '音箱', rz: Math.PI / 2, gloss: .34 });
    litten(box(SPX - .27, .66, SPZ, .02, .04, .10, C('#7fe0a4'),
      { tag: '音箱', hard: true, mode: 1, glow: .32 }), .6);
    capsule(SPX + .10, .52, SPZ - .30, .020, .90, .020, col.steelD, { gloss: G.metal, rx: .3 });
    for (const s of [-1, 1])
      cyl(SPX + s * .22, .06, SPZ + .26, .09, .06, col.black,
        { tag: '音箱', rz: Math.PI / 2, gloss: .28 });
    solid(SPX - .40, SPX + .40, SPZ - .34, SPZ + .34);
    thing('音箱', SPX, 1.06, SPZ - .40, '音箱开得太大了。', 'The speaker is turned up too loud.',
      '音 sound + 箱 box. 广场舞 is the square dancing it is for.',
      { focus: [SPX, SPZ - 1.5], reach: 1.9 });

    // ================================================================ 健身器材 the exercise kit
    // The row of primary-coloured machines every Chinese park has a corner of: a twist plate, two
    // pendulum swings, a rower and a set of parallel bars, all in the same yellow and blue.
    flat(EX, .008, EZ, 4.6, 7.4, col.pathD, { ...PAVE, matScale: .62 });
    const kit = (cx, cz, kind) => {
      // The metal map on the tag, so every tube, plate and footboard in the rig picks it up from
      // one place. The floor of the useful range and no more: these are powder-coated in the two
      // loudest colours in the park, and the point of the material is the wear on the paint, not
      // a change of colour — at .45 the whole rig went the grey-brown of the map and the corner
      // stopped reading as the primary-coloured thing it is meant to be.
      const T = { tag: '健身器材', mat: 'metal', matScale: .34, matAmt: .28 };
      box(cx, .05, cz, .90, .10, .90, col.charcoal, { ...T, hard: true, gloss: .24 });
      if (kind === 0) {                       // twist plate on a post
        cyl(cx, .52, cz, .07, .94, col.yellow, { ...T, gloss: .30 });
        cyl(cx, 1.02, cz, .30, .07, col.blue, { ...T, gloss: .30 });
        for (const s of [-1, 1])
          capsule(cx + s * .30, 1.24, cz - .16, .030, .46, .030, col.yellow,
            { ...T, gloss: .30 });
      } else if (kind === 1) {                // pendulum swing
        for (const s of [-1, 1])
          cyl(cx + s * .34, .78, cz, .06, 1.46, col.yellow, { ...T, gloss: .30 });
        capsule(cx, 1.50, cz, .05, .78, .05, col.blue,
          { ...T, rz: Math.PI / 2, gloss: .30 });
        movingPart(pendulumParts,
          capsule(cx, 1.06, cz + .14, .04, .82, .04, col.steelD, { ...T, gloss: G.metal }),
          cx, 1.06, cz + .10, 1.05);
        movingPart(pendulumParts,
          box(cx, .62, cz + .22, .48, .09, .30, col.blue,
            { ...T, hard: true, gloss: .30 }),
          cx, 1.06, cz + .10, 1.05);
      } else if (kind === 2) {                // rower
        box(cx, .34, cz, .22, .58, 1.30, col.yellow, { ...T, hard: true, gloss: .30 });
        box(cx, .52, cz - .30, .52, .09, .40, col.blue, { ...T, hard: true, gloss: .30 });
        for (const s of [-1, 1])
          capsule(cx + s * .34, .84, cz + .34, .035, .60, .035, col.blue,
            { ...T, rx: -.5, gloss: .30 });
      } else {                                // parallel bars
        for (const s of [-1, 1]) for (const o of [-.6, .6])
          cyl(cx + s * .42, .58, cz + o, .05, 1.10, col.yellow, { ...T, gloss: .30 });
        for (const s of [-1, 1])
          capsule(cx + s * .42, 1.12, cz, .045, 1.50, .045, col.blue,
            { ...T, rx: Math.PI / 2, gloss: .30 });
      }
      solid(cx - .60, cx + .60, cz - .80, cz + .80);
      shade(cx, cz, 1.9, 2.0, .22);
    };
    kit(EX, EZ + 2.6, 0); kit(EX, EZ + .8, 1); kit(EX, EZ - 1.1, 2); kit(EX, EZ - 3.0, 3);
    thing('健身器材', EX + .8, 1.50, EZ, '每天在公园锻炼身体。',
      'I exercise in the park every day.',
      '健身 to keep fit + 器材 equipment. 锻炼 is to take exercise.',
      { focus: [EX + 1.9, EZ], reach: 2.4 });

    // ================================================================ 花 the flower beds
    // Two raised beds either side of the gate path, planted in blocks of one colour, which is how
    // a municipal park plants anything.
    for (const s of [-1, 1]) {
      const fx = GX + s * 4.6, fz = -RZ + 3.4;
      box(fx, .16, fz, 3.20, .32, 2.20, col.paveR,
        { tag: '花', hard: true, gloss: G.matte, ...BRICK, matScale: .34 });
      box(fx, .32, fz, 2.90, .06, 1.90, col.trunk, { tag: '花', hard: true, gloss: .12 });
      for (let i = 0; i < 22; i++) {
        const px = fx - 1.35 + (i % 11) * .27, pz = fz - .45 + ((i / 11) | 0) * .90;
        // A flat dome of bloom over a green mound, in blocks of three of one colour. A round ball
        // of saturated colour per plant, and the colour changing every plant, is a bowl of sweets.
        ball(px, .46, pz, .17, .13, .17, col.leafD, { tag: '花', gloss: .12 });
        ball(px, .535, pz, .135, .055, .135,
          [col.plastic, col.yellow, col.pink, col.purple][
            (((i % 11) / 3 | 0) + (s > 0 ? 1 : 0)) % 4],
          { tag: '花', gloss: .16 });
      }
      solid(fx - 1.7, fx + 1.7, fz - 1.2, fz + 1.2);
    }
    thing('花', GX + 4.6, .90, -RZ + 2.1, '花开得真好。', 'The flowers are doing well.',
      '花 flower. 开花 is to bloom.',
      { focus: [GX + 4.6, -RZ + 1.0], reach: 1.9 });

    // ================================================================ 公共厕所
    // A compact municipal brick pavilion in the grass between the south path and the lake. Its
    // doors face the path, while the solid follows the main shell rather than the slightly wider
    // roof, so neither the north-south path nor the duck's action point is pinched off.
    const TX = 5.0, TZ = -2.7;
    const TOILET = { tag: '公共厕所' };
    box(TX, .12, TZ, 4.70, .24, 3.50, col.granD,
      { ...TOILET, hard: true, ...STONE, matScale: .82 });
    box(TX, 1.50, TZ, 4.60, 2.76, 3.40, col.stoneD,
      { ...TOILET, hard: true, ...BRICK, matScale: .46 });
    box(TX, 2.94, TZ, 4.90, .20, 3.68, col.granL,
      { ...TOILET, hard: true, ...STONE, matScale: .90 });
    taper(TX, 3.30, TZ, 4.72, .56, 3.50, col.tileR,
      { ...TOILET, hard: true, gloss: .18, ...ROOF });
    // A short apron joins the doors to the existing south path. Without it the interaction focus
    // was reachable but visibly stood in grass, which made a municipal building look dropped into
    // the lawn rather than connected to the park circulation.
    flat(TX, .012, TZ - 2.15, 3.40, .90, col.path,
      { ...PAVE, matScale: .50, tag: '公共厕所' });
    // The two enamel doors carry words, not generic pictograms: large white 男 / 女 labels stay
    // readable from the path, and their blue/red panels remain distinct even before the glyphs.
    for (const [ox, ch, doorCol] of [[-1.05, '男', col.blueSign], [1.05, '女', col.redD]]) {
      box(TX + ox, 1.18, TZ - 1.73, 1.24, 2.20, .12, doorCol,
        { ...TOILET, hard: true, gloss: G.paint, mat: 'metal', matScale: .46, matAmt: .24 });
      for (const g of glyphs(TX + ox, 1.70, TZ - 1.80, Math.PI, ch,
          { size: .30, gap: 0, color: col.white, mode: 1, tag: '公共厕所' })) litten(g, .55);
      ball(TX + ox + (ox < 0 ? .42 : -.42), 1.02, TZ - 1.81,
        .045, .045, .045, col.steel, { ...TOILET, gloss: G.metal });
    }
    box(TX, 2.64, TZ - 1.77, 3.36, .42, .12, col.blueSign,
      { ...TOILET, hard: true, gloss: .24, mat: 'metal', matScale: .52, matAmt: .24 });
    for (const g of glyphs(TX, 2.64, TZ - 1.84, Math.PI, '公共厕所',
        { size: .20, gap: .055, color: col.white, mode: 1, tag: '公共厕所' })) litten(g, .75);
    solid(TX - 2.30, TX + 2.30, TZ - 1.70, TZ + 1.70);
    shade(TX, TZ, 5.4, 4.2, .27);
    thing('公共厕所', TX, 1.70, TZ - 1.95, '公园里有公共厕所，门口排着队。',
      'There is a public toilet in the park, with a queue outside.',
      '公共 public + 厕所 toilet. 排队 is to queue.',
      { focus: [TX, TZ - 2.45], reach: 2.2 });

    // ================================================================ 小卖部
    // A compact kiosk backs onto the south fence between the two boundary trees. Its north-facing
    // counter opens onto a short paved apron which meets the existing east-west path exactly at
    // z=-7.90; the authored solid stops at the shell, leaving that complete approach walkable.
    const KX = 8.4, KZ = -10.2;
    const KIOSK = { tag: '小卖部' };
    flat(KX, .012, KZ + 1.575, 3.00, 1.45, col.path,
      { ...PAVE, matScale: .50, ...KIOSK });
    box(KX, .10, KZ, 2.90, .20, 1.70, col.granD,
      { ...KIOSK, hard: true, ...STONE, matScale: .70 });
    // Back, side cheeks and the low counter wall make an open service kiosk rather than a sealed
    // shed. The dark recess and two stocked shelves remain visible from the path in daylight.
    box(KX, 1.34, KZ - .80, 2.80, 2.48, .10, col.iron,
      { ...KIOSK, hard: true, gloss: G.paint, ...IRON, matScale: .52 });
    for (const s of [-1, 1])
      box(KX + s * 1.40, 1.34, KZ, .10, 2.48, 1.60, col.iron,
        { ...KIOSK, hard: true, gloss: G.paint, ...IRON, matScale: .52 });
    box(KX, .56, KZ + .80, 2.80, 1.02, .10, col.ironL,
      { ...KIOSK, hard: true, gloss: G.paint, ...IRON, matScale: .48 });
    box(KX, 1.62, KZ + .755, 2.54, 1.02, .055, col.black,
      { ...KIOSK, hard: true, gloss: .08 });
    for (const sy of [1.25, 1.58, 1.91])
      box(KX, sy, KZ + .79, 2.42, .035, .22, col.steelD,
        { ...KIOSK, hard: true, gloss: G.metal });
    // Water, soft drinks and instant-noodle cups: varied silhouettes on the lit shelf, not a flat
    // coloured poster. Their low emissive term keeps the stock readable after the park lamps come on.
    const STOCK = [col.white, col.blue, col.red, col.yellow, col.teal, col.orange];
    for (let i = 0; i < 12; i++) {
      const sx = KX - 1.02 + (i % 6) * .405, sy = i < 6 ? 1.39 : 1.72;
      litten(cyl(sx, sy, KZ + .805, .060, .21, STOCK[i % STOCK.length],
        { ...KIOSK, mode: 1, glow: .018, gloss: .25 }), .32);
      if (i % 3 === 0)
        box(sx, sy + .115, KZ + .81, .095, .025, .095, col.cream,
          { ...KIOSK, hard: true, mode: 1, glow: .012 });
    }
    box(KX, 1.04, KZ + .92, 2.58, .12, .30, col.granL,
      { ...KIOSK, hard: true, ...COPING, matScale: .55 });
    box(KX, 2.30, KZ + .805, 2.78, .44, .09, col.redD,
      { ...KIOSK, hard: true, gloss: .22, mat: 'metal', matScale: .46, matAmt: .24 });
    for (const g of glyphs(KX, 2.30, KZ + .86, 0, '小卖部',
        { size: .22, gap: .065, color: col.goldL, mode: 1, tag: '小卖部' })) litten(g, .85);
    box(KX, 2.62, KZ, 2.90, .16, 1.70, col.tileRD,
      { ...KIOSK, hard: true, gloss: .18, ...ROOF, matScale: .46 });
    B.light(KX, 2.14, KZ + .68, [1.00, .86, .62], .48, 3.6);
    solid(KX - 1.45, KX + 1.45, KZ - .85, KZ + .85);
    shade(KX, KZ, 3.20, 2.10, .25);
    thing('小卖部', KX, 1.55, KZ + .95, '小卖部有方便面、矿泉水和冷饮。',
      'The kiosk sells instant noodles, mineral water and cold drinks.',
      '小卖部 is a little neighbourhood kiosk. 买方便面 means to buy instant noodles.',
      { focus: [KX, KZ + 1.65], reach: 2.0 });

    // ================================================================ trees and the fence
    // Willows along the water, planes round the edge, and a low iron railing with the gate in it.
    willow(LK.x - LK.rx - 2.6, LK.z + 3.0, 5.2, .14);
    willow(LK.x - LK.rx - 1.4, LK.z - 3.6, 4.8, -.10);
    // Not at (LK.x + 2.2): that is on the line from the south shore to the pavilion, and a willow
    // five metres from your eye hides the one building in the park.
    willow(LK.x + 5.0, LK.z - LK.rz - 2.0, 5.0, .08);
    willow(LK.x + LK.rx + 1.8, LK.z - 1.2, 4.6, -.16);
    tree(-13.6, -8.0, 6.0); tree(-2.2, -9.8, 5.4); tree(4.6, -9.6, 5.8);
    tree(11.0, -9.4, 5.6); tree(-13.8, 9.4, 6.2); tree(-4.0, 9.8, 5.6);
    tree(4.2, 10.0, 5.8); tree(13.6, 10.2, 6.0); tree(-14.2, -2.0, 5.2);
    // The shrub layer, which `shrub` and `bloomShrub` above were written for and never got.
    // Between mown grass and a canopy six metres up there was nothing at all, and planting with
    // no middle storey reads as trees standing on a carpet — which is exactly what the wide shot
    // showed. These go at the feet of the boundary trees and in the corners the paths leave over,
    // never on a path and never in the lake: a shrub has no collider and one standing in the
    // water or in the middle of the plaza is a bush you walk through.
    // Every one of these is checked against all nine paved rectangles — the gate apron, the two
    // cross paths, the two spurs, the plaza, the gym pad, the 太极 pad and the station forecourt —
    // and against the lake ellipse, the flower beds and the bridge. The first pass put one in the
    // middle of the gate apron and one over the forecourt, which is a bush you walk through: the
    // apron runs from x −11.8 to −4.2 and the forecourt from −14.2 to −10.6, so the whole span
    // west of the gate is paved and there is no grass to plant in between them at all.
    for (const [sx3, sz3, r3, h3] of [
      [-15.0, -10.4, .74, .90], [-2.2, -10.5, .78, .92], [2.6, -10.6, .90, 1.05],
      [6.0, -10.4, .72, .90], [13.4, -9.4, .88, 1.02],
      [14.6, 1.0, .84, 1.00], [14.8, 6.4, .80, .95], [-15.2, 3.0, .68, .82],
      [-4.6, 3.4, .74, .88], [-6.6, 5.4, .78, .92], [-3.4, 6.4, .82, .96],
    ]) shrub(sx3, sz3, r3, h3);
    // and three flowering ones where the paths open out, which is where a municipal scheme
    // always puts them
    bloomShrub(-.6, -9.4, .78, .92, col.yellow);
    bloomShrub(5.2, -8.8, .74, .88, col.pink);
    bloomShrub(-15.2, -2.6, .70, .84, col.purple);
    // 太极 happens under this one, and the old men need somewhere flat to do it
    flat(-11.0, .008, 8.0, 5.0, 4.0, col.pathD, { ...PAVE, matScale: .62 });

    // the railing: uprights and two rails, all the way round bar the gate
    for (const [ax, az, bx, bz] of [[-RX, -RZ, RX, -RZ], [-RX, RZ, RX, RZ],
                                    [-RX, -RZ, -RX, RZ], [RX, -RZ, RX, RZ]]) {
      const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 1.6);
      const yaw = Math.atan2(bx - ax, bz - az);
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        if (az === bz && az < 0 && x > GX - 2.6 && x < GX + 2.6) continue;
        cyl(x, .60, z, .055, 1.20, col.charcoal, { gloss: .28, ...IRON, matScale: .26 });
      }
      for (const y of [.42, 1.08]) {
        const mx = (ax + bx) / 2, mz = (az + bz) / 2;
        // The long rails get a coarse repeat on purpose. At the uprights' .26 a 32 m capsule was
        // carrying 120 repeats of the map along its length and read as a knurled bar.
        if (az === bz && az < 0) {
          for (const [x0, x1] of [[-RX, GX - 2.6], [GX + 2.6, RX]])
            box((x0 + x1) / 2, y, az, x1 - x0, .05, .05, col.charcoal,
              { hard: true, gloss: .28, ...IRON, matScale: 1.10 });
        } else {
          capsule(mx, y, mz, .025, len, .025, col.charcoal,
            { rz: Math.PI / 2, ry: yaw + Math.PI / 2, gloss: .28, ...IRON, matScale: 1.10 });
        }
      }
    }
    // Outside the railing, a hedge to close the view off. Hard-edged boxes all the same height in
    // one flat green gave a painted fence with a dark bar between every unit — which is what the
    // whole boundary of the park read as from the gate. Rounded, three tones, and a centimetre or
    // two of height between neighbours, and the same 152 boxes read as clipped planting.
    const HEDGE = [col.leafD, col.leafU, col.leafM];
    for (let i = 0; i < 46; i++) {
      const t = i / 45, w = 1.10 + (i % 3) * .07, hy = .55 + (i % 4) * .035;
      for (const s of [1, -1])
        box(-RX - .7 + t * (RX * 2 + 1.4), hy, s * (RZ + .9), .86, hy * 2, w,
          HEDGE[(i + (s < 0 ? 1 : 0)) % 3], { gloss: .10, mode: 15, round: .13 });
    }
    for (let i = 0; i < 30; i++) {
      const t = i / 29, w = 1.10 + (i % 3) * .07, hy = .55 + (i % 4) * .035;
      for (const s of [-1, 1])
        box(s * (RX + .9), hy, -RZ - .7 + t * (RZ * 2 + 1.4), w, hy * 2, .96,
          HEDGE[(i + (s < 0 ? 2 : 0)) % 3], { gloss: .10, mode: 15, round: .13 });
    }

    // ================================================================ 公园 the gate
    // A pair of brick piers with a name plaque across them, and the park's rules on a board
    // beside it, because there is always a board.
    for (const s of [-1, 1]) {
      // The piers are the one place in the park the comment above was already telling the truth
      // about and the geometry was not: brick piers, painted a rendered red. The brick map at
      // .38 puts courses in them, which is the difference between a gate and two red posts.
      box(GX + s * 2.55, 1.55, -RZ, .70, 3.10, .70, col.paveR,
        { tag: '公园', hard: true, gloss: G.matte, ...BRICK });
      box(GX + s * 2.55, 3.22, -RZ, .90, .24, .90, col.stoneL,
        { tag: '公园', hard: true, ...STONE, matScale: .70 });
      cyl(GX + s * 2.55, 3.50, -RZ, .16, .32, col.gold, { tag: '公园', gloss: G.metal });
    }
    box(GX, 3.02, -RZ, 4.60, .60, .24, col.redD,
      { tag: '公园', hard: true, gloss: .22, mat: 'wood', matScale: .70, matAmt: .28 });
    // Both faces. Cut on the inside only, the name of the park was a blank red board to
    // everybody walking up to it, which is everybody.
    glyphs(GX, 3.02, -RZ + .14, 0, '柳荫公园',
      { size: .34, gap: .12, color: col.goldL, mode: 1, tag: '公园' });
    glyphs(GX, 3.02, -RZ - .14, Math.PI, '柳荫公园',
      { size: .34, gap: .12, color: col.goldL, mode: 1, tag: '公园' });
    thing('公园', GX, 3.70, -RZ + .40, '公园早上六点开门。',
      'The park opens at six in the morning.',
      '公 public + 园 garden. 逛公园 is to go for a wander round one.',
      { focus: [GX, -RZ + 1.9], reach: 2.8 });
    // the rules board
    box(GX + 4.0, 1.30, -RZ + .40, 1.60, .95, .09, col.blueSign,
      { hard: true, gloss: .24, mat: 'metal', matScale: .55, matAmt: .28 });
    for (const s of [-1, 1])
      cyl(GX + 4.0 + s * .60, .62, -RZ + .40, .055, 1.24, col.steelD,
        { gloss: G.metal, ...IRON, matScale: .28 });
    glyphs(GX + 4.0, 1.58, -RZ + .35, Math.PI, '游园须知',
      { size: .15, gap: .05, color: col.white, mode: 1 });
    for (let i = 0; i < 3; i++)
      box(GX + 4.0, 1.24 - i * .22, -RZ + .35, 1.20, .035, .01, C('#9fb4cc'),
        { hard: true, mode: 1 });

    // ---- 地铁站 the way back to the line, just outside the gate
    const MX = GX - 4.4, MZ = -RZ + 1.10;
    flat(MX, .006, MZ + .4, 3.6, 3.4, col.path, PAVE);
    flat(MX, .012, MZ + .70, 2.10, 1.70, col.black, { gloss: .08 });
    for (let i = 0; i < 6; i++)
      box(MX, .016, MZ + .06 + i * .22 - i * i * .012, 1.84, .01, .055,
        i < 3 ? col.kerb : col.stoneD, { hard: true, gloss: .14 });
    for (const s of [-1, 1]) {
      box(MX + s * 1.14, .48, MZ + .70, .16, .96, 1.80, col.stone,
        { hard: true, ...STONE, matScale: 1.10 });
      box(MX + s * 1.14, .98, MZ + .70, .22, .07, 1.86, col.kerb,
        { hard: true, gloss: .20, ...COPING, matScale: .90 });
      box(MX + s * 1.20, 1.30, MZ + 1.64, .13, 2.60, .13, col.steelD,
        { hard: true, gloss: G.metal, ...IRON, matScale: .34 });
    }
    box(MX, 2.62, MZ + 1.06, 2.86, .12, 2.00, col.stoneL,
      { hard: true, gloss: G.paint, mat: 'concrete', matScale: 1.30, matAmt: .28 });
    box(MX, 2.40, MZ + .08, 2.86, .34, .10, col.blueSign,
      { hard: true, gloss: .26, mat: 'metal', matScale: .50, matAmt: .28 });
    for (const g of glyphs(MX + .32, 2.40, MZ + .02, Math.PI, '地铁站',
        { size: .20, gap: .05, color: col.white, mode: 1 })) litten(g, .9);
    cyl(MX - .94, 2.40, MZ + .01, .145, .03, col.white,
      { rz: Math.PI / 2, mode: 1, gloss: .20 });
    for (const g of glyphs(MX - .94, 2.40, MZ - .02, Math.PI, '地',
        { size: .17, gap: 0, color: col.blueSign, mode: 1 })) litten(g, .5);
    box(MX - 1.96, 1.55, MZ - .16, .16, 3.10, .16, col.steelD,
      { hard: true, gloss: G.metal, ...IRON, matScale: .34 });
    box(MX - 1.96, 2.60, MZ - .20, .52, 1.60, .14, col.blueSign,
      { hard: true, gloss: .26, mat: 'metal', matScale: .40, matAmt: .28 });
    for (const g of glyphs(MX - 1.96, 2.58, MZ - .28, Math.PI, '公园',
        { size: .17, gap: .05, vertical: true, color: col.white, mode: 1 })) litten(g, .9);
    // The station canopy's own light, under the soffit and pointing at the steps. The entrance is
    // where you arrive in the dark and where you leave from, and its three signs are emissive —
    // they were the only lit thing at the gate end and read as glowing paper stuck to a black
    // wall. Cooler and weaker than the park lamps: this is a fluorescent tube, not a lantern.
    B.light(MX, 2.44, MZ + .90, [0.92, 0.96, 1.00], .70, 5.2);
    solid(MX - 2.10, MX + 1.30, MZ - .30, MZ + 1.80);
    shade(MX, MZ + .6, 3.4, 2.6, .28);
    thing('地铁站', MX, 2.92, MZ - .30, '坐地铁回去吧。', "Let's take the subway back.",
      '地铁 subway + 站 stop. The line runs from here back into town.',
      { focus: [MX, MZ - 1.55], reach: 2.4 }).station = '公园';

    // ================================================================ the small stuff
    // Benches on every path, bins beside half of them, and a stone table for chess under the
    // trees. This is the layer that makes a park feel used rather than laid out.
    bench(-6.2, -6.4, 0); bench(-1.2, -6.4, 0); bench(3.8, -6.4, 0);
    bench(-11.4, -2.2, Math.PI / 2); bench(-11.4, 6.6, Math.PI / 2);
    // Not at (2.0, 8.4): that is the middle of the rockery, and the bench was inside the rocks.
    bench(-6.0, RZ - 3.6, Math.PI); bench(-2.6, RZ - 1.6, Math.PI);
    bench(LK.x - LK.rx - 2.2, LK.z + 5.6, -Math.PI / 2);
    // The bins. These were four green drums with a white label on the front — a wheelie bin
    // without the wheels, and from anywhere in the park a dark green cylinder standing on grass.
    // `bin` above is the two-compartment 可回收 / 其他垃圾 unit that is actually bolted to every
    // path in a Chinese park; it was written and never called, so it is called here.
    for (const [bx, bz, ry] of [[-3.7, -6.6, 0], [1.3, -6.6, 0],
                                [-11.6, 2.2, Math.PI / 2], [-3.4, RZ - 3.8, 0]])
      bin(bx, bz, ry);
    // the chess table, and the two stools that go with it
    const CTX = -9.6, CTZ = 10.2;
    cyl(CTX, .36, CTZ, .10, .72, col.stoneD, { tag: '石桌', ...STONE, matScale: .50 });
    cyl(CTX, .74, CTZ, .58, .09, col.stoneL, { tag: '石桌', ...STONE, matScale: .90 });
    for (let i = 0; i < 8; i++)
      box(CTX - .35 + (i % 4) * .23, .795, CTZ - .12 + ((i / 4) | 0) * .23, .21, .01, .21,
        i % 2 ? col.stoneD : col.cream, { tag: '石桌', hard: true, mode: 1 });
    for (const s of [-1, 1]) {
      cyl(CTX + s * 1.06, .21, CTZ, .24, .42, col.stone, { tag: '石桌', ...STONE, matScale: .55 });
      cyl(CTX + s * 1.06, .43, CTZ, .26, .05, col.stoneL, { tag: '石桌', ...STONE, matScale: .55 });
    }
    solid(CTX - 1.4, CTX + 1.4, CTZ - .7, CTZ + .7);
    shade(CTX, CTZ, 2.8, 1.8, .24);
    thing('石桌', CTX, 1.20, CTZ - .80, '两个老人在石桌上下棋。',
      'Two old men are playing chess at the stone table.',
      '石 stone + 桌 table. 下棋 is to play a board game.',
      { focus: [CTX, CTZ - 1.6], reach: 1.9 });
    // 假山 a rockery, because a Chinese park is not one without a heap of grey rock.
    // The concrete map at a tight .55 is the closest thing in the set to weathered limestone, and
    // it is the one place in the park where the texture is doing the modelling: eleven smooth
    // ovoids read as boulders only once something breaks the surface of each one. Every rock gets
    // its own ry, so the triplanar map lands differently on each and they stop looking cast.
    for (let i = 0; i < 11; i++) {
      const a = i * 2.399, r = 1.0 + (i % 4) * .42;
      ball(2.0 + Math.sin(a) * r, .34 + (i % 3) * .46, 9.0 + Math.cos(a) * r * .7,
        .82, .62, .74, i % 2 ? col.stone : col.stoneD,
        { ry: a, ...STONE, matScale: .55, matAmt: .36 });
    }
    solid(.2, 3.8, 7.9, 10.1);
    blocker(.2, 3.8, 7.9, 10.1, 2.6);
    // a lamp on each path junction, warm at night
    // Off the gate axis, not on it: at GX the first thing you saw coming in from the subway was a
    // lamp post three metres in front of your face.
    //
    // These were a charcoal pole with a flat white box on top — a car park floodlight, which is
    // what the comment on `lamp` above says it was written to replace. It was, and then it was
    // never called. It is called now, and it carries the four real point lights.
    for (const [lx, lz] of [[GX - 2.8, -RZ + 5.2], [-11.4, 5.4], [1.2, 5.4], [-2.0, RZ - 3.0]])
      lamp(lx, lz);
  }

  build();

  // Wind moves the planting and the recently-used pendulum; the duck makes a slow, contained
  // drift across the lake rather than sitting on the water like another lily pad.
  function tick(t) {
    for (let i = 0; i < sways.length; i++) {
      const p = sways[i], b = p.ob;
      const a = Math.sin(t * .7 + i * .41) * .055 + Math.sin(t * 1.9 + i) * .018;
      p.m = transform(b.x, b.y, b.z, b.sx, b.sy, b.sz, { rz: a, ry: b.ry });
    }
    const dx = Math.sin(t * .15) * .28 + Math.sin(t * .071 + 1.2) * .07;
    const dz = Math.sin(t * .11 + 1.7) * .16;
    const bob = Math.sin(t * .86) * .010;
    for (const q of duckParts) {
      q.p.m[12] = q.m0[12] + dx;
      q.p.m[13] = q.m0[13] + bob;
      q.p.m[14] = q.m0[14] + dz;
    }
    const wind = typeof Weather !== 'undefined' && Weather.now ? Weather.now.wind : .18;
    const a = Math.sin(t * .63) * (.025 + wind * .060) + Math.sin(t * 1.31 + .8) * .009;
    const c = Math.cos(a), s = Math.sin(a), py = 1.47, pz = EZ + .8;
    for (const q of pendulumParts) {
      const p = q.p, m = p.m, b = q.m0;
      for (let j = 0; j < 3; j++) {
        const o = j * 4, y = b[o + 1], z = b[o + 2];
        m[o] = b[o]; m[o + 1] = c * y - s * z;
        m[o + 2] = s * y + c * z; m[o + 3] = b[o + 3];
      }
      const y = b[13] - py, z = b[14] - pz;
      m[12] = b[12]; m[13] = py + c * y - s * z; m[14] = pz + s * y + c * z; m[15] = 1;
      if (q.ob) {
        const oy = q.ob.y - py, oz = q.ob.z - pz;
        p.ob.y = py + c * oy - s * oz; p.ob.z = pz + s * oy + c * oz;
      }
    }
  }
  function setNight(k) {
    const soft = k * k * (3 - 2 * k);
    for (const { p, k: kk } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) + soft * kk * .34;
  }

  return B.finish({
    setNight, tick, RX, RZ, OUT,
    label: '公园', labelK: '公园 · the park',
    indoor: false, cutaway: false, near: .18, far: 620,
    fogNear: 26, fogD: .0062, expose: .52,
    spawn: { x: GX, z: -RZ + 2.60, yaw: 0 },
    zones: [{ id: 'park', x0: -RX + .4, x1: RX - .4, z0: -RZ + .4, z1: RZ - .4,
              light: [GX, 3.6, -RZ + 6.0] }],
    roomAt() { return this.zones[0]; },
  });
});
