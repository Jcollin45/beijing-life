// 面包店 · 麦香面包 · MAIXIANG BAKERY — floor 1
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
//   A.put(a,b,w,dp,h,y,colour,opt)   a box. NOTE the argument order: `w` is the extent along
//                                    *depth* and `dp` the extent along the frontage — the shell
//                                    swaps them per wall so the same call works on all four.
//   A.cyl / A.ball / A.cap / A.taper (a,b,y,...,colour,opt)
//   A.island(a,b,w,dp,fill)          a low display island; `fill(topY)` dresses it
//   A.counter(a,b,w,dp[,colour,till]) a service counter, optionally with a till
//   A.glyph(a,b,y,text,opt)          characters on a surface; they face the concourse
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.light(a,b,y,rgb,power,radius)  a real light
//   A.th(hz,a,b,zh,en,note,reach,y)  something to walk up to and say
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// ---------------------------------------------------------------- what is already in this unit
//
// Two of the shopping centre's own machines stand inside this shop and are not the tenant's to
// move. js/mall.js puts the cash machine at x 11.68..13.13 and the vending machine at x 13.95..
// 15.25, "by the doors where they always are" — but the doors are at x 0 and this shop is x
// 10..18, so in this frame they are a 2.40 m charcoal slab at b -2.33..-0.88 and a 2.16 m red one
// at b -0.05..+1.25, both hard against the back wall, with the shell's own collider under them
// out to a = 1.45. From the doorway they are the two largest objects in the room, and unpainted
// they read as a black hole and a red hole punched in the middle of the only wall the shop has.
//
// So the plan is built around them rather than pretending they are not there. The trick is to
// stop them being *objects in a room* and make them *units in a fitted wall*:
//
//   * the joinery takes the two ends — bread shelving left, the oven bank right — and then the
//     three gaps the machines leave (7 cm, 83 cm and 16 cm) are filled with matching timber, so
//     the run of joinery is continuous from one partition to the other;
//   * a head rail and a storage shelf run across the top of both of them at 2.44–2.61, clearing
//     the taller by 4 cm, with a slatted band and the shop's own line above that;
//   * the island of loose bread is 1.72 tall at a 2.23..3.01, which from the doorway covers them
//     to about y 1.8, and the price board hung over the aisle takes another slice off the top;
//   * the cross aisle at a 1.45..2.20 is left completely clear across the full width. Both
//     machines are things the player is meant to be able to walk up to and use, both keep their
//     own screens, keypads and lettering, and nothing here stands in front of either of them.
//
// A bakery is otherwise the most forgiving shop in the building, because it is all self-service:
// open shelving you reach into, an island you walk round with a tray, a printed card on every
// shelf edge, a glass case for what must not be handled, and an oven you can see the light of.
// Density is the whole job. The failure mode is six buns on a shelf, which reads as ten minutes
// before closing.
MallFit['面包店'] = A => {
  // ---------------------------------------------------------------- palette and surfaces
  // Baked goods are a narrow band of golds and the fit-out has to stay out of their way, so the
  // joinery is dark timber and the only saturated things in the room are the oven light, the
  // cake case and the price cards.
  //
  // The steels are deliberately *warm* greys. They started life blue (#8d959b / #5c666d) and the
  // room came back cold: an eighth of every frame in here is tray, rack, oven front and chiller,
  // and a blue tray under a gold loaf is the one thing that stops bread looking like bread.
  const K = {
    carc  : C('#4a3827'),  // shelf carcass and island body
    carcL : C('#6a4c30'),  // the lining behind goods, a shade up from the carcass
    tim   : C('#8a6743'),  // shelf boards
    trim  : C('#2f3236'),
    steel : C('#9b9a93'),
    steelD: C('#5f5d57'),
    stone : C('#ded6c2'),
    paper : C('#f2e9d5'),
    kraft : C('#c1a276'),  // sacks and carrier bags
    ink   : C('#3a3129'),
    red   : C('#b13a30'),
    gold  : C('#f2d489'),
    goldW : C('#ffeeb6'),  // the vinyl on the outside of the glass, read against a lit interior
    glass : C('#e9f1f2'),
    tile  : C('#9d9a90'),
    warm  : C('#ffe6ba'),
    floor : C('#6d4a30'),  // the tenant's own floor, laid over the shell's cream
    // the food
    crust : C('#c08b4c'), crustD: C('#9a6631'), crustL: C('#dcb277'),
    dough : C('#ecd7ae'), choc  : C('#5b3b26'), matcha: C('#7f9b5e'),
    milk  : C('#ddc296'),  // a white loaf's crust — #ecd7ae is flour dust and reads as paper
    berry : C('#c4718a'), yolk  : C('#e3ab4b'), icing : C('#f4ead2'),
    basket: C('#8a6636'),
    // Switched colours, built once. Everything below that changes during the day is a reference
    // swap on an existing prop — `p.color = C('#…')` inside a frame loop allocates a colour a
    // frame, and this shop repaints eleven price cards every time the clock crosses half eight.
    ledOn : C('#ff7448'), ledOff: C('#2b1410'), ledLamp: C('#8fe39a'),
    lampOn: C('#ffd489'), lampOff: C('#43362a'),
    // The discount red is hotter and lighter than the shop's own #b13a30, because a reduction
    // sticker is print laid over a price card rather than part of the card.
    cut   : C('#e04a2c'), cutD: C('#7a2a1e'),
  };
  // Four material tuples and no more. Batching keys on mesh, mode, corner radius and the whole
  // material tuple together, so a fifth variant of `wood` at a different amount is a fifth draw
  // call for no visible gain. `nrmAmt` is the one that matters: it defaults to 1, which lays an
  // AO-like grey cloud over everything it touches, and .30 is the value the rest of the building
  // reads correctly at.
  const MW = { mat:'wood',   matScale:.90, matAmt:.28, nrmAmt:.30 };
  // .30 rather than .55: at one repeat per 55 cm the steel map's brush lines are wide enough to
  // read as corrugation, and the chiller's end panel came out as a roller shutter.
  const MS = { mat:'steel',  matScale:.30, matAmt:.28, nrmAmt:.30 };
  const MT = { mat:'tile',   matScale:.30, matAmt:.24, nrmAmt:.30 };
  const MB = { mat:'fabric', matScale:.10, matAmt:.34, nrmAmt:.30 };  // the weave of a basket
  const RND = .03;                    // one corner radius for every soft box in the shop

  // ---------------------------------------------------------------- the goods
  // Three or four primitives each, and never quite the same twice: what makes a tray read as
  // bread rather than as a tray of beads is that no two pieces on it are the same object.
  const jit = (b, n) => { const v = Math.sin(b * 41.7 + n * 12.9) * 43758.5453; return v - Math.floor(v); };
  // Three coherent display bays can empty during the evening. Their primitives stay in their
  // existing opaque instance batches; switching a retained matrix to zero is cheaper and more
  // correct than changing alpha, which would move bread into the loose transparent pass. The
  // three crossed cards use the shop's existing mode-1 box batch, so they add no draw signature.
  const dayStock = [], soldCards = [], STOCK_GONE = M.trs(0, -99, 0, 0, 0, 0, 0);
  const keepStock = (parts, p) => { if (parts) parts.push(p); return p; };
  const stockSlot = parts => {
    A.dynamicVisual(parts);
    dayStock.push({ parts, rest:parts.map(p => p.m) });
  };
  const soldCard = (a, b, y) => {
    const parts = [
      A.put(a, b, .010, .18, .12, y, K.red, { hard:true, mode:1, glow:.03 }),
      A.put(a + .007, b, .008, .14, .014, y, K.paper, { hard:true, mode:1, glow:.02, rz:.58 }),
      A.put(a + .007, b, .008, .14, .014, y, K.paper, { hard:true, mode:1, glow:.02, rz:-.58 }),
    ];
    const q = { parts, rest:parts.map(p => p.m) };
    A.dynamicVisual(parts); parts.forEach(p => { p.m = STOCK_GONE; }); soldCards.push(q);
  };
  const showStock = (q, show) => q.parts.forEach((p, i) => { p.m = show ? q.rest[i] : STOCK_GONE; });

  const bun = (a, b, y, c, s = 1, parts) => {                // a round bun with a scored top
    keepStock(parts, A.ball(a, b, y + .048 * s, .080 * s, .054 * s, .071 * s, c,
      { mode:7, gloss:.15 }));
    keepStock(parts, A.put(a, b, .030 * s, .068 * s, .011, y + .092 * s, K.dough,
      { hard:true, mode:7 }));
  };
  const seeded = (a, b, y, c, parts) => {                    // the same, with seeds on it
    bun(a, b, y, c, 1, parts);
    for (let i = 0; i < 3; i++)
      keepStock(parts, A.ball(a - .02 + i * .02, b - .03 + i * .03, y + .100,
        .010, .007, .010, K.choc, { mode:7 }));
  };
  // A long loaf lying along the shelf. `rz` turns the capsule's long axis onto the b axis; `rx`
  // would put it into the depth axis, which is what the shared rail() does and is exactly why
  // that one fixture only comes out right on the east and west walls.
  const baguette = (a, b, y, c, len = .42, parts) => {
    keepStock(parts, A.cap(a, b, y + .048, .044, len, .044, c,
      { rz:Math.PI / 2, mode:7, gloss:.13 }));
    for (let i = 0; i < 3; i++)
      keepStock(parts, A.put(a, b - len / 3 + i * len / 3, .05, .014, .013, y + .086, K.dough,
        { hard:true, mode:7, rz:.55 }));
  };
  // A white loaf: a body, a risen crown narrower than it, and flour on top. One rounded cube with
  // a lid reads as a tissue box.
  const toast = (a, b, y, c) => {
    A.put(a, b, .150, .210, .118, y + .060, c, { round:RND, mode:7, gloss:.12 });
    A.put(a, b, .138, .194, .052, y + .140, c, { round:RND, mode:7, gloss:.12 });
    A.put(a, b, .128, .182, .018, y + .170, K.dough, { round:RND, mode:7 });
  };
  // A croissant is a body and two horns that taper away from it. With one pair of blobs it reads
  // as a drumstick from three-quarters on; the second, smaller pair is what makes it a crescent.
  const croissant = (a, b, y, c, parts) => {
    keepStock(parts, A.cap(a, b, y + .040, .036, .17, .036, c,
      { rz:Math.PI / 2, mode:7, gloss:.20 }));
    for (const s of [-1, 1]) {
      keepStock(parts, A.ball(a - .032, b + s * .088, y + .034, .028, .025, .028, c,
        { mode:7, gloss:.20 }));
      keepStock(parts, A.ball(a - .058, b + s * .112, y + .028, .019, .017, .019, c,
        { mode:7, gloss:.20 }));
    }
  };
  // An egg tart. Built as a stepped shell rather than one cylinder, because the thing that says
  // "tart" from a metre away is that the pastry is wider at the rim than at the base and the
  // custard sits proud of it — one flat disc of gold is a coin.
  const tart = (a, b, y, parts) => {
    keepStock(parts, A.cyl(a, b, y + .013, .040, .026, K.crustL, { gloss:.20 }));
    keepStock(parts, A.cyl(a, b, y + .032, .054, .016, K.crust,  { gloss:.22 }));
    keepStock(parts, A.ball(a, b, y + .040, .046, .016, .046, K.yolk, { mode:7, gloss:.34 }));
  };
  const cake = (a, b, y, c) => {                             // a whole cake on its board
    A.cyl(a, b, y + .012, .128, .024, K.stone, { hard:true, gloss:.40 });
    A.cyl(a, b, y + .072, .110, .100, K.icing, { mode:7, gloss:.18 });
    A.cyl(a, b, y + .128, .110, .014, c, { mode:7, gloss:.30 });
    for (let i = 0; i < 5; i++) {
      const t = i * Math.PI * 2 / 5;
      A.ball(a + Math.sin(t) * .070, b + Math.cos(t) * .070, y + .144, .019, .017, .019,
        K.berry, { mode:7 });
    }
  };
  // A slice, cut face outward: sponge, a cream layer through it, a coloured top and the cut face
  // showing all three. As one cream cube with a coloured lid these read as tins of paint.
  const slice = (a, b, y, c, parts) => {
    keepStock(parts, A.put(a, b, .115, .072, .046, y + .028, K.icing,
      { round:RND, mode:7, gloss:.14 }));
    keepStock(parts, A.put(a, b, .115, .072, .014, y + .058, c,
      { round:RND, mode:7, gloss:.24 }));
    keepStock(parts, A.put(a, b, .115, .072, .038, y + .084, K.icing,
      { round:RND, mode:7, gloss:.14 }));
    keepStock(parts, A.put(a, b, .112, .070, .013, y + .109, c,
      { round:RND, mode:7, gloss:.30 }));
    keepStock(parts, A.put(a + .059, b, .006, .068, .100, y + .062, c,
      { hard:true, mode:7, alpha:1 }));
    keepStock(parts, A.ball(a + .010, b, y + .126, .017, .015, .017, K.berry, { mode:7 }));
  };
  // A timber crate of loaves, and the fixture this shop now has most of.
  //
  // It replaces a round basket built out of three stacked cylinders, and the change is the single
  // biggest one to how the room photographs. A drum has no visible construction: at any size, from
  // any angle, three concentric cylinders in bakery colours read as a gold tin, and the loaves
  // mounded across the mouth of one read as its lid. Twenty of them on the island racks and the
  // window plinths turned the whole shop into a display of tinned goods.
  //
  // A crate has the three things the cylinder could not show — four slatted sides you can see the
  // thickness of, a dark void inside them, and bread standing proud of a rim you can read the
  // height of. It is also all boxes, so twenty-six of them are one draw call rather than three.
  //
  // (a, b, y, n, w, d) — `w` across the depth axis, `d` along the frontage, `n` loaves in it.
  const crate = (a, b, y, n = 4, w = .30, d = .34) => {
    A.put(a, b, w, d, .022, y + .011, K.crustD, { hard:true, gloss:.08, ...MW });   // base
    A.put(a, b, w - .06, d - .06, .012, y + .030, K.choc, { hard:true, gloss:.04 }); // the void
    for (const s of [-1, 1]) {
      A.put(a + s * (w / 2 - .013), b, .026, d, .125, y + .066, K.tim,
        { hard:true, gloss:.16, ...MW });
      A.put(a, b + s * (d / 2 - .013), w - .05, .026, .125, y + .066, K.tim,
        { hard:true, gloss:.16, ...MW });
    }
    // A paper liner folded over the rim, which is what a bakery actually lines a crate with and
    // what stops the inside reading as a hole cut in a block.
    A.put(a, b, w - .07, d - .07, .014, y + .118, K.kraft, { hard:true, mode:7, gloss:.05 });
    // The bread is the mass, not the crate: loaves lying the long way across it, packed along the
    // depth and standing proud of the rim. The length is taken off `d` and not off some constant,
    // because a loaf sized for the island's crates hangs 4 cm over both ends of the wall's.
    const half = Math.max(.09, d / 2 - .055);
    for (let i = 0; i < n; i++) {
      const t = jit(b + a, i) - .5;
      A.cap(a - (w / 2 - .075) + i * ((w - .15) / Math.max(1, n - 1)), b + t * .05,
        y + .140 + (i % 2) * .026, .036, half, .036,
        [K.crust, K.crustD, K.crustL, K.milk][i % 4],
        { rz:Math.PI / 2 + t * .16, mode:7, gloss:.12 });
    }
  };
  // 月饼礼盒 — the lacquered gift box the trade sells its mooncakes in, and the only strong red
  // and gold in the room. Stacked, they are what makes the window read as a Chinese bakery rather
  // than as a European one.
  const gift = (a, b, y, w = .28, d = .28, h = .13, c = K.red) => {
    A.put(a, b, w, d, h, y + h / 2, c, { round:.014, hard:true, gloss:.30 });
    A.put(a, b, w * .94, d * .94, .012, y + h - .002, K.gold, { hard:true, gloss:.34 });
    A.cyl(a + w / 2 + .007, b, y + h * .52, .040, .012, K.gold,
      { rx:Math.PI / 2, mode:1, glow:.05, gloss:.40 });
  };
  // A loose mooncake: a pressed round cake with a stamped crown. Two primitives, because a single
  // disc of the same colour is a coin and this is the one thing in the case that is not a pastry.
  const mooncake = (a, b, y, c = K.crust) => {
    A.cyl(a, b, y + .023, .054, .046, c, { gloss:.18 });
    A.cyl(a, b, y + .050, .036, .014, K.crustD, { gloss:.24 });
  };
  // A sack of flour. Kraft paper, slumped: a wide base, a narrower folded top and a printed band.
  // In white with a red stripe these read from across the room as fire extinguishers.
  const sack = (a, b, y) => {
    A.put(a, b, .22, .26, .22, y + .110, K.kraft, { round:RND, mode:7, gloss:.05 });
    A.put(a, b, .18, .22, .10, y + .265, K.kraft, { round:RND, mode:7, gloss:.05 });
    A.put(a + .004, b, .19, .23, .06, y + .150, K.red, { hard:true, mode:7 });
  };
  // (a, b, da, db, y) — a steel tray, `da` deep and `db` along the frontage, standing on y.
  // `t` is the label it belongs to: a tagged prop is what the game pulses when you look at the
  // thing it names, so the island's trays answer to 面包 rather than to the shop as a whole.
  const TG = t => (t ? { tag:t } : null);      // never `tag: undefined` — that erases the shop's
  const tray = (a, b, da, db, y, t) => {
    A.put(a, b, da, db, .016, y + .008, K.steel, { hard:true, gloss:.38, ...TG(t), ...MS });
    for (const s of [-1, 1]) {
      A.put(a + s * da / 2, b, .012, db, .026, y + .014, K.steelD,
        { hard:true, gloss:.46, ...TG(t) });
      A.put(a, b + s * db / 2, da, .012, .026, y + .014, K.steelD,
        { hard:true, gloss:.46, ...TG(t) });
    }
  };
  const trayFlat = (a, b, da, db, y) => {                    // the same, for a rack or a shelf
    A.put(a, b, da, db, .020, y + .010, K.steel, { hard:true, gloss:.38, ...MS });
    A.put(a - da / 2, b, .014, db, .030, y + .018, K.steelD, { hard:true, gloss:.46 });
    A.put(a + da / 2, b, .014, db, .030, y + .018, K.steelD, { hard:true, gloss:.46 });
  };
  // A printed name-and-price card clipped to a shelf edge. Real characters: at a metre and a half
  // these are the whole difference between a shop and a diagram of a shop, and in a game about
  // reading they are the only reason to walk up to a shelf at all. Every character is its own
  // draw call, which is why there are eleven of these and not thirty.
  //
  // It hands back the red band under the price. That band is the shop's discount switch: at half
  // past eight the bakery marks everything left down, and what a Beijing bakery actually does is
  // slap a hotter red sticker across the ticket. The characters cannot change — A.glyph returns
  // nothing, so a printed price is printed for the life of the room — but the ticket going from
  // maroon to a lit orange-red, with the 全场七折 band on the counter lit at the same moment, is
  // the same signal and it is the one this renderer can actually make.
  const card = (a, b, y, name, price) => {
    A.put(a, b, .010, .215, .100, y, K.paper, { hard:true, gloss:.05 });
    const band = A.put(a + .006, b, .002, .215, .015, y - .050, K.red,
      { hard:true, mode:1, glow:.02 });
    A.glyph(a + .004, b, y + .021, name, { size:.038, gap:.007, color:K.ink, mode:1, glow:0 });
    A.glyph(a + .004, b, y - .023, price, { size:.033, gap:.006, color:K.red, mode:1, glow:0 });
    return band;
  };
  // Every ticket in the shop, so the evening markdown reaches all of them at once.
  const priceBands = [];

  // ---------------------------------------------------------------- the floor
  // The shell lays cream carpet in here, which under four warm downlights comes back as a white
  // sheet with no tone in it anywhere, and a white floor under gold bread is the fastest way to
  // make a room look like a render. A bakery lays quarry tile. One box, one draw call, and it is
  // the single biggest change to how warm the room reads.
  //
  // It stops short at a = 3.55 so the shell's own entrance mat and threshold band still show in
  // the doorway, and it stands 3 cm proud of the carpet — coplanar surfaces z-fight, and the
  // shell's mat is already at .017..0.031.
  A.put(1.835, 0, 3.43, 7.76, .012, .036, K.floor, { hard:true, gloss:.26, ...MT });

  // ---------------------------------------------------------------- back wall, left: bread wall
  // Open timber shelving, five tiers. The lighting is a warm strip under the front edge of every
  // shelf, which is what a real bakery does and what the eye reads as "lit": this was a single
  // glowing white panel behind the goods, and at any glow strong enough to see it blew out to
  // paper white and took every loaf's silhouette with it.
  //
  // The carcass front face is at a = 0.42 rather than 0.36 for a reason that costs an hour if it
  // is missed: the shell hangs a framed, softly lit graphic on the back wall at b -3.09, and its
  // lit pane's front face is at a = 0.365. At 0.36 the landlord's lightbox came through the
  // tenant's shelving.
  const bL = -3.14;
  A.put(.32, bL, .20, 1.48, 2.36, 1.24, K.carc,  { hard:true, gloss:.16, ...MW });
  A.put(.435, bL, .03, 1.36, 2.18, 1.25, K.carcL, { hard:true, gloss:.14, ...MW });
  for (const s of [-1, 1])
    A.put(.645, bL + s * .71, .45, .06, 2.38, 1.25, K.carc, { hard:true, gloss:.18, ...MW });
  A.put(.65, bL, .48, 1.50, .08, 2.48, K.carc, { hard:true, gloss:.18, ...MW });   // cornice
  A.put(.65, bL, .40, 1.44, .14, .07, K.trim, { hard:true, gloss:.26 });           // kick
  const SHELF = [.44, .84, 1.24, 1.64, 2.04];
  SHELF.forEach((y, r) => {
    A.put(.65, bL, .44, 1.36, .038, y, K.tim, { hard:true, gloss:.20, ...MW });
    A.put(.865, bL, .014, 1.36, .050, y + .043, K.tim, { hard:true, gloss:.22, ...MW });
    A.put(.858, bL, .012, 1.28, .014, y - .028, K.warm, { hard:true, mode:1, glow:.12 });
    const top = y + .019;
    // Two rows deep and three across. One row of anything on a 44 cm shelf reads as a museum case.
    for (let i = 0; i < 3; i++) {
      const b = bL - .45 + i * .45;
      const gap = r === 1 && i === 1 ? [] : null;
      if (r === 0) {
        toast(.52, b - .12, top, K.milk); toast(.52, b + .12, top, K.crustL);
        toast(.75, b - .11, top, K.crustL); toast(.75, b + .11, top, K.milk);
      } else if (r === 1) {
        baguette(.51, b, top, K.crust, .40, gap); baguette(.65, b, top, K.crustD, .36, gap);
        baguette(.79, b, top, K.crustL, .38, gap);
      } else if (r === 2) {
        croissant(.52, b - .09, top, K.crustL); croissant(.52, b + .10, top, K.crust);
        croissant(.70, b - .05, top, K.crustD); croissant(.70, b + .14, top, K.crustL);
        seeded(.83, b - .12, top, K.crustD); seeded(.83, b + .07, top, K.crust);
      } else if (r === 3) {
        for (let k = 0; k < 8; k++)
          (k % 2 ? seeded : bun)(.51 + (k % 4) * .105, b - .14 + ((k / 4) | 0) * .26, top,
            [K.crust, K.crustL, K.crustD, K.dough, K.crust, K.crustL, K.milk, K.crustD][k]);
      } else crate(.66, b, top, 4, .34, .38);
      if (gap) stockSlot(gap);
    }
  });
  soldCard(.892, bL, SHELF[1] + .14);
  [['吐司', '¥16'], ['法棍', '¥12'], ['牛角包', '¥14'], ['小面包', '¥6'], ['杂粮包', '¥9']]
    .forEach(([n, p], r) => priceBands.push(card(.878, bL + (r % 2 ? .40 : -.40),
      SHELF[r] + .086, n, p)));
  A.stop(.20, .92, -3.90, -2.38);

  // ---------------------------------------------------------------- back wall, over the machines
  // The three fillers, the head rail and the storage shelf: everything that turns a black slab and
  // a red slab into two units in a run of joinery. The gaps are 7 cm to the left of the cash
  // machine, 83 cm between the two, and 16 cm to the right of the vending machine, all measured
  // off js/mall.js — so these numbers move if that file ever moves the machines.
  A.put(.85, -2.36, 1.10, .10, 2.44, 1.22, K.carc, { hard:true, gloss:.18, ...MW });
  A.put(.80, 1.34, 1.00, .17, 2.44, 1.22, K.carc, { hard:true, gloss:.18, ...MW });
  // The 83 cm gap is wide enough to be a shelf unit rather than a filler, so it gets one: four
  // open tiers of small bread, which is also the only thing in the middle of this wall that has
  // anything on it.
  //
  // Built as a carcass with a void in front of it rather than as one solid box with shelves
  // "inside" — a box is a box, and anything at a smaller `a` than its front face is simply not
  // drawn. This is the same mistake that had the drinks chiller's entire stock buried in its own
  // cabinet and the oven's light buried in the oven.
  A.put(.65, -.465, .70, .80, 2.44, 1.22, K.carc,  { hard:true, gloss:.18, ...MW });
  A.put(1.015, -.465, .03, .74, 2.10, 1.28, K.carcL, { hard:true, gloss:.14, ...MW });
  for (const s of [-1, 1])
    A.put(1.18, -.465 + s * .37, .36, .06, 2.34, 1.27, K.carc, { hard:true, gloss:.18, ...MW });
  A.put(1.19, -.465, .38, .82, .06, 2.41, K.carc, { hard:true, gloss:.18, ...MW });
  for (let r = 0; r < 4; r++) {
    const y = .52 + r * .46;
    A.put(1.18, -.465, .32, .68, .034, y, K.tim, { hard:true, gloss:.20, ...MW });
    A.put(1.335, -.465, .012, .64, .016, y - .026, K.warm, { hard:true, mode:1, glow:.15 });
    for (let k = 0; k < 3; k++)
      (r % 2 ? bun : seeded)(1.12 + (k % 2) * .10, -.665 + k * .20, y + .017,
        [K.crust, K.crustL, K.crustD][(r + k) % 3]);
  }
  // Head rail and storage shelf, right across both machines. 2.44 clears the taller of the two by
  // 4 cm and leaves its own 取款机 lettering at 2.25 in the clear.
  A.put(.46, -.49, .32, 3.82, .12, 2.50, K.tim,  { hard:true, gloss:.20, ...MW });
  A.put(.50, -.49, .40, 3.86, .05, 2.585, K.tim, { hard:true, gloss:.20, ...MW });
  for (let i = 0; i < 7; i++) {
    const b = -2.28 + i * .60;
    if (i % 4 === 0) sack(.58, b, 2.611);
    else if (i % 4 === 1) crate(.54, b, 2.611, 3, .32, .40);
    else if (i % 4 === 2) {
      A.cyl(.58, b - .07, 2.721, .082, .20, K.steelD, { gloss:.42, ...MS });
      A.cyl(.58, b + .11, 2.691, .068, .14, K.steel,  { gloss:.42, ...MS });
    } else {
      // The stock of 月饼礼盒 kept up out of the way, which is where a bakery keeps the boxed
      // stuff it sells one of an hour.
      gift(.56, b - .02, 2.611, .26, .26, .12, K.red);
      gift(.56, b + .02, 2.732, .26, .26, .12, C('#8f2f2a'));
    }
  }
  // A slatted band over the top of it with the shop's own line on it, because the shell writes the
  // tenant's name on the back wall at 1.95 and both machines stand in front of that. It sits at
  // a 0.395..0.465 — in front of the shell's own timber fins, whose faces are at 0.395 — and stops
  // at y 2.90, under the shell's cove strip at 2.93.
  A.put(.43, -.49, .07, 3.86, .28, 2.76, K.carc, { hard:true, gloss:.16, ...MW });
  for (let i = 0; i < 13; i++)
    A.put(.47, -2.34 + i * .308, .05, .055, .24, 2.76, K.tim, { hard:true, gloss:.20, ...MW });
  A.put(.505, -.49, .02, 1.90, .17, 2.76, K.carc, { hard:true, gloss:.18 });
  A.glyph(.520, -.49, 2.76, '每日现烤', { size:.135, gap:.044, color:K.gold, mode:1, glow:.14 });

  // ---------------------------------------------------------------- back wall, right: the oven
  // The half of the shop you can smell, and the one thing in here that had to be rebuilt rather
  // than adjusted. It was a squat two-deck oven with its doors at y 0.75–1.25 — dead behind the
  // service counter, whose stone top is at 0.98 and whose cake case goes to 1.60. From anywhere a
  // customer can stand, none of it was visible: the shop's whole back-of-house, its glowing doors
  // and its cooling racks, all drawn every frame and none of it ever seen.
  //
  // So the ovens go up on a base, the way a real deck oven does: doors at 1.24–1.70 and 1.86–2.32,
  // controls at 2.34, hood to 2.98. The upper deck now clears the counter by 26 cm and is the
  // first thing you see over it from the doorway.
  A.put(.37, 2.65, .14, 2.46, 2.88, 1.54, K.tile, { hard:true, gloss:.26, ...MT });
  A.put(.67, 2.29, .70, 1.54, .16, .08, K.trim, { hard:true, gloss:.30 });          // kick
  A.put(.67, 2.29, .70, 1.54, 2.24, 1.28, K.steel, { hard:true, gloss:.40, ...MS }); // body
  // The base cabinet under the decks: two doors, a rail, and the proving drawers you would
  // actually find there.
  for (const s of [-1, 1]) {
    A.put(1.025, 2.29 + s * .36, .03, .68, .86, .69, K.steelD, { hard:true, gloss:.44 });
    A.cap(1.045, 2.29 + s * .36, .69, .015, .56, .015, K.steel, { rz:Math.PI / 2, gloss:.55 });
  }
  A.put(1.03, 2.29, .02, 1.56, .05, 1.16, K.steelD, { hard:true, gloss:.48 });
  // Two decks. The glowing panel is what the light is; the amber glass in front of it is what
  // makes it a door. Both are needed — the panel alone is a lightbox, the glass alone is a window
  // onto a dark box — and the loaves sit between them so they are lit from behind.
  //
  // Every layer of this stands *proud of* the body's front face at a = 1.02, in the order it is
  // seen from: panel, bread, glass, frame, handle. Built the other way round, at a smaller `a`,
  // the whole assembly is inside a solid box and the oven is a blank steel slab — which is what
  // it was, along with the trays cooling on top of it.
  const ovenGlow=[], ovenIndicators=[];
  for (const yy of [1.47, 2.09]) {
    const heat=A.put(1.030, 2.29, .020, 1.36, .46, yy, C('#a85c1f'),
      { hard:true, mode:1, glow:.15 });
    A.dynamicVisual(heat); ovenGlow.push({p:heat,phase:yy*1.9});
    A.put(1.052, 2.29, .022, 1.30, .018, yy - .185, K.steelD, { hard:true, gloss:.30 });  // deck
    for (let i = 0; i < 5; i++)
      A.cap(1.046, 2.29 - .52 + i * .26, yy - .120 + (i % 2) * .150, .036, .22, .036, K.crustD,
        { rz:Math.PI / 2, mode:7, gloss:.14 });
    A.put(1.090, 2.29, .014, 1.36, .46, yy, C('#6b4a24'),
      { hard:true, mode:1, alpha:.30, gloss:.85 });
    A.put(1.100, 2.29, .014, 1.44, .05, yy + .255, K.steelD, { hard:true, gloss:.50 });
    A.put(1.100, 2.29, .014, 1.44, .05, yy - .255, K.steelD, { hard:true, gloss:.50 });
    for (const s of [-1, 1])
      A.put(1.100, 2.29 + s * .695, .014, .05, .52, yy, K.steelD, { hard:true, gloss:.50 });
    A.cap(1.135, 2.29, yy + .30, .017, .60, .017, K.steel, { rz:Math.PI / 2, gloss:.58 });
  }
  // Controls: a dark strip, four indicators and two dials. A blank steel panel is a fridge.
  A.put(1.04, 2.29, .04, 1.52, .16, 2.42, K.trim, { hard:true, gloss:.38 });
  for (let i = 0; i < 4; i++) {
    const p=A.cyl(1.068, 1.70 + i * .30, 2.45, .020, .012, [K.red, K.gold, K.gold, K.warm][i],
      { rx:Math.PI / 2, mode:1, glow:.16 });
    ovenIndicators.push(A.dynamicVisual(p));
  }
  for (const bb of [2.62, 2.86])
    A.cyl(1.068, bb, 2.40, .034, .022, K.steel, { rx:Math.PI / 2, gloss:.50, ...MS });
  // Extraction hood over the top of it.
  A.put(.76, 2.29, .88, 1.66, .40, 2.76, K.steel, { hard:true, gloss:.42, ...MS });
  A.put(1.18, 2.29, .06, 1.66, .06, 2.59, K.steelD, { hard:true, gloss:.50 });
  // The cooling rack beside it — the mobile trolley of trays a bakery is never without. It stands
  // clear of the oven at b 3.16..3.86, and its top three shelves are above the counter line, so
  // from the aisle you see trays of bread cooling behind the person serving you.
  for (const bb of [3.22, 3.80]) for (const aa of [.42, 1.00])
    A.cap(aa, bb, .89, .020, 1.78, .020, K.steelD, { gloss:.48, ...MS });
  for (const bb of [3.22, 3.80]) for (const aa of [.42, 1.00])
    A.cyl(aa, bb, .035, .040, .070, K.trim, { gloss:.30 });
  for (let i = 0; i < 6; i++) {
    const y = .34 + i * .27;
    trayFlat(.71, 3.51, .62, .60, y);
    if (i >= 2) for (let k = 0; k < 4; k++)
      (k % 2 ? bun : croissant)(.60 + (k % 2) * .20, 3.30 + ((k / 2) | 0) * .40, y + .022,
        [K.crustL, K.crust, K.dough, K.crustD][k]);
  }
  A.stop(.24, 1.22, 1.40, 3.90);

  // ---------------------------------------------------------------- the island
  // What the shop is for. Trays of loose bread at working height, two racks of crates over them,
  // and 1.72 overall: high enough to take the machines behind it out of the eyeline from the
  // door, low enough to see the oven wall over.
  //
  // It runs 3.28 m now rather than 2.42, from b −2.06 to +1.22 — eight trays instead of six, and
  // a west end that reaches past the cash machine. That end is what the extra 86 cm buys: the
  // machine is a 2.40 m charcoal slab at b −2.33..−0.88 and the island's upper rack, loaded, now
  // stands in front of the whole of it up to y 1.86. It could not go further west than −2.06
  // without closing the way through to the chiller, and it could not go east past +1.22 without
  // touching the counter's stone top at +1.39.
  const aI = 2.62, bI = -.42;
  A.put(aI, bI, .58, 2.98, .16, .09, K.trim, { hard:true, gloss:.30 });
  A.put(aI, bI, .70, 3.16, .74, .53, K.carc, { hard:true, gloss:.22, ...MW });
  A.put(aI, bI, .78, 3.28, .06, .93, K.stone,
    { hard:true, gloss:.40, mat:'paving', matScale:.72, matAmt:.28, nrmAmt:.30 });
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const a = 2.42 + r * .40, b = -1.56 + c * .76;
    const gap = r === 1 && c === 1 ? [] : null;
    tray(a, b, .36, .70, .962, '面包');
    for (let k = 0; k < 9; k++) {
      const bb = b - .30 + k * .075, aa = a - .10 + (k % 3) * .10, t = (r * 4 + c + k) % 6;
      if (t === 0) bun(aa, bb, .980, K.crust, 1, gap);
      else if (t === 1) seeded(aa, bb, .980, K.crustL, gap);
      else if (t === 2) croissant(aa, bb, .980, K.crustL, gap);
      else if (t === 3) bun(aa, bb, .980, K.milk, .92, gap);
      else if (t === 4) bun(aa, bb, .980, K.crustD, 1.05, gap);
      else seeded(aa, bb, .980, K.crust, gap);
    }
    if (gap) stockSlot(gap);
  }
  soldCard(2.995, -.80, 1.12);
  for (const bb of [-1.88, 1.04]) for (const aa of [2.34, 2.90])
    A.cap(aa, bb, 1.34, .022, .80, .022, K.steelD, { gloss:.48, ...MS });
  A.put(aI, bI, .46, 3.00, .035, 1.30, K.tim, { hard:true, gloss:.20, ...MW });
  A.put(aI, bI, .40, 3.00, .035, 1.66, K.tim, { hard:true, gloss:.20, ...MW });
  for (let i = 0; i < 4; i++) crate(aI, -1.53 + i * .74, 1.318, 4, .40, .62);
  for (let i = 0; i < 5; i++) {
    const b = -1.62 + i * .60;
    if (i % 2) crate(aI, b, 1.678, 3, .36, .52);
    else for (let k = 0; k < 2; k++)
      baguette(aI - .09 + k * .17, b, 1.678 + k * .008, k ? K.crustD : K.crust, .40);
  }
  // MV-104 · the small, untidy evidence of production. Seven opaque crumbs/flour marks sit in
  // the otherwise unusable seam between the landlord machine (to b 1.25) and oven (from b 1.40),
  // and stop at a 1.414 — 3.6 cm before the clear cross-aisle begins at a 1.45. Their undersides are
  // 2 mm above the quarry-tile top (.042), so the pale flour reads without flickering into it.
  //
  // At the island's oven end, one spent kraft liner occupies the exposed 15 cm ledge after the last
  // bread tray. Its grease mark and lifted corner make it look used rather than like another price
  // card. The liner starts 2 mm over the stone top (.960), and its two details start 2 mm above the
  // liner. All ten pieces are the same retained hard-box signature: one opaque draw, no collider.
  const trace = (a, b, w, d, h, y, color, rz = 0) =>
    A.put(a, b, w, d, h, y, color, { hard:true, mode:7, gloss:.04, rz });
  [
    [1.285, 1.285, .050, .022, K.dough,  -.12],
    [1.340, 1.315, .038, .018, K.dough,   .18],
    [1.395, 1.355, .026, .014, K.icing,  -.20],
    [1.300, 1.360, .022, .016, K.crustL,  .24],
    [1.355, 1.270, .016, .014, K.crustD, -.16],
    [1.405, 1.310, .018, .012, K.crust,   .11],
    [1.370, 1.380, .014, .012, K.crustD, -.28],
  ].forEach(([a, b, w, d, color, rz]) => trace(a, b, w, d, .006, .047, color, rz));
  trace(2.500, 1.145, .240, .100, .006, .965, K.kraft,  -.07); // the used liner
  trace(2.455, 1.143, .072, .030, .004, .972, K.crustD,  .10); // baked-on grease
  trace(2.590, 1.178, .070, .018, .012, .976, K.paper,  -.18); // lifted corner
  // Tongs and a jar at each end, because that is how you are meant to shop here: you pick up a
  // tray at the door, and there has to be a pair within reach of wherever you stop along the run.
  //
  // Both pairs wear 夹子, the middle station of the tray flow, for the same reason the tray stand
  // wears 托盘 — a word with nothing wearing it cannot be pointed at.
  for (const [bb, s] of [[1.04, 1], [-1.82, -1]]) {
    A.cyl(2.88, bb, 1.055, .075, .19, K.steelD, { gloss:.48, tag:'夹子', ...MS });
    for (let i = 0; i < 3; i++)
      A.cap(2.88 + (i - 1) * .022, bb + (i - 1) * .020 * s, 1.20, .012, .28, .012, K.steel,
        { rz:(i - 1) * .10, gloss:.58, tag:'夹子' });
  }
  [['现烤面包', '¥6起'], ['牛角包', '¥14'], ['吐司', '¥16'], ['杂粮包', '¥9'], ['小面包', '¥6']]
    .forEach(([n, p], i) => priceBands.push(card(3.020, -1.72 + i * .62, .83, n, p)));
  A.stop(2.23, 3.03, -2.06, 1.22);

  // ---------------------------------------------------------------- the price board
  // Hung over the cross aisle rather than over the counter, because this is the one place in the
  // room where something can be read from the doorway without standing in front of a machine
  // somebody else is trying to use — and because it takes the last of the top off the two of them.
  for (const bb of [-1.62, 1.00])
    A.cap(2.10, bb, 3.08, .012, .92, .012, K.steelD, { gloss:.48, ...MS });
  A.put(2.10, -.31, .07, 3.02, .50, 2.37, K.carc, { hard:true, gloss:.20, ...MW });
  A.put(2.14, -.31, .015, 2.92, .42, 2.37, C('#3b2c1e'), { hard:true, gloss:.24 });
  A.put(2.14, -.31, .015, 3.02, .022, 2.11, K.gold, { hard:true, mode:1, glow:.14 });
  A.glyph(2.148, -.31, 2.47, '今日现烤', { size:.150, gap:.048, color:K.gold, mode:1, glow:.16 });
  A.glyph(2.148, -.31, 2.26, '面包 · 蛋糕 · 蛋挞 · 月饼',
    { size:.086, gap:.026, color:C('#efe0bc'), mode:1, glow:.10 });

  // ---------------------------------------------------------------- counter, cake case and till
  // The counter is passed a colour already divided down: the shared counter() picks its grain by
  // comparing the colour object against the mall's own two timbers, and a colour built in this
  // file can never be one of them, so it takes the plaster map.
  //
  // Its till lands at b 3.73, its terminal at 3.20 and its card reader at 1.90, all at fixed
  // offsets from the ends it is given, so the cake case is sized to the gap those leave:
  // b 2.10..3.08. It used to be 1.47..2.95 and the card reader stood inside it, in among the egg
  // tarts, which is the sort of thing that only ever shows up in a picture.
  A.counter(2.25, 2.60, 2.30, .90, C('#5a4430'), true);
  // The shell's counter puts its own lit strip and its 收银台 lettering on the face at a - dp/2,
  // which in this frame is the *back* of the counter — depth runs outward, so both are inside the
  // joinery and neither has ever been visible in any shop in the building. Reported, not patched:
  // it is shared millwork. These two are this shop's own, on the front.
  A.put(2.712, 2.60, .03, 2.00, .05, .62, K.warm, { hard:true, mode:1, glow:.16 });
  A.glyph(2.716, 3.30, .74, '收银台', { size:.105, gap:.032, color:K.gold, mode:1, glow:.12 });
  // The case. Warm white inside, near-clear glass, one warm strip under the canopy. It was a
  // dark blue-grey box behind a blue emissive pane at alpha .30, which is a 30% blue veil over
  // everything in it: the cakes went grey, the tarts went grey, and the whole right-hand third of
  // the shop read as an aquarium.
  A.put(2.24, 2.59, .76, .98, .06, 1.01, K.steelD, { hard:true, gloss:.46, tag:'蛋糕', ...MS });
  A.put(1.88, 2.59, .04, .98, .58, 1.33, K.stone, { hard:true, gloss:.24, tag:'蛋糕' });
  A.put(2.24, 2.59, .74, .96, .018, 1.045, K.stone, { hard:true, gloss:.28, tag:'蛋糕' });
  // Bottom shelf: two ranks of egg tarts, a whole cake and the mooncakes. Four tarts and one cake
  // in a 0.74 × 0.96 case is a museum vitrine — the thing that reads as a patisserie counter is
  // that the shelf is *full* and every rank is a different height.
  for (let i = 0; i < 4; i++) tart(2.05, 2.18 + i * .17, 1.055);
  const caseGap = [];
  for (let i = 0; i < 4; i++) tart(2.18, 2.18 + i * .17, 1.055, caseGap);
  stockSlot(caseGap);
  soldCard(2.700, 2.435, 1.15);
  for (let i = 0; i < 3; i++)
    mooncake(2.31, 2.22 + i * .17, 1.055, [K.crust, K.crustD, K.crustL][i]);
  cake(2.44, 2.92, 1.055, K.berry);
  A.put(2.23, 2.59, .70, .94, .020, 1.30, K.stone, { hard:true, gloss:.42, tag:'蛋糕' }); // mid
  for (let i = 0; i < 4; i++)
    slice(2.10, 2.20 + i * .17, 1.320, [K.berry, K.matcha, K.choc, K.berry][i]);
  for (let i = 0; i < 3; i++)
    slice(2.28, 2.24 + i * .17, 1.320, [K.choc, K.berry, K.matcha][i]);
  cake(2.44, 2.92, 1.320, K.matcha);
  A.put(2.24, 2.59, .80, 1.02, .06, 1.60, K.steelD, { hard:true, gloss:.46, tag:'蛋糕', ...MS });
  A.put(2.22, 2.59, .68, .90, .020, 1.558, K.warm, { hard:true, mode:1, glow:.13 });
  // Gloss .55 rather than .92 on the three panes. A near-mirror pane seen at the grazing angle you
  // always look along a counter at throws a white sheen over its own contents: from the queue the
  // whole case read as fogged perspex with pastel shapes somewhere behind it. Reported for the
  // shared glazing, dialled back here — the cakes are the reason this fixture exists.
  A.put(2.625, 2.59, .014, .98, .54, 1.31, K.glass, { hard:true, mode:1, alpha:.11, gloss:.55 });
  for (const s of [-1, 1])
    A.put(2.25, 2.59 + s * .49, .72, .014, .54, 1.31, K.glass,
      { hard:true, mode:1, alpha:.11, gloss:.55 });
  [['蛋挞', '¥8'], ['蛋糕', '¥35'], ['月饼', '¥25'], ['蛋糕卷', '¥26']]
    .forEach(([n, p], i) => priceBands.push(card(2.700, 2.16 + i * .30, 1.05, n, p)));
  // Bags and tongs at the near end of the counter, where you pick one up on the way past. The
  // bags are kraft; in the paper white they were, against a dark steel holder, they read as a
  // stack of plates.
  A.put(2.58, 1.62, .22, .34, .26, 1.11, K.tim, { hard:true, gloss:.24, ...MW });
  for (let i = 0; i < 4; i++)
    A.put(2.66 + i * .012, 1.62, .010, .29, .24, 1.13, K.kraft, { hard:true, mode:7 });
  A.cyl(2.62, 1.95, 1.08, .065, .20, K.steelD, { gloss:.48, ...MS });
  for (let i = 0; i < 3; i++)
    A.cap(2.62 + (i - 1) * .022, 1.95 + (i - 1) * .020, 1.23, .012, .28, .012, K.steel,
      { rz:(i - 1) * .10, gloss:.58 });
  // 月饼礼盒 on the counter, either side of the case. The fifth thing this shop sells had no
  // physical presence in it at all: you could buy a mooncake off the till's list and there was
  // nothing anywhere in the room that was one. Boxed at the till is also where they really go —
  // it is the impulse buy the counter exists to put in front of you.
  for (let i = 0; i < 3; i++)
    gift(2.30, 1.60, .98 + i * .132, .28, .28, .13, [K.red, C('#8f2f2a'), K.red][i]);
  for (let i = 0; i < 2; i++)
    gift(2.45, 3.42, .98 + i * .132, .26, .26, .13, [C('#8f2f2a'), K.red][i]);
  priceBands.push(card(2.700, 3.42, 1.05, '月饼', '¥25'));

  // ---------------------------------------------------------------- drinks chiller, left wall
  // Glass-fronted, lit, facing the aisle, where a bakery always puts it: you pick the bread up
  // first and the drink on the way to the till. Pushed back flush to the partition — it stood
  // 20 cm off it, and from the doorway you looked straight down the gap behind it.
  //
  // A carcass of five panels, not one solid box. As one box it was a 70 cm-thick steel slab with
  // three lit shelves, fifteen bottles and a glowing back panel modelled inside it, none of which
  // had ever been drawn: everything at a smaller b than its front face was behind it.
  A.put(2.46, -3.87, 1.36, .06, 1.94, .97, K.steelD,
    { hard:true, gloss:.38, tag:'饮料', ...MS });                                       // back
  for (const s of [-1, 1])                                                             // ends
    A.put(2.46 + s * .65, -3.55, .06, .70, 1.94, .97, K.steelD,
      { hard:true, gloss:.38, tag:'饮料', ...MS });
  A.put(2.46, -3.55, 1.38, .72, .12, 1.88, K.steelD,
    { hard:true, gloss:.38, tag:'饮料', ...MS });                                        // top
  A.put(2.46, -3.55, 1.38, .72, .30, .15, K.trim, { hard:true, gloss:.30 });            // plinth
  A.put(2.46, -3.83, 1.24, .03, 1.42, 1.04, C('#eef6f8'), { hard:true, mode:1, glow:.09 });
  for (let s = 0; s < 3; s++) {
    const y = .52 + s * .40;
    A.put(2.46, -3.58, 1.22, .50, .022, y, K.steel, { hard:true, gloss:.42, ...MS });
    A.put(2.46, -3.33, 1.22, .012, .020, y + .015, K.warm, { hard:true, mode:1, glow:.13 });
    for (let i = 0; i < 5; i++) {
      const a = 1.94 + i * .26;
      for (let j = 0; j < 2; j++) {
        const bb = -3.68 + j * .22;
        A.cyl(a, bb, y + .105, .038, .19,
          [K.matcha, K.berry, K.crustL, K.glass, K.dough][(i + s + j) % 5], { gloss:.52 });
        A.cyl(a, bb, y + .218, .018, .04, K.red, { gloss:.48 });
      }
    }
  }
  A.put(2.46, -3.24, 1.24, .02, 1.44, 1.03, K.glass, { hard:true, mode:1, alpha:.12, gloss:.55 });
  A.put(2.46, -3.55, 1.38, .72, .18, 2.03, K.trim, { hard:true, gloss:.32 });
  A.glyph(3.155, -3.55, 2.03, '饮料', { size:.115, gap:.035, color:K.gold, mode:1, glow:.12 });
  A.stop(1.76, 3.16, -3.92, -3.18);

  // ---------------------------------------------------------------- above the chiller, left wall
  // A metre and a quarter of bare partition ran from the top of the chiller to the valance, and it
  // is in shot from the doorway and from the whole left half of the room. Two shelves of stock on
  // a back panel: what a bakery keeps above head height, where the sacks and the spare crates go.
  //
  // The panel also has a job. The shell hangs a lit accent-colour graphic on each partition at
  // a 1.63..2.97, y 1.40..2.70, and this tenant's accent is `col.yellow` — so the part of it that
  // clears the chiller was a 60 cm band of glowing olive, which is the single most saturated thing
  // in a room whose whole palette is crust and timber. Covered, not modified: it is the shell's.
  A.put(2.30, -3.78, 1.44, .02, .84, 2.53, K.carc, { hard:true, gloss:.16, ...MW });
  for (const y of [2.40, 2.80]) {
    A.put(2.30, -3.61, 1.32, .32, .04, y, K.tim, { hard:true, gloss:.20, ...MW });
    for (const aa of [1.76, 2.84])
      A.put(aa, -3.66, .05, .22, .15, y - .095, K.carc, { hard:true, gloss:.18, ...MW });
  }
  for (const aa of [1.82, 2.30, 2.78]) crate(aa, -3.61, 2.42, 3, .28, .28);
  sack(1.86, -3.62, 2.82);
  for (let i = 0; i < 2; i++) gift(2.36, -3.62, 2.82 + i * .132, .26, .26, .13, K.red);
  A.cyl(2.84, -3.68, 2.92, .080, .20, K.steelD, { gloss:.42, ...MS });
  A.cyl(2.84, -3.52, 2.89, .066, .14, K.steel,  { gloss:.42, ...MS });

  // ---------------------------------------------------------------- trays and tongs, at the door
  // Moved to the left-hand corner of the shopfront. It used to stand at a 3.10..3.64, b −2.46..
  // −1.60 — straight out in front of the island's west end, leaving a 39 cm slot as the only way
  // through to the chiller and the left half of the shop. Against the partition it is the first
  // thing on your left as you come in, which is where a self-service bakery puts its trays anyway,
  // and the whole 2.4 m from the island to the chiller is now open floor.
  //
  // The stand, the trays and the jar of tongs on it wear 托盘 rather than the shop's own tag, so
  // that the first station of the tray flow is something the cursor can actually land on — see the
  // note beside the queue marks below for why a word that tags nothing is a word nobody can pick.
  A.put(3.42, -3.48, .44, .70, .84, .44, K.carc, { hard:true, gloss:.22, tag:'托盘', ...MW });
  A.put(3.42, -3.48, .48, .74, .05, .885, K.stone, { hard:true, gloss:.40, tag:'托盘' });
  for (let i = 0; i < 7; i++)
    trayFlat(3.42, -3.56, .38, .48, .915 + i * .028);
  A.cyl(3.42, -3.20, 1.02, .080, .21, K.steelD, { gloss:.48, tag:'托盘', ...MS });
  for (let i = 0; i < 3; i++)
    A.cap(3.42 + (i - 1) * .025, -3.20 + (i - 1) * .022, 1.19, .012, .30, .012, K.steel,
      { rz:(i - 1) * .12, gloss:.58, tag:'托盘' });
  A.glyph(3.665, -3.48, .70, '请自取',
    { size:.070, gap:.022, color:K.gold, mode:1, glow:.10, tag:'托盘' });
  A.stop(3.16, 3.68, -3.88, -3.08);

  // ---------------------------------------------------------------- the window
  // Two bays, each 2.20 m of frontage by 1.05 m deep by 2.7 m of glass, and the only part of this
  // shop most people in the building will ever look at. It was the weakest thing in the unit: the
  // shell's own default dressing is two stone plinths a side with three small buns on each, and
  // from four metres out in the concourse that is four pale specks at knee height under two and a
  // half empty metres of glass. A window that shows nothing says the shop is shut.
  //
  // The geometry it has to be built into, all of it the shell's and none of it movable:
  //
  //   platform  a 3.655..4.705, top at y 0.34, b (m ± 1.10)
  //   plinths   a 3.96..4.40, b m ± 0.55, top at y 0.69, three buns on each
  //   riser     a 4.71..4.85, up to y 0.42 — so anything below that is not visible from outside
  //   glazing   a 4.7575..4.8025, mullions every 1.25 m, corner posts at the bay ends
  //   downlight a 4.50, y 3.30, running the length of the bay
  //
  // So the dressing works in the two 30 cm bands the plinths leave — a tall tiered stand across
  // the back, a low run of crates across the front — and then fills the vertical, which is where
  // the whole problem was: a shelf tower behind each plinth, a stack of 月饼礼盒 in the middle
  // where the plinths leave a 66 cm gap, and pendants and a hanging card in the top third. Nothing
  // is closer to the glass than 6 cm and nothing stands over the mullions.
  for (const s of [-1, 1]) {
    const m = s * 2.75;
    // ---- the back band, a 3.66..3.94: a plinth the full width of the bay, and two shelf towers
    // standing on it. The towers are what put goods at eye height from four metres out, and their
    // posts sit at b m ± .26 and ± .94 — clear of the mullion, which lands on the bay's centre.
    A.put(3.80, m, .28, 2.12, .58, .63, K.carc, { hard:true, gloss:.20, ...MW });
    A.put(3.80, m, .32, 2.16, .04, .94, K.tim, { hard:true, gloss:.22, ...MW });
    crate(3.80, m, .96, 3, .26, .48);
    for (const q of [-1, 1]) {
      const bb = m + q * .60;
      for (const pb of [bb - .34, bb + .34])
        A.cap(3.80, pb, 1.46, .020, .50, .020, K.steelD, { gloss:.48, ...MS });
      crate(3.80, bb, .96, 3, .26, .62);
      for (let r = 0; r < 2; r++) {
        const y = 1.32 + r * .42;
        A.put(3.80, bb, .30, .74, .036, y, K.tim, { hard:true, gloss:.22, ...MW });
        A.put(3.955, bb, .012, .68, .014, y - .026, K.warm, { hard:true, mode:1, glow:.14 });
        if (r === 0) crate(3.80, bb, y + .018, 3, .26, .62);
        // Stacked into the depth, not spread along the shelf: a baguette lies along `b`, so three
        // of them spaced along `b` would each hang 4 cm over both ends of a 74 cm shelf.
        else for (let k = 0; k < 3; k++)
          baguette(3.71 + k * .09, bb + (k - 1) * .04, y + .018 + k * .006,
            [K.crust, K.crustD, K.crustL][k], .28);
      }
    }
    // ---- the middle band, a 3.96..4.40: the 66 cm the shell's two plinths leave between them,
    // which is exactly a stack of gift boxes, and the two 33 cm strips at the bay ends.
    A.put(4.18, m, .40, .60, .16, .42, K.carc, { hard:true, gloss:.20, ...MW });
    for (let i = 0; i < 3; i++)
      gift(4.18, m + (i % 2 ? .07 : -.07), .50 + i * .135, .30, .30, .135,
        [K.red, C('#8f2f2a'), K.red][i]);
    for (const q of [-1, 1]) {
      const bb = m + q * .94;
      A.put(4.18, bb, .36, .30, .14, .41, K.carc, { hard:true, gloss:.20, ...MW });
      crate(4.18, bb, .48, 3, .32, .28);
    }
    // ---- the front band, a 4.43..4.69: a low run of open crates, the loose bread you see first.
    // 6.7 cm clear of the glass at 4.7575, and 8 cm proud of the stall riser, which is what hides
    // anything lower than 0.42 from the concourse.
    A.put(4.56, m, .26, 2.10, .16, .42, K.carc, { hard:true, gloss:.20, ...MW });
    for (let i = 0; i < 4; i++) crate(4.56, m - .78 + i * .52, .50, 3, .24, .46);
    // ---- and the top third, which is what the bays were missing entirely. Three pendants and a
    // hung card, all of it above 1.9 so it reads over the goods rather than among them.
    for (let i = 0; i < 3; i++) {
      const bb = m - .74 + i * .74;
      A.cap(4.20, bb, 2.87, .006, .70, .006, K.trim, { gloss:.40 });
      A.taper(4.20, bb, 2.06, .17, .13, .17, K.trim, { gloss:.35 });
      A.cyl(4.20, bb, 2.004, .070, .030, K.warm, { mode:1, glow:.26 });
    }
    A.cap(4.00, m, 2.92, .006, .62, .006, K.steelD, { gloss:.48 });
    A.put(4.00, m, .05, 1.30, .32, 2.18, K.carc, { hard:true, gloss:.20, ...MW });
    A.put(4.032, m, .015, 1.20, .24, 2.18, C('#3b2c1e'), { hard:true, gloss:.24 });
    A.glyph(4.042, m, 2.18, s < 0 ? '每日现烤' : '月饼礼盒',
      { size:.105, gap:.034, color:K.gold, mode:1, glow:.16 });
    // Vinyl on the outside of the glass, at a 4.84 — clear of the panes at 4.8025, of the mullions
    // at 4.8125 and of the corner posts at 4.815, and under the fascia, which starts at y 3.79.
    A.glyph(4.840, m, 2.36, s < 0 ? '新鲜出炉' : '现烤面包',
      { size:.155, gap:.050, color:K.goldW, mode:1, glow:.13 });
    A.stop(3.66, 4.46, s * 1.62, s * 3.88);
  }

  // ================================================================ the shop as a working day
  //
  // Everything from here to the light is what turns this from a very well dressed photograph into
  // a bakery you can be in at four in the afternoon and know that you are. Five things, and each
  // of them is a fixture plus a line in one motion callback at the end of the section:
  //
  //   1  出炉时间 — the batch clock. A Chinese bakery bakes to a timetable and posts it, and the
  //      whole shop is organised round 刚出炉. Five lamps under the price board, one lit for the
  //      three quarters of an hour after each batch.
  //   2  bread actually leaving the oven. A tray shuttles from the upper deck to the cooling rack
  //      and comes back empty, and the loaves it leaves behind are there until the next run.
  //   3  the till queue, painted on the floor, and a 叫号 board over the cooling rack.
  //   4  称重 — a set of scales with a live readout, because half of what is on that island is
  //      sold by weight and the shop had no way of weighing anything.
  //   5  定做蛋糕 — the custom cake desk in the east corner, and 全场七折 after half eight.
  //
  // ---------------------------------------------------------------- 1 · the batch clock
  // Hung under the price board and above the island's top rack. That gap is 25 cm and it is the
  // only band of air over this aisle that is free, which is worth writing down because it is not
  // obvious in plan: the doorway eye is at y 1.5 and 3.82 m out, so the head rail at the back wall
  // (y 2.44) projects to y 2.06 at this depth and the middle shelf unit (top y 1.90) projects to
  // 1.78. A strip from 1.79 to 2.05 threads exactly between the two and hides neither.
  const BAT = { a:2.12, b:-.31, wid:3.02, h:.26, y:1.92 };
  const BATCH = [7, 10.5, 14, 17, 19.5];
  const BATCH_TXT = ['07:00', '10:30', '14:00', '17:00', '19:30'];
  A.put(BAT.a - .02, BAT.b, .07, BAT.wid, BAT.h, BAT.y, K.carc, { hard:true, gloss:.20, ...MW });
  A.put(BAT.a + .015, BAT.b, .015, BAT.wid - .08, BAT.h - .05, BAT.y, C('#3b2c1e'),
    { hard:true, gloss:.24 });
  A.glyph(BAT.a + .024, BAT.b - 1.42, 1.905, '今日出炉',
    { size:.055, gap:.018, color:K.gold, mode:1, glow:.12 });
  const batchLamps = BATCH_TXT.map((txt, i) => {
    const bb = BAT.b - .54 + i * .49;
    A.glyph(BAT.a + .024, bb, 1.868, txt, { size:.046, gap:.010, color:C('#efe0bc'), mode:1, glow:.06 });
    return A.dynamicVisual(A.cyl(BAT.a + .028, bb, 1.995, .016, .012, K.lampOff,
      { rx:Math.PI / 2, mode:1, glow:.02 }));
  });

  // ---------------------------------------------------------------- 2 · bread out of the oven
  // One tray and six loaves, and they are the only things in this shop that move through space.
  //
  // The route is the one a baker actually walks: out of the upper deck at a 1.18, b 2.29 — 9 cm
  // proud of the door glass at 1.097, so nothing passes through it — across to the cooling
  // trolley at a 0.71, b 3.51 and back. It runs at y 1.75–1.96, which is above the counter's stone
  // top at 0.98 and above the cake case's canopy at 1.63, so from the aisle you watch it over the
  // person serving you. That is the whole point: this is the one shop in the building where the
  // back of house is the front of house.
  //
  // Three carried loaves ride the tray out and three resting loaves take their place on the rack,
  // and the swap is a scale rather than a jump: a prop scaled to zero is invisible, and shrinking
  // one set in while the other shrinks out is the only pop-free hand-off available here. Every
  // mover is bounded once through A.dynamic with a sphere covering the whole route — Build.finish
  // packs cull spheres from the spawn pose, and a tray culled at the oven vanishes halfway across.
  const OV = { a:1.18, b:2.29, y:1.955 }, RK = { a:.71, b:3.51, y:1.750 };
  const MID = [(OV.a + RK.a) / 2, (OV.b + RK.b) / 2, (OV.y + RK.y) / 2], RUN = 1.10;
  const peelTray = A.dynamic(
    A.put(OV.a, OV.b, .30, .48, .020, OV.y, K.steel, { hard:true, gloss:.38, ...MS }),
    MID[0], MID[1], MID[2], RUN);
  const peelRim = A.dynamic(
    A.put(OV.a, OV.b, .30, .020, .034, OV.y + .017, K.steelD, { hard:true, gloss:.46 }),
    MID[0], MID[1], MID[2], RUN);
  // Carried and resting loaves are built as plain soft boxes rather than the file's `baguette`
  // capsules: a capsule needs rz to lie down and rz cannot be expressed by M.trs, which would put
  // three matrix multiplies a frame on each of six props for a shape nobody can tell apart at
  // this distance.
  const LOAF = [.11, .21, .085];
  const carried = [], resting = [];
  for (let i = 0; i < 3; i++) {
    carried.push(A.dynamic(
      A.put(OV.a, OV.b - .14 + i * .14, LOAF[0], LOAF[1], LOAF[2], OV.y + .055,
        [K.crust, K.crustD, K.crustL][i], { round:RND, mode:7, gloss:.13 }),
      MID[0], MID[1], MID[2], RUN));
    resting.push(A.dynamic(
      A.put(RK.a, RK.b - .16 + i * .16, LOAF[0], LOAF[1], LOAF[2], 1.757,
        [K.crustL, K.crust, K.milk][i], { round:RND, mode:7, gloss:.13 }),
      RK.a, RK.b, 1.757, .45));
  }
  const OVW = A.at(OV.a, OV.b), RKW = A.at(RK.a, RK.b);   // both ends, once, in world coordinates

  // ---------------------------------------------------------------- 3 · the queue and the board
  // Painted, not fenced — see the note over MallQueue at the top of js/mall-coffee.js, which is
  // where the kit lives and why. Three places at a 3.05, running back from the till end of the
  // counter at b 3.30. The counter's collider stops at a 2.70, so 3.05 leaves 0.35 for a 0.28 m
  // body; b 1.98 at the tail clears the island, whose collider ends at b 1.22.
  // Tagged 排队 and 号码 rather than 面包店. `pickUnderCursor` resolves a ray to a prop, takes that
  // prop's tag, and hands back the nearest THING wearing the same tag — so a label whose word tags
  // nothing in the room can never be selected by pointing at anything and survives only on being
  // the nearest focus, which in a shop with thirteen words means most of them never surface. The
  // marks and the board are the two fixtures those two words name, so they wear them.
  const QUEUE = MallQueue.marks(A, { a:3.05, b:3.30, db:-.66, n:3, y:.048,
                                     c:C('#8a5a2c'), cHead:K.gold, tag:'排队' });
  // 叫号. On the bare tile above the cooling rack: the extraction hood stops at b 3.12 and the
  // rack's top tray is at 1.71, so b 3.16–3.84 by y 2.09–2.51 is the one clear rectangle of
  // splashback in this half of the shop. It is read from the till rather than from the door — the
  // doorway cone is ±2.8 m at the back wall and this is at 3.50 — which is correct, because it is
  // the till's board and you only care about it once you have ordered a cake.
  const CALL = MallQueue.board(A, {
    a:.47, b:3.50, y:2.30, digits:3, size:.14,
    on:K.ledOn, off:K.ledOff, lamp:K.ledLamp, body:K.trim, tag:'号码',
    title:'取货叫号', titleColor:K.gold });

  // ---------------------------------------------------------------- 4 · 称重, sold by weight
  // 散装 — loose goods weighed at the counter — is how most of the island's stock is really sold
  // here, and the shop had no scales anywhere in it. A platform, an upright with a readout facing
  // the customer, and a tray of pastries waiting on it.
  //
  // a 1.98 is the staff edge of a counter running 1.80–2.70, which is where a set of scales lives.
  // The readout is a bare MallQueue board: three digits, no housing and no lamp, because a set of
  // scales is a machine with numbers on it rather than a sign.
  A.put(1.98, 1.62, .22, .28, .050, 1.005, K.steelD, { hard:true, gloss:.52, ...MS });
  A.put(1.98, 1.62, .19, .25, .012, 1.036, K.steel, { hard:true, gloss:.56, ...MS });   // the pan
  A.put(1.90, 1.62, .05, .09, .150, 1.105, K.steelD, { hard:true, gloss:.50 });         // upright
  A.put(2.02, 1.62, .05, .34, .120, 1.150, K.trim, { hard:true, gloss:.40 });           // head
  A.put(2.045, 1.62, .012, .30, .088, 1.150, C('#0b0e11'), { hard:true, gloss:.14 });
  const SCALE = MallQueue.board(A, {
    a:1.999, b:1.62, y:1.195, digits:3, size:.042, bare:true,
    on:K.ledOn, off:K.ledOff, lamp:K.ledLamp, body:K.trim, tag:'面包店' });
  const servicePower=A.powerDisplay
    ?A.powerDisplay([CALL.segs,CALL.lamp,SCALE.segs],{id:'call-and-scale'}):{active:true};
  A.glyph(2.052, 1.62, 1.104, '克', { size:.030, color:K.gold, mode:1, glow:.08 });
  // What is on the pan, and the card that says what it costs. 散装 goods are priced by 500 g here,
  // which is 一斤 — the unit anybody actually shopping in this city quotes.
  for (let i = 0; i < 4; i++)
    bun(1.94 + (i % 2) * .09, 1.55 + ((i / 2) | 0) * .13, 1.042,
      [K.crust, K.crustL, K.crustD, K.milk][i], .86);
  priceBands.push(card(2.700, 1.62, 1.05, '散装', '¥26/斤'));

  // ---------------------------------------------------------------- 5 · 定做蛋糕, and the markdown
  // The custom-cake desk, in the east corner between the counter and the window platform. It is
  // the last square metre of this unit that has nothing in it: the counter's collider stops at
  // b 3.75, the shell's window platform starts at a 3.655 and its corner post at b 3.945, so a
  // 0.36 by 0.20 cabinet at a 3.42, b 3.82 fits with the collider merged into the window's so no
  // 6 cm slot is left for a body to get wedged into.
  //
  // Its sign runs *vertically*. Text in this frame can only be written on a plane of constant `a`,
  // so a sign facing down the shop has to be a narrow blade with the characters stacked — which is
  // also exactly what a 定做 sign in a Chinese bakery is.
  A.put(3.42, 3.82, .36, .20, .14, .07, K.trim, { hard:true, gloss:.30 });
  A.put(3.42, 3.82, .34, .18, .74, .51, K.carc, { hard:true, gloss:.22, ...MW });
  A.put(3.42, 3.82, .38, .22, .05, .905, K.stone, { hard:true, gloss:.40 });
  // Two sample cakes under domes, numbered the way a cake catalogue numbers them.
  for (let i = 0; i < 2; i++) {
    const aa = 3.32 + i * .19;
    cake(aa, 3.82, .932, i ? K.matcha : K.berry);
    A.cyl(aa, 3.82, 1.055, .132, .19, K.glass, { mode:1, alpha:.14, gloss:.90 });
    A.ball(aa, 3.82, 1.155, .134, .062, .134, K.glass, { mode:1, alpha:.14, gloss:.90 });
  }
  // The order pad and pen, and the slip dispenser — the shared MallQueue fixture, hung on the
  // blade rather than standing on the floor, so it brings no collider of its own.
  A.put(3.56, 3.82, .16, .17, .020, .925, K.paper, { hard:true, mode:7, gloss:.06, ry:.22 });
  A.cap(3.56, 3.82, .944, .006, .12, .006, K.trim, { rz:Math.PI / 2, ry:.9, gloss:.44 });
  A.put(3.62, 3.82, .05, .22, .96, 1.62, K.carc, { hard:true, gloss:.20, ...MW });
  A.put(3.648, 3.82, .015, .17, .90, 1.62, C('#3b2c1e'), { hard:true, gloss:.24 });
  A.glyph(3.658, 3.82, 1.78, '定做蛋糕',
    { size:.078, gap:.030, color:K.gold, mode:1, glow:.14, vertical:true });
  A.glyph(3.658, 3.82, 1.30, '提前一天',
    { size:.052, gap:.020, color:C('#efe0bc'), mode:1, glow:.07, vertical:true });
  MallQueue.ticket(A, { a:3.652, b:3.82, y:1.03, h:.26, w:.17,
    body:K.trim, face:C('#2a2018'), ink:K.paper, warm:K.gold, tag:'面包店', label:'订单' });
  A.stop(3.24, 3.68, 3.70, 3.94);

  // ---- the two counter-face bands: what the desk sells, and what happens at half eight. Both go
  // on the customer face at a 2.712, in the 0.20 m between the shell's own lit strip (y up to
  // .645) and the underside of the stone top at .90. Nothing east of b 3.15, because the shell's
  // 收银台 lettering stands there.
  const faceBand = (bb, wid, base, edge) => {
    A.put(2.712, bb, .014, wid, .20, .795, base, { hard:true, gloss:.16 });
    A.put(2.718, bb, .008, wid - .05, .16, .795, edge, { hard:true, mode:7, gloss:.10 });
  };
  faceBand(2.02, .84, C('#3b2c1e'), C('#2b2016'));
  A.glyph(2.726, 2.02, .845, '定做蛋糕', { size:.046, gap:.016, color:K.gold, mode:1, glow:.10 });
  A.glyph(2.726, 2.02, .752, '六寸 八寸 十寸',
    { size:.030, gap:.010, color:C('#efe0bc'), mode:1, glow:.05 });
  faceBand(2.86, .62, K.red, K.cutD);
  A.glyph(2.726, 2.86, .845, '晚八点半', { size:.036, gap:.012, color:K.gold, mode:1, glow:.10 });
  A.glyph(2.726, 2.86, .756, '全场七折', { size:.036, gap:.012, color:K.goldW, mode:1, glow:.08 });
  const cutLamp = A.dynamicVisual(
    A.cyl(2.730, 2.86, .700, .014, .012, K.lampOff, { rx:Math.PI / 2, mode:1, glow:.02 }));

  // ---------------------------------------------------------------- the shop, running
  // One callback for all five, culled by the mall at 20 m from the middle of this unit. Everything
  // that can be compared before it is written is: the batch lamps and the markdown only touch
  // geometry on the frame the hour actually crosses a boundary, and `CALL.set` and `SCALE.set`
  // both return early when the number has not moved. What is left per frame is seven matrices for
  // the tray run, which is the cost of the one thing here that is genuinely continuous.
  A.motion('batch', (t, state, player, minutes) => {
    // ---- 1 · which batch is out. `minutes` is the game clock, so this is the shop's day and not
    // the frame clock: standing here at ten past seven in the morning, the first lamp is lit.
    const dayMinute = ((typeof minutes === 'number' ? minutes : 720) % 1440 + 1440) % 1440;
    const h = dayMinute / 60;
    let idx = -1, since = 99;
    for (let i = 0; i < BATCH.length; i++) {
      const d = h - BATCH[i];
      if (d >= 0 && d < since) { since = d; idx = i; }
    }
    const live = since < .75 ? idx : -1;
    if (live !== state.lamp) {
      state.lamp = live;
      for (let i = 0; i < batchLamps.length; i++) {
        const on = i === live;
        batchLamps[i].color = on ? K.lampOn : K.lampOff;
        batchLamps[i].glow = on ? .28 : .02;
      }
    }
    // ---- stock depletion. Three authored bays represent three gaps among the twelve displays a
    // customer reads from the door. They empty at 18:00, 19:30 and 21:00; at 14:00 all matrices
    // are restored, while at 21:00 the wall, island and case each have one unmistakable hole.
    // Only threshold crossings write matrices. Hero cakes and the oven batch stay outside this set.
    const stockGaps = dayMinute < 18 * 60 ? 0
      : Math.min(dayStock.length, 1 + Math.floor((dayMinute - 18 * 60) / 90));
    if (stockGaps !== state.stockGaps) {
      for (let i = 0; i < dayStock.length; i++) showStock(dayStock[i], i >= stockGaps);
      for (let i = 0; i < soldCards.length; i++) showStock(soldCards[i], i < stockGaps);
      state.stockGaps = stockGaps;
    }
    // ---- 5 · the markdown. Half eight until close, and again before the first batch, when what
    // is on the shelf is yesterday's. Eleven tickets and one lamp, written once per crossing.
    const cut = h >= 20.5 || h < 6.5;
    if (cut !== state.cut) {
      state.cut = cut;
      for (const p of priceBands) { p.color = cut ? K.cut : K.red; p.glow = cut ? .16 : .02; }
      cutLamp.color = cut ? K.cut : K.lampOff;
      cutLamp.glow = cut ? .24 : .02;
    }
    // ---- 3 · the collection number, and 4 · the scales, both on slow cycles of their own.
    if(servicePower.active) {
      CALL.set(24 + Math.floor(t / 41) % 46);
      SCALE.set([245, 380, 126, 512, 308, 197][Math.floor(t / 7) % 6]);
      CALL.flash(t % 41 < 3.5 && Math.sin(t * 6.1) > 0 ? 1 : 0);
    }
    state.displayPower=servicePower.active?'on':'off';
    // ---- 2 · the tray, and the one rule that governs it: it only moves while a batch is out.
    //
    // This used to be an unconditional 26 s loop, so a tray shuttled from the oven to the cooling
    // rack and back at four in the morning and at closing time, for ever, at seven matrices a
    // frame for anybody within 20 m. That is a permanently ticking rig, and it is also wrong about
    // the shop: 出炉 is an event, and a bakery whose oven is always producing has no 刚出炉.
    //
    // So it runs inside the same 45-minute window §1 lights a lamp for — five windows in a fifteen
    // hour day, so about a quarter of opening hours — and outside it the whole rig is parked with
    // ONE write, on the frame the window closes, and then costs nothing but the `state.running`
    // comparison until the next batch. `far` is 16 rather than 20 for the same reason: the unit's
    // middle is 21 m from the atrium, so this is now silent from the fountain.
    if (live >= 0) {
      const u = t % 26, ease = q => q * q * (3 - 2 * q);
      let k = 0;                                   // 0 at the oven, 1 at the rack
      if (u < 6) k = 0;
      else if (u < 13) k = ease((u - 6) / 7);
      else if (u < 20) k = 1;
      else k = 1 - ease((u - 20) / 6);
      const x = OVW[0] + (RKW[0] - OVW[0]) * k;
      const z = OVW[1] + (RKW[1] - OVW[1]) * k;
      const y = A.y0 + OV.y + (RK.y - OV.y) * k;
      peelTray.m = M.trs(x, y, z, 0, .48, .020, .30);
      peelRim.m = M.trs(x, y + .017, z, 0, .020, .034, .30);
      // The hand-off, over the second between 13 and 14: one set shrinks out as the other grows in.
      const hand = u < 13 ? 0 : u < 14 ? (u - 13) : u < 24 ? 1 : u < 25 ? 1 - (u - 24) : 0;
      const sc = 1 - hand, sr = hand;
      for (let i = 0; i < 3; i++) {
        // The carried loaves keep their spacing along the frontage the whole way across; on this
        // wall the shop's b maps onto world x, which is why the offset is added to x and not z.
        peelSet(carried[i], x + (-.14 + i * .14), y + .055, z, sc);
        peelSet(resting[i], RKW[0] + (-.16 + i * .16), A.y0 + 1.757, RKW[1], sr);
      }
      state.k = k; state.running = 1;
    } else if (state.running !== 0) {
      // Parked: the tray back in the oven mouth, nothing on it, and the rack carrying the last
      // batch. Written once per closing window, never per frame.
      state.running = 0; state.k = 0;
      peelTray.m = M.trs(OVW[0], A.y0 + OV.y, OVW[1], 0, .48, .020, .30);
      peelRim.m = M.trs(OVW[0], A.y0 + OV.y + .017, OVW[1], 0, .020, .034, .30);
      for (let i = 0; i < 3; i++) {
        peelSet(carried[i], OVW[0], A.y0 + OV.y + .055, OVW[1], 0);
        peelSet(resting[i], RKW[0] + (-.16 + i * .16), A.y0 + 1.757, RKW[1], 1);
      }
    }
    state.cut = cut; state.serving = CALL.value(); state.queue = QUEUE.length;
    state.stockCards = stockGaps; state.stockFraction = +(stockGaps / 12).toFixed(2);
    state.stockHero = 1;
  }, { far:16 });
  // Scaling a prop to zero is how a loaf leaves: it is one matrix, it batches with everything
  // else, and unlike `alpha` it does not drop the prop out of its instance batch and into the
  // renderer's loose transparent pass.
  function peelSet(p, x, y, z, s) {
    p.m = M.trs(x, y, z, 0, LOAF[1] * s, LOAF[2] * s, LOAF[0] * s);
  }

  // ---------------------------------------------------------------- light
  // Three pendants over the island, and four real lights: warm and hard over the bread, one for
  // the oven wall, one for the shelving, one over the counter. Eight lights reach the shader and
  // the nearest to the camera win, so standing anywhere in this shop these four are the ones
  // doing the work.
  for (const bb of [-.82, 0, .82]) {
    A.cap(2.62, bb, 3.05, .008, 1.00, .008, K.trim, { gloss:.40 });
    A.taper(2.62, bb, 2.46, .26, .19, .26, K.trim, { gloss:.35 });
    A.cyl(2.62, bb, 2.378, .105, .035, K.warm, { mode:1, glow:.28 });
  }
  A.light(2.62, 0, 2.28, [1.00, 0.90, 0.72], .38, 3.2);
  A.light(1.35, 2.40, 2.10, [1.00, 0.87, 0.66], .32, 2.9);
  A.light(1.05, -3.10, 1.90, [1.00, 0.92, 0.78], .30, 2.6);
  A.light(2.55, 2.90, 2.00, [1.00, 0.91, 0.76], .20, 2.2);

  // Oven heat cycles slowly while the tiny control lamps step through a working sequence.  A
  // faint intermittent curl over the top cooling tray is deliberately less opaque than kitchen
  // steam: fresh bread is hot, not boiling.
  A.steam(.71,3.51,1.78,{n:4,height:.34,spread:.14,alpha:.22,speed:.13,duty:.44,phase:.46});
  A.motion('ovens',(t,state)=>{
    ovenGlow.forEach(o=>{o.p.glow=.135+(.5+.5*Math.sin(t*.38+o.phase))*.035;});
    const step=Math.floor(t*.62)%ovenIndicators.length;
    ovenIndicators.forEach((p,i)=>{p.glow=i===step?.20:.10;});
    state.heatCycle=Math.floor(t*.38)%4;
    state.activeIndicator=step;
  },{far:18});

  // ---------------------------------------------------------------- what there is to say here
  //
  // ---- reach, which is arithmetic rather than taste. `A.th(hz,a,b,…)` hangs the word at (a,b) and
  // puts its focus 1.15 m FURTHER OUT, at a+1.15, and the player may use it from anywhere within
  // `reach` of that focus. For a fixture at the back of the shop that is fine. For anything from
  // about a 2.6 outward it is not: a+1.15 lands inside the shell's window platform (a 3.655..4.705)
  // or inside the shopfront glazing, where there is no floor at all, and the label becomes a word
  // hanging over a piece of furniture that can never be walked up to.
  //
  // So the fixtures near the front get their focus set by hand, onto a square metre this shop's own
  // colliders leave open. The stops that matter, all of them declared above and all of them tested
  // here against a 0.30 m body:
  //
  //   bread wall   a .20–.92   b -3.90..-2.38      oven bank   a .24–1.22  b 1.40..3.90
  //   island       a 2.23–3.03 b -2.06..1.22       counter     a 1.80–2.70 b 1.45..3.75
  //   chiller      a 1.76–3.16 b -3.92..-3.18      tray stand  a 3.16–3.68 b -3.88..-3.08
  //   cake desk    a 3.24–3.68 b 3.70..3.94        window bays a 3.66–4.46 b ±1.62..±3.88
  //
  // plus the shell's own two machines, which hold everything out to a 1.45 across b -2.33..1.25.
  // The consequence worth writing down is that the strip in front of the island is only 0.63 m
  // deep — island front 3.03 to window platform 3.655 — so every focus placed there is at a 3.30
  // to 3.35 and no further out, and the cross aisle at a 1.45..2.23 is reached only through the
  // 1.12 m gap between the chiller and the island's west end.
  const lab = (hz, a, b, zh, en, note, reach, y, fa, fb) => {
    const t = A.th(hz, a, b, zh, en, note, reach, y);
    const p = A.at(fa, fb === undefined ? b : fb);
    t.focus = [p[0], p[1]];
    return t;
  };

  A.th('面包店', 5.15, 0, '刚出炉的面包最香。', 'Bread straight from the oven smells best.',
    '面包 bread + 店 shop.', 2.2, 2.5);
  A.th('面包', 3.05, -.50, '要两个牛角包。', 'Two croissants, please.',
    '面 flour + 包 bun; 牛角包, an ox-horn bun, is a croissant.', 1.7, 1.15);
  A.th('蛋糕', 2.20, 2.59, '这个蛋糕帮我装一下。', 'Could you box this cake for me?',
    '蛋 egg + 糕 cake.', 1.7, 1.35);
  A.th('饮料', 2.60, -3.30, '再要一瓶饮料。', 'And a drink as well.',
    '饮 to drink + 料 stuff; anything in a bottle.', 1.7, 1.30);

  // ---- 托盘 · 夹子 · 收银台 — the three stations of the tray flow, in the order you walk them.
  //
  // This is how a bakery in this city is actually shopped, and every piece of it was already built
  // and none of it was sayable: the stack of trays and the jar of tongs by the door, a pair of tongs
  // at each end of the island, bags at the counter, a till at the end. What follows are the words
  // for the first two stations; the third is the shell's own 收银台, which `A.counter` hangs at
  // (1.95, 2.60) with its focus out at a 3.10, in front of the counter and reachable from the queue.
  //
  // 面包 above is the middle step and it is already a live action — USE_AT.mall's 挑面包 finishes on
  // 夹了两个牛角包, "you put two croissants on the tray" — so the sequence 托盘 → 面包 → 收银台 is
  // walkable today. 托盘 and 夹子 themselves are in neither USE table, so they read and teach and do
  // nothing when used; the two rows that would make them lift and pinch are in the report, not in
  // this file, because js/data.js is not this file's to edit.
  lab('托盘', 3.42, -3.16, '进门先拿个托盘。', 'Take a tray on your way in.',
    '托 to hold up + 盘 tray. The stack is on your left as you come in; the tongs are on the island.',
    1.6, .95, 3.30, -2.72);
  lab('夹子', 2.88, -1.82, '用夹子夹，别用手。', 'Use the tongs — not your hands.',
    '夹 to pinch + 子. One pair at each end of the island, so there is always one within reach.',
    1.5, 1.18, 3.33, -1.82);

  // ---- the working day: the oven, the batch clock, the queue, the number, the markdown, the desk.
  // Each of these is a fixture built in the five sections above, and each was until now a thing you
  // could look at and not name.
  // The oven is watched over the counter from the queue, not from beside it: the staff aisle in
  // front of it is 0.58 m and the whole of it is staff. Focus (3.05, 1.98) is the tail mark of the
  // queue §3 paints — measured, not guessed: (1.85, 1.30), which is where this pointed first, is
  // 0.15 m inside the shell's vending machine and the clamp pushes an arriving body straight back
  // out of it.
  lab('烤箱', 1.10, 2.29, '刚从烤箱里出来的。', 'It has just come out of the oven.',
    '烤 to bake + 箱 box. The tray shuttling across to the cooling rack is a batch coming out.',
    1.9, 1.80, 3.05, 1.98);
  lab('新鲜', 2.14, -.31, '几点出炉？', 'What time does the next batch come out?',
    '新 new + 鲜 fresh. The five times under the price board are the day’s batches; the lit lamp '
    + 'is the one that is still warm.', 1.8, 1.92, 3.35, -.31);
  lab('排队', 3.05, 2.64, '在这儿排队吗？', 'Is this where the queue starts?',
    '排 to line up + 队 a file of people. The painted marks run back from the till.',
    1.7, 1.05, 3.05, 2.64);
  lab('号码', .47, 3.50, '叫到号码就来取。', 'Come and collect it when your number is called.',
    '号 number + 码 code. The board over the cooling rack; a cake ordered at the desk is called on it.',
    1.7, 2.30, 3.05, 3.20);
  lab('打折', 2.712, 2.86, '八点半以后全场七折。', 'Everything is thirty per cent off after half eight.',
    '打折 to discount. 七折 is seventy per cent OF the price, not off it — the arithmetic runs the '
    + 'other way round from English.', 1.6, .80, 3.10, 2.86);
  lab('订单', 3.652, 3.82, '定做蛋糕要提前一天。', 'A made-to-order cake needs a day’s notice.',
    '订 to order + 单 slip. Six, eight or ten inches; you take a slip from the dispenser and write '
    + 'the name on it.', 1.6, 1.30, 3.10, 3.35);
};

