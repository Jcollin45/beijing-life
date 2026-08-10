// Campus west fit — canteen, administration/international services and science/innovation.
CampusFits.register('west', 30, kit => {
  const {
    box, cyl, ball, capsule, flat, glyphs, solid, blocker, shade, thing, dynamic,
    col, G, S, held, rnd, pick, pane, litten, fwinZ, fwinX, acBox,
    serviceWindowAccents,
  } = kit;

  const path = (x, z, w, d, color = col.paveL) =>
    flat(x, .008, z, w, d, held(color, S.path), { mode:9, gloss:.12, ...S.path });

  function boardX(x, y, z, w, h, text, tag, face = 1, blue = false, vertical = false) {
    const panel = blue ? col.blueSign : col.redD;
    const ink = blue ? col.white : col.goldL;
    box(x, y, z, .12, h, w, panel, { tag, hard:true, gloss:.22 });
    for (const g of glyphs(x + face * .07, y, z, face > 0 ? Math.PI / 2 : -Math.PI / 2, text,
      { size:Math.min(.27, h * .45), gap:.08, color:ink, mode:1, tag, vertical }))
      litten(g, blue ? .5 : .85);
  }

  function eastEntrance(x, z, doorWidth, tag) {
    // Dark reveal and two glazed leaves on the east-facing public wall.
    box(x + .03, 1.55, z, .30, 3.10, doorWidth, col.glassDark,
      { tag, hard:true, gloss:.20 });
    for (const dz of [-doorWidth / 4, doorWidth / 4])
      pane(box(x + .18, 1.55, z + dz, .05, 2.82, doorWidth / 2 - .10, col.glassDay,
        { tag, hard:true, mode:1, gloss:G.glass }), rnd());
    // Default three visual-only steps, override-free canopy, and two blocking columns.
    [[.22,.18],[.52,.12],[.82,.06]].forEach(([off,h]) =>
      box(x + off, h / 2, z, .34, h, doorWidth + .8, held(col.stoneL, S.stone),
        { tag, hard:true, gloss:G.matte, ...S.stone }));
    box(x + 1.15, 3.10, z, 2.40, .26, doorWidth + 1.0, held(col.renderD, S.rend),
      { tag, hard:true, gloss:G.paint, ...S.rend });
    for (const dz of [-doorWidth / 2 - .35, doorWidth / 2 + .35]) {
      box(x + 2.20, 1.55, z + dz, .18, 3.10, .18, held(col.renderL, S.stone),
        { tag, hard:true, gloss:G.paint, ...S.stone });
      solid(x + 2.08, x + 2.32, z + dz - .12, z + dz + .12);
    }
  }

  function windowsX(x, n, zs, floors, floorH, skip = []) {
    for (let bay = 0; bay < zs.length; bay++) {
      const z = zs[bay];
      if (skip.some(v => Math.abs(v - z) < 1.2)) continue;
      for (let f = 1; f < floors; f++) {
        const y = f * floorH + 1.35;
        fwinX(x, y, z, 1.75, 1.45, n);
        if ((bay + f * 2) % 3 === 0) acBox(x, y - .60, z, 'x', n);
      }
    }
  }

  function windowsZ(z, n, xs, floors, floorH, skip = []) {
    for (let bay = 0; bay < xs.length; bay++) {
      const x = xs[bay];
      if (skip.some(v => Math.abs(v - x) < 1.2)) continue;
      for (let f = 1; f < floors; f++) {
        const y = f * floorH + 1.35;
        fwinZ(x, y, z, 1.75, 1.45, n);
        if ((bay + f * 2) % 3 === 0) acBox(x, y - .60, z, 'z', n);
      }
    }
  }

  function serviceWindowsX(accents, x, n, zs, floors, floorH, skip = []) {
    for (const z of zs) {
      if (skip.some(v => Math.abs(v - z) < 1.2)) continue;
      for (let f = 1; f < floors; f++) {
        const y = f * floorH + 1.35;
        box(x + n * .03, y, z, .06, 1.59, 1.89, col.glassDark,
          { hard:true, gloss:.20 });
        pane(box(x + n * .055, y, z, .02, 1.45, 1.75, col.glassDay,
          { hard:true, mode:1, gloss:G.glass }), rnd());
        accents.addX(x, y, z, 1.75, 1.45, n);
      }
    }
  }

  function serviceWindowsZ(accents, z, n, xs, floors, floorH, skip = []) {
    for (const x of xs) {
      if (skip.some(v => Math.abs(v - x) < 1.2)) continue;
      for (let f = 1; f < floors; f++) {
        const y = f * floorH + 1.35;
        box(x, y, z + n * .03, 1.89, 1.59, .06, col.glassDark,
          { hard:true, gloss:.20 });
        pane(box(x, y, z + n * .055, 1.75, 1.45, .02, col.glassDay,
          { hard:true, mode:1, gloss:G.glass }), rnd());
        accents.addZ(x, y, z, 1.75, 1.45, n);
      }
    }
  }

  function regular(from, to) {
    const out = [];
    for (let v = from + 1.8; v <= to - 1.8 + 1e-6; v += 3.2) out.push(v);
    return out;
  }

  // District connectors and the wall-side delivery lane, split around the west gate.
  path(-25.5, 2.5, 7, 4, col.paveD);       // P-CANTEEN
  path(-26.5, 30, 5, 4);                   // P-ADMIN
  path(-25, 50, 6, 4);                     // P-SCIENCE
  path(-45.5, 3, 3, 28, col.paveD);        // P-W-SERVICE south run, z=-11..17
  path(-45.5, 44, 3, 42, col.paveD);       // P-W-SERVICE north run, z=23..65

  // ---------------------------------------------------------------- B03 — 学生食堂
  const canteen = '食堂';
  box(-36, 2.90, 2.5, 14, 5.80, 19, held(col.renderD, S.plas),
    { tag:canteen, hard:true, mode:14, gloss:G.paint, ...S.plas });
  box(-28.85, .70, 2.5, .30, 1.40, 19.20, held(col.stoneL, S.tile),
    { tag:canteen, hard:true, mode:14, gloss:G.matte, ...S.tile });
  box(-36, 5.56, 2.5, 14.5, .38, 19.4, held(col.renderL, S.plas),
    { tag:canteen, hard:true, gloss:G.paint, ...S.plas });
  box(-36, 5.80, 2.5, 14.6, .10, 19.5, col.renderD,
    { tag:canteen, hard:true, mode:13, gloss:.18 });

  // East public opening, raised roller shutter, warm room slab and three silhouettes.
  box(-28.80, 1.55, 2.5, .24, 3.10, 4.20, col.charcoal,
    { tag:canteen, hard:true, gloss:.24 });
  litten(box(-28.64, 1.48, 2.5, .04, 2.82, 3.86, col.cream,
    { tag:canteen, hard:true, mode:1, glow:.30 }), .55);
  for (const [z,w,h,y] of [[1.35,.52,1.34,1.02],[2.58,.42,1.62,1.18],[3.55,.46,1.22,.98]])
    box(-28.60, y, z, .035, h, w, col.charcoal,
      { tag:canteen, hard:true, mode:1, alpha:.76 });
  for (let i = 0; i < 8; i++)
    box(-28.55, 3.14 + i * .06, 2.5, .08, .035, 4.10, col.steel,
      { tag:canteen, hard:true, gloss:G.metal });
  box(-28.72, 4.25, 4.0, .18, .72, 4.60, col.red,
    { tag:canteen, hard:true, gloss:.22 });
  for (const g of glyphs(-28.61, 4.25, 4.0, Math.PI / 2, '学生食堂',
    { size:.34, gap:.13, color:col.goldL, mode:1, tag:canteen })) litten(g, .9);

  // Today's exact four dish/price rows.
  box(-28.78, 1.75, -1.0, .16, 1.60, 2.00, col.white,
    { tag:canteen, hard:true, gloss:.20 });
  glyphs(-28.68, 2.23, -1.0, Math.PI / 2, '今日菜价',
    { size:.14, gap:.04, color:col.redD, mode:1, tag:canteen });
  [['米饭','一元'],['青菜','三元'],['豆腐','四元'],['红烧肉','八元']]
    .forEach(([dish, price], i) => {
      const y = 1.90 - i * .27;
      glyphs(-28.68, y, -.55, Math.PI / 2, dish,
        { size:.105, gap:.025, color:col.charcoal, mode:1, tag:canteen });
      glyphs(-28.68, y, -1.55, Math.PI / 2, price,
        { size:.105, gap:.025, color:col.redD, mode:1, tag:canteen });
    });

  // Rear delivery door, screen and two locked gas cages beside the clear western lane.
  box(-43.08, 1.25, 5.5, .12, 2.50, 2.10, col.steelD,
    { tag:'后勤', hard:true, gloss:G.metal });
  glyphs(-43.16, 2.05, 5.5, -Math.PI / 2, '送货',
    { size:.17, gap:.05, color:col.white, mode:1, tag:'后勤' });
  box(-44.10, 1.10, 5.5, .12, 2.20, 5.0, held(col.steelD, S.steel),
    { tag:'后勤', hard:true, gloss:G.metal, ...S.steel });
  solid(-44.16, -44.04, 3, 8);
  for (const z of [4.2,6.8]) {
    box(-44.55, .75, z, .70, 1.50, 1.00, held(col.steelD, S.steel),
      { tag:'燃气', hard:true, gloss:G.metal, ...S.steel });
    for (let i = -2; i <= 2; i++)
      box(-44.91, .78, z + i * .16, .025, 1.26, .04, col.charcoal,
        { tag:'燃气', hard:true, gloss:.22 });
  }
  solid(-44.90, -44.20, 3.70, 7.30);

  solid(-43.20, -28.80, -7.20, 12.20);
  blocker(-43.20, -28.80, -7.20, 12.20, 6.20);
  const canteenThing = thing('食堂', -28.55, 2.40, 2.5, '食堂的饭又便宜又快。',
    'The canteen food is cheap and quick.',
    '食 food + 堂 hall. 便宜 is cheap; a canteen meal is eight kuai.',
    { focus:[-26.6,2.5], reach:2.6 });
  canteenThing.exit = { place:'campus_canteen' };

  // O04 — vending machine beside the canteen.
  box(-28.35, 1.05, 8.0, .72, 2.10, .70, col.blue,
    { tag:'售货机', hard:true, gloss:.26 });
  box(-27.98, 1.22, 8.0, .035, 1.42, .56, col.glassDark,
    { tag:'售货机', hard:true, mode:1, gloss:G.glass });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
    cyl(-27.94, .68 + r * .46, 7.78 + c * .22, .04, .30,
      pick([col.bike1,col.bike2,col.bike3,col.yellow]), { tag:'售货机', gloss:.30 });
  box(-27.94, 1.78, 8.20, .035, .12, .12, col.goldL,
    { tag:'售货机', hard:true, mode:1, glow:.18 });
  solid(-28.72, -27.98, 7.62, 8.38);
  thing('售货机', -28.35, 1.10, 8, '售货机里有冷饮。',
    'The vending machine has cold drinks.',
    '售 to sell + 货 goods + 机 machine.', { focus:[-26.9,8], reach:2.2 });

  // campus-life.js owns O03 and its animation. This fit owns only the exact painted queue marks.
  for (const z of [-3.5,-4.7,-5.9])
    cyl(-24.2, .014, z, .18, .008, col.yellow, { hard:true, gloss:.10 });

  // ---------------------------------------------------------------- B05 — 行政楼 · 国际学生中心
  const admin = '行政楼';
  box(-36, 6.80, 30, 14, 13.60, 12, held(col.render, S.rend),
    { tag:admin, hard:true, mode:14, gloss:G.paint, ...S.rend });
  box(-28.85, 1.10, 30, .30, 2.20, 12.40, held(col.brick, S.brick),
    { tag:admin, hard:true, mode:11, gloss:G.matte, ...S.brick });
  for (const y of [3.10,6.20,9.30,12.40])
    box(-28.84, y + .05, 30, .22, .18, 12.20, col.renderL,
      { tag:admin, hard:true, gloss:G.paint });
  box(-36, 13.90, 30, 14.60, .60, 12.60, held(col.renderD, S.rend),
    { tag:admin, hard:true, gloss:G.paint, ...S.rend });
  box(-36, 14.25, 30, 14.70, .10, 12.70, col.stoneD,
    { tag:admin, hard:true, mode:13, gloss:.18 });
  eastEntrance(-29, 30, 3.20, admin);

  const adminEast = [25.5,28.5,31.5,34.5];
  windowsX(-29, 1, adminEast, 4, 3.10);
  const b05Service=serviceWindowAccents('b05');
  serviceWindowsX(b05Service, -43, -1, regular(24,36), 4, 3.10);
  serviceWindowsZ(b05Service, 24, -1, regular(-43,-29), 4, 3.10);
  serviceWindowsZ(b05Service, 36, 1, regular(-43,-29), 4, 3.10);
  b05Service.finish();
  boardX(-28.70, 3.72, 30, 4.2, .62, '行政楼', admin, 1);
  boardX(-28.70, 2.72, 33.2, 4.4, .56, '国际学生中心', '学生服务中心', 1, true);

  // O07 wall-mounted services directory; body collision already covers it.
  box(-28.70, 1.65, 27, .16, 1.70, 1.80, col.blueSign,
    { tag:'学生服务中心', hard:true, gloss:.22 });
  glyphs(-28.60, 1.92, 27, Math.PI / 2, '学生服务',
    { size:.16, gap:.05, color:col.white, mode:1, tag:'学生服务中心' });
  glyphs(-28.60, 1.48, 27, Math.PI / 2, '办证·咨询',
    { size:.12, gap:.035, color:col.white, mode:1, tag:'学生服务中心' });

  // Two flag sockets outside the entrance waiting rectangle.
  for (const z of [25.5,34.5]) {
    box(-27.2, .12, z, .24, .24, .24, col.stoneD,
      { tag:admin, hard:true, gloss:.20 });
    cyl(-27.2, 3.0, z, .05, 5.76, col.steel,
      { tag:admin, gloss:G.metal });
    box(-26.65, 5.20, z, 1.0, .58, .035, col.red,
      { tag:admin, hard:true, mode:7, gloss:G.fabric });
    solid(-27.32, -27.08, z - .12, z + .12);
  }
  solid(-43.20, -28.80, 23.80, 36.20);
  blocker(-43.20, -28.80, 23.80, 36.20, 14.20);
  const adminThing = thing('行政楼', -28.75, 3.20, 30, '行政楼里可以办理学校事务。',
    'University administration is handled here.',
    '行政 means administration.', { focus:[-26.6,30], reach:2.6 });
  adminThing.exit = { place:'campus_admin_f1' };
  thing('学生服务中心', -28.62, 2.20, 27, '这里可以办理学生证。',
    'The student service centre can issue a student card.',
    '学生证 is a student ID card.', { focus:[-26.6,27], reach:2.5 });

  // ---------------------------------------------------------------- B06 — 科学与创新楼
  const science = '实验楼';
  box(-35.5, 8.10, 51, 15, 16.20, 22, held(col.renderL, S.rend),
    { tag:science, hard:true, mode:14, gloss:G.paint, ...S.rend });
  box(-27.85, 1.10, 51, .30, 2.20, 22.40, held(col.brick, S.brick),
    { tag:science, hard:true, mode:11, gloss:G.matte, ...S.brick });
  for (const y of [3.65,7.30,10.95,14.60])
    box(-27.84, y + .05, 51, .22, .18, 22.20, col.renderL,
      { tag:science, hard:true, gloss:G.paint });
  box(-35.5, 16.50, 51, 15.60, .60, 22.60, held(col.renderD, S.rend),
    { tag:science, hard:true, gloss:G.paint, ...S.rend });
  box(-35.5, 16.85, 51, 15.70, .10, 22.70, col.stoneD,
    { tag:science, hard:true, mode:13, gloss:.18 });
  eastEntrance(-28, 50, 3.20, science);

  const scienceEast = [42,45.5,49,52.5,56,59.5];
  for (let bay = 0; bay < scienceEast.length; bay++) for (let f = 1; f <= 3; f++) {
    const z = scienceEast[bay], y = f * 3.65 + 1.35;
    fwinX(-28, y, z, 1.75, bay % 2 ? 1.80 : 1.45, 1);
    if ((bay + f * 2) % 3 === 0) acBox(-28, y - .60, z, 'x', 1);
  }
  const b06Service=serviceWindowAccents('b06');
  serviceWindowsX(b06Service, -43, -1, regular(40,62), 4, 3.65);
  serviceWindowsZ(b06Service, 62, 1, regular(-43,-28), 4, 3.65);
  b06Service.finish();
  // Four ordinary office windows on the south face.
  [-40.8,-37.4,-34.0,-30.6].forEach(x => fwinZ(x, 2.15, 40, 1.75, 1.45, -1));

  // Glass stair tower at the northeast corner, visually continuous but covered by the body solid.
  box(-28.075, 8.10, 57.5, 1.05, 16.20, 5.0, col.glassDark,
    { tag:science, hard:true, gloss:.18 });
  pane(box(-27.54, 8.10, 57.5, .035, 15.8, 4.7, col.glassDay,
    { tag:science, hard:true, mode:1, alpha:.58, gloss:G.glass }), rnd());
  for (const y of [3.65,7.30,10.95,14.60])
    box(-27.51, y, 57.5, .04, .12, 4.72, col.steel,
      { tag:science, hard:true, gloss:G.metal });
  boardX(-27.70, 2.25, 53.0, 2.0, .50, '实验室', science, 1, true);

  // Exact roof stacks and screened mechanical box.
  [-40.5,-38.5,-36.5,-34.5,-32.5,-30.5].forEach((x, i) => {
    const h = i % 2 ? 1.5 : 1.1;
    cyl(x, 16.2 + h / 2, 58.5, .20, h, col.steelD,
      { tag:science, gloss:G.metal });
    cyl(x, 16.2 + h + .05, 58.5, .25, .10, col.charcoal,
      { tag:science, gloss:.28 });
  });
  box(-40, 16.70, 43, 3.0, 1.0, 2.5, held(col.steelD, S.steel),
    { tag:science, hard:true, gloss:G.metal, ...S.steel });
  for (let i = -4; i <= 4; i++)
    box(-40 + i * .30, 16.70, 41.73, .08, .76, .04, col.charcoal,
      { tag:science, hard:true, gloss:.22 });

  // O09 — sealed innovation display case and its exact solid.
  box(-25.6, .42, 54, 1.80, .84, .70, col.stoneD,
    { tag:'创新展柜', hard:true, gloss:.18 });
  pane(box(-25.6, 1.28, 54, 1.72, .92, .64, col.glassDay,
    { tag:'创新展柜', hard:true, mode:1, alpha:.35, gloss:G.glass }), rnd());
  ball(-25.6, 1.26, 54, .22, .22, .22, col.gold,
    { tag:'创新展柜', gloss:.36 });
  solid(-26.55, -24.65, 53.55, 54.45);

  solid(-43.20, -27.80, 39.80, 62.20);
  blocker(-43.20, -27.80, 39.80, 62.20, 16.90);
  const scienceThing = thing('实验楼', -27.55, 3.00, 50, '实验楼里正在做研究。',
    'Research is under way in the science building.',
    // Put the usable point on the line where the building collider actually stops the player,
    // not two metres out under the canopy. The visible science door now offers Q immediately.
    '实验 means experiment; 研究 means research.', { focus:[-27.43,50], reach:2.8 });
  scienceThing.exit = { place:'campus_science_f1' };

  return {};
});
