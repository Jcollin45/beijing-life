// 夜市 — the night market, down the covered lane off the east end of the hutong.
//
// The only place in this game that does not exist during the day. Every other room keeps hours in
// the weak sense — a shutter comes down at ten and the door refuses you — but this one is a lane
// of concrete and shuttered roller doors until about seven in the evening, when the carts are
// wheeled in and it becomes the loudest, brightest, best-smelling forty metres in the district.
// The gate on the hutong says as much: it is dark and bolted at noon and lit up at eight.
//
// What that buys, beyond the pleasure of it, is a reason to be out after dark. Everything else the
// player needs — the shop, the office, the noodle place — is a daytime errand, and a life sim in
// which the evening is only the bit before you sleep is missing half of a life. It also buys the
// one register of Chinese the rest of the game cannot teach: the food-stall exchange. 老板，来两串。
// 多少钱？辣不辣？ Short, loud, transactional, and the single most useful thing a learner can say
// in the first month.
//
// Outdoors. There is a roof of sorts — the canopies and the bulb strings between them — but the
// sky is over it, the weather falls into it, and the renderer treats it exactly like the hutong.
const NightMarket = Lazy('NightMarket', () => {
  const col = {
    // The lane itself: old concrete, patched, and wet-looking under the lights whatever the
    // weather is doing, because a market lane always is.
    ground: C('#4a463f'), groundD: C('#3b3831'), groundL: C('#575249'),
    drain: C('#2e2b26'), kerb: C('#6e685e'),
    brick: C('#6b625a'), brickD: C('#544c45'), render: C('#7d746a'),
    shutter: C('#5d6166'), shutterD: C('#44484d'),
    tileR: C('#4a4f54'), tileRD: C('#383c40'),
    // The stalls. Painted steel carts, canvas canopies in the two colours every awning in
    // China is, and a great deal of stainless.
    steel: C('#a7adb2'), steelD: C('#767c82'), steelL: C('#c3c9ce'),
    black: C('#22262b'), charcoal: C('#33383d'),
    canvasR: C('#a8372a'), canvasW: C('#d8d2c4'), canvasB: C('#2f6392'),
    pole: C('#8b8f93'),
    // Fire, coals and light. These are the reason to come.
    coal: C('#c9421f'), coalHot: C('#f08a3a'), flame: C('#e8913c'),
    bulb: C('#f7e6b8'), bulbWarm: C('#f0c878'), lantern: C('#c0392b'), lanternL: C('#e05a44'),
    neonR: C('#e04a3a'), neonG: C('#48c07a'), neonB: C('#4aa8e0'),
    // Food.
    meat: C('#8f4a34'), meatD: C('#6d3626'), fat: C('#d8bfa0'), skewer: C('#c9b07c'),
    haw: C('#c4302b'), hawGloss: C('#e05a4a'), sugar: C('#e8b45a'),
    dough: C('#e8d9b4'), doughD: C('#c9ad78'), egg: C('#e8c860'),
    green: C('#4e7a44'), greenL: C('#6b9a56'), chilli: C('#b8342a'),
    melon: C('#3f7a44'), orange: C('#d98a2b'), grape: C('#6a4f8a'),
    plastic: C('#c5453a'), plasticB: C('#2f6392'), plasticY: C('#d9b02f'),
    wood: C('#7a5a40'), woodD: C('#5d4530'),
    white: C('#eceae2'), cream: C('#e6dcc6'), paper: C('#f0ead8'),
    ice: C('#b8d4dd'), can: C('#3f7a6a'), bottle: C('#3d6b4a'),
  };
  const G = { matte: .05, wood: .20, paint: .16, metal: .58, glass: .80, fabric: .04 };

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, flat, glyphs, modelOr,
          solid, blocker, shade, glow, thing, transform } = B;

  // ---------------------------------------------------------------- dimensions
  // A lane, not a square: twenty-six metres long and seven wide, walls both sides, stalls down
  // both walls and a gangway up the middle wide enough for two people to pass and no wider. That
  // narrowness is the whole feeling of the place and it is the one measurement worth defending —
  // widened to ten metres this reads as a car park with tables in it.
  const RX = 3.6, RZ = 13.0;              // half-width, half-length of the walkable lane
  const WH = 5.4;                         // the walls either side
  const OUT = { x: 4.60, z: 2.60, yaw: Math.PI };   // back out onto the hutong

  // Everything whose brightness rides the clock, and the coals, which have their own life.
  const litProps = [], coals = [], steamRigs = [], swings = [];
  const litten = (p, k) => { litProps.push({ p, k }); return p; };
  function swingingPart(rig, p) {
    rig.parts.push({ p, m0: new Float32Array(p.m) });
    p.fixed = true; p.cx = rig.x; p.cy = rig.cy; p.cz = rig.z; p.r = rig.r;
    return p;
  }

  // A real light, as opposed to the emissive bead that shows where the bulb is. Both are wanted
  // and neither substitutes for the other: `litten(ball(...))` is what a bulb looks like from
  // across the lane, this is what it does to the cart under it. Collected with the power it was
  // declared at, so `setNight` can bring the whole lane up as the daylight goes — this street
  // has no daytime and the lamps are the only light in it.
  const lamps = [];
  const lamp = (x, y, z, c, power, radius) => {
    const l = B.light(x, y, z, c, power, radius);
    l.p0 = power; lamps.push(l); return l;
  };

  // ---------------------------------------------------------------- pieces
  //
  // A canopy: two poles, a sloped sheet, and a scalloped valance along the front edge. Striped,
  // because every market awning in the country is, and the stripe runs across the slope.
  function canopy(cx, cz, w, d, side, a, bCol) {
    const y = 2.42, drop = .26;
    const n = Math.max(3, Math.round(w / .34));
    for (let i = 0; i < n; i++) {
      const t = -w / 2 + (i + .5) * (w / n);
      box(cx + t, y, cz - side * d * .10, w / n * .98, .035, d, i % 2 ? a : bCol,
        { hard: true, rx: side * .12, gloss: G.fabric, mode: 7, tag: '摊子',
          mat: 'fabric', matScale: .42, matAmt: .30 });
    }
    // the valance, hanging off the front lip
    for (let i = 0; i < n; i++) {
      const t = -w / 2 + (i + .5) * (w / n);
      box(cx + t, y - drop / 2 - .09, cz - side * (d / 2 + .04), w / n * .96, drop, .02,
        i % 2 ? a : bCol, { hard: true, gloss: G.fabric, mode: 7, tag: '摊子',
          mat: 'fabric', matScale: .42, matAmt: .30 });
    }
    for (const sx of [-1, 1])
      cyl(cx + sx * (w / 2 - .10), 1.20, cz + side * (d / 2 - .10), .026, 2.40, col.pole,
        { gloss: G.metal, tag: '摊子' });
    // The string of bulbs pinned along the front lip. Warm, small, and the reason the whole lane
    // reads as a market from the gate rather than as a row of sheds.
    const bulbs = Math.max(4, Math.round(w / .46));
    for (let i = 0; i < bulbs; i++) {
      const t = -w / 2 + .14 + i * ((w - .28) / (bulbs - 1));
      litten(ball(cx + t, y - .16, cz - side * (d / 2 + .05), .035, .045, .035, col.bulb,
        { mode: 1, glow: .5, tag: '摊子' }), 1.5);
    }
    // What that string actually does. One lamp per canopy, hung on the front lip a little under
    // the beads so the stock, the cook and whoever is standing in front of the cart are all
    // inside its pool — and so the lane between two stalls stays dark, which is what makes each
    // stall read as its own island of light rather than as part of a lit corridor.
    lamp(cx, y - .30, cz - side * (d / 2 + .05), [1.00, .86, .62], .70, 2.60);
  }

  // A cart: the stainless box every one of these stalls is built on, with a shelf under it and
  // four little castors that are always half seized.
  function cart(cx, cz, w, d, tag) {
    // Stainless that has been wheeled up a lane every night for ten years: the tiling metal is
    // what carries the dents and the wipe marks the flat colour cannot.
    const M2 = { mat: 'metal', matScale: .70, matAmt: .30 };
    box(cx, .86, cz, w, .06, d, col.steelL, { hard: true, gloss: G.metal, tag, ...M2 });
    box(cx, .56, cz, w - .06, .54, d - .04, col.steel, { hard: true, gloss: .42, tag, ...M2 });
    box(cx, .30, cz, w - .14, .04, d - .12, col.steelD, { hard: true, gloss: .38, tag, ...M2 });
    for (const ox of [-1, 1]) for (const oz of [-1, 1])
      cyl(cx + ox * (w / 2 - .12), .10, cz + oz * (d / 2 - .10), .05, .20, col.black,
        { gloss: .30, tag });
    solid(cx - w / 2 - .06, cx + w / 2 + .06, cz - d / 2 - .06, cz + d / 2 + .06);
    shade(cx, cz, w + .5, d + .5, .30);
  }

  // A price board propped on the back of a cart. Chalk on black, which is what they all are.
  function board(cx, cy, cz, yaw, text, size) {
    box(cx, cy, cz, size * text.length * 1.20 + .16, size * 1.7, .03, col.charcoal,
      { hard: true, ry: yaw, gloss: .10, tag: '价钱' });
    glyphs(cx, cy, cz + Math.cos(yaw) * .022, yaw, text,
      { size, color: col.cream, mode: 1, glow: .12, tag: '价钱' });
  }

  // A red lantern on a bracket off the wall. Built the same way the hutong's are, and for the same
  // reason the hutong's are built that way: drawn emissive it is a flat red disc with no shape in
  // it at all, and eight of those down a lane read as bugs rather than as lanterns. Lit, with a
  // gentle glow on top and gold caps top and bottom, it is a paper lantern.
  function lantern(x, y, z, r) {
    const rig = { x, z, cy: y + r * .65, r: r * 2.65 + .14,
                  py: y + r * 2.80, phase: swings.length * .91, parts: [] };
    swings.push(rig);
    swingingPart(rig,
      capsule(x, y + r * 1.9, z, .020, r * 1.8, .020, col.charcoal, { gloss: G.metal }));
    swingingPart(rig,
      litten(ball(x, y, z, r, r * .88, r, col.lantern, { gloss: .30, glow: .10 }), .60));
    for (const s of [-1, 1])
      swingingPart(rig,
        cyl(x, y + s * r * .88, z, r * .42, .04, col.sugar, { gloss: .30 }));
    for (let i = 0; i < 5; i++)
      swingingPart(rig,
        capsule(x + (i - 2) * .026, y - r * 1.45, z, .010, .14, .010,
          col.sugar, { gloss: .26 }));
    glow(M.trs(x, .03, z, 0, 1.9, 1, 1.9), C('#ff9c5e'), .10, false, 5);
  }

  // Steam or smoke off something hot: a column of soft puffs that the tick loop drives. Returned
  // as a rig so several sources can run at different rates off one clock.
  function steam(x, y, z, n, rise, spread, tint) {
    const props = [];
    for (let i = 0; i < n; i++)
      props.push(ball(x, y, z, .07, .06, .07, tint || col.white,
        { mode: 1, glow: .03, alpha: 0 }));
    const rig = { at: [x, y, z], rise, spread, props };
    steamRigs.push(rig);
    return rig;
  }

  // ---------------------------------------------------------------- the stalls
  //
  // Six of them, three a side, and each one is a different verb. That is the design rule for this
  // lane: a stall that sells a thing you cannot do anything with is set dressing, and there is
  // enough set dressing in here already.

  // 烧烤 — the charcoal grill. The heart of the place. A long steel trough of coals with forty
  // skewers laid across it, a man turning them, and smoke going up into the bulbs.
  function grill(cx, cz, side) {
    const T = { tag: '烧烤' };
    cart(cx, cz, 2.60, .90, '烧烤');
    // the trough, sunk into the top of the cart
    box(cx, .92, cz, 1.90, .14, .34, col.charcoal, { hard: true, gloss: .28, ...T });
    box(cx, .95, cz, 1.80, .06, .28, col.black, { hard: true, gloss: .20, ...T });
    // the coals: a bed of them, each its own ember, and they breathe in the tick loop
    for (let i = 0; i < 26; i++) {
      const t = -.86 + (i % 13) * .143, r = ((i / 13) | 0) - .5;
      const c = litten(box(cx + t, .97, cz + r * .11, .12, .04, .09, col.coal,
        { hard: true, mode: 1, glow: .8, ...T }), .4);
      coals.push({ p: c, ph: i * 1.37 });
    }
    // the skewers, laid across the trough at a slight angle, meat threaded up one end
    for (let i = 0; i < 14; i++) {
      const t = -.84 + i * .129, tilt = (i % 3 - 1) * .06;
      cyl(cx + t, 1.02, cz, .006, .46, col.skewer,
        { rx: Math.PI / 2, ry: tilt, gloss: .14, ...T });
      for (let j = 0; j < 4; j++)
        box(cx + t, 1.035, cz - .13 + j * .075, .036, .036, .058,
          j % 2 ? col.meatD : col.meat, { hard: true, gloss: .30, ry: tilt, ...T });
    }
    // the smoke, which is the thing you see from the gate
    steam(cx, 1.14, cz, 9, 1.35, .30, C('#b9b2a4'));
    // the shaker of 孜然 and the one of chilli, which is the whole seasoning of this cuisine
    cyl(cx + 1.08, .96, cz - .22, .045, .16, col.chilli, { gloss: .34, ...T });
    cyl(cx + 1.20, .96, cz - .22, .045, .16, col.sugar, { gloss: .34, ...T });
    canopy(cx, cz + side * .55, 2.90, 1.70, side, col.canvasR, col.canvasW);
    board(cx - 1.05, 1.62, cz - side * .48, side > 0 ? Math.PI : 0, '羊肉串三块', .16);
    thing('烧烤', cx, 1.72, cz - side * .50, '老板，来五串羊肉串。',
      'Boss — five lamb skewers, please.',
      '烧 to roast + 烤 to grill. The word covers everything cooked over coals, and 串 is the ' +
      'measure word you order it in: 一串 is one skewer.',
      { focus: [cx, cz - side * 1.35], reach: 1.9 });
    thing('羊肉串', cx + .70, 1.24, cz - side * .40, '羊肉串要辣的。',
      'The lamb skewers — the spicy ones.',
      '羊肉 mutton + 串 a string of things on a stick. Ask for 辣的 or 不辣的.',
      { focus: [cx + .70, cz - side * 1.25], reach: 1.6 });
  }

  // 糖葫芦 — candied haws, standing in a straw column like a hedgehog. The one thing in this lane
  // a child would come for, and the easiest word in it to remember, because you can see it.
  function haws(cx, cz, side) {
    const T = { tag: '糖葫芦' };
    cart(cx, cz, 1.30, .80, '糖葫芦');
    // the straw post they are stuck into
    cyl(cx, 1.28, cz, .11, .78, col.doughD, { gloss: .16, ...T });
    cyl(cx, 1.68, cz, .12, .04, col.wood, { gloss: G.wood, ...T });
    for (let i = 0; i < 30; i++) {
      const a = i * 1.257, ring = (i / 10) | 0;
      const r = .11 + .02, y = 1.02 + ring * .24;
      const dx = Math.cos(a) * r, dz = Math.sin(a) * r;
      cyl(cx + dx * 1.6, y + .12, cz + dz * 1.6, .005, .34, col.skewer,
        { gloss: .14, ry: a, rz: .34, ...T });
      for (let j = 0; j < 4; j++)
        ball(cx + dx * (1.9 + j * .62), y + .26 + j * .075, cz + dz * (1.9 + j * .62),
          .032, .032, .032, j === 0 ? col.hawGloss : col.haw,
          { mode: 0, gloss: .52, ...T });
    }
    canopy(cx, cz + side * .50, 1.70, 1.50, side, col.canvasR, col.canvasW);
    board(cx - .52, 1.60, cz - side * .44, side > 0 ? Math.PI : 0, '五块一串', .15);
    thing('糖葫芦', cx, 1.86, cz - side * .46, '糖葫芦，五块钱一串。',
      'Tanghulu — five kuai a stick.',
      '糖 sugar + 葫芦 gourd, for the shape of the string. Hawthorns dipped in molten sugar, ' +
      'the oldest street sweet in Beijing.',
      { focus: [cx, cz - side * 1.20], reach: 1.7 });
  }

  // 煎饼 — the griddle. A woman spreads batter on a hot plate with a wooden T, cracks an egg on
  // it, and folds the whole thing round a sheet of fried cracker in about ninety seconds.
  function pancake(cx, cz, side) {
    const T = { tag: '煎饼' };
    cart(cx, cz, 1.90, .86, '煎饼');
    // the round hot plate, and the batter on it
    cyl(cx - .32, .91, cz, .40, .05, col.charcoal, { gloss: .34, ...T });
    litten(cyl(cx - .32, .935, cz, .36, .012, col.dough,
      { mode: 1, glow: .10, gloss: .20, ...T }), .5);
    cyl(cx - .32, .945, cz + .06, .11, .010, col.egg, { gloss: .30, ...T });
    // the wooden spreader, resting on the lip
    cyl(cx + .06, .96, cz - .20, .010, .26, col.wood, { rx: Math.PI / 2, ry: .5, ...T });
    box(cx + .16, .96, cz - .30, .16, .012, .03, col.wood, { hard: true, ry: .5, ...T });
    // the batter bucket and the box of crackers
    cyl(cx + .58, 1.00, cz + .10, .17, .24, col.steel, { gloss: G.metal, ...T });
    box(cx + .74, .96, cz - .22, .30, .14, .24, col.doughD, { hard: true, gloss: .16, ...T });
    steam(cx - .32, 1.02, cz, 7, .95, .22, col.white);
    canopy(cx, cz + side * .52, 2.20, 1.60, side, col.canvasB, col.canvasW);
    board(cx - .78, 1.60, cz - side * .46, side > 0 ? Math.PI : 0, '煎饼八块', .16);
    thing('煎饼', cx, 1.74, cz - side * .48, '一个煎饼，加个鸡蛋。',
      'One jianbing, with an egg in it.',
      '煎 to shallow-fry + 饼 a flatbread. 加 means "add" and is the whole of ordering one: ' +
      '加鸡蛋, 加辣, 加两个.',
      { focus: [cx, cz - side * 1.30], reach: 1.8 });
  }

  // 炒面 — the wok. Fried noodles, and a gas ring under it that goes up in a sheet of flame
  // every time the pan is tossed, which is the other thing you see from the gate.
  function wok(cx, cz, side) {
    const T = { tag: '炒面' };
    cart(cx, cz, 2.10, .88, '炒面');
    cyl(cx - .30, .90, cz, .30, .10, col.black, { gloss: .32, ...T });
    ball(cx - .30, .99, cz, .32, .16, .32, col.charcoal, { gloss: .40, ...T });
    ball(cx - .30, 1.03, cz, .26, .09, .26, col.doughD, { gloss: .28, ...T });
    // the flame under it, which the tick loop flickers
    const fl = litten(ball(cx - .30, .90, cz, .24, .12, .24, col.flame,
      { mode: 1, glow: 1.1, alpha: .55, ...T }), .2);
    // A gas ring is the one light in this lane that is not steady, and the only one worth
    // spending a moving light on: the pan goes up and for half a second the cart, the cook and
    // the tarpaulin behind him all get brighter. Driven from `tick` off the same toss the
    // flame's own alpha is.
    const flLight = lamp(cx - .30, 1.02, cz, [1.00, .52, .20], .45, 1.90);
    coals.push({ p: fl, ph: 2.2, flame: true, light: flLight });
    // the ladle, the noodle tray, the bowls
    cyl(cx + .12, 1.14, cz - .16, .009, .34, col.steelD, { rx: .9, ry: .6, gloss: G.metal, ...T });
    box(cx + .60, .95, cz + .04, .46, .12, .34, col.steel, { hard: true, gloss: .40, ...T });
    for (let i = 0; i < 5; i++)
      cyl(cx + .60, .99 + i * .012, cz + .04, .19, .012, col.doughD, { gloss: .18, ...T });
    for (let i = 0; i < 4; i++)
      cyl(cx + .92, .92 + i * .055, cz - .24, .075, .055, col.white, { gloss: .26, ...T });
    steam(cx - .30, 1.16, cz, 8, 1.15, .26, col.white);
    canopy(cx, cz + side * .54, 2.40, 1.65, side, col.canvasR, col.canvasW);
    board(cx - .86, 1.60, cz - side * .46, side > 0 ? Math.PI : 0, '炒面十块', .16);
    thing('炒面', cx, 1.74, cz - side * .48, '一份炒面，多放辣椒。',
      'One portion of fried noodles, plenty of chilli.',
      '炒 to stir-fry + 面 noodles. 一份 is the measure for a portion of cooked food.',
      { focus: [cx, cz - side * 1.30], reach: 1.8 });
  }

  // 水果 — the fruit stall, which is here because it is the one stall on any Chinese street that
  // is open when everything else has shut, and because a market with no colour in it that is not
  // fire is a grim market.
  function fruit(cx, cz, side) {
    const T = { tag: '水果' };
    cart(cx, cz, 2.20, .95, '水果');
    // sloped crates, the way fruit is always shown
    const rows = [[-.70, col.orange], [0, col.melon], [.70, col.grape]];
    for (const [ox, c] of rows) {
      box(cx + ox, .98, cz, .64, .10, .70, col.woodD,
        { hard: true, rx: -.22, gloss: G.wood, ...T });
      for (let i = 0; i < 12; i++) {
        const gx = (i % 4 - 1.5) * .14, gz = ((i / 4 | 0) - 1) * .18;
        ball(cx + ox + gx, 1.06 + gz * .18, cz + gz, .058, .055, .058, c,
          { gloss: .34, ...T });
      }
    }
    // the scale, which is what the whole transaction turns on and what every argument here is about
    box(cx + 1.00, .96, cz - .26, .26, .12, .22, col.white, { hard: true, gloss: .30, ...T });
    litten(box(cx + 1.00, 1.04, cz - .26, .16, .05, .02, col.neonR,
      { hard: true, mode: 1, glow: .5, ...T }), .8);
    canopy(cx, cz + side * .54, 2.50, 1.70, side, col.canvasW, col.canvasB);
    board(cx - .92, 1.60, cz - side * .46, side > 0 ? Math.PI : 0, '一斤五块', .16);
    thing('水果', cx, 1.74, cz - side * .48, '这个多少钱一斤？',
      'How much is this a jin?',
      '斤 is half a kilo and is how everything on this cart is priced. 多少钱一斤 is the ' +
      'sentence you will use most often in any Chinese market.',
      { focus: [cx, cz - side * 1.32], reach: 1.8 });
  }

  // 饮料 — the drinks chest. A chest freezer full of ice and bottles, humming, with a strip light
  // in the lid. Beer, tea, and the sugary yoghurt drink that is on every one of these carts.
  function drinks(cx, cz, side) {
    const T = { tag: '饮料' };
    cart(cx, cz, 1.60, .90, '饮料');
    box(cx, 1.02, cz, 1.46, .26, .78, col.steelL, { hard: true, gloss: .46, ...T });
    box(cx, 1.10, cz, 1.30, .10, .62, col.ice, { hard: true, gloss: .62, ...T });
    for (let i = 0; i < 14; i++) {
      const gx = (i % 7 - 3) * .17, gz = ((i / 7 | 0) - .5) * .28;
      cyl(cx + gx, 1.16, cz + gz, .034, .13,
        i % 3 === 0 ? col.can : i % 3 === 1 ? col.bottle : col.white,
        { gloss: .48, rz: (i % 2 ? .2 : -.2), ...T });
    }
    litten(box(cx, 1.20, cz - .38, 1.20, .03, .03, col.neonB,
      { hard: true, mode: 1, glow: .6, ...T }), 1.0);
    canopy(cx, cz + side * .50, 1.90, 1.50, side, col.canvasB, col.canvasW);
    board(cx - .66, 1.58, cz - side * .44, side > 0 ? Math.PI : 0, '啤酒五块', .15);
    thing('饮料', cx, 1.72, cz - side * .46, '来一瓶啤酒，冰的。',
      'A bottle of beer — a cold one.',
      '饮料 covers everything drinkable that is not tea or water. 冰的 — the cold one — is ' +
      'worth learning on its own.',
      { focus: [cx, cz - side * 1.24], reach: 1.7 });
  }

  // A folding table with four wood-frame stools and cheap red/blue seat caps round it. The exact
  // hard cap remains native as the sitting support; if the shared model is unavailable, the old
  // procedural frame is restored in full. Half the market is people eating standing up; the
  // other half is sitting at one of these with a beer, and that is where the evening goes.
  function table(cx, cz, ry) {
    const T = { tag: '桌子' };
    box(cx, .70, cz, .90, .04, .90, col.plasticY, { hard: true, ry, gloss: .30, ...T });
    for (const ox of [-1, 1]) for (const oz of [-1, 1])
      cyl(cx + ox * .38, .35, cz + oz * .38, .018, .70, col.steelD, { gloss: G.metal, ry, ...T });
    for (let i = 0; i < 4; i++) {
      const a = ry + i * Math.PI / 2;
      const sx = cx + Math.sin(a) * .80, sz = cz + Math.cos(a) * .80;
      const cc = i % 2 ? col.plastic : col.plasticB;
      const nativeStool = () => {
        box(sx, .42, sz, .32, .04, .32, cc,
          { hard: true, ry: a, gloss: .30, ...T });
        for (const ox of [-1, 1]) for (const oz of [-1, 1])
          cyl(sx + ox * .12, .21, sz + oz * .12, .014, .42, cc,
            { gloss: .26, ...T });
        return null;
      };
      const rendered = modelOr('chinese_stool', sx, 0, sz, .63435827,
        { ry: a, gloss: .22, ...T }, nativeStool);
      if (rendered) box(sx, .42, sz, .32, .04, .32, cc,
        { hard: true, ry: a, gloss: .30, ...T });
    }
    // what is on it: two bowls, a beer, a pile of used skewers in a glass
    cyl(cx - .18, .76, cz + .12, .085, .07, col.white, { gloss: .28, ...T });
    cyl(cx + .16, .76, cz - .08, .085, .07, col.white, { gloss: .28, ...T });
    cyl(cx + .30, .82, cz + .22, .034, .20, col.bottle, { gloss: .55, ...T });
    cyl(cx - .30, .78, cz - .24, .045, .11, col.white, { gloss: .30, ...T });
    for (let i = 0; i < 5; i++)
      cyl(cx - .30, .90, cz - .24, .005, .20, col.skewer,
        { rz: (i - 2) * .09, ry: i * 1.1, gloss: .14, ...T });
    shade(cx, cz, 2.0, 2.0, .26);
    solid(cx - .55, cx + .55, cz - .55, cz + .55);
  }

  // ---------------------------------------------------------------- the lane
  function build() {
    // ---- ground. Old concrete with a drain down the middle, which is where all of this drains.
    // The tiling road surface goes on top of the procedural asphalt rather than instead of it:
    // mode 10 is broad wear down the middle of the lane, this is the aggregate you see when you
    // are standing on it. 1.8 m per repeat, so the pattern never becomes a visible tile.
    flat(0, 0, 0, RX * 2 + 2.4, RZ * 2 + 2, col.ground,
      { mode: 10, gloss: .16, mat: 'asphalt', matScale: 1.8, matAmt: .34 });
    for (let i = -12; i <= 12; i++)
      flat(0, .004, i * 1.10, RX * 2 + 2.4, .05, col.groundD, { mode: 10, gloss: .12 });
    flat(0, .006, 0, .34, RZ * 2 + 2, col.drain, { mode: 10, gloss: .28 });
    for (let i = -11; i <= 11; i++)
      box(0, .012, i * 1.20, .30, .02, .10, col.charcoal, { hard: true, gloss: .34 });

    // ---- the two walls. Low brick on the west, a run of shuttered back-doors on the east: the
    // rear of the parade whose fronts face the road, which is exactly what a lane like this is.
    for (const s of [-1, 1]) {
      const wx = s * (RX + .55);
      // Only the rendered side takes a tiling material. mode 11 already lays 青砖 in running
      // bond at 7.6 cm courses, and a photographed brick over the top of it is two brick
      // patterns at two sizes on one wall; mode 14 is broad patchiness with nothing at plaster
      // scale in it, which is exactly the gap a material fills.
      box(wx, WH / 2, 0, .40, WH, RZ * 2 + 2, s < 0 ? col.brick : col.render,
        { hard: true, mode: s < 0 ? 11 : 14, gloss: G.matte,
          mat: s < 0 ? undefined : 'plaster', matScale: 2.4, matAmt: .28 });
      blocker(wx - .9, wx + .9, -RZ - 1, RZ + 1, WH + 1.4);
      solid(wx - s * .0 - .30, wx + .30, -RZ - 1, RZ + 1);
      // a parapet and a run of tiles along the top, so the wall has an edge against the sky
      box(wx, WH + .16, 0, .52, .32, RZ * 2 + 2, col.brickD, { hard: true, gloss: G.matte });
      box(wx, WH + .36, 0, .60, .08, RZ * 2 + 2, col.tileR, { hard: true, gloss: .22 });
    }
    // roller shutters down the east wall, all of them shut: this is the back of the parade
    for (let i = -4; i <= 4; i++) {
      const z = i * 2.6;
      // `metal` rather than `steel`: the corrugation on a roller shutter is already modelled as
      // the thirteen ribs below, and the corrugated-steel material would lay a second set of
      // waves across them at a different pitch. What is wanted here is the wear.
      box(RX + .32, 1.30, z, .06, 2.60, 1.90, col.shutter,
        { hard: true, gloss: .30, mat: 'metal', matScale: .90, matAmt: .30 });
      for (let j = 0; j < 13; j++)
        box(RX + .28, .18 + j * .20, z, .02, .06, 1.86, col.shutterD, { hard: true, gloss: .26 });
      box(RX + .30, 2.68, z, .10, .16, 2.05, col.charcoal, { hard: true, gloss: .24 });
    }
    // an air-conditioner and a bundle of cable on the west wall, because there always is
    for (const z of [-8.4, -1.2, 6.8]) {
      box(-RX - .30, 3.10, z, .12, .58, .84, col.white, { hard: true, gloss: .26 });
      box(-RX - .34, 3.10, z, .04, .40, .60, col.steelD, { hard: true, gloss: .34 });
    }
    for (let i = 0; i < 3; i++)
      box(-RX - .30, 4.20 + i * .10, 0, .05, .05, RZ * 2, col.black, { hard: true, gloss: .30 });

    // ---- the gate back onto the hutong, at the -z end. A steel arch with the two characters on
    // it in tube light, which is what tells you from the alley that the lane is open tonight.
    const gz = -RZ - .40;
    // The end wall the gate is a hole in. Without it the lane simply stopped and you looked
    // straight out at the sky dome — a slab of dusk pink hanging where the hutong should be,
    // which is the single most obvious way an interior-feeling outdoor scene gives itself away.
    // Two returns and a header, leaving a 2.8 m opening, and a dark panel a little way beyond it
    // so what you see through the gap is a shadowed alley rather than a hole punched in the world.
    for (const s of [-1, 1])
      box(s * 2.72, 2.70, gz, 2.30, 5.40, .44, col.brick,
        { hard: true, mode: 11, gloss: G.matte });
    box(0, 4.60, gz, 3.20, 1.60, .44, col.brick, { hard: true, mode: 11, gloss: G.matte });
    box(0, 5.46, gz, RX * 2 + 1.2, .30, .56, col.brickD, { hard: true, gloss: G.matte });
    solid(-RX - 1, -1.40, gz - .30, gz + .30);
    solid(1.40, RX + 1, gz - .30, gz + .30);
    blocker(-RX - 1, RX + 1, gz - 1.2, gz + .4, 6.2);
    // what you see through the opening: the far side of the hutong, in the dark
    box(0, 2.00, gz - 2.60, 4.40, 4.00, .20, C('#2b2621'), { hard: true, gloss: .10 });
    for (const s of [-1, 1])
      cyl(s * (RX - .10), 1.65, gz, .07, 3.30, col.steelD, { gloss: G.metal, tag: '门口' });
    box(0, 3.36, gz, RX * 2 + .40, .22, .18, col.steelD, { hard: true, gloss: G.metal, tag: '门口' });
    box(0, 3.86, gz, RX * 2 - .30, .78, .10, col.charcoal, { hard: true, gloss: .20, tag: '门口' });
    glyphs(0, 3.86, gz - .07, Math.PI, '夜市',
      { size: .58, color: col.neonR, mode: 1, glow: .95, tag: '门口' });
    for (const s of [-1, 1])
      litten(box(s * 1.5, 3.86, gz - .10, .06, .70, .04, col.neonG,
        { hard: true, mode: 1, glow: .8, tag: '门口' }), 1.2);
    thing('门口', 0, 2.60, gz + .30, '从这儿出去就是胡同。',
      'Out through here is the hutong.',
      '门口 is the doorway rather than the door: where you stand, not what you open.',
      { focus: [0, gz + 1.5], reach: 2.4 });

    // ---- the bulb strings, zigzagging the width of the lane the whole way up it. This is the
    // single most important object in the scene: it is what turns a concrete alley into a market
    // and it is what the player sees first from the gate.
    for (let i = 0; i < 11; i++) {
      const z = -RZ + 1.0 + i * 2.4, s = i % 2 ? 1 : -1;
      box(0, 3.55, z, RX * 2 + .6, .015, .015, col.black, { hard: true, ry: s * .10, gloss: .2 });
      for (let j = 0; j < 9; j++) {
        const t = (j / 8 - .5) * (RX * 2 + .4);
        const sag = Math.cos((j / 8 - .5) * Math.PI) * .16;
        litten(ball(t, 3.55 - sag - .06, z + t * s * .10, .042, .052, .042,
          j % 3 === 1 ? col.bulbWarm : col.bulb, { mode: 1, glow: .55 }), 1.6);
      }
    }
    // and the pools of light they throw on the ground, so the lane is lit rather than merely
    // hung with bright dots
    for (let i = 0; i < 11; i++) {
      const z = -RZ + 1.0 + i * 2.4;
      glow(M.trs(0, .05, z, 0, 7.6, 1, 4.8), col.bulbWarm, .30, false, 5);
    }
    // Three of the eleven strings carry a real light as well as beads and a pool. They are the
    // three that hang over lane and not over a cart: outside each cluster of stalls and at the
    // far end, which are the stretches a stall lamp does not reach and where a market with only
    // six lights in it would go to black between them. Weaker and wider than a stall lamp, hung
    // at the height of the string, so the middle of the lane is walkable rather than lit.
    for (const z of [-4.8, 0, 7.2]) lamp(0, 3.36, z, [1.00, .88, .68], .60, 3.60);
    // red lanterns off both walls, spaced between the strings
    for (let i = 0; i < 6; i++) {
      const z = -RZ + 2.2 + i * 4.4;
      for (const s of [-1, 1]) lantern(s * (RX + .10), 3.05, z, .155);
    }

    // ---- the stalls. West side first, running from the gate inward, then east.
    grill(-RX + 1.30, -8.2, -1);
    pancake(-RX + 1.30, -2.4, -1);
    fruit(-RX + 1.35, 4.2, -1);
    haws(RX - 1.10, -9.0, 1);
    wok(RX - 1.25, -3.0, 1);
    drinks(RX - 1.05, 3.6, 1);

    // ---- the eating tables, down the middle where they always are, in everybody's way
    table(-.9, -6.0, .2);
    table(1.0, -0.6, -.35);
    table(-.7, 5.8, .5);
    table(1.1, 9.6, .15);

    // ---- the far end. A wall, a bin overflowing with skewers and cups, and a scooter parked
    // against it, so the lane ends in something rather than in fog.
    box(0, WH / 2, RZ + .70, RX * 2 + 1.5, WH, .40, col.brick,
      { hard: true, mode: 11, gloss: G.matte });
    blocker(-RX - 1, RX + 1, RZ + .2, RZ + 2, WH + 1);
    solid(-RX - 1, RX + 1, RZ + .40, RZ + 2);
    cyl(-1.9, .42, RZ + .05, .30, .84, col.green, { gloss: .26, tag: '垃圾桶' });
    cyl(-1.9, .86, RZ + .05, .32, .05, col.charcoal, { gloss: .22, tag: '垃圾桶' });
    for (let i = 0; i < 9; i++)
      cyl(-1.9 + (i % 3 - 1) * .09, .95, RZ + .05 + ((i / 3 | 0) - 1) * .09, .005, .22,
        col.skewer, { rz: (i % 5 - 2) * .16, ry: i * .9, gloss: .14, tag: '垃圾桶' });
    thing('垃圾桶', -1.9, 1.14, RZ - .10, '串儿吃完了，签子扔垃圾桶。',
      'When the skewers are done, the sticks go in the bin.',
      '垃圾 rubbish + 桶 bucket, barrel.',
      { focus: [-1.9, RZ - .70], reach: 1.5 });
    // the scooter
    box(1.7, .52, RZ + .10, .34, .26, 1.30, col.plasticB, { gloss: .34, ry: .18 });
    for (const oz of [-.52, .50])
      cyl(1.7 + oz * .16, .22, RZ + .10 + oz, .21, .09, col.black,
        { rx: Math.PI / 2, ry: .18, gloss: .24 });
    box(1.7, .82, RZ - .38, .30, .10, .38, col.charcoal, { hard: true, ry: .18, gloss: .28 });

    // ---- the word for the whole place, on the wall by the gate
    thing('夜市', -RX - .20, 2.30, -RZ + 2.4, '夜市七点才开，晚上最热闹。',
      'The night market only opens at seven; the evening is when it is liveliest.',
      '夜 night + 市 market. 热闹 — hot and noisy — is the word Chinese uses for a place ' +
      'being lively, and it is a compliment.',
      { focus: [-RX + .70, -RZ + 2.4], reach: 2.2 });
    thing('摊主', 0, 1.60, -6.9, '老板，多少钱？',
      'Boss — how much?',
      'Everyone behind a stall is 老板 to their face, whatever the dictionary says the word ' +
      'for their job is.',
      { focus: [-1.5, -7.6], reach: 1.8 });
  }

  build();

  // ---------------------------------------------------------------- alive
  //
  // Three things move in here and the lane is dead without all three: the coals breathe, the wok
  // flares, and the smoke goes up. Everything else is geometry.
  function tick(t) {
    for (let i = 0; i < coals.length; i++) {
      const c = coals[i];
      if (c.flame) {
        // A gas ring is not a flicker, it is a roar with gusts in it. Two fast sines beating,
        // and every few seconds the pan is tossed and the whole thing goes up.
        const toss = Math.max(0, Math.sin(t * .42 + c.ph) - .93) * 14;
        const base = .55 + Math.sin(t * 9.1 + c.ph) * .12 + Math.sin(t * 21.7) * .06;
        c.p.alpha = Math.min(1, base * .6 + toss * .5);
        c.p.glow = 1.0 + toss * 1.6;
        const s = 1 + toss * .9;
        c.p.m = transform(c.p.ob.x, c.p.ob.y + toss * .22, c.p.ob.z,
                          c.p.ob.sx * s, c.p.ob.sy * (1 + toss * 2.2), c.p.ob.sz * s, {});
        // The light the ring throws, off the same toss. `p0` rather than `power` because
        // `setNight` scales the declared power by how dark it is outside — writing `power`
        // here would be the two of them overwriting each other every frame.
        if (c.light) c.light.p0 = .34 + base * .26 + toss * .55;
        continue;
      }
      // Coals: each ember on its own slow cycle, so the bed shifts rather than pulsing as one.
      const k = .55 + .45 * Math.sin(t * (.9 + (i % 5) * .13) + c.ph);
      c.p.glow = .45 + k * .85;
      c.p.color = k > .62 ? col.coalHot : col.coal;
    }
    // Smoke and steam. Same rig as the flat's kettle, at a market's scale: the puffs rise,
    // spread as they go and fade out, and they lean with the wind, so on a windy night the smoke
    // off the grill lies down the lane instead of going straight up.
    const lean = typeof Weather !== 'undefined'
      ? [Math.sin(Weather.now.dir) * Weather.now.wind * 1.6,
         Math.cos(Weather.now.dir) * Weather.now.wind * 1.6] : [0, 0];
    for (const rig of steamRigs) {
      const [sx, sy, sz] = rig.at;
      rig.props.forEach((p, i) => {
        const u = (t * .30 + i / rig.props.length) % 1;
        // Small at the source and three times the size by the time it has risen a metre. Puffs
        // that start large read as cotton wool glued to the pan.
        const s = .05 + u * .34;
        p.m = M.trs(sx + Math.sin(u * 5.1 + i * 2.3) * rig.spread * u + lean[0] * u * u * 2.2,
                    sy + u * rig.rise,
                    sz + Math.cos(u * 4.3 + i * 1.9) * rig.spread * u + lean[1] * u * u * 2.2,
                    0, s, s * .82, s);
        p.cy = sy + u * rig.rise;
        // Faint. Drawn emissive, so it is not lit by anything and a high alpha comes out as a
        // flat grey disc rather than as smoke — which is exactly what the first pass looked like.
        p.alpha = Math.sin(u * Math.PI) * .13;
      });
    }
    // The wall brackets are fixed; the suspended lantern assemblies hunt gently in the wind.
    // Rotating the cord, body, caps and tassels as one rig keeps them connected at every frame.
    const wind = typeof Weather !== 'undefined' && Weather.now ? Weather.now.wind : .18;
    for (const rig of swings) {
      const a = Math.sin(t * .58 + rig.phase) * (.010 + wind * .060)
              + Math.sin(t * 1.37 + rig.phase * 1.7) * (.004 + wind * .010);
      const c = Math.cos(a), s = Math.sin(a);
      for (const q of rig.parts) {
        const m = q.p.m, b = q.m0;
        for (let j = 0; j < 3; j++) {
          const o = j * 4, y = b[o + 1], z = b[o + 2];
          m[o] = b[o]; m[o + 1] = c * y - s * z;
          m[o + 2] = s * y + c * z; m[o + 3] = b[o + 3];
        }
        const y = b[13] - rig.py, z = b[14] - rig.z;
        m[12] = b[12]; m[13] = rig.py + c * y - s * z;
        m[14] = rig.z + s * y + c * z; m[15] = 1;
      }
    }
  }

  // The market is a night place, so this runs the opposite way round to every other scene's: the
  // bulbs are not "lifted after dark", they are the only light there is, and by day the lane is
  // shut and the strings are off. `k` is how dark it is outside, 0 to 1.
  function setNight(k) {
    const soft = k * k * (3 - 2 * k);
    for (const { p, k: kk } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) * (.16 + .84 * soft)
             + soft * kk * .30;
    // The lamps ride the same clock as the beads. The frame loop already refuses to submit an
    // outdoor scene's lights while it is light out, so this only shapes the half hour either
    // side of that: at dusk the lane is lit but not yet the brightest thing on the street, and
    // by full dark every lamp is at the power it was declared with.
    for (const l of lamps) l.power = l.p0 * (.35 + .65 * soft);
  }

  return B.finish({
    setNight, tick, RX, RZ, OUT,
    label: '夜市', labelK: '夜市 · the night market',
    indoor: false, cutaway: false, near: .12, far: 220,
    // A short lane between two walls with smoke in it: the haze closes in fast, and that is what
    // stops the far end reading as a corridor with a photograph at the end of it.
    fogNear: 15, fogD: .0095, expose: .80, aoRadius: .30,
    spawn: { x: 0, z: -RZ + 1.4, yaw: 0 },
    zones: [{ id: 'market', x0: -RX + .2, x1: RX - .2, z0: -RZ + .2, z1: RZ - .2,
              light: [0, 3.5, -RZ + 4.0] }],
    roomAt() { return this.zones[0]; },
  });
});
