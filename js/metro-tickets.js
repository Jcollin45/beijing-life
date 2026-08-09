// 🎟️ Ticket machines — The three TVMs and the 票价表 fare table
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    concourse, z -5.2..-4.0 around x -3.3
//   camera  92-tickets, 92b-faretable, 94c-machine
//
// ---------------------------------------------------------------------------------------------
// HOW THE SCREENS STOPPED LYING — this is improvement 3, and this is the note to read
//
// The shell (js/metro.js, the 自动售票机 section) builds three machines whose screens are one
// transaction each, frozen halfway through, with the destination and the fare written into the
// source as literals. Its own comment says the quiet part out loud:
//
//     "Static, because a touchscreen nobody can touch that changed by itself would be a worse
//      lie than one that does not move."
//
// That is the right worry and the wrong conclusion. There are three separate lies in a frozen
// screen and only one of them is about movement:
//
//   1. IT DOES NOT KNOW WHERE IT IS. The room is every station on the line — `setStation` rewrites
//      the hanging signs, the floor inlays, the map ring and the way out. The ticket machines were
//      the one fixture that went on saying "商务区 · 三元" while you stood in 商务区. A machine
//      that offers to sell you a ticket to the station you are standing in is not decorative, it
//      is wrong. **This is the lie that mattered most and it has nothing to do with animation.**
//   2. THE NUMBERS WERE COPIES. 三元/四元/五元 were literals that happened to agree with
//      `FARES` in js/game.js on the day they were typed. Inserting 动物园 into the middle of the
//      line already broke that agreement once (see the shell's own note about 机场 moving from
//      five stops to six). Here the fare is computed — legs from the current station, then the
//      same band table game.js uses — so the screen cannot drift from the till.
//   3. NOTHING EVER CHANGED. A machine that is genuinely idle is not frozen: it cycles. Every
//      TVM in Beijing runs an attract loop when nobody is at it, and stops the moment somebody
//      is. So the three screens page through the destinations on the line, two apart from each
//      other so no two ever show the same journey — and **a machine you walk up to holds.**
//      `tick` gets `body`; standing at one freezes that screen and leaves the other two cycling.
//      That is not a touchscreen changing by itself. That is a touchscreen noticing you.
//
// The 票价表 above them gets the same treatment: it is now the ring, station by station, off
// `A.STATIONS` — every other station on the line with its distance in 站 and its fare in 元, and
// a 本站 header naming where you are. It rewrites when the station changes.
//
// WHAT THIS FILE DOES TO THE SHELL'S PROPS, AND WHY THAT IS NOT AN EDIT TO js/metro.js
//
// The shell still builds the old screens; Wave 0 carved out the registry, not the content, and
// js/metro.js is the Mech's file alone. So this zone PARKS the shell's screen and fare-board
// content — every prop tagged 售票机 in front of the bezel face, and every glyph on the fare
// board — and builds its own in the same recess. Parking happens inside the builder, which runs
// BEFORE `finish()`, so the parked props get their cull data from the parked matrix and cost
// nothing at all afterwards. `parked()` reports the count; if a future extraction moves that code
// into this file the park finds nothing, and everything below still stands on its own.
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
// Every rewritable cell here is registered, and none of them is ever MOVED: a field that comes up
// short paints its spare cells the colour of the panel behind them rather than parking them.
// Two reasons, and the second is the one that bites. First, `alpha < 0.999` drops a prop out of
// every batch permanently — the batch list is built once, in `finish()` — so the shell's habit of
// blanking with transparency would turn each spare cell into its own draw call. Second, parking
// by matrix only works for props whose cull sphere was measured from a REAL matrix at `finish`;
// park one at build time and its radius is measured as zero, and it never comes back.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET — read this before you add anything
//
// Budget 160 props, 8 translucent. This zone spends 160 and 0. Everything on a screen is an
// opaque mode-1 box or an opaque mode-1 glyph quad, so the whole zone folds into two batches the
// room already had. The tick allocates nothing and writes only `ch`, `color` and `glow` — never a
// matrix, never on a frame where nothing changed.
//
//   * Props BATCH by mesh + mode + corner radius + bevel + textures. Colour, gloss, alpha and
//     glow travel per instance and are free. Vary those; never vary `round`/`bevel`/`mat`.
//   * Glyphs DO batch now (2026-08-04, the atlas cell became a per-instance attribute). Real
//     Chinese on a screen is cheap and this is a game about reading Chinese.
//   * A CHARACTER THAT FIRST APPEARS AT 13:05 HAS NO ATLAS CELL — the sheet is drawn once per
//     room build and a glyph with no cell renders as a white block. Every character any live
//     field here can ever hold is registered with `Glyphs.need` at build, below.
//
// `node .fpscheck.js metro` must stay under 16.7 ms median.
//
// ---------------------------------------------------------------------------------------------

