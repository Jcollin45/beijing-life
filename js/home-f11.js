// 十一楼 · 邻居 — an ordinary residential floor, near the top of the tower.
//
// Registered into FlatFit (declared at the top of js/world.js). `DECK_OF` maps 'f11' to deck 11,
// so `A.y0` is 31.00 and every height in this file is written `Y + h`. Nothing here is allowed to
// name 31.00 — see the note in js/world.js about the 主卧 that got built in the lobby.
//
// ---------------------------------------------------------------- what this file has to build
//
// F11 is the floor TOWER.md leaves plain, and "plain" is the trap. This is the floor that has to
// prove the building is a building rather than a row of set pieces, so it has to be the most
// CONVINCING even though it is the least dramatic. Everything it does is materials, light and
// small true detail.
//
// It also carries the old upper-floor shell fallback. The shared shell now owns a working landing
// on every deck and advertises that with `A.shellLanding`; the fallback therefore stands down when
// that flag is present, while this floor keeps its own finishes and its taped outage notice.
//
// ---------------------------------------------------------------- the plan
//
//   landing   x -6.00 .. 6.00   z  3.20 .. 6.20        the building's corridor band
//   flat      x -6.00 .. 6.00   z -5.00 .. 3.20        everything behind the one door that opens
//   LIFT      x  1.60 .. 3.40   z  4.90 .. 6.20        the working shaft
//   LIFT_B    x -0.40 .. 1.40   z  4.90 .. 6.20        the second shaft, doors shut
//
// Six households on the landing, numbered the way the block numbers them (there is no 1104):
//
//   1101  north wall, x -5.20   a shoe rack and eight pairs — a big household
//   1102  north wall, x -3.40   nothing at all. Not one thing. That is the loudest door here
//   1103  north wall, x -1.60   a child's drawing taped up at a child's height
//   1105  north wall, x  4.10   a 小心地滑 A-frame propped against it and left there
//   1106  north wall, x  5.35   a week of 快递 nobody has taken in, and a phone number
//   1107  south wall, x  3.90   倒福 and 春联 — and the one door that opens
//
// ---------------------------------------------------------------- being near the top
//
// The one thing F11 has that F3 does not is altitude, so every distinguishing feature is a
// consequence of it:
//
//   - the landing window at the west gable looks *down* onto the city, and late western sun throws
//     the length of the corridor through it. The whole west side of this floor — the landing, the
//     主卧, the 厨房 — is on that gable and gets that light.
//   - building services stop being invisible this high: a 高区增压泵 cabinet, a 消防立管 rising
//     through the slab, a bank of meters, and a bolted cat ladder to a padlocked 屋面检修口 that
//     goes to F12.
//
// ---------------------------------------------------------------- the rules this file follows
//
//   - every surface is single-sided. A quad faces its yaw; get it backwards and you look through
//     the wall. Perimeter walls here are `wall` quads facing inward; every partition is a solid
//     box, which cannot be got backwards.
//   - nothing is coplanar with anything. Floor finishes step in millimetres off the slab at
//     Y + .004; everything on a wall steps out of its face.
//   - a landing must stay walkable. `clampMove` inflates every collider by the 0.30 body radius,
//     so the arithmetic is written out at the colliders rather than assumed.
const HomeF11 = { built: false };

