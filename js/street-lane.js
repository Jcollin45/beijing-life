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
// The way through is that **the mall's own portal IS the hole**. 北京新天地 is leaving the parade
// anyway, so the 7.20 m it occupied becomes the mouth: z -12.60 .. -5.80, 6.80 m of it, wider than
// the hutong. Nothing had to be squeezed and the metro mouth did not have to move.
//
// js/street.js does three things for this: it leaves a gap in the procedural parade at the same z,
// it stops drawing the mall and hypermarket portals, and it splits the far-side backstop blocker
// so the lane is not standing inside it. js/street-civic.js moves the post box, the sweeper's cart
// and one hedge planter, which were the three things standing in the mouth.
//
// ---------------------------------------------------------------------------------------------
// THE ONE CONVENTION EVERYTHING HERE IS BUILT ON
//
// `n` is a frontage's OUTWARD normal along z: **+1 for the south side, -1 for the north side.**
// Anything in front of a frontage — glass, fascia, blade, planters, trolleys — is at `zf + n * d`
// for positive d; the mass behind it is centred at `zf - n * WALL/2`; and its glyphs face
// `n > 0 ? 0 : Math.PI`, because glyph yaw 0 looks along +z.
//
// This is written down because the first draft of this file got it backwards on BOTH sides and
// built two shopfronts facing into their own buildings. A lane has two frontages pointing at each
// other and that is exactly the geometry where a sign convention has to be stated, not remembered.
//
//  * **Both frontages are on the district datum**, `S.FASCIA / S.FASCIAH`, exactly as the alley's
//    three shops are. A new street built off its own numbers would have re-made the fault this
//    whole re-plan exists to fix.
//  * The walkable zone is inset from every built face by more than the 0.30 m body radius, so
//    nothing here needs a collider except the two side blocks, the end and the gateway piers.
//
// ---------------------------------------------------------------------------------------------
// WHERE THE STOREFRONT DRESSING IS ALLOWED TO STAND (STOREFRONT-UPGRADES.md, lane L3)
//
// `clampMove` reads the walkable zones and the solid list and nothing else, so the arithmetic
// that decides whether a crate needs a collider is done once, here, and every placement below is
// measured against it rather than looked at:
//
//     S.LANE_ZONE   x 39.30 .. 58.30   z -11.90 .. -6.50      the zone, as published above
//     body centre   x 39.60 .. 58.00   z -11.60 ..  -6.80     the same, less the 0.30 m radius
//
// So there is a **1.00 m strip against each frontage that the body can never enter**: z -12.60 ..
// -11.60 on the south, z -6.80 .. -5.80 on the north. Everything this file stands on the pavement
// — goods, A-boards, bins, the mouth clutter, the cycle bay — is inside one of those two strips
// or outside the zone entirely, and therefore calls neither `solid` nor `blocker`. That is a
// stronger statement than a measurement: the lane's clear run is bit-identical with the dressing
// and without it.
//
// **One collider is added**, and only one: the 三轮车 unloading outside 大超市 (B2), which has to
// stand out in the lane or it is not a delivery. `solid(49.30, 51.70, -12.60, -10.62)` holds the
// body at z >= -10.32 across those 2.40 m, leaving 3.52 m of body-centre travel and **4.12 m
// clear**. B1's floor is 3.40 m, so it clears it by 0.72 m and it is the narrowest point in the
// lane.
//
// The cycle bay (B4) is at x 39.70 .. 41.45, z -14.60 .. -12.90: south of the lane's mouth, on
// the far pavement, where the road zone already stops the body at x 39.50 and the lane zone does
// not reach. Outside every zone, so outside every question about width.