(() => {
  // What the builder leaves for the tick. In a closure rather than at file scope: this file is
  // loaded as a plain script alongside forty others and a bare `const C` up here would be a new
  // global in everybody's way.
  let A = null;
  const TAG = '售票机';        // the shell's own tag, on purpose: hovering the 售票机 thing lights
                               // the whole machine, screen included, the way it always did.
  const TAGB = '票价表';       // the board is its own object and lights on its own.

  // The bank, off the shell's own geometry. At closure scope because the tick needs it too.
  const MACHX = [-3.36, -2.24, -1.12];

  // The three machines, and the board. Filled by the builder, read by the tick.
  const MACH = [];             // { k, held, dots[], cur[], dest[], legs, fare }
  let board = null;            // { cur[], rows[] }
  let curHz = null;            // the station this zone last wrote itself for
  let hereAt = 0;              // ...and its index in the ring, kept so the tick never re-scans
  let parkedCount = 0;
  let getHz = null;

  // ---------------------------------------------------------------- 票价 the fare
  // Mirrors `FARES` in js/game.js (`const FARES = [3, 3, 4, 4, 5, 5]`, indexed by legs - 1 and
  // clamped to the length of the line). Three kuai for a stop or two, four for three or four,
  // five for the length of the line. The three places that have to agree are this table, that
  // one, and the board — so this one is written as the same shape rather than as three literals,
  // and a stop inserted into the middle of `A.STATIONS` moves all of it at once.
  const FARES = [3, 3, 4, 4, 5, 5];
  const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const fareFor = legs => FARES[Math.min(Math.max(legs, 1), FARES.length) - 1];

  // ---------------------------------------------------------------- the screen's palette
  // Held at file scope so the tick can repaint a spare cell the colour of the panel under it.
  let SCR, HEAD, FIELD, BOARD, INK, DIM, GOLD, CYAN, DOTOFF, GO, OFF;

  MetroFit['tickets'] = _A => {
    A = _A;
    const { box, glyphs, thing } = A;
    const { C, G, col } = A;

    SCR    = C('#10293a');     // the display itself
    HEAD   = C('#2b6f86');     // the header strip — the shell's own blue, kept
    FIELD   = C('#071a26');    // a chosen value sits on a darker field than the screen
    BOARD  = C('#1b2c3f');     // the fare board behind the table
    INK    = C('#e9f4f8');
    DIM    = C('#9cc4d2');
    GOLD   = C('#ffd66b');
    CYAN   = C('#7fd8e0');
    DOTOFF = C('#3d6577');
    GO     = C('#2f7d52');
    OFF    = C('#3b4a54');

    // ---- the coordinate contract, off the shell's own numbers rather than copied constants.
    // The machines are three consoles against the -z wall between the stairs and the line map:
    // MACHX from the shell's bank, MBZ their back, MFZ their front. Everything on this wall
    // builds outward in +z — the machine's back is against the tile and its screen is on the far
    // side of its own body, which is the trap the shell's comment warns about.
    const RZ = A.RZ;
    const MFZ = -RZ + .72;                       // the console face, MBZ + .30
    // Layers off that face, and two rules about them. One millimetre is not enough: a bar a
    // millimetre proud of an emissive panel is a z-fight, and a z-fight on a screen flickers,
    // which is worse than no screen at all. And `glyphs` applies a 12 mm LIFT of its own unless
    // you tell it not to — left at the default, ink on this screen would have floated 32 mm off
    // the glass and swum against the bezel as the camera moved. Everything below passes lift 0
    // and states its own plane, so there are three ink planes rather than one: SZG for text lying
    // on a panel, SZF for text lying on the bare screen 10 mm further back, and FCG (declared with
    // the machines) for the two buttons, which are on the fascia and not on the glass at all.
    const SZ0 = MFZ + .050;                      // the screen field, front face at + .056
    const SZ1 = MFZ + .064;                      // panels on it, front face at + .068
    const SZ2 = MFZ + .076;                      // the line-strip dots, which stand proud of the bar
    const SZG = MFZ + .076, SZF = MFZ + .066;    // ink, on a panel and on the bare field
    const FZ = -RZ + .14;                        // the fare board's frame
    const BZ0 = FZ + .045, BZ1 = FZ + .062;      // its field, front face at + .053, and its ink

    // ---- the atlas, up front. See the note at the head of this file: every character any live
    // field can ever hold, not just the ones showing at build.
    Glyphs.need('本站到票价表元买确认取消');
    Glyphs.need(NUM.join(''));
    for (const s of A.STATIONS) Glyphs.need(s.hz);

    // ================================================================ parking the old screens
    // See the note at the head of this file. Two windows, both measured off the shell's own
    // geometry rather than guessed:
    //
    //   * anything tagged 售票机 standing in front of the bezel face (z > MFZ + .040) is screen
    //     content — the lit field, the header band, the line strip, the 到/车费 fields and the
    //     two buttons. The card pad (MFZ - .10), the coin and note slots (MFZ + .01), the ticket
    //     tray (MFZ) and the card somebody left on the middle machine are all behind that plane
    //     and are left exactly where they are: they are the machine, not the screen.
    //   * every glyph on the fare board — a thin z slice at the -z wall, boxed to the board's own
    //     extent in x and y. Nothing else in the room is a character in that volume: the stairwell
    //     is at x < -3.9, the line map at x ≈ 3.0, and the 出口 sign at x = -5.10.
    //   * and the board's navy field itself, which is the one that bit. Left standing it occupies
    //     exactly the z this zone's own field wants (FZ + .045, 20 mm deep against 16), so the two
    //     interpenetrate and the shell's wins by a millimetre in places. That does not just look
    //     bad — it breaks the blanking, because a spare cell painted the colour of the panel it is
    //     lying on is only invisible if the panel it is lying on is the one you think. The frame
    //     behind it (FZ, 60 mm deep) is good geometry and stays.
    const PARKED = M.trs(0, -60, 0, 0, .001, .001, .001);
    for (const p of A.props) {
      if (!p.m) continue;                        // a glow pool carries no matrix of its own
      const z = p.m[14], x = p.m[12], y = p.m[13];
      const screen = p.tag === TAG && z > MFZ + .040;
      const fare = p.ch && z > FZ + .055 && z < FZ + .095
        && x > -3.90 && x < -0.30 && y > 1.88 && y < 2.72;
      const navy = !p.ch && Math.abs(x + 2.24) < .02 && Math.abs(y - 2.26) < .02
        && z > FZ + .030 && z < FZ + .060;
      if (screen || fare || navy) { p.m = PARKED; parkedCount++; }
    }

    // ---------------------------------------------------------------- writing on a screen
    // One prop per character, LEFT-ANCHORED from `x`, because a field that can come up short has
    // to blank its tail rather than shuffle what is left: shuffling means moving a matrix, and a
    // moved matrix means the m0 dance for no gain on a four-cell field.
    //
    // `bg`/`bgGlow` are the panel this cell is lying on. A spare cell is painted in them and is
    // then exactly invisible while staying opaque, and an opaque prop stays in its batch.
    function field(x, y, z, n, size, step, o) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const p = glyphs(x + i * step, y, z, 0, '站',
          { size, gap: 0, lift: 0, color: o.color, mode: 1, glow: o.glow, tag: o.tag || TAG })[0];
        p.ink = o.color; p.inkGlow = o.glow;
        p.bg = o.bg; p.bgGlow = o.bgGlow;
        A.rest(p);                    // the m0 rule: registered even though nothing moves it
        out.push(p);
      }
      return out;
    }
    // A run of fixed text, laid out the same way so a label and the field beside it share a grid.
    function label(x, y, z, text, size, step, color, glow, tag) {
      const chars = [...text];
      for (let i = 0; i < chars.length; i++)
        glyphs(x + i * step, y, z, 0, chars[i],
          { size, gap: 0, lift: 0, color, mode: 1, glow, tag: tag || TAG });
    }

    // ================================================================ 自动售票机 the three screens
    //
    // THE LEDGE, which is the thing that has to be designed around and was not visible until the
    // shot was rendered and read. The shell's console shelf is `box(mx, 1.20, MFZ - .10, .92, .07,
    // .34, rx: .38)` — a raked plate, and a raked plate is much bigger than its own dimensions.
    // Rotated .38 rad it spans y 1.1045 .. 1.2955 and reaches forward to z = MFZ + .0708, which is
    // in front of every layer of this screen. So a 19 cm band across the middle of the bezel is not
    // screen at all: it is the deck you put your bag on, standing in front of the glass.
    //
    // The shell's own comment says "the console shelf, raked toward you, and the screen standing
    // ABOVE it" — and then centres the bezel on the shelf at y 1.20 and writes from 1.012 to 1.395,
    // straight through it. The first render of this zone had 到 机场 sawn in half by a grey ledge,
    // which is what the shell's own halfway-transaction screen must have looked like too; nobody
    // had photographed it. Measured, not guessed, and the layout now lives in the two bands the
    // shelf leaves: 1.30 .. 1.44 above it and 0.92 .. 1.10 below.
    //
    // What goes where follows from what has to be READ. At 1.5 m the field is 190 px across, so a
    // .076 character is 22 px and a .034 one is 10. The destination and the fare — the two facts a
    // ticket machine exists to state — take the big type in the lower band, where the eye already
    // is; the header and the line strip take the upper band; and 确认/取消 drop onto the fascia
    // below the bezel as physical buttons, which is where the buttons on a real one are anyway.
    const FCZ = MFZ - .014, FCG = MFZ - .002;   // the fascia below the bezel, and ink on it
    for (let i = 0; i < 3; i++) {
      const mx = MACHX[i];
      const m = { k: i * 2, held: false, dots: [], cur: null, dest: null, legs: null, fare: null };

      box(mx, 1.180, SZ0, .66, .52, .012, SCR, { tag: TAG, hard: true, mode: 1, gloss: .10, glow: .10 });

      // ---- ABOVE THE LEDGE. The header band: 买票 on the left, and on the right the station you
      // are standing in. 本站 is the row that answers lie 1 — every other fixture in this room
      // knows which station it is; until now the machines did not.
      box(mx, 1.400, SZ1, .62, .070, .008, HEAD, { tag: TAG, hard: true, mode: 1, gloss: .10, glow: .26 });
      label(mx - .283, 1.400, SZG, '买票', .044, .052, C('#eaf6f8'), .18);
      label(mx + .005, 1.400, SZG, '本站', .034, .040, C('#b8d9e3'), .14);
      m.cur = field(mx + .098, 1.400, SZG, 4, .044, .052,
        { color: C('#f4fbfd'), glow: .20, bg: HEAD, bgGlow: .26 });

      // ---- the line, as a bar with a dot for every station on it. Seven, off `A.STATIONS`, so a
      // district added later is a dot here for free — the shell's version drew six by hand and lit
      // an arbitrary one. The dot you are standing at is white, the one this machine is offering is
      // gold, and the stops in between are lit: the strip is the distance the fare row is charging
      // for, which is what makes the two halves of the screen one sentence.
      // At y 1.330 with 36 mm dots it clears the top of the shelf (1.2955) by 16 mm.
      box(mx, 1.330, SZ1, .50, .018, .008, C('#2f5a6b'), { tag: TAG, hard: true, mode: 1, gloss: .10, glow: .16 });
      const n = A.STATIONS.length, step = .468 / Math.max(1, n - 1);
      for (let k = 0; k < n; k++)
        m.dots.push(box(mx - .234 + k * step, 1.330, SZ2, .036, .036, .008, DOTOFF,
          { tag: TAG, hard: true, mode: 1, gloss: .10, glow: .12 }));

      // ---- BELOW THE LEDGE. 到, and the name of the station this machine is offering, on a field
      // of its own so it reads as a chosen value rather than as more of the same blue. Its top is
      // 1.091, 13 mm under the shelf.
      box(mx, 1.052, SZ1, .60, .078, .008, FIELD, { tag: TAG, hard: true, mode: 1, gloss: .10, glow: .10 });
      label(mx - .262, 1.052, SZG, '到', .046, .046, DIM, .16);
      m.dest = field(mx - .180, 1.052, SZG, 4, .076, .088,
        { color: GOLD, glow: .26, bg: FIELD, bgGlow: .10 });

      // ---- how far, and what it costs. The two numbers the 票价表 exists to teach, and the two
      // this machine had no excuse for not saying. Straight onto the screen, so SZF.
      m.legs = field(mx - .240, .968, SZF, 1, .062, 0, { color: INK, glow: .20, bg: SCR, bgGlow: .10 });
      label(mx - .168, .968, SZF, '站', .056, 0, DIM, .16);
      m.fare = field(mx + .050, .968, SZF, 1, .072, 0, { color: GOLD, glow: .30, bg: SCR, bgGlow: .10 });
      label(mx + .128, .968, SZF, '元', .062, 0, GOLD, .24);

      // ---- 确认 and 取消. Green and grey, the green one brighter, because on a real machine the
      // one you are meant to press is lit. On the fascia at y .898 — under the bezel (which stops
      // at .92) and over the coin slot (which starts at .87), the only 5 cm of the front of this
      // machine that is not already something.
      box(mx - .150, .898, FCZ, .27, .046, .012, GO, { tag: TAG, hard: true, mode: 1, gloss: .10, glow: .32 });
      label(mx - .172, .898, FCG, '确认', .036, .044, C('#e8f7ec'), .22);
      box(mx + .168, .898, FCZ, .23, .046, .012, OFF, { tag: TAG, hard: true, mode: 1, gloss: .10, glow: .14 });
      label(mx + .148, .898, FCG, '取消', .034, .040, C('#c3ced4'), .12);

      MACH.push(m);
    }

    // ================================================================ 票价表 the fare table
    //
    // The shell's board was three distance bands — 一两站三元 / 三四站四元 / 五六站五元 — which is
    // true and is not a fare table: it makes you work out how many stops away 机场 is before it
    // will tell you anything. A Beijing concourse hangs the line itself, station by station, with
    // the price from HERE beside each one. So this is the ring off `A.STATIONS` minus the station
    // you are in, in two columns, with a 本站 header naming where that is.
    //
    // 1.36 m from the 92b-faretable camera and 3.06 m of board across a 4.0 m frame, so a .092
    // character is about 29 px: this is where the dense reading goes, and the machines below keep
    // the big type for the two facts you need at arm's length.
    const BG = { bg: BOARD, bgGlow: .05, tag: TAGB };
    box(-2.24, 2.26, BZ0, 3.06, .84, .016, BOARD,
      { tag: TAGB, hard: true, mode: 1, gloss: .10, glow: .05 });
    label(-3.66, 2.570, BZ1, '票价表', .115, .140, C('#f2f7fa'), .16, TAGB);
    label(-3.16, 2.570, BZ1, '本站', .072, .086, C('#9fc0d8'), .12, TAGB);
    board = {
      cur: field(-2.94, 2.570, BZ1, 4, .092, .108, { ...BG, color: C('#ffe9b0'), glow: .20 }),
      rows: [],
    };
    // One row per destination, which is every station on the line but the one you are in — so the
    // board is sized off `A.STATIONS` and not off a 6 somebody has to remember to change. The stop
    // inserted into the middle of this line once already left the machines, this board and
    // `FARES` disagreeing; a district added next year is a row here and nothing else.
    const NROW = Math.max(1, A.STATIONS.length - 1), PERCOL = Math.ceil(NROW / 2);
    const RSTEP = Math.min(.220, .660 / PERCOL);
    for (let r = 0; r < NROW; r++) {
      const cx = r < PERCOL ? -2.98 : -1.32, cy = 2.345 - (r % PERCOL) * RSTEP;
      board.rows.push({
        name: field(cx - .680, cy, BZ1, 4, .092, .110, { ...BG, color: C('#dfe8ee'), glow: .12 }),
        legs: field(cx - .160, cy, BZ1, 1, .082, 0, { ...BG, color: C('#dfe8ee'), glow: .12 }),
        fare: field(cx + .200, cy, BZ1, 1, .092, 0, { ...BG, color: GOLD, glow: .22 }),
      });
      label(cx - .060, cy, BZ1, '站', .082, 0, C('#9fc0d8'), .10, TAGB);
      label(cx + .300, cy, BZ1, '元', .082, 0, GOLD, .18, TAGB);
    }

    // The board is worth reading, so it is worth pointing at. The machine below already teaches
    // 售票机/单程票/交通卡; this one teaches the two words the table is made of.
    thing('票价表', -3.45, 2.40, FZ + .12, '去机场的票价是五元。',
      'The fare to the airport is five kuai.',
      '票价 the fare — 票 ticket + 价 price. 站 is both a station and a stop: 六站 is six stops.',
      { focus: [-3.45, -RZ + 1.55], reach: 2.4 });

    // ---- the first write. `A.STATIONS[0]` is where `setStation` starts the room, and the tick
    // takes over on the first frame — but a shot with no `pre` block never ticks at all, so the
    // build cannot leave a screenful of placeholders behind and hope.
    paint(A.STATIONS[0].hz);
    curHz = null;                // ...and the tick still does its own first pass, whatever happens
  };

  // ---------------------------------------------------------------- writing a value into a field
  // Fills the cells it has text for and paints the rest out. Never moves anything: see the m0 note
  // at the head of the file for why a spare cell is repainted rather than parked.
  function put(slots, text) {
    const chars = [...text];
    for (let i = 0; i < slots.length; i++) {
      const p = slots[i];
      if (i < chars.length) { p.ch = chars[i]; p.color = p.ink; p.glow = p.inkGlow; }
      else { p.color = p.bg; p.glow = p.bgGlow; }
    }
  }

  // Which stations this machine can sell you a ticket to: every stop on the line except the one
  // the room currently is. Recomputed only when the station changes, and into a kept array, so
  // the tick allocates nothing.
  const dests = [];
  function paint(hz) {
    const S = A.STATIONS;
    let here = S.findIndex(s => s.hz === hz);
    if (here < 0) here = 0;
    hereAt = here;
    dests.length = 0;
    for (let i = 0; i < S.length; i++) if (i !== here) dests.push(i);

    // ---- the board: where you are, and the price of everywhere else from here.
    put(board.cur, S[here].hz);
    for (let r = 0; r < board.rows.length; r++) {
      const row = board.rows[r], di = dests[r];
      if (di === undefined) { put(row.name, ''); put(row.legs, ''); put(row.fare, ''); continue; }
      const legs = Math.abs(di - here);
      put(row.name, S[di].hz);
      put(row.legs, NUM[legs] || '');
      put(row.fare, NUM[fareFor(legs)] || '');
    }
    // ---- and the three machines, each on its own page of the same list.
    for (let i = 0; i < MACH.length; i++) { put(MACH[i].cur, S[here].hz); page(i, here); }
  }

  // One machine's current offer. Everything on the screen that names a journey is written here,
  // and it is written only when the page turns.
  function page(i, here) {
    const S = A.STATIONS, m = MACH[i];
    const di = dests[m.k % dests.length];
    if (di === undefined) return;
    const legs = Math.abs(di - here);
    put(m.dest, S[di].hz);
    put(m.legs, NUM[legs] || '');
    put(m.fare, NUM[fareFor(legs)] || '');
    // The strip. White where you are, gold where this ticket goes, lit in between — so the dots
    // between the two are literally the 站 the row below is charging for.
    const lo = Math.min(here, di), hi = Math.max(here, di);
    for (let k = 0; k < m.dots.length; k++) {
      const d = m.dots[k];
      if (k === here) { d.color = INK; d.glow = .42; }
      else if (k === di) { d.color = GOLD; d.glow = .46; }
      else if (k > lo && k < hi) { d.color = CYAN; d.glow = .30; }
      else { d.color = DOTOFF; d.glow = .12; }
    }
  }

  // Anything that moves registers here and the shell dispatches it once a frame, BEFORE the shell's
  // own train placement, so you can read the clock it is about to act on. Do not start your own
  // timer. `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in minutes.
  // A tick that throws is dropped for the rest of the run rather than stopping the station.
  //
  // Nothing is allocated here and nothing is written on a frame where nothing changed: a screen
  // redrawn sixty times a second to say the same thing is pure waste.
  const DWELL = 3.6;                  // seconds a destination stays up on an idle machine
  MetroFit['tickets'].tick = (t, body, clock) => {
    if (!board) return;

    // ---- which station this is. The shell owns it and `A` has no getter yet (see the tickets in
    // the report), so it is read off the module's own public API — which by tick time is long
    // since built, because this tick is dispatched from inside it. Resolved once and kept.
    if (!getHz) {
      getHz = (typeof Metro !== 'undefined' && Metro && typeof Metro.stationAt === 'function')
        ? () => Metro.stationAt().hz
        : () => A.STATIONS[0].hz;
    }
    const hz = getHz();
    if (hz !== curHz) { curHz = hz; paint(hz); }

    // ---- the attract loop, and the one thing that makes it not a lie: it stops for you.
    //
    // A machine somebody is standing at holds whatever it is showing. The bank is a continuous
    // run of colliders (each console is solid over mx ± 0.52 on a 1.12 m pitch, and clampMove
    // inflates every one of them by the 0.30 m body radius), so the nearest a body can get to the
    // console face is z = -4.14 — which is the test below, with the width of one machine either
    // side of its centre.
    const near = body && body.z > -4.60 && body.z < -3.72;
    for (let i = 0; i < MACH.length; i++) {
      const m = MACH[i];
      m.held = !!(near && Math.abs(body.x - MACHX[i]) < .56);
      if (m.held) continue;
      // Two apart, always, so no two of the three ever offer the same journey — the thing that
      // made the old bank read as a showroom. Off the index rather than off a time offset,
      // because a phase added to a wall clock of 1e12 seconds (which is what the audit's `pre`
      // hands this tick) rounds three machines onto the same page.
      const k = (Math.floor(t / DWELL) + i * 2) % dests.length;
      if (k !== m.k) { m.k = k; page(i, hereAt); }
    }
  };

  // Read-only, for the harness and for anybody wondering whether the park found the shell's old
  // screens or silently found nothing. See the note at the head of this file.
  MetroFit['tickets'].parked = () => parkedCount;
  // What the glass actually SAYS, read back off the props rather than off the intent — a cell that
  // has been painted out is dropped, which is the same test the eye makes. An animation nobody can
  // measure is an animation that quietly stops working, and so is a screen.
  const read = slots => slots.map(p => (p.color === p.ink ? p.ch : '')).join('');
  MetroFit['tickets'].reads = () => ({
    board: {
      here: read(board.cur),
      rows: board.rows.map(r => read(r.name) + ' ' + read(r.legs) + '站 ' + read(r.fare) + '元'),
    },
    screens: MACH.map(m => read(m.cur) + ' → ' + read(m.dest)
      + ' ' + read(m.legs) + '站 ' + read(m.fare) + '元' + (m.held ? ' [held]' : '')),
  });
  MetroFit['tickets'].shows = () => MACH.map((m, i) => {
    const di = dests[m.k % Math.max(1, dests.length)];
    const s = A.STATIONS[di];
    return { at: MACHX[i], held: m.held, to: s && s.hz,
             legs: di === undefined ? 0 : Math.abs(di - hereAt),
             fare: di === undefined ? 0 : fareFor(Math.abs(di - hereAt)) };
  });
})();