FlatFit['f11'] = A => {
  if (!A || !A.box || !A.wall || !A.flat || typeof A.zone !== 'function') {
    console.warn('home-f11: toolkit A incomplete — floor 11 not built');
    return HomeF11;
  }

  // ---------------------------------------------------------------- toolkit
  const box = A.box, cyl = A.cyl, ball = A.ball, flat = A.flat, wall = A.wall;
  const cap = A.cap || A.box, taper = A.taper || A.box;
  const ceiling = A.ceiling || ((x, y, z, w, d, c, o) => flat(x, y, z, w, d, c, o));
  const glyph = A.glyph || (() => []);
  const stop = A.stop || (() => null);
  const thing = A.th || (() => null);
  const light = A.light || (() => null);
  const shadeAt = A.shade || (() => null);
  const glowFn = typeof A.glow === 'function' ? A.glow : null;
  const sky = typeof A.sky === 'function' ? A.sky : (p => p);
  const cityFn = typeof A.city === 'function' ? A.city : ((l, p) => p);
  const dialFn = typeof A.dial === 'function' ? A.dial : null;
  const MX = A.M || (typeof M !== 'undefined' ? M : null);

  const Y = A.y0;                        // world y of deck 11 — never a literal
  const PI = Math.PI;

  // ---------------------------------------------------------------- the plan, read not typed
  const CR = A.CORR || { x0: -6, x1: 6, z0: 3.2, z1: 6.2, h: 2.60 };
  const FT = A.FLAT || { x0: -6, x1: 6, z0: -5.0, z1: 3.2, h: 2.60 };
  const LF = A.LIFT || { x0: 1.6, x1: 3.4, z0: 4.9, z1: 6.2 };
  const LB = A.LIFT_B || { x0: -0.4, x1: 1.4, z0: 4.9, z1: 6.2 };
  const X0 = CR.x0, X1 = CR.x1;          // the building's two gables
  const ZS = CR.z0, ZN = CR.z1;          // the landing's south wall, and its north wall
  const ZF = FT.z0;                      // the flat's own south face — the outside of the block
  const H = CR.h, CY = Y + H;            // clear height, and the ceiling plane
  const FL = Y + .006;                   // where a thing standing on the floor stands
  const TRIM = .130;                     // skirting height, as on the two existing decks

  // The one door that opens, on the same centre line as your own 202 nine decks down. A block
  // repeats its plan on every floor; half the point of this floor is that it looks like it does.
  const FX = 3.90, FW = 1.00, FTOP = 2.10;
  const FDX0 = FX - FW / 2, FDX1 = FX + FW / 2;

  // Tell the shell how tall this deck's room box is. Without it `R.setRoom` keeps the number it
  // uses for the flat — 5.70 — and the shader's `toCeiling` term is `max(uRoom.y - p.y, 0)`, which
  // at y 31 is zero everywhere: the floor comes out uniformly flat and a quarter dark with no
  // ceiling gradient at all. One line, and it is the difference between a room and a fog.
  if (typeof A.deckH === 'function') A.deckH(CY);

  // ---------------------------------------------------------------- palette
  // The landing is painted in the same two colours as every other landing in the block, because it
  // is the same painter. What is different on this floor is the light on them, not the paint.
  const col = {
    wall:   C('#d3ccbb'), wallC: C('#c9bda8'), dado: C('#a2a89c'), dadoT: C('#7f867c'),
    tile:   C('#c6bfb1'), tileD: C('#ada596'),
    steel:  C('#b2b8bd'), steelD: C('#8a9197'), steelX: C('#6d747a'), steelP: C('#5b6167'),
    alu:    C('#c3c9cd'), glass: C('#cfdde4'),
    doorA:  C('#6c3a2b'), doorB: C('#7d4634'), doorD: C('#4b2820'),
    brass:  C('#b98c3e'), brassD: C('#8a6828'),
    red:    C('#ae2b1f'), redD: C('#7c1d14'), gold: C('#e2b660'), ink: C('#241c16'),
    green:  C('#1e7a45'), greenL: C('#4ec489'),
    white:  C('#f0ede4'), paper: C('#eee8d9'), grey: C('#7d848a'), greyL: C('#a7aeb3'),
    warm:   C('#f6efd8'), dead: C('#b9b6ad'),
    rubber: C('#3a3f42'), navy:  C('#2c3f57'), card: C('#b48f63'), leaf: C('#4c7a44'),
    yellow: C('#d8b02c'), plastic: C('#3f6f96'), pink: C('#c07a86'),
    // inside the flat
    floor:  C('#9c7549'), floorD: C('#7c5a35'),
    cream:  C('#dcd2bc'), linen: C('#cec3ad'), lace: C('#eeeade'),
    sofa:   C('#93a3a6'), sofaD: C('#74868a'), sofaS: C('#5f7175'),
    wood:   C('#8a6440'), woodD: C('#5b4028'), woodL: C('#b08b5e'),
    jade:   C('#3f7564'), water: C('#b9d3cf'), reed: C('#c9a35e'), reedD: C('#a8823f'),
    // outside
    sky:    C('#b6cee1'), skyLo: C('#dbe4ea'), haze: C('#dde6ec'),
    cFar:   C('#a9bccd'), cMid: C('#74899c'), cNear: C('#4e6072'), cRoof: C('#8fa2b1'),
    cLitA:  C('#ffcf85'), cLitB: C('#cfe0ec'),
    sun:    C('#ffd7a0'),
  };
  const MAT = {
    plaster: { mode: 4, mat: 'plaster', matScale: .62, matAmt: .20, nrmAmt: .26 },
    conc:    { mode: 0, mat: 'concrete', matScale: .80, matAmt: .22, nrmAmt: .28 },
    metal:   { mode: 0, mat: 'metal', matScale: .55, matAmt: .16, nrmAmt: .24 },
    timber:  { mode: 6, mat: 'wood', matScale: .95, matAmt: .24, nrmAmt: .28 },
    cloth:   { mode: 7, mat: 'fabric', matScale: .60, matAmt: .22, nrmAmt: .26 },
  };

  // Writing always stands off the face it is written on; `glyph` pushes its quads 12 mm along the
  // yaw it is handed, so passing the front face plus the yaw that faces the reader is always right.
  const G = (x, y, z, yaw, text, o) => glyph(x, y, z, yaw, text, { color: col.white, ...o });
  // A contact shadow, measured off this deck's floor rather than off the toolkit's default.
  const shade = (x, z, w, d, a = .34, y) => shadeAt(x, z, w, d, a, y === undefined ? FL + .010 : y);
  // A thing you can look at and say. `focus` is a spot the body can genuinely stand on.
  const TH = (hz, x, y, z, zh, en, note, fx, fz, reach = 1.7, tag) =>
    thing(hz, x, y, z, zh, en, note, { focus: [fx, fz], reach, tag: tag || hz });
  // A pool of light on a surface. `sun` fades it with the daylight, which is what makes the
  // afternoon on this floor an afternoon rather than a painted stripe.
  const pool = (x, y, z, w, d, c, a, sun, ry) => {
    if (!glowFn || !MX) return null;
    return glowFn(MX.trs(x, y, z, ry || 0, w, 1, d), c, a, !!sun);
  };
  // The same thing stood up against a wall. `M.trs` can only make a quad facing +y, so a patch of
  // light on a vertical face has to be built the way `A.wall` builds one — translate, yaw, stand
  // up, scale — or it comes out as a thin sliver lying flat in mid-air, which is what the first
  // version of the sun on this floor actually was.
  const wallPool = (x, y, z, yaw, w, h, c, a, sun) => {
    if (!glowFn || !MX) return null;
    return glowFn(MX.mul(MX.trans(x, y, z),
      MX.mul(MX.rotY(yaw), MX.mul(MX.rotX(PI / 2), MX.scale(w, 1, h)))), c, a, !!sun);
  };

  // ===============================================================================================
  // THE SHELL — slab, ceiling, the building's four walls, the wall between landing and flat
  // ===============================================================================================
  //
  // Two slabs, because the landing and the flat are two different floors: polished tile on the
  // common parts, timber inside the front door. Both at Y + .004, which is the height every other
  // deck's slab uses, so anything written against `FL` here means the same as it does downstairs.
  flat(0, Y + .004, (ZS + ZN) / 2, X1 - X0, ZN - ZS, col.tile,
       { mode: 9, gloss: .40, mat: 'tile', matScale: .46, matAmt: .26, nrmAmt: .28 });
  flat(0, Y + .004, (ZF + ZS) / 2, X1 - X0, ZS - ZF, col.floor,
       { mode: 3, gloss: .26, mat: 'wood', matScale: 1.15, matAmt: .28, nrmAmt: .32 });
  // A darker border laid inside the landing tile. A common floor is never one field of anything,
  // and the border is what tells the eye where the walking is.
  flat(0, Y + .010, (ZS + ZN) / 2, X1 - X0 - .70, ZN - ZS - .60, col.tileD,
       { mode: 9, gloss: .44, mat: 'tile', matScale: .34, matAmt: .22, nrmAmt: .24 });
  flat(0, Y + .015, (ZS + ZN) / 2, X1 - X0 - .94, ZN - ZS - .84, col.tile,
       { mode: 9, gloss: .46, mat: 'tile', matScale: .52, matAmt: .24, nrmAmt: .26 });

  ceiling(0, CY, (ZS + ZN) / 2, X1 - X0, ZN - ZS, C('#e7e1d4'), { gloss: .08, glow: .02 });
  ceiling(0, Y + FT.h, (ZF + ZS) / 2, X1 - X0, ZS - ZF, C('#f1ede4'), { gloss: .08, glow: .02 });

  const PL = { ...MAT.plaster };
  // The building's own four walls, both bands, each facing into the room it belongs to.
  wall(0, Y + H / 2, ZN, X1 - X0, H, PI, col.wall, PL);                       // landing, north
  wall(0, Y + FT.h / 2, ZF, X1 - X0, FT.h, 0, col.cream, PL);                 // flat, south
  for (const s of [-1, 1]) {
    wall(s * X1, Y + H / 2, (ZS + ZN) / 2, ZN - ZS, H, -s * PI / 2, col.wall, PL);
    wall(s * X1, Y + FT.h / 2, (ZF + ZS) / 2, ZS - ZF, FT.h, -s * PI / 2, col.cream, PL);
  }
  // The wall between the landing and the flat, with the one opening cut in it. Two faces, two
  // colours: the landing side is the common paint, the flat side is the flat's own.
  for (const [a, b] of [[X0, FDX0], [FDX1, X1]]) {
    wall((a + b) / 2, Y + H / 2, ZS, b - a, H, 0, col.wallC, PL);              // landing side
    wall((a + b) / 2, Y + FT.h / 2, ZS, b - a, FT.h, PI, col.cream, PL);       // flat side
  }
  wall(FX, Y + (FTOP + H) / 2, ZS, FW, H - FTOP, 0, col.wallC, PL);
  wall(FX, Y + (FTOP + FT.h) / 2, ZS, FW, FT.h - FTOP, PI, col.cream, PL);
  // The reveal through the opening: the wall has no thickness, so without these the doorway is a
  // paper cut. 140 mm of jamb, which is a Chinese blockwork partition with its render on.
  for (const s of [-1, 1])
    box(FX + s * (FW / 2 + .055), Y + FTOP / 2, ZS, .11, FTOP, .15, col.wallC,
        { hard: true, gloss: .12, ...MAT.plaster });
  box(FX, Y + FTOP + .055, ZS, FW + .22, .11, .15, col.wallC,
      { hard: true, gloss: .12, ...MAT.plaster });

  // Skirting, every wall, both bands. 130 mm, standing 65 mm off the plaster — the same trim the
  // shell lays downstairs, so the two decks read as one painter's work.
  const skirt = (x, z, sx, sz, c) =>
    box(x, Y + TRIM / 2, z, sx, TRIM, sz, c, { hard: true, gloss: .20 });
  skirt(0, ZN - .045, X1 - X0, .065, C('#8d8578'));
  skirt(0, ZF + .045, X1 - X0, .065, col.woodD);
  for (const s of [-1, 1]) {
    skirt(s * (X1 - .045), (ZS + ZN) / 2, .065, ZN - ZS, C('#8d8578'));
    skirt(s * (X1 - .045), (ZF + ZS) / 2, .065, ZS - ZF, col.woodD);
  }
  for (const [a, b] of [[X0, FDX0], [FDX1, X1]]) {
    skirt((a + b) / 2, ZS + .045, b - a, .065, C('#8d8578'));
    skirt((a + b) / 2, ZS - .045, b - a, .065, col.woodD);
  }

  // ---------------------------------------------------------------- the dado
  //
  // The band of darker paint at hand height is the single thing that stops a painted corridor
  // reading as a white box. It stands proud of the wall as a box, never as a second quad in the
  // wall plane, and it runs in segments — a band drawn straight across a doorway cuts it in half.
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

  // ===============================================================================================
  // THE LIFT SHAFTS AND THE LANDING
  // ===============================================================================================
  //
  // This used to be required while `buildShafts` stopped at deck 2. Keep it as a compatibility
  // fallback, but never place a second surround, indicator or call panel over the shell-owned one.
  const DOORW = (A.CAR && A.CAR.door) || .80;
  const LFX = (LF.x0 + LF.x1) / 2, LBX = (LB.x0 + LB.x1) / 2;

  if (!A.shellLanding) {
    const DOORH = (A.CAR && A.CAR.doorH) || 2.10;
    const shaftSteel = C('#7e868c'), shaftDark = C('#3d4348');
    for (const sh of [LF, LB]) {
      const cx = (sh.x0 + sh.x1) / 2, hw = (sh === LF ? DOORW : .92) / 2;
      // the shaft box seen from the landing: two flanks and a back, so the eye never finds the void
      wall(sh.x0, Y + H / 2, (sh.z0 + sh.z1) / 2, sh.z1 - sh.z0, H, PI / 2, C('#b8ae9c'), PL);
      wall(sh.x1, Y + H / 2, (sh.z0 + sh.z1) / 2, sh.z1 - sh.z0, H, -PI / 2, C('#b8ae9c'), PL);
      wall(cx, Y + H / 2, sh.z1, sh.x1 - sh.x0, H, PI, C('#7c756a'), PL);
      // lintel and jambs — 120 mm of wall standing at the front of the shaft
      box(cx, Y + (DOORH + H) / 2, sh.z0 + .06, hw * 2 + 1.20, H - DOORH, .12, col.wall,
          { hard: true, gloss: .12, ...MAT.plaster });
      for (const s of [-1, 1])
        box(cx + s * (hw + .30), Y + DOORH / 2, sh.z0 + .06, .60, DOORH, .12, col.wall,
            { hard: true, gloss: .12, ...MAT.plaster });
      // brushed steel surround, 20 mm proud of the plaster
      for (const s of [-1, 1])
        box(cx + s * (hw + .07), Y + DOORH / 2 + .05, sh.z0 - .01, .14, DOORH + .10, .05, shaftSteel,
            { hard: true, gloss: .50, tag: '电梯', ...MAT.metal });
      box(cx, Y + DOORH + .075, sh.z0 - .01, hw * 2 + .42, .14, .05, shaftSteel,
          { hard: true, gloss: .50, tag: '电梯', ...MAT.metal });
      // the floor indicator over the doors
      box(cx, Y + DOORH + .34, sh.z0 - .015, .52, .30, .06, shaftDark,
          { hard: true, gloss: .34, tag: '电梯' });
      G(cx, Y + DOORH + .34, sh.z0 - .05, PI, sh === LF ? '十一' : '－',
        { size: .15, gap: .012, color: C('#ff9a4d'), mode: 1, glow: .16, tag: '电梯' });
    }
    // The second shaft is simply shut on every residential floor.
    const zf = LB.z0;
    box(LBX, Y + 1.03, zf + .10, .96, 2.02, .05, C('#8d959b'),
        { hard: true, gloss: .30, ...MAT.metal });
    box(LBX, Y + 1.03, zf + .066, .90, 1.94, .012, C('#9aa2a8'), { hard: true, gloss: .28 });

    // The fallback call panel keeps older shell implementations usable.
    const CPX = 3.72, CPZ = LF.z0 - .02;
    box(CPX, Y + 1.12, CPZ, .13, .22, .04, C('#d9d4c8'), { hard: true, gloss: .34, tag: '电梯' });
    for (const [dy, ch] of [[.045, '▲'], [-.045, '▼']]) {
      box(CPX, Y + 1.12 + dy, CPZ - .022, .055, .055, .012, C('#ffbe6a'),
          { hard: true, mode: 1, glow: .16, tag: '电梯' });
      G(CPX, Y + 1.12 + dy, CPZ - .036, PI, ch, { size: .038, color: C('#4a3316'), tag: '电梯' });
    }
  }

  // F11's corridor finish and notice remain authored here even when the shell owns the hardware.
  for (const sh of [LF, LB]) {
    const cx = (sh.x0 + sh.x1) / 2, hw = (sh === LF ? DOORW : .92) / 2;
    dado('x', sh.z0, -1, sh === LF
      ? [[sh.x0 - .10, cx - hw - .38], [cx + hw + .38, sh.x1 + .10]]
      : [[sh.x0 - .10, sh.x1 + .10]]);
  }
  box(LBX, Y + 1.62, LB.z0 - .048, .44, .30, .020, col.paper, { hard: true, gloss: .05, ry: .03 });
  G(LBX, Y + 1.70, LB.z0 - .060, PI, '此梯停用', { size: .052, gap: .010, color: col.redD });
  G(LBX, Y + 1.60, LB.z0 - .060, PI, '请乘另一部', { size: .042, gap: .008, color: col.ink });
  G(LBX, Y + 1.51, LB.z0 - .060, PI, '物业管理处', { size: .034, gap: .007, color: col.grey });

  // ===============================================================================================
  // COLLIDERS — every one written with the arithmetic that says it is walkable
  // ===============================================================================================
  //
  // `clampMove` inflates each of these by the 0.30 body radius. What that leaves:
  //
  //   in front of the shafts   z 3.56 .. 4.60   1.04 m of standing room, the length of the run
  //   the west pocket          x -5.60 .. -0.80,  z 3.56 .. 5.84
  //   the east pocket          x  3.80 ..  5.60,  z 3.56 .. 5.84
  //   through the front door   x  3.70 ..  4.10   at z 2.80 .. 3.60
  //
  // so the landing is one connected region gable to gable and the flat hangs off it.
  stop(X0, FDX0, ZS - .09, ZS + .06);            // the flat's wall, landing side
  stop(FDX1, X1, ZS - .09, ZS + .06);
  stop(X0, X1, ZN - .06, ZN + .40);              // the landing's north wall
  stop(X0, X1, ZF - .40, ZF + .06);              // the block's south face
  stop(X0 - .40, X0 + .06, ZF, ZN);
  stop(X1 - .06, X1 + .40, ZF, ZN);
  if (!A.shellLanding) {
    stop(LB.x0 - .10, LB.x1 + .10, LB.z0, LB.z1 + .05);               // the dead shaft
    stop(LF.x0 - .10, LFX - DOORW / 2, LF.z0, LF.z1 + .05);           // the working shaft's piers
    stop(LFX + DOORW / 2, LF.x1 + .10, LF.z0, LF.z1 + .05);
  }

  // ===============================================================================================
  // ZONES — where the body may stand, per room, and which lamp is overhead in each
  // ===============================================================================================
  //
  // `A.zone` is required: `setFloor(11)` refuses a deck with no zones and falls back to the flat.
  // Rooms that only touch along a line are NOT connected — `clampMove` clamps to whichever zone the
  // body is currently inside, and a zone edge is a wall as far as it is concerned. So every doorway
  // gets its own small zone straddling the opening, exactly as ZONE[2] does for your own.
  const HALL = { x0: -0.85, x1: 6.00, z0: 1.45, z1: 3.20 };
  const LIV  = { x0: -0.85, x1: 6.00, z0: -3.30, z1: 1.45 };
  const BAL  = { x0: -0.85, x1: 6.00, z0: -5.00, z1: -3.30 };
  const BED  = { x0: -6.00, x1: -0.85, z0: 0.30, z1: 3.20 };
  const KIT  = { x0: -6.00, x1: -0.85, z0: -2.10, z1: 0.30 };
  const BZ = BAL.z1, BDX0 = 1.10, BDX1 = 2.60;   // the balcony screen, and its walk-through

  A.zone({ id: 'f11', x0: X0, x1: X1, z0: ZS, z1: ZN,
           light: [0.6, CY - .30, 4.30], ceil: CY - .06 });
  A.zone({ id: 'f11hall', x0: HALL.x0, x1: HALL.x1, z0: HALL.z0, z1: HALL.z1,
           light: [3.20, Y + FT.h - .26, 2.35], ceil: Y + FT.h - .06 });
  A.zone({ id: 'f11gap', x0: FDX0, x1: FDX1, z0: 2.50, z1: 3.90,
           light: [FX, Y + FT.h - .26, 3.00], ceil: Y + FT.h - .06 });
  A.zone({ id: 'f11liv', x0: LIV.x0, x1: LIV.x1, z0: LIV.z0, z1: LIV.z1,
           light: [2.10, Y + FT.h - .22, -0.70], ceil: Y + FT.h - .06 });
  // The doorway zones are all a good deal larger than their openings, and deliberately: two zones
  // that only touch along a line are two rooms with a wall between them, because `clampMove`
  // clamps to the zone the body is standing in and then looks no further. Each of these overlaps
  // the rooms it joins by at least 0.15 m of *post-clamp* run — the colliders, not the zone edges,
  // are what shape the doorway.
  A.zone({ id: 'f11livgap', x0: 1.20, x1: 2.80, z0: 0.70, z1: 2.20,
           light: [2.00, Y + FT.h - .26, 1.45], ceil: Y + FT.h - .06 });
  A.zone({ id: 'f11bal', x0: BAL.x0, x1: BAL.x1, z0: BAL.z0, z1: BAL.z1,
           light: [2.40, Y + FT.h - .28, -4.10], ceil: Y + FT.h - .06 });
  A.zone({ id: 'f11balgap', x0: BDX0, x1: BDX1, z0: -4.10, z1: -2.50,
           light: [1.85, Y + FT.h - .26, -3.30], ceil: Y + FT.h - .06 });
  A.zone({ id: 'f11bed', x0: BED.x0, x1: BED.x1, z0: BED.z0, z1: BED.z1,
           light: [-3.40, Y + FT.h - .24, 1.70], ceil: Y + FT.h - .06 });
  A.zone({ id: 'f11bedgap', x0: -1.60, x1: -0.10, z0: 1.85, z1: 2.85,
           light: [-0.85, Y + FT.h - .26, 2.35], ceil: Y + FT.h - .06 });
  A.zone({ id: 'f11kit', x0: KIT.x0, x1: KIT.x1, z0: KIT.z0, z1: KIT.z1,
           light: [-3.40, Y + FT.h - .26, -0.90], ceil: Y + FT.h - .06 });
  A.zone({ id: 'f11kitgap', x0: -1.60, x1: -0.10, z0: -0.80, z1: 0.15,
           light: [-0.85, Y + FT.h - .26, -0.35], ceil: Y + FT.h - .06 });

  // ===============================================================================================
  // THE FLAT'S PARTITIONS
  // ===============================================================================================
  //
  // Solid boxes, not paired quads: a partition built out of two one-sided walls can be got
  // backwards, and one 120 mm thick gives every doorway a real reveal for nothing. They stop 15 mm
  // under the ceiling quad so no two faces share the plane at Y + 2.60.
  const PT = .12, PH = FT.h - .015, PYC = Y + PH / 2;
  // The holes are SORTED before the spans are walked, and that sort is not a nicety. Given
  // [[1.95, 2.75], [-0.70, 0.05]] the unsorted walk pushes one span from a0 straight past the
  // second hole to 1.95 and then never revisits it — so the 厨房 doorway came out as solid wall,
  // in the geometry and in the collider both, and the kitchen was a sealed room you could see the
  // light under. Measured with World.clampMove, not spotted by eye.
  const sorted = holes => holes.slice().sort((p, q) => p[0] - q[0]);
  function part(axis, plane, a0, a1, holes_, c, top) {
    const holes = sorted(holes_);
    const spans = [];
    let cur = a0;
    for (const [h0, h1] of holes) { if (h0 > cur) spans.push([cur, h0]); cur = Math.max(cur, h1); }
    if (cur < a1) spans.push([cur, a1]);
    for (const [s0, s1] of spans) {
      const m = (s0 + s1) / 2, L = s1 - s0;
      if (axis === 'x') box(m, PYC, plane, L, PH, PT, c, { hard: true, gloss: .12, ...MAT.plaster });
      else box(plane, PYC, m, PT, PH, L, c, { hard: true, gloss: .12, ...MAT.plaster });
    }
    for (const [h0, h1] of holes) {
      const m = (h0 + h1) / 2, L = h1 - h0, ht = top === undefined ? 2.05 : top;
      const hh = PH - ht;
      if (hh <= .01) continue;
      if (axis === 'x') box(m, Y + ht + hh / 2, plane, L, hh, PT, c,
                            { hard: true, gloss: .12, ...MAT.plaster });
      else box(plane, Y + ht + hh / 2, m, PT, hh, L, c, { hard: true, gloss: .12, ...MAT.plaster });
    }
  }
  part('x', HALL.z0, HALL.x0, HALL.x1, [[1.20, 2.80]], col.cream, 2.10);      // hall | 客厅
  part('z', BED.x1, BAL.z0, HALL.z1, [[1.95, 2.75], [-0.70, 0.05]], col.cream, 2.05);
  part('x', BED.z0, BED.x0, BED.x1, [], col.cream);                           // 主卧 | 厨房
  part('x', KIT.z0, KIT.x0, KIT.x1, [], col.cream);                           // 厨房 | 卫生间

  // Colliders for the partitions. ±0.07 either side of a 0.12 wall is the wall and not a centimetre
  // more: every centimetre here is a centimetre off a room.
  const wallStop = (axis, plane, a0, a1, holes_) => {
    const holes = sorted(holes_);
    let cur = a0;
    const runs = [];
    for (const [h0, h1] of holes) { if (h0 > cur) runs.push([cur, h0]); cur = Math.max(cur, h1); }
    if (cur < a1) runs.push([cur, a1]);
    for (const [s0, s1] of runs)
      axis === 'x' ? stop(s0, s1, plane - .07, plane + .07) : stop(plane - .07, plane + .07, s0, s1);
  };
  wallStop('x', HALL.z0, HALL.x0, HALL.x1, [[1.20, 2.80]]);
  wallStop('z', BED.x1, BAL.z0, HALL.z1, [[1.95, 2.75], [-0.70, 0.05]]);
  wallStop('x', BED.z0, BED.x0, BED.x1, []);
  wallStop('x', KIT.z0, KIT.x0, KIT.x1, []);
  // The balcony screen, which is structure and not furniture: solid either side of the doorway.
  stop(BAL.x0, BDX0, BZ - .09, BZ + .09);
  stop(BDX1, BAL.x1, BZ - .09, BZ + .09);

  // ===============================================================================================
  // THE LANDING'S PAINT
  // ===============================================================================================
  // south wall, split round the one doorway; north wall, split round both shafts
  dado('x', ZS, 1, [[X0, FDX0 - .09], [FDX1 + .09, X1]]);
  dado('x', ZN, -1, [[X0, X1]]);
  // west end split round the window reveal, east end split round the fire stair
  const WZ = 4.55, WW = 2.10, WSILL = .85, WTOP = 2.32;      // the landing window
  // 397/400 — the eleventh floor's own opening. The gable is X0 and this file already says in
  // prose that the window faces WEST; registering it is what makes the room light like it.
  if (A.setWin)
    A.setWin(X0 + .02, Y + (WSILL + WTOP) / 2, WZ, WW / 2, (WTOP - WSILL) / 2, [-1, 0, 0]);
  const SZ = 4.10, SW = .95, STOP = 2.06;                    // the fire stair door
  dado('z', X0, 1, [[ZS, WZ - WW / 2 - .10], [WZ + WW / 2 + .10, ZN]]);
  dado('z', X1, -1, [[ZS, SZ - SW / 2 - .08], [SZ + SW / 2 + .08, ZN]]);

  // ===============================================================================================
  // CEILING SERVICES
  // ===============================================================================================
  //
  // The sprinkler main runs at z = 3.40, hugging the flat's wall, because that is the only line
  // down this landing clear for all twelve metres. Four lengths rather than one 11.6 m cylinder —
  // a barrel scaled three hundred to one shades like a mirror, not like a pipe.
  const PZP = 3.40;
  for (let i = 0; i < 4; i++)
    cyl(X0 + 1.5 + i * 3.0, CY - .17, PZP, .036, 3.0, col.redD,
        { rz: PI / 2, gloss: .34, ...MAT.metal });
  for (let i = 0; i < 5; i++) {
    const px = X0 + 1.3 + i * 2.4;
    cyl(px, CY - .225, PZP, .016, .07, col.brassD, { gloss: .5 });
    ball(px, CY - .262, PZP, .026, .020, .026, col.brass, { gloss: .55 });
  }
  box(0, CY - .045, 3.30, X1 - X0, .05, .07, col.white, { hard: true, gloss: .12 });
  // Two more risers dropping out of the slab, because on the eleventh floor of a tower the
  // services are the ceiling: the pump's delivery, and the 消防 wet riser.
  for (const [rx, rz, rc] of [[-4.10, 3.44, C('#8c9298')], [-4.28, 3.44, C('#8c9298')],
                              [5.80, 3.38, col.redD]]) {
    cyl(rx, Y + 1.30, rz, .040, 2.60, rc, { gloss: .40, ...MAT.metal });
    for (const fy of [.34, 1.62, 2.44])
      cyl(rx, Y + fy, rz, .052, .045, C('#6f767c'), { gloss: .45 });
  }
  // the riser's gate valve and gauge, at the height a fitter would put them
  cyl(5.80, Y + 1.10, 3.38 - .05, .015, .10, col.steelD, { rx: PI / 2, gloss: .5 });
  cyl(5.80, Y + 1.10, 3.38 - .12, .055, .022, col.red, { rx: PI / 2, gloss: .38 });
  cyl(5.80, Y + 1.62, 3.38 - .06, .042, .030, col.white, { rx: PI / 2, gloss: .5 });
  G(5.80, Y + 1.62, 3.38 - .078, 0, '压', { size: .030, color: col.ink });
  G(5.80, Y + 2.06, 3.34, 0, '消防立管', { size: .048, gap: .010, color: col.redD, vertical: true });

  // --- the fittings. Institutional and cold, and one of them dead — which on THIS floor is not
  // neglect but arithmetic: the west end has a two-metre window in it and nobody has ever needed
  // that tube. The box top stops 45 mm under the ceiling quad so the two never share a plane.
  const LAMPS = [[-4.60, 4.20, false], [-1.60, 4.20, true], [1.50, 4.20, true],
                 [4.60, 4.20, true], [-3.40, 5.45, true], [4.70, 5.45, true]];
  for (const [px, pz, alive] of LAMPS) {
    box(px, CY - .045, pz, .46, .07, .16, col.steelD, { hard: true, gloss: .30 });
    box(px, CY - .095, pz, .40, .05, .12, alive ? col.warm : col.dead,
        { hard: true, mode: alive ? 1 : 0, glow: alive ? .13 : 0, gloss: .10 });
    if (alive) light(px, CY - .20, pz, C('#dfe9ef'), .46, 3.20);
  }

  // --- 安全出口. Wall-mounted, never slung across the run: a sign hung under the ceiling of a
  // corridor is read edge-on from every position a body can stand in, and an arrow on its face can
  // then only point across the corridor and never along it.
  function exitSign(x, y, z, sgn, arrow) {
    const yaw = sgn > 0 ? 0 : PI, f = d => z + sgn * d;
    const w = arrow ? .46 : .38;
    box(x, y, f(.028), w, .155, .055, col.green, { hard: true, gloss: .26, tag: '安全出口' });
    box(x, y, f(.058), w - .035, .125, .006, col.greenL,
        { hard: true, mode: 1, glow: .14, tag: '安全出口' });
    G(x - (arrow ? .062 : 0), y, f(.058), yaw, '安全出口',
      { size: arrow ? .072 : .082, gap: .010, color: col.white, mode: 1, glow: .16 });
    // The stair is east, so the arrow hangs on the east end of the plate — but a glyph reads
    // left-to-right in the READER's frame, and on a wall facing -z the reader's right hand points
    // at world -x. So "east" is '←' on the north wall and '→' on the south. Backwards, this sends
    // somebody to the window in a fire.
    if (arrow) G(x + .175, y, f(.058), yaw, sgn > 0 ? '→' : '←',
                 { size: .095, color: col.white, mode: 1, glow: .16 });
  }
  exitSign(-2.20, Y + 2.30, ZS, 1, true);
  exitSign(-0.75, Y + 2.30, ZN, -1, true);      // clear of 1103's architrave, which ends at -1.03
  exitSign(2.05, Y + 2.30, ZS, 1, true);
  box(X1 - .035, Y + STOP + .19, SZ, .06, .155, .40, col.green,
      { hard: true, gloss: .26, tag: '安全出口' });
  box(X1 - .068, Y + STOP + .19, SZ, .006, .125, .365, col.greenL,
      { hard: true, mode: 1, glow: .14, tag: '安全出口' });
  G(X1 - .068, Y + STOP + .19, SZ, -PI / 2, '安全出口',
    { size: .086, gap: .012, color: col.white, mode: 1, glow: .16 });

  // ===============================================================================================
  // THE SIX DOORS
  // ===============================================================================================
  //
  // 防盗门, five of them somebody else's. The frame stands 90 mm off the wall and the leaf 60 mm,
  // so the leaf reads as recessed in its architrave and nothing is ever coplanar with anything —
  // a flush-mounted door in this renderer flickers as horizontal stripes.
  //
  // `sgn` is which way the door faces into the landing: +1 for the z = 3.20 wall, -1 for z = 6.20.
  // `hinge` is -1 for hinges on the -x jamb.
  function frontDoor(cx, zw, sgn, num, o = {}) {
    const yaw = sgn > 0 ? 0 : PI;
    const W = o.w || 1.00, HT = o.top || 2.06, LW = W - .05, LH = HT - .04;
    const F = z => zw + sgn * z;
    const hinge = o.hinge === undefined ? -1 : o.hinge;
    const body = o.body || col.doorA, panel = o.panel || col.doorB;
    const jTop = o.headTo === undefined ? Y + HT + .07 : o.headTo;
    for (const s of [-1, 1])
      box(cx + s * (W / 2 + .035), (Y + jTop) / 2, F(.045), .07, jTop - Y, .09, col.doorD,
          { hard: true, gloss: .26, tag: o.tag });
    if (o.headTo === undefined)
      box(cx, Y + HT + .035, F(.045), W + .14, .07, .09, col.doorD,
          { hard: true, gloss: .26, tag: o.tag });
    const leaf = box(cx, Y + LH / 2, F(.030), LW, LH, .06, body,
                     { hard: true, gloss: .24, tag: o.tag });
    for (const [py, ph] of [[LH * .70, LH * .40], [LH * .265, LH * .30]]) {
      box(cx, Y + py, F(.070), LW - .16, ph, .020, panel, { hard: true, gloss: .22, tag: o.tag });
      for (const s of [-1, 1])
        box(cx, Y + py + s * ph / 2, F(.082), LW - .16, .012, .012, col.doorD,
            { hard: true, gloss: .3, tag: o.tag });
    }
    // ironmongery on the jamb opposite the hinges, a 猫眼, and three hinges
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
    // 门牌 — the number plate, screwed to the leaf at head height
    box(cx, Y + 1.84, F(.072), .30, .13, .024, col.steel, { hard: true, gloss: .40, tag: o.tag });
    G(cx, Y + 1.84, F(.084), yaw, num, { size: .073, gap: .012, color: col.ink, gloss: .2 });
    if (o.mat !== null) {
      flat(cx, FL + .006, F(.32), .64, .40, o.mat || col.rubber, { mode: 7, gloss: .04 });
      shade(cx, F(.32), .74, .50, .24, FL + .010);
    }
    return leaf;
  }
  // 春联 — gold on red, read top to bottom, pasted on the frame at 春节 and left up all year.
  function couplets(cx, zw, sgn, pair, top, fade) {
    const yaw = sgn > 0 ? 0 : PI, F = z => zw + sgn * z;
    const red = fade ? C('#9c3b30') : col.red, gold = fade ? C('#c9a765') : col.gold;
    for (const [s, text] of [[-1, pair[0]], [1, pair[1]]]) {
      box(cx + s * .58, Y + 1.48, F(.020), .12, 1.02, .04, red,
          { hard: true, gloss: .10, tag: '春联' });
      G(cx + s * .58, Y + 1.48, F(.040), yaw, text,
        { size: .105, gap: .018, color: gold, vertical: true, gloss: .12, tag: '春联' });
    }
    box(cx, Y + 2.28, F(.020), .62, .15, .04, red, { hard: true, gloss: .10, tag: '春联' });
    G(cx, Y + 2.28, F(.040), yaw, top, { size: .098, gap: .020, color: gold, tag: '春联' });
  }
  // 倒福 — the diamond of red paper pasted UPSIDE DOWN, because 福倒了 sounds like 福到了.
  function fuDiamond(cx, y, zw, sgn, s = .21) {
    const yaw = sgn > 0 ? 0 : PI;
    box(cx, Y + y, zw + sgn * .095, s, s, .018, col.red,
        { hard: true, gloss: .10, ry: sgn > 0 ? PI / 4 : -PI / 4, tag: '福' });
    // The character itself stands square while the paper under it is turned 45° — which is what
    // makes it upside down and not merely tilted. `flipping` a glyph is not available, so it is
    // written at its true angle and the paper does the work; at a metre it reads exactly right.
    G(cx, Y + y, zw + sgn * .107, yaw, '福', { size: s * .60, color: col.gold, gloss: .14 });
  }

  const N1 = -5.20, N2 = -3.40, N3 = -1.60, N4 = 4.10, N5 = 5.35;

  // ---- 1101 · a big household. Eight pairs and a rack they long ago stopped fitting into.
  frontDoor(N1, ZN, -1, '1101', { tag: '邻居', hinge: 1, mat: C('#4a4f52') });
  couplets(N1, ZN, -1, ['天增岁月人增寿', '春满乾坤福满门'], '万象更新', true);

  // ---- 1102 · nothing at all. No couplet, no mat, no shoes, no plant, nothing taped to it. What
  // is on this door is the rectangle of unfaded paint where a couplet used to be, and that is
  // louder than anything anybody could have hung there.
  frontDoor(N2, ZN, -1, '1102', { tag: '邻居', body: col.doorB, panel: col.doorA, mat: null });
  for (const s of [-1, 1])
    box(N2 + s * .58, Y + 1.48, ZN - .014, .13, 1.04, .010, C('#dcd5c4'),
        { hard: true, gloss: .13 });
  box(N2, Y + 2.28, ZN - .014, .63, .16, .010, C('#dcd5c4'), { hard: true, gloss: .13 });

  // ---- 1103 · a child. Two sheets of squared paper taped at a metre, which is the height of the
  // person who put them there.
  frontDoor(N3, ZN, -1, '1103', { tag: '邻居', mat: col.rubber });
  couplets(N3, ZN, -1, ['一帆风顺年年好', '万事如意步步高'], '吉星高照', false);

  // ---- 1105 · the cleaner's A-frame, propped against the door a fortnight ago and left.
  frontDoor(N4, ZN, -1, '1105', { tag: '邻居', hinge: 1, body: col.doorD, panel: col.doorA,
                                  mat: C('#3f4a3f') });

  // ---- 1106 · nobody has been home for a week, and the whole corridor knows it.
  frontDoor(N5, ZN, -1, '1106', { tag: '邻居', mat: null });

  // ---- 1107 · yours to knock on, and the only one with a real hole behind it. Same construction,
  // dropped onto the opening in the shell wall above: FW wide, FTOP high, centred on FX.
  frontDoor(FX, ZS, 1, '1107', { tag: '门', body: col.doorA, panel: col.doorB,
                                 mat: C('#6d3b34'), w: FW, top: FTOP,
                                 headTo: Y + FTOP - .015 });
  fuDiamond(FX, 1.52, ZS, 1, .20);
  couplets(FX, ZS, 1, ['出入平安财源广', '合家欢乐福寿长'], '五福临门', false);
  // The leaf is 40 mm shorter than the opening and the opening is a real hole, so without this
  // there is a 40 mm slot over the door you can see the hall through.
  box(FX, Y + FTOP - .020, ZS + .030, FW, .040, .06, col.doorD, { hard: true, gloss: .24 });
  // 门槛石 — the stone threshold every flat here has across its doorway.
  box(FX, FL + .018, ZS + .07, FW + .05, .036, .19, C('#9b968b'),
      { hard: true, gloss: .40, ...MAT.conc });
  // 牛奶箱 — the milk box screwed to the wall beside the door, which nobody uses for milk. West of
  // the door, not east: east of it is the hose cabinet's run of wall and the two would collide.
  box(2.95, Y + 1.02, ZS + .10, .24, .30, .20, C('#3d6b4a'), { gloss: .22, tag: '牛奶箱' });
  box(2.95, Y + 1.02, ZS + .202, .19, .25, .012, C('#325c3f'), { hard: true, gloss: .26 });
  G(2.95, Y + 1.08, ZS + .215, 0, '牛奶箱', { size: .042, gap: .008, color: C('#d8e3d2') });
  G(2.95, Y + .98, ZS + .215, 0, '订奶请电', { size: .028, gap: .006, color: C('#a9c0a8') });
  stop(2.81, 3.09, ZS, ZS + .23);

  // ===============================================================================================
  // WHAT EACH DOOR HAS ACCUMULATED
  // ===============================================================================================

  // --- 1101's shoe rack. Three tiers, eight pairs, and two more that never made it onto it.
  (function shoeRack() {
    const rx = -4.34, rz = ZN - .17;
    for (const ry of [.16, .48, .80]) {
      box(rx, FL + ry, rz, .58, .022, .26, col.steelD, { hard: true, gloss: .4, tag: '鞋' });
      for (const s of [-1, 1]) cyl(rx + s * .26, FL + ry / 2, rz, .010, ry, col.steelD, { gloss: .4 });
    }
    const pair = (px, py, pz, c, ry = 0, sc = 1) => {
      for (const s of [-1, 1])
        cap(px + s * .07 * sc, py + .045 * sc, pz, .095 * sc, .075 * sc, .255 * sc, c,
            { ry: ry + s * .04, gloss: .18, tag: '鞋' });
    };
    pair(rx - .13, FL + .18, rz, C('#2c3238')); pair(rx + .13, FL + .18, rz, C('#7a4b33'));
    pair(rx - .13, FL + .50, rz, C('#8d95a0')); pair(rx + .13, FL + .50, rz, C('#3d5470'));
    pair(rx - .13, FL + .82, rz, C('#a8442f'), .06, .72);
    pair(rx + .13, FL + .82, rz, C('#cfa0a8'), -.05, .72);
    pair(rx - .40, FL, ZN - .24, C('#4a4438'), .16);
    pair(rx + .42, FL, ZN - .28, C('#2f3a44'), -.12);
    // and the plastic stool everybody in this flat sits on to put them on
    cyl(rx + .74, FL + .21, ZN - .30, .13, .42, C('#b6403a'), { gloss: .28, tag: '鞋' });
    flat(rx + .74, FL + .43, ZN - .30, .30, .30, C('#c9524a'), { gloss: .30 });
    shade(rx, ZN - .22, 1.70, .46, .26);
    shade(rx + .74, ZN - .30, .34, .34, .28);
  })();
  stop(-4.66, -4.02, ZN - .34, ZN);
  stop(-3.72, -3.48, ZN - .44, ZN);

  // --- 1103's child. Squared paper, wax crayon, taped at the height of the artist.
  (function childsDrawing() {
    const dx = N3 - .10, dz = ZN - .092;
    for (const [ox, oy, rr] of [[0, 1.05, .03], [.30, 0.98, -.05]]) {
      box(dx + ox, Y + oy, dz, .21, .29, .008, C('#f3efdf'), { hard: true, gloss: .04, ry: rr });
      // a house, a sun, three people and a great deal of grass
      box(dx + ox, Y + oy - .04, dz - .006, .11, .09, .004, C('#c8623f'), { hard: true, ry: rr });
      box(dx + ox, Y + oy + .025, dz - .006, .13, .035, .004, C('#8d3d2c'), { hard: true, ry: rr });
      cyl(dx + ox + .07, Y + oy + .085, dz - .006, .022, .004, C('#e0ac3a'), { rx: PI / 2, ry: rr });
      for (const k of [-.055, 0, .055])
        box(dx + ox + k, Y + oy - .095, dz - .006, .012, .055, .004,
            C(k === 0 ? '#4a7fa8' : '#57894d'), { hard: true, ry: rr });
      box(dx + ox, Y + oy - .128, dz - .006, .18, .014, .004, C('#5d8f4e'), { hard: true, ry: rr });
      for (const c of [-.09, .09])
        box(dx + ox + c, Y + oy + .145, dz - .004, .022, .010, .003, C('#d9d2bd'), { hard: true });
    }
    // a scooter dumped against the frame, and a pair of shoes the size of a hand
    const sx = N3 + .68;
    cyl(sx, FL + .30, ZN - .16, .014, .58, C('#c5c9cc'), { rz: .22, gloss: .45 });
    cyl(sx - .13, FL + .58, ZN - .16, .016, .30, C('#3a4550'), { rx: PI / 2, rz: .22, gloss: .3 });
    box(sx + .10, FL + .07, ZN - .20, .46, .035, .12, C('#3f7fa8'), { gloss: .26, ry: .06 });
    for (const [wx, wz] of [[sx + .30, ZN - .20], [sx - .10, ZN - .20]])
      cyl(wx, FL + .04, wz, .040, .026, C('#dfe3e5'), { rx: PI / 2, gloss: .35 });
    for (const s of [-1, 1])
      cap(N3 - .46 + s * .05, FL + .028, ZN - .21, .055, .042, .135, C('#d0c14f'),
          { ry: s * .10, gloss: .14 });
    shade(sx + .06, ZN - .19, .70, .30, .24);
    shade(N3 - .46, ZN - .21, .28, .22, .20);
  })();
  stop(-1.10, -0.78, ZN - .28, ZN);

  // --- 1105's 小心地滑. A folding A-frame, propped shut against the door because the person who
  // mopped this landing put it there and the person who owns it is on another floor.
  (function wetFloorSign() {
    const sx2 = N4 + .06, sz = ZN - .20;
    for (const s of [-1, 1])
      box(sx2 + s * .005, FL + .34, sz + s * .055, .36, .66, .022, col.yellow,
          { hard: true, gloss: .30, rx: s * .13, tag: '小心地滑' });
    box(sx2, FL + .68, sz, .30, .022, .10, C('#c39d1f'), { hard: true, gloss: .3 });
    for (const [s, yaw] of [[-1, PI], [1, PI]])
      G(sx2, FL + .40, sz - .075 + (s < 0 ? -.005 : 0), yaw, '小心地滑',
        { size: .062, gap: .012, color: C('#3a2f10'), vertical: true, tag: '小心地滑' });
    // the wet patch that dried three hours before the sign was put out
    shade(sx2, sz - .10, .78, .52, .22);
    // a mop bucket left with it
    cyl(N4 - .62, FL + .13, ZN - .26, .135, .26, col.plastic, { gloss: .28, tag: '小心地滑' });
    cyl(N4 - .62, FL + .255, ZN - .26, .118, .012, C('#8d9aa0'), { gloss: .30 });
    cyl(N4 - .62, FL + .68, ZN - .22, .014, 1.20, C('#9a7c4e'), { rz: -.13, gloss: .18 });
    cap(N4 - .78, FL + .10, ZN - .20, .10, .16, .22, C('#d8d3c2'), { gloss: .06 });
    shade(N4 - .66, ZN - .24, .48, .34, .28);
  })();
  stop(3.84, 4.36, ZN - .34, ZN);
  stop(3.34, 3.86, ZN - .40, ZN);

  // --- 1106's 快递. A week of it. Two 京东-shaped cartons, a padded envelope, a bag of fruit gone
  // soft, and a phone number in biro on the back of a delivery slip, taped to the door at eye
  // height by a courier who has given up ringing.
  (function parcels() {
    const px = N5 + .10;
    const carton = (x, y, z, w, h, d, ry, c) => {
      box(x, y + h / 2, z, w, h, d, c, { gloss: .07, ry });
      box(x, y + h - .002, z, w - .05, .012, d - .05, C('#c39a70'), { hard: true, gloss: .06, ry });
      box(x, y + h + .004, z, .055, .010, d - .04, C('#e6ddc8'), { hard: true, gloss: .12, ry });
    };
    carton(px, FL, ZN - .26, .44, .32, .34, .07, col.card);
    carton(px - .04, FL + .32, ZN - .24, .38, .26, .30, -.10, C('#a98559'));
    carton(px + .40, FL, ZN - .22, .30, .22, .26, .16, C('#bd9a6d'));
    box(px + .40, FL + .245, ZN - .22, .32, .05, .24, C('#c8b9a2'), { gloss: .10, ry: .16 });
    // the waybills, one per box, white and slightly peeling
    for (const [lx, ly, lz, lr] of [[px, FL + .20, ZN - .43, .07], [px - .04, FL + .46, ZN - .39, -.10]])
      box(lx, ly, lz, .17, .11, .006, C('#f2efe4'), { hard: true, gloss: .05, ry: lr });
    // a bag of fruit somebody left on top and did not come back for
    ball(px - .06, FL + .66, ZN - .24, .12, .11, .10, C('#dfe4e0'), { gloss: .24, alpha: .93 });
    cap(px - .06, FL + .78, ZN - .24, .045, .10, .045, C('#dfe4e0'), { gloss: .24, alpha: .93 });
    // the note taped to the leaf: '快递放门口，谢谢' and a number
    box(N5 - .16, Y + 1.42, ZN - .098, .17, .12, .006, C('#f4f1e6'),
        { hard: true, gloss: .04, ry: -.04, tag: '快递' });
    G(N5 - .16, Y + 1.455, ZN - .108, PI, '快递放门口',
      { size: .026, gap: .005, color: col.ink, tag: '快递' });
    G(N5 - .16, Y + 1.425, ZN - .108, PI, '谢谢',
      { size: .026, gap: .005, color: col.ink, tag: '快递' });
    G(N5 - .16, Y + 1.392, ZN - .108, PI, '138····6021',
      { size: .022, gap: .004, color: C('#2b4a7a'), tag: '快递' });
    shade(px + .04, ZN - .26, .96, .48, .30);
  })();
  stop(5.02, 5.78, ZN - .46, ZN);

  // --- 小广告. Stamped in red ink on the paint at hand height, scrubbed at once and never gone.
  G(-3.05, Y + 1.30, ZS + .022, 0, '开锁', { size: .062, gap: .010, color: C('#a8352a'), gloss: .05 });
  G(-3.05, Y + 1.22, ZS + .022, 0, '80261', { size: .040, gap: .006, color: C('#a8352a'), gloss: .05 });
  G(-1.70, Y + 1.26, ZS + .022, 0, '疏通下水道', { size: .050, gap: .008, color: C('#96463a'), gloss: .05 });
  G(0.90, Y + 1.34, ZS + .022, 0, '搬家', { size: .058, gap: .010, color: C('#9c4034'), gloss: .05 });
  G(2.60, Y + 1.28, ZN - .022, PI, '换纱窗', { size: .050, gap: .008, color: C('#a8352a'), gloss: .05 });
  G(4.70, Y + 1.30, ZS + .022, 0, '高空作业', { size: .048, gap: .008, color: C('#9c4034'), gloss: .05 });

  // ===============================================================================================
  // THE WINDOW AT THE WEST GABLE — the whole reason this floor is worth standing on
  // ===============================================================================================
  //
  // Built as a bay standing in FRONT of the gable rather than a hole through it: everything sits at
  // x > X0, because anything at x < X0 is behind a one-sided wall and does not exist from in here.
  //
  // Thirty-one metres up, so the view looks DOWN. The layer order is inverted from a street-level
  // window and that single inversion is what reads as altitude: the FAR towers are the tall ones
  // and straddle the horizon, while the NEAR blocks sit low in the frame with their roofs showing,
  // because you are above them. A roof is the one surface nobody sees from the ground and
  // everybody sees from up here.
  //
  // `at(u, y, d, wu, h, c, o)` puts a slab on the gable: `u` runs along z, `d` is how far it stands
  // out of the plane. Nothing shares a depth with anything in front of it.
  const at = (u, y, d, wu, h, c, o) => box(X0 + d, Y + y, u, .011, h, wu, c, o);
  {
    const U0 = WZ - WW / 2, U1 = WZ + WW / 2;
    const HZN = WSILL + (WTOP - WSILL) * 0.42;             // the horizon, well below centre
    let seed = 1109431;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

    sky(at(WZ, (WSILL + WTOP) / 2, .012, WW + .16, WTOP - WSILL + .14, col.sky,
             { hard: true, mode: 1, glow: .035 }));
    at(WZ, WSILL + (WTOP - WSILL) * .78, .016, WW + .12, (WTOP - WSILL) * .30, col.skyLo,
       { hard: true, mode: 1, glow: .025, alpha: .55 });
    // Beijing's distance is not blue, it is white: a band of smog sitting on the horizon. And this
    // window faces WEST, so at five in the afternoon that band is not white but the colour of the
    // light coming through it — which is the one thing that tells you which way the flat faces
    // without anybody saying so.
    at(WZ, HZN + .12, .019, WW + .10, .46, col.haze, { hard: true, mode: 1, alpha: .38 });
    at(WZ, HZN + .02, .020, WW + .10, .30, C('#f2cf9a'), { hard: true, mode: 1, alpha: .46 });
    at(WZ, HZN - .08, .021, WW + .10, .16, C('#e8b478'), { hard: true, mode: 1, alpha: .40 });

    // far — small, pale, dense, tops crossing the horizon
    for (let u = U0 - .06; u < U1 + .04;) {
      const w = .09 + rnd() * .15, h = .07 + rnd() * .34, cu = u + w / 2;
      cityFn(0, at(cu, HZN - .12 + h / 2, .026, w * .95, h, col.cFar, { hard: true, mode: 1 }));
      if (rnd() > .58)
        cityFn(0, at(cu, HZN - .12 + h + .022, .026, w * .42, .044, col.cFar,
                     { hard: true, mode: 1 }));
      u += w + .018 + rnd() * .048;
    }
    // middle distance — the ordinary 板楼 slabs of somebody else's 小区, lit flats up their faces
    for (let u = U0 - .08; u < U1 + .04;) {
      const w = .13 + rnd() * .17, h = .10 + rnd() * .38, cu = u + w / 2, base = HZN - .30;
      cityFn(1, at(cu, base + h / 2, .034, w * .96, h, col.cMid, { hard: true, mode: 1 }));
      for (let ry = base + .06; ry < base + h - .05; ry += .080)
        for (const c of [-.28, 0, .28]) if (rnd() > .58)
          cityFn(2, at(cu + c * w, ry, .039, .022, .032, rnd() > .55 ? col.cLitA : col.cLitB,
                       { hard: true, mode: 1, glow: .16 }));
      u += w + .020 + rnd() * .060;
    }
    // near — the blocks you are level with and above. Wider, darker, low in the frame, and every
    // one of them roofed, because that is what being on the eleventh floor shows you.
    for (let u = U0 - .12; u < U1 + .06;) {
      const w = .24 + rnd() * .26, h = .10 + rnd() * .40, cu = u + w / 2, base = HZN - .74;
      cityFn(1, at(cu, base + h / 2, .046, w * .98, h, col.cNear, { hard: true, mode: 1 }));
      cityFn(1, at(cu, base + h + .016, .050, w * 1.00, .032, col.cRoof, { hard: true, mode: 1 }));
      for (let t = 0, n = 1 + (rnd() > .5 ? 1 : 0); t < n; t++)
        cityFn(1, at(cu + (rnd() - .5) * w * .62, base + h + .056, .054,
                     .042 + rnd() * .038, .050, C('#6d7f8d'), { hard: true, mode: 1 }));
      if (rnd() > .55)
        cityFn(1, at(cu + w * .34, base + h + .090, .054, .007, .086, C('#5c6d7b'),
                     { hard: true, mode: 1 }));
      for (let ry = base + .07; ry < base + h - .06; ry += .090)
        for (const c of [-.32, -.11, .11, .32]) if (rnd() > .50)
          cityFn(2, at(cu + c * w, ry, .058, .028, .038, rnd() > .48 ? col.cLitA : col.cLitB,
                       { hard: true, mode: 1, glow: .18 }));
      u += w + .026 + rnd() * .070;
    }
    // and at the very bottom of the glass, where a thing directly beneath you belongs: the ring
    // road, the 小区's own trees, and the roof of the block next door.
    at(WZ, WSILL + .07, .062, WW + .06, .19, C('#3f4a54'), { hard: true, mode: 1 });
    at(WZ, WSILL + .13, .066, WW + .06, .022, C('#5a6771'), { hard: true, mode: 1 });
    for (let i = 0; i < 11; i++)
      at(U0 + .10 + i * (WW - .20) / 10, WSILL + .131, .070, .030, .008,
         C(i % 3 ? '#c9cfd4' : '#e6c37a'), { hard: true, mode: 1, glow: .10 });
    for (let i = 0; i < 7; i++)
      ball(X0 + .074, Y + WSILL + .055, U0 + .16 + i * (WW - .30) / 6, .006, .034, .036,
           C('#4a6b45'), { mode: 1 });

    // ---- the reveal, four plaster returns boxing the view in
    for (const [ry, ru, rh, rw] of [[WSILL - .055, WZ, .11, WW + .22],
                                    [WTOP + .055, WZ, .11, WW + .22],
                                    [(WSILL + WTOP) / 2, U0 - .055, WTOP - WSILL, .11],
                                    [(WSILL + WTOP) / 2, U1 + .055, WTOP - WSILL, .11]])
      box(X0 + .055, Y + ry, ru, .11, rh, rw, col.wall, { hard: true, gloss: .10, ...MAT.plaster });
    // ---- aluminium frame, two mullions, one transom
    const wf = (y, u, h, w) => box(X0 + .105, Y + y, u, .05, h, w, col.alu,
                                   { hard: true, gloss: .40, ...MAT.metal });
    wf(WSILL + .015, WZ, .06, WW + .06);
    wf(WTOP - .015, WZ, .06, WW + .06);
    wf(WSILL + .78, WZ, .05, WW + .04);
    for (const mu of [U0 + .03, U0 + WW / 3, U0 + WW * 2 / 3, U1 - .03])
      wf((WSILL + WTOP) / 2, mu, WTOP - WSILL, .06);
    // ---- the pane: barely there, enough to catch the landing's light and the sky on it
    box(X0 + .086, Y + (WSILL + WTOP) / 2, WZ, .010, WTOP - WSILL - .06, WW - .06, col.glass,
        { hard: true, mode: 18, alpha: .13, gloss: .80 });
    // one of the six lights is a top-hung vent, propped open, which is what these always are
    box(X0 + .16, Y + WSILL + 1.16, U0 + WW / 6, .020, .30, WW / 3 - .10, col.glass,
        { hard: true, mode: 18, alpha: .18, gloss: .80, rz: -.20 });
    box(X0 + .175, Y + WSILL + 1.02, U0 + WW / 6, .036, .036, WW / 3 - .10, col.alu,
        { hard: true, gloss: .42, ...MAT.metal });
    // ---- the sill, and what a common sill always ends up holding
    box(X0 + .17, Y + WSILL - .045, WZ, .24, .05, WW + .22, col.white,
        { hard: true, gloss: .28, tag: '窗户' });
    // a cactus, which is the only thing that survives a west window and nobody watering it
    cyl(X0 + .19, Y + WSILL + .055, WZ - .74, .075, .12, C('#9d6a4c'), { gloss: .18, tag: '窗户' });
    cap(X0 + .19, Y + WSILL + .19, WZ - .74, .048, .22, .048, C('#4f7a45'), { gloss: .12 });
    cap(X0 + .19, Y + WSILL + .20, WZ - .66, .026, .12, .026, C('#5c8a4f'), { rz: .5, gloss: .12 });
    // a jam jar of paintbrush water somebody left after touching up the railings
    cyl(X0 + .18, Y + WSILL + .045, WZ + .30, .034, .10, C('#b9c6c2'),
        { gloss: .55, mode: 18, alpha: .55 });
    cyl(X0 + .18, Y + WSILL + .025, WZ + .30, .030, .05, C('#6d7f76'), { gloss: .3 });
    // and the strip of paint peeling off over the head, which these windows always have
    box(X0 + .14, Y + WTOP + .16, WZ, .19, .03, WW + .16, col.white, { hard: true, gloss: .18 });
  }

  // ===============================================================================================
  // LATE SUN
  // ===============================================================================================
  //
  // The window faces west and it is the afternoon, so the light comes in flat and goes a long way:
  // with the sun a dozen degrees up, a head at 2.32 throws to roughly x = +2.6 and a sill at 0.85
  // to x = -2.8, which is the whole middle of the landing. Three bands, because the window has two
  // mullions in it, and the third stops at the second lift shaft because that is what is in its way
  // — with a patch on the shaft's own face instead, which is the thing that says the light is real.
  //
  // Every one of these is `sun: true`, so it fades out with the daylight rather than being a warm
  // stripe painted on the floor at midnight.
  {
    const SY = Y + .024;
    const bands = [[3.85, .60], [4.55, .60], [5.25, .58]];
    for (const [bz, bw] of bands) {
      const east = bz > 4.9 ? -0.62 : 2.60;
      const segs = [[-2.60, .30], [-1.30, .25], [0.10, .19], [1.45, .12]];
      for (const [sx3, sa] of segs) {
        if (sx3 - .70 > east) continue;
        const x1s = Math.min(sx3 + .70, east);
        if (x1s - (sx3 - .70) < .12) continue;
        pool((sx3 - .70 + x1s) / 2, SY, bz, x1s - (sx3 - .70), bw, col.sun, sa, true);
      }
    }
    // the bright root of it, right under the sill where the light lands hardest
    pool(-3.30, SY + .002, WZ, 1.30, WW - .30, col.sun, .16, true);
    // A west window in an east-west corridor lights the floor and anything that faces west, and
    // nothing else — the two long walls are edge-on to it. So the only two upright patches are the
    // west end of the pump cabinet and the west jamb of 1107's architrave, which is exactly the
    // pair a fitter would notice and nobody else would, and is why the light reads as light rather
    // than as a stripe painted on the tiles.
    wallPool(-5.142, Y + 1.45, ZS + .155, -PI / 2, .31, 1.24, col.sun, .26, true);
    wallPool(-2.902, Y + 1.44, ZS + .06, -PI / 2, .13, .96, col.sun, .18, true);
    wallPool(FDX0 - .118, Y + 1.05, ZS + .05, -PI / 2, .09, 1.66, col.sun, .20, true);
    // A modest warm fitting in the bay, so the west end is not simply black when the sun is gone.
    light(X0 + .85, Y + 1.90, WZ, C('#ffdcae'), .40, 4.60);
  }

  // ===============================================================================================
  // THE FIRE STAIR, EAST GABLE
  // ===============================================================================================
  // Surface-mounted, and correctly so: this door never opens, so it wants no hole behind it.
  {
    const sf = x => X1 - x;
    for (const s of [-1, 1])
      box(sf(.045), Y + (STOP + .07) / 2, SZ + s * (SW / 2 + .035), .09, STOP + .07, .07,
          col.steelD, { hard: true, gloss: .30, ...MAT.metal });
    box(sf(.045), Y + STOP + .035, SZ, .09, .07, SW + .14, col.steelD,
        { hard: true, gloss: .30, ...MAT.metal });
    box(sf(.030), Y + (STOP - .04) / 2, SZ, .06, STOP - .04, SW - .05, C('#9aa0a2'),
        { hard: true, gloss: .26, tag: '安全出口', ...MAT.metal });
    box(sf(.062), Y + 1.34, SZ, .012, .70, SW - .17, C('#8b9294'), { hard: true, gloss: .24 });
    box(sf(.075), Y + 1.02, SZ - .30, .05, .05, .40, col.steelX, { hard: true, gloss: .5 });
    cyl(sf(.098), Y + 1.02, SZ - .30, .020, .09, col.steel, { rx: PI / 2, gloss: .55 });
    box(sf(.070), Y + STOP - .18, SZ + .22, .06, .05, .30, col.steelX, { hard: true, gloss: .45 });
    G(sf(.066), Y + 1.72, SZ, -PI / 2, '安全出口', { size: .085, gap: .016, color: col.green });
    G(sf(.066), Y + .62, SZ, -PI / 2, '禁止堆放杂物', { size: .056, gap: .012, color: col.redD });
    G(sf(.066), Y + .50, SZ, -PI / 2, '保持通道畅通', { size: .050, gap: .012, color: col.ink });
    // the floor number stencilled on the stair door, which is how you know where you are when the
    // lift is out and you have walked up nine flights
    G(sf(.066), Y + 1.14, SZ + .28, -PI / 2, '11', { size: .13, gap: .016, color: C('#5f676b') });
  }

  // ===============================================================================================
  // 屋面检修口 — the roof, and the ladder to it
  // ===============================================================================================
  //
  // The tell that you are near the top. On every floor below this the ceiling is somebody's floor;
  // here it is the roof, and there is a bolted cat ladder to a hatch in it with a padlock on the
  // hasp and a 物业 notice under it. F12 is on the other side of that hatch.
  {
    const LZ = 5.45, lx = X1 - .09;
    for (const s of [-1, 1])
      box(lx, Y + (CY - Y) / 2, LZ + s * .24, .05, CY - Y - .10, .05, col.steelX,
          { hard: true, gloss: .44, tag: '屋顶', ...MAT.metal });
    for (let ry = .28; ry < 2.45; ry += .30)
      cyl(lx - .022, Y + ry, LZ, .016, .48, col.steel, { rx: PI / 2, gloss: .50, tag: '屋顶' });
    // the brackets that hold it off the wall, four of them, which is what a bolted ladder is
    for (const ry of [.40, 1.30, 2.20])
      for (const s of [-1, 1])
        box(X1 - .045, Y + ry, LZ + s * .24, .09, .05, .05, col.steelP, { hard: true, gloss: .40 });
    // the hatch: a steel panel recessed in the slab, its frame, a hinge and a hasp
    const HXc = X1 - .48;
    box(HXc, CY - .045, LZ, .84, .07, .84, col.steelD, { hard: true, gloss: .30, tag: '屋顶' });
    box(HXc, CY - .098, LZ, .72, .05, .72, C('#697076'),
        { hard: true, gloss: .38, tag: '屋顶', ...MAT.metal });
    for (const s of [-1, 1])
      box(HXc + .30, CY - .112, LZ + s * .22, .10, .04, .07, col.steelP,
          { hard: true, gloss: .45, tag: '屋顶' });
    box(HXc - .33, CY - .116, LZ, .10, .05, .16, col.steelP, { hard: true, gloss: .45, tag: '屋顶' });
    cyl(HXc - .35, CY - .155, LZ, .020, .075, C('#c9b477'), { gloss: .55, tag: '屋顶' });
    cyl(HXc - .35, CY - .200, LZ, .030, .035, C('#b8a469'), { rx: PI / 2, gloss: .55, tag: '屋顶' });
    // the notice under it, which is the only reason anybody reads the word 检修
    box(X1 - .035, Y + 1.86, LZ - .52, .05, .26, .34, col.paper, { hard: true, gloss: .05 });
    G(X1 - .066, Y + 1.94, LZ - .52, -PI / 2, '屋面检修口', { size: .044, gap: .009, color: col.ink });
    G(X1 - .066, Y + 1.86, LZ - .52, -PI / 2, '已上锁', { size: .040, gap: .008, color: col.redD });
    G(X1 - .066, Y + 1.79, LZ - .52, -PI / 2, '禁止攀爬', { size: .034, gap: .007, color: col.ink });
    G(X1 - .066, Y + 1.72, LZ - .52, -PI / 2, '物业管理处', { size: .028, gap: .006, color: col.grey });
  }

  // ===============================================================================================
  // 消火栓 the hose cabinet, and the pump cabinet
  // ===============================================================================================
  const HX = 4.95, HZ = ZS + .11;
  box(HX, Y + 1.14, HZ, .70, 1.00, .22, col.red, { hard: true, gloss: .30, tag: '消防栓' });
  box(HX, Y + 1.14, HZ + .112, .60, .90, .010, col.redD, { hard: true, gloss: .34, tag: '消防栓' });
  box(HX - .01, Y + 1.20, HZ + .118, .40, .58, .008, C('#3d4a4e'),
      { hard: true, gloss: .62, alpha: .55 });
  cyl(HX - .01, Y + 1.20, HZ + .06, .17, .12, C('#8c1f18'), { rx: PI / 2, gloss: .18 });
  cyl(HX - .01, Y + 1.20, HZ + .09, .07, .07, col.redD, { rx: PI / 2, gloss: .3 });
  cyl(HX + .24, Y + .82, HZ + .10, .055, .022, col.steelD, { rx: PI / 2, gloss: .5 });
  G(HX, Y + 1.76, HZ + .112, 0, '消火栓', { size: .115, gap: .022, color: col.white });
  G(HX, Y + .70, HZ + .112, 0, '火警119', { size: .058, gap: .012, color: col.gold });
  cyl(HX + .52, FL + .27, ZS + .17, .075, .48, col.red, { gloss: .34, tag: '消防栓' });
  taper(HX + .52, FL + .55, ZS + .17, .15, .10, .15, col.red, { gloss: .34 });
  cyl(HX + .52, FL + .63, ZS + .17, .020, .09, col.steelD, { gloss: .5 });
  box(HX + .52, FL + .30, ZS + .245, .11, .16, .012, col.white, { hard: true, gloss: .1 });
  shade(HX + .52, ZS + .17, .24, .24, .28);
  stop(HX - .38, HX + .38, ZS, ZS + .23);

  // --- 高区增压泵. Not a room: a surface cabinet, the way the plant on a residential floor really
  // is. Louvres at the bottom, a gauge, a lock, two deliveries out of the top into the slab, and a
  // hum you cannot hear but can see in the warning plate.
  {
    const PX = -4.55, PZ = ZS + .155;
    box(PX, Y + 1.10, PZ, 1.15, 1.92, .31, C('#9aa1a6'),
        { hard: true, gloss: .34, tag: '水泵', ...MAT.metal });
    for (const s of [-1, 1])
      box(PX + s * .285, Y + 1.10, PZ + .158, .54, 1.84, .010, C('#a7aeb3'),
          { hard: true, gloss: .30, tag: '水泵' });
    box(PX, Y + 1.10, PZ + .163, .020, 1.86, .014, col.steelP, { hard: true, gloss: .42 });
    for (let i = 0; i < 7; i++)
      box(PX, Y + .34 + i * .052, PZ + .166, 1.02, .022, .012, col.steelP,
          { hard: true, gloss: .38 });
    for (const s of [-1, 1])
      cyl(PX + s * .27, Y + 1.06, PZ + .170, .020, .012, col.steelX, { rx: PI / 2, gloss: .5 });
    cyl(PX - .34, Y + 1.62, PZ + .172, .058, .030, C('#e9e4d6'), { rx: PI / 2, gloss: .5 });
    cyl(PX - .34, Y + 1.62, PZ + .188, .010, .012, col.redD, { rx: PI / 2, gloss: .4, rz: .7 });
    for (const [ly, lc] of [[1.80, C('#63d38a')], [1.72, C('#e0a93c')]])
      cyl(PX + .30, Y + ly, PZ + .170, .014, .012, lc, { rx: PI / 2, mode: 1, glow: .18 });
    box(PX + .30, Y + .78, PZ + .170, .30, .22, .008, C('#e6dc4a'), { hard: true, gloss: .18 });
    G(PX + .30, Y + .845, PZ + .176, 0, '当心机械', { size: .034, gap: .007, color: col.ink });
    G(PX + .30, Y + .785, PZ + .176, 0, '伤人', { size: .034, gap: .007, color: col.ink });
    G(PX + .30, Y + .720, PZ + .176, 0, '非工勿动', { size: .026, gap: .006, color: C('#5c5024') });
    G(PX, Y + 2.14, PZ + .080, 0, '高区增压泵', { size: .070, gap: .014, color: col.ink });
    // the deliveries out of the top, bent into the slab
    for (const s of [-1, 1]) {
      cyl(PX + s * .30, Y + 2.28, PZ - .02, .038, .32, C('#8c9298'), { gloss: .42, ...MAT.metal });
      cyl(PX + s * .30, Y + 2.10, PZ - .02, .048, .040, col.steelP, { gloss: .45 });
    }
    stop(PX - .60, PX + .60, ZS, ZS + .32);
  }

  // ===============================================================================================
  // 电表箱 the meter bank, and 通知栏 the notice board
  // ===============================================================================================
  {
    const MX2 = -2.60, MZ = ZS + .06;
    box(MX2, Y + 1.44, MZ, .58, 1.02, .13, col.steelD,
        { hard: true, gloss: .34, tag: '电表箱', ...MAT.metal });
    box(MX2, Y + 1.44, MZ + .070, .50, .94, .012, col.steelX, { hard: true, gloss: .30 });
    const READ = ['1104', '0938', '2271', '0416'];
    for (let i = 0; i < 4; i++) {
      const my = 1.78 - i * .24;
      box(MX2 - .08, Y + my, MZ + .078, .22, .12, .008, C('#1c2226'), { hard: true, gloss: .55 });
      G(MX2 - .08, Y + my, MZ + .086, 0, READ[i],
        { size: .046, gap: .008, color: C('#cfe3d6'), mode: 1, glow: .10 });
      G(MX2 + .15, Y + my, MZ + .080, 0, ['1101', '1102', '1103', '1105'][i],
        { size: .030, gap: .006, color: C('#9aa3a8') });
      cyl(MX2 + .23, Y + my, MZ + .078, .009, .010, C('#d84a3a'), { rz: PI / 2, mode: 1, glow: .18 });
    }
    G(MX2, Y + 2.06, MZ + .072, 0, '电表箱', { size: .062, gap: .012, color: col.white });
    box(MX2, Y + 2.36, MZ + .010, .09, .48, .05, col.white, { hard: true, gloss: .12 });
  }
  // --- the notice board. The best readable Chinese on the floor, and every notice on it is a
  // notice you only get on the eleventh: the pump, the roof hatch, and the lift that is out.
  {
    const PX2 = -1.20, PZ2 = ZS + .028;
    box(PX2, Y + 1.52, PZ2, 1.00, .72, .055, col.steelD,
        { hard: true, gloss: .30, tag: '通知栏', ...MAT.metal });
    box(PX2, Y + 1.52, PZ2 + .030, .92, .64, .010, C('#cfd4ce'), { hard: true, gloss: .18 });
    box(PX2, Y + 1.52, PZ2 + .046, .90, .62, .006, C('#3d4a4e'),
        { hard: true, gloss: .60, alpha: .28 });
    G(PX2, Y + 1.93, PZ2 + .036, 0, '通知栏', { size: .048, gap: .010, color: col.white });
    const note = (nx, ny, w, h, rr, lines) => {
      box(nx, ny, PZ2 + .038, w, h, .006, col.paper, { hard: true, gloss: .04, ry: rr });
      let ly = ny + h / 2 - .055;
      for (const [t, sz, c] of lines) {
        G(nx, ly, PZ2 + .044, 0, t, { size: sz, gap: sz * .18, color: c });
        ly -= sz + .022;
      }
      for (const [sx4, sy4] of [[-w / 2 + .03, h / 2 - .02], [w / 2 - .03, h / 2 - .02]])
        box(nx + sx4, ny + sy4, PZ2 + .048, .045, .020, .003, C('#d9d2bd'), { hard: true });
    };
    note(-1.48, Y + 1.53, .40, .52, .015, [
      ['通知', .050, col.ink],
      ['本周四上午', .032, col.ink],
      ['九点至十二点', .030, col.ink],
      ['十至十二层停水', .030, col.redD],
      ['高区水泵检修', .026, col.grey],
      ['物业管理处', .022, col.grey],
    ]);
    note(-1.00, Y + 1.56, .36, .42, -.02, [
      ['温馨提示', .038, col.ink],
      ['屋面检修口', .028, col.ink],
      ['已加锁', .028, col.redD],
      ['请勿攀爬', .026, col.ink],
    ]);
    note(-0.86, Y + 1.28, .30, .24, .03, [
      ['电梯年检', .034, col.grey],
      ['二号梯暂停', .026, col.grey],
    ]);
    // and the red one, stuck straight onto the wall beside the case because it would not fit in it
    box(PX2 - .82, Y + 1.62, ZS + .012, .30, .40, .006, C('#e8dcc9'),
        { hard: true, gloss: .04, ry: -.03 });
    G(PX2 - .82, Y + 1.74, ZS + .020, 0, '严禁电动车', { size: .036, gap: .008, color: col.redD });
    G(PX2 - .82, Y + 1.68, ZS + .020, 0, '上楼充电', { size: .036, gap: .008, color: col.redD });
    G(PX2 - .82, Y + 1.58, ZS + .020, 0, '一经发现', { size: .026, gap: .006, color: col.ink });
    G(PX2 - .82, Y + 1.52, ZS + .020, 0, '断电处理', { size: .026, gap: .006, color: col.ink });
  }

  // --- and, four metres from that notice, the 电动车 it is about, on charge off a socket somebody
  // has run a wire down to. This is the single most Beijing object on the floor.
  (function ebike() {
    const BX = -1.95, BZ2 = ZS + .30, lean = .05;
    for (const dx of [-.50, .52]) {
      cyl(BX + dx, FL + .245, BZ2 + .02, .245, .085, col.rubber,
          { rx: PI / 2, rz: lean, gloss: .18, tag: '电动车' });
      cyl(BX + dx, FL + .245, BZ2 + .02, .130, .095, C('#767d82'), { rx: PI / 2, rz: lean, gloss: .34 });
    }
    // the deck, the battery box under it, the leg shield and the seat
    box(BX + .02, FL + .40, BZ2 + .02, .90, .10, .30, C('#243447'), { gloss: .30, tag: '电动车' });
    box(BX - .06, FL + .27, BZ2 + .02, .46, .22, .24, C('#2f4056'), { gloss: .26, tag: '电动车' });
    box(BX - .46, FL + .62, BZ2 + .02, .16, .56, .30, C('#33465e'), { gloss: .28, rz: .18 });
    cap(BX + .34, FL + .56, BZ2 + .02, .28, .12, .15, C('#1c2026'), { gloss: .18, tag: '电动车' });
    cyl(BX - .50, FL + .78, BZ2 + .02, .020, .40, col.steelD, { rx: PI / 2, gloss: .45 });
    box(BX - .52, FL + .70, BZ2 + .02, .18, .14, .16, C('#c3c9cd'), { gloss: .34 });
    box(BX - .10, FL + .84, BZ2 - .16, .30, .26, .22, C('#5f6b56'), { gloss: .14 });
    // the wire, which is the whole point: out of the bike, up the wall, into a socket that was
    // never meant for it, and a coil of slack on the floor
    cyl(BX + .28, FL + .50, BZ2 - .18, .009, .70, C('#2b2f33'), { rz: -.9, gloss: .3 });
    cyl(BX + .62, Y + .78, ZS + .06, .008, 1.40, C('#2b2f33'), { gloss: .3 });
    box(BX + .62, Y + 1.52, ZS + .030, .09, .13, .045, C('#e4dfd2'), { hard: true, gloss: .22 });
    for (const s of [-1, 1])
      box(BX + .62 + s * .022, Y + 1.53, ZS + .054, .012, .028, .006, C('#3a3f42'), { hard: true });
    for (let i = 0; i < 3; i++)
      cyl(BX + .46, FL + .012 + i * .012, BZ2 - .30, .085 + i * .014, .010, C('#2b2f33'),
          { gloss: .3 });
    shade(BX + .02, BZ2 + .02, 1.62, .52, .30);
  })();
  stop(-2.86, -1.04, ZS, ZS + .52);

  // ===============================================================================================
  // THE WORDS ON THE LANDING
  // ===============================================================================================
  //
  // Focus points sit deliberately AWAY from z 3.95..4.25, which is the band the deck-2 corridor
  // uses. `things` in js/world.js is one flat list with no deck in it — see the ticket at the foot
  // of this file — so a word focused at the same (x, z) as a word downstairs competes with it. In
  // the two deep pockets there is no contest at all, and everything that can go there does.
  TH('走廊', 0.60, Y + 1.62, 4.30, '十一楼的走廊比楼下亮。',
     'The eleventh-floor corridor is brighter than the ones below.',
     '走 walk + 廊 covered passage. A corridor here is storage, notice board and landing at once.',
     0.60, 4.42, 3.0, '走廊');
  // Paired with the fallback panel in the guarded landing block above.  The generalized shell
  // already supplies F11's one live call target, so its compatibility word must stand down too.
  if (!A.shellLanding)
    TH('电梯', LFX, Y + 1.24, LF.z0 - .08, '我在十一楼等电梯。', 'I am waiting for the lift on the eleventh floor.',
       '电 electric + 梯 ladder. 楼梯 is the staircase; this one has a motor.', 2.50, 4.45, 2.4);
  TH('窗户', X0 + .18, Y + 1.55, WZ, '走廊尽头的窗户能看见整个城市。',
     'The window at the end of the corridor looks out over the whole city.',
     '窗 window + 户 door-leaf; together, the fitting. Eleven floors up it is worth the walk.',
     -5.05, 4.55, 2.2);
  TH('门', FX, Y + 1.22, ZS + .12, '1107是我要找的门。', '1107 is the door I am looking for.',
     '门 is a door or a gate — and the 门 in 门口, the doorway.', FX, 3.76, 1.7);
  TH('春联', FX - .58, Y + 1.48, ZS + .06, '门上的春联还是去年的。',
     'The couplets on the door are still last year\'s.',
     '春 spring + 联 a matched pair of lines, pasted at 春节 and left up all year.',
     3.36, 3.80, 1.7);
  TH('福', FX, Y + 1.52, ZS + .11, '福字是倒着贴的。', 'The 福 is pasted upside down.',
     '福倒了 "the 福 is upside down" sounds like 福到了 "good fortune has arrived".',
     3.90, 3.78, 1.6);
  TH('邻居', N2, Y + 1.30, ZN - .12, '1102的邻居从来不贴春联。',
     'The neighbour in 1102 never puts anything on the door.',
     '邻 neighbouring + 居 to dwell. You can read a corridor by its doors.', N2, 5.30, 1.9);
  TH('鞋', -4.34, Y + .55, ZN - .22, '1101门口有八双鞋。', 'There are eight pairs of shoes outside 1101.',
     '鞋 shoe. They stay outside the door, never inside the flat.', -4.34, 5.24, 1.8);
  TH('快递', N5 + .10, Y + .42, ZN - .30, '这些快递放了一个星期了。',
     'This parcel pile has been here a week.',
     '快 fast + 递 to deliver. 取快递 is to go and collect one.', 5.28, 5.26, 1.8);
  TH('小心地滑', N4 + .06, Y + .40, ZN - .26, '牌子上写着小心地滑。', 'The sign says: careful, wet floor.',
     '小心 be careful + 地 ground + 滑 slippery. It has been dry for three hours.',
     N4, 5.20, 1.8);
  TH('消防栓', HX, Y + 1.40, HZ + .12, '墙上有一个消火栓。', 'There is a fire hydrant on the wall.',
     '消防栓 is what you call it; 消火栓 is what is painted on the cabinet. 火警119 is the number.',
     HX, 3.92, 1.8);
  // ---------------------------------------------------------------- 十楼在装修
  //
  // F10 is being gutted one storey down and this floor had zero occurrences of 装修 across two
  // thousand lines, while F9 directly below had four. Same drill, same hours, same dust — read
  // from the same object F10's own permit is rendered from, so the three notices in this building
  // cannot say three different things.
  //
  // `HomeF10.RENO_HOURS` is assigned at the top level of js/home-f10.js and not inside its
  // builder, precisely so that a floor built earlier in the FlatFit order can read it. The guard
  // is not defensive dressing: if home-f10.js is ever dropped from index.html this floor still
  // builds, it just does not mention the works.
  {
    const RH = (typeof HomeF10 !== 'undefined' && HomeF10.RENO_HOURS) || null;
    const NX = 1.85, NZ = ZS + .020;
    box(NX, Y + 1.52, NZ, .36, .48, .014, C('#e6e0cd'), { hard: true, gloss: .06, ry: .012 });
    box(NX, Y + 1.72, NZ + .008, .36, .08, .005, C('#a8352a'), { hard: true, gloss: .06 });
    G(NX, Y + 1.72, NZ + .014, 0, '通知', { size: .046, gap: .010, color: C('#f0e6d2') });
    G(NX, Y + 1.60, NZ + .014, 0, '楼下十楼装修', { size: .036, gap: .008 });
    if (RH) {
      G(NX, Y + 1.51, NZ + .014, 0, RH.hz[0], { size: .030, gap: .006, color: C('#5f5c56') });
      G(NX, Y + 1.43, NZ + .014, 0, RH.hz[1], { size: .030, gap: .006, color: C('#5f5c56') });
      G(NX, Y + 1.34, NZ + .014, 0, '周末不施工', { size: .032, gap: .007, color: C('#82251b') });
      G(NX, Y + 1.25, NZ + .014, 0, '竣工' + RH.doneHz, { size: .022, gap: .004, color: C('#7e858b') });
    }
    for (const [sx, sy] of [[-.145, .21], [.145, .21], [-.145, -.21], [.145, -.21]])
      box(NX + sx, Y + 1.52 + sy, NZ + .010, .040, .018, .004, C('#d7d0bb'), { hard: true });
    TH('装修', NX, Y + 1.52, ZS + .16, '楼下十楼在装修，白天有电钻声。',
       'The tenth floor below is being renovated; there is a drill during the day.',
       '装 to fit out + 修 to repair. 施工时间 shīgōng shíjiān — the hours they are allowed to work.',
       NX, ZS + .80, 1.9);

    // 灰尘 tracked up the stair from the works. Two decals and a smear on the handrail — a
    // 装修 one floor down does not stay one floor down, and this is the cheapest possible way of
    // saying so. Nothing here is a collider and nothing here ticks.
    flat(4.85, FL + .006, SZ - .55, 1.30, 1.10, C('#c8c2b3'), { mode: 7, gloss: .03, alpha: .26 });
    flat(3.60, FL + .006, 4.60, 1.90, .80, C('#c8c2b3'), { mode: 7, gloss: .03, alpha: .16 });
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      flat(5.20 - t * 2.10, FL + .020, SZ - .20 + t * .55 + (i % 2 ? .10 : -.10), .12, .25,
           C('#b6b0a0'), { mode: 7, gloss: .03, alpha: .26 - t * .14, ry: -1.15 });
    }
    box(X1 - .075, Y + 1.02, SZ - .30, .05, .06, .40, C('#c8c2b3'),
        { hard: true, gloss: .04, alpha: .34 });
    TH('灰尘', 4.85, Y + .30, SZ - .90, '楼梯口全是灰尘，是楼下装修弄的。',
       'The stair head is covered in dust from the works downstairs.',
       '灰 ash, grey + 尘 dust. 一层灰 — a layer of it, which is what everybody here says.',
       4.85, SZ - 1.35, 2.0);
  }

  TH('楼梯', X1 - .10, Y + 1.10, SZ, '楼梯在走廊的东头。',
     'The stairs are at the east end of the corridor.',
     '楼 storey + 梯 ladder. 楼梯间 lóutījiān — the stairwell. It is the way out when the lift is off.',
     5.30, SZ - .30, 2.1);
  TH('水泵', -4.55, Y + 1.30, ZS + .32, '高层的水靠这个泵送上来。',
     'The water on the high floors is pumped up by this.',
     '水 water + 泵 pump. 高区 is the high zone of a tower — everything above about floor ten.',
     -4.55, 4.00, 1.9);
  TH('电表箱', -2.60, Y + 1.50, ZS + .14, '电表箱上写着每家的门牌号。',
     'Each meter in the box is labelled with a flat number.',
     '电 electricity + 表 gauge + 箱 box.', -2.60, 3.94, 1.8);
  TH('通知栏', -1.20, Y + 1.55, ZS + .09, '通知栏上说周四停水。',
     'The notice board says the water is off on Thursday.',
     '通 to pass through + 知 to know: to inform. 栏 is the frame it is in.', -1.20, 4.58, 1.9);
  TH('电动车', -1.95, Y + .70, ZS + .34, '走廊里停着一辆电动车，还在充电。',
     'An e-bike is parked in the corridor, still on charge.',
     '电动 electric-powered + 车 vehicle. The red notice four metres away is about this.',
     -1.95, 4.62, 1.9);
  TH('安全出口', X1 - .10, Y + STOP + .19, SZ, '安全出口在走廊的东头。',
     'The emergency exit is at the east end of the corridor.',
     '安全 safe + 出口 exit. Eleven floors is a long way down on foot.', 5.28, 4.58, 2.0);
  TH('屋顶', X1 - .30, Y + 2.10, 5.45, '这个爬梯通到屋顶，口上锁着。',
     'This ladder goes up to the roof; the hatch is locked.',
     '屋 house + 顶 top. 检修口 is the access hatch, and it is 物业\'s to open.',
     5.32, 5.34, 1.9);

  // ===============================================================================================
  // 1107 — a completely ordinary Beijing family flat
  // ===============================================================================================
  //
  // Nothing in here is remarkable and that is the entire brief. What makes an ordinary room read as
  // real is not the objects, it is that each of them has been used: the sofa has a cover on it
  // because the sofa underneath is being kept for later, the television has a cloth over the top
  // because nobody watches it, the fruit in the bowl is for visitors, and the busiest thing in the
  // whole flat is a drying rack.
  //
  // The plan is the same plan as your own 202 — hall along the north, 客厅 and 阳台 to the south,
  // 主卧 and 厨房 down the west side — because a block repeats its plan, and a floor that quietly
  // has a different one is the thing that tells you the building is scenery.

  // ---------------------------------------------------------------- 玄关 · the entrance
  {
    const EX = 5.10, EZ = ZS - .19;
    // 鞋柜 — the shoe cabinet, which is not decoration here but the rule: shoes come off at the door
    box(EX, Y + .48, EZ, 1.10, .96, .36, col.wood,
        { gloss: .22, tag: '鞋柜', ...MAT.timber });
    for (const dz of [-.26, .00, .26])
      box(EX + dz * 2.0, Y + .48, EZ - .186, .32, .90, .014, col.woodL,
          { hard: true, gloss: .26, tag: '鞋柜', mode: 6 });
    for (const dx of [-.52, 0, .52])
      cyl(EX + dx, Y + .48, EZ - .200, .012, .012, col.brass, { rx: PI / 2, gloss: .55 });
    box(EX, Y + .975, EZ, 1.16, .035, .40, col.woodL,
        { hard: true, gloss: .30, tag: '鞋柜', mode: 6 });
    // what lands on the top of a shoe cabinet within a week of moving in
    cyl(EX - .40, Y + 1.005, EZ - .04, .085, .030, C('#b9c0b4'), { gloss: .30, tag: '钥匙' });
    for (const [kx, kz] of [[-.42, -.05], [-.38, -.02]])
      box(EX + kx, Y + 1.022, EZ + kz, .022, .006, .050, col.brassD,
          { hard: true, gloss: .55, ry: .5 });
    cyl(EX + .12, Y + 1.075, EZ - .02, .045, .17, C('#2d4a63'), { gloss: .26 });   // a torch
    box(EX + .40, Y + 1.035, EZ - .02, .16, .09, .11, C('#c8b48a'), { gloss: .12 });
    // 拖鞋 — one pair each, lined up, and one pair kicked out of line
    const slip = (sx, sz, c, ry) => {
      for (const s of [-1, 1])
        cap(sx + s * .062, FL + .032, sz, .070, .050, .155, c, { ry: ry + s * .05, gloss: .14,
                                                                 tag: '拖鞋' });
    };
    slip(4.30, ZS - .48, C('#9aa7ae'), 0);
    slip(4.62, ZS - .48, C('#b28f92'), .04);
    slip(4.94, ZS - .50, C('#8d9b7f'), -.06);
    slip(5.28, ZS - .62, C('#c8b06a'), .5);
    shade(4.80, ZS - .52, 1.50, .40, .22);
    shade(EX, EZ, 1.24, .48, .30);
    // coat hooks on the wall over it, and what hangs off them
    box(EX, Y + 1.62, ZS - .028, 1.00, .09, .045, col.woodD, { hard: true, gloss: .24, mode: 6 });
    for (const dx of [-.36, -.12, .12, .36]) {
      cyl(EX + dx, Y + 1.60, ZS - .070, .011, .075, col.steel, { rx: PI / 2, gloss: .5 });
      ball(EX + dx, Y + 1.578, ZS - .102, .017, .017, .017, col.steel, { gloss: .5 });
    }
    box(EX - .34, Y + 1.16, ZS - .13, .40, .78, .16, C('#4c5a6b'), { gloss: .16, tag: '外套' });
    box(EX - .34, Y + 1.50, ZS - .13, .34, .14, .15, C('#41505f'), { gloss: .16 });
    cap(EX + .30, Y + 1.24, ZS - .10, .07, .62, .07, C('#7d5a68'), { gloss: .14 });
    cyl(EX + .30, Y + 1.56, ZS - .10, .014, .10, C('#8c6b3e'), { gloss: .3 });
    // 挂历 — the paper wall calendar, a photograph over a block of dates
    box(3.05, Y + 1.60, ZS - .020, .34, .52, .010, col.paper, { hard: true, gloss: .06, tag: '挂历' });
    box(3.05, Y + 1.73, ZS - .028, .30, .22, .004, C('#6f8f9e'), { hard: true, gloss: .10 });
    box(3.05, Y + 1.755, ZS - .032, .26, .10, .003, C('#8fae9a'), { hard: true });
    G(3.05, Y + 1.52, ZS - .030, PI, '五月', { size: .052, gap: .010, color: col.redD });
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 7; c++)
        box(3.05 - .12 + c * .04, Y + 1.44 - r * .034, ZS - .030, .022, .014, .003,
            C(c === 0 ? '#b8544a' : '#8b8578'), { hard: true });
    // and the mirror everybody checks on the way out
    box(3.70, Y + 1.52, ZS - .022, .34, .58, .022, col.woodD, { hard: true, gloss: .24, mode: 6 });
    box(3.70, Y + 1.52, ZS - .036, .28, .52, .008, C('#c2d2d6'),
        { hard: true, mode: 18, alpha: .82, gloss: .88, tag: '镜子' });
    light(3.20, Y + FT.h - .22, 2.35, C('#ffeccb'), .34, 3.00);
    box(3.20, Y + FT.h - .055, 2.35, .40, .07, .40, C('#e8e2d4'), { hard: true, gloss: .16 });
    box(3.20, Y + FT.h - .105, 2.35, .34, .04, .34, C('#fff3d8'),
        { hard: true, mode: 1, glow: .05 });
  }
  stop(4.50, 5.70, ZS - .40, ZS);

  // ---------------------------------------------------------------- 客厅 · the living room
  const SFX = 0.14, SFZ = -2.55;                       // the sofa
  {
    // ---- 电视柜 and the television nobody watches
    const TVX = 0.10, TVZ = 1.16;
    box(TVX, Y + .21, TVZ, 1.70, .42, .44, col.wood, { gloss: .22, tag: '电视', ...MAT.timber });
    box(TVX, Y + .43, TVZ, 1.78, .035, .48, col.woodL,
        { hard: true, gloss: .32, tag: '电视', mode: 6 });
    for (const dx of [-.42, .42])
      box(TVX + dx, Y + .21, TVZ - .225, .74, .30, .014, col.woodL,
          { hard: true, gloss: .26, mode: 6 });
    for (const dx of [-.42, .42])
      box(TVX + dx, Y + .21, TVZ - .240, .16, .022, .012, col.brassD, { hard: true, gloss: .5 });
    // the set: a big flat panel on a spindly foot, dark because it is off
    cyl(TVX, Y + .48, TVZ + .02, .075, .07, C('#2b3036'), { gloss: .4 });
    box(TVX, Y + .53, TVZ + .02, .32, .03, .18, C('#2b3036'), { hard: true, gloss: .4 });
    box(TVX, Y + 1.02, TVZ + .04, 1.32, .78, .055, C('#1b1f24'),
        { hard: true, gloss: .30, tag: '电视' });
    box(TVX, Y + 1.03, TVZ + .006, 1.24, .70, .012, col.linen,
        { hard: true, mode: 18, alpha: .92, gloss: .55, tag: '电视' });
    // 电视罩 — the embroidered cloth laid over the top of it, which is the whole story
    box(TVX, Y + 1.425, TVZ + .04, 1.30, .022, .16, col.lace, { hard: true, gloss: .05, ...MAT.cloth });
    for (let i = 0; i < 9; i++)
      box(TVX - .56 + i * .14, Y + 1.386, TVZ - .034, .085, .075, .008, col.lace,
          { hard: true, gloss: .05, mode: 7 });
    // the remote, still in the shrink wrap it came in
    box(TVX + .58, Y + .462, TVZ - .10, .055, .022, .17, C('#2f343a'), { hard: true, gloss: .5, ry: .3 });
    // a doily, a photo frame and the tin of loose tea that lives on every one of these
    box(TVX - .62, Y + .452, TVZ - .06, .22, .008, .18, col.lace, { hard: true, gloss: .05, mode: 7 });
    box(TVX - .62, Y + .545, TVZ - .06, .17, .19, .020, col.brassD, { hard: true, gloss: .34, rz: .02 });
    box(TVX - .62, Y + .545, TVZ - .074, .13, .15, .006, C('#b8b09c'), { hard: true, gloss: .3 });
    cyl(TVX + .30, Y + .515, TVZ - .04, .055, .13, C('#2c5c48'), { gloss: .34, tag: '茶' });
    cyl(TVX + .30, Y + .585, TVZ - .04, .057, .015, C('#c8a44a'), { gloss: .45 });
    shade(TVX, TVZ, 1.86, .56, .32);
    stop(TVX - .89, TVX + .89, TVZ - .24, TVZ + .24);

    // ---- 挂钟, high on the partition where it can be read from the sofa
    box(3.05, Y + 1.95, HALL.z0 - .075, .34, .34, .045, col.woodD,
        { hard: true, gloss: .26, tag: '挂钟', mode: 6 });
    cyl(3.05, Y + 1.95, HALL.z0 - .102, .145, .022, C('#f4f1e6'),
        { rx: PI / 2, gloss: .22, tag: '挂钟' });
    for (let i = 0; i < 12; i++) {
      const a = i * PI / 6;
      box(3.05 + Math.sin(a) * .118, Y + 1.95 + Math.cos(a) * .118, HALL.z0 - .116,
          i % 3 ? .010 : .016, i % 3 ? .022 : .030, .004, col.ink, { hard: true, rz: -a });
    }
    // `setClockHands` puts each hand at (d.x, d.y, d.z) + (sin yaw, 0, cos yaw) * off. At yaw PI
    // that normal is world -z, so a POSITIVE `off` is what stands the hands in front of a face
    // looking into the 客厅; negative would bury them in the partition behind it.
    if (dialFn) {
      const hand = (len, w, c) => box(3.05, Y + 1.95, HALL.z0 - .122, w, len, .006, c,
                                      { hard: true, gloss: .2 });
      dialFn(3.05, Y + 1.95, HALL.z0, PI, [
        { p: hand(.075, .014, col.ink), per: 720, off: .122, len: .075, w: .014, t: .006 },
        { p: hand(.108, .010, col.ink), per: 60, off: .127, len: .108, w: .010, t: .006 },
      ]);
    }
    cyl(3.05, Y + 1.95, HALL.z0 - .130, .012, .010, col.redD, { rx: PI / 2, gloss: .4 });

    // ---- 沙发, with a fitted cover on it and 椅背巾 over the back
    const sofa = (sx, sz) => {
      box(sx, Y + .19, sz, 1.80, .38, .88, col.sofaD, { gloss: .10, tag: '沙发', ...MAT.cloth });
      box(sx, Y + .53, sz - .32, 1.80, .70, .24, col.sofaD, { gloss: .10, tag: '沙发', ...MAT.cloth });
      for (const s of [-1, 1])
        box(sx + s * .82, Y + .44, sz + .04, .16, .52, .80, col.sofaD,
            { gloss: .10, tag: '沙发', ...MAT.cloth });
      // the cover, a shade paler and a size out, which is what a 沙发套 always is
      for (const dx of [-.58, 0, .58])
        box(sx + dx, Y + .415, sz + .04, .56, .14, .78, col.sofa,
            { gloss: .08, tag: '沙发', ...MAT.cloth });
      for (const dx of [-.58, 0, .58])
        box(sx + dx, Y + .68, sz - .30, .56, .42, .18, col.sofa,
            { gloss: .08, tag: '沙发', ...MAT.cloth });
      for (const s of [-1, 1])
        box(sx + s * .82, Y + .70, sz + .04, .17, .05, .82, col.sofa,
            { gloss: .08, tag: '沙发', mode: 7 });
      // 椅背巾 — three lace antimacassars over the back, and one on each arm
      for (const dx of [-.58, 0, .58])
        box(sx + dx, Y + .885, sz - .285, .40, .012, .26, col.lace,
            { hard: true, gloss: .04, mode: 7, tag: '沙发' });
      for (const dx of [-.58, 0, .58])
        for (let i = 0; i < 4; i++)
          box(sx + dx - .15 + i * .10, Y + .862, sz - .415, .062, .050, .006, col.lace,
              { hard: true, gloss: .04, mode: 7 });
      for (const s of [-1, 1])
        box(sx + s * .82, Y + .728, sz + .06, .19, .010, .34, col.lace,
            { hard: true, gloss: .04, mode: 7 });
      // two cushions, one of them upended the way somebody left it
      box(sx - .52, Y + .60, sz - .18, .38, .34, .14, C('#a98d6e'), { gloss: .06, rz: .12, mode: 7 });
      box(sx + .50, Y + .62, sz - .16, .36, .32, .14, C('#7d8f7a'), { gloss: .06, rz: -.30, mode: 7 });
      // and the folded blanket on the arm that lives there all year
      box(sx + .80, Y + .78, sz - .10, .22, .14, .40, C('#8a6a55'), { gloss: .06, mode: 7 });
      shade(sx, sz + .02, 2.10, 1.00, .34);
    };
    sofa(SFX, SFZ);
    stop(SFX - .92, SFX + .92, SFZ - .46, SFZ + .46);

    // ---- the rug the whole group stands on. `A.rug` cannot be used up here — it lays its bands at
    // a hardcoded y just above zero, which on deck 11 is thirty-one metres under the floor — so the
    // bands are laid by hand off FL instead.
    for (const [i, inset, c] of [[0, 0, C('#8d6f57')], [1, .18, C('#a3866b')],
                                 [2, .46, C('#8d6f57')], [3, .60, C('#b49a7c')]])
      flat(SFX, FL + .002 + i * .003, -1.62, 2.60 - inset, 1.72 - inset, c, { mode: 7, gloss: .03 });

    // ---- 茶几, glass, with everything a Chinese coffee table carries
    const CTX = SFX, CTZ = -1.52;
    for (const [sx5, sz5] of [[-.48, -.22], [.48, -.22], [-.48, .22], [.48, .22]])
      box(CTX + sx5, Y + .19, CTZ + sz5, .05, .38, .05, C('#b7bcc0'),
          { hard: true, gloss: .58, tag: '茶几', ...MAT.metal });
    box(CTX, Y + .155, CTZ, 1.02, .020, .50, C('#c6d3d2'),
        { hard: true, mode: 18, alpha: .34, gloss: .82, tag: '茶几' });
    box(CTX, Y + .395, CTZ, 1.16, .022, .60, C('#cfdcdb'),
        { hard: true, mode: 18, alpha: .30, gloss: .86, tag: '茶几' });
    // 果盘 — the fruit bowl, which is for visitors and is topped up whether or not there are any
    cyl(CTX - .28, Y + .425, CTZ, .175, .038, C('#e8e3d6'), { gloss: .38, tag: '水果' });
    cyl(CTX - .28, Y + .452, CTZ, .155, .020, C('#dcd5c4'), { gloss: .36, tag: '水果' });
    ball(CTX - .34, Y + .488, CTZ - .05, .052, .048, .052, C('#c0472f'), { gloss: .28, tag: '水果' });
    ball(CTX - .23, Y + .486, CTZ - .03, .048, .046, .048, C('#c9722a'), { gloss: .24, tag: '水果' });
    ball(CTX - .30, Y + .486, CTZ + .07, .050, .046, .050, C('#b8552f'), { gloss: .28, tag: '水果' });
    ball(CTX - .19, Y + .530, CTZ + .02, .046, .044, .046, C('#d3a13a'), { gloss: .26, tag: '水果' });
    // 干果盘 — the compartment dish of melon seeds, walnuts and sweets, lid off
    cyl(CTX + .22, Y + .420, CTZ - .04, .155, .028, C('#7d4a3c'), { gloss: .30, tag: '干果' });
    for (let i = 0; i < 5; i++) {
      const a = i * PI * .4;
      cyl(CTX + .22 + Math.sin(a) * .085, Y + .438, CTZ - .04 + Math.cos(a) * .085, .055, .014,
          [C('#c9a86a'), C('#8a6a45'), C('#b03d33'), C('#6f5a3a'), C('#c8b489')][i],
          { gloss: .22, tag: '干果' });
    }
    cyl(CTX + .22, Y + .448, CTZ - .04, .050, .012, C('#a8783f'), { gloss: .2 });
    // the thermos and two lidded cups, which is how tea is drunk in this flat
    cyl(CTX + .50, Y + .555, CTZ + .13, .078, .30, C('#b8483c'), { gloss: .34, tag: '热水壶' });
    cyl(CTX + .50, Y + .715, CTZ + .13, .052, .05, C('#e0dbcd'), { gloss: .30 });
    box(CTX + .50, Y + .60, CTZ + .06, .06, .16, .022, C('#9c3f34'), { hard: true, gloss: .3 });
    for (const dx of [-.03, .17])
      { cyl(CTX + dx, Y + .455, CTZ + .17, .043, .10, C('#e6e0d2'), { gloss: .40, tag: '茶' });
        cyl(CTX + dx, Y + .512, CTZ + .17, .045, .016, C('#dcd4c2'), { gloss: .40, tag: '茶' }); }
    // the remote for the air conditioner, the only remote in daily use
    box(CTX - .04, Y + .414, CTZ - .20, .048, .014, .13, C('#e4dfd2'), { hard: true, gloss: .3, ry: -.2 });
    // a newspaper folded to the crossword
    box(CTX + .36, Y + .412, CTZ + .18, .26, .006, .19, C('#e2ddcb'), { hard: true, gloss: .05, ry: .1 });
    shade(CTX, CTZ, 1.30, .74, .28);

    // ---- 富贵竹 in water, which is the plant every one of these flats has because it needs nothing
    const LX = 4.10, LZ2 = -2.55;
    cyl(LX, Y + .38, LZ2, .085, .34, C('#a8c4c0'), { mode: 18, alpha: .34, gloss: .84, tag: '植物' });
    cyl(LX, Y + .32, LZ2, .078, .21, col.water, { mode: 16, alpha: .70, tag: '植物' });
    for (let i = 0; i < 7; i++) {
      const a = i * PI * .29, r = .034;
      cyl(LX + Math.sin(a) * r, Y + .74, LZ2 + Math.cos(a) * r, .011, .84, C('#5f8f4a'),
          { rz: Math.sin(a) * .10, rx: Math.cos(a) * .10, gloss: .16, tag: '植物' });
      for (const ly of [.86, 1.02, 1.14])
        cap(LX + Math.sin(a) * (r + .07), Y + ly, LZ2 + Math.cos(a) * (r + .07), .022, .17, .012,
            C(i % 2 ? '#4e8241' : '#66a052'), { rz: Math.sin(a) * .8 + .5, gloss: .14 });
    }
    box(LX, Y + .12, LZ2, .34, .24, .34, col.woodD, { gloss: .20, mode: 6 });
    shade(LX, LZ2, .44, .44, .30);

    // ---- 空调, high on the east wall where every one of them is
    box(X1 - .13, Y + 2.10, 0.60, .22, .30, 1.00, C('#f1ede2'), { gloss: .22, tag: '空调' });
    box(X1 - .245, Y + 2.10, 0.60, .012, .26, .94, C('#e6e1d4'), { hard: true, gloss: .26 });
    for (let i = 0; i < 7; i++)
      box(X1 - .24, Y + 1.98 + i * .009, 0.60, .020, .006, .90, C('#d6d1c2'),
          { hard: true, gloss: .2 });
    cyl(X1 - .245, Y + 2.24, 0.98, .010, .010, C('#63d38a'), { rz: PI / 2, mode: 1, glow: .14 });
    // the drain hose, taped down the wall the way it always is
    cyl(X1 - .04, Y + 1.20, 1.16, .011, 1.60, C('#e2ded1'), { gloss: .2 });

    // ---- 餐厅 · the folding table at the east end, with one leaf down because there are two of
    // them and it only goes up when somebody comes
    const DX = 4.55, DZ = 0.15;
    box(DX, Y + .715, DZ, 1.06, .035, .74, col.woodL,
        { hard: true, gloss: .26, tag: '桌子', mode: 6 });
    box(DX - .70, Y + .34, DZ, .34, .70, .70, col.woodL,
        { hard: true, gloss: .24, rz: -.18, tag: '桌子', mode: 6 });
    for (const [sx6, sz6] of [[-.44, -.28], [.44, -.28], [-.44, .28], [.44, .28]])
      box(DX + sx6, Y + .35, DZ + sz6, .05, .70, .05, col.wood,
          { hard: true, gloss: .22, mode: 6 });
    box(DX, Y + .58, DZ, .96, .04, .64, col.wood, { hard: true, gloss: .2, mode: 6 });
    // the plastic cloth over the cloth, which is the correct number of cloths
    box(DX, Y + .736, DZ, 1.12, .008, .80, C('#c2543f'), { hard: true, gloss: .06, mode: 7 });
    box(DX, Y + .744, DZ, 1.14, .006, .82, C('#e8f0ee'),
        { hard: true, mode: 18, alpha: .22, gloss: .70 });
    // four stools, two of them tucked right under
    for (const [sx7, sz7, ry] of [[-.02, -.62, 0], [-.02, .62, PI], [.62, .02, .3], [-.62, .04, -.3]]) {
      cyl(DX + sx7, Y + .225, DZ + sz7, .155, .45, col.wood, { gloss: .22, ry, tag: '椅子' });
      cyl(DX + sx7, Y + .455, DZ + sz7, .175, .028, col.woodL, { gloss: .26, mode: 6 });
      shade(DX + sx7, DZ + sz7, .38, .38, .26);
    }
    // the vacuum flask, a bowl of eggs and the chopstick jar
    cyl(DX + .28, Y + .888, DZ - .18, .085, .28, C('#d9d2bc'), { gloss: .30, tag: '热水壶' });
    cyl(DX + .28, Y + 1.045, DZ - .18, .058, .05, C('#b03d33'), { gloss: .30 });
    cyl(DX - .26, Y + .795, DZ + .16, .105, .075, C('#e2ddd0'), { gloss: .34 });
    for (const [ex, ez] of [[-.28, .14], [-.24, .19], [-.26, .10]])
      ball(DX + ex, Y + .845, DZ + ez, .026, .033, .026, C('#e0c8a2'), { gloss: .22 });
    cyl(DX + .06, Y + .815, DZ + .22, .042, .13, C('#8a6a45'), { gloss: .22 });
    for (let i = 0; i < 5; i++)
      cyl(DX + .06 + (i - 2) * .010, Y + .92, DZ + .22 + (i % 2) * .012, .005, .24, C('#c9a86a'),
          { rz: (i - 2) * .04, gloss: .2 });
    shade(DX, DZ, 1.30, .96, .28);
    stop(DX - .60, DX + .60, DZ - .48, DZ + .48);

    // ---- 饮水机. Every flat in this block has one, it stands where the wall is otherwise blank,
    // and the spare barrel on the floor beside it is the reason it is never quite in the corner.
    const DPX = X1 - .28, DPZ = -1.95;
    box(DPX, Y + .40, DPZ, .34, .80, .36, C('#e4e0d3'), { gloss: .26, tag: '饮水机' });
    box(DPX, Y + .81, DPZ, .38, .04, .40, C('#d6d1c2'), { hard: true, gloss: .28, tag: '饮水机' });
    box(DPX - .12, Y + .60, DPZ, .12, .20, .26, C('#cdc8b8'), { hard: true, gloss: .30 });
    for (const [dz, c] of [[-.09, C('#b8483c')], [.09, C('#4f7fa8')]]) {
      box(DPX - .19, Y + .62, DPZ + dz, .05, .07, .07, c, { hard: true, gloss: .34, tag: '饮水机' });
      cyl(DPX - .215, Y + .565, DPZ + dz, .010, .07, C('#b7bcc0'), { gloss: .5 });
    }
    cyl(DPX, Y + .885, DPZ, .105, .11, C('#cdd6d2'), { gloss: .5, mode: 18, alpha: .55 });
    taper(DPX, Y + 1.14, DPZ, .155, .40, .155, C('#bcd6d2'),
          { gloss: .62, mode: 18, alpha: .48, tag: '饮水机' });
    cyl(DPX, Y + 1.10, DPZ, .140, .30, col.water, { mode: 16, alpha: .72 });
    cyl(DPX, Y + 1.37, DPZ, .050, .07, C('#3f6f96'), { gloss: .40 });
    // the spare barrel on the floor, and a stack of paper cups on the top
    taper(DPX - .06, Y + .26, DPZ + .48, .155, .40, .155, C('#bcd6d2'),
          { gloss: .58, mode: 18, alpha: .48, ry: .4 });
    cyl(DPX - .06, Y + .22, DPZ + .48, .140, .30, col.water, { mode: 16, alpha: .72 });
    cyl(DPX - .06, Y + .49, DPZ + .48, .050, .07, C('#3f6f96'), { gloss: .40 });
    cyl(DPX + .09, Y + .865, DPZ - .12, .036, .09, C('#f0ece0'), { gloss: .22 });
    shade(DPX, DPZ, .48, .48, .32);
    shade(DPX - .06, DPZ + .48, .38, .38, .30);
    stop(DPX - .22, DPX + .22, DPZ - .24, DPZ + .70);

    // ---- the two ceiling lights, and the pools they put on the floor
    for (const [lx2, lz3, r2] of [[0.60, -1.20, .46], [4.50, 0.20, .38]]) {
      box(lx2, Y + FT.h - .050, lz3, r2 * 2, .06, r2 * 2, C('#e8e2d4'), { hard: true, gloss: .18 });
      cyl(lx2, Y + FT.h - .105, lz3, r2, .05, C('#fff3d8'), { gloss: .20, mode: 1, glow: .04 });
      light(lx2, Y + FT.h - .22, lz3, C('#ffeecd'), .44, 4.20);
      pool(lx2, FL + .012, lz3, r2 * 5.4, r2 * 5.4, C('#ffe9c4'), .075);
    }
  }

  // ---------------------------------------------------------------- 阳台 · the balcony
  //
  // The busiest room in the flat, and the only one that is never tidy. Laundry dries here, not in a
  // machine; the machine only washes. Everything that has nowhere else to be is out here too.
  {
    const BY0 = 1.00;                                  // the parapet
    // The 阳台 is TILED. The flat's slab is one timber quad from the front door to the block's
    // south face, and left alone it runs the living-room floorboards straight out onto a balcony
    // that gets rained on — which is the one surface in a Chinese flat that is never wood. A tile
    // field 6 mm over it, with the floor gully every balcony drains through.
    flat((BAL.x0 + BAL.x1) / 2, Y + .010, (BAL.z0 + BAL.z1) / 2 + .04, BAL.x1 - BAL.x0,
         BAL.z1 - BAL.z0 - .08, C('#bdb4a4'),
         { mode: 9, gloss: .42, mat: 'tile', matScale: .30, matAmt: .26, nrmAmt: .28 });
    box(4.60, Y + .016, -4.20, .16, .012, .16, C('#9aa1a6'), { hard: true, gloss: .50 });
    for (let i = 0; i < 3; i++)
      box(4.60, Y + .023, -4.24 + i * .04, .13, .006, .012, C('#7f868b'), { hard: true, gloss: .4 });
    box((BAL.x0 + BAL.x1) / 2, Y + BY0 / 2, ZF + .06, BAL.x1 - BAL.x0, BY0, .12, col.cream,
        { hard: true, gloss: .14, ...MAT.plaster });
    box((BAL.x0 + BAL.x1) / 2, Y + BY0 + .025, ZF + .06, BAL.x1 - BAL.x0, .05, .18, col.linen,
        { hard: true, gloss: .34 });
    stop(BAL.x0, BAL.x1, ZF, ZF + .14);

    // ---- what you see over it. South this time, and simpler than the landing window, because what
    // matters out here is that the laundry is a silhouette against it.
    const atz = (u, y, d, wu, h, c, o) => box(u, Y + y, ZF + d, wu, h, .011, c, o);
    {
      let seed = 771103;
      const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      const U0 = BAL.x0, U1 = BAL.x1, HZN = 1.44;
      // 11.6 m2 of sky. Anything much over a square metre wants .02–.05 or it stops being a window
      // and becomes a lightbox.
      sky(atz((U0 + U1) / 2, 1.70, .012, U1 - U0, 1.70, col.sky,
                { hard: true, mode: 1, glow: .012 }));
      atz((U0 + U1) / 2, 2.14, .016, U1 - U0, .80, col.skyLo,
          { hard: true, mode: 1, glow: .022, alpha: .55 });
      atz((U0 + U1) / 2, HZN + .12, .020, U1 - U0, .44, col.haze,
          { hard: true, mode: 1, alpha: .45 });
      for (let u = U0; u < U1;) {
        const w = .28 + rnd() * .40, h = .10 + rnd() * .46, cu = u + w / 2;
        cityFn(0, atz(cu, HZN - .10 + h / 2, .026, w * .95, h, col.cFar, { hard: true, mode: 1 }));
        u += w + .06 + rnd() * .14;
      }
      for (let u = U0 - .1; u < U1;) {
        const w = .46 + rnd() * .58, h = .16 + rnd() * .40, cu = u + w / 2, base = HZN - .52;
        cityFn(1, atz(cu, base + h / 2, .034, w * .97, h, col.cMid, { hard: true, mode: 1 }));
        cityFn(1, atz(cu, base + h + .020, .038, w * 1.00, .040, col.cRoof, { hard: true, mode: 1 }));
        cityFn(1, atz(cu + (rnd() - .5) * w * .5, base + h + .070, .042, .07 + rnd() * .05, .062,
                      C('#6d7f8d'), { hard: true, mode: 1 }));
        for (let ry = base + .09; ry < base + h - .07; ry += .105)
          for (const c of [-.30, -.10, .10, .30]) if (rnd() > .52)
            cityFn(2, atz(cu + c * w, ry, .046, .034, .044, rnd() > .48 ? col.cLitA : col.cLitB,
                          { hard: true, mode: 1, glow: .18 }));
        u += w + .10 + rnd() * .20;
      }
    }
    // ---- the glazing over the parapet: aluminium, four bays, one of them slid open
    const GH0 = BY0 + .05, GH1 = 2.34;
    box((BAL.x0 + BAL.x1) / 2, Y + GH1 + .035, ZF + .080, BAL.x1 - BAL.x0, .07, .07, C('#a9afb3'),
        { hard: true, gloss: .40, ...MAT.metal });
    box((BAL.x0 + BAL.x1) / 2, Y + GH0 - .020, ZF + .080, BAL.x1 - BAL.x0, .06, .07, C('#a9afb3'),
        { hard: true, gloss: .40, ...MAT.metal });
    for (let i = 0; i <= 6; i++)
      box(BAL.x0 + (BAL.x1 - BAL.x0) * i / 6, Y + (GH0 + GH1) / 2, ZF + .080, .055,
          GH1 - GH0, .07, C('#a9afb3'), { hard: true, gloss: .40, ...MAT.metal });
    for (let i = 0; i < 6; i++) {
      if (i === 2) continue;                            // this one is slid open
      box(BAL.x0 + (BAL.x1 - BAL.x0) * (i + .5) / 6, Y + (GH0 + GH1) / 2, ZF + .090,
          (BAL.x1 - BAL.x0) / 6 - .10, GH1 - GH0 - .06, .010, col.glass,
          { hard: true, mode: 18, alpha: .26, gloss: .82 });
    }
    box(BAL.x0 + (BAL.x1 - BAL.x0) * 1.5 / 6, Y + (GH0 + GH1) / 2, ZF + .140,
        (BAL.x1 - BAL.x0) / 6 - .10, GH1 - GH0 - .06, .010, col.glass,
        { hard: true, mode: 18, alpha: .26, gloss: .82 });
    // 空调外机 — the outdoor half of the air conditioner. It lives in a cavity in the parapet
    // behind a louvred panel, which is where new blocks here put it, and is the only way to have
    // it at all: the block's south face is a one-sided quad and anything built beyond it simply
    // does not exist from in here.
    box(5.05, Y + .55, ZF + .118, 1.02, .70, .05, C('#8f9599'),
        { hard: true, gloss: .30, tag: '空调', ...MAT.metal });
    for (let i = 0; i < 13; i++)
      box(5.05, Y + .27 + i * .048, ZF + .148, .96, .028, .014, C('#a7aeb3'),
          { hard: true, gloss: .26, rz: .10, tag: '空调' });
    for (const s of [-1, 1])
      box(5.05 + s * .49, Y + .55, ZF + .150, .05, .72, .020, col.steelP,
          { hard: true, gloss: .40 });
    cyl(5.62, Y + .90, ZF + .14, .011, .34, C('#e2ded1'), { rz: .5, gloss: .2 });

    // ---- 洗衣机, at the wet end, with the basin that lives on top of it
    const WMX = 5.15, WMZ = -4.55;
    box(WMX, Y + .43, WMZ, .62, .86, .62, C('#eceadf'), { gloss: .26, tag: '洗衣机' });
    box(WMX, Y + .865, WMZ, .58, .035, .58, C('#e2dfd2'), { hard: true, gloss: .30, tag: '洗衣机' });
    box(WMX, Y + .866, WMZ - .02, .40, .022, .38, C('#9aa5a8'),
        { hard: true, mode: 18, alpha: .40, gloss: .72, tag: '洗衣机' });
    box(WMX, Y + .845, WMZ + .24, .50, .12, .10, C('#dcd8cb'), { hard: true, gloss: .3 });
    for (const dx of [-.15, -.02, .11])
      cyl(WMX + dx, Y + .855, WMZ + .29, .022, .014, C('#8f989c'), { rx: PI / 2, gloss: .5 });
    cyl(WMX + .21, Y + .858, WMZ + .29, .028, .016, C('#6f9ec2'), { rx: PI / 2, mode: 1, glow: .12 });
    cyl(WMX, Y + .96, WMZ - .02, .215, .16, C('#c95f4a'), { gloss: .28, tag: '盆' });
    cyl(WMX, Y + 1.03, WMZ - .02, .195, .04, C('#d97a63'), { gloss: .28 });
    box(WMX - .05, Y + 1.05, WMZ - .05, .18, .05, .14, C('#dfe4e0'), { gloss: .1, mode: 7 });
    // the hose into the floor gully, and the powder box on the sill behind
    cyl(WMX - .34, Y + .12, WMZ + .10, .014, .40, C('#c8c3b4'), { rz: 1.1, gloss: .3 });
    cyl(WMX - .52, FL + .012, WMZ + .14, .075, .012, C('#8f989c'), { gloss: .4 });
    box(WMX - .30, Y + 1.10, ZF + .20, .22, .20, .16, C('#5f86b0'), { gloss: .2 });
    shade(WMX, WMZ, .78, .78, .34);
    // Tight to the machine, and it matters: the balcony is 1.70 m deep and gives 1.10 m of
    // standing room, so every centimetre of collider past the box is a centimetre off the only
    // route to the wet end.
    stop(WMX - .32, WMX + .32, WMZ - .32, WMZ + .32);

    // ---- 拖把池, the deep glazed sink every balcony has, with the mop standing in it
    const MPX = 4.05, MPZ = -4.62;
    box(MPX, Y + .30, MPZ, .58, .60, .48, C('#eae6dc'), { hard: true, gloss: .40, tag: '水池' });
    box(MPX, Y + .615, MPZ, .62, .05, .52, C('#f2eee4'), { hard: true, gloss: .46, tag: '水池' });
    box(MPX, Y + .58, MPZ, .48, .05, .38, C('#d8d3c4'), { hard: true, gloss: .44 });
    cyl(MPX, Y + .74, MPZ - .21, .018, .30, C('#b7bcc0'), { gloss: .58, ...MAT.metal });
    cyl(MPX, Y + .87, MPZ - .16, .015, .12, C('#b7bcc0'), { rx: PI / 2, gloss: .58 });
    cyl(MPX + .12, Y + .78, MPZ + .04, .014, .95, C('#9a7c4e'), { rz: .10, gloss: .18, tag: '拖把' });
    cap(MPX + .17, Y + .38, MPZ + .04, .085, .16, .095, C('#c8c2ae'), { gloss: .06, tag: '拖把' });
    cyl(MPX - .60, FL + .13, MPZ - .04, .140, .26, C('#c04a3c'), { gloss: .28 });
    cyl(MPX - .60, FL + .265, MPZ - .04, .120, .012, C('#d0594a'), { gloss: .30 });
    shade(MPX, MPZ, .70, .60, .30);
    shade(MPX - .60, MPZ - .04, .34, .34, .28);
    stop(MPX - .31, MPX + .31, MPZ - .27, MPZ + .27);

    // ---- 晾衣架 — the rise-and-fall drying rack, wound down and full. This is the busiest object
    // in the flat and it is meant to be: everything else out here is arranged around it.
    const RX0 = 0.10, RX1 = 3.50, RY = 1.62;
    for (const rz2 of [-4.14, -3.86]) {
      cyl((RX0 + RX1) / 2, Y + RY, rz2, .014, RX1 - RX0, C('#cfd4d7'),
          { rz: PI / 2, gloss: .55, tag: '晾衣架', ...MAT.metal });
      for (const rx2 of [RX0 + .10, RX1 - .10]) {
        cyl(rx2, Y + RY + .40, rz2, .006, .80, C('#b7bcc0'), { gloss: .5 });
        box(rx2, Y + FT.h - .06, rz2, .10, .05, .10, C('#c8c3b4'), { hard: true, gloss: .3 });
      }
    }
    box(RX1 + .18, Y + 1.30, -4.00, .10, .34, .12, C('#e2ded1'), { gloss: .24 });  // the winder
    cyl(RX1 + .18, Y + 1.02, -4.00, .011, .60, C('#cfd4d7'), { gloss: .5 });
    // hangers, and what is on them. Two rails, twelve garments, all of them at slightly different
    // angles, because a rail where everything hangs square is a shop and not a balcony.
    const hang = (hx, rz2, w, h, c, ry) => {
      cyl(hx, Y + RY - .045, rz2, .004, .30, C('#d8d3c4'), { rz: PI / 2, gloss: .4, ry });
      cyl(hx, Y + RY - .012, rz2, .008, .05, C('#b7bcc0'), { gloss: .5 });
      box(hx, Y + RY - .07 - h / 2, rz2, w, h, .040, c, { gloss: .05, ry, ...MAT.cloth,
                                                          tag: '晾衣架' });
      box(hx, Y + RY - .10, rz2, w * .92, .10, .045, c, { gloss: .05, ry, mode: 7 });
    };
    hang(0.34, -4.14, .40, .62, C('#e8e5da'), .05);
    hang(0.80, -4.14, .38, .58, C('#8fa4b8'), -.07);
    hang(1.24, -4.14, .42, .74, C('#c5b79a'), .03);
    hang(1.72, -4.14, .36, .50, C('#b0787c'), -.04);
    hang(2.20, -4.14, .40, .66, C('#7d8f7a'), .06);
    hang(2.70, -4.14, .38, .56, C('#e0dbcd'), -.02);
    hang(3.16, -4.14, .42, .70, C('#5f6f82'), .04);
    hang(0.50, -3.86, .44, .84, C('#dcd6c6'), -.03);
    hang(1.02, -3.86, .40, .78, C('#9c8f76'), .05);
    hang(1.56, -3.86, .38, .60, C('#c8ccd2'), -.06);
    // a sheet folded double over the front rail, which is what actually blocks the light. East of
    // the walk-through (x 1.40 .. 2.30 once clamped), so you duck the shirts and not the sheet.
    box(2.98, Y + RY - .46, -3.86, 1.24, .90, .050, C('#eceadf'),
        { gloss: .04, tag: '晾衣架', ...MAT.cloth });
    box(2.98, Y + RY - .015, -3.86, 1.26, .07, .09, C('#eceadf'), { gloss: .04, mode: 7 });
    // the round peg hanger, forty pegs and eight socks
    cyl(3.34, Y + RY - .30, -3.86, .155, .012, C('#cfd4d7'), { rx: PI / 2, gloss: .4 });
    cyl(3.34, Y + RY - .16, -3.86, .006, .28, C('#cfd4d7'), { gloss: .4 });
    for (let i = 0; i < 12; i++) {
      const a = i * PI / 6;
      box(3.34 + Math.sin(a) * .155, Y + RY - .30 - Math.cos(a) * .155, -3.86, .020, .045, .012,
          [C('#d8d3c4'), C('#b0787c'), C('#7d8f7a')][i % 3], { hard: true, gloss: .2, rz: -a });
      if (i % 3 === 0)
        box(3.34 + Math.sin(a) * .20, Y + RY - .42 - Math.cos(a) * .20, -3.86, .07, .17, .035,
            C(i % 2 ? '#3f4a55' : '#c8c2ae'), { gloss: .05, mode: 7, rz: -a * .4 });
    }
    // the clothes horse standing folded against the parapet, because one rack is never enough
    for (const s of [-1, 1])
      box(-0.30 + s * .012, Y + .58, -4.62 + s * .09, .04, 1.10, .55, C('#cfd4d7'),
          { hard: true, gloss: .45, rx: s * .10 });
    for (let i = 0; i < 5; i++)
      cyl(-0.30, Y + .28 + i * .18, -4.62, .008, .34, C('#cfd4d7'), { rx: PI / 2, gloss: .45 });
    shade(-0.30, -4.62, .48, .50, .26);

    // ---- 咸菜坛子, the glazed pickle jars, and a string of garlic over them
    for (const [jx, jz, jr, jc] of [[-0.42, -3.72, .155, C('#5a4a3c')],
                                    [-0.10, -3.68, .125, C('#4d4235')],
                                    [-0.36, -3.42, .105, C('#6a5342')]]) {
      taper(jx, FL + .11, jz, jr, .22, jr, jc, { gloss: .34 });
      cyl(jx, FL + .25, jz, jr * .70, .07, jc, { gloss: .34 });
      cyl(jx, FL + .295, jz, jr * .80, .022, C('#7d6650'), { gloss: .40 });
      shade(jx, jz, jr * 2.6, jr * 2.6, .28);
    }
    stop(-0.60, 0.04, -3.86, -3.36);
    cyl(-0.55, Y + 1.42, -3.60, .012, .42, C('#b9ad94'), { gloss: .2 });
    for (let i = 0; i < 6; i++)
      ball(-0.55 + (i % 2 - .5) * .045, Y + 1.30 - i * .075, -3.60, .038, .042, .038,
           C('#ddd4bc'), { gloss: .16 });
    // and a tray of chillies drying on the parapet, which is the only red out here
    box(3.90, Y + BY0 + .06, ZF + .16, .40, .020, .26, C('#b49a7c'), { hard: true, gloss: .1 });
    for (let i = 0; i < 9; i++)
      cap(3.78 + (i % 3) * .11, Y + BY0 + .085, ZF + .10 + ((i / 3) | 0) * .07, .014, .10, .014,
          C('#a8362a'), { rz: PI / 2, ry: i * .5, gloss: .22 });

    // ---- one bare fitting out here, and the light off the sky
    box(2.30, Y + FT.h - .055, -4.30, .30, .07, .30, C('#e8e2d4'), { hard: true, gloss: .16 });
    box(2.30, Y + FT.h - .100, -4.30, .24, .04, .24, C('#fff3d8'), { hard: true, mode: 1, glow: .05 });
    light(2.30, Y + FT.h - .24, -4.30, C('#ffeecd'), .30, 3.20);
    pool(2.60, FL + .012, -4.20, 6.20, 1.40, C('#dfe9f0'), .07, true);
    shade(2.35, -3.90, 3.60, .90, .26);
  }

  // ---------------------------------------------------------------- 主卧 · the bedroom
  {
    // The bed is at x -3.85, not -4.00, and its collider is the bed and not a hand's breadth more.
    // At -4.00 with a ±0.10 collider it left 0.52 m of standing room between it and the west wall,
    // which `clampMove` spends 0.60 of on the body — so the half of the 主卧 with the window in it
    // could not be walked to at all. 0.77 m is a gap you can stand in and draw the curtain from.
    const BX2 = -3.85, BZ3 = 2.20, BW = 1.55, BL = 1.90;      // the bed
    // 硬板床 — a board bed. The frame is timber, the mattress is 100 mm and it is meant to be hard;
    // a 200 mm sprung one would be the wrong object in this room.
    box(BX2, Y + .18, BZ3, BW + .10, .36, BL + .10, col.wood, { gloss: .20, tag: '床', ...MAT.timber });
    for (const s of [-1, 1])
      box(BX2 + s * (BW / 2 + .035), Y + .38, BZ3, .07, .10, BL + .10, col.woodL,
          { hard: true, gloss: .24, mode: 6 });
    box(BX2, Y + .74, BZ3 + BL / 2 + .01, BW + .12, .78, .06, col.wood,
        { hard: true, gloss: .22, tag: '床', mode: 6 });
    box(BX2, Y + 1.10, BZ3 + BL / 2 + .01, BW - .10, .12, .08, col.woodL,
        { hard: true, gloss: .26, mode: 6 });
    box(BX2, Y + .415, BZ3, BW, .11, BL, C('#e2dccd'), { gloss: .05, tag: '床', ...MAT.cloth });
    // 凉席 — the split-bamboo summer mat, laid straight on the mattress, edged in cloth. In a Beijing
    // flat this comes out in June and goes away in September and it is the single most seasonal
    // object in the room.
    box(BX2, Y + .476, BZ3 - .02, BW - .10, .016, BL - .14, col.reed,
        { hard: true, gloss: .26, tag: '凉席', mat: 'wood', matScale: .18, matAmt: .30, nrmAmt: .30 });
    // The split-bamboo battens. Two things had to be got right and both were wrong first time:
    // they sit 5 mm CLEAR of the mat's top face rather than through it — intersecting boxes on a
    // 1.5 m panel z-fight into hard black-and-white stripes that read as a zebra crossing from the
    // door — and the contrast between batten and mat is a fifth of what it was, because at a
    // batten every 70 mm the eye wants a texture, not a barcode.
    for (let i = 0; i < 15; i++)
      box(BX2 - (BW - .16) / 2 + i * (BW - .16) / 14, Y + .489, BZ3 - .02, .010, .008,
          BL - .18, col.reedD, { hard: true, gloss: .22 });
    for (const s of [-1, 1]) {
      box(BX2 + s * (BW - .09) / 2, Y + .484, BZ3 - .02, .028, .020, BL - .13, C('#8a6642'),
          { hard: true, gloss: .18 });
      box(BX2, Y + .484, BZ3 - .02 + s * (BL - .13) / 2, BW - .09, .020, .028, C('#8a6642'),
          { hard: true, gloss: .18 });
    }
    // the mat is rolled back at the foot because it is not warm enough yet to sleep on all of it
    cyl(BX2, Y + .545, BZ3 - BL / 2 + .20, .062, BW - .12, col.reed, { rz: PI / 2, gloss: .24 });
    // two 荞麦枕, long and flat, and the 空调被 folded at the foot
    for (const s of [-1, 1])
      cap(BX2 + s * .36, Y + .552, BZ3 + BL / 2 - .26, .155, .60, .105, C('#eae4d4'),
          { ry: PI / 2, gloss: .06, tag: '枕头', mode: 7 });
    for (const s of [-1, 1])
      box(BX2 + s * .36, Y + .560, BZ3 + BL / 2 - .26, .54, .020, .19, C('#c8d3d8'),
          { hard: true, gloss: .05, mode: 7 });
    box(BX2, Y + .560, BZ3 - BL / 2 + .34, BW - .22, .14, .46, C('#93a5b0'),
        { gloss: .05, tag: '被子', ...MAT.cloth });
    box(BX2, Y + .632, BZ3 - BL / 2 + .34, BW - .26, .012, .42, C('#a3b3bd'),
        { hard: true, gloss: .05, mode: 7 });
    shade(BX2, BZ3, BW + .50, BL + .40, .36);
    stop(BX2 - BW / 2 - .05, BX2 + BW / 2 + .05, BZ3 - BL / 2 - .05, BZ3 + BL / 2 + .10);

    // ---- 床头柜 and what is on it, which is the most honest surface in any flat
    const NX = -2.72, NZ = 2.86;
    box(NX, Y + .27, NZ, .44, .54, .40, col.wood, { gloss: .22, tag: '床头柜', ...MAT.timber });
    box(NX, Y + .555, NZ, .48, .035, .44, col.woodL, { hard: true, gloss: .28, mode: 6 });
    box(NX, Y + .34, NZ - .21, .36, .16, .014, col.woodL, { hard: true, gloss: .26, mode: 6 });
    cyl(NX, Y + .34, NZ - .225, .016, .016, col.brass, { rx: PI / 2, gloss: .55 });
    cyl(NX - .10, Y + .655, NZ - .02, .043, .17, C('#a8443a'), { gloss: .34, tag: '保温杯' });
    cyl(NX - .10, Y + .748, NZ - .02, .038, .035, C('#c8c2ae'), { gloss: .30 });
    box(NX + .12, Y + .605, NZ + .02, .20, .07, .13, C('#3d4a52'), { gloss: .24, tag: '收音机' });
    for (let i = 0; i < 6; i++)
      box(NX + .07 + i * .014, Y + .605, NZ - .045, .006, .045, .006, C('#8f989c'), { hard: true });
    cyl(NX + .18, Y + .607, NZ - .04, .012, .010, C('#c8a44a'), { rx: PI / 2, gloss: .45 });
    box(NX + .02, Y + .578, NZ + .14, .13, .012, .09, C('#e6e0d2'), { hard: true, gloss: .08 });
    for (const s of [-1, 1])
      cyl(NX + .02 + s * .045, Y + .590, NZ + .14, .022, .003, C('#dfe4e6'),
          { gloss: .7, mode: 18, alpha: .5 });
    box(NX - .14, Y + .576, NZ + .13, .085, .008, .055, C('#d8d3c4'), { hard: true, gloss: .1, ry: .3 });
    shade(NX, NZ, .58, .54, .30);
    stop(NX - .24, NX + .24, NZ - .24, NZ + .24);

    // ---- 衣柜, three doors, against the spine. No `A.rail` here: that contract belongs to your own
    // 主卧 on deck 2 and a second room pushing shirts onto it would put strangers' clothes in your
    // wardrobe.
    const WX2 = -1.19, WZ2 = 1.22, WL = 1.70;
    box(WX2, Y + 1.03, WZ2, .58, 2.06, WL, col.wood, { gloss: .22, tag: '衣柜', ...MAT.timber });
    box(WX2, Y + 2.09, WZ2, .62, .06, WL + .04, col.woodL, { hard: true, gloss: .26, mode: 6 });
    for (let i = 0; i < 3; i++) {
      const dz2 = WZ2 - WL / 2 + WL * (i + .5) / 3;
      box(WX2 - .295, Y + 1.02, dz2, .016, 1.94, WL / 3 - .04, col.woodL,
          { hard: true, gloss: .26, tag: '衣柜', mode: 6 });
      cyl(WX2 - .312, Y + 1.02, dz2 + (i === 1 ? .16 : -.16), .014, .12, col.brassD,
          { rx: PI / 2, gloss: .55 });
      if (i === 1)
        box(WX2 - .314, Y + 1.24, dz2, .006, .90, WL / 3 - .16, C('#c2d2d6'),
            { hard: true, mode: 18, alpha: .78, gloss: .88, tag: '镜子' });
    }
    // the suitcase and the quilt bag that live on top of every wardrobe in the country
    box(WX2 + .02, Y + 2.24, WZ2 - .42, .50, .24, .62, C('#4a5560'), { gloss: .18 });
    box(WX2 + .02, Y + 2.30, WZ2 + .48, .48, .34, .56, C('#c9c2ae'), { gloss: .06, mode: 7 });
    shade(WX2, WZ2, .70, WL + .12, .30);
    stop(WX2 - .32, WX2 + .32, WZ2 - WL / 2, WZ2 + WL / 2);

    // ---- the west window, on the same gable as the landing's, so the same late sun comes in
    const KWZ = 1.90, KWW = 1.40, KWS = .90, KWT = 2.25;
    {
      let seed = 41109;
      const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      sky(box(X0 + .012, Y + (KWS + KWT) / 2, KWZ, .011, KWT - KWS + .12, KWW + .14, col.sky,
                { hard: true, mode: 1, glow: .035 }));
      box(X0 + .018, Y + KWS + .34, KWZ, .010, .46, KWW + .10, col.haze,
          { hard: true, mode: 1, alpha: .40 });
      for (let u = KWZ - KWW / 2 - .06; u < KWZ + KWW / 2 + .02;) {
        const w = .12 + rnd() * .18, h = .12 + rnd() * .44, cu = u + w / 2;
        cityFn(1, box(X0 + .026, Y + KWS + .28 + h / 2, cu, .010, h, w * .95, col.cMid,
                      { hard: true, mode: 1 }));
        for (let ry = KWS + .32; ry < KWS + .28 + h - .06; ry += .10)
          if (rnd() > .55)
            cityFn(2, box(X0 + .032, Y + ry, cu + (rnd() - .5) * w * .5, .008, .036, .028,
                          rnd() > .5 ? col.cLitA : col.cLitB, { hard: true, mode: 1, glow: .16 }));
        u += w + .04 + rnd() * .09;
      }
      for (const [ry, ru, rh, rw] of [[KWS - .055, KWZ, .11, KWW + .20],
                                      [KWT + .055, KWZ, .11, KWW + .20],
                                      [(KWS + KWT) / 2, KWZ - KWW / 2 - .055, KWT - KWS, .11],
                                      [(KWS + KWT) / 2, KWZ + KWW / 2 + .055, KWT - KWS, .11]])
        box(X0 + .055, Y + ry, ru, .11, rh, rw, col.cream,
            { hard: true, gloss: .10, ...MAT.plaster });
      const wf2 = (y, u, h, w) => box(X0 + .100, Y + y, u, .05, h, w, col.alu,
                                      { hard: true, gloss: .40, ...MAT.metal });
      wf2(KWS + .015, KWZ, .06, KWW + .06);
      wf2(KWT - .015, KWZ, .06, KWW + .06);
      wf2((KWS + KWT) / 2, KWZ, KWT - KWS, .06);
      for (const s of [-1, 1]) wf2((KWS + KWT) / 2, KWZ + s * (KWW / 2 - .03), KWT - KWS, .06);
      box(X0 + .082, Y + (KWS + KWT) / 2, KWZ, .010, KWT - KWS - .06, KWW - .06, col.glass,
          { hard: true, mode: 18, alpha: .13, gloss: .80, tag: '窗户' });
      box(X0 + .16, Y + KWS - .045, KWZ, .22, .05, KWW + .20, C('#efe9db'),
          { hard: true, gloss: .28, tag: '窗户' });
      // 纱帘 — the net, pushed back on one side only, and the heavy curtain hooked open
      box(X0 + .19, Y + (KWS + KWT) / 2 + .10, KWZ - .30, .022, KWT - KWS + .30, KWW * .48,
          C('#efece1'), { gloss: .04, mode: 7, alpha: .62, tag: '窗帘' });
      box(X0 + .225, Y + (KWS + KWT) / 2 + .06, KWZ + KWW / 2 - .10, .13, KWT - KWS + .40, .34,
          C('#8a6a55'), { gloss: .06, tag: '窗帘', ...MAT.cloth });
      cyl(X0 + .225, Y + KWT + .21, KWZ, .014, KWW + .40, C('#b7bcc0'), { rz: PI / 2, gloss: .5 });
      // and the late sun coming through it, across the mat and up the wardrobe
      pool(-3.90, FL + .014, 2.05, 2.90, 1.30, col.sun, .16, true);
      pool(BX2 + .10, Y + .500, BZ3 - .10, 1.30, 1.40, col.sun, .22, true);
      pool(WX2 - .30, Y + 1.30, WZ2 - .10, .06, 1.10, col.sun, .18, true);
    }
    // an electric fan in the corner, still in the shape it was folded away in
    cyl(-5.42, FL + .020, 0.72, .17, .04, C('#dcd8cb'), { gloss: .3 });
    cyl(-5.42, FL + .42, 0.72, .022, .78, C('#dcd8cb'), { gloss: .3 });
    cyl(-5.42, FL + .90, 0.72, .175, .11, C('#e4e0d3'), { rx: PI / 2, gloss: .28, tag: '风扇' });
    for (let i = 0; i < 10; i++)
      box(-5.42, FL + .90, 0.665, .010, .34, .010, C('#c8c3b4'), { hard: true, rz: i * PI / 10 });
    cyl(-5.42, FL + .90, 0.66, .045, .03, C('#b8b2a2'), { rx: PI / 2, gloss: .34 });
    shade(-5.42, 0.72, .40, .40, .30);
    // 挂历 in here too, on the spine, with a photograph of a place nobody in the flat has been
    box(WX2 - .32, Y + 1.72, WZ2 - 1.20, .012, .48, .32, col.paper, { hard: true, gloss: .06 });
    box(WX2 - .326, Y + 1.84, WZ2 - 1.20, .006, .22, .28, C('#7d9e8c'), { hard: true, gloss: .10 });
    // the ceiling light
    box(-3.60, Y + FT.h - .050, 1.80, .74, .06, .74, C('#e8e2d4'), { hard: true, gloss: .18 });
    cyl(-3.60, Y + FT.h - .105, 1.80, .36, .05, C('#fff3d8'), { gloss: .20, mode: 1, glow: .04 });
    light(-3.60, Y + FT.h - .22, 1.80, C('#ffeecd'), .40, 3.80);
    pool(-3.60, FL + .012, 1.80, 3.60, 3.60, C('#ffe9c4'), .065);
  }

  // ---------------------------------------------------------------- 厨房 · seen through its door
  //
  // Not a room you spend time in from here — the door is 0.75 m wide and the sight line from the
  // 客厅 runs due west along z = -0.35 — so everything worth building is on that line: the sink
  // under the window, the hob, the wok, and the rice cooker that is on in every flat in the block
  // at half past six.
  {
    const CX2 = -5.68;                                    // the run along the west wall
    box(CX2, Y + .43, -0.90, .62, .86, 2.00, C('#dcd6c6'), { gloss: .22, tag: '厨房' });
    box(CX2, Y + .885, -0.90, .66, .05, 2.06, C('#a8a294'),
        { hard: true, gloss: .44, tag: '厨房', ...MAT.conc });
    for (const dz3 of [-1.55, -0.95, 0.05])
      box(CX2 - .295, Y + .43, dz3 + .30, .016, .78, .52, C('#e4dfd0'),
          { hard: true, gloss: .26, mode: 0 });
    for (const dz3 of [-1.25, -0.65, 0.35])
      cyl(CX2 - .315, Y + .58, dz3, .012, .16, col.steel, { rz: PI / 2, gloss: .55 });
    // the tiled splashback, which is what actually says "kitchen" at four metres. It stops short of
    // the window over the sink — above a sink the window IS the splashback, and running the tile
    // straight through the opening would put a wall in front of the sky.
    box(X0 + .020, Y + 1.32, -1.38, .012, .84, 1.06, C('#e9e4d6'),
        { hard: true, gloss: .48, mat: 'tile', matScale: .17, matAmt: .30, nrmAmt: .30 });
    box(X0 + .020, Y + 1.02, -0.35, .012, .24, .90, C('#e9e4d6'),
        { hard: true, gloss: .48, mat: 'tile', matScale: .17, matAmt: .30, nrmAmt: .30 });
    // the sink under the window, on the sight line
    box(CX2 - .02, Y + .880, -0.35, .50, .06, .74, C('#c8ccd0'),
        { hard: true, gloss: .60, tag: '水池', ...MAT.metal });
    box(CX2 - .02, Y + .830, -0.35, .42, .10, .64, C('#b4b9bd'),
        { hard: true, gloss: .58, tag: '水池' });
    cyl(CX2 - .22, Y + 1.06, -0.35, .016, .30, C('#c8ccd0'), { gloss: .62, ...MAT.metal });
    cyl(CX2 - .13, Y + 1.19, -0.35, .014, .19, C('#c8ccd0'), { rz: PI / 2, gloss: .62 });
    // the hob, the wok on it, and the extractor over
    box(CX2 - .02, Y + .920, -1.35, .48, .05, .62, C('#2f343a'), { hard: true, gloss: .52 });
    for (const dz3 of [-.16, .16])
      cyl(CX2 - .02, Y + .952, -1.35 + dz3, .085, .022, C('#4a5158'), { gloss: .40 });
    cyl(CX2 - .02, Y + 1.010, -1.51, .175, .095, C('#3a3f44'), { gloss: .30, tag: '锅' });
    cyl(CX2 - .02, Y + 1.055, -1.51, .165, .014, C('#4d5359'), { gloss: .34 });
    cyl(CX2 + .22, Y + 1.055, -1.51, .015, .30, C('#6b503a'), { rz: PI / 2, gloss: .2 });
    box(CX2 - .02, Y + 1.72, -1.40, .52, .22, .70, C('#c8ccd0'),
        { gloss: .40, tag: '油烟机', ...MAT.metal });
    box(CX2 - .02, Y + 1.58, -1.40, .48, .07, .64, C('#b4b9bd'), { hard: true, gloss: .46 });
    box(CX2 + .10, Y + 2.10, -1.40, .18, .54, .18, C('#c8ccd0'), { hard: true, gloss: .40 });
    // 电饭煲 — the rice cooker, on, with its lid steaming very slightly
    cyl(CX2 - .02, Y + 1.020, 0.10, .135, .24, C('#e6e2d6'), { gloss: .30, tag: '电饭煲' });
    cyl(CX2 - .02, Y + 1.148, 0.10, .140, .035, C('#d8d3c4'), { gloss: .32, tag: '电饭煲' });
    cyl(CX2 - .02, Y + 1.172, 0.10, .038, .022, C('#b4b9bd'), { gloss: .5 });
    box(CX2 - .16, Y + 1.02, 0.10, .012, .06, .10, C('#2f343a'), { hard: true, gloss: .5 });
    cyl(CX2 - .17, Y + 1.02, 0.07, .008, .008, C('#e05a3a'), { rz: PI / 2, mode: 1, glow: .20 });
    // the chopping board, the knife rack and a braid of garlic on a nail
    box(CX2 + .16, Y + .935, -0.95, .28, .045, .38, C('#c9a86a'), { hard: true, gloss: .18, ry: .06 });
    for (let i = 0; i < 5; i++)
      ball(X0 + .10, Y + 1.62 - i * .075, -0.06 + (i % 2 - .5) * .05, .034, .038, .034,
           C('#ddd4bc'), { gloss: .16 });
    cyl(X0 + .10, Y + 1.70, -0.06, .010, .18, C('#b9ad94'), { gloss: .2 });
    // 冰箱, in the corner where the door will not hit it
    box(-1.22, Y + .82, -1.62, .62, 1.64, .64, C('#e2ded1'), { gloss: .26, tag: '冰箱' });
    box(-1.52, Y + .82, -1.62, .014, 1.56, .58, C('#eae6d9'), { hard: true, gloss: .30, tag: '冰箱' });
    box(-1.53, Y + 1.28, -1.62, .012, .55, .06, C('#c8c3b4'), { hard: true, gloss: .35 });
    box(-1.53, Y + .62, -1.62, .012, .45, .06, C('#c8c3b4'), { hard: true, gloss: .35 });
    box(-1.535, Y + 1.34, -1.42, .006, .16, .12, C('#e8e3d2'), { hard: true, gloss: .1, ry: .04 });
    cyl(-1.53, Y + 1.10, -1.34, .016, .016, C('#b03d33'), { rz: PI / 2, gloss: .3 });
    shade(-1.22, -1.62, .74, .76, .32);
    stop(-1.55, -0.90, -1.96, -1.28);
    stop(X0, X0 + .64, -1.96, 0.14);
    light(-3.40, Y + FT.h - .26, -0.90, C('#fff0d4'), .34, 3.20);
    box(-3.40, Y + FT.h - .050, -0.90, .48, .06, .48, C('#e8e2d4'), { hard: true, gloss: .18 });
    box(-3.40, Y + FT.h - .098, -0.90, .40, .04, .40, C('#fff3d8'), { hard: true, mode: 1, glow: .05 });
    // a small west window over the sink, because the 厨房 is on the same gable as everything else
    sky(box(X0 + .034, Y + 1.50, -0.35, .010, .74, .88, col.sky,
              { hard: true, mode: 1, glow: .04 }));
    box(X0 + .042, Y + 1.72, -0.35, .008, .28, .84, col.haze,
        { hard: true, mode: 1, alpha: .42 });
    for (let u = -0.78; u < 0.10;) {
      const w = .10 + ((u * 37) % 1 + 1) % 1 * .12, h = .16 + ((u * 91) % 1 + 1) % 1 * .26;
      cityFn(1, box(X0 + .050, Y + 1.24 + h / 2, u + w / 2, .008, h, w * .94, col.cMid,
                    { hard: true, mode: 1 }));
      u += w + .05;
    }
    // the reveal: four plaster returns, not one solid block. Built as a single box it covered the
    // opening it was supposed to frame.
    for (const [ry, ru, rh, rw] of [[1.13, -0.35, .10, 1.06], [1.87, -0.35, .10, 1.06],
                                    [1.50, -0.83, .74, .10], [1.50, 0.13, .74, .10]])
      box(X0 + .062, Y + ry, ru, .10, rh, rw, col.cream, { hard: true, gloss: .10, ...MAT.plaster });
    for (const [ry, ru, rh, rw] of [[1.15, -0.35, .05, .92], [1.85, -0.35, .05, .92],
                                    [1.50, -0.80, .70, .05], [1.50, 0.10, .70, .05]])
      box(X0 + .098, Y + ry, ru, .045, rh, rw, col.alu,
          { hard: true, gloss: .40, ...MAT.metal });
    box(X0 + .098, Y + 1.50, -0.35, .045, .70, .05, col.alu, { hard: true, gloss: .40 });
    box(X0 + .082, Y + 1.50, -0.35, .008, .68, .88, col.glass,
        { hard: true, mode: 18, alpha: .14, gloss: .80, tag: '窗户' });
    // 防盗网 — the security grille every ground-and-kitchen window here has, even at this height
    for (let i = 0; i < 5; i++)
      box(X0 + .056, Y + 1.50, -0.74 + i * .195, .010, .70, .016, C('#8f9599'),
          { hard: true, gloss: .40 });
    pool(X0 + 1.10, FL + .014, -0.35, 1.80, 1.10, col.sun, .13, true);
  }

  // ---------------------------------------------------------------- 卫生间 · the door only
  //
  // Behind the spine at x < -0.85, z -5.00 .. -2.10, and it is not a room this floor opens: what a
  // closed bathroom door contributes to a flat is a strip of light under it and a frosted panel,
  // and building the room behind it would be six hundred props nobody will ever see.
  {
    // The spine is a 120 mm box, so its 客厅 face is at BED.x1 + .06. Everything here stands OUT
    // from that: architrave at +.135, leaf at +.105, glazing at +.140. Built at +.045 the leaf sat
    // inside the wall it is hung on.
    const DZ2 = -2.58, DW = .74;
    for (const s of [-1, 1])
      box(BED.x1 + .135, Y + 1.03, DZ2 + s * (DW / 2 + .04), .10, 2.06, .08, col.woodD,
          { hard: true, gloss: .24, mode: 6 });
    box(BED.x1 + .135, Y + 2.10, DZ2, .10, .08, DW + .16, col.woodD,
        { hard: true, gloss: .24, mode: 6 });
    box(BED.x1 + .105, Y + 1.01, DZ2, .05, 2.00, DW, C('#8a6a4a'),
        { hard: true, gloss: .24, tag: '门', mode: 6 });
    box(BED.x1 + .140, Y + 1.42, DZ2, .012, 1.02, DW - .20, C('#dfe4e2'),
        { hard: true, mode: 18, alpha: .74, gloss: .55, tag: '门' });
    cyl(BED.x1 + .150, Y + 1.02, DZ2 + DW / 2 - .10, .018, .09, col.brassD,
        { rx: PI / 2, gloss: .55 });
    // the strip of light under it, which is the entire point of building a door and no room
    pool(BED.x1 + .16, FL + .012, DZ2, .30, DW - .10, C('#ffe7bc'), .18);
  }

  // ===============================================================================================
  // THE WORDS INSIDE THE FLAT
  // ===============================================================================================
  TH('鞋柜', 5.10, Y + .70, ZS - .40, '进门先换鞋。', 'You change your shoes as soon as you come in.',
     '鞋 shoe + 柜 cabinet. It is by the door because that is the rule, not the decoration.',
     5.10, 2.40, 1.7);
  TH('拖鞋', 4.62, Y + .18, ZS - .48, '一家人一人一双拖鞋。', 'A pair of slippers each.',
     '拖 to drag + 鞋 shoe: a shoe you drag along, which is exactly what a slipper is.',
     4.62, 2.35, 1.6);
  TH('沙发', SFX, Y + .70, SFZ - .10, '沙发上套着沙发套。', 'The sofa has a fitted cover on it.',
     '沙发 is a loan of "sofa", written with characters chosen for their sound.',
     SFX, SFZ + .95, 1.8);
  TH('电视', 0.10, Y + 1.02, 1.10, '电视一直开着，没人看。', 'The television is on and nobody is watching.',
     '电 electric + 视 to look at. 看电视 is to watch it.', 0.10, 0.30, 1.8);
  TH('茶几', SFX, Y + .46, -1.52, '茶几上放着果盘和干果。',
     'There is a fruit bowl and a nut dish on the coffee table.',
     '茶 tea + 几 a small low table. The tea is what it is named for.', SFX, -1.00, 1.7);
  TH('水果', SFX - .28, Y + .52, -1.52, '果盘里的水果是给客人的。', 'The fruit in the bowl is for guests.',
     '水 water + 果 fruit. A 果盘 sits out whether or not anybody is coming.', SFX - .40, -1.00, 1.6);
  TH('挂钟', 3.05, Y + 1.95, HALL.z0 - .14, '墙上的挂钟慢了五分钟。', 'The wall clock is five minutes slow.',
     '挂 to hang + 钟 a clock. A 表 is the one on your wrist.', 3.05, 0.95, 1.8);
  TH('植物', 4.10, Y + .90, -2.55, '富贵竹养在水里，不用管。',
     'The lucky bamboo lives in water and needs nothing.',
     '富贵 wealth and rank + 竹 bamboo. It is not really bamboo, and everybody has one.',
     4.10, -1.90, 1.7);
  TH('桌子', 4.55, Y + .78, 0.15, '折叠桌平时只开一半。', 'The folding table is only half up most days.',
     '桌子 table. 折叠 is to fold — the other leaf goes up when somebody comes.', 4.55, -0.75, 1.8);
  TH('空调', X1 - .20, Y + 2.10, 0.60, '天热了就开空调。', 'When it gets hot you put the air conditioning on.',
     '空 air + 调 to regulate. The other half of it is out on the balcony.', 5.30, 0.60, 1.9);
  TH('阳台', 1.85, Y + 1.30, -3.30, '阳台是这家最忙的地方。', 'The balcony is the busiest part of this flat.',
     '阳 sun + 台 platform. Laundry lives here; a machine only washes it.', 1.85, -2.70, 1.9);
  TH('洗衣机', 5.15, Y + .86, -4.42, '洗衣机在阳台上。', 'The washing machine is out on the balcony.',
     '洗 wash + 衣 clothes + 机 machine.', 4.45, -3.72, 1.9);
  TH('晾衣架', 2.00, Y + 1.20, -4.00, '晾衣架上晒满了衣服。', 'The drying rack is full of washing.',
     '晾 to air-dry + 衣 clothes + 架 a frame. 晾衣服 is the verb you do to it.',
     2.00, -3.68, 2.0);
  TH('床', -3.85, Y + .60, 2.20, '床板很硬，睡着舒服。', 'The bed board is hard, which is how it should be.',
     '床 bed. A 硬板床 is a board bed, and it is preferred here, not endured.',
     -2.60, 2.00, 1.9);
  TH('凉席', -3.85, Y + .52, 2.10, '夏天床上要铺凉席。', 'In summer you put a bamboo mat on the bed.',
     '凉 cool + 席 a woven mat. It comes out in June and goes away in September.',
     -2.60, 1.62, 1.8);
  TH('枕头', -4.21, Y + .58, 2.89, '枕头是荞麦皮的。', 'The pillows are filled with buckwheat husk.',
     '枕 to pillow + 头 head.', -2.55, 2.62, 1.8);
  TH('衣柜', -1.19, Y + 1.20, 1.22, '衣柜顶上放着行李箱。', 'A suitcase lives on top of the wardrobe.',
     '衣 clothes + 柜 cabinet.', -2.05, 1.22, 1.8);
  TH('厨房', -3.40, Y + 1.10, -0.90, '厨房的门关着，因为炒菜有油烟。',
     'The kitchen door stays shut, because of the smoke off the wok.',
     '厨 kitchen + 房 room. It is a room with a door here, not part of the living room.',
     -2.30, -0.60, 2.2);
  TH('电饭煲', -5.70, Y + 1.10, 0.10, '电饭煲的灯亮着，饭快好了。',
     'The rice cooker light is on; the rice is nearly done.',
     '电 electric + 饭 cooked rice + 煲 a pot. Every flat in the block has one on at six.',
     -4.90, -0.12, 1.9);
  TH('冰箱', -1.22, Y + 1.10, -1.62, '冰箱上贴着一张便条。', 'There is a note stuck on the fridge.',
     '冰 ice + 箱 box.', -2.20, -1.60, 1.8);

  HomeF11.built = true;
  return HomeF11;
};

