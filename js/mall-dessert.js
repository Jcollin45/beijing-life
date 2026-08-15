// 甜品店 · 半糖甜品 · HALF SUGAR DESSERT — floor 2
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
//   A.put(a,b,da,db,h,y,colour,opt)   a box: extent along a, extent along b, height, centre y
//   A.cyl / A.ball / A.cap / A.taper (a,b,y,...,colour,opt)
//   A.table(a,b[,seats,r])            a table with chairs, collider included
//   A.glyph(a,b,y,text,opt)           characters on a surface; opt.back faces the other way
//   A.stop(a0,a1,b0,b1)               a collider, so the player cannot walk through it
//   A.th(hz,a,b,zh,en,note,reach,y)   an interactable, tagged to this shop
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// ---------------------------------------------------------------------------------------------
// Four decisions govern everything below.
//
// 1. The case is low. A patisserie counter you look *down into* is the whole appeal of the trade,
//    and a 1.9 m case with a canopy — which is what the inline fit and most of this building's
//    joinery build — puts a wall across the room at standing eye height and hides the back wall,
//    the menu and the tea bar behind it. Deck at 0.95, glass to 1.46, a slim light hood to 1.60:
//    from the doorway you see over it to the menu board, and from two paces you see into it.
//
// 2. Everything faces the customer. Depth runs *outward*, so the side of a fitting a customer
//    stands at is the one with the LARGER `a`. Glyphs, price cards, till screens, glow strips and
//    the lit backs of cases all have to be placed accordingly, and the sign of that offset is the
//    single easiest thing to get wrong in this frame — build it the other way round and the shop
//    is a row of blank grey slabs facing its own back wall.
//
// 3. The materials are the building's own. Timber, tile, terrazzo and plaster are quoted here at
//    exactly the numbers js/mall.js uses for MAT.timber, MAT.tile, MAT.slab and MAT.plaster —
//    same map, same scale, same amount. Two reasons, and the second is the surprising one: a
//    cabinet in here is then the same surface as a cabinet next door, *and* it costs nothing,
//    because the instancing key is (mesh, mode, material, scale, amount) and quoting the house
//    numbers drops these boxes into batches the shell has already opened. A private set of
//    material numbers is both a different-looking shop and sixteen extra draw calls.
//
// 4. Light is emitted by very little. A lit surface here is `mode:1` with a small `glow`, and the
//    glow pass is additive: `base * (1 + glow*3)` on screen and `colour * glow*2.6` into the
//    bloom buffer. A three-metre strip at glow .42 — which is what the case lamp used to be —
//    lands as a white bar across the whole shopfront and fogs everything behind the glass. The
//    ceiling fittings the shell hangs run at .28–.34 and they are 16 cm across; nothing in here
//    that is metres long goes above .16.

// A tiny state seam for the made-to-order counter. `begin` is deliberately invisible: no paid or
// completed cake exists yet. Only `complete` materialises collection stock, while collect, cancel
// and reset all advance the revision and leave the pickup surface empty. The object is public for
// the order card and narrow harnesses; its data is plain and can be saved by a host later without
// coupling this fit-out to game.js.
window.DessertSys = window.DessertSys || (() => {
  const state = { custom:null, rev:0, seq:0, last:'' };
  const text = (v, fallback, n=24) => typeof v === 'string' && v.trim()
    ? v.trim().slice(0, n) : fallback;
  const clean = (o={}) => ({
    id:text(o.id, `DG${String(Math.max(1, state.seq)).padStart(3, '0')}`, 12),
    label:text(o.label, '庆祝蛋糕'), flavour:text(o.flavour, '当季'),
    size:text(o.size, '八寸', 8), status:o.status === 'completed' ? 'completed' : 'pending',
  });
  const touch = last => { state.rev++; state.last = last; return state.custom; };
  return {
    state,
    begin(o={}) { state.seq++; state.custom=clean({...o,status:'pending'}); return touch('pending'); },
    complete(o) {
      if (!state.custom) { state.seq++; state.custom=clean(o || {}); }
      else if (o && typeof o === 'object') state.custom=clean({...state.custom,...o});
      state.custom.status='completed'; return touch('completed');
    },
    collect() { const q=state.custom && state.custom.status==='completed' ? {...state.custom} : null;
      state.custom=null; touch('collected'); return q; },
    cancel() { state.custom=null; touch('cancelled'); return true; },
    reset() { state.custom=null; state.seq=0; touch('reset'); },
    visible() { return !!state.custom && state.custom.status==='completed'; },
    toSave() { return {custom:state.custom ? {...state.custom} : null, seq:state.seq|0}; },
    load(o) {
      state.seq=Math.max(0, Math.floor(Number(o && o.seq) || 0));
      state.custom=o && o.custom && typeof o.custom==='object' ? clean(o.custom) : null;
      touch('loaded');
    },
  };
})();

