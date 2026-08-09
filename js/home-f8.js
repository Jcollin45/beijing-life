// F8 — 厨师家, deck 8, y 21.70. A chef's flat, and the landing outside it.
//
// Registered into FlatFit (declared at the top of js/world.js); DECK_OF maps 'f8' to deck 8, so
// `A.y0` is 21.70 here and EVERY height in this file is written as `Y + h`. See TOWER.md for the
// deck contract and the shared brief for the footprint. Nothing below reads a literal deck height.
//
// WHAT THE SHELL DOES NOT GIVE THIS DECK. `buildShell`/`buildShafts` in js/world.js still run
// `for (const f of [0, 2])`: on deck 8 there is no floor, no ceiling, no perimeter wall, no shaft
// and no lift landing. So this file pours all of it. Every piece of that is marked `--- shell ---`
// and is the first thing to delete when the Surgeon generalises `buildShell` past two decks.
// The landing is deliberately built 20 mm in FRONT of the shaft plane the shell would use, so if
// both ever exist they overlap rather than z-fight — the same trick js/home-corridor.js used on
// the second shaft's face, and why it is a trick and not a fix is written up in the report.
//
// The plan. One partition on each axis, three rooms and a landing:
//
//        x -6.0                     0.4                        6.0
//   z 3.2 +--------------------------+-------+------------------+   <- wall to the corridor
//         |        厨房 KITCHEN      | (opng)|  客厅 + 玄关     |      front door at x 3.90
//   z 0.2 +-------(opng)-------------+-------+------(opng)------+
//         |                                                     |
//         |   里屋 — 生活阳台 west, the bed east (all plain)     |
//   z-5.0 +-----------------------------------------------------+   <- glazed, the city beyond
//
// The kitchen gets the whole west end of the north half and every good material in the file; the
// rest of the flat is deliberately thin, because that is where the money went.
const HomeF8 = { built: false };

