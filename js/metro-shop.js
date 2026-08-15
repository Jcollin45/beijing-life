// 🏪 Concourse shop — The MISSING 便利店
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    concourse side
//   camera  95-shop (new)
//
// The MISSING 便利店. A Chinese metro concourse without one reads as wrong the way an empty road
// did. Drinks, snacks, a clerk, a chiller.
//
// The camera IS the acceptance test, and the metro's shots are stronger than any other scene's:
// many carry a `pre` block that drives the REAL machinery — Metro.tick, Metro.openGate,
// Metro.placeTrain, g.tickStation — so a passing shot is a passing state machine, not just a
// pretty picture. Render yours with `node .audit.js 95-shop`, open the PNG, and look at it.
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

MetroFit['shop'] = A => {
  const { box, cyl, flat, glyphs, solid, thing, shade } = A;
  const { C, G, col } = A;

  // The only unclaimed concourse frontage is the west wall between the security podium and the
  // gate rail.  It is a serve-over kiosk, not a walk-in shop: at 1.48 m wide a false doorway would
  // promise an aisle that cannot clear a 60 cm body.  The counter therefore owns the full footprint
  // and the public hall stays 94 cm wide between its visible face and the player's spawn line.
  const X0 = -6.24, XF = -5.90, Z0 = -3.64, Z1 = -2.16;
  const XC = (X0 + XF) / 2, ZC = (Z0 + Z1) / 2;
  const TAG = '便利店', T = { tag:TAG };
  const cream = C('#e8e0cc'), cold = C('#d9eef4'), ink = C('#283746');
  const green = C('#39705e'), red = C('#a94635'), gold = C('#d7ad48');
  const MET = { hard:true, gloss:G.metal, mat:'steel', matScale:.50, matAmt:.30 };

  // A different floor finish and a framed back make this a tenancy rather than stock leaned
  // against the station tile.  One steel scale is reused throughout so the fittings share a batch.
  flat(XC, .012, ZC, XF - X0, Z1 - Z0, col.slab,
    { gloss:.22, mat:'tile', matScale:.78, matAmt:.28 });
  box(X0 + .05, 1.30, ZC, .10, 2.60, Z1 - Z0, col.panel,
    { ...T, hard:true, gloss:.20, mat:'plaster', matScale:.62, matAmt:.12, nrm:null });
  for (const z of [Z0 + .04, Z1 - .04])
    box(XC, 1.30, z, XF - X0, 2.60, .08, col.steelD, { ...T, ...MET });
  box(XC, 2.52, ZC, XF - X0, .10, Z1 - Z0, cream,
    { ...T, hard:true, mode:1, glow:.13 });
  box(XF - .17, 2.33, ZC, .20, .38, Z1 - Z0 + .12, red,
    { ...T, hard:true, gloss:.22 });
  box(XF - .055, 2.13, ZC, .025, .055, Z1 - Z0 + .12, gold,
    { ...T, hard:true, mode:1, glow:.16 });
  glyphs(XF - .048, 2.35, ZC, Math.PI / 2, '晨行便利店',
    { size:.145, gap:.042, lift:0, color:cream, mode:1, glow:.28, tag:TAG });
  glyphs(XF - .046, 2.08, ZC, Math.PI / 2, '早五点至晚十二点',
    { size:.062, gap:.016, lift:0, color:ink, mode:1, tag:TAG });

  // Serve-over counter: a dark kick, durable carcass, stone cap and a small QR placard.  The shop
  // uses the invented 晨行 name; no real chain, logo or packaging appears anywhere in the bay.
  box(XF - .15, .49, ZC, .48, .98, Z1 - Z0, col.steelD,
    { ...T, ...MET });
  box(XF - .03, .78, ZC, .22, .38, Z1 - Z0 - .10, col.jade,
    { ...T, hard:true, gloss:.20 });
  box(XF - .12, 1.015, ZC, .56, .07, Z1 - Z0 + .08, col.slab,
    { ...T, hard:true, gloss:.28, mat:'concrete', matScale:1.40, matAmt:.20 });
  box(XF + .12, 1.28, ZC + .12, .025, .42, .34, col.navy,
    { ...T, hard:true, gloss:.24 });
  glyphs(XF + .137, 1.30, ZC + .12, Math.PI / 2, '扫码',
    { size:.075, gap:.018, lift:0, color:cream, mode:1, glow:.12, tag:TAG });
  // A graphic QR field without a copied payment brand.
  for (const [dy, dz] of [[.09,-.08],[.09,.08],[-.09,-.08],[-.02,.05]])
    box(XF + .153, 1.18 + dy, ZC + .12 + dz, .012, .055, .055, cream,
      { ...T, hard:true, mode:1 });

  // 冷藏柜: one transparent door, not a glass pane per bottle.  The coloured opaque bodies behind
  // it carry the read at orbit distance while the single pane earns the module's only alpha draw.
  const CZ = Z0 + .36, CY = 1.62;
  box(X0 + .17, CY, CZ, .20, 1.32, .64, col.steelD, { ...T, ...MET });
  box(X0 + .29, CY, CZ, .04, 1.20, .56, cold,
    { ...T, hard:true, mode:1, glow:.18 });
  for (const y of [1.18, 1.54, 1.90])
    box(X0 + .34, y, CZ, .28, .035, .54, col.chrome, { ...T, ...MET });
  const drinks = [C('#d6e8ed'), C('#c69743'), C('#527962'), C('#864b3c')];
  let bi = 0;
  for (const y of [1.24, 1.60, 1.96]) for (const z of [CZ - .18, CZ, CZ + .18]) {
    const c = drinks[bi++ % drinks.length];
    cyl(X0 + .38, y, z, .042, .21, c, { ...T, gloss:.42 });
    cyl(X0 + .38, y + .12, z, .020, .035, ink, { ...T, gloss:.34 });
  }
  box(XF - .30, CY, CZ, .025, 1.20, .58, col.glass,
    { ...T, hard:true, mode:1, alpha:.26, gloss:G.glass });
  box(XF - .285, CY, CZ + .25, .035, .84, .035, col.steelD, { ...T, ...MET });
  glyphs(XF - .265, 2.22, CZ, Math.PI / 2, '冷藏饮料',
    { size:.073, gap:.020, lift:0, color:col.blue, mode:1, glow:.14, tag:TAG });

  // 方便面 on open shelves, with varied colour carried per instance.  Twelve cartons are enough to
  // read as stocked without turning a metre-wide kiosk into the metro's next prop hotspot.
  const NZ0 = ZC + .08, NZ1 = Z1 - .16;
  for (const y of [1.20, 1.56, 1.92]) {
    box(X0 + .30, y - .13, (NZ0 + NZ1) / 2, .34, .035, NZ1 - NZ0, col.chrome, { ...T, ...MET });
    for (let i = 0; i < 4; i++)
      box(X0 + .40, y, NZ0 + .10 + i * ((NZ1 - NZ0 - .20) / 3), .20, .24, .16,
        [red, gold, green, col.blue][(i + Math.round(y * 10)) % 4],
        { ...T, round:.025, gloss:.18 });
  }
  glyphs(XF - .265, 2.22, (NZ0 + NZ1) / 2, Math.PI / 2, '方便面',
    { size:.073, gap:.020, lift:0, color:col.redD, mode:1, glow:.10, tag:TAG });

  // 免费开水, on the customer end of the counter.  It has its own tag so the global 开水 action
  // remains usable here instead of the whole kiosk resolving to one oversized hit target.
  const UX = XF - .02, UZ = Z1 - .20, U = { tag:'开水' };
  cyl(UX, 1.28, UZ, .12, .42, col.steel, { ...U, gloss:G.metal });
  cyl(UX, 1.50, UZ, .14, .045, col.charcoal, { ...U, gloss:.28 });
  box(UX + .14, 1.31, UZ, .10, .045, .035, col.charcoal, { ...U, hard:true, gloss:.24 });
  cyl(UX + .19, 1.27, UZ, .025, .10, col.chrome,
    { ...U, rz:Math.PI / 2, gloss:G.metal });
  box(XF + .13, 1.65, UZ, .025, .30, .46, green,
    { ...U, hard:true, mode:1, glow:.12 });
  glyphs(XF + .147, 1.66, UZ, Math.PI / 2, '免费开水',
    { size:.074, gap:.020, lift:0, color:cream, mode:1, glow:.16, tag:'开水' });

  shade(XF - .12, ZC, .74, Z1 - Z0, .28);
  solid(-6.40, XF + .16, Z0, Z1);
  thing('便利店', XF + .24, 1.62, ZC, '请给我一瓶水和一桶方便面。',
    'A bottle of water and a pot of noodles, please.',
    '便利 convenient + 店 shop. 晨行 is an invented name, not a real brand.',
    { focus:[XF + .90, ZC], reach:1.65 });
  thing('开水', XF + .28, 1.48, UZ, '这里的开水是免费的。',
    'The boiled water here is free.',
    '开水 is boiled drinking water; station kiosks provide it for instant noodles.',
    { focus:[XF + .82, UZ], reach:1.35 });
};

