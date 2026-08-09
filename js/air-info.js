// 🛈 Info · Entrance — The 问询处 island, the metro arrival at DX = -20
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    x -22.0 .. -15.0  (landside, stone floor)
//   camera  DB-info
//
// The 问询处 island, the metro arrival at DX = -20.20, and the spawn-adjacent view — the first
// thing a passenger sees. Teaches 请问 / 航班 / 登机口.
//
// The camera IS the acceptance test. Render your shot with `node .audit.js DB-info`, open the
// PNG, and look at it. A zone whose code boots but whose shot is black, empty, or unchanged has
// not shipped. You own your row(s) in .audit.js and nobody else's.
//
// ---------------------------------------------------------------------------------------------
// WHAT THIS ZONE IS FOR, AND WHY IT IS BUILT THE WAY IT IS
//
// The shell already owns the two big objects in this corner: the 地铁站 headhouse in the +z wall
// at DX, and the 问询处 island at (-17.40, 1.60) — a drum counter, a drum sign over it and a
// greeter beside it. Neither is mine to edit. So this file does the two things the shell left
// undone.
//
// First, the island is the hero of the DB-info frame and it renders as a blank beige cylinder: a
// counter with no name on it, seen from the one side that carries nothing at all. Everything
// under "the island" below is signage and clutter *on* the shell's drum — a lettered fascia on
// both faces, a screen, a leaflet rack, a queue — so that the thing the camera is pointed at
// looks like an enquiry desk instead of a plinth.
//
// Second, and the reason this zone exists: a day-one player arrives here out of the subway with
// no onboarding, into the largest room in the game, and the hall's six gantries tell them where
// 值机 and 安检 *are* without ever telling them that one comes before the other. The 乘机流程
// board is that missing sentence — four numbered steps, 购票 值机 安检 登机, in the order you have
// to do them. It is a real fixture (乘机指南 boards stand in every Chinese terminal) and it is the
// only object in this hall that answers "what do I do first" rather than "which way".
//
// Everything is placed against the DB-info eye, which sits at (-17.40, 2.32, -5.20) looking +z:
//   * the island fills the middle of the frame, so its dressing has to read at 6.8 m;
//   * the flow board stands at (-19.30, -1.90) — 3.8 m out and 0.52 rad off axis, inside the
//     0.687 rad half-frame — which is the only place in this view where a paragraph of signage
//     comes out ~30 px tall and can actually be read;
//   * the clock hangs at x -19.90, because the drum sign blots out everything within 1.8 m of
//     the axis at that depth.
// Nothing is put behind the island: the drum and its sign eat the whole middle distance.
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
// This zone runs **0 translucent props** and introduces **no new material combination**. Every
// solid here is either a plain `hard` box/cyl — which is the batch the shell's own signage is
// already in, since all six gantries are `box(..., { hard: true, gloss: .24 })` — or a plain soft
// box. All lettering is mode 1, the batch every other sign in the hall shares.
//
// Check yourself: `node .fpscheck.js airport` must stay under 16.7 ms median. If your zone pushes
// it over, say so in your report rather than shipping it.
//
// ---------------------------------------------------------------------------------------------