(() => {
  'use strict';

  try { Glyphs.need('北京新天地大超市购物中心步行街奶茶店书店花店面包房' +
                    '微信支付宝今日特价鲜绿植珍珠可回收物其他垃圾单车停放'); } catch (_) {}

  // ---------------------------------------------------------------- the lane, measured
  const LX0 = 41.60;            // the mouth, on the far building line
  const LX1 = 59.00;            // the closed east end
  const LZ0 = -12.60;           // SOUTH frontage plane, outward normal +1
  const LZ1 = -5.80;            // NORTH frontage plane, outward normal -1
  const LZC = (LZ0 + LZ1) / 2;  // -9.20, which is where the mall portal used to stand
  const WALL = 8.0;             // how deep the side blocks are
  // 11.0, not the 13.5 this was first built at. Measured off the live site at 12:00: a 6.80 m lane
  // between two 13.5 m blocks is a 2:1 canyon and at midday the whole upper half of both walls
  // read black — the shopfronts were lit and everything above them was a back alley. 11.0 is a
  // 1.6:1 ratio, which is what a 步行街's flanking buildings actually are: lower than the blocks
  // on the main road they open off, because the point of the street is that daylight reaches it.
  const BH = 11.0;

  // ---------------------------------------------------------------- what the clock switches
  // Emissive faces in groups, and a group is written only on the frame its own state changes.
  // Group 0 is the lane's dusk — the two anchors, the gateway, the festoon, the upper windows.
  // Each small unit then gets a group carrying that shop's own trading hours, which is the whole
  // of C5: four units that light and unlight together are one switch, and one switch is not a
  // street. Six groups, six comparisons a frame, and nothing written in between.
  const GRP = [];                       // { w, ps: [{ p, day, night }], on }
  const grp = w => { const g = { w, ps: [], on: null }; GRP.push(g); return g; };
  const NIGHT = grp(null);
  // A10. One shutter prop per unit, parked under the floor while the shop trades.
  const SHUT = [];                      // { p, x, z, top, wid, h, hrs, open }
  // Parked forty metres under the floor at a millionth of its size — js/street-alley.js's idiom,
  // and the reason a closed shop costs one matrix write rather than a draw.
  const HIDDEN = M.trs(0, -60, 0, 0, .001, .001, .001);
  // The same window test `npcAwake` uses in game.js, so a shutter and the shopkeeper behind it
  // can never disagree about what time it is.
  const within = (h, a, b) => (b > 24 ? (h >= a || h < b - 24) : (h >= a && h < b));

  StreetFit['lane'] = S => {
    const { box, cyl, ball, taper, flat, glyphs, solid, blocker, glow, thing,
            cap, light, C, G, col, FASCIA, FASCIAH, BLADE, BLADEH } = S;

    // The zone. Published the way js/street-hotel.js publishes its forecourt, because `zones` is
    // built in the scene object at the end of street.js's `build` and a district cannot push into
    // it directly. x0 39.30 overlaps the road zone (which ends at 39.80) so the two are genuinely
    // connected once clampMove has spent the body radius on each edge — the same overlap the
    // hospital spine uses at its south end.
    S.LANE_ZONE = { id: 'lane', x0: 39.30, x1: LX1 - .70, z0: LZ0 + .70, z1: LZ1 - .70,
                    light: [50.0, 5.4, LZC] };

    const PAVE = C('#b8b2a4'), PAVED = C('#a49e91');
    const REND = C('#cdc6b6'), RENDD = C('#a8a294'), BAND = C('#8d8779');
    const GLASSD = C('#26313a'), GLASS = C('#9bb8c4'), WARMI = C('#e9d3a6'), COOLI = C('#dfe8ee');
    const RED = C('#9c2a22'), REDD = C('#6e1c17'), CREAM = C('#e9dfc6'), STEEL = C('#8b9095');
    const PMAT = { mat: 'plaster', matScale: 2.6, matAmt: .13 };

    const emis = (p, k, g = NIGHT) => { g.ps.push({ p, day: p.glow || 0, night: k }); return p; };
    // Glyph yaw for a frontage, once, so no call site has to remember which way round it is.
    const yawOf = nn => (nn > 0 ? 0 : Math.PI);

    // ---- A4. The pair of payment stickers that is on the glass of every shop in this country:
    // the green one and the blue one, side by side at hand height. Both plates are 0.17 m — the
    // item's ceiling is 0.18 — and every quad in here is `mode: 1` with **no glow**. A sticker
    // that lights the pavement is a light-mask quad, and the ceiling on those is the one budget
    // this district is actually against (street-retail.js:12).
    const pay = (x, y, z, nn) => {
      const yw = yawOf(nn), o = { hard: true, gloss: .30 };
      box(x - .30, y, z, .17, .17, .010, C('#1aa34a'), o);
      glyphs(x - .30, y, z + nn * .012, yw, '微信',
        { size: .054, gap: .014, vertical: true, color: C('#f2f7f2'), mode: 1, lift: .004 });
      box(x - .07, y, z, .17, .17, .010, C('#1678ff'), o);
      glyphs(x - .07, y, z + nn * .012, yw, '支付宝',
        { size: .044, gap: .010, vertical: true, color: C('#f0f5ff'), mode: 1, lift: .004 });
    };

    // ---------------------------------------------------------------- the ground
    // Paved, not asphalt: this is a 步行街 and the surface is the first thing that says so.
    flat((LX0 + LX1) / 2, .008, LZC, LX1 - LX0, LZ1 - LZ0 + .40, PAVE,
      { mode: 9, gloss: .16, mat: 'stone', matScale: 1.1, matAmt: .18 });
    flat((LX0 + LX1) / 2, .010, LZC, LX1 - LX0, 1.60, PAVED, { mode: 9, gloss: .18 });
    for (let x = LX0 + 1.6; x < LX1 - 1.0; x += 2.40)
      flat(x, .012, LZC, .12, 1.60, C('#8f8a7e'), { gloss: .14 });

    // ---------------------------------------------------------------- the two side blocks
    for (const n of [1, -1]) {
      const zf = n > 0 ? LZ0 : LZ1;              // this side's frontage plane
      const cz = zf - n * (WALL / 2);            // the mass sits BEHIND it
      box((LX0 + LX1) / 2, BH / 2, cz, LX1 - LX0, BH, WALL, REND,
        { hard: true, mode: 14, gloss: G.paint, ...PMAT });
      box((LX0 + LX1) / 2, BH + .30, cz, LX1 - LX0 + .22, .60, WALL + .22, RENDD,
        { hard: true, gloss: G.paint });
      // the dark shopfront band at street level and the canopy over it, in FRONT of the plane
      box((LX0 + LX1) / 2, 2.05, zf + n * .17, LX1 - LX0, 4.10, .34, GLASSD,
        { hard: true, gloss: .30 });
      box((LX0 + LX1) / 2, 4.44, zf + n * .28, LX1 - LX0 + .24, .28, .55, RENDD,
        { hard: true, gloss: G.paint });
      // the string course the fascia datum sits above, as the block in the hutong has
      box((LX0 + LX1) / 2, 3.00, zf + n * .06, LX1 - LX0 + .12, .22, .12, BAND,
        { hard: true, gloss: G.paint });
      blocker(LX0 - .4, LX1 + .4, Math.min(zf, cz - n * WALL / 2), Math.max(zf, cz - n * WALL / 2), BH);
      solid(LX0 - .4, LX1 + .4, Math.min(zf, cz - n * WALL / 2), Math.max(zf, cz - n * WALL / 2));

      // upper windows, so the lane has storeys over it the way the road does
      const bays = Math.round((LX1 - LX0) / 3.4);
      for (let f = 0; f < 2; f++) for (let i = 0; i < bays; i++) {   // two rows now, not three: 9.25 + 0.81 clears an 11.0 parapet
        const wx = LX0 + (i + .5) * ((LX1 - LX0) / bays), wy = 6.4 + f * 2.85;
        box(wx, wy, zf + n * .04, 2.16, 1.62, .08, GLASSD, { hard: true, gloss: .20 });
        emis(box(wx, wy, zf + n * .09, 2.00, 1.46, .04, GLASS,
          { hard: true, mode: 1, gloss: G.glass }), .13);
        box(wx, wy - .88, zf + n * .14, 2.36, .08, .20, RENDD, { hard: true, gloss: G.paint });
      }
    }

    // ---------------------------------------------------------------- the closed east end
    box(LX1 + 1.5, BH / 2, LZC, 3.0, BH, LZ1 - LZ0 + WALL * 2, REND,
      { hard: true, mode: 14, gloss: G.paint, ...PMAT });
    blocker(LX1, LX1 + 3.2, LZ0 - .4, LZ1 + .4, BH);
    solid(LX1 - .02, LX1 + 3.2, LZ0 - .4, LZ1 + .4);
    for (let i = 0; i < 5; i++)                                  // a stair up, so the end is a place
      box(LX1 - .55 + i * .28, (.18 + i * .17) / 2, LZC, .28, .18 + i * .17, 4.60, C('#b4aea0'),
        { hard: true, mode: 9, gloss: .20 });

    // ---------------------------------------------------------------- the small units
    // Explicit, not a seeded shuffle: this is an eighteen-metre lane and a random sign row over
    // that distance reads as wallpaper. Each is [centre x, width, name, board colour].
    //
    // FOUR, and that is the lane's real capacity — measured, after an attempt to fit six proved
    // it is not. STREET-BLUEPRINT.md 4.2 asked for twenty units re-dealt down here; that number
    // was written before the lane had a length. It has one now, and the arithmetic is:
    //
    //   north  x 41.60 .. 59.00, less 北京新天地 at 43.00 .. 50.20  →  50.20 .. 59.00 = 8.80 m
    //   south  x 41.60 .. 59.00, less 大超市    at 48.00 .. 57.60  →  41.60 .. 48.00 = 6.40 m
    //
    // 8.80 m takes two at 3.40 with a 0.40 gap; 6.40 m takes a 3.40 and a 2.20. A fifth anywhere
    // is under 1.5 m of frontage, which is a doorway, not a shop. Twenty was never on.
    //
    // Each row also carries **its own trading hours** and how far its shutter comes down, which
    // is items C5 and A10. The hours are picked so the lane is never uniformly lit and never
    // uniformly shut: at 21:00 the baker is dark and the other three are not, and at 21:30 the
    // baker and the florist are behind shutters while the tea shop and the bookshop trade on.
    const UNITS = [
      //  n     x      w   name      board colour     hours       shutter drop
      [ 1, 43.70, 3.40, '面包房', C('#b8862f'), [ 6.5, 20.0], 1.00],
      [ 1, 46.60, 2.20, '花店',   C('#2f7a4f'), [ 8.5, 21.0],  .55],
      [-1, 52.70, 3.40, '奶茶店', RED,          [10.0, 23.0], 1.00],
      [-1, 56.50, 3.40, '书店',   C('#1f4f8f'), [ 9.5, 22.0],  .78],
    ];
    for (const [n, ux, w, nm, base, hrs, drop] of UNITS) {
      const zf = n > 0 ? LZ0 : LZ1;
      const UG = grp(hrs);                     // this shop's own switch, not the lane's
      emis(box(ux, 1.70, zf + n * .30, w - .5, 2.60, .06, GLASS,
        { hard: true, mode: 1, gloss: G.glass }), .18, UG);
      emis(box(ux, 1.55, zf + n * .38, w - .9, 2.20, .04, n > 0 ? COOLI : WARMI,
        { hard: true, mode: 1, glow: .04 }), .22, UG);
      // Same treatment street.js's `signBoard` now gives every board in the district: a 26 cm box
      // rather than an 18 cm panel, a drip over it, a lit valance under it, and glyphs at 0.82 of
      // the panel instead of 0.70. A lane six metres across is read down its length, not across
      // it, so depth is worth even more here than it is on the alley.
      box(ux, FASCIA, zf + n * .28, w, FASCIAH, .26, base, { hard: true, gloss: .30 });
      box(ux, FASCIA + FASCIAH / 2 + .05, zf + n * .32, w + .10, .10, .34, base,
        { hard: true, gloss: .26 });
      emis(box(ux, FASCIA - FASCIAH / 2 - .04, zf + n * .42, w - .06, .07, .03, CREAM,
        { hard: true, mode: 1, glow: .10 }), .70, UG);
      const gs = Math.min(FASCIAH * .82, (w - .24) / nm.length * .92);
      for (const g of glyphs(ux, FASCIA, zf + n * .42, yawOf(n), nm,
          { size: gs, gap: gs * .14, color: base === C('#b8862f') ? C('#2a2723') : CREAM,
            mode: 1, glow: .26, lift: .012 }))
        emis(g, .60, UG);
      for (const s of [-1, 1]) {
        taper(ux + s * (w / 2 - .40), .21, zf + n * .72, .40, .42, .40, C('#8a8378'), { gloss: .22 });
        ball(ux + s * (w / 2 - .40), .52, zf + n * .72, .26, .20, .26, col.greenD,
          { mode: 15, gloss: .12 });
      }

      // ---- A9. Joinery, not a sheet. Every pane in the district was one piece of glass; a real
      // shopfront is a fanlight over the door and a mullion rhythm either side of it. Steel, 6–7
      // cm, and NO new pane — these stand 1 cm proud of the glass that is already there, at
      // zf + n*0.43, which clears the interior quad at 0.38 + 0.02.
      const gw = w - .5, gz = zf + n * .43;
      box(ux, 2.42, gz, gw, .07, .03, STEEL, { hard: true, gloss: G.metal });     // the transom
      for (const s of [-1, 1])
        box(ux + s * gw / 4, 1.62, gz, .06, 2.44, .03, STEEL, { hard: true, gloss: G.metal });
      for (const s of [-1, 1])                                                    // the door stiles
        box(ux + s * .46, 1.18, gz + n * .015, .07, 1.55, .03, STEEL,
          { hard: true, gloss: G.metal });

      // ---- A4. 支付 stickers, two on every glass door. The most characteristic thing on a
      // Chinese shopfront and the district had none of it. mode 1 with NO glow, because a lit
      // sticker is a light-mask quad and this district is fill-rate bound (.audit.js:327), and
      // 17 cm square, which is what the real ones are.
      pay(ux, 1.42, zf + n * .45, n);

      // ---- A10. The 卷帘门 and the box it rolls into. The housing is permanent and sits at
      // 2.89..3.11, under the fascia band's 3.12 and clear of the string course at 3.00. The
      // shutter is ONE prop, parked under the floor while the shop trades and written once on the
      // frame the hour changes — see `SHUT` in the tick.
      box(ux, 3.00, zf + n * .40, w - .04, .22, .30, C('#7f8489'), { hard: true, gloss: .34 });
      const sh = box(ux, 1.45, zf + n * .40, w - .16, 2.86, .05, C('#9aa0a6'), { hard: true, gloss: .28 });
      sh.m = HIDDEN;
      SHUT.push({ p: sh, x: ux, z: zf + n * .40, top: 2.88,
                  wid: w - .16, h: 2.86 * drop, hrs, open: null });
    }

    // ---------------------------------------------------------------- 北京新天地, NORTH side
    // n = -1, so everything in front of it is at MZ - d. Rebuilt in this lane's own ±z facing
    // rather than rotated out of the parade's -x one: a rotation swaps the size arguments of
    // every box as well as its position and there is no identity to check the result against.
    const MX = 46.60, MZ = LZ1, MN = -1;
    box(MX, 3.35, MZ + MN * .58, 7.20, 6.70, 1.12, C('#2a2d31'),
      { hard: true, gloss: .30, tag: '购物中心' });
    box(MX, 3.08, MZ + MN * 1.16, 5.95, 5.75, .10, GLASSD, { hard: true, gloss: .22, tag: '购物中心' });
    emis(box(MX, 3.08, MZ + MN * 1.22, 5.72, 5.55, .045, GLASS,
      { hard: true, mode: 1, alpha: .70, gloss: G.glass, tag: '购物中心' }), .16);
    emis(box(MX, 2.12, MZ + MN * 1.10, 5.22, 3.86, .05, WARMI,
      { hard: true, mode: 1, glow: .08, tag: '购物中心' }), .42);
    for (const s of [-1, 1]) {
      box(MX + s * .82, 1.50, MZ + MN * 1.34, .10, 2.88, .14, col.gold,
        { hard: true, gloss: G.metal, tag: '购物中心' });
      cap(MX + s * .23, 1.46, MZ + MN * 1.44, .026, .46, .026, col.goldL,
        { gloss: G.metal, tag: '购物中心' });
    }
    box(MX, 5.42, MZ + MN * 1.35, 6.25, 1.12, .24, REDD, { hard: true, gloss: .28, tag: '购物中心' });
    emis(box(MX, 4.82, MZ + MN * 1.48, 6.05, .08, .03, col.goldL,
      { hard: true, mode: 1, glow: .12, tag: '购物中心' }), .85);
    for (const g of glyphs(MX, 5.42, MZ + MN * 1.46, Math.PI, '北京新天地',
      { size: .50, gap: .16, color: col.goldL, mode: 1, glow: .22, lift: .012, tag: '购物中心' }))
      emis(g, .70);
    box(MX - 3.18, 4.70, MZ + MN * 2.05, .86, 3.30, .42, REDD,
      { hard: true, gloss: .28, tag: '购物中心' });
    glyphs(MX - 3.18, 4.70, MZ + MN * 2.28, Math.PI, '购物中心',
      { size: .33, gap: .12, vertical: true, color: col.goldL, mode: 1, glow: .18, tag: '购物中心' });
    for (const s of [-1, 1]) {
      taper(MX + s * 2.65, .28, MZ + MN * 2.05, .54, .56, .54, C('#8a8378'), { gloss: .24 });
      ball(MX + s * 2.65, .68, MZ + MN * 2.05, .35, .38, .35, col.green, { mode: 15, gloss: .12 });
    }
    if (typeof light === 'function') light(MX, 3.2, MZ + MN * 2.4, [1.0, .84, .60], .40, 7.0);
    thing('购物中心', MX, 5.42, MZ + MN * 1.30, '这个购物中心有电影院和美食广场。',
      'This shopping mall has a cinema and a food court.',
      '购物 shopping + 中心 centre. 商场 is the everyday shorter word.',
      { focus: [MX, MZ + MN * 2.55], reach: 2.4 });

    // ---------------------------------------------------------------- 大超市, SOUTH side
    // n = +1, so everything in front is at SZ + d, and the two anchors face each other down the
    // lane. Its interior light is COOL where the mall's is warm, which is the only thing that
    // tells a supermarket from a shopping centre at forty metres.
    //
    // The exit matters more than the geometry. `at` is a coordinate in the DESTINATION scene, not
    // in the street — the version this replaced passed a street coordinate, which inside `market`
    // is thirty metres from its door and outside its zones, so it silently fell back to the
    // scene's own spawn every time. Omitted here, which is what js/street-entry.js's porch does
    // and what the fallback was doing anyway. The leg that actually needed fixing is the return
    // one, and that lives in js/market.js's own `OUT`.
    const SX = 52.80, SZ = LZ0, SN = 1;
    box(SX, 2.90, SZ + SN * .50, 9.60, 5.80, 1.00, C('#dcd6c8'),
      { hard: true, gloss: .24, tag: '大超市' });
    emis(box(SX, 2.30, SZ + SN * 1.06, 8.90, 4.20, .05, GLASS,
      { hard: true, mode: 1, alpha: .62, gloss: G.glass, tag: '大超市' }), .14);
    emis(box(SX, 2.10, SZ + SN * .98, 8.40, 3.60, .05, COOLI,
      { hard: true, mode: 1, glow: .07, tag: '大超市' }), .40);
    box(SX, 5.05, SZ + SN * 1.10, 9.20, 1.10, .26, REDD, { hard: true, gloss: .26, tag: '大超市' });
    emis(box(SX, 4.46, SZ + SN * 1.24, 9.00, .08, .03, C('#f2e4c4'),
      { hard: true, mode: 1, glow: .12, tag: '大超市' }), .85);
    for (const g of glyphs(SX, 5.05, SZ + SN * 1.22, 0, '大超市',
      { size: .62, gap: .20, color: C('#f2e4c4'), mode: 1, glow: .22, lift: .012, tag: '大超市' }))
      emis(g, .70);
    for (const s of [-1, 1])
      box(SX + s * .78, 1.30, SZ + SN * 1.12, 1.44, 2.60, .06, STEEL,
        { hard: true, gloss: G.metal, tag: '大超市' });
    for (let i = 0; i < 5; i++) {                                  // the nested trolleys outside
      const tx = SX + 3.05 + i * .30;
      taper(tx, .52, SZ + SN * 2.15, .80, .40, .50, STEEL,
        { hard: true, gloss: G.metal, tag: '大超市' });
      cap(tx - .34, .84, SZ + SN * 2.15, .018, .46, .018, C('#c8452f'),
        { rz: Math.PI / 2, gloss: .30, tag: '大超市' });
    }
    if (typeof light === 'function') light(SX, 3.2, SZ + SN * 2.4, [.80, .88, 1.0], .34, 7.0);
    thing('大超市', SX, 5.05, SZ + SN * 1.30, '大超市什么都有，比小卖部便宜。',
      'The hypermarket has everything, and it is cheaper than the corner shop.',
      '大 big + 超市 supermarket. The 超市 by your door is a 便利店 by comparison.',
      { focus: [SX, SZ + SN * 2.55], reach: 2.6 }).exit = { place: 'market' };

    // ---------------------------------------------------------------- the gateway at the mouth
    // A 步行街 in this city is announced. Two piers and a beam across the entrance with the
    // street's name on both faces, so it reads from the crossing and again on the way out.
    for (const s of [-1, 1]) {
      const pz = LZC + s * ((LZ1 - LZ0) / 2 - .45);
      box(LX0 + .55, 3.10, pz, 1.10, 6.20, .90, REDD, { hard: true, gloss: .26 });
      box(LX0 + .55, 6.35, pz, 1.26, .40, 1.06, RED, { hard: true, gloss: .26 });
      solid(LX0 + .00, LX0 + 1.10, pz - .45, pz + .45);
    }
    box(LX0 + .55, 6.55, LZC, 1.10, .90, LZ1 - LZ0 - .9, REDD, { hard: true, gloss: .26 });
    for (const s of [-1, 1])
      for (const g of glyphs(LX0 + .55 + s * .56, 6.55, LZC, s > 0 ? Math.PI / 2 : -Math.PI / 2,
          '新天地步行街',
          { size: .46, gap: .16, color: col.goldL, mode: 1, glow: .20, lift: .012 }))
        emis(g, .80);
    if (typeof light === 'function') light(LX0 + 1.8, 4.0, LZC, [1.0, .82, .58], .34, 9.0);

    // ---------------------------------------------------------------- 灯串, strung across
    // The other half of the canyon answer, and the thing every pedestrian street in this city
    // actually has: bulbs on a catenary from one frontage to the other. Emissive balls, not
    // lights — six runs of nine is fifty-four primitives and zero draw-call cost worth naming,
    // where fifty-four point lights would be the end of this district's frame budget. Two real
    // lights carry the actual illumination, one a third of the way along and one at two thirds.
    for (let r = 0; r < 6; r++) {
      const wx = LX0 + 2.6 + r * 2.55, sag = .55;
      cap(wx, 5.30, LZC, .012, LZ1 - LZ0 - .2, .012, C('#3a3a36'),
        { rx: Math.PI / 2, gloss: .24 });
      for (let i = 0; i < 9; i++) {
        const u = (i + .5) / 9, dz = LZ0 + .3 + u * (LZ1 - LZ0 - .6);
        emis(ball(wx, 5.30 - sag * Math.sin(u * Math.PI) - .10, dz, .055, .062, .055,
          C('#ffe6b4'), { mode: 1, glow: .04 }), .55);
      }
    }
    if (typeof light === 'function') {
      light(LX0 + 6.5, 4.6, LZC, [1.0, .88, .70], .30, 10.0);
      light(LX0 + 13.0, 4.6, LZC, [1.0, .88, .70], .30, 10.0);
    }
  };

  // ---------------------------------------------------------------- what the clock does to it
  // Same shape as js/street-bank.js: written once when day/night actually crosses, never per
  // frame. A lane of lit shopfronts is most of what this place is after dark.
  StreetFit['lane'].tick = (t, body, mins) => {
    if (mins === undefined) return;
    const h = (mins / 60) % 24;
    const night = h < 6.4 || h >= 18.3;
    // A group with a window burns only while it is BOTH dark and trading: the sign comes up at
    // dusk and goes out when the shop shuts, not when the sun does. A group without one is the
    // lane itself and follows the light.
    for (const g of GRP) {
      const on = g.w ? (night && within(h, g.w[0], g.w[1])) : night;
      if (on === g.on) continue;
      g.on = on;
      for (const q of g.ps) q.p.glow = on ? q.night : q.day;
    }
    // A10. The 卷帘门 comes down when the shop shuts. One matrix per unit, written on the frame
    // the hour crosses and never again — this is four props that move twice a day.
    for (const s of SHUT) {
      const open = within(h, s.hrs[0], s.hrs[1]);
      if (open === s.open) continue;
      s.open = open;
      s.p.m = open ? HIDDEN : M.trs(s.x, s.top - s.h / 2, s.z, 0, s.wid, s.h, .05);
    }
  };
})();
