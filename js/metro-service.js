// 🛎️ Service centre — 服务中心
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    concourse, z -5.2..-4.0, +x side
//   camera  92c-service
//
// 服务中心. IMPROVEMENT 2 LANDS HERE: the clerk is a prop relief today, not an NPC, and the metro
// has ZERO dialogue lines in the whole scene. Build her as a real NPC. Teaches 交通卡 / 充值 / 问路.
//
// The camera IS the acceptance test, and the metro's shots are stronger than any other scene's:
// many carry a `pre` block that drives the REAL machinery — Metro.tick, Metro.openGate,
// Metro.placeTrain, g.tickStation — so a passing shot is a passing state machine, not just a
// pretty picture. Render yours with `node .audit.js 92c-service`, open the PNG, and look at it.
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
// =============================================================================================
// WHAT THIS FILE ADDS, AND THE ONE THING IT HAD TO WORK AROUND
//
// The shell already builds the window: the piers, the header, the sill, the glazing, the
// speak-hole, the 服务中心 board, the 补票/问路 labels, the 交通卡 on the ledge — and a clerk.
// Her, though, is the placeholder the plan is about. She is a 6 cm slab, two balls for shoulders,
// a neck and a head, all `mode: 1` charcoal at alpha .86, which through a backlit window comes out
// as a pale grey lump: not dark enough to be a silhouette, not shaped enough to be a person.
//
// This file puts a person in front of her. Not instead of — js/metro.js is the Mech's file and
// nothing here reaches into it — but *in front of*, at x 5.98..6.20 where the relief sits at
// 6.13..6.19, with a silhouette deliberately sized to cover hers from the only direction the
// window is ever read from. She is opaque and lit; the relief behind is translucent and unlit, so
// wherever the two overlap the depth test throws the relief away and what is left is the person.
//
// The margins are the thing to keep if you edit this. Every piece here was sized against the
// relief's own numbers, listed at the top of `clerk()`, and the animation amplitudes were then
// chosen to stay inside those margins: she leans about the same stool the shell leans hers about,
// but a little further, and "a little further" is bounded by how much of her the hair and the
// sleeves have to spare. Push the lean and the relief comes out from behind her as a grey wing.
//
// The axis that matters is the shell's finding and it is still true: the window is in the +x wall
// and read from -x, so nothing that moves along x can be seen. Everything animated here moves in
// y or z — the lean across the opening, the sit-up, the eyes tracking you along the glass, and the
// blink. That is also why she has no yaw: turning her to face you would be a rotation nobody in
// the room could see.
//
// The rest of the zone is the furniture a 服务中心 has and this one did not: the notice board, the
// 失物招领 case, the pass-through tray, the counter that was a shelf stuck to a wall, the desk
// behind the glass she actually works at, and the 一米线 on the floor that says where to stand —
// which is the same spot her `thing` focuses on, so the queue mark is not decoration.
//
// THE DIALOGUE IS NOT HERE. js/talk.js belongs to the Scribe. What this file can do — and does —
// is make her a selectable person with a sentence to say at her; the tree that answers back is
// posted as a ticket. See the note above `thing('值班员', ...)` for exactly what is missing.
// ---------------------------------------------------------------------------------------------

