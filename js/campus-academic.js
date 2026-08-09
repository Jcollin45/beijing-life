// Campus academic fit — central circulation, quad, teaching block and library.
// Loaded after campus.js; all construction goes through the shared Campus toolkit.
CampusFits.register('academic', 20, kit => {
  const {
    box, cyl, ball, capsule, flat, glyphs, solid, blocker, shade, thing,
    col, G, S, held, rnd, pane, litten, fwinZ, fwinX,
  } = kit;

  const hard = { hard: true };
  const render = (color = col.render, surface = S.rend) =>
    ({ hard:true, mode:14, gloss:G.paint, ...surface, color:held(color, surface) });
  const path = (x, z, w, d, color = col.paveL) =>
    flat(x, .008, z, w, d, held(color, S.path), { mode:9, gloss:.12, ...S.path });

  function signZ(x, y, z, width, text, tag, face = -1, blue = false) {
    const color = blue ? col.blueSign : col.redD;
    const ink = blue ? col.white : col.goldL;
    box(x, y, z, width, .52, .10, color, { tag, hard:true, gloss:.22 });
    for (const g of glyphs(x, y, z + face * .06, face < 0 ? Math.PI : 0, text,
      { size:.25, gap:.085, color:ink, mode:1, tag })) litten(g, blue ? .55 : .9);
  }

  function signX(x, y, z, width, text, tag, face = -1, blue = false, vertical = false) {
    const color = blue ? col.blueSign : col.redD;
    const ink = blue ? col.white : col.goldL;
    box(x, y, z, .10, .52, width, color, { tag, hard:true, gloss:.22 });
    for (const g of glyphs(x + face * .06, y, z, face < 0 ? -Math.PI / 2 : Math.PI / 2, text,
      { size:.25, gap:.085, color:ink, mode:1, tag, vertical })) litten(g, blue ? .55 : .9);
  }

  function nonPublicZ(x0, x1, z, n, floors, floorH, skip = []) {
    for (let x = x0 + 1.8; x <= x1 - 1.8 + 1e-6; x += 3.2) {
      if (skip.some(v => Math.abs(v - x) < 1.2)) continue;
      for (let f = 1; f < floors; f++) serviceWinZ(x, f * floorH + 1.35, z, 1.75, 1.45, n);
    }
  }

  function nonPublicX(z0, z1, x, n, floors, floorH, skip = []) {
    for (let z = z0 + 1.8; z <= z1 - 1.8 + 1e-6; z += 3.2) {
      if (skip.some(v => Math.abs(v - z) < 1.2)) continue;
      for (let f = 1; f < floors; f++) serviceWinX(x, f * floorH + 1.35, z, 1.75, 1.45, n);
    }
  }

  // Distant service facades keep the exact deterministic bay coordinates with a two-piece
  // recessed window. Public faces retain the full five-piece sill-and-mullion grammar below.
  function serviceWinZ(x, y, z, w, h, n) {
    box(x, y, z + n * .03, w + .14, h + .14, .06, col.glassDark,
      { hard:true, gloss:.20 });
    pane(box(x, y, z + n * .06, w, h, .02, col.glassDay,
      { hard:true, mode:1, gloss:G.glass }), rnd());
  }
  function serviceWinX(x, y, z, w, h, n) {
    box(x + n * .03, y, z, .06, h + .14, w + .14, col.glassDark,
      { hard:true, gloss:.20 });
    pane(box(x + n * .06, y, z, .02, h, w, col.glassDay,
      { hard:true, mode:1, gloss:G.glass }), rnd());
  }

  // ---------------------------------------------------------------- circulation and quad
  path(-3, 19.7, 5.2, 64.6);             // P-SPINE
  path(0, 20, 96, 4.8);                  // P-CROSS
  path(-3, 22, 50, 4);                   // P-QUAD-S
  path(-3, 50, 50, 4);                   // P-QUAD-N
  path(-22, 35, 4, 26);                  // P-QUAD-W
  path(20, 35, 4, 26);                   // P-QUAD-E
  path(26, 50, 8, 4);                    // P-LIBRARY

  flat(-12.2, .010, 35, 11.6, 22, col.grass, { mode:10, gloss:.08 });
  flat(9.2, .010, 35, 17.6, 22, col.grass, { mode:10, gloss:.08 });

  // Lawn kerbs are deliberately visual only. Their omitted intervals are the bench-pad openings.
  const kerbZ = (x0, x1, z) => box((x0 + x1) / 2, .07, z, x1 - x0, .14, .18,
    held(col.kerb, S.stone), { hard:true, gloss:.18, ...S.stone });
  const kerbX = (x, z0, z1) => box(x, .07, (z0 + z1) / 2, .18, .14, z1 - z0,
    held(col.kerb, S.stone), { hard:true, gloss:.18, ...S.stone });
  kerbZ(-18, -6.4, 46); kerbX(-6.4, 24, 46);
  kerbZ(-18, -17.2, 24); kerbZ(-14.8, -9.2, 24);
  kerbX(-18, 24, 28.8); kerbX(-18, 31.2, 40.8); kerbX(-18, 43.2, 46);
  kerbZ(.4, 18, 46); kerbX(.4, 24, 46);
  kerbZ(.4, 9.8, 24); kerbZ(12.2, 18, 24);
  kerbX(18, 24, 28.8); kerbX(18, 31.2, 40.8); kerbX(18, 43.2, 46);

  // 124 m jogging loop. Dots mark corners; transverse ticks mark each ten metres.
  const jogY = .016;
  flat(0, jogY, 23, 38, .12, col.red, { gloss:.10 });
  flat(0, jogY, 47, 38, .12, col.red, { gloss:.10 });
  flat(-19, jogY, 35, .12, 24, col.red, { gloss:.10 });
  flat(19, jogY, 35, .12, 24, col.red, { gloss:.10 });
  for (const [x, z] of [[-19,23],[19,23],[19,47],[-19,47]])
    cyl(x, jogY, z, .225, .012, col.red, { hard:true, gloss:.10 });
  function loopPoint(m) {
    if (m <= 38) return [-19 + m, 23, false];
    if (m <= 62) return [19, 23 + m - 38, true];
    if (m <= 100) return [19 - (m - 62), 47, false];
    return [-19, 47 - (m - 100), true];
  }
  for (let m = 10; m <= 120; m += 10) {
    const [x, z, vertical] = loopPoint(m);
    flat(x, jogY + .002, z, vertical ? .40 : .05, vertical ? .05 : .40, col.cream,
      { gloss:.10 });
  }
  thing('跑道', -19, .03, 35, '沿着跑道跑一圈。', 'Run one lap around the track.',
    '跑道 is a running track. 跑步 is to run.', { focus:[-19,35], reach:1.2 });

  // Exact tactile route. The strip is one raised, batched surface per straight run; its path
  // material repeats at .30 m so the rib rhythm does not cost hundreds of individual props.
  function tactileSegment(a, b) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    box(cx, .014, cz, .30, .028, len, held(col.yellow, S.path),
      { hard:true, ry:yaw, gloss:.10, ...S.path, matScale:.30, mode:11 });
  }
  const tactileMain = [[-11.4,-9.35],[-6,-7.5],[-3,-7.5],[-3,4.8],[-5,4.8],[-5,8.2],[-3,8.2],[-3,50]];
  for (let i = 1; i < tactileMain.length; i++) tactileSegment(tactileMain[i - 1], tactileMain[i]);
  tactileSegment([-3,50], [27.3,50]);
  // Branch B's endpoint (-3,48.4) already lies on the final main-route segment; no coincident
  // overlay is emitted, avoiding a duplicate surface and z-fighting.

  // ---------------------------------------------------------------- B01 — 第一教学楼
  const b01Tag = '教学楼';
  box(-3, 8.85, 57.5, 32, 17.70, 11, held(col.render, S.rend),
    { tag:b01Tag, hard:true, mode:14, gloss:G.paint, ...S.rend });
  box(-3, 1.10, 51.85, 32.60, 2.20, .30, held(col.brick, S.brick),
    { tag:b01Tag, hard:true, mode:11, gloss:G.matte, ...S.brick });
  for (let f = 1; f < 5; f++)
    box(-3, f * 3.30 + .05, 51.84, 32.40, .18, .22, col.renderL,
      { tag:b01Tag, hard:true, gloss:G.paint });
  box(-3, 18.00, 57.5, 32.60, .60, 11.40, held(col.renderD, S.rend),
    { tag:b01Tag, hard:true, gloss:G.paint, ...S.rend });
  box(-3, 18.30, 57.5, 32.70, .10, 11.50, col.stoneD,
    { tag:b01Tag, hard:true, mode:13, gloss:.18 });

  const teachBays = [-17,-13,-9,-5,-1,3,7,11];
  for (let f = 1; f <= 4; f++) for (let bay = 0; bay < teachBays.length; bay++) {
    const x = teachBays[bay], y = f * 3.30 + 1.30;
    fwinZ(x, y, 52, 2.50, 1.60, -1);
    if ((bay + f * 2) % 3 === 0) kit.acBox(x + .95, y - .65, 52, 'z', -1);
  }
  nonPublicZ(-19, 13, 63, 1, 5, 3.30);
  nonPublicX(52, 63, -19, -1, 5, 3.30);
  nonPublicX(52, 63, 13, 1, 5, 3.30);

  // Four glass leaves, a broad override canopy, two columns and exact stepped approach.
  for (const x of [-5.4,-3.8,-2.2,-.6])
    pane(box(x, 1.55, 51.76, 1.44, 2.80, .06, col.glassDark,
      { tag:b01Tag, hard:true, mode:1, gloss:G.glass }), rnd());
  box(-3, 3.10, 49.9, 10, .34, 4.2, held(col.renderD, S.rend),
    { tag:b01Tag, hard:true, gloss:G.paint, ...S.rend });
  for (const x of [-7.2,1.2]) {
    cyl(x, 1.55, 48.5, .15, 3.10, held(col.renderL, S.stone),
      { tag:b01Tag, gloss:G.paint, ...S.stone });
    solid(x - .15, x + .15, 48.35, 48.65);
  }
  [[48.4,.18,9.6],[48.9,.36,9.0],[49.4,.54,8.4]].forEach(([z,h,w]) =>
    box(-3, h / 2, z, w, h, .50, held(col.stoneL, S.stone),
      { tag:b01Tag, hard:true, gloss:G.matte, ...S.stone }));
  signZ(-3, 3.48, 51.82, 6.4, '第一教学楼', b01Tag, -1);
  for (const g of glyphs(-3, 18.00, 51.74, Math.PI, '厚德博学',
    { size:.50, gap:.28, color:col.redD, mode:1, tag:b01Tag })) litten(g, .4);

  solid(-19.20, 13.20, 51.80, 63.20);
  blocker(-19.20, 13.20, 51.80, 63.20, 18.70);
  thing('教学楼', -3, 4.30, 48.8, '第一节课在第一教学楼。',
    'The first class is in teaching block one.',
    '教学 teaching + 楼 building. 上课 is to go to class, 下课 when it ends.',
    { focus:[-3,47.0], reach:3.0 });
  thing('教室', -3, 3.00, 51.3, '教学楼里是教室。',
    'Inside the teaching block is a classroom.',
    '教 to teach + 室 room. 进 is to enter; 出 to go out.',
    { focus:[-3,48.4], reach:2.8 });

  function studyTable(x, z, picnic = false, interactive = false, focus = [x, z - 1.2]) {
    const w = picnic ? 1.8 : 1.4, d = picnic ? 1.0 : .8;
    if (picnic) flat(x, .012, z, 3.2, 2.6, held(col.paveD, S.path),
      { mode:9, gloss:.10, ...S.path });
    box(x, .74, z, w, .08, d, col.trunkL, { tag:'书桌', hard:true, gloss:G.wood });
    for (const sx of [-1,1]) for (const sz of [-1,1])
      box(x + sx * (w / 2 - .10), .37, z + sz * (d / 2 - .10), .08, .74, .08,
        col.trunkL, { tag:'书桌', hard:true, gloss:G.wood });
    box(x, .80, z, .46, .025, .30, col.cream, { tag:'书桌', hard:true, gloss:.14 });
    box(x, .815, z, .025, .025, .30, col.redD, { tag:'书桌', hard:true, gloss:.14 });
    const stoolAt = picnic
      ? [[x - 1.15,z - .32],[x - 1.15,z + .32],[x + 1.15,z - .32],[x + 1.15,z + .32]]
      : [[x - .92,z],[x + .92,z]];
    for (const [sx, sz] of stoolAt) {
      cyl(sx, .40, sz, .045, .80, col.steelD, { tag:'书桌', gloss:G.metal });
      box(sx, .43, sz, .34, .06, .34, col.trunkL, { tag:'书桌', hard:true, gloss:G.wood });
      if (picnic) solid(sx - .17, sx + .17, sz - .17, sz + .17);
    }
    solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    shade(x, z, picnic ? 3.2 : 2.2, picnic ? 2.6 : 1.4, .20);
    if (interactive) thing('书桌', x, .74, z, '书桌上有人忘了书。',
      'Somebody left a book on the desk.',
      '书 book + 桌 table. 复习 is to review; 学习 to study.',
      { focus, reach:1.8 });
  }
  studyTable(-11, 46, false, false);
  studyTable(5, 46, false, true, [5,44.8]);
  studyTable(-12, 34, true, true, [-12,32.6]);
  studyTable(10, 34, true, false);

  // ---------------------------------------------------------------- B02 — 图书馆
  const b02Tag = '图书馆';
  box(36.5, 7.0, 50, 13, 14, 24, held(col.stoneL, S.lib),
    { tag:b02Tag, hard:true, mode:14, gloss:G.paint, ...S.lib });
  box(29.85, 1.10, 50, .30, 2.20, 24.40, held(col.brick, S.brick),
    { tag:b02Tag, hard:true, mode:11, gloss:G.matte, ...S.brick });
  for (const y of [3.20,6.40,9.60,12.80])
    box(29.84, y, 50, .22, .18, 24.20, col.renderL,
      { tag:b02Tag, hard:true, gloss:G.paint });
  box(36.5, 14.30, 50, 13.60, .60, 24.60, held(col.stoneD, S.lib),
    { tag:b02Tag, hard:true, gloss:G.paint, ...S.lib });
  box(36.5, 14.65, 50, 13.70, .10, 24.70, col.stoneD,
    { tag:b02Tag, hard:true, mode:13, gloss:.18 });

  for (const z of [40,43.3,46.6,49.9,53.2,56.5,59.8]) {
    box(29.90, 5.80, z, .20, 8.0, 2.25, col.glassDark,
      { tag:b02Tag, hard:true, gloss:.20 });
    pane(box(29.92, 5.80, z, .04, 7.82, 2.05, col.glassDay,
      { tag:b02Tag, hard:true, mode:1, gloss:G.glass }), rnd());
    for (const y of [3.2,6.4,9.6])
      box(29.76, y, z, .05, .10, 2.05, col.steel,
        { tag:b02Tag, hard:true, gloss:G.metal });
    box(29.78, 1.80, z, .30, .10, 2.45, held(col.stoneD, S.stone),
      { tag:b02Tag, hard:true, gloss:G.matte, ...S.stone });
  }
  nonPublicX(38, 62, 43, 1, 4, 3.20);
  nonPublicZ(30, 43, 38, -1, 4, 3.20);
  nonPublicZ(30, 43, 62, 1, 4, 3.20);

  // Recess and doors; the specified canopy replaces the default mesh, while steps/columns remain.
  box(30, 1.55, 50, .45, 3.10, 3.20, col.glassDark,
    { tag:b02Tag, hard:true, gloss:.20 });
  for (const z of [49.22,50.78])
    pane(box(29.76, 1.55, z, .05, 2.86, 1.48, col.glassDay,
      { tag:b02Tag, hard:true, mode:1, gloss:G.glass }), rnd());
  box(28.9, 3.20, 50, 2.4, .26, 4.4, held(col.stoneD, S.lib),
    { tag:b02Tag, hard:true, gloss:G.paint, ...S.lib });
  [[29.78,.18],[29.48,.12],[29.18,.06]].forEach(([x,h]) =>
    box(x, h / 2, 50, .34, h, 4.0, held(col.stoneL, S.stone),
      { tag:b02Tag, hard:true, gloss:G.matte, ...S.stone }));
  for (const z of [48.05,51.95]) {
    box(27.8, 1.55, z, .18, 3.10, .18, held(col.stoneL, S.stone),
      { tag:b02Tag, hard:true, gloss:G.paint, ...S.stone });
    solid(27.68, 27.92, z - .12, z + .12);
  }
  box(29.70, 3.70, 52.8, .10, 2.20, .52, col.redD,
    { tag:b02Tag, hard:true, gloss:.22 });
  for (const g of glyphs(29.64, 3.70, 52.8, -Math.PI / 2, '图书馆',
    { size:.30, gap:.12, color:col.goldL, mode:1, tag:b02Tag, vertical:true })) litten(g, .9);
  // O08 — returns and opening-hours plate, mounted within the library body collider.
  box(29.70, 1.25, 49, .16, 1.50, 1.20, col.blueSign,
    { tag:b02Tag, hard:true, gloss:.22 });
  glyphs(29.60, 1.48, 49, -Math.PI / 2, '还书',
    { size:.18, gap:.06, color:col.white, mode:1, tag:b02Tag });
  glyphs(29.60, 1.10, 49, -Math.PI / 2, '八点—十点',
    { size:.105, gap:.025, color:col.white, mode:1, tag:b02Tag });

  // Six U-shaped bicycle hoops, leaving the door line at z=50 clear.
  for (let z = 54; z <= 59; z++) {
    for (const dz of [-.30,.30]) capsule(27.8, .38, z + dz, .06, .76, .06, col.steelD,
      { tag:'自行车架', gloss:G.metal });
    capsule(27.8, .76, z, .06, .66, .06, col.steelD,
      { tag:'自行车架', rx:Math.PI / 2, gloss:G.metal });
    solid(27.70, 27.90, z - .40, z + .40);
  }

  solid(29.80, 43.20, 37.80, 62.20);
  blocker(29.80, 43.20, 37.80, 62.20, 14.60);
  const libraryThing = thing('图书馆', 29.55, 2.60, 50,
    '图书馆里很安静。', 'It is very quiet in the library.',
    '图书 books + 馆 hall. 看书 is to read; 安静 is quiet.',
    { focus:[27.30,50], reach:2.6 });
  libraryThing.exit = { place:'library', at:{ x:1.4, z:-3.3, yaw:.02 * Math.PI } };

  return {};
});
