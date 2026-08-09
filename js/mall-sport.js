// 运动店 · 腾跃运动 · TENGYUE SPORT — floor 2
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
//   A.put(a,b,w,dp,h,y,colour,opt)   a box: `w` measured along depth, `dp` along the frontage
//   A.cyl / A.ball / A.cap / A.taper (a,b,y,...,colour,opt)
//   A.rail(a,b,len,colours[,tag,y])  a hanging rail, running along the frontage
//   A.counter(a,b,w,dp[,colour,till]) a service counter, optionally with a till
//   A.glyph(a,b,y,text,opt)          characters on a surface; they always face the doorway
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// ---------------------------------------------------------------------------------------------
// What a sports shop is.
//
// Three things carry a sportswear shop and very little else does:
//
//   * one enormous lit brand panel. It is doing most of the work in every one of these shops you
//     have ever walked past, and a fit-out without it reads as a stockroom however good the
//     joinery is.
//   * a dark *system* wall — a slatted board with recessed bays cut into it — so the only bright
//     things in the room are the product and the light under each course.
//   * product that hangs off something. A trainer stands on a cantilever bracket over a lit
//     reveal; a grid of shelves with shoes resting on them is a shoe cupboard.
//
// So the whole back elevation is one piece of shopfitting: a full-width dark board, a three-panel
// lightbox in the middle over the hero plinth and its low mirror, and a bracket wall of trainers
// either side. The shell's own slats, framed lightboxes and gold name sit behind it and are
// covered on purpose — a sports shop does not have a timber feature wall, it has a system wall,
// and half-covering the shell's one would have read as neither.
//
// Depth runs *outward*: a detail belongs at a **larger** `a` than the thing it sits on. Everything
// on the back wall stacks .46 → 1.16, in front of the shell's slats at .40.
//
// The plan, which the collider list below can be read against. Every fixture's footprint is
// written down here because this room is 4.8 m deep and eleven fixtures wide, and the two ways it
// goes wrong are a prop standing inside another prop and a `thing` whose focus — always 1.15 m
// out towards the door from the thing itself — lands inside a collider, which is a label the
// player can see and can never reach.
//
//        b -4.9 ....... -1.8 |  -1.7 .. 1.7  | 1.8 ....... 4.9
//   a .46  男子跑鞋 bracket bay |  brand panel  |  女子训练 bracket bay
//   a .80                       |  hero plinth  |
//   a 1.4  运动服 apparel bay   | bench · 球篮  |  运动服 apparel bay
//   a 2.1  boxed stock          |               |  水壶 · 帽子 gondola
//   a 2.6  shoe riser           |               |
//   a 3.0  收银台               | 瑜伽垫 bin    |  two treadmills
//   a 3.3  one mannequin either side of the aisle, just inside the glass
//   a 3.8  campaign backdrops and a low product step in both windows
//   a 4.2  one hero trainer plus one sport cue in each bay
//   partition b -4.84: 球拍 peg panel, and above the till a 背包 wall
//   partition b +4.84: a lit campaign panel
//
// Two rules the floor plan is written against and which cost hours when they are forgotten.
//
// The shell builds a 0.34 m window platform at a 3.66–4.71 wherever |b| > 1.65, so a person
// standing there is buried to the shin. Every NPC below is therefore at a < 3.65 unless it is in
// the 3 m doorway, where there is no platform.
//
// And the tenant's registered window dressing carries no collider, on purpose: the treadmill's focus
// stands at a 4.01 out in the glass, and walling the window off is what would make that label
// unreachable. So nothing added in the window here gets a `stop` either. It is the one part of
// this room you can walk into, and it has always been.
MallFit['运动店'] = A => {
  const K = {
    board:  C('#232830'),   // the system wall
    bay:    C('#1d222a'),   // the recessed bays inside it
    groove: C('#0d1014'),   // the slat lines cut across them
    black:  C('#101318'),
    grey:   C('#3d444c'),
    rail:   C('#2a3038'),   // the shelf rails: darker than any shoe standing on them
    steel:  C('#98a1a8'),
    steelD: C('#5a636b'),
    white:  C('#f1eee5'),
    bone:   C('#ddd7c6'),
    skin:   C('#c9ab90'),
    stone:  C('#9aa0a4'),
    slate:  C('#2b3138'),   // the dark laminate every plinth top in here is made of
    mirror: C('#6d7a85'),
    // Anything drawn in mode 1 is unlit and then multiplied by (1 + glow·3), so a near-white
    // source colour clips to a flat white bar however small `glow` is. The reveals under the
    // shelves are lit *amber*, not lit white, and that is the only reason they read as strip
    // lighting rather than as another white shelf.
    led:    C('#c79a56'),
    red:    C('#c2453a'),
    redD:   C('#8e2f28'),
    blue:   C('#2c72b2'),
    navy:   C('#243348'),
    volt:   C('#c0da4c'),
    orange: C('#dd7f33'),
    ink:    C('#1d2a3a'),
    warm:   C('#ffeccd'),
    screen: C('#1b3550'),
    wood:   C('#43321f'),
    rubber: C('#22262b'),
  };
  // Materials.
  //
  // `steel` in this engine is a photograph of *corrugated* cladding (see MATERIALS in
  // js/assets.js), so every surface that carried it here — the mirror surround, the bracket
  // blades, the bench legs, the treadmill deck — came out ribbed, and at four metres the mirror
  // under the hero plinth read as the roller shutter of a shop that had closed. Nothing in this
  // room is corrugated, so nothing uses it any more; the chrome is plain colour at a high gloss,
  // which is what chrome in this renderer actually wants.
  //
  // `nrmAmt` is dropped to .30 throughout. The default of 1 lays an AO-like grey cloud over
  // whatever it touches, which on a dark shopfit is the difference between a panel and a stain.
  const MPAN  = { mat:'plaster', matScale:1.90, matAmt:.20, nrmAmt:.30 };  // painted board
  const MSLAB = { mat:'paving',  matScale:.62,  matAmt:.24, nrmAmt:.30 };  // stone tops
  const MWOOD = { mat:'wood',    matScale:.85,  matAmt:.26, nrmAmt:.30 };  // the bench
  const MCLTH = { mat:'fabric',  matScale:.40,  matAmt:.26, nrmAmt:.30 };  // folded stock

  const BW = 9.60;              // usable back wall, inside the partitions
  const FB = 3.32, FW = 3.04;   // bracket bay: centre and width, one each side
  const GW = 2.72;              // the brand panel

  // ------------------------------------------------------------------ one trainer
  //
  // Written in the shoe's own (u, v) — along the shoe from its middle, up from the sole — and then
  // turned twice. `t` tips it nose-up in the plane of the wall; `q` swings it about the vertical.
  //
  // The second turn is the one that matters. Pointed square along the frontage a trainer is a
  // profile, and a profile of anything soft is a lozenge: the first pass of this file had forty of
  // those on the wall and from the door they read as a bakery shelf. Swung twenty-odd degrees out
  // you see the toe *and* the flank at once, and the eye gets the two cues that say shoe rather
  // than bun — the wedge from heel to toe, and the collar standing well above the vamp.
  //
  // Build's transform is trans · rotY(q) · rotX(-t) · scale. A part offset (u,v) is first rotated
  // in the (frontage, height) plane, giving a frontage offset β and a height; β is then swung
  // about the vertical into (−β·sin q, β·cos q) in (depth, frontage). Every part carries the same
  // pair of angles, so the shoe turns rather than shearing.
  //
  // Six pieces. The first attempt had nine, and it failed for a reason worth writing down: they
  // were all roughly the same height, stacked, and one of them — a side flash wider than the vamp
  // it sat on — cut the body in two across the middle. Nine equal horizontal bands is a club
  // sandwich, and on the hero plinth that is exactly what five of them looked like.
  //
  // What a shoe is, as a silhouette, is *one mass* that is low at the front and tall at the back:
  //
  //   outsole  a thin dark strip, so the shoe is separated from whatever it stands on
  //   midsole  pale foam, and a taller wedge of it under the heel
  //   quarter  the back half of the upper, the taller of the two
  //   vamp     the front half, 2 cm lower than the quarter
  //   toe box  lower again, and further forward
  //   collar   at the very back, the highest point on the shoe
  //   throat   the dark opening, tucked down in front of the collar rather than sitting on it
  //
  // Two things have to be true or none of the rest helps.
  //
  // The cross-section: a 9 cm upper 10 cm tall is a brick standing on a plank, which is what the
  // second attempt looked like close up — a bread roll on a diving board. A forefoot is 9.5 cm
  // across and 6 cm deep, and getting that one ratio right did more than any of the parts did.
  //
  // The top line: it has to fall *continuously* from the collar to the toe. Built as one upper of
  // constant height with a collar sitting on the back of it, the profile is a flat roof with a
  // hump at one end and a bumper at the other, and the third attempt read as a saloon car. Four
  // masses at four descending heights — .147, .130, .108, .087 — is a shoe.
  const SOL = .014, UPR = .034;   // the only two corner radii, so the whole wall is two batches
  const shoe = (a0, b0, y0, t, q, c1, c2, tag, lace) => {
    const ct = Math.cos(t), st = Math.sin(t), cq = Math.cos(q), sq = Math.sin(q);
    const P = (u, v, len, wid, h, c, o) => {
      const beta = u * ct - v * st;
      return A.put(a0 - beta * sq, b0 + beta * cq, wid, len, h,
        y0 + u * st + v * ct, c, { rx:-t, ry:q, tag, mode:7, ...o });
    };
    P( .000, .010, .282, .098, .020, K.rubber, { round:SOL, gloss:.28 });  // outsole
    P( .004, .034, .274, .096, .030, c2,       { round:SOL });             // midsole foam
    P(-.096, .046, .090, .094, .046, c2,       { round:SOL });             // heel wedge
    P(-.058, .092, .120, .092, .076, c1,       { round:UPR });             // quarter, top at .130
    P( .040, .080, .140, .088, .056, c1,       { round:UPR });             // vamp,    top at .108
    P( .112, .068, .080, .080, .038, c1,       { round:UPR });             // toe box, top at .087
    P(-.106, .112, .066, .088, .070, c1,       { round:UPR });             // collar,  top at .147
    // The throat, and — only where somebody can actually see them — the laces. A 12 mm bar at
    // four metres is a wasted draw call, so the eleven on the plinth and the riser get them and
    // the forty on the wall do not.
    P(-.070, .120, .050, .060, .030, K.rubber, { round:SOL });
    if (lace) P(.020, .112, .080, .050, .012, K.bone, { round:SOL, gloss:.20 });
  };
  // Uppers and their soles. Ten pairs, so no course repeats itself and no two neighbours match.
  const SH = [[K.red,K.white],[K.white,K.blue],[K.black,K.volt],[K.blue,K.bone],
              [K.white,K.orange],[K.volt,K.black],[K.bone,K.red],[K.ink,K.volt],
              [K.orange,K.white],[K.navy,K.white]];

  // ------------------------------------------------------------------ smaller goods
  // A pile of folded tees. Three thick folds, not five thin ones: a stack of thin plates in
  // alternating strong colours is a pile of paperbacks, which is what the bottom of the left bay
  // looked like from the doorway. Cloth is soft, so these get a real corner radius as well.
  const folded = (a, b, y, n, cs) => {
    for (let i = 0; i < n; i++)
      A.put(a + ((i % 2) ? .010 : -.008), b, .27, .300 - i * .010, .062,
        y + .034 + i * .066, cs[i % cs.length],
        { round:.022, mode:7, ry:((i * 13) % 5 - 2) * .014, tag:'运动服', ...MCLTH });
  };
  // A sports bottle: body, collar, sports cap. Slim, because a 6 cm cylinder is a tin can.
  const bottle = (a, b, y, c) => {
    A.cyl(a, b, y + .095, .036, .190, c, { gloss:.42, tag:'水壶' });
    A.cyl(a, b, y + .205, .030, .034, K.bone, { gloss:.40, tag:'水壶' });
    A.cyl(a, b, y + .238, .018, .034, K.rubber, { gloss:.44, tag:'水壶' });
  };
  // A racquet hung face-on off a peg wall. The head is one flat lozenge with a large corner
  // radius, which at this size is a better ellipse than eight boxes arranged round one and costs
  // a seventh as much; the string bed sits 5 mm proud of it, and the throat is the piece that
  // stops the head reading as a table-tennis bat, which is exactly what the version before this
  // looked like on the wall.
  //
  // `f` picks the plane it faces: 0 hangs it facing the doorway, 1 hangs it on a partition, where
  // the frontage and depth measurements swap and the throat's splay turns from `rx` into `rz`.
  const racquet = (a, b, y, c, tag, f) => {
    const D = (dep, fro, h, o = {}) => f ? [fro, dep, h, o] : [dep, fro, h, o];
    const put = (da, db, dep, fro, h, dy, cc, o) => {
      const d = D(dep, fro, h, o);
      return A.put(a + (f ? db : da), b + (f ? da : db), d[0], d[1], h, y + dy, cc,
        { tag, ...o });
    };
    put(0, 0, .026, .245, .335, .200, c, { round:.115, gloss:.34 });
    put(.006, 0, .014, .186, .272, .200, K.bone, { round:.088, mode:7, gloss:.16 });
    for (const s of [-1, 1])                                        // the throat, a shallow V
      put(0, s * .046, .022, .052, .120, .015, c,
        f ? { round:.018, rz:-s * .34, gloss:.34 } : { round:.018, rx:s * .34, gloss:.34 });
    A.cap(a, b, y - .075, .022, .130, .022, c, { gloss:.36, tag });         // shaft
    put(0, 0, .034, .038, .150, -.195, K.rubber, { round:.014, mode:7 });   // grip
    put(0, 0, .038, .042, .022, -.278, c, { round:.010, gloss:.30 });       // butt cap
  };
  // A dress form in the shop's own kit.
  //
  // The first version had arms and legs, on the theory that sportswear is sold on a body. It came
  // out a lime-green snowman holding two baguettes, and the reason is that a limb built out of
  // capsules only reads as a limb if it is *attached* — which needs a shoulder, and a shoulder
  // needs a deltoid, and by then it is a figure and figure.js already exists to draw those. A
  // shop mannequin has no arms. So this is the shell's own silhouette in js/mall.js — plate,
  // stem, three ellipsoids with the waist drawn in, neck, no head — dressed in a vest over
  // shorts, which is the whole difference between a fashion form and a sports one.
  //
  // The ellipsoid radii are in *world* axes, so they carry `ry:A.yaw` to be turned into the
  // shop's frame: without it the torso is deeper than it is wide and the form stands sideways.
  const figure = (a, b, top, bot) => {
    const T = { tag:'运动服', mode:7, ry:A.yaw, gloss:.07 };
    A.cyl(a, b, .020, .245, .040, K.steelD, { gloss:.50, tag:'运动服' });     // floor plate
    A.cyl(a, b, .360, .036, .680, K.steelD, { gloss:.46, tag:'运动服' });     // stem
    A.ball(a, b, .880, .120, .165, .175, bot, { ...T, ...MCLTH });            // hips, in shorts
    A.ball(a, b, 1.090, .116, .150, .148, bot, { ...T, ...MCLTH });           // waist, drawn in
    A.ball(a, b, 1.310, .142, .190, .215, top, { ...T, ...MCLTH });           // chest and shoulder
    A.put(a + .118, b, .022, .150, .240, 1.320, K.white, { hard:true, mode:7, tag:'运动服' });
    A.put(a, b, .300, .430, .034, 1.140, top, { round:.016, mode:7, ry:A.yaw, tag:'运动服' });
    A.cyl(a, b, 1.545, .050, .140, K.bone, { gloss:.14, tag:'运动服' });      // neck, no head
    A.stop(a - .28, a + .28, b - .30, b + .30);
  };

  // A daypack, hung face-on off a wall or standing on a shelf.
  //
  // `f` picks the plane, the same convention the racquet uses: 0 stands it on a shelf facing the
  // doorway, 1 hangs it on a partition, where depth and frontage swap. A bag is read from three
  // things and nothing else — the soft rounded mass, the panel pocket sitting proud of the front
  // of it, and the two straps. The first attempt had a lid, a base, a zip and four webbing loops
  // and at two metres it was a coloured brick; the pocket is what makes it a bag.
  const BAG = .075;
  const pack = (a, b, y, c1, c2, f) => {
    const T = { tag:'背包', mode:7 };
    const P = (da, db, dep, fro, h, dy, cc, o) =>
      A.put(a + (f ? db : da), b + (f ? da : db), f ? fro : dep, f ? dep : fro, h, y + dy, cc,
        { ...T, ...o });
    P(0, 0, .200, .300, .460, .230, c1, { round:BAG, ...MCLTH });        // body
    P(.055, 0, .085, .215, .215, .175, c2, { round:.038 });              // front pocket
    P(.098, 0, .022, .120, .028, .085, K.steel, { round:.008, gloss:.42 });
    for (const s of [-1, 1])                                             // shoulder straps
      P(-.098, s * .085, .034, .046, .330, .200, c2, { round:.016, rz:f ? 0 : s * .09 });
    P(0, 0, .075, .075, .028, .478, K.rubber, { round:.012 });           // grab handle
  };
  // A holdall, lying on its side along the frontage. Round body, a stiffened end panel and two
  // handles standing up off the top — which is the whole difference between a sports bag and a
  // bolster cushion.
  const duffel = (a, b, y, c1, c2) => {
    const T = { tag:'背包', mode:7 };
    A.cap(a, b, y + .165, .150, .560, .150, c1, { rx:Math.PI / 2, gloss:.10, ...T, ...MCLTH });
    for (const s of [-1, 1])
      A.put(a, b + s * .245, .270, .075, .270, y + .165, c2, { round:.055, ...T });
    A.put(a, b, .085, .560, .075, y + .175, c2, { round:.025, ...T });   // the panel down the side
    for (const s of [-1, 1])
      A.cap(a, b + s * .095, y + .350, .017, .200, .017, K.rubber, { rz:s * .5, ...T });
  };
  // A yoga mat, rolled and stood on end. 15 cm across and 62 tall, with a printed band round it:
  // a fatter roll is a bolster and a plain one is a length of drainpipe.
  const matRoll = (a, b, y, c, tilt = 0) => {
    A.cyl(a, b, y + .310, .075, .620, c, { gloss:.12, rz:tilt, tag:'瑜伽垫', ...MCLTH });
    A.put(a, b, .158, .158, .052, y + .400, K.bone,
      { round:.012, mode:7, rz:tilt, tag:'瑜伽垫' });
  };
  // A dumbbell: a knurled bar with a hex head on each end.
  const bell = (a, b, y, c) => {
    A.cap(a, b, y + .048, .019, .200, .019, K.steelD, { rx:Math.PI / 2, gloss:.50, tag:'瑜伽垫' });
    for (const s of [-1, 1])
      A.put(a, b + s * .115, .098, .062, .098, y + .048, c,
        { round:.014, mode:7, gloss:.22, tag:'瑜伽垫' });
  };
  // The piece of card leaning against a display that says a shop is trading rather than dressed.
  const card = (a, b, y, tag) =>
    A.put(a, b, .010, .105, .062, y, K.bone, { hard:true, mode:7, rx:.50, tag });

  // ================================================================== the system wall
  // One dark board across the whole elevation, with a shadow gap at its foot so it reads as a
  // fitted panel rather than paint. Nothing on it is slatted where the bays and the lightbox
  // cover it; the slats are cut into the bays, which is where a bracket would actually land.
  A.put(.50, 0, .08, BW, 3.10, 1.55, K.board, { hard:true, gloss:.16, ...MPAN });
  A.put(.56, 0, .05, BW, .075, .048, K.black, { hard:true, gloss:.30 });

  // The band across the top: a lit accent strip with a run of chevrons raked through it, which is
  // the one piece of graphic language every sports brand in the building shares, and a warm
  // hairline under it so the band lights the wall instead of only glowing on it.
  //
  // The chevrons are opaque and *darker* than the field they sit in. They were translucent white
  // at alpha .40 to begin with, and on a lit panel a translucent white bar at an angle is not
  // read as a graphic — it is read as glare on the lens, which is what nine metres of the shop's
  // top edge looked like: smeared, as though the picture had been taken through a dirty window.
  // Printed ink is darker than the light behind it. Two bars a station, so it is a chevron.
  A.put(.57, 0, .06, BW - .20, .36, 2.90, K.black, { hard:true, gloss:.26 });
  A.put(.61, 0, .03, BW - .34, .27, 2.90, A.acc, { hard:true, mode:1, glow:.15 });
  for (let i = -6; i <= 6; i++) for (const d of [0, .105])
    A.put(.632, i * .72 + d, .02, .046, .25, 2.90, K.redD,
      { hard:true, mode:1, glow:.06, rx:.62 });
  A.put(.645, 0, .02, BW - .34, .014, 2.706, K.warm, { hard:true, mode:1, glow:.16 });

  // ---- the brand panel. Everything in a shop this shallow is read from the doorway in one look,
  // so this is deliberately the biggest object in the room: 2.9 by 1.6, lit, dead centre, with the
  // hero plinth under it and a warm upright either side separating it from the product.
  //
  // Built as three lit panels with two mullion gaps rather than one sheet. A single rectangle of
  // saturated colour two metres wide is a painted wall; the same area split by two 3 cm shadow
  // lines is a lightbox, and at four metres that is the whole of the difference.
  A.put(.57, 0, .06, GW + .26, 1.76, 1.82, K.black, { hard:true, gloss:.28 });
  for (let i = -1; i <= 1; i++)
    A.put(.62, i * (GW / 3), .04, GW / 3 - .028, 1.56, 1.82, A.acc,
      { hard:true, mode:1, glow:.115 });
  // Chevrons at the foot of the panel only. Raked across the whole field they crossed the
  // lettering, and a dark bar through a character does not read as a graphic device — it reads as
  // a scratch on the lens.
  for (let i = -3; i <= 3; i++) for (const d of [0, .085])
    A.put(.638, i * .46 + d, .02, .046, .30, 1.22, K.redD,
      { hard:true, mode:1, glow:.055, rx:.62 });
  A.glyph(.665, 0, 2.07, '腾跃运动',
    { size:.50, gap:.12, color:K.white, mode:1, glow:.22, tag:'运动店' });
  A.put(.665, 0, .02, 2.30, .030, 1.735, K.white, { hard:true, mode:1, glow:.16 });
  A.glyph(.665, 0, 1.52, 'TENGYUE SPORT',
    { size:.130, gap:.045, color:K.bone, mode:1, glow:.12, tag:'运动店' });
  // The two warm uprights are the fitting's own light source in the shot: a vertical highlight
  // down the return of each bay is what stops the middle third reading as a poster on a flat wall.
  for (const s of [-1, 1]) {
    A.put(.565, s * 1.79, .05, .13, 2.68, 1.72, K.bay, { hard:true, gloss:.20, ...MPAN });
    A.put(.60, s * 1.69, .04, .07, 2.58, 1.72, K.warm, { hard:true, mode:1, glow:.13 });
  }

  // ---- hero plinth, and the mirror a shoe shop keeps at ankle height because that is where you
  // look when you are trying a pair on.
  // The top is dark. It was pale stone with the paving map on it at matScale .62, and on a slab
  // 3.2 m long that map is a visible cobble pattern — the hero plinth of a sportswear shop had
  // crazy paving on it. A dark laminate at a high gloss is both what these are really made of and
  // the only value that lets a white midsole read as white.
  A.put(.80, 0, .58, 3.12, .86, .45, K.bay, { hard:true, gloss:.20, ...MPAN });
  A.put(.80, 0, .48, 2.96, .15, .088, K.black, { hard:true, gloss:.30 });     // recessed toe-kick
  A.put(.80, 0, .64, 3.24, .075, .915, K.slate, { hard:true, gloss:.46 });
  A.put(1.13, 0, .015, 3.00, .020, .862, K.led, { hard:true, mode:1, glow:.10 });
  // A strip mirror, at the only height it is any use at. A full-height one here was a two-metre
  // sheet of pale nothing filling the middle of the shop, and its surround is now a plain dark
  // reveal rather than the corrugated map that made it look like a shutter.
  //
  // Nothing in this renderer reflects, so a mirror is painted: a pale field for the lit room it
  // is facing, and a brighter band along the top where the ceiling and the LED reveal fall in it.
  // Left dark it was a switched-off television set into the plinth.
  A.put(1.10, 0, .020, 2.44, .52, .385, K.black, { hard:true, gloss:.34 });
  A.put(1.12, 0, .014, 2.28, .44, .385, K.mirror, { hard:true, mode:1, alpha:.42, gloss:.30 });
  A.put(1.128, 0, .010, 2.20, .060, .570, K.bone, { hard:true, mode:1, alpha:.34, gloss:.30 });
  // Five hero pairs on their own risers, swung well round to face the doorway, each with a small
  // price card leaning against it — the piece of paper that says a shop is trading.
  for (let i = 0; i < 5; i++) {
    const bb = -1.18 + i * .59, s = bb < 0 ? -1 : 1;
    A.put(.80, bb, .26, .34, .050, .978, K.black, { hard:true, gloss:.30 });
    shoe(.83, bb, 1.006, .10, -s * .72, SH[i][0], SH[i][1], '运动鞋', true);
    A.put(1.00, bb - s * .13, .010, .105, .062, .988, K.bone,
      { hard:true, mode:7, rx:.50, tag:'运动鞋' });
  }
  A.stop(.44, 1.16, -1.68, 1.68);

  // ================================================================== the two bracket bays
  // Four courses of cantilever brackets in a recessed bay each side, a lit reveal under every
  // course, and a different bottom course on each side so the elevation is not a mirror of
  // itself: folded stock on the left, balls in cradles on the right.
  for (const s of [-1, 1]) {
    const si = s > 0 ? 1 : 0;
    A.put(.56, s * FB, .06, FW, 2.56, 1.42, K.bay, { hard:true, gloss:.20, ...MPAN });
    for (let i = 0; i < 18; i++)                                   // the slat lines
      A.put(.595, s * FB, .010, FW - .08, .010, .30 + i * .132, K.groove,
        { hard:true, gloss:.20 });
    A.put(.652, s * FB, .020, FW - .16, .016, 2.628, K.warm, { hard:true, mode:1, glow:.15 });

    for (let r = 0; r < 4; r++) {
      const ry = 1.04 + r * .44;
      // The course is a slim dark rail, not a shelf. In bright metal at 17 cm wide it was the
      // brightest thing on the wall and the shoe was the ornament sitting on it.
      A.put(.615, s * FB, .045, FW - .10, .050, ry - .038, K.rail, { hard:true, gloss:.26 });
      A.put(.652, s * FB, .018, FW - .16, .016, ry - .070, K.led, { hard:true, mode:1, glow:.13 });
      for (let i = 0; i < 5; i++) {
        const bb = s * FB + (-1.18 + i * .59);
        // A small angled shelf, turned to lie under the shoe rather than to point out of the wall
        // at right angles to it. The first version was a 21 cm cantilever arm in bright steel and
        // it was the loudest thing on the elevation: a grey wedge with a shoe balanced across it.
        // A trainer wall's brackets are subordinate to the trainer or they are not brackets.
        A.put(.635, bb, .05, .060, .054, ry + .004, K.rail, { hard:true, gloss:.34 });
        A.put(.700, bb, .095, .240, .016, ry + .042, K.rail,
          { hard:true, gloss:.34, ry:-s * .55, rz:-.14 });
        const c = SH[(i + r * 3 + si * 2) % SH.length];
        shoe(.706, bb, ry + .058, .16, -s * .55, c[0], c[1], '运动鞋');
      }
    }
    A.stop(.44, .94, s > 0 ? 1.78 : -4.86, s > 0 ? 4.86 : -1.78);
  }
  // Left bay, bottom: two courses of folded stock, which is where the volume lines go.
  for (const yy of [.34, .70]) {
    A.put(.652, -FB, .018, FW - .16, .016, yy - .032, K.led, { hard:true, mode:1, glow:.13 });
    A.put(.70, -FB, .30, FW - .10, .045, yy, K.rail, { hard:true, gloss:.26 });
    for (let i = 0; i < 4; i++)
      folded(.72, -FB - 1.11 + i * .74, yy + .022, 2 + (i % 2),
        [[K.navy, K.ink], [K.rubber, K.volt], [K.ink, K.blue], [K.navy, K.bone]][i]);
  }
  // Right bay, bottom: balls on cradles. Cheap bulky stock goes low in a real shop, and it gives
  // the wall a heavy course to stand on.
  A.put(.652, FB, .018, FW - .16, .016, .335, K.led, { hard:true, mode:1, glow:.13 });
  for (let i = 0; i < 3; i++) {
    const bb = FB + (i - 1) * 1.00;
    A.put(.70, bb, .27, .40, .050, .400, K.rail, { hard:true, gloss:.26 });
    A.cyl(.75, bb, .458, .150, .060, K.steelD, { gloss:.42 });
    A.ball(.77, bb, .608, .120, .120, .120,
      [K.orange, K.white, K.blue][i], { mode:7, gloss:.20, tag:'篮球' });
    A.put(.80, bb, .010, .124, .014, .608, K.rubber, { hard:true, mode:7, rz:.5, tag:'篮球' });
  }

  // ================================================================== the two partitions
  // The shell gives each partition a skirting, a valance and one lit frame, and two and a half
  // metres of nothing between them — which, in a room only 4.8 m deep, is half of what you see
  // standing in the doorway. Both get used.
  //
  // Left: a peg panel of racquets, turned into the partition's own plane.
  // Both panels are sized to swallow the shell's lit frame whole — 1.63 to 2.97 in depth, 1.40 to
  // 2.70 up. Covering three quarters of it would leave a lit sliver poking out of one end, which
  // is worse than either covering it or leaving it alone.
  A.put(2.20, -4.86, 1.90, .12, 2.00, 1.70, K.bay, { hard:true, gloss:.20, ...MPAN });
  for (let i = 0; i < 13; i++)
    A.put(2.20, -4.792, 1.84, .012, .010, .82 + i * .132, K.groove, { hard:true, gloss:.20 });
  A.put(2.20, -4.760, 1.90, .04, .060, 2.640, K.black, { hard:true, gloss:.30 });
  A.put(2.20, -4.725, 1.80, .015, .014, 2.560, K.warm, { hard:true, mode:1, glow:.15 });
  for (let i = 0; i < 4; i++)
    racquet(1.54 + i * .36, -4.706, 1.32 + (i % 2) * .07,
      [K.red, K.ink, K.volt, K.blue][i], '球拍', 1);
  for (const s of [-1, 1])                                   // two bats leaning against the end
    A.cap(3.02, -4.62 + s * .07, .400, .052, .760, .052,
      s > 0 ? K.wood : K.blue, { rz:s * .12, gloss:.30, tag:'球拍' });

  // Right: a lit campaign panel. No lettering — a glyph on this wall would face the doorway and
  // read edge-on, so the graphic is colour and chevrons, which is all a poster at this angle ever
  // gives you anyway.
  A.put(2.15, 4.86, 1.75, .12, 1.94, 1.74, K.black, { hard:true, gloss:.26 });
  A.put(2.15, 4.783, 1.60, .030, 1.76, 1.74, A.acc, { hard:true, mode:1, glow:.10 });
  for (let i = 0; i < 5; i++)
    A.put(1.52 + i * .34, 4.756, .085, .020, 1.56, 1.74, K.redD,
      { hard:true, mode:1, glow:.045, rz:.42 });
  A.put(2.15, 4.756, 1.30, .020, .05, 1.02, K.white, { hard:true, mode:1, glow:.14 });

  // ================================================================== the floor
  // ---- the two apparel bays.
  //
  // A rail on its own is a rail. What makes it a department is the gantry over it: two uprights
  // standing past head height, a top shelf carrying the bulky stock a rail cannot hold, a lit
  // reveal under that shelf, and a header naming what is beneath it. The floor plan of this room
  // is full — there is no square metre left for another fixture — so the apparel was doubled
  // upwards instead, which is also where a real sportswear shop puts its second face of stock.
  //
  // Every measurement here is stacked against the rail's own collider (a 1.10–1.74, b ±1.25 of
  // its centre), so the gantry adds no footprint at all. Clear height on the shelf is 0.44: the
  // holdalls are 0.35 and the folded stock 0.20, and a daypack at 0.46 would go through the
  // header, which is why the packs are on the partition wall and not up here.
  const apparel = (b, cs, fill, name) => {
    A.rail(1.42, b, 2.30, cs, '运动服', 1.62);
    for (const s of [-1, 1]) {
      A.cap(1.42, b + s * 1.24, 1.36, .040, 2.72, .040, K.steelD, { gloss:.46 });
      A.put(1.42, b + s * 1.24, .46, .19, .045, .024, K.black, { hard:true, gloss:.30 });
    }
    A.put(1.42, b, .42, 2.48, .045, 1.960, K.rail, { hard:true, gloss:.28 });
    A.put(1.62, b, .016, 2.30, .014, 1.925, K.led, { hard:true, mode:1, glow:.13 });
    A.put(1.42, b, .07, 2.48, .28, 2.560, K.black, { hard:true, gloss:.30 });
    A.glyph(1.465, b, 2.560, name,
      { size:.135, gap:.045, color:K.bone, mode:1, glow:.13, tag:'运动服' });
    fill(1.9825);
  };
  apparel(-3.40, [K.red, K.white, K.ink, K.volt, K.black, K.navy], y => {
    duffel(1.42, -4.28, y, K.navy, K.ink);
    folded(1.42, -3.58, y, 3, [K.red, K.white]);
    folded(1.42, -3.06, y, 2, [K.volt, K.ink]);
    duffel(1.42, -2.54, y, K.red, K.redD);
  }, '男装 运动服');
  apparel(3.40, [K.blue, K.black, K.orange, K.white, K.ink, K.volt], y => {
    folded(1.42, 2.48, y, 3, [K.blue, K.bone]);
    duffel(1.42, 3.10, y, K.black, K.volt);
    folded(1.42, 3.76, y, 2, [K.orange, K.ink]);
    duffel(1.42, 4.32, y, K.blue, K.white);
  }, '女装 运动服');

  // The bench you sit on to put them on, facing the mirror in the plinth. Timber on two plain
  // steel sleds; the legs used to carry the corrugated map and came out fluted.
  A.put(1.80, 0, .50, 1.56, .090, .430, K.wood, { mode:6, gloss:.20, ...MWOOD });
  for (const s of [-1, 1]) {
    A.put(1.80, s * .62, .42, .070, .385, .193, K.steelD, { hard:true, gloss:.44 });
    A.put(1.80, s * .62, .46, .095, .045, .026, K.black, { hard:true, gloss:.30 });
  }
  A.put(1.80, 0, .09, 1.30, .045, .150, K.steelD, { hard:true, gloss:.40 });   // stretcher
  A.stop(1.53, 2.07, -.84, .84);

  // The apparel mirror lives on the unused inner end of the right partition: full height from the
  // fitting bench, but entirely on the wall plane, so neither rail stock nor the clear floor loses
  // a centimetre.  This renderer cannot reflect the shopper, so the cool field carries a retained
  // head-to-ankle silhouette.  Three slim measurement bands at shoulder, waist and hem make it an
  // apparel fit mirror rather than a second campaign screen.  Six props, two static signatures
  // (`put|1|hard` and `cap|7`), no light and no collider.
  A.put(3.60, 4.754, 1.04, .024, 2.26, 1.48, K.mirror,
    { hard:true, mode:1, gloss:.62, tag:'运动服镜' });
  A.cap(3.60, 4.718, 2.18, .105, .205, .040, K.slate,
    { mode:7, gloss:.18, tag:'运动服镜' });
  A.cap(3.60, 4.718, 1.20, .170, 1.62, .040, K.slate,
    { mode:7, gloss:.18, tag:'运动服镜' });
  for (const [y, w, c] of [[1.70, .42, K.volt], [1.28, .34, K.led], [.78, .28, K.red]])
    A.put(3.60, 4.690, w, .016, .025, y, c,
      { hard:true, mode:1, glow:.035, tag:'运动服镜' });

  // ---- and what turns a bench into a fitting area, which is the half of a shoe shop that is not
  // the wall. Three props, all of them under knee height and none of them with a collider, because
  // the bench already owns this footprint and a shin-high box the player cannot walk round is
  // worse than no box at all.
  //
  // The open box on the floor is the one doing the work. A shoe shop with every lid on is a
  // stockroom; one box open with the tissue turned back and a single shoe out of it is a shop
  // where somebody is halfway through deciding.
  A.cyl(2.22, -1.02, .150, .170, .300, K.rail, { gloss:.26, tag:'运动鞋' });   // fitting stool
  A.cyl(2.22, -1.02, .326, .178, .052, K.rubber, { gloss:.18, tag:'运动鞋' });
  A.put(2.42, -.48, .34, .225, .105, .052, K.ink,                              // the open box
    { round:.014, mode:7, tag:'运动鞋' });
  A.put(2.42, -.48, .30, .195, .020, .112, K.bone, { hard:true, mode:7, tag:'运动鞋' });
  A.put(2.66, -.48, .022, .225, .150, .128, K.ink,                             // the lid, leaning
    { round:.012, mode:7, rx:-.42, tag:'运动鞋' });
  shoe(2.36, -.62, .126, .06, 1.05, K.white, K.blue, '运动鞋', true);
  shoe(1.76, .38, .481, .02, -1.35, K.red, K.white, '运动鞋', true);            // one on the bench
  A.put(1.80, .62, .30, .105, .014, .484, K.steel, { hard:true, gloss:.50, tag:'运动鞋' });
  A.put(1.90, .62, .045, .038, .026, .497, K.rubber, { hard:true, gloss:.30, tag:'运动鞋' });

  // A wire bin of balls beside the bench — the fixture every sports shop has by the aisle and
  // nobody walks past without putting a hand in. Four posts and three rails a side, not eight
  // spokes round a disc: the radial version read as a birdcage with fruit in it.
  const ballBin = (a, b) => {
    A.put(a, b, .74, .74, .045, .028, K.rubber, { hard:true, gloss:.24, tag:'篮球' });
    for (const sa of [-1, 1]) for (const sb of [-1, 1])
      A.cap(a + sa * .35, b + sb * .35, .310, .028, .560, .028, K.steelD, { gloss:.46 });
    for (const yy of [.150, .330, .530]) for (const sa of [-1, 1]) {
      A.put(a + sa * .35, b, .022, .700, .022, yy, K.steelD, { hard:true, gloss:.46 });
      A.put(a, b + sa * .35, .700, .022, .022, yy, K.steelD, { hard:true, gloss:.46 });
    }
    for (const p of [[0, 0, .16], [.16, .11, .15], [-.14, .12, .15], [.06, -.17, .15],
                     [-.07, -.07, .37], [.11, .04, .38]])
      A.ball(a + p[0], b + p[1], p[2] + .12, .115, .115, .115,
        [K.orange, K.white, K.volt, K.blue, K.red, K.orange][(p[0] * 29 + 5 | 0) % 6],
        { mode:7, gloss:.20, tag:'篮球' });
    A.stop(a - .40, a + .40, b - .40, b + .40);
  };
  ballBin(1.55, -1.45);

  // One low riser off the left of the aisle. A shop's centre line is its power aisle and stays
  // clear; what frames it is a knee-high fixture with the same product on it as the wall.
  A.put(2.62, -2.10, .74, .90, .60, .300, K.bay, { hard:true, gloss:.20, ...MPAN });
  A.put(2.62, -2.10, .64, .80, .13, .075, K.black, { hard:true, gloss:.30 });
  A.put(2.62, -2.10, .80, .96, .060, .630, K.slate, { hard:true, gloss:.46 });
  A.put(3.00, -2.10, .014, .84, .016, .595, K.led, { hard:true, mode:1, glow:.10 });
  for (let i = 0; i < 3; i++)
    shoe(2.52 + (i % 2) * .18, -2.38 + i * .28, .662, .04, -1.05 + (i - 1) * .28,
      SH[(i * 3 + 4) % SH.length][0], SH[(i * 3 + 4) % SH.length][1], '运动鞋', true);
  A.stop(2.25, 2.99, -2.60, -1.60);

  // ---- 瑜伽垫. The one thing on the shop's own price list that this room did not sell: six mats
  // rolled and stood on end in a low cradle, two dumbbells lying at the front, and the name on the
  // riser face. It is deliberately the fixture nearest the door on the aisle's left — a bulky,
  // cheap, impulse line goes at the front in a real shop, and everything else in here is either on
  // the wall or two paces in.
  //
  // A mat rolled to 15 cm is a mat; rolled to 25 it is a bolster, and the band round it is what
  // stops six of them reading as a rack of drainpipe.
  A.put(3.15, -.75, .60, .50, .34, .170, K.bay, { hard:true, gloss:.20, ...MPAN });
  A.put(3.15, -.75, .52, .42, .11, .058, K.black, { hard:true, gloss:.30 });
  A.put(3.15, -.75, .66, .56, .050, .365, K.slate, { hard:true, gloss:.46 });
  A.put(3.48, -.75, .014, .46, .016, .335, K.led, { hard:true, mode:1, glow:.10 });
  for (const s of [-1, 1])                               // the two bars the rolls lean between
    A.cap(3.15 + s * .25, -.75, .560, .017, .390, .017, K.steelD,
      { rx:Math.PI / 2, gloss:.46, tag:'瑜伽垫' });
  for (let i = 0; i < 6; i++)
    matRoll(3.03 + (i % 2) * .24, -.93 + ((i / 2) | 0) * .18, .390,
      [K.volt, K.blue, K.red, K.bone, K.orange, K.navy][i], ((i * 7) % 5 - 2) * .022);
  bell(3.40, -.90, .398, K.rubber);
  bell(3.40, -.62, .398, K.rubber);
  A.glyph(3.485, -.75, .240, '瑜伽垫',
    { size:.095, gap:.035, color:K.bone, mode:1, glow:.12, tag:'瑜伽垫' });
  A.stop(2.85, 3.45, -1.00, -.50);

  // Boxed stock, stacked the way a shoe shop stacks it — near the till, not on the shop floor.
  for (let cl = 0; cl < 3; cl++)
    for (let n = 0; n < (cl === 2 ? 2 : 4); n++) {
      const bb = -4.60 + (cl - 1) * .120, yy = .078 + n * .148;
      A.put(2.05 + (cl - 1) * .01, bb, .35, .220, .138, yy, [K.ink, K.grey, K.black][cl],
        { round:.014, mode:7, tag:'运动鞋' });
      A.put(2.056 + (cl - 1) * .01, bb, .31, .230, .032, yy + .016,
        [K.red, K.volt, K.orange][(cl + n) % 3], { hard:true, mode:7, tag:'运动鞋' });
    }
  A.stop(1.87, 2.23, -4.78, -4.42);

  // An accessory gondola on the right: bottles on the top, caps hung off a rail above it, a lit
  // header over the lot.
  A.put(2.25, 2.05, .70, 1.30, .78, .390, K.bay, { hard:true, gloss:.20, ...MPAN });
  A.put(2.25, 2.05, .60, 1.18, .14, .075, K.black, { hard:true, gloss:.30 });
  A.put(2.25, 2.05, .76, 1.36, .060, .810, K.slate, { hard:true, gloss:.46 });
  A.put(2.59, 2.05, .014, 1.20, .016, .775, K.led, { hard:true, mode:1, glow:.10 });
  for (let i = 0; i < 5; i++)
    bottle(2.17, 2.05 - .46 + i * .23, .840, [K.red, K.white, K.blue, K.volt, K.orange][i]);
  for (const s of [-1, 1])
    A.cap(2.25, 2.05 + s * .60, 1.28, .036, .94, .036, K.steelD, { gloss:.46 });
  A.cap(2.25, 2.05, 1.72, .026, 1.20, .026, K.steelD, { rx:Math.PI / 2, gloss:.50 });
  A.put(2.25, 2.05, .05, 1.24, .22, 1.870, K.black, { hard:true, gloss:.30 });
  A.glyph(2.285, 2.05, 1.870, '运动装备',
    { size:.115, gap:.04, color:K.bone, mode:1, glow:.13, tag:'水壶' });
  for (let i = 0; i < 5; i++) {           // caps, hung crown-out off the rail
    const bb = 2.05 - .44 + i * .22, c = [K.red, K.navy, K.white, K.black, K.volt][i];
    A.ball(2.25, bb, 1.582, .072, .058, .082, c, { mode:7, gloss:.10, tag:'水壶', ry:A.yaw });
    A.put(2.325, bb, .105, .150, .016, 1.548, c, { round:.008, mode:7, rx:.26, tag:'水壶' });
    A.cap(2.25, bb, 1.505, .020, .150, .020, K.steelD, { rx:Math.PI / 2, gloss:.44, tag:'水壶' });
  }
  A.stop(1.90, 2.60, 1.40, 2.70);

  // Two treadmills facing the glass, which is where a real shop puts them: a deck on a raised
  // frame, slatted belt, side rails you hold, an angled console with a lit readout, and the two
  // bottle holders that are the giveaway detail on every one of these ever made.
  const beltSlats = [], beltLamps = [];
  // The two counter services keep visit-local state. A fit-out lives for the whole mall visit, so
  // this survives walking away from the shop and coming back, while a fresh visit starts with the
  // display samples below. Only the named result refs are ever written by `finishSportService`.
  const sportService = { stringings:0, prints:0 };
  const STRING_LOOKS = [
    { name:'原线', color:K.bone }, { name:'荧光线', color:K.volt },
    { name:'橙线', color:K.orange }, { name:'蓝线', color:K.blue },
  ];
  const PRINT_LOOKS = [
    { number:'10', name:'红色', body:K.red,  ink:K.bone },
    { number:'07', name:'蓝色', body:K.blue, ink:K.white },
    { number:'23', name:'荧光绿', body:K.volt, ink:K.ink },
    { number:'18', name:'藏蓝', body:K.navy, ink:K.orange },
  ];
  let racketGrid = [], jersey = null, jerseyNumber = [];
  const SERVICE_VERBS = { '穿线':'stringing', '印号码':'printing' };
  const SERVICE_SECS = { stringing:2.8, printing:2.5 };
  let serviceKey = '', serviceAt = 0, doingEl = null, dz = null;

  function finishSportService(key) {
    if (key === 'stringing') {
      sportService.stringings++;
      const look = STRING_LOOKS[sportService.stringings % STRING_LOOKS.length];
      for (const p of racketGrid) p.color = look.color;
      return;
    }
    if (key !== 'printing') return;
    sportService.prints++;
    const look = PRINT_LOOKS[sportService.prints % PRINT_LOOKS.length];
    jersey.color = look.body;
    for (let i = 0; i < jerseyNumber.length; i++) {
      jerseyNumber[i].ch = look.number[i];
      jerseyNumber[i].color = look.ink;
    }
  }
  const treadmillScreens=[];
  for (const b of [3.25, 4.35]) {
    const T = { tag:'跑步机' };
    A.put(2.86, b, 1.52, .84, .17, .295, K.board, { round:.08, gloss:.22, ...MPAN, ...T });
    A.put(2.82, b, 1.26, .66, .045, .400, K.rubber, { hard:true, gloss:.08, ...T });
    for (let i = 0; i < 7; i++) {                                   // slats across the belt
      const p = A.put(2.30 + i * .17, b, .012, .64, .008, .432, K.black,
        { hard:true, gloss:.10, ...T });
      // The belt runs a 2.30–3.32, so a cull sphere on the middle of it at that radius covers
      // every position a slat can reach. Marked before Build.finish packs the static record.
      A.dynamic(p, 2.81, b, .432, .62);
      beltSlats.push({ p, b, i });
    }
    A.put(3.50, b, .36, .80, .32, .340, K.bay, { round:.07, gloss:.26, ...T });   // motor cowl
    for (const s of [-1, 1]) {
      A.cap(3.26, b + s * .36, 1.00, .034, .94, .034, K.steelD, { rz:-.20, gloss:.52, ...T });
      A.put(3.46, b + s * .36, .10, .090, .64, .790, K.steelD, { hard:true, gloss:.44, ...T });
      A.cap(3.30, b + s * .36, 1.42, .030, .30, .030, K.rubber, { rx:.9, gloss:.20, ...T });
      A.cyl(3.50, b + s * .25, 1.148, .050, .085, K.rubber, { gloss:.24, ...T });
    }
    A.put(3.54, b, .075, .60, .36, 1.360, K.black, { hard:true, gloss:.30, rx:-.22, ...T });
    treadmillScreens.push(A.put(3.588, b, .028, .52, .28, 1.360, K.screen,
      { hard:true, mode:1, glow:.17, rx:-.22, ...T }));
    for (let i = 0; i < 4; i++) {                                   // the readout's four blocks
      const p = A.put(3.606, b - .18 + i * .12, .014, .085, .055, 1.410, K.volt,
        { hard:true, mode:1, glow:.09, rx:-.22, ...T });
      // Glow-only, so the cull sphere is right already; this only opts the block out of the
      // renderer's retained static instance record so a changing glow is actually uploaded.
      A.dynamicVisual(p);
      treadmillScreens.push(p);
      beltLamps.push({ p, b, i });
    }
    A.stop(2.14, 3.66, b - .50, b + .50);
  }
  const treadmillPower=A.powerDisplay
    ?A.powerDisplay(treadmillScreens,{id:'treadmill-consoles'}):{active:true};
  // ---- the belt runs, and the console counts -------------------------------------------------
  // The brief asks for the treadmill as a timed activity. What that needs in the room is not a
  // stopwatch model — the timing is in the word card, which is free — it is for the machine to be
  // obviously running when you walk in, because a treadmill standing still is furniture.
  //
  // Fourteen slats scrolling and eight lamps stepping, and nothing else. The slats wrap over the
  // belt's own 1.19 m of pitch from absolute time, so a machine the player walked away from is at
  // the right phase when they come back rather than catching up. `far` is 12: the belt slats are
  // 1.2 cm of black on a dark deck and at any greater distance the movement is not resolvable, and
  // MallFitTick already refuses to run this at all unless the player is on this deck.
  A.motion('treadmill', (time, state) => {
    const PITCH = 7 * .17, roll = (time * .95) % PITCH;
    if(treadmillPower.active) {
      for (const s of beltSlats) {
        const a = 2.30 + ((s.i * .17 + roll) % PITCH);
        const w = A.at(a, s.b);
        s.p.m = M.trs(w[0], A.y0 + .432, w[1], 0, .012, .008, .64);
      }
      // Two consoles counting at slightly different rates, because two machines showing the same
      // number is one machine drawn twice.
      for (const q of beltLamps) {
        const lit = ((time * (q.b > 4 ? .62 : .78) + q.i * .25) % 1) < .5;
        q.p.glow = lit ? .30 : .05;
      }
    }
    state.slats = beltSlats.length;
    state.roll = +roll.toFixed(3);
    state.power=treadmillPower.active?'on':'off';
    // Reuse this tenant's one callback for the service completion edge. `.on` disappearing after
    // 85% of the declared action time is a completion; a shorter disappearance is Escape. The DOM
    // refs are cached, and this callback is already floor/distance culled by MallFitTick.
    if (typeof document !== 'undefined') {
      if (!doingEl) {
        doingEl = document.getElementById('doing');
        dz = doingEl && doingEl.querySelector('.dz');
      }
      const on = !!doingEl && doingEl.classList.contains('on');
      const key = on && dz ? (SERVICE_VERBS[dz.textContent] || '') : '';
      if (key && key !== serviceKey) { serviceKey = key; serviceAt = time; }
      else if (!key && serviceKey) {
        if (time - serviceAt >= SERVICE_SECS[serviceKey] * .85) finishSportService(serviceKey);
        serviceKey = ''; serviceAt = 0;
      }
    }
    const strings = STRING_LOOKS[sportService.stringings % STRING_LOOKS.length];
    const print = PRINT_LOOKS[sportService.prints % PRINT_LOOKS.length];
    state.stringings = sportService.stringings; state.racketGrid = strings.name;
    state.prints = sportService.prints; state.jerseyNumber = print.number;
    state.jerseyColour = print.name;
  }, { far: 12 });

  // One mannequin either side of the aisle, just inside the glass, in the shop's own kit.
  figure(3.30, -2.05, K.red, K.navy);
  figure(3.30, 2.05, K.volt, K.black);

  // Window merchandising is registered below through `运动店:win`, so shop() never creates the
  // generic shoe boxes this fit-out previously had to swallow with oversized plinths.

  // ---- 背包. The left partition ran out of fitting at a 3.15 and gave the whole front third of
  // that wall — the piece you are looking straight at while you queue — to nothing at all. Six
  // daypacks on a slatted board fills it with the one department this shop was missing, and puts
  // them where the bags in a real sports shop are: on the wall behind the till, in the last place
  // you pass before you pay.
  //
  // No lettering. A glyph on a partition faces the doorway and reads edge-on — the same reason the
  // campaign panel opposite carries colour and chevrons and no name.
  A.put(3.85, -4.86, 1.45, .12, 1.60, 1.720, K.bay, { hard:true, gloss:.20, ...MPAN });
  for (let i = 0; i < 11; i++)
    A.put(3.85, -4.792, 1.39, .012, .010, .98 + i * .132, K.groove, { hard:true, gloss:.20 });
  A.put(3.85, -4.760, 1.45, .04, .060, 2.600, K.black, { hard:true, gloss:.30 });
  A.put(3.85, -4.725, 1.36, .015, .014, 2.520, K.warm, { hard:true, mode:1, glow:.15 });
  for (let i = 0; i < 3; i++) {
    pack(3.42 + i * .46, -4.69, 1.55, [K.red, K.ink, K.blue][i], [K.black, K.volt, K.bone][i], 1);
    pack(3.42 + i * .46, -4.69, .98, [K.navy, K.volt, K.black][i], [K.bone, K.ink, K.orange][i], 1);
  }
  A.stop(3.20, 4.56, -4.92, -4.55);

  // ---- the stack of baskets, and the reason this shop could not be paid in -------------------
  // These stood at a 4.24, b −1.20 — in the doorway — with a collider 0.36 by 0.32 round them.
  // The walk-in gap is b ±1.50 and nothing else, so once that collider is grown by the player's
  // own 0.30 m radius it reaches b −1.66 to −0.74 and closes the left half of the opening. A
  // flood fill of this unit with its own Mall.clampUpper at r 0.30 then finds the whole left-hand
  // side of the shop — 2.1 m² of it, including every square centimetre of floor in front of the
  // till — free but unreachable: 收银台 could be seen from the door and never walked up to, so
  // this tenant could not take money. Four crates of stock at knee height did that.
  //
  // They move to the inboard end of the counter, which is where a shop keeps them anyway, and
  // their collider now sits inside the shadow the counter's own already casts. Measured, not
  // guessed: the counter runs a 2.70–3.50, b −4.75 to −2.95, so at the walking radius it already
  // owns b out to −2.65, and this adds 0.36 m beyond that at a depth the front lane never uses.
  for (let i = 0; i < 4; i++)
    A.put(3.30, -2.72, .34, .28, .075, .078 + i * .056, [K.red, K.redD][i % 2],
      { round:.030, mode:7, tag:'运动店' });
  A.stop(3.12, 3.48, -2.88, -2.56);

  // The till, forward on the side the door's stack of baskets is on. `counter` puts its own label
  // 1.15 + dp/2 + .85 out towards the door; any further forward than this and that lands inside
  // the shopfront glazing's collider, where the player cannot stand to read it.
  A.counter(3.10, -3.85, 1.80, .80, C('#1b2026'));

  // ---- 穿线 and 印号: the two things a sports shop does that a website cannot ------------------
  // Restringing a racket and printing a name and number on a shirt are counter services, so they
  // are built on the counter — a 2.70–3.50, b −4.75 to −2.95, stone top at 0.98 — using the two
  // stretches of it the till fittings leave clear: b −4.75 to −4.45 outboard of the card reader,
  // and b −3.29 to −2.95 inboard of the screen. Nothing here takes floor the shop had, which
  // matters in a unit where the flood fill finds 5.4 m² a body can stand on.
  //
  // 35 primitives for both. The waiting times, the price per racket and what a set of letters
  // costs are in the word cards below, where a sentence is free and a printed sign is nine draws.
  const SV = .98;                                   // the counter's own stone top
  // The stringing machine: a turntable, two clamps, the tension arm, and a racket in it.
  // The base is 0.26 across b and centred on −4.60, not 0.40 on −4.58. `counter` stands its own
  // card reader on the top at b −4.45 to −4.15, y 0.98–1.08, and the wider base ran 7 cm into it.
  // The counter's clear outboard stretch is b −4.75 to −4.45, which is 0.30 m, and this fits it.
  A.put(3.10, -4.60, .34, .26, .050, SV + .025, K.black, { hard:true, gloss:.34, tag:'球拍' });
  A.cyl(3.10, -4.60, SV + .085, .028, .070, K.steelD, { gloss:.50, tag:'球拍' });
  A.cyl(3.10, -4.60, SV + .128, .105, .018, K.grey, { gloss:.40, tag:'球拍' });
  for (const s of [-1, 1])
    A.put(3.10 + s * .11, -4.60, .045, .035, .055, SV + .165, K.volt,
      { hard:true, gloss:.42, tag:'球拍' });
  A.cap(3.10, -4.40, SV + .150, .016, .22, .016, K.steelD,
    { rx:Math.PI / 2, gloss:.48, tag:'球拍' });
  // The racket lying in the clamps: a flattened head, five crossing strings and a handle. The old
  // solid inner lozenge could change colour but never read as a newly strung grid; these five bars
  // share the retained hard/mode-7 signature with the shirt below. The two glyph-atlas number tiles
  // are the second and last service draw key rather than a separate draw per digit.
  A.cyl(3.10, -4.60, SV + .150, .112, .016, K.navy, { gloss:.36, tag:'球拍' });
  for (let i = -1; i <= 1; i++)
    racketGrid.push(A.put(3.10, -4.60 + i * .050, i ? .145 : .176, .008, .006,
      SV + .160, K.bone, { hard:true, mode:7, gloss:.20, tag:'球拍',
        sportService:'racket-grid' }));
  for (const s of [-1, 1])
    racketGrid.push(A.put(3.10 + s * .045, -4.60, .008, .155, .006, SV + .161, K.bone,
      { hard:true, mode:7, gloss:.20, tag:'球拍', sportService:'racket-grid' }));
  A.cap(3.10, -4.35, SV + .150, .014, .20, .014, K.black,
    { rx:Math.PI / 2, gloss:.30, tag:'球拍' });
  A.cyl(3.32, -4.70, SV + .060, .045, .075, K.orange, { gloss:.34, tag:'球拍' });   // string reel
  A.cyl(3.32, -4.70, SV + .060, .048, .020, K.bone, { gloss:.20, tag:'球拍' });
  // The heat press and the shirt under it, at the inboard end. 号码 hangs on this.
  A.put(3.06, -3.12, .38, .30, .045, SV + .022, K.black, { hard:true, gloss:.34, tag:'运动服' });
  jersey = A.put(3.06, -3.12, .32, .26, .010, SV + .050, K.red,
    { hard:true, mode:7, gloss:.10, tag:'运动服', sportService:'jersey-body' });    // the shirt
  // A.put preserves `ch`, so these two very thin tiles use the glyph atlas as ordinary retained
  // props whose `ch` and colour can change in place. The tiles replace the old two glyph props
  // one-for-one; only the five-string grid replaces one solid bed, so the whole feature is Δ+4
  // props and two draw keys.
  if (typeof Glyphs !== 'undefined') Glyphs.need(PRINT_LOOKS.map(q => q.number).join(''));
  for (let i = 0; i < 2; i++)
    jerseyNumber.push(A.put(3.06, -3.155 + i * .070, .072, .055, .004, SV + .058, K.bone,
      { hard:true, mode:1, gloss:.06, glow:.015, ch:PRINT_LOOKS[0].number[i], tag:'运动服',
        sportService:'jersey-number' }));
  A.dynamicVisual(racketGrid, jersey, jerseyNumber);
  A.put(3.32, -3.12, .06, .30, .16, SV + .130, K.steelD, { hard:true, gloss:.44,
    tag:'运动服' });                                                              // the press arm
  A.put(3.20, -3.12, .28, .26, .045, SV + .195, K.grey, { hard:true, gloss:.40, tag:'运动服' });
  A.cap(3.02, -3.12, SV + .245, .014, .17, .014, K.black,
    { rz:-.35, gloss:.34, tag:'运动服' });                                        // its handle
  // From b −3.20, not −3.30: the till's monitor housing sits on the top at b −3.71 to −3.29.
  for (let i = 0; i < 6; i++)                       // the tray of letters and numerals
    A.put(2.90, -3.20 + (i % 3) * .075, .050, .058, .006, SV + .014 + ((i / 3) | 0) * .010,
      [K.bone, K.volt, K.navy][i % 3], { hard:true, mode:7, gloss:.16, tag:'运动服' });
  // What the two services are, on the counter's customer face where the queue reads it.
  // At y 0.42 and not 0.56: `counter` runs its own warm LED reveal across the front face at
  // a 3.505–3.535, y 0.575–0.625, and a plate there sits inside it.
  A.put(3.512, -3.85, .012, .96, .085, .420, K.black, { hard:true, gloss:.30 });
  A.glyph(3.522, -3.85, .420, '穿线 印号',
    { size:.068, gap:.024, color:K.volt, mode:1, glow:.12 });

  // ---- and a hoop over the ball wall, so 篮球 has somewhere to go ------------------------------
  // Six primitives. The demonstrations the brief asks for — badminton, football, table tennis —
  // are conversations with 陈师傅 and cards on the racket and the ball; a hoop is the one of the
  // four that reads from the door as a thing rather than as a sign about a thing.
  A.put(1.02, -2.10, .05, .58, .40, 2.520, K.bone, { hard:true, gloss:.26, tag:'篮球' });
  A.put(1.048, -2.10, .010, .22, .16, 2.470, K.red, { hard:true, mode:7, gloss:.20, tag:'篮球' });
  A.put(1.10, -2.10, .12, .07, .05, 2.335, K.steelD, { hard:true, gloss:.46, tag:'篮球' });
  A.cyl(1.22, -2.10, 2.320, .115, .014, K.orange, { gloss:.40, tag:'篮球' });
  for (let i = 0; i < 3; i++)
    A.cap(1.22 + Math.cos(i * 2.1) * .085, -2.10 + Math.sin(i * 2.1) * .085, 2.245, .006, .15,
      .006, K.bone, { gloss:.16, tag:'篮球' });

  // ================================================================== ceiling
  // A track over each bay aimed at the wall, and a blade sign hung in front of it. The shell
  // hangs downlights on a grid down the middle of the unit; what a shop like this actually has is
  // a run of track washing the product and a sign telling you which half is which, and from the
  // doorway the two together are what say retail rather than office.
  for (const s of [-1, 1]) {
    A.put(1.70, s * FB, .07, FW + .30, .075, 3.320, K.black, { hard:true, gloss:.30 });
    for (let i = 0; i < 4; i++) {
      const bb = s * FB - 1.20 + i * .80;
      A.put(1.70, bb, .10, .10, .17, 3.185, K.black, { hard:true, gloss:.30, rz:-.42 });
      A.put(1.635, bb, .075, .095, .050, 3.115, K.warm,
        { hard:true, mode:1, glow:.26, rz:-.42 });
    }
    for (const d of [-.42, .42])                                    // the sign's two drop rods
      A.cap(2.40, s * FB + d, 3.40, .016, .30, .016, K.steelD, { gloss:.50 });
    A.put(2.40, s * FB, .05, 1.30, .30, 3.110, K.black, { hard:true, gloss:.30 });
    A.glyph(2.435, s * FB, 3.110, s > 0 ? '女子训练' : '男子跑鞋',
      { size:.150, gap:.05, color:K.bone, mode:1, glow:.14, tag:'运动鞋' });
  }

  // ================================================================== light
  // Sports retail is lit hard. Four of the shop's own — the brand panel, the two bays and the
  // till — so standing inside the shop it is these the shader picks up and not the aisle.
  A.light(1.20,  0.00, 2.35, [1.00, .96, .90], .46, 3.6);
  A.light(1.20, -3.00, 2.10, [1.00, .97, .93], .36, 3.1);
  A.light(1.20,  3.00, 2.10, [1.00, .97, .93], .36, 3.1);
  A.light(3.10, -3.85, 2.30, [1.00, .95, .88], .26, 2.4);
  // And one over the front of the aisle, which is where the people now are and which the four
  // above — all of them at a 1.20 or on the till — left as the darkest part of the room.
  A.light(3.60, 0.70, 2.40, [1.00, .96, .90], .28, 3.0);

  // ================================================================== what there is to say
  // Every focus below — the thing's own (a, b) pushed 1.15 m out towards the door — has been
  // checked against the collider list above. A label standing inside a fixture is one the player
  // can see the whole time and can never walk up to.
  A.th('运动店', 5.15, 0, '运动鞋正在打折。', 'The trainers are on sale.',
    '运动 sport + 店 shop.', 2.2, 2.5);
  A.th('运动鞋', 1.30, 0, '可以试穿新款运动鞋。', 'You can try the new trainers.',
    '运动鞋 are sports shoes.', 1.9, 1.15);
  // ---- and the four that could not be walked up to --------------------------------------------
  // The comment above says every focus was checked, and when this shop was flood-filled with its
  // own Mall.clampUpper at the 0.30 m walking radius four of them were inside a collider anyway:
  // 运动服 at a 2.57 was in the hanging run, 篮球 at a 2.70 in the ball display, 球拍 at a 2.45
  // in the peg panel's own run and 水壶 at a 3.40 in the accessory gondola. Checking a focus
  // against the collider it belongs to is not enough — it has to be checked against every
  // collider, at the radius, and then against whether that cell joins the door at all.
  //
  // They now hang off the front of the fixtures they belong to, at a 2.85–2.95, which puts every
  // focus in the front lane at a 4.00–4.10. That lane runs b −4.25 to −1.75 on the till side and
  // b −0.65 to +4.55 on the treadmill side, and since the basket stack came out of the doorway the
  // two are one lane.
  A.th('运动服', 2.95, -3.30, '印号码要等二十分钟，名字加十块。',
    'Printing a number takes twenty minutes; a name is ten yuan more.',
    '运动 sport + 服 clothing. 印 is to print — 印号码, to print the number on.', 1.7, 1.35);
  A.th('号码', 2.95, -3.10, '您要几号？十号还是七号？',
    'Which number would you like — ten, or seven?',
    '号码 is a number written on something: a shirt, a door, a ticket, a phone.', 1.7, 1.20);
  A.th('球拍', 2.95, -4.10, '球拍断线了，穿一次一百二，明天下午取。',
    'The racket has broken a string. Restringing is a hundred and twenty; collect tomorrow '
    + 'afternoon.',
    '球 ball + 拍 bat. 穿线 — to thread the strings — is what the machine on the counter does.',
    1.8, 1.35);
  A.th('篮球', 2.95, -2.20, '这个篮球手感不错，投一个试试。',
    'This basketball has a good feel — have a shot with it.',
    '篮 basket + 球 ball. The hoop over the wall behind is 篮球架.', 1.7, 1.10);
  A.th('水壶', 2.85, 2.05, '买一个水壶带着吧，跑步的时候用。',
    'Buy a bottle to take with you — for when you run.',
    '水 water + 壶 pot. A 保温杯 keeps it hot; a 水壶 just carries it.', 1.7, 1.00);
  A.th('跑步机', 2.86, 3.25, '试跑十分钟，屏幕上会显示时间和速度。',
    'Have a ten-minute test run; the screen shows your time and your speed.',
    '跑步 running + 机 machine. The belt is running and the console is counting — get on it.',
    1.8, 1.30);
  A.th('锻炼', 2.86, 4.35, '一个星期锻炼三次就够了。',
    'Three sessions a week is enough.',
    '锻炼 is to train or work out — the word for exercise as a habit, not one run.', 1.8, 1.42);

  // These two headwords are unique among tenant labels, so their getters cannot turn an object in
  // another shop into a sports service. They return the current visit result but mutate nothing;
  // the retained props change only on the completion edge in the existing motion above.
  const serviceVerb = (hz, get) => {
    if (typeof USE_AT === 'undefined' || !USE_AT.mall) return;
    Object.defineProperty(USE_AT.mall, hz, { configurable:true, enumerable:true, get });
  };
  serviceVerb('球拍', () => {
    const next = STRING_LOOKS[(sportService.stringings + 1) % STRING_LOOKS.length];
    return { zh:'穿线', py:'chuān xiàn', en:`restring the racket in ${next.name} — ¥120`,
      secs:SERVICE_SECS.stringing, mins:24, pay:-120, gain:{ mood:7 }, pose:{ type:'reach' },
      done:`换成${next.name}了。`, doneTr:`Restrung in ${next.name}; the racket grid is ready.` };
  });
  serviceVerb('运动服', () => {
    const next = PRINT_LOOKS[(sportService.prints + 1) % PRINT_LOOKS.length];
    return { zh:'印号码', py:'yìn hàomǎ', en:`print ${next.number} on the ${next.name} jersey — ¥30`,
      secs:SERVICE_SECS.printing, mins:20, pay:-30, gain:{ mood:6 }, pose:{ type:'reach' },
      done:`${next.name}${next.number}号印好了。`,
      doneTr:`Number ${next.number} is pressed onto the ${next.name} jersey.` };
  });
};

