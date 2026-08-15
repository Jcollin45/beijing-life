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
//     throat        x 39.30 .. 43.85   z -11.90 .. -6.50
//     internal      x 42.85 .. 58.30   z -12.90 .. -5.50
//     body overlap  x 43.15 .. 43.55   after each zone spends the 0.30 m body radius
//
// So there is a **1.00 m strip against each frontage that the body can never enter**: z -12.60 ..
// -11.60 on the south, z -6.80 .. -5.80 on the north. Everything this file stands on the pavement
// — goods, A-boards, bins, the mouth clutter, the cycle bay — is inside one of those two strips
// or outside the zone entirely, and therefore calls neither `solid` nor `blocker`. That is a
// stronger statement than a measurement: the lane's clear run is bit-identical with the dressing
// and without it.
//
// **One collider is added**, and only one: the 三轮车 unloading outside 大超市 (B2), which has to
// stand out in the lane or it is not a delivery. `solid(49.30, 52.25, -12.60, -10.84)`.
//
// The number that matters here came from the gate's full-profile scan through the real
// `Street.clampMove` at r = 0.30, NOT from this file's own arithmetic, and the two disagreed:
// the lane's clear run is **4.85 m**, not the 5.40 m that `S.LANE_ZONE` less two body radii
// predicts. Trust the scan. At the first shipped depth (-10.62) that scan read **3.55 m** across
// x 49.30..51.80 — passing B1's 3.40 m floor by 0.15 m, which the gate called thin and told this
// lane not to spend. So the bed was narrowed from 0.88 to 0.70 and pulled back to -10.84, which
// buys 0.22 m of that margin back.
//
// The cycle bay (B4) is at x 39.70 .. 41.45, z -14.60 .. -12.90: south of the lane's mouth, on
// the far pavement, where the road zone already stops the body at x 39.50 and the lane zone does
// not reach. Outside every zone, so outside every question about width.

