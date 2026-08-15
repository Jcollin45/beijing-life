// 走廊 — your floor's corridor, the landing outside 202.
//
// Registered into FlatFit (declared at the top of js/world.js). See APARTMENT.md for the fixed
// coordinate contract and TOWER.md for the deck contract. Every dimension here is read off the
// shell at build time — A.CORR, A.LIFT, A.LIFT_B, A.y0 — because the back of this building has
// moved twice already and a fit-out written in literals moves with neither move.
//
// The room as the shell now hands it over:
//
//     x -6.00 .. 6.00     z 3.20 .. 6.20     clear height 2.60     floor at A.y0 (deck 2)
//     LIFT    x  1.60 .. 3.40   z 4.90 .. 6.20   the working shaft, doors that open
//     LIFT_B  x -0.40 .. 1.40   z 4.90 .. 6.20   the second shaft, blanked off up here
//
// which makes this a T, not a passage. What the walking depth actually is, swept with the scene's
// own World.clampMove at the real r = 0.30 body radius in 5 mm steps through z 3.00..6.40, on the
// built floor with this fit-out in place. The first column is the run of *legal centres*; add
// 2r = 0.60 for the clear opening the eye sees:
//
//     x          -5.50   -4.70   -3.00   -1.00    0.50    2.50    4.00    5.00    5.60
//     legal run   1.960   1.300   1.300   1.300   1.040   1.040   1.960   1.980   2.240
//     clear       2.560   1.900   1.900   1.900   1.640   1.640   2.560   2.580   2.840
//
// Read that before trusting any round number about this floor, including the ones this header used
// to carry. Three things in it are not what you would guess:
//
//   * The narrowest run is 1.040 m across BOTH shaft fronts (x .50 and 2.50), or 1.640 m of visible
//     clear width. LIFT_B used to measure 2.240 m because its blank-wall collider was not marked as
//     shell structure and the stale-collider cleanup deleted it; that was a route through a wall,
//     not extra corridor. `home-public-space-check.js` now asserts the marker and both depths.
//   * The widest point is the east open end, 2.240 m at x 5.60. The west open end is 1.960 m at
//     x -5.50 because the hose cabinet occupies part of that end; the two ends are not symmetric.
//   * The west wing is NOT the corridor's open end. From x -4.70 to x -1.00 the run is a flat
//     1.300 m for 3.7 m — narrower than the east wing and only 0.26 m wider than the working
//     shaft's landing. That is this fit-out's doing, not the shell's: the wing is pinched between
//     the south-wall parking (colliders reach ZPARK = ZS + 0.62, :982 and :1022) and the
//     north-wall shoe band (ZSHOE onward, :1045-:1122), and ZPARK + r .. ZSHOE - r is 1.30 m.
//     If you add anything to either band in the west wing you are taking it out of a 1.300 m run.
//
// An earlier version called 1.04 m "standing room" and said both ends opened to 2.24 m. The first
// is a legal-centre run (1.64 m visible clear width); the second is true only of the east end. The
// table above keeps those units separate so the corridor camera is not tuned against mixed facts.
//
// All the storage a corridor here accumulates — the bikes, the shoes, the cardboard, the pushchair
// — goes in the two wings, which is also where it goes in the real building, and for the same
// reason. It is just that the west wing is paying for it.
//
// IMPORTANT — this file is a FIT-OUT, not a shell.
//
// An earlier version poured its own floor, ceiling and four walls, because it was written before
// js/world.js had any. `buildShell` now owns all of it. What the shell owns, and this file must
// therefore NOT build:
//
//     the slab at y+.004, the ceiling quad at y+2.60, all four perimeter walls, the timber trim
//     on all four, the opening for your own front door and its lintel, both lift shafts, and the
//     working landing (jambs, surround, leaves, call panel, floor indicator).
//
// What is left is the thing a corridor actually is, which is everything six front doors have
// accumulated: shoes left outside because they never come in, a bicycle nobody has ridden in a
// year, an e-bike on charge under a sign forbidding it, a pushchair folded against the wall, the
// hose cabinet, the meter bank, the 小广告 locksmith stamps nobody has scrubbed off, and one lamp
// out of six dead. A corridor here is storage, noticeboard and landing at once.
//
// See the note at the foot of this file for what the shell still owes this floor.
FlatFit['corridor'] = A => {
  if (!A || !A.box || !A.wall || !A.flat) {
    console.warn('home-corridor: toolkit A missing box/wall/flat — corridor not built');
    return;
  }
  // The documented toolkit, with the names that have historically been spelled both ways accepted
  // either way, and the decorative ones defaulted to no-ops so a missing helper costs a shadow
  // rather than the whole floor.
  const box = A.box, cyl = A.cyl, ball = A.ball;
  const cap = A.cap || A.capsule || A.box;
  const taper = A.taper || A.box;
  const wall = A.wall, flat = A.flat;
  const glyph = A.glyph || A.glyphs || (() => []);
  const stop = A.stop || A.solid || (() => null);
  const thing = A.th || A.thing || (() => null);
  const light = A.light || (() => null);
  const shade = A.shade || (() => null);
  const pool = A.glow || (() => null);
  const M = A.M;

  // ------------------------------------------------------------------ the coordinate contract
  // Read off the shell where the shell publishes it, so this file follows if the shell moves.
  const CR = A.CORR || { x0: -6.0, x1: 6.0, z0: 3.2, z1: 6.2, h: 2.60 };
  const LF = A.LIFT || { x0: 1.6, x1: 3.4, z0: 4.9, z1: 6.2 };
  const LB = A.LIFT_B || { x0: -0.4, x1: 1.4, z0: 4.9, z1: 6.2 };
  const X0 = CR.x0, X1 = CR.x1;         // the corridor's ends
  const ZS = CR.z0, ZN = CR.z1;         // south wall (your flat behind it), north wall (neighbours)
  // A.y0 is the deck this builder was called for. Never DECK[2]: a room that hardcodes its height
  // gets built in the lobby, which is the single most common failure in this codebase.
  const Y = (A.y0 !== undefined ? A.y0 : (A.DECK ? A.DECK[2] : 3.10));
  const H = CR.h, CY = Y + H;           // clear height, and the ceiling plane
  // The shell's slab sits at Y + .004. Anything standing on the floor stands on FL, and anything
  // *lying* on it — a doormat, a painted marking — goes at MATY, a clear 16 mm above the slab, so
  // no flat quad ever argues with the slab for the same pixels.
  const FL = Y + .006, MATY = Y + .020;
  // The shell's timber trim is 130 mm tall and stands 65 mm off each wall. The dado starts at the
  // top of it rather than behind it, so the two read as skirting-then-dado and never as two
  // mouldings occupying the same 130 mm.
  const TRIM = .130;

  // ---- where a body can actually stand, derived rather than remembered.
  //
  // `clampMove` in js/build.js inflates every collider by the body radius, which js/game.js passes
  // as 0.30. These five numbers are the shell's colliders plus that radius, and every focus point
  // and every collider this file adds is placed against them. They are not decoration: the last
  // two times this corridor was rebuilt it came out impassable, and both times the arithmetic
  // below was the thing nobody did.
  const R = .30;
  const ZWALK0 = ZS + .06 + R;          // 3.56 — the flat's wall pushes you off the south wall
  const ZWALK1 = ZN - .10 - R;          // 5.80 — and the north wall off that one
  const ZLOBBY = LF.z0 - R;             // 4.60 — but in front of the shafts this is the north edge
  const XWING0 = LB.x0 - .10 - R;       // -0.80 — west of here the north half opens up
  const XWING1 = LF.x1 + .10 + R;       //  3.80 — and east of here
  // What this file is allowed to take back off that. 2.240 m is the legal run at the east open end
  // (x 5.60 in the measured table at the head of this file), not along a whole wing: at x -4.70
  // the west wing is 1.300 m of legal centres, 1.900 m clear. The wings can still afford
  // a parking strip down one side and a shoe strip down the other; the middle strip gets nothing.
  // BAND is what has to survive both, so the two limits are derived from it rather than chosen and
  // hoped over — a bicycle 10 cm further out of the wall than intended is 10 cm off the walkway.
  const BAND = 1.30;                    // the clear walkway a wing must keep, end to end
  const ZPARK = ZS + .62;               // the deepest a south-wall collider may reach, in a wing
  const ZSHOE = Math.min(ZN - .46, ZPARK + R + BAND + R);   // and the shallowest a north-wall one

  // Your own front door. NOT free: js/world.js `buildShell` cuts the opening in the z = 3.2 wall
  // at fdx = 3.90, fdw = 1.00, fdtop = 2.10, and hangs the walkable 'gap' zone on the same numbers
  // (x 3.40 .. 4.40). A.frontDoor publishes them, so read them there and fall back to the literals
  // only if an older shell is underneath.
  const FD = A.frontDoor || {};
  const FX = FD.x !== undefined ? FD.x : 3.90;
  const FW = FD.w !== undefined ? FD.w : 1.00;

  const PI = Math.PI;

  // ------------------------------------------------------------------ palette
  // A shared corridor is painted, not decorated: one cream above, one green-grey dado below, and
  // everything else is steel, red, or the brown of six security doors.
  const col = {
    wall:   C('#d3ccbb'), dado:  C('#a2a89c'), dadoT: C('#7f867c'), scuff: C('#8f958a'),
    steel:  C('#b2b8bd'), steelD:C('#8a9197'), steelX:C('#6d747a'),
    alu:    C('#c3c9cd'), glass: C('#cfdde4'),
    doorA:  C('#6c3a2b'), doorB: C('#7d4634'), doorD: C('#4b2820'),
    doorG:  C('#4f5a4c'), doorGD:C('#333c31'), doorR: C('#8a3529'), doorK: C('#5a5f63'),
    brass:  C('#b98c3e'), brassD:C('#8a6828'),
    red:    C('#ae2b1f'), redD:  C('#7c1d14'),
    gold:   C('#e2b660'), ink:   C('#241c16'),
    green:  C('#1e7a45'), greenL:C('#4ec489'),
    white:  C('#f0ede4'), paper: C('#eee8d9'), grey: C('#7d848a'),
    warm:   C('#f6efd8'), cool:  C('#e7f0f4'), dead: C('#b9b6ad'), sick: C('#d6dcb8'),
    sky:    C('#b6cee1'), skyLo: C('#d3dfe6'), tower: C('#94a8b8'), towerD: C('#7d93a5'),
    rubber: C('#3a3f42'), navy:  C('#2c3f57'), plastic: C('#3f6f96'),
    pink:   C('#c07a86'), card:  C('#b18f66'), leaf: C('#4c7a44'), terra: C('#9d6a4c'),
  };
  // mode 4 is the fine plaster grain; mode 14 is painted render with the damp climbing the bottom
  // of the wall, which is what a stairwell dado in this building actually looks like.
  const MAT = {
    plaster: { mode: 4, mat: 'plaster', matScale: .62, matAmt: .20, nrmAmt: .26 },
    render:  { mode: 14, mat: 'plaster', matScale: .70, matAmt: .22, nrmAmt: .28 },
    conc:    { mode: 0, mat: 'concrete', matScale: .80, matAmt: .22, nrmAmt: .28 },
    metal:   { mode: 0, mat: 'metal', matScale: .55, matAmt: .16, nrmAmt: .24 },
  };

  // Writing on something always stands off the face it is written on, and `glyphs` pushes its
  // quads 12 mm along the yaw it is given — so passing the *front face* of a plate together with
  // the yaw that faces the reader puts the ink in front of the plate whichever wall it is on.
  const G = (x, y, z, yaw, text, o) => glyph(x, y, z, yaw, text, { color: col.white, ...o });

  // --- 鞋. Worth a helper, because there are eleven pairs on this landing and the primitive is
  // easy to get wrong: `cap` builds its capsule along local Y, so a shoe written as
  // cap(x, y, z, .095, .075, .245) is not a shoe lying on its side — it is a capsule squashed to
  // 75 mm tall and stretched 245 mm in z, which renders as a flat oval puck. Scale it long in Y
  // and then lay it down with rx, and the mesh's own rounded ends become the toe and the heel.
  // `ry` is applied after rx, so it splays the pair in plan the way a kicked-off pair sits.
  function shoe(x, y, z, len, c, splay = 0, sole) {
    const w = len * .36, h = len * .30;
    cap(x, y + h * .55, z, w, len, h, c, { rx: PI / 2, ry: splay, gloss: .18, tag: '鞋' });
    box(x, y + h * .16, z, w * .98, h * .34, len * .94, sole || col.ink,
        { hard: true, ry: splay, gloss: .10, tag: '鞋' });
  }
  const pairOf = (x, y, z, len, c, splay = 0, sole) => {
    for (const s of [-1, 1]) shoe(x + s * len * .29, y, z, len, c, splay + s * .06, sole);
  };

  // A thing the player can look at and say. `focus` is a spot on the floor the body can really
  // stand on, and `reach` is measured from the *focus*, not from the prop (js/game.js:8086) — so a
  // focus inside a collider is a word that never lights up, from any angle, ever. Rather than
  // trust the arithmetic above, every focus is checked against it as it is registered. This does
  // not know about this file's own colliders, which is what the walk probe is for; it catches the
  // one that matters most, which is a focus behind a wall or inside a lift shaft.
  const standable = (x, z) => x > X0 + .10 + R && x < X1 - .10 - R && z > ZWALK0 &&
    z < ((x > XWING0 && x < XWING1) ? ZLOBBY : ZWALK1);
  const TH = (hz, x, y, z, zh, en, note, fx, fz, reach = 1.6, tag) => {
    if (!standable(fx, fz))
      console.warn('home-corridor: the focus for ' + hz + ' at ' + fx + ',' + fz
                 + ' is not floor a body can stand on');
    return thing(hz, x, y, z, zh, en, note, { focus: [fx, fz], reach, tag: tag || hz });
  };

  // =================================================================== the dado
  //
  // The band of darker paint at hand height is the single thing that stops a painted corridor
  // reading as a white box, and it is on every one of these landings. The shell paints the walls
  // and skirts them; it does not band them. Both pieces stand proud of the wall as boxes, never as
  // a second quad in the wall plane, and both run in segments — a band drawn straight across a
  // doorway cuts the doorway in half.
  const DY0 = Y + TRIM, DH = 1.12 - TRIM;      // from the top of the shell's trim to 1.12 m
  const DYC = DY0 + DH / 2;
  // `axis` is the direction the wall runs in; `plane`/`sgn` locate its face and which way is into
  // the corridor. `runs` are [from, to] spans with the doorways left out of the list.
  function dado(axis, plane, sgn, runs) {
    const p1 = plane + sgn * .015, p2 = plane + sgn * .020, p3 = plane + sgn * .014;
    for (const [a0, a1] of runs) {
      const c = (a0 + a1) / 2, L = a1 - a0;
      if (L <= .002) continue;
      // Tagged 走廊, which is the only way that word is clickable: the floor, the ceiling and all
      // four walls belong to the shell, and the dado is the one surface running the whole length
      // of this landing that this file owns.
      const put = (y, h, d, w, colr, g, extra) => axis === 'x'
        ? box(c, y, d, L, h, w, colr, { hard: true, gloss: g, tag: '走廊', ...extra })
        : box(d, y, c, w, h, L, colr, { hard: true, gloss: g, tag: '走廊', ...extra });
      put(DYC, DH, p1, .03, col.dado, .18, MAT.render);
      put(DY0 + DH + .014, .028, p2, .04, col.dadoT, .22);
      // The rub line: forty years of shopping bags and shoulders against the paint immediately
      // above the band. Two centimetres of slightly dirtier cream, and the wall stops being flat.
      put(DY0 + DH + .21, .055, p3, .012, col.scuff, .06);
    }
  }

  // =================================================================== the doors, planned first
  //
  // Six 防盗门, five of them somebody else's, and where they can go is decided by the shell:
  // the whole of the z = 3.2 wall is your own flat (FLAT spans x -6 .. 6, z -5 .. 3.2), so a
  // neighbour's door in it would open into your master bedroom. The north wall's usable stretches
  // are the two the shafts do not stand against: x -6.0 .. -0.4 and x 3.4 .. 6.0.
  //
  // 201 and 203 go in the east wing beside your own 202, so the three doors you actually live
  // between read as a group; 204, 205 and 206 are down the west wing at a 1.75 m pitch, which is
  // the widest that fits three and leaves a 0.61 m pier between each pair of architraves. Those
  // three piers are what the shoe rack, the pushchair and the cardboard stand in.
  const D201 = 4.20, D203 = 5.35;                     // east wing, either side of the stair end
  // The hundreds digit is the deck, not a literal. This fit-out is registered per deck — the same
  // builder can be called for any storey — and with the six flat numbers typed in as literal
  // strings, every floor that reuses it advertises 2xx while the body stands on deck 7. `A.deck` is the shell's
  // `curDeck`, which is what `FlatFit` sets before it calls this; the fallback derives the same
  // number from `A.y0` the way the deck table does, because a room that guesses its own storey is
  // the failure this file's header is mostly about.
  const DECKNO = A.deck !== undefined && A.deck >= 2 ? A.deck
               : Math.max(2, Math.round(Y / (A.STOREY || 3.10)) + 1);
  const FN = n => String(DECKNO * 100 + n);           // FN(2) is '202' on deck 2, '702' on deck 7
  const D204 = -5.10, D205 = -3.35, D206 = -1.60;     // west wing, west to east
  const EW = .92;                                     // the east pair are narrower; 2.6 m of wall

  // south wall (z = 3.2), split round your own front doorway
  dado('x', ZS, 1, [[X0, FX - FW / 2], [FX + FW / 2, X1]]);
  // north wall (z = 6.2) — the two stretches that are not hidden behind a lift shaft, each split
  // round its own doorways. Behind the shafts there is no wall to band.
  const arch = (cx, w) => [cx - w / 2 - .07, cx + w / 2 + .07];
  dado('x', ZN, -1, [
    [X0, arch(D204, 1.00)[0]], [arch(D204, 1.00)[1], arch(D205, 1.00)[0]],
    [arch(D205, 1.00)[1], arch(D206, 1.00)[0]], [arch(D206, 1.00)[1], LB.x0],
    [LF.x1, arch(D201, EW)[0]], [arch(D201, EW)[1], arch(D203, EW)[0]], [arch(D203, EW)[1], X1],
  ]);
  // west end, split round the window reveal; east end, split round the fire stair
  const WZ = 4.70, WW = 1.70, WSILL = .92, WTOP = 2.16;
  const SZ = 4.70, SW = .95, STOP = 2.06;
  dado('z', X0, 1, [[ZS, WZ - WW / 2 - .10], [WZ + WW / 2 + .10, ZN]]);
  dado('z', X1, -1, [[ZS, SZ - SW / 2 - .08], [SZ + SW / 2 + .08, ZN]]);

  // =================================================================== the two shafts, from here
  //
  // The shell closes the front of LIFT_B correctly now (yaw PI, facing the corridor) and this file
  // no longer papers over it. What the shell does NOT close on this deck are the shafts' *flanks*:
  // both are drawn facing into the shaft, which is the right way round for the lobby downstairs
  // and the wrong way round up here, where the corridor runs past them on both sides. Every
  // surface in this renderer is one-sided, so from the two wings the eye goes straight down the
  // side of the box and out the back of it.
  //
  // Closed from here rather than there, because js/world.js is not this file to edit. See the foot
  // of the file. All three pieces sit 5 mm inside the shaft's own footprint so that no quad this
  // file adds shares a plane with one the shell already drew.
  const SZ0 = LF.z0 + .015, SZ1 = LF.z1 - .010;       // clear of the shaft front and the north wall
  // Finished like a wall, not left as a panel. Each flank is 1.28 x 2.60 m of the corridor's own
  // surface and stands in the middle of a wing: bare, it reads as a grey monolith somebody parked
  // there. The dado and the skirting carry straight across it and it becomes the return of the
  // wall it actually is.
  const shaftSide = (x, sgn) => {
    wall(x, Y + H / 2, (SZ0 + SZ1) / 2, SZ1 - SZ0, H, sgn * PI / 2, col.wall, { ...MAT.plaster });
    dado('z', x, sgn, [[SZ0 + .02, SZ1 - .02]]);
    box(x + sgn * .045, Y + .065, (SZ0 + SZ1) / 2, .065, TRIM, SZ1 - SZ0 - .04, C('#8d8578'),
        { hard: true, gloss: .18 });
  };
  shaftSide(LB.x0 + .005, -1);                        // LIFT_B's west flank, seen from the west wing
  shaftSide(LF.x1 - .005, 1);                         // LIFT's east flank, seen from the east wing
  // and what gets stuck on a blank two-metre panel in a lift lobby, which is everything
  G(LB.x0 - .030, Y + 1.52, LF.z0 + .58, -PI / 2, '请勿倚靠',
    { size: .048, gap: .010, color: C('#8b6f4a'), gloss: .04 });
  G(LB.x0 - .030, Y + 1.30, LF.z0 + .95, -PI / 2, '收废品',
    { size: .052, gap: .010, color: C('#9c4034'), gloss: .04 });
  G(LF.x1 + .030, Y + 1.34, LF.z0 + .70, PI / 2, '搬家 拉货',
    { size: .046, gap: .009, color: C('#a8352a'), gloss: .04 });
  // Between the two shafts there is a 0.20 m slot with the north wall at the back of it. A pair of
  // facing quads would close it, but a solid pier both closes it and is what is really there —
  // and being a box it can carry the riser stack that every one of these landings has.
  box((LB.x1 + LF.x0) / 2, Y + H / 2, (SZ0 + SZ1) / 2, LF.x0 - LB.x1 - .02, H, SZ1 - SZ0,
      C('#c7c0af'), { hard: true, gloss: .10, ...MAT.plaster });

  // --- LIFT_B's front, which up here is a lift that is not a lift. The shell's wall is at LB.z0
  // facing the corridor; everything below hangs off it at 22 mm and more, so the coplanar rule is
  // never within a centimetre of being tested.
  const BZ0 = LB.z0, BCX = (LB.x0 + LB.x1) / 2;
  dado('x', BZ0, -1, [[LB.x0 + .01, LB.x1 - .01]]);
  box(BCX, Y + .065, BZ0 - .045, LB.x1 - LB.x0 - .02, TRIM, .065, C('#8d8578'),
      { hard: true, gloss: .18 });
  // The blanked-off opening: a steel surround with a sheet of ply screwed across it, which is what
  // a second shaft out of service looks like for the eight years it takes to fund the repair.
  const BOX = LB.x0 + .62;                                 // the opening, off-centre as built
  for (const s of [-1, 1])
    box(BOX + s * .55, Y + 1.05, BZ0 - .035, .10, 2.14, .05, col.steelD,
        { hard: true, gloss: .28, ...MAT.metal });
  box(BOX, Y + 2.14, BZ0 - .035, 1.20, .10, .05, col.steelD,
      { hard: true, gloss: .28, ...MAT.metal });
  box(BOX, Y + 1.03, BZ0 - .022, 1.00, 2.04, .028, C('#c0b7a2'), { hard: true, gloss: .12 });
  for (const yb of [.42, 1.62])                            // the two battens across the ply
    box(BOX, Y + yb, BZ0 - .040, 1.00, .07, .014, C('#a89b83'), { hard: true, gloss: .10 });
  // and the notice on it, printed once and gone yellow
  box(BOX, Y + 1.24, BZ0 - .050, .46, .32, .016, col.paper,
      { hard: true, gloss: .05, ry: .03, tag: '电梯' });
  G(BOX, Y + 1.33, BZ0 - .062, PI, '此梯停用', { size: .054, gap: .010, color: col.redD });
  G(BOX, Y + 1.24, BZ0 - .062, PI, '请乘另一部', { size: .042, gap: .008, color: col.ink });
  G(BOX, Y + 1.15, BZ0 - .062, PI, '物业管理处', { size: .032, gap: .007, color: col.grey });
  // the dead floor indicator over it, unlit — no glow, because nothing in there has power
  box(BOX, Y + 2.36, BZ0 - .038, .50, .28, .05, C('#3d4348'), { hard: true, gloss: .30 });
  G(BOX, Y + 2.36, BZ0 - .066, PI, '二', { size: .15, color: C('#4a4b45') });
  // a fire extinguisher point sign on the blank half of the face, and the riser cupboard door
  box(LB.x1 - .26, Y + 1.34, BZ0 - .024, .40, 1.34, .030, C('#bfb7a4'), { hard: true, gloss: .16 });
  for (const s of [-1, 1])
    cyl(LB.x1 - .26 + s * .16, Y + 1.34, BZ0 - .042, .008, 1.28, C('#a79e8b'), { gloss: .12 });
  cyl(LB.x1 - .36, Y + 1.06, BZ0 - .052, .016, .06, col.steelD, { rx: PI / 2, gloss: .48 });
  G(LB.x1 - .26, Y + 2.08, BZ0 - .030, PI, '强电井', { size: .050, gap: .010, color: col.redD });
  // and the riser itself, coming out of the top of that cupboard and up through the slab. Placed
  // east of the cupboard rather than on the pier between the shafts: the shell's landing jamb
  // occupies x 1.50 .. 2.10 at z 4.90 .. 5.02, and a pipe on the pier centre stands half inside it.
  cyl(LB.x1 + .05, Y + H / 2, BZ0 - .085, .042, H, col.steelX, { gloss: .30, ...MAT.metal });
  for (const cy2 of [.55, 1.70])
    cyl(LB.x1 + .05, Y + cy2, BZ0 - .085, .052, .05, col.steelX, { gloss: .38 });

  // =================================================================== ceiling services
  //
  // The red sprinkler main runs at z = 3.38, hugging the flat's wall, because that is the only
  // line down this corridor clear for all twelve metres: north of z = 4.9 the middle four metres
  // are lift shaft, and a sprinkler main through a lift shaft is a mistake you only make once.
  // Four lengths rather than one 11.6 m cylinder — a barrel scaled three hundred to one shades
  // like a mirror, not like a pipe.
  const PZ_PIPE = ZS + .18;
  for (let i = 0; i < 4; i++)
    cyl(X0 + 1.5 + i * 3.0, CY - .17, PZ_PIPE, .036, 3.0, col.redD,
        { rz: PI / 2, gloss: .34, ...MAT.metal });
  for (let i = 0; i < 5; i++) {
    const px = X0 + 1.3 + i * 2.4;
    cyl(px, CY - .225, PZ_PIPE, .016, .07, col.brassD, { gloss: .5 });
    ball(px, CY - .262, PZ_PIPE, .026, .020, .026, col.brass, { gloss: .55 });
  }
  // hanger straps back up to the slab, so the main is held rather than floating
  for (let i = 0; i < 7; i++)
    box(X0 + .9 + i * 1.8, CY - .085, PZ_PIPE, .022, .17, .020, col.steelX,
        { hard: true, gloss: .32 });
  // Trunking for the corridor lighting circuit, on the other side of the pipe, and a second,
  // fatter run of conduit for the doorphone risers that were retrofitted through the ceiling.
  box(0, CY - .045, ZS + .10, X1 - X0, .05, .07, col.white, { hard: true, gloss: .12 });
  for (let i = 0; i < 4; i++)
    cyl(X0 + 1.5 + i * 3.0, CY - .095, ZS + .27, .014, 3.0, C('#c9c3b4'),
        { rz: PI / 2, gloss: .20 });

  // --- the lamps. Six fittings down a twelve-metre run rather than one bright one, which is what
  // gives a corridor its rhythm; two kinds, because these get replaced one at a time; and one of
  // them dead, which is the true state of every landing of this kind.
  //
  // 声控灯: the round opal ones are sound-operated, so each carries the little sensor grille that
  // is the giveaway, and the notice by the lift says so. The rectangular ones are the older
  // fluorescent bulkheads that have not been swapped yet.
  //
  // Every fitting sits at z < LIFT.z0 so that none of them is inside a shaft, and the two in the
  // wings sit deeper into the room than the four in the middle, because the wings open out to
  // 2.240 m of legal run at the east end — 1.300 m at x -4.70, so not uniformly — while the middle
  // strip across the working shaft is 1.040 m, and a lamp on the middle line of that lights
  // nothing at the ends.
  //
  // Power .30 and glow .07, not .52 and .13. At the old figures the plaster across the front of
  // the lift landing clipped to white, and a clipped matte wall is exactly what the post chain's
  // bright pass is written to keep out of the bloom: it came back as a half-transparent copy of
  // the corridor laid over the frame, through the walls and through the closed doors.
  const LAMPS = [
    [-4.60, 4.72, 'rose', true], [-2.30, 4.28, 'tube', false], [-0.60, 4.30, 'rose', true],
    [1.05, 3.98, 'tube', true], [3.05, 4.20, 'rose', 'sick'], [4.85, 4.72, 'rose', true],
  ];
  for (const [px, pz, kind, alive] of LAMPS) {
    const lit = alive === true, sick = alive === 'sick';
    const face = lit ? col.warm : sick ? col.sick : col.dead;
    if (kind === 'tube') {
      box(px, CY - .045, pz, .50, .07, .17, col.steelD, { hard: true, gloss: .30, tag: '灯' });
      box(px, CY - .098, pz, .43, .05, .13, face,
          { hard: true, mode: lit || sick ? 1 : 0, glow: lit ? .07 : sick ? .05 : 0, gloss: .10,
            tag: '灯' });
      for (const s of [-1, 1])
        box(px + s * .26, CY - .075, pz, .03, .10, .15, col.steelX, { hard: true, gloss: .34 });
    } else {
      // the plastic rose: a shallow disc with an opal pan under it and the sensor grille beside
      cyl(px, CY - .035, pz, .145, .05, col.white, { gloss: .16, tag: '灯' });
      cyl(px, CY - .080, pz, .125, .05, face,
          { mode: lit || sick ? 1 : 0, glow: lit ? .07 : sick ? .05 : 0, gloss: .12, tag: '灯' });
      cyl(px + .17, CY - .050, pz, .028, .022, C('#4a4f52'), { gloss: .30 });
      for (let i = -1; i <= 1; i++)
        box(px + .17, CY - .062, pz + i * .012, .036, .004, .004, C('#2c3033'), { hard: true });
    }
    if (lit) {
      light(px, CY - .22, pz, col.cool, .28, 2.95);
      // the pool the fitting throws on the floor under it, which is what sells a ceiling light
      if (pool && M) pool(M.trs(px, MATY + .002, pz, 0, 2.30, 1, 2.30), C('#ffeccb'), .055);
    }
    if (sick && pool && M) pool(M.trs(px, MATY + .002, pz, 0, 1.60, 1, 1.60), C('#e8f0c8'), .030);
  }

  // --- 安全出口. Wall-mounted rather than hung across the corridor: a sign slung under the ceiling
  // is read edge-on from every position a body can stand in, and an arrow on its face can only
  // ever point across the corridor, never along it. Flat on the wall, the arrow points at the
  // stair in world space and means what it says.
  //
  // The glowing face is 0.345 x 0.125 = 0.043 m2, which is the thin-run band, so .12 not .02.
  //
  // The *characters* are `mode: 1` with no glow, and that distinction is the whole reason this
  // corridor stopped being fogged. mode 1 is the renderer's flat unlit shade, so the white reads
  // at full strength whether the landing lights are on or not; `glow` is what writes the pixel
  // into the post chain's light mask. Every character is its own quad, so four signs and a meter
  // bank put fifty-two small emitters into the frame — individually invisible, and blurred
  // together by the bloom into a half-transparent copy of the corridor laid over the whole shot.
  // Measured, not guessed: zeroing the glow on the 44 glyph quads in view removed the entire
  // haze, and zeroing every other emitter as well removed nothing further. One glowing panel per
  // sign; the writing on it is lit, not a light.
  function exitSign(x, y, z, sgn, arrow) {
    // sgn: which way the face looks along z (-1 for the north wall, +1 for the south)
    const yaw = sgn > 0 ? 0 : PI, f = d => z + sgn * d;
    const w = arrow ? .46 : .38;
    box(x, y, f(.028), w, .155, .055, col.green, { hard: true, gloss: .26, tag: '安全出口' });
    box(x, y, f(.058), w - .035, .125, .006, col.greenL,
        { hard: true, mode: 1, glow: .12, tag: '安全出口' });
    G(x - (arrow ? .062 : 0), y, f(.058), yaw, '安全出口',
      { size: arrow ? .072 : .082, gap: .010, color: col.white, mode: 1 });
    // The stair is east, so the arrow always hangs on the east end of the plate — but a glyph
    // reads left-to-right in the *reader's* frame, and on a wall facing -z the reader's right hand
    // points at world -x. So "east" is drawn '←' on the north wall and '→' on the south.
    // Backwards, this sends the player to the window in a fire.
    if (arrow) G(x + .175, y, f(.058), yaw, sgn > 0 ? '→' : '←',
                 { size: .095, color: col.white, mode: 1 });
  }
  // Four, not six. Each one is 0.043 m2 of emitter and they are the brightest thing on the walls;
  // one per wing, one where you step out of the lift, one over the stair itself is the rhythm.
  exitSign(-4.05, Y + 2.28, ZS, 1, true);       // "the stair is that way", pointing east
  exitSign(2.55, Y + 2.28, ZS, 1, true);
  // On the north wall it goes over a *pier*, not over a door: every door here carries a 横批 at
  // Y + 2.28 and a sign at 2.32 lands straight on top of it, which is two lots of writing in the
  // same 60 mm of wall.
  exitSign((D204 + D205) / 2, Y + 2.30, ZN, -1, true);
  // over the stair door itself, flat against the east wall
  box(X1 - .035, Y + STOP + .19, SZ, .06, .155, .40, col.green,
      { hard: true, gloss: .26, tag: '安全出口' });
  box(X1 - .068, Y + STOP + .19, SZ, .006, .125, .365, col.greenL,
      { hard: true, mode: 1, glow: .12, tag: '安全出口' });
  G(X1 - .068, Y + STOP + .19, SZ, -PI / 2, '安全出口',
    { size: .086, gap: .012, color: col.white, mode: 1 });

  // =================================================================== the doors
  //
  // The frame stands 90 mm off the wall and the leaf 60 mm, so the leaf reads as recessed in its
  // architrave and nothing is ever coplanar with anything — a flush-mounted door in this renderer
  // flickers as horizontal stripes.
  //
  // `sgn` is the direction the door faces into the corridor: +1 for the z = 3.2 wall, -1 for
  // z = 6.2. `hinge` is -1 for hinges on the -x jamb. Each door is a household, so the colour, the
  // ironmongery finish, the name on the plate and what is stuck to the leaf all vary.
  function frontDoor(cx, zw, sgn, num, o = {}) {
    const yaw = sgn > 0 ? 0 : PI;
    const W = o.w || 1.00, HT = o.top || 2.06, LW = W - .05, LH = HT - .04;
    const F = z => zw + sgn * z;                    // a distance out of the wall, either way
    const hinge = o.hinge === undefined ? -1 : o.hinge;
    const body = o.body || col.doorA, panel = o.panel || col.doorB;
    const metal = o.metal || col.steelD, bright = o.bright || col.steel;

    // architrave. `headTo` caps the jambs under a lintel somebody else already laid — which is the
    // case at your own door, where the shell trims the opening for you.
    const jTop = o.headTo === undefined ? Y + HT + .07 : o.headTo;
    for (const s of [-1, 1])
      box(cx + s * (W / 2 + .035), (Y + jTop) / 2, F(.045), .07, jTop - Y, .09, col.doorD,
          { hard: true, gloss: .26, tag: o.tag });
    if (o.headTo === undefined)
      box(cx, Y + HT + .035, F(.045), W + .14, .07, .09, col.doorD,
          { hard: true, gloss: .26, tag: o.tag });

    // leaf, and its two pressed panels
    const leaf = box(cx, Y + LH / 2, F(.030), LW, LH, .06, body,
                     { hard: true, gloss: o.gloss || .24, tag: o.tag });
    for (const [py, ph] of [[LH * .70, LH * .40], [LH * .265, LH * .30]])
      box(cx, Y + py, F(.070), LW - .16, ph, .020, panel,
          { hard: true, gloss: .22, tag: o.tag });
    // the sunken bead round each panel reads at two metres; two thin bars is enough of it
    for (const [py, ph] of [[LH * .70, LH * .40], [LH * .265, LH * .30]])
      for (const s of [-1, 1])
        box(cx, Y + py + s * ph / 2, F(.082), LW - .16, .012, .012, col.doorD,
            { hard: true, gloss: .3, tag: o.tag });

    // ironmongery, on the jamb opposite the hinges
    const hx = cx - hinge * (LW / 2 - .13);
    box(hx, Y + 1.03, F(.075), .10, .24, .03, metal, { hard: true, gloss: .46, tag: o.tag });
    cyl(hx, Y + 1.03, F(.115), .016, .07, bright, { rx: PI / 2, gloss: .5, tag: o.tag });
    box(hx - hinge * .085, Y + 1.03, F(.148), .19, .028, .028, bright,
        { hard: true, gloss: .5, tag: o.tag });
    cyl(hx, Y + .88, F(.078), .020, .012, col.brassD, { rx: PI / 2, gloss: .55, tag: o.tag });
    // 猫眼
    cyl(cx, Y + 1.56, F(.078), .012, .030, col.brass, { rx: PI / 2, gloss: .6, tag: o.tag });
    // three hinges
    for (const hy of [.36, 1.06, 1.76])
      cyl(cx + hinge * (LW / 2 - .012), Y + hy, F(.062), .014, .10, metal,
          { gloss: .45, tag: o.tag });

    // 门牌 — the number plate, screwed to the leaf at head height
    box(cx, Y + 1.84, F(.072), .30, .13, .024, col.steel,
        { hard: true, gloss: .40, tag: o.tag });
    G(cx, Y + 1.84, F(.084), yaw, num, { size: .073, gap: .012, color: col.ink, gloss: .2 });

    // 门铃 — the bell push, screwed to the face of the architrave on the handle side, with its
    // wire stapled up the jamb because none of this was in the building as designed. The
    // architrave's own front face is at F(.090), so the push stands clear of it rather than
    // sinking into it.
    // Tagged with the door's own tag, not '门铃'. `pick` resolves a ray to a tag and then to the
    // nearest *thing* wearing it, and returns null when nothing does — so a tag with no thing
    // behind it is not a new word, it is a 55 mm patch of door that swallows the click.
    const bx = cx - hinge * (W / 2 + .035);
    box(bx, Y + 1.32, F(.108), .055, .085, .022, C('#e6e2d8'),
        { hard: true, gloss: .30, tag: o.tag });
    cyl(bx, Y + 1.325, F(.122), .014, .010, C('#c9553f'), { rx: PI / 2, gloss: .45 });
    box(bx, Y + 1.72, F(.099), .010, .70, .010, C('#dfdacd'), { hard: true, gloss: .12 });

    // the little name plate under the number, brass on some doors and a strip of tape on others
    if (o.name) {
      if (o.taped) {
        box(cx, Y + 1.68, F(.074), .19, .055, .008, C('#e8e3d2'),
            { hard: true, gloss: .06, ry: .02, tag: o.tag });
        G(cx, Y + 1.68, F(.082), yaw, o.name, { size: .038, gap: .008, color: col.ink });
      } else {
        box(cx, Y + 1.68, F(.074), .21, .075, .012, col.brassD,
            { hard: true, gloss: .48, tag: o.tag });
        G(cx, Y + 1.68, F(.084), yaw, o.name, { size: .046, gap: .010, color: C('#3a2c16') });
      }
    }

    // 电表 — the little meter cupboard beside a front door, a white plastic box with a window and
    // the flat number felt-tipped on it. `o.meter` is the x offset from the door centre, because
    // which side there is room on is a property of the wall and not of the door: the two east-wing
    // doors are 1.15 m apart and have none, so those two flats are metered in the block's bank.
    if (o.meter) {
      const mx = cx + o.meter;
      box(mx, Y + 1.50, F(.055), .18, .32, .09, C('#dcd7c8'),
          { hard: true, gloss: .22, tag: '电表' });
      box(mx, Y + 1.55, F(.100), .13, .10, .008, C('#20262a'), { hard: true, gloss: .55 });
      G(mx, Y + 1.55, F(.108), yaw, num, { size: .030, gap: .005, color: C('#bcd6c4') });
      cyl(mx + .06, Y + 1.37, F(.098), .008, .008, C('#d84a3a'), { rz: PI / 2, mode: 1, glow: .12 });
      box(mx, Y + 1.75, F(.060), .10, .05, .04, C('#c6c0b0'), { hard: true, gloss: .18 });
    }

    // doormat
    flat(cx, MATY + .004, F(.32), .64, .40, o.mat || col.rubber, { mode: 7, gloss: .04 });
    shade(cx, F(.32), .74, .50, .26, MATY + .008);
    return leaf;
  }

  // --- 春联 on a frame. Classic pairs, gold on red, read top to bottom, and a different couplet on
  // every door because they come out of different years and different shops.
  function couplets(cx, zw, sgn, pair, top, o = {}) {
    const yaw = sgn > 0 ? 0 : PI;
    const F = z => zw + sgn * z;
    const off = o.off || .58, w = o.w || .12, c = o.paper || col.red, ink = o.ink || col.gold;
    // The paper is cut to the couplet: seven characters want a metre of it and four want two
    // thirds, and a four-character couplet printed down the middle of a seven-character strip
    // reads as a strip somebody forgot to finish.
    const ph = o.h || (pair[0].length >= 6 ? 1.02 : .66);
    for (const [s, text] of [[-1, pair[0]], [1, pair[1]]]) {
      box(cx + s * off, Y + 1.48, F(.020), w, ph, .04, c,
          { hard: true, gloss: .10, tag: '春联' });
      G(cx + s * off, Y + 1.48, F(.040), yaw, text,
        { size: .105, gap: .018, color: ink, vertical: true, gloss: .12, tag: '春联' });
    }
    if (!top) return;
    box(cx, Y + 2.28, F(.020), .62, .15, .04, c, { hard: true, gloss: .10, tag: '春联' });
    G(cx, Y + 2.28, F(.040), yaw, top, { size: .098, gap: .020, color: ink, tag: '春联' });
  }

  // --- 倒福, the diamond of red paper pasted upside down on the leaf
  function fuDiamond(cx, y, zw, sgn, s = .21, paper, ink) {
    const yaw = sgn > 0 ? 0 : PI;
    box(cx, Y + y, zw + sgn * .095, s, s, .018, paper || col.red,
        { hard: true, gloss: .10, ry: sgn > 0 ? PI / 4 : -PI / 4 });
    G(cx, Y + y, zw + sgn * .106, yaw, '福', { size: s * .60, color: ink || col.gold, gloss: .14 });
  }

  // --- the marks left where last year's couplets were torn off, which is half the doors by March.
  // Both scraps sit above the dado (which tops out at 1.12) and 24 mm off the wall plane, so
  // neither is within a centimetre of the plaster or of the dado's own front face.
  function torn(cx, zw, sgn) {
    const F = z => zw + sgn * z;
    for (const s of [-1, 1]) {
      box(cx + s * .58, Y + 1.94, F(.024), .11, .16, .02, C('#a8483c'),
          { hard: true, gloss: .06, ry: s * .03 });
      box(cx + s * .58, Y + 1.35, F(.024), .10, .09, .02, C('#b0574a'), { hard: true, gloss: .06 });
    }
  }

  // The five neighbours. A neighbour's leaf is tagged 邻居, not 门: `pick` in js/build.js resolves
  // a ray to a tag and then to the nearest *thing* wearing it, so with all six tagged 门 there is
  // exactly one thing to find and clicking somebody else's door answers "这是我家的门". Only yours
  // is 门. Four is skipped on the plate the way it is skipped in the building.
  //
  // 201 — 对门, straight across from yours. Green paint, brass plate, couplets up all year.
  frontDoor(D201, ZN, -1, FN(1), { tag: '邻居', w: EW, hinge: 1, body: col.doorG,
                                   panel: col.doorGD, name: '陈', mat: C('#3f4a3f'),
                                   metal: col.brassD, bright: col.brass });
  fuDiamond(D201, 1.36, ZN, -1, .20);
  // 203 — the tight one against the stair. No couplets; a delivery sticker and a taped-on name.
  frontDoor(D203, ZN, -1, FN(3), { tag: '邻居', w: EW, body: col.doorB, panel: col.doorA,
                                   name: '刘先生', taped: true, mat: col.rubber });
  torn(D203, ZN, -1);
  // The leaf's pressed panels stand at F(.070) with their beads at F(.082); anything stuck on the
  // door goes in front of *those*, not in front of the leaf, or it is a millimetre off a face.
  box(D203 - .26, Y + 1.20, ZN - .100, .13, .09, .010, C('#e4d8b8'), { hard: true, gloss: .06 });
  G(D203 - .26, Y + 1.20, ZN - .110, PI, '已签收', { size: .026, gap: .004, color: C('#8a5a2a') });
  // 204 — the west end. Oldest paint, oldest couplets, and the only 铁门 left with a grille.
  frontDoor(D204, ZN, -1, FN(4), { tag: '邻居', hinge: 1, body: col.doorK, panel: C('#4b5054'),
                                   name: '王', mat: C('#4a4f52'), gloss: .30, meter: .75 });
  couplets(D204, ZN, -1, ['天增岁月人增寿', '春满乾坤福满门'], '万象更新');
  for (let i = 0; i < 5; i++)                             // the grille over the top panel
    box(D204 - .28 + i * .14, Y + 1.55, ZN - .086, .016, .40, .016, col.steelX,
        { hard: true, gloss: .40 });
  // 205 — the family with the pushchair. Red door, new couplets, a child's sticker at knee height.
  frontDoor(D205, ZN, -1, FN(5), { tag: '邻居', body: col.doorR, panel: C('#6f2b21'),
                                   name: '张', mat: C('#7d3f37'), meter: .75 });
  couplets(D205, ZN, -1, ['一帆风顺年年好', '万事如意步步高'], '吉星高照');
  fuDiamond(D205, 1.34, ZN, -1, .19);
  ball(D205 + .22, Y + .74, ZN - .100, .045, .045, .010, C('#e8c34a'), { gloss: .20 });
  // 206 — nearest the lift, so the one everybody's small ads get stuck to.
  frontDoor(D206, ZN, -1, FN(6), { tag: '邻居', hinge: 1, body: col.doorA, panel: col.doorB,
                                   name: '李', taped: true, mat: col.rubber, meter: -.76 });
  couplets(D206, ZN, -1, ['门迎百福平安宅', '户纳千祥富贵家'], '五福临门',
           { paper: C('#9c3b30'), ink: C('#c9a765') });
  for (const [dy, t, c] of [[1.14, '开锁', '#a8352a'], [1.02, '疏通', '#96463a']])
    G(D206 + .30, Y + dy, ZN - .088, PI, t, { size: .034, gap: .006, color: C(c), gloss: .04 });

  // --- your door. home-entry.js owns its one physical frame and leaf, including the corridor-side
  // 202 plate, peephole and 福. This fit-out deliberately adds no second slab here: the old one
  // stayed shut while the entry leaf swung and made the opening look (and pick) like two doors.
  // What belongs to the landing stays here — the threshold, doormat/couplets and the 门 label.
  // 门槛石 — the stone threshold every flat here has across its doorway.
  box(FX, MATY + .012, ZS + .07, FW + .05, .036, .19, C('#9b968b'),
      { hard: true, gloss: .40, ...MAT.conc });
  // A pair of red paper strips, narrower than the neighbours', because yours have faded a year.
  couplets(FX, ZS, 1, ['出入平安', '四季兴隆'], null,
           { off: .60, w: .11, paper: C('#9c3b30'), ink: C('#c9a765') });

  // =================================================================== the window, west end
  //
  // The shell's west wall is solid across the whole corridor depth and this file may not cut it.
  // So the window is a shallow bay standing in front of that wall rather than a hole through it: a
  // 100 mm aluminium surround, the view at the back of the reveal, the glazing in front of it.
  // Everything sits at x > -6.0, because anything at x < -6.0 is behind a one-sided wall and
  // simply does not exist from in here.
  //
  // It is centred on the corridor's depth, not on the old 1.8 m one: at 3.0 m deep the end wall is
  // a room's end wall, and a window off to one side of it reads as a mistake.
  //
  // Two storeys up, so the view is the next block across the courtyard with sky over it. The sky
  // slab is 1.80 x 1.34 = 2.4 m2, which is the large-area band, so glow .028.
  const WX = X0 + .012;                                   // the back of the reveal
  // Two registrations, declared here because the sky slab is the first thing that needs them.
  // Both fall back to identity if the shell is older than they are, so this file still builds
  // against a js/world.js that has neither.
  const skyReg = A.sky || (p => p);
  // js/world.js:2934 `timed(p, h0, h1, o)` re-tints a prop when the clock's HOUR changes and at
  // no other time — a live function of the clock, checked once an hour, never in the draw. So
  // the west end really does fade with it; the parameters are named for what they are.
  const timedReg = A.timed || ((p, hourOn, hourOff) => p);
  // The slab joins `World.skyGlass`: js/game.js repaints that list with `dl.glass` every frame,
  // so the strip over the opposite block is the colour of the actual sky rather than a fixed
  // midnight. Only this one — the horizon band under it would be flattened to the same value and
  // the gradient is the whole point of having two.
  skyReg(box(WX, Y + (WSILL + WTOP) / 2, WZ, .012, WTOP - WSILL + .10, WW + .10, col.sky,
      { hard: true, mode: 1, glow: .028 }));
  box(WX + .010, Y + WSILL + .20, WZ, .008, .40, WW + .08, col.skyLo,
      { hard: true, mode: 1, glow: .024 });
  // the block opposite, and the two poplars in the courtyard between
  for (const [tz, tw, th2, tc] of [[4.00, .34, .62, col.towerD], [4.34, .26, .90, col.tower],
                                   [4.66, .38, .74, col.towerD], [5.02, .24, .50, col.tower],
                                   [5.34, .30, .82, col.towerD]])
    box(WX + .020, Y + WSILL + th2 / 2, tz, .010, th2, tw, tc, { hard: true, mode: 1, glow: .016 });
  // The lit windows come up in the evening and go out in the morning — this was a fixed night sky
  // in a corridor the player crosses at every hour of the day. `A.timed` is applied by js/world.js
  // on the frames where the *hour* changes, which is twice a game-day, not per frame.
  for (let i = 0; i < 34; i++) {                          // lit windows in it, a few of them
    const wz2 = 3.98 + (i % 9) * .17, wy2 = WSILL + .12 + Math.floor(i / 9) * .19;
    if ((i * 7) % 5 === 0)
      timedReg(box(WX + .030, Y + wy2, wz2, .008, .045, .035, C('#f0dda4'),
          { hard: true, mode: 1, glow: .05 }), 17, 7, { on: .05, off: .004 });
  }
  for (const [tz, th2] of [[4.18, .46], [5.16, .40]])
    cap(WX + .046, Y + WSILL + th2 / 2, tz, .009, th2, .22, C('#5d7a4e'),
        { mode: 1, glow: .012 });
  // the reveal itself — four plaster returns boxing the view in, so it reads as a recess
  for (const [ry, rz, rh, rw] of [[WSILL - .05, WZ, .10, WW + .20],
                                  [WTOP + .05, WZ, .10, WW + .20],
                                  [(WSILL + WTOP) / 2, WZ - WW / 2 - .05, WTOP - WSILL, .10],
                                  [(WSILL + WTOP) / 2, WZ + WW / 2 + .05, WTOP - WSILL, .10]])
    box(X0 + .055, Y + ry, rz, .11, rh, rw, col.wall, { hard: true, gloss: .10, ...MAT.plaster });
  // aluminium frame: outer, a centre mullion, and one opening top light on the right
  const wf = (y, z, h, w) => box(X0 + .105, Y + y, z, .05, h, w, col.alu,
                                 { hard: true, gloss: .40, ...MAT.metal });
  wf(WSILL + .015, WZ, .06, WW + .06);
  wf(WTOP - .015, WZ, .06, WW + .06);
  wf((WSILL + WTOP) / 2, WZ - WW / 2 + .03, WTOP - WSILL, .06);
  wf((WSILL + WTOP) / 2, WZ + WW / 2 - .03, WTOP - WSILL, .06);
  wf((WSILL + WTOP) / 2, WZ, WTOP - WSILL, .05);
  wf(WTOP - .44, WZ + WW / 4, .05, WW / 2 - .04);
  cyl(X0 + .14, Y + WTOP - .60, WZ + WW / 4 - .28, .012, .11, col.steelD, { rz: PI / 2, gloss: .45 });
  // the panes: thin, barely there, enough to catch the corridor light
  for (const s of [-1, 1])
    box(X0 + .085, Y + (WSILL + WTOP) / 2, WZ + s * WW / 4, .010, WTOP - WSILL - .06, WW / 2 - .07,
        col.glass, { hard: true, mode: 18, alpha: .13, gloss: .78 });
  // sill inside, with what a corridor sill always ends up holding
  box(X0 + .17, Y + WSILL - .045, WZ, .24, .05, WW + .22, col.white,
      { hard: true, gloss: .28, tag: '窗户' });
  cyl(X0 + .19, Y + WSILL + .06, WZ - .52, .075, .13, col.terra, { gloss: .18 });
  for (let i = 0; i < 6; i++)
    cap(X0 + .19 + (i % 2 - .5) * .05, Y + WSILL + .17, WZ - .52 + (i - 2.5) * .022,
        .015, .17, .015, i < 2 ? C('#7d7a4a') : col.leaf, { rz: (i - 2.5) * .16, gloss: .10 });
  cyl(X0 + .18, Y + WSILL + .045, WZ + .30, .032, .10, C('#3f6f4a'), { gloss: .45 });
  cyl(X0 + .20, Y + WSILL + .075, WZ + .58, .048, .16, C('#c8ccc4'), { gloss: .30, alpha: .9 });
  cap(X0 + .20, Y + WSILL + .155, WZ + .58, .09, .03, .09, C('#8a6a45'), { gloss: .20 });
  // a strip of paint peeling off over the head, which is what these windows always look like
  box(X0 + .14, Y + WTOP + .13, WZ, .19, .03, WW + .16, col.white, { hard: true, gloss: .18 });
  // 暖气片 under it — 集中供暖 reaches the landings as well as the flats, and a cast-iron column
  // radiator under the corridor window is the one piece of the west end that is not paint. It
  // stands 110 mm off the wall, well inside the 400 mm the west wall's own collider already takes.
  //
  // ---- 供暖季
  //
  // Beijing's 集中供暖 runs 15 November to 15 March and this file had no month test anywhere, so
  // the radiator was warm in July: a wrong fact about the city, stated in geometry, in the one
  // building the player comes back to every day. The season is also one of the most useful things
  // a learner can be taught about this place — 供暖 is a date everybody here knows by heart.
  //
  // Off-season it is the same cast iron, a shade cooler and dead; in season it takes a trace of
  // glow, which at this size is the only honest way to say "warm" without a particle.
  const HEAT_MONTHS = (() => {                     // 11-15 .. 3-15, inclusive
    const d = new Date(), m = d.getMonth() + 1, day = d.getDate();
    return m === 11 ? day >= 15 : m === 3 ? day <= 15 : (m === 12 || m <= 2);
  })();
  const heatC = HEAT_MONTHS ? C('#efe6d4') : C('#dcd8cc');
  for (let i = 0; i < 13; i++)
    cyl(X0 + .12, Y + .40, WZ - .60 + i * .10, .038, .58, heatC,
        { gloss: .30, glow: HEAT_MONTHS ? .035 : 0 });
  for (const ry2 of [.13, .69])
    cyl(X0 + .12, Y + ry2, WZ, .022, 1.30, C('#ded9cc'), { rz: PI / 2, ry: PI / 2, gloss: .34 });
  cyl(X0 + .16, Y + .78, WZ + .62, .016, .22, col.brassD, { gloss: .55 });
  cyl(X0 + .16, Y + .88, WZ + .62, .028, .05, col.brass, { gloss: .60 });
  shade(X0 + .30, WZ, .40, 1.50, .26, MATY + .006);
  // and the light it throws. mode 8 is the renderer's daylight patch — a defined rectangle with
  // the shadow of the mullion across it, not the soft round pool a lamp makes — and `sun: true`
  // fades it with the clock, so at ten at night the west end is lit only by the bulkheads.
  if (pool && M) {
    pool(M.trs(X0 + 1.05, MATY + .003, WZ, 0, 1.95, 1, WW + .55), C('#fff0cf'), .30, true, 8);
    pool(M.trs(X0 + 2.35, MATY + .003, WZ - .10, 0, 1.30, 1, WW + .20), C('#ffeecb'), .13, true, 8);
  }

  // =================================================================== the fire stair, east end
  //
  // Surface-mounted, and correctly so: this door never opens, so it wants no hole behind it. The
  // shell's east wall stays whole and the whole assembly stands in front of it at x < 6.0.
  const sf = x => X1 - x;
  for (const s of [-1, 1])
    box(sf(.045), Y + (STOP + .07) / 2, SZ + s * (SW / 2 + .035), .09, STOP + .07, .07, col.steelD,
        { hard: true, gloss: .30, ...MAT.metal });
  box(sf(.045), Y + STOP + .035, SZ, .09, .07, SW + .14, col.steelD,
      { hard: true, gloss: .30, ...MAT.metal });
  // the leaf: a painted steel fire door, closer arm across the head
  box(sf(.030), Y + (STOP - .04) / 2, SZ, .06, STOP - .04, SW - .05, C('#9aa0a2'),
      { hard: true, gloss: .26, tag: '楼梯', ...MAT.metal });
  box(sf(.062), Y + 1.34, SZ, .012, .70, SW - .17, C('#8b9294'), { hard: true, gloss: .24 });
  box(sf(.075), Y + 1.02, SZ - .30, .05, .05, .40, col.steelX, { hard: true, gloss: .5 });
  cyl(sf(.098), Y + 1.02, SZ - .30, .020, .09, col.steel, { rx: PI / 2, gloss: .55 });
  box(sf(.070), Y + STOP - .18, SZ + .22, .06, .05, .30, col.steelX, { hard: true, gloss: .45 });
  // the three things painted or stuck on every fire door here
  G(sf(.066), Y + 1.72, SZ, -PI / 2, '安全出口', { size: .085, gap: .016, color: col.green });
  G(sf(.066), Y + .62, SZ, -PI / 2, '禁止堆放杂物', { size: .056, gap: .012, color: col.redD });
  G(sf(.066), Y + .50, SZ, -PI / 2, '保持通道畅通', { size: .050, gap: .012, color: col.ink });
  // The 常闭 label goes below the vision panel, not on it: the panel occupies y 0.99 .. 1.69 and
  // z 4.31 .. 5.09, and a sticker inside that rectangle is a sticker on a sheet of glass.
  box(sf(.075), Y + .86, SZ + .30, .010, .17, .13, col.paper, { hard: true, gloss: .05 });
  G(sf(.088), Y + .90, SZ + .30, -PI / 2, '常闭', { size: .036, gap: .006, color: col.redD });
  G(sf(.088), Y + .82, SZ + .30, -PI / 2, '防火门', { size: .030, gap: .005, color: col.ink });

  // ---- 猫 at the fire-stair threshold (item 323). The stair beyond this 常闭 door is visual-only
  // and has no walkable zone, so an interactable behind it would be unreachable. This curled cat,
  // adapted from the static courtyard cat in js/street-west.js, is tucked against the south jamb
  // on the corridor side. It has no collider and therefore takes nothing out of the measured east
  // wing route; deck 2 falls through to the existing global 摸猫 action in js/data.js.
  const CX = X1 - .32, CZ = SZ - SW / 2 - .20, CT = { tag: '猫' };
  const catC = C('#716b60'), catD = C('#4d4942');
  ball(CX, FL + .105, CZ, .145, .095, .120, catC, { gloss: .14, ry: .6, ...CT });
  ball(CX + .10, FL + .098, CZ + .07, .062, .055, .058, catD, { gloss: .14, ry: .6, ...CT });
  for (const t of [-1, 1])
    ball(CX + .085 + t * .026, FL + .142, CZ + .055 + t * .014, .022, .026, .016, catD,
      { gloss: .14, ...CT });
  cap(CX - .04, FL + .055, CZ + .11, .026, .21, .026, catD,
    { rz: PI / 2, ry: 1.15, gloss: .14, ...CT });
  shade(CX, CZ, .42, .34, .28, MATY + .006);
  TH('猫', CX, FL + .30, CZ, '防火门边蜷着一只猫。',
    'A cat is curled up beside the fire door.',
    '一只猫 — 只 zhī is the measure word for most small animals.', 5.15, 4.03, 1.5);

  // =================================================================== 消火栓 the hose cabinet
  const HX = -5.05, HZ = ZS + .11;
  box(HX, Y + 1.14, HZ, .70, 1.00, .22, col.red, { hard: true, gloss: .30, tag: '消火栓' });
  box(HX, Y + 1.14, HZ + .112, .60, .90, .010, col.redD, { hard: true, gloss: .34, tag: '消火栓' });
  box(HX - .01, Y + 1.20, HZ + .118, .40, .58, .008, C('#5e737a'),
      { hard: true, gloss: .62, alpha: .38 });
  // the coiled hose you can just see through the glass, and the valve wheel
  cyl(HX - .01, Y + 1.20, HZ + .06, .17, .12, C('#8c1f18'), { rx: PI / 2, gloss: .18 });
  cyl(HX - .01, Y + 1.20, HZ + .09, .07, .07, col.redD, { rx: PI / 2, gloss: .3 });
  cyl(HX + .24, Y + .82, HZ + .10, .055, .022, col.steelD, { rx: PI / 2, gloss: .5 });
  G(HX, Y + 1.76, HZ + .112, 0, '消火栓', { size: .115, gap: .022, color: col.white });
  G(HX, Y + .70, HZ + .112, 0, '火警119', { size: .058, gap: .012, color: col.gold });
  // and the extinguisher standing beside it, because it never fits in the box
  cyl(HX + .50, FL + .27, ZS + .17, .075, .48, col.red, { gloss: .34 });
  taper(HX + .50, FL + .55, ZS + .17, .15, .10, .15, col.red, { gloss: .34 });
  cyl(HX + .50, FL + .63, ZS + .17, .020, .09, col.steelD, { gloss: .5 });
  box(HX + .50, FL + .30, ZS + .245, .11, .16, .012, col.white, { hard: true, gloss: .1 });
  shade(HX + .50, ZS + .17, .22, .22, .30, MATY + .006);
  // Its collider, which is also the west end of the parking strip. 0.34 m off the wall leaves the
  // west wing 4.12 .. 5.44 m to walk in, measured against ZPARK/ZSHOE below.
  stop(HX - .40, HX + .62, ZS, ZS + .34);

  // =================================================================== 公告栏 the notice board
  //
  // Glazed, screwed to the flat's wall directly opposite the lift doors, because that is where
  // people stand for ninety seconds twice a day and it is the only wall on this landing they are
  // facing while they do it. 70 mm deep, so it takes nothing off the 1.04 m strip.
  const PX = 1.35, PZ = ZS + .035;
  box(PX, Y + 1.52, PZ, 1.16, .86, .07, col.steelD,
      { hard: true, gloss: .32, tag: '通知', ...MAT.metal });
  // #ded9cb, not #efece3. A square metre of near-white matte board with a bulkhead a metre above
  // it clips, and a clipped matte surface is what the post chain's bright pass lets into the glow:
  // the blur comes back as a half-transparent copy of the corridor laid over the whole frame.
  box(PX, Y + 1.52, PZ + .040, 1.06, .76, .010, C('#ded9cb'), { hard: true, gloss: .10 });
  // Gloss .30, not .70. A square metre of glass at .70 with a bulkhead two metres in front of it
  // is a white rectangle from most of the corridor, and the whole point of the board is that the
  // Chinese on it can be read from where you wait for the lift.
  box(PX, Y + 1.52, PZ + .050, 1.06, .76, .006, C('#4b5a5f'),
      { hard: true, gloss: .30, alpha: .16 });
  box(PX, Y + 1.99, PZ + .010, 1.16, .12, .075, col.redD, { hard: true, gloss: .28 });
  G(PX, Y + 1.99, PZ + .052, 0, '楼 层 公 告 栏', { size: .062, gap: .022, color: col.gold });
  // Four sheets under the glass, taped up at different times by different people.
  const sheet = (sx, sy, w, h, tilt, lines) => {
    box(PX + sx, Y + 1.52 + sy, PZ + .044, w, h, .004, C('#e4dcc6'),
        { hard: true, gloss: .04, ry: tilt });
    // The ink goes *under* the glass, not on it: `glyphs` pushes its quads 12 mm along the yaw,
    // so a line written at the paper's own depth would surface 6 mm in front of the pane.
    let ly = 1.52 + sy + h / 2 - .07;
    for (const [t, s, c] of lines) {
      G(PX + sx, Y + ly, PZ + .028, 0, t, { size: s, gap: s * .18, color: c });
      ly -= s + .028;
    }
  };
  sheet(-.36, .10, .40, .48, .015, [
    ['通知', .056, col.redD],
    ['本周六停水', .036, col.ink],
    ['八点至十六点', .030, col.ink],
    ['请提前储水', .030, col.ink],
    ['物业管理处', .024, col.grey]]);
  sheet(.10, .12, .38, .44, -.02, [
    ['温馨提示', .046, C('#1d5c8a')],
    ['电动车严禁', .030, col.ink],
    ['楼道内充电', .030, col.ink],
    ['请到车棚', .026, col.grey]]);
  sheet(.44, .08, .30, .36, .03, [
    ['电梯年检', .040, col.ink],
    ['三月十二日', .026, col.ink],
    ['暂停使用', .026, col.grey]]);
  sheet(-.32, -.24, .36, .22, -.01, [
    ['招领', .036, col.ink],
    ['拾到钥匙一串', .022, col.grey]]);
  sheet(.16, -.26, .40, .20, .02, [
    ['楼道灯已修好', .030, col.ink],
    ['声控 人走灯灭', .022, col.grey]]);

  // =================================================================== 广告灯箱 the lit ad frame
  //
  // The 物业 sells the wall beside the lift, and this is what is on it: an invented estate agent,
  // back-lit, the one warm thing in a corridor of cold tubes. 0.42 x 0.60 = 0.25 m2, so glow .05.
  //
  // THREE advertisers, not one. The 物业 sells this slot by the month and the frame outside every
  // landing had the same estate agent in it, twelve storeys of one poster — which reads as a
  // texture repeat rather than as a building. The slot is keyed to the deck, so a player who walks
  // the stairs sees the wall change hands. All three names are invented; no real brand appears
  // anywhere in this game.
  const ADS = [
    ['安居房产', '本小区二手房', '租售登记',   '八八六二七', C('#8f2c22')],
    ['万家家政', '钟点保洁月嫂', '上门登记',   '七三四九一', C('#2b5f4a')],
    ['顺路搬家', '楼上楼下小件', '随叫随到',   '五二八八零', C('#1d4f7a')],
  ];
  const AD = ADS[DECKNO % ADS.length];
  const AX = -0.55;
  box(AX, Y + 1.46, ZS + .035, .50, .70, .07, col.steelX, { hard: true, gloss: .40, ...MAT.metal });
  box(AX, Y + 1.46, ZS + .078, .42, .60, .006, C('#f2e7c8'), { hard: true, mode: 1, glow: .05 });
  G(AX, Y + 1.66, ZS + .090, 0, AD[0], { size: .054, gap: .012, color: AD[4] });
  G(AX, Y + 1.56, ZS + .090, 0, AD[1], { size: .034, gap: .007, color: C('#3a3a3a') });
  G(AX, Y + 1.48, ZS + .090, 0, AD[2], { size: .034, gap: .007, color: C('#3a3a3a') });
  G(AX, Y + 1.34, ZS + .090, 0, AD[3], { size: .040, gap: .009, color: C('#1d5c8a') });
  G(AX, Y + 1.24, ZS + .090, 0, '一楼大堂', { size: .026, gap: .006, color: C('#6a6a6a') });

  // =================================================================== 电表箱 the meter bank
  //
  // The block's own bank, on the stretch of the flat's wall east of your door — three-phase, six
  // meters, one per flat on the landing, and the seal wire on the cover nobody has ever broken.
  const MX = 5.20, MZ = ZS + .07;
  box(MX, Y + 1.42, MZ, 1.00, 1.06, .14, col.steelD,
      { hard: true, gloss: .34, tag: '电表', ...MAT.metal });
  box(MX, Y + 1.42, MZ + .075, .92, .96, .012, col.steelX, { hard: true, gloss: .30 });
  const READ = [[FN(1), '0427'], [FN(2), '0726'], [FN(3), '1025'],
                [FN(4), '3081'], [FN(5), '0914'], [FN(6), '2260']];
  READ.forEach(([no, n], i) => {
    const mx2 = MX - .23 + (i % 2) * .46, my = 1.72 - Math.floor(i / 2) * .30;
    box(mx2, Y + my, MZ + .083, .38, .24, .010, C('#e2ded2'), { hard: true, gloss: .22 });
    box(mx2 - .05, Y + my + .015, MZ + .090, .21, .10, .008, C('#1c2226'), { hard: true, gloss: .55 });
    G(mx2 - .05, Y + my + .015, MZ + .098, 0, n,
      { size: .042, gap: .007, color: C('#cfe3d6'), mode: 1 });
    G(mx2 - .12, Y + my - .075, MZ + .092, 0, no, { size: .030, gap: .005, color: col.ink });
    cyl(mx2 + .13, Y + my + .015, MZ + .090, .009, .008, C('#d84a3a'),
        { rz: PI / 2, mode: 1, glow: .14 });
  });
  G(MX, Y + 2.02, MZ + .076, 0, '电表箱', { size: .062, gap: .012, color: col.white });
  box(MX + .38, Y + .90, MZ + .078, .10, .16, .012, C('#d9d2bd'), { hard: true, gloss: .10 });
  G(MX + .38, Y + .92, MZ + .088, 0, '有电', { size: .026, gap: .005, color: col.redD });
  // the white PVC trunking dropping into it out of the ceiling
  box(MX - .30, Y + 2.35, MZ + .010, .10, .60, .05, col.white, { hard: true, gloss: .12 });
  box(MX + .30, Y + 2.35, MZ + .010, .10, .60, .05, col.white, { hard: true, gloss: .12 });

  // --- the floor number, stencilled straight onto the plaster opposite the lift doors. The shell
  // lights a 二 over the leaves; this is the one you read while you are waiting, and it is the
  // thing that tells a player who has just pressed 2 in the car that they got out on the right
  // deck. Grey on cream, big, and painted rather than screwed on, because that is how it is done.
  G(2.62, Y + 1.82, ZS + .022, 0, '2', { size: .40, color: C('#98a0a2'), gloss: .04 });
  G(2.62, Y + 1.46, ZS + .022, 0, '二层', { size: .080, gap: .022, color: C('#98a0a2') });

  // --- 烟感, the smoke detectors. Two in the middle and one in each wing, set clear of the
  // sprinkler main so that the two services do not share a line down the ceiling.
  for (const [dx, dz] of [[-4.90, 4.20], [-1.90, 4.72], [0.40, 4.62], [2.30, 4.30], [5.30, 4.20]]) {
    cyl(dx, CY - .022, dz, .085, .034, C('#eae6db'), { gloss: .18 });
    cyl(dx, CY - .046, dz, .050, .014, C('#c9c4b7'), { gloss: .14 });
    cyl(dx + .05, CY - .046, dz, .006, .006, C('#d84a3a'), { rz: PI / 2, mode: 1, glow: .10 });
  }

  // --- 小广告. Stamped in red ink on the paint at hand height, scrubbed at once and never gone.
  const ad = (x, y, z, sgn, t, s, c) =>
    G(x, Y + y, z + sgn * .022, sgn > 0 ? 0 : PI, t, { size: s, gap: s * .16, color: C(c),
                                                       gloss: .04 });
  ad(-4.05, 1.32, ZS, 1, '开锁', .062, '#a8352a');
  ad(-4.05, 1.24, ZS, 1, '80261', .040, '#a8352a');
  ad(-2.62, 1.28, ZS, 1, '疏通下水道', .050, '#96463a');
  ad(0.62, 1.36, ZS, 1, '搬家', .058, '#9c4034');
  ad(2.62, 1.30, ZS, 1, '开锁换锁', .050, '#a8352a');
  ad(3.05, 1.14, ZS, 1, '家政保洁', .038, '#8a5a4a');
  // On the north wall these have to sit in the 1.12 .. 1.30 band: the dado tops out at 1.12, the
  // rub line runs at 1.33 and every door's meter cupboard hangs from 1.34 to 1.66.
  ad(-2.30, 1.22, ZN, -1, '收旧家电', .046, '#9c4034');
  ad(4.58, 1.24, ZS, 1, '通下水', .036, '#96463a');

  // =================================================================== what the corridor stores
  //
  // Two rules, and everything below obeys both. Nothing gets a collider in the middle strip
  // (x -0.80 .. 3.80), because that strip is 1.04 m wide and has none to spare. In the wings,
  // south-wall colliders stop at ZPARK and north-wall ones start at ZSHOE, which leaves a
  // 1.30 m walkway from end to end — wider than the lift lobby it joins.

  // --- 电动车. The e-bike, on charge off an extension lead run out of somebody's flat, directly
  // under the notice on the board that says not to. That is the joke and it is also the truth.
  (function ebike() {
    const ex = -3.55, ez = ZS + .30;
    // ---- 限期清理
    //
    // The building states the rule four times — 电动车严禁 on the board at the west end, 电动车禁止
    // 入楼 on the porch door (js/street-entry.js), 楼道禁停电动车 on the lobby notice board
    // (js/home-lobby.js), and the sign directly over this bike — and for as long as it has existed
    // nothing has ever happened. A rule stated four times and enforced zero times is not a joke
    // about 物业, it is a building with no consequences in it.
    //
    // So: a dated clearance slip, taped to the leg shield. It is the step that actually comes
    // before a bike disappears, it is a real piece of Beijing paper, and it puts a date and a
    // deadline in front of the player on a surface they walk past twice a day. The bike going a
    // week later is the other half and belongs to whichever lane owns js/disrupt.js — recorded in
    // .reports/data-rows-queue.md under item 90, because that file is nobody's in this wave.
    box(ex - .42, FL + .62, ez - .09, .012, .26, .19, C('#f2ecdc'),
        { hard: true, mode: 1, gloss: .06, ry: .07, tag: '电动车' });
    G(ex - .428, FL + .70, ez - .09, -PI / 2, '限期清理',
      { size: .034, gap: .006, color: C('#a8352a'), gloss: .06, lift: .004, tag: '电动车' });
    G(ex - .428, FL + .645, ez - .09, -PI / 2, '三日内自行挪走',
      { size: .019, gap: .003, color: C('#3a3832'), gloss: .06, lift: .004, tag: '电动车' });
    G(ex - .428, FL + .585, ez - .09, -PI / 2, '物业',
      { size: .019, gap: .003, color: C('#3a3832'), gloss: .06, lift: .004, tag: '电动车' });
    for (const dx of [-.56, .50]) {
      cyl(ex + dx, FL + .245, ez, .245, .085, col.rubber, { rx: PI / 2, gloss: .20, tag: '电动车' });
      cyl(ex + dx, FL + .245, ez, .150, .090, C('#5a6064'), { rx: PI / 2, gloss: .34 });
      cyl(ex + dx, FL + .245, ez, .040, .105, col.steel, { rx: PI / 2, gloss: .5 });
    }
    // A 电动车 is a step-through: a low footboard between the wheels, a leg-shield standing up in
    // front of it, the battery box and seat behind. Built as those four pieces rather than as one
    // long capsule — a capsule scaled 1.02 x 0.17 x 0.30 is not a moped, it is a bath.
    box(ex - .02, FL + .16, ez, .62, .09, .34, C('#3a4045'), { gloss: .26, tag: '电动车' });
    box(ex - .40, FL + .52, ez, .16, .74, .34, C('#e2e6e4'), { gloss: .34, ry: .0,
                                                               tag: '电动车' });
    box(ex - .34, FL + .86, ez, .22, .10, .32, C('#e2e6e4'), { gloss: .34 });
    box(ex + .28, FL + .48, ez, .50, .42, .32, C('#dfe3e1'), { gloss: .32, tag: '电动车' });
    cap(ex + .30, FL + .74, ez, .46, .13, .29, C('#25292c'), { gloss: .22 });   // the seat
    box(ex + .56, FL + .60, ez, .10, .24, .28, C('#c9433a'), { gloss: .30 });   // tail light panel
    cyl(ex - .46, FL + .82, ez, .020, .48, col.steelD, { rz: -.14, gloss: .42 });
    cyl(ex - .56, FL + 1.04, ez, .016, .54, col.steelD, { rx: PI / 2, gloss: .45 });
    for (const s of [-1, 1])
      cyl(ex - .56, FL + 1.04, ez + s * .22, .022, .11, C('#2c3033'), { rx: PI / 2, gloss: .16 });
    box(ex - .50, FL + 1.00, ez, .06, .10, .16, C('#20252a'), { hard: true, gloss: .40 });
    ball(ex - .48, FL + .74, ez, .050, .042, .075, C('#f3ecd2'), { mode: 1, glow: .04, gloss: .5 });
    box(ex - .60, FL + .40, ez, .24, .22, .26, C('#8c9298'), { gloss: .28 });   // front basket
    // the cable, and the lead running back to a socket somebody drilled through the wall
    cyl(ex + .18, FL + .30, ez - .16, .012, .30, C('#2a2e31'), { rz: .8, gloss: .30 });
    box(ex + .74, FL + .16, ZS + .09, .09, .14, .07, C('#d8d4c8'), { hard: true, gloss: .20 });
    cyl(ex + .74, FL + .70, ZS + .07, .009, 1.06, C('#d8d4c8'), { gloss: .22 });
    box(ex + .74, FL + 1.28, ZS + .07, .11, .16, .06, C('#e4e0d4'), { hard: true, gloss: .22 });
    cyl(ex + .74, FL + 1.32, ZS + .045, .008, .008, C('#5ad07a'), { rz: PI / 2, mode: 1, glow: .16 });
    shade(ex, ez, 1.55, .48, .34, MATY + .006);
  })();
  stop(-4.42, -2.78, ZS, ZPARK);

  // --- 自行车, leant against the flat's wall with its pedal against the skirting. A bicycle here
  // is a flat thing seen side-on: 1.6 m along the wall and barely 60 mm off it.
  const BX = -2.05, BZ = ZS + .30;
  (function bicycle() {
    const lean = .07;
    for (const dx of [-.52, .52]) {
      cyl(BX + dx, FL + .34, BZ + .02, .335, .055, col.rubber,
          { rx: PI / 2, rz: lean, gloss: .18, tag: '自行车' });
      cyl(BX + dx, FL + .34, BZ + .02, .285, .060, C('#5a6064'), { rx: PI / 2, rz: lean, gloss: .30 });
      cyl(BX + dx, FL + .34, BZ + .02, .045, .075, col.steel, { rx: PI / 2, rz: lean, gloss: .5 });
      for (let i = 0; i < 6; i++)
        box(BX + dx, FL + .34, BZ + .02, .012, .56, .012, col.steel,
            { hard: true, rz: i * PI / 6 + lean, rx: 0, gloss: .45 });
    }
    // frame: a diamond of tubes, plus fork, chainstay, seat post and bars
    const tube = (x1b, y1, x2b, y2, c = col.navy) => {
      const dx = x2b - x1b, dy = y2 - y1, L = Math.hypot(dx, dy);
      cyl((x1b + x2b) / 2, (y1 + y2) / 2, BZ + .02, .020, L, c,
          { rz: Math.atan2(dx, dy), gloss: .42, tag: '自行车' });
    };
    tube(BX - .52, FL + .34, BX - .06, FL + .93);
    tube(BX - .06, FL + .93, BX + .30, FL + .93);
    tube(BX - .06, FL + .93, BX + .06, FL + .30);
    tube(BX + .06, FL + .30, BX + .52, FL + .34);
    tube(BX + .30, FL + .93, BX + .06, FL + .30);
    tube(BX + .30, FL + .93, BX + .52, FL + .34);
    tube(BX - .52, FL + .34, BX - .40, FL + .98, col.steelD);
    // saddle, bars, basket, chainring
    cap(BX + .32, FL + 1.01, BZ + .02, .22, .07, .11, C('#22262a'), { gloss: .16 });
    cyl(BX - .40, FL + 1.02, BZ + .02, .016, .40, col.steelD, { rx: PI / 2, gloss: .45 });
    box(BX - .42, FL + .84, BZ + .02, .26, .24, .22, C('#5d6367'), { gloss: .3 });
    cyl(BX + .06, FL + .30, BZ + .055, .095, .020, col.steelX, { rx: PI / 2, gloss: .5 });
    // a plastic bag knotted on the bars, which is where they all live
    ball(BX - .34, FL + .96, BZ - .10, .075, .085, .065, C('#dfe4e0'), { gloss: .22, alpha: .92 });
    // and the lock, looped through the frame and left hanging
    cyl(BX + .06, FL + .58, BZ - .05, .012, .30, C('#2e3236'), { rz: .5, gloss: .30 });
    shade(BX, BZ, 1.34, .44, .32, MATY + .006);
  })();
  stop(BX - .78, BX + .78, ZS, ZPARK);

  // --- 婴儿车, folded and leaning on the north wall in the pier between 205 and 206, which is
  // 0.61 m of wall and exactly what a folded pushchair takes.
  const UX = (D205 + D206) / 2;
  (function pushchair() {
    const pz = ZN - .19;
    box(UX, FL + .58, pz, .30, 1.02, .26, col.navy, { gloss: .18, rz: .09, tag: '婴儿车' });
    box(UX + .03, FL + 1.02, pz - .02, .34, .30, .22, C('#3a4b63'), { gloss: .18, rz: .09 });
    cyl(UX - .12, FL + 1.14, pz, .014, .30, col.steelD, { rz: PI / 2 + .09, gloss: .45 });
    for (const [ox, oy] of [[-.13, .10], [.13, .13]]) {
      cyl(UX + ox, FL + oy, pz - .07, .065, .045, col.rubber, { rx: PI / 2, gloss: .2 });
      cyl(UX + ox, FL + oy, pz + .07, .065, .045, col.rubber, { rx: PI / 2, gloss: .2 });
    }
    box(UX + .18, FL + .28, pz + .02, .18, .22, .17, col.pink, { gloss: .12 });
    // a child's scooter beside it, which is the other half of that household
    cyl(UX - .24, FL + .34, ZN - .26, .014, .62, C('#c93f3a'), { rz: .16, gloss: .34 });
    box(UX - .30, FL + .07, ZN - .26, .11, .04, .42, C('#c93f3a'), { hard: true, gloss: .3 });
    cyl(UX - .24, FL + .64, ZN - .26, .012, .26, C('#2c3033'), { rx: PI / 2, rz: .16, gloss: .4 });
    for (const dz of [-.16, .16])
      cyl(UX - .30, FL + .045, ZN - .26 + dz, .045, .022, C('#e8c34a'), { rx: PI / 2, gloss: .3 });
    shade(UX - .04, ZN - .22, .62, .42, .30, MATY + .006);
  })();
  stop(UX - .32, UX + .30, ZSHOE, ZN);

  // --- shoes, and the rack they overflowed from, in the pier between 204 and 205. Nobody's shoes
  // come in: the 玄关 inside is a metre square and there are four of them in that flat.
  const KX = (D204 + D205) / 2;
  (function shoes() {
    const rz = ZN - .17;
    for (const ry2 of [.16, .48, .80]) {
      box(KX, FL + ry2, rz, .56, .022, .26, col.steelD, { hard: true, gloss: .4, tag: '鞋' });
      for (const s of [-1, 1])
        cyl(KX + s * .25, FL + ry2 / 2, rz, .010, ry2, col.steelD, { gloss: .4 });
    }
    // a pair on each shelf, standing on it rather than sunk into it
    for (const [sy, c] of [[.182, C('#2c3238')], [.502, C('#a8442f')], [.822, C('#3d5470')]])
      pairOf(KX, FL + sy, rz, .245, c, 0, C('#1a1d20'));
    // and the two pairs on the floor that never made it onto them
    pairOf(KX - .21, FL + .004, ZN - .35, .215, C('#cfa0a8'), .22, C('#a87b83'));
    pairOf(KX + .22, FL + .004, ZN - .33, .155, C('#d0c14f'), -.30, C('#a89a3c'));
    shade(KX, ZN - .26, .74, .42, .26, MATY + .006);
  })();
  stop(KX - .32, KX + .32, ZSHOE, ZN);

  // --- the cardboard for recycling, the bag of bottles beside it, and the mop. Every corridor of
  // this kind has all three, and the cardboard is always somebody's delivery from last month.
  const JX = (D206 + LB.x0) / 2 - .06;
  (function junk() {
    for (const [i, w, d, h2] of [[0, .46, .34, .30], [1, .40, .30, .24], [2, .32, .26, .18]]) {
      const yb = FL + [0, .30, .54][i];
      box(JX - i * .02, yb + h2 / 2, ZN - .23, w, h2, d, col.card,
          { gloss: .08, ry: i * .06, tag: '垃圾' });
      box(JX - i * .02, yb + h2 - .002, ZN - .23, w - .05, .012, d - .05, C('#c49d72'),
          { hard: true, gloss: .06, ry: i * .06 });
    }
    G(JX, FL + .16, ZN - .405, PI, '易碎', { size: .052, gap: .010, color: C('#8a6a45') });
    // the bag of bottles, tied at the neck
    ball(JX + .30, FL + .18, ZN - .26, .15, .18, .13, C('#d9e0d6'),
         { gloss: .24, alpha: .90, tag: '垃圾' });
    cap(JX + .30, FL + .38, ZN - .26, .05, .10, .05, C('#d9e0d6'), { gloss: .24, alpha: .90 });
    for (const [bx, bz, bc] of [[-.05, -.02, '#7fa06a'], [.04, .03, '#cfd6cc'], [.00, -.06, '#8aa9c0']])
      cyl(JX + .30 + bx, FL + .16, ZN - .26 + bz, .030, .20, C(bc), { rz: .3, gloss: .4, alpha: .8 });
    shade(JX + .06, ZN - .24, .84, .42, .32, MATY + .006);
  })();
  stop(JX - .28, JX + .48, ZSHOE, ZN);

  // --- the cleaner's corner, north-west, behind the reach of the body and all the better for it.
  (function cleaner() {
    const mx = X0 + .34, mz = ZN - .40;
    cyl(mx, FL + .69, mz, .014, 1.34, C('#9a7c4e'), { rz: .10, gloss: .18 });
    cap(mx - .13, FL + .10, mz, .10, .16, .22, C('#d8d3c2'), { gloss: .06 });
    cyl(mx + .34, FL + .13, mz - .06, .135, .26, col.plastic, { gloss: .28 });
    cyl(mx + .34, FL + .255, mz - .06, .118, .012, C('#8d9aa0'), { gloss: .30 });
    cyl(mx + .34, FL + .30, mz - .06, .012, .012, col.steelD, { rz: PI / 2, gloss: .45 });
    // a folded drying rack leaning in the very corner
    for (const s of [-1, 1])
      cyl(X0 + .22, FL + .58, ZN - .16 + s * .07, .014, 1.16, col.alu, { rz: .13, gloss: .40 });
    for (let i = 0; i < 5; i++)
      cyl(X0 + .22 + i * .006, FL + .28 + i * .19, ZN - .16, .008, .16, col.alu,
          { rx: PI / 2, gloss: .40 });
    shade(X0 + .40, ZN - .34, .70, .52, .30, MATY + .006);
  })();

  // --- what stands outside your own end of the landing. Shoes at 201 and a parcel at 203, so the
  // end of the corridor you actually arrive at is the one with the most life on the floor.
  pairOf(D201 - .30, FL + .004, ZN - .31, .255, C('#4a4438'), .16, C('#2b2620'));
  pairOf(D201 + .28, FL + .004, ZN - .28, .200, C('#8d95a0'), -.24, C('#5f666e'));
  shade(D201 - .30, ZN - .31, .52, .32, .22, MATY + .006);
  shade(D201 + .28, ZN - .28, .44, .28, .20, MATY + .006);
  stop(D201 - .48, D201 + .46, ZSHOE + .10, ZN);
  // 快递 — the parcel left against 203's frame, addressed and already signed for
  box(D203 - .30, FL + .13, ZN - .30, .34, .26, .28, C('#c0a077'), { gloss: .08, ry: -.12,
                                                                     tag: '快递' });
  box(D203 - .30, FL + .262, ZN - .30, .30, .012, .24, C('#cdae86'),
      { hard: true, gloss: .06, ry: -.12 });
  // The waybill, and the whole point of it is the flat number. A parcel with 快递 stencilled on it
  // is scenery; a parcel with YOUR door on the label is a thing you have to do something about. It
  // is against 203's frame because that is where a courier leaves it when nobody is in at 202 —
  // one door out, which is the ordinary way this goes wrong and the reason to pick it up. The
  // 取件码 is the same word that is already on the lockers by the lift, so the two objects join.
  //
  // This module builds deck 2 (DECK_OF.corridor), so 二零二 is literal rather than off FN(2): the
  // glyph atlas is Chinese, and 收件人 lines are written in characters on a real waybill anyway.
  G(D203 - .30, FL + .225, ZN - .462, PI, '快递', { size: .030, gap: .006, color: C('#7a4a2a') });
  box(D203 - .30, FL + .118, ZN - .445, .17, .115, .010, col.paper, { hard: true, gloss: .05,
                                                                      ry: -.12 });
  G(D203 - .30, FL + .155, ZN - .462, PI, '收件人', { size: .019, gap: .004, color: C('#3a3630') });
  G(D203 - .30, FL + .122, ZN - .462, PI, '二零二室', { size: .022, gap: .004, color: C('#1d2226') });
  G(D203 - .30, FL + .088, ZN - .462, PI, '取件码四七', { size: .015, gap: .003, color: C('#6a6660') });
  shade(D203 - .30, ZN - .30, .46, .38, .28, MATY + .006);
  stop(D203 - .52, D203 - .08, ZSHOE + .12, ZN);
  // and the pot plant in the north-east corner, which is outside the body's reach anyway
  cyl(X1 - .30, FL + .14, ZN - .28, .13, .28, col.terra, { gloss: .18 });
  for (let i = 0; i < 7; i++)
    cap(X1 - .30 + Math.cos(i * 1.9) * .06, FL + .40, ZN - .28 + Math.sin(i * 1.9) * .06,
        .04, .34, .04, i % 3 ? col.leaf : C('#3d6a3a'), { rz: Math.cos(i) * .28, gloss: .12 });
  shade(X1 - .30, ZN - .28, .38, .38, .28, MATY + .006);

  // --- a folding stool by the window that nobody has moved since the last power cut, and the
  // thermos that lives beside it.
  // In the south-west corner, not under the hose cabinet: at x = X0 + 1.05 the stool stood inside
  // the cabinet's footprint and its red thermos sat 100 mm from the red extinguisher, which read
  // as two extinguishers rather than as anything anybody had left there.
  (function stool() {
    const sx = X0 + .42, sz = ZS + .42;
    box(sx, FL + .38, sz, .32, .04, .28, C('#8a5f3c'), { gloss: .16 });
    for (const [sx2, sz2] of [[-.12, -.10], [.12, -.10], [-.12, .10], [.12, .10]])
      cyl(sx + sx2, FL + .19, sz + sz2, .014, .38, col.steelD, { gloss: .42 });
    // 暖水瓶, in the bamboo-and-enamel cream every one of these is, with one red band. Not red:
    // there is a fire extinguisher a metre away and two red cylinders side by side read as two
    // extinguishers, which is the one thing a thermos must not look like.
    cyl(sx + .30, FL + .17, sz - .04, .055, .34, C('#ded4b4'), { gloss: .26 });
    cyl(sx + .30, FL + .22, sz - .04, .057, .05, C('#a83f34'), { gloss: .28 });
    cyl(sx + .30, FL + .35, sz - .04, .038, .05, C('#e8e3d4'), { gloss: .22 });
    cap(sx + .30, FL + .26, sz + .04, .05, .09, .03, C('#8a7a52'), { gloss: .26 });
    shade(sx + .08, sz, .64, .34, .28, MATY + .006);
  })();

  // --- an umbrella hooked on 206's handle, where wet ones go and never come back
  cyl(D206 + .40, FL + .40, ZN - .09, .026, .78, C('#39515f'), { rz: .12, gloss: .22, tag: '雨伞' });
  cyl(D206 + .40, FL + .80, ZN - .09, .014, .10, C('#8c6b3e'), { rz: .12, gloss: .3 });

  // --- the floor itself. The shell lays 12 x 3 m of terrazzo slab and it is uniformly clean,
  // which no corridor is. A chain of very low contact shadows down the middle of the run is the
  // whole of the trick: the line people actually walk goes grey, the corners stay pale, and the
  // floor stops being a texture and becomes a floor. `shade` is a decal, so none of this can
  // z-fight with the slab under it.
  for (let i = 0; i < 9; i++)
    shade(X0 + 1.0 + i * 1.35, 4.05 + Math.sin(i * 1.7) * .16, 1.90, 1.15, .075, MATY + .001);
  for (const [sx, sz2] of [[-4.20, 4.95], [-2.40, 4.95], [4.30, 4.95], [5.20, 4.90]])
    shade(sx, sz2, 1.30, 1.10, .055, MATY + .001);        // the worn arcs in front of the doors
  shade(2.50, 4.35, 2.00, 1.30, .085, MATY + .001);       // and the darkest patch, at the lift

  // =================================================================== the words
  //
  // Every focus below is a spot the body can genuinely stand on, checked against the five walk
  // numbers at the head of this file and against this file's own colliders:
  //
  //   middle strip  x -0.80 .. 3.80   z 3.56 .. 4.60      (the shafts are the north edge)
  //   west wing     x -5.60 .. -0.80  z 4.12 .. 5.44      (parking one side, shoes the other)
  //   east wing     x  3.80 .. 5.60   z 3.56 .. 5.50
  //
  // A word focused outside those is a word that never lights up, from any angle, ever.
  TH('走廊', 0.60, Y + 1.60, 4.20, '走廊里堆满了东西。',
     'The corridor is piled with things.',
     '走 walk + 廊 covered passage. A corridor here is also storage.', 0.60, 4.15, 3.4, '走廊');
  TH('门', FX, Y + 1.20, ZS + .10, '这是我家的门。', 'This is my front door.',
     '门 is a door or a gate — and the 门 in 门口, the doorway.', FX, 3.95, 1.9);
  // ---- five doors, five answers
  //
  // There was one neighbour interactable for six doors, so five of them could not be knocked on at
  // all and the sixth answered for the whole landing. Worse, the shared USE row replies 敲了敲门，里面没有
  // 人应 — nobody is ever in, at any hour, behind any of them, on a landing the file itself has
  // written six separate households onto: couplets up all year on 201, a delivery sticker on 203,
  // the oldest paint on the landing on 204, the family with the pushchair on 205, everybody's
  // small ads on 206. Each has its own line now, and each is registered against its own leaf.
  //
  // `pick` resolves a ray to a tag and then to the nearest thing wearing it, so five things all
  // tagged 邻居 sort themselves by the door you are standing at. One `TH` per door is the whole
  // mechanism — there is nothing to add in js/data.js for this half of it.
  // Written out one per door rather than looped, because each line is the door's own fact and the
  // next person to change one of them should not have to read a table to find it.
  const NB_NOTE = '邻 neighbouring + 居 to dwell. 对门 is the one straight across from your own.';
  TH('邻居', D201, Y + 1.30, ZN - .10, '我的邻居住在' + FN(1) + '，对门。',
     'My neighbour lives in ' + FN(1) + ', straight across.', NB_NOTE, D201, 5.05, 1.5, '邻居');
  TH('邻居', D203, Y + 1.30, ZN - .10, FN(3) + '的门上贴着快递单。',
     'There is a delivery slip on the door of ' + FN(3) + '.', NB_NOTE, D203, 5.05, 1.5, '邻居');
  TH('邻居', D204, Y + 1.30, ZN - .10, FN(4) + '的春联是去年的了。',
     'The couplets on ' + FN(4) + ' are last year\'s.', NB_NOTE, D204, 4.60, 1.5, '邻居');
  TH('邻居', D205, Y + 1.30, ZN - .10, FN(5) + '有小孩，门口放着婴儿车。',
     'There are children in ' + FN(5) + '; the pushchair is by the door.',
     NB_NOTE, D205, 4.60, 1.5, '邻居');
  TH('邻居', D206, Y + 1.30, ZN - .10, FN(6) + '的门上全是小广告。',
     'The door of ' + FN(6) + ' is covered in small ads.', NB_NOTE, D206, 4.60, 1.5, '邻居');
  TH('春联', D205 - .58, Y + 1.48, ZN - .06, '邻居贴了春联。', 'The neighbours put up couplets.',
     '春 spring + 联 a matched pair of lines, pasted at 春节.', D205 - .40, 4.95, 2.0);
  TH('电表', MX, Y + 1.50, MZ + .09, '电表箱在我家门旁边。', 'The meter box is beside my door.',
     '电 electricity + 表 gauge. One row per flat on the landing.', MX, 4.00, 2.0);
  TH('安全出口', X1 - .10, Y + STOP + .19, SZ, '安全出口在那边。', 'The emergency exit is over there.',
     '安全 safe + 出口 exit. The green sign is the same in every building.', 5.25, 4.70, 2.3);
  TH('楼梯', X1 - .10, Y + 1.10, SZ, '楼梯在走廊的东头。',
     'The stairs are at the east end of the corridor.',
     '楼 storey + 梯 ladder. 楼梯 you climb; 电梯 climbs for you.', 5.25, 4.70, 2.1);
  TH('鞋', KX, Y + .45, ZN - .26, '门口放着好几双鞋。',
     'Several pairs of shoes sit by the door.',
     '鞋 shoe. They stay outside the door, not inside the flat.', KX, 4.95, 2.0);
  // 电梯 is owned by the shell landing.  A second word here put two usable call targets on
  // F2 (and, before shell targets were deck-stamped, let an arbitrary floor's target win picking).
  TH('消火栓', HX, Y + 1.40, HZ + .12, '墙上有一个消火栓。',
     'There is a fire hydrant on the wall.',
     '消 extinguish + 火 fire + 栓 a plug or valve.', HX, 4.35, 2.0);
  TH('自行车', BX, Y + .80, BZ + .10, '走廊里停着一辆自行车。',
     'A bicycle is parked in the corridor.',
     '自 self + 行 travel + 车 vehicle.', BX, 4.45, 2.0);
  TH('电动车', -3.55, Y + .70, ZS + .32, '有人在楼道里给电动车充电。',
     'Someone is charging an e-bike in the corridor.',
     '电动 electric-powered + 车 vehicle. The notice on the board says not to.', -3.55, 4.50, 2.0);
  TH('窗户', X0 + .16, Y + 1.55, WZ, '走廊尽头有一扇窗户。',
     'There is a window at the end of the corridor.',
     '窗 window + 户 door-leaf; together, the fitting.', X0 + .75, WZ, 2.0);
  TH('通知', PX, Y + 1.55, PZ + .06, '公告栏上贴了一张通知。', 'A notice is up on the board.',
     '通 to pass through + 知 to know: to inform.', PX, 4.10, 2.0);
  TH('婴儿车', UX, Y + .60, ZN - .30, '走廊里放着一辆婴儿车。',
     'A pushchair is folded up in the corridor.',
     '婴儿 infant + 车 vehicle.', UX, 4.95, 2.0);
  TH('垃圾', JX + .10, Y + .40, ZN - .28, '纸箱和空瓶子等着扔。',
     'Cardboard and empty bottles are waiting to go out.',
     '垃圾 rubbish. 可回收 is what the green bin downstairs is for.', -1.20, 5.00, 2.0);
  TH('快递', D203 - .30, Y + .30, ZN - .34, '门口有一个快递。', 'There is a parcel by the door.',
     '快 fast + 递 to deliver: a courier delivery, and the parcel itself.', D203 - .30, 4.95, 2.0);
  TH('灯', 1.30, CY - .12, 4.20, '楼道的灯是声控的。', 'The corridor light is sound-operated.',
     '声控 sound-controlled: clap, or just walk loudly, and it comes on.', 1.30, 4.15, 2.4);
  TH('雨伞', D206 + .40, Y + .60, ZN - .12, '门口挂着一把雨伞。',
     'An umbrella hangs by the door.',
     '雨 rain + 伞 umbrella. It is left outside because it is still wet.', D206 + .40, 4.95, 2.0);
};