// ---------------------------------------------------------------------------------------------
// A static campaign window: one oversized trainer in each bay, then running hydration on the
// doorway side and a different sport cue at the outer end. Twelve primitives per bay, twenty-four
// for the tenant. Everything stays behind a 4.40 and at least .70 m from the doorway edge.
MallFit['运动店:glass'] = { alpha: .20, gloss: .94 }; // crisp technical storefront glazing
MallFit['运动店:win'] = (W, bc, side) => {
  const board = C('#20262e'), slate = C('#303842'), ink = C('#11151a');
  const bone = C('#ded9ca'), red = C('#c4483e'), blue = C('#3974ad');
  const volt = C('#bfd74d'), orange = C('#d47b35'), steel = C('#89939b');
  const hero = side > 0 ? blue : red;
  const inner = bc - side * .93, outer = bc + side * .85;

  W.put(3.74, bc, .10, 2.56, 1.38, 1.04, board, { hard:true, gloss:.20 });
  W.put(3.806, bc, .012, 2.28, .10, 1.36, hero, { hard:true, mode:1, glow:.08 });
  W.put(3.95, bc, .32, 2.36, .12, .40, slate, { hard:true, gloss:.38 });
  W.put(4.16, bc, .46, .66, .34, .63, ink, { hard:true, gloss:.28 });

  // Three-box trainer silhouette: outsole, upper and dark collar. Deliberately oversized so the
  // category reads across the atrium without adding six small shoes to each bay.
  W.put(4.28, bc, .20, .52, .06, .84, bone, { hard:true, gloss:.32 });
  W.put(4.22, bc, .26, .36, .14, .93, hero, { round:.035, gloss:.24 });
  W.put(4.20, bc, .15, .16, .055, 1.02, ink, { hard:true, gloss:.20 });

  // A bottle sits toward the doorway but remains well beyond its ±1.5 m clear opening.
  W.cyl(4.28, inner, .49, .075, .28, steel, { gloss:.42 });
  W.cyl(4.28, inner, .65, .055, .05, volt, { gloss:.34 });

  if (side > 0) {
    // Ball, cradle and one visible seam: the right bay is court training.
    W.cyl(4.16, outer, .46, .18, .22, slate, { gloss:.34 });
    W.ball(4.20, outer, .75, .18, .18, .18, orange, { mode:7, gloss:.18 });
    W.put(4.386, outer, .012, .24, .018, .75, ink, { hard:true, mode:7 });
  } else {
    // Body, front pocket and top handle: the left bay is travel/training kit.
    W.put(4.18, outer, .34, .56, .30, .51, red, { round:.055, mode:7, gloss:.16 });
    W.put(4.368, outer, .030, .32, .14, .51, ink, { hard:true, mode:7 });
    W.put(4.18, outer, .05, .34, .05, .70, bone, { round:.02, gloss:.28 });
  }
};

