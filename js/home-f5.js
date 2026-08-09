// F5 · 五楼 — 小王家, a young family with a small child.
//
// Deck 5 of the 高层 (TOWER.md): y = DECK[5] = 12.40, registered through `FlatFit['f5']`, which
// js/world.js maps to deck 5 in `DECK_OF`. Everything here is built at `A.y0 + h`. There is no
// per-room origin in this codebase, and a floor written in floor-relative y builds itself in the
// lobby — see the rescue note in world.js `build()`, which exists because that has happened.
//
// ---------------------------------------------------------------- what this file has to build
//
// More than js/home-corridor.js does, and the reason is worth stating rather than discovering.
// `buildShell` in js/world.js pours a slab, a ceiling, four walls and two lift shafts for
// `for (const f of [0, 2])` — decks 0 and 2 and nothing else. On deck 5 there is no floor, no
// ceiling, no wall and no shaft: a zone registered up here without them is a body standing on
// nothing, looking out of the back of the building. So this file is a SHELL AND a fit-out, and
// the shell half of it is written to disappear the day the Surgeon generalises `buildShafts` —
// see `shellLanding` in section 4, which detects that and stands down on its own.
//
// ---------------------------------------------------------------- the plan
//
//   landing   x -6.00 .. 6.00   z  3.20 .. 6.20    doors 501..506, the lift core face at z 4.90
//   the flat  x -6.00 .. 6.00   z -5.00 .. 3.20    behind 504, the only door that opens
//
//   客厅+玄关  x -2.10 .. 6.00   z -1.60 .. 3.20
//   儿童房     x -6.00 .. -2.10  z  0.20 .. 3.20
//   主卧       x -6.00 .. -2.10  z -5.00 .. 0.20
//   卫生间     x -2.10 ..  0.30  z -5.00 .. -1.60
//   阳台       x  0.30 ..  2.20  z -5.00 .. -1.60
//   厨房       x  2.20 ..  6.00  z -5.00 .. -1.60
//
// Every doorway below is at least 0.95 m and every collider is written down beside the thing it
// belongs to, because `clampMove` inflates all of them by the 0.30 m body radius: a 0.75 m door
// is a 0.15 m slot you thread sideways, and this project has already shipped one corridor that
// nobody could walk down. The clearances are worked through in the comments as they arise.
//
// ---------------------------------------------------------------- why it looks like this
//
// 老李家 two floors down is a retired couple, and F5 has to read as a different life from the
// doorway rather than from a label. What actually distinguishes a Beijing flat with a toddler:
//
//   · the grandparents' 折叠床 in the living room. Both parents work, 姥姥 moved in, and she
//     sleeps on a folding bed that is never folded. It is the most honest object on the floor and
//     it is deliberately the first thing you see through the open door of 504.
//   · the child does not sleep in the 儿童房. The child sleeps beside its parents behind a
//     床围栏, and the 儿童房 is a 学习桌, a toy box and a bed with the clean washing on it.
//   · a 晾衣架 permanently up indoors with a dozen tiny garments on it, because a rack on the
//     balcony in January dries nothing.
//   · the safety tax: 安全门 at the kitchen door, plug covers, foam on every corner of the 茶几.
//   · the pencil height marks with dates, the 百日照, the red 满月 poster.
//
// Nothing here carries a real brand: the 尿不湿 packet, the notices and the 小广告 are invented
// Chinese, which is the rule in this project.
const HomeF5 = { built: false, deck: 5 };

