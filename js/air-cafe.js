// ☕ Café — 云顶咖啡. The espresso machine, the price board, 咖啡师
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    x 14.0 .. 19.0  (airside)
//   camera  D9-cafe
//
// The espresso machine, the price board, 咖啡师.
//
// The camera IS the acceptance test. Render your shot with `node .audit.js D9-cafe`, open the
// PNG, and look at it. A zone whose code boots but whose shot is black, empty, or unchanged has
// not shipped. You own your row(s) in .audit.js and nobody else's.
//
// ---------------------------------------------------------------------------------------------
// WHAT WAS ALREADY HERE, AND WHY THIS FILE ADDS RATHER THAN REPLACES
//
// Wave 0 carved the terminal into AirFit byte-for-byte, and "byte-for-byte" means the café the
// hall shipped with is still in js/airport.js — the counter, the price board's five rows, 咖啡师
// herself, one customer, and two round tables out at x 13.70 and 19.50. That file has one writer
// and it is not this agent, so none of it can be moved or deleted from here.
//
// So this file is the second half of a café, built to fit the first half exactly. Every number
// below was measured off the shell's own geometry rather than guessed:
//
//   CFX 16.60, CFZ 7.80            the shell's café datum (CFZ = RZ − .70)
//   counter          x 14.70..18.50, z 6.89..7.91, top surface y 1.125
//   espresso machine x 15.05..15.95, y 1.12..1.72, z 7.20..7.80   ← a bare chrome box; dressed here
//   eight cups       x 16.645..17.265, z 7.245..7.555
//   the till         x 17.90..18.30, z 7.23..7.57
//   咖啡师           x 17.50, z 7.65, facing −z; her hands sit at z 7.185..7.285, y 1.20
//   price board      x 15.0..18.2, y 2.15..3.25, z 7.93..8.03
//   the back wall    x 14.5..18.7, y 0..3.10, z 8.00..8.40
//
// The counter is genuinely full: the only clear runs of its top are x 15.95..16.645 (the grinder
// goes there) and the 0.25 m strip along its customer edge at z 6.89..7.20 (the pickup shelf).
// Everything else this zone owes the contract had to find floor or wall instead — which is why
// the pastry case is a free-standing unit making an L at the west end, and why the shop's name is
// a lit fascia in the one horizontal band of wall nobody had claimed, y 1.82..2.12: above 咖啡师's
// head, which tops out at 1.75, and below the price board, which starts at 2.15.
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
// This zone spends FOUR translucent draw calls of its twelve and no more:
//   1  the pastry case vitrine — one box, not five panes, because five panes is five draw calls
//   3  steam — two wisps off the machine, one off a cup on the pickup shelf
// Steam is the trap this budget was written for. A plume looks like it wants twenty quads; three
// soft balls that rise, swell and fade on a sine do the same job for three. They are moved by
// writing into the existing matrix in place — no allocation, no new props, no second timer.
//
// ---------------------------------------------------------------------------------------------

// The steam, captured at build time so the tick can move it without allocating or searching.
// Module scope rather than closure scope because the tick is a sibling of the builder, not a
// child of it.
const CAFE_STEAM = [];

registerAirportAmbient('cafe-table-passenger', 17.91, 4.15, .33,
  { hz:'乘客', roleClass:'civilian', act:'drink', seatY:.48, temper:'bored',
    top:'#3f6b6b', source:'air-cafe' });