(() => {
  'use strict';

  try { Glyphs.need('北京新天地大超市购物中心步行街奶茶店书店花店面包房' +
                    '扫码支付可刷卡今日特价鲜绿植珍珠可回收物其他垃圾单车停放'); } catch (_) {}

  // ---------------------------------------------------------------- the lane, measured
  const LX0 = 41.60;            // the mouth, on the far building line
  const LX1 = 59.00;            // the closed east end
  // The road can only spare the original 6.80 m portal, but the lane now opens by a metre on
  // each side once past its gateway. A narrow urban threshold is believable; forcing that same
  // width through the whole shopping street is not. MOUTH_* stays aligned with street.js's hole,
  // while LZ* is the quieter 8.80 m internal frontage datum.
  const MOUTH_Z0 = -12.60, MOUTH_Z1 = -5.80;
  const LZ0 = -13.60;           // SOUTH internal frontage plane, outward normal +1
  const LZ1 = -4.80;            // NORTH internal frontage plane, outward normal -1
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
  // A10. One shutter prop per unit, rolled into its housing while the shop trades.
  const SHUT = [];                      // { p, x, z, top, wid, h, hrs, open }
  // Keep the open state in the real world and fully inside the existing 2.89..3.11 m roll housing.
  // A buried 1 mm placeholder still entered the static draw list and carried no state ownership.
  const rolledShutter = (x, z, wid, top) => M.trs(x, top + .12, z, 0, wid, .06, .04);
  // The same window test `npcAwake` uses in game.js, so a shutter and the shopkeeper behind it
  // can never disagree about what time it is.
  const within = (h, a, b) => (b > 24 ? (h >= a || h < b - 24) : (h >= a && h < b));

  StreetFit['lane'] = S => {
    const { box, cyl, ball, taper, flat, glyphs, solid, blocker, glow, thing,
            cap, light, C, G, col, FASCIA, FASCIAH, BLADE, BLADEH } = S;

    // The zone. Published the way js/street-hotel.js publishes its forecourt, because `zones` is
    // built in the scene object at the end of street.js's `build` and a district cannot push into
    // it directly. x0 39.30 overlaps the far-east pavement, while x1 44.10 overlaps the internal
    // lane by 1.25 m. That preserves 35 cm of shared centre band after clampMove spends the strict
    // .45 m envelope on both sides; the old one-metre joint left only ten centimetres.
    S.LANE_THROAT_ZONE = { id: 'lane-throat', x0: 39.30, x1: LX0 + 2.50,
      z0: MOUTH_Z0 + .70, z1: MOUTH_Z1 - .70, light: [42.1, 4.8, LZC] };
    S.LANE_ZONE = { id: 'lane', x0: LX0 + 1.25, x1: LX1 - .70,
      z0: LZ0 + .70, z1: LZ1 - .70, light: [50.0, 5.4, LZC] };

    const PAVE = C('#b8b2a4'), PAVED = C('#a49e91');
    const REND = C('#cdc6b6'), RENDW = C('#d8cbb7'), RENDS = C('#aeb7aa');
    const BRICK = C('#9f7663'), RENDD = C('#a8a294'), BAND = C('#8d8779');
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
      // GENERIC. The brief named two real companies' marks and the brief was wrong — see the
      // same correction in js/street-retail.js. Nothing in this game carries a real brand.
      box(x - .30, y, z, .17, .17, .010, C('#1aa34a'), o);
      glyphs(x - .30, y, z + nn * .012, yw, '扫码',
        { size: .054, gap: .014, vertical: true, color: C('#f2f7f2'), mode: 1, lift: .004 });
      box(x - .07, y, z, .17, .17, .010, C('#1678ff'), o);
      glyphs(x - .07, y, z + nn * .012, yw, '可刷卡',
        { size: .044, gap: .010, vertical: true, color: C('#f0f5ff'), mode: 1, lift: .004 });
    };

    // ---------------------------------------------------------------- the ground
    // Paved, not asphalt: this is a 步行街 and the surface is the first thing that says so.
    // A 2.4 m throat at the road then a broad internal pavement. Overlap conceals the rectangular
    // seam and reads as a simple flare without adding an unwalkable decorative pinch point.
    flat(LX0 + 1.20, .008, LZC, 2.40, MOUTH_Z1 - MOUTH_Z0 + .40, PAVE,
      { mode: 9, gloss: .16, mat: 'paving', matScale: 1.1, matAmt: .18 });
    flat((LX0 + 1.90 + LX1) / 2, .008, LZC, LX1 - LX0 - 1.90, LZ1 - LZ0 + .40, PAVE,
      { mode: 9, gloss: .16, mat: 'paving', matScale: 1.1, matAmt: .18 });
    flat((LX0 + LX1) / 2, .010, LZC, LX1 - LX0, 1.60, PAVED, { mode: 9, gloss: .18 });
    for (let x = LX0 + 1.6; x < LX1 - 1.0; x += 2.40)
      flat(x, .012, LZC, .12, 1.60, C('#8f8a7e'), { gloss: .14 });

    // ---------------------------------------------------------------- six separate side buildings
    // The first version was two 17.4 m boxes with a continuous glass strip. From the mouth it
    // read as a loading trench, regardless of how carefully the individual shop windows were
    // dressed. These six envelopes keep every tenant on the same public frontage datum while
    // giving the lane real party-wall gaps, different depths, separate roof lines and visible
    // returns. The gaps remain outside LANE_ZONE, so they provide daylight without inventing a
    // route behind the scenery.
    const SIDES = [
      { n: 1, x: 43.22, w: 3.04, h: 7.85, d: 5.55, set: .08, tint: RENDW, bays: 2, shift: -.10 },
      { n: 1, x: 46.48, w: 3.06, h: 9.55, d: 6.30, set: .00, tint: BRICK, bays: 2, shift:  .12 },
      { n: 1, x: 53.18, w: 9.72, h: 8.55, d: 7.20, set: .22, tint: REND,  bays: 4, shift: -.22 },
      { n:-1, x: 46.20, w: 8.80, h:10.35, d: 7.10, set: .12, tint: REND,  bays: 4, shift:  .22 },
      { n:-1, x: 52.65, w: 3.35, h: 7.70, d: 5.35, set: .32, tint: RENDS, bays: 2, shift: -.10 },
      { n:-1, x: 56.70, w: 3.70, h: 9.20, d: 6.15, set: .04, tint: RENDW, bays: 2, shift:  .14 },
    ];
    for (const b of SIDES) {
      const zf = b.n > 0 ? LZ0 : LZ1;
      const front = zf - b.n * b.set;
      const back = front - b.n * b.d;
      const cz = (front + back) * .5;
      box(b.x, b.h / 2, cz, b.w, b.h, b.d, b.tint,
        { hard: true, mode: 14, gloss: G.paint, ...PMAT });

      // Thin perimeter pieces make a plausible parapet; a second, shifted roof volume prevents
      // even the widest anchor from ending as one extruded cuboid.
      box(b.x, b.h + .17, front - b.n * .18, b.w + .10, .34, .18, RENDD,
        { hard: true, gloss: G.paint });
      box(b.x, b.h + .17, back + b.n * .18, b.w + .10, .34, .18, RENDD,
        { hard: true, gloss: G.paint });
      for (const sx of [-1, 1])
        box(b.x + sx * (b.w / 2 - .09), b.h + .17, cz, .18, .34, Math.max(.5, b.d - .36),
          RENDD, { hard: true, gloss: G.paint });
      if (b.w > 3.5)
        box(b.x + b.shift, b.h + .52, cz - b.n * b.d * .18,
          Math.min(b.w - 1.15, b.w * .58), 1.04, Math.min(3.15, b.d * .48), b.tint,
          { hard: true, mode: 14, gloss: G.paint, ...PMAT });

      // Each address owns its plinth, canopy and string course. The 30–55 cm slots between them
      // expose the side returns and stop the shopfronts becoming one uninterrupted light bar.
      // The plinth is the dark reveal BEHIND the tenant glazing. Putting its centre at +n*.17
      // placed its outer face 10 mm ahead of every pane, which is why the live lane rendered as
      // two uninterrupted black walls despite having modeled shopfronts. Recess it to the fabric
      // side of the frontage datum so each door, mullion and lit interior is actually visible.
      box(b.x, 2.05, zf - b.n * .17, b.w - .12, 4.10, .34, GLASSD,
        { hard: true, gloss: .30 });
      box(b.x, 4.44, zf + b.n * .28, b.w + .06, .28, .55, RENDD,
        { hard: true, gloss: G.paint });
      box(b.x, 3.00, zf + b.n * .06, b.w, .22, .12, BAND,
        { hard: true, gloss: G.paint });

      const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2;
      blocker(x0, x1, Math.min(front, back), Math.max(front, back), b.h);
      solid(x0, x1, Math.min(front, back), Math.max(front, back));

      const rows = b.h >= 9.0 ? 2 : 1;
      const bayStep = (b.w - .44) / b.bays;
      const ww = Math.min(1.78, bayStep - .28);
      for (let f = 0; f < rows; f++) for (let i = 0; i < b.bays; i++) {
        const wx = b.x + (i - (b.bays - 1) / 2) * bayStep;
        const wy = 6.10 + f * 2.56;
        box(wx, wy, front + b.n * .048, ww + .14, 1.50, .08, GLASSD,
          { hard: true, gloss: .20 });
        emis(box(wx, wy, front + b.n * .098, ww, 1.34, .04, GLASS,
          { hard: true, mode: 1, gloss: G.glass }), .13);
        box(wx, wy - .82, front + b.n * .148, ww + .26, .08, .20, RENDD,
          { hard: true, gloss: G.paint });
      }
    }

    // ---------------------------------------------------------------- a garden terminus, not a sealed wall
    // Collision closes the authored lane at LX1, but the eye meets an open courtyard threshold:
    // a small glazed pavilion is offset south, a timber trellis frames a planted view in the
    // middle, and a low north planter leaves sky across most of the 8.8 m end. Nothing resembles
    // the old full-width slab or the later oversized double door.
    blocker(LX1 - .02, LX1 + 2.20, LZ0 - .4, LZ1 + .4, 8.2);
    solid(LX1 - .02, LX1 + 2.20, LZ0 - .4, LZ1 + .4);
    const ENDX = LX1 + .76, PAVZ = LZ0 + 1.55;
    const COMMUNITY_GLASS = 'lane-community-room-glass';
    // Community room: a compact rendered volume with a split glazed face, timber screen and a
    // hovering roof edge. Its frontage is only 2.65 m of the end rather than dominating it.
    box(ENDX, 2.12, PAVZ, 1.50, 4.24, 2.70, RENDW,
      { hard: true, mode: 14, gloss: G.paint, ...PMAT });
    box(LX1 - .045, 1.78, PAVZ - .48, .07, 3.22, 1.38, GLASSD,
      { hard: true, gloss: .24 });
    for (const dz of [-.88, -.44, 0]) {
      emis(box(LX1 - .086, 1.78, PAVZ + dz, .025, 3.05, .36, GLASS,
        { hard: true, mode: 1, alpha: .55, gloss: G.glass,
          alphaGroup: COMMUNITY_GLASS }), .10);
      box(LX1 - .13, 1.80, PAVZ + dz - .20, .08, 3.20, .055, STEEL,
        { hard: true, gloss: G.metal });
    }
    // A warmer single door sits beside the window wall instead of one giant pale double door.
    box(LX1 - .05, 1.62, PAVZ + .72, .075, 2.96, .74, C('#725844'),
      { hard: true, gloss: G.wood });
    emis(box(LX1 - .094, 1.72, PAVZ + .72, .025, 2.42, .54, GLASS,
      { hard: true, mode: 1, alpha: .48, gloss: G.glass,
        alphaGroup: COMMUNITY_GLASS }), .09);
    cap(LX1 - .15, 1.58, PAVZ + .92, .020, .24, .020, STEEL,
      { rx: Math.PI / 2, gloss: G.metal });
    box(LX1 - .12, 3.92, PAVZ, .34, .18, 3.02, C('#5d4636'),
      { hard: true, gloss: G.wood });
    for (const dz of [-1.14, -.76, -.38, 0, .38, .76, 1.14])
      box(LX1 - .18, 4.06, PAVZ + dz, .58, .10, .12, C('#80634b'),
        { hard: true, gloss: G.wood });
    for (let i = 0; i < 3; i++)
      box(LX1 - .52 + i * .20, (.14 + i * .13) / 2, PAVZ, .22, .14 + i * .13, 2.42,
        C('#b4aea0'), { hard: true, mode: 9, gloss: .20 });

    // Open timber threshold in the centre. The crosspiece is thin and high, with 2.85 m of clear
    // view beneath it; the invisible end collision is explained by the planted courtyard beyond.
    const TRELLIS_Z = [LZC - 1.42, LZC + 1.42];
    for (const z of TRELLIS_Z) {
      box(LX1 + .02, 2.12, z, .18, 4.24, .18, C('#6d523d'),
        { hard: true, gloss: G.wood });
      box(LX1 - .18, .22, z, .54, .44, .54, C('#857764'),
        { hard: true, gloss: .20 });
    }
    box(LX1 + .02, 4.16, LZC, .20, .18, 3.02, C('#6d523d'),
      { hard: true, gloss: G.wood });
    for (let i = 0; i < 5; i++)
      box(LX1 + .18 + i * .20, 4.22, LZC, .10, .10, 3.18, C('#8a6a4d'),
        { hard: true, gloss: G.wood });

    // Layered planting beyond the threshold: branching trunk and three offset crowns avoid the
    // toy-like lollipop silhouette of the previous single sphere.
    const TREE_X = LX1 + .86, TREE_Z = LZC + .12;
    cyl(TREE_X, 1.20, TREE_Z, .13, 2.40, C('#6e5941'), { gloss: G.wood });
    for (const [dx, dz, rz] of [[-.18,-.28,-.58],[.16,.18,.52]])
      cap(TREE_X + dx * .45, 2.12, TREE_Z + dz * .45, .055, .95, .055, C('#6e5941'),
        { rz, gloss: G.wood });
    [[-.42,0,.62,.58],[.34,-.22,.72,.66],[.08,.42,.66,.60]].forEach(([dx,dz,rx,ry]) =>
      ball(TREE_X + dx, 2.90 + dz * .18, TREE_Z + dz, rx, ry, .60, col.greenD,
        { mode: 15, gloss: .12 }));
    // Two short planters terminate the flanks, leaving the trellis bay visibly open.
    for (const [z,w] of [[LZC + 2.55, 1.55], [LZ1 - .48, .78]]) {
      box(LX1 + .20, .38, z, .72, .76, w, BRICK,
        { hard: true, mode: 14, gloss: G.paint, ...PMAT });
      for (let j = -1; j <= 1; j++)
        ball(LX1 + .10, .82, z + j * w * .27, .34, .34, .34,
          j === 0 ? col.green : col.greenD, { mode: 15, gloss: .12 });
    }

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
      //  n     x      w   name      board colour     hours       drop  侧招  竖幅
      [ 1, 43.70, 3.40, '面包房', C('#b8862f'), [ 6.5, 20.0], 1.00, 1, null],
      [ 1, 46.60, 2.20, '花店',   C('#2f7a4f'), [ 8.5, 21.0],  .55, 0, '鲜花绿植'],
      [-1, 52.70, 3.40, '奶茶店', RED,          [10.0, 23.0], 1.00, 0, '珍珠奶茶'],
      [-1, 56.50, 3.40, '书店',   C('#1f4f8f'), [ 9.5, 22.0],  .78, 1, null],
    ];
    for (const [n, ux, w, nm, base, hrs, drop, blade, banner] of UNITS) {
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
          { size: gs, gap: gs * .14, color: nm === '面包房' ? C('#2a2723') : CREAM,
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
      // shutter is ONE prop, retracted inside its roll housing while the shop trades and written
      // once on the frame the hour changes — see `SHUT` in the tick.
      box(ux, 3.00, zf + n * .40, w - .04, .22, .30, C('#7f8489'), { hard: true, gloss: .34 });
      const closedHeight = 2.86 * drop;
      const sh = box(ux, 1.45, zf + n * .40, w - .16, 2.86, .05, C('#9aa0a6'),
        { hard: true, gloss: .28, stateOwner: 'lane:shutter', shutterTop:2.88,
          shutterClosedHeight:closedHeight });
      // Pin a conservative sphere to the real doorway. The open matrix lives inside the housing,
      // while the same prop expands down over the doorway after hours.
      sh.fixed = true; sh.cx = ux; sh.cy = 1.45; sh.cz = zf + n * .40;
      sh.r = .55 * Math.hypot(w - .16, 2.86);
      sh.m = rolledShutter(ux, zf + n * .40, w - .16, 2.88);
      SHUT.push({ p: sh, x: ux, z: zf + n * .40, top: 2.88,
                  wid: w - .16, h: closedHeight, hrs, open: null });

      // ---- A12. A second 侧招 rank. Three box signs in the whole district before this, all on
      // the alley; the lane had none, and a lane is read down its LENGTH, where a sign lying flat
      // on its own wall shows you an edge. On `S.BLADE / S.BLADEH` — 2.27..2.83, the clear band
      // under the string course — because a sign that picks its own height is the fault the whole
      // re-plan existed to fix.
      //
      // TWO, not four: the lit panel is the only thing this whole lane adds to the emissive
      // count, and two is what the budget in STOREFRONT-UPGRADES.md rule 2 will carry. The
      // characters on them are `mode: 1` with NO glow, which is street-retail.js:12's own rule.
      if (blade) {
        const bx = ux + n * (w / 2 - .12), bz = zf + n * .56;
        // `cyl`, not `capsule`: a capsule's hemisphere caps are a quarter of its height each
        // (gl.js:1466), so a 34 cm "rod" made of one is two beads on a stub. Rods are cylinders.
        for (const y of [BLADE + BLADEH / 2 + .06, BLADE - BLADEH / 2 - .06])   // the brackets
          cyl(bx, y, zf + n * .30, .022, .34, STEEL, { rx: Math.PI / 2, gloss: G.metal });
        emis(box(bx, BLADE, bz, .10, BLADEH, .84, base,
          { hard: true, mode: 1, glow: .05 }), .52, UG);
        box(bx, BLADE + BLADEH / 2 + .03, bz, .13, .06, .88, RENDD, { hard: true, gloss: .26 });
        const bs = Math.min(BLADEH * .60, .70 / nm.length);
        for (const s of [-1, 1])
          glyphs(bx + s * .062, BLADE, bz, s * Math.PI / 2, nm,
            { size: bs, gap: bs * .20, color: CREAM, mode: 1, lift: .008 });
      }

      // ---- D3. 竖幅. Two exist in the district and they are the most Chinese thing on the wall.
      // Cloth, not a light box: `mode: 1` and no glow on the text, per the item.
      if (banner) {
        const nx = ux - n * (w / 2 - .26), nz = zf + n * .50;
        cyl(nx, 2.88, nz, .016, .46, STEEL, { rz: Math.PI / 2, gloss: G.metal });
        box(nx, 2.00, nz, .34, 1.70, .02, base, { mode: 7, gloss: G.fabric });
        box(nx, 2.86, nz, .38, .05, .04, C('#c8a24a'), { hard: true, gloss: .30 });
        glyphs(nx, 2.02, nz + n * .016, yawOf(n), banner,
          { size: .26, gap: .06, vertical: true, color: CREAM, mode: 1, lift: .006 });
      }
    }

    // ---------------------------------------------------------------- 北京新天地, NORTH side
    // n = -1, so everything in front of it is at MZ - d. Rebuilt in this lane's own ±z facing
    // rather than rotated out of the parade's -x one: a rotation swaps the size arguments of
    // every box as well as its position and there is no identity to check the result against.
    const MX = 46.60, MZ = LZ1, MN = -1;
    // Five individually framed bays replace the old 5.95 m glass sheet and the opaque portal box.
    // The district body supplies the wall behind; thin stone jambs and a shadowed reveal create
    // the depth. The middle pair are doors, the outer bays are displays, and no visible element is
    // wider than the address needs to read as one entrance.
    const MALL_FACE = MZ + MN * .22, MALL_BACK = MZ - MN * .04;
    for (const s of [-1, 1])
      box(MX + s * 3.08, 3.12, MALL_BACK, .48, 6.24, .72, C('#c8c0b2'),
        { hard: true, mode: 14, gloss: .24, ...PMAT, tag: '购物中心' });
    box(MX, 5.96, MALL_BACK, 5.72, .56, .72, C('#c8c0b2'),
      { hard: true, mode: 14, gloss: .24, ...PMAT, tag: '购物中心' });
    box(MX, .13, MALL_FACE, 5.70, .26, .54, C('#5f6265'),
      { hard: true, gloss: .24, tag: '购物中心' });
    const MALL_BAYS = [-2.28, -1.14, 0, 1.14, 2.28];
    MALL_BAYS.forEach((dx, bi) => {
      const door = bi === 2;
      box(MX + dx, 2.86, MALL_BACK + MN * .010, 1.02, 5.34, .055, C('#182029'),
        { hard: true, gloss: .14, tag: '购物中心' });
      emis(box(MX + dx, 2.86, MALL_FACE, .92, 5.18, .035, GLASS,
        { hard: true, mode: 1, alpha: .58, gloss: G.glass, tag: '购物中心' }), door ? .16 : .10);
      emis(box(MX + dx, 2.04, MALL_BACK + MN * .018, .76, 3.10, .018,
        door ? WARMI : C('#4e5c68'),
        { hard: true, mode: 1, glow: door ? .035 : .012, tag: '购物中心' }), door ? .24 : .09);
      box(MX + dx, 4.22, MALL_FACE + MN * .018, .94, .065, .055, STEEL,
        { hard: true, gloss: G.metal, tag: '购物中心' });
    });
    for (const dx of [-2.85, -1.71, -.57, .57, 1.71, 2.85])
      box(MX + dx, 2.88, MALL_FACE + MN * .025, .075, 5.42, .075, STEEL,
        { hard: true, gloss: G.metal, tag: '购物中心' });
    for (const s of [-1, 1]) {
      box(MX + s * .34, 1.52, MALL_FACE + MN * .055, .065, 2.82, .08, col.gold,
        { hard: true, gloss: G.metal, tag: '购物中心' });
      cap(MX + s * .18, 1.46, MALL_FACE + MN * .09, .022, .34, .022, col.goldL,
        { gloss: G.metal, tag: '购物中心' });
    }
    // A shallow glass-and-steel rain hood marks the threshold without consuming the lane.
    box(MX, 4.66, MZ + MN * .53, 4.40, .12, .72, STEEL,
      { hard: true, gloss: G.metal, tag: '购物中心' });
    box(MX, 4.73, MZ + MN * .53, 4.12, .045, .66, GLASS,
      { hard: true, mode: 1, alpha: .42, gloss: G.glass, tag: '购物中心' });
    box(MX, 5.48, MZ + MN * .31, 4.75, .82, .20, REDD,
      { hard: true, gloss: .28, tag: '购物中心' });
    emis(box(MX, 5.02, MZ + MN * .34, 4.55, .06, .03, col.goldL,
      { hard: true, mode: 1, glow: .10, tag: '购物中心' }), .72);
    for (const g of glyphs(MX, 5.48, MZ + MN * .34, Math.PI, '北京新天地',
      { size: .44, gap: .14, color: col.goldL, mode: 1, glow: .18, lift: .012, tag: '购物中心' }))
      emis(g, .70);
    box(MX - 3.18, 4.22, MZ + MN * .56, .62, 2.55, .28, REDD,
      { hard: true, gloss: .28, tag: '购物中心' });
    glyphs(MX - 3.18, 4.22, MZ + MN * .72, Math.PI, '购物中心',
      { size: .25, gap: .09, vertical: true, color: col.goldL, mode: 1, glow: .14, tag: '购物中心' });
    for (const s of [-1, 1]) {
      taper(MX + s * 2.65, .28, MZ + MN * .70, .54, .56, .54, C('#8a8378'), { gloss: .24 });
      ball(MX + s * 2.65, .68, MZ + MN * .70, .35, .38, .35, col.green, { mode: 15, gloss: .12 });
    }
    if (typeof light === 'function') light(MX, 3.2, MZ + MN * .80, [1.0, .84, .60], .40, 7.0);
    thing('购物中心', MX, 5.42, MZ + MN * .32, '这个购物中心有电影院和美食广场。',
      'This shopping mall has a cinema and a food court.',
      '购物 shopping + 中心 centre. 商场 is the everyday shorter word.',
      { focus: [MX, MZ + MN * .88], reach: 2.4 });

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
    // Six framed bays replace the former 8.90 m pane and 9.20 m sign bar. The centre pair are
    // automatic doors; four display bays show shelf rhythm behind glass. Stone end piers and a
    // lintel are separate pieces, so the address reads as a fitted shopfront rather than a box.
    const MARKET_FACE = SZ + SN * .22, MARKET_BACK = SZ - SN * .04;
    for (const s of [-1, 1])
      box(SX + s * 4.38, 2.78, MARKET_BACK, .52, 5.56, .72, C('#d5cec0'),
        { hard: true, mode: 14, gloss: .24, ...PMAT, tag: '大超市' });
    box(SX, 5.30, MARKET_BACK, 8.24, .52, .72, C('#d5cec0'),
      { hard: true, mode: 14, gloss: .24, ...PMAT, tag: '大超市' });
    box(SX, .13, MARKET_FACE, 8.20, .26, .52, C('#5f6265'),
      { hard: true, gloss: .24, tag: '大超市' });
    const MARKET_BAYS = [-3.25, -1.95, -.65, .65, 1.95, 3.25];
    MARKET_BAYS.forEach((dx, bi) => {
      const door = bi === 2 || bi === 3;
      box(SX + dx, 2.48, MARKET_BACK + SN * .010, 1.16, 4.56, .055, C('#1d252c'),
        { hard: true, gloss: .13, tag: '大超市' });
      emis(box(SX + dx, 2.48, MARKET_FACE, 1.06, 4.40, .035, GLASS,
        { hard: true, mode: 1, alpha: .55, gloss: G.glass, tag: '大超市' }), door ? .15 : .09);
      emis(box(SX + dx, 2.02, MARKET_BACK + SN * .018, .88, 3.08, .018,
        door ? COOLI : C('#53616a'),
        { hard: true, mode: 1, glow: door ? .03 : .01, tag: '大超市' }), door ? .22 : .08);
      if (!door) for (const y of [1.18, 2.20, 3.20])
        box(SX + dx, y, MARKET_FACE + SN * .018, .90, .055, .045, C('#67727a'),
          { hard: true, gloss: .18, tag: '大超市' });
    });
    for (const dx of [-3.90, -2.60, -1.30, 0, 1.30, 2.60, 3.90])
      box(SX + dx, 2.50, MARKET_FACE + SN * .025, .075, 4.66, .075, STEEL,
        { hard: true, gloss: G.metal, tag: '大超市' });
    for (const s of [-1, 1]) {
      box(SX + s * .66, 1.56, MARKET_FACE + SN * .055, .06, 2.90, .08, STEEL,
        { hard: true, gloss: G.metal, tag: '大超市' });
      cap(SX + s * .38, 1.48, MARKET_FACE + SN * .09, .022, .42, .022, STEEL,
        { gloss: G.metal, tag: '大超市' });
    }
    // Three independent headwall panels keep the supermarket legible without a nine-metre slab.
    box(SX, 5.02, SZ + SN * .27, 4.35, .88, .22, REDD,
      { hard: true, gloss: .26, tag: '大超市' });
    box(SX - 3.18, 5.02, SZ + SN * .25, 1.30, .68, .18, C('#3e7658'),
      { hard: true, gloss: .25, tag: '大超市' });
    box(SX + 3.18, 5.02, SZ + SN * .25, 1.30, .68, .18, C('#3e7658'),
      { hard: true, gloss: .25, tag: '大超市' });
    for (const g of glyphs(SX, 5.02, SZ + SN * .40, 0, '大超市',
      { size: .56, gap: .18, color: C('#f2e4c4'), mode: 1, glow: .18, lift: .012, tag: '大超市' }))
      emis(g, .66);
    glyphs(SX - 3.18, 5.02, SZ + SN * .355, 0, '生鲜',
      { size: .28, gap: .10, color: C('#eef3e8'), mode: 1, lift: .008, tag: '大超市' });
    glyphs(SX + 3.18, 5.02, SZ + SN * .355, 0, '日用',
      { size: .28, gap: .10, color: C('#eef3e8'), mode: 1, lift: .008, tag: '大超市' });
    for (let i = 0; i < 3; i++) {                                  // nested tight to the east pier
      const tx = SX + 3.18 + i * .27;
      taper(tx, .52, SZ + SN * .72, .80, .40, .50, STEEL,
        { hard: true, gloss: G.metal, tag: '大超市' });
      cap(tx - .34, .84, SZ + SN * .72, .018, .46, .018, C('#c8452f'),
        { rz: Math.PI / 2, gloss: .30, tag: '大超市' });
      // The baskets deliberately nest, but each remains a complete trolley: a low chassis,
      // splayed uprights and four ground-contact wheels.  Without these parts the old three
      // tapers floated 32 cm above the pavement and read as interpenetrating wire bins.
      box(tx, .225, SZ + SN * .72, .48, .035, .28, STEEL,
        { hard:true, gloss:G.metal, tag:'大超市' });
      for (const side of [-1,1]) {
        cap(tx + side * .25, .37, SZ + SN * .72, .014, .30, .014, STEEL,
          { rz:side * .16, gloss:G.metal, tag:'大超市' });
        for (const fore of [-1,1])
          cyl(tx + side * .25, .075, SZ + SN * (.72 + fore * .14), .055, .026, col.black,
            { rz:Math.PI / 2, gloss:.28, tag:'大超市' });
      }
    }
    if (typeof light === 'function') light(SX, 3.2, SZ + SN * .82, [.80, .88, 1.0], .34, 7.0);
    thing('大超市', SX, 5.05, SZ + SN * .30, '大超市什么都有，比小卖部便宜。',
      'The hypermarket has everything, and it is cheaper than the corner shop.',
      '大 big + 超市 supermarket. The 超市 by your door is a 便利店 by comparison.',
      { focus: [SX, SZ + SN * .90], reach: 2.6 }).exit = { place: 'market' };

    // ================================================================ the ground in front of them
    // STOREFRONT-UPGRADES.md items A6, B1–B6 and C4. Every placement below is inside one of the
    // two 1.00 m unreachable strips measured at the top of this file, or outside the zones
    // altogether, and calls neither `solid` nor `blocker` — with the one stated exception, the
    // 三轮车, whose collider is measured where it is built.

    // ---- A4 again, on the fifth glass door in the lane. 大超市 is a named shop and its doors
    // are the ones a learner actually walks through.
    pay(SX - .48, 1.42, SZ + SN * .24, SN);
    pay(SX + 1.08, 1.42, SZ + SN * .24, SN);

    // ---- B1. Goods on the pavement, outside all four units. street-retail.js's header makes the
    // case in one line — "a Chinese shop's stock starts outside its door" — and the lane had
    // planters and nothing else. All of it between each unit's own two planters (which stand at
    // ux ± (w/2 − 0.40) with a 0.20 m radius) and at most 0.95 m off the frontage, so the lane's
    // clear run is untouched: 5.40 m, exactly what it was.

    // 面包房 — the crates the morning's bread came out in, stacked and not yet taken in. x 42.84
    // .. 43.46, which is the clear window between its west planter (42.20..42.60) and the sacks.
    for (let i = 0; i < 3; i++) {
      const cx=43.15+(i%2)*.04, cy=.09+i*.15, tone=C(i===1?'#8c6b3f':'#a3814e');
      box(cx,cy-.05,-12.98,.58,.035,.38,tone,{hard:true,gloss:.18});
      for(const sx of [-1,1])for(const sz of [-1,1])
        cap(cx+sx*.27,cy,-12.98+sz*.17,.010,.11,.010,tone,{gloss:G.wood});
      for(const sz of [-1,1])
        cap(cx,cy+.05,-12.98+sz*.17,.010,.55,.010,tone,{rz:Math.PI/2,gloss:G.wood});
    }
    ball(43.30, .60, -13.02, .15, .08, .11, C('#c89a58'), { gloss: .14 });
    // Three soft flour sacks with tied necks; the former .68 m grey cabinet-shaped "sack" was the
    // only vertical cuboid in the bakery stock and read as a utility box.
    for(const [ox,yy,lean] of [[-.11,.22,-.10],[.11,.25,.12],[.01,.57,.04]]){
      ball(43.70+ox,yy,-13.06,.21,.24,.14,C('#cfc6b4'),{mode:7,gloss:.12,ry:lean});
      cap(43.70+ox,yy+.22,-13.06,.012,.12,.012,C('#8a7658'),{rz:lean,gloss:.16});
    }

    // 花店 — three zinc buckets between the planters, and a tiered stand against the glass. The
    // one shop on this lane whose stock IS the shopfront.
    [[46.32, '#b8455a'], [46.62, '#d8b23f'], [46.92, '#e6dfd0']].forEach(([bxx, hex], i) => {
      cyl(bxx, .21, -13.02, .155, .42, C('#9aa0a2'), { gloss: G.metal });
      ball(bxx, .56, -13.02, .17, .17, .17, C(hex), { mode: 15, gloss: .14 });
      ball(bxx, .48, -13.02, .13, .10, .13, col.greenD, { mode: 15, gloss: .12 });
    });
    for (let i = 0; i < 3; i++)
      box(46.60, .30 + i * .32, -13.14 + i * .015, 1.10, .05, .14, C('#6b5a44'),
        { hard: true, gloss: .22 });
    for (let i = 0; i < 6; i++)
      ball(46.16 + (i % 3) * .44, .40 + Math.floor(i / 3) * .32, -13.13,
        .12, .12, .10, C(['#c0485a', '#e0a63a', '#8a4a7a'][i % 3]), { mode: 15, gloss: .14 });

    // 奶茶店 — two open bottle crates east of the door line. The old pair were simply two blue
    // cubes with bottles floating behind them; slatted bases, corner posts and returned top rails
    // expose the empties and keep this small object from becoming the strongest block in the bay.
    for (let layer = 0; layer < 2; layer++) {
      const cy=.14+layer*.29, cc=C(layer?'#355f79':'#3d6f8c');
      box(53.45,cy-.11,-5.38,.52,.045,.36,cc,{hard:true,gloss:.22});
      for(const sx of [-1,1])for(const sz of [-1,1])
        cap(53.45+sx*.24,cy,-5.38+sz*.16,.012,.25,.012,cc,{gloss:.24});
      for(const sz of [-1,1])
        cap(53.45,cy+.11,-5.38+sz*.16,.012,.50,.012,cc,{rz:Math.PI/2,gloss:.24});
      for(let i=0;i<3;i++){
        cyl(53.27+i*.18,cy+.10,-5.39,.037,.19,C('#dfe8ee'),{gloss:.34});
        cyl(53.27+i*.18,cy+.205,-5.39,.018,.025,C('#a8bfd0'),{gloss:.30});
      }
    }

    // 书店 — the trestle of remainders every bookshop in this city puts out, and a spinner. West
    // of the door stile at 56.04 and east of its planter's 55.40, which is a 0.64 m window.
    box(55.72, .36, -5.40, .60, .05, .44, C('#7a6a4a'), { hard: true, gloss: G.wood });
    for (const s of [-.24, .24])
      box(55.72 + s, .18, -5.40, .05, .36, .40, C('#6b5a44'), { hard: true, gloss: G.wood });
    for (let i = 0; i < 6; i++)
      box(55.50 + (i % 3) * .22, .42 + Math.floor(i / 3) * .05, -5.44 + (i % 2) * .10,
        .18, .045, .30, C(['#9c3a30', '#2f5f8c', '#c8a24a'][i % 3]),
        { hard: true, gloss: .24 });
    cyl(57.25, .55, -5.42, .022, 1.10, STEEL, { gloss: G.metal });
    for (let i = 0; i < 4; i++)
      box(57.25 + Math.cos(i * 1.571) * .17, .78, -5.42 + Math.sin(i * 1.571) * .17,
        .26, .34, .03, C(['#c8a24a', '#9c3a30', '#dfe8ee', '#3d7a5a'][i]),
        { ry: i * 1.571, hard: true, gloss: .22 });

    // ---- A6. Two 立牌 on the lane, one per side. Standing boards rather than folding A-frames,
    // because `glyphs` takes a yaw and nothing else — chalk written across a board leaning back
    // 9° would be chalk floating in front of it. Both stand in the unreachable strip and their
    // legs kick back TOWARD the frontage, not out into the lane: the bakery's nearest face to the
    // walkable band is z -11.93 against a body limit of -11.60, the tea shop's -6.48 against
    // -6.80. No collider on either, so the item's 3.35 m floor is not approached.
    const easel = (ex, ez, nn, tint) => {
      box(ex, .74, ez, .58, 1.06, .045, C('#2b2f33'), { hard: true, gloss: .26 });
      box(ex, 1.30, ez, .62, .07, .06, tint, { hard: true, gloss: .28 });
      for (const s of [-1, 1])
        cyl(ex + s * .22, .36, ez - nn * .16, .022, .74, C('#5a5248'),
          { rx: nn * .32, gloss: G.wood });
      glyphs(ex, .92, ez + nn * .026, yawOf(nn), '今日特价',
        { size: .11, gap: .025, color: C('#e8e2d0'), mode: 1, lift: .006 });
      glyphs(ex, .60, ez + nn * .026, yawOf(nn), '新到',
        { size: .13, gap: .03, color: tint, mode: 1, lift: .006 });
    };
    easel(44.40, -12.95, 1, C('#e0a63a'));
    easel(51.95, -5.46, -1, C('#e8b4c0'));

    // ---- B2. A delivery. One 三轮车 in the district outside the alley's 超市, and none here.
    // Pulled up ALONGSIDE the frontage rather than backed square into it, and that is a measured
    // decision, not a stylistic one: backed in square it is 1.90 m of lane and fails B1's floor.
    // The gate's clampMove scan measured the first shipped depth at 3.55 m clear against a 3.40 m
    // floor — see the note in this file's header for why that number and not this file's own.
    // The bed is only 0.70 m deep and is tucked another 45 cm toward the shopfront. Its visual
    // edge now stops at -12.29, leaving the centre run conspicuously open instead of merely legal.
    const TB = 50.50, TZ = -12.67;
    const TRIKE = C('#3d6f5a'), TRIKED = C('#294d40');
    // Open chassis rails and a slatted load bed replace the green cargo cuboid.
    for (const zz of [TZ - .27, TZ + .27]) {
      cap(TB, .55, zz, .026, 1.46, .026, TRIKED, { rz: Math.PI / 2, gloss: G.metal });
      for (let k = 0; k < 3; k++)
        cap(TB - .52 + k * .52, .78, zz, .022, .44, .022, TRIKE, { gloss: G.metal });
      for (const yy of [.64, .84])
        cap(TB, yy, zz, .021, 1.42, .021, TRIKE, { rz: Math.PI / 2, gloss: G.metal });
    }
    for (let k = 0; k < 5; k++)
      box(TB - .60 + k * .30, .57, TZ, .24, .065, .56, C('#6d593c'),
        { hard:true, gloss:G.wood });
    // Step-through front frame, fork, saddle, battery cradle and handlebar.
    cap(TB - .70, .55, TZ, .027, .72, .027, TRIKE, { rz:.76, gloss:G.metal });
    cap(TB - .92, .57, TZ, .025, .72, .025, TRIKED, { rz:-.28, gloss:G.metal });
    cap(TB - 1.02, .60, TZ, .022, .62, .022, STEEL, { rz:.16, gloss:G.metal });
    cap(TB - .98, 1.02, TZ, .020, .48, .020, STEEL,
      { rx:Math.PI / 2, gloss:G.metal });
    box(TB - .72, .86, TZ, .28, .055, .19, col.black, { hard:true, gloss:.28 });
    taper(TB - .48, .43, TZ, .32, .38, .28, C('#38424b'), { gloss:.28 });
    // Wheels are open rings with spokes, never black pucks.
    const trikeWheel = (wx, wz) => {
      const wr=.255, wn=8, seg=2*wr*Math.sin(Math.PI/wn)*1.10;
      for(let k=0;k<wn;k++){
        const a=k*Math.PI*2/wn;
        cap(wx+Math.cos(a)*wr,.28+Math.sin(a)*wr,wz,.020,seg,.020,col.black,
          {rz:a,gloss:.25});
      }
      for(let k=0;k<3;k++)
        cap(wx,.28,wz,.008,.44,.008,STEEL,{rz:k*Math.PI/3,gloss:G.metal});
      cyl(wx,.28,wz,.050,.08,STEEL,{ry:Math.PI/2,rz:Math.PI/2,gloss:G.metal});
    };
    for (const [wx, wz] of [[TB + .62, TZ - .24], [TB + .62, TZ + .24], [TB - 1.02, TZ]])
      trikeWheel(wx,wz);
    // Airy produce crates: base, corner posts and top rails with the goods visible between them.
    const laneCrate = (cx, cy, cz, tone, n=3) => {
      box(cx,cy-.13,cz,.40,.055,.32,tone,{hard:true,gloss:G.wood});
      for(const sx of [-1,1])for(const sz of [-1,1])
        cap(cx+sx*.18,cy,cz+sz*.14,.012,.30,.012,tone,{gloss:G.wood});
      for(const sz of [-1,1])
        cap(cx,cy+.13,cz+sz*.14,.012,.38,.012,tone,{rz:Math.PI/2,gloss:G.wood});
      for(let i=0;i<n;i++)
        ball(cx+(i-1)*.10,cy+.10+(i%2)*.04,cz+(i%2?-.05:.05),.075,.060,.070,
          C(i%2?'#7e9a4a':'#c08b3d'),{gloss:.16});
    };
    for (let i = 0; i < 3; i++)
      laneCrate(TB - .30 + i * .46, .91, TZ + (i % 2) * .07,
        C(i === 1 ? '#a3814e' : '#8c6b3f'));
    box(TB + .20, 1.12, TZ, 1.30, .05, .64, C('#5a6a52'), { mode: 7, gloss: G.fabric });
    // The load half off, on the ground beside the tailboard. These stand EAST of the bed, so the
    // collider has to run out to 52.25 to cover them — a wider stretch of lane at the same depth,
    // which costs nothing, where leaving them out would have left two crates you walk through.
    for (let i = 0; i < 2; i++)
      laneCrate(TB + 1.02 + i * .48, .25, TZ - .10 + i * .16, C('#8c6b3f'),2);
    solid(49.30, 52.25, -13.60, -12.29);

    // ---- B3. Bins. The lane had none. Two, as a pair, which is how this city puts them out —
    // 可回收物 beside 其他垃圾 — and they go on the north side because that is the only place on
    // this lane with room. The south frontage from x 48.00 east is 大超市, whose mass face is at
    // z -11.60, i.e. **exactly** on the body limit: there is no unreachable strip in front of the
    // hypermarket at all, and a bin there would be the second collider in the lane. The window
    // between the mall's east edge (50.20) and 奶茶店's west planter (51.20) is 1.00 m, which
    // takes two at 0.46. Each is 0.46 deep at z -6.39, so -6.62..-6.16: clear of the body limit
    // at -6.80 by 0.18 m and of the shopfront band's face at -6.14 by 0.02.
    [[50.43, '#3d7a4a', '可回收物'], [50.99, '#585d63', '其他垃圾']].forEach(([bx, hex, lab]) => {
      const body=C(hex), dark=C('#2f3338');
      taper(bx,.40,-5.39,.40,.68,.38,body,{hard:true,gloss:.30});
      box(bx,.76,-5.39,.43,.055,.42,dark,{hard:true,gloss:.34,rz:-.035});
      cap(bx,.80,-5.48,.012,.24,.012,C('#171a1d'),{rz:Math.PI/2,gloss:.24});
      cap(bx,.72,-5.22,.012,.34,.012,C('#1b1e21'),{rz:Math.PI/2,gloss:.26});
      for(const sx of [-1,1])
        ball(bx+sx*.14,.08,-5.42,.045,.045,.035,col.black,{gloss:.22});
      box(bx,.05,-5.24,.17,.035,.11,dark,{hard:true,gloss:.24});
      glyphs(bx, .44, -5.585, Math.PI, lab,
        { size: .078, gap: .016, color: C('#f0efe8'), mode: 1, lift: .006 });
    });

    // ---- B6. Pavement wear. Six flat quads, no collider, and the lane stops reading as new
    // tile. The alley has puddles and made-good patches; this is the same argument.
    flat(50.00, .014, LZC, 13.60, 2.30, C('#ada698'), { gloss: .13 });         // the desire line
    flat(52.90, .019, -10.90, 2.40, 1.40, C('#8f8b80'), { gloss: .52 });       // wet, by the doors
    flat(46.20, .019, -9.60, 1.80, 1.10, C('#9c968a'), { gloss: .20 });        // a made-good patch
    flat(48.60, .020, LZC, .55, 5.00, C('#a8a294'), { gloss: .17 });           // a trench, reinstated
    flat(43.50, .016, -9.30, 1.20, .90, C('#8a867c'), { gloss: .40 });         // the gully's stain
    flat(52.70, .016, -7.40, .95, .75, C('#95907f'), { gloss: .46 });          // spilt tea

    // ---- C4. 店猫. The alley has two and the trading half had none. Asleep on the bakery's
    // crates, which are the warmest thing on this pavement at four in the afternoon. One prop
    // group, no tick: a cat that breathes is a per-frame write for an object 40 cm across.
    ball(43.13, .61, -12.98, .21, .13, .15, C('#c98d4e'), { mode: 15, gloss: .10 });
    ball(42.95, .66, -13.00, .10, .09, .09, C('#d69a58'), { mode: 15, gloss: .10 });
    for (const s of [-1, 1])
      ball(42.95 + s * .05, .74, -13.00, .035, .045, .02, C('#9a6a38'), { mode: 15, gloss: .10 });
    cap(43.27, .60, -12.90, .035, .30, .035, C('#b8813f'), { ry: .7, rz: 1.2, gloss: .10 });

    // ---------------------------------------------------------------- the gateway at the mouth
    // The first gateway was a six-metre-high pair of 1.10 m masonry piers with a full-span beam.
    // It measured five metres clear yet read as a tunnel from the crossing. Keep the address, but
    // make it urban wayfinding rather than architecture: two slim paired steel markers sit beyond
    // the body envelope, short cantilevers stop well before the centre, and sky stays continuous.
    const GATE_Z = [MOUTH_Z0 + .16, MOUTH_Z1 - .16];
    for (let gi = 0; gi < GATE_Z.length; gi++) {
      const pz = GATE_Z[gi], inward = gi === 0 ? 1 : -1;
      for (const px of [LX0 + .18, LX0 + .58]) {
        box(px, 2.55, pz, .14, 5.10, .18, REDD, { hard: true, gloss: .34 });
        box(px, .16, pz, .34, .32, .44, C('#77716a'), { hard: true, gloss: .22 });
      }
      box(LX0 + .38, 4.88, pz + inward * .72, .54, .16, 1.62, REDD,
        { hard: true, gloss: .32 });
      box(LX0 + .36, 3.18, pz + inward * .06, .09, 1.94, .72, RED,
        { hard: true, gloss: .30 });
      for (const g of glyphs(LX0 + .305, 3.18, pz + inward * .06, -Math.PI / 2,
          gi === 0 ? '新天地' : '步行街',
          { size: .25, gap: .08, vertical: true, color: col.goldL,
            mode: 1, glow: .18, lift: .008 }))
        emis(g, .72);
    }
    // One low directory plate faces the crossing. It is fixed to the north marker and leaves no
    // freestanding pole in the arrival apron.
    box(LX0 + .07, 1.45, MOUTH_Z1 - .16, .07, 1.44, .78, C('#2f3a44'),
      { hard: true, gloss: .28 });
    box(LX0 + .025, 2.20, MOUTH_Z1 - .16, .10, .08, .84, REDD,
      { hard: true, gloss: .26 });
    glyphs(LX0 - .015, 1.67, MOUTH_Z1 - .16, -Math.PI / 2, '新天地步行街',
      { size: .125, gap: .028, color: C('#e8dfc6'), mode: 1, lift: .006 });
    glyphs(LX0 - .015, 1.30, MOUTH_Z1 - .16, -Math.PI / 2, '面包花店奶茶书店',
      { size: .082, gap: .018, color: C('#b9c2ca'), mode: 1, lift: .006 });
    if (typeof light === 'function') light(LX0 + 1.8, 4.0, LZC, [1.0, .82, .58], .28, 8.0);

    // The resulting first impression is a full 6.2 m of open paving. No chain, bollard rank or
    // freestanding directory occupies the sightline or suggests that pedestrians must queue.

    // ---- B4. 共享单车. Two machines form a small kerb bay south of the gateway; the previous
    // bank of four dominated the doorway in perspective and duplicated the larger road rack.
    flat(40.45, .013, -13.68, 1.60, .10, C('#c8b45a'), { gloss: .18 });
    flat(40.45, .013, -14.18, 1.60, .10, C('#c8b45a'), { gloss: .18 });
    // Built as open spoked machines, not four black cylinder faces. From a street-length view the
    // old solid wheel discs were the dominant shapes in the bay and made the bicycles read as a
    // stack of tyres. Ten short tyre arcs leave daylight through each wheel; four spokes, a hub,
    // fork, stays, crank, bars and rack then keep the silhouette legible from either approach.
    const cycleWheel = (wx, bz) => {
      const WR = .27, N = 10, SEG = 2 * WR * Math.sin(Math.PI / N) * 1.10;
      for (let k = 0; k < N; k++) {
        const a = k * Math.PI * 2 / N;
        cap(wx + Math.cos(a) * WR, .30 + Math.sin(a) * WR, bz,
          .018, SEG, .018, col.black, { rz: a, gloss: .25 });
      }
      for (let k = 0; k < 4; k++)
        cap(wx, .30, bz, .007, .47, .007, col.steel, { rz: k * Math.PI / 4, gloss: G.metal });
      cyl(wx, .30, bz, .037, .08, col.steelD,
        { ry: Math.PI / 2, rz: Math.PI / 2, gloss: G.metal });
    };
    [[-13.68, '#e8b81f'], [-14.18, '#3d9c62']]
      .forEach(([bz, hex]) => {
        const fr = C(hex);
        cycleWheel(39.98, bz); cycleWheel(40.92, bz);
        // Two triangles and returned stays form a recognisable step-through frame.
        cap(40.45, .51, bz, .022, .86, .022, fr, { rz: Math.PI / 2, gloss: .32 });
        cap(40.23, .53, bz, .021, .52, .021, fr, { rz: .53, gloss: .32 });
        cap(40.67, .55, bz, .020, .57, .020, fr, { rz: -.48, gloss: .32 });
        cap(40.20, .51, bz, .020, .45, .020, fr, { rz: -.32, gloss: .32 });
        cap(40.84, .55, bz, .018, .57, .018, col.steelD, { rz: .18, gloss: G.metal });
        cap(40.92, .83, bz, .016, .32, .016, col.steel,
          { rx: Math.PI / 2, gloss: G.metal });
        box(40.19, .76, bz, .20, .045, .10, col.black, { hard: true, gloss: .28 });
        cyl(40.43, .35, bz, .080, .025, col.steelD,
          { ry: Math.PI / 2, rz: Math.PI / 2, gloss: G.metal });
        for (const side of [-.11, .11])
          cap(40.43, .29, bz + side, .014, .18, .014, col.black,
            { rz: Math.PI / 2, gloss: .25 });
        // A wire basket and low rear carrier, both visibly supported.
        taper(40.86, .80, bz, .27, .21, .21, C('#9aa0a2'), { gloss: .30 });
        for (const zoff of [-.12, .12])
          cap(40.08, .70, bz + zoff, .012, .36, .012, col.steelD,
            { rz: Math.PI / 2, gloss: G.metal });
        cap(39.93, .63, bz, .012, .30, .012, col.steelD, { rz: -.18, gloss: G.metal });
      });
    cyl(41.24, .48, -13.72, .030, .96, C('#6a7076'), { gloss: G.metal });
    box(41.24, 1.06, -13.72, .52, .30, .04, C('#2f5f8c'), { hard: true, gloss: .28 });
    glyphs(41.24, 1.06, -13.72 - .026, Math.PI, '单车停放',
      { size: .11, gap: .025, color: C('#eef2f6'), mode: 1, lift: .006 });

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
        const by = 5.30 - sag * Math.sin(u * Math.PI) - .10;
        // A straight messenger cable can carry a sagging festoon only through pendant drops.
        // Model every drop instead of leaving the centre bulbs floating over half a metre below it.
        cap(wx, (5.30 + by) * .5, dz, .006, 5.30 - by, .006, C('#3a3a36'),
          { gloss:.22, tag:'灯串' });
        emis(ball(wx, by, dz, .055, .062, .055,
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
      s.p.m = open ? rolledShutter(s.x, s.z, s.wid, s.top) :
        M.trs(s.x, s.top - s.h / 2, s.z, 0, s.wid, s.h, .05);
    }
  };

  // ---------------------------------------------------------------- the lane's cast (C1–C3)
  //
  // SIX, and six is a ceiling rather than a target: the district already carries 32 people and
  // .audit.js:327 records it as fill-rate bound, so this is the one item on the storefront list
  // whose constraint is a number and not a taste. Two shopkeepers who stand, two people walking
  // it end to end, and two in a queue at 大超市 for the two hours a queue is plausible. Between
  // 10:00 and 21:00 there are four in the lane at any moment and six in the evening.
  //
  // `window.StreetCast` and not `addNPC`: js/game.js is an IIFE and `addNPC`, `initNPC`,
  // `makeLook` and `TEMPERAMENT` are all closure-private. game.js:1408 folds this array into
  // `NPCS` before the roster is initialised, and this file loads before game.js. On `window`
  // rather than as a bare `const` because nine district files share one lexical scope and a
  // second `const StreetCast` is not one broken district, it is the whole game failing to boot.
  // See the long note at the top of js/street-alley.js, which is where the pattern is written up.
  //
  // Facing: the body's forward is (sin yaw, cos yaw), so yaw 0 looks along +z and π along -z —
  // the same convention as this file's glyphs, and the reason a shopkeeper on the SOUTH frontage
  // faces 0 and one on the NORTH faces π. Both are looking into the lane.
  (function addLanePeople() {
    const CAST = (window.StreetCast = window.StreetCast || []);

    // ---- C3. A shopkeeper in a doorway, one per side. `spots`, not a patrol: a shopkeeper
    // stands. Both are in the 1.00 m unreachable strip, so you can never end up inside one.
    CAST.push({
      hz: '老板娘', place: 'street', temper: 'genial', speed: .78,
      look: { skin:'#e0b48c', hair:'#3a322c', hairStyle:'bun', top:'#e8e2d6', pants:'#3a4148',
              shoe:'#d8d2c0', sleeve:'short', collar:'polo', apron:'#8a6a3f',
              tall:0.93, wide:1.04, headScale:1.00, age:0.44, faceSeed:401 },
      spots: [{ h0: 6.8, h1: 19.8, at: [43.70, -12.72], face: 0, act: 'vend' }],
    });
    CAST.push({
      hz: '老板', place: 'street', temper: 'steady', speed: .76,
      look: { skin:'#cba078', hair:'#8e877e', hairStyle:'short', top:'#4f6a80', pants:'#333a42',
              shoe:'#3a3f45', sleeve:'long', collar:'shirt', glasses:true,
              tall:1.00, wide:1.02, headScale:1.01, stoop:0.11, age:0.71, faceSeed:403 },
      spots: [{ h0: 9.8, h1: 21.8, at: [56.50, -5.55], face: Math.PI, act: 'read' }],
    });

    // ---- C1. Two on routes, end to end. `hours` + `patrol` is 豆豆's own pattern (data.js:135).
    // The two lines stay near opposite shop edges at z -10.65 and -7.75. That leaves a calm
    // 2.9-metre visual centre aisle even when both walkers meet; NPCs need to respect perceived
    // breathing room just as much as colliders do.
    CAST.push({
      hz: '路人', place: 'street', temper: 'brisk', speed: 1.06,
      look: { skin:'#dcae86', hair:'#241f1c', hairStyle:'ponytail', top:'#b8455a', pants:'#39414d',
              shoe:'#e8e2d6', sleeve:'short', bag:'shoulder', bagColor:'#5a4a3c',
              tall:0.95, wide:0.96, headScale:1.00, age:0.31, faceSeed:409 },
      hours: [10.0, 21.0], patrol: [[42.60, -10.65], [57.40, -10.35]],
    });
    CAST.push({
      hz: '路人', place: 'street', temper: 'bored', speed: 0.88,
      look: { skin:'#c89468', hair:'#2b2320', hairStyle:'short', top:'#5c6248', pants:'#2f3742',
              shoe:'#d64f3f', sleeve:'half', collar:'polo', pack:true, packColor:'#3f6350',
              tall:1.02, wide:1.06, headScale:1.01, stoop:0.05, age:0.38, faceSeed:411 },
      hours: [10.0, 21.0], patrol: [[57.20, -7.75], [42.80, -8.05]],
    });

    // ---- C2. 排队. The word exists at the breakfast stall and nowhere else on this street, and
    // it is one of the most useful on it. Two at the hypermarket's west door between half five
    // and half seven, which is the hour a Beijing supermarket actually has a queue at its door.
    // Same shape as the stall's: a `spots` window, so outside it they are off the street entirely
    // rather than standing in a line nobody is joining.
    [[-12.15, 'patient', { skin:'#d3a179', hair:'#b0aba2', hairStyle:'perm', top:'#4f7a68',
                           pants:'#3a4148', shoe:'#dfd8ca', sleeve:'short', collar:'polo',
                           bag:'tote', bagColor:'#9c8a6a',
                           tall:0.89, wide:1.11, headScale:0.98, stoop:0.12, age:0.77,
                           faceSeed:419 }, undefined],
     [-11.20, 'bored',   { skin:'#e3b58b', hair:'#2b2320', hairStyle:'tousled', top:'#3f6f8c',
                           pants:'#414954', shoe:'#e9e2d5', sleeve:'short',
                           tall:0.98, wide:0.98, headScale:1.02, age:0.34, faceSeed:421 },
      'phone'],
    ].forEach(([qz, temper, look, act]) => CAST.push({
      hz: '顾客', place: 'street', temper, speed: 0.82, look,
      spots: [{ h0: 17.5, h1: 19.5, at: [52.10, qz], face: Math.PI, act }],
    }));
  })();
})();
