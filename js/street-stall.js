// 早餐 — the breakfast trade, and the pitch it leaves behind.
//
// js/street.js already builds the cart itself: the steamer stack, the six 包子, the wok with the
// 油条 in it, the red awning, the 豆浆 urn, the price list, the folding table and the stools. None
// of that is rebuilt here. What this file adds is the *trade* around it — the second half of the
// pitch, the transaction, and the twelve hours of the day the cart is not there for.
//
// Four things it owns:
//
//  1. **The rest of the food.** A 三轮车 backed onto the pavement with a 煎饼 griddle on its bed,
//     a pot of 茶叶蛋 in the gap on the cart top, a wire rack of drained 油条 over the fryer, a
//     serving shelf with 包子 in rows on it, the sauces on the folding table, the 保温桶 of hot
//     water and the gas bottle the whole thing runs on.
//  2. **The transaction.** The QR sign cable-tied to the awning pole, the change tin nobody uses,
//     the bags, and the queue's own litter. The payment brand is invented — 云付 — because no
//     real logo goes in this game. The three people who should be *standing* in that queue are
//     written at the bottom of this file as `StreetFit['stall'].cast` and are **not live**: only
//     game.js can turn a roster row into a body and that code is private. See the note there.
//  3. **The hours.** The shell's `tick` already wheels the cart on at 05:00 and off at 10:30, and
//     that stays the source of truth; everything here hangs off the same two constants, plus the
//     shape *inside* them — the rush at half seven, the thinning after nine, the packing-up at
//     ten, and the wet patch and litter left on the pavement afterwards. The Alley and Entry
//     agents never have to know any of it.
//  4. **The afternoon.** The same pavement is a 水果蔬菜 pitch from two until seven, with a couple
//     of buckets of cut flowers on the end of it, so the hutong's busiest three metres are not
//     simply dead for nine hours of every day.
//
// Geometry notes that cost time to find, so the next person does not pay for them again:
//  - The walkable band is z -2.35..3.35 and `clampMove` inflates every collider by the 0.30 m body
//    radius, so the body can reach z 3.05 at the wall and z -2.05 at the block. The courtyard
//    wall's own face is at z 3.64 for x -11.2..-1.2, and at 3.45 in front of 陈家's gatehouse
//    (x -14.0..-11.2). That leaves a strip behind the cart that props may stand in and the player
//    can never walk into — which is where the gas bottle, the water barrel and the cook all live.
//  - Every collider this file creates is toggled with its own group. The cart's collider in
//    street.js is *not* — it stays on the pavement at three in the morning with nothing above it —
//    so the tick finds it by its bounds and opens it when the cart is away. See `stallCartSolid`.
//  - The paving already carries puddle quads at y .011/.012 (street.js:3065). Nothing here goes on
//    either plane; the wet patch sits at .026 and its core at .030.
//  - The two flowerpots at x -11.60/-11.10, z 3.10 and the tree at x -2.60 are the west and east
//    ends of the usable pitch. Everything below was measured against them.
//  - Measured with the real `Street.clampMove` at r = 0.30, hour by hour: the alley's free corridor
//    past this pitch is **2.88 m** while the cart trades (free z −1.38 .. 1.50 at its tightest,
//    x −10.10), **3.26 m** under the afternoon trestles, and 4.09 m when the pavement is empty —
//    at which point the narrowest thing on the block is street.js's own tree at x −2.60. A walk
//    west→east down the alley is clear at every hour of the day. The wall-side squeeze *is* shut
//    while either pitch is up, which is correct: you go round a stall, not through it.