MallFit['甜品店'] = A => {
  // ---- palette. Pastel, warm and dessert-coloured. The greys, timbers and stones are the
  // building's own values so the shop sits inside the mall rather than beside it.
  const P = {
    trim:   C('#2f3236'), ink: C('#33291f'),
    steel:  C('#aeb7bd'), steelD: C('#6e7981'), chrome: C('#d3dade'),
    white:  C('#f8f6f0'), cream: C('#eee2cc'), milk: C('#efdfc0'), plate: C('#f6f2e8'),
    glass:  C('#9fc2d3'), warm: C('#ffeccd'), gold: C('#f3d47b'),
    rose:   C('#e6a2b4'), roseD: C('#bd6a83'), berry: C('#a33e58'),
    mint:   C('#a7ddc9'), taro: C('#c6b0e0'), matcha: C('#a9c46a'),
    mango:  C('#f0b23c'), butter: C('#f2dc9c'), peach: C('#f2bd93'),
    cocoa:  C('#5c3e2c'), pastry: C('#dfb277'), tea: C('#a9713f'), pearl: C('#241a15'),
    screen: C('#15283e'), leaf: C('#5f9257'), leafD: C('#3f6b3d'),
    wood:   C('#5c4635'), woodL: C('#997451'),      // the building's woodD and wood
    stone:  C('#e5decc'), stoneD: C('#cec6b2'),     // its stone and stoneD
    tile:   C('#9dc0b1'), tileD: C('#5c7f72'),      // mint metro tile, and its border course
    // Inside the case. A patisserie deck that is white, on white risers, behind white glass gives
    // you five white cakes on a white shelf: the two rows at the back went to a warm slate, which
    // is what the trade actually uses under a cake and the only reason the icing has an edge.
    slate:  C('#6b635a'), slateD: C('#49443e'),
  };
  // The building's material table, quoted. See note 3 above — these numbers are load-bearing.
  const TIMBER = { mat: 'wood', matScale: .90, matAmt: .30 };
  const TILE   = { mat: 'tile', matScale: .34, matAmt: .30 };
  const SLAB   = { mat: 'paving', matScale: .72, matAmt: .28 };
  const PLAST  = { mat: 'plaster', matScale: .62, matAmt: .12, nrm: null };
  const T = A.tag;                                  // every prop is tagged with the shop's kind
  const TILL = '收银台';                            // and the till is tagged as itself, so it lights

  // Three coherent case bays can empty over the evening without changing the case's draw path.
  // Retained opaque matrices collapse to zero; alpha would eject every cake part from instancing.
  // The crossed cards are also retained mode-1 boxes, sharing the case's existing box batch.
  const dayStock = [], soldCards = [], STOCK_GONE = M.trs(0, -99, 0, 0, 0, 0, 0);
  const keepStock = (parts, p) => { if (parts) parts.push(p); return p; };
  const stockSlot = parts => {
    A.dynamicVisual(parts);
    dayStock.push({ parts, rest:parts.map(p => p.m) });
  };
  const soldCard = (a, b, y) => {
    const parts = [
      A.put(a, b, .010, .18, .12, y, P.roseD, { hard:true, mode:1, glow:.03, tag:T }),
      A.put(a + .007, b, .008, .14, .014, y, P.cream,
        { hard:true, mode:1, glow:.02, rz:.58, tag:T }),
      A.put(a + .007, b, .008, .14, .014, y, P.cream,
        { hard:true, mode:1, glow:.02, rz:-.58, tag:T }),
    ];
    const q = { parts, rest:parts.map(p => p.m) };
    A.dynamicVisual(parts); parts.forEach(p => { p.m = STOCK_GONE; }); soldCards.push(q);
  };
  const showStock = (q, show) => q.parts.forEach((p, i) => { p.m = show ? q.rest[i] : STOCK_GONE; });

  // =============================================================================== the desserts
  // A cake is not a coloured cylinder. Four things make one read at two metres: a plate under it,
  // a band of sponge showing below the icing, something piped round the rim, and one saturated
  // thing on top. Everything in the case is built from these, at 6–12 primitives each, and they
  // are the reason the case is worth walking over to. All of them are plain meshes with no
  // material and no transparency, so however many are put out they cost nothing after batching.

  // A whole gateau on a plate: sponge band, iced sides, a glazed top, cream rosettes, a crown.
  const gateau = (a, b, y, r, sponge, top, parts) => {
    keepStock(parts, A.cyl(a, b, y + .012, r * 1.24, .024, P.plate, { gloss: .55, tag: T }));
    keepStock(parts, A.cyl(a, b, y + .048, r * 1.01, .048, sponge,
      { gloss: .14, tag: T }));                                                   // sponge showing
    keepStock(parts, A.cyl(a, b, y + .106, r, .072, P.cream,
      { gloss: .20, tag: T }));                                                   // iced sides
    keepStock(parts, A.cyl(a, b, y + .148, r * .99, .016, top,
      { gloss: .34, tag: T }));                                                   // mirror glaze
    for (let k = 0; k < 6; k++) {
      const t = k / 6 * Math.PI * 2;
      keepStock(parts, A.ball(a + Math.cos(t) * r * .70, b + Math.sin(t) * r * .70, y + .168,
        .019, .017, .019, P.cream, { mode: 7, tag: T }));
    }
    keepStock(parts, A.ball(a, b, y + .176, .030, .026, .030, top,
      { mode: 7, gloss: .36, tag: T }));
  };

  // A slice on a card: mousse body, a jelly stripe through it, a berry that has rolled off it.
  const slice = (a, b, y, c, top, parts) => {
    keepStock(parts, A.put(a, b, .155, .100, .018, y + .010, P.plate,
      { hard: true, gloss: .50, tag: T }));
    keepStock(parts, A.put(a, b, .136, .084, .088, y + .064, P.cream,
      { round: .012, mode: 7, gloss: .16, tag: T }));
    keepStock(parts, A.put(a, b, .140, .088, .020, y + .062, c,
      { hard: true, mode: 7, tag: T }));
    keepStock(parts, A.put(a, b, .140, .088, .012, y + .106, top,
      { hard: true, mode: 7, gloss: .30, tag: T }));
    keepStock(parts, A.ball(a + .034, b, y + .124, .019, .016, .019, P.berry,
      { mode: 7, gloss: .4, tag: T }));
  };

  // 蛋挞. The shell is a taper stood on its head, because a tart is wide at the top and the mesh
  // is wide at the bottom; `rx` turns it over about the frontage axis, which for this unit is the
  // one that leaves the tart facing the way it started.
  const tart = (a, b, y, c, parts) => {
    keepStock(parts, A.taper(a, b, y + .026, .100, .052, .100, P.pastry,
      { rx: Math.PI, gloss: .16, tag: T }));
    keepStock(parts, A.cyl(a, b, y + .050, .042, .018, c, { gloss: .34, tag: T }));
    keepStock(parts, A.ball(a, b, y + .060, .038, .011, .038, c,
      { mode: 7, gloss: .44, tag: T }));
  };

  // 布丁 in a beaker. The beaker used to be a second, transparent taper over the pudding — and
  // anything see-through is excluded from instancing, so four puddings were four draw calls for
  // a rim you cannot see through anyway once the pudding fills it. One opaque, very glossy shell
  // with the set custard inside reads the same at arm's length and batches with everything else.
  const puddingCup = (a, b, y, c, crown, parts) => {
    keepStock(parts, A.taper(a, b, y + .048, .086, .096, .086, c,
      { rx: Math.PI, gloss: .62, tag: T }));
    keepStock(parts, A.cyl(a, b, y + .098, .040, .012, P.cream, { gloss: .26, tag: T }));
    keepStock(parts, A.ball(a, b, y + .112, .017, .013, .017, crown,
      { mode: 7, gloss: .38, tag: T }));
  };

  // 珍珠奶茶, built once and used on the counter, in the tea bar and on a table: cup, the tea in
  // it, the pearls at the bottom, a domed lid and a fat straw through it. The cup is the one
  // transparent thing worth paying for — a bubble tea with an opaque cup is a paper cup.
  const bubbleTea = (a, b, y, c = P.tea) => {
    A.taper(a, b, y + .085, .098, .170, .098, P.glass,
      { rx: Math.PI, mode: 1, alpha: .22, gloss: .92, tag: T });
    A.taper(a, b, y + .072, .082, .128, .082, c, { rx: Math.PI, gloss: .30, tag: T });
    A.cyl(a, b, y + .022, .036, .036, P.pearl, { gloss: .40, tag: T });
    A.cyl(a, b, y + .176, .052, .016, P.white, { gloss: .35, tag: T });
    A.cyl(a + .012, b, y + .215, .012, .150, P.rose, { gloss: .40, rz: .10, tag: T });
  };

  // A macaron tower: six little discs stacked with a lean, the cheapest thing in the shop that
  // says "patisserie" from four metres.
  const macarons = (a, b, y, cs) => {
    for (let i = 0; i < 6; i++)
      A.cyl(a + Math.sin(i * 1.9) * .010, b + Math.cos(i * 1.9) * .010, y + .020 + i * .034,
        .036, .026, cs[i % cs.length], { gloss: .18, tag: T });
  };

  // ================================================================== a runner under the service
  // The shell lays a cream carpet over the middle of every unit. A band of warm terrazzo in front
  // of the counter says which half of the room is worked in and which half is sat in, and it is
  // the cheapest thing in here that makes the plan legible from the door. Two dark inlay lines
  // give it an edge; without them a change of colour on a floor reads as a stain.
  A.put(3.05, -1.15, 1.55, 6.40, .012, .034, P.stoneD,
    { hard: true, gloss: .44, ...SLAB, tag: T });
  for (const s of [-1, 1])
    A.put(3.05 + s * .765, -1.15, .02, 6.40, .008, .048, P.trim, { hard: true, gloss: .3, tag: T });

  // ================================================================== the chilled case — the hero
  // b -2.55 .. +1.05, a 1.775 .. 2.725. Deck 0.95, glass 1.46, hood 1.60.
  const cA = 2.25, cB = -0.75, cLen = 3.60, cDp = .95;
  const fr = cA + cDp / 2;                        // 2.725 — the customer's face of the case
  const bk = cA - cDp / 2;                        // 1.775 — the staff's

  A.put(cA, cB, cDp - .13, cLen - .10, .16, .09, P.trim, { hard: true, gloss: .30, tag: T });
  A.put(cA, cB, cDp, cLen, .72, .53, P.stone,
    { hard: true, gloss: .34, ...PLAST, tag: T });
  // A band of the tenant's colour across the front of the body, at the height a person's knees
  // are when they lean on the glass. One saturated line is what stops a white case being a fridge.
  A.put(fr + .012, cB, .02, cLen - .06, .26, .68, P.rose, { hard: true, gloss: .42, tag: T });
  A.put(fr + .022, cB, .02, cLen - .06, .020, .818, P.gold, { hard: true, gloss: .55, tag: T });
  // Vertical joints in the casework, so three and a half metres of painted panel is joinery
  // rather than one extruded slab.
  for (const bb of [-1.95, -0.75, 0.45])
    A.put(fr + .008, bb, .02, .016, .70, .53, P.stoneD, { hard: true, gloss: .3, tag: T });
  // The chilled deck. Terrazzo rather than steel, because the cakes stand on it and a mirror
  // finish under them washes the whole tier out.
  A.put(cA, cB, cDp + .05, cLen + .06, .06, .92, P.stoneD,
    { hard: true, gloss: .50, ...SLAB, tag: T });

  // Two stepped risers inside the case, so the back row is a hand higher than the front one and
  // every cake is seen over the one in front of it. A flat deck shows you the first row and the
  // tops of nothing else. Warm slate, with a darker cap: cream risers under cream plates under
  // pastel icing behind pale glass is four near-white values stacked, and at two metres the whole
  // case flattens into a fog with some coloured dots in it.
  A.put(cA - .11, cB, .32, cLen - .30, .12, 1.01, P.slate, { hard: true, gloss: .30, tag: T });
  A.put(cA - .11, cB, .34, cLen - .28, .020, 1.078, P.slateD, { hard: true, gloss: .34, tag: T });
  A.put(cA - .35, cB, .28, cLen - .30, .24, 1.07, P.slate, { hard: true, gloss: .30, tag: T });
  A.put(cA - .35, cB, .30, cLen - .28, .020, 1.198, P.slateD, { hard: true, gloss: .34, tag: T });

  // Tent cards, standing on the front edge of the deck, carrying the two things in this case a
  // customer can actually buy at the till.
  //
  // They are built HERE, before the glass, and that is the whole reason they have writing on
  // them. Characters are quads with an atlas cell, so they are excluded from instancing and are
  // drawn in the unbatched pass — in the order the scene was built. The case glazing is also
  // unbatched, because anything with alpha is, and it still writes depth. Built after the glass
  // these two cards came out as blank white slabs: the box was drawn in the batched pass and so
  // arrived before the pane, but its own price was drawn after it and was rejected by the depth
  // the pane had just written. Anything of this shop's that is lettered and sits behind a piece
  // of glass has to be built before that glass.
  [['布丁', '¥16', -1.75], ['蛋糕卷', '¥26', 0.15]].forEach(([zh, yuan, bb]) => {
    A.put(fr - .175, bb, .014, .23, .105, 1.003, P.white, { hard: true, gloss: .25, tag: T });
    A.put(fr - .183, bb, .010, .23, .014, .955, P.steelD, { hard: true, gloss: .5, tag: T });
    A.glyph(fr - .160, bb, 1.028, zh, { size: .046, gap: .012, color: P.ink, mode: 1, tag: T });
    A.glyph(fr - .160, bb, .977, yuan, { size: .044, gap: .011, color: P.berry, mode: 1, tag: T });
  });
  // Retained sold markers are authored before the glass just like the price cards. At 14:00 their
  // matrices are collapsed; the existing counter callback restores one with each evening gap.
  soldCard(fr - .15, -2.10, 1.05);
  soldCard(fr - .15,  0.40, 1.15);
  soldCard(fr - .15, -1.32, 1.28);

  // Glazing: front, two ends, and a warm back that closes the case off from the staff side. It
  // sits at the SMALLER a, behind the goods. `glow` is zero on purpose: mode 1 is already unlit,
  // so the panel is at full value without emitting, and the bloom pass — which is what turns a
  // large pale surface into the fog that used to sit over this whole shopfront — never sees it.
  A.put(bk + .02, cB, .03, cLen - .04, .52, 1.21, P.cream,
    { hard: true, mode: 1, tag: T });
  A.put(fr - .01, cB, .03, cLen - .04, .50, 1.21, P.glass,
    { hard: true, mode: 1, alpha: .12, gloss: .94, tag: T });
  for (const s of [-1, 1])
    A.put(cA, cB + s * (cLen / 2 - .02), cDp - .05, .03, .50, 1.21, P.glass,
      { hard: true, mode: 1, alpha: .12, gloss: .94, tag: T });
  A.put(cA, cB, cDp - .06, cLen - .04, .025, 1.4525, P.glass,
    { hard: true, mode: 1, alpha: .09, gloss: .9, tag: T });                    // the top pane
  // Slim uprights between the bays, and a capping rail along the top of the front pane.
  for (const bb of [-2.53, -1.35, -0.15, 1.03])
    A.put(fr - .01, bb, .05, .045, .52, 1.21, P.steelD, { hard: true, gloss: .58, tag: T });
  A.put(fr - .012, cB, .06, cLen - .02, .035, 1.484, P.steel, { hard: true, gloss: .62, tag: T });
  // Sliding doors on the staff side: three recessed handles, so the back of the case is a piece
  // of equipment from the tea bar rather than a white wall.
  for (const bb of [-1.90, -0.75, 0.40])
    A.put(bk - .012, bb, .02, .40, .028, 1.30, P.steelD, { hard: true, gloss: .6, tag: T });

  // The hood: a shallow head, and a lit valance on the front of it carrying the shop's line.
  // Kept to 1.60 so it clears nothing and hides nothing.
  A.put(cA, cB, cDp + .08, cLen + .10, .14, 1.53, P.trim, { hard: true, gloss: .34, tag: T });
  // The case lamp is a tube inside the glass at the top of the back, not a strip under the hood:
  // it has to be seen through the front pane, throwing light down the front of the cakes, or the
  // case is lit by a light you cannot see and reads as a cold box. Low, because it is 3.4 m long
  // — see note 4. The light it appears to cast is the A.light below doing the work.
  A.put(1.92, cB, .16, cLen - .20, .045, 1.425, P.warm,
    { hard: true, mode: 1, glow: .11, tag: T });
  // The valance, with a shadow gap over it and a hairline under it. A 3.7 m band of flat colour
  // with nothing at its edges is a strip of plastic; the two 2 cm lines are what make it joinery.
  A.put(fr + .07, cB, .02, cLen + .04, .115, 1.522, P.roseD,
    { hard: true, mode: 1, glow: .05, tag: T });
  A.put(fr + .062, cB, .02, cLen + .04, .022, 1.594, P.trim, { hard: true, gloss: .2, tag: T });
  A.put(fr + .078, cB, .02, cLen + .02, .014, 1.458, P.gold, { hard: true, gloss: .55, tag: T });
  A.glyph(fr + .085, cB, 1.522, '每日现做',
    { size: .080, gap: .032, color: P.white, mode: 1, tag: T });

  // ---- what is in it. Three rows, each on its own step, plus a tiered stand dead centre.
  // Front row on the deck: tarts and puddings alternating, with a gap left in the middle.
  const frontGap = [];
  for (let i = 0; i < 9; i++) {
    const bb = -2.30 + i * .40;
    if (bb > -0.50 && bb < 0.32) continue;                         // the stand stands here
    const gap = i < 2 ? frontGap : null;
    if (i % 2) puddingCup(fr - .27, bb, .95, P.mango, P.berry, gap);
    else tart(fr - .27, bb, .95, P.butter, gap);
  }
  stockSlot(frontGap);
  // A three-tier stand, on the centre line of the room rather than of the case, because that is
  // where the eye goes when you walk in through the middle of the shopfront. The tiers are 14 mm
  // plates 30 cm across — 21:1, well clear of the ratio at which a disc starts shading as though
  // its top face pointed sideways.
  {
    const sa = fr - .28, sb = -.09;
    A.cyl(sa, sb, .955, .062, .020, P.chrome, { gloss: .7, tag: T });
    A.cyl(sa, sb, 1.13, .010, .380, P.chrome, { gloss: .7, tag: T });
    const tiers = [[1.00, .150], [1.15, .120], [1.29, .092]];
    tiers.forEach(([ty, r], k) => {
      A.cyl(sa, sb, ty, r, .014, P.plate, { gloss: .55, tag: T });
      const n = [4, 3, 2][k];
      for (let j = 0; j < n; j++) {
        const t = j / n * Math.PI * 2 + k * .6, rr = r * .58;
        const c = [P.rose, P.matcha, P.taro, P.mango][(j + k) % 4];
        A.ball(sa + Math.cos(t) * rr, sb + Math.sin(t) * rr, ty + .033,
          .028, .026, .028, c, { mode: 7, gloss: .22, tag: T });
        A.ball(sa + Math.cos(t) * rr, sb + Math.sin(t) * rr, ty + .052,
          .012, .010, .012, P.cream, { mode: 7, tag: T });
      }
    });
    A.ball(sa, sb, 1.335, .022, .020, .022, P.berry, { mode: 7, gloss: .4, tag: T });
  }
  // Middle step: slices on cards, one per flavour, and a macaron tower at each end of the row.
  const sliceC = [[P.rose, P.berry], [P.matcha, P.mint], [P.taro, P.taro],
                  [P.cocoa, P.pastry], [P.mango, P.butter], [P.peach, P.rose]];
  const middleGap = [];
  for (let i = 0; i < 6; i++)
    slice(cA - .09, -2.15 + i * .55, 1.07, sliceC[i][0], sliceC[i][1],
      i >= 4 ? middleGap : null);
  stockSlot(middleGap);
  macarons(cA - .09, -2.48, 1.07, [P.rose, P.matcha, P.taro]);
  macarons(cA - .09, 0.88, 1.07, [P.mango, P.peach, P.mint]);
  // Back step: whole gateaux, the tallest things in the case and the ones seen from the door.
  const cakeC = [[P.cocoa, P.berry], [P.mint, P.matcha], [P.rose, P.berry],
                 [P.milk, P.mango], [P.taro, P.taro]];
  const backGap = [], HERO_CAKE_INDEX = 2;
  for (let i = 0; i < 5; i++)
    gateau(cA - .34, -2.02 + i * .70, 1.19, .135, cakeC[i][0], cakeC[i][1],
      i === 1 ? backGap : null);                                  // centre hero never depletes
  stockSlot(backGap);

  // The price cards for this case are built further up, before the glazing — see the note there.
  A.stop(bk, fr, cB - cLen / 2, cB + cLen / 2);

  // ================================================================== the bubble tea bar, at back
  // b -4.25 .. -1.05 against the back wall. Splashback, run of joinery, steel worktop, and the
  // machines a 奶茶, a 豆花 and a 冰淇淋 are actually made on — the shop's whole till list is
  // standing on this counter, which is what stops it reading as set dressing.
  // The splashback runs the full height of the bay, 0.87 to 2.77. It has to: the shell hangs a
  // lit landlord panel on this stretch of wall from 1.05 to 2.67, and a tiled back bar that stops
  // at 2.17 leaves half a metre of somebody else's magenta lightbox floating over the machines.
  // A border course two thirds of the way up, because a flat field of pale tile at this scale is
  // a blank wall whatever the map does to it.
  const wB = -2.65, wLen = 3.20;
  A.put(.42, wB, .04, wLen, 1.90, 1.82, P.tile,
    { hard: true, gloss: .46, ...TILE, tag: T });
  A.put(.452, wB, .026, wLen, .080, 2.30, P.tileD, { hard: true, gloss: .5, tag: T });
  A.put(.458, wB, .022, wLen, .016, 2.352, P.tile, { hard: true, gloss: .5, tag: T });
  A.put(.458, wB, .022, wLen, .016, 2.248, P.tile, { hard: true, gloss: .5, tag: T });
  A.put(.86, wB, .58, wLen, .84, .42, P.wood,
    { hard: true, gloss: .24, ...TIMBER, tag: T });
  for (let i = 0; i < 4; i++) {                                   // door lines and handles
    const bb = wB - wLen / 2 + .40 + i * .80;
    A.put(1.16, bb, .02, .74, .70, .46, P.wood,
      { hard: true, gloss: .30, ...TIMBER, tag: T });
    A.put(1.19, bb, .03, .30, .022, .74, P.steelD, { hard: true, gloss: .6, tag: T });
  }
  A.put(.86, wB, .64, wLen + .06, .06, .87, P.steel, { hard: true, gloss: .58, tag: T });
  A.stop(.55, 1.18, wB - wLen / 2, wB + wLen / 2);

  // The tea urns, with a tap each — the one machine in a milk-tea shop that is always on and
  // always full, so they get the end of the run nearest the door to the back.
  for (const bb of [-4.05, -3.72]) {
    A.cyl(.84, bb, 1.08, .112, .36, P.steel, { gloss: .55, tag: T });
    A.cyl(.84, bb, 1.275, .118, .030, P.steelD, { gloss: .6, tag: T });
    A.ball(.84, bb, 1.305, .026, .022, .026, P.trim, { mode: 7, tag: T });
    A.put(.96, bb, .10, .045, .045, .96, P.trim, { hard: true, gloss: .5, tag: T });   // the tap
    A.cyl(.99, bb, 1.10, .020, .16, P.tea, { gloss: .5, tag: T });                     // sight tube
  }
  // Syrup pumps. Five bottles in a row is the most recognisable object on any tea counter.
  const syrup = [P.mango, P.rose, P.matcha, P.taro, P.cocoa];
  syrup.forEach((c, i) => {
    const bb = -3.30 + i * .17;
    A.cyl(.84, bb, 1.01, .046, .22, c, { gloss: .42, tag: T });
    A.cyl(.84, bb, 1.135, .030, .036, P.white, { gloss: .5, tag: T });
    A.put(.92, bb, .085, .020, .020, 1.145, P.white, { hard: true, gloss: .5, tag: T });
  });
  // 豆花 warmer: a deep steel pot in a well, a domed lid stood half open on it, and a ladle.
  A.put(.86, -2.34, .34, .34, .12, .96, P.steelD, { hard: true, gloss: .52, tag: T });
  A.cyl(.86, -2.34, 1.06, .132, .10, P.chrome, { gloss: .66, tag: T });
  A.ball(.86, -2.34, 1.11, .134, .072, .134, P.chrome, { gloss: .70, tag: T });
  A.ball(.86, -2.34, 1.152, .026, .020, .026, P.trim, { mode: 7, tag: T });
  A.cyl(.99, -2.34, 1.11, .010, .18, P.steelD, { gloss: .5, rz: .34, tag: T });
  A.put(1.00, -2.34, .07, .09, .026, 1.02, P.milk, { round: .02, mode: 7, tag: T });
  A.put(.98, -2.34, .02, .22, .10, 1.235, P.white, { hard: true, gloss: .3, tag: T });
  A.glyph(1.00, -2.34, 1.235, '豆花 ¥12',
    { size: .050, gap: .012, color: P.ink, mode: 1, tag: T });
  // The sealing machine: base, column, head, a green ready-lamp and a cup sitting under it.
  A.put(.88, -1.90, .40, .34, .18, .99, P.steelD, { hard: true, gloss: .52, tag: T });
  A.put(.80, -1.90, .26, .30, .40, 1.28, P.trim, { hard: true, gloss: .40, tag: T });
  A.put(.98, -1.90, .12, .26, .13, 1.30, P.steel, { hard: true, gloss: .55, tag: T });
  A.put(1.05, -1.90, .02, .13, .035, 1.38, P.mint, { hard: true, mode: 1, glow: .10, tag: T });
  bubbleTea(1.00, -1.90, .90);
  // 软冰淇淋机. Two chilled hoppers behind a stainless face, a pair of pull handles, the spout,
  // and a sleeve of cones beside it. It stands at the end of the run nearest the case, which is
  // where the queue ends up, and it is the only machine in the shop the customer can see working.
  //
  // Tagged with its own word rather than with the shop's. `pickUnderCursor` resolves the ray to a
  // prop, takes that prop's tag, and then hands back the nearest THING wearing the same tag — so a
  // label whose word tags nothing can never be selected by pointing at anything, and falls back to
  // being offered only when the player happens to stand nearer its focus than every other label in
  // the room. In a unit with this many words that means most of them are permanently shadowed.
  // Moving these nineteen props onto 冰淇淋 costs nothing and makes the machine pointable.
  {
    const ib = -1.32, IC = '冰淇淋';
    A.put(.86, ib, .40, .44, .62, 1.21, P.steel, { hard: true, gloss: .56, tag: IC });
    A.put(.86, ib, .42, .46, .05, 1.545, P.steelD, { hard: true, gloss: .5, tag: IC });
    for (const s of [-1, 1])
      A.cyl(.84, ib + s * .10, 1.60, .085, .22, P.chrome, { gloss: .66, tag: IC });
    A.put(1.07, ib, .02, .40, .30, 1.36, P.trim, { hard: true, gloss: .34, tag: IC });
    A.glyph(1.09, ib, 1.44, '冰淇淋',
      { size: .056, gap: .018, color: P.cream, mode: 1, tag: IC });
    for (const s of [-1, 1]) {
      A.put(1.06, ib + s * .11, .05, .034, .17, 1.19, P.trim, { hard: true, gloss: .4, tag: IC });
      A.cyl(.98, ib + s * .11, 1.055, .022, .07, P.chrome, { gloss: .7, tag: IC });
    }
    A.taper(1.06, ib + .24, 1.02, .062, .13, .062, P.pastry, { gloss: .2, tag: IC });
    A.ball(1.06, ib + .24, 1.10, .052, .046, .052, P.milk, { mode: 7, gloss: .3, tag: IC });
  }

  // The cup and lid shelves. Two of them over the -b end of the worktop, holding the stock a tea
  // shop keeps in the open. They stop short of the menu board above, which is why they are only
  // 1.6 m long: run to the full width of the counter their back rails fought the board's frame
  // for the same pixels.
  for (const sy of [1.52, 1.84]) {
    A.put(.62, -3.40, .30, 1.60, .045, sy, P.wood,
      { hard: true, gloss: .26, ...TIMBER, tag: T });
    A.put(.50, -3.40, .05, 1.60, .09, sy + .068, P.tile,
      { hard: true, gloss: .3, ...TILE, tag: T });
  }
  for (let i = 0; i < 4; i++) {
    const bb = -4.02 + i * .41;
    A.taper(.66, bb, 1.632, .112, .175, .112, P.white, { rx: Math.PI, gloss: .30, tag: T });
    A.cyl(.66, bb, 1.935, .058, .120, [P.rose, P.mint, P.mango, P.taro][i],
      { gloss: .36, tag: T });
    A.cyl(.66, bb, 2.002, .060, .014, P.white, { gloss: .4, tag: T });
  }
  // Shakers upended in a rack on the near end of the lower shelf.
  for (let i = 0; i < 3; i++)
    A.cyl(.66, -2.86 + i * .155, 1.615, .050, .14, P.chrome, { gloss: .70, tag: T });

  // ================================================================== the photo menu board
  // Hung on the back wall at b -3.20 .. -1.06, from 2.06 to 3.02 — above the case's hood and
  // below the valance, which is the only band of that wall a customer at the door can actually
  // see. Emissive, never materialled, and the one place in the unit that carries the full list.
  // `glow` is deliberately absent from the board face and the photo tiles. Two square metres of
  // lit cream at glow .13 is by a distance the largest emitter in the unit, and the bloom pass
  // spread it across the shopfront as a horizontal grey haze that hung over the case, the tables
  // and the concourse outside. mode 1 alone already draws it at full value with no shading — it
  // reads exactly as bright, and contributes nothing to the glow buffer. Only the header band,
  // which is 14 cm tall, is allowed to actually emit.
  //
  // Tagged 菜单, for the same reason the soft-serve machine is tagged 冰淇淋 — see the note there.
  // 菜单 is a live action in USE_AT.mall (看菜单, "read the menu"), so this is the one board in the
  // shop that both teaches a word and does something when you use it; leaving it on the shop's own
  // tag meant the ray could only ever resolve it to the 甜品店 browse card.
  const mB = -2.13, mW = 2.14, MN = '菜单';
  A.put(.50, mB, .10, mW + .12, 1.02, 2.56, P.trim, { hard: true, gloss: .28, tag: MN });
  A.put(.565, mB, .03, mW, .90, 2.56, P.cream, { hard: true, mode: 1, tag: MN });
  A.put(.585, mB, .02, mW - .06, .14, 2.95, P.roseD, { hard: true, mode: 1, glow: .08, tag: MN });
  A.glyph(.60, mB, 2.95, '今日甜品',
    { size: .078, gap: .026, color: P.white, mode: 1, tag: MN });
  // Four items, each a photo tile over its name and its price, reading left to right in the room.
  // `b` runs the opposite way to the screen from the customer's side, so the array is in reverse.
  // The prices are the shop's real ones — the same numbers the till charges — because a menu that
  // disagrees with the till is the one piece of set dressing a player can actually catch out.
  const menu = [['蛋糕卷', '¥26', P.rose], ['豆花', '¥12', P.milk],
                ['冰淇淋', '¥18', P.peach], ['奶茶', '¥22', P.tea]];
  menu.forEach(([zh, yuan, c], i) => {
    const bb = mB - mW / 2 + .28 + i * .52;
    A.put(.585, bb, .02, .46, .34, 2.72, c, { hard: true, mode: 1, tag: T });
    A.put(.592, bb, .012, .47, .016, 2.545, P.trim, { hard: true, gloss: .2, tag: T });
    A.ball(.598, bb, 2.74, .150, .108, .012, P.cream, { mode: 1, tag: T });
    A.ball(.600, bb, 2.68, .070, .048, .010, P.white, { mode: 1, tag: T });
    A.glyph(.60, bb, 2.42, zh, { size: .072, gap: .012, color: P.ink, mode: 1, tag: T });
    A.glyph(.60, bb, 2.27, yuan, { size: .068, gap: .016, color: P.berry, mode: 1, tag: T });
  });

  // ================================================================== collection counter and till
  // At the far end of the service line, past the case, with the straws and napkins on it — which
  // is where a dessert shop puts them, because it is the last thing you touch on the way out.
  // Everything on it is tagged 收银台 rather than 甜品店, so the till lights up as its own thing
  // when you walk up to it; that tag is what USE_AT.mall looks for to let you pay.
  const kA = 2.25, kB = -3.55, kW = 1.50, kDp = .92;
  const kf = kA + kDp / 2;
  A.put(kA, kB, kDp - .12, kW - .14, .16, .10, P.trim, { hard: true, gloss: .30, tag: TILL });
  A.put(kA, kB, kDp, kW, .78, .51, P.wood,
    { hard: true, gloss: .24, ...TIMBER, tag: TILL });
  A.put(kA, kB, kDp + .10, kW + .12, .08, .94, P.stoneD,
    { hard: true, gloss: .44, ...SLAB, tag: TILL });
  A.put(kf + .012, kB, .02, kW - .10, .028, .58, P.warm,
    { hard: true, mode: 1, glow: .08, tag: TILL });
  A.glyph(kf + .018, kB, .76, '收银台',
    { size: .115, gap: .038, color: P.gold, mode: 1, glow: .05, tag: TILL });
  // Terminal facing out, card reader on the customer's side of it.
  A.put(kA - .05, kB + .48, .30, .34, .10, 1.03, P.trim, { hard: true, gloss: .35, tag: TILL });
  A.put(kA - .09, kB + .48, .07, .32, .26, 1.21, P.trim, { hard: true, gloss: .40, tag: TILL });
  const tillScreen=A.put(kA - .05, kB + .48, .02, .27, .21, 1.21, P.screen,
    { hard: true, mode: 1, glow: .07, tag: TILL });
  A.put(kA + .22, kB + .46, .16, .11, .05, 1.005, P.steel, { hard: true, gloss: .5, tag: TILL });
  const readerScreen=A.put(kA + .24, kB + .46, .02, .08, .04, 1.035, P.mint,
    { hard: true, mode: 1, glow: .07, tag: TILL });
  // Straws in a jar, napkins, a stack of takeaway bags and a bell.
  A.cyl(kA + .16, kB - .46, 1.06, .058, .16, P.glass,
    { mode: 1, alpha: .28, gloss: .9, tag: TILL });
  for (let i = 0; i < 7; i++) {
    const t = i / 7 * Math.PI * 2;
    A.cyl(kA + .16 + Math.cos(t) * .028, kB - .46 + Math.sin(t) * .028, 1.14, .008, .26,
      [P.rose, P.mint, P.mango, P.taro][i % 4], { gloss: .4, rz: (i % 3 - 1) * .05, tag: TILL });
  }
  A.put(kA + .12, kB - .12, .15, .21, .11, 1.035, P.steelD, { hard: true, gloss: .55, tag: TILL });
  A.put(kA + .12, kB - .12, .11, .17, .035, 1.105, P.white, { hard: true, mode: 7, tag: TILL });
  for (let i = 0; i < 4; i++)
    A.put(kA - .24, kB - .38, .17, .19, .024, 1.00 + i * .026, P.pastry,
      { hard: true, gloss: .2, tag: TILL });
  A.cyl(kA + .26, kB + .18, 1.00, .042, .022, P.trim, { gloss: .5, tag: TILL });
  A.ball(kA + .26, kB + .18, 1.035, .038, .032, .038, P.gold, { gloss: .72, tag: TILL });
  // The collider runs all the way to the case, so the 25 cm slot between the two is not a gap a
  // player can wedge themselves into and then have to be shaken out of.
  A.stop(kA - kDp / 2, kA + kDp / 2, kB - kW / 2, cB - cLen / 2);

  // ================================================================== the staff return
  // The +b end of the case is open, and without this a customer can walk straight round it into
  // the space behind the counter. A timber return from the retail bay to the end of the case,
  // waist-and-a-half high, closes it the way a real shopfit does.
  A.put(1.20, 1.14, 1.28, .10, 1.40, .70, P.wood,
    { hard: true, gloss: .24, ...TIMBER, tag: T });
  A.put(1.20, 1.14, 1.30, .13, .05, 1.425, P.stoneD, { hard: true, gloss: .44, ...SLAB, tag: T });
  A.stop(.56, 1.84, 1.06, 1.22);

  // ================================================================== the standing ledge
  // A perch bar on the -b partition, in the last stretch of wall past the till: a 0.90 m timber
  // shelf at 1.08 with a tiled upstand, two legs and a foot rail. This is what the shop's own
  // completion line describes — 站在柜台边就吃完了, "you finish it standing at the counter" — and
  // without somewhere to actually stand and eat, that line was describing furniture the shop did
  // not have.
  //
  // It replaces a belt barrier that used to steer the queue at a 3.30. The walkway between the
  // case front (2.725) and the window platform (3.655) is 0.93 m wide, and two posts and a belt
  // standing in the middle of it left 0.35 m on one side and 0.58 on the other — narrow enough
  // that anybody walking the length of the shop, player or NPC, had to clip through it. The queue
  // in MallCast at the bottom of this file is a better barrier than a barrier: it is made of
  // people, and it is standing where a queue actually stands.
  //
  // a 2.75–3.65 keeps it clear of the partition's own lit panel, which the shell hangs from 1.40
  // up over a 1.63–2.97; the ledge is below it and stops short of it in depth as well.
  {
    const la = 3.20, lb = -4.23;
    A.put(la, lb, .90, .36, .045, 1.055, P.wood,
      { hard: true, gloss: .26, ...TIMBER, tag: T });                       // the shelf
    A.put(la, -4.38, .90, .05, .07, 1.005, P.trim, { hard: true, gloss: .3, tag: T }); // wall cleat
    A.put(la, -4.396, .90, .028, .15, 1.135, P.tile,
      { hard: true, gloss: .48, ...TILE, tag: T });                         // tiled upstand
    for (const pa of [2.88, 3.52])
      A.put(pa, -4.12, .06, .06, 1.03, .53, P.steelD, { hard: true, gloss: .55, tag: T });
    A.cyl(la, -4.12, .17, .020, .64, P.steelD, { rx: Math.PI / 2, gloss: .60, tag: T });
    // Somebody is halfway through something here. A tart on a plate, a tea, a napkin: the three
    // objects that say a ledge is used rather than provided. The shelf's top face is at 1.0775,
    // and every one of the helpers at the top of this file takes the height its base sits at —
    // `tart` and `bubbleTea` both build from `y` upwards, and a plate's `y` is its underside.
    A.cyl(3.42, lb, 1.087, .112, .018, P.plate, { gloss: .52, tag: T });
    tart(3.42, lb, 1.096, P.butter);
    bubbleTea(2.96, lb - .02, 1.078);
    A.put(3.16, lb - .09, .10, .10, .006, 1.086, P.white, { hard: true, mode: 7, tag: T });
  }
  A.stop(2.80, 3.60, -4.42, -4.02);

  // ================================================================== the retail wall, +b side
  // A lit bay of gift boxes and bottled drinks behind the tables — the backdrop the seating needs,
  // and a second, quieter lit box so the chilled case is not the only glowing thing in the room.
  // With a base cabinet under it. Without one the bay is a 1.5 m timber box hanging in mid-air
  // with a metre of empty wall below it — which is what it was, and from the concourse it read
  // as a shelf somebody had forgotten to fix a carcass to.
  A.put(.66, 2.00, .42, 1.50, .84, .43, P.wood,
    { hard: true, gloss: .22, ...TIMBER, tag: T });
  A.put(.66, 2.00, .30, 1.36, .16, .09, P.trim, { hard: true, gloss: .3, tag: T });
  A.put(.66, 2.00, .46, 1.58, .06, .88, P.stoneD, { hard: true, gloss: .44, ...SLAB, tag: T });
  for (const s of [-1, 1])
    A.put(.88, 2.00 + s * .36, .02, .60, .58, .48, P.wood,
      { hard: true, gloss: .28, ...TIMBER, tag: T });
  A.put(.62, 2.00, .34, 1.50, 1.34, 1.62, P.wood,
    { hard: true, gloss: .20, ...TIMBER, tag: T });
  A.put(.74, 2.00, .04, 1.34, 1.20, 1.62, P.cream, { hard: true, mode: 1, tag: T });
  for (let r = 0; r < 3; r++) {
    const sy = 1.14 + r * .44;
    A.put(.78, 2.00, .28, 1.38, .045, sy, P.wood,
      { hard: true, gloss: .26, ...TIMBER, tag: T });
    for (let i = 0; i < 4; i++) {
      const bb = 1.48 + i * .35, c = [P.rose, P.mint, P.taro, P.butter][(i + r) % 4];
      if (r === 1) {                                            // a shelf of bottled milk teas
        A.cyl(.80, bb, sy + .11, .042, .17, c, { gloss: .5, tag: T });
        A.cyl(.80, bb, sy + .215, .022, .045, P.trim, { gloss: .5, tag: T });
      } else {                                                  // gift boxes, ribbon and all
        A.put(.80, bb, .20, .22, .17, sy + .108, c, { round: .018, mode: 7, tag: T });
        A.put(.795, bb, .21, .045, .175, sy + .108, P.cream, { hard: true, mode: 7, tag: T });
        A.ball(.80, bb, sy + .205, .034, .020, .030, P.cream, { mode: 7, tag: T });
      }
    }
  }
  // Gift bags and a stack of cake boxes on the base cabinet's top.
  for (let i = 0; i < 4; i++)
    A.put(.66, 1.42, .21, .23, .028, .94 + i * .030, P.pastry, { hard: true, gloss: .2, tag: T });
  for (let i = 0; i < 3; i++) {
    const bb = 2.06 + i * .26;
    A.put(.64, bb, .12, .22, .30, 1.06, [P.rose, P.mint, P.taro][i], { round: .02, mode: 7, tag: T });
    A.cap(.64, bb, 1.25, .015, .12, .015, P.cream, { tag: T });
  }
  A.stop(.44, .90, 1.25, 2.78);

  // ================================================================== seating
  // A wall bench under the lit panel the shell hangs on this partition — which is exactly where a
  // café puts one — and two small tables off it. Two seats each rather than four: the chairs are
  // placed off a hash of the table's own position and a four-seater throws one of them a metre
  // out along the frontage, which in a nine-metre unit puts it through the partition.
  A.put(2.30, 4.22, 1.36, .38, .40, .21, P.wood, { hard: true, gloss: .22, ...TIMBER, tag: T });
  A.put(2.30, 4.22, 1.24, .30, .14, .07, P.trim, { hard: true, gloss: .3, tag: T });
  A.put(2.30, 4.20, 1.32, .34, .10, .455, P.roseD, { round: .03, mode: 7, tag: T });
  for (let i = 0; i < 3; i++)
    A.put(1.86 + i * .44, 4.34, .30, .10, .28, .66, [P.cream, P.rose, P.cream][i],
      { round: .05, mode: 7, tag: T });
  A.stop(1.60, 3.00, 4.00, 4.42);

  for (const tb of [1.95, 3.30]) {
    A.table(2.20, tb, 2, .42);
    // A pendant over each one, hung from the ceiling plane at 3.54.
    A.cyl(2.20, tb, 3.02, .008, .92, P.trim, { gloss: .3, tag: T });
    A.taper(2.20, tb, 2.46, .30, .20, .30, P.roseD, { gloss: .30, tag: T });
    A.cyl(2.20, tb, 2.372, .128, .020, P.warm, { mode: 1, glow: .16, tag: T });
    A.cyl(2.20, tb, 2.575, .035, .028, P.trim, { gloss: .4, tag: T });
  }
  // Somebody has been sitting at the near one: a half-finished tea and a plate with a fork on it.
  bubbleTea(2.42, 1.80, .82);
  A.cyl(2.05, 2.10, .833, .098, .020, P.plate, { gloss: .5, tag: T });
  A.put(2.05, 2.10, .10, .07, .028, .855, P.pastry, { round: .01, mode: 7, tag: T });
  A.put(2.16, 2.10, .12, .018, .008, .846, P.steel, { hard: true, gloss: .6, tag: T });

  // ---- the takeaway freezer, closing the last bare stretch of back wall.
  // Between the retail bay (which stops at b 2.78) and the corner there was a metre and a half of
  // empty plaster behind the tables, and from the concourse that is the one part of the seating
  // bay you look straight into. A chest freezer of boxed ice creams continues the takeaway run and
  // puts the third thing this shop sells — 冰淇淋, at the price the till charges — on the floor
  // rather than only on the menu board.
  //
  // The height is the whole design constraint. The shell hangs a framed graphic on this stretch
  // from y 1.05 to 2.67 at a .26–.34, which is *inside* this cabinet's depth; anything upright
  // here swallows the bottom half of it. A chest at 0.97 to the top of its glass passes under it
  // with 80 mm to spare, and a low cabinet is what a shop puts boxed ice cream in anyway.
  {
    const fa = .58, fb = 3.30;
    A.put(fa, fb, .60, .56, .12, .06, P.trim, { hard: true, gloss: .30, tag: T });      // plinth
    A.put(fa, fb, .70, .68, .68, .44, P.white, { hard: true, gloss: .34, tag: T });     // carcass
    // The band and the hairline stand 2 mm proud of the carcass face rather than flush with it:
    // a facing panel whose back sits exactly on the surface it is fixed to shares a plane with it,
    // and two coplanar faces in this renderer flicker against each other from every angle.
    A.put(.938, fb, .020, .62, .17, .625, P.rose, { hard: true, gloss: .42, tag: T });
    A.put(.946, fb, .012, .62, .018, .722, P.gold, { hard: true, gloss: .55, tag: T });
    A.glyph(.952, fb, .40, '冰淇淋 ¥18',
      { size: .058, gap: .016, color: P.ink, mode: 1, tag: T });
    A.put(fa, fb, .74, .72, .06, .800, P.steel, { hard: true, gloss: .58, tag: T });    // rim
    A.put(fa, fb, .60, .58, .06, .795, P.slateD, { hard: true, gloss: .30, tag: T });   // well
    // Six tubs standing in the well, in two rows, with a scooped surface a shade below each rim.
    // They stand at 0.825, the top of the well liner, and come 0.10 proud of the rim: a scooping
    // cabinet shows you the tubs, and a freezer that hides them is a white box with a lid.
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
      const c = [P.rose, P.matcha, P.cocoa, P.mango, P.taro, P.milk][r * 3 + i];
      A.cyl(fa - .14 + r * .28, fb - .22 + i * .22, .8775, .100, .105, P.steelD,
        { gloss: .50, tag: T });
      A.cyl(fa - .14 + r * .28, fb - .22 + i * .22, .915, .092, .026, c, { gloss: .24, tag: T });
    }
    // Glass lid and its rail. One transparent prop, which is what a lid you look through costs.
    A.put(fa, fb, .66, .64, .028, .955, P.glass,
      { hard: true, mode: 1, alpha: .20, gloss: .94, tag: T });
    A.cyl(.90, fb, .980, .014, .52, P.chrome, { rz: Math.PI / 2, gloss: .70, tag: T });
  }
  A.stop(.23, .98, 2.94, 3.66);

  // A plant in the corner of the seating, because every one of these shops has one. It stands at
  // a 0.74 rather than the 1.15 it was built at: `table()` places its chairs off a hash of the
  // table's own position, and the +b table's inner chair lands at a 1.43, b 3.76 — through the
  // pot. The corner behind it is the only spot in this bay that no chair can be thrown into.
  A.taper(.74, 4.02, .16, .30, .32, .30, P.cream, { gloss: .3, tag: T });
  A.cyl(.74, 4.02, .325, .13, .03, P.cocoa, { gloss: .1, tag: T });
  for (const [da, db, dy, r] of [[0, 0, .52, .20], [-.10, .08, .44, .15], [.11, -.07, .46, .14],
                                 [.02, .13, .40, .12]])
    A.ball(.74 + da, 4.02 + db, dy, r, r * .82, r, P.leaf, { mode: 7, gloss: .06, tag: T });
  A.ball(.74, 4.02, .60, .13, .11, .13, P.leafD, { mode: 7, gloss: .06, tag: T });

  // ================================================================== the window
  // The shell has already dressed both window bays with the default goods for this trade and lit
  // them from above; what it cannot know is that a patisserie window is a cake under a dome. One
  // per bay, out at the end of the platform where the plinths are not, standing on the platform
  // top at 0.34 — the only part of this shop most people in the building will ever see.
  for (const s of [-1, 1]) {
    const bb = s * 3.0 + s * 1.15;                 // platform mid is s*3.0, plinths at s*3.0±.66
    A.cyl(4.18, bb, .372, .175, .044, P.trim, { gloss: .5, tag: T });
    gateau(4.18, bb, .40, .120, P.rose, P.berry);
    A.cyl(4.18, bb, .585, .185, .34, P.glass,
      { mode: 1, alpha: .16, gloss: .95, tag: T });
    A.ball(4.18, bb, .758, .186, .092, .186, P.glass,
      { mode: 1, alpha: .16, gloss: .95, tag: T });
    A.ball(4.18, bb, .800, .026, .030, .026, P.chrome, { gloss: .7, tag: T });
  }

  // ================================================================ the shop as a working counter
  //
  // Everything from here to the light turns a very well dressed patisserie into one you can order
  // in. Six things are wanted — the choices you make, a queue, a number, something being made where
  // you can watch it, this month's flavour and a cake made to order — and the whole of it is built
  // inside a hard budget of sixty props, which is 9% of what this unit already costs. So every one
  // of them is laid on a surface that exists rather than given a fixture of its own, and the count
  // is written beside each block because the budget is a line and not a feeling:
  //
  //   choice strip on the case's own colour band     20   (glyphs only, no new joinery)
  //   queue marks, three                              7
  //   叫号 board, two digits                          19
  //   the decorating turntable, animated               7
  //   定制蛋糕 on the till's face                       5
  //   当季 lamp beside the flavour column               1
  //                                                  ---
  //                                                   59
  //
  // What did NOT get built, and where it went instead: the full order — six flavours, three
  // toppings, four sugar levels, cup sizes, hot/iced, eat-in or take-away — is a matrix, and a
  // matrix printed as geometry is ninety glyph quads for a list the player cannot interact with
  // anyway. It belongs in the ordering card, which is `MALL_FOOD` in js/data.js and not this
  // file's to write. The strip below is the *question list* — five headings and what kind of
  // answer each takes — which is what a Chinese tea counter actually prints on its front, and the
  // answers are in the report.
  //
  // Seven-segment colours, the same three the other two shops in this cluster use, so the three
  // 叫号 boards in the building read as one contractor's work.
  const SEG_ON = C('#ff7448'), SEG_OFF = C('#2b1410'), SEG_LAMP = C('#8fe39a');

  // ---------------------------------------------------------------- 1 · 点单 · the five questions
  // Laid straight onto the case's own rose band — the saturated line at y .55..0.81 that runs the
  // whole 3.54 m of the front — so this costs twenty glyph quads and not one box. The band was
  // blank, it is at reading height for somebody standing at the glass, and it is the first surface
  // in the room the eye lands on.
  //
  // 5 mm proud of the band (fr + .032 against the band's face at fr + .022): a glyph laid flush on
  // the surface it labels shares a plane with it and the two fight from every angle.
  //
  // Second lines are the *shape* of the answer rather than the answer: 冷热 is genuinely a choice
  // of two and 中大 a choice of two, and 六款 / 三样 / 四档 are how a counter here writes "there
  // are six of them, pick one". The six, the three and the four live in the ordering card.
  //
  // The columns count DOWN in b, and that is not a preference. This unit is on the south run, so
  // the customer faces +z and +b is on their left — increasing b walks the writing right to left
  // across their view. The photo menu board above has the same problem and solves it by writing
  // its array backwards; this solves it in the index, which is the same fix and survives somebody
  // reordering the list. Get it wrong and the five questions are asked in reverse.
  const QB = fr + .032;
  [['口味', '当季'], ['加料', '三样'], ['温度', '冷热'], ['糖度', '四档'], ['分量', '中大']]
    .forEach(([head, kind], i) => {
      const bb = cB + 1.24 - i * .62;
      A.glyph(QB, bb, .735, head, { size:.050, gap:.016, color:P.gold, mode:1, tag:T });
      A.glyph(QB, bb, .625, kind, { size:.042, gap:.013, color:P.cream, mode:1, tag:T });
    });
  // 当季 is the one that changes, so it gets the only lamp on the strip — a slow breath beside the
  // first column, which is what marks it as this month's rather than as part of the fixed list.
  const seasonLamp = A.dynamicVisual(
    A.cyl(QB + .006, cB + 1.24 + .12, .680, .013, .010, P.warm,
      { rx:Math.PI / 2, mode:1, glow:.02, tag:T }));

  // ---------------------------------------------------------------- 2 · the queue and the number
  // Painted, not fenced, and that is a decision this unit has already made once and written down:
  // see the note over the standing ledge above, where a belt barrier came out of a 0.93 m walkway
  // because it left 0.35 m on one side of it. The kit is MallQueue at the top of js/mall-coffee.js,
  // which 一间咖啡 and 麦香面包 also use — one implementation of a queue for the three shops that
  // wanted one, which is one prop budget rather than three and one set of segment maths rather
  // than three chances to mirror a digit.
  //
  // a 3.20 is the middle of the walkway: 0.475 clear of the case front at 2.725 and 0.455 clear of
  // the window platform at 3.655, so a 0.28 m body stands on any of them without being clamped.
  // The head is at b -3.60, in front of the till, and the line runs +b along the glass at a 0.66 m
  // pitch — two bodies are 0.56 m apart before they push each other, and four centimetres of
  // margin is not a queue, it is two people wearing the same coat. The three marks land under the
  // customers MallCast already stands at b -3.60 and -2.95; the tail one is left empty on purpose.
  //
  // Tagged 排队 rather than 甜品店. A word that tags no prop can only ever be offered by standing
  // nearest its focus — `pickUnderCursor` resolves a ray to a prop's tag and then to things
  // wearing it — so a label with nothing wearing its name is invisible to the cursor and is
  // shadowed by whatever else is nearer. Giving the marks the word makes the queue pointable.
  const QUEUE = MallQueue.marks(A, { a:3.20, b:-3.60, db:.66, n:3, y:.058,
                                     c:P.roseD, cHead:P.gold, tag:'排队' });
  // 叫号. Two digits, not three: this is a counter that serves ninety people in an afternoon, and
  // the third digit is seven props for a hundreds column that never leaves zero.
  //
  // It goes on the bare tile above the till, which is the one stretch of this back wall that is
  // free: the cup shelves top out at 1.953, the splashback runs to 2.77, and the photo menu board
  // starts at b -3.20 — so b -3.98..-3.42 by y 2.04..2.46 is clear of all three. a .53 rather than
  // .50, because the splashback's border course stands proud to a .469 and a housing at .465 would
  // have shared a plane with it.
  const CALL = MallQueue.board(A, {
    a:.53, b:-3.70, y:2.25, digits:2, size:.14,
    on:SEG_ON, off:SEG_OFF, lamp:SEG_LAMP, body:P.trim, tag:'号码',
    title:'取餐', titleColor:P.gold });
  const counterPower=A.powerDisplay
    ?A.powerDisplay([tillScreen,readerScreen,CALL.segs,CALL.lamp],{id:'till-and-call'})
    :{active:true};

  // ---------------------------------------------------------------- 3 · 现做, where you can see it
  // The one honest place in this shop to put something being made.
  //
  // Worth writing down, because it is not obvious in plan and it cost a rebuild: almost nothing on
  // the tea bar is visible from the customer side. The case's hood is 1.03 m deep and its top edge
  // is at y 1.60 at a 1.735, so a customer's eye at 1.5 m and a 3.2 sights over that corner and
  // lands at y ~1.65 by the time it reaches the back wall — everything on the worktop below that,
  // which is the sealing machine, the 豆花 warmer and the whole of the soft-serve machine's body,
  // is behind the hood. The case runs b -2.55..1.05, so the only part of the service line you can
  // actually watch is the stretch west of it: the till, at b -4.30..-2.80, whose top is 0.98.
  //
  // So the cake being finished stands on the till's own staff half, at a 1.98 — behind the terminal
  // at a 2.05 and clear of the bag stack at b -3.84 and the napkins at a 2.295 — and 陈子墨 stands
  // at a 1.47 directly behind it. Its top is at 1.20, which is 22 cm proud of the counter: from the
  // queue you watch a gateau turn under the icing while you wait, which is the whole point.
  const TT = { a:1.98, b:-3.55 };
  A.cyl(TT.a, TT.b, 1.000, .070, .040, P.chrome, { gloss:.70, tag:TILL });         // the base
  A.cyl(TT.a, TT.b, 1.036, .140, .016, P.steelD, { gloss:.55, tag:TILL });         // the turntable
  A.cyl(TT.a, TT.b, 1.076, .105, .048, P.milk, { gloss:.14, tag:TILL });           // sponge showing
  A.cyl(TT.a, TT.b, 1.136, .100, .072, P.cream, { gloss:.20, tag:TILL });          // iced sides
  // Three piped rosettes, and they are the only thing here that moves. A cylinder turning about
  // its own axis is a cylinder standing still; what reads as a turntable is something off-centre
  // going round. `A.dynamic` gives each of them a cull sphere covering the whole orbit — Build
  // packs cull spheres from the spawn pose, and a rosette culled at its start position blinks out
  // halfway round.
  const rosettes = [];
  for (let i = 0; i < 3; i++)
    rosettes.push(A.dynamic(
      A.ball(TT.a + Math.cos(i * 2.094) * .066, TT.b + Math.sin(i * 2.094) * .066, 1.186,
        .020, .018, .020, P.rose, { mode:7, gloss:.22, tag:TILL }),
      TT.a, TT.b, 1.186, .12));
  const TTW = A.at(TT.a, TT.b);                       // the axis, once, in world coordinates

  // ---------------------------------------------------------------- 4 · 定做蛋糕, on the till face
  // A celebration cake is an order rather than an object, so what it needs in the room is a place
  // to ask for one — and the sample is already built twice over, under a dome in each window bay.
  // This is the last free patch of the till's customer face: the warm strip runs to y .594, the
  // shell's 收银台 lettering occupies b -3.76..-3.34 and the ticket slot b -4.19..-4.02, which
  // leaves b -3.29..-2.81 by y .63..0.87.
  //
  // Tagged 订单 so the label below is pointable — see the note on the queue marks.
  A.put(kf + .012, -3.05, .014, .48, .24, .75, P.roseD,
    { hard:true, mode:1, glow:.05, tag:'订单' });
  A.glyph(kf + .026, -3.05, .805, '定做蛋糕',
    { size:.040, gap:.013, color:P.gold, mode:1, tag:'订单' });

  // The collection package, on the customer edge of the till top where it clears the terminal,
  // card reader, bell and straw jar. A cake box has a lower shell, lid and crossed ribbon; the
  // order slip lies beside it with two printed rules. `取蛋糕` is real glyph text on the label.
  // A neutral stone cover sits 8 mm in front of those immutable glyph quads whenever there is no
  // completed order, so cancellation does not leave floating words in the room.
  //
  // Twelve retained props, two signatures: nine dynamic hard mode-7 boxes and three static glyph
  // quads. They add no collider, light or callback and update only when DessertSys.rev changes.
  const pickupFx = [];
  const pickupBox = (a, b, dp, w, h, y, color, extra={}) => {
    const p=A.put(a,b,dp,w,h,y,color,
      {hard:true,mode:7,gloss:.08,tag:'取蛋糕',...extra});
    A.dynamic(p,a,b,y,.46); pickupFx.push(p); return p;
  };
  const cakeBoxParts = [
    pickupBox(2.61,-3.86,.24,.30,.16,1.065,P.pastry),
    pickupBox(2.61,-3.86,.25,.31,.035,1.162,P.cream),
    pickupBox(2.61,-3.86,.255,.045,.040,1.165,P.roseD),
    pickupBox(2.61,-3.86,.045,.315,.040,1.165,P.roseD),
  ];
  const pickupLabel=pickupBox(2.735,-3.86,.012,.19,.10,1.105,P.white);
  A.glyph(2.744,-3.86,1.105,'取蛋糕',
    {size:.030,gap:.010,color:P.ink,mode:1,glow:0,tag:'取蛋糕'});
  const pickupCover=pickupBox(2.752,-3.86,.010,.19,.10,1.105,P.stoneD);
  const orderSlip=pickupBox(2.61,-3.59,.11,.18,.006,.986,P.white,{rz:-.05});
  const slipLines=[-.025,.025].map(db=>
    pickupBox(2.615,-3.59+db,.075,.012,.004,.991,P.ink,{rz:-.05}));
  cakeBoxParts.forEach((p,i)=>{p.mallDessertCakeBoxPart=i;});
  pickupLabel.mallDessertPickupLabel='取蛋糕';
  pickupCover.mallDessertEmptyCover=1;
  orderSlip.mallDessertOrderSlip=1;
  slipLines.forEach((p,i)=>{p.mallDessertSlipLine=i;});
  const pickupRest=pickupFx.map(p=>p.m), pickupCoverIx=pickupFx.indexOf(pickupCover);
  pickupFx.forEach(p=>{p.m=STOCK_GONE;});
  pickupCover.m=pickupRest[pickupCoverIx];

  // ---------------------------------------------------------------- 5 · the counter, running
  // One callback for all of it, culled by the mall at 14 m from the middle of this unit — which
  // stops at the atrium rail, so standing at the fountain this shop costs nothing at all.
  //
  // Everything that can be compared before it is written is. `CALL.set` returns early when the
  // number has not moved, so a board showing the same number is one integer test a frame and
  // touches no geometry; the seasonal lamp and the card reader are written only on the frame their
  // state actually flips. What is left per frame is three matrices for the turntable, which is the
  // cost of the one thing here that is genuinely continuous.
  //
  // Two things about the write itself, both of which were wrong first time round and neither of
  // which `node --check` can see:
  //
  //   `M.trs` takes FULL sizes and `A.ball` takes RADII — build.js doubles them on the way in
  //   (`ball(...) -> shape('ball', …, rx*2, ry*2, rz*2)`). Writing the radii back into the matrix
  //   builds each rosette at half the size it was authored at, which reads as the icing shrinking
  //   the moment the shop comes into range.
  //
  //   The offsets are in the tenant's (a, b) and the matrix is in world x/z. On this wall
  //   `at(a,b) = [6.0 + b, 18 - a]`, so an offset (da, db) is (+db) on x and (-da) on z. Using
  //   cos on x and sin on z — which is the obvious thing to type — spins the cake about the wrong
  //   axis and in the wrong direction.
  const RS = [.040, .036, .040];                    // the rosette's full sizes, once
  let pickupRev = -1;
  A.motion('made', (t, state, player, minutes) => {
    // ---- case depletion. The three removable bays stand for three gaps among twelve readable
    // display bays. They empty at 18:00, 19:45 and 21:30. Matrices are touched only when that
    // integer changes; the centre gateau (HERO_CAKE_INDEX) and tiered stand never join the set.
    const dayMinute = ((typeof minutes === 'number' ? minutes : 840) % 1440 + 1440) % 1440;
    const stockGaps = dayMinute < 18 * 60 ? 0
      : Math.min(dayStock.length, 1 + Math.floor((dayMinute - 18 * 60) / 105));
    if (stockGaps !== state.stockGaps) {
      for (let i = 0; i < dayStock.length; i++) showStock(dayStock[i], i >= stockGaps);
      for (let i = 0; i < soldCards.length; i++) showStock(soldCards[i], i < stockGaps);
      state.stockGaps = stockGaps;
    }
    // ---- the turntable. One revolution every nine seconds, which is the speed a hand turns one.
    const ang = t * (Math.PI * 2 / 9);
    for (let i = 0; i < 3; i++) {
      const q = ang + i * 2.094;
      rosettes[i].m = M.trs(TTW[0] + Math.sin(q) * .066, A.y0 + 1.186,
                            TTW[1] - Math.cos(q) * .066, 0, RS[0], RS[1], RS[2]);
    }
    // ---- the number. One order every thirty-seven seconds, running 8 through 89 and wrapping: a
    // two-digit board reading 01 in the afternoon says the counter has served nobody.
    const n = 8 + Math.floor(t / 37) % 82;
    if(counterPower.active) {
      if (CALL.set(n)) state.calledAt = t;
      const since = state.calledAt === undefined ? 99 : t - state.calledAt;
      // The lamp beside the digits blinks for four seconds after a change, so a new number is
      // visible from the tail of the queue rather than only to somebody already reading the panel.
      CALL.flash(since < 4 && Math.sin(since * 6.4) > 0 ? 1 : 0);
    }
    state.displayPower=counterPower.active?'on':'off';
    // ---- 当季. A slow breath rather than a blink: this marks a column of a menu, not an event.
    const k = .5 + .5 * Math.sin(t * .55);
    seasonLamp.glow = .04 + k * .20;
    // ---- made-to-order collection. Pending and cancelled orders are both intentionally absent;
    // the only visible state is an exact completed order, and collection/reset clear it on the
    // next existing tenant tick. Metadata keeps the physical box/slip tied to that exact order.
    const ds = window.DessertSys;
    if (ds && ds.state.rev !== pickupRev) {
      pickupRev = ds.state.rev;
      const order = ds.visible() ? ds.state.custom : null, show = !!order;
      pickupFx.forEach((p,i)=>{p.m=show?pickupRest[i]:STOCK_GONE;});
      pickupCover.m=show?STOCK_GONE:pickupRest[pickupCoverIx];
      cakeBoxParts.forEach(p=>{
        p.mallDessertOrderId=show?order.id:''; p.mallDessertCakeLabel=show?order.label:'';
      });
      orderSlip.mallDessertOrderId=show?order.id:'';
      orderSlip.mallDessertCakeLabel=show?order.label:'';
      orderSlip.mallDessertFlavour=show?order.flavour:'';
      orderSlip.mallDessertSize=show?order.size:'';
      state.pickup=show?1:0; state.pickupId=show?order.id:'';
      state.pickupLabel=show?order.label:''; state.pickupProps=12;
    }
    state.now = n; state.queue = QUEUE.length; state.turn = +(ang % (Math.PI * 2)).toFixed(2);
    state.stockCards = stockGaps; state.stockFraction = +(stockGaps / 12).toFixed(2);
    state.stockHero = HERO_CAKE_INDEX === 2 ? 1 : 0;
  }, { far:14 });

  // ================================================================== light
  // Three, which is the most a tenant should declare: eight reach the shader and the nearest to
  // the camera win, so standing in this shop these are the near ones. Warm and pink over the
  // case, cooler and higher over the tea bar so the menu board reads, one over the tables.
  A.light(2.55, -0.75, 1.62, [1.00, 0.87, 0.83], .44, 3.2);
  A.light(1.40, -2.60, 2.30, [1.00, 0.94, 0.85], .32, 3.1);
  A.light(2.60, 2.60, 2.28, [1.00, 0.90, 0.81], .28, 3.0);

  // ================================================================== what there is to say here
  const shopThing = A.th('甜品店', 5.15, 0, '这家的芒果班戟很有名。', 'Their mango pancakes are famous.',
    '甜 sweet + 品 item.', 2.2, 2.5);
  // ---- and where the five printed questions are actually answered.
  //
  // game.js already owns an ordering card that does exactly this: a thing carrying `foodVendor`
  // opens the counter's item list and then the counter's own question, and pays once at the end
  // (js/game.js, the `th.foodVendor` branch). What it is driven by is `MALL_FOOD` in js/data.js,
  // which is the lead's table and not this file's to write.
  //
  // So the hook is written here and guarded. The day a 甜品店 row lands in MALL_FOOD this
  // storefront becomes a real order — pick a dessert, then answer 糖度 — and until then it stays
  // exactly the browse-and-pay it is today. Unguarded it would render as "order at undefined" for
  // everybody, which is the sort of thing that ships because it was written for a table that was
  // going to exist. The rows this shop wants are in the report.
  if (typeof MALL_FOOD !== 'undefined' && MALL_FOOD['甜品店']) shopThing.foodVendor = '甜品店';
  // The till. Without this the shop is a room you can choose in and never pay in: USE_AT.mall
  // reads 收银台 off a thing whose mallShop matches, and A.th sets that from the shop's tag.
  A.th(TILL, 2.85, -3.55, '一共多少钱？', 'How much is that altogether?',
    '收银 to take payment + 台 counter.', 1.7, 1.2);
  A.th('甜品', 3.15, -0.75, '甜品吃一半就够了。', 'Half a dessert is plenty.',
    '甜品 is a dessert — the shop is called 半糖, "half sugar".', 1.7, 1.3);
  A.th('奶茶', 1.60, -1.32, '我要一杯珍珠奶茶，少糖。', 'One bubble tea please, less sugar.',
    '奶 milk + 茶 tea. 珍珠 pearls are the tapioca.', 1.7, 1.4);

  // ---- the counter's own five words, and where a body has to be standing to say them.
  //
  // `A.th` puts the focus 1.15 m further OUT than the label, which from anywhere on the service
  // line lands inside the case, the till or the window platform — so all five are set by hand onto
  // the walkway at a 3.25, which is the 0.93 m strip between the case front (2.725) and the window
  // platform (3.655) and the only continuous floor on this side of the shop. The -b end of it is
  // interrupted by the standing ledge at a 2.80..3.60, b -4.42..-4.02, which is why nothing is
  // focused west of b -3.60.
  //
  // The `b` spacing is the part that is not decoration. A thing is offered when its focus is the
  // nearest one relative to its own reach, so two labels 0.2 m apart are one label and a decoy.
  // These are 0.55–0.65 m apart at reach 1.0, which gives each of them a stretch of walkway it
  // wins outright, and none of them is placed close enough to b -0.75 to shadow 甜品 — the shop's
  // own paying action — at the spot 甜品 is reached from.
  const lab = (hz, a, b, zh, en, note, reach, y, fb) => {
    const t = A.th(hz, a, b, zh, en, note, reach, y);
    const p = A.at(3.25, fb === undefined ? b : fb);
    t.focus = [p[0], p[1]];
    return t;
  };
  lab('号码', .576, -3.70, '叫到号码就过来取。', 'Come and collect it when your number is called.',
    '号 number + 码 code. Two digits, over the till: this counter never gets past ninety in an '
    + 'afternoon.', 1.0, 2.25, -3.60);
  lab('订单', kf + .026, -3.05, '定做蛋糕要提前一天。', 'A made-to-order cake needs a day’s notice.',
    '订 to order + 单 slip. Six, eight or ten inches, iced to whatever you write on the slip; the '
    + 'two under the domes in the window are the house ones.', 1.0, .80, -3.05);
  lab('排队', 3.20, -2.42, '在这儿排队，往前走。', 'Queue here, and move up.',
    '排 to line up + 队 a file of people. Three marks painted on the floor; the one at the back is '
    + 'usually free.', 1.0, 1.00, -2.42);
  lab('菜单', .60, -1.78, '照片上的都有吗？', 'Do you have everything in the photographs?',
    '菜 dish + 单 list. The lit board over the tea bar carries the four the till actually charges '
    + 'for, at the prices it charges.', 1.0, 2.42, -1.78);
  lab('冰淇淋', 1.09, -1.32, '冰淇淋要蛋筒还是杯子？', 'Cone or cup for the ice cream?',
    '冰 ice + 淇淋, which is the English word written in Chinese. Soft-serve, drawn while you '
    + 'watch; the boxed ones are in the chest freezer at the far end.', .8, 1.44, -1.15);
};

