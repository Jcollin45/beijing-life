// 🛫 Ticket hall — 售票处 — 陈姐's window, the speak-hole, the queue rails
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    x -16.0 .. -12.0  (landside)
//   camera  DA-tickets
//
// 售票处 — 陈姐's window, the speak-hole, the queue rails. Where you buy the 机票, so this is the
// head of the boarding chain.
//
// The camera IS the acceptance test. Render your shot with `node .audit.js DA-tickets`, open the
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
// WHAT THIS FILE ADDS, AND WHAT IT DELIBERATELY DOES NOT
//
// The counter itself is still the shell's (js/airport.js, "售票处 the ticket office"): the stone
// desk, the glazed upper screen, the two mullions, the speak-hole, the document dish, the 售票处
// fascia, the two stanchion runs and 陈姐's collider. Wave 0 landed it there and this zone does
// not restate a millimetre of it — a second counter in the same coordinates is how you get two
// desks depth-fighting into one grey smear, which is the failure mode the shell's own comment
// about 陈姐 records falling into once already.
//
// So everything below is the layer the shell left out: the things that make a ticket window a
// *transaction* rather than a piece of furniture. In the order they matter to a passenger:
//
//   1. 票价表 — the backlit fare board. Seven routes, each with its city, its one-way fare and
//      its flight time, read straight off A.FLIGHTS so the board and the schedule can never
//      disagree. This is the one thing in the room that answers "how much?", which is the only
//      question a ticket office exists to answer, and until now the hall had no answer anywhere.
//   2. The three window plates and their status lamps. A counter with three panes and no numbers
//      is a counter you cannot be directed to; 请到二号窗口 means nothing without a 二号窗口.
//   3. The 取号/叫号 pillar — take a number, watch it called. Every Chinese ticket hall, bank and
//      clinic runs on this and none of the game's counters had one.
//   4. The 一米线 and its placard. The single most Chinese piece of queue furniture there is.
//   5. The working surface: the tray under the glass given a lip and a ticket lying in it, the
//      card reader on the customer side, the forms, the stamp, the pen on its chain.
//
// WHERE THE FLOOR ACTUALLY IS. Two shell colliders decide this zone's walkable space and neither
// is obvious from the geometry:
//
//     ticket   solid(-16.40, -12.00,  6.98, 8.50)     airport.js:1410
//     check-in solid(-13.70,   0.80,  4.80, 8.50)     airport.js:1553
//
// The check-in bank's collider reaches west to x -13.70, so the approach to 陈姐's window is not
// the full counter frontage — it is the pocket x -16.40 .. -13.70, z 4.80 .. 6.98. clampMove
// inflates every box by the 0.30 m body radius, so the honest free run is x -16.40 .. -14.00.
// The 取号 pillar is placed at x -15.75 precisely because that leaves 1.23 m of clear lane beside
// it, and the shell's own `thing('售票处')` focus at (-14.20, 5.76) unblocked. Measured, not eyed.
//
// WHERE THE CAMERA ACTUALLY LOOKS. DA-tickets is FOV 0.95 at 1280x800, orbiting (-14.2, 6.3) —
// the eye ends up around z 2.30 looking +z. Two consequences that set nearly every height below:
//
//   * The 售票处 fascia (y 2.95..3.65 at z 7.40) hides the back wall below about y 3.97. The wall
//     band from there to the top of frame is the only place a full-width board can go, which is
//     why 票价表 sits at y 3.94..4.86 and not at the eye level a poster would want.
//   * Anything nearer than z ≈ 4.0 is inside 1.7 m of the lens and fills the frame. Nothing in
//     this zone is built forward of the pillar at z 4.55 for that reason; the near floor is left
//     as floor.
//
// The row's pitch/lookY were retuned once (0.06 -> 0.02, 1.80 -> 2.00) to bring that wall band
// into frame. Same subject, same distance, same yaw — it just stops cropping the board.
//
// ---------------------------------------------------------------------------------------------

