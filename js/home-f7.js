// 七楼 · 老师家 — F7, the teacher's floor.
//
// Registered into FlatFit (declared at the top of js/world.js). TOWER.md's deck contract puts
// this floor on deck 7 at y 18.60; `DECK_OF['f7']` maps the key to that deck, and every height
// in this file is written off `A.y0` so it follows the contract rather than a copied number.
//
// IMPORTANT — unlike js/home-corridor.js, this file is NOT a fit-out. `buildShell` in
// js/world.js pours a floor, a ceiling and four walls on decks 0 and 2 only, and `buildShafts`
// builds landings on decks 0 and 2 only. On deck 7 the shell builds nothing at all, so this
// file is the whole floor: slab, ceiling, perimeter, partitions, the lift landing, the six
// front doors, and the flat behind the one that opens. See the notes at the foot of the file
// for the two things that belong to whoever owns js/world.js.
//
// The plan, in the building's own coordinates (x -6..6 across, z -5..6.2 front to back):
//
//   走廊  landing      x -6.00 .. 6.00   z  3.20 .. 6.20     doors 701..705 + 706, the teacher's
//   玄关+客厅          x  1.00 .. 6.00   z -2.40 .. 3.20
//   厨房+餐厅          x  1.00 .. 6.00   z -5.00 .. -2.40
//   书房  the study    x -6.00 .. 1.00   z  0.10 .. 3.20    ← the heart of the floor
//   卧室  bedroom      x -6.00 .. 1.00   z -3.60 .. 0.10
//   阳台  balcony      x -6.00 .. 1.00   z -5.00 .. -3.60
//
// The teacher is 陈老师, 语文 at the middle school two streets away. The flat is the most
// legible room in the tower on purpose: this is the floor where the game's writing lives.
const HomeF7 = { built: false, deck: 7 };