StreetFit['stall'] = S => {
  const { box, cyl, ball, taper, flat, cap, glyphs, solid, shade, thing, C, G, col } = S;
  const SZ = S.SZ;

  // ---------------------------------------------------------------- where everything is
  const sx = -8.60, sz = SZ - 0.95;        // the cart, off street.js — do not re-measure
  const TOP = 0.53;                        // the cart's working surface
  const WALL = 3.64;                       // the courtyard wall's face along this stretch
  const TX = -10.44, TB = 2.70;            // the 三轮车 and its bed, backed in west of the cart
  const BEDY = 0.655;                      // the top of that bed

  // ---------------------------------------------------------------- the palette
  // Everything is named. `p.color[0]` is read on every visible prop in game.js, so a colour that
  // resolves to undefined puts the boot overlay up for the whole game — never index a palette
  // with anything that might not be an integer.
  const IRON   = C('#3a3733'), IRONL = C('#565049'),
        BATTER = C('#e6dcc0'), YOLK = C('#d9a63c'), CRISP = C('#c98f42'),
        CORIAN = C('#5f7a44'), SAUCE = C('#7d3a2a'), CHILLI = C('#a8362b'),
        TEAEGG = C('#8a5b33'), TEAEGGD = C('#6b4326'), TEA = C('#241610'),
        BAMBOO = C('#c9b07c'), BAMBOOD = C('#9d8752'), PAPER = C('#e6e0d0'),
        CARDC  = C('#c9b894'), INK = C('#33302c'), REDINK = C('#a83a2c'),
        BAGBLK = C('#2b2b2c'), BAGRED = C('#a8443c'), BAGWHT = C('#dfe0dc'),
        GAS    = C('#9aa0a2'), GASD = C('#8b9092'), HOSE = C('#b25a2c'), URNRED = C('#a83c34'),
        TRIKE  = C('#4a6f6a'), TRIKED = C('#37544f'), SADDLE = C('#2e2a27'),
        CRATE  = C('#8a6b46'), CRATEB = C('#3f6a8c'), CRATEG = C('#4d7a4a'),
        APPLE  = C('#a8342c'), BANANA = C('#c9a83a'), TOMATO = C('#b03c2c'),
        CUKE   = C('#4e7538'), CABBAGE = C('#c3cf9a'), AUBER = C('#4a3352'),
        PETALY = C('#d9b44a'), PETALP = C('#c26a86'), PETALW = C('#e2ded0'),
        STEM   = C('#4f6b3c'), WET = C('#6a6357'), WETC = C('#544e45'),
        QRDARK = C('#22252a'), QRPALE = C('#f0eee6'), TAPE = C('#d8d2be'),
        PARASOL = C('#b8443a'), PARASOLB = C('#cfc4ae'), SCALE = C('#d9d4c6'),
        STEAM  = C('#e8e6e0');

  // Stable per-position jitter, hashed off where a thing is. Not `Math.random`: this district is
  // rendered by a pixel-comparison audit and a build that rolls differently every load makes every
  // shot in it unusable as a baseline.
  const jit = (a, b) => { const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
                          return h - Math.floor(h); };

  // ---------------------------------------------------------------- grouping
  // Every prop belongs to exactly one group and every group has an hour window. The tick writes
  // matrices only on the frame a window opens or shuts — this is four hundred props and they move
  // eight times a day, not sixty times a second.
  const P = S.props;
  const G_ = {
    trade:   [],   // 05:00–10:30, with the cart
    rush:    [],   // 06:20–08:36, the busy hour
    thin:    [],   // 08:36–10:30, the tail of the morning
    packing: [],   // 10:00–10:30, coming down
    litter:  [],   // 10:30–13:10, before the sweeper comes past
    wet:     [],   // 10:30–15:00, the patch drying out
    market:  [],   // 14:00–19:00, the fruit and veg
    night:   [],   // 19:00–04:45, the pitch's own furniture left against the wall
  };
  function put(k, fn) {
    const a = P.length; fn();
    for (let i = a; i < P.length; i++) G_[k].push(P[i]);
  }

  // Steam is animated per frame, so it is collected separately as well as being in `trade`.
  const puffs = [];
  function plume(x, y0, z, n, r, a0, spread) {
    for (let i = 0; i < n; i++) {
      const p = ball(x, y0, z, r, r * 0.72, r, STEAM, { mode: 1, alpha: a0 });
      puffs.push({ p, x, y0, z, r, a0, phase: i / n + spread * 0.37 });
    }
  }

  // A hand-written card. Sign TEXT is mode 0 with no glow — a glowing glyph puts a light-mask quad
  // in frame and a dozen of them smear the district into a half-transparent copy of itself.
  function card(x, y, z, w, h, text, size, ink, base) {
    box(x, y, z, w, h, 0.008, base || PAPER, { hard: true, gloss: 0.08 });
    glyphs(x, y, z - 0.013, Math.PI, text,
      { size, gap: size * 0.16, color: ink || INK, gloss: 0.06, lift: 0.004 });
  }
  // The same, written down the way a stall writes a price: one column, the name in red at the top.
  function tallCard(x, y, z, w, rows, size) {
    const step = size * 1.34;
    box(x, y, z, w, rows.length * step + size * 0.30, 0.008, CARDC, { hard: true, gloss: 0.08 });
    rows.forEach((r, i) => glyphs(x, y + (rows.length - 1) * step / 2 - i * step, z - 0.013,
      Math.PI, r, { size, gap: size * 0.14, color: i === 0 ? REDINK : INK,
                    gloss: 0.06, lift: 0.004 }));
  }

  // ================================================================ 1. the food on the cart
  put('trade', () => {
    // ---- 茶叶蛋. The one gap left on the cart top, between the steamer stack and the wok: 49 cm,
    // measured, which takes a 44 cm pot and nothing wider. Tea eggs sit in the liquid they were
    // cooked in and it is nearly black — that dark disc is the whole difference between this and
    // a pan of soup.
    const EX = -8.63, EZ = 2.42;
    cyl(EX, TOP + 0.095, EZ, 0.215, 0.19, IRON, { gloss: 0.42, tag: '鸡蛋' });
    cyl(EX, TOP + 0.185, EZ, 0.200, 0.012, TEA, { gloss: 0.66, tag: '鸡蛋' });
    // Seven of them, cracked and stained, sitting half in the liquid: an egg floating clear of it
    // is a stone in a puddle.
    for (let i = 0; i < 7; i++) {
      const a = i * 0.897, r = i < 6 ? 0.115 : 0;
      const ex = EX + Math.cos(a) * r, ez = EZ + Math.sin(a) * r;
      ball(ex, TOP + 0.205, ez, 0.034, 0.026, 0.034, i % 3 ? TEAEGG : TEAEGGD,
        { gloss: 0.26, ry: a, tag: '鸡蛋' });
      // The crack lines. Two flat slivers a shade darker is all a marbled shell is at this size.
      for (const t of [-1, 1])
        box(ex, TOP + 0.222, ez + t * 0.012, 0.052, 0.004, 0.006, TEA,
          { hard: true, ry: a + t * 0.5, gloss: 0.20, tag: '鸡蛋' });
    }
    // Its lid, off, hooked over the side of the pot the way it always is.
    cyl(EX - 0.29, TOP + 0.11, EZ + 0.06, 0.19, 0.018, IRONL,
      { rz: Math.PI / 2 - 0.30, gloss: 0.46 });
    // The card on its wire. The wire stands on the cart top and the card sits on the end of it —
    // written the other way round it was a price tag floating 20 cm above its own stick.
    cap(EX, 0.73, EZ - 0.235, 0.007, 0.42, 0.007, col.steelD, { gloss: G.metal });
    card(EX, 0.93, EZ - 0.24, 0.30, 0.13, '茶叶蛋一元', 0.048);

    // ---- 油条, drained. street.js lays four of them in the oil, which is where they are cooked;
    // what a customer actually points at is the wire rack over the pan where they stand on end
    // dripping. The rack is at y .70 — nine centimetres clear of the oil disc, so no two faces
    // share a plane. The pan is at x -8.05.
    const WX = -8.05, WZ = sz;
    box(WX, 0.700, WZ, 0.66, 0.014, 0.34, col.steel, { hard: true, gloss: G.metal });
    for (let i = 0; i < 9; i++)
      cap(WX - 0.30 + i * 0.075, 0.708, WZ, 0.008, 0.32, 0.008, col.steel,
        { rx: Math.PI / 2, gloss: G.metal });
    for (const t of [-1, 1])
      cap(WX + t * 0.32, 0.655, WZ, 0.010, 0.10, 0.010, col.steel, { gloss: G.metal });
    // Five standing on end against each other, which is how they drain and how they read from two
    // metres: a bundle of long pale-gold sticks, not four brown things in a pan.
    for (let i = 0; i < 5; i++) {
      const lean = -0.30 + i * 0.14, spin = 0.2 + i * 0.3;
      cap(WX - 0.22 + i * 0.11, 0.86, WZ + 0.02, 0.026, 0.30, 0.026, CRISP,
        { rz: lean, ry: spin, gloss: 0.28, tag: '早餐' });
      // The seam down the middle. A 油条 is two strips pressed together and pulled, and the groove
      // is the only thing that tells it from a chip.
      cap(WX - 0.22 + i * 0.11, 0.86, WZ + 0.02, 0.009, 0.29, 0.009, C('#a9762f'),
        { rz: lean, ry: spin, gloss: 0.22, tag: '早餐' });
    }
    // The long chopsticks they were lifted with, laid across the rack.
    for (const t of [-1, 1])
      cap(WX + 0.10, 0.716, WZ + t * 0.018, 0.010, 0.46, 0.010, BAMBOOD,
        { rz: Math.PI / 2, ry: 0.16, gloss: 0.16 });

    // ---- the serving shelf. A stall needs a surface between the cook and the customer or every
    // exchange happens through thin air. A 2.1 m plank on two brackets along the cart's front,
    // 26 cm deep — its front edge lands at z 1.67 and the body stops at 1.50, so it costs nothing
    // to walk past and the cart's own collider does not have to grow.
    const SHZ = 1.80;
    box(sx, 0.565, SHZ, 2.10, 0.040, 0.26, col.steel, { hard: true, gloss: 0.44 });
    for (const ox of [-0.85, 0.85])
      cap(sx + ox, 0.510, SHZ + 0.06, 0.014, 0.11, 0.014, col.steelD, { rz: 0.5, gloss: G.metal });
    // 包子 in rows on a bamboo tray, which is the picture the word needs: six of them lined up and
    // steaming, not one specimen in a basket. Tagged 包子 so they answer the way the buns do.
    box(sx - 0.62, 0.594, SHZ, 0.62, 0.018, 0.22, BAMBOO, { hard: true, gloss: 0.14, tag: '包子' });
    for (let i = 0; i < 6; i++) {
      const bx = sx - 0.86 + (i % 3) * 0.24, bz = SHZ - 0.05 + ((i / 3) | 0) * 0.10;
      ball(bx, 0.648, bz, 0.062, 0.050, 0.062, col.cream, { gloss: 0.22, tag: '包子' });
      ball(bx, 0.690, bz, 0.024, 0.018, 0.024, C('#e4dece'), { gloss: 0.20, tag: '包子' });
    }
    // The steel tongs lying across the tray.
    for (const t of [-1, 1])
      cap(sx - 0.30, 0.612, SHZ + 0.02 + t * 0.014, 0.006, 0.20, 0.006, col.steel,
        { rz: Math.PI / 2, ry: 0.3 + t * 0.08, gloss: G.metal });
    // The bags. Every one of these transactions ends with a bun in a thin bag, and the block of
    // them under a weight is on every counter in the city.
    box(sx + 0.30, 0.596, SHZ + 0.01, 0.20, 0.022, 0.16, BAGWHT, { hard: true, gloss: 0.12 });
    box(sx + 0.30, 0.612, SHZ + 0.01, 0.16, 0.014, 0.12, C('#cfd2cc'), { hard: true, gloss: 0.10 });
    cap(sx + 0.30, 0.626, SHZ + 0.01, 0.012, 0.14, 0.012, col.steelD,
      { rz: Math.PI / 2, gloss: G.metal });
    // The change tin. Notes on edge in the near half, coins loose in the far one. Nobody uses it —
    // the whole queue pays with a phone — which is exactly why it is worth putting there.
    box(sx + 0.74, 0.600, SHZ, 0.26, 0.030, 0.19, col.steelD, { hard: true, gloss: 0.46 });
    for (let i = 0; i < 5; i++)
      box(sx + 0.68 + i * 0.014, 0.622, SHZ - 0.03, 0.11, 0.022, 0.06,
        i % 2 ? C('#9aa87f') : C('#c2a2a8'), { hard: true, ry: 0.1 * i, gloss: 0.10 });
    for (let i = 0; i < 6; i++)
      cyl(sx + 0.78 + (i % 3) * 0.030, 0.618, SHZ + 0.05 + ((i / 3) | 0) * 0.030, 0.017, 0.005,
        i % 2 ? col.goldL : C('#b9bcbd'), { gloss: G.metal });
    // The second price card, propped at the shelf's east end. street.js's board carries the three
    // things the cart itself sells; these are what has been added to the pitch since.
    tallCard(sx + 0.74, 0.86, SHZ - 0.10, 0.34, ['老李早点', '煎饼五元', '小米粥两元'], 0.062);
    cap(sx + 0.74, 0.70, SHZ - 0.09, 0.006, 0.26, 0.006, col.steelD, { gloss: G.metal });
  });

  // ================================================================ 2. the 三轮车 and the 煎饼
  put('trade', () => {
    // The whole pitch arrived on this and goes home on it. Backed in nose-first to the courtyard
    // wall so the working end faces the alley, which is how you park one and still leave the hutong
    // walkable. The bed is 86 cm wide: the flowerpot at x -11.10 ends at -10.93 and the cart's west
    // awning pole starts at -9.94, so there is 99 cm between them and this is 92.
    box(TX, BEDY - 0.035, TB, 0.86, 0.070, 1.26, TRIKE, { hard: true, gloss: 0.30, tag: '早餐' });
    box(TX, BEDY - 0.115, TB, 0.90, 0.090, 1.30, TRIKED, { hard: true, gloss: 0.26 });
    // Sideboards front and both sides — the back is open, which is the end you work off.
    for (const t of [-1, 1])
      box(TX + t * 0.44, BEDY + 0.075, TB, 0.030, 0.150, 1.26, TRIKED, { hard: true, gloss: 0.28 });
    box(TX, BEDY + 0.075, TB + 0.645, 0.90, 0.150, 0.030, TRIKED, { hard: true, gloss: 0.28 });
    // The name, painted on the near sideboard. Invented, like every business in this district.
    glyphs(TX - 0.462, BEDY + 0.075, TB - 0.10, -Math.PI / 2, '老李早点',
      { size: 0.085, gap: 0.018, color: col.cream, gloss: 0.10, lift: 0.006 });
    // Frame, wheels, saddle, bars. Two wheels at the back under the bed, one at the front by the
    // wall. A trike with no drivetrain reads as a trolley, and the drivetrain is the reason this
    // pitch can be somewhere else tomorrow.
    for (const t of [-1, 1]) {
      cyl(TX + t * 0.40, 0.235, TB - 0.30, 0.235, 0.055, col.black,
        { rz: Math.PI / 2, gloss: 0.30 });
      cyl(TX + t * 0.40, 0.235, TB - 0.30, 0.075, 0.062, col.steel,
        { rz: Math.PI / 2, gloss: G.metal });
      cap(TX + t * 0.40, 0.43, TB - 0.30, 0.028, 0.42, 0.028, TRIKED, { gloss: 0.30 });
    }
    cyl(TX, 0.245, TB + 0.86, 0.245, 0.048, col.black, { rz: Math.PI / 2, gloss: 0.30 });
    cyl(TX, 0.245, TB + 0.86, 0.070, 0.054, col.steel, { rz: Math.PI / 2, gloss: G.metal });
    for (const t of [-1, 1])
      cap(TX + t * 0.055, 0.46, TB + 0.86, 0.018, 0.46, 0.018, TRIKED, { rx: -0.16, gloss: 0.30 });
    cap(TX, 0.60, TB + 0.72, 0.030, 0.62, 0.030, TRIKED, { rx: 0.62, gloss: 0.30 });
    cap(TX, 0.92, TB + 0.78, 0.026, 0.56, 0.026, col.steelD, { rz: Math.PI / 2, gloss: G.metal });
    for (const t of [-1, 1])
      cap(TX + t * 0.26, 0.92, TB + 0.78, 0.020, 0.13, 0.020, SADDLE,
        { rz: Math.PI / 2, gloss: 0.24 });
    ball(TX, 0.86, TB + 0.50, 0.075, 0.055, 0.135, SADDLE, { gloss: 0.24 });
    cyl(TX, 0.30, TB + 0.44, 0.105, 0.024, col.steelD, { rz: Math.PI / 2, gloss: G.metal });
    for (const t of [-1, 1])
      box(TX + t * 0.14, 0.30 + t * 0.08, TB + 0.44, 0.09, 0.02, 0.06, col.black,
        { hard: true, gloss: 0.26 });

    // ---- the 煎饼 griddle, on the open back of the bed where a customer can watch it. Round, flat
    // and slightly domed in the middle, which is the point the batter is spread out from.
    const GX = TX, GZ = TB - 0.32;
    cyl(GX, BEDY + 0.055, GZ, 0.355, 0.110, IRON, { gloss: 0.34, tag: '煎饼' });
    cyl(GX, BEDY + 0.118, GZ, 0.340, 0.020, C('#2e2b27'), { gloss: 0.52, tag: '煎饼' });
    cyl(GX, BEDY + 0.132, GZ, 0.250, 0.008, C('#35312c'), { gloss: 0.56, tag: '煎饼' });
    // One in the making: batter down, egg cracked over it, coriander and spring onion on, the 薄脆
    // cracker waiting on the edge. Every layer stands 6–14 mm off the one under it.
    cyl(GX - 0.02, BEDY + 0.148, GZ, 0.235, 0.008, BATTER, { gloss: 0.20, tag: '煎饼' });
    cyl(GX - 0.02, BEDY + 0.162, GZ, 0.150, 0.006, YOLK, { gloss: 0.26, tag: '煎饼' });
    for (let i = 0; i < 11; i++) {
      const a = i * 1.71, r = 0.05 + (i % 4) * 0.045;
      box(GX - 0.02 + Math.cos(a) * r, BEDY + 0.174, GZ + Math.sin(a) * r, 0.030, 0.004, 0.010,
        i % 3 ? CORIAN : C('#c9d4a8'), { hard: true, ry: a, gloss: 0.14, tag: '煎饼' });
    }
    box(GX + 0.14, BEDY + 0.176, GZ - 0.04, 0.17, 0.012, 0.13, CRISP,
      { hard: true, ry: 0.4, gloss: 0.22, tag: '煎饼' });
    // 刮子 — the T-shaped spreader, laid flat on the plate with its handle out over the edge, which
    // is where it lives between crepes. `cap` builds along local Y, so both bars are laid down with
    // rz/rx rather than written as if they were long in x, which comes out a flat puck.
    cap(GX + 0.02, BEDY + 0.150, GZ + 0.235, 0.013, 0.24, 0.013, BAMBOOD,
      { rz: Math.PI / 2, gloss: 0.18 });
    cap(GX + 0.02, BEDY + 0.150, GZ + 0.150, 0.011, 0.17, 0.011, BAMBOO,
      { rx: Math.PI / 2, gloss: 0.18 });
    // The batter bucket with the ladle standing in it.
    cyl(TX - 0.22, BEDY + 0.155, TB + 0.20, 0.135, 0.240, BAGWHT, { gloss: 0.24 });
    cyl(TX - 0.22, BEDY + 0.250, TB + 0.20, 0.125, 0.012, BATTER, { gloss: 0.24 });
    cap(TX - 0.16, BEDY + 0.36, TB + 0.24, 0.010, 0.34, 0.010, col.steel, { rz: -0.34, gloss: G.metal });
    // Twelve eggs in a grey pulp tray beside it.
    box(TX + 0.20, BEDY + 0.055, TB + 0.20, 0.34, 0.070, 0.26, C('#a9a297'),
      { hard: true, gloss: 0.08, tag: '鸡蛋' });
    for (let i = 0; i < 12; i++)
      ball(TX + 0.075 + (i % 4) * 0.083, BEDY + 0.112, TB + 0.135 + ((i / 4) | 0) * 0.083,
        0.030, 0.034, 0.030, i % 5 ? C('#d8c8a6') : C('#c8b490'), { gloss: 0.18, tag: '鸡蛋' });
    // The two sauce pots and their brushes: 甜面酱 and 辣椒酱, which is the only choice a customer
    // is ever asked to make at this griddle.
    for (const [ox, cc] of [[-0.30, SAUCE], [-0.10, CHILLI]]) {
      cyl(TX + ox, BEDY + 0.075, TB - 0.02, 0.070, 0.110, col.plastic, { gloss: 0.28 });
      cyl(TX + ox, BEDY + 0.132, TB - 0.02, 0.062, 0.010, cc, { gloss: 0.34 });
      cap(TX + ox + 0.02, BEDY + 0.20, TB - 0.02, 0.008, 0.20, 0.008, BAMBOOD,
        { rz: 0.30, gloss: 0.16 });
    }
    // 小米粥, in a lidded barrel at the front of the bed with the ladle hooked over the rim.
    cyl(TX + 0.22, BEDY + 0.195, TB + 0.50, 0.150, 0.320, col.steel, { gloss: 0.50, tag: '早餐' });
    taper(TX + 0.22, BEDY + 0.375, TB + 0.50, 0.310, 0.070, 0.310, col.steelD,
      { gloss: 0.46, tag: '早餐' });
    cap(TX + 0.22, BEDY + 0.425, TB + 0.50, 0.012, 0.12, 0.012, col.steelD,
      { rz: Math.PI / 2, gloss: G.metal });
    cap(TX + 0.36, BEDY + 0.34, TB + 0.44, 0.009, 0.30, 0.009, col.steel, { rz: -0.24, gloss: G.metal });
    cap(TX + 0.22, BEDY + 0.30, TB + 0.34, 0.006, 0.50, 0.006, col.steelD, { gloss: G.metal });
    card(TX + 0.22, BEDY + 0.55, TB + 0.335, 0.26, 0.12, '小米粥', 0.055);

    // The trike blocks the pavement while it is here and stops blocking it when it goes — the
    // collider is toggled with the group, which is the thing street.js's own cart forgets to do.
    stallTrikeSolid = solid(TX - 0.46, TX + 0.46, 2.02, 3.40);
    shade(TX, TB - 0.05, 1.10, 1.90, 0.30);
    // Two plumes: one off the griddle, one off the 粥.
    plume(GX, BEDY + 0.18, GZ, 3, 0.16, 0.13, 1);
    plume(TX + 0.22, BEDY + 0.42, TB + 0.50, 2, 0.11, 0.10, 2);
  });

  // ================================================================ 3. the trade's own fabric
  put('trade', () => {
    // ---- 保温桶. The barrel of boiled water everything on the pitch is rinsed and made with,
    // stood in the strip behind the cart the player can never walk into.
    const KX = -9.62, KZ = 3.34;
    cyl(KX, 0.36, KZ, 0.205, 0.72, URNRED, { gloss: 0.24 });
    cyl(KX, 0.06, KZ, 0.215, 0.12, col.steelD, { gloss: 0.34 });
    taper(KX, 0.745, KZ, 0.430, 0.080, 0.430, col.steel, { gloss: 0.46 });
    cap(KX, 0.80, KZ, 0.014, 0.15, 0.014, col.steelD, { rz: Math.PI / 2, gloss: G.metal });
    box(KX, 0.26, KZ - 0.20, 0.07, 0.10, 0.09, col.steelD, { hard: true, gloss: 0.44 });
    cap(KX + 0.04, 0.315, KZ - 0.22, 0.011, 0.09, 0.011, col.charcoal, { rz: 0.9, gloss: 0.32 });
    glyphs(KX, 0.50, KZ - 0.212, Math.PI, '开水',
      { size: 0.090, gap: 0.020, color: col.cream, gloss: 0.12, lift: 0.006 });
    plume(KX, 0.80, KZ, 1, 0.09, 0.07, 3);

    // ---- 煤气罐 and the hose. The pitch runs on one bottle and everybody knows where it is, which
    // is behind the near end of the cart with the orange hose looping up to the burner.
    const BX = -7.92, BZ = 3.34;
    cyl(BX, 0.29, BZ, 0.155, 0.58, GAS, { gloss: 0.40 });
    taper(BX, 0.60, BZ, 0.230, 0.070, 0.230, GASD, { gloss: 0.40 });
    cyl(BX, 0.655, BZ, 0.055, 0.050, col.steelD, { gloss: G.metal });
    box(BX, 0.695, BZ, 0.11, 0.05, 0.09, col.steelD, { hard: true, gloss: 0.44 });
    for (const [dx, dz, r] of [[-0.10, 0.10, 0.5], [-0.34, -0.14, 1.1], [-0.62, -0.42, 1.5]])
      cap(BX + dx, 0.58 - Math.abs(dx) * 0.28, BZ + dz, 0.014, 0.42, 0.014, HOSE,
        { rz: Math.PI / 2 - 0.5, ry: r, gloss: 0.22 });
    // A second bottle on its side, spare and empty, tucked along the foot of the wall.
    cyl(BX + 0.44, 0.155, WALL - 0.19, 0.150, 0.56, GASD, { rz: Math.PI / 2, ry: 0.3, gloss: 0.38 });

    // ---- the bin bag on its hook, off the front west awning pole under the price list, which is
    // where a customer's cup and greasy paper actually go. Kept narrow and hung tight to the pole:
    // at 29 cm across with its contents modelled sticking out of the mouth it read as a punchbag
    // with a face on it, which is the whole hazard of putting a soft object next to a hard one.
    const HX = -9.90, HZ = 1.66;
    cap(HX, 0.84, HZ, 0.009, 0.12, 0.009, col.steelD, { rx: -1.0, gloss: G.metal });
    cap(HX, 0.72, HZ - 0.05, 0.020, 0.16, 0.020, BAGBLK, { rz: 0.10, gloss: 0.30 });
    ball(HX, 0.46, HZ - 0.05, 0.105, 0.220, 0.100, BAGBLK, { gloss: 0.30 });
    // The one thing showing over the lip: a squashed cup, tipped in rather than balanced on top.
    taper(HX + 0.05, 0.63, HZ - 0.06, 0.085, 0.075, 0.085, col.white,
      { rx: 2.4, ry: 0.5, gloss: 0.20 });

    // ---- the sauces, on the folding table street.js already stallBuilt at x -6.20. A breakfast table
    // with nothing on it to put on the food is furniture in a showroom. The half-eaten baozi and
    // the cup of 豆浆 at x -6.32 are the shell's; this goes in the back corner clear of them.
    const CX = -6.62, CZ = 2.24, TT = 0.583;
    box(CX, TT + 0.035, CZ, 0.22, 0.070, 0.17, col.plastic, { hard: true, gloss: 0.26 });
    for (const [ox, cc, ch] of [[-0.065, C('#2b2018'), '醋'], [0, C('#241a12'), '酱油'],
                                [0.065, CHILLI, '辣']]) {
      cyl(CX + ox, TT + 0.145, CZ, 0.030, 0.150, cc, { gloss: 0.44 });
      cyl(CX + ox, TT + 0.228, CZ, 0.017, 0.026, col.paintY, { gloss: 0.34 });
      glyphs(CX + ox, TT + 0.155, CZ - 0.033, Math.PI, ch,
        { size: 0.036, gap: 0.006, color: col.cream, gloss: 0.08, lift: 0.004 });
    }
    // 咸菜 in a lidded jar — the shredded pickle that goes on the 粥, and the one thing on this
    // table that is a colour.
    cyl(CX + 0.20, TT + 0.075, CZ - 0.02, 0.085, 0.150, C('#c8b98f'), { gloss: 0.40 });
    for (let i = 0; i < 9; i++)
      box(CX + 0.20 + (jit(i, 3) - 0.5) * 0.10, TT + 0.06 + (i % 3) * 0.03,
        CZ - 0.02 + (jit(i, 7) - 0.5) * 0.10, 0.055, 0.010, 0.014,
        i % 2 ? C('#8f6a2c') : C('#a8802f'), { hard: true, ry: i * 0.7, gloss: 0.28 });
    cyl(CX + 0.20, TT + 0.158, CZ - 0.02, 0.090, 0.022, CHILLI, { gloss: 0.30 });
    // The chopstick cylinder and the napkin box.
    cyl(CX + 0.40, TT + 0.075, CZ, 0.055, 0.150, col.plastic, { gloss: 0.28 });
    for (let i = 0; i < 8; i++)
      cap(CX + 0.40 + Math.cos(i * 0.785) * 0.026, TT + 0.20, CZ + Math.sin(i * 0.785) * 0.026,
        0.006, 0.22, 0.006, BAMBOOD, { rz: (i % 3 - 1) * 0.06, gloss: 0.14 });
    box(CX + 0.62, TT + 0.045, CZ - 0.04, 0.20, 0.090, 0.14, col.plastic,
      { hard: true, gloss: 0.26 });
    box(CX + 0.62, TT + 0.096, CZ - 0.04, 0.14, 0.020, 0.09, PAPER, { hard: true, gloss: 0.08 });

    // ---- 排队. The word only exists once there is a line to point at, and this is the label on
    // it, standing where the queue does.
    thing('排队', -9.55, 1.45, 1.30, '早上买包子要排队。',
      'You have to queue for baozi in the morning.',
      '排 to line up + 队 a line. Six deep at half past seven, gone by ten.',
      // Deliberately tight, and set back at the tail of the line rather than at the counter: on a
      // 2.2 m reach this word beat 早餐 from the spot 早餐's own focus puts you on, and 早餐 is the
      // one with the verb on it.
      { focus: [-9.62, 1.05], reach: 1.25 });
  });

  // ================================================================ 4. 扫码 — how it is paid for
  put('trade', () => {
    // Cable-tied to the east front awning pole at (-7.30, 1.60), facing the customer. The pole's
    // front face is at z 1.565; the card stands at 1.545, the code at 1.532, the tape at 1.525 —
    // 13 mm apart, because two faces on one plane have taken this game down three times.
    const QX = -7.30, QZ = 1.545;
    box(QX, 1.28, QZ, 0.32, 0.44, 0.012, PAPER, { hard: true, gloss: 0.08, tag: '扫码' });
    // The header panel. Invented brand — 云付 — because no real payment logo goes in this game.
    box(QX, 1.455, QZ - 0.010, 0.30, 0.085, 0.005, C('#2f6f7a'),
      { hard: true, gloss: 0.20, tag: '扫码' });
    glyphs(QX, 1.455, QZ - 0.022, Math.PI, '云付',
      { size: 0.060, gap: 0.014, color: col.cream, gloss: 0.10, lift: 0.004, tag: '扫码' });
    // The code itself: a white field, three finder squares and about twenty modules, generated off
    // a fixed seed so it is the same code every run. A real scan pattern is a hundred and forty
    // quads and reads identically at the only distance anybody ever sees it from.
    box(QX, 1.27, QZ - 0.013, 0.245, 0.245, 0.004, QRPALE,
      { hard: true, gloss: 0.06, tag: '扫码' });
    for (const [fx, fy] of [[-0.082, 0.082], [0.082, 0.082], [-0.082, -0.082]]) {
      box(QX + fx, 1.27 + fy, QZ - 0.026, 0.062, 0.062, 0.004, QRDARK,
        { hard: true, gloss: 0.05, tag: '扫码' });
      box(QX + fx, 1.27 + fy, QZ - 0.032, 0.038, 0.038, 0.004, QRPALE,
        { hard: true, gloss: 0.05, tag: '扫码' });
      box(QX + fx, 1.27 + fy, QZ - 0.038, 0.020, 0.020, 0.004, QRDARK,
        { hard: true, gloss: 0.05, tag: '扫码' });
    }
    let seed = 20260804;
    const rr = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 34; i++) {
      const mx = (Math.floor(rr() * 9) - 4) * 0.024, my = (Math.floor(rr() * 9) - 4) * 0.024;
      if (Math.abs(mx) > 0.055 && Math.abs(my) > 0.055) continue;   // keep clear of the finders
      box(QX + mx, 1.27 + my, QZ - 0.026, 0.022, 0.022, 0.004, QRDARK,
        { hard: true, gloss: 0.05, tag: '扫码' });
    }
    glyphs(QX, 1.115, QZ - 0.022, Math.PI, '扫码付钱',
      { size: 0.046, gap: 0.010, color: INK, gloss: 0.06, lift: 0.004, tag: '扫码' });
    // Taped up, not framed: four strips of parcel tape at the corners and one half peeled off.
    for (const [tx, ty] of [[-0.15, 0.21], [0.15, 0.21], [-0.15, -0.21], [0.15, -0.21]])
      box(QX + tx, 1.28 + ty, QZ - 0.022, 0.090, 0.028, 0.003, TAPE,
        { hard: true, alpha: 0.72, gloss: 0.24, tag: '扫码' });
    box(QX + 0.17, 1.44, QZ - 0.052, 0.070, 0.026, 0.003, TAPE,
      { hard: true, alpha: 0.72, rz: 0.5, gloss: 0.24, tag: '扫码' });
    for (const ty of [0.20, -0.20])
      cap(QX, 1.28 + ty, QZ + 0.032, 0.005, 0.09, 0.005, col.white,
        { rz: Math.PI / 2, gloss: 0.20, tag: '扫码' });
    thing('扫码', QX, 1.28, QZ - 0.06, '不用现金，扫码就行。',
      'No cash needed — just scan the code.',
      '扫 to sweep + 码 code. Nobody at this stall has taken a note in five years.',
      { focus: [QX, 0.55], reach: 1.9 });
  });

  // ================================================================ 5. the rush, 06:20–08:36
  put('rush', () => {
    // Three more stools set out along the wall side, clear of the walk, and a second small table
    // between them. This is the only stretch of the morning where somebody has to stand up to eat.
    for (const [ox, oz, r] of [[-5.32, 2.66, 0.3], [-5.02, 2.20, -0.6], [-4.20, 2.58, 1.1]]) {
      taper(ox, 0.17, oz, 0.32, 0.34, 0.32, col.plastic, { gloss: 0.30, ry: r });
      box(ox, 0.35, oz, 0.34, 0.04, 0.34, col.plastic, { hard: true, ry: r, gloss: 0.30 });
    }
    box(-4.72, 0.50, 2.55, 0.62, 0.05, 0.62, col.canvas, { hard: true, gloss: 0.24 });
    for (const [ox, oz] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]])
      cap(-4.72 + ox, 0.25, 2.55 + oz, 0.028, 0.48, 0.028, col.steel, { gloss: 0.34 });
    // A bowl of 粥 half drunk on it, chopsticks across the rim.
    cyl(-4.72, 0.535, 2.55, 0.085, 0.060, col.white, { gloss: 0.30 });
    cyl(-4.72, 0.560, 2.55, 0.072, 0.010, C('#d8cba2'), { gloss: 0.26 });
    for (const t of [-1, 1])
      cap(-4.72, 0.575, 2.55 + t * 0.012, 0.005, 0.20, 0.005, BAMBOOD,
        { rz: Math.PI / 2, ry: 0.3, gloss: 0.14 });
    // Bags put down by people waiting, tight against the cart where they are out of the way. Both
    // measured against the body's stopping line at z 1.50 rather than dropped by eye.
    ball(-9.62, 0.17, 1.72, 0.135, 0.175, 0.095, C('#7d6a4a'), { gloss: 0.14 });
    cap(-9.62, 0.36, 1.72, 0.010, 0.22, 0.010, C('#6b5a3e'), { rz: 0.3, gloss: 0.14 });
    ball(-10.02, 0.14, 1.90, 0.115, 0.140, 0.090, C('#6e7a86'), { ry: 0.5, gloss: 0.18 });
    // A crate of clean bowls under the serving shelf, being got through.
    box(-7.95, 0.13, 1.68, 0.34, 0.26, 0.26, CRATEB, { hard: true, gloss: 0.26 });
    for (let i = 0; i < 4; i++)
      cyl(-7.95, 0.27 + i * 0.026, 1.68, 0.085, 0.030, col.white, { gloss: 0.28, ry: i * 0.4 });
  });

  // ================================================================ 6. the tail, 08:36–10:30
  put('thin', () => {
    // What is left once the rush has gone through: emptied steamer baskets turned over to dry, the
    // used-chopstick tub, and the first sweepings pushed together against the wall.
    for (let i = 0; i < 3; i++)
      cyl(-6.95, 0.075 + i * 0.115, 3.30, 0.335, 0.115, BAMBOO,
        { gloss: G.wood, ry: 0.4 + i * 0.3, rx: Math.PI });
    cyl(-6.95, 0.425, 3.30, 0.300, 0.020, BAMBOOD, { gloss: 0.14 });
    box(-7.35, 0.10, 1.98, 0.20, 0.20, 0.20, col.plastic, { hard: true, gloss: 0.28 });
    for (let i = 0; i < 7; i++)
      cap(-7.35 + (i % 3 - 1) * 0.035, 0.26, 1.98 + ((i / 3 | 0) - 1) * 0.035,
        0.006, 0.24, 0.006, BAMBOOD, { rz: (i % 5 - 2) * 0.10, ry: i, gloss: 0.14 });
    for (let i = 0; i < 5; i++)
      box(-6.05 + i * 0.09, 0.018, 2.86 + (i % 3) * 0.07, 0.10, 0.006, 0.08,
        i % 2 ? PAPER : C('#d2cbb8'), { hard: true, ry: i * 1.1, gloss: 0.08 });
  });

  // ================================================================ 7. packing up, 10:00–10:30
  put('packing', () => {
    // Pans off, table down, crates stacked ready to go on the trike. street.js's cart is still
    // standing until 10:30 — this is what happens around it in the last half hour. Everything here
    // was placed east of the urn crate at x -6.82 and west of the shell's spare stools at -5.88,
    // which is the only stretch of this pavement that is empty at ten in the morning.
    for (let i = 0; i < 3; i++)
      box(-6.45, 0.145 + i * 0.28, 2.90, 0.60, 0.28, 0.44, i === 1 ? CRATEB : CRATE,
        { hard: true, gloss: 0.22, ry: (i - 1) * 0.10 });
    // The wok, scrubbed and turned over on top of them.
    cyl(-6.45, 0.905, 2.90, 0.34, 0.14, col.charcoal, { rx: Math.PI, gloss: 0.44 });
    // The spare folding table, collapsed and leaning on the wall. East of x -11.20, where the wall
    // face is at 3.64: in front of 陈家's gatehouse it is at 3.45 and this would be inside it.
    box(-10.60, 0.62, WALL - 0.13, 0.70, 1.20, 0.06, col.canvas,
      { hard: true, rx: 0.22, gloss: 0.22 });
    for (const t of [-1, 1])
      cap(-10.60 + t * 0.24, 0.60, WALL - 0.20, 0.024, 1.16, 0.024, col.steel,
        { rx: 0.22, gloss: 0.34 });
    // Two bin bags tied off and stood by the wall for the 环卫 round.
    for (const [bx, bs] of [[-5.55, 1.0], [-5.20, 0.86]]) {
      ball(bx, 0.26 * bs, 3.20, 0.20 * bs, 0.26 * bs, 0.19 * bs, BAGBLK, { gloss: 0.34 });
      ball(bx, 0.50 * bs, 3.20, 0.075 * bs, 0.08 * bs, 0.07 * bs, BAGBLK, { gloss: 0.32 });
    }
    // The bucket of grey water waiting to go over the pitch, which is where the wet patch comes
    // from. Between the water barrel and the gas bottle, both of which are 60 cm clear of it.
    cyl(-8.45, 0.145, 3.30, 0.155, 0.290, BAGRED, { gloss: 0.28 });
    cyl(-8.45, 0.275, 3.30, 0.140, 0.014, C('#6f7378'), { gloss: 0.72 });
    cap(-8.45, 0.34, 3.30, 0.009, 0.30, 0.009, col.steelD, { rz: Math.PI / 2, gloss: G.metal });
  });

  // ================================================================ 8. after it has gone
  put('wet', () => {
    // The wet patch. This is the whole tell that something was here: a stall packs up and leaves
    // swilled paving that takes four hours to go.
    //
    // Two things had to be got right and both were wrong first time. **Colour**: at #3d4247 over
    // a #8d8577 pavement it was not damp stone, it was a rectangular hole in the ground — water
    // darkens paving by about a third and cools it barely at all, so this is the paving's own
    // hue taken down, not a new grey. **Shape**: one 3.9 × 1.7 quad is a painted rectangle. Four
    // overlapping ones at different sizes and yaws have an outline nobody laid out.
    //
    // y .026–.034, clear of the puddle quads street.js lays at .011/.012 — two faces on one plane
    // is how this scene breaks.
    flat(-9.10, 0.026, 2.48, 3.70, 1.60, WET, { gloss: 0.72, ry: 0.03 });
    flat(-10.15, 0.028, 2.30, 1.90, 1.30, WET, { gloss: 0.68, ry: -0.14 });
    flat(-7.85, 0.030, 2.62, 1.70, 1.15, WET, { gloss: 0.70, ry: 0.11 });
    flat(-9.35, 0.034, 2.42, 2.20, 0.90, WETC, { gloss: 0.86, ry: -0.05 });
  });
  put('litter', () => {
    // And what the swill did not take with it. Seven pieces, no more: a pitch packed up carefully
    // leaves a little rubbish, and one that leaves a lot reads as fly-tipping.
    taper(-8.30, 0.045, 1.72, 0.115, 0.075, 0.115, col.white, { rx: 2.9, ry: 0.6, gloss: 0.20 });
    ball(-9.05, 0.020, 1.44, 0.090, 0.014, 0.070, PAPER, { ry: 1.1, gloss: 0.08 });
    ball(-7.55, 0.018, 2.05, 0.075, 0.012, 0.100, C('#d6cfba'), { ry: 0.3, gloss: 0.08 });
    cap(-10.15, 0.014, 1.95, 0.007, 0.16, 0.007, BAMBOOD, { rz: Math.PI / 2, ry: 0.9, gloss: 0.12 });
    ball(-6.70, 0.030, 2.55, 0.130, 0.030, 0.110, BAGWHT, { ry: 2.0, alpha: 0.9, gloss: 0.22 });
    box(-9.80, 0.022, 2.90, 0.22, 0.030, 0.16, CRATE, { hard: true, ry: 0.5, gloss: 0.18 });
    // A scorch of ash where the burner stood.
    flat(-7.95, 0.024, 2.60, 0.55, 0.45, C('#4a463f'), { gloss: 0.14, alpha: 0.8 });
  });

  // ================================================================ 9. the afternoon pitch
  put('market', () => {
    // 14:00–19:00. The same three metres of pavement, a different business: two trestles of fruit
    // and veg under a parasol, which is what actually happens to a hutong pitch once the breakfast
    // trade has gone home. A flower stall would have been the other answer, so there are two
    // buckets of cut flowers on the east end of it and the word is covered either way.
    const MZ = 2.72;
    for (const mx of [-9.60, -7.35]) {
      box(mx, 0.735, MZ, 2.10, 0.055, 0.94, CRATE, { hard: true, gloss: G.wood, tag: '水果' });
      box(mx, 0.700, MZ, 2.14, 0.030, 0.98, C('#6f5636'), { hard: true, gloss: 0.18 });
      for (const [ox, oz] of [[-0.92, -0.38], [0.92, -0.38], [-0.92, 0.38], [0.92, 0.38]])
        cap(mx + ox, 0.355, MZ + oz, 0.036, 0.710, 0.036, col.steelD, { gloss: 0.32 });
      // The green plastic grass mat over the boards, which every one of these has. Knocked well
      // off the pure green it started at: two 2 m slabs of #3f6b3c were the brightest thing in a
      // district stallBuilt out of grey brick and they read as billiard baize, not as a market.
      flat(mx, 0.766, MZ, 2.04, 0.90, C('#4e6446'), { gloss: 0.18 });
    }
    // Six crates, angled up on the boards so a customer looks into them rather than at their rims.
    // Each is its own word and each has its price stuck in the front of it. The 0.38 m gap between
    // the middle two is where the parasol pole goes — measured, not left to chance.
    const CROPS = [
      [-10.25, APPLE,   'ball', 15, '苹果',   '苹果五元一斤', CRATE],
      [-9.60,  TOMATO,  'ball', 15, '西红柿', '西红柿三元',   CRATEB],
      [-8.95,  BANANA,  'cap',  11, '香蕉',   '香蕉四元',     CRATEG],
      [-7.90,  CUKE,    'cap',  11, '黄瓜',   '黄瓜两元',     CRATE],
      [-7.25,  CABBAGE, 'oval',  8, '白菜',   '白菜一元',     CRATEB],
      [-6.60,  AUBER,   'oval',  8, '茄子',   '茄子三元',     CRATEG],
    ];
    for (const [cx, cc, kind, n, tag, price, crateCol] of CROPS) {
      box(cx, 0.855, MZ, 0.62, 0.160, 0.72, crateCol, { hard: true, rx: -0.16, gloss: 0.22, tag });
      box(cx, 0.845, MZ, 0.56, 0.130, 0.66, C('#5c4a30'), { hard: true, rx: -0.16, gloss: 0.16, tag });
      // Mounded, in two layers, and filling the crate corner to corner. At nine pieces on one
      // level in a 62 cm box every crate read as an empty tray with a few marbles rolling in it —
      // the whole look of a fruit pitch is that nothing is visible underneath the fruit.
      for (let i = 0; i < n; i++) {
        const a = i * 2.399, tier = i < n * 0.60 ? 0 : 1;
        const r = i ? (tier ? 0.050 + (i % 3) * 0.042 : 0.095 + (i % 4) * 0.048) : 0;
        const px = cx + Math.cos(a) * r, pz = MZ + Math.sin(a) * r * 0.92;
        const py = 0.955 - (pz - MZ) * 0.16 + tier * 0.085;
        if (kind === 'ball') ball(px, py, pz, 0.068, 0.064, 0.068, cc, { gloss: 0.30, ry: a, tag });
        else if (kind === 'cap')
          cap(px, py, pz, 0.046, 0.240, 0.046, cc, { rz: Math.PI / 2, ry: a, gloss: 0.24, tag });
        else ball(px, py + 0.03, pz, 0.108, 0.092, 0.108, cc, { gloss: 0.22, ry: a, tag });
      }
      // The price, on a card wired to a stick pushed into the crate.
      cap(cx, 1.02, MZ - 0.352, 0.006, 0.22, 0.006, BAMBOOD, { gloss: 0.14 });
      card(cx, 1.13, MZ - 0.36, 0.30, 0.11, price, 0.046, REDINK, CARDC);
    }
    // The parasol, in the gap between the trestles. Twelve panels, not eight: at eight the gap
    // between neighbours out at the rim was wider than the panels themselves and the canopy read
    // as a paper aeroplane on a stick. Twelve at 60 cm wide close up completely. Each sits 2 mm
    // off its neighbour in y — they all overlap near the hub and a dozen faces at one height is
    // exactly the coplanar case this scene keeps breaking on.
    //
    // Its span is 2.2 m rather than the 2.8 m one of these really has: the courtyard wall's face
    // is at z 3.64 and anything wider comes out through it.
    const UX2 = -8.475, UZ2 = 2.45, UY = 2.34;
    cap(UX2, UY / 2, UZ2, 0.030, UY, 0.030, col.steelD, { gloss: 0.34 });
    // Two sign traps, both of which turned this into a propeller before they were measured:
    //   `M.rotY(θ)` sends local +x to (cos θ, 0, −sin θ), so a panel offset to (cos a, sin a)
    //   needs **ry = −a**, not +a — at +a every panel but the two on the x axis comes out
    //   tangential.  And `transform` composes rotY · rotX · rotZ, so rz acts in the panel's own
    //   frame *before* the spin: positive rz lifts the outer end, which is a bowl. It wants −rz.
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      box(UX2 + Math.cos(a) * 0.56, UY - 0.22 + (i % 2) * 0.004, UZ2 + Math.sin(a) * 0.56,
        1.26, 0.042, 0.62, i % 2 ? PARASOL : PARASOLB,
        { hard: true, ry: -a, rz: -0.21, gloss: 0.22 });
      // The scalloped rim, on the circle the dropped panel ends actually reach.
      ball(UX2 + Math.cos(a) * 1.14, UY - 0.35, UZ2 + Math.sin(a) * 1.14,
        0.17, 0.030, 0.17, i % 2 ? PARASOL : PARASOLB, { gloss: 0.20 });
    }
    // The hub and the finial over the top of the panels.
    taper(UX2, UY - 0.02, UZ2, 0.34, 0.18, 0.34, PARASOL, { gloss: 0.24 });
    cyl(UX2, UY + 0.12, UZ2, 0.022, 0.11, col.steelD, { gloss: G.metal });
    // The foot: a concrete ring the pole drops into, which is what stops it going over.
    cyl(UX2, 0.055, UZ2, 0.22, 0.11, col.stoneD, { gloss: 0.16 });

    // The scale on its own frame, east of the trestles where there is nothing under it. Nothing is
    // sold off a pavement here without one, and 斤 is the only unit anybody weighs fruit in.
    const SX2 = -6.20, SZ2 = 3.02;
    cap(SX2, 0.68, SZ2, 0.032, 1.36, 0.032, col.steelD, { gloss: 0.34 });
    cap(SX2 - 0.17, 1.34, SZ2, 0.024, 0.38, 0.024, col.steelD, { rz: Math.PI / 2, gloss: 0.34 });
    box(SX2, 1.22, SZ2 - 0.02, 0.24, 0.15, 0.18, SCALE, { hard: true, gloss: 0.30 });
    box(SX2, 1.22, SZ2 - 0.115, 0.18, 0.075, 0.006, C('#25301f'), { hard: true, gloss: 0.40 });
    glyphs(SX2, 1.22, SZ2 - 0.123, Math.PI, '一斤',
      { size: 0.042, gap: 0.008, color: C('#8fd07a'), gloss: 0.05, lift: 0.004 });
    for (let i = 0; i < 3; i++)
      cap(SX2 - 0.34 + (i - 1) * 0.09, 1.14, SZ2, 0.005, 0.28, 0.005, col.steelD,
        { rx: (i - 1) * 0.22, gloss: G.metal });
    ball(SX2 - 0.34, 0.99, SZ2, 0.170, 0.055, 0.150, BAGRED, { gloss: 0.28 });
    // A stack of red baskets and a roll of bags on the near trestle.
    for (let i = 0; i < 3; i++)
      taper(-6.55, 0.80 + i * 0.055, MZ + 0.28, 0.34, 0.16, 0.28, BAGRED,
        { rx: Math.PI, ry: i * 0.3, gloss: 0.26 });
    cyl(-8.55, 0.83, MZ + 0.34, 0.055, 0.130, BAGWHT, { rz: Math.PI / 2, gloss: 0.22 });

    // Two buckets of cut flowers on the east end — chrysanthemums and lilies, the two things
    // actually sold off a pavement here. Tagged 花, which street.js already teaches on the pots at
    // 陈家's gate, so the word gains a second sighting rather than a second entry.
    for (const [fx, fz, fc] of [[-5.85, 2.95, PETALY], [-5.52, 2.90, PETALP]]) {
      taper(fx, 0.17, fz, 0.30, 0.34, 0.30, CRATEB, { gloss: 0.26, tag: '花' });
      cyl(fx, 0.335, fz, 0.125, 0.014, C('#4a5a62'), { gloss: 0.70, tag: '花' });
      for (let i = 0; i < 9; i++) {
        const a = i * 0.698, r = 0.055 + (i % 3) * 0.030;
        // Signs matter here too: positive rz leans the stem's top toward −x and positive rx leans
        // it toward +z, so a stem that splays out under its own flower head is (−cos, +sin).
        cap(fx + Math.cos(a) * r * 0.7, 0.52, fz + Math.sin(a) * r * 0.7, 0.010, 0.44, 0.010, STEM,
          { rz: -Math.cos(a) * 0.22, rx: Math.sin(a) * 0.22, tag: '花' });
        ball(fx + Math.cos(a) * r * 1.5, 0.755, fz + Math.sin(a) * r * 1.5,
          0.048, 0.042, 0.048, i % 3 === 2 ? PETALW : fc, { gloss: 0.16, tag: '花' });
      }
    }
    // The seller's own stool and flask, behind the trestles against the wall.
    taper(-9.95, 0.17, 3.34, 0.30, 0.34, 0.30, col.plastic, { gloss: 0.30 });
    box(-9.95, 0.35, 3.34, 0.32, 0.04, 0.32, col.plastic, { hard: true, gloss: 0.30 });
    cyl(-9.60, 0.145, 3.36, 0.055, 0.290, C('#3f5f6a'), { gloss: 0.36 });
    cyl(-9.60, 0.305, 3.36, 0.048, 0.040, col.steelD, { gloss: G.metal });

    // The banner along the front of the trestles, which is how the pitch says what it is.
    box(-8.50, 0.40, MZ - 0.50, 4.30, 0.30, 0.010, PARASOL,
      { hard: true, gloss: 0.20, tag: '蔬菜' });
    glyphs(-8.50, 0.40, MZ - 0.512, Math.PI, '新鲜水果蔬菜',
      { size: 0.180, gap: 0.055, color: col.paintY, gloss: 0.10, lift: 0.006, tag: '蔬菜' });

    stallMarketSolid = solid(-10.75, -5.30, 2.18, 3.24);
    shade(-8.40, MZ, 5.00, 1.60, 0.30);

    // Both kept on a short reach and pulled right up to the trestle. `reachThing` picks whichever
    // thing is closest *relative to its own reach*, and 早餐's focus sits at (-8.60, 0.50) with a
    // 2.2 m reach all day long — on a generous reach these two lost to a breakfast stall that had
    // gone home five hours earlier from anywhere on the pavement.
    thing('蔬菜', -7.60, 1.05, MZ - 0.42, '下午这儿卖菜。',
      'In the afternoon this pitch sells vegetables.',
      '蔬 leafy + 菜 vegetable. The same three metres of pavement, twice a day.',
      { focus: [-7.60, 1.60], reach: 1.5 });
    thing('水果', -9.90, 1.05, MZ - 0.42, '苹果五块钱一斤。',
      'Apples, five kuai a jin.',
      '斤 is half a kilo, and it is the only unit anybody weighs fruit in.',
      { focus: [-9.90, 1.60], reach: 1.5 });
  });

  // ================================================================ 10. the empty pavement
  put('night', () => {
    // Nineteen hundred to a quarter to five, and there is nothing here at all except the two crates
    // the pitch leaves chained to the wall and the ring the parasol pole stands in. An empty pitch
    // with a little of its own furniture on it reads as a pitch between shifts; a completely bare
    // one reads as a bug.
    for (let i = 0; i < 2; i++)
      box(-10.55, 0.145 + i * 0.28, WALL - 0.26, 0.60, 0.28, 0.42, i ? CRATEB : CRATE,
        { hard: true, gloss: 0.22, ry: (i - 0.5) * 0.12 });
    box(-10.55, 0.44, WALL - 0.26, 0.64, 0.02, 0.46, col.tarp, { hard: true, gloss: 0.24 });
    cap(-10.25, 0.30, WALL - 0.30, 0.007, 0.62, 0.007, col.steelD,
      { rz: Math.PI / 2 - 0.4, gloss: G.metal });
    cyl(-8.475, 0.012, 2.45, 0.115, 0.024, col.steelD, { gloss: 0.40 });
  });

  // ---------------------------------------------------------------- snapshot
  // Every prop's built matrix, taken once, so hiding and showing is a copy rather than a rebuild.
  for (const k in G_) G_[k] = G_[k].map(p => ({ p, m0: p.m }));
  stallBuilt = G_;
  stallPuffs = puffs;
};