FlatFit['f5'] = A => {
  if (!A || typeof A.box !== 'function' || typeof A.zone !== 'function') {
    console.warn('home-f5: toolkit A missing box/zone — 五楼 not built');
    return HomeF5;
  }
  const box = A.box, cyl = A.cyl, ball = A.ball;
  const cap = A.cap || A.box, taper = A.taper || A.box;
  const wall = A.wall, flat = A.flat, ceiling = A.ceiling;
  const glyph = A.glyph || (() => []);
  const stop = A.stop || (() => null);
  const thing = A.th || (() => null);
  const light = A.light || (() => null);
  const shade = A.shade || (() => null);
  const PI = Math.PI;
  const P0 = (A.props || []).length;

  // ------------------------------------------------------------------ the contract, read not typed
  const CR = A.CORR || { x0: -6.0, x1: 6.0, z0: 3.2, z1: 6.2, h: 2.60 };
  const FT = A.FLAT || { x0: -6.0, x1: 6.0, z0: -5.0, z1: 3.2, h: 2.60 };
  const LF = A.LIFT || { x0: 1.6, x1: 3.4, z0: 4.9, z1: 6.2 };
  const LB = A.LIFT_B || { x0: -0.4, x1: 1.4, z0: 4.9, z1: 6.2 };
  const X0 = CR.x0, X1 = CR.x1;              // the building, west to east
  const ZS = FT.z0, ZM = FT.z1, ZN = CR.z1;  // back of the flat, the party wall, back of the landing
  const Y = A.y0;                            // deck 5 — never a literal
  const H = 2.60, CY = Y + H;
  const FL = Y + .006;                       // the slab is at Y + .004; things stand 2 mm over it
  const TRIM = .130;
  // 504's opening in the party wall — the same width and head the shell cuts on deck 2, so the
  // door reads as the same door type in the same building.
  const FX = 3.90, FW = 1.00, FTOP = 2.10;

  // ------------------------------------------------------------------ palette
  //
  // Two families of colour, and the split is the whole look of the floor. The landing is the
  // building's: cream over a green-grey dado, steel, six brown security doors. The flat is the
  // family's, and everything a child owns in it is saturated primary plastic. Nothing in between.
  // 391 — ART.md's upholstery row at FLAT_PALETTE's MEASURED .34 repeat (js/home-walls.js):
  // Fabric081C at .70 came out twice life size. Every soft good on this floor was flat colour.
  const CLOTH = { mat: 'fabric', matScale: .34, matAmt: .28, nrmAmt: .48 };
  const K = {
    wall: C('#d5cebc'), wallW: C('#e3dbc9'), dado: C('#9ea79b'), dadoT: C('#7d857a'),
    ceil: C('#efeade'), ceilW: C('#f3efe6'), stone: C('#8a8378'), lam: C('#9a7047'),
    trim: C('#6d5340'),
    steel: C('#b2b8bd'), steelD: C('#8a9197'), steelX: C('#6d747a'), alu: C('#c3c9cd'),
    glass: C('#cfdde4'),
    doorA: C('#6c3a2b'), doorB: C('#7d4634'), doorD: C('#452420'),
    brass: C('#b98c3e'), brassD: C('#8a6828'),
    red: C('#ae2b1f'), redD: C('#7c1d14'),
    gold: C('#e2b660'), ink: C('#2a211a'), grey: C('#7d848a'), pencil: C('#5d5a52'),
    green: C('#1e7a45'), greenL: C('#4ec489'),
    white: C('#f1eee5'), paper: C('#eee8d9'), card: C('#b39068'),
    warm: C('#f6efd8'), dead: C('#b9b6ad'),
    sky: C('#b6cee1'), skyLo: C('#d5e0e6'), tower: C('#95a9b9'), towerD: C('#7d93a5'),
    rubber: C('#3a3f42'), navy: C('#2c3f57'), denim: C('#4d6a8c'),
    // the child's half of the flat
    toyR: C('#df5040'), toyY: C('#f0c33c'), toyB: C('#3f8ed0'), toyG: C('#56b262'),
    toyO: C('#ef8b3c'), toyP: C('#cd76ac'), toyT: C('#4fbcc0'), toyW: C('#f2ede2'),
    foamA: C('#7fc0d6'), foamB: C('#f2d47e'), foamC: C('#93cf8c'), foamD: C('#efa4aa'),
    quilt: C('#c8506a'), quiltL: C('#e08a9a'), sheet: C('#e7e1d2'),
    sofa: C('#8a8f7c'), sofaD: C('#6d7263'), cush: C('#c9723f'),
    wood: C('#b9905f'), woodD: C('#a5804f'), woodL: C('#c8a878'),
    fridge: C('#dfe2e0'), tileW: C('#e5e6e0'), porc: C('#f5f3ee'),
  };
  const MP = { ...A.MAT.plaster }, MS = { ...A.MAT.slab };
  const MM = { ...A.MAT.metal }, MT = { ...A.MAT.tile };
  const G = (x, y, z, yaw, text, o) => glyph(x, y, z, yaw, text, { color: K.ink, ...o });
  // A word the player can walk up to. `focus` is a spot on the floor the body can genuinely stand
  // on — never inside the furniture the word belongs to and never inside a collider, or the word
  // reads "too far" from every angle in the room.
  const TH = (hz, x, y, z, zh, en, note, fx, fz, reach = 1.7, tag) =>
    thing(hz, x, y, z, zh, en, note, { focus: [fx, fz], reach, tag: tag || hz });

  // =================================================================== 0 · has the shell caught up?
  //
  // js/world.js builds its shafts and landings for decks 0 and 2 only. Until that loop runs over
  // every deck there is no lift core up here and the eye looks straight out of the back of the
  // building. So this file builds one — and tests first, so that the day the Surgeon generalises
  // `buildShafts` the geometry AND the colliders below stand down together, rather than sitting
  // 20 mm in front of a working lift with their doors welded shut.
  //
  // The test is unambiguous: is there anything, from any earlier builder, inside the working
  // shaft's footprint at this deck's height? Only a deck-5 landing can be. The car is built on
  // DECK[0] and rides by transform, so it never answers yes here.
  const shellLanding = !!(A.props || []).some(p => {
    const m = p && p.m;
    return m && m[13] > Y + .10 && m[13] < Y + H - .05
        && m[12] > LF.x0 - .60 && m[12] < LF.x1 + .60
        && m[14] > LF.z0 - .30 && m[14] < LF.z1 + .10;
  });

  // =================================================================== 1 · slab, lid and envelope
  flat(0, Y + .004, (FT.z0 + FT.z1) / 2, X1 - X0, FT.z1 - FT.z0, K.lam,
       { mode: 3, gloss: .26, mat: 'wood', matScale: 1.15, matAmt: .30, nrmAmt: .35 });
  flat(0, Y + .004, (CR.z0 + CR.z1) / 2, X1 - X0, CR.z1 - CR.z0, K.stone,
       { mode: 9, gloss: .32, ...MS });
  ceiling(0, CY, (FT.z0 + FT.z1) / 2, X1 - X0, FT.z1 - FT.z0, K.ceilW, { gloss: .07, glow: .02 });
  ceiling(0, CY, (CR.z0 + CR.z1) / 2, X1 - X0, CR.z1 - CR.z0, K.ceil, { gloss: .07, glow: .02 });

  // Every quad is single-sided and faces its yaw: 0 is +z, PI is -z, PI/2 is +x, -PI/2 is -x. Get
  // one backwards and you look through the building, so each is written with the room it faces
  // named beside it rather than with a sign worked out at the call site.
  wall(0, Y + H / 2, ZS, X1 - X0, H, 0, K.wallW, MP);                    // south, into the flat
  wall(X0, Y + H / 2, (ZS + ZM) / 2, ZM - ZS, H, PI / 2, K.wallW, MP);   // west, into the flat
  wall(X1, Y + H / 2, (ZS + ZM) / 2, ZM - ZS, H, -PI / 2, K.wallW, MP);  // east, into the flat
  wall(X0, Y + H / 2, (ZM + ZN) / 2, ZN - ZM, H, PI / 2, K.wall, MP);    // west, into the landing
  wall(X1, Y + H / 2, (ZM + ZN) / 2, ZN - ZM, H, -PI / 2, K.wall, MP);   // east, into the landing
  for (const [a, b] of [[X0, LB.x0], [LF.x1, X1]])                       // north, either side of
    wall((a + b) / 2, Y + H / 2, ZN, b - a, H, PI, K.wall, MP);          // the lift core

  // The party wall and 504's opening. The corridor face is the cool building cream and the flat
  // face the warm domestic one: the same plane, opposite yaws, which is what the shell does and
  // is not coplanar geometry — a back-facing quad is culled, so exactly one of the two is drawn.
  for (const [a, b] of [[X0, FX - FW / 2], [FX + FW / 2, X1]]) {
    wall((a + b) / 2, Y + H / 2, ZM, b - a, H, PI, K.wallW, MP);
    wall((a + b) / 2, Y + H / 2, ZM, b - a, H, 0, C('#cbbfa9'), MP);
  }
  wall(FX, Y + (FTOP + H) / 2, ZM, FW, H - FTOP, PI, K.wallW, MP);
  wall(FX, Y + (FTOP + H) / 2, ZM, FW, H - FTOP, 0, C('#cbbfa9'), MP);
  box(FX, Y + FTOP + .020, ZM, FW + .20, .05, .16, K.trim, { hard: true, gloss: .20, mode: 6 });

  const skirt = (axis, plane, a0, a1, sgn, c) => {
    const m = (a0 + a1) / 2, L = a1 - a0;
    if (L <= .002) return;
    if (axis === 'x') box(m, Y + .065, plane + sgn * .045, L, TRIM, .065, c,
                          { hard: true, gloss: .18, mode: 6 });
    else box(plane + sgn * .045, Y + .065, m, .065, TRIM, L, c, { hard: true, gloss: .18, mode: 6 });
  };
  skirt('x', ZS, X0, X1, 1, K.trim);
  skirt('z', X0, ZS, ZM, 1, K.trim); skirt('z', X1, ZS, ZM, -1, K.trim);
  for (const [a, b] of [[X0, FX - FW / 2], [FX + FW / 2, X1]]) {
    skirt('x', ZM, a, b, -1, K.trim);
    skirt('x', ZM, a, b, 1, C('#8b8272'));
  }
  skirt('z', X0, ZM, ZN, 1, C('#8b8272')); skirt('z', X1, ZM, ZN, -1, C('#8b8272'));
  for (const [a, b] of [[X0, LB.x0], [LF.x1, X1]]) skirt('x', ZN, a, b, -1, C('#8b8272'));

  // The envelope's colliders. ±.06 on the landing side of the party wall and no more: the walkway
  // in front of the lift core is 1.70 m and clampMove already spends 0.60 of it on the body.
  stop(X0, X1, ZS - .40, ZS + .10);
  stop(X0 - .40, X0 + .10, ZS, ZN);
  stop(X1 - .10, X1 + .40, ZS, ZN);
  stop(X0, X1, ZN - .10, ZN + .40);
  stop(X0, FX - FW / 2, ZM - .09, ZM + .06);
  stop(FX + FW / 2, X1, ZM - .09, ZM + .06);

  // =================================================================== 2 · interior partitions
  const DOORTOP = 2.05;
  function partition(axis, plane, a0, a1, gaps) {
    const segs = []; let c = a0;
    for (const [g0, g1] of gaps) { if (g0 > c + .002) segs.push([c, g0]); c = g1; }
    if (c < a1 - .002) segs.push([c, a1]);
    const face = (c0, c1, yc, hh) => {
      const m = (c0 + c1) / 2, L = c1 - c0;
      if (L <= .002 || hh <= .002) return;
      if (axis === 'x') {
        wall(m, yc, plane, L, hh, 0, K.wallW, MP); wall(m, yc, plane, L, hh, PI, K.wallW, MP);
      } else {
        wall(plane, yc, m, L, hh, PI / 2, K.wallW, MP); wall(plane, yc, m, L, hh, -PI / 2, K.wallW, MP);
      }
    };
    for (const [c0, c1] of segs) {
      face(c0, c1, Y + H / 2, H);
      if (axis === 'x') {
        skirt('x', plane, c0, c1, 1, K.trim); skirt('x', plane, c0, c1, -1, K.trim);
        stop(c0, c1, plane - .08, plane + .08);
      } else {
        skirt('z', plane, c0, c1, 1, K.trim); skirt('z', plane, c0, c1, -1, K.trim);
        stop(plane - .08, plane + .08, c0, c1);
      }
    }
    for (const [g0, g1] of gaps) {
      face(g0, g1, Y + (DOORTOP + H) / 2, H - DOORTOP);
      for (const s of [-1, 1]) {
        const c = s < 0 ? g0 : g1;
        if (axis === 'x') box(c + s * .035, Y + DOORTOP / 2, plane, .07, DOORTOP, .13, K.trim,
                              { hard: true, gloss: .20, mode: 6 });
        else box(plane, Y + DOORTOP / 2, c + s * .035, .13, DOORTOP, .07, K.trim,
                 { hard: true, gloss: .20, mode: 6 });
      }
      if (axis === 'x') box((g0 + g1) / 2, Y + DOORTOP + .035, plane, g1 - g0 + .14, .07, .13,
                            K.trim, { hard: true, gloss: .20, mode: 6 });
      else box(plane, Y + DOORTOP + .035, (g0 + g1) / 2, .13, .07, g1 - g0 + .14, K.trim,
               { hard: true, gloss: .20, mode: 6 });
    }
  }

  const KIDX = -2.10, KIDZ = 0.20, BATHX = 0.30, BALCX = 2.20, WETZ = -1.60;
  // The two doors off the living room sit in the SOUTH half of the west wall, which is what keeps
  // the whole north half of it free for the sofa without sealing either bedroom in.
  const D_BED = [-1.40, -0.45], D_KID = [0.30, 1.25];
  const D_BATH = [-1.78, -0.93], D_BALC = [0.35, 2.15], D_KIT = [3.45, 4.45];
  partition('z', KIDX, ZS, ZM, [D_BED, D_KID]);
  partition('x', WETZ, KIDX, X1, [D_BATH, D_BALC, D_KIT]);
  partition('x', KIDZ, X0, KIDX, []);
  partition('z', BATHX, ZS, WETZ, []);
  partition('z', BALCX, ZS, WETZ, []);

  // =================================================================== 3 · zones
  //
  // Rooms first, the whole floor plate last. `roomAt` returns the FIRST zone containing the body,
  // so the rooms decide which lamp lights you and how far the camera may pull back; `clampMove`
  // takes whichever candidate zone is nearest the target, so the plate underneath them is what
  // lets you walk from one room to the next. The partitions are colliders, not zone edges — a
  // zone-edged flat cannot be walked through a doorway at all.
  const zn = (id, x0, x1, z0, z1, lx, lz) =>
    A.zone({ id, x0, x1, z0, z1, light: [lx, Y + 2.28, lz] });
  zn('f5-kid', X0, KIDX, KIDZ, ZM, -4.05, 1.80);
  zn('f5-bed', X0, KIDX, ZS, KIDZ, -4.20, -2.40);
  zn('f5-bath', KIDX, BATHX, ZS, WETZ, -0.95, -3.30);
  zn('f5-balc', BATHX, BALCX, ZS, WETZ, 1.25, -3.30);
  zn('f5-kit', BALCX, X1, ZS, WETZ, 4.05, -3.20);
  zn('f5-living', KIDX, X1, WETZ, ZM, 2.20, 1.20);
  zn('f5-corr', X0, X1, ZM, ZN, 0.00, 4.05);
  zn('f5-gap', FX - FW / 2 - .10, FX + FW / 2 + .10, ZM - .70, ZM + .70, FX, ZM);
  zn('f5-flat', X0, X1, ZS, ZM, 2.20, 1.20);
  // The box R.setRoom measures ambient and ceiling occlusion against. Without this every deck
  // above the second is told its ceiling is at 5.70 — two metres below this floor's slab.
  if (A.deckH) A.deckH(Y + H);

  // =================================================================== 4 · the lift core
  //
  // Skipped entirely the day js/world.js builds a landing up here — see `shellLanding` above.
  const CFZ = LF.z0;
  if (!shellLanding) {
    const doors = [[(LB.x0 + LB.x1) / 2, .92, false], [(LF.x0 + LF.x1) / 2, .80, true]];
    // one continuous plaster face across both shafts with the two openings cut out of it
    const cuts = doors.map(([cx, w]) => [cx - w / 2, cx + w / 2]).sort((p, q) => p[0] - q[0]);
    let c = LB.x0; const runs = [];
    for (const [g0, g1] of cuts) { if (g0 > c) runs.push([c, g0]); c = g1; }
    if (c < LF.x1) runs.push([c, LF.x1]);
    for (const [a, b] of runs) wall((a + b) / 2, Y + H / 2, CFZ, b - a, H, PI, K.wall, MP);
    for (const [cx, w] of doors) wall(cx, Y + (2.10 + H) / 2, CFZ, w, H - 2.10, PI, K.wall, MP);
    // the flanks, so from either end of the landing the core reads as a block standing in the
    // room rather than as a wall with two holes in it
    wall(LB.x0, Y + H / 2, (CFZ + ZN) / 2, ZN - CFZ, H, -PI / 2, C('#c8c0ae'), MP);
    wall(LF.x1, Y + H / 2, (CFZ + ZN) / 2, ZN - CFZ, H, PI / 2, C('#c8c0ae'), MP);
    skirt('x', CFZ, LB.x0, LF.x1, -1, C('#8b8272'));
    for (const [cx, w, working] of doors) {
      const hw = w / 2;
      for (const s of [-1, 1])
        box(cx + s * (hw + .07), Y + 1.10, CFZ - .012, .14, 2.20, .05, K.steel,
            { hard: true, gloss: .58, ...MM });
      box(cx, Y + 2.175, CFZ - .012, w + .42, .14, .05, K.steel, { hard: true, gloss: .58, ...MM });
      // Gloss .34, not .58, on the leaves: a lift leaf is nearly a square metre of flat steel
      // facing straight at you, and at a high gloss both blow out to white paper.
      for (const s of [-1, 1]) {
        box(cx + s * w / 4, Y + 1.05, CFZ + .055, w / 2, 2.10, .045, C('#7e868c'),
            { hard: true, gloss: .34, ...MM });
        box(cx + s * w / 4, Y + 1.05, CFZ + .030, w / 2 - .05, 2.00, .012, C('#8d959b'),
            { hard: true, gloss: .34 });
      }
      box(cx, Y + 2.44, CFZ - .018, .52, .30, .06, C('#3d4348'), { hard: true, gloss: .34 });
      G(cx, Y + 2.44, CFZ - .052, PI, '五', { size: .17, color: C('#ff9a4d'), mode: 1, glow: .16 });
      if (!working) {
        box(cx, Y + 1.62, CFZ - .050, .46, .32, .020, K.paper, { hard: true, gloss: .05, ry: .03 });
        G(cx, Y + 1.71, CFZ - .062, PI, '此梯检修', { size: .052, gap: .010, color: K.redD });
        G(cx, Y + 1.61, CFZ - .062, PI, '请乘另一部', { size: .042, gap: .008, color: K.ink });
        G(cx, Y + 1.52, CFZ - .062, PI, '物业管理处', { size: .034, gap: .007, color: K.grey });
      }
    }
    // The call panel between the two sets of doors. Geometry only: the 电梯 word on a landing is
    // the shell's, and two of them 20 cm apart is one word with two answers.
    const px = (LB.x1 + LF.x0) / 2, pz = CFZ - .02;
    box(px, Y + 1.12, pz, .13, .22, .04, C('#d9d4c8'), { hard: true, gloss: .34 });
    for (const [dy, ch] of [[.045, '▲'], [-.045, '▼']]) {
      box(px, Y + 1.12 + dy, pz - .022, .055, .055, .012, C('#ffbe6a'),
          { hard: true, mode: 1, glow: .16 });
      G(px, Y + 1.12 + dy, pz - .036, PI, ch, { size: .038, color: C('#4a3316') });
    }
    stop(LB.x0 - .10, LF.x1 + .10, CFZ, ZN + .05);
  }

  // =================================================================== 5 · the landing, painted
  //
  // The dado is the one thing that stops a painted communal corridor reading as a white box, and
  // every landing in this block has it. Both pieces stand proud of the wall as boxes rather than
  // as a second quad in the wall plane, and both run in segments — a band drawn straight across a
  // doorway cuts the doorway in half.
  const DY0 = Y + TRIM, DH = 1.12 - TRIM, DYC = DY0 + DH / 2;
  function dado(axis, plane, sgn, runs) {
    const p1 = plane + sgn * .015, p2 = plane + sgn * .020;
    for (const [a0, a1] of runs) {
      const c = (a0 + a1) / 2, L = a1 - a0;
      if (L <= .002) continue;
      const put = (y, h, d, w, colr, g) => axis === 'x'
        ? box(c, y, d, L, h, w, colr, { hard: true, gloss: g })
        : box(d, y, c, w, h, L, colr, { hard: true, gloss: g });
      put(DYC, DH, p1, .03, K.dado, .18);
      put(DY0 + DH + .014, .028, p2, .04, K.dadoT, .22);
    }
  }
  const SZ = 4.30, SW = .95, STOP = 2.06;                 // the fire stair, WEST end on this floor
  const WZ = 4.60, WW = 1.40, WSILL = .95, WTOP = 2.15;   // and the window, east end
  dado('x', ZM, 1, [[X0, FX - FW / 2], [FX + FW / 2, X1]]);
  dado('x', ZN, -1, [[X0, LB.x0], [LF.x1, X1]]);
  if (!shellLanding) {
    dado('x', CFZ, -1, [[LB.x0, LF.x1]]);
    // and the core's two flanks. Walking the landing from either end you look straight at one of
    // them for four metres, and undadoed they are the one blank grey monolith on the floor.
    dado('z', LB.x0, -1, [[CFZ, ZN]]);
    dado('z', LF.x1, 1, [[CFZ, ZN]]);
    skirt('z', LB.x0, CFZ, ZN, -1, C('#8b8272'));
    skirt('z', LF.x1, CFZ, ZN, 1, C('#8b8272'));
  }
  dado('z', X0, 1, [[ZM, SZ - SW / 2], [SZ + SW / 2, ZN]]);
  dado('z', X1, -1, [[ZM, WZ - WW / 2], [WZ + WW / 2, ZN]]);

  // --- ceiling services. The sprinkler main hugs the party wall, the only line down the whole
  // twelve metres clear of the lift core. Four lengths, not one: a barrel scaled three hundred to
  // one shades like a mirror, not like a pipe.
  for (let i = 0; i < 4; i++)
    cyl(X0 + 1.5 + i * 3.0, CY - .17, ZM + .18, .036, 3.0, K.redD, { rz: PI / 2, gloss: .34, ...MM });
  for (let i = 0; i < 5; i++) {
    const qx = X0 + 1.3 + i * 2.4;
    cyl(qx, CY - .225, ZM + .18, .016, .07, K.brassD, { gloss: .5 });
    ball(qx, CY - .262, ZM + .18, .026, .020, .026, K.brass, { gloss: .55 });
  }
  box(0, CY - .045, ZM + .10, X1 - X0, .05, .07, K.white, { hard: true, gloss: .12 });
  // four surface bulkheads, one of them dead, which is the true state of every landing here
  for (const [lx, lz, alive] of [[-4.60, 4.30, true], [-1.60, 4.30, false],
                                 [1.50, 3.62, true], [4.90, 4.30, true]]) {
    box(lx, CY - .045, lz, .46, .07, .16, K.steelD, { hard: true, gloss: .30 });
    box(lx, CY - .095, lz, .40, .05, .12, alive ? K.warm : K.dead,
        { hard: true, mode: alive ? 1 : 0, glow: alive ? .12 : 0, gloss: .10 });
  }
  // One real light for the landing, not four. Only eight lights in the whole game reach the
  // shader at once and twelve decks are bidding for them — see the ticket at the foot of the file.
  light(-1.80, CY - .22, 4.30, C('#dfe9ef'), .50, 6.00);

  // --- 安全出口. Flat on the wall, never slung across the corridor: a sign hung in a walkway is
  // read edge-on from every position a body can stand in, and its arrow can then only point
  // across the landing, never along it. The stair is WEST on this floor, and a glyph reads
  // left-to-right in the READER's frame — so on the north wall, whose reader faces -z and whose
  // right hand therefore points at world -x, west is '→', and on the south wall it is '←'.
  // Backwards, this sends the player to the window in a fire.
  function exitSign(x, y, z, sgn, arrow) {
    const yaw = sgn > 0 ? 0 : PI, f = d => z + sgn * d;
    const w = arrow ? .46 : .38;
    box(x, y, f(.028), w, .155, .055, K.green, { hard: true, gloss: .26, tag: '安全出口' });
    box(x, y, f(.058), w - .035, .125, .006, K.greenL,
        { hard: true, mode: 1, glow: .14, tag: '安全出口' });
    G(x - (arrow ? .062 : 0), y, f(.058), yaw, '安全出口',
      { size: arrow ? .072 : .082, gap: .010, color: K.white, mode: 1, glow: .16 });
    if (arrow) G(x + .175, y, f(.058), yaw, sgn > 0 ? '←' : '→',
                 { size: .095, color: K.white, mode: 1, glow: .16 });
  }
  exitSign(-2.10, Y + 2.28, ZM, 1, true);
  exitSign(-3.60, Y + 2.28, ZN, -1, true);
  exitSign(5.05, Y + 2.28, ZM, 1, true);
  box(X0 + .035, Y + STOP + .19, SZ, .06, .155, .40, K.green,
      { hard: true, gloss: .26, tag: '安全出口' });
  box(X0 + .068, Y + STOP + .19, SZ, .006, .125, .365, K.greenL,
      { hard: true, mode: 1, glow: .14, tag: '安全出口' });
  G(X0 + .068, Y + STOP + .19, SZ, PI / 2, '安全出口',
    { size: .086, gap: .012, color: K.white, mode: 1, glow: .16 });

  // =================================================================== 6 · six front doors
  //
  // 防盗门, five of them somebody else's. The frame stands 90 mm off the wall and the leaf 60, so
  // the leaf reads as recessed in its architrave and nothing is coplanar with anything — a flush
  // door in this renderer flickers as horizontal stripes.
  //
  // Five on the north wall and only one on the south, because the whole of the z = 3.2 wall is
  // 小王家's flat and a neighbour's door in it would open into their living room.
  function frontDoor(cx, zw, sgn, num, o = {}) {
    const yaw = sgn > 0 ? 0 : PI;
    const W = o.w || 1.00, HT = o.top || 2.06, LW = W - .05, LH = HT - .04;
    const F = d => zw + sgn * d;
    const hinge = o.hinge === undefined ? -1 : o.hinge;
    const body = o.body || K.doorA, panel = o.panel || K.doorB;
    const jTop = o.headTo === undefined ? Y + HT + .07 : o.headTo;
    for (const s of [-1, 1])
      box(cx + s * (W / 2 + .035), (Y + jTop) / 2, F(.045), .07, jTop - Y, .09, K.doorD,
          { hard: true, gloss: .26, tag: o.tag });
    if (o.headTo === undefined)
      box(cx, Y + HT + .035, F(.045), W + .14, .07, .09, K.doorD,
          { hard: true, gloss: .26, tag: o.tag });
    if (!o.openLeaf) {
      // The leaf of a shut neighbour's door is tagged 门; the frame, plate and number keep o.tag.
      // `homeUseDef` (js/game.js:10961) routes 门 on any deck above the second to
      // `HOME_DOOR_USE.neighbour` — 敲门 — so a leaf without it is a front door the pick reads as
      // wall. `sgn < 0` is the north-wall run, which is exactly the doors that must stay shut; the
      // 504 door on the flat side comes through with sgn > 0 and keeps 门504. No collider changes.
      box(cx, Y + LH / 2, F(.030), LW, LH, .06, body,
          { hard: true, gloss: .24, ...(sgn < 0 ? { tag: '门' } : { tag: o.tag }) });
      for (const [py, ph] of [[LH * .70, LH * .40], [LH * .265, LH * .30]]) {
        box(cx, Y + py, F(.070), LW - .16, ph, .020, panel, { hard: true, gloss: .22, tag: o.tag });
        for (const s of [-1, 1])
          box(cx, Y + py + s * ph / 2, F(.082), LW - .16, .012, .012, K.doorD,
              { hard: true, gloss: .3, tag: o.tag });
      }
      const hx = cx - hinge * (LW / 2 - .13);
      box(hx, Y + 1.03, F(.075), .10, .24, .03, K.steelD, { hard: true, gloss: .46, tag: o.tag });
      cyl(hx, Y + 1.03, F(.115), .016, .07, K.steel, { rx: PI / 2, gloss: .5, tag: o.tag });
      box(hx - hinge * .085, Y + 1.03, F(.148), .19, .028, .028, K.steel,
          { hard: true, gloss: .5, tag: o.tag });
      cyl(cx, Y + 1.56, F(.078), .012, .030, K.brass, { rx: PI / 2, gloss: .6, tag: o.tag });
      for (const hy of [.36, 1.06, 1.76])
        cyl(cx + hinge * (LW / 2 - .012), Y + hy, F(.062), .014, .10, K.steelD,
            { gloss: .45, tag: o.tag });
      box(cx, Y + 1.84, F(.072), .30, .13, .024, K.steel, { hard: true, gloss: .40, tag: o.tag });
      G(cx, Y + 1.84, F(.086), yaw, num, { size: .073, gap: .012, color: K.ink, gloss: .2 });
    } else {
      // the number goes on the architrave, because the leaf has swung away from it
      box(cx + (o.plateAt || .60), Y + 1.84, F(.052), .30, .13, .024, K.steel,
          { hard: true, gloss: .40, tag: o.tag });
      G(cx + (o.plateAt || .60), Y + 1.84, F(.066), yaw, num,
        { size: .073, gap: .012, color: K.ink, gloss: .2 });
    }
    flat(cx, FL + .006, F(.32), .64, .40, o.mat || K.rubber, { mode: 7, gloss: .04 });
    shade(cx, F(.32), .72, .48, .26, FL + .010);
  }
  // 春联, gold on red, read top to bottom. A different pair from deck 2's: the same couplet on
  // every landing of a twelve-storey building is wallpaper.
  function couplets(cx, zw, sgn, up, down, across) {
    const yaw = sgn > 0 ? 0 : PI, F = d => zw + sgn * d;
    for (const [s, text] of [[-1, up], [1, down]]) {
      box(cx + s * .58, Y + 1.48, F(.020), .12, 1.02, .04, K.red,
          { hard: true, gloss: .10, tag: '春联' });
      G(cx + s * .58, Y + 1.48, F(.042), yaw, text,
        { size: .105, gap: .018, color: K.gold, vertical: true, gloss: .12 });
    }
    box(cx, Y + 2.28, F(.020), .62, .15, .04, K.red, { hard: true, gloss: .10, tag: '春联' });
    G(cx, Y + 2.28, F(.042), yaw, across, { size: .098, gap: .020, color: K.gold });
  }
  function fuDiamond(cx, y, zw, sgn, s = .21) {
    const yaw = sgn > 0 ? 0 : PI;
    box(cx, Y + y, zw + sgn * .095, s, s, .018, K.red,
        { hard: true, gloss: .10, ry: sgn > 0 ? PI / 4 : -PI / 4 });
    G(cx, Y + y, zw + sgn * .108, yaw, '福', { size: s * .60, color: K.gold, gloss: .14 });
  }

  const N1 = -5.15, N2 = -3.35, N3 = -1.55, N5 = 4.15, N6 = 5.42;
  frontDoor(N1, ZN, -1, '501', { tag: '邻居', hinge: 1, mat: C('#4a4f52') });
  couplets(N1, ZN, -1, '一帆风顺年年好', '万事如意步步高', '吉星高照');
  frontDoor(N2, ZN, -1, '502', { tag: '邻居', body: K.doorB, panel: K.doorA, mat: C('#7d3f37') });
  fuDiamond(N2, 1.34, ZN, -1);
  frontDoor(N3, ZN, -1, '503', { tag: '邻居', mat: K.rubber });
  frontDoor(N5, ZN, -1, '505', { tag: '邻居', hinge: 1, body: K.doorD, panel: K.doorA,
                                 mat: C('#3f4a3f') });
  frontDoor(N6, ZN, -1, '506', { tag: '邻居', mat: K.rubber });

  // --- 504, 小王家. The one door on this floor with a room behind it, and it stands open: which
  // is both what a flat with a grandmother in it and a toddler asleep is like on a summer
  // afternoon, and the only way the landing can show you what the floor is about.
  frontDoor(FX, ZM, 1, '504', { tag: '门504', w: FW, top: FTOP, headTo: Y + FTOP - .015,
                                mat: C('#6d3b34'), openLeaf: true, plateAt: .60 });
  couplets(FX, ZM, 1, '和顺一门有百福', '平安二字值千金', '家和万事兴');
  // the head of the opening — the leaf is shorter than the hole, so without this there is a slot
  // over the door you can see the 玄关 through from the landing
  box(FX, Y + FTOP - .020, ZM + .030, FW, .040, .06, K.doorD, { hard: true, gloss: .24 });
  box(FX, FL + .018, ZM + .07, FW + .05, .036, .19, C('#9b968b'),
      { hard: true, gloss: .40, ...A.MAT.cast });                       // 门槛石

  // The leaf, swung 98° into the 玄关 and drawn in its own frame — a rotated box turns about its
  // own centre, so every panel on it has to be placed in the rotated frame or it lands somewhere
  // in the middle of the room. `u` runs along the leaf from the hinge, `v` out of its face.
  (function openLeaf() {
    const a = 98 * PI / 180;
    const hx = FX - FW / 2 + .03, hz = ZM - .03;
    const LW = FW - .06, LH = FTOP - .06;
    const ca = Math.cos(a), sa = Math.sin(a);
    const P2 = (u, v) => [hx + u * ca + v * sa, hz - u * sa + v * ca];
    const put = (u, v, y, w, h, d, c, o = {}) => {
      const [x, z] = P2(u, v);
      return box(x, Y + y, z, w, h, d, c, { hard: true, ry: a, ...o });
    };
    put(LW / 2, 0, LH / 2, LW, LH, .055, K.doorA, { gloss: .24, tag: '门504' });
    for (const [py, ph] of [[LH * .70, LH * .40], [LH * .265, LH * .30]]) {
      put(LW / 2, -.038, py, LW - .16, ph, .020, K.doorB, { gloss: .22, tag: '门504' });
      for (const s of [-1, 1])
        put(LW / 2, -.050, py + s * ph / 2, LW - .16, .012, .012, K.doorD, { gloss: .3 });
    }
    put(LW - .14, -.045, 1.03, .10, .24, .03, K.steelD, { gloss: .46, tag: '门504' });
    put(LW - .14, .045, 1.03, .10, .24, .03, K.steelD, { gloss: .46 });
    const [gx, gz] = P2(LW - .14, -.10);
    cyl(gx, Y + 1.03, gz, .017, .17, K.steel, { rz: PI / 2, ry: a, gloss: .55 });
    put(LW / 2, .036, 1.56, .04, .04, .02, K.brass, { gloss: .6 });          // 猫眼
    for (let i = 0; i < 3; i++)                                              // the hooks inside
      put(.30 + i * .17, .052, 1.44, .022, .06, .022, K.steelD, { gloss: .5 });
    const [bx, bz] = P2(.47, .11);
    cap(bx, Y + 1.24, bz, .085, .30, .055, K.toyR, { ry: a, gloss: .14 });   // a child's rucksack
    // and the crayon drawing sellotaped to it at the height a four-year-old can reach
    put(.52, -.055, .86, .26, .34, .006, K.paper, { gloss: .04 });
    const [dx, dz] = P2(.52, -.066);
    cyl(dx, Y + .96, dz, .035, .008, K.toyY, { rz: PI / 2, ry: a, gloss: .05 });
    for (const [ox, oy, w2, c2] of [[-.06, .80, .10, K.toyB], [.00, .78, .09, K.toyR],
                                    [.06, .79, .08, K.toyG]]) {
      put(.52 + ox, -.066, oy, .014, w2, .006, c2, { gloss: .04 });
      put(.52 + ox, -.066, oy + w2 / 2 + .022, .038, .038, .006, c2, { gloss: .04 });
    }
    // The leaf stands in the 玄关, so it needs a collider — but it must stay clear of the walkable
    // slot through the doorway, which after the body radius is only x 3.70 .. 4.10. At 98° the
    // leaf is a thin sliver from (3.43, 3.17) to (3.30, 2.24); a collider drawn generously round
    // it inflates to x 3.92 and seals the front door, so it is drawn to the sliver and no wider.
    stop(FX - .66, FX - .42, ZM - 1.00, ZM - .04);
  })();

  // =================================================================== 7 · what the landing stores
  //
  // Everything hugs a wall. The strip in front of the lift core is z 3.56 .. 4.60 once clampMove
  // has taken the body radius off both ends, so nothing bulky may stand in x -0.4 .. 3.4; the two
  // ends of the landing have the full three metres of depth and take the e-bike and the pram.

  // --- 电动车 on charge, west end, with the flex running out of 501's door. The single most
  // Beijing thing in a stairwell, and the reason for the red notice fifteen metres away.
  (function ebike() {
    const ex = -4.55, ez = ZN - .58;
    for (const dx of [-.46, .46]) {
      cyl(ex + dx, FL + .215, ez, .215, .075, K.rubber, { rx: PI / 2, gloss: .18, tag: '电动车' });
      cyl(ex + dx, FL + .215, ez, .120, .080, C('#5a6064'), { rx: PI / 2, gloss: .34 });
      cyl(ex + dx, FL + .215, ez, .038, .095, K.steel, { rx: PI / 2, gloss: .5 });
    }
    box(ex, FL + .40, ez, 1.02, .26, .32, C('#28506e'), { gloss: .30, tag: '电动车' });
    box(ex - .12, FL + .58, ez, .58, .16, .30, C('#2f5d80'), { gloss: .30, tag: '电动车' });
    cap(ex + .26, FL + .70, ez, .17, .10, .30, C('#22262a'), { gloss: .16 });
    cyl(ex - .42, FL + .62, ez, .026, .58, K.steelD, { rz: .22, gloss: .42 });
    cyl(ex - .55, FL + .90, ez, .016, .52, K.steelD, { rx: PI / 2, gloss: .42 });
    box(ex - .57, FL + .78, ez, .22, .13, .16, C('#d8d3c2'), { gloss: .3 });
    box(ex - .60, FL + .96, ez, .17, .09, .11, C('#f2ecda'), { hard: true, mode: 1, glow: .05 });
    box(ex + .05, FL + .21, ez + .17, .30, .22, .13, C('#3a4046'), { gloss: .22 });
    for (let i = 0; i < 7; i++)
      cyl(ex - .18 - i * .34, FL + .06 + Math.sin(i * .9) * .04, ez + .28 + i * .03,
          .010, .34, C('#2b3033'), { rz: PI / 2, ry: .06, gloss: .3 });
    shade(ex, ez, 1.30, .44, .34, FL + .010);
    stop(ex - .62, ex + .62, ez - .30, ez + .30);
  })();

  // --- the pram, unfolded, parked by 505. A folded one lives on deck 2; on a floor with a
  // toddler on it the thing is in use and never folded.
  (function pram() {
    const px = 4.72, pz = ZN - .48;
    for (const [ox, r] of [[-.30, .072], [.32, .055]])
      for (const s of [-1, 1])
        cyl(px + ox, FL + r, pz + s * .13, r, .038, K.rubber, { rx: PI / 2, gloss: .2 });
    for (const s of [-1, 1]) {
      cyl(px - .02, FL + .30, pz + s * .13, .015, .62, K.steelD, { rz: -.55, gloss: .45 });
      cyl(px + .12, FL + .46, pz + s * .13, .015, .60, K.steelD, { rz: .40, gloss: .45 });
    }
    box(px - .02, FL + .50, pz, .46, .16, .34, K.navy, { gloss: .16, tag: '婴儿车' });
    box(px - .20, FL + .68, pz, .16, .34, .32, C('#35496a'), { gloss: .16, rz: -.30, tag: '婴儿车' });
    for (let i = 0; i < 4; i++)
      cyl(px - .10 + i * .055, FL + .74 + i * .015, pz, .17 - i * .012, .028, C('#3d5478'),
          { rx: PI / 2, gloss: .18 });
    cyl(px + .30, FL + .84, pz, .016, .40, K.steelD, { rx: PI / 2, gloss: .45 });
    ball(px + .26, FL + .60, pz - .22, .085, .10, .075, C('#dfe4e0'), { gloss: .22, alpha: .92 });
    box(px - .02, FL + .60, pz + .04, .26, .06, .22, K.toyY, { gloss: .12 });
    shade(px, pz, .90, .48, .32, FL + .010);
    stop(px - .52, px + .52, pz - .28, pz + .28);
  })();

  // --- shoes outside 502 and 503, adult and very small, and 拖鞋 that never come in.
  (function shoes() {
    const pair = (px, pz, c, sc = 1, ry2 = 0) => {
      for (const s of [-1, 1])
        cap(px + s * .07 * sc, FL + .045 * sc, pz, .095 * sc, .075 * sc, .255 * sc, c,
            { ry: ry2 + s * .04, gloss: .18, tag: '鞋' });
      box(px, FL + .012, pz, .26 * sc, .02, .24 * sc, c, { hard: true, gloss: .1 });
    };
    const rx = N3 - .05, rz = ZN - .17;
    for (const ry2 of [.16, .48]) {
      box(rx, FL + ry2, rz, .62, .022, .26, K.steelD, { hard: true, gloss: .4, tag: '鞋' });
      for (const s of [-1, 1]) cyl(rx + s * .28, FL + ry2 / 2, rz, .010, ry2, K.steelD, { gloss: .4 });
    }
    pair(rx - .10, rz + .01, C('#2c3238'));
    pair(rx + .20, rz + .01, C('#8d5b46'), .92, .10);
    pair(N2 + .40, ZN - .21, C('#a8442f'), .55, .18);
    pair(N2 + .62, ZN - .19, K.toyP, .48, -.12);
    for (const s of [-1, 1])
      cap(N3 + .52 + s * .06, FL + .035, ZN - .24, .075, .055, .19, C('#cfa0a8'),
          { ry: s * .07, gloss: .14, tag: '拖鞋' });
    shade(rx + .05, rz, 1.40, .40, .24, FL + .008);
    shade(N2 + .50, ZN - .20, .70, .30, .20, FL + .008);
    stop(rx - .36, rx + .36, ZN - .34, ZN);
  })();

  // --- the child's scooter, dropped rather than parked outside its own door, and a ball.
  (function scooter() {
    const sx = FX - 1.30, sz = ZM + .40;
    box(sx, FL + .085, sz, .52, .035, .12, K.toyG, { gloss: .26, tag: '玩具', ry: .22 });
    cyl(sx - .24, FL + .095, sz - .055, .058, .028, C('#e9e4d6'), { rx: PI / 2, gloss: .3 });
    cyl(sx + .24, FL + .095, sz + .055, .058, .028, C('#e9e4d6'), { rx: PI / 2, gloss: .3 });
    cyl(sx - .24, FL + .40, sz - .055, .016, .62, K.steel, { rz: .18, gloss: .5 });
    cyl(sx - .34, FL + .68, sz - .055, .014, .30, K.toyR, { rx: PI / 2, ry: .22, gloss: .3 });
    shade(sx, sz, .62, .28, .24, FL + .008);
    ball(FX + 1.00, FL + .085, ZM + .30, .085, .085, .085, K.toyB, { gloss: .30, tag: '球' });
    shade(FX + 1.00, ZM + .30, .24, .24, .22, FL + .008);
  })();

  // =================================================================== 8 · the landing's fixtures

  // --- 消火栓, east end, where the walkway is three metres deep and a body can stand back
  // far enough to read it.
  const HX = 4.90, HZ = ZM + .11;
  box(HX, Y + 1.14, HZ, .70, 1.00, .22, K.red, { hard: true, gloss: .30, tag: '消防栓' });
  box(HX, Y + 1.14, HZ + .112, .60, .90, .010, K.redD, { hard: true, gloss: .34, tag: '消防栓' });
  box(HX - .01, Y + 1.20, HZ + .118, .40, .58, .008, C('#3d4a4e'),
      { hard: true, gloss: .62, alpha: .55 });
  cyl(HX - .01, Y + 1.20, HZ + .06, .17, .12, C('#8c1f18'), { rx: PI / 2, gloss: .18 });
  cyl(HX - .01, Y + 1.20, HZ + .09, .07, .07, K.redD, { rx: PI / 2, gloss: .3 });
  G(HX, Y + 1.76, HZ + .114, 0, '消火栓', { size: .115, gap: .022, color: K.white });
  G(HX, Y + .70, HZ + .114, 0, '火警119', { size: .058, gap: .012, color: K.gold });
  cyl(HX + .50, FL + .27, ZM + .17, .075, .48, K.red, { gloss: .34 });
  taper(HX + .50, FL + .55, ZM + .17, .15, .10, .15, K.red, { gloss: .34 });
  cyl(HX + .50, FL + .63, ZM + .17, .020, .09, K.steelD, { gloss: .5 });
  shade(HX + .50, ZM + .17, .22, .22, .30, FL + .008);

  // --- 通知. Photocopied, taped up crooked, and the best readable Chinese on the floor. The
  // second is the notice every Beijing stairwell has had since the fires: no charging an e-bike
  // indoors. Which is why there is one on charge at the other end of the landing.
  const PX = 5.55, PZ = ZM + .012;
  box(PX, Y + 1.54, PZ, .34, .46, .024, K.paper, { hard: true, gloss: .05, ry: .02, tag: '通知' });
  G(PX, Y + 1.70, PZ + .016, 0, '通知', { size: .078, gap: .020, color: K.ink });
  box(PX, Y + 1.638, PZ + .016, .25, .006, .006, K.ink, { hard: true });
  G(PX, Y + 1.565, PZ + .016, 0, '五楼住户请注意', { size: .040, gap: .007, color: K.ink });
  G(PX, Y + 1.500, PZ + .016, 0, '下周三电梯检修', { size: .040, gap: .007, color: K.ink });
  G(PX, Y + 1.435, PZ + .016, 0, '停梯半天', { size: .040, gap: .007, color: K.ink });
  G(PX, Y + 1.360, PZ + .016, 0, '物业管理处', { size: .034, gap: .007, color: K.grey });
  for (const [sx2, sy2] of [[-.14, .21], [.14, .21], [-.14, -.21], [.14, -.21]])
    box(PX + sx2, Y + 1.54 + sy2, PZ + .018, .05, .022, .004, C('#d9d2bd'), { hard: true });
  box(PX - .46, Y + 1.50, PZ, .30, .30, .020, C('#f0dcd4'), { hard: true, gloss: .05, ry: -.04 });
  G(PX - .46, Y + 1.58, PZ + .014, 0, '严禁电动车', { size: .040, gap: .007, color: K.redD });
  G(PX - .46, Y + 1.52, PZ + .014, 0, '进楼入户充电', { size: .036, gap: .006, color: K.redD });
  G(PX - .46, Y + 1.44, PZ + .014, 0, '违者罚款', { size: .034, gap: .006, color: K.ink });

  // --- 电表箱, west end. Three meters, one per flat on this end of the run.
  const MX = -5.60, MZ = ZM + .06;
  box(MX, Y + 1.44, MZ, .46, .92, .12, K.steelD, { hard: true, gloss: .34, tag: '电表', ...MM });
  box(MX, Y + 1.44, MZ + .065, .40, .84, .012, K.steelX, { hard: true, gloss: .30 });
  ['0512', '0847', '1163'].forEach((r, i) => {
    const my = 1.72 - i * .28;
    box(MX - .06, Y + my, MZ + .073, .20, .13, .008, C('#1c2226'), { hard: true, gloss: .55 });
    G(MX - .06, Y + my, MZ + .083, 0, r,
      { size: .048, gap: .008, color: C('#cfe3d6'), mode: 1, glow: .10 });
    cyl(MX + .13, Y + my, MZ + .073, .010, .010, C('#d84a3a'), { rz: PI / 2, mode: 1, glow: .18 });
  });
  G(MX, Y + 1.96, MZ + .068, 0, '电表箱', { size: .062, gap: .012, color: K.white });
  box(MX, Y + 2.30, MZ + .010, .09, .60, .05, K.white, { hard: true, gloss: .12 });

  // --- 小广告, stamped in red ink at hand height, scrubbed at once and never gone. And, at
  // 46 cm off the floor beside 504, four crayon lines that are not 小广告 at all.
  G(-3.05, Y + 1.32, ZM + .022, 0, '开锁', { size: .062, gap: .010, color: C('#a8352a'), gloss: .05 });
  G(-3.05, Y + 1.24, ZM + .022, 0, '80261', { size: .040, gap: .006, color: C('#a8352a'), gloss: .05 });
  G(-1.30, Y + 1.28, ZM + .022, 0, '疏通下水道', { size: .050, gap: .008, color: C('#96463a'), gloss: .05 });
  G(0.70, Y + 1.34, ZM + .022, 0, '家政保姆', { size: .050, gap: .008, color: C('#9c4034'), gloss: .05 });
  G(-2.55, Y + 1.36, ZN - .022, PI, '搬家', { size: .058, gap: .010, color: C('#9c4034'), gloss: .05 });
  for (const [i, c2] of [[0, K.toyR], [1, K.toyB], [2, K.toyG], [3, K.toyY]])
    box(FX - 1.66 + i * .085, Y + .46 + (i % 2) * .05, ZM + .020, .014, .28, .006, c2,
        { hard: true, gloss: .04, rz: .10 - i * .06 });

  // =================================================================== 9 · the fire stair, west
  const sf = x => X0 + x;
  for (const s of [-1, 1])
    box(sf(.045), Y + (STOP + .07) / 2, SZ + s * (SW / 2 + .035), .09, STOP + .07, .07, K.steelD,
        { hard: true, gloss: .30, ...MM });
  box(sf(.045), Y + STOP + .035, SZ, .09, .07, SW + .14, K.steelD,
      { hard: true, gloss: .30, ...MM });
  box(sf(.030), Y + (STOP - .04) / 2, SZ, .06, STOP - .04, SW - .05, C('#9aa0a2'),
      { hard: true, gloss: .26, tag: '楼梯', ...MM });
  box(sf(.062), Y + 1.34, SZ, .012, .70, SW - .17, C('#8b9294'), { hard: true, gloss: .24 });
  box(sf(.075), Y + 1.02, SZ + .30, .05, .05, .40, K.steelX, { hard: true, gloss: .5 });
  cyl(sf(.098), Y + 1.02, SZ + .30, .020, .09, K.steel, { rx: PI / 2, gloss: .55 });
  box(sf(.070), Y + STOP - .18, SZ - .22, .06, .05, .30, K.steelX, { hard: true, gloss: .45 });
  G(sf(.066), Y + 1.72, SZ, PI / 2, '安全出口', { size: .085, gap: .016, color: K.green });
  G(sf(.066), Y + .62, SZ, PI / 2, '禁止堆放杂物', { size: .056, gap: .012, color: K.redD });
  G(sf(.066), Y + .50, SZ, PI / 2, '保持通道畅通', { size: .050, gap: .012, color: K.ink });

  // =================================================================== 10 · the landing window
  //
  // The east wall is solid and this file may not cut it, so the window is a shallow bay standing
  // in front of it: the view at the back of a reveal, the glazing in front of the view, and every
  // part of it at x < 6.00 — anything beyond is behind a one-sided wall and does not exist.
  const WX = X1 - .012;
  // 398 — the pane joins `skyGlass`, so World.setCity re-tints it with the clock instead of it
  // being a fixed blue. 397/400 — the opening registers itself: this gable is EAST, outward
  // normal +x, so the fifth-floor landing takes the morning and not deck 2's south wall.
  const skyPane = box(WX, Y + (WSILL + WTOP) / 2, WZ, .012, WTOP - WSILL + .10, WW + .10, K.sky,
      { hard: true, mode: 1, glow: .035 });
  if (A.sky) A.sky(skyPane);
  if (A.setWin) A.setWin(WX, Y + (WSILL + WTOP) / 2, WZ, WW / 2, (WTOP - WSILL) / 2, [1, 0, 0]);
  box(WX - .010, Y + WSILL + .16, WZ, .008, .30, WW + .08, K.skyLo,
      { hard: true, mode: 1, glow: .03 });
  for (const [tz, tw, th2, tc] of [[4.02, .30, .82, K.towerD], [4.34, .22, .58, K.tower],
                                   [4.66, .36, .96, K.towerD], [5.02, .24, .50, K.tower],
                                   [5.24, .18, .70, K.towerD]])
    box(WX - .020, Y + WSILL + th2 / 2, tz, .010, th2, tw, tc, { hard: true, mode: 1, glow: .02 });
  for (const [tz, ty] of [[4.02, .30], [4.02, .52], [4.66, .34], [4.66, .60], [5.24, .40]])
    box(WX - .030, Y + WSILL + ty, tz, .008, .045, .050, C('#f2dfa8'),
        { hard: true, mode: 1, glow: .07 });
  for (const [ry, rz, rh, rw] of [[WSILL - .05, WZ, .10, WW + .20], [WTOP + .05, WZ, .10, WW + .20],
                                  [(WSILL + WTOP) / 2, WZ - WW / 2 - .05, WTOP - WSILL, .10],
                                  [(WSILL + WTOP) / 2, WZ + WW / 2 + .05, WTOP - WSILL, .10]])
    box(X1 - .055, Y + ry, rz, .11, rh, rw, K.wall, { hard: true, gloss: .10, ...MP });
  const wf = (y, z, h, w) => box(X1 - .105, Y + y, z, .05, h, w, K.alu,
                                 { hard: true, gloss: .40, ...MM });
  wf(WSILL + .015, WZ, .06, WW + .06); wf(WTOP - .015, WZ, .06, WW + .06);
  wf((WSILL + WTOP) / 2, WZ - WW / 2 + .03, WTOP - WSILL, .06);
  wf((WSILL + WTOP) / 2, WZ + WW / 2 - .03, WTOP - WSILL, .06);
  wf((WSILL + WTOP) / 2, WZ, WTOP - WSILL, .05);
  box(X1 - .085, Y + (WSILL + WTOP) / 2, WZ, .010, WTOP - WSILL - .06, WW - .06, K.glass,
      { hard: true, mode: 18, alpha: .13, gloss: .78 });
  box(X1 - .17, Y + WSILL - .045, WZ, .24, .05, WW + .22, K.white, { hard: true, gloss: .28 });
  cyl(X1 - .19, Y + WSILL + .05, WZ - .44, .045, .11, C('#cfe0e2'), { gloss: .7, alpha: .5 });
  for (let i = 0; i < 4; i++)
    cap(X1 - .19, Y + WSILL + .18 + i * .03, WZ - .44 + (i - 1.5) * .020, .012, .16, .012,
        C('#4c7a44'), { rz: (i - 1.5) * .20, gloss: .10 });
  cyl(X1 - .18, Y + WSILL + .045, WZ + .38, .032, .10, C('#3f6f4a'), { gloss: .45 });

  // =================================================================== 11 · 小王家 · 客厅 + 玄关
  //
  // Read from the open door of 504: the shoe cabinet and the ride-on toy at your feet, the
  // grandmother's folding bed along the party wall, the foam play mat and the low plastic table
  // in the middle, the sofa and the photographs on the far wall. Everything a child owns is 40 cm
  // tall and saturated; everything the adults own is beige. That is the whole look of the floor.
  //
  // The circulation spine is z ≈ 0.80 running the width of the room, and it is kept clear on
  // purpose: it is the only route to the 儿童房 door (slot z 0.60 .. 0.95), the 主卧 door
  // (slot z -1.10 .. -0.75), the balcony screen (slot x 1.35 .. 1.85) and the kitchen
  // (slot x 3.75 .. 4.15). Every collider below is written with that in mind.

  // --- 玄关. Shoes come off at the door; a shoe cabinet here is the rule, not decoration.
  (function entry() {
    const cx = 5.72, cz = 2.50;                   // against the east wall, clear of the doorway
    box(cx, FL + .43, cz, .40, .86, 1.10, K.lam, { gloss: .22, mode: 6, tag: '鞋' });
    box(cx, FL + .875, cz, .44, .05, 1.16, C('#b08a5e'), { hard: true, gloss: .30, mode: 6 });
    for (let i = 0; i < 3; i++) {
      box(cx - .21, FL + .18 + i * .26, cz, .012, .21, 1.04, C('#8a6642'),
          { hard: true, gloss: .24, mode: 6 });
      cyl(cx - .222, FL + .285 + i * .26, cz, .014, .014, K.brass, { rz: PI / 2, gloss: .55 });
    }
    // the top of it, which is where the keys and the thermos and the parcel live
    box(cx, FL + .93, cz - .34, .13, .06, .16, C('#c9b48a'), { gloss: .16 });
    for (const [oz, c2] of [[-.02, K.steel], [.03, K.brass]])
      cyl(cx, FL + .965, cz - .34 + oz, .008, .04, c2, { gloss: .6 });
    cyl(cx, FL + 1.03, cz + .06, .048, .26, C('#b8452f'), { gloss: .34, tag: '热水壶' });
    cyl(cx, FL + 1.17, cz + .06, .028, .04, K.steel, { gloss: .5 });
    box(cx, FL + .99, cz + .40, .24, .18, .30, K.card, { gloss: .08 });
    box(cx, FL + 1.081, cz + .40, .20, .012, .26, C('#c49d72'), { hard: true, gloss: .06 });
    G(cx - .122, FL + .99, cz + .40, -PI / 2, '易碎', { size: .046, gap: .009, color: C('#8a6a45') });
    // shoes spilling out of it, big and very small
    for (const [pz, sc, c2, r2] of [[1.75, 1, C('#33383e'), .12], [2.05, .95, C('#7b5a44'), -.18],
                                    [2.35, .52, K.toyR, .30], [2.58, .48, K.toyB, -.24]])
      for (const s of [-1, 1])
        cap(cx - .48, FL + .045 * sc, pz + s * .07 * sc, .25 * sc, .072 * sc, .09 * sc, c2,
            { ry: r2 + s * .05, gloss: .18, tag: '鞋' });
    for (const s of [-1, 1])
      cap(cx - .48, FL + .035, 2.86 + s * .06, .19, .055, .075, C('#cfa0a8'),
          { ry: s * .08, gloss: .14, tag: '拖鞋' });
    shade(cx - .46, 2.30, .34, 1.40, .22, FL + .008);
    shade(cx, cz, .48, 1.24, .34, FL + .010);
    stop(5.50, 5.94, 1.93, 3.07);
    // coat hooks on the east wall over it, with a 书包 and a small coat
    box(X1 - .075, FL + 1.62, cz, .04, .09, 1.00, C('#8a6642'), { hard: true, gloss: .24, mode: 6 });
    for (let i = 0; i < 4; i++)
      cyl(X1 - .105, FL + 1.585, cz - .36 + i * .24, .010, .07, K.steel, { rz: PI / 2, gloss: .55 });
    box(X1 - .17, FL + 1.28, cz - .36, .16, .40, .30, K.toyO, { gloss: .16, tag: '玩具' });
    box(X1 - .25, FL + 1.20, cz - .36, .03, .16, .20, K.toyY, { hard: true, gloss: .18 });
    cap(X1 - .16, FL + 1.20, cz + .12, .10, .62, .16, C('#455f7c'), { gloss: .14 });
    cap(X1 - .15, FL + 1.30, cz + .60, .08, .42, .11, K.toyP, { gloss: .14 });
    // the ride-on 扭扭车 abandoned where you trip over it, out of the doorway's walkable slot
    const wx = 4.80, wz = 2.30;
    box(wx, FL + .16, wz, .46, .13, .30, K.toyR, { gloss: .30, ry: .5, tag: '玩具' });
    box(wx - .08, FL + .27, wz + .06, .22, .16, .22, K.toyY, { gloss: .30, ry: .5 });
    cyl(wx + .10, FL + .30, wz - .06, .075, .030, K.toyB, { rx: PI / 2, ry: .5, rz: .3, gloss: .34 });
    for (const [ox, oz] of [[-.16, -.11], [.16, -.11], [-.16, .11], [.16, .11]])
      cyl(wx + ox * .88 + oz * .48, FL + .055, wz - ox * .48 + oz * .88, .055, .038, C('#3c4247'),
          { rx: PI / 2, ry: .5, gloss: .3 });
    shade(wx, wz, .58, .52, .28, FL + .008);
    stop(4.50, 5.10, 2.04, 2.56);
  })();

  // --- 折叠床. The grandmother's bed, unfolded along the party wall, and the most honest object
  // on this floor: both parents work, 姥姥 moved in, and this is where she sleeps. Two mattress
  // halves with the hinge showing between them, the quilt folded at the head, and her things on a
  // stool beside it because there is no bedside table for a bed that is officially not there.
  (function foldingBed() {
    const bx = -0.13, bz = 2.85;                  // x -1.05 .. 0.80, z 2.52 .. 3.18
    for (const s of [-1, 1])
      box(bx + s * .46, FL + .38, bz, .90, .05, .62, C('#c9cdd1'), { hard: true, gloss: .30, ...MM });
    box(bx, FL + .38, bz, .06, .06, .64, K.steelX, { hard: true, gloss: .45 });
    for (const [ox, oz] of [[-.80, -.25], [.80, -.25], [-.80, .25], [.80, .25]]) {
      cyl(bx + ox, FL + .19, bz + oz, .016, .37, K.steelD, { rz: ox > 0 ? -.12 : .12, gloss: .45 });
      cyl(bx + ox, FL + .012, bz + oz, .024, .024, K.rubber, { gloss: .2 });
    }
    for (const s of [-1, 1])
      cyl(bx + s * .82, FL + .205, bz, .012, .52, K.steelD, { rx: PI / 2, gloss: .45 });
    box(bx, FL + .445, bz, 1.84, .09, .62, K.sheet, { gloss: .04, mode: 7, ...CLOTH, tag: '床' });
    box(bx, FL + .452, bz, 1.78, .012, .55, C('#dfd6c2'), { hard: true, gloss: .04, mode: 7 });
    for (let i = 0; i < 3; i++)
      box(bx - .58, FL + .51 + i * .055, bz + (i - 1) * .03, .56, .055, .56 - i * .04,
          i % 2 ? K.quiltL : K.quilt, { gloss: .04, mode: 7, tag: '被子' });
    cap(bx - .56, FL + .73, bz, .21, .42, .11, C('#e9e2d0'), { ry: PI / 2, gloss: .04, tag: '枕头' });
    for (const s of [-1, 1])
      cap(bx + .36 + s * .07, FL + .035, bz - .50, .075, .055, .20, C('#6f6a5c'),
          { ry: s * .02, gloss: .14, tag: '拖鞋' });
    shade(bx, bz, 2.06, .78, .34, FL + .010);
    stop(-1.08, 0.83, 2.52, 3.18);
    // the folding stool doing duty as a bedside table: a 保温杯, reading glasses, a folded fan
    const stx = 1.02, stz = 2.90;
    box(stx, FL + .40, stz, .30, .04, .28, C('#8a5f3c'), { gloss: .16, mode: 6 });
    for (const [ox, oz] of [[-.11, -.10], [.11, -.10], [-.11, .10], [.11, .10]])
      cyl(stx + ox, FL + .20, stz + oz, .014, .40, K.steelD, { gloss: .42 });
    cyl(stx - .04, FL + .53, stz, .038, .22, C('#5e7a6c'), { gloss: .5, tag: '热水壶' });
    cyl(stx - .04, FL + .645, stz, .030, .03, K.steelD, { gloss: .55 });
    box(stx + .09, FL + .428, stz + .05, .11, .012, .04, C('#3a3f44'), { hard: true, gloss: .4 });
    cyl(stx + .08, FL + .43, stz - .07, .012, .17, C('#a8703c'), { rz: PI / 2, ry: .7, gloss: .2 });
    shade(stx, stz, .36, .34, .26, FL + .010);
    stop(stx - .18, stx + .18, stz - .17, stz + .17);
    // the 尿不湿 bale leaning between the bed and the television — a soft bale, not a box
    const dx = 3.05, dz = 2.90;
    ball(dx, FL + .21, dz, .13, .21, .21, C('#e8f0f4'), { gloss: .22, rz: .16 });
    box(dx - .002, FL + .34, dz, .20, .16, .30, C('#eff5f8'), { gloss: .22, rz: .16 });
    G(dx - .126, FL + .30, dz, -PI / 2, '尿不湿', { size: .052, gap: .010, color: C('#3f7fae') });
    G(dx - .126, FL + .22, dz, -PI / 2, '大号 · 44片', { size: .030, gap: .006, color: C('#6a95b0') });
    shade(dx, dz, .34, .48, .26, FL + .010);
  })();

  // --- the play mat: interlocking foam tiles, the floor of every flat in China with a child
  // under five in it. Flat quads with a gap between them so the jigsaw edge reads. No collider —
  // a mat you cannot walk on is not a mat.
  const MATX = 2.30, MATZ = -0.35;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const c2 = [K.foamA, K.foamB, K.foamC, K.foamD][(i + j * 3) % 4];
    flat(MATX - .93 + i * .62, FL + .014, MATZ - .62 + j * .62, .605, .605, c2,
         { mode: 7, gloss: .06, tag: '地毯' });
    flat(MATX - .93 + i * .62, FL + .019, MATZ - .62 + j * .62, .50, .50, c2,
         { mode: 7, gloss: .05 });
  }

  // --- 积木 on the mat: a tower of five, and the rest where they fell. No colliders; an 85 mm
  // brick that pushes a body around is not a brick, it is a bollard.
  (function blocks() {
    const bx = 1.72, bz = 0.10;
    const cs = [K.toyR, K.toyY, K.toyB, K.toyG, K.toyO, K.toyP, K.toyT];
    for (let i = 0; i < 5; i++)
      box(bx + (i % 2 - .5) * .012, FL + .045 + i * .085, bz, .085, .085, .085, cs[i],
          { hard: true, gloss: .30, ry: i * .09, tag: '积木' });
    for (const [ox, oz, ci, r2] of [[.32, -.14, 2, .4], [.46, .10, 0, -.2], [.22, .26, 3, .9],
                                    [-.28, -.22, 1, .3], [.62, -.06, 5, .6], [-.44, .16, 4, -.5],
                                    [.10, -.34, 6, .15], [.54, .30, 1, -.8]])
      box(bx + ox, FL + .046, bz + oz, .085, .085, .085, cs[ci],
          { hard: true, gloss: .30, ry: r2, tag: '积木' });
    cyl(bx + .96, FL + .17, bz - .26, .17, .34, K.toyT,
        { rz: PI / 2, ry: .3, gloss: .28, tag: '玩具' });
    for (const [ox, oz, ci] of [[.66, -.42, 3], [.78, -.18, 0], [.54, -.28, 1]])
      box(bx + ox, FL + .046, bz + oz, .078, .078, .078, cs[ci], { hard: true, gloss: .30, ry: ox });
    shade(bx + .20, bz, 1.70, 1.10, .20, FL + .024);
  })();

  // --- the low plastic table and its two tiny stools. Half a metre tall, which next to the
  // adults' 茶几 is the whole story of the room.
  (function kidTable() {
    const tx = 2.55, tz = -0.65;
    box(tx, FL + .375, tz, .70, .04, .50, K.toyY, { gloss: .30, tag: '玩具' });
    for (const [ox, oz] of [[-.29, -.19], [.29, -.19], [-.29, .19], [.29, .19]])
      cyl(tx + ox, FL + .18, tz + oz, .022, .37, K.toyG, { gloss: .28 });
    box(tx - .12, FL + .404, tz - .04, .22, .022, .16, K.paper, { hard: true, gloss: .05, ry: .18 });
    for (const [ox, c2] of [[-.02, K.toyR], [.03, K.toyB], [.08, K.toyG]])
      cyl(tx + .20 + ox, FL + .404, tz + .10, .008, .085, c2, { rz: PI / 2, ry: .4, gloss: .3 });
    for (const [sx2, sz2, c2] of [[-.50, .06, K.toyB], [.48, -.10, K.toyR]]) {
      box(tx + sx2, FL + .225, tz + sz2, .26, .035, .24, c2, { gloss: .30, tag: '椅子' });
      for (const [ox, oz] of [[-.10, -.09], [.10, -.09], [-.10, .09], [.10, .09]])
        cyl(tx + sx2 + ox, FL + .105, tz + sz2 + oz, .017, .21, c2, { gloss: .28 });
      shade(tx + sx2, tz + sz2, .30, .28, .22, FL + .024);
    }
    shade(tx, tz, .82, .60, .24, FL + .024);
    stop(2.16, 2.94, -0.94, -0.36);
  })();

  // --- 沙发 on the west wall, between the two bedroom doors. It faces the television across the
  // room rather than square on, which is what a 4.8 m living room actually does.
  (function sofa() {
    const sx = -1.65, sz = 2.15;                 // x -2.08 .. -1.22, z 1.35 .. 2.95
    box(sx, FL + .21, sz, .86, .38, 1.60, K.sofa, { gloss: .06, mode: 7, ...CLOTH, tag: '沙发' });
    box(sx - .28, FL + .58, sz, .30, .60, 1.60, K.sofaD, { gloss: .06, mode: 7, ...CLOTH, tag: '沙发' });
    for (const s of [-1, 1])
      box(sx + .06, FL + .43, sz + s * .70, .74, .32, .20, K.sofaD, { gloss: .06, mode: 7 });
    for (const oz of [-.40, .40])
      box(sx + .10, FL + .445, sz + oz, .66, .13, .56, C('#9a9f8c'), { gloss: .05, mode: 7 });
    for (const [oz, c2] of [[-.52, K.cush], [.54, K.toyT]])
      box(sx + .06, FL + .60, sz + oz, .18, .34, .34, c2, { gloss: .05, mode: 7, rz: .3 });
    for (let i = 0; i < 3; i++)                   // the throw over the near arm, in three folds
      box(sx + .16 - i * .05, FL + .52 - i * .16, sz + .72 - i * .02, .58 - i * .04, .10, .26,
          C('#b9613f'), { gloss: .05, mode: 7, rz: -.10 - i * .05 });
    ball(sx + .64, FL + .12, sz - .74, .17, .12, .17, K.toyO, { gloss: .05, mode: 7 });
    shade(sx, sz, 1.16, 1.86, .34, FL + .010);
    stop(-2.08, -1.22, 1.33, 2.97);
  })();

  // --- 茶几, with foam on every corner. The guards are the point: four soft blobs where the
  // sharp bits are, which you only ever see in a flat with a toddler in it.
  (function tea() {
    const tx = -0.72, tz = 1.92;
    box(tx, FL + .375, tz, .62, .05, 1.05, C('#8a6642'), { gloss: .22, mode: 6, tag: '茶几' });
    box(tx, FL + .18, tz, .52, .04, .92, C('#7a5a3c'), { gloss: .20, mode: 6 });
    for (const [ox, oz] of [[-.25, -.44], [.25, -.44], [-.25, .44], [.25, .44]])
      box(tx + ox, FL + .19, tz + oz, .05, .35, .05, C('#6b4e34'),
          { hard: true, gloss: .22, mode: 6 });
    for (const [ox, oz] of [[-.30, -.52], [.30, -.52], [-.30, .52], [.30, .52]])
      ball(tx + ox, FL + .375, tz + oz, .055, .045, .055, C('#e3e6df'), { gloss: .12 });
    cyl(tx - .16, FL + .445, tz - .30, .038, .09, K.white, { gloss: .45 });
    cyl(tx - .16, FL + .445, tz - .30, .046, .012, C('#c9d6da'), { gloss: .5 });
    box(tx + .10, FL + .415, tz + .12, .19, .05, .12, C('#e7f0f2'), { gloss: .24 });
    box(tx + .10, FL + .441, tz + .12, .09, .004, .06, C('#9fc4d2'), { hard: true, gloss: .2 });
    cyl(tx + .14, FL + .425, tz + .40, .026, .12, K.toyP,
        { rz: PI / 2, ry: .5, gloss: .3, tag: '玩具' });
    ball(tx + .20, FL + .425, tz + .44, .045, .045, .045, K.toyY, { gloss: .3 });
    shade(tx, tz, .82, 1.24, .32, FL + .024);
    stop(-1.06, -0.38, 1.37, 2.47);
  })();

  // --- 电视 on a low unit on the party wall, clear of the door swing.
  (function telly() {
    const tx = 2.00, tz = ZM - .34;
    box(tx, FL + .23, tz, 1.60, .44, .38, C('#a48258'), { gloss: .22, mode: 6 });
    for (const ox of [-.40, .40]) {
      box(tx + ox, FL + .23, tz - .195, .74, .34, .012, C('#8a6642'),
          { hard: true, gloss: .24, mode: 6 });
      cyl(tx + ox, FL + .23, tz - .208, .05, .012, K.steel, { rx: PI / 2, gloss: .5 });
    }
    box(tx, FL + .82, tz + .06, 1.14, .66, .045, C('#1a1d20'),
        { hard: true, gloss: .40, tag: '电视' });
    box(tx, FL + .82, tz + .033, 1.06, .60, .010, C('#20313d'), { hard: true, mode: 1, glow: .045 });
    box(tx, FL + .49, tz + .04, .22, .04, .16, C('#2a2d30'), { hard: true, gloss: .35 });
    box(tx, FL + .475, tz + .04, .34, .022, .22, C('#2a2d30'), { hard: true, gloss: .35 });
    box(tx + .58, FL + .465, tz - .06, .05, .022, .17, C('#31363a'),
        { hard: true, gloss: .3, tag: '遥控器' });
    shade(tx, tz, 1.80, .48, .32, FL + .010);
    stop(1.16, 2.84, 2.64, 3.08);
    // a socket with a plug cover in it, low on the wall, which is the other half of the safety tax
    box(tx - 1.55, FL + .30, ZM - .015, .09, .09, .022, C('#eae5d8'), { hard: true, gloss: .3 });
    box(tx - 1.55, FL + .30, ZM - .030, .07, .07, .012, K.toyW, { hard: true, gloss: .35 });
  })();

  // --- 晾衣架, permanently up in the living room with a dozen very small garments on it. A rack
  // on the balcony in a Beijing January dries nothing, so it lives in here from October.
  (function airer() {
    const ax = 5.10, az = -1.10;
    for (const s of [-1, 1]) {
      cyl(ax + s * .34, FL + .48, az - .28, .016, .98, K.steelD, { rz: s * .17, gloss: .45 });
      cyl(ax + s * .34, FL + .48, az + .28, .016, .98, K.steelD, { rz: s * .17, gloss: .45 });
      cyl(ax + s * .34, FL + .012, az, .020, .56, K.steelD, { rx: PI / 2, gloss: .4 });
    }
    for (let i = 0; i < 6; i++)
      cyl(ax, FL + .96, az - .28 + i * .112, .010, .70, K.steel, { rz: PI / 2, gloss: .5 });
    const kit = [[K.toyY, .17, .20], [K.toyR, .15, .17], [C('#e8e2d2'), .13, .15],
                 [K.toyB, .18, .21], [K.toyG, .14, .16], [C('#f0d9dd'), .12, .14],
                 [K.denim, .17, .24], [K.toyO, .13, .15]];
    kit.forEach(([c2, w2, h2], i) => {
      const gx = ax - .30 + (i % 4) * .20, gz = az - .25 + ((i / 4) | 0) * .32;
      cyl(gx, FL + .945, gz, .010, .05, K.white, { rx: PI / 2, gloss: .3 });
      box(gx, FL + .94 - h2 / 2, gz, w2, h2, .016, c2,
          { gloss: .04, mode: 7, ry: (i % 3 - 1) * .10 });
      if (i % 3 !== 2)
        for (const s of [-1, 1])
          box(gx + s * (w2 / 2 + .022), FL + .93 - h2 * .18, gz, .050, h2 * .34, .014, c2,
              { gloss: .04, mode: 7, rz: s * .5 });
    });
    for (let i = 0; i < 3; i++)                   // three pairs of very small socks
      for (const s of [-1, 1])
        cap(ax - .18 + i * .18 + s * .028, FL + .885, az - .28, .022, .085, .018,
            [K.toyT, C('#f2e2b0'), K.toyP][i], { gloss: .04, mode: 7 });
    shade(ax, az, .80, .74, .26, FL + .010);
    stop(4.72, 5.48, -1.43, -0.77);
  })();

  // --- the glazed screen between the 客厅 and the 阳台, which is what a Chinese living room has
  // instead of a window: two aluminium leaves, one slid open. The closed half gets a collider and
  // the open half is a 0.50 m walkable slot at x 1.35 .. 1.85 once the body radius is taken off.
  (function balconyScreen() {
    const a0 = D_BALC[0], a1 = D_BALC[1], sill = .06, top = DOORTOP;
    box((a0 + a1) / 2, FL + sill / 2, WETZ, a1 - a0, sill, .16, C('#b6ada0'),
        { hard: true, gloss: .30, ...MS });
    for (const ox of [a0 + .03, 1.05, 1.35, a1 - .03])
      box(ox, Y + (sill + top) / 2, WETZ, .05, top - sill, .09, K.alu,
          { hard: true, gloss: .42, ...MM });
    for (const oy of [sill + .04, top - .04])
      box((a0 + a1) / 2, Y + oy, WETZ, a1 - a0, .07, .09, K.alu,
          { hard: true, gloss: .42, ...MM });
    // the closed leaf, and the open one parked behind it
    box((a0 + 1.05) / 2, Y + (sill + top) / 2, WETZ - .012, 1.05 - a0 - .07, top - sill - .10,
        .010, K.glass, { hard: true, mode: 18, alpha: .16, gloss: .80, tag: '窗户' });
    box((1.35 + a1) / 2 - .02, Y + (sill + top) / 2, WETZ + .034, a1 - 1.35 - .10,
        top - sill - .10, .010, K.glass, { hard: true, mode: 18, alpha: .16, gloss: .80 });
    box(1.05, Y + 1.05, WETZ - .026, .04, .30, .05, K.steelD, { hard: true, gloss: .5 });
    stop(a0, 1.05, WETZ - .06, WETZ + .06);
  })();

  // --- the wall over the sofa: the 百日照 and the red 满月 poster. Every flat with a baby in it
  // has this pair of pictures and no other flat has either. They hang on the west partition and
  // face +x into the living room — the wall plane is x = -2.10, so they stand 1 cm proud of it.
  (function photos() {
    const px2 = KIDX + .016, py = 1.62;
    box(px2, Y + py, 1.75, .028, .58, .46, C('#c8b087'),
        { hard: true, gloss: .30, mode: 6, tag: '照片' });
    box(px2 + .016, Y + py, 1.75, .010, .50, .38, C('#f3ece0'), { hard: true, gloss: .18 });
    box(px2 + .022, Y + py, 1.75, .008, .40, .29, C('#e6d3c6'), { hard: true, gloss: .14 });
    ball(px2 + .028, Y + py + .05, 1.75, .006, .075, .060, C('#f0dccb'), { gloss: .10 });
    ball(px2 + .028, Y + py - .06, 1.75, .006, .085, .100, C('#c2453a'), { gloss: .06 });
    G(px2 + .030, Y + py - .155, 1.75, PI / 2, '百日', { size: .038, gap: .010, color: C('#9a7d55') });
    box(px2, Y + py + .04, 2.45, .022, .52, .36, K.red, { hard: true, gloss: .10, tag: '照片' });
    G(px2 + .014, Y + py + .16, 2.45, PI / 2, '满月之喜', { size: .066, gap: .014, color: K.gold });
    G(px2 + .014, Y + py + .01, 2.45, PI / 2, '小王家千金', { size: .042, gap: .010, color: K.gold });
    G(px2 + .014, Y + py - .12, 2.45, PI / 2, '百天快乐',
      { size: .036, gap: .009, color: C('#efd79c') });
  })();

  // --- the height wall, on the 儿童房 doorframe, in pencil and dated. Never painted over.
  (function heights() {
    const hx2 = KIDX + .014;
    for (const [hy, lab] of [[.74, '两岁'], [.83, '两岁半'], [.91, '三岁'],
                             [.99, '三岁半'], [1.06, '四岁']]) {
      box(hx2, Y + hy, 0.12, .008, .010, .13, K.pencil, { hard: true, gloss: .02 });
      G(hx2 + .004, Y + hy + .035, 0.05, PI / 2, lab, { size: .030, gap: .006, color: K.pencil });
    }
    box(hx2, Y + .90, 0.13, .006, .38, .006, C('#8b877c'), { hard: true, gloss: .02 });
    G(hx2 + .004, Y + 1.20, 0.09, PI / 2, '身高', { size: .046, gap: .010, color: K.pencil });
  })();

  // --- crayon, low on the party wall beside the folding bed, at the height a four-year-old
  // reaches. This is the detail the whole floor is built around.
  for (let i = 0; i < 7; i++)
    box(-2.00 + i * .13, Y + .42 + Math.sin(i * 1.7) * .12, ZM - .014, .012, .34, .006,
        [K.toyR, K.toyB, K.toyG, K.toyY, K.toyP, K.toyO, K.toyT][i],
        { hard: true, gloss: .03, rz: (i % 3 - 1) * .22 });
  for (let i = 0; i < 3; i++)
    box(-1.98 - i * .10, Y + .62, ZM - .014, .22, .06, .006, [K.toyR, K.toyY, K.toyB][i],
        { hard: true, gloss: .03, rz: .5 });

  // --- the 空调 over the kitchen door, the ceiling rose, and the room's own lamp.
  box(4.10, Y + 2.16, WETZ + .10, .92, .28, .20, C('#eeeae0'), { gloss: .16, tag: '空调' });
  box(4.10, Y + 2.05, WETZ + .13, .84, .05, .16, C('#d9d5cb'), { hard: true, gloss: .2 });
  box(4.10, Y + 2.27, WETZ + .155, .30, .10, .03, C('#e6e2d8'), { hard: true, gloss: .3 });
  cyl(2.20, CY - .05, 1.20, .13, .05, C('#f2eee4'), { gloss: .1 });
  cyl(2.20, CY - .12, 1.20, .022, .16, K.white, { gloss: .2 });
  ball(2.20, CY - .27, 1.20, .13, .11, .13, C('#f6f0dc'),
       { mode: 1, glow: .05, gloss: .3, tag: '灯' });
  light(2.20, CY - .34, 1.20, C('#ffeccd'), .58, 5.60);

  // =================================================================== 12 · 儿童房
  //
  // Not a bedroom. The child sleeps beside its parents next door, so this is a 学习桌, a wall of
  // charts and a toy box — and a bed with the clean washing folded on it, which is exactly what
  // the second room of a flat like this is used for.
  (function kidRoom() {
    // --- 学习桌 against the west wall: the adjustable desk with its height crank showing, and
    // the chair on a gas lift.
    const dx = -5.66, dz = 2.15;
    box(dx, FL + .615, dz, .62, .05, 1.30, C('#c8a878'), { gloss: .22, mode: 6, tag: '书桌' });
    box(dx + .04, FL + .586, dz, .52, .03, 1.22, C('#a8814f'), { hard: true, gloss: .18, mode: 6 });
    for (const s of [-1, 1]) {
      box(dx, FL + .30, dz + s * .56, .07, .58, .07, C('#cfd3d6'), { hard: true, gloss: .40, ...MM });
      box(dx, FL + .30, dz + s * .56, .09, .30, .09, C('#b7bcc0'), { hard: true, gloss: .40, ...MM });
      box(dx, FL + .025, dz + s * .56, .52, .05, .12, C('#b7bcc0'), { hard: true, gloss: .35, ...MM });
    }
    cyl(dx + .26, FL + .46, dz + .60, .014, .16, K.steelD, { rx: PI / 2, gloss: .5 });
    cyl(dx + .26, FL + .46, dz + .68, .030, .05, K.toyB, { rx: PI / 2, gloss: .35 });
    const chx = dx + .70;
    box(chx, FL + .40, dz - .10, .38, .05, .36, K.toyB, { gloss: .10, mode: 7, tag: '椅子' });
    box(chx + .17, FL + .61, dz - .10, .06, .38, .34, K.toyB, { gloss: .10, mode: 7 });
    cyl(chx, FL + .22, dz - .10, .028, .34, K.steelX, { gloss: .45 });
    for (let i = 0; i < 5; i++) {
      const a2 = i * PI * .4;
      cyl(chx + Math.sin(a2) * .11, FL + .045, dz - .10 + Math.cos(a2) * .11, .016, .22,
          C('#3f4449'), { rz: PI / 2, ry: -a2, gloss: .3 });
      cyl(chx + Math.sin(a2) * .22, FL + .022, dz - .10 + Math.cos(a2) * .22, .022, .020,
          C('#2f3438'), { gloss: .2 });
    }
    shade(chx, dz - .10, .48, .48, .26, FL + .010);
    // what is on the desk: an open exercise book, a pot of pencils, a 台灯 and a 保温杯
    box(dx + .02, FL + .646, dz - .18, .22, .012, .30, C('#f1ece0'), { hard: true, gloss: .05, ry: .06 });
    box(dx + .02, FL + .649, dz - .18, .20, .006, .006, C('#b8b2a2'), { hard: true });
    for (let i = 0; i < 5; i++)
      box(dx + .06, FL + .652, dz - .25 + i * .032, .004, .004, .22, C('#8fa0b4'),
          { hard: true, ry: .06 });
    cyl(dx - .18, FL + .695, dz + .30, .048, .11, K.toyG, { gloss: .28 });
    for (let i = 0; i < 6; i++)
      cyl(dx - .18 + ((i / 3 | 0) - .5) * .030, FL + .80, dz + .30 + (i % 3 - 1) * .020, .006, .19,
          [K.toyR, K.toyY, K.toyB, K.toyO, K.toyP, K.toyT][i], { rz: (i % 3 - 1) * .12, gloss: .25 });
    cyl(dx + .12, FL + .655, dz + .52, .075, .025, C('#e7e2d4'), { gloss: .3 });
    cyl(dx + .12, FL + .82, dz + .52, .012, .34, C('#e7e2d4'), { gloss: .3 });
    taper(dx + .12, FL + .98, dz + .50, .10, .10, .10, C('#f2ecdc'), { rx: .5, gloss: .2, tag: '台灯' });
    ball(dx + .12, FL + .97, dz + .46, .035, .035, .035, C('#fff2cf'), { mode: 1, glow: .05 });
    light(dx + .30, FL + .95, dz + .46, C('#ffeac4'), .30, 2.20);
    cyl(dx - .16, FL + .715, dz - .52, .036, .15, K.toyP, { gloss: .45 });
    shade(dx, dz, .70, 1.44, .30, FL + .010);
    stop(-6.00, -5.32, 1.46, 2.84);

    // --- the wall of charts over the desk. 拼音 above it, 九九乘法表 and the star chart beside
    // it. This is what the wall of a Chinese six-year-old's room actually has on it.
    const wx2 = X0 + .014;
    box(wx2, Y + 1.62, dz, .020, .72, .96, C('#f4efe2'), { hard: true, gloss: .05, tag: '书' });
    G(wx2 + .012, Y + 1.90, dz, PI / 2, '汉语拼音字母表', { size: .052, gap: .012, color: K.redD });
    ['b p m f', 'd t n l', 'g k h', 'j q x', 'z c s', 'zh ch sh r'].forEach((r, i) =>
      G(wx2 + .012, Y + 1.79 - i * .095, dz, PI / 2, r, { size: .052, gap: .022, color: K.ink }));
    box(wx2, Y + 1.62, dz - 1.10, .020, .68, .74, C('#eef2f0'), { hard: true, gloss: .05 });
    G(wx2 + .012, Y + 1.86, dz - 1.10, PI / 2, '九九乘法表',
      { size: .050, gap: .012, color: C('#1f5c86') });
    ['二二得四', '三三得九', '四四十六', '五五二十五', '六六三十六'].forEach((r, i) =>
      G(wx2 + .012, Y + 1.74 - i * .095, dz - 1.10, PI / 2, r,
        { size: .044, gap: .010, color: K.ink }));
    box(wx2, Y + .98, dz - 1.10, .020, .48, .70, C('#fdf6e2'), { hard: true, gloss: .05 });
    G(wx2 + .012, Y + 1.15, dz - 1.10, PI / 2, '表现榜',
      { size: .048, gap: .012, color: C('#a8712c') });
    for (let i = 0; i < 12; i++) {
      box(wx2 + .012, Y + 1.025 - ((i / 6) | 0) * .11, dz - 1.38 + (i % 6) * .11, .004, .085, .085,
          C('#f1e6c8'), { hard: true, gloss: .04 });
      if (i < 11)
        G(wx2 + .016, Y + 1.02 - ((i / 6) | 0) * .11, dz - 1.38 + (i % 6) * .11, PI / 2, '★',
          { size: .060, color: K.gold, gloss: .18 });
    }

    // --- 书架 on the party wall, half the picture books in it and half on the floor
    const sx2 = -3.30, sz2 = 2.95;
    box(sx2, FL + .58, sz2, 1.00, 1.14, .28, K.wood, { gloss: .22, mode: 6, tag: '书架' });
    for (const oy of [.34, .70, 1.06])
      box(sx2, FL + oy, sz2 - .01, .94, .026, .26, C('#a07c50'),
          { hard: true, gloss: .24, mode: 6 });
    const bookC = [K.toyR, K.toyY, K.toyB, K.toyG, K.toyO, K.toyP, K.toyT, C('#e8e2d2')];
    for (const [oy, n] of [[.36, 9], [.72, 7]])
      for (let i = 0; i < n; i++)
        box(sx2 - .40 + i * .095, FL + oy + .10, sz2 - .02, .075, .21, .19, bookC[(i * 3) % 8],
            { hard: true, gloss: .16, rz: i === n - 1 ? .35 : 0, tag: '书' });
    for (let i = 0; i < 4; i++)
      box(sx2 - .18 + i * .10, FL + 1.16 + i * .022, sz2 + .02, .30, .022, .24, bookC[(i * 5) % 8],
          { hard: true, gloss: .16, ry: (i % 2 - .5) * .16, tag: '书' });
    for (let i = 0; i < 3; i++)
      box(sx2 - .12 - i * .06, FL + .014 + i * .026, sz2 - .42, .24, .024, .20, bookC[(i * 2) % 8],
          { hard: true, gloss: .16, ry: .3 - i * .4 });
    shade(sx2, sz2, 1.10, .38, .30, FL + .010);
    stop(-3.84, -2.76, 2.79, 3.11);

    // --- the bed nobody sleeps in, with the folded washing on it
    const bx2 = -4.60, bz2 = 0.70;
    box(bx2, FL + .18, bz2, 1.72, .30, .86, C('#c8a878'), { gloss: .22, mode: 6, tag: '床' });
    box(bx2, FL + .40, bz2, 1.62, .16, .78, K.sheet, { gloss: .04, mode: 7 });
    box(bx2 - .78, FL + .58, bz2, .06, .40, .78, C('#b08a5e'), { hard: true, gloss: .22, mode: 6 });
    for (let i = 0; i < 3; i++)
      box(bx2 + .18 + i * .20, FL + .53 + (i % 2) * .06, bz2 - .16, .17, .11, .30,
          [K.toyY, C('#e6e0cf'), K.toyT][i], { gloss: .04, mode: 7 });
    for (let i = 0; i < 3; i++)
      box(bx2 - .28 - i * .02, FL + .50 + i * .055, bz2 + .16, .34, .055, .30,
          [K.denim, C('#dfd7c4'), K.toyB][i], { gloss: .04, mode: 7 });
    ball(bx2 + .58, FL + .56, bz2 - .22, .13, .12, .13, K.toyP, { gloss: .06, mode: 7, tag: '娃娃' });
    ball(bx2 + .58, FL + .73, bz2 - .22, .085, .085, .085, C('#f0d8c4'), { gloss: .06, mode: 7 });
    for (const s of [-1, 1])
      ball(bx2 + .58, FL + .80, bz2 - .22 + s * .07, .035, .035, .030, K.toyP,
           { gloss: .06, mode: 7 });
    shade(bx2, bz2, 1.86, .96, .32, FL + .010);
    stop(-5.49, -3.71, 0.25, 1.15);

    // --- the toy box, overflowing, and a jigsaw half done on the floor
    const tx2 = -2.60, tz2 = 1.85;
    box(tx2, FL + .21, tz2, .58, .42, .78, K.toyO, { gloss: .26, tag: '玩具' });
    box(tx2, FL + .43, tz2, .62, .04, .82, C('#f5a75c'), { hard: true, gloss: .28 });
    ball(tx2 - .06, FL + .50, tz2 - .20, .10, .10, .10, K.toyB, { gloss: .30, tag: '球' });
    box(tx2 + .10, FL + .49, tz2 + .12, .16, .10, .22, K.toyG, { gloss: .28 });
    for (let i = 0; i < 4; i++)
      box(tx2 - .16 + (i % 2) * .16, FL + .48 + ((i / 2) | 0) * .07, tz2 + .28 + (i % 2) * .05,
          .10, .10, .10, [K.toyR, K.toyY, K.toyT, K.toyP][i], { hard: true, gloss: .30, ry: i });
    cyl(tx2 + .16, FL + .52, tz2 - .30, .034, .20, K.toyR, { rz: PI / 2, ry: .4, gloss: .3 });
    shade(tx2, tz2, .70, .90, .30, FL + .010);
    stop(-2.92, -2.28, 1.44, 2.26);
    for (let i = 0; i < 9; i++)
      box(-3.72 + (i % 3) * .13, FL + .012, tz2 - .26 + ((i / 3) | 0) * .13, .125, .014, .125,
          [K.toyT, K.toyY, K.toyG, K.toyB, K.toyO, K.toyR, K.toyP, K.toyT, K.toyY][i],
          { hard: true, gloss: .10, tag: '拼图' });
    for (const [ox, oz] of [[.30, .28], [.44, .36], [.22, .42]])
      box(-3.72 + ox, FL + .012, tz2 - .26 + oz, .125, .014, .125, K.toyG,
          { hard: true, gloss: .10, ry: ox * 4, tag: '拼图' });
    shade(-3.50, tz2, .80, .70, .16, FL + .022);

    TH('书桌', dx + .30, FL + .70, dz, '这是孩子的学习桌。', 'This is the child’s study desk.',
       '书桌 desk. A 学习桌 is the adjustable kind that grows with the child.', -4.95, 2.15, 1.8);
    TH('椅子', chx, FL + .62, dz - .10, '椅子可以调高矮。', 'The chair goes up and down.',
       '椅子 chair. 调 tiáo is to adjust.', -4.60, 1.90, 1.7);
    TH('书架', sx2, FL + .90, sz2 - .18, '书架上都是图画书。', 'The shelves are all picture books.',
       '书架 bookshelf: 书 book + 架 rack.', sx2, 2.35, 1.8);
    TH('拼图', -3.50, FL + .06, tz2, '地上有一个没拼完的拼图。',
       'There is an unfinished jigsaw on the floor.', '拼 to piece together + 图 picture.',
       -3.35, 1.20, 1.7);
    TH('娃娃', bx2 + .58, FL + .74, bz2 - .22, '床上放着一个娃娃。', 'A doll sits on the bed.',
       '娃娃 doll — and 娃 on its own is a baby.', -3.35, 0.75, 1.7);
    TH('台灯', dx + .12, FL + 1.00, dz + .50, '写作业的时候要开台灯。',
       'Turn the desk lamp on to do your homework.', '台 platform + 灯 lamp.', -4.95, 2.55, 1.8);
    TH('书', wx2 + .10, Y + 1.62, dz, '墙上贴着拼音表。', 'A pinyin chart is up on the wall.',
       '拼音 is how a character’s sound is written. Every child learns it before the characters.',
       -4.95, 2.15, 2.0, '书');
  })();

  // =================================================================== 13 · 主卧
  //
  // The double bed with a 床围栏 clipped to the open side and a very small pillow between the two
  // big ones: this is where the child actually sleeps, which is why the 儿童房 next door has the
  // laundry on its bed. Nothing else in the flat says as much about the household in as few props.
  (function bedroom() {
    const bx = -4.95, bz = -2.40;                 // head against the west wall
    box(bx, FL + .17, bz, 1.86, .30, 1.62, K.woodD, { gloss: .22, mode: 6, tag: '床' });
    box(bx, FL + .40, bz, 1.78, .18, 1.54, K.sheet, { gloss: .04, mode: 7 });
    box(bx - .96, FL + .70, bz, .07, .74, 1.62, K.wood, { hard: true, gloss: .22, mode: 6 });
    box(bx - .92, FL + .74, bz, .05, .52, 1.42, C('#8d6a45'), { hard: true, gloss: .20, mode: 6 });
    box(bx + .18, FL + .53, bz - .30, 1.44, .13, .92, K.quilt, { gloss: .04, mode: 7, tag: '被子' });
    for (let i = 0; i < 3; i++)
      box(bx + .58, FL + .50 + i * .06, bz + .46 - i * .10, .58, .06, .62,
          i % 2 ? K.quiltL : K.quilt, { gloss: .04, mode: 7, rz: .04, tag: '被子' });
    for (const oz of [-.44, .34])
      cap(bx - .74, FL + .56, bz + oz, .13, .52, .21, C('#e9e2d0'), { gloss: .04, tag: '枕头' });
    cap(bx - .60, FL + .54, bz - .04, .09, .30, .13, K.toyY, { gloss: .04, tag: '枕头' });
    // 床围栏 — the mesh guard rail clipped along the open side
    for (const s of [-1, 1]) cyl(bx + s * .62, FL + .70, bz + .80, .014, .58, K.steelD, { gloss: .45 });
    for (const oy of [.58, .97])
      cyl(bx, FL + oy, bz + .80, .014, 1.26, K.steelD, { rz: PI / 2, gloss: .45 });
    for (let i = 0; i < 11; i++)
      cyl(bx - .58 + i * .116, FL + .78, bz + .80, .004, .38, C('#cfd8dd'), { gloss: .3, alpha: .8 });
    box(bx, FL + .78, bz + .80, 1.24, .34, .010, C('#e2ecf0'),
        { hard: true, gloss: .25, alpha: .30 });
    box(bx, FL + 1.00, bz + .82, 1.26, .07, .04, K.toyB, { hard: true, gloss: .3 });
    shade(bx, bz, 2.16, 1.76, .34, FL + .010);
    stop(-5.88, -4.02, -3.21, -1.59);

    // bedside table with a night light and the baby monitor
    const nx = -5.60, nz = -1.30;
    box(nx, FL + .27, nz, .42, .54, .38, K.woodD, { gloss: .22, mode: 6 });
    box(nx + .20, FL + .34, nz, .012, .16, .34, C('#8d6a45'), { hard: true, gloss: .24, mode: 6 });
    cyl(nx + .212, FL + .34, nz, .014, .014, K.brass, { rz: PI / 2, gloss: .55 });
    cyl(nx, FL + .60, nz, .055, .12, C('#f2e6c8'), { mode: 1, glow: .05, gloss: .2, tag: '灯' });
    light(nx + .30, FL + .70, nz, C('#ffd9a0'), .24, 2.00);
    box(nx + .13, FL + .60, nz + .12, .05, .12, .07, C('#eae5da'), { gloss: .25 });
    box(nx + .105, FL + .655, nz + .12, .012, .012, .03, C('#7fd07f'),
        { hard: true, mode: 1, glow: .12 });
    shade(nx, nz, .48, .44, .28, FL + .010);
    stop(-5.81, -5.39, -1.49, -1.11);

    // 衣柜 on the south wall, its doors a little out of line the way they always are
    const wx2 = -3.20, wz2 = -4.70;
    box(wx2, FL + 1.02, wz2, 1.70, 2.02, .58, K.wood, { gloss: .22, mode: 6, tag: '衣柜' });
    for (const [ox, oy] of [[-.42, 0], [.42, .004]])
      box(wx2 + ox, FL + 1.02 + oy, wz2 + .30, .78, 1.92, .022, C('#a07c50'),
          { hard: true, gloss: .26, mode: 6, ry: ox > 0 ? .008 : 0 });
    for (const ox of [-.06, .06])
      cyl(wx2 + ox, FL + 1.02, wz2 + .32, .012, .22, K.brass, { gloss: .5 });
    box(wx2, FL + 2.10, wz2, 1.74, .14, .62, C('#cdb28a'), { gloss: .06, mode: 7 });
    for (let i = 0; i < 3; i++)
      box(wx2 - .40 + i * .34, FL + 2.24 + i * .07, wz2 + .04, .46, .07, .40,
          [C('#dfd7c4'), K.toyY, K.denim][i], { gloss: .04, mode: 7 });
    shade(wx2, wz2, 1.80, .68, .34, FL + .010);
    stop(-4.05, -2.35, -5.00, -4.41);

    // and the small rack of baby clothes in the corner that did not fit in the living room
    for (const s of [-1, 1])
      cyl(-5.30 + s * .26, FL + .42, -4.30, .012, .84, K.steelD, { rz: s * .16, gloss: .45 });
    cyl(-5.30, FL + .84, -4.30, .010, .52, K.steelD, { rz: PI / 2, gloss: .5 });
    for (let i = 0; i < 4; i++)
      box(-5.48 + i * .12, FL + .74, -4.30, .13, .17, .014, [K.toyR, K.toyT, K.toyY, K.toyP][i],
          { gloss: .04, mode: 7, ry: (i % 2 - .5) * .12 });
    shade(-5.30, -4.30, .58, .40, .22, FL + .010);
    stop(-5.60, -5.00, -4.55, -4.05);

    TH('床', bx + .40, FL + .55, bz, '孩子跟爸爸妈妈一起睡。', 'The child sleeps with its parents.',
       '床 bed. A 床围栏 is the guard rail that stops a small one rolling off.', -3.50, -2.40, 2.0);
    TH('被子', bx + .58, FL + .62, bz + .46, '被子还没叠好。', 'The quilt is not folded yet.',
       '被子 quilt. 叠被子 — folding it is the first thing you do in the morning.',
       -3.50, -2.00, 1.9);
    TH('衣柜', wx2, FL + 1.10, wz2 + .32, '衣柜里都是小孩的衣服。',
       'The wardrobe is full of children’s clothes.', '衣 clothing + 柜 cabinet.',
       -3.20, -4.00, 1.9);
  })();

  // =================================================================== 14 · 厨房
  //
  // Behind a door, as a Chinese kitchen is, because of the wok and the smoke — and behind a
  // 安全门 as well, swung open against the wall the way it is whenever anybody is cooking.
  (function kitchen() {
    // the baby gate: two pressure posts in the doorway, the panel swung back into the room
    for (const [i, gx] of D_KIT.entries()) {
      const ox = gx + (i ? -.05 : .05);
      cyl(ox, FL + .40, WETZ - .06, .020, .78, C('#e7e3d8'), { gloss: .30 });
      for (const oy of [.06, .74])
        cyl(ox, FL + oy, WETZ - .06, .028, .05, C('#c9c4b6'), { gloss: .28 });
    }
    const gA = 92 * PI / 180, ghx = D_KIT[0] + .08, ghz = WETZ - .10;
    const gc = Math.cos(gA), gs = Math.sin(gA);
    const GP = (u, v) => [ghx + u * gc + v * gs, ghz - u * gs + v * gc];
    const [gcx, gcz] = GP(.42, 0);
    box(gcx, FL + .40, gcz, .84, .72, .030, C('#eae6da'), { hard: true, ry: gA, gloss: .30 });
    for (let i = 0; i < 7; i++) {
      const [vx, vz] = GP(.08 + i * .11, 0);
      cyl(vx, FL + .40, vz, .011, .66, C('#f0ece2'), { ry: gA, gloss: .30 });
    }
    for (const oy of [.08, .72])
      box(gcx, FL + oy, gcz, .84, .05, .034, C('#dcd7c9'), { hard: true, ry: gA, gloss: .28 });
    const [lx3, lz3] = GP(.78, -.03);
    box(lx3, FL + .58, lz3, .07, .10, .05, K.toyB, { hard: true, ry: gA, gloss: .35 });
    shade(gcx, gcz, .30, .84, .20, FL + .008);

    // --- the run of units along the south wall
    const uz = ZS + .32;
    box(4.10, FL + .42, uz, 3.60, .82, .60, C('#e3ddd0'), { gloss: .22, tag: '厨房' });
    box(4.10, FL + .88, uz, 3.68, .05, .64, C('#8f8b80'), { hard: true, gloss: .46, ...MS });
    for (let i = 0; i < 5; i++) {
      box(2.55 + i * .78, FL + .42, uz - .30, .74, .76, .014, C('#d2ccbe'), { hard: true, gloss: .26 });
      box(2.55 + i * .78, FL + .70, uz - .316, .34, .022, .022, K.steel, { hard: true, gloss: .5 });
    }
    box(4.10, FL + 1.24, ZS + .015, 3.60, .62, .020, K.tileW, { hard: true, gloss: .40, ...MT });
    for (let i = 0; i < 12; i++)
      box(2.42 + i * .305, FL + 1.24, ZS + .028, .012, .62, .004, C('#cbccc4'),
          { hard: true, gloss: .3 });
    box(3.35, FL + .925, uz - .04, .68, .03, .44, C('#2b2f33'), { hard: true, gloss: .55 });
    for (const [ox, oz] of [[-.16, -.09], [.16, -.09], [-.16, .09], [.16, .09]]) {
      cyl(3.35 + ox, FL + .945, uz - .04 + oz, .075, .012, C('#3d4247'), { gloss: .5 });
      cyl(3.35 + ox, FL + .952, uz - .04 + oz, .028, .012, C('#1e2225'), { gloss: .4 });
    }
    taper(3.35, FL + 1.72, ZS + .28, .82, .26, .52, C('#c3c8cb'), { rx: PI, gloss: .5, ...MM });
    box(3.35, FL + 1.92, ZS + .22, .80, .22, .42, C('#c3c8cb'), { hard: true, gloss: .5, ...MM });
    box(3.35, FL + 1.60, ZS + .28, .74, .03, .46, C('#8a9095'), { hard: true, gloss: .5 });
    cyl(3.19, FL + .97, uz - .13, .155, .10, C('#3b4045'), { gloss: .40, tag: '锅' });
    cyl(3.19, FL + 1.025, uz - .13, .150, .015, C('#8b9095'), { gloss: .5 });
    cyl(3.19, FL + 1.05, uz - .13, .020, .05, C('#22262a'), { gloss: .4 });
    ball(3.62, FL + 1.42, ZS + .13, .21, .10, .21, C('#3b4045'), { gloss: .38, rx: 1.35, tag: '锅' });
    cyl(3.62, FL + 1.60, ZS + .16, .012, .26, C('#5a4433'), { rz: .3, gloss: .2, mode: 6 });
    box(5.05, FL + .90, uz - .02, .58, .05, .44, C('#b6bcc0'), { hard: true, gloss: .62, ...MM });
    box(5.05, FL + .855, uz - .02, .50, .10, .36, C('#9aa1a6'), { gloss: .60, tag: '水池' });
    cyl(5.05, FL + 1.06, uz - .22, .016, .28, C('#c3c9cd'), { gloss: .68 });
    cyl(5.05, FL + 1.18, uz - .15, .013, .16, C('#c3c9cd'), { rx: PI / 2, rz: .1, gloss: .68 });
    box(5.62, FL + .94, uz - .04, .32, .07, .30, C('#dfe3e0'), { hard: true, gloss: .35 });
    for (let i = 0; i < 6; i++)
      cyl(5.52 + (i % 3) * .10, FL + 1.04, uz - .14 + ((i / 3) | 0) * .16, .026, .13,
          C('#e8f1f4'), { gloss: .5, alpha: .82 });
    for (let i = 0; i < 3; i++)
      cyl(5.52 + i * .10, FL + 1.12, uz - .14, .020, .05, K.toyT, { gloss: .4 });
    cyl(2.62, FL + 1.01, uz + .04, .145, .21, C('#e6e2d8'), { gloss: .32 });
    cyl(2.62, FL + 1.13, uz + .04, .130, .04, C('#c9c4b6'), { gloss: .3 });
    box(2.62, FL + 1.08, uz - .11, .13, .06, .03, C('#3b4045'), { hard: true, mode: 1, glow: .06 });
    cyl(4.62, FL + 1.04, uz + .06, .125, .27, C('#f0ece2'), { gloss: .34 });
    cyl(4.62, FL + 1.19, uz + .06, .118, .04, K.toyT, { gloss: .3 });
    shade(4.10, uz, 3.70, .70, .32, FL + .010);
    stop(2.26, 5.94, ZS, -4.34);

    // --- 冰箱, covered in the child's drawings and a row of magnets
    const fx = 5.55, fz = -3.40;
    box(fx, FL + .87, fz, .74, 1.72, 1.42, K.fridge, { gloss: .28, tag: '冰箱' });
    box(fx - .375, FL + .87, fz, .020, 1.66, 1.36, C('#d6d9d7'), { hard: true, gloss: .34 });
    box(fx - .378, FL + 1.28, fz, .010, .012, 1.34, C('#b9bdbb'), { hard: true, gloss: .3 });
    for (const oy of [.55, 1.55])
      box(fx - .392, FL + oy, fz + .52, .022, .22, .05, C('#b3b8b6'), { hard: true, gloss: .4 });
    for (const [oy, oz, w2, h2, c2] of [[1.06, -.28, .22, .28, K.paper],
                                        [1.02, .06, .20, .25, C('#f2ecdc')],
                                        [.72, -.34, .18, .22, C('#eef2ec')]]) {
      box(fx - .390, FL + oy, fz + oz, .006, h2, w2, c2, { hard: true, gloss: .04, rx: oz * .3 });
      for (let i = 0; i < 3; i++)
        box(fx - .396, FL + oy - .04 + i * .05, fz + oz, .004, .012, w2 * .6,
            [K.toyR, K.toyB, K.toyG][i], { hard: true, gloss: .04 });
    }
    for (let i = 0; i < 5; i++)
      cyl(fx - .392, FL + 1.42 - (i % 2) * .10, fz - .50 + i * .11, .022, .008,
          [K.toyR, K.toyY, K.toyB, K.toyG, K.toyO][i], { rz: PI / 2, gloss: .3 });
    shade(fx, fz, .84, 1.52, .34, FL + .010);
    stop(5.15, 5.95, -4.16, -2.64);

    // --- the small table, two stools, and the 宝宝餐椅
    const tx = 2.90, tz = -3.20;
    box(tx, FL + .715, tz, .96, .05, .68, C('#c8a878'), { gloss: .22, mode: 6 });
    for (const [ox, oz] of [[-.40, -.26], [.40, -.26], [-.40, .26], [.40, .26]])
      box(tx + ox, FL + .35, tz + oz, .05, .70, .05, K.woodD, { hard: true, gloss: .22, mode: 6 });
    for (const [ox, oz] of [[.00, .62], [.62, -.06]]) {
      box(tx + ox, FL + .43, tz + oz, .34, .04, .32, K.wood, { gloss: .22, mode: 6, tag: '椅子' });
      for (const [px2, pz2] of [[-.13, -.12], [.13, -.12], [-.13, .12], [.13, .12]])
        cyl(tx + ox + px2, FL + .21, tz + oz + pz2, .018, .42, K.woodD, { gloss: .22, mode: 6 });
      box(tx + ox, FL + .70, tz + oz + .15, .32, .50, .05, K.wood,
          { hard: true, gloss: .22, mode: 6 });
      shade(tx + ox, tz + oz, .40, .38, .26, FL + .010);
    }
    shade(tx, tz, 1.10, .82, .32, FL + .010);
    stop(2.40, 3.40, -3.56, -2.84);
    // the high chair: tall legs, a tray, a footrest and a strap, set out of the doorway's run
    const hx4 = 4.90, hz4 = -2.30;
    for (const [ox, oz] of [[-.17, -.15], [.17, -.15], [-.15, .17], [.15, .17]])
      cyl(hx4 + ox, FL + .27, hz4 + oz, .020, .54, C('#e0dbcf'),
          { rz: ox * .5, rx: oz * -.5, gloss: .30 });
    box(hx4, FL + .55, hz4, .38, .06, .34, K.toyY, { gloss: .28, tag: '椅子' });
    box(hx4 + .17, FL + .80, hz4, .06, .44, .36, K.toyY, { gloss: .28 });
    box(hx4 - .22, FL + .66, hz4, .26, .05, .44, C('#f4efe2'), { hard: true, gloss: .34 });
    box(hx4 - .22, FL + .685, hz4, .18, .012, .36, C('#e6e0d0'), { hard: true, gloss: .26 });
    box(hx4 - .06, FL + .34, hz4, .16, .04, .30, C('#e0dbcf'), { hard: true, gloss: .28 });
    for (const s of [-1, 1])
      box(hx4 + .12, FL + .74, hz4 + s * .10, .03, .30, .04, K.toyO,
          { hard: true, gloss: .2, mode: 7 });
    cyl(hx4 - .20, FL + .705, hz4 + .10, .034, .05, K.toyT, { gloss: .3 });
    shade(hx4, hz4, .48, .48, .28, FL + .010);
    stop(4.64, 5.16, -2.56, -2.04);

    light(3.95, CY - .30, -2.90, C('#fff0d4'), .42, 4.20);
    cyl(3.95, CY - .10, -2.90, .16, .09, C('#f4efe2'), { gloss: .12 });

    TH('厨房', 4.10, FL + 1.10, WETZ - .30, '厨房门口装了个安全门。',
       'There is a safety gate across the kitchen door.',
       '厨房 kitchen. The gate is 安全门 — the one room a toddler may not walk into.',
       4.05, -2.30, 2.2);
    TH('冰箱', fx - .40, FL + 1.10, fz, '冰箱上贴满了画。', 'The fridge is covered in drawings.',
       '冰 ice + 箱 box.', 4.65, -3.40, 1.9);
    TH('锅', 3.19, FL + 1.02, uz - .13, '锅里在煮粥。', 'There is congee in the pot.',
       '锅 pot or wok — one word for both.', 3.50, -3.95, 1.9);
    TH('水池', 5.05, FL + .96, uz - .02, '水池边上都是奶瓶。',
       'The sink is surrounded by baby bottles.', '水 water + 池 basin.', 4.70, -3.95, 1.9);
  })();

  // =================================================================== 15 · 阳台 and 卫生间
  (function wetRooms() {
    // --- the balcony: the washing machine, a second rack, and the cartons of nappies
    const bx = 0.75;
    box(bx, FL + .42, ZS + .40, .62, .84, .62, C('#e8e6df'), { gloss: .30, tag: '洗衣粉' });
    box(bx, FL + .85, ZS + .40, .66, .05, .66, C('#d6d3c9'), { hard: true, gloss: .32 });
    cyl(bx, FL + .48, ZS + .10, .21, .05, C('#a8adb0'), { rx: PI / 2, gloss: .5 });
    cyl(bx, FL + .48, ZS + .08, .175, .04, C('#3f474c'), { rx: PI / 2, gloss: .6, alpha: .55 });
    box(bx, FL + .78, ZS + .095, .50, .10, .03, C('#f2f0e8'), { hard: true, gloss: .34 });
    for (let i = 0; i < 4; i++)
      cyl(bx - .18 + i * .12, FL + .78, ZS + .078, .014, .012,
          [K.toyB, K.toyG, K.toyR, K.toyY][i], { rz: PI / 2, mode: 1, glow: .05 });
    box(bx - .16, FL + .93, ZS + .40, .22, .12, .18, C('#e8f0f4'), { gloss: .2 });
    G(bx - .16, FL + .93, ZS + .312, PI, '洗衣粉', { size: .038, gap: .008, color: C('#3f7fae') });
    box(bx + .18, FL + .95, ZS + .40, .20, .16, .20, C('#f0ece0'), { gloss: .2 });
    shade(bx, ZS + .40, .74, .74, .32, FL + .010);
    stop(0.42, 1.08, ZS, ZS + .73);
    for (let i = 0; i < 3; i++) {
      box(1.90 - i * .02, FL + .18 + i * .34, ZS + .45, .38, .34, .48, K.card,
          { gloss: .08, ry: i * .05 });
      G(1.90 - i * .02, FL + .34 + i * .34, ZS + .21, PI, '尿不湿',
        { size: .048, gap: .010, color: C('#7d6242') });
    }
    shade(1.90, ZS + .45, .46, .56, .30, FL + .010);
    stop(1.68, 2.12, ZS + .18, ZS + .72);
    // the second rack, and the mop and bucket in the corner
    for (const s of [-1, 1])
      cyl(1.55 + s * .28, FL + .48, -3.10, .012, .96, K.steelD, { rz: s * .16, gloss: .45 });
    for (let i = 0; i < 4; i++)
      cyl(1.55, FL + .94, -3.28 + i * .12, .009, .58, K.steel, { rz: PI / 2, gloss: .5 });
    for (let i = 0; i < 5; i++)
      box(1.39 + (i % 3) * .16, FL + .80, -3.26 + ((i / 3) | 0) * .24, .15, .22, .014,
          [K.toyG, C('#e8e2d2'), K.toyB, K.toyP, K.toyY][i],
          { gloss: .04, mode: 7, ry: (i % 2 - .5) * .1 });
    shade(1.55, -3.10, .64, .70, .24, FL + .010);
    stop(1.20, 1.90, -3.45, -2.75);
    cyl(0.55, FL + .69, -2.30, .014, 1.34, C('#9a7c4e'), { rz: .10, gloss: .18 });
    cap(0.42, FL + .10, -2.30, .10, .16, .22, C('#d8d3c2'), { gloss: .06 });
    cyl(0.80, FL + .13, -2.34, .135, .26, C('#3f6f96'), { gloss: .28 });
    shade(0.62, -2.32, .58, .38, .28, FL + .010);
    // the balcony glazing, with the city and the neighbours' AC units through it
    const gz = ZS + .015;
    box(1.25, Y + 1.50, gz, 1.70, 1.70, .010, K.sky, { hard: true, mode: 1, glow: .045 });
    for (const [ox, tw, th2, tc] of [[-.62, .30, .78, K.towerD], [-.22, .22, .52, K.tower],
                                     [.22, .34, .92, K.towerD], [.60, .24, .46, K.tower]])
      box(1.25 + ox, Y + .82 + th2 / 2, gz + .010, tw, th2, .008, tc,
          { hard: true, mode: 1, glow: .02 });
    for (const ox of [-.28, .30, .58]) for (const oy of [1.10, 1.34])
      box(1.25 + ox, Y + oy, gz + .018, .05, .045, .006, C('#f2dfa8'),
          { hard: true, mode: 1, glow: .07 });
    for (const ox of [-.86, -.02, .82])
      box(1.25 + ox, Y + 1.50, gz + .026, .05, 1.70, .04, K.alu, { hard: true, gloss: .42, ...MM });
    for (const oy of [.66, 1.50, 2.34])
      box(1.25, Y + oy, gz + .026, 1.70, .05, .04, K.alu, { hard: true, gloss: .42, ...MM });
    box(1.25, Y + 1.50, gz + .034, 1.62, 1.62, .008, K.glass,
        { hard: true, mode: 18, alpha: .14, gloss: .80 });

    // --- 卫生间. Small, and with a plastic baby bath standing on its end against the wall,
    // which is what the bathroom of a flat with a toddler looks like.
    flat(-0.90, FL + .002, -3.30, 2.32, 3.32, K.tileW, { mode: 9, gloss: .40, ...MT });
    box(-0.90, FL + 1.10, ZS + .015, 2.28, 2.20, .016, C('#dfe2dd'), { hard: true, gloss: .38, ...MT });
    box(KIDX + .016, FL + 1.10, -3.30, .016, 2.20, 3.28, C('#dfe2dd'),
        { hard: true, gloss: .38, ...MT });
    box(-1.82, FL + .20, ZS + .40, .36, .40, .52, K.porc, { gloss: .42 });
    box(-1.82, FL + .43, ZS + .40, .38, .07, .50, C('#f8f6f0'), { hard: true, gloss: .5, tag: '马桶' });
    box(-1.82, FL + .48, ZS + .21, .34, .46, .16, K.porc, { gloss: .42 });
    box(-1.82, FL + .47, ZS + .46, .26, .05, .28, C('#e5e2da'), { hard: true, gloss: .45 });
    stop(-2.04, -1.60, ZS + .10, ZS + .70);
    cyl(-2.02, FL + .92, ZS + .90, .11, .03, K.toyT, { rz: PI / 2, gloss: .3 });   // the seat ring
    cyl(-2.02, FL + .92, ZS + .90, .06, .04, C('#dfe2dd'), { rz: PI / 2, gloss: .3 });
    box(-0.35, FL + .78, ZS + .22, .52, .16, .40, K.porc, { gloss: .45, tag: '洗手池' });
    box(-0.35, FL + .82, ZS + .22, .40, .06, .28, C('#e6e3da'), { hard: true, gloss: .5 });
    cyl(-0.35, FL + .93, ZS + .06, .014, .16, C('#c3c9cd'), { gloss: .68 });
    cyl(-0.35, FL + .99, ZS + .12, .011, .12, C('#c3c9cd'), { rx: PI / 2, rz: .1, gloss: .68 });
    box(-0.35, FL + 1.42, ZS + .022, .50, .60, .012, C('#cfdadd'),
        { hard: true, gloss: .72, tag: '镜子' });
    stop(-0.63, -0.07, ZS, ZS + .44);
    box(-0.37, FL + .12, ZS + .52, .28, .18, .22, K.toyO, { gloss: .28 });          // the step stool
    box(-0.37, FL + .215, ZS + .52, .30, .03, .24, K.toyY, { hard: true, gloss: .3 });
    ball(-1.95, FL + .34, -3.20, .13, .34, .28, K.toyT, { gloss: .30, rz: .12 });   // the baby bath
    ball(-1.93, FL + .34, -3.20, .10, .30, .24, C('#7fd6d8'), { gloss: .24, rz: .12 });
    stop(-2.10, -1.80, -3.45, -2.95);
    cyl(KIDX + .06, FL + 1.14, -2.60, .012, .44, C('#c3c9cd'), { rx: PI / 2, gloss: .6 });
    box(KIDX + .10, FL + .96, -2.72, .05, .34, .22, C('#e8e2d2'), { gloss: .04, mode: 7, tag: '毛巾' });
    box(KIDX + .09, FL + 1.00, -2.48, .04, .26, .16, K.toyP, { gloss: .04, mode: 7 });
    cyl(KIDX + .30, FL + 1.86, -4.30, .19, .74, C('#eeeae0'), { rz: PI / 2, gloss: .3 });
    box(KIDX + .30, FL + 1.66, -4.30, .16, .12, .10, C('#d8d4c8'), { hard: true, gloss: .3 });
    // the bathroom door, standing open flat against the inside wall. No collider: a leaf pressed
    // to the wall inside a 0.85 m opening cannot have one without sealing the room.
    box(-1.32, Y + 1.00, WETZ - .085, .78, 2.00, .045, C('#d8d2c2'),
        { hard: true, gloss: .26, mode: 6, ry: .06 });
    box(-1.32, Y + 1.24, WETZ - .112, .52, 1.10, .010, C('#dae4e2'),
        { hard: true, gloss: .55, alpha: .55, ry: .06 });
    cyl(-1.00, Y + 1.02, WETZ - .118, .014, .10, K.brass, { rx: PI / 2, gloss: .55 });

    TH('马桶', -1.82, FL + .50, ZS + .40, '卫生间很小。', 'The bathroom is small.',
       '马桶 toilet, in the 卫生间. The little ring on the wall goes on top of it.',
       -1.20, -4.10, 1.9);
    TH('洗衣粉', bx - .16, FL + .95, ZS + .40, '阳台上有洗衣机。',
       'The washing machine is on the balcony.',
       '洗衣粉 washing powder: 洗 wash + 衣 clothes + 粉 powder.', 0.72, -3.85, 1.8);
  })();

  // =================================================================== 15b · the rest of the lamps
  //
  // Five point sources over ten zones is a flat lit like a corridor: the 主卧, the 卫生间, the
  // 阳台 and the east end of the landing all hung off a lamp in another room, and the one room
  // this floor exists for — a small child's — went dark the moment the desk lamp was out of range.
  //
  // Each of the four below is a fitting AND a light. A `light()` with no lamp over it is a glow
  // with no cause, which reads worse at night than no light at all; and each radius is kept to the
  // room it is in, because a source that reaches through a partition lights the far side of a wall
  // this renderer draws single-sided.
  {
    // --- 主卧, a ceiling rose with a paper shade: the one the couple actually turn on.
    const MBX = -4.20, MBZ = -2.40;
    cyl(MBX, CY - .10, MBZ, .006, .20, C('#2b2b2b'), { gloss: .20 });
    taper(MBX, CY - .30, MBZ, .46, .26, .46, C('#f0ead8'), { mode: 1, glow: .07, gloss: .12 });
    ball(MBX, CY - .38, MBZ, .050, .050, .050, C('#fff2cf'), { mode: 1, glow: .10 });
    light(MBX, CY - .42, MBZ, C('#ffe8c2'), .46, 4.00);

    // --- 卫生间, a flush drum on the soffit, cold, and the only cold light in the flat.
    const BTX = -0.95, BTZ = -3.30;
    cyl(BTX, CY - .07, BTZ, .150, .10, C('#e4e2da'), { hard: true, gloss: .28 });
    cyl(BTX, CY - .125, BTZ, .130, .02, C('#f6f8fa'), { hard: true, mode: 1, glow: .10 });
    light(BTX, CY - .20, BTZ, C('#e8f0f4'), .34, 2.60);

    // --- 阳台, a bare lampholder on a hook, which is what a Beijing balcony has.
    const BCX = 1.25, BCZ = -3.30;
    cyl(BCX, CY - .12, BCZ, .005, .24, C('#2b2b2b'), { gloss: .20 });
    cyl(BCX, CY - .27, BCZ, .034, .07, C('#e7e2d4'), { gloss: .28 });
    ball(BCX, CY - .34, BCZ, .038, .048, .038, C('#fff0cc'), { mode: 1, glow: .09 });
    light(BCX, CY - .38, BCZ, C('#ffeccd'), .30, 2.80);

    // --- 小夜灯, plugged into the skirting by the child's bed. Warm, weak and 0.28 m off the
    // floor: the whole reason to come to this floor after dark, and it is not a room light — the
    // radius is 1.4 m so the rest of the room stays dark around it.
    const NLX = -5.05, NLZ = -0.42;
    box(NLX, FL + .26, NLZ, .09, .11, .06, C('#f2ecdc'), { hard: true, gloss: .24, tag: '小夜灯' });
    ball(NLX, FL + .26, NLZ - .034, .030, .034, .014, C('#ffd9a0'),
         { mode: 1, glow: .14, tag: '小夜灯' });
    light(NLX, FL + .30, NLZ - .12, C('#ffcf96'), .22, 1.40);

    // --- and the east end of the landing, which had one lamp for twelve metres of corridor.
    box(4.10, CY - .05, 4.30, .40, .07, .16, K.steelD || C('#7d848a'), { hard: true, gloss: .26 });
    box(4.10, CY - .10, 4.30, .34, .05, .12, C('#e6dcbc'), { hard: true, mode: 1, glow: .09 });
    light(4.10, CY - .20, 4.30, C('#dfe9ef'), .38, 4.40);
  }

  // =================================================================== 16 · the words
  //
  // Every headword below is already in js/vocab.js. `Vocab.get` has no fallback, so a thing whose
  // word is not in the dictionary is not a missing gloss — it is an uncaught TypeError the first
  // frame the player stands near it, which drops the whole game to the "did not load" overlay
  // (.thingcheck.js exists because of exactly that). The words this floor WANTS and does not have
  // are in the report as a ticket; until they land, nothing here may use them.
  //
  // Every focus is a spot the body can genuinely stand on, checked against the colliders above.
  TH('走廊', -2.90, Y + 1.60, ZM + .30, '五楼的走廊比二楼干净。',
     'The fifth-floor landing is cleaner than the second.',
     '走 walk + 廊 covered passage. A landing here is storage too.', -2.90, 4.60, 3.0);
  TH('邻居', N2, Y + 1.30, ZN - .10, '五楼住着好几家。', 'Several families live on the fifth floor.',
     '邻 neighbouring + 居 to dwell. 小王家 is at 504.', N2, ZN - .95, 2.0);
  TH('春联', N1 - .58, Y + 1.48, ZN - .06, '门上贴着春联。', 'Couplets are pasted up on the door.',
     '春 spring + 联 a matched pair of lines, put up at 春节.', -5.30, 4.85, 2.0);
  TH('电动车', -4.55, Y + .70, ZN - .70, '楼道里停着一辆电动车。',
     'An e-bike is parked in the stairwell.',
     '电动 electric + 车 vehicle. Charging one indoors is what the red notice forbids.',
     -4.55, ZN - 1.35, 2.1);
  TH('婴儿车', 4.72, Y + .60, ZN - .60, '门口放着一辆婴儿车。', 'A pushchair stands by the door.',
     '婴儿 infant + 车 vehicle.', 4.72, ZN - 1.25, 1.9);
  TH('通知', PX, Y + 1.55, PZ + .02, '墙上贴了一张通知。', 'A notice is stuck on the wall.',
     '通 to pass through + 知 to know: to inform.', PX, ZM + .80, 1.9);
  TH('消防栓', HX, Y + 1.40, HZ + .12, '墙上有一个消火栓。', 'There is a fire hydrant on the wall.',
     '消防栓 is what you call it; 消火栓 is what is painted on the cabinet. 栓 is a plug or a valve.', HX, ZM + .95, 2.0);
  TH('电表', MX, Y + 1.50, MZ + .08, '电表箱在楼梯旁边。', 'The meter box is beside the stairs.',
     '电 electricity + 表 gauge.', MX, ZM + .85, 1.9);
  TH('楼梯', X0 + .10, Y + 1.10, SZ, '楼梯在走廊的西头。',
     'The stairs are at the west end of the landing.', '楼 storey + 梯 ladder.', X0 + .95, SZ, 2.1);
  TH('安全出口', X0 + .10, Y + STOP + .19, SZ, '安全出口在那边。', 'The emergency exit is that way.',
     '安全 safe + 出口 exit. Green, and the same in every building in the country.',
     X0 + 1.00, SZ + .05, 2.3);
  TH('鞋', N3 - .05, Y + .25, ZN - .22, '大鞋小鞋都放在门口。',
     'Big shoes and little shoes, all left outside the door.',
     '鞋 shoe. They stay outside the door, never inside the flat.', N3 - .05, ZN - .95, 1.9);
  TH('窗户', X1 - .16, Y + 1.55, WZ, '走廊尽头有一扇窗户。',
     'There is a window at the end of the landing.',
     '窗 window + 户 door-leaf; together, the fitting.', X1 - .80, WZ, 2.0);
  // --- inside 小王家
  TH('玩具', 4.80, FL + .30, 2.30, '玄关里到处是玩具。', 'Toys everywhere in the entrance.',
     '玩 to play + 具 implement.', 4.10, 2.30, 1.9);
  TH('沙发', -1.65, FL + .70, 2.15, '沙发上堆着孩子的东西。',
     'The sofa is piled with the child’s things.', '沙发 is the sound of "sofa" in Chinese.',
     -0.60, 0.85, 2.2);
  TH('茶几', -0.72, FL + .45, 1.92, '茶几的角上包了防撞条。',
     'The corners of the tea table are padded.',
     '茶 tea + 几 a low table. 防撞 is "anti-bump" — you buy the foam by the metre.',
     0.10, 1.90, 1.8);
  TH('电视', 2.00, FL + .85, ZM - .30, '电视开着，没人看。',
     'The television is on and nobody is watching.', '电 electric + 视 to look at.',
     2.00, 2.20, 1.9);
  TH('地毯', MATX, FL + .06, MATZ, '地上铺着拼图地垫。', 'Foam jigsaw mats cover the floor.',
     '地毯 rug. These interlocking foam ones are 地垫 — every flat with a small child has them.',
     MATX, 0.60, 2.0);
  TH('积木', 1.72, FL + .28, 0.10, '孩子在搭积木。', 'The child is building with blocks.',
     '积 to pile up + 木 wood.', 1.60, 0.55, 1.8);
  TH('床', -0.13, FL + .55, 2.85, '姥姥晚上睡折叠床。',
     'Grandma sleeps on the folding bed at night.',
     '床 bed. A 折叠床 folds away — this one never does, because 姥姥 lives here now.',
     0.10, 2.10, 1.9);
  TH('照片', KIDX + .06, Y + 1.62, 1.75, '墙上挂着孩子的百日照。',
     'The child’s hundred-day portrait hangs on the wall.',
     '照片 photograph. 百日 is the hundredth day after a birth, and it gets a studio photo.',
     -0.78, 0.88, 2.1);
  TH('小孩', KIDX + .06, Y + .95, 0.12, '门框上记着小孩的身高。',
     'The child’s height is marked on the doorframe.',
     '小孩 child. 身高 is height — the pencil marks are dated.', -1.60, 0.35, 1.8);
  TH('衣服', 5.10, FL + .82, -1.10, '晾衣架上都是小孩的衣服。',
     'The drying rack is all the child’s clothes.',
     '衣服 clothes. 晾 liàng is to air something dry — 晾衣服.', 4.30, -0.80, 1.9);
  TH('空调', 4.10, Y + 2.16, WETZ + .12, '空调装在门上面。',
     'The air conditioner is above the door.', '空 air + 调 to regulate.', 4.10, -0.90, 2.2);
  TH('灯', 2.20, CY - .27, 1.20, '客厅的灯亮着。', 'The living-room light is on.',
     '灯 light or lamp. 开灯 on, 关灯 off.', 2.20, 1.20, 2.4);

  // A prop with no colour is not a missing colour, it is a crash: the instanced batcher reads
  // `p.color[0]` for every prop it draws (game.js:8209), so one undefined colour on this deck
  // takes the whole game down to the "did not load" overlay the moment the camera sees it — and
  // only on this deck, so nothing else in the suite catches it. Cheap to check here, once.
  {
    const ps = A.props || [];
    for (let i = P0; i < ps.length; i++)
      if (!ps[i].color) {
        const m = ps[i].m;
        console.warn('home-f5: prop ' + (i - P0) + ' (' + ps[i].mesh + (ps[i].ch ? ' "' + ps[i].ch
          + '"' : '') + ') has no colour, at ' + (m ? m[12].toFixed(2) + ',' + m[13].toFixed(2)
          + ',' + m[14].toFixed(2) : '?'));
        ps[i].color = K.red;
      }
  }

  HomeF5.built = true;
  return HomeF5;
};

