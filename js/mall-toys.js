// 玩具店 · 欢乐玩具 · HAPPY TOYS — floor 2
//
// This tenant's fit-out. Registering a function here overrides the inline `fit` still sitting in
// js/mall.js (see MallFit at the top of that file), so the two can be compared and the old one
// stays as the fallback until this is better than it.
//
// The callback is handed `A`, the shop's own local frame and toolkit. Coordinates are (a, b):
// `a` is depth measured inward from the outside wall, 0 at the back and 4.8 at the shopfront;
// `b` runs along the frontage, 0 at the centre and +/- half the unit's length at the ends. `y`
// is height above this shop's own floor, so the same numbers work on any deck.
//
//   A.put(a,b,w,dp,h,y,colour,opt)   a box, sized in shop-local axes
//   A.cyl / A.ball / A.cap / A.taper (a,b,y,...,colour,opt)
//   A.rail(a,b,len,colours[,tag,y])  a hanging clothes rail
//   A.island(a,b,w,dp,fill)          a low display island; `fill(topY)` dresses it
//   A.counter(a,b,w,dp[,colour,till]) a service counter, optionally with a till
//   A.table(a,b[,seats,r])           a table with chairs, collider included
//   A.glyph(a,b,y,text,opt)          characters on a surface; opt.back faces the other way
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// ---------------------------------------------------------------------------------------------
// What a toy shop is, and what the fallback was not.
//
// The inline version was one shelving bay of identical teddies, three identical tables of the
// same teddies, and a counter. Standing in the door you saw forty copies of one object in six
// colours and nothing else: a stockroom for a single line, not a shop. A toy shop is the most
// visually various room on any high street, and it gets that from four things at once —
//
//   * range. Boxed toys, board games, balls, cars, blocks, soft toys and ride-ons are seven
//     different silhouettes, and it is the silhouettes that read at four metres, not the colours.
//   * height. Small money at a child's eye height, the boxed sets above it, and the bicycle
//     nobody is getting today hung out of reach over the top of the wall.
//   * a demonstration. Somewhere in every toy shop is one thing already unpacked and running:
//     here a wooden railway on a play table, mid-game, with the blocks left where they fell.
//   * overhead colour. Bunting and balloons, because the ceiling of a toy shop is not empty.
//
// Colour: every toy here is flat saturated plastic or moulded card with no tiling material on it
// at all, which is what those things actually look like. The materials are spent on the joinery
// (`wood`) and the shelf metal (`steel`, the one map that does not change the value of what wears
// it), so the timber reads as timber and the toys stay the brightest thing in the room.
MallFit['玩具店'] = A => {
  const D = 4.8;                              // the shopfront; the back wall is a = 0

  // ---- the shop's own axes, worked out rather than assumed ------------------------------------
  // `put` is given sizes in (a, b) and sorts the mapping to world x/z out itself, but the round
  // primitives are not: A.ball/A.cap/A.taper take sizes in world axes, and `ry`/`rx`/`rz` turn
  // things in world axes too. So the two directions are measured once, here, from the frame's own
  // `at()`, and everything below is written in (a, b) on top of that. A shop that hard-codes
  // "depth is z" is a shop that comes out inside-out the day it is moved to another wall.
  const ew = A.dim(1, 0)[0] === 1;            // true on the W/E walls: depth runs along x
  const o0 = A.at(0, 0), oA = A.at(1, 0), oB = A.at(0, 1);
  const aDir = [oA[0] - o0[0], oA[1] - o0[1]];   // unit +a, in world (x, z)
  const bDir = [oB[0] - o0[0], oB[1] - o0[1]];   // unit +b
  // Radii and sizes for the round primitives, given in (along-a, along-b) and handed back in
  // world order.
  const BALL = (a, b, y, ra, ry, rb, c, o = {}) => {
    const d = A.dim(ra, rb); return A.ball(a, b, y, d[0], ry, d[1], c, o);
  };
  const TAPER = (a, b, y, sa, sy, sb, c, o = {}) => {
    const d = A.dim(sa, sb); return A.taper(a, b, y, d[0], sy, d[1], c, o);
  };
  // Turning things. `tipBack` tilts the top of a prop towards the back wall; `tipSide` tilts it
  // towards +b; `layB` and `layA` lay a capsule or cylinder down along the frontage and into the
  // depth. All four resolve to the world axis that happens to mean that on this wall.
  const tipBack = v => ew ? { rz:  v * aDir[0] } : { rx: -v * aDir[1] };
  const tipSide = v => ew ? { rx:  v * bDir[1] } : { rz: -v * bDir[0] };
  const layB = tipSide(Math.PI / 2), layA = tipBack(Math.PI / 2);
  // A box turned to lie along an arbitrary direction on the floor: `ln` runs along it, `cr`
  // across. Used by the railway, which is a closed curve and therefore every sleeper is at a
  // different angle.
  const yawOf = (a, b, a2, b2) => {
    const p = A.at(a, b), q = A.at(a2, b2); return Math.atan2(q[0] - p[0], q[1] - p[1]);
  };
  const along = (a, b, ln, cr, h, y, c, yw, o = {}) =>
    A.put(a, b, ew ? cr : ln, ew ? ln : cr, h, y, c, { ry: yw, ...o });

  // ---- palette -------------------------------------------------------------------------------
  // A toy shop in three colours reads as a stockroom, so this is deliberately a wide wheel: six
  // hues at two values each, plus the neutrals the fixtures are made of. Values are kept a shade
  // below full so that the lights below have somewhere to go — a #ff0000 box under a 0.4 lamp
  // clips to a flat red blob with no form in it at all.
  const P = {
    red:    C('#d2453a'), rose:  C('#e0697c'), pink:  C('#eda0ba'),
    orange: C('#e2842f'), amber: C('#eab13c'), yellow:C('#ecce55'),
    lime:   C('#93bf46'), green: C('#48995a'), teal:  C('#2b9d92'),
    aqua:   C('#5ec0c6'), sky:   C('#4fa2d6'), blue:  C('#3070b2'),
    navy:   C('#2b4d83'), violet:C('#8560ac'), plum:  C('#a5548d'),
    cream:  C('#f1e6d1'), white: C('#f5f1e7'), sand:  C('#d8c7a4'),
    wood:   C('#8a6743'), woodD: C('#4d3a2a'), woodL: C('#ab875b'),
    trim:   C('#2f3236'), steel: C('#9ba5ad'), steelD:C('#66707a'),
    warm:   C('#ffeccd'), ink:   C('#1b1f23'), grass: C('#5f9b53'),
    gold:   C('#caa14a'), goldL: C('#f3d47b'),
  };
  // The toy wheel, in an order where no two neighbours are close in hue: goods are laid out by
  // walking this, so a shelf never comes out as a gradient.
  const TC = [P.red, P.sky, P.yellow, P.violet, P.green, P.orange, P.navy, P.rose,
              P.aqua, P.plum, P.lime, P.blue, P.amber, P.teal, P.pink, P.orange];
  const tc = i => TC[((i % TC.length) + TC.length) % TC.length];
  const reducedMotion = () => {
    try {
      if (typeof window !== 'undefined' && window.MotionSafety && window.MotionSafety.reduced)
        return !!window.MotionSafety.reduced();
      return typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  };

  // ---- materials -----------------------------------------------------------------------------
  // Only three, and only on the fixtures. `wood` reads 1.72x mid grey so the colours passed with
  // it are already a stop down; `steel` is the one value-neutral map in the set (1.03x) and so is
  // what the shelf metal and the bicycle wear; `fabric` is 2.69x, which is why it is used once, at
  // matAmt .14, on the one surface big enough to want a weave in it.
  const MW = { mat: 'wood',   matScale: .90, matAmt: .30 };
  const MS = { mat: 'steel',  matScale: .55, matAmt: .28 };
  const MF = { mat: 'fabric', matScale: .34, matAmt: .14 };
  const T = { tag: '玩具' };                         // everything that is stock, not fixture
  const soft = { mode: 7, gloss: .06, ...T };        // plush
  const plastic = r => ({ mode: 7, round: r, gloss: .34, ...T });

  // ============================================================================ the goods
  // Each of these is three to nine primitives, and that is the point: a thing on a shelf that is
  // one coloured cube is a coloured cube. A carton has a printed panel, a car has wheels under it,
  // a soft toy has a face. At four metres you do not read the detail, you read that there *is*
  // detail, and that is the whole difference between a shop and a colour chart.

  // A cheap deterministic wobble, so that a run of goods laid out by a loop is not a ruled grid.
  // Seeded off the index alone: the room is rebuilt every time the player walks in and a Math
  // .random() here would give a different shop each visit, which is the one thing a shop must not
  // do. `jit(i, n)` lands in [-n, +n].
  const jit = (i, n) => (((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 - .5) * 2 * n;

  // A boxed toy: carton, a printed header band across the top, the picture panel, and the strip of
  // brand under it. Four pieces rather than three because a carton is a *printed* object — take
  // the header off and a shelf of these is a row of coloured slabs with a lighter rectangle on
  // each, which is what a colour chart looks like. The whole thing is turned a few degrees off
  // square: nobody faces up a shelf perfectly and a shelf that is perfectly faced up reads as a
  // render rather than as stock.
  const carton = (a, b, y, i, wB = .21, h = .29) => {
    const c = tc(i), c2 = tc(i + 5), c3 = tc(i + 11);
    const yw = { ry: jit(i, .075) };
    A.put(a, b, .155, wB, h, y + h / 2, c, { ...plastic(.014), ...yw });
    A.put(a, b, .158, wB * 1.01, h * .17, y + h * .905, c3, { hard: true, mode: 7, ...yw, ...T });
    A.put(a + .080, b, .012, wB * .76, h * .40, y + h * .56, c2, { hard: true, mode: 7, ...yw, ...T });
    A.put(a + .081, b, .010, wB * .44, h * .12, y + h * .21, P.cream, { hard: true, mode: 7, ...yw, ...T });
  };
  // A board game: flat, wide, and stood on edge leaning back against the one behind it.
  const gameBox = (a, b, y, i, h = .30) => {
    const c = tc(i), yw = { ry: jit(i + 3, .06) };
    A.put(a, b, .052, .24, h, y + h / 2, c,
      { hard: true, mode: 7, gloss: .30, ...tipBack(.09), ...yw, ...T });
    A.put(a + .028, b, .008, .18, h * .34, y + h * .58, tc(i + 7),
      { hard: true, mode: 7, ...tipBack(.09), ...yw, ...T });
    A.put(a + .029, b, .007, .11, h * .09, y + h * .22, P.cream,
      { hard: true, mode: 7, ...tipBack(.09), ...yw, ...T });
  };
  // A ball. The moulded seam runs over the top of it rather than round the middle: a horizontal
  // band on a sphere reads as a flying saucer, and the panel line every plastic ball actually has
  // is a meridian.
  const ballToy = (a, b, y, i, r = .072) => {
    A.ball(a, b, y + r, r, r, r, tc(i), { gloss: .40, ...T });
    BALL(a, b, y + r, r * 1.01, r * 1.01, r * .26, tc(i + 6), { gloss: .40, ...T });
  };
  // A soft toy: body, head, ears, muzzle, nose and two eyes. The eyes are 1.4 cm across and cost
  // two primitives, and they are the reason this reads as an animal rather than a snowman.
  //
  // Three ear sets off the index, because the silhouette is the only thing that carries at four
  // metres and thirty-five identical bears on three fixtures is one bear shown thirty-five times.
  // A rabbit's ears stand a whole head above the head; a dog's hang down the sides of it; the
  // bear's are the round ones on top. Nothing else about the animal changes, and it is enough.
  const plush = (a, b, y, i, s = 1) => {
    const c = tc(i), c2 = tc(i + 8), k3 = ((i % 3) + 3) % 3;
    BALL(a, b, y + .105 * s, .100 * s, .098 * s, .112 * s, c, soft);          // body
    BALL(a, b, y + .246 * s, .076 * s, .080 * s, .082 * s, c, soft);          // head
    if (k3 === 1) for (const k of [-1, 1])                                    // 兔 long ears up
      BALL(a - .004 * s, b + k * .038 * s, y + .366 * s, .021 * s, .074 * s, .025 * s, c2, soft);
    else if (k3 === 2) for (const k of [-1, 1])                               // 狗 ears down
      BALL(a - .012 * s, b + k * .076 * s, y + .252 * s, .024 * s, .050 * s, .027 * s, c2, soft);
    else for (const k of [-1, 1])                                            // 熊 round ears
      BALL(a, b + k * .064 * s, y + .302 * s, .028 * s, .040 * s, .034 * s, c2, soft);
    BALL(a + .052 * s, b, y + .228 * s, .030 * s, .026 * s, .032 * s, c2, soft);   // muzzle
    BALL(a + .073 * s, b, y + .236 * s, .011 * s, .010 * s, .012 * s, P.ink, soft); // nose
    for (const k of [-1, 1])
      BALL(a + .056 * s, b + k * .031 * s, y + .268 * s, .014 * s, .016 * s, .013 * s, P.ink, soft);
    if (k3 === 0)                                                            // and a ribbon
      BALL(a + .014 * s, b, y + .172 * s, .082 * s, .015 * s, .090 * s, tc(i + 3), soft);
  };
  // A toy car, side on, which is how they are shown: body, cabin, four wheels on axles that run
  // into the shelf rather than along it.
  const toyCar = (a, b, y, i, s = 1) => {
    A.put(a, b, .092 * s, .200 * s, .068 * s, y + .070 * s, tc(i), plastic(.020));
    A.put(a, b - .016 * s, .078 * s, .100 * s, .054 * s, y + .131 * s, tc(i + 4), plastic(.020));
    for (const kb of [-1, 1]) for (const ka of [-1, 1])
      A.cyl(a + ka * .036 * s, b + kb * .066 * s, y + .031 * s, .031 * s, .020 * s, P.trim,
        { ...layA, gloss: .34, ...T });
  };
  // One building block. Cheap on purpose: they are used by the dozen.
  const block = (a, b, y, i, s = .085) =>
    A.put(a, b, s, s, s, y + s / 2, tc(i), { mode: 7, round: .014, gloss: .30, ...T });

  // A balloon on a string, tied down to (aT, bT, yT). The string is one capsule leaned over so it
  // actually arrives at the knot: a bunch of balloons on parallel vertical threads is a bunch of
  // lollipops.
  // `taper` is a frustum wide at the bottom, so anything meant to hang point-down — the neck of a
  // balloon, a bunting flag — is the same primitive turned over.
  const FLIP = tipBack(Math.PI);
  const balloon = (a, b, y, i, r, aT, bT, yT) => {
    const c = tc(i);
    BALL(a, b, y, r, r * 1.16, r, c, { gloss: .50, ...T });
    TAPER(a, b, y - r * 1.18, r * .34, r * .16, r * .34, c, { gloss: .45, ...FLIP, ...T });
    const dy = y - r * 1.30 - yT, db = b - bT;
    A.cap((a + aT) / 2, (b + bT) / 2, yT + dy / 2, .006, Math.hypot(dy, db), .006, P.cream,
      { ...tipSide(Math.atan2(db, dy)), gloss: .2, ...T });
  };

  // ============================================================================ the back wall
  // Three fixtures across the whole width: a tall bay of boxed stock, the soft-toy wall in the
  // middle under the shop's own name, and a second bay of a different range. The shell's timber
  // feature panel and the gold lettering on it stay visible above them, which is what stops this
  // reading as a warehouse racking run.

  // One bay: carcass, gables, five boards, an LED under each and a price ticket on the front edge.
  // Depth runs outward, so the boards sit at a *larger* a than the back panel or the bay hides its
  // own contents.
  // A bay's header board. Every fixture in a real shop says what is on it, and a category sign is
  // the cheapest thing in the room that makes a wall of stock read as merchandising rather than as
  // storage: dark board, gold characters, sat in the gap between the top shelf and the cornice
  // where the eye is already going.
  // It rides on the front face of the bay's own cornice rather than in the gap under it: hung
  // between the shelves it would be a board across the top shelf's stock, and the top shelf is
  // where the biggest cartons are.
  const header = (bc, w, text) => {
    A.put(1.07, bc, .05, w - .18, .20, 2.45, P.trim, { hard: true, gloss: .30 });
    A.put(1.106, bc, .010, w - .26, .010, 2.352, P.gold, { hard: true, mode: 1, gloss: .40 });
    A.glyph(1.09, bc, 2.46, text, { size: .135, gap: .055, color: P.goldL, mode: 1, glow: .10 });
  };
  // Non-verbal age zoning. One, two and three diamond dots are quicker to read from the doorway
  // than another line of tiny copy, work without colour, and cannot inherit the 小孩 talk action a
  // hotspot would. All six are opaque hard boxes on one existing mode-7 draw signature.
  const ageDots = (a, b, y, n, color) => {
    for (let i = 0; i < n; i++)
      A.put(a, b + (i - (n - 1) / 2) * .090, .012, .058, .058, y, color,
        { hard: true, mode: 7, rz: Math.PI / 4, gloss: .26, tag: '年龄分区' });
  };
  const SHELVES = [.30, .74, 1.18, 1.62, 2.06];
  function bay(bc, w, fill) {
    A.put(.53, bc, .05, w, 2.34, 1.22, P.cream, { hard: true, gloss: .14 });          // back panel
    for (const k of [-1, 1])
      A.put(.76, bc + k * (w / 2 - .035), .50, .07, 2.36, 1.23, P.woodD,
        { hard: true, mode: 6, gloss: .18, ...MW });                                  // gables
    A.put(.77, bc, .53, w + .04, .08, 2.45, P.woodD, { hard: true, mode: 6, gloss: .18, ...MW });
    A.put(.74, bc, .46, w - .10, .17, .09, P.trim, { hard: true, gloss: .26 });        // toe kick
    SHELVES.forEach((y, r) => {
      A.put(.76, bc, .48, w - .09, .042, y, P.woodL, { hard: true, mode: 6, gloss: .22, ...MW });
      A.put(.985, bc, .022, w - .13, .026, y - .046, P.warm, { hard: true, mode: 1, glow: .20 });
      for (const k of [-1, 1])                                                        // tickets
        A.put(.998, bc + k * w * .27, .010, .155, .045, y + .034, k > 0 ? P.yellow : P.red,
          { hard: true, mode: 7, ...T });
      fill(y + .021, r, bc, w);
    });
    A.stop(.45, 1.05, bc - w / 2, bc + w / 2);
  }

  // Left bay: the big boxed ranges, a shelf of board games and a shelf of balls.
  bay(-2.35, 2.10, (y, r, bc, w) => {
    const run = (n, f) => { for (let i = 0; i < n; i++) f(bc - w / 2 + (w / (n + 1)) * (i + 1), i); };
    if (r === 0) run(4, (b, i) => carton(.80, b, y, i * 3 + 1, .38, .40));
    if (r === 1) run(8, (b, i) => gameBox(.83, b, y, i * 2 + 3, .29));
    if (r === 2) run(6, (b, i) => carton(.80, b, y, i * 3 + 5, .26, .33));
    if (r === 3) run(8, (b, i) => ballToy(.80, b, y, i * 3 + 2, .070));
    if (r === 4) run(6, (b, i) => carton(.80, b, y, i * 3, .25, .30));
  });
  header(-2.35, 2.10, '益智玩具');
  ageDots(1.116, -3.07, 2.45, 2, P.sky);
  // Right bay: cars, small soft toys, blocks in boxes. Different silhouettes on every shelf, so
  // the two bays do not read as one repeated unit with the colours shuffled.
  bay(2.35, 2.10, (y, r, bc, w) => {
    const run = (n, f) => { for (let i = 0; i < n; i++) f(bc - w / 2 + (w / (n + 1)) * (i + 1), i); };
    if (r === 0) run(5, (b, i) => carton(.80, b, y, i * 3 + 4, .32, .38));
    if (r === 1) run(6, (b, i) => toyCar(.80, b, y, i * 3 + 1, 1.05));
    if (r === 2) run(6, (b, i) => plush(.80, b, y, i * 3 + 6, .78));
    if (r === 3) run(6, (b, i) => carton(.80, b, y, i * 3 + 2, .26, .32));
    if (r === 4) run(7, (b, i) => gameBox(.83, b, y, i * 2 + 1, .27));
  });
  header(2.35, 2.10, '模型车辆');
  ageDots(1.116, 3.03, 2.45, 3, P.orange);

  // ---- the soft-toy wall, between the bays and under the shop's name --------------------------
  // Three tiers, and the toys get smaller as they go up, which is both how they are merchandised
  // and what gives the wall a base. The backing is a deep teal so that fifteen pastel animals in
  // front of it have something to be lighter than; against the shell's cream it was fifteen pale
  // shapes on a pale wall.
  //
  // It stops at 1.68 and not a centimetre higher, and that is the whole reason this fixture is
  // shorter than the two bays either side of it. The shell writes the shop's name in gold across
  // the timber feature panel at 1.82–2.08 and at a smaller depth than anything a tenant builds,
  // so a fixture 1.85 tall standing in the middle of the back wall does not cover the name — it
  // covers the bottom half of every character in it, which reads as a rendering fault rather than
  // as a shelf. Anything a tenant stands against the middle of its own back wall has to duck.
  A.put(.52, 0, .06, 2.30, 1.66, .85, C('#2b5c72'), { hard: true, gloss: .12 });
  for (const k of [-1, 1])
    A.put(.74, k * 1.11, .46, .08, 1.68, .86, P.woodD, { hard: true, mode: 6, gloss: .18, ...MW });
  A.put(.75, 0, .49, 2.34, .09, 1.72, P.woodD, { hard: true, mode: 6, gloss: .18, ...MW });
  A.put(.74, 0, .44, 2.26, .17, .09, P.trim, { hard: true, gloss: .26 });
  const NICHE = [[.18, 1.22, 4], [.70, 1.00, 5], [1.19, .80, 6]];
  NICHE.forEach(([y, s, n], r) => {
    A.put(.74, 0, .44, 2.20, .042, y - .021, P.woodL, { hard: true, mode: 6, gloss: .22, ...MW });
    A.put(.955, 0, .020, 2.06, .024, y - .062, P.warm, { hard: true, mode: 1, glow: .18 });
    for (let i = 0; i < n; i++)
      plush(.78, -1.02 + (2.04 / (n - 1)) * i, y, r * 5 + i * 3 + 2, s);
  });
  // What the middle bay is, said on it. The two side bays carry the same board on their cornice.
  A.put(1.03, 0, .05, 1.24, .13, 1.715, P.trim, { hard: true, gloss: .30 });
  A.glyph(1.05, 0, 1.722, '毛绒玩具', { size: .105, gap: .045, color: P.goldL, mode: 1, glow: .10 });
  ageDots(1.076, -.47, 1.715, 1, P.lime);
  A.stop(.45, 1.00, -1.16, 1.16);

  // ---- hung out of reach ---------------------------------------------------------------------
  // The expensive things go high, and in a toy shop the highest thing on the wall is a bicycle.
  // It is drawn as an outline — two wheels and six tubes — because that is all a bicycle is at
  // four metres, and an outline in `steel` keeps its value where the palette put it.
  function bike(a, b, y, c, s = 1) {
    const wr = .27 * s, hb = .36 * s;
    for (const k of [-1, 1]) {
      A.cyl(a, b + k * hb, y, wr, .030 * s, P.ink, { ...layA, gloss: .32, ...T });
      A.cyl(a + .004, b + k * hb, y, wr * .74, .034 * s, C('#cfc6b2'), { ...layA, gloss: .26, ...T });
      A.cyl(a - .004, b + k * hb, y, wr * .13, .048 * s, P.steel, { ...layA, gloss: .55, ...MS, ...T });
      for (let j = 0; j < 4; j++)                                        // four spokes, not thirty
        A.cap(a + .010, b + k * hb, y, .008 * s, wr * 1.42, .008 * s, P.steel,
          { ...tipSide(j * Math.PI / 4), gloss: .5, ...T });
    }
    const tube = (b1, y1, b2, y2, th) => {
      const db = b2 - b1, dy = y2 - y1;
      A.cap(a - .020, b + (b1 + b2) / 2, y + (y1 + y2) / 2, th, Math.hypot(db, dy), th, c,
        { ...tipSide(Math.atan2(db, dy)), gloss: .42, ...T });
    };
    tube(-hb, 0, -.06 * s, .30 * s, .026 * s);        // seat stay
    tube(-hb, 0, .02 * s, -.02 * s, .026 * s);        // chain stay
    tube(.02 * s, -.02 * s, -.06 * s, .30 * s, .028 * s);   // seat tube
    tube(-.06 * s, .30 * s, .28 * s, .30 * s, .028 * s);    // top tube
    tube(.02 * s, -.02 * s, .30 * s, .28 * s, .028 * s);    // down tube
    tube(hb, 0, .30 * s, .30 * s, .024 * s);          // fork
    A.put(a - .02, b + .30 * s, .07 * s, .32 * s, .030 * s, y + .36 * s, P.ink,
      { hard: true, gloss: .4, ...T });               // handlebar
    A.put(a - .02, b - .06 * s, .17 * s, .075 * s, .035 * s, y + .34 * s, P.ink,
      { hard: true, mode: 7, gloss: .3, ...T });      // saddle
    for (const k of [-1, 1])                          // wall brackets
      A.put(.36, b + k * hb, .42, .05, .05, y + wr + .10, P.steelD,
        { hard: true, gloss: .5, ...MS, ...T });
  }
  // Hung above the bay's own cornice sign, not across it.
  bike(.62, -2.30, 2.88, P.red, .92);

  // A hanging shelf-edge sign over the other bay, so the top of the wall is not one-sided.
  A.put(1.16, 2.30, .05, 1.00, .32, 2.82, P.red, { hard: true, gloss: .30, ...T });
  A.glyph(1.20, 2.30, 2.76, '新品', { size: .17, gap: .06, color: P.cream, mode: 1, glow: .16, ...T });
  for (const k of [-1, 1])
    A.cap(1.16, 2.30 + k * .40, 3.26, .008, .58, .008, P.steelD, { gloss: .5, ...MS, ...T });

  // ============================================================================ the demonstration
  // One play table in the middle of the floor with a wooden railway on it, mid-game: a loop, a
  // train part-way round, a half-built castle beside the track and blocks left on the grass. This
  // is the single most important object in the room — a toy shop where nothing is out of its box
  // is a warehouse — so it is low (top at 0.39) and it sits where a child would be standing.
  // A foam play mat under it and out in front of it, sized so the table sits on the back of it and
  // there is a metre of it left over to kneel on. It is what tells you the middle of this floor is
  // somewhere to stop rather than somewhere to walk through, and it gives the one large empty
  // surface in the room — the carpet between the door and the demonstration — something on it.
  // 14 mm proud of the shell's carpet, which is laid at 0.020: coplanar faces z-fight. It stops
  // short of the table rather than running under it — a 14 mm slab through the table's plinth
  // shows as a line cut across the bottom of the joinery — and short of the tubs either side.
  A.put(2.90, 0, 1.00, 2.00, .014, .034, C('#dfe3d0'), { hard: true, mode: 7, gloss: .06, ...MF });
  A.put(2.90, 0, .86, 1.84, .016, .038, C('#eadfc4'), { hard: true, mode: 7, gloss: .06, ...MF });
  A.put(1.75, 0, 1.20, 2.10, .30, .16, P.woodD, { hard: true, mode: 6, gloss: .20, ...MW });
  A.put(1.75, 0, 1.08, 1.98, .10, .05, P.trim, { hard: true, gloss: .26 });
  A.put(1.75, 0, 1.26, 2.16, .06, .34, P.woodL, { hard: true, mode: 6, gloss: .24, ...MW });
  A.put(1.75, 0, 1.14, 2.04, .022, .375, P.grass, { hard: true, mode: 7, gloss: .08, ...MF });
  A.stop(1.15, 2.35, -1.08, 1.08);

  // The railway. A closed loop is the one shape a shelf of primitives cannot fake, so it is built
  // properly: twenty sleeper planks round an ellipse, each turned to its own tangent, with the two
  // rails drawn as slightly larger and slightly smaller ellipses through the same angles.
  const TA = 1.75, RA = .40, RB = .78, SEG = 20, TY = .388;
  const trackPt = (t, k) => [TA + (RA + k) * Math.cos(t), (RB + k) * Math.sin(t)];
  for (let i = 0; i < SEG; i++) {
    const t = i / SEG * Math.PI * 2, t2 = (i + .5) / SEG * Math.PI * 2;
    const [pa, pb] = trackPt(t, 0), [qa, qb] = trackPt(t2, 0);
    const yw = yawOf(pa, pb, qa, qb);
    along(pa, pb, .175, .150, .016, TY + .008, C('#b99361'), yw,
      { hard: true, mode: 6, gloss: .18, ...MW, ...T });
    for (const k of [-.042, .042]) {
      const [ra, rb] = trackPt(t, k);
      along(ra, rb, .175, .026, .011, TY + .021, C('#5b4630'), yw, { hard: true, gloss: .2, ...T });
    }
  }
  // The train, four vehicles nose to tail on the near side of the loop, where you can see them.
  const TRAIN = [[P.red, P.ink], [P.blue, P.yellow], [P.green, P.cream], [P.amber, P.red]];
  const trainRigs=[];
  TRAIN.forEach(([c, c2], i) => {
    const t = (.06 + i * .055) * Math.PI * 2;
    const [pa, pb] = trackPt(t, 0), [qa, qb] = trackPt(t + .04, 0);
    const yw = yawOf(pa, pb, qa, qb);
    const parts=[];
    const carPart=(da,db,ln,cr,h,y,cc,o)=>{
      const p=along(pa+da,pb+db,ln,cr,h,y,cc,yw,o);
      A.dynamic(p,TA,0,TY+.10,1.35);
      const m=p.m;
      parts.push({p,da,db,y,sx:Math.hypot(m[0],m[1],m[2]),
        sy:Math.hypot(m[4],m[5],m[6]),sz:Math.hypot(m[8],m[9],m[10])});
    };
    carPart(0,0,.155,.092,.028,TY+.034,P.ink,{hard:true,gloss:.3,...T});
    carPart(0,0,.140,.082,.062,TY+.078,c,{mode:7,round:.014,gloss:.34,...T});
    if (i === 0) {
      carPart(-.022,0,.062,.078,.058,TY+.136,c,{mode:7,round:.014,gloss:.34,...T});
      carPart(.048,0,.044,.044,.054,TY+.132,c2,{mode:7,round:.014,gloss:.34,...T});
    } else {
      carPart(0,0,.096,.062,.046,TY+.130,c2,{mode:7,round:.014,gloss:.3,...T});
    }
    trainRigs.push({phase:(.06+i*.055)*Math.PI*2,parts});
  });
  // A half-built castle inside the loop, and the blocks that have not been used yet. Uneven on
  // purpose — four towers of the same height is a product shot, three and a bit is a game in
  // progress, which is the only reason the table is here.
  for (let i = 0; i < 4; i++) {
    const bb = -.30 + (i % 2) * .30, aa = 1.60 + Math.floor(i / 2) * .26;
    for (let j = 0; j < 3 - (i % 3 === 0 ? 0 : 1); j++) block(aa, bb, TY + j * .088, i * 4 + j * 2, .086);
  }
  for (let i = 0; i < 3; i++) block(1.86, -.45 + i * .30, TY, i * 5 + 3, .086);
  [[2.28, .55, 0], [1.24, .38, 6], [2.26, -.45, 11], [1.22, -.60, 4]].forEach(([a, b, i], k) =>
    block(a, b, TY, i, .078 + (k % 2) * .012));
  // Two trees beside the line, because a wooden railway always has them.
  for (const [ta, tb] of [[1.42, .60], [2.28, -.20]]) {
    A.cyl(ta, tb, TY + .045, .022, .09, C('#6a5136'), { gloss: .2, ...T });
    TAPER(ta, tb, TY + .150, .150, .190, .150, C('#4e8f4c'), { mode: 7, gloss: .12, ...T });
  }
  // 拼图, half done, along the front edge of the table where the railway does not reach. The loop
  // runs a 1.35–2.19 and b -0.82–0.82, so the table's own front strip from a 2.20 out to its edge
  // at 2.38 is the one piece of it that is clear — and it is also the piece nearest whoever is
  // standing at the table, which is where the puzzle somebody abandoned would actually be.
  //
  // It is here because it is the fifth of the six things this shop sells (MALL_GOODS['玩具店']) and
  // the only one with no object in the room: 拼图 was a word with nothing under it. A jigsaw is
  // also the one toy that cannot be shown in its box — a boxed jigsaw is a boxed anything — so it
  // is built as a picture with a bite out of the corner, two pieces still loose beside it and the
  // lid face-up next to that, which is what a jigsaw looks like from four metres and nothing else
  // does.
  const JA = 2.29, JB = -.55, JP = .082;
  A.put(JA, JB, .185, .365, .008, TY + .006, C('#cdbfa4'),
    { hard: true, mode: 7, gloss: .08, ...T });                        // the board under it
  for (let i = 0; i < 8; i++) {
    const r = i % 4, c = (i / 4) | 0;
    if (i === 3) continue;                                             // the corner nobody found
    A.put(JA - .043 + c * .086, JB - .132 + r * .088, JP, JP, .009, TY + .0145,
      tc(i * 3 + 5), { hard: true, mode: 7, gloss: .26, ...T });
  }
  for (const [ja, jb, i] of [[2.36, -.30, 2], [2.31, -.22, 9]])        // the two still loose
    A.put(ja, jb, JP * .92, JP * .92, .009, TY + .0145, tc(i * 3 + 5),
      { hard: true, mode: 7, gloss: .26, ...T });
  A.put(2.30, -.90, .17, .23, .028, TY + .020, P.violet,
    { hard: true, mode: 7, gloss: .30, ...T });                        // the lid, face up
  A.put(2.30, -.90, .12, .17, .006, TY + .037, tc(7), { hard: true, mode: 7, ...T });
  // Bunches of three, tied to the things they belong to rather than to the table.
  //
  // They used to be two bunches of four on the front corners of the play table, and eight strings
  // then ran the full height of the room straight down the front of the soft-toy wall — which is
  // the hero shelf of the shop. From the doorway you read fifteen animals through a curtain of
  // thread. Tied to a tub rim and to the activity table instead, they put the same colour at eye
  // height out at the sides of the frame, on short strings, where a shop actually ties them.
  const bunch = (aT, bT, yT, n, i0, y0 = 1.56) => {
    for (let i = 0; i < n; i++) {
      const th = i * 2.1 + i0 * .4;
      balloon(aT + Math.cos(th) * .12, bT + Math.sin(th) * .14, y0 + (i % 3) * .11,
        i * 4 + i0, .102, aT, bT, yT);
    }
  };
  bunch(3.02, -1.34, .74, 3, 6);          // on the rim of the soft-toy tub
  bunch(2.36, 3.30, .60, 3, 1, 1.50);     // on the edge of the activity table

  // ============================================================================ the floor stock
  // A tub of soft toys you can see down into and a crate of balls, one either side of the way in,
  // both at the height a five-year-old reaches into. Round tubs rather than square bins: the
  // shopfit is all straight lines and this is the only place in the room to break them.
  function tub(a, b, r, h, c, fill) {
    A.cyl(a, b, h / 2, r, h, c, { mode: 7, gloss: .18, ...MF, ...T });
    A.cyl(a, b, h + .012, r + .022, .05, P.trim, { gloss: .3, ...T });                 // rolled rim
    A.cyl(a, b, h - .06, r * .94, .04, C('#3a4046'), { gloss: .1, ...T });             // the inside
    fill(h - .04);
    A.stop(a - r - .04, a + r + .04, b - r - .04, b + r + .04);
  }
  // Soft toys, heaped: three round the rim leaning outwards and a pile in the middle. The rim ones
  // are what tell you the tub is full rather than a drum with a lid.
  tub(2.72, -1.52, .44, .72, P.rose, ty => {
    plush(2.62, -1.62, ty, 3, 1.05);
    plush(2.80, -1.40, ty + .02, 9, .95);
    plush(2.60, -1.34, ty - .04, 14, .88);
    plush(2.86, -1.66, ty - .02, 6, .82);
    plush(2.72, -1.50, ty + .10, 1, 1.10);
  });
  // Balls: thirty in a crate, and the cheapest bright thing in the room at one primitive each.
  tub(2.72, 1.52, .44, .68, P.sky, ty => {
    for (let i = 0; i < 26; i++) {
      const th = i * 2.399, rr = .07 + (i % 5) * .062;
      A.ball(2.72 + Math.cos(th) * rr, 1.52 + Math.sin(th) * rr,
        ty - .04 + (i % 4) * .085, .072, .072, .072, tc(i * 3 + 2), { gloss: .40, ...T });
    }
  });

  // ---- the wheeled toys ------------------------------------------------------------------------
  // The things too big to shelve stand on the floor, at the scale a three-year-old is.
  //
  // They used to be a rank of four down the left, and the left is where the till is: the scooter
  // stood at a 2.37–2.87, b -3.35, which is *inside* the counter's own body, and the trike and the
  // second ride-on car overlapped the same collider. Worse than the clipping, it left nowhere for
  // anybody to stand behind the till — a counter with a metre of ride-on toys packed in behind it
  // is a counter that can never be staffed. So the aisle is split: the ride-on car and the trike
  // go in the gap on the right between the ball crate and the activity table, which was the one
  // dead metre of floor in the unit, and the scooter is parked at the outboard end of the counter
  // the way a scooter actually gets left. The whole left-hand pocket behind the till is now clear
  // floor, and there is a cashier standing in it.
  toyCar(2.62, 2.29, .00, 1, 2.3);
  // The scooter is here for its silhouette and nothing else: four wheeled things on this floor
  // that are all axles-under-a-body read as one product in four colours, and a deck on a stem is
  // the only one of them you can identify from the door.
  (function scooter(a, b, c) {
    for (const k of [-1, 1])
      A.cyl(a + k * .25, b, .068, .068, .034, P.ink, { ...layB, gloss: .3, ...T });
    A.put(a, b, .50, .13, .034, .112, c, { mode: 7, round: .014, gloss: .34, ...T });     // deck
    A.cap(a + .21, b, .40, .019, .60, .019, P.steel,
      { ...tipBack(.135), gloss: .5, ...MS, ...T });                                      // stem
    A.put(a + .13, b, .05, .32, .034, .69, c, { hard: true, gloss: .35, ...T });          // bar
    for (const k of [-1, 1])
      A.cyl(a + .13, b + k * .13, .69, .019, .07, P.trim, { ...layB, gloss: .3, ...T });  // grips
    A.stop(a - .32, a + .30, b - .22, b + .22);
  })(3.32, -4.06, P.teal);
  (function trike(a, b, c) {
    A.cyl(a - .10, b, .13, .13, .045, P.ink, { ...layB, gloss: .3, ...T });             // front wheel
    for (const k of [-1, 1])
      A.cyl(a + .26, b + k * .17, .095, .095, .040, P.ink, { ...layB, gloss: .3, ...T });
    A.put(a + .12, b, .46, .18, .06, .20, c, { mode: 7, round: .020, gloss: .34, ...T });  // frame
    A.put(a + .26, b, .17, .21, .06, .28, tc(5), { mode: 7, round: .020, gloss: .3, ...T }); // saddle
    A.cap(a - .10, b, .34, .022, .40, .022, P.steel,
      { ...tipBack(-.34), gloss: .5, ...MS, ...T });                                     // steerer
    A.put(a - .16, b, .05, .30, .035, .52, c, { hard: true, gloss: .35, ...T });          // bars
    A.stop(a - .30, a + .42, b - .28, b + .28);
  })(1.70, 2.28, P.violet);
  A.stop(1.40, 2.85, 1.98, 2.60);

  // ---- the activity table, down the right ------------------------------------------------------
  // Somewhere for a child to be left while the shopping happens: a low round table, two stools and
  // a bin of blocks half-tipped over it.
  A.cyl(1.95, 3.35, .025, .34, .05, P.trim, { gloss: .3, ...T });
  A.cyl(1.95, 3.35, .28, .13, .50, P.steelD, { gloss: .5, ...MS, ...T });
  A.cyl(1.95, 3.35, .55, .54, .06, P.amber, { gloss: .30, ...T });
  for (let i = 0; i < 9; i++)
    block(1.95 + Math.cos(i * 2.4) * .30, 3.35 + Math.sin(i * 2.4) * .30, .58, i * 3 + 4, .082);
  for (let i = 0; i < 4; i++) block(2.02, 3.28, .58 + i * .084, i * 5, .082);
  for (const [sa, sb, i] of [[2.62, 3.00, 2], [2.55, 3.85, 9]]) {
    A.cyl(sa, sb, .13, .16, .26, tc(i), { mode: 7, gloss: .3, ...T });
    A.cyl(sa, sb, .28, .19, .05, tc(i + 4), { mode: 7, gloss: .3, ...T });
  }
  A.stop(1.30, 2.85, 2.62, 4.30);

  // ============================================================================ 遥控车 · the test track
  // The one thing this shop advertised and did not have. The right-hand bay's cornice board says
  // 模型车辆 and js/vocab.js, js/data.js and the arcade's prize case all carry 遥控车 — it is a
  // headword, a thing you can buy for 199 and the second most expensive prize in the building —
  // and there was no object anywhere in the room under it. A word with nothing beneath it is the
  // one failure a shop in a language game cannot have.
  //
  // ---- where it stands, which is the only place it could
  // Flood-filling this unit with the room's own Mall.clampUpper at the 0.30 m walking radius says
  // a body can reach 8.7 m² of this shop, and the strip between the ball crate (b 1.08–1.96) and
  // the activity table (b 2.62–4.30) is not part of it: the two colliders grown by the radius
  // already meet across it. So the track goes in that gap — a 2.94–3.42, b 2.00–2.66 — and costs
  // the room no floor it had. It is still in full view from the door aisle and from the pocket in
  // front of the activity table, which is where a child watching it would stand.
  //
  // Budget: 46 primitives, which is what a demonstration fixture is worth in the heaviest room in
  // the game. Everything else this display would want — what age it is for, what batteries it
  // takes, whether the stock rotates — is in the word cards below, where text is free.
  const RC = { a: 3.18, b: 2.33, top: .78 };
  A.put(RC.a, RC.b, .48, .66, .70, .35, P.woodD, { hard: true, mode: 6, gloss: .18, ...MW });
  A.put(RC.a, RC.b, .40, .56, .12, .06, P.trim, { hard: true, gloss: .26 });
  A.put(RC.a, RC.b, .52, .70, .04, RC.top - .02, P.woodL,
    { hard: true, mode: 6, gloss: .22, ...MW });
  // The track: ten tangent segments round an ellipse, the same construction the railway uses one
  // table over, at a tenth the length. Dark tarmac with the plinth's own top showing through the
  // middle, which is what a demo mat is.
  const RCA = .165, RCB = .235, RSEG = 10;
  const rcPt = (t) => [RC.a + RCA * Math.cos(t), RC.b + RCB * Math.sin(t)];
  for (let i = 0; i < RSEG; i++) {
    const [pa, pb] = rcPt(i / RSEG * Math.PI * 2);
    const [qa, qb] = rcPt((i + 1) / RSEG * Math.PI * 2);
    along((pa + qa) / 2, (pb + qb) / 2, Math.hypot(qa - pa, qb - pb) * 1.06, .105, .010,
      RC.top + .005, C('#3a4046'), yawOf(pa, pb, qa, qb), { hard: true, gloss: .12, ...T });
  }
  // Three checkpoints on the road and three cells on the backboard. They are the same retained
  // opaque box key, so colour/glow feedback is one dynamic draw rather than six. A checkpoint is
  // bright only during the angular crossing window; the strip retains one, two or three completed
  // sectors and resets deterministically with the next lap.
  const RC_OFF = C('#26322d'), RC_ON = P.lime, RC_DONE = P.aqua;
  const RC_TAU = Math.PI * 2, RC_CHECK = [0, RC_TAU / 3, RC_TAU * 2 / 3];
  const rcCheckpointLights = [], rcLapStrip = [];
  for (const t of RC_CHECK) {
    const [a,b] = rcPt(t);
    const p = A.put(a,b,.032,.032,.012,RC.top+.017,RC_OFF,
      { hard:true,mode:1,glow:.01,gloss:.30,tag:'遥控反馈' });
    A.dynamicVisual(p); rcCheckpointLights.push(p);
  }
  for (let i = 0; i < 3; i++) {
    const p = A.put(2.995,RC.b+(i-1)*.090,.010,.065,.038,RC.top+.072,RC_OFF,
      { hard:true,mode:1,glow:.01,gloss:.30,tag:'遥控反馈' });
    A.dynamicVisual(p); rcLapStrip.push(p);
  }
  // The car that runs. Four boxes and no wheels: at a 9 cm body on a table a wheel is two pixels,
  // and every one of them would be a matrix to rebuild on the tick. The parked car beside it is
  // the shop's own `toyCar`, which has them, and is the one you look at close up.
  const rcRig = [];
  {
    const [pa, pb] = rcPt(0), [qa, qb] = rcPt(.25);
    const yw = yawOf(pa, pb, qa, qb);
    const rcPart = (da, db, ln, cr, h, y, cc, o) => {
      const p = along(pa + da, pb + db, ln, cr, h, y, cc, yw, o);
      A.dynamic(p, RC.a, RC.b, RC.top + .06, .40);
      const m = p.m;
      rcRig.push({ p, da, db, y, sx: Math.hypot(m[0], m[1], m[2]),
        sy: Math.hypot(m[4], m[5], m[6]), sz: Math.hypot(m[8], m[9], m[10]) });
    };
    rcPart(0, 0, .112, .056, .018, RC.top + .022, P.ink, { hard: true, gloss: .3, ...T });
    rcPart(0, 0, .100, .050, .030, RC.top + .046, P.red, { mode: 7, round: .010, gloss: .40, ...T });
    rcPart(-.008, 0, .046, .044, .024, RC.top + .073, P.cream,
      { mode: 7, round: .008, gloss: .40, ...T });
    rcPart(-.048, 0, .014, .052, .022, RC.top + .072, P.yellow, { hard: true, gloss: .35, ...T });
  }
  toyCar(RC.a + .18, RC.b - .24, RC.top + .012, 7, .55);
  // The backboard, and the two things a demonstration has to say: what it is, and that you may.
  A.put(2.96, RC.b, .04, .62, .50, RC.top + .25, P.trim, { hard: true, gloss: .28 });
  A.put(2.985, RC.b, .012, .56, .44, RC.top + .25, C('#1d2a36'),
    { hard: true, mode: 1, glow: .10 });
  A.glyph(2.995, RC.b, RC.top + .36, '遥控车',
    { size: .105, gap: .038, color: P.goldL, mode: 1, glow: .16 });
  A.glyph(2.995, RC.b, RC.top + .19, '免费试玩',
    { size: .058, gap: .020, color: P.cream, mode: 1, glow: .10 });
  // The handset on its stand and the big green button under it. A demonstration nobody is allowed
  // to touch is a display case; the button is the whole difference.
  A.put(3.38, RC.b - .23, .11, .075, .034, RC.top + .017, P.trim,
    { hard: true, mode: 7, gloss: .34, ...T });
  for (const k of [-1, 1])
    A.cyl(3.38, RC.b - .23 + k * .022, RC.top + .046, .009, .026, P.steel,
      { gloss: .5, ...MS, ...T });
  A.cyl(3.42, RC.b - .23, RC.top + .105, .004, .16, P.steelD,
    { ...tipBack(.16), gloss: .5, ...MS, ...T });
  A.cyl(3.38, RC.b + .24, RC.top + .014, .038, .028, P.steelD, { gloss: .45, ...MS, ...T });
  A.cyl(3.38, RC.b + .24, RC.top + .034, .030, .022, P.lime, { mode: 1, glow: .18, ...T });
  // Boxed stock stacked on the floor beside it, which is where a toy shop keeps the ones still in
  // their cartons. Standing on the dead strip in front of the activity table, so no floor is lost.
  carton(3.34, 2.86, .00, 4, .24, .30);
  carton(3.34, 2.86, .30, 9, .24, .30);
  A.stop(2.94, 3.42, 2.00, 2.66);

  // ============================================================================ the till
  // At the end of the run, with the pocket-money on it: three tiers of open bins of small bright
  // things, at the height a child queueing with a parent can reach into. Every toy shop's last
  // twenty seconds of trading happen here.
  //
  // ---- where it stands, and why the shell's own till is switched off -------------------------
  // `A.counter(..., till)` will build the register and hang the 收银台 word itself, and this shop
  // does neither, because of where that word's walk-to point lands. `A.th` stands the player
  // 1.15 m out at +a from the word, and the shell hangs its word another 0.85 m in front of the
  // counter: two metres of offset in total. A counter anywhere in the front half of a 4.8 m unit
  // therefore puts the person paying for the toy *outside the shop*, through the glass, standing
  // in the concourse — and worse, the band a 4.15–5.25 behind the shopfront glazing is inside
  // that collider once the player's own 0.30 m radius is counted, so the walk-to point sits on
  // the one strip of floor nobody can stand on.
  //
  // So `till:false`, and the register, the reader, the word on the counter face and the label are
  // all built here. The counter runs a 2.20–3.00; the word hangs over its top at a 2.25, which
  // puts the queue at a 3.40 — clear of the counter's own collider by 0.12 and clear of the
  // raised window platform the shell builds from a 3.66 outward. That is a person standing at a
  // till inside a shop, which is what 买单 is supposed to look like.
  //
  // The metre of floor this frees up behind the counter is the other half of the point: it is
  // where the cashier stands. See MallCast at the foot of this file.
  A.counter(2.60, -3.40, 1.80, .80, P.red, false);
  // The register, on the outboard end, with its screen facing the person behind it and the card
  // reader on a stalk turned the other way. Two screens facing opposite ways across a counter is
  // the whole visual grammar of paying for something.
  A.put(2.58, -4.02, .44, .34, .28, 1.12, P.trim, { hard: true, gloss: .30, tag: '收银台' });
  A.put(2.79, -4.02, .16, .26, .045, 1.285, P.steel,
    { hard: true, gloss: .50, ...MS, tag: '收银台' });
  A.put(2.40, -4.02, .05, .30, .20, 1.31, P.trim, { hard: true, gloss: .35, tag: '收银台' });
  const tillScreen=A.put(2.37, -4.02, .012, .25, .15, 1.31, C('#17324a'),
    { hard: true, mode: 1, glow: .14, tag: '收银台' });
  A.cyl(2.94, -3.05, 1.06, .022, .16, P.steelD, { gloss: .5, ...MS, tag: '收银台' });
  A.put(2.95, -3.05, .06, .14, .17, 1.21, P.trim,
    { hard: true, gloss: .35, ...tipBack(.30), tag: '收银台' });
  const readerScreen=A.put(2.98, -3.05, .012, .11, .12, 1.215, C('#1d3550'),
    { hard: true, mode: 1, glow: .12, ...tipBack(.30), tag: '收银台' });
  if(A.powerDisplay)A.powerDisplay([tillScreen,readerScreen],{id:'till'});
  // The word, on the customer's face of the counter. The shell writes its own at a-dp/2, which on
  // a frame where depth runs outward is the *back* of the joinery, facing away into it.
  A.glyph(3.07, -3.40, .60, '收银台',
    { size: .12, gap: .045, color: P.goldL, mode: 1, glow: .12, tag: '收银台' });
  // Pocket money, tiered up away from the customer so the back row is the one you can see. The
  // bins stop short of the register at the outboard end.
  for (let t = 0; t < 3; t++) {
    const a = 2.85 - t * .17, y = .98 + t * .13;
    A.put(a, -3.30, .16, .94, .11, y + .055, P.woodL,
      { hard: true, mode: 6, gloss: .22, ...MW, ...T });
    for (let i = 0; i < 3; i++) {
      const b = -3.61 + i * .31;
      A.put(a, b, .14, .26, .016, y + .113, tc(t * 5 + i * 3), { hard: true, mode: 7, ...T });
      for (let j = 0; j < 3; j++)
        A.ball(a - .035 + (j % 2) * .05, b - .07 + j * .06, y + .140, .026, .026, .026,
          tc(t * 7 + i * 3 + j), { gloss: .45, ...T });
    }
  }
  // A jar of lollipops on the counter top, and stacks of the shop's own carriers behind it — three
  // sizes in three colours, which is the one thing on any counter that says the shop has a name of
  // its own rather than being a table with a till on it.
  A.cyl(2.72, -2.68, 1.09, .085, .30, C('#cfe0e6'), { mode: 1, alpha: .40, gloss: .8, ...T });
  for (let i = 0; i < 7; i++)
    A.ball(2.72 + Math.cos(i * 2.1) * .04, -2.68 + Math.sin(i * 2.1) * .04, 1.20 + (i % 3) * .03,
      .030, .030, .030, tc(i * 3 + 1), { gloss: .5, ...T });
  [[.22, .30, P.yellow, -2.72, 1.00], [.19, .25, P.sky, -2.72, 1.11],
   [.17, .21, P.rose, -2.71, 1.20]].forEach(([w, dp, c, b, y]) =>
    A.put(2.30, b, w, dp, .095, y, c, { mode: 7, round: .020, gloss: .2, ...T }));
  // The price card on the front of the counter, facing the customer. `back` turns a glyph quad
  // round: written the other way it is a sign only the person behind the till can read, and a
  // single-sided quad facing away is not a faint sign, it is nothing at all.
  A.glyph(3.06, -2.80, .32, '今日特价', { size: .095, gap: .035, color: P.warm, mode: 1, glow: .12 });
  // And a bunch tied to the inboard end of the counter, which is where the queue can see it.
  bunch(2.45, -2.60, 1.00, 3, 4, 1.92);

  // ============================================================================ overhead
  // Bunting across the width of the shop, hung far enough back to be seen from the door and sagging
  // the way a real string does, on a line that dips 14 cm in the middle.
  //
  // The flag is a `taper` turned over, and the shape of that primitive is the whole design problem
  // here: its top is a fixed 0.36 of its base, so it never comes to a point and a flag as wide as
  // it is tall is not a pennant, it is a plastic cup — twenty-two of them in a row across the top
  // of every picture taken in this shop, which is exactly what was there. A pennant is 1.7 times
  // as tall as it is wide, and at that proportion the 36 % tip reads as a flat-bottomed swallowtail
  // rather than as a mistake. Two runs, one behind the other and offset by half a flag, so the
  // ceiling has depth in it instead of one ruled line.
  const sagAt = (u, y0, sag) => y0 - sag * (1 - u * u);            // u in [-1, 1] across the run
  function buntingRun(a, half, y0, sag, n, i0) {
    for (let i = 0; i < n; i++) {
      const u = -1 + (2 / (n - 1)) * i, b = u * half, y = sagAt(u, y0, sag);
      if (i) {
        const u0 = -1 + (2 / (n - 1)) * (i - 1), b0 = u0 * half, yy = sagAt(u0, y0, sag);
        A.cap(a, (b + b0) / 2, (y + yy) / 2, .005, Math.hypot(b - b0, y - yy), .005, P.cream,
          { ...tipSide(Math.atan2(b - b0, y - yy)), gloss: .2, ...T });
      }
      TAPER(a, b, y - .118, .010, .222, .132, tc(i * 3 + i0), { mode: 7, ...FLIP, ...T });
    }
  }
  buntingRun(1.32, 3.34, 2.90, .15, 21, 1);
  buntingRun(2.46, 3.10, 3.02, .13, 18, 7);
  // A drift of balloons that has got away and collected under the ceiling, on one side only.
  // Symmetry here would make the room read as a diagram; a shop has a corner where the balloons
  // ended up. Forward of the fixtures and on the counter side, so the four things hanging in this
  // room — bicycle, hanging sign, bunting, drift — are in four different places rather than all
  // over the same shelf.
  for (let i = 0; i < 8; i++) {
    const th = i * 2.399;
    balloon(3.34 + Math.cos(th) * .26, -1.24 + Math.sin(th) * .46, 2.34 + (i % 4) * .078,
      i * 3 + 2, .122, 3.34, -1.24, 1.92);
  }

  // ============================================================================ the window
  // The shell has already stood two plinths of soft toys behind the glass. What it cannot know is
  // that this is a toy shop, so the gaps between them get the things that sell a toy shop from the
  // aisle outside: a tower of blocks and a bunch of balloons on each side.
  for (const s of [-1, 1]) {
    for (let j = 0; j < 5; j++) block(4.18, s * 3.02, .34 + j * .086, j * 4 + (s > 0 ? 2 : 5), .084);
    for (let i = 0; i < 3; i++)
      balloon(4.18 + (i - 1) * .09, s * (4.06 + (i % 2) * .10), .96 + (i % 2) * .11,
        i * 5 + (s > 0 ? 3 : 8), .095, 4.18, s * 4.06, .36);
    toyCar(4.18, s * 2.10, .34, s > 0 ? 4 : 11, 1.5);
  }

  // ============================================================================ light
  // Three, which is what fits inside the eight the shader takes once the concourse fittings
  // outside are counted. Bright and even and only just warm: the whole room is colour, and a warm
  // wash over it drags the blues and the greens towards grey.
  A.light(1.20, -2.20, 2.62, [1.00, 0.95, 0.86], .38, 3.6);
  A.light(1.20,  2.20, 2.62, [1.00, 0.95, 0.86], .38, 3.6);
  A.light(2.90,  0.00, 2.48, [1.00, 0.97, 0.91], .32, 3.4);

  // The demonstration railway is the one unpacked toy in the room, so it actually runs.  Every
  // vehicle follows the same ellipse and tangent; its conservative cull sphere covers the whole
  // tabletop, while the callback itself sleeps when the player is away from this second-floor unit.
  // The remote-control car runs on the same registration rather than a second one. Both rigs are
  // the same 0.1 m of moving toy on the same floor of the same unit, so a second entry in
  // MallFitTick would only buy a second distance test per frame for the same answer.
  //
  // far was 16 and is 13. Nothing here is bigger than a hand: at 13 m across the atrium a train
  // 15 cm long occupies about two pixels and its motion is not resolvable, so the extra three
  // metres were buying nothing and costing eight matrix rebuilds a frame to anybody standing
  // anywhere on this deck's north-west quarter. The tick is already gated on floor as well, so a
  // player one deck down never runs it at all.
  A.motion('railway',(time,state)=>{
    const reduced=reducedMotion(), simTime=reduced?0:time;
    // Entering reduced mode parks both unpacked demonstrations once. Repeated reduced ticks do no
    // matrix work; leaving it resumes at the absolute game-time phase rather than catching up.
    if(!reduced||state.reduced!==1) {
      trainRigs.forEach(r=>{
        const t=r.phase+simTime*.24, p=trackPt(t,0), q=trackPt(t+.04,0), yaw=yawOf(p[0],p[1],q[0],q[1]);
        r.parts.forEach(k=>{
          const w=A.at(p[0]+k.da,p[1]+k.db);
          k.p.m=M.trs(w[0],A.y0+k.y,w[1],yaw,k.sx,k.sy,k.sz);
        });
      });
    }
    // Six times the train's angular rate round a loop a third the size, which is a toy car going
    // much too fast round a table — the reason a child stands in front of one of these.
    const rt=simTime*1.42, rp=rcPt(rt), rq=rcPt(rt+.05);
    const ryw=yawOf(rp[0],rp[1],rq[0],rq[1]);
    if(!reduced||state.reduced!==1) rcRig.forEach(k=>{
        const w=A.at(rp[0]+k.da,rp[1]+k.db);
        k.p.m=M.trs(w[0],A.y0+k.y,w[1],ryw,k.sx,k.sy,k.sz);
      });
    const phase=((rt%RC_TAU)+RC_TAU)%RC_TAU;
    let active=-1,best=Infinity;
    for(let i=0;i<RC_CHECK.length;i++) {
      const d=Math.abs(((phase-RC_CHECK[i]+Math.PI)%RC_TAU+RC_TAU)%RC_TAU-Math.PI);
      if(d<best) { best=d; active=i; }
    }
    if(best>.16) active=-1;
    // Epsilon keeps an exact authored checkpoint on its new cell despite the division round-off
    // from converting absolute seconds back to radians.
    const passed=Math.min(3,Math.floor((phase+1e-6)/(RC_TAU/3))+1);
    if(active!==state.rcCheckpoint) {
      for(let i=0;i<rcCheckpointLights.length;i++) {
        const on=i===active; rcCheckpointLights[i].color=on?RC_ON:RC_OFF;
        rcCheckpointLights[i].glow=on ? .30 : .01;
      }
      state.rcCheckpoint=active;
    }
    if(passed!==state.rcLapCells) {
      for(let i=0;i<rcLapStrip.length;i++) {
        const on=i<passed; rcLapStrip[i].color=on?RC_DONE:RC_OFF;
        rcLapStrip[i].glow=on ? .18 : .01;
      }
      state.rcLapCells=passed; state.rcLapMask=(1<<passed)-1;
    }
    state.cars=trainRigs.length;
    state.rcParts=rcRig.length;
    state.angle=(simTime*.24)%RC_TAU;
    state.rcAngle=+phase.toFixed(3);
    state.rcCheckpoints=rcCheckpointLights.length; state.rcIndicators=6;
    state.reduced=reduced?1:0;
  },{far:13});

  // ============================================================================ words
  //
  // `A.th` puts the walk-to point 1.15 m out from whatever it labels, so a word can only be hung
  // on a thing whose front metre is clear floor: the label may float anywhere, but if that point
  // lands inside a collider the player can never reach the word. Every one of these was placed by
  // working the focus out first and the label second, which is why 娃娃 sits over the tub rather
  // than on the wall of dolls it is about — the wall's focus point is inside the play table.
  //
  // ---- and why two of them are gone --------------------------------------------------------
  // 火车 and 气球 were both here and neither has a row in the dictionary (js/vocab.js). That is
  // not a missing gloss. `showWord` reads `Vocab.get(hz).py` with no guard, so the first time
  // anybody walked up to the train set and pressed the key, the game went to the "did not load"
  // overlay. Both are replaced by words that are in the dictionary *and* in MALL_GOODS['玩具店'],
  // so every label in the room is now something you can also pick up and pay for: 玩具, 积木,
  // 娃娃, 球 and 拼图 — five of the six. Only 遥控车 has no object, and adding one is reported
  // rather than bodged. See the note at the foot of this file.
  //
  // The focus points, in this shop's (a, b) and checked against every collider in it padded by
  // the player's own 0.30 m radius:
  //   玩具店 (4.00,  0.00)   the doorway            自行车 (1.77, -2.30)  the pocket by the bays
  //   收银台 (3.40, -3.40)   at the counter         娃娃   (3.55, -1.52)  in front of the tub
  //   拼图   (3.44, -0.55)   at the play table      积木   (3.10,  0.45)  ditto, further in
  //   球     (3.55,  1.52)   in front of the crate  玩具   (3.45,  3.35)  at the activity table
  A.th('玩具店', D + .35, 0, '小朋友都不想走。', 'None of the children want to leave.',
    '玩具 toy + 店 shop.', 2.2, 2.5);
  A.th('收银台', 2.25, -3.40, '这个多少钱？', 'How much is this one?',
    '收银 to take payment + 台 counter.', 1.8, 1.34);
  A.th('玩具', 2.30, 3.35, '这个玩具会唱歌。', 'This toy sings.',
    '玩 play + 具 implement.', 1.8, .96);
  A.th('积木', 1.95, .45, '我们一起搭积木吧。', "Let's build with the blocks together.",
    '积 to pile up + 木 wood.', 1.9, .74);
  A.th('拼图', 2.29, -.55, '还差一块就拼好了。', 'One piece short of finished.',
    '拼 to piece together + 图 picture.', 1.9, .70);
  A.th('娃娃', 2.40, -1.52, '这个娃娃的头发是红色的。', "This doll's hair is red.",
    '娃娃 a doll, and also a small child.', 1.9, 1.12);
  A.th('球', 2.40, 1.52, '这个球一弹就弹很高。', 'This ball bounces very high.',
    '球 anything round: 篮球 basketball, 地球 the earth.', 1.9, 1.12);
  A.th('自行车', .62, -2.30, '那辆自行车挂在墙上。', 'That bicycle is hung on the wall.',
    '自 self + 行 to go + 车 vehicle.', 2.0, 2.88);
  // ---- the test track, and the three things it is for ----------------------------------------
  // 遥控车 is the sixth of the six things MALL_GOODS lists for this shop and the one that had no
  // object in the room. Its focus at a 4.15 sits in the front lane, which the flood fill has open
  // across the whole frontage; the other two hang off the same fixture 0.3 m either side, and the
  // picker takes whichever the player is nearest.
  A.th('遥控车', 3.00, 2.33, '遥控车真快，一按就跑。',
    'The remote-control car is really fast — one press and it goes.',
    '遥 distant + 控 to control + 车 vehicle. The 遥控器 for your television is the same 遥控.',
    1.8, 1.35);
  A.th('按钮', 2.90, 2.60, '按一下绿色的按钮，车就开始跑。',
    'Press the green button and the car starts running.',
    '按 to press + 钮 knob. 按一下 is one press of anything — a button, a bell, a lift.',
    1.7, .95);
  A.th('说明书', 2.95, 1.95, '说明书上写着要装两节电池，三岁以上才能玩。',
    'The instructions say it takes two batteries, and that it is for three years and over.',
    '说明 to explain + 书 book. 三岁以上 — three years and up; 以上 above, 以下 below. Every '
    + 'boxed toy in here has one of these in the lid, and the age is always on it.', 1.7, 1.05);
  // ---- and why age grouping has no label of its own -------------------------------------------
  // It wanted to be 小孩, and 小孩 cannot be hung on a shelf: js/data.js gives that headword the
  // USE action 说话 · "talk to the kid", so a card opened in front of a bay of boxes would have
  // offered to start a conversation with the shelving. Every other word this room could use for a
  // fixture — 玩具, 积木, 娃娃, 球, 拼图, 遥控车 — is already on the thing it names. So the age
  // ranges are in the 说明书 card above and in 苗雨桐's third line, which is where a shopper is
  // told them anyway.
};

// ---------------------------------------------------------------------------------------------
// The two shopfront windows. The shell supplies a timber platform and calls this once per side of
// the three-metre doorway. These are deliberately static toy-scale silhouettes: the shop interior
// already owns the moving demonstration, while the window needs to read cleanly across the atrium.
//
// Budget: 17 primitives in the robot bay and 15 in the rocket bay, 32 for the tenant. Both displays
// stay inside b = bc +/- 1.04 and a = 3.755 .. 4.32, leaving the doorway and glazing untouched.
MallFit['玩具店:glass'] = { alpha: .17, gloss: .90 };
MallFit['玩具店:win'] = (W, bc, side) => {
  const ink = C('#1b1f23'), cream = C('#f1e6d1'), wood = C('#8a6743');
  const red = C('#d2453a'), orange = C('#e2842f'), yellow = C('#ecce55');
  const green = C('#48995a'), aqua = C('#5ec0c6'), blue = C('#3070b2');
  const violet = C('#8560ac'), warm = C('#ffeccd'), steel = C('#737c83');

  // A coloured card backdrop and a thin deck turn the landlord platform into one composed bay.
  // Their faces are stepped toward the glass by at least 17 mm, so none shares a plane.
  const back = side < 0 ? blue : violet;
  W.put(4.18, bc, .94, 2.08, .045, .363, wood, { hard:true, gloss:.24 });
  W.put(3.79, bc, .070, 2.08, 1.34, 1.25, ink, { hard:true, gloss:.20 });
  W.put(3.835, bc, .014, 1.88, .055, 1.865, back,
    { hard:true, mode:1, glow:.08 });
  W.put(4.08, bc, .42, .76, .20, .490, cream, { hard:true, gloss:.28 });
  W.put(4.08, bc, .45, .79, .030, .605, yellow, { hard:true, gloss:.44 });

  if (side < 0) {
    // A friendly block-built robot: large head, readable limbs and a tiny antenna, with no logo.
    W.put(4.08, bc, .34, .46, .55, 1.025, red, { hard:true, gloss:.28, round:.045 });
    W.put(4.258, bc, .012, .29, .20, 1.030, yellow, { hard:true, gloss:.24 });
    W.put(4.08, bc, .32, .42, .34, 1.475, cream, { hard:true, gloss:.26, round:.055 });
    W.put(4.248, bc, .014, .31, .105, 1.500, ink, { hard:true, gloss:.32 });
    for (const k of [-1, 1]) {
      W.ball(4.270, bc + k * .085, 1.505, .034, .034, .034, aqua,
        { mode:1, glow:.09 });
      W.put(4.08, bc + k * .32, .16, .14, .38, 1.025, blue,
        { hard:true, gloss:.25, round:.045, rz:k * .10 });
      W.put(4.08, bc + k * .135, .18, .16, .34, .755, violet,
        { hard:true, gloss:.24, round:.040 });
    }
    W.cap(4.08, bc, 1.700, .025, .16, .025, steel, { gloss:.44 });
    W.ball(4.08, bc, 1.805, .055, .055, .055, orange, { gloss:.34 });
  } else {
    // The second bay changes silhouette completely: a toy rocket rising over three orbit balls.
    W.cyl(4.08, bc, .980, .22, .62, aqua, { gloss:.30 });
    W.taper(4.08, bc, 1.430, .43, .28, .43, red, { gloss:.30 });
    W.cyl(4.08, bc, .665, .26, .070, ink, { gloss:.38 });
    W.ball(4.305, bc, 1.080, .080, .080, .080, cream, { gloss:.46 });
    for (const k of [-1, 1])
      W.put(4.08, bc + k * .265, .22, .16, .34, .790, orange,
        { hard:true, gloss:.28, rz:k * .20 });
    W.taper(4.08, bc, .510, .20, .25, .20, yellow,
      { mode:1, glow:.08, gloss:.24 });
    const planets = [
      [-.72, 1.58, .075, yellow], [.64, 1.35, .090, green], [.48, 1.76, .055, warm],
    ];
    for (const [off, y, r, color] of planets)
      W.ball(3.850, bc + off, y, r, r, r, color, { mode:1, glow:.055 });
  }
};

// ---------------------------------------------------------------------------------------------
// Who is in here. Local (a, b) unrolls to world x = b − 11, z = a − 18, because this unit is
// shop('N', -11.0, 9.0). Yaw 0 looks along +z, and on this wall +z is +a, so somebody turned to
// face the back of the shop is at 0 and somebody facing the door is at π.
//
// The room already carries two anonymous crowd figures from js/mall.js — a 店员 in the staff
// pocket behind the till at (a 1.75, b −3.40) and a 顾客 in the door aisle. This is the shop's
// own named member of staff, and she stands where the shop's newest fixture is: the pocket in
// front of the activity table at a 3.15–3.55, b 3.05–4.05, which the flood fill reports as
// reachable floor and which is 1.0 m clear of the test track's collider.
if (typeof MallCast !== 'undefined') MallCast.push(
  { hz:'导购员', name:'苗雨桐', py:'Miáo Yǔtóng', place:'mall', mallFloor:2,
    rig:'mall-toys-demo-miao-yutong', temper:'eager',
    look:{ skin:'#e0b189', hair:'#2a2320', hairStyle:'ponytail', top:'#ecce55', pants:'#3a4350',
      shoe:'#f0e7d8', apron:'#d2453a', collar:'polo', tall:.95, faceSeed:9301 },
    spots:[{ h0:10, h1:21, at:[-7.70, -14.65], face:-Math.PI / 2, act:'wait' }],
    lines:[['绿色那个按钮，您按一下试试。', 'That green button — give it a press and see.'],
           ['这台要两节电池，盒子里不带。', 'This one takes two batteries; they are not in the box.'],
           ['三岁以上的在下面一排，上面那排要六岁。',
            'The three-and-over ones are on the lower row; the row above wants six.']] },
);