// ---------------------------------------------------------------- state shared with the tick
//
// Classic scripts share one global lexical environment: a bare `let built` here and a bare
// `let built` in anybody else's file is a SyntaxError that takes the whole page down before a
// line of it runs. Everything at this level is prefixed for that reason and no other.
let stallBuilt = null, stallPuffs = null, stallTrikeSolid = null, stallMarketSolid = null;
let stallShown = null;                            // which groups are up right now
let stallCartSolid = null, stallCartLooked = false;

// 早餐 trades 05:00–10:30 — the same two numbers street.js's own tick uses for the cart. Everything
// below hangs off them, so there is one definition of when the stall is on the pavement and the
// Alley and Entry agents never have to carry a second copy of it.
const STALL_OPEN = 5.0, STALL_SHUT = 10.5;

// The shape of the morning inside those hours, and of the day around them. [from, to) in hours; a
// window whose end is before its start wraps round midnight.
const STALL_WINDOWS = {
  trade:   [STALL_OPEN, STALL_SHUT],
  rush:    [6.33, 8.60],
  thin:    [8.60, STALL_SHUT],
  packing: [10.0, STALL_SHUT],
  litter:  [STALL_SHUT, 13.17],
  wet:     [STALL_SHUT, 15.0],
  market:  [14.0, 19.0],
  night:   [19.0, 4.75],
};

