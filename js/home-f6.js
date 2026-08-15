// F6 六楼 — 学生合租, a student flatshare.
//
// Registered into FlatFit (declared at the top of js/world.js). DECK_OF maps 'f6' to deck 6, so
// `A.y0` is 15.50 and every height in here is written `Y + h`. There are no literal world heights
// in this file for exactly the reason the note at the top of world.js gives.
//
// WHAT THE SHELL BUILDS ON THIS DECK. `buildShell` still leaves the slab, ceiling and perimeter to
// this module, but `buildShafts` now runs across `SHAFT_DECKS`. The real shell owns both shafts,
// moving doors, indicator and call panel; this file owns the surrounding landing/flat envelope,
// partitions and fit-out and contributes no duplicate shaft frontage or collision.
//
// THE PLAN. The building's footprint is fixed (TOWER.md): x -6..6 everywhere, z 3.2..6.2 the
// landing, z -5..3.2 the flat side. Six front doors, 601..606, of which 606 is the one that opens.
//
//   z 6.20  ┌──601───602───603──┬─shaft B─┬──shaft A──┬──604────605──┐   the landing
//   z 3.20  └──────────────────────606────────────────┴──────────────┘   (606 is the flatshare)
//   z 3.20  ┌───卧室3───┬────厨房────┬───卫生间───┬────────玄关────────┐
//   z 1.30  ├───────────┴────────────┴───走道─────┴────────────────────┤
//   z -0.40 ├────卧室1─────┬───卧室2───┬──隔断房──┬────────客厅────────┤
//   z -3.10 │              │           ├──────────┘                    │
//   z -5.00 └──────────────┴───────────┴───────────────────────────────┘
//
// 合租 is the arrangement, not the building: one flat, one lease each, four strangers, and a
// landlord who has squeezed a fifth rent out of it by standing a plasterboard box in the living
// room. That box — 隔断房 — is the whole point of the floor, so it is built to be *wrong* and
// legible as wrong at a glance: its walls stop 0.50 m short of the ceiling, its door is white PVC
// among six brown timber ones, and it has no window at all. Everything else follows from four
// people sharing a kitchen: four rice cookers, four chopstick jars, four shelves, four shampoos,
// and a whiteboard by the door keeping score of who has paid.
FlatFit['f6'] = A => {
  const HomeF6 = { built: false };
  if (!A || typeof A.box !== 'function' || !A.wall || !A.flat) {
    console.warn('home-f6: toolkit A missing box/wall/flat — floor 6 not built');
    return HomeF6;
  }

  // ------------------------------------------------------------------ the toolkit
  const box = A.box, cyl = A.cyl, ball = A.ball;
  const cap = A.cap || A.capsule || A.box;
  const taper = A.taper || A.box;
  const wall = A.wall, flat = A.flat;
  const ceil = A.ceiling || ((x, y, z, w, d, c, o) => A.flat(x, y, z, w, d, c, o));
  const glyph = A.glyph || (() => []);
  const stop = A.stop || (() => null);
  const thing = A.th || (() => null);
  const light = A.light || (() => null);
  const shade = A.shade || (() => null);
  const C = A.C, MAT = A.MAT, PI = Math.PI;

  // ------------------------------------------------------------------ the coordinate contract
  const Y = A.y0;                                  // deck 6 — 15.50. Never written as a number.
  const CR = A.CORR || { x0: -6, x1: 6, z0: 3.2, z1: 6.2, h: 2.60 };
  const FT = A.FLAT || { x0: -6, x1: 6, z0: -5.0, z1: 3.2, h: 2.60 };
  const LF = A.LIFT || { x0: 1.6, x1: 3.4, z0: 4.9, z1: 6.2 };
  const LB = A.LIFT_B || { x0: -0.4, x1: 1.4, z0: 4.9, z1: 6.2 };
  const X0 = CR.x0, X1 = CR.x1;                    // -6.00 .. 6.00, the whole building
  const LZ0 = CR.z0, LZ1 = CR.z1;                  //  3.20 .. 6.20, the landing
  const FZ0 = FT.z0, FZ1 = FT.z1;                  // -5.00 .. 3.20, the flat
  const H = CR.h, CY = Y + H;                      // 2.60 clear, and the ceiling plane
  const SLAB = Y + .004;                           // the finished floor quad
  const FL = Y + .006;                             // what things standing on it stand on
  const WT = .10;                                  // interior wall thickness
  const DTOP = 2.06;                               // head of every internal doorway
  const STUD = 2.10;                               // and the top of the 隔断's plasterboard

  // The flat's internal plan, in one place so nothing is measured off a comment.
  const CN = 1.30, CS = -0.40;                     // the 走道's north and south walls
  const PK = -3.20, PB = 0.40, PE = 3.10;          // north strip: 卧室3|厨房, 厨房|卫生间, |玄关
  const P1 = -3.00, P2 = -0.40;                    // south strip: 卧室1|卧室2, 卧室2|客厅
  const SX = 2.40, SZ = -3.10;                     // the two 隔断 walls

  // Your front door. A 子母门 — a 0.86 m leaf with a 0.30 m fixed one beside it, which is what a
  // flat this size actually has and, more to the point, is what makes the opening walkable:
  // `clampMove` inflates the wall colliders either side by the 0.30 m body radius, so a 1.00 m
  // hole leaves a 0.40 m slot you have to thread and a 1.20 m hole leaves 0.60 m you walk through.
  const FX = 3.90, FW = 1.20, FTOP = 2.10;

  // ------------------------------------------------------------------ palette
  // A let flat, painted once, five years ago, by somebody who was not paid to cut in. Everything
  // is one of: builder's white gone grey, the landlord's cheapest laminate, white melamine, and
  // the particular blue of a plastic basin.
  const col = {
    wall:   C('#d5cfc0'), wallD: C('#c3bcab'), dado: C('#9aa196'), dadoT: C('#7b8279'),
    ceilP:  C('#e9e4d8'), scuff: C('#bdb5a4'),
    lam:    C('#9c7c56'), lamD: C('#836444'), lamL: C('#b1926c'),
    tileF:  C('#cfc9bb'), tileW: C('#e3ded1'), grout: C('#a49c8d'),
    slab:   C('#8f887c'), slabD: C('#7c766c'),
    steel:  C('#b0b6bb'), steelD: C('#8a9197'), steelX: C('#6b7278'), alu: C('#c1c7cb'),
    doorA:  C('#6b3a2c'), doorB: C('#7c4634'), doorD: C('#492720'),
    pvc:    C('#f1efe7'), pvcD: C('#dcd7c9'),                     // the 隔断's wrong door
    board:  C('#cec6ae'), boardE: C('#b09a72'),                   // plasterboard, and its cut edge
    pine:   C('#c8a870'), pineD: C('#a2854f'),                    // the studs behind it
    brass:  C('#b58a3f'), brassD: C('#87672a'),
    red:    C('#a92b1f'), redD: C('#7a1d14'), gold: C('#e0b45e'),
    ink:    C('#241d17'), grey: C('#7b828a'), paper: C('#eee7d6'), card: C('#b28f66'),
    white:  C('#f0ece2'), warm: C('#f7efd6'), dead: C('#b8b5ac'), cool: C('#dfe9ef'),
    sky:    C('#b4cce0'), skyLo: C('#d1dde5'), tower: C('#92a6b6'), towerD: C('#7a90a2'),
    rubber: C('#3a3f42'), navy: C('#2b3e56'), plastic: C('#3f6f96'), basin: C('#4a83a8'),
    green:  C('#1e7a45'), greenL: C('#4ec489'), jade: C('#3d7c63'),
    pink:   C('#c2808c'), mint: C('#8fbfae'), amber: C('#d69a41'), plum: C('#7a4a63'),
    lino:   C('#b9a98c'), foam: C('#dcd6c4'),
  };
  const PL = { ...MAT.plaster, gloss: .10 };
  const TILE = { ...MAT.tile, gloss: .34 };

  // Writing always stands off the face it is written on, and `glyphs` pushes its quads 12 mm along
  // the yaw it is given — so pass the face and the yaw that faces the reader.
  const G = (x, y, z, yaw, text, o) => glyph(x, y, z, yaw, text, { color: col.ink, ...o });
  // ------------------------------------------------------------------ tags are per floor
  //
  // `finish` in js/build.js builds ONE bounding box per tag name across the whole scene, and the
  // cutaway in js/game.js hides a tagged prop by that box's centre rather than by its own. So a
  // bed on this floor tagged plainly '床' shares a box with the 主卧's bed three decks down, the
  // centre of that box is in neither room, and the cutaway hides both of them wherever you stand:
  // the first render of the bunk room had a curtain, a clothes rail and no bed.
  //
  // Every tag this file puts on geometry is therefore namespaced, and `A.th` is given the same
  // namespaced tag so `pick` still resolves prop -> thing. The word the player sees is `hz`, which
  // is untouched — vocab and USE rows key off that, never off the tag.
  // ...and per ROOM, not just per floor. One tag box spans every prop wearing the name, so a bed
  // in the 卧室 and a bed in the 隔断房 both tagged 'f6床' share a box whose centre is in the wall
  // between them, and the cutaway hides both. `RM` is set at the head of each room below.
  let RM = '';
  const T = k => 'f6' + RM + k;
  // A thing you can look at and say. `focus` is a spot the body can genuinely stand on. An explicit
  // `tag` is used raw, for the handful of words that hang off a surface built in another section.
  const TH = (hz, x, y, z, zh, en, note, fx, fz, reach = 1.7, tag) =>
    thing(hz, x, y, z, zh, en, note, { focus: [fx, fz], reach, tag: tag || T(hz) });

  // Every prop this file makes is stamped with its deck at the foot of the builder. `hiddenProp`
  // in js/game.js culls by `p.deck` against the floor being drawn, and an untagged prop counts as
  // the building's own envelope and is therefore drawn on *every* floor — which is what the pale
  // ghost of somebody else's kitchen hanging in the middle of this one turned out to be.
  const P0 = A.props ? A.props.length : -1;

  // ==================================================================== the shell of the deck
  //
  // Floor and ceiling, ONE QUAD PER ROOM and not one per deck. This is not decoration: the cutaway
  // in js/game.js hides any prop whose centre is past the current room's box in the direction the
  // camera is looking from, and it tests the prop's own centre. A single 12 x 8.2 m floor slab has
  // its centre in the middle of the flat, so the moment you stand in the 卧室 and the camera swings
  // east the whole floor of the flat vanishes and you stand on black. Measured, not guessed — the
  // first render of the bunk room had no floor in it at all.
  //
  // Splitting it also buys the thing the flat should have anyway: the landlord's laminate in the
  // rooms and tile in the two wet ones.
  const ROOMF = [
    [PE, X1, CN, FZ1, 0, 'f6e合租'], [PB, PE, CN, FZ1, 1, 'f6b卫生间'], [PK, PB, CN, FZ1, 1, 'f6k厨房'],
    [X0, PK, CN, FZ1, 0, 0], [X0, X1, CS, CN, 0, 0], [X0, P1, FZ0, CS, 0, 'f6r卧室'],
    [P1, P2, FZ0, CS, 0, 0], [P2, SX, SZ, CS, 0, 'f6g隔断房'], [SX, X1, FZ0, CS, 0, 'f6l客厅'],
    [P2, SX, FZ0, SZ, 0, 0],
  ];
  for (const [x0, x1, z0, z1, tiled, rtag] of ROOMF) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    if (tiled) flat(cx, SLAB, cz, w, d, C('#c9c3b5'), { mode: 9, gloss: .30, tag: rtag || undefined, ...TILE });
    else flat(cx, SLAB, cz, w, d, col.lam, { mode: 3, gloss: .26, tag: rtag || undefined,
              mat: 'wood', matScale: 1.05, matAmt: .28, nrmAmt: .32 });
    ceil(cx, CY, cz, w, d, col.ceilP, { gloss: .07, glow: .02 });
  }
  flat(0, SLAB, (LZ0 + LZ1) / 2, X1 - X0, LZ1 - LZ0, col.slab,
       { mode: 9, gloss: .32, tag: 'f6走廊', ...MAT.slab });
  ceil(0, CY, (LZ0 + LZ1) / 2, X1 - X0, LZ1 - LZ0, C('#e2dccf'), { gloss: .07, glow: .02 });
  // The room box `R.setRoom` measures the ambient term against, in world y like everything else.
  if (A.deckH) A.deckH(Y + H);

  // The perimeter, single-sided and facing in. Built in runs so the windows are genuine holes:
  // a window painted onto a solid wall is the one thing at this scale that never reads.
  //   south facade z = -5.00 faces +z (yaw 0)      north of the landing z = 6.20 faces -z (yaw PI)
  //   west  x = -6.00 faces +x (yaw  PI/2)         east x = 6.00 faces -x (yaw -PI/2)
  const runWall = (ax, at, segs, yaw, c, o = {}) => {
    for (const [a, b] of segs) {
      if (b - a <= .002) continue;
      if (ax === 'x') wall((a + b) / 2, Y + H / 2, at, b - a, H, yaw, c, { ...PL, ...o });
      else wall(at, Y + H / 2, (a + b) / 2, b - a, H, yaw, c, { ...PL, ...o });
    }
  };
  // The window holes, named here and used again when the bays are built.
  const WIN_L = { z: 4.55, w: 1.40, y0: .95, y1: 2.15 };     // landing, west end
  const WIN_B1 = { x: -4.55, w: 1.50, y0: .80, y1: 2.05 };   // 卧室1, south facade
  const WIN_LV = { x: 4.05, w: 2.10, y0: .70, y1: 2.15 };    // 客厅, south facade — the big one
  const WIN_LE = { z: -2.45, w: 1.20, y0: .95, y1: 2.05 };   // 客厅, east wall

  runWall('x', FZ0, [[X0, WIN_B1.x - WIN_B1.w / 2], [WIN_B1.x + WIN_B1.w / 2, WIN_LV.x - WIN_LV.w / 2],
                     [WIN_LV.x + WIN_LV.w / 2, X1]], 0, col.wall);
  // the strips over and under each south-facade opening, so the hole is a window and not a slot
  for (const w of [WIN_B1, WIN_LV]) {
    wall(w.x, Y + w.y0 / 2, FZ0, w.w, w.y0, 0, col.wall, PL);
    wall(w.x, Y + (w.y1 + H) / 2, FZ0, w.w, H - w.y1, 0, col.wall, PL);
  }
  runWall('x', LZ1, [[X0, X1]], PI, col.wall);
  runWall('z', X0, [[FZ0, WIN_L.z - WIN_L.w / 2], [WIN_L.z + WIN_L.w / 2, LZ1]], PI / 2, col.wall);
  wall(X0, Y + WIN_L.y0 / 2, WIN_L.z, WIN_L.w, WIN_L.y0, PI / 2, col.wall, PL);
  wall(X0, Y + (WIN_L.y1 + H) / 2, WIN_L.z, WIN_L.w, H - WIN_L.y1, PI / 2, col.wall, PL);
  runWall('z', X1, [[FZ0, WIN_LE.z - WIN_LE.w / 2], [WIN_LE.z + WIN_LE.w / 2, LZ1]], -PI / 2, col.wall);
  wall(X1, Y + WIN_LE.y0 / 2, WIN_LE.z, WIN_LE.w, WIN_LE.y0, -PI / 2, col.wall, PL);
  wall(X1, Y + (WIN_LE.y1 + H) / 2, WIN_LE.z, WIN_LE.w, H - WIN_LE.y1, -PI / 2, col.wall, PL);
  // and the perimeter colliders
  stop(X0 - .40, X0 + .10, FZ0, LZ1);
  stop(X1 - .10, X1 + .40, FZ0, LZ1);
  stop(X0, X1, FZ0 - .40, FZ0 + .10);
  stop(X0, X1, LZ1 - .10, LZ1 + .40);

  // ---- the wall between the landing and the flat, and the hole your door hangs in.
  // Two quads 10 mm either side of z = 3.20 rather than two on the plane itself. The shell does
  // put both faces of this wall on one plane on deck 2 and gets away with it, but a 20 mm reveal
  // costs nothing and takes the question off the table — see the coplanar rule in the brief.
  const DIV = [[X0, FX - FW / 2], [FX + FW / 2, X1]];
  for (const [a, b] of DIV) {
    wall((a + b) / 2, Y + H / 2, FZ1 + .010, b - a, H, 0, col.wallD, PL);          // landing side
    wall((a + b) / 2, Y + H / 2, FZ1 - .010, b - a, H, PI, col.wall, PL);          // flat side
    stop(a, b, FZ1 - .09, FZ1 + .09);
  }
  wall(FX, Y + (FTOP + H) / 2, FZ1 + .010, FW, H - FTOP, 0, col.wallD, PL);
  wall(FX, Y + (FTOP + H) / 2, FZ1 - .010, FW, H - FTOP, PI, col.wall, PL);
  // the reveal — the 200 mm of wall thickness you walk through
  for (const s of [-1, 1])
    box(FX + s * (FW / 2 - .012), Y + FTOP / 2, FZ1, .024, FTOP, .21, col.wallD,
        { hard: true, gloss: .12, ...MAT.plaster });
  box(FX, Y + FTOP - .012, FZ1, FW, .024, .21, col.wallD, { hard: true, gloss: .12 });
  // 门槛石 — the stone threshold. Sits above both slabs, so it never argues with either.
  box(FX, FL + .018, FZ1, FW + .06, .036, .20, C('#98938a'),
      { hard: true, gloss: .42, ...MAT.cast });

  // ---- internal partitions. `run` lays the solid stretches, their colliders, and a head over
  // each opening: an internal doorway cut to the ceiling reads as a missing wall, not a door.
  function run(ax, at, lo, hi, doors, h, c) {
    const cuts = doors.slice().sort((a, b) => a[0] - b[0]);
    const segs = []; let p = lo;
    for (const [a, b] of cuts) { if (a > p) segs.push([p, a]); p = Math.max(p, b); }
    if (p < hi) segs.push([p, hi]);
    for (const [a, b] of segs) {
      const m = (a + b) / 2, L = b - a;
      if (L <= .002) continue;
      if (ax === 'x') {
        box(m, Y + h / 2, at, L, h, WT, c, { hard: true, ...PL });
        stop(a, b, at - WT / 2 - .01, at + WT / 2 + .01);
      } else {
        box(at, Y + h / 2, m, WT, h, L, c, { hard: true, ...PL });
        stop(at - WT / 2 - .01, at + WT / 2 + .01, a, b);
      }
    }
    for (const [a, b] of cuts) {
      const m = (a + b) / 2, L = b - a;
      if (h <= DTOP + .02) continue;
      if (ax === 'x') box(m, Y + (DTOP + h) / 2, at, L, h - DTOP, WT, c, { hard: true, ...PL });
      else box(at, Y + (DTOP + h) / 2, m, WT, h - DTOP, L, c, { hard: true, ...PL });
    }
  }
  // The doorways, named once and used again by the leaves that hang in them.
  const D_B3 = [-4.80, -3.90];        // 卧室3 — shut, and padlocked
  const D_KIT = [-1.95, -0.85];       // 厨房 — an opening, no leaf
  const D_BATH = [1.50, 2.40];        // 卫生间 — a leaf, ajar
  const D_B1 = [-4.95, -3.95];        // 卧室1 — open, the bunk room
  const D_B2 = [-2.35, -1.45];        // 卧室2 — shut, padlocked
  const D_LIV = [3.55, 4.80];         // 客厅 — an opening
  const D_PART = [-2.20, -1.30];      // 隔断房 — in the stud wall, in z

  run('x', CN, X0, PE, [D_B3, D_KIT, D_BATH], H, col.wall);
  run('x', CS, X0, X1, [D_B1, D_B2, D_LIV], H, col.wall);
  run('z', PK, CN, FZ1, [], H, col.wall);
  run('z', PB, CN, FZ1, [], H, col.wall);
  run('z', PE, CN, FZ1, [], H, col.wall);
  run('z', P1, FZ0, CS, [], H, col.wall);
  run('z', P2, FZ0, CS, [], H, col.wall);
  // and the 隔断 itself — plasterboard on 50 mm studs, 2.10 tall, stopping half a metre under
  // the ceiling because the man who put it up was not going to cut round a light fitting.
  // The head over the 隔断's door is its own height, not DTOP: at 2.06 in a 2.10 wall the opening
  // is a slot cut to the top of the partition and the whole thing reads as loose panels leaning
  // against each other rather than as a room. 1.92 leaves a real 0.18 m head.
  const PDTOP = 1.92;
  {
    const cuts = [D_PART], lo = SZ, hi = CS;
    const segs = []; let p = lo;
    for (const [a, b] of cuts) { if (a > p) segs.push([p, a]); p = Math.max(p, b); }
    if (p < hi) segs.push([p, hi]);
    for (const [a, b] of segs)
      box(SX, Y + STUD / 2, (a + b) / 2, WT, STUD, b - a, col.board, { hard: true, ...PL });
    for (const [a, b] of segs) stop(SX - WT / 2 - .01, SX + WT / 2 + .01, a, b);
    box(SX, Y + (PDTOP + STUD) / 2, (D_PART[0] + D_PART[1]) / 2, WT, STUD - PDTOP,
        D_PART[1] - D_PART[0], col.board, { hard: true, ...PL });
  }
  run('x', SZ, P2, SX, [], STUD, col.board);
  // the raw cut edge along the top of both runs, which is how you know it is not a wall
  box(SX, Y + STUD + .014, (SZ + CS) / 2, WT + .012, .028, CS - SZ, col.boardE, { hard: true, gloss: .06 });
  box((P2 + SX) / 2, Y + STUD + .014, SZ, SX - P2, .028, WT + .012, col.boardE, { hard: true, gloss: .06 });
  // a shadow gap at the foot instead of a skirting: the boards were cut short and never trimmed
  box(SX, FL + .012, (SZ + CS) / 2, WT + .014, .024, CS - SZ, C('#9a927f'), { hard: true, gloss: .06 });
  box((P2 + SX) / 2, FL + .012, SZ, SX - P2, .024, WT + .014, C('#9a927f'), { hard: true, gloss: .06 });
  // ---- the closed doorways get their own colliders, because their leaves are shut for good
  stop(D_B3[0], D_B3[1], CN - .09, CN + .09);
  stop(D_B2[0], D_B2[1], CS - .09, CS + .09);

  // ==================================================================== the walkable zones
  //
  // Two kinds, and the difference matters. The per-room rectangles are what `roomAt` hands the
  // renderer — they name the room, put its bulb over it, and clamp the cutaway camera under its
  // ceiling. The two big catch-alls underneath are what `clampMove` actually walks in: a body that
  // steps out of one small zone and into the gap before the next stops dead in the doorway, which
  // js/home-walls.js records as the reason the flat downstairs is one region. So the rooms are
  // registered first, the catch-alls last, and the colliders above are the real walls.
  const CEIL = Y + H - .04;
  const camNear = (w, d) => Math.max(1.9, Math.min(3.4, .42 * Math.min(w, d) + 1.35));
  const Z = (id, x0, x1, z0, z1, lx, lz, ly) =>
    A.zone({ id, x0, x1, z0, z1, ceil: CEIL, light: [lx, Y + (ly || 2.42), lz],
             near: camNear(x1 - x0, z1 - z0) });
  Z('玄关', PE - .05, X1, CN - .05, FZ1, 4.55, 2.25);
  Z('卫生间', PB + .05, PE - .05, CN + .05, FZ1, 1.75, 2.25);
  Z('厨房', PK + .05, PB + .05, CN + .05, FZ1, -1.40, 2.25);
  Z('走道', X0, X1, CS, CN + .05, 0.20, 0.45, 2.40);
  Z('卧室1', X0, P1 - .05, FZ0, CS, -4.50, -2.70);
  Z('隔断房', P2, SX + .05, SZ, CS, 1.00, -1.75, 2.34);
  Z('客厅', SX, X1, FZ0, CS, 4.20, -2.70, 2.44);
  Z('客厅西', P2 - .05, SX + .05, FZ0, SZ + .05, 1.00, -4.05, 2.44);
  Z('卧室2', P1 - .05, P2 + .05, FZ0, CS, -1.70, -2.70);
  // The front doorway. The flat's zone stops at z = 3.20 and the landing's starts there, and two
  // zones that only touch cannot be walked between — `clampMove` spends the body radius on each
  // side of the seam. This one straddles it by more than that in both directions.
  Z('门口', FX - FW / 2, FX + FW / 2, FZ1 - .85, FZ1 + .85, FX, 3.05, 2.30);
  Z('走廊', X0, X1, LZ0, LZ1, -2.00, 4.20, 2.45);
  A.zone({ id: '合租', x0: X0, x1: X1, z0: FZ0, z1: FZ1, ceil: CEIL,
           light: [0.20, Y + 2.40, 0.45], near: camNear(X1 - X0, FZ1 - FZ0) });

  // ==================================================================== windows
  //
  // A hole in the perimeter with the view standing just outside it. `n` is the outward normal, so
  // one function serves the south facade, the west end and the east wall without any of them
  // knowing which they are. Sixteen metres up, so the view is mostly sky with the next block in it.
  function windowBay(cx, cz, w, y0, y1, nx, nz, o = {}) {
    const along = Math.abs(nz) > .5;                 // the wall runs along x
    const inYaw = Math.atan2(-nx, -nz);              // a quad facing into the room
    const at = d => [cx + nx * d, cz + nz * d];
    const dim = (len, th) => along ? [len, th] : [th, len];
    const hh = y1 - y0, cyy = Y + (y0 + y1) / 2;
    const put = (d, len, h, c, oo) => {
      const [px, pz] = at(d), [sx, sz] = dim(len, .012);
      return box(px, Y + h[0], pz, sx, h[1], sz, c, { hard: true, ...oo });
    };
    // The view. One sky slab (large area, so glow stays in the .02–.05 band), a lower warmer
    // band, and the tops of the next block standing in front of both.
    //
    // All three are handed to the shell rather than painted a fixed colour: `A.sky` puts a pane on
    // the list game.js re-tints from the hour, and `A.city` does the same for the skyline and for
    // the windows lit in it. Without that, a window sixteen floors up is a daylight lightbox at
    // eleven at night — which is exactly how the first render of this room came out.
    A.sky && A.sky(put(.34, w + .30, [(y0 + y1) / 2, hh + .30], col.sky, { mode: 1, glow: .035 }));
    A.sky && A.sky(put(.32, w + .26, [y0 + .26, .52], col.skyLo, { mode: 1, glow: .030 }));
    for (const [t, tw, th, layer] of (o.city || [[-.52, .34, .82, 0], [-.10, .26, .55, 1],
                                                 [.36, .40, .96, 0], [.72, .22, .44, 1]])) {
      const [px, pz] = at(.28), [sx, sz] = dim(tw, .010);
      const ox = along ? t : 0, oz = along ? 0 : t;
      const b = box(px + ox, Y + y0 + th / 2 - .10, pz + oz, sx, th, sz,
                    layer ? col.tower : col.towerD, { hard: true, mode: 1, glow: .022 });
      A.city && A.city(layer, b);
      // a few windows lit in the block opposite, which is the only thing that says it is evening
      for (let k = 0; k < 4; k++) {
        const wy = y0 + .14 + k * (th / 5), wt = t + ((k % 2) - .5) * tw * .42;
        if (wy > y0 + th - .18) continue;
        const [qx, qz] = at(.26), [qsx, qsz] = dim(tw * .22, .008);
        const q = box(qx + (along ? wt : 0), Y + wy, qz + (along ? 0 : wt), qsx, .052, qsz,
                      C('#ffdca2'), { hard: true, mode: 1, glow: 0 });
        A.city && A.city(2, q);
      }
    }
    // the reveal — four plaster returns boxing the opening, so it reads as a hole with thickness
    for (const [t, len, hy, hgt] of [[0, w + .22, y0 - .055, .11], [0, w + .22, y1 + .055, .11],
                                     [-(w / 2 + .055), .11, (y0 + y1) / 2, hh],
                                     [w / 2 + .055, .11, (y0 + y1) / 2, hh]]) {
      const [px, pz] = at(.055), [sx, sz] = dim(len, .13);
      const ox = along ? t : 0, oz = along ? 0 : t;
      box(px + ox, Y + hy, pz + oz, sx, hgt, sz, col.wall, { hard: true, ...PL });
    }
    // aluminium frame, a centre mullion, and one pane
    const wf = (t, len, hy, hgt) => {
      const [px, pz] = at(.020), [sx, sz] = dim(len, .05);
      const ox = along ? t : 0, oz = along ? 0 : t;
      box(px + ox, Y + hy, pz + oz, sx, hgt, sz, col.alu, { hard: true, gloss: .40, ...MAT.metal });
    };
    wf(0, w + .06, y0 + .03, .06); wf(0, w + .06, y1 - .03, .06);
    wf(-(w / 2 - .03), .06, (y0 + y1) / 2, hh); wf(w / 2 - .03, .06, (y0 + y1) / 2, hh);
    wf(0, .05, (y0 + y1) / 2, hh);
    { const [px, pz] = at(.006), [sx, sz] = dim(w - .06, .010);
      box(px, cyy, pz, sx, hh - .06, sz, C('#cddce3'),
          { hard: true, mode: 18, alpha: .13, gloss: .78 }); }
    // 防盗网 — the welded bar grille every window here has, outside the glass
    if (o.bars !== false) for (let i = -2; i <= 2; i++) {
      const [px, pz] = at(.14), [sx, sz] = dim(.016, .016);
      const ox = along ? i * (w / 5) : 0, oz = along ? 0 : i * (w / 5);
      box(px + ox, cyy, pz + oz, sx, hh - .04, sz, col.steelX, { hard: true, gloss: .32 });
    }
    // the sill inside, which is where everything ends up
    { const [px, pz] = at(-.10), [sx, sz] = dim(w + .20, .24);
      box(px, Y + y0 - .045, pz, sx, .05, sz, col.white, { hard: true, gloss: .26, tag: T('窗户') }); }
    return { cx, cz, y0, y1, inYaw, at };
  }

  // ==================================================================== the landing
  //
  // Painted cream above a green-grey dado, which is every shared landing in every tower of this
  // kind. Both bands stand proud of the wall as boxes and both run in segments — a band drawn
  // straight across a doorway cuts the doorway in half.
  const TRIM = .130, DY0 = Y + TRIM, DH = 1.10 - TRIM, DYC = DY0 + DH / 2;
  function dado(ax, plane, sgn, runs) {
    const p1 = plane + sgn * .018, p2 = plane + sgn * .024;
    for (const [a0, a1] of runs) {
      const c = (a0 + a1) / 2, L = a1 - a0;
      if (L <= .002) continue;
      const put = (y, h, d, w, cc, g) => ax === 'x'
        ? box(c, y, d, L, h, w, cc, { hard: true, gloss: g })
        : box(d, y, c, w, h, L, cc, { hard: true, gloss: g });
      put(DYC, DH, p1, .03, col.dado, .18);
      put(DY0 + DH + .014, .028, p2, .04, col.dadoT, .22);
      // and the skirting under it, which the shell would have laid if it had built this deck
      put(Y + .065, TRIM, p2, .05, C('#8b8377'), .16);
    }
  }
  dado('x', FZ1, 1, [[X0, FX - FW / 2], [FX + FW / 2, X1]]);
  dado('x', LZ1, -1, [[X0, LB.x0], [LF.x1, X1]]);
  dado('z', X0, 1, [[LZ0, WIN_L.z - WIN_L.w / 2], [WIN_L.z + WIN_L.w / 2, LZ1]]);
  dado('z', X1, -1, [[LZ0, 3.80], [4.62, LZ1]]);

  // Shaft walls, doors, controls and collision are shell-owned. The posted notice below is
  // floor-specific dressing on the shell's out-of-service lift, not a second set of doors.
  box((LB.x0 + LB.x1) / 2, Y + 1.62, LB.z0 - .092, .46, .32, .020, col.paper,
      { hard: true, gloss: .05, ry: .03 });
  G((LB.x0 + LB.x1) / 2, Y + 1.71, LB.z0 - .104, PI, '此梯停用', { size: .052, gap: .010, color: col.redD });
  G((LB.x0 + LB.x1) / 2, Y + 1.61, LB.z0 - .104, PI, '请乘另一部', { size: .042, gap: .008 });
  G((LB.x0 + LB.x1) / 2, Y + 1.52, LB.z0 - .104, PI, '物业管理处', { size: .034, gap: .007, color: col.grey });
  // ---- ceiling services and the lamps. Institutional and cold: four surface bulkheads down a
  // twelve-metre run and one of them dead, which is the true state of every landing of this kind.
  for (let i = 0; i < 4; i++)
    cyl(X0 + 1.5 + i * 3.0, CY - .17, 3.42, .036, 3.0, col.redD, { rz: PI / 2, gloss: .34, ...MAT.metal });
  for (let i = 0; i < 5; i++) {
    const px = X0 + 1.3 + i * 2.4;
    cyl(px, CY - .225, 3.42, .016, .07, col.brassD, { gloss: .5 });
    ball(px, CY - .262, 3.42, .026, .020, .026, col.brass, { gloss: .55 });
  }
  box(0, CY - .045, 3.34, X1 - X0, .05, .07, col.white, { hard: true, gloss: .12 });
  for (const [px, pz, alive] of [[-4.40, 4.30, true], [-1.30, 4.30, false], [1.40, 3.60, true],
                                 [4.70, 4.30, true]]) {
    box(px, CY - .045, pz, .46, .07, .16, col.steelD, { hard: true, gloss: .30 });
    box(px, CY - .095, pz, .40, .05, .12, alive ? col.warm : col.dead,
        { hard: true, mode: alive ? 1 : 0, glow: alive ? .13 : 0, gloss: .10 });
    if (alive) light(px, CY - .19, pz, col.cool, .50, 3.30);
  }

  windowBay(X0, WIN_L.z, WIN_L.w, WIN_L.y0, WIN_L.y1, -1, 0, { bars: false });
  // a plant somebody put on the landing sill and then stopped watering
  cyl(X0 + .20, Y + WIN_L.y0 + .06, WIN_L.z - .34, .075, .13, C('#9a6a4c'), { gloss: .18 });
  for (let i = 0; i < 5; i++)
    cap(X0 + .20 + (i % 2 - .5) * .05, Y + WIN_L.y0 + .17, WIN_L.z - .34 + (i - 2) * .022,
        .015, .17, .015, i < 2 ? C('#7c7a4a') : C('#4c7a44'), { rz: (i - 2) * .16, gloss: .10 });

  // ---- 安全出口, and the fire stair at the east end. The stair door never opens, so it is
  // surface-mounted in front of a whole wall rather than hung in a hole.
  function exitSign(x, y, z, sgn, arrow) {
    const yaw = sgn > 0 ? 0 : PI, f = d => z + sgn * d;
    const w = arrow ? .46 : .38;
    box(x, y, f(.028), w, .155, .055, col.green, { hard: true, gloss: .26, tag: T('安全出口') });
    box(x, y, f(.058), w - .035, .125, .006, col.greenL, { hard: true, mode: 1, glow: .14, tag: T('安全出口') });
    G(x - (arrow ? .062 : 0), y, f(.058), yaw, '安全出口',
      { size: arrow ? .072 : .082, gap: .010, color: col.white, mode: 1, glow: .16 });
    // The stair is east, and a glyph reads left-to-right in the *reader's* frame: on a wall facing
    // -z the reader's right hand points at world -x, so "east" is '←' there and '→' on the south.
    if (arrow) G(x + .175, y, f(.058), yaw, sgn > 0 ? '→' : '←',
                 { size: .095, color: col.white, mode: 1, glow: .16 });
  }
  const SZE = 4.21, SWE = .95, STOP = 2.06;         // the stair door, in the east wall
  exitSign(-2.60, Y + 2.28, FZ1, 1, true);
  exitSign(-4.90, Y + 2.28, LZ1, -1, true);
  exitSign(5.00, Y + 2.28, FZ1, 1, true);
  box(X1 - .035, Y + STOP + .19, SZE, .06, .155, .40, col.green, { hard: true, gloss: .26, tag: T('安全出口') });
  box(X1 - .068, Y + STOP + .19, SZE, .006, .125, .365, col.greenL,
      { hard: true, mode: 1, glow: .14, tag: T('安全出口') });
  G(X1 - .068, Y + STOP + .19, SZE, -PI / 2, '安全出口',
    { size: .086, gap: .012, color: col.white, mode: 1, glow: .16 });
  { const sf = d => X1 - d;
    for (const s of [-1, 1])
      box(sf(.045), Y + (STOP + .07) / 2, SZE + s * (SWE / 2 + .035), .09, STOP + .07, .07,
          col.steelD, { hard: true, gloss: .30, ...MAT.metal });
    box(sf(.045), Y + STOP + .035, SZE, .09, .07, SWE + .14, col.steelD,
        { hard: true, gloss: .30, ...MAT.metal });
    box(sf(.030), Y + (STOP - .04) / 2, SZE, .06, STOP - .04, SWE - .05, C('#989ea0'),
        { hard: true, gloss: .26, tag: T('楼梯'), ...MAT.metal });
    box(sf(.062), Y + 1.34, SZE, .012, .70, SWE - .17, C('#8a9193'), { hard: true, gloss: .24 });
    box(sf(.075), Y + 1.02, SZE - .30, .05, .05, .40, col.steelX, { hard: true, gloss: .5 });
    cyl(sf(.098), Y + 1.02, SZE - .30, .020, .09, col.steel, { rx: PI / 2, gloss: .55 });
    box(sf(.070), Y + STOP - .18, SZE + .22, .06, .05, .30, col.steelX, { hard: true, gloss: .45 });
    G(sf(.066), Y + 1.72, SZE, -PI / 2, '安全出口', { size: .085, gap: .016, color: col.green });
    G(sf(.066), Y + .62, SZE, -PI / 2, '禁止堆放杂物', { size: .056, gap: .012, color: col.redD });
    G(sf(.066), Y + .50, SZE, -PI / 2, '保持通道畅通', { size: .050, gap: .012 });
  }

  // ==================================================================== the six front doors
  //
  // 防盗门, five of them somebody else's. The frame stands 90 mm off the wall and the leaf 60 mm,
  // so the leaf reads as recessed in its architrave and nothing is coplanar with anything — a
  // flush door in this renderer flickers as horizontal stripes.
  //
  // `sgn` is the way the door faces into the landing: +1 for the z = 3.20 wall, -1 for z = 6.20.
  function frontDoor(cx, zw, sgn, num, o = {}) {
    const yaw = sgn > 0 ? 0 : PI;
    const W = o.w || 1.00, HT = o.top || 2.06, LW = W - .05, LH = HT - .04;
    const F = d => zw + sgn * d;
    const hinge = o.hinge === undefined ? -1 : o.hinge;
    const body = o.body || col.doorA, panel = o.panel || col.doorB;
    const jTop = o.headTo === undefined ? Y + HT + .07 : o.headTo;
    for (const s of [-1, 1])
      box(cx + s * (W / 2 + .035), (Y + jTop) / 2, F(.045), .07, jTop - Y, .09, col.doorD,
          { hard: true, gloss: .26, tag: o.tag });
    if (o.headTo === undefined)
      box(cx, Y + HT + .035, F(.045), W + .14, .07, .09, col.doorD, { hard: true, gloss: .26, tag: o.tag });
    // the leaf. 子母门 where asked for: a wide leaf and a narrow fixed one beside it, which is what
    // a 1.20 m opening actually has and is why this doorway is walkable.
    const small = o.small || 0;
    const lw = LW - small;
    const lx = cx - (hinge > 0 ? -1 : 1) * small / 2;
    // The leaf of a shut neighbour's door is tagged 门; frame, plate and number keep o.tag.
    // `homeUseDef` (js/game.js:10961) routes 门 on any deck above the second to
    // `HOME_DOOR_USE.neighbour` — 敲门 — so a leaf without it is a front door the pick reads as
    // wall. `sgn < 0` is the north-wall run: the five doors that must stay shut. The flatshare's
    // own door comes through with sgn > 0 and keeps T('门'). No collider changes.
    const leaf = box(lx, Y + LH / 2, F(.030), lw, LH, .06, body,
                     { hard: true, gloss: .24, ...(sgn < 0 ? { tag: '门' } : { tag: o.tag }) });
    if (small) {
      box(cx + (hinge > 0 ? -1 : 1) * (lw / 2), Y + LH / 2, F(.030), small, LH, .06, body,
          { hard: true, gloss: .24, tag: o.tag });
      box(cx + (hinge > 0 ? -1 : 1) * (lw / 2), Y + LH / 2, F(.066), small - .07, LH - .14, .014,
          panel, { hard: true, gloss: .22, tag: o.tag });
    }
    for (const [py, ph] of [[LH * .70, LH * .40], [LH * .265, LH * .30]]) {
      box(lx, Y + py, F(.070), lw - .16, ph, .020, panel, { hard: true, gloss: .22, tag: o.tag });
      for (const s of [-1, 1])
        box(lx, Y + py + s * ph / 2, F(.082), lw - .16, .012, .012, col.doorD,
            { hard: true, gloss: .3, tag: o.tag });
    }
    // ironmongery on the jamb opposite the hinges, a 猫眼, three hinges
    const hx = lx - hinge * (lw / 2 - .13);
    box(hx, Y + 1.03, F(.075), .10, .24, .03, col.steelD, { hard: true, gloss: .46, tag: o.tag });
    cyl(hx, Y + 1.03, F(.115), .016, .07, col.steel, { rx: PI / 2, gloss: .5, tag: o.tag });
    box(hx - hinge * .085, Y + 1.03, F(.148), .19, .028, .028, col.steel,
        { hard: true, gloss: .5, tag: o.tag });
    cyl(hx, Y + .88, F(.078), .020, .012, col.brassD, { rx: PI / 2, gloss: .55, tag: o.tag });
    cyl(lx, Y + 1.56, F(.078), .012, .030, col.brass, { rx: PI / 2, gloss: .6, tag: o.tag });
    for (const hy of [.36, 1.06, 1.76])
      cyl(lx + hinge * (lw / 2 - .012), Y + hy, F(.062), .014, .10, col.steelD, { gloss: .45, tag: o.tag });
    // 门牌 — the number plate, screwed to the leaf at head height
    box(lx, Y + 1.84, F(.072), .30, .13, .024, col.steel, { hard: true, gloss: .40, tag: o.tag });
    G(lx, Y + 1.84, F(.086), yaw, num, { size: .073, gap: .012, color: col.ink, gloss: .2 });
    flat(cx, FL + .006, F(.32), .64, .40, o.mat || col.rubber, { mode: 7, gloss: .04 });
    shade(cx, F(.32), .72, .48, .26, FL + .010);
    return leaf;
  }
  // 春联 on a frame — gold on red, read top to bottom.
  function couplets(cx, zw, sgn, top, a, b) {
    const yaw = sgn > 0 ? 0 : PI, F = d => zw + sgn * d;
    for (const [s, text] of [[-1, a], [1, b]]) {
      box(cx + s * .60, Y + 1.48, F(.020), .12, 1.02, .04, col.red, { hard: true, gloss: .10, tag: T('春联') });
      G(cx + s * .60, Y + 1.48, F(.042), yaw, text,
        { size: .105, gap: .018, color: col.gold, vertical: true, gloss: .12 });
    }
    box(cx, Y + 2.28, F(.020), .62, .15, .04, col.red, { hard: true, gloss: .10 });
    G(cx, Y + 2.28, F(.042), yaw, top, { size: .098, gap: .020, color: col.gold });
  }
  function fuDiamond(cx, y, zw, sgn, s = .21) {
    const yaw = sgn > 0 ? 0 : PI;
    // Turned on Z, not on Y. A box on a z-facing wall spun about Y turns in *plan* and you see
    // its edge; the diamond a 倒福 is wants the rotation in the plane of the wall it is stuck to.
    box(cx, Y + y, zw + sgn * .095, s, s, .018, col.red, { hard: true, gloss: .10, rz: PI / 4 });
    G(cx, Y + y, zw + sgn * .108, yaw, '福', { size: s * .60, color: col.gold, gloss: .14 });
  }

  // The five neighbours on the north wall, and 606 in the south wall — the flatshare, the one
  // door on this landing that opens.
  const N1 = -5.10, N2 = -3.50, N3 = -1.90, N4 = 4.10, N5 = 5.42;
  frontDoor(N1, LZ1, -1, '601', { tag: T('邻居'), hinge: 1, mat: C('#494e51') });
  couplets(N1, LZ1, -1, '万象更新', '天增岁月人增寿', '春满乾坤福满门');
  frontDoor(N2, LZ1, -1, '602', { tag: T('邻居'), body: col.doorB, panel: col.doorA, mat: C('#7b3e36') });
  fuDiamond(N2, 1.34, LZ1, -1);
  frontDoor(N3, LZ1, -1, '603', { tag: T('邻居'), mat: col.rubber });
  frontDoor(N4, LZ1, -1, '604', { tag: T('邻居'), hinge: 1, body: col.doorD, panel: col.doorA,
                                  mat: C('#3e4a3e'), w: .95 });
  frontDoor(N5, LZ1, -1, '605', { tag: T('邻居'), mat: col.rubber, w: .95 });

  // 606 — yours to walk through. Dropped onto the hole cut above: FW 1.20 wide, FTOP 2.10 high,
  // centred on FX. The 30 mm the leaf stands proud of the wall is the only door on the landing
  // with a real room behind it.
  frontDoor(FX, FZ1, 1, '606', { tag: T('门'), body: col.doorA, panel: col.doorB, mat: C('#6c3b34'),
                                 w: FW, top: FTOP, small: .30, hinge: -1,
                                 headTo: Y + FTOP - .015 });
  // Faded couplets, a 倒福, and — because this is a let flat — the letting agent's sticker, still
  // stuck to the frame two tenancies later.
  for (const s of [-1, 1]) {
    box(FX + s * .74, Y + 1.50, FZ1 + .022, .11, .88, .04, C('#9a3a30'), { hard: true, gloss: .08 });
    G(FX + s * .74, Y + 1.50, FZ1 + .044, 0, s < 0 ? '出入平安' : '学业有成',
      { size: .098, gap: .020, color: C('#c8a664'), vertical: true, gloss: .10 });
  }
  fuDiamond(FX - .18, 1.56, FZ1, 1, .19);
  box(FX + .74, Y + .92, FZ1 + .026, .13, .19, .006, col.paper, { hard: true, gloss: .06, ry: .04 });
  G(FX + .74, Y + .97, FZ1 + .034, 0, '整租合租', { size: .026, gap: .004, color: C('#2b4f86') });
  G(FX + .74, Y + .92, FZ1 + .034, 0, '安家找我', { size: .024, gap: .004, color: col.grey });
  G(FX + .74, Y + .865, FZ1 + .034, 0, '65103', { size: .026, gap: .004, color: C('#a8352a') });

  // ==================================================================== what the landing stores
  //
  // Everything hugs a wall inside 450 mm so the walking stays walkable, and the pinch in front of
  // the shafts (z 3.60 .. 4.60, one metre of standing room) is left completely clear.

  // ---- 消火栓, on the flat's wall west of the shafts.
  const HX = -4.30, HZ = FZ1 + .11;
  box(HX, Y + 1.14, HZ, .70, 1.00, .22, col.red, { hard: true, gloss: .30, tag: T('消防栓') });
  box(HX, Y + 1.14, HZ + .112, .60, .90, .010, col.redD, { hard: true, gloss: .34, tag: T('消防栓') });
  box(HX - .01, Y + 1.20, HZ + .118, .40, .58, .008, C('#3c494d'), { hard: true, gloss: .62, alpha: .55 });
  cyl(HX - .01, Y + 1.20, HZ + .06, .17, .12, C('#8b1e17'), { rx: PI / 2, gloss: .18 });
  cyl(HX - .01, Y + 1.20, HZ + .09, .07, .07, col.redD, { rx: PI / 2, gloss: .3 });
  G(HX, Y + 1.76, HZ + .112, 0, '消火栓', { size: .115, gap: .022, color: col.white });
  G(HX, Y + .70, HZ + .112, 0, '火警119', { size: .058, gap: .012, color: col.gold });

  // ---- 电表箱. Six meters on a floor with six flats, and 606's spins hardest — four laptops,
  // four phone chargers, two electric kettles and a 小太阳 heater on one meter.
  const MX = 5.30, MZ = FZ1 + .06;
  box(MX, Y + 1.46, MZ, .58, 1.06, .12, col.steelD, { hard: true, gloss: .34, tag: T('电表'), ...MAT.metal });
  box(MX, Y + 1.46, MZ + .065, .52, .98, .012, col.steelX, { hard: true, gloss: .30 });
  const READ = [['601', '0318'], ['602', '0942'], ['603', '0577'], ['606', '2864']];
  for (let i = 0; i < 4; i++) {
    const my = 1.82 - i * .26, dx = -.09;
    box(MX + dx, Y + my, MZ + .073, .21, .12, .008, C('#1b2125'), { hard: true, gloss: .55 });
    G(MX + dx, Y + my, MZ + .082, 0, READ[i][1],
      { size: .046, gap: .008, color: C('#cee2d5'), mode: 1, glow: .10 });
    G(MX + dx - .17, Y + my, MZ + .070, 0, READ[i][0], { size: .034, gap: .005, color: col.white });
    cyl(MX + .17, Y + my, MZ + .073, .010, .010, C('#d7493a'), { rz: PI / 2, mode: 1, glow: .18 });
  }
  G(MX, Y + 2.06, MZ + .066, 0, '电表箱', { size: .062, gap: .012, color: col.white });
  box(MX, Y + 2.40, MZ + .010, .09, .40, .05, col.white, { hard: true, gloss: .12 });

  // ---- 通知. Photocopied, taped up crooked, and the best readable Chinese on the landing. On a
  // floor like this the notices are always the same two: the 群租 warning nobody acts on, and the
  // e-bike one everybody ignores, with the cable running under 606's door to prove it.
  const PX = -1.00, PZ = FZ1 + .012;
  box(PX, Y + 1.56, PZ, .40, .54, .024, col.paper, { hard: true, gloss: .05, ry: .02, tag: T('通知') });
  G(PX, Y + 1.75, PZ + .014, 0, '通知', { size: .080, gap: .020 });
  box(PX, Y + 1.685, PZ + .014, .28, .006, .006, col.ink, { hard: true });
  G(PX, Y + 1.615, PZ + .014, 0, '严禁群租隔断', { size: .042, gap: .007 });
  G(PX, Y + 1.545, PZ + .014, 0, '一经发现', { size: .038, gap: .007 });
  G(PX, Y + 1.480, PZ + .014, 0, '立即整改', { size: .038, gap: .007 });
  G(PX, Y + 1.385, PZ + .014, 0, '物业管理处', { size: .034, gap: .006, color: col.grey });
  for (const [sx, sy] of [[-.16, .24], [.16, .24], [-.16, -.24], [.16, -.24]])
    box(PX + sx, Y + 1.56 + sy, PZ + .016, .05, .022, .004, C('#d8d1bc'), { hard: true });
  box(PX - .46, Y + 1.50, PZ, .30, .26, .020, C('#ded6c2'), { hard: true, gloss: .05, ry: -.05 });
  G(PX - .46, Y + 1.56, PZ + .012, 0, '电动车', { size: .046, gap: .008, color: col.redD });
  G(PX - .46, Y + 1.49, PZ + .012, 0, '禁止入户充电', { size: .034, gap: .006 });
  G(PX - .46, Y + 1.43, PZ + .012, 0, '违者罚款', { size: .030, gap: .006, color: col.grey });

  // ---- 小广告. Stamped in red on the paint at hand height, scrubbed at once and never gone.
  // On a floor of students the stamps are different: short lets, moving vans, and a locksmith.
  G(-2.80, Y + 1.32, FZ1 + .024, 0, '短租房', { size: .058, gap: .010, color: C('#a7342a'), gloss: .05 });
  G(-2.80, Y + 1.24, FZ1 + .024, 0, '日租月租', { size: .038, gap: .006, color: C('#a7342a'), gloss: .05 });
  G(-3.60, Y + 1.28, FZ1 + .024, 0, '开锁换锁', { size: .050, gap: .008, color: C('#95453a'), gloss: .05 });
  G(0.60, Y + 1.30, FZ1 + .024, 0, '搬家拉货', { size: .052, gap: .009, color: C('#9b3f33'), gloss: .05 });
  G(-2.30, Y + 1.34, LZ1 - .024, PI, '招租', { size: .058, gap: .010, color: C('#9b3f33'), gloss: .05 });
  G(4.70, Y + 1.26, FZ1 + .024, 0, '疏通下水道', { size: .046, gap: .008, color: C('#a7342a'), gloss: .05 });

  // ---- the bicycles. Two of them, and neither has moved in a term. A bicycle here is a flat
  // thing seen side-on: 1.7 m along the wall and barely 60 mm off it.
  function bicycle(bx, bz, frame, bag) {
    const lean = .07;
    for (const dx of [-.52, .52]) {
      cyl(bx + dx, FL + .34, bz + .02, .335, .055, col.rubber, { rx: PI / 2, rz: lean, gloss: .18, tag: T('自行车') });
      cyl(bx + dx, FL + .34, bz + .02, .285, .060, C('#595f63'), { rx: PI / 2, rz: lean, gloss: .30 });
      cyl(bx + dx, FL + .34, bz + .02, .045, .075, col.steel, { rx: PI / 2, rz: lean, gloss: .5 });
      for (let i = 0; i < 6; i++)
        box(bx + dx, FL + .34, bz + .02, .012, .56, .012, col.steel,
            { hard: true, rz: i * PI / 6 + lean, gloss: .45 });
    }
    const tube = (x1b, y1, x2b, y2, c = frame) => {
      const dx = x2b - x1b, dy = y2 - y1, L = Math.hypot(dx, dy);
      cyl((x1b + x2b) / 2, (y1 + y2) / 2, bz + .02, .020, L, c, { rz: Math.atan2(dx, dy), gloss: .42 });
    };
    tube(bx - .52, FL + .34, bx - .06, FL + .93);
    tube(bx - .06, FL + .93, bx + .30, FL + .93);
    tube(bx - .06, FL + .93, bx + .06, FL + .30);
    tube(bx + .06, FL + .30, bx + .52, FL + .34);
    tube(bx + .30, FL + .93, bx + .06, FL + .30);
    tube(bx + .30, FL + .93, bx + .52, FL + .34);
    tube(bx - .52, FL + .34, bx - .40, FL + .98, col.steelD);
    cap(bx + .32, FL + 1.01, bz + .02, .22, .07, .11, C('#21252a'), { gloss: .16 });
    cyl(bx - .40, FL + 1.02, bz + .02, .016, .40, col.steelD, { rx: PI / 2, gloss: .45 });
    box(bx - .42, FL + .84, bz + .02, .26, .24, .22, C('#5c6266'), { gloss: .3 });
    cyl(bx + .06, FL + .30, bz + .055, .095, .020, col.steelX, { rx: PI / 2, gloss: .5 });
    if (bag) ball(bx - .34, FL + .96, bz - .10, .075, .085, .065, C('#dee3df'), { gloss: .22, alpha: .92 });
    shade(bx, bz, 1.30, .42, .32, FL + .010);
  }
  bicycle(-4.70, LZ1 - .30, C('#2b3e56'), true);
  bicycle(-3.05, LZ1 - .30, C('#5d7a48'), false);
  stop(-5.40, -2.40, LZ1 - .46, LZ1);

  // ---- the 电动车, plugged into the landing socket by an extension lead that goes under 606's
  // door. This is the notice above, disobeyed, nine metres from where it is pinned up.
  (function ebike() {
    const ex = 0.40, ez = FZ1 + .38;
    for (const dx of [-.42, .42]) {
      cyl(ex + dx, FL + .21, ez, .205, .085, col.rubber, { rx: PI / 2, gloss: .18, tag: T('电动车') });
      cyl(ex + dx, FL + .21, ez, .105, .090, C('#8d949a'), { rx: PI / 2, gloss: .34 });
    }
    box(ex, FL + .40, ez, .96, .26, .30, C('#c8ccd0'), { gloss: .28, tag: T('电动车') });
    box(ex - .06, FL + .60, ez, .46, .16, .28, C('#2f3a48'), { gloss: .22, tag: T('电动车') });
    box(ex + .40, FL + .70, ez, .26, .34, .24, C('#c8ccd0'), { gloss: .28 });
    cyl(ex + .44, FL + .92, ez, .014, .48, col.steelD, { rx: PI / 2, gloss: .45 });
    box(ex + .48, FL + .82, ez, .16, .12, .20, C('#e8e4d8'), { hard: true, gloss: .40 });
    // the lead: a coil on the floor and a run of flex along the skirting to 606
    cyl(ex - .30, FL + .022, ez + .16, .085, .020, C('#e2b93f'), { gloss: .30 });
    for (let i = 0; i < 9; i++)
      cyl(ex - .34 - i * .38, FL + .020, FZ1 + .10 + (i % 2) * .012, .009, .38, C('#e2b93f'),
          { rz: PI / 2, gloss: .30 });
    box(ex + .04, FL + .34, ez + .18, .12, .07, .05, C('#efe9d9'), { hard: true, gloss: .30 });
    cyl(ex + .04, FL + .40, ez + .18, .006, .012, C('#4de08a'), { mode: 1, glow: .20 });
    shade(ex, ez, 1.20, .46, .34, FL + .010);
  })();
  stop(-0.30, 1.10, FZ1, FZ1 + .58);

  // ---- 快递. Nobody in 606 has opened any of it. Six boxes against the flat's wall by the door,
  // one of them a rice sack, one a courier's soft bag.
  (function parcels() {
    // Keep the entire pile west of 606's opening. Its former rice sack and collider projected
    // 40 cm into the only entrance and reduced a comfort-width route to an 8 cm thread.
    const px = 1.60;
    const stack = [[px, .00, .40, .32, .30, col.card, '收'], [px - .03, .30, .36, .28, .24, C('#c19a70'), '易碎'],
                   [px + .05, .54, .30, .24, .20, col.card, ''], [px + .82, .00, .46, .34, .34, C('#bb956b'), '大件'],
                   [px + .78, .34, .34, .26, .22, col.card, '']];
    for (const [bx, by, w, d, h, c, mark] of stack) {
      box(bx, FL + by + h / 2, FZ1 + .30, w, h, d, c, { gloss: .08, ry: (by * 7 % 1 - .5) * .12 });
      box(bx, FL + by + h - .004, FZ1 + .30, w - .05, .012, d - .05, C('#c39c71'),
          { hard: true, gloss: .06, ry: (by * 7 % 1 - .5) * .12 });
      // the waybill, and a strip of tape across it
      box(bx + .02, FL + by + h / 2, FZ1 + .30 - d / 2 - .008, w * .48, h * .40, .006, col.white,
          { hard: true, gloss: .06 });
      if (mark) G(bx + .02, FL + by + h / 2, FZ1 + .30 - d / 2 - .016, PI, mark,
                  { size: .038, gap: .006, color: col.redD });
    }
    // a 5 kg rice sack somebody's mother posted from home
    cap(px + 1.42, FL + .16, FZ1 + .30, .17, .46, .13, C('#ddd4bd'), { rz: PI / 2, gloss: .12, tag: T('快递') });
    G(px + 1.42, FL + .17, FZ1 + .17, PI, '东北大米', { size: .042, gap: .007, color: C('#8b5a2f') });
    shade(px + .45, FZ1 + .30, 1.90, .48, .34, FL + .010);
    shade(px + 1.42, FZ1 + .30, .55, .34, .26, FL + .008);
  })();
  stop(1.30, 3.28, FZ1, FZ1 + .50);

  // ---- shoes outside every door, because in a flat of four nobody's shoes come in. And a mop
  // and bucket the cleaner has left at the west end.
  const pair = (px, pz, c, ry = 0, s = 1) => {
    for (const t of [-1, 1])
      cap(px + t * .07 * s, FL + .045 * s, pz, .095 * s, .075 * s, .255 * s, c,
          { ry: ry + t * .04, gloss: .18, tag: T('鞋') });
  };
  pair(N1 - .40, LZ1 - .21, C('#2b3138'));
  pair(N1 + .42, LZ1 - .22, C('#a7432e'), .16);
  pair(N2 + .44, LZ1 - .20, C('#3c5370'), -.10);
  pair(N3 - .42, LZ1 - .21, C('#494438'), .08);
  pair(N4 - .60, LZ1 - .20, C('#8c94a0'), .05, .82);
  for (const [sx, c] of [[-.62, C('#cf9fa7')], [-.42, C('#8fbfae')], [-.22, C('#d0c14f')], [-.02, C('#7a8fb0')]])
    for (const t of [-1, 1])
      cap(FX + sx + t * .055, FL + .032, FZ1 + .30, .07, .05, .18, c, { ry: t * .07, gloss: .14, tag: T('鞋') });
  shade(N1, LZ1 - .21, 1.20, .30, .22, FL + .008);
  shade(N3 - .42, LZ1 - .21, .48, .30, .22, FL + .008);
  shade(FX - .32, FZ1 + .30, 1.00, .32, .22, FL + .008);
  { const mx = X0 + .34;
    cyl(mx, FL + .69, FZ1 + .30, .014, 1.34, C('#987a4c'), { rz: .10, gloss: .18 });
    cap(mx - .13, FL + .10, FZ1 + .30, .10, .16, .22, C('#d7d2c1'), { gloss: .06 });
    cyl(mx + .30, FL + .13, FZ1 + .28, .135, .26, col.plastic, { gloss: .28 });
    cyl(mx + .30, FL + .255, FZ1 + .28, .118, .012, C('#8c999f'), { gloss: .30 });
    shade(mx + .16, FZ1 + .29, .60, .38, .30, FL + .010); }

  // ==================================================================== inside 606
  //
  // Four tenancies, four locks, one kitchen. Everything below follows from that one fact.
  const NAMES = ['李', '张', '周', '明'];
  const TINT = [C('#b8563f'), C('#3f7ca8'), C('#4f8a5c'), C('#a8863c')];   // one colour each

  // ---- lighting. Bare fittings almost everywhere: the shades that came with the flat were taken
  // by whoever moved out first. Two or three modest lamps rather than one bright one.
  function bareBulb(x, z, drop, glowV = .13) {
    cyl(x, CY - drop / 2, z, .004, drop, C('#2b2b2b'), { gloss: .2 });
    box(x, CY - drop - .035, z, .07, .07, .07, C('#efe9d8'), { hard: true, gloss: .3 });
    ball(x, CY - drop - .105, z, .038, .048, .038, col.warm, { mode: 1, glow: glowV, gloss: .4 });
  }
  function tube(x, z, len, along = 'x') {
    const [w, d] = along === 'x' ? [len, .09] : [.09, len];
    box(x, CY - .055, z, w, .07, d, col.white, { hard: true, gloss: .22 });
    box(x, CY - .100, z, along === 'x' ? len - .10 : .055, .028,
        along === 'x' ? .055 : len - .10, col.cool, { hard: true, mode: 1, glow: .12 });
  }

  RM = 'e';
  // ---- 玄关. The whiteboard is the first thing you see and the reason the floor exists: four
  // names, this month's water and electricity, and who has not paid.
  bareBulb(4.60, 2.30, .16);
  light(4.60, CY - .32, 2.30, col.warm, .40, 2.9);
  // the inside face of the front door — a plain sheet of steel with a fire-escape plan taped on
  box(FX, Y + 1.03, FZ1 - .062, FW - .06, 2.02, .05, C('#8e8578'), { hard: true, gloss: .22, tag: T('门') });
  box(FX - .34, Y + 1.62, FZ1 - .094, .30, .40, .006, col.paper, { hard: true, gloss: .05, ry: .02 });
  G(FX - .34, Y + 1.76, FZ1 - .104, PI, '消防疏散图', { size: .034, gap: .005, color: col.redD });
  for (let i = 0; i < 4; i++)
    box(FX - .34, Y + 1.66 - i * .05, FZ1 - .102, .22 - i * .02, .012, .004, col.grey, { hard: true });
  cyl(FX + .40, Y + 1.03, FZ1 - .095, .018, .16, col.steelD, { rx: PI / 2, gloss: .5, tag: T('门') });
  box(FX + .40, Y + 1.44, FZ1 - .092, .09, .13, .03, C('#d9d4c8'), { hard: true, gloss: .3 });
  // keys on nails on the east wall, because the lock is old and there are four sets of them
  for (let i = 0; i < 4; i++) {
    const kz = 2.60 - i * .17;
    cyl(X1 - .06, Y + 1.60, kz, .008, .05, col.steelD, { rz: PI / 2, gloss: .5 });
    cyl(X1 - .085, Y + 1.545, kz, .024, .005, TINT[i], { rz: PI / 2, gloss: .4, tag: T('钥匙') });
    box(X1 - .085, Y + 1.48, kz, .006, .08, .026, col.steel, { hard: true, gloss: .55, tag: T('钥匙') });
  }

  // 白板 — the ledger. Everything about how four strangers live together is on this board, and it
  // is the first thing in the flat you can read.
  //
  // On the 卫生间 partition at x = 3.10, facing +x into the 玄关, NOT on the z = 1.30 wall: that
  // wall stops at x = 3.10 (east of it the entry hall is open to the 走道), so a board hung there
  // floats in the opening with its writing pointing away from the door.
  //
  // Colour and gloss both matter here and both were wrong first time. #f2f1ec at gloss .30 is a
  // square metre of near-white facing a lamp a metre away: it saturated to flat white and the
  // bloom ate every character on it. A real whiteboard in a rented flat is grey, scuffed, and
  // never comes clean.
  const BX = PE + WT / 2 + .016, BZ = 2.28;         // the board's face, and its centre in z
  const BY = Y + 1.50;
  box(BX - .012, BY, BZ, .028, .80, 1.20, C('#d7d9d3'), { hard: true, gloss: .10, tag: T('白板') });
  for (const s of [-1, 1]) box(BX - .014, BY, BZ + s * .615, .034, .84, .035, col.alu,
                               { hard: true, gloss: .34, tag: T('白板') });
  for (const s of [-1, 1]) box(BX - .014, BY + s * .42, BZ, .034, .035, 1.27, col.alu,
                               { hard: true, gloss: .34, tag: T('白板') });
  // `u` runs along the reader's right, which on a +x-facing board is world -z; `v` is up.
  const BG = (u, v, t, o) => G(BX + .006, BY + v, BZ - u, PI / 2, t, { size: .044, gap: .008, ...o });
  const BL = (v, w) => box(BX + .002, BY + v, BZ, .006, .006, w, C('#7d8891'), { hard: true });
  // The figures, in 元, and the rate they are worked out from.
  //
  // The board used to say 水 62.4 / 电 218.6 / 每人 70.2 with no unit on any of them, while F4's
  // fee board two floors down printed 0.35 元/㎡·月 for the same service — so the one place in the
  // building that shows a resident's actual bill was the one place that never named a currency,
  // and the two could not be checked against each other. The rate line is read from `HomeF4.FEES`,
  // which is the estate's published table and the only copy of it: assigned at the top level of
  // js/home-f4.js precisely so a floor that builds earlier in the FlatFit order can read it.
  const RATE = (typeof HomeF4 !== 'undefined' && HomeF4.feeRate)
    ? HomeF4.feeRate('utilities') : '';
  BG(-.34, .310, '六月水电', { size: .058, gap: .012, color: C('#1d3f7a') });
  BL(.258, 1.06);
  BG(-.36, .190, '水 62.4 元', { color: C('#1d3f7a') });
  BG(.24, .190, '电 218.6 元', { color: C('#1d3f7a') });
  BG(-.32, .098, '每人 70.2 元', { size: .040, color: col.ink });
  if (RATE) BG(.26, .098, '公摊 ' + RATE, { size: .026, gap: .004, color: col.grey });
  BL(.042, 1.06);
  const PAID = ['交了', '欠', '交了', '欠'];
  for (let i = 0; i < 4; i++) {
    const v = -.020 - i * .088;
    BG(-.42, v, NAMES[i], { size: .048, color: col.ink });
    BG(-.18, v, '70.2', { size: .040, color: col.grey });
    BG(.22, v, PAID[i], { size: .044, color: PAID[i] === '欠' ? C('#b8342a') : C('#2c7a48') });
    if (PAID[i] === '欠') box(BX + .002, BY + v, BZ - .22, .006, .042, .17, C('#e2b93f'),
                             { hard: true, alpha: .5 });
  }
  BG(-.16, -.352, '本周倒垃圾 张', { size: .034, gap: .005, color: C('#b8342a') });
  // the pen on its string, and the rag that has never got the board clean
  cyl(BX - .028, BY - .34, BZ - .50, .008, .11, C('#2b4f86'), { rx: PI / 2, rz: .3, gloss: .4 });
  box(BX - .026, BY - .37, BZ - .28, .03, .08, .11, C('#c9d3d8'), { gloss: .06 });

  // the shoe rack the shoes overflowed from, and four coats on hooks
  for (const ry of [.14, .44, .74]) {
    box(5.20, FL + ry, 2.94, 1.10, .022, .28, col.steelD, { hard: true, gloss: .4, tag: T('鞋') });
    for (const s of [-1, 1]) cyl(5.20 + s * .52, FL + ry / 2, 2.94, .010, ry, col.steelD, { gloss: .4 });
  }
  for (let i = 0; i < 6; i++) {
    const sx = 4.76 + (i % 3) * .44, ry = [.19, .49][Math.floor(i / 3)];
    for (const t of [-1, 1])
      cap(sx + t * .065, FL + ry + .045, 2.94, .085, .07, .235,
          [C('#2c3238'), C('#a7432e'), C('#3c5370'), C('#494438'), C('#8c94a0'), C('#cf9fa7')][i],
          { ry: t * .05, gloss: .18, tag: T('鞋') });
  }
  shade(5.20, 2.94, 1.20, .34, .26, FL + .008);
  box(4.86, Y + 1.86, FZ1 - .06, 1.60, .05, .05, col.steelD, { hard: true, gloss: .42 });
  for (let i = 0; i < 4; i++) {
    const hx = 4.36 + i * .42;
    cyl(hx, Y + 1.80, FZ1 - .06, .010, .10, col.steelD, { gloss: .45 });
    cap(hx, Y + 1.44, FZ1 - .12, .17, .62, .09, [C('#39485c'), C('#7d4a3e'), C('#4a5d4a'), C('#8a8578')][i],
        { gloss: .12, ...MAT.cloth, tag: T('衣服') });
  }
  // a folded pushchair? no — four umbrellas in a paint tin, which is what this hall actually has
  cyl(5.82, FL + .12, 1.74, .105, .24, C('#9aa2a6'), { gloss: .30 });
  for (let i = 0; i < 4; i++)
    cyl(5.82 + (i % 2 - .5) * .05, FL + .48, 1.74 + (Math.floor(i / 2) - .5) * .05, .020, .74,
        [C('#38505e'), C('#7a3a46'), C('#2f4a3a'), C('#4a4a5c')][i],
        { rz: (i - 1.5) * .05, rx: (i - 1.5) * .04, gloss: .24, tag: T('雨伞') });
  shade(5.82, 1.74, .32, .30, .26, FL + .008);

  RM = 'h';
  // ---- 走道. One bare bulb, a wall of taped notes, and the noodle cartons that live in a
  // corridor because there is nowhere else in the flat for them.
  bareBulb(0.20, 0.45, .22);
  light(0.20, CY - .38, 0.45, col.warm, .42, 3.4);
  bareBulb(-3.90, 0.45, .22, .11);
  light(-3.90, CY - .38, 0.45, col.warm, .34, 3.0);
  // the rota, and four bills nobody has taken down
  box(-0.10, Y + 1.62, CN - WT / 2 - .014, .34, .44, .020, col.paper, { hard: true, gloss: .05, ry: -.02 });
  G(-0.10, Y + 1.78, CN - WT / 2 - .028, PI, '值日表', { size: .056, gap: .010, color: C('#1d3f7a') });
  for (let i = 0; i < 4; i++) {
    G(-0.19, Y + 1.68 - i * .075, CN - WT / 2 - .028, PI, NAMES[i], { size: .038, gap: .006 });
    G(0.02, Y + 1.68 - i * .075, CN - WT / 2 - .028, PI, ['周一', '周三', '周五', '周日'][i],
      { size: .034, gap: .005, color: col.grey });
  }
  for (let i = 0; i < 5; i++)
    box(0.42 + (i % 3) * .20, Y + 1.66 - Math.floor(i / 3) * .24, CN - WT / 2 - .014, .16, .20, .014,
        [col.paper, C('#e6dfc9'), C('#dfe6e2')][i % 3], { hard: true, gloss: .05, ry: (i % 3 - 1) * .05 });
  // 泡面 cartons — the staple of the building, stacked three high against the wall
  const noodleBox = (nx, nz, ny, w, h, d, c, ry) => {
    box(nx, FL + ny + h / 2, nz, w, h, d, c, { gloss: .10, ry });
    box(nx, FL + ny + h - .004, nz, w - .04, .012, d - .04, C('#c8a273'), { hard: true, gloss: .06, ry });
    G(nx, FL + ny + h / 2, nz - d / 2 - .010, PI, '桶面', { size: .052, gap: .009, color: C('#a8352a') });
  };
  noodleBox(-1.30, CS + .22, .00, .46, .26, .34, C('#c9a273'), .04);
  noodleBox(-1.32, CS + .22, .26, .46, .26, .34, C('#bb9668'), -.03);
  noodleBox(-1.28, CS + .22, .52, .40, .22, .30, C('#c9a273'), .07);
  shade(-1.30, CS + .22, .58, .44, .30, FL + .010);
  stop(-1.58, -1.02, CS, CS + .40);
  // a 饮水机 water dispenser at the corridor's west end, which every shared flat has
  (function dispenser() {
    const dx = -5.40, dz = 0.44;
    box(dx, FL + .48, dz, .34, .96, .34, C('#e8e4d9'), { gloss: .26, tag: T('饮水机') });
    box(dx, FL + .98, dz, .30, .06, .30, C('#c9c4b7'), { hard: true, gloss: .3 });
    taper(dx, FL + 1.01, dz, .27, .40, .27, C('#7fb6d6'), { alpha: .55, gloss: .62, tag: T('饮水机') });
    cyl(dx, FL + 1.46, dz, .075, .10, C('#6ea8c8'), { alpha: .55, gloss: .6 });
    for (const [s, c] of [[-1, C('#c04030')], [1, C('#3f7fc0')]])
      cyl(dx + s * .07, FL + .70, dz - .19, .014, .09, c, { rx: PI / 2, gloss: .45 });
    shade(dx, dz, .44, .42, .30, FL + .010);
    // and four mugs on top of it, one each
    for (let i = 0; i < 4; i++)
      cyl(dx - .12 + (i % 2) * .12, FL + 1.03, dz - .12 + Math.floor(i / 2) * .13, .038, .085,
          TINT[i], { gloss: .34, tag: T('杯子') });
  })();
  stop(-5.60, -5.20, CS + .20, CS + .70);

  RM = 'k';
  // ---- 厨房. The whole argument of the flat, in one room. Nothing in here is shared except the
  // hob: four rice cookers, four chopstick jars, four shelves, four labels, four everything.
  (function kitchen() {
    const KX0 = PK + WT / 2, KX1 = PB - WT / 2, KZ1 = FZ1 - .012;
    tube(-1.40, 2.30, 1.30);
    light(-1.40, CY - .16, 2.30, col.cool, .52, 3.2);
    // tiled splashback over the run, and a tiled floor under it
    wall(-1.40, Y + 1.28, KZ1 - .006, KX1 - KX0, 1.66, PI, C('#d2ccbc'), { ...TILE });
    // the run: carcase, worktop, doors. Chipboard with a laminate top, and it has swelled.
    const WTOP = .88;
    box(-1.40, FL + WTOP / 2, 2.90, KX1 - KX0, WTOP, .58, C('#cfc7b6'), { hard: true, gloss: .16 });
    box(-1.40, FL + WTOP + .018, 2.90, KX1 - KX0 + .04, .036, .62, C('#8e8577'),
        { hard: true, gloss: .34, ...MAT.slab });
    for (let i = 0; i < 5; i++)
      box(KX0 + .36 + i * .68, FL + WTOP / 2 - .04, 2.62, .62, WTOP - .16, .022, C('#e2ddd0'),
          { hard: true, gloss: .22 });
    for (let i = 0; i < 5; i++)
      cyl(KX0 + .36 + i * .68, FL + WTOP - .16, 2.60, .009, .12, col.steelD, { rz: PI / 2, gloss: .5 });
    stop(KX0, KX1, 2.60, FZ1);
    // sink, and what is in it
    box(-2.66, FL + WTOP + .020, 2.88, .70, .12, .44, C('#b6bcc0'), { hard: true, gloss: .52, ...MAT.metal });
    box(-2.66, FL + WTOP - .020, 2.88, .60, .10, .36, C('#98a0a5'), { hard: true, gloss: .55 });
    cyl(-2.66, FL + WTOP + .18, 3.06, .016, .30, col.steel, { gloss: .58, tag: T('水龙头') });
    cyl(-2.60, FL + WTOP + .32, 3.00, .014, .16, col.steel, { rx: PI / 2, rz: .3, gloss: .58, tag: T('水龙头') });
    for (let i = 0; i < 6; i++)
      cyl(-2.80 + (i % 3) * .14, FL + WTOP + .04 + Math.floor(i / 3) * .05, 2.82 + (i % 2) * .09,
          .085, .045, [C('#eceae2'), C('#dfe6ea'), C('#e8e2d4')][i % 3],
          { rz: .06 * (i % 3 - 1), gloss: .32, tag: T('碗') });
    // 燃气灶 and the 抽油烟机 over it — an internal kitchen, so the extractor is the only air
    box(-0.90, FL + WTOP + .046, 2.86, .60, .05, .40, C('#2b2f33'), { hard: true, gloss: .48, tag: T('炉子') });
    for (const s of [-1, 1]) {
      cyl(-0.90 + s * .15, FL + WTOP + .080, 2.86, .085, .022, C('#1d2124'), { gloss: .3, tag: T('炉子') });
      cyl(-0.90 + s * .15, FL + WTOP + .096, 2.86, .050, .014, C('#3c4247'), { gloss: .4 });
    }
    A.emitter && A.emitter('f6hob', [], .2);
    taper(-0.90, Y + 1.66, 2.98, .74, .30, .46, C('#c6cbcf'), { gloss: .40, tag: T('抽油烟机') });
    box(-0.90, Y + 1.90, 2.98, .40, .22, .34, C('#c6cbcf'), { hard: true, gloss: .40, tag: T('抽油烟机') });
    cyl(-0.90, Y + 2.28, 2.98, .075, .56, C('#b6bbbf'), { gloss: .34 });
    box(-0.90, Y + 1.50, 2.76, .66, .020, .04, C('#9aa0a4'), { hard: true, gloss: .5 });
    // the wok, and the ladle rail
    cap(-0.30, FL + WTOP + .09, 2.84, .17, .10, .17, C('#3c3630'), { gloss: .30, tag: T('锅') });
    box(-0.30, FL + WTOP + .09, 2.68, .34, .018, .018, C('#4a4038'), { hard: true, gloss: .3 });
    box(0.06, Y + 1.44, KZ1 - .020, .60, .016, .016, col.steelD, { hard: true, gloss: .5 });
    for (let i = 0; i < 4; i++) {
      cyl(-0.16 + i * .15, Y + 1.28, KZ1 - .030, .008, .30, C('#43484c'), { gloss: .4 });
      cyl(-0.16 + i * .15, Y + 1.12, KZ1 - .030, .034, .016, [col.steel, C('#8d5f3c'), col.steel,
          C('#8d5f3c')][i], { rx: PI / 2, gloss: .4, tag: T('勺子') });
    }
    // FOUR RICE COOKERS. The single most legible fact about a 合租 kitchen.
    for (let i = 0; i < 4; i++) {
      const rx = KX0 + .52 + i * .60, rz = 2.78;
      cyl(rx, FL + WTOP + .13, rz, .145, .21, [C('#e4e0d6'), C('#c8452f'), C('#d8d4c8'), C('#3f6f8c')][i],
          { gloss: .34, tag: T('电饭锅') });
      cyl(rx, FL + WTOP + .245, rz, .150, .035, [C('#cfcabd'), C('#a83324'), C('#c2beb2'), C('#33566d')][i],
          { gloss: .40, tag: T('电饭锅') });
      cyl(rx, FL + WTOP + .268, rz, .036, .020, col.steelD, { gloss: .5 });
      box(rx, FL + WTOP + .14, rz - .150, .10, .05, .012, C('#1d2124'), { hard: true, gloss: .5 });
      cyl(rx - .03, FL + WTOP + .14, rz - .158, .006, .006, C('#e2452f'),
          { rx: PI / 2, mode: 1, glow: i === 1 ? .22 : 0 });
      // whose it is, in marker on the side
      G(rx, FL + WTOP + .175, rz - .152, PI, NAMES[i], { size: .036, color: col.ink });
    }
    // FOUR CHOPSTICK JARS, on the shelf over the sink
    box(-2.30, Y + 1.52, KZ1 - .10, 1.20, .028, .20, col.pine, { hard: true, gloss: .20, ...MAT.timber });
    for (const s of [-1, 1]) box(-2.30 + s * .56, Y + 1.42, KZ1 - .10, .026, .20, .18, col.pineD,
                                 { hard: true, gloss: .20 });
    for (let i = 0; i < 4; i++) {
      const jx = -2.72 + i * .28;
      cyl(jx, Y + 1.61, KZ1 - .10, .046, .15, TINT[i], { gloss: .30, tag: T('筷子') });
      for (let k = 0; k < 5; k++)
        cyl(jx + (k % 3 - 1) * .016, Y + 1.76, KZ1 - .10 + (Math.floor(k / 3) - .5) * .018,
            .0045, .24, k % 2 ? C('#b6905c') : C('#8d6a3f'),
            { rz: (k - 2) * .035, rx: (k - 2) * .02, gloss: .24, tag: T('筷子') });
    }
    // FOUR SHELVES, one each, screwed to the east wall — 一人一格. On the wall and NOT on the
    // splashback: the run of units is 0.58 m deep, so a shelf on that wall below 0.90 m is inside
    // the worktop and the bottom one of the four simply vanished.
    const SHX = PB - WT / 2 - .014;
    for (let i = 0; i < 4; i++) {
      const sy = 2.06 - i * .40, sz = 2.10;
      box(SHX, Y + sy, sz, .028, .026, .72, col.pine, { hard: true, gloss: .20, ...MAT.timber });
      box(SHX - .010, Y + sy - .09, sz - .34, .026, .18, .022, col.pineD, { hard: true, gloss: .20 });
      // the name label on the lip
      box(SHX - .016, Y + sy - .020, sz + .26, .006, .05, .10, col.paper, { hard: true, gloss: .05 });
      G(SHX - .026, Y + sy - .020, sz + .26, -PI / 2, NAMES[i], { size: .036, color: TINT[i] });
      // and what is on it — different for each, which is the whole point
      const items = [
        [[.34, .09, C('#c8a273'), 'box'], [.50, .07, C('#a83324'), 'cyl']],
        [[.30, .12, C('#3f6f8c'), 'cyl'], [.48, .10, C('#e4e0d6'), 'box']],
        [[.28, .07, C('#4f8a5c'), 'box'], [.44, .13, C('#d8b45c'), 'cyl'], [.58, .06, C('#a8863c'), 'box']],
        [[.36, .11, C('#8a6238'), 'cyl']],
      ][i];
      for (const [ox, hh, cc, sh] of items) {
        const oz = sz - .32 + ox;
        if (sh === 'cyl') cyl(SHX - .05, Y + sy + .014 + hh / 2, oz, .048, hh, cc, { gloss: .26 });
        else box(SHX - .05, Y + sy + .014 + hh / 2, oz, .09, hh, .11, cc, { gloss: .14 });
      }
    }
    // the fridge, with everybody's name on everything
    (function fridge() {
      const fx = KX0 + .38, fz = 1.30 + WT / 2 + .34;
      box(fx, FL + .82, fz, .62, 1.64, .62, C('#e6e2d8'), { hard: true, gloss: .30, tag: T('冰箱') });
      box(fx - .312, FL + .82, fz, .012, 1.58, .58, C('#d6d1c5'), { hard: true, gloss: .34 });
      box(fx - .318, FL + 1.24, fz, .010, .70, .54, C('#dcd7cb'), { hard: true, gloss: .32, tag: T('冰箱') });
      box(fx - .326, FL + 1.20, fz + .20, .014, .30, .04, col.steelD, { hard: true, gloss: .5 });
      box(fx - .326, FL + .60, fz + .20, .014, .30, .04, col.steelD, { hard: true, gloss: .5 });
      // four fridge magnets and four notes, one per tenant
      for (let i = 0; i < 4; i++) {
        const ny = 1.52 - i * .17, nz = fz - .10 + (i % 2) * .18;
        box(fx - .330, FL + ny, nz, .006, .10, .13, [col.paper, C('#f0e08a'), C('#dfe6e2'), C('#f2d5c8')][i],
            { hard: true, gloss: .05, ry: 0, rx: (i % 3 - 1) * .04 });
        G(fx - .338, FL + ny + .02, nz, -PI / 2, NAMES[i], { size: .032, color: TINT[i] });
        G(fx - .338, FL + ny - .03, nz, -PI / 2, ['别动', '6/12', '我的', '别拿'][i],
          { size: .022, gap: .003, color: col.grey });
      }
      shade(fx, fz, .70, .70, .34, FL + .010);
      stop(fx - .34, fx + .34, fz - .34, fz + .34);
      TH('冰箱', fx - .34, Y + 1.30, fz, '冰箱里的东西都写着名字。',
         'Everything in the fridge has a name written on it.',
         '冰 ice + 箱 box. In a flatshare, nothing in it is communal.', -2.30, 0.60, 2.2);
    })();
    // the bin, overflowing, and the noodle cartons that never got taken down
    cyl(-0.10, FL + .16, 1.66, .16, .32, C('#3f5a6b'), { gloss: .26, tag: T('垃圾桶') });
    ball(-0.10, FL + .34, 1.66, .17, .09, .17, C('#dfe4e0'), { gloss: .20, alpha: .92 });
    cap(-0.14, FL + .40, 1.64, .05, .12, .05, C('#dfe4e0'), { gloss: .20, alpha: .92, rz: .3 });
    shade(-0.10, 1.66, .40, .40, .30, FL + .010);
    TH('厨房', -1.40, Y + 1.30, 2.40, '四个人共用一个厨房。', 'Four people share one kitchen.',
       '厨 kitchen + 房 room. 合租 means the kitchen is the only room nobody locks.', -1.40, 1.90, 2.4,
       'f6k厨房');
    TH('电饭锅', KX0 + 1.12, FL + WTOP + .20, 2.78, '四个电饭锅，一人一个。',
       'Four rice cookers — one each.',
       '电 electric + 饭 cooked rice + 锅 pot. Nobody shares one.', -1.90, 2.28, 1.9);
    TH('筷子', -2.44, Y + 1.66, FZ1 - .16, '筷子筒也是一人一个。', 'Even the chopstick jars are one each.',
       '筷子 chopsticks; 筒 a tube or jar.', -2.44, 2.30, 1.9);
  })();

  RM = 'b';
  // ---- 卫生间. Four shampoos on one rack, four toothbrushes in four cups, one washing machine
  // and a rota taped to the mirror.
  (function bathroom() {
    const BX0 = PB + WT / 2, BX1 = PE - WT / 2, BZ1 = FZ1 - .012, BZ0 = CN + WT / 2;
    for (const [wx, wz, ww, yaw] of [[1.75, BZ1 - .006, BX1 - BX0, PI], [BX0 + .006, 2.25, 1.86, PI / 2],
                                     [BX1 - .006, 2.25, 1.86, -PI / 2], [1.75, BZ0 + .006, BX1 - BX0, 0]])
      wall(wx, Y + 1.02, wz, ww, 2.04, yaw, col.tileW, { ...TILE });
    tube(1.75, 2.10, .90);
    light(1.75, CY - .16, 2.10, col.cool, .42, 2.6);
    // shower corner: a tray, a rail, a curtain, and the 热水器 over it
    flat(2.66, SLAB + .020, 2.72, .82, .82, C('#b8b2a4'), { mode: 9, gloss: .46, ...TILE });
    cyl(2.66, SLAB + .024, 2.72, .045, .010, col.steelD, { gloss: .5 });
    cyl(2.94, Y + 1.98, 2.72, .012, .34, col.steel, { rz: PI / 2, gloss: .5 });
    cyl(2.66, Y + 1.94, 2.72, .012, .56, col.steel, { rx: PI / 2, gloss: .5 });
    cyl(2.94, Y + 1.86, 2.72, .026, .09, col.steel, { rz: PI / 2, gloss: .55, tag: T('淋浴') });
    for (let i = 0; i < 8; i++)
      box(2.32 + .006, Y + 1.30, 2.40 + i * .08, .012, 1.20, .075, C('#dfe7ea'),
          { hard: true, alpha: .62, gloss: .30, tag: T('浴帘') });
    box(2.66, Y + 2.14, BZ1 - .12, .52, .34, .22, C('#e8e4d8'), { hard: true, gloss: .32, tag: T('热水器') });
    cyl(2.66, Y + 1.92, BZ1 - .12, .016, .12, col.steel, { gloss: .5 });
    box(2.50, Y + 2.10, BZ1 - .24, .10, .07, .012, C('#1d2124'), { hard: true, gloss: .5 });
    G(2.50, Y + 2.10, BZ1 - .248, PI, '42', { size: .038, color: C('#e2452f'), mode: 1, glow: .14 });
    // FOUR SHAMPOOS on a wire rack, which is the shot
    box(2.90, Y + 1.06, 2.94, .17, .022, .34, col.steel, { hard: true, gloss: .5 });
    box(2.90, Y + 1.42, 2.94, .17, .022, .34, col.steel, { hard: true, gloss: .5 });
    for (const s of [-1, 1]) cyl(2.90, Y + 1.24, 2.94 + s * .16, .008, .40, col.steel, { gloss: .5 });
    const SHAMP = [[C('#c8452f'), .20, .050], [C('#3f6f8c'), .24, .044], [C('#4f8a5c'), .17, .054],
                   [C('#d8b45c'), .22, .046]];
    for (let i = 0; i < 4; i++) {
      const [cc, hh, rr] = SHAMP[i];
      const bx = 2.90 + (i % 2 - .5) * .07, bz = 2.80 + Math.floor(i / 2) * .09;
      const by = i < 2 ? 1.08 : 1.44;
      cyl(bx, Y + by + hh / 2, bz + (i % 2) * .11, rr, hh, cc, { gloss: .38, tag: T('洗发水') });
      cyl(bx, Y + by + hh + .018, bz + (i % 2) * .11, rr * .40, .036, C('#e8e4d8'), { gloss: .42 });
      box(bx, Y + by + hh * .55, bz + (i % 2) * .11 - rr - .004, rr * 1.3, hh * .34, .006, col.white,
          { hard: true, gloss: .12 });
    }
    // Everything is on the north and east walls and the south strip is left empty, because the
    // room is only 1.85 m deep and `clampMove` spends 0.60 of that on the body: fixtures on both
    // long walls is a bathroom you cannot get into, which is how the first version of this came
    // out — the flood fill from the front door reached 0 cells in here.
    //
    // basin, mirror, four toothbrush cups
    box(0.86, FL + .78, 2.92, .60, .16, .44, C('#f4f2ec'), { hard: true, gloss: .48, tag: T('洗手池') });
    box(0.86, FL + .74, 2.92, .48, .10, .34, C('#e4e1d8'), { hard: true, gloss: .5 });
    cyl(0.86, FL + .42, 2.92, .07, .56, C('#f0eee8'), { gloss: .42 });
    cyl(0.86, FL + .92, 3.06, .015, .18, col.steel, { gloss: .58, tag: T('水龙头') });
    box(0.86, Y + 1.58, BZ1 - .014, .62, .68, .012, C('#cfdbe0'), { hard: true, gloss: .74, alpha: .92,
                                                                    tag: T('镜子') });
    box(0.86, Y + 1.58, BZ1 - .008, .68, .74, .010, col.alu, { hard: true, gloss: .42 });
    // a crack across it, and the rota taped to the corner
    box(0.78, Y + 1.62, BZ1 - .022, .32, .006, .004, C('#a9b4b8'), { hard: true, rz: .5, gloss: .3 });
    box(1.08, Y + 1.34, BZ1 - .026, .13, .16, .004, C('#f0e08a'), { hard: true, gloss: .05, ry: .04 });
    G(1.08, Y + 1.38, BZ1 - .032, PI, '打扫', { size: .028, color: col.ink });
    G(1.08, Y + 1.32, BZ1 - .032, PI, '轮流', { size: .024, color: col.grey });
    for (let i = 0; i < 4; i++) {
      const cx2 = 0.62 + i * .16;
      cyl(cx2, FL + .92, 2.80, .036, .10, TINT[i], { gloss: .34, tag: T('牙刷') });
      cyl(cx2 + .010, FL + 1.03, 2.80, .0055, .18, [C('#e8e4d8'), C('#3f6f8c'), C('#c8452f'), C('#4f8a5c')][i],
          { rz: (i - 1.5) * .06, gloss: .3, tag: T('牙刷') });
    }
    // the washing machine, between the basin and the shower, with a 盆 on top of it
    box(1.70, FL + .42, 2.86, .58, .84, .58, C('#eae6dc'), { hard: true, gloss: .32, tag: T('洗衣机') });
    box(1.70, FL + .84, 2.86, .60, .04, .60, C('#d9d4c8'), { hard: true, gloss: .3 });
    cyl(1.70, FL + .46, 2.58, .17, .04, C('#8f979c'), { rx: PI / 2, gloss: .45, tag: T('洗衣机') });
    cyl(1.70, FL + .46, 2.56, .14, .02, C('#b6c6ce'), { rx: PI / 2, alpha: .5, gloss: .7 });
    box(1.70, FL + .78, 2.62, .40, .07, .10, C('#d2cdc0'), { hard: true, gloss: .34 });
    cyl(1.70, FL + .96, 2.86, .19, .16, col.basin, { gloss: .28, tag: T('盆') });
    // 马桶, on the east wall south of the shower, clear of the doorway
    box(2.72, FL + .21, 1.74, .38, .42, .56, C('#f4f2ec'), { hard: true, gloss: .46, tag: T('马桶') });
    box(2.72, FL + .56, 1.92, .40, .28, .20, C('#f4f2ec'), { hard: true, gloss: .46, tag: T('马桶') });
    box(2.72, FL + .43, 1.68, .36, .04, .40, C('#e8e5dd'), { hard: true, gloss: .5 });
    cyl(2.40, FL + .18, 1.52, .15, .34, C('#c05a4a'), { gloss: .26, tag: T('桶') });
    shade(1.70, 2.86, .68, .68, .32, FL + .010);
    shade(2.72, 1.78, .46, .62, .30, FL + .010);
    stop(0.56, 1.18, 2.68, FZ1);
    stop(1.40, 2.00, 2.56, FZ1);
    stop(2.26, BX1, 2.32, FZ1);
    stop(2.48, 2.98, 1.42, 2.06);
    TH('洗发水', 2.90, Y + 1.20, 2.86, '架子上有四瓶洗发水。', 'Four bottles of shampoo on the rack.',
       '洗 wash + 发 hair + 水 water. One each, and nobody borrows.', 2.16, 2.30, 2.0);
    TH('卫生间', 1.75, Y + 1.20, 2.10, '四个人共用一个卫生间。', 'Four people share one bathroom.',
       '卫生 hygiene + 间 room.', 1.95, 1.75, 2.2, 'f6b卫生间');
  })();

  RM = 'd';
  // ---- the internal doors. Four rooms, four locks, and no two the same — which is what a 合租
  // corridor looks like and is the cheapest way to say "four separate tenancies" without a word.
  //
  // `hasp`: the 门扣 and padlock screwed to the OUTSIDE of a bedroom door. A landlord does not fit
  // these; the tenants do, on the day they realise the other three have keys to the flat.
  function leaf(cx, zw, sgn, w, o = {}) {
    const yaw = sgn > 0 ? 0 : PI, F = d => zw + sgn * d, ht = DTOP - .04, lw = w - .04;
    const c = o.color || C('#c8a87e');
    // architrave both sides, so the doorway has a lining and not a raw edge
    for (const t of [-1, 1]) for (const s2 of [-1, 1])
      box(cx + s2 * (w / 2 + .028), Y + DTOP / 2, zw + t * (WT / 2 + .014), .056, DTOP + .05, .028,
          o.trim || C('#b09270'), { hard: true, gloss: .22 });
    for (const t of [-1, 1])
      box(cx, Y + DTOP + .026, zw + t * (WT / 2 + .014), w + .11, .05, .028, o.trim || C('#b09270'),
          { hard: true, gloss: .22 });
    if (o.none) return null;
    const ang = o.ajar || 0;
    // hinged on the -x jamb unless told otherwise; an ajar leaf swings into the room
    const hx = cx - (o.hinge || -1) * (lw / 2), sw = Math.sin(ang), cw = Math.cos(ang);
    const lx = hx + (o.hinge || -1) * (lw / 2) * cw, lz = F(.03 + (lw / 2) * sw * sgn * -1);
    const p = box(ang ? lx : cx, Y + ht / 2, ang ? lz : F(.03), lw, ht, .042, c,
                  { hard: true, gloss: .22, ry: ang * -sgn, tag: o.tag });
    // two sunk panels, unless it is the 隔断's flush PVC one
    if (!o.flush) for (const [py, ph] of [[ht * .70, ht * .38], [ht * .27, ht * .30]])
      box(ang ? lx : cx, Y + py, F(.052), lw - .16, ph, .014, o.panel || C('#b8946a'),
          { hard: true, gloss: .20, ry: ang * -sgn, tag: o.tag });
    if (!ang) {
      cyl(cx + (o.hinge || -1) * -(lw / 2 - .10), Y + 1.02, F(.062), .018, .09, col.steelD,
          { rx: PI / 2, gloss: .5, tag: o.tag });
      if (o.hasp) {
        // 门扣 and a padlock, each one different
        box(cx + .30, Y + 1.20, F(.052), .18, .05, .022, col.steelX, { hard: true, gloss: .5, tag: T('锁') });
        if (o.hasp === 'pad') {
          box(cx + .34, Y + 1.11, F(.062), .07, .09, .034, C('#c8a83e'), { gloss: .55, tag: T('锁') });
          cyl(cx + .34, Y + 1.17, F(.062), .022, .020, col.steel, { rx: PI / 2, gloss: .6, tag: T('锁') });
        } else if (o.hasp === 'code') {
          box(cx + .34, Y + 1.11, F(.066), .075, .11, .040, C('#3c4247'), { hard: true, gloss: .45, tag: T('锁') });
          for (let i = 0; i < 4; i++)
            cyl(cx + .34, Y + 1.14 - i * .022, F(.088), .014, .012, C('#9aa0a4'),
                { rz: PI / 2, gloss: .5 });
        }
      }
    }
    return p;
  }
  // 卧室3, shut and coded. Notes taped on it, because whoever lives there works nights.
  leaf((D_B3[0] + D_B3[1]) / 2, CN, -1, D_B3[1] - D_B3[0], { hasp: 'code', tag: T('门'), color: C('#c2a279') });
  { const nx = (D_B3[0] + D_B3[1]) / 2, nz = CN - WT / 2 - .012;
    box(nx, Y + 1.62, nz - .002, .18, .22, .010, C('#f0e08a'), { hard: true, gloss: .05, ry: .05 });
    G(nx, Y + 1.68, nz - .010, PI, '上夜班', { size: .036, gap: .005 });
    G(nx, Y + 1.62, nz - .010, PI, '白天睡觉', { size: .028, gap: .004 });
    G(nx, Y + 1.56, nz - .010, PI, '请轻声', { size: .028, gap: .004, color: C('#b8342a') }); }
  // 卧室2, shut and padlocked, with a parcel leaning against it that has been there four days.
  leaf((D_B2[0] + D_B2[1]) / 2, CS, 1, D_B2[1] - D_B2[0], { hasp: 'pad', tag: T('门'), color: C('#b8946a'),
                                                            panel: C('#a8845e') });
  { const px = (D_B2[0] + D_B2[1]) / 2;
    box(px - .38, FL + .14, CS + .22, .30, .28, .22, col.card, { gloss: .08, ry: .12 });
    box(px - .38, FL + .14, CS + .11, .16, .12, .006, col.white, { hard: true, gloss: .06 });
    shade(px - .38, CS + .22, .40, .32, .28, FL + .010); }
  // 卧室1, open. 卫生间, ajar. 厨房 and 客厅, holes with no leaf at all.
  leaf((D_B1[0] + D_B1[1]) / 2, CS, 1, D_B1[1] - D_B1[0], { ajar: 1.30, tag: T('门'), color: C('#c8a87e') });
  leaf((D_BATH[0] + D_BATH[1]) / 2, CN, -1, D_BATH[1] - D_BATH[0],
       { ajar: .90, hinge: 1, tag: T('门'), color: C('#cdb188') });
  leaf((D_KIT[0] + D_KIT[1]) / 2, CN, -1, D_KIT[1] - D_KIT[0], { none: true });
  leaf((D_LIV[0] + D_LIV[1]) / 2, CS, 1, D_LIV[1] - D_LIV[0], { none: true });

  RM = 'r';
  // ---- 卧室1. Two people, one room, one bunk. The bigger of the two share-rooms and the reason
  // there are five rents in a flat with three bedrooms.
  (function bunkRoom() {
    const RX0 = X0, RX1 = P1 - WT / 2, RZ0 = FZ0, RZ1 = CS - WT / 2;
    bareBulb(-4.50, -2.70, .18);
    light(-4.50, CY - .34, -2.70, col.warm, .46, 3.6);
    windowBay(WIN_B1.x, FZ0, WIN_B1.w, WIN_B1.y0, WIN_B1.y1, 0, -1);
    // 上下铺 — a welded steel bunk against the west wall
    // Twenty-five centimetres north opens a comfort-width turn between the bunk and the desks;
    // previously the south-west corner was usable by the body but impossible to enter naturally.
    const bx = RX0 + .58, bz = -2.35, BW = 1.02, BL = 2.00;
    for (const [px, pz] of [[bx - BW / 2 + .04, bz - BL / 2 + .04], [bx + BW / 2 - .04, bz - BL / 2 + .04],
                            [bx - BW / 2 + .04, bz + BL / 2 - .04], [bx + BW / 2 - .04, bz + BL / 2 - .04]])
      cyl(px, FL + .84, pz, .022, 1.68, C('#c7ccd0'), { gloss: .42, tag: T('床') });
    for (const by of [.34, 1.24]) {
      box(bx, FL + by, bz, BW, .05, BL, C('#b6bcc1'), { hard: true, gloss: .38, tag: T('床') });
      box(bx, FL + by + .09, bz, BW - .06, .13, BL - .06, C('#e8e3d4'), { gloss: .10, ...MAT.cloth, tag: T('床') });
      // a duvet each, different, half kicked off
      box(bx + (by > 1 ? .06 : -.05), FL + by + .19, bz + .16, BW - .14, .11, BL - .52,
          by > 1 ? C('#4f7ba0') : C('#a8564a'), { gloss: .08, ...MAT.cloth, ry: by > 1 ? .04 : -.03,
                                                  tag: T('被子') });
      box(bx, FL + by + .16, bz - BL / 2 + .22, BW - .30, .10, .32, C('#efe9dc'),
          { gloss: .08, ...MAT.cloth, tag: T('枕头') });
      // the guard rail on the top bunk, and the ladder
      if (by > 1) {
        box(bx - BW / 2 + .02, FL + by + .30, bz, .020, .30, BL - .30, C('#c7ccd0'),
            { hard: true, gloss: .40, tag: T('床') });
        for (let i = 0; i < 3; i++)
          cyl(bx + BW / 2 - .02, FL + .52 + i * .30, bz + BL / 2 - .18, .014, .30, C('#c7ccd0'),
              { rz: PI / 2, gloss: .42 });
      }
    }
    // the curtain round the bottom bunk — the only privacy either of them has
    for (let i = 0; i < 9; i++)
      box(bx + BW / 2 + .01, FL + .70, bz - BL / 2 + .18 + i * .21, .014, .82, .19, C('#3f5a6b'),
          { hard: true, alpha: .96, gloss: .06, ...MAT.cloth, tag: T('帘子') });
    cyl(bx + BW / 2 + .01, FL + 1.14, bz, .008, BL - .10, col.steel, { rx: PI / 2, gloss: .5 });
    shade(bx, bz, BW + .20, BL + .20, .36, FL + .010);
    stop(bx - BW / 2, bx + BW / 2 + .06, bz - BL / 2, bz + BL / 2);
    // two desks jammed end to end under the window, one tidy and one not
    for (let i = 0; i < 2; i++) {
      const dx = -3.70 + i * -1.00, dz = FZ0 + .48;
      box(dx, FL + .72, dz, .96, .04, .52, col.lamL, { hard: true, gloss: .28, ...MAT.timber, tag: T('桌子') });
      for (const s of [-1, 1]) box(dx + s * .44, FL + .36, dz, .05, .72, .48, col.lamD,
                                   { hard: true, gloss: .24 });
      shade(dx, dz, 1.00, .56, .30, FL + .010);
      if (i === 0) {
        box(dx, FL + .76, dz + .04, .34, .022, .24, C('#3c4247'), { hard: true, gloss: .40, tag: T('电脑') });
        box(dx, FL + .88, dz - .09, .34, .22, .014, C('#22282c'), { hard: true, gloss: .42, rx: -.24,
                                                                    tag: T('电脑') });
        box(dx, FL + .88, dz - .10, .31, .19, .006, C('#2f4f6a'), { hard: true, mode: 1, glow: .07 });
      } else {
        for (let k = 0; k < 5; k++)
          box(dx + .18, FL + .76 + k * .034, dz + .02, .19, .030, .26,
              [C('#7d3b33'), C('#3f5a6b'), C('#6b5a3a'), C('#8a6238'), C('#4a5f4a')][k],
              { hard: true, gloss: .12, ry: (k % 3 - 1) * .04, tag: T('书') });
        cyl(dx - .26, FL + .81, dz, .042, .14, TINT[1], { gloss: .34, tag: T('杯子') });
      }
    }
    stop(-4.28, -3.22, FZ0, FZ0 + .76);
    // a clothes rail, because the wardrobe was never replaced
    cyl(-3.40, FL + 1.62, -2.20, .016, 1.30, col.steel, { rx: PI / 2, gloss: .5, tag: T('衣架') });
    for (const s of [-1, 1]) cyl(-3.40, FL + .81, -2.20 + s * .64, .014, 1.62, col.steel, { gloss: .45 });
    for (let i = 0; i < 8; i++) {
      const hz = -2.78 + i * .17;
      cyl(-3.40, FL + 1.56, hz, .012, .10, col.steel, { rx: PI / 2, gloss: .5 });
      cap(-3.40, FL + 1.18, hz, .12, .68, .12,
          [C('#39485c'), C('#8a8578'), C('#7d4a3e'), C('#4a5d4a'), C('#a8564a'), C('#3f6f8c'),
           C('#c9c4b7'), C('#5a4a5c')][i], { gloss: .10, ...MAT.cloth, tag: T('衣服') });
    }
    shade(-3.40, -2.20, .40, 1.40, .28, FL + .010);
    // suitcases under the desk and a stack of boxes in the corner: nobody here has unpacked
    box(-2.10, FL + .17, FZ0 + .40, .70, .34, .48, C('#39485c'), { gloss: .16, ry: .06, tag: T('行李箱') });
    box(-2.10, FL + .34, FZ0 + .40, .62, .03, .42, C('#2f3c4c'), { hard: true, gloss: .2 });
    for (let i = 0; i < 3; i++)
      box(-2.20 + i * .03, FL + .38 + i * .28, -1.10, .48 - i * .04, .28, .40 - i * .03, col.card,
          { gloss: .08, ry: i * .07 });
    shade(-2.10, FZ0 + .40, .80, .56, .30, FL + .010);
    shade(-2.15, -1.10, .56, .48, .30, FL + .010);
    stop(-2.50, -1.80, -1.35, -.85);
    TH('上下铺', bx, FL + .90, bz, '这间屋子住两个人，睡上下铺。',
       'Two people live in this room and sleep in a bunk bed.',
       '上 upper + 下 lower + 铺 a sleeping place.', -4.30, -2.60, 2.2, 'f6r床');
    TH('卧室', -3.60, Y + 1.30, -1.60, '这是最大的一间卧室。', 'This is the biggest bedroom.',
       '卧 to lie down + 室 room.', -3.60, -1.20, 2.2, 'f6r卧室');
  })();

  RM = 'g';
  // ---- 隔断房. The point of the whole floor.
  //
  // It is not a bedroom, it is a bedroom-shaped object standing inside the living room, and every
  // decision here is meant to say so at a glance: the walls stop 0.50 m under the ceiling, the
  // door is white PVC among six timber ones, the plasterboard is unpainted on the living-room
  // side with the screw heads still showing, and there is no window — the only daylight it gets
  // comes over the top of its own wall from somebody else's room.
  //
  // It is also where the 考研 student lives, because in a real flat the cheapest room goes to the
  // one saving for the exam, and a desk lamp burning at midnight in a windowless box is the whole
  // story of this floor in one prop.
  (function partitionRoom() {
    const PZ0 = SZ + WT / 2, PZ1 = CS - WT / 2, PX0 = P2 + WT / 2, PX1 = SX - WT / 2;
    // the studwork, seen from inside: the boards are only on the living-room face, so from in here
    // you look at the timber. This is exactly how these are built and it is why they are illegal.
    // Studs bare only over the bed, at the south end. The north bay was boarded on the inside too
    // — badly, with the sheet an inch short at the top — because that is the wall he wanted to
    // stick things to, and a wall of exposed studwork in front of the calendar reads as a cage
    // and hides the one piece of writing this room exists for.
    const BAY = -2.24;
    for (let i = 0; i < 3; i++) {
      const sz2 = PZ0 + .16 + i * .40;
      if (sz2 > BAY - .06) continue;
      box(PX1 - .014, Y + STUD / 2, sz2, .038, STUD - .02, .062, col.pine,
          { hard: true, gloss: .14, ...MAT.timber });
    }
    box(PX1 - .014, Y + 1.06, (PZ0 + BAY) / 2, .044, .058, BAY - PZ0, col.pineD,
        { hard: true, gloss: .14, ...MAT.timber });
    box(PX1 - .012, Y + (STUD - .06) / 2, (BAY + PZ1) / 2, .024, STUD - .06, PZ1 - BAY, C('#ded8c6'),
        { hard: true, gloss: .06 });
    box(PX1 - .014, Y + STUD - .046, (BAY + PZ1) / 2, .028, .026, PZ1 - BAY, col.boardE,
        { hard: true, gloss: .05 });
    box(PX1 - .014, Y + STUD / 2, BAY, .030, STUD - .04, .050, col.pine,
        { hard: true, gloss: .14, ...MAT.timber });
    // the PVC door in the stud wall — the wrong door, in a lining of the wrong white, and it has
    // never shut properly. Hung ajar, so the 台灯 inside throws a wedge of warm light into the 客厅.
    { const dz = (D_PART[0] + D_PART[1]) / 2, dw = D_PART[1] - D_PART[0], dh = 1.92;
      for (const t of [-1, 1]) for (const s2 of [-1, 1])
        box(SX + t * (WT / 2 + .014), Y + dh / 2, dz + s2 * (dw / 2 + .030), .028, dh + .06, .060,
            col.pvcD, { hard: true, gloss: .28 });
      for (const t of [-1, 1])
        box(SX + t * (WT / 2 + .014), Y + dh + .030, dz, .028, .060, dw + .12, col.pvcD,
            { hard: true, gloss: .28 });
      // the lining through the 100 mm of partition, so the opening has thickness
      for (const s2 of [-1, 1])
        box(SX, Y + dh / 2, dz + s2 * (dw / 2 - .008), WT - .01, dh, .016, col.pvcD,
            { hard: true, gloss: .24 });
      box(SX, Y + dh - .008, dz, WT - .01, .016, dw, col.pvcD, { hard: true, gloss: .24 });
      const ang = .42, hz2 = dz - dw / 2;
      const lx = SX + (dw - .05) / 2 * Math.sin(ang), lz = hz2 + (dw - .05) / 2 * Math.cos(ang);
      box(lx, Y + (dh - .04) / 2, lz, .038, dh - .04, dw - .05, col.pvc,
          { hard: true, gloss: .32, ry: -ang, tag: T('门') });
      // the two moulded panels a cheap PVC leaf has, so it does not read as a blank sheet
      for (const [py, ph] of [[(dh - .04) * .68, (dh - .04) * .40], [(dh - .04) * .26, (dh - .04) * .30]])
        box(lx + .026 * Math.cos(ang), Y + py, lz - .026 * Math.sin(ang), .012, ph, dw - .22,
            col.pvcD, { hard: true, gloss: .28, ry: -ang, tag: T('门') });
      cyl(lx + .05 * Math.cos(ang), Y + 1.00, lz + (dw / 2 - .12) * Math.cos(ang) - .05 * Math.sin(ang),
          .016, .08, C('#c8ccd0'), { rx: PI / 2, ry: -ang, gloss: .5, tag: T('门') });
    }
    // a bare bulb, and the 台灯 that is the real light in here
    bareBulb(0.60, -1.20, .14, .10);
    light(0.60, CY - .28, -1.20, col.warm, .30, 2.2);
    // the bed: a single, against the west wall, with the folding table at its foot
    const bx = PX0 + .52, bz = -1.90;
    box(bx, FL + .22, bz, .96, .32, 1.94, C('#b09270'), { hard: true, gloss: .20, ...MAT.timber, tag: T('床') });
    box(bx, FL + .42, bz, .92, .12, 1.90, C('#e6e0d0'), { gloss: .10, ...MAT.cloth, tag: T('床') });
    box(bx + .04, FL + .52, bz + .18, .82, .11, 1.34, C('#4f7ba0'), { gloss: .08, ...MAT.cloth, ry: .03,
                                                                      tag: T('被子') });
    box(bx, FL + .50, bz - .78, .60, .10, .30, C('#efe9dc'), { gloss: .08, ...MAT.cloth, tag: T('枕头') });
    shade(bx, bz, 1.06, 2.04, .34, FL + .010);
    stop(bx - .50, bx + .50, bz - 1.00, bz + 1.00);
    // the folding table, the laptop, the lamp, the textbooks
    const dx = 1.62, dz = -1.10;
    box(dx, FL + .70, dz, .52, .036, .92, C('#d8d2c0'), { hard: true, gloss: .26, tag: T('桌子') });
    for (const s of [-1, 1]) {
      cyl(dx - .20, FL + .35, dz + s * .38, .014, .70, col.steelD, { gloss: .42 });
      cyl(dx + .20, FL + .35, dz + s * .38, .014, .70, col.steelD, { gloss: .42 });
      box(dx, FL + .35, dz + s * .38, .42, .016, .016, col.steelD, { hard: true, gloss: .42 });
    }
    shade(dx, dz, .58, 1.00, .30, FL + .010);
    box(dx + .04, FL + .73, dz - .16, .30, .020, .22, C('#3c4247'), { hard: true, gloss: .40, tag: T('电脑') });
    box(dx - .09, FL + .85, dz - .16, .022, .21, .31, C('#22282c'), { hard: true, gloss: .42, rz: .22,
                                                                      tag: T('电脑') });
    box(dx - .078, FL + .85, dz - .16, .008, .18, .28, C('#39516b'), { hard: true, mode: 1, glow: .09 });
    // 台灯 — on, at whatever hour it is, because it always is
    cyl(dx + .12, FL + .74, dz + .30, .075, .022, C('#e2ded2'), { gloss: .32, tag: T('台灯') });
    cyl(dx + .12, FL + .90, dz + .30, .010, .34, C('#e2ded2'), { gloss: .32, tag: T('台灯') });
    taper(dx + .06, FL + 1.06, dz + .30, .17, .13, .17, C('#e8e4d8'),
          { rz: .5, gloss: .30, tag: T('台灯') });
    ball(dx + .04, FL + 1.08, dz + .30, .035, .035, .035, col.warm, { mode: 1, glow: .20 });
    light(dx + .06, FL + 1.06, dz + .30, C('#ffd9a0'), .62, 2.0);
    // the pool it throws on the table — a quad, not `A.glow`, because a decal is bucketed by deck
    flat(dx + .10, FL + .742, dz + .18, .44, .52, C('#ffe9c2'), { mode: 1, glow: .05, alpha: .55 });
    // the textbooks, standing and stacked
    for (let k = 0; k < 6; k++)
      box(dx + .16, FL + .74 + .155, dz + .38 - k * .034, .17, .30 - (k % 3) * .02, .030,
          [C('#7d3b33'), C('#3f5a6b'), C('#6b5a3a'), C('#8a6238'), C('#4a5f4a'), C('#5a4a5c')][k],
          { hard: true, gloss: .12, tag: T('课本') });
    for (let k = 0; k < 4; k++)
      box(dx - .12, FL + .75 + k * .036, dz + .28, .30, .032, .22,
          [C('#b8563f'), C('#e2ded2'), C('#3f7ca8'), C('#d8b45c')][k],
          { hard: true, gloss: .14, ry: (k % 3 - 1) * .05, tag: T('课本') });
    // 考研 calendar, counting down, on the stud wall over the table
    box(PX1 - .034, Y + 1.62, dz - .04, .014, .50, .38, col.paper, { hard: true, gloss: .05, tag: T('日历') });
    G(PX1 - .044, Y + 1.78, dz - .04, -PI / 2, '距考研还有', { size: .042, gap: .007, color: col.ink });
    G(PX1 - .044, Y + 1.63, dz - .04, -PI / 2, '87', { size: .155, gap: .020, color: C('#b8342a') });
    G(PX1 - .044, Y + 1.50, dz - .04, -PI / 2, '天', { size: .050, color: col.ink });
    G(PX1 - .044, Y + 1.42, dz - .04, -PI / 2, '一定要考上', { size: .034, gap: .005, color: C('#1d3f7a') });
    // sticky notes with English vocabulary, stuck round the calendar in a block
    const VOCAB = ['abandon', 'diligent', 'ambiguous', 'persist', 'threshold', 'stubborn',
                   'reluctant', 'endure', 'vocabulary'];
    for (let k = 0; k < 9; k++) {
      const oz = -1.04 + (k % 3) * .22, oy = 1.98 - Math.floor(k / 3) * .21;
      box(PX1 - .032, Y + oy, dz + oz, .012, .17, .17,
          [C('#f0e08a'), C('#c9e8b8'), C('#f2c8c0')][k % 3],
          { hard: true, gloss: .05, rx: (k % 3 - 1) * .05, tag: T('便利贴') });
      G(PX1 - .042, Y + oy + .022, dz + oz, -PI / 2, VOCAB[k],
        { size: .022, gap: .002, color: C('#2b3138') });
      G(PX1 - .042, Y + oy - .030, dz + oz, -PI / 2,
        ['放弃', '勤奋', '模糊', '坚持', '门槛', '固执', '不情愿', '忍受', '词汇'][k],
        { size: .028, gap: .004, color: C('#7a4a63') });
    }
    // a small fan on a box, because a room with no window in July is unlivable without one
    box(PX0 + .28, FL + .24, PZ1 - .42, .34, .48, .30, col.card, { gloss: .08, ry: .05 });
    cyl(PX0 + .28, FL + .60, PZ1 - .42, .16, .10, C('#e2ded2'), { rx: PI / 2, gloss: .30, tag: T('电扇') });
    cyl(PX0 + .28, FL + .60, PZ1 - .44, .145, .03, C('#c6c1b4'), { rx: PI / 2, gloss: .24 });
    for (let k = 0; k < 3; k++)
      box(PX0 + .28, FL + .60, PZ1 - .455, .10, .026, .010, C('#d8d4c8'),
          { hard: true, rz: k * 2.09, gloss: .3 });
    shade(PX0 + .28, PZ1 - .42, .40, .36, .30, FL + .010);
    TH('隔断房', SX - .30, Y + 1.40, -1.60, '客厅被隔出来一间房，没有窗户。',
       'The living room has been partitioned into a room with no window.',
       '隔断 to partition off. A 隔断房 is the extra room a landlord builds to let a fifth rent.',
       0.90, -1.30, 2.4, 'f6g隔断房');
    TH('台灯', dx + .06, FL + 1.02, dz + .30, '台灯一直亮到半夜。', 'The desk lamp stays on till midnight.',
       '台 a stand + 灯 lamp.', 0.90, -1.30, 2.2);
    TH('便利贴', PX1 - .06, Y + 1.90, dz - .82, '墙上贴满了背单词的便利贴。',
       'The wall is covered in sticky notes for learning words.',
       '便利 convenient + 贴 to stick.', 1.30, -1.55, 2.0);
    TH('考研', PX1 - .06, Y + 1.62, dz - .04, '离考研还有八十七天。',
       'Eighty-seven days until the postgraduate exam.',
       '考 to sit an exam + 研 short for 研究生, a postgraduate.', 1.30, -1.20, 2.0, 'f6g日历');
  })();

  RM = 'l';
  // ---- 客厅. What is left of the living room after the box was built in it: an L-shaped strip
  // with a sofa nobody chose, a television on a 快递 box, and a drying rack in the middle of it.
  (function living() {
    const LX0 = P2 + WT / 2, LX1 = X1, LZ0 = FZ0, LZ1 = CS - WT / 2;
    windowBay(WIN_LV.x, FZ0, WIN_LV.w, WIN_LV.y0, WIN_LV.y1, 0, -1);
    windowBay(X1, WIN_LE.z, WIN_LE.w, WIN_LE.y0, WIN_LE.y1, 1, 0);
    bareBulb(4.20, -2.70, .20);
    light(4.20, CY - .36, -2.70, col.warm, .48, 4.0);
    light(1.10, CY - .30, -4.10, col.warm, .30, 2.8);
    // the raw face of the 隔断. Unpainted board, taped joints, screw heads, and the 0.50 m of
    // daylight over the top of it that is the only reason the box inside is not pitch dark.
    for (let i = 0; i < 5; i++)
      box(SX + WT / 2 + .008, Y + STUD / 2, SZ + .30 + i * .52, .010, STUD - .04, .014, C('#cfc4a8'),
          { hard: true, gloss: .04 });
    for (let i = 0; i < 14; i++)
      cyl(SX + WT / 2 + .010, Y + .22 + (i % 7) * .30, SZ + .34 + Math.floor(i / 7) * 1.60, .006, .004,
          C('#9a8f78'), { rz: PI / 2, gloss: .3 });
    box((P2 + SX) / 2, Y + STUD / 2, SZ - WT / 2 - .008, SX - P2, STUD - .04, .010, C('#dcd3ba'),
        { hard: true, gloss: .05 });
    // the sofa, against the east wall, facing the television
    (function sofa() {
      const sx = 5.28, sz = -2.60;
      box(sx, FL + .22, sz, .82, .38, 1.86, C('#7d6a58'), { gloss: .10, ...MAT.cloth, tag: T('沙发') });
      box(sx + .28, FL + .58, sz, .26, .72, 1.86, C('#8b7864'), { gloss: .10, ...MAT.cloth, tag: T('沙发') });
      for (const s of [-1, 1])
        box(sx, FL + .42, sz + s * .88, .82, .34, .16, C('#8b7864'), { gloss: .10, ...MAT.cloth });
      for (const [oz, cc] of [[-.52, C('#a8564a')], [.34, C('#4f7ba0')]])
        box(sx - .06, FL + .46, sz + oz, .40, .13, .40, cc, { gloss: .08, ...MAT.cloth, ry: .3, tag: T('靠垫') });
      // a duvet on it, because somebody sleeps here when their friend visits
      box(sx - .10, FL + .46, sz + .78, .56, .14, .46, C('#c9b898'), { gloss: .08, ...MAT.cloth, ry: -.2 });
      shade(sx, sz, 1.10, 2.10, .34, FL + .010);
      stop(sx - .44, sx + .44, sz - 1.00, sz + 1.00);
    })();
    // the television, on a stack of unopened parcels rather than a stand
    box(4.10, FL + .18, -4.34, .74, .36, .40, col.card, { gloss: .08, ry: .04 });
    box(4.10, FL + .48, -4.34, .66, .24, .34, C('#c19a70'), { gloss: .08, ry: -.05 });
    box(4.10, FL + .78, -4.30, 1.02, .60, .05, C('#22282c'), { hard: true, gloss: .40, tag: T('电视') });
    const tvp = box(4.10, FL + .78, -4.26, .96, .54, .012, C('#2f4152'),
                    { hard: true, mode: 1, glow: .05, tag: T('电视') });
    A.tv && A.tv(tvp);
    box(4.10, FL + .47, -4.30, .18, .04, .04, C('#22282c'), { hard: true, gloss: .3 });
    shade(4.10, -4.34, .86, .50, .32, FL + .010);
    // the low table, and what is on it at eleven at night
    box(4.60, FL + .32, -3.10, .78, .04, .52, col.lamL, { hard: true, gloss: .26, ...MAT.timber, tag: T('桌子') });
    for (const [ox, oz] of [[-.34, -.20], [.34, -.20], [-.34, .20], [.34, .20]])
      cyl(4.60 + ox, FL + .16, -3.10 + oz, .018, .32, col.lamD, { gloss: .22 });
    for (let i = 0; i < 3; i++) {
      cyl(4.42 + i * .22, FL + .40, -3.16 + (i % 2) * .16, .075, .10,
          [C('#e2ded2'), C('#c8452f'), C('#e8e2d4')][i], { gloss: .28, tag: T('泡面') });
      cyl(4.42 + i * .22, FL + .45, -3.16 + (i % 2) * .16, .078, .010, C('#c9a273'),
          { gloss: .16, tag: T('泡面') });
    }
    for (let k = 0; k < 2; k++)
      cyl(4.86, FL + .43 + k * .002, -2.98 + k * .10, .0045, .22, C('#b6905c'),
          { rz: PI / 2 + k * .1, rx: .1, gloss: .24, tag: T('筷子') });
    shade(4.60, -3.10, .84, .58, .28, FL + .010);
    stop(4.20, 5.00, -3.38, -2.82);
    // two 塑料凳, which is what a shared flat has instead of chairs. Legs splayed and a rim under
    // the seat: four bare 14 mm poles and a 28 mm disc read as sticks in the floor, not as a stool.
    for (const [sx2, sz2, cc] of [[3.30, -3.34, C('#c8452f')], [3.30, -2.42, C('#3f6f8c')]]) {
      cyl(sx2, FL + .400, sz2, .170, .040, cc, { gloss: .28, tag: T('凳子') });
      cyl(sx2, FL + .362, sz2, .152, .042, cc, { gloss: .24, tag: T('凳子') });
      for (let k = 0; k < 4; k++) {
        const a = k * PI / 2 + PI / 4;
        cyl(sx2 + Math.cos(a) * .115, FL + .18, sz2 + Math.sin(a) * .115, .022, .36, cc,
            { rz: -Math.cos(a) * .12, rx: Math.sin(a) * .12, gloss: .28, tag: T('凳子') });
      }
      cyl(sx2, FL + .105, sz2, .128, .018, cc, { gloss: .24 });
      shade(sx2, sz2, .38, .38, .30, FL + .010);
    }
    // 晾衣架 — the drying rack, in the dead corner the 隔断 left behind, with four people's
    // washing on it. There is no balcony, so it lives in the middle of the living room.
    (function rack() {
      const rx = 0.95, rz = -4.20;
      for (const s of [-1, 1]) {
        cyl(rx + s * .52, FL + .58, rz, .016, 1.16, col.steel, { rz: s * .10, gloss: .5, tag: T('晾衣架') });
        cyl(rx + s * .52, FL + .04, rz, .016, .70, col.steel, { rx: PI / 2, gloss: .5 });
      }
      for (const [oy, ln] of [[1.14, 1.10], [.94, 1.04], [.74, .98]])
        cyl(rx, FL + oy, rz, .009, ln, col.steel, { rz: PI / 2, gloss: .5 });
      const LAUN = [[C('#e6e2d6'), .46], [C('#3f5a6b'), .40], [C('#a8564a'), .36], [C('#e8e4d8'), .44],
                    [C('#4f7ba0'), .34], [C('#c9b898'), .42], [C('#2b3138'), .30], [C('#8fbfae'), .38]];
      for (let i = 0; i < 8; i++) {
        const hx = rx - .48 + (i % 4) * .32, oy = [1.14, .94][Math.floor(i / 4)];
        const [cc, ln] = LAUN[i];
        cyl(hx, FL + oy, rz, .012, .10, col.steel, { rx: PI / 2, gloss: .5 });
        cap(hx, FL + oy - ln / 2 - .03, rz, .10, ln, .10, cc,
            { gloss: .08, ...MAT.cloth, rz: (i % 3 - 1) * .05, tag: T('衣服') });
      }
      // socks on the bottom rail, in pairs that do not match
      for (let i = 0; i < 6; i++)
        cap(rx - .40 + i * .16, FL + .68, rz, .035, .17, .030,
            [C('#2b3138'), C('#e6e2d6'), C('#3f5a6b'), C('#2b3138'), C('#a8564a'), C('#e6e2d6')][i],
            { gloss: .08, ...MAT.cloth, tag: T('袜子') });
      shade(rx, rz, 1.20, .70, .30, FL + .010);
      // Tight in z. The corner the 隔断 left behind is only 1.9 m deep and the rack is the only
      // thing in it: a collider as deep as the rack's shadow leaves nowhere to stand beside it.
      stop(rx - .54, rx + .54, rz - .24, rz + .24);
    })();
    // a floor fan, a mop, and the boxes nobody has taken to the bins
    for (let i = 0; i < 4; i++)
      box(2.06 + (i % 2) * .04, FL + .16 + Math.floor(i / 2) * .32, -4.40 + (i % 2) * .06,
          .40 - (i % 2) * .04, .30, .34, i % 2 ? C('#c19a70') : col.card, { gloss: .08, ry: i * .09 });
    G(2.06, FL + .16, -4.40 - .19, PI, '快递', { size: .046, gap: .008, color: C('#a8352a') });
    shade(2.10, -4.40, .52, .44, .30, FL + .010);
    stop(1.82, 2.34, -4.62, -4.14);
    TH('客厅', 4.30, Y + 1.30, -2.10, '客厅只剩下一半了。', 'Only half the living room is left.',
       '客 guest + 厅 hall. The other half is somebody\'s bedroom now.', 4.30, -1.20, 2.6, 'f6l客厅');
    TH('晾衣架', 0.95, FL + 1.00, -4.20, '客厅里放着一个晾衣架。',
       'A drying rack stands in the living room.',
       '晾 to air + 衣 clothes + 架 rack. No balcony, so it lives indoors.', 1.40, -3.60, 2.2, 'f6l晾衣架');
    TH('电视', 4.10, FL + .78, -4.26, '电视放在快递箱上。', 'The television sits on a parcel box.',
       '电 electric + 视 to view.', 4.20, -3.60, 2.2);
    TH('泡面', 4.52, FL + .44, -3.12, '桌上又是泡面。', 'Instant noodles on the table again.',
       '泡 to steep + 面 noodles.', 4.10, -2.60, 1.9);
  })();

  RM = '';
  // ---- the words that belong to the flat as a whole, and to the landing.
  TH('合租', FX, Y + 1.30, 2.60, '我们四个人合租这套房子。', 'The four of us share this flat.',
     '合 together + 租 to rent. Four tenancies, one kitchen, one bathroom.', FX, 2.20, 2.4, 'f6e合租');
  TH('白板', BX + .04, BY, BZ, '白板上写着这个月的水电费。',
     'The whiteboard has this month\'s water and electricity on it.',
     '白 white + 板 board. 水电费 is the utilities bill.', 3.95, 2.28, 2.0, 'f6e白板');
  TH('房租', BX + .04, BY - .30, BZ - .30, '这个月的房租还没交。', 'This month\'s rent is not paid yet.',
     '房 room + 租 rent. 押一付三 — one month deposit, three months up front.', 3.95, 2.10, 2.0, 'f6e白板');
  TH('快递', 2.55, FL + .40, FZ1 + .18, '门口堆着一摞没拆的快递。',
     'A stack of unopened parcels by the door.',
     '快 fast + 递 to deliver.', 2.55, 3.95, 2.0);
  TH('邻居', N2, Y + 1.30, LZ1 - .10, '这一层有六户人家。', 'There are six households on this floor.',
     '邻 neighbouring + 居 to dwell.', N2, 5.10, 2.0);
  TH('走廊', -2.20, Y + 1.60, 4.30, '走廊里停着两辆自行车。', 'Two bicycles are parked in the corridor.',
     '走 walk + 廊 covered passage.', -2.20, 4.30, 3.0, 'f6走廊');
  TH('自行车', -3.90, Y + .80, LZ1 - .28, '走廊里停着自行车。', 'Bicycles are parked in the corridor.',
     '自 self + 行 travel + 车 vehicle.', -3.90, 5.00, 2.2);
  TH('电动车', 0.40, Y + .60, FZ1 + .40, '电动车在楼道里充电，这是不许的。',
     'The e-bike is charging in the corridor, which is not allowed.',
     '电动 electric-powered + 车 vehicle.', 0.40, 4.20, 2.0);
  TH('通知', PX, Y + 1.58, FZ1 + .03, '墙上贴了一张禁止群租的通知。',
     'A notice against overcrowded lets is stuck on the wall.',
     '通 to pass through + 知 to know: to inform.', PX, 4.10, 2.0);
  TH('消防栓', HX, Y + 1.40, HZ + .12, '墙上有一个消火栓。', 'There is a fire hydrant on the wall.',
     '消防栓 is what you call it; 消火栓 is what is painted on the cabinet. 栓 is a plug or a valve.', HX, 4.20, 2.0);
  TH('电表', MX, Y + 1.52, MZ + .08, '电表箱上有六块表。', 'There are six meters in the box.',
     '电 electricity + 表 gauge.', MX, 4.15, 2.0);
  TH('安全出口', X1 - .10, Y + STOP + .19, SZE, '安全出口在东头。', 'The emergency exit is at the east end.',
     '安全 safe + 出口 exit.', 5.30, 4.30, 2.3);
  // The stair door itself is tagged T('楼梯') at the east end and had no word on it, so the second
  // way out of this landing was scenery. Six storeys up with one lift, it is the one the flatshare
  // actually uses when the car is stuck on twelve.
  TH('楼梯', X1 - .10, Y + 1.10, SZE, '楼梯在走廊的东头。',
     'The stairs are at the east end of the corridor.',
     '楼 storey + 梯 ladder. 爬楼梯 pá lóutī — to climb them, which is six floors from here.',
     5.30, 4.30, 2.1, T('楼梯'));
  TH('门', FX, Y + 1.20, FZ1 + .12, '这是六零六的门。', 'This is the door of 606.',
     '门 a door or gate — and the 门 in 门口, the doorway.', FX, 3.95, 1.9);

  // ---- stamp the deck on everything built above. See the note over `P0`: without this every prop
  // on this floor is drawn on all twelve of them.
  if (P0 >= 0) for (let i = P0; i < A.props.length; i++)
    if (A.props[i].deck === undefined) A.props[i].deck = A.deck === undefined ? 6 : A.deck;

  HomeF6.built = true;
  return HomeF6;
};
