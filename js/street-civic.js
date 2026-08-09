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
  const hours = (p, on) => { swap.push({ p, m0: p.m, on }); return p; };

  // ============================================================ 地铁 the two entrances
  //
  // `metroMouth` builds the hole in the ground and the sign over it. What it does not build is
  // anything that tells you which station this is, which line it is on, what the network looks
  // like, or that you are about to walk through a bag scanner — and the scanner is the single
  // most recognisable object at a Beijing metro entrance. A mouth without one is a mouth in some
  // other city.
  //
  // Almost all of this hangs off the mouth's own structure or stands inside the collider the
  // shell already put round it — `solid(cx-2.05, cx+1.30, cz-.90, cz+1.30)` — so it costs the
  // pavement nothing. The two exceptions, the route map and the bin, stand on walkable paving
  // and carry their own colliders; both are measured against `clampMove` below.
  //
  // Tags matter here. The shell tags its own mouth 'metro1'/'metro2' and hangs the 地铁站 thing
  // off that tag, so anything that should open 地铁站 when you point at it takes the same tag —
  // but the map and the scanner get tags of their own, because `pick` resolves a tag to the
  // nearest thing wearing it and a second thing on 'metro1' would start answering for the door.
  function metroFit(cx, cz, tag, o) {
    const T = { tag };
    const LC = o.lineCol;

    // ---- the name board, hung under the fascia. This is the piece that turns "a subway
    // entrance" into "this subway entrance": the station's name, its romanisation underneath the
    // way every board in the city carries it, and the line's colour as a band below with the line
    // number in it. The shell's fascia says 地铁站 and nothing else, so from the pavement the two
    // mouths were indistinguishable apart from the totem.
    //
    // At y 1.86 it hangs over the head of the flight, which is where these actually are, and
    // clear of the fascia at 2.23..2.57 so the two never fight for the same pixels.
    emis(box(cx, 1.86, cz - .540, 2.46, .52, .07, SIGNW,
      { hard: true, gloss: .18, glow: .02, ...T }), .30);
    glyphs(cx + .20, 1.96, cz - .585, Math.PI, o.name,
      { size: .175, gap: .05, color: INK, mode: 1, lift: .010, tag });
    glyphs(cx + .20, 1.755, cz - .585, Math.PI, o.pinyin,
      { size: .082, gap: .022, color: SUBINK, mode: 1, lift: .010, tag });
    // the line band under it, and the line's number on it
    emis(box(cx, 1.50, cz - .550, 2.46, .16, .06, LC,
      { hard: true, gloss: .22, glow: .03, ...T }), .30);
    glyphs(cx, 1.50, cz - .585, Math.PI, o.line,
      { size: .105, gap: .026, color: SIGNW, mode: 1, lift: .009, tag });

    // ---- the roundel. The shell builds one on the fascia, but it is a cylinder laid over with
    // `rz`, which puts its face along ±x — edge-on to the person walking up to it, so from the
    // approach it reads as a white sliver rather than a disc. This one is laid with `rx`, which
    // is what faces a disc down -z, and it carries the line colour so the two mouths differ at a
    // glance. The shell's is left where it is: this file only adds.
    cyl(cx - .95, 1.86, cz - .620, .155, .035, SIGNW, { rx: Math.PI / 2, mode: 1, gloss: .20, ...T });
    cyl(cx - .95, 1.86, cz - .656, .118, .030, LC, { rx: Math.PI / 2, mode: 1, gloss: .20, ...T });
    glyphs(cx - .95, 1.86, cz - .678, Math.PI, '地铁',
      { size: .070, gap: .004, color: SIGNW, mode: 1, lift: .008, tag });

    // ---- 出入口 and its letter, standing 20 mm proud of the fascia. Every mouth in the city is
    // lettered and it is the letter people say to each other: 我在 C 口.
    emis(box(cx + 1.06, 2.40, cz - .555, .42, .28, .05, SIGNW,
      { hard: true, gloss: .20, glow: .02, ...T }), .35);
    // At yaw PI the glyph quad's local +x maps to world -x, so the LEFT of a line of text is at
    // the LARGER x. Written the other way round the plate read 口A.
    glyphs(cx + 1.16, 2.40, cz - .585, Math.PI, o.exitLetter,
      { size: .17, gap: 0, color: INK, mode: 1, lift: .008, tag });
    glyphs(cx + .97, 2.40, cz - .585, Math.PI, '口',
      { size: .105, gap: 0, color: SUBINK, mode: 1, lift: .008, tag });

    // ---- 线路图, the network map, on its own two legs on the approach. Deliberately narrow at
    // 1.06 m: it stands on walkable pavement and has to leave a clear run past it.
    const mx = cx + 1.38, mz = cz - 1.15;
    for (const s of [-1, 1])
      box(mx + s * .42, .62, mz, .055, 1.24, .055, col.steelD,
        { hard: true, gloss: G.metal, tag: '线路图' });
    box(mx, 1.52, mz, 1.06, .76, .07, col.steelD, { hard: true, gloss: G.metal, tag: '线路图' });
    emis(box(mx, 1.52, mz - .055, .98, .68, .04, C('#d3d7d6'),
      { hard: true, gloss: .16, glow: .03, tag: '线路图' }), .30);
    glyphs(mx, 1.79, mz - .090, Math.PI, '线路图',
      { size: .058, gap: .016, color: INK, mode: 1, lift: .008, tag: '线路图' });
    // the runs. A metro diagram is 45s and straights with interchange dots on them, and at
    // reading distance that is the whole of what one of these is.
    const runs = [[LINE10, -.16, .06, .74, 0], [LINE6, .10, -.10, .60, .34],
                  [C('#c8442f'), -.02, -.20, .52, -.28], [C('#3f8f4c'), .18, .16, .44, .18]];
    for (const [c, dx, dy, w, rz] of runs)
      box(mx + dx, 1.50 + dy, mz - .090, w, .026, .012, c,
        { hard: true, rz, mode: 1, gloss: .10, tag: '线路图' });
    for (let i = 0; i < 7; i++)
      cyl(mx - .34 + i * .11, 1.50 + Math.sin(i * 1.7) * .13, mz - .104, .014, .010, INK,
        { rx: Math.PI / 2, mode: 1, gloss: .10, tag: '线路图' });
    solid(mx - .50, mx + .50, mz - .07, mz + .07);
    thing('线路图', mx, 1.52, mz - .10, '你看一下线路图，我们坐几号线？',
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

    // ---- 安检. The security check, just inside the mouth: a scanner with a rubber-curtained
    // tunnel, roller beds either side, the monitor on its stalk and a table with the wand on it.
    // Stood on the landing at the head of the flight, inside the collider the shell already put
    // round the whole mouth, and 0.19 m clear of the nearest the body can stand.
    const sz0 = cz + 1.08, ST = { tag: '安检' };
    box(cx, .52, sz0, 1.02, 1.04, .62, C('#6b737b'), { hard: true, gloss: .34, ...ST });
    box(cx, 1.05, sz0, 1.06, .06, .66, C('#4a5158'), { hard: true, gloss: .30, ...ST });
    box(cx, .58, sz0 - .335, .54, .58, .05, C('#15181b'), { hard: true, gloss: .20, ...ST });
    for (let i = 0; i < 5; i++)                                     // the lead curtain strips
      box(cx - .20 + i * .10, .60, sz0 - .375, .085, .52, .012, C('#4d545a'),
        { hard: true, gloss: .18, ...ST });
    for (const s of [-1, 1]) {                                      // the roller beds
      box(cx + s * .84, .40, sz0, .64, .06, .52, col.steelD, { hard: true, gloss: G.metal, ...ST });
      for (let i = 0; i < 5; i++)
        cyl(cx + s * .84 - .24 + i * .12, .452, sz0, .026, .48, col.steel,
          { rx: Math.PI / 2, gloss: G.metal, ...ST });
      box(cx + s * .84, .19, sz0, .07, .38, .07, col.steelD, { hard: true, gloss: G.metal, ...ST });
    }
    box(cx + .86, .48, sz0 + .04, .40, .05, .30, C('#8d4a2c'), { hard: true, gloss: .28, ...ST });
    // the monitor the guard watches, on its stalk, turned back toward the machine
    box(cx - .62, 1.42, sz0 + .16, .06, .46, .07, col.steelD, { hard: true, gloss: G.metal, ...ST });
    box(cx - .62, 1.76, sz0 + .16, .07, .30, .40, C('#26292d'), { hard: true, gloss: .30, ...ST });
    emis(box(cx - .665, 1.76, sz0 + .16, .012, .25, .34, C('#2a5068'),
      { hard: true, mode: 1, glow: .04, ...ST }), .28);
    // the table beside it, with the wand and a bottle of water left on it
    box(cx - 1.02, .38, sz0 - .10, .42, .04, .60, C('#9a8a6e'), { hard: true, gloss: G.wood, ...ST });
    for (const s of [-1, 1]) for (const q of [-1, 1])
      box(cx - 1.02 + s * .16, .18, sz0 - .10 + q * .24, .04, .38, .04, col.steelD,
        { hard: true, gloss: G.metal, ...ST });
    cap(cx - 1.02, .46, sz0 - .26, .022, .28, .022, C('#2a2d31'), { rz: 1.35, gloss: .30, ...ST });
    cyl(cx - .92, .49, sz0 + .10, .032, .22, C('#7fa7c4'), { mode: 1, alpha: .82, gloss: .40, ...ST });
    // and the sign over it, which is the two characters everybody reads without stopping
    emis(box(cx, 2.06, sz0 - .44, .76, .20, .05, C('#1b4f86'), { hard: true, gloss: .24, ...ST }), .5);
    glyphs(cx, 2.06, sz0 - .472, Math.PI, '安检',
      { size: .135, gap: .05, color: SIGNW, mode: 1, lift: .009, tag: '安检' });
    thing('安检', cx, 1.30, sz0 - .35, '进地铁站要先过安检，包放传送带上。',
      'To enter the station you go through the security check; bags go on the belt.',
      '安 safe + 检 to inspect. 过安检 is to go through it — every station in the city has one.',
      { tag: '安检', focus: o.checkFocus, reach: 2.4 });

    // ---- the roll-down grille. Down between 23:20 and 05:10 and gone the rest of the day, which
    // is the one thing that says at a glance that the network has shut. The housing it rolls into
    // stays all day; the curtain does not.
    const shut = h => h >= 23.33 || h < 5.17;
    box(cx, 2.30, cz - .30, 2.34, .18, .16, col.steelD, { hard: true, gloss: .38, ...T });
    hours(box(cx, 1.13, cz - .30, 2.24, 2.26, .05, col.steel,
      { hard: true, gloss: .40, mat: 'steel', matScale: .55, matAmt: .40, ...T }), shut);
    for (let i = 0; i < 11; i++)
      hours(box(cx, .10 + i * .205, cz - .350, 2.20, .05, .02, C('#8a9096'),
        { hard: true, gloss: .34, ...T }), shut);

    // ---- the centre handrail. The shell puts one down each side; a flight this wide has one up
    // the middle too, and it is the piece that makes a stair read as a public stair.
    cap(cx, .70, cz + .06, .028, 1.70, .028, col.steelD,
      { rx: Math.PI / 2 - .34, gloss: G.metal, ...T });
    for (const dz of [-.55, .55])
      cap(cx, .40, cz + .06 + dz, .024, .62, .024, col.steelD, { gloss: G.metal, ...T });

    // ---- lit from below. Two tubes under the canopy and a pool on the paving in front of the
    // steps: at night a metro mouth is a lit hole in a dark pavement, and it was as dark as
    // everything round it.
    for (const dz of [.10, 1.00]) {
      emis(box(cx, 2.49, cz + dz, 2.10, .06, .11, C('#e6e6dc'),
        { hard: true, mode: 1, glow: .03, ...T }), .55);
      lamps.push(light(cx, 2.42, cz + dz, [.92, .96, 1.0], .50, 5.0));
    }
    pool(cx, cz - .45, 3.6, 3.2, .34, C('#cfe2ee'));

    // ---- the bin beside the mouth, which every one of them has and which is where the free
    // papers and the milk tea cups go.
    const bx = cx + 1.42, bz = cz + .70;
    box(bx, .42, bz, .46, .84, .38, C('#3c4a3f'), { hard: true, gloss: .26, ...T });
    box(bx, .87, bz, .50, .06, .42, C('#2b3630'), { hard: true, gloss: .28, ...T });
    for (const s of [-1, 1])
      box(bx, .70, bz + s * .135, .40, .22, .012, C('#1d241f'), { hard: true, gloss: .20, ...T });
    solid(bx - .25, bx + .25, bz - .21, bz + .21);
  }

  metroFit(38.70, -5.20, 'metro1', {
    name: '商务区', pinyin: 'Shangwuqu', line: '10号线', lineCol: LINE10, exitLetter: 'C',
    checkFocus: [38.70, -3.15], mapFocus: [39.40, -7.10],
  });
  metroFit(19.40, 2.30, 'metro2', {
    name: '杨柳胡同', pinyin: 'Yangliu Hutong', line: '6号线', lineCol: LINE6, exitLetter: 'A',
    checkFocus: [19.40, .70], mapFocus: [20.30, -.10],
  });

  // ============================================================ 药店 the chemist's
  //
  // The pharmacy is the one shopfront on the far parade that is also a DOOR — `PHARMACY_OUT`
  // records where the body comes back out of js/pharmacy.js. Which bay it lands on is decided by
  // the shell's seeded random stream, and the seed puts it at z -10.08 — inside the 7.2 m mass of
  // the 购物中心 entrance, which is built afterwards at z -9.20 and buries it completely. Standing
  // on the marked spot you face a sheet of mall glass; the sign, the door and the whole shop are
  // a metre inside a shopping centre. It has presumably never once been visible.
  //
  // That cannot be fixed where it is caused, because the cause is in js/street.js and this file
  // may only add. What it can do is move the door to a bay that is empty and build the chemist's
  // there. The bay chosen is the shuttered one centred on z -4.92: its north half, z -5.30 to
  // -2.10, is the only stretch of far frontage inside the walkable strip with nothing on it —
  // the mall ends at -5.60, the metro canopy at -3.68 and x 40.15, the 面包房's board starts at
  // -2.05. The standing spot goes at z -2.90, which is 0.70 m clear of the metro's collider and
  // on the reachable side of it.
  //
  // The `thing` is MOVED, not duplicated, so there is still exactly one 药店 in the street and
  // `pick` cannot hand back the wrong one. `th.exit.at` is the same object `PHARMACY_OUT` points
  // at, so writing through it moves both, and pharmacy.js copies it later.
  // The standing spot is NOT in front of the door. Measured with the real `clampMove` at r 0.30,
  // (39.30, -2.90) sits inside the collider of the parade's own tree pit at (39.40, -3.00) — the
  // body was pushed 0.50 m off it every time, which is a door you can never quite stand at. The
  // spot goes 0.80 m north of the door instead, where the pavement is clear, and the leaf is
  // 1.41 m away on the diagonal: well inside the thing's 2.4 m reach.
  // MIRRORED onto the corner block's east elevation, flush with 北京银行 — see
  // STREET-BLUEPRINT.md and sheet A02. Every x in this section is reflected about x = 31.99, so
  // the shopfront glass lands at 23.52 where the bank's is at 23.515 and the two read as one
  // elevation; the glyph yaws turn from -PI/2 to +PI/2 and the two rz values negate, because that
  // is what a reflection in x does to a rotation about z.
  //
  // z -6.90 .. -3.60, which is the 3.30 m bay north of the bank: 0.20 m to the branch at -7.10,
  // 0.55 m to the block's own corner at -3.05. The standing spot is at x 24.68, east of the
  // 24.30 the road zone's clampMove holds the body at, and the whole frontage sits in the 0.88 m
  // strip in front of it that the body can never enter — so nothing here needs a collider either.
  const PHZ = -5.25, PHDOOR = -4.45, PHSTAND = -3.65;
  const PT = { tag: '药店' };
  // The door is CREATED here now, where the shop is, instead of being found on the far parade and
  // dragged across the road. Dragging it left the parade unit's BOARD behind — still lettered
  // 药店, still pickable, eighteen metres from the real chemist and on the other side of a
  // carriageway. street.js no longer letters any parade unit 药店 at all: it is out of both TEACH
  // and SHOPNAMES, and `PHARMACY_OUT` is a constant on the shell rather than something the seeded
  // shuffle discovers. pharmacy.js reads the same object off the scene and needs no change.
  thing('药店', 23.38, 3.34, PHZ,
    '药店几点关门？', 'What time does the pharmacy shut?',
    '药 medicine + 店 shop. 买药 is to buy medicine; 药方 is a prescription.',
    { focus: [24.68, PHSTAND], reach: 2.4 }).exit = { place: 'pharmacy', at: S.PHARMACY_OUT };

  // The shell of the unit. A back wall and two jambs with a head over them, NOT one solid block:
  // a block would have nothing to be a window in, and the shop behind the glass has to be a room
  // with a depth to it or the glazing reads as a stain on a wall. Same move the office lobby
  // makes forty lines up in street.js, and for the same reason.
  const PMAT = { mat: 'plaster', matScale: 2.60, matAmt: .14 };
  box(22.68, 2.10, PHZ, .60, 4.20, 3.30, col.render, { hard: true, gloss: G.paint, ...PMAT, ...PT });
  for (const s of [-1, 1])
    box(23.26, 2.10, PHZ + s * 1.50, .76, 4.20, .30, col.render,
      { hard: true, gloss: G.paint, ...PMAT, ...PT });
  box(23.26, 3.90, PHZ, .76, .60, 3.30, col.render, { hard: true, gloss: G.paint, ...PMAT, ...PT });
  box(23.38, .08, PHZ, .30, .16, 3.00, col.stoneD, { hard: true, gloss: .26, ...PT });   // threshold

  // ---- the fascia and the name. Green, because a chemist's fascia in this city is green, with
  // the light bar under it that is what actually makes one legible at ten at night.
  box(23.38, 3.34, PHZ, .26, .74, 3.06, RXD, { hard: true, gloss: .26, ...PT });
  glyphs(23.52, 3.42, PHZ - .52, Math.PI / 2, '药店',
    { size: .46, gap: .16, color: C('#f4fff8'), mode: 1, lift: .014, tag: '药店' });
  glyphs(23.52, 3.04, PHZ - .52, Math.PI / 2, '24小时',
    { size: .150, gap: .05, color: C('#bfe8cf'), mode: 1, lift: .014, tag: '药店' });
  glyphs(23.52, 3.34, PHZ + .86, Math.PI / 2, '中西药',
    { size: .215, gap: .07, color: C('#dff4e8'), mode: 1, lift: .014, tag: '药店' });
  emis(box(23.38, 2.92, PHZ, .26, .06, 3.00, RXL, { hard: true, mode: 1, glow: .05, ...PT }), .55);

  // ---- the green cross. The one sign that is identical everywhere and that is read at fifty
  // metres without being read. Two crossed boxes on a bracket off the frontage: a closed box has
  // six faces, so it is legible from both directions without being built twice. Brightest thing
  // on the street after dark, which is the whole point of it.
  // At the SOUTH end of the fascia, which is where it went first, the cross stood inside the metro
  // canopy's z range (-5.68..-3.68) and was invisible from the pavement in both directions. It goes
  // on the north jamb instead — the side the body can actually reach, since the mouth seals the
  // pavement south of it — with the bracket buried in the jamb the way a real one is.
  const CZ0 = PHZ + 1.35;
  box(23.36, 3.05, CZ0, .44, .09, .09, col.steelD, { hard: true, gloss: G.metal, ...PT });
  box(23.76, 3.05, CZ0, .17, .84, .17, C('#f4fff8'), { hard: true, gloss: .22, ...PT });
  box(23.76, 3.05, CZ0, .19, .26, .84, C('#f4fff8'), { hard: true, gloss: .22, ...PT });
  emis(box(23.765, 3.05, CZ0, .21, .70, .21, RX, { hard: true, mode: 1, glow: .10, ...PT }), .85);
  emis(box(23.765, 3.05, CZ0, .23, .21, .70, RX, { hard: true, mode: 1, glow: .10, ...PT }), .85);
  lamps.push(light(23.93, 3.05, CZ0, [.42, 1.0, .62], .50, 4.4));

  // ---- the window, and what is in it. A chemist's window is three shelves of boxes and nothing
  // else, and the boxes are how you tell one from an optician's without reading the sign.
  const WZ = PHZ - .72;
  emis(box(23.04, 1.40, WZ, .05, 2.30, 1.40, C('#a9bcae'),
    { hard: true, mode: 1, glow: .03, ...PT }), .30);
  const BOXC = [C('#c8492f'), C('#2f6fa8'), C('#d9b13f'), C('#4f8f52'), C('#b4573f'), C('#3f7f86')];
  for (let sh = 0; sh < 3; sh++) {
    box(23.24, .70 + sh * .62, WZ, .34, .035, 1.30, C('#d8d2c2'), { hard: true, gloss: .22, ...PT });
    for (let i = 0; i < 6; i++) {
      const c = BOXC[(i * 5 + sh * 2) % BOXC.length];
      box(23.24, .84 + sh * .62, WZ - .54 + i * .216, .17, .24, .15, c,
        { hard: true, gloss: .24, ...PT });
    }
  }
  box(23.52, 1.40, WZ, .04, 2.28, 1.34, col.glassDay,
    { hard: true, mode: 1, alpha: .50, gloss: G.glass, ...PT });
  // the frame round it: sill, head and two mullions, standing 20 mm proud of the glass
  box(23.54, .14, WZ, .26, .26, 1.48, col.charcoal, { hard: true, gloss: .28, ...PT });
  box(23.54, 2.66, WZ, .26, .22, 1.48, col.charcoal, { hard: true, gloss: .28, ...PT });
  for (const s of [-1, 1])
    box(23.54, 1.40, WZ + s * .72, .26, 2.52, .13, col.charcoal, { hard: true, gloss: .28, ...PT });

  // ---- the door, two leaves with pull bars, at the north end where the body can reach it.
  // The lit panel behind it is not enough on its own: a 2.2 x 1.24 m sheet of emissive with two
  // clear leaves in front of it is a lightbox, not a shop, and after dark it blew out into a
  // white slab. So there is a room behind the door — a counter across it and two runs of shelf
  // over that, which is what you actually see through a chemist's door at night.
  emis(box(22.98, 1.16, PHDOOR, .05, 2.20, 1.24, C('#a9bcae'),
    { hard: true, mode: 1, glow: .03, ...PT }), .24);
  box(23.16, .46, PHDOOR - .06, .26, .92, .84, C('#c2bcae'), { hard: true, gloss: .26, ...PT });
  box(23.16, .935, PHDOOR - .06, .30, .05, .88, C('#8d8579'), { hard: true, gloss: .30, ...PT });
  for (const sy of [1.42, 1.82]) {
    box(23.08, sy, PHDOOR + .34, .20, .035, .82, C('#d8d2c2'), { hard: true, gloss: .22, ...PT });
    for (let i = 0; i < 4; i++)
      box(23.08, sy + .13, PHDOOR + .05 + i * .19, .13, .21, .13, BOXC[(i * 3 + (sy > 1.6 ? 1 : 0)) % BOXC.length],
        { hard: true, gloss: .24, ...PT });
  }
  for (const s of [-1, 1]) {
    box(23.5, 1.16, PHDOOR + s * .33, .035, 2.16, .60, col.glassDay,
      { hard: true, mode: 1, alpha: .52, gloss: G.glass, ...PT });
    cap(23.55, 1.06, PHDOOR + s * .12, .022, .78, .022, col.steel, { gloss: G.metal, ...PT });
  }
  box(23.52, 1.16, PHDOOR, .09, 2.34, .07, col.charcoal, { hard: true, gloss: .30, ...PT });
  for (const s of [-1, 1])
    box(23.52, 1.16, PHDOOR + s * .70, .09, 2.34, .12, col.charcoal, { hard: true, gloss: .30, ...PT });
  box(23.52, 2.38, PHDOOR, .09, .12, 1.52, col.charcoal, { hard: true, gloss: .30, ...PT });

  // the plates beside it: the state-insurance plate, and the shopfront-tidiness notice that is
  // screwed to every business on every street in this city
  box(23.56, 1.72, PHDOOR + .92, .04, .36, .27, C('#1b4f86'), { hard: true, gloss: .30, ...PT });
  glyphs(23.585, 1.72, PHDOOR + .92, Math.PI / 2, '医保定点',
    { size: .072, gap: .012, color: SIGNW, mode: 1, vertical: true, lift: .008, tag: '药店' });
  box(23.56, 1.28, PHDOOR + .92, .04, .22, .21, C('#d8d2c2'), { hard: true, gloss: .24, ...PT });
  glyphs(23.585, 1.28, PHDOOR + .92, Math.PI / 2, '门前三包',
    { size: .043, gap: .006, color: INK, mode: 1, lift: .008, tag: '药店' });

  // ---- the queue rail: two chrome posts and a strap making a short lane at the door, which is
  // what every counter in this country grows the moment two people are at it.
  for (const dz of [-.64, .10]) {
    cyl(23.84, .48, PHDOOR + dz, .045, .96, col.steel, { gloss: G.metal, ...PT });
    cyl(23.84, .024, PHDOOR + dz, .13, .04, col.steelD, { gloss: .34, ...PT });
  }
  box(23.84, .88, PHDOOR - .27, .035, .05, .72, C('#9c2f26'), { hard: true, gloss: .26, ...PT });
  // and the camera over it, which every one of these has
  box(23.48, 3.92, CZ0 + .12, .18, .14, .50, col.render, { hard: true, gloss: G.paint });
  box(23.74, 3.88, CZ0 + .12, .34, .13, .13, C('#d8d5cc'), { hard: true, rz: .22, gloss: .30 });
  cyl(23.92, 3.84, CZ0 + .12, .065, .10, C('#1a1d20'), { rz: -Math.PI / 2, gloss: .44 });
  // The pool the green cross throws was left on the FAR PARADE when the chemist was mirrored onto
  // the west footway: at x 39.95 it lit two metres of pavement eighteen metres and one carriageway
  // away from the lamp casting it, and the cross itself lit nothing. 24.30 is 1.0 m in front of the
  // 23.30 building line, under the bracket at 23.93. Same omission in the `shade` at the bottom of
  // this file; both are fixed, neither was in the brief.
  pool(24.30, PHZ - .40, 2.6, 4.4, .26, C('#bff0d2'));

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
    for (const dx of [-.50, .50]) {
      P(cyl(BX + dx, .34, z, .335, .045, C('#2c3035'), { rx: Math.PI / 2, gloss: .22 }));
      P(cyl(BX + dx, .34, z, .085, .052, col.steel, { rx: Math.PI / 2, gloss: G.metal }));
    }
    P(cap(BX + .06, .60, z, .028, .90, .028, c, { rz: -1.24, ...L }));     // top tube
    P(cap(BX + .12, .42, z, .026, .84, .026, c, { rz: -1.86, ...L }));     // down tube
    P(cap(BX - .30, .56, z, .024, .52, .024, c, { rz: -.30, ...L }));      // seat tube
    P(cap(BX + .42, .96, z, .022, .44, .022, C('#2a2d31'), { rx: Math.PI / 2, gloss: .38 }));
    P(box(BX - .32, .87, z, .24, .07, .10, C('#2a2d31'), { gloss: .30 }));  // saddle
    P(box(BX + .60, .74, z, .20, .26, .26, C('#8a8f95'), { hard: true, gloss: .26 })); // basket
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

  // ---- the courier, waiting. Which is to say his hand trolley and his stack of parcels, parked
  // at the door between nine and seven; anybody who has stood outside an office block in this
  // city has walked round exactly this.
  const CX = 40.30, CRZ = 3.24, onShift = h => h > 9 && h < 19;
  hours(box(CX, .045, CRZ, .48, .07, .34, C('#3c4147'), { hard: true, gloss: .30 }), onShift);
  for (const s of [-1, 1])
    hours(cyl(CX + s * .20, .09, CRZ - .12, .085, .05, C('#22262b'),
      { rz: Math.PI / 2, gloss: .24 }), onShift);
  for (const s of [-1, 1])
    hours(cap(CX + s * .20, .62, CRZ + .16, .018, 1.16, .018, C('#54595e'),
      { rx: .12, gloss: G.metal }), onShift);
  hours(cap(CX, 1.18, CRZ + .23, .018, .40, .018, C('#54595e'),
    { rz: Math.PI / 2, gloss: G.metal }), onShift);
  const PARC = [C('#c3a878'), C('#b39a6c'), C('#cbb488')];
  for (let i = 0; i < 4; i++) {
    const ry = ((i % 3) - 1) * .10;
    const px = CX + ((i % 2) - .5) * .04, py = .18 + i * .21, pz = CRZ - .02 + ((i % 3) - 1) * .03;
    hours(box(px, py, pz, .40, .20, .30, PARC[i % PARC.length],
      { hard: true, ry, gloss: .18 }), onShift);
    hours(box(px - .208, py, pz, .012, .05, .28, C('#d8b23f'),
      { hard: true, ry, gloss: .20 }), onShift);
  }

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
  box(HX, .48, HZ, .52, .58, .86, HIVIS, { hard: true, gloss: .24 });
  box(HX, .81, HZ, .56, .06, .90, C('#b04d16'), { hard: true, gloss: .26 });
  box(HX - .03, .28, HZ, .48, .30, .78, C('#3c4147'), { hard: true, gloss: .20 });
  for (const s of [-1, 1])
    cyl(HX + s * .22, .10, HZ - .28, .10, .06, C('#22262b'), { rz: Math.PI / 2, gloss: .24 });
  cap(HX, .60, HZ + .52, .022, .92, .022, col.steelD, { rx: Math.PI / 2, gloss: G.metal });
  // The broom, leaning on the cart. `cap` builds along local Y and `rz` lays it over, so where
  // the two ends land has to be worked out rather than eyeballed: at rz -0.42 the head is
  // 0.775 * sin(0.42) = 0.32 m toward -x of the centre and 0.71 m below it, which is where the
  // bristles go. Guessed, the bristles ended up at the wrong end of the stick.
  cap(HX - .13, .72, HZ - .17, .022, 1.55, .022, C('#a08a5c'), { rz: -.42, gloss: G.wood });
  for (let i = 0; i < 7; i++)
    cap(HX - .45, .085, HZ - .17 + (i - 3) * .032, .009, .30, .009, C('#8a7444'),
      { rz: -.42 + (i - 3) * .06, gloss: .10 });
  box(HX - .32, .42, HZ + .42, .10, .30, .26, C('#5a6066'), { hard: true, rz: .22, gloss: .28 });
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
  // Into 杨柳西口. A community notice board belongs where the community sits, and since 广场舞
  // moved there the square is where they are. It is freestanding on two posts and already faces
  // -x, which in the square is the way the chess table and the dance pitch are, so it needed
  // moving and not mirroring. Clear of the tree at (-29.2, 3.4) by 3.0 m and of the nearest
  // dancer by 0.9 m; the west zone is x -32.2..-25.0, z -3.10..6.40.
  const NX = -26.20, NZ = 4.10, NT = { tag: '公示栏' };
  for (const s of [-1, 1])
    box(NX + .10, .78, NZ + s * .82, .09, 1.56, .09, col.steelD, { hard: true, gloss: G.metal, ...NT });
  box(NX + .06, 1.72, NZ, .16, 1.44, 1.98, C('#5a6066'), { hard: true, gloss: .30, ...NT });
  emis(box(NX - .055, 1.72, NZ, .05, 1.20, 1.80, C('#cbc7b8'),
    { hard: true, mode: 1, glow: .02, ...NT }), .35);
  box(NX, 2.60, NZ, .12, .32, 1.98, C('#9c2f26'), { hard: true, gloss: .26, ...NT });
  glyphs(NX - .075, 2.60, NZ, -Math.PI / 2, '社区公示栏',
    { size: .175, gap: .05, color: C('#f2e8d4'), mode: 1, lift: .010, tag: '公示栏' });
  const NOTES = ['停水通知', '垃圾分类', '门诊时间', '此处招租'];
  for (let i = 0; i < 4; i++) {
    const nz = NZ - .68 + (i % 2) * 1.36, ny = 2.02 - ((i / 2) | 0) * .60;
    box(NX - .10, ny, nz, .012, .48, .58, C('#f6f3ea'), { hard: true, gloss: .12, ...NT });
    glyphs(NX - .108, ny + .16, nz, -Math.PI / 2, NOTES[i % NOTES.length],
      { size: .062, gap: .014, color: C('#8d2a22'), mode: 1, lift: .006, tag: '公示栏' });
  }
  thing('公示栏', NX, 1.90, NZ, '公示栏上贴着停水通知。',
    'There is a water shut-off notice up on the board.',
    '公示 to announce publicly + 栏 a railed board. 通知 is a notice; 贴 is to stick one up.',
    { tag: '公示栏', focus: [-27.30, NZ], reach: 1.9 });

  // ---- 志愿服务站. The red-and-white stall that stands on every corner of this city: a parasol,
  // a folding table, an urn of hot water and a board with the two words on it.
  // MOVED to the west footway with the two shops, and mirrored to face +x like them: every VX
  // offset flips sign and the glyph yaw turns from -PI/2 to +PI/2. It is freestanding, so it
  // stands ON the pavement at x 25.00 rather than against the 23.30 building line — the parasol
  // is 1.92 m across and at 24.10 it would have grown through the shopfronts.
  //
  // z 12.00, not 7.00: the road tree that moved to (25.4, 9.4) reaches z 10.6 with its crown, and
  // 11.04 .. 12.96 clears it. The zone ends at 13.5.
  const VX = 25.00, VZ = 12.00;
  cyl(VX, 1.10, VZ, .035, 2.20, col.steelD, { gloss: G.metal });
  taper(VX, 2.02, VZ, 1.80, .34, 1.80, REDV, { gloss: .18 });
  taper(VX, 1.90, VZ, 1.92, .12, 1.92, C('#eae6dc'), { gloss: .18 });
  for (let i = 0; i < 6; i++)
    cap(VX, 1.90, VZ, .010, .92, .010, C('#c9c4b8'), { ry: i * .5236, rz: 1.42, gloss: .20 });
  box(VX, .34, VZ, .52, .05, 1.12, C('#eae6dc'), { hard: true, gloss: .22 });
  for (const s of [-1, 1]) for (const q of [-1, 1])
    cap(VX + s * .20, .17, VZ + q * .47, .016, .34, .016, col.steelD, { gloss: G.metal });
  box(VX + .015, .30, VZ, .50, .44, 1.08, REDV, { hard: true, gloss: .20 });
  glyphs(VX + .272, .30, VZ, Math.PI / 2, '志愿服务站',
    { size: .105, gap: .028, color: C('#f6ece0'), mode: 1, lift: .008 });
  cyl(VX - .02, .51, VZ - .36, .09, .30, C('#c9c4b8'), { gloss: .30 });
  cyl(VX - .02, .675, VZ - .36, .095, .035, C('#8a8f95'), { gloss: .34 });
  box(VX - .04, .47, VZ + .36, .26, .20, .30, C('#e2ded2'), { hard: true, gloss: .18 });

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