// Off the pavement: the same trick street.js's own cart uses — sixty metres under the ground and
// scaled to a thousandth, so a hidden prop is a degenerate triangle rather than a removal. Built
// once at load rather than per frame; `M` is in js/math.js, which loads first.
const STALL_HIDDEN = M.trs(0, -60, 0, 0, 0.001, 0.001, 0.001);

StreetFit['stall'].tick = (t, body, mins) => {
  if (!stallBuilt) return;

  if (mins !== undefined) {
    const h = (mins / 60) % 24;
    const on = {};
    for (const k in STALL_WINDOWS) {
      const [a, b] = STALL_WINDOWS[k];
      on[k] = b > a ? (h >= a && h < b) : (h >= a || h < b);
    }
    // Written only on the frame a window opens or shuts. This is four hundred matrices and it
    // happens eight times a day; per frame it would be the most expensive thing on the street.
    if (!stallShown) stallShown = {};
    for (const k in STALL_WINDOWS) {
      if (stallShown[k] === on[k]) continue;
      stallShown[k] = on[k];
      for (const s of stallBuilt[k]) s.p.m = on[k] ? s.m0 : STALL_HIDDEN;
    }
    // Colliders follow their own group. street.js's cart leaves its collider on the pavement all
    // day — an invisible 2.6 m box you walk into at three in the morning — so it is opened here
    // too, found by its bounds rather than by reaching into that file. `Street` is only safe to
    // touch from the tick: the builders run inside its own lazy construction, before the name is
    // bound.
    if (stallTrikeSolid) stallTrikeSolid.open = !on.trade;
    if (stallMarketSolid) stallMarketSolid.open = !on.market;
    if (!stallCartLooked) {
      stallCartLooked = true;
      try {
        stallCartSolid = Street.solids.find(s =>
          Math.abs(s.x0 + 9.90) < 0.02 && Math.abs(s.x1 + 7.30) < 0.02 &&
          Math.abs(s.z0 - 1.80) < 0.02 && Math.abs(s.z1 - 3.00) < 0.02) || null;
      } catch (e) { stallCartSolid = null; }
    }
    if (stallCartSolid) stallCartSolid.open = !on.trade;

    // ---- 蒸汽, off the griddle, the 粥 and the water barrel. Stopped with the trade, the way the
    // shell stops its basket steam: nothing steams off a pitch that went home at half past ten.
    if (on.trade && stallPuffs) {
      for (const s of stallPuffs) {
        const u = ((t * 0.30) + s.phase) % 1;
        const grow = 1 + u * 1.7;
        s.p.m = M.trs(s.x + Math.sin(t * 0.9 + s.phase * 6) * 0.06 * u, s.y0 + u * 0.82, s.z,
                      0, s.r * grow, 0.20 * grow, s.r * grow);
        s.p.alpha = s.a0 * (1 - u) * (1 - u) * 1.7;
      }
    }
  }

};

