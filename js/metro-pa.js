// 📢 PA + soundbed — The finite announcement vocabulary (due30 / due3 / near / due1) and the ambient soundbed, expanded with SFX
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    heard everywhere — shared state on the shell
//   camera  96-crowd, 96c-night
//
// The finite announcement vocabulary (due30 / due3 / near / due1) and the ambient soundbed,
// expanded with SFX. The PA and the board are forbidden from disagreeing.
//
// The camera IS the acceptance test, and the metro's shots are stronger than any other scene's:
// many carry a `pre` block that drives the REAL machinery — Metro.tick, Metro.openGate,
// Metro.placeTrain, g.tickStation — so a passing shot is a passing state machine, not just a
// pretty picture. Render yours with `node .audit.js 96-crowd`, open the PNG, and look at it.
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

MetroFit['pa'] = A => {
  const { box, cyl, glyphs, thing } = A;
  const { C, G, col, H, RX } = A;

  // The shell already has four ceiling speakers and the platform watch column already has a horn.
  // Building a second acoustic system here would be visible duplication.  Claim the real fixtures
  // by their authored centres so the vocabulary word 通知 points at the hardware that actually exists.
  const centres = [[-3.90,-2.10],[2.90,-4.30],[-2.60,1.90],[4.20,2.20]];
  let tagged = 0;
  for (const p of A.props) {
    if (!Number.isFinite(p.cx) || !Number.isFinite(p.cy) || !Number.isFinite(p.cz)) continue;
    if (p.cy < H - .10) continue;
    if (centres.some(([x,z]) => Math.abs(p.cx - x) < .12 && Math.abs(p.cz - z) < .12)) {
      p.tag = '通知';
      tagged++;
    }
  }

  // One platform repeater panel, high on the +x wall and clear of both the clock at z .95 and the
  // screen-door line at z 3.30.  It carries timeless guidance only: a static panel saying a train
  // is arriving would disagree with the live timetable for fifty-seven minutes of every hour.
  const X = RX - .13, Z = 2.35, TAG = '通知';
  const ink = C('#eaf2f4'), dim = C('#a7c2ce');
  box(X, 2.12, Z, .08, .70, 1.02, col.steelD,
    { hard:true, gloss:G.metal, mat:'steel', matScale:.50, matAmt:.30, tag:TAG });
  box(X - .048, 2.12, Z, .024, .60, .92, col.navy,
    { hard:true, gloss:.22, tag:TAG });
  box(X - .066, 2.36, Z, .012, .16, .84, col.blue,
    { hard:true, mode:1, glow:.14, tag:TAG });
  glyphs(X - .078, 2.36, Z, -Math.PI / 2, '请听广播',
    { size:.078, gap:.021, lift:0, color:ink, mode:1, glow:.12, tag:TAG });
  glyphs(X - .078, 2.08, Z, -Math.PI / 2, '乘车以站台信息为准',
    { size:.052, gap:.012, lift:0, color:dim, mode:1, tag:TAG });
  // Pilot and grille: just enough physical detail that the panel reads as a live PA repeater rather
  // than another poster.  The light is steady; announcement cadence remains wholly shell-owned.
  cyl(X - .075, 1.88, Z - .27, .036, .014, C('#56c28d'),
    { rz:Math.PI / 2, mode:1, glow:.24, tag:TAG });
  for (let i = -2; i <= 2; i++)
    box(X - .078, 1.88, Z + .10 + i * .11, .014, .025, .075, col.grout,
      { hard:true, gloss:.18, tag:TAG });

  // 音箱 is deliberately not the interaction word here: its global action is the park's
  // square-dance activity.  通知 is a taught, accurate noun with no unrelated Q action, so this
  // remains a vocabulary/inspection target while the live announcements keep their G shortcut.
  thing('通知', X - .10, 2.42, Z, '请听站台广播。',
    'Listen to the platform announcements.',
    '通知 is a notice or announcement. The board, clock and PA use the same train timetable.',
    { focus:[RX - 1.20, Z], reach:1.65 });

  // Keys only, never a second copy of the spoken text.  The shell remains the single authority for
  // sentences and timing; this manifest lets static checks prove that the fixture lane covers every
  // event game.js already dispatches to TrainAudio.
  MetroFit['pa'].fixtureCount = tagged + 1;
};

MetroFit['pa'].noticeKeys = Object.freeze(['due30','due3','due2','near','due1']);
MetroFit['pa'].sfxKeys = Object.freeze(['passing','arrive','doors-open','doors-close']);
MetroFit['pa'].probe = () => ({
  fixtures:MetroFit['pa'].fixtureCount || 0,
  notices:MetroFit['pa'].noticeKeys.slice(),
  sfx:MetroFit['pa'].sfxKeys.slice(),
});
