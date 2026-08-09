// 美妆店 · 云裳美妆 · YUNSHANG BEAUTY — floor 2
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
// Leave this as `null` and the shop keeps whatever js/mall.js already builds for it.
//
// ---------------------------------------------------------------- notes for the next tenant
//
// Two things about `A.put` that the line above does not say, and both cost time to find out:
//
//   * its third argument is the extent along `a` and its fourth the extent along `b`, whatever
//     they are called. `counter()` in mall.js calls it `A.put(a,b,dp,w,...)` and that is the
//     truth of it. The sixth argument is the *centre* height, not the base.
//   * `rz` in the options is a rotation about world Z. This unit is on the W wall, where world
//     X is `a` and world Z is `b`, so `rz` tilts a thing forwards or backwards in the (a, y)
//     plane — which is exactly what an angled tester tray needs — and `rz: Math.PI/2` stands a
//     cylinder on its side facing the door, which is how the round mirrors are made. Both of
//     those are only true because this shop is on the W wall. On N or S they swap.
//
// A cosmetics shop is small, regular and repeated: the density of little identical boxes is what
// makes it read as one. Nearly every prop below is inside a loop for that reason, and the whole
// room is six colours — one per brand bay — against black trim, lacquer white and warm light.
//
// Two things this fit-out takes off the shell rather than adding to it, both because the shell is
// built for eighteen tenants and this one is not the average of them:
//
//   * the slatted timber feature panel on the back wall is lined over in blush lacquer. It is the
//     largest surface in the room and the thing the door looks straight at, and orange-brown
//     behind a pink counter is a sauna. The lining stops short of the shell's own gold lettering
//     in depth and short of the light strip above it in height, so both still do their job.
//   * the shell's lightbox on the -b partition is covered by the till's own back wall, which is
//     sized to meet the one bay on that side rather than to leave a joint between them.
MallFit['美妆店'] = A => {
  // ---------------------------------------------------------------- palette
  // Trim, joinery and metal match the shell so the fit-out looks like part of the building; the
  // six brand colours are the only saturated thing in the room and they are all emissive, which
  // is what a lit bay actually is. Every colour a texture lands on has been walked *down* first:
  // the shader does `base *= mix(1, texel/0.22, matAmt)` and no map here averages 0.22, so a
  // material on a colour that already looks right comes out blown to white.
  //
  // Every white in here has been walked *down* a step from the one it looks like on paper. The
  // first version of this shop used the shell's own #efe9df for the joinery, and a lacquer white
  // under three lamps and a ceiling grid is not white, it is 1.0 across all three channels with
  // no gradient in it: the vanity, the gondolas and the floor came out as one milky field with
  // the black trim lines floating in it. What makes a bright shop read is contrast, not level.
  //
  // The two blacks are the one thing walked back *up* after the first look at the room. #1e2226
  // and #2b2e32 are the values a paint chart calls near-black, and near-black under a bright
  // ceiling in a renderer with no bounce is simply black: the bay jambs, the head boards and the
  // gondola end frames all came out as holes cut in the picture, with no shading across them at
  // all and every one of them the highest-contrast thing in its part of the frame. A dark trim
  // has to be dark enough to draw a line and light enough to have a lit side and a shadowed one.
  // Warm-neutral rather than blue: the first lift went to #2b3138, which has enough blue in it
  // that under this room's warm light the gondola frames read as moulded plastic against six
  // pinks. A near-black wants to be on the same side of neutral as the light falling on it.
  const P = {
    ink:    C('#322f33'), trim:   C('#423e42'),
    lac:    C('#d6cfc2'), lacS:   C('#bcb4a7'), marble: C('#c9c2b0'),
    chrome: C('#a8b2b9'), steel:  C('#8d979e'),
    gold:   C('#c9a04b'), goldL:  C('#f0cf7c'),
    warm:   C('#ffeccd'), cream:  C('#ded2ba'), pearl:  C('#d5ccb9'),
    mirror: C('#dde5e6'), acryl:  C('#b3c6ce'),
    rose:   C('#d2748d'), roseD:  C('#8e3d53'), blush:  C('#f0cdd2'),
    plum:   C('#7d5a96'), jade:   C('#4f9d8c'), amber:  C('#d9a34a'),
    sky:    C('#5f9cc8'), coral:  C('#d9705a'), berry:  C('#a8384a'),
    // the back wall behind the vanity, and the joinery of the vanity itself
    wall:   C('#a8848e'), wallD:  C('#83656e'),
    carc:   C('#583842'), draw:   C('#a4737d'),
  };
  // Blend two of them. Used for the bottom half of a lit bay: a panel that is one flat value from
  // the plinth to the head board is a poster, and a bay is a light box with a floor in it.
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t,
                            a[2] + (b[2] - a[2]) * t];
  // The six bays, in the order they run round the room. Each is a colour, a two-character brand
  // and the two sorts of thing that brand sells — two rather than one, because four shelves of
  // the same silhouette is a warehouse rack, and two alternating is what a brand bay looks like.
  //
  // Two of the six are named for a *category* rather than a house, and that is what makes the shop
  // sell what the catalogue says it sells. `MALL_GOODS['美妆店']` lists five things — 口红 香水 面霜
  // 面膜 洗发水 — and the last two had nowhere to be: there was no jar of cream you could point at
  // and not one shampoo bottle in the building. 洗护 is the haircare wall and 青竹 is the skincare
  // one, so every word the till can charge you for is a shelf you can walk up to.
  const BRAND = [
    { c: P.rose,  n: '玫瑰', k: 'flask',  k2: 'carton' },
    { c: P.plum,  n: '洗护', k: 'bottle', k2: 'bottle' },
    { c: P.amber, n: '金晞', k: 'mask',   k2: 'pot'    },
    { c: P.jade,  n: '青竹', k: 'pot',    k2: 'tube'   },
    { c: P.sky,   n: '海蓝', k: 'flask',  k2: 'tube'   },
    { c: P.coral, n: '朝霞', k: 'carton', k2: 'pot'    },
  ];
  const FRONT = 4.8;                      // a at the shopfront glass; mall.js calls it D

  // A repeatable wobble, so twenty boxes in a row are twenty boxes rather than one box twenty
  // times. Deterministic, because a shop that is different on every load cannot be looked at.
  const h = n => { const x = Math.sin(n * 91.7 + 13.3) * 43758.5453; return x - Math.floor(x); };

  // ---------------------------------------------------------------- the goods
  // (a, b, surface height, colour, seed, x). Each is two or three primitives: a carton is a body
  // and a foil lid, a bottle is a body and a shoulder and a cap. One coloured cube per product is
  // the thing that makes a shelf read as a shelf of cubes.
  //
  // `x` is whatever the run that placed it needs to say. Only two kinds of thing here care: a
  // carton has a front and has to be turned to face out of a side wall ('b'), and a lipstick in
  // an angled tester tray has to lean over with the tray (a number of radians). The round ones
  // ignore it, because a bottle looks the same from every side.
  const G = {
    carton(a, b, y, c, s, x) {                           // a boxed product, standing up
      const w = .088 + h(s) * .030, ht = .125 + h(s * 3) * .062, t = x === 'b';
      A.put(a, b, t ? w : .062, t ? .062 : w, ht, y + ht / 2, c,
        { mode: 7, round: .010, tag: '化妆品' });
      A.put(a, b, t ? w * .94 : .058, t ? .058 : w * .94, .018, y + ht + .006, P.goldL,
        { hard: true, mode: 7, tag: '化妆品' });
    },
    // A cream jar with a gold lid. Tagged 面霜 and not the generic 化妆品 it was, for two reasons:
    // 面霜 is one of the five things this shop can actually sell, and — the one that matters —
    // 化妆品 has no row in js/vocab.js. `Vocab.get` has no fallback and game.js builds the walk-up
    // prompt out of `Vocab.get(best.hz).en`, so a thing headed with a word the dictionary has never
    // heard of is not a missing label, it is a TypeError on the first frame you stand near it.
    pot(a, b, y, c, s) {
      const r = .030 + h(s) * .010;
      A.cyl(a, b, y + r * .78, r, r * 1.56, c, { gloss: .52, tag: '面霜' });
      A.cyl(a, b, y + r * 1.72, r * 1.06, .020, P.goldL, { gloss: .70, tag: '面霜' });
    },
    // Shampoo and conditioner: the tall square-shouldered bottle with a pump, which is the one
    // silhouette in the trade that is not under eighteen centimetres and round. A haircare wall
    // reads as a haircare wall from the door because of the height alone.
    bottle(a, b, y, c, s) {
      const ht = .168 + h(s) * .052;
      A.cyl(a, b, y + ht / 2, .034, ht, c, { gloss: .42, tag: '洗发水' });
      A.taper(a, b, y + ht + .013, .068, .026, .068, c, { gloss: .42, tag: '洗发水' });
      A.cyl(a, b, y + ht + .040, .009, .034, P.ink, { gloss: .56, tag: '洗发水' });
      A.cyl(a, b, y + ht + .062, .020, .014, P.ink, { gloss: .56, tag: '洗发水' });
    },
    flask(a, b, y, c, s) {                               // a perfume: body, shoulder, neck, cap
      const k = .82 + h(s) * .34;
      A.cyl(a, b, y + .052 * k, .030, .104 * k, c, { gloss: .60, tag: '香水' });
      A.taper(a, b, y + .118 * k, .060, .034 * k, .060, c, { gloss: .60, tag: '香水' });
      A.cyl(a, b, y + .146 * k, .011, .028 * k, P.chrome, { gloss: .70, tag: '香水' });
      A.cyl(a, b, y + .170 * k, .017, .026 * k, P.goldL, { gloss: .74, tag: '香水' });
    },
    tube(a, b, y, c, s) {                                // mascara, lip gloss, a foundation tube
      const ht = .092 + h(s) * .034;
      A.cyl(a, b, y + ht / 2, .0145, ht, c, { gloss: .44, tag: '化妆品' });
      A.cyl(a, b, y + ht + .016, .0160, .032, P.ink, { gloss: .58, tag: '化妆品' });
    },
    // A box of sheet masks: the flattest thing in the trade, wide and thin, with a paper band
    // across the front. Kept narrower than the 12.8 cm shelf pitch so a row of them stands side
    // by side and touches rather than growing through its neighbour.
    mask(a, b, y, c, s, x) {
      const w = .100 + h(s) * .024, ht = .148 + h(s * 3) * .028, t = x === 'b';
      A.put(a, b, t ? w : .044, t ? .044 : w, ht, y + ht / 2, c,
        { mode: 7, round: .008, tag: '面膜' });
      A.put(a, b, t ? w * .52 : .052, t ? .052 : w * .52, .032, y + ht * .70, P.cream,
        { hard: true, mode: 7, tag: '面膜' });
    },
    // A lipstick, standing on a surface that may be tilted towards you by `x` radians. The tilt
    // has to be carried by the object as well as the tray, and each piece has to be pushed out
    // along the tray's own normal or the bullet grows out of the slope at an angle.
    bullet(a, b, y, c, s, x) {
      const t = typeof x === 'number' ? x : 0;
      const nx = -Math.sin(t), ny = Math.cos(t), o = { rz: t, tag: '口红' };
      const at = d => [a + nx * d, y + ny * d];
      let q = at(.028); A.cyl(q[0], b, q[1], .0150, .056, P.gold, { ...o, gloss: .66 });
      q = at(.072);     A.cyl(q[0], b, q[1], .0128, .034, c, { ...o, gloss: .54 });
      q = at(.098);     A.taper(q[0], b, q[1], .0250, .019, .0250, c, { ...o, gloss: .50 });
    },
  };
  // Fill a straight run with one kind of thing, tight and evenly. `pitch` is the target spacing;
  // the run is divided into a whole number of them so the ends are never half-empty.
  const runB = (a, b0, b1, y, pitch, kind, cs, s0, x) => {
    const n = Math.max(1, Math.round((b1 - b0) / pitch)), st = (b1 - b0) / n;
    for (let i = 0; i < n; i++)
      G[kind](a, b0 + st * (i + .5), y, cs[(i + s0) % cs.length], s0 * 7 + i, x);
  };
  // The same along the depth axis, for the bays on the two side partitions. Everything it places
  // faces out of a side wall, so cartons are handed 'b' and come out turned ninety degrees.
  const runA = (b, a0, a1, y, pitch, kind, cs, s0) => {
    const n = Math.max(1, Math.round((a1 - a0) / pitch)), st = (a1 - a0) / n;
    for (let i = 0; i < n; i++)
      G[kind](a0 + st * (i + .5), b, y, cs[(i + s0) % cs.length], s0 * 5 + i, 'b');
  };

  // ---------------------------------------------------------------- lit brand bays
  // The signature fixture of this trade: a black recess, one colour glowing behind it, glass
  // shelves with an LED under the front edge of each, and a tight grid of small product. Six of
  // them round the walls in six colours. The colour *is* the brand, so the bay carries almost no
  // other decoration — a name on the head board and nothing else.
  // ---- the emissive budget, and how it was arrived at
  //
  // Every glow number below is lower than the one it replaced, and not by taste. Rendering this
  // room's own camera twice — once as it ships and once with `__game.perfLevel(2)`, which is the
  // preset that turns bloom and AO off — showed that the milky veil hanging over the whole frame,
  // with a blurred rosette from the mirror bulbs and blurred shelves in it, was the *bloom buffer*
  // and nothing else. With post off the same shot is crisp. Nothing was wrong with the geometry,
  // the lights or the colours; there was simply more lit surface in here than in any other tenant.
  //
  // Bloom in this renderer is thresholded on luminance and it does not care what is emitting: six
  // brand bays at 1.4 m² each, thirty shelf strips, a two-square-metre panel behind the till and
  // forty-two bulbs added up to something like fifteen square metres of emitter in a room 4.8 by
  // 10. The lesson is the one already in the file about spheres, one step further out: it is the
  // *area* times the level that blooms, so a shop of lit boxes has to keep each of them dim.
  //
  // What kept its level: the four shelf strips inside each bay, because a lit shelf edge is the
  // whole trick of this trade, and they are 14 mm tall. What came down hardest: the flat coloured
  // backs, which are the largest emitters and the ones a bay reads by colour rather than by
  // brightness anyway.
  const SH = [.62, 1.14, 1.66, 2.18];        // shelf heights, shared by every bay in the shop
  // The colours the goods in a bay are stocked in. Weighted towards the brand's own: an even
  // spread of one saturated colour against three creams came out as a shelf of white boxes with
  // an occasional pink one, which is a chemist rather than a beauty hall.
  const stock = c => [c, c, P.pearl, c, P.cream];
  function bayBack(b, w, br, s0) {
    const lo = mix(br.c, P.ink, .46), K = [br.k, br.k2, br.k, br.k2];
    // The lit back in two panels, abutting exactly at 1.34: a bay is a light box with a floor in
    // it, and one flat value from the plinth to the head board is a poster of a bay. They meet
    // rather than overlap — coplanar faces that share screen pixels z-fight, ones that only
    // share an edge do not.
    A.put(.42, b, .05, w - .12, 1.28, 1.98, br.c, { hard: true, mode: 1, glow: .075 });
    A.put(.42, b, .05, w - .12, 1.02, .83, lo, { hard: true, mode: 1, glow: .03 });
    for (const s of [-1, 1])
      A.put(.63, b + s * (w / 2 - .035), .47, .07, 2.42, 1.47, P.ink, { hard: true, gloss: .26 });
    A.put(.63, b, .47, w, .11, 2.68, P.trim, { hard: true, gloss: .30 });      // head board
    A.put(.858, b, .022, w - .20, .024, 2.598, P.warm,                         // valance light
      { hard: true, mode: 1, glow: .16 });
    A.put(.63, b, .47, w, .28, .18, P.trim, { hard: true, gloss: .28 });       // plinth
    A.put(.872, b, .020, w - .20, .020, .332, P.warm, { hard: true, mode: 1, glow: .07 });
    A.glyph(.875, b, 2.68, br.n, { size: .086, gap: .030, color: P.cream, glow: .08 });
    for (let i = 0; i < SH.length; i++) {
      const y = SH[i];
      A.put(.66, b, .40, w - .16, .030, y, P.acryl, { hard: true, gloss: .78 });
      A.put(.856, b, .014, w - .18, .026, y - .030, P.warm, { hard: true, mode: 1, glow: .18 });
      runB(.68, b - w / 2 + .12, b + w / 2 - .12, y + .015, .128, K[i], stock(br.c), s0 + i);
    }
  }
  // The same fixture turned through ninety degrees onto a side partition. Written out rather
  // than folded into the one above: a mapper between the two frames reads worse than the shapes.
  // No name on the head board, and not by oversight: `A.glyph` writes on the plane the shopfront
  // faces, so lettering on a side partition would be read from inside the neighbour's wall.
  function baySide(sg, aC, aw, br, s0) {
    const bw = sg * 4.74, bf = sg * 4.53, lo = mix(br.c, P.ink, .46);
    const K = [br.k, br.k2, br.k, br.k2];
    A.put(aC, bw, aw - .12, .05, 1.28, 1.98, br.c, { hard: true, mode: 1, glow: .075 });
    A.put(aC, bw, aw - .12, .05, 1.02, .83, lo, { hard: true, mode: 1, glow: .03 });
    for (const s of [-1, 1])
      A.put(aC + s * (aw / 2 - .035), bf, .07, .47, 2.42, 1.47, P.ink, { hard: true, gloss: .26 });
    A.put(aC, bf, aw, .47, .11, 2.68, P.trim, { hard: true, gloss: .30 });
    A.put(aC, sg * 4.288, aw - .20, .022, .024, 2.598, P.warm,
      { hard: true, mode: 1, glow: .16 });
    A.put(aC, bf, aw, .47, .28, .18, P.trim, { hard: true, gloss: .28 });
    for (let i = 0; i < SH.length; i++) {
      const y = SH[i];
      A.put(aC, sg * 4.50, aw - .16, .40, .030, y, P.acryl, { hard: true, gloss: .78 });
      A.put(aC, sg * 4.296, aw - .18, .014, .026, y - .030, P.warm,
        { hard: true, mode: 1, glow: .18 });
      runA(sg * 4.48, aC - aw / 2 + .12, aC + aw / 2 - .12, y + .015, .128, K[i],
        stock(br.c), s0 + i);
    }
  }

  // ---------------------------------------------------------------- gondolas
  // Double-sided runs down the middle of the floor, four shelves a side, with a lit header over
  // the top and — on the aisle face, at the height a hand falls — an angled tester tray of
  // lipsticks instead of the bottom shelf. That tray is the whole reason to come in.
  const TILT = -.38;                        // tester trays lean their far edge up towards you
  function gondola(bC, len, br1, br2, s0) {
    const aC = 2.70, half = len / 2, sg = Math.sign(bC), bIn = bC - sg * half;
    A.put(aC, bC, .68, len, .16, .08, P.trim, { hard: true, gloss: .30 });          // plinth
    A.put(aC, bC, .12, len, 1.28, .80, P.lacS,
      { hard: true, gloss: .26, mat: 'steel', matScale: .75, matAmt: .22 });        // spine
    for (const s of [-1, 1])
      A.put(aC, bC + s * (half - .028), .68, .055, 1.36, .84, P.lac, { hard: true, gloss: .32 });
    // The end that faces down the middle of the shop is an end-cap: a lit panel and three short
    // shelves, which is the one part of a gondola run anybody walking in actually sees square on.
    // Two panels stacked rather than one, abutting exactly at 0.70 — they share that plane but
    // not a single pixel of it, which is the difference between a seam and a z-fight.
    A.put(aC, bIn - sg * .025, .60, .04, .76, 1.08, br1.c, { hard: true, mode: 1, glow: .09 });
    A.put(aC, bIn - sg * .025, .60, .04, .46, .47, mix(br1.c, P.ink, .46),
      { hard: true, mode: 1, glow: .035 });
    for (const s of [-1, 1])
      A.put(aC + s * .30, bIn - sg * .140, .08, .24, 1.38, .85, P.ink, { hard: true, gloss: .26 });
    A.put(aC, bIn - sg * .140, .68, .24, .07, 1.500, P.trim, { hard: true, gloss: .30 });
    A.put(aC, bIn - sg * .140, .68, .24, .14, .23, P.trim, { hard: true, gloss: .30 });
    for (let i = 0; i < 3; i++) {
      const y = .54 + i * .32;
      A.put(aC, bIn - sg * .140, .56, .19, .028, y, P.lac, { hard: true, gloss: .38 });
      A.put(aC, bIn - sg * .228, .54, .014, .026, y - .028, P.warm,
        { hard: true, mode: 1, glow: .18 });
      runA(bIn - sg * .140, aC - .26, aC + .26, y + .014, .125,
        ['pot', 'carton', 'flask'][i], stock(br1.c), s0 + i * 2);
    }
    // Header: one lit band per run, capped with the same black trim the rest of the shop is
    // edged in, and a warm line under it washing down onto the top shelf.
    //
    // The brand on each face used to be `玫瑰 · 金晞` — six characters, and every character in
    // this renderer is its own draw call because it carries an atlas cell that cannot be a
    // batch uniform. Two runs, two faces, twenty-four calls for a strapline nobody reads at a
    // glance. Each face now names the brand it is actually stocked with, which is both four
    // calls instead of twelve and what the sign on a gondola run says.
    A.put(aC, bC, .22, len, .18, 1.61, br1.c, { hard: true, mode: 1, glow: .085 });
    A.put(aC, bC, .26, len + .04, .035, 1.718, P.trim, { hard: true, gloss: .30 });
    for (const s of [-1, 1])
      A.put(aC + s * .134, bC, .022, len - .06, .022, 1.503, P.warm,
        { hard: true, mode: 1, glow: .18 });
    A.glyph(2.826, bC, 1.61, br1.n, { size: .105, gap: .038, color: P.cream, glow: .09 });
    A.glyph(2.574, bC, 1.61, br2.n, { size: .105, gap: .038, color: P.cream, glow: .09,
      back: true });
    const b0 = bC - half + .09, b1 = bC + half - .09;
    for (const [fa, ra, sg, br] of [[2.90, 3.046, 1, br1], [2.50, 2.354, -1, br2]]) {
      // Bay uprights, roughly every seventy centimetres, which is what divides a gondola run
      // into bays and is most of why one reads as shopfitting rather than a wall of product.
      const nu = Math.max(2, Math.round(len / .70));
      for (let i = 0; i <= nu; i++)
        A.put(fa, bC - half + i * (len / nu), .28, .028, 1.22, .80, P.chrome,
          { hard: true, gloss: .48 });
      const ys = sg > 0 ? [.72, 1.00, 1.28] : [.40, .72, 1.00, 1.28];
      for (let i = 0; i < ys.length; i++) {
        const y = ys[i];
        A.put(fa, bC, .28, len - .10, .028, y, P.lac, { hard: true, gloss: .38 });
        A.put(ra, bC, .014, len - .08, .034, y - .026, P.trim, { hard: true, gloss: .32 });
        // The strip in the shelf edge was at glow .03 and did nothing at all, which left four
        // 44 mm bands of near-black ruled across each face of every run. A ticket rail on a
        // gondola is lit; that is most of why one looks stocked rather than shadowed.
        A.put(ra + sg * .010, bC, .008, len - .12, .018, y - .026, P.warm,
          { hard: true, mode: 1, glow: .13 });
        runB(fa, b0, b1, y + .014, .142, ['carton', 'pot', 'tube', 'mask'][i],
          stock(br.c), s0 + i * 3);
      }
      if (sg > 0) {                         // the tester tray, in place of the bottom shelf
        A.put(2.90, bC, .34, len - .10, .050, .465, P.trim,
          { hard: true, gloss: .40, rz: TILT });
        A.put(2.90, bC, .30, len - .16, .012, .494, P.blush,
          { hard: true, mode: 1, glow: .06, rz: TILT });
        const ny = Math.cos(TILT), nx = -Math.sin(TILT);
        runB(2.90 + nx * .031, b0, b1, .465 + ny * .031, .108, 'bullet',
          [P.roseD, P.rose, P.coral, P.plum, P.berry, P.amber], s0, TILT);
      }
    }
  }

  // ---------------------------------------------------------------- the back wall itself
  // The shell finishes every tenant's back wall the same way: a slatted timber feature panel
  // 4.2 m wide and 2.5 m high with the shop's name in gold across it. That is right for the
  // bookshop and wrong here, and wrong at the worst possible scale — it is the largest single
  // surface in the room, it is what the door looks straight at, and a saturated orange-brown
  // wall behind a pink counter reads as a sauna with makeup in it.
  //
  // So it is lined over in blush lacquer. Three numbers govern where:
  //
  //   * the shell's lettering sits at a = .42 and `glyphs` stands its quads off by another
  //     12 mm, so nothing here may come further out than about .425 or the name is buried.
  //   * the light strip washing down the wall is at 2.93–3.03, and the lining stops under it.
  //   * the counter's stone top runs to a = 1.13, well clear, so the lining is a wall and not
  //     a back panel to the joinery.
  //
  // Four warm slots break it up, placed in the gaps between the three mirrors and outboard of
  // them — 4.3 m of one flat value would have swapped one problem for another.
  A.put(.400, 0, .020, 4.30, 2.46, 1.69, P.wall, { hard: true, gloss: .24 });
  for (const y of [2.925, .475])
    A.put(.411, 0, .016, 4.34, .050, y, P.trim, { hard: true, gloss: .32 });
  for (const s of [-1, 1]) for (const d of [.72, 1.95]) {
    A.put(.411, s * d, .016, .108, 1.66, 1.86, P.wallD, { hard: true, gloss: .18 });
    A.put(.421, s * d, .010, .044, 1.54, 1.86, P.warm, { hard: true, mode: 1, glow: .15 });
  }
  // Fluting, between the two trim bands. Four and a bit square metres of one flat value with three
  // mirrors hung on it came out as a painted board with three portholes in it: the wall was the
  // biggest object in the hero shot and the only one with no shape at all. What gives a wall shape
  // in a renderer with no bounce light is not its colour, it is a run of edges that each catch the
  // room differently — so this is a rhythm of shallow ribs at a hand's spacing, in the wall's own
  // darker value, which is how every cosmetics hall in the world finishes the panel behind the bar.
  //
  // Three numbers box them in. They start at the wall face (.410) and stop at .4225, because the
  // shell's own gold lettering sits at .42 and stands its quads off by another 12 mm — anything
  // past about .425 buries the shop's name. They run 0.52 to 2.88 in height, which is the gap
  // *between* the two trim bands rather than across them: a rib crossing a band would put two
  // faces 2 mm apart on the same plane, which is the z-fight this file keeps warning about. And
  // they skip the four lit slots, whose housings are the same colour and are ribs already.
  for (let i = 0; i <= 22; i++) {
    const b = -2.06 + i * (4.12 / 22);
    if ([.72, 1.95].some(d => Math.abs(Math.abs(b) - d) < .10)) continue;
    A.put(.4165, b, .013, .038, 2.36, 1.70, P.wallD, { hard: true, gloss: .20 });
  }

  // ---------------------------------------------------------------- the makeover vanity
  // Straight in front of the door: a lacquer counter, three round mirrors with fourteen bulbs
  // round each, and three stools pushed in. The shop's name is glyphed on the wall at 1.95, so
  // nothing here is allowed above 1.81.
  //
  // Four metres wide rather than the five it would take: the shot from the door only sees about
  // three metres of back wall, and a vanity that fills all of it pushes the lit bays either side
  // of it out of the frame entirely.
  //
  // The carcass is a deep rose lacquer and not the pale one it was. Pale was the obvious choice
  // and it failed in a way worth writing down: four square metres of #b98c98 under three lamps,
  // with drawer fronts 25 mm proud in a colour one step off it, came out as a single flat candy
  // slab with three hairlines in it — the largest object in the shop and the only one with no
  // shape. What makes joinery read is not its colour, it is the shadow between its parts. The
  // fronts now stand 55 mm off a carcass two values darker, with a 58 mm gap between each pair,
  // and the gap does the work.
  A.put(.72, 0, .48, 4.10, .13, .065, P.trim, { hard: true, gloss: .30 });          // toe plinth
  A.put(.74, 0, .56, 4.10, .70, .48, P.carc, { hard: true, gloss: .30 });           // carcass
  for (let i = 0; i < 5; i++) {
    const b = -1.64 + i * .82;
    A.put(1.048, b, .052, .762, .60, .49, P.draw, { hard: true, gloss: .40 });      // drawer front
    A.put(1.090, b, .026, .300, .022, .625, P.goldL, { hard: true, gloss: .66 });   // handle
  }
  A.put(1.086, 0, .028, 4.02, .026, .175, P.gold, { hard: true, gloss: .58 });      // brass kick
  // The top is stone, but at matScale .72 the paving map put a 70 cm block joint across a
  // vanity — a counter with a pavement laid on it. Small scale and a light hand is grain.
  A.put(.78, 0, .70, 4.22, .06, .86, P.marble,
    { hard: true, gloss: .46, mat: 'paving', matScale: .34, matAmt: .17 });         // stone top
  A.put(1.106, 0, .014, 4.06, .018, .812, P.warm,                                   // under-lip LED
    { hard: true, mode: 1, glow: .15 });
  for (const b of [-1.35, 0, 1.35]) {
    A.cyl(.500, b, 1.375, .430, .086, P.goldL, { rz: Math.PI / 2, gloss: .62, tag: '镜子' });
    // The glass as a very shallow dome rather than a flat disc. A disc facing the door has one
    // normal across its whole face, so it shades as a single flat tint whatever the light in
    // the room is doing — which is exactly why these read as portholes. A dome's normals fan
    // out and the room crosses it, which is the nearest thing to a reflection available here.
    A.ball(.545, b, 1.375, .022, .356, .356, P.mirror, { gloss: .84, tag: '镜子' });
    for (let i = 0; i < 14; i++) {                 // the bulbs, which is what a vanity mirror is
      const t = i * Math.PI * 2 / 14;
      // .16 and not the .22 these started at. The glow pass is additive and concentrates on a
      // sphere where it spreads along a strip, so forty-two of them at .22 put a haze over the
      // whole back wall — the one thing this fitting must not do is fog what it is lighting.
      A.ball(.565, b + Math.cos(t) * .393, 1.375 + Math.sin(t) * .393, .026, .026, .026,
        P.warm, { mode: 1, glow: .125, tag: '镜子' });
    }
    // A stool tucked under the counter, so the aisle behind stays walkable.
    A.cyl(1.40, b, .022, .215, .044, P.steel, { gloss: .50 });                      // foot
    A.cyl(1.40, b, .365, .034, .640, P.chrome, { gloss: .62 });                     // column
    A.cyl(1.40, b, .245, .150, .020, P.chrome, { gloss: .55 });                     // foot ring
    A.cyl(1.40, b, .652, .180, .022, P.trim, { gloss: .34 });                       // seat rim
    A.cyl(1.40, b, .690, .175, .060, P.roseD, { mode: 7, gloss: .10 });             // cushion
  }
  // What is on the counter. Testers go in blocks on lit acrylic risers, not in one unbroken
  // row: a shop lays lipstick out in trays of a shade family, and an even fence of forty
  // across four metres reads as a railing round the counter rather than as stock on it.
  for (let i = 0; i < 4; i++) {
    const b = -1.72 + i * 1.148;
    A.put(.97, b, .30, .76, .036, .912, P.acryl, { hard: true, gloss: .78, tag: '口红' });
    A.put(.97, b, .26, .70, .008, .938, P.blush,
      { hard: true, mode: 1, glow: .06, tag: '口红' });
    for (const aa of [.88, 1.06])
      runB(aa, b - .32, b + .32, .942, .112, 'bullet',
        [P.roseD, P.rose, P.coral, P.berry, P.plum, P.amber], i * 5 + (aa > 1 ? 3 : 0));
  }
  for (const b of [-1.15, 1.15]) {              // brush pots, and a pair of jars beside each
    A.cyl(.90, b, .960, .054, .140, P.acryl, { gloss: .72, tag: '化妆品' });
    for (let i = 0; i < 7; i++) {
      const t = i * Math.PI * 2 / 7, r = .030;
      A.cap(.90 + Math.cos(t) * r, b + Math.sin(t) * r, 1.115, .011, .150, .011,
        [P.ink, P.roseD, P.gold][i % 3], { gloss: .30, tag: '化妆品' });
    }
    G.pot(1.05, b + .17, .89, P.blush, b * 3);
    G.pot(1.05, b - .17, .89, P.pearl, b * 5);
  }
  G.flask(.80, -.10, .89, P.plum, 31);          // fragrance pair, behind the blotter service
  G.flask(.80, .10, .89, P.rose, 37);

  // ---- 试香纸 · the usable half of a fragrance tester -----------------------------------------
  // Bottles alone make a perfume display, not a tester. The centre gap between the two lipstick
  // risers is only 38.8 cm wide, so this stays entirely inside it and on the existing vanity top:
  // six fresh paper strips, one sampled strip with a dipped tip, and the discard cup it goes into.
  // The perfume pair moves 14 cm back on the same top to leave the paper in the customer's hand
  // line; no stock or service route moves and the vanity collider remains the only collider here.
  //
  // Eleven matte primitives, two existing mesh signatures (box/cylinder), no alpha, glow, light,
  // callback or floor footprint. Every flat strip starts 2 mm above the stone, so none shares its
  // plane with the top.
  const blotterPut = (role, a, b, da, db, h, y, cc, ry=0) => {
    const p = A.put(a, b, da, db, h, y, cc,
      { hard:true, mode:7, gloss:.04, ry, tag:'香水' });
    p.mallBeautyBlotter = role; return p;
  };
  const blotterCyl = (role, a, b, y, radius, height, cc) => {
    const p = A.cyl(a, b, y, radius, height, cc, { mode:7, gloss:.04, tag:'香水' });
    p.mallBeautyBlotter = role; return p;
  };
  for (let i = 0; i < 6; i++)
    blotterPut('clean', 1.00, -.168 + i * .020, .140, .014, .004, .894,
      P.cream, (i - 2.5) * .025);
  blotterPut('sampled', 1.00, .025, .140, .014, .004, .894, P.cream, -.10);
  blotterPut('sample-tip', 1.052, .030, .036, .014, .003, .8995, P.roseD, -.10);
  blotterCyl('discard-body', 1.01, .145, .936, .047, .088, P.trim);
  blotterCyl('discard-rim', 1.01, .145, .982, .050, .006, P.pearl);
  blotterCyl('discard-inside', 1.01, .145, .987, .040, .004, P.ink);
  A.stop(.34, 1.62, -2.15, 2.15);

  // ---------------------------------------------------------------- 试色台 · matching and hygiene
  // What a beauty counter is actually for, and none of which this shop had: somewhere to be
  // matched to a shade, and the disposable kit that makes trying anything on hygienic.
  //
  // It all stands on the vanity top at a 0.85–1.05, inside the vanity's own collider — so it
  // costs the room no floor — and in the band the flood fill reports as reachable in front of it:
  // the cross aisle at a 1.95–2.05 runs from b −2.95 to +3.85, and every word hung on this
  // fixture below has its focus point there. Anything that would need a *second* place to stand
  // is in the word cards instead: the skin-type questions, the routine and the seasonal sets are
  // sentences, and a sentence is free where a fixture is forty primitives.
  //
  // Budget: 39 primitives for the three fixtures together.
  const SHADE = ['#f0d3b8', '#e8c4a4', '#dcb28e', '#cf9f79', '#c08c66', '#a97650',
                 '#d9707e', '#c2455a', '#a8384a', '#8e3d53', '#b8566b', '#7d3a52'];
  const reducedMotion = () => {
    try {
      if (typeof window !== 'undefined' && window.MotionSafety && window.MotionSafety.reduced)
        return !!window.MotionSafety.reduced();
      return typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  };
  // Base at 1.04 − 0.15 = 0.89, which is the vanity's own top surface. At the 1.02 this started at
  // the board's bottom 20 mm were inside the stone.
  A.put(.90, -.30, .05, .38, .30, 1.04, P.trim, { hard: true, gloss: .30, tag: '口红' });
  A.put(.928, -.30, .012, .34, .26, 1.04, P.lac, { hard: true, gloss: .22, tag: '口红' });
  const shadeChips = [];
  SHADE.forEach((hex, i) => {
    const row = (i / 6) | 0, b = -.30 - .145 + (i % 6) * .058, y = 1.105 - row * .098;
    const p = A.put(.938, b, .008, .046, .084, y, C(hex),
      { hard: true, mode: 7, gloss: .34, tag: '口红' });
    shadeChips.push({ p, b, y, hex });
  });
  // One retained gold plate, 5 mm wider than a chip on every edge. It sits behind the selected
  // physical chip, so the chip itself remains the colour sample and the visible margin is the
  // selection. Three deliberately separated warm/cool/deep shades make the change readable.
  const SHADE_DEMO = [1, 7, 10], firstShade = shadeChips[SHADE_DEMO[0]];
  const shadeHighlight = A.put(.934, firstShade.b, .004, .056, .094, firstShade.y, P.goldL,
    { hard:true, gloss:.58, tag:'口红' });
  const shadeHighlightM = shadeHighlight.m.slice(), shadeHighlightW = A.at(.934, firstShade.b);
  A.dynamic(shadeHighlight, .934, -.30, 1.055, .25);
  const selectShade = index => {
    const q = shadeChips[index], w = A.at(.934, q.b);
    shadeHighlight.m[12] = shadeHighlightM[12] + w[0] - shadeHighlightW[0];
    shadeHighlight.m[13] = shadeHighlightM[13] + q.y - firstShade.y;
    shadeHighlight.m[14] = shadeHighlightM[14] + w[1] - shadeHighlightW[1];
  };
  A.glyph(.944, -.30, .918, '试色', { size: .040, gap: .014, color: P.goldL, glow: .12,
    tag: '口红' });
  // Tester hygiene: a beaker of clean applicators, the pump beside it, and the bin the used one
  // goes in. Three objects, and together they are the whole of why a tester counter is allowed to
  // exist. The 干净 card below is hung on them.
  A.cyl(.95, -.78, .955, .042, .13, P.acryl, { mode: 1, alpha: .42, gloss: .80, tag: '化妆品' });
  for (let i = 0; i < 7; i++)
    A.cyl(.95 + Math.cos(i * 1.9) * .020, -.78 + Math.sin(i * 1.9) * .020, 1.045, .0045, .15,
      P.pearl, { rz: (i - 3) * .045, gloss: .30, tag: '化妆品' });
  A.cyl(.95, -1.02, .955, .034, .13, P.lacS, { gloss: .40, tag: '化妆品' });
  A.cyl(.95, -1.02, 1.045, .010, .05, P.chrome, { gloss: .70, tag: '化妆品' });
  A.cyl(.95, -1.24, .935, .046, .09, P.trim, { gloss: .26, tag: '化妆品' });
  A.cyl(.95, -1.24, .982, .049, .014, P.chrome, { gloss: .55, tag: '化妆品' });

  // ---- the turntable, and the one thing in this shop that moves
  // Eight testers on a lazy susan. A beauty counter turns its shade wheel so a customer standing
  // on the far side of it can see the back six without walking round, and it is also the only
  // moving object in a room otherwise made of glass and lacquer — which is what stops it reading
  // as a showroom photograph.
  //
  // R is 0.115 and no more: it turns on the vanity top at a 0.95, and the top's front edge is at
  // a 1.13. A wheel that overhung it would be a moving object with nothing under it.
  const LZ = { a: .95, b: .55, y: .945, R: .115 };
  const lzW = A.at(LZ.a, LZ.b);
  const lzParts = [];
  A.cyl(LZ.a, LZ.b, .900, .150, .022, P.chrome, { gloss: .70, tag: '口红' });
  A.cyl(LZ.a, LZ.b, .924, .034, .028, P.trim, { gloss: .40, tag: '口红' });
  const LZC = [P.rose, P.berry, P.coral, P.roseD, P.plum, P.amber, P.blush, P.jade];
  for (let i = 0; i < 8; i++) {
    // Built at its own angle rather than all eight on top of each other at phase 0. The tick only
    // runs when the player is on this deck and within `far`, so a wheel built stacked would be a
    // single bullet in every view taken from further off — and in every audit shot.
    const phase = i * Math.PI / 4;
    const p = A.cyl(LZ.a + Math.cos(phase) * LZ.R, LZ.b + Math.sin(phase) * LZ.R, .969,
      .0105, .062, LZC[i], { gloss: .52, tag: '口红' });
    A.dynamic(p, LZ.a, LZ.b, .969, LZ.R + .10);
    lzParts.push({ p, phase });
  }
  // Absolute time, so a wheel the player walked away from resumes at the right angle. `far` is 14:
  // this is eight 2 cm bullets and past that distance the turn is not resolvable, and MallFitTick
  // will not run the callback at all unless the player is on this deck.
  A.motion('testers', (time, state) => {
    const reduced = reducedMotion(), base = reduced ? 0 : time * .42;
    // Under reduced motion the wheel returns to its authored rest pose once, then receives no
    // further matrix writes. Full motion retains the absolute-time turn it had before this pass.
    if (!reduced || state.reduced !== 1) {
      for (const q of lzParts) {
        const phi = base + q.phase;
        q.p.m = M.trs(lzW[0] + Math.cos(phi) * LZ.R, A.y0 + .969, lzW[1] + Math.sin(phi) * LZ.R,
          phi, .021, .062, .021);
      }
    }
    // Five seconds per shade. Reduced motion holds the middle demonstration shade regardless of
    // absolute time, and threshold comparison keeps the one retained highlight write-free between
    // changes. `shadeChip` is the physical board index, not a copied colour swatch.
    const shadeStep = reduced ? 1 : Math.floor(time / 5) % SHADE_DEMO.length;
    const shadeChip = SHADE_DEMO[shadeStep];
    if (shadeChip !== state.shadeChip) { selectShade(shadeChip); state.shadeChip = shadeChip; }
    state.turn = +(base % (Math.PI * 2)).toFixed(3);
    state.testers = lzParts.length;
    state.shades = SHADE_DEMO.length; state.shade = SHADE[shadeChip]; state.reduced = reduced ? 1 : 0;
  }, { far: 14 });

  // ---------------------------------------------------------------- the walls
  bayBack(-2.88, 1.16, BRAND[0], 1);  bayBack(-4.14, 1.26, BRAND[1], 5);
  bayBack(2.88, 1.16, BRAND[2], 9);   bayBack(4.14, 1.26, BRAND[3], 13);
  A.stop(.24, .92, 2.22, 4.90);  A.stop(.24, .92, -4.90, -2.22);
  baySide(1, 1.72, .88, BRAND[4], 17);  baySide(1, 2.64, .88, BRAND[5], 21);
  baySide(-1, 1.70, .88, BRAND[3], 25);
  A.stop(1.24, 3.12, 4.24, 4.92);  A.stop(1.22, 2.18, -4.92, -4.24);

  // ---------------------------------------------------------------- the floor
  // Both runs start 1.26 out from the centre line, which leaves a two-and-a-half metre aisle
  // straight from the door to the mirrors and puts an end-cap in either edge of that view. The
  // -b run is the shorter of the two because the till has the corner behind it.
  gondola(2.71, 2.90, BRAND[0], BRAND[2], 3);
  gondola(-2.26, 2.00, BRAND[5], BRAND[4], 11);
  A.stop(2.36, 3.04, 1.00, 4.20);  A.stop(2.36, 3.04, -3.30, -1.00);
  // A stone runway from the threshold to the vanity, brass-lined, with the shell's carpet left
  // under the fixtures either side of it. A shop floor that is one material wall to wall tells
  // you nothing; the hard strip is what says where the aisle is and where the stock is. It stops
  // short of the entrance mat at a = 3.60 rather than lying over it, and short of the gondola
  // ends at |b| = 1.26.
  A.put(2.55, 0, 2.00, 2.46, .014, .034, P.marble,
    { hard: true, gloss: .44, mat: 'paving', matScale: .60, matAmt: .24 });
  for (const s of [-1, 1])
    A.put(2.55, s * 1.212, 2.00, .022, .020, .037, P.gold, { hard: true, gloss: .56 });

  // ---------------------------------------------------------------- suspended department signs
  // Everything in this shop was under 2.8 m, and the top third of every shot from the door was a
  // blank white ceiling with four black spots in it. A department store solves that with signage
  // hung on rods, and it is worth copying for a reason beyond decoration: a sign at head height
  // over an aisle is how you read a floor plan while walking it, and this is the only fixture in
  // the room that tells you what the two runs in the middle of the floor are for.
  //
  // Dark blades with a warm reveal along the bottom edge and gold characters facing the door, which
  // is the same vocabulary as the bay head boards — one shop, not two. Three numbers keep them out
  // of trouble: they hang at a where the shell has no ceiling fitting (its downlights are at a =
  // .95, its ceiling discs at 1.35 and 3.05), their rods stop at 3.54, which is the underside of
  // the ceiling plane, and the two over the gondolas clear those runs' own headers by half a metre.
  function blade(a, b, len, y, text) {
    A.put(a, b, .17, len, .30, y, P.trim, { hard: true, gloss: .30 });
    A.put(a, b, .19, len + .04, .030, y + .166, P.ink, { hard: true, gloss: .34 });
    A.put(a, b, .13, len - .10, .020, y - .162, P.warm, { hard: true, mode: 1, glow: .12 });
    A.glyph(a + .091, b, y, text, { size: .150, gap: .052, color: P.goldL, glow: .09 });
    for (const s of [-1, 1])
      A.cyl(a, b + s * Math.min(.90, len / 2 - .18), (y + .15 + 3.54) / 2, .011,
        3.54 - y - .15, P.steel, { gloss: .58 });
  }
  blade(1.72, 0, 2.40, 2.98, '试妆区');
  blade(2.70, 2.71, 2.30, 2.36, '护肤');
  blade(2.70, -2.26, 1.60, 2.36, '彩妆');

  // ---------------------------------------------------------------- till and impulse rack
  // Tucked into the far corner so the run of gondolas is not broken by it, facing back up the
  // shop. `A.counter` builds the till, its screen and its 收银台 label the same way every other
  // tenant in the building does — that consistency is worth more than a bespoke one.
  //
  // The colour is walked well down the warm side first: this counter is drawn with the plaster
  // material and that map multiplies what it lands on by about 1.37, so the dusty rose passed in
  // is what comes out as a soft blush lacquer rather than a white slab.
  // `till: false`, and the head built by hand below, because of where the shell's own till asks the
  // player to stand. `A.th` puts a thing's focus 1.15 m further out towards the concourse than the
  // point it is handed, and `counter()` hands it a point that is already 0.85 m out from the
  // counter face — so the standing spot for a till is two metres in front of it. For this one that
  // was a = 5.04, which is past the shopfront glazing; measured against the mall's own collision,
  // the nearest legal spot to it *inside* the shop was a = 4.1, which is the middle of the window
  // display platform. You could buy a lipstick, but only by standing in the window to do it.
  //
  // Handed a = 2.30 instead, the focus lands at 3.45, the clamp puts a body at 3.50, and that is
  // the floor immediately in front of the impulse rack — where somebody paying actually queues.
  // The same arithmetic is worth checking on any tenant's till: the shell is not wrong so much as
  // written for a counter standing further back than this trade puts one.
  A.counter(2.70, -4.05, 1.30, .68, C('#96687a'), false);
  A.put(2.70, -3.44, .84, .30, .26, 1.24, P.trim, { hard: true, gloss: .30, tag: '收银台' });
  const tillScreen=A.put(2.56, -3.44, .05, .24, .18, 1.31, C('#1d3247'),
    { hard: true, mode: 1, glow: .09, tag: '收银台' });     // the screen the assistant reads
  const readerScreen=A.put(2.99, -3.44, .04, .19, .11, 1.29, C('#1d3247'),
    { hard: true, mode: 1, glow: .06, tag: '收银台' });     // and the little one facing you
  if(A.powerDisplay)A.powerDisplay([tillScreen,readerScreen],{id:'till'});
  A.put(3.02, -4.52, .17, .25, .085, 1.03, P.chrome,
    { hard: true, gloss: .52, tag: '收银台' });             // card reader, on the customer side
  A.put(2.52, -4.52, .20, .30, .13, 1.05, P.lacS, { hard: true, gloss: .30 });  // bag stand
  // The word itself goes on the counter's front fascia, where a shop paints it, and not where
  // `counter()` puts it — that call glyphs at `a - dp/2`, which in a frame whose depth runs outward
  // is *behind* the counter it names, so every 收银台 sign in this building is inside its own
  // joinery. Six millimetres proud of the front face is enough to clear it without z-fighting.
  A.glyph(3.046, -4.05, .62, '收银台',
    { size: .115, gap: .040, color: P.goldL, glow: .09, tag: '收银台' });
  for (let i = 0; i < 3; i++) {                    // impulse rack on the customer face
    const y = .30 + i * .23;
    A.put(3.09, -4.05, .17, 1.06, .026, y, P.trim, { hard: true, gloss: .34 });
    A.put(3.10, -4.05, .15, 1.00, .010, y + .020, P.cream, { hard: true, mode: 1, glow: .04 });
    runB(3.09, -4.51, -3.59, y + .030, .128, 'carton', [P.blush, P.rose, P.cream, P.amber], i * 3);
  }
  for (const s of [-1, 1])
    A.put(3.09, -4.05 + s * .55, .19, .030, .74, .53, P.chrome, { hard: true, gloss: .46 });
  A.stop(2.20, 3.20, -4.78, -3.34);
  // Behind the till, a lit panel on the partition instead of a bay — there is nothing to sell
  // from the staff side, and a blank two metres of plaster there is what the eye lands on when
  // it follows the counter. Sized to cover the shell's own lightbox on this partition, which
  // runs a = 1.70–2.90 at y = 1.47–2.63, and the one bay on this side reaches a = 2.14. This
  // now starts at 2.12 and runs to 4.05: the two meet, where before this began at 2.15 and left
  // a centimetre of the shell's own pink showing in the joint. It also stops 12 cm short of the
  // bay's own back panel in depth, so the two emissive faces never share a plane.
  // Two square metres is the largest single emitter in the shop and it was the loudest thing in
  // any picture that included the till: a flat magenta slab at glow .09 in a saturated #d2748d,
  // which the bloom pass then smeared over everything in front of it. Split in two like a bay —
  // a lit upper and a darker lower — walked a third of the way towards the black trim, and taken
  // down to a level where it lights the corner rather than being the subject of it.
  const tillC = mix(P.rose, P.ink, .30);
  A.put(3.085, -4.74, 1.93, .05, 1.16, 2.18, tillC, { hard: true, mode: 1, glow: .05 });
  A.put(3.085, -4.74, 1.93, .05, .86, 1.17, mix(P.rose, P.ink, .55),
    { hard: true, mode: 1, glow: .022 });
  for (const y of [.75, 1.60, 2.61])            // bands, so it is a lit wall and not a pink field
    A.put(3.085, -4.70, 1.83, .04, .026, y, P.cream, { hard: true, mode: 1, glow: .12 });
  A.put(3.085, -4.68, 1.97, .05, .11, 2.83, P.trim, { hard: true, gloss: .28 });
  A.put(3.085, -4.68, 1.97, .05, .11, .68, P.trim, { hard: true, gloss: .28 });
  // A back bar over the till: one shelf of stock on the staff side, which is what is behind
  // every counter in this trade and what stops the corner reading as a store cupboard.
  A.put(3.085, -4.64, 1.50, .24, .034, 1.72, P.lac, { hard: true, gloss: .40 });
  A.put(3.085, -4.525, 1.46, .014, .026, 1.687, P.warm, { hard: true, mode: 1, glow: .16 });
  runA(-4.60, 2.40, 3.76, 1.739, .150, 'flask', [P.rose, P.pearl, P.cream, P.blush], 9);
  // A second shelf under it, in haircare — the staff side of a beauty counter carries the refills
  // and the bulky things that do not go on a glass shelf out front, and one shelf on its own read
  // as a picture rail with bottles balanced on it.
  A.put(3.085, -4.64, 1.50, .24, .034, 1.20, P.lac, { hard: true, gloss: .40 });
  A.put(3.085, -4.525, 1.46, .014, .026, 1.167, P.warm, { hard: true, mode: 1, glow: .16 });
  runA(-4.60, 2.40, 3.76, 1.219, .186, 'bottle', [P.plum, P.pearl, P.jade, P.cream], 4);

  // ---------------------------------------------------------------- the door
  // A stack of baskets just inside, on the side you enter from. Four nested, and only the top
  // one has its handle up, which is what a real stack looks like.
  //
  // At a = 3.36 these were unreachable. `A.th` puts a thing's focus 1.15 m out towards the
  // concourse, which landed at 4.51 — inside the collider the shell throws round the shopfront
  // glazing at 4.45–4.95 — so walking up to the baskets meant walking into the window. Pulled
  // back to 3.20 the focus is at 4.35, on the mat, which is where somebody picking one up
  // actually stands.
  // Nested at 82 mm on a 200 mm basket, so the four bodies are one solid block — which is what a
  // stack of baskets is, and it read as exactly that: a magenta brick on the floor. What tells
  // you it is four is the rim of each one standing proud of the one below, so each gets a rim.
  for (let i = 0; i < 4; i++) {
    const y = .10 + i * .082;
    A.put(3.20, -1.85, .34, .44, .20, y, P.roseD, { round: .045, gloss: .22, tag: '购物篮' });
    A.put(3.20, -1.85, .356, .456, .026, y + .090, mix(P.roseD, P.blush, .45),
      { round: .020, gloss: .30, tag: '购物篮' });
    if (i === 3)
      A.put(3.20, -1.85, .29, .39, .17, y + .020, P.blush, { mode: 7, tag: '购物篮' });
  }
  A.cap(3.20, -1.85, .62, .016, .36, .016, P.chrome,
    { rx: Math.PI / 2, gloss: .46, tag: '购物篮' });
  A.stop(2.96, 3.46, -2.13, -1.57);
  // And a lit totem on the other side of the door, standing clear of the window platform, which
  // begins at a = 3.655. Every shop of this kind has one of these inside the entrance, and it is
  // the one thing in the room that is legible from out on the concourse through the glass.
  A.put(3.42, 1.88, .26, .66, .10, .06, P.trim, { hard: true, gloss: .34 });
  A.put(3.42, 1.88, .16, .56, 1.66, .94, P.trim, { hard: true, gloss: .30 });
  // Its face was P.blush — #f0cdd2, which is a white with an idea of pink in it — at glow .13 over
  // two thirds of a square metre, and in every shot of the +b half of the room it was a blank
  // white slab a metre and a half tall standing next to the door. A lightbox is not the brightest
  // thing in a lit shop, it is a *sign*: deeper in colour and dimmer, so the two characters on it
  // are what you read rather than the box they are on.
  A.put(3.512, 1.88, .014, .46, 1.48, .96, mix(P.blush, P.rose, .40),
    { hard: true, mode: 1, glow: .055 });
  A.glyph(3.528, 1.88, 1.34, '新品', { size: .180, gap: .055, color: P.cream, glow: .05 });
  A.glyph(3.528, 1.88, 1.06, '上市', { size: .180, gap: .055, color: P.cream, glow: .05 });
  A.stop(3.28, 3.56, 1.56, 2.20);

  // Window merchandising is registered below through `美妆店:win`. Keeping it out of the fit
  // lets shop() omit its generic jars instead of forcing this tenant to hide them with more props.

  // ---------------------------------------------------------------- light
  // Three of its own. Eight reach the shader and the nearest to the camera win, so standing in
  // here these are the ones that count. Low, and lower than they first were: the shell already
  // gives this room a bright ceiling plane, a warm cove, a downlight grid and a lamp outside the
  // glass, and forty-two mirror bulbs and thirty LED strips are on top of that before any of
  // these. What these three are for is shape — the mirrors, and one over each run — not level.
  A.light(1.05, 0, 2.45, [1.00, .94, .86], .22, 3.0);
  A.light(2.60, 2.30, 2.50, [1.00, .95, .90], .17, 2.8);
  A.light(2.70, -2.70, 2.50, [1.00, .94, .90], .17, 2.8);

  // ---------------------------------------------------------------- what you can ask about
  // Each of these stands on something that carries its tag, so the highlight pulse lands on real
  // stock: 香水 on the flasks in the 玫瑰 bay, 面膜 on the mask cartons in 金晞, 口红 on the
  // tester risers, 化妆品 on the near gondola's end-cap. A word whose tag is on nothing in the
  // room lights nothing when you look at it, which is worse than not offering it.
  A.th('美妆店', FRONT + .35, 0, '这个颜色适合我吗？', 'Does this colour suit me?',
    '美妆 beauty + 店 shop.', 2.2, 2.5);
  // ---- and where they are allowed to hang, which was not where four of them were --------------
  // `A.th` walks the player to a + 1.15 and then wants them within `reach` of the label. Flooding
  // this unit with its own Mall.clampUpper at the 0.30 m walking radius gives 13.2 m² of standable
  // floor, and the shape of it is three bands and nothing else: the front lane at a 3.95–4.15
  // across the frontage, the centre aisle at b ±0.65 running back to a 2.15, and the cross aisle
  // at a 1.95–2.05 which is the only floor in the room that reaches the vanity — it runs b −2.95
  // to +3.85. 镜子, 口红, 香水 and 购物篮 all had focus points outside all three: their walk-to
  // points were inside the vanity's collider, inside a gondola, and (for 购物篮) 20 cm into the
  // shopfront glazing. Four of this shop's seven words could be seen and never reached.
  A.th('镜子', .80, 1.35, '照照镜子，这个颜色很适合您。',
    'Have a look in the mirror — that colour suits you well.',
    '照镜子 means to look in a mirror. The vanity has three, and a ring of bulbs round each.',
    1.7, 1.38);
  A.th('口红', .85, .55, '这盘口红可以试，试完的用完就扔。',
    'You can try any lipstick on this wheel; whatever you use, throw it away after.',
    '口 mouth + 红 red. The wheel turns, so the back six come round to you.', 1.7, 1.00);
  A.th('干净', .85, -.75, '每个人用一根干净的棒，用过的放右边。',
    'Everyone uses a clean applicator; the used ones go in the pot on the right.',
    '干 dry + 净 clean. 干净的 before a noun: 干净的棒 a clean applicator.', 1.7, 1.02);
  A.th('面霜', .90, -.30, '先洗脸，再擦面霜，最后涂口红。',
    'Wash your face first, then the cream, and the lipstick last.',
    '面 face + 霜 frost — a cream. The order is 先 … 再 … 最后, first, then, last.', 1.7, 1.05);
  A.th('香水', .86, -2.80, '先闻一下这瓶香水。', 'Smell this perfume first.',
    '香 fragrant + 水 water.', 1.7, 1.66);
  A.th('面膜', .86, 3.15, '这个面膜一盒十片，秋天用刚好。',
    'This face mask comes ten to a box — just right for the autumn.',
    '面 face + 膜 film. 一盒十片 — ten sheets to a box; 片 is the measure word for a flat thing.',
    1.7, 1.66);
  A.th('化妆品', 2.70, -1.42, '这些化妆品都是新到的。', 'These cosmetics are all new in.',
    '化妆 to make up + 品 goods.', 1.7, 1.10);
  A.th('购物篮', 2.90, -1.85, '要不要拿一个购物篮？', 'Would you like to take a basket?',
    '购物 shopping + 篮 basket.', 1.6, .55);
};

