// 🟡 Platform edge · PSD — The yellow line, the tactile 盲道 strip, the screen-door piers and the next-train board
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    platform edge, z = 3.30 (EDGEZ)
//   camera  97c-board
//
// The yellow line, the tactile 盲道 strip, the screen-door piers and the next-train board. The
// board content READS the Schedule agent's trainAt() — never cache a copy of it.
//
// ---------------------------------------------------------------------------------------------
// WHAT IS ALREADY IN js/metro.js, AND WHY THIS FILE IS ADDITIVE
//
// METRO.md's roster says this agent "builds the yellow line, tactile strip, screen-door piers and
// the board". EVERY ONE OF THOSE IS ALREADY BUILT — Wave 0's split left the whole platform edge in
// the shell and the plan was never corrected, exactly as it was never corrected for the gate line
// (see the same note at the head of js/metro-gates.js). Measured, not assumed:
//
//   metro.js:1286  the yellow line — flat(0, .006, EDGEZ-.62, RX*2, .16, col.yellow), z 2.60..2.76,
//                  with 51 steel studs along it at y .012.
//   metro.js:1289  the dark tactile strip inboard of the edge, z 2.79..3.01, mode 9.
//   metro.js:1293  edgeLamps — 25 候车灯 set into the floor at z 2.775..2.825, chased by the
//                  shell's own tick off the timetable.
//   metro.js:1312  the SIX piers at PIERX = [-6.40,-3.84,-1.28,1.28,3.84,6.40], .70 x 2.20 x .10,
//                  ribbed steel at matScale .60.
//   metro.js:1330  the four 灯箱 poster boxes on the inner piers (y .30..1.58).
//   metro.js:1367  the five 号门 door-number plates on the jambs (y 1.655..1.865).
//   metro.js:1375  the fixed glazing and the sliding leaves — THE DOORS AGENT'S, not this file's.
//   metro.js:1416  the painted queue mark at each door — flat(dx, .007, EDGEZ-.90, .64, .06).
//   metro.js:1418  the steel header (y 2.16..2.44), metro.js:1428 the 号线色 blue band.
//   metro.js:1455  the TWO next-train boards at model x ±2.35, y 2.50..3.02, with their 下一班 /
//                  之后 / 开往 rows, the four-slot terminus and the twelve marching LEDs.
//   metro.js:1485  solid(-RX, RX, EDGEZ-.18, RZ) — the collider that stops you at the edge.
//   metro.js:1992  the 盲道 cross run behind the yellow line, x -2.71..2.71, z 2.15..2.45.
//   metro.js:2288  writeBoard(train), called from the shell's own tick at metro.js:2508.
//
// So NOTHING here rebuilds a pier, a lamp, a poster box, a door number or a board row. Laying a
// second yellow line on the first is 13 m of z-fighting directly in front of everybody waiting.
// What was genuinely missing is what is in this file:
//
//   1. THE BOARD NEVER SAYS WHAT THE TRAIN IS DOING. It says when the next one is due and where
//      it is going, and those are facts about the timetable. A platform board's other half is the
//      state of the train in front of you — 列车即将进站 / 车门即将关闭 — and this station had
//      nowhere to put it. That is the one thing on this platform that changes in the next thirty
//      seconds, and it is what 97c-board is pointed at.
//   2. 先下后上 IS SIMULATED AND NEVER SAID. js/metro-crowd.js:700 already makes a queue stand
//      aside for somebody coming out of a doorway, and there was not one mark on this floor that
//      told a passenger to. It is the most characteristic marking on a Beijing platform.
//   3. 黄线 IS ANNOUNCED AND UNTEACHABLE. The PA says 请在黄线内候车 (metro.js:2442). Thirteen
//      metres of yellow line has been painted on this floor since the station existed with no
//      label on it and no entry in vocab.js.
//
// ---------------------------------------------------------------------------------------------
// THE BOUNDARY WITH TWO LIVE NEIGHBOURS — stated so it is on the record
//
// The Doors agent owns the 屏蔽门 SLIDING LEAVES and the door numbers, in the openings between the
// piers. The Platform agent owns everything behind the tactile strip — columns, benches, bins, the
// fire cabinet, 当心站台间隙. This file touches neither:
//
//   * nothing here is built between y 0.09 and y 2.20 at |z - EDGEZ| < .10, which is the entire
//     volume the leaves and the fixed glazing slide in;
//   * nothing here carries the word 屏蔽门 or a door number — both are the Doors agent's;
//   * nothing here is built at z < 1.60, which is where the columns, the benches and the station
//     name inlay are;
//   * NO COLLIDER IS ADDED ANYWHERE. `solid` is not called once in this file. See the walkability
//     note below for why that is a decision and not an omission.
//
// The exact ground occupied is:
//
//   * INSIDE the two board panels, y 2.720..2.805, z 3.243, at model x ±2.35 ±.30 — the gap the
//     shell left between its own 下一班 and 之后 rows. Nothing of anyone else's is in the panels.
//   * the floor, y .0042...0060, z 1.65..2.05, at x dx ±.55 for each of the five DOORX.
//   * two thing() labels, at (3.84, .12, 2.68) and (−2.56, .12, 1.85).
//
// Nothing else. In particular this file NO LONGER occupies any part of the steel header at
// y 2.315..2.44 — see the note on the status strip for why it moved off it and who has it now.
//
// ---------------------------------------------------------------------------------------------
// THE m0 RULE
//
// The twelve status slots are rewritten every time the train changes phase, so all twelve are
// registered through `A.rest`. They are rewritten by `ch` and `color` ONLY — metro.js:203 is
// explicit that those two are the fields that cost nothing to change — so no matrix here ever
// moves and none of them can be snapped back to a matrix nobody meant.
//
// That is a decision, not a coincidence. The shell's own board has to PARK a slot when a field
// gets shorter (metro.js:2281: a blank is a parked glyph, because a transparent quad still writes
// depth), and parking needs the PARKED matrix, which lives in the shell's closure and is not on
// `A`. So every one of the six status strings below is EXACTLY SIX CHARACTERS. Nothing ever has
// to be blanked, and this file needs no parked matrix at all.
//
// ---------------------------------------------------------------------------------------------
// THE BOARD READS, IT DOES NOT REMEMBER
//
// `tick` calls `A.trainAt(clock)` every frame and keeps no copy of it. The shell's own tick calls
// the same pure function on the same clock two statements later (metro.js:2500) and hands it to
// `writeBoard`, so the strip and the board it hangs under are two readings of one function and
// cannot disagree — which is the whole reason METRO.md:325 insists trainAt stays pure. The WRITE
// happens on a phase CHANGE, not every frame: six of a possible six characters are unchanged for
// minutes at a time, and rewriting them at 60 Hz would be sixty pointless atlas lookups a second.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET — what this actually spends
//
//   42 props, 0 translucent, 0 colliders, 2 things.
//
// Deliberately far under the 160 allowed, because the zone was already built: props spent here
// would mostly have been a second copy of something already on this floor. Of the 42, 34 are
// glyph quads (which batch since the atlas cell became per-instance) and 8 are floor quads
// sharing the station's own granite-inlay idiom. No new `mat`, `matScale`, `round` or `bevel`
// value is introduced anywhere in this file, so no new batch is started — and there is no box in
// it at all now that the status line sits inside a panel the shell had already built.
//
// ZERO COLLIDERS. `solid` is never called here, which is what makes the walkability result below
// a structural guarantee rather than a measurement that has to be repeated: this file cannot
// narrow the platform and cannot swallow a thing()'s focus point, because it adds nothing for
// clampMove to inflate by the 0.30 m body radius.
//
// ---------------------------------------------------------------------------------------------

