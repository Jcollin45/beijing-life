// 🪑 Platform furniture — The four dressed columns, two benches, bins, the fire cabinet, the 当心站台间隙 warning
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    platform, z 0..3.3
//   camera  95-platform, 97-platwide
//
// The four dressed columns, two benches, bins, the fire cabinet, the 当心站台间隙 warning. The room
// you actually wait in, and the one a commuter spends the most time looking at.
//
// The camera IS the acceptance test, and the metro's shots are stronger than any other scene's:
// many carry a `pre` block that drives the REAL machinery — Metro.tick, Metro.openGate,
// Metro.placeTrain, g.tickStation — so a passing shot is a passing state machine, not just a
// pretty picture. Render yours with `node .audit.js 95-platform`, open the PNG, and look at it.
// A zone whose code boots but whose shot is black, empty or unchanged has not shipped.
//
// ---------------------------------------------------------------------------------------------
// THE m0 RULE — metro-specific, load-bearing, and the one that has no equivalent elsewhere
//
// `setStation(hz)` rewrites signs, floor inlays, the map ring and the exit in place, and `tick`
// moves flaps, boards and the train. All of that works off a REST MATRIX captured after the scene
// finishes building. If your zone adds a prop that will later be rewritten or moved, register it:
//
//     A.rest(myProp);
//
// ...or the shell will fight it and it will snap back to a matrix nobody meant. Props tagged
// `地铁` are collected automatically — that is how the car interior travels with the train.
// Tag interior props `地铁`; never tag anything that stays on the platform.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET — read this before you add anything
//
// The metro is one of the healthiest scenes in the game: ~10.9 ms a frame (90+ fps) with 1,590
// props. It is thin on CONTENT, not on performance, and fifteen agents filling it is exactly how
// that changes. Your budget is **160 props** — lower than the airport's, because this room is a
// third of the size and you are much closer to everything in it.
//
//   * Props BATCH by mesh + mode + corner radius + bevel + textures. Twenty identical seats are
//     one draw call. Twenty seats in twenty colours are STILL one draw call — colour, gloss,
//     alpha and glow travel per instance. Vary those freely; they are free.
//   * ANYTHING TRANSLUCENT (alpha < 0.999) DOES NOT BATCH, one draw call each, because batching
//     reorders drawing and transparency depends on order. Screen doors and chiller glass earn it;
//     budget **8** and no more.
//   * Glyphs DO batch now (as of 2026-08-04 the atlas cell became a per-instance attribute — the
//     street went from 978 glyph draws a frame to two batches). Real Chinese on every sign is
//     cheap, and this is a game about reading Chinese. Use real characters everywhere.
//   * A distinct `round`, `bevel`, `mat` or `matScale` value starts a NEW batch. Pick one tile
//     scale and one concrete scale and stay with them.
//   * If you tick, allocate NOTHING per frame and write matrices in place.
//
// Check yourself: `node .fpscheck.js metro` must stay under 16.7 ms median. Take your own baseline
// BEFORE you build — the machine varies run to run. If your zone pushes it over, say so in your
// report rather than shipping it quietly.
//
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// WHAT WAS ALREADY HERE, AND WHY THIS FILE IS SIGNAGE RATHER THAN FURNITURE
//
// METRO.md gives this zone as "the 4 dressed columns, 2 benches, bins, fire cabinet, 当心站台间隙"
// and reads as a list of things to build. Measured against js/metro.js rather than against the
// plan, SIX of those TEN already exist in the shell and have for a long time:
//
//   js/metro.js:1282-1284  four dressed columns at x -4.20 / -1.40 / 1.40 / 4.20, z .95, each
//                          with a different job (exit · map · fire · watch), and two benches at
//                          x ±3.30, z .30 with a dropped newspaper and a paper cup on them
//   js/metro.js:1908-1934  the bin PAIRS at x ±2.30, z .30 — blue 回收 and grey 其他, the sorted
//                          pair a Chinese public building actually has
//   js/metro.js:1854       当心站台间隙 on the +x end wall at z 2.30
//   js/metro.js:584-596    the 灭火器 in its bracket on the 'fire' column
//   js/metro.js:750-771    the ceiling duct (x -5.62) and sprinkler main (x 5.52)
//   js/metro.js:1941-1959  the lit coves down both long walls — the "light troughs"
//
// Building any of them again would have put a second bench through the first one. So what is left
// of the brief is the four that are genuinely absent — a station-name sign, the 首末班车 board, an
// emergency stop point, and a fire cabinet on the PLATFORM (the only 消火栓 in the station is on
// the concourse at z -4.80, twenty metres and a gate line away from anybody standing here).
//
// ---------------------------------------------------------------------------------------------
// THE ONE RULE THIS FILE FOLLOWS ABOVE ALL OTHERS: **IT ADDS NO COLLIDER AT ALL.**
//
// Not one `solid()`. The named failure mode for a furniture agent in this codebase is a piece of
// furniture that looks right and makes the floor unwalkable — a sofa that sealed a room from three
// metres away, a door leaf hung a third of the way across its own opening. This platform is also
// about to have up to 26 commuters routed across it by js/metro-crowd.js, along `WALK.spine`
// (z 1.85) and into `WALK.queue` (z 2.40), and it already carries three `thing()` focus points
// out here — 地铁 at (0, 1.90), 信号 at (5.45, 2.45), 隧道 at (-4.60, 2.45).
//
// The floor is genuinely full. Measured with the scene's own `clampMove` at the 0.30 m body
// radius, the standable band at x ±4.20 between the gate barrier and the benches is 0.42 m deep
// (z -0.70 .. -0.28) and nothing may go in it. So every fixture below hangs on structure that is
// ALREADY a collider — the four columns' bare faces and the -x end wall — and the walkable floor
// after this file is byte-for-byte the walkable floor before it.
//
// WHERE IT ALL GOES, AND WHY — WHICH IS A CAMERA ARGUMENT, NOT A TASTE ONE
//
// `column(cx, cz, dress, face)` dresses ONE side, on the argument that signage on both faces
// doubles the props to show half of them to the back of somebody's head (js/metro.js:512-517).
// The two outer columns face the train, the two inner ones face the concourse — so the shell has
// left exactly one bare face on each, and the obvious move is to fill those four.
//
// The obvious move puts the two best signs outside the frame. `95-platform` is this zone's hero
// shot and its camera is arithmetic, not opinion: look-at (0, 1.55, 1.20), yaw 0.06π, pitch 0.14,
// dist 5.0, which by `eye = tgt + dir*dist` (js/game.js:7953-8065) puts the eye at (-0.93, 2.25,
// -3.66). FOV is 0.95 rad vertical at 1280x800 (js/game.js:44, .audit.js:18), so the horizontal
// half-angle is atan(tan(0.475) * 1.6) = 39.4°. From that eye the four columns lie at:
//
//   x -4.20 → 46.7°  OUTSIDE THE FRAME        x -1.40 → 18.4°  centre
//   x  4.20 → 38.0°  on the edge              x  1.40 → 17.6°  centre
//
// The room is 12.8 m wide and the camera can only back up to the -z wall, so no reframing of this
// shot gets x ±4.20 comfortably inside it — 4.20/4.75 = 0.88 against a tan of 0.82. The signage
// that has to be read therefore goes on the INNER pair, which means stacking it above the dress
// already on their concourse faces rather than taking a bare face. Both clearances are measured:
// the strip map on the -1.40 column tops out at y 1.90 and the extinguisher plus its 灭火器 label
// on the 1.40 column at y 1.32, so a sign starting at 1.99 and a board starting at 1.51 clear them
// by 0.09 m and 0.19 m. High signage over low wayfinding is also simply where a Chinese station
// puts it.
//
//   x -1.40  -z face  y 1.99-2.57   站名牌 (m0)      over the strip map      centre of 95-platform
//   x  1.40  -z face  y 1.51-2.43   首末班车 board   over the 灭火器          centre of 95-platform
//   x -1.40  +z face                紧急停车按钮     bare face, train side
//   x  1.40  +z face                站名牌 (m0)      bare face, train side
//   x -4.20  -z face                安全候车 notice  bare face, 97-platwide
//   x  4.20  -z face                1站台 plate      bare face, 97-platwide
//   -x end wall, z -0.42            消火栓
// ---------------------------------------------------------------------------------------------