// ---------------------------------------------------------------------------------------------
// The two shopfront bays. shop() has already built a timber platform whose top is y .34, a stone
// riser at a 4.78 and the overhead strip. `bc` is the centre of one 3.5 m bay and `side` mirrors
// the one asymmetric compact toward the outside end, leaving the 3 m doorway completely clear.
// Twelve primitives per call, twenty-four for the tenant: enough silhouette to read at concourse
// distance without recreating the dense tester shelves inside the shop.
MallFit['美妆店:glass'] = { alpha: .18, gloss: .96 }; // clear, polished cosmetics glazing
MallFit['美妆店:win'] = (W, bc, side) => {
  const ink = C('#3d3037'), blush = C('#c98191'), pearl = C('#ded5c5');
  const plum = C('#75547f'), coral = C('#d16f63'), gold = C('#d5ad58');
  const outer = bc + side * 1.08;

  // One quiet backdrop, then three unequal plinths: a display composition rather than a shelf.
  W.put(3.74, bc, .08, 2.52, 1.34, 1.02, ink, { hard:true, gloss:.24 });
  W.put(4.12, bc, .44, .58, .46, .58, blush, { hard:true, gloss:.34 });
  for (const u of [-.58, .58])
    W.put(4.17, bc + u, .34, .40, .22, .46, pearl, { hard:true, gloss:.38 });

  // Overscale hero fragrance and two lip colours remain legible through glass at gameplay scale.
  W.put(4.24, bc, .18, .22, .26, .95, pearl, { round:.035, gloss:.42 });
  W.put(4.24, bc, .12, .14, .07, 1.115, gold, { hard:true, gloss:.68 });
  for (const [u, c] of [[-.58, plum], [.58, coral]]) {
    W.put(4.28, bc + u, .12, .13, .18, .66, gold, { hard:true, gloss:.58 });
    W.put(4.28, bc + u, .058, .062, .15, .825, c, { round:.018, gloss:.28 });
  }

  // An open compact breaks the bottle skyline; base and lid meet as perpendicular hinge planes.
  W.put(4.38, outer, .28, .34, .04, .37, gold, { hard:true, gloss:.52 });
  W.put(4.22, outer, .035, .30, .28, .52, C('#c5d1d3'), { hard:true, gloss:.88 });
};

