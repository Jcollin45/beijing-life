// 三层 — F3 老李家, and the landing outside it.
//
// Registered into FlatFit (declared at the top of js/world.js) as 'f3'. `DECK_OF` maps that key to
// deck 3, so `A.y0` is 6.20 for the whole of this file and every height below is written `Y + h`.
// Nothing here may be written floor-relative: world.js checks, warns and lifts, but a room that
// needs rescuing is a room that was built in the lobby.
//
// WHAT THE SHELL DOES NOT GIVE THIS DECK
//
// `buildShell` and `buildShafts` in js/world.js run for decks 0 and 2 only — `for (const f of
// [0, 2])`, twice. Wave 0 of TOWER.md generalised the *state* machine (DECK, ZONE/SOL/SHA/GLO,
// setFloor, roomAt, deckDecals, DECK_OF) but not the *geometry*, so on deck 3 there is no floor,
// no ceiling, no perimeter wall, no shaft enclosure and no lift landing until this file lays them.
// All of that is therefore built here, and the lift frontage is built behind a guard
// (`shellLanding` below) so that it takes itself out the day the shell starts generating one per
// deck rather than z-fighting with it.
//
// THE PLAN
//
//   x -6.00 .. 6.00   the building.   z 3.20 .. 6.20 the landing.   z -5.00 .. 3.20 老李家.
//
//                x -6.0        -2.6                                    6.0
//     z  6.20     +---- 302 -- 303 -- 304 -+-LIFT_B-+-LIFT-+- 305 - 306 +
//                 |            the landing                              |
//     z  3.20     +------------+---------------+- 301 (open) -----------+
//                 |   厨房      |      玄关 / 过道                       |
//     z  1.20     +------------+                                        |
//                 |   卧室      |      客厅   (饭桌 west, 沙发 east)      |
//     z -1.60     +------------+                                        |
//                 |   书房      |                                       |
//     z -3.20     |            +------ glazed partition ----------------+
//                 |            |      阳台                              |
//     z -5.00     +------------+----------------------------------------+
//
// A retired couple's flat is deliberately NOT the player's flat re-dressed. It is heavier, older
// and fuller: dark wood, antimacassars, a glass-fronted cabinet with the good crockery in it, a
// wall of family photographs, a 画眉 in a bamboo cage, and a balcony that is really a greenhouse.
const HomeF3 = { built: false, floor: 3, flat: '301', who: '老李' };

