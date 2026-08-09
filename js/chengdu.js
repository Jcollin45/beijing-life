// 宽窄巷子 — 成都, and the second place in this game that is not Beijing.
//
// The airport's departure board has carried seven flights since it was built and exactly one of
// them went anywhere: 上海. Every other ticket — 广州, 成都, 海口, 纽约, 东京, 曼谷 — was a
// time-skip. You paid, you boarded, the screen went dark, and you were standing back in the
// terminal two days older. This is the second one that lands.
//
// Why 成都 and not 西安: the schedule in `airport.js` already carries CZ3908 to 成都 at 13:05,
// with a board row, a gate, a baked PA call and an entry in `FX_CITY` for the view out of the
// window. 西安 has none of those, and the schedule is not this file's to edit. So the fix is to
// make a flight that already exists arrive somewhere, which is the honest shape of the bug.
//
// What the flight buys you is one lane of 宽巷子 — grey Qing brick, 小青瓦 roofs, wooden shutter
// doors, red lanterns strung across at first-floor height — opening halfway along into the
// courtyard of a 茶馆. Chengdu is not a skyline city and pretending otherwise would be a lie:
// what it is, is a city that sits down. So the courtyard is the point of the place. Bamboo
// chairs, a 盖碗 in front of every one of them, a small 戏台 where 川剧 faces change, and
// somebody working the tables with a set of ear picks.
//
// It is also two days you have to live through — 吃饭, 睡觉, 干净 and 厕所 all keep draining —
// so the lane feeds you (火锅), beds you (客栈) and has a 公共厕所 in it. Getting home is the
// 机场大巴 at the west end, exactly the way the Bund works: the ticket you bought in Beijing is
// a 往返 and the way back is already paid for. What you have to do is turn up for it.
//
// Outdoors, so no room shell and no window. Chengdu's other constant is the haze — the fog here
// is set closer and thicker than anywhere else in the game on purpose, because a crisp Chengdu
// is not Chengdu.
const Chengdu = Lazy('Chengdu', () => {
  const col = {
    // 青石板, the flagstones the whole lane is laid in
    flag: C('#8f8b83'), flagD: C('#77736c'), flagL: C('#a09c93'),
    // 青砖, the grey brick everything here is built of
    brick: C('#70737a'), brickD: C('#5b5e64'), brickL: C('#82858c'),
    // 小青瓦, the small dark roof tiles
    tile: C('#4b4f54'), tileD: C('#3a3e42'), tileL: C('#5e636a'),
    wood: C('#5e4531'), woodD: C('#432f1f'), woodL: C('#7d5c40'),
    timber: C('#3d2e21'), lacq: C('#6d2a22'),
    red: C('#b8352f'), redD: C('#8c2621'), redL: C('#d4544a'),
    gold: C('#c69430'), goldL: C('#e8bf5c'),
    cream: C('#e3dac6'), white: C('#ece8dc'), paper: C('#e8dcb8'),
    charcoal: C('#33383d'), black: C('#20242a'),
    stone: C('#a69e90'), stoneD: C('#8b8476'), stoneL: C('#bcb4a4'),
    // aged 竹, which is a dull yellow-brown and not green
    bamboo: C('#a08c52'), bambooD: C('#7e6d3e'), bambooL: C('#bda86a'),
    leaf: C('#4f7c3d'), leafD: C('#3a5e2d'), trunk: C('#5a4634'),
    steel: C('#9aa0a6'), steelD: C('#71777d'), chrome: C('#c2c8cc'),
    glass: C('#5e7e93'), glassT: C('#90b1c5'),
    blueSign: C('#1f4f8f'), jade: C('#3f7a63'),
    chili: C('#a3271f'), broth: C('#8e3a1c'), copper: C('#8a6a3a'),
  };
  const G = { matte: .05, wood: .20, paint: .16, metal: .58, glass: .80, fabric: .04 };

  // Tiling surface materials, read triplanar in world space. `matScale` is one repeat in metres,
  // chosen for what the real thing measures: a course of 青砖 is about 60 mm, so the brick sheet
  // goes on tight; a 小青瓦 pan tile is about 200 mm across and the roof sheet is tighter still.
  // Spread in rather than repeated — every distinct combination of scale and amount is its own
  // instanced batch, and seventeen shopfronts dressed seventeen slightly different ways is
  // seventeen draw calls where one would do.
  const MAT = {
    brick:  { mat: 'brick',    matScale: .62,  matAmt: .34 },   // 青砖 walls
    plinth: { mat: 'concrete', matScale: .90,  matAmt: .30 },   // the stone base course
    roof:   { mat: 'rooftile', matScale: .55,  matAmt: .40 },   // 小青瓦
    paving: { mat: 'paving',   matScale: .70,  matAmt: .32 },   // 青石板
    // Held at the bottom of the useful range, the same way the Bund's bench slats are: a shutter
    // door is a foreground object under a red lantern, and a strong grain takes the brown into
    // orange and makes the doors the most saturated thing in a night frame.
    timber: { mat: 'wood',     matScale: .55,  matAmt: .28 },
    beam:   { mat: 'wood',     matScale: 1.10, matAmt: .30 },
    iron:   { mat: 'metal',    matScale: .50,  matAmt: .26 },
  };

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, flat, glyphs,
          solid, blocker, shade, glow, thing } = B;

  // ---------------------------------------------------------------- dimensions
  // One lane running east–west along x, 6.8 m between the shopfronts, with the teahouse
  // courtyard opening off the south side halfway along. Everything is banded in z: the north
  // row, the lane, the south row, and the courtyard behind the gap in it.
  //
  // The two faces are the spine of the whole file. North-row buildings live at z < NF and their
  // fronts look toward +z; south-row buildings live at z > SF and their fronts look toward -z.
  // Getting that backwards puts a shop's own signboard inside its own wall, so `shopfront` takes
  // a `face` and derives `into` and `out` from it rather than letting any caller guess.
  const RX = 32.0, RZ = 24.0;
  const NF = -3.40;                       // the north shopfront faces
  const SF = 3.40;                        // the south shopfront faces
  const DEPTH = 9.0;                      // how far back a row of shops goes
  const YX0 = 1.0, YX1 = 13.0;            // the courtyard mouth in the south row
  const YZ1 = 15.0;                       // the front wall of the teahouse, at the back of it
  const GW = -24.0, GE = 24.0;            // the two 门楼, west and east
  const ROADX = -29.0;                    // the road at the west end, running along z
  // Where the airport coach drops you, which is the only way in and the only way out.
  const OUT = { x: -22.6, z: 0.0, yaw: Math.PI / 2 };

  const litProps = [], pools = [], lanternRigs = [], teaSteam = [];
  function litten(p, k) { litProps.push({ p, k }); return p; }
  function pool(m, c, a, sun) { const g = glow(m, c, a, sun); g.a0 = a; pools.push(g); return g; }
  function lanternPart(rig, p) {
    rig.parts.push({ p, m0: new Float32Array(p.m) });
    p.fixed = true; p.cx = rig.x; p.cy = rig.cy; p.cz = rig.z; p.r = rig.r;
    return p;
  }

  let seed = 0x2c17b3;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  // Every character this room draws. The atlas is shared and `need` skips what it already has,
  // so registering here costs nothing even where another room has asked for the same glyph. A
  // character that is missing does not fail loudly — it draws as a hole in the sign, which is
  // how 元 was missing from the Bund's photographer's board for as long as the board existed.
  Glyphs.need('成都四川宽窄巷子茶馆铺盖碗竹椅火锅麻辣鸳鸯花椒掏耳朵采师傅' +
              '熊猫大川剧变脸戏台客栈住宿公共厕所男女民航售票处机场巴双流' +
              '回程确认北京元老号院小吃担面串香青石板灯笼欢迎光临' +
              '0123456789:—·');

  let skyProp = null;                     // the haze band, which has to go out at dusk
  const DAYSKY = C('#c7cdcd'), NIGHTSKY = C('#1e2530');

  // ---------------------------------------------------------------- parts

  // A pitched 小青瓦 roof. Two slabs meeting at a ridge, and the rolled ridge course along the
  // top — a Chengdu lane house is 硬山顶, flush and plain, not the curled northern kind.
  //
  // `d` is the building's depth, `ey` the eaves height, `rise` how far the ridge stands above
  // them, `over` the overhang past the wall. The slab's length is the *hypotenuse* — using the
  // half-depth instead leaves a slot along the ridge that reads as a stripe of sky through the
  // roof, and it is invisible in the code and obvious in the render.
  function roof(cx, cz, w, d, ey, rise, over = .55) {
    const half = d / 2 + over, a = Math.atan2(rise, half);
    const run = Math.hypot(half, rise);
    for (const s of [-1, 1]) {
      // rx = +a tips the +z end down, which is what the +z slab wants; -a does the mirror.
      box(cx, ey + rise / 2, cz + s * half / 2, w, .13, run, col.tile,
        { ...MAT.roof, hard: true, rx: s * a, gloss: .16 });
      // the eaves board, which is what actually reads as an overhang from underneath
      box(cx, ey - .07, cz + s * half, w + .16, .16, .22, col.timber,
        { ...MAT.beam, hard: true, gloss: G.wood });
    }
    box(cx, ey + rise + .07, cz, w + .10, .18, .30, col.tileD,
      { ...MAT.roof, hard: true, gloss: .18 });
  }

  // One shopfront unit in a row: a brick mass, a stone plinth, a pier either side, a run of
  // wooden shutter boards (门板 — they lift out one at a time in the morning and stack against
  // the pier), a lintel, and a hanging board with the shop's name cut into it.
  //
  // Built square to the axes on purpose. A shopfront laid out on a grid and then given `ry`
  // spins every board about its own centre and ends up crossing its own plinth.
  function shopfront(cx, w, face, name, opts = {}) {
    const zf = face < 0 ? NF : SF;        // the face plane
    const into = face;                    // deeper into the building
    const out = -face;                    // out toward the lane
    const h = opts.h || 3.60;
    // A sign on the north row's front is read from +z, which is yaw 0; the south row's is read
    // from -z, which is yaw π. See the note on `glyphs` handedness at the top of build.js.
    const yaw = face < 0 ? 0 : Math.PI;

    box(cx, h / 2, zf + into * (DEPTH / 2), w, h, DEPTH, col.brick,
      { ...MAT.brick, hard: true, mode: 4, gloss: G.matte });
    box(cx, .28, zf + out * .04, w + .10, .56, .34, col.stoneD,
      { ...MAT.plinth, hard: true, gloss: .22 });

    // the two brick piers, and the shopfront bay between them
    const bay = Math.min(w - 1.30, 3.40);
    for (const s of [-1, 1])
      box(cx + s * (bay / 2 + (w - bay) / 4), h / 2, zf + out * .10,
        (w - bay) / 2, h, .30, col.brickL,
        { ...MAT.brick, hard: true, mode: 4, gloss: G.matte });

    // 门板 — the shutter boards. An `open` unit has the middle ones taken out for the day, which
    // is the only way the inside of a shop is ever visible in this lane.
    const nb = Math.max(4, Math.round(bay / .34));
    const gap = opts.open ? Math.round(nb * .34) : 0;
    const g0 = ((nb - gap) / 2) | 0;
    for (let i = 0; i < nb; i++) {
      if (gap && i >= g0 && i < g0 + gap) continue;
      const bx = cx - bay / 2 + (i + .5) * (bay / nb);
      box(bx, 1.42, zf + into * .16, bay / nb - .035, 2.72, .07, i % 3 ? col.wood : col.woodD,
        { ...MAT.timber, hard: true, mode: 6, gloss: G.wood });
    }
    if (gap) {
      // the dark of the shop behind the missing boards, so an open bay is not a painted panel
      const ow = gap * (bay / nb);
      litten(box(cx, 1.42, zf + into * .42, ow, 2.68, .10, col.black,
        { hard: true, mode: 1, glow: .02 }), .60);
      // and the threshold board you step over on the way in
      box(cx, .09, zf + into * .05, ow, .18, .26, col.timber,
        { ...MAT.beam, hard: true, gloss: G.wood });
    }
    // the lintel beam, the thing that makes the opening read as an opening
    box(cx, 2.92, zf + out * .20, bay + .40, .26, .34, col.timber,
      { ...MAT.beam, hard: true, gloss: G.wood });
    for (let i = 0; i < 5; i++)
      box(cx - bay / 2 + (i + .5) * (bay / 5), 2.66, zf + out * .26, .14, .22, .22,
        col.woodD, { ...MAT.beam, hard: true, gloss: G.wood });

    // the hanging board, lacquered dark red with the name cut into it in gold
    if (name) {
      box(cx, 3.30, zf + out * .22, Math.min(w - .60, name.length * .42 + .40), .62, .12,
        col.lacq, { hard: true, gloss: .30 });
      for (const g of glyphs(cx, 3.30, zf + out * .30, yaw, name,
        { size: .34, gap: .09, color: col.goldL, mode: 1 })) litten(g, .85);
    }
    roof(cx, zf + into * (DEPTH / 2), w + .20, DEPTH, h + .10, .95);
    const z0 = Math.min(zf, zf + into * DEPTH), z1 = Math.max(zf, zf + into * DEPTH);
    solid(cx - w / 2, cx + w / 2, z0, z1);
    blocker(cx - w / 2, cx + w / 2, z0, z1);
  }

  // 红灯笼 — a lantern on the wire that crosses the lane. Emissive rather than translucent: an
  // alpha lantern does not batch and costs a draw call each, there are fifty of them, and at
  // this size nobody can tell the difference.
  function lantern(x, y, z, r = .22) {
    const rig = { x, z, cy: y - r * .05, r: r * 2.15 + .12,
                  py: y + r * 1.36, phase: lanternRigs.length * .77, parts: [] };
    lanternRigs.push(rig);
    lanternPart(rig,
      litten(ball(x, y, z, r, r * 1.12, r, col.red, { mode: 1, glow: .16 }), 1.25));
    for (const s of [-1, 1])
      lanternPart(rig,
        box(x, y + s * r * 1.16, z, r * .52, .07, r * .52, col.gold,
          { hard: true, mode: 1, glow: .10 }));
    lanternPart(rig,
      box(x, y - r * 1.34, z, .07, .20, .07, col.gold,
        { hard: true, mode: 1, glow: .08 }));
  }

  // 竹椅 — the low armchair the whole city sits in, woven out of split bamboo: four legs, a back
  // of three hoops, and arms wide enough to rest a 盖碗 on.
  //
  // Every offset goes through `at`, which rotates it into the chair's own frame. Adding `ry` to
  // the options and leaving the offsets in world axes would spin each rail about its own centre
  // and leave the chair inside out.
  function bambooChair(cx, cz, ry) {
    const T = { ry, tag: '竹椅', ...MAT.timber, gloss: .22 };
    const c = Math.cos(ry), s = Math.sin(ry);
    const at = (ox, oz) => [cx + c * ox + s * oz, cz - s * ox + c * oz];
    for (const [ox, oz] of [[-.21, -.20], [.21, -.20], [-.21, .20], [.21, .20]]) {
      const [px, pz] = at(ox, oz);
      cyl(px, .19, pz, .020, .38, col.bambooD, T);
    }
    box(cx, .40, cz, .50, .05, .46, col.bamboo, { ...T, hard: true });
    for (let i = 0; i < 3; i++) {
      const [px, pz] = at(0, .22);
      box(px, .56 + i * .14, pz, .48, .035, .035, col.bamboo, { ...T, hard: true });
    }
    for (const ox of [-.21, .21]) {
      const [px, pz] = at(ox, .21);
      cyl(px, .62, pz, .018, .48, col.bambooD, T);
      const [qx, qz] = at(ox, 0);
      box(qx, .60, qz, .045, .035, .44, col.bambooL, { ...T, hard: true });
      const [rx2, rz2] = at(ox, -.19);
      cyl(rx2, .50, rz2, .018, .22, col.bambooD, T);
    }
  }

  // A tea table: a low square top, three or four bamboo chairs round it, and a 盖碗 in front of
  // each one. The 盖碗 is the whole ritual in one object — saucer, bowl, lid — and the lid is on
  // askew because nobody in this city has ever put one on straight.
  //
  // One small collider on the table itself and none on the chairs. A courtyard of colliders is
  // how you end up with a 0.4 m slot the body cannot pass; a chair you can walk through is the
  // cheaper mistake.
  function teaTable(cx, cz, n = 3) {
    box(cx, .40, cz, .78, .06, .78, col.woodD,
      { ...MAT.timber, tag: '茶馆', mode: 6, gloss: G.wood });
    for (const [ox, oz] of [[-.30, -.30], [.30, -.30], [-.30, .30], [.30, .30]])
      cyl(cx + ox, .19, cz + oz, .028, .38, col.timber,
        { ...MAT.timber, tag: '茶馆', mode: 6, gloss: G.wood });
    for (let i = 0; i < n; i++) {
      const a = i * (Math.PI * 2 / n) + .4;
      bambooChair(cx + Math.sin(a) * .90, cz + Math.cos(a) * .90, a + Math.PI);
      const tx = cx + Math.sin(a) * .26, tz = cz + Math.cos(a) * .26;
      cyl(tx, .445, tz, .078, .015, col.white, { tag: '盖碗茶', gloss: .34 });
      cyl(tx, .500, tz, .058, .095, col.white, { tag: '盖碗茶', gloss: .34 });
      cyl(tx + .012, .556, tz, .057, .020, col.white, { tag: '盖碗茶', rz: .16, gloss: .34 });
      cyl(tx + .012, .572, tz, .017, .016, col.jade, { tag: '盖碗茶', rz: .16, gloss: .30 });
      if (i === 0) {
        // One visible cup per table is enough to read as hot tea without filling the courtyard
        // with translucent particles. Its cull sphere includes the full rise of every puff.
        for (let j = 0; j < 3; j++) {
          const p = ball(tx, .61, tz, .035, .028, .035, col.paper,
            { mode: 1, glow: .025, alpha: 0 });
          p.fixed = true; p.cx = tx; p.cy = .83; p.cz = tz; p.r = .40;
          teaSteam.push({ p, x: tx, y: .61, z: tz, ph: j / 3 });
        }
      }
    }
    solid(cx - .45, cx + .45, cz - .45, cz + .45);
    shade(cx, cz, 2.5, 2.5, .22);
  }

  // A tree in the courtyard. Chengdu courtyards have one and it is a 银杏 or a 香樟; either way
  // it is a trunk and four overlapping masses of leaf, because a tree at this distance is a
  // silhouette and eight hundred leaf cards is eight hundred props. Mode 15 is the foliage mode
  // — it tints each cluster by its position and pushes it warm, so four balls are not four
  // identical balls.
  function tree(cx, cz, s = 1) {
    cyl(cx, 1.30 * s, cz, .17 * s, 2.60 * s, col.trunk, { ...MAT.timber, mode: 6, gloss: .14 });
    for (const [ox, oy, oz, r] of [[0, 3.5, 0, 1.65], [-.9, 3.0, .5, 1.10],
                                   [.95, 3.15, -.4, 1.05], [.2, 4.25, .6, .95]])
      ball(cx + ox * s, oy * s, cz + oz * s, r * s, r * .78 * s, r * s,
        rnd() > .5 ? col.leaf : col.leafD, { mode: 15, gloss: .10 });
    solid(cx - .30, cx + .30, cz - .30, cz + .30);
    shade(cx, cz, 4.0 * s, 4.0 * s, .26);
  }

  function build() {
    // ================================================================ the ground
    // 青石板 — big grey flagstones, worn smooth. mode 9's own metre slabs give the joints and
    // the slab-to-slab tone; the material gives the stone inside each one.
    flat(0, 0, 1.0, RX * 2 + 24, 44.0, col.flag, { ...MAT.paving, mode: 9, gloss: .26 });
    // The lane is laid in three bands with a gutter either side, which is how every one of these
    // lanes drains and the only thing that stops the floor reading as one sheet.
    for (const s of [-1, 1])
      flat(0, .004, s * 2.65, RX * 2 + 16, .34, col.flagD, { gloss: .20 });
    for (let i = -30; i <= 30; i++)
      flat(i * 1.9, .006, 0, .07, 5.20, col.flagD, { gloss: .20 });
    // the road at the west end, where the coach stands
    flat(ROADX, .004, 1.0, 5.0, 44.0, C('#4c4b49'),
      { mat: 'asphalt', matScale: 2.0, matAmt: .30, mode: 10, gloss: .24 });
    box(ROADX + 2.62, .07, 1.0, .30, .16, 44.0, col.stoneL,
      { ...MAT.plinth, hard: true, gloss: .24 });

    // ================================================================ the two rows
    // Ten units on the north side and seven on the south, the south row broken where the
    // courtyard opens. Widths vary so the lane does not read as a colonnade. Units that carry a
    // `thing` of their own are left nameless here — their signage is built with the fitting, so
    // that one hanging board does not end up behind another.
    const NORTH = [[-21.4, 5.0, '老号院', 0], [-16.6, 4.6, '', 0], [-11.8, 5.0, '', 1],
                   [-6.8, 5.0, '串串香', 1], [-2.0, 4.6, '', 1], [2.6, 4.6, '', 0],
                   [7.2, 5.0, '担担面', 1], [12.2, 5.0, '', 0], [17.0, 4.6, '小吃', 1],
                   [21.6, 4.6, '', 1]];
    for (const [cx, w, nm, op] of NORTH) shopfront(cx, w, -1, nm, { open: !!op });
    const SOUTH = [[-21.4, 5.0, '', 0], [-16.6, 4.6, '茶铺', 1], [-11.8, 5.0, '', 0],
                   [-6.6, 5.4, '欢迎光临', 1], [-1.6, 4.4, '', 0],
                   [16.0, 5.6, '', 1], [21.4, 4.6, '', 0]];
    for (const [cx, w, nm, op] of SOUTH) shopfront(cx, w, 1, nm, { open: !!op });

    // The courtyard's own side walls, running back from the mouth in the south row. Without them
    // the courtyard is a field with a building at the end of it.
    for (const wx of [YX0 - .30, YX1 + .30]) {
      box(wx, 1.50, (SF + YZ1) / 2, .40, 3.00, YZ1 - SF, col.brick,
        { ...MAT.brick, hard: true, mode: 4, gloss: G.matte });
      box(wx, 3.12, (SF + YZ1) / 2, .62, .22, YZ1 - SF, col.tileD,
        { ...MAT.roof, hard: true, gloss: .18 });
      solid(wx - .25, wx + .25, SF, YZ1);
      blocker(wx - .25, wx + .25, SF, YZ1, 5.0);
    }

    // ================================================================ 门楼 the two gateways
    // A brick arch across the lane at each end with the lane's name cut into the plaque, on both
    // faces so it reads coming and going. The west one is what you walk through off the coach,
    // so it is the first thing this city says to you.
    function gatehouse(gx, name) {
      for (const s of [-1, 1]) {
        box(gx, 2.30, s * 4.30, 1.30, 4.60, 1.90, col.brick,
          { ...MAT.brick, tag: '宽窄巷子', hard: true, mode: 4, gloss: G.matte });
        box(gx, .34, s * 4.30, 1.60, .68, 2.20, col.stoneD,
          { ...MAT.plinth, tag: '宽窄巷子', hard: true, gloss: .22 });
        solid(gx - .70, gx + .70, s * 4.30 - 1.0, s * 4.30 + 1.0);
        blocker(gx - .70, gx + .70, s * 4.30 - 1.0, s * 4.30 + 1.0);
      }
      box(gx, 5.00, 0, 1.30, .80, 9.60, col.brick,
        { ...MAT.brick, tag: '宽窄巷子', hard: true, mode: 4, gloss: G.matte });
      box(gx, 5.56, 0, 1.70, .34, 10.2, col.stoneL,
        { ...MAT.plinth, tag: '宽窄巷子', hard: true, gloss: .24 });
      roof(gx, 0, 2.10, 10.6, 5.76, .70, .30);
      // The plaque hangs on the ±x faces of the lintel, not the ±z ones: you read it walking
      // through, and a plaque facing along the lane is the only orientation that works.
      for (const s of [-1, 1]) {
        box(gx + s * .70, 4.30, 0, .12, .96, 3.40, col.lacq,
          { tag: '宽窄巷子', hard: true, gloss: .30 });
        for (const g of glyphs(gx + s * .79, 4.30, 0, s * Math.PI / 2, name,
          { size: .52, gap: .16, color: col.goldL, mode: 1, tag: '宽窄巷子' })) litten(g, .9);
      }
      lantern(gx, 3.60, -3.00, .26);
      lantern(gx, 3.60, 3.00, .26);
      B.light(gx, 3.30, 0, [1.00, 0.72, 0.48], .80, 5.00);
      pool(M.trs(gx, .02, 0, 0, 7.0, 1, 7.0), C('#f2d8a8'), .0, false);
    }
    gatehouse(GW, '宽巷子');
    gatehouse(GE, '窄巷子');
    thing('宽窄巷子', GW, 4.30, 1.10, '这就是宽窄巷子。',
      'So this is Kuanzhai Alley.',
      '宽 wide + 窄 narrow + 巷子 a lane. Two lanes side by side, and the pair of them are the ' +
      'name of the place.',
      { focus: [GW + 2.20, 0], reach: 3.6 });

    // ================================================================ the lanterns over the lane
    // Strung on wires across it, the way every commercial lane in China is. Two per wire, a wire
    // every four metres, and only every third wire gets a real point light — twenty-two of them
    // would take every light slot in the frame and the lane would look no different for it.
    for (let i = -5; i <= 5; i++) {
      const lx = i * 4.0;
      box(lx, 4.30, 0, .035, .035, 7.20, col.charcoal, { hard: true, gloss: .28 });
      lantern(lx, 3.94, -1.50);
      lantern(lx, 3.94, 1.50);
      if (i % 3 === 0) {
        B.light(lx, 3.70, 0, [1.00, 0.66, 0.42], .72, 5.60);
        pool(M.trs(lx, .02, 0, 0, 6.4, 1, 6.4), C('#f0cf9c'), .0, false);
      }
    }

    // ================================================================ 机场大巴 the way home
    // West of the gate, on the road: the stop, the board, and the coach itself waiting with its
    // engine off. This is the only exit from the whole city, so it is put in line with the gate
    // you came through rather than hidden round a corner.
    const BX = -25.9, BZ = 1.20;
    cyl(BX, 1.70, BZ, .06, 3.40, col.steelD, { tag: '机场大巴', ...MAT.iron, gloss: G.metal });
    box(BX, 3.00, BZ - .10, 2.30, 1.06, .10, col.blueSign,
      { tag: '机场大巴', hard: true, gloss: .26 });
    for (const g of glyphs(BX, 3.20, BZ - .17, Math.PI, '机场大巴',
      { size: .21, gap: .06, color: col.white, mode: 1, tag: '机场大巴' })) litten(g, .9);
    for (const g of glyphs(BX, 2.80, BZ - .17, Math.PI, '双流机场',
      { size: .15, gap: .05, color: C('#a8c4e0'), mode: 1, tag: '机场大巴' })) litten(g, .6);
    // the coach, standing in the road with its nose north
    const CZ = 4.60;
    box(ROADX, 1.62, CZ, 2.60, 2.44, 11.0, C('#e6e2d6'), { tag: '机场大巴', gloss: .32 });
    box(ROADX + 1.33, 2.24, CZ, .10, 1.10, 10.4, C('#2a3038'),
      { tag: '机场大巴', hard: true, mode: 1, alpha: .85 });
    box(ROADX, 1.10, CZ, 2.66, .50, 11.1, col.blueSign,
      { tag: '机场大巴', hard: true, gloss: .30 });
    box(ROADX, 3.02, CZ, 2.40, .40, 10.6, C('#d6d2c6'), { tag: '机场大巴', hard: true });
    // The wheels. This coach stands nose-north, so it runs along z and its axles run along x —
    // which is `rz`, not the `rx` the Bund's coach uses, because that one is parked along x.
    // Copying the rotation across without copying the orientation gives a bus on castors.
    for (const oz of [-4.0, 3.2])
      cyl(ROADX, .42, CZ + oz, .44, .30, col.black,
        { tag: '机场大巴', rz: Math.PI / 2, gloss: .22 });
    litten(box(ROADX, 2.30, CZ - 5.4, .90, .40, .30, col.charcoal,
      { tag: '机场大巴', hard: true, mode: 1, glow: .10 }), .6);
    shade(ROADX, CZ, 4.0, 12.5, .32);
    solid(ROADX - 1.35, ROADX + 1.35, CZ - 5.6, CZ + 5.6);
    blocker(ROADX - 1.35, ROADX + 1.35, CZ - 5.6, CZ + 5.6);
    thing('机场大巴', BX, 2.10, BZ - .60, '机场大巴，回北京。',
      'The airport coach. Time to go home.',
      '机场 airport + 大巴 a coach. 双流 is the airport this city flies out of.',
      { focus: [-23.6, .40], reach: 3.6 });

    // ================================================================ 熊猫 the sculpture
    // There is no live panda in this lane, and pretending otherwise would be a worse lie than
    // leaving it out. What there actually is, all over 宽窄巷子, is panda sculpture — sitting on
    // walls, hanging off eaves, eating bamboo on the pavement — being photographed by everybody
    // who walks past. So this is a stone one on a plinth, facing the lane, which is the honest
    // version and does not need the animal rig to be true.
    const PX = -18.4, PZ = -2.20;
    box(PX, .28, PZ, 1.50, .56, 1.20, col.stoneD,
      { ...MAT.plinth, tag: '熊猫', hard: true, gloss: .22 });
    box(PX, .60, PZ, 1.62, .12, 1.32, col.stoneL,
      { ...MAT.plinth, tag: '熊猫', hard: true, gloss: .24 });
    // sitting, facing +z into the lane: haunches, belly, chest, head, and the black patches
    ball(PX, .96, PZ, .46, .34, .40, col.white, { tag: '熊猫', gloss: .16 });
    ball(PX, 1.30, PZ + .06, .40, .40, .36, col.white, { tag: '熊猫', gloss: .16 });
    ball(PX, 1.78, PZ + .10, .32, .30, .30, col.white, { tag: '熊猫', gloss: .16 });
    for (const s of [-1, 1]) {
      ball(PX + s * .27, 2.00, PZ + .06, .12, .12, .10, col.charcoal, { tag: '熊猫', gloss: .18 });
      ball(PX + s * .13, 1.80, PZ + .34, .085, .07, .05, col.charcoal, { tag: '熊猫', gloss: .18 });
      capsule(PX + s * .40, 1.28, PZ + .24, .18, .40, .18, col.charcoal,
        { tag: '熊猫', rz: -s * .5, gloss: .16 });
      capsule(PX + s * .30, .74, PZ + .32, .24, .22, .48, col.charcoal,
        { tag: '熊猫', gloss: .16 });
    }
    ball(PX, 1.74, PZ + .40, .07, .06, .07, col.black, { tag: '熊猫', gloss: .26 });
    // the stick of bamboo it is holding, and the leaves on it
    box(PX, 1.36, PZ + .42, .035, .90, .035, col.leafD,
      { tag: '熊猫', hard: true, rz: .30, gloss: .16 });
    for (let i = 0; i < 4; i++)
      box(PX + .12 + (i % 2) * .10, 1.68 + i * .07, PZ + .44, .26, .015, .10, col.leaf,
        { tag: '熊猫', hard: true, ry: .4 + i * .5, mode: 15, gloss: .12 });
    solid(PX - .85, PX + .85, PZ - .70, PZ + .70);
    shade(PX, PZ, 2.4, 2.0, .26);
    thing('熊猫', PX, 1.60, PZ + .90, '给它照一张。',
      'Take one of it.',
      '熊猫 is literally bear-cat. 大熊猫 is the giant one, and this is the city they live in.',
      { focus: [PX, -.40], reach: 2.4 });

    // ================================================================ 火锅 the hotpot house
    // The loudest front in the lane. A 鸳鸯锅 on the board — the pot split down the middle, half
    // 麻辣 and half clear broth, which is the compromise every table in this city negotiates —
    // baskets of dried chilli and 花椒 at the door, and red light coming out of it.
    const HX = -11.8;
    box(HX, 4.20, NF + .34, 3.40, .96, .16, col.lacq, { tag: '火锅', hard: true, gloss: .30 });
    for (const g of glyphs(HX, 4.20, NF + .43, 0, '麻辣火锅',
      { size: .40, gap: .12, color: col.goldL, mode: 1, tag: '火锅' })) litten(g, .95);
    // The split pot on the wall beside the board. `rx`, not `rz`: a cyl is built along its own
    // +y, so rx tips that axis into z and gives a disc facing the lane — which is the same
    // rotation the Bund's customs-house dial uses. rz would turn it to face along the lane and
    // present its rim, and a pot seen edge-on is a washer.
    const WX = HX - 2.20;
    cyl(WX, 2.30, NF + .10, .46, .10, col.steel,
      { tag: '火锅', rx: Math.PI / 2, gloss: G.metal });
    litten(cyl(WX, 2.30, NF + .17, .40, .04, col.broth,
      { tag: '火锅', rx: Math.PI / 2, mode: 1, glow: .06 }), .5);
    box(WX, 2.30, NF + .20, .06, .80, .04, col.steel,
      { tag: '火锅', hard: true, gloss: G.metal });
    for (let i = 0; i < 7; i++)
      ball(WX - .30 + rnd() * .28, 2.30 - .30 + rnd() * .60, NF + .21,
        .035, .035, .02, col.chili, { tag: '火锅', mode: 1, glow: .04 });
    // the baskets either side of the door, out on the flagstones
    for (const [ox, c] of [[-1.50, col.chili], [1.50, C('#6b4a2a')]]) {
      cyl(HX + ox, .22, NF + .58, .34, .44, col.bambooD,
        { ...MAT.timber, tag: '火锅', mode: 6, gloss: .18 });
      cyl(HX + ox, .46, NF + .58, .31, .10, c, { tag: '火锅', gloss: .22 });
      for (let i = 0; i < 9; i++)
        box(HX + ox - .22 + rnd() * .44, .52, NF + .40 + rnd() * .36,
          .05, .05, .16, c, { tag: '火锅', hard: true, ry: rnd() * 3, gloss: .24 });
      solid(HX + ox - .38, HX + ox + .38, NF + .20, NF + .96);
    }
    // the red glow out of the open bay, which is all anyone ever sees of the inside
    litten(box(HX, 1.50, NF + .10, 1.60, 2.60, .08, C('#c2503a'),
      { tag: '火锅', hard: true, mode: 1, glow: .12 }), 1.2);
    B.light(HX, 2.40, NF + .90, [1.00, 0.56, 0.36], .85, 4.40);
    pool(M.trs(HX, .02, NF + 1.2, 0, 5.0, 1, 4.0), C('#e8a070'), .0, false);
    thing('火锅', HX, 2.00, NF + .70, '来个鸳鸯锅，微辣。',
      'A split pot, and the mild side for me.',
      '火锅 hotpot. 麻 is the numbing of 花椒 and 辣 is the burn of chilli; 麻辣 is both at ' +
      'once, and 鸳鸯锅 is the pot split down the middle so you can hide in the other half.',
      { focus: [HX, -1.40], reach: 2.4 });

    // ================================================================ 民航售票处
    // The airline office, the same institution as the one on the Bund: a counter, a queue of
    // people who would rather ask somebody than use a phone, and a window of fares nobody has
    // updated. This is where you reconfirm that you are still on the flight home.
    const MX = -2.0;
    box(MX, 1.60, NF + .16, 2.60, 2.40, .12, col.glass,
      { tag: '民航售票处', hard: true, mode: 1, alpha: .55, glow: .05 });
    box(MX, 4.16, NF + .30, 3.60, .70, .16, col.blueSign,
      { tag: '民航售票处', hard: true, gloss: .26 });
    for (const g of glyphs(MX, 4.16, NF + .39, 0, '民航售票处',
      { size: .26, gap: .07, color: col.white, mode: 1, tag: '民航售票处' })) litten(g, .95);
    litten(box(MX + .95, 1.90, NF + .24, 1.10, .80, .04, C('#8fbcd4'),
      { tag: '民航售票处', hard: true, mode: 1, glow: .16 }), .6);
    thing('民航售票处', MX, 2.20, NF + .70, '我来确认一下回程。',
      "I've come to reconfirm my return.",
      '民航 civil aviation + 售票处 ticket office. 回程 the return leg, 确认 to confirm.',
      { focus: [MX, -1.40], reach: 2.6 });

    // ================================================================ 客栈 somewhere to sleep
    // Not a 饭店 — a 客栈, which is what a courtyard house that takes guests calls itself, and a
    // word worth having because it is on half the doors in this lane. Cheaper than the Peace
    // Hotel, and the room is off a courtyard rather than up a lift.
    const KX = 16.0;
    box(KX, 1.35, SF - .26, 1.90, 2.70, .22, col.timber,
      { ...MAT.timber, tag: '客栈', hard: true, mode: 6, gloss: G.wood });
    for (const s of [-1, 1])
      cyl(KX + s * .78, 1.42, SF - .16, .09, 2.60, col.lacq, { tag: '客栈', gloss: .28 });
    box(KX, 3.44, SF - .30, 2.20, .70, .16, col.lacq, { tag: '客栈', hard: true, gloss: .30 });
    for (const g of glyphs(KX, 3.44, SF - .39, Math.PI, '客栈',
      { size: .40, gap: .14, color: col.goldL, mode: 1, tag: '客栈' })) litten(g, .95);
    lantern(KX - 1.30, 2.90, SF - .16, .24);
    lantern(KX + 1.30, 2.90, SF - .16, .24);
    B.light(KX, 2.70, SF - .80, [1.00, 0.70, 0.46], .78, 4.20);
    pool(M.trs(KX, .02, SF - 1.0, 0, 4.6, 1, 3.6), C('#f0c894'), .0, false);
    thing('客栈', KX, 2.20, SF - .70, '还有房间吗？住一晚。',
      'Have you a room? One night.',
      '客栈 an inn — a courtyard house that takes guests. 住 to stay, 一晚上 one night.',
      { focus: [KX, 1.40], reach: 2.6 });

    // ================================================================ 公共厕所
    // Two days is two days. In the last unit of the north row, with the 男/女 doors on the lane.
    const TX = 21.6;
    for (const [ox, ch, c] of [[-1.00, '男', C('#7fb8e0')], [1.00, '女', C('#e08fa8')]]) {
      box(TX + ox, 1.20, NF + .08, 1.00, 2.40, .14, col.timber,
        { ...MAT.timber, tag: '公共厕所', hard: true, mode: 6, gloss: G.wood });
      for (const g of glyphs(TX + ox, 2.62, NF + .17, 0, ch,
        { size: .26, gap: 0, color: c, mode: 1, tag: '公共厕所' })) litten(g, .8);
    }
    box(TX, 3.30, NF + .30, 2.60, .48, .12, col.blueSign,
      { tag: '公共厕所', hard: true, gloss: .24 });
    for (const g of glyphs(TX, 3.30, NF + .38, 0, '公共厕所',
      { size: .21, gap: .05, color: col.white, mode: 1, tag: '公共厕所' })) litten(g, .9);
    thing('公共厕所', TX, 1.80, NF + .70, '厕所在巷子那头。',
      'The toilets are at that end of the lane.',
      '公共 public + 厕所 toilet. 排队 is to queue, which you will.',
      { focus: [TX, -1.40], reach: 2.4 });

    // ================================================================ the courtyard 茶馆
    // The reason the flight was worth taking. Chengdu is not a skyline; it is a city that sits
    // down in the middle of the afternoon and does not get up again, and this courtyard is that
    // in one place: four low tables under a tree, bamboo chairs, a 盖碗 in front of every one of
    // them, and a teahouse across the back with its shutter boards out for the day.
    const YCX = (YX0 + YX1) / 2, TW = YZ1;

    box(YCX, 1.80, TW + 2.60, 12.4, 3.60, 5.20, col.brick,
      { ...MAT.brick, tag: '茶馆', hard: true, mode: 4, gloss: G.matte });
    // the step up onto the verandah, in front of the wall
    box(YCX, .16, TW - .30, 12.8, .32, .80, col.stoneD,
      { ...MAT.plinth, tag: '茶馆', hard: true, gloss: .22 });
    // The verandah posts and the beam they carry, a metre out from the front. The post height
    // is not free: the roof below has its eaves at 3.90 and rises 1.10 to the ridge, so the
    // underside of it over the beam line is at about 4.2 m, and a 3.4 m post leaves three
    // quarters of a metre of daylight between the beam and the roof it is supposed to hold up.
    for (let i = -3; i <= 3; i++)
      cyl(YCX + i * 1.90, 1.95, TW - 1.10, .11, 3.90, col.lacq,
        { ...MAT.beam, tag: '茶馆', gloss: .28 });
    box(YCX, 4.00, TW - 1.10, 12.8, .28, .40, col.timber,
      { ...MAT.beam, tag: '茶馆', hard: true, gloss: G.wood });
    // the front: 门板 taken out across the middle, so the inside is visible and lit
    for (let i = 0; i < 14; i++) {
      const bx = YCX - 5.6 + i * .86;
      if (i > 3 && i < 10) {
        litten(box(bx, 1.60, TW + .30, .82, 2.40, .08, C('#c8a86a'),
          { tag: '茶馆', hard: true, mode: 1, glow: .08 }), .95);
        continue;
      }
      box(bx, 1.40, TW + .06, .78, 2.60, .09, i % 2 ? col.wood : col.woodD,
        { ...MAT.timber, tag: '茶馆', hard: true, mode: 6, gloss: G.wood });
    }
    // The name board hangs *below* the beam, not through it: at 4.10 it occupied exactly the
    // same 0.28 m of air the beam does.
    box(YCX, 3.32, TW - 1.18, 3.40, .84, .16, col.lacq,
      { tag: '茶馆', hard: true, gloss: .30 });
    for (const g of glyphs(YCX, 3.32, TW - 1.27, Math.PI, '茶馆',
      { size: .52, gap: .18, color: col.goldL, mode: 1, tag: '茶馆' })) litten(g, .95);
    roof(YCX, TW + 2.20, 13.0, 6.60, 3.90, 1.10, 1.40);
    solid(YX0 - .10, YX1 + .10, TW, TW + 5.4);
    blocker(YX0 - .10, YX1 + .10, TW, TW + 5.4);
    for (const lx of [YCX - 3.4, YCX + 3.4]) {
      lantern(lx, 3.00, TW - 1.10, .26);
      B.light(lx, 2.80, TW - 1.60, [1.00, 0.74, 0.50], .80, 5.20);
      pool(M.trs(lx, .02, TW - 2.0, 0, 5.4, 1, 4.4), C('#f0cc98'), .0, false);
    }
    thing('茶馆', YCX, 2.40, TW - 1.40, '来一碗盖碗茶，坐一下午。',
      'One bowl of tea, and the whole afternoon.',
      '茶馆 a teahouse. In this city it is not a café — it is where the afternoon happens.',
      { focus: [YCX, TW - 2.60], reach: 3.0 });

    // the tables, and the tree they are set out under
    tree(YX0 + 2.60, 8.60, 1.05);
    teaTable(4.60, 5.90, 3);
    teaTable(9.80, 6.20, 3);
    teaTable(5.90, 11.30, 3);
    teaTable(10.20, 11.00, 4);
    thing('盖碗茶', 9.80, .90, 5.30, '盖碗茶，慢慢喝。',
      'Lidded-bowl tea, and drink it slowly.',
      '盖 a lid + 碗 a bowl. The lid is a strainer, a fan, and the way you tell the man with ' +
      'the kettle that you would like more.',
      { focus: [9.80, 4.60], reach: 2.0 });
    thing('竹椅', 4.60, .70, 4.80, '坐一会儿。',
      'Sit down a while.',
      '竹 bamboo + 椅 chair. The city sits in these and has done for a hundred years.',
      { focus: [4.60, 4.10], reach: 1.8 });

    // ---- 掏耳朵, the ear-cleaner's pitch. The man himself is an NPC; this is his stool, his
    // roll of picks and the tuning fork he rings against them, because the trade means nothing
    // as a word unless the tools are visible.
    const EX = 12.0, EZ = 8.80;
    box(EX, .38, EZ, .46, .06, .40, col.woodD,
      { ...MAT.timber, tag: '掏耳朵', mode: 6, gloss: G.wood });
    for (const [ox, oz] of [[-.18, -.15], [.18, -.15], [-.18, .15], [.18, .15]])
      cyl(EX + ox, .18, EZ + oz, .022, .36, col.timber,
        { ...MAT.timber, tag: '掏耳朵', mode: 6, gloss: G.wood });
    for (let i = 0; i < 7; i++)
      cyl(EX - .16 + i * .05, .44, EZ, .006, .22, i % 2 ? col.chrome : col.bambooL,
        { tag: '掏耳朵', rx: Math.PI / 2 - .1, gloss: G.metal });
    box(EX + .14, .48, EZ - .04, .03, .26, .03, col.chrome,
      { tag: '掏耳朵', hard: true, gloss: G.metal });
    box(EX + .14, .62, EZ - .04, .11, .03, .03, col.chrome,
      { tag: '掏耳朵', hard: true, gloss: G.metal });
    bambooChair(EX - 1.05, EZ, 1.30);
    shade(EX, EZ, 1.6, 1.6, .20);
    thing('掏耳朵', EX, 1.30, EZ - 1.05, '师傅，掏个耳朵。',
      'Master — do my ears.',
      '掏 to scoop out + 耳朵 ear. He rings the fork so you hear it through the bone, and then ' +
      'it is twenty minutes of the strangest pleasure in Sichuan.',
      { focus: [EX - .20, EZ - 2.00], reach: 2.2 });

    // ---- 戏台, the small stage against the west wall of the courtyard, where the faces change.
    // 变脸 is a Sichuan opera trick and, formally, a protected state secret — which is a
    // sentence worth learning in the place it comes from.
    const SX2 = YX0 + 1.60, SZ2 = 12.80;
    box(SX2, .35, SZ2, 2.40, .70, 3.20, col.timber,
      { ...MAT.beam, tag: '川剧', hard: true, mode: 6, gloss: G.wood });
    box(SX2, .74, SZ2, 2.50, .10, 3.30, col.wood,
      { ...MAT.timber, tag: '川剧', hard: true, mode: 6, gloss: G.wood });
    for (const oz of [-1.45, 1.45])
      cyl(SX2 + 1.00, 1.90, SZ2 + oz, .09, 2.40, col.lacq, { tag: '川剧', gloss: .28 });
    box(SX2 + 1.00, 3.20, SZ2, .20, .26, 3.30, col.timber,
      { ...MAT.beam, tag: '川剧', hard: true, gloss: G.wood });
    // the backcloth, and the mask hanging on it: white ground, black brow, red cheek
    box(SX2 - 1.00, 1.90, SZ2, .10, 2.30, 3.10, col.lacq,
      { tag: '川剧', hard: true, gloss: .26 });
    litten(ball(SX2 - .88, 2.00, SZ2, .06, .40, .32, col.paper,
      { tag: '川剧', mode: 1, glow: .10 }), .8);
    for (const s of [-1, 1]) {
      box(SX2 - .83, 2.14, SZ2 + s * .12, .03, .09, .17, col.black,
        { tag: '川剧', hard: true, mode: 1, rx: s * .3 });
      box(SX2 - .83, 1.88, SZ2 + s * .14, .03, .13, .11, col.red,
        { tag: '川剧', hard: true, mode: 1 });
    }
    box(SX2 - .83, 1.70, SZ2, .03, .05, .10, col.black, { tag: '川剧', hard: true, mode: 1 });
    for (const g of glyphs(SX2 + 1.11, 3.20, SZ2, Math.PI / 2, '川剧变脸',
      { size: .22, gap: .07, color: col.goldL, mode: 1, tag: '川剧' })) litten(g, .8);
    B.light(SX2 + .60, 2.60, SZ2, [1.00, 0.78, 0.54], .70, 4.00);
    solid(SX2 - 1.25, SX2 + 1.25, SZ2 - 1.65, SZ2 + 1.65);
    shade(SX2, SZ2, 3.2, 4.0, .24);
    thing('川剧', SX2 + 1.20, 1.90, SZ2, '晚上有变脸。',
      'There is face-changing in the evening.',
      '川剧 Sichuan opera + 变脸 to change face — the masks come off faster than the eye ' +
      'follows, and how it is done is protected by law.',
      { focus: [SX2 + 2.60, SZ2], reach: 2.6 });

    // ================================================================ beyond the lane
    // Chengdu is flat and it is hazy, and both are load-bearing here: there is no skyline over
    // these roofs, only more grey tile going back into the murk and then the shape of the modern
    // city behind it, which on most days you cannot see at all. Built as long continuous runs
    // rather than a grid of separate houses — at this distance and through this fog they read
    // identically, and one run is four props where a grid of thirteen is fifty-two.
    skyProp = box(0, 34.0, -78.0, 320, 70, .4, [...DAYSKY], { hard: true, mode: 1, glow: .05 });
    // Both sets start clear of what is actually built. The north row's own mass reaches
    // z = NF − DEPTH = −12.4, and the teahouse roof at the back of the courtyard reaches z = 21.9
    // — a filler run at −16 or at +21 drives a 96 m brick wall straight through one of them, and
    // through the one thing in the scene the player spends the afternoon sitting in.
    for (let i = 0; i < 5; i++) {
      const zz = -18.0 - i * 9.0, ey = 2.8 + (i % 3) * .5;
      box(0, ey / 2, zz, 96.0, ey, 7.4, col.brickD,
        { ...MAT.brick, hard: true, mode: 4, gloss: G.matte });
      roof(0, zz, 96.0, 7.4, ey, .85, .35);
    }
    for (let i = 0; i < 4; i++) {
      const zz = 28.0 + i * 9.0, ey = 2.8 + (i % 3) * .5;
      box(0, ey / 2, zz, 96.0, ey, 7.4, col.brickD,
        { ...MAT.brick, hard: true, mode: 4, gloss: G.matte });
      roof(0, zz, 96.0, 7.4, ey, .85, .35);
    }
    for (let i = 0; i < 9; i++) {
      const bx = -46 + i * 12.0, bh = 22 + ((i * 37) % 5) * 6;
      box(bx, bh / 2, -64.0, 9.0, bh, 9.0, C('#7e858b'), { hard: true, gloss: .24 });
      litten(box(bx, bh * .55, -59.4, 7.6, bh * .78, .3, col.glass,
        { hard: true, mode: 1, alpha: .9, glow: .02 }), 1.0);
    }

    // ================================================================ 成都 itself
    // The name of the city cut into the flagstones under the west gate, and the one action that
    // is simply standing in it.
    for (const g of glyphs(-19.0, .40, 2.40, 0, '成都',
      { size: .44, gap: .18, color: col.flagD, mode: 1 })) litten(g, .2);
    thing('成都', -14.0, 1.70, 1.60, '成都是个坐得住的城市。',
      'Chengdu is a city that knows how to sit still.',
      '成都 Chengdu, the capital of 四川. Nobody here is in a hurry, and it is not an accident.',
      { focus: [-14.0, .40], reach: 3.6 });
  }

  build();

  function tick(t) {
    const wind = typeof Weather !== 'undefined' && Weather.now ? Weather.now.wind : .18;
    // Each lantern pivots from its top cap. Small phase differences keep a whole wire from
    // behaving as one rigid bar, while weather controls how far the paper bodies travel.
    for (const rig of lanternRigs) {
      const a = Math.sin(t * .56 + rig.phase) * (.010 + wind * .058)
              + Math.sin(t * 1.29 + rig.phase * 1.6) * (.004 + wind * .009);
      const c = Math.cos(a), s = Math.sin(a);
      for (const q of rig.parts) {
        const m = q.p.m, b = q.m0;
        for (let j = 0; j < 3; j++) {
          const o = j * 4, x = b[o], y = b[o + 1];
          m[o] = c * x - s * y; m[o + 1] = s * x + c * y;
          m[o + 2] = b[o + 2]; m[o + 3] = b[o + 3];
        }
        const x = b[12] - rig.x, y = b[13] - rig.py;
        m[12] = rig.x + c * x - s * y; m[13] = rig.py + s * x + c * y;
        m[14] = b[14]; m[15] = 1;
      }
    }
    for (let i = 0; i < teaSteam.length; i++) {
      const q = teaSteam[i], u = (t * .18 + q.ph) % 1;
      const d = .045 + u * .075, m = q.p.m;
      m[0] = d; m[1] = 0; m[2] = 0; m[3] = 0;
      m[4] = 0; m[5] = d * .78; m[6] = 0; m[7] = 0;
      m[8] = 0; m[9] = 0; m[10] = d; m[11] = 0;
      m[12] = q.x + Math.sin(u * 5.2 + i) * .025 * u;
      m[13] = q.y + u * .42;
      m[14] = q.z + Math.cos(u * 4.6 + i * 1.3) * .022 * u; m[15] = 1;
      q.p.alpha = Math.sin(u * Math.PI) * .14;
    }
  }

  function setNight(k) {
    const soft = k * k * (3 - 2 * k);
    for (const { p, k: kk } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) + soft * kk * .34;
    // The haze band is emissive, so nothing else will darken it: painted day grey it stayed day
    // grey at eleven at night behind a lane full of lanterns.
    if (skyProp) for (let i = 0; i < 3; i++)
      skyProp.color[i] = DAYSKY[i] + (NIGHTSKY[i] - DAYSKY[i]) * soft;
    // A lantern lane after dark is most of the reason to be in one, so the lanterns put light on
    // the flagstones rather than only glowing at you.
    for (const g of pools) g.a = g.a0 + soft * .20;
  }

  return B.finish({
    setNight, tick, RX, RZ, OUT, NF, SF, YX0, YX1, YZ1,
    label: '成都', labelK: '宽窄巷子 · Kuanzhai Alley, Chengdu',
    indoor: false, cutaway: false, near: .18, far: 400,
    // Chengdu's haze is not weather, it is the climate — the basin sits under it most of the
    // year. Closer and thicker than anywhere else in the game, on purpose.
    fogNear: 24, fogD: .0082, expose: .56,
    // Off the coach, through the west gate, looking down the lane.
    spawn: { x: OUT.x, z: OUT.z, yaw: OUT.yaw },
    zones: [
      // The lane, plus the strip of road at the west end you get off the coach onto.
      { id: 'chengdu', x0: ROADX - 1.8, x1: GE + 2.6, z0: NF, z1: SF, light: [0, 4.2, 1.0] },
      // The courtyard — and it reaches back into the lane on purpose. `clampMove` only
      // considers zones the body is already standing in, so two zones that merely *touch* at
      // z = SF can never be walked between: the body is clamped to the lane's edge minus its own
      // 0.30 m radius and the mouth is sealed by arithmetic rather than by anything you could
      // see. Overlapping them by the depth of the lane is what makes the courtyard enterable.
      { id: 'yard', x0: YX0, x1: YX1, z0: NF, z1: YZ1, light: [7.0, 4.2, 8.0] },
    ],
    // Which of the two the body is in, for the lighting. Inside the courtyard mouth it is the
    // yard; anywhere else along the lane it is the lane.
    roomAt(x, z) {
      return (x > YX0 && x < YX1 && z > SF) ? this.zones[1] : this.zones[0];
    },
  });
});
