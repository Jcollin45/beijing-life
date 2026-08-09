// 新天地步行街 — the pedestrian lane east of the road. StreetFit['lane'].
//
// STREET-BLUEPRINT.md Part 3's one piece of new ground, and the answer to its finding 1: seven of
// the district's thirteen doors stood on a single 27 m line at x 41.60 facing west. Two of them
// crossed the road to the corner block's east elevation (js/street-bank.js, the 药店 section of
// js/street-civic.js); the other two — 北京新天地 and 大超市 — come in here, off the road
// altogether, onto a lane that runs east and has a frontage on BOTH sides.
//
// ---------------------------------------------------------------------------------------------
// WHERE THE MOUTH IS, AND WHY IT IS THE ONLY PLACE IT COULD BE
//
// A lane opening off x 41.60 has to be entered from the `road` zone, which ends at x 39.80 with
// `clampMove` holding the body at 39.50. So the mouth needs four metres or more of clear far
// pavement in front of it, and when this was first attempted every metre between z -13.5 and 13.5
// was taken:
//
//     -13.5 .. -5.60   北京新天地, a 7.20 m portal        -1.20 ..  0.00   the bike rank
//     -5.68 .. -3.68   the 商务区 metro mouth              0.68 / 2.20     guard / office door
//     -3.68 .. -1.20   2.48 m — the only gap, too narrow   3.24 .. 11.90   courier, hedge, camera,
//                                                                          大超市, 公示栏, hedge
//
// The way through is that **the mall's own portal is the hole**. 北京新天地 is leaving the parade
// anyway, so the 7.20 m it occupied is the mouth: z -12.60 .. -5.80, 6.80 m of it, which is wider
// than the hutong. Nothing had to be squeezed and the metro mouth did not have to move.
//
// js/street.js does three things for this: it leaves a gap in the procedural parade at the same z,
// it stops drawing the mall portal, and it splits the far-side backstop blocker so the lane is not
// standing inside it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT THIS FILE KEEPS
//
//  * **Both frontages are on the district datum.** `S.FASCIA / S.FASCIAH` for the name boards,
//    exactly as the alley's three shops are. A new street built off its own numbers would have
//    re-made the fault this whole re-plan exists to fix.
//  * **±z facing, not ±x.** The lane runs east-west, so its shopfronts face across it — the same
//    orientation the alley's do, which is why the boards can use the shell's own `signBoard`
//    geometry idiom rather than the hand-built -x frontages the parade needs.
//  * **The body's limits are measured, not assumed.** The walkable zone is inset from the built
//    faces by more than the 0.30 m body radius everywhere, so nothing here needs a collider except
//    the two side walls and the end.

