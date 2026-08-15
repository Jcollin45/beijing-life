// 鞋店 · 千里鞋城 · QIANLI SHOES — floor 1
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
//   A.put(a,b,w,dp,h,y,colour,opt)   a box: `w` is its depth, `dp` its width along the frontage
//   A.cyl / A.ball / A.cap / A.taper (a,b,y,...,colour,opt)
//   A.rail(a,b,len,colours[,tag,y])  a hanging clothes rail
//   A.island(a,b,w,dp,fill)          a low display island; `fill(topY)` dresses it
//   A.counter(a,b,w,dp[,colour,till]) a service counter, optionally with a till
//   A.table(a,b[,seats,r])           a table with chairs, collider included
//   A.glyph(a,b,y,text,opt)          characters on a surface; opt.back faces the other way
//   A.stop(a0,a1,b0,b1)              a collider, so the player cannot walk through it
//   A.acc  the tenant's accent colour   A.tag  its kind, already on every prop
//
// A second entry, MallFit['鞋店:win'], dresses the two shop windows. js/mall.js builds those before
// the fit runs and will put its own generic goods in them unless the tenant claims them, so the
// spec passes `win` straight through to this key. Everything the two share — the shoe itself,
// the colours it comes in — is written at the top of this file rather than inside the fit.
//
// ---------------------------------------------------------------------------------------------
// What this shop is, and why it is laid out the way it is.
//
// A shoe shop is not a shop with shoes in it. It is a wall — one plane of merchandise you read
// from the door, every shoe standing alone and turned side-on so you see the *profile* rather
// than a lozenge from above — and then a small amount of furniture for the one thing you cannot
// do with clothes: sit down, take your own shoes off, and walk two steps in somebody else's. So
// the geometry here is spent in that order.
//
//   back wall, b -4.10 .. -1.80   男鞋  six lit tiers, thirty-six single shoes
//   back wall, b -1.15 ..  1.15   the stock: forty-eight boxes, a lit ledge, a hero shelf
//   back wall, b  1.80 ..  4.10   女鞋  six lit tiers, thirty-six single shoes
//   left of the aisle             two benches, two fitting mirrors, a floor mirror, the gauge
//   right of the aisle            a round podium, a sale table, the till, the sock unit
//   the two windows               a stepped display of six pairs each, facing the concourse
//
// The shell's own feature panel is *not* covered. It carries the shop's name in gold at y=1.95,
// and the old inline fit hid the lot behind a six-metre backlit shelf unit — the shop had a name
// nobody could ever see and one enormous emissive panel that blew the exposure of everything in
// front of it. The stock wall here stops at 1.05 and the hero shelf's shoes at 1.66, so the
// slatted timber and the name read above them, which is what the shell built them for.
//
// Depth runs outward. `a` grows towards the concourse, so the face of anything you are meant to
// look at — a box label, a ticket strip, a mirror — is at the *larger* a of its own carcass.

// ------------------------------------------------------------------ the shoe
//
// Written at file scope because the windows need it too, and written in the shoe's own frame and
// then turned twice: `u` runs from the back of the heel forward to the toe, `v` up from the sole;
// `t` tips it nose-up, and `q` swings it on the spot.
//
// Both rotations matter and the second one matters more. Laid flat a shoe is a two-tone lozenge
// — which is exactly what the fifty-six shoes in the fallback were. Tipped but pointed straight
// at the door it is a 4 cm cube: the first pass of this file had five of those on brackets under
// the shop's name and they read as luggage padlocks.
//
// The angle is not a taste setting either. Standing in the doorway you look at the men's run
// along roughly (-0.76, -0.65) in (depth, frontage), and a shoe shows its profile when its own
// length is square to that — tan q = 0.65/0.76, so q = 0.86 rad. Every shoe on a wall run is
// swung by that, and it is the difference between a rack of shoes and a rack of erasers.
//
// Build's transform is trans · rotY(q) · rotZ(t) · scale, so a part's centre offset (u,v) lands
// at ((u·cos t - v·sin t)·cos q, u·sin t + v·cos t, -(u·cos t - v·sin t)·sin q) — depth, height,
// frontage. The part carries the same pair of angles, so the shoe turns instead of shearing.
const SHOE_TRAINER = 0, SHOE_LEATHER = 1, SHOE_BOOT = 2, SHOE_SLIPPER = 3, SHOE_HEEL = 4;

// Uppers and their soles. Twelve pairs, so no tier repeats itself and no two neighbours match.
const SHOE_PAL = [
  [C('#eae6dc'), C('#c03a2f')],   // white trainer on red
  [C('#22262b'), C('#e8e4da')],   // black on white
  [C('#27496b'), C('#e8e4da')],   // navy on white
  [C('#7a4a26'), C('#3a2718')],   // tan brogue
  [C('#1b1e22'), C('#141619')],   // black brogue
  [C('#8d2f2b'), C('#2c2f33')],   // burgundy
  [C('#ddcfb0'), C('#6d5a44')],   // sand
  [C('#2f6b5e'), C('#e8e4da')],   // jade trainer
  [C('#cf8b34'), C('#33291f')],   // camel boot
  [C('#5a616a'), C('#cfd3d8')],   // grey runner
  [C('#d8607a'), C('#f0ece2')],   // rose
  [C('#6d5a9a'), C('#e8e4da')],   // violet
];
const SHOE_LINING = C('#efe7d4');

// Two corner radii and nothing else. build.js batches on (mesh, mode, radius, textures), so a
// shoe written with eleven different roundings is eleven instanced draw calls for sixty shoes;
// written with two it is two. The old version of this file cost nine calls it did not need.
const SHOE_R = { hard: .008, soft: .016 };

// One part of one shoe. (a0,b0,y0) is where the heel sits on the shelf.
function shoePart(A, a0, b0, y0, t, q, u, v, lu, wb, hv, col, o) {
  const ct = Math.cos(t), st = Math.sin(t), r = u * ct - v * st;
  return A.put(a0 + r * Math.cos(q), b0 - r * Math.sin(q), lu, wb, hv,
    y0 + u * st + v * ct, col, { rz: t, ry: q, ...o });
}

// Five silhouettes, and the differences between them are structural rather than a change of
// colour. What every one of them has, and what the first pass of this file did not, is a
// descending profile — a tall block at the heel, a lower instep, a low toe — and a dark rim
// across the top of the heel block. That rim is the collar of the opening, and at four metres
// it is the single mark that says "you could put a foot in this".
function shoe(A, kind, a0, b0, y0, t, q, c1, c2, tag, sc = 1, parts = null) {
  const o = { tag }, HARD = SHOE_R.hard, SOFT = SHOE_R.soft, retained = Array.isArray(parts);
  // A retained stock shoe deliberately uses one radius for every part, so hiding its exact shelf
  // group adds one dynamic draw signature rather than splitting the shoe across both soft batches.
  const firm = { ...o, mode: 7, round: retained ? SOFT : HARD };
  const soft = { ...o, mode: 7, round: SOFT };
  const P = (u, v, lu, wb, hv, c, oo) => {
    const p = shoePart(A, a0, b0, y0, t, q, u * sc, v * sc, lu * sc, wb * sc, hv * sc, c, oo);
    if (retained) parts.push(p); return p;
  };
  if (kind === SHOE_TRAINER) {
    P(.137, .015, .274, .094, .030, c2, { ...firm, gloss: .18 });   // outsole
    P(.135, .040, .264, .092, .022, SHOE_LINING, firm);             // midsole stripe
    P(.058, .098, .120, .088, .092, c1, soft);                      // heel block, the tall end
    P(.060, .150, .108, .092, .018, c2, { ...firm, gloss: .22 });   // collar rim over the opening
    P(.150, .086, .132, .088, .070, c1, soft);                      // instep
    P(.234, .072, .104, .080, .052, c1, soft);                      // vamp and toe box
  } else if (kind === SHOE_LEATHER) {
    P(.132, .011, .268, .088, .022, c2, { ...firm, gloss: .30 });   // sole
    P(.040, .034, .066, .086, .030, c2, { ...firm, gloss: .26 });   // heel block
    P(.074, .078, .136, .086, .072, c1, { ...soft, gloss: .42 });   // quarter
    P(.066, .118, .112, .090, .016, c2, { ...firm, gloss: .24 });   // topline
    P(.180, .066, .142, .082, .060, c1, { ...soft, gloss: .42 });   // vamp
    P(.254, .046, .070, .066, .040, c1, { ...soft, gloss: .46 });   // toe cap
  } else if (kind === SHOE_BOOT) {
    P(.130, .017, .266, .094, .034, c2, firm);                      // sole
    P(.124, .076, .240, .090, .076, c1, soft);                      // foot
    P(.240, .056, .080, .076, .044, c1, soft);                      // toe
    P(.056, .160, .104, .094, .140, c1, soft);                      // shaft
    P(.056, .240, .112, .102, .034, c2, soft);                      // turned cuff
    P(.056, .260, .100, .092, .014, c2, firm);                      // the dark opening
  } else if (kind === SHOE_SLIPPER) {
    P(.118, .013, .246, .094, .026, c2, firm);                      // sole
    P(.118, .032, .232, .088, .014, SHOE_LINING, firm);             // footbed
    P(.148, .062, .100, .100, .060, c1, soft);                      // band over the instep
    P(.222, .036, .062, .078, .028, c1, soft);                      // toe
    P(.040, .052, .054, .092, .046, c1, soft);                      // low counter at the back
  } else {
    P(.150, .030, .228, .082, .020, c2, { ...firm, gloss: .34 });   // sole
    P(.040, .046, .030, .034, .092, c2, { ...firm, gloss: .44 });   // the spike
    P(.168, .076, .156, .080, .072, c1, { ...soft, gloss: .46 });   // vamp
    P(.246, .046, .060, .064, .040, c1, { ...soft, gloss: .46 });   // toe
    P(.062, .116, .062, .084, .108, c1, soft);                      // counter, tall at the back
  }
}