// ---------------------------------------------------------------------------------------------
// WHAT THE SHELL OWES THIS FLOOR, kept here rather than in a report that will be lost.
//
// The two blockers this note used to carry are both FIXED, and the arithmetic is recorded because
// it is the thing that gets undone:
//
//   1. THE CORRIDOR IS PASSABLE. CORR is z 3.20 .. 6.20 and both shafts stand at z 4.90 .. 6.20.
//      `clampMove` inflates every collider by the 0.30 m body radius, so the flat's wall
//      (stopAt z 3.11 .. 3.26) pushes the body to z > 3.56 and the shaft piers (stopAt from
//      z 4.90) to z < 4.60 — 1.04 m of standing room across the front of the lifts, and 2.24 m
//      in the two wings, where nothing stands against the north wall. It was 0.14 m at z0 = 4.00
//      and negative at 3.60, and both times the whole floor was unreachable. Anything that moves
//      the shafts south again re-breaks it; the number to keep is shaft z0 >= CORR.z0 + 1.34.
//
//   2. LIFT_B's FRONT FACE FACES THE CORRIDOR. `buildShafts` closes it with Math.PI, which is the
//      -z side, which is the only side a body can stand on. The plaster panel this file used to
//      carry 12 mm in front of it is gone.
//
// What is still open, all of it cosmetic and all of it covered from this file rather than left
// broken, so none of it is urgent:
//
//   3. THE SHAFT FLANKS ON DECK 2 FACE INTO THE SHAFT. In `buildShafts` the side walls are drawn
//      `wall(sh.x0, .., Math.PI / 2, ..)` and `wall(sh.x1, .., -Math.PI / 2, ..)` — yaw +PI/2
//      faces +x and -PI/2 faces -x, so both look inward. Downstairs that is right, because the
//      lobby only ever sees the shafts end-on. Up here the corridor runs past them on both sides:
//      from the west wing LIFT_B's flank at x = -0.40 is a hole into the shaft void, and from the
//      east wing LIFT's flank at x = 3.40 is another. The corridor now covers both with quads of
//      its own 5 mm inside the shaft footprint, and fills the 0.20 m slot between the two shafts
//      with a solid pier. The shell wants the two deck-2 flanks flipped, at which point the three
//      pieces under "the two shafts, from here" can go.
//
//   4. LIFT's BACK WALL IS COPLANAR WITH THE CORRIDOR'S NORTH WALL. Both are at z = CORR.z1 =
//      6.20 facing Math.PI: `buildShell` draws the corridor's across the full 12 m, and
//      `buildShafts` draws LIFT's across x 1.60 .. 3.40 on top of it. Two quads on one plane is
//      the stripe the coplanar rule exists for. It is invisible today only because this file's
//      cover for (3) stands in front of it. The shaft's own back wall is the redundant one on
//      this deck — the corridor wall behind it already closes the building.
//
//   5. THE SHAFTS ONLY EXIST ON TWO DECKS. `buildShafts` runs `for (const f of [0, 2])` twice —
//      once for the shaft walls and landings, once for the call panel — so decks 3 to 12 have no
//      landing, no leaves, no call button and no shaft wall at all: from those floors the lift is
//      a hole in the corridor. The floor indicator inside `landing` has the same shape of bug,
//      `f === 0 ? '一' : '二'`, which was true when there were two decks and now labels every
//      landing above the lobby 二. Neither is this floor's problem — deck 2 really is 二 and its
//      landing is really there — but both are the shell's, and every floor above this one
//      inherits them.
