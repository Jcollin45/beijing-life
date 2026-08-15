// 单元门 / 门斗 — the shallow street-side threshold of 十八号楼.
//
// HOME_OUT is fixed at (0.10,-0.20), so a projected vestibule ending at z=-1.06 put the player
// inside its roof and side screens on every arrival. This entry is recessed against the wall under
// street.js's existing shallow weather hood. It keeps the same interactions and night sensor, but
// the nearest built edge is z=-2.20: 2.00 m behind HOME_OUT, with no roof or side wall crossing the
// first four metres of the eastward establishing view.
StreetFit['entry'] = S => {
  const { box, cyl, ball, cap, modelOr, glyphs, thing, light, C } = S;
  const DX = S.DOOR, EZ = S.NB.z1;
  const TAG = { tag:'门斗' };
  const stone = C('#aaa397'), stoneD = C('#756f66');
  const alu = C('#8f989d'), aluD = C('#59636a'), steel = C('#c3c8cb');
  const glass = C('#a9c1c8'), dark = C('#20252b');
  const enamel = C('#1f4f8f'), white = C('#eef2f5');
  const paper = C('#a9362e'), gold = C('#e6c36b');
  const PLAS = { mat:'plaster', matScale:1.60, matAmt:.14 };

  // A dark inner plane, then stone jambs and lintel in front of it. Separate pieces leave a real
  // opening rhythm; there is no full-width facade panel and nothing projects over the pavement.
  // The .140 reveal keeps both faces at least 20 mm from the broad street.js brick datum and more
  // than the depth tolerance from its nearest perspective nosings. The backing remains visually
  // deep without sharing a depth sample with either independently-owned layer.
  box(DX, 1.26, EZ + .140, 2.38, 2.52, .12, dark,
    { hard:true, gloss:.16, ...TAG });
  for (const s of [-1, 1])
    box(DX + s * 1.08, 1.30, EZ + .28, .28, 2.60, .24, stone,
      { hard:true, gloss:.22, ...PLAS, ...TAG });
  box(DX, 2.50, EZ + .28, 2.44, .28, .24, stone,
    { hard:true, gloss:.22, ...PLAS, ...TAG });

  // Closed glazed double leaves. The glass sits 8 cm behind the metal face and the central stile,
  // pulls and kick plates sit in clear front-to-back order, so this reads as a door rather than a
  // coloured rectangle covering the old forced-perspective stair picture.
  for (const s of [-1, 1]) {
    box(DX + s * .48, 1.28, EZ + .37, .92, 2.28, .075, aluD,
      { hard:true, gloss:.42, ...TAG });
    box(DX + s * .48, 1.57, EZ + .415, .72, 1.34, .026, glass,
      { hard:true, mode:18, alpha:.30, gloss:.76, ...TAG });
    box(DX + s * .48, .52, EZ + .42, .72, .54, .035, C('#454d55'),
      { hard:true, gloss:.30, ...TAG });
    cap(DX + s * .18, 1.24, EZ + .46, .022, .46, .022, steel,
      { gloss:.56, ...TAG });
  }
  box(DX, 1.28, EZ + .43, .07, 2.32, .10, aluD,
    { hard:true, gloss:.46, ...TAG });
  box(DX, 2.23, EZ + .43, 1.96, .10, .10, alu,
    { hard:true, gloss:.50, ...TAG });

  // One compact step and threshold, entirely behind the spawn. The former tiled porch floor was
  // 3.40×1.52 m and visually occupied the whole lower frame; paving now remains paving until the
  // actual door sill.
  box(DX, .070, EZ + .60, 2.22, .14, .30, stoneD,
    { hard:true, gloss:.24, mat:'concrete', matScale:.80, matAmt:.12, ...TAG });
  box(DX, .155, EZ + .49, 2.02, .05, .14, C('#57544e'),
    { hard:true, gloss:.34, ...TAG });

  // A short retrofit ramp shares the threshold rise without projecting into the walking route.
  // This frontage pocket is outside the legal body-centre envelope, so the slab is intentionally
  // visual rather than a collider; pushchairs and bicycles still make the entrance read as usable.
  box(DX - 1.42, .078, EZ + .67, .40, .022, .78, C('#7f8489'),
    { hard:true, rx:.176, gloss:.40, tag:'坡道', mat:'concrete', matScale:.50, matAmt:.10 });
  for (const s of [-1, 1])
    box(DX - 1.42 + s * .195, .105, EZ + .67, .022, .05, .78, C('#5e6367'),
      { hard:true, rx:.176, gloss:.34, tag:'坡道' });
  thing('坡道', DX - 1.42, .20, EZ + .67,
    '门槛旁边有一段短坡道，推车可以从这里进门。',
    'A short ramp beside the threshold gives wheeled access to the entrance.',
    '坡道 is a ramp; 无障碍 means step-free or accessible.',
    { tag:'坡道', focus:[DX - 1.05, -1.72], reach:2.0 });

  // One resident e-bike fits between the noodle-shop return and the courier cage. A painted wall
  // label and compact charger make the single bay legible without rebuilding the bulky shed that
  // previously obscured this entry. It remains outside the legal body-centre envelope.
  const bikeX = DX - 4.22, bikeTag = { tag:'门口电动车' };
  modelOr('beijing_commuter_ebike', bikeX, 0, EZ + .51, 1,
    { ...bikeTag, gloss:.30 }, () => {
      for (const z of [EZ + .30, EZ + .70])
        cyl(bikeX, .20, z, .19, .04, C('#26292c'), { rz:Math.PI/2, gloss:.30, ...bikeTag });
      box(bikeX, .42, EZ + .51, .16, .20, .50, C('#3f4a58'),
        { hard:true, gloss:.42, ...bikeTag });
      box(bikeX, .58, EZ + .67, .26, .07, .20, C('#2b2e31'),
        { hard:true, gloss:.30, ...bikeTag });
      cyl(bikeX, .82, EZ + .34, .018, .38, C('#9aa1a6'),
        { rz:Math.PI/2, gloss:.50, ...bikeTag });
      box(bikeX, .70, EZ + .25, .28, .18, .14, C('#4a4f54'),
        { hard:true, gloss:.26, ...bikeTag });
      box(bikeX, .61, EZ + .35, .28, .30, .04, C('#8f5d6a'),
        { hard:true, mode:7, gloss:.20, ...bikeTag });
    });
  box(DX - 4.42, 1.10, EZ + .265, .14, .24, .10, C('#3a4046'),
    { hard:true, gloss:.34, ...bikeTag });
  box(DX - 4.42, 1.13, EZ + .32, .07, .07, .008, C('#59d18a'),
    { hard:true, mode:1, glow:.14, ...bikeTag });
  glyphs(bikeX, 1.42, EZ + .14, 0, '电动车车位',
    { size:.045, gap:.007, color:C('#dfe7eb'), lift:.004, ...bikeTag });
  thing('电动车', bikeX, .95, EZ + .51,
    '门口有一个电动车车位。',
    'There is an e-bike space by the entrance.',
    '电动车 is an e-bike; 充电 means to charge.',
    { tag:'门口电动车', focus:[bikeX, -1.72], reach:1.5 });

  // Everyday waste stays by the entrance instead of requiring a twenty-metre walk to the alley's
  // full sorting station. These two small cans occupy the opposite non-walkable frontage pocket;
  // they add no collider and leave both the door route and the parcel cage clear.
  for (const [x, color, label] of [[DX + 2.98, C('#2f6f4a'), '厨余'],
                                   [DX + 3.62, C('#3a5f8f'), '可回收']]) {
    cyl(x, .34, EZ + .53, .225, .68, color, { gloss:.30, tag:'门口垃圾' });
    cyl(x, .70, EZ + .53, .235, .05, C('#2b2e31'), { gloss:.34, tag:'门口垃圾' });
    box(x, .13, EZ + .75, .30, .05, .09, C('#2b2e31'),
      { hard:true, gloss:.30, tag:'门口垃圾' });
    glyphs(x, .44, EZ + .765, 0, label,
      { size:.058, gap:.009, color:C('#eef2f5'), lift:.004, tag:'门口垃圾' });
  }
  thing('垃圾', DX + 3.30, .82, EZ + .53,
    '门口有厨余和可回收垃圾桶。',
    'Food waste and recyclables have separate bins by the entrance.',
    '垃圾 rubbish. 厨余 food waste. 可回收 recyclable.',
    { tag:'门口垃圾', focus:[DX + 3.30, -1.72], reach:1.5 });

  // A wall-mounted line keeps the washing above the bins and out of the approach. The short span
  // adds lived-in frontage without another pair of posts or a freestanding drying rack.
  const washTag = { tag:'门口晾衣' };
  for (const x of [DX + 2.05, DX + 4.35])
    cyl(x, 2.02, EZ + .15, .016, .16, C('#7d858c'),
      { rx:Math.PI/2, gloss:.40, ...washTag });
  cyl(DX + 3.20, 2.06, EZ + .21, .006, 2.30, C('#c9c2b0'),
    { rz:Math.PI/2, gloss:.12, ...washTag });
  const washColors = [C('#eceae2'), C('#5f7ba0'), C('#b8b0c4')];
  for (let i = 0; i < 3; i++)
    box(DX + 2.45 + i * .72, 1.72, EZ + .22, .46, .62, .04, washColors[i],
      { hard:true, mode:7, gloss:.10, ry:(i - 1) * .06, ...washTag });
  thing('晾衣杆', DX + 3.20, 2.06, EZ + .21,
    '门口的晾衣杆上晒着三件衣服。',
    'Three garments are drying on the line by the entrance.',
    '晾衣杆 is a clothes-drying pole; 晾衣服 means to hang washing out to dry.',
    { tag:'门口晾衣', focus:[DX + 3.20, -1.72], reach:2.1 });

  // Folded canvas stools wait between the notice and the bins. They are stored flat through the
  // day and carried out in the evening, a small domestic cue that does not narrow the passage.
  const stoolTag = { tag:'门口马扎' };
  for (let i = 0; i < 3; i++) {
    const x = DX + 1.85 + i * .24;
    box(x, .30, EZ + .31, .05, .58, .26, C('#5d4a33'),
      { hard:true, gloss:.18, rz:.11 - i * .03, ...stoolTag });
    box(x + .03, .30, EZ + .31, .05, .58, .24, C('#8f5d3a'),
      { hard:true, gloss:.18, rz:.05, ...stoolTag });
    box(x + .015, .38, EZ + .325, .10, .30, .22, C('#3f6f8a'),
      { hard:true, mode:7, gloss:.12, rz:.08, ...stoolTag });
  }
  thing('马扎', DX + 2.09, .66, EZ + .31,
    '三个马扎折好靠在墙边，傍晚有人搬出来坐。',
    'Three folding stools lean against the wall, ready to come out in the evening.',
    '马扎 is a small folding stool, often carried outside to sit and chat.',
    { tag:'门口马扎', focus:[DX + 2.09, -1.72], reach:1.6 });

  // Address hierarchy: building name above, number and unit on the jambs. All are flush to the
  // portal; there is no blade or header slab hanging in the HOME_OUT sky band.
  box(DX, 2.64, EZ + .42, 1.58, .26, .045, enamel,
    { hard:true, gloss:.34, tag:'楼' });
  glyphs(DX, 2.64, EZ + .45, 0, '杨柳胡同十八号',
    { size:.105, gap:.016, color:white, mode:1, lift:.008, tag:'楼' });
  for (const [x, text] of [[DX - 1.08, '一单元'], [DX + 1.08, '3号楼']]) {
    box(x, 1.82, EZ + .43, .16, .42, .035, enamel,
      { hard:true, gloss:.34, tag:'楼' });
    glyphs(x, 1.82, EZ + .455, 0, text,
      { size:.072, gap:.012, vertical:true, color:white, mode:1, lift:.006, tag:'楼' });
  }

  // Reader and intercom occupy the inner faces of the jambs, not freestanding posts.
  box(DX + .99, 1.24, EZ + .44, .12, .20, .045, C('#343b42'),
    { hard:true, gloss:.36, tag:'门禁' });
  box(DX + .99, 1.25, EZ + .468, .07, .07, .010, C('#59d18a'),
    { hard:true, mode:1, glow:.16, tag:'门禁' });
  box(DX - .99, 1.35, EZ + .44, .15, .32, .045, C('#343b42'),
    { hard:true, gloss:.36, tag:'对讲' });
  for (let k = 0; k < 3; k++)
    box(DX - .99, 1.46 - k * .025, EZ + .468, .085, .008, .008, dark,
      { hard:true, tag:'对讲' });
  for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++)
    box(DX - .99 + c * .034, 1.34 - r * .036, EZ + .469, .025, .025, .008, alu,
      { hard:true, gloss:.30, tag:'对讲' });

  // New-year paper stays narrow and architectural. The old porch carried another red head panel;
  // only the couplets remain, so red is detail rather than foreground mass.
  for (const [s, text] of [[1, '春回大地千山秀'], [-1, '日暖神州万木荣']]) {
    box(DX + s * .88, 1.49, EZ + .47, .13, 1.10, .010, paper,
      { hard:true, gloss:.10, tag:'春联' });
    glyphs(DX + s * .88, 1.49, EZ + .478, 0, text,
      { size:.118, gap:.018, vertical:true, color:gold, lift:.007, tag:'春联' });
  }
  box(DX, 2.34, EZ + .47, .62, .14, .010, paper,
    { hard:true, gloss:.10, tag:'春联' });
  glyphs(DX, 2.34, EZ + .478, 0, '万象更新',
    { size:.096, gap:.014, color:gold, lift:.007, tag:'春联' });

  // The single current notice is paper taped to the east jamb. It replaces street.js's metre-high
  // red notice cabinet on the first four metres of the view.
  box(DX + 1.34, 1.34, EZ + .43, .34, .46, .012, C('#eee8d8'),
    { hard:true, mode:1, gloss:.08, tag:'通知' });
  glyphs(DX + 1.34, 1.48, EZ + .44, 0, '通知',
    { size:.075, gap:.012, color:paper, lift:.006, tag:'通知' });
  glyphs(DX + 1.34, 1.31, EZ + .44, 0, '明天停水',
    { size:.048, gap:.008, color:dark, lift:.006, tag:'通知' });

  // Sensor light under the shell's shallow hood. No new roof is required.
  cap(DX + .36, 2.49, EZ + .60, .008, .10, .008, dark, { gloss:.20 });
  const bulb = ball(DX + .36, 2.39, EZ + .60, .050, .060, .050, C('#d0c8b7'),
    { mode:1, glow:0, tag:'门斗' });
  const bulbLight = light(DX + .36, 2.30, EZ + .76, [1.0,.90,.72], 0, 3.4);
  // `light()` defaults to `on:true`; a zero-power light still competes for one of the renderer's
  // eight outdoor light slots.  Keep submission ownership aligned with the sensor, not only power.
  bulbLight.on = false;

  // Interaction contracts retained. 门斗 remains the exterior route into `home`, without an `at`
  // override so game.js still performs the ground-floor lobby arrival.
  const entry = thing('门斗', DX, 1.55, EZ + .42,
    '门斗很浅，感应灯亮了。',
    'The shallow wind lobby sensor light comes on.',
    '门斗 is the small wind lobby at a building entrance.',
    { focus:[DX, -1.72], reach:2.2 });
  entry.exit = { place:'home' };
  thing('门禁', DX + .99, 1.24, EZ + .46,
    '刷卡进楼，门禁滴了一声。',
    'Swipe the card to get in; the reader beeps.',
    '门禁 is the entry control on a building door. 刷卡 is to swipe a card.',
    { focus:[DX + .70, -1.76], reach:2.2 });
  thing('对讲', DX - .99, 1.35, EZ + .46,
    '按房号，楼上有人接对讲。',
    'Press the flat number and somebody upstairs answers the intercom.',
    '对讲 — 对 facing + 讲 speak. 楼宇对讲 is the door-entry intercom.',
    { focus:[DX - .70, -1.76], reach:2.2 });
  thing('春联', DX + .88, 1.55, EZ + .48,
    '门口贴着春联，红纸金字。',
    'A couplet is pasted by the door, gold on red paper.',
    '春联 are the New Year couplets pasted either side of a door.',
    { focus:[DX + .72, -1.72], reach:2.0 });

  let lit = null, until = 0;
  StreetFit['entry'].tick = (t, body, mins) => {
    const h = mins === undefined ? 14 : (mins / 60) % 24;
    const darkNow = h < 6.3 || h >= 18.2;
    if (body) {
      const dx = body.x - DX, dz = body.z - (EZ + .60);
      if (dx * dx + dz * dz < 12) until = t + 8;
    }
    const on = darkNow && t < until;
    if (on === lit) return;
    lit = on;
    bulb.glow = on ? .34 : 0;
    bulb.color = on ? C('#fff0cc') : C('#d0c8b7');
    bulbLight.power = on ? .46 : 0;
    bulbLight.on = on;
  };
};
