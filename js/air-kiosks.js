// 🖥️ Self-service kiosks — 自助值机
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    x -22.0 .. -19.0, +z side  (landside)
//   camera  D-kiosks (new)
//
// 自助值机. IMPROVEMENT 1 LANDS HERE: the kiosk screens are bar-UI coloured rectangles today and
// must become real glyph displays. See the note on glyph cost below — they batch now.
//
// The camera IS the acceptance test. Render your shot with `node .audit.js D-kiosks`, open the
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
// HOW THE SCREENS STOPPED LYING — read this if you own the X-ray screen or the gate screen
//
// The old kiosk row (still in the shell, at x -9.4) draws its UI as five coloured bars and says
// so in its own comment: "Deliberately not text. The panel is 0.78 × 0.55, so a legible line
// would be about six characters at .07, and six characters is not a user interface — it is a
// caption. Bars are what a UI looks like from two metres away … and they cost four props instead
// of forty." That was true when a character cost a draw call. It is not true now, and this is the
// replacement — six things, all of which bit at least once while writing it:
//
//  1. A SCREEN IS A COORDINATE SYSTEM, NOT A PILE OF OFFSETS. Every screen here is raked back by
//     RK = 0.30 rad, and anything laid on a raked panel has to be offset along the panel's own
//     normal, not along world +z. So the screen is declared once as a centre `S`, and
//     `at(S, u, v, lift)` converts a point in the panel's own plane — u right, v up, lift out —
//     into world space. Everything on the screen is then laid out in screen coordinates, the way
//     you would lay out a real interface, instead of being trigonometry at each call site.
//  2. THE RAKE IS ONE ROTATION AND BOTH KINDS OF PROP TAKE IT. A box takes `rx: -RK`. A glyph
//     quad is built by `glyphs` as T · rotX(π/2) · S, so its raked form is T · rotX(π/2 − RK) · S
//     — one substitution, computed up front, not a matrix patched afterwards (which is what the
//     old code did, and why it could never carry more than a caption). Both give the same face
//     normal (0, sin RK, cos RK). Get this wrong and text skims the panel instead of lying on it.
//  3. LAYERS NEED LIFT, AND ONE MILLIMETRE IS NOT ENOUGH. Screen face, UI panel, glyph, at
//     .006 / .012 / .021 out from the screen centre. A bar a millimetre proud of an emissive
//     panel is a z-fight, and a z-fight on a screen flickers, which is worse than no UI at all.
//  4. REAL TEXT IS FREE; BLANK CELLS ARE NOT. Glyphs batch by (mesh, mode, atlas), so every
//     character in this zone joins the hall's existing mode-1 glyph batch and costs no extra draw
//     call. But `alpha < 0.999` drops a prop out of every batch permanently — the batch list is
//     built once, in `finish()` — so the shell's `slots()` habit of parking unused cells at
//     alpha 0 turns each one into its own draw call. Nothing here is ever translucent. A live
//     field that can come up short (flight numbers are five or six characters) keeps all six
//     cells opaque and paints the unused one in the row-background colour, on top of the row
//     background, where it is exactly invisible.
//  5. YOU CANNOT CALL THE SHELL'S SCHEDULE AT BUILD TIME. `A.statusOf`, `A.gateOf` and
//     `A.checkinOpen` are declared *below* `buildZones()` in js/airport.js, so they are in the
//     temporal dead zone while a zone builder runs, and calling one throws — into the registry's
//     catch, which then reports the zone exactly as if nobody had written it. `A.FLIGHTS` is
//     plain data declared at the top of the file and is safe; everything clock-dependent belongs
//     in the tick.
//  6. A CHARACTER THAT FIRST APPEARS AT 13:05 HAS NO ATLAS CELL. The sheet is drawn once, after
//     every scene has registered its text, and a glyph with no cell is drawn as a plain quad — a
//     white block in the middle of your display. Every character a live field can ever hold is
//     registered at build, below.
//
// ---------------------------------------------------------------------------------------------