// What the strip says, one entry per phase of trainAt(). SIX CHARACTERS EACH, without exception —
// see the m0 note at the head of this file for why that is load-bearing rather than tidy.
//
// The wording is the station's own. 列车即将进站 is the first half of the sentence the PA already
// says (metro.js:2442, 列车即将进站，请在黄线内候车), and 黄线内侧候车 is the second half of it cut
// to the plate — so the board, the PA and the paint on the floor are one voice, which METRO.md:325
// asks for and which is the only reason to hang a board at all.
//
// Colour is per instance and therefore free (metro.js:203), so each phase gets its own: the two
// amber ones are the two that mean move, the green one means you may board, and the dim blue-grey
// is the shell's own 之后 colour, for the thirty-nine minutes of the hour when nothing is due.
const EDGE_STATUS = {
  away:      ['黄线内侧候车', '#6f8598', .16],
  approach:  ['列车即将进站', '#ffc24a', .40],
  opening:   ['车门正在打开', '#4fd68c', .36],
  berthed:   ['上下车请当心', '#4fd68c', .34],
  closing:   ['车门即将关闭', '#f0a83c', .42],
  departing: ['列车正在出站', '#8fa7bd', .22],
};

// The two things the tick needs that live on `A`: the timetable it must READ every frame, and the
// colour constructor. Captured by the builder rather than reached for, because `A` is the
// builder's argument and the tick is called by the shell with a signature of its own.
let edgeTrainAt = null, edgeC = null;

