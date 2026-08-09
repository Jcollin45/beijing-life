// 📋 Departure board — The live 7x6 departure matrix
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    the -x wall  (landside)
//   camera  D4-flights
//
// The live 7x6 departure matrix. Reads A.statusOf / A.gateOf every time — MUST NOT cache a copy:
// the board and the loudspeaker are forbidden from disagreeing (airport.js:104).
//
// The camera IS the acceptance test. Render your shot with `node .audit.js D4-flights`, open the
// PNG, and look at it. A zone whose code boots but whose shot is black, empty, or unchanged has
// not shipped. You own your row(s) in .audit.js and nobody else's.
//
// ---------------------------------------------------------------------------------------------
// WHAT THIS FILE BUILDS, AND WHY IT IS NOT THE MATRIX ITSELF
//
// Wave 0 landed the AirFit registry but did NOT carve the board's geometry out of the shell: the
// seven-row matrix, its header row, its clock and its 航班信息 title are still built inside
// `build()` at js/airport.js:1682-1742, and `setBoard` at :2872 still writes them. That file is
// the Mech's alone, so this zone cannot move them and must not draw a second copy of them —
// two seven-row matrices a metre apart on the same wall is not a departure board, it is a bug.
//
// So this zone builds the half of the bay the shell never had, and the half that is worth more
// to this particular game:
//
//   * the 出发 · DEPARTURES fascia over the case. The bank had no departures title at all — its
//     only heading is 航班信息, which names the medium and not the traffic. Every gantry in this
//     hall is bilingual (`gantry`, airport.js:669) and the head of a departures bank is the one
//     sign in a terminal that always is.
//   * the repeater panel under the case: the same seven services, read out in the Latin the big
//     board cannot spare the room for. 上海 is on the wall above in characters and Shanghai is on
//     the wall below in letters, on the same row of the same fixture, which is the only place in
//     the terminal a player can learn the pairing without stopping to click on something.
//
// Its three live columns — time, gate, status — go through A.statusOf / A.gateOf on every
// refresh and hold no copy of either between refreshes. See `paint` and `tick` at the bottom.
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

