// 🗺️ Line map · wayfinding — The seven-dot line map, the 'you are here' ring, the 在建 and 终点站 marks, the 换乘 sign, the A出口/B出口 lettering
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    the -z wall, +x side
//   camera  93-linemap
//
// The seven-dot line map, the 'you are here' ring, the 在建 and 终点站 marks, the 换乘 sign, the
// A出口/B出口 lettering. Teaches 换乘 / 方向 / 终点站 — words in the help text but not teachable.
//
// The camera IS the acceptance test, and the metro's shots are stronger than any other scene's:
// many carry a `pre` block that drives the REAL machinery — Metro.tick, Metro.openGate,
// Metro.placeTrain, g.tickStation — so a passing shot is a passing state machine, not just a
// pretty picture. Render yours with `node .audit.js 93-linemap`, open the PNG, and look at it.
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

MetroFit['map'] = A => {
  const { box, cyl, glyphs, thing } = A;
  const { C, col, RZ, STATIONS } = A;

  // The shell already owns the changing seven-stop diagram at x .70..5.30 and the ticket agent
  // owns the fare board at x -3.84..-.64.  The 1.34 m wall bay between them is the only honest
  // place for the wayfinding key: adding another line diagram would duplicate the live map, while
  // putting a freestanding sign in the hall would pinch the only clear cross-room route at z -3.
  const X = .03, Z = -RZ + .14, FACE = Z + .046;
  const TAG = '换乘';
  const ink = C('#e9f3f6'), dim = C('#a9c4d2'), shut = C('#d6ab46');

  // One frame, one inset and one text plane.  All three keep the shell's existing metal/plaster
  // vocabulary and remain opaque, so the entire module stays batchable.
  box(X, 1.72, Z, 1.06, 1.60, .06, col.steelD,
    { hard:true, gloss:.34, mat:'steel', matScale:.50, matAmt:.30, tag:TAG });
  box(X, 1.72, FACE, .94, 1.48, .022, col.navy,
    { hard:true, gloss:.22, tag:TAG });
  box(X, 2.24, FACE + .016, .86, .30, .012, col.blue,
    { hard:true, mode:1, glow:.18, tag:TAG });
  glyphs(X, 2.24, FACE + .026, 0, '出口换乘',
    { size:.095, gap:.026, lift:0, color:ink, mode:1, glow:.10, tag:TAG });

  // A is the only open street exit in this compact station; B is deliberately marked unopened.
  // This agrees with the stair agent's double-sided board instead of inventing a second doorway.
  const arrow = (x, y, c, dir) => {
    box(x, y, FACE + .018, .22, .035, .012, c,
      { hard:true, mode:1, glow:.18, rz:dir ? Math.PI : 0, tag:TAG });
    for (const s of [-1, 1])
      box(x + (dir ? -.09 : .09), y + s * .055, FACE + .020, .14, .030, .012, c,
        { hard:true, mode:1, glow:.18, rz:s * (dir ? -.72 : .72), tag:TAG });
  };
  arrow(X - .29, 1.91, col.jadeL, 1);
  glyphs(X + .08, 1.91, FACE + .028, 0, 'A出口',
    { size:.090, gap:.022, lift:0, color:ink, mode:1, tag:TAG });
  glyphs(X - .27, 1.61, FACE + .028, 0, 'B出口',
    { size:.082, gap:.020, lift:0, color:dim, mode:1, tag:TAG });
  glyphs(X + .18, 1.61, FACE + .028, 0, '暂缓开通',
    { size:.065, gap:.015, lift:0, color:shut, mode:1, tag:TAG });
  glyphs(X, 1.29, FACE + .028, 0, '换乘请看线路图',
    { size:.061, gap:.014, lift:0, color:dim, mode:1, tag:TAG });
  // The end marker is a small legend, not a claimed interchange.  The live map immediately to
  // its right still decides which physical dot is the terminus.
  cyl(X - .33, 1.08, FACE + .024, .043, .012, col.navy,
    { rx:Math.PI / 2, mode:1, tag:TAG });
  glyphs(X + .07, 1.08, FACE + .030, 0, '终点站',
    { size:.064, gap:.016, lift:0, color:ink, mode:1, tag:TAG });

  thing('换乘', X, 2.28, FACE, '换乘请先看线路图。',
    'Check the line map before changing lines.',
    '换 to change + 乘 to ride. A出口 is open; B出口 is not open yet.',
    { focus:[X, -RZ + 1.35], reach:2.0 });
  // The live diagram grew to seven stops but its shell-authored teaching sentence still said six.
  // Correct the existing thing in place rather than adding a second 线路图 interaction on top of it.
  const lineThing = A.things.find(t => t.hz === '线路图');
  if (lineThing) {
    const n = STATIONS.length;
    lineThing.sentence = `线路图上有${n === 7 ? '七' : n}个站。`;
    lineThing.tr = `There are ${n} stations on the line map.`;
    lineThing.note = '线路 route + 图 diagram. 终点站 is either end; 本站 is this station.';
  }
};