// ---------------------------------------------------------------------------------------------
// Who is in here. This unit is shop('W', -6.0, 10.0), so local (a, b) unrolls to world
// x = a − 23, z = b − 6.0. Yaw 0 looks along +z; on this wall +a is +x, so somebody facing the
// door is at +π/2 and somebody facing the back wall at −π/2.
//
// 沈知微 stands in the cross aisle at a 2.00, which is the one band of floor the flood fill finds
// between the vanity's collider (a ≤ 1.62 once grown by the walking radius) and the two gondolas
// (a ≥ 2.36 likewise). She faces the door, which is where her customer comes from. The room
// already carries two anonymous crowd figures from js/mall.js and she is 4 m clear of both.
if (typeof MallCast !== 'undefined') MallCast.push(
  { hz:'导购员', name:'沈知微', py:'Shěn Zhīwēi', place:'mall', mallFloor:2,
    rig:'mall-beauty-consultant-shen-zhiwei', temper:'genial',
    look:{ skin:'#efc7a2', hair:'#241d1a', hairStyle:'bun', top:'#d6cfc2', pants:'#423e42',
      shoe:'#2b2e32', apron:'#8e3d53', collar:'shirt', tall:.97, faceSeed:9401 },
    spots:[{ h0:10, h1:22, at:[-21.00, -4.10], face:Math.PI / 2, act:'wait' }],
    lines:[['您的皮肤偏干还是偏油？', 'Is your skin on the dry side, or the oily side?'],
           ['这两个色号，左边这个更适合您。',
            'Of these two shades, the one on the left suits you better.'],
           ['试的时候用一根新棒，用过的就别放回去了。',
            'Use a fresh applicator to try it, and do not put a used one back.']] },
);
