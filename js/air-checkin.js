// 🧾 Check-in bank — The five-desk 值机 bank, with 小许 at position 2
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    x -8.5 .. -2.0  (landside)
//   camera  D3-checkin
//
// The five-desk 值机 bank, with live flight bars and 小许 at position 2. Hands you the 登机牌
// and your seat.
//
// The camera IS the acceptance test. Render your shot with `node .audit.js D3-checkin`, open the
// PNG, and look at it. A zone whose code boots but whose shot is black, empty, or unchanged has
// not shipped. You own your row(s) in .audit.js and nobody else's.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET — read this before you add anything
//
// The airport draws at ~15.4 ms a frame today (65 fps) with 4,141 props and 376 draw calls.
// Fifteen zones adding freely is how that becomes 30 ms. Your budget is **250 props**, and the
// rules that decide whether a prop is cheap or expensive are not obvious:
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
// Everything below is opaque and stays on the batched path, reusing keys the shell already opened:
//
//     box|0   hard boxes, no material          — the panels, placards and kick strip
//     box|1   hard boxes, mode 1               — the lit strips and the open/closed bars
//     cyl|0 + capsule|0                        — the barrier posts and tag rolls
//     quad|ch|1  glyphs, mode 1                — every character on this bank
//     quad|0  flat(), no mode, no material     — the floor plates and the 一米线
//
// The last one is the only non-obvious one: `flat()` with no `mode` and no `M_*` produces exactly
// the key the hall's grout lines use (airport.js:789), so seventeen floor quads cost nothing.
// Anything here that wants a material would have started a batch of its own; nothing here does.
//
// Check yourself: `node .fpscheck.js airport` must stay under 16.7 ms median. If your zone pushes
// it over, say so in your report rather than shipping it.
//
// ---------------------------------------------------------------------------------------------
// WHAT THIS FILE ADDS, AND WHAT IT DELIBERATELY DOES NOT
//
// The bank itself — the stone counter, the five scales, the screens, the printers, the stools,
// the agents and the numbered signs — is built by the shell, inside `build()` in js/airport.js.
// Wave 0 landed the registry, not the geometry, so this zone **deepens an existing fitting**
// rather than raising one. Nothing below duplicates a prop the shell already pushes; where the
// two meet (the position-5 sign, the position numerals) this file stands its own geometry a few
// centimetres proud of the shell's and lets the depth buffer do the rest.
//
// Everything is placed against the datums restated at the top of the builder. Not one number
// below is measured off a neighbouring zone's geometry.

let CK_A = null;                  // the toolkit, captured for the tick
const CK_BARS = [];               // per position: { p, fl } — the open/closed underlight