MallFit['鞋店'] = A => {
  // ---- palette. Nothing saturated except the tenant's jade and the shoes themselves; a shoe
  // shop is a neutral box whose entire colour budget is spent on stock.
  //
  // The values are the shell's own, not corrected copies of them. js/mall.js paints its shopfit
  // joinery in #5c4635 and its shelves and counter tops in #e5decc, both under the same tiling
  // materials named below, and those two surfaces are visible in every one of these shots — so
  // anything matched to them is guaranteed to sit in the same room as the building. The first
  // draft of this file carried its own table of per-material brightness factors and divided
  // every colour by one of them; the carcass that came out of it was #514840, a near-black slab
  // that the thirty-six shoes standing on it had to fight.
  const ink    = C('#23262a');   // matte black trim, the shell's own trim colour
  const walnut = C('#5c4635');   // the run carcasses and the joinery, as the shell paints them
  const fin    = C('#4b3829');   // the slats on the back of a run, one step down from it
  const oak    = C('#6a5238');   // benches and the podium drum
  const board  = C('#e5decc');   // shelf plates and counter tops: the shell's stone
  const stone  = C('#ded6c2');
  const cream  = C('#efe7d4');
  const warm   = C('#ffeccd');   // every lit strip in here is this one colour
  const gold   = C('#f3d47b');
  const chrome = C('#b9c0c5');
  const pad    = C('#6d5344');   // bench upholstery
  const acc    = A.acc;

  // Materials, and deliberately the shell's four verbatim. build.js batches on
  // (mesh, mode, radius, textures, matScale, matAmt), so a tenant that agrees with the building
  // about what timber is does not cost a draw call for its timber — its props fall into the
  // batch the shell has already opened. Disagreeing by 0.04 on matAmt buys nothing and costs one
  // call per material. The corrugated `steel` map is not used at all: it is ribbed cladding at
  // any scale, and there is nothing in a shoe shop it belongs on.
  const TIMBER = { mat: 'wood',    matScale: .90,  matAmt: .30 };
  const SLAB   = { mat: 'paving',  matScale: .72,  matAmt: .28 };
  const CLOTH  = { mat: 'fabric',  matScale: .55,  matAmt: .32 };
  const PLAST  = { mat: 'plaster', matScale: .62, matAmt: .12, nrm: null };
  const STOCK_GONE = M.trs(0, -99, 0, 0, 0, 0, 0);
  const stockBlue = C('#2c4f63'), stockAmber = C('#d99b2b');
  let heroStock = null, stockScreen = null, stockPower = { active:true };
  const stockMarkers = [];

  // ------------------------------------------------------------------ the two wall runs
  // Six shelves at 33.5 cm, six shoes to each, a warm strip washing down onto the tier below and
  // a ticket rail along the front of every one of them. The proportions are the argument: the
  // first pass had five shelves at 44 cm carrying five shoes, and 70% of what you saw from the
  // door was the empty back of the carcass. A shoe wall is airy, but it is not mostly air.
  const TIERS = 6, TIER0 = .40, TIERH = .355, SHW = 2.14;
  const wallRun = (bc, bw, fam, tag, head) => {
    const q = bc < 0 ? .86 : -.86;      // see the note on the angle at the top of this file
    A.put(.31, bc, .16, bw, 2.38, 1.33, walnut, { hard: true, gloss: .14, mode: 6, ...TIMBER });
    for (let i = 0; i < 7; i++)         // slats, so the back of the run is not a plane of brown
      A.put(.395, bc - bw / 2 + .18 + i * ((bw - .36) / 6), .05, .06, 2.26, 1.33, fin,
        { hard: true, gloss: .20, mode: 6, ...TIMBER });
    for (const s of [-1, 1])            // uprights, so the shelves land on something
      A.put(.575, bc + s * (SHW / 2 + .03), .33, .06, 2.32, 1.32, walnut,
        { hard: true, gloss: .20, mode: 6, ...TIMBER });
    A.put(.33, bc, .20, bw, .14, .07, ink, { hard: true, gloss: .26 });          // plinth
    A.put(.42, bc, .34, bw, .06, 2.55, ink, { hard: true, gloss: .28 });         // cornice
    A.put(.53, bc, .08, bw, .36, 2.76, acc, { hard: true, gloss: .28 });         // header board
    A.put(.578, bc, .012, bw - .12, .014, 2.925, gold, { hard: true, mode: 1, glow: .10 });
    A.glyph(.578, bc, 2.76, head, { size: .165, gap: .055, color: cream, mode: 1, glow: .10 });
    for (let i = 0; i < TIERS; i++) {
      const y = TIER0 + i * TIERH;                                    // the shelf's top surface
      A.put(.575, bc, .33, SHW, .036, y - .018, board,
        { hard: true, gloss: .30, tag, ...SLAB });                                // the shelf
      A.put(.746, bc, .016, SHW, .048, y - .028, ink, { hard: true, gloss: .34 }); // nosing
      A.put(.764, bc, .008, SHW - .12, .022, y - .028, cream,
        { hard: true, gloss: .06, tag });                                         // ticket rail
      A.put(.746, bc, .016, SHW - .14, .014, y - .064, warm,
        { hard: true, mode: 1, glow: .17 });                                      // the lit edge
      for (let k = 0; k < 6; k++) {
        const b = bc - SHW / 2 + .27 + k * ((SHW - .54) / 5);
        let kind = fam[(i * 2 + k) % fam.length];
        if (i === TIERS - 1 && kind === SHOE_BOOT) kind = SHOE_TRAINER;   // nothing tall on top
        const p = SHOE_PAL[(i * 5 + k * 7 + (bc > 0 ? 4 : 0)) % SHOE_PAL.length];
        shoe(A, kind, .48, b, y + .004, .22, q, p[0], p[1], tag);
      }
    }
    A.stop(.15, .90, bc - bw / 2 - .04, bc + bw / 2 + .04);
  };
  wallRun(-2.95, 2.30, [SHOE_TRAINER, SHOE_TRAINER, SHOE_BOOT, SHOE_SLIPPER, SHOE_TRAINER],
    '运动鞋', '男鞋');
  wallRun(2.95, 2.30, [SHOE_LEATHER, SHOE_HEEL, SHOE_LEATHER, SHOE_BOOT, SHOE_HEEL],
    '鞋', '女鞋');

  // ------------------------------------------------------------------ the stock, in the middle
  // Forty-eight boxes, end-on, stacked eight wide and six high on a recessed plinth, with the
  // label panel of each on its outward face. Three are pulled proud of the stack and one has its
  // lid off and leaning: a stock wall where every box is flush is a printed backdrop.
  const BOXC = [C('#a4885f'), C('#e2dbcc'), C('#3c4148'), C('#8f3a32'), acc, C('#a4885f')];
  const LBLC = [C('#3b3128'), C('#3c4148'), C('#d9d3c6'), C('#efe3c8'), C('#efe7d4'), C('#8f3a32')];
  const SBW = 2.16, SBC = 8, SBR = 6, SBP = SBW / SBC, SBH = .145;
  A.put(.55, 0, .44, SBW + .12, .14, .07, ink, { hard: true, gloss: .24 });
  for (let j = 0; j < SBC; j++) for (let i = 0; i < SBR; i++) {
    const b = -SBW / 2 + SBP / 2 + j * SBP, y = .15 + i * SBH + SBH / 2;
    const h = (j * 5 + i * 3) % 7, out = h === 0 ? .075 : 0;
    const c = BOXC[(j + i * 2) % BOXC.length], l = LBLC[(j + i * 2) % LBLC.length];
    A.put(.58 + out, b, .34, SBP - .02, SBH - .012, y, c, { hard: true, gloss: .07 });
    A.put(.752 + out, b, .008, (SBP - .02) * .84, (SBH - .012) * .58, y, l,
      { hard: true, gloss: .05 });
    // A lid line across the end of the carton. Without it a shoe box is a coloured brick with a
    // sticker on it; with it there is a box and a lid, which is what you are looking at.
    if (h !== 0) A.put(.762 + out, b, .006, SBP - .03, .008, y + SBH / 2 - .030, cream,
      { hard: true, gloss: .05 });
    if (h === 3) A.put(.58 + out, b, .345, SBP - .012, .022, y + SBH / 2 - .006, l,
      { hard: true, gloss: .06 });                                   // a lid sitting slightly proud
  }
  // The one that is open: lid leaning on the stack, tissue showing.
  A.put(.60, -SBW / 2 + SBP * 1.5, .345, SBP - .012, .020, .15 + 5 * SBH + .14, cream,
    { hard: true, gloss: .06, rz: -.30 });
  // A stone ledge caps the stock, lit from underneath, with the four newest pairs standing on it.
  A.put(.60, 0, .40, SBW + .18, .06, 1.02, board, { hard: true, gloss: .40, ...SLAB });
  A.put(.802, 0, .014, SBW, .018, .974, warm, { hard: true, mode: 1, glow: .18 });
  for (let k = 0; k < 4; k++)
    shoe(A, [SHOE_TRAINER, SHOE_LEATHER, SHOE_SLIPPER, SHOE_HEEL][k], .50, -.81 + k * .54, 1.056,
      .22, k < 2 ? -1.05 : 1.05, SHOE_PAL[k * 2][0], SHOE_PAL[k * 2][1], '鞋');
  // The hero shelf, hung off the slatted feature panel between the stock and the shop's name: a
  // slim stone tray on two chrome arms, five pairs on it turned almost side-on, and a warm line
  // under the front edge. This was five shoes on five separate brackets and it looked like a rack
  // of padlocks — a shelf gives them a floor to stand on and a shadow to sit in.
  A.put(.40, 0, .06, 2.44, .05, 1.375, ink, { hard: true, gloss: .30 });
  for (const s of [-1, 1]) {
    A.put(.50, s * 1.08, .22, .034, .022, 1.386, chrome, { hard: true, gloss: .55 });
    A.put(.545, s * 1.08, .026, .034, .10, 1.345, chrome, { hard: true, gloss: .55 });
  }
  A.put(.55, 0, .30, 2.36, .038, 1.415, board, { hard: true, gloss: .42, ...SLAB });
  A.put(.700, 0, .012, 2.30, .016, 1.386, warm, { hard: true, mode: 1, glow: .18 });
  for (let k = 0; k < 5; k++) {
    const p = SHOE_PAL[(k * 3 + 1) % SHOE_PAL.length];
    const parts = k === 2 ? [] : null;
    shoe(A, [SHOE_LEATHER, SHOE_TRAINER, SHOE_BOOT, SHOE_SLIPPER, SHOE_HEEL][k], .46,
      -.94 + k * .47, 1.438, .22, k % 2 ? 1.02 : -1.02, p[0], p[1], '鞋', 1, parts);
    if (parts) {
      A.dynamicVisual(parts);
      heroStock = { parts, rest:parts.map(q => q.m) };
    }
  }
  // A three-piece U on the shelf edge occupies exactly the centre boot's b=0 slot. It stays in the
  // existing hard/mode-1 screen batch; only the retained boot's single soft shoe batch is new.
  for (const [b, dp, h, y] of [[0, .34, .024, 1.412], [-.158, .024, .12, 1.472], [.158, .024, .12, 1.472]]) {
    const q = A.dynamicVisual(A.put(.706, b, .012, dp, h, y, stockAmber,
      { hard:true, mode:1, glow:.20, tag:'鞋' }));
    stockMarkers.push({ p:q, rest:q.m }); q.m = STOCK_GONE;
  }
  A.stop(.15, .95, -SBW / 2 - .10, SBW / 2 + .10);

  // ------------------------------------------------------------------ the floor
  // A pale stone runner down the middle of the green carpet, from the stock wall to the mat. It
  // is 12 mm proud, which is a threshold rather than a decal and reads as one; without it the
  // whole lower third of the room from the door is one flat sheet of carpet.
  A.put(2.225, 0, 2.55, 2.10, .012, .038, C('#d6cebb'),
    { hard: true, mode: 9, gloss: .30, ...SLAB });
  A.put(2.225, -1.05, 2.55, .04, .014, .039, acc, { hard: true, gloss: .30 });
  A.put(2.225, 1.05, 2.55, .04, .014, .039, acc, { hard: true, gloss: .30 });

  // ------------------------------------------------------------------ trying them on
  // Two benches down the left, each facing its own fitting mirror. The mirror is the whole point
  // of the geometry: it is low, because what you look at when you try shoes on is your own feet,
  // and it is raked hard back so that what it shows is the floor in front of it. The first pass
  // raked it 11 degrees and it read as a switched-off television leaning against the carpet.
  const bench = (a, b, len) => {
    for (const s of [-1, 1])
      A.put(a, b + s * (len / 2 - .11), .42, .085, .30, .15, oak,
        { hard: true, gloss: .22, mode: 6, ...TIMBER });                       // legs
    A.put(a, b, .50, len - .10, .08, .30, oak, { hard: true, gloss: .22, mode: 6, ...TIMBER });
    A.put(a, b, .46, len - .22, .022, .175, chrome, { hard: true, gloss: .50 });// kick rail
    A.put(a, b, .52, len, .11, .395, pad, { mode: 7, round: .05, ...CLOTH });   // the pad
    A.put(a, b, .54, len, .014, .453, C('#7c6152'), { mode: 7, round: .02, ...CLOTH });
    for (let k = 0; k < 3; k++)                                                 // seam lines
      A.put(a, b - len / 2 + len * (k + 1) / 4, .535, .012, .016, .462, C('#4c3b32'),
        { hard: true, gloss: .10 });
    A.stop(a - .29, a + .29, b - len / 2 - .04, b + len / 2 + .04);
  };
  // Order matters here and it is the opposite of intuition. Depth runs outward, so the face of
  // the glass has to be at the *largest* a of the assembly. What makes it read as silvered is
  // that the face is not one flat colour: a mirror is a picture of the room, so it carries the
  // room's three bands — ceiling at the top, the shop in the middle, carpet at the bottom — and
  // one bright vertical strip where the shopfront glass lands in it. All five pieces are opaque,
  // so all five batch; the translucent pane an earlier draft used was an extra draw call that
  // made 58% of pale blue over matte black, which is a dead grey.
  //
  // Two things about them were wrong until this pass, and both were about shape rather than about
  // colour. They were 0.84 wide by 0.70 tall — a 1.2:1 landscape rectangle — inside a 55 mm matte
  // black surround, and three horizontal grey bands with a white stripe down one side. That is not
  // a mirror, that is a television, and in every shot of this room they read as two switched-off
  // monitors propped on the carpet. So: portrait, 0.52 by 1.05, in a chrome bead rather than a
  // black frame, and the bottom half of what is in them is the green of the carpet they stand on.
  // A green panel is never a screen; a landscape grey one always is.
  //
  // The values stay low. A fitting mirror is raked back, which points it at the brightest thing in
  // the room, and anything painted the value a reflection actually has comes out of the shader
  // white — the pass before last used #dfe4e4 / #9aa5a3 / #b5b09c and got two whiteboards.
  const M_SKY = C('#b3bab0'), M_ROOM = C('#87907f'), M_FLOOR = C('#5f6d5c'), M_FRONT = C('#d5d0bb');
  const mirror = (a, b, w, h, rake) => {
    const o = { tag: '镜子' };
    A.put(a - .030, b, .05, w + .07, h + .07, h / 2 + .05, chrome,
      { hard: true, gloss: .55, rz: rake, ...o });                             // chrome bead, behind
    A.put(a - .020, b, .02, w + .015, h + .015, h / 2 + .05, ink,
      { hard: true, gloss: .30, rz: rake, ...o });                             // the shadow line in it
    A.put(a, b, .012, w, h * .30, h * .845 + .05, M_SKY,
      { hard: true, gloss: .80, rz: rake, ...o });                             // ceiling, in it
    A.put(a, b, .012, w, h * .32, h * .535 + .05, M_ROOM,
      { hard: true, gloss: .80, rz: rake, ...o });                             // the shop, in it
    A.put(a, b, .012, w, h * .38, h * .190 + .05, M_FLOOR,
      { hard: true, gloss: .78, rz: rake, ...o });                             // carpet, in it
    A.put(a + .008, b - w * .26, .008, w * .15, h - .04, h / 2 + .05, M_FRONT,
      { hard: true, gloss: .85, rz: rake, ...o });                             // the shopfront
    A.cyl(a + .04, b, .030, .026, .06, chrome, { gloss: .55, ...o });          // the post
    A.put(a + .05, b, .26, w * .74, .05, .025, ink, { hard: true, gloss: .35, ...o }); // sled foot
    A.stop(a - .18, a + .18, b - w / 2 - .06, b + w / 2 + .06);
  };
  bench(2.60, -1.90, 1.30);
  bench(2.60, -3.35, 1.30);
  // Pushed 18 cm back towards the wall run. At a 1.50 the gap between the face of a mirror and the
  // back of the bench it belongs to was 0.63 m, and a body in this game clears an obstacle by 0.30:
  // nobody — player, staff or shopper — could walk along the front of the men's wall at all, and
  // the whole seating half of the shop was reachable only down its own middle. At 1.32 it is 0.81.
  mirror(1.32, -1.90, .52, 1.05, .34);
  mirror(1.32, -3.35, .52, 1.05, .34);
  // And one full-length mirror at the end of the bench run, turned to face across the shop. Low
  // mirrors are what a shoe shop is for, but a room with nothing above knee height on one whole
  // side of it reads as a room that ran out of budget.
  // `w` is the extent along depth and `dp` the extent along the frontage, so a panel whose thin
  // axis is `dp` already faces across the shop — no rotation, and adding one would turn it back
  // to facing the door.
  {
    const o = { tag: '镜子' };
    A.put(3.30, -4.045, .62, .07, 1.78, .90, chrome, { hard: true, gloss: .55, ...o });
    A.put(3.30, -4.020, .58, .03, 1.72, .90, ink, { hard: true, gloss: .30, ...o });
    A.put(3.30, -4.000, .54, .04, .52, 1.545, M_SKY, { hard: true, gloss: .80, ...o });
    A.put(3.30, -4.000, .54, .04, .80, 1.005, M_ROOM, { hard: true, gloss: .80, ...o });
    A.put(3.30, -4.000, .54, .04, .42, .395, M_FLOOR, { hard: true, gloss: .78, ...o });
    A.put(3.44, -3.988, .09, .04, 1.66, .90, M_FRONT, { hard: true, gloss: .85, ...o });
    A.stop(2.96, 3.64, -4.12, -3.94);
  }
  // A shoe horn lying on the near bench, and a box open on the floor beside it with a pair out.
  A.put(2.58, -2.36, .25, .05, .012, .464, chrome, { hard: true, gloss: .55 });
  A.put(2.44, -2.36, .06, .045, .022, .470, ink, { hard: true, gloss: .40 });
  A.put(2.28, -1.36, .34, .24, .11, .075, BOXC[0], { hard: true, gloss: .07 });
  A.put(2.28, -1.36, .30, .20, .016, .136, cream, { hard: true, gloss: .06, rz: .04 });
  A.put(2.66, -1.42, .34, .24, .028, .034, BOXC[0], { hard: true, gloss: .07, ry: .14 });
  shoe(A, SHOE_TRAINER, 2.02, -1.30, .020, .03, -1.35, SHOE_PAL[7][0], SHOE_PAL[7][1], '鞋');
  shoe(A, SHOE_TRAINER, 2.02, -1.58, .020, .03, -1.28, SHOE_PAL[7][0], SHOE_PAL[7][1], '鞋');
  // Two spare boxes stacked under the far bench, which is where a shoe shop keeps them.
  for (let k = 0; k < 2; k++)
    A.put(2.60, -3.35, .32, .46, .12, .068 + k * .128, BOXC[k * 3], { hard: true, gloss: .07 });
  // 量脚器 — the measuring gauge, on the floor where you would actually stand on it.
  A.put(2.02, -2.62, .34, .17, .018, .045, chrome, { hard: true, gloss: .55 });
  A.put(1.88, -2.62, .05, .16, .060, .078, chrome, { hard: true, gloss: .60 });
  A.put(2.02, -2.55, .31, .022, .016, .062, ink, { hard: true, gloss: .35 });
  A.put(2.10, -2.68, .045, .085, .026, .067, ink, { hard: true, gloss: .40 });
  A.put(2.10, -2.68, .012, .085, .010, .082, C('#c33f34'), { hard: true, mode: 1, glow: .05 });

  // ------------------------------------------------------------------ the podium, right of the aisle
  // Two round plinths, one standing on the other, which is what balances two benches on the far
  // side and gives the walk-in something at knee height to swerve around. Both discs are 60 mm or
  // more: a `cyl` much thinner than that skews its own normals and shades as though its top face
  // pointed sideways.
  //
  // It stands at 2.20 rather than 2.45 and is 3 cm narrower, and that is a circulation fix rather
  // than a compositional one. A body in this game clears an obstacle by 0.30, so two fixtures are
  // only walkable-between if there is 0.60 m of clear floor. With the podium out at 2.45 and the
  // entrance towers in front of it there was 0.48 m between them and 0.34 m between the podium and
  // the sale table — which meant the till, the sale table and the sock unit could not be reached
  // from the aisle at all, by the player or by anybody in `MallCast`. You cannot see that in a
  // screenshot; it is arithmetic, and it has to be done in the layout rather than discovered later.
  A.cyl(2.20, 1.40, .19, .49, .38, oak, { gloss: .24, mode: 6, ...TIMBER });    // drum   0 .. .38
  A.cyl(2.20, 1.40, .07, .52, .06, ink, { gloss: .30 });                       // skirt .04 .. .10
  A.cyl(2.20, 1.40, .410, .53, .066, board, { gloss: .42, ...SLAB });          // top  .377 .. .443
  A.cyl(2.20, 1.40, .462, .320, .026, warm, { mode: 1, glow: .12 });           // reveal .449 .. .475
  A.cyl(2.20, 1.40, .513, .285, .070, stone, { gloss: .42, ...SLAB });         // step .478 .. .548
  const PODB = [[1.99, 1.12, -2.1], [1.99, 1.68, 2.1], [2.31, 1.06, -1.3], [2.31, 1.74, 1.3]];
  for (let k = 0; k < 4; k++) {
    const p = SHOE_PAL[(k * 2 + 3) % SHOE_PAL.length];
    shoe(A, [SHOE_LEATHER, SHOE_SLIPPER, SHOE_TRAINER, SHOE_BOOT][k],
      PODB[k][0], PODB[k][1], .447, .12, PODB[k][2], p[0], p[1], '鞋');
  }
  shoe(A, SHOE_HEEL, 2.15, 1.40, .552, .10, 1.75, SHOE_PAL[10][0], SHOE_PAL[10][1], '鞋');
  // The card faces the door, which is the larger a, and stands on the lower step rather than
  // behind the whole podium where the first pass put it.
  A.put(2.52, 1.40, .035, .28, .16, .523, cream, { hard: true, gloss: .20 });
  A.glyph(2.542, 1.40, .528, '新款', { size: .072, gap: .024, color: ink, mode: 0, glow: 0 });
  A.stop(1.68, 2.72, .88, 1.92);

  // ------------------------------------------------------------------ the sale table
  // The one fixture in here you are meant to rummage in, and the one place the shoes are allowed
  // to be untidy: paired, lying flat, at different angles, with the boxes they came out of under
  // the table. A shop with nothing scruffy in it is a rendering of a shop.
  // Four legs and a rail rather than a boxed-in apron, because the boxes the stock came out of go
  // underneath it and a solid carcass swallows them.
  //
  // It stands 15 cm further out than it used to, and 14 cm shallower, for a reason that has
  // nothing to do with how it looks. `counter()` hangs the till's focus 2.00 m in front of the
  // counter face and `inReach` measures from the focus, so in a unit only 4.8 m deep the 收银台
  // focus lands at a 4.16 — against the shopfront glass. What made it usable or not was whether
  // anything could stand in the 1.7 m around that point, and with the table at 3.15 the band
  // between the counter face (2.16) and the back of the table (2.70) was 0.54 m: four centimetres
  // narrower than a body, so the only place left to pay from was on top of the window platform.
  // At 3.30 by 0.64 the band is 0.76 m and you pay standing where you would actually queue.
  const TA = 3.30, TB = 2.86, TW = 1.12, TD = .64;
  for (const sa of [-1, 1]) for (const sb of [-1, 1])
    A.put(TA + sa * (TD / 2 - .09), TB + sb * (TW / 2 - .09), .09, .09, .48, .25, oak,
      { hard: true, gloss: .22, mode: 6, ...TIMBER });
  A.put(TA, TB, TD - .12, TW - .12, .05, .445, oak,
    { hard: true, gloss: .22, mode: 6, ...TIMBER });                            // rail under the top
  A.put(TA, TB, TD, TW, .05, .525, board, { hard: true, gloss: .38, ...SLAB });  // top .50 .. .55
  A.put(TA + TD / 2 - .015, TB, .03, TW - .04, .14, .425, C('#b83f35'),
    { hard: true, gloss: .24 });                                                // the sale fascia
  A.glyph(TA + TD / 2 + .012, TB, .425, '特价', { size: .095, gap: .03, color: cream, mode: 1,
    glow: .10, tag: '鞋' });
  for (let k = 0; k < 6; k++) {
    const p = SHOE_PAL[(k * 4 + 2) % SHOE_PAL.length];
    const aa = TA - .24 + (k % 3) * .21, bb = TB - .32 + Math.floor(k / 3) * .58;
    shoe(A, [SHOE_SLIPPER, SHOE_TRAINER, SHOE_SLIPPER, SHOE_LEATHER, SHOE_SLIPPER, SHOE_TRAINER][k],
      aa, bb, .554, .02, -1.9 + (k % 3) * .55 + (k > 2 ? .5 : 0), p[0], p[1], '鞋', .92);
  }
  for (let k = 0; k < 3; k++)
    A.put(TA - .04, TB - .34 + k * .34, .34, .24, .12, .065 + (k === 1 ? .125 : 0),
      BOXC[(k + 2) % BOXC.length], { hard: true, gloss: .07, ry: .1 * (k - 1) });
  A.stop(TA - TD / 2 - .06, TA + TD / 2 + .06, TB - TW / 2 - .06, TB + TW / 2 + .06);

  // ------------------------------------------------------------------ the till
  // The shell's own counter, so the shop keeps its 收银台 and the two-step purchase that goes with
  // it. `counter` puts the plaster map on anything that is not one of the shell's two timbers, so
  // the body is painted rather than veneered and the colour is chosen for plaster.
  A.counter(1.78, 3.10, 1.85, .76, C('#6a5a48'));
  // Nothing tall goes behind it. There is only half a metre between the back of the counter and
  // the 女鞋 run, and the back gantry that stood there for one draft — a 1.1 m carcass with a
  // brand panel over it — put itself in front of eleven of the run's thirty-six shoes. What a
  // till has behind it that is *not* a wall of stock is floor: a stool and the boxes somebody has
  // not put away, both below the counter top at 0.98 and so below the run's first shelf anyway.
  A.cyl(1.12, 2.50, .21, .17, .42, ink, { gloss: .30 });
  A.cyl(1.12, 2.50, .445, .19, .05, pad, { mode: 7, round: .02, ...CLOTH });
  for (let k = 0; k < 4; k++)
    A.put(1.10 + (k % 2) * .05, 3.42 + Math.floor(k / 2) * .40, .34, .25, .14,
      .075 + (k % 2) * .145, BOXC[(k + 1) % BOXC.length],
      { hard: true, gloss: .07, ry: .08 * (k - 1.5) });
  A.stop(.92, 1.34, 2.28, 3.98);
  for (let k = 0; k < 3; k++) {                                     // bags, stood on the top
    const b = 2.30 + k * .28;
    A.put(1.70 - k * .04, b, .14, .22, .30, 1.13, k === 1 ? cream : C('#e6dcc4'),
      { hard: true, gloss: .12 });
    A.cap(1.70 - k * .04, b, 1.305, .010, .13, .010, ink, { rx: Math.PI / 2, gloss: .40 });
    A.put(1.636 - k * .04, b, .008, .15, .07, 1.14, acc, { hard: true, gloss: .10 });
  }
  A.cyl(1.66, 3.86, 1.06, .055, .17, chrome, { gloss: .45 });            // jar of shoe horns
  for (let k = 0; k < 4; k++)
    A.put(1.66 + (k % 2) * .03, 3.84 + k * .018, .04, .028, .22, 1.16, chrome,
      { hard: true, gloss: .55, rz: (k - 1.5) * .06 });
  // Shoe care, in a tray at the customer's end of the top: tins of polish and two brushes.
  A.put(2.02, 3.62, .26, .34, .022, .992, ink, { hard: true, gloss: .34 });
  for (let k = 0; k < 4; k++)
    A.cyl(1.96 + (k % 2) * .11, 3.52 + Math.floor(k / 2) * .17, 1.023, .038, .040,
      [C('#2c2f33'), C('#6f4526'), C('#8f3a32'), C('#2c2f33')][k], { gloss: .30 });
  for (let k = 0; k < 2; k++)
    A.put(2.10, 3.50 + k * .13, .17, .045, .034, 1.020, C('#6f4526'),
      { mode: 7, round: .012, gloss: .20 });

  // ------------------------------------------------------------------ socks and insoles
  // Against the right-hand partition, forward of the shell's lightbox so the two do not fight.
  const UA = 3.05, UB = 3.86, UL = 1.00;
  A.put(UA, UB, UL, .42, 1.55, .775, walnut, { hard: true, gloss: .16, mode: 6, ...TIMBER });
  A.put(UA, UB, UL + .06, .46, .08, .04, ink, { hard: true, gloss: .26 });
  const SOCK = [C('#2a4b6b'), C('#8f3a32'), C('#e2dbcc'), C('#3c4148'), C('#2f6b5e'), C('#a4885f')];
  for (let i = 0; i < 4; i++) {
    const y = .38 + i * .30;
    A.put(UA, UB - .21, UL - .06, .34, .030, y, board,
      { hard: true, gloss: .28, ...SLAB });
    A.put(UA, UB - .05, UL - .06, .014, .018, y + .012, warm, { hard: true, mode: 1, glow: .14 });
    if (i === 3) {                                    // insoles stand on the top shelf, on edge
      for (let k = 0; k < 4; k++)
        A.put(UA - UL / 2 + .16 + k * .22, UB - .24, .09, .10, .25, y + .14,
          [cream, acc, cream, C('#8f3a32')][k], { hard: true, gloss: .18, rz: .03 });
    } else {
      for (let k = 0; k < 4; k++) {
        const aa = UA - UL / 2 + .14 + k * ((UL - .28) / 3);
        A.put(aa, UB - .235, .17, .12, .055, y + .045, SOCK[(i * 2 + k) % SOCK.length],
          { mode: 7, round: .02, ...CLOTH });
        A.put(aa, UB - .235, .062, .126, .012, y + .076, cream, { hard: true, gloss: .10 });
      }
    }
  }
  A.put(3.575, UB, .03, .44, .24, 1.44, acc, { hard: true, gloss: .28 });
  A.glyph(3.60, UB, 1.44, '袜子', { size: .125, gap: .04, color: gold, mode: 1, glow: .12 });
  A.stop(2.50, 3.62, 3.60, 4.14);

  // ================================================================== the service side
  //
  // Everything above this line is stock and furniture. What follows is the part of a shoe shop
  // that is a *service* rather than a display, and every piece of it is fitted into space the
  // plan already had, because this unit has none spare. The arithmetic behind that claim, done
  // once here so nothing below has to repeat it:
  //
  // The colliders in this room, expanded by the player's 0.30 m body radius, leave exactly three
  // pockets of floor anybody can stand in — the central lane (b -1.05..0.55, a 1.25..3.60), the
  // pocket in front of the sale table (a 2.46..2.68, b 2.24..3.30, which is where the till's own
  // focus already lands), and the doorway. Every label added below has its focus put in one of
  // those three by hand, because `A.th` puts it at a + 1.15 and in a shop that is read sideways
  // that lands it inside a bench four times out of five.
  //
  // The two 0.58 m gaps in the back wall — b -1.76..-1.18 and b 1.18..1.76, between the stock
  // stack and each wall run — are the only free wall in the unit. They are already unwalkable
  // (0.58 m of floor between two colliders is 0.02 m short of a body), so building in them costs
  // no circulation at all and gains two full-height panels facing straight down the room.

  // ---- a label whose approach point is chosen rather than derived.
  // Same helper the fashion tenant carries, for the same reason: the focus is the thing the game
  // measures reach from, so it has to be a real square metre of floor and not a + 1.15.
  const lab = (hz, a, b, zh, en, note, reach, y, fa, fb) => {
    const t = A.th(hz, a, b, zh, en, note, reach, y);
    const p = A.at(fa, fb === undefined ? b : fb);
    t.focus = [p[0], p[1]];
    return t;
  };

  // ------------------------------------------------------------------ 量脚 · foot measurement
  // Chinese shoe sizes are not a naming convention, they are arithmetic: 鞋码 = 脚长(cm) × 2 − 10,
  // so a 23.5 cm foot is a 37 and the chart on the wall is a conversion table rather than a list.
  // That is the single most useful thing this shop can teach, so it is printed at full height in
  // the west gap of the back wall, facing straight down the room, with the gauge on a low stand
  // underneath it where somebody would actually stand on it.
  //
  // The gauge itself already existed, lying on the carpet at b -2.62 — in the 7 cm slot between
  // the two benches, where the expanded colliders mean no body can ever reach it. It stays where
  // it is as a prop; the one that is meant to be used is this one, at the foot of its own chart.
  {
    const cb = -1.47;
    A.put(.30, cb, .06, .54, 1.34, 1.36, walnut, { hard: true, gloss: .16, mode: 6, ...TIMBER });
    A.put(.345, cb, .02, .48, 1.24, 1.36, cream, { hard: true, gloss: .10 });
    A.put(.352, cb, .012, .46, .020, 1.895, acc, { hard: true, gloss: .30 });
    A.glyph(.360, cb, 1.965, '尺码对照', { size: .072, gap: .024, color: ink, mode: 0, glow: 0 });
    A.glyph(.360, cb - .13, 1.815, '鞋码', { size: .050, gap: .016, color: acc, mode: 0, glow: 0 });
    A.glyph(.360, cb + .13, 1.815, '脚长', { size: .050, gap: .016, color: acc, mode: 0, glow: 0 });
    // 35 through 45 in twos, which is the run this shop stocks. The right-hand column is the foot
    // length the size is derived from, in centimetres, so the table can be read either way round.
    ['35|22.5', '37|23.5', '39|24.5', '41|25.5', '43|26.5', '45|27.5'].forEach((row, i) => {
      const y = 1.700 - i * .150, [n, cm] = row.split('|');
      A.glyph(.360, cb - .13, y, n, { size: .054, gap: .014, color: ink, mode: 0, glow: 0 });
      A.glyph(.360, cb + .13, y, cm, { size: .042, gap: .010, color: ink, mode: 0, glow: 0 });
      A.put(.356, cb, .008, .42, .006, y - .075, C('#c8c0ac'), { hard: true, gloss: .10 });
    });
    // The stand, and the measuring gauge on top of it: a plate to put a heel against, a sliding
    // toe stop on a rail, and a width slider across it. Everything is 12 mm or more proud of what
    // it sits on — a 4 mm step is the minimum this renderer will not fight over, and a measuring
    // instrument is exactly the case where flush parts turn into one grey block.
    A.put(.74, cb, .40, .50, .14, .075, ink, { hard: true, gloss: .26 });
    A.put(.74, cb, .36, .46, .026, .158, chrome, { hard: true, gloss: .55 });
    A.put(.58, cb, .04, .44, .075, .208, chrome, { hard: true, gloss: .60 });   // the heel cup
    A.put(.76, cb - .12, .34, .022, .020, .181, ink, { hard: true, gloss: .35 });  // the rail
    A.put(.86, cb - .12, .05, .090, .032, .187, C('#c33f34'), { hard: true, gloss: .40 });
    A.put(.80, cb + .13, .048, .30, .028, .185, ink, { hard: true, gloss: .35 });  // width slider
    A.put(.80, cb + .13, .012, .30, .010, .202, C('#c33f34'), { hard: true, mode: 1, glow: .05 });
    // A pair of trial socks folded on the corner of the stand, because nobody in this country is
    // asked to put a bare foot into shop stock.
    A.put(.66, cb + .17, .13, .11, .050, .188, cream, { mode: 7, round: .02, ...CLOTH });
    A.stop(.54, .95, cb - .27, cb + .27);
  }

  // ------------------------------------------------------------------ 鞋带 · colour and laces
  // The east gap, and the answer to the other half of "which one do you want": not the model, the
  // finish. A board of laces hanging in nine colours over a strip of leather swatches, with the
  // measure word on it — 一双鞋, 一条鞋带 — because the pair/length distinction is the thing a
  // learner gets wrong in this shop and nowhere else.
  const LACE = [C('#e8e4da'), C('#22262b'), C('#8f3a32'), C('#27496b'), C('#2f6b5e'),
                C('#cf8b34'), C('#d8607a'), C('#6d5a9a'), C('#a4885f')];
  {
    const cb = 1.47;
    A.put(.30, cb, .06, .54, 1.34, 1.36, walnut, { hard: true, gloss: .16, mode: 6, ...TIMBER });
    A.put(.345, cb, .02, .48, 1.24, 1.36, ink, { hard: true, gloss: .12 });
    A.put(.352, cb, .012, .46, .020, 1.895, acc, { hard: true, gloss: .30 });
    A.glyph(.360, cb, 1.965, '鞋带', { size: .075, gap: .026, color: gold, mode: 1, glow: .10 });
    A.put(.356, cb, .010, .44, .014, 1.812, warm, { hard: true, mode: 1, glow: .16 });
    // Nine laces on nine pegs, doubled over the way a lace is sold: a loop at the peg and two
    // tails hanging under it, one a little longer than the other.
    for (let k = 0; k < 9; k++) {
      const bb = cb - .20 + (k % 3) * .20, y0 = 1.66 - Math.floor(k / 3) * .40;
      A.put(.362, bb, .010, .020, .022, y0, chrome, { hard: true, gloss: .55 });
      A.cyl(.372, bb - .022, y0 - .150, .0075, .300, LACE[k], { gloss: .22 });
      A.cyl(.372, bb + .022, y0 - .172, .0075, .344, LACE[k], { gloss: .22 });
      A.put(.372, bb, .010, .046, .014, y0 - .006, LACE[k], { hard: true, gloss: .22 });
    }
    // Leather swatches along the bottom, so the colour choice covers the shoe as well as the lace.
    for (let k = 0; k < 6; k++)
      A.put(.360, cb - .19 + k * .076, .010, .062, .090, .830, SHOE_PAL[k * 2][0],
        { hard: true, gloss: .26 });
    A.glyph(.362, cb, .700, '一条鞋带', { size: .046, gap: .015, color: cream, mode: 0, glow: 0 });
    // A stand under it with spare pairs boxed, so the board has a fixture rather than a wall.
    A.put(.74, cb, .40, .50, .14, .075, ink, { hard: true, gloss: .26 });
    A.put(.74, cb, .36, .46, .026, .158, board, { hard: true, gloss: .34, ...SLAB });
    for (let k = 0; k < 3; k++)
      A.put(.70, cb - .15 + k * .15, .22, .12, .060, .201, LACE[k * 3],
        { mode: 7, round: .012, ...CLOTH });
    A.stop(.54, .95, cb - .27, cb + .27);
  }

  // ------------------------------------------------------------------ 试走道 · the walking test
  // "试试这双，走两步" is the sentence this shop is built round, and until now there was nothing to
  // walk on: the pale stone runner down the middle was a floor finish. It is a *lane* now — the
  // one strip of this unit with no collider anywhere near it, 2.10 m wide and 2.55 m long from the
  // stock wall to the entrance mat, which is the only place in the room a body can take four steps
  // in a straight line.
  //
  // The inlays are the whole idea. Five pairs of brass footprints set into the runner, each with a
  // warm insert that lights in turn, so the lane reads as something to follow rather than as a rug.
  // They stand 6 mm proud of the runner's own 12 mm — a flush inlay in this renderer is a z-fight,
  // and a decal at 2 mm is a grey smear from standing height.
  const walkGlow = [];
  for (let i = 0; i < 5; i++) {
    const a = 1.45 + i * .42, s = i % 2 ? 1 : -1, bb = s * .17;
    A.put(a, bb, .27, .115, .010, .055, C('#a08a5c'), { hard: true, gloss: .42, ry: s * .12 });
    A.put(a - .13, bb + s * .03, .085, .085, .010, .055, C('#a08a5c'),
      { hard: true, gloss: .42, ry: s * .12 });
    walkGlow.push(A.dynamicVisual(
      A.put(a, bb, .21, .075, .008, .062, warm, { hard: true, mode: 1, glow: .10, ry: s * .12 })));
  }
  // A brass threshold across each end of it, so the lane has a start and a finish rather than
  // fading out into carpet.
  for (const a of [1.18, 3.46])
    A.put(a, 0, .05, 2.06, .014, .052, C('#a08a5c'), { hard: true, gloss: .45 });
  // What the lane is called, hung over it on two drop wires at 2.55 — above a walking body and
  // clear of the shop's own lighting track at a 1.75, so it obstructs nothing. Deliberately not a
  // free-standing post: a 9 cm bollard in this room grows a 0.69 m collider once the body radius
  // is added to it, and the whole point of this strip is that it is the one piece of floor with
  // nothing in it.
  for (const s of [-1, 1]) A.cap(3.30, s * .40, 3.06, .006, .86, .006, chrome, { gloss: .5 });
  A.put(3.30, 0, .04, 1.02, .30, 2.560, ink, { hard: true, gloss: .28 });
  A.put(3.322, 0, .014, .94, .016, 2.435, gold, { hard: true, mode: 1, glow: .10 });
  A.glyph(3.326, 0, 2.585, '试走道', { size: .105, gap: .034, color: cream, mode: 1, glow: .12 });
  // And what you look into at the end of the walk. Two low mirrors set into the face of the stock
  // plinth either side of the centre line, raked hard back so what they show is the floor and your
  // own feet — which is the only thing anybody looks at while trying shoes on, and the reason a
  // shoe shop's mirrors are at ankle height and not at eye height.
  //
  // Off-centre on purpose. Dead centre of that wall is the open box, the hero shelf and the shop's
  // own name above them; two 0.44 m panels at b ±0.62 take a fifth of the bottom row of cartons
  // and leave every one of those alone. The two words the assistant actually says go on a plate
  // over each of them, which is the one surface here already facing down the lane.
  for (const s of [-1, 1]) {
    const bb = s * .62, o = { tag: '镜子' };
    A.put(.945, bb, .05, .50, .40, .245, chrome, { hard: true, gloss: .55, rz: .40, ...o });
    A.put(.958, bb, .02, .46, .36, .245, ink, { hard: true, gloss: .30, rz: .40, ...o });
    A.put(.972, bb, .012, .44, .12, .372, M_SKY, { hard: true, gloss: .78, rz: .40, ...o });
    A.put(.972, bb, .012, .44, .13, .245, M_ROOM, { hard: true, gloss: .78, rz: .40, ...o });
    A.put(.972, bb, .012, .44, .11, .128, M_FLOOR, { hard: true, gloss: .76, rz: .40, ...o });
    A.put(.900, bb, .04, .40, .095, .530, ink, { hard: true, gloss: .28 });
    A.glyph(.924, bb, .530, s < 0 ? '走两步' : '合不合脚',
      { size: .046, gap: .015, color: gold, mode: 1, glow: .10 });
  }

  // ------------------------------------------------------------------ 库存终端 · asking the back
  // The moment every shoe shop turns on: the size on the wall is not your size, and somebody goes
  // out the back to look. Two objects make that real — a terminal the size is typed into, on the
  // customer half of the till counter where a hand reaches it, and a door for the stock to come
  // through.
  //
  // The terminal is on the counter rather than free-standing because the counter is the only
  // surface on this side of the room with an approach the collision map allows: the till's own
  // focus already lands at (2.56, 3.10) and everything here is hung off that same pocket.
  {
    const ta = 1.98, tb = 2.42;
    A.put(ta, tb, .22, .26, .045, 1.002, ink, { hard: true, gloss: .40 });        // the foot
    A.put(ta - .02, tb, .07, .07, .22, 1.135, ink, { hard: true, gloss: .35 });   // the stalk
    A.put(ta + .02, tb, .05, .30, .24, 1.360, ink, { hard: true, gloss: .32, rz: -.16 });
    stockScreen = A.dynamicVisual(A.put(ta + .052, tb, .012, .26, .195, 1.362, stockBlue,
      { hard: true, mode: 1, glow: .16, rz: -.16 }));
    const stockLabels=[
      A.glyph(ta + .062, tb, 1.395, '查库存',
        { size: .040, gap: .012, color: warm, mode: 1, glow: .14 }),
      A.glyph(ta + .062, tb, 1.318, '40码库存',
        { size: .030, gap: .008, color: gold, mode: 1, glow: .10 }),
    ];
    if(A.powerDisplay)stockPower=A.powerDisplay([stockScreen,stockLabels],{id:'stock-terminal'});
    // A scanner on a cradle beside it, which is what the size is actually read off the box with.
    A.put(ta - .10, tb + .21, .10, .09, .050, 1.005, ink, { hard: true, gloss: .35 });
    A.put(ta - .10, tb + .21, .06, .05, .120, 1.085, ink, { hard: true, gloss: .40, rz: .24 });
    A.put(ta - .07, tb + .21, .012, .034, .014, 1.038, C('#c33f34'), { hard: true, mode: 1, glow: .16 });
  }
  // The stock door, on the west partition where the plan leaves 1.35 m of wall between the men's
  // run and the far bench and nothing wants it. No collider: the partition behind it already has
  // one, and a leaf drawn 4 cm proud of the lining needs nothing of its own.
  {
    const da = 1.55, db = -4.10;
    A.put(da, db, .95, .05, 2.12, 1.06, ink, { hard: true, gloss: .24 });         // the reveal
    A.put(da, db + .035, .86, .03, 2.00, 1.04, walnut, { hard: true, gloss: .26, mode: 6, ...TIMBER });
    A.put(da, db + .050, .012, .022, .58, 1.10, chrome, { hard: true, gloss: .60 });  // the pull
    A.put(da - .34, db + .050, .012, .022, .30, .360, chrome, { hard: true, gloss: .55 });
    A.put(da, db + .052, .26, .012, .13, 1.86, ink, { hard: true, gloss: .30 });
    A.glyph(da, db + .062, 1.86, '仓库', { size: .062, gap: .020, color: gold, mode: 1, glow: .10,
      back: true });
    // A trolley of boxes parked beside it, which is what a stock door has outside it all day.
    A.put(2.32, -3.98, .46, .34, .06, .105, ink, { hard: true, gloss: .35 });
    for (const s of [-1, 1]) A.cyl(2.32 + s * .17, -3.98, .038, .038, .050, ink, { gloss: .30 });
    for (let k = 0; k < 3; k++)
      A.put(2.32, -3.98, .40, .28, .13, .200 + k * .135, BOXC[(k + 1) % BOXC.length],
        { hard: true, gloss: .07, ry: .05 * (k - 1) });
  }

  // ------------------------------------------------------------------ 保养与修理 · care and repair
  // The end of the counter nearest the door, where the polish tray already stood. A shoe shop that
  // only sells shoes is half a shoe shop: this is the half that takes them back afterwards.
  //
  // The buffer is the piece that moves — see the motion block below. Four bristle pads round a hub
  // rather than one drum, because a cylinder turning on its own axis is invisible and four pads
  // going past a fixed cowl is unmistakably a machine running.
  const buffPads = [];
  // One visit-local completion token joins the care verb below to the already-running service tick.
  // The physical group is filled while the fixture is authored; no global save or extra callback.
  const careAction = { rev:0, completedMinute:-1 };
  let careVisual = null;
  {
    const ba = 2.06, bb = 3.98;
    A.put(ba, bb, .30, .34, .022, .992, ink, { hard: true, gloss: .34 });          // its own tray
    A.put(ba - .09, bb, .12, .26, .16, 1.083, ink, { hard: true, gloss: .38 });    // the body
    A.put(ba - .09, bb - .15, .05, .05, .035, 1.120, C('#3fa070'), { hard: true, mode: 1, glow: .16 });
    A.cyl(ba + .05, bb, 1.083, .038, .10, chrome, { gloss: .60, rz: Math.PI / 2 });  // the hub
    for (let k = 0; k < 4; k++) {
      const th = k * Math.PI / 2;
      const p = A.put(ba + .05 + Math.cos(th) * .062, bb, .05, .085, .050,
        1.083 + Math.sin(th) * .062, C('#3b2c20'), { mode: 7, round: .012, gloss: .12 });
      A.dynamic(p, ba + .05, bb, 1.083, .30);
      buffPads.push({ p, th });
    }
    A.put(ba + .11, bb, .05, .13, .12, 1.145, ink, { hard: true, gloss: .30 });    // the cowl
    // The repair end of the same tray: a wooden last, a heel plate, an awl, and two pairs already
    // tagged and waiting for somebody to come back for them.
    A.put(ba - .02, bb - .30, .21, .075, .060, 1.033, C('#a5825a'), { mode: 7, round: .022, ry: .3 });
    A.put(ba - .09, bb - .30, .075, .075, .070, 1.070, C('#a5825a'), { mode: 7, round: .020 });
    for (let k = 0; k < 3; k++)
      A.put(ba + .10, bb - .38 + k * .05, .05, .034, .010, 1.008, chrome, { hard: true, gloss: .55 });
    A.cap(ba - .16, bb - .40, 1.020, .008, .16, .008, chrome, { rx: Math.PI / 2, gloss: .55 });
    for (let k = 0; k < 2; k++) {
      const active = k === 0, sb = bb - .62 - k * .17, parts = active ? [] : null;
      const upper = active ? C('#4b4741') : SHOE_PAL[4][0];
      const sole = active ? C('#292724') : SHOE_PAL[4][1];
      shoe(A, SHOE_LEATHER, ba - .20, sb, 1.006, .02, -1.5 + k * .3,
        upper, sole, active ? '修鞋' : '鞋', .86, parts);
      const ticket = A.put(ba - .30, sb, .006, .050, .034, 1.048, cream,
        active ? { hard:true, gloss:.08, tag:'修鞋' } : { hard:true, gloss:.08 });
      if (active) {
        const beforeM = parts.map(p => p.m), from = A.at(ba - .20, sb), to = A.at(ba + .02, sb);
        const dx = to[0] - from[0], dz = to[1] - from[1];
        const afterM = beforeM.map(m => { const q=m.slice(); q[12]+=dx; q[14]+=dz; return q; });
        const beforeColor = parts.map(p => p.color), beforeGloss = parts.map(() => .07);
        const afterColor = [SHOE_PAL[4][1], SHOE_PAL[4][1], SHOE_PAL[4][0],
          SHOE_PAL[4][1], SHOE_PAL[4][0], SHOE_PAL[4][0]];
        const afterGloss = [.42, .38, .55, .42, .55, .58];
        for (const p of parts) p.gloss = .07;
        const beforeProps = [{ p:ticket, rest:ticket.m }];
        for (const [mb, rz] of [[sb + .12, .42], [sb + .20, -.36]]) {
          const mark = A.put(ba - .13, mb, .010, .082, .012, 1.090, C('#928a80'),
            { hard:true, gloss:.03, ry:-1.5, rz, tag:'修鞋' });
          beforeProps.push({ p:mark, rest:mark.m });
        }
        A.dynamicVisual(parts, beforeProps.map(q => q.p));
        careVisual = { parts, beforeM, afterM, beforeColor, beforeGloss,
          afterColor, afterGloss, beforeProps };
      }
    }
    A.put(ba + .16, bb - .16, .012, .26, .075, 1.115, C('#b83f35'), { hard: true, gloss: .24 });
    A.glyph(ba + .172, bb - .16, 1.115, '保养修理',
      { size: .040, gap: .012, color: cream, mode: 1, glow: .10 });
  }

  // ------------------------------------------------------------------ 袜子与鞋垫, finished off
  // The unit was already here; what it did not have was the thing that makes socks and insoles
  // part of buying a shoe rather than a shelf beside it. A pairing card at the front of it, an
  // insole shown next to the shoe it goes in, and a size band on the sock tier.
  //
  // Everything here goes on the carcass's own door-facing face at a 3.55, because `A.glyph` can
  // only be turned to the shop's yaw or its opposite: the shelf edges face -b and a word laid on
  // one of them would be drawn edge-on and read as a line.
  {
    A.put(3.572, 3.86, .04, .34, .17, .980, C('#b83f35'), { hard: true, gloss: .24 });
    A.glyph(3.596, 3.86, 1.018, '买鞋送袜', { size: .042, gap: .013, color: cream, mode: 1, glow: .10 });
    A.glyph(3.596, 3.86, .938, '鞋垫另购', { size: .030, gap: .009, color: gold, mode: 1, glow: .08 });
    // An insole leaning against a shoe on the lowest tier, so the two are read as a pair rather
    // than as two things that happen to be on the same shelf. The tier's own top is at 0.395.
    shoe(A, SHOE_TRAINER, 3.02, 3.60, .398, .04, -1.9, SHOE_PAL[9][0], SHOE_PAL[9][1], '鞋', .84);
    A.put(3.02, 3.76, .085, .085, .23, .512, cream, { hard: true, gloss: .18, rz: .18 });
    // The size run each sock tier carries, on the same front face, level with its own shelf.
    for (let i = 0; i < 3; i++)
      A.glyph(3.566, 3.86, .500 + i * .300, ['35-38', '39-42', '均码'][i],
        { size: .030, gap: .009, color: cream, mode: 0, glow: 0 });
  }

  // ------------------------------------------------------------------ the shop's clock
  // Written by the motion tick below, read by the verbs at the foot of this file. `mins` is the
  // game's own minutes-of-day, so it moves whenever the player does anything: every action in this
  // room costs between four and twelve minutes, which is what makes the lace on the peg and the
  // answer from the stockroom different the second time you ask.
  const clock = { mins: 12 * 60 };

  // ------------------------------------------------------------------ motion
  // One callback, culled by floor and by distance from the middle of the unit, so none of this
  // costs anything while the player is on another deck or at the far end of the concourse. Time
  // arrives as absolute seconds, so both rigs resume at the right phase after being skipped
  // rather than catching up through a hidden accumulator.
  A.motion('service', (t, state, P, minutes) => {
    // The shop's copy of the clock. Everything the verbs below say varies with it — which lace is
    // on the peg, whether the back has your size — so it is read here, where it is already being
    // handed to us for nothing, rather than in a getter that runs at display rate.
    if (Number.isFinite(minutes)) clock.mins = minutes;
    // One deterministic branch owns every size-40 cue. The existing terminal screen and three
    // retained amber pieces share its result with the exact centre hero shoe, so no frame can say
    // "available" while showing a vacancy (or leave the amber warning behind after restock).
    const available = inStock();
    if (available !== state.stockAvailable) {
      for (let i = 0; i < heroStock.parts.length; i++)
        heroStock.parts[i].m = available ? heroStock.rest[i] : STOCK_GONE;
      for (const q of stockMarkers) q.p.m = available ? STOCK_GONE : q.rest;
      state.stockAvailable = available;
      state.heroSlot = available ? 'filled' : 'empty';
      state.amberMarkers = available ? 0 : stockMarkers.length;
      state.size = 40;
    }
    if(stockPower.active&&available!==state.screenAvailable) {
      stockScreen.color=available?stockBlue:stockAmber;
      stockScreen.glow=available?.16:.28;
      state.screenAvailable=available;
    }
    state.terminal=stockPower.active?(available?'available':'unavailable'):'off';
    const polished = careAction.rev > 0;
    if (careAction.rev !== state.careRev) {
      const matrices = polished ? careVisual.afterM : careVisual.beforeM;
      const colors = polished ? careVisual.afterColor : careVisual.beforeColor;
      const glosses = polished ? careVisual.afterGloss : careVisual.beforeGloss;
      for (let i = 0; i < careVisual.parts.length; i++) {
        const p = careVisual.parts[i]; p.m=matrices[i]; p.color=colors[i]; p.gloss=glosses[i];
      }
      for (const q of careVisual.beforeProps) q.p.m = polished ? STOCK_GONE : q.rest;
      state.careRev = careAction.rev;
      state.carePhase = polished ? 'polished' : 'scuffed';
      state.careMoved = polished ? 1 : 0;
      state.careMarks = polished ? 0 : careVisual.beforeProps.length;
      state.careProps = careVisual.parts.length + careVisual.beforeProps.length;
    }
    // The lane. One footprint at a time, 0.62 s apart, with the two behind it still fading — a
    // hard on/off chase reads as a fault light, a trailing one reads as a direction to walk in.
    const head = (t / .62) % walkGlow.length;
    for (let i = 0; i < walkGlow.length; i++) {
      let d = head - i; if (d < 0) d += walkGlow.length;
      walkGlow[i].glow = .07 + .30 * Math.max(0, 1 - d * .55);
    }
    // The buffer. 2.6 rad/s is fast enough to read as running and slow enough that the four pads
    // do not strobe against the frame rate.
    const q = t * 2.6;
    for (const b of buffPads) {
      const th = b.th + q;
      const w = A.at(2.11 + Math.cos(th) * .062, 3.98);
      b.p.m[12] = w[0]; b.p.m[14] = w[1];
      b.p.m[13] = 1.083 + Math.sin(th) * .062 + A.y0;
    }
    state.lanePhase = +head.toFixed(2);
    state.buffer = +((q % (Math.PI * 2))).toFixed(2);
  }, { far: 22 });

  // ------------------------------------------------------------------ light
  // Three of the eight the shader will take, all of them aimed at a wall of stock rather than at
  // the floor, hung close in at a=1.05 so the shoes are the lit thing in the room and the carpet
  // is not. A track of five heads over them, tilted back at the wall, so the light in here is
  // seen to come from somewhere.
  A.light(1.05, -2.90, 2.00, [1.00, 0.94, 0.84], .38, 3.5);
  A.light(1.05, 2.90, 2.00, [1.00, 0.94, 0.84], .38, 3.5);
  A.light(1.45, 0.00, 1.75, [1.00, 0.90, 0.77], .30, 2.9);
  A.cap(1.75, 0, 3.40, .024, 7.2, .024, ink, { rx: Math.PI / 2, gloss: .35 });
  for (const b of [-3.1, -1.6, 0, 1.6, 3.1]) {
    A.put(1.75, b, .07, .07, .12, 3.34, ink, { hard: true, gloss: .30 });
    A.cyl(1.72, b, 3.19, .055, .17, ink, { gloss: .35, rz: -.37 });
    A.cyl(1.665, b, 3.115, .046, .02, warm, { mode: 1, glow: .30, rz: -.37 });
  }

  // ------------------------------------------------------------------ what there is to say
  // Only words the game has a verb for. `useLabel` looks the label up in USE_AT.mall and then in
  // USE, and a thing whose word is in neither is a thing you can walk up to, read, and then find
  // does nothing at all when you press the key. 皮鞋 and 袜子 are both in MALL_GOODS and in
  // neither table, which is what the first pass of this file labelled two of these with.
  // The other thing to watch is where the shell puts the spot you have to stand on. `A.th` sets
  // the focus 1.15 m outward of the label, and `inReach` measures from the focus, not the label —
  // so a label placed a fraction too far forward lands its focus inside a bench or a window
  // platform and the word becomes unusable. Every one of these was checked against the colliders
  // above: 0.95 -> 2.10 and 1.30 -> 2.45 both clear the benches, which start at 2.31.
  A.th('鞋店', 5.15, 0, '这双鞋有没有大一号的？', 'Do these shoes come a size bigger?',
    '鞋 shoe + 店 shop.', 2.2, 2.5);
  A.th('运动鞋', 0.95, -2.95, '这双运动鞋很轻，试试看。', 'These trainers are very light — try them.',
    '运动 sport + 鞋 shoe.', 1.9, 1.4);
  A.th('鞋', 1.30, 2.95, '这双皮鞋是真皮的。', 'These leather shoes are real leather.',
    '皮鞋 are leather shoes; 鞋 on its own is any shoe.', 1.9, 1.4);
  A.th('镜子', 1.95, -1.90, '照照镜子，看合不合适。', 'Look in the mirror and see if they suit you.',
    '照镜子 means to look in a mirror.', 1.7, 1.0);
  A.th('鞋', 3.15, 2.15, '这一排都打折，买一双送一双袜子。',
    'This row is all reduced — a pair of socks free with every pair.',
    '打折 means to discount; 特价 on the sign is a special price.', 1.8, 1.2);

  // ---- and the service words. Six more, one per fixture added above, and every one of them has
  // its focus PUT rather than derived — see `lab`. The three pockets those focus points sit in
  // are the ones named at the top of the service section, and no two of these are closer together
  // than 0.55 m, because two labels sharing a focus means one of them can never be the nearest.
  //
  // All six headwords have a row in js/vocab.js, which is the whole test for a label: `openWord`
  // is `if (!e || doing) return;` on `Vocab.get(hz)`, so a word with no row is a thing the player
  // can walk up to, press E on, and get silence from. The two that already have verbs, 鞋 and
  // 镜子, are above; the rest get theirs at the foot of this function.
  //
  // The earlier version of this note said the verbs were "a request to whoever owns js/data.js
  // rather than something this file can add". That was wrong, and js/mall-digital.js:1272 had
  // already shown why: `USE_AT` is a top-level `const` in js/data.js and therefore a plain global
  // lexical binding, so a fit-out can define its own rows on `USE_AT.mall` at build time. What a
  // tenant still cannot do is add a *dictionary* row, which is why every headword below is one
  // js/vocab.js already carries.
  lab('号码', 0.90, -1.47, '我穿三十九号。', 'I take a size thirty-nine.',
    '号码 is the number itself. Chinese shoe sizes are arithmetic: 脚长 in cm × 2 − 10.',
    1.7, 1.35, 1.62, -0.80);
  lab('条', 0.90, 1.47, '再给我一条黑鞋带。', 'And a black lace as well, please.',
    '条 is the measure word for long thin things: 一条鞋带, but 一双鞋 for the shoes themselves.',
    1.7, 1.35, 1.62, 0.42);
  lab('走', 2.30, 0.00, '穿上走两步试试。', 'Put them on and take a couple of steps.',
    '走 is to walk, and 走两步 — walk two steps — is what the assistant will say.',
    1.8, 1.05, 2.30, 0.00);
  lab('库存终端', 2.20, 2.42, '后面还有没有货？', 'Is there any left out the back?',
    '库存 stock + 终端 terminal. 有货 means it is in stock; 没货 means it is not.',
    1.7, 1.42, 2.56, 2.62);
  // 修 rather than 干净 here, and the swap is not a taste decision. `USE_AT.mall` is one namespace
  // shared by all eighteen tenants, so a verb installed on a word is installed on that word in
  // every shop that labels it — and 干净 is already the pet shop's, on the fish tank at
  // js/mall-pets.js:1106. A 擦鞋 action reached through a tank of goldfish is worse than a word
  // with nothing behind it, so the care tray takes 修, which nothing else in the building uses.
  lab('修', 2.10, 3.90, '这双鞋能擦一擦、修一修吗？', 'Can these be cleaned up and repaired?',
    '修 is to fix. 擦 is to wipe or polish; 修鞋 is what the 师傅 at this end of the counter does.',
    1.7, 1.16, 2.57, 3.16);
  lab('试穿', 2.60, -1.60, '试穿的时候先穿上袜子。', 'Put a sock on before you try them.',
    '试 to try + 穿 to wear. 穿 is the verb for shoes and clothes both.',
    1.7, 1.10, 2.60, -0.85);

  // ---- and what Q does at each of them ---------------------------------------------------------
  // Rows in `USE_AT.mall`, installed as getters. This is the pattern js/mall-digital.js sets out at
  // length and the note four paragraphs up — written before that file was read — had wrong: a
  // tenant *can* own its own verbs without touching js/data.js. `USE_AT` is a top-level `const` in
  // that file, which loads long before anybody walks into this building, so it is a plain global
  // lexical binding by the time a fit-out runs. The guard is for a harness that loads a tenant file
  // on its own.
  //
  // Only new keys are defined here. 鞋, 运动鞋, 鞋店, 收银台 and 镜子 already have rows — the first
  // four in js/data.js and the fifth in the global table — and clobbering one from a tenant file
  // would make this shop's copy of a shared word disagree with every other shop's.
  //
  // The same fact is why the six words below are all ones no other tenant labels: `USE_AT.mall` is
  // ONE table for eighteen shops, so a verb belongs to a word rather than to a room. 号码, 条, 走,
  // 库存终端, 试穿 and 修 were each checked against every other js/mall-*.js before being used;
  // 干净 and 名字 were dropped from this shop's shortlist because the pet shop and the flower shop
  // already stand things on them.
  //
  // A getter is called every frame the walk-up prompt is drawn, so each one of these builds a
  // small object literal and touches nothing else: one read of `clock.mins`, one modulo, no clock
  // call, no allocation past the literal.
  const verb = (hz, get) => {
    if (typeof USE_AT === 'undefined' || !USE_AT.mall) return;
    Object.defineProperty(USE_AT.mall, hz, { configurable: true, enumerable: true, get });
  };
  // A getter is called every frame the walk-up prompt is drawn. Each of these depends on one
  // integer — which slot of the clock we are in — so the literal is built when that integer changes
  // and handed back unchanged the rest of the time. Nothing downstream mutates a def, so returning
  // the same object twice is safe.
  const memo = (per, build) => {
    let at = -1, def = null;
    return () => {
      const i = Math.floor(clock.mins / per);
      if (i !== at) { at = i; def = build(i); }
      return def;
    };
  };

  // Your feet. A foot does not change between Tuesday and Wednesday, so this is a constant rather
  // than something rolled — and 25.0 cm is a 40, which is the middle of the run the wall chart
  // opposite prints. 鞋码 = 脚长 × 2 − 10 is the whole of the arithmetic and the chart says so.
  const FOOT_CM = 25.0, MYSIZE = FOOT_CM * 2 - 10;
  // The nine laces on the board, in the order they hang. Which one the assistant has in her hand
  // depends on when you ask, which is honest: they are on pegs, not in a menu.
  const LACES = [
    { hz: '白色', py: 'báisè', en: 'white' },
    { hz: '黑色', py: 'hēisè', en: 'black' },
    { hz: '酒红', py: 'jiǔhóng', en: 'wine red' },
    { hz: '藏蓝', py: 'zànglán', en: 'navy' },
    { hz: '墨绿', py: 'mòlǜ', en: 'dark green' },
    { hz: '姜黄', py: 'jiānghuáng', en: 'ochre' },
    { hz: '粉色', py: 'fěnsè', en: 'pink' },
    { hz: '紫色', py: 'zǐsè', en: 'purple' },
    { hz: '驼色', py: 'tuósè', en: 'camel' },
  ];
  // What the two accessory tiers sell, and what a length of lace costs. 一条鞋带 and 一双袜子 —
  // the measure words are the point of the board they hang on.
  const SOCKS = { hz: '袜子', py: 'wàzi', en: 'a pair of socks', price: 15 };
  const INSOLE = { hz: '鞋垫', py: 'xiédiàn', en: 'an insole', price: 25 };
  const LACE_PRICE = 12, CLEAN_PRICE = 20, REPAIR_PRICE = 45;
  const pick = (arr, per) => arr[Math.floor(clock.mins / per) % arr.length];
  // Whether the back has your size. Two hours in three it does, and which two hours depends on the
  // day rather than on a coin: ask twice in the same minute and you get the same answer, which is
  // what stops the terminal reading as a slot machine.
  const inStock = () => Math.floor(clock.mins / 60) % 3 !== 1;

  const FIXED = d => () => d;
  verb('号码', FIXED({
    zh: '量脚', py: 'liáng jiǎo', secs: 2.6, mins: 6, gain: { mood: 4 }, pose: { type: 'stand' },
    en: `stand on the gauge and have your feet measured — 脚长 ${FOOT_CM.toFixed(1)} cm`,
    done: `${FOOT_CM.toFixed(1)}厘米，${MYSIZE}码。`,
    doneTr: `${FOOT_CM.toFixed(1)} centimetres — a size ${MYSIZE}. Length in centimetres, doubled, minus ten.`,
  }));
  verb('条', memo(9, () => {
    const l = pick(LACES, 9);
    return { zh: '挑鞋带', py: 'tiāo xiédài', secs: 2.2, mins: 5, pay: -LACE_PRICE,
      gain: { mood: 6 }, pose: { type: 'reach' },
      en: `take a lace off the board — ${l.en} (${l.hz} ${l.py}), ¥${LACE_PRICE} a length`,
      done: `一条${l.hz}的鞋带，十二块。`,
      doneTr: `One ${l.en} lace, twelve kuai. A lace is 一条; the shoes themselves are 一双.` };
  }));
  verb('走', FIXED({
    zh: '走两步', py: 'zǒu liǎng bù', secs: 3.4, mins: 7, gain: { mood: 9, rest: -2 },
    pose: { type: 'stand' },
    en: 'walk the lane to the mirrors and back, and see whether they fit',
    done: '走了两个来回，不磨脚。', doneTr: 'Twice up and back — they do not rub.',
  }));
  verb('库存终端', memo(60, () => {
    if (inStock())
      return { zh: '查库存', py: 'chá kùcún', secs: 2.0, mins: 4, gain: { mood: 3 },
        pose: { type: 'press' },
        en: `ask the back for a ${MYSIZE} — the terminal says there is one`,
        done: `${MYSIZE}码有货，师傅这就去拿。`,
        doneTr: `A ${MYSIZE} is in stock — he is fetching it now.` };
    return { zh: '问有没有货', py: 'wèn yǒu méi yǒu huò', secs: 2.0, mins: 4, gain: {},
      pose: { type: 'press' },
      en: `ask the back for a ${MYSIZE} — the terminal says it is out`,
      block: `${MYSIZE}码没货了，明天到。`,
      blockTr: `No ${MYSIZE} left — more tomorrow. 有货 means in stock; 没货 means out of it.` };
  }));
  verb('修', memo(45, () => {
    // Two trades on one tray, and which you are offered is which one the 师傅 has his hands on.
    // Cleaning is done while you wait; a heel is two days, which is why it blocks rather than
    // completes — you cannot walk out with it.
    if (Math.floor(clock.mins / 45) % 2)
      return { zh: '送修', py: 'sòng xiū', secs: 2.8, mins: 8, pay: -REPAIR_PRICE, gain: {},
        pose: { type: 'open' },
        en: `book a worn heel in for repair — ¥${REPAIR_PRICE}, two days`,
        block: '鞋跟给您换一副，两天以后来取。',
        blockTr: 'A new pair of heels — come back for them in two days.' };
    const clean = { zh: '擦一擦', py: 'cā yi cā', secs: 2.6, mins: 6, pay: -CLEAN_PRICE,
      gain: { mood: 8 }, pose: { type: 'reach' },
      en: `have a pair cleaned and polished on the buffer — ¥${CLEAN_PRICE}, while you wait`,
      doneTr: 'Cleaned up — as good as new. 干净 is the state; 擦 is how you get there.' };
    // `done` is read only after a finished action. game.js reads it twice (the branch and the say),
    // so the minute guard turns those two reads into one completion revision for the retained rig.
    Object.defineProperty(clean, 'done', { enumerable:true, get() {
      const minute = clock.mins | 0;
      if (careAction.completedMinute !== minute) {
        careAction.completedMinute = minute; careAction.rev++;
      }
      return '擦干净了，跟新的一样。';
    } });
    return clean;
  }));
  verb('试穿', memo(23, () => {
    const s = Math.floor(clock.mins / 23) % 2 ? INSOLE : SOCKS;
    return { zh: '试穿', py: 'shìchuān', secs: 3.0, mins: 9, pay: -s.price, gain: { mood: 11 },
      pose: { type: 'stand' },
      en: `put a trial sock on and try a ${MYSIZE} — with ${s.en} (${s.hz} ${s.py}) at ¥${s.price}`,
      done: `${MYSIZE}码正好，${s.hz}一起拿着。`,
      doneTr: `The ${MYSIZE} is right — and ${s.en} to go with them.` };
  }));
};