// ===============================================================================================
// The shopfront windows. A patisserie benefits from clearer glass than the house default: the pale
// icing needs contrast, not another milky layer. Each bay is one complete celebration-cake still
// life instead of a row of interchangeable sweets, and all emissive pieces remain narrow accents.
//
// Budget: 21 primitives per bay, 42 for the tenant. The composition stays within bc +/- 1.04 and
// wholly above the platform top at y .34, with the standing card kept well away from the doorway.
MallFit['甜品店:glass'] = { alpha: .15, gloss: .88 };
MallFit['甜品店:win'] = (W, bc, side) => {
  const ink = C('#33291f'), cream = C('#eee2cc'), plate = C('#f6f2e8');
  const rose = C('#e6a2b4'), berry = C('#a33e58'), mint = C('#a7ddc9');
  const taro = C('#c6b0e0'), matcha = C('#a9c46a'), mango = C('#f0b23c');
  const cocoa = C('#5c3e2c'), pastry = C('#dfb277'), warm = C('#ffeccd');
  const accent = side < 0 ? berry : matcha;
  const layers = side < 0 ? [rose, cream, taro] : [mango, cream, matcha];
  const cakeB = bc - side * .12;

  // The deck, dark card backdrop and two separated light lines make pale icing legible through
  // the pane. Each front face is offset in a, avoiding coplanar shimmer at grazing angles.
  W.put(4.18, bc, .94, 2.08, .045, .363, cream, { hard:true, gloss:.28 });
  W.put(3.79, bc, .070, 2.08, 1.30, 1.23, cocoa, { hard:true, gloss:.18 });
  W.put(3.835, bc, .014, 1.86, .040, 1.840, warm,
    { hard:true, mode:1, glow:.075 });
  W.put(3.842, bc, .012, 1.30, .030, .790, accent,
    { hard:true, mode:1, glow:.045 });

  // A low stone-and-pastry plinth carries the cake above the stall riser sightline.
  W.put(4.08, cakeB, .48, .92, .18, .480, pastry, { hard:true, gloss:.25 });
  W.put(4.08, cakeB, .51, .95, .024, .582, accent, { hard:true, gloss:.40 });
  W.cyl(4.08, cakeB, .610, .43, .035, plate, { gloss:.38 });
  W.cyl(4.08, cakeB, .700, .36, .17, layers[0], { gloss:.24 });
  W.cyl(4.08, cakeB, .850, .29, .14, layers[1], { gloss:.24 });
  W.cyl(4.08, cakeB, .980, .21, .13, layers[2], { gloss:.24 });
  W.cyl(4.08, cakeB, 1.055, .23, .030, plate, { gloss:.32 });

  // Five piped rosettes and three fruit pieces are enough to read as hand-finished decoration.
  for (let i = 0; i < 5; i++) {
    const q = i * Math.PI * 2 / 5;
    W.ball(4.08, cakeB + Math.sin(q) * .145, 1.090 + Math.cos(q) * .012,
      .043, .040, .043, cream, { gloss:.22 });
  }
  W.ball(4.08, cakeB - .055, 1.155, .052, .052, .052, berry, { gloss:.30 });
  W.ball(4.08, cakeB + .035, 1.165, .048, .048, .048, mango, { gloss:.30 });
  W.ball(4.08, cakeB + .090, 1.145, .042, .042, .042, mint, { gloss:.28 });

  // A blank colour-card suggests a changing house special without inventing a real-world brand.
  const cardB = bc + side * .72;
  W.put(4.315, cardB, .025, .34, .25, .530, plate,
    { hard:true, gloss:.24, ry:side * .08 });
  W.put(4.332, cardB, .010, .25, .035, .575, accent,
    { hard:true, mode:1, glow:.045, ry:side * .08 });
};