// ---------------------------------------------------------------- the shopfront windows
// Food behind very reflective glass turns into pale shapes over a pale room. This pane is clearer
// and slightly softer than the landlord standard, while retaining enough gloss to show that the
// loaves and cake are protected rather than standing in the concourse.
//
// Budget: 27 primitives for the bread bay and 24 for the cake/gift bay, 51 total. All pieces are
// static and deliberately broad enough to read from the entrance; the dense true stock stays in
// the room where its smaller scale is useful.
MallFit['面包店:glass'] = { alpha: .17, gloss: .86 };
MallFit['面包店:win'] = (W, bc, side) => {
  const dark = C('#3f3025'), timber = C('#7e5838'), wicker = C('#9b7040');
  const kraft = C('#bea073'), cream = C('#f0e3c8'), crust = C('#c58d4e');
  const brass = C('#c2a15f');
  const crustD = C('#8d582d'), berry = C('#b95f72'), red = C('#aa3c31');
  const warm = C('#ffe1a2'), glass = C('#dcebed');

  W.put(4.18, bc, .94, 2.06, .045, .363, timber, { hard:true, gloss:.22 });
  W.put(3.80, bc, .070, 1.92, 1.05, 1.45, dark, { hard:true, gloss:.18 });
  W.put(3.842, bc, .012, 1.70, .035, 1.91, warm, { hard:true, mode:1, glow:.09 });

  if (side < 0) {
    // Two brimming bread baskets and a pair of upright baguettes: strong warm silhouettes instead
    // of the shell fallback's six identical buns on equal plinths.
    for (const [off, h] of [[-.42, .24], [.40, .38]]) {
      W.put(4.13, bc + off, .48, .70, h, .39 + h / 2, wicker,
        { hard:true, mode:6, gloss:.18, round:.035 });
      W.put(4.13, bc + off, .52, .74, .035, .407 + h, crustD,
        { hard:true, gloss:.28 });
    }
    const rolls = [
      [-.64, .68], [-.42, .72], [-.20, .67],
      [ .17, .84], [ .40, .88], [ .63, .82],
    ];
    for (const [off, y] of rolls) {
      W.ball(4.20, bc + off, y, .12, .075, .095, crust, { mode:7, gloss:.14 });
      W.put(4.29, bc + off, .012, .075, .014, y + .045, cream,
        { hard:true, mode:7, rz:.20 });
    }
    for (const [off, lean] of [[-.83, -.09], [.84, .08]]) {
      W.cap(3.98, bc + off, 1.145, .065, .58, .065, crust, { rz:lean, gloss:.16 });
      for (const dy of [-.16, 0, .16])
        W.put(4.045, bc + off, .012, .095, .018, 1.145 + dy, cream,
          { hard:true, mode:7, rz:lean + .22 });
    }
  } else {
    // One celebratory cake under a glass cloche and two take-home gift boxes make this bay about
    // occasions, while the opposite bay remains unmistakably the everyday bread display.
    W.cyl(4.13, bc, .430, .30, .08, dark, { gloss:.34 });
    W.cyl(4.13, bc, .510, .075, .16, brass, { gloss:.50 });
    W.cyl(4.13, bc, .600, .37, .035, cream, { gloss:.36 });
    W.cyl(4.13, bc, .655, .29, .11, crustD, { gloss:.18 });
    W.cyl(4.13, bc, .735, .30, .055, cream, { gloss:.24 });
    W.put(4.305, bc, .012, .58, .050, .685, red, { hard:true, mode:7 });
    for (let i = 0; i < 5; i++) {
      const q = (i - 2) * .105;
      W.ball(4.15, bc + q, .790 + (i % 2) * .018, .036, .036, .036, berry,
        { mode:7, gloss:.18 });
    }
    W.ball(4.13, bc, .850, .40, .38, .40, glass, { mode:1, alpha:.18, gloss:.88 });
    W.ball(4.13, bc, 1.205, .055, .055, .055, brass, { gloss:.52 });

    for (const [off, c] of [[-.68, kraft], [.68, red]]) {
      W.put(4.14, bc + off, .34, .42, .34, .545, c,
        { hard:true, mode:7, gloss:.12, round:.025 });
      W.put(4.315, bc + off, .010, .30, .075, .545, cream, { hard:true, mode:7 });
    }
    for (const off of [-.42, .42]) {
      W.ball(4.28, bc + off, .435, .11, .070, .09, crust, { mode:7, gloss:.14 });
      W.put(4.345, bc + off, .010, .070, .014, .480, cream,
        { hard:true, mode:7, rz:.18 });
    }
  }
};