// ---------------------------------------------------------------------------------------------
// FOUR THINGS FOR WHOEVER OWNS js/world.js AND js/game.js, kept here rather than in a report that
// will be lost. None of them is fixable from this file, and three of them are tower-wide.
//
// 1. `buildShell` AND `buildShafts` STILL ONLY RUN FOR DECKS 0 AND 2 (world.js `buildShell`, and
//    the two `for (const f of [0, 2])` loops in `buildShafts`). Every deck above the second
//    therefore has no slab, no ceiling, no perimeter wall and no lift landing until its own
//    builder pours one — which is what sections 1 and 4 of this file do, and what nine floor
//    files are now each doing a slightly different way. Section 4 detects a shell landing and
//    stands down; the shell should take the landing, and ideally the slab, ceiling and perimeter
//    walls too, for `for (let f = 2; f <= FLOORS; f++)`.
//
// 2. `goFloor(n)` is still `const to = n === 0 ? 0 : 2`, and `rideFloor` is likewise two-stop, so
//    the lift cannot be sent to deck 5 at all. This floor is reachable only through
//    `World.setFloor(5)` from the console. That is Wave 3's job, but until it lands no player can
//    see any of this.
//
// 3. THINGS AND LIGHTS ARE NOT PER-DECK, AND A TWELVE-STOREY BUILDING IN ONE FOOTPRINT MAKES THAT
//    A BUG RATHER THAN AN INEFFICIENCY. Measured on deck 5, standing at (1.2, 4.1): the things
//    within reach include 电梯 at world y 1.52, 按钮 at 1.21, 扶手 at 0.92, 镜子 at 1.49 and
//    走廊 at 4.70 — the lift car's fit-out and the deck-2 corridor, nine to twelve metres below.
//    - game.js picks the nearest thing by `Math.hypot(th.focus[0] - P.x, th.focus[1] - P.z)` over
//      `scene.things`, which is World's single global list. It wants a y test —
//      `Math.abs(th.pos[1] - (P.lift || 0)) < 1.6` — or a per-deck things list, the way
//      ZONE/SOL/SHA/GLO already are.
//    - game.js ranks `scene.lights` by (x, z) distance only and takes the nearest eight. y is
//      ignored, so a lamp three metres above your head outranks one across the room, and with
//      ten floors bidding this cannot resolve correctly for anybody. This file declares only four
//      lights so as not to make it worse. Same fix.
//
// 4. THE CUTAWAY REVEALS THE FLOOR ABOVE. When the camera backs out through a wall, `hiddenProp`
//    fades the props between the eye and the room — correct on a two-deck building, and on a
//    twelve-deck one it opens a hole into deck 6, whose furniture is then drawn washed-out across
//    the top half of the frame. It is in every shot of this floor and will be in every shot of
//    every floor. The fix is the same as (3): props not on the current deck should never be
//    submitted.
//
// VOCAB. Every headword this floor labels is already in js/vocab.js — checked against RAW,
// because `Vocab.get` has no fallback and a missing row is not a missing gloss but an uncaught
// TypeError that drops the game to the "did not load" overlay (see .thingcheck.js). The words
// this floor wants and does not have are listed in the build report as a ticket for the Hub;
// until they land, nothing here may use them.