// ============================================================================ who is in here
// Three staff and eight customers, pushed onto the registry js/mall.js declares. game.js folds it
// into the roster before the world is built, so this file never touches that one — which is the
// whole point of MallCast, with eighteen tenants wanting people and one argument list to put them
// in. Every field an NPCS row takes works here.
//
// ---- coordinates, which is the one thing to get right.
//
// `at` and `patrol` are the MALL's world x/z. They are NOT this shop's (a, b). The unit is
// shop('S', 6.0, 9.0) on the south run, so the whole conversion is
//
//     x = 6.0 + b            z = 18.0 - a
//
// and note that z runs *backwards* against depth: the back wall (a 0) is z 18.0 and the shopfront
// (a 4.8) is z 13.2. Someone placed at a larger z is further inside the shop, not further out.
//
// `face` is a heading, and headings here point along (sin, cos): 0 looks towards +z, Math.PI
// towards −z. So everybody serving looks along Math.PI — out of the shop, at the customer — and
// everybody buying looks along 0, into the case. Swap that pair and the entire staff spends the
// day facing its own back wall while the queue studies the concourse.
//
// The staff aisle is 0.60 m wide: the tea bar's joinery ends at a 1.18 and the chilled case
// begins at a 1.775, so a 1.45–1.47 is the only band behind the counter a person fits in. The
// customers stand at a 3.15–3.28, which is a half metre clear of the case and till fronts at
// 2.725 and 2.71 and well short of the window platform at 3.655.
//
// `mallFloor: 2` on every row, including the ones out in the concourse. Without it they are put
// on the ground floor at the same x, z — standing inside another tenant's shop, four metres under
// their own feet.
MallCast.push(
  // ---- staff. Three, which is what a counter this long is worked by: one on the case, one on
  // the drinks, one on the till. All three stand in the aisle behind the counter, all three face
  // out. The two 店员 are deliberately 1.15 m apart in b so they do not overlap in the frame from
  // the door, which is the angle this shop is nearly always seen from.
  { hz:'店员', name:'王小满', py:'Wáng Xiǎomǎn', place:'mall', mallFloor:2,
    rig:'mall-dessert-clerk-wang-xiaoman', temper:'genial',
    look:{ skin:'#e8bb94', hair:'#241d1a', hairStyle:'bun', top:'#f3ece0', pants:'#3c4550',
      shoe:'#2b3034', apron:'#d2748d', collar:'shirt', cap:'#d2748d', badge:true,
      tall:.96, faceSeed:8811 },
    // b −0.70, behind the middle of the chilled case.
    spots:[{ h0:9, h1:22, at:[5.30, 16.55], face:Math.PI, act:'vend' }],
    lines:[['要哪一块？我给您装盒。', 'Which one would you like? I will box it up.'],
           ['芒果慕斯是今天早上做的。', 'The mango mousse was made this morning.'],
           ['蛋糕卷二十六，布丁十六。', 'The swiss roll is twenty-six, the pudding sixteen.']] },
  { hz:'店员', name:'何佳宁', py:'Hé Jiāníng', place:'mall', mallFloor:2,
    rig:'mall-dessert-clerk-he-jianing', temper:'brisk',
    look:{ skin:'#d9a87c', hair:'#2c2421', hairStyle:'ponytail', top:'#eae2d2', pants:'#414a56',
      shoe:'#e7e0d2', apron:'#b1566d', collar:'shirt', tall:1.00, faceSeed:8812 },
    // b −1.85, at the sealing machine, which is where a milk tea is finished.
    spots:[{ h0:9, h1:22, at:[4.15, 16.53], face:Math.PI, act:'work', held:null }],
    lines:[['珍珠奶茶要等三分钟。', 'The bubble tea will take three minutes.'],
           ['糖度可以选，三分糖最好喝。', 'You can choose the sugar — thirty percent is the best.'],
           ['冰淇淋是现打的，要蛋筒还是杯子？', 'The ice cream is soft-served — cone or cup?']] },
  { hz:'收银员', name:'陈子墨', py:'Chén Zǐmò', place:'mall', mallFloor:2,
    rig:'mall-dessert-cashier-chen-zimo', temper:'steady',
    look:{ skin:'#efc49e', hair:'#332a25', hairStyle:'bob', top:'#f1e8d8', pants:'#4a4048',
      shoe:'#31353a', vest:'#8c3f56', tall:.97, faceSeed:8813 },
    // b −3.60, behind the till, opposite the terminal she is actually ringing it up on.
    spots:[{ h0:9, h1:22, at:[2.40, 16.53], face:Math.PI, act:'vend' }],
    lines:[['一共三十八块，扫这边。', 'Thirty-eight altogether — scan over here.'],
           ['要袋子吗？袋子一块。', 'Would you like a bag? A bag is one kuai.'],
           ['堂食的话，靠窗那边可以坐。', 'If you are eating in, there are seats by the window.']] },

  // ---- the queue. Three deep along the case towards the till, which is the direction the shop
  // is laid out to be walked in, and the reason the belt barrier that used to stand at a 3.30 is
  // gone: a queue of people does that job without narrowing a 0.93 m walkway to 0.35.
  { hz:'顾客', place:'mall', mallFloor:2, temper:'eager',
    look:{ skin:'#dbaa83', hair:'#29211d', hairStyle:'ponytail', top:'#c9748a', pants:'#46566a',
      shoe:'#ece6da', bag:'tote', bagColor:'#d4ad55', tall:.99 },
    spots:[{ h0:10, h1:22, at:[4.10, 14.72], face:0, act:'buy' }] },      // b −1.90, at the case
  { hz:'顾客', place:'mall', mallFloor:2, temper:'patient',
    look:{ skin:'#c99269', hair:'#302622', hairStyle:'short', top:'#5f7688', pants:'#333a42',
      shoe:'#262b2e', collar:'shirt', tall:1.06 },
    // b −2.95, waiting, turned along the queue towards the till rather than at the glass.
    spots:[{ h0:10, h1:22, at:[3.05, 14.85], face:-Math.PI / 2, act:'wait' }] },
  { hz:'顾客', place:'mall', mallFloor:2, temper:'bustling',
    look:{ skin:'#e6b68c', hair:'#211b19', hairStyle:'bob', top:'#8d9f8a', pants:'#3f4d60',
      shoe:'#2f3439', pack:true, packColor:'#b06a3f', tall:.95 },
    spots:[{ h0:10, h1:22, at:[2.40, 14.80], face:0, act:'buy' }] },      // b −3.60, paying

  // ---- sitting down. Both of these are on furniture that exists, worked out rather than eyeballed.
  //
  // The chair is the harder one. `table()` in js/mall.js scatters its chairs off a hash of the
  // table's own x, z — angle, radius and a one-in-six chance of being pushed right back — so a
  // seat cannot be guessed from the table position, and a guess is a diner sitting in mid-air
  // beside their own chair. The +b−most table here is A.table(2.20, 1.95), which is world
  // (7.95, 15.80); running that hash gives its outer chair at (7.621, 15.002) turned to 0.392,
  // and the pan top at 0.50. Those four numbers are what is written below. Move the table and
  // they all change.
  { hz:'顾客', place:'mall', mallFloor:2, temper:'genial', seatY:.50,
    look:{ skin:'#d6a37b', hair:'#332b26', hairStyle:'short', top:'#7c8a6f', pants:'#3b434d',
      shoe:'#2a2f33', bag:'shoulder', bagColor:'#b9884d', tall:1.02 },
    spots:[{ h0:10, h1:22, at:[7.621, 15.002], face:0.392, act:'eat' }] },
  // And one on the wall bench, whose pan this file builds itself: cushion b 4.03–4.37 with its top
  // at 0.505, so hips at b 4.10 and looking away from the partition down the length of the seating.
  // Not 4.18, which is where they were first put: the partition's collision runs from b 4.40 and
  // is tested against a 0.28 body radius, so anything past b 4.12 is inside the wall as far as the
  // clamp is concerned and a shoulder ends up two centimetres off the plaster.
  { hz:'顾客', place:'mall', mallFloor:2, temper:'bored', seatY:.505,
    look:{ skin:'#e8ba90', hair:'#231d1a', hairStyle:'bob', top:'#a85f6d', pants:'#454b56',
      shoe:'#ebe4d7', tall:.98 },
    spots:[{ h0:10, h1:22, at:[10.10, 15.45], face:-Math.PI / 2, act:'phone' }] },

  // ---- and three on the move, because a shop where nobody is arriving or leaving is a tableau.
  //
  // This one walks in. The route crosses the shopfront line (z 13.2) twice and both crossings are
  // inside the 3 m opening, which spans x 4.5–7.5: the glass either side of it is a collider from
  // z 13.05 to 13.55 and a lap that clipped its corner would have her shouldering through a
  // window every twenty seconds. In the shop she keeps to a 3.2–3.5, the walkway between the case
  // front and the window platform, and a metre clear of the queue standing at a 3.15–3.28.
  { hz:'顾客', place:'mall', mallFloor:2, temper:'brisk',
    look:{ skin:'#d8ab84', hair:'#1f1a17', hairStyle:'bob', top:'#93707f', pants:'#3a4552',
      shoe:'#ded7c9', bag:'tote', bagColor:'#c4a05c', tall:.96 },
    patrol:[[2.0, 11.4], [3.6, 12.0], [5.2, 12.6], [5.9, 13.6], [5.6, 14.6], [5.1, 14.8],
            [6.2, 14.5], [6.9, 13.1], [5.0, 12.2], [3.0, 11.6], [2.0, 11.4]], speed:.94 },
  // Somebody stopped at the window with their nose to it, in front of the −b bay. 0.30 m off the
  // glass, which is where you stand when you are looking at a cake under a dome.
  { hz:'顾客', place:'mall', mallFloor:2, temper:'bored',
    look:{ skin:'#cfa079', hair:'#8d867e', hairStyle:'short', top:'#6d7b86', pants:'#3d444c',
      shoe:'#2b3034', jacket:'#4a5a63', tall:.95 },
    spots:[{ h0:10, h1:22, at:[3.00, 12.75], face:0, act:'wait' }] },
  // And a child doing laps of the other window, kept to z 11.7–12.5 so the loop never reaches the
  // glass and never crosses the walker's lap on the far side of the door.
  { hz:'小孩', place:'mall', mallFloor:2, temper:'eager',
    look:{ skin:'#efc39a', hair:'#2a211d', hairStyle:'tousled', top:'#e2ad3c', pants:'#54739a',
      shoe:'#e55243', tall:.70, wide:.82, youth:1, headScale:1.10, faceSeed:8821 },
    patrol:[[8.2, 11.7], [9.8, 12.2], [8.6, 12.5], [7.4, 12.0], [8.2, 11.7]], speed:1.22 },
);
