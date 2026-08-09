// 🏪 Convenience store — 便利店 — chiller, noodle shelf, clerk
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    x -10.0 .. -6.0, -z side  (landside)
//   camera  D-conv (new)
//
// 便利店 — chiller, noodle shelf, clerk.
//
// The camera IS the acceptance test. Render your shot with `node .audit.js D-conv`, open the
// PNG, and look at it. A zone whose code boots but whose shot is black, empty, or unchanged has
// not shipped. You own your row(s) in .audit.js and nobody else's.
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
// Check yourself: `node .fpscheck.js airport` must stay under 16.7 ms median. If your zone pushes
// it over, say so in your report rather than shipping it.
//
// ---------------------------------------------------------------------------------------------
// WHERE IT ACTUALLY STANDS, AND WHY IT IS NOT AGAINST THE GLASS
//
// The contract says "x -10.0 .. -6.0 on the -z side", and the obvious reading of that is the
// strip along the curtain wall. It is the wrong reading, and the collider says so rather than
// the eye. The shell fills this half of the landside hall with seating — `seatRun` at x -7.60,
// three rows at z -3.60 / -4.90 / -6.60, each laying a collider 0.72 m deep — so a body walking
// this zone with its 0.30 m radius finds:
//
//     z  -3.24 .. -6.96   solid, three rows of seats with two 1.20 m slots through them
//     z  -6.96 .. -8.45   free: 1.49 m between the last row of seats and the curtain wall
//
// 1.49 m is not a shop. Build a 便利店 into it and the customer has 1.49 − (shop depth) left to
// stand in; anything deep enough to hold a chiller, a counter and somebody behind the counter
// leaves under 0.60 m of clear run, which is exactly the width `clampMove` needs before a body
// can stand there at all. The shop would have sealed its own doorstep — the sofa-across-the-room
// bug this codebase has shipped before, invisible in every render because a render does not walk.
//
// So it stands in the one genuinely empty pocket the zone has, north of the seating and south of
// the concourse walk: **x -9.25 .. -7.00, z -2.90 .. -0.10.** Everything about that rectangle is
// measured rather than chosen:
//
//   west   -9.25 is where the seat run's own collider begins. Going further west would narrow
//          the 1.20 m slot between the x -12.10 and x -7.60 seat runs — the walk-through people
//          use to reach the window — to below the 0.60 m a body needs. It stays at full width.
//   east   -7.00 clears the bin at (-6.70, -2.30), whose carcass reaches x -6.91, by 9 cm; the
//          bin ends up parked against the shop's flank, which is where bins live anyway.
//   south  -2.90 leaves 34 cm behind the unit and 45 cm of legroom in front of the people
//          sitting in the z -3.60 row, who face this way.
//   north  -0.10 stops well clear of the concourse walk, which runs z 0 .. +2 unobstructed.
//
// A 2.25 m frontage is small, and it is small on purpose: it is what fits. What it buys is that
// the unit is freestanding, so it takes nothing off the curtain wall — the apron and runway
// cameras look straight past it — and the customer has the whole open floor to stand in.
//
// Serve-over, not walk-in. 2.25 × 2.80 is a fifth of the 超市 in js/shop.js and there is no
// honest way to fit a door, an aisle and a till into it; a counter across the front with the
// stock behind it is both what fits and what a landside terminal kiosk actually is. The collider
// is the whole footprint, so nobody walks in and nothing has to pretend to be walkable.
//
// ---------------------------------------------------------------------------------------------

registerAirportAmbient('shop-kiosk-clerk', -8.405, -1.40, 0,
  { hz:'店员', roleClass:'retail', act:'vend', top:'#33566b', gender:'female',
    look:{apron:'#a8323e',scarf:'#c9992f'}, source:'air-shop' });