FlatFit['f3'] = A => {
  if (!A || typeof A.box !== 'function' || !A.zone) {
    console.warn('home-f3: toolkit A missing box/zone — deck 3 not built');
    return HomeF3;
  }
  const box = A.box, cyl = A.cyl, ball = A.ball, wall = A.wall, flat = A.flat;
  const cap = A.cap || A.capsule || A.box;
  const taper = A.taper || A.box;
  const ceiling = A.ceiling;
  const glyph = A.glyph || (() => []);
  const stop = A.stop, thing = A.th;
  const light = A.light || (() => null);
  const shade = A.shade || (() => null);
  const glow = A.glow || (() => null);
  const C = A.C, M = A.M;
  // The two lists js/game.js repaints every frame: `World.skyGlass` takes `dl.glass` and
  // `World.setCity` re-tints the three skyline layers off `dl.city`. Registering a prop with these
  // is what makes it follow the hour; a prop that is not on them is painted at the colour it was
  // built with, for ever. See `the view out` below.
  const skyReg = typeof A.sky === 'function' ? (p => A.sky(p)) : (p => p);
  const cityReg = typeof A.city === 'function' ? ((l, p) => A.city(l, p)) : ((l, p) => p);
  const PI = Math.PI;

  // ------------------------------------------------------------------ the coordinate contract
  const Y = A.y0;                       // 6.20 — this deck. Never a literal.
  const H = 2.60, CY = Y + H;           // clear height, and the ceiling plane
  const FL = Y + .006;                  // what things stand on: 2 mm over the floor quad
  const X0 = -6.0, X1 = 6.0;            // the building, east-west
  const ZS = -5.0;                      // the south face - outside, six metres up
  const ZW = 3.2;                       // the wall between 老李家 and the landing
  const ZN = 6.2;                       // the north face, behind the shafts
  const LF = A.LIFT || { x0: 1.6, x1: 3.4, z0: 4.9, z1: 6.2 };
  const LB = A.LIFT_B || { x0: -0.4, x1: 1.4, z0: 4.9, z1: 6.2 };

  // 老李's own front door, 301. The one door on this floor that opens - and it is standing open,
  // which is both the cheapest way to make a floor visitable without owning js/game.js's door
  // machinery and exactly what a retired couple's door does all afternoon.
  const FX = 3.90, FW = 1.00, FTOP = 2.05;

  // The partitions inside the flat. The spine runs the depth of the building at x = -2.60 with
  // three doorways in it; two cross walls split the west band into 厨房 / 卧室 / 书房.
  const SPX = -2.60, SPT = .12;         // spine wall centre and thickness
  const KZ = 1.20, UZ = -1.60;          // 厨房|卧室 and 卧室|书房
  const BZ = -3.20;                     // 客厅|阳台, a glazed partition
  const DOORS = {                       // the three interior openings, as [z0, z1]
    kitchen: [2.05, 2.90], bed: [-0.15, 0.70], study: [-2.65, -1.80],
  };
  const BAL = [2.40, 4.40];             // the sliding opening onto the 阳台, as [x0, x1]

  // Has the shell learned to build a landing on this deck? The day `buildShafts` runs for every
  // deck instead of `[0, 2]`, everything under `if (!shellLanding)` below becomes a second copy of
  // geometry that already exists, on the same planes. Measured rather than assumed: any prop the
  // shell has already put in the shaft's own footprint at this deck's height is one.
  const shellLanding = (A.props || []).some(p => p.m && p.m[13] > Y + .20 && p.m[13] < Y + H
    && p.m[14] > LF.z0 - .40 && p.m[14] < LF.z1 + .10
    && p.m[12] > LF.x0 - 1.0 && p.m[12] < LF.x1 + 1.0);

  // ------------------------------------------------------------------ palette
  // Two palettes really: the landing is the same painted municipal cream and green-grey as your
  // own floor, and the flat behind the door is forty years of dark wood, brass and red paper.
  const col = {
    wall:   C('#d3ccbb'), dado:  C('#a2a89c'), dadoT: C('#7f867c'), slab: C('#8a8378'),
    steel:  C('#b2b8bd'), steelD:C('#8a9197'), steelX:C('#6d747a'), alu: C('#c3c9cd'),
    doorA:  C('#6c3a2b'), doorB: C('#7d4634'), doorD: C('#4b2820'),
    red:    C('#ae2b1f'), redD:  C('#7c1d14'), gold: C('#e2b660'), ink: C('#241c16'),
    green:  C('#1e7a45'), greenL:C('#4ec489'), grey: C('#7d848a'),
    white:  C('#f0ede4'), paper: C('#eee8d9'), warm: C('#f6efd8'), dead: C('#b9b6ad'),
    rubber: C('#3a3f42'), navy:  C('#2c3f57'), glass: C('#cfdde4'),
    plaster:C('#ddd2b8'), plasterD: C('#cbbfa4'),
    woodD:  C('#6a4c33'), woodE: C('#422e1f'), woodM: C('#835c36'), woodL: C('#a67c4a'),
    woodR:  C('#8a4a28'),
    lino:   C('#9a7247'), tileF: C('#d9d3c4'), tileW: C('#e7e2d4'),
    lace:   C('#f4f1e6'), cloth: C('#8d5f4a'), clothD: C('#6d4636'),
    jade:   C('#3d6f57'), jadeL: C('#6fa286'), leaf: C('#4a7a41'), leafD: C('#2f5b31'),
    leafB:  C('#63935a'), terra: C('#a8613c'), terraD: C('#7f462b'), soil: C('#4a3a2c'),
    bamboo: C('#c2a361'), brass: C('#b98c3e'), brassD: C('#8a6828'),
    porc:   C('#f4f1e8'), blueW: C('#3a5f92'), teaG: C('#2f4a2c'),
    sky:    C('#a8c4da'), skyLo: C('#cbd9e2'), far: C('#6f8496'), near: C('#5d7284'),
    tree:   C('#41603a'), treeD: C('#2e4a2c'), roof: C('#5a5349'), road: C('#4e4b46'),
  };
  const P = {
    plaster: { mode: 4, mat: 'plaster', matScale: .62, matAmt: .20, nrmAmt: .26 },
    slab:    { mode: 9, gloss: .34, mat: 'paving', matScale: .70, matAmt: .26, nrmAmt: .30 },
    metal:   { mode: 0, mat: 'metal', matScale: .55, matAmt: .16, nrmAmt: .24 },
    wood:    { mode: 6 },
    cloth:   { mode: 7, mat: 'fabric', matScale: .55, matAmt: .26, nrmAmt: .28 },
    tile:    { mode: 0, mat: 'tile', matScale: .34, matAmt: .26, nrmAmt: .28 },
  };

  // Writing stands 12 mm off the face it is written on, along the yaw it is given, so passing the
  // front of a plate together with the yaw a reader faces it from always puts ink in front of it.
  const G = (x, y, z, yaw, text, o) => glyph(x, y, z, yaw, text, { color: col.ink, ...o });
  // A thing to look at and say. `focus` must be a spot the body can genuinely stand on - never
  // inside the clutter the word belongs to, or the label reads "too far" from every angle.
  const TH = (hz, x, y, z, zh, en, note, fx, fz, reach = 1.7, tag) =>
    thing(hz, x, y, z, zh, en, note, { focus: [fx, fz], reach, tag: tag || hz });
  // Contact shadow, always measured off the surface the thing is actually standing on.
  const sha = (x, z, w, d, a = .40, y) => shade(x, z, w, d, a, y === undefined ? FL + .010 : y);

  // ===================================================================================== SHELL
  //
  // Floors first, in five non-overlapping fields so no two quads ever share a plane: the landing
  // is municipal paving, 老李家 is forty-year-old boards, and 厨房 and 阳台 are tiled.
  // ART.md:57's board row (1.2 / .32 / gloss .12). 老李家's boards are forty years old, so they
  // take the same material at a darker albedo — age reads as wear, not as a different floor.
  const BOARD = { mode: 3, gloss: .12, mat: 'wood', matScale: 1.2, matAmt: .32, nrmAmt: .32 };
  flat(0, Y + .004, (ZW + ZN) / 2, X1 - X0, ZN - ZW, col.slab, { ...P.slab });
  flat((SPX + X1) / 2, Y + .004, (BZ + ZW) / 2, X1 - SPX, ZW - BZ, col.lino, BOARD);
  flat((X0 + SPX) / 2, Y + .004, (UZ + KZ) / 2, SPX - X0, KZ - UZ, col.lino, BOARD);
  flat((X0 + SPX) / 2, Y + .004, (ZS + UZ) / 2, SPX - X0, UZ - ZS, col.lino, BOARD);
  flat((X0 + SPX) / 2, Y + .004, (KZ + ZW) / 2, SPX - X0, ZW - KZ, col.tileF, { ...P.tile, gloss: .40 });
  flat((SPX + X1) / 2, Y + .004, (ZS + BZ) / 2, X1 - SPX, BZ - ZS, col.tileF, { ...P.tile, gloss: .44 });

  // Ceilings. Two quads, one per band, both facing down.
  ceiling(0, CY, (ZW + ZN) / 2, X1 - X0, ZN - ZW, C('#d9d3c5'), { gloss: .08, glow: .008 });
  ceiling(0, CY, (ZS + ZW) / 2, X1 - X0, ZW - ZS, C('#ded7c8'), { gloss: .08, glow: .006 });

  // ------------------------------------------------------------------ the perimeter
  // Every quad here faces INTO the room it belongs to. Get one backwards and you look through the
  // building; there is nothing on the other side of any of them.
  wall(0, Y + H / 2, ZN, X1 - X0, H, PI, col.wall, { ...P.plaster });
  for (const s of [-1, 1]) {
    wall(s * X1, Y + H / 2, (ZW + ZN) / 2, ZN - ZW, H, -s * PI / 2, col.wall, { ...P.plaster });
    wall(s * X1, Y + H / 2, (ZS + ZW) / 2, ZW - ZS, H, -s * PI / 2, col.plaster, { ...P.plaster });
  }
  // The wall between the flat and the landing, both faces, with the 301 opening cut in it. Back to
  // back on the same plane and facing opposite ways, which is what the shell does at FLAT.z1 - a
  // single-sided quad pair is never both visible, so this is the one place coplanar is correct.
  for (const [x0, x1] of [[X0, FX - FW / 2], [FX + FW / 2, X1]]) {
    wall((x0 + x1) / 2, Y + H / 2, ZW, x1 - x0, H, 0, C('#c9bda8'), { ...P.plaster });
    wall((x0 + x1) / 2, Y + H / 2, ZW, x1 - x0, H, PI, col.plaster, { ...P.plaster });
  }
  wall(FX, Y + (FTOP + H) / 2, ZW, FW, H - FTOP, 0, C('#c9bda8'), { ...P.plaster });
  wall(FX, Y + (FTOP + H) / 2, ZW, FW, H - FTOP, PI, col.plaster, { ...P.plaster });
  // the reveal round the opening, so the wall has thickness where you walk through it
  for (const s of [-1, 1])
    box(FX + s * FW / 2, Y + FTOP / 2, ZW, .05, FTOP, .22, col.plasterD,
        { hard: true, gloss: .12, ...P.plaster });
  box(FX, Y + FTOP + .025, ZW, FW + .10, .05, .22, col.plasterD,
      { hard: true, gloss: .12, ...P.plaster });
  // 门槛石 - the stone threshold every flat here has across its doorway
  box(FX, FL + .016, ZW, FW + .06, .032, .20, C('#9b968b'), { hard: true, gloss: .42, ...P.slab });

  // ------------------------------------------------------------------ the south face, outside
  //
  // Six metres up and facing the courtyard. The 书房 gets one window; the 阳台 gets the long
  // glazed run that is the whole reason a Beijing flat has a balcony. Both are built as openings
  // in the wall with the view standing behind them, because there is no world out there to see.
  const SWZ = -4.60, SWW = 1.40, SWSILL = .95, SWTOP = 2.15;      // the 书房 window
  const BSILL = .95, BTOP = 2.32, BX0 = -2.30, BX1 = 5.70;        // the 阳台 glazing
  // 397/400 — this floor's own daylight, so deck 3 stops inheriting deck 2's living-room window.
  // Both openings are in the ZS wall, the lowest z in the flat, so the outward normal is -z —
  // the same face the 客厅 fourteen floors down has, and the reason those two DO light alike.
  if (A.setWin) {
    A.setWin(SWZ, Y + (SWSILL + SWTOP) / 2, ZS, SWW / 2, (SWTOP - SWSILL) / 2, [0, 0, -1]);
    A.setWin((BX0 + BX1) / 2, Y + (BSILL + BTOP) / 2, ZS,
             (BX1 - BX0) / 2, (BTOP - BSILL) / 2, [0, 0, -1]);
  }
  for (const [x0, x1] of [[X0, SWZ - SWW / 2], [SWZ + SWW / 2, SPX], [SPX, BX0], [BX1, X1]])
    wall((x0 + x1) / 2, Y + H / 2, ZS, x1 - x0, H, 0, col.plaster, { ...P.plaster });
  for (const [x0, x1, y0, y1] of [[SWZ - SWW / 2, SWZ + SWW / 2, 0, SWSILL],
                                  [SWZ - SWW / 2, SWZ + SWW / 2, SWTOP, H],
                                  [BX0, BX1, 0, BSILL], [BX0, BX1, BTOP, H]])
    wall((x0 + x1) / 2, Y + (y0 + y1) / 2, ZS, x1 - x0, y1 - y0, 0, col.plaster, { ...P.plaster });

  // ------------------------------------------------------------------ the view out
  //
  // Deck 3 is six metres up, which is the one height in this building where you are still among
  // the trees: the tops of the courtyard poplars are level with the balcony rail, the next block
  // is close enough to count its windows, and the road is a strip you look down at. Built as flat
  // emissive layers standing behind the glazing at z < -5.00, farthest first. Each layer is well
  // under the 0.05 glow ceiling a big area wants.
  // DEPTH. The first version stood these layers 0.12 – 0.30 m behind the glazing, which is the
  // trick js/home-corridor.js uses for a 1.3 m window you only ever look straight into. At 8 m
  // wide it does not survive: from the 书房 door you see the balcony's "city" edge-on, 30 cm
  // behind the wall, and it reads as a painted board because that is what it is. Pushed back to
  // 2.2 m and scaled to match, the parallax is small instead of absurd and the layers stay
  // behind the reveal from every angle a body can stand at. Nothing else exists out there, so
  // depth is free; over-width is the cheap insurance against seeing past the edge of it.
  function vista(x, w0, y0, y1) {
    const D = 2.2, w = w0 * 2.4, hh = (y1 - y0) * 1.9;
    y0 = y0 - (hh - (y1 - y0)) * .45;
    // GLOW BUDGET. The brief's rule is 0.02–0.05 for a panel of about a square metre, and the
    // balcony's sky panel is eight metres by one and a half. At .035 it was a twelve-square-metre
    // lightbox: the 客厅 ceiling went to white paper and the bloom went with it. Everything out
    // here is now an order below that, and the room is lit by its own lamps instead.
    // Both sky courses join `skyGlass`, so the wash behind this window is #c8dcee at noon,
    // #d08a54 at seven and #2c3f5e at midnight — the same one js/game.js paints the roof with.
    // `sky` re-tints colour only and never touches glow, so the budget the paragraph above spends
    // so much care on is untouched: these stay at .012 and .010 whatever the hour.
    skyReg(box(x, Y + (y0 + y1) / 2, ZS - D - .30, w, hh, .012, col.sky,
               { hard: true, mode: 1, glow: .012 }));
    skyReg(box(x, Y + y0 + hh * .16, ZS - D - .29, w, hh * .34, .010, col.skyLo,
               { hard: true, mode: 1, glow: .010 }));
    for (let i = 0; i < 9; i++) {
      const tw = .5 + (i % 3) * .34, tx = x - w / 2 + .30 + i * (w - .6) / 8;
      const th = .30 + ((i * 7) % 5) * .10;
      cityReg(i % 2 ? 0 : 1,
        box(tx, Y + y0 + hh * .30 + th / 2, ZS - D - .27, tw, th, .010, i % 2 ? col.far : col.near,
            { hard: true, mode: 1, glow: .008 }));
    }
    box(x, Y + y0 + hh * .26, ZS - D - .22, w * .92, hh * .50, .010, C('#6d6f63'),
        { hard: true, mode: 1, glow: .004 });
    box(x, Y + y0 + hh * .52, ZS - D - .21, w * .94, .06, .010, col.roof,
        { hard: true, mode: 1, glow: .004 });
    for (let r = 0; r < 3; r++) for (let i = 0; i < 11; i++) {
      const wx = x - w / 2 + .34 + i * (w - .68) / 10, lit = (i * 3 + r) % 4 === 0;
      // The lit ones join city layer 2, whose glow js/game.js drives from 0.05 by day to 0.35 at
      // night. They are 0.17 x 0.11 each: the glow ceiling the note above is about is a function
      // of AREA, and eleven of these is a fifth of a square metre, not twelve.
      const wp = box(wx, Y + y0 + hh * (.14 + r * .13), ZS - D - .20, .17, .11, .008,
                     lit ? C('#e8dfae') : C('#495359'),
                     { hard: true, mode: 1, glow: lit ? .035 : .002 });
      if (lit) cityReg(2, wp);
    }
    box(x, Y + y0 - .02, ZS - D - .16, w, .10, .010, col.road, { hard: true, mode: 1, glow: .005 });
    for (let i = 0; i < 7; i++) {
      const tx = x - w / 2 + .45 + i * (w - .9) / 6;
      cyl(tx, Y + y0 + .10, ZS - D - .14, .035, .70, C('#6b5a44'), { mode: 1, glow: .005 });
      ball(tx, Y + y0 + .46, ZS - D - .13, .30, .40, .05, i % 2 ? col.tree : col.treeD,
           { mode: 1, glow: .007 });
      ball(tx + .12, Y + y0 + .70, ZS - D - .12, .21, .26, .05, col.tree, { mode: 1, glow: .008 });
    }
  }
  vista((BX0 + BX1) / 2, BX1 - BX0, BSILL - .10, BTOP + .04);
  vista(SWZ, SWW + .04, SWSILL - .06, SWTOP + .04);

  // ------------------------------------------------------------------ the glazing itself
  // Aluminium frame, a mullion every metre and a bit, and one thin pane 15 mm in front of it, so
  // nothing shares a plane with anything.
  function glazing(x0, x1, y0, y1, step) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    for (const gy of [y0, y1])
      box(cx, Y + gy, ZS + .07, w + .06, .055, .055, col.alu, { hard: true, gloss: .40, ...P.metal });
    const n = Math.max(1, Math.round(w / step));
    for (let i = 0; i <= n; i++)
      box(x0 + i * w / n, Y + (y0 + y1) / 2, ZS + .07, .048, y1 - y0, .055, col.alu,
          { hard: true, gloss: .40, ...P.metal });
    box(cx, Y + (y0 + y1) / 2, ZS + .055, w - .05, y1 - y0 - .07, .010, col.glass,
        { hard: true, mode: 18, alpha: .12, gloss: .80 });
    box(cx, Y + y0 - .05, ZS + .17, w + .08, .05, .26, C('#cfc7b4'), { hard: true, gloss: .30 });
  }
  glazing(BX0, BX1, BSILL, BTOP, 1.35);
  glazing(SWZ - SWW / 2, SWZ + SWW / 2, SWSILL, SWTOP, .70);

  // ------------------------------------------------------------------ interior partitions
  //
  // Boxes, not quads: a partition seen from both sides has to have two sides, and a box has six.
  // Every one runs floor to ceiling and is cut into segments round its doorway.
  const SPANS = [[ZS, DOORS.study[0]], [DOORS.study[1], DOORS.bed[0]],
                 [DOORS.bed[1], DOORS.kitchen[0]], [DOORS.kitchen[1], ZW]];
  for (const [z0, z1] of SPANS)
    box(SPX, Y + H / 2, (z0 + z1) / 2, SPT, H, z1 - z0, col.plaster,
        { hard: true, gloss: .10, ...P.plaster });
  for (const zz of [KZ, UZ])
    box((X0 + SPX) / 2, Y + H / 2, zz, SPX - X0 + SPT, H, .10, col.plaster,
        { hard: true, gloss: .10, ...P.plaster });
  // the head over each doorway, plus a timber architrave, so a hole in a wall reads as a door
  for (const [z0, z1] of [DOORS.kitchen, DOORS.bed, DOORS.study]) {
    box(SPX, Y + (2.02 + H) / 2, (z0 + z1) / 2, SPT, H - 2.02, z1 - z0, col.plaster,
        { hard: true, gloss: .10, ...P.plaster });
    for (const zj of [z0 - .035, z1 + .035])
      box(SPX, Y + 1.03, zj, SPT + .05, 2.06, .07, col.woodM,
          { hard: true, gloss: .22, ...P.wood });
    box(SPX, Y + 2.05, (z0 + z1) / 2, SPT + .05, .07, z1 - z0 + .14, col.woodM,
        { hard: true, gloss: .22, ...P.wood });
  }

  // ------------------------------------------------------------------ skirting
  // 130 mm, standing 70 mm off each wall, exactly as the shell trims deck 2. Never in the plane of
  // the wall it trims.
  const SK = (x, z, w, d, c) => box(x, Y + .065, z, w, .13, d, c || col.woodM,
                                    { hard: true, gloss: .20, ...P.wood });
  SK(0, ZN - .045, X1 - X0, .065, C('#8d8578'));
  for (const [x0, x1] of [[X0, FX - FW / 2], [FX + FW / 2, X1]]) {
    SK((x0 + x1) / 2, ZW + .045, x1 - x0, .065, C('#8d8578'));
    SK((x0 + x1) / 2, ZW - .045, x1 - x0, .065);
  }
  for (const s of [-1, 1]) {
    SK(s * (X1 - .045), (ZW + ZN) / 2, .065, ZN - ZW, C('#8d8578'));
    SK(s * (X1 - .045), (ZS + ZW) / 2, .065, ZW - ZS);
  }
  for (const [z0, z1] of SPANS) for (const s of [-1, 1])
    SK(SPX + s * (SPT / 2 + .032), (z0 + z1) / 2, .065, z1 - z0);
  for (const zz of [KZ, UZ]) for (const s of [-1, 1])
    SK((X0 + SPX) / 2, zz + s * .082, SPX - X0, .065);

  // ===================================================================================== ZONES
  //
  // `A.zone` is what makes this deck exist at all: `setFloor(3)` refuses a deck with no walkable
  // rectangle and drops the player back onto the flat. Each room gets its own so it gets its own
  // overhead bulb and its own camera ceiling; the doorways get overlapping strips, because
  // `clampMove` insets every zone by the 0.30 body radius and two zones that merely TOUCH leave a
  // 0.60 m band nobody can cross. That has sealed a floor in this project twice.
  const zn = (id, x0, x1, z0, z1, lx, lz, ly) =>
    A.zone({ id, x0, x1, z0, z1, light: [lx, Y + (ly === undefined ? 2.34 : ly), lz],
             ceil: CY - .06 });
  zn('f3', X0, X1, ZW, ZN, 0, 4.30, 2.30);                       // the landing - REQUIRED
  zn('laoli', SPX + .15, X1, BZ, 1.45, 2.10, -0.70);             // 客厅
  zn('lidoor', SPX + .15, X1, 0.60, ZW, 4.30, 2.35);             // 玄关, overlapping 客厅
  zn('liyang', SPX + .15, X1, ZS + .10, BZ, 1.60, -3.95, 2.30);  // 阳台
  zn('lichu', X0, SPX + .15, KZ, ZW, -4.30, 2.30);               // 厨房
  zn('liwo', X0, SPX + .15, UZ, KZ, -4.30, -0.20);               // 卧室
  zn('lishu', X0, SPX + .15, ZS + .10, UZ, -4.30, -3.10);        // 书房
  // the doorways: the front door, the three in the spine, and the slider onto the balcony
  zn('ligap', FX - FW / 2, FX + FW / 2, ZW - .80, ZW + .80, FX, ZW, 2.30);
  // 0.90 either side of the spine, not 0.60. `clampMove` insets a zone by the body radius, so a
  // doorway strip 1.20 wide is only 0.60 of reachable floor and its inset edge at x -2.30 lands
  // *west* of 客厅's own inset edge at -2.15: the two zones overlap on paper and not in the band
  // the body can actually occupy, and walking west out of the 客厅 stopped dead at the architrave.
  // Measured with World.clampMove at r = 0.30, not deduced.
  for (const [z0, z1] of [DOORS.kitchen, DOORS.bed, DOORS.study])
    zn('lipass', SPX - .90, SPX + .90, z0 - .45, z1 + .45, SPX, (z0 + z1) / 2);
  zn('libal', BAL[0], BAL[1], BZ - .75, BZ + .75, (BAL[0] + BAL[1]) / 2, BZ);
  A.deckH(CY);          // the room box R.setRoom measures the ambient term against

  // ===================================================================================== SOLIDS
  //
  // The envelope, then the partitions with their doorways left open. Colliders sit ON the plane of
  // the thing they represent and no wider: the landing has 1.04 m of standing room in front of the
  // shafts and `clampMove` spends 0.60 of it on the body, so a collider 50 mm proud of its wall is
  // the difference between a corridor and a wall.
  stop(X0 - .4, X0 + .10, ZS, ZN); stop(X1 - .10, X1 + .4, ZS, ZN);
  stop(X0, X1, ZN - .10, ZN + .4); stop(X0, X1, ZS - .4, ZS + .10);
  for (const [x0, x1] of [[X0, FX - FW / 2], [FX + FW / 2, X1]]) stop(x0, x1, ZW - .09, ZW + .09);
  for (const [z0, z1] of SPANS) stop(SPX - SPT / 2 - .02, SPX + SPT / 2 + .02, z0, z1);
  for (const zz of [KZ, UZ]) stop(X0, SPX + SPT / 2, zz - .07, zz + .07);
  for (const [x0, x1] of [[SPX, BAL[0]], [BAL[1], X1]]) stop(x0, x1, BZ - .07, BZ + .07);
  // The two shafts. LIFT_B never opens anywhere in this building, so it is solid to its edges.
  stop(LB.x0 - .10, LB.x1 + .10, LB.z0, LB.z1 + .05);
  // LIFT is two piers with the door opening left CLEAR between them, and this is not cosmetic.
  //
  // `goFloor` in js/world.js now accepts any live deck, so the car really does come here — but
  // `buildShafts` still runs `for (const f of [0, 2])` (world.js:773, 797), so deck 3 gets no
  // registered leaves, no `doorStops` record, and `carZone` is pushed into ZONE[0] and ZONE[2]
  // only. With the whole footprint walled, as it was first written, a player who rode up here
  // was pushed out of the car by the collider on arrival and could then never get back in: the
  // floor was reachable and had no way off it but the stairs, which do not open either.
  //
  // The piers stand exactly where the shell's own do — `landing()` guards x sh.x0-.10 .. cx-hw
  // and cx+hw .. sh.x1+.10 for a DOORW/2 half-width — so the 0.80 m opening and the 0.20 m band
  // of standing room inside it are the ones the working lift already has on deck 2, not a slot
  // invented here. The door collider that belongs across that opening is the shell's, because
  // only the shell knows whether the car is actually at this deck; until it generates one per
  // deck, the opening is passable at all times. Walking into an empty shaft looks wrong. Being
  // stranded on the third floor is worse, and it is the one of the two that is a trap.
  const LHW = ((A.CAR && A.CAR.door) || .80) / 2, LCX = (LF.x0 + LF.x1) / 2;
  stop(LF.x0 - .10, LCX - LHW, LF.z0, LF.z1 + .05);
  stop(LCX + LHW, LF.x1 + .10, LF.z0, LF.z1 + .05);

  // =================================================================================== LANDING
  //
  // The same building as your own floor, one storey up: municipal cream over a green-grey dado,
  // six 防盗门, and everything the doors have accumulated. What makes it F3 rather than F2 is
  // 老李 — his pots have escaped into the corridor, there is a folding stool by his door because
  // he sits out here, and the notice on the board is the one about charging e-bikes indoors.

  // ------------------------------------------------------------------ the dado
  // A band of darker paint at hand height is the single thing that stops a painted corridor
  // reading as a white box. It stands proud of the wall as a box, never as a second quad in the
  // wall's own plane, and runs in segments so it is never drawn across a doorway.
  const DY0 = Y + .130, DH = 1.12 - .130, DYC = DY0 + DH / 2;
  function dado(axis, plane, sgn, runs) {
    for (const [a0, a1] of runs) {
      const c = (a0 + a1) / 2, L = a1 - a0;
      if (L <= .002) continue;
      const put = (y, h, d, w, colr, g) => axis === 'x'
        ? box(c, y, d, L, h, w, colr, { hard: true, gloss: g })
        : box(d, y, c, w, h, L, colr, { hard: true, gloss: g });
      put(DYC, DH, plane + sgn * .015, .03, col.dado, .18);
      put(DY0 + DH + .014, .028, plane + sgn * .020, .04, col.dadoT, .22);
    }
  }
  const N1 = -5.30, N2 = -3.60, N3 = -1.80, N4 = 4.20, N5 = 5.40;   // the five neighbours' doors
  dado('x', ZW, 1, [[X0, FX - FW / 2], [FX + FW / 2, X1]]);
  dado('x', ZN, -1, [[X0, LB.x0], [LF.x1, X1]]);
  const WZ = 4.55, WW = 1.30, WSILL = .95, WTOP = 2.15;             // the landing window, west end
  const SZ = 4.55, SW = .95, STOP = 2.06;                           // the fire stair, east end
  dado('z', X0, 1, [[ZW, WZ - WW / 2], [WZ + WW / 2, ZN]]);
  dado('z', X1, -1, [[ZW, SZ - SW / 2], [SZ + SW / 2, ZN]]);

  // ------------------------------------------------------------------ the two shafts
  //
  // See `shellLanding` above: this whole block is the shell's job the day `buildShafts` runs for
  // more than decks 0 and 2, and it removes itself when that lands rather than z-fighting with it.
  // Until then, without it the corridor's north end is an open void with the car swinging past in
  // it. The car never stops here — `goFloor` in js/world.js still collapses every request to deck
  // 0 or 2 — so these doors are shut, which is what a lift that is somewhere else looks like.
  if (!shellLanding) {
    const steel = C('#7e868c'), dark = C('#3d4348');
    for (const sh of [LF, LB]) {
      // Outward-facing, every one: the corridor is south and west/east of these planes, and a
      // quad facing into its own shaft is a hole you look through.
      wall((sh.x0 + sh.x1) / 2, Y + H / 2, sh.z0, sh.x1 - sh.x0, H, PI, C('#c7c0af'), { ...P.plaster });
      wall(sh.x0, Y + H / 2, (sh.z0 + sh.z1) / 2, sh.z1 - sh.z0, H, -PI / 2, col.wall, { ...P.plaster });
      wall(sh.x1, Y + H / 2, (sh.z0 + sh.z1) / 2, sh.z1 - sh.z0, H, PI / 2, col.wall, { ...P.plaster });
      box((sh.x0 + sh.x1) / 2, Y + .065, sh.z0 - .045, sh.x1 - sh.x0, .13, .065, C('#8d8578'),
          { hard: true, gloss: .20 });
      // The flanks get the same skirting and dado as every other wall on the floor. Without them
      // a shaft side is 1.3 x 2.6 m of one flat colour, and the first render of this landing had
      // exactly that: a grey slab standing in the middle of a corridor that was otherwise painted.
      for (const [fx, sgn] of [[sh.x0, -1], [sh.x1, 1]]) {
        box(fx + sgn * .045, Y + .065, (sh.z0 + sh.z1) / 2, .065, .13, sh.z1 - sh.z0, C('#8d8578'),
            { hard: true, gloss: .20 });
        dado('z', fx, sgn, [[sh.z0, sh.z1 - .02]]);
      }
    }
    dado('x', LB.z0, -1, [[LB.x0, LB.x1]]);
    // the working shaft's landing: plaster returns, a steel surround, two shut leaves, the dial
    const cx = (LF.x0 + LF.x1) / 2, DW = (A.CAR && A.CAR.door) || .80, DH2 = 2.10, zf = LF.z0;
    box(cx, Y + (DH2 + H) / 2, zf - .06, DW + 1.20, H - DH2, .12, col.wall,
        { hard: true, gloss: .12, ...P.plaster });
    for (const s of [-1, 1])
      box(cx + s * (DW / 2 + .30), Y + DH2 / 2, zf - .06, .60, DH2, .12, col.wall,
          { hard: true, gloss: .12, ...P.plaster });
    for (const s of [-1, 1])
      box(cx + s * (DW / 2 + .07), Y + DH2 / 2 + .05, zf + .01, .14, DH2 + .10, .05, steel,
          { hard: true, gloss: .62, tag: '电梯', ...P.metal });
    box(cx, Y + DH2 + .075, zf + .01, DW + .42, .14, .05, steel,
        { hard: true, gloss: .62, tag: '电梯', ...P.metal });
    for (const s of [-1, 1]) {
      box(cx + s * DW / 4, Y + DH2 / 2, zf - .13, DW / 2, DH2, .045, steel,
          { hard: true, gloss: .34, tag: '电梯', ...P.metal });
      box(cx + s * DW / 4, Y + DH2 / 2, zf - .105, DW / 2 - .05, DH2 - .10, .012, C('#8d959b'),
          { hard: true, gloss: .34, tag: '电梯' });
    }
    box(cx, Y + DH2 + .34, zf + .015, .52, .30, .06, dark, { hard: true, gloss: .34, tag: '电梯' });
    G(cx, Y + DH2 + .34, zf - .05, PI, '三', { size: .17, color: C('#ff9a4d'), mode: 1, glow: .16 });
    // the call panel, and the word for it
    const px = 3.72, pz = LF.z0 - .02;
    box(px, Y + 1.12, pz, .13, .22, .04, C('#d9d4c8'), { hard: true, gloss: .34, tag: '电梯' });
    for (const [dy, ch] of [[.045, '▲'], [-.045, '▼']]) {
      box(px, Y + 1.12 + dy, pz - .022, .055, .055, .012, C('#ffbe6a'),
          { hard: true, mode: 1, glow: .16, tag: '电梯' });
      G(px, Y + 1.12 + dy, pz - .036, PI, ch, { size: .038, color: C('#4a3316'), tag: '电梯' });
    }
    TH('电梯', px, Y + 1.52, pz - .10, '按电梯，下楼去。', 'Press for the lift, and go down.',
       '电 electricity + 梯 ladder. 上楼 is up, 下楼 is down.', px, 4.20, 2.0);
    // the second shaft, out of service on every deck of this building
    const bx = (LB.x0 + LB.x1) / 2;
    box(bx, Y + 1.05, LB.z0 - .022, 1.02, 2.06, .028, C('#c6bfae'), { hard: true, gloss: .14 });
    box(bx, Y + 1.62, LB.z0 - .040, .44, .30, .020, col.paper, { hard: true, gloss: .05, ry: .03 });
    G(bx, Y + 1.70, LB.z0 - .052, PI, '此梯停用', { size: .052, gap: .010, color: col.redD });
    G(bx, Y + 1.60, LB.z0 - .052, PI, '请乘另一部', { size: .042, gap: .008, color: col.ink });
    G(bx, Y + 1.51, LB.z0 - .052, PI, '物业管理处', { size: .034, gap: .007, color: col.grey });
  }

  // ------------------------------------------------------------------ ceiling services
  // The sprinkler main hugs the flat's wall at z = 3.38, the only line down this landing that is
  // clear for twelve metres. Four lengths rather than one barrel: a cylinder scaled three hundred
  // to one shades like a mirror, not like a pipe.
  for (let i = 0; i < 4; i++)
    cyl(X0 + 1.5 + i * 3.0, CY - .17, 3.38, .036, 3.0, col.redD,
        { rz: PI / 2, gloss: .34, ...P.metal });
  for (let i = 0; i < 5; i++) {
    const sx = X0 + 1.3 + i * 2.4;
    cyl(sx, CY - .225, 3.38, .016, .07, col.brassD, { gloss: .5 });
    ball(sx, CY - .262, 3.38, .026, .020, .026, col.brass, { gloss: .55 });
  }
  box(0, CY - .045, 3.30, X1 - X0, .05, .07, col.white, { hard: true, gloss: .12 });
  // four surface bulkheads, one of them dead, which is the true state of every corridor like this
  for (const [lx, lz, alive] of [[-4.60, 4.30, true], [-1.40, 4.30, false],
                                 [1.40, 3.44, true], [4.90, 4.30, true]]) {
    box(lx, CY - .045, lz, .46, .07, .16, col.steelD, { hard: true, gloss: .30 });
    box(lx, CY - .095, lz, .40, .05, .12, alive ? col.warm : col.dead,
        { hard: true, mode: alive ? 1 : 0, glow: alive ? .13 : 0, gloss: .10 });
    if (alive) light(lx, CY - .19, lz, C('#dfe9ef'), .50, 3.40);
  }

  // ------------------------------------------------------------------ 安全出口
  // Flat on the wall, never slung across a 3 m landing where it is read edge-on from everywhere.
  // The stair is east, and a glyph reads left-to-right in the READER's frame — so "that way"
  // is drawn as an arrow pointing +x on the south wall and -x on the north. Backwards, this
  // sends the player to the window in a fire.
  function exitSign(x, y, z, sgn, arrow) {
    const yaw = sgn > 0 ? 0 : PI, f = d => z + sgn * d, w = arrow ? .46 : .38;
    box(x, y, f(.028), w, .155, .055, col.green, { hard: true, gloss: .26, tag: '安全出口' });
    box(x, y, f(.058), w - .035, .125, .006, col.greenL,
        { hard: true, mode: 1, glow: .14, tag: '安全出口' });
    G(x - (arrow ? .062 : 0), y, f(.058), yaw, '安全出口',
      { size: arrow ? .072 : .082, gap: .010, color: col.white, mode: 1, glow: .16 });
    if (arrow) G(x + .175, y, f(.058), yaw, sgn > 0 ? '→' : '←',
                 { size: .095, color: col.white, mode: 1, glow: .16 });
  }
  exitSign(-2.90, Y + 2.26, ZW, 1, true);
  exitSign(-5.20, Y + 2.26, ZN, -1, true);
  exitSign(1.10, Y + 2.26, ZW, 1, true);
  box(X1 - .035, Y + STOP + .19, SZ, .06, .155, .40, col.green,
      { hard: true, gloss: .26, tag: '安全出口' });
  box(X1 - .068, Y + STOP + .19, SZ, .006, .125, .365, col.greenL,
      { hard: true, mode: 1, glow: .14, tag: '安全出口' });
  G(X1 - .068, Y + STOP + .19, SZ, -PI / 2, '安全出口',
    { size: .086, gap: .012, color: col.white, mode: 1, glow: .16 });

  // ------------------------------------------------------------------ the six 防盗门
  //
  // The frame stands 90 mm off the wall and the leaf 60 mm, so the leaf reads as recessed in its
  // architrave and nothing is coplanar with anything — a flush door in this renderer flickers as
  // horizontal stripes. `sgn` is the way the door faces into the landing; `hinge` -1 hangs it on
  // the -x jamb. Only 301 is tagged 门; the other five are 邻居, so a ray that resolves to a tag
  // finds exactly one thing wearing it.
  function frontDoor(cx, zw, sgn, num, o = {}) {
    const yaw = sgn > 0 ? 0 : PI;
    const W = o.w || 1.00, HT = o.top || 2.06, LW = W - .05, LH = HT - .04;
    const F = z => zw + sgn * z;
    const hinge = o.hinge === undefined ? -1 : o.hinge;
    const body = o.body || col.doorA, panel = o.panel || col.doorB;
    for (const s of [-1, 1])
      box(cx + s * (W / 2 + .035), Y + (HT + .07) / 2, F(.045), .07, HT + .07, .09, col.doorD,
          { hard: true, gloss: .26, tag: o.tag });
    box(cx, Y + HT + .035, F(.045), W + .14, .07, .09, col.doorD,
        { hard: true, gloss: .26, tag: o.tag });
    if (o.leafless) return null;
    // The leaf of a shut neighbour's door is tagged 门, everything else about it keeps o.tag.
    //
    // `homeUseDef` (js/game.js:10961) routes the word 门 by deck: 0 is the lobby, 2 is your own
    // flat, and every other deck gets `HOME_DOOR_USE.neighbour` — 敲门. So a leaf without this tag
    // is a door you cannot knock on, which is what all five of these were: fully drawn, fully
    // colliding, and reading as wall to the pick. The frame, the plate and the number keep 邻居 so
    // that card still resolves, and they are 0.8 m away in y, so neither steals the other.
    //
    // `sgn < 0` is exactly the set of doors on the landing's north wall — the shut ones. The
    // player-side door on this floor comes through with `sgn > 0` and keeps its own tag.
    // Nothing about the colliders changes. These doors must stay shut.
    const leaf = box(cx, Y + LH / 2, F(.030), LW, LH, .06, body,
                     { hard: true, gloss: .24, ...(sgn < 0 ? { tag: '门' } : { tag: o.tag }) });
    for (const [py, ph] of [[LH * .70, LH * .40], [LH * .265, LH * .30]]) {
      box(cx, Y + py, F(.070), LW - .16, ph, .020, panel,
          { hard: true, gloss: .22, tag: o.tag });
      for (const s of [-1, 1])
        box(cx, Y + py + s * ph / 2, F(.082), LW - .16, .012, .012, col.doorD,
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
    sha(cx, F(.32), .72, .48, .26, FL + .010);
    return leaf;
  }
  // 春联 — gold on red, read top to bottom, and the 横批 over the head.
  function couplets(cx, zw, sgn, a, b, top) {
    const yaw = sgn > 0 ? 0 : PI, F = z => zw + sgn * z;
    for (const [s, text] of [[-1, a], [1, b]]) {
      box(cx + s * .60, Y + 1.48, F(.020), .12, 1.02, .04, col.red,
          { hard: true, gloss: .10, tag: '春联' });
      G(cx + s * .60, Y + 1.48, F(.040), yaw, text,
        { size: .105, gap: .018, color: col.gold, vertical: true, gloss: .12, tag: '春联' });
    }
    box(cx, Y + 2.28, F(.020), .62, .15, .04, col.red, { hard: true, gloss: .10, tag: '春联' });
    G(cx, Y + 2.28, F(.040), yaw, top, { size: .098, gap: .020, color: col.gold, tag: '春联' });
  }
  const fuDiamond = (cx, y, zw, sgn, s = .21) => {
    box(cx, Y + y, zw + sgn * .095, s, s, .018, col.red,
        { hard: true, gloss: .10, ry: sgn > 0 ? PI / 4 : -PI / 4 });
    G(cx, Y + y, zw + sgn * .106, sgn > 0 ? 0 : PI, '福',
      { size: s * .60, color: col.gold, gloss: .14 });
  };
  frontDoor(N1, ZN, -1, '302', { tag: '邻居', hinge: 1, mat: C('#4a4f52') });
  couplets(N1, ZN, -1, '一帆风顺年年好', '万事如意步步高', '吉星高照');
  frontDoor(N2, ZN, -1, '303', { tag: '邻居', body: col.doorB, panel: col.doorA, mat: C('#7d3f37') });
  frontDoor(N3, ZN, -1, '304', { tag: '邻居', mat: col.rubber });
  fuDiamond(N3, 1.34, ZN, -1);
  frontDoor(N4, ZN, -1, '305', { tag: '邻居', hinge: 1, body: col.doorD, panel: col.doorA,
                                 mat: C('#3f4a3f') });
  frontDoor(N5, ZN, -1, '306', { tag: '邻居', mat: col.rubber });
  couplets(N5, ZN, -1, '天增岁月人增寿', '春满乾坤福满门', '万象更新');

  // --- 301, 老李's, and the one door on this floor that opens. It is not animated: js/game.js
  // owns the swing of the player's own leaf and nothing here may reach into it, so this one is
  // built already open, propped back against the 玄关 wall, which is where it spends every
  // afternoon anyway. The frame is drawn without a leaf in it and the leaf stands inside the flat.
  frontDoor(FX, ZW, 1, '301', { tag: '邻居', w: FW, top: FTOP, leafless: true });
  couplets(FX, ZW, 1, '福如东海长流水', '寿比南山不老松', '身体健康');
  box(FX, Y + 1.84, ZW + .062, .30, .13, .024, col.steel, { hard: true, gloss: .40, tag: '门牌' });
  G(FX, Y + 1.84, ZW + .076, 0, '301', { size: .073, gap: .012, color: col.ink, gloss: .2, tag: '门牌' });
  flat(FX, FL + .006, ZW + .34, .64, .40, C('#6d3b34'), { mode: 7, gloss: .04 });
  sha(FX, ZW + .34, .72, .48, .26, FL + .010);
  // the leaf, swung back inside against the wall, and the 门帘 half pushed aside in the opening
  (function openLeaf() {
    const hx = FX - FW / 2, LW = FW - .05, LH = FTOP - .05;
    const cx2 = hx + .045, cz = ZW - .04 - LW / 2;
    box(cx2, Y + LH / 2, cz, .06, LH, LW, col.doorA, { hard: true, gloss: .24, tag: '邻居' });
    for (const [py, ph] of [[LH * .70, LH * .40], [LH * .265, LH * .30]])
      box(cx2 + .042, Y + py, cz, .020, ph, LW - .16, col.doorB,
          { hard: true, gloss: .22, tag: '邻居' });
    cyl(cx2 + .075, Y + 1.03, cz + LW / 2 - .13, .016, .07, col.steel, { rz: PI / 2, gloss: .5 });
    box(cx2 + .105, Y + 1.03, cz + LW / 2 - .21, .028, .028, .19, col.steel,
        { hard: true, gloss: .5 });
    fuDiamond(cx2 + .05, 1.50, cz, 0, .17);
    stop(hx - .02, hx + .13, ZW - .98, ZW - .02);
    // 门帘 — a padded winter curtain on a rail, one panel hooked back
    box(FX, Y + FTOP - .04, ZW - .10, FW + .04, .05, .05, col.steelD, { hard: true, gloss: .4 });
    for (const [mx, mw, tilt] of [[FX - .27, .44, .05], [FX + .30, .38, -.10]])
      box(mx, Y + 1.05, ZW - .10, mw, 1.86, .035, mx < FX ? C('#8e3a30') : C('#7d3229'),
          { gloss: .06, ry: tilt, ...P.cloth });
    box(FX - .27, Y + 1.72, ZW - .118, .40, .13, .012, C('#c8a24e'), { hard: true, gloss: .08 });
  })();

  // ------------------------------------------------------------------ 消火栓, and what stands by it
  const HX = -4.60, HZ = ZW + .11;
  box(HX, Y + 1.14, HZ, .70, 1.00, .22, col.red, { hard: true, gloss: .30, tag: '消防栓' });
  box(HX, Y + 1.14, HZ + .112, .60, .90, .010, col.redD, { hard: true, gloss: .34, tag: '消防栓' });
  box(HX - .01, Y + 1.20, HZ + .118, .40, .58, .008, C('#3d4a4e'),
      { hard: true, gloss: .62, alpha: .55 });
  cyl(HX - .01, Y + 1.20, HZ + .06, .17, .12, C('#8c1f18'), { rx: PI / 2, gloss: .18 });
  cyl(HX - .01, Y + 1.20, HZ + .09, .07, .07, col.redD, { rx: PI / 2, gloss: .3 });
  G(HX, Y + 1.76, HZ + .112, 0, '消火栓', { size: .115, gap: .022, color: col.white });
  G(HX, Y + .70, HZ + .112, 0, '火警119', { size: .058, gap: .012, color: col.gold });
  cyl(HX + .50, FL + .27, ZW + .17, .075, .48, col.red, { gloss: .34 });
  taper(HX + .50, FL + .55, ZW + .17, .15, .10, .15, col.red, { gloss: .34 });
  cyl(HX + .50, FL + .63, ZW + .17, .020, .09, col.steelD, { gloss: .5 });
  box(HX + .50, FL + .30, ZW + .245, .11, .16, .012, col.white, { hard: true, gloss: .1 });
  sha(HX + .50, ZW + .17, .22, .22, .30);

  // ------------------------------------------------------------------ 通知 the notice board
  // Photocopied, taped up crooked, and the best readable Chinese on the floor. The top one is the
  // notice every Beijing block has had on it since the e-bike fires.
  const PX = -2.10, PZ = ZW + .012;
  box(PX, Y + 1.54, PZ, .36, .50, .024, col.paper, { hard: true, gloss: .05, ry: .02, tag: '通知' });
  G(PX, Y + 1.72, PZ + .014, 0, '通知', { size: .080, gap: .020, color: col.ink });
  box(PX, Y + 1.652, PZ + .014, .26, .006, .006, col.ink, { hard: true });
  G(PX, Y + 1.580, PZ + .014, 0, '电动车禁止', { size: .042, gap: .008, color: col.redD });
  G(PX, Y + 1.515, PZ + .014, 0, '进楼入户充电', { size: .042, gap: .008, color: col.redD });
  G(PX, Y + 1.440, PZ + .014, 0, '违者罚款', { size: .038, gap: .008, color: col.ink });
  G(PX, Y + 1.360, PZ + .014, 0, '物业管理处', { size: .034, gap: .007, color: col.grey });
  for (const [sx, sy] of [[-.15, .22], [.15, .22], [-.15, -.22], [.15, -.22]])
    box(PX + sx, Y + 1.54 + sy, PZ + .016, .05, .022, .004, C('#d9d2bd'), { hard: true });
  box(PX - .44, Y + 1.46, PZ, .28, .22, .020, C('#dfd7c3'), { hard: true, gloss: .05, ry: -.05 });
  G(PX - .44, Y + 1.51, PZ + .012, 0, '本周六停水', { size: .042, gap: .008, color: col.grey });
  G(PX - .44, Y + 1.43, PZ + .012, 0, '请提前储水', { size: .038, gap: .008, color: col.grey });

  // ------------------------------------------------------------------ 电表箱 the meter bank
  const MX = 2.10, MZ = ZW + .06;
  box(MX, Y + 1.44, MZ, .46, .92, .12, col.steelD,
      { hard: true, gloss: .34, tag: '电表', ...P.metal });
  box(MX, Y + 1.44, MZ + .065, .40, .84, .012, col.steelX, { hard: true, gloss: .30 });
  const READ = ['0318', '0741', '1162'];
  for (let i = 0; i < 3; i++) {
    const my = 1.72 - i * .28;
    box(MX - .06, Y + my, MZ + .073, .20, .13, .008, C('#1c2226'), { hard: true, gloss: .55 });
    G(MX - .06, Y + my, MZ + .081, 0, READ[i],
      { size: .048, gap: .008, color: C('#cfe3d6'), mode: 1, glow: .10 });
    cyl(MX + .13, Y + my, MZ + .073, .010, .010, C('#d84a3a'), { rz: PI / 2, mode: 1, glow: .18 });
  }
  G(MX, Y + 1.96, MZ + .066, 0, '电表箱', { size: .062, gap: .012, color: col.white });
  box(MX, Y + 2.30, MZ + .010, .09, .60, .05, col.white, { hard: true, gloss: .12 });

  // ------------------------------------------------------------------ the window at the west end
  //
  // The west wall is solid and one-sided, so the window is a shallow bay standing in FRONT of it
  // rather than a hole through it: everything here is at x > -6.00, because anything beyond that
  // plane does not exist from in here.
  const WX = X0 + .012;
  box(WX, Y + (WSILL + WTOP) / 2, WZ, .012, WTOP - WSILL + .10, WW + .10, col.sky,
      { hard: true, mode: 1, glow: .035 });
  box(WX + .010, Y + WSILL + .18, WZ, .008, .34, WW + .08, col.skyLo,
      { hard: true, mode: 1, glow: .03 });
  for (const [tz, tw, th, tc] of [[4.05, .30, .74, col.far], [4.40, .22, .52, col.near],
                                  [4.78, .34, .88, col.far], [5.10, .20, .44, col.near]])
    box(WX + .020, Y + WSILL + th / 2, tz, .010, th, tw, tc, { hard: true, mode: 1, glow: .02 });
  for (const [ry, rz, rh, rw] of [[WSILL - .05, WZ, .10, WW + .20], [WTOP + .05, WZ, .10, WW + .20],
                                  [(WSILL + WTOP) / 2, WZ - WW / 2 - .05, WTOP - WSILL, .10],
                                  [(WSILL + WTOP) / 2, WZ + WW / 2 + .05, WTOP - WSILL, .10]])
    box(X0 + .055, Y + ry, rz, .11, rh, rw, col.wall, { hard: true, gloss: .10, ...P.plaster });
  const wf = (y, z, h, w) => box(X0 + .105, Y + y, z, .05, h, w, col.alu,
                                 { hard: true, gloss: .40, ...P.metal });
  wf(WSILL + .015, WZ, .06, WW + .06); wf(WTOP - .015, WZ, .06, WW + .06);
  wf((WSILL + WTOP) / 2, WZ - WW / 2 + .03, WTOP - WSILL, .06);
  wf((WSILL + WTOP) / 2, WZ + WW / 2 - .03, WTOP - WSILL, .06);
  wf((WSILL + WTOP) / 2, WZ, WTOP - WSILL, .05);
  box(X0 + .085, Y + (WSILL + WTOP) / 2, WZ, .010, WTOP - WSILL - .06, WW - .06, col.glass,
      { hard: true, mode: 18, alpha: .13, gloss: .78 });
  box(X0 + .17, Y + WSILL - .045, WZ, .24, .05, WW + .22, col.white,
      { hard: true, gloss: .28, tag: '窗户' });

  // ------------------------------------------------------------------ the fire stair, east end
  // Surface-mounted, and correctly so: this door never opens, so it wants no hole behind it.
  const sf = x => X1 - x;
  for (const s of [-1, 1])
    box(sf(.045), Y + (STOP + .07) / 2, SZ + s * (SW / 2 + .035), .09, STOP + .07, .07, col.steelD,
        { hard: true, gloss: .30, ...P.metal });
  box(sf(.045), Y + STOP + .035, SZ, .09, .07, SW + .14, col.steelD,
      { hard: true, gloss: .30, ...P.metal });
  box(sf(.030), Y + (STOP - .04) / 2, SZ, .06, STOP - .04, SW - .05, C('#9aa0a2'),
      { hard: true, gloss: .26, tag: '楼梯', ...P.metal });
  box(sf(.062), Y + 1.34, SZ, .012, .70, SW - .17, C('#8b9294'), { hard: true, gloss: .24 });
  box(sf(.075), Y + 1.02, SZ - .30, .05, .05, .40, col.steelX, { hard: true, gloss: .5 });
  cyl(sf(.098), Y + 1.02, SZ - .30, .020, .09, col.steel, { rx: PI / 2, gloss: .55 });
  box(sf(.070), Y + STOP - .18, SZ + .22, .06, .05, .30, col.steelX, { hard: true, gloss: .45 });
  G(sf(.066), Y + 1.72, SZ, -PI / 2, '安全出口', { size: .085, gap: .016, color: col.green });
  G(sf(.066), Y + .62, SZ, -PI / 2, '禁止堆放杂物', { size: .056, gap: .012, color: col.redD });
  G(sf(.066), Y + .50, SZ, -PI / 2, '保持通道畅通', { size: .050, gap: .012, color: col.ink });

  // ------------------------------------------------------------------ what the landing stores
  //
  // Everything hugs a wall. The colliders on both long walls already push the body to z 3.56 and
  // z 5.80, so anything inside 0.35 m of a wall needs no collider of its own — only the two deep
  // things do.

  // --- 电动车 on charge, with the lead running under 303's door, which is exactly what the notice
  // on the board forbids. This is the single most Beijing object on the floor.
  (function ebike() {
    const ex = N2 + 1.15, ez = ZN - .30;
    for (const dz of [-.34, .34]) {
      cyl(ex, FL + .21, ez + dz, .205, .085, col.rubber, { rx: PI / 2, rz: 0, gloss: .18 });
      cyl(ex, FL + .21, ez + dz, .105, .090, C('#6a7075'), { rx: PI / 2, gloss: .35 });
    }
    box(ex, FL + .40, ez, .30, .30, .78, C('#2f4f74'), { gloss: .30 });
    box(ex, FL + .60, ez - .04, .34, .16, .46, C('#37597f'), { gloss: .32 });
    cap(ex, FL + .70, ez + .28, .13, .34, .12, C('#20242a'), { rz: PI / 2, gloss: .20 });
    cyl(ex, FL + .74, ez - .30, .022, .52, C('#8e969c'), { rx: PI / 2, rz: PI / 2, gloss: .5 });
    box(ex, FL + .90, ez - .34, .26, .16, .06, C('#20242a'), { gloss: .3 });
    cyl(ex, FL + .86, ez - .40, .055, .04, C('#f2ecd0'), { rx: PI / 2, mode: 1, glow: .05 });
    box(ex, FL + .55, ez + .40, .32, .22, .16, C('#3a3f45'), { gloss: .24 });   // the battery
    cyl(ex + .13, FL + .48, ez + .40, .012, .012, C('#d84a3a'), { rz: PI / 2, mode: 1, glow: .20 });
    // the lead, snaking along the skirting and under the door
    for (let i = 0; i < 9; i++)
      cyl(ex - .18 - i * .13, FL + .020 + Math.sin(i) * .004, ez + .42 + Math.cos(i * .8) * .05,
          .009, .14, C('#e4e0d6'), { rz: PI / 2, ry: .10 * Math.sin(i), gloss: .3 });
    sha(ex, ez, .52, 1.02, .32);
    stop(ex - .28, ex + .28, ez - .48, ZN);
  })();

  // --- 自行车 leant on the flat's wall, seen side-on: 1.7 m along the wall, barely 60 mm off it.
  (function bicycle() {
    const bx = -0.30, bz = ZW + .32, lean = .07;
    for (const dx of [-.52, .52]) {
      cyl(bx + dx, FL + .34, bz + .02, .335, .055, col.rubber, { rx: PI / 2, rz: lean, gloss: .18, tag: '自行车' });
      cyl(bx + dx, FL + .34, bz + .02, .285, .060, C('#5a6064'), { rx: PI / 2, rz: lean, gloss: .30 });
      cyl(bx + dx, FL + .34, bz + .02, .045, .075, col.steel, { rx: PI / 2, rz: lean, gloss: .5 });
      for (let i = 0; i < 6; i++)
        box(bx + dx, FL + .34, bz + .02, .012, .56, .012, col.steel,
            { hard: true, rz: i * PI / 6 + lean, gloss: .45 });
    }
    const tube = (x1b, y1, x2b, y2, c) => {
      const dx = x2b - x1b, dy = y2 - y1;
      cyl((x1b + x2b) / 2, (y1 + y2) / 2, bz + .02, .020, Math.hypot(dx, dy), c || C('#3f5a3a'),
          { rz: Math.atan2(dx, dy), gloss: .42 });
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
    ball(bx - .34, FL + .96, bz - .10, .075, .085, .065, C('#dfe4e0'), { gloss: .22, alpha: .92 });
    sha(bx, bz, 1.30, .42, .32);
    stop(bx - .70, bx + .70, ZW, ZW + .46);
  })();

  // --- 老李's overflow. He grows more than the balcony holds, so three pots live in the corridor
  // beside his door, and the folding stool is out because he sits here in the afternoon.
  (function laoliCorner() {
    const px = FX + .95;
    for (const [ox, r, hgt, kind] of [[0, .105, .20, 0], [.26, .085, .17, 1], [.13, .075, .14, 2]]) {
      const z = ZW + (kind === 2 ? .40 : .20);
      taper(px + ox, FL + hgt / 2, z, r * 2, hgt, r * 2, col.terra, { gloss: .16, tag: '花' });
      cyl(px + ox, FL + hgt - .012, z, r * .86, .022, col.soil, { gloss: .05 });
      if (kind === 0) for (let i = 0; i < 7; i++)
        cap(px + ox + (i % 3 - 1) * .045, FL + hgt + .16, z + (i % 2 - .5) * .04, .020, .34, .020,
            i % 2 ? col.leaf : col.leafD, { rz: (i - 3) * .13, rx: .10, gloss: .12, tag: '花' });
      if (kind === 1) for (let i = 0; i < 9; i++)
        cap(px + ox, FL + hgt + .10, z, .014, .26, .014,
            col.leafB, { rz: (i - 4) * .22, ry: i * .7, gloss: .12, tag: '花' });
      if (kind === 2) {
        ball(px + ox, FL + hgt + .13, z, .11, .12, .11, col.leafD, { gloss: .10, tag: '花' });
        ball(px + ox + .06, FL + hgt + .20, z - .04, .07, .08, .07, col.leaf, { gloss: .10 });
      }
      sha(px + ox, z, r * 2.4, r * 2.4, .26);
    }
    // the folding stool
    box(px + .62, FL + .40, ZW + .24, .30, .04, .26, col.woodL, { gloss: .16, tag: '凳子' });
    for (const [sx, sz] of [[-.11, -.09], [.11, -.09], [-.11, .09], [.11, .09]])
      cyl(px + .62 + sx, FL + .20, ZW + .24 + sz, .014, .40, col.steelD, { gloss: .42 });
    sha(px + .62, ZW + .24, .36, .32, .28);
    // 拖鞋 and a pair of walking shoes, by the door
    for (const s of [-1, 1])
      cap(FX - .62 + s * .06, FL + .035, ZW + .20, .075, .055, .19, C('#8b6a4a'),
          { ry: s * .07, gloss: .14, tag: '鞋' });
    for (const s of [-1, 1])
      cap(FX - .90 + s * .07, FL + .045, ZW + .22, .095, .075, .255, C('#3a3630'),
          { ry: s * .05, gloss: .18, tag: '鞋' });
    sha(FX - .76, ZW + .21, .70, .30, .22);
  })();

  // --- shoes and a pushchair outside the neighbours, and the cardboard nobody takes down
  for (const [sx, c] of [[N1 + .40, C('#2c3238')], [N3 - .38, C('#a8442f')], [N4 + .40, C('#3d5470')]]) {
    for (const s of [-1, 1])
      cap(sx + s * .07, FL + .045, ZN - .20, .095, .075, .255, c, { ry: s * .05, gloss: .18, tag: '鞋' });
    sha(sx, ZN - .20, .40, .28, .22);
  }
  (function pushchair() {
    const px = N1 + 1.00, pz = ZN - .17;
    box(px, FL + .58, pz, .30, 1.02, .26, col.navy, { gloss: .18, rz: .09, tag: '婴儿车' });
    box(px + .03, FL + 1.02, pz - .02, .34, .30, .22, C('#3a4b63'), { gloss: .18, rz: .09 });
    cyl(px - .12, FL + 1.14, pz, .014, .30, col.steelD, { rz: PI / 2 + .09, gloss: .45 });
    for (const [ox, oy] of [[-.13, .10], [.13, .13]]) for (const dz of [-.07, .07])
      cyl(px + ox, FL + oy, pz + dz, .065, .045, col.rubber, { rx: PI / 2, gloss: .2 });
    sha(px, pz, .52, .40, .30);
  })();
  (function junk() {
    const jx = N3 + 1.00;
    for (const [i, w, d, h2] of [[0, .42, .34, .30], [1, .38, .30, .24], [2, .30, .26, .18]]) {
      const yb = FL + [0, .30, .54][i];
      box(jx - i * .02, yb + h2 / 2, ZN - .21, w, h2, d, C('#b18f66'), { gloss: .08, ry: i * .06 });
      box(jx - i * .02, yb + h2 - .002, ZN - .21, w - .05, .012, d - .05, C('#c49d72'),
          { hard: true, gloss: .06, ry: i * .06 });
    }
    G(jx, FL + .16, ZN - .385, PI, '易碎', { size: .052, gap: .010, color: C('#8a6a45') });
    sha(jx - .02, ZN - .21, .52, .42, .32);
    // the mop and bucket the cleaner leaves in the west corner
    const mx = X0 + .30;
    cyl(mx, FL + .69, ZW + .30, .014, 1.34, C('#9a7c4e'), { rz: .10, gloss: .18 });
    cap(mx - .13, FL + .10, ZW + .30, .10, .16, .22, C('#d8d3c2'), { gloss: .06 });
    cyl(mx + .30, FL + .13, ZW + .28, .135, .26, C('#3f6f96'), { gloss: .28 });
    cyl(mx + .30, FL + .255, ZW + .28, .118, .012, C('#8d9aa0'), { gloss: .30 });
    sha(mx + .16, ZW + .29, .60, .38, .30);
  })();

  // --- 小广告. Stamped in red on the paint at hand height, scrubbed at once and never gone.
  G(-3.90, Y + 1.32, ZW + .022, 0, '开锁', { size: .062, gap: .010, color: C('#a8352a'), gloss: .05 });
  G(-3.90, Y + 1.24, ZW + .022, 0, '80261', { size: .040, gap: .006, color: C('#a8352a'), gloss: .05 });
  G(-1.05, Y + 1.28, ZW + .022, 0, '疏通下水道', { size: .050, gap: .008, color: C('#96463a'), gloss: .05 });
  G(-2.90, Y + 1.36, ZN - .022, PI, '搬家', { size: .058, gap: .010, color: C('#9c4034'), gloss: .05 });
  G(4.80, Y + 1.30, ZW + .022, 0, '开锁换锁', { size: .050, gap: .008, color: C('#a8352a'), gloss: .05 });

  // ------------------------------------------------------------------ the words, on the landing
  // Every focus sits at z 3.90 .. 4.40, the middle of the 1.0 m walkable strip, and never inside
  // the thing it names.
  TH('走廊', -3.00, Y + 1.60, 4.30, '三楼的走廊很长。', 'The third-floor corridor is long.',
     '走 walk + 廊 covered passage. A corridor here is also storage.', -3.00, 4.30, 3.4);
  TH('邻居', N3, Y + 1.30, ZN - .10, '我的邻居住在304。', 'My neighbour lives in 304.',
     '邻 neighbouring + 居 to dwell.', N3, 4.60, 2.0);
  TH('春联', FX - .60, Y + 1.48, ZW + .06, '老李家门上贴着春联。',
     'There are spring couplets on 老李’s door.',
     '春 spring + 联 a matched pair of lines, pasted up at 春节.', FX - .60, 3.90, 2.0);
  TH('门牌', FX, Y + 1.84, ZW + .08, '门牌上写着301。', 'The number plate says 301.',
     '门 door + 牌 plate. 301 is 三零一 — third floor, first flat.', FX, 3.90, 1.9);
  TH('电表', MX, Y + 1.50, MZ + .08, '电表箱在楼道里。', 'The meter box is out in the corridor.',
     '电 electricity + 表 gauge.', MX, 3.95, 1.9);
  TH('通知', PX, Y + 1.56, PZ + .02, '墙上贴了一张通知。', 'A notice is stuck on the wall.',
     '通 to pass through + 知 to know: to inform.', PX, 3.95, 1.9);
  TH('消防栓', HX, Y + 1.40, HZ + .12, '墙上有一个消火栓。', 'There is a fire hydrant on the wall.',
     '消防栓 is what you call it; 消火栓 is what is painted on the cabinet. 栓 is a plug or a valve.', HX, 3.95, 2.0);
  TH('电动车', N2 + 1.15, Y + .70, ZN - .30, '有人在楼道里给电动车充电。',
     'Someone is charging an e-bike in the corridor.',
     '电动 electric-powered + 车 vehicle. The notice on the board forbids exactly this.',
     N2 + 1.15, 5.10, 2.0);
  TH('自行车', -0.30, Y + .80, ZW + .40, '走廊里停着一辆自行车。',
     'A bicycle is parked in the corridor.',
     '自 self + 行 travel + 车 vehicle.', -0.30, 3.95, 2.0);
  TH('安全出口', X1 - .10, Y + STOP + .19, SZ, '安全出口在东头。', 'The emergency exit is at the east end.',
     '安全 safe + 出口 exit. The green sign is the same in every building.', 5.30, 4.40, 2.3);
  TH('楼梯', X1 - .10, Y + 1.10, SZ, '楼梯在走廊的东头。',
     'The stairs are at the east end of the corridor.', '楼 storey + 梯 ladder.', 5.30, 4.40, 2.1);
  TH('窗户', X0 + .16, Y + 1.55, WZ, '走廊尽头有一扇窗户。',
     'There is a window at the end of the corridor.',
     '窗 window + 户 door-leaf; together, the fitting.', X0 + .80, 4.40, 2.1);

  // ==================================================================================== 老李家
  //
  // The rule for this flat: it must not read as the player's flat with different colours in it.
  // Everything in here is older, heavier and closer together than anything on deck 2 — dark
  // lacquered wood instead of pale board, lace instead of cushions, a cabinet with the good
  // crockery locked behind glass, and forty years of photographs on one wall.

  // ---- a few things this file builds more than once, written once.
  // A framed thing on a wall. `yaw` faces the reader; the frame stands 20 mm off the plaster and
  // the picture 8 mm off the frame, so nothing shares a plane with the wall it hangs on.
  // The frame is always described as if it faced +z — width in x, height in y, thickness in z —
  // and `ry` turns it. Swapping the dimensions AND passing a rotation applies the turn twice, and
  // the first version of this did exactly that: every photograph on the spine wall came out as a
  // 0.24 m square standing edge-on to the room.
  function frame(x, y, z, yaw, w, h, pic, o = {}) {
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    const at = d => [x + nx * d, z + nz * d];
    const [fx, fz] = at(.018), [px, pz] = at(.031);
    box(fx, y, fz, w + .05, h + .05, .030, o.f || col.woodE,
        { hard: true, gloss: .30, ry: yaw, tag: o.tag });
    box(px, y, pz, w - .04, h - .04, .010, pic, { hard: true, gloss: .12, ry: yaw, tag: o.tag });
    return at(.045);
  }
  // A 太师椅-ish upright chair in lacquered hardwood: the chair every one of these flats has four of.
  function hardChair(x, z, ry, c) {
    const w = c || col.woodD;
    box(x, FL + .44, z, .42, .045, .40, w, { hard: true, gloss: .30, ry, ...P.wood });
    for (const [ox, oz] of [[-.17, -.16], [.17, -.16], [-.17, .16], [.17, .16]]) {
      const cx = x + ox * Math.cos(ry) - oz * Math.sin(ry), cz = z + ox * Math.sin(ry) + oz * Math.cos(ry);
      box(cx, FL + .22, cz, .035, .44, .035, w, { hard: true, gloss: .30, ...P.wood });
    }
    const bx = x - Math.sin(ry) * .18, bz = z - Math.cos(ry) * .18;
    box(bx, FL + .70, bz, .40, .50, .035, w, { hard: true, gloss: .30, ry, ...P.wood });
    box(bx, FL + .92, bz, .44, .06, .045, w, { hard: true, gloss: .32, ry, ...P.wood });
    sha(x, z, .48, .46, .30);
  }
  // 拖鞋 — a pair, toes together. Nothing in this flat is worn outside it.
  const slippers = (x, z, c, ry = 0) => {
    for (const s of [-1, 1])
      cap(x + s * .055, FL + .030, z, .062, .048, .155, c, { ry: ry + s * .06, gloss: .12, tag: '拖鞋' });
  };

  // ------------------------------------------------------------------ 玄关, just inside the door
  //
  // Shoes come off here and never go further. The cabinet is against the wall the door is cut in,
  // east of the opening, with the mirror and the calendar over it.
  (function xuanguan() {
    const cx = 5.05, cz = ZW - .17;
    box(cx, FL + .40, cz, 1.34, .80, .32, col.woodM, { hard: true, gloss: .26, tag: '鞋柜', ...P.wood });
    box(cx, FL + .82, cz, 1.42, .05, .36, col.woodD, { hard: true, gloss: .34, tag: '鞋柜', ...P.wood });
    for (const dx of [-.335, .335]) {
      box(cx + dx, FL + .40, cz - .165, .62, .72, .020, col.woodL,
          { hard: true, gloss: .28, tag: '鞋柜', ...P.wood });
      cyl(cx + dx + .24, FL + .40, cz - .19, .016, .085, col.brass, { rx: PI / 2, gloss: .55 });
    }
    stop(cx - .70, cx + .70, cz - .20, ZW);
    sha(cx, cz, 1.44, .40, .34);
    // what lives on top of a 鞋柜: the basket for keys, a torch, a bottle of water, a spare mask
    box(cx - .48, FL + .93, cz, .26, .16, .20, col.bamboo, { gloss: .12 });
    box(cx - .48, FL + .96, cz, .21, .06, .15, C('#8a6a3a'), { hard: true, gloss: .10 });
    cyl(cx - .12, FL + .93, cz + .02, .028, .17, C('#2e3338'), { gloss: .40 });
    cyl(cx + .18, FL + .96, cz - .01, .034, .22, C('#cfe0e6'), { gloss: .55, alpha: .85 });
    cyl(cx + .18, FL + 1.08, cz - .01, .026, .03, C('#3f6f96'), { gloss: .40 });
    // 挂历 — the wall calendar every flat like this has, one page a month, hung on a nail
    const kx = 5.05, ky = Y + 1.62;
    box(kx, ky, ZW - .022, .40, .58, .014, col.paper, { hard: true, gloss: .06, tag: '挂历' });
    box(kx, ky + .20, ZW - .032, .38, .18, .010, C('#b5312a'), { hard: true, gloss: .08, tag: '挂历' });
    G(kx, ky + .215, ZW - .044, PI, '三月', { size: .088, gap: .018, color: col.gold, tag: '挂历' });
    for (let r = 0; r < 4; r++) for (let i = 0; i < 7; i++)
      box(kx - .155 + i * .052, ky - .015 - r * .055, ZW - .034, .034, .034, .008,
          (r === 1 && i === 3) ? C('#c8433a') : C('#e6e0cf'), { hard: true, gloss: .05 });
    cyl(kx, ky + .32, ZW - .026, .008, .012, col.steelD, { rz: PI / 2, gloss: .5 });
    // the mirror, west of the door, over the hooks
    const mx = 2.75;
    box(mx, Y + 1.52, ZW - .022, .44, .62, .026, col.woodD, { hard: true, gloss: .30, tag: '镜子' });
    box(mx, Y + 1.52, ZW - .038, .37, .55, .008, C('#c6d3d6'),
        { hard: true, gloss: .86, alpha: .92, tag: '镜子' });
    // coat hooks with what hangs on them all winter
    box(mx, Y + 1.02, ZW - .030, .74, .09, .04, col.woodM, { hard: true, gloss: .26, ...P.wood });
    for (const hx2 of [-.26, 0, .26]) cyl(mx + hx2, Y + .99, ZW - .062, .010, .07, col.brass,
                                          { rx: PI / 2, gloss: .55 });
    box(mx - .26, Y + .68, ZW - .16, .34, .62, .17, C('#3b4a5c'), { gloss: .10, ...P.cloth, tag: '外套' });
    box(mx - .26, Y + .96, ZW - .15, .22, .12, .14, C('#33414f'), { gloss: .10, ...P.cloth });
    box(mx + .26, Y + .74, ZW - .13, .26, .34, .10, C('#7d3b33'), { gloss: .08, ...P.cloth });
    G(mx + .26, Y + .76, ZW - .186, PI, '为人民服务', { size: .036, gap: .006, color: C('#e0d3a8') });
    // 拐杖 — a walking stick leaning in the corner, and a shopping trolley folded beside it
    cyl(5.86, FL + .46, ZW - .12, .014, .92, col.woodL, { rz: .10, rx: -.04, gloss: .22, tag: '拐杖' });
    cyl(5.83, FL + .90, ZW - .14, .016, .11, C('#4a4038'), { rz: 1.2, gloss: .18 });
    sha(5.86, ZW - .12, .16, .16, .22);
    // slippers waiting, and the low stool you sit on to change them
    slippers(4.30, ZW - .32, C('#7a4a3c'));
    slippers(4.62, ZW - .32, C('#3f5a6b'), .12);
    slippers(2.20, ZW - .30, C('#8a7f5e'), -.10);
    sha(4.46, ZW - .32, .60, .26, .20);
    box(3.35, FL + .26, ZW - .30, .32, .05, .26, col.woodL, { hard: true, gloss: .24, ...P.wood });
    for (const [ox, oz] of [[-.12, -.09], [.12, -.09], [-.12, .09], [.12, .09]])
      box(3.35 + ox, FL + .13, ZW - .30 + oz, .035, .26, .035, col.woodM,
          { hard: true, gloss: .24, ...P.wood });
    sha(3.35, ZW - .30, .38, .32, .26);
  })();

  // ------------------------------------------------------------------ the half wall
  // The 客厅 needs a back for the sofa and the flat needs somewhere the hall stops being the hall.
  // A 0.95 m timber screen with a run of pots along the top does both, and leaves the whole of
  // x 1.30 .. 6.00 open so the room is never a corridor.
  (function screen() {
    const x0 = SPX + .06, x1 = 1.30, cx = (x0 + x1) / 2;
    box(cx, Y + .48, 1.45, x1 - x0, .95, .16, col.plasterD, { hard: true, gloss: .12, ...P.plaster });
    box(cx, Y + .975, 1.45, x1 - x0 + .06, .06, .24, col.woodM,
        { hard: true, gloss: .30, ...P.wood });
    box(cx, Y + .12, 1.45, x1 - x0 + .02, .13, .19, col.woodM, { hard: true, gloss: .22, ...P.wood });
    stop(x0, x1, 1.36, 1.54);
    // 绿萝 trailing off the top of it, which is what these ledges are for
    for (const [px, r] of [[-2.05, .075], [-1.05, .085], [0.10, .070], [1.00, .080]]) {
      cyl(px, Y + 1.06, 1.45, r, .13, col.terra, { gloss: .18, tag: '花' });
      cyl(px, Y + 1.12, 1.45, r * .84, .020, col.soil, { gloss: .05 });
      for (let i = 0; i < 6; i++)
        cap(px + (i % 3 - 1) * .06, Y + 1.10 - i * .045, 1.45 + (i % 2 - .5) * .10,
            .048, .10, .022, i % 2 ? col.leaf : col.leafB,
            { rz: (i - 3) * .30, ry: i * .9, gloss: .14, tag: '花' });
    }
  })();

  // ------------------------------------------------------------------ 客厅
  (function keting() {
    // --- the rug the whole group sits on. Built by hand: A.rug lays its bands at y ≈ 0.005 in
    // world space, which on this deck is six metres under the floor, in the lobby.
    const RGX = 0.30, RGZ = 0.10;
    for (const [i, inset, c] of [[0, 0, C('#7d3b33')], [1, .22, C('#8f4a3c')],
                                 [2, .40, C('#6e3029')], [3, .56, C('#a06a4a')]])
      flat(RGX, Y + .009 + i * .0035, RGZ, 3.30 - inset, 2.10 - inset, c, { mode: 7, gloss: .03 });
    for (let i = 0; i < 22; i++) {
      const fx2 = RGX - 1.65 + (i + .5) * (3.30 / 22);
      for (const s of [-1, 1])
        box(fx2, Y + .014, RGZ + s * 1.08, .085, .012, .05, C('#7d3b33'),
            { mode: 7, gloss: .03, ry: (i % 3 - 1) * .05 });
    }

    // --- 沙发. Dark lacquered frame, hard cushions, and a crocheted antimacassar on the back and
    // on both arms — the single detail that says "somebody's grandparents live here".
    const SX = 0.30, SZ2 = 1.02;
    box(SX, FL + .20, SZ2, 2.16, .40, .82, col.woodD, { hard: true, gloss: .28, tag: '沙发', ...P.wood });
    box(SX, FL + .06, SZ2, 2.24, .12, .88, col.woodD, { hard: true, gloss: .30, ...P.wood });
    for (const dx of [-.68, 0, .68])
      box(SX + dx, FL + .46, SZ2 - .04, .64, .16, .62, col.cloth, { gloss: .05, ...P.cloth, tag: '沙发' });
    box(SX, FL + .70, SZ2 + .30, 2.16, .58, .18, col.woodD, { hard: true, gloss: .28, ...P.wood });
    for (const dx of [-.68, 0, .68])
      box(SX + dx, FL + .68, SZ2 + .20, .64, .46, .14, col.clothD, { gloss: .05, ...P.cloth, tag: '沙发' });
    for (const s of [-1, 1]) {
      box(SX + s * 1.02, FL + .52, SZ2, .14, .30, .82, col.woodD,
          { hard: true, gloss: .30, tag: '沙发', ...P.wood });
      box(SX + s * 1.02, FL + .68, SZ2, .17, .015, .34, col.lace, { hard: true, gloss: .04 });
    }
    // the antimacassar over the back rail, and the two cushions everybody keeps
    for (const dx of [-.68, 0, .68])
      box(SX + dx, FL + .995, SZ2 + .30, .44, .012, .22, col.lace, { hard: true, gloss: .04 });
    box(SX - .74, FL + .60, SZ2 - .02, .32, .30, .14, C('#9c5a4a'), { gloss: .05, ...P.cloth });
    box(SX + .80, FL + .60, SZ2 - .02, .30, .28, .14, C('#5f6f57'), { gloss: .05, ...P.cloth });
    stop(SX - 1.12, SX + 1.12, SZ2 - .44, SZ2 + .42);
    sha(SX, SZ2, 2.34, .96, .34);

    // --- two armchairs, turned in towards the table, each with its own antimacassar
    function armchair(x, z, ry) {
      const c = Math.cos(ry), s2 = Math.sin(ry);
      const at = (ox, oz) => [x + ox * c - oz * s2, z + ox * s2 + oz * c];
      box(x, FL + .20, z, .84, .40, .80, col.woodD, { hard: true, gloss: .28, ry, tag: '椅子', ...P.wood });
      box(x, FL + .06, z, .90, .12, .86, col.woodD, { hard: true, gloss: .30, ry, ...P.wood });
      box(x, FL + .46, z, .62, .16, .60, col.cloth, { gloss: .05, ry, ...P.cloth, tag: '椅子' });
      const [bx, bz] = at(0, .30);
      box(bx, FL + .70, bz, .84, .58, .18, col.woodD, { hard: true, gloss: .28, ry, ...P.wood });
      box(bx, FL + .68, bz - .10 * c, .62, .46, .14, col.clothD, { gloss: .05, ry, ...P.cloth });
      box(bx, FL + .995, bz, .40, .012, .22, col.lace, { hard: true, gloss: .04, ry });
      for (const sd of [-1, 1]) {
        const [ax, az] = at(sd * .36, 0);
        box(ax, FL + .52, az, .14, .30, .80, col.woodD, { hard: true, gloss: .30, ry, ...P.wood });
        box(ax, FL + .68, az, .16, .015, .32, col.lace, { hard: true, gloss: .04, ry });
      }
      stop(x - .52, x + .52, z - .50, z + .50);
      sha(x, z, .96, .94, .32);
    }
    armchair(-1.62, 0.44, 0.62);
    armchair(2.22, 0.44, -0.62);

    // --- 茶几. No collider: it is 0.42 m high, and a solid there closes the only gap between the
    // sofa and the television. Everything a Beijing sitting room keeps on one is on it.
    const TX = 0.30, TZ = -0.32;
    box(TX, FL + .40, TZ, 1.24, .05, .64, col.woodD, { hard: true, gloss: .34, tag: '茶几', ...P.wood });
    box(TX, FL + .22, TZ, 1.10, .05, .52, col.woodM, { hard: true, gloss: .26, ...P.wood });
    for (const [ox, oz] of [[-.54, -.26], [.54, -.26], [-.54, .26], [.54, .26]])
      box(TX + ox, FL + .20, TZ + oz, .05, .40, .05, col.woodD, { hard: true, gloss: .30, ...P.wood });
    sha(TX, TZ, 1.34, .74, .34);
    // 暖水瓶 on a crocheted doily. The bamboo-cased flask, the red cap, the printed peony band.
    const WX = TX - .44;
    cyl(WX, FL + .432, TZ + .12, .10, .010, col.lace, { gloss: .04 });
    cyl(WX, FL + .60, TZ + .12, .085, .32, C('#d8c9a0'), { gloss: .22, tag: '暖水瓶', ...P.wood });
    cyl(WX, FL + .60, TZ + .12, .088, .06, C('#a8332a'), { gloss: .24, tag: '暖水瓶' });
    ball(WX, FL + .612, TZ + .04, .050, .050, .012, C('#c8543f'), { gloss: .18 });
    ball(WX, FL + .652, TZ + .04, .034, .034, .010, C('#e0dcc8'), { gloss: .18 });
    taper(WX, FL + .77, TZ + .12, .13, .07, .13, C('#c2b291'), { gloss: .22, tag: '暖水瓶' });
    cyl(WX, FL + .82, TZ + .12, .050, .055, C('#a8332a'), { gloss: .34, tag: '暖水瓶' });
    cyl(WX - .11, FL + .58, TZ + .12, .010, .16, C('#8a7b5e'), { rz: PI / 2, ry: PI / 2, gloss: .3 });
    // the tea things: a glass jar of leaves, two lidded cups, a saucer of melon seeds
    const JX = TX - .05;
    cyl(JX, FL + .50, TZ - .12, .056, .16, C('#cfe0e0'), { mode: 18, alpha: .30, gloss: .80, tag: '茶叶' });
    cyl(JX, FL + .475, TZ - .12, .048, .10, col.teaG, { gloss: .10, tag: '茶叶' });
    cyl(JX, FL + .585, TZ - .12, .056, .022, C('#b8a074'), { gloss: .32, tag: '茶叶' });
    for (const [ox, oz] of [[.30, .06], [.44, -.10]]) {
      cyl(TX + ox, FL + .465, TZ + oz, .042, .075, col.porc, { gloss: .48, tag: '茶杯' });
      cyl(TX + ox, FL + .506, TZ + oz, .044, .012, C('#dfe6e6'), { gloss: .52 });
      cyl(TX + ox, FL + .516, TZ + oz, .014, .012, col.blueW, { gloss: .5 });
      cyl(TX + ox, FL + .432, TZ + oz, .058, .010, col.porc, { gloss: .46 });
    }
    cyl(TX + .12, FL + .437, TZ + .20, .075, .020, col.porc, { gloss: .44 });
    for (let i = 0; i < 11; i++)
      ball(TX + .12 + Math.cos(i * 2.1) * .045, FL + .452, TZ + .20 + Math.sin(i * 2.1) * .045,
           .012, .006, .008, C('#4a4034'), { gloss: .18, ry: i * .8 });
    // 花镜 on a folded newspaper — the reading glasses go down where the reading stopped
    box(TX + .40, FL + .432, TZ + .18, .30, .010, .22, C('#dcd8ca'), { hard: true, gloss: .04, ry: -.12 });
    box(TX + .40, FL + .436, TZ + .18, .28, .002, .10, C('#b9b4a4'), { hard: true, gloss: .04, ry: -.12 });
    G(TX + .38, FL + .440, TZ + .13, 0, '北京晚报',
      { size: .028, gap: .005, color: C('#4a463c'), lift: .002 });
    for (const s of [-1, 1]) {
      cyl(TX + .40 + s * .048, FL + .448, TZ + .21, .028, .006, C('#2f3338'), { gloss: .55, tag: '花镜' });
      cyl(TX + .40 + s * .048, FL + .448, TZ + .21, .022, .008, C('#cfe0e6'),
          { mode: 18, alpha: .35, gloss: .85, tag: '花镜' });
      box(TX + .40 + s * .085, FL + .450, TZ + .27, .012, .006, .11, C('#2f3338'),
          { hard: true, gloss: .5, ry: s * .18, tag: '花镜' });
    }
    // and the remote, because the television is the loudest thing in this flat
    box(TX + .04, FL + .434, TZ + .22, .055, .014, .17, C('#3a3f44'), { hard: true, gloss: .3, ry: .3 });

    // --- 电视 and its cabinet. A flat panel the children bought, standing on a lacquered chest
    // that is thirty years older than it is.
    const VX = 0.30, VZ = -1.42;
    box(VX, FL + .27, VZ, 1.74, .54, .44, col.woodD, { hard: true, gloss: .30, tag: '电视柜', ...P.wood });
    box(VX, FL + .56, VZ, 1.82, .05, .48, col.woodM, { hard: true, gloss: .36, ...P.wood });
    for (const dx of [-.42, .42]) {
      box(VX + dx, FL + .30, VZ + .222, .74, .40, .018, col.woodM,
          { hard: true, gloss: .28, ...P.wood });
      cyl(VX + dx, FL + .30, VZ + .245, .022, .020, col.brass, { rx: PI / 2, gloss: .55 });
    }
    stop(VX - .95, VX + .95, VZ - .26, VZ + .26);
    sha(VX, VZ, 1.92, .56, .34);
    // the set: bezel, screen, stand. The screen is 1.02 x 0.58 = 0.59 m2, so its glow stays low.
    box(VX, FL + .62, VZ, .16, .06, .18, C('#2a2e33'), { hard: true, gloss: .40 });
    // The set faces the sofa, which is at +z of it, so every layer of the picture has to stand
    // PROUD of the bezel in +z. Built the other way round the bezel is simply in front of the
    // screen and the television is a black rectangle — which is exactly how the first render of
    // this room came out. The lit face is 1.02 x 0.58 = 0.59 m2, so its glow stays modest.
    box(VX, FL + .96, VZ + .02, 1.10, .64, .05, C('#22262b'), { hard: true, gloss: .42, tag: '电视' });
    box(VX, FL + .96, VZ + .050, 1.02, .58, .010, C('#7ea6c4'),
        { hard: true, mode: 1, glow: .050, tag: '电视' });
    box(VX, FL + .88, VZ + .056, .70, .22, .006, C('#33597c'), { hard: true, mode: 1, glow: .042 });
    for (const dx of [-.20, .20]) {
      box(VX + dx, FL + .90, VZ + .058, .21, .16, .006, C('#2c3a4e'), { hard: true, mode: 1, glow: .036 });
      ball(VX + dx, FL + 1.02, VZ + .060, .075, .095, .006, C('#c9a98c'), { mode: 1, glow: .046 });
    }
    box(VX, FL + .80, VZ + .058, .96, .11, .006, C('#a8352a'), { hard: true, mode: 1, glow: .06 });
    G(VX, FL + .802, VZ + .064, 0, '新闻联播', { size: .052, gap: .012, color: C('#f2e6c0'),
                                                 mode: 1, glow: .075 });
    // the light it throws into a room where the curtains are half drawn
    glow(M.trs(VX, FL + .008, VZ + .95, 0, 2.60, 1, 1.70), C('#9fc3dd'), .075);
    light(VX, FL + .96, VZ + .30, C('#a9c8e2'), .30, 2.60);
    // the doily and the two things that live on a Chinese television cabinet
    box(VX - .68, FL + .592, VZ - .02, .24, .010, .18, col.lace, { hard: true, gloss: .04 });
    cyl(VX - .68, FL + .66, VZ - .02, .052, .12, C('#2f4a3c'), { gloss: .30 });
    for (let i = 0; i < 5; i++)
      cap(VX - .68 + (i % 3 - 1) * .035, FL + .80, VZ - .02 + (i % 2 - .5) * .035,
          .014, .22, .014, i % 2 ? col.leaf : col.leafD, { rz: (i - 2) * .18, gloss: .12 });
    // 收音机 — a small mains radio with a speaker grille, two knobs and a telescopic aerial
    const RX2 = VX + .66;
    box(RX2, FL + .655, VZ - .01, .30, .17, .13, C('#6b4a2f'), { hard: true, gloss: .30, tag: '收音机', ...P.wood });
    box(RX2 - .05, FL + .655, VZ - .078, .16, .13, .010, C('#3a332a'), { hard: true, gloss: .16, tag: '收音机' });
    box(RX2 + .08, FL + .70, VZ - .078, .09, .045, .010, C('#d8cfae'), { hard: true, gloss: .20 });
    for (const [ox, oy] of [[.07, -.03], [.12, -.03]])
      cyl(RX2 + ox, FL + .655 + oy, VZ - .080, .020, .012, C('#c8b48a'), { rx: PI / 2, gloss: .45 });
    cyl(RX2 + .13, FL + .86, VZ + .03, .005, .40, col.steel, { rz: .22, gloss: .6, tag: '收音机' });

    // --- 玻璃柜, against the east wall. Behind the glass: the good crockery nobody eats off, a
    // trophy, two 奖状 and the photographs that did not fit on the wall.
    const GX = X1 - .24, GZ = -0.55;
    box(GX, FL + .90, GZ, .44, 1.80, 1.62, col.woodD, { hard: true, gloss: .30, tag: '柜子', ...P.wood });
    box(GX, FL + 1.83, GZ, .50, .08, 1.72, col.woodM, { hard: true, gloss: .34, ...P.wood });
    box(GX - .23, FL + .90, GZ, .02, 1.66, 1.50, C('#6a5236'), { hard: true, gloss: .22 });
    // a strip light along the underside of the top, which is what these cabinets have and what
    // makes the crockery read at all against the back of a 1.6 m deep box
    box(GX - .12, FL + 1.78, GZ, .22, .012, 1.36, C('#fff2d2'), { hard: true, mode: 1, glow: .035 });
    light(GX - .40, FL + 1.66, GZ, C('#ffe8bc'), .26, 2.00);
    for (const sy of [.42, .86, 1.30, 1.70])
      box(GX - .10, FL + sy, GZ, .26, .030, 1.48, col.woodM, { hard: true, gloss: .30, ...P.wood });
    stop(GX - .30, X1, GZ - .84, GZ + .84);
    sha(GX, GZ, .52, 1.74, .34);
    // the crockery: a stack of bowls, a 茶具 set, two 白酒 bottles, a 弥勒佛
    for (let i = 0; i < 5; i++)
      cyl(GX - .10, FL + .455 + i * .035, GZ + .48, .062, .034, i % 2 ? col.porc : C('#e7ecf0'),
          { gloss: .50 });
    cyl(GX - .10, FL + .50, GZ + .18, .085, .085, col.porc, { gloss: .50 });
    cyl(GX - .10, FL + .548, GZ + .18, .048, .026, col.blueW, { gloss: .50 });
    for (let i = 0; i < 4; i++)
      cyl(GX - .10, FL + .455, GZ - .10 - i * .10, .035, .045, col.porc, { gloss: .50 });
    for (const [oz, c] of [[-.52, C('#d8dce0')], [-.40, C('#3f4a3a')]])
      cyl(GX - .10, FL + .93, GZ + oz, .036, .22, c, { gloss: .55 });
    cap(GX - .10, FL + 1.44, GZ + .40, .075, .16, .075, C('#e6c98a'), { gloss: .40 });
    ball(GX - .10, FL + 1.53, GZ + .40, .052, .046, .052, C('#e6c98a'), { gloss: .40 });
    // the trophy and the two red 奖状 propped at the back of the shelf
    cyl(GX - .10, FL + .96, GZ + .52, .020, .16, C('#c8a03a'), { gloss: .60 });
    taper(GX - .10, FL + 1.07, GZ + .52, .11, .09, .11, C('#d4ad48'), { gloss: .60 });
    for (const [oz, w2] of [[-.20, .30], [.06, .26]]) {
      box(GX - .06, FL + 1.48, GZ + oz, .014, .22, w2, C('#b5312a'), { hard: true, gloss: .12, tag: '奖状' });
      G(GX - .075, FL + 1.48, GZ + oz, -PI / 2, '奖状', { size: .062, gap: .014, color: col.gold });
    }
    for (const [oz, c] of [[.60, C('#c9c2b0')], [-.62, C('#b8ada0')]])
      box(GX - .07, FL + 1.90, GZ + oz, .02, .17, .22, col.woodM, { hard: true, gloss: .30, ...P.wood });
    // the glass doors, last and 20 mm proud, so no pane ever shares a plane with a shelf
    for (const oz of [-.40, .40])
      box(GX - .225, FL + .90, GZ + oz, .012, 1.58, .74, C('#d6e4e8'),
          { hard: true, mode: 18, alpha: .16, gloss: .80, tag: '柜子' });
    for (const oz of [-.02, .02])
      box(GX - .235, FL + .90, GZ + oz, .022, 1.60, .04, col.woodD, { hard: true, gloss: .32 });
    cyl(GX - .255, FL + .96, GZ - .06, .010, .10, col.brass, { rx: PI / 2, gloss: .55 });
    cyl(GX - .255, FL + .96, GZ + .06, .010, .10, col.brass, { rx: PI / 2, gloss: .55 });

    // --- 中堂: the calligraphy scroll on the east wall, with a couplet down each side of it.
    // Paper, two rollers, one red seal. This is the highest-value readable Chinese in the flat.
    const CZ = 0.95, CW = .80;
    box(X1 - .020, Y + 1.55, CZ, .012, 1.20, CW, C('#efe7cf'), { hard: true, gloss: .06, tag: '书法' });
    for (const sy of [-.62, .62])
      cyl(X1 - .028, Y + 1.55 + sy, CZ, .016, CW + .10, C('#6b4c2c'),
          { rx: PI / 2, ry: PI / 2, gloss: .30, tag: '书法' });
    G(X1 - .034, Y + 1.62, CZ, -PI / 2, '厚德载物',
      { size: .225, gap: .050, color: C('#20180f'), vertical: true, tag: '书法' });
    box(X1 - .034, Y + .98, CZ - .24, .008, .085, .085, C('#a8302a'), { hard: true, gloss: .10 });
    G(X1 - .040, Y + .98, CZ - .24, -PI / 2, '印', { size: .052, color: C('#f0e4d4') });
    for (const [oz, text] of [[-.62, '室雅何须大'], [.62, '花香不在多']]) {
      box(X1 - .020, Y + 1.55, CZ + oz, .012, 1.06, .17, C('#e8dcc0'), { hard: true, gloss: .06 });
      G(X1 - .032, Y + 1.55, CZ + oz, -PI / 2, text,
        { size: .105, gap: .020, color: C('#2a2016'), vertical: true });
    }

    // --- 象棋, set up mid-game on a square stool by the balcony door, two 马扎 pulled up to it.
    const QX = 4.90, QZ = -1.90;
    box(QX, FL + .43, QZ, .62, .05, .62, col.woodL, { hard: true, gloss: .28, tag: '象棋', ...P.wood });
    for (const [ox, oz] of [[-.26, -.26], [.26, -.26], [-.26, .26], [.26, .26]])
      box(QX + ox, FL + .21, QZ + oz, .045, .42, .045, col.woodM, { hard: true, gloss: .26, ...P.wood });
    box(QX, FL + .458, QZ, .52, .006, .56, C('#d8c69a'), { hard: true, gloss: .10, tag: '象棋' });
    for (let i = 0; i < 9; i++)
      box(QX - .24 + i * .06, FL + .462, QZ, .005, .002, .54, C('#6b563a'), { hard: true });
    for (let i = 0; i < 10; i++)
      box(QX, FL + .462, QZ - .27 + i * .06, .50, .002, .005, C('#6b563a'), { hard: true });
    box(QX, FL + .462, QZ, .50, .002, .058, C('#d8c69a'), { hard: true });
    G(QX, FL + .464, QZ, 0, '楚河', { size: .034, gap: .010, color: C('#6b563a'), lift: .002 });
    for (let i = 0; i < 14; i++) {
      const px2 = QX - .24 + (i % 7) * .08, pz2 = QZ - .22 + Math.floor(i / 7) * .40;
      cyl(px2, FL + .472, pz2, .026, .016, i < 7 ? C('#d8c08a') : C('#c9b07a'),
          { gloss: .24, tag: '象棋' });
      G(px2, FL + .481, pz2, 0, i < 7 ? '車' : '將',
        { size: .026, color: i < 7 ? C('#a8302a') : C('#241c16'), lift: .002 });
    }
    sha(QX, QZ, .70, .70, .30);
    for (const [sx2, sz2, ry2] of [[QX - .58, QZ + .06, .3], [QX + .10, QZ + .60, -.2]]) {
      box(sx2, FL + .30, sz2, .34, .04, .28, C('#7a5b3a'), { hard: true, gloss: .20, ry: ry2, ...P.wood });
      for (const s of [-1, 1])
        box(sx2 + s * .13, FL + .15, sz2, .035, .30, .26, col.woodM,
            { hard: true, gloss: .22, ry: ry2, ...P.wood });
      sha(sx2, sz2, .40, .34, .28);
    }

    // --- 照片墙: forty years of them, on the spine wall between the two bedroom doors, plus the
    // 奖状 that came with a lifetime at the same 单位.
    const FXW = SPX + SPT / 2;
    const shots = [[-1.55, 1.70, .30, .24, C('#b9b2a2')], [-1.18, 1.72, .22, .28, C('#a8a496')],
                   [-0.84, 1.68, .26, .22, C('#c0b8a6')], [-1.42, 1.38, .24, .30, C('#aeb3ad')],
                   [-1.04, 1.34, .30, .24, C('#b5aa98')], [-0.66, 1.36, .22, .26, C('#a9a294')],
                   [-1.30, 1.02, .34, .26, C('#c2b7a2')], [-0.86, 1.00, .24, .22, C('#b0a89a')]];
    for (let i = 0; i < shots.length; i++) {
      const [oz, hy, w2, h2, c] = shots[i];
      frame(FXW, Y + hy, oz, PI / 2, w2, h2, c, { f: i % 3 ? col.woodD : col.woodM, tag: '照片' });
    }
    for (const [oz, hy] of [[-0.62, 1.72], [-0.60, 1.36]]) {
      box(FXW + .020, Y + hy, oz, .34, .26, .014, C('#b5312a'),
          { hard: true, gloss: .12, ry: PI / 2, tag: '奖状' });
      box(FXW + .030, Y + hy, oz, .29, .21, .010, C('#c94036'),
          { hard: true, gloss: .10, ry: PI / 2 });
      G(FXW + .040, Y + hy + .06, oz, PI / 2, '奖状', { size: .072, gap: .016, color: col.gold, tag: '奖状' });
      G(FXW + .040, Y + hy - .04, oz, PI / 2, '先进工作者', { size: .030, gap: .006, color: C('#f0d69a') });
    }

    // --- 挂钟, on the spine between the 卧室 and 厨房 doors, where a wall clock always is.
    const KX2 = SPX + SPT / 2 + .020, KY = Y + 1.78, KZ2 = 1.32;
    cyl(KX2, KY, KZ2, .17, .07, col.woodD, { rz: PI / 2, gloss: .30, tag: '钟' });
    cyl(KX2 + .040, KY, KZ2, .148, .012, C('#f2ecdc'), { rz: PI / 2, gloss: .16, tag: '钟' });
    for (let i = 0; i < 12; i++)
      box(KX2 + .050, KY + Math.cos(i * PI / 6) * .118, KZ2 - Math.sin(i * PI / 6) * .118,
          .006, i % 3 ? .016 : .026, i % 3 ? .006 : .010, col.ink, { hard: true });
    A.dial(KX2 + .052, KY, KZ2, PI / 2, [
      { p: box(KX2 + .056, KY, KZ2, .008, .075, .010, col.ink, { hard: true }),
        per: 720, off: .004, len: .075, w: .010, t: .008 },
      { p: box(KX2 + .058, KY, KZ2, .006, .112, .008, col.ink, { hard: true }),
        per: 60, off: .006, len: .112, w: .007, t: .006 },
    ]);
    cyl(KX2 + .062, KY, KZ2, .010, .012, C('#a8302a'), { rz: PI / 2, gloss: .5 });

    // --- 饭桌: a small round table by the study door, which is where they actually eat.
    const DX = -0.95, DZ = -2.50;
    cyl(DX, FL + .72, DZ, .56, .045, col.woodM, { gloss: .32, tag: '饭桌', ...P.wood });
    cyl(DX, FL + .70, DZ, .58, .022, col.woodD, { gloss: .30, ...P.wood });
    cyl(DX, FL + .36, DZ, .075, .68, col.woodD, { gloss: .28, ...P.wood });
    taper(DX, FL + .06, DZ, .46, .12, .46, col.woodD, { gloss: .28, ...P.wood });
    // 0.52, and the table pushed 0.35 m east of where it first stood. `clampMove` inflates a
    // collider by the body radius at each side, and 客厅's own zone insets to x -2.15: with the
    // table where it was, the band of x a body could occupy on the way to the 书房 door was
    // 0.05 m wide. Measured with World.clampMove, walking 客厅 -> 书房 in 5 cm steps.
    stop(DX - .52, DX + .52, DZ - .52, DZ + .52);
    sha(DX, DZ, 1.24, 1.24, .36);
    // a 茶壶 under a padded cosy, two cups, a dish of 花生
    cyl(DX + .02, FL + .755, DZ - .04, .17, .020, col.lace, { gloss: .04 });
    ball(DX + .02, FL + .84, DZ - .04, .145, .115, .145, C('#8f4a3c'), { gloss: .06, ...P.cloth, tag: '茶壶' });
    cyl(DX + .02, FL + .945, DZ - .04, .045, .05, C('#7d3b33'), { gloss: .06, ...P.cloth });
    for (const [ox, oz] of [[-.30, .22], [.28, .24]]) {
      cyl(DX + ox, FL + .775, DZ + oz, .038, .065, col.porc, { gloss: .48, tag: '茶杯' });
      cyl(DX + ox, FL + .812, DZ + oz, .012, .010, col.blueW, { gloss: .5 });
    }
    cyl(DX - .06, FL + .755, DZ + .34, .085, .022, col.porc, { gloss: .46 });
    for (let i = 0; i < 9; i++)
      ball(DX - .06 + Math.cos(i * 2.3) * .050, FL + .775, DZ + .34 + Math.sin(i * 2.3) * .050,
           .016, .012, .011, C('#c9a877'), { gloss: .16, ry: i });
    hardChair(DX + .05, DZ + .86, PI, col.woodD);
    hardChair(DX + .86, DZ - .04, -PI / 2, col.woodD);

    // --- the light. Two modest sources rather than one bright one: the 吸顶灯 over the group and
    // a standard lamp beside the sofa. The fitting itself is a 0.36 m2 disc, so its glow is small.
    cyl(1.20, CY - .085, -0.40, .30, .13, C('#f6f0dc'), { mode: 1, glow: .05, tag: '灯' });
    cyl(1.20, CY - .022, -0.40, .33, .045, C('#d9d2c0'), { gloss: .20 });
    light(1.20, CY - .30, -0.40, C('#ffeecb'), .58, 4.20);
    glow(M.trs(1.20, Y + .012, -0.40, 0, 3.60, 1, 3.20), C('#ffe9c4'), .055);
    // and one over the east end, by the cabinet and the chess board. Two modest sources beat one
    // bright one, and this room is 8.45 m across.
    cyl(4.60, CY - .085, -0.90, .26, .13, C('#f6f0dc'), { mode: 1, glow: .05, tag: '灯' });
    cyl(4.60, CY - .022, -0.90, .29, .045, C('#d9d2c0'), { gloss: .20 });
    light(4.60, CY - .30, -0.90, C('#ffeecb'), .50, 3.80);
    glow(M.trs(4.60, Y + .012, -0.90, 0, 3.00, 1, 2.80), C('#ffe9c4'), .05);
  })();

  // ------------------------------------------------------------------ 阳台
  //
  // 老李 grows things, so the balcony is not a place to hang washing that also has a plant on it —
  // it is a greenhouse that also dries washing. Everything hugs the glazing or the partition: the
  // walkable band here is only z -4.60 .. -3.50 once `clampMove` has taken its 0.30 at each side.
  (function yangtai() {
    // the glazed partition, with a two-panel slider standing open across x 2.40 .. 4.40
    const PH = 2.30;
    for (const [x0, x1] of [[SPX, BAL[0]], [BAL[1], X1]]) {
      const cx = (x0 + x1) / 2, w = x1 - x0;
      box(cx, Y + (PH + H) / 2, BZ, w, H - PH, .10, col.plaster,
          { hard: true, gloss: .10, ...P.plaster });
      for (const gy of [.06, PH - .03])
        box(cx, Y + gy, BZ, w, .06, .075, col.alu, { hard: true, gloss: .40, ...P.metal });
      const n = Math.max(1, Math.round(w / 1.10));
      for (let i = 0; i <= n; i++)
        box(x0 + i * w / n, Y + PH / 2, BZ, .05, PH, .075, col.alu,
            { hard: true, gloss: .40, ...P.metal });
      box(cx, Y + PH / 2, BZ - .012, w - .06, PH - .12, .010, col.glass,
          { hard: true, mode: 18, alpha: .11, gloss: .80 });
    }
    // the open leaf, slid back over the eastern panel, and its track
    box(4.85, Y + PH / 2, BZ + .055, .82, PH - .10, .05, col.alu,
        { hard: true, gloss: .42, ...P.metal });
    box(4.85, Y + PH / 2, BZ + .042, .74, PH - .20, .010, col.glass,
        { hard: true, mode: 18, alpha: .13, gloss: .80 });
    cyl(4.48, Y + 1.05, BZ + .030, .012, .22, col.steel, { gloss: .55 });
    box((BAL[0] + BAL[1]) / 2, FL + .020, BZ, BAL[1] - BAL[0] + .10, .028, .13, C('#b6bcc0'),
        { hard: true, gloss: .45, ...P.metal });

    // --- the staging. Two tiers of scaffold board on angle iron, jammed against the glazing at
    // the west end, and about fourteen pots on it. The east end is left clear so the balcony is
    // still somewhere you can stand.
    const SX0 = -2.20, SX1 = 1.60, SCX = (SX0 + SX1) / 2, SCZ = -4.58;
    for (const [sy, dp] of [[.42, .34], [.86, .30]]) {
      box(SCX, FL + sy, SCZ, SX1 - SX0, .035, dp, col.woodL,
          { hard: true, gloss: .22, tag: '花架', ...P.wood });
      for (const px of [SX0 + .12, SCX, SX1 - .12])
        box(px, FL + sy / 2, SCZ, .030, sy, .030, col.steelD, { hard: true, gloss: .40, ...P.metal });
    }
    stop(SX0 - .06, SX1 + .06, ZS, SCZ + .20);
    sha(SCX, SCZ, SX1 - SX0 + .10, .40, .30);
    // a pot generator: 老李's collection, all different, none of them matching
    const POTS = [
      [-2.02, .44, .085, .16, 'grass'], [-1.66, .44, .095, .18, 'jade'], [-1.28, .44, .080, .15, 'trail'],
      [-0.88, .44, .105, .19, 'cactus'], [-0.48, .44, .085, .16, 'grass'], [-0.06, .44, .090, .17, 'jade'],
      [0.36, .44, .080, .15, 'trail'], [0.78, .44, .100, .18, 'grass'], [1.20, .44, .085, .16, 'jade'],
      [-1.94, .88, .070, .13, 'trail'], [-1.44, .88, .080, .14, 'grass'], [-0.30, .88, .075, .14, 'cactus'],
      [0.24, .88, .085, .15, 'jade'], [1.14, .88, .075, .14, 'trail'],
    ];
    for (const [px, sy, r, ht, kind] of POTS) {
      const base = FL + sy + .018;
      taper(px, base + ht / 2, SCZ, r * 2, ht, r * 2,
            kind === 'jade' ? C('#7d8e73') : col.terra, { gloss: .18, tag: '花' });
      cyl(px, base + ht - .012, SCZ, r * .84, .020, col.soil, { gloss: .05 });
      if (kind === 'grass') for (let i = 0; i < 8; i++)
        cap(px + (i % 3 - 1) * .04, base + ht + .17, SCZ + (i % 2 - .5) * .05, .016, .36, .016,
            i % 2 ? col.leaf : col.leafD, { rz: (i - 3.5) * .12, rx: .08, gloss: .12, tag: '花' });
      if (kind === 'jade') {
        ball(px, base + ht + .11, SCZ, .10, .10, .09, col.leafD, { gloss: .12, tag: '花' });
        ball(px + .07, base + ht + .17, SCZ - .03, .065, .065, .06, col.leaf, { gloss: .12 });
        ball(px - .06, base + ht + .15, SCZ + .04, .055, .055, .05, col.leafB, { gloss: .12 });
      }
      if (kind === 'trail') for (let i = 0; i < 7; i++)
        cap(px + (i % 3 - 1) * .07, base + ht - i * .05, SCZ + (i % 2 - .5) * .12, .045, .09, .020,
            i % 2 ? col.leaf : col.leafB, { rz: (i - 3) * .35, ry: i, gloss: .14, tag: '花' });
      if (kind === 'cactus') {
        cap(px, base + ht + .13, SCZ, .045, .26, .045, C('#5f7f4c'), { gloss: .14, tag: '花' });
        cap(px - .06, base + ht + .10, SCZ, .028, .13, .028, C('#5f7f4c'), { rz: .5, gloss: .14 });
        ball(px, base + ht + .27, SCZ, .026, .022, .026, C('#c8583f'), { gloss: .18 });
      }
    }

    // --- 君子兰. The prize plant: strap leaves fanning out in one plane from a glazed pot, an
    // orange umbel on a thick stalk. It stands on its own stool where the light is best.
    (function junzilan() {
      const jx = 2.90, jz = -4.55;
      box(jx, FL + .30, jz, .40, .05, .38, col.woodM, { hard: true, gloss: .26, ...P.wood });
      for (const [ox, oz] of [[-.15, -.14], [.15, -.14], [-.15, .14], [.15, .14]])
        box(jx + ox, FL + .15, jz + oz, .04, .30, .04, col.woodD, { hard: true, gloss: .26, ...P.wood });
      taper(jx, FL + .46, jz, .30, .26, .30, C('#5e7a6e'), { gloss: .34, tag: '君子兰' });
      cyl(jx, FL + .575, jz, .125, .022, col.soil, { gloss: .05 });
      for (let i = 0; i < 10; i++) {
        const t = (i - 4.5) / 4.5;
        cap(jx + t * .10, FL + .60 + .17 - Math.abs(t) * .04, jz + (i % 2 - .5) * .035,
            .050, .40 - Math.abs(t) * .09, .016, i % 2 ? C('#2f5b31') : C('#3d6b39'),
            { rz: t * .55, rx: Math.abs(t) * .22, gloss: .18, tag: '君子兰' });
      }
      cyl(jx + .02, FL + .82, jz - .02, .014, .30, C('#4a7a41'), { rz: .06, gloss: .16 });
      for (let i = 0; i < 7; i++)
        cap(jx + .02 + Math.cos(i * .9) * .055, FL + 1.00, jz - .02 + Math.sin(i * .9) * .055,
            .028, .075, .028, i % 2 ? C('#e07a2a') : C('#d8641f'),
            { rz: Math.cos(i) * .5, ry: i * .9, gloss: .22, tag: '君子兰' });
      sha(jx, jz, .46, .44, .30);
      stop(jx - .28, jx + .28, ZS, jz + .30);
    })();

    // --- 泡沫箱 of 小葱. A styrofoam box that a crate of fruit came in, full of soil and spring
    // onions, on the floor under the staging. There is one of these on every balcony in this city.
    (function scallions() {
      const bx = 1.95, bz = -4.72;
      box(bx, FL + .11, bz, .58, .22, .34, C('#e9e7de'), { hard: true, gloss: .06, tag: '小葱' });
      box(bx, FL + .215, bz, .50, .03, .26, col.soil, { hard: true, gloss: .04 });
      for (let i = 0; i < 18; i++) {
        const ox = -.22 + (i % 9) * .055, oz = (i < 9 ? -.06 : .06);
        cap(bx + ox, FL + .30, bz + oz, .010, .20, .010, C('#e8ecd8'),
            { rz: (i % 3 - 1) * .10, gloss: .14 });
        cap(bx + ox, FL + .44, bz + oz, .009, .22, .009, i % 2 ? col.leaf : col.leafB,
            { rz: (i % 3 - 1) * .22, gloss: .14, tag: '小葱' });
      }
      sha(bx, bz, .66, .42, .30);
      // and a second one, older, with garlic shoots in it
      box(bx + .74, FL + .09, bz + .02, .44, .18, .28, C('#e2e0d6'), { hard: true, gloss: .06 });
      box(bx + .74, FL + .175, bz + .02, .38, .03, .22, col.soil, { hard: true, gloss: .04 });
      for (let i = 0; i < 10; i++)
        cap(bx + .74 - .15 + (i % 5) * .075, FL + .30, bz + .02 + (i < 5 ? -.05 : .05),
            .009, .24, .009, col.leafB, { rz: (i % 3 - 1) * .18, gloss: .14 });
      sha(bx + .74, bz + .02, .52, .36, .28);
    })();

    // --- 画眉. A bamboo cage on a hook, which is the single most Beijing object a retired man
    // owns. Fourteen bars, a domed top, a hoop handle, two porcelain pots and a bird on the perch.
    (function birdcage() {
      const cx = 4.90, cz = -4.20, y0 = Y + 1.24, r = .17, ht = .44;
      cyl(cx, CY - .05, cz, .012, .10, col.steelD, { gloss: .45 });
      cyl(cx, y0 + ht + .34, cz, .006, .58, C('#8d8578'), { gloss: .35 });
      for (let i = 0; i < 16; i++) {
        const a = i * PI * 2 / 16;
        cyl(cx + Math.cos(a) * r, y0 + ht / 2, cz + Math.sin(a) * r, .006, ht, col.bamboo,
            { gloss: .22, tag: '鸟笼' });
      }
      for (const yy of [y0, y0 + ht])
        cyl(cx, yy, cz, r + .012, .018, C('#a8873f'), { gloss: .26, tag: '鸟笼' });
      cyl(cx, y0 - .022, cz, r + .020, .030, col.woodM, { gloss: .24, tag: '鸟笼' });
      for (let i = 0; i < 8; i++) {
        const a = i * PI / 8;
        cyl(cx, y0 + ht + .075, cz, .005, r * 1.86, col.bamboo,
            { rz: PI / 2, ry: a, rx: .30, gloss: .22 });
      }
      cyl(cx, y0 + ht + .155, cz, .030, .022, C('#a8873f'), { gloss: .26 });
      cyl(cx, y0 + ht + .26, cz, .005, .20, C('#a8873f'), { rz: PI / 2, gloss: .30 });
      // the perch, the two pots, and the 画眉 itself
      cyl(cx, y0 + .17, cz, .006, r * 1.7, col.woodL, { rz: PI / 2, ry: .4, gloss: .20 });
      for (const [ox, oz, c] of [[-.09, .06, col.porc], [.09, -.05, C('#dfe6ea')]]) {
        cyl(cx + ox, y0 + .035, cz + oz, .028, .045, c, { gloss: .48 });
        cyl(cx + ox, y0 + .054, cz + oz, .022, .010, C('#6f6a5c'), { gloss: .30 });
      }
      cap(cx - .01, y0 + .225, cz + .01, .042, .085, .042, C('#8a7455'),
          { rz: PI / 2, ry: .5, gloss: .14, tag: '画眉' });
      ball(cx + .055, y0 + .265, cz - .015, .030, .030, .030, C('#7d6a4e'), { gloss: .14, tag: '画眉' });
      ball(cx + .062, y0 + .272, cz - .018, .020, .009, .006, C('#efe8d4'), { gloss: .18 });
      cap(cx + .085, y0 + .262, cz - .020, .006, .030, .006, C('#3e352a'), { rz: PI / 2, gloss: .3 });
      cap(cx - .075, y0 + .215, cz + .020, .018, .075, .012, C('#6f5c42'), { rz: PI / 2, ry: .5, gloss: .14 });
      // the cloth cover, pushed up over the top for the day
      ball(cx, y0 + ht + .10, cz, r + .03, .09, r + .03, C('#5f6b52'), { gloss: .05, ...P.cloth });
    })();

    // --- 晾衣杆, 咸菜坛 and the winter cabbage. The last three things a balcony here is for.
    for (const s of [-1, 1])
      box(0.30 + s * 1.70, CY - .16, -3.62, .05, .16, .09, col.steelD, { hard: true, gloss: .40 });
    cyl(0.30, CY - .18, -3.62, .015, 3.40, col.steel, { rz: PI / 2, gloss: .55, tag: '晾衣杆' });
    for (const [hx, w2, h2, c] of [[-0.90, .34, .52, C('#d9d4c4')], [-0.34, .30, .60, C('#9fb0be')],
                                   [0.30, .38, .46, C('#c8b9a0')], [0.92, .28, .58, C('#8a95a0')],
                                   [1.44, .32, .40, C('#d8c9b2')]]) {
      cyl(hx, CY - .22, -3.62, .008, .07, col.steel, { gloss: .5 });
      box(hx, CY - .25 - h2 / 2, -3.62, w2, h2, .020, c, { gloss: .04, ...P.cloth, ry: .04 });
    }
    // 咸菜坛 — the glazed pickling jar with its water-sealed lid
    const PJ = 5.35;
    taper(PJ, FL + .17, -4.55, .30, .34, .30, C('#5a4a3c'), { gloss: .40, tag: '咸菜坛' });
    cyl(PJ, FL + .36, -4.55, .125, .06, C('#4e4034'), { gloss: .42, tag: '咸菜坛' });
    cyl(PJ, FL + .40, -4.55, .105, .035, C('#6b5a48'), { gloss: .40 });
    sha(PJ, -4.55, .36, .36, .32);
    for (const [ox, oz, r2] of [[-.02, .30, .13], [.18, .40, .12], [-.20, .42, .115]]) {
      ball(PJ + ox, FL + r2 * .8, -4.55 + oz, r2, r2 * .8, r2 * .72, C('#dfe4c8'),
           { gloss: .14, ry: ox, tag: '白菜' });
      for (let i = 0; i < 4; i++)
        cap(PJ + ox + Math.cos(i * 1.6) * r2 * .5, FL + r2 * 1.15,
            -4.55 + oz + Math.sin(i * 1.6) * r2 * .5, r2 * .30, r2 * .7, r2 * .18,
            C('#b6c47f'), { rz: Math.cos(i) * .4, ry: i, gloss: .12 });
      sha(PJ + ox, -4.55 + oz, r2 * 2.4, r2 * 2.2, .28);
    }
    // the watering can, and the stool he sits on to pot things up
    cyl(2.05, FL + .12, -3.62, .105, .24, C('#3f6f96'), { gloss: .30, tag: '喷壶' });
    cyl(2.05, FL + .245, -3.62, .075, .020, C('#35608a'), { gloss: .32 });
    cyl(2.19, FL + .21, -3.70, .012, .34, C('#3f6f96'), { rz: 1.15, ry: .5, gloss: .30 });
    taper(2.31, FL + .30, -3.76, .07, .05, .07, C('#35608a'), { rz: 1.15, gloss: .30 });
    sha(2.05, -3.62, .30, .30, .28);
    box(0.95, FL + .25, -3.66, .32, .04, .28, col.woodL, { hard: true, gloss: .22, ...P.wood });
    for (const [ox, oz] of [[-.12, -.10], [.12, -.10], [-.12, .10], [.12, .10]])
      box(0.95 + ox, FL + .125, -3.66 + oz, .034, .25, .034, col.woodM,
          { hard: true, gloss: .22, ...P.wood });
    sha(0.95, -3.66, .38, .34, .26);

    // the balcony's own light, small and cool, plus the daylight pool off the glazing
    light(1.60, CY - .34, -3.90, C('#eaf0ea'), .34, 3.20);
    cyl(1.60, CY - .06, -3.90, .16, .07, C('#f4f0dc'), { mode: 1, glow: .045 });
    glow(M.trs(1.60, Y + .012, -4.20, 0, 6.60, 1, 1.30), C('#e8f0f4'), .05);
  })();

  // ------------------------------------------------------------------ 厨房
  (function chufang() {
    const KX0 = X0, KX1 = SPX;
    // tiled walls to 1.60, standing 12 mm off the plaster so they are never in its plane
    for (const [x, z, w, yaw] of [[(KX0 + KX1) / 2, ZW - .012, KX1 - KX0, PI],
                                  [KX0 + .012, (KZ + ZW) / 2, ZW - KZ, PI / 2]])
      wall(x, Y + .80, z, w, 1.60, yaw, col.tileW, { ...P.tile, gloss: .42 });
    // --- the run: counter, sink, hob, and the extractor over it
    const CZ0 = KZ + .16, CZ1 = ZW - .14, CX = KX0 + .31;
    box(CX, FL + .43, (CZ0 + CZ1) / 2, .60, .86, CZ1 - CZ0, C('#b9b0a0'),
        { hard: true, gloss: .22, tag: '厨房' });
    box(CX, FL + .885, (CZ0 + CZ1) / 2, .64, .05, CZ1 - CZ0 + .04, C('#8f8878'),
        { hard: true, gloss: .46, ...P.slab });
    for (const cz of [CZ0 + .40, CZ0 + 1.00]) {
      box(CX + .28, FL + .48, cz, .020, .60, .48, C('#a49a88'), { hard: true, gloss: .24 });
      box(CX + .30, FL + .48, cz, .012, .04, .18, col.steel, { hard: true, gloss: .5 });
    }
    stop(KX0, CX + .32, KZ, ZW);
    // 水池 and the tap
    box(CX, FL + .875, CZ1 - .38, .42, .09, .44, C('#c6cbcd'), { hard: true, gloss: .60, ...P.metal });
    box(CX, FL + .845, CZ1 - .38, .36, .05, .38, C('#9aa1a4'), { hard: true, gloss: .58, ...P.metal });
    cyl(CX - .24, FL + .98, CZ1 - .38, .016, .22, col.steel, { gloss: .62 });
    cyl(CX - .17, FL + 1.08, CZ1 - .38, .012, .16, col.steel, { rz: PI / 2, gloss: .62 });
    // the dish rack, which is always full
    box(CX + .02, FL + .96, CZ1 - .82, .34, .10, .30, C('#8e969b'), { hard: true, gloss: .5 });
    for (let i = 0; i < 5; i++)
      cyl(CX + .02, FL + 1.03, CZ1 - .95 + i * .06, .058, .012, col.porc, { rx: PI / 2, gloss: .5 });
    // 灶台 — a two-burner gas hob with the wok on it, and the 抽油烟机 over it
    const HBZ = CZ0 + .42;
    box(CX, FL + .905, HBZ, .48, .04, .52, C('#2f3338'), { hard: true, gloss: .48, tag: '灶' });
    for (const oz of [-.13, .13]) {
      cyl(CX, FL + .930, HBZ + oz, .075, .020, C('#4a5055'), { gloss: .40, tag: '灶' });
      cyl(CX, FL + .944, HBZ + oz, .050, .016, C('#1e2226'), { gloss: .30 });
      for (let i = 0; i < 4; i++)
        box(CX, FL + .952, HBZ + oz, .012, .008, .17, C('#3f4449'),
            { hard: true, ry: i * PI / 4, gloss: .40 });
    }
    for (const oz of [-.13, .13])
      cyl(CX - .21, FL + .88, HBZ + oz, .022, .022, C('#c8c2b2'), { rz: PI / 2, gloss: .40 });
    ball(CX, FL + 1.03, HBZ - .13, .17, .095, .17, C('#3a3630'), { gloss: .34, tag: '锅' });
    cyl(CX + .22, FL + 1.07, HBZ - .13, .012, .22, col.woodL, { rz: 1.35, gloss: .22 });
    cyl(CX, FL + 1.04, HBZ + .13, .105, .16, C('#b6bcc0'), { gloss: .44, tag: '高压锅' });
    cyl(CX, FL + 1.13, HBZ + .13, .105, .025, C('#9aa1a4'), { gloss: .46 });
    cyl(CX, FL + 1.16, HBZ + .13, .014, .035, C('#4a5055'), { gloss: .5 });
    box(CX + .09, FL + 1.71, HBZ, .52, .22, .58, C('#c2c7ca'), { hard: true, gloss: .46, tag: '抽油烟机' });
    taper(CX + .06, FL + 1.53, HBZ, .46, .18, .54, C('#c2c7ca'), { gloss: .46, tag: '抽油烟机' });
    box(CX + .28, FL + 2.10, HBZ, .14, .56, .16, C('#b6bcc0'), { hard: true, gloss: .44 });
    // 电饭锅, the 调料 shelf, and the garlic braid on a nail
    cyl(CX + .02, FL + .99, CZ0 + .18, .115, .17, C('#e2ded2'), { gloss: .44, tag: '电饭锅' });
    cyl(CX + .02, FL + 1.085, CZ0 + .18, .115, .030, C('#c6c2b6'), { gloss: .44, tag: '电饭锅' });
    box(CX + .10, FL + 1.02, CZ0 + .09, .04, .05, .09, C('#3a3f44'), { hard: true, mode: 1, glow: .05 });
    box(CX + .12, FL + 1.34, CZ0 + .70, .22, .030, .80, col.woodL,
        { hard: true, gloss: .22, ...P.wood });
    const JARS = [['酱油', C('#3a2a1c')], ['醋', C('#5e3a22')], ['盐', C('#efeade')],
                  ['糖', C('#e6dcc4')], ['油', C('#c8a13a')]];
    JARS.forEach(([, c], i) => {
      const jz = CZ0 + .38 + i * .16;
      cyl(CX + .12, FL + 1.44, jz, .034, .17, c, { gloss: .42 });
      cyl(CX + .12, FL + 1.535, jz, .030, .026, C('#8f8878'), { gloss: .34 });
    });
    G(CX + .10, FL + 1.30, CZ0 + .70, PI / 2, '油盐酱醋',
      { size: .034, gap: .008, color: C('#7a6f5c') });
    for (let i = 0; i < 7; i++) {
      const gy = FL + 1.66 - i * .075;
      ball(KX0 + .58, gy, ZW - .30, .034, .038, .034, C('#e8e0cd'), { gloss: .14, tag: '蒜' });
      cap(KX0 + .58, gy + .03, ZW - .30, .008, .06, .008, C('#c2b898'), { rz: (i % 3 - 1) * .3 });
    }
    // 案板 and 菜刀 leaning at the back of the counter
    box(CX + .10, FL + .93, CZ1 - .10, .30, .035, .26, C('#c9a878'), { hard: true, gloss: .18, tag: '案板' });
    box(CX + .16, FL + 1.03, CZ1 - .06, .010, .16, .17, C('#c6ccd0'), { hard: true, gloss: .62, ry: .2 });
    box(CX + .16, FL + .96, CZ1 - .16, .012, .035, .11, C('#4a3a28'), { hard: true, gloss: .30, ry: .2 });
    // 冰箱, in the corner against the landing wall
    const FGX = -4.55;
    box(FGX, FL + .78, ZW - .32, .62, 1.56, .62, C('#e0ddd2'), { hard: true, gloss: .40, tag: '冰箱' });
    box(FGX, FL + 1.16, ZW - .64, .58, .74, .02, C('#d6d3c8'), { hard: true, gloss: .42, tag: '冰箱' });
    box(FGX, FL + .40, ZW - .64, .58, .72, .02, C('#d6d3c8'), { hard: true, gloss: .42, tag: '冰箱' });
    for (const hy of [1.16, .40])
      box(FGX + .24, FL + hy, ZW - .655, .04, .34, .03, C('#9aa1a4'), { hard: true, gloss: .5 });
    box(FGX - .06, FL + 1.42, ZW - .655, .18, .13, .012, C('#c8433a'), { hard: true, gloss: .10 });
    G(FGX - .06, FL + 1.42, ZW - .665, PI, '福', { size: .085, color: col.gold });
    stop(FGX - .34, FGX + .34, ZW - .66, ZW);
    sha(FGX, ZW - .32, .70, .70, .34);
    // a plastic stool and a bag of rice under the window end of the counter
    box(-3.35, FL + .21, 2.10, .30, .04, .28, C('#c85a3a'), { hard: true, gloss: .24, tag: '凳子' });
    for (const [ox, oz] of [[-.11, -.10], [.11, -.10], [-.11, .10], [.11, .10]])
      box(-3.35 + ox, FL + .105, 2.10 + oz, .030, .21, .030, C('#b04e32'), { hard: true, gloss: .24 });
    sha(-3.35, 2.10, .36, .34, .26);
    box(-3.30, FL + .17, 2.86, .32, .34, .24, C('#d8d2be'), { gloss: .12, tag: '米' });
    G(-3.30, FL + .22, 2.86 - .125, PI, '大米', { size: .050, gap: .010, color: C('#8a3a2e') });
    sha(-3.30, 2.86, .40, .32, .28);
    light(-4.20, CY - .28, 2.20, C('#f2f4e8'), .46, 3.20);
    cyl(-4.20, CY - .05, 2.20, .17, .07, C('#f6f2e2'), { mode: 1, glow: .05, tag: '灯' });
  })();

  // ------------------------------------------------------------------ 卧室
  (function woshi() {
    const BX2 = X0 + .82, BZ2 = -0.45;
    // the bed: a hard board bed with a folded quilt, two long pillows and a woven mat
    box(BX2, FL + .21, BZ2, 1.52, .42, 1.94, col.woodD, { hard: true, gloss: .26, tag: '床', ...P.wood });
    box(BX2, FL + .445, BZ2, 1.46, .09, 1.88, C('#cfc6ae'), { gloss: .06, ...P.cloth, tag: '床' });
    box(BX2, FL + .495, BZ2 + .05, 1.40, .02, 1.72, C('#b98d7a'), { hard: true, gloss: .05, ...P.cloth });
    box(BX2, FL + .78, BZ2 - 1.00, 1.56, .78, .08, col.woodD, { hard: true, gloss: .28, ...P.wood });
    box(BX2, FL + 1.14, BZ2 - 1.00, 1.60, .07, .12, col.woodM, { hard: true, gloss: .30, ...P.wood });
    for (const dx of [-.35, .35])
      cap(BX2 + dx, FL + .565, BZ2 - .78, .13, .62, .11, C('#eae4d2'), { rz: PI / 2, gloss: .05, ...P.cloth });
    box(BX2 + .02, FL + .59, BZ2 + .48, 1.16, .20, .74, C('#a8402f'), { gloss: .05, ...P.cloth, tag: '被子' });
    box(BX2 + .02, FL + .685, BZ2 + .48, 1.10, .02, .68, C('#c4523c'), { hard: true, gloss: .05, ...P.cloth });
    stop(X0, BX2 + .80, BZ2 - 1.05, BZ2 + 1.02);
    sha(BX2, BZ2, 1.66, 2.06, .34);
    slippers(BX2 + .96, BZ2 + .30, C('#6b5342'));
    sha(BX2 + .96, BZ2 + .30, .30, .24, .20);
    // 五斗柜, against the spine wall SOUTH of the doorway and facing the bed. It stood against the
    // west wall first, where its footprint (z 0.29 .. 1.15) ran straight through the bed's
    // (z -1.42 .. 0.52) for 23 cm — two pieces of furniture in the same 0.23 x 0.58 m of floor.
    // Three things share this room and only one of them can have the west wall.
    const DX2 = SPX - SPT / 2 - .29, DZ2 = -1.05;
    box(DX2, FL + .48, DZ2, .58, .96, .86, col.woodM, { hard: true, gloss: .28, tag: '柜子', ...P.wood });
    box(DX2, FL + .975, DZ2, .62, .05, .90, col.woodD, { hard: true, gloss: .34, ...P.wood });
    for (let i = 0; i < 3; i++) {
      box(DX2 - .28, FL + .22 + i * .30, DZ2, .020, .24, .76, col.woodL,
          { hard: true, gloss: .26, ...P.wood });
      cyl(DX2 - .30, FL + .22 + i * .30, DZ2, .022, .022, col.brass, { rz: PI / 2, gloss: .55 });
    }
    stop(DX2 - .30, SPX, DZ2 - .44, DZ2 + .44);
    sha(DX2, DZ2, .66, .94, .32);
    box(DX2, FL + 1.005, DZ2, .24, .010, .34, col.lace, { hard: true, gloss: .04 });
    taper(DX2, FL + 1.08, DZ2 + .24, .16, .13, .16, C('#c8a04a'), { gloss: .30 });
    cyl(DX2, FL + 1.19, DZ2 + .24, .085, .10, C('#f2e6c2'), { mode: 1, glow: .05, tag: '台灯' });
    light(DX2 - .22, FL + 1.24, DZ2 + .24, C('#ffe2ac'), .30, 2.20);
    cyl(DX2, FL + 1.12, DZ2 - .24, .075, .26, C('#d8c9a0'), { gloss: .22, tag: '暖水瓶' });
    cyl(DX2, FL + 1.26, DZ2 - .24, .044, .05, C('#a8332a'), { gloss: .34 });
    frame(DX2 - .04, FL + 1.13, DZ2 + .02, -PI / 2 + .40, .22, .17, C('#b3ada0'));
    cyl(DX2 - .06, FL + 1.02, DZ2 - .02, .062, .045, C('#c8b48a'),
        { rz: PI / 2, ry: .3, gloss: .40, tag: '闹钟' });
    for (const s of [-1, 1])
      cyl(DX2 - .085, FL + 1.065 + s * .0, DZ2 - .02 + s * .045, .020, .014, C('#b6a478'),
          { rz: PI / 2, gloss: .45 });
    // 衣柜 — a two-door wardrobe under the cross wall, facing south down the room
    const WDX = -3.66, WDZ = KZ - .32;
    box(WDX, FL + .96, WDZ, 1.20, 1.92, .58, col.woodM, { hard: true, gloss: .28, tag: '衣柜', ...P.wood });
    box(WDX, FL + 1.94, WDZ, 1.26, .07, .62, col.woodD, { hard: true, gloss: .32, ...P.wood });
    for (const dx of [-.29, .29]) {
      box(WDX + dx, FL + .98, WDZ - .295, .56, 1.78, .020, col.woodL,
          { hard: true, gloss: .26, tag: '衣柜', ...P.wood });
      box(WDX + dx, FL + .98, WDZ - .306, .44, 1.62, .010, col.woodM, { hard: true, gloss: .24 });
    }
    for (const dx of [-.05, .05])
      cyl(WDX + dx, FL + 1.00, WDZ - .315, .014, .16, col.brass, { gloss: .55 });
    box(WDX, FL + 2.02, WDZ, .48, .24, .40, C('#c2b9a2'), { gloss: .10, ...P.cloth });
    stop(WDX - .62, WDX + .62, WDZ - .30, KZ);
    sha(WDX, WDZ, 1.30, .66, .34);
    hardChair(-4.15, -1.28, 0, col.woodD);
    light(-4.00, CY - .30, -0.20, C('#ffe9c8'), .44, 3.40);
    cyl(-4.00, CY - .06, -0.20, .19, .07, C('#f8f2de'), { mode: 1, glow: .045, tag: '灯' });
  })();

  // ------------------------------------------------------------------ 书房
  //
  // Where the calligraphy actually happens. The desk is under the window because that is the only
  // daylight in the room, and the wall behind it is the one with the 奖状 on it.
  (function shufang() {
    const DKX = -4.60, DKZ = ZS + .74;
    box(DKX, FL + .73, DKZ, 1.56, .05, .62, col.woodM, { hard: true, gloss: .32, tag: '书桌', ...P.wood });
    box(DKX, FL + .69, DKZ, 1.48, .04, .56, col.woodD, { hard: true, gloss: .28, ...P.wood });
    for (const dx of [-.70, .70])
      box(DKX + dx, FL + .35, DKZ, .07, .70, .56, col.woodD, { hard: true, gloss: .28, ...P.wood });
    box(DKX + .42, FL + .52, DKZ - .04, .58, .30, .50, col.woodM, { hard: true, gloss: .26, ...P.wood });
    for (let i = 0; i < 2; i++) {
      box(DKX + .42, FL + .44 + i * .17, DKZ - .30, .52, .13, .020, col.woodL,
          { hard: true, gloss: .26, ...P.wood });
      cyl(DKX + .42, FL + .44 + i * .17, DKZ - .32, .020, .020, col.brass, { rz: PI / 2, gloss: .55 });
    }
    stop(DKX - .84, DKX + .84, ZS, DKZ + .34);
    sha(DKX, DKZ, 1.66, .72, .34);
    hardChair(DKX - .20, DKZ + .72, 0, col.woodD);
    // 宣纸 half written on, 镇纸 holding it flat, 砚台 with the stick beside it
    box(DKX - .26, FL + .758, DKZ + .04, .52, .006, .38, C('#f2ecdc'), { hard: true, gloss: .04, tag: '宣纸' });
    A.flatText(DKX - .38, FL + .765, DKZ + .04, 0, '静', { size: .13, gap: .03, color: C('#20180f') });
    A.flatText(DKX - .18, FL + .765, DKZ + .04, 0, '心', { size: .13, gap: .03, color: C('#3a3026') });
    for (const oz of [-.16, .16])
      box(DKX - .26, FL + .768, DKZ + .04 + oz, .48, .014, .030, C('#5a5f52'),
          { hard: true, gloss: .45, tag: '镇纸' });
    box(DKX + .18, FL + .772, DKZ - .06, .19, .028, .13, C('#3a3f3c'), { hard: true, gloss: .48, tag: '砚台' });
    box(DKX + .18, FL + .782, DKZ - .06, .15, .012, .09, C('#1e2220'), { hard: true, gloss: .70, tag: '砚台' });
    box(DKX + .18, FL + .800, DKZ - .12, .022, .022, .075, C('#241f1a'), { hard: true, gloss: .30, ry: .3 });
    // 笔架 with four 毛笔 hanging, and one lying on the ink stone
    const PBX = DKX + .52;
    for (const s of [-1, 1])
      box(PBX + s * .12, FL + .86, DKZ - .02, .022, .22, .022, col.woodD, { hard: true, gloss: .30 });
    cyl(PBX, FL + .965, DKZ - .02, .008, .26, col.woodD, { rz: PI / 2, gloss: .30, tag: '毛笔' });
    for (let i = 0; i < 4; i++) {
      const bx2 = PBX - .08 + i * .055;
      cyl(bx2, FL + .885, DKZ - .02, .006, .15, col.bamboo, { gloss: .24, tag: '毛笔' });
      cap(bx2, FL + .785, DKZ - .02, .011, .075, .011, C('#3a3026'), { gloss: .16, tag: '毛笔' });
      cyl(bx2, FL + .955, DKZ - .02, .007, .020, C('#a8302a'), { gloss: .30 });
    }
    cyl(DKX + .04, FL + .772, DKZ - .16, .007, .21, col.bamboo, { rz: PI / 2, ry: .25, gloss: .24, tag: '毛笔' });
    cap(DKX + .15, FL + .772, DKZ - .19, .010, .07, .010, C('#3a3026'), { rz: PI / 2, ry: .25, gloss: .16 });
    // 印章 in a tiny pot of cinnabar paste, and a jar of brushes soaking
    cyl(DKX - .60, FL + .772, DKZ - .16, .030, .030, C('#c8b48a'), { gloss: .30 });
    cyl(DKX - .60, FL + .790, DKZ - .16, .024, .010, C('#a8302a'), { gloss: .22, tag: '印章' });
    box(DKX - .60, FL + .800, DKZ - .06, .028, .060, .028, C('#c9a86a'), { hard: true, gloss: .34, tag: '印章' });
    // the bookshelf on the west wall: 线装书, a few paperbacks, a folded newspaper stack
    const SFX = X0 + .17, SFZ = -3.05;
    box(SFX, FL + .92, SFZ, .30, 1.84, 1.30, col.woodM, { hard: true, gloss: .26, tag: '书架', ...P.wood });
    for (const sy of [.34, .74, 1.14, 1.54, 1.80])
      box(SFX + .02, FL + sy, SFZ, .28, .028, 1.24, col.woodL, { hard: true, gloss: .26, ...P.wood });
    stop(X0, SFX + .18, SFZ - .70, SFZ + .70);
    sha(SFX, SFZ, .36, 1.38, .32);
    const BKC = [C('#7d3b33'), C('#3f5a6b'), C('#6b5a3a'), C('#4a5f4a'), C('#8a6238'), C('#5a4a5c')];
    // `BKC[(i * 3 + sy * 10) % 6]`. sy is 0.34, so the index was 3.4, 6.4, ... — never an integer,
    // always `undefined`, and a prop with no colour takes the WHOLE GAME down in paintScene
    // (js/game.js reads p.color[0] for every prop it submits). The boot overlay it produced said
    // "js/game.js line 8209", three files away from the mistake. Shelves are indexed by row now.
    [[.34, 14], [.74, 12], [1.14, 15], [1.54, 9]].forEach(([sy, n], row) => {
      for (let i = 0; i < n; i++) {
        const bz2 = SFZ - .58 + i * (1.16 / n), lean = i === n - 1 ? .22 : 0;
        box(SFX + .04, FL + sy + .175, bz2, .20, .32 - (i % 4) * .022, .028 + (i % 3) * .006,
            BKC[(i * 3 + row * 2) % BKC.length], { hard: true, gloss: .12, rx: lean, tag: '书' });
      }
    });
    for (let i = 0; i < 5; i++)
      box(SFX + .04, FL + 1.60 + i * .022, SFZ + .30, .19, .020, .40, C('#d8d2be'),
          { hard: true, gloss: .05, ry: (i % 3 - 1) * .03 });
    // the 奖状 wall over the desk, and a small 中堂 of practice sheets pinned up
    for (const [oz, hy] of [[-.62, 1.92], [.30, 1.92]]) {
      box(X0 + .020, Y + hy, DKZ + oz, .38, .28, .014, C('#b5312a'),
          { hard: true, gloss: .12, ry: PI / 2, tag: '奖状' });
      G(X0 + .036, Y + hy + .06, DKZ + oz, PI / 2, '奖状',
        { size: .078, gap: .018, color: col.gold, tag: '奖状' });
      G(X0 + .036, Y + hy - .05, DKZ + oz, PI / 2, '老有所为', { size: .032, gap: .007, color: C('#f0d69a') });
    }
    box(SPX - SPT / 2 - .020, Y + 1.52, -2.70, .012, .84, .56, C('#efe7cf'),
        { hard: true, gloss: .06, tag: '书法' });
    G(SPX - SPT / 2 - .034, Y + 1.52, -2.70, -PI / 2, '宁静致远',
      { size: .155, gap: .038, color: C('#20180f'), vertical: true, tag: '书法' });
    light(-4.30, CY - .30, -3.00, C('#ffeccd'), .42, 3.40);
    cyl(-4.30, CY - .06, -3.00, .18, .07, C('#f8f2de'), { mode: 1, glow: .045, tag: '灯' });
    glow(M.trs(DKX, Y + .012, DKZ + .50, 0, 2.20, 1, 1.60), C('#e8eef2'), .045);
  })();

  // ------------------------------------------------------------------ the words in the flat
  //
  // Every focus is a spot the body genuinely reaches. In the 阳台 that is z -4.10 .. -3.60; in the
  // west rooms it is x -4.20 .. -2.90; in the 客厅 anything clear of the sofa and the cabinets.
  TH('鞋柜', 5.05, Y + .60, ZW - .34, '进门先换鞋。', 'Change your shoes as you come in.',
     '鞋 shoe + 柜 cabinet. Nobody wears outdoor shoes past this point.', 5.05, 2.45, 1.9);
  TH('拖鞋', 4.46, Y + .16, ZW - .32, '在门口换上拖鞋。', 'Put slippers on at the door.',
     '拖 to drag + 鞋 shoe. Every flat here keeps a row of them inside the door.', 4.46, 2.45, 1.8);
  TH('挂历', 5.05, Y + 1.62, ZW - .05, '墙上挂着一本挂历。', 'A calendar hangs on the wall.',
     '挂 to hang + 历 calendar. One page a month, torn off as it goes.', 5.05, 2.45, 1.9);
  TH('沙发', 0.30, Y + .70, 1.02, '老李请我坐沙发。', '老李 asks me to sit on the sofa.',
     '沙发 is a loan word — shāfā, from "sofa".', 0.30, 0.10, 2.0);
  TH('茶几', 0.30, Y + .45, -0.32, '茶几上放着暖水瓶。', 'There is a thermos flask on the tea table.',
     '茶 tea + 几 a small low table.', 0.30, 0.10, 1.9);
  TH('暖水瓶', -0.14, Y + .70, -0.20, '暖水瓶里有热水。', 'There is hot water in the thermos.',
     '暖 warm + 水 water + 瓶 bottle. It is filled from the kettle and lasts all day.',
     -0.10, 0.10, 1.9);
  TH('茶叶', 0.25, Y + .52, -0.44, '玻璃瓶里装着茶叶。', 'The glass jar holds tea leaves.',
     '茶 tea + 叶 leaf. Loose leaf, straight into the glass.', 0.25, 0.10, 1.8);
  TH('花镜', 0.70, Y + .46, -0.14, '老李的花镜放在报纸上。', '老李’s reading glasses are on the paper.',
     '花镜 — literally "flower glasses", the everyday word for reading glasses.', 0.70, 0.10, 1.8);
  TH('电视', 0.30, Y + .96, -1.42, '电视的声音开得很大。', 'The television is turned up very loud.',
     '电 electric + 视 to view.', 0.30, -0.60, 2.2);
  TH('收音机', 0.96, Y + .70, -1.43, '他一边听收音机一边下棋。',
     'He listens to the radio while he plays chess.',
     '收 to receive + 音 sound + 机 machine.', 0.96, -0.70, 1.9);
  TH('柜子', X1 - .30, Y + 1.10, -0.55, '柜子里放着好碗。', 'The good bowls are kept in the cabinet.',
     '柜子 is any cupboard or cabinet. 玻璃柜 is this one, with glass in the doors.',
     5.00, -0.55, 2.0);
  TH('书法', X1 - .05, Y + 1.60, 0.95, '墙上挂着一幅书法。', 'A piece of calligraphy hangs on the wall.',
     '书 to write + 法 method. 厚德载物 — "great virtue carries all things".', 5.00, 0.95, 2.0);
  TH('象棋', 4.90, Y + .50, -1.90, '我们下一盘象棋吧。', 'Let’s play a game of Chinese chess.',
     '象 elephant + 棋 board game. The river across the middle is 楚河汉界.', 4.30, -1.90, 1.9);
  TH('照片', SPX + .12, Y + 1.36, -1.04, '墙上都是他们家的照片。',
     'The wall is covered with their family photographs.',
     '照 to shine + 片 a flat piece: a photograph.', -1.90, -1.04, 1.9);
  TH('奖状', SPX + .12, Y + 1.72, -0.62, '这是他单位发的奖状。',
     'This is a commendation from his work unit.',
     '奖 prize + 状 certificate. Red and gold, and framed for forty years.', -1.90, -0.62, 1.9);
  TH('钟', SPX + .17, Y + 1.78, 1.32, '钟慢了五分钟。', 'The clock is five minutes slow.',
     '钟 is a clock; 表 is a watch. 几点了 asks the time.', -1.90, 1.98, 1.9);
  TH('饭桌', -1.30, Y + .74, -2.30, '他们在这张小饭桌上吃饭。', 'They eat at this small round table.',
     '饭 rice, and by extension a meal + 桌 table.', -1.70, -1.90, 2.1);
  TH('阳台', 3.40, Y + 1.10, -3.90, '阳台上全是花。', 'The balcony is full of plants.',
     '阳 sun + 台 platform. In this city it is half greenhouse and half laundry.',
     3.40, -3.80, 2.4);
  TH('君子兰', 2.90, Y + .95, -4.55, '这盆君子兰养了二十年。',
     'He has kept this clivia for twenty years.',
     '君子 a person of character + 兰 orchid. The plant a Beijing household is proudest of.',
     2.90, -3.95, 1.9);
  TH('画眉', 4.90, Y + 1.46, -4.20, '笼子里的画眉在叫。', 'The thrush in the cage is singing.',
     '画 to paint + 眉 eyebrow — the white stripe over its eye. 遛鸟 is walking it in the park.',
     4.60, -3.80, 1.9);
  TH('鸟笼', 4.90, Y + 1.24, -4.20, '鸟笼是竹子做的。', 'The birdcage is made of bamboo.',
     '鸟 bird + 笼 cage.', 4.60, -3.80, 1.9);
  TH('小葱', 1.95, Y + .40, -4.72, '泡沫箱里种着小葱。', 'Spring onions are growing in a foam box.',
     '小 small + 葱 onion. The box came with a crate of fruit and never left.',
     1.95, -3.90, 1.9);
  TH('花', -0.48, Y + .78, -4.58, '老李养了很多花。', '老李 grows a lot of plants.',
     '花 is a flower, and 养花 — "to raise flowers" — is what a retired Beijinger does.',
     -0.48, -3.80, 2.0);
  TH('晾衣杆', 0.30, Y + 2.40, -3.62, '衣服晾在阳台上。', 'The washing is hung out on the balcony.',
     '晾 to air + 衣 clothes + 杆 pole.', 0.30, -3.80, 2.2);
  TH('白菜', 5.33, Y + .20, -4.25, '阳台上堆着大白菜。', 'Cabbages are stacked on the balcony.',
     '白 white + 菜 vegetable. Bought by the sackful before winter.', 5.10, -3.80, 1.9);
  TH('锅', -5.69, Y + 1.10, KZ + .45, '锅在灶上。', 'The wok is on the stove.',
     '锅 is the pot or wok itself; 灶 is the stove it stands on.', -4.85, 1.85, 2.1);
  TH('冰箱', -4.55, Y + 1.00, ZW - .64, '冰箱里有昨天的剩菜。',
     'There are yesterday’s leftovers in the fridge.',
     '冰 ice + 箱 box.', -4.55, 2.50, 1.9);
  TH('电饭锅', -5.67, Y + 1.06, KZ + .34, '电饭锅里的饭还是热的。', 'The rice in the cooker is still hot.',
     '电 electric + 饭 rice + 锅 pot.', -4.85, 1.85, 2.1);
  TH('床', X0 + .82, Y + .60, -0.45, '床上叠着一床被子。', 'A quilt is folded on the bed.',
     '床 bed. 一床被子 — a quilt takes the measure word 床 as well.', -3.90, -0.10, 2.4);
  TH('台灯', SPX - .47, Y + 1.19, -0.81, '床头的台灯还开着。', 'The bedside lamp is still on.',
     '台 table + 灯 lamp.', -3.80, -0.90, 1.9);
  TH('衣柜', -3.66, Y + 1.20, KZ - .62, '衣柜是他们结婚时买的。',
     'They bought the wardrobe when they married.',
     '衣 clothes + 柜 cabinet.', -3.66, 0.10, 2.0);
  TH('书桌', -4.60, Y + .78, ZS + .74, '他每天在书桌上练字。',
     'He practises his characters at this desk every day.',
     '书 book/writing + 桌 table.', -4.40, -3.36, 2.0);
  TH('毛笔', -4.08, Y + .92, ZS + .72, '毛笔挂在笔架上。', 'The brushes hang on the brush stand.',
     '毛 hair + 笔 pen. 练字 is the daily practice they are for.', -4.10, -3.36, 2.0);
  TH('砚台', -4.42, Y + .82, ZS + .68, '砚台里还有墨。', 'There is still ink in the inkstone.',
     '砚 inkstone + 台 stand. You grind the 墨 stick into water on it.', -4.30, -3.36, 2.0);
  TH('书架', X0 + .20, Y + 1.10, -3.05, '书架上都是旧书。', 'The bookshelf is full of old books.',
     '书 book + 架 rack.', -4.40, -3.05, 2.0);

  HomeF3.built = true;
  return HomeF3;
};