MetroFit['service'] = A => {
  const { box, cyl, ball, cap, flat, glyphs, thing, shade, light } = A;
  const { C, G, col } = A;

  // ---------------------------------------------------------------- the shell's own numbers
  // Read off js/metro.js rather than guessed. Everything below is positioned against these, so if
  // the Mech ever moves the window these are the only lines that change.
  const svz = -3.60;                    // the window's centre line
  const SVX = A.RX - .30;               // 6.10  the wall the window is cut into
  const SVF = SVX - .17;                // 5.93  the public face of that wall
  const GLASS = SVF + .035;             // 5.965 the inside face of the pane. NOTHING may cross it.
  const LEDGE = 1.12;                   // the top of her desk, and the bottom of the opening
  const SHELF = 1.035;                  // the top of the public counter
  const CZ = svz - .08;                 // -3.68 her centre line — the shell's clerk pivot z
  const PX = SVX + .06, PY = 1.21, PZ = CZ;   // the pivot itself: the base of the stool
  // The pier the notice board and the lost-property case go on: x 5.93..6.27, z -5.05..-4.19. Two
  // things already claim part of it and both are the shell's: the 服务中心 board runs back to
  // z -4.40 above y 2.14, and 补票 is lettered on the frame at z -4.455..-4.225. So the clear
  // strip is z -5.05..-4.47, and everything mounted here is 56 cm wide and centred in it.
  const PZC = -4.76, PZW = .56;
  // Where you stand to be served. Inside the collider's reach: the shell's `solid` runs from
  // x 5.61, clampMove inflates it by the 0.30 m body radius, so the closest a body can get is
  // x 5.31. The mark is at 5.15, which leaves 16 cm of slack and 0.85 m of clear run behind it.
  const STANDX = 5.15;

  // ---------------------------------------------------------------- 制服 the uniform
  // The same navy the 站务员 out on the concourse wears (js/data.js), on purpose: the two of them
  // are the same staff, and a clerk in a different colour reads as somebody who wandered in.
  const UNI = C('#293e5b'), UNID = C('#1f3049'), SHIRT = C('#e8edf0'), SCARF = C('#8b3547');
  const SKIN = C('#d8a87f'), SKIND = C('#c08e66'), HAIR = C('#27221f');
  const LIP = C('#a4574a'), EYEW = C('#efeae0'), LAMPG = C('#4fd68c');
  const SV = { tag: '服务中心' };        // the window's own tag, for the parts that are the window
  // Hers, so clicking her selects *her* and not the counter — and 值班员 rather than 服务员, which
  // was the first thing tried and was a real bug. `服务员` is the diner waitress's own hz
  // (js/data.js:246) and it carries her USE definition (js/data.js:1413, `点菜`), so the prompt at
  // this window came up as 点菜 · "order — she hands you the menu". A word is not free to reuse
  // across scenes when the verb table is keyed on it. 值班员 appears nowhere else in the game, it
  // is what a Beijing station calls the person on the window, and it is already what her own desk
  // plate says.
  const HER = { tag: '值班员' };

  // Everything that moves, collected as it is built. Registered with `A.rest` at the end so the
  // shell captures each one's rest matrix in the same pass it captures its own.
  const BODY = [], HEAD = [], EYES = [], LIDS = [], ARM = [];

  // =============================================================== 服务员 the clerk
  //
  // The relief this has to cover, straight out of js/metro.js — every number here is a bound:
  //
  //   torso     x 6.13..6.19   y 1.210..1.510   z -3.930..-3.430
  //   shoulders x 6.13..6.19   y 1.415..1.585   z -3.975..-3.785 and -3.575..-3.385
  //   neck      x 6.13..6.19   y 1.528..1.623   z -3.704..-3.656
  //   head      x 6.13..6.19   y 1.593..1.817   z -3.782..-3.578
  //   forearm   x 6.01..6.17   y 1.118..1.173   z -3.535..-3.325
  //
  // Read from -x, so covering means covering in y and z and standing in front in x. The margins
  // that came out of it are 1.0–2.2 cm at the head, 2–4 cm at the torso, and 3 mm at the tightest
  // corner of a shoulder — which is what caps the lean amplitude down in the tick.

  // ---- 上身 the tunic. 42 cm across at the chest, which is a person; the relief's 50 cm is not.
  // The extra width the relief has is covered by the sleeves, where on a real seated figure the
  // width at that height actually comes from.
  BODY.push(box(6.07, 1.375, CZ, .13, .43, .42, UNI, { gloss: .14, ...HER }));
  BODY.push(box(6.003, 1.375, CZ, .012, .40, .046, UNID, { hard: true, gloss: .20, ...HER }));
  // ---- 肩 the shoulders, and the 肩章 that say what she is. Transit staff in this game wear
  // shoulder tabs (js/fig-uniform.js) and they are the one piece of the uniform that survives
  // being seen through tinted glass at three metres.
  for (const s of [-1, 1]) {
    BODY.push(ball(6.07, 1.505, CZ + s * .20, .062, .105, .100, UNI, { gloss: .14, ...HER }));
    BODY.push(box(6.060, 1.580, CZ + s * .170, .100, .016, .100, UNID,
      { hard: true, gloss: .22, ...HER }));
    BODY.push(box(6.045, 1.590, CZ + s * .170, .050, .008, .022, col.gold,
      { hard: true, gloss: G.metal, ...HER }));
    // ---- 袖子 the upper arms, hanging where a seated person's do. These are what carry the
    // silhouette out to the relief's edges: z -4.018..-3.883 and -3.478..-3.343.
    BODY.push(box(6.075, 1.355, CZ + s * .270, .115, .35, .135, UNI, { gloss: .14, ...HER }));
  }
  // ---- 领子 the collar, the shirt inside it, and the 丝巾. A red neckerchief at the throat is
  // the single most legible thing on a Chinese service uniform at any distance, which is why it
  // is here and a name badge you could never read is not.
  // The first pass made these 29 cm and 15 cm wide and they merged into one white bib across her
  // whole chest, with the 丝巾 lost behind it. Narrowed to a collar you can see the two points of,
  // a small V of shirt under it, and the scarf brought up and forward so the red is the thing at
  // her throat rather than a patch somewhere under her chin.
  BODY.push(box(6.022, 1.546, CZ, .070, .062, .210, SHIRT, { gloss: .10, ...HER }));
  BODY.push(box(6.012, 1.506, CZ, .046, .095, .105, SHIRT, { gloss: .10, ...HER }));
  BODY.push(ball(6.000, 1.534, CZ, .034, .040, .052, SCARF, { gloss: .12, ...HER }));
  BODY.push(box(5.996, 1.478, CZ, .020, .078, .054, SCARF, { gloss: .12, ...HER }));
  // ---- 工牌 the works pass, clipped to the chest. Too small to letter; a pale card with a red
  // band is what one looks like from the other side of the glass.
  BODY.push(box(6.001, 1.408, CZ - .115, .014, .070, .050, col.cream,
    { hard: true, gloss: .18, ...HER }));
  BODY.push(box(5.996, 1.428, CZ - .115, .006, .018, .050, col.red,
    { hard: true, gloss: .18, ...HER }));
  // ---- 脖子 the neck. Wider than the relief's, because it also has to bridge the gap the sit-up
  // opens between the collar and the chin.
  BODY.push(cap(6.045, 1.585, CZ, .085, .130, .085, SKIN, { gloss: .08, ...HER }));

  // ---- 前臂 the forearms on the ledge, and the hands on the ends of them. Not on the lean — an
  // arm resting on a counter stays on the counter while its owner shifts behind it, which is the
  // shell's own finding and it is right. They get a slower clock of their own further down, and
  // the hands ride exactly the same matrix: a hand given an offset of its own came off the cuff.
  //
  // These two also occupy most of her desk — x 6.005..6.205 from z -4.03 to -3.25 — which is what
  // the layout behind the glass had to be planned around. A clerk's ledge is mostly clerk.
  ARM.push(box(6.100, 1.155, CZ + .280, .19, .086, .30, UNI, { gloss: .14, ...HER }));
  ARM.push(box(6.110, 1.155, CZ - .220, .19, .086, .26, UNI, { gloss: .14, ...HER }));
  ARM.push(ball(6.040, 1.164, CZ + .100, .050, .038, .062, SKIN, { gloss: .08, ...HER }));
  ARM.push(ball(6.050, 1.164, CZ - .310, .048, .036, .058, SKIN, { gloss: .08, ...HER }));

  // ---- 头 the head. 11.6 cm deep because it is read face-on, 23 cm across because the relief's
  // is 20.4 and this has to cover it with enough left over for the lean.
  HEAD.push(ball(6.055, 1.712, CZ, .058, .120, .115, SKIN, { gloss: .07, ...HER }));
  // ---- 头发 the hair: a cap over the crown and back, a fringe, a 盘发 bun behind. The cap is the
  // widest thing on her at 24.8 cm, and it is the piece that buys the lean its room.
  HEAD.push(ball(6.085, 1.748, CZ, .066, .118, .124, HAIR, { gloss: .12, ...HER }));
  // The fringe was a 5.5 cm slab across the full width of the brow and it turned the whole head
  // into a visor: a dark bar over two dark eyes is a mask, not a face. Thinner, higher, and 3 cm
  // narrower, so there is forehead between the hair and the brows for the face to sit on.
  HEAD.push(box(6.012, 1.812, CZ, .050, .032, .150, HAIR, { gloss: .12, ...HER }));
  HEAD.push(ball(6.140, 1.762, CZ, .046, .052, .058, HAIR, { gloss: .12, ...HER }));
  for (const s of [-1, 1]) {
    HEAD.push(ball(6.052, 1.700, CZ + s * .098, .038, .078, .038, HAIR, { gloss: .12, ...HER }));
    // The ears were 4 cm across and stood at the widest point of the head, which read as a pair
    // of headphone cups. An ear seen almost edge-on is a few millimetres of anything.
    HEAD.push(ball(6.056, 1.714, CZ + s * .106, .013, .023, .011, SKIN, { gloss: .07, ...HER }));
    // ---- 脸 the face. Eyes first, then the lid that comes down over them, then the brow.
    // Bigger and 8 mm closer together than the first pass: on a head this wide — and it is this
    // wide because it has to cover the relief — small eyes set far apart read as a doll. The
    // pupil is nearly half the white now, which is what makes a gaze legible at three metres.
    HEAD.push(ball(6.001, 1.727, CZ + s * .038, .008, .019, .026, EYEW, { gloss: .30, ...HER }));
    EYES.push(ball(5.996, 1.725, CZ + s * .038, .007, .013, .015, col.black,
      { gloss: .34, ...HER }));
    LIDS.push(box(5.987, 1.764, CZ + s * .038, .018, .040, .056, SKIN, { gloss: .07, ...HER }));
    HEAD.push(box(6.000, 1.782, CZ + s * .039, .012, .010, .050, HAIR, { gloss: .10, ...HER }));
  }
  HEAD.push(ball(5.998, 1.702, CZ, .014, .026, .017, SKIND, { gloss: .08, ...HER }));
  HEAD.push(box(5.999, 1.660, CZ, .009, .011, .040, LIP, { gloss: .16, ...HER }));

  // ---- and one warm light inside the booth, so she is lit rather than glowing. The relief is
  // `mode: 1` — unlit — which is most of why it reads flat; everything above is `mode: 0` and
  // wants something to be lit by. Short radius so it stays a pool at the window instead of a
  // second sun on the concourse.
  light(6.02, 1.98, svz, C('#fff0d6'), .52, 1.45);

  // =============================================================== 窗口里面 her side of the glass
  // The desk she works at, and the layout is dictated rather than chosen: the ledge runs
  // x 5.98..6.26 and z -4.17..-3.03, and her two forearms take x 6.005..6.205 from z -4.03 to
  // -3.25 of it. What is left is a 22 cm bay at the +z end, a 12 cm one at -z, and a 5 cm strip
  // along the back. Everything below is inside those, because an object drawn through her sleeve
  // is worse than no object at all.
  //
  // 台账 the ledger, open, with the 印章 beside it. A Beijing service window runs on a paper
  // register and a red seal, and those two objects are most of what makes this room not a bank.
  box(6.080, 1.132, -3.190, .18, .024, .110, col.redD, { hard: true, gloss: .20, ...SV });
  box(6.080, 1.146, -3.190, .16, .010, .095, col.cream, { hard: true, gloss: .14, ...SV });
  box(6.080, 1.152, -3.190, .010, .008, .095, col.red, { hard: true, gloss: .20, ...SV });
  cyl(6.226, 1.162, -3.200, .022, .072, col.redD, { gloss: .22, ...SV });
  cyl(6.226, 1.130, -3.200, .028, .014, col.gold, { gloss: G.metal, ...SV });
  box(6.226, 1.128, -3.090, .050, .016, .050, col.charcoal, { hard: true, gloss: .20, ...SV });
  box(6.226, 1.138, -3.090, .038, .005, .038, col.red, { hard: true, gloss: .30, ...SV });
  // 刷卡机 the reader the 交通卡 goes on to be topped up — the machine the whole window is for,
  // and the one thing behind the glass a player has a reason to look for.
  box(6.080, 1.168, -3.078, .13, .095, .080, col.slab, { hard: true, gloss: .26, ...SV });
  box(6.014, 1.182, -3.078, .008, .046, .052, col.jadeL,
    { hard: true, mode: 1, glow: .30, ...SV });
  // a mug, on the strip behind her arm where there is nothing else it can be
  cyl(6.232, 1.166, -3.430, .028, .092, col.white, { gloss: .20, ...SV });
  cyl(6.232, 1.214, -3.430, .029, .008, col.jade, { gloss: .22, ...SV });
  // a screen at the -z end, half behind the reveal and turned away from the window, which is where
  // a clerk's screen always is
  box(6.150, 1.300, -4.130, .035, .250, .150, col.charcoal, { hard: true, gloss: .24, ...SV });
  box(6.150, 1.155, -4.130, .080, .040, .100, col.charcoal, { hard: true, gloss: .24, ...SV });
  // and the strip that lights her desk, tucked under the head of the opening
  box(6.150, 2.000, svz, .07, .038, .72, col.slab, { hard: true, gloss: .26, ...SV });
  box(6.150, 1.966, svz, .05, .032, .68, col.tube, { hard: true, mode: 1, glow: .52, ...SV });

  // =============================================================== 窗口 the window, finished
  // ---- 传声孔 the speak-hole. The shell puts a plate there; this drills it. Seven holes in a
  // ring is what you are looking at when you lean in to be heard, and at 9 mm each they cost one
  // batch between them because every one is the same cylinder.
  cyl(5.922, 1.42, svz, .088, .014, col.chrome, { rz: Math.PI / 2, gloss: G.metal, ...SV });
  cyl(5.916, 1.42, svz, .011, .018, col.black, { rz: Math.PI / 2, gloss: .10, ...SV });
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    cyl(5.916, 1.42 + Math.sin(a) * .048, svz + Math.cos(a) * .048, .011, .018, col.black,
      { rz: Math.PI / 2, gloss: .10, ...SV });
  }
  // ---- 递物槽 the tray. The shell already leaves the gap — the glass starts at y 1.12 and the
  // frame below it stops at 1.08 — so what was missing was the dish that runs through it. One
  // stainless pan from her ledge out to the public counter, with a lip each side so a card pushed
  // across does not go on the floor.
  box(5.930, 1.088, svz, .215, .011, .32, col.chrome, { hard: true, gloss: G.metal, ...SV });
  for (const s of [-1, 1])
    box(5.930, 1.104, svz + s * .166, .215, .042, .012, col.steelD,
      { hard: true, gloss: G.metal, ...SV });
  // ---- 柜台 the counter. It was a 28 cm shelf stuck to a tiled wall with nothing under it; a
  // counter is a mass you stand at. Same tile material and scale as the piers, so it joins their
  // batch rather than starting one.
  box(5.795, .500, svz, .265, .930, 1.36, col.tileD,
    { hard: true, gloss: .24, mat: 'tile', matScale: .78, matAmt: .30 });
  box(5.775, .062, svz, .225, .124, 1.36, col.charcoal, { hard: true, gloss: .20 });
  shade(5.78, svz, .40, 1.44, .30);

  // ---- 值班员 the duty plate on the counter. A window in a Chinese station tells you who is
  // behind it and on what shift, and it is the only place her name is written down.
  box(5.845, 1.108, -3.99, .016, .128, .265, col.white, { hard: true, gloss: .20, ...SV });
  box(5.845, 1.186, -3.99, .020, .036, .265, col.jade, { hard: true, gloss: .24, ...SV });
  glyphs(5.836, 1.186, -3.99, -Math.PI / 2, '值班员',
    { size: .026, gap: .010, color: col.white, mode: 1, tag: '值班员' });
  glyphs(5.836, 1.112, -3.99, -Math.PI / 2, '李秀兰',
    { size: .052, gap: .014, color: col.charcoal, mode: 1, tag: '值班员' });
  // ---- 服务中 the window lamp. Lit while somebody is behind the glass, and it comes up as you
  // walk in — the smallest possible acknowledgement that you have been seen.
  box(5.850, 1.118, -3.22, .020, .105, .225, col.charcoal, { hard: true, gloss: .24, ...SV });
  const lamp = box(5.836, 1.118, -3.22, .008, .080, .200, LAMPG,
    { hard: true, mode: 1, glow: .22, ...SV });
  glyphs(5.828, 1.118, -3.22, -Math.PI / 2, '服务中',
    { size: .050, gap: .012, color: col.charcoal, mode: 1, tag: '服务中心' });

  // =============================================================== 公告栏 the notice board
  // On the -x face of the pier beside the window, which is the only clear wall in this half of the
  // concourse and exactly where a station puts one. Two lines you can read and four notices you
  // cannot, because that is the honest ratio on a real board.
  // 服务时间 is the one claim on it, and it is checked: the 站务员 who works this concourse is
  // rostered 05:00–23:00 in js/data.js, so the board is not telling you something the station
  // contradicts. Signs in this room have lied before and that is the failure to avoid.
  const NB = { tag: '公告栏' };
  box(5.905, 2.250, PZC, .050, .560, PZW, col.white, { hard: true, gloss: .22, ...NB });
  box(5.878, 2.242, PZC, .010, .492, PZW - .07, col.cream, { hard: true, gloss: .16, ...NB });
  box(5.876, 2.452, PZC, .016, .086, PZW - .07, col.jade, { hard: true, gloss: .24, ...NB });
  glyphs(5.866, 2.452, PZC, -Math.PI / 2, '服务公告',
    { size: .058, gap: .018, color: col.white, mode: 1, tag: '公告栏' });
  glyphs(5.870, 2.352, PZC, -Math.PI / 2, '服务时间',
    { size: .044, gap: .012, color: col.charcoal, mode: 1, tag: '公告栏' });
  glyphs(5.870, 2.282, PZC, -Math.PI / 2, '05:00-23:00',
    { size: .034, gap: .006, color: col.blue, mode: 1, tag: '公告栏' });
  glyphs(5.870, 2.186, PZC, -Math.PI / 2, '交通卡充值',
    { size: .044, gap: .012, color: col.charcoal, mode: 1, tag: '公告栏' });
  // the three pinned notices, which are paper and not sentences
  for (let i = 0; i < 3; i++)
    box(5.872, 2.070, PZC + (i - 1) * .170, .006, .105, .140,
      i & 1 ? col.white : col.cream, { hard: true, gloss: .14, ...NB });

  // =============================================================== 失物招领 lost property
  // A shallow case on the same pier, under the board, using the pier itself as its back wall.
  const LP = { tag: '失物招领' };
  box(5.930, 1.545, PZC, .050, .740, PZW, col.panel, { hard: true, gloss: .22, ...LP });
  for (const s of [-1, 1])
    box(5.815, 1.545, PZC + s * (PZW / 2 - .015), .240, .740, .030, col.panel,
      { hard: true, gloss: .22, ...LP });
  box(5.815, 1.900, PZC, .240, .036, PZW, col.panel, { hard: true, gloss: .22, ...LP });
  box(5.815, 1.190, PZC, .240, .036, PZW, col.slab, { hard: true, gloss: .26, ...LP });
  box(5.820, 1.480, PZC, .230, .020, PZW - .05, col.panel, { hard: true, gloss: .22, ...LP });
  box(5.815, 1.958, PZC, .240, .078, PZW, col.jade, { hard: true, gloss: .24, ...LP });
  glyphs(5.694, 1.958, PZC, -Math.PI / 2, '失物招领',
    { size: .050, gap: .016, color: col.white, mode: 1, tag: '失物招领' });
  // what is in it. Lower shelf: a folded umbrella and a phone. Upper: a flask, a bag, a book.
  // Five things somebody left on a train, which is the cheapest life in the station: every one of
  // them is an object you can guess a story for without a word being written on it.
  cyl(5.820, 1.238, PZC - .115, .024, .280, col.navy, { rx: Math.PI / 2, gloss: .18, ...LP });
  cyl(5.820, 1.238, PZC + .030, .012, .075, col.charcoal,
    { rx: Math.PI / 2, gloss: .20, ...LP });
  box(5.800, 1.216, PZC + .180, .075, .014, .140, col.charcoal,
    { hard: true, gloss: .28, ...LP });
  cyl(5.815, 1.588, PZC - .205, .034, .196, col.red, { gloss: .26, ...LP });
  cyl(5.815, 1.692, PZC - .205, .030, .020, col.steelD, { gloss: G.metal, ...LP });
  box(5.810, 1.548, PZC + .010, .165, .116, .215, col.orange, { gloss: .14, ...LP });
  box(5.805, 1.518, PZC + .170, .140, .056, .175, col.jadeL, { hard: true, gloss: .18, ...LP });
  // the pane. The only translucent prop this zone adds, and it is one draw call on its own.
  box(5.697, 1.545, PZC, .014, .700, PZW - .05, col.glass,
    { hard: true, alpha: .30, gloss: G.glass, ...LP });
  shade(5.81, PZC, .30, .70, .26);
  thing('失物招领', 5.66, 1.55, PZC, '我的东西丢了。', "I've lost something.",
    '失 to lose + 物 thing + 招领 to claim. 失物招领处 is the lost-property office.',
    { focus: [5.10, PZC], reach: 1.5 });

  // =============================================================== 一米线 the queue mark
  // Where you stand to be served. `glyphs` stands its quads up — the one rotation it cannot do —
  // so the floor characters are raw quads with a matrix of their own, the way the shell builds the
  // platform name inlays. The reader is walking at the window in +x, so their right hand is world
  // +z: the text runs up z and each glyph's top has to point at +x, which is rotY(-π/2).
  const floorText = (x, y, z, text, size, color) => {
    const chars = [...text], step = size * 1.18;
    const span = chars.length * step - (step - size);
    chars.forEach((ch, i) => {
      if (ch === ' ') return;
      Glyphs.need(ch);
      A.props.push({ mesh: 'quad', ch, color, mode: 0, gloss: .16, alpha: 1,
        m: M.mul(M.trans(x, y, z - span / 2 + step * (i + .5)),
             M.mul(M.rotY(-Math.PI / 2), M.scale(size, 1, size))) });
    });
  };
  flat(4.88, .0055, svz, .065, 1.60, col.yellow, { gloss: .12 });
  floorText(4.72, .0060, svz, '一米线', .155, col.yellow);
  for (const s of [-1, 1])
    flat(STANDX, .0065, CZ + s * .085, .105, .255, col.yellow, { gloss: .12 });

  // =============================================================== 值班员 the person, as a word
  //
  // TICKET — Scribe (js/talk.js). SHE STILL CANNOT ANSWER, but she is one step from it now.
  //
  // A conversation hangs off `th.npc`, which game.js only sets from a roster row carrying `lines`
  // (js/game.js:1047). When this zone was written there was no way for a metro file to put a row
  // on the roster at all — no `MetroCast`, no `MetroFit[k].cast`, and `addNPC` private to game.js's
  // closure. That has since been fixed (js/game.js:1091-1096) and both forms are now honoured, so
  // `MetroFit['service'].cast = [ ... ]` is the place 李秀兰's row goes.
  //
  // It is NOT filled in here, deliberately, and this is the one thing to read before filling it:
  // a roster row is *drawn*. `drawNPCs` puts a full drawFigure body at `n.x, n.z` and there is no
  // flag that suppresses it — `npcRange` skips only on `!n.awake || !n.pose` or on distance and
  // frustum. So a row placed at the window (5.15, -3.68) stands a second, full-height clerk on the
  // concourse in front of the glass, and a row placed behind the glass puts one through a wall in
  // a 25 cm booth. Either is a visible regression in a scene with no rollback, and there is no
  // dialogue for it to enable yet. The row wants ONE line in game.js first — a `noFigure` skip
  // beside the `npcRange` test in `drawNPCs` (js/game.js:3484) — and then this becomes four lines.
  // The row itself, the script, and that one-line change are all written out in my report.
  //
  // The sentence here is the one you say *at* her, which is the half that does work today: 您 and
  // not 你, because she is behind glass in a uniform and this is the register the room is in.
  thing('值班员', SVF - .24, 1.68, CZ, '您好，我要充值。',
    'Hello — I would like to top up my card.',
    '值班 to be on duty + 员 the person who does it — the clerk on the window. 她在窗口后面 ' +
    'she is behind the glass. 您 is the polite 你, and it is the one to use here.',
    { focus: [STANDX, CZ], reach: 1.35 });

  // =============================================================== what moves
  //
  // Everything above that is animated, handed to the shell so it captures a rest matrix for each
  // in the same pass it captures its own. Without this the first tick would rotate each prop about
  // a matrix that does not exist and the clerk would fold up into the floor.
  for (const p of BODY) A.rest(p);
  for (const p of HEAD) A.rest(p);
  for (const p of EYES) A.rest(p);
  for (const p of LIDS) A.rest(p);
  for (const p of ARM) A.rest(p);

  MetroFit['service'].parts = { BODY, HEAD, EYES, LIDS, ARM, lamp,
                                PX, PY, PZ, svz, SVF, STANDX };
};