MetroFit['edge'] = A => {
  const { box, flat, thing } = A;
  const { C, col } = A;
  const { EDGEZ, DOORX, WALK } = A;
  edgeTrainAt = A.trainAt; edgeC = C;
  // Cleared because the phase this file last WROTE is module state and the slots it wrote are not:
  // if the station is ever rebuilt (a second Lazy build, a reload of the scene) the new slots come
  // up carrying the build-time `away` string while `edgePhase` still remembers whatever the old
  // ones were showing. The tick would then see no change, write nothing, and leave a berthed train
  // under a plate saying 黄线内侧候车 until the phase happened to move.
  edgePhase = null;

  // ---------------------------------------------------------------- 地面字 characters lying flat
  // `glyphs()` stands its quads up — the chain ends in rotX(π/2) — which is right for a wall and
  // wrong for the ground, so floor characters are built the way metro.js:1538 builds the
  // station-name inlays and js/metro-gates.js:136 builds the gate arrows: registered with the
  // atlas, then given a matrix of translate · rotY · scale and pushed straight into the prop list.
  //
  // `pd` is the direction the READER is walking. For somebody walking +z the viewer's left is
  // world +x, so the text has to run DOWN in x or it reads backwards — the trap metro.js:1536
  // names, and the same one the yaw-π faces spring one axis over.
  function floorText(cx, y, z, text, size, color, pd) {
    const chars = [...Glyphs.need(text)];
    const step = size * 1.18, span = (chars.length - 1) * step;
    for (let i = 0; i < chars.length; i++) {
      A.props.push({
        mesh: 'quad', ch: chars[i], color, mode: 0, gloss: .28, alpha: 1,
        m: M.mul(M.trans(cx - pd * (-span / 2 + step * i), y, z),
             M.mul(M.rotY(pd > 0 ? Math.PI : 0), M.scale(size, 1, size))),
      });
    }
  }

  // ---------------------------------------------------------------- 先下后上 on the floor
  // The rule a Beijing platform is run on, and the one this station simulates without ever saying:
  // js/metro-crowd.js:700 already refuses to let a commuter step into a doorway somebody is coming
  // out of. The floor is where that instruction belongs — it is read by the person standing on it
  // and by nobody else, which is what makes it different from an announcement.
  //
  // A granite band with the characters cut pale into it, which is the idiom this station already
  // uses for its own name (metro.js:1531) and for the gate arrows (metro-gates.js:200) — so all
  // three read as one station's signwriting rather than three agents' handwriting.
  //
  // EVERY NUMBER BELOW IS MEASURED OFF WHAT IS ALREADY PAINTED ON THIS FLOOR, not chosen:
  //
  //   z: the band sits on WALK.spine, taken from the shell rather than retyped, so it moves if the
  //      walking lane does. That is EDGEZ - 1.45 = 1.85, and the .40 m band spans z 1.65..2.05.
  //      Which is the ONLY clear cross-platform strip left at the doors: the station-name inlay
  //      ends at z 1.58 (metro.js:1530) and the 盲道 cross run starts at z 2.15 (metro.js:1992).
  //   x: 1.10 m wide, and the width is what the 盲道 leaves. The tactile path comes UP the platform
  //      at x -0.75 and its flat is .30 wide (metro.js:1989), so it occupies x -.90..-.60 all the
  //      way to z 2.30 — straight through the middle door's floor. A 1.30 m band on the centre
  //      door would have had a yellow corduroy strip laid across the last character of it. At 1.10
  //      the centre band stops at x -.55 and clears the paving by 5 cm.
  //
  // All five doors get the same band rather than three: five identical bands are one batch, and a
  // platform that instructs you at three doors out of five is a platform that has been patched.
  const QZ = WALK.spine;                       // EDGEZ - 1.45 = 1.85, the shell's own walking lane
  for (const dx of DOORX) {
    flat(dx, .0042, QZ, 1.10, .40, col.granite, { gloss: .30 });
    flat(dx, .0046, QZ, 1.00, .30, C('#565a60'), { gloss: .34 });
    // pd = 1: read by somebody standing on the spine facing the train, which is everybody who is
    // waiting. The band is read on the way to the door, not on the way off it.
    floorText(dx, .0054, QZ, '先下后上', .15, col.floorL, 1);
  }

  // ---------------------------------------------------------------- 运行状态 the status strip
  // What the board never said. The two boards over the doors carry 下一班 / 之后 / 开往 and a
  // countdown, all of which are facts about the TIMETABLE. None of them is a fact about the train
  // standing in front of you, and on a real platform that is the line people actually read: the
  // doors are about to close, or the train is coming in, or there is no train and you should be
  // behind the yellow line.
  //
  // WHERE IT GOES — and this moved once, for a reason worth recording.
  //
  // It was FIRST built on the steel header, at y 2.324..2.432: the 12.5 cm of bare steel left
  // between the top of the 号线色 blue band (2.315) and the top of the header (2.44). That band is
  // the obvious home for it and it rendered correctly. It is also, it turns out, the only clear
  // band on the header — and js/metro-doors.js:192 says so in almost the same words, because the
  // Doors agent independently put the 屏蔽门 door-interlock lamp there in the same hour, at
  // `box(dx, 2.375, EDGEZ-.089, .30, .085, .028)`, one per door. A 1.36 m plate centred at x ±2.35
  // spans 1.67..3.03 and −3.03..−1.67, which swallows the lamps over doors 4 and 2 whole. Two
  // agents, one band, and the picture showed a red interlock lamp sitting inside the word 列车.
  //
  // THIS FILE MOVED RATHER THAN THE LAMP, and the tie-break is not seniority: their prop has a
  // positional constraint and this one does not. A door-interlock lamp that is not over its own
  // door is not a door-interlock lamp. A status line can be read anywhere on the board it belongs
  // to. So the line moved into the BOARD PANEL, which METRO.md:203 gives this agent outright
  // ("Owns the board content") and which no other agent has any claim on.
  //
  // The panel is 2.40 x .52 at y 2.50..3.02 (metro.js:1456). What is already in it:
  //   y 2.824..2.956  the 下一班 row — .098 for the words but .132 for the time and the countdown,
  //                   which is what actually sets its height;
  //   y 2.600..2.700  the 之后 / 开往 / terminus row, .100 at its tallest;
  //   y 2.505..2.555  the twelve marching LEDs.
  // That leaves 12.4 cm between the two rows, y 2.700..2.824, and 6.4 cm above the top row. The
  // line goes in the larger gap at y 2.762, 8.5 cm tall, clearing the row above and the row below
  // by 2 cm each — and it reads in the right order, because a status line between "the next train"
  // and "the one after" is a fact about the train those two are counting down to.
  //
  // z is the shell's own board face (metro.js:1446), so the status line sits in exactly the plane
  // the rest of the board's lettering does. No backing box: the panel behind it is already there,
  // which is two props saved and one less thing to keep aligned with a neighbour.
  const FACE = EDGEZ - .045;                   // the shell's own `face`; glyphs() lifts .012 more
  const SLOTS = 6;                             // fixed — see the m0 note at the head of this file
  const STEP = .118;
  const strips = [];
  for (const MX of [-2.35, 2.35]) {
    const row = [];
    for (let i = 0; i < SLOTS; i++) {
      // Screen x, converted once. yaw π mirrors x, so a glyph at screen offset `o` from the
      // plate's centre sits at model x = MX - o — the same conversion metro.js:1447 makes, made
      // here for the same reason: so the layout below reads left to right like the text does.
      const o = -(SLOTS - 1) * STEP / 2 + i * STEP;
      // Built through A.glyphs one character at a time, so each slot is its own prop and can be
      // rewritten by `ch` the way the shell rewrites its board rows. Built showing the `away`
      // string rather than a placeholder: the first tick overwrites it, but a station screenshot
      // taken before one has run should read as a station and not as 候候候候候候.
      const p = A.glyphs(MX - o, 2.762, FACE, Math.PI, EDGE_STATUS.away[0][i],
        { size: .085, gap: 0, color: C(EDGE_STATUS.away[1]), mode: 1,
          glow: EDGE_STATUS.away[2] })[0];
      // Registered even though nothing here ever moves. metro.js:2712 gives every zone prop its
      // m0 in the same pass for the same reason, and the next person to make one of these slide
      // should not have to remember to come back and add the call.
      A.rest(p);
      row.push(p);
    }
    strips.push(row);
  }

  // Every character this strip will ever show, registered with the atlas AT BUILD TIME. This is
  // not defensive: `Glyphs.need` is what allocates a character its cell (js/glyphs.js:22), and a
  // character first asked for at runtime invalidates the sheet mid-frame. The shell gets away with
  // writing 进站 into a board built from '00分' (metro.js:2290) only because 进 and 站 are already
  // in the sheet from the gate banners — which is luck, and is not a thing to rely on twice.
  for (const k in EDGE_STATUS) Glyphs.need(EDGE_STATUS[k][0]);

  // ---------------------------------------------------------------- 黄线 / 先下后上, the words
  // Two labels, and only two: this platform already carries 地铁 at x 0 and 信号 at x 5.45, and a
  // fifth label within arm's reach of those turns the edge into a wall of prompts.
  //
  // Both are anchored 12 cm off the floor for the reason the shell gives for 盲道 (metro.js:1998):
  // a label anchored ON the floor projects to the player's own feet and the discovery test then
  // finds it behind their body.
  //
  // The focus points are chosen to be FAR FROM THE TWO THAT ARE ALREADY HERE. thing('地铁') focuses
  // at [0, 1.90] and thing('信号') at [5.45, 2.45]; these two sit at [2.56, 1.85] and [-2.56, 1.85],
  // which is 2.56 m from the nearest of them. Two labels sharing a spot is how a word goes quiet.
  // 黄线 stands in front of the PIER at x 3.84, not at a door. It was at door 4 (x 2.56) until the
  // Doors agent landed thing('屏蔽门') at focus [2.56, 2.40] — 55 cm from this one, on the same x.
  // Two labels that close share a discovery test, and the loser of that test is a word that is
  // never read. In front of the pier the nearest neighbours are 屏蔽门 at 1.31 m and 信号 at 1.65 m,
  // and it is still standing on the yellow line, which is the only thing this label has to be on.
  thing('黄线', 3.84, .12, EDGEZ - .62, '请在黄线内候车。',
    'Please wait behind the yellow line.',
    '黄 yellow + 线 line. It is what the announcement means by 黄线内 — the platform side of it. ' +
    '候车 is to wait for a train, 站台 is the platform itself.',
    { focus: [3.84, EDGEZ - 1.20], reach: 1.3 });
  // On the band it is painted on, at door 2. Nearest neighbour is 按钮 at 1.16 m, so the reach is
  // pulled in to 1.3 for the same reason.
  thing('先下后上', DOORX[1], .12, QZ, '先下后上，别挤。',
    'Let them off first, then get on. Do not push.',
    '先 first + 下 off + 后 after + 上 on. Painted at every door in Beijing, and it is a real ' +
    'instruction rather than a slogan: the crowd on this platform stands aside for it.',
    { focus: [DOORX[1], QZ], reach: 1.3 });

  MetroFit['edge'].strips = strips;            // read-only, for the harness. See the note below.
};