// ------------------------------------------------------------------ the two windows
//
// js/mall.js builds the window platform, the glazing and the stall riser, and then asks the
// tenant what stands on it — falling back to two stone plinths and six of its own generic goods
// if nobody answers. For this shop those came out as a heap of pale lozenges a metre from the
// eye, and the window is the only part of a shop most people ever see.
//
// The api here is the shell's `winApi`, which is smaller than the fit's: put, cyl, ball, cap,
// taper and mannequin, no glyph and no collider. `bc` is the centre of the bay and `s` is which
// side of the door it is on. The platform's top is at y 0.34, and the stall riser in front of it
// stands to 0.42 — so anything meant to be seen from the concourse starts above that.
MallFit['鞋店:win'] = (W, bc, s) => {
  const ink = C('#23262a'), board = C('#e5decc'), stone = C('#ded6c2');
  const cream = C('#efe7d4'), warm = C('#ffeccd'), acc = W.acc;
  const SLAB = { mat: 'paving', matScale: .72, matAmt: .28 };
  // A deck over the platform, with a dark reveal under it so it does not read as one lump with
  // the timber it stands on.
  W.put(4.18, bc, .96, 2.28, .05, .365, board, { hard: true, gloss: .38, ...SLAB });
  W.put(4.18, bc, .90, 2.20, .03, .332, ink, { hard: true, gloss: .28 });
  // Three plinths at three heights, each with one shoe on it, turned to face the aisle outside.
  // A window display is a staircase — that is the whole convention — and the reason it is one is
  // that a row of equal blocks reads as a shelf and a staircase reads as an arrangement.
  const H = [.46, .30, .38], BB = [-.66, 0, .66], Q = [-1.25, -.55, 1.25];
  const K = [SHOE_HEEL, SHOE_TRAINER, SHOE_BOOT];
  for (let k = 0; k < 3; k++) {
    // No stone map on these. `matScale` is one repeat in metres and the paving map is 72 cm of
    // setts, so a 34 cm block wears about half a repeat and comes out as rubble masonry — which
    // is exactly what the deck under it, at 2.28 m across, does not. A material has a size, and
    // a plinth is smaller than this one.
    const y0 = .39, top = y0 + H[k];
    W.put(4.16, bc + BB[k] * s, .34, .34, H[k], y0 + H[k] / 2, cream, { hard: true, gloss: .30 });
    W.put(4.16, bc + BB[k] * s, .37, .37, .022, top + .011, stone, { hard: true, gloss: .40 });
    W.put(4.336, bc + BB[k] * s, .012, .30, .016, top - .06, warm,
      { hard: true, mode: 1, glow: .16 });
    const p = SHOE_PAL[(k * 4 + (s > 0 ? 1 : 6)) % SHOE_PAL.length];
    shoe(W, K[k], 4.08, bc + BB[k] * s, top + .026, .20, Q[k] * s, p[0], p[1], W.tag, 1.06);
  }
  // A low riser behind them with three more, so the bay has a back row and a front row.
  W.put(3.86, bc, .30, 1.92, .17, .475, cream, { hard: true, gloss: .30 });
  W.put(3.86, bc, .33, 1.95, .022, .571, stone, { hard: true, gloss: .40 });
  for (let k = 0; k < 3; k++) {
    const p = SHOE_PAL[(k * 3 + (s > 0 ? 8 : 3)) % SHOE_PAL.length];
    shoe(W, [SHOE_LEATHER, SHOE_SLIPPER, SHOE_LEATHER][k], 3.80, bc + (k - 1) * .62 * s, .586,
      .18, (-1.0 + k * .9) * s, p[0], p[1], W.tag);
  }
  // And the graphic every shoe window has hanging in it: a lit panel in the tenant's colour with
  // a cream band across it. There is no glyph on this api, and that is the right restriction — a
  // sign this close to the fascia would be competing with the shop's own name a metre above it.
  W.put(3.72, bc, .05, .74, .96, 1.66, ink, { hard: true, gloss: .30 });
  W.put(3.755, bc, .02, .66, .88, 1.66, acc, { hard: true, mode: 1, glow: .09 });
  W.put(3.775, bc, .012, .58, .13, 1.44, cream, { hard: true, gloss: .20 });
  W.put(3.775, bc, .012, .58, .05, 1.24, C('#f3d47b'), { hard: true, mode: 1, glow: .10 });
};