(() => {
  // What the builder leaves for the tick. In a closure rather than at file scope: this file is
  // loaded as a plain script alongside forty others and a bare `const C` up here would be a new
  // global in everybody's way.
  let A = null;
  let rows = [], clockSlots = null;
  let printFill = null, printS = null, scanLine = null, scanS = null;
  let lastMin = -1, ckOpen = -1;

  const TAG = '自助值机·西';   // internal tag only; the player-facing name is 自助值机. `tagBox` is
                               // keyed on it and the shell already has a 自助值机 row 11 m east —
                               // one shared tag would give the cutaway a single box spanning both
                               // and hide the two banks as one object.

  const RK = .30;                                    // the screen rake, radians
  const CR = Math.cos(RK), SR = Math.sin(RK);
  // A point in a screen's own plane, in world space. See note 1.
  const at = (S, u, v, lift) => [S[0] + u, S[1] + v * CR + lift * SR, S[2] - v * SR + lift * CR];
  const L_BAR = .012, L_INK = .021;                  // see note 3

  const hhmm = m => {
    const w = ((Math.round(m) % 1440) + 1440) % 1440;
    return String(Math.floor(w / 60)).padStart(2, '0') + ':' + String(w % 60).padStart(2, '0');
  };

  AirFit['kiosks'] = _A => {
    A = _A;
    const { box, cap, glyphs, solid, blocker, shade, thing } = A;
    const { C, G, col } = A;

    // ---- the palette of a working screen
    const SCR = C('#0d2135');    // the display itself
    const BAR = C('#17395a');    // a field or list row behind content
    const HEAD = col.blueSign;   // the header strip, and the machines' own blue
    const INK = col.white;
    const DIM = C('#93b6d2');
    const GO = col.lime, WAIT = col.amber;
    ROWBG = BAR;

    // Text on a screen, placed character by character so a field can be left-anchored. A flight
    // list is columns, and centred columns are not columns.
    function write(S, u, v, text, o) {
      const size = o.size, step = size + (o.gap === undefined ? size * .14 : o.gap);
      const chars = [...text], out = [];
      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === ' ') continue;
        const cu = u + (o.left ? (i + .5) * step : (i - (chars.length - 1) / 2) * step);
        const [x, y, z] = at(S, cu, v, o.lift === undefined ? L_INK : o.lift);
        const g = glyphs(x, y, z, 0, chars[i], {
          size, gap: 0, color: o.color || INK, mode: 1,
          glow: o.glow === undefined ? .20 : o.glow, tag: TAG,
        })[0];
        g.m = M.mul(M.trans(x, y, z), M.mul(M.rotX(Math.PI / 2 - RK), M.scale(size, 1, size)));
        out.push(g);
      }
      return out;
    }
    // A panel on a screen: header strips, list rows, buttons, the progress bar.
    function panel(S, u, v, w, h, color, o = {}) {
      const [x, y, z] = at(S, u, v, o.lift === undefined ? L_BAR : o.lift);
      return box(x, y, z, w, h, .008, color, {
        tag: TAG, hard: true, rx: -RK, mode: 1, glow: o.glow === undefined ? .16 : o.glow,
      });
    }

    // ---- the atlas, up front. See note 6.
    Glyphs.need('0123456789:');
    Glyphs.need('ABCDEFGHIJKLMNOPQRSTUVWXYZ-');
    Glyphs.need('值机中未开放已截止取消');
    for (const f of A.FLIGHTS) Glyphs.need(f.no + f.to);

    // ---------------------------------------------------------------- the bank
    //
    // Three machines across the west end of the landside floor, facing +z — which is to say facing
    // the subway (DX = -20.20, in the +z wall), because that is where the passengers arrive and a
    // self-check-in bank is placed to be walked into. The row is a continuous barrier by design:
    // adjacent colliders are 0.78 m wide on a 0.82 m pitch, so the 0.04 m between two machines is
    // nothing a 0.30 m body could mistake for a way through, and there is no gap that looks
    // walkable and is not. The floor behind it, in front of the departure board, is reached round
    // the -z side of the 问询处 island, which is how it was reached before this was built.
    //
    // THREE, AND WHY. The zone is x -22.0 .. -19.0, but only 2.40 m of that is floor: the shell's
    // landside 洗手间 (airport.js, `toilets(-RX + .30, 5.20, -Math.PI/2)`) is a 4.60 m frontage
    // laid along z, and after the ry it occupies x -21.95 .. -21.45 from z 2.90 to 7.50, with its
    // west door box reaching x -21.40. This was built as four machines on a 0.74 m pitch first,
    // and the westmost one stood *inside* that wall — invisible from every angle except the one
    // camera that looks along the row, where it was a black slab across a third of the frame.
    // Four 0.62 m cabinets cannot be fitted into 2.40 m without overlapping each other, so the
    // constraint picks the count: three, and each 0.08 m wider than the four would have been,
    // which is 0.08 m more screen to write on.
    const KZ = 3.15;                       // the machines' centre line
    const KX0 = -20.90, PITCH = .82, N = 3;
    const CX = KX0 + PITCH * (N - 1) / 2;  // the bank's own centre, -20.08

    const screens = [];
    for (let i = 0; i < N; i++) {
      const kx = KX0 + i * PITCH;

      box(kx, .045, KZ, .74, .09, .54, col.slab,
        { tag: TAG, hard: true, gloss: .22, ...A.M_STONE });
      box(kx, .565, KZ, .70, .95, .48, col.white, { tag: TAG, hard: true, gloss: .30 });
      // The blue front panel every machine in a Chinese terminal wears. Nothing written on it:
      // the name is on the crown, where a name belongs.
      box(kx, .40, KZ + .247, .58, .56, .014, HEAD, { tag: TAG, hard: true, gloss: .30 });
      // The deck, projecting a little past the cabinet so there is somewhere to put a passport.
      box(kx, 1.07, KZ + .08, .70, .06, .36, col.steel,
        { tag: TAG, hard: true, gloss: G.metal, ...A.M_METAL });
      // 身份证 — the pad you lay the card on, and the lamp under it that says it is live.
      box(kx + .22, 1.105, KZ + .10, .17, .025, .12, C('#243040'),
        { tag: TAG, hard: true, gloss: .30 });
      box(kx + .22, 1.119, KZ + .10, .14, .006, .09, GO,
        { tag: TAG, hard: true, mode: 1, glow: .30 });
      // 护照 — a passport goes in face down and the strip under it reads the page.
      box(kx - .22, 1.100, KZ + .10, .21, .022, .15, C('#1b2530'),
        { tag: TAG, hard: true, gloss: .28 });
      box(kx - .22, 1.112, KZ + .10, .17, .006, .11, C('#63c6e0'),
        { tag: TAG, hard: true, mode: 1, glow: .26 });
      // 登机牌 out of the front, and the lip it lands on.
      box(kx, .875, KZ + .249, .34, .022, .02, col.black, { tag: TAG, hard: true, gloss: .20 });
      box(kx, .848, KZ + .269, .36, .014, .06, col.steelD,
        { tag: TAG, hard: true, gloss: G.metal, ...A.M_METAL });
      // Printed on the machine, not glowing on it: the screen colours are wrong here. Emissive so
      // the lettering keeps its contrast wherever the hall's light happens to be, but dark, and
      // with no glow at all — DIM on a white cabinet came out as a smudge.
      glyphs(kx, .790, KZ + .256, 0, '登机牌',
        { size: .046, gap: .010, color: C('#43505c'), mode: 1, glow: 0, tag: TAG });
      // Which machine this is. Terminals number them, and it is the only way to tell somebody at
      // the information desk which one has eaten your card.
      glyphs(kx + .265, 1.072, KZ + .262, 0, (i + 1) + '号',
        { size: .038, gap: .004, color: C('#3a4652'), mode: 1, glow: 0, tag: TAG });

      // The screen head: bezel centred on the rake, glass 28 mm out along it.
      const S = [kx, 1.37 + .028 * SR, (KZ + .23) + .028 * CR];
      box(kx, 1.37, KZ + .23, .70, .54, .05, col.charcoal,
        { tag: TAG, hard: true, rx: -RK, gloss: .34 });
      box(S[0], S[1], S[2], .64, .48, .012, SCR,
        { tag: TAG, hard: true, rx: -RK, mode: 1, glow: .09 });
      screens.push(S);

      // The crown over the screen, which is the sign you read from across the hall — 0.120 m
      // characters where the screen's largest line is 0.075, because a machine has to be findable
      // before anything on it can be read.
      box(kx, 1.80, KZ + .15, .68, .24, .05, HEAD, { tag: TAG, hard: true, gloss: .26 });
      glyphs(kx, 1.80, KZ + .176, 0, '自助值机',
        { size: .120, gap: .020, color: INK, mode: 1, glow: .12, tag: TAG });

      solid(kx - .39, kx + .39, KZ - .28, KZ + .28);
    }
    // Keep the third-person camera on the passenger side of the opaque bank. Without a camera
    // blocker a normal orbit from the arrival spawn could slide through the cabinet backs and
    // turn the whole viewport into three black rectangles.
    blocker(CX - 1.30, CX + 1.30, KZ - .33, 3.92, 3.25);

    // ---------------------------------------------------------------- what is on the screens
    //
    // Three machines, three states of the same errand, read east to west off the arriving
    // passenger: scan your card, choose your flight, take your boarding pass. 3号 is the one
    // nearest the camera and carries 请扫描身份证, because that is the sentence this whole fix
    // exists to make readable. The screen plane is 0.64 × 0.48, so u runs ±.32 and v runs ±.24.

    // Every screen wears the same header strip, which is what makes three different displays read
    // as three of the same machine.
    // Hands back the right-hand cells, so the one screen that wants a live clock there can keep
    // them rather than writing a second run of glyphs over the top of the first.
    // `gap` because the right-hand slot is Chinese on two of the three screens and a clock on the
    // third: every glyph is drawn in a square cell and the ink in a Latin one fills about half of
    // it, so at the Chinese spacing 10:01 comes out as 1 0 : 0 1. Same fix, and the same reason,
    // as the shell's gantry subtitles.
    const header = (S, right, gap = .007) => {
      panel(S, 0, .196, .64, .072, HEAD, { glow: .20 });
      write(S, -.310, .196, '自助值机', { size: .044, gap: .009, left: true });
      return write(S, .195, .196, right, { size: .036, gap, color: DIM });
    };

    // ---- 1号 · printing
    {
      const S = screens[0];
      printS = S;
      header(S, '打印中');
      write(S, 0, .068, '打印登机牌', { size: .084, gap: .013 });
      panel(S, 0, -.052, .50, .046, BAR, { glow: .10 });
      // Built at its full length and shrunk by the tick, never grown into it: `finish()` measures
      // a prop's cull sphere once, off the matrix it finds, and a bar built 2 cm wide would carry
      // a 2 cm radius for the rest of the run and be culled as too small to see at four metres —
      // while drawn 50 cm wide.
      printFill = panel(S, 0, -.052, .50, .030, GO, { glow: .34 });
      write(S, 0, -.155, '请稍候取走登机牌', { size: .036, gap: .007, color: DIM });
    }

    // ---- 2号 · the flight list, live off the shell's own schedule
    {
      const S = screens[1];
      clockSlots = header(S, '00:00', -.010);
      write(S, -.310, .118, '选择航班', { size: .062, gap: .011, left: true });
      // Three rows of always-opaque cells the tick rewrites — see note 4. Placeholder content is
      // real data off A.FLIGHTS so the row is the right shape before the first tick lands; the
      // status cannot be, because A.checkinOpen cannot be called from here (note 5).
      for (let r = 0; r < 3; r++) {
        const v = .016 - r * .098, f = A.FLIGHTS[r];
        panel(S, 0, v, .62, .088, BAR, { glow: .10 });
        const row = {
          // Six cells whatever the number is. Built with a filler character and then immediately
          // run through `setField`, which is the one place that knows how an unused cell is
          // hidden — so a five-character flight number looks right before the first tick lands,
          // and there is no second copy of that rule.
          no: write(S, -.300, v, '000000', { size: .038, gap: -.011, left: true }),
          to: write(S, -.126, v, f.to, { size: .045, gap: .005, left: true }),
          at: write(S, -.014, v, hhmm(f.dep), { size: .034, gap: -.009, left: true, color: DIM }),
          st: write(S, .130, v, '未开放', { size: .040, gap: .005, left: true, color: WAIT }),
        };
        setField(row.no, f.no, C('#cfe4f2'));
        rows.push(row);
      }
    }

    // ---- 3号 · scan your ID. Nearest the camera, and the largest line in the zone.
    {
      const S = screens[2];
      scanS = S;
      header(S, '第一步');
      write(S, 0, .062, '请扫描身份证', { size: .075, gap: .011 });
      write(S, 0, -.048, '请将证件放在感应区', { size: .034, gap: .007, color: DIM });
      panel(S, 0, -.155, .34, .110, BAR, { glow: .12 });
      scanLine = panel(S, 0, -.155, .31, .009, GO, { glow: .40, lift: .019 });
    }

    // ---------------------------------------------------------------- the bank in the room
    // The inlay slab the machines stand on, the same move the shell makes under its own row.
    // 2.60 and not wider: at 2.90 its west end reached x -21.53 and ran into the toilet block's
    // door box, which starts at -21.40 — two coplanar slabs on the floor, which is a z-fight.
    box(CX, .06, KZ + .10, 2.60, .12, 1.60, col.slab, { hard: true, gloss: .24 });
    shade(CX, KZ + .10, 3.2, 2.2, .22);

    // The header over the bank. Every wayfinding sign in this terminal is bilingual (see the
    // shell's `gantry`) and this one is no different: 0.175 m Chinese over 0.085 m Latin, white
    // on the blue the whole building navigates by. Hung at 2.98 rather than the gantries' 4.45
    // because it names the fitting under it rather than a direction down the hall.
    box(CX, 2.98, 3.86, 2.10, .44, .09, HEAD, { tag: TAG, hard: true, gloss: .24 });
    for (const s of [-1, 1])
      cap(CX + s * .78, (3.20 + A.H) / 2, 3.86, .015, A.H - 3.20, .015, col.steelD,
        { gloss: G.metal });
    glyphs(CX, 3.05, 3.910, 0, '自助值机',
      { size: .175, gap: .050, color: INK, mode: 1, glow: .10, tag: TAG });
    glyphs(CX, 2.870, 3.910, 0, 'SELF CHECK-IN',
      { size: .085, gap: -.024, color: C('#bcd0e4'), mode: 1, glow: .08, tag: TAG });
    // Lettered on the +z face only, unlike the shell's `gantry`, which letters both. A gantry
    // hangs over a walkway and is read from either end; this hangs over the machines and the only
    // approach it names is the one off the subway. The far side of it faces the machines' own
    // backs and the departure board, where the sign would be telling you about a bank you are
    // standing behind. Four glyphs saved, and the crowns are one-sided for the same reason.

    // On the floor in front, laid flat and read walking in off the subway. `glyphs` stands its
    // quads up; a floor decal wants the un-stood-up matrix. With the reader approaching from +z
    // the glyph's own axes already agree with the world's — u along +x, v along +z — so unlike
    // the shell's 登机口 band there is no rotation left to apply, only the scale.
    for (const g of glyphs(CX, .012, 4.42, 0, '自助值机',
      { size: .200, gap: .060, color: C('#cfdde6'), mode: 1, tag: TAG }))
      g.m = M.mul(M.trans(g.m[12], .012, 4.42), M.scale(.200, 1, .200));

    thing('自助值机', CX, 1.78, KZ + .58, '我在自助值机上打印登机牌。',
      'I print my boarding card at the self-service machine.',
      '自助 self-service + 值机 check-in. 扫描 to scan, 身份证 ID card, 打印 to print, ' +
      '登机牌 boarding card.',
      { tag: TAG, focus: [CX, 4.20], reach: 2.4 });
  };

  // A fixed run of always-opaque character cells. A cell the text does not reach is painted in
  // the row background rather than hidden, because `alpha < 0.999` would drop it out of the glyph
  // batch for good and turn a blank cell into a draw call. See note 4.
  let ROWBG = null;
  function setField(ps, txt, color) {
    for (let i = 0; i < ps.length; i++) {
      if (i >= txt.length || txt[i] === ' ') { ps[i].ch = '0'; ps[i].color = ROWBG; continue; }
      ps[i].ch = txt[i];
      if (color) ps[i].color = color;
    }
  }

  // Anything that moves registers here and the shell dispatches it once a frame. Do not start
  // your own timer: `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in
  // minutes. A tick that throws is dropped for the rest of the run rather than stopping the
  // terminal.
  AirFit['kiosks'].tick = (t, body, clock) => {
    if (!A) return;
    // Rewrites a prop's matrix in place. `cx/cy/cz` are kept in step with it out of the same
    // habit the shell's belt bags follow, but they are not what the cull reads: build.js packs
    // every prop's centre and radius into a Float32Array once, in `finish()`, and an animated
    // prop is expected to move inside the bounding sphere it was built with. Both of the props
    // moved here travel a few centimetres inside a sphere a quarter of a metre across.
    const place = (p, x, y, z, sx, sy, sz) => {
      p.m = M.mul(M.trans(x, y, z), M.mul(M.rotX(-RK), M.scale(sx, sy, sz)));
      p.cx = x; p.cy = y; p.cz = z;
    };

    // ---- 4号: the reader sweeps. One matrix a frame, and it is the whole difference between a
    // machine that is switched on and a photograph of one.
    if (scanLine && scanS) {
      const [x, y, z] = at(scanS, 0, -.155 + Math.sin(t * 1.7) * .038, .019);
      place(scanLine, x, y, z, .31, .009, .008);
    }
    // ---- 1号: the boarding pass comes out. Six seconds a card, which is about what one takes.
    // Anchored at the left edge of its 0.50 m trough, so the bar grows rather than spreading.
    if (printFill && printS) {
      const w = .02 + .48 * ((t % 6) / 6);
      const [x, y, z] = at(printS, -.25 + w / 2, -.052, L_BAR);
      place(printFill, x, y, z, w, .030, .008);
    }

    // ---- 3号: the flight list. Rewritten only when the minute changes. The cells are batched
    // glyphs whose `ch` the draw loop re-reads every frame, so a change costs the write and
    // nothing else — but there is no reason to do it sixty times a second either.
    if (typeof clock !== 'number' || !rows.length) return;
    const mins = Math.floor(clock);
    if (mins === lastMin) return;
    lastMin = mins;

    if (clockSlots) setField(clockSlots, hhmm(mins), null);

    // The check-in window, learned off the shell the first time rather than restated here. There
    // is one definition of "opens three hours out, shuts forty-five minutes out" in this building
    // and it is A.checkinOpen; a second copy in this file is a copy that goes stale the day the
    // shell changes its mind. It cannot be learned at build time — see note 5.
    if (ckOpen < 0) {
      const f = A.FLIGHTS[0], dep = f.dep + f.late;
      ckOpen = 180;
      for (let k = 600; k >= 0; k--) if (A.checkinOpen(f, dep - k)) { ckOpen = k; break; }
    }

    const fs = A.FLIGHTS, col = A.col, C = A.C;
    // The next three services this machine can still do anything about, in departure order, and
    // wrapping into tomorrow so the list is never short at nine at night.
    let start = 0;
    while (start < fs.length && fs[start].dep + fs[start].late <= mins - 20) start++;
    for (let r = 0; r < rows.length; r++) {
      const f = fs[(start + r) % fs.length], dep = f.dep + f.late, row = rows[r];
      setField(row.no, f.no.padEnd(6, ' '), C('#cfe4f2'));
      setField(row.to, f.to, col.white);
      setField(row.at, hhmm(dep), f.late ? col.rose : C('#93b6d2'));
      // The kiosk's own question is not the board's. The board says whether the aeroplane is
      // going; this says whether this machine will check you onto it, which is a narrower window
      // and the only thing a passenger standing here can act on.
      let zh = '未开放', c = col.amber;
      if (f.cancelled) { zh = '已取消'; c = col.rose; }
      else if (A.checkinOpen(f, mins)) { zh = '值机中'; c = col.lime; }
      else if (mins > dep - ckOpen) { zh = '已截止'; c = C('#7c8b99'); }
      setField(row.st, zh, c);
    }
  };
})();