AirFit['info'] = A => {
  const { box, cyl, ball, cap, taper, wall, flat, glyphs, solid, blocker, glow, thing } = A;
  const { C, G, col } = A;

  // ---- datums. IX/IZ/R are the shell's island (js/airport.js, "问询处 information"), restated
  // rather than exported: if that drum ever moves, these three numbers move with it and every
  // placement below follows. FRONT is the face the DB-info camera is on.
  const IX = -17.40, IZ = 1.60, R = 1.50;
  const FRONT = Math.PI;                  // a glyph facing -z, i.e. back down the hall at the eye
  const BACK = 0;                         // …and one facing +z, at the passenger off the metro

  const SUB = C('#bcd0e4');               // the English line under a Chinese one, as the gantries
  const PAPER = C('#e8e2d2');
  const LED = C('#7fe0a4');

  // A lettered plate, mounted flat on something. `yaw` faces it: π looks back down the hall.
  // The Chinese line sits on the plate's centre when there is no subtitle and rides up when there
  // is, which is how every blue blade in this hall is set out.
  //
  // Latin takes a negative gap for the reason the shell's `gantry` documents: every glyph is
  // drawn in a square cell and a Latin one inks about half of it, so at the Chinese line's
  // spacing 'INFORMATION' comes out as I N F O R M A T I O N.
  function plate(cx, cy, cz, w, h, yaw, zh, en, o = {}) {
    const nx = Math.sin(yaw), nz = Math.cos(yaw), off = .034;
    box(cx, cy, cz, w, h, .05, o.bg || col.blueSign, { hard: true, gloss: .26, ry: yaw });
    glyphs(cx + nx * off, cy + (en ? .055 : 0), cz + nz * off, yaw, zh,
      { size: o.size || .17, gap: .045, color: o.ink || col.white, mode: 1, glow: .08 });
    if (en)
      glyphs(cx + nx * off, cy - .105, cz + nz * off, yaw, en,
        { size: .062, gap: -.018, color: o.sub || SUB, mode: 1, glow: .05 });
  }

  // ============================================================ 问询处 — dressing the island
  // The shell's drum is 1.50 m of radius under a 1.62 m counter lip, and the camera is pointed at
  // 3.2 m of blank curve. A nameplate is the fix, and the only subtlety is how flat meets round:
  // a plate bedded to the chord (centre at sqrt(R²-hw²)) sits flush at its ends but buries its
  // middle 90 mm inside the drum, because the surface bulges to R between them. Mounted tangent
  // instead — centre at R + half the plate's thickness — the back face kisses the drum on the
  // centreline and the corners stand off behind it, where nothing can see them.
  const MOUNT = R + .025;

  // The face the DB-info camera is on. 问询处 is the word this whole zone is named for.
  plate(IX, .78, IZ - MOUNT, 1.04, .44, FRONT, '问询处', 'INFORMATION');
  // …and the face the subway comes up behind, which is the one an arriving passenger reads first.
  plate(IX, .78, IZ + MOUNT, 1.04, .44, BACK, '问询处', 'INFORMATION');

  // The desk's own screen, facing the hall. The shell put a monitor on the +z lip facing the
  // greeter's side; this is the passenger's side of the same counter, and it says what the desk
  // is *for* rather than showing a picture. 航班 is the second of the three words this zone owns.
  const SX = IX - .34, SZ = IZ - .70;
  cyl(SX, 1.19, SZ, .045, .14, col.steelD, { gloss: G.metal });
  box(SX, 1.46, SZ, .52, .34, .05, col.charcoal, { hard: true, gloss: .34 });
  box(SX, 1.46, SZ - .034, .45, .27, .02, col.board, { hard: true, mode: 1, glow: .07 });
  glyphs(SX, 1.53, SZ - .052, FRONT, '航班查询',
    { size: .072, gap: .014, color: LED, mode: 1, glow: .50 });
  glyphs(SX, 1.40, SZ - .052, FRONT, '请问登机口',
    { size: .054, gap: .012, color: SUB, mode: 1, glow: .30 });

  // The leaflet rack every enquiry desk in the world has on it, and the reason the counter stops
  // reading as an empty slab. Three tiers; the leaflets are one box each in five papers — colour
  // is per instance, so a rack of mixed stock costs exactly what a rack of white would.
  const LX = IX + .74, LZ = IZ - .62;
  box(LX, 1.15, LZ, .40, .04, .30, col.steelD, { hard: true, gloss: G.metal, ry: -.34 });
  const PAP = [C('#d8442f'), C('#e2b03c'), C('#3f7fbe'), PAPER, C('#4f9b74')];
  for (let i = 0; i < 3; i++) {
    const ty = 1.20 + i * .105, tz = LZ + .085 - i * .085;
    box(LX, ty, tz, .38, .02, .11, col.white, { hard: true, gloss: .20, ry: -.34, rx: -.42 });
    for (let j = 0; j < 3; j++)
      box(LX - .12 + j * .12, ty + .055, tz - .012, .105, .075, .012,
        PAP[(i * 3 + j) % PAP.length], { hard: true, gloss: .14, ry: -.34, rx: -.42 });
  }

  // 失物招领. The shell's PA already tells you that lost property and lost children are dealt with
  // at the 问询处 on the ground floor (js/airport.js, NOTICES) — this is the counter card that
  // makes the announcement true when you walk over to check it.
  const CY = FRONT - .5;
  box(IX - .96, 1.22, IZ - .48, .46, .17, .03, col.white, { hard: true, gloss: .22, ry: CY });
  glyphs(IX - .96 + Math.sin(CY) * .022, 1.24, IZ - .48 + Math.cos(CY) * .022, CY, '失物招领',
    { size: .062, gap: .012, color: col.navy, mode: 1 });

  // A call bell and a stack of forms, at the scale of things that are actually on a counter.
  cyl(IX + .18, 1.14, IZ - .96, .055, .035, col.chrome, { gloss: G.metal });
  ball(IX + .18, 1.18, IZ - .96, .038, .028, .038, col.chrome, { gloss: G.metal });
  box(IX - .62, 1.14, IZ - .92, .21, .03, .28, PAPER, { hard: true, gloss: .12, ry: .22 });

  // ---- the queue. Two short runs of belt that open toward the desk rather than barring it: a
  // rail across the approach reads as "closed", and this counter is the one thing in the hall a
  // lost player is meant to walk straight up to. No collider — the posts are 84 mm of chrome, and
  // stopping the body on them would be worse than letting it through.
  function post(px, pz) {
    cyl(px, .045, pz, .17, .09, col.steelD, { gloss: G.metal });
    cyl(px, .53, pz, .042, .88, col.chrome, { gloss: G.metal });
    return [px, pz];
  }
  function belt(a, b) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    box((a[0] + b[0]) / 2, .90, (a[1] + b[1]) / 2, Math.hypot(dx, dz), .055, .016, col.navy,
      { hard: true, gloss: .20, ry: Math.atan2(dx, dz) + Math.PI / 2 });
  }
  // Left-hand run clears the trolley rack (x -20.60); right-hand run clears the planter trough
  // at x -15.50..-14.50, which is why it stops at -15.70 rather than mirroring the left exactly.
  belt(post(-19.70, -0.50), post(-18.95, 0.55));
  belt(post(-15.70, -0.40), post(-16.10, 0.55));

  // ============================================================ 乘机流程 — what to do first
  // The board this zone exists for. It stands on open floor between the trolley rack, which ends
  // at z 0.50, and the curtain wall, turned -0.52 rad so its lettered face looks straight back at
  // the DB-info eye and still reads to anyone walking the hall.
  //
  // Four steps, numbered, in the order the boarding chain actually runs: 售票处 → 值机 → 安检 →
  // 登机口. That chain crosses four other agents' zones and is the longest thing to do in the
  // game; this is the only place it is written down in one piece.
  // Framed, not guessed. The board is 1.20 wide, so from the DB-info eye it subtends 0.175 rad
  // either side of its centre; the frame is 0.687 rad half-wide at 16:10. Standing it 3.0 m out
  // and 1.55 m off the axis puts its centre at 0.478 rad, so it runs 0.303 → 0.653 and the far
  // edge clears the frame boundary. Pushed any nearer it grows angularly and crops; pushed any
  // further along -z it fouls the trolley rack, which runs x -21.05..-20.15, z -1.20..0.50.
  const BX = -18.95, BZ = -2.20, BY = -0.52;
  // The outward normal of the lettered face, and a mapping from (along, up, out) on that face to
  // world. `u` runs along the face; a glyph run at yaw BY+π reads right-to-left along +u, so the
  // step number goes at +u and its words just below-left of it, which is what puts the number on
  // the reader's left.
  const bnx = Math.sin(BY + Math.PI), bnz = Math.cos(BY + Math.PI);
  const bat = (u, v, off) =>
    [BX + Math.cos(BY) * u + bnx * off, v, BZ - Math.sin(BY) * u + bnz * off];

  box(BX, .22, BZ, .40, .44, .22, col.steelD, { hard: true, gloss: G.metal, ry: BY });
  box(BX, 1.48, BZ, 1.20, 2.02, .12, col.blueSign, { hard: true, gloss: .24, ry: BY });
  // The header band, a shade darker, so the four rows under it read as a list and not a poster.
  // The whole board tops out at 2.51 m on purpose: the departure board's lowest row sits at 2.38
  // and D4-flights looks straight down this wall, so anything taller would start eating it.
  box(BX, 2.31, BZ, 1.20, .40, .13, col.navy, { hard: true, gloss: .26, ry: BY });
  {
    const [hx, hy, hz] = bat(0, 2.35, .075);
    glyphs(hx, hy, hz, BY + Math.PI, '乘机流程',
      { size: .155, gap: .05, color: col.white, mode: 1, glow: .10 });
    const [ex, ey, ez] = bat(0, 2.20, .075);
    glyphs(ex, ey, ez, BY + Math.PI, 'HOW TO FLY',
      { size: .062, gap: -.018, color: SUB, mode: 1, glow: .05 });
  }
  // The lit field the steps are printed on, so the board reads as a sign and not a blue slab.
  {
    const [fx, fy, fz] = bat(0, 1.27, .066);
    box(fx, fy, fz, 1.06, 1.50, .02, PAPER, { hard: true, mode: 1, glow: .05, ry: BY });
  }
  // 购票 not 买票, 值机 not 办理乘机手续: these are the words the departure board, the desks and
  // the PA already use, so the step list and the rest of the hall say the same thing.
  const STEP = [
    ['1', '购票', 'BUY A TICKET', col.blueSign],
    ['2', '值机', 'CHECK IN', C('#2f7f5e')],
    ['3', '安检', 'SECURITY', col.orange],
    ['4', '登机', 'BOARDING', col.red],
  ];
  STEP.forEach(([n, zh, en, chip], i) => {
    const ry = 1.86 - i * .345;
    // The chip stands at .098 out, not .075: the printed field's own face is at .076, and a disc
    // set flush with it half-sinks into the paper and z-fights along its rim.
    const [cx, cy, cz] = bat(.40, ry, .098);
    cyl(cx, cy, cz, .095, .022, chip, { mode: 1, glow: .10, rx: Math.PI / 2, ry: BY });
    glyphs(cx + bnx * .018, cy, cz + bnz * .018, BY + Math.PI, n,
      { size: .105, gap: 0, color: col.white, mode: 1, glow: .20 });
    const [tx, ty, tz] = bat(-.10, ry + .045, .075);
    glyphs(tx, ty, tz, BY + Math.PI, zh, { size: .145, gap: .05, color: col.navy, mode: 1 });
    const [sx2, sy2, sz2] = bat(-.10, ry - .095, .075);
    glyphs(sx2, sy2, sz2, BY + Math.PI, en,
      { size: .055, gap: -.016, color: C('#5c6b7e'), mode: 1 });
  });
  // A 1.20 x 0.12 panel turned -0.52 rad spans 1.12 x 0.70 in world xz, so the collider is
  // x -19.51..-18.39, z -2.55..-1.85. Clearances measured rather than eyeballed, because
  // clampMove inflates every collider by the 0.30 m body radius and an opening therefore needs
  // ~0.60 m of clear run: this is a free-standing island, not part of a wall, and the tightest
  // approach to it — the 0.64 m between its west edge and the trolley rack at x -20.15 — already
  // clears that. Every other side is open by 1.85 m (the 问询处 island, +z) or more.
  solid(BX - .56, BX + .56, BZ - .35, BZ + .35);
  A.shade(BX, BZ, 1.50, 1.00, .26);

  // ============================================================ 时钟 — the hall clock
  // Over the subway arrival against the +z wall, where a passenger sees it on entering. The first
  // version hung at (-19.75, 3.60, .25), directly in the departures-board sightline, and its narrow end
  // masked the title and two headers. Green on black because every terminal clock is, and live
  // off the game clock because a clock reading 10:00 all day is a poster.
  const KX = -20.20, KY = 4.30, KZ = 7.85;
  for (const s of [-1, 1])
    cap(KX + s * .40, (KY + .22 + A.H) / 2, KZ, .016, A.H - KY - .22, .016, col.steelD,
      { gloss: G.metal });
  box(KX, KY, KZ, 1.06, .44, .16, col.charcoal, { hard: true, gloss: .30 });
  const digits = [];
  for (const [oz, yaw] of [[-.085, FRONT], [.085, BACK]]) {
    box(KX, KY, KZ + oz, .92, .32, .012, col.black, { hard: true, mode: 1, glow: .04 });
    // One glyph per slot at a fixed matrix, so the tick only ever rewrites `ch`. The renderer
    // resolves the atlas cell per instance, which is what makes five live digits cost nothing.
    // The tangent is (cos yaw, -sin yaw), the same convention the shell's `slots` uses.
    '00:00'.split('').forEach((c0, i) => {
      const t = (i - 2) * .175;
      const g = glyphs(KX + Math.cos(yaw) * t, KY, KZ + oz - Math.sin(yaw) * t, yaw, c0,
        { size: .215, gap: 0, color: LED, mode: 1, glow: .55 })[0];
      if (g) digits.push(g);
    });
  }

  // ---- what the hall has left lying about. Cases stood on end by the queue: the one thing this
  // corner had none of was any evidence that a person had ever walked through it.
  const BAGC = [C('#3c4a5c'), C('#7d3b32'), C('#2f4b3f'), C('#5a5348')];
  function bag(bx, bz, ry, h, w, c) {
    box(bx, h / 2, bz, w, h, w * .62, c, { gloss: .22, ry });
    box(bx, h + .05, bz, w * .30, .10, w * .09, col.charcoal, { hard: true, gloss: .30, ry });
    box(bx, h * .52, bz - w * .33, w * .82, .035, .02, col.charcoal, { hard: true, gloss: .30, ry });
  }
  bag(-19.32, -0.02, .30, .68, .42, BAGC[0]);
  bag(-19.54, 0.16, -.44, .54, .36, BAGC[1]);
  bag(-15.62, 0.30, .18, .72, .44, BAGC[2]);
  bag(-18.05, -2.42, -.22, .62, .40, BAGC[3]);

  // ---- light. The shell lamps the island itself; these two are the flow board and the clock,
  // the only lettering in this corner far enough from that lamp to fall dark after hours.
  A.light(BX, 2.10, BZ - .40, [0.96, 0.90, 0.78], .34, 2.6);
  A.light(KX, 3.10, KZ, [0.72, 0.94, 0.82], .22, 2.4);

  // ---- the thing worth saying out loud here. 请问 is how every question in this hall opens, and
  // the answer to this one is the four steps painted on the board behind it.
  thing('乘机流程', BX, 1.70, BZ - .70, '请问，我先去哪儿？',
    'Excuse me — where do I go first?',
    '四步：购票、值机、安检、登机。请问 opens any of them.',
    { focus: [BX + .30, BZ - 1.70], reach: 2.2 });

  // ============================================================ the tick
  // Only the clock moves. Guarded on the minute, so the ten slots are rewritten 1,440 times a day
  // rather than sixty times a second.
  let shown = -1;
  AirFit['info'].tick = (t, body, clock) => {
    const m = ((Math.round(clock) % 1440) + 1440) % 1440;
    // NaN would fail the `m === shown` guard on every single frame, which is the one way a
    // once-a-minute rewrite turns into a sixty-a-second one.
    if (!isFinite(m) || m === shown || !digits.length) return;
    shown = m;
    const s = String((m / 60) | 0).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    for (let i = 0; i < digits.length; i++) digits[i].ch = s[i % 5];
  };
};