// ------------------------------------------------------------------ who is in here
//
// This shop had nobody in it at all, which is the one thing a shoe shop cannot be: the whole
// transaction is somebody fetching your size from the back and watching you walk in it. Pushed
// onto MallCast (js/mall.js) rather than into the NPCS call in js/game.js, so eighteen tenants can
// staff themselves without eighteen people editing one argument list.
//
// ---- coordinates. Everything above is written in the shop's (a, b); the roster wants the mall's
// world (x, z). This unit is shop('W', 9.2, 8.4) and the W frame in js/mall.js is base [-23, 0]
// with n [1,0] and t [0,1], so for this shop and only this shop:
//
//     x = a - 23        z = b + 9.2
//
// ---- facing. `face` is a yaw whose direction is (sin, cos), so 0 looks along +z (= +b), Math.PI
// along -b, Math.PI/2 along +a (out towards the concourse) and -Math.PI/2 at the back wall.
//
// ---- where a body may stand. `clampMove` expands every collider by the walker's radius — 0.28
// for these, 0.30 for the player — and pushes anything inside the result out to the nearest face
// on the frame after it is placed. This unit is packed, and doing that arithmetic rather than
// reading the plan is the difference between a shop assistant and a shop assistant standing in a
// bench. Three of the four positions below sit in slots between 0.20 and 0.30 m wider than a body,
// and each one is written out beside the person who stands in it.
//
// No `rig:` on any of them. A named rig has to exist in js/assets.js, which is not this file's to
// edit; without one they are drawn with the procedural body, exactly as the anonymous crowd is.
if (typeof MallCast !== 'undefined') MallCast.push(
  // 李婉, at the open end of the till counter. She cannot stand *behind* it: the counter's own
  // collider (a 1.40..2.16) and the stool-and-boxes behind it (a 0.92..1.34) expand into each
  // other and leave no staff side at all, which is a fact about the layout rather than about her.
  // So she works the customer side of the sale table, in the 0.22 m slot at a 2.46..2.68 that is
  // also where the till's own approach point sits — the two of you meet across the same counter.
  { hz: '店员', name: '李婉', py: 'Lǐ Wǎn', place: 'mall', mallFloor: 1, temper: 'genial',
    look: { skin: '#e6b98f', hair: '#241d1a', hairStyle: 'ponytail', top: '#eee7d6',
            vest: '#2f6b5e', pants: '#333940', shoe: '#26292d', collar: 'shirt', tall: .97,
            faceSeed: 7311 },
    spots: [{ h0: 10, h1: 22, at: [-20.40, 12.25], face: Math.PI / 2, act: 'vend' }],
    lines: [['您穿多大号？我给您量一下。', 'What size do you take? Let me measure you.'],
            ['三十九号没有了，我去后面看看。', 'We are out of thirty-nine — I will look out the back.'],
            ['买一双送一双袜子。', 'A free pair of socks with every pair of shoes.']] },
  // 韩国栋, the 师傅: the measuring gauge, the walking lane and the repair tray are all his. He
  // stands at the back of the lane at b -1.15 — 10 cm outside the runner, so he is beside the
  // walking test and not standing in it — in the 0.25 m band between the fitting mirrors' expanded
  // box (which ends at a 1.78) and the near bench's (which begins at a 2.03).
  { hz: '师傅', name: '韩国栋', py: 'Hán Guódòng', place: 'mall', mallFloor: 1, temper: 'patient',
    look: { skin: '#c8946b', hair: '#3a332e', hairStyle: 'short', top: '#5c6870', pants: '#39414a',
            shoe: '#2a2f33', apron: '#4b3829', tall: 1.02, stoop: .05, faceSeed: 7312 },
    spots: [{ h0: 10, h1: 22, at: [-21.10, 8.05], face: Math.PI, act: 'vend' }],
    lines: [['站上去，脚跟靠住后面。', 'Step on, heel back against the stop.'],
            ['您试着走两步，看合不合脚。', 'Walk a couple of steps and see whether they fit.'],
            ['鞋跟磨掉了，两天就能修好。', 'The heel is worn down — two days and it will be repaired.']] },
  // 周同, at the door end of the lane, where a greeter stands. Clear of the podium's expanded box,
  // which reaches a 3.00 and b 0.60.
  { hz: '导购员', name: '周同', py: 'Zhōu Tóng', place: 'mall', mallFloor: 1, temper: 'eager',
    look: { skin: '#d5a078', hair: '#1f1b18', hairStyle: 'tousled', top: '#efe6d4', pants: '#2c333c',
            shoe: '#e8e2d6', collar: 'polo', tall: 1.05, faceSeed: 7313 },
    spots: [{ h0: 10, h1: 22, at: [-19.65, 9.80], face: Math.PI / 2, act: 'vend' }],
    lines: [['新款在中间那个台子上。', 'The new styles are on the stand in the middle.'],
            ['男鞋在左边，女鞋在右边。', "Men's shoes on the left, women's on the right."],
            ['鞋带和鞋垫都在后面那面墙上。', 'Laces and insoles are on the wall at the back.']] },

  // The customers. Two sitting, one walking the lane, one at the men's wall — which between them
  // is the whole of what a shoe shop looks like from its own door.
  //
  // A seated figure carries the `seatY` of the pan it is on, and the sit pose derives the entire
  // leg from that number. The benches here are built with their cushion top at 0.453 and a 14 mm
  // cover over it, so the surface a body sits on is 0.46 and not the 0.50 a chair would give.
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'patient', seatY: .46,
    look: { skin: '#dbb086', hair: '#2a2320', hairStyle: 'bob', top: '#8b6f86', pants: '#3d4652',
            shoe: '#e7e0d3', bag: 'tote', bagColor: '#9b704a', tall: .99, faceSeed: 7314 },
    spots: [{ h0: 10, h1: 22, at: [-20.40, 7.30], face: -Math.PI / 2, act: 'wait' }] },
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'bored', seatY: .46,
    look: { skin: '#c99269', hair: '#302823', hairStyle: 'short', top: '#5f7386', pants: '#343b44',
            shoe: '#272c30', tall: 1.06, faceSeed: 7315 },
    spots: [{ h0: 10, h1: 22, at: [-20.40, 5.85], face: -Math.PI / 2, act: 'phone' }] },
  // Standing at the men's wall, in the 0.25 m band between the fitting mirror and the far bench.
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'steady',
    look: { skin: '#eec39a', hair: '#231e1b', hairStyle: 'bun', top: '#c4a05f', pants: '#414855',
            shoe: '#eae3d6', tall: .95, faceSeed: 7316 },
    spots: [{ h0: 10, h1: 22, at: [-21.10, 6.25], face: -Math.PI / 2, act: 'browse' }] },
  // And the one the lane was built for: in through the 3 m opening, down the middle of the
  // 试走道 to the low mirrors at the stock wall, back out again. Every leg is on b = 0, which is
  // the only line in this unit with nothing within 0.9 m of it on either side, so the route can
  // never jam — and `mallBlocked` in js/game.js advances a leg that does anyway.
  { hz: '顾客', place: 'mall', mallFloor: 1, temper: 'bustling',
    look: { skin: '#dbaa83', hair: '#29211d', hairStyle: 'tousled', top: '#a8543f', pants: '#46566a',
            shoe: '#ece6da', pack: true, packColor: '#3d5a70', tall: 1.01, faceSeed: 7317 },
    patrol: [[-17.40, 9.20], [-19.20, 9.20], [-20.60, 9.20], [-21.60, 9.20], [-20.60, 9.20],
             [-19.20, 9.20], [-17.40, 9.20], [-17.40, 12.40], [-17.40, 6.00], [-17.40, 9.20]],
    speed: .92 },
);