// ---------------------------------------------------------------------------------------------
// 服务员 she notices you
//
// The shell already sways its relief on two periods that do not divide into each other. This does
// the same to the person in front of it — same pivot, same frequencies, so the two stay in step
// and the relief never comes out from behind her — and then adds the part a relief cannot have:
// she attends. Walk up and the fidget dies down, she sits up, she leans a couple of centimetres
// your way along the glass, her eyes come round to you, and the 服务中 lamp brightens. Walk off
// and all of it decays back over about a second and a half.
//
// Every amplitude here is bounded by how much of the relief the sleeves and the hair have to
// spare — 1.0 cm at the head, which is what `TRACK` and `LEAD` add up to at 49 cm above the stool.
// If you raise them, the grey wing comes out. The eyes are where the tracking can be generous,
// because a pupil sits on top of her own opaque face and covers nothing.
//
// Four group matrices a frame, not one per prop: the sandwich is built once for the body, once
// for the head, once for the arms and once for the hands, and then each prop is a single multiply
// against the matrix it was built with.
MetroFit['service'].tick = (t, body, clock) => {
  const P = MetroFit['service'].parts;
  if (!P || !P.HEAD.length || !P.HEAD[0].m0) return;
  const { BODY, HEAD, EYES, LIDS, ARM, PX, PY, PZ } = P;

  // ---- how close you are, and where along the glass. `att` is the attention, smoothed so
  // walking past does not snap her about; `trk` is which way she has to lean to be facing you.
  let want = 0, side = 0;
  if (body) {
    const dx = body.x - (P.SVF - .55), dz = body.z - P.svz;
    const d = Math.sqrt(dx * dx + dz * dz);
    want = d < .95 ? 1 : d > 2.30 ? 0 : (2.30 - d) / 1.35;
    side = dz < -1 ? -1 : dz > 1 ? 1 : dz;
  }
  const s = MetroFit['service'];
  s.att = (s.att || 0) + (want - (s.att || 0)) * .040;
  s.trk = (s.trk || 0) + (side * s.att - (s.trk || 0)) * .045;
  const att = s.att, trk = s.trk;
  // She fidgets less with somebody at the window, which is most of what "attending" looks like.
  const calm = 1 - att * .55;

  // ---- the sway. The shell's own two periods — twenty-three seconds for the weight and nine for
  // the smaller movement over the top of it — so her front and the relief behind it drift together.
  const idle = (Math.sin(t * .273) * .020 + Math.sin(t * .71 + 1.7) * .006) * calm;
  const TRACK = .013, LEAD = .008;             // 6.4 mm + 3.9 mm at the head. See the note above.
  const aBody = idle + trk * TRACK;
  const aHead = aBody + Math.sin(t * .71 + 1.7) * .012 * calm + trk * LEAD;
  const aArm = Math.sin(t * .19 + .8) * .011 * calm;
  const lift = att * .009;                     // she sits up. The arms do not: they are on a ledge.

  // Rotating about a point that is not a prop's own origin is translate · rotate · un-translate
  // applied to the matrix it was built with. Built once per group and reused across it.
  const at = (a, dy, dz) => M.mul(M.trans(PX, PY + dy, PZ + dz),
    M.mul(M.rotX(a), M.trans(-PX, -PY, -PZ)));
  const put = (list, g) => {
    for (const p of list) {
      p.m = M.mul(g, p.m0);
      p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    }
  };
  put(BODY, at(aBody, lift, 0));
  const gh = at(aHead, lift, 0);
  put(HEAD, gh);
  put(ARM, at(aArm, 0, 0));

  // ---- 眼睛 the eyes, which is where a person is. They track twice as far as the head leans,
  // because a pupil sits on her own face and covers nothing behind it, and they blink — one
  // eyelid each, dropping 4 cm for a tenth of a second every three seconds or so.
  const eg = M.mul(M.trans(0, -trk * .0035, trk * .0075), gh);
  put(EYES, eg);
  const b = (t * .34 + .21) % 1;
  const shut = b > .962 ? 1 : 0;
  put(LIDS, M.mul(M.trans(0, -shut * .040, 0), gh));

  // ---- and the window lamp, up as she looks at you.
  if (P.lamp) P.lamp.glow = .18 + att * .55;
};