FlatFit['f7'] = A => {
  if (!A || typeof A.box !== 'function') {
    console.warn('home-f7: toolkit A missing — floor 7 not built');
    return HomeF7;
  }

  // ------------------------------------------------------------------ toolkit, with fallbacks
  const box = A.box, cyl = A.cyl, ball = A.ball, flat = A.flat, wall = A.wall;
  const cap = A.cap || A.capsule || A.box;
  const taper = A.taper || A.box;
  const ceil = A.ceiling || ((x, y, z, w, d, c, o) => flat(x, y, z, w, d, c, o));
  const glyph = A.glyph || A.glyphs || (() => []);
  const stop = A.stop || A.solid || (() => null);
  const thing = A.th || A.thing || (() => null);
  const light = A.light || (() => null);
  const shade = A.shade || (() => null);
  const glow = A.glow || (() => null);
  const C = A.C, M = A.M, MAT = A.MAT;
  const PI = Math.PI;

  // ------------------------------------------------------------------ the coordinate contract
  const CR = A.CORR || { x0: -6.0, x1: 6.0, z0: 3.2, z1: 6.2, h: 2.60 };
  const FT = A.FLAT || { x0: -6.0, x1: 6.0, z0: -5.0, z1: 3.2, h: 2.60 };
  const LF = A.LIFT || { x0: 1.6, x1: 3.4, z0: 4.9, z1: 6.2 };
  const LB = A.LIFT_B || { x0: -0.4, x1: 1.4, z0: 4.9, z1: 6.2 };

  const Y = A.y0;                       // world y of deck 7 — 18.60. Never a literal.
  const X0 = CR.x0, X1 = CR.x1;         // -6.00 .. 6.00, the building
  const ZN = CR.z1;                     // 6.20  the back wall of the landing
  const ZC = CR.z0;                     // 3.20  the wall between the landing and the flat
  const ZF = FT.z0;                     // -5.00 the street face of the flat
  const H = CR.h;                       // 2.60  clear height on this deck
  const CY = Y + H;                     // the ceiling plane
  const FL = Y + .006;                  // what a thing standing on the floor stands on
  const TRIM = .130;                    // skirting height, matching the shell's downstairs

  // The teacher's own door, cut in the z = 3.20 wall. Nothing else on this deck may build in
  // x 3.40 .. 4.40 at that wall.
  const FX = 3.90, FW = 1.00, FTOP = 2.10;

  // The internal partitions. One number each, and every wall, collider and doorway below is
  // derived from them.
  const PX = 1.00;                      // the north-south spine: study/bedroom | living/kitchen
  const PZS = 0.10;                     // study | bedroom
  const PZB = -3.60;                    // bedroom | balcony
  const PZK = -2.40;                    // living | kitchen
  const DR_S = [1.55, 2.55];            // the study doorway, in z
  const DR_B = [-1.65, -0.65];          // the bedroom doorway, in z
  const DR_K = [3.35, 4.35];            // the kitchen doorway, in x
  const DR_Y = [-4.50, -3.20];          // the balcony slider, in x

  A.deckH(CY);

  // ------------------------------------------------------------------ palette
  // A teacher's flat is not decorated, it is *kept*: cream distemper, dark walnut joinery that
  // was good when it was bought, brass that has gone brown, and paper everywhere. The landing
  // outside is the building's own institutional green-grey.
  const col = {
    wall:   C('#d8d0bd'), wallW: C('#e3ddcd'), dado: C('#98a294'), dadoT: C('#78826f'),
    ceilC:  C('#eae5d8'), slab: C('#8d8579'), slabD: C('#7a7367'),
    wood:   C('#6b4a30'), woodD: C('#4a3120'), woodL: C('#8e6842'), woodP: C('#a8814f'),
    walnut: C('#5a3b26'), oak:   C('#9c7549'),
    steel:  C('#b2b8bd'), steelD:C('#8a9197'), steelX:C('#6d747a'), alu: C('#c3c9cd'),
    brass:  C('#b08a3c'), brassD:C('#846626'), gold: C('#e0b45e'),
    red:    C('#ae2b1f'), redD:  C('#7c1d14'), redL: C('#c8483a'),
    ink:    C('#241c16'), inkL:  C('#3b3128'), paper: C('#efe9d8'), paperD: C('#ddd4bd'),
    chalk:  C('#e9e6da'), chalkY:C('#e6d79a'), board: C('#20362b'), boardR: C('#5c432a'),
    green:  C('#1e7a45'), greenL:C('#4ec489'), jade: C('#2f6d5a'), lamp: C('#1f6a4a'),
    glass:  C('#cfdde4'), sky:   C('#b3cbdf'), skyLo: C('#d6e0e6'),
    tower:  C('#93a7b7'), towerD:C('#7b91a3'), warm: C('#f6efd8'), dead: C('#b9b6ad'),
    grey:   C('#7d848a'), rubber:C('#3a3f42'), cloth: C('#8d9a86'), clothD: C('#5f6b5c'),
    tea:    C('#7a4a33'), clay:  C('#7d4230'), leaf: C('#4b7a44'), leafD: C('#35603a'),
    white:  C('#f2efe6'), bone:  C('#e8e0cc'), navy: C('#2c3f57'), plum: C('#6b3448'),
  };
  const MT = {
    // No `mode: 4`. That branch in js/gl.js is `noise(vW.xy * 34.0)` plus a
    // `smoothstep(0.0, 2.4, vW.y)` gradient, both in WORLD y — which is 18.6 .. 21.2 up here.
    // The gradient saturates, so a wall on this deck loses its floor-to-ceiling shading, and the
    // noise hash degenerates at those coordinates into broad diagonal bands across a two-metre
    // panel. The shell's own MAT.plaster carries no mode for the same reason; the texture does
    // the work. See the note at the foot of this file.
    plaster: { mat: 'plaster', matScale: .62, matAmt: .12, nrmAmt: .14 },
    slab:    { mode: 9, mat: 'paving', matScale: .70, matAmt: .24, nrmAmt: .28 },
    timber:  { mode: 3, mat: 'wood', matScale: .95, matAmt: .28, nrmAmt: .32 },
    metal:   { mode: 0, mat: 'metal', matScale: .55, matAmt: .16, nrmAmt: .24 },
    tile:    { mode: 9, mat: 'tile', matScale: .34, matAmt: .26, nrmAmt: .28 },
    cloth:   { mode: 7, mat: 'fabric', matScale: .55, matAmt: .26, nrmAmt: .26 },
  };

  // Writing on a face. `glyph` pushes its quads along the yaw it is given, so passing the front
  // face of whatever it is written on together with the yaw the reader looks from puts the ink
  // in front of the object on any wall in the flat.
  const G = (x, y, z, yaw, text, o) => glyph(x, y, z, yaw, text, { color: col.ink, ...o });
  // An interactable. `focus` is a spot on the floor a body can genuinely stand on — never inside
  // the furniture the word belongs to.
  const TH = (hz, x, y, z, zh, en, note, fx, fz, reach = 1.7, tag) =>
    thing(hz, x, y, z, zh, en, note, { focus: [fx, fz], reach, tag: tag || hz });

  // Deterministic noise, so a book wall renders the same way twice and a screenshot means
  // something. Anything random in this file goes through here.
  let seed = 70706;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pick = a => a[(rnd() * a.length) | 0];

  // ===================================================================================== SHELL
  //
  // Floor, ceiling and the four sides of the building on this deck. Every quad here is
  // single-sided and faces into the room it serves: yaw 0 is +z, PI is -z, +PI/2 is +x.

  // --- floors. Three fields, in disjoint rectangles so no two quads ever share a plane:
  // terrazzo on the landing, board on the living side of the flat, and a plain tile in the
  // kitchen and on the balcony, which is what gets washed.
  flat(0, Y + .004, (ZC + ZN) / 2, X1 - X0, ZN - ZC, col.slab, { gloss: .34, ...MT.slab });
  flat((X0 + PX) / 2, Y + .004, (PZB + ZC) / 2, PX - X0, ZC - PZB, C('#8a6440'),
       { gloss: .26, ...MT.timber });
  flat((PX + X1) / 2, Y + .004, (PZK + ZC) / 2, X1 - PX, ZC - PZK, C('#8a6440'),
       { gloss: .26, ...MT.timber });
  flat((PX + X1) / 2, Y + .004, (ZF + PZK) / 2, X1 - PX, PZK - ZF, C('#b3a993'),
       { gloss: .40, ...MT.tile });
  flat((X0 + PX) / 2, Y + .004, (ZF + PZB) / 2, PX - X0, PZB - ZF, C('#a8a08c'),
       { gloss: .42, ...MT.tile });

  // --- ceilings, one per side of the corridor wall.
  ceil(0, CY, (ZC + ZN) / 2, X1 - X0, ZN - ZC, C('#e7e1d3'), { gloss: .08, glow: .02 });
  ceil(0, CY, (ZF + ZC) / 2, X1 - X0, ZC - ZF, col.ceilC, { gloss: .08, glow: .02 });

  // --- the perimeter. The walls stand 10 cm taller than the ceiling quad, which is invisible
  // from inside and closes the sightline over the top of a far wall.
  const WH = H + .10;
  wall(0, Y + WH / 2, ZN, X1 - X0, WH, PI, col.wall, MT.plaster);            // landing, back
  wall(0, Y + WH / 2, ZF, X1 - X0, WH, 0, col.wallW, MT.plaster);            // flat, street face
  for (const s of [-1, 1]) {
    wall(s * X1, Y + WH / 2, (ZC + ZN) / 2, ZN - ZC, WH, -s * PI / 2, col.wall, MT.plaster);
    wall(s * X1, Y + WH / 2, (ZF + ZC) / 2, ZC - ZF, WH, -s * PI / 2, col.wallW, MT.plaster);
  }
  // The wall between the landing and the flat, both faces, split round the teacher's doorway.
  for (const [x0, x1] of [[X0, FX - FW / 2], [FX + FW / 2, X1]]) {
    wall((x0 + x1) / 2, Y + H / 2, ZC, x1 - x0, H, 0, C('#cfc5ae'), MT.plaster);   // landing side
    wall((x0 + x1) / 2, Y + H / 2, ZC, x1 - x0, H, PI, col.wallW, MT.plaster);     // flat side
  }
  wall(FX, Y + (FTOP + H) / 2, ZC, FW, H - FTOP, 0, C('#cfc5ae'), MT.plaster);
  wall(FX, Y + (FTOP + H) / 2, ZC, FW, H - FTOP, PI, col.wallW, MT.plaster);
  // the reveal of that opening: two jambs and a soffit, so the wall reads as having thickness
  for (const s of [-1, 1])
    box(FX + s * (FW / 2 + .055), Y + FTOP / 2, ZC, .11, FTOP, .17, col.wallW,
        { hard: true, gloss: .12, ...MT.plaster });
  box(FX, Y + FTOP + .055, ZC, FW + .22, .11, .17, col.wallW,
      { hard: true, gloss: .12, ...MT.plaster });

  // --- skirting. Everywhere except across the doorway.
  const skirt = (x, z, w, d, c) => box(x, Y + .065, z, w, TRIM, d, c,
                                       { hard: true, gloss: .20, ...MT.timber });
  skirt(0, ZN - .045, X1 - X0, .065, C('#8b8376'));
  skirt(0, ZF + .045, X1 - X0, .065, col.woodD);
  for (const s of [-1, 1]) {
    skirt(s * (X1 - .045), (ZC + ZN) / 2, .065, ZN - ZC, C('#8b8376'));
    skirt(s * (X1 - .045), (ZF + ZC) / 2, .065, ZC - ZF, col.woodD);
  }
  for (const [x0, x1] of [[X0, FX - FW / 2], [FX + FW / 2, X1]]) {
    skirt((x0 + x1) / 2, ZC + .045, x1 - x0, .065, C('#8b8376'));
    skirt((x0 + x1) / 2, ZC - .045, x1 - x0, .065, col.woodD);
  }

  // --- the walkable plan. `zone` is required: setFloor(7) refuses a deck with none, and a
  // corridor with no zone is a corridor you cannot stand in.
  //
  // Rooms are registered as touching rectangles and the doorways between them as short zones
  // that straddle the partition. `clampMove` only considers zones the body already occupies,
  // so two rooms that merely share an edge are two sealed rooms — the body is held 0.30 m
  // (its own radius) clear of the edge in each and never reaches the other. Every straddle
  // below overlaps its two neighbours by 0.80 m, comfortably more than that radius; the real
  // width of each opening is set by the partition colliders further down, not by these.
  A.zone({ id: 'f7', x0: X0, x1: X1, z0: ZC, z1: ZN, light: [0, Y + 2.30, 4.05], ceil: CY - .06 });
  A.zone({ id: 'f7men', x0: FX - FW / 2, x1: FX + FW / 2, z0: ZC - .70, z1: ZC + .70,
           light: [FX, Y + 2.30, ZC], ceil: CY - .06 });
  A.zone({ id: 'f7keting', x0: PX, x1: X1, z0: PZK, z1: ZC,
           light: [3.55, Y + 2.34, 0.30], ceil: CY - .06 });
  A.zone({ id: 'f7chufang', x0: PX, x1: X1, z0: ZF, z1: PZK,
           light: [3.40, Y + 2.34, -3.55], ceil: CY - .06 });
  A.zone({ id: 'f7shufang', x0: X0, x1: PX, z0: PZS, z1: ZC,
           light: [-2.40, Y + 2.34, 1.70], ceil: CY - .06 });
  A.zone({ id: 'f7woshi', x0: X0, x1: PX, z0: PZB, z1: PZS,
           light: [-2.60, Y + 2.34, -1.80], ceil: CY - .06 });
  A.zone({ id: 'f7yangtai', x0: X0, x1: PX, z0: ZF, z1: PZB,
           light: [-2.60, Y + 2.28, -4.30], ceil: CY - .06 });
  // the four straddles
  A.zone({ id: 'f7d1', x0: PX - .80, x1: PX + .80, z0: DR_S[0] - .30, z1: DR_S[1] + .30,
           light: [PX, Y + 2.34, 2.05], ceil: CY - .06 });
  A.zone({ id: 'f7d2', x0: PX - .80, x1: PX + .80, z0: DR_B[0] - .30, z1: DR_B[1] + .30,
           light: [PX, Y + 2.34, -1.15], ceil: CY - .06 });
  A.zone({ id: 'f7d3', x0: DR_K[0] - .30, x1: DR_K[1] + .30, z0: PZK - .80, z1: PZK + .80,
           light: [3.85, Y + 2.34, PZK], ceil: CY - .06 });
  A.zone({ id: 'f7d4', x0: DR_Y[0] - .30, x1: DR_Y[1] + .30, z0: PZB - .70, z1: PZB + .80,
           light: [-3.85, Y + 2.30, PZB], ceil: CY - .06 });

  // ============================================================================== PARTITIONS
  //
  // Each is a pair of one-sided quads 100 mm apart with a lintel over the opening, and a pair
  // of colliders that leave the opening clear. Never one quad doing both faces: a partition
  // built that way is a hole from the side that is not its yaw.
  const PH = H;                                   // partitions run full height
  function partX(x, z0, z1, gap, cW, cE) {
    const runs = gap ? [[z0, gap[0]], [gap[1], z1]] : [[z0, z1]];
    for (const [a, b] of runs) {
      if (b - a < .02) continue;
      wall(x - .05, Y + PH / 2, (a + b) / 2, b - a, PH, -PI / 2, cW, MT.plaster);
      wall(x + .05, Y + PH / 2, (a + b) / 2, b - a, PH, PI / 2, cE, MT.plaster);
      box(x, Y + .065, (a + b) / 2, .13, TRIM, b - a, col.woodD,
          { hard: true, gloss: .20, ...MT.timber });
      stop(x - .07, x + .07, a, b);
    }
    if (!gap) return;
    // head of the opening, and the two reveals
    box(x, Y + (2.06 + PH) / 2, (gap[0] + gap[1]) / 2, .10, PH - 2.06, gap[1] - gap[0], cW,
        { hard: true, gloss: .12, ...MT.plaster });
    for (const g of gap)
      box(x, Y + 1.03, g, .12, 2.06, .06, col.wood, { hard: true, gloss: .22, ...MT.timber });
    box(x, Y + 2.09, (gap[0] + gap[1]) / 2, .12, .06, gap[1] - gap[0] + .12, col.wood,
        { hard: true, gloss: .22, ...MT.timber });
  }
  function partZ(z, x0, x1, gap, cS, cN) {
    const runs = gap ? [[x0, gap[0]], [gap[1], x1]] : [[x0, x1]];
    for (const [a, b] of runs) {
      if (b - a < .02) continue;
      wall((a + b) / 2, Y + PH / 2, z - .05, b - a, PH, PI, cS, MT.plaster);
      wall((a + b) / 2, Y + PH / 2, z + .05, b - a, PH, 0, cN, MT.plaster);
      box((a + b) / 2, Y + .065, z, b - a, TRIM, .13, col.woodD,
          { hard: true, gloss: .20, ...MT.timber });
      stop(a, b, z - .07, z + .07);
    }
    if (!gap) return;
    box((gap[0] + gap[1]) / 2, Y + (2.06 + PH) / 2, z, gap[1] - gap[0], PH - 2.06, .10, cN,
        { hard: true, gloss: .12, ...MT.plaster });
    for (const g of gap)
      box(g, Y + 1.03, z, .06, 2.06, .12, col.wood, { hard: true, gloss: .22, ...MT.timber });
    box((gap[0] + gap[1]) / 2, Y + 2.09, z, gap[1] - gap[0] + .12, .06, .12, col.wood,
        { hard: true, gloss: .22, ...MT.timber });
  }
  partX(PX, PZS, ZC, DR_S, col.wallW, col.wallW);          // 书房 | 客厅
  partX(PX, ZF, PZS, DR_B, col.wallW, col.wallW);          // 卧室·阳台 | 客厅·厨房
  partZ(PZS, X0, PX, null, col.wallW, col.wallW);          // 卧室 | 书房 — the blackboard wall
  partZ(PZK, PX, X1, DR_K, C('#d5cdb6'), col.wallW);       // 厨房 | 客厅

  // The balcony partition is glazed, so it gets its own build: a timber frame with four panes
  // over a solid apron, and a slider standing open.
  (function balconyScreen() {
    const z = PZB, [g0, g1] = DR_Y;
    for (const [a, b] of [[X0, g0], [g1, PX]]) {
      if (b - a < .02) continue;
      // apron under the glazing
      box((a + b) / 2, Y + .42, z, b - a, .84, .11, col.wallW,
          { hard: true, gloss: .14, ...MT.plaster });
      box((a + b) / 2, Y + .065, z, b - a, TRIM, .13, col.woodD, { hard: true, gloss: .20 });
      // frame and panes
      box((a + b) / 2, Y + 2.36, z, b - a, .30, .11, col.wallW,
          { hard: true, gloss: .14, ...MT.plaster });
      const n = Math.max(1, Math.round((b - a) / .62));
      for (let i = 0; i < n; i++) {
        const cx = a + (i + .5) * (b - a) / n;
        box(cx, Y + 1.53, z, (b - a) / n - .06, 1.26, .022, col.glass,
            { hard: true, mode: 18, alpha: .16, gloss: .74 });
        for (const s of [-1, 1])
          box(cx + s * ((b - a) / n / 2 - .015), Y + 1.53, z, .05, 1.30, .06, col.wood,
              { hard: true, gloss: .24, ...MT.timber });
      }
      box((a + b) / 2, Y + .87, z, b - a, .07, .07, col.wood, { hard: true, gloss: .24 });
      box((a + b) / 2, Y + 2.19, z, b - a, .07, .07, col.wood, { hard: true, gloss: .24 });
      stop(a, b, z - .07, z + .07);
    }
    // the slider itself, parked open against the west leaf
    box(g0 + .34, Y + 1.30, z - .09, .64, 2.20, .05, col.wood,
        { hard: true, gloss: .24, tag: '阳台', ...MT.timber });
    box(g0 + .34, Y + 1.52, z - .09, .52, 1.42, .018, col.glass,
        { hard: true, mode: 18, alpha: .16, gloss: .74 });
    cyl(g0 + .60, Y + 1.06, z - .12, .014, .22, col.brassD, { gloss: .5 });
    // head track
    box((g0 + g1) / 2, Y + 2.24, z - .07, g1 - g0 + .10, .07, .09, col.alu,
        { hard: true, gloss: .38, ...MT.metal });
  })();

  // ===================================================================== the landing, deck 7
  //
  // A shared corridor is painted, not decorated: cream above a green-grey dado, and everything
  // else is steel, red, or the brown of six security doors.
  const DY0 = Y + TRIM, DH = 1.12 - TRIM, DYC = DY0 + DH / 2;
  function dado(axis, plane, sgn, runs) {
    const p1 = plane + sgn * .015, p2 = plane + sgn * .020;
    for (const [a0, a1] of runs) {
      const c = (a0 + a1) / 2, L = a1 - a0;
      if (L <= .002) continue;
      const put = (y, h, d, w, colr, g) => axis === 'x'
        ? box(c, y, d, L, h, w, colr, { hard: true, gloss: g })
        : box(d, y, c, w, h, L, colr, { hard: true, gloss: g });
      put(DYC, DH, p1, .03, col.dado, .18);
      put(DY0 + DH + .014, .028, p2, .04, col.dadoT, .22);
    }
  }
  dado('x', ZC, 1, [[X0, FX - FW / 2], [FX + FW / 2, X1]]);   // the flat's wall
  dado('x', ZN, -1, [[X0, LB.x0], [LF.x1, X1]]);              // the back wall, either side of the shafts
  const SZ = 4.20, SW = .95, STOP = 2.06;                     // the fire stair, on the east wall
  const WZ = 4.30, WW = 1.40, WSILL = .92, WTOP = 2.16;       // the landing window, west end
  dado('z', X0, 1, [[ZC, WZ - WW / 2], [WZ + WW / 2, ZN]]);
  dado('z', X1, -1, [[ZC, SZ - SW / 2], [SZ + SW / 2, ZN]]);

  // --- the two lift shafts, seen from the landing.
  //
  // NOTE FOR js/world.js: `buildShafts` runs `for (const f of [0, 2])`, so on every deck above
  // the second there is no shaft geometry, no landing and no call panel — the shaft is an open
  // void in the back of the corridor and the eye goes straight through the building. What
  // follows is a stand-in, built 20 mm proud of the planes the shell's own `landing()` uses so
  // that when the shell is generalised the two do not fight for the same pixels. Delete it then.
  const SF = LF.z0 - .020, SB = LB.z0 - .020;                 // the two shaft faces
  // The shell now builds a real landing on every deck — doors, surround, indicator, call panel,
  // moving leaves and an opening collider. This stand-in stands down rather than double-building.
  // The shell builds a real landing on every deck (SHAFT_DECKS, js/world.js:246), so the
  // stand-in that used to sit here under `if (!shellLanding)` was dead code. Removed 2026-08-09.

  // --- the fallback call panel, and the little brass plate somebody screwed on beside it
  const CPX = 3.72, CPZ = SF - .02;
  box(CPX, Y + 1.40, CPZ - .014, .22, .09, .012, col.brass, { hard: true, gloss: .5 });
  G(CPX, Y + 1.40, CPZ - .026, PI, '七层', { size: .052, gap: .010, color: col.ink });

  // --- ceiling services. The sprinkler main hugs the flat's wall, because that is the only
  // line down the landing that is clear of the shafts for all twelve metres.
  for (let i = 0; i < 4; i++)
    cyl(X0 + 1.5 + i * 3.0, CY - .17, ZC + .18, .036, 3.0, col.redD,
        { rz: PI / 2, gloss: .34, ...MT.metal });
  for (let i = 0; i < 5; i++) {
    const px = X0 + 1.3 + i * 2.4;
    cyl(px, CY - .225, ZC + .18, .016, .07, col.brassD, { gloss: .5 });
    ball(px, CY - .262, ZC + .18, .026, .020, .026, col.brass, { gloss: .55 });
  }
  box(0, CY - .045, ZC + .10, X1 - X0, .05, .07, col.white, { hard: true, gloss: .12 });
  // four surface bulkheads, one of them dead, which is the true state of every landing here
  for (const [px, pz, alive] of [[-4.40, 4.10, true], [-1.30, 4.10, false],
                                 [1.60, 3.60, true], [4.80, 4.10, true]]) {
    box(px, CY - .045, pz, .46, .07, .16, col.steelD, { hard: true, gloss: .30 });
    box(px, CY - .095, pz, .40, .05, .12, alive ? col.warm : col.dead,
        { hard: true, mode: alive ? 1 : 0, glow: alive ? .13 : 0, gloss: .10 });
    if (alive) light(px, CY - .20, pz, C('#dfe9ef'), .50, 3.30);
  }
  light(0.60, Y + 1.15, 4.20, C('#e6eef2'), .20, 2.60);

  // --- 安全出口. Flat on the wall, so the arrow points along the corridor in world space and
  // means what it says. A glyph reads left-to-right in the reader's frame, so "east" is drawn
  // ← on the back wall and → on the flat's wall.
  function exitSign(x, y, z, sgn, arrow) {
    const yaw = sgn > 0 ? 0 : PI, f = d => z + sgn * d;
    const w = arrow ? .46 : .38;
    box(x, y, f(.028), w, .155, .055, col.green, { hard: true, gloss: .26, tag: '安全出口' });
    box(x, y, f(.058), w - .035, .125, .006, col.greenL,
        { hard: true, mode: 1, glow: .14, tag: '安全出口' });
    G(x - (arrow ? .062 : 0), y, f(.058), yaw, '安全出口',
      { size: arrow ? .072 : .082, gap: .010, color: col.white, mode: 1, glow: .16 });
    if (arrow) G(x + .175, y, f(.058), yaw, sgn > 0 ? '→' : '←',
                 { size: .095, color: col.white, mode: 1, glow: .16 });
  }
  exitSign(-2.60, Y + 2.28, ZC, 1, true);
  exitSign(-5.10, Y + 2.28, ZN, -1, true);
  exitSign(1.90, Y + 2.28, ZC, 1, true);
  box(X1 - .035, Y + STOP + .19, SZ, .06, .155, .40, col.green,
      { hard: true, gloss: .26, tag: '安全出口' });
  box(X1 - .068, Y + STOP + .19, SZ, .006, .125, .365, col.greenL,
      { hard: true, mode: 1, glow: .14, tag: '安全出口' });
  G(X1 - .068, Y + STOP + .19, SZ, -PI / 2, '安全出口',
    { size: .086, gap: .012, color: col.white, mode: 1, glow: .16 });

  // ===================================================================== the six front doors
  //
  // 防盗门, five of them somebody else's. The frame stands 90 mm off the wall and the leaf
  // 60 mm, so the leaf reads as recessed in its architrave and nothing is coplanar with
  // anything — a flush-mounted door in this renderer flickers as horizontal stripes.
  function frontDoor(cx, zw, sgn, num, o = {}) {
    const yaw = sgn > 0 ? 0 : PI;
    const W = o.w || 1.00, HT = o.top || 2.06, LW = W - .05, LH = HT - .04;
    const F = z => zw + sgn * z;
    const hinge = o.hinge === undefined ? -1 : o.hinge;
    const body = o.body || col.wood, panel = o.panel || col.woodL;
    const jTop = Y + HT + .07;
    for (const s of [-1, 1])
      box(cx + s * (W / 2 + .035), (Y + jTop) / 2, F(.045), .07, jTop - Y, .09, col.woodD,
          { hard: true, gloss: .26, tag: o.tag });
    box(cx, Y + HT + .035, F(.045), W + .14, .07, .09, col.woodD,
        { hard: true, gloss: .26, tag: o.tag });
    if (o.open) return null;                    // the teacher's leaf is hung separately, open
    const leaf = box(cx, Y + LH / 2, F(.030), LW, LH, .06, body,
                     { hard: true, gloss: .24, tag: o.tag, ...MT.timber });
    for (const [py, ph] of [[LH * .70, LH * .40], [LH * .265, LH * .30]]) {
      box(cx, Y + py, F(.070), LW - .16, ph, .020, panel, { hard: true, gloss: .22, tag: o.tag });
      for (const s of [-1, 1])
        box(cx, Y + py + s * ph / 2, F(.082), LW - .16, .012, .012, col.woodD,
            { hard: true, gloss: .3, tag: o.tag });
    }
    const hx = cx - hinge * (LW / 2 - .13);
    box(hx, Y + 1.03, F(.075), .10, .24, .03, col.steelD, { hard: true, gloss: .46, tag: o.tag });
    cyl(hx, Y + 1.03, F(.115), .016, .07, col.steel, { rx: PI / 2, gloss: .5, tag: o.tag });
    box(hx - hinge * .085, Y + 1.03, F(.148), .19, .028, .028, col.steel,
        { hard: true, gloss: .5, tag: o.tag });
    cyl(hx, Y + .88, F(.078), .020, .012, col.brassD, { rx: PI / 2, gloss: .55, tag: o.tag });
    cyl(cx, Y + 1.56, F(.078), .012, .030, col.brass, { rx: PI / 2, gloss: .6, tag: o.tag });
    for (const hy of [.36, 1.06, 1.76])
      cyl(cx + hinge * (LW / 2 - .012), Y + hy, F(.062), .014, .10, col.steelD,
          { gloss: .45, tag: o.tag });
    box(cx, Y + 1.84, F(.072), .30, .13, .024, col.steel, { hard: true, gloss: .40, tag: o.tag });
    G(cx, Y + 1.84, F(.084), yaw, num, { size: .073, gap: .012, color: col.ink, gloss: .2 });
    flat(cx, FL + .006, F(.32), .64, .40, o.mat || col.rubber, { mode: 7, gloss: .04 });
    shade(cx, F(.32), .72, .48, .26, FL + .010);
    return leaf;
  }
  function couplets(cx, zw, sgn, a, b, top) {
    const yaw = sgn > 0 ? 0 : PI, F = z => zw + sgn * z;
    for (const [s, text] of [[-1, a], [1, b]]) {
      box(cx + s * .58, Y + 1.48, F(.020), .12, 1.02, .04, col.red,
          { hard: true, gloss: .10, tag: '春联' });
      G(cx + s * .58, Y + 1.48, F(.040), yaw, text,
        { size: .105, gap: .018, color: col.gold, vertical: true, gloss: .12 });
    }
    box(cx, Y + 2.28, F(.020), .62, .15, .04, col.red, { hard: true, gloss: .10, tag: '春联' });
    G(cx, Y + 2.28, F(.040), yaw, top, { size: .098, gap: .020, color: col.gold });
  }
  function fuDiamond(cx, y, zw, sgn, s = .21) {
    const yaw = sgn > 0 ? 0 : PI;
    box(cx, Y + y, zw + sgn * .095, s, s, .018, col.red,
        { hard: true, gloss: .10, ry: sgn > 0 ? PI / 4 : -PI / 4 });
    G(cx, Y + y, zw + sgn * .106, yaw, '福', { size: s * .60, color: col.gold, gloss: .14 });
  }

  // Five neighbours on the back wall, west to east. The back wall's usable stretches are
  // x -6.0 .. -0.4 and 3.4 .. 6.0 — between those the two shafts stand against it.
  const N1 = -5.15, N2 = -3.55, N3 = -1.95, N4 = 4.25, N5 = 5.50;
  frontDoor(N1, ZN, -1, '701', { tag: '邻居', hinge: 1, mat: C('#4a4f52') });
  couplets(N1, ZN, -1, '一元复始万象新', '四季平安百福臻', '出入平安');
  frontDoor(N2, ZN, -1, '702', { tag: '邻居', body: col.woodL, panel: col.wood, mat: C('#7d3f37') });
  frontDoor(N3, ZN, -1, '703', { tag: '邻居', mat: col.rubber });
  fuDiamond(N3, 1.34, ZN, -1);
  frontDoor(N4, ZN, -1, '704', { tag: '邻居', hinge: 1, body: col.woodD, panel: col.wood,
                                 mat: C('#3f4a3f') });
  // 704 has a 八卦镜 over the door, which is what a flat stuck with that number always has
  cyl(N4, Y + 2.30, ZN - .10, .105, .028, col.woodD, { rx: PI / 2, gloss: .30 });
  cyl(N4, Y + 2.30, ZN - .126, .062, .010, C('#c9d4d8'), { rx: PI / 2, gloss: .82 });
  for (let i = 0; i < 8; i++)
    box(N4 + Math.sin(i * PI / 4) * .085, Y + 2.30 + Math.cos(i * PI / 4) * .085, ZN - .118,
        .030, .010, .008, col.ink, { hard: true, ry: 0, rz: -i * PI / 4 });
  frontDoor(N5, ZN, -1, '705', { tag: '邻居', mat: col.rubber });

  // --- 706, the teacher's, in the flat's wall, and the only one that opens.
  frontDoor(FX, ZC, 1, '706', { tag: '门', w: FW, top: FTOP, open: true });
  // The number plate lives on the jamb rather than on the leaf, because this leaf is standing
  // open inside the flat and a 门牌 you can only read from the 玄关 is no use to anybody.
  box(FX + FW / 2 + .035, Y + 1.84, ZC + .095, .07, .17, .28, col.steel,
      { hard: true, gloss: .40, tag: '门' });
  G(FX + FW / 2 + .035, Y + 1.86, ZC + .098, PI / 2, '706',
    { size: .068, gap: .011, color: col.ink, gloss: .2 });
  G(FX + FW / 2 + .035, Y + 1.72, ZC + .098, PI / 2, '陈',
    { size: .046, color: C('#8a3a30'), gloss: .1 });
  // The leaf, standing wide open against the inside face of the wall. Held there by the shoe
  // cabinet behind it, which is why it never quite closes on its own.
  (function openLeaf() {
    const LW = FW - .05, LH = FTOP - .06, a = .11;                 // 6 degrees off the wall
    const hx = FX - FW / 2 + .04, hz = ZC - .05;
    const cxx = hx - Math.cos(a) * LW / 2, czz = hz - Math.sin(a) * LW / 2;
    const O = { hard: true, ry: a, tag: '门' };
    box(cxx, Y + LH / 2, czz, LW, LH, .06, col.wood, { ...O, gloss: .24, ...MT.timber });
    for (const [py, ph] of [[LH * .70, LH * .40], [LH * .265, LH * .30]])
      box(cxx - Math.sin(a) * .04, Y + py, czz + Math.cos(a) * .04, LW - .16, ph, .020, col.woodL,
          { ...O, gloss: .22 });
    // the inside face gets the handle, the chain, and the calendar everyone hangs on the back
    box(cxx + Math.cos(a) * (LW / 2 - .13) - Math.sin(a) * .05, Y + 1.03,
        czz + Math.sin(a) * (LW / 2 - .13) + Math.cos(a) * .05, .10, .24, .03, col.steelD,
        { ...O, gloss: .46 });
    box(cxx - Math.sin(a) * .045, Y + 1.72, czz + Math.cos(a) * .045, .30, .42, .012, col.paper,
        { ...O, gloss: .06, tag: '日历' });
    box(cxx - Math.sin(a) * .050, Y + 1.86, czz + Math.cos(a) * .050, .30, .13, .006, col.red,
        { ...O, gloss: .08, tag: '日历' });
    G(cxx - Math.sin(a) * .058, Y + 1.86, czz + Math.cos(a) * .058, a, '九月',
      { size: .072, gap: .014, color: col.gold });
    G(cxx - Math.sin(a) * .058, Y + 1.66, czz + Math.cos(a) * .058, a, '十',
      { size: .175, color: col.ink });
    G(cxx - Math.sin(a) * .058, Y + 1.50, czz + Math.cos(a) * .058, a, '教师节',
      { size: .048, gap: .010, color: col.redD });
    shade(cxx, czz, LW + .1, .30, .22, FL + .008);
  })();
  // 门槛石, and the couplets at the teacher's own door — his are written by hand, not printed
  box(FX, FL + .018, ZC + .07, FW + .05, .036, .19, C('#9b968b'), { hard: true, gloss: .40 });
  for (const s of [-1, 1]) {
    box(FX + s * .60, Y + 1.50, ZC + .020, .12, .96, .04, C('#a8382c'), { hard: true, gloss: .08,
        tag: '春联' });
    G(FX + s * .60, Y + 1.50, ZC + .040, 0, s < 0 ? '书山有路勤为径' : '学海无涯苦作舟',
      { size: .100, gap: .018, color: C('#d8b473'), vertical: true, gloss: .10 });
  }
  box(FX, Y + 2.30, ZC + .020, .66, .16, .04, C('#a8382c'), { hard: true, gloss: .08, tag: '春联' });
  G(FX, Y + 2.30, ZC + .040, 0, '春风化雨', { size: .100, gap: .020, color: C('#d8b473') });

  // ===================================================================== what the landing keeps
  // Everything hugs a wall inside 450 mm so the middle of the run stays walkable.

  // --- the window at the west end, built as a shallow bay in front of the solid wall.
  //
  // Seven storeys up: mostly sky, with the tops of the next block in it. Anything at x < -6.0
  // is behind a one-sided wall and does not exist from in here, so the whole bay stands inside.
  function windowBay(axis, plane, n, c, w, sill, top, o = {}) {
    const yc = Y + (sill + top) / 2, hh = top - sill;
    // P(depth into the room, offset along the wall, y, thickness, height, width, colour, opt)
    const P = (d, off, y, th, h2, w2, c2, o2 = {}) => axis === 'x'
      ? box(plane + n * d, y, c + off, th, h2, w2, c2, o2)
      : box(c + off, y, plane + n * d, w2, h2, th, c2, o2);
    // 398 — the back of the reveal joins `skyGlass` so the clock re-tints it.
    const bayPane =
      P(.012, 0, yc, .012, hh + .10, w + .10, o.sky || col.sky, { hard: true, mode: 1, glow: .035 });
    if (A.sky) A.sky(bayPane);
    P(.018, 0, Y + sill + .20, .010, .38, w + .08, col.skyLo, { hard: true, mode: 1, glow: .028 });
    for (const [toff, tw, th2, tc] of [[-.46, .32, .78, col.towerD], [-.10, .24, .54, col.tower],
                                       [.28, .36, .92, col.towerD], [.60, .22, .46, col.tower]])
      P(.026, toff * (w / 1.30), Y + sill + th2 / 2, .010, th2, tw, tc,
        { hard: true, mode: 1, glow: .018 });
    // the reveal: four plaster returns boxing the view in
    P(.060, 0, Y + sill - .05, .12, .10, w + .20, col.wallW, { hard: true, gloss: .10 });
    P(.060, 0, Y + top + .05, .12, .10, w + .20, col.wallW, { hard: true, gloss: .10 });
    for (const s of [-1, 1])
      P(.060, s * (w / 2 + .05), yc, .12, hh, .10, col.wallW, { hard: true, gloss: .10 });
    // frame, mullion, pane
    P(.110, 0, Y + sill + .015, .05, .06, w + .06, col.alu, { hard: true, gloss: .40, ...MT.metal });
    P(.110, 0, Y + top - .015, .05, .06, w + .06, col.alu, { hard: true, gloss: .40, ...MT.metal });
    for (const s of [-1, 1])
      P(.110, s * (w / 2 - .03), yc, .05, hh, .06, col.alu, { hard: true, gloss: .40, ...MT.metal });
    P(.110, 0, yc, .05, hh, .05, col.alu, { hard: true, gloss: .40, ...MT.metal });
    P(.088, 0, yc, .010, hh - .06, w - .06, col.glass,
      { hard: true, mode: 18, alpha: .13, gloss: .78 });
    // sill
    P(.170, 0, Y + sill - .045, .26, .05, w + .22, o.sillC || col.white,
      { hard: true, gloss: .28, tag: o.tag || '窗户' });
    // and the patch of daylight it lays on the floor
    if (o.pool !== false) {
      const gm = axis === 'x'
        ? M.trs(plane + n * (0.55 + w * .30), Y + .022, c, 0, 1.10, 1, w + .5)
        : M.trs(c, Y + .022, plane + n * (0.55 + w * .30), 0, w + .5, 1, 1.10);
      glow(gm, C('#ffeccb'), .070, true);
    }
  }
  windowBay('x', X0, 1, WZ, WW, WSILL, WTOP, { tag: '窗户' });
  // 397/400 — the corridor window is in the WEST gable: outward normal -x, so seven storeys up
  // the shaft crosses the landing in the afternoon rather than arriving from a south wall the
  // floor does not have.
  if (A.setWin)
    A.setWin(X0 + .02, Y + (WSILL + WTOP) / 2, WZ, WW / 2, (WTOP - WSILL) / 2, [-1, 0, 0]);
  // a corridor sill always ends up holding somebody's plants
  cyl(X0 + .20, Y + WSILL + .07, WZ - .44, .080, .14, C('#9d6a4c'), { gloss: .18, tag: '花盆' });
  for (let i = 0; i < 6; i++)
    cap(X0 + .20 + (i % 2 - .5) * .05, Y + WSILL + .19, WZ - .44 + (i - 2.5) * .024,
        .015, .18, .015, i < 2 ? C('#7d7a4a') : col.leaf, { rz: (i - 2.5) * .15, gloss: .10 });
  cyl(X0 + .19, Y + WSILL + .05, WZ + .38, .034, .10, C('#3f6f4a'), { gloss: .45 });
  box(X0 + .14, Y + WTOP + .13, WZ, .19, .03, WW + .16, col.white, { hard: true, gloss: .18 });

  // --- the fire stair at the east end. Surface-mounted, correctly: it never opens, so it wants
  // no hole behind it.
  const sf = x => X1 - x;
  for (const s of [-1, 1])
    box(sf(.045), Y + (STOP + .07) / 2, SZ + s * (SW / 2 + .035), .09, STOP + .07, .07, col.steelD,
        { hard: true, gloss: .30, ...MT.metal });
  box(sf(.045), Y + STOP + .035, SZ, .09, .07, SW + .14, col.steelD,
      { hard: true, gloss: .30, ...MT.metal });
  box(sf(.030), Y + (STOP - .04) / 2, SZ, .06, STOP - .04, SW - .05, C('#9aa0a2'),
      { hard: true, gloss: .26, tag: '楼梯', ...MT.metal });
  box(sf(.062), Y + 1.34, SZ, .012, .70, SW - .17, C('#8b9294'), { hard: true, gloss: .24 });
  box(sf(.075), Y + 1.02, SZ - .30, .05, .05, .40, col.steelX, { hard: true, gloss: .5 });
  cyl(sf(.098), Y + 1.02, SZ - .30, .020, .09, col.steel, { rx: PI / 2, gloss: .55 });
  box(sf(.070), Y + STOP - .18, SZ + .22, .06, .05, .30, col.steelX, { hard: true, gloss: .45 });
  G(sf(.066), Y + 1.72, SZ, -PI / 2, '安全出口', { size: .085, gap: .016, color: col.green });
  G(sf(.066), Y + .62, SZ, -PI / 2, '禁止堆放杂物', { size: .056, gap: .012, color: col.redD });
  G(sf(.066), Y + .50, SZ, -PI / 2, '保持通道畅通', { size: .050, gap: .012, color: col.ink });

  // --- 消火栓
  const HX = -4.30, HZ = ZC + .11;
  box(HX, Y + 1.14, HZ, .70, 1.00, .22, col.red, { hard: true, gloss: .30, tag: '消防栓' });
  box(HX, Y + 1.14, HZ + .112, .60, .90, .010, col.redD, { hard: true, gloss: .34, tag: '消防栓' });
  box(HX - .01, Y + 1.20, HZ + .118, .40, .58, .008, C('#3d4a4e'),
      { hard: true, gloss: .62, alpha: .55 });
  cyl(HX - .01, Y + 1.20, HZ + .06, .17, .12, C('#8c1f18'), { rx: PI / 2, gloss: .18 });
  cyl(HX - .01, Y + 1.20, HZ + .09, .07, .07, col.redD, { rx: PI / 2, gloss: .3 });
  G(HX, Y + 1.76, HZ + .112, 0, '消火栓', { size: .115, gap: .022, color: col.white });
  G(HX, Y + .70, HZ + .112, 0, '火警119', { size: .058, gap: .012, color: col.gold });
  cyl(HX + .50, FL + .27, ZC + .17, .075, .48, col.red, { gloss: .34 });
  taper(HX + .50, FL + .55, ZC + .17, .15, .10, .15, col.red, { gloss: .34 });
  cyl(HX + .50, FL + .63, ZC + .17, .020, .09, col.steelD, { gloss: .5 });
  shade(HX + .50, ZC + .17, .22, .22, .30, FL + .008);

  // --- 电表箱, on the stretch of the flat's wall east of the teacher's door
  const MX = 5.30, MZ = ZC + .06;
  box(MX, Y + 1.44, MZ, .46, .92, .12, col.steelD, { hard: true, gloss: .34, tag: '电表', ...MT.metal });
  box(MX, Y + 1.44, MZ + .065, .40, .84, .012, col.steelX, { hard: true, gloss: .30 });
  ['0704', '0731', '1108'].forEach((r, i) => {
    const my = 1.72 - i * .28;
    box(MX - .06, Y + my, MZ + .073, .20, .13, .008, C('#1c2226'), { hard: true, gloss: .55 });
    G(MX - .06, Y + my, MZ + .081, 0, r, { size: .048, gap: .008, color: C('#cfe3d6'), mode: 1, glow: .10 });
    cyl(MX + .13, Y + my, MZ + .073, .010, .010, C('#d84a3a'), { rz: PI / 2, mode: 1, glow: .18 });
  });
  G(MX, Y + 1.96, MZ + .066, 0, '电表箱', { size: .062, gap: .012, color: col.white });
  box(MX, Y + 2.30, MZ + .010, .09, .60, .05, col.white, { hard: true, gloss: .12 });

  // --- 通知栏, the glazed board every landing has, on the flat's wall by the lift
  const BX = 1.05, BZ = ZC + .030;
  box(BX, Y + 1.55, BZ, 1.30, .84, .05, col.woodD, { hard: true, gloss: .28, tag: '通知' });
  box(BX, Y + 1.55, BZ + .028, 1.20, .74, .010, col.bone, { hard: true, gloss: .10, tag: '通知' });
  box(BX, Y + 1.55, BZ + .046, 1.22, .76, .008, C('#43525a'),
      { hard: true, gloss: .70, alpha: .30 });
  box(BX, Y + 2.00, BZ + .036, 1.24, .12, .020, col.redD, { hard: true, gloss: .18 });
  G(BX, Y + 2.00, BZ + .050, 0, '通知栏', { size: .078, gap: .020, color: col.gold });
  // three notices, taped up crooked, which is the best readable Chinese on the landing
  const NOTE = [
    [-.40, ['本周六上午停水', '请提前储水', '物业管理处'], col.paper, .03],
    [ .02, ['垃圾分类', '厨余·可回收·其他', '每晚七点前投放'], C('#e7eddd'), -.02],
    [ .44, ['电梯年度检修', '二号梯暂停使用', '给您添麻烦了'], C('#eee6d5'), .015],
  ];
  for (const [ox, lines, paper, ry] of NOTE) {
    box(BX + ox, Y + 1.52, BZ + .034, .36, .48, .006, paper, { hard: true, gloss: .05, ry });
    G(BX + ox, Y + 1.68, BZ + .041, 0, lines[0], { size: .050, gap: .009, color: col.ink });
    box(BX + ox, Y + 1.625, BZ + .041, .26, .005, .004, col.ink, { hard: true });
    G(BX + ox, Y + 1.55, BZ + .041, 0, lines[1], { size: .038, gap: .007, color: col.inkL });
    G(BX + ox, Y + 1.44, BZ + .041, 0, lines[2], { size: .032, gap: .006, color: col.grey });
  }

  // --- 小广告, stamped in red on the paint at hand height and never quite scrubbed off
  G(-3.40, Y + 1.32, ZC + .022, 0, '开锁', { size: .062, gap: .010, color: C('#a8352a'), gloss: .05 });
  G(-3.40, Y + 1.24, ZC + .022, 0, '80261', { size: .040, gap: .006, color: C('#a8352a'), gloss: .05 });
  G(-1.90, Y + 1.28, ZC + .022, 0, '疏通下水道', { size: .050, gap: .008, color: C('#96463a'), gloss: .05 });
  G(-2.80, Y + 1.36, ZN - .022, PI, '搬家', { size: .058, gap: .010, color: C('#9c4034'), gloss: .05 });

  // --- what the landing stores. Bicycle west, waste paper outside 703, shoes and a bundle of
  // exercise books outside the teacher's door, a mop in the corner.
  (function bicycle() {
    const bx = -2.40, bz = ZC + .34, lean = .07;
    for (const dx of [-.52, .52]) {
      cyl(bx + dx, FL + .34, bz + .02, .335, .055, col.rubber,
          { rx: PI / 2, rz: lean, gloss: .18, tag: '自行车' });
      cyl(bx + dx, FL + .34, bz + .02, .285, .060, C('#5a6064'), { rx: PI / 2, rz: lean, gloss: .30 });
      cyl(bx + dx, FL + .34, bz + .02, .045, .075, col.steel, { rx: PI / 2, rz: lean, gloss: .5 });
      for (let i = 0; i < 6; i++)
        box(bx + dx, FL + .34, bz + .02, .012, .56, .012, col.steel,
            { hard: true, rz: i * PI / 6 + lean, gloss: .45 });
    }
    const tube = (x1b, y1, x2b, y2, c = C('#2f4a3d')) => {
      const dx = x2b - x1b, dy = y2 - y1, L = Math.hypot(dx, dy);
      cyl((x1b + x2b) / 2, (y1 + y2) / 2, bz + .02, .020, L, c,
          { rz: Math.atan2(dx, dy), gloss: .42, tag: '自行车' });
    };
    tube(bx - .52, FL + .34, bx - .06, FL + .93);
    tube(bx - .06, FL + .93, bx + .30, FL + .93);
    tube(bx - .06, FL + .93, bx + .06, FL + .30);
    tube(bx + .06, FL + .30, bx + .52, FL + .34);
    tube(bx + .30, FL + .93, bx + .06, FL + .30);
    tube(bx + .30, FL + .93, bx + .52, FL + .34);
    tube(bx - .52, FL + .34, bx - .40, FL + .98, col.steelD);
    cap(bx + .32, FL + 1.01, bz + .02, .22, .07, .11, C('#22262a'), { gloss: .16 });
    cyl(bx - .40, FL + 1.02, bz + .02, .016, .40, col.steelD, { rx: PI / 2, gloss: .45 });
    box(bx - .42, FL + .84, bz + .02, .26, .24, .22, C('#5d6367'), { gloss: .3 });
    cyl(bx + .06, FL + .30, bz + .055, .095, .020, col.steelX, { rx: PI / 2, gloss: .5 });
    shade(bx, bz, 1.30, .42, .32, FL + .010);
  })();
  stop(-3.00, -1.80, ZC, ZC + .48);

  // waste paper tied in bundles outside 703 — a whole landing's worth of old newspaper
  (function paperBundles() {
    const jx = N3 + .70;
    for (const [i, w, d, h2] of [[0, .40, .30, .17], [1, .38, .28, .15], [2, .34, .26, .12]]) {
      const yb = FL + [0, .17, .32][i];
      box(jx - i * .02, yb + h2 / 2, ZN - .22, w, h2, d, C('#cdc6b0'),
          { hard: true, gloss: .06, ry: i * .06, tag: '报纸' });
      for (const s of [-1, 1])
        box(jx - i * .02 + s * .10, yb + h2 / 2, ZN - .22, .012, h2 + .01, d + .01, C('#b8a37c'),
            { hard: true, gloss: .12, ry: i * .06 });
    }
    G(jx, FL + .10, ZN - .375, PI, '旧报纸', { size: .046, gap: .009, color: C('#8a7a58') });
    shade(jx, ZN - .22, .50, .38, .30, FL + .010);
  })();
  stop(N3 + .44, N3 + .96, ZN - .40, ZN);

  // outside the teacher's door: cloth shoes, slippers, an umbrella, and a cloth bag of exercise
  // books he has carried home and not yet carried in
  (function teacherDoorstep() {
    for (const s of [-1, 1])
      cap(FX - .78 + s * .07, FL + .045, ZC + .26, .092, .072, .250, C('#2f3238'),
          { ry: s * .05, gloss: .14, tag: '鞋' });
    for (const s of [-1, 1])
      cap(FX - .78 + s * .06, FL + .034, ZC + .50, .074, .054, .190, C('#7d6f5c'),
          { ry: s * .09, gloss: .12, tag: '鞋' });
    shade(FX - .78, ZC + .36, .46, .48, .24, FL + .008);
    // the bag: a stout cloth carrier standing against the skirting, its top gaping
    const gx = FX + .74;
    box(gx, FL + .21, ZC + .21, .34, .42, .18, C('#3f5a54'), { gloss: .10, tag: '作业本' });
    box(gx, FL + .40, ZC + .21, .30, .04, .15, C('#e8e2d2'), { hard: true, gloss: .06, tag: '作业本' });
    for (let i = 0; i < 5; i++)
      box(gx - .09 + i * .045, FL + .45 + (i % 2) * .01, ZC + .21, .04, .13, .16,
          i % 2 ? C('#e4dcc6') : C('#dfe3ea'), { hard: true, gloss: .05, rz: .04 * (i - 2),
                                                 tag: '作业本' });
    for (const s of [-1, 1])
      cyl(gx + s * .13, FL + .52, ZC + .21, .010, .24, C('#3f5a54'), { rz: s * .16, gloss: .12 });
    shade(gx, ZC + .21, .42, .28, .28, FL + .010);
    // umbrella hooked on the meter box below
    cyl(MX - .34, FL + .40, ZC + .12, .026, .78, C('#39515f'), { rz: .12, gloss: .22 });
    cyl(MX - .34, FL + .80, ZC + .12, .014, .10, C('#8c6b3e'), { rz: .12, gloss: .3 });
  })();
  stop(FX + .52, FX + .96, ZC, ZC + .34);

  // mop and bucket in the south-west corner
  cyl(X0 + .34, FL + .69, ZC + .30, .014, 1.34, C('#9a7c4e'), { rz: .10, gloss: .18 });
  cap(X0 + .21, FL + .10, ZC + .30, .10, .16, .22, C('#d8d3c2'), { gloss: .06 });
  cyl(X0 + .64, FL + .13, ZC + .28, .135, .26, C('#3f6f96'), { gloss: .28 });
  cyl(X0 + .64, FL + .255, ZC + .28, .118, .012, C('#8d9aa0'), { gloss: .30 });
  shade(X0 + .50, ZC + .29, .60, .38, .30, FL + .010);
  // a pair of plants outside 701, because somebody on every landing gardens in the hall
  for (const [px, hgt] of [[N1 - .70, .34], [N1 + .68, .26]]) {
    taper(px, FL + hgt * .30, ZN - .22, .24, hgt * .60, .24, C('#8e5a3e'), { gloss: .22, tag: '花盆' });
    for (let i = 0; i < 7; i++)
      cap(px + (rnd() - .5) * .16, FL + hgt * .62 + .12, ZN - .22 + (rnd() - .5) * .14,
          .022, .30, .022, i % 3 ? col.leaf : col.leafD, { rz: (rnd() - .5) * .5, gloss: .12 });
    shade(px, ZN - .22, .34, .34, .28, FL + .010);
  }

  // ===================================================================================== 玄关
  //
  // Shoes come off here. A shoe cabinet by the door is not decoration, it is the rule.
  (function entry() {
    const cx = 2.10, cz = 2.80;
    // 鞋柜 against the north wall, west of the door
    box(cx, FL + .46, cz, 1.60, .92, .34, col.wood, { gloss: .24, tag: '鞋柜', ...MT.timber });
    box(cx, FL + .935, cz, 1.68, .05, .40, col.woodL, { hard: true, gloss: .30, tag: '鞋柜' });
    for (const s of [-1, 1]) {
      box(cx + s * .40, FL + .46, cz - .175, .74, .84, .022, col.woodL,
          { hard: true, gloss: .26, tag: '鞋柜' });
      cyl(cx + s * .40 - s * .28, FL + .46, cz - .195, .012, .16, col.brassD, { gloss: .55 });
    }
    shade(cx, cz, 1.74, .48, .34, FL + .010);
    stop(cx - .82, cx + .82, cz - .18, cz + .18);
    // what stands on top of it: a key dish, a bowl of loose change, a torch, a pot of pens
    cyl(cx - .58, FL + .985, cz, .085, .035, col.jade, { gloss: .55, tag: '钥匙' });
    for (let i = 0; i < 3; i++)
      box(cx - .58 + (i - 1) * .028, FL + 1.00, cz + (i - 1) * .02, .012, .008, .055, col.brass,
          { hard: true, gloss: .62, ry: i * .5, tag: '钥匙' });
    cyl(cx - .20, FL + 1.02, cz, .055, .12, C('#3f4a52'), { gloss: .30 });
    for (let i = 0; i < 5; i++)
      cyl(cx - .20 + (i - 2) * .016, FL + 1.13, cz + (rnd() - .5) * .03, .005, .15,
          [col.red, col.ink, col.navy, col.red, C('#2b6b4a')][i], { rz: (rnd() - .5) * .22, gloss: .4 });
    // slippers lined up, which is what you change into
    for (const [sx, c2] of [[cx + .34, C('#8d6a58')], [cx + .60, C('#5f6b7d')]])
      for (const s of [-1, 1])
        cap(sx + s * .065, FL + .034, cz - .34, .072, .050, .185, c2,
            { ry: s * .06, gloss: .12, tag: '拖鞋' });
    shade(cx + .47, cz - .34, .52, .26, .22, FL + .008);
    // mirror and coat hooks on the east return of the 玄关
    box(5.94, Y + 1.58, 2.30, .05, .82, .56, col.woodD, { hard: true, gloss: .28, tag: '镜子' });
    box(5.90, Y + 1.58, 2.30, .012, .72, .46, C('#c8d6da'),
        { hard: true, gloss: .88, mode: 1, glow: .02, tag: '镜子' });
    box(5.94, Y + 1.72, 1.42, .06, .16, .74, col.wood, { hard: true, gloss: .26, ...MT.timber });
    for (let i = 0; i < 4; i++) {
      cyl(5.88, Y + 1.70, 1.15 + i * .18, .010, .09, col.brassD, { rx: 0, rz: PI / 2, gloss: .55 });
      ball(5.83, Y + 1.70, 1.15 + i * .18, .017, .017, .017, col.brass, { gloss: .60 });
    }
    // a canvas satchel and a cotton jacket on the hooks
    box(5.78, Y + 1.36, 1.33, .12, .40, .30, C('#4a5a4a'), { gloss: .10, tag: '书包' });
    box(5.76, Y + 1.16, 1.33, .09, .06, .26, C('#3c4a3c'), { gloss: .12, tag: '书包' });
    box(5.79, Y + 1.30, 1.69, .13, .58, .34, C('#57616e'), { gloss: .08 });
    box(5.79, Y + 1.55, 1.69, .11, .10, .30, C('#48525e'), { gloss: .08 });
    // doormat inside the threshold
    flat(FX, FL + .008, ZC - .40, .78, .48, C('#5c5346'), { mode: 7, gloss: .04 });
    shade(FX, ZC - .40, .86, .56, .20, FL + .012);
    // 挂历 on the wall between the door and the mirror
    box(5.30, Y + 1.70, ZC - .022, .40, .58, .012, col.paper, { hard: true, gloss: .06, tag: '日历' });
    box(5.30, Y + 1.90, ZC - .036, .40, .18, .006, C('#8d3a30'), { hard: true, gloss: .08 });
    G(5.30, Y + 1.90, ZC - .046, PI, '二〇二五', { size: .046, gap: .009, color: col.gold });
    for (let r2 = 0; r2 < 5; r2++)
      for (let c2 = 0; c2 < 7; c2++)
        box(5.30 - .155 + c2 * .052, Y + 1.76 - r2 * .046, ZC - .034, .034, .028, .004,
            (r2 * 7 + c2) === 17 ? col.redL : C('#d8d0bc'), { hard: true, gloss: .04 });
  })();

  // ===================================================================================== 客厅
  //
  // Restrained and older: a cane-backed settee, a low tea table with the tray done properly,
  // a sideboard, a wall of framed photographs, and a clock that is two minutes fast.
  (function living() {
    // --- 沙发, against the east wall
    const sx = 5.50, sz = -0.60;
    box(sx, FL + .21, sz, .90, .42, 1.90, C('#7c5236'), { gloss: .20, tag: '沙发', ...MT.timber });
    box(sx, FL + .45, sz, .84, .12, 1.80, C('#8a9484'), { gloss: .06, mode: 7, tag: '沙发' });
    box(sx + .30, FL + .70, sz, .16, .74, 1.86, C('#7c5236'), { gloss: .20, tag: '沙发' });
    box(sx + .20, FL + .68, sz, .08, .52, 1.74, C('#8a9484'), { gloss: .06, mode: 7, tag: '沙发' });
    for (const s of [-1, 1])
      box(sx - .04, FL + .56, sz + s * .92, .82, .34, .12, C('#7c5236'), { gloss: .20, tag: '沙发' });
    for (const [cz2, c2] of [[-.52, C('#9c6a52')], [.46, C('#5f7060')]])
      box(sx - .06, FL + .59, sz + cz2, .30, .30, .32, c2, { gloss: .05, mode: 7, rz: .1 });
    // an antimacassar of white lace, which every settee of this vintage wears
    // draped over the top rail, not sunk into it
    box(sx + .30, FL + 1.078, sz + .52, .20, .014, .34, col.white, { hard: true, gloss: .05 });
    box(sx + .30, FL + 1.078, sz - .58, .20, .014, .34, col.white, { hard: true, gloss: .05 });
    shade(sx, sz, 1.05, 2.05, .34, FL + .012);
    stop(sx - .47, sx + .48, sz - .98, sz + .98);

    // --- 茶几 and the tea things. A 茶盘 is a tray you pour *onto*: slotted top, a well under
    // it, and a little tap at the end that drains into a bucket.
    const tx = 4.10, tz = -0.55;
    box(tx, FL + .36, tz, .74, .05, 1.20, col.walnut, { hard: true, gloss: .28, tag: '茶几', ...MT.timber });
    box(tx, FL + .17, tz, .62, .30, 1.06, C('#4e3421'), { gloss: .22, tag: '茶几' });
    for (const [ox, oz] of [[-.30, -.50], [.30, -.50], [-.30, .50], [.30, .50]])
      box(tx + ox, FL + .17, tz + oz, .06, .34, .06, col.walnut, { hard: true, gloss: .26 });
    shade(tx, tz, .86, 1.32, .34, FL + .012);
    stop(tx - .32, tx + .32, tz - .55, tz + .55);
    // the tray
    const px2 = tx, pz2 = tz + .20;
    box(px2, FL + .425, pz2, .40, .085, .62, C('#4a3324'), { hard: true, gloss: .34, tag: '茶盘' });
    box(px2, FL + .468, pz2, .34, .010, .56, C('#5a4030'), { hard: true, gloss: .40, tag: '茶盘' });
    for (let i = 0; i < 9; i++)
      box(px2, FL + .474, pz2 - .25 + i * .0625, .34, .004, .012, C('#33241a'), { hard: true });
    cyl(px2 + .21, FL + .445, pz2 - .26, .012, .05, col.brassD, { rz: PI / 2, gloss: .55 });
    // 紫砂壶 — a squat clay pot with a loop handle and a spout
    ball(px2 - .02, FL + .535, pz2 + .12, .072, .052, .072, col.clay, { gloss: .30, tag: '茶壶' });
    cyl(px2 - .02, FL + .578, pz2 + .12, .028, .022, col.clay, { gloss: .30, tag: '茶壶' });
    ball(px2 - .02, FL + .594, pz2 + .12, .020, .012, .020, C('#8a4c37'), { gloss: .34, tag: '茶壶' });
    cyl(px2 + .05, FL + .545, pz2 + .16, .012, .085, col.clay, { rz: .9, rx: .5, gloss: .30 });
    for (const a2 of [0, 1])
      cyl(px2 - .085, FL + .535 + a2 * .035, pz2 + .10, .009, .050, col.clay,
          { rz: PI / 2 - a2 * .8, gloss: .30 });
    // four little cups, one of them turned over
    for (let i = 0; i < 4; i++) {
      const a2 = i * PI / 2 + .5;
      cyl(px2 + Math.cos(a2) * .11, FL + .494, pz2 - .16 + Math.sin(a2) * .10, .022, .034,
          col.bone, { gloss: .48, tag: '茶杯' });
      cyl(px2 + Math.cos(a2) * .11, FL + .509, pz2 - .16 + Math.sin(a2) * .10, .018, .008,
          i === 2 ? col.bone : C('#8a6a3c'), { gloss: .5 });
    }
    // a thermos beside the table, and today's newspaper folded on it
    cyl(tx - .46, FL + .17, tz - .52, .085, .34, C('#9d3d33'), { gloss: .32, tag: '热水瓶' });
    cyl(tx - .46, FL + .35, tz - .52, .050, .05, col.steelD, { gloss: .45, tag: '热水瓶' });
    cyl(tx - .46, FL + .385, tz - .52, .030, .03, C('#c8b98c'), { gloss: .20, tag: '热水瓶' });
    box(tx - .46, FL + .225, tz - .52, .09, .11, .10, col.bone, { hard: true, gloss: .10 });
    G(tx - .46, FL + .225, tz - .565, PI, '双喜', { size: .034, gap: .006, color: col.redD });
    shade(tx - .46, tz - .52, .24, .24, .30, FL + .012);
    box(tx, FL + .398, tz - .34, .30, .014, .40, col.paperD, { hard: true, gloss: .04, ry: .10,
        tag: '报纸' });
    G(tx, FL + .408, tz - .46, 0, '日报', { size: .038, gap: .008, color: col.ink, ry: .10 });

    // --- 电视柜 and an old set, on the west side of the 客厅 against the partition
    // North of the 卧室 doorway, not across it. Centred on the partition it sat squarely in
    // front of the opening at z -1.65 .. -0.65 and sealed the bedroom off — measured, not
    // guessed: `clampMove` reaches 0.30 m past the cabinet's own edge in every direction.
    const vx = 1.34, vz = 0.55;
    box(vx, FL + .27, vz, .44, .54, 1.50, col.walnut, { gloss: .24, tag: '电视柜', ...MT.timber });
    box(vx, FL + .545, vz, .50, .04, 1.58, col.woodL, { hard: true, gloss: .30, tag: '电视柜' });
    for (const s of [-1, 1])
      box(vx - .21, FL + .27, vz + s * .36, .022, .44, .66, col.wood, { hard: true, gloss: .26 });
    shade(vx, vz, .56, 1.62, .32, FL + .012);
    stop(vx - .22, vx + .22, vz - .76, vz + .76);
    box(vx + .06, FL + .78, vz, .34, .44, .54, C('#37393c'), { gloss: .22, tag: '电视' });
    box(vx - .13, FL + .80, vz, .020, .34, .46, C('#12161a'),
        { hard: true, gloss: .55, mode: 1, glow: .012, tag: '电视' });
    for (const s of [-1, 1])
      cyl(vx + .18, FL + 1.02 + s * .0, vz + s * .10, .006, .34, col.steel, { rz: s * .35, gloss: .5 });
    // a doily, a photo frame and a potted 文竹 on the sideboard top
    box(vx, FL + .568, vz + .52, .30, .010, .30, col.white, { hard: true, gloss: .05, ry: .3 });
    box(vx + .02, FL + .69, vz + .52, .026, .22, .17, col.brassD, { hard: true, gloss: .45, tag: '照片' });
    box(vx + .006, FL + .69, vz + .52, .008, .17, .13, C('#cfc9b8'), { hard: true, gloss: .12, tag: '照片' });
    cyl(vx, FL + .62, vz - .54, .072, .10, C('#7d8f7a'), { gloss: .30, tag: '花盆' });
    for (let i = 0; i < 9; i++)
      cap(vx + (rnd() - .5) * .16, FL + .74 + rnd() * .10, vz - .54 + (rnd() - .5) * .16,
          .014, .20, .014, i % 2 ? col.leaf : col.leafD, { rz: (rnd() - .5) * .8, gloss: .14 });

    // --- the window on the east wall, and the light it lays on the floor
    windowBay('x', X1, -1, -2.00, 1.50, .95, 2.16, { tag: '窗户' });
    // a cane chair in the light, with a book left face-down on it
    const kx = 4.90, kz = -2.10;
    for (const [ox, oz] of [[-.20, -.20], [.20, -.20], [-.20, .20], [.20, .20]])
      cyl(kx + ox, FL + .21, kz + oz, .017, .42, C('#a8843f'), { gloss: .22 });
    box(kx, FL + .43, kz, .48, .04, .46, C('#c0a066'), { hard: true, gloss: .18, tag: '椅子' });
    box(kx - .21, FL + .70, kz, .04, .52, .44, C('#c0a066'), { hard: true, gloss: .18, tag: '椅子' });
    for (let i = 0; i < 5; i++)
      cyl(kx - .21, FL + .70, kz - .16 + i * .08, .006, .50, C('#a8843f'), { gloss: .2 });
    box(kx + .04, FL + .46, kz + .02, .16, .03, .22, C('#d8d0bc'), { hard: true, gloss: .06, ry: .4,
        tag: '书' });
    shade(kx, kz, .58, .56, .28, FL + .012);

    // --- the photo wall, on the partition west of the 客厅. Twenty-odd years of leaving classes.
    // The partition's 客厅 face is the quad at PX + .05, so the frames hang off PX + .08.
    const wx = PX + .08, wy = 1.62;
    box(wx, Y + 2.16, -0.30, .04, .22, 1.30, C('#3a2a1c'), { hard: true, gloss: .30, tag: '照片' });
    G(wx + .022, Y + 2.16, -0.30, PI / 2, '桃李满天下',
      { size: .118, gap: .026, color: col.gold, gloss: .18 });
    const YEARS = ['二〇〇九届', '二〇一四届', '二〇一八届', '二〇二二届', '二〇二五届'];
    YEARS.forEach((yr, i) => {
      const zc2 = -1.10 + i * .46, w2 = .40, h2 = .30;
      box(wx, Y + wy + (i % 2) * .34, zc2, .034, h2 + .06, w2 + .06, col.woodD,
          { hard: true, gloss: .30, tag: '照片' });
      box(wx + .020, Y + wy + (i % 2) * .34, zc2, .006, h2, w2, C('#b9bfae'),
          { hard: true, gloss: .16, tag: '照片' });
      // rows of small pale blocks: a class of forty, seen from across a room
      for (let r2 = 0; r2 < 3; r2++)
        for (let c2 = 0; c2 < 9; c2++)
          box(wx + .026, Y + wy + (i % 2) * .34 - .09 + r2 * .075,
              zc2 - .16 + c2 * .040, .004, .046, .026,
              (r2 + c2) % 3 ? C('#4e5563') : C('#7a5c48'), { hard: true, gloss: .10 });
      G(wx + .026, Y + wy + (i % 2) * .34 - .125, zc2, PI / 2, yr,
        { size: .028, gap: .005, color: C('#5c5344') });
    });
    // 锦旗 — a pennant from a leaving class, gold on red with a fringe
    box(wx, Y + 1.42, .92, .030, .60, .44, col.red, { hard: true, gloss: .10, tag: '锦旗' });
    G(wx + .020, Y + 1.52, .92, PI / 2, '师恩难忘',
      { size: .098, gap: .020, color: col.gold, gloss: .16 });
    G(wx + .020, Y + 1.26, .92, PI / 2, '毕业班全体学生敬赠',
      { size: .034, gap: .006, color: C('#e8c98a') });
    for (let i = 0; i < 11; i++)
      box(wx + .012, Y + 1.10, .70 + i * .044, .012, .06, .014, col.gold, { hard: true, gloss: .30 });
    // the clock, two minutes fast
    cyl(wx + .02, Y + 2.02, .95, .13, .04, col.woodD, { rz: PI / 2, gloss: .28, tag: '钟' });
    cyl(wx + .045, Y + 2.02, .95, .115, .008, col.bone, { rz: PI / 2, gloss: .30, tag: '钟' });
    for (let i = 0; i < 12; i++)
      box(wx + .052, Y + 2.02 + Math.cos(i * PI / 6) * .092, .95 + Math.sin(i * PI / 6) * .092,
          .004, .016, .010, col.ink, { hard: true, rx: -i * PI / 6 });
    box(wx + .056, Y + 2.05, .965, .004, .062, .009, col.ink, { hard: true, rx: -0.7 });
    box(wx + .058, Y + 2.03, .90, .004, .012, .080, col.ink, { hard: true, rx: -1.9 });

    // --- 条案 and the framed calligraphy over it, on the kitchen partition.
    //
    // That wall is five metres of unbroken cream seen dead-on from the whole of the 客厅, and a
    // room this restrained cannot also be empty — the render of it was a blank sheet with a
    // doorway in it. The console keeps clear of the doorway at x 3.35 .. 4.35 in both directions
    // once `clampMove` has taken its 0.30 m off each edge.
    const nx2 = 2.30, nz2 = PZK + .20;
    box(nx2, FL + .755, nz2, 1.44, .05, .32, col.walnut,
        { hard: true, gloss: .30, tag: '柜子', ...MT.timber });
    for (const ox of [-.64, .64])
      box(nx2 + ox, FL + .38, nz2, .07, .75, .28, col.walnut,
          { hard: true, gloss: .28, tag: '柜子' });
    box(nx2, FL + .46, nz2 - .01, 1.26, .04, .24, col.walnut, { hard: true, gloss: .26 });
    shade(nx2, nz2, 1.56, .44, .32, FL + .012);
    stop(nx2 - .74, nx2 + .74, nz2 - .17, nz2 + .17);
    // 厚德载物 — a horizontal panel in the teacher's own hand, with his seal at the end
    box(nx2, Y + 1.66, PZK + .09, 1.16, .42, .04, col.woodD, { hard: true, gloss: .30 });
    box(nx2, Y + 1.66, PZK + .115, 1.04, .33, .008, C('#e9e1c8'), { hard: true, gloss: .08 });
    G(nx2 - .04, Y + 1.68, PZK + .126, 0, '厚德载物',
      { size: .150, gap: .046, color: col.ink, gloss: .10 });
    box(nx2 + .42, Y + 1.55, PZK + .126, .05, .05, .004, C('#9c2f26'), { hard: true, gloss: .10 });
    // what stands on it: a framed photograph, a 君子兰, and the tin the tea lives in
    box(nx2 - .48, FL + .90, nz2, .026, .25, .20, col.brassD, { hard: true, gloss: .42,
        tag: '照片' });
    box(nx2 - .48, FL + .90, nz2 + .012, .008, .20, .16, C('#c6c0ac'), { hard: true, gloss: .14,
        tag: '照片' });
    taper(nx2 + .50, FL + .86, nz2, .21, .17, .21, C('#8e5a3e'), { gloss: .22, tag: '花盆' });
    for (let i = 0; i < 8; i++)
      cap(nx2 + .50 + (i - 3.5) * .036, FL + 1.10, nz2 + (rnd() - .5) * .10,
          .036, .34, .011, i % 2 ? col.leaf : col.leafD, { rz: (i - 3.5) * .09, gloss: .16 });
    cyl(nx2 + .06, FL + .84, nz2 - .02, .052, .12, C('#3d5a4a'), { gloss: .35, tag: '茶叶' });
    cyl(nx2 + .06, FL + .906, nz2 - .02, .050, .014, C('#c8a84a'), { gloss: .5 });

    light(4.30, Y + 2.18, -0.60, C('#ffe6bd'), .50, 3.60);
    light(3.20, Y + 1.90, 2.10, C('#ffe9c8'), .30, 2.60);
  })();

  // ===================================================================================== 书房
  //
  // The heart of the floor. Seven metres of wall given over to books, a desk under the west
  // window, a blackboard on the wall the bedroom shares, and a table kept for calligraphy.
  (function study() {
    const SX0 = X0, SX1 = PX, SZ0 = PZS, SZ1 = ZC;

    // ---------------------------------------------------------------- the book wall
    //
    // Along the whole of the z = 3.20 wall. Six bays of open shelving, floor to ceiling, in a
    // dark walnut that has been re-oiled twice. What makes a book wall read is variation in four
    // things at once — spine height, depth into the shelf, width and colour — plus the handful of
    // books lying flat on top of a run because there was no room to stand them up.
    const BK0 = -5.86, BK1 = -0.20, BKZ = SZ1 - .015;  // the carcass back, just off the wall
    const BD = .30;                                    // shelf depth
    const FZ = BKZ - BD;                               // the front face of the shelving
    const SHY = [.30, .66, 1.02, 1.38, 1.74, 2.10];    // shelf top surfaces, off the floor
    const BAYS = 6, BW = (BK1 - BK0) / BAYS;
    // plinth, uprights, shelves, top rail
    box((BK0 + BK1) / 2, FL + .075, BKZ - BD / 2, BK1 - BK0 + .06, .15, BD, C('#3d2818'),
        { hard: true, gloss: .22, tag: '书架', ...MT.timber });
    for (let i = 0; i <= BAYS; i++)
      box(BK0 + i * BW, FL + 1.24, BKZ - BD / 2, .045, 2.34, BD, col.walnut,
          { hard: true, gloss: .26, tag: '书架', ...MT.timber });
    for (const sy of SHY)
      box((BK0 + BK1) / 2, FL + sy - .014, BKZ - BD / 2, BK1 - BK0, .028, BD, col.walnut,
          { hard: true, gloss: .26, tag: '书架', ...MT.timber });
    box((BK0 + BK1) / 2, FL + 2.42, BKZ - BD / 2 - .01, BK1 - BK0 + .06, .10, BD - .02, col.walnut,
        { hard: true, gloss: .26, tag: '书架' });
    // a strip of grain along the front edge of each shelf, so the shelf has a lip at two metres
    for (const sy of SHY)
      box((BK0 + BK1) / 2, FL + sy - .014, FZ + .012, BK1 - BK0, .030, .020, col.oak,
          { hard: true, gloss: .32 });
    // the back boards, one per bay, so the wall behind never shows between the books
    for (let i = 0; i < BAYS; i++)
      box(BK0 + (i + .5) * BW, FL + 1.24, BKZ - .010, BW - .05, 2.34, .016, C('#33231a'),
          { hard: true, gloss: .12 });
    shade((BK0 + BK1) / 2, BKZ - BD / 2, BK1 - BK0 + .2, BD + .16, .34, FL + .012);

    // The spines. Cloth and board in the colours a shelf of this age actually holds.
    const BOOKC = ['#7a3b2e', '#2f4a63', '#46603c', '#8a6a2e', '#5a4258', '#3d4247', '#9c5a3c',
                   '#6d7a86', '#b0a48a', '#2d5a52', '#7f2f33', '#43526b', '#8d7a4e', '#5c6b3f',
                   '#a8763f', '#37414d', '#c2b393', '#6a4630'];
    // Real titles, on the wider spines only — a 30 mm spine cannot hold a legible character.
    const TITLES = ['论语', '孟子', '史记', '诗经', '楚辞', '唐诗三百首', '宋词选', '古文观止',
                    '红楼梦', '西游记', '水浒传', '三国演义', '汉语词典', '成语词典', '语法讲义',
                    '教育心理学', '作文选', '朱子家训', '声律启蒙', '千字文', '教学参考', '语文课本'];
    let titleAt = 0;
    let spines = 0;
    function bookRun(x0, x1, sy, opt = {}) {
      let x = x0;
      const maxH = opt.maxH || .30;
      while (x < x1 - .022) {
        // Roughly one book in seven is a fat one. That is what a shelf looks like, and it is
        // also the only spine wide enough to carry a legible title at reading distance.
        const fat = rnd() < .15;
        const w = fat ? .046 + rnd() * .018 : .019 + rnd() * .030;
        if (x + w > x1) break;
        const h = maxH * (.72 + rnd() * .28);
        const d = .155 + rnd() * .085;
        const c = C(pick(BOOKC));
        // a book leans only where the run ends, or it leans into its neighbour
        const last = x + w > x1 - .12;
        const lean = last && rnd() < .55 ? (.10 + rnd() * .16) : 0;
        const zf = FZ + .020 + rnd() * .045;             // how far it is pushed back
        box(x + w / 2 + (lean ? h * .10 : 0), FL + sy + h / 2, zf + d / 2, w, h, d, c,
            { hard: true, gloss: .10 + rnd() * .14, rz: lean, tag: '书' });
        // gilt bands, which is most of what tells you a shelf is books and not a fence
        if (!lean && rnd() < .34)
          for (const t of [h * .32, h * .38])
            box(x + w / 2, FL + sy + t, zf - .002, w - .006, .006, .004,
                rnd() < .5 ? col.gold : col.bone, { hard: true, gloss: .35 });
        // Titles wrap round the list rather than running out. Counting up and stopping at
        // TITLES.length put every one of them in the first bay, at the far west end of a
        // six-metre wall — six bays of anonymous spines and one bay you could read.
        if (!lean && fat && h > .21 && rnd() < .62) {
          const t = TITLES[titleAt++ % TITLES.length];
          G(x + w / 2, FL + sy + h * .60, zf - .004, PI, t,
            { size: Math.min(.036, w - .012), gap: .005, color: rnd() < .5 ? col.gold : col.bone,
              vertical: true, gloss: .14 });
        }
        x += w + (lean ? .012 : .002) + (rnd() < .07 ? .02 + rnd() * .05 : 0);
        spines++;
      }
      return x;
    }
    // A flat stack, for the corner of a shelf where nothing would stand up.
    function bookStack(x, sy, n, w = .17) {
      let y = sy;
      for (let i = 0; i < n; i++) {
        const h = .022 + rnd() * .018, d = .19 + rnd() * .05;
        box(x + (rnd() - .5) * .02, FL + y + h / 2, FZ + .05 + d / 2, w + (rnd() - .5) * .03, h, d,
            C(pick(BOOKC)), { hard: true, gloss: .12, ry: (rnd() - .5) * .10, tag: '书' });
        y += h + .003;
      }
      return y;
    }
    for (let b = 0; b < BAYS; b++) {
      const a = BK0 + b * BW + .035, z2 = BK0 + (b + 1) * BW - .035;
      SHY.forEach((sy, r2) => {
        const cell = (r2 === 5 ? .24 : .30);
        // one cell in six is not books
        const roll = rnd();
        if (roll < .12) {                              // a flat stack and a gap
          bookStack(a + .16, sy, 4 + ((rnd() * 4) | 0));
          bookRun(a + .42, z2, sy, { maxH: cell });
        } else if (roll < .18) {                       // half a run, then an ornament
          bookRun(a, a + (z2 - a) * .55, sy, { maxH: cell });
        } else {
          bookRun(a, z2, sy, { maxH: cell });
        }
      });
    }
    // the ornaments the shelves have picked up: a blue-and-white jar, a stone brush pot,
    // a folded fan, and a small framed photograph of a class
    cyl(-4.10, FL + 2.10 + .11, FZ + .14, .075, .22, col.bone, { gloss: .42, tag: '摆件' });
    for (let i = 0; i < 3; i++)
      box(-4.10, FL + 2.16 + i * .06, FZ + .075, .10, .012, .008, C('#3b5b8a'), { hard: true });
    cyl(-1.36, FL + 1.74 + .09, FZ + .13, .058, .18, C('#5d6a58'), { gloss: .30, tag: '笔筒' });
    for (let i = 0; i < 5; i++)
      cyl(-1.36 + (i - 2) * .016, FL + 1.74 + .22, FZ + .13 + (rnd() - .5) * .04, .006, .24,
          i % 2 ? C('#3a2a1c') : C('#6b4a30'), { rz: (i - 2) * .07, gloss: .30 });
    box(-0.52, FL + 1.02 + .10, FZ + .12, .21, .17, .026, col.brassD,
        { hard: true, gloss: .40, ry: -.25, tag: '照片' });
    box(-0.52, FL + 1.02 + .10, FZ + .105, .17, .13, .008, C('#c2bca8'),
        { hard: true, gloss: .14, ry: -.25, tag: '照片' });
    stop(BK0 - .06, BK1 + .06, FZ - .02, SZ1);

    // ---------------------------------------------------------------- the west window and desk
    windowBay('x', X0, 1, 1.80, 1.60, .80, 2.18, { tag: '窗户' });
    // a bamboo blind, half rolled
    box(X0 + .21, Y + 2.02, 1.80, .05, .34, 1.62, C('#b79a63'), { hard: true, gloss: .16 });
    for (let i = 0; i < 7; i++)
      cyl(X0 + .21, Y + 2.19 - i * .046, 1.80, .020, 1.62, C('#c0a670'),
          { rx: PI / 2, ry: 0, rz: 0, gloss: .18 });

    // 书桌 — 1.50 long, its short side to the wall, so the light falls across the page.
    const dx = -5.30, dz = 1.80, DT = FL + .755;
    box(dx, DT, dz, .74, .045, 1.52, col.walnut, { hard: true, gloss: .34, tag: '书桌', ...MT.timber });
    box(dx, DT - .045, dz, .70, .05, 1.46, C('#4a3120'), { hard: true, gloss: .22, tag: '书桌' });
    // a drawer bank at the north end, and two legs at the south
    box(dx + .02, FL + .40, dz - .48, .60, .66, .50, col.walnut, { gloss: .26, tag: '书桌' });
    for (let i = 0; i < 2; i++) {
      box(dx - .29, FL + .58 - i * .24, dz - .48, .022, .18, .44, col.oak,
          { hard: true, gloss: .30, tag: '书桌' });
      cyl(dx - .31, FL + .58 - i * .24, dz - .48, .012, .10, col.brassD, { rz: PI / 2, gloss: .55 });
    }
    for (const oz of [.66, .18])
      for (const ox of [-.31, .31])
        box(dx + ox, FL + .36, dz + oz, .055, .72, .055, col.walnut, { hard: true, gloss: .28 });
    box(dx, FL + .10, dz + .42, .62, .05, .55, col.walnut, { hard: true, gloss: .24 });
    shade(dx, dz, .88, 1.66, .36, FL + .012);
    stop(dx - .38, dx + .38, dz - .78, dz + .78);

    // --- 绿罩台灯, the green banker's lamp. Brass column, cast base, a shade of green glass
    // that is lit from inside, which is the one warm thing in the room after dark.
    const lx = dx - .16, lz = dz + .56;
    cyl(lx, DT + .035, lz, .085, .045, col.brassD, { gloss: .58 });
    cyl(lx, DT + .17, lz, .014, .28, col.brass, { gloss: .60 });
    box(lx, DT + .295, lz, .16, .10, .34, col.lamp,
        { hard: true, gloss: .55, mode: 1, glow: .05, tag: '台灯' });
    box(lx, DT + .245, lz, .15, .012, .33, C('#c8e8cf'),
        { hard: true, mode: 1, glow: .10, tag: '台灯' });
    box(lx, DT + .345, lz, .15, .012, .33, C('#0f4a32'), { hard: true, gloss: .40 });
    cyl(lx, DT + .30, lz - .175, .050, .012, col.lamp, { rx: PI / 2, gloss: .5 });
    cyl(lx, DT + .30, lz + .175, .050, .012, col.lamp, { rx: PI / 2, gloss: .5 });
    light(lx + .10, DT + .18, lz, C('#ffe0a8'), .40, 1.60);
    glow(M.trs(dx, DT + .026, dz + .35, 0, .70, 1, .90), C('#ffe7b4'), .075);

    // --- the marking. A stack of 作业本 waiting, a shorter stack done, the red pen across the
    // top one, and the ring a mug left on the desk two winters ago.
    let sy2 = DT + .022;
    for (let i = 0; i < 9; i++) {
      const h2 = .009;
      box(dx + .10 + (rnd() - .5) * .018, sy2 + h2 / 2, dz - .02 + (rnd() - .5) * .02,
          .21, h2, .27, i % 2 ? C('#dfe4ea') : C('#e6e0cc'),
          { hard: true, gloss: .06, ry: (rnd() - .5) * .06, tag: '作业本' });
      sy2 += h2;
    }
    box(dx + .10, sy2 + .001, dz - .02, .20, .002, .26, C('#e8e2ce'), { hard: true, gloss: .06 });
    // Lying on the cover, not standing up off it: `flatText` lays the quads face-up.
    A.flatText(dx + .10, sy2 + .006, dz + .06, 0, '作业本',
               { size: .036, gap: .008, color: C('#6b7a8a'), gloss: .05 });
    // the red pen lying across it, uncapped
    cyl(dx + .17, sy2 + .010, dz - .04, .006, .14, col.red, { rz: PI / 2, ry: .55, gloss: .45,
        tag: '红笔' });
    cyl(dx + .10, sy2 + .010, dz - .085, .006, .03, col.bone, { rz: PI / 2, ry: .55, gloss: .5 });
    // a shorter, finished stack with a red tick on the cover
    let sy3 = DT + .022;
    for (let i = 0; i < 5; i++) {
      box(dx - .16, sy3 + .0045, dz - .30, .20, .009, .26, C('#dfe4ea'),
          { hard: true, gloss: .06, ry: (rnd() - .5) * .05, tag: '作业本' });
      sy3 += .009;
    }
    box(dx - .19, sy3 + .003, dz - .30, .05, .003, .015, col.red, { hard: true, rz: 0, ry: .6 });
    box(dx - .15, sy3 + .003, dz - .28, .09, .003, .015, col.red, { hard: true, ry: -.5 });
    // 教案 — the lesson plan, open, with a pen line down the margin
    box(dx - .12, DT + .026, dz + .30, .30, .006, .40, col.paper,
        { hard: true, gloss: .05, ry: -.12, tag: '教案' });
    A.flatText(dx - .12, DT + .032, dz + .42, -.12, '教案',
               { size: .038, gap: .008, color: col.ink, gloss: .05 });
    for (let i = 0; i < 7; i++)
      box(dx - .12, DT + .030, dz + .34 - i * .022, .22, .002, .003, C('#8b93a0'),
          { hard: true, ry: -.12 });
    // 保温杯 and the ring it has left
    cyl(dx + .18, DT + .095, dz + .40, .042, .17, C('#2e6a58'), { gloss: .48, tag: '杯子' });
    cyl(dx + .18, DT + .184, dz + .40, .040, .016, col.steelD, { gloss: .6 });
    cyl(dx + .05, DT + .026, dz + .52, .048, .006, C('#7c6a52'), { gloss: .05 });
    cyl(dx + .05, DT + .029, dz + .52, .040, .006, C('#8a6440'), { gloss: .06 });
    // 老花镜 folded on the plan, and the magnifier beside them
    for (const s of [-1, 1])
      cyl(dx - .05 + s * .028, DT + .034, dz + .16, .026, .004, C('#bcd0d6'),
          { rx: PI / 2, gloss: .80, alpha: .55, tag: '眼镜' });
    box(dx - .05, DT + .034, dz + .16, .066, .004, .004, col.brassD, { hard: true, gloss: .5,
        tag: '眼镜' });
    for (const s of [-1, 1])
      box(dx - .05 + s * .052, DT + .034, dz + .18, .010, .004, .07, col.brassD,
          { hard: true, gloss: .5, ry: s * .3, tag: '眼镜' });
    cyl(dx + .20, DT + .030, dz + .10, .042, .006, C('#c6dde4'),
        { rx: PI / 2, gloss: .82, alpha: .5, tag: '放大镜' });
    box(dx + .20, DT + .030, dz + .02, .014, .008, .11, col.woodD, { hard: true, gloss: .3,
        tag: '放大镜' });
    // the desk calendar, and a 台历 stand
    box(dx - .22, DT + .075, dz + .60, .12, .10, .16, col.bone, { hard: true, gloss: .08, rz: -.16,
        tag: '日历' });
    G(dx - .155, DT + .085, dz + .60, PI / 2, '九月',
      { size: .034, gap: .007, color: col.redD });

    // 椅子 — a plain wooden chair pushed half under the desk
    const cx2 = dx + .78, cz2 = dz + .06;
    box(cx2, FL + .44, cz2, .44, .04, .42, col.oak, { hard: true, gloss: .24, tag: '椅子' });
    box(cx2 + .21, FL + .70, cz2, .045, .56, .40, col.oak, { hard: true, gloss: .24, tag: '椅子' });
    for (let i = 0; i < 3; i++)
      box(cx2 + .19, FL + .70 + (i - 1) * .16, cz2, .012, .05, .36, C('#b08a52'),
          { hard: true, gloss: .22 });
    for (const [ox, oz] of [[-.19, -.18], [.19, -.18], [-.19, .18], [.19, .18]])
      box(cx2 + ox, FL + .22, cz2 + oz, .04, .44, .04, col.oak, { hard: true, gloss: .24 });
    box(cx2, FL + .465, cz2, .40, .025, .38, C('#7c8a74'), { hard: true, gloss: .06, mode: 7 });
    shade(cx2, cz2, .52, .50, .30, FL + .012);
    // 地球仪 on a floor stand beside the desk
    const gx2 = dx + .30, gz2 = dz - .96;
    for (let i = 0; i < 3; i++)
      cyl(gx2 + Math.cos(i * 2.1) * .13, FL + .21, gz2 + Math.sin(i * 2.1) * .13, .013, .42,
          col.woodD, { rz: Math.cos(i * 2.1) * .18, rx: -Math.sin(i * 2.1) * .18, gloss: .3 });
    cyl(gx2, FL + .43, gz2, .10, .022, col.woodD, { gloss: .3, tag: '地球仪' });
    ball(gx2, FL + .60, gz2, .155, .155, .155, C('#5b86a8'),
         { gloss: .30, tag: '地球仪' });
    for (const [ox, oy, oz, s2] of [[-.05, .05, .10, .06], [.07, .02, .09, .05],
                                    [.02, -.06, .12, .045], [-.09, -.03, .07, .04]])
      ball(gx2 + ox, FL + .60 + oy, gz2 + oz, s2, s2 * .8, s2 * .5, C('#8a9a6a'), { gloss: .28 });
    cyl(gx2, FL + .60, gz2, .168, .012, col.brassD, { rz: .40, gloss: .55 });
    shade(gx2, gz2, .36, .36, .30, FL + .012);
    // a wastepaper basket under the desk, and one crumpled sheet beside it
    cyl(dx + .16, FL + .13, dz - .82, .105, .26, C('#7a6a52'), { gloss: .18, tag: '纸篓' });
    ball(dx + .38, FL + .045, dz - .90, .045, .040, .045, col.paper, { gloss: .04 });
    shade(dx + .16, dz - .82, .26, .26, .30, FL + .010);

    // ---------------------------------------------------------------- the blackboard
    //
    // Real, and the point of the room: a free chance to put a sentence you can read on a wall.
    // The partition at PZS presents its study face at z = PZS + .05, so everything hung on it
    // stands clear of that plane, not of the partition's centre line.
    const BBX = -3.90, BBY = Y + 1.52, BBZ = SZ0 + .095;
    box(BBX, BBY, BBZ, 2.40, 1.24, .05, col.boardR, { hard: true, gloss: .22, tag: '黑板',
        ...MT.timber });
    box(BBX, BBY, BBZ + .034, 2.26, 1.10, .014, col.board, { hard: true, gloss: .14, tag: '黑板' });
    // the chalk ledge, with the chalk and the rubber on it
    box(BBX, BBY - .655, BBZ + .050, 2.40, .04, .07, col.boardR, { hard: true, gloss: .24 });
    for (let i = 0; i < 4; i++)
      cyl(BBX - .90 + i * .07, BBY - .620, BBZ + .062, .008, .062, i === 3 ? col.chalkY : col.chalk,
          { rz: PI / 2, gloss: .06, tag: '粉笔' });
    box(BBX + .78, BBY - .612, BBZ + .062, .13, .05, .07, C('#4e4438'),
        { hard: true, gloss: .10, tag: '黑板擦' });
    box(BBX + .78, BBY - .638, BBZ + .062, .13, .02, .07, C('#c9c2ae'), { hard: true, gloss: .05 });
    // what is written on it. Chalk is not emissive — it is dust catching the room's own light.
    const CH = { size: .085, gap: .020, color: col.chalk, gloss: .04 };
    G(BBX - .78, BBY + .445, BBZ + .046, 0, '语文 · 第一课', { ...CH, size: .062, gap: .014,
      color: col.chalkY });
    box(BBX - .78, BBY + .400, BBZ + .046, .60, .006, .004, col.chalkY, { hard: true });
    G(BBX - .10, BBY + .245, BBZ + .046, 0, '学而时习之，不亦说乎', { ...CH, size: .090 });
    G(BBX - .16, BBY + .120, BBZ + .046, 0, 'xue er shi xi zhi', { ...CH, size: .044, gap: .008,
      color: C('#bcc6bd') });
    G(BBX - .40, BBY - .080, BBZ + .046, 0, '作业：抄写生字十遍', { ...CH, size: .060, gap: .012 });
    G(BBX - .46, BBY - .200, BBZ + .046, 0, '明天听写', { ...CH, size: .056, gap: .012,
      color: col.chalkY });
    // and a 田字格 on the right of the board, with the character being taught inside it
    const TGX = BBX + .78, TGY = BBY - .020;
    for (const s of [-1, 1]) {
      box(TGX + s * .145, TGY, BBZ + .044, .005, .29, .004, col.chalk, { hard: true });
      box(TGX, TGY + s * .145, BBZ + .044, .29, .005, .004, col.chalk, { hard: true });
    }
    box(TGX, TGY, BBZ + .043, .005, .29, .004, C('#8fa093'), { hard: true });
    box(TGX, TGY, BBZ + .043, .29, .005, .004, C('#8fa093'), { hard: true });
    G(TGX, TGY, BBZ + .048, 0, '教', { size: .215, color: col.chalk, gloss: .04 });

    // --- the two hanging scrolls, one either side of the board
    function scroll(x, text, sub) {
      const z2 = SZ0 + .075;
      box(x, Y + 1.52, z2, .30, 1.42, .012, C('#e6dcc0'), { hard: true, gloss: .06, tag: '字画' });
      box(x, Y + 1.52, z2 + .008, .24, 1.34, .006, C('#f1e9d2'), { hard: true, gloss: .05,
          tag: '字画' });
      for (const sy4 of [2.26, .78])
        cyl(x, Y + sy4 - .04, z2 + .006, .016, .36, C('#6b4a30'), { rz: PI / 2, gloss: .30 });
      G(x, Y + 1.62, z2 + .016, 0, text, { size: .128, gap: .030, color: col.ink, vertical: true,
        gloss: .10 });
      if (sub) G(x + .085, Y + 1.00, z2 + .016, 0, sub,
                 { size: .034, gap: .008, color: C('#8a3a30'), vertical: true });
      // the red seal at the foot, which is what makes it a scroll and not a poster
      box(x + .075, Y + .93, z2 + .016, .045, .045, .004, C('#9c2f26'), { hard: true, gloss: .10 });
    }
    scroll(-5.44, '静以修身', '诫子书');
    scroll(-2.34, '俭以养德');

    // --- the calligraphy table, out in the room, facing the board
    const kx2 = -1.20, kz2 = 0.86;
    box(kx2, FL + .755, kz2, 1.34, .05, .68, col.walnut,
        { hard: true, gloss: .30, tag: '书案', ...MT.timber });
    for (const [ox, oz] of [[-.58, -.26], [.58, -.26], [-.58, .26], [.58, .26]])
      box(kx2 + ox, FL + .37, kz2 + oz, .06, .73, .06, col.walnut, { hard: true, gloss: .28 });
    box(kx2, FL + .60, kz2, 1.20, .05, .18, col.walnut, { hard: true, gloss: .26 });
    shade(kx2, kz2, 1.46, .80, .34, FL + .012);
    stop(kx2 - .69, kx2 + .69, kz2 - .36, kz2 + .36);
    // the felt mat, and the sheet of 米字格 on it, half written
    box(kx2, FL + .784, kz2, 1.16, .012, .56, C('#4a4b52'), { hard: true, gloss: .04, mode: 7 });
    const px3 = kx2 - .12, pz3 = kz2 + .02;
    box(px3, FL + .793, pz3, .60, .006, .44, col.white, { hard: true, gloss: .05, ry: .04,
        tag: '宣纸' });
    for (let r2 = 0; r2 < 3; r2++)
      for (let c2 = 0; c2 < 4; c2++) {
        const gx3 = px3 - .21 + c2 * .14, gz3 = pz3 - .13 + r2 * .13;
        for (const s of [-1, 1]) {
          box(gx3 + s * .055, FL + .796, gz3, .003, .002, .11, C('#c98a86'), { hard: true, ry: .04 });
          box(gx3, FL + .796, gz3 + s * .055, .11, .002, .003, C('#c98a86'), { hard: true, ry: .04 });
        }
        box(gx3, FL + .795, gz3, .002, .002, .11, C('#e0b0ac'), { hard: true, ry: .04 });
        box(gx3, FL + .795, gz3, .11, .002, .002, C('#e0b0ac'), { hard: true, ry: .04 });
        if (r2 === 0 || (r2 === 1 && c2 < 2))
          A.flatText(gx3, FL + .799, gz3, .04, ['永', '和', '九', '年', '春'][(r2 * 4 + c2) % 5],
                     { size: .085, color: col.ink, gloss: .04 });
      }
    // 砚台 — a stone inkstone with a well of ink still wet in it
    box(kx2 + .38, FL + .805, kz2 - .10, .19, .05, .15, C('#3a3a3e'),
        { hard: true, gloss: .34, tag: '砚台' });
    box(kx2 + .38, FL + .827, kz2 - .10, .15, .008, .11, C('#14151a'),
        { hard: true, gloss: .72, tag: '砚台' });
    box(kx2 + .38, FL + .812, kz2 - .185, .09, .022, .022, C('#2b2b2f'), { hard: true, gloss: .3 });
    // the ink stick beside it, and the water dropper
    box(kx2 + .55, FL + .800, kz2 - .04, .026, .020, .095, C('#1c1c20'),
        { hard: true, gloss: .30, ry: .5, tag: '墨' });
    A.flatText(kx2 + .55, FL + .812, kz2 - .04, .5, '墨',
               { size: .020, color: col.gold, gloss: .1 });
    ball(kx2 + .55, FL + .812, kz2 + .12, .028, .026, .028, C('#cfd8dd'), { gloss: .55 });
    // 笔架 — five brushes hanging from a little rack
    for (const s of [-1, 1])
      box(kx2 - .60 + s * .10, FL + .90, kz2 - .20, .020, .24, .020, col.woodD,
          { hard: true, gloss: .3, tag: '毛笔' });
    cyl(kx2 - .60, FL + 1.01, kz2 - .20, .009, .24, col.woodD, { rz: PI / 2, gloss: .3,
        tag: '毛笔' });
    for (let i = 0; i < 5; i++) {
      const bxp = kx2 - .68 + i * .04;
      cyl(bxp, FL + .93, kz2 - .20, .0055, .13, i % 2 ? C('#3a2a1c') : C('#8a6a3c'),
          { gloss: .35, tag: '毛笔' });
      taper(bxp, FL + .845, kz2 - .20, .016, .075, .016, C('#2a2018'),
            { rx: PI, gloss: .16, tag: '毛笔' });
    }
    // the seal and its little box of cinnabar paste
    cyl(kx2 + .54, FL + .795, kz2 + .22, .022, .014, C('#a6493c'), { gloss: .4, tag: '印章' });
    cyl(kx2 + .54, FL + .806, kz2 + .22, .018, .008, C('#8a2f26'), { gloss: .5, tag: '印章' });
    box(kx2 + .30, FL + .812, kz2 + .20, .05, .06, .05, C('#3a2a1c'), { hard: true, gloss: .3,
        tag: '印章' });
    // a roll of 宣纸 leaning in the corner
    for (const [ox, a2] of [[0, .10], [.06, -.07]])
      cyl(kx2 - .92 + ox, FL + .52, kz2 - .30, .036, 1.02, C('#e3dcc4'), { rz: a2, gloss: .10,
          tag: '宣纸' });
    shade(kx2 - .89, kz2 - .30, .20, .16, .26, FL + .010);

    // --- 收音机 on a low cabinet by the study door, and the pile of scores beside it
    // East of the shelving, on the stretch of the book wall the bookcase stops short of, so it
    // never stands in the doorway a body has to come through.
    const rx2 = 0.22, rz2 = 2.86;
    box(rx2, FL + .34, rz2, .74, .68, .40, col.walnut, { gloss: .26, tag: '柜子', ...MT.timber });
    box(rx2, FL + .695, rz2, .80, .04, .46, col.woodL, { hard: true, gloss: .30 });
    for (const s of [-1, 1])
      box(rx2 + s * .18, FL + .34, rz2 - .21, .34, .60, .020, col.woodL,
          { hard: true, gloss: .26 });
    shade(rx2, rz2, .86, .50, .32, FL + .012);
    stop(rx2 - .41, rx2 + .41, rz2 - .24, rz2 + .24);
    box(rx2 - .10, FL + .81, rz2, .38, .19, .18, C('#8a6a4a'), { gloss: .22, tag: '收音机' });
    box(rx2 - .18, FL + .81, rz2 - .095, .18, .13, .012, C('#c8b48a'), { hard: true, gloss: .12,
        tag: '收音机' });
    for (let i = 0; i < 7; i++)
      box(rx2 - .18, FL + .77 + i * .012, rz2 - .102, .17, .004, .004, C('#6b5638'), { hard: true });
    box(rx2 - .05, FL + .855, rz2 - .095, .13, .035, .010, C('#2b3a2e'),
        { hard: true, mode: 1, glow: .05, gloss: .3, tag: '收音机' });
    box(rx2 - .05, FL + .855, rz2 - .102, .004, .030, .004, col.redL, { hard: true, mode: 1,
      glow: .12 });
    for (const [ox, r3] of [[.02, .022], [.07, .018]])
      cyl(rx2 - .05 + ox + .05, FL + .79, rz2 - .095, r3, .020, C('#4e4034'),
          { rx: PI / 2, gloss: .40, tag: '收音机' });
    cyl(rx2 + .07, FL + .96, rz2 + .02, .004, .30, col.steel, { rz: .28, gloss: .5 });
    // a stack of books left on the cabinet, the top one open face down
    let sy5 = FL + .715;
    for (let i = 0; i < 4; i++) { sy5 = FL + .715 + i * .028;
      box(rx2 + .24, sy5, rz2 + .04, .17, .026, .23, C(pick(BOOKC)),
          { hard: true, gloss: .10, ry: (rnd() - .5) * .12, tag: '书' }); }
    // 老师 keeps a vacuum flask of hot water on the corner, always
    cyl(rx2 - .30, FL + .82, rz2 + .12, .052, .21, C('#3d5a4a'), { gloss: .35, tag: '杯子' });
    cyl(rx2 - .30, FL + .935, rz2 + .12, .050, .020, col.steelD, { gloss: .55 });

    light(-4.20, Y + 2.20, 1.90, C('#ffe9c4'), .52, 3.80);
    light(-1.10, Y + 2.16, 1.20, C('#ffe4bb'), .40, 3.20);
    light(-5.10, Y + 1.30, 1.80, C('#fff0d6'), .22, 2.20);      // the window's own bounce
  })();

  // ===================================================================================== 卧室
  //
  // Restrained, tidy, older. A hard bed with a folded quilt at its foot, a wardrobe with a
  // mirrored door, a bedside table with tonight's book on it and yesterday's glasses.
  (function bedroom() {
    // 0.30 m further north than it wants to be. At z -1.90 the bed's collider and the balcony
    // partition left a 20 mm slot between them, so the 阳台 could not be reached at all.
    const bx = -4.40, bz = -1.60;
    box(bx, FL + .20, bz, 1.55, .40, 2.00, col.wood, { gloss: .22, tag: '床', ...MT.timber });
    box(bx, FL + .44, bz, 1.50, .14, 1.95, C('#cfc7b0'), { gloss: .05, mode: 7, tag: '床' });
    box(bx, FL + .52, bz + .12, 1.48, .06, 1.60, C('#8d9aa8'), { gloss: .05, mode: 7, tag: '床' });
    box(bx, FL + .78, bz - 1.02, 1.60, .84, .09, col.wood, { hard: true, gloss: .24, tag: '床',
        ...MT.timber });
    for (const s of [-1, 1])
      cap(bx + s * .38, FL + .58, bz - .78, .30, .16, .20, col.white, { gloss: .04, tag: '枕头' });
    // the quilt folded in three at the foot, which is how a made bed here looks
    box(bx, FL + .58, bz + .70, 1.44, .16, .52, C('#a04a44'), { gloss: .05, mode: 7, tag: '被子' });
    box(bx, FL + .66, bz + .70, 1.40, .04, .48, C('#b8564e'), { gloss: .05, mode: 7 });
    shade(bx, bz, 1.70, 2.15, .34, FL + .012);
    stop(bx - .80, bx + .78, bz - 1.08, bz + 1.02);
    // bedside table
    const nx = bx + 1.02, nz = bz - .78;
    box(nx, FL + .26, nz, .42, .52, .40, col.walnut, { gloss: .26, tag: '床头柜', ...MT.timber });
    box(nx, FL + .535, nz, .46, .04, .44, col.woodL, { hard: true, gloss: .30, tag: '床头柜' });
    cyl(nx - .18, FL + .34, nz, .012, .09, col.brassD, { rz: PI / 2, gloss: .55 });
    shade(nx, nz, .50, .48, .30, FL + .012);
    stop(nx - .23, nx + .23, nz - .22, nz + .22);
    box(nx, FL + .572, nz - .04, .16, .03, .22, C('#5a3a58'), { hard: true, gloss: .10, tag: '书' });
    box(nx, FL + .590, nz - .04, .15, .006, .21, col.paper, { hard: true, gloss: .05 });
    for (const s of [-1, 1])
      cyl(nx + .06 + s * .026, FL + .580, nz + .13, .024, .004, C('#bcd0d6'),
          { rx: PI / 2, gloss: .8, alpha: .55, tag: '眼镜' });
    cyl(nx - .10, FL + .60, nz + .10, .032, .10, C('#7a8a94'), { gloss: .30 });
    // a small reading lamp clipped to the headboard
    cyl(bx + .62, FL + 1.16, bz - .98, .010, .22, col.steelD, { rz: .5, gloss: .5 });
    taper(bx + .70, FL + 1.28, bz - .96, .09, .09, .09, C('#c8b48a'),
          { rx: PI, gloss: .28, tag: '台灯' });
    // 衣柜, against the partition, one door mirrored
    // South of the bedroom doorway, not across it: the opening at z -1.65 .. -0.65 has to stay
    // clear once `clampMove` has spent 0.30 m of it on each side of the body.
    const wx2 = 0.62, wz2 = -2.66;
    box(wx2, FL + 1.02, wz2, .58, 2.04, 1.70, col.walnut, { gloss: .26, tag: '衣柜', ...MT.timber });
    box(wx2, FL + 2.08, wz2, .62, .10, 1.76, col.woodL, { hard: true, gloss: .28, tag: '衣柜' });
    for (const s of [-1, 1]) {
      box(wx2 - .29, FL + 1.00, wz2 + s * .42, .022, 1.92, .80, col.woodL,
          { hard: true, gloss: .28, tag: '衣柜' });
      cyl(wx2 - .31, FL + 1.00, wz2 + s * .10, .011, .18, col.brassD, { gloss: .55 });
    }
    box(wx2 - .315, FL + 1.02, wz2 - .42, .006, 1.60, .62, C('#c8d6da'),
        { hard: true, gloss: .88, mode: 1, glow: .02, tag: '镜子' });
    shade(wx2, wz2, .66, 1.82, .34, FL + .012);
    stop(wx2 - .31, wx2 + .31, wz2 - .87, wz2 + .87);
    // a cardboard suitcase and a folded blanket on top, which is where they live
    box(wx2, FL + 2.28, wz2 + .40, .44, .30, .62, C('#8a7250'), { gloss: .12 });
    box(wx2, FL + 2.24, wz2 - .42, .40, .22, .56, C('#6a7a68'), { gloss: .05, mode: 7 });
    // the small bedroom window, and a chest of drawers under it
    windowBay('x', X0, 1, -2.60, 1.10, 1.00, 2.10, { tag: '窗户' });
    const dx2 = X0 + .46, dz2 = -2.60;
    box(dx2, FL + .40, dz2, .48, .80, 1.00, col.walnut, { gloss: .26, tag: '柜子', ...MT.timber });
    box(dx2, FL + .82, dz2, .54, .04, 1.06, col.woodL, { hard: true, gloss: .30 });
    for (let i = 0; i < 3; i++) {
      box(dx2 + .24, FL + .22 + i * .24, dz2, .022, .20, .90, col.woodL,
          { hard: true, gloss: .28, tag: '柜子' });
      for (const s of [-1, 1])
        cyl(dx2 + .26, FL + .22 + i * .24, dz2 + s * .22, .011, .05, col.brassD,
            { rz: PI / 2, gloss: .55 });
    }
    shade(dx2, dz2, .56, 1.10, .32, FL + .012);
    stop(dx2 - .26, dx2 + .26, dz2 - .52, dz2 + .52);
    // a doily, a tin of tea, and a framed wedding photograph
    box(dx2, FL + .845, dz2, .30, .008, .30, col.white, { hard: true, gloss: .05, ry: .4 });
    cyl(dx2, FL + .90, dz2, .050, .11, C('#3d5a4a'), { gloss: .35, tag: '茶叶' });
    cyl(dx2, FL + .962, dz2, .048, .014, C('#c8a84a'), { gloss: .5 });
    box(dx2 - .04, FL + .96, dz2 - .34, .022, .24, .19, col.brassD,
        { hard: true, gloss: .42, ry: .3, tag: '照片' });
    box(dx2 - .05, FL + .96, dz2 - .34, .006, .19, .15, C('#c8c0ac'),
        { hard: true, gloss: .14, ry: .3, tag: '照片' });
    // slippers by the bed
    for (const s of [-1, 1])
      cap(bx + 1.00 + s * .07, FL + .034, bz + .30, .074, .052, .188, C('#7d6f5c'),
          { ry: s * .07, gloss: .12, tag: '拖鞋' });
    shade(bx + 1.00, bz + .30, .34, .26, .22, FL + .008);
    light(-3.60, Y + 2.16, -1.90, C('#ffe2b6'), .42, 3.40);
    light(-5.20, Y + 1.40, -2.60, C('#fff0d6'), .18, 2.00);
  })();

  // ============================================================================ 厨房 · 餐厅
  (function kitchen() {
    const KZ = ZF, run = FL + .86;
    // the run of units along the street wall, and the wall tiling over it
    box(3.50, FL + .43, KZ + .32, 4.90, .86, .62, C('#c6bda6'), { gloss: .24, tag: '厨房' });
    // A dark composite worktop, not paving. `MAT.slab` here read as gravel under the pans and
    // took the gloss straight back into the lens.
    box(3.50, run, KZ + .32, 4.98, .05, .66, C('#4e4a45'),
        { hard: true, gloss: .30, tag: '厨房' });
    // Tiling goes behind the hob and stops short of the window over the sink — a splashback laid
    // straight across would drive a 6 cm slab of tile through the window reveal at x 4.20.
    // Gloss .18, not .40. Two and a half square metres of pale tile at .40, facing a lamp two
    // metres away, has nowhere to go but white — the whole splashback, the extractor and the
    // window over the sink blew out together and the kitchen lost its shape.
    box(2.40, FL + 1.52, KZ + .06, 2.50, 1.06, .06, C('#b9c0ba'),
        { hard: true, gloss: .18, ...MT.tile });
    for (let i = 0; i < 8; i++)
      box(1.30 + i * .31, FL + 1.52, KZ + .095, .29, 1.02, .006, C('#c8cfc7'),
          { hard: true, gloss: .20 });
    for (let i = 0; i < 6; i++) {
      box(1.30 + i * .80, FL + .43, KZ + .012, .74, .74, .022, C('#d8cfb6'),
          { hard: true, gloss: .28, tag: '厨房' });
      cyl(1.30 + i * .80, FL + .70, KZ - .012, .010, .16, col.steelD, { rz: PI / 2, gloss: .5 });
    }
    stop(1.00, 6.00, KZ, KZ + .66);
    // 灶台, the hob, with a wok on it and the extractor over
    for (const [ox, oz] of [[-.15, -.13], [.15, -.13], [-.15, .13], [.15, .13]])
      cyl(2.20 + ox, run + .028, KZ + .32 + oz, .012, .012, col.steelX, { gloss: .5 });
    for (const cx3 of [2.05, 2.55]) {
      cyl(cx3, run + .030, KZ + .32, .095, .012, C('#2b2f33'), { gloss: .45, tag: '灶台' });
      cyl(cx3, run + .042, KZ + .32, .055, .014, C('#3d4348'), { gloss: .4, tag: '灶台' });
    }
    ball(2.05, run + .10, KZ + .32, .155, .085, .155, C('#3a3630'), { gloss: .38, tag: '锅' });
    cyl(2.05, run + .16, KZ + .32, .150, .020, C('#4a453c'), { gloss: .40, tag: '锅' });
    cyl(2.05 - .24, run + .14, KZ + .32, .014, .30, C('#3a2a1c'), { rz: PI / 2 - .2, gloss: .25 });
    box(2.30, FL + 1.86, KZ + .28, 1.00, .28, .56, col.steel,
        { hard: true, gloss: .50, tag: '抽油烟机', ...MT.metal });
    taper(2.30, FL + 1.68, KZ + .28, .92, .20, .50, col.steelD,
          { rx: PI, gloss: .48, tag: '抽油烟机' });
    box(2.30, FL + 2.24, KZ + .16, .26, .48, .18, col.steelD, { hard: true, gloss: .45 });
    // 水槽, the sink, and the window over it
    box(4.20, run + .010, KZ + .32, .58, .04, .44, col.steelD,
        { hard: true, gloss: .55, tag: '水槽', ...MT.metal });
    box(4.20, run - .05, KZ + .32, .52, .10, .38, C('#9aa2a8'), { hard: true, gloss: .60,
        tag: '水槽' });
    cyl(4.20, run + .13, KZ + .14, .014, .26, col.steel, { gloss: .62, tag: '水龙头' });
    cyl(4.20, run + .25, KZ + .21, .012, .16, col.steel, { rx: PI / 2, gloss: .62, tag: '水龙头' });
    windowBay('z', ZF, 1, 4.20, 1.00, 1.20, 2.10, { tag: '窗户', pool: false });
    // 电饭煲, 热水瓶, a chopping board, jars, and a bunch of garlic on a nail
    cyl(5.05, run + .12, KZ + .34, .125, .20, col.white, { gloss: .38, tag: '电饭煲' });
    cyl(5.05, run + .225, KZ + .34, .118, .03, C('#b8bfc4'), { gloss: .45, tag: '电饭煲' });
    box(5.05, run + .13, KZ + .215, .12, .07, .012, C('#2b3238'), { hard: true, mode: 1, glow: .04,
        gloss: .3, tag: '电饭煲' });
    cyl(5.45, run + .17, KZ + .34, .085, .34, C('#9d3d33'), { gloss: .32, tag: '热水瓶' });
    cyl(5.45, run + .35, KZ + .34, .050, .05, col.steelD, { gloss: .45, tag: '热水瓶' });
    box(3.35, run + .035, KZ + .32, .30, .025, .40, C('#b08a52'), { hard: true, gloss: .18,
        tag: '案板' });
    for (const [jx2, jc] of [[3.00, C('#8a4a2e')], [3.14, C('#5f6b3c')], [2.86, C('#7d6a3a')]])
      cyl(jx2, run + .085, KZ + .50, .052, .13, jc, { gloss: .48, alpha: .92, tag: '罐子' });
    for (let i = 0; i < 6; i++)
      ball(1.55 + (i % 3) * .05, FL + 1.60 - ((i / 3) | 0) * .07, KZ + .14, .038, .042, .034,
           C('#e0d6c0'), { gloss: .18, tag: '蒜' });
    // 冰箱 in the corner
    box(1.42, FL + .82, -2.90, .62, 1.64, .62, C('#dcd8ce'), { gloss: .34, tag: '冰箱' });
    box(1.11, FL + 1.10, -2.90, .022, .96, .56, C('#e8e4da'), { hard: true, gloss: .38,
        tag: '冰箱' });
    box(1.11, FL + .38, -2.90, .022, .52, .56, C('#e8e4da'), { hard: true, gloss: .38,
        tag: '冰箱' });
    for (const yy of [1.10, .38])
      box(1.09, FL + yy + .30, -2.90, .020, .05, .40, col.steelD, { hard: true, gloss: .5 });
    // a magnet and a school timetable stuck on the door
    box(1.10, FL + 1.28, -2.72, .006, .26, .20, col.paper, { hard: true, gloss: .05, tag: '课程表' });
    G(1.09, FL + 1.37, -2.72, -PI / 2, '课程表', { size: .036, gap: .007, color: col.ink });
    for (let r2 = 0; r2 < 5; r2++)
      for (let c2 = 0; c2 < 5; c2++)
        box(1.09, FL + 1.30 - r2 * .028, -2.72 - .07 + c2 * .035, .003, .020, .028,
            (r2 + c2) % 3 ? C('#dfd8c4') : C('#c9bfa4'), { hard: true });
    shade(1.42, -2.90, .70, .70, .34, FL + .012);
    stop(1.09, 1.75, -3.23, -2.57);
    // 餐桌 with four stools, and the everyday clutter of one
    // West of the kitchen doorway. Centred on the room it would sit in the opening: the doorway
    // is x 3.35 .. 4.35, and a table collider inflated by the body radius reaches 0.30 m past
    // its own edge in every direction.
    const tx2 = 2.30, tz2 = -2.95;
    box(tx2, FL + .735, tz2, 1.20, .05, .80, col.oak, { hard: true, gloss: .26, tag: '餐桌',
        ...MT.timber });
    for (const [ox, oz] of [[-.52, -.32], [.52, -.32], [-.52, .32], [.52, .32]])
      box(tx2 + ox, FL + .36, tz2 + oz, .06, .72, .06, col.oak, { hard: true, gloss: .26 });
    box(tx2, FL + .74, tz2, .96, .012, .60, C('#c8d0c2'), { hard: true, gloss: .06, mode: 7 });
    shade(tx2, tz2, 1.34, .94, .34, FL + .012);
    stop(tx2 - .66, tx2 + .66, tz2 - .46, tz2 + .46);
    // Two stools, which is what a household of one owns. Not four: the north one would stand on
    // the far side of the kitchen wall and the west one inside the fridge.
    for (const [ox, oz] of [[.86, 0], [0, -.62]]) {
      box(tx2 + ox, FL + .42, tz2 + oz, .34, .04, .34, col.oak, { hard: true, gloss: .24,
          tag: '凳子' });
      for (const [jx2, jz2] of [[-.13, -.13], [.13, -.13], [-.13, .13], [.13, .13]])
        cyl(tx2 + ox + jx2, FL + .21, tz2 + oz + jz2, .014, .42, col.oak, { gloss: .24 });
      shade(tx2 + ox, tz2 + oz, .40, .40, .26, FL + .010);
    }
    // one bowl, one pair of chopsticks, a pot of tea for one
    cyl(tx2 - .18, FL + .785, tz2 + .06, .075, .05, col.bone, { gloss: .48, tag: '碗' });
    cyl(tx2 - .18, FL + .805, tz2 + .06, .062, .012, C('#d8d0b8'), { gloss: .4 });
    for (const s of [-1, 1])
      cyl(tx2 - .02 + s * .008, FL + .768, tz2 + .06, .0035, .22, C('#a8845a'),
          { rz: PI / 2, ry: .3 + s * .04, gloss: .3, tag: '筷子' });
    ball(tx2 + .28, FL + .805, tz2 - .10, .062, .048, .062, C('#8a6a4a'), { gloss: .36, tag: '茶壶' });
    cyl(tx2 + .28, FL + .842, tz2 - .10, .022, .020, C('#8a6a4a'), { gloss: .36 });
    light(3.60, Y + 2.20, -3.30, C('#ffeccd'), .36, 3.40);
    light(2.30, Y + 1.90, -4.40, C('#fff2da'), .18, 2.40);
  })();

  // ===================================================================================== 阳台
  //
  // Laundry lives here, on a rack, not in a machine. So do the pickles, the mop, and the
  // outdoor unit of the air conditioner.
  (function balcony() {
    // the glazing along the street face, full height
    for (let i = 0; i < 6; i++) {
      const cx3 = X0 + .58 + i * 1.16;
      box(cx3, Y + 1.43, ZF + .05, 1.10, 1.98, .022, col.glass,
          { hard: true, mode: 18, alpha: .15, gloss: .76 });
      for (const s of [-1, 1])
        box(cx3 + s * .57, Y + 1.30, ZF + .05, .05, 2.30, .07, col.alu,
            { hard: true, gloss: .40, ...MT.metal });
      // what you can see out of it, painted at the back of the reveal
      box(cx3, Y + 1.60, ZF + .012, 1.06, 1.66, .010, col.sky,
          { hard: true, mode: 1, glow: .034 });
      box(cx3, Y + .90, ZF + .020, 1.06, .34, .010, col.skyLo, { hard: true, mode: 1, glow: .026 });
      box(cx3 + (i % 2 ? -.24 : .28), Y + .74, ZF + .028, .30 + (i % 3) * .12, .62 + (i % 2) * .3,
          .010, i % 2 ? col.tower : col.towerD, { hard: true, mode: 1, glow: .016 });
    }
    box((X0 + PX) / 2, Y + .18, ZF + .06, PX - X0, .36, .10, C('#c2b9a2'),
        { hard: true, gloss: .24, ...MT.plaster });
    box(-2.50, Y + 2.48, ZF + .06, PX - X0, .16, .10, col.alu, { hard: true, gloss: .36 });
    glow(M.trs(-2.50, Y + .022, ZF + 1.05, 0, 6.4, 1, 1.60), C('#ffedcf'), .085, true);
    // 洗衣机
    box(-5.20, FL + .43, -4.30, .60, .86, .60, C('#e0dcd2'), { gloss: .36, tag: '洗衣机' });
    cyl(-4.92, FL + .46, -4.30, .180, .022, C('#b8bfc4'), { rz: PI / 2, gloss: .5, tag: '洗衣机' });
    cyl(-4.94, FL + .46, -4.30, .150, .022, C('#5a6a72'), { rz: PI / 2, gloss: .72, alpha: .55,
        tag: '洗衣机' });
    box(-5.20, FL + .89, -4.30, .58, .04, .58, C('#eae6dc'), { hard: true, gloss: .40 });
    box(-5.20, FL + .93, -4.42, .30, .06, .22, C('#c8c2b4'), { hard: true, gloss: .3 });
    box(-5.20, FL + .96, -4.42, .18, .012, .10, C('#2b3238'), { hard: true, mode: 1, glow: .05 });
    shade(-5.20, -4.30, .68, .68, .34, FL + .012);
    stop(-5.52, -4.88, -4.62, -3.98);
    // a basin of laundry on top, and the 洗衣粉
    cyl(-5.20, FL + 1.00, -4.20, .18, .12, C('#c4553f'), { gloss: .30, tag: '盆' });
    ball(-5.20, FL + 1.06, -4.20, .15, .05, .15, C('#dfe4ea'), { gloss: .06, mode: 7 });
    box(-4.78, FL + 1.02, -4.34, .13, .22, .09, C('#e6e0cc'), { hard: true, gloss: .12 });
    // 晾衣架 — a drying rack with today's washing on it
    const rx3 = -2.90, rz3 = -4.34;
    for (const s of [-1, 1]) {
      cyl(rx3 + s * .62, FL + .58, rz3 - .22, .014, 1.16, col.steel, { rz: s * .10, gloss: .5 });
      cyl(rx3 + s * .62, FL + .58, rz3 + .22, .014, 1.16, col.steel, { rz: s * .10, gloss: .5 });
      cyl(rx3 + s * .62, FL + .04, rz3, .012, .46, col.steel, { rx: PI / 2, gloss: .5 });
    }
    for (let i = 0; i < 5; i++)
      cyl(rx3, FL + 1.12, rz3 - .20 + i * .10, .008, 1.28, col.steel,
          { rz: PI / 2, gloss: .5, tag: '晾衣架' });
    const WASH = [[-.44, .48, C('#dfe4ea')], [-.14, .56, C('#8d9aa8')], [.16, .44, C('#e4ddc8')],
                  [.44, .52, C('#5f6b7d')]];
    WASH.forEach(([ox, hh, c2], i) => {
      box(rx3 + ox, FL + 1.10 - hh / 2, rz3 - .18 + (i % 3) * .10, .26, hh, .022, c2,
          { hard: true, gloss: .05, mode: 7, rz: (rnd() - .5) * .08, tag: '衣服' });
      cyl(rx3 + ox, FL + 1.12, rz3 - .18 + (i % 3) * .10, .006, .10, col.steelD,
          { rz: PI / 2, gloss: .5 });
    });
    for (let i = 0; i < 3; i++)
      box(rx3 - .70 + i * .04, FL + 1.13, rz3 + .10, .022, .045, .045, C('#c8b45a'),
          { hard: true, gloss: .2, tag: '衣夹' });
    shade(rx3, rz3, 1.40, .60, .22, FL + .010);
    // the air conditioner's outdoor unit, bracketed outside the glass at high level
    box(-0.30, Y + 1.90, ZF + .30, .78, .54, .34, C('#cfcabd'), { gloss: .30, tag: '空调' });
    for (let i = 0; i < 9; i++)
      box(-0.30, Y + 1.90 + (i - 4) * .052, ZF + .132, .70, .026, .012, C('#b8b3a6'),
          { hard: true, gloss: .3 });
    // pickle jars and a bag of rice on a shelf, and a bicycle pump against the wall
    box(-0.36, FL + .96, -4.34, .56, .04, .34, col.wood, { hard: true, gloss: .24 });
    for (const s of [-1, 1])
      box(-0.36 + s * .24, FL + .74, -4.34, .04, .42, .30, col.wood, { hard: true, gloss: .24 });
    for (const [jx2, jc, jh] of [[-.52, C('#7d6a3a'), .20], [-.30, C('#8a4a2e'), .17],
                                 [-.10, C('#5f6b3c'), .22]])
      cyl(-0.36 + jx2 + .30, FL + .98 + jh / 2, -4.34, .072, jh, jc,
          { gloss: .45, alpha: .92, tag: '咸菜' });
    box(-0.36, FL + .40, -4.34, .40, .60, .28, C('#d8cfb2'), { gloss: .10, tag: '米' });
    G(-0.36, FL + .48, -4.20, 0, '大米', { size: .058, gap: .012, color: C('#7a6a48') });
    shade(-0.36, -4.34, .52, .40, .28, FL + .012);
    cyl(0.62, FL + .26, -4.10, .020, .52, C('#3d4348'), { rz: .16, gloss: .4 });
    // a broom and the dustpan
    cyl(-6.00 + .34, FL + .62, -4.20, .012, 1.22, C('#9a7c4e'), { rz: -.10, gloss: .18 });
    box(X0 + .22, FL + .06, -4.20, .07, .12, .30, C('#8a6a3c'), { gloss: .10 });
    shade(X0 + .28, -4.20, .34, .40, .28, FL + .010);
    light(-2.90, Y + 2.30, -4.30, C('#fff3de'), .34, 3.00);
  })();

  // ================================================================================= the words
  //
  // Every focus is a spot on the floor a body can really stand on: in the landing that is
  // z 3.55 .. 4.55, and in the flat it is anywhere the zones above allow.
  TH('走廊', 0, Y + 1.60, 4.05, '七楼的走廊很安静。', 'The seventh-floor corridor is very quiet.',
     '走 walk + 廊 covered passage.', 0.20, 4.10, 3.6);
  TH('门', FX, Y + 1.20, ZC + .10, '七〇六是老师家。', 'Seven-oh-six is the teacher’s home.',
     '门 is a door or a gate — and the 门 in 门口, the doorway.', FX, 3.95, 2.0);
  TH('邻居', N4, Y + 1.30, ZN - .10, '我的邻居住在七〇四。', 'My neighbour lives in 704.',
     '邻 neighbouring + 居 to dwell.', N4, 4.30, 2.0);
  TH('春联', FX - .60, Y + 1.50, ZC + .05, '门上贴着一副春联。',
     'A pair of couplets is pasted at the door.',
     '书山有路勤为径，学海无涯苦作舟 — a teacher’s couplet, not a shopkeeper’s.',
     FX - .40, 3.95, 2.0);
  // The shell contributes the live call control on every served deck.  This word belongs only to
  // the compatibility landing above; keeping it beside the shell's control creates two usable
  // 电梯 targets on F7 even though the duplicate panel geometry has correctly stood down.
  if (!A.shellLanding)
    TH('电梯', (LF.x0 + LF.x1) / 2, Y + 1.20, SF - .08, '我在七楼按了电梯。',
       'I pressed for the lift on the seventh floor.',
       '电 electric + 梯 ladder. 楼梯 is the staircase.', 3.20, 4.30, 2.6);
  TH('楼梯', X1 - .10, Y + 1.10, SZ, '楼梯在走廊的东头。',
     'The stairs are at the east end of the corridor.', '楼 storey + 梯 ladder.', 5.30, 4.20, 2.2);
  TH('安全出口', X1 - .10, Y + STOP + .19, SZ, '安全出口的灯是绿色的。',
     'The emergency-exit sign is green.', '安全 safe + 出口 exit.', 5.30, 4.20, 2.4);
  TH('消防栓', HX, Y + 1.40, HZ + .12, '墙上有一个消火栓。', 'There is a fire hydrant on the wall.',
     '消防栓 is what you call it; 消火栓 is what is painted on the cabinet. 栓 is a plug or a valve.', HX, 4.10, 2.0);
  TH('通知', BX, Y + 1.55, BZ + .05, '通知栏上贴着三张通知。',
     'Three notices are pinned on the board.', '通 to pass through + 知 to know: to inform.',
     BX, 4.05, 2.0);
  TH('电表', MX, Y + 1.50, MZ + .08, '电表箱在门旁边。', 'The meter box is beside the door.',
     '电 electricity + 表 gauge.', MX, 4.05, 1.9);
  TH('自行车', -2.40, Y + .80, ZC + .44, '走廊里停着一辆自行车。',
     'A bicycle is parked in the corridor.', '自 self + 行 travel + 车 vehicle.', -2.40, 4.15, 2.0);
  TH('报纸', N3 + .70, Y + .30, ZN - .30, '旧报纸捆好了，等着卖。',
     'The old newspapers are tied up, waiting to be sold.',
     '报 to report + 纸 paper. 卖废品 — you sell them by the kilo.', N3 + .70, 4.20, 1.9);
  TH('鞋', FX - .78, Y + .25, ZC + .30, '鞋放在门口，不进屋。',
     'The shoes stay at the door and do not come in.',
     '鞋 shoe. They live outside the door, never inside the flat.', FX - .40, 3.95, 1.9);
  TH('窗户', X0 + .16, Y + 1.55, WZ, '走廊尽头有一扇窗户。',
     'There is a window at the end of the corridor.',
     '窗 window + 户 door-leaf; together, the fitting.', X0 + .80, 4.10, 2.0);

  // --- inside the flat
  TH('书房', -3.00, Y + 1.60, 1.60, '这是陈老师的书房。', 'This is Teacher Chen’s study.',
     '书 book + 房 room. The best room in the flat, and it is not the living room.',
     -3.00, 1.60, 3.2);
  TH('书架', -2.90, Y + 1.40, 2.86, '书架从地板一直到天花板。',
     'The bookshelves run from the floor to the ceiling.',
     '书 book + 架 a frame or rack. 书柜 is the closed kind, with doors.', -2.90, 2.30, 2.4);
  TH('书', -1.20, Y + 1.42, 2.90, '书架上有一千多本书。', 'There are over a thousand books on it.',
     '书 is both "book" and "to write". 一本书 — the measure word is 本.', -1.20, 2.30, 2.2);
  TH('书桌', -5.30, Y + .90, 1.80, '书桌摆在窗户下面。', 'The desk stands under the window.',
     '书 book + 桌 table. 桌子 on its own is any table.', -4.45, 1.80, 2.0);
  TH('台灯', -5.46, Y + 1.05, 2.36, '台灯的罩子是绿色的。', 'The lamp has a green shade.',
     '台 a stand + 灯 lamp: a lamp that stands on something.', -4.45, 2.20, 1.9);
  TH('作业本', -5.20, Y + .82, 1.78, '老师在改作业。', 'The teacher is marking homework.',
     '作业 homework + 本 an exercise book. 改 is to correct.', -4.45, 1.60, 1.9);
  TH('红笔', -5.13, Y + .83, 1.76, '改作业要用红笔。', 'You mark homework with a red pen.',
     '红 red + 笔 pen or brush — the same 笔 as in 毛笔.', -4.45, 1.50, 1.9);
  TH('教案', -5.42, Y + .80, 2.10, '备课要写教案。', 'Preparing a lesson means writing a plan.',
     '教 to teach + 案 a case or record: the lesson plan.', -4.45, 2.10, 1.9);
  TH('眼镜', -5.35, Y + .80, 1.96, '老花镜放在教案上。',
     'The reading glasses are lying on the lesson plan.',
     '眼 eye + 镜 lens. 老花镜 are the ones you need after forty.', -4.45, 1.96, 1.8);
  TH('地球仪', -5.00, Y + .95, 0.84, '书桌旁边立着一个地球仪。',
     'A globe stands beside the desk.', '地球 the earth + 仪 an instrument or model.',
     -4.40, 0.90, 1.9);
  TH('黑板', -3.90, Y + 1.52, 0.20, '黑板上写着一句论语。',
     'A line from the Analects is written on the blackboard.',
     '学而时习之，不亦说乎 — "to learn, and to practise in season: is that not a pleasure?"',
     -3.90, 1.10, 2.4);
  TH('粉笔', -4.80, Y + .90, 0.21, '粉笔放在黑板下面的槽里。',
     'The chalk sits in the tray under the board.', '粉 powder + 笔 pen.', -4.60, 1.05, 1.9);
  TH('字画', -5.44, Y + 1.60, 0.16, '墙上挂着两幅字画。', 'Two scrolls hang on the wall.',
     '静以修身，俭以养德 — stillness cultivates the self; thrift nurtures virtue.',
     -5.00, 0.62, 2.0);
  TH('书案', -1.20, Y + .90, 0.86, '这张书案是练字用的。',
     'This table is for practising calligraphy.', '书 writing + 案 a long low table.',
     -1.20, 1.60, 2.0);
  TH('砚台', -0.82, Y + .86, 0.76, '砚台里还有一点墨。',
     'There is still a little ink in the inkstone.', '砚 inkstone + 台 a stand or platform.',
     -1.00, 1.55, 1.8);
  TH('毛笔', -1.80, Y + .95, 0.66, '笔架上挂着五支毛笔。',
     'Five brushes hang from the rack.', '毛 hair or fur + 笔 pen: a writing brush.',
     -1.50, 1.66, 1.9);
  TH('宣纸', -1.32, Y + .82, 0.88, '纸上打着米字格。',
     'The paper is printed with practice grids.',
     '宣纸 is the soft paper calligraphy is written on; 米字格 is the rice-character grid.',
     -1.20, 1.55, 1.8);
  TH('收音机', 0.42, Y + .90, 2.70, '收音机在放古典音乐。',
     'The radio is playing classical music.', '收 to receive + 音 sound + 机 machine.',
     0.30, 2.10, 1.9);
  TH('照片', PX + .06, Y + 1.70, -0.40, '墙上全是毕业照。',
     'The wall is covered in graduation photographs.',
     '照 to shine or photograph + 片 a flat piece.', 2.25, -0.40, 2.2);
  TH('锦旗', PX + .06, Y + 1.42, 0.92, '学生送的锦旗写着"师恩难忘"。',
     'The pennant from his students reads "a teacher’s kindness is never forgotten".',
     '锦 brocade + 旗 banner. 桃李满天下 — "peaches and plums all over the world" — is the plaque above.',
     2.15, 0.92, 2.2);
  TH('茶盘', 4.10, Y + .84, -0.35, '茶盘上摆着一把紫砂壶。',
     'A clay teapot stands on the tea tray.',
     '茶 tea + 盘 tray. The slots drain the water you rinse the cups with.', 3.30, -0.55, 1.9);
  TH('茶壶', 4.08, Y + .90, -0.35, '紫砂壶泡的茶最香。',
     'Tea from a purple-clay pot smells the best.', '茶 tea + 壶 pot.', 3.30, -0.40, 1.8);
  TH('沙发', 5.50, Y + .70, -0.60, '沙发是木头的，很硬。', 'The settee is wooden and hard.',
     '沙发 is a loan word — shāfā, from "sofa".', 4.55, 0.78, 2.2);
  TH('电视', 1.50, Y + 1.05, -0.40, '电视很旧了，还能看。',
     'The television is old but it still works.', '电 electric + 视 to look at.', 2.30, -0.40, 2.0);
  TH('钟', PX + .04, Y + 2.02, 0.95, '那个钟快了两分钟。', 'That clock is two minutes fast.',
     '钟 is a clock; 表 is a watch. 几点了？— what time is it?', 2.15, 0.95, 2.4);
  TH('鞋柜', 2.10, Y + .70, 2.86, '进门先把鞋放进鞋柜。',
     'You put your shoes in the cabinet as you come in.', '鞋 shoe + 柜 cupboard.',
     2.10, 2.30, 1.9);
  TH('镜子', 5.90, Y + 1.58, 2.30, '门口有一面镜子。', 'There is a mirror by the door.',
     '镜 lens or mirror + 子, the noun ending.', 5.20, 2.30, 1.9);
  TH('日历', 5.30, Y + 1.70, ZC - .05, '日历翻到了九月十号。',
     'The calendar is turned to the tenth of September.',
     '日 day + 历 calendar. 九月十号 is 教师节, Teachers’ Day.', 5.10, 2.40, 1.9);
  TH('床', -4.40, Y + .60, -1.60, '床铺得整整齐齐。', 'The bed is made very neatly.',
     '床 bed. 起床 is to get up — literally to rise from the bed.', -3.00, -1.20, 2.4);
  TH('衣柜', 0.62, Y + 1.20, -2.34, '衣柜上放着一个旧箱子。',
     'An old suitcase sits on top of the wardrobe.', '衣 clothes + 柜 cupboard.',
     -0.30, -2.34, 2.0);
  TH('洗衣机', -5.20, Y + .60, -4.30, '洗衣机在阳台上。',
     'The washing machine is on the balcony.', '洗 to wash + 衣 clothes + 机 machine.',
     -4.50, -4.20, 2.0);
  TH('晾衣架', -2.90, Y + 1.00, -4.34, '衣服晾在阳台上。', 'The washing is drying on the balcony.',
     '晾 to air + 衣 clothes + 架 rack. Nobody here owns a tumble dryer.', -2.90, -4.00, 2.0);
  TH('阳台', -1.60, Y + 1.30, -4.30, '阳台朝南，太阳很好。',
     'The balcony faces south and gets good sun.', '阳 sun + 台 platform.', -1.60, -4.10, 2.6);
  TH('厨房', 2.60, Y + 1.30, -4.20, '厨房不大，收拾得很干净。',
     'The kitchen is small and kept very clean.', '厨 kitchen + 房 room.', 4.20, -3.60, 2.6);
  TH('电饭煲', 5.05, Y + .98, -4.66, '电饭煲里还有饭。', 'There is still rice in the cooker.',
     '电 electric + 饭 cooked rice + 煲 a pot.', 4.80, -3.90, 1.9);
  TH('热水瓶', 5.45, Y + 1.05, -4.66, '热水瓶里的水还是烫的。',
     'The water in the flask is still hot.', '热 hot + 水 water + 瓶 bottle.', 5.10, -3.90, 1.9);
  TH('餐桌', 2.30, Y + .80, -2.95, '餐桌上只摆了一副碗筷。',
     'Only one bowl and one pair of chopsticks are laid.',
     '餐 a meal + 桌 table. 碗筷 — bowl-and-chopsticks, said as one word.', 3.60, -3.40, 2.0);
  TH('冰箱', 1.42, Y + 1.10, -2.90, '冰箱门上贴着课程表。',
     'The timetable is stuck to the fridge door.', '冰 ice + 箱 box.', 2.70, -1.95, 2.2);

  // --- the small readable things. This floor is meant to be the wordiest in the tower, so the
  // props that are worth a word get one rather than only being scenery.
  TH('拖鞋', 2.57, Y + .25, 2.46, '进门要换拖鞋。', 'You change into slippers indoors.',
     '拖 to drag + 鞋 shoe: the ones you shuffle about the flat in.', 2.57, 2.05, 1.8);
  TH('锅', 2.05, Y + .98, -4.68, '锅挂在灶台上面。', 'The wok sits on the hob.',
     '锅 wok or pan. 炒菜 is to stir-fry — the verb that goes with it.', 2.05, -3.90, 1.9);
  TH('碗', 2.12, Y + .80, -2.89, '一只碗，一双筷子。', 'One bowl, one pair of chopsticks.',
     '碗 bowl; 筷子 chopsticks. 一双 is the measure word for a pair.', 3.55, -3.10, 1.9);
  TH('课程表', 1.09, Y + 1.30, -2.72, '课程表贴在冰箱上。',
     'The timetable is stuck to the fridge.',
     '课 lesson + 程 schedule + 表 table. 语文 is on it four times a week.', 2.70, -1.95, 2.2);
  TH('印章', -0.66, Y + .82, 1.08, '写完字要盖章。', 'You stamp the seal when the writing is done.',
     '印 to print or stamp + 章 a seal. The red paste is 印泥.', -1.20, 1.70, 1.8);
  TH('放大镜', -5.10, Y + .80, 1.90, '看小字要用放大镜。',
     'He needs the magnifier for small print.',
     '放大 to enlarge + 镜 lens.', -4.45, 1.90, 1.8);
  TH('花盆', -5.83, Y + 1.10, 3.86, '窗台上摆着两盆花。',
     'Two pots of flowers stand on the sill.', '花 flower + 盆 basin or pot.', -5.20, 4.10, 1.9);
  TH('被子', -4.40, Y + .70, -0.90, '被子叠成了豆腐块。',
     'The quilt is folded into a neat block.',
     '被子 quilt. 叠被子 — folding it is the first thing you do in the morning.',
     -3.00, -1.20, 1.9);

  HomeF7.built = true;
  return HomeF7;
};