// ---------------------------------------------------------------------------------------------
// Who is in here. This unit is shop('E', -6.0, 10.0), so local (a, b) unrolls to world
// x = 23 − a, z = b − 6.0. Yaw 0 looks along +z, and on this wall +a is −x, so somebody turned to
// face the room is at −π/2.
//
// 陈师傅 works the stringing machine, so he stands behind the till in the one staff pocket this
// plan leaves: a 2.05–2.35, b −4.05 to −2.95, measured with the room's own clampUpper. The
// counter's collider owns everything from a 2.40 forward once the walking radius is counted, and
// the anonymous 店员 js/mall.js already puts in this shop stands at the far end of the same
// pocket, 0.77 m away.
if (typeof MallCast !== 'undefined') MallCast.push(
  { hz:'维修师傅', name:'陈国安', py:'Chén Guó’ān', place:'mall', mallFloor:2,
    rig:'mall-sport-stringer-chen-guoan', temper:'steady',
    look:{ skin:'#c08a61', hair:'#2b2320', hairStyle:'short', top:'#243348', pants:'#1d2a3a',
      shoe:'#101318', apron:'#c2453a', collar:'polo', tall:1.02, faceSeed:9501 },
    spots:[{ h0:10, h1:21, at:[20.80, -9.15], face:-Math.PI / 2, act:'vend' }],
    lines:[['球拍放这儿，明天下午来取。', 'Leave the racket here and collect it tomorrow afternoon.'],
           ['穿线一百二，线自己带的话八十。',
            'Restringing is a hundred and twenty, or eighty if you bring your own string.'],
           ['印号码二十分钟就好，加名字再等十分钟。',
            'A number takes twenty minutes; add a name and it is ten more.']] },
);