// ---------------------------------------------------------------- the people
//
// Staff and customers, pushed onto the registry js/mall.js declares rather than written into the
// one argument list in game.js — see the note over MallCast at the top of that file.
//
// ---- coordinates, which is the one thing to get wrong. Everything here is in the MALL's world
// x/z, not this shop's (a, b). 面包店 is `shop('N', 14.0, 8.0, …)`: the north run, centred on x 14,
// back wall on the building line at z -18, depth running outward towards the concourse. So
//
//     x = 14.0 + b        z = -18.0 + a
//
// and `face` is a world yaw pointing along (sin, cos), so in this unit 0 looks OUT at the door and
// Math.PI looks at the back wall. A baker faces 0; somebody in the queue faces Math.PI.
//
// ---- the staff aisle, which is 58 cm and is the reason this block was hard.
//
// The oven bank's collider stops at a 1.22 and the counter's begins at a 1.80. A body is a 0.28 m
// radius, so the only line behind that counter a person fits on is a 1.50–1.52, and both members of
// staff stand at 1.51 — one centimetre of clearance at each shoulder. That is not slack authored in
// for comfort; it is what is left, and anything that moves the counter or the oven bank has to keep
//
//     (oven a1 + 0.28) < (counter a0 - 0.28)
//
// true or both of them are pushed out into the shop by the clamp. The queue in front has it easier:
// the marks §3 paints at a 3.05 leave 0.35 to the counter behind and 0.33 to the window platform in
// front, and the third mark is deliberately left empty because a queue with a gap at the back is
// one you can join.
//
// ---- how many. Seven, and the number is a budget rather than a taste.
//
// A figure is the most expensive thing in this building — its own triangles, its own fill, and a
// per-frame pose — and this shop is on the deck that already carries the concourse crowd. So the
// queue is two people on three painted marks rather than a full line, one of the three service
// stations is left unmanned at any moment, and there is exactly one walker. The empty tail mark is
// not a shortfall: a queue you cannot join is a bus stop, and the number waiting is on the board
// over the cooling rack, which costs nothing per person.
//
// ---- rigs. Every explicit `rig` id has to already exist in the fixed 82-rig roster in
// js/cast-catalog.js, which is not this file's to extend, and that roster has no bakery entries at
// all. So the two named staff below take an ambient rig like everybody else here; the two ids this
// file would ask for are in the report.
if (typeof MallCast !== 'undefined') MallCast.push(
  // ---- 面包师. The baker, in the aisle in front of the oven bank, where the tray shuttling out of
  // the upper deck to the cooling rack passes over his shoulder. b 2.30 rather than nearer the
  // ovens' middle: the till block sits at b 3.73 and the cashier behind it, and two 0.28 m bodies
  // need 0.56 m between them before the clamp starts pushing one out of the other. These two are
  // 1.12 m apart.
  { hz:'面包师', name:'周立新', py:'Zhōu Lìxīn', place:'mall', mallFloor:1, temper:'genial',
    look:{ skin:'#d9a97e', hair:'#2a221d', hairStyle:'short', top:'#f2ece0', pants:'#3d4550',
      shoe:'#2b2f34', apron:'#6c5136', collar:'shirt', cap:'#f2ece0', tall:1.03, faceSeed:8831 },
    spots:[{ h0:6, h1:22, at:[16.30, -16.49], face:0, act:'work' }],
    lines:[['这一炉刚出来，还烫。', 'This batch is just out — still hot.'],
           ['下一炉五点，杂粮的。', 'The next batch is at five: the multigrain.'],
           ['散装的称重，一斤二十六。', 'The loose ones are weighed — twenty-six a jin.']] },
  // ---- 收银员, behind the till at the east end of the counter, where the queue arrives.
  { hz:'收银员', name:'唐美玲', py:'Táng Měilíng', place:'mall', mallFloor:1, temper:'brisk',
    look:{ skin:'#efc19b', hair:'#2b2320', hairStyle:'bun', top:'#f1e8d8', pants:'#494049',
      shoe:'#332f32', apron:'#8a5a2c', badge:true, tall:.96, faceSeed:8832 },
    spots:[{ h0:6, h1:22, at:[17.42, -16.49], face:0, act:'vend' }],
    lines:[['托盘放这儿，我给您装袋。', 'Put the tray down here and I will bag it up.'],
           ['定做蛋糕填个单子，明天来取。', 'For a made-to-order cake, fill in a slip and collect it tomorrow.'],
           ['八点半以后全场七折。', 'After half past eight everything is thirty per cent off.']] },

  // ---- the queue. Two of the three marks §3 paints at a 3.05, b 3.30 / 2.64 / 1.98 — world
  // (17.30, -14.95) and (16.64, -14.95). Both face Math.PI, which in this unit is at the counter.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'patient',
    look:{ skin:'#ddb188', hair:'#1f1a17', hairStyle:'bob', top:'#8d6f7e', pants:'#3b4552',
      shoe:'#e0d9cb', bag:'tote', bagColor:'#c1a05e', tall:.99, faceSeed:8833 },
    spots:[{ h0:9, h1:22, at:[17.30, -14.95], face:Math.PI, act:'buy' }] },
  { hz:'顾客', place:'mall', mallFloor:1, temper:'bored',
    look:{ skin:'#e3b58e', hair:'#2d2521', hairStyle:'short', top:'#6a7f6c', pants:'#3d434d',
      shoe:'#2b2f34', collar:'crew', tall:1.02, faceSeed:8834 },
    spots:[{ h0:9, h1:22, at:[16.64, -14.95], face:Math.PI, act:'wait' }] },

  // ---- the tray flow, standing in it. The whole point of §the trays and tongs is that it is a
  // sequence, and a sequence is legible when there is somebody at each step of it.
  //
  // One at the tray stand, which the shop puts against the west partition: the stand's collider is
  // a 3.16–3.68, b -3.88..-3.08, so a body at b -2.72 clears its east end by 10 cm, and at a 3.30
  // it clears the window platform at 3.655 by 7 cm. Facing Math.PI, at the trays.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'brisk',
    look:{ skin:'#e7b78d', hair:'#262019', hairStyle:'ponytail', top:'#b9784c', pants:'#454b56',
      shoe:'#eae3d6', tall:.94, faceSeed:8835 },
    spots:[{ h0:9, h1:22, at:[11.28, -14.70], face:Math.PI, act:'carry' }] },
  // One at the island with the tongs, in the 0.63 m strip between the island front (a 3.03) and the
  // window platform (a 3.655) — a 3.35 is the middle of it, and b -1.82 is the west pair of tongs.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'steady',
    look:{ skin:'#c99168', hair:'#302823', hairStyle:'short', top:'#5d7383', pants:'#343b44',
      shoe:'#272c30', collar:'shirt', tall:1.07, faceSeed:8836 },
    spots:[{ h0:9, h1:22, at:[12.18, -14.65], face:Math.PI, act:'browse' }] },
  // ---- and one walking the whole route, because a shop where nobody arrives or leaves is a
  // tableau. In through the door at b 0, west along the 0.63 m front strip, down the 1.12 m gap
  // between the chiller and the island's west end, east along the cross aisle to the price board,
  // and back out the same way — the east side has no through route at all, because the island's
  // east end (b 1.22) and the counter's west end (b 1.45) leave 0.23 m between them.
  //
  // `mallBlocked` in game.js advances the leg if a route ever does jam, so a bad corner costs a
  // pause rather than a person marching into a plinth for the rest of the day.
  { hz:'顾客', place:'mall', mallFloor:1, temper:'bustling',
    look:{ skin:'#dbaa83', hair:'#29211d', hairStyle:'tousled', top:'#a8543f', pants:'#46566a',
      shoe:'#ece6da', pack:true, packColor:'#3d5a70', tall:1.01, faceSeed:8840 },
    patrol:[[14.00, -11.90], [14.00, -13.90], [13.30, -14.68], [11.90, -14.68], [11.40, -15.40],
            [11.60, -16.15], [13.60, -16.15], [11.60, -16.15], [11.40, -15.40], [13.30, -14.68],
            [14.00, -13.90], [14.00, -11.90]], speed:.98 },
);
