// 动物园 — the zoo, at the far end of 二号线.
//
// A Chinese city zoo is a park that happens to have animals in it, and it is worth building it that
// way round: the paths, the benches, the bins, the kiosk and the map board are the same civic
// equipment 公园 is made of, and the enclosures are set into them. Beijing's own zoo is a Qing
// garden that had animals put in it in 1906 and still reads as one — brick, tile, willows and a
// lake, with a panda house bolted on — so the vocabulary of the place is the park's vocabulary plus
// seven animals.
//
// The seven are the ones a zoo is actually visited for and the ones whose names a beginner wants
// first: 熊猫, 老虎, 大象, 长颈鹿, 猴子, 企鹅, 孔雀. Each has an enclosure, a sign with its name on
// it, and something to do at the rail. The animals themselves are not built here — they are rows in
// the NPC roster in data.js, drawn by the animal rig in figure.js, so they walk about, turn to look
// at you and keep their own hours. What this file owns is where they can be and what you see them
// over.
//
// Outdoors, so no room shell and no window: the renderer puts a sky dome over it and takes the sun
// off the clock, the same way it does the hutong and the park.
//
// Pen bounds live outside the lazy builder because data.js needs them to schedule the animals at
// boot. Keeping this small table eager avoids constructing the entire 1,500-prop scene just to read
// seven rectangles.
const ZOO_PENS = Object.freeze({
  penguin:  Object.freeze({ x0: -6.0, x1:  0.0, z0: -11.0, z1: -5.5, face: 'z0' }),
  giraffe:  Object.freeze({ x0:  5.0, x1: 14.0, z0: -11.0, z1: -5.5, face: 'z0' }),
  panda:    Object.freeze({ x0: -16.0, x1: -8.0, z0: -2.5, z1:  4.0, face: 'x1' }),
  aviary:   Object.freeze({ x0: -4.0, x1:  2.0, z0: -2.5, z1:  4.0, face: 'z0' }),
  elephant: Object.freeze({ x0:  6.0, x1: 16.0, z0: -2.5, z1:  4.0, face: 'x0' }),
  monkey:   Object.freeze({ x0: -13.0, x1: -5.0, z0:  7.0, z1: 13.5, face: 'z0' }),
  tiger:    Object.freeze({ x0:  1.0, x1: 10.0, z0:  7.0, z1: 13.5, face: 'z0' }),
});

