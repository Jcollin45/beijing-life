// 街 — 公共. The civic district: the two 地铁 mouths, the 公司 lobby's ground plane, the 药店,
// and the fabric of notices, bins, brooms and boards that is what actually makes a Beijing
// pavement read as a Beijing pavement rather than as a street with Chinese signs on it.
//
// Registered against the `StreetFit` registry in js/street.js. ONLY ADD: the shell already
// builds both metro mouths (`metroMouth`), the office lobby (`OFZ`), and the far parade the
// pharmacy sits on. What is here is what those are missing.
//
// ------------------------------------------------------------------ what the shell already has
// Deliberately NOT rebuilt, because street.js draws it:
//   the stair pit and its tread nosings, the two side balustrades and their handrails, the
//   canopy and its posts, the 地铁站 fascia and the station totem — all of `metroMouth`;
//   the office's granite surround, its two glass leaves, the shallow lobby with its lift, the
//   turnstile pedestals, the tenant board, the steel 文化传媒 plate and the blade sign;
//   the parade's shopfronts, canopies, signboards and shutters.
//
// ------------------------------------------------------------------ measurements this file uses
// From the coordinate contract on `S`, plus two numbers measured off the shell and named here
// once so nothing below re-measures them:
//
//   FX   41.60   the far building line. The parade's shopfront glass is at 41.49, its signboards
//                at 41.34..41.54, its canopy front at 41.225, its shutters at 41.31..41.53.
//   PLIM 39.50   the furthest east the body can ever stand. The road zone ends at SW1 - 1.2 =
//                39.8 and `clampMove` insets it by the 0.30 m body radius. Everything this file
//                puts between 39.6 and 41.2 is therefore in a strip the body can never enter,
//                which is why almost none of it carries a collider: a collider there could only
//                ever narrow the 2.0 m of walkable pavement and never widen it.
//
// ------------------------------------------------------------------ the traps this file respects
//   * Sign TEXT is `mode: 1` with NO glow. The panel behind it glows. Emissive glyphs put dozens
//     of small light-mask quads in frame and the bloom smears them into a haze.
//   * Panels are `box`es, not `flat` quads: a quad is single-sided and would vanish from behind.
//     `flat` is used here only for ground markings, which are only ever seen from above.
//   * No two faces share a plane where they overlap. The smallest offset below is 14 mm.
//   * Every prop is given a colour explicitly, and every colour array is indexed with `% length`
//     of a bounded integer. One `undefined` colour puts the boot overlay up.
StreetFit['civic'] = S => {
  const { box, cyl, ball, taper, flat, glyphs, cap, solid, shade, glow, thing, light, C, G, col,
          BLADE, BLADEH } = S;

  const FX = 41.60;                    // far building line
  const PLIM = 39.50;                  // furthest east the body can stand

  // ---- palette. The metro line colours belong to invented lines on an invented network; the
  // two greens are the two greens every Chinese chemist's is — the cross and the fascia.
  const LINE10 = C('#1a9fd8'), LINE6 = C('#c0348c');
  const SIGNW  = C('#eaeef0'), INK = C('#20242a'), SUBINK = C('#4a5058');
  const RX     = C('#1f9455'), RXD = C('#12633a'), RXL = C('#5fd08e');
  const BRASS  = C('#b08d3e'), BRASSD = C('#7d6228');
  const TACT   = C('#cfa32a'), TACTD = C('#b78f22');   // 盲道, the tactile paving
  const POSTG  = C('#1d6b4f');                          // the post box
  const HIVIS  = C('#e0631f');                          // 环卫 orange
  const REDV   = C('#a8342c');                          // 志愿者 red

  // ---- what the clock drives. Collected as it is built and written only when the hour has
  // actually moved it, not once a frame.
  const lit = [];        // { p, g0, k }  emissive panels that come up after dark
  const pools = [];      // { g, k }      the pool each one throws on the paving
  const lamps = [];      // real lights, switched with the dark
  const swap = [];       // { p, m0, on(h) } props that are only there at some hours
  const AWAY = M.trs(0, -90, 0, 0, .001, .001, .001);
  const emis = (p, k = 1) => { lit.push({ p, g0: p.glow || 0, k }); return p; };
  const pool = (x, z, w, d, k, c) => {
    pools.push({ g: glow(M.trs(x, .034, z, 0, w, 1, d), c || C('#ffd8a4'), 0), k }); };
  const hours = (p, on) => {
    if (!p.stateOwner) p.stateOwner = 'civic:state';
    swap.push({ p, m0: p.m, on }); return p;
  };

  // ============================================================ 地铁 the two entrances
  //
  // `metroMouth` builds the hole in the ground and the sign over it. What it does not build is
  // anything that tells you which station this is, which line it is on, what the network looks
  // like, or that you are about to walk through a bag scanner — and the scanner is the single
  // most recognisable object at a Beijing metro entrance. A mouth without one is a mouth in some
  // other city.
  //
  // All raised fittings either hang off the mouth or sit inside its unchanged
  // `solid(cx-1.03, cx+1.03, cz-.80, cz+1.12)` footprint. The map and bin used to add two more
  // pavement colliders; both are structure-mounted now, so the first four metres contain only
  // flush tactile paving and the existing stair footprint.
  //
  // Tags matter here. The shell tags its own mouth 'metro1'/'metro2' and hangs the 地铁站 thing
  // off that tag, so anything that should open 地铁站 when you point at it takes the same tag —
  // but the map and the scanner get tags of their own, because `pick` resolves a tag to the
  // nearest thing wearing it and a second thing on 'metro1' would start answering for the door.
  function metroFit(cx, cz, tag, o) {
    const T = { tag };
    const LC = o.lineCol;

    // ---- station identity. The former 2.46 m board hung at eye height straight across the stair
    // and turned an entrance into a white barricade. This framed, shallow sign sits above a full
    // two metres of clear opening. Its two separated message rails, edge frame, line badge and
    // exit plate read as fitted signwork from both sides; there is no blank rear billboard.
    const signZ = cz - .405;
    for (const y of [2.025, 2.335])
      box(cx + .06, y, signZ + .018, 1.54, .040, .070, col.steelD,
        { hard:true, gloss:G.metal, ...T });
    for (const x of [cx - .71, cx + .83])
      box(x, 2.18, signZ + .018, .040, .27, .070, col.steelD,
        { hard:true, gloss:G.metal, ...T });
    box(cx - .585, 2.18, signZ - .018, .18, .23, .018, LC,
      { hard:true, mode:1, gloss:.20, ...T });
    emis(box(cx + .16, 2.235, signZ - .012, .92, .105, .018, C('#23384d'),
      { hard:true, gloss:.20, glow:.016, ...T }), .24);
    emis(box(cx + .16, 2.105, signZ - .012, .92, .065, .018, C('#d6e1e3'),
      { hard:true, gloss:.18, glow:.012, ...T }), .18);
    glyphs(cx + .16, 2.235, signZ - .030, Math.PI, o.name,
      { size:.080, gap:.024, color:SIGNW, mode:1, lift:.008, tag });
    glyphs(cx + .16, 2.105, signZ - .030, Math.PI, o.pinyin,
      { size:.036, gap:.009, color:SUBINK, mode:1, lift:.008, tag });
    glyphs(cx - .585, 2.18, signZ - .036, Math.PI, o.line,
      { size:.040, gap:.006, color:SIGNW, mode:1, lift:.007, tag });

    // 出入口 occupies the fascia's deliberately open right-hand bay. Twin short brackets tie the
    // plate back to the canopy cross-member and keep its lower edge above the station-name frame.
    for (const x of [cx + .69, cx + .98])
      box(x, 2.65, cz - .33, .035, .30, .035, col.steelD,
        { hard:true, gloss:G.metal, ...T });
    emis(box(cx + .835, 2.51, cz - .405, .34, .22, .028, SIGNW,
      { hard:true, gloss:.20, glow:.018, ...T }), .32);
    box(cx + .835, 2.51, cz - .378, .39, .265, .022, col.steelD,
      { hard:true, gloss:G.metal, ...T });
    emis(box(cx + .835, 2.51, cz - .414, .33, .21, .018, SIGNW,
      { hard:true, gloss:.20, glow:.018, ...T }), .32);
    // At yaw PI the larger x is the visual left, hence letter then 口 in world coordinates.
    glyphs(cx + .91, 2.51, cz - .438, Math.PI, o.exitLetter,
      { size:.135, gap:0, color:INK, mode:1, lift:.007, tag });
    glyphs(cx + .765, 2.51, cz - .438, Math.PI, '口',
      { size:.085, gap:0, color:SUBINK, mode:1, lift:.007, tag });

    // ---- 线路图. A rail-mounted schematic, not a white billboard. Two stand-off brackets carry
    // a 36 cm open frame; the only face is lightly translucent glass, densely fitted with a header,
    // coloured routes and interchange nodes. Daylight remains visible beneath and around it, and
    // its right edge stays inside the mouth collider.  On the constrained 商务区 footway it is
    // mounted to the kerb-side rail; putting it on the building side would spend 31 cm of the
    // recovered two-metre through-route.  The hutong mouth keeps its original side.
    const constrained = tag === 'metro1';
    const mx = cx + (constrained ? -.84 : 1.16), mountX = cx + (constrained ? -.93 : 1.07);
    const mz = cz - .44, MT = { tag:'线路图' };
    for (const y of [1.23, 1.57]) {
      box(mountX, y, mz + .055, .18, .026, .050, col.steelD,
        { hard:true, gloss:G.metal, ...MT });
      cap(mountX, y - .045, mz + .06, .012, .16, .012, col.steelD,
        { rz:-.72, gloss:G.metal, ...MT });
    }
    for (const x of [mx - .165, mx + .165])
      box(x, 1.40, mz, .026, .48, .045, col.steelD,
        { hard:true, gloss:G.metal, ...MT });
    for (const y of [1.16, 1.64])
      box(mx, y, mz, .36, .026, .045, col.steelD,
        { hard:true, gloss:G.metal, ...MT });
    box(mx, 1.40, mz - .028, .30, .41, .012, C('#b9d2d7'),
      { hard:true, mode:1, alpha:.38, gloss:G.glass, ...MT });
    emis(box(mx, 1.58, mz - .045, .28, .055, .012, C('#1b4f86'),
      { hard:true, mode:1, glow:.018, ...MT }), .22);
    glyphs(mx, 1.58, mz - .054, Math.PI, '线路图',
      { size:.033, gap:.007, color:SIGNW, mode:1, lift:.006, tag:'线路图' });
    const runs = [[LINE10, -.015, .075, .25, 0], [LINE6, .015, -.025, .25, .34],
                  [C('#c8442f'), -.025, -.115, .22, -.28], [C('#3f8f4c'), .025, .145, .20, .18]];
    for (const [c, dx, dy, w, rz] of runs)
      box(mx + dx, 1.38 + dy, mz - .050, w, .014, .009, c,
        { hard:true, rz, mode:1, gloss:.10, ...MT });
    for (let i = 0; i < 6; i++)
      cyl(mx - .115 + i * .046, 1.38 + Math.sin(i * 1.45) * .085, mz - .060,
        .009, .008, INK, { rx:Math.PI / 2, mode:1, gloss:.10, ...MT });
    for (const x of [mx - .08, mx + .08])
      box(x, 1.22, mz - .048, .11, .035, .009, SIGNW,
        { hard:true, mode:1, gloss:.12, ...MT });
    thing('线路图', mx, 1.40, mz - .07, '你看一下线路图，我们坐几号线？',
      'Have a look at the route map — which line do we take?',
      '线 line + 路 route + 图 diagram. 换乘 is to change lines; 几号线 asks which line.',
      { tag: '线路图', focus: o.mapFocus, reach: 2.0 });

    // ---- 盲道. The tactile paving: a guidance strip down the approach and a warning strip of
    // studs across the head of the flight. It is on every metre of pavement in this city and it
    // was on none of this one. Flat quads — they are only ever seen from above, and a quad is a
    // quarter of the geometry of a box.
    flat(cx, .014, cz - 2.35, .40, 2.90, TACT, { gloss: .12, ...T });
    for (let i = 0; i < 11; i++)
      flat(cx, .028, cz - 3.66 + i * .225, .34, .085, TACTD, { gloss: .10, ...T });
    flat(cx, .014, cz - 1.06, 1.90, .34, TACT, { gloss: .12, ...T });
    for (let i = 0; i < 8; i++) for (const dz of [-1.13, -.99])
      cyl(cx - .78 + i * .222, .030, cz + dz, .030, .014, TACTD, { gloss: .10, ...T });

    // ---- 安检. Two genuinely open tunnels share the landing: a walk-through sensor arch and a
    // skeletal bag lane. There is no cabinet, side shell, curtain or waist-high face. The belt is
    // nine separate rollers on four legs; every other piece is a post or rail with daylight around
    // it, including in the exact station-return sightline.
    const sz0 = cz + .37, sx0 = cx + .39, ST = { tag:'安检' };
    for (const q of [-1, 1]) {
      const z = sz0 + q * .27;
      for (const s of [-1, 1])
        box(sx0 + s * .26, 1.14, z, .038, 1.20, .038, C('#596269'),
          { hard:true, gloss:.34, ...ST });
      box(sx0, 1.75, z, .56, .045, .038, C('#41484e'),
        { hard:true, gloss:.32, ...ST });
    }
    for (const s of [-1, 1]) {
      box(sx0 + s * .26, 1.75, sz0, .038, .045, .58, C('#41484e'),
        { hard:true, gloss:.32, ...ST });
      box(sx0 + s * .265, .49, sz0, .028, .055, 1.04, col.steelD,
        { hard:true, gloss:G.metal, ...ST });
    }
    for (let i = 0; i < 9; i++)
      cyl(sx0, .50, sz0 - .46 + i * .115, .018, .48, col.steel,
        { rz:Math.PI / 2, gloss:G.metal, ...ST });
    for (const q of [-1, 1]) for (const s of [-1, 1])
      box(sx0 + s * .245, .25, sz0 + q * .46, .032, .50, .032, col.steelD,
        { hard:true, gloss:G.metal, ...ST });
    for (const s of [-1, 1]) for (const y of [1.01, 1.31, 1.60])
      emis(ball(sx0 + s * .235, y, sz0 - .285, .016, .016, .016,
        s < 0 ? C('#62b778') : C('#d3a245'), { mode:1, glow:.035, ...ST }), .20);

    const wx = cx - .45;
    for (const q of [-1, 1]) {
      const z = sz0 - .02 + q * .17;
      for (const s of [-1, 1])
        box(wx + s * .25, 1.03, z, .042, 1.72, .042, C('#5d666e'),
          { hard:true, gloss:.34, ...ST });
      box(wx, 1.91, z, .54, .050, .042, C('#4a5259'),
        { hard:true, gloss:.32, ...ST });
    }
    for (const s of [-1, 1])
      box(wx + s * .25, 1.91, sz0 - .02, .042, .050, .38, C('#4a5259'),
        { hard:true, gloss:.32, ...ST });
    for (const s of [-1, 1]) for (const q of [-1, 1])
      box(wx + s * .25, .18, sz0 - .02 + q * .17, .10, .045, .10, col.steelD,
        { hard:true, gloss:G.metal, ...ST });
    for (const s of [-1, 1])
      emis(box(wx + s * .13, 1.91, sz0 - .215, .035, .022, .014,
        s < 0 ? C('#62b778') : C('#d3a245'), { hard:true, mode:1, glow:.05, ...ST }), .25);

    // The screen clips to the east tunnel post; the wand hangs from the west arch. Neither gains a
    // stand, table or cabinet of its own.
    box(sx0 + .285, 1.43, sz0 + .08, .020, .22, .27, C('#26292d'),
      { hard:true, gloss:.30, ...ST });
    emis(box(sx0 + .273, 1.43, sz0 + .08, .009, .175, .22, C('#2a5068'),
      { hard:true, mode:1, glow:.035, ...ST }), .26);
    cap(wx - .285, 1.18, sz0 - .12, .014, .24, .014, C('#2a2d31'),
      { rz:1.35, gloss:.30, ...ST });

    // A small framed sign bridges the two frames above head height, leaving the whole lower opening.
    emis(box(cx - .03, 2.08, sz0 - .27, .48, .18, .025, C('#1b4f86'),
      { hard:true, gloss:.24, glow:.025, ...ST }), .45);
    for (const x of [cx - .285, cx + .225])
      box(x, 2.08, sz0 - .245, .030, .22, .050, col.steelD,
        { hard:true, gloss:G.metal, ...ST });
    glyphs(cx - .03, 2.08, sz0 - .295, Math.PI, '安检',
      { size:.115, gap:.04, color:SIGNW, mode:1, lift:.008, tag:'安检' });
    thing('安检', cx, 1.30, sz0 - .25, '进地铁站要先过安检，包放传送带上。',
      'To enter the station you go through the security check; bags go on the belt.',
      '安 safe + 检 to inspect. 过安检 is to go through it — every station in the city has one.',
      { tag: '安检', focus: o.checkFocus, reach: 2.4 });

    // ---- the roll-down grille. Down between 23:20 and 05:10 and gone the rest of the day, which
    // is the one thing that says at a glance that the network has shut. A segmented housing stays
    // all day; the closed barrier is an honest open mesh, never a 2.24 × 2.26 m steel slab.
    const shut = h => h >= 23.33 || h < 5.17;
    for (let i = 0; i < 5; i++)
      box(cx - .88 + i * .44, 2.31, cz - .30, .39, .16, .14, col.steelD,
        { hard:true, gloss:.38, ...T });
    for (let i = 0; i < 13; i++)
      hours(box(cx - 1.02 + i * .17, 1.12, cz - .325, .024, 2.04, .024, col.steel,
        { hard:true, gloss:.40, mat:'steel', matScale:.55, matAmt:.40, ...T }), shut);
    for (let i = 0; i < 9; i++)
      hours(box(cx, .13 + i * .245, cz - .327, 2.08, .024, .024, C('#8a9096'),
        { hard:true, gloss:.34, ...T }), shut);
    hours(box(cx, .075, cz - .325, 2.14, .055, .035, col.steelD,
      { hard:true, gloss:.38, ...T }), shut);

    // ---- the centre handrail. The shell puts one down each side; a flight this wide has one up
    // the middle too, and it is the piece that makes a stair read as a public stair.
    cap(cx, .69, cz + .08, .028, 1.72, .028, col.steelD,
      { rx:Math.PI / 2 + .13, gloss:G.metal, ...T });
    for (const [dz, h] of [[-.56, .72], [.52, .55]])
      cap(cx, .10 + h / 2, cz + dz, .024, h, .024, col.steelD,
        { gloss:G.metal, ...T });

    // ---- lit from below. Two tubes under the canopy and a pool on the paving in front of the
    // steps: at night a metro mouth is a lit hole in a dark pavement, and it was as dark as
    // everything round it.
    for (const dz of [.04, .67]) {
      for (const s of [-1, 0, 1])
        emis(box(cx + s * .68, 2.69, cz + dz, .58, .035, .055, C('#e6e6dc'),
          { hard:true, mode:1, glow:.025, ...T }), .46);
      lamps.push(light(cx, 2.58, cz + dz, [.92, .96, 1.0], .46, 4.6));
    }
    pool(cx, cz - .42, 3.0, 2.8, .30, C('#cfe2ee'));

    // ---- compact open litter basket, tucked behind the east rear post. Four legs, two perimeter
    // rings and sparse ties replace the merged green faces visible from the business return.
    const bx = cx + 1.25, bz = cz + .77;
    for (const s of [-1, 1]) for (const q of [-1, 1])
      box(bx + s * .12, .34, bz + q * .09, .024, .58, .024, col.steelD,
        { hard:true, gloss:G.metal, ...T });
    for (const y of [.08, .64]) {
      for (const q of [-1, 1])
        box(bx, y, bz + q * .10, .29, .026, .026, C('#2b3630'),
          { hard:true, gloss:.28, ...T });
      for (const s of [-1, 1])
        box(bx + s * .14, y, bz, .026, .026, .22, C('#2b3630'),
          { hard:true, gloss:.28, ...T });
    }
    for (const s of [-1, 1])
      box(bx + s * .06, .64, bz, .085, .014, .07, C('#171b19'),
        { hard:true, gloss:.16, ...T });
    for (const s of [-1, 1])
      cap(bx + s * .07, .35, bz - .105, .010, .42, .010, C('#3c4a3f'),
        { rz:s * .20, gloss:.22, ...T });
    box(bx, .045, bz - .14, .10, .020, .07, col.steelD,
      { hard:true, gloss:G.metal, ...T });
  }

  metroFit(38.45, -5.20, 'metro1', {
    name: '商务区', pinyin: 'Shangwuqu', line: '10号线', lineCol: LINE10, exitLetter: 'C',
    checkFocus: [38.45, -3.15], mapFocus: [38.20, -7.10],
  });
  metroFit(19.40, 2.30, 'metro2', {
    name: '杨柳胡同', pinyin: 'Yangliu Hutong', line: '6号线', lineCol: LINE6, exitLetter: 'A',
    checkFocus: [19.40, .70], mapFocus: [20.30, -.10],
  });

  // ============================================================ 药店 the chemist's
  //
  // This is a complete second address, not the last pane of the bank. The bank ends at z=-7.75;
  // the pharmacy starts at -6.25, so the visible service/fire reveal is exactly 1.50 m. Its other
  // return stops at -3.35, 30 cm before the corner block ends. Both returns reach the real headwall.
  const PH0 = -6.25, PH1 = -3.35, PHZ = (PH0 + PH1) / 2, PHDOOR = -4.05;
  const PH_OUT = { x: 24.98, z: PHDOOR, yaw: -Math.PI / 2 };
  const PT = { tag: '药店' }, PMAT = { mat: 'plaster', matScale: 2.60, matAmt: .14 };
  Object.assign(S.PHARMACY_OUT, PH_OUT);       // keep Street and pharmacy.js on one return object

  const pharmacyDoor = thing('药店', 23.66, 3.62, PHZ,
    '药店几点关门？', 'What time does the pharmacy shut?',
    '药 medicine + 店 shop. 买药 is to buy medicine; 药方 is a prescription.',
    { focus: [PH_OUT.x, PH_OUT.z], reach: 2.5, tag: '药店' });
  pharmacyDoor.exit = { place: 'pharmacy', at: { x: 1.90, z: -2.55, yaw: 0 } };

  // Real returns and headwall. The outer face is x=23.66; glass at x=23.50 is recessed 16 cm.
  // No collider is added: the corner block already owns the wall and its walk zone keeps player
  // centres at x>=24.30, leaving the whole 2.52 m kerb-side footway intact.
  const PW = PH1 - PH0, DIV = -4.72;
  box(23.32, .26, PHZ, .66, .52, PW, col.stoneD, { hard: true, gloss: .24, ...PT });
  for (const z of [PH0 + .17, PH1 - .17])
    box(23.32, 2.08, z, .66, 4.16, .34, col.render,
      { hard: true, gloss: G.paint, ...PMAT, ...PT });
  box(23.32, 3.70, PHZ, .66, .92, PW, col.render,
    { hard: true, gloss: G.paint, ...PMAT, ...PT });
  box(23.38, 1.48, DIV, .54, 2.96, .14, col.charcoal,
    { hard: true, gloss: .28, ...PT });

  // Display window: three open shelf lines and varied medicine boxes sit behind the glass, so the
  // address reads as a working chemist before any lettering is legible.
  const W0 = PH0 + .34, W1 = DIV - .10, WZ = (W0 + W1) / 2, WW = W1 - W0;
  emis(box(23.435, 1.48, WZ, .045, 2.60, WW, C('#a9bcae'),
    { hard: true, mode: 1, glow: .025, ...PT }), .25);
  const BOXC = [C('#c8492f'), C('#2f6fa8'), C('#d9b13f'), C('#4f8f52'), C('#b4573f'), C('#3f7f86')];
  for (let sh = 0; sh < 3; sh++) {
    const sy = .62 + sh * .68;
    box(23.465, sy, WZ, .055, .04, WW - .12, C('#d8d2c2'),
      { hard: true, gloss: .22, ...PT });
    for (let i = 0; i < 5; i++) {
      // A working pharmacy shelf is faced and restocked by hand, not stamped as a perfect 3×5
      // primitive grid.  Two intentional gaps, three carton heights and shallow alternating rows
      // preserve order without making the whole window read as one repeated mesh.
      if ((sh === 1 && i === 2) || (sh === 2 && i === 0)) continue;
      const bh = [.22,.27,.24][(i + sh) % 3], bw = [.11,.14,.12][(i * 2 + sh) % 3];
      const depth = [.070,.085,.062][(i + sh * 2) % 3];
      box(23.48 - depth * .08, sy + bh * .5 + .025,
        W0 + .15 + i * ((WW - .30) / 4) + ((i + sh) % 2 ? .018 : -.012),
        depth, bh, bw, BOXC[(i * 5 + sh * 2) % BOXC.length],
        { hard: true, gloss: .24, ...PT });
    }
  }
  box(23.50, 1.48, WZ, .035, 2.54, WW - .05, col.glassDay,
    { hard: true, mode: 1, alpha: .42, gloss: G.glass, ...PT });
  for (const y of [.18, 2.78])
    box(23.60, y, WZ, .24, .14, WW + .10, col.charcoal, { hard: true, gloss: .28, ...PT });
  for (const z of [W0 - .04, W1 + .04])
    box(23.60, 1.48, z, .24, 2.74, .12, col.charcoal, { hard: true, gloss: .28, ...PT });

  // Recessed double door. A dim counter and shelf line behind it give the opening depth at night;
  // the clear 1.08 m threshold and tactile route have no queue rail or freestanding clutter.
  emis(box(23.435, 1.46, PHDOOR, .045, 2.62, 1.10, C('#b9c9bf'),
    { hard: true, mode: 1, glow: .025, ...PT }), .22);
  box(23.46, .53, PHDOOR - .02, .06, .88, .72, C('#c2bcae'),
    { hard: true, gloss: .25, ...PT });
  box(23.47, .98, PHDOOR - .02, .07, .05, .76, C('#8d8579'),
    { hard: true, gloss: .30, ...PT });
  for (const s of [-1, 1]) {
    box(23.50, 1.45, PHDOOR + s * .27, .035, 2.58, .50, col.glassDay,
      { hard: true, mode: 1, alpha: .45, gloss: G.glass, ...PT });
    cap(23.56, 1.22, PHDOOR + s * .11, .020, .62, .020, col.steel,
      { rx: Math.PI / 2, gloss: G.metal, ...PT });
  }
  box(23.60, 1.45, PHDOOR, .24, 2.72, .07, col.charcoal, { hard: true, gloss: .30, ...PT });
  for (const z of [PHDOOR - .58, PHDOOR + .58])
    box(23.60, 1.45, z, .24, 2.72, .12, col.charcoal, { hard: true, gloss: .30, ...PT });
  box(23.60, 2.82, PHDOOR, .24, .14, 1.28, col.charcoal, { hard: true, gloss: .30, ...PT });
  flat(23.91, .019, PHDOOR, .62, 1.18, col.stoneD, { gloss: .22, ...PT });
  flat(24.48, .020, PHDOOR, 1.14, .28, TACT, { gloss: .12, ...PT });

  // Restrained green fascia fixed to the headwall. The glyphs stay unlit; only the returned panel
  // and a small projecting cross brighten at night, preserving legibility without bloom haze.
  emis(box(23.66, 3.70, PHZ, .12, .46, PW - .38, RXD,
    { hard: true, mode: 1, glow: .018, gloss: .24, ...PT }), .34);
  glyphs(23.735, 3.75, PHZ - .30, Math.PI / 2, '药店',
    { size: .31, gap: .11, color: C('#f4fff8'), mode: 1, lift: .012, tag: '药店' });
  glyphs(23.735, 3.47, PHZ - .30, Math.PI / 2, '中西药',
    { size: .115, gap: .04, color: C('#dff4e8'), mode: 1, lift: .010, tag: '药店' });
  glyphs(23.735, 3.65, PHZ + .78, Math.PI / 2, '24小时',
    { size: .105, gap: .032, color: C('#bfe8cf'), mode: 1, lift: .010, tag: '药店' });

  // Keep the projecting cross on the pharmacy return: even its 66 cm horizontal arm leaves
  // 1.29 m of the 1.50 m inter-address reveal visually open beside the bank.
  const CROSSZ = PH0 + .12;
  box(23.51, 3.18, CROSSZ, .34, .08, .08, col.steelD, { hard: true, gloss: G.metal, ...PT });
  box(23.82, 3.18, CROSSZ, .15, .66, .15, C('#f4fff8'), { hard: true, gloss: .22, ...PT });
  box(23.82, 3.18, CROSSZ, .17, .22, .66, C('#f4fff8'), { hard: true, gloss: .22, ...PT });
  emis(box(23.825, 3.18, CROSSZ, .19, .54, .19, RX,
    { hard: true, mode: 1, glow: .08, ...PT }), .64);
  emis(box(23.825, 3.18, CROSSZ, .21, .19, .54, RX,
    { hard: true, mode: 1, glow: .08, ...PT }), .64);
  lamps.push(light(24.02, 3.04, PHZ, [.42, 1.0, .62], .38, 3.7));

  // Required civic plates remain on the divider, not in the 1.50 m service reveal or the doorway.
  box(23.67, 1.72, DIV, .04, .34, .25, C('#1b4f86'), { hard: true, gloss: .30, ...PT });
  glyphs(23.695, 1.72, DIV, Math.PI / 2, '医保定点',
    { size: .064, gap: .010, color: SIGNW, mode: 1, vertical: true, lift: .007, tag: '药店' });
  box(23.67, 1.28, DIV, .04, .20, .19, C('#d8d2c2'), { hard: true, gloss: .24, ...PT });
  glyphs(23.695, 1.28, DIV, Math.PI / 2, '门前三包',
    { size: .038, gap: .005, color: INK, mode: 1, lift: .006, tag: '药店' });

  pool(24.42, PHZ, 2.2, 3.2, .20, C('#bff0d2'));

  // ============================================================ 西人行道 the west footway's wall
  //
  // A12 (footway half), B7 and B8 of STOREFRONT-UPGRADES.md. Measured off the shell rather than
  // taken from the brief:
  //
  //   23.30   the corner block's east face — js/street.js, box(17.6, 7.6, -11.05, 11.4, 15.2, 16.0)
  //           spans x 11.90..23.30, z -19.05..-3.05. Not 23.42: that is the BANK's datum, and its
  //           stone skin (js/street-bank.js:69, FACE-.14 by .28) fronts at 23.56.
  //   24.30   where `clampMove` holds the body — the road zone starts at x 24.0 (js/street.js:3990)
  //           and the 0.30 m body radius insets it. Nothing below carries a collider: a collider in
  //           that strip could only ever narrow the footway.
  //   -13.50  the road zone's own z0, so this is where the wall stops being visible from anywhere
  //           a body can stand.
  //
  // Which leaves exactly three bare stretches of render on the whole elevation, since the branch
  // covers z -11.40..-7.10 and the chemist's shell -6.90..-3.60:
  //
  //     -13.50 .. -11.40    2.10 m   south of the branch      B8, the service end
  //      -7.10 ..  -6.90    0.20 m   between the two shops    B7, the downpipe
  //      -3.60 ..  -3.05    0.55 m   north of the chemist     B8, the north return
  //
  // B8 in the brief calls the south stretch "-13.5 .. -13.3". There is nothing at -13.30 and never
  // was; the number that ends that stretch is the bank's own Z0 at -11.40, which is 2.10 m of wall,
  // not 0.20 m. Built to the measurement.
  //
  // Facing: this elevation looks +x, so wall-mounted glyphs take yaw +PI/2. The two 侧招 are the
  // exception — a projecting sign is read from up and down the pavement, so its faces look ±z.
  const PIPE = C('#8e8778'), PIPED = C('#5f5a4e');
  const DOORG = C('#798086'), DOORD = C('#4c5257'), ACW = C('#dcd8cc'), ACD = C('#96928a');
  const HYD = C('#a8322a'), HYDD = C('#761f19'), BOLL = C('#3d434a'), BOLLR = C('#d6d1c0');
  const METER = C('#b6b2a6'), REDP = C('#9c2f26'), BLADEB = C('#6e1c17');

  // ---- A12. The district's 侧招 rank stopped at the alley: 超市, 面馆 and 五金 all hang off
  // S.BLADE 2.55 / S.BLADEH .56 (js/street.js:158) and the west footway had none, so walking the
  // length of it you saw two frontages edge-on and could read neither.
  //
  // Both go on the block's own render at the ends of the run, not on the shopfronts. The branch's
  // entire 4.30 m elevation is under its own canopy — js/street-bank.js builds it at FACE+.30,
  // y 3.04..3.16, across z -11.35..-7.15 — and a blade whose top stay is at 2.90 would spend its
  // life 14 cm under a soffit, invisible from either direction. So 银行's takes the blank wall
  // south of the branch and 药店's the 0.55 m return north of the chemist, where it is the first
  // thing read walking south off the second crossing.
  //
  // One emissive panel each, and it is dark until `nightAt` brings it up — the case, the stays and
  // the characters are all unlit, which is the rule this district pays the most for.
  bladeE(-11.62, 1.10, C('#c4222a'), C('#f0d68a'), '银行');
  bladeE(-3.42, 1.10, C('#1f9455'), C('#f4fff8'), '药店');

  // Mirrored from js/street-retail.js's `blade` — its 'x' case cantilevers in -x off a frontage
  // that faces -x, and this elevation faces +x, so `cx` is +.15 out instead of -.11 and the stays
  // hang off the near end. The 20 cm wall plate is buried from 23.24 to 23.44 so it reads as fixed
  // whether the render behind it is at 23.30 or the bank's 23.56, and shares a plane with neither.
  //
  // The case is SHALLOWER than the panel, and that is the whole difference between this and the
  // helper it is mirrored from. street-retail.js:147 builds the case at `T*2 + .05` = .20 deep and
  // the lit panel at `T*2` = .15 inside it, with the characters at ±.088 — so the case's own face
  // at ±.10 is in front of both, and a 侧招 built that way renders as a blank slab of case colour
  // with no panel and no text on it. Verified on the live site: the first cut of these two came
  // out as two dark red rectangles. So here the case is .13 (±.065), the panel .17 (±.085) and the
  // characters sit 12 mm off the panel — a returned frame with the lit face proud of it, which is
  // what a light box actually is. TICKET, L2: js/street-retail.js's three alley blades are built
  // by that helper and appear to have the same defect.
  function bladeE(z, out, base, ink, text) {
    const T = .075, size = Math.min(BLADEH * .68, (out - .20) / text.length * .88);
    const cx = 23.45 + out / 2;
    box(23.34, BLADE, z, .20, BLADEH * .86, .22, col.steelD, { hard: true, gloss: .34 });
    box(cx, BLADE, z, out, BLADEH + .06, T * 2 - .02, BLADEB, { hard: true, gloss: .26 });
    const panel = box(cx, BLADE, z, out - .09, BLADEH - .05, T * 2 + .02, base,
      { hard: true, mode: 1, gloss: .20 });
    for (const s of [-1, 1])
      glyphs(cx, BLADE, z + s * (T + .022), s > 0 ? 0 : Math.PI, text,
        { size, gap: size * .20, color: ink, mode: 1, lift: .008 });
    for (const sy of [-1, 1])
      cyl(cx - .01, BLADE + sy * (BLADEH / 2 + .07), z, .012, out * .96, col.steelD,
        { rz: Math.PI / 2, gloss: G.metal });
    return emis(panel, .55);
  }

  // ---- B7/B8. 落水管, three of them, one on each bare stretch — which is where a downpipe goes,
  // because it comes down the party line between two units and not through one. 6 cm proud of the
  // 23.30 face at x 23.42, so the pipe and the render never share a plane.
  downpipe(-13.42);      // the south return, clear of the zone edge at -13.50 by 4 cm
  downpipe(-7.00);       // B7 — dead centre of the 0.20 m gap between 银行 and 药店
  downpipe(-3.18);       // the north return, 13 cm off the block corner at -3.05
  function downpipe(z) {
    const top = 9.60;
    cyl(23.42, (top + .18) / 2, z, .058, top - .18, PIPE, { gloss: .30 });
    box(23.40, top + .13, z, .26, .26, .19, PIPE, { hard: true, gloss: .28 });      // hopper head
    cyl(23.47, .10, z, .062, .34, PIPE, { rz: -.34, gloss: .30 });                  // the shoe
    for (const by of [1.86, 4.62, 7.38])
      box(23.36, by, z, .14, .045, .13, PIPED, { hard: true, gloss: .34 });
  }

  // ---- B7. 电表箱 and the fire plate, both on the chemist's south jamb, which is the only wall
  // between the two shops that is wider than the downpipe. The jamb face is 23.64 (the shell of the
  // unit, `box(23.26, 2.10, PHZ ± 1.50, .76, 4.20, .30)`), so a 16 cm cabinet centred at 23.73
  // stands 10 mm clear of it.
  const MZ = -6.75;
  box(23.73, 1.36, MZ, .16, .44, .28, METER, { hard: true, gloss: .30 });
  box(23.815, 1.36, MZ, .02, .38, .24, C('#9d9a90'), { hard: true, gloss: .34 });
  cyl(23.83, 1.36, MZ + .10, .014, .05, col.steelD, { rz: Math.PI / 2, gloss: G.metal });
  box(23.83, 1.62, MZ, .02, .09, .16, C('#d8cf3a'), { hard: true, gloss: .26 });
  glyphs(23.845, 1.62, MZ, Math.PI / 2, '有电危险',
    { size: .036, gap: .006, color: C('#2a2118'), mode: 1, lift: .005 });
  box(23.67, 2.06, MZ, .04, .22, .26, REDP, { hard: true, gloss: .28 });
  glyphs(23.695, 2.06, MZ, Math.PI / 2, '消火栓',
    { size: .055, gap: .010, color: C('#f4ece0'), mode: 1, lift: .006 });

  // ---- B7. The 消火栓 itself, standing on the pavement under its plate. x 23.95 puts the widest
  // part at 24.06, which is 24 cm inside the 24.30 the body is held at, so it needs no collider.
  cyl(23.95, .34, -6.62, .105, .68, HYD, { gloss: .32 });
  cyl(23.95, .05, -6.62, .17, .10, HYDD, { gloss: .26 });
  cyl(23.95, .73, -6.62, .085, .10, HYDD, { gloss: .30 });
  for (const s of [-1, 1])
    cyl(23.95, .50, -6.62 + s * .13, .045, .12, HYDD, { rx: Math.PI / 2, gloss: .34 });
  cyl(24.05, .60, -6.62, .038, .09, HYDD, { rz: Math.PI / 2, gloss: .34 });

  // ---- B7. 隔离桩 along the branch's frontage, which is what stops a car parking against a bank's
  // glass and is on the pavement outside every one of them. At x 24.16 they stand in the 0.88 m
  // strip in front of the glazing that the body can never enter, so no collider — and the pair
  // either side of the entrance at MID -9.25 is left out, because a bollard line across a door is
  // a bollard line nobody would have built.
  for (const bz of [-11.10, -10.30, -8.20, -7.40]) {
    cyl(24.16, .42, bz, .058, .84, BOLL, { gloss: .34 });
    cyl(24.16, .855, bz, .062, .05, BOLL, { gloss: .38 });
    cyl(24.16, .66, bz, .064, .07, BOLLR, { gloss: .26 });
  }

  // ---- B8, the south return. A service door, and the air-con bank over it. No new mass: the door
  // is a frame and a leaf standing 5 cm off the render, not a box bolted to it, and the units hang
  // on brackets the way every condenser in this city does. This is the stretch the bus shelter
  // stands in front of (x 25.00..27.10, z -15.7..-8.3), so it is read over the shelter roof from
  // the north, which is why the units are up at 3.2 m and not at head height.
  const SDZ = -12.80;
  box(23.34, 1.08, SDZ, .18, 2.16, 1.10, DOORD, { hard: true, gloss: .26 });          // frame
  box(23.41, 1.04, SDZ, .06, 2.04, .96, DOORG,
    { hard: true, gloss: .34, mat: 'steel', matScale: .50, matAmt: .30 });            // leaf
  for (const dz of [-.40, .40])
    box(23.455, 1.04, SDZ + dz, .02, 1.96, .04, DOORD, { hard: true, gloss: .38 });
  cyl(23.47, 1.02, SDZ - .36, .022, .22, col.steel, { gloss: G.metal });              // lever
  box(23.46, 1.72, SDZ, .02, .13, .30, C('#d8d2c2'), { hard: true, gloss: .24 });
  glyphs(23.475, 1.72, SDZ, Math.PI / 2, '配电间',
    { size: .066, gap: .012, color: INK, mode: 1, lift: .006 });

  for (let i = 0; i < 3; i++) {
    const ay = 3.20 + i * 1.06;
    box(23.49, ay, SDZ, .34, .58, .82, ACW, { hard: true, gloss: .24 });
    box(23.665, ay, SDZ, .02, .46, .70, ACD, { hard: true, gloss: .20 });             // the grille
    cyl(23.665, ay, SDZ, .17, .03, C('#b4b0a6'), { rz: Math.PI / 2, gloss: .26 });    // fan boss
    for (const s of [-1, 1])
      box(23.42, ay - .32, SDZ + s * .34, .30, .05, .05, DOORD, { hard: true, gloss: .34 });
  }
  cyl(23.37, 3.90, SDZ + .58, .034, 2.60, C('#7a7468'), { gloss: .28 });              // the pipe run

  // ============================================================ 公司 the office's ground plane
  //
  // The shell builds the lobby: granite jambs, two glass leaves, the shallow room behind them
  // with its lift and turnstiles, the tenant board and the blade sign. What it does not build is
  // the pavement in front of it, which is where an office block in this city actually happens —
  // the guard at his podium, the bikes, the smokers round the ashtray, the courier waiting with
  // his parcels. All of it stands east of 39.6, in the strip the body can never enter, so none of
  // it carries a collider and none of it can narrow the 2.0 m of walkable pavement.
  const OFZ = 2.20, OT = { tag: '公司' };

  // ---- the building's own brass plate, on the north jamb. The steel one the shell hangs on the
  // south jamb is the TENANT's — 文化传媒, 四层. This is the building, which is a different thing
  // and is always brass and always screwed to the granite.
  const BPZ = OFZ - 1.58;
  box(40.965, 1.66, BPZ, .035, .58, .30, BRASS, { hard: true, gloss: .52, ...OT });
  box(40.943, 1.66, BPZ, .012, .52, .25, BRASSD, { hard: true, gloss: .46, ...OT });
  glyphs(40.925, 1.75, BPZ, -Math.PI / 2, '京华大厦',
    { size: .075, gap: .018, vertical: true, color: C('#3a2f14'), mode: 1, lift: .007, tag: '公司' });
  glyphs(40.925, 1.46, BPZ, -Math.PI / 2, 'A座',
    { size: .058, gap: .016, color: C('#5a4b26'), mode: 1, lift: .007, tag: '公司' });
  for (const dz of [-.11, .11]) for (const dy of [-.24, .24])
    cyl(40.955, 1.66 + dy, BPZ + dz, .011, .014, C('#e2c878'),
      { rz: Math.PI / 2, gloss: .60, ...OT });

  // ---- 保安. The guard's podium at the south edge of the door: a lectern with the day book on
  // it, a thermos, a torch, the folding chair he is not sitting on and a cone.
  //
  // No figure. street.js took its static capsule people out on purpose — "beside a figure off the
  // real rig they were the worst thing on the street" — and the people who pass this door are
  // drawn by that rig out of game.js, not built into the scene. What stays here is the furniture
  // they use, which is the rule the shell set and this file keeps.
  const GX = 40.42, GZ = .68, GT = { tag: '保安' };
  box(GX, .52, GZ, .46, 1.04, .62, C('#3b4148'), { hard: true, gloss: .30, ...GT });
  box(GX - .02, 1.07, GZ, .52, .05, .68, C('#7d8288'), { hard: true, gloss: .40, ...GT });
  box(GX - .06, 1.115, GZ - .06, .30, .025, .40, C('#e8e4d8'), { hard: true, rz: .06, gloss: .18, ...GT });
  cap(GX - .10, 1.145, GZ + .16, .008, .13, .008, INK, { rz: 1.2, gloss: .34, ...GT });
  cyl(GX + .10, 1.21, GZ + .24, .042, .24, C('#9c2f26'), { gloss: .34, ...GT });
  cyl(GX + .10, 1.35, GZ + .24, .044, .04, C('#c9c4b8'), { gloss: .30, ...GT });
  cyl(GX + .12, 1.11, GZ - .20, .028, .16, C('#2a2d31'), { rz: Math.PI / 2, gloss: .40, ...GT });
  box(GX - .245, .70, GZ, .015, .22, .44, REDV, { hard: true, gloss: .26, ...GT });
  glyphs(GX - .262, .70, GZ, -Math.PI / 2, '值班',
    { size: .105, gap: .04, color: SIGNW, mode: 1, lift: .007, tag: '保安' });
  box(GX + .34, .23, GZ - .04, .38, .05, .38, C('#2f3a44'), { hard: true, gloss: .26, ...GT });
  box(GX + .525, .48, GZ - .04, .05, .46, .36, C('#2f3a44'), { hard: true, gloss: .26, ...GT });
  for (const s of [-1, 1]) for (const q of [-1, 1])
    cap(GX + .34 + s * .15, .11, GZ - .04 + q * .15, .015, .22, .015, col.steelD,
      { gloss: G.metal, ...GT });
  taper(GX - .38, .26, GZ - .80, .30, .52, .30, HIVIS, { gloss: .24, ...GT });
  box(GX - .38, .024, GZ - .80, .38, .04, .38, HIVIS, { hard: true, gloss: .22, ...GT });
  box(GX - .38, .30, GZ - .80, .21, .11, .21, C('#eae6dc'), { hard: true, gloss: .22, ...GT });
  thing('保安', GX, 1.10, GZ, '保安在门口值班，进楼要登记。',
    'The guard is on duty at the door; you sign in to go up.',
    '保 to protect + 安 safety. 值班 is to be on duty; 登记 is to sign in at the desk.',
    { tag: '保安', focus: [39.30, GZ], reach: 2.1 });

  // ---- the bikes. A rank standing square to the frontage, wheel to wheel, which is how they are
  // ranked on a pavement here. The first version put them nose to tail parallel to the wall at
  // 0.39 m centres — a bike is 1.75 m long, so all eight were standing inside each other and the
  // rank rendered as a heap of wheels. Parallel parking is what you do with two bikes, not eight.
  //
  // Which means depth, and depth is the one thing this pavement is short of. In front of the
  // office the lobby glass is at 40.94 and the body can reach 39.50, which is 1.44 m — not a bike.
  // In front of the 面包房 bay immediately south of it the glass is at 41.49, which is 1.99 m and
  // is. So the office's rank stands one bay along, which is exactly where an office's overflow
  // rank ends up. `parkedBike` builds along x with the nose at the wall: the frame tubes tilt
  // about z, the wheels and the bars lie about x, and the lean rides on top of the tilt.
  //
  // Full by nine in the morning and gone by nine at night, apart from three that are never not
  // there: every rank in this city has three with flat tyres nobody has moved in a year.
  const BIKEC = [col.bikeB, col.bikeY, col.bikeO, C('#4f6f3a'), C('#7d5a8a'), C('#b8452f'),
                 C('#3f7f86'), C('#8d8579')];
  const BX = 40.50;                       // centre of the machine; the bay runs 39.66..41.25
  function parkedBike(z, i, live) {
    const c = BIKEC[i % BIKEC.length], lean = ((i * 37) % 11 - 5) * .014, parts = [];
    const P = p => { parts.push(p); return p; };
    const L = { rx: lean, gloss: .34 };
    // Segment the tyres into real rings. From the metro anchor the old cylinders collapsed into a
    // row of ten black discs; these twelve short arcs preserve the same wheel envelope with sky
    // and spokes visible through every centre.
    const wheel = x => {
      const n = 12, r = .335, seg = 2 * r * Math.sin(Math.PI / n) * 1.06;
      for (let j = 0; j < n; j++) {
        const a = j * Math.PI * 2 / n;
        P(cap(x + Math.cos(a) * r, .34 + Math.sin(a) * r, z,
          .024, seg, .024, C('#2c3035'), { rz:a, gloss:.22 }));
      }
      for (let j = 0; j < 4; j++) {
        const a = j * Math.PI / 2;
        P(cap(x + Math.cos(a) * .16, .34 + Math.sin(a) * .16, z,
          .009, .29, .009, col.steel, { rz:a - Math.PI / 2, gloss:G.metal }));
      }
      P(cyl(x, .34, z, .035, .050, col.steelD, { rx:Math.PI / 2, gloss:G.metal }));
    };
    wheel(BX - .50); wheel(BX + .50);
    P(cap(BX + .06, .60, z, .028, .90, .028, c, { rz: -1.24, ...L }));     // top tube
    P(cap(BX + .12, .42, z, .026, .84, .026, c, { rz: -1.86, ...L }));     // down tube
    P(cap(BX - .30, .56, z, .024, .52, .024, c, { rz: -.30, ...L }));      // seat tube
    P(cap(BX + .42, .96, z, .022, .44, .022, C('#2a2d31'), { rx: Math.PI / 2, gloss: .38 }));
    P(box(BX - .32, .87, z, .24, .07, .10, C('#2a2d31'), { gloss: .30 }));  // saddle
    // Open wire basket: base, four corners and a top ring, never a grey cube on the frontage.
    P(box(BX + .60, .62, z, .18, .024, .20, C('#8a8f95'), { hard:true, gloss:.26 }));
    for (const s of [-1, 1]) for (const q of [-1, 1])
      P(box(BX + .60 + s * .08, .73, z + q * .09, .018, .22, .018,
        C('#8a8f95'), { hard:true, gloss:.26 }));
    for (const q of [-1, 1])
      P(box(BX + .60, .84, z + q * .10, .20, .018, .018,
        C('#8a8f95'), { hard:true, gloss:.26 }));
    for (const s of [-1, 1])
      P(box(BX + .60 + s * .09, .84, z, .018, .018, .20,
        C('#8a8f95'), { hard:true, gloss:.26 }));
    if (!live) return;
    for (const p of parts) hours(p, h => h > 6.6 + (i % 5) * .42 && h < 19.4 + (i % 4) * .55);
  }
  // the painted bay under them, clear of the 面包房 bay's own planter at (40.98, -1.645)
  for (const s of [-1, 1])
    flat(BX + s * .82, .012, -.60, .07, 1.70, C('#cfc9ba'), { gloss: .10 });
  for (const zz of [-1.45, .25])
    flat(BX, .012, zz, 1.64, .07, C('#cfc9ba'), { gloss: .10 });
  for (let i = 0; i < 5; i++) parkedBike(-1.20 + i * .30, i, i > 2);
  cyl(39.90, .95, -1.62, .035, 1.90, col.steelD, { gloss: G.metal });
  box(39.90, 2.02, -1.62, .05, .36, .36, C('#1b4f86'), { hard: true, gloss: .28 });
  glyphs(39.872, 2.09, -1.62, -Math.PI / 2, 'P',
    { size: .17, gap: 0, color: SIGNW, mode: 1, lift: .008 });
  glyphs(39.872, 1.90, -1.62, -Math.PI / 2, '停车',
    { size: .072, gap: .014, color: SIGNW, mode: 1, lift: .008 });

  // ---- the smokers' corner: the standing ashtray and the clipped planters it always stands
  // between. No figures — the bin and the stubs in the sand are what is left of them at any given
  // minute of the day.
  cyl(40.28, .38, 1.62, .13, .76, C('#54595e'), { gloss: .34 });
  cyl(40.28, .785, 1.62, .145, .05, C('#3c4147'), { gloss: .30 });
  cyl(40.28, .818, 1.62, .10, .022, C('#8d8579'), { gloss: .12 });
  for (let i = 0; i < 5; i++)
    cap(40.245 + (i % 3) * .04, .845, 1.59 + (i % 4) * .022, .006, .05, .006, C('#e6e0cf'),
      { rz: 1.1 + i * .3, gloss: .10 });

  // ---- the courier, waiting. An open hand trolley with soft, varied consignments, parked at the
  // door between nine and seven. The former four-box tower aligned behind the metro and read as a
  // beige wall; nothing here now rises as one opaque stack.
  const CX = 40.30, CRZ = 3.24, onShift = h => h > 9 && h < 19;
  const courier = p => hours(p, onShift), PARC = [C('#c3a878'), C('#b39a6c'), C('#cbb488')];
  // Slatted toe plate and upright back: the paving remains visible through the chassis.
  for (const x of [CX - .17, CX, CX + .17])
    courier(box(x, .055, CRZ - .03, .09, .035, .31, C('#3c4147'),
      { hard:true, gloss:.30 }));
  for (const q of [-1, 1])
    courier(box(CX, .055, CRZ - .03 + q * .15, .43, .035, .025, C('#3c4147'),
      { hard:true, gloss:.30 }));
  for (const s of [-1, 1])
    courier(cap(CX + s * .20, .62, CRZ + .16, .018, 1.16, .018, C('#54595e'),
      { rx:.12, gloss:G.metal }));
  courier(cap(CX, 1.18, CRZ + .23, .018, .40, .018, C('#54595e'),
    { rz:Math.PI / 2, gloss:G.metal }));
  for (const y of [.38, .72])
    courier(cap(CX, y, CRZ + .18, .014, .38, .014, C('#6d7378'),
      { rz:Math.PI / 2, gloss:G.metal }));
  // Two small open wheel rings rather than black end discs.
  for (const s of [-1, 1]) {
    const x = CX + s * .20, n = 8, r = .085, seg = 2 * r * Math.sin(Math.PI / n) * 1.06;
    for (let i = 0; i < n; i++) {
      const a = i * Math.PI * 2 / n;
      courier(cap(x, .10 + Math.sin(a) * r, CRZ - .12 + Math.cos(a) * r,
        .012, seg, .012, C('#22262b'), { rx:-a, gloss:.24 }));
    }
    courier(cyl(x, .10, CRZ - .12, .024, .042, col.steelD,
      { rz:Math.PI / 2, gloss:G.metal }));
  }
  // Canvas satchel with a separate flap and strap.
  courier(taper(CX - .12, .25, CRZ - .02, .22, .32, .18, PARC[0], { gloss:.16, ry:-.10 }));
  courier(box(CX - .12, .34, CRZ - .115, .18, .07, .014, PARC[1],
    { hard:true, rx:-.12, gloss:.16 }));
  courier(cap(CX - .12, .43, CRZ - .02, .012, .42, .012, C('#7d6547'),
    { rx:.32, gloss:.20 }));
  // A tied soft sack beside it, modelled from overlapping rounded volumes.
  courier(ball(CX + .12, .22, CRZ + .015, .135, .19, .12, PARC[2], { gloss:.14 }));
  courier(ball(CX + .12, .34, CRZ + .015, .09, .09, .085, PARC[1], { gloss:.14 }));
  courier(cap(CX + .12, .40, CRZ + .015, .010, .16, .010, C('#8a6d42'),
    { rz:Math.PI / 2, gloss:.18 }));
  // Rolled document tube clips horizontally across the open back frame.
  courier(cyl(CX, .62, CRZ + .13, .055, .30, C('#9b7650'),
    { rz:Math.PI / 2, gloss:.18 }));
  for (const s of [-1, 1])
    courier(cyl(CX + s * .14, .62, CRZ + .13, .058, .018, C('#6f5237'),
      { rz:Math.PI / 2, gloss:.20 }));

  // the lobby, lit and empty after dark. The shell's cove is already on the street's own night
  // list; this is the light it should have been throwing onto the pavement, which nothing was.
  lamps.push(light(40.60, 2.30, OFZ, [1.0, .90, .74], .55, 6.5));
  pool(39.90, OFZ, 2.8, 4.6, .30, C('#ffdcae'));

  // ============================================================ the fabric between them
  //
  // A pavement is not made of its buildings. It is made of the post box, the notice board, the
  // sweeper's cart, the volunteer stall and the hedge, and a street with none of those is a
  // model of a street.

  // ---- 信箱, the post box. Deliberately not lettered with any operator's name: a plain green
  // pillar with a slot and the word for what it is.
  // MBZ 13.00, not -6.95: js/street-lane.js opens 新天地步行街 through this frontage at
  // z -12.60 .. -5.80 and the post box stood inside the mouth. 13.00 is the north end of the
  // pavement, 0.45 m clear of the hedge planter that runs 11.25 .. 12.55, and the road zone
  // reaches 13.50.
  const MB = 40.15, MBZ = 13.00;
  cyl(MB, .58, MBZ, .21, 1.16, POSTG, { gloss: .28 });
  taper(MB, 1.25, MBZ, .44, .20, .44, POSTG, { gloss: .28 });
  cyl(MB, 1.38, MBZ, .06, .08, C('#155440'), { gloss: .30 });
  box(MB - .195, .92, MBZ, .05, .06, .26, C('#0f4033'), { hard: true, gloss: .22 });
  glyphs(MB - .225, .68, MBZ, -Math.PI / 2, '信箱',
    { size: .085, gap: .02, color: C('#d6e8dd'), mode: 1, vertical: true, lift: .008 });
  cyl(MB, .045, MBZ, .24, .09, C('#54595e'), { gloss: .30 });

  // ---- 环卫. The sweeper's cart with the long bamboo broom leaning on it and the pan hooked to
  // the side, parked where it is always parked — against the frontage, out of everybody's way.
  // HZ -2.70, not -9.55: the sweeper's cart stood in the middle of the lane's mouth. -2.70 is
  // the gap between the 商务区 metro canopy, which ends at -3.68, and the bike rank, which starts
  // at -1.20 — 2.48 m, and the cart is 1.2 m long.
  const HX = 40.05, HZ = -2.70;
  // The former three nested bodies were an orange waist-high cube in the metro view. An open
  // chassis, corner stanchions and two perimeter rings keep the same service-cart envelope while
  // letting the pavement and frontage show through it.
  for (const s of [-1, 1])
    box(HX + s * .23, .24, HZ, .032, .055, .78, col.steelD,
      { hard:true, gloss:G.metal });
  for (const q of [-1, 1])
    box(HX, .24, HZ + q * .38, .49, .055, .032, col.steelD,
      { hard:true, gloss:G.metal });
  for (const s of [-1, 1]) for (const q of [-1, 1])
    box(HX + s * .23, .52, HZ + q * .38, .032, .56, .032, HIVIS,
      { hard:true, gloss:.24 });
  for (const y of [.50, .80]) {
    for (const s of [-1, 1])
      box(HX + s * .23, y, HZ, .032, .032, .80, C('#b04d16'),
        { hard:true, gloss:.26 });
    for (const q of [-1, 1])
      box(HX, y, HZ + q * .39, .49, .032, .032, C('#b04d16'),
        { hard:true, gloss:.26 });
  }
  for (const q of [-.22, 0, .22])
    box(HX, .29, HZ + q, .45, .022, .026, C('#3c4147'),
      { hard:true, gloss:.20 });
  // Two open tyre rings on the axle; even this small service prop contributes no black discs.
  for (const s of [-1, 1]) {
    const x = HX + s * .22, n = 8, r = .10, seg = 2 * r * Math.sin(Math.PI / n) * 1.06;
    for (let i = 0; i < n; i++) {
      const a = i * Math.PI * 2 / n;
      cap(x, .12 + Math.sin(a) * r, HZ - .28 + Math.cos(a) * r,
        .014, seg, .014, C('#22262b'), { rx:-a, gloss:.24 });
    }
    cyl(x, .12, HZ - .28, .027, .045, col.steelD, { rz:Math.PI / 2, gloss:G.metal });
  }
  cap(HX, .60, HZ + .52, .022, .92, .022, col.steelD, { rx: Math.PI / 2, gloss: G.metal });
  // The broom, leaning on the cart. `cap` builds along local Y and `rz` lays it over, so where
  // the two ends land has to be worked out rather than eyeballed: at rz -0.42 the head is
  // 0.775 * sin(0.42) = 0.32 m toward -x of the centre and 0.71 m below it, which is where the
  // bristles go. Guessed, the bristles ended up at the wrong end of the stick.
  cap(HX - .13, .72, HZ - .17, .022, 1.55, .022, C('#a08a5c'), { rz: -.42, gloss: G.wood });
  for (let i = 0; i < 7; i++)
    cap(HX - .45, .085, HZ - .17 + (i - 3) * .032, .009, .30, .009, C('#8a7444'),
      { rz: -.42 + (i - 3) * .06, gloss: .10 });
  // Shallow dustpan: a floor plate, two lips and a handle rather than another grey block.
  box(HX - .32, .29, HZ + .42, .12, .018, .24, C('#5a6066'),
    { hard:true, rz:.22, gloss:.28 });
  for (const s of [-1, 1])
    box(HX - .32 + s * .055, .34, HZ + .42, .014, .10, .24, C('#5a6066'),
      { hard:true, rz:.22, gloss:.28 });
  cap(HX - .32, .55, HZ + .48, .014, .46, .014, col.steelD,
    { rz:.22, gloss:G.metal });
  // the sign that says whose pavement this is, which is on every block in the city
  cyl(39.98, .95, -10.85, .034, 1.90, col.steelD, { gloss: G.metal });
  box(39.98, 2.00, -10.85, .05, .42, .34, C('#1b6f4f'), { hard: true, gloss: .26 });
  glyphs(39.952, 2.09, -10.85, -Math.PI / 2, '道路保洁',
    { size: .058, gap: .012, color: SIGNW, mode: 1, lift: .008 });
  glyphs(39.952, 1.91, -10.85, -Math.PI / 2, '请勿乱扔',
    { size: .050, gap: .010, color: C('#cfe6d8'), mode: 1, lift: .008 });

  // ---- 公示栏, the community notice board. Two panels behind glass with real notices pinned in
  // them: a water shut-off, the refuse timetable, the clinic's hours and something for rent. The
  // header is red, because it always is.
  // Into 杨柳西口. The first placement at (-26.20,4.10) put the 公厕 approach camera *inside*
  // the board's two-metre span: its white back and grey frame hid both toilet entries. It now
  // sits against the rear boundary wall, west of the toilet parcel, and faces the square. Two
  // separately framed bays and a supported rain cap replace the one tall cabinet-like sheet.
  const NX = -31.00, NZ = 7.04, NT = { tag: '公示栏' };
  for (const s of [-1, 1])
    box(NX + s * .82, .78, NZ - .10, .09, 1.56, .09, col.steelD,
      { hard: true, gloss: G.metal, ...NT });
  for (const s of [-1, 1]) {
    box(NX + s * .47, 1.72, NZ - .02, .90, 1.44, .16, C('#5a6066'),
      { hard: true, gloss: .30, ...NT });
    emis(box(NX + s * .47, 1.72, NZ - .125, .78, 1.20, .05, C('#cbc7b8'),
      { hard: true, mode: 1, glow: .02, ...NT }), .35);
  }
  box(NX, 2.60, NZ - .02, 1.98, .32, .12, C('#9c2f26'),
    { hard: true, gloss: .26, ...NT });
  glyphs(NX, 2.60, NZ - .090, Math.PI, '社区公示栏',
    { size: .175, gap: .05, color: C('#f2e8d4'), mode: 1, lift: .010, tag: '公示栏' });
  box(NX, 2.84, NZ + .01, 2.18, .10, .48, C('#545b60'),
    { hard:true, gloss:.30, rx:-.05, ...NT });
  for (const s of [-1, 1])
    cap(NX + s * .82, 2.64, NZ - .04, .018, .42, .018, col.steelD,
      { rx:-.72, gloss:G.metal, ...NT });
  const NOTES = ['停水通知', '垃圾分类', '门诊时间', '此处招租'];
  for (let i = 0; i < 4; i++) {
    const nx = NX - .47 + (i % 2) * .94, ny = 2.02 - ((i / 2) | 0) * .60;
    box(nx, ny, NZ - .158, .58, .48, .012, C('#f6f3ea'),
      { hard: true, gloss: .12, ...NT });
    glyphs(nx, ny + .16, NZ - .168, Math.PI, NOTES[i % NOTES.length],
      { size: .062, gap: .014, color: C('#8d2a22'), mode: 1, lift: .006, tag: '公示栏' });
  }
  thing('公示栏', NX, 1.90, NZ, '公示栏上贴着停水通知。',
    'There is a water shut-off notice up on the board.',
    '公示 to announce publicly + 栏 a railed board. 通知 is a notice; 贴 is to stick one up.',
    { tag: '公示栏', focus: [NX, NZ - 1.15], reach: 1.9 });

  // The former freestanding 志愿服务站 occupied almost the whole two-metre public
  // footway but had no collider, forcing a choice between walk-through furniture and an illegal
  // pinch.  There is no measured furnishing bay here, so the honest solution is clear pavement;
  // the pharmacy, noticeboard, hedges and staffed metro entrance already give this block civic life.

  // ---- the hedge. Clipped box in stone planters down the civic stretch, which is what separates
  // a pavement that has been looked after from one that has not.
  // -11.05 is gone: that planter stood squarely in the lane's mouth, and there is nowhere on
  // this pavement to move it to that is not already something. Two planters, not three.
  for (const hz of [4.30, 11.90]) {
    box(40.16, .26, hz, .62, .52, 1.30, col.stoneD, { hard: true, gloss: .22 });
    box(40.16, .31, hz, .50, .46, 1.18, C('#5b5347'), { hard: true, gloss: .18 });
    for (let i = 0; i < 3; i++)
      ball(40.16, .63, hz - .38 + i * .38, .27, .22, .24, i % 2 ? col.greenD : col.green,
        { mode: 15, gloss: .12 });
  }

  // ---- and the camera on its mast over the whole civic stretch, which is the other thing on
  // every Beijing pavement and the one nobody ever draws.
  cyl(40.72, 2.30, 6.10, .075, 4.60, C('#b8b4a8'), { gloss: .34 });
  box(40.42, 4.54, 6.10, .62, .09, .09, C('#b8b4a8'), { hard: true, gloss: .34 });
  for (const [dz, ry] of [[-.11, -.5], [.11, .4]]) {
    box(40.14, 4.42, 6.10 + dz, .30, .13, .13, C('#d8d5cc'), { hard: true, ry, rz: -.18, gloss: .30 });
    cyl(39.99, 4.38, 6.10 + dz, .055, .08, C('#1a1d20'), { rz: Math.PI / 2, ry, gloss: .44 });
  }

  shade(40.3, 1.6, 1.7, 6.6, .22);
  shade(40.2, 8.2, 1.7, 5.6, .22);
  shade(24.10, PHZ, 1.9, 3.6, .24);   // the chemist's, left on the far parade by the mirror

  // ============================================================ 动 what the clock moves
  //
  // The street's own `setNight` walks a list this file cannot reach — `litten` is closure-local to
  // js/street.js and is not on `S`. So the district reads the clock itself, off the same daylight
  // curve game.js uses: the `amt` column of its SKYKEYS and the same `day = (amt - 0.14) / 1.3`
  // derived from it, so a civic lamp comes up at exactly the minute a shop sign does.
  //
  // Written only when the hour has actually moved it — 40 steps of darkness, one step an hour for
  // the things that come and go — which is a few dozen writes a day rather than per frame.
  const AMT = [[0, .13], [4.6, .18], [6.4, .72], [8.2, 1.42], [13, 1.72], [16.6, 1.52],
               [18.6, 1.02], [19.9, .38], [21.4, .16], [24, .13]];
  function nightAt(h) {
    let i = 0;
    while (i < AMT.length - 2 && AMT[i + 1][0] <= h) i++;
    const a = AMT[i], b = AMT[i + 1];
    const raw = (h - a[0]) / Math.max(1e-6, b[0] - a[0]);
    const t = raw * raw * (3 - 2 * raw);
    const amt = a[1] + (b[1] - a[1]) * t;
    return 1 - Math.min(1, Math.max(0, (amt - .14) / 1.3));
  }

  let lastN = -1, lastH = -1;
  StreetFit['civic'].tick = (t, body, mins) => {
    if (mins === undefined) return;
    const h = (mins / 60) % 24;
    const n = nightAt(h), q = (n * 40) | 0, hq = h | 0;
    if (q !== lastN) {
      lastN = q;
      const soft = n * n * (3 - 2 * n);
      for (const e of lit) e.p.glow = e.g0 + soft * e.k * .95;
      for (const g of pools) g.g.a = soft * g.k;
      for (const l of lamps) l.on = soft > .10;
    }
    if (hq !== lastH) {
      lastH = hq;
      for (const s of swap) s.p.m = s.on(h) ? s.m0 : AWAY;
    }
  };
};