// A real clerk rather than a mannequin relief.  This sits at file scope because game.js folds the
// per-zone cast into NPCS before Lazy builds the station.  The counter hides the lower body and the
// 52 cm service depth keeps the rig between the tiled wall and the customer face.
MetroFit['shop'].cast = [{
  hz:'店员', name:'小罗', py:'Xiǎo Luó', place:'metro', temper:'brisk', faceLock:true,
  look:{ skin:'#d9a87f', hair:'#29231f', hairStyle:'ponytail', top:'#e8e1d1', pants:'#303843',
    shoe:'#31363b', collar:'polo', sleeve:'short', apron:'#3d705e', badge:true,
    tall:.92, wide:.91, youth:.24, faceSeed:6207 },
  hours:[5,24],
  spots:[{ h0:5, h1:24, at:[-6.05,-2.90], face:Math.PI / 2, act:'vend' }],
  lines:[
    ['您好，要水还是方便面？', 'Hello. Water or instant noodles?'],
    ['开水免费，在柜台右边。', 'The boiled water is free, on the right of the counter.'],
    ['一瓶水一桶面，一共十四块。', 'A bottle of water and a pot of noodles — fourteen yuan.'],
    ['可以扫码，也可以付现金。', 'You can scan to pay or use cash.'],
  ],
}];