MetroFit['platform'] = A => {
  const { box, cyl, cap, glyphs, thing } = A;
  const { C, G, col } = A;

  // The columns, as the shell built them: 50 cm square, centred on z .95, so their faces are the
  // planes z .70 and z 1.20. Read off js/metro.js:524-536 rather than guessed — the plan's own
  // numbers for this room have been wrong twice.
  const CZ = .95, HALF = .25;

  // `face(f)` is the whole of the mirroring contract, lifted verbatim from `column`'s docstring
  // (js/metro.js:519-523) because getting it wrong is invisible in a render and reverses every
  // two-piece layout on the sign. `out(d)` is d metres proud of the face; `along(u)` is u metres
  // to the READER'S RIGHT, which flips with the face because yaw π mirrors x on screen.
  // Characters inside a single `glyphs` call are safe either way — the run and the glyph's own
  // texture axis mirror together — so anything that can be written as one call is.
  const face = (cx, f) => {
    const fz = CZ + f * HALF;
    return { cx, f, yaw: f < 0 ? Math.PI : 0,
             out: d => fz + f * d, along: u => cx + f * u };
  };

  // =============================================================== 站名牌 the station-name signs
  //
  // THE m0 PROP, and the reason this file has a tick at all. `setStation(hz)` rewrites the two
  // hanging boards, the two floor inlays, the ring on the line map and the door out — and it does
  // it by walking arrays that live inside js/metro.js. There is no hook for a fifth: a zone that
  // adds a rewritable prop registers it with `A.rest` so the shell's post-`finish()` pass captures
  // its matrix, and then polls for the station changing under it. js/metro-stairs.js found the
  // same wall and the same answer; this follows its pattern deliberately rather than inventing a
  // second one.
  //
  // Two of them, on a column each, because that is what a Beijing platform has: the name repeats
  // down the platform so that it is legible from wherever a car door happens to stop. One faces
  // the concourse and one faces the train.
  //
  // FOUR SLOTS, not "the name". Station names on this line run two characters (公园, 机场) to four
  // (杨柳胡同), so a fixed run written once is a sign that reads 公园柳胡同 at the second station.
  // Four slots, each carrying one character; the surplus ones are PARKED rather than blanked,
  // because a transparent glyph quad still writes depth and would punch a hole in the board.
  const NAME_SIZE = .086, NAME_GAP = .016, NAME_STEP = NAME_SIZE + NAME_GAP;
  // The atlas only holds characters somebody has asked for, and `glyphs` asks for the text it is
  // BUILT with — which is one station's name. The other six are only ever written later, so they
  // are registered here or they come out of the sheet as nothing at all.
  Glyphs.need('杨柳胡同商务区大学城火车站公园动物园机场');
  const signs = [];

  // Sized to clear the strip map already on the -1.40 column's concourse face, which tops out at
  // y 1.90: the plate runs 1.99 to 2.57. Both signs use the identical layout, which is worth one
  // sentence because it is also the cheap thing to do — same mesh, same mode, same absence of a
  // corner radius, so the two boards and the four notices below all land in the batch that already
  // holds most of this room.
  function nameSign(F) {
    const { cx, yaw, out } = F;
    // the board: a white plate, a line-coloured header, the name field, and a rule under it
    box(cx, 2.28, out(.015), .48, .58, .03, col.white, { hard: true, gloss: .22 });
    box(cx, 2.49, out(.032), .44, .11, .01, col.blue, { hard: true, mode: 1 });
    glyphs(cx, 2.49, out(.042), yaw, '二号线',
      { size: .050, gap: .012, color: col.white, mode: 1 });
    box(cx, 2.22, out(.030), .44, .32, .01, col.cream, { hard: true, mode: 1 });
    box(cx, 2.03, out(.032), .44, .010, .01, col.blue, { hard: true, mode: 1 });
    // and the four slots. `.map(A.rest)` is the registration: the shell captures `m0` for each of
    // these after `finish()`, which is where the cull data is worked out from the matrix it finds,
    // and the tick below shifts a short name back to the middle by pre-multiplying that `m0`.
    const slots = glyphs(cx, 2.22, out(.042), yaw, '杨柳胡同',
      { size: NAME_SIZE, gap: NAME_GAP, color: col.charcoal, mode: 1 }).map(A.rest);
    signs.push({ slots, f: F.f, step: NAME_STEP });
    return slots;
  }

  const fA = face(-1.40, -1);          // concourse side, dead centre of the 95-platform frame
  const fB = face(1.40, 1);            // train side, read stepping off
  nameSign(fA);
  nameSign(fB);

  // 站台 the word for the thing you are standing on, and the room's own name. The platform had no
  // learnable word of its own: of the three `thing()`s out here, one belongs to the track agent,
  // one to the signals and one is the train itself.
  //
  // Its focus is arithmetic, not a guess. At x -1.40 the nearest colliders once `clampMove`
  // inflates them by the 0.30 m body radius are the column itself (z .35 .. 1.55) and the gate
  // cabinet behind (z -2.37 .. -0.73), so z 0.05 stands in a clear 1.08 m band with the sign
  // 0.65 m in front of the reader's face.
  thing('站台', fA.cx, 2.22, fA.out(.045), '这是几号站台？', 'Which platform is this?',
    '站 station or stop + 台 platform, a raised stand. 站台 is the platform itself; 屏蔽门 is the '
    + 'screen door along the edge of it.',
    { focus: [fA.cx, .05], reach: 1.6 });
  // The tag has to be on a PROP for the cursor to find it — `pick` ray-tests props and reads the
  // tag off whatever it hit. One plate carries it; the glyphs do not, because a character is
  // never the thing it names.
  box(fA.cx, 2.28, fA.out(.005), .46, .56, .01, col.white,
    { hard: true, gloss: .22, tag: '站台' });

  // =============================================================== the two outer columns
  // Both are at the edge of the 95-platform frame and square in 97-platwide, so what goes on them
  // is what can be read at a glance rather than anything anybody has to walk over to.
  //
  // A bare tiled column face is the same blank the lightboxes were put on the end walls to fix.
  const fE = face(-4.20, -1);
  box(fE.cx, 1.58, fE.out(.015), .48, .30, .03, col.white, { hard: true, gloss: .22 });
  glyphs(fE.cx, 1.66, fE.out(.035), fE.yaw, '安全候车',
    { size: .052, gap: .012, color: col.redD, mode: 1 });
  glyphs(fE.cx, 1.51, fE.out(.035), fE.yaw, '请在黄线内候车',
    { size: .040, gap: .006, color: col.charcoal, mode: 1 });
  // and the platform's own number, which is the other half of the word 站台 and the thing a
  // commuter is told over the PA. One road in this room, so it is 1.
  const fF = face(4.20, -1);
  box(fF.cx, 1.62, fF.out(.015), .34, .22, .03, col.navy, { hard: true, gloss: .24 });
  glyphs(fF.cx, 1.62, fF.out(.035), fF.yaw, '1站台',
    { size: .070, gap: .018, color: col.white, mode: 1 });

  // =============================================================== 首末班车 the first/last board
  //
  // The printed board every Chinese platform carries, on a concourse-facing column so that it is
  // read while waiting rather than while leaving.
  //
  // ON THE NUMBERS, because this room has a rule about screens that lie (js/metro.js:951 — "a
  // touchscreen nobody can touch that changed by itself would be a worse lie than one that does
  // not move"). `HEADWAY` is 60 (js/metro.js:2223) and `nextAt` rounds the clock up to the next
  // multiple of it, so trains berth on the hour, every hour, all night: the shell's timetable has
  // no service span at all. 05:00 and 23:00 are therefore a claim the simulation does not honour
  // between midnight and five — which is a printed sign being out of date, the mildest lie
  // available, and the honest fix belongs to whoever owns `trainAt`. It is ticket #1 in the report.
  //
  // 行车间隔 60分 is not a guess: it is `HEADWAY` read off the code, in the same compressed
  // game-minutes the clock on the end wall and the countdown board already run on.
  //
  // Every row is ONE `glyphs` call with a space in it. A space is skipped but still takes its step
  // (js/build.js:119), so a label and a number space themselves apart with no second call to place
  // — and a single call cannot be caught by the yaw-π mirroring that reverses every two-piece
  // layout on a face read from the room.
  //
  // It goes on the 1.40 column's concourse face, above the extinguisher and its 灭火器 label —
  // which top out at y 1.32, so the plate's 1.51 clears them by 0.19 m.
  const fC = face(1.40, -1);
  box(fC.cx, 1.97, fC.out(.015), .48, .92, .03, col.white,
    { hard: true, gloss: .22, tag: '末班车' });
  box(fC.cx, 2.34, fC.out(.032), .44, .14, .01, col.navy, { hard: true, mode: 1 });
  glyphs(fC.cx, 2.34, fC.out(.042), fC.yaw, '首末班车',
    { size: .062, gap: .014, color: col.white, mode: 1 });
  for (const [y, txt] of [[2.12, '首班车 05:00'], [1.94, '末班车 23:00']])
    glyphs(fC.cx, y, fC.out(.035), fC.yaw, txt,
      { size: .038, gap: .006, color: col.charcoal, mode: 1 });
  box(fC.cx, 1.80, fC.out(.032), .40, .010, .01, col.band, { hard: true, mode: 1 });
  glyphs(fC.cx, 1.66, fC.out(.035), fC.yaw, '行车间隔 60分',
    { size: .034, gap: .005, color: col.band, mode: 1 });

  // 末班车 the last train, which is the word this board exists to teach and the one a commuter
  // checks a board for. Same clear band as 站台 on the other inner column, mirrored: at x 1.40 the
  // column inflates to z .35 and the gate cabinet behind it to z -0.73, so z 0.05 has 0.30 m of
  // slack behind the reader and 0.30 m in front before the column.
  thing('末班车', fC.cx, 1.94, fC.out(.045), '末班车是几点？', 'What time is the last train?',
    '末 the end or last + 班车 a scheduled service. 首班车 is the first one of the day.',
    { focus: [fC.cx, .05], reach: 1.6 });

  // =============================================================== 紧急停车按钮 the stop point
  // On the train side, because it is pressed by somebody looking at the track. A red box under a
  // cover with the button behind it, which is the whole of what one looks like from two metres.
  const fD = face(-1.40, 1);
  box(fD.cx, 1.40, fD.out(.015), .30, .46, .03, col.cream, { hard: true, gloss: .22 });
  glyphs(fD.cx, 1.57, fD.out(.035), fD.yaw, '紧急停车按钮',
    { size: .036, gap: .005, color: col.redD, mode: 1 });
  box(fD.cx, 1.34, fD.out(.055), .17, .17, .08, col.red,
    { hard: true, gloss: .30, tag: '按钮' });
  cyl(fD.cx, 1.34, fD.out(.075), .058, .012, col.steelD,
    { rx: Math.PI / 2, gloss: G.metal });
  cyl(fD.cx, 1.34, fD.out(.088), .042, .016, C('#c8452f'),
    { rx: Math.PI / 2, mode: 1, gloss: .34, glow: .10 });
  // The cover, last and furthest out, so the light reads through it rather than over it. The one
  // translucent prop this zone adds.
  box(fD.cx, 1.34, fD.out(.104), .15, .15, .01, col.glass,
    { hard: true, mode: 1, alpha: .34, gloss: G.glass });
  glyphs(fD.cx, 1.19, fD.out(.035), fD.yaw, '按下报警',
    { size: .030, gap: .004, color: col.charcoal, mode: 1 });
  thing('按钮', fD.cx, 1.34, fD.out(.11), '紧急情况才能按这个按钮。',
    'Only press this button in an emergency.',
    '按 to press + 钮 a knob. 按钮 is any push-button; 紧急 means urgent or emergency.',
    { focus: [fD.cx, 1.90], reach: 1.6 });

  // =============================================================== 消火栓 the platform hydrant
  //
  // The station has exactly one fire cabinet and it is on the CONCOURSE, at z -4.80 behind the
  // gate line (js/metro.js:1827). A platform whose nearest hose is on the far side of four
  // turnstiles is the one thing a station genuinely does not have, so this is the second, in the
  // -x end wall at the concourse end of the platform.
  //
  // Recessed, not applied: a frame with a hole in it, contents first and glazing last, on the same
  // 2 cm depth grid the concourse one uses — the note there is worth re-reading, because a coil
  // starting 5 mm behind the plate it lies on renders as a ring with a bite out of it. The z is
  // chosen against the wall, not by eye: the -x run carries a pilaster at z .40, the clock at
  // z .95 and a lightbox from z 1.74 to 3.46, and the cabinet's 0.70 m sits at -0.77 .. -0.07 with
  // the nearest of those 1.09 m away.
  {
    const wx = -A.RX + .10, fz = -.42;
    box(wx + .02, .90, fz, .02, 1.10, .70, col.charcoal,
      { hard: true, gloss: .22, tag: '消火栓' });
    for (const s of [-1, 1])
      box(wx + .06, .90, fz + s * .31, .22, 1.10, .08, col.red, { hard: true, gloss: .30 });
    box(wx + .06, 1.35, fz, .22, .20, .70, col.red, { hard: true, gloss: .30 });
    box(wx + .06, .45, fz, .22, .20, .70, col.red, { hard: true, gloss: .30 });
    // the hose on its drum, seen end-on. Three rings and a hub, not a spiral: at 19 cm across a
    // spiral is four pixels of difference and twenty times the props.
    [[.188, .05], [.152, .07], [.115, .09]].forEach(([r, d], k) =>
      cyl(wx + d, 1.02, fz - .06, r, .02, k === 1 ? C('#8d2f1e') : C('#a03824'),
        { rz: Math.PI / 2, gloss: .22 }));
    cyl(wx + .105, 1.02, fz - .06, .055, .02, col.steelD, { rz: Math.PI / 2, gloss: G.metal });
    cap(wx + .07, .68, fz - .10, .020, .16, .020, col.chrome, { rz: .20, gloss: G.metal });
    cyl(wx + .06, .70, fz + .20, .044, .022, col.red, { rz: Math.PI / 2, gloss: .30 });
    cyl(wx + .085, .70, fz + .20, .011, .05, col.charcoal, { rz: Math.PI / 2, gloss: .30 });
    // then the pane, after everything it is there to show
    box(wx + .145, .90, fz, .02, .70, .54, col.glass,
      { hard: true, mode: 1, alpha: .34, gloss: G.glass });
    cyl(wx + .155, .90, fz + .22, .016, .11, col.chrome, { rz: Math.PI / 2, gloss: G.metal });
    glyphs(wx + .165, 1.36, fz, Math.PI / 2, '消火栓',
      { size: .085, gap: .030, color: col.white, mode: 1 });
    thing('消火栓', wx + .16, 1.00, fz, '消火栓后面是消防水带。',
      'There is a fire hose behind the hydrant.',
      '消 to extinguish + 火 fire + 栓 a plug or bolt. The wording used inside a building; '
      + '灭火器 is the portable extinguisher on the column.',
      { focus: [-5.85, fz], reach: 1.8 });
  }

  // Handed to the tick, which is dispatched from the shell and must allocate nothing per frame.
  MetroFit['platform']._signs = signs;
  // Parked out of the world and scaled to nothing, the way `setStation` parks a surplus name slot.
  // Built here rather than at module top level: `M` is another file's global and a `const` built
  // at load time is a bet on script order that nothing in this file needs to take.
  MetroFit['platform']._parked = M.trs(0, -60, 0, 0, .001, .001, .001);
};