FlatFit['f8'] = A => {
  if (!A || typeof A.box !== 'function') { console.warn('home-f8: toolkit A missing'); return HomeF8; }

  // ------------------------------------------------------------------ toolkit
  const box = A.box, cyl = A.cyl, ball = A.ball, wall = A.wall, flat = A.flat;
  const cap = A.cap || A.box, taper = A.taper || A.box;
  const ceiling = A.ceiling || ((x, y, z, w, d, cc, o) => flat(x, y, z, w, d, cc, o));
  const glyph = A.glyph || (() => []);
  const stop = A.stop || (() => null);
  const thing = A.th || (() => null);
  const light = A.light || (() => null);
  const shade = A.shade || (() => null);
  const glowP = A.glow || (() => null);
  const C = A.C, M = A.M, PI = Math.PI;

  // ------------------------------------------------------------------ the contract
  const Y = A.y0;                                   // 21.70 — the deck this room was called for
  const CR = A.CORR || { x0: -6, x1: 6, z0: 3.2, z1: 6.2, h: 2.60 };
  const FT = A.FLAT || { x0: -6, x1: 6, z0: -5.0, z1: 3.2, h: 2.60 };
  const LF = A.LIFT || { x0: 1.6, x1: 3.4, z0: 4.9, z1: 6.2 };
  const LB = A.LIFT_B || { x0: -0.4, x1: 1.4, z0: 4.9, z1: 6.2 };
  const X0 = CR.x0, X1 = CR.x1;                     // -6.0 .. 6.0, the whole building
  const ZS = FT.z0, ZM = CR.z0, ZN = CR.z1;         // -5.0 south, 3.2 the party wall, 6.2 north
  const H = CR.h, CY = Y + H;                       // 2.60 clear, and the ceiling plane
  const FL = Y + .018;                              // what a thing standing on the floor stands on
  const TRIM = .130;                                // skirting height, same as the shell's

  // My landing plane: 20 mm proud of the shaft, see the note at the top.
  const SZ = LF.z0 - .020;
  // Front door — the chef's, 806. Same x as the shell's on deck 2 so the tower lines up.
  const FX = 3.90, FW = 1.00, FTOP = 2.05;
  // The two partitions and their openings.
  const PX = 0.40, PT = .10;                        // the x = 0.40 wall, 100 mm thick
  const PZ = 0.20;                                  // the z = 0.20 wall
  const KLZ0 = 1.50, KLZ1 = 2.70;                   // 厨房 <-> 客厅
  const KSX0 = -4.90, KSX1 = -3.50;                 // 厨房 <-> 里屋
  const LSX0 = 3.00, LSX1 = 4.40;                   // 客厅 <-> 里屋
  const OTOP = 2.05;                                // head height of an internal opening

  // ------------------------------------------------------------------ palette
  // Three families and no more: painted plaster for the shared parts, a whole scale of stainless
  // for the kitchen, and the browns — quarry tile, seasoned iron, soy, wood — that a kitchen in
  // use goes. Grease is a colour here, not a texture: warmer, darker and glossier than the tile
  // it sits on, which is the only way a splashback reads as one that has been cooked at.
  const c = {
    wall:   C('#cdc5b2'), wallK: C('#bdb6a1'), ceil: C('#e9e4d8'), ceilK: C('#ded6c4'),
    dado:   C('#9aa294'), dadoT: C('#7c8377'), trim: C('#8d8578'), skirt: C('#6f5a45'),
    steel:  C('#a2aab0'), steelM: C('#8b939a'), steelD: C('#6b737a'), steelX: C('#4d545a'),
    chrome: C('#c2c9ce'), alu:    C('#a9b0b5'), mesh:  C('#43484d'),
    tileW:  C('#b3bab0'), tileC:  C('#a8afa6'), grout: C('#83867e'),
    grease: C('#8a7a62'), greaseD: C('#6e6149'), soot: C('#4c453a'),
    quarry: C('#8f5c46'), quarryD: C('#6d4433'), cementF: C('#9a978d'),
    iron:   C('#332f2b'), ironL: C('#4b453d'), season: C('#5d4227'),
    flame:  C('#5aa8e6'), flameC: C('#bfe6fb'), ember: C('#ff9d42'),
    wood:   C('#a8845a'), woodD: C('#6f5334'), woodL: C('#c4a273'), bamboo: C('#c9ac72'),
    block:  C('#a8834e'), blockD: C('#83653a'),
    red:    C('#ae2b1f'), redD: C('#7c1d14'), gold: C('#e2b660'), ink: C('#241c16'),
    paper:  C('#eee8d9'), white: C('#f1eee6'), grey: C('#7d848a'), warm: C('#f7f0da'),
    dead:   C('#b9b6ad'), green: C('#1e7a45'), greenL: C('#4ec489'),
    soy:    C('#2a1c14'), soyL: C('#4a3220'), vin: C('#6b4426'), wine: C('#2f5a3a'),
    oyster: C('#8b6a3c'), bean: C('#8e3126'), sesame: C('#c58f2c'),
    leaf:   C('#4f8244'), leafD: C('#39662f'), cabbage: C('#e2e6c8'), chilli: C('#a92a1c'),
    pork:   C('#7d3a2c'), porkF: C('#d9c6a6'), egg: C('#e8d4ae'),
    glass:  C('#cfdde4'), sky: C('#b6cee1'), rubber: C('#3a3f42'), navy: C('#2c3f57'),
    plastic: C('#3f6f96'), crate: C('#2f6d4a'), crateR: C('#a8402f'),
    jar:    C('#5c4230'), jarL: C('#7a5a3e'), cloth: C('#e6e3d8'), denim: C('#41556d'),
  };
  const MT = {
    plaster: { mode: 4, mat: 'plaster', matScale: .62, matAmt: .20, nrmAmt: .26 },
    tile:    { mode: 0, mat: 'tile', matScale: .19, matAmt: .36, nrmAmt: .34 },
    tileF:   { mode: 0, mat: 'tile', matScale: .34, matAmt: .28, nrmAmt: .30 },
    metal:   { mode: 0, mat: 'metal', matScale: .48, matAmt: .18, nrmAmt: .24 },
    conc:    { mode: 0, mat: 'concrete', matScale: .85, matAmt: .22, nrmAmt: .28 },
    slab:    { mode: 9, mat: 'paving', matScale: .70, matAmt: .26, nrmAmt: .30 },
    // 391 — ART.md's upholstery row at FLAT_PALETTE's measured .34 repeat. Every sofa, bed and
    // curtain on this floor was flat colour before this.
    cloth:   { mode: 7, mat: 'fabric', matScale: .34, matAmt: .28, nrmAmt: .48 },
  };
  const G = (x, y, z, yaw, text, o) => glyph(x, y, z, yaw, text, { color: c.ink, ...o });
  const TH = (hz, x, y, z, zh, en, note, fx, fz, reach = 1.7, tag) =>
    thing(hz, x, y, z, zh, en, note, { focus: [fx, fz], reach, tag: tag || hz });

  // ==================================================================== --- shell --- the deck
  //
  // One slab under the whole footprint first, so there is never a hole whatever a room does with
  // its own finish, then each room's floor 12 mm over it. The finishes do not overlap each other
  // in xz, so none of them shares a plane with another; all of them clear the slab by 12 mm.
  flat(0, Y + .004, (ZS + ZN) / 2, X1 - X0, ZN - ZS, C('#8c857a'), { gloss: .22, ...MT.slab });

  // 走廊 — the same speckled slab every landing in this building has.
  flat(0, Y + .016, (ZM + ZN) / 2, X1 - X0, ZN - ZM, C('#8a8378'), { gloss: .34, ...MT.slab });
  // 厨房 — quarry tile, red-brown, laid small. The strip in front of the range is darker and
  // glossier than the rest of it, because twenty years of oil is a finish.
  flat((X0 + PX) / 2, Y + .016, (PZ + ZM) / 2, PX - X0, ZM - PZ, c.quarry, { gloss: .30, ...MT.tile });
  flat(-3.60, Y + .028, 1.95, 4.60, 1.30, c.quarryD, { gloss: .48, ...MT.tile });
  // 客厅 — the cheap floating boards the flat was handed over with.
  flat((PX + X1) / 2, Y + .016, (PZ + ZM) / 2, X1 - PX, ZM - PZ, C('#8b653f'),
       { mode: 3, gloss: .24, mat: 'wood', matScale: 1.10, matAmt: .28, nrmAmt: .32 });
  // 里屋 — bare screed at the balcony end, boards at the bed end. Two quads, no overlap.
  flat((X0 + 0.70) / 2, Y + .016, (ZS + PZ) / 2, 0.70 - X0, PZ - ZS, c.cementF,
       { gloss: .18, ...MT.conc });
  flat((0.70 + X1) / 2, Y + .016, (ZS + PZ) / 2, X1 - 0.70, PZ - ZS, C('#8b653f'),
       { mode: 3, gloss: .22, mat: 'wood', matScale: 1.10, matAmt: .28, nrmAmt: .32 });

  // Ceilings, one per space so the kitchen can be its own grubbier colour.
  ceiling(0, CY, (ZM + ZN) / 2, X1 - X0, ZN - ZM, c.ceil, { gloss: .08, glow: .02 });
  ceiling((X0 + PX) / 2, CY, (PZ + ZM) / 2, PX - X0, ZM - PZ, c.ceilK, { gloss: .10, glow: .02 });
  ceiling((PX + X1) / 2, CY, (PZ + ZM) / 2, X1 - PX, ZM - PZ, c.ceil, { gloss: .08, glow: .02 });
  ceiling(0, CY, (ZS + PZ) / 2, X1 - X0, PZ - ZS, c.ceil, { gloss: .08, glow: .02 });

  // The building's own four walls. Single-sided: each faces the only side anybody stands on.
  const PL = { ...MT.plaster };
  wall(0, Y + H / 2, ZN, X1 - X0, H, PI, c.wall, PL);                       // north, faces -z
  for (const s of [-1, 1]) {                                                // west and east
    wall(s * 6.0, Y + H / 2, (ZM + ZN) / 2, ZN - ZM, H, -s * PI / 2, c.wall, PL);
    wall(s * 6.0, Y + H / 2, (PZ + ZM) / 2, ZM - PZ, H, -s * PI / 2, s < 0 ? c.wallK : c.wall, PL);
    wall(s * 6.0, Y + H / 2, (ZS + PZ) / 2, PZ - ZS, H, -s * PI / 2, c.wall, PL);
  }
  // South. Left open where the balcony glazing and the bed window go; those close it.
  for (const [a, b] of [[X0, -5.70], [0.70, 2.90], [5.20, X1]])
    wall((a + b) / 2, Y + H / 2, ZS, b - a, H, 0, c.wall, PL);
  wall(-2.50, Y + (2.24 + H) / 2, ZS, 6.40, H - 2.24, 0, c.wall, PL);       // over the balcony run
  wall(4.05, Y + (2.06 + H) / 2, ZS, 2.30, H - 2.06, 0, c.wall, PL);        // over the bed window
  wall(-2.50, Y + .16, ZS, 6.40, .32, 0, c.wall, PL);                       // balcony upstand
  wall(4.05, Y + .45, ZS, 2.30, .90, 0, c.wall, PL);                        // under the bed window

  // The party wall between the flat and the landing, and the hole for 806 in it. Two quads on one
  // plane facing opposite ways is the shell's own convention here and is safe — one of them is
  // always back-facing — but two facing the SAME way never is.
  for (const [a, b] of [[X0, FX - FW / 2], [FX + FW / 2, X1]]) {
    wall((a + b) / 2, Y + H / 2, ZM, b - a, H, PI, c.wall, PL);             // seen from the flat
    wall((a + b) / 2, Y + H / 2, ZM, b - a, H, 0, C('#c9bda8'), PL);        // seen from the landing
  }
  wall(FX, Y + (FTOP + H) / 2, ZM, FW, H - FTOP, PI, c.wall, PL);
  wall(FX, Y + (FTOP + H) / 2, ZM, FW, H - FTOP, 0, C('#c9bda8'), PL);
  // The reveal of that hole — jambs and a head, so the doorway has thickness instead of being a
  // slot cut in a sheet of paper.
  for (const s of [-1, 1])
    box(FX + s * (FW / 2 + .045), Y + FTOP / 2, ZM, .09, FTOP, .16, C('#bfb4a0'),
        { hard: true, gloss: .12, ...MT.plaster });
  box(FX, Y + FTOP + .045, ZM, FW + .18, .09, .16, C('#bfb4a0'),
      { hard: true, gloss: .12, ...MT.plaster });

  // Skirting on everything the eye follows down to the floor.
  const skirt = (x, z, w, d) => box(x, Y + .065, z, w, TRIM, d, c.skirt, { hard: true, gloss: .20 });
  for (const [a, b] of [[X0, FX - FW / 2], [FX + FW / 2, X1]]) {
    skirt((a + b) / 2, ZM - .045, b - a, .065);
    skirt((a + b) / 2, ZM + .045, b - a, .065);
  }
  skirt(0, ZN - .045, X1 - X0, .065);
  skirt((0.70 + X1) / 2, ZS + .045, X1 - 0.70, .065);
  for (const s of [-1, 1]) {
    skirt(s * (6.0 - .045), (ZM + ZN) / 2, .065, ZN - ZM);
    skirt(s * (6.0 - .045), (PZ + ZM) / 2, .065, ZM - PZ);
    skirt(s * (6.0 - .045), (ZS + PZ) / 2, .065, PZ - ZS);
  }

  // ---- the two partitions, built as boxes rather than pairs of quads. A 100 mm box is solid from
  // every side, so no opening reveal can ever be looked through from the wrong one.
  const part = (x, y, z, w, h, d) => box(x, y, z, w, h, d, c.wall,
                                         { hard: true, gloss: .12, ...MT.plaster });
  // x = 0.40, from the z = 0.20 wall to the party wall, with the 厨房 <-> 客厅 opening in it
  part(PX, Y + H / 2, (PZ + KLZ0) / 2, PT, H, KLZ0 - PZ);
  part(PX, Y + H / 2, (KLZ1 + ZM) / 2, PT, H, ZM - KLZ1);
  part(PX, Y + (OTOP + H) / 2, (KLZ0 + KLZ1) / 2, PT, H - OTOP, KLZ1 - KLZ0);
  // z = 0.20, the whole width, with the two openings into 里屋
  for (const [a, b] of [[X0, KSX0], [KSX1, LSX0], [LSX1, X1]])
    part((a + b) / 2, Y + H / 2, PZ, b - a, H, PT);
  for (const [a, b] of [[KSX0, KSX1], [LSX0, LSX1]])
    part((a + b) / 2, Y + (OTOP + H) / 2, PZ, b - a, H - OTOP, PT);
  // Skirting along both faces of both partitions, in the same runs.
  for (const [a, b] of [[PZ, KLZ0], [KLZ1, ZM]]) for (const s of [-1, 1])
    skirt(PX + s * (PT / 2 + .032), (a + b) / 2, .064, b - a);
  for (const [a, b] of [[X0, KSX0], [KSX1, LSX0], [LSX1, X1]]) for (const s of [-1, 1])
    skirt((a + b) / 2, PZ + s * (PT / 2 + .032), b - a, .064);
  // A timber lining round each opening, which is what stops a doorway reading as a sawn hole.
  const cased = (axis, at, a, b) => {
    for (const e of [a, b])
      axis === 'x' ? box(at, Y + OTOP / 2, e, PT + .05, OTOP, .045, c.woodD, { hard: true, gloss: .22 })
                   : box(e, Y + OTOP / 2, at, .045, OTOP, PT + .05, c.woodD, { hard: true, gloss: .22 });
    axis === 'x' ? box(at, Y + OTOP + .022, (a + b) / 2, PT + .05, .045, b - a + .09, c.woodD,
                       { hard: true, gloss: .22 })
                 : box((a + b) / 2, Y + OTOP + .022, at, b - a + .09, .045, PT + .05, c.woodD,
                       { hard: true, gloss: .22 });
  };
  cased('x', PX, KLZ0, KLZ1);
  cased('z', PZ, KSX0, KSX1);
  cased('z', PZ, LSX0, LSX1);

  // ==================================================================== --- shell --- the shafts
  //
  // The shared shell now owns the shaft boxes, doors and moving opening on every deck. Keep this
  // older full landing only as a fallback; duplicating the walls on the shell's exact planes makes
  // them flicker, and its static collider used to seal the working lift shut on this floor.
  if (!A.shellLanding) {
    for (const sh of [LF, LB]) for (const [at, io] of [[sh.x0, 1], [sh.x1, -1]]) {
      wall(at, Y + H / 2, (sh.z0 + sh.z1) / 2, sh.z1 - sh.z0, H, io * PI / 2, C('#b8ae9c'), PL);
      wall(at, Y + H / 2, (sh.z0 + sh.z1) / 2, sh.z1 - sh.z0, H, -io * PI / 2, C('#a89e8c'), PL);
    }
    // and the back of both shafts, so the eye never runs out of the building through one
    for (const sh of [LF, LB])
      wall((sh.x0 + sh.x1) / 2, Y + H / 2, sh.z1, sh.x1 - sh.x0, H, PI, C('#7c756a'), PL);
    // The blank shaft, LIFT_B: on a residential floor it is a wall with a dead door position on it.
    wall((LB.x0 + LB.x1) / 2, Y + H / 2, SZ, LB.x1 - LB.x0, H, PI, c.wall, PL);
    box((LB.x0 + LB.x1) / 2, Y + 1.05, SZ - .022, 1.02, 2.06, .028, C('#c6bfae'),
        { hard: true, gloss: .14 });
  }
  // This taped notice is floor dressing, not landing hardware, and belongs on either version.
  box((LB.x0 + LB.x1) / 2, Y + 1.66, SZ - .042, .46, .32, .020, c.paper,
      { hard: true, gloss: .05, ry: .025 });
  G((LB.x0 + LB.x1) / 2, Y + 1.745, SZ - .056, PI, '此梯停用', { size: .052, gap: .010, color: c.redD });
  G((LB.x0 + LB.x1) / 2, Y + 1.645, SZ - .056, PI, '请乘另一部', { size: .042, gap: .008 });
  G((LB.x0 + LB.x1) / 2, Y + 1.555, SZ - .056, PI, '物业管理处', { size: .034, gap: .007, color: c.grey });

  // The working shaft's landing: jambs, surround, two shut leaves, and the indicator reading 八.
  // The shell now builds a real landing on every deck — doors, surround, indicator, call panel,
  // moving leaves and an opening collider. This stand-in stands down rather than double-building.
  if (!A.shellLanding) (function landing() {
    const cx = (LF.x0 + LF.x1) / 2, w = 0.80, dh = 2.10, hw = w / 2;
    box(cx, Y + (dh + H) / 2, SZ + .06, w + 1.20, H - dh, .12, c.wall,
        { hard: true, gloss: .12, ...MT.plaster });
    for (const s of [-1, 1])
      box(cx + s * (hw + .30), Y + dh / 2, SZ + .06, .60, dh, .12, c.wall,
          { hard: true, gloss: .12, ...MT.plaster });
    for (const s of [-1, 1])
      box(cx + s * (hw + .07), Y + dh / 2 + .05, SZ - .01, .14, dh + .10, .05, C('#7e868c'),
          { hard: true, gloss: .62, tag: '电梯', ...MT.metal });
    box(cx, Y + dh + .075, SZ - .01, w + .42, .14, .05, C('#7e868c'),
        { hard: true, gloss: .62, tag: '电梯', ...MT.metal });
    for (const s of [-1, 1]) {
      box(cx + s * w / 4, Y + dh / 2, SZ + .13, w / 2, dh, .045, C('#7e868c'),
          { hard: true, gloss: .34, tag: '电梯', ...MT.metal });
      box(cx + s * w / 4, Y + dh / 2, SZ + .105, w / 2 - .05, dh - .10, .012, C('#8d959b'),
          { hard: true, gloss: .34, tag: '电梯' });
    }
    box(cx, Y + dh + .34, SZ - .015, .52, .30, .06, C('#3d4348'), { hard: true, gloss: .34, tag: '电梯' });
    G(cx, Y + dh + .34, SZ - .05, PI, '八', { size: .17, color: C('#ff9a4d'), mode: 1, glow: .16 });
    // the call panel, on the pier east of the doors
    const px = 3.72;
    box(px, Y + 1.12, SZ - .02, .13, .22, .04, C('#d9d4c8'), { hard: true, gloss: .34, tag: '电梯' });
    for (const [dy, ch] of [[.045, '▲'], [-.045, '▼']]) {
      box(px, Y + 1.12 + dy, SZ - .042, .055, .055, .012, C('#ffbe6a'),
          { hard: true, mode: 1, glow: .16, tag: '电梯' });
      G(px, Y + 1.12 + dy, SZ - .056, PI, ch, { size: .038, color: C('#4a3316'), gloss: .12 });
    }
  })();

  // ==================================================================== zones and colliders
  //
  // The walkable plan. `clampMove` inflates every one of these inward by the 0.30 m body radius
  // and keeps the body inside the union, so the partitions above need no collider of their own —
  // two rooms that only touch are already separated — and the four bridge rectangles are what
  // join them. Each bridge overlaps both neighbours' INNER rects by >= 0.10 m, which is the whole
  // reason a doorway is somewhere you walk through rather than a hole you look through.
  //
  //   厨房   inner  x -5.70 .. 0.10   z  0.50 .. 2.90
  //   客厅   inner  x  0.70 .. 5.70   z  0.50 .. 2.90
  //   里屋   inner  x -5.70 .. 5.70   z -4.70 ..-0.10
  //   走廊   inner  x -5.70 .. 5.70   z  3.50 .. 5.90
  A.zone({ id: 'f8k', x0: X0, x1: PX, z0: PZ, z1: ZM, light: [-2.60, CY - .30, 1.90], ceil: CY - .05 });
  A.zone({ id: 'f8l', x0: PX, x1: X1, z0: PZ, z1: ZM, light: [3.00, CY - .34, 1.60], ceil: CY - .05 });
  A.zone({ id: 'f8s', x0: X0, x1: X1, z0: ZS, z1: PZ, light: [-1.20, CY - .34, -2.20], ceil: CY - .05 });
  A.zone({ id: 'f8c', x0: X0, x1: X1, z0: ZM, z1: ZN, light: [0, CY - .34, 4.10], ceil: CY - .05 });
  A.zone({ id: 'f8kl', x0: -0.30, x1: 1.10, z0: KLZ0, z1: KLZ1, light: [0.40, CY - .34, 2.10] });
  A.zone({ id: 'f8ks', x0: KSX0, x1: KSX1, z0: -0.50, z1: 0.90, light: [-4.20, CY - .34, 0.20] });
  A.zone({ id: 'f8ls', x0: LSX0, x1: LSX1, z0: -0.50, z1: 0.90, light: [3.70, CY - .34, 0.20] });
  A.zone({ id: 'f8gap', x0: 3.40, x1: 4.40, z0: 2.50, z1: 3.90, light: [FX, CY - .34, 3.30] });
  // The room box `R.setRoom` measures openness against. Without this the shell hands the shader
  // deck 2's 5.70 m box, every point on this deck is above it, `openness` decides the whole floor
  // is jammed against a ceiling and the place comes out grey. One call, and it is not optional.
  A.deckH(CY);

  // The fallback needs its old static back-bay collider. The live shell supplies per-shaft piers
  // and a door stop that opens; this combined span cannot be cleaned up per shaft and sealed F8.
  if (!A.shellLanding) stop(LB.x0 - .10, LF.x1 + .10, SZ, ZN + .05);

  // ==================================================================== 走廊 the landing
  //
  // Same institutional kit as every other floor of this block — dado, sprinkler main, four
  // bulkheads with one tube dead, 安全出口, six 防盗门 — and one thing that is only true here:
  // everything stacked outside 806 is food. A chef's landing is a delivery bay.

  // --- the dado. The band of darker paint at hand height is the single thing that stops a
  // painted corridor reading as a white box. Boxes standing proud of the wall, never a second
  // quad in the wall plane, and in runs with the doorways left out.
  const DY0 = Y + TRIM, DH = 1.12 - TRIM, DYC = DY0 + DH / 2;
  function dado(axis, plane, sgn, runs) {
    const p1 = plane + sgn * .016, p2 = plane + sgn * .022;
    for (const [a0, a1] of runs) {
      const m = (a0 + a1) / 2, L = a1 - a0;
      if (L <= .002) continue;
      const put = (yy, hh, dd, ww, cl, gl) => axis === 'x'
        ? box(m, yy, dd, L, hh, ww, cl, { hard: true, gloss: gl })
        : box(dd, yy, m, ww, hh, L, cl, { hard: true, gloss: gl });
      put(DYC, DH, p1, .03, c.dado, .18);
      put(DY0 + DH + .015, .028, p2, .04, c.dadoT, .22);
    }
  }
  dado('x', ZM, 1, [[X0, FX - FW / 2 - .09], [FX + FW / 2 + .09, X1]]);   // the flat's wall
  dado('x', ZN, -1, [[X0, X1]]);                                          // the far wall
  dado('x', SZ, -1, [[LB.x0, LB.x1]]);                                    // the dead shaft's face
  const WZ = 4.30, WW = 1.40, WSILL = .95, WTOP = 2.15;                   // the west window
  const STZ = 4.30, STW = .95, STOP = 2.06;                               // the fire stair, east
  dado('z', X0, 1, [[ZM, WZ - WW / 2], [WZ + WW / 2, ZN]]);
  dado('z', X1, -1, [[ZM, STZ - STW / 2], [STZ + STW / 2, ZN]]);

  // --- ceiling services. The red sprinkler main hugs the flat's wall, which is the only line
  // down this landing that is clear for all twelve metres. Four lengths and not one 11.6 m
  // cylinder: a barrel scaled three hundred to one shades like a mirror, not like a pipe.
  for (let i = 0; i < 4; i++)
    cyl(X0 + 1.5 + i * 3.0, CY - .17, 3.42, .036, 3.0, c.redD, { rz: PI / 2, gloss: .34, ...MT.metal });
  for (let i = 0; i < 5; i++) {
    const px = X0 + 1.3 + i * 2.4;
    cyl(px, CY - .225, 3.42, .016, .07, C('#8a6828'), { gloss: .5 });
    ball(px, CY - .262, 3.42, .026, .020, .026, C('#b98c3e'), { gloss: .55 });
  }
  box(0, CY - .045, 3.32, X1 - X0, .05, .07, c.white, { hard: true, gloss: .12 });

  // --- the fittings. Four surface bulkheads down a twelve-metre run, one of them dead, which is
  // the true state of every landing of this kind. Box tops stop 45 mm under the ceiling quad so
  // the two never share a plane.
  for (const [px, pz, alive] of [[-4.40, 4.20, true], [-1.40, 4.20, false],
                                 [1.60, 4.20, true], [4.60, 4.20, true]]) {
    box(px, CY - .045, pz, .46, .07, .16, c.steelD, { hard: true, gloss: .30 });
    box(px, CY - .095, pz, .40, .05, .12, alive ? c.warm : c.dead,
        { hard: true, mode: 1, glow: alive ? .13 : 0, gloss: .10 });
    if (alive) light(px, CY - .19, pz, C('#dfe9ef'), .48, 3.30);
  }

  // --- 安全出口. Flat on the wall, never slung across a 3 m landing where it can only ever be
  // read edge-on. The arrow points at the stair in world space — and a glyph reads left to right
  // in the READER's frame, so "east" is drawn as an arrow one way on one wall and the other way
  // on the other. Backwards, this sends somebody to the window in a fire.
  function exitSign(x, z, sgn, arrow) {
    const yaw = sgn > 0 ? 0 : PI, f = d => z + sgn * d, w = arrow ? .46 : .38, y = Y + 2.26;
    box(x, y, f(.028), w, .155, .055, c.green, { hard: true, gloss: .26, tag: '安全出口' });
    box(x, y, f(.058), w - .035, .125, .006, c.greenL, { hard: true, mode: 1, glow: .14, tag: '安全出口' });
    G(x - (arrow ? .062 : 0), y, f(.058), yaw, '安全出口',
      { size: arrow ? .072 : .082, gap: .010, color: c.white, mode: 1, glow: .16 });
    if (arrow) G(x + .175, y, f(.058), yaw, sgn > 0 ? '→' : '←',
                 { size: .095, color: c.white, mode: 1, glow: .16 });
  }
  exitSign(-2.60, ZM, 1, true);
  exitSign(-5.10, ZN, -1, true);
  exitSign(1.20, ZM, 1, true);

  // ==================================================================== the six doors
  //
  // 801..805 across the far wall, and 806 — the chef's — in the flat's wall, the only one with a
  // real hole behind it. `sgn` is the way a leaf faces into the landing; `hinge` -1 puts the
  // hinges on the -x jamb. Frame 90 mm off the wall, leaf 60, so nothing is ever flush: a
  // flush-mounted door in this renderer flickers as horizontal stripes.
  function frontDoor(cx, zw, sgn, num, o = {}) {
    const yaw = sgn > 0 ? 0 : PI;
    const W = o.w || 1.00, HT = o.top || 2.06, LW = W - .05, LH = HT - .04;
    const F = d => zw + sgn * d;
    const hinge = o.hinge === undefined ? -1 : o.hinge;
    const body = o.body || C('#6c3a2b'), panel = o.panel || C('#7d4634'), dk = C('#4b2820');
    const jTop = o.headTo === undefined ? Y + HT + .07 : o.headTo;
    for (const s of [-1, 1])
      box(cx + s * (W / 2 + .035), (Y + jTop) / 2, F(.045), .07, jTop - Y, .09, dk,
          { hard: true, gloss: .26, tag: o.tag });
    if (o.headTo === undefined)
      box(cx, Y + HT + .035, F(.045), W + .14, .07, .09, dk, { hard: true, gloss: .26, tag: o.tag });
    // `open` is 806: the leaf is hooked back inside the flat and built there, so this must not
    // hang a second one across the hole. Without this there were two, and the shut one was in
    // front — which made the one door on this floor that opens look exactly like the five that
    // do not.
    if (o.open) {
      box(cx - W / 2 - .10, Y + 1.84, F(.030), .26, .13, .022, c.steel,
          { hard: true, gloss: .40, tag: o.tag });
      G(cx - W / 2 - .10, Y + 1.84, F(.042), yaw, num, { size: .066, gap: .010, gloss: .2 });
      flat(cx, Y + .024, F(.32), .64, .40, o.mat || c.rubber, { mode: 7, gloss: .04 });
      shade(cx, F(.32), .72, .48, .26);
      return null;
    }
    const leaf = box(cx, Y + LH / 2, F(.030), LW, LH, .06, body,
                     { hard: true, gloss: .24, tag: o.tag });
    for (const [py, ph] of [[LH * .70, LH * .40], [LH * .265, LH * .30]]) {
      box(cx, Y + py, F(.070), LW - .16, ph, .020, panel, { hard: true, gloss: .22, tag: o.tag });
      for (const s of [-1, 1])
        box(cx, Y + py + s * ph / 2, F(.082), LW - .16, .012, .012, dk,
            { hard: true, gloss: .3, tag: o.tag });
    }
    const hx = cx - hinge * (LW / 2 - .13);
    box(hx, Y + 1.03, F(.075), .10, .24, .03, c.steelD, { hard: true, gloss: .46, tag: o.tag });
    cyl(hx, Y + 1.03, F(.115), .016, .07, c.steel, { rx: PI / 2, gloss: .5, tag: o.tag });
    box(hx - hinge * .085, Y + 1.03, F(.148), .19, .028, .028, c.steel,
        { hard: true, gloss: .5, tag: o.tag });
    cyl(hx, Y + .88, F(.078), .020, .012, C('#8a6828'), { rx: PI / 2, gloss: .55, tag: o.tag });
    cyl(cx, Y + 1.56, F(.078), .012, .030, C('#b98c3e'), { rx: PI / 2, gloss: .6, tag: o.tag });
    for (const hy of [.36, 1.06, 1.76])
      cyl(cx + hinge * (LW / 2 - .012), Y + hy, F(.062), .014, .10, c.steelD,
          { gloss: .45, tag: o.tag });
    box(cx, Y + 1.84, F(.072), .30, .13, .024, c.steel, { hard: true, gloss: .40, tag: o.tag });
    G(cx, Y + 1.84, F(.084), yaw, num, { size: .073, gap: .012, gloss: .2 });
    flat(cx, Y + .024, F(.32), .64, .40, o.mat || c.rubber, { mode: 7, gloss: .04 });
    shade(cx, F(.32), .72, .48, .26);
    return leaf;
  }
  function couplets(cx, zw, sgn, up, down, top) {
    const yaw = sgn > 0 ? 0 : PI, F = d => zw + sgn * d;
    for (const [s, text] of [[-1, up], [1, down]]) {
      box(cx + s * .60, Y + 1.48, F(.020), .12, 1.04, .04, c.red, { hard: true, gloss: .10, tag: '春联' });
      G(cx + s * .60, Y + 1.48, F(.042), yaw, text,
        { size: .104, gap: .018, color: c.gold, vertical: true, gloss: .12, tag: '春联' });
    }
    box(cx, Y + 2.30, F(.020), .64, .15, .04, c.red, { hard: true, gloss: .10, tag: '春联' });
    G(cx, Y + 2.30, F(.042), yaw, top, { size: .096, gap: .020, color: c.gold, tag: '春联' });
  }
  function fuDiamond(cx, y, zw, sgn, s = .21) {
    const yaw = sgn > 0 ? 0 : PI;
    box(cx, Y + y, zw + sgn * .095, s, s, .018, c.red,
        { hard: true, gloss: .10, ry: sgn > 0 ? PI / 4 : -PI / 4 });
    G(cx, Y + y, zw + sgn * .108, yaw, '福', { size: s * .60, color: c.gold, gloss: .14 });
  }

  const N1 = -5.10, N2 = -3.30, N3 = -1.50, N4 = 4.15, N5 = 5.50;
  frontDoor(N1, ZN, -1, '801', { tag: '邻居', hinge: 1, mat: C('#4a4f52') });
  couplets(N1, ZN, -1, '天增岁月人增寿', '春满乾坤福满门', '万象更新');
  frontDoor(N2, ZN, -1, '802', { tag: '邻居', body: C('#7d4634'), panel: C('#6c3a2b'),
                                 mat: C('#7d3f37') });
  frontDoor(N3, ZN, -1, '803', { tag: '邻居', mat: c.rubber });
  fuDiamond(N3, 1.34, ZN, -1);
  frontDoor(N4, ZN, -1, '804', { tag: '邻居', hinge: 1, body: C('#4b2820'), panel: C('#6c3a2b'),
                                 mat: C('#3f4a3f') });
  frontDoor(N5, ZN, -1, '805', { tag: '邻居', mat: c.rubber });

  // --- 806, the chef's. Dropped onto the real opening, and standing open: the flat is hot from
  // one end of the day to the other and this door is propped back against the 玄关 wall for it.
  // What hangs in the opening instead is a 门帘, the strip curtain every kitchen doorway in the
  // country has, which reads as a closed door and is not one.
  frontDoor(FX, ZM, 1, '806', { tag: '门', mat: C('#6d3b34'), w: FW, top: FTOP,
                                headTo: Y + FTOP - .015, open: true });
  couplets(FX, ZM, 1, '厨中五味调和鼎', '席上八珍次第香', '以食为天');
  // 门槛石 — the stone threshold every flat here has across its doorway.
  box(FX, Y + .034, ZM + .07, FW + .05, .036, .19, C('#9b968b'), { hard: true, gloss: .40, ...MT.conc });
  box(FX, Y + .034, ZM - .07, FW + .05, .036, .19, C('#9b968b'), { hard: true, gloss: .40, ...MT.conc });

  // ==================================================================== what the landing stores
  //
  // Everything hugs a wall inside 450 mm so the middle of the run stays walkable, and the
  // colliders below are the only ones on this deck that are not the shafts.

  // --- 消火栓 the hose cabinet, and the extinguisher that never fits in it.
  const HX = -4.30, HZ = ZM + .11;
  box(HX, Y + 1.14, HZ, .70, 1.00, .22, c.red, { hard: true, gloss: .30, tag: '消防栓' });
  box(HX, Y + 1.14, HZ + .112, .60, .90, .010, c.redD, { hard: true, gloss: .34, tag: '消防栓' });
  box(HX - .01, Y + 1.20, HZ + .118, .40, .58, .008, C('#3d4a4e'), { hard: true, gloss: .62, alpha: .55 });
  cyl(HX - .01, Y + 1.20, HZ + .06, .17, .12, C('#8c1f18'), { rx: PI / 2, gloss: .18 });
  cyl(HX - .01, Y + 1.20, HZ + .09, .07, .07, c.redD, { rx: PI / 2, gloss: .3 });
  G(HX, Y + 1.76, HZ + .112, 0, '消火栓', { size: .115, gap: .022, color: c.white });
  G(HX, Y + .70, HZ + .112, 0, '火警119', { size: .058, gap: .012, color: c.gold });
  cyl(HX + .50, Y + .29, ZM + .18, .075, .48, c.red, { gloss: .34 });
  taper(HX + .50, Y + .57, ZM + .18, .15, .10, .15, c.red, { gloss: .34 });
  cyl(HX + .50, Y + .65, ZM + .18, .020, .09, c.steelD, { gloss: .5 });
  shade(HX + .50, ZM + .18, .22, .22, .30);

  // --- 电表箱 the meter bank, on the stretch of the flat's wall west of 806.
  const MX = 2.10, MZ = ZM + .06;
  box(MX, Y + 1.44, MZ, .46, .92, .12, c.steelD, { hard: true, gloss: .34, tag: '电表', ...MT.metal });
  box(MX, Y + 1.44, MZ + .065, .40, .84, .012, c.steelX, { hard: true, gloss: .30 });
  ['0806', '0812', '0803'].forEach((r, i) => {
    const my = 1.72 - i * .28;
    box(MX - .06, Y + my, MZ + .073, .20, .13, .008, C('#1c2226'), { hard: true, gloss: .55 });
    G(MX - .06, Y + my, MZ + .083, 0, r, { size: .048, gap: .008, color: C('#cfe3d6'), mode: 1, glow: .10 });
    cyl(MX + .13, Y + my, MZ + .073, .010, .010, C('#d84a3a'), { rz: PI / 2, mode: 1, glow: .18 });
  });
  G(MX, Y + 1.96, MZ + .066, 0, '电表箱', { size: .062, gap: .012, color: c.white });
  box(MX, Y + 2.30, MZ + .010, .09, .60, .05, c.white, { hard: true, gloss: .12 });

  // --- 通知. Photocopied, taped up crooked, and the best readable Chinese on the floor. On a
  // chef's landing the notice that matters is the one about the gas.
  const NX = 0.20, NZ = ZM + .012;
  box(NX, Y + 1.52, NZ, .34, .46, .024, c.paper, { hard: true, gloss: .05, ry: .02, tag: '通知' });
  G(NX, Y + 1.69, NZ + .014, 0, '通知', { size: .078, gap: .020 });
  box(NX, Y + 1.625, NZ + .014, .25, .006, .006, c.ink, { hard: true });
  G(NX, Y + 1.555, NZ + .014, 0, '周三上午停燃气', { size: .040, gap: .006 });
  G(NX, Y + 1.490, NZ + .014, 0, '八点到下午四点', { size: .040, gap: .006 });
  G(NX, Y + 1.400, NZ + .014, 0, '物业管理处', { size: .036, gap: .007, color: c.grey });
  for (const [sx, sy] of [[-.14, .21], [.14, .21], [-.14, -.21], [.14, -.21]])
    box(NX + sx, Y + 1.52 + sy, NZ + .016, .05, .022, .004, C('#d9d2bd'), { hard: true });
  box(NX - .42, Y + 1.46, NZ, .26, .20, .020, C('#dfd7c3'), { hard: true, gloss: .05, ry: -.05 });
  G(NX - .42, Y + 1.50, NZ + .012, 0, '电梯年检', { size: .046, gap: .009, color: c.grey });
  G(NX - .42, Y + 1.42, NZ + .012, 0, '暂停使用', { size: .040, gap: .008, color: c.grey });
  // 小广告 — stamped in red ink at hand height, scrubbed at once and never gone.
  G(-2.90, Y + 1.32, ZM + .024, 0, '开锁', { size: .062, gap: .010, color: C('#a8352a'), gloss: .05 });
  G(-2.90, Y + 1.24, ZM + .024, 0, '80261', { size: .040, gap: .006, color: C('#a8352a'), gloss: .05 });
  G(-0.90, Y + 1.28, ZM + .024, 0, '疏通下水道', { size: .050, gap: .008, color: C('#96463a'), gloss: .05 });
  G(-2.20, Y + 1.36, ZN - .024, PI, '搬家', { size: .058, gap: .010, color: C('#9c4034'), gloss: .05 });

  // --- 电动车, on charge off the meter bank. Half the block does this and the notices tell them
  // all not to. Seen side-on, so it is a flat thing 1.5 m along the wall and 0.5 m off it.
  (function ebike() {
    const bx = -1.20, bz = ZM + .34;
    for (const dx of [-.46, .46]) {
      cyl(bx + dx, Y + .27, bz, .245, .085, c.rubber, { rx: PI / 2, gloss: .18, tag: '电动车' });
      cyl(bx + dx, Y + .27, bz, .175, .090, C('#5a6064'), { rx: PI / 2, gloss: .34 });
    }
    box(bx, Y + .46, bz, .96, .30, .30, C('#20304a'), { gloss: .30, tag: '电动车' });
    box(bx + .12, Y + .66, bz, .52, .12, .30, C('#2c3f57'), { gloss: .26, tag: '电动车' });
    cap(bx + .28, Y + .78, bz, .16, .08, .13, C('#22262a'), { gloss: .16 });
    cyl(bx - .40, Y + .70, bz, .026, .74, c.steelD, { rz: .06, gloss: .45 });
    cyl(bx - .42, Y + 1.04, bz, .016, .48, c.steelD, { rx: PI / 2, gloss: .45 });
    box(bx - .46, Y + .92, bz, .18, .14, .16, C('#3a4b63'), { gloss: .28 });
    // the flex trailing back to the socket, which is the whole reason it is up here
    for (let i = 0; i < 7; i++)
      cyl(bx + .58 + i * .13, Y + .30 - Math.sin(i * .8) * .12, bz - .04 - i * .015, .009, .14,
          C('#22262a'), { rz: PI / 2 - .3 + Math.cos(i * .8) * .5, gloss: .28 });
    box(bx + 1.50, Y + .30, ZM + .09, .08, .12, .05, c.white, { hard: true, gloss: .2 });
    shade(bx, bz, 1.20, .46, .32);
  })();
  stop(-1.90, -0.40, ZM, ZM + .52);

  // --- outside 806: the delivery. Crates of vegetables, a water bottle, a 泡菜坛 that came up
  // in the lift and has not gone in yet, and the clogs he leaves at the door because they smell
  // of the restaurant. This is the whole tell for the floor, and it is on the landing so you
  // read it before the door is even open.
  (function chefsDoorstep() {
    const bx = FX - 1.22;
    for (const [i, cl] of [[0, c.crate], [1, c.crateR], [2, c.crate]]) {
      const yb = Y + .022 + i * .215;
      box(bx - i * .015, yb + .105, ZM + .27, .58, .21, .40, cl, { gloss: .26, ry: .04 - i * .05 });
      box(bx - i * .015, yb + .208, ZM + .27, .50, .012, .32, C('#1e1c19'),
          { hard: true, gloss: .10, ry: .04 - i * .05 });
    }
    // greens spilling out of the top crate
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399;
      cap(bx + Math.cos(a) * .17, Y + .70 + (i % 3) * .03, ZM + .27 + Math.sin(a) * .11,
          .038, .20, .038, i % 2 ? c.leaf : c.leafD, { ry: a, rz: Math.cos(a) * .5, gloss: .22 });
    }
    G(bx, Y + .35, ZM + .475, 0, '新鲜蔬菜', { size: .046, gap: .010, color: C('#e6efe2'), gloss: .05 });
    shade(bx, ZM + .27, .70, .48, .34);
    // the 泡菜坛, glazed brown, water seal round the lip
    const jx = FX + .86;
    taper(jx, Y + .17, ZM + .26, .34, .30, .34, c.jar, { gloss: .46 });
    taper(jx, Y + .40, ZM + .26, .30, .16, .30, c.jarL, { rz: PI, gloss: .48 });
    cyl(jx, Y + .49, ZM + .26, .17, .05, c.jar, { gloss: .5 });
    cyl(jx, Y + .53, ZM + .26, .13, .05, c.jarL, { gloss: .5 });
    shade(jx, ZM + .26, .42, .42, .32);
    // the blue 20 litre water bottle
    cyl(FX + 1.42, Y + .21, ZM + .24, .135, .38, C('#5fa8c6'), { gloss: .42, alpha: .88 });
    taper(FX + 1.42, Y + .46, ZM + .24, .26, .12, .26, C('#5fa8c6'), { gloss: .42, alpha: .88 });
    cyl(FX + 1.42, Y + .54, ZM + .24, .04, .05, C('#2d5f78'), { gloss: .4 });
    shade(FX + 1.42, ZM + .24, .32, .32, .30);
    // 木屐 — the wooden-soled clogs the kitchen wears, left outside
    for (const s of [-1, 1])
      cap(FX - .40 + s * .07, Y + .045, ZM + .60, .085, .07, .235, C('#d8d3c6'),
          { ry: s * .06, gloss: .12, tag: '鞋' });
    shade(FX - .40, ZM + .60, .38, .28, .22);
  })();
  stop(FX - 1.55, FX - 0.88, ZM, ZM + .50);
  stop(FX + 0.62, FX + 1.60, ZM, ZM + .46);

  // ==================================================================== the west window
  //
  // The perimeter wall may not be cut, so this is a shallow bay standing in front of it: the
  // sky at the back of the reveal, the skyline in front of that, the glazing in front of that.
  // Everything at x > -6.0, because anything behind a one-sided wall does not exist from in here.
  (function landingWindow() {
    const WX = X0 + .014;
    // 400 — the eighth floor's own opening: west gable, outward normal -x.
    if (A.setWin)
      A.setWin(WX, Y + (WSILL + WTOP) / 2, WZ, WW / 2, (WTOP - WSILL) / 2, [-1, 0, 0]);
    A.sky(box(WX, Y + (WSILL + WTOP) / 2, WZ, .012, WTOP - WSILL + .10, WW + .10, c.sky,
              { hard: true, mode: 1, glow: .035 }));
    let seed = 8080811;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const base = Y + WSILL + .06;
    for (const [layer, bx, tint, hmax] of [[0, WX + .012, '#93a7ba', .46], [1, WX + .026, '#63788c', .92]]) {
      let z = WZ - WW / 2 + .02;
      while (z < WZ + WW / 2 - .05) {
        const bw = .10 + rnd() * .17, bh = .16 + rnd() * hmax;
        A.city(layer, box(bx, base + bh / 2, z + bw / 2, .010, bh, bw * .95, C(tint),
                          { hard: true, mode: 1 }));
        if (layer === 1 && bh > .40)
          for (let ry = base + .10; ry < base + bh - .06; ry += .10)
            for (const q of [-.26, .04, .30]) if (rnd() > .45)
              A.city(2, box(bx + .008, ry, z + bw / 2 + q * bw, .006, .034, .022,
                            C(rnd() > .5 ? '#ffd691' : '#c2d6e4'), { hard: true, mode: 1, glow: .16 }));
        z += bw + .015 + rnd() * .05;
      }
    }
    // the reveal — four plaster returns, so it reads as a recess and not a poster
    for (const [ry, rz, rh, rw] of [[WSILL - .05, WZ, .10, WW + .20], [WTOP + .05, WZ, .10, WW + .20],
                                    [(WSILL + WTOP) / 2, WZ - WW / 2 - .05, WTOP - WSILL, .10],
                                    [(WSILL + WTOP) / 2, WZ + WW / 2 + .05, WTOP - WSILL, .10]])
      box(X0 + .058, Y + ry, rz, .11, rh, rw, c.wall, { hard: true, gloss: .10, ...MT.plaster });
    const wf = (y, z, h, w) => box(X0 + .108, Y + y, z, .05, h, w, c.alu,
                                   { hard: true, gloss: .40, tag: '窗户', ...MT.metal });
    wf(WSILL + .015, WZ, .06, WW + .06); wf(WTOP - .015, WZ, .06, WW + .06);
    wf((WSILL + WTOP) / 2, WZ - WW / 2 + .03, WTOP - WSILL, .06);
    wf((WSILL + WTOP) / 2, WZ + WW / 2 - .03, WTOP - WSILL, .06);
    wf((WSILL + WTOP) / 2, WZ, WTOP - WSILL, .05);
    // The pane last. Transparent props still write depth in this renderer, and one built before
    // the skyline deletes it.
    box(X0 + .086, Y + (WSILL + WTOP) / 2, WZ, .010, WTOP - WSILL - .06, WW - .06, c.glass,
        { hard: true, mode: 18, alpha: .13, gloss: .78, tag: '窗户' });
    box(X0 + .18, Y + WSILL - .045, WZ, .25, .05, WW + .22, c.white, { hard: true, gloss: .28, tag: '窗户' });
    // and what a landing sill always ends up holding
    cyl(X0 + .20, Y + WSILL + .06, WZ - .44, .075, .13, C('#9d6a4c'), { gloss: .18 });
    for (let i = 0; i < 6; i++)
      cap(X0 + .20 + (i % 2 - .5) * .05, Y + WSILL + .18, WZ - .44 + (i - 2.5) * .022,
          .015, .19, .015, i < 2 ? C('#7d7a4a') : c.leaf, { rz: (i - 2.5) * .15, gloss: .10 });
    cyl(X0 + .19, Y + WSILL + .045, WZ + .36, .032, .10, C('#3f6f4a'), { gloss: .45 });
    box(X0 + .15, Y + WTOP + .13, WZ, .19, .03, WW + .16, c.white, { hard: true, gloss: .18 });
  })();

  // ==================================================================== the fire stair, east
  //
  // Surface-mounted, and correctly so: this door never opens, so it wants no hole behind it.
  (function fireStair() {
    const sf = d => X1 - d;
    for (const s of [-1, 1])
      box(sf(.045), Y + (STOP + .07) / 2, STZ + s * (STW / 2 + .035), .09, STOP + .07, .07,
          c.steelD, { hard: true, gloss: .30, ...MT.metal });
    box(sf(.045), Y + STOP + .035, STZ, .09, .07, STW + .14, c.steelD,
        { hard: true, gloss: .30, ...MT.metal });
    box(sf(.030), Y + (STOP - .04) / 2, STZ, .06, STOP - .04, STW - .05, C('#9aa0a2'),
        { hard: true, gloss: .26, tag: '楼梯', ...MT.metal });
    box(sf(.062), Y + 1.34, STZ, .012, .70, STW - .17, C('#8b9294'), { hard: true, gloss: .24 });
    box(sf(.075), Y + 1.02, STZ - .30, .05, .05, .40, c.steelX, { hard: true, gloss: .5 });
    cyl(sf(.098), Y + 1.02, STZ - .30, .020, .09, c.steel, { rx: PI / 2, gloss: .55 });
    box(sf(.070), Y + STOP - .18, STZ + .22, .06, .05, .30, c.steelX, { hard: true, gloss: .45 });
    G(sf(.066), Y + 1.72, STZ, -PI / 2, '安全出口', { size: .085, gap: .016, color: c.green });
    G(sf(.066), Y + .62, STZ, -PI / 2, '禁止堆放杂物', { size: .056, gap: .012, color: c.redD });
    G(sf(.066), Y + .50, STZ, -PI / 2, '保持通道畅通', { size: .050, gap: .012 });
    box(X1 - .035, Y + STOP + .19, STZ, .06, .155, .40, c.green, { hard: true, gloss: .26, tag: '安全出口' });
    box(X1 - .068, Y + STOP + .19, STZ, .006, .125, .365, c.greenL,
        { hard: true, mode: 1, glow: .14, tag: '安全出口' });
    G(X1 - .068, Y + STOP + .19, STZ, -PI / 2, '安全出口',
      { size: .086, gap: .012, color: c.white, mode: 1, glow: .16 });
  })();

  // ==================================================================== 厨房 THE KITCHEN
  //
  // x -6.0 .. 0.4, z 0.2 .. 3.2. Everything good in this file is in this room, and the room is
  // laid out the way a working kitchen is rather than the way a showroom is: one hot line along
  // the north wall with the extractor over it, the sink under the only window, and the wall of
  // bottles within one step of the hob, because a 炒 takes forty seconds and you do not walk
  // during it.
  //
  //   north wall  z 2.50..3.20   炒炉 wok range | 燃气灶 hob + 蒸锅 + 高压锅 | 案板 prep
  //   west wall   x -6.00..-5.35 sink under the window
  //   south wall  z 0.20..0.62   the bottle shelves, the rice cooker, the thermos
  //   walkable    x -5.05..0.10  z 1.05..2.20 — a galley, which is what it should be
  //
  // Materials do all the work here. Stainless is not one colour but five, and which one a piece
  // gets is a statement about how old it is and how often it is wiped: the bench is bright and
  // scratched, the range surround is dulled, the splashback behind the wok is neither steel nor
  // tile any more.
  const KTOP = Y + .90;                       // the working height, and every counter top
  const KZ = 2.85, KD = .70;                  // the north run's centre line and its depth

  // --- 墙砖. White square tile to 1.60, plaster over. One field, one grout band at the top, and
  // a browner glossier panel behind the range where the oil goes — the single most important
  // material decision on this floor.
  wall(0, Y + .80, ZM - .008, PX - X0, 1.60, PI, c.tileW, { ...MT.tile, gloss: .32 });
  box((X0 + PX) / 2, Y + 1.615, ZM - .022, PX - X0, .030, .022, c.grout, { hard: true, gloss: .28 });
  wall(X0 + .008, Y + .80, (PZ + ZM) / 2, ZM - PZ, 1.60, PI / 2, c.tileC, { ...MT.tile, gloss: .30 });
  box(X0 + .022, Y + 1.615, (PZ + ZM) / 2, .022, .030, ZM - PZ, c.grout, { hard: true, gloss: .28 });
  // the splashback that has seen use: 2.2 m of it, warmer and glossier, with the worst of it
  // directly over the wok
  box(-4.50, Y + 1.02, ZM - .020, 2.30, 1.24, .020, C('#6d6553'), { hard: true, gloss: .44 });
  box(-4.50, Y + .92, ZM - .034, 1.42, .74, .012, C('#5b5445'), { hard: true, gloss: .52 });
  box(-4.50, Y + .74, ZM - .046, .96, .40, .010, C('#4b453a'), { hard: true, gloss: .56 });
  for (const [sx, sy, sw, sh] of [[-4.92, 1.36, .26, .07], [-4.18, 1.24, .20, .05],
                                  [-4.60, 1.52, .34, .05], [-3.96, 1.44, .16, .06],
                                  [-5.16, 1.16, .14, .09]])
    box(sx, Y + sy, ZM - .044, sw, sh, .008, c.soot, { hard: true, gloss: .40, ry: .0 });
  // and a stainless kick-plate along the very bottom of the run, which every kitchen ends up with
  box(-3.20, Y + .13, ZM - .026, 5.60, .24, .020, c.steelM, { hard: true, gloss: .50, ...MT.metal });

  // --- 灶台. One continuous stainless bench, x -5.80 .. -0.60, on a plain plinth. The top is a
  // single slab so the light runs along it; the doors under it are separate boxes so they read
  // as doors.
  (function bench() {
    const x0 = -5.80, x1 = -0.60, xm = (x0 + x1) / 2, L = x1 - x0;
    box(xm, KTOP - .022, KZ, L, .045, KD, c.steel, { hard: true, gloss: .50, ...MT.metal });
    box(xm, KTOP - .052, KZ + KD / 2 - .012, L, .022, .024, c.steelM, { hard: true, gloss: .60 });
    box(xm, Y + .44, KZ + .02, L - .04, .88, KD - .08, C('#8c949a'), { hard: true, gloss: .34, ...MT.metal });
    // doors and drawers under it, in bays
    for (let i = 0; i < 6; i++) {
      const dx = x0 + .48 + i * .86;
      box(dx, Y + .43, KZ - KD / 2 + .012, .80, .70, .022, C('#a4acb2'), { hard: true, gloss: .40, ...MT.metal });
      box(dx, Y + .70, KZ - KD / 2 - .004, .30, .020, .022, c.chrome, { hard: true, gloss: .70 });
    }
    box(xm, Y + .06, KZ + .02, L - .10, .12, KD - .16, c.steelX, { hard: true, gloss: .30 });
    shade(xm, KZ, L + .10, KD + .14, .38);
  })();

  // --- 炒炉. The wok range: a round well cut in the bench at x -4.50, the cast ring in it, the
  // burner crown under that, and the wok sitting in the ring. A taper flipped on its head is the
  // one primitive in this toolkit that is a wok — wide at the rim, tight at the base.
  const WOKX = -4.50, WOKZ = KZ - .02;
  (function wokRange() {
    // the sunken well and its collar
    for (let i = 0; i < 16; i++) {
      const a = i * PI / 8;
      box(WOKX + Math.cos(a) * .295, KTOP - .046, WOKZ + Math.sin(a) * .295, .13, .050, .075,
          c.steelX, { hard: true, ry: -a, gloss: .40, ...MT.metal });
    }
    cyl(WOKX, KTOP - .175, WOKZ, .245, .045, c.iron, { gloss: .22 });
    // 灶圈 — the cast ring the wok sits in, eight segments so it reads as a casting
    for (let i = 0; i < 10; i++) {
      const a = i * PI / 5;
      box(WOKX + Math.cos(a) * .255, KTOP - .028, WOKZ + Math.sin(a) * .255, .12, .034, .07,
          c.ironL, { hard: true, ry: -a, gloss: .26 });
    }
    // the burner crown. A high-output ring is a lot of small flames, not one big one; each is a
    // capsule with a cool blue root and a hotter tip, and the emissive is registered so the Hub
    // can put it out later.
    const flames = [];
    for (let i = 0; i < 16; i++) {
      const a = i * PI / 8, r = .175, fx = WOKX + Math.cos(a) * r, fz = WOKZ + Math.sin(a) * r;
      flames.push(cap(fx, KTOP - .048, fz, .017, .095, .017, c.flame,
                      { mode: 1, glow: .16, rz: Math.cos(a) * .30, rx: -Math.sin(a) * .30 }));
      flames.push(cap(fx, KTOP - .006, fz, .010, .062, .010, c.flameC,
                      { mode: 1, glow: .22, rz: Math.cos(a) * .34, rx: -Math.sin(a) * .34 }));
    }
    flames.push(cyl(WOKX, KTOP - .132, WOKZ, .090, .030, c.ember, { mode: 1, glow: .18 }));
    A.emitter('f8wok', flames, .10);
    // a gas flame is a light, and it is the only one in the room that comes from below
    light(WOKX, KTOP - .05, WOKZ, C('#7fb8ee'), .34, 1.30);
    light(WOKX, KTOP + .18, WOKZ, C('#ffb066'), .22, 1.05);

    // 炒锅 — the wok. Blackened iron outside, seasoned bronze-brown inside, a rolled rim, and
    // the single long wooden handle a 单柄炒锅 has.
    const wy = KTOP + .020;
    taper(WOKX, wy, WOKZ, .44, .155, .44, c.iron, { rz: PI, gloss: .30 });
    taper(WOKX, wy + .012, WOKZ, .405, .130, .405, c.season, { rz: PI, gloss: .44 });
    cyl(WOKX, wy + .078, WOKZ, .225, .022, c.ironL, { gloss: .38 });
    cyl(WOKX, wy + .066, WOKZ, .205, .012, C('#3b2c1c'), { gloss: .50 });
    // the handle, out over the front edge of the bench
    cyl(WOKX + .12, wy + .105, WOKZ - .30, .020, .34, c.woodD, { rx: PI / 2.6, rz: .5, gloss: .24 });
    cyl(WOKX + .05, wy + .075, WOKZ - .16, .022, .12, c.steelD, { rx: PI / 2.6, rz: .5, gloss: .55 });
    // 锅铲 — the shovel, standing in the wok the way it is left between dishes
    box(WOKX - .06, wy + .050, WOKZ + .04, .115, .012, .100, c.steel,
        { hard: true, gloss: .66, rz: -.42, ...MT.metal });
    cyl(WOKX - .21, wy + .175, WOKZ + .12, .017, .40, c.woodD, { rz: -.42, rx: .34, gloss: .24 });
    // a slick of oil in the bottom, catching the flame
    cyl(WOKX, wy - .030, WOKZ, .105, .006, C('#c08a2e'), { mode: 1, glow: .05, gloss: .80 });
    shade(WOKX, WOKZ, .52, .52, .18, KTOP + .002);
  })();

  // --- 抽油烟机. The boxy Chinese extractor: a deep stainless box with a sloped front, two
  // slanted grease filters under it, a cup on the corner to catch what runs off them, a control
  // strip, and a duct up into the ceiling. Underlit, which is the light this room is actually
  // cooked by.
  (function hood() {
    const hx = WOKX - .10, hz = KZ + .05, hb = Y + 1.63;          // the underside
    box(hx, hb + .27, hz, 1.44, .52, .66, c.steel, { hard: true, gloss: .54, ...MT.metal });
    box(hx, hb + .555, hz, 1.48, .05, .70, c.steelM, { hard: true, gloss: .48 });
    // the sloped front skirt
    box(hx, hb + .10, hz - .28, 1.44, .24, .16, c.steelM, { hard: true, gloss: .50, rx: -.42, ...MT.metal });
    // two filters in a shallow V, dark and matte with the grease in them
    for (const s of [-1, 1])
      box(hx + s * .34, hb + .045, hz + .04, .64, .020, .46, c.mesh,
          { hard: true, gloss: .30, rx: s * .10 });
    box(hx, hb + .038, hz + .04, .06, .022, .46, c.steelX, { hard: true, gloss: .40 });
    // 油杯 — the grease cup, on the right-hand corner where the fold drains to
    cyl(hx + .58, hb - .045, hz + .22, .045, .095, c.steelM, { gloss: .46 });
    cyl(hx + .58, hb - .008, hz + .22, .038, .030, C('#9a7c34'), { gloss: .62 });
    // the strip light under it — 0.62 x 0.05 m, so it sits in the thin-run glow band
    box(hx - .12, hb - .012, hz - .24, .62, .022, .05, c.warm, { hard: true, mode: 1, glow: .08 });
    light(hx - .12, hb - .10, hz - .20, C('#ffe6bd'), .44, 2.10);
    // the control strip, three rockers and the words that are on every one of these
    box(hx + .10, hb + .10, hz - .335, .58, .10, .04, C('#2b2f33'), { hard: true, gloss: .42 });
    ['照明', '低速', '高速'].forEach((t, i) => {
      box(hx - .06 + i * .17, hb + .10, hz - .358, .13, .062, .012, C('#d6d2c7'), { hard: true, gloss: .30 });
      G(hx - .06 + i * .17, hb + .10, hz - .372, PI, t, { size: .030, gap: .004, color: C('#31363a') });
    });
    // the duct, up into the ceiling
    box(hx - .40, (hb + .555 + CY) / 2, hz + .10, .26, CY - hb - .555, .22, c.steelM,
        { hard: true, gloss: .44, ...MT.metal });
    for (const yy of [.18, .46])
      box(hx - .40, hb + .60 + yy, hz + .10, .29, .028, .25, c.steelD, { hard: true, gloss: .50 });
    G(hx + .52, hb + .30, hz - .335, PI, '抽油烟机', { size: .044, gap: .008, color: C('#7c848a') });
  })();

  // --- 蒸汽. The one thing that makes this floor alive. Registered as a rig so the Hub can drive
  // it (`World.setSteam('f8wok', amt, t)`), AND built as a standing plume, because nothing on
  // this deck ticks yet and a rig nobody drives sits at alpha 0 and is simply not there. Nine
  // balls climbing from the wok into the mouth of the hood, thinning and spreading as they go.
  A.steam('f8wok', [WOKX, KTOP + .13, WOKZ], 6, .075, .58);
  for (let i = 0; i < 9; i++) {
    const u = i / 8, r = .085 + u * .175;
    ball(WOKX + Math.sin(u * 5.2) * .07 * u, KTOP + .12 + u * .52, WOKZ + Math.cos(u * 4.4) * .06 * u,
         r, r * .82, r, C('#eef3f6'), { mode: 1, alpha: .30 * (1 - u * .72) + .05, glow: .015 });
  }

  // --- 燃气灶. The four-ring domestic hob east of the wok, carrying the steamer stack and the
  // pressure cooker. Two rings lit, two not, because that is what a service looks like.
  const HOBX = -2.70;
  (function hob() {
    box(HOBX, KTOP + .008, KZ, 1.00, .030, .58, C('#1f2225'), { hard: true, gloss: .56 });
    for (const [dx, dz, on] of [[-.26, .13, true], [.26, .13, false], [-.26, -.13, false], [.26, -.13, true]]) {
      cyl(HOBX + dx, KTOP + .028, KZ + dz, .085, .022, c.ironL, { gloss: .26 });
      for (let i = 0; i < 6; i++) {
        const a = i * PI / 3;
        box(HOBX + dx + Math.cos(a) * .095, KTOP + .034, KZ + dz + Math.sin(a) * .095, .07, .020, .028,
            c.iron, { hard: true, ry: -a, gloss: .24 });
      }
      if (on) {
        for (let i = 0; i < 10; i++) {
          const a = i * PI / 5;
          cap(HOBX + dx + Math.cos(a) * .048, KTOP + .038, KZ + dz + Math.sin(a) * .048,
              .010, .045, .010, c.flame, { mode: 1, glow: .16, rz: Math.cos(a) * .3, rx: -Math.sin(a) * .3 });
        }
      }
    }
    for (let i = 0; i < 4; i++)
      cyl(HOBX - .36 + i * .24, KTOP + .010, KZ - .31, .030, .028, C('#3b4046'), { gloss: .50 });
    // 蒸锅 — the aluminium steamer stack, three tiers and a domed lid, on the back-left ring
    const sx = HOBX - .26, sz = KZ + .13, sb = KTOP + .048;
    for (let i = 0; i < 3; i++) {
      cyl(sx, sb + .055 + i * .112, sz, .175, .105, c.alu, { gloss: .46, ...MT.metal });
      cyl(sx, sb + .110 + i * .112, sz, .182, .014, c.steelM, { gloss: .52 });
    }
    taper(sx, sb + .385, sz, .360, .095, .360, c.alu, { gloss: .48 });
    cyl(sx, sb + .440, sz, .034, .030, c.steelD, { gloss: .55 });
    for (const s of [-1, 1])
      box(sx + s * .195, sb + .20, sz, .05, .045, .11, c.steelM, { hard: true, gloss: .50 });
    // steam creeping out of every seam of it
    for (let i = 0; i < 6; i++) {
      const u = i / 5, a = i * 2.1;
      ball(sx + Math.cos(a) * (.14 + u * .16), sb + .40 + u * .34, sz + Math.sin(a) * (.10 + u * .13),
           .055 + u * .085, (.045 + u * .07), .055 + u * .085, C('#eef3f6'),
           { mode: 1, alpha: .26 * (1 - u * .7) + .05, glow: .012 });
    }
    // 高压锅 — the pressure cooker on the front-right ring, weight valve and all
    const px = HOBX + .26, pz = KZ - .13, pb = KTOP + .048;
    cyl(px, pb + .095, pz, .155, .190, c.alu, { gloss: .50, ...MT.metal });
    cyl(px, pb + .200, pz, .168, .028, c.steelM, { gloss: .54 });
    taper(px, pb + .238, pz, .300, .050, .300, c.alu, { gloss: .48 });
    cyl(px, pb + .272, pz, .022, .028, c.steelX, { gloss: .58 });
    ball(px, pb + .296, pz, .028, .022, .028, C('#39332c'), { gloss: .40 });
    for (const s of [-1, 1])
      box(px + s * .195, pb + .195, pz, .07, .042, .10, C('#2b2f33'), { hard: true, gloss: .34 });
  })();

  // --- 案板. The end of the run is the prep station: a thick round block of end-grain elm on a
  // steel stand, scarred right across, with the cleavers on a magnetic bar over it.
  const BLKX = -1.20;
  (function block() {
    cyl(BLKX, KTOP + .085, KZ + .02, .245, .170, c.block, { mode: 6, gloss: .16 });
    cyl(BLKX, KTOP + .172, KZ + .02, .243, .006, c.blockD, { mode: 6, gloss: .14 });
    for (const [dx, dz, l, a] of [[-.05, .03, .30, .5], [.04, -.04, .26, 1.9], [.00, .07, .22, 2.8],
                                  [.08, .05, .18, .9], [-.09, -.06, .24, 2.2]])
      box(BLKX + dx, KTOP + .177, KZ + .02 + dz, l, .004, .010, C('#8e7043'),
          { hard: true, ry: a, gloss: .10 });
    // the steel band round the middle, which is what stops one of these splitting
    cyl(BLKX, KTOP + .048, KZ + .02, .251, .022, C('#6f757a'), { gloss: .40 });
    cyl(BLKX, KTOP + .002, KZ + .02, .238, .022, C('#7d5f36'), { mode: 6, gloss: .12 });
    // 白菜 on the block, half cut, and the eggs beside it
    for (let i = 0; i < 3; i++)
      cap(BLKX - .04, KTOP + .245 - i * .012, KZ + .06, .085 - i * .018, .30 - i * .05, .085 - i * .018,
          i ? c.cabbage : C('#cfd9a8'), { rz: PI / 2, ry: .3, gloss: .18, tag: '白菜' });
    for (const [dx, dz] of [[.19, -.10], [.16, -.02]]) {
      box(BLKX + dx, KTOP + .186, KZ + .02 + dz, .12, .012, .05, C('#dfe4c9'),
          { hard: true, gloss: .20, ry: .4 });
    }
    // 葱 — a bundle of spring onion, tied, waiting
    for (let i = 0; i < 5; i++)
      cap(BLKX + .26 + (i % 2) * .02, KTOP + .195, KZ - .10 + (i - 2) * .020, .011, .34, .011,
          i < 2 ? C('#e8ecd6') : c.leaf, { rz: PI / 2, ry: .12 * (i - 2), gloss: .22, tag: '葱' });
    shade(BLKX, KZ + .02, .58, .56, .20, KTOP + .002);
  })();
  // 菜刀 — three cleavers on a magnetic bar. The bar is 60 mm off the tile; the blades stand 26 mm
  // off the bar, so nothing here is ever in the same plane as the wall behind it.
  (function cleavers() {
    box(BLKX, Y + 1.44, ZM - .054, .78, .046, .030, C('#2e3236'), { hard: true, gloss: .40 });
    box(BLKX, Y + 1.44, ZM - .070, .74, .030, .010, C('#4c5257'), { hard: true, gloss: .52 });
    const blade = (bx, w, h, tone) => {
      box(bx, Y + 1.36 - h / 2, ZM - .082, w, h, .005, tone, { hard: true, gloss: .72, ...MT.metal });
      box(bx, Y + 1.36 - h + .012, ZM - .088, w - .012, .014, .004, c.chrome, { hard: true, gloss: .85 });
      cyl(bx + w / 2 + .055, Y + 1.40, ZM - .082, .017, .105, c.woodD, { gloss: .26 });
      cyl(bx + w / 2 + .012, Y + 1.40, ZM - .082, .012, .034, c.steelD, { rz: PI / 2, gloss: .58 });
    };
    blade(BLKX - .26, .195, .115, C('#c9d0d5'));
    blade(BLKX + .02, .170, .100, C('#bcc4ca'));
    blade(BLKX + .27, .130, .090, C('#c4cbd1'));
  })();

  // --- the hanging rail over the range: ladles, a skimmer, a strainer, and the string of dried
  // chillies. A Chinese kitchen hangs its tools; a drawer is where things go to be lost.
  (function rail() {
    cyl(-3.60, Y + 1.72, ZM - .12, .012, 3.10, c.steel, { rz: PI / 2, gloss: .62, ...MT.metal });
    for (const s of [-1, 1])
      box(-3.60 + s * 1.52, Y + 1.72, ZM - .075, .028, .040, .11, c.steelD, { hard: true, gloss: .5 });
    // 汤勺 ladle, 漏勺 skimmer, 长柄勺, all hung by the hook
    const hang = (hx, kind) => {
      cyl(hx, Y + 1.685, ZM - .12, .009, .075, c.steelM, { gloss: .6 });
      cyl(hx, Y + 1.44, ZM - .12, .011, .42, c.steelM, { gloss: .58 });
      if (kind === 0) taper(hx, Y + 1.20, ZM - .12, .130, .075, .130, c.steel, { gloss: .60 });
      if (kind === 1) { cyl(hx, Y + 1.20, ZM - .12, .085, .022, c.mesh, { gloss: .34 });
                        cyl(hx, Y + 1.212, ZM - .12, .090, .010, c.steel, { gloss: .62 }); }
      if (kind === 2) { taper(hx, Y + 1.21, ZM - .12, .100, .060, .100, c.steel, { rz: PI, gloss: .60 }); }
    };
    hang(-2.30, 0); hang(-2.05, 1); hang(-1.80, 2); hang(-5.02, 0);
    // 干辣椒 — a string of dried chillies hanging at the end of the rail
    for (let i = 0; i < 13; i++) {
      const a = i * 1.7;
      cap(-5.30 + Math.cos(a) * .035, Y + 1.62 - i * .042, ZM - .12 + Math.sin(a) * .030,
          .014, .085, .014, i % 3 ? c.chilli : C('#8e2318'),
          { rz: Math.cos(a) * .7, rx: Math.sin(a) * .5, gloss: .34, tag: '辣椒' });
    }
    cyl(-5.30, Y + 1.68, ZM - .12, .004, .13, C('#8a7550'), { gloss: .1 });
    // 蒜 — a braid of garlic beside it
    for (let i = 0; i < 9; i++)
      ball(-5.56 + Math.cos(i * 2.1) * .034, Y + 1.58 - i * .052, ZM - .11 + Math.sin(i * 2.1) * .026,
           .038, .034, .038, i % 2 ? C('#e6dfcc') : C('#d8cfb6'), { gloss: .18, tag: '蒜' });
    cyl(-5.56, Y + 1.66, ZM - .11, .010, .14, C('#c4b899'), { gloss: .12 });
  })();

  // --- 水池. The deep double sink under the window, on the west wall, with the mixer, the
  // draining board and the plastic basin that lives in every Chinese sink.
  (function sink() {
    const sx = X0 + .34, sz = 1.62, sy = KTOP;
    box(sx, sy - .022, sz, .68, .045, 1.32, c.steel, { hard: true, gloss: .48, ...MT.metal });
    box(sx, Y + .44, sz, .62, .88, 1.24, c.steelM, { hard: true, gloss: .38, ...MT.metal });
    box(sx + .30, Y + .44, sz, .022, .70, 1.10, c.steel, { hard: true, gloss: .46 });
    for (const dz of [-.34, .34]) {
      box(sx, sy - .130, sz + dz, .46, .210, .50, C('#9aa2a8'), { hard: true, gloss: .60, ...MT.metal });
      cyl(sx, sy - .232, sz + dz, .028, .014, c.steelX, { gloss: .5 });
    }
    box(sx, sy - .014, sz - .55, .58, .022, .18, c.steel, { hard: true, gloss: .62, rx: .04 });
    // the mixer, standing off the back edge of the bowl
    cyl(sx + .26, sy + .14, sz, .022, .30, c.chrome, { gloss: .78, ...MT.metal });
    cyl(sx + .16, sy + .29, sz, .018, .22, c.chrome, { rz: PI / 2, gloss: .78 });
    cyl(sx + .06, sy + .26, sz, .014, .07, c.chrome, { gloss: .70 });
    cap(sx + .30, sy + .30, sz, .014, .12, .014, c.chrome, { rz: .9, gloss: .74 });
    // the red plastic basin, and a stack of bowls draining
    taper(sx, sy - .095, sz - .34, .38, .14, .34, C('#b8412f'), { rz: PI, gloss: .30 });
    for (let i = 0; i < 4; i++)
      taper(sx - .10, sy + .020 + i * .030, sz + .48, .155, .050, .155, c.white, { rz: PI, gloss: .40 });
    for (let i = 0; i < 3; i++)
      cap(sx + .14, sy + .012, sz + .40 + i * .035, .010, .21, .010, c.bamboo, { rz: PI / 2, ry: .1 * i, gloss: .2 });
    shade(sx, sz, .78, 1.44, .38, Y + .036);
  })();
  // 窗户 — the kitchen window over the sink, the same bay construction as the landing's.
  (function kitchenWindow() {
    const WX = X0 + .014, wz = 1.62, ww = 1.20, w0 = 1.02, w1 = 2.16;
    A.sky(box(WX, Y + (w0 + w1) / 2, wz, .012, w1 - w0 + .10, ww + .10, c.sky,
              { hard: true, mode: 1, glow: .035 }));
    let seed = 5150921;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const base = Y + w0 + .04;
    for (const [layer, bx, tint, hmax] of [[0, WX + .012, '#93a7ba', .40], [1, WX + .026, '#63788c', .84]]) {
      let z = wz - ww / 2 + .02;
      while (z < wz + ww / 2 - .05) {
        const bw = .09 + rnd() * .16, bh = .14 + rnd() * hmax;
        A.city(layer, box(bx, base + bh / 2, z + bw / 2, .010, bh, bw * .95, C(tint),
                          { hard: true, mode: 1 }));
        if (layer === 1 && bh > .36)
          for (let ry = base + .09; ry < base + bh - .05; ry += .095)
            for (const q of [-.25, .05, .28]) if (rnd() > .48)
              A.city(2, box(bx + .008, ry, z + bw / 2 + q * bw, .006, .030, .020,
                            C(rnd() > .5 ? '#ffd691' : '#c2d6e4'), { hard: true, mode: 1, glow: .16 }));
        z += bw + .014 + rnd() * .045;
      }
    }
    for (const [ry, rz, rh, rw] of [[w0 - .05, wz, .10, ww + .20], [w1 + .05, wz, .10, ww + .20],
                                    [(w0 + w1) / 2, wz - ww / 2 - .05, w1 - w0, .10],
                                    [(w0 + w1) / 2, wz + ww / 2 + .05, w1 - w0, .10]])
      box(X0 + .058, Y + ry, rz, .11, rh, rw, c.wallK, { hard: true, gloss: .10, ...MT.plaster });
    const wf = (y, z, h, w) => box(X0 + .108, Y + y, z, .05, h, w, c.alu,
                                   { hard: true, gloss: .40, tag: '窗户', ...MT.metal });
    wf(w0 + .015, wz, .06, ww + .06); wf(w1 - .015, wz, .06, ww + .06);
    wf((w0 + w1) / 2, wz - ww / 2 + .03, w1 - w0, .06);
    wf((w0 + w1) / 2, wz + ww / 2 - .03, w1 - w0, .06);
    wf((w0 + w1) / 2, wz, w1 - w0, .05);
    box(X0 + .086, Y + (w0 + w1) / 2, wz, .010, w1 - w0 - .06, ww - .06, c.glass,
        { hard: true, mode: 18, alpha: .12, gloss: .78, tag: '窗户' });
    box(X0 + .17, Y + w0 - .045, wz, .23, .05, ww + .20, c.tileW, { hard: true, gloss: .40, tag: '窗户' });
    // 葱 rooting in a jar of water on the sill, which is the most Chinese object in this flat
    cyl(X0 + .20, Y + w0 + .055, wz - .36, .052, .105, C('#cfe0e4'), { mode: 18, alpha: .34, gloss: .80 });
    cyl(X0 + .20, Y + w0 + .035, wz - .36, .046, .062, C('#c8dcc9'), { mode: 18, alpha: .55, gloss: .70 });
    for (let i = 0; i < 8; i++) {
      const a = i * 2.399, hh = .16 + (i % 3) * .06;
      cap(X0 + .20 + Math.cos(a) * .020, Y + w0 + .115 + hh / 2, wz - .36 - Math.sin(a) * .020,
          .010, hh, .010, i % 2 ? c.leaf : C('#6da84e'),
          { ry: a, rz: Math.cos(a) * .30, gloss: .24, tag: '葱' });
    }
    // 姜 and 蒜 in a wire basket on the other end of the sill
    box(X0 + .20, Y + w0 + .075, wz + .38, .20, .13, .24, c.steelD, { hard: true, gloss: .48, alpha: .8 });
    for (const [dx, dz, r, cl] of [[-.03, -.06, .045, C('#d0b078')], [.03, .02, .050, C('#c9a86e')],
                                   [.00, .08, .040, C('#b8945c')]])
      ball(X0 + .20 + dx, Y + w0 + .125, wz + .38 + dz, r, r * .68, r * 1.25, cl,
           { gloss: .16, ry: dz * 6, tag: '姜' });
    for (const [dx, dz] of [[-.04, .06], [.04, -.05], [.00, -.01]])
      ball(X0 + .20 + dx, Y + w0 + .120, wz + .38 + dz, .036, .032, .036, C('#e6dfcc'),
           { gloss: .18, tag: '蒜' });
  })();

  // --- the wall of jars and bottles. Three open steel shelves on the south side of the kitchen,
  // over a low bench: everything a wok needs within one step of the wok. Bottles are built by a
  // small factory so there are a dozen of them without a dozen blocks of code, and each one
  // carries its own label in its own colour, because a shelf of identical silhouettes reads as
  // wallpaper.
  (function condiments() {
    const bz = PZ + .30, x0 = -3.30, x1 = 0.30;
    // the low bench under them
    box((x0 + x1) / 2, KTOP - .022, bz, x1 - x0, .045, .58, c.steel, { hard: true, gloss: .48, ...MT.metal });
    box((x0 + x1) / 2, Y + .44, bz + .02, x1 - x0 - .04, .86, .52, C('#8c949a'),
        { hard: true, gloss: .32, ...MT.metal });
    for (let i = 0; i < 4; i++) {
      box(x0 + .46 + i * .88, Y + .43, bz - .27, .82, .70, .022, C('#a4acb2'), { hard: true, gloss: .38, ...MT.metal });
      box(x0 + .46 + i * .88, Y + .70, bz - .29, .30, .020, .022, c.chrome, { hard: true, gloss: .70 });
    }
    shade((x0 + x1) / 2, bz, x1 - x0 + .10, .70, .38);
    // three shelves on brackets off the partition
    for (let i = 0; i < 3; i++) {
      const sy = Y + 1.16 + i * .38;
      box((x0 + x1) / 2, sy, bz - .10, x1 - x0, .020, .30, c.steel, { hard: true, gloss: .58, ...MT.metal });
      box((x0 + x1) / 2, sy - .020, bz - .10, x1 - x0 - .04, .014, .26, c.steelM, { hard: true, gloss: .44 });
      for (const bx of [x0 + .30, (x0 + x1) / 2, x1 - .30])
        box(bx, sy - .055, bz - .02, .030, .085, .12, c.steelD, { hard: true, gloss: .46 });
    }
    // one bottle: body, shoulder, neck, cap, label, characters
    const bottle = (bx, by, o) => {
      cyl(bx, by + o.h / 2, bz - .11, o.r, o.h, o.body, { gloss: o.gl || .58, alpha: o.a || 1 });
      taper(bx, by + o.h + .028, bz - .11, o.r * 2, .056, o.r * 2, o.body, { gloss: o.gl || .58, alpha: o.a || 1 });
      cyl(bx, by + o.h + .085, bz - .11, o.r * .40, .062, o.body, { gloss: o.gl || .58, alpha: o.a || 1 });
      cyl(bx, by + o.h + .125, bz - .11, o.r * .46, .028, o.cap, { gloss: .42 });
      box(bx, by + o.h * .52, bz - .11 - o.r - .004, o.r * 1.55, o.h * .50, .006, o.lab,
          { hard: true, gloss: .16 });
      G(bx, by + o.h * .52, bz - .11 - o.r - .012, PI, o.t,
        { size: o.ts || .036, gap: .006, color: o.ink || c.ink, vertical: true, tag: o.tag });
      if (o.tag) return null;
      return null;
    };
    const S0 = Y + 1.18, S1 = Y + 1.56, S2 = Y + 1.94;
    // bottom shelf — the four that get used every service, biggest and nearest the hob
    bottle(-3.06, S0, { h: .27, r: .048, body: c.soy, cap: C('#b83028'), lab: C('#e8d9b8'),
                        t: '生抽', ink: C('#8a1f18'), tag: '酱油' });
    bottle(-2.82, S0, { h: .27, r: .048, body: C('#1b1310'), cap: C('#2f5a3a'), lab: C('#dfd2ae'),
                        t: '老抽', ink: C('#2f5a3a') });
    bottle(-2.58, S0, { h: .25, r: .045, body: c.wine, cap: C('#c8a24e'), lab: C('#e4e9d8'),
                        t: '料酒', ink: C('#2f5a3a') });
    bottle(-2.34, S0, { h: .26, r: .046, body: c.vin, cap: C('#3a2c1e'), lab: C('#e0cfa4'),
                        t: '香醋', ink: C('#6b3a1c'), tag: '醋' });
    // 蚝油 — squat, wide-mouthed, sitting upside-down in its own drip the way they all end up
    cyl(-2.06, S0 + .095, bz - .11, .058, .190, c.oyster, { gloss: .56 });
    taper(-2.06, S0 + .218, bz - .11, .116, .052, .116, c.oyster, { gloss: .56 });
    cyl(-2.06, S0 + .262, bz - .11, .034, .042, C('#2f6a4a'), { gloss: .44 });
    box(-2.06, S0 + .100, bz - .172, .085, .100, .006, C('#e6d7a8'), { hard: true, gloss: .16 });
    G(-2.06, S0 + .100, bz - .180, PI, '蚝油', { size: .034, gap: .005, color: C('#7a4a12'), vertical: true });
    // 豆瓣酱 — the jar with the red lid
    cyl(-1.78, S0 + .085, bz - .11, .072, .170, C('#b34a2c'), { gloss: .40, alpha: .95 });
    cyl(-1.78, S0 + .182, bz - .11, .076, .028, C('#a8241c'), { gloss: .40 });
    box(-1.78, S0 + .090, bz - .188, .105, .095, .006, C('#e8ddc2'), { hard: true, gloss: .16 });
    G(-1.78, S0 + .090, bz - .196, PI, '豆瓣酱', { size: .030, gap: .004, color: C('#8e3126'), vertical: true });
    // 芝麻油 — small, golden, and kept apart because a splash of it is the last thing to go in
    bottle(-1.54, S0, { h: .17, r: .034, body: c.sesame, cap: C('#7a3a1c'), lab: C('#f0e3bd'),
                        t: '香油', ink: C('#8a5a12'), ts: .030 });
    // salt, sugar, MSG and starch in four identical steel bins, because at this end nothing is
    // branded, it is just what goes in the wok
    ['盐', '糖', '味精', '淀粉'].forEach((t, i) => {
      const bx = -1.26 + i * .26;
      cyl(bx, S0 + .080, bz - .11, .072, .160, C('#8b9299'), { gloss: .40, ...MT.metal });
      taper(bx, S0 + .180, bz - .11, .150, .046, .150, C('#9aa1a7'), { gloss: .44 });
      box(bx, S0 + .090, bz - .188, .085, .070, .005, C('#f0ece0'), { hard: true, gloss: .12 });
      G(bx, S0 + .090, bz - .195, PI, t, { size: .032, gap: .005, vertical: true });
    });
    // middle shelf — the whole spices, in glass jars, which is where the colour is
    const spice = (sx, t, cl, seedn) => {
      cyl(sx, S1 + .075, bz - .11, .058, .150, C('#dfe8ea'), { mode: 18, alpha: .30, gloss: .80 });
      cyl(sx, S1 + .050, bz - .11, .050, .095, cl, { gloss: .28 });
      cyl(sx, S1 + .158, bz - .11, .056, .022, C('#8a6a3c'), { gloss: .34 });
      box(sx, S1 + .052, bz - .174, .075, .058, .005, C('#efe7d2'), { hard: true, gloss: .14 });
      G(sx, S1 + .052, bz - .181, PI, t, { size: .026, gap: .004, vertical: true });
    };
    spice(-3.06, '八角', C('#6b4227')); spice(-2.80, '花椒', C('#8f3a2a'));
    spice(-2.54, '桂皮', C('#7a4a26')); spice(-2.28, '干辣椒', C('#a92a1c'));
    spice(-2.02, '香叶', C('#6f7c4a')); spice(-1.76, '孜然', C('#9a7c46'));
    spice(-1.50, '五香粉', C('#a8783c'));
    // a stack of 碗 and a jar of chopsticks at the east end of the middle shelf
    for (let i = 0; i < 6; i++)
      taper(-1.10, S1 + .028 + i * .034, bz - .11, .130, .052, .130, c.white, { rz: PI, gloss: .42 });
    for (let i = 0; i < 5; i++)
      taper(-0.80, S1 + .028 + i * .030, bz - .11, .115, .046, .115, C('#dfe6ea'), { rz: PI, gloss: .44 });
    cyl(-0.50, S1 + .060, bz - .11, .048, .120, c.steelM, { gloss: .50 });
    for (let i = 0; i < 11; i++) {
      const a = i * 2.399;
      cap(-0.50 + Math.cos(a) * .022, S1 + .195, bz - .11 + Math.sin(a) * .022, .006, .24, .006,
          i % 3 ? c.bamboo : C('#8a6a3c'), { rz: Math.cos(a) * .12, rx: Math.sin(a) * .12, gloss: .22, tag: '筷子' });
    }
    // top shelf — the big steel, the thermos and the 保温桶
    for (let i = 0; i < 2; i++)
      cyl(-3.00 + i * .40, S2 + .105, bz - .11, .160, .210, c.alu, { gloss: .44, ...MT.metal });
    for (let i = 0; i < 2; i++)
      taper(-3.00 + i * .40, S2 + .225, bz - .11, .330, .050, .330, c.steel, { gloss: .50 });
    // 暖水瓶 — the enamel thermos, red band and all, which is on every shelf in the country
    (function thermos(tx) {
      cyl(tx, S2 + .150, bz - .11, .088, .300, C('#d8d2c2'), { gloss: .40 });
      cyl(tx, S2 + .150, bz - .11, .090, .100, C('#b8342a'), { gloss: .42 });
      G(tx, S2 + .150, bz - .202, PI, '福', { size: .050, color: C('#e8c86a') });
      taper(tx, S2 + .322, bz - .11, .172, .056, .172, C('#c8c2b2'), { gloss: .40 });
      cyl(tx, S2 + .372, bz - .11, .042, .048, C('#8a5a3a'), { gloss: .26 });
      cap(tx + .10, S2 + .240, bz - .11, .010, .17, .010, C('#3b3a36'), { rz: .5, gloss: .34 });
    })(-2.28);
    // 保温桶 — the insulated carrier the restaurant sends food home in
    cyl(-1.90, S2 + .130, bz - .11, .125, .260, C('#b8bcc0'), { gloss: .48, ...MT.metal });
    cyl(-1.90, S2 + .266, bz - .11, .130, .030, c.steel, { gloss: .54 });
    cap(-1.90, S2 + .330, bz - .11, .012, .24, .012, c.steelD, { rz: PI / 2, gloss: .50 });
    box(-1.90, S2 + .130, bz - .238, .13, .07, .006, C('#e8e4d8'), { hard: true, gloss: .16 });
    G(-1.90, S2 + .130, bz - .245, PI, '保温桶', { size: .028, gap: .004, vertical: true });
    // a sack of rice standing on the end of the low bench, open, with the scoop in it
    box(-0.10, KTOP + .18, bz + .02, .34, .36, .26, C('#d8cfb4'), { gloss: .10, ry: .1 });
    box(-0.10, KTOP + .36, bz + .02, .30, .06, .22, C('#cec4a6'), { gloss: .10, ry: .1 });
    G(-0.10, KTOP + .26, bz - .118, PI, '大米', { size: .052, gap: .010, color: C('#8a4a2c') });
    cyl(-0.02, KTOP + .42, bz + .02, .050, .06, c.white, { gloss: .30 });
  })();
  // colliders for the three runs
  stop(-5.85, -0.55, KZ - KD / 2 - .02, ZM);
  stop(-3.35, 0.35, PZ, PZ + .62);
  stop(X0, X0 + .70, 0.90, 2.32);

  // --- 电饭锅 the rice cooker, and the fridge. Both in the west corner where the doorway to the
  // back room is, so the cook's triangle stays hob-sink-block and these two are behind him.
  (function riceCookerAndFridge() {
    // rice cooker, on the low bench's west return
    const rx = X0 + .38, rz = 0.62;
    box(rx, Y + .38, rz, .62, .74, .58, c.steelM, { hard: true, gloss: .40, ...MT.metal });
    box(rx, Y + .77, rz, .66, .045, .62, c.steel, { hard: true, gloss: .56 });
    cyl(rx, Y + .90, rz, .155, .215, C('#e4e0d6'), { gloss: .44 });
    taper(rx, Y + 1.03, rz, .310, .075, .310, C('#eae6dc'), { gloss: .46 });
    cyl(rx, Y + 1.075, rz, .030, .040, c.steelD, { gloss: .52 });
    box(rx - .10, Y + .88, rz - .150, .13, .05, .022, C('#2b2f33'), { hard: true, gloss: .40 });
    cyl(rx + .07, Y + .88, rz - .152, .010, .012, C('#ff5a3a'), { rz: PI / 2, mode: 1, glow: .22 });
    G(rx - .10, Y + .88, rz - .166, PI, '保温', { size: .026, gap: .004, color: C('#cfe3d6'), mode: 1, glow: .08 });
    for (let i = 0; i < 4; i++) {
      const u = i / 3;
      ball(rx + Math.sin(i * 1.7) * .05 * u, Y + 1.11 + u * .22, rz + Math.cos(i * 1.9) * .04 * u,
           .045 + u * .07, .038 + u * .055, .045 + u * .07, C('#eef3f6'),
           { mode: 1, alpha: .22 * (1 - u * .6) + .04, glow: .010 });
    }
    shade(rx, rz, .74, .70, .34);
  })();
  stop(X0, X0 + .74, 0.28, 0.96);

  // --- lighting. Hard and cool over the working line, which is the whole difference between a
  // kitchen and a living room: a 1.30 x 0.08 batten under the ceiling, plus a second over the
  // walkway. The hood's warm strip above is the only other source and it fights this one, which
  // is exactly what a real kitchen looks like at night.
  for (const [lx, lz] of [[-3.40, 2.62], [-2.20, 1.20]]) {
    box(lx, CY - .050, lz, 1.30, .075, .13, c.steelM, { hard: true, gloss: .40 });
    box(lx, CY - .098, lz, 1.22, .030, .085, C('#dfe6f0'), { hard: true, mode: 1, glow: .06 });
    light(lx, CY - .20, lz, C('#dfeaf4'), .46, 3.40);
  }
  glowP(M.trs(-3.30, Y + .026, 2.00, 0, 4.20, 1, 2.40), C('#eaf1f6'), .10);
  glowP(M.trs(WOKX, Y + .026, WOKZ - .40, 0, 1.60, 1, 1.40), C('#ffc98a'), .13);

  // ==================================================================== 客厅 + 玄关
  //
  // x 0.4 .. 6.0, z 0.2 .. 3.2. Deliberately thin. Everything in here is either cheap, borrowed
  // from the restaurant, or evidence of the job: the certificates on the wall, the whites on the
  // hook, and a scorch on the skirting where something came home still hot. A man who cooks for a
  // living does not have a sofa he chose.

  // --- 门帘. The strip curtain in the doorway. The leaf itself is hooked back against the 玄关
  // wall — a kitchen this hot props its door open — and this is what actually hangs in the hole.
  (function doorCurtain() {
    box(FX, Y + FTOP - .055, ZM - .10, FW + .04, .05, .05, c.steelD, { hard: true, gloss: .5 });
    for (let i = 0; i < 9; i++) {
      const dx = -.42 + i * .105, sw = .12;
      box(FX + dx, Y + (FTOP - .09) / 2 + .02, ZM - .10 - (i % 2) * .012, sw, FTOP - .14, .006,
          i % 2 ? C('#b9cad0') : C('#cbd8dd'),
          { hard: true, mode: 18, alpha: .24, gloss: .58, ry: (i - 4) * .012, tag: '门帘' });
    }
  })();
  // the leaf, hooked open against the inside face of the wall east of the doorway
  box(FX + 1.02, Y + 1.01, ZM - .28, .06, 2.02, .95, C('#6c3a2b'), { hard: true, gloss: .24, tag: '门' });
  for (const [py, ph] of [[1.41, .80], [.53, .60]])
    box(FX + 1.05, Y + py, ZM - .28, .020, ph, .79, C('#7d4634'), { hard: true, gloss: .22, tag: '门' });
  cyl(FX + 1.05, Y + 1.03, ZM - .69, .016, .07, c.steel, { rz: PI / 2, gloss: .5, tag: '门' });
  box(FX + 1.06, Y + .90, ZM - .30, .012, .16, .12, C('#c8c2b2'), { hard: true, gloss: .3 });

  // --- 玄关. The shoe cabinet, the shoes on top of it, the hook rail with the whites.
  (function entry() {
    const sx = 5.10, sz = 3.20 - .20;
    box(sx, Y + .44, sz, 1.10, .84, .38, c.woodL, { mode: 6, gloss: .22, tag: '鞋柜' });
    box(sx, Y + .875, sz, 1.16, .045, .42, C('#8f6f47'), { mode: 6, gloss: .26, tag: '鞋柜' });
    for (const s of [-1, 1]) {
      box(sx + s * .27, Y + .46, sz - .195, .52, .74, .022, C('#b8935f'), { mode: 6, gloss: .24, tag: '鞋柜' });
      cyl(sx + s * .05, Y + .46, sz - .212, .012, .10, c.steelM, { gloss: .55 });
    }
    shade(sx, sz, 1.24, .48, .34);
    // shoes on top, and 拖鞋 on the floor: nobody's outdoor shoes come past this cabinet
    for (const s of [-1, 1])
      cap(sx - .32 + s * .07, Y + .935, sz - .02, .085, .07, .235, C('#2c3238'),
          { ry: s * .05, gloss: .18, tag: '鞋' });
    for (const s of [-1, 1])
      cap(sx + .30 + s * .06, Y + .058, sz - .34, .078, .055, .19, C('#c05f4a'),
          { ry: s * .09, gloss: .14, tag: '拖鞋' });
    for (const s of [-1, 1])
      cap(sx - .55 + s * .06, Y + .058, sz - .36, .078, .055, .19, C('#3f6f96'),
          { ry: s * .07, gloss: .14, tag: '拖鞋' });
    shade(sx - .12, sz - .35, .90, .30, .22);
    // the hook rail, and what is on it: the 厨师服 and the 厨师帽, still smelling of the range
    const hx = 4.05, hz = ZM - .06;
    box(hx, Y + 1.78, hz, 1.00, .07, .035, c.woodD, { hard: true, gloss: .22 });
    for (let i = 0; i < 4; i++)
      cyl(hx - .36 + i * .24, Y + 1.745, hz - .035, .010, .075, c.steelM, { rx: PI / 2, gloss: .55 });
    // the jacket: a shoulder, a body, two sleeves, and the double row of knots down the front
    box(hx - .30, Y + 1.35, hz - .10, .46, .70, .13, C('#f2f0e8'), { gloss: .06, tag: '厨师服' });
    box(hx - .30, Y + 1.66, hz - .10, .40, .10, .14, C('#e8e5db'), { gloss: .06, tag: '厨师服' });
    for (const s of [-1, 1])
      cap(hx - .30 + s * .25, Y + 1.42, hz - .10, .065, .48, .065, C('#eeece4'),
          { rz: s * .12, gloss: .06, tag: '厨师服' });
    for (let i = 0; i < 5; i++) for (const s of [-1, 1])
      ball(hx - .30 + s * .055, Y + 1.60 - i * .105, hz - .168, .014, .014, .010, C('#d8d5c9'), { gloss: .10 });
    // 厨师帽 — the tall white hat, hung on the next hook along
    cyl(hx + .22, Y + 1.60, hz - .09, .085, .20, C('#f4f2ea'), { gloss: .05, tag: '厨师帽' });
    cyl(hx + .22, Y + 1.70, hz - .09, .092, .05, C('#eae7dd'), { gloss: .05, tag: '厨师帽' });
    taper(hx + .22, Y + 1.76, hz - .09, .190, .10, .190, C('#f4f2ea'), { rz: PI, gloss: .05, tag: '厨师帽' });
    // an apron with the restaurant's name on it, on the last hook
    box(hx + .48, Y + 1.36, hz - .08, .30, .62, .05, C('#2f3a44'), { gloss: .06, tag: '围裙' });
    G(hx + .48, Y + 1.44, hz - .112, PI, '福源楼', { size: .046, gap: .008, color: C('#d8b45c') });
  })();
  stop(4.52, 5.68, ZM - .44, ZM);

  // --- the certificates. A 中式烹调师 ticket in a cheap gold frame is on the wall of every
  // household in this trade, and it is the best readable Chinese in the flat.
  (function certificates() {
    const cx = 1.35, cz = ZM - .014;
    box(cx, Y + 1.62, cz, .46, .62, .028, C('#a8813c'), { hard: true, gloss: .34 });
    box(cx, Y + 1.62, cz - .017, .40, .56, .006, C('#f2ecd8'), { hard: true, gloss: .12 });
    G(cx, Y + 1.80, cz - .026, PI, '职业资格证书', { size: .042, gap: .006, color: C('#8a2018') });
    box(cx, Y + 1.755, cz - .026, .26, .005, .005, C('#8a2018'), { hard: true });
    G(cx, Y + 1.66, cz - .026, PI, '中式烹调师', { size: .050, gap: .008 });
    G(cx, Y + 1.575, cz - .026, PI, '高级技师', { size: .038, gap: .006, color: C('#4a4238') });
    G(cx, Y + 1.44, cz - .026, PI, '国家职业技能鉴定', { size: .022, gap: .003, color: c.grey });
    ball(cx + .11, Y + 1.50, cz - .028, .048, .048, .004, C('#a8302a'), { mode: 1, alpha: .55, glow: .01 });
    // a smaller 健康证 beside it, and a restaurant photo gone yellow
    box(cx + .42, Y + 1.72, cz, .20, .27, .022, C('#c8b88a'), { hard: true, gloss: .26 });
    G(cx + .42, Y + 1.78, cz - .014, PI, '健康证', { size: .034, gap: .005, color: C('#2a5a3a') });
    G(cx + .42, Y + 1.68, cz - .014, PI, '餐饮', { size: .026, gap: .004, color: c.grey });
    box(cx + .42, Y + 1.36, cz, .26, .20, .020, C('#b8ac90'), { hard: true, gloss: .22, ry: .03 });
    box(cx + .42, Y + 1.36, cz - .012, .22, .16, .005, C('#d8c9a4'), { hard: true, gloss: .14, ry: .03 });
    // and a 挂历, the wall calendar every flat has, hanging from a nail
    box(-0.02 + 2.40, Y + 1.55, cz, .30, .44, .020, C('#e8e2d0'), { hard: true, gloss: .10, ry: -.02 });
    box(2.38, Y + 1.70, cz - .012, .26, .12, .005, C('#a8241c'), { hard: true, gloss: .12 });
    G(2.38, Y + 1.70, cz - .019, PI, '八月', { size: .058, gap: .010, color: C('#f0e2c0') });
    for (let r = 0; r < 4; r++) for (let q = 0; q < 7; q++)
      box(2.26 + q * .040, Y + 1.58 - r * .036, cz - .012, .026, .022, .004,
          (r * 7 + q) % 6 === 3 ? C('#c8503c') : C('#b8b0a0'), { hard: true, gloss: .06 });
  })();

  // --- the sofa, the tv on a stool, the folding table. All of it cheap, and none of it matching.
  (function livingKit() {
    // sofa against the partition, facing the room
    const sx = 1.95, sz = PZ + .44;
    box(sx, Y + .22, sz, 1.86, .40, .78, C('#6f5d4a'), { ...MT.cloth, gloss: .04, tag: '沙发' });
    box(sx, Y + .47, sz + .02, 1.74, .16, .68, C('#87735b'), { ...MT.cloth, gloss: .04, tag: '沙发' });
    box(sx, Y + .58, sz + .30, 1.86, .60, .20, C('#6f5d4a'), { ...MT.cloth, gloss: .04, tag: '沙发' });
    for (const s of [-1, 1])
      box(sx + s * .87, Y + .46, sz, .14, .52, .78, C('#7b6851'), { mode: 7, gloss: .04, tag: '沙发' });
    // a towel thrown over the arm, which is what a sofa in a working household has on it
    box(sx - .86, Y + .74, sz - .10, .20, .04, .46, C('#cfd8d6'), { mode: 7, gloss: .04, rz: .06 });
    shade(sx, sz, 2.00, .90, .40);
    // the tv on a stool against the north wall, small and old
    const tx = 1.55, tz = ZM - .28;
    box(tx, Y + .21, tz, .70, .38, .40, C('#8a6f4c'), { mode: 6, gloss: .18 });
    box(tx, Y + .58, tz, .60, .36, .34, C('#2b2f33'), { hard: true, gloss: .30, tag: '电视' });
    const scr = box(tx, Y + .60, tz - .175, .50, .28, .010, C('#3a4650'),
                    { hard: true, mode: 1, glow: .05, gloss: .40, tag: '电视' });
    A.emitter('f8tv', [scr], .18);
    cyl(tx + .22, Y + .80, tz - .02, .004, .30, c.steelM, { rz: .3, gloss: .5 });
    shade(tx, tz, .80, .48, .32);
    // the folding table and two plastic stools — he eats standing up more often than not
    const dx = 4.85, dz = 1.15;
    cyl(dx, Y + .735, dz, .46, .035, C('#c8b48c'), { mode: 6, gloss: .22, tag: '桌子' });
    cyl(dx, Y + .715, dz, .44, .012, C('#a8905f'), { mode: 6, gloss: .18 });
    for (const [ox, oz] of [[-.24, -.24], [.24, -.24], [-.24, .24], [.24, .24]])
      cyl(dx + ox, Y + .36, dz + oz, .016, .70, c.steelD, { rz: ox * .08, rx: oz * .08, gloss: .48 });
    box(dx + .04, Y + .30, dz, .40, .022, .40, c.steelD, { hard: true, gloss: .40 });
    shade(dx, dz, .96, .96, .36);
    for (const [ox, oz] of [[-.62, .30], [.58, -.34]]) {
      taper(dx + ox, Y + .20, dz + oz, .34, .40, .34, C('#b8452f'), { gloss: .28, tag: '凳子' });
      cyl(dx + ox, Y + .41, dz + oz, .155, .022, C('#c85a40'), { gloss: .30, tag: '凳子' });
      shade(dx + ox, dz + oz, .36, .36, .28);
    }
    // a thermos and a chipped mug on the table, which is the whole of the dining set
    cyl(dx - .12, Y + .885, dz + .06, .062, .265, C('#2f5a3a'), { gloss: .40, tag: '暖水瓶' });
    taper(dx - .12, Y + 1.045, dz + .06, .124, .056, .124, C('#d8d2c2'), { gloss: .38, tag: '暖水瓶' });
    cyl(dx - .12, Y + 1.09, dz + .06, .030, .036, C('#8a5a3a'), { gloss: .26, tag: '暖水瓶' });
    cyl(dx + .16, Y + .805, dz - .10, .042, .105, C('#e8e4d8'), { gloss: .38, tag: '杯子' });
    cyl(dx + .21, Y + .805, dz - .10, .020, .012, C('#e8e4d8'), { rz: PI / 2, gloss: .38 });
  })();
  stop(1.00, 2.92, PZ, PZ + .90);
  stop(1.17, 1.93, ZM - .50, ZM);
  stop(4.33, 5.37, 0.65, 1.65);

  // --- 窗户. The only exterior wall this room has is the east one, so the window is on it, over
  // the folding table. Same bay construction as the other three: sky, skyline, reveal, frame,
  // and the pane LAST — a transparent prop still writes depth, and one built before the towers
  // deletes them.
  (function livingWindow() {
    const wz = 2.15, ww = 1.14, w0 = .95, w1 = 2.14, WX = X1 - .014;
    A.sky(box(WX, Y + (w0 + w1) / 2, wz, .012, w1 - w0 + .10, ww + .10, c.sky,
              { hard: true, mode: 1, glow: .035 }));
    let seed = 3141593;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const base = Y + w0 + .05;
    for (const [layer, bx, tint, hmax] of [[0, WX - .012, '#93a7ba', .42], [1, WX - .026, '#63788c', .88]]) {
      let z = wz - ww / 2 + .02;
      while (z < wz + ww / 2 - .05) {
        const bw = .09 + rnd() * .16, bh = .14 + rnd() * hmax;
        A.city(layer, box(bx, base + bh / 2, z + bw / 2, .010, bh, bw * .95, C(tint),
                          { hard: true, mode: 1 }));
        if (layer === 1 && bh > .38)
          for (let ry = base + .09; ry < base + bh - .05; ry += .098)
            for (const q of [-.25, .05, .28]) if (rnd() > .48)
              A.city(2, box(bx - .008, ry, z + bw / 2 + q * bw, .006, .030, .020,
                            C(rnd() > .5 ? '#ffd691' : '#c2d6e4'), { hard: true, mode: 1, glow: .16 }));
        z += bw + .014 + rnd() * .045;
      }
    }
    for (const [ry, rz, rh, rw] of [[w0 - .05, wz, .10, ww + .20], [w1 + .05, wz, .10, ww + .20],
                                    [(w0 + w1) / 2, wz - ww / 2 - .05, w1 - w0, .10],
                                    [(w0 + w1) / 2, wz + ww / 2 + .05, w1 - w0, .10]])
      box(X1 - .058, Y + ry, rz, .11, rh, rw, c.wall, { hard: true, gloss: .10, ...MT.plaster });
    const wf = (y, z, h, w) => box(X1 - .108, Y + y, z, .05, h, w, c.white,
                                   { hard: true, gloss: .30, tag: '窗户' });
    wf(w0 + .015, wz, .06, ww + .06); wf(w1 - .015, wz, .06, ww + .06);
    wf((w0 + w1) / 2, wz - ww / 2 + .03, w1 - w0, .06);
    wf((w0 + w1) / 2, wz + ww / 2 - .03, w1 - w0, .06);
    wf((w0 + w1) / 2, wz, w1 - w0, .05);
    box(X1 - .086, Y + (w0 + w1) / 2, wz, .010, w1 - w0 - .06, ww - .06, c.glass,
        { hard: true, mode: 18, alpha: .12, gloss: .78, tag: '窗户' });
    box(X1 - .18, Y + w0 - .045, wz, .24, .05, ww + .20, c.white, { hard: true, gloss: .28, tag: '窗户' });
    // a jar of chopsticks and a pot of soaking beans, because even this sill is the kitchen's
    cyl(X1 - .20, Y + w0 + .075, wz - .34, .050, .14, C('#dfe8ea'), { mode: 18, alpha: .32, gloss: .80 });
    cyl(X1 - .20, Y + w0 + .050, wz - .34, .044, .085, C('#c8b48c'), { gloss: .26 });
    cyl(X1 - .20, Y + w0 + .060, wz + .34, .060, .11, C('#b8412f'), { gloss: .30 });
  })();
  TH('窗户', X1 - .16, Y + 1.55, 2.15, '窗外是别人家的窗。', 'Outside the window are other people\'s windows.',
     '窗 window + 户 door-leaf; together, the fitting.', 5.20, 2.18, 2.1);

  // --- the restaurant scars. A burn on the skirting by the kitchen door where a pan was set
  // down. This is a floor about a job, so the job should mark it.
  box(0.62, Y + .065, PZ + 1.02, .022, .11, .30, C('#3b2c20'), { hard: true, gloss: .16 });

  // --- lighting. One bare bulb on a flex, warm and not enough of it, which is exactly the point:
  // the kitchen is lit like a workshop and this room is lit like an afterthought.
  cyl(3.10, CY - .12, 1.60, .004, .24, C('#2b2f33'), { gloss: .3 });
  ball(3.10, CY - .28, 1.60, .045, .058, .045, C('#fff0cd'), { mode: 1, glow: .10 });
  cyl(3.10, CY - .235, 1.60, .022, .045, C('#d8d2c2'), { gloss: .34 });
  light(3.10, CY - .34, 1.60, C('#ffe2ac'), .56, 3.60);
  glowP(M.trs(3.10, Y + .026, 1.60, 0, 3.40, 1, 2.60), C('#ffdca8'), .09);

  // ==================================================================== 里屋 the back room
  //
  // z -5.0 .. 0.2, the whole width. West of x 0.7 it is the 生活阳台 — the working balcony that
  // every flat here has and that this one has turned into a larder. East of it is the bed, and
  // the bed is the plainest thing in the building. The two are divided by nothing but a wire and
  // a curtain, because the wall was never worth building.

  // --- the glazing along the south wall of the larder, and the city eight floors down.
  (function balconyGlazing() {
    const gz = ZS + .014, g0 = .34, g1 = 2.22;
    A.sky(box(-2.50, Y + (g0 + g1) / 2, gz, 6.30, g1 - g0 + .06, .012, c.sky,
              { hard: true, mode: 1, glow: .035 }));
    let seed = 271828;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const base = Y + g0 + .10;
    for (const [layer, bz, tint, hmax] of [[0, gz + .012, '#93a7ba', .62], [1, gz + .028, '#63788c', 1.16]]) {
      let x = -5.66;
      while (x < 0.60) {
        const bw = .22 + rnd() * .40, bh = .22 + rnd() * hmax;
        A.city(layer, box(x + bw / 2, base + bh / 2, bz, bw * .96, bh, .010, C(tint),
                          { hard: true, mode: 1 }));
        if (rnd() > .6) A.city(layer, box(x + bw / 2, base + bh + .03, bz, bw * .5, .06, .010,
                                          C(tint), { hard: true, mode: 1 }));
        if (layer === 1 && bh > .55)
          for (let ry = base + .12; ry < base + bh - .08; ry += .125)
            for (const q of [-.28, 0, .28]) if (rnd() > .46)
              A.city(2, box(x + bw / 2 + q * bw, ry, bz + .008, .030, .042, .006,
                            C(rnd() > .5 ? '#ffd691' : '#c2d6e4'), { hard: true, mode: 1, glow: .16 }));
        x += bw + .03 + rnd() * .10;
      }
    }
    // the aluminium sliding frame, four lights and two mullions
    const fr = (x, y, w, h) => box(x, Y + y, ZS + .085, w, h, .05, c.alu,
                                   { hard: true, gloss: .42, tag: '窗户', ...MT.metal });
    fr(-2.50, g0 - .03, 6.34, .07); fr(-2.50, g1 + .03, 6.34, .07);
    for (const x of [-5.66, -3.60, -1.50, 0.60]) fr(x, (g0 + g1) / 2, .07, g1 - g0);
    fr(-2.50, (g0 + g1) / 2 + .50, 6.34, .05);
    // the panes last, so they blend over the skyline instead of deleting it
    for (const [x, w] of [[-4.63, 2.00], [-2.55, 2.04], [-0.45, 2.04]])
      box(x, Y + (g0 + g1) / 2, ZS + .064, w, g1 - g0 - .08, .010, c.glass,
          { hard: true, mode: 18, alpha: .13, gloss: .78, tag: '窗户' });
    box(-2.50, Y + g0 - .085, ZS + .13, 6.34, .06, .22, C('#c8c2b2'), { hard: true, gloss: .30 });
    box(-2.50, Y + g1 + .10, ZS + .06, 6.34, .05, .10, c.wall, { hard: true, gloss: .14 });
  })();

  // --- the bed end's own window, in the hole left in the south wall at x 2.90 .. 5.20. Smaller,
  // meaner and dirtier than the balcony's, which is the whole story of this half of the flat.
  (function bedWindow() {
    const gz = ZS + .014, g0 = .92, g1 = 2.04;
    A.sky(box(4.05, Y + (g0 + g1) / 2, gz, 2.24, g1 - g0 + .06, .012, c.sky,
              { hard: true, mode: 1, glow: .035 }));
    let seed = 6180339;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const base = Y + g0 + .04;
    for (const [layer, bz, tint, hmax] of [[0, gz + .012, '#93a7ba', .40], [1, gz + .028, '#63788c', .78]]) {
      let x = 2.96;
      while (x < 5.14) {
        const bw = .13 + rnd() * .26, bh = .16 + rnd() * hmax;
        A.city(layer, box(x + bw / 2, base + bh / 2, bz, bw * .95, bh, .010, C(tint),
                          { hard: true, mode: 1 }));
        if (layer === 1 && bh > .40)
          for (let ry = base + .10; ry < base + bh - .06; ry += .11)
            for (const q of [-.26, .06, .28]) if (rnd() > .5)
              A.city(2, box(x + bw / 2 + q * bw, ry, bz + .008, .026, .036, .006,
                            C(rnd() > .5 ? '#ffd691' : '#c2d6e4'), { hard: true, mode: 1, glow: .16 }));
        x += bw + .02 + rnd() * .07;
      }
    }
    const fr = (x, y, w, h) => box(x, Y + y, ZS + .085, w, h, .05, C('#c8c2b2'),
                                   { hard: true, gloss: .28, tag: '窗户' });
    fr(4.05, g0 - .03, 2.30, .07); fr(4.05, g1 + .03, 2.30, .07);
    for (const x of [2.94, 4.05, 5.16]) fr(x, (g0 + g1) / 2, .07, g1 - g0);
    for (const x of [3.50, 4.61])
      box(x, Y + (g0 + g1) / 2, ZS + .064, 1.06, g1 - g0 - .08, .010, c.glass,
          { hard: true, mode: 18, alpha: .13, gloss: .78, tag: '窗户' });
    box(4.05, Y + g0 - .075, ZS + .12, 2.30, .05, .20, C('#c8c2b2'), { hard: true, gloss: .28 });
    // a curtain on a wire, half drawn, which is all the privacy this end of the flat has
    cyl(4.05, Y + g1 + .12, ZS + .16, .005, 2.34, c.steelM, { rz: PI / 2, gloss: .5 });
    for (const [cx, cw] of [[3.16, .60], [4.98, .48]])
      box(cx, Y + 1.44, ZS + .16, cw, 1.28, .05, C('#b8b2a0'), { ...MT.cloth, gloss: .04, tag: '窗帘' });
  })();

  // --- 腊肉. The cured pork belly hanging on a rail across the balcony, which is what this
  // window is actually for. Slab, string, fat edge, and one whole cured duck at the end of it.
  (function cured() {
    const rz = ZS + .70, ry = Y + 1.94;
    cyl(-2.90, ry, rz, .014, 5.60, c.steelM, { rz: PI / 2, gloss: .58, ...MT.metal });
    for (const s of [-1, 1])
      box(-2.90 + s * 2.76, ry + .06, rz, .035, .16, .05, c.steelD, { hard: true, gloss: .5 });
    for (let i = 0; i < 6; i++) {
      const hx = -4.90 + i * .52;
      cyl(hx, ry - .10, rz, .003, .20, C('#c8b894'), { gloss: .08 });
      box(hx, ry - .40, rz, .105, .40, .055, c.pork, { hard: true, gloss: .30, ry: .1 * (i - 2), tag: '腊肉' });
      box(hx, ry - .40, rz - .030, .095, .38, .010, C('#5d2a20'), { hard: true, gloss: .34, ry: .1 * (i - 2) });
      box(hx, ry - .215, rz, .105, .055, .056, c.porkF, { hard: true, gloss: .26, ry: .1 * (i - 2) });
    }
    // 腊鸭 — the flattened cured duck, which hangs differently from anything else
    const dx = -1.55;
    cyl(dx, ry - .10, rz, .003, .20, C('#c8b894'), { gloss: .08 });
    box(dx, ry - .46, rz, .34, .52, .045, C('#8a4a2c'), { hard: true, gloss: .32, tag: '腊鸭' });
    box(dx, ry - .30, rz - .026, .28, .22, .010, C('#a85c30'), { hard: true, gloss: .36 });
    cap(dx, ry - .76, rz, .035, .16, .035, C('#7d3a2c'), { gloss: .30 });
    // a bunch of 香肠 twisted into links, on the last hook
    for (let i = 0; i < 5; i++)
      cap(-0.85 + (i % 2) * .035, ry - .22 - i * .085, rz, .026, .16, .026, C('#8e2f22'),
          { rz: .3 + (i % 2) * .5, gloss: .34, tag: '香肠' });
    cyl(-0.85, ry - .10, rz, .003, .20, C('#c8b894'), { gloss: .08 });
  })();

  // --- 泡菜坛子. A row of glazed pickling jars along the balcony floor, the water seal round
  // each lip, one with the lid off and the cabbage showing.
  (function pickleJars() {
    for (let i = 0; i < 5; i++) {
      const jx = -5.30 + i * .58, jz = ZS + .46, s = i === 2 ? 1.12 : 1.0;
      taper(jx, Y + .17 * s, jz, .34 * s, .30 * s, .34 * s, c.jar, { gloss: .46 });
      taper(jx, Y + .40 * s, jz, .30 * s, .16 * s, .30 * s, c.jarL, { rz: PI, gloss: .48 });
      cyl(jx, Y + .49 * s, jz, .17 * s, .05 * s, c.jar, { gloss: .50 });
      if (i === 3) {
        cyl(jx, Y + .52, jz, .13, .04, C('#c9d5c0'), { mode: 18, alpha: .5, gloss: .7 });
        for (const [dx2, dz2] of [[-.03, .02], [.04, -.02], [.00, .05]])
          cap(jx + dx2, Y + .55, jz + dz2, .030, .12, .030, c.cabbage, { rz: 1.2, ry: dx2 * 8, gloss: .20 });
      } else {
        cyl(jx, Y + .535, jz, .135, .055, c.jarL, { gloss: .48 });
        cyl(jx, Y + .565, jz, .045, .030, c.jar, { gloss: .46 });
      }
      shade(jx, jz, .44, .44, .30);
    }
  })();
  stop(-5.62, -2.66, ZS, ZS + .74);

  // --- the rest of the larder: sacks, the freezer, crates, and the washing line with the whites
  // on it. A chef's balcony dries laundry and stores food at the same time and nobody minds.
  (function larder() {
    // sacks of rice and flour, leaning on each other in the corner
    for (const [sx, sz, w, h, cl, t] of [[-5.42, -1.00, .46, .62, C('#d8cfb4'), '大米'],
                                         [-5.42, -1.62, .44, .58, C('#e0d8c0'), '面粉'],
                                         [-4.92, -1.22, .40, .54, C('#d0c8ac'), '']]) {
      box(sx, Y + h / 2 + .02, sz, w, h, .34, cl, { gloss: .08, ry: .1, rz: .04 });
      box(sx, Y + h + .01, sz, w - .08, .06, .26, C('#c8bfa2'), { gloss: .08, ry: .1 });
      if (t) G(sx, Y + h / 2, sz - .18, PI, t, { size: .062, gap: .012, color: C('#8a4a2c') });
      shade(sx, sz, w + .10, .44, .32);
    }
    // the chest freezer, humming, with a crate on the lid
    const fx = -2.40, fz = -0.97;
    box(fx, Y + .38, fz, 1.50, .72, .70, C('#e4e2da'), { hard: true, gloss: .34, tag: '冰柜' });
    box(fx, Y + .755, fz, 1.54, .05, .74, C('#eeece4'), { hard: true, gloss: .38, tag: '冰柜' });
    box(fx - .55, Y + .795, fz - .02, .30, .03, .30, C('#d8d5cc'), { hard: true, gloss: .30 });
    cyl(fx + .60, Y + .70, fz - .355, .012, .26, c.steelM, { rz: PI / 2, gloss: .54 });
    box(fx - .62, Y + .30, fz - .358, .10, .07, .012, C('#2b2f33'), { hard: true, gloss: .40 });
    cyl(fx - .62, Y + .30, fz - .366, .008, .010, C('#4ad06a'), { rz: PI / 2, mode: 1, glow: .20 });
    box(fx + .30, Y + .90, fz, .48, .24, .34, c.crate, { gloss: .26, ry: .06 });
    shade(fx, fz, 1.64, .84, .38);
    // stacked crates of greens against the partition
    for (const [i, cl] of [[0, c.crateR], [1, c.crate], [2, c.crateR]]) {
      box(-1.05 - i * .02, Y + .13 + i * .215, -4.25, .58, .21, .40, cl, { gloss: .26, ry: .05 * i });
      box(-1.05 - i * .02, Y + .234 + i * .215, -4.25, .50, .012, .32, C('#1e1c19'),
          { hard: true, gloss: .10, ry: .05 * i });
    }
    for (let i = 0; i < 6; i++) {
      const a = i * 2.399;
      cap(-1.05 + Math.cos(a) * .16, Y + .80 + (i % 3) * .03, -4.25 + Math.sin(a) * .10,
          .036, .19, .036, i % 2 ? c.leaf : c.leafD, { ry: a, rz: Math.cos(a) * .5, gloss: .22 });
    }
    shade(-1.05, -4.25, .70, .48, .34);
    // 晾衣绳 — the line, and two sets of whites drying stiff on it
    cyl(-2.60, Y + 2.02, -2.60, .004, 6.20, C('#d8d2c2'), { rz: PI / 2, gloss: .12 });
    for (const [jx, kind] of [[-4.30, 0], [-3.30, 1], [-2.20, 0], [-1.30, 1], [-0.40, 2]]) {
      box(jx, Y + 1.99, -2.60, .09, .05, .05, C('#c8c2b2'), { hard: true, gloss: .3 });
      if (kind === 0) {
        box(jx, Y + 1.66, -2.60, .42, .62, .10, C('#f0eee6'), { gloss: .05, tag: '厨师服' });
        for (const s of [-1, 1]) cap(jx + s * .23, Y + 1.72, -2.60, .055, .42, .055, C('#eae7dd'),
                                     { rz: s * .16, gloss: .05 });
      } else if (kind === 1) {
        box(jx, Y + 1.68, -2.60, .34, .58, .08, C('#dfe2e6'), { gloss: .05 });
      } else {
        for (let i = 0; i < 3; i++)
          box(jx + i * .13, Y + 1.80, -2.60, .11, .34, .04, C('#e8e4d8'), { gloss: .05, tag: '毛巾' });
      }
    }
    // a mop, a bucket and the drain in the corner, which is what makes it a 阳台 and not a room
    cyl(-5.62, Y + .70, -3.60, .014, 1.36, C('#9a7c4e'), { rz: .09, gloss: .18 });
    cap(-5.74, Y + .11, -3.60, .10, .16, .22, C('#d8d3c2'), { gloss: .06 });
    cyl(-5.30, Y + .14, -3.62, .135, .26, c.plastic, { gloss: .28 });
    cyl(-5.30, Y + .265, -3.62, .118, .012, C('#8d9aa0'), { gloss: .30 });
    cyl(-4.10, Y + .020, ZS + .55, .075, .012, c.steelD, { gloss: .46 });
    shade(-5.44, -3.60, .60, .40, .30);
  })();
  stop(-5.70, -4.60, -1.90, -0.70);
  stop(-3.20, -1.60, -1.37, -0.59);
  stop(-1.38, -0.72, -4.50, -4.00);

  // --- the bed end. Two objects and a wire, and that is the whole of it.
  (function bedEnd() {
    const bx = 5.05, bz = -2.50;
    box(bx, Y + .21, bz, 1.62, .38, 2.02, C('#8a6f4c'), { mode: 6, gloss: .18, tag: '床' });
    box(bx, Y + .47, bz, 1.56, .16,1.96, C('#cfc4ac'), { mode: 7, gloss: .04, tag: '床' });
    box(bx, Y + .60, bz + .30, 1.50, .16, 1.30, C('#8a9db0'), { mode: 7, gloss: .04, tag: '被子' });
    for (const s of [-1, 1])
      cap(bx + s * .38, Y + .62, bz - .74, .24, .40, .16, C('#e8e4d8'), { rz: PI / 2, gloss: .04, tag: '枕头' });
    box(bx, Y + .78, bz - 1.10, 1.62, .78, .06, C('#7d6446'), { mode: 6, gloss: .20, tag: '床' });
    shade(bx, bz, 1.76, 2.16, .40);
    // a stool for a bedside table, with a thermos, a mug and a clock on it
    const nx = 3.90, nz = -1.70;
    box(nx, Y + .22, nz, .42, .40, .42, C('#9a7c52'), { mode: 6, gloss: .18 });
    box(nx, Y + .43, nz, .46, .03, .46, C('#b8935f'), { mode: 6, gloss: .20 });
    cyl(nx - .08, Y + .60, nz, .058, .30, C('#b8342a'), { gloss: .40, tag: '暖水瓶' });
    taper(nx - .08, Y + .77, nz, .116, .052, .116, C('#d8d2c2'), { gloss: .38, tag: '暖水瓶' });
    cyl(nx + .10, Y + .50, nz - .10, .040, .10, C('#e8e4d8'), { gloss: .38 });
    box(nx + .09, Y + .50, nz + .10, .11, .11, .05, C('#c8bfa2'), { hard: true, gloss: .24 });
    A.dial(nx + .09, Y + .50, nz + .075, PI, []);
    shade(nx, nz, .52, .52, .32);
    // an electric fan on the floor, pointed at the bed
    cyl(4.10, Y + .022, -3.40, .16, .030, C('#2b2f33'), { gloss: .30 });
    cyl(4.10, Y + .34, -3.40, .022, .62, C('#c8c2b2'), { gloss: .34 });
    cyl(4.10, Y + .72, -3.40, .175, .050, C('#2b2f33'), { rx: PI / 2, ry: .5, gloss: .28, tag: '电风扇' });
    cyl(4.10, Y + .72, -3.42, .165, .020, C('#8f979d'), { rx: PI / 2, ry: .5, gloss: .50, alpha: .55 });
    shade(4.10, -3.40, .36, .36, .28);
    // the clothes wire, with two shirts and the spare whites
    cyl(2.10, Y + 1.92, -3.20, .006, 1.90, c.steelM, { rz: PI / 2, gloss: .5 });
    for (const [hx, cl] of [[1.55, C('#41556d')], [1.95, C('#c8c2b2')], [2.40, C('#f0eee6')]]) {
      cyl(hx, Y + 1.88, -3.20, .004, .10, c.steelM, { gloss: .5 });
      box(hx, Y + 1.55, -3.20, .34, .58, .07, cl, { gloss: .05 });
      for (const s of [-1, 1]) cap(hx + s * .19, Y + 1.60, -3.20, .048, .38, .048, cl,
                                   { rz: s * .14, gloss: .05 });
    }
  })();
  stop(4.20, 5.92, -3.55, -1.42);

  // --- lighting. Two tubes, both cheap, both cold, and nothing else. The balcony's is the one
  // that is actually on, because that is where the food is.
  for (const [lx, lz, p] of [[-2.60, -2.10, .70], [4.20, -2.40, .42]]) {
    box(lx, CY - .050, lz, 1.10, .065, .11, c.steelM, { hard: true, gloss: .36 });
    box(lx, CY - .092, lz, 1.02, .028, .075, C('#f2f6ff'), { hard: true, mode: 1, glow: .09 });
    light(lx, CY - .19, lz, C('#dbe6f0'), p, 3.80);
  }
  glowP(M.trs(-2.60, Y + .026, -2.30, 0, 3.60, 1, 3.00), C('#e6eef6'), .09);

  // ==================================================================== 词 the words
  //
  // Food vocabulary is the most useful vocabulary in this game, so the kitchen carries most of
  // it. Every `focus` below is a spot on the floor a body can genuinely stand on — measured
  // against the collider list above, not guessed:
  //
  //   厨房  x -5.05 .. 0.10   z 1.05 .. 2.20      (the galley between the two runs)
  //   客厅  x  0.70 .. 5.70   z 1.28 .. 2.55      (between the sofa and the tv)
  //   里屋  x -5.70 .. 5.70   z-4.70 ..-0.10
  //   走廊  x -5.70 .. 5.70   z 3.50 .. 4.58      (in front of the shafts), 3.50..5.90 elsewhere
  //
  // A word focused inside its own clutter is a word that reads "too far" from every angle in the
  // room, so none of these sits on the thing it names.

  // ---- 厨房. The room itself, then the fire, then the tools, then what goes in the pan.
  TH('厨房', -3.00, Y + 1.30, 2.30, '这个厨房比客厅还大。', 'This kitchen is bigger than the living room.',
     '厨 kitchen + 房 room. 下厨 is to cook; 厨师 is the man who does it for a living.', -3.00, 1.70, 2.6);
  TH('炒锅', WOKX, KTOP + .10, WOKZ - .18, '锅已经热了。', 'The wok is already hot.',
     '锅 is the pan itself; 炒 is the quick high-heat frying it is for. 炒锅 — a wok.',
     WOKX, 1.95, 1.6, '炒锅');
  TH('锅铲', WOKX - .18, KTOP + .18, WOKZ - .10, '他用锅铲翻了两下。', 'He turns it twice with the spatula.',
     '锅 pan + 铲 shovel. The shovel that lives in the wok.', WOKX - .40, 1.95, 1.5);
  TH('灶台', HOBX - .55, KTOP + .10, KZ - .30, '灶台上有四个火眼。', 'The hob has four burners.',
     '灶 stove + 台 platform. 煤气灶 / 燃气灶 is the gas one.', HOBX - .55, 2.00, 1.7);
  TH('火', WOKX + .16, KTOP - .06, WOKZ - .22, '火太小了，开大一点。', 'The flame is too low — turn it up.',
     '火 fire. 大火 high heat, 小火 low, 中火 medium — a recipe here is written in these.',
     WOKX + .35, 1.95, 1.5, '炒锅');
  TH('抽油烟机', WOKX - .10, Y + 1.58, KZ - .28, '抽油烟机声音很大。', 'The extractor is loud.',
     '抽 to draw + 油烟 oily smoke + 机 machine. Every Chinese kitchen has one and it is never quiet.',
     WOKX - .10, 2.00, 2.0);
  TH('蒸锅', HOBX - .26, KTOP + .40, KZ + .04, '蒸锅里蒸着包子。', 'There are buns steaming in the steamer.',
     '蒸 to steam + 锅 pan. 蒸 is the third of the three verbs — 炒 fry, 煮 boil, 蒸 steam.',
     HOBX - .26, 2.00, 1.6);
  TH('高压锅', HOBX + .26, KTOP + .20, KZ - .26, '高压锅炖着牛肉。', 'Beef is stewing in the pressure cooker.',
     '高 high + 压 pressure + 锅 pan.', HOBX + .26, 2.00, 1.6);
  TH('菜刀', BLKX + .02, Y + 1.30, ZM - .12, '菜刀就挂在墙上。', 'The cleaver hangs on the wall.',
     '菜 vegetable/dish + 刀 knife — the square Chinese cleaver, which does everything.',
     BLKX, 2.00, 1.7);
  TH('案板', BLKX, KTOP + .19, KZ - .20, '案板上还有葱花。', 'There is chopped spring onion on the board.',
     '案 table + 板 board. A round block cut across the trunk, not a flat plank.', BLKX, 2.00, 1.6);
  TH('水池', X0 + .34, KTOP + .04, 1.62, '水池里泡着碗。', 'Bowls are soaking in the sink.',
     '水 water + 池 pool. 洗碗 is to wash up.', -4.85, 1.62, 1.7);
  TH('冰柜', -2.40, Y + .80, -0.55, '冰柜里全是肉。', 'The freezer is full of meat.',
     '冰 ice + 柜 cabinet. 冰箱 is the fridge, 冰柜 the chest freezer.', -2.40, -0.20, 1.8, '冰柜');
  TH('电饭锅', X0 + .38, Y + 1.00, 0.62, '电饭锅在保温。', 'The rice cooker is keeping warm.',
     '电 electric + 饭 cooked rice + 锅 pan. 保温 — keeping warm — is what the light says.',
     -4.70, 1.30, 1.7);
  TH('酱油', -3.06, Y + 1.32, PZ + .16, '先放一点生抽。', 'Add a little light soy first.',
     '酱 sauce + 油 oil. 生抽 light soy for salt, 老抽 dark soy for colour. They are not the same bottle.',
     -3.06, 1.15, 1.6);
  TH('醋', -2.34, Y + 1.32, PZ + .16, '再来两滴香醋。', 'Then two drops of vinegar.',
     '醋 vinegar. 香醋 is the dark aromatic kind; 吃醋, to eat vinegar, is to be jealous.',
     -2.34, 1.15, 1.6);
  TH('油', -1.54, Y + 1.28, PZ + .16, '锅里放油。', 'Put the oil in the pan.',
     '油 oil or fat. 香油 sesame, 花生油 peanut, 油腻 greasy.', -1.60, 1.15, 1.6);
  TH('盐', -1.26, Y + 1.28, PZ + .16, '盐少放一点。', 'Go easy on the salt.',
     '盐 salt. 咸 is the taste of it; 淡 is not enough of it.', -1.26, 1.15, 1.6);
  TH('糖', -1.00, Y + 1.28, PZ + .16, '放糖提鲜。', 'A little sugar brings the flavour up.',
     '糖 sugar, and also sweets. 甜 is sweet.', -1.00, 1.15, 1.6);
  TH('花椒', -2.80, Y + 1.66, PZ + .16, '花椒麻，辣椒辣。',
     'Sichuan pepper numbs; chilli burns.',
     '花 flower + 椒 pepper. 麻 — the tingling numbness — is its own taste word here.',
     -2.80, 1.15, 1.6);
  TH('八角', -3.06, Y + 1.66, PZ + .16, '炖肉要放八角。', 'Star anise goes in when you stew meat.',
     '八 eight + 角 horn: the eight points of the star.', -3.06, 1.15, 1.6);
  TH('辣椒', -5.30, Y + 1.30, ZM - .14, '干辣椒挂在墙上。', 'Dried chillies hang on the wall.',
     '辣 spicy-hot + 椒 pepper. 辣 is a taste, 烫 is a temperature — never mix them up.',
     -4.90, 1.60, 1.8);
  TH('蒜', -5.56, Y + 1.30, ZM - .13, '剥两瓣蒜。', 'Peel two cloves of garlic.',
     '蒜 garlic. 一瓣蒜 is one clove; 一头蒜 is the whole bulb.', -4.90, 1.72, 1.8);
  TH('姜', X0 + .20, Y + 1.17, 2.00, '切两片姜去腥。', 'Two slices of ginger take the smell off.',
     '姜 ginger. 葱姜蒜 — spring onion, ginger, garlic — is the trio nearly everything starts with.',
     -4.90, 1.95, 1.7);
  TH('葱', X0 + .20, Y + 1.28, 1.26, '窗台上养着葱。', 'Spring onions are growing on the sill.',
     '葱 spring onion. Bought by the bunch, the roots kept in water so they grow back.',
     -4.90, 1.35, 1.7);
  TH('白菜', BLKX - .04, KTOP + .26, KZ + .06, '白菜切一半。', 'Cut the cabbage in half.',
     '白 white + 菜 vegetable. 大白菜 is the winter staple of the north.', BLKX - .10, 2.00, 1.6);
  TH('鸡蛋', BLKX + .18, KTOP + .21, KZ - .06, '打两个鸡蛋。', 'Crack two eggs.',
     '鸡 chicken + 蛋 egg. 炒鸡蛋 — scrambled egg — is the first dish anybody learns.',
     BLKX + .20, 2.00, 1.5);
  TH('碗', -1.10, Y + 1.62, PZ + .16, '碗放在架子上。', 'The bowls are on the shelf.',
     '碗 bowl. 一碗饭 — one bowl of rice — is how a portion is counted.', -1.10, 1.15, 1.6);
  TH('筷子', -0.50, Y + 1.72, PZ + .16, '筷子插在筒里。', 'The chopsticks stand in the pot.',
     '筷子 chopsticks. 一双筷子 — one pair — never 一个.', -0.50, 1.15, 1.6);
  TH('暖水瓶', -2.28, Y + 2.10, PZ + .16, '暖水瓶里还有热水。', 'There is still hot water in the flask.',
     '暖 warm + 水 water + 瓶 bottle. 开水 — boiled water — is what goes in it.',
     -2.28, 1.15, 1.7);
  TH('保温桶', -1.90, Y + 2.10, PZ + .16, '保温桶是从店里带回来的。',
     'The insulated carrier came back from the restaurant.',
     '保温 to keep the temperature + 桶 barrel.', -1.90, 1.15, 1.7);
  TH('大米', -0.10, KTOP + .28, PZ + .18, '米袋子快空了。', 'The rice sack is nearly empty.',
     '大米 raw rice; 饭 is what it becomes. 米饭 is the cooked bowl.', -0.30, 1.15, 1.7);

  // ---- 客厅 and 玄关.
  TH('厨师服', 3.75, Y + 1.40, ZM - .16, '厨师服挂在门口。', 'The chef\'s whites hang by the door.',
     '厨师 chef + 服 clothing. 厨师帽 is the tall hat beside it.', 3.75, 2.30, 1.7);
  TH('证书', 1.35, Y + 1.62, ZM - .04, '墙上挂着他的厨师证。', 'His chef\'s certificate hangs on the wall.',
     '证书 a certificate; 中式烹调师 is the grade on it — Chinese-cuisine cook.', 1.35, 2.15, 2.0);
  TH('沙发', 1.95, Y + .60, PZ + .60, '沙发是从老店搬来的。', 'The sofa came from the old restaurant.',
     '沙发 is a loan of "sofa" — 沙 sand + 发, chosen for the sound alone.', 1.95, 1.58, 1.7);
  TH('桌子', 4.85, Y + .78, 1.15, '桌子上放着暖水瓶。', 'A thermos sits on the table.',
     '桌子 table. 饭桌 the dining one, 书桌 the desk.', 3.85, 1.60, 1.9);
  TH('鞋柜', 5.10, Y + .60, ZM - .32, '鞋都放在鞋柜里。', 'The shoes all go in the shoe cabinet.',
     '鞋 shoe + 柜 cabinet. In the 玄关, and the shoes never come past it.', 5.10, 2.32, 1.8);
  TH('电视', 1.55, Y + .60, ZM - .46, '电视一直开着。', 'The television is always on.',
     '电 electric + 视 to view.', 1.55, 1.60, 1.8);

  // ---- 里屋.
  TH('腊肉', -3.60, Y + 1.55, ZS + .70, '阳台上挂着腊肉。', 'Cured pork hangs on the balcony.',
     '腊 the twelfth month + 肉 meat: meat cured in the cold at the end of the year.',
     -3.60, ZS + 1.45, 1.9);
  TH('香肠', -0.85, Y + 1.50, ZS + .70, '香肠是自己灌的。', 'He made the sausages himself.',
     '香 fragrant + 肠 intestine. 灌香肠 — to stuff sausage — is a winter job.',
     -0.85, ZS + 1.45, 1.8);
  TH('泡菜', -4.14, Y + .40, ZS + .46, '坛子里泡着白菜。', 'There is cabbage pickling in the jar.',
     '泡 to soak + 菜 vegetable. The 坛子 is the glazed jar with a water seal round its lip.',
     -4.14, ZS + 1.40, 1.8);
  TH('阳台', -2.60, Y + 1.30, ZS + .90, '阳台上又是菜又是衣服。',
     'The balcony has vegetables on it and washing.',
     '阳 sun + 台 platform. A 生活阳台 is the working one — laundry, storage, food.',
     -2.60, ZS + 1.70, 2.4);
  TH('窗户', -2.50, Y + 1.30, ZS + .10, '从窗户能看见半个城。', 'You can see half the city from the window.',
     '窗 window + 户 door-leaf; together, the fitting.', -2.50, ZS + 1.10, 2.0);
  TH('床', 5.05, Y + .55, -2.50, '床上就一床被子。', 'There is one quilt on the bed and nothing else.',
     '床 bed. 一床被子 — the measure word for a quilt is 床 as well.', 3.76, -2.50, 2.0);
  TH('电风扇', 4.10, Y + .74, -3.40, '电风扇对着床吹。', 'The fan points at the bed.',
     '电 electric + 风 wind + 扇 fan.', 3.66, -3.20, 1.8);

  // ---- 走廊.
  TH('走廊', -0.60, Y + 1.60, 4.20, '走廊里堆满了菜。', 'The landing is piled with vegetables.',
     '走 walk + 廊 covered passage. Up here it is also a delivery bay.', -0.60, 4.20, 3.0);
  TH('门', FX, Y + 1.20, ZM + .10, '门开着，屋里全是油烟味。',
     'The door is open and the flat smells of cooking.',
     '门 is a door or a gate — and the 门 in 门口, the doorway.', FX, 3.95, 1.9);
  TH('门帘', FX, Y + 1.10, ZM - .12, '门帘挡不住味道。', 'The strip curtain does not keep the smell in.',
     '门 door + 帘 curtain. Plastic strips in the doorway of every kitchen in the country.',
     FX, 3.80, 1.6);
  TH('邻居', N4, Y + 1.30, ZN - .10, '邻居总说他家太香了。',
     'The neighbours always say his flat smells too good.',
     '邻 neighbouring + 居 to dwell.', N4, 4.30, 1.9);
  TH('春联', FX - .60, Y + 1.48, ZM + .06, '他的春联写的是吃的。',
     'His door couplets are about food.',
     '春 spring + 联 a matched pair of lines. 以食为天 — food is heaven — is the crosspiece.',
     FX - .40, 3.85, 1.9);
  TH('蔬菜', FX - 1.22, Y + .70, ZM + .40, '门口放着一箱新鲜蔬菜。',
     'A crate of fresh vegetables is by the door.',
     '蔬 vegetable + 菜 dish. 新鲜 — fresh — is the word on the crate.', FX - 1.22, 4.15, 1.8);
  TH('通知', NX, Y + 1.55, ZM + .04, '周三停燃气，他一天没法做饭。',
     'The gas is off on Wednesday, so he cannot cook all day.',
     '通 to pass through + 知 to know: to inform. 燃气 is the piped gas.', NX, 3.80, 1.8);
  TH('消防栓', HX, Y + 1.40, ZM + .18, '墙上有一个消火栓。', 'There is a hydrant on the wall.',
     '消防栓 is what you call it; 消火栓 is what is painted on the cabinet. 栓 is a plug or a valve.', HX, 3.85, 1.9);
  TH('电动车', -1.20, Y + .70, ZM + .48, '走廊里停着一辆电动车。',
     'An e-bike is parked in the corridor.',
     '电动 electrically driven + 车 vehicle. Charging inside is against every notice downstairs.',
     -1.20, 4.22, 1.9);
  TH('安全出口', X1 - .12, Y + STOP + .19, STZ, '安全出口在东头。', 'The fire exit is at the east end.',
     '安全 safe + 出口 exit. The green sign is the same in every building.', 5.30, 4.20, 2.3);
  TH('楼梯', X1 - .12, Y + 1.10, STZ, '楼梯在走廊尽头。', 'The stairs are at the end of the corridor.',
     '楼 storey + 梯 ladder. 电梯 is the lift.', 5.30, 4.20, 2.1);

  HomeF8.built = true;
  return HomeF8;
};
