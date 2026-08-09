// 家居店 · 原木家居 · ORIGIN HOME — floor 2
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
//   A.put(a,b,da,db,h,y,colour,opt)  a box: the FIRST size is its depth (along a), the second
//                                    its length along the frontage. Round the wrong way that
//                                    builds a wardrobe lying on its side.
//   A.cyl / A.ball / A.cap / A.taper (a,b,y,...,colour,opt)
//   A.island(a,b,w,dp,fill)          a low display island; `fill(topY)` dresses it
//   A.counter(a,b,w,dp[,colour,till]) a service counter, optionally with a till
//   A.glyph(a,b,y,text,opt)          characters on a surface. They face *outward*, toward the
//                                    concourse, and stand 12 mm proud of the given a.
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.light(a,b,y,rgb,power,radius)  a real light
//   A.th(word,a,b,zh,en,note,reach,y)  something to learn; walks the player to a + 1.15
//
// ---------------------------------------------------------------- READ THIS BEFORE MOVING ANYTHING
//
// The building that used to be inside this shop has gone, and half this file was written round it.
//
// js/mall.js `buildToilets()` once stood the mall's lavatory core at world x 20.1..22.7,
// z 6.3..10.5 on all three decks — in this unit's frame a tiled block filling a 0.30..2.90,
// b -0.10..4.10, the whole right half, with a collider that sealed it. It has since been moved to
// the south end of the *west* wall (read the comment on `buildToilets`; it names this shop as one
// of the two it was standing in). The comment that used to be here described it as immovable, and
// so the second version of this fit-out was laid out as an L wrapped round a phantom: everything
// was built into b -4.92..-0.20 and the other five metres of frontage were left as bare shell
// carpet. A camera in the doorway looked straight down the middle of the unit at nothing.
//
// Proved rather than assumed, because the same mistake has now been made twice here in opposite
// directions: three emissive poles were built at a 1.0..2.6, b 0.6..2.2 — dead inside where the
// core was said to be — and rendered. All three stand in clear air on pink carpet, and behind them
// the shell's back-wall panel, its shop name and its right-hand framed graphic all read. Any claim
// about what occupies this unit is one probe render away from being settled; make it.
//
// So it is a whole 4.8 x 10 m box, and it is laid out as two rooms either side of one divider:
//
//   the left room    b -4.92..-0.20, a 0.21..3.64   dining, bedding, ceramics, textiles, the till
//   the divider      a 0.40..2.44, b -0.32..-0.20   a full-height plastered return, both faces used
//   the right room   b -0.20..4.88, a 0.21..3.65    living room, kitchen, lighting
//   the front aisle  a 2.95..3.65                   runs the whole frontage, both rooms open off it
//   the windows      a 3.66..4.71, both flanks      the shell's platforms, dressed by the tenant
//
// and the divider finishes in a lit display case standing where the eye lands from the doorway.
//
// The audit camera stands at a 4.4, b 0 and looks at the back wall through about 78 degrees, so
// its cone is |b| < 0.81 x (4.4 - a): at a 2.6 that is 1.46 m either side, at a 1.0 it is 2.76.
// Anything meant to be in the hero shot — a person especially — has to be inside that.
//
// ---------------------------------------------------------------- what this shop is
//
// A homeware shop does not sell a bowl by putting forty bowls on a rack. It sells one by laying a
// table with it — the whole trade is staging, and what a customer walks towards is a room they can
// imagine living in. So this unit is four dressed rooms rather than a grid of shelves: a dining
// table laid for four under two pendants, a sitting room on a rug with a sofa somebody is already
// on, a kitchen run with an open dresser lit by the shell's own graphic, and a hall console under
// a mirror. Everything else is merchandising arranged round them — ceramics graded by size in a
// tall bay, folded textiles and baskets in a long low run down the left flank with towels on a
// rail above them, bedding on a low bench against the lit timber panel, a lit lamp étagère and a
// row of five pendants over the aisle for the lighting department, mops in the corner, and the
// till at the back where the shop's own graphic already lights it.
//
// Everything the shop's till will sell you — 杯子 盘子 毛巾 枕头 被子 台灯 拖把 — is somewhere in
// the room to be picked up and looked at. A catalogue with nothing on the shelf is a vending
// machine with a nice door.
//
// Four things it has to get right.
//
//  * `a` runs *outward*: the face of a cupboard that the customer sees is at the LARGER a. Doors,
//    fronts and anything standing on a shelf go in front of the carcass, not behind it.
//  * `A.put`'s first size is depth. Every box here is written (depth, frontage, height).
//  * The tenant is called 原木 — plain timber — so almost everything is one of four woods, all
//    carrying the building's own timber map at its own scale and amount so the joinery batches
//    with the shell's. That map averages well above the 0.22 the shader divides by, so it lifts a
//    colour by about a fifth: every timber here is authored that much darker than it should land.
//  * Cloth gets mode 7 and no material at all. The fabric map is 2.7x bright; at the amount the
//    shell uses on carpet it would take a pile of oatmeal linen to white paper.
MallFit['家居店'] = A => {
  // ---------------------------------------------------------------- palette
  // Four woods, a stone, and then a narrow tonal range of glaze and cloth. The discipline is the
  // point: one saturated thing (the terracotta) in a room of naturals reads as a choice.
  const oak  = C('#8a7154'), oakL = C('#9d8562'), oakM = C('#93795a'), oakD = C('#5a4633'),
        oakX = C('#43331f');
  const paint = C('#6f6a5c'), wallW = C('#e3dbc9'), trimC = C('#2f3236'), band = C('#cec6b2');
  const cream = C('#e0d5bd'), sand = C('#cbb894'), celadon = C('#a3b9a8'),
        clay = C('#b0714c'), charc = C('#5c5f5b'), stoneW = C('#d3c9b3');
  const linen = C('#cfc4ab'), oat = C('#bfae8b'), ecru = C('#dbd1bb'),
        sage = C('#8b9a7f'), greige = C('#a2937d'), rust = C('#9a6247'), indigo = C('#5b6c7c');
  const straw = C('#9d8250'), jute = C('#7d6f52'), brass = C('#a8823c'),
        steelD = C('#6e7981'), wax = C('#e6dcc2'), flame = C('#ffd79a'), warm = C('#ffeac6'),
        paper = C('#ddd0b6'), leaf = C('#4e6b45');
  const GLAZE = [cream, sand, celadon, stoneW, charc, clay];
  const CLOTH = [oat, linen, greige, ecru, sage, rust, indigo];

  // Surfaces. `TB` and `PL` repeat js/mall.js's own MAT.timber and MAT.plaster exactly, so a shelf
  // of the tenant's and a wall of the shell's end up in one instanced batch rather than two — with
  // the single exception of `nrmAmt`, which the building leaves at its default 1 and which at that
  // strength reads as dirt on the timber rather than as grain in it.
  const TB = { mat:'wood',    matScale:.90,  matAmt:.30, nrmAmt:.35 };
  const PL = { mat:'plaster', matScale:2.40, matAmt:.28, nrm:null };
  const W  = { mode:6, ...TB, gloss:.22 };            // furniture: a rounded silhouette
  const WH = { ...W, hard:true };                     // joinery: machined panels and shelves
  const F  = { mode:7 };                              // cloth, and no material at all
  // A cheap deterministic wobble, so nothing is on a grid and nothing is random between reloads.
  const r = (i, n) => ((i * 7 + n * 13) % 9) / 9 - .44;

  // The design desk has three real actions below. Completion advances one visit-local token; the
  // already-running lamp tick consumes it and selects a retained locator. Keeping the clock here
  // also means a `done` getter can collapse game.js's two completion reads into one revision.
  const designClock = { mins:12 * 60 };
  const designAction = { key:null, rev:0, completedMinute:-1 };
  const designMarkers = [], DESIGN_GONE = M.trs(0, -99, 0, 0, 0, 0, 0);

  // ---------------------------------------------------------------- the goods
  // Three or four primitives each, and each one has to say what it is from two metres away: a bowl
  // is wider at the lip than the foot, a stack of plates has a seam every plate, a mug has a handle
  // sticking out of it. `taper` is wide at the bottom and 36% of that at the top, so anything that
  // opens upward — bowl, basket, planter — is the same mesh turned over with `rx`.
  //
  // Every open vessel needs its inside drawn. Surfaces here are one-sided, so a lone flipped taper
  // is a cone you see straight through: the first version of this file shelved forty of them and
  // every bowl in the shop read as a paper crown with a sawtooth rim. A disc set just under the lip
  // is the glaze you would actually see looking into one, and it costs a single primitive.
  const bowl = (a, b, y, d, h, c, o = {}) => {
    A.taper(a, b, y + h / 2, d, h, d, c, { rx:Math.PI, gloss:.34, ...o });
    A.cyl(a, b, y + h * .80 - .012, d * .43, .024, c, { gloss:.24, ...o });
  };
  // Nested, the way a set is shelved: the rims of the ones underneath, then a whole bowl on top.
  const bowls = (a, b, y, n, d, c, o = {}) => {
    for (let i = 0; i < n - 1; i++)
      A.cyl(a, b, y + .016 + i * .027, d / 2 - (n - 1 - i) * .004, .030, c, { gloss:.32, ...o });
    bowl(a, b, y + (n - 1) * .027, d, .076, c, o);
  };
  const plates = (a, b, y, n, rad, c1, c2, o = {}) => {
    for (let i = 0; i < n; i++)
      A.cyl(a, b, y + .014 + i * .026, rad - i * .003, .026, i % 2 ? c2 : c1, { gloss:.34, ...o });
  };
  const mug = (a, b, y, c, o = {}) => {
    A.cyl(a, b, y + .048, .037, .096, c, { gloss:.38, ...o });
    A.cyl(a, b, y + .086, .029, .016, cream, { gloss:.26, ...o });        // the glaze inside
    A.put(a, b + .050, .014, .026, .048, y + .056, c, { hard:true, gloss:.36, ...o });
  };
  const jug = (a, b, y, c, o = {}) => {                  // body, shoulder, handle
    A.cyl(a, b, y + .082, .060, .164, c, { gloss:.38, ...o });
    A.taper(a, b, y + .198, .120, .068, .120, c, { gloss:.38, ...o });
    A.cap(a, b + .072, y + .112, .014, .098, .014, c, { gloss:.34, ...o });
  };
  const vase = (a, b, y, d, h, c, o = {}) => {           // shoulders in, neck up
    A.taper(a, b, y + h * .38, d, h * .76, d, c, { gloss:.40, ...o });
    A.cyl(a, b, y + h * .86, d * .25, h * .30, c, { gloss:.40, ...o });
  };
  const pot = (a, b, y, d, h, c, o = {}) => {            // a planter, rim proud of the body
    A.taper(a, b, y + h / 2, d, h, d, c, { rx:Math.PI, gloss:.28, ...o });
    A.cyl(a, b, y + h - .015, d * .53, .032, c, { gloss:.28, ...o });
  };
  const teapot = (a, b, y, c, o = {}) => {               // body, lid, spout, handle
    A.ball(a, b, y + .070, .086, .070, .086, c, { gloss:.40, ...o });
    A.cyl(a, b, y + .144, .030, .028, c, { gloss:.40, ...o });
    A.cap(a, b - .086, y + .086, .012, .082, .012, c, { rz:-.5, gloss:.38, ...o });
    A.cap(a, b + .096, y + .074, .012, .082, .012, c, { rx:Math.PI / 2, gloss:.38, ...o });
  };
  const basket = (a, b, y, d, h, c, o = {}) => {         // seagrass: the weave is in mode 7
    A.taper(a, b, y + h / 2, d, h, d, c, { rx:Math.PI, mode:7, gloss:.08, ...o });
    A.cyl(a, b, y + h - .016, d * .505, .036, c, { mode:7, gloss:.08, ...o });
  };
  // Something alive. Seven leaf clusters round a stem, which is enough to read as a plant and
  // cheap enough to put three of them in the room. `s` is roughly its height in metres.
  const plant = (a, b, y, s, o = {}) => {
    pot(a, b, y, .26 * s, .24 * s, clay, o);
    A.cap(a, b, y + .52 * s, .04 * s, .52 * s, .04 * s, C('#6b6141'), { gloss:.12, ...o });
    for (let i = 0; i < 7; i++) {
      const t = i / 7 * Math.PI * 2;
      A.ball(a + Math.cos(t) * .15 * s, b + Math.sin(t) * .15 * s,
        y + (.56 + (i % 3) * .10) * s, .15 * s, .09 * s, .15 * s, leaf,
        { mode:7, gloss:.10, ...o });
    }
  };
  // A tonal pile of folded cloth. Nothing is square to anything, no two are the same colour, and
  // the whole point is that it looks handled — a stack of identical rectangles is a pallet.
  const pile = (a, b, y, n, da, db, s, o = {}) => {
    for (let i = 0; i < n; i++)
      A.put(a + r(i, s) * .026, b + r(i, s + 2) * .028, da - i * .011, db - i * .010, .050,
        y + .028 + i * .054, CLOTH[(i * 2 + s) % CLOTH.length],
        { ...F, round:.026, ry:r(i, s + 5) * .06, ...o });
  };
  // A folded quilt, which is a bolster of cloth with a rolled edge rather than a cube.
  const quilt = (a, b, y, da, db, h, c, o = {}) => {
    A.put(a, b, da, db, h, y + h / 2, c, { ...F, round:.055, ...o });
    A.cap(a + da / 2 - .05, b, y + h / 2, .09, db - .05, .09, c, { rx:Math.PI / 2, ...F, ...o });
  };
  const pillow = (a, b, y, da, db, c, o = {}) =>
    A.put(a, b, da, db, .125, y + .063, c, { ...F, round:.058, ...o });
  const candle = (a, b, y, h, lit, o = {}) => {
    A.cyl(a, b, y + h / 2, .025, h, wax, { gloss:.16, ...o });
    A.cap(a, b, y + h + .012, .005, .020, .005, C('#3c3227'), { gloss:.1, ...o });
    if (lit) A.ball(a, b, y + h + .033, .010, .019, .010, flame, { mode:1, glow:.15, ...o });
  };
  // A chair. `yb` is the floor it stands on, so the same one can go on the window platform.
  const chair = (ca, cb, sgn, tilt, yb = 0) => {
    const o = { ...W, ry:tilt, tag:'家具' }, oh = { ...WH, ry:tilt, tag:'家具' };
    A.put(ca, cb, .40, .40, .048, yb + .440, oakL, o);
    for (const da of [-.16, .16]) for (const db of [-.16, .16])
      A.put(ca + da, cb + db, .042, .042, .42, yb + .21, oak, o);
    for (const db of [-.16, .16])
      A.put(ca + sgn * .185, cb + db, .042, .042, .47, yb + .655, oak, o);
    A.put(ca + sgn * .185, cb, .034, .38, .12, yb + .845, oakL, oh);
    A.put(ca + sgn * .167, cb, .026, .36, .09, yb + .655, oakL, oh);
  };
  // A sofa, facing +a — towards the concourse, which is the way a customer meets it. `ca` is the
  // middle of its 0.98 m depth and `cb` the middle of its length; only the length varies, because
  // a two-seater and a three-seater are the same object with a different number of cushions.
  // Everything soft is mode 7 with no material; the carcass and the feet are timber, so the shop's
  // joinery and its upholstery stay in two batches rather than four.
  const sofa = (ca, cb, len, c, o = {}) => {
    const t = { ...F, tag:'沙发', ...o }, w = { ...WH, gloss:.22, tag:'沙发', ...o };
    A.put(ca, cb, .98, len, .18, .17, oakD, w);                                  // carcass
    A.put(ca - .36, cb, .26, len, .60, .64, c, { ...t, round:.07 });              // back
    A.put(ca + .13, cb, .68, len - .30, .10, .31, greige, t);                     // seat deck
    for (let i = 0; i < 3; i++) {
      const sb = cb + (i - 1) * (len - .34) / 3;
      A.put(ca + .13, sb, .66, (len - .40) / 3, .15, .435, c, { ...t, round:.05 });
      A.put(ca - .20, sb, .17, (len - .44) / 3, .38, .62, c, { ...t, round:.06 });
    }
    for (const s of [-1, 1])                                                      // arms
      A.put(ca + .04, cb + s * (len / 2 - .10), .90, .20, .32, .48, c, { ...t, round:.09 });
    for (const da of [-.40, .40]) for (const db of [-1, 1])
      A.put(ca + da, cb + db * (len / 2 - .13), .07, .07, .10, .05, oakD, w);
  };
  // The same thing at chair scale. `sgn` puts the back on the +a or -a side, so an armchair can be
  // turned to face the sofa it belongs with rather than always facing the door.
  const armchair = (ca, cb, sgn, tilt, c) => {
    const t = { ...F, ry:tilt, tag:'家具' }, w = { ...WH, gloss:.22, ry:tilt, tag:'家具' };
    A.put(ca, cb, .82, .84, .16, .16, oakD, w);
    A.put(ca + sgn * .30, cb, .22, .84, .54, .60, c, { ...t, round:.08 });
    A.put(ca - sgn * .06, cb, .60, .60, .12, .30, greige, t);
    A.put(ca - sgn * .04, cb, .58, .56, .15, .425, c, { ...t, round:.05 });
    for (const s of [-1, 1])
      A.put(ca, cb + s * .34, .74, .16, .28, .45, c, { ...t, round:.08 });
    for (const da of [-.32, .32]) for (const db of [-.34, .34])
      A.put(ca + da, cb + db, .07, .07, .10, .05, oakD, w);
  };
  // A table lamp standing on a surface at height `y`: turned timber foot, a brass stem and a
  // tapered linen shade with the light in it. Three primitives, and it is the shop's own 台灯 at
  // 168 kuai, so there is one of these in every room-set here on purpose.
  const lamp = (a, b, y, c = cream, o = {}) => {
    A.cyl(a, b, y + .015, .062, .030, oakD, { mode:6, ...TB, gloss:.30, tag:'台灯', ...o });
    A.cap(a, b, y + .1715, .012, .28, .012, brass, { gloss:.55, tag:'台灯', ...o });
    A.taper(a, b, y + .3815, .26, .21, .25, c, { mode:1, glow:.12, tag:'台灯', ...o });
  };

  // ---------------------------------------------------------------- the floor
  // The shell lays this unit's inner field in `col.carpet`, a dusty mauve, and under the fabric map
  // — 2.7x bright — it arrives as bubblegum pink: the loudest thing in a shop whose whole
  // proposition is quiet timber. It is set in the shop's spec in js/mall.js and cannot be changed
  // from here, so it gets a floor laid over it. Boards running the length of the unit on a dark
  // underlay, with an 8 mm shadow gap between them, because one 4 x 9 m slab of colour with a wood
  // map on it is a sheet of veneer and not a floor. Everything stacked on it steps by at least
  // 4 mm, because two faces at the same height here do not average out, they flicker: underlay
  // 20..32, boards 34..52, rug 56..72, rug field 76..88, doormat 56..70.
  const boards = (a0, a1, b0, b1, s) => {
    A.put((a0 + a1) / 2, (b0 + b1) / 2, a1 - a0, b1 - b0, .012, .026, oakX,
      { hard:true, gloss:.06, ...TB });
    const n = Math.max(2, Math.round((a1 - a0) / .196)), p = (a1 - a0) / n;
    for (let i = 0; i < n; i++)
      A.put(a0 + p * (i + .5), (b0 + b1) / 2, p - .008, b1 - b0, .018, .043,
        [oak, oakL, oakM][(i + s) % 3], { hard:true, gloss:.20, ...TB });
  };
  boards(.40, 3.64, -4.86, -.20, 0);           // the left room
  boards(.28, 3.64, -.20, 4.88, 2);            // the right room, out to the partition
  boards(3.64, 4.34, -1.62, 1.62, 1);          // the way in
  A.put(3.97, 0, .50, 2.70, .014, .063, C('#3b3f44'), { hard:true, gloss:.08, ...F });  // the mat

  // ---------------------------------------------------------------- the divider
  // Built as a lining to the lavatory core's south face and kept when the core went, because a
  // 4.8 x 10 m box with nothing in the middle of it is a hall, not a shop: this is the one piece
  // of wall that makes two rooms out of one unit and gives each of them a fourth side. Plastered
  // and skirted in the shell's own colours on *both* faces now — the left room reads it as the
  // end of the dining side, the right room hangs a mirror and a console on it. It runs from a 0.40
  // (clear of the back wall's feature panel, which plugs the gap behind it) to a 2.44, where it
  // hands over to the display case.
  A.put(1.42, -.26, 2.04, .12, 3.55, 1.775, wallW, { hard:true, gloss:.10, ...PL });
  for (const s of [-1, 1]) {
    A.put(1.42, -.26 + s * .085, 2.00, .05, .16, .08, trimC, { hard:true, gloss:.24 });
    A.put(1.42, -.26 + s * .085, 2.00, .05, .05, 3.44, band, { hard:true, gloss:.18 });
  }

  // ---------------------------------------------------------------- the display case in the door
  // Everything seen from this doorway is either the shop or the lavatory, and the join between the
  // two lands at eye level dead ahead. So the wall does not simply stop: it finishes in a
  // full-height timber pier with a lit case in it facing the way in. It is the first thing bought
  // in this shop and the last thing seen on the way out.
  const CA = 2.74, CB = -.46;
  A.put(2.49, CB, .10, .52, 3.55, 1.775, oakD, WH);                       // back
  for (const s of [-1, 1]) A.put(CA, CB + s * .23, .50, .06, 3.55, 1.775, oak, WH);  // stiles
  A.put(CA, CB, .50, .40, 1.16, 2.92, oak, WH);                           // head
  A.put(CA, CB, .50, .40, .96, .48, oak, WH);                             // base
  A.put(2.72, CB, .54, .56, .05, 3.545, oakL, WH);                        // capping
  A.put(2.72, CB, .54, .56, .05, .955, oakL, WH);                         // sill
  A.put(2.545, CB, .02, .40, 1.36, 1.66, C('#f3e6cc'), { hard:true, mode:1, glow:.09 });
  for (const y of [1.30, 1.92]) A.put(CA, CB, .48, .40, .035, y, oakL, WH);
  bowls(CA, CB - .10, .980, 3, .17, celadon, { tag:'台灯' });
  plates(CA, CB + .09, .980, 4, .092, cream, sand, { tag:'台灯' });
  // 台灯. A lit lamp on a shelf is the warmest thing in a room this size, and this is 168 kuai of
  // the shop's own stock standing where the customer meets it first. The compartment it stands in
  // is 58 cm; the lamp is 50, which is the whole reason the case has two shelves and not three.
  A.cyl(CA, CB - .07, 1.3305, .066, .026, oakD, { mode:6, ...TB, gloss:.3, tag:'台灯' });
  A.cap(CA, CB - .07, 1.487, .013, .28, .013, brass, { gloss:.55, tag:'台灯' });
  A.taper(CA, CB - .07, 1.697, .26, .21, .25, cream, { mode:1, glow:.13, tag:'台灯' });
  vase(CA, CB + .13, 1.3175, .11, .22, charc, { tag:'台灯' });
  bowls(CA, CB - .09, 1.9375, 3, .155, sand, { tag:'台灯' });
  for (let i = 0; i < 2; i++) mug(CA, CB + .02 + i * .10, 1.9375, GLAZE[i + 1], { tag:'台灯' });
  A.stop(2.42, 2.98, -.76, -.18);

  // ---------------------------------------------------------------- the till, back left
  // Under the shell's own lit graphic, which is the one piece of wall art the building gives this
  // unit that the lavatory has not swallowed. So the till stands where the shop is already lit, and
  // the customer walks the length of the room to reach it, past everything that is for sale.
  // The counter stands at a 0.95 rather than hard against the wall, and that 0.15 m is the whole
  // reason there is a cashier in this shop: `counter` builds its body dp deep centred on a, so at
  // 0.80 the space left between the carcass and the back wall's skirting was 0.29 m and anybody
  // put there stood inside one or the other. At 0.95 it is 0.44 m — still a cashier's slot rather
  // than a room, which is what it is in a real shop. It cannot go further forward: the left
  // flank's run starts at a 1.34 and the counter's carcass front is now at 1.25.
  // ---- and why this shop builds its own 收银台 hotspot -----------------------------------------
  // `counter` hangs the till's word at (a + dp/2 − 0.75, b), which here is a 0.50, b −4.10, and
  // `A.th` then walks the player to a 1.65 at that same b. Flood-filling this unit with its own
  // Mall.clampUpper at the 0.30 m walking radius, b −4.10 at any depth is inside the left flank
  // run's collider: that run occupies b −4.95 to −4.28, which at the radius owns everything out
  // to −3.98. So the till's walk-to point stood in the shelving and this shop could not be paid
  // in — the same failure the sports shop had at its door, in a different disguise.
  //
  // `A.hasTill` is the flag `counter` checks before building the hotspot, so setting it first
  // takes only the word and leaves every millimetre of the fixture where it is. The block the
  // 收银台 lettering is written on is re-made below, and the word itself is hung with the sample
  // desk's three at the foot of this file, in the b −3.95 to −3.65 pocket the fill does reach.
  A.hasTill = true;
  A.counter(.95, -4.10, 1.50, .60, paint);
  A.put(.95, -3.37, .76, .30, .26, 1.24, trimC, { hard:true, gloss:.30, tag:'收银台' });
  for (const pb of [-.52, 0, .52])                       // a timber front, in three panels
    A.put(1.262, -4.10 + pb, .016, .44, .62, .55, oak, { ...WH, gloss:.24 });
  A.glyph(1.34, -3.37, 1.30, '收银台', { size:.078, gap:.026, color:C('#f2d89f'), glow:.12 });
  const CT = .98;                                        // the stone top
  A.cyl(.91, -4.70, CT + .082, .082, .58, paper, { rz:Math.PI / 2, gloss:.16, mode:7 });
  A.cyl(.87, -4.18, CT + .056, .046, .112, oakD, { mode:6, ...TB, gloss:.30 });
  for (let i = 0; i < 3; i++)                            // pens in a pot
    A.cap(.87 + r(i, 4) * .03, -4.18 + r(i, 6) * .03, CT + .13, .008, .16, .008,
      [charc, clay, oakD][i], { rz:r(i, 2) * .14, gloss:.3 });
  for (let i = 0; i < 3; i++)                            // carrier bags, folded
    A.put(.87, -3.55, .22 - i * .01, .16 - i * .01, .014, CT + .020 + i * .016, paper,
      { hard:true, ...F, ry:r(i, 3) * .05 });
  // ---- 量房 · 设计台 --------------------------------------------------------------------------
  // A furniture shop that will sell you a 2.2 m sofa without asking what it has to fit into is a
  // warehouse. This is the desk where it asks: the plan of the player's own flat, propped up where
  // the money changes hands, with the tape beside it and the finish samples on a fan next to that.
  //
  // The plan drawn on the board is the real one. js/home-walls.js settles the flat as eight walled
  // rooms between x −6.00..6.00 and z −5.00..3.20, and the five blocks below are 主卧, 客厅, 餐厅,
  // 次卧 and 厨房 at their true proportions off `HomeWalls.ROOMS`. It is drawn rather than read at
  // build time on purpose — a fit-out that reaches into another scene's module to lay out a board
  // is a fit-out that stops building the day that module is renamed — but the numbers came from
  // there and the word cards below quote them.
  //
  // It costs no floor: everything here stands on the counter top at CT, inside the counter's own
  // collider. 34 primitives for the desk and the swatch fan together.
  A.put(.86, -3.62, .05, .46, .38, CT + .19, trimC, { hard:true, gloss:.28 });
  A.put(.888, -3.62, .012, .42, .34, CT + .19, C('#f2ecdc'), { hard:true, mode:7, gloss:.06 });
  // The rooms, at plan scale: 0.030 m of board to 1 m of flat.
  const PLAN_ROOMS = [[-.129, .036, .102, .135], [.031, .015, .161, .162],
    [.148, -.009, .098, .114], [-.129, -.100, .102, .111], [.155, -.118, .114, .084]];
  PLAN_ROOMS.forEach(([db, dy, w, h]) =>
    A.put(.896, -3.62 + db, .006, w, h, CT + .19 + dy, C('#b9ac90'),
      { hard:true, mode:7, gloss:.05 }));
  A.glyph(.902, -3.62, CT + .330, '量房设计', { size:.042, gap:.014, color:trimC, glow:0 });
  // The tape, lying where it was put down.
  A.cyl(.95, -3.30, CT + .028, .042, .046, C('#c8b24a'), { rz:Math.PI / 2, gloss:.32 });
  A.put(.99, -3.22, .085, .016, .004, CT + .008, wax, { hard:true, mode:7, ry:.28 });
  // The finish fan: ten chips on one pin, spread the way a sample fan opens. Two woods, two
  // stones, three cloths and three paints, which is what this shop is made of.
  // Splayed along b with a little yaw on each, rather than swept round the pin with trigonometry.
  // A chip's own length runs along world x here and `ry` turns it in world xz, while an offset
  // written in (a, b) has +a pointing at −x on this wall — so a fan laid out with cos/sin in the
  // tenant frame and ry in the world frame comes out mirrored, and the chips cross each other.
  // Staggering them is the same picture without the frame problem.
  const FAN = [oak, oakL, oakD, stoneW, charc, linen, sage, rust, indigo, paint];
  A.cyl(.92, -4.45, CT + .012, .034, .020, brass, { gloss:.55 });
  A.cyl(.92, -4.45, CT + .075, .006, .13, brass, { gloss:.55 });
  // b -4.45 and not -4.52: the till's roll of wrapping paper lies along a at b -4.78 to -4.62,
  // and the outermost chip of the fan was inside it.
  FAN.forEach((c, i) => {
    const t = (i - 4.5) * .105;
    A.put(.99, -4.45 + (i - 4.5) * .026, .150, .030, .005,
      CT + .028 + i * .008, c, { hard:true, mode:7, gloss:.16, ry:t });
  });
  // Three locators, and no fourth interpretation layer: 房间 lands on the first retained room
  // block, 客厅 on the retained living-room block, and 送 on the exact finish chip named by that
  // action. They are the same opaque box batch, only one is present at a time, and all three start
  // parked until an action has actually completed.
  const designMarker = (key, a, b, y, da, db, h, ry=0) => {
    const p = A.put(a, b, da, db, h, y, brass,
      { hard:true, mode:7, gloss:.18, glow:.08, ry, tag:'量房设计' });
    p.mallHomeDesign = key;
    designMarkers.push({ key, p, rest:p.m });
    p.m = DESIGN_GONE;
  };
  const room = PLAN_ROOMS[0], living = PLAN_ROOMS[1], deliveryChip = 7;
  designMarker('room', .902, -3.62 + room[0], CT + .19 + room[1], .004, .052, .052);
  designMarker('living', .902, -3.62 + living[0], CT + .19 + living[1], .004, .052, .052);
  designMarker('delivery', .99, -4.45 + (deliveryChip - 4.5) * .026,
    CT + .034 + deliveryChip * .008, .158, .038, .004, (deliveryChip - 4.5) * .105);
  A.dynamicVisual(designMarkers.map(q => q.p));
  // 购物篮, stacked just inside the door where every shop keeps them — but tucked against the
  // display case rather than in the middle of the opening. The lavatory block takes the right half
  // of this shopfront, so the way in is 0.74 m wide, and a stack of baskets standing in it would
  // have left two gaps a body cannot pass through.
  for (let i = 0; i < 4; i++)
    A.put(3.30, -.53, .32, .26, .12, .128 + i * .098, C('#5f5647'),
      { round:.03, ...F, tag:'购物篮', ry:r(i, 2) * .05 });
  A.cap(3.30, -.53, .54, .012, .28, .012, steelD, { rx:Math.PI / 2, gloss:.45, tag:'购物篮' });
  A.stop(3.12, 3.48, -.68, -.38);

  // ---------------------------------------------------------------- the tall bay, back wall
  // 餐具. Goods graded by size up the unit, the biggest on the bottom shelf, which is both how a
  // ceramics department is merchandised and the only way five shelves of round brown objects gain
  // an order the eye can follow. It fits the 1.05 m slot between the shell's framed graphic and its
  // feature panel, so it is one bay rather than the two the old plan drew — the second of which
  // was inside the lavatory.
  // A shelf board is 35 mm thick and `y` is its centre, so anything standing on it starts at
  // y + 0.018. Written as the shelf height plus a guess, every pot in the bay floats.
  const BB = -2.655, SH = [.38, .78, 1.18, 1.58, 1.98], on = y => y + .018;
  A.put(.315, BB, .05, 1.05, 2.30, 1.16, oakD, WH);                     // back board
  for (const s of [-1, 1]) A.put(.57, BB + s * .505, .46, .04, 2.24, 1.17, oakL, WH);
  A.put(.57, BB, .44, .97, .12, .06, oakD, { ...WH, gloss:.28 });        // plinth
  for (const y of SH) A.put(.57, BB, .46, .97, .035, y, oakL, WH);
  A.put(.58, BB, .52, 1.14, .05, 2.335, oak, WH);                       // cornice
  A.put(.345, BB, .02, .95, 2.10, 1.20, C('#f3e6cc'), { hard:true, mode:1, glow:.06 });
  // The section sign goes on a valance standing on the cornice, flush with its front edge. Set
  // back on the carcass instead, the cornice's own overhang hides it from anyone under 2 m.
  A.put(.72, BB, .28, 1.04, .26, 2.47, oakD, { ...WH, gloss:.24 });
  A.glyph(.865, BB, 2.47, '餐具', { size:.115, gap:.04, color:C('#f2d89f'), glow:.10 });
  A.stop(.28, .84, BB - .55, BB + .55);
  bowls(.57, BB - .30, on(SH[0]), 4, .26, clay, { tag:'碗' });
  plates(.57, BB + .02, on(SH[0]), 5, .140, cream, sand, { tag:'碗' });
  bowl(.57, BB + .33, on(SH[0]), .21, .092, charc, { tag:'碗' });
  bowls(.57, BB - .31, on(SH[1]), 4, .21, celadon, { tag:'碗' });
  plates(.57, BB + .01, on(SH[1]), 4, .122, sand, ecru, { tag:'碗' });
  jug(.57, BB + .33, on(SH[1]), stoneW, { tag:'碗' });
  bowls(.57, BB - .30, on(SH[2]), 3, .17, sand, { tag:'碗' });
  teapot(.57, BB + .02, on(SH[2]), charc, { tag:'碗' });
  bowls(.57, BB + .33, on(SH[2]), 3, .145, cream, { tag:'碗' });
  for (let i = 0; i < 5; i++) mug(.57, BB - .38 + i * .19, on(SH[3]), GLAZE[i % 6], { tag:'碗' });
  // The top shelf has 27 cm to the cornice, so nothing tall goes on it. The old file stood a 26 cm
  // vase up here and it grew straight out through the top of the bay.
  for (let i = 0; i < 4; i++)
    bowl(.57, BB - .34 + i * .23, on(SH[4]), .125 + (i % 2) * .028, .058, GLAZE[(i + 3) % 6],
      { tag:'碗' });

  // ---------------------------------------------------------------- bedding, back wall
  // 被子 and 枕头 are both on this shop's list and neither of them was anywhere in the room. They
  // go on a low bench against the shell's slatted timber panel, which is washed from the cove above
  // it and is the best backdrop in the unit — and low is the only thing that can stand there
  // without burying the one piece of architecture the tenant is given.
  A.put(.71, -1.42, .54, 1.26, .09, .395, oakL, { ...W, tag:'家具' });
  A.put(.71, -1.42, .44, 1.10, .28, .21, oak, { ...WH, gloss:.20, tag:'家具' });
  A.put(.71, -1.42, .40, 1.02, .12, .06, oakD, { ...WH, gloss:.28, tag:'家具' });
  quilt(.70, -1.78, .44, .46, .44, .18, ecru,   { tag:'被子' });
  quilt(.70, -1.78, .62, .42, .40, .15, greige, { tag:'被子' });
  quilt(.72, -1.20, .44, .48, .50, .20, oat,    { tag:'被子' });
  pillow(.70, -1.20, .64, .38, .46, linen, { tag:'枕头' });
  pillow(.66, -1.21, .765, .34, .42, sage,  { tag:'枕头', ry:.07 });
  A.put(.43, -1.47, .04, .66, .24, 1.14, oakD, { ...WH, gloss:.24 });
  A.glyph(.455, -1.47, 1.14, '卧室', { size:.10, gap:.035, color:C('#f2d89f'), glow:.08 });
  A.stop(.44, 1.00, -2.07, -.78);
  // Nothing goes on the back wall between b -0.35 and 0.35. The shell writes 原木家居 across the
  // feature panel at b -0.66..0.66 in 26 cm gold and it is the best-lit thing in the unit; the
  // previous pass hung a mirror over the first character of it and wrote the name a second time
  // further along, on the belief that the lavatory was eating the other three. It was not. One
  // shop, one name — the mirror has gone to the divider in the right room, which is a wall that
  // has nothing on it and is seen from two metres rather than four.

  // ---------------------------------------------------------------- the left flank
  // A long low run against the partition: baskets in the bottom cubbies, folded cloth in the top
  // ones, more of both on the counter surface. It stops at 0.95 and starts at a 1.40, which keeps
  // it clear of the till behind it and under the shell's own lit panel at a 1.63..2.97 — that panel
  // is the brightest thing on this wall and burying it would be throwing away free light.
  const RB = -4.61;
  A.put(2.35, -4.875, 1.94, .05, .94, .47, oakD, WH);                       // back
  A.put(2.35, RB, 1.86, .50, .13, .065, oakD, { ...WH, gloss:.28 });        // plinth
  for (const av of [1.42, 2.04, 2.66, 3.28]) A.put(av, RB, .04, .56, .76, .51, oakL, WH);
  A.put(2.35, RB, 1.86, .56, .035, .505, oakL, WH);                         // mid shelf
  A.put(2.33, RB, 2.02, .60, .05, .925, oakL, W);                           // top
  A.stop(1.34, 3.36, -4.95, -4.28);
  for (let i = 0; i < 3; i++) {
    const ca = 1.73 + i * .62;                                              // cubby centres
    basket(ca - .13, RB, .13, .26, .30, straw, { tag:'毛巾' });
    basket(ca + .14, RB, .13, .22, .26, C('#8d7448'), { tag:'毛巾' });
    pile(ca, RB, .525, 4, .46, .40, i, { tag:'毛巾' });
  }
  pile(1.62, RB, .95, 4, .42, .38, 5, { tag:'毛巾' });
  basket(2.24, RB, .95, .28, .24, straw, { tag:'毛巾' });
  pile(2.86, RB, .95, 3, .40, .36, 2, { tag:'毛巾' });
  plates(3.10, RB, .95, 4, .125, cream, sand);
  // 毛巾 on a rail under the lit panel. Different lengths, not plumb, and folded over the tube — a
  // row of identical rectangles at one height is a shelf of books, whatever colour it is painted.
  A.cap(2.35, -4.72, 1.28, .016, 1.70, .016, steelD, { rz:Math.PI / 2, gloss:.52 });
  for (const av of [1.55, 3.15])
    A.put(av, -4.79, .04, .13, .04, 1.28, steelD, { hard:true, gloss:.4 });
  for (let i = 0; i < 6; i++) {
    const av = 1.62 + i * .29, c = CLOTH[(i * 3) % CLOTH.length], drop = .26 + ((i * 5) % 3) * .04;
    A.put(av, -4.712, .24, .022, drop, 1.275 - drop / 2, c,
      { ...F, round:.018, ry:r(i, 3) * .05, tag:'毛巾' });
    A.put(av, -4.720, .24, .048, .045, 1.298, c, { ...F, round:.018, tag:'毛巾' });
  }
  // One floating shelf in front of the shell's lightbox, so the panel stops being a brown rectangle
  // and becomes what is behind a row of silhouetted pots.
  A.put(2.30, -4.65, 1.10, .26, .04, 1.90, oakL, WH);
  for (const s of [-1, 1])
    A.put(2.30 + s * .46, -4.77, .05, .05, .16, 1.80, oakD, { hard:true, gloss:.2 });
  vase(1.98, -4.65, 1.92, .15, .30, stoneW);
  bowls(2.26, -4.65, 1.92, 3, .19, clay);
  jug(2.58, -4.65, 1.92, celadon);
  candle(2.68, -4.65, 1.92, .16, false);

  // ---------------------------------------------------------------- the vignette: a laid table
  // The one room in the shop. Solid timber, four chairs pushed in, a runner, four settings and a
  // bowl of fruit — laid, not stacked, because a laid table is the only way a plate stops being
  // stock and starts being something you can picture at home.
  const TA = 2.05, TB2 = -2.55, TT = .750;
  A.put(2.15, TB2, 2.00, 2.80, .016, .064, jute, { hard:true, ...F });          // the rug
  A.put(2.15, TB2, 1.80, 2.56, .012, .082, C('#6e6349'), { hard:true, ...F });
  A.put(TA, TB2, .92, 1.76, .045, TT - .022, oakL, { ...W, tag:'家具' });
  A.put(TA, TB2, .80, 1.62, .07, .665, oak, { ...WH, gloss:.20, tag:'家具' });  // apron
  for (const da of [-.36, .36]) for (const db of [-.76, .76])
    A.put(TA + da, TB2 + db, .08, .08, .63, .315, oak, { ...W, tag:'家具' });   // legs
  // The two chairs nearest the door are turned a few degrees off square, the way a chair is after
  // somebody has sat in one.
  chair(TA - .72, TB2 - .45, -1, .04);  chair(TA - .72, TB2 + .45, -1, -.03);
  chair(TA + .72, TB2 - .45,  1, -.06); chair(TA + .72, TB2 + .45,  1, .05);
  A.stop(1.10, 3.00, TB2 - .75, TB2 + .75);
  // The runner, then four settings on it, then the middle of the table.
  A.put(TA, TB2, .40, 1.64, .012, TT + .010, oat, { hard:true, ...F });
  for (const [sa, sb] of [[TA - .27, TB2 - .45], [TA - .27, TB2 + .45],
                          [TA + .27, TB2 - .45], [TA + .27, TB2 + .45]]) {
    const face = sa > TA ? 1 : -1;
    A.cyl(sa, sb, TT + .026, .118, .028, cream, { gloss:.36, tag:'家具' });
    bowl(sa, sb, TT + .040, .148, .058, celadon, { tag:'家具' });
    A.put(sa, sb - face * .205, .150, .110, .010, TT + .006, linen,
      { hard:true, ...F, tag:'家具' });
    for (const g of [-.011, .011])
      A.cap(sa, sb + face * (.195 + g), TT + .010, .005, .205, .005, oakD,
        { rz:Math.PI / 2, mode:6, ...TB, gloss:.2, tag:'家具' });
    A.cyl(sa - face * .18, sb + face * .165, TT + .048, .032, .085, stoneW,
      { gloss:.42, tag:'家具' });
  }
  bowl(TA, TB2, TT + .004, .28, .090, oakL, { mode:6, ...TB, gloss:.24, tag:'家具' });
  for (let i = 0; i < 3; i++)
    A.ball(TA + r(i, 1) * .11, TB2 + r(i, 4) * .17, TT + .070, .046, .043, .046,
      [C('#93a05e'), C('#b8763f'), C('#8d9c58')][i], { gloss:.22, tag:'家具' });
  for (const cb of [TB2 - .58, TB2 + .58]) {
    A.cyl(TA - .30, cb, TT + .024, .046, .040, brass, { gloss:.58, tag:'家具' });
    candle(TA - .30, cb, TT + .044, .20, true, { tag:'家具' });
  }
  // Two pendants over it, hung either side of the runner rather than over one end of it.
  for (const pb of [TB2 - .50, TB2 + .50]) {
    A.cyl(TA, pb, 2.76, .010, 1.56, steelD, { gloss:.5 });
    A.taper(TA, pb, 1.84, .32, .28, .32, oakL, { mode:6, ...TB, gloss:.26 });
    A.cyl(TA, pb, 1.715, .108, .05, warm, { mode:1, glow:.26 });
  }

  // ================================================================ THE RIGHT ROOM
  // Five metres of frontage and three and a half of depth that were bare shell carpet until now.
  // It is laid out as three things a customer can picture living in — a hall, a sitting room and a
  // kitchen — reading left to right from the doorway, with the front aisle at a 2.95..3.65 running
  // past all of them and the lighting department overhead.

  // ---------------------------------------------------------------- the hall: console and mirror
  // The divider's other face. A console table 1.56 m long against it, a mirror over it and a lamp
  // on it: the first thing on your right as you come past the display case, seen from two metres.
  A.put(1.50, -.02, 1.44, .30, .12, .06, oakD, { ...WH, gloss:.28, tag:'家具' });    // plinth
  A.put(1.50, -.005, 1.56, .37, .58, .41, oak, { ...WH, tag:'家具' });               // carcass
  for (const da of [-.50, 0, .50])                                                   // three doors
    A.put(1.50 + da, .197, .46, .016, .48, .40, oakL, { ...WH, gloss:.24, tag:'家具' });
  for (const da of [-.50, 0, .50])
    A.cap(1.50 + da, .213, .40, .010, .16, .010, brass, { gloss:.55, tag:'家具' });
  A.put(1.50, -.005, 1.64, .44, .045, .7225, oakL, { ...W, tag:'家具' });            // top
  A.stop(.70, 2.30, -.26, .24);
  A.put(1.55, -.165, 1.10, .06, .92, 1.78, oakD, { ...WH, gloss:.26 });              // mirror frame
  A.put(1.55, -.128, 1.02, .012, .84, 1.78, C('#c6d0d4'), { hard:true, mode:1, gloss:.88 });
  lamp(1.15, 0, .745);
  vase(1.60, 0, .745, .13, .26, celadon);
  bowl(1.92, 0, .745, .20, .085, clay);
  for (let i = 0; i < 3; i++)                                                        // books, flat
    A.put(2.16 + r(i, 2) * .03, .00 + r(i, 5) * .04, .21, .15, .026, .758 + i * .028,
      [indigo, rust, sage][i], { hard:true, gloss:.14, ry:r(i, 3) * .08 });

  // ---------------------------------------------------------------- the sitting room
  // The room-set the shop's own catalogue promises: MALL_GOODS' completion line for browsing here
  // is 那张沙发比家里的舒服 — "that sofa is more comfortable than mine" — and until now there was
  // no sofa anywhere in the unit. Sofa facing the door with the back to the feature panel, a low
  // table in front of it, an armchair turned in, and the light on this side coming off two lamps
  // rather than the ceiling, which is the difference between a living room and a showroom.
  A.put(1.72, 1.45, 2.60, 2.54, .016, .064, jute, { hard:true, ...F });
  A.put(1.72, 1.45, 2.34, 2.28, .012, .082, C('#6e6349'), { hard:true, ...F });
  sofa(.93, 1.40, 2.00, oat);
  A.stop(.42, 1.44, .38, 2.42);
  for (const [pb, pc] of [[.78, sage], [2.02, rust]])                                // cushions
    A.put(.92, pb, .18, .40, .38, .70, pc, { ...F, round:.09, ry:r(1, 4) * .10, tag:'枕头' });
  quilt(1.05, 2.30, .64, .42, .34, .14, ecru, { tag:'被子' });                       // a throw
  // The low table. 0.05 top on 0.07 legs, which is the one piece of furniture in the room the eye
  // reads edge-on, so it is the one that cannot be a slab.
  A.put(1.98, 1.44, .62, 1.16, .05, .415, oakL, { ...W, tag:'家具' });
  A.put(1.98, 1.44, .52, 1.00, .028, .18, oak, { ...WH, gloss:.20, tag:'家具' });
  for (const da of [-.25, .25]) for (const db of [-.50, .50])
    A.put(1.98 + da, 1.44 + db, .07, .07, .39, .195, oak, { ...W, tag:'家具' });
  A.stop(1.64, 2.32, .84, 2.04);
  A.put(1.98, 1.14, .30, .40, .022, .451, oakD, { ...WH, gloss:.30, tag:'家具' });   // a tray
  mug(1.92, 1.06, .462, celadon, { tag:'杯子' });
  mug(2.04, 1.22, .462, sand, { tag:'杯子' });
  bowl(1.98, 1.72, .440, .22, .075, stoneW, { tag:'碗' });
  candle(2.08, 1.94, .440, .13, true, { tag:'家具' });
  for (let i = 0; i < 3; i++)
    A.put(1.88 + r(i, 1) * .04, 1.78 + r(i, 6) * .05, .20, .14, .024, .452 + i * .026,
      [greige, clay, indigo][i], { hard:true, gloss:.14, ry:r(i, 4) * .09 });
  armchair(2.52, .55, 1, -.10, indigo);
  A.stop(2.10, 2.94, .11, .99);
  // The corner beside the sofa: a side table with a lamp on it and a floor lamp behind, which is
  // where the warm light in the hero shot comes from.
  A.put(.74, 2.62, .44, .44, .045, .5175, oakL, { ...W, tag:'家具' });
  A.put(.74, 2.62, .34, .34, .026, .26, oak, { ...WH, gloss:.20, tag:'家具' });
  for (const da of [-.17, .17]) for (const db of [-.17, .17])
    A.put(.74 + da, 2.62 + db, .05, .05, .50, .25, oak, { ...W, tag:'家具' });
  lamp(.74, 2.62, .54);
  A.cyl(1.66, 2.66, .077, .19, .050, oakD, { mode:6, ...TB, gloss:.28, tag:'台灯' });
  A.cap(1.66, 2.66, .81, .016, 1.42, .016, brass, { gloss:.55, tag:'台灯' });
  A.taper(1.66, 2.66, 1.44, .34, .30, .34, cream, { mode:1, glow:.13, tag:'台灯' });
  A.stop(.50, 1.86, 2.40, 2.86);
  plant(2.70, 2.62, .052, .92);
  A.stop(2.56, 2.84, 2.48, 2.76);

  // ---------------------------------------------------------------- the kitchen
  // A run of base units under a stone top with an open dresser over it, and a short return along
  // the partition with a sink in it. The dresser has no light of its own: it is built at a 0.37
  // directly in front of the shell's right-hand framed graphic, whose lit panel runs y 1.16..2.64
  // at b 3.22..4.38, so the plates and mugs on those three shelves are silhouetted against a light
  // the building was already paying for. Burying that panel behind a closed wall cupboard — which
  // is what a normal kitchen would have here — would have thrown it away.
  const KA = .62, KT = .93;                                     // worktop centre in a, and its top
  A.put(.55, 3.92, .56, 1.80, .14, .07, oakD, { ...WH, gloss:.26 });                 // plinth
  A.put(.59, 3.92, .62, 1.88, .74, .51, oakM, { ...WH, gloss:.20 });                 // carcass
  for (const db of [-.62, 0, .62]) {
    A.put(.918, 3.92 + db, .016, .58, .68, .50, oakL, { ...WH, gloss:.24 });
    A.cap(.934, 3.92 + db, .70, .010, .34, .010, brass, { rz:Math.PI / 2, gloss:.55 });
  }
  A.put(.24, 3.92, .05, 1.88, .50, 1.19, C('#dcd6c6'), { hard:true, gloss:.46 });    // splashback
  A.put(.63, 3.92, .74, 1.96, .05, .905, stoneW, { hard:true, gloss:.44 });          // worktop
  A.stop(.25, 1.02, 2.94, 4.90);
  // The dresser, and the sign over it.
  for (const db of [-.64, .64]) A.put(.52, 3.80 + db, .30, .04, .74, 1.85, oakL, WH);
  for (const y of [1.50, 1.78, 2.06]) A.put(.52, 3.80, .30, 1.28, .032, y, oakL, WH);
  A.put(.50, 3.80, .34, 1.36, .04, 2.24, oak, WH);
  A.put(.64, 3.80, .26, 1.06, .24, 2.42, oakD, { ...WH, gloss:.24 });
  A.glyph(.775, 3.80, 2.42, '厨房', { size:.115, gap:.04, color:C('#f2d89f'), glow:.10 });
  plates(.52, 3.30, 1.516, 5, .132, cream, sand, { tag:'盘子' });
  plates(.52, 3.62, 1.516, 4, .112, stoneW, celadon, { tag:'盘子' });
  jug(.52, 3.98, 1.516, sand, { tag:'碗' });
  bowls(.52, 4.30, 1.516, 3, .19, clay, { tag:'碗' });
  for (let i = 0; i < 5; i++)
    mug(.52, 3.26 + i * .17, 1.796, GLAZE[(i + 2) % 6], { tag:'杯子' });
  plates(.52, 4.22, 1.796, 4, .104, cream, celadon, { tag:'盘子' });
  bowl(.52, 4.42, 1.796, .17, .072, charc, { tag:'碗' });
  for (let i = 0; i < 4; i++)
    bowl(.52, 3.30 + i * .22, 2.076, .118 + (i % 2) * .026, .056, GLAZE[(i + 4) % 6], { tag:'碗' });
  for (let i = 0; i < 3; i++) mug(.52, 4.16 + i * .15, 2.076, GLAZE[i], { tag:'杯子' });
  // On the top: a hob with a kettle on it, a board, three jars and a stack of plates by the sink.
  A.put(KA, 3.26, .48, .56, .016, KT + .008, C('#2c2f33'), { hard:true, gloss:.62 });
  for (const da of [-.11, .11]) for (const db of [-.14, .14])
    A.cyl(KA + da, 3.26 + db, KT + .022, .072, .012, C('#3d4147'), { gloss:.5 });
  A.taper(KA - .11, 3.40, KT + .102, .18, .15, .18, steelD, { rx:Math.PI, gloss:.48 });
  A.cyl(KA - .11, 3.40, KT + .192, .048, .030, charc, { gloss:.4 });
  A.cap(KA - .11, 3.31, KT + .118, .012, .11, .012, charc, { rz:Math.PI / 2, gloss:.4 });
  A.put(KA, 3.78, .34, .28, .022, KT + .011, oakL, { ...WH, gloss:.24, tag:'家具' });
  bowl(KA, 3.78, KT + .022, .19, .072, celadon, { tag:'碗' });
  for (let i = 0; i < 3; i++) {
    A.cyl(KA + .04, 4.04 + i * .13, KT + .080, .050, .160, [stoneW, ecru, sand][i], { gloss:.34 });
    A.cyl(KA + .04, 4.04 + i * .13, KT + .170, .052, .020, oakD, { mode:6, ...TB, gloss:.28 });
  }
  plates(KA, 4.44, KT, 4, .118, cream, sand, { tag:'盘子' });
  // The return, with the sink. Its top starts at a 1.00 where the back run's ends: two stone tops
  // at the same height overlapping in plan is a flickering corner, and butting them is free.
  A.put(1.59, 4.68, 1.32, .38, .14, .07, oakD, { ...WH, gloss:.26 });
  A.put(1.59, 4.66, 1.38, .42, .74, .51, oakM, { ...WH, gloss:.20 });
  for (const da of [-.34, .34]) {
    A.put(1.59 + da, 4.441, .64, .016, .68, .50, oakL, { ...WH, gloss:.24 });
    A.cap(1.59 + da, 4.425, .70, .010, .36, .010, brass, { gloss:.55 });
  }
  A.put(1.655, 4.63, 1.31, .52, .05, .905, stoneW, { hard:true, gloss:.44 });
  A.put(1.35, 4.63, .44, .36, .012, KT + .006, C('#aeb4b8'), { hard:true, gloss:.66 });
  A.cyl(1.35, 4.81, KT + .066, .022, .132, steelD, { gloss:.55 });
  A.cap(1.35, 4.745, KT + .128, .018, .13, .018, steelD, { rz:Math.PI / 2, gloss:.55 });
  plates(1.95, 4.62, KT, 3, .120, stoneW, cream, { tag:'盘子' });
  A.cyl(2.14, 4.62, KT + .056, .046, .112, oakD, { mode:6, ...TB, gloss:.30 });
  A.stop(.90, 2.32, 4.36, 4.90);

  // ---------------------------------------------------------------- the lighting department
  // 台灯 is 168 kuai of this shop's stock and it was being sold off one shelf in a display case.
  // Five pendants hung down the aisle at staggered heights and a lit étagère of table lamps in the
  // front corner: the pendants cost no floor at all, they are the first thing seen through the
  // glass from the concourse, and a row of five at one height would have read as a light fitting
  // rather than as stock, so no two are the same shade or hang.
  const PEND = [[.55, 2.34, .30, .26, oakL, 6], [1.55, 2.12, .24, .30, brass, 0],
                [2.55, 2.44, .34, .22, oakL, 6], [3.55, 2.16, .26, .24, brass, 0],
                [4.34, 2.30, .22, .28, oakL, 6]];
  const LAMP_LEVELS = [.09, .17, .28], LAMP_REST = [0, 1, 1, 0, 2], DEMO_LAMP = 2;
  const reducedMotion = () => {
    try {
      if (typeof window !== 'undefined' && window.MotionSafety && window.MotionSafety.reduced)
        return !!window.MotionSafety.reduced();
      return typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  };
  const pendLamps = [];
  for (let i = 0; i < PEND.length; i++) {
    const [pb, py, sw, sh, sc, sm] = PEND[i];
    A.cyl(3.26, pb, (3.54 + py + sh) / 2, .009, 3.54 - py - sh, steelD, { gloss:.5 });
    A.taper(3.26, pb, py + sh / 2, sw, sh, sw,
      sc, sm === 6 ? { mode:6, ...TB, gloss:.26, tag:'台灯' } : { gloss:.52, tag:'台灯' });
    const g = A.cyl(3.26, pb, py + .024, sw * .34, .048, warm,
      { mode:1, glow:LAMP_LEVELS[LAMP_REST[i]], tag:'台灯' });
    if (i === DEMO_LAMP) A.dynamicVisual(g);
    pendLamps.push(g);
  }
  // ---- 三种亮度, demonstrated rather than claimed ---------------------------------------------
  // The 台灯 card in this shop has always said the lamps have three brightness settings. Nothing
  // in the room did anything about it, and a claim a shop cannot show is a claim a learner has no
  // reason to believe. Low, medium and full samples now remain visible across the row at all times;
  // only the centre pendant demonstrates all three, eight seconds a step. The other four are
  // ordinary retained fixtures, so the old synchronous whole-room pulse and four dynamic uploads
  // disappear rather than being hidden behind a slower clock.
  //
  // Glow only: no matrix, no new geometry, and one write only when a step changes. `far` is 15,
  // which reaches the
  // near half of the east gallery — a lit shade is legible much further off than a moving toy, so
  // this one is not cut as hard as the toy shop's. MallFitTick still refuses to run it unless the
  // player is on deck two.
  A.motion('lamps', (time, state, P, minutes) => {
    if (Number.isFinite(minutes)) designClock.mins = minutes;
    const reduced = reducedMotion();
    const step = reduced ? 1 : Math.floor(time / 8) % LAMP_LEVELS.length;
    if (step !== state.step) { pendLamps[DEMO_LAMP].glow = LAMP_LEVELS[step]; state.step = step; }
    if (designAction.rev !== state.designRev) {
      let selected = 0;
      for (const q of designMarkers) {
        const on = q.key === designAction.key;
        q.p.m = on ? q.rest : DESIGN_GONE;
        if (on) selected++;
      }
      state.designRev = designAction.rev;
      state.designTarget = designAction.key || 'none';
      state.designMarkers = selected;
      state.designProps = designMarkers.length;
      state.designDraws = designMarkers.length ? 1 : 0;
    }
    state.lamps = pendLamps.length; state.levels = LAMP_LEVELS.length;
    state.demo = DEMO_LAMP; state.dynamic = 1; state.reduced = reduced ? 1 : 0;
  }, { far:15 });
  A.put(3.32, 4.865, .60, .05, 2.05, 1.045, oakD, WH);                 // étagère back
  A.put(3.32, 4.835, .54, .02, 1.90, 1.06, C('#f3e6cc'), { hard:true, mode:1, glow:.07 });
  for (const da of [-.29, .29]) A.put(3.32 + da, 4.66, .04, .42, 2.00, 1.045, oakL, WH);
  for (const y of [.60, 1.12, 1.64]) A.put(3.32, 4.66, .58, .42, .035, y, oakL, WH);
  A.put(3.32, 4.66, .62, .46, .045, 2.075, oak, WH);
  A.put(3.05, 4.66, .12, .46, .22, 2.21, oakD, { ...WH, gloss:.24 });
  A.glyph(3.11, 4.66, 2.21, '灯具', { size:.11, gap:.04, color:C('#f2d89f'), glow:.10 });
  lamp(3.32, 4.60, .0975, cream);
  lamp(3.32, 4.72, .6175, wax);
  lamp(3.32, 4.60, 1.1375, cream);
  vase(3.32, 4.74, 1.1375, .12, .24, charc);
  lamp(3.32, 4.66, 1.6575, wax);
  A.stop(3.00, 3.64, 4.42, 4.90);

  // ---------------------------------------------------------------- the housekeeping corner
  // 拖把 is on the shop's list too. Two of them, a brush and a bucket in the corner by the window,
  // which is where a shop that sells mops actually keeps them.
  A.put(3.46, -4.66, .30, .34, .045, .085, oakD, { ...WH, gloss:.24 });
  for (let i = 0; i < 3; i++) {
    const mb = -4.78 + i * .12;
    A.cap(3.46 + r(i, 3) * .04, mb, .78, .018, 1.36, .018, [oakL, oak, oakL][i],
      { rz:r(i, 5) * .06, gloss:.24 });
    A.put(3.46 + r(i, 3) * .04, mb, .07, .16, .13, .175, [ecru, greige, ecru][i],
      { ...F, round:.03 });
  }
  A.taper(3.44, -4.40, .192, .26, .28, .26, C('#7d8a92'), { rx:Math.PI, gloss:.35 });
  A.stop(3.30, 3.62, -4.90, -4.28);

  // Window merchandising is registered below through `家居店:win`, which lets shop() suppress
  // its generic cartons. Preserve the measured flank stops: they protect the displays without
  // touching the central ±1.5 m doorway, and the shallower left stop keeps the till route open.
  A.stop(3.86, 4.78, -4.92, -1.62);
  A.stop(3.62, 4.78, 1.62, 4.90);

  // ---------------------------------------------------------------- light
  // Four, warm, low. The pendants are the reason the middle of the room is the brightest part of
  // it; the second washes the back wall and the till under the shell's graphic; the third stands
  // the ceramics up off the left flank; the fourth is in the window, which is lit from the inside
  // in every shop on earth after about four in the afternoon.
  A.light(TA, TB2, 2.00, [1.00, 0.87, 0.68], .42, 3.4);
  A.light(1.05, -3.70, 2.20, [1.00, 0.91, 0.75], .30, 3.0);
  A.light(2.40, -4.20, 2.10, [1.00, 0.89, 0.71], .24, 2.6);
  A.light(4.10, -3.20, 1.70, [1.00, 0.90, 0.74], .22, 2.4);

  // ---------------------------------------------------------------- what it teaches
  // Each of these walks the player to a + 1.15, so the standing spot has to be somewhere they can
  // actually get to. In this unit that means the front aisle at a 3.00..3.62, the left aisle at
  // b -4.28..-3.40, or the gap between the table and the bedding bench at b -1.78..-0.80.
  A.th('家居店', 5.15, 0, '里面全是原木家具。', 'Inside it is all plain-wood furniture.',
    '家居 home living + 店 shop.', 2.2, 2.5);
  // ---- the three that were not, and where they went --------------------------------------------
  // 家具 at a 2.05 stood the player at a 3.20, inside the dining set's own collider; 碗 at a 1.00
  // stood them at 2.15, inside it as well; 毛巾 at a 2.30 stood them at 3.45, inside the window
  // platform's. All three are now hung off the front of the room at a 2.95, which walks the player
  // to a 4.10 — the strip between the two window platforms, and the one piece of floor in this
  // unit the flood fill has always found reachable.
  A.th('家具', 2.95, -.95, '这张桌子是实木的，两米二的沙发也放得下。',
    'This table is solid wood — and a 2.2 m sofa will go in as well.',
    '家 home + 具 implement. 放得下 — there is room for it; 放不下 — there is not.', 1.7, 1.30);
  A.th('台灯', 2.98, CB, '这盏台灯有三种亮度，您看，它自己在换。',
    'This lamp has three brightness settings — look, it is cycling through them.',
    '台 table + 灯 lamp. The five pendants over the aisle are stepping through the same three.',
    1.7, 1.5);
  A.th('碗', 2.95, -.20, '碗一个一个摞起来。', 'The bowls stack one inside the other.',
    '碗 is a bowl — one 碗 of rice.', 1.7, 1.30);
  A.th('被子', .78, -1.42, '这床被子是纯棉的。', 'This quilt is pure cotton.',
    '被 to cover + 子; one is 一床被子.', 1.7, 1.1);
  A.th('枕头', .78, -1.08, '枕头软一点还是硬一点？', 'A softer pillow, or a firmer one?',
    '枕 pillow + 头 head.', 1.6, 1.1);
  A.th('毛巾', 2.95, .35, '毛巾是纯棉的，很软。', 'The towels are pure cotton and very soft.',
    '毛 hair + 巾 cloth.', 1.7, 1.20);
  A.th('购物篮', 3.30, -.53, '拿一个购物篮吧。', 'Take a shopping basket.',
    '购物 shopping + 篮 basket.', 1.6, 1.0);
  // ---- the sample desk: measuring up, fitting it in, and getting it there ----------------------
  // The numbers in these three are the player's actual flat, off HomeWalls.ROOMS in
  // js/home-walls.js: 客厅 runs x −2.60..2.75 by z −2.20..3.20, which is 5.35 by 5.40 m, and 次卧
  // is 3.40 by 3.70 with a bed, two wardrobes and a desk already in it — .flatcheck.js reports it
  // as having 1.3 m² of standable floor left. A shop that measures before it sells is a shop that
  // can tell you the wardrobe will not go in, and that is true here rather than flavour.
  // ---- and why all four are strung out along `a` rather than along the counter -----------------
  // The pocket in front of this till is b −3.95 to −3.65 and nothing wider: the flank run owns
  // everything outboard of −3.98 at the walking radius and the dining set everything inboard of
  // −3.60. Four words 8 cm apart across a 30 cm strip is four words the picker cannot tell apart,
  // so they are spread down the *depth* of the pocket instead — it runs a 1.55 to 3.25, which is
  // 1.7 m — and each label sits over the point of the counter its walk-to lands on. Measured, not
  // arranged: 收银台 at a 0.90 stands the player at 2.05, 房间 at 1.35 at 2.50, 客厅 at 1.90 at
  // 3.05 and 送 at 2.35 at 3.50, all four inside the pocket and about 0.5 m apart down it.
  A.th('收银台', .90, -3.80, '这个多少钱？', 'How much is this one?',
    '收银 to take payment + 台 counter.', 1.8, 1.28);
  A.th('房间', 1.35, -3.80, '我们先量一下房间：客厅五米三五乘五米四。',
    'Let us measure the room first — the living room is 5.35 by 5.40.',
    '房间 is a room. 量 is to measure: 量一下 — take a measurement.', 1.8, 1.30);
  // 客厅 and not 沙发, which is the word this sentence is about. js/data.js gives 沙发 the USE
  // action 休息 · "rest a while", and the sofa it belongs on is the sitting-room vignette four
  // metres away — a card at a sample desk offering to lie down is an action in the wrong place.
  // 衣柜 is out for the same reason (换衣服, change clothes); 客厅 carries no action at all.
  A.th('客厅', 1.90, -3.80, '两米二的沙发放得下，次卧再放一个衣柜就走不动了。',
    'A 2.2 m sofa will fit; another wardrobe in the second bedroom and you could not move.',
    '客 guest + 厅 hall — the living room. 放得下 there is room for it; 走不动 cannot get past.',
    1.8, 1.15);
  A.th('送', 2.35, -3.80, '星期三上午十点到十二点送货，师傅顺便给您装好。',
    'Delivery Wednesday between ten and twelve; the fitter will assemble it while he is there.',
    '送 is to deliver or to see somebody off — 送货 to deliver goods, 送人 to see a person out.',
    1.8, 1.20);

  // These three headwords are unique to this tenant's mall labels and have no global action. Each
  // getter returns one stable definition; only its `done` property has a side effect, and that is
  // the completion seam game.js reads after the action finishes. The minute/key guard turns its
  // branch-and-say double read into one locator revision.
  const designVerb = (hz, key, def, done) => {
    if (typeof USE_AT === 'undefined' || !USE_AT.mall) return;
    const action = { ...def };
    Object.defineProperty(action, 'done', { enumerable:true, get() {
      const minute = designClock.mins | 0;
      if (designAction.completedMinute !== minute || designAction.key !== key) {
        designAction.completedMinute = minute;
        designAction.key = key;
        designAction.rev++;
      }
      return done;
    } });
    Object.defineProperty(USE_AT.mall, hz,
      { configurable:true, enumerable:true, get:() => action });
  };
  designVerb('房间', 'room', {
    zh:'复核房间', py:'fùhé fángjiān', en:'check the measured room against the retained floor plan',
    secs:2.4, mins:5, gain:{ mood:5 }, pose:{ type:'stand' },
    doneTr:'The first room zone is checked against the measurements.'
  }, '第一间房的尺寸核对好了。');
  designVerb('客厅', 'living', {
    zh:'设计客厅', py:'shèjì kètīng', en:'fit the sofa into the living-room zone on the plan',
    secs:2.6, mins:6, gain:{ mood:7 }, pose:{ type:'reach' },
    doneTr:'The sofa fits the highlighted living-room zone.'
  }, '沙发放进客厅正合适。');
  designVerb('送', 'delivery', {
    zh:'安排送货', py:'ānpái sònghuò', en:'book delivery for the selected rust finish sample',
    secs:2.3, mins:5, gain:{ mood:6 }, pose:{ type:'talk' },
    doneTr:'Delivery is booked for the finish chip selected on the sample fan.'
  }, '这个颜色星期三送货。');
};

// ---------------------------------------------------------------------------------------------
// Two related room vignettes rather than duplicated stock. The negative bay is soft furnishings
// and lighting; the positive bay is dining and ceramics. Each branch is exactly twelve primitives,
// twenty-four for the tenant, and neither extends into the three-metre walk-in opening.
MallFit['家居店:glass'] = { alpha: .17, gloss: .84 }; // low reflection reveals the staged rooms
MallFit['家居店:win'] = (W, bc, side) => {
  const oak = C('#806747'), oakL = C('#9a805d'), oakD = C('#4f3d2c');
  const linen = C('#c9bea6'), sage = C('#87977d'), rust = C('#9a6147');
  const cream = C('#ddd3bc'), celadon = C('#9caf9f'), charc = C('#555956');
  const brass = C('#a98743'), leaf = C('#4c6846');

  if (side < 0) {
    // Bedroom corner: rug, blanket box and pillow, then a lamp and one tall plant.
    W.put(4.16, bc, .84, 2.20, .018, .359, C('#8c795b'), { hard:true, mode:7 });
    const boxB = bc + side * .45;
    W.put(4.14, boxB, .46, .72, .32, .51, oak, { hard:true, gloss:.22 });
    W.put(4.14, boxB, .50, .76, .045, .6925, oakL, { hard:true, gloss:.28 });
    W.put(4.20, boxB, .30, .46, .16, .80, linen, { round:.055, mode:7, gloss:.08 });
    W.put(4.383, boxB, .014, .30, .10, .54, rust, { hard:true, mode:7 });

    const lampB = bc - side * .66;
    W.cyl(4.18, lampB, .41, .08, .12, oakD, { gloss:.30 });
    W.cap(4.18, lampB, .62, .012, .20, .012, brass, { gloss:.52 });
    W.taper(4.18, lampB, .86, .22, .20, .22, cream, { mode:1, glow:.10 });

    const plantB = bc + side * 1.05;
    W.taper(4.18, plantB, .48, .20, .26, .20, charc, { rx:Math.PI, gloss:.28 });
    W.cap(4.18, plantB, .80, .035, .30, .035, leaf, { rz:-.28, mode:7 });
    W.cap(4.18, plantB - .08, .77, .032, .26, .032, sage, { rx:.34, mode:7 });
    W.cap(4.18, plantB + .08, .74, .030, .23, .030, leaf, { rx:-.38, mode:7 });
    return;
  }

  // Dining bay: a restrained timber backdrop, console table, face-mounted plates and a
  // few pieces of tableware. The plate faces sit 22 mm clear of the panel, not on its depth plane.
  W.put(3.76, bc, .10, 2.50, 1.25, .975, oakD, { hard:true, gloss:.20 });
  W.put(4.18, bc, .50, 2.00, .08, .64, oakL, { hard:true, gloss:.28 });
  for (const u of [-.78, .78])
    W.put(4.18, bc + u, .10, .10, .25, .475, oak, { hard:true, gloss:.22 });
  for (const [u, y, c] of [[-.58, 1.03, cream], [0, 1.30, celadon], [.58, 1.03, cream]])
    W.cyl(3.85, bc + u, y, .18, .035, c, { rz:Math.PI / 2, gloss:.36 });
  for (const [u, c] of [[-.38, celadon], [.06, cream]])
    W.taper(4.22, bc + u, .75, .18, .14, .18, c, { rx:Math.PI, gloss:.34 });
  W.taper(4.18, bc + .55, .82, .18, .28, .18, charc, { gloss:.34 });
  W.cyl(4.18, bc + .55, 1.03, .07, .20, charc, { gloss:.36 });
  W.put(4.20, bc - .58, .30, .46, .10, .73, linen, { round:.025, mode:7, gloss:.08 });
};

// ---------------------------------------------------------------------------------------------
// Who is in here. This unit is shop('E', 6.4, 10.0), so local (a, b) unrolls to world
// x = 23 − a, z = b + 6.4. On this wall +a is −x, so somebody facing the room is at −π/2.
//
// 罗静怡 works the sample desk, so she stands on the customer side of the till rather than in the
// 0.44 m slot behind it — that slot is outside the deck's own walkable zone (a ≥ 0.70 once the
// walking radius is counted) and anybody put in it is standing in the back wall.
//
// a 2.80, b −3.80 and not the a 2.10 this was first written at: at a 2.10, b −3.10 she was inside
// the dining set's collider, which owns a 0.80–3.30 and b −3.60 to −1.50 at the walking radius.
// The pocket that is actually clear runs a 1.55–3.30 between b −3.98 and −3.60, bounded by the
// counter behind, the flank run outboard and the dining set inboard. The anonymous 店员 js/mall.js
// puts in this shop stands at the far end of it, 1.1 m away.
if (typeof MallCast !== 'undefined') MallCast.push(
  { hz:'导购员', name:'罗静怡', py:'Luó Jìngyí', place:'mall', mallFloor:2,
    rig:'mall-home-planner-luo-jingyi', temper:'patient',
    look:{ skin:'#dcae86', hair:'#2c2420', hairStyle:'bob', top:'#e0d5bd', pants:'#5a4633',
      shoe:'#2f3236', collar:'shirt', apron:'#8a7154', tall:.96, faceSeed:9601 },
    spots:[{ h0:10, h1:21, at:[20.20, 2.60], face:-Math.PI / 2, act:'wait' }],
    lines:[['您家客厅多大？我们先量一下再说。',
            'How big is your living room? Let us measure before anything else.'],
           ['这个衣柜一米五宽，您那间放不下。',
            'This wardrobe is 1.5 m wide — it will not go in that room of yours.'],
           ['星期三上午送，师傅顺便装好，您在家就行。',
            'We deliver Wednesday morning and the fitter assembles it; you just need to be in.']] },
);