// Anything that moves registers here and the shell dispatches it once a frame, BEFORE the shell's
// own train placement, so you can read the clock it is about to act on. Do not start your own
// timer. `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in minutes.
// A tick that throws is dropped for the rest of the run rather than stopping the station.
//
// This one animates nothing. It watches for the station changing under it, which is the one event
// a zone cannot be told about: `setStation` rewrites the shell's own arrays directly and there is
// no hook to register a fifth. Polling is the honest answer and it costs one function call and one
// string compare a frame — the rewrite itself runs on the frame you arrive somewhere new and never
// again. `Metro.__lazyBuilt` is answered by the proxy without building anything (js/lazy.js), so
// this is safe on a frame where the station somehow is not up yet.
MetroFit['platform'].tick = () => {
  const self = MetroFit['platform'];
  if (!self._at) {
    if (typeof Metro === 'undefined' || !Metro.__lazyBuilt) return;
    self._at = Metro.stationAt;
  }
  const s = self._at();
  const hz = s && s.hz;
  if (hz === self._hz) return;
  self._hz = hz;
  const signs = self._signs, PARKED = self._parked;
  if (!signs || !hz) return;
  const chars = [...hz];
  for (const sign of signs) {
    // Centre what there is. A two-character name left in four slots sits hard against one edge of
    // the board with two holes beside it. The shift goes the OTHER way on the face turned through
    // π, because that face mirrors x — the same trap as every two-piece layout on a column, one
    // axis over, and the reason `f` is carried on the sign rather than assumed.
    const off = (4 - chars.length) * sign.step / 2 * sign.f;
    for (let i = 0; i < sign.slots.length; i++) {
      const p = sign.slots[i];
      if (!p.m0) continue;                     // before the shell's rest pass; nothing to shift from
      if (i >= chars.length) { p.m = PARKED; p.cx = 0; p.cy = -60; p.cz = 0; continue; }
      p.ch = chars[i];
      p.m = M.mul(M.trans(off, 0, 0), p.m0);
      p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    }
  }
};