// Anything that moves registers here and the shell dispatches it once a frame, BEFORE the shell's
// own train placement, so you can read the clock it is about to act on. Do not start your own
// timer. `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in minutes.
// A tick that throws is dropped for the rest of the run rather than stopping the station.
//
// The six colours are built ONCE, on the first tick, and kept — `C` allocates, and a tick that
// called it would allocate six times a second for the life of the run to produce the same six
// answers. Everything after that writes two scalar fields and a character per slot.
let edgePhase = null;
const edgeCol = {};
MetroFit['edge'].tick = (t, body, clock) => {
  const strips = MetroFit['edge'].strips;
  if (!strips || !edgeTrainAt) return;
  // READ, never cache. The shell asks the same pure function the same question two statements
  // later (metro.js:2500) and hands the answer to writeBoard, so these cannot drift apart.
  const phase = edgeTrainAt(clock).phase;
  if (phase === edgePhase) return;             // refresh on CHANGE, not every frame
  edgePhase = phase;
  const s = EDGE_STATUS[phase] || EDGE_STATUS.away;
  const c = edgeCol[phase] || (edgeCol[phase] = edgeC(s[1]));
  for (const row of strips)
    for (let i = 0; i < row.length; i++) {
      row[i].ch = s[0][i];
      row[i].color = c;
      row[i].glow = s[2];
    }
};