// ------------------------------------------------------------------------------------------------
// TWO THINGS FOR WHOEVER OWNS js/world.js AND js/game.js, kept here rather than in a report that
// will be lost. Neither is fixable from a floor file and both affect every floor above the second,
// not only this one.
//
// 1. `things` IS ONE FLAT LIST WITH NO DECK IN IT. `ZONE`, `SOL`, `SHA` and `GLO` are all keyed by
//    deck and refilled by `setFloor`; `things` is not. game.js:8085 picks what E and Q are aimed at
//    with `Math.hypot(th.focus[0] - P.x, th.focus[1] - P.z)` — x and z only, no y and no deck — so
//    a word on deck 2 competes with a word at the same (x, z) on deck 11 and often wins.
//
//    Measured, not deduced: standing at this floor's 水泵 (focus x -4.55, z 4.00) the E prompt
//    offers 消火栓, which is js/home-corridor.js's hydrant three metres below on deck 2 at
//    (-4.20, 4.10). Standing anywhere on this landing, the lobby's 手推车 label draws over the
//    corridor. With ten new floors stacked on the same footprint this gets ten times worse.
//
//    The fix is the same one the zones already have: bucket `things` per deck at build time (the
//    shell knows `curDeck` while each builder runs) and have `setFloor` refill a live list, exactly
//    as it does for `solids`. Everything in this file already puts its focus points as far from the
//    deck-2 band (z 3.95 .. 4.25) as the plan allows, which reduces the collisions and cannot
//    remove them.
//
// 2. `A.rug` CANNOT BE USED ABOVE THE LOBBY. `Build.scene`'s `rug` lays its bands at
//    `.005 + i * .0035` and its fringe at `.010` — absolute y, with no deck term — so a rug asked
//    for on deck 11 is built thirty-one metres under the floor, in the lobby, where it is also
//    invisible because the lobby's ceiling is in the way. `A.shade` takes a y and the toolkit
//    defaults it to the deck correctly; `rug` has no such parameter. Either give `rug` the same
//    treatment `A.shade` has, or take it off the documented toolkit list at the top of world.js.
//    The 客厅 rug in this file is laid by hand out of `flat` calls for exactly this reason.
// ------------------------------------------------------------------------------------------------
