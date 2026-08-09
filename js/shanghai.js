// 外滩 — the Bund, and the first thing in this game that is not Beijing.
//
// You get here by buying a 机票 at the airport and actually getting on the aeroplane. What the
// flight buys you is a mile of granite embankment on the west bank of the 黄浦江, a row of 1920s
// banks and shipping offices at your back, and the whole of 浦东 standing in the water opposite
// — which everybody on this pavement is photographing, not because it is new any more but
// because it is the picture you came for.
//
// It is a holiday, and it is also two days you have to live through: 吃饭, 睡觉, 干净 and 厕所
// go on draining while you are away, so the promenade has to feed you, wash you and put you to
// bed. It does: a 小吃摊 for 小笼包, a 公共厕所, benches, and 和平饭店 at the top of the steps.
//
// Getting home is the 机场大巴 at the far end. The ticket you bought in Beijing is a 往返 —
// a return — so the way back is already paid for; what you have to do is turn up for it.
//
// Outdoors, so no room shell and no window: the renderer puts a sky dome over it and takes the
// sun off the clock, the same way it does the hutong.
const Shanghai = Lazy('Shanghai', () => {
  const col = {
    pave: C('#9a958c'), paveD: C('#837e75'), paveL: C('#aaa59c'),
    granite: C('#8e8880'), graniteD: C('#6f6a63'), graniteL: C('#a49d94'),
    stone: C('#b3ab9d'), stoneD: C('#948c7f'), stoneL: C('#c6bdad'),
    cream: C('#d8cfba'), sand: C('#c2b295'),
    water: C('#5a6a68'), waterD: C('#46534f'), waterL: C('#6d7d78'),
    copper: C('#4b7a63'), copperD: C('#3a604e'),
    road: C('#4c4b49'), kerb: C('#a8a29a'), line: C('#d8d3c4'),
    steel: C('#a7adb2'), steelD: C('#7b8288'), chrome: C('#c6ccd0'),
    white: C('#eceae2'), charcoal: C('#33383d'), black: C('#22262b'),
    red: C('#a8372a'), redD: C('#7f2a20'), gold: C('#c9992f'), goldL: C('#e0b850'),
    blue: C('#2f6392'), blueSign: C('#1f4f8f'), navy: C('#26354a'),
    jade: C('#3d7361'), yellow: C('#d9b02f'), orange: C('#cf7a2b'),
    glassT: C('#8fb0c4'), glassD: C('#5d7d92'), tower: C('#9aa8b2'), towerD: C('#7d8b96'),
    pearl: C('#c94a4a'), pearlD: C('#a03838'), pearlPost: C('#b9bec2'),
    leaf: C('#4f7a3c'), leafD: C('#3c6130'), trunk: C('#5b4a38'),
    awning: C('#b03a34'), wood: C('#7a5a3a'),
  };
  const G = { matte: .05, wood: .20, paint: .16, metal: .58, glass: .80, fabric: .04 };

  // Tiling surface materials, read triplanar in world space. `matScale` is one repeat in metres,
  // so a value is chosen for what the thing *is*: a bank facade is ashlar in courses the better
  // part of two metres and a bench slat is not. Spread in — `{ ...MAT.stone, hard: true }` —
  // rather than repeated, because every distinct combination of scale and amount is its own
  // instanced batch, and a row of eleven blocks each dressed slightly differently is eleven draws
  // where one would do.
  //
  // Nothing emissive gets one. A lit window, a neon glyph, a tower crown and the clock dial are
  // `mode: 1`, which is a light rather than a surface, and putting concrete on a light source is
  // the one mistake in this that is worse at night than by day.
  const MAT = {
    stone:   { mat: 'concrete', matScale: 1.80, matAmt: .38 },  // the bank masses
    granite: { mat: 'concrete', matScale: 1.15, matAmt: .32 },  // plinths, parapet, rustication
    trim:    { mat: 'concrete', matScale: 1.30, matAmt: .28 },  // cornices and string courses
    brick:   { mat: 'brick',    matScale: .90,  matAmt: .36 },
    paving:  { mat: 'paving',   matScale: .80,  matAmt: .34 },
    road:    { mat: 'asphalt',  matScale: 2.00, matAmt: .30 },
    iron:    { mat: 'metal',    matScale: .55,  matAmt: .28 },  // lamp standards, bench ends
    copper:  { mat: 'metal',    matScale: 1.40, matAmt: .26 },  // domes and pyramid roofs
    // Held down at the bottom of the useful range. A bench slat is a foreground object under a
    // warm lamp, and at .36 the grain took the brown into a varnished orange that was the most
    // saturated thing in a night frame — brighter than the towers it is there to sit and watch.
    timber:  { mat: 'wood',     matScale: .60,  matAmt: .30 },
    deck:    { mat: 'wood',     matScale: 1.00, matAmt: .34 },
    canvas:  { mat: 'fabric',   matScale: .50,  matAmt: .30 },
  };

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, flat, glyphs,
          solid, blocker, shade, glow, thing } = B;

  // ---------------------------------------------------------------- dimensions
  // A strip of waterfront 60 m long. Everything is arranged in bands running along x: the river,
  // the parapet, the promenade, the road, and the buildings behind it.
  const RX = 30.0, RZ = 20.0;
  const WALL = -3.00;                     // 情侣墙, the parapet you lean on
  const PROM = [-2.60, 6.00];             // the promenade
  const ROAD = [6.80, 11.00];             // 中山东一路
  const KERB = 11.40;                     // the pavement in front of the banks
  const FRONT = 12.60;                    // where the buildings start
  const FAR = -112.0;                     // the Pudong bank
  // Where the airport bus drops you, which is the only way in.
  const OUT = { x: -22.0, z: 11.20, yaw: Math.PI };

  const litProps = [], pools = [], boats = [], traffic = [];
  function litten(p, k) { litProps.push({ p, k }); return p; }
  function pool(m, c, a, sun) { const g = glow(m, c, a, sun); g.a0 = a; pools.push(g); return g; }
  function movingGroup(parts, cx, cy, cz, r) {
    return parts.map(p => {
      p.fixed = true; p.cx = cx; p.cy = cy; p.cz = cz; p.r = r;
      return { p, m0: new Float32Array(p.m), ob: p.ob && { ...p.ob } };
    });
  }

  let seed = 0x5c31a7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = a => a[(rnd() * a.length) | 0];

  // 元 was missing from here for as long as the photographer's board has existed, so his price
  // has been drawing as a hole in the sign. The atlas is shared and `need` skips what it already
  // has, so registering it here costs nothing even if another room asks for it too.
  Glyphs.need('外滩上海黄浦江浦东东方明珠金茂大厦和平饭店海关钟楼民航售票处' +
               '机场大巴轮渡公共厕所小笼包生煎照相观光中山东一路南京路回程确认元' +
              '0123456789:—·');

  let clockH = null, clockM = null;       // the customs house clock, which keeps game time
  let skyProp = null;                     // the haze behind Pudong, which has to go out at dusk
  const DAYSKY = C('#c3cfd8'), NIGHTSKY = C('#1b2434');

  // ---------------------------------------------------------------- parts
  // A bench of the kind bolted along the whole embankment: cast ends, wooden slats.
  function bench(cx, cz, ry) {
    const T = { ry, tag: '长椅' };
    for (const s of [-1, 1]) {
      box(cx + Math.cos(ry) * s * .78, .22, cz - Math.sin(ry) * s * .78, .10, .44, .52,
        col.graniteD, { ...T, ...MAT.iron, hard: true, gloss: .24 });
      box(cx + Math.cos(ry) * s * .78, .56, cz - Math.sin(ry) * s * .78 + Math.cos(ry) * .22,
        .09, .50, .10, col.graniteD, { ...T, ...MAT.iron, hard: true, gloss: .24 });
    }
    for (let i = 0; i < 4; i++)
      box(cx, .45, cz - .18 + i * .13, 1.74, .05, .11, col.wood,
        { ...T, ...MAT.timber, mode: 6, gloss: G.wood });
    for (let i = 0; i < 4; i++)
      box(cx, .60 + i * .13, cz + .22, 1.74, .10, .05, col.wood,
        { ...T, ...MAT.timber, mode: 6, gloss: G.wood });
    solid(cx - .95, cx + .95, cz - .36, cz + .34);
    shade(cx, cz, 2.3, 1.2, .24);
  }

  // A cast-iron lamp standard, the twin-globe sort the whole embankment is lit by.
  function lamp(cx, cz) {
    cyl(cx, .16, cz, .26, .32, col.graniteD, { ...MAT.iron, gloss: .26 });
    cyl(cx, 2.10, cz, .09, 3.60, col.charcoal, { ...MAT.iron, gloss: .32 });
    box(cx, 3.94, cz, 1.60, .09, .09, col.charcoal, { ...MAT.iron, hard: true, gloss: .32 });
    for (const s of [-1, 1]) {
      cyl(cx + s * .74, 4.02, cz, .05, .18, col.charcoal, { ...MAT.iron, gloss: .32 });
      litten(ball(cx + s * .74, 4.24, cz, .18, .22, .18, C('#f6f0da'),
        { mode: 1, glow: .10 }), 1.0);
    }
    litten(ball(cx, 4.10, cz, .10, .14, .10, col.charcoal, { ...MAT.iron, gloss: .3 }), 0);
    pool(M.trs(cx, .02, cz, 0, 6.0, 1, 6.0), C('#f2e6c4'), .0, false);
    // The globes above are emissive and light nothing on their own; this is the lamp actually
    // being a lamp. One per standard rather than one per globe — the pair are 1.5 m apart at
    // four metres up and no ground pattern survives that, so a second light would be a slot
    // spent on nothing. Hung just under the crossbar so the pool lands where the glass is.
    // Outdoors the game switches these with the sun (game.js), so nothing here has to.
    B.light(cx, 3.90, cz, [1.00, 0.88, 0.64], 1.00, 5.20);
    solid(cx - .28, cx + .28, cz - .28, cz + .28);
  }

  // One of the 1920s blocks behind the promenade. `f` is the storey count, `top` the crown:
  // 'dome', 'pyramid', 'tower' or nothing. They are all the same building really — a stone base,
  // a run of tall windows, a cornice — and the crown is what tells them apart at this distance.
  function block(cx, w, f, top, tint) {
    const h = 3.0 + f * 3.4, d = FRONT + 7.0;
    const c = tint || col.stone;
    box(cx, h / 2, d, w, h, 14.0, c, { ...MAT.stone, hard: true, mode: 4, gloss: G.matte });
    // The rusticated base, and the ground floor cut into it. Left plain it was a three-metre
    // grey retaining wall with a bank standing on top of it, which is the one thing these
    // buildings are not: every single one of them is a banking hall at pavement level.
    // The base takes the same stone at half the scale, which is what rustication is: the same
    // material cut in bigger, rougher courses than the wall above it.
    box(cx, 1.70, FRONT + .10, w + .30, 3.40, .60, col.graniteD,
      { ...MAT.granite, hard: true, gloss: .20 });
    const nb = Math.max(2, Math.round(w / 2.6));
    for (let i = 0; i < nb; i++) {
      const bx = cx - w / 2 + (i + .5) * (w / nb);
      box(bx, 1.42, FRONT - .18, w / nb - .70, 2.60, .32, col.charcoal,
        { hard: true, gloss: .24 });
      litten(box(bx, 1.36, FRONT - .30, w / nb - .96, 2.30, .10, col.glassD,
        { hard: true, mode: 1, alpha: .78, glow: .05 }), .8);
      // the keystone and sill that make an opening read as an opening
      box(bx, 2.86, FRONT - .22, w / nb - .50, .30, .40, col.graniteL,
        { ...MAT.trim, hard: true, gloss: .22 });
      box(bx, .10, FRONT - .34, w / nb - .50, .20, .60, col.graniteL,
        { ...MAT.trim, hard: true, gloss: .22 });
    }
    // the string course the upper floors sit on
    box(cx, 3.36, FRONT + .02, w + .44, .36, .74, col.graniteL,
      { ...MAT.trim, hard: true, gloss: .22 });
    box(cx, h + .22, FRONT + .10, w + .60, .60, .90, col.graniteL,
      { ...MAT.trim, hard: true, gloss: .22 });
    box(cx, h - .55, FRONT + .10, w + .34, .34, .50, col.graniteL,
      { ...MAT.trim, hard: true, gloss: .22 });
    // windows: a grid on the face the promenade sees
    const nx = Math.max(2, Math.round(w / 2.4));
    for (let i = 0; i < nx; i++) for (let k = 0; k < f; k++) {
      const wx = cx - w / 2 + (i + .5) * (w / nx), wy = 4.6 + k * 3.4;
      box(wx, wy, FRONT - .02, 1.20, 2.10, .12, col.graniteD,
        { ...MAT.trim, hard: true, gloss: .20 });
      litten(box(wx, wy, FRONT - .10, 1.00, 1.90, .06, col.glassD,
        { hard: true, mode: 1, alpha: .82, glow: .04 }), .55);
      box(wx, wy + 1.16, FRONT - .16, 1.34, .16, .22, col.graniteL,
        { ...MAT.trim, hard: true, gloss: .22 });
    }
    if (top === 'dome') {
      cyl(cx, h + 1.30, d - 3.0, 3.40, 1.60, col.graniteL, { ...MAT.trim, hard: true, gloss: .22 });
      ball(cx, h + 2.10, d - 3.0, 3.30, 3.60, 3.30, col.copper, { ...MAT.copper, gloss: .30 });
      cyl(cx, h + 5.60, d - 3.0, .70, 1.20, col.copperD, { ...MAT.copper, gloss: .30 });
      ball(cx, h + 6.40, d - 3.0, .34, .40, .34, col.goldL, { mode: 1, glow: .12 });
    }
    if (top === 'pyramid') {
      // 和平饭店. The green copper pyramid is the whole point of the building.
      box(cx, h + .90, d - 2.6, w * .46, 1.20, 7.0, col.graniteL,
        { ...MAT.trim, hard: true, gloss: .22 });
      taper(cx, h + 4.60, d - 2.6, w * .40, 6.20, 6.20, col.copper, { ...MAT.copper, gloss: .28 });
      cyl(cx, h + 8.30, d - 2.6, .16, 1.60, col.copperD, { ...MAT.copper, gloss: .30 });
    }
    if (top === 'tower') {
      // 海关大楼 and its clock, which keeps the same time as everything else in this game.
      const tz = d - 2.4;
      box(cx, h + 3.20, tz, 5.60, 6.40, 5.60, col.stoneL,
        { ...MAT.stone, hard: true, mode: 4, gloss: G.matte });
      box(cx, h + 6.70, tz, 6.20, .50, 6.20, col.graniteL,
        { ...MAT.trim, hard: true, gloss: .22 });
      box(cx, h + 9.40, tz, 4.60, 5.00, 4.60, col.stoneL,
        { ...MAT.stone, hard: true, mode: 4, gloss: G.matte });
      taper(cx, h + 13.40, tz, 4.40, 3.20, 4.40, col.copper, { ...MAT.copper, gloss: .28 });
      cyl(cx, h + 15.80, tz, .12, 1.80, col.copperD, { ...MAT.copper, gloss: .30 });
      // the dial, on the face the river can see. The bezel is stone; the face behind it is
      // emissive and stays bare — a lit clock is a light, and the one thing on this tower that
      // must not pick up a concrete grain is the thing you read the time off at night.
      const fy = h + 9.40, fz = tz - 2.36;
      cyl(cx, fy, fz, 1.90, .16, col.cream,
        { ...MAT.trim, tag: '钟楼', rx: Math.PI / 2, gloss: .24 });
      litten(cyl(cx, fy, fz - .09, 1.72, .04, C('#f4efdc'),
        { tag: '钟楼', rx: Math.PI / 2, mode: 1, glow: .10 }), .8);
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        box(cx + Math.sin(a) * 1.44, fy + Math.cos(a) * 1.44, fz - .13,
          i % 3 ? .09 : .15, i % 3 ? .26 : .34, .03, col.charcoal,
          { tag: '钟楼', hard: true, rz: -a, mode: 1 });
      }
      clockH = box(cx, fy, fz - .16, .13, 1.00, .04, col.charcoal,
        { tag: '钟楼', hard: true, mode: 1 });
      clockM = box(cx, fy, fz - .18, .09, 1.44, .04, col.charcoal,
        { tag: '钟楼', hard: true, mode: 1 });
      for (const p of [clockH, clockM]) { p.cx0 = cx; p.cy0 = fy; p.cz0 = p.m[14]; }
    }
    blocker(cx - w / 2, cx + w / 2, FRONT, RZ + 4);
    solid(cx - w / 2, cx + w / 2, FRONT, RZ + 4);
  }

  // A tower on the far bank. Everything over there is a silhouette at a hundred metres, so it is
  // a stack of boxes with a spire, and the two that matter get built properly instead.
  function tower(cx, cz, w, h, tint) {
    // Not all one grey. Hashed off the tower's own position, so it is stable and costs nothing:
    // a far bank of eleven identical slabs is a colour swatch, and the Huangpu is the one view
    // in this game that people come to look at.
    const wob = ((Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453) % 1 + 1) % 1;
    const base = tint || col.tower;
    const c = tint ? base : [base[0] * (.88 + wob * .20), base[1] * (.90 + wob * .17),
                             base[2] * (.94 + wob * .12)];
    box(cx, h / 2, cz, w, h, w, c, { hard: true, gloss: .26 });
    // Floors. The glazed face below only comes on after dark, so until the sun went down every
    // tower over there was a blank slab — and it is daytime in this game far more often than it
    // is night. A spandrel band every four metres and a pair of mullions is what turns a slab
    // into sixty storeys of building, and both read at a hundred metres.
    const bands = Math.max(3, Math.min(22, Math.floor(h / 4.2)));
    for (let i = 1; i < bands; i++)
      box(cx, h * i / bands, cz + w / 2 + .10, w * .88, .52, .16, col.towerD,
        { hard: true, gloss: .22 });
    for (const s2 of [-1, 1])
      box(cx + s2 * w * .30, h * .48, cz + w / 2 + .09, .34, h * .90, .14, col.towerD,
        { hard: true, gloss: .24 });
    // The glazed face comes on after dark. Without it the skyline that half of China comes
    // here to look at is a row of black cardboard rectangles at eight in the evening.
    litten(box(cx, h * .55, cz + w / 2 - .1, w * .84, h * .8, .4, col.glassD,
      { hard: true, mode: 1, alpha: .9, glow: .02 }), 1.1);
    box(cx, h + 1.2, cz, w * .5, 2.4, w * .5, c, { hard: true, gloss: .26 });
    litten(cyl(cx, h + 4.2, cz, .5, 4.0, col.steelD, { gloss: .3 }), 0);
    litten(ball(cx, h + 6.4, cz, .8, .8, .8, col.red, { mode: 1, glow: .3 }), 1.4);
  }

  function build() {
    // ================================================================ ground and water
    // The promenade, the road, the pavement. All one plane: the Bund is genuinely raised above
    // the traffic, but this game has no stairs worth the name and a kerb reads well enough.
    // The promenade is laid in real granite setts, so `paving` goes on at a sett-sized repeat.
    // mode 9's own metre slabs stay underneath it: the mode gives the big joints and the
    // slab-to-slab tone, the material gives the stone inside each one.
    flat(0, 0, 3.0, RX * 2 + 20, 22.0, col.pave,
      { ...MAT.paving, mode: 9, gloss: .22 });
    flat(0, .004, (ROAD[0] + ROAD[1]) / 2, RX * 2 + 20, ROAD[1] - ROAD[0], col.road,
      { ...MAT.road, mode: 10, gloss: .24 });
    for (const z of ROAD)
      box(0, .07, z, RX * 2 + 20, .16, .30, col.kerb, { ...MAT.granite, hard: true, gloss: .24 });
    for (let i = -26; i <= 26; i++)
      flat(i * 2.4, .008, (ROAD[0] + ROAD[1]) / 2, 1.30, .16, col.line, { gloss: .18 });
    // the paving of the promenade itself, laid in bands the length of the embankment
    for (let i = -3; i <= 4; i++)
      flat(0, .006, -2.2 + i * 1.15, RX * 2 + 16, .10, col.paveD, { gloss: .18 });

    // 黄浦江. Brown-green and moving, and wide enough that the far bank is scenery.
    flat(0, -.10, (WALL + FAR) / 2, RX * 2 + 160, Math.abs(FAR - WALL) + 10, col.water,
      { mode: 16, gloss: .62 });
    for (let i = 0; i < 13; i++) {
      const wz = WALL - 9 - i * 8.0;
      flat((i % 2 ? 1 : -1) * 12, -.08 + i * .0012, wz, RX * 2 + 90, 1.10 + (i % 3) * .6,
        col.waterL, { mode: 10, gloss: .70, alpha: .26 });
    }

    // 情侣墙 the parapet. The reason everybody on the Bund is standing in a line facing the same
    // way: there is one wall, and it is the right height to lean on.
    box(0, .58, WALL, RX * 2 + 12, 1.16, .56, col.granite,
      { ...MAT.granite, tag: '情侣墙', gloss: .24 });
    box(0, 1.20, WALL, RX * 2 + 12, .14, .78, col.graniteL,
      { ...MAT.trim, tag: '情侣墙', hard: true, gloss: .28 });
    for (let i = -20; i <= 20; i++)
      box(i * 1.5, .58, WALL - .30, .16, 1.10, .06, col.graniteD,
        { ...MAT.granite, tag: '情侣墙', hard: true, gloss: .20 });
    solid(-RX - 6, RX + 6, WALL - .5, WALL + .40);
    thing('情侣墙', 0, 1.55, WALL + .30, '大家都靠在墙上看江。',
      'Everybody is leaning on the wall, looking at the river.',
      '情侣 sweethearts + 墙 wall. It got the name in the eighties, when this was the only ' +
      'place in the city two people could stand together.',
      { focus: [0, WALL + 1.60], reach: 4.0 });

    // ================================================================ 浦东 the far bank
    // Everything from here on is beyond the water and only ever seen across it.
    skyProp = box(0, 60.0, FAR - 30.0, 420, 130, .4, [...DAYSKY],
      { hard: true, mode: 1, glow: .06 });
    flat(0, .02, FAR - 6.0, 420, 26.0, C('#5f6a6d'), { mode: 9, gloss: .18 });
    box(0, 1.60, FAR + 1.0, 420, 3.20, 3.00, col.graniteD, { hard: true, gloss: .22 });

    // 东方明珠. Three splayed legs, a big sphere, a smaller one above it, a spire. There is no
    // other building shaped like this and it is the reason the view is famous.
    const PX = 8.0, PZ = FAR - 8.0;
    // Three legs from a wide base converging under the big sphere, then one column above it.
    // Run straight up they went through the ball and out the top, which turns the one building
    // everybody can draw from memory into a beach ball on a stick.
    const LEGB = 7.2, LEGT = 1.6, LEGH = 26.0;
    const legTilt = Math.atan2(LEGB - LEGT, LEGH);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.0944 + .5, r = (LEGB + LEGT) / 2;
      capsule(PX + Math.sin(a) * r, LEGH / 2, PZ + Math.cos(a) * r, 1.9, LEGH + 2.0, 1.9,
        // The tilt leans the *top* inwards, so the sign is the opposite of the base offset.
        // The other way round gives a tripod standing on its point with its feet in the air,
        // which is what this was: measured, the legs met the ground at r 1.5 and the sphere
        // at r 7.3.
        col.pearlPost, { tag: '东方明珠',
                         rx: -Math.cos(a) * legTilt, rz: Math.sin(a) * legTilt, gloss: .34 });
      // the splayed foot each leg lands on
      cyl(PX + Math.sin(a) * LEGB, .8, PZ + Math.cos(a) * LEGB, 2.4, 1.6, col.graniteL,
        { tag: '东方明珠', gloss: .26 });
    }
    ball(PX, 30.0, PZ, 9.4, 9.4, 9.4, col.pearl, { tag: '东方明珠', gloss: .30 });
    cyl(PX, 30.0, PZ, 9.6, 1.4, col.pearlD, { tag: '东方明珠', gloss: .30 });
    capsule(PX, 48.0, PZ, 3.0, 26.0, 3.0, col.pearlPost, { tag: '东方明珠', gloss: .34 });
    ball(PX, 62.0, PZ, 5.6, 5.6, 5.6, col.pearl, { tag: '东方明珠', gloss: .30 });
    ball(PX, 74.0, PZ, 2.6, 2.6, 2.6, col.pearlD, { tag: '东方明珠', gloss: .30 });
    capsule(PX, 86.0, PZ, .9, 22.0, .9, col.steelD, { tag: '东方明珠', gloss: .36 });
    litten(ball(PX, 97.5, PZ, .9, .9, .9, col.red, { tag: '东方明珠', mode: 1, glow: .4 }), 1.6);
    for (let i = 0; i < 3; i++)
      litten(box(PX, 30.0 - 9 + i * 9, PZ - 9.2, 12.0, .5, .5, col.goldL,
        { tag: '东方明珠', hard: true, mode: 1, glow: .12 }), 1.5);
    thing('东方明珠', PX, 30.0, PZ + 9.6, '东方明珠就在对面。',
      'The Oriental Pearl is right across the water.',
      '东方 the East + 明珠 a bright pearl. It went up in 1994 and it is what everyone ' +
      'photographs.',
      { focus: [PX * .3, WALL + 1.80], reach: 8.0 });

    // 金茂大厦. Tiers stepping in as it rises, then a spire — the other one people know.
    const JX = 22.0, JZ = FAR - 14.0;
    for (let i = 0; i < 9; i++) {
      const w = 13.0 - i * 1.05, y = 4.0 + i * 8.6;
      box(JX, y, JZ, w, 8.6, w, col.towerD, { tag: '金茂大厦', hard: true, gloss: .30 });
      box(JX, y + 4.3, JZ, w + .8, .6, w + .8, col.steel,
        { tag: '金茂大厦', hard: true, gloss: G.metal });
      litten(box(JX, y, JZ - w / 2 + .1, w * .8, 7.4, .4, col.glassD,
        { tag: '金茂大厦', hard: true, mode: 1, alpha: .9, glow: .03 }), 1.0);
    }
    capsule(JX, 90.0, JZ, 1.1, 18.0, 1.1, col.steel, { tag: '金茂大厦', gloss: .40 });
    litten(ball(JX, 100.0, JZ, .8, .8, .8, col.red, { tag: '金茂大厦', mode: 1, glow: .4 }), 1.6);
    thing('金茂大厦', JX, 40.0, JZ + 8.0, '金茂大厦，八十八层。',
      'The Jin Mao Tower. Eighty-eight floors.',
      '金 gold + 茂 flourishing + 大厦 a tower block. 层 is a storey.',
      { focus: [12.0, WALL + 1.80], reach: 8.0 });

    // the two globes of the conference centre, and a wall of lesser towers behind everything
    for (const s of [-1, 1])
      ball(-8.0 + s * 6.0, 9.0, FAR - 4.0, 6.0, 6.0, 6.0, col.glassT, { gloss: .40 });
    box(-8.0, 4.0, FAR - 4.0, 22.0, 8.0, 10.0, col.stoneL, { hard: true, gloss: .26 });
    for (let i = 0; i < 16; i++) {
      const tx = -80 + i * 11.0 + (rnd() - .5) * 4;
      if (Math.abs(tx - PX) < 14 || Math.abs(tx - JX) < 12) continue;
      tower(tx, FAR - 16 - rnd() * 22, 7 + rnd() * 5, 26 + rnd() * 44,
        pick([col.tower, col.towerD, col.glassT]));
    }

    // boats: a ferry crossing, a barge train, and a tourist boat lit up
    function boat(bx, bz, len, wide, tall, c, deck, speed) {
      const parts = [], add = p => { parts.push(p); return p; };
      add(box(bx, tall * .35, bz, len, tall * .7, wide, c, { gloss: .28 }));
      // The prow: a wedge narrowing to the bow. Built as a taper laid on its side it came out
      // as a cone the width of the hull stuck on the end, which read as a barge with a nose.
      for (let i = 0; i < 4; i++)
        add(box(bx + len / 2 + i * wide * .16, tall * .35, bz,
          wide * .18, tall * .7 - i * tall * .06, wide * (.9 - i * .22), c, { gloss: .28 }));
      if (deck) {
        add(box(bx - len * .1, tall * 1.05, bz, len * .5, tall * .7, wide * .8, col.white,
          { hard: true, gloss: .26 }));
        add(litten(box(bx - len * .1, tall * 1.15, bz - wide * .42,
          len * .44, tall * .3, .2, C('#f2e8c8'),
          { hard: true, mode: 1, glow: .18 }), 1.2));
      }
      add(box(bx, tall * .72, bz, len + .4, .22, wide + .3, col.redD,
        { hard: true, gloss: .24 }));
      // Each vessel travels well past both ends of the promenade. One broad packed sphere keeps
      // the distant group visible across that route without touching the per-frame cull arrays.
      boats.push({ parts: movingGroup(parts, 0, tall, bz, 78), x0: bx, speed,
        phase: boats.length * 1.71 });
    }
    boat(-14.0, FAR + 42.0, 16.0, 5.0, 4.0, col.white, true, 1.05);
    boat(26.0, FAR + 60.0, 22.0, 6.0, 3.4, col.charcoal, false, .72);
    boat(-38.0, FAR + 22.0, 26.0, 7.0, 3.0, col.graniteD, false, .54);

    // ================================================================ the promenade
    for (let i = -6; i <= 6; i++) lamp(i * 4.6, PROM[0] + .40);
    for (const bx of [-26, -21, -16, -6, -1, 4, 14, 19, 24])
      bench(bx, 2.20, Math.PI);
    for (const bx of [-23.5, -3.5, 16.5]) bench(bx, 4.40, 0);
    thing('长椅', 4.0, .95, 1.60, '坐下来看看江。', 'Sit down and watch the river a while.',
      '长 long + 椅 chair. 坐 is to sit.',
      { focus: [4.0, 1.30], reach: 2.0 });

    // planters of clipped box, the way the whole embankment is divided up
    for (const px of [-19, -9, 1, 11, 21]) {
      box(px, .28, 5.20, 4.60, .56, 1.20, col.stoneD, { ...MAT.granite, gloss: .22 });
      box(px, .56, 5.20, 4.70, .08, 1.28, col.graniteL, { ...MAT.trim, hard: true, gloss: .26 });
      for (let i = 0; i < 8; i++)
        ball(px - 2.0 + i * .58, .74, 5.20 + (i % 2 - .5) * .28, .24, .20, .24,
          i % 2 ? col.leaf : col.leafD, { gloss: .12, mode: 15 });
      solid(px - 2.3, px + 2.3, 4.6, 5.8);
      shade(px, 5.20, 5.4, 2.0, .22);
    }

    // ================================================================ 轮渡 the ferry pier
    // At the north end, sticking out over the water. You cannot get on it — it is somewhere for
    // the river to have traffic and for the word to live.
    const FX = -26.5;
    box(FX, .30, WALL - 5.0, 7.00, .50, 10.0, col.wood,
      { ...MAT.deck, tag: '轮渡', mode: 6, gloss: G.wood });
    for (const s of [-1, 1]) {
      for (let i = 0; i < 6; i++)
        cyl(FX + s * 3.3, -.20, WALL - 1.0 - i * 1.8, .16, 1.60, col.trunk,
          { ...MAT.timber, tag: '轮渡', gloss: G.wood });
      for (let i = 0; i < 6; i++)
        capsule(FX + s * 3.3, .95, WALL - 1.0 - i * 1.8, .05, 1.10, .05, col.steelD,
          { tag: '轮渡', gloss: G.metal });
      capsule(FX + s * 3.3, 1.44, WALL - 5.0, .045, 9.6, .045, col.steelD,
        { tag: '轮渡', rx: Math.PI / 2, gloss: G.metal });
    }
    box(FX, 1.90, WALL - 9.6, 6.40, 2.80, 3.20, col.white,
      { ...MAT.trim, tag: '轮渡', gloss: .26 });
    // The ticket hall on the end of the pier, lit all evening because the last boat is late.
    B.light(FX, 2.90, WALL - 8.2, [0.98, 0.94, 0.82], .70, 5.00);
    box(FX, 3.50, WALL - 9.6, 6.80, .40, 3.60, col.redD, { tag: '轮渡', hard: true, gloss: .24 });
    for (const g of glyphs(FX, 2.90, WALL - 8.0, 0, '轮渡',
      { size: .40, gap: .12, color: col.white, mode: 1, tag: '轮渡' })) litten(g, .9);
    boat(FX + 1.0, WALL - 15.0, 14.0, 5.2, 3.6, C('#3f6f8a'), true);
    solid(FX - 3.6, FX + 3.6, WALL - 10.0, WALL);
    thing('轮渡', FX, 2.20, WALL + .60, '轮渡两块钱过江。',
      'The ferry across is two kuai.',
      '轮 a wheel, a steamer + 渡 to cross water. 过江 is to cross the river.',
      { focus: [FX, WALL + 2.20], reach: 3.0 });

    // ================================================================ 小吃摊 the food stall
    // A cart with a steamer stack on it, which is where 小笼包 come from and the reason you can
    // be away from home for two days without starving.
    const SX = -12.0, SZ = 3.60;
    box(SX, .58, SZ, 2.80, .16, 1.30, col.steelD,
      { ...MAT.iron, tag: '小吃摊', hard: true, gloss: G.metal });
    for (const [ox, oz] of [[-1.20, -.52], [1.20, -.52], [-1.20, .52], [1.20, .52]])
      cyl(SX + ox, .26, SZ + oz, .05, .52, col.steelD, { tag: '小吃摊', gloss: G.metal });
    for (const [ox, oz] of [[-1.20, -.52], [1.20, .52]])
      cyl(SX + ox, .07, SZ + oz, .09, .07, col.black, { tag: '小吃摊', rz: Math.PI / 2 });
    // the steamer stack, and the steam coming off it
    for (let i = 0; i < 5; i++)
      cyl(SX - .80, .74 + i * .19, SZ, .38, .18, C('#c8a878'),
        { ...MAT.timber, tag: '小吃摊', mode: 6, gloss: .18 });
    cyl(SX - .80, 1.72, SZ, .40, .10, C('#b09262'),
      { ...MAT.timber, tag: '小吃摊', mode: 6, gloss: .18 });
    for (let i = 0; i < 4; i++)
      litten(ball(SX - .80 + (rnd() - .5) * .3, 1.95 + i * .34, SZ + (rnd() - .5) * .3,
        .26 + i * .08, .20 + i * .06, .26 + i * .08, C('#e8e8e4'),
        { tag: '小吃摊', mode: 1, alpha: .16 - i * .03, glow: .05 }), 0);
    // the griddle for 生煎, the sauce bottles and the stack of bowls
    cyl(SX + .90, .70, SZ, .46, .10, col.charcoal, { tag: '小吃摊', gloss: .30 });
    for (let i = 0; i < 7; i++)
      ball(SX + .70 + (i % 4) * .13, .78, SZ - .16 + ((i / 4) | 0) * .18, .075, .06, .075,
        C('#e4d8bc'), { tag: '小吃摊', gloss: .20 });
    for (let i = 0; i < 3; i++)
      cyl(SX + 1.30, .76, SZ - .34 + i * .22, .045, .22, [col.redD, col.charcoal, col.gold][i],
        { tag: '小吃摊', gloss: .30 });
    // the awning over it, on two poles
    for (const s of [-1, 1])
      cyl(SX + s * 1.35, 1.30, SZ + .60, .035, 2.60, col.steelD,
        { tag: '小吃摊', gloss: G.metal });
    box(SX, 2.62, SZ + .10, 3.20, .10, 1.90, col.awning,
      { ...MAT.canvas, tag: '小吃摊', hard: true, gloss: .18 });
    box(SX, 2.42, SZ - .84, 3.20, .34, .08, col.awning,
      { ...MAT.canvas, tag: '小吃摊', hard: true, gloss: .18 });
    // The bare bulb under the awning. Short radius on purpose: it should be the brightest thing
    // within two metres of the steamers and contribute nothing at all to the promenade, so it
    // only ever takes a light slot from someone standing at the counter.
    B.light(SX, 2.34, SZ + .05, [1.00, 0.82, 0.52], .80, 3.00);
    for (const g of glyphs(SX, 2.42, SZ - .90, Math.PI, '小笼包 生煎',
      { size: .19, gap: .05, color: col.goldL, mode: 1, tag: '小吃摊' })) litten(g, .8);
    solid(SX - 1.6, SX + 1.6, SZ - .8, SZ + .8);
    shade(SX, SZ, 3.6, 2.4, .24);
    thing('小吃摊', SX, 1.60, SZ - 1.10, '两笼小笼包，一碗汤。',
      'Two baskets of xiaolongbao and a bowl of soup.',
      '小吃 snacks + 摊 a stall. 笼 is the measure for a steamer basket.',
      { focus: [SX, SZ - 1.90], reach: 2.0 });

    // ================================================================ 公共厕所
    // A brick pavilion at the south end of the promenade, because two days is two days.
    const TX = 27.0, TZ = 4.20;
    box(TX, 1.55, TZ, 5.20, 3.10, 3.40, col.stoneD,
      { ...MAT.brick, tag: '公共厕所', hard: true, mode: 4 });
    box(TX, 3.24, TZ, 5.60, .28, 3.80, col.graniteL,
      { ...MAT.trim, tag: '公共厕所', hard: true, gloss: .22 });
    taper(TX, 3.80, TZ, 5.20, .90, 3.40, col.copper,
      { ...MAT.copper, tag: '公共厕所', gloss: .26 });
    for (const [ox, ch, c] of [[-1.20, '男', C('#7fb8e0')], [1.20, '女', C('#e08fa8')]]) {
      box(TX + ox, 1.10, TZ - 1.72, 1.10, 2.20, .12, col.charcoal,
        { tag: '公共厕所', hard: true, gloss: .24 });
      for (const g of glyphs(TX + ox, 2.52, TZ - 1.80, Math.PI, ch,
        { size: .26, gap: 0, color: c, mode: 1, tag: '公共厕所' })) litten(g, .8);
    }
    box(TX, 3.00, TZ - 1.76, 3.20, .44, .10, col.blueSign,
      { tag: '公共厕所', hard: true, gloss: .24 });
    for (const g of glyphs(TX, 3.00, TZ - 1.83, Math.PI, '公共厕所',
      { size: .20, gap: .05, color: col.white, mode: 1, tag: '公共厕所' })) litten(g, .9);
    solid(TX - 2.7, TX + 2.7, TZ - 1.8, TZ + 1.8);
    shade(TX, TZ, 6.4, 4.6, .28);
    thing('公共厕所', TX, 1.70, TZ - 2.10, '外滩上有公共厕所，排队。',
      'There are public toilets on the Bund. There is a queue.',
      '公共 public + 厕所 toilet. 排队 is to queue, which you will.',
      { focus: [TX, TZ - 2.90], reach: 2.2 });

    // ================================================================ 照相 the photographer
    // A man with a tripod and a printed board of sample shots, who will take your picture with
    // the towers behind you for twenty kuai and send it to your phone. There used to be one of
    // these every thirty metres; the few who are left are the ones with a better camera than
    // yours and the patience to wait for the light.
    const CX = 2.30, CZ = -1.20;
    for (let i = 0; i < 3; i++) {
      const a = i * 2.0944 + .3;
      cyl(CX + Math.sin(a) * .30, .58, CZ + Math.cos(a) * .30, .022, 1.16, col.charcoal,
        { tag: '照相', rx: Math.cos(a) * .22, rz: -Math.sin(a) * .22, gloss: .30 });
    }
    box(CX, 1.28, CZ, .26, .18, .30, col.charcoal, { tag: '照相', hard: true, gloss: .34 });
    cyl(CX, 1.28, CZ - .20, .08, .16, col.black, { tag: '照相', rx: Math.PI / 2, gloss: .40 });
    box(CX + 1.10, 1.00, CZ + .20, .90, 1.30, .06, col.white,
      { tag: '照相', hard: true, ry: -.5, gloss: .20 });
    for (let i = 0; i < 6; i++)
      box(CX + 1.10 - Math.cos(.5) * (.28 - (i % 2) * .56) * .5, 1.36 - ((i / 2) | 0) * .38,
        CZ + .18 + Math.sin(.5) * .3, .34, .28, .02,
        [col.blue, col.jade, col.sand][i % 3], { tag: '照相', hard: true, ry: -.5, mode: 1 });
    for (const g of glyphs(CX + 1.10, 1.74, CZ + .16, -.5 + Math.PI, '照相 20元',
      { size: .13, gap: .03, color: col.redD, mode: 1, tag: '照相' })) litten(g, .4);
    thing('照相', CX, 1.50, CZ - .40, '给我照一张，把东方明珠照进去。',
      'Take one of me with the Pearl in it.',
      '照相 to take a photograph + 相机 a camera. 一张 is the measure for a photo.',
      { focus: [CX, CZ - .70], reach: 2.2 });

    // ================================================================ the road
    for (let i = -4; i <= 4; i++) {
      const cx = i * 7.0 + 2.0, cz = (ROAD[0] + ROAD[1]) / 2 + (i % 2 ? -1.0 : 1.0);
      const c = pick([C('#c4c8cc'), C('#2f343b'), C('#7a1f1f'), C('#3a5570'), col.yellow]);
      const parts = [], add = p => { parts.push(p); return p; };
      add(box(cx, .62, cz, 4.30, .70, 1.76, c, { gloss: .40 }));
      add(box(cx - .20, 1.18, cz, 2.30, .52, 1.62, C('#2a3038'),
        { hard: true, mode: 1, alpha: .85, gloss: .5 }));
      for (const [ox, oz] of [[-1.5, -.86], [1.5, -.86], [-1.5, .86], [1.5, .86]])
        add(cyl(cx + ox, .30, cz + oz, .30, .22, col.black,
          { rz: Math.PI / 2, gloss: .24 }));
      shade(cx, cz, 5.0, 2.4, .30);
      const shadow = B.shadows[B.shadows.length - 1];
      traffic.push({ parts: movingGroup(parts, 0, .75, cz, 47), x0: cx,
        speed: 2.65 + (i + 4) * .11, dir: i % 2 ? 1 : -1,
        shadow, shadow0: new Float32Array(shadow.m) });
    }
    // the zebra crossing you are supposed to use, opposite the hotel
    for (let i = 0; i < 9; i++)
      flat(6.6 + i * .62, .009, (ROAD[0] + ROAD[1]) / 2, .38, ROAD[1] - ROAD[0] - .2,
        col.line, { gloss: .18 });

    // ================================================================ 万国建筑 the banks
    // The row behind you. Five blocks, and the three with crowns on them are the three anybody
    // can name: the customs house with its clock, the old bank with its dome, and 和平饭店.
    block(-24.0, 14.0, 4, 'dome', col.granite);
    block(-8.0, 16.0, 5, 'tower', col.stoneL);
    block(6.0, 12.0, 4, null, col.stone);
    block(18.0, 13.0, 5, 'pyramid', col.granite);
    block(30.0, 12.0, 4, null, col.stoneL);
    for (let i = -3; i <= 3; i++)
      if (Math.abs(i) > 0) block(i * 46.0, 26.0, 4, null, pick([col.stone, col.granite]));
    // Floodlighting on the bank row. Since 1989 the whole 万国建筑 line has been washed amber
    // after dark and it is half of why anyone stands on this pavement at night — the towers
    // opposite are the postcard, but the thing immediately behind you is lit too.
    //
    // Set out over the kerb rather than tight against the stone. A point light hard up against a
    // facade puts its whole cone into the pavement: every direction from it to the wall above is
    // nearly straight up, so dot(n, dir) collapses and the storeys stay black however much power
    // it is given. Standing it two metres off and four metres up buys an angle the wall can
    // actually catch, and the spill onto the road is what a floodlit street looks like anyway.
    // One per named block; the filler blocks off at ±46 m and beyond are past the fog and get
    // nothing, which also keeps them from ever winning a slot from the promenade.
    for (const lx of [-24.0, -8.0, 6.0, 18.0, 30.0])
      B.light(lx, 4.10, KERB - .80, [1.00, 0.86, 0.60], .90, 9.00);
    thing('钟楼', -8.0, 24.0, FRONT - .60, '海关钟楼上的钟，走得很准。',
      'The clock on the customs house keeps good time.',
      '钟 a clock + 楼 a building. 海关 is customs. It has chimed on the hour since 1927.',
      { focus: [-8.0, 10.90], reach: 5.0 });
    thing('万国建筑', 6.0, 12.0, FRONT - .60, '外滩这一排叫万国建筑博览群。',
      'This row is called the exhibition of the world\'s architecture.',
      '万国 ten thousand nations + 建筑 buildings. Every one of them was a bank or a shipping ' +
      'line.',
      { focus: [6.0, 10.90], reach: 3.4 });

    // ---- 南京路 street-name signs (gatehouse plaque style)
    box(14.0, 2.20, FRONT - .05, .50, .80, .06, col.blueSign,
      { hard: true, gloss: .28, tag: '南京路' });
    for (const g of glyphs(14.0, 2.20, FRONT - .08, Math.PI, '南京路',
      { size: .22, gap: .10, color: col.cream, mode: 1, tag: '南京路', vertical: true })) litten(g, .9);
    cyl(16.0, 1.60, KERB + .30, .05, 3.20, col.steelD, { tag: '南京路', gloss: .32 });
    box(16.0, 2.80, KERB + .24, .80, .40, .08, col.blueSign,
      { tag: '南京路', hard: true, gloss: .28 });
    for (const g of glyphs(16.0, 2.80, KERB + .20, Math.PI, '南京路',
      { size: .24, gap: .08, color: col.white, mode: 1, tag: '南京路' })) litten(g, .9);

    // ---- 和平饭店 the hotel, in the block with the pyramid on it. 饭店 is a hotel as often as
    // it is a restaurant, which is a thing worth learning the hard way at ten at night.
    const HX = 18.0;
    box(HX, 2.20, FRONT - .30, 5.20, 4.40, .70, col.graniteD,
      { ...MAT.granite, tag: '和平饭店', hard: true, gloss: .24 });
    box(HX, 1.35, FRONT - .70, 3.40, 2.70, .30, col.charcoal,
      { tag: '和平饭店', hard: true, gloss: .30 });
    for (const s of [-1, 1])
      box(HX + s * .85, 1.35, FRONT - .78, 1.50, 2.60, .06, col.glassD,
        { tag: '和平饭店', hard: true, mode: 1, alpha: .5, glow: .06 });
    for (const s of [-1, 1])
      cyl(HX + s * 2.10, 1.60, FRONT - 1.90, .13, 3.20, col.chrome,
        { tag: '和平饭店', gloss: G.metal });
    box(HX, 3.28, FRONT - 1.90, 5.00, .18, 2.40, col.copper,
      { ...MAT.copper, tag: '和平饭店', hard: true, gloss: .28 });
    box(HX, 4.70, FRONT - .34, 5.60, .90, .16, col.charcoal,
      { tag: '和平饭店', hard: true, gloss: .26 });
    for (const g of glyphs(HX, 4.70, FRONT - .43, Math.PI, '和平饭店',
      { size: .34, gap: .12, color: col.goldL, mode: 1, tag: '和平饭店' })) litten(g, .95);
    litten(box(HX, 3.16, FRONT - 1.98, 4.20, .06, .10, C('#f2e0b0'),
      { tag: '和平饭店', hard: true, mode: 1, glow: .24 }), 1.2);
    // The strip above the canopy has always glowed; now it lands on the carpet and the doorman.
    B.light(HX, 3.00, FRONT - 2.10, [1.00, 0.90, 0.70], .85, 4.20);
    // the doorman's red carpet down the steps
    flat(HX, .012, FRONT - 2.90, 3.20, 2.60, col.redD,
      { ...MAT.canvas, mode: 7, gloss: G.fabric });
    solid(HX - 2.7, HX + 2.7, FRONT - 1.05, FRONT);
    thing('和平饭店', HX, 2.40, FRONT - 2.20, '和平饭店，一晚上多少钱？',
      'The Peace Hotel. How much for a night?',
      '和平 peace + 饭店 hotel — 饭店 is a hotel as often as a restaurant. 住 is to stay, ' +
      '一晚上 one night.',
      { focus: [HX, 10.90], reach: 2.8 });

    // ---- 民航售票处 the airline office, two doors down. Everything it used to do happens on a
    // phone now, and it is still open: a counter, a queue of people who would rather ask somebody,
    // and a window full of fares nobody has updated. It is the oldest thing on this pavement that
    // is not a bank.
    const MX = 25.0;
    box(MX, 1.90, FRONT - .28, 4.60, 3.80, .60, col.stoneD,
      { ...MAT.granite, tag: '民航售票处', hard: true, gloss: .22 });
    box(MX, 1.60, FRONT - .66, 3.60, 2.60, .20, col.glassD,
      { tag: '民航售票处', hard: true, mode: 1, alpha: .55, glow: .05 });
    box(MX - 1.50, 1.20, FRONT - .70, .90, 2.30, .16, col.charcoal,
      { tag: '民航售票处', hard: true, gloss: .28 });
    box(MX, 3.94, FRONT - .30, 4.80, .74, .16, col.blueSign,
      { tag: '民航售票处', hard: true, gloss: .26 });
    for (const g of glyphs(MX, 3.94, FRONT - .39, Math.PI, '民航售票处',
      { size: .26, gap: .08, color: col.white, mode: 1, tag: '民航售票处' })) litten(g, .95);
    litten(box(MX + .90, 1.90, FRONT - .68, 1.30, .90, .04, C('#8fbcd4'),
      { tag: '民航售票处', hard: true, mode: 1, glow: .16 }), .6);
    solid(MX - 2.4, MX + 2.4, FRONT - .70, FRONT);
    thing('民航售票处', MX, 2.20, FRONT - 1.00, '我来确认一下回程。',
      "I've come to reconfirm my return.",
      '民航 civil aviation + 售票处 ticket office. 回程 the return leg, 确认 to confirm.',
      { focus: [MX, 10.90], reach: 2.8 });

    // ---- 机场大巴 the airport coach, at the south end. The way home.
    const BX = -22.0, BZ = KERB - .40;
    box(BX, 1.70, BZ + .30, .14, 3.40, .14, col.steelD, { tag: '机场大巴', gloss: G.metal });
    box(BX, 2.90, BZ, 2.40, 1.10, .12, col.blueSign, { tag: '机场大巴', hard: true, gloss: .26 });
    for (const g of glyphs(BX, 3.10, BZ - .08, Math.PI, '机场大巴',
      { size: .21, gap: .06, color: col.white, mode: 1, tag: '机场大巴' })) litten(g, .9);
    for (const g of glyphs(BX, 2.72, BZ - .08, Math.PI, '虹桥 浦东',
      { size: .14, gap: .04, color: C('#a8c4e0'), mode: 1, tag: '机场大巴' })) litten(g, .6);
    box(BX + 2.60, .45, BZ + .10, 2.60, .10, .48, col.wood,
      { tag: '机场大巴', mode: 6, gloss: G.wood });
    for (const s of [-1, 1])
      box(BX + 2.60 + s * 1.10, .22, BZ + .10, .10, .44, .40, col.steelD,
        { tag: '机场大巴', hard: true, gloss: G.metal });
    // the coach itself, waiting at the stop
    const cz = (ROAD[0] + ROAD[1]) / 2 + .15;
    box(BX - 1.0, 1.60, cz, 11.0, 2.40, 2.60, C('#e8e4d8'), { tag: '机场大巴', gloss: .32 });
    box(BX - 1.0, 2.20, cz - 1.32, 10.4, 1.10, .10, C('#2a3038'),
      { tag: '机场大巴', hard: true, mode: 1, alpha: .85 });
    box(BX - 1.0, 1.10, cz, 11.1, .50, 2.66, col.blue, { tag: '机场大巴', hard: true, gloss: .30 });
    box(BX - 1.0, 3.00, cz, 10.6, .40, 2.40, C('#d8d4c8'), { tag: '机场大巴', hard: true });
    for (const ox of [-4.0, 3.2])
      cyl(BX - 1.0 + ox, .42, cz, .44, .30, col.black,
        { tag: '机场大巴', rz: Math.PI / 2, gloss: .22 });
    litten(box(BX - 5.9, 2.30, cz - 1.0, .30, .40, .90, col.charcoal,
      { tag: '机场大巴', hard: true, mode: 1, glow: .1 }), .6);
    shade(BX - 1.0, cz, 12.5, 4.0, .32);
    solid(BX - 6.6, BX + 4.6, cz - 1.35, cz + 1.35);
    thing('机场大巴', BX, 2.00, BZ - .60, '机场大巴，回北京。',
      'The airport coach. Time to go home.',
      '机场 airport + 大巴 a coach. 回 is to return, 北京 is where you live.',
      { focus: [BX, 11.20], reach: 3.0 });

    // ================================================================ 外滩 itself
    // The word for the place, on the granite at the top of the steps, and the one action that
    // is just standing here and looking at it.
    for (const g of glyphs(-2.0, .40, 5.86, Math.PI, '外滩',
      { size: .46, gap: .18, color: col.graniteD, mode: 1 })) litten(g, .2);
    thing('外滩', -2.0, 1.70, WALL + 2.20, '外滩的风景，白天晚上不一样。',
      'The Bund looks like two different places by day and by night.',
      '外 outer + 滩 a shore, a mudflat — it was a towpath before it was this. 风景 is scenery.',
      { focus: [-2.0, WALL + 3.20], reach: 4.0 });
    thing('黄浦江', 12.0, 1.20, WALL - 1.00, '黄浦江上船很多。',
      'The Huangpu is busy with shipping.',
      '黄 yellow + 浦 a riverbank + 江 a great river. 船 is a boat.',
      { focus: [12.0, WALL + 1.60], reach: 3.6 });
  }

  build();

  // Shipping is the scale cue for the Huangpu and traffic is the scale cue for the Bund road.
  // Both loop beyond the authored scene ends, where the fog and buildings hide the wrap. Their
  // shadows travel with them; neither set owns colliders or interaction state.
  function tick(t) {
    for (const q of boats) {
      const raw = q.x0 + t * q.speed;
      const x = -70 + ((raw + 70) % 140 + 140) % 140;
      const dx = x - q.x0, bob = Math.sin(t * .34 + q.phase) * .035;
      for (const part of q.parts) {
        part.p.m[12] = part.m0[12] + dx;
        part.p.m[13] = part.m0[13] + bob;
        part.p.m[14] = part.m0[14];
        if (part.ob) { part.p.ob.x = part.ob.x + dx; part.p.ob.y = part.ob.y + bob; }
      }
    }
    for (const q of traffic) {
      const raw = q.x0 + q.dir * t * q.speed;
      const x = -43 + ((raw + 43) % 86 + 86) % 86, dx = x - q.x0;
      for (const part of q.parts) {
        part.p.m[12] = part.m0[12] + dx;
        part.p.m[13] = part.m0[13];
        part.p.m[14] = part.m0[14];
        if (part.ob) part.p.ob.x = part.ob.x + dx;
      }
      q.shadow.m[12] = q.shadow0[12] + dx;
      q.shadow.m[13] = q.shadow0[13]; q.shadow.m[14] = q.shadow0[14];
    }
  }

  // ---------------------------------------------------------------- the customs clock
  // Real hands on a real dial, driven off the same minute count as the HUD. A painted clock on
  // the one building in Shanghai famous for keeping time would be a poor joke.
  function setClock(mins) {
    if (!clockH) return;
    const m = ((mins % 720) + 720) % 720;
    for (const [p, a, len, w] of [[clockH, m / 720 * Math.PI * 2, 1.00, .13],
                                  [clockM, (m % 60) / 60 * Math.PI * 2, 1.44, .09]]) {
      p.m = M.mul(M.trans(p.cx0 + Math.sin(a) * len / 2, p.cy0 + Math.cos(a) * len / 2, p.cz0),
        M.mul(M.rotZ(-a), M.scale(w, len, .04)));
      p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    }
  }

  function setNight(k) {
    const soft = k * k * (3 - 2 * k);
    for (const { p, k: kk } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) + soft * kk * .34;
    // The haze behind Pudong is emissive, so nothing else will darken it: painted day-sky grey
    // it stayed day-sky grey at eleven at night, behind a lit skyline.
    if (skyProp) for (let i = 0; i < 3; i++)
      skyProp.color[i] = DAYSKY[i] + (NIGHTSKY[i] - DAYSKY[i]) * soft;
    // The Bund at night is the reason people come, so the embankment lamps and the towers
    // opposite actually put light on the ground rather than only glowing at you.
    for (const g of pools) g.a = g.a0 + soft * .16;
  }

  return B.finish({
    setNight, setClock, tick, RX, RZ, OUT, WALL, PROM, ROAD, KERB, FRONT,
    label: '外滩', labelK: '外滩 · the Bund, Shanghai',
    indoor: false, cutaway: false, near: .18, far: 700,
    fogNear: 34, fogD: .0042, expose: .54,
    // Off the coach, on the pavement, facing the water.
    spawn: { x: -22.0, z: 11.20, yaw: Math.PI },
    zones: [{ id: 'bund', x0: -RX + 1.0, x1: RX - 1.0, z0: PROM[0], z1: KERB + .6,
              light: [0, 4.3, 1.0] }],
    roomAt() { return this.zones[0]; },
  });
});