AirFit['board'] = A => {
  const { box, glyphs, solid } = A;
  const { C, col } = A;

  // ---- the bay, restated from the shell rather than measured off it (AIRPORT.md, the contract).
  // The shell hangs its case at FX + .10 with a .28 skin, so its face is at FX + .24 and it writes
  // on the plane FX + .30. Everything here shares that plane, because two screens on one wall
  // written at two different stand-offs read as one screen that is coming loose.
  const FX = -A.RX + .20;          // -21.80 — the shell's own datum for this wall
  const FZ = -.05;                 // the case centre in z; the case is 7.40 long
  const FACE = FX + .30;           // the plane every character on this wall is written on
  const CASE_Z = 7.40;

  // ---- every character these panels can ever show.
  //
  // The atlas is laid out once at startup out of whatever the scenes asked for, and a rewritable
  // slot resolves its cell at draw time — so a character that only appears when a flight is
  // cancelled has to be registered here or the slot draws a blank quad instead. The shell's own
  // preload (airport.js:260) covers uppercase Latin and the digits; it does not cover lowercase,
  // and every word on this panel is lowercase.
  Glyphs.need('abcdefghijklmnopqrstuvwxyz'
    + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:'
    + '出发');

  // ---- rewritable text that BATCHES.
  //
  // Deliberately not the shell's `slots` (airport.js:302), which is otherwise the same idea. That
  // one parks an unused slot by setting `alpha = 0`, and `Build.finish` decides batch membership
  // by reading `p.alpha` once, at build time: anything under .999 is pushed out of the instanced
  // path for good and drawn one call at a time, for ever, even after the setter raises it back to
  // 1. The shell's two boards spend 173 draw calls that way — see the ticket in the report.
  //
  // These stay opaque and hide by collapsing their matrix to a point instead. A zero-area quad
  // rasterises nothing, costs no call of its own, and keeps every character on this wall inside
  // the one glyph batch the shell's static lettering is already in.
  const NOWHERE = M.scale(0, 0, 0);
  function slots(x, y, z, yaw, n, o) {
    const size = o.size, gap = o.gap === undefined ? .04 : o.gap;
    const step = size + gap, lift = .012;
    const ax = Math.cos(yaw), az = -Math.sin(yaw);
    const at = i => (i - (n - 1) / 2) * step;
    // Built spread out at full width, not stacked on the column centre: the cull sphere each prop
    // is tested against is frozen from the matrix it was built with (build.js, `b.cull`), so a
    // slot built at the centre and drawn at the edge is a character that vanishes at frame edges.
    // Built at full width and LEFT THERE. Collapsing them here to blank the panel until the first
    // tick is the one thing that must not happen: `Build.finish` freezes each prop's cull sphere
    // out of whatever matrix it is holding at build time (build.js, `b.cull`), so a slot collapsed
    // before the freeze is recorded as a zero-radius point at the world origin and the cull drops
    // it for the rest of the run. It still holds the right character, it still reports the right
    // text to a probe, and it is never drawn again — which cost this zone three renders to find.
    //
    // Collapsing at RUN time is fine, and is what `set` does below: the cull array is already
    // frozen from the good matrix, so a blanked slot stays cull-eligible and simply rasterises
    // nothing. Only the build-time state matters.
    //
    // They therefore start showing a placeholder, inked in the screen's own colour so it cannot be
    // read, and the first tick — which game.js runs before it draws (game.js:8150 against :8305) —
    // overwrites both the character and the colour.
    const ps = [];
    for (let i = 0; i < n; i++)
      ps.push(glyphs(x + ax * at(i), y, z + az * at(i), yaw, '0',
        { ...o, gap: 0, color: A.col.board })[0]);
    return set;
    function set(str, color) {
      const txt = String(str === undefined || str === null ? '' : str).slice(0, n);
      for (let i = 0; i < n; i++) {
        const p = ps[i];
        if (i >= txt.length || txt[i] === ' ') { p.m = NOWHERE; continue; }
        p.ch = txt[i];
        if (color) p.color = color;
        const t = (i - (txt.length - 1) / 2) * step;
        p.m = M.mul(M.trans(x + ax * t, y, z + az * t), M.mul(M.rotY(yaw),
          M.mul(M.trans(0, 0, lift), M.mul(M.rotX(Math.PI / 2), M.scale(size, 1, size)))));
      }
    }
  }

  // ============================================================ 出发 the fascia
  // Over the case, under the ceiling. Navy, because that is the colour this terminal signs in —
  // the gantries, the desk headers and the pier signs are all col.blueSign / col.navy, and a
  // departures head in any other colour is a poster somebody hung on an airport wall.
  box(FX + .10, 5.50, FZ, .28, .52, CASE_Z, col.navy, { tag: '航班信息', hard: true, gloss: .24 });
  // Reading this wall means looking -x, and looking -x puts +z on your left: the Chinese leads
  // and the Latin follows it to the right, the same order the gantries use.
  glyphs(FACE, 5.52, 2.55, Math.PI / 2, '出发',
    { size: .30, gap: .09, color: col.white, mode: 1, tag: '航班信息' });
  glyphs(FACE, 5.48, 1.06, Math.PI / 2, 'DEPARTURES',
    { size: .155, gap: -.046, color: C('#bcd0e4'), mode: 1, tag: '航班信息' });

  // ============================================================ the repeater panel
  // Flush under the shell's case, which ends at y 2.00, and down to shin height. Low on purpose:
  // the big board's rows sit between 2.38 and 4.06 and are read across the hall, this one is read
  // standing in front of it, and the two jobs want two different sizes of letter.
  box(FX + .10, 1.36, FZ, .28, 1.28, CASE_Z, col.charcoal,
    { tag: '航班信息', hard: true, gloss: .28 });
  box(FX + .26, 1.36, FZ, .04, 1.10, 7.05, col.board,
    { tag: '航班信息', hard: true, mode: 1, glow: .05 });
  // A screen at head height is a thing you can walk your face through. The shell's board is four
  // metres up and never needed one of these; this one does.
  solid(-A.RX, FX + .26, FZ - CASE_Z / 2, FZ + CASE_Z / 2);

  // ---- the columns. Five, evenly spread, each one carrying something the panel above cannot:
  // the flight in Latin, the destination in Latin, the time it is actually going, the gate it is
  // going from, and what it is doing — the last three live.
  const MZ = [2.86, 1.42, -.02, -1.50, -2.98];
  // Abbreviated, and for a reason worth writing down: a heading is one prop per letter, and
  // 'DESTINATION' + 'DEPARTS' spent ten of this zone's 250 props saying what the column under it
  // already says. The characters go to the seven rows, which are the thing anyone reads.
  const HEAD = ['FLIGHT', 'DEST', 'TIME', 'GATE', 'STATUS'];
  const SZ = .10, LGAP = -.034;              // Latin ink fills about half its cell; close it up
  const DIM = C('#8fa2b4');

  HEAD.forEach((h, i) => glyphs(FACE, 1.82, MZ[i], Math.PI / 2, h,
    { size: .072, gap: -.024, color: DIM, mode: 1, tag: '航班信息' }));

  // One row per service. The first two columns are painted once and never rewritten — a flight
  // number and a destination are the two things about a service that cannot change — so they are
  // plain glyphs rather than slots, which is 88 fewer props than a slot run wide enough for
  // Guangzhou would have cost.
  const rowY = i => 1.64 - i * .125;
  const live = [];
  A.FLIGHTS.forEach((f, i) => {
    const y = rowY(i);
    glyphs(FACE, y, MZ[0], Math.PI / 2, f.no,
      { size: SZ, gap: LGAP, color: col.boardOn, mode: 1, tag: '航班信息' });
    glyphs(FACE, y, MZ[1], Math.PI / 2, f.en,
      { size: SZ, gap: LGAP, color: col.white, mode: 1, tag: '航班信息' });
    // `color` is not optional on a slot: the instanced packer reads p.color[0..2] straight out of
    // the prop every frame (game.js:8399) and an undefined one throws inside the draw loop, which
    // is a black terminal and a stack trace with no scene name on it.
    const S = { size: SZ, gap: LGAP, color: DIM, mode: 1, tag: '航班信息' };
    live.push({
      at: slots(FACE, y, MZ[2], Math.PI / 2, 5, S),
      gt: slots(FACE, y, MZ[3], Math.PI / 2, 3, S),
      st: slots(FACE, y, MZ[4], Math.PI / 2, 9, S),
    });
  });

  // ---- what the shell's seven status codes are called in English.
  //
  // Keyed on `code` and not on `en`, because `statusOf().en` is written for the countdown chip and
  // runs to 'delayed 65 min' — fourteen characters in a column that has room for nine. `off` and
  // `gone` collapse to one word here for the same reason they collapse to 起飞 on the board above:
  // from the concourse, a flight rolling and a flight gone are the same news.
  const EN = { ok: 'on time', late: 'delayed', board: 'boarding', shut: 'closed',
               off: 'departed', gone: 'departed', cancel: 'cancelled' };

  const hhmm = m => {
    const w = ((Math.round(m) % 1440) + 1440) % 1440;
    return String(Math.floor(w / 60)).padStart(2, '0') + ':' + String(w % 60).padStart(2, '0');
  };

  // ---- the only place this panel gets its facts.
  //
  // Every value written below is read from A.statusOf / A.gateOf inside this call. Nothing is kept
  // between calls — `sig` below is a change *detector* and is itself rebuilt from live reads —
  // because a gate the loudspeaker has moved and the board has not is the one failure of this
  // zone that a still photograph cannot show (AIRPORT.md, "what must not break").
  function paint(mins) {
    A.FLIGHTS.forEach((f, i) => {
      const s = A.statusOf(f, mins), r = live[i];
      // The time it is actually going, which is what the airside board shows too (airport.js:2568)
      // and what a passenger standing here needs. The scheduled time is on the wall above, in the
      // 计划 column, where it belongs.
      r.at(hhmm(f.dep + f.late), f.late ? col.rose : col.boardOn);
      r.gt(A.gateOf(f, mins), C('#c8d4de'));
      // s.col, so this row and the 状态 cell directly above it are the same colour by construction
      // rather than by two tables agreeing with each other.
      r.st(EN[s.code] || s.en, s.col);
    });
  }

  // Hidden until the first tick rather than painted with a guess: the clock is not known at build
  // time, and a board showing 00:00 for one frame is a board that lied once.
  AIR_BOARD.paint = paint;
  AIR_BOARD.A = A;
};