AirFit['checkin'] = A => {
  CK_A = A;
  const { box, cyl, glyphs, flat } = A;
  const { C, G, col } = A;

  // ---------------------------------------------------------------- the datums
  // Restated here, never measured off a neighbour. These are the five numbers the shell's own
  // bank is laid out from; if the shell moves the bank, these move with it and nothing else here
  // has to change.
  const CKZ  = A.RZ - 2.30;              // 6.20 — the counter line
  const CKX  = -6.45, CKW = 14.10;       // the bank's centre and its 14 m run
  const DX   = i => -12.0 + i * 2.80;    // the five positions: -12.0 -9.2 -6.4 -3.6 -0.8
  const FASC = CKZ - .70;                // 5.50 — the fascia the queue stands nose to
  const SIGZ = CKZ - .30;                // 5.90 — the plane the overhead signs hang in
  const WALZ = A.RZ - .50;               // 8.00 — the front face of the bank's back wall
  const TAG  = '值机柜台';

  // Which flights each position works. This mirrors the shell's `deskLamp` rule and keeps the
  // domestic/international split truthful: 成都 shares with 海口, while 纽约, 东京 and 曼谷 use 4.
  // Position 5 is the oversize-baggage machine and deliberately has no flight list.
  const deskFlights = i => [[0], [1], [2, 3], [4, 5, 6], []][i];
  // 国内 / 国际. There is no field on a flight that says which it is and no numeric rule that
  // works (曼谷 is five hours and international, 海口 is four and domestic), so it is a table of
  // destination names — the same table a real terminal's signage is cut from.
  const INTL = new Set(['纽约', '东京', '曼谷']);
  const isIntl = i => deskFlights(i).some(k => INTL.has(A.FLIGHTS[k].to));

  // ================================================================ 国内出发 / 国际出发
  // The split, signed where a Chinese terminal actually signs it over a check-in bank: a band on
  // the wall behind the agents, in the clear strip between the tops of their heads and the
  // underside of the position signs.
  //
  // The hall already signs the split once, on the wayfinding gantry at x -11.50, and that one is
  // guidance — it points at the bank from the middle of the floor. This one is the bank itself
  // saying which of its own positions is which, which is a different sentence and the one a
  // passenger standing at the desks needs.
  //
  // Two panels and not three: positions 1—3 are domestic, position 4 is international, and the
  // oversize-baggage sign on position 5 identifies its separate job.
  const band = (x0, x1, accent) => {
    const cx = (x0 + x1) / 2, w = x1 - x0;
    box(cx, 2.30, WALZ - .04, w, .52, .08, col.blueSign, { tag: TAG, hard: true, gloss: .24 });
    // the colour code, in a strip along the bottom edge — the whole point of a split is that it
    // reads before it is read
    box(cx, 2.005, WALZ - .04, w, .05, .08, accent,
      { tag: TAG, hard: true, mode: 1, glow: .20 });
  };
  // Where the two bands meet is read off the schedule, not chosen: it is the midpoint between the
  // last all-domestic position and the first one carrying an international flight. Today that is
  // between positions 3 and 4, at x -5.00. If the schedule is re-cut, the sign moves with it.
  const firstIntl = [0, 1, 2, 3, 4].find(isIntl);
  const SPLIT = firstIntl > 0 ? (DX(firstIntl - 1) + DX(firstIntl)) / 2 : -13.55;
  // The east band stops at x -1.70 because the oversize belt's hood occupies the end of the bank.
  // Its own blade and position sign identify position 5, so the wall band only names desk 4.
  band(-13.55, SPLIT - .20, col.blue);
  band(SPLIT + .10, -1.70, col.jade);
  // the fin on the join, so the two bands are two signs and not one long one
  box(SPLIT - .05, 2.30, WALZ - .05, .09, .60, .10, col.steelD,
    { tag: TAG, hard: true, gloss: .44 });

  // The lettering. House style, off the shell's own gantries: the Chinese large in white, the
  // English half the height under it in the pale blue the hall uses for its second language.
  // A sign face at yaw π is read from the -z side of the hall, and for that viewer **larger x is
  // further left on screen** (facing +z, screen-right is -x — which is why the position signs read
  // 5 4 3 2 1 left to right in every landside shot). Characters inside one `glyphs` run already
  // come out in reading order; two separate runs do not, and the first render of this band had
  // 「1—3号值机柜台 国内出发」 on screen because the heading was placed at the smaller x. So the
  // heading goes at the LARGER x of the pair, and the desk range to its right.
  const sign = (x, y, text, size, gap, c, gl) => {
    for (const g of glyphs(x, y, WALZ - .10, Math.PI, text,
      { size, gap, color: c, mode: 1, glow: gl, tag: TAG })) void g;
  };
  sign(-8.55, 2.36, '国内出发', .30, .09, col.white, .30);
  sign(-8.55, 2.14, 'DOMESTIC', .105, -.028, C('#bcd0e4'), .18);
  sign(-10.60, 2.30, '1—3号值机柜台', .175, .05, col.white, .26);
  sign(-2.65, 2.36, '国际出发', .26, .075, col.white, .30);
  sign(-2.65, 2.13, 'INTERNATIONAL', .09, -.026, C('#bcd0e4'), .18);
  sign(-4.15, 2.30, '4号值机柜台', .15, .045, col.white, .26);

  // ================================================================ the bank, position by position
  for (let i = 0; i < 5; i++) {
    const dx = DX(i);

    // ---- 号. The overhead signs carry a bare numeral, which is the one thing on this bank that
    // was written in no language at all. 「5号」 is what the sign over a Chinese check-in position
    // says, and it costs one glyph. Placed in the gap between the shell's numeral (which ends at
    // dx-0.67) and its 值机 (which starts at dx+0.145).
    for (const g of glyphs(dx - .50, 3.16, CKZ - .36, Math.PI, '号',
      { size: .155, gap: 0, color: col.white, mode: 1, glow: .26, tag: TAG })) void g;

    // Position 5 is the oversize-baggage machine. Its static amber strip distinguishes it from
    // the live green/grey flight desks, and none of the conventional scale hardware below is
    // duplicated inside the conveyor.
    if (i === 4) {
      box(dx, 2.74, SIGZ - .075, 2.30, .06, .04, col.goldL,
        { tag: TAG, hard: true, mode: 1, glow: .16 });
      continue;
    }

    // ---- the open/closed underlight, on the bottom edge of the position sign. Driven from
    // `A.checkinOpen` in the tick below, so the bar under a desk and the row on the departure
    // board are the same fact.
    CK_BARS.push({
      p: box(dx, 2.74, SIGZ - .075, 2.30, .06, .04, col.steelD,
        { tag: TAG, hard: true, mode: 1, glow: .05 }),
      fl: deskFlights(i),
    });

    // ---- the position number at queue height, on the front of the scale housing.
    //
    // It was on the fascia first, and that was wrong in a way only measurement catches: the
    // shell's belt scale stands at CKZ-0.95 and is 0.78 deep and 0.60 tall, so it covers the
    // fascia from z 4.86 to 5.64 across the whole width of every position. A numeral on the
    // fascia at that height is not a subtle overlap — it is entirely inside another prop, and it
    // would have rendered as nothing at all with no error anywhere. The scale's own front face is
    // the surface the queue actually looks at, and is where the number belongs.
    for (const g of glyphs(dx, .36, CKZ - 1.37, Math.PI, String(i + 1),
      { size: .30, gap: 0, color: col.deskD, mode: 1, glow: 0, tag: TAG })) void g;

    // ---- the scale, set into the floor. The shell stands its belt scale proud of the floor on
    // the passenger side, which is right, but a scale in a terminal sits in a recess with the
    // floor made good around it. The plate and its two yellow edge strips are what that recess
    // reads as from standing height.
    flat(dx, .010, CKZ - .95, 1.62, 1.14, col.grout, { gloss: .12, tag: TAG });
    for (const s of [-1, 1])
      flat(dx, .012, CKZ - .95 + s * .55, 1.62, .05, col.yellow, { gloss: .12, tag: TAG });

    // ---- 行李条 the bag-tag printer, deepened. The shell builds the machine, the slot, the ready
    // lamp and one printed tag curling out of it. What was missing is the thing the machine eats:
    // a roll of tag stock on top of it and a tray of printed tags beside it. A printer with no
    // consumable in sight is a white box with a lamp on.
    cyl(dx + .50, 1.35, CKZ + .30, .055, .20, col.cream,
      { tag: TAG, rz: Math.PI / 2, gloss: .20 });
    cyl(dx + .50, 1.35, CKZ + .30, .022, .215, col.charcoal,
      { tag: TAG, rz: Math.PI / 2, gloss: .30 });
    box(dx + .86, 1.145, CKZ + .24, .22, .05, .26, col.slab,
      { tag: TAG, hard: true, gloss: .24 });
    box(dx + .86, 1.185, CKZ + .24, .19, .03, .22, col.white,
      { tag: TAG, hard: true, gloss: .16 });

    // ---- the ID reader, on the passenger's edge of the counter. 值机 in China is 身份证 first
    // and booking second, and there was nothing on this counter for a passenger to put anything
    // on.
    box(dx - .16, 1.16, CKZ - .42, .17, .07, .13, col.charcoal,
      { tag: TAG, hard: true, gloss: .30 });
    box(dx - .16, 1.196, CKZ - .42, .12, .01, .09, C('#7fd8c4'),
      { tag: TAG, hard: true, mode: 1, glow: .26 });
  }

  // ---- the fascia's two continuous runs, built once across the whole 14 m rather than per
  // position, because that is how the panel is actually made.
  box(CKX, .06, FASC - .045, CKW, .12, .04, col.charcoal,
    { tag: TAG, hard: true, gloss: .18 });
  box(CKX, .72, FASC - .045, CKW, .045, .03, col.blueSign,
    { tag: TAG, hard: true, mode: 1, glow: .16 });

  // ================================================================ 一米线 the one-metre line
  // The yellow line a Chinese queue waits behind, 0.95 m off the fascia. Two runs with a gap in
  // the middle, which is where people actually cross it.
  flat(-10.05, .014, CKZ - 1.75, 6.90, .11, col.yellow, { gloss: .12 });
  flat(-2.80, .014, CKZ - 1.75, 6.80, .11, col.yellow, { gloss: .12 });

};

// Anything that moves registers here and the shell dispatches it once a frame. Do not start your
// own timer: `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in minutes.
// A tick that throws is dropped for the rest of the run rather than stopping the terminal.
//
// The one live thing in this zone is which positions are working. It is read off
// `A.checkinOpen` — never off a clock of this file's own — so the bar under a desk and the row on
// the departure board cannot disagree. No geometry moves: only the colour and the glow of five
// props change, and both of those travel per instance, so this costs nothing in draw calls.
AirFit['checkin'].tick = (t, body, clock) => {
  if (!CK_A || typeof clock !== 'number') return;
  for (const b of CK_BARS) {
    const on = b.fl.some(k => CK_A.checkinOpen(CK_A.FLIGHTS[k], clock));
    b.p.color = on ? CK_A.col.lime : CK_A.col.steelD;
    b.p.glow = on ? .34 : .05;
  }
};