AirFit['ticket'] = A => {
  const { box, cyl, ball, cap, glyphs, solid, thing, shade } = A;
  const { C, G, col } = A;
  const { M_METAL } = A;

  // The shell's datums, restated rather than re-derived. These are read off js/airport.js:1355
  // and nothing here may move them: TX is the counter centre, TC the counter's z, and the room's
  // +z wall stands at RZ.
  const TX = -14.20, TC = 7.26, WZ = A.RZ;

  // Cylinders that want to batch with the shell's forty stanchions have to match its material
  // exactly — mat, matScale and all. `{ gloss: G.metal, ...M_METAL, matScale: 1.20 }` is the
  // literal option bag queueLine uses (airport.js:402); the 取号 pillar's pole and the card
  // reader's stalk join that batch instead of opening two more.
  const RAIL = { gloss: G.metal, ...M_METAL, matScale: 1.20 };
  // Painted sign faces, screens and trim. `hard: true` keeps the silhouette machined rather than
  // rounded and `mode: 1` is the flat, unbevelled surface every board in this building uses, so
  // the whole zone's signage is one batch.
  const SIGN = { hard: true, mode: 1 };

  // Live text. The shell's `slots` is not on the toolkit, and this zone does not need its full
  // generality: every string it writes is a fixed length, so there is no blanking to do and none
  // of the alpha-0 placeholder props that would each cost a translucent draw call. Build the
  // glyphs once with a representative string — glyph advance is uniform, so the positions are
  // already right for any other string of the same length — and swap `ch` on the props.
  //
  // The atlas is laid out once at startup from whatever was asked for, so a digit that is never
  // built is a cell that does not exist and `rect` has nothing to resolve at draw time. Asking
  // for the whole set up front is the fix, and it costs nothing: `need` registers characters, it
  // does not draw them.
  if (typeof Glyphs !== 'undefined') Glyphs.need('A0123456789');
  const live = ps => {
    let cur = null;
    return s => {
      if (s === cur) return;
      cur = s;
      for (let i = 0; i < ps.length && i < s.length; i++) ps[i].ch = s[i];
    };
  };

  // =============================================================== 票价表 the fare board
  //
  // A backlit lightbox on the back wall above the counter, which is where a Chinese ticket hall
  // puts its 票价表 and — as it happens — the only wall this counter leaves free.
  //
  // Seven columns, one per flight, each carrying the three facts a fare board carries: where,
  // how much one way, and how long. All three come off A.FLIGHTS. Nothing here is a number typed
  // into this file, because the board on the -x wall, the loudspeaker and this board are the same
  // schedule seen from three places and the hall's whole claim on the player is that they agree.
  //
  // `mode: 1` with a standing `glow` rather than the shell's `litten`, which is not on the
  // toolkit: a lightbox is backlit around the clock, so a constant emission is not a shortcut
  // here, it is what the fitting is.
  // y 4.52, and the twelve centimetres it was raised by came off the first render rather than off
  // a calculation. The 售票处 fascia hides the wall below y 3.95 and the board's footer strip sat
  // at 3.94..4.07 — half of 退票改签请到二号窗口 was behind the sign above the counter. The band
  // between that occlusion line and the top of frame at 5.18 is 1.23 m and the board is 0.92, so
  // there is room to sit clear of both, but only if you put it there deliberately.
  const BX = 8.385;                       // the board face; the wall itself is at WZ, 8.50
  box(TX, 4.52, WZ - .045, 4.40, 1.06, .11, col.steelD, { hard: true, gloss: G.metal });
  box(TX, 4.52, BX, 4.20, .92, .04, col.board, { ...SIGN, glow: .07 });
  box(TX, 4.875, 8.360, 4.20, .17, .03, col.blueSign, { ...SIGN, glow: .05 });
  box(TX, 4.125, 8.360, 4.20, .13, .03, C('#16283f'), { ...SIGN, glow: .04 });

  const GZ = 8.340, PI = Math.PI;
  glyphs(TX, 4.875, GZ, PI, '航线 · 单程票价', {
    size: .115, gap: .028, color: col.white, mode: 1, tag: '票价表' });
  glyphs(TX, 4.125, GZ, PI, '退票改签请到二号窗口', {
    size: .092, gap: .020, color: C('#a8c4e0'), mode: 1, tag: '票价表' });

  // Seven columns at a 0.585 m pitch, EARLIEST DEPARTURE ON THE LEFT — and getting that right is
  // not a matter of laying them out in index order. At yaw 0 the camera's right vector is -x
  // (game.js: `cam.right = [-cos(yaw), 0, sin(yaw)]`), so the +x axis runs to screen LEFT and a
  // board written with increasing x reads backwards. The first render of this zone had 上海, the
  // 08:20, sitting at the right-hand end under a header that reads left to right. `(3 - i)` is the
  // mirror that fixes it; the shell's own departure board carries the same warning in prose
  // ("looking -x puts +z on your left") and the window plates below need the identical treatment.
  //
  // The widest fare is 5800元 at five characters. Digits are drawn in a narrower cell than a 汉字,
  // so a positive gap between them reads as five separate numbers rather than one price — hence
  // the negative gap on the fare row only, which is what the departure board does with its times.
  const FL = A.FLIGHTS.slice(0, 7);
  FL.forEach((f, i) => {
    const cx = TX + (3 - i) * .585;
    // 国内 white, 国际 gold. Colour is per instance and therefore free, and the domestic /
    // international split is the first thing a Chinese departures hall tells you about itself.
    const intl = f.hrs >= 5 || f.price >= 1900;
    glyphs(cx, 4.645, GZ, PI, f.to, {
      size: .155, gap: .028, color: intl ? col.goldL : col.white, mode: 1, tag: '票价表' });
    glyphs(cx, 4.445, GZ, PI, f.price + '元', {
      size: .115, gap: -.022, color: col.amber, mode: 1, tag: '票价表' });
    glyphs(cx, 4.290, GZ, PI, f.hours, {
      size: .088, gap: .008, color: C('#93a6b8'), mode: 1, tag: '票价表' });
    if (i < 6)
      box(TX + (i - 2.5) * .585, 4.46, 8.352, .014, .40, .02, C('#2a3542'), SIGN);
  });

  thing('票价表', TX, 4.52, 8.30, '去上海的机票多少钱？',
    'How much is a ticket to Shanghai?',
    '票价 fare. 单程 one way, 往返 return. 元 is the written yuan; 块 is what you say.',
    { focus: [-15.00, 6.30], reach: 3.0 });

  // =============================================================== 窗口 the three positions
  //
  // The counter is glazed in three bays — the shell's panes sit at TX-1.55, TX and TX+1.55 — and
  // until now none of them had a number. That is not decoration: 叫号 calls you to a numbered
  // window, the fare board sends 退票改签 to a numbered window, and neither instruction means
  // anything against three identical sheets of glass.
  //
  // Numbered left to right as you face them, which — see the fare board above — means `(1 - i)`
  // and not `(i - 1)`: +x is screen left at this yaw, so the obvious ordering hangs 3·2·1 across
  // a counter and quietly makes every 请到N号窗口 in the room point the wrong way.
  //
  // Position 1 is shut, which is the honest state of a three-window ticket office at ten in the
  // morning and gives the row its red lamp. 陈姐 works the middle bay, which is the one the
  // shell's two stanchion runs already point at, and the one the fare board's footer and the
  // 叫号 pillar both name as open.
  //
  // y 2.895 is a measured gap, not a chosen one: the glass tops out at 2.83 and the fascia starts
  // at 2.95, so a 0.13 m plate is the tallest thing that fits between them without burying its
  // own lettering behind either.
  const OPEN = [false, true, true];
  ['1号窗口', '2号窗口', '3号窗口'].forEach((label, i) => {
    const px = TX + (1 - i) * 1.55;
    box(px, 2.895, 7.290, .74, .13, .035, col.blueSign, { ...SIGN, glow: .05 });
    // Label to the left of the plate, lamp to its right, as read on screen — and since screen
    // right is -x here, that is `+ .09` for the text and `- .285` for the lamp, not the other
    // way about. Written the obvious way round it hangs every lamp on the wrong side of its
    // own number.
    glyphs(px + .09, 2.895, 7.268, PI, label, {
      size: .082, gap: .012, color: col.white, mode: 1, tag: '售票处' });
    // z 7.245, and the 2 cm it came forward by is the difference between a lamp and a crescent.
    // The plate's front face is at 7.2725 and the lamp was centred on 7.265 with a 0.022 depth,
    // so half the disc was inside the plate and what rendered was a fingernail of light. Anything
    // that reads as a disc has to clear the surface it is mounted on by more than its own radius
    // in z, not be flush with it.
    //
    // Saturated green rather than col.lime: at glow .55 a pale mint (#7fe0a4) clips to white and
    // the open/shut distinction the whole row exists for stops being a colour at all.
    cyl(px - .285, 2.895, 7.245, .038, .022, OPEN[i] ? C('#3fd07a') : C('#e0553f'),
      { rx: PI / 2, mode: 1, glow: .42 });
  });

  // The card in the shut window. A closed position in China is a printed sign propped in a wire
  // stand on the counter, not a dark screen.
  //
  // x -13.25 is picked out of a narrow slot and every neighbour in it belongs to somebody else:
  // the shell parks a charcoal block on the counter at -12.65, its west mullion stands at -13.40,
  // and the check-in bank's own westmost desk screen sits at -12.58 z 6.50, close enough to the
  // camera to eclipse anything behind it. -13.25 clears the block, sits in front of the mullion
  // rather than inside it, and the sightline to it passes -13.36 at the screen's depth.
  box(-13.25, 1.200, 7.040, .09, .07, .07, col.steelD, { hard: true, gloss: G.metal });
  box(-13.25, 1.370, 7.020, .40, .28, .016, col.white, { ...SIGN, gloss: .12 });
  box(-13.25, 1.485, 7.014, .40, .045, .014, C('#c0392b'), SIGN);
  glyphs(-13.25, 1.360, 7.008, PI, '暂停服务', {
    size: .068, gap: .012, color: C('#8a2b20'), mode: 1, tag: '售票处' });

  // =============================================================== the working surface
  //
  // Small, and none of it legible from the camera — which is the point. The shell's counter is
  // correct and completely idle: a stone slab, a screen and a chrome dish with nothing on it.
  // What makes a window look worked at is the litter of the transaction, so the dish gets a lip
  // and a ticket lying in it, the customer's side gets the card reader every Chinese counter has
  // had for a decade, and the clerk's side gets forms, a stamp and a pen on a chain.
  //
  // Everything sits between x -14.7 and -13.5, which is the clear run of counter top the shell
  // leaves between its two charcoal blocks and clear of the mullion at TX+0.80.

  // The dish under the glass, given three sides so it reads as a recessed tray rather than a
  // chrome tile, and a ticket lying in it mid-transaction.
  box(TX - .245, 1.175, 7.140, .028, .07, .30, col.chrome, { hard: true, gloss: G.metal });
  box(TX + .245, 1.175, 7.140, .028, .07, .30, col.chrome, { hard: true, gloss: G.metal });
  box(TX, 1.175, 7.285, .52, .07, .028, col.chrome, { hard: true, gloss: G.metal });
  box(TX - .03, 1.185, 7.110, .21, .005, .105, col.white, { ...SIGN, ry: .20 });

  // The card reader, on a short stalk on the customer's side of the glass so it faces out.
  box(-14.62, 1.200, 7.060, .13, .07, .12, col.charcoal, { hard: true, gloss: .30 });
  cyl(-14.62, 1.300, 7.060, .014, .20, col.steelD, RAIL);
  box(-14.62, 1.440, 7.045, .17, .13, .05, col.charcoal, { hard: true, gloss: .30, rx: -.35 });
  box(-14.62, 1.445, 7.019, .13, .09, .01, C('#20404f'), { ...SIGN, glow: .18, rx: -.35 });

  // Forms, stamp and pen. The stack is three sheets at three slightly different angles, which
  // costs nothing — `ry` is per instance — and is the difference between paper and a block.
  for (let i = 0; i < 3; i++)
    box(-13.92, 1.190 + i * .006, 7.120, .23, .005, .17, col.cream,
      { ...SIGN, ry: (i - 1) * .035 });
  box(-13.62, 1.185, 7.200, .11, .04, .09, col.charcoal, { hard: true, gloss: .22 });
  cyl(-13.62, 1.245, 7.200, .028, .08, col.oak, { gloss: G.wood });
  ball(-13.62, 1.300, 7.200, .032, .022, .032, col.oak, { gloss: G.wood });
  cyl(TX + .42, 1.185, 7.090, .007, .125, col.navy, { rz: PI / 2, gloss: .42 });
  cap(TX + .30, 1.175, 7.160, .006, .22, .006, col.steelD,
    { ry: -.80, rx: PI / 2, gloss: G.metal });

  // =============================================================== 取号 · 叫号 the queue pillar
  //
  // Take a number from the slot, watch it called on the screen above. Chinese ticket halls, banks
  // and clinics all run on this and not one counter in the game had it, which is why every queue
  // in the game is a line of people rather than a room of people sitting down.
  //
  // (-16.05, 6.00): hard against the west stanchion run and just short of the 一米线 at z 6.10,
  // which is where you actually meet one — you step up, take a number, and go back behind the
  // line to wait. Three constraints picked it and all three were measured:
  //
  //   * Collider. solid inflates to [-16.57, -15.53] x [5.46, 6.54], leaving 1.53 m of clear lane
  //     between it and the check-in bank's inflated west edge at -14.00, and leaving the shell's
  //     售票处 focus at (-14.20, 5.76) untouched.
  //   * Sightline. The ray from the camera to the west window plate passes x -15.35 at this
  //     depth and the housing spans -16.35..-15.75, so the pillar hides none of the counter.
  //   * Frame. At 3.9 m out on a 26.6° bearing it lands at 78% of half-width — fully inside the
  //     shot. The first pass put it at (-15.75, 4.55), 2.6 m from the lens on a 34.6° bearing,
  //     and the live number display ran off the right-hand edge of the picture.
  const PX = -16.05, PZ = 6.00, FZ = PZ - .105;
  cyl(PX, .035, PZ, .21, .07, col.charcoal, { gloss: .26 });
  cyl(PX, .740, PZ, .075, 1.44, col.steelD, RAIL);
  box(PX, 1.730, PZ, .60, .62, .17, col.charcoal, { hard: true, gloss: .28 });
  box(PX, 1.745, PZ - .090, .52, .50, .02, col.board, { ...SIGN, glow: .07 });
  glyphs(PX, 1.930, FZ, PI, '叫号', {
    size: .075, gap: .020, color: C('#8fa2b4'), mode: 1, tag: '取号机' });
  // The two live rows. Built with a representative string so the atlas and the spacing are
  // already right; the tick only ever swaps `ch`.
  const noRow = glyphs(PX, 1.775, FZ, PI, 'A042', {
    size: .135, gap: -.030, color: col.lime, mode: 1, tag: '取号机' });
  const winRow = glyphs(PX, 1.615, FZ, PI, '请到2号窗口', {
    size: .072, gap: .012, color: col.white, mode: 1, tag: '取号机' });

  // The dispenser below it: screen, button, slot, and a ticket half out of the slot.
  box(PX, 1.060, PZ - .010, .36, .42, .24, col.wallD, { hard: true, gloss: .24 });
  box(PX, 1.160, PZ - .135, .26, .13, .02, C('#12301f'), { ...SIGN, glow: .05 });
  glyphs(PX, 1.160, PZ - .155, PI, '取号', {
    size: .070, gap: .015, color: col.lime, mode: 1, tag: '取号机' });
  cyl(PX, .970, PZ - .142, .038, .022, C('#d8b33a'), { rx: PI / 2, mode: 1, glow: .35 });
  box(PX, .885, PZ - .138, .19, .022, .02, col.black, SIGN);
  box(PX, .880, PZ - .175, .105, .004, .075, col.white, SIGN);

  solid(PX - .22, PX + .22, PZ - .24, PZ + .24);
  shade(PX, PZ, .74, .74, .28);
  thing('取号机', PX, 1.20, PZ - .30, '请先取号，再排队等叫号。',
    'Take a number first, then queue and wait to be called.',
    '取号 take a number, 排队 queue, 叫号 to call the number. 号 is the number itself.',
    { focus: [-15.35, 5.90], reach: 1.9 });

  // =============================================================== 一米线 the one-metre line
  //
  // A yellow line on the floor one metre back from the counter and the instruction to stand
  // behind it. There is no closer thing to a national queueing custom, it exists in every bank,
  // pharmacy, station and ticket hall in the country, and the phrase 一米线 is worth more to a
  // learner than any three fittings in this room.
  //
  // It stops at x -13.745 rather than running the counter's full width because the check-in
  // bank's collider starts at -13.70: a queue line painted across floor nobody can stand on is
  // a line that teaches the wrong thing.
  box(-15.02, .012, 6.10, 2.55, .02, .085, col.yellow, SIGN);

  // The placard, hung off the shell's EAST stanchion run at x -12.10. It reads the words the line
  // cannot: painted floor at a camera pitch of 0.01 is a smear, so the stripe is the mark and the
  // placard is the sentence.
  //
  // East rather than west, and that is a framing decision rather than a spatial one. The 取号
  // pillar, this placard and a bin all wanted the same two metres of the west rail, which is the
  // strip of screen this camera has left over — three objects stacked into one column at three
  // different depths, each eclipsing the next. One item per rail reads; three in a pile does not.
  // The bin that was here lost that argument and is gone rather than hidden.
  //
  // Angled 0.30 rad toward the lane, which means the card and its lettering have to be turned
  // together: the box takes `ry` and the glyphs take `PI + ry`, because a glyph at yaw PI faces
  // -z and so does the box's front face. Mirrored to -0.30 on this side to face the same way.
  const CR = -.30, CX = -12.35, CZ = 5.39;
  cyl(-12.18, 1.020, 5.393, .012, .17, col.steelD, { rz: PI / 2, gloss: G.metal });
  box(CX, 1.040, CZ, .46, .30, .018, col.white, { ...SIGN, gloss: .12, ry: CR });
  box(CX, 1.168, CZ - .004, .46, .045, .016, col.yellow, { ...SIGN, ry: CR });
  glyphs(CX, 1.100, CZ, PI + CR, '一米线', {
    size: .085, gap: .010, color: C('#8a2b20'), mode: 1, tag: '售票处' });
  glyphs(CX, 0.975, CZ, PI + CR, '请在线外等候', {
    size: .052, gap: .006, color: col.charcoal, mode: 1, tag: '售票处' });

  thing('一米线', -15.02, .60, 6.10, '请在一米线外等候。',
    'Please wait behind the one-metre line.',
    '一米 one metre + 线 line. 等候 to wait — the written form of 等.',
    { focus: [-15.02, 5.60], reach: 2.0 });

  // The queue's own contact shadow, so the lane in front of the counter reads as trodden floor
  // rather than as the same clean stone as the middle of the hall. Shadows are quads on B.shadows
  // and cost nothing against the prop budget.
  shade(-15.02, 5.60, 2.90, 3.60, .16);

  // ---- the tick's handles, closed over above.
  AirFit['ticket'].setNo = live(noRow);
  AirFit['ticket'].setWin = live(winRow);
};

// Anything that moves registers here and the shell dispatches it once a frame. Do not start your
// own timer: `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in minutes.
// A tick that throws is dropped for the rest of the run rather than stopping the terminal.
//
// The called number, and it is driven off the game clock rather than off `t` on purpose. Wall
// clock would make the board a different number in every screenshot, which costs the shot its
// only property worth having — that a change in the PNG means a change in the code. Off the clock
// it is a fixed number at a fixed time of day, still advancing all day as you watch it, and 10:00
// reads A042 every single run.
//
// Window 1 is shut (see OPEN above), so the call alternates between 2 and 3 and never sends a
// passenger to a dark pane.
AirFit['ticket'].tick = (t, body, clock) => {
  const self = AirFit['ticket'];
  if (!self.setNo) return;
  const m = Math.max(0, (clock | 0) - 6 * 60);
  const n = 1 + (m % 199);
  self.setNo('A' + String(n).padStart(3, '0'));
  self.setWin('请到' + (2 + (n % 2)) + '号窗口');
};