// Anything that moves registers here and the shell dispatches it once a frame. Do not start your
// own timer: `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in minutes.
// A tick that throws is dropped for the rest of the run rather than stopping the terminal.
const AIR_BOARD = { paint: null, A: null, min: -1, sig: '' };

// Refreshed WHEN IT CHANGES, not every frame. Seven rows rewritten sixty times a second to say
// what they already said is the street's stall-matrix mistake, and the fix is the street's: gate
// on the minute first, because nothing on this panel can move inside one game minute, then on a
// signature built out of the live reads themselves. That is roughly thirty rewrites in a game day
// against the 5,000-odd a per-frame repaint would do, and the signature is what makes it thirty
// rather than 1,440.
//
// The signature holds status CODES, not the status objects — it exists to answer "has anything
// changed", never to answer "what does it say". The answer to the second question is only ever
// read out of A.statusOf, in `paint`, at the moment of painting.
AirFit['board'].tick = (t, body, clock) => {
  const R = AIR_BOARD;
  if (!R.paint || typeof clock !== 'number') return;
  const m = Math.floor(clock);
  if (m === R.min) return;
  R.min = m;
  let sig = '';
  for (const f of R.A.FLIGHTS)
    sig += R.A.statusOf(f, clock).code + R.A.gateOf(f, clock) + (f.late | 0) + ';';
  if (sig === R.sig) return;
  R.sig = sig;
  R.paint(clock);
};