AirFit['shop'] = A => {
  const { box, cyl, ball, cap, taper, wall, flat, glyphs, solid, blocker, glow, thing } = A;
  const { C, G, col } = A;
  const { M_STONE, M_METAL, M_WALL, M_TILE } = A;

  // Its own stream, so the shop is the same shop on every machine and after every reload. A shop
  // laid out by Math.random is a different shop in every screenshot and cannot be reviewed.
  let seed = 0x5ab3f1;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  // Tags, applied to a slice of the prop list rather than passed to every call.
  //
  // `finish()` builds one hit box per tag out of the props wearing it, and the look-at ray picks
  // the `thing` whose tag the box belongs to. A shop built without tags is a shop you cannot look
  // at: the three word cards below exist, are in the dictionary, and are unreachable, because no
  // surface in the room carries their name. Threading `tag:` through ninety option objects is how
  // that gets forgotten in one of them, so the tag goes on afterwards, by range. `buildZones()`
  // runs well before `B.finish()`, which is the only ordering this depends on.
  const P0 = A.props.length;
  const tagRange = (from, to, t) => {
    const P = A.props;
    for (let i = from; i < to; i++) P[i].tag = t;
  };

  // ---------------------------------------------------------------- the datums
  const X0 = -9.25, X1 = -7.00;              // the flanks (see the note above — both measured)
  const ZB = -2.90, ZF = -0.10;              // back wall, shopfront line
  const XC = (X0 + X1) / 2, ZC = (ZB + ZF) / 2;
  const W = X1 - X0, D = ZF - ZB;            // 2.25 × 2.80
  const WT = .08;                            // wall thickness
  const HT = 2.55;                           // the soffit — the inside of the unit
  const FT = 3.15;                           // the top of the fascia

  // The brand. Invented, as everything in this game's shopfronts is: 云程 is "cloud journey",
  // off 云程万里, which is what you wish somebody catching a flight. No real chain is named here.
  const NAME = '云程便利店';

  // Two greys and a red. The hall around this unit is cream stone, grey seating and blue signage
  // for forty metres in both directions, so the one thing the shop must not be is another muted
  // box: the fascia is the loudest surface in the landside half and that is the point of it.
  const RED = col.red, CREAM = col.cream, GOLD = col.goldL;

  // Shelf steel. One options object, reused everywhere, because `mat`/`matScale` is what starts a
  // new batch — six fittings that each invented their own metal would be six draw calls for one
  // shop's worth of shelving.
  const MET = { hard: true, gloss: G.metal, ...M_METAL };

  // ================================================================ the carcass
  // A tiled pad, so the shop's floor is not the hall's stone running under it. Retail units in a
  // terminal are fitted out to a different floor spec than the concourse and it is the cheapest
  // way to say "this is a different tenancy".
  flat(XC, .014, ZC, W, D, col.slab, { mode: 9, gloss: .30, ...M_TILE });

  box(XC, HT / 2, ZB + WT / 2, W, HT, WT, col.wall,
    { hard: true, gloss: G.paint, ...M_WALL });
  for (const s of [-1, 1])
    box(XC + s * (W / 2 - WT / 2), HT / 2, ZC, WT, HT, D, col.wall,
      { hard: true, gloss: G.paint, ...M_WALL });
  // The soffit, emissive rather than lit. A shop reads as a shop because the box is brighter
  // inside than the room it stands in, and a 44 m hall with six ceiling lamps in it will never
  // do that from outside: the ceiling of the unit has to be its own source.
  box(XC, HT + .05, ZC, W, .10, D, C('#f6efdd'),
    { hard: true, mode: 1, glow: .16 });
  // Two trough lights slung under it, which is what you actually see from the front.
  for (const oz of [-2.20, -1.00])
    box(XC, HT - .07, oz, W - .30, .06, .16, col.tube,
      { hard: true, mode: 1, glow: .52 });

  // ---- the fascia. Wider than the unit by 16 cm each way so it reads as a signboard bolted on
  // rather than as the top of the box.
  box(XC, (HT + FT) / 2 + .04, ZF + .01, W + .16, FT - HT - .08, .14, RED,
    { hard: true, gloss: .22 });
  box(XC, HT + .07, ZF + .02, W + .16, .07, .16, GOLD, { hard: true, mode: 1, glow: .22 });
  glyphs(XC, (HT + FT) / 2 + .06, ZF + .10, 0, NAME,
    { size: .27, gap: .085, color: CREAM, mode: 1, glow: .70 });
  // 24小时 — the plate every Chinese convenience store hangs, and the one fact about the shop a
  // passenger on a 06:20 departure needs. Hung inside the opening at the west end.
  // Hung *from* the soffit rather than floating below it: its top edge is at HT, so it reads as
  // a plate screwed to the ceiling of the unit instead of a card suspended on nothing.
  // Set back to ZF − .22 so it clears the fascia band, which hangs from y 2.63 down to z −0.16.
  // At ZF − .05 the plate and the signboard shared 3 cm of the same space and the jade came
  // through the red.
  box(X0 + .42, HT - .10, ZF - .22, .62, .20, .04, col.jade, { hard: true, gloss: .24 });
  glyphs(X0 + .42, HT - .10, ZF - .19, 0, '24小时',
    { size: .125, gap: .028, color: CREAM, mode: 1, glow: .45 });

  // ================================================================ 冷藏柜 the chiller
  // The left-hand bay of the back wall, glass-doored and lit cold. This is the fitting that says
  // "shop" from across a concourse: a bright blue-white rectangle full of colour, at night the
  // only thing in the landside half that is not cream.
  const CX = X0 + .63, CZ = ZB + .36;        // centre of the case
  const CW = 1.10, CD = .55, CH = 2.05;
  box(CX, CH / 2, CZ - CD / 2 + .02, CW, CH, .04, C('#cfe2e8'), { hard: true, gloss: .34 });
  for (const s of [-1, 1])
    box(CX + s * (CW / 2 - .025), CH / 2, CZ, .05, CH, CD, col.white, { hard: true, gloss: .30 });
  box(CX, CH - .05, CZ, CW, .10, CD, col.white, { hard: true, gloss: .30 });
  box(CX, .09, CZ, CW, .18, CD, col.steelD, { ...MET });

  // The stock. Four decks, and the shape of a drink is a body, a printed band round its middle
  // and a cap — three cylinders, which all land in the same batch as every other cylinder in the
  // shop because nothing about them changes `round`, `bevel` or `mat`. All the variety is colour,
  // which travels per instance and is free.
  //
  // Nothing here is translucent. A real bottle of water is, and forty translucent bottles are
  // forty draw calls; at this distance a pale body with a blue cap and a printed band reads as
  // bottled water and costs a share of one.
  const DRINK = [
    { body: C('#cfe4ee'), band: C('#3a6a92'), cap: C('#2f6392') },   // 矿泉水
    { body: C('#cfe4ee'), band: C('#3f7564'), cap: C('#3d7361') },   // 苏打水
    { body: C('#6b4a2c'), band: C('#b8402c'), cap: C('#8c2f20') },   // 可乐
    { body: C('#c9a13a'), band: C('#e8dfcf'), cap: C('#b8402c') },   // 茶
    { body: C('#3f7564'), band: C('#e0d8bf'), cap: C('#c9a13a') },   // 绿茶
    { body: C('#e8dfcf'), band: C('#c4402f'), cap: C('#b8402c') },   // 酸奶
    { body: C('#e0a24a'), band: C('#f2f0e9'), cap: C('#d47c28') },   // 橙汁
    { body: C('#d8ccb0'), band: C('#8f6a3a'), cap: C('#6b4a2c') },   // 豆奶
  ];
  const bottle = (x, y, z, c, full) => {
    cyl(x, y + .105, z, .042, .21, c.body, { gloss: .52 });
    if (full) cyl(x, y + .095, z, .045, .085, c.band, { gloss: .26 });
    cyl(x, y + .225, z, .019, .034, c.cap, { gloss: .44 });
  };
  for (let d = 0; d < 4; d++) {
    const y = .40 + d * .38;
    box(CX, y - .015, CZ + .015, CW - .10, .03, CD - .10, col.chrome,
      { hard: true, gloss: G.metal, ...M_METAL });
    // The bottom deck is behind the counter from every angle a customer stands at, so it is
    // faced up with plain bodies and no printed band — two props a bottle instead of three.
    for (let i = 0; i < 5; i++)
      bottle(CX - .40 + i * .20, y, CZ + .10 + (rnd() - .5) * .05,
        DRINK[(d * 3 + i) % DRINK.length], d > 0);
  }
  // The strip light behind the top rail, and the cold the case actually throws. The strip is what
  // the fitting looks like; the light is the reason the bottles in there come out a different
  // colour temperature from the shelf a metre to the right of them, which is the whole trick.
  box(CX, CH - .16, CZ - .06, CW - .14, .05, .10, C('#dcf0f8'),
    { hard: true, mode: 1, glow: .46 });
  A.light(CX, 1.55, CZ + .18, [0.62, 0.86, 1.00], .44, 1.7);

  // The doors, last, and after everything they stand in front of. A see-through prop still writes
  // depth, so a glass door built before its own contents cuts a chiller-shaped hole in them —
  // the bug js/shop.js carries a paragraph about on its freezer lid.
  for (const s of [-1, 1])
    box(CX + s * .275, 1.06, CZ + CD / 2 - .03, .53, 1.80, .035, col.glass,
      { hard: true, mode: 1, alpha: .30, gloss: G.glass });
  for (const ox of [-.525, 0, .525])
    box(CX + ox, 1.06, CZ + CD / 2 - .02, .05, 1.84, .06, col.steel, { ...MET });
  for (const s of [-1, 1])
    cap(CX + s * .075, 1.06, CZ + CD / 2 + .03, .026, .70, .026, col.steelD, { gloss: G.metal });
  glyphs(CX, CH - .05, CZ + CD / 2 + .02, 0, '冷藏',
    { size: .12, gap: .03, color: col.blue, mode: 1, glow: .30 });

  // ================================================================ 方便面 the noodle wall
  // The right-hand bay, open shelving, and the reason a Chinese convenience store is not a
  // Western one: four decks of 桶面 and 袋面 with the hot-water urn standing at the end of the
  // counter to fill them from. Nobody sells you a pot of noodles you cannot eat on the spot.
  const NP0 = A.props.length;
  const NX = X1 - .57, NZ = ZB + .26, NW = .96, ND = .34;
  for (const s of [-1, 1])
    box(NX + s * (NW / 2 - .02), 1.05, NZ, .04, 2.06, ND, col.steelD, { ...MET });
  box(NX, 2.07, NZ, NW, .05, ND, col.steel, { ...MET });

  // 桶面 — a tub wider at the top than the bottom, with a paper lid taped over it. `taper`
  // narrows upward, so it comes over: left the way it comes out a 桶面 reads as a bucket with
  // its mouth pinched shut, which is the same trap the diner's woks carry a comment about.
  const pot = (x, y, z, c, trim) => {
    taper(x, y + .085, z, .21, .17, .21, c, { rx: Math.PI, gloss: .28, ry: (rnd() - .5) * .5 });
    cyl(x, y + .178, z, .102, .016, col.cream, { hard: true, gloss: .16 });
    return trim;
  };
  // 袋面 — the five-pack slab, the one thing on the shelf wider than it is tall.
  const slab = (x, y, z, c, lab) => {
    box(x, y + .055, z, .30, .11, .24, c, { gloss: .38, round: .028 });
    box(x, y + .060, z + .126, .21, .07, .008, lab, { hard: true, gloss: .20 });
  };
  // 面包 — a bagged bun, inflated, with the crimp along the top. The landside catering offer in
  // this terminal is water, noodles and bread, and this is the bread.
  const bun = (x, y, z, c, lab) => {
    box(x, y + .075, z, .21, .15, .16, c, { gloss: .30, round: .055 });
    box(x, y + .080, z + .085, .15, .09, .008, lab, { hard: true, gloss: .18 });
  };

  const POT = [C('#c4402f'), C('#d9a63a'), C('#3f7a54'), C('#b8402c'), C('#d97a2b'), C('#8aa63c')];
  for (let d = 0; d < 4; d++) {
    const y = .46 + d * .42;
    box(NX, y - .015, NZ, NW - .04, .03, ND, col.slab,
      { hard: true, gloss: .24, ...M_METAL });
    // The shelf edge: a white ticket strip with a yellow cap over it. It is the repetition of
    // that one detail down every deck that reads as a shop rather than as a bookcase.
    box(NX, y + .045, NZ + ND / 2 + .01, NW - .06, .05, .015, col.white,
      { hard: true, gloss: .22 });
    box(NX, y + .078, NZ + ND / 2 + .012, NW - .06, .018, .018, col.yellow,
      { hard: true, mode: 1, glow: .18 });
    if (d === 0)
      for (let i = 0; i < 3; i++)
        slab(NX - .32 + i * .32, y, NZ, POT[(i * 2) % POT.length], col.cream);
    else if (d === 3)
      for (let i = 0; i < 4; i++)
        bun(NX - .34 + i * .225, y, NZ, C(['#e0c184', '#d8b06a', '#e6d3ab', '#cf9f5c'][i]),
          [col.red, col.jade, col.blue, col.redD][i]);
    else
      for (let i = 0; i < 4; i++)
        pot(NX - .34 + i * .225, y, NZ + (rnd() - .5) * .04, POT[(d * 3 + i) % POT.length]);
  }
  // On the shelf's own top rail at 2.07, not at 2.24. Written higher it stood 35 cm clear of the
  // back wall with nothing behind it — from square on it looks painted on the wall, but from any
  // other angle in the hall it is a row of characters floating in the air above the shelving.
  glyphs(NX, 2.145, NZ + ND / 2 + .01, 0, '方便面',
    { size: .145, gap: .04, color: col.redD, mode: 1, glow: .34 });
  const NP1 = A.props.length;

  // ================================================================ 香烟 behind the counter
  // Cigarettes are never on an open shelf in China: they are in a locked lit case behind the
  // till, and this is a landside shop, so they are the first thing a departing smoker asks for.
  // Hung on the east flank where the clerk can reach it without turning round.
  // GX is the centre of an 18 cm deep case hung flat on the east wall, so its front — the face
  // everything in it has to be seen through — is at GX − .09, on the −x side. Building the glass
  // at +x instead puts it behind the stock against the wall, where it glazes nothing and the
  // twelve packets sit in the open: the same "which face is the front" mistake the chiller doors
  // are ordered to avoid, one axis over.
  const GX = X1 - WT - .09, GZ = -1.95;
  box(GX, 1.52, GZ, .18, 1.00, .90, col.charcoal, { hard: true, gloss: .26 });
  box(GX + .075, 1.52, GZ, .03, .96, .86, C('#20242a'), { hard: true, mode: 1, glow: .10 });
  for (let r = 0; r < 3; r++) {
    box(GX, 1.14 + r * .30, GZ, .16, .022, .86, col.steel, { ...MET });
    for (let i = 0; i < 4; i++)
      box(GX - .02, 1.20 + r * .30, GZ - .32 + i * .215, .07, .10, .16,
        [C('#c9a13a'), C('#b8402c'), C('#3f5a6a'), C('#e0d8bf')][(r + i) % 4],
        { hard: true, gloss: .30 });
  }
  box(GX - .075, 1.52, GZ, .035, .96, .86, col.glass,
    { hard: true, mode: 1, alpha: .26, gloss: G.glass });
  glyphs(GX - .10, 1.94, GZ, -Math.PI / 2, '香烟',
    { size: .11, gap: .03, color: GOLD, mode: 1, glow: .34 });

  // ================================================================ 收银台 the counter
  // Across the front, because the unit is served over rather than walked into. Its face is the
  // one surface in this shop the camera sees square on, so it carries the shop's colour and the
  // impulse case; the till, the reader and the small stock stand on top of it.
  const TX = X0 + .79, TZ = ZF - .65, TW = 1.42, TD = .55;
  box(TX, .46, TZ, TW, .92, TD, col.desk, { gloss: .26, ...M_STONE });
  box(TX, .96, TZ, TW + .07, .07, TD + .07, col.deskD, { hard: true, gloss: .24, ...M_STONE });
  box(TX, .07, TZ, TW - .06, .14, TD - .08, col.steelD, { ...MET });
  // The livery band on the front, and the gold rail over it — the same two moves as the fascia,
  // which is what makes the two read as one shopfit rather than as two fittings that met here.
  box(TX, .50, TZ + TD / 2 - .01, TW, .62, .04, RED, { hard: true, gloss: .20 });
  box(TX, .83, TZ + TD / 2, TW, .05, .03, GOLD, { hard: true, mode: 1, glow: .20 });
  // 结账 — where you pay. Written on the face rather than hung above it: at 2.25 m wide there is
  // no room over the counter for a sign, and the face is what a queue looks at anyway.
  glyphs(TX, .50, TZ + TD / 2 + .03, 0, '结账',
    { size: .17, gap: .06, color: CREAM, mode: 1, glow: .40 });

  // ---- the till, the reader and the code stand. Three fittings, and the code stand is the one
  // that dates the scene: nobody in this country is paying a shop like this in cash.
  box(TX - .48, 1.12, TZ - .04, .38, .24, .34, col.white, { gloss: .30 });
  box(TX - .48, 1.28, TZ - .17, .30, .18, .06, col.charcoal, { hard: true, gloss: .36 });
  const liveTill=box(TX - .48, 1.28, TZ - .20, .25, .13, .02, C('#8fe0b0'),
    { hard: true, mode: 1, glow: .34 });
  cap(TX + .04, 1.10, TZ + .12, .026, .26, .026, col.steelD, { gloss: G.metal });
  box(TX + .04, 1.28, TZ + .12, .15, .21, .04, col.charcoal, { hard: true, gloss: .40, rx: -.22 });
  box(TX + .35, 1.14, TZ + .10, .13, .19, .02, col.white, { hard: true, gloss: .24, rx: -.20 });
  glyphs(TX + .35, 1.14, TZ + .09, 0, '扫码',
    { size: .055, gap: .012, color: col.charcoal, lift: .006 });

  // ---- what stands on the counter, which in a shop this size is the whole impulse offer:
  // a tray of lighters, a rack of power banks and a wire basket of eggs boiled in tea.
  cyl(TX + .58, 1.06, TZ - .12, .055, .13, C('#3f5a6a'), { gloss: .34 });
  for (let i = 0; i < 4; i++)
    box(TX + .555 + (i % 2) * .04, 1.09, TZ - .145 + ((i / 2) | 0) * .045, .013, .09, .013,
      [col.red, col.yellow, col.jade, col.blue][i], { hard: true, gloss: .30 });
  // 充电宝 — the thing a passenger who has been in a queue for an hour actually buys.
  box(TX + .58, 1.05, TZ + .16, .30, .11, .16, col.white, { hard: true, gloss: .26 });
  for (let i = 0; i < 3; i++)
    box(TX + .48 + i * .10, 1.16, TZ + .16, .075, .13, .035,
      [C('#3f5a6a'), C('#2b2f34'), C('#b8402c')][i], { hard: true, gloss: .38, rx: -.24 });
  glyphs(TX + .58, 1.02, TZ + .245, 0, '充电宝',
    { size: .05, gap: .012, color: col.charcoal, lift: .006 });

  // ================================================================ 开水器 the hot-water urn
  // The one fitting that makes this a Chinese shop rather than a Western one with Chinese labels.
  // It stands at the end of the counter, on the customer's side of it, because the whole point of
  // the thing is that you buy a 桶面 and fill it yourself before you go through security.
  const UP0 = A.props.length;
  const UX = X1 - .40, UZ = ZF - .70;
  box(UX, .44, UZ, .58, .88, .50, col.steel, { ...MET });
  box(UX, .91, UZ, .64, .06, .56, col.chrome, { ...MET });
  cyl(UX, 1.28, UZ - .04, .17, .68, col.chrome, { gloss: G.metal, ...M_METAL });
  cyl(UX, 1.64, UZ - .04, .175, .06, col.steelD, { gloss: G.metal });
  cyl(UX, 1.44, UZ - .04, .178, .10, col.red, { gloss: .30 });
  // The sight glass down the front, lit, which is how you know there is water in it.
  box(UX - .01, 1.24, UZ + .13, .035, .40, .035, C('#bfe4f0'),
    { hard: true, mode: 1, glow: .28 });
  // The tap and the drip tray under it.
  box(UX + .07, 1.06, UZ + .16, .05, .10, .07, col.steelD, { hard: true, gloss: G.metal });
  cap(UX + .07, .99, UZ + .19, .022, .10, .022, col.steelD, { gloss: G.metal });
  box(UX, .945, UZ + .16, .26, .03, .18, col.steelD, { hard: true, gloss: .34 });
  glyphs(UX, 1.44, UZ + .155, 0, '开水',
    { size: .085, gap: .02, color: CREAM, mode: 1, glow: .42 });
  // 免费开水 — free, which it always is, and which is the sentence this fitting teaches. On the
  // face of the bench rather than on a plate over the urn: a sign 20 cm above a lid is attached
  // to nothing, and the bench front is the one surface here square to the customer.
  box(UX, .68, UZ + .25, .50, .18, .03, col.jade, { hard: true, gloss: .24 });
  glyphs(UX, .68, UZ + .275, 0, '免费开水',
    { size: .095, gap: .026, color: CREAM, mode: 1, glow: .44 });
  // The stack of paper cups beside it, and one wisp of steam off the tap. The steam is the only
  // translucent prop out here and it earns its draw call: an urn with nothing coming off it is a
  // chrome cylinder, and the wisp is the entire difference between the two.
  cyl(UX - .21, 1.06, UZ - .04, .042, .22, col.cream, { gloss: .20 });
  taper(UX - .21, 1.20, UZ - .04, .09, .07, .09, col.white, { rx: Math.PI, gloss: .22 });
  const steam=ball(UX + .09, 1.22, UZ + .21, .09, .13, .07, col.white,
    { mode: 1, alpha: .13, glow: .05 });
  // The plume rises well beyond its own small mesh radius. Give the loose-prop culler a sphere
  // around the complete path before the airport scene is sealed.
  steam.fixed=true; steam.cx=UX+.09; steam.cy=1.43; steam.cz=UZ+.21; steam.r=.46;
  const UP1 = A.props.length;

  // ================================================================ 店员 the clerk
  // Behind the counter in the metre of lane between it and the chiller, facing the customer.
  // Built here rather than through the shell's `agent()` — that factory is inside airport.js's
  // own scope and is not on `A` — so this is the same recipe at the same proportions: a torso, a
  // shoulder roll, a neck, a head and the legs that have to exist for the long views across the
  // hall even though the counter hides them from the front.
  // KZ is set by where her hands land, not by where the middle of the lane is: the forearms come
  // forward .34 from the hip, and the counter's back edge is at −1.06, so anywhere further back
  // than this leaves her resting her hands on thin air a hand's width behind her own till.
  // ================================================================ what it does to the room
  // One warm lamp inside the box. The shell hangs six on a diagonal down a 44 m hall and only the
  // eight nearest the camera ever reach the shader, so a small unit that wants to be lit has to
  // bring its own — and standing in the middle of the floor rather than against a wall, this one
  // has no borrowed light at all.
  A.light(XC, 2.10, ZC + .30, [1.00, 0.91, 0.74], .52, 3.2);
  // The spill out of the opening onto the concourse stone, which is what a lit shop does to the
  // floor in front of it and the reason you can tell it is open from thirty metres away.
  glow(M.trs(XC, .02, ZF + .95, 0, W + 1.2, 1, 2.9), C('#ffeccd'), .17);
  A.shade(XC, ZC, W + .5, D + .4, .30);

  // The whole footprint is solid: serve-over, so there is nothing inside to walk to. With the
  // 0.30 m body radius this stops a body at z 0.28, which puts a customer's chest about 30 cm
  // off the counter's front face — leaning on it, which is where you stand to buy a bottle.
  solid(X0 - .10, X1 + .10, ZB - .06, ZF + .10);

  // Everything is the shop unless it is one of the two fittings that teach a word of their own.
  // Ranges rather than names: the urn's tag has to cover the bench, the sign and the cups too, or
  // looking at the sign picks the shop and the card says 便利店.
  tagRange(P0, A.props.length, '便利店');
  tagRange(NP0, NP1, '方便面');
  tagRange(UP0, UP1, '开水');

  thing('便利店', XC, 1.85, ZF + .12, '来一瓶水，一桶面。',
    'A bottle of water and a pot of noodles, please.',
    '便利 convenient + 店 shop. 瓶 is the measure word for bottles, 桶 for a tub of noodles.',
    { focus: [XC, ZF + 1.15], reach: 2.2 });
  // 开水 has no row in js/vocab.js yet — it is a ticket for the Hub — and that is a content gap
  // rather than a crash. Both paths that read the row are guarded: `openWord` bails on
  // `if (!e || doing) return;` so the card cannot open without one, and the walk-up prompt falls
  // back to the bare headword with a note in js/game.js about this exact case. So the urn is
  // filed under the word a Chinese station urn actually has written on it. Until the row lands
  // the object is unlearnable; filing it under 水 to dodge that would have made it permanently
  // the wrong word instead, which is worse and harder to notice.
  thing('开水', UX, 1.55, ZF + .10, '这里的开水是免费的。', 'The boiled water here is free.',
    '开 boil + 水 water: water that has been boiled. Every shop, station and office in the '
    + 'country keeps an urn of it, and it is what you pour into a 桶面.',
    { focus: [UX, ZF + .95], reach: 1.8 });
  thing('方便面', NX, 1.60, ZF + .10, '一桶面多少钱？', 'How much is a pot of noodles?',
    '方便 convenient + 面 noodles. 桶面 is the tub kind, 袋面 the packet kind.',
    { focus: [NX, ZF + 1.0], reach: 2.4 });

  AirFit['shop'].rig={steam,liveTill,x0:UX+.09,y0:1.22,z0:UZ+.21};
};

// Anything that moves registers here and the shell dispatches it once a frame. Do not start your
// own timer: `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in minutes.
// A tick that throws is dropped for the rest of the run rather than stopping the terminal.
//
AirFit['shop'].tick = (t, body, clock) => {
  const q=AirFit['shop'].rig;
  if(!q) return;
  let u=(t*.31)%1; if(u<0) u+=1;
  const p=q.steam,m=p.m,grow=.78+u*.48;
  m[0]=.18*grow; m[5]=.26*grow; m[10]=.14*grow;
  m[12]=q.x0+Math.sin(t*.73)*.025*u;
  m[13]=q.y0+u*.42;
  m[14]=q.z0+Math.sin(t*.49+1.2)*.018*u;
  p.cx=m[12]; p.cy=m[13]; p.cz=m[14];
  p.alpha=.12*Math.sin(u*Math.PI);
  q.liveTill.glow=.34+(.5+.5*Math.sin(t*2.1))*.035;
};