// ---------------------------------------------------------------------------------------------
// TWO THINGS FOR WHOEVER OWNS js/world.js, kept here rather than in a report that will be lost.
//
// 1. THE SHELL BUILDS NOTHING ABOVE DECK 2. `buildShell` pours its slab, ceiling, four walls and
//    trim for deck 0 and deck 2 only, and `buildShafts` / the call-panel loop both run
//    `for (const f of [0, 2])`. So on decks 3..12 there is no floor, no ceiling, no perimeter,
//    no lift landing and no call button — which is why this file builds all of them. That is
//    fine for one floor and wrong for ten: every floor builder is now writing the same landing
//    from scratch, and the twelve of them will not agree. The generalisation TOWER.md asks for
//    ("Generates one landing per deck in buildShell") is still outstanding.
//
//    The lift landing built here — surround, leaves, indicator, call panel — stands 20 mm proud
//    of the planes `landing()` uses downstairs, so when the shell does start generating them the
//    two will not z-fight. Delete `shafts()` and the call panel above at that point.
//
// 2. `goFloor(n)` STILL COLLAPSES TO TWO STOPS. js/world.js line 467 is
//
//        const to = n === 0 ? 0 : 2;
//
//    so pressing 七 in the car's floor panel sends it to deck 2. `DECK`, `ZONE`, `setFloor`,
//    `deckDecals` and `roomAt` were all generalised in Wave 0 and this one was not, so deck 7
//    is reachable by `World.setFloor(7)` and by nothing the player can press. `rideFloor` and
//    `RIDE_T` (documented as "seconds between the two decks") need the same pass.
