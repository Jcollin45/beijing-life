// 💳 ATM + 充值 — The MISSING ATM and the 交通卡 top-up point
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    concourse side
//   camera  95-atm (new)
//
// The MISSING ATM and the 交通卡 top-up point. The card-balance STATE belongs to the Hub; you
// build the machine, its screen and its verb, and post the state ticket.
//
// The camera IS the acceptance test, and the metro's shots are stronger than any other scene's:
// many carry a `pre` block that drives the REAL machinery — Metro.tick, Metro.openGate,
// Metro.placeTrain, g.tickStation — so a passing shot is a passing state machine, not just a
// pretty picture. Render yours with `node .audit.js 95-atm`, open the PNG, and look at it.
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

MetroFit['atm'] = A => {
  const { box, cyl, glyphs, solid, thing, shade } = A;
  const { C, G, col } = A;

  // Flush into the 53 cm bay between 安检 and the convenience kiosk.  A freestanding ATM here
  // would turn the stair spawn into a shoulder-width slot; wall mounting leaves 94 cm from the
  // fixture face to the spawn line (34 cm beyond a 60 cm body) and makes the three services read as
  // one deliberate concourse run.
  const X0 = -6.24, XF = -5.90, Z0 = -4.20, Z1 = -3.67, ZC = (Z0 + Z1) / 2;
  const ATM = '取款机', TOPUP = '售票机';
  const navy = C('#263b52'), screen = C('#102a39'), ink = C('#e9f3f4');
  const cyan = C('#70c7d1'), green = C('#4d9b78'), amber = C('#d6a744');
  const MET = { hard:true, gloss:G.metal, mat:'steel', matScale:.50, matAmt:.30 };

  // Cabinet, recessed screen and privacy cheeks.  Everything is opaque; the dark display carries
  // its own low glow and does not become a light source bright enough to bleach the wall around it.
  box((X0 + XF) / 2, 1.14, ZC, XF - X0, 2.28, Z1 - Z0, col.steelD,
    { hard:true, gloss:.34, mat:'steel', matScale:.50, matAmt:.30, tag:ATM });
  box(XF + .010, 1.47, ZC, .045, .82, .43, navy,
    { hard:true, gloss:.24, tag:ATM });
  box(XF + .038, 1.52, ZC, .020, .58, .34, screen,
    { hard:true, mode:1, glow:.18, tag:ATM });
  for (const z of [Z0 + .035, Z1 - .035])
    box(XF + .015, 1.46, z, .18, .96, .07, col.steel,
      { ...MET, tag:ATM });
  box(XF + .015, 2.13, ZC, .16, .22, Z1 - Z0 + .08, col.blue,
    { hard:true, gloss:.24, tag:ATM });
  glyphs(XF + .102, 2.13, ZC, Math.PI / 2, '取款机',
    { size:.095, gap:.026, lift:0, color:ink, mode:1, glow:.18, tag:ATM });

  glyphs(XF + .052, 1.72, ZC, Math.PI / 2, '欢迎使用',
    { size:.061, gap:.015, lift:0, color:cyan, mode:1, glow:.10, tag:ATM });
  // Two honest cash-machine choices.  No bank identity is invented and no real payment logo is
  // copied; colour and words are enough to make a working-looking screen.
  for (const [z, txt, c] of [[ZC - .10, '取款', green], [ZC + .10, '查询', amber]]) {
    box(XF + .055, 1.49, z, .018, .13, .15, c,
      { hard:true, mode:1, glow:.14, tag:ATM });
    glyphs(XF + .066, 1.49, z, Math.PI / 2, txt,
      { size:.050, gap:.012, lift:0, color:ink, mode:1, tag:ATM });
  }

  // Card slot, cash tray and a twelve-key pad.  They project no farther into the hall than the
  // cabinet's authored collider, so the visible and physical footprints agree.
  box(XF + .075, 1.15, ZC - .11, .11, .030, .17, col.black,
    { hard:true, gloss:.28, tag:ATM });
  glyphs(XF + .082, 1.25, ZC - .11, Math.PI / 2, '插卡',
    { size:.046, gap:.010, lift:0, color:cyan, mode:1, tag:ATM });
  box(XF + .09, .71, ZC, .16, .11, .35, col.black,
    { hard:true, gloss:.24, tag:ATM });
  box(XF + .102, .73, ZC, .08, .025, .27, col.chrome,
    { hard:true, gloss:G.metal, tag:ATM });
  for (let row = 0; row < 4; row++) for (let colIx = 0; colIx < 3; colIx++)
    box(XF + .096, .91 + row * .055, ZC - .12 + colIx * .12, .035, .032, .060,
      row === 3 && colIx === 2 ? amber : col.slab,
      { hard:true, gloss:.20, tag:ATM });

  // A separate transit-card reader makes 充值 genuinely usable without pretending that a bank
  // withdrawal and a metro-card top-up are one transaction.  Its `售票机` tag reuses the existing
  // metro ticket/card panel, whose choices already include buying and topping up the travel card.
  const TY = .43;
  box(XF + .02, TY, ZC, .14, .30, .42, col.jade,
    { hard:true, gloss:.22, tag:TOPUP });
  box(XF + .095, TY + .02, ZC, .025, .22, .34, screen,
    { hard:true, mode:1, glow:.16, tag:TOPUP });
  glyphs(XF + .112, TY + .05, ZC, Math.PI / 2, '交通卡充值',
    { size:.045, gap:.010, lift:0, color:ink, mode:1, glow:.10, tag:TOPUP });
  // The pad and the card on it; this is a travel card, not a bank logo.
  box(XF + .12, TY - .07, ZC, .035, .10, .17, cyan,
    { hard:true, mode:1, glow:.16, tag:TOPUP });
  box(XF + .145, TY - .06, ZC, .012, .054, .086, col.blue,
    { round:.006, gloss:.32, tag:TOPUP });
  box(XF + .154, TY - .06, ZC - .020, .008, .017, .022, col.gold,
    { hard:true, gloss:G.metal, tag:TOPUP });

  shade((X0 + XF) / 2, ZC, .72, .72, .28);
  solid(-6.40, XF + .16, Z0, Z1);
  thing('取款机', XF + .10, 1.86, ZC, '这里有取款机。',
    'There is a cash machine here.',
    '取款 is to withdraw cash + 机 machine. It carries no real bank brand.',
    { focus:[XF + .82, ZC], reach:1.35 });
  thing('售票机', XF + .18, TY + .04, ZC, '我想给交通卡充值。',
    'I would like to top up my travel card.',
    '充值 is to add credit. This reader opens the same live card choices as the ticket machines.',
    { tag:TOPUP, focus:[XF + .75, ZC], reach:1.25 });
};