const Zoo = Lazy('Zoo', () => {
  const col = {
    grass: C('#5c7442'), grassD: C('#4a6136'), grassL: C('#6b8449'),
    path: C('#9d9689'), pathD: C('#847d71'), paveR: C('#a2705a'), kerb: C('#b0aaa0'),
    stone: C('#918c83'), stoneD: C('#6f6a62'), stoneL: C('#a8a29a'),
    water: C('#3d565c'), waterD: C('#334750'), waterL: C('#4b686e'),
    sand: C('#c2ad82'), sandD: C('#9c8b6a'),
    mud: C('#6b5a45'), mudD: C('#54462f'),
    trunk: C('#5b4a38'), trunkL: C('#74604a'),
    leaf: C('#4f7a3c'), leafD: C('#3c6130'), leafL: C('#6b9450'),
    leafM: C('#5c8742'), leafU: C('#2c4a24'),
    bamboo: C('#7c9a44'), bambooL: C('#96b25c'), bambooD: C('#5e7a33'),
    willow: C('#6d8f45'), willowL: C('#83a656'),
    red: C('#a8372a'), redD: C('#7f2a20'), redL: C('#c04b34'),
    gold: C('#c9992f'), goldL: C('#e0b850'), cream: C('#e6dcc6'),
    tileR: C('#6b7075'), tileRD: C('#565b60'),
    tileG: C('#3f6a55'), tileGD: C('#31543f'),
    steel: C('#a7adb2'), steelD: C('#7b8288'), white: C('#eceae2'),
    charcoal: C('#33383d'), black: C('#22262b'),
    blue: C('#2f6392'), blueSign: C('#1f4f8f'), teal: C('#4c8a86'),
    green: C('#2f7a4f'), greenD: C('#215c3a'),
    yellow: C('#d9b02f'), orange: C('#cf7a2b'), pink: C('#c4657a'), purple: C('#7a5f96'),
    plastic: C('#c5453a'), ice: C('#c8dbe2'),
    // Material aliases keep textured and untextured uses independent while sharing the authored
    // palette. The shader normalises every source texture by its measured mean, so these should be
    // the colours we actually want on screen—no per-texture brightness compensation is needed.
    render: C('#e6dcc6'),
    roofR:  C('#6b7075'), roofRD: C('#565b60'),
    roofG:  C('#3f6a55'), roofGD: C('#31543f'), copingR: C('#31543f'),
    conc:   C('#918c83'), concL: C('#a8a29a'), concD: C('#6f6a62'),
    timber: C('#74604a'), timberD: C('#5b4a38'),
    brickR: C('#a2705a'),
  };
  const G = { matte: .05, wood: .20, paint: .16, metal: .58, glass: .80, fabric: .04 };

  // Tiling is world-space. Keep repeats close to the real material size and strength restrained;
  // the scene's palette should lead, with the texture adding wear rather than replacing colour.
  // Build.finish defers unresolved material names until a GL context exists, so the zoo can use
  // the same material path as every other scene.
  const surf = (mat, matScale, matAmt) => ({ mat, matScale, matAmt });
  const MAT = {
    path:   surf('paving',   .70,  .38),   // the loop and the cross paths
    plaza:  surf('paving',   .52,  .34),   // smaller slabs inside the gate
    conc:   surf('concrete', 1.75, .30),   // enclosure walls, piers
    concF:  surf('concrete', .95,  .28),   // copings, kerbs, steps, counters
    rock:   surf('concrete', 2.40, .28),   // 假山 — cast concrete in a real zoo too
    brick:  surf('brick',    .90,  .34),   // the boundary wall and the gate piers
    roof:   surf('rooftile', .62,  .30),   // pavilion and kiosk roofs
    coping: surf('rooftile', .45,  .28),   // the tile course along the top of the wall
    wood:   surf('wood',     .75,  .30),   // sawn boards: bench slats, decking
    log:    surf('wood',     .55,  .28),   // round timber: climbing logs, perches
    metal:  surf('steel',    1.10, .34),   // kiosk panelling
    // Rails are 30–70 mm across, so the repeat has to be short enough to vary *along* one
    // upright rather than only between one upright and the next — at a metre per tile each post
    // picks up a single tone and a tidy handrail comes out as a row of mismatched sticks.
    rail:   surf('steel',    .40,  .30),
    plast:  surf('plaster',  2.10, .28),   // rendered walls: the panda house, the ticket hut
  };

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, flat, glyphs,
          solid, blocker, shade, glow, light, thing, transform } = B;

  // ---------------------------------------------------------------- dimensions
  const RX = 22.0, RZ = 16.0;             // preserved heritage-core dimensions
  const SITE_RX = 58.0, SITE_RZ = 70.0;   // revision-2 expansion boundary
  const GX = -12.0;                       // the gate, in the -z wall
  // Where the subway leaves you: on the entrance plaza, a few steps inside the gate.
  const OUT = { x: GX, z: -RZ + 2.60, yaw: Math.PI * .0 };

  // ---- 兽舍 the enclosures, in one table.
  //
  // Every one of them is a rectangle, and three separate things need to agree about where that
  // rectangle is: this file builds the barrier round it, this file puts the sign and the label on
  // the visitor side of it, and game.js stands the animals inside it. Written out three times they
  // drift, and the way that shows up is an animal standing in a wall — so they are written once
  // here and `PENS` is exported for the roster to read.
  //
  // `face` is the side the public stands on, which decides where the rail goes, which way the sign
  // points, and where the label's focus has to be for the walk-up prompt to be reachable.
  // Three metres between the rows, not two. At two the arithmetic below put a pen's focus point
  // 2 m out from its rail and therefore *inside the enclosure behind it* — the monkey hill's landed
  // in the panda yard and the aviary's in the penguin pool. Both read as "too far away" from every
  // angle no matter where you stand, which is the least debuggable symptom in the whole engine, and
  // the fix is geometric: a gap wide enough to stand in.
  const PENS = ZOO_PENS;
  // The middle of a pen, and a point on the visitor side of its rail that a body can stand on.
  // Every label in the file takes its focus from `at`, which is the check that stops a `thing`
  // being unreachable — the commonest way a new room comes out broken.
  const mid = p => [(p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2];
  function at(p, off = 1.5) {
    const [cx, cz] = mid(p);
    if (p.face === 'z0') return [cx, p.z0 - off];
    if (p.face === 'z1') return [cx, p.z1 + off];
    if (p.face === 'x0') return [p.x0 - off, cz];
    return [p.x1 + off, cz];
  }

  const litProps = [], pools = [], enrichmentParts = [];
  function litten(p, k) { litProps.push({ p, k }); return p; }
  function movingEnrichment(p, cx, cy, cz, r) {
    enrichmentParts.push({ p, m0: new Float32Array(p.m) });
    p.fixed = true; p.cx = cx; p.cy = cy; p.cz = cz; p.r = r;
    return p;
  }

  // 猴山 is the one place in this room where the floor is not at zero, and `liftAt` is what says so.
  //
  // The NPC loop reads it for every body in the room. Without it the four macaques stood at ground
  // level on spots that are inside a three-metre pile of rock — four monkeys buried in their own
  // hill, showing as the occasional ear between two boulders. With it they stand on top of the
  // thing, which is what a monkey hill is for and the only reason anybody watches one.
  //
  // The player's own height is not read from this, so it is deliberately a cheap smooth dome fitted
  // to the rock pile rather than anything like a collision surface: it only has to be near enough
  // that a body standing on it looks like it is standing on the rock.
  const HILL = { x: 0, z: 0, rx: 2.9, rz: 2.4, h: 1.95 };
  function liftAt(x, z, currentLift = 0) {
    if (typeof expansion !== 'undefined' && expansion && expansion.liftAt) {
      const e = expansion.liftAt(x, z, currentLift);
      if (e) return e;
    }
    // Match the four penguin haul-out treads exactly. Three preening roots are intentionally on
    // these dry steps; without a lift profile their feet stayed at pool grade inside the concrete.
    let penguinStep = 0;
    for (let i = 0; i < 4; i++) {
      const cx = ZOO_PENS.penguin.x1 - 1.4;
      const cz = ZOO_PENS.penguin.z0 + 1.4 + i * .30;
      if (x >= cx - 1.20 && x <= cx + 1.20 && z >= cz - .17 && z <= cz + .17)
        penguinStep = Math.max(penguinStep, .15 + i * .10);
    }
    if (penguinStep) return penguinStep;
    const u = (x - HILL.x) / HILL.rx, v = (z - HILL.z) / HILL.rz;
    const d = u * u + v * v;
    return d >= 1 ? 0 : HILL.h * (1 - d) * (1 - d * .35);
  }

  let seed = 0x5c1d77;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = a => a[(rnd() * a.length) | 0];

  // ---------------------------------------------------------------- parts
  // The ordinary boundary tree, the same construction the park's is: rings of leaf balls up the
  // crown, dark underneath and light on top. A zoo has more of them than a park does, because the
  // planting is what hides the fact that the enclosures are seven boxes on a grid.
  function tree(cx, cz, h) {
    capsule(cx, h * .30, cz, .16, h * .64, .16, col.trunkL, { gloss: G.wood });
    capsule(cx, h * .64, cz, .115, h * .34, .115, col.trunkL, { gloss: G.wood });
    for (const s2 of [-1, 1])
      capsule(cx + s2 * .30, h * .70, cz + s2 * .16, .07, h * .24, .07, col.trunk,
        { rz: s2 * .58, gloss: G.wood });
    const crownStart=B.props.length;
    ball(cx, h * .665, cz, 1.24, .38, 1.24, col.leafU, { gloss: .08, mode: 15 });
    // Seven offset masses plus the low under-crown make one irregular canopy. The former fifteen
    // equal balls produced the repeated lollipop skyline that dominated every wide zoo view.
    const RING = [[.735, 1.00, 3, .88, [1, 3, 0]], [.900, .62, 2, .78, [3, 2, 1]]];
    const T5 = [col.leaf, col.leafD, col.leafL, col.leafM, col.leafU];
    let li = 0;
    for (const [ry0, rad, n, cr, tone] of RING)
      for (let i = 0; i < n; i++, li++) {
        const a = li * 2.399;
        ball(cx + Math.sin(a) * rad, h * ry0 + ((li % 3) - 1) * .11, cz + Math.cos(a) * rad,
          cr, cr * .78, cr, T5[tone[i % 3]], { gloss: .12, mode: 15, ry: a });
      }
    B.props.slice(crownStart).forEach(p=>{p.zooLodMax=34;});
    // Two flattened, offset far masses keep the asymmetric silhouette instead of collapsing every
    // species and tree size to the same green sphere.
    const crownProxyA=ball(cx-.38,h*.80,cz+.22,1.36,1.06,1.48,col.leafU,
      {gloss:.08,mode:15});
    const crownProxyB=ball(cx+.48,h*.86,cz-.28,1.18,.92,1.30,col.leafM,
      {gloss:.08,mode:15});
    crownProxyA.zooLodMin=34;crownProxyB.zooLodMin=34;
    solid(cx - .28, cx + .28, cz - .28, cz + .28);
    shade(cx, cz, 3.0, 3.0, .26);
  }

  // 竹子 bamboo. A clump of tall thin canes with leaf sprays near the top — the one plant that has
  // to be right, because it is what a panda enclosure is. Built as canes rather than as a hedge:
  // the readable thing about bamboo is the vertical line and the gap between the lines.
  function bamboo(cx, cz, n, h0, spread = 1) {
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, r = (.30 + (i % 4) * .26) * spread;
      const bx = cx + Math.sin(a) * r, bz = cz + Math.cos(a) * r;
      const h = h0 * (.78 + (i % 5) * .10);
      const lean = (rnd() - .5) * .18;
      capsule(bx, h * .48, bz, .034, h * .96, .034,
        i % 3 ? col.bamboo : col.bambooD, { rz: lean, gloss: .16 });
      // The nodes, which are the whole reason a cane reads as bamboo and not as a green stick.
      // Barely proud of the cane: at 42 mm against a 34 mm stem they were discs threaded onto a
      // pole, and the clump came out as a stand of lollipops rather than as bamboo.
      for (let k = 1; k < 5; k++)
        cyl(bx + Math.sin(lean) * h * (k * .20 - .48), h * k * .20, bz, .040, .014,
          col.bambooL, { gloss: .18 });
      // Leaves. A bamboo leaf is long and narrow and hangs off the cane at a steep angle, so the
      // sprays are thin flattened blades set on end — a round ball of green is any other plant.
      // Three broad sprays read as a crown just as clearly as six isolated leaves. Across the
      // panda yard this keeps the planting legible without turning the enclosure into a thicket
      // that hides the animals and illustrated board.
      for (let k = 0; k < 3; k++) {
        const la = a + k * 2.10;
        capsule(bx + Math.sin(lean) * h * .44 + Math.sin(la) * .17 * spread,
          h * (.66 + (k % 3) * .13), bz + Math.cos(la) * .17 * spread, .032, .55, .10,
          k % 2 ? col.bamboo : col.bambooL,
          { gloss: .14, mode: 15, ry: la, rz: Math.sin(la) * .85 });
      }
    }
    const body = Math.max(.24, .55 * spread);
    solid(cx - body, cx + body, cz - body, cz + body);
    shade(cx, cz, 2.2 * spread, 2.2 * spread, .22);
  }

  // 假山 a heap of grey rock, which does duty as a monkey hill, a penguin haul-out and the back of
  // a tiger enclosure. `spread` and `top` are the only things that differ between the three.
  function rocks(cx, cz, spread, top, n = 11) {
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, r = spread * (.28 + (i % 4) * .24);
      // Cast zoo rock needs broken faces and an uneven skyline. Identical softened boxes read as a
      // stack of shipping crates, while all-round ellipsoids read as eggs. Alternate squat faceted
      // tapers with embedded rounded foot stones; vary every axis and keep the lower tier grounded.
      const w = spread * (.34 + (i % 3) * .075);
      const h = top * (.30 + (i % 4) * .075);
      const d = spread * (.28 + ((i + 1) % 3) * .065);
      const base = i % 3 ? top * .12 : 0;
      const x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r * .78;
      if (i % 3 === 2)
        ball(x, base + h * .46, z, w * .50, h * .46, d * .50,
          i % 2 ? col.conc : col.concD,
          { mode: 10, gloss: G.matte, ry: a, rz: ((i % 5) - 2) * .10, ...MAT.rock });
      else
        taper(x, base + h / 2, z, w, h, d, i % 2 ? col.conc : col.concD,
          { gloss: G.matte, ry: a, rz: ((i % 5) - 2) * .10,
            rx: ((i % 3) - 1) * .08, ...MAT.rock });
    }
    shade(cx, cz, spread * 2.1, spread * 1.7, .26);
  }

  // 长椅 a park bench: a concrete frame and wooden slats. The same one the park has, because it is
  // the same bench — every one of them in the city came off the same production line.
  function bench(cx, cz, ry) {
    const propStart=B.props.length;
    const T = { ry, tag: '长椅' };
    for (const s of [-1, 1])
      box(cx + Math.cos(ry) * s * .74, .22, cz - Math.sin(ry) * s * .74,
        .14, .44, .46, col.conc, { ...T, hard: true, gloss: G.matte, ...MAT.concF });
    for (let i = 0; i < 4; i++)
      box(cx - Math.sin(ry) * (-.16 + i * .11), .45, cz - Math.cos(ry) * (-.16 + i * .11),
        1.60, .05, .095, col.timber, { ...T, hard: true, gloss: G.wood, ...MAT.wood });
    for (let i = 0; i < 3; i++)
      box(cx - Math.sin(ry) * .26, .62 + i * .13, cz - Math.cos(ry) * .26,
        1.60, .095, .05, col.timber, { ...T, hard: true, rx: -.14, gloss: G.wood, ...MAT.wood });
    // Half extents from the absolute components of the rotation, not from signed offsets: at
    // ry = π/2 a collider written as `cx ± cos(ry)*.84` hands back x0 > x1 and `clampMove` then
    // silently never collides with it. The bench you can walk through is always this bug.
    const hx = Math.abs(Math.cos(ry)) * .84 + Math.abs(Math.sin(ry)) * .38;
    const hz = Math.abs(Math.sin(ry)) * .84 + Math.abs(Math.cos(ry)) * .38;
    solid(cx - hx, cx + hx, cz - hz, cz + hz);
    shade(cx, cz, 2.0, 1.0, .24);
    const th=thing('长椅', cx + Math.sin(ry) * .9, .95, cz + Math.cos(ry) * .9,
      '坐在长椅上休息一下。', 'Sit on the bench and rest a while.',
      '长 long + 椅 chair. 休息 is to rest.',
      { focus: [cx + Math.sin(ry) * 1.2, cz + Math.cos(ry) * 1.2], reach: 1.9 });
    th.seat={at:[cx,cz],yaw:ry,seatY:.48};th.stand=th.focus.slice();
    B.props.slice(propStart).forEach(p=>{p.zooLodMax=26;});
  }

  // 垃圾桶 a bin. Placed on the centre of a run of benches rather than in the gap between two
  // enclosures: a 2 m gap with a bin in it is not a way through, and the player finds that out by
  // being unable to reach a label they can see.
  function bin(bx, bz) {
    const propStart=B.props.length;
    cyl(bx, .38, bz, .21, .76, col.leafD, { gloss: .26 });
    cyl(bx, .78, bz, .22, .06, col.charcoal, { gloss: .24 });
    box(bx, .58, bz - .22, .22, .16, .02, col.cream, { hard: true, mode: 1 });
    solid(bx - .24, bx + .24, bz - .24, bz + .24);
    B.props.slice(propStart).forEach(p=>{p.zooLodMax=26;});
  }

  // ---- 说明牌 the interpretation board every enclosure has.
  //
  // Chinese remains the visual headline, while two short facts give a learner something useful
  // to read after recognising the animal. English is deliberately tiny and terse: it confirms
  // meaning without competing with the headword. Keeping all copy in this table also makes it
  // impossible for a habitat call to acquire the wrong species' panel when pens move later.
  const HABITATS = [
    { key:'penguin', name:'企鹅', en:'PENGUIN', accent:col.blue,
      facts:[['擅长游泳', 'SWIMS'], ['走路摇摇摆摆', 'WADDLES']] },
    { key:'giraffe', name:'长颈鹿', en:'GIRAFFE', accent:col.gold,
      facts:[['脖子非常长', 'LONG NECK'], ['爱吃高处叶子', 'BROWSE']] },
    { key:'panda', name:'熊猫', en:'PANDA', accent:col.green,
      facts:[['爱吃竹子', 'BAMBOO'], ['一天吃很久', 'ALL DAY']] },
    { key:'aviary', name:'孔雀', en:'PEACOCK', accent:col.purple,
      facts:[['雄鸟会开屏', 'DISPLAY'], ['尾羽五彩缤纷', 'TAIL FAN']] },
    { key:'elephant', name:'大象', en:'ELEPHANT', accent:col.teal,
      facts:[['鼻子能喝水', 'TRUNK'], ['喜欢洗泥浴', 'MUD']] },
    { key:'monkey', name:'猴子', en:'MONKEY', accent:col.red,
      facts:[['住在猴山上', 'HILL'], ['喜欢互相理毛', 'GROOMING']] },
    { key:'tiger', name:'老虎', en:'TIGER', accent:col.orange,
      facts:[['条纹各不同', 'STRIPES'], ['白天爱睡觉', 'SLEEPS']] },
  ];
  const HABITAT_BY_NAME = new Map(HABITATS.map(h => [h.name, h]));

  // A tiny relief portrait assembled from the same batched balls, capsules and boxes used by the
  // rest of the zoo. A handful of broad shapes beats a detailed decal here: the silhouette survives
  // distance, stays available before downloaded assets exist, and adds no material or light.
  function plaquePortrait(px, pz, yaw, name, accent) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const point = (u, y, d) => [px + c * u + s * d, y, pz - s * u + c * d];
    const orb = (u, y, rx, ry, rz, color, d = .098, o = {}) => {
      const [x, yy, z] = point(u, y, d);
      return ball(x, yy, z, rx, ry, rz, color,
        { tag: name, gloss: .12, ry: yaw, ...o });
    };
    const stem = (u, y, sx, sy, sz, color, d = .105, rz = 0) => {
      const [x, yy, z] = point(u, y, d);
      return capsule(x, yy, z, sx, sy, sz, color,
        { tag: name, gloss: .12, ry: yaw, rz });
    };
    const mark = (u, y, w, h, color, d = .132, rz = 0) => {
      const [x, yy, z] = point(u, y, d);
      return box(x, yy, z, w, h, .026, color,
        { tag: name, hard: true, gloss: .12, mode: 1, ry: yaw, rz });
    };

    // A pale medallion separates every portrait from the dark information field. Its edge carries
    // the same accent as the public coping, so the colour wayfinding still works at a glance.
    orb(-.78, 1.34, .335, .335, .018, accent, .058);
    orb(-.78, 1.34, .285, .285, .018, col.cream, .078);

    if (name === '熊猫') {
      orb(-.94, 1.52, .082, .082, .026, col.black, .094);
      orb(-.62, 1.52, .082, .082, .026, col.black, .094);
      orb(-.78, 1.36, .215, .205, .030, col.white, .108);
      orb(-.88, 1.39, .047, .070, .024, col.black, .137, { rz: -.22 });
      orb(-.68, 1.39, .047, .070, .024, col.black, .137, { rz: .22 });
      orb(-.78, 1.27, .043, .034, .024, col.black, .142);
    } else if (name === '老虎') {
      orb(-.94, 1.51, .078, .078, .025, col.orange, .093);
      orb(-.62, 1.51, .078, .078, .025, col.orange, .093);
      orb(-.78, 1.36, .218, .205, .030, col.orange, .108);
      orb(-.78, 1.27, .115, .072, .026, col.cream, .135);
      orb(-.86, 1.39, .026, .032, .020, col.black, .146);
      orb(-.70, 1.39, .026, .032, .020, col.black, .146);
      orb(-.78, 1.29, .035, .030, .022, col.black, .148);
      mark(-.88, 1.47, .035, .115, col.black, .142, -.34);
      mark(-.68, 1.47, .035, .115, col.black, .142, .34);
      mark(-.78, 1.51, .035, .105, col.black, .142);
    } else if (name === '大象') {
      orb(-.96, 1.38, .135, .175, .024, col.stoneD, .091);
      orb(-.60, 1.38, .135, .175, .024, col.stoneD, .091);
      orb(-.78, 1.39, .205, .190, .030, col.stone, .112);
      orb(-.86, 1.43, .023, .030, .020, col.charcoal, .146);
      orb(-.70, 1.43, .023, .030, .020, col.charcoal, .146);
      stem(-.78, 1.19, .052, .260, .038, col.stone, .128);
      stem(-.90, 1.24, .022, .130, .018, col.cream, .142, -.42);
      stem(-.66, 1.24, .022, .130, .018, col.cream, .142, .42);
    } else if (name === '长颈鹿') {
      stem(-.78, 1.29, .074, .390, .038, col.goldL, .108);
      orb(-.78, 1.53, .142, .105, .030, col.goldL, .112);
      stem(-.87, 1.64, .023, .115, .018, col.trunk, .106, -.10);
      stem(-.69, 1.64, .023, .115, .018, col.trunk, .106, .10);
      orb(-.83, 1.54, .021, .026, .018, col.charcoal, .144);
      orb(-.73, 1.54, .021, .026, .018, col.charcoal, .144);
      orb(-.83, 1.37, .045, .052, .022, col.trunk, .139);
      orb(-.73, 1.23, .045, .060, .022, col.trunk, .139);
    } else if (name === '猴子') {
      orb(-.97, 1.38, .092, .105, .024, col.trunk, .094);
      orb(-.59, 1.38, .092, .105, .024, col.trunk, .094);
      orb(-.78, 1.39, .205, .205, .030, col.trunk, .110);
      orb(-.78, 1.30, .142, .105, .026, col.sand, .137);
      orb(-.86, 1.42, .027, .034, .020, col.black, .145);
      orb(-.70, 1.42, .027, .034, .020, col.black, .145);
    } else if (name === '企鹅') {
      orb(-.78, 1.32, .165, .255, .030, col.black, .106);
      orb(-.78, 1.30, .108, .180, .024, col.white, .137);
      orb(-.78, 1.51, .142, .132, .029, col.black, .116);
      orb(-.84, 1.54, .021, .026, .018, col.white, .145);
      orb(-.72, 1.54, .021, .026, .018, col.white, .145);
      orb(-.78, 1.47, .072, .036, .024, col.orange, .145);
    } else { // 孔雀
      orb(-.92, 1.39, .150, .230, .024, col.green, .088, { rz: -.35 });
      orb(-.78, 1.43, .155, .250, .024, col.teal, .090);
      orb(-.64, 1.39, .150, .230, .024, col.green, .088, { rz: .35 });
      orb(-.78, 1.30, .100, .170, .027, col.blue, .121);
      orb(-.78, 1.50, .070, .085, .026, col.blue, .124);
      orb(-.78, 1.51, .070, .028, .021, col.goldL, .148);
    }
  }

  // Upright civic-zoo panels sit on the pen side of each path, where the old lecterns already
  // stood. The wider face grows along the path, not across it, so the player's clear route is
  // unchanged even at the two east/west-facing habitats.
  function plaque(px, pz, yaw, name, accent = col.greenD) {
    const propStart=B.props.length;
    const c = Math.cos(yaw), s = Math.sin(yaw), info = HABITAT_BY_NAME.get(name);
    const point = (u, y, d = .057) => [px + c * u + s * d, y, pz - s * u + c * d];
    for (const o of [-.76, .76])
      cyl(px + c * o, .53, pz - s * o, .038, 1.06, col.steelD,
        { tag: name, gloss: G.metal, ...MAT.rail });
    const panel=box(px, 1.36, pz, 2.22, 1.28, .080, col.greenD,
      { tag: name, hard: true, ry: yaw, gloss: .24, ...MAT.metal });

    // One coloured cap and two tiny bullets continue the habitat colour without sacrificing the
    // contrast needed by the Chinese copy. All marks are mode 1, but none creates a light.
    {
      const [x, y, z] = point(0, 1.94, .052);
      box(x, y, z, 2.08, .090, .022, accent,
        { tag: name, hard: true, ry: yaw, gloss: .20, mode: 1 });
    }
    {
      const [x, y, z] = point(-.36, 1.34, .052);
      box(x, y, z, .018, 1.02, .018, col.steelD,
        { tag: name, hard: true, ry: yaw, mode: 1 });
    }
    plaquePortrait(px, pz, yaw, name, accent);

    const [tx, ty, tz] = point(.36, 1.74);
    for (const g of glyphs(tx, ty, tz, yaw, name,
      { size: .18, gap: .040, color: col.white, mode: 1, lift: .006, tag: name })) litten(g, .48);
    const [ex, ey, ez] = point(.36, 1.58);
    glyphs(ex, ey, ez, yaw, info.en,
      { size: .046, gap: -.010, color: col.cream, mode: 1, lift: .006, tag: name });
    {
      const [x, y, z] = point(.36, 1.50, .052);
      box(x, y, z, 1.24, .014, .018, col.steelD,
        { tag: name, hard: true, ry: yaw, mode: 1 });
    }

    for (let i = 0; i < info.facts.length; i++) {
      const y = 1.36 - i * .285;
      const [bx, by, bz] = point(-.20, y + .012, .060);
      box(bx, by, bz, .040, .040, .020, accent,
        { tag: name, hard: true, ry: yaw, mode: 1 });
      const [zx, zy, zz] = point(.40, y + .025);
      glyphs(zx, zy, zz, yaw, info.facts[i][0],
        { size: .078, gap: .018, color: col.white, mode: 1, lift: .006, tag: name });
      const [fx, fy, fz] = point(.40, y - .085);
      glyphs(fx, fy, fz, yaw, info.facts[i][1],
        { size: .035, gap: -.008, color: col.cream, mode: 1, lift: .006, tag: name });
    }

    // Full copy and relief are close-reading detail; one backing silhouette remains farther out.
    B.props.slice(propStart).forEach(p=>{p.zooLodMax=26;});panel.zooLodMax=42;
    const hx = Math.abs(c) * 1.16 + Math.abs(s) * .11;
    const hz2 = Math.abs(s) * 1.16 + Math.abs(c) * .11;
    solid(px - hx, px + hx, pz - hz2, pz + hz2);
  }

  // ---- 饲养通道 staff-only habitat gates.
  //
  // The keeper routes cross the back walls at four authored points. These remain visual doors:
  // the pen's single collider stays untouched, so a player cannot discover an accidental shortcut
  // through an exhibit. A dark inset, a broad green frame and three bars are enough to read as a
  // service gate at zoo distance without spending a bespoke mesh or another material.
  function staffGate(gx, gz, yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const point = (u, y, d) => [gx + c * u + s * d, y, gz - s * u + c * d];
    const plate = (u, y, w, h, d, color, o = {}) => {
      const [x, yy, z] = point(u, y, d);
      return box(x, yy, z, w, h, .026, color,
        { hard: true, ry: yaw, gloss: .20, ...o });
    };

    // .19 m clears the 34 cm wall cleanly on its visible, enclosure-facing side.
    plate(0, .71, 1.10, 1.42, .190, col.greenD);
    plate(0, .66, .88, 1.16, .208, col.charcoal);
    for (const u of [-.29, 0, .29]) plate(u, .66, .052, 1.08, .228, col.green);
    plate(0, .66, .88, .055, .230, col.green);
    plate(0, 1.35, 1.10, .28, .232, col.greenD);

    const [zx, zy, zz] = point(0, 1.40, .252);
    glyphs(zx, zy, zz, yaw, '饲养通道',
      { size: .095, gap: .018, color: col.white, mode: 1, lift: .005 });
    const [ex, ey, ez] = point(0, 1.29, .252);
    glyphs(ex, ey, ez, yaw, 'STAFF',
      { size: .036, gap: -.008, color: col.cream, mode: 1, lift: .005 });
  }

  // ---- 围栏 the barrier round a pen.
  //
  // Every enclosure in this zoo is seen over the same thing, because every enclosure in a real one
  // is: a dry moat, a low wall on the visitor side of it, and a steel handrail on top. It is worth
  // doing properly rather than with a pane of glass — a mode-1 translucent panel over a lit
  // enclosure hides whatever is behind it, and what is behind it is the animal.
  //
  // The pen's own ground goes down first, then the moat inside the line, then the wall, then the
  // rail on the public sides only. `solid` covers the whole rectangle plus the wall, so the moat is
  // never something you can fall into.
  function pen(p, o = {}) {
    const { x0, x1, z0, z1 } = p;
    // The barrier carries the enclosure's headword. Without it the pens were walk-up-only: the
    // label appeared when you got to the rail but the cursor slid straight over the wall, because
    // `pick` resolves a ray to a prop's tag and nothing in the pen had one. The rail is what a
    // visitor actually points at, so the rail is what wears the tag.
    const T = o.tag ? { tag: o.tag } : {};
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    // the floor of the enclosure. `groundMat` is optional and deliberately not defaulted: the
    // grass pens want the grass shader and nothing else, the sand ones want sand, and only the
    // hard-floored ones — penguin, monkey — are actually made of something a material can imitate.
    flat(cx, .006, cz, w, d, o.ground || col.grass,
      { mode: o.groundMode === undefined ? 17 : o.groundMode, gloss: o.groundGloss || .08,
        ...(o.groundMat || {}) });
    // The dry moat: a dark sunken band just inside the wall on the public side, which is what
    // keeps the animal off the rail without a cage. Drawn, not modelled — the eye reads the tone
    // change as depth and the collider does the rest.
    const M0 = 1.10, moatColor = o.moatColor || col.mudD;
    const moatOpt = { mode: o.moatMode === undefined ? 10 : o.moatMode,
                      gloss: o.moatGloss === undefined ? .10 : o.moatGloss };
    if (o.moat !== false) {
      // Keep the tone break far enough above the enclosure floor that wide-camera depth
      // precision cannot make the two broad surfaces shimmer into one another.
      if (p.face === 'z0') flat(cx, .024, z0 + M0 / 2, w, M0, moatColor, moatOpt);
      if (p.face === 'z1') flat(cx, .024, z1 - M0 / 2, w, M0, moatColor, moatOpt);
      if (p.face === 'x0') flat(x0 + M0 / 2, .024, cz, M0, d, moatColor, moatOpt);
      if (p.face === 'x1') flat(x1 - M0 / 2, .024, cz, M0, d, moatColor, moatOpt);
    }

    // The wall, all four sides. Low on the public side so you can see over it, and higher round
    // the back where it is doing the actual containing.
    const HI = o.back === undefined ? .95 : o.back, LO = o.front === undefined ? .55 : o.front;
    const sides = [
      ['z0', cx, z0, w, .34], ['z1', cx, z1, w, .34],
      ['x0', x0, cz, .34, d], ['x1', x1, cz, .34, d],
    ];
    for (const [k, sx, sz, sw, sd] of sides) {
      const pub = p.face === k;
      // Invisible collision remains the authored full habitat rectangle. Visually, a continuous
      // 1–2 m concrete back wall around every pen made the core read as a prison grid; a low planted
      // curb is enough on non-public sides, while the public edge keeps its handrail and identity.
      const h = pub ? LO : Math.min(HI, .68);
      // Poured concrete at a 1.75 m repeat for the wall, and a finer 95 cm one for the coping
      // that caps it — the same material at two scales is what tells the eye they are two
      // different pours, which is the only thing distinguishing them now that both are grey.
      box(sx, h / 2, sz, sw, h, sd, o.wallColor || col.conc,
        { ...T, hard: true, gloss: G.matte, ...MAT.conc });
      // The public coping matches the habitat panel: one restrained band of colour is enough to
      // turn seven near-identical concrete rectangles into seven places you can navigate by eye.
      if (pub) box(sx, h + .045, sz, sw + .10, .09, sd + .10,
        o.accent || col.concL, { ...T, hard: true, gloss: .18, ...MAT.concF });
      if (!pub || o.rail === false) continue;
      // The handrail: uprights every 1.6 m and two rails, running along whichever axis this side
      // lies on. A rail is the one thing that gives the barrier a human scale to read it against.
      const along = k[0] === 'z' ? 'x' : 'z';
      const len = along === 'x' ? w : d;
      const n = Math.max(2, Math.round(len / 1.6));
      for (let i = 0; i <= n; i++) {
        const t = -len / 2 + (len / n) * i;
        const ux = along === 'x' ? sx + t : sx, uz = along === 'x' ? sz : sz + t;
        cyl(ux, LO + .42, uz, .035, .84, col.steelD, { ...T, gloss: G.metal, ...MAT.rail });
      }
      for (const ry2 of [LO + .58, LO + .84])
        capsule(sx, ry2, sz, .022, len, .022, col.steelD,
          { ...T, rz: Math.PI / 2, ry: along === 'x' ? 0 : Math.PI / 2, gloss: G.metal,
            ...MAT.rail });
    }
    // Nobody walks into a pen. The wall's own thickness is included, so you stop at the rail
    // rather than with your face in it.
    solid(x0 - .28, x1 + .28, z0 - .28, z1 + .28);
    if (o.blockTop) blocker(x0 - .28, x1 + .28, z0 - .28, z1 + .28, o.blockTop);
  }

  // A small paved pause point makes the intended viewing position readable before the prompt
  // appears. Habitat color is repeated as a narrow rail-side line and as a pair of animal tracks;
  // neither creates collision, so the full path width remains accessible.
  function viewingBay(h) {
    const p = PENS[h.key], [x, z] = at(p, 1.22);
    const horizontal = p.face[0] === 'z';
    const len = horizontal ? p.x1 - p.x0 : p.z1 - p.z0;
    const span = Math.min(4.2, Math.max(2.6, len - 2.4));
    flat(x, .012, z, horizontal ? span : .82, horizontal ? .82 : span, col.pathD,
      { mode: 9, gloss: .11, ...MAT.path });
    const [rx, rz] = at(p, .76);
    flat(rx, .017, rz, horizontal ? span : .13, horizontal ? .13 : span, h.accent,
      { gloss: .20 });

    const toward = p.face === 'z0' ? [0, 1] : p.face === 'z1' ? [0, -1]
                  : p.face === 'x0' ? [1, 0] : [-1, 0];
    const side = [toward[1], -toward[0]];
    for (const [u, v] of [[-.18, -.16], [.18, .18]]) {
      const px = x + side[0] * u + toward[0] * v;
      const pz = z + side[1] * u + toward[1] * v;
      cyl(px, .030, pz, .105, .018, h.accent, { gloss: .16 });
      for (const toe of [-.085, 0, .085])
        cyl(px + toward[0] * .14 + side[0] * toe, .032,
          pz + toward[1] * .14 + side[1] * toe, .036, .020, h.accent, { gloss: .16 });
    }
  }

  // ---- 迎宾花园 the first thing on the axis from the gate.
  //
  // The entrance previously looked across a rectangle of empty grass at the back of a concrete
  // pen. A landmark fixes three problems at once: it makes arrival feel intentional, gives the
  // player an instant "this is the zoo" silhouette, and breaks the hard enclosure grid with one
  // round garden. Monochrome stone keeps the mascot from being mistaken for a panda loose outside
  // its yard; the ring of seasonal colour is the part meant to catch the eye from the station.
  function entranceGarden(cx, cz) {
    cyl(cx, .15, cz, 1.48, .30, col.conc,
      { tag: '动物园', gloss: G.matte, ...MAT.concF });
    cyl(cx, .34, cz, 1.27, .16, col.grassD, { tag: '动物园', gloss: .10 });

    // A seated stone panda, facing the gate (-z).
    ball(cx, .68, cz + .02, .30, .37, .27, col.stoneL,
      { tag: '动物园', gloss: .12 });
    ball(cx, .98, cz - .05, .26, .25, .24, col.stoneL,
      { tag: '动物园', gloss: .12 });
    for (const s of [-1, 1]) {
      ball(cx + s * .205, 1.145, cz - .05, .10, .10, .085, col.stoneD,
        { tag: '动物园', gloss: .12 });
      ball(cx + s * .105, 1.01, cz - .245, .072, .10, .032, col.stoneD,
        { tag: '动物园', gloss: .10, rz: s * .24 });
      capsule(cx + s * .25, .71, cz - .01, .076, .37, .076, col.stoneD,
        { tag: '动物园', gloss: .10, rz: s * .32 });
      ball(cx + s * .205, .455, cz - .08, .16, .14, .21, col.stoneD,
        { tag: '动物园', gloss: .10 });
    }
    ball(cx, .94, cz - .265, .135, .09, .057, col.stone,
      { tag: '动物园', gloss: .12 });
    ball(cx, .97, cz - .32, .042, .030, .020, col.charcoal,
      { tag: '动物园', gloss: .20 });

    // Flowers are kept as broad low clumps, not dozens of individual stems: at entrance distance
    // the colour mass is what reads, and the shared ball mesh keeps the garden cheap to draw.
    const petals = [col.pink, col.purple, col.white];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + (i % 2) * .14, r = 1.68 + (i % 2) * .10;
      const x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;
      ball(x, .20 + (i % 3) * .025, z, .30, .16, .30, col.leafM,
        { gloss: .08, mode: 15 });
      ball(x, .34 + (i % 2) * .025, z, .16, .11, .16, petals[i % petals.length],
        { gloss: .14, mode: 15 });
    }
    shade(cx, cz, 4.3, 4.3, .30);
    solid(cx - 1.52, cx + 1.52, cz - 1.52, cz + 1.52);
    thing('动物园', cx, 2.05, cz - .85, '先从熊猫花园开始逛吧。',
      'Start the zoo walk at the panda garden.',
      '动物 animal + 园 garden. The round garden is the entrance landmark.',
      { focus: [cx, cz - 2.2], reach: 2.4 });
  }

  function build() {
    // ================================================================ ground
    // Mode 17 is grass; the paths are mode 9 paving over the top of it. A zoo is more path than a
    // park is — the whole place is a route past a series of things — so the paving is laid as one
    // wide loop rather than as a set of spurs.
    flat(0, 0, 0, RX * 2 + 10, RZ * 2 + 10, col.grass, { mode: 17, gloss: .08 });
    // Public circulation is light stone; the outer keeper/perimeter route is one step darker so it
    // does not compete with the exhibit circuit. Two lanes wrap the round entrance garden and a
    // south spine closes the former grass gap between the lower pens.
    // The red plaza is a distinct 12 mm finish above the pale south path. The paired approach
    // lanes sit another 12 mm above it, so their small overlaps read as construction joints
    // instead of coplanar surfaces that shimmer in the arrival view.
    flat(GX, .018, -RZ + 3.2, 9.0, 6.4, col.paveR, { mode: 9, gloss: .12, ...MAT.plaza });
    flat(0, .006, -13.2, RX * 2 - 4.0, 2.4, col.path, { mode: 9, gloss: .10, ...MAT.path });
    // The darker perimeter loop is a 14 mm raised finish over the habitat slabs and pale cross
    // paths. That tiny construction joint removes broad coplanar overlaps at every junction while
    // remaining far below a perceptible step at player scale.
    flat(-19.0, .020, 0.0, 3.0, RZ * 2 - 6.0, col.pathD, { mode: 9, gloss: .10, ...MAT.path });
    flat(19.0, .020, 0.0, 3.0, RZ * 2 - 6.0, col.pathD, { mode: 9, gloss: .10, ...MAT.path });
    flat(0, .020, 14.4, RX * 2 - 4.0, 2.6, col.pathD, { mode: 9, gloss: .10, ...MAT.path });
    flat(0, .006, -4.0, RX * 2 - 6.0, 2.6, col.path, { mode: 9, gloss: .10, ...MAT.path });
    flat(0, .006, 5.5, RX * 2 - 6.0, 2.6, col.path, { mode: 9, gloss: .10, ...MAT.path });
    flat(-6.5, .006, 0.7, 2.4, 10.0, col.path, { mode: 9, gloss: .10, ...MAT.path });
    flat(4.0, .006, 0.7, 2.4, 10.0, col.path, { mode: 9, gloss: .10, ...MAT.path });
    flat(GX - 2.55, .030, -6.80, 2.2, 5.8, col.path, { mode: 9, gloss: .10, ...MAT.path });
    flat(GX + 2.55, .030, -6.80, 2.2, 5.8, col.path, { mode: 9, gloss: .10, ...MAT.path });
    flat(4.0, .030, -8.65, 2.0, 9.1, col.path, { mode: 9, gloss: .10, ...MAT.path });

    // Compact color medallions mark decisions without turning each junction into another plaza.
    for (const [ix, iz, accent] of [[-6.5,-4.0,col.green], [4.0,-4.0,col.purple],
                                    [-6.5,5.5,col.red], [4.0,5.5,col.orange]]) {
      cyl(ix, .025, iz, .42, .030, col.brickR, { gloss: .16, ...MAT.brick });
      cyl(ix, .045, iz, .25, .024, accent, { gloss: .20 });
      cyl(ix, .060, iz, .075, .020, col.gold, { gloss: G.metal });
    }
    // A tactile/visual guide leads from the gate to the map split, stopping before the garden.
    for (let i = 0; i < 9; i++)
      flat(GX, .014, -14.65 + i * .58, .18, .30, col.gold, { gloss: .16 });
    for (const h of HABITATS) viewingBay(h);
    entranceGarden(GX, -7.45);

    // ================================================================ 熊猫馆 the panda house
    // The headline exhibit, and the only one with a building in it. Grass, a heavy bamboo planting
    // along the back wall, a climbing frame of logs, and a tiled pavilion the animals go inside.
    // Faced east, onto the wide path down the west side.
    const PA = PENS.panda;
    pen(PA, { tag: '熊猫', ground: col.grassD, back: 1.15, accent: col.green,
              wallColor: col.concD });
    // Two compact groves frame the retreat without growing through its walls. A third low browse
    // clump sits in the east clearing; the old three full-size thickets overlapped one another, the
    // house and both climbing frames until the pandas were almost impossible to see.
    bamboo(PA.x0 + 1.0, PA.z0 + .65, 7, 3.6, .55);
    bamboo(PA.x0 + 1.0, PA.z1 - .60, 6, 3.8, .50);
    bamboo(PA.x1 - 1.0, PA.z0 + 3.40, 3, 2.2, .28);
    // the house itself, against the back wall: a small tiled hall with an opening the animals use
    {
      const hx = PA.x0 + 1.9, hz = (PA.z0 + PA.z1) / 2;
      // A thin washable floor belongs beneath the retreat, but it must not become a knee-high
      // plinth through every animal standing inside. The former .34 m foundation buried the
      // pandas' feet and made the doorway read as a loading dock.
      box(hx, .02, hz, 3.28, .04, 3.68, col.concD,
        { tag: '熊猫', hard: true, gloss: G.matte, ...MAT.concF });
      // A real retreat is a shell around a doorway, not one giant plaster cuboid. The four wall
      // runs below preserve the same footprint while giving the east entrance genuine depth.
      box(hx-1.43,1.30,hz,.14,2.60,3.40,col.render,
        {tag:'熊猫',hard:true,gloss:G.paint,...MAT.plast});
      for(const s of [-1,1])
        box(hx,1.30,hz+s*1.63,3.00,2.60,.14,col.render,
          {tag:'熊猫',hard:true,gloss:G.paint,...MAT.plast});
      for(const s of [-1,1])
        box(hx+1.43,1.30,hz+s*1.20,.14,2.60,1.00,col.render,
          {tag:'熊猫',hard:true,gloss:G.paint,...MAT.plast});
      box(hx+1.43,2.35,hz,.14,.50,1.40,col.render,
        {tag:'熊猫',hard:true,gloss:G.paint,...MAT.plast});
      box(hx, 2.70, hz, 3.50, .22, 3.90, col.roofG,
        { tag: '熊猫', hard: true, gloss: .20, ...MAT.roof });
      for (let i = 0; i < 2; i++)
        box(hx, 2.86 + i * .24, hz, 2.90 - i * 1.20, .26, 3.30 - i * 1.30, col.roofG,
          { tag: '熊猫', hard: true, gloss: .20, ...MAT.roof });
      // East-facing red timber frame and a named lintel: from the visitor rail this is now a
      // pavilion, not a blank plaster cube under an excellent roof.
      for (const z of [hz - 1.22, hz + 1.22])
        box(hx + 1.57, 1.30, z, .18, 2.60, .18, col.redD,
          { tag: '熊猫', hard: true, gloss: G.wood, ...MAT.wood });
      box(hx + 1.59, 2.45, hz, .18, .34, 2.72, col.redD,
        { tag: '熊猫', hard: true, gloss: G.wood, ...MAT.wood });
      box(hx + 1.61, 2.45, hz, .02, .26, 1.55, col.greenD,
        { tag: '熊猫', hard: true, gloss: .22 });
      for (const g of glyphs(hx + 1.64, 2.45, hz, Math.PI / 2, '熊猫馆',
        { size: .20, gap: .055, color: col.goldL, mode: 1, tag: '熊猫' })) litten(g, .72);
      box(hx - 1.34, 1.05, hz, .035, 2.10, 1.40, col.charcoal,
        { tag: '熊猫', hard: true, gloss: .10 });
      litten(box(hx - 1.30, 1.08, hz, .018, 1.32, .78, C('#c88b4d'),
        { tag: '熊猫', hard: true, mode: 1, glow: .02 }), .38);
      // Sit the fascia just outside the tiled roof edge. The old 7 cm overlap shared the roof's
      // exact top plane and flashed between red trim and green tile at oblique camera angles.
      box(hx + 1.84, 2.73, hz, .16, .16, 3.58, col.red,
        { tag: '熊猫', hard: true, gloss: .20 });
      blocker(hx - 1.8, hx + 1.8, hz - 2.0, hz + 2.0, 3.4);
    }
    // The climbing frame, which is what a panda enclosure has instead of furniture: two short posts
    // with a log across them, twice. Built as a single leaning capsule it was a 2.4 m log floating
    // at chest height in the middle of the yard with nothing holding it up — `rz: 1.30` lays a
    // capsule almost flat, and a flat capsule in mid-air is a cigar, not a climbing log.
    for (const [lx, lz] of [[PA.x1 - 2.4, PA.z0 + 1.9], [PA.x1 - 3.2, PA.z1 - 2.1]]) {
      for (const o of [-1.0, 1.0])
        capsule(lx + o * .12, .34, lz + o, .13, .68, .13, col.timberD,
          { gloss: G.wood, ...MAT.log });
      capsule(lx, .70, lz, .15, 2.30, .15,
        col.timber, { rz: Math.PI / 2, ry: Math.PI / 2, gloss: G.wood, ...MAT.log });
      solid(lx - .40, lx + .40, lz - 1.25, lz + 1.25);
    }
    plaque(PA.x1 + .90, PA.z0 + 1.20, Math.PI / 2, '熊猫', col.green);
    thing('熊猫', PA.x1 - 1.0, 1.30, (PA.z0 + PA.z1) / 2, '熊猫馆里种了很多竹子。',
      'The panda house is planted with lots of bamboo.',
      '熊 bear + 猫 cat. 大熊猫 is the giant panda; 竹子 is the bamboo it lives on.',
      { focus: at(PA, 2.0), reach: 2.8 });

    // ================================================================ 老虎 the tiger enclosure
    // Rock at the back, long grass, and a dead tree to lie under. Faced south onto the north cross
    // path, so you meet it after the monkeys rather than from the gate.
    const TI = PENS.tiger;
    pen(TI, { tag: '老虎', ground: col.grassD, back: 1.45, blockTop: 2.2,
              accent: col.orange, wallColor: col.concD });
    // Two low back-corner outcrops frame the cat instead of swallowing it. The old 22-block
    // piles sat directly on both afternoon sleeping marks; a tiger lying in its habitat became a
    // pair of ears behind concrete. Keep the middle three metres completely open to the rail.
    rocks(TI.x0 + 1.0, TI.z1 - .55, 1.20, 1.35, 6);
    rocks(TI.x1 - 3.8, TI.z1 - .90, 1.20, 1.35, 6);
    // A fallen trunk, lying on the ground. At y .55 a 3.2 m capsule laid almost flat is a baguette
    // floating at knee height with nothing under it; on the deck it reads as something that fell.
    capsule((TI.x0 + TI.x1) / 2 + 1.6, .26, TI.z0 + 2.4, .24, 3.20, .24,
      col.timber, { rz: Math.PI / 2, ry: .40, gloss: G.wood, ...MAT.log });
    for (const o of [-1.1, 1.1])
      capsule((TI.x0 + TI.x1) / 2 + 1.6 + Math.cos(.40) * o, .30,
        TI.z0 + 2.4 - Math.sin(.40) * o, .10, .80, .10, col.timberD,
        { rz: Math.PI / 2, ry: .40 + 1.1, gloss: G.wood, ...MAT.log });
    for (let i = 0; i < 14; i++) {
      const a = i * 2.399;
      capsule(TI.x0 + 2.0 + (i % 5) * 1.3, .34, TI.z0 + 1.6 + ((i / 5) | 0) * 1.1,
        .030, .70, .030, i % 2 ? col.willow : col.willowL, { gloss: .10, rz: (rnd() - .5) * .3 });
    }
    plaque(TI.x1 - 1.70, TI.z0 - 1.05, Math.PI, '老虎', col.orange);
    thing('老虎', (TI.x0 + TI.x1) / 2, 1.40, TI.z0 + .6, '老虎白天常常在这里睡觉。',
      'The tiger often sleeps here during the day.',
      '老虎 tiger — 老 here is not "old", it is just what the word is. 东北虎 is the Siberian one.',
      { focus: at(TI, 2.2), reach: 2.8 });

    // ================================================================ 大象 the elephant yard
    // The biggest pen and the only one with a mud wallow, because an elephant that is not covered
    // in dust is not an elephant. Faced west, onto the middle of the map.
    const EL = PENS.elephant;
    pen(EL, { tag: '大象', ground: col.sandD, groundMode: 10, back: 1.70, blockTop: 2.4,
              accent: col.teal, wallColor: col.sandD });
    // Separate the wet yard from the shelter instead of layering both features over the same
    // four metres. The wallow occupies the north-east bay; the roof remains a dry south-east bay.
    const wallowX=EL.x1-3.0,wallowZ=EL.z1-1.10;
    ball(wallowX-.28,.026,wallowZ-.12,1.88,.026,1.20,col.mud,
      {mode:10,gloss:.28,ry:.08});
    ball(wallowX+.54,.029,wallowZ+.28,1.36,.028,.72,col.mudD,
      {mode:10,gloss:.36,ry:-.12});
    // The wet centre is an offset lens rather than a third nested rectangle. These surfaces remain
    // visual-only; the enclosing habitat owns movement and elephants can cross the churned edge.
    ball(wallowX-.12,.034,wallowZ+.06,.84,.030,.44,col.waterD,
      {mode:16,gloss:.50,ry:.10});
    for (const [ox, oz, sx, sz] of [[-1.55,-.78,.75,.34],[1.42,-.76,.66,.30],
                                     [-1.48,.82,.62,.32],[1.50,.78,.72,.34]])
      // These are surface scuffs, not knee-high hummocks. Keeping them below hoof height avoids
      // burying the adult's evening dusting stance while retaining an irregular wallow edge.
      ball(wallowX + ox, .030, wallowZ + oz, sx, .025, sz, col.mudD,
        { gloss: .14 });
    // Keep the rubbing outcrop in the quiet south-west corner. The former north position sat on
    // the keeper's exact east-gate traverse and made the animal-service route cut through stone.
    rocks(EL.x0 + 1.60, EL.z0 + 1.65, 1.10, 1.00, 4);
    // the shelter: an open-sided tiled roof on four heavy piers, tall enough to walk an elephant in
    {
      const sx = EL.x1 - 2.4, sz = EL.z0 + 2.0;
      for (const ox of [-1.7, 1.7]) for (const oz of [-1.4, 1.4])
        box(sx + ox, 1.70, sz + oz, .46, 3.40, .46, col.concD,
          { hard: true, gloss: G.matte, ...MAT.conc });
      box(sx, 3.52, sz, 4.60, .26, 4.00, col.roofR, { hard: true, gloss: .18, ...MAT.roof });
      box(sx, 3.76, sz, 3.40, .26, 2.90, col.roofRD, { hard: true, gloss: .18, ...MAT.roof });
      box(sx - 2.32, 3.43, sz, .14, .18, 3.86, col.redD,
        { hard: true, gloss: .20, ...MAT.wood });
      box(sx - 2.39, 3.63, sz, .08, .12, 3.36, col.greenD,
        { hard: true, gloss: .18 });
      blocker(sx - 2.4, sx + 2.4, sz - 2.1, sz + 2.1, 4.0);
      // A suspended rubber ball gives the yard a piece of enrichment that can move without
      // taking over the animal rig. It hangs from the shelter beam and stays wholly inside the
      // already-blocked pen, so neither visitor collision nor elephant routing changes.
      // Hang the ball between the two south shelter posts. Its old north-west position occupied
      // the adult's 19:00 dusting mark; the intermediate south-east test was still too close to
      // the 14:00 body barrel. This bay gives the moving toy a full elephant-width approach.
      const ex = sx, ez = sz - 1.60, py = 3.38;
      cyl(ex, py, ez, .07, .10, col.steelD, { gloss: G.metal, ...MAT.rail });
      movingEnrichment(capsule(ex, 2.35, ez, .026, 1.96, .026, col.steelD,
        { gloss: G.metal, ...MAT.rail }), ex, 2.18, ez, 1.45);
      movingEnrichment(ball(ex, 1.24, ez, .34, .34, .34, col.orange,
        { gloss: .30 }), ex, 2.18, ez, 1.45);
      movingEnrichment(cyl(ex, 1.24, ez, .35, .10, col.redD,
        { gloss: .28 }), ex, 2.18, ez, 1.45);
    }
    plaque(EL.x0 - 1.05, EL.z0 + 1.25, -Math.PI / 2, '大象', col.teal);
    thing('大象', EL.x0 + .8, 2.20, (EL.z0 + EL.z1) / 2, '大象会用鼻子喝水。',
      'Elephants can drink with their trunks.',
      '大 big + 象 elephant. 鼻子 is the trunk — the same word as a nose.',
      { focus: at(EL, 2.0), reach: 2.8 });

    // ================================================================ 长颈鹿 the giraffe paddock
    // Sand, two acacia-ish trees and a feeding platform on stilts, which is the thing that gives
    // the enclosure its scale: a deck at 3.4 m that people stand on to be level with the head.
    const GI = PENS.giraffe;
    pen(GI, { tag: '长颈鹿', ground: col.sand, groundMode: 10, back: 1.90, blockTop: 2.6,
              accent: col.gold, wallColor: col.sandD, moatColor: col.sandD });
    for (const [tx, tz] of [[GI.x0 + 2.2, GI.z1 - 1.6], [GI.x1 - 1.2, GI.z0 + 1.6]]) {
      capsule(tx, 1.70, tz, .17, 3.40, .17, col.trunkL, { gloss: G.wood });
      for (let i = 0; i < 5; i++) {
        const a = i * 2.399;
        ball(tx + Math.sin(a) * .70, 3.55 + (i % 2) * .22, tz + Math.cos(a) * .70,
          1.05, .34, 1.05, i % 2 ? col.leafD : col.leafM, { gloss: .12, mode: 15, ry: a });
      }
    }
    // Both giraffes perform their drink pose here. A real trough gives the low, splayed-leg
    // silhouette a cause instead of making it look as though the animal is drinking dry sand.
    {
      // Keep the basin along the south service edge. At the former z=-8.95 position its concrete
      // rim crossed five grazing/drinking roots; here the animals can approach the north lip with
      // all four feet on sand.
      const tx = GI.x0 + 3.15, tz = GI.z0 + .75;
      flat(tx, .11, tz, 1.55, .64, col.waterD, { mode: 16, gloss: .58 });
      for (const ox of [-.88, .88])
        box(tx + ox, .18, tz, .12, .36, .88, col.concD,
          { tag: '长颈鹿', hard: true, gloss: G.matte, ...MAT.concF });
      for (const oz of [-.38, .38])
        box(tx, .18, tz + oz, 1.88, .36, .12, col.concD,
          { tag: '长颈鹿', hard: true, gloss: G.matte, ...MAT.concF });
    }
    // The keeper's feeding deck, inside the pen against the back wall. It belongs in here rather
    // than on the visitor side: out there it was a 3 m by 3 m collider sitting squarely across the
    // south path, which is the only route along the bottom of the zoo — the enclosure gained some
    // scale and the player lost the ability to walk past it. Inside, it does the same job for the
    // eye (a deck at 3.2 m is what tells you how tall the animal at it is) and blocks nothing,
    // because the pen is already solid.
    {
      const fx = (GI.x0 + GI.x1) / 2 + 1.4, fz = GI.z1 - 1.7;
      for (const ox of [-1.5, 1.5]) for (const oz of [-.9, .9])
        cyl(fx + ox, 1.60, fz + oz, .10, 3.20, col.timber,
          { tag: '长颈鹿', gloss: G.wood, ...MAT.log });
      box(fx, 3.26, fz, 3.60, .12, 2.20, col.timber,
        { tag: '长颈鹿', hard: true, gloss: G.wood, ...MAT.wood });
      for (let i = 0; i < 7; i++)
        box(fx - 1.6 + i * .54, 3.72, fz - 1.06, .10, .80, .10, col.timberD,
          { tag: '长颈鹿', hard: true, gloss: G.wood, ...MAT.wood });
      // a rack of browse on the deck, which is what the giraffes come over for
      for (let i = 0; i < 5; i++)
        ball(fx - 1.1 + i * .55, 3.50, fz + .30, .34, .22, .34,
          i % 2 ? col.leafD : col.leafM, { tag: '长颈鹿', gloss: .12, mode: 15 });
      blocker(fx - 2.0, fx + 2.0, fz - 1.3, fz + 1.3, 3.9);
      shade(fx, fz, 4.2, 3.0, .30);
    }
    plaque(GI.x1 - 1.0, GI.z0 - 1.05, Math.PI, '长颈鹿', col.gold);
    thing('长颈鹿', GI.x1 - 2.4, 3.20, GI.z0 + .6, '长颈鹿的脖子真长。',
      "The giraffe's neck really is long.",
      '长 long + 颈 neck + 鹿 deer. 脖子 is the neck on a person.',
      { focus: [GI.x1 - 2.4, GI.z0 - 2.2], reach: 2.8 });

    // ================================================================ 猴山 the monkey hill
    // A rock island with a water channel round it, which is how every Chinese zoo keeps macaques
    // in: they will not cross water and they do not need a roof. Faced south.
    const MO = PENS.monkey;
    pen(MO, { tag: '猴子', ground: col.concD, groundMode: 10, back: 1.25, moat: false,
              groundMat: MAT.conc, accent: col.red, wallColor: col.concD,
              moatColor: col.waterD, moatMode: 16, moatGloss: .50 });
    // the moat, all the way round the island rather than only on the public side
    flat((MO.x0 + MO.x1) / 2, .024, (MO.z0 + MO.z1) / 2,
      MO.x1 - MO.x0 - 1.2, MO.z1 - MO.z0 - 1.2, col.water, { mode: 16, gloss: .52 });
    {
      const cx = (MO.x0 + MO.x1) / 2, cz = (MO.z0 + MO.z1) / 2;
      flat(cx, .044, cz, 5.20, 4.40, col.concD, { mode: 10, gloss: .12, ...MAT.conc });
      // A broad two-metre crest matches `liftAt`; the previous 3.2 m, 23-block heap put the
      // macaques at 1.9 m *inside* the visible stone. Three low front ledges lead the eye up to
      // the animals without closing the south viewing cone again.
      rocks(cx, cz + .45, 2.30, 2.15, 10);
      for (const [dx, dz, w, h] of [[-1.8,-1.35,1.15,.55],[0,-1.55,1.30,.72],[1.8,-1.20,1.05,.48]])
        box(cx + dx, h / 2, cz + dz, w, h, .78, col.concD,
          { hard: true, round: .10, gloss: G.matte, ...MAT.rock });
      // and the mound the macaques stand on, fitted to the pile that was just built
      HILL.x = cx; HILL.z = cz + .45;
      // a dead tree on top of the hill, which is where the dominant one sits
      capsule(cx + .8, 3.30, cz + .4, .13, 2.20, .13, col.timberD, { gloss: G.wood, ...MAT.log });
      for (const s of [-1, 1])
        capsule(cx + .8 + s * .55, 4.10, cz + .4, .07, 1.10, .07, col.timberD,
          { rz: s * .70, gloss: G.wood, ...MAT.log });
      blocker(cx - 3.0, cx + 3.0, cz - 2.6, cz + 2.6, 4.6);
    }
    plaque(MO.x0 + 1.60, MO.z0 - 1.05, Math.PI, '猴子', col.red);
    thing('猴子', (MO.x0 + MO.x1) / 2, 1.60, MO.z0 + .6, '猴子会抢你手里的东西。',
      'The monkeys will grab whatever is in your hand.',
      '猴子 monkey. 猴山 — monkey hill — is what the enclosure itself is called.',
      { focus: at(MO, 2.2), reach: 2.8 });

    // ================================================================ 企鹅馆 the penguin pool
    // A shallow pool with a tiled haul-out at one end. Faced south, and the first enclosure you
    // reach from the gate, which is deliberate: it is the one that reads best at a distance.
    const PE = PENS.penguin;
    // Not `col.ice`: a white floor between white walls made the whole enclosure one pale slab with
    // two black birds somewhere in it. A penguin pool is wet grey rock, and the birds are the only
    // white thing in it.
    pen(PE, { tag: '企鹅', ground: col.concD, groundMode: 10, back: 1.05, front: .43,
              groundMat: MAT.conc, accent: col.blue, wallColor: col.stoneL,
              moatColor: col.waterD, moatMode: 16, moatGloss: .54 });
    flat((PE.x0 + PE.x1) / 2 + .4, .026, (PE.z0 + PE.z1) / 2 + .6, 4.40, 3.60, col.water,
      { mode: 16, gloss: .60 });
    rocks(PE.x0 + 1.3, PE.z1 - 1.1, 1.15, .82, 5);
    // the sloped haul-out the birds walk up out of the water
    for (let i = 0; i < 4; i++)
      box(PE.x1 - 1.4, .09 + i * .10, PE.z0 + 1.4 + i * .30, 2.40, .12, .34, col.concL,
        { hard: true, gloss: .22, ...MAT.concF });
    // East end: the west end sits directly behind the ticket hut from the south path, hiding the
    // facts even though the panel itself is correctly outside the pen.
    plaque(PE.x1 - 1.20, PE.z0 - 1.05, Math.PI, '企鹅', col.blue);
    thing('企鹅', (PE.x0 + PE.x1) / 2, 1.10, PE.z0 + .6, '企鹅走路的样子很好笑。',
      'The way penguins walk is very funny.',
      '企鹅 penguin. 游泳 is to swim, which is the other thing they do all day.',
      { focus: at(PE, 2.0), reach: 2.6 });

    // ================================================================ 鸟舍 the aviary
    // A mesh cage rather than a moat, because the animal in it flies. The mesh is drawn as a grid
    // of thin uprights and hoops and left genuinely open — a translucent pane across the front
    // would hide the bird, which is the whole point of the building.
    const AV = PENS.aviary;
    pen(AV, { tag: '孔雀', ground: col.grassL, back: .70, front: .55,
              accent: col.purple, wallColor: col.concD, moat: false, rail: false });
    {
      const cx = (AV.x0 + AV.x1) / 2, cz = (AV.z0 + AV.z1) / 2;
      const rw = (AV.x1 - AV.x0) / 2, rd = (AV.z1 - AV.z0) / 2, H = 4.20;
      // corner posts and the hoops that tie them together
      // Material on the four corner posts, which are 13 cm and structural, and on nothing
      // thinner. The mesh below is 28 mm wire on a 70 cm grid: at any repeat short enough to
      // vary along one wire, a triplanar read gives each wire its own tone, and a cage that is
      // built to disappear comes out as a hundred mismatched sticks in front of the bird.
      for (const ox of [-1, 1]) for (const oz of [-1, 1])
        box(cx + ox * rw, H / 2, cz + oz * rd, .13, H, .13, col.steelD,
          { tag: '孔雀', hard: true, gloss: G.metal, ...MAT.rail });
      for (const y of [1.5, 2.9, H]) {
        for (const oz of [-1, 1])
          capsule(cx, y, cz + oz * rd, .028, rw * 2, .028, col.steelD,
            { tag: '孔雀', rz: Math.PI / 2, gloss: G.metal });
        for (const ox of [-1, 1])
          capsule(cx + ox * rw, y, cz, .028, rd * 2, .028, col.steelD,
            { tag: '孔雀', rz: Math.PI / 2, ry: Math.PI / 2, gloss: G.metal });
      }
      // A one-metre dark mesh reads as enclosure without laying a bright barcode over the birds.
      // The older 70 cm silver grid was the highest-contrast object in every aviary view and spent
      // sixteen extra props hiding the peacocks it was meant to reveal.
      for (let i = 1; i < Math.round(rw * 2 / 1.0); i++)
        for (const oz of [-1, 1])
          cyl(AV.x0 + i * 1.0, H / 2, cz + oz * rd, .014, H, col.charcoal,
            { tag: '孔雀', gloss: G.metal });
      for (let i = 1; i < Math.round(rd * 2 / 1.0); i++)
        for (const ox of [-1, 1])
          cyl(cx + ox * rw, H / 2, AV.z0 + i * 1.0, .014, H, col.charcoal,
            { tag: '孔雀', gloss: G.metal });
      // and a roof of the same, so it is a cage and not a pen with tall posts
      for (let i = 1; i < Math.round(rw * 2 / 1.2); i++)
        capsule(AV.x0 + i * 1.2, H, cz, .012, rd * 2, .012, col.charcoal,
          { tag: '孔雀', rz: Math.PI / 2, ry: Math.PI / 2, gloss: G.metal });
      // a perch and a shrub inside for the bird to use
      capsule(cx - .8, 1.40, cz + .6, .06, 2.60, .06, col.trunk, { rz: 1.44, gloss: G.wood });
      for (let i = 0; i < 4; i++) {
        const a = i * 2.399;
        ball(AV.x1 - 2.20 + Math.sin(a) * .28, .54 + (i % 2) * .20,
          AV.z1 - 1.00 + Math.cos(a) * .28, .44, .34, .44,
          i % 2 ? col.leafD : col.leafM, { gloss: .12, mode: 15, ry: a });
      }
      blocker(AV.x0 - .3, AV.x1 + .3, AV.z0 - .3, AV.z1 + .3, 4.6);
    }
    plaque(AV.x1 - 1.30, AV.z0 - .85, Math.PI, '孔雀', col.purple);
    thing('孔雀', (AV.x0 + AV.x1) / 2, 1.50, AV.z0 + .6, '孔雀开屏的时候真漂亮。',
      'A peacock is beautiful when it fans its tail.',
      '孔雀 peacock. 开屏 — to open the screen — is what it is called when it fans its tail.',
      { focus: at(AV, 2.0), reach: 2.6 });

    // The visible leaves match the keeper's authored route crossings. No `solid` or `blocker`
    // belongs to these overlays; the full-pen collision laid down by `pen()` remains authoritative.
    staffGate(-16.0,  .70,  Math.PI / 2);  // panda west wall, seen from inside/east
    staffGate(-12.0, 13.50, Math.PI);      // monkey north wall, seen from inside/south
    staffGate( 16.0,  2.60, -Math.PI / 2); // elephant east wall, seen from inside/west
    staffGate(  8.30, 13.50, Math.PI);      // tiger north wall, seen from inside/south

    // ================================================================ 大门 the gate
    // Two brick piers, a name board across them, and the ticket window beside it. A zoo differs
    // from a park in exactly one way at the entrance and this is it: you pay to go in.
    for (const s of [-1, 1]) {
      box(GX + s * 3.10, 1.70, -RZ, .80, 3.40, .80, col.brickR,
        { tag: '动物园', hard: true, gloss: G.matte, ...MAT.brick });
      box(GX + s * 3.10, 3.52, -RZ, 1.00, .26, 1.00, col.concL,
        { tag: '动物园', hard: true, gloss: G.matte, ...MAT.concF });
      cyl(GX + s * 3.10, 3.82, -RZ, .17, .34, col.gold, { tag: '动物园', gloss: G.metal });
      solid(GX + s * 3.10 - .5, GX + s * 3.10 + .5, -RZ - .5, -RZ + .5);
    }
    // A proper roof turns two piers and a sign into an arrival. Broad green eaves echo the panda
    // house across the garden; the gold ridge and lantern pair give the gate a readable night
    // silhouette without adding another expensive point light.
    box(GX, 4.08, -RZ, 7.40, .18, 1.52, col.roofG,
      { tag: '动物园', hard: true, gloss: .20, ...MAT.roof });
    box(GX, 4.29, -RZ, 6.35, .24, 1.12, col.roofGD,
      { tag: '动物园', hard: true, gloss: .20, ...MAT.roof });
    capsule(GX, 4.48, -RZ, .075, 6.05, .075, col.gold,
      { tag: '动物园', rz: Math.PI / 2, gloss: G.metal });
    for (const s of [-1, 1]) {
      const lx = GX + s * 2.58, lz = -RZ + .48;
      capsule(lx, 3.48, lz, .022, .58, .022, col.gold,
        { tag: '动物园', gloss: G.metal });
      cyl(lx, 3.15, lz, .23, .12, col.gold, { tag: '动物园', gloss: G.metal });
      litten(ball(lx, 2.88, lz, .25, .30, .25, col.red,
        { tag: '动物园', gloss: .22 }), .38);
      cyl(lx, 2.59, lz, .18, .07, col.gold, { tag: '动物园', gloss: G.metal });
      capsule(lx, 2.39, lz, .018, .34, .018, col.redL,
        { tag: '动物园', gloss: .12 });
    }
    box(GX, 3.30, -RZ, 5.60, .68, .26, col.redD, { tag: '动物园', hard: true, gloss: .22 });
    // Both faces, because a board cut on the inside only is blank to everybody walking up to it.
    for (const [dz, yaw] of [[.15, 0], [-.15, Math.PI]])
      for (const g of glyphs(GX, 3.30, -RZ + dz, yaw, '北京动物园',
        { size: .34, gap: .12, color: col.goldL, mode: 1, tag: '动物园' })) litten(g, .55);
    thing('动物园', GX, 4.00, -RZ + .40, '动物园八点半开门。',
      'The zoo opens at half past eight.',
      '动物 animal + 园 garden. 北京动物园 has been open since 1906.',
      { focus: [GX, -RZ + 2.0], reach: 2.8 });

    // ---- 售票处 the ticket window, east of the gate on the plaza.
    //
    // Its counter faces **north, into the grounds**, and that is not a stylistic choice. Built
    // facing the gate it was 1.9 m from the boundary wall, its focus point landed 60 cm *outside*
    // the zoo, and there was nowhere on the map you could stand to buy a ticket. Anything with a
    // counter this close to a wall has to face away from it.
    {
      const TX = GX + 6.4, TZ = -RZ + 1.5;
      // Build the booth as an open masonry shell, not one solid cuboid with a black rectangle
      // painted on it. Visitors can read the recessed staffed window, side reveals and roof load.
      box(TX, 1.35, TZ - .70, 3.20, 2.70, .10, col.render,
        { tag: '售票处', hard: true, gloss: G.paint, ...MAT.plast });
      for (const s of [-1,1])
        box(TX+s*1.55,1.35,TZ,.10,2.70,1.50,col.render,
          {tag:'售票处',hard:true,gloss:G.paint,...MAT.plast});
      box(TX,.42,TZ+.70,3.20,.84,.10,col.render,
        {tag:'售票处',hard:true,gloss:G.paint,...MAT.plast});
      for(const s of [-1,1])
        box(TX+s*1.30,1.55,TZ+.70,.16,1.42,.12,col.concL,
          {tag:'售票处',hard:true,gloss:G.matte,...MAT.concF});
      box(TX-.82,2.84,TZ,2.04,.20,2.12,col.roofR,
        {tag:'售票处',hard:true,rz:-.16,gloss:.20,...MAT.roof});
      box(TX+.82,2.84,TZ,2.04,.20,2.12,col.roofRD,
        {tag:'售票处',hard:true,rz:.16,gloss:.20,...MAT.roof});
      box(TX,3.02,TZ,.12,.12,2.22,col.redD,
        {tag:'售票处',hard:true,gloss:.20,...MAT.wood});
      // A dark interior recess behind the opening gives the counter depth without sealing it.
      box(TX, 1.30, TZ - .64, 1.66, .96, .035, col.charcoal,
        { tag: '售票处', hard: true, gloss: .10 });
      // Keep the shelf tucked into the staffed opening. Projecting it 18 cm farther north put
      // the first east-loop visitors' hips through its corner even though the booth collider was
      // already clear of the path.
      box(TX, .84, TZ + .68, 1.90, .10, .25, col.concL,
        { tag: '售票处', hard: true, gloss: .22, ...MAT.concF });
      box(TX, 2.32, TZ + .79, 2.60, .40, .10, col.blueSign,
        { tag: '售票处', hard: true, gloss: .26 });
      for (const g of glyphs(TX, 2.32, TZ + .86, 0, '售票处',
          { size: .21, gap: .06, color: col.white, mode: 1, tag: '售票处' })) litten(g, .9);
      // 票价 on a small board beside the window, which is the number the word is for
      box(TX - 2.05, 1.52, TZ + .72, .64, .84, .07, col.blueSign,
        { tag: '售票处', hard: true, gloss: .20 });
      glyphs(TX - 2.05, 1.72, TZ + .77, 0, '门票',
        { size: .12, gap: .035, color: col.white, mode: 1, tag: '售票处' });
      glyphs(TX - 2.05, 1.43, TZ + .77, 0, '十五元',
        { size: .105, gap: .025, color: col.goldL, mode: 1, tag: '售票处' });
      // The light in the booth, which spills out of the hatch onto the counter and the plaza in
      // front of it. Sat at the opening rather than inside the box: the walls are single-sided
      // and a light behind them lights the back of the hut, which nobody ever sees.
      light(TX, 1.70, TZ + .95, [1.00, 0.90, 0.70], .70, 3.6);
      // The authored anchor stays exact, while the body ends behind the south-loop centreline.
      // The earlier 2.5 m-deep collider swallowed the whole route despite the booth itself only
      // needing a shallow staffed room against the boundary wall.
      solid(TX - 1.7, TX + 1.7, TZ - .85, TZ + .80);
      blocker(TX - 1.7, TX + 1.7, TZ - .85, TZ + .80, 3.2);
      shade(TX, TZ, 4.0, 2.4, .30);
      thing('售票处', TX, 1.90, TZ + .90, '买一张门票，十五块。', 'One ticket, fifteen yuan.',
        '售 to sell + 票 ticket + 处 place. 门票 is the admission ticket itself.',
        { focus: [TX, TZ + 1.9], reach: 2.2 });
    }

    // ---- 导游图 the map board, on the other side of the gate path
    {
      // Exact revision-2 relocation: east of the board remains clear for the interaction stance.
      const MPX = -16.2, MPZ = -9.0;
      const mapFirst = B.props.length;
      for (const s of [-1, 1])
        cyl(MPX + s * 1.18, .82, MPZ, .06, 1.64, col.steelD,
          { tag: '导游图', gloss: G.metal });
      const mapBacking = box(MPX, 1.78, MPZ, 3.05, 2.02, .10, col.white,
        { tag: '导游图', hard: true, gloss: .22 });
      box(MPX, 1.68, MPZ - .06, 2.79, 1.60, .02, col.grassD,
        { tag: '导游图', hard: true, mode: 1 });
      glyphs(MPX - .18, 2.60, MPZ - .08, Math.PI, '动物园导游图',
        { size: .14, gap: .040, color: col.charcoal, mode: 1, tag: '导游图' });
      glyphs(MPX + 1.15, 2.58, MPZ - .08, Math.PI, '北',
        { size: .13, gap: 0, color: col.red, mode: 1, tag: '导游图' });
      box(MPX, 2.82, MPZ - .10, 1.45, .10, .34, col.charcoal,
        { tag: '导游图', hard: true, gloss: .24 });
      litten(box(MPX, 2.76, MPZ - .24, 1.20, .035, .12, C('#ffe6ae'),
        { tag: '导游图', hard: true, mode: 1, glow: .06 }), .70);
      const mapLamp = light(MPX, 2.66, MPZ - .34, [1.00, .88, .67], .48, 2.8);

      const mapPlan = window.ZOO_BLUEPRINT, sb = mapPlan.site.bounds;
      const mapW = 2.52, mapH = 1.04, mapY = 1.64;
      const mapX = x => MPX - (x - (sb.x0 + sb.x1) / 2) / (sb.x1 - sb.x0) * mapW;
      const mapZ = z => mapY + (z - (sb.z0 + sb.z1) / 2) / (sb.z1 - sb.z0) * mapH;
      const mapLine = (x, z, w, d, color = col.cream, depth = .078) =>
        box(mapX(x), mapZ(z), MPZ - depth,
        Math.max(.016, w / (sb.x1 - sb.x0) * mapW),
        Math.max(.012, d / (sb.z1 - sb.z0) * mapH), .012, color,
        { tag: '导游图', hard: true, mode: 1 });

      // Core rectangles and every r2 public segment are projected from the canonical plan.
      for (const q of mapPlan.preservation.existingCorePaths) {
        const r = q.rect;
        mapLine((r.x0+r.x1)/2,(r.z0+r.z1)/2,r.x1-r.x0,r.z1-r.z0);
      }
      for (const p of mapPlan.paths.filter(q => q.access === 'public'))
        for (let i=1;i<p.centerline.length;i++) {
          const a=p.centerline[i-1],b=p.centerline[i];
          if (Math.abs(a[0]-b[0]) < 1e-6)
            mapLine(a[0],(a[1]+b[1])/2,p.width,Math.abs(a[1]-b[1]));
          else if (Math.abs(a[1]-b[1]) < 1e-6)
            mapLine((a[0]+b[0])/2,a[1],Math.abs(a[0]-b[0]),p.width);
        }

      // Original and expansion habitats share their district/accent identities.
      for (const h of HABITATS) {
        const p = PENS[h.key], cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2;
        box(mapX(cx), mapZ(cz), MPZ - .092, (p.x1 - p.x0) / (sb.x1 - sb.x0) * mapW,
          (p.z1 - p.z0) / (sb.z1 - sb.z0) * mapH, .014, h.accent,
          { tag: '导游图', hard: true, mode: 1 });
        glyphs(mapX(cx), mapZ(cz), MPZ - .105, Math.PI, h.name,
          { size: .055, gap: .006, color: col.white, mode: 1, tag: '导游图' });
      }
      const districtMap = {D1:col.blue,D2:col.purple,D3:col.green,D4:col.teal,
        D5:col.orange,D6:col.gold,D7:col.charcoal};
      for (const h of mapPlan.habitats) {
        const b=h.bounds,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
        mapLine(cx,cz,b.x1-b.x0,b.z1-b.z0,districtMap[h.district]||col.leaf,.094);
      }
      for (const b of mapPlan.buildings) {
        const f=b.footprint;
        mapLine((f.x0+f.x1)/2,(f.z0+f.z1)/2,f.x1-f.x0,f.z1-f.z0,col.charcoal,.101);
      }

      // Both public gates and the legend make the map usable without relying on color.
      const hereX = mapX(mapPlan.site.mainSpawn.at[0]), hereY = mapZ(mapPlan.site.mainSpawn.at[1]);
      box(hereX, hereY, MPZ - .112, .11, .11, .018, col.red,
        { tag: '导游图', hard: true, mode: 1 });
      box(mapX(mapPlan.site.secondarySpawn.at[0]),mapZ(mapPlan.site.secondarySpawn.at[1]),
        MPZ-.112,.09,.09,.018,col.red,{tag:'导游图',hard:true,mode:1});
      glyphs(MPX - .58, .96, MPZ - .08, Math.PI, '您在这里',
        { size: .075, gap: .016, color: col.white, mode: 1, tag: '导游图' });
      box(MPX - 1.15, .96, MPZ - .08, .10, .10, .015, col.red,
        { tag: '导游图', hard: true, mode: 1 });
      glyphs(MPX + .70, .96, MPZ - .08, Math.PI, '无障碍路线',
        { size: .064, gap: .012, color: col.cream, mode: 1, tag: '导游图' });

      // The interaction stance is east of the board, so its detailed face must rotate east as
      // well. The previous +PI/2 transform turned the diagram west and presented a giant blank
      // white back to every arriving visitor.
      const group = M.mul(M.trans(MPX, 0, MPZ),
        M.mul(M.rotY(-Math.PI / 2), M.trans(-MPX, 0, -MPZ)));
      for (let i = mapFirst; i < B.props.length; i++) {
        const p = B.props[i]; p.m = M.mul(group, p.m);
        if (p.ob) {
          const dx = p.ob.x - MPX, dz = p.ob.z - MPZ;
          p.ob.x = MPX - dz; p.ob.z = MPZ + dx; p.ob.ry = (p.ob.ry || 0) - Math.PI / 2;
        }
      }
      mapLamp.x = MPX + .34; mapLamp.z = MPZ;
      solid(MPX - .25, MPX + .25, MPZ - 1.45, MPZ + 1.45);
      const mapThing = thing('导游图', MPX + .30, 2.05, MPZ, '先看看导游图，再决定去哪儿。',
        'Look at the map first, then decide where to go.',
        '导游 guide + 图 map. Every park and zoo has one at the gate.',
        { focus: [-15.2, -9.0], reach: 2.0 });
      mapThing.blueprintId = 'TH-M100';
      let mapPart = 1;
      for (let i = mapFirst; i < B.props.length; i++) {
        const p = B.props[i];
        if (p.tag !== '导游图') continue;
        p.blueprintId = p === mapBacking ? 'M100-south-existing' :
          'M100-south-existing/G' + String(mapPart++).padStart(2, '0');
      }
    }

    // ---- 小卖部 the kiosk, back against the south wall and serving north.
    //
    // Two separate fixes in one building. Standing at z -13.4 its collider straddled the south
    // path — three metres of the only east-west route along the bottom of the zoo, gone. Pushed
    // back to the wall it stopped blocking anything and instead served its customers through a
    // window facing a wall 1 m away, which is the same bug the ticket office had. Back to the
    // wall, counter to the crowd.
    {
      const KX = 6.0, KZ = -RZ + 1.05;
      // Painted steel frame and recessed service bay. Four structural planes read as a kiosk;
      // one 2.8 m solid box read as a shipping container dropped beside the path.
      box(KX,1.20,KZ-.95,2.80,2.40,.10,col.teal,
        {tag:'小卖部',hard:true,gloss:G.paint,...MAT.metal});
      for(const s of [-1,1])
        box(KX+s*1.35,1.20,KZ,.10,2.40,2.00,col.teal,
          {tag:'小卖部',hard:true,gloss:G.paint,...MAT.metal});
      box(KX,.36,KZ+.95,2.80,.72,.10,col.teal,
        {tag:'小卖部',hard:true,gloss:G.paint,...MAT.metal});
      for(const s of [-1,1])
        box(KX+s*1.12,1.35,KZ+.95,.12,1.62,.12,col.steelD,
          {tag:'小卖部',hard:true,gloss:G.paint,...MAT.metal});
      box(KX-.72,2.52,KZ,1.82,.18,2.45,col.roofR,
        {tag:'小卖部',hard:true,rz:-.14,gloss:.20,...MAT.roof});
      box(KX+.72,2.52,KZ,1.82,.18,2.45,col.roofRD,
        {tag:'小卖部',hard:true,rz:.14,gloss:.20,...MAT.roof});
      box(KX,2.68,KZ,.10,.10,2.55,col.redD,
        {tag:'小卖部',hard:true,gloss:.18,...MAT.wood});
      box(KX,1.08,KZ-.90,1.84,.86,.035,col.charcoal,
        {tag:'小卖部',hard:true,gloss:.10});
      box(KX, .78, KZ + .94, 2.20, .10, .40, col.concL,
        { tag: '小卖部', hard: true, gloss: .22, ...MAT.concF });
      // an awning over the counter, and two crates of drinks under it
      box(KX, 1.86, KZ + 1.30, 3.00, .07, .90, col.redD, { tag: '小卖部', hard: true, rx: -.22,
        gloss: .22 });
      for (const s2 of [-1, 1])
        box(KX + s2 * .85, .30, KZ + .85, .60, .60, .44, col.plastic,
          { tag: '小卖部', hard: true, gloss: .24 });
      box(KX, 2.16, KZ + 1.06, 2.20, .34, .09, col.redD, { tag: '小卖部', hard: true, gloss: .22 });
      glyphs(KX, 2.16, KZ + 1.12, 0, '小卖部',
        { size: .18, gap: .05, color: col.cream, mode: 1, tag: '小卖部' });
      // A strip light under the awning, over the counter and the crates.
      light(KX, 1.72, KZ + 1.28, [1.00, 0.92, 0.74], .65, 3.4);
      solid(KX - 1.5, KX + 1.5, KZ - 1.1, KZ + 1.0);
      blocker(KX - 1.5, KX + 1.5, KZ - 1.1, KZ + 1.0, 2.9);
      shade(KX, KZ, 3.6, 2.8, .28);
      thing('小卖部', KX, 1.70, KZ + 1.70, '在小卖部买瓶水。', 'Buy a bottle of water at the kiosk.',
        '小 small + 卖 to sell + 部 section. The kiosk in every park, station and campus.',
        { focus: [KX, KZ + 2.15], reach: 2.2 });
    }

    // The old north, west and east boundary is deliberately absent.  The expansion builder owns
    // the complete revision-2 perimeter and keeps its visible, body and camera openings aligned.
    // Trees along the paths and in the corners. Placed off the enclosure walls rather than against
    // them: a six-metre crown over a pen hides whatever is standing in it, which is the animal.
    tree(-21.5, -9.0, 6.0); tree(-21.6, 8.4, 6.2); tree(-21.6, 13.6, 5.6);
    tree(21.5, -9.4, 5.8); tree(21.5, 8.0, 6.0); tree(21.6, 13.4, 5.8);
    tree(-16.2, 9.8, 5.2); tree(14.8, 10.8, 5.0); tree(12.8, 8.2, 6.0);
    tree(-20.3, -11.8, 5.4); tree(16.1, -9.8, 5.6); tree(2.2, -8.2, 5.0);
    // and a low hedge along the outside of the loop path, which is what separates path from lawn
    const HEDGE = [col.leafD, col.leafU, col.leafM];
    // Keep the gate, station, ticket queue and kiosk frontage visually open. The old unbroken row
    // crossed the entrance and made visitors walk through opaque hedge blocks on arrival.
    for (const [x0, x1] of [[-2.0, 4.2], [8.1, 17.4]]) {
      const n = Math.max(2, Math.ceil((x1 - x0) / 1.18));
      for (let i = 0; i < n; i++) {
        const x = x0 + (i + .5) * (x1 - x0) / n, hy = .40 + (i % 4) * .03;
        box(x, hy, -15.45, (x1 - x0) / n + .05, hy * 2, .70,
          HEDGE[i % 3], { gloss: .10, mode: 15, round: .12 });
      }
    }

    // ================================================================ the small stuff
    // Benches facing the enclosures, bins beside half of them, and the lamps. This is the layer
    // that makes the place feel visited rather than laid out, and it is the one that has to be
    // kept out of the gaps between pens — a 2 m gap with a bin in it is not a way through.
    bench(-6.5, -8.2, 0); bench(-1.6, -14.65, 0);
    bench(9.6, -14.65, 0); bench(-20.35, -1.2, Math.PI / 2);
    bench(-20.35, 3.0, Math.PI / 2); bench(20.35, -2.0, -Math.PI / 2);
    bench(-5.6, 15.15, Math.PI); bench(12.4, 15.15, Math.PI);
    for (const [bx, bz] of [[-7.6, -14.75], [4.0, -14.75], [-20.35, .4], [20.35, .6],
                            [16.3, 11.8], [-11.0, -5.75]])
      bin(bx, bz);
    // lamps on the loop, warm at night.
    //
    // A lamp is three separate things and it needs all three. The emissive panel is the lantern
    // seen from anywhere in the zoo and lights nothing. The `glow` pool is the soft patch of
    // brightness on the path under it, which no renderer without bounce light will ever produce
    // on its own — it was already here, but with `a: 0` and `sun: false` it could never draw
    // (game.js multiplies by `sun ? day : 1`, so a zero alpha stays zero all night), and the
    // ramp now lives in `setNight` with the panels. `light` is the third: the real point light
    // that makes the paving, the wall behind it and the person standing under it actually
    // respond. Outdoors the engine switches these with the sun, so they are off all day.
    for (const [lx, lz] of [[GX - 5.6, -RZ + 4.6], [-20.55, -6.0], [-20.55, 10.0],
                            [20.55, -6.0], [20.55, 10.0], [16.2, 9.5], [0, -14.65]]) {
      const lampStart=B.props.length;
      cyl(lx, 1.90, lz, .075, 3.80, col.charcoal, { gloss: .28 });
      box(lx, 3.92, lz, .46, .18, .46, col.charcoal, { hard: true, gloss: .28 });
      litten(box(lx, 3.78, lz, .38, .10, .38, C('#ffe6ae'),
        { hard: true, mode: 1, glow: .10 }), 1);
      pools.push(glow(M.trs(lx, .02, lz, 0, 5.6, 1, 5.6), C('#ffdca6'), .0, false));
      // Just under the lantern rather than in it: a point light at the same height as the panel
      // it belongs to puts its brightest ring on the top of the lamp head, where nobody is.
      light(lx, 3.55, lz, [1.00, 0.84, 0.58], 1.00, 6.6);
      solid(lx - .12, lx + .12, lz - .12, lz + .12);
      B.props.slice(lampStart).forEach(p=>{p.zooLodMax=26;});
    }

    // ---- 地铁站 the way back to the line, at the west end of the entrance plaza
    const MX = GX - 7.2, MZ = -RZ + 1.30;
    const ST = { tag: '地铁站' };
    flat(MX, .006, MZ + .4, 3.6, 3.4, col.path, { mode: 9, gloss: .10, ...MAT.path });
    flat(MX, .034, MZ + .70, 2.10, 1.70, col.black, { ...ST, gloss: .08 });
    for (let i = 0; i < 6; i++)
      box(MX, .016, MZ + .06 + i * .22 - i * i * .012, 1.84, .01, .055,
        i < 3 ? col.kerb : col.stoneD, { hard: true, gloss: .14 });
    for (const s of [-1, 1]) {
      box(MX + s * 1.10, .48, MZ + .25, .16, .96, 1.10, col.conc,
        { ...ST, hard: true, gloss: G.matte, ...MAT.conc });
      box(MX + s * 1.10, .98, MZ + .25, .22, .07, 1.16, col.concL,
        { ...ST, hard: true, gloss: .20, ...MAT.concF });
      box(MX + s * 1.16, 1.30, MZ + .86, .13, 2.60, .13, col.steelD,
        { hard: true, gloss: G.metal, ...MAT.rail });
    }
    box(MX, 2.62, MZ + 1.06, 2.86, .12, 2.00, col.concL,
      { ...ST, hard: true, gloss: G.paint, ...MAT.concF });
    box(MX, 2.40, MZ + .08, 2.86, .34, .10, col.blueSign,
      { ...ST, hard: true, gloss: .26 });
    for (const g of glyphs(MX + .32, 2.40, MZ + .02, Math.PI, '地铁站',
        { size: .20, gap: .05, color: col.white, mode: 1 })) litten(g, .9);
    cyl(MX - .94, 2.40, MZ + .01, .145, .03, col.white,
      { rz: Math.PI / 2, mode: 1, gloss: .20 });
    for (const g of glyphs(MX - .94, 2.40, MZ - .02, Math.PI, '地',
        { size: .17, gap: 0, color: col.blueSign, mode: 1 })) litten(g, .5);
    box(MX - 1.96, 1.55, MZ - .16, .16, 3.10, .16, col.steelD,
      { hard: true, gloss: G.metal, ...MAT.rail });
    box(MX - 1.96, 2.60, MZ - .20, .52, 1.60, .14, col.blueSign, { hard: true, gloss: .26 });
    for (const g of glyphs(MX - 1.96, 2.58, MZ - .28, Math.PI, '动物',
        { size: .17, gap: .05, vertical: true, color: col.white, mode: 1 })) litten(g, .9);
    // The station mouth, lit cool and from underneath the canopy — the one light in the zoo that
    // is not a warm filament, because what is down those steps is a fluorescent-lit subway and
    // the difference between the two colours is most of what says so from the far end of the
    // plaza. Aimed at the stair head, so the treads catch it and the hole reads as a way down.
    light(MX, 2.30, MZ + .55, [0.74, 0.85, 1.00], .80, 4.6);
    // Three measured bodies follow the two side rails and the stair well. The former single
    // 3.4 × 2.1 m rectangle sealed the preserved west-loop paving and trapped the visitor route
    // at its first waypoint even though the open centre is visibly an approach to the stairs.
    solid(MX - 1.18, MX - .94, MZ - .30, MZ + .80);
    solid(MX + .94, MX + 1.18, MZ - .30, MZ + .80);
    solid(MX - .90, MX + .90, MZ - .30, MZ + .80);
    shade(MX, MZ + .6, 3.4, 2.6, .28);
    thing('地铁站', MX, 2.92, MZ - .30, '坐地铁回去吧。', "Let's take the subway back.",
      '地铁 subway + 站 stop. The line runs from here back into town.',
      { focus: [MX + 2.0, MZ + .90], reach: 2.4 }).station = '动物园';
  }

  build();
  // Everything outside the preserved heritage core is compiled from the canonical JSON plan.
  // The returned hooks extend this scene without a second Build.finish call.
  const expansion = ZooExpansion.build(B, {
    col, MAT, G, litten, pools, tree, bench, bin,
    core: { RX, RZ, GX, OUT, PENS },
  });

  // Keep planting on its authored transforms. The former per-blade wind pass rewrote more than
  // eighty bamboo/grass matrices every frame; even with small angles, motion scattered across two
  // enclosures read as the whole zoo shaking. Animals and keepers now provide the living motion,
  // while the elephant enrichment keeps one slow, weighty pendulum animation.
  function tick(t, player) {
    const wind = typeof Weather !== 'undefined' && Weather.now ? Weather.now.wind : .18;
    const a = Math.sin(t * .47 + .8) * (.018 + wind * .045) + Math.sin(t * .91) * .007;
    const c = Math.cos(a), s = Math.sin(a);
    const px = PENS.elephant.x1 - 2.4, py = 3.38;
    for (const q of enrichmentParts) {
      const m = q.p.m, b = q.m0;
      for (let j = 0; j < 3; j++) {
        const o = j * 4, x = b[o], y = b[o + 1];
        m[o] = c * x - s * y; m[o + 1] = s * x + c * y;
        m[o + 2] = b[o + 2]; m[o + 3] = b[o + 3];
      }
      const x = b[12] - px, y = b[13] - py;
      m[12] = px + c * x - s * y; m[13] = py + s * x + c * y;
      m[14] = b[14]; m[15] = 1;
    }
    if (expansion && expansion.tick) expansion.tick(t, player);
  }
  function setNight(k) {
    const soft = k * k * (3 - 2 * k);
    for (const { p, k: kk } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) + soft * kk * .34;
    // And the pools the lamps stand in. Kept well under the point lights that share their
    // positions — the pool is there to fake the bounce off the paving that the renderer has no
    // way to compute, and any more than a hint of it turns a lamp into a spotlight on a stage.
    for (const g of pools) g.a = soft * .30;
    if (expansion && expansion.setNight) expansion.setNight(k);
  }

  return B.finish({
    setNight, tick, liftAt, expansion, RX: SITE_RX, RZ: SITE_RZ, OUT, PENS,
    label: '动物园', labelK: '动物园 · the zoo',
    indoor: false, cutaway: false, near: .18, far: 1080,
    fogNear: 58, fogD: .0032, expose: .52,
    spawn: { x: GX, z: -RZ + 2.60, yaw: 0 },
    zones: expansion.zones,
    roomAt(x, z) {
      return this.zones.find(q => x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1) ||
        this.zones[0];
    },
  });
});