// ---------------------------------------------------------------- 排队 the queue
//
// The four people this pitch needs: three at the cart through the morning and the woman who runs
// the fruit pitch in the afternoon. street.js's roster already supplies 摊主 behind the steamers
// and one 客人 waiting; two people is a stall, four is a business, and the difference is the whole
// reason this district exists.
//
// **They are not live yet, and a district file cannot make them live.** Every rigged figure comes
// off `NPCS` in js/data.js, and the only code that can turn a roster row into a body is `initNPC`
// / `addNPC` — both private inside game.js's `(() => { … })()` wrapper, and neither exported on
// `window.__game`. Pushing raw rows onto the `NPCS` array that *is* exported would hand the update
// loop entries with no `look`, no `seed` and no `th`, which is a crash rather than a neighbour.
//
// So the table is published here instead, on the district's own registry entry, ready for the two
// lines that make it work. **TICKET — Hub (js/game.js), one line**, beside the existing MallCast
// fold at game.js:1065 and before `NPCS.forEach(initNPC)`:
//
//     for (const k in StreetFit)
//       if (StreetFit[k] && StreetFit[k].cast) for (const n of StreetFit[k].cast) NPCS.push(n);
//
// That is the `MallCast` pattern generalised to the street, and it serves all nine districts
// rather than just this one — the mall solved exactly this problem for eighteen tenant files and
// the note at game.js:1061 says why: eighteen authors editing one call in game.js is how you break
// the whole game while improving one shop. Same argument, nine districts.
//
// Every `hours` and `spots` window is written against STALL_OPEN/STALL_SHUT so the queue arrives
// and leaves with the cart and there are never two sets of numbers to keep in step. None of them
// has a line: they are the crowd, and their job is to be busy in the background — an NPC that
// speaks needs its audio baked (see the note above 服务员 in js/data.js).
StreetFit['stall'].cast = [
  { hz: '排队的一',
    // Second in the line: a man on his way to work who has done this every morning for years and
    // is not looking at the stall at all. Short sleeves, a shirt collar, the shoulder bag.
    look: { skin:'#d29a6e', hair:'#2e2724', hairStyle:'short', top:'#7d8794', pants:'#333a44',
            shoe:'#3d4147', sleeve:'short', collar:'shirt', bag:'shoulder', bagColor:'#4a4038',
            tall:1.02, wide:1.02, headScale:1.0, age:0.34, faceSeed:311 },
    hours: [STALL_OPEN, STALL_SHUT], temper: 'bored',
    spots: [{ h0:STALL_OPEN, h1:STALL_SHUT, at:[-9.30, 1.62], face:0.52, act:'wait' }] },
  { hz: '排队的二',
    // Third: a woman in her fifties doing the whole morning's shopping in one go, with the tote she
    // has had for years. She is the reason the pitch sells 粥 as well as buns.
    look: { skin:'#dcb188', hair:'#4e463d', hairStyle:'bun', top:'#8c6b7a', pants:'#3a4250',
            shoe:'#4a4e54', sleeve:'short', collar:'polo', bag:'tote', bagColor:'#a8443c',
            tall:0.92, wide:1.05, headScale:1.0, stoop:0.09, age:0.55, faceSeed:317 },
    // On for the rush and nothing else. The turnover has to be in the *people* as well as in the
    // props: a queue that is exactly two deep from five in the morning until half past ten is a
    // diorama. With these three windows the line is one at half five, four at half seven, three
    // by nine and back to one by ten.
    hours: [6.2, 8.7], temper: 'patient',
    spots: [{ h0:6.2, h1:8.7, at:[-10.02, 1.48], face:0.88, act:'wait' }] },
  { hz: '扫码的',
    // At the head of it, paying. `buy` is the game's own pose for working a screen with the head
    // down and the near hand up — which is exactly what scanning a code taped to a pole looks like,
    // and it is why this figure sells the QR sign rather than standing next to it. She is 80 cm
    // off 客人, who street.js's roster already puts at (-7.70, 1.72): any closer and two figures
    // stand inside each other.
    look: { skin:'#e2b58f', hair:'#241f1d', hairStyle:'ponytail', top:'#4e6f6a', pants:'#2f3540',
            shoe:'#cfc9bb', sleeve:'short', collar:'vneck', bag:'shoulder', bagColor:'#6b5a4a',
            tall:0.94, wide:0.95, headScale:1.01, age:0.24, faceSeed:331 },
    hours: [5.6, 9.8], temper: 'brisk',
    spots: [{ h0:5.6, h1:9.8, at:[-7.05, 1.20], face:-0.58, act:'buy' }] },
  { hz: '老板娘',
    // The afternoon. Not the same person as 摊主 and never on at the same time: the breakfast pitch
    // and the fruit pitch are two businesses that happen to rent the same pavement.
    look: { skin:'#c08a58', hair:'#3a332e', hairStyle:'bun', top:'#b8443a', yoke:'#7d7a70',
            pants:'#3a4048', shoe:'#43474d', sleeve:'long', apron:'#5c6248',
            hat:'sun', hatColor:'#cbbf9c',
            tall:0.93, wide:1.08, headScale:1.0, age:0.52, faceSeed:337 },
    hours: [14, 19], temper: 'brash',
    // Back at z 3.36 rather than 3.22: at 3.22 she was standing inside her own trestle, whose
    // back edge is at 3.19, and the wall face is at 3.64, so this is the only 28 cm she fits in.
    spots: [{ h0:14, h1:19, at:[-8.40, 3.36], face:Math.PI, act:'vend' }] },
];