AirFit['cafe'] = A => {
  const { box, cyl, ball, cap, taper, glyphs, solid, glow, thing, shade } = A;
  const { C, G, col } = A;

  // ---- the shell's café datum, restated. Do not measure off a neighbour; measure off this.
  const CFX = 16.60, CFZ = A.RZ - .70;   // 16.60, 7.80
  const TOP = 1.125;                      // the counter's top surface
  const WALLZ = 8.00;                     // the face of the café's back wall

  const CUP = '咖啡', CASE = '蛋糕', PICK = '取餐';
  const oakish = C('#3a2f26');            // the shell's counter-top brown, reused so it batches
  const paper = C('#c8b795');             // the shell's paper-bag buff

  CAFE_STEAM.length = 0;                  // idempotent, in case the registry is ever run twice

  // =============================================================== 1. the espresso machine
  //
  // The shell put a 0.90 × 0.60 × 0.60 chrome box on the counter and called it an espresso
  // machine. At six metres — which is where the D9 camera stands — a chrome box reads as a
  // microwave. What makes the silhouette legible as espresso is entirely in the fittings: two
  // group heads with portafilters hanging out of them at the front, a wand on the side, gauges,
  // and a rack of cups warming on the lid. All of it hangs on the box the shell already owns.
  const MX = 15.50, MZ = 7.50;            // the machine's centre
  const MFZ = 7.20, MTY = 1.72;           // its front face, and its top

  // The raised back and the cup warmer, both CHARCOAL and not chrome. The first version built
  // every fitting here out of col.chrome and col.steelD on top of the shell's pale chrome box,
  // against a wall of col.wallD — and the whole machine came out of D9 as one white blob with two
  // circles on it. A real machine is stainless with black trim, and the black is what draws the
  // silhouette. It is also what makes the six white cups on the warmer visible at all.
  //
  // Topping out at 1.83 is deliberate: the 云顶咖啡 fascia starts at 1.82, and the first version's
  // riser stood to 1.91 and cut the corner off the shop's own name.
  box(MX, 1.775, 7.66, .86, .11, .26, col.charcoal, { tag: CUP, hard: true, gloss: .34 });
  box(MX, MTY + .015, MZ, .84, .03, .54, col.charcoal, { tag: CUP, hard: true, gloss: .34 });
  for (const cz of [7.38, 7.62])
    for (const cx of [15.22, 15.50, 15.78])
      cyl(cx, 1.785, cz, .042, .07, col.white, { tag: CUP, gloss: .22 });

  // The two group heads. Housing, spout, and the portafilter locked into it with its handle
  // sticking out towards the customer — the one detail that says espresso and nothing else.
  for (const gx of [15.28, 15.72]) {
    box(gx, 1.40, MFZ - .05, .16, .13, .12, col.charcoal, { tag: CUP, hard: true, gloss: .34 });
    cyl(gx, 1.30, MFZ - .05, .048, .055, col.steelD, { tag: CUP, gloss: G.metal });
    cyl(gx, 1.245, MFZ - .05, .012, .05, col.chrome, { tag: CUP, gloss: G.metal });
    cap(gx, 1.285, MFZ - .18, .020, .17, .020, col.black,
      { tag: CUP, rx: Math.PI / 2, gloss: .20 });
  }

  // Two gauges on the front, laid into the xy plane by rx so they read as dials and not as
  // drums. A working machine has a needle sitting somewhere; a lit face at this size is enough.
  for (const gx of [15.24, 15.76]) {
    cyl(gx, 1.55, MFZ - .015, .055, .022, col.charcoal,
      { tag: CUP, rx: Math.PI / 2, gloss: .34 });
    cyl(gx, 1.55, MFZ - .028, .044, .006, col.white,
      { tag: CUP, rx: Math.PI / 2, mode: 1, glow: .10 });
  }

  // The steam wand, on the −x cheek of the machine where the camera sees it in profile against
  // the counter, with the milk jug parked under it. This is where two of the three wisps live.
  cap(15.01, 1.32, 7.30, .013, .32, .013, col.chrome, { tag: CUP, rx: .30, gloss: G.metal });
  cyl(15.01, 1.16, 7.35, .016, .05, col.steelD, { tag: CUP, gloss: G.metal });
  cyl(15.01, 1.22, 7.36, .052, .19, col.chrome, { tag: CUP, gloss: G.metal });
  box(14.93, 1.22, 7.36, .03, .10, .02, col.chrome, { tag: CUP, hard: true, gloss: G.metal });

  // the drip tray and its grille, and the knock box for spent grounds
  box(MX, 1.155, MFZ + .02, .72, .05, .22, col.steelD, { tag: CUP, hard: true, gloss: G.metal });
  box(MX, 1.184, MFZ + .02, .68, .012, .18, col.charcoal, { tag: CUP, hard: true, gloss: .20 });
  cyl(16.05, 1.22, 7.70, .07, .19, col.charcoal, { tag: CUP, gloss: .24 });
  // the warm strip under the machine's top lip, which is what makes it read as switched on
  box(MX, 1.695, MFZ - .01, .80, .025, .02, col.tube,
    { tag: CUP, hard: true, mode: 1, glow: .30 });

  // =============================================================== 2. the grinder
  //
  // In the one clear run of counter left, x 15.95..16.645, hard against the machine — which is
  // where it stands in every café, because the barista works the two as one station. The hopper
  // is a taper flipped by rx so it is narrow at the bottom and wide at the top, the same trick
  // the shell's coffee cups use.
  const RX_ = 16.32;
  box(RX_, 1.31, 7.62, .21, .37, .25, col.charcoal, { tag: CUP, hard: true, gloss: .34 });
  cyl(RX_, 1.53, 7.62, .105, .07, col.steelD, { tag: CUP, gloss: G.metal });
  taper(RX_, 1.70, 7.62, .19, .28, .19, C('#4a3527'), { tag: CUP, rx: Math.PI, gloss: .30 });
  cyl(RX_, 1.855, 7.62, .100, .025, col.charcoal, { tag: CUP, gloss: .30 });
  box(RX_, 1.24, 7.46, .09, .16, .09, col.steelD, { tag: CUP, hard: true, gloss: G.metal });
  box(RX_, 1.16, 7.42, .14, .022, .06, col.steelD, { tag: CUP, hard: true, gloss: G.metal });
  // a second portafilter waiting under the chute, handle out
  cyl(RX_, 1.155, 7.42, .046, .045, col.steelD, { tag: CUP, gloss: G.metal });
  cap(RX_, 1.155, 7.30, .019, .15, .019, col.black, { tag: CUP, rx: Math.PI / 2, gloss: .20 });

  // =============================================================== 3. the pastry case
  //
  // Free-standing, making an L off the west end of the counter, because there is no room left on
  // the counter itself and none behind it either — the shell's counter stops at z 7.85 and the
  // wall starts at 8.00, so the barista's whole back-bar is a 15 cm slot.
  //
  // x 14.05..14.65 is the only floor in this zone that is nobody else's: the duty-free's collider
  // ends at x 14.00 and the café counter's begins at 14.70. The 0.50 m slot between them was
  // already sealed (0.50 < the 0.60 two inflated colliders need), so standing a case in it costs
  // the player no route they had.
  //
  // ONE translucent box for the glazing, not four panes. Every face of a box is single-sided, so
  // from outside you see the front pane tinted and the shelves through it, which is the whole
  // effect, for a quarter of the draw calls.
  const PX = 14.35, PZ = 7.15;
  box(PX, .45, PZ, .58, .90, 1.28, C('#2b2f36'),
    { tag: CASE, hard: true, gloss: .28, ...A.M_METAL });
  box(PX, .935, PZ, .62, .07, 1.32, oakish, { tag: CASE, hard: true, gloss: .30 });
  box(PX, 1.22, PZ, .56, .50, 1.24, col.glass,
    { tag: CASE, hard: true, alpha: .30, gloss: G.glass });          // ← translucent 1 of 4
  box(PX, 1.485, PZ, .60, .045, 1.28, col.steelD, { tag: CASE, hard: true, gloss: G.metal });
  // Four corner posts, and they are not decoration. Glass at alpha .20 against a pale wall is
  // invisible, so the first version rendered as two white shelves and a steel slab hanging in mid
  // air with nothing holding any of them up. The posts are what say "case": they close the
  // silhouette, and the glazing can then stay faint, which is what glazing should be.
  for (const qx of [PX - .26, PX + .26])
    for (const qz of [PZ - .58, PZ + .58])
      box(qx, 1.216, qz, .038, .49, .038, col.steelD, { tag: CASE, hard: true, gloss: G.metal });
  for (const sy of [1.06, 1.28])
    box(PX, sy, PZ, .50, .022, 1.14, col.white, { tag: CASE, hard: true, gloss: .26 });
  // what is in it: two 牛角包 on the lower shelf, 蛋挞 beside them, cakes on the upper
  for (const [bz, ry] of [[6.78, .30], [7.06, -.20]])
    cap(PX, 1.116, bz, .055, .17, .055, C('#c68a44'),
      { tag: CASE, rz: Math.PI / 2, ry, gloss: .18 });
  for (const tz of [7.34, 7.52]) {
    taper(PX, 1.101, tz, .10, .06, .10, C('#e5cf9e'), { tag: CASE, gloss: .20 });
    cyl(PX, 1.128, tz, .036, .012, C('#d9a441'), { tag: CASE, gloss: .28 });
  }
  for (const kz of [6.80, 7.14, 7.48]) {
    cyl(PX, 1.336, kz, .085, .09, C('#f0e2cc'), { tag: CASE, gloss: .18 });
    cyl(PX, 1.389, kz, .087, .016, C('#b8474a'), { tag: CASE, gloss: .22 });
  }
  // The label goes on the plinth, not on the glass. At y 1.40 it was floating in the middle of an
  // invisible pane with nothing behind it; the plinth is a solid dark panel 0.90 tall and gold on
  // navy is the one combination in this room that reads from anywhere.
  glyphs(PX, .62, 6.500, Math.PI, '面包蛋糕',
    { size: .105, gap: .032, color: col.goldL, mode: 1, glow: .26, tag: CASE });
  solid(14.05, 14.65, 6.50, 7.80);

  // =============================================================== 4. the pickup shelf
  //
  // 取餐 — the ledge the finished drinks are put out on, which is the only piece of a café the
  // customer is allowed to reach over. It takes the 0.25 m strip along the counter's customer
  // edge, the last clear run of counter left, pulled to z 7.06 so it clears 咖啡师's hands: she
  // stands at z 7.65 with her hands out at z 7.185..7.285, and this stops at 7.19.
  const KX = 17.85;
  // Stainless, not the counter's own dark oak. The first version used `oakish` for the ledge and
  // it vanished: the counter top it stands on is the same colour, so from D9 the whole shelf read
  // as a smear on the counter with three cups floating over it.
  // The riser is charcoal and the ledge stainless, which is both what the fitting looks like and
  // the only way the writing works: 取餐 went on the ledge's front edge first, and a 0.06 m band
  // gives you a 0.075 glyph, which at six metres is nine pixels of yellow mush. The riser's front
  // face is 0.22 tall and dark, so the same two characters go on at 0.12 and can be read.
  box(KX, 1.235, 7.10, 1.06, .22, .12, col.charcoal, { tag: PICK, hard: true, gloss: .30 });
  box(KX, 1.375, 7.06, 1.14, .06, .26, col.steel, { tag: PICK, hard: true, gloss: G.metal });
  for (const cx of [17.45, 17.75, 18.05]) {
    taper(cx, 1.465, 7.06, .11, .12, .11, col.white, { tag: PICK, rx: Math.PI, gloss: .22 });
    cyl(cx, 1.535, 7.06, .055, .022, col.charcoal, { tag: PICK, gloss: .24 });
  }
  box(18.32, 1.49, 7.06, .16, .17, .11, paper, { tag: PICK, gloss: .16, ry: -.25 });
  glyphs(KX, 1.235, 7.035, Math.PI, '取餐',
    { size: .12, gap: .05, color: col.goldL, mode: 1, glow: .30, tag: PICK });

  // =============================================================== 5. 云顶咖啡, the fascia
  //
  // The shop's name, invented: 云顶咖啡, "cloud-top coffee", which is the kind of name a Chinese
  // airport concession actually carries and belongs to nobody.
  //
  // It goes in the band y 1.82..2.12 for the only reason that matters — it is the one horizontal
  // strip of this wall that is free. 咖啡师's head tops out at 1.75 and the price board starts at
  // 2.15. Thirty centimetres, and a café's name over its counter is exactly what belongs in it.
  box(CFX, 1.97, 7.98, 3.30, .30, .07, col.navy, { tag: CUP, hard: true, gloss: .26 });
  box(CFX, 1.805, 7.95, 3.24, .025, .04, col.tube,
    { tag: CUP, hard: true, mode: 1, glow: .30 });
  glyphs(CFX, 1.975, 7.94, Math.PI, '云顶咖啡',
    { size: .185, gap: .13, color: col.goldL, mode: 1, glow: .38, tag: CUP });

  // The A-board on the floor, west of the counter where it blocks no route and no sightline —
  // its top is y 0.99 and the machine it stands in front of starts at 1.12. Airport prices are
  // the joke this whole fitting exists to tell, so the special is a latte at 35 against the 42 on
  // the board behind it, which is a discount that is still daylight robbery.
  box(14.95, .62, 6.47, .52, .78, .02, col.oak, { tag: CUP, mode: 6, gloss: .20 });
  box(14.95, .62, 6.45, .48, .74, .045, C('#22262b'), { tag: CUP, hard: true, gloss: .14 });
  for (const lx of [14.77, 15.13])
    box(lx, .13, 6.50, .05, .26, .05, col.steelD, { tag: CUP, hard: true, gloss: G.metal });
  glyphs(14.95, .78, 6.424, Math.PI, '今日特价',
    { size: .085, gap: .022, color: col.goldL, mode: 1, glow: .26, tag: CUP });
  glyphs(14.95, .60, 6.424, Math.PI, '拿铁35',
    { size: .075, gap: .018, color: col.white, mode: 1, glow: .20, tag: CUP });

  // =============================================================== 6. the room to kill forty
  //                                                                    minutes in
  //
  // The shell left two tables at x 13.70 and 19.50 — both outside this zone, both hard against
  // the frame edges of D9, and nothing at all in between. So the middle of the café's floor, the
  // part the camera actually looks across, was bare carpet.
  //
  // Three more tables, scattered rather than ranked, because a café floor is never a grid. The
  // positions are set by two constraints and not by eye: none of them may hide the counter from
  // the D9 camera (the sightline to the counter's top edge passes y 1.22 at z 5.70, and a table
  // top is 0.76), and none may seal the lane in front of the counter. `clampMove` inflates every
  // collider by the 0.30 body radius, so the colliders here are the table discs only — 0.84 on a
  // side, not the shell's 1.00 — and the stools are left for the player to brush past. Measured
  // with World.clampMove walking the café in 5 cm steps, not deduced.
  function bistro(tx, tz) {
    cyl(tx, .36, tz, .38, .72, col.oak, { tag: CUP, mode: 6, gloss: .26 });
    cyl(tx, .73, tz, .46, .06, oakish, { tag: CUP, hard: true, gloss: .30 });
    cyl(tx, .04, tz, .34, .06, col.steelD, { tag: CUP, gloss: .28 });
    shade(tx, tz, 1.6, 1.6, .22);
    solid(tx - .42, tx + .42, tz - .42, tz + .42);
  }
  function stool(sx, sz) {
    cyl(sx, .23, sz, .17, .46, col.steelD, { tag: CUP, gloss: G.metal });
    box(sx, .48, sz, .38, .05, .38, col.seat, { tag: CUP, hard: true, gloss: .30 });
  }
  // A cup and its saucer, the shell's own recipe so it lands in the shell's own batches.
  function cuppa(cx, cz, dregs) {
    cyl(cx, .775, cz, .085, .015, col.white, { tag: CUP, hard: true, gloss: .28 });
    taper(cx, .825, cz, .12, .10, .12, col.white, { tag: CUP, rx: Math.PI, gloss: .26 });
    cyl(cx, .872, cz, .052, .012, dregs ? C('#6b5138') : C('#4a2f1e'),
      { tag: CUP, mode: 1, gloss: .50 });
  }

  bistro(15.30, 4.85); stool(14.71, 5.29); stool(15.95, 4.50);
  bistro(18.15, 4.85); stool(17.91, 4.15); stool(18.28, 5.58);
  bistro(16.90, 5.70); stool(16.18, 5.88); stool(17.36, 5.12);

  // What is left on them. A wiped table is a table nobody has sat at; this is the last place
  // before the gate and every one of them should look recently used.
  cuppa(15.16, 4.72, false);
  box(15.58, .772, 5.00, .34, .022, .26, C('#6a4b34'), { tag: CUP, hard: true, gloss: .20, ry: .2 });
  box(15.60, .790, 4.98, .07, .02, .06, col.white, { tag: CUP, gloss: .10, ry: .6 });

  cuppa(17.02, 5.58, true);
  box(16.78, .855, 5.82, .17, .21, .12, paper, { tag: CUP, gloss: .16, ry: -.3 });
  box(16.78, .965, 5.82, .175, .04, .125, C('#b8a684'), { tag: CUP, hard: true, gloss: .16, ry: -.3 });

  cuppa(18.30, 4.98, false);
  box(18.02, .765, 4.66, .075, .012, .145, col.charcoal, { tag: CUP, hard: true, gloss: .40, ry: .5 });
  box(18.02, .7725, 4.66, .062, .002, .130, C('#8fbcd4'),
    { tag: CUP, hard: true, mode: 1, glow: .16, ry: .5 });
  // the boarding pass, face up beside the phone — the reason she is sitting here at all
  box(18.26, .7645, 4.63, .21, .009, .095, col.white, { tag: CUP, hard: true, gloss: .10, ry: -.35 });
  box(18.33, .7695, 4.65, .055, .002, .090, col.blueSign,
    { tag: CUP, hard: true, mode: 1, ry: -.35 });

  // The bag against the stool leg. The stool's leg is a 0.17 cylinder at 17.91, so the bag's
  // shoulder at 17.77 leans on it rather than hovering near it.
  box(17.62, .22, 3.95, .30, .44, .18, C('#37506a'), { tag: CUP, mode: 7, gloss: .10, ry: .4 });
  cap(17.62, .455, 3.95, .022, .22, .022, col.charcoal,
    { tag: CUP, rz: Math.PI / 2, ry: .4, gloss: .20 });
  box(17.50, .30, 3.88, .06, .09, .012, col.white, { tag: CUP, hard: true, gloss: .12, ry: .4 });
  // and a second one under the far table, because one bag is a prop and two is a departure lounge
  box(14.98, .19, 5.26, .26, .38, .17, C('#4a4f58'), { tag: CUP, mode: 7, gloss: .10, ry: -.5 });
  cap(14.98, .40, 5.26, .020, .19, .020, col.charcoal,
    { tag: CUP, rz: Math.PI / 2, ry: -.5, gloss: .20 });

  // =============================================================== 7. the passenger
  //
  // One person, at the east table, turned three-quarters away towards the gate signage — which
  // is the honest thing to be doing in the last comfortable seat before boarding, and also the
  // kindest angle a figure built out of capsules ever gets.
  //
  // The proportions are not invented. They are the shell's own `agent`/`passenger` numbers for a
  // seated adult — shoulder 1.03, hips 0.50, which is a 0.45 seat pan plus the 0.58 from pan to
  // shoulder — re-expressed here because `agent` lives in js/airport.js and is not on `A`. The
  // hands rest at 0.78, two centimetres over a table top of 0.76.
  function sitter(px, pz, yaw, o) {
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const gx = Math.cos(yaw), gz = -Math.sin(yaw);
    const sh = 1.03, base = .50, hh = .78, reach = .24;
    const skin = C('#dfab7e'), hair = C('#241f1c');
    const T = { tag: CUP, ry: yaw };
    const F = { ...T, mode: 7, gloss: .06 };
    const S = { ...T, gloss: .16 };
    for (const s of [-1, 1]) {
      const lx = px + gx * s * .105, lz = pz + gz * s * .105;
      cap(lx + fx * .21, .545, lz + fz * .21, .078, .42, .078, o.legs, { ...F, rx: Math.PI / 2 });
      cap(lx + fx * .42, .28, lz + fz * .42, .070, .44, .070, o.legs, F);
      box(lx + fx * .46, .035, lz + fz * .46, .11, .07, .25, o.shoe, { ...T, gloss: .22 });
    }
    box(px, (base + sh - .07) / 2, pz, .40, sh - .07 - base, .25, o.uni, F);
    cap(px, sh, pz, .100, .40, .100, o.uni, { ...F, rz: Math.PI / 2 });
    cap(px + fx * .012, sh + .085, pz + fz * .012, .046, .13, .046, skin, S);
    const hy = sh + .20;
    ball(px + fx * .018, hy, pz + fz * .018, .092, .112, .098, skin, S);
    ball(px + fx * .004, hy + .030, pz + fz * .004, .096, .098, .102, hair, { ...T, gloss: .18 });
    cap(px + fx * .018, sh + .025, pz + fz * .018, .112, .038, .112, o.collar,
      { ...F, rz: Math.PI / 2 });
    for (const s of [-1, 1]) {
      const ax = px + gx * s * .185, az = pz + gz * s * .185;
      const ez = .11, dy = sh - .05 - hh;
      cap(ax + fx * ez / 2, (sh - .05 + hh) / 2, az + fz * ez / 2, .062,
        Math.hypot(dy, ez), .062, o.uni, { ...F, rx: -Math.atan2(ez, dy) });
      cap(ax + fx * (ez + reach / 2), hh, az + fz * (ez + reach / 2), .056, reach, .056,
        o.uni, { ...F, rx: Math.PI / 2 });
      ball(ax + fx * (ez + reach + .045), hh, az + fz * (ez + reach + .045), .050, .042, .050,
        skin, S);
    }
    // A face, even on a figure the camera mostly sees from behind: D7-gate and DC-lounge both
    // come at this table from the other side, and a blank head reads as a head that failed to
    // load rather than as a person facing away.
    const hcX = px + fx * .018, hcZ = pz + fz * .018;
    const dark = C('#2a2422'), eyew = C('#f1eee7'), lip = C('#a86662');
    for (const s of [-1, 1]) {
      const ex = hcX + gx * s * .036 + fx * .088, ez2 = hcZ + gz * s * .036 + fz * .088;
      ball(ex, hy + .020, ez2, .017, .013, .010, eyew, { ...T, gloss: .28 });
      ball(ex + fx * .009, hy + .020, ez2 + fz * .009, .008, .008, .006, dark, { ...T, gloss: .34 });
      cap(hcX + gx * s * .036 + fx * .096, hy + .054, hcZ + gz * s * .036 + fz * .096,
        .006, .040, .006, dark, { ...T, rz: Math.PI / 2, gloss: .10 });
    }
    ball(hcX + fx * .101, hy - .008, hcZ + fz * .101, .014, .025, .014, skin, S);
    cap(hcX + fx * .098, hy - .050, hcZ + fz * .098, .006, .047, .006, lip,
      { ...T, rz: Math.PI / 2, gloss: .18 });
    shade(px + fx * .22, pz + fz * .22, .9, .9, .20);
  }
  // Teal, chosen against the room rather than in isolation: the stools are navy, the shell's
  // customer at the counter is salmon and the tables are oak, and a mauve coat came out pink
  // between them.
  // =============================================================== 8. the steam
  //
  // Three soft balls, and the whole plume budget. They rise, swell and fade on a sine; the tick
  // below writes their scale, height and alpha straight into the matrix that already exists.
  // Two off the machine — one at the wand, one over the group heads — and one off a cup standing
  // on the pickup shelf, which is the one that tells you the drink was made a second ago.
  function wisp(x, y0, z, r0, rise, grow, speed, phase, peak) {
    const p = ball(x, y0, z, r0, r0, r0, col.white,
      { tag: CUP, alpha: .16, mode: 1, glow: .05 });
    CAFE_STEAM.push({ p, y0, rise, r0, grow, speed, phase, peak });
  }
  // Off the jug, not off the wand: the jug's rim is at 1.315 and the steam that a wand makes
  // comes off the milk in it, not off the metal.
  wisp(15.01, 1.38, 7.36, .045, .62, .075, .30, .00, .26);   // the jug       ← translucent 2
  wisp(15.50, 1.34, 7.10, .038, .50, .062, .38, .55, .20);   // the group head ← translucent 3
  wisp(17.45, 1.60, 7.06, .034, .44, .055, .34, .28, .22);   // the pickup cup ← translucent 4

  // A warm pool on the carpet under the seating. A `glow` is not a light — it costs no lamp slot
  // in a hall that only ranks eight — and it is what stops three tables reading as three tables
  // standing on nothing.
  glow(M.trs(16.60, .022, 5.30, 0, 6.6, 1, 3.8), col.warm, .10);

  // =============================================================== 9. what you can ask about
  //
  // The shell already labels 咖啡 at the counter. These two are the fittings this file added, and
  // both carry the tag their props were built with, so the ray that finds the prop finds the word.
  thing(CASE, PX, 1.30, 6.40, '蛋糕和面包都在柜台里。',
    'The cakes and the bread are all in the case.',
    '蛋糕 cake + 面包 bread. 柜台 is the counter or display case.',
    { focus: [PX, 5.60], reach: 2.4 });
  thing(PICK, KX, 1.45, 6.70, '在这里取餐，请稍等。',
    'Collect your order here — one moment please.',
    '取 to collect + 餐 a meal. 稍等 is "wait a moment", said in every shop in China.',
    { focus: [KX, 5.40], reach: 2.2 });
};

// Anything that moves registers here and the shell dispatches it once a frame. Do not start your
// own timer: `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in minutes.
// A tick that throws is dropped for the rest of the run rather than stopping the terminal.
//
// Allocates nothing. `m` is trans · scale with no rotation, so the diameter lives at m[0]/m[5]/
// m[10] and the height at m[13], and both can be written straight in. `cy` and `r` are the cull
// sphere `finish()` derived at build time; a prop that moves without updating them gets culled
// while it is still on screen, which is how a rising plume ends up blinking out at head height.
AirFit['cafe'].tick = (t) => {
  for (let i = 0; i < CAFE_STEAM.length; i++) {
    const w = CAFE_STEAM[i], p = w.p, m = p.m;
    let ph = (t * w.speed + w.phase) % 1;
    if (ph < 0) ph += 1;
    const d = (w.r0 + ph * w.grow) * 2;
    m[0] = d; m[5] = d; m[10] = d;
    m[13] = w.y0 + ph * w.rise;
    p.cy = m[13];
    p.r = d * .8661;
    p.alpha = w.peak * Math.sin(ph * Math.PI);
  }
};
