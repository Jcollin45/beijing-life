// Campus east fit — dormitory, student centre/clinic and basketball court.
CampusFits.register('east', 40, kit => {
  const {
    box, cyl, ball, capsule, flat, glyphs, solid, blocker, shade, thing,
    col, G, S, held, rnd, pane, litten, fwinZ, fwinX, acBox, serviceWindowAccents,
  } = kit;

  const path = (x, z, w, d, color = col.paveL) =>
    flat(x, .008, z, w, d, held(color, S.path), { mode:9, gloss:.12, ...S.path });

  function boardX(x, y, z, w, h, text, tag, face = -1, green = false) {
    const panel = green ? col.green : col.redD;
    box(x, y, z, .10, h, w, panel, { tag, hard:true, gloss:.22 });
    for (const g of glyphs(x + face * .06, y, z, face < 0 ? -Math.PI / 2 : Math.PI / 2, text,
      { size:Math.min(.25, h * .44), gap:.075, color:col.goldL, mode:1, tag }))
      litten(g, green ? .55 : .85);
  }

  // Default west-facing entry kit. B04 may extend its outer tread to the authored x=28.6 limit.
  function westEntrance(x, z, doorWidth, tag, canopy, outerStepX, buildCanopy = true) {
    box(x - .03, 1.55, z, .30, 3.10, doorWidth, col.glassDark,
      { tag, hard:true, gloss:.20 });
    for (const dz of [-doorWidth / 4, doorWidth / 4])
      pane(box(x - .18, 1.55, z + dz, .05, 2.82, doorWidth / 2 - .10, col.glassDay,
        { tag, hard:true, mode:1, gloss:G.glass }), rnd());
    [[.22,.18],[.52,.12],[.82,.06]].forEach(([off,h], i) => {
      let depth = .34, cx = x - off;
      if (i === 2 && outerStepX !== undefined) {
        depth = (x - off) - outerStepX;
        depth *= 2;
      }
      box(cx, h / 2, z, depth, h, doorWidth + .8, held(col.stoneL, S.stone),
        { tag, hard:true, gloss:G.matte, ...S.stone });
    });
    if (buildCanopy) box(canopy[0], canopy[1], canopy[2], canopy[3], canopy[4], canopy[5],
      held(col.renderD, S.rend), { tag, hard:true, gloss:G.paint, ...S.rend });
    for (const dz of [-doorWidth / 2 - .35, doorWidth / 2 + .35]) {
      box(x - 2.20, 1.55, z + dz, .18, 3.10, .18, held(col.renderL, S.stone),
        { tag, hard:true, gloss:G.paint, ...S.stone });
      solid(x - 2.32, x - 2.08, z + dz - .12, z + dz + .12);
    }
  }

  function regular(from, to) {
    const out = [];
    for (let v = from + 1.8; v <= to - 1.8 + 1e-6; v += 3.2) out.push(v);
    return out;
  }

  function windowsX(x, n, zs, floors, floorH, skip = []) {
    for (const z of zs) {
      if (skip.some(v => Math.abs(v - z) < 1.2)) continue;
      for (let f = 1; f < floors; f++) fwinX(x, f * floorH + 1.35, z, 1.75, 1.45, n);
    }
  }

  function windowsZ(z, n, xs, floors, floorH, skip = []) {
    for (const x of xs) {
      if (skip.some(v => Math.abs(v - x) < 1.2)) continue;
      for (let f = 1; f < floors; f++) fwinZ(x, f * floorH + 1.35, z, 1.75, 1.45, n);
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

  // District connectors and east service lane, split around the east gate.
  path(25, -2, 10, 4, col.paveD);         // P-DORM
  path(26, 28.5, 8, 9);                   // P-STUDENT
  path(36, 13, 14, 8, col.paveD);         // P-COURT base; asphalt overlay follows
  path(45.5, 3, 3, 28, col.paveD);        // P-E-SERVICE south run, z=-11..17
  path(45.5, 44, 3, 42, col.paveD);       // P-E-SERVICE north run, z=23..65

  // ---------------------------------------------------------------- B04 — 学生宿舍
  const dorm = '宿舍';
  box(36.5, 9.50, -1, 13, 19, 16, held(col.render, S.rend),
    { tag:dorm, hard:true, mode:14, gloss:G.paint, ...S.rend });
  box(29.85, 1.10, -1, .30, 2.20, 16.40, held(col.brick, S.brick),
    { tag:dorm, hard:true, mode:11, gloss:G.matte, ...S.brick });
  for (const y of [3,6,9,12,15,18])
    box(29.84, y + .05, -1, .22, .18, 16.20, col.renderL,
      { tag:dorm, hard:true, gloss:G.paint });
  box(36.5, 19.30, -1, 13.60, .60, 16.60, held(col.renderD, S.rend),
    { tag:dorm, hard:true, gloss:G.paint, ...S.rend });
  box(36.5, 19.65, -1, 13.70, .10, 16.70, col.stoneD,
    { tag:dorm, hard:true, mode:13, gloss:.18 });

  const dormBays = [-7,-4,-1,2,5];
  for (let f = 1; f <= 5; f++) for (let bay = 0; bay < dormBays.length; bay++)
    fwinX(30, f * 3 + 1.35, dormBays[bay], 1.75, 1.50, -1);
  const b04Service=serviceWindowAccents('b04');
  serviceWindowsX(b04Service, 43, 1, regular(-9,7), 6, 3.0);
  serviceWindowsZ(b04Service, -9, -1, regular(30,43), 6, 3.0);
  serviceWindowsZ(b04Service, 7, 1, regular(30,43), 6, 3.0);
  b04Service.finish();

  // Exact six-unit override; no other B04 facade receives an AC box.
  [[0,2],[1,4],[2,1],[3,3],[4,2],[4,5]].forEach(([bay,floor]) =>
    acBox(30, floor * 3 + 1.35, dormBays[bay], 'x', -1));

  westEntrance(30, -2, 2.60, dorm, [28.9,3.10,-2,2.4,.28,3.6], 28.6);
  boardX(29.78, 3.55, -2, 3.8, .54, '学生宿舍', dorm, -1);

  // O01 — three columns by four rows of lockers on the west wall.
  box(29.50, 1.20, 3.5, .50, 2.40, 3.90, col.steelD,
    { tag:'校园快递柜', hard:true, gloss:G.metal });
  for (let row = 0; row < 4; row++) for (let column = 0; column < 3; column++) {
    const y = .36 + row * .56, z = 2.20 + column * 1.30;
    box(29.24, y, z, .035, .50, 1.20, (row + column) % 2 ? col.blue : col.steel,
      { tag:'校园快递柜', hard:true, gloss:.24 });
  }
  glyphs(29.20, 2.55, 3.5, -Math.PI / 2, '校园快递柜',
    { size:.16, gap:.045, color:col.white, mode:1, tag:'校园快递柜' });
  solid(29.25, 29.75, 1.55, 5.45);
  thing('校园快递柜', 29.45, 1.20, 3.5, '校园快递柜在宿舍门口。',
    'The campus parcel lockers are outside the dorm.',
    '快递 is parcel delivery; 柜 is a cabinet.', { focus:[27.8,3.5], reach:2.2 });

  // Delivery trolley at the authored clear-side point.
  box(27.8, .48, 5.2, .80, .96, .60, col.steelD,
    { tag:'送货车', hard:true, gloss:G.metal });
  for (const x of [27.50,28.10]) for (const z of [4.94,5.46])
    cyl(x, .12, z, .09, .06, col.charcoal, { tag:'送货车', rx:Math.PI / 2, gloss:.28 });
  solid(27.40, 28.20, 4.90, 5.50);

  // Two roof laundry frames, each with a rigid perimeter and three wire lines.
  for (const [x,z] of [[34,-3],[39,1]]) {
    box(x, 19.05, z, 2.40, .08, .08, col.steelD,
      { tag:dorm, hard:true, gloss:G.metal });
    box(x, 20.45, z, 2.40, .08, .08, col.steelD,
      { tag:dorm, hard:true, gloss:G.metal });
    for (const sx of [-1.16,1.16])
      box(x + sx, 19.75, z, .08, 1.40, .08, col.steelD,
        { tag:dorm, hard:true, gloss:G.metal });
    for (const y of [19.40,19.75,20.10])
      capsule(x, y, z, 2.30, .025, .025, col.steel,
        { tag:dorm, gloss:G.metal });
  }

  solid(29.80, 43.20, -9.20, 7.20);
  blocker(29.80, 43.20, -9.20, 7.20, 20.0);
  thing('宿舍', 29.55, 4.0, -2, '宿舍楼是学生住的地方。',
    'The dormitory is where the students live.',
    '宿 to lodge + 舍 house.', { focus:[27.4,-2], reach:2.6 });

  // ---------------------------------------------------------------- B07 — 学生活动中心 · 校医院
  const centre = '活动中心';
  box(36.5, 5.10, 28.5, 13, 10.20, 11, held(col.renderL, S.rend),
    { tag:centre, hard:true, mode:14, gloss:G.paint, ...S.rend });
  box(29.85, 1.10, 28.5, .30, 2.20, 11.40, held(col.brick, S.brick),
    { tag:centre, hard:true, mode:11, gloss:G.matte, ...S.brick });
  for (const y of [3,6,9])
    box(29.84, y + .05, 28.5, .22, .18, 11.20, col.renderL,
      { tag:centre, hard:true, gloss:G.paint });
  box(36.5, 10.47, 28.5, 13.60, .54, 11.60, held(col.renderD, S.rend),
    { tag:centre, hard:true, gloss:G.paint, ...S.rend });
  box(36.5, 10.77, 28.5, 13.70, .06, 11.70, col.stoneD,
    { tag:centre, hard:true, mode:13, gloss:.18 });

  westEntrance(30, 27, 2.20, centre, [28.9,3.05,29,2.4,.26,8.0]);
  westEntrance(30, 31, 2.20, '校医院', [28.9,3.05,29,2.4,.26,8.0], undefined, false);
  // The exact public steps and columns remain distinct; the shared canopy mesh is authored once.

  boardX(29.70, 3.68, 27, 3.4, .54, '学生活动中心', centre, -1);
  boardX(29.70, 3.68, 31, 2.4, .54, '校医院', '校医院', -1, true);
  // Green cross above the clinic door.
  box(29.62, 4.34, 31, .08, .72, .20, col.green,
    { tag:'校医院', hard:true, mode:1, glow:.08 });
  box(29.62, 4.34, 31, .08, .20, .72, col.green,
    { tag:'校医院', hard:true, mode:1, glow:.08 });

  // Ground glazing distinguishes club notice wall and clinic waiting area.
  for (const [z,tag,color] of [[24.4,centre,col.blueSign],[33.0,'校医院',col.green]]) {
    box(29.86, 1.50, z, .16, 2.25, 1.45, col.glassDark,
      { tag, hard:true, gloss:.20 });
    pane(box(29.72, 1.50, z, .035, 2.05, 1.28, col.glassDay,
      { tag, hard:true, mode:1, alpha:.42, gloss:G.glass }), rnd());
    box(30.05, 1.28, z, .06, 1.35, .45, color,
      { tag, hard:true, alpha:.76, gloss:.18 });
  }
  windowsX(30, -1, [24.8,28.8,33.0], 3, 3.0, [27,31]);
  const b07Service=serviceWindowAccents('b07');
  serviceWindowsX(b07Service, 43, 1, regular(23,34), 3, 3.0);
  serviceWindowsZ(b07Service, 23, -1, regular(30,43), 3, 3.0);
  serviceWindowsZ(b07Service, 34, 1, regular(30,43), 3, 3.0);
  b07Service.finish();

  // O05/O06 wall-mounted notice cases, covered by the building body solid.
  for (const [z,tag,color,title] of [[27,centre,col.blueSign,'社团通知'],[31,'校医院',col.green,'门诊时间']]) {
    box(29.70, 1.55, z, .16, 1.60, 1.60, color,
      { tag, hard:true, gloss:.22 });
    glyphs(29.60, 1.76, z, -Math.PI / 2, title,
      { size:.14, gap:.04, color:col.white, mode:1, tag });
    glyphs(29.60, 1.36, z, -Math.PI / 2, tag === centre ? '活动报名' : '八点—五点',
      { size:.105, gap:.028, color:col.white, mode:1, tag });
  }

  solid(29.80, 43.20, 22.80, 34.20);
  blocker(29.80, 43.20, 22.80, 34.20, 10.80);
  thing('活动中心', 29.55, 3.20, 27, '活动中心今天有社团活动。',
    'There are club activities in the student centre today.',
    '活动 means activity.', { focus:[27.4,27], reach:2.6 });
  thing('校医院', 29.55, 3.20, 31, '校医院可以看病。',
    'The campus clinic can treat you.',
    '医院 is a hospital or clinic; 看病 is to see a doctor.', { focus:[27.4,31], reach:2.6 });

  // ---------------------------------------------------------------- compact basketball court
  flat(36, .012, 13, 14, 8, held(col.paveD, S.court),
    { tag:'篮球场', mode:9, gloss:.12, ...S.court });
  const paint = (x, z, w, d) => flat(x, .016, z, w, d, col.cream,
    { tag:'篮球场', gloss:.10 });
  paint(36, 9.04, 14, .08); paint(36, 16.96, 14, .08);
  paint(29.04, 13, .08, 8); paint(42.96, 13, .08, 8);
  paint(36, 13, .08, 8);
  // Centre circle, radius 1.1 m.
  for (let i = 0; i < 18; i++) {
    const a = i * Math.PI * 2 / 18;
    paint(36 + Math.cos(a) * 1.1, 13 + Math.sin(a) * 1.1, .13, .13);
  }
  function key(x0, x1) {
    paint((x0 + x1) / 2, 11, x1 - x0, .08);
    paint((x0 + x1) / 2, 15, x1 - x0, .08);
    paint(x0, 13, .08, 4); paint(x1, 13, .08, 4);
  }
  key(30.0,33.2); key(38.8,42.0);
  // Eighteen dotted marks per free-throw arc, opening toward mid-court.
  for (const [cx,dir] of [[33.2,1],[38.8,-1]]) for (let i = 0; i < 18; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 17;
    paint(cx + dir * Math.cos(a) * 1.45, 13 + Math.sin(a) * 1.45, .12, .12);
  }

  function hoop(x, inward) {
    const tag = '篮球场';
    cyl(x, 1.52, 13, .09, 3.04, col.charcoal, { tag, gloss:.28 });
    box(x + inward * .42, 3.30, 13, .10, 1.05, 1.80, col.white,
      { tag, hard:true, gloss:.24 });
    box(x + inward * .48, 3.20, 13, .025, .58, .90, col.orange,
      { tag, hard:true, mode:1, gloss:.18 });
    const rimX = x + inward * .78;
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI * 2 / 12;
      ball(rimX + Math.cos(a) * .23, 3.05, 13 + Math.sin(a) * .23,
        .025, .025, .025, col.orange, { tag, gloss:.30 });
    }
    for (let i = 0; i < 4; i++)
      capsule(rimX, 2.98 - i * .075, 13, .34 - i * .05, .018, .34 - i * .05,
        col.white, { tag, alpha:.68, gloss:.18 });
    solid(x - .20, x + .20, 12.80, 13.20);
  }
  hoop(29.65, 1); hoop(42.35, -1);
  ball(36.2, .13, 11.8, .13, .13, .13, col.orange,
    { tag:'篮球场', gloss:.28 });

  // Five exact chain-link segments; the 2.4 m northwest opening remains empty.
  function fence(x0, x1, z0, z1) {
    const x = (x0 + x1) / 2, z = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    box(x, 1.30, z, w, 2.60, d, col.steel,
      { tag:'篮球场围栏', hard:true, mode:1, alpha:.30, gloss:G.metal });
    const horizontal = w >= d, len = horizontal ? w : d;
    const steps = Math.max(1, Math.floor(len / 2));
    for (let i = 0; i <= steps; i++) {
      const q = -len / 2 + i * len / steps;
      cyl(horizontal ? x + q : x, 1.30, horizontal ? z : z + q, .035, 2.60, col.steelD,
        { tag:'篮球场围栏', gloss:G.metal });
    }
    solid(x0, x1, z0, z1);
  }
  fence(29,43,16.94,17.06);
  fence(29,43,8.94,9.06);
  fence(42.94,43.06,9,17);
  fence(28.94,29.06,9,14.2);
  fence(28.94,29.06,16.6,17);

  thing('篮球场', 29.15, 1.70, 15.4, '晚上在篮球场打球。',
    'We play basketball on the court in the evening.',
    '篮球 basketball + 场 ground. 打球 is to play a ball game.',
    { focus:[27.6,15.4], reach:2.2 });

  return {};
});