(() => {
  'use strict';

  try { Glyphs.need('北京新天地大超市购物中心步行街欢迎光临二十四小时营业'); } catch (_) {}

  // ---------------------------------------------------------------- the lane, measured
  const LX0 = 41.60;            // the mouth, on the far building line
  const LX1 = 59.00;            // the closed east end
  const LZ0 = -12.60;           // south frontage plane
  const LZ1 = -5.80;            // north frontage plane
  const LZC = (LZ0 + LZ1) / 2;  // -9.20, which is where the mall portal used to stand
  const WALL = 8.0;             // how deep the side blocks are
  const BH = 13.5;              // and how tall

  const lit = [];
  let lastLight = -1;

  StreetFit['lane'] = S => {
    const { box, cyl, ball, taper, flat, glyphs, solid, blocker, glow, thing,
            cap, light, C, G, col, FASCIA, FASCIAH } = S;

    // The zone. Published the way js/street-hotel.js publishes its forecourt, because `zones` is
    // built in the scene object at the end of street.js's `build` and a district cannot push into
    // it directly. x0 39.30 overlaps the road zone (which ends at 39.80) so the two are genuinely
    // connected after clampMove spends the body radius on each edge — the same trick the
    // hospital spine uses at its south end.
    S.LANE_ZONE = { id: 'lane', x0: 39.30, x1: LX1 - .60, z0: LZ0 + .55, z1: LZ1 - .55,
                    light: [50.0, 5.4, LZC] };

    const PAVE = C('#b8b2a4'), PAVED = C('#a49e91');
    const REND = C('#cdc6b6'), RENDD = C('#a8a294'), BAND = C('#8d8779');
    const GLASSD = C('#26313a'), GLASS = C('#9bb8c4'), WARMI = C('#e9d3a6'), COOLI = C('#dfe8ee');
    const RED = C('#9c2a22'), REDD = C('#6e1c17'), GOLD = C('#e0b850'), CREAM = C('#e9dfc6');
    const STEEL = C('#8b9095');
    const PMAT = { mat: 'plaster', matScale: 2.6, matAmt: .13 };

    const emis = (p, k) => { lit.push({ p, day: p.glow || 0, night: k }); return p; };

    // ---------------------------------------------------------------- the ground
    // Paved, not asphalt: this is a 步行街 and the surface is the first thing that says so. Laid
    // 20 cm past each frontage so no daylight shows between the paving and the wall.
    flat((LX0 + LX1) / 2, .008, LZC, LX1 - LX0, LZ1 - LZ0 + .40, PAVE,
      { mode: 9, gloss: .16, mat: 'stone', matScale: 1.1, matAmt: .18 });
    // A darker band down the centre, which every pedestrian street in this city has and which is
    // what stops 18 metres of one tone reading as a car park.
    flat((LX0 + LX1) / 2, .010, LZC, LX1 - LX0, 1.60, PAVED, { mode: 9, gloss: .18 });
    for (let x = LX0 + 1.6; x < LX1 - 1.0; x += 2.40)
      flat(x, .012, LZC, .12, 1.60, C('#8f8a7e'), { gloss: .14 });

    // ---------------------------------------------------------------- the two side blocks
    // One mass a side, with the shopfront band and canopy the parade uses so the lane reads as
    // the same city. The blocks are what the backstop used to be doing here, so they carry the
    // colliders now.
    for (const side of [-1, 1]) {
      const zf = side < 0 ? LZ0 : LZ1;                 // the frontage plane
      const zc = zf + side * -1 * (WALL / 2);          // centre of the mass, away from the lane
      const cz = zf - side * (WALL / 2);
      box((LX0 + LX1) / 2, BH / 2, cz, LX1 - LX0, BH, WALL, REND,
        { hard: true, mode: 14, gloss: G.paint, ...PMAT });
      box((LX0 + LX1) / 2, BH + .30, cz, LX1 - LX0 + .22, .60, WALL + .22, RENDD,
        { hard: true, gloss: G.paint });
      // shopfront band at street level and the canopy over it
      box((LX0 + LX1) / 2, 2.05, zf + side * .17, LX1 - LX0, 4.10, .34, GLASSD,
        { hard: true, gloss: .30 });
      box((LX0 + LX1) / 2, 4.44, zf + side * -.10, LX1 - LX0 + .24, .28, .55, RENDD,
        { hard: true, gloss: G.paint });
      // the string course the boards sit above, so the datum has something to sit on here too
      box((LX0 + LX1) / 2, 3.00, zf + side * .06, LX1 - LX0 + .12, .22, .12, BAND,
        { hard: true, gloss: G.paint });
      blocker(LX0 - .4, LX1 + .4, Math.min(cz - WALL / 2, cz + WALL / 2),
              Math.max(cz - WALL / 2, cz + WALL / 2), BH);
      solid(LX0 - .4, LX1 + .4, side < 0 ? cz - WALL / 2 : zf - .02,
                                 side < 0 ? zf + .02 : cz + WALL / 2);

      // upper windows, so the lane has six storeys over it like the road does
      const bays = Math.round((LX1 - LX0) / 3.4);
      for (let f = 0; f < 3; f++) for (let i = 0; i < bays; i++) {
        const wx = LX0 + (i + .5) * ((LX1 - LX0) / bays), wy = 6.4 + f * 2.85;
        box(wx, wy, zf + side * .04, 2.16, 1.62, .08, GLASSD, { hard: true, gloss: .20 });
        emis(box(wx, wy, zf + side * .09, 2.00, 1.46, .04, GLASS,
          { hard: true, mode: 1, gloss: G.glass }), .13);
        box(wx, wy - .88, zf + side * .14, 2.36, .08, .20, RENDD, { hard: true, gloss: G.paint });
      }
    }

    // ---------------------------------------------------------------- the closed east end
    box((LX0 + LX1) / 2 + (LX1 - LX0) / 2 + 1.5, BH / 2, LZC, 3.0, BH, LZ1 - LZ0 + WALL * 2, REND,
      { hard: true, mode: 14, gloss: G.paint, ...PMAT });
    blocker(LX1, LX1 + 3.2, LZ0 - .4, LZ1 + .4, BH);
    solid(LX1 - .02, LX1 + 3.2, LZ0 - .4, LZ1 + .4);
    // and a stair up to whatever is behind it, so the end reads as a place and not a wall
    for (let i = 0; i < 5; i++)
      box(LX1 - .55 + i * .28, .09 + i * .17, LZC, .28, .18 + i * .17, 4.60, C('#b4aea0'),
        { hard: true, mode: 9, gloss: .20 });

    // ---------------------------------------------------------------- the units
    // Four a side, on the district's own fascia datum. Not the parade's seeded shuffle: this is a
    // short lane and a repeated random sign row at eighteen metres reads as wallpaper.
    const NORTH = ['奶茶店', '手机店', '眼镜店', '书店'];
    const SOUTH = ['面包房', '花店', '文具店', '水果店'];
    const BOARDC = [RED, C('#1f4f8f'), C('#2f7a4f'), C('#b8862f')];
    for (const side of [-1, 1]) {
      const zf = side < 0 ? LZ0 : LZ1, names = side < 0 ? SOUTH : NORTH;
      // The mall takes the north side's middle two bays and the hypermarket the south's, so the
      // units run either side of them rather than through them.
      const skip = side < 0 ? [1, 2] : [1, 2];
      for (let i = 0; i < 4; i++) {
        if (skip.includes(i)) continue;
        const ux = LX0 + 2.2 + i * 4.30, w = 3.60;
        emis(box(ux, 1.70, zf + side * .30, w - .5, 2.60, .06, GLASS,
          { hard: true, mode: 1, gloss: G.glass }), .18);
        emis(box(ux, 1.55, zf + side * .38, w - .9, 2.20, .04,
          side < 0 ? COOLI : WARMI, { hard: true, mode: 1, glow: .04 }), .22);
        // the name board, on FASCIA / FASCIAH like every other shop in the district
        const base = BOARDC[i % BOARDC.length];
        box(ux, FASCIA, zf + side * .26, w, FASCIAH, .18, base, { hard: true, gloss: .30 });
        const nm = names[i], gs = Math.min(FASCIAH * .70, (w - .30) / nm.length * .86);
        for (const g of glyphs(ux, FASCIA, zf + side * .36, side < 0 ? 0 : Math.PI, nm,
            { size: gs, gap: gs * .16, color: base === BOARDC[3] ? C('#2a2723') : CREAM,
              mode: 1, glow: .20, lift: .012 }))
          emis(g, .55);
        // a planter each side of the door, the same pair the parade's open units get
        for (const s of [-1, 1]) {
          taper(ux + s * (w / 2 - .45), .21, zf + side * .72, .40, .42, .40, C('#8a8378'),
            { gloss: .22 });
          ball(ux + s * (w / 2 - .45), .52, zf + side * .72, .26, .20, .26, col.greenD,
            { mode: 15, gloss: .12 });
        }
      }
    }

    // ---------------------------------------------------------------- 北京新天地, on the north
    // Off the road and onto the lane, facing -z across it. Everything about it that mattered on
    // the parade is here — the recessed automatic door, the warm lobby behind the glass, the gold
    // mullions, the red fascia with the name in gold — rebuilt in this lane's own ±z facing
    // rather than rotated out of the -x one, because a rotation swaps the size arguments of every
    // box as well as its position and there is no identity to check the result against.
    const MX = 47.20, MZ = LZ1;
    box(MX, 3.35, MZ + .58, 7.20, 6.70, 1.12, C('#2a2d31'), { hard: true, gloss: .30, tag: '购物中心' });
    box(MX, 3.08, MZ + 1.16, 5.95, 5.75, .10, GLASSD, { hard: true, gloss: .22, tag: '购物中心' });
    emis(box(MX, 3.08, MZ + 1.22, 5.72, 5.55, .045, GLASS,
      { hard: true, mode: 1, alpha: .70, gloss: G.glass, tag: '购物中心' }), .16);
    emis(box(MX, 2.12, MZ + 1.10, 5.22, 3.86, .05, WARMI,
      { hard: true, mode: 1, glow: .08, tag: '购物中心' }), .42);
    for (const s of [-1, 1]) {
      box(MX + s * .82, 1.50, MZ + 1.34, .10, 2.88, .14, col.gold,
        { hard: true, gloss: G.metal, tag: '购物中心' });
      cap(MX + s * .23, 1.46, MZ + 1.44, .026, .46, .026, col.goldL,
        { gloss: G.metal, tag: '购物中心' });
    }
    box(MX, 5.42, MZ + 1.35, 6.25, 1.12, .16, REDD, { hard: true, gloss: .28, tag: '购物中心' });
    for (const g of glyphs(MX, 5.42, MZ + 1.46, Math.PI, '北京新天地',
      { size: .50, gap: .16, color: col.goldL, mode: 1, glow: .22, lift: .012, tag: '购物中心' }))
      emis(g, .70);
    // the blade, out into the lane where it is read walking up it
    box(MX - 3.18, 4.70, MZ + 2.05, .86, 3.30, .42, REDD,
      { hard: true, gloss: .28, tag: '购物中心' });
    glyphs(MX - 3.18, 4.70, MZ + 2.28, Math.PI, '购物中心',
      { size: .33, gap: .12, vertical: true, color: col.goldL, mode: 1, glow: .18, tag: '购物中心' });
    for (const s of [-1, 1]) {
      taper(MX + s * 2.65, .28, MZ + 2.05, .54, .56, .54, C('#8a8378'), { gloss: .24 });
      ball(MX + s * 2.65, .68, MZ + 2.05, .35, .38, .35, col.green, { mode: 15, gloss: .12 });
    }
    if (typeof light === 'function') light(MX, 3.2, MZ + 2.4, [1.0, .84, .60], .40, 7.0);
    thing('购物中心', MX, 5.42, MZ + 1.30, '这个购物中心有电影院和美食广场。',
      'This shopping mall has a cinema and a food court.',
      '购物 shopping + 中心 centre. 商场 is the everyday shorter word.',
      { focus: [MX, MZ + 2.55], reach: 2.4 });

    // ---------------------------------------------------------------- 大超市, on the south
    // Facing +z, so the two anchors look at each other down the lane and the lane has a reason to
    // be walked from end to end. Its interior light is cool where the mall's is warm, which is the
    // distinction the parade version was built on and the only thing that tells a supermarket from
    // a shopping centre at forty metres.
    const SX = 53.20, SZ = LZ0;
    box(SX, 2.90, SZ - .50, 9.60, 5.80, 1.00, C('#dcd6c8'), { hard: true, gloss: .24, tag: '大超市' });
    emis(box(SX, 2.30, SZ - 1.06, 8.90, 4.20, .05, GLASS,
      { hard: true, mode: 1, alpha: .62, gloss: G.glass, tag: '大超市' }), .14);
    emis(box(SX, 2.10, SZ - .98, 8.40, 3.60, .05, COOLI,
      { hard: true, mode: 1, glow: .07, tag: '大超市' }), .40);
    box(SX, 5.05, SZ - 1.10, 9.20, 1.10, .18, REDD, { hard: true, gloss: .26, tag: '大超市' });
    for (const g of glyphs(SX, 5.05, SZ - 1.22, 0, '大超市',
      { size: .62, gap: .20, color: C('#f2e4c4'), mode: 1, glow: .22, lift: .012, tag: '大超市' }))
      emis(g, .70);
    for (const s of [-1, 1])
      box(SX + s * .78, 1.30, SZ - 1.12, 1.44, 2.60, .06, STEEL,
        { hard: true, gloss: G.metal, tag: '大超市' });
    // the nested trolleys outside, which is the real sign
    for (let i = 0; i < 5; i++) {
      const tx = SX + 3.05 + i * .30;
      taper(tx, .52, SZ - 2.15, .80, .40, .50, STEEL,
        { hard: true, gloss: G.metal, tag: '大超市' });
      cap(tx - .34, .84, SZ - 2.15, .018, .46, .018, C('#c8452f'),
        { rz: Math.PI / 2, gloss: .30, tag: '大超市' });
    }
    if (typeof light === 'function') light(SX, 3.2, SZ - 2.4, [.80, .88, 1.0], .34, 7.0);
    thing('大超市', SX, 5.05, SZ - 1.30, '大超市什么都有，比小卖部便宜。',
      'The hypermarket has everything, and it is cheaper than the corner shop.',
      '超市 is any supermarket; 大超市 is the big one you take a trolley round.',
      { focus: [SX, SZ - 2.55], reach: 2.4 });

    // ---------------------------------------------------------------- the gateway at the mouth
    // A 步行街 in this city is announced. Two piers and a beam across the entrance with the
    // street's name on it, standing just inside the building line so it reads from the crossing.
    for (const s of [-1, 1]) {
      box(LX0 + .55, 3.10, LZC + s * (LZ1 - LZ0) / 2, 1.10, 6.20, .90, REDD,
        { hard: true, gloss: .26 });
      box(LX0 + .55, 6.35, LZC + s * (LZ1 - LZ0) / 2, 1.26, .40, 1.06, RED,
        { hard: true, gloss: .26 });
    }
    box(LX0 + .55, 6.55, LZC, 1.10, .90, LZ1 - LZ0, REDD, { hard: true, gloss: .26 });
    for (const s of [-1, 1])
      for (const g of glyphs(LX0 + .55 - s * .56, 6.55, LZC, s > 0 ? -Math.PI / 2 : Math.PI / 2,
          '新天地步行街',
          { size: .46, gap: .16, color: col.goldL, mode: 1, glow: .20, lift: .012 }))
        emis(g, .80);
    solid(LX0 + .10, LX0 + 1.00, LZ0, LZ0 + 1.00);
    solid(LX0 + .10, LX0 + 1.00, LZ1 - 1.00, LZ1);
    if (typeof light === 'function') light(LX0 + 1.6, 4.0, LZC, [1.0, .82, .58], .34, 9.0);
  };

  // ---------------------------------------------------------------- what the clock does to it
  // Same shape as js/street-bank.js: written once when day/night actually crosses, never per
  // frame. A lane of lit shopfronts is most of what this place is after dark.
  StreetFit['lane'].tick = (t, body, mins) => {
    if (mins === undefined) return;
    const h = (mins / 60) % 24;
    const night = h < 6.4 || h >= 18.3 ? 1 : 0;
    if (night === lastLight) return;
    lastLight = night;
    for (const q of lit) q.p.glow = night ? q.night : q.day;
  };
})();
