// 十楼 · 装修中 — the flat that is being gutted, and the landing outside it.
//
// Registered into FlatFit (declared at the top of js/world.js) as 'f10'; DECK_OF maps that to
// deck 10, so `A.y0` is 27.90 and every height in here is written `Y + h`. Nothing in this file
// may be written in floor-relative y — a room that ignores A.y0 gets built in the lobby, and that
// is the single most common failure in this codebase.
//
// WHAT THE SHELL GIVES DECK 10, WHICH IS NOTHING.
//
// `buildShell` in js/world.js pours a floor, a ceiling and four walls for deck 0 and deck 2 and
// for no other deck; `buildShafts` runs its landing loop as `for (const f of [0, 2])`, so decks
// 3..12 get no doors, no surround, no indicator, no call panel and no shaft walls either. That is
// the Tower Surgeon's to generalise (see the tickets at the foot of this file). Until it lands,
// this file is the whole envelope of floor 10: slab, soffit, four perimeter walls, the wall
// between the landing and the flat, and a box around the two shafts. All of it is built so that a
// per-deck landing can arrive later without touching a plane this file owns — see `the lift
// landing` below, which deliberately leaves the door opening and every shell landing plane clear.
//
// WHY THIS FLOOR LOOKS THE WAY IT DOES.
//
// 装修 is the richest thing a bare floor can be. A finished flat is paint and furniture; a flat
// halfway through 水电改造 is chases cut in the walls with red and blue conduit lying in them,
// chalk snapped across bare block, back boxes with no faceplates and their tails taped off, bags
// of 水泥 stacked against a wall, a tub of mortar, tile stacked on edge, sand tipped on the
// screed, a scaffold board on two trestles — and one 500 W work lamp on a yellow cable throwing
// every one of those into hard relief. That lamp is the whole lighting design: one hard source
// low down in a grey shell, with two much weaker fills so the far corners are grey and not black.
//
// Culturally this is a Beijing estate and it shows: the 物业 make you board the lift landing and
// lay a woven runner down the corridor before a single bag of cement is allowed up in the car,
// the 装修许可证 is taped by the door with the permitted hours printed on it, and every neighbour
// on this landing can quote those hours back at you.
const HomeF10 = { built: false };

// ---------------------------------------------------------------- the permit, as data
//
// The 装修许可证 taped to the landing wall used to be six glyph calls and nothing else, and F9 one
// floor down printed its own hand-written copy of the same hours. Two sheets, two authors, one
// building — so they disagreed the moment either was edited. This is the single source: the sheet
// on the wall is rendered from it, F9's and F11's notices are rendered from it, and `noiseAt`
// below answers the only question any of them actually asks.
//
// Top-level and not inside the builder on purpose. `Object.keys(FlatFit)` runs the builders in
// script order — f3, f4 … f9, f10, f11, roof — so f9's builder runs BEFORE f10's and would read
// an empty object if this were assigned inside. Every js/home-*.js file's top-level statements
// have run by the time World's Lazy body calls `build()`, so reading it from a sibling is safe.
HomeF10.RENO_HOURS = {
  // 八时至十二时, 十四时至十八时. Halves, in hours, so a minute-of-day test is one comparison.
  spans: [[8, 12], [14, 18]],
  hz: ['八时至十二时', '十四时至十八时'],
  weekend: false,                 // 周末不施工
  flat: '一〇〇七室',
  owner: '业主 王 六八三',
  // 竣工日期. Day-of-game the permit expires on; the game clock walks up to it and past it, which
  // is the first thing in this tower that is different on day 40 from day 4.
  doneDay: 96,
  doneHz: '二〇二五年五月二十日',
};

// Is the crew drilling right now? `minutes` is minutes-of-day and `day` the game day, both the
// way js/game.js keeps them. Returns 0 when the site is quiet and 1 when it is not — F9 and F11
// read this for their own notices, and it is the one line js/game.js needs to make the drill
// audible from the floors either side (see the ticket at the foot of this file).
//
// Cheap on purpose: two comparisons and no allocation, so a caller may poll it per second without
// thinking about it. Nothing here ticks; there is no state to advance.
HomeF10.noiseAt = (minutes, day) => {
  const R = HomeF10.RENO_HOURS;
  if (day >= R.doneDay) return 0;                  // the job finished; the floor went quiet
  if (!R.weekend && ((day % 7) === 6 || (day % 7) === 0)) return 0;
  const h = ((minutes || 0) / 60) % 24;
  for (const [a, b] of R.spans) if (h >= a && h < b) return 1;
  return 0;
};

FlatFit['f10'] = A => {
  if (!A || typeof A.box !== 'function') { console.warn('home-f10: no toolkit'); return HomeF10; }

  const box = A.box, cyl = A.cyl, ball = A.ball;
  const cap = A.cap || A.box, taper = A.taper || A.box;
  const wall = A.wall, flat = A.flat, ceil = A.ceiling;
  const glyph = A.glyph || (() => []);
  const stop = A.stop, thing = A.th, light = A.light || (() => null);
  const shade = A.shade || (() => null), glow = A.glow || (() => null);
  const C = A.C, MAT = A.MAT, Mx = A.M;
  const PI = Math.PI;

  // ------------------------------------------------------------------ the coordinate contract
  // Read off the shell wherever the shell publishes it, so this floor follows if the plan moves.
  const CR = A.CORR || { x0: -6.0, x1: 6.0, z0: 3.2, z1: 6.2, h: 2.60 };
  const FT = A.FLAT || { x0: -6.0, x1: 6.0, z0: -5.0, z1: 3.2, h: 2.60 };
  const LF = A.LIFT || { x0: 1.6, x1: 3.4, z0: 4.9, z1: 6.2 };
  const Y = A.y0;                              // world y of deck 10 — never a literal
  const X0 = CR.x0, X1 = CR.x1;                // the building, west to east
  const ZS = FT.z0, ZM = CR.z0, ZN = CR.z1;    // south face, the flat/landing wall, north face
  const H = CR.h, CY = Y + H;                  // clear height, and the soffit
  const FL = Y + .004;                         // my slab's top face
  const ST = FL + .006;                        // where a thing standing on the floor stands

  // The doorway into the flat. 1.20 m rather than the 1.00 the shell cuts on deck 2, and that is
  // not decoration: `clampMove` inflates every collider by the 0.30 m body radius, so a 1.00 m
  // opening is a 0.40 m slot and a 1.20 m one is a genuine 0.60 m of clear run. It is also what
  // the doorway of a flat mid-装修 actually is — the frame and the 防盗门 have both come off, the
  // opening has been knocked out square, and a plastic strip curtain hangs in it.
  const DX = 3.90, DW = 1.20, DTOP = 2.10;
  const DL = DX - DW / 2, DR = DX + DW / 2;          // 3.30 .. 4.50
  const PT = .14;                                     // the partition's thickness
  const PS = ZM - PT / 2, PN = ZM + PT / 2;           // 3.13 flat face .. 3.27 landing face
  const W1x = [-3.60, -1.20], W2x = [0.60, 3.00];     // the two south windows
  const WSILL = 0.95, WHEAD = 2.25;
  const EWz = [-1.60, -0.40];                         // the small east window

  // ------------------------------------------------------------------ palette
  // Almost no colour up here, which is the point: everything is the grey of screed, the off-white
  // of aerated block, the kraft brown of a cement sack — and then red and blue, which are the only
  // saturated things on the floor because 水电改造 is marked in exactly those two.
  const col = {
    screed:  C('#8d8a83'), screedL: C('#9b988f'), screedD: C('#75736d'),
    soffit:  C('#9a968d'), soffitD: C('#84817a'),
    block:   C('#cdc8bb'), blockD:  C('#b6b1a4'), mortar:  C('#b8b3a6'),
    plaster: C('#bdb29c'), plasterD:C('#a79c86'), grubby: C('#a89d88'),
    chase:   C('#5f5c56'), chaseL:  C('#a49f94'),
    red:     C('#b5382a'), redD:    C('#82251b'), redL:    C('#d4503c'),
    blue:    C('#2f5f9b'), blueL:   C('#4f86c4'),
    steel:   C('#a9b0b6'), steelD:  C('#7d848a'), steelX:  C('#5b6167'),
    alu:     C('#adb5bb'), galv:    C('#87909a'),
    ply:     C('#9d8459'), plyD:    C('#7e6a45'), pine: C('#c6a670'),
    kraft:   C('#ab8f62'), kraftD:  C('#8d7449'),
    sand:    C('#c4a97a'), sandD:   C('#a88d5f'),
    tile:    C('#dcd7c9'), tileE:   C('#c3bdad'), tileB:   C('#8fa5a8'),
    white:   C('#efece3'), paper:   C('#e9e2cf'), ink:     C('#2a241d'),
    grey:    C('#7e858b'), dust:    C('#c8c2b3'),
    rubber:  C('#33363a'),
    yellow:  C('#dca42a'), yellowD: C('#a97c18'),
    lampW:   C('#fff3d6'),
    sheet:   C('#d6d1c3'), poly:    C('#cfd8d2'),
    doorA:   C('#6c3a2b'), doorB:   C('#7d4634'), doorD:   C('#4b2820'),
    sky:     C('#b9d0e2'), skyLo:   C('#d6e0e6'), far:     C('#9db2c2'), near: C('#7f95a6'),
  };
  const M4 = {
    plaster: { mode: 4, ...MAT.plaster },
    // ART.md:61 — the balcony/utility/unfinished row. world.js's generic MAT.cast is 1.10/.24,
    // sized for a lobby plinth; a gutted flat is bare screed and wants the coarse repeat. matAmt
    // is the file's own .24 and NOT ART.md's .15: rendered at .15 the screed came out a flat white
    // field (APT-F10, 2026-08-08). ART.md:80-84's warning is against raising matAmt to brighten a
    // washed-out room; this keeps the detail the file already had while taking the 2.9 repeat.
    cast:    { mode: 0, mat: 'concrete', matScale: 2.9, matAmt: .24, nrmAmt: .30, gloss: .13 },
    conc:    { mode: 14, mat: 'concrete', matScale: 2.9, matAmt: .24, nrmAmt: .30, gloss: .13 },
    slab:    { mode: 9, ...MAT.slab },
    metal:   { mode: 0, ...MAT.metal },
    timber:  { mode: 6, ...MAT.timber },
  };

  // Writing on a face. `glyphs` pushes its quads 12 mm along the yaw it is handed, so passing the
  // front of the thing written on together with the yaw that faces the reader always puts the ink
  // in front of it, whichever wall it is.
  const G = (x, y, z, yaw, text, o) => glyph(x, y, z, yaw, text, { color: col.ink, ...o });
  // A word the player can look at. `focus` is a spot on the floor a body can genuinely stand on —
  // never inside the heap the word belongs to, or it reads "too far" from every angle in the room.
  const TH = (hz, x, y, z, zh, en, note, fx, fz, reach = 1.9, tag) =>
    thing(hz, x, y, z, zh, en, note, { focus: [fx, fz], reach, tag: tag || hz });

  // ==================================================================== the envelope
  //
  // Two floor fields, because the two halves of this deck are at two different stages: the landing
  // still has the estate's original slab under a fortnight of dust, and the flat has been taken
  // back to raw screed. Both are single quads at FL; everything else on the floor stacks above
  // them in 6 mm steps so no two horizontal faces ever share a plane.
  flat(0, FL, (ZM + ZN) / 2, X1 - X0, ZN - ZM, C('#95908a'), { gloss: .22, ...M4.slab });
  flat(0, FL, (ZS + ZM) / 2, X1 - X0, ZM - ZS, col.screed, { gloss: .10, ...M4.conc });
  // Screed poured in bays, and one bay poured last week and still a shade darker than the rest.
  flat(-2.60, FL + .006, -2.20, 5.20, 3.60, col.screedD, { gloss: .12, ...M4.conc });
  flat(1.40, FL + .006, 1.60, 3.60, 2.40, col.screedL, { gloss: .09, ...M4.conc });

  // The soffit. Bare slab: no skim, no paint, the formwork joints still on it, and dark — which is
  // what lets the work lamp read as the only thing lighting the place.
  ceil(0, CY, (ZM + ZN) / 2, X1 - X0, ZN - ZM, C('#b3aea3'), { mode: 0, gloss: .06, ...M4.cast });
  ceil(0, CY, (ZS + ZM) / 2, X1 - X0, ZM - ZS, col.soffit, { mode: 0, gloss: .05, ...M4.cast });
  for (let i = 0; i < 7; i++)
    box(0, CY - .012, ZS + .60 + i * 1.20, X1 - X0, .018, .022, col.soffitD,
        { hard: true, gloss: .05 });
  for (const cx of [-3.60, 0, 3.60])
    box(cx, CY - .012, (ZS + ZM) / 2, .022, .018, ZM - ZS, col.soffitD, { hard: true, gloss: .05 });

  // ---- the four perimeter walls. Every quad in this renderer is single-sided — a wall faces its
  // yaw, and yaw 0 faces +z. One of these backwards and you look straight through the building.
  const PW = { gloss: .08, ...M4.plaster };
  for (const [a, b] of [[X0, W1x[0]], [W1x[1], W2x[0]], [W2x[1], X1]])
    wall((a + b) / 2, Y + H / 2, ZS, b - a, H, 0, col.plaster, PW);
  for (const [a, b] of [W1x, W2x]) {
    wall((a + b) / 2, Y + WSILL / 2, ZS, b - a, WSILL, 0, col.plaster, PW);
    wall((a + b) / 2, Y + (WHEAD + H) / 2, ZS, b - a, H - WHEAD, 0, col.plaster, PW);
  }
  wall(X0, Y + H / 2, (ZS + ZM) / 2, ZM - ZS, H, PI / 2, col.plaster, PW);
  for (const [a, b] of [[ZS, EWz[0]], [EWz[1], ZM]])
    wall(X1, Y + H / 2, (a + b) / 2, b - a, H, -PI / 2, col.plaster, PW);
  wall(X1, Y + 0.80, (EWz[0] + EWz[1]) / 2, EWz[1] - EWz[0], 1.60, -PI / 2, col.plaster, PW);
  wall(X1, Y + (2.10 + H) / 2, (EWz[0] + EWz[1]) / 2, EWz[1] - EWz[0], H - 2.10, -PI / 2,
       col.plaster, PW);
  // north, in two runs so the lift shaft's own dark backdrop shows through the landing opening
  // instead of a sheet of corridor plaster
  for (const [a, b] of [[X0, 1.55], [3.45, X1]])
    wall((a + b) / 2, Y + H / 2, ZN, b - a, H, PI, col.plaster, PW);
  wall(X0, Y + H / 2, (ZM + ZN) / 2, ZN - ZM, H, PI / 2, col.plaster, PW);
  wall(X1, Y + H / 2, (ZM + ZN) / 2, ZN - ZM, H, -PI / 2, col.plaster, PW);
  // ---- and the grubbiness. A 装修 wall is never one flat tone: the bottom 400 mm of every run is
  // scuffed grey where barrows and boards have been dragged along it, and there are patches where
  // the old skirting came off and took the paint with it.
  //
  // Only on the two walls that carry nothing else. The west wall is the chased one and the south
  // wall has the windows and two vertical chases in it — a scuff band on either would be a second
  // face in the 14 mm of depth the chases already occupy, and the coplanar rule in this renderer
  // is not a style note.
  for (let i = 0; i < 4; i++) {
    const h = .26 + (i % 2) * .16;
    box(X1 - .010, Y + h / 2 + .02, -0.30 + (i - 1.5) * 1.64, .010, h, 1.46, col.grubby,
        { hard: true, gloss: .05, alpha: .5 });
    box((i - 1.5) * 2.40, Y + h / 2 + .02, ZN - .010, 1.90, h, .010, col.grubby,
        { hard: true, gloss: .05, alpha: .42 });
  }
  // and a run of it along the foot of the landing face west of the opening, where every board has
  // been dragged past. West only: east of the opening that face carries the permit, the hours
  // notice and the door leaning on it, and all three live in the same 20 mm of depth.
  box((X0 + .4 + DL - .3) / 2, Y + .17, PN + .010, (DL - .3) - (X0 + .4), .30, .010, col.grubby,
      { hard: true, gloss: .05, alpha: .45 });

  // ---- the wall between the landing and the flat, 140 mm of block with a hole knocked in it. The
  // two faces are 140 mm apart rather than coplanar, and the reveal boxes at the opening are what
  // make it read as a wall with thickness rather than a sheet of paper with a slot in it.
  for (const [a, b] of [[X0, DL], [DR, X1]]) {
    wall((a + b) / 2, Y + H / 2, PN, b - a, H, 0, C('#c6bca8'), PW);
    wall((a + b) / 2, Y + H / 2, PS, b - a, H, PI, col.block, PW);
  }
  wall(DX, Y + (DTOP + H) / 2, PN, DW, H - DTOP, 0, C('#c6bca8'), PW);
  wall(DX, Y + (DTOP + H) / 2, PS, DW, H - DTOP, PI, col.block, PW);
  for (const s of [-1, 1])
    box(DX + s * (DW / 2 + .01), Y + DTOP / 2, ZM, .02, DTOP, PT, col.blockD,
        { hard: true, gloss: .07, ...M4.cast });
  box(DX, Y + DTOP + .01, ZM, DW + .04, .02, PT, col.blockD, { hard: true, gloss: .07 });
  // A length of angle iron bedded over it, which is how a knocked-through opening is actually held
  // up here, and the rendered patch under it never does get painted.
  box(DX, Y + DTOP + .07, ZM, DW + .30, .10, PT + .03, col.steelX,
      { hard: true, gloss: .34, ...M4.metal });
  box(DX, Y + DTOP + .21, PN - .015, DW + .34, .18, .03, col.mortar, { hard: true, gloss: .06 });

  stop(X0, DL, PS, PN);
  stop(DR, X1, PS, PN);
  stop(X0 - .4, X0 + .10, ZS, ZN);
  stop(X1 - .10, X1 + .4, ZS, ZN);
  stop(X0, X1, ZS - .4, ZS + .10);
  stop(X0, X1, ZN - .10, ZN + .4);

  // ==================================================================== the lift landing
  //
  // The shell builds no landing on this deck, and this file must not build one either — the doors,
  // the surround, the indicator and the call panel are the shell's on every deck, and two sets of
  // them would be two sheets of steel fighting for one plane.
  //
  // What is built here instead is the thing that genuinely belongs to floor 10 and not to the
  // shell: 电梯保护, the plywood the 物业 make you screw over the landing before a single bag of
  // cement is allowed up in the car. It stands at LIFT.z0 - .06, which is 25 mm clear in front of
  // the nearest plane a shell landing would ever use, and it leaves the 0.88 m door opening
  // completely empty — so a landing added later slides in behind it exactly the way real
  // protection boarding sits over real jambs.
  const HZ = LF.z0 - .06;                       // the face of the boarding
  const OL = 2.06, OR = 2.94, OTOP = 2.14;      // the opening left clear for the doors
  // Site boarding, not joinery: the wood grain is turned right down (matAmt .12) and the gloss
  // with it, because at the shell's timber preset a 4 m sheet of it read as a sauna wall.
  const PLY = { hard: true, gloss: .06, mode: 6, mat: 'wood', matScale: 1.6, matAmt: .12,
                nrmAmt: .18 };
  box((-0.60 + OL) / 2, Y + H / 2, HZ + .011, OL + 0.60, H, .022, col.ply, PLY);
  box((OR + 3.50) / 2, Y + H / 2, HZ + .011, 3.50 - OR, H, .022, col.ply, PLY);
  box((OL + OR) / 2, Y + (OTOP + H) / 2, HZ + .011, OR - OL, H - OTOP, .022, col.ply, PLY);
  for (const bx of [-0.60, 0.62, 1.84, OL, OR, 3.50])
    box(bx, Y + H / 2, HZ - .008, .05, H, .018, col.plyD, { hard: true, gloss: .06 });
  for (const by of [.42, 1.62, 2.42])
    box((-0.60 + OL) / 2, Y + by, HZ - .008, OL + 0.60, .045, .016, col.plyD,
        { hard: true, gloss: .06 });
  // and the dust that has settled on every horizontal edge of it
  for (const by of [.44, 1.64, 2.44])
    box((-0.60 + OL) / 2, Y + by + .026, HZ - .010, OL + 0.54, .012, .014, col.dust,
        { hard: true, gloss: .03, alpha: .55 });
  for (const s of [-1, 1])
    box(s < 0 ? OL - .02 : OR + .02, Y + OTOP / 2, HZ + .028, .04, OTOP, .06, col.kraftD,
        { hard: true, gloss: .12 });
  box((OL + OR) / 2, Y + OTOP + .02, HZ + .028, OR - OL + .08, .04, .06, col.kraftD,
      { hard: true, gloss: .12 });
  // The shaft behind it: two dark flanks and a dark back, all outside the car's own footprint (its
  // sides stand at x 1.60 and 3.40 and its back at z 6.20), so nothing here is ever inside the car.
  for (const [fx, fyaw] of [[1.55, PI / 2], [3.45, -PI / 2]])
    wall(fx, Y + H / 2, (HZ + ZN + .04) / 2, ZN + .04 - HZ, H, fyaw, C('#2b2f33'),
         { gloss: .10, ...M4.metal });
  wall(2.50, Y + H / 2, ZN + .04, 1.90, H, PI, C('#212528'), { gloss: .08, ...M4.metal });
  for (const gx of [1.86, 3.14])
    box(gx, Y + H / 2, ZN - .10, .09, H, .10, C('#4a4f54'), { hard: true, gloss: .40, ...M4.metal });

  stop(-0.70, OL, HZ, ZN + .10);
  stop(OR, 3.60, HZ, ZN + .10);

  // 电梯保护 — the notice screwed to the boarding, with the 物业 chop on it.
  box(1.30, Y + 1.58, HZ - .026, .46, .60, .016, col.paper, { hard: true, gloss: .05, ry: .012 });
  G(1.30, Y + 1.80, HZ - .038, PI, '电梯保护', { size: .062, gap: .014, color: col.redD });
  box(1.30, Y + 1.735, HZ - .038, .34, .006, .006, col.redD, { hard: true });
  G(1.30, Y + 1.66, HZ - .038, PI, '装修期间', { size: .040, gap: .008 });
  G(1.30, Y + 1.60, HZ - .038, PI, '轿厢已铺垫', { size: .040, gap: .008 });
  G(1.30, Y + 1.50, HZ - .038, PI, '请勿拆除', { size: .046, gap: .010, color: col.redD });
  G(1.30, Y + 1.36, HZ - .038, PI, '物业管理处', { size: .032, gap: .007, color: col.grey });
  for (const [sx, sy] of [[-.19, .26], [.19, .26], [-.19, -.26], [.19, -.26]])
    box(1.30 + sx, Y + 1.58 + sy, HZ - .034, .05, .022, .004, C('#d7d0bb'), { hard: true });
  cyl(1.46, Y + 1.42, HZ - .036, .052, .004, col.red, { rx: PI / 2, mode: 1, glow: .02, alpha: .8 });

  // ==================================================================== the landing, dressed
  //
  // Everything here hugs a wall inside 0.45 m, so the 0.95 m of standing room in front of the
  // boarding stays 0.95 m.

  // ---- 编织布, the woven protection runner. The 物业 will not let a bag of cement out of the lift
  // until this is down, and it is the strongest single thing in the corridor: one green-grey band
  // from the lift doors to the flat's opening, taped at the edges, grey with boot dust.
  const runY = FL + .012;
  flat(2.50, runY, 4.30, 1.05, 1.10, C('#7f8a72'), { mode: 7, gloss: .05 });
  flat((2.50 + DX) / 2, runY, 3.72, DX - 2.50 + 1.05, .95, C('#7f8a72'), { mode: 7, gloss: .05 });
  flat(DX, runY, 3.34, 1.10, 1.20, C('#7f8a72'), { mode: 7, gloss: .05 });
  for (const tz of [3.25, 4.19])
    flat(3.20, runY + .006, tz, 2.5, .05, C('#8d8a6a'), { mode: 7, gloss: .12 });
  flat(3.10, runY + .012, 3.74, 2.9, .55, C('#8f9584'), { mode: 7, gloss: .04, alpha: .75 });

  // ---- dust. The floor outside a 装修 flat is never clean, and this is the cheapest possible
  // version of that: four pale drifts on the slab and a scatter of boot prints tracking from the
  // opening back to the lift.
  for (const [dx, dz, dw, dd, da] of [[4.90, 4.10, 2.4, 1.7, .34], [1.20, 3.70, 3.2, .9, .22],
                                      [-2.60, 4.30, 4.0, 1.6, .17], [-5.00, 5.40, 2.0, 1.4, .13]])
    flat(dx, FL + .006, dz, dw, dd, col.dust, { mode: 7, gloss: .03, alpha: da });
  for (let i = 0; i < 11; i++) {
    const t = i / 10, px = DX - (DX - 2.60) * t + (i % 2 ? .10 : -.10);
    flat(px, FL + .024, 3.55 + t * 0.72, .13, .27, C('#b6b0a0'),
         { mode: 7, gloss: .04, alpha: .30, ry: -.35 + (i % 3) * .05 });
  }

  // ---- the landing lights. Two surface bulkheads and one dead, which is the true state of every
  // landing of this kind — and the live ones are filthy, so they throw less than they should and
  // the work lamp inside the flat wins the frame from the doorway.
  for (const [px, pz, alive] of [[-3.40, 4.20, true], [-0.20, 3.60, false], [4.60, 4.20, true]]) {
    box(px, CY - .048, pz, .44, .07, .16, col.steelD, { hard: true, gloss: .26 });
    box(px, CY - .098, pz, .38, .05, .12, alive ? C('#e6dcbc') : C('#b5b2a9'),
        { hard: true, mode: alive ? 1 : 0, glow: alive ? .10 : 0, gloss: .10 });
    if (alive) light(px, CY - .20, pz, C('#e2e6e2'), .30, 3.00);
  }
  // A festoon of temporary lighting the electrician strung along the soffit, running from the
  // flat's opening back toward the lift. One holder is out, which is what a festoon always is.
  const fest = [[3.55, 3.62], [2.55, 3.66], [1.55, 3.62], [0.55, 3.66]];
  for (let i = 0; i < fest.length; i++) {
    const [fx, fz] = fest[i];
    if (i < fest.length - 1)
      box(fx - .5, CY - .035, (fz + fest[i + 1][1]) / 2, 1.02, .014, .014, col.yellow,
          { hard: true, gloss: .22 });
    cyl(fx, CY - .10, fz, .014, .13, col.yellow, { gloss: .20 });
    cyl(fx, CY - .195, fz, .026, .06, C('#e4e0d2'), { gloss: .30 });
    ball(fx, CY - .265, fz, .033, .042, .033, i === 1 ? C('#e8e2cd') : col.lampW,
         { mode: i === 1 ? 0 : 1, glow: i === 1 ? 0 : .11, gloss: .30 });
  }
  light(2.55, CY - .30, 3.66, C('#ffe6b8'), .26, 2.60);
  light(3.55, CY - .30, 3.62, C('#ffe6b8'), .22, 2.40);

  // ---- 装修许可证 and the hours notice, taped to the landing face beside the opening. Everybody
  // on this floor has read this, and everybody on this floor can quote the hours back at you.
  const NX = DR + .74, NZ = PN + .012;
  box(NX, Y + 1.56, NZ, .40, .56, .018, col.paper, { hard: true, gloss: .05, ry: -.015 });
  box(NX, Y + 1.80, NZ + .010, .40, .09, .006, col.red, { hard: true, gloss: .06 });
  G(NX, Y + 1.80, NZ + .016, 0, '装修许可证', { size: .050, gap: .011, color: C('#f0e6d2') });
  G(NX, Y + 1.68, NZ + .016, 0, '一〇〇七室', { size: .042, gap: .009 });
  G(NX, Y + 1.60, NZ + .016, 0, '施工时间', { size: .038, gap: .008, color: col.grey });
  G(NX, Y + 1.53, NZ + .016, 0, '八时至十二时', { size: .034, gap: .007 });
  G(NX, Y + 1.46, NZ + .016, 0, '十四时至十八时', { size: .034, gap: .007 });
  G(NX, Y + 1.37, NZ + .016, 0, '周末不施工', { size: .038, gap: .008, color: col.redD });
  G(NX, Y + 1.28, NZ + .016, 0, '业主 王 六八三', { size: .030, gap: .006, color: col.grey });
  cyl(NX + .13, Y + 1.33, NZ + .014, .048, .004, col.red,
      { rx: PI / 2, mode: 1, glow: .02, alpha: .8 });
  for (const [sx, sy] of [[-.16, .25], [.16, .25], [-.16, -.25], [.16, -.25]])
    box(NX + sx, Y + 1.56 + sy, NZ + .012, .045, .020, .004, C('#d7d0bb'), { hard: true });
  // and a second sheet next to it, handwritten and much angrier, from the flat opposite
  box(NX + .52, Y + 1.50, NZ, .30, .34, .016, C('#e3ddc8'), { hard: true, gloss: .05, ry: .04 });
  G(NX + .52, Y + 1.60, NZ + .014, 0, '请中午别敲', { size: .040, gap: .008, color: col.redD });
  G(NX + .52, Y + 1.52, NZ + .014, 0, '孩子要午睡', { size: .036, gap: .008 });
  G(NX + .52, Y + 1.42, NZ + .014, 0, '谢谢', { size: .034, gap: .008, color: col.grey });

  // ---- the 防盗门 that came off. Leaning against the landing wall east of the opening with its
  // hinges still on it: the single clearest "this flat is being gutted" object on the floor.
  (function oldDoor() {
    const dx = 5.20, dz = PN + .21, tilt = .11;
    box(dx, Y + 1.03, dz, .95, 2.04, .055, col.doorA, { gloss: .22, rz: tilt, tag: '防盗门' });
    for (const [py, ph] of [[1.42, .80], [0.55, .62]])
      box(dx - .02, Y + py, dz - .036, .74, ph, .018, col.doorB,
          { hard: true, gloss: .20, rz: tilt, tag: '防盗门' });
    for (const hy of [.38, 1.06, 1.74])
      cyl(dx + .46, Y + hy, dz - .014, .015, .10, col.steelD, { gloss: .40, rz: tilt });
    box(dx - .34, Y + 1.06, dz - .050, .10, .22, .028, col.steelD,
        { hard: true, gloss: .44, rz: tilt });
    box(dx - .02, Y + 1.90, dz - .046, .28, .12, .020, col.steel,
        { hard: true, gloss: .38, rz: tilt });
    G(dx - .02, Y + 1.90, dz - .058, 0, '1007', { size: .066, gap: .011, color: col.ink });
    shade(dx, dz + .10, 1.10, .40, .34);
  })();
  // 0.22 deep, not 0.34. A leaf 55 mm thick leaning at 0.11 rad reaches 0.21 m off the wall, and
  // every extra centimetre here is a centimetre off a walkway that is already the narrowest run
  // on the floor — at 0.34 the east end pinched to 0.12 m and could not be walked.
  stop(4.68, 5.72, PN, PN + .22);

  // ---- what came out of the flat, piled in the east bay, and what has not gone in yet, piled in
  // the west one. Both are kept clear of the neighbours' doorways — just.
  (function eastBay() {
    // 编织袋 of 建筑垃圾 — blue-and-white striped woven sacks, slumped, tied at the neck
    for (const [sx, sz, r] of [[5.00, 5.85, .00], [5.42, 5.92, .30], [5.78, 5.72, -.22],
                               [5.14, 5.48, .12], [5.60, 5.44, .40]]) {
      ball(sx, ST + .21, sz, .21, .22, .19, C('#cfd4d8'), { gloss: .16, ry: r });
      box(sx, ST + .30, sz, .34, .26, .30, C('#cfd4d8'), { gloss: .16, ry: r });
      for (const o of [-.10, .02, .14])
        box(sx + o, ST + .30, sz - .16, .045, .24, .02, C('#8fa8c0'),
            { hard: true, gloss: .14, ry: r });
      cap(sx, ST + .46, sz, .055, .13, .055, C('#c8ced2'), { gloss: .16, rz: .3 + r });
    }
    shade(5.36, 5.70, 1.30, 1.00, .34);
    // 手推车 — a builder's barrow, tipped up on its nose in the corner beside the sacks, so the
    // whole east bay is one collider and the run past it stays 0.90 m rather than 0.12.
    const bx = 5.68, bz = 5.18;
    box(bx, ST + .62, bz, .56, .74, .40, C('#3f6b46'), { gloss: .26, rx: -.30, tag: '手推车' });
    box(bx, ST + .96, bz - .10, .58, .12, .30, C('#2f5236'), { hard: true, gloss: .26, rx: -.30 });
    for (const s of [-1, 1])
      cyl(bx + s * .21, ST + .16, bz + .18, .028, .95, col.steelD, { rx: -.30, gloss: .38 });
    cyl(bx, ST + .18, bz + .30, .155, .07, col.rubber, { rz: PI / 2, gloss: .16 });
    shade(bx, bz + .10, .70, .70, .30);
  })();
  stop(4.72, 5.98, 4.98, ZN);

  // The west bay. Everything here sits in the 0.56 m of wall *between* two neighbours' architraves
  // — 1001's ends at x -4.43 and 1002's starts at -3.87 — because a stack of cement across
  // somebody's front door is a stack of cement a body cannot walk round to reach that door, and
  // 1002's doorway has to stay walkable-to as well.
  (function westBay() {
    for (let i = 0; i < 3; i++)
      box(-4.15, ST + .09 + i * .17, 5.74 + (i % 2) * .05, .50, .17, .58, col.kraft,
          { gloss: .10, ry: (i - 1) * .07, tag: '水泥' });
    for (let i = 0; i < 3; i++)
      G(-4.15, ST + .18 + i * .17, 5.44 + (i % 2) * .05, PI, '水泥',
        { size: .080, gap: .017, color: col.kraftD });
    shade(-4.15, 5.76, .70, .70, .36);
    // the sweepings, and the broom that made them, in the far corner
    ball(X0 + .42, ST + .05, 4.30, .34, .05, .30, C('#9d9a92'), { gloss: .05 });
    flat(X0 + .42, FL + .014, 4.30, 1.00, .90, C('#a8a49a'), { mode: 7, gloss: .04, alpha: .7 });
    cyl(X0 + .30, ST + .70, 4.62, .015, 1.36, C('#9a7c4e'), { rz: .16, rx: -.05, gloss: .18 });
    box(X0 + .40, ST + .09, 4.68, .10, .17, .34, C('#6f5a3a'), { gloss: .12, rz: .16 });
    shade(X0 + .40, 4.50, .60, .70, .28);
    // 灭火器, red, and the only clean thing on the floor. Away from the boarding's west edge, so
    // the body can actually stand in front of the word.
    cyl(-1.45, ST + .28, ZN - .22, .076, .50, col.red, { gloss: .32, tag: '灭火器' });
    taper(-1.45, ST + .58, ZN - .22, .152, .12, .152, col.red, { gloss: .32, tag: '灭火器' });
    cyl(-1.45, ST + .67, ZN - .22, .020, .09, col.steelD, { gloss: .46 });
    box(-1.45, ST + .31, ZN - .30, .11, .17, .012, col.white, { hard: true, gloss: .10 });
    shade(-1.45, ZN - .22, .24, .24, .30);
  })();
  stop(-4.44, -3.86, 5.42, ZN);
  stop(X0, X0 + .62, 4.28, 4.86);
  stop(-1.62, -1.28, ZN - .38, ZN);

  // ---- the neighbours. Four 防盗门 on the north wall, all shut, all dusty, and none of them
  // yours.
  //
  // THE LEAF IS TAGGED 门, THE FRAME AND THE PLATE ARE TAGGED 门牌, and the split is the whole
  // point. `HOME_DOOR_USE.neighbour` in js/data.js hangs the shared 敲门 row off `门`, so a leaf
  // without that tag is a door you cannot knock on — which is what these four were, and what made
  // a front door read as wall on this floor. The number plate keeps 门牌 so its own card still
  // resolves; `pick` finds the nearest thing wearing a tag, and the two are 0.8 m apart in y and
  // at the same x, so neither steals the other.
  //
  // Every collider stays exactly as it was. These are the doors that must not open.
  //
  // The residual hazard is `pick`'s 2-D tie-break, which is item 5 in the ticket list at the foot
  // of this file and not fixable from here: 门 is now contested across decks the same way 邻居
  // already was. It is the shared row's price and it is the shared row's to solve.
  function frontDoor(cx, num, o = {}) {
    const F = d => ZN - d, W = 1.00, HT = 2.06, LW = W - .05, LH = HT - .04;
    const hinge = o.hinge === undefined ? -1 : o.hinge;
    const body = o.body || col.doorA, panel = o.panel || col.doorB;
    for (const s of [-1, 1])
      box(cx + s * (W / 2 + .035), Y + (HT + .07) / 2, F(.045), .07, HT + .07, .09, col.doorD,
          { hard: true, gloss: .24, tag: '门牌' });
    box(cx, Y + HT + .035, F(.045), W + .14, .07, .09, col.doorD,
        { hard: true, gloss: .24, tag: '门牌' });
    box(cx, Y + LH / 2, F(.030), LW, LH, .06, body, { hard: true, gloss: .20, tag: '门' });
    for (const [py, ph] of [[LH * .70, LH * .40], [LH * .265, LH * .30]]) {
      box(cx, Y + py, F(.070), LW - .16, ph, .020, panel, { hard: true, gloss: .18, tag: '门牌' });
      for (const s of [-1, 1])
        box(cx, Y + py + s * ph / 2, F(.082), LW - .16, .012, .012, col.doorD,
            { hard: true, gloss: .26, tag: '门牌' });
    }
    const hx = cx - hinge * (LW / 2 - .13);
    box(hx, Y + 1.03, F(.075), .10, .24, .03, col.steelD, { hard: true, gloss: .42, tag: '门牌' });
    box(hx - hinge * .085, Y + 1.03, F(.146), .19, .028, .028, col.steel,
        { hard: true, gloss: .46, tag: '门牌' });
    cyl(cx, Y + 1.56, F(.078), .012, .030, C('#b08a3c'), { rx: PI / 2, gloss: .55 });
    for (const hy of [.36, 1.06, 1.76])
      cyl(cx + hinge * (LW / 2 - .012), Y + hy, F(.062), .014, .10, col.steelD, { gloss: .42 });
    box(cx, Y + 1.84, F(.072), .30, .13, .024, col.steel, { hard: true, gloss: .36, tag: '门牌' });
    G(cx, Y + 1.84, F(.084), PI, num, { size: .072, gap: .012, color: col.ink });
    // a film of dust across the bottom of every leaf, which is what living next to this is like
    box(cx, Y + .16, F(.064), LW - .04, .30, .008, col.dust,
        { hard: true, gloss: .04, alpha: .38 });
    flat(cx, FL + .012, F(.30), .62, .38, col.rubber, { mode: 7, gloss: .04 });
    shade(cx, F(.30), .70, .46, .24, FL + .018);
  }
  frontDoor(-5.00, '1001', { hinge: 1 });
  frontDoor(-3.30, '1002', { body: col.doorB, panel: col.doorA });
  frontDoor(-1.60, '1003');
  frontDoor(4.05, '1005', { hinge: 1, body: col.doorD, panel: col.doorA });
  for (const [s, text] of [[-1, '开门迎百福'], [1, '抬头见喜财']]) {
    box(-3.30 + s * .58, Y + 1.46, ZN - .020, .12, 1.00, .04, C('#9b3a2f'),
        { hard: true, gloss: .06, tag: '春联' });
    G(-3.30 + s * .58, Y + 1.46, ZN - .040, PI, text,
      { size: .102, gap: .017, color: C('#c9a765'), vertical: true, gloss: .08 });
  }
  for (const s of [-1, 1])
    cap(-1.60 + s * .07, ST + .035, ZN - .34, .078, .058, .195, C('#4a4f52'),
        { ry: s * .07, gloss: .14 });
  for (const s of [-1, 1])
    cap(-3.02 + s * .05, ST + .028, ZN - .32, .055, .042, .135, C('#c9a83f'),
        { ry: s * .10, gloss: .14 });

  // ==================================================================== inside 1007
  //
  // The flat. Stripped back to structure, with the 水电改造 half done: every chase cut, some of the
  // conduit in, none of it made good. Everything in here is placed to be seen from the doorway at
  // (3.90, 3.20) looking south-west, which is the shot the work lamp is lit for.

  // ---- the plastic strip curtain in the opening. Half the strips are pushed to one side, which
  // leaves a clear view in and, more usefully, a hard-edged silhouette against the lamp.
  for (let i = 0; i < 12; i++) {
    const sx = DL + .07 + i * .096, swing = i < 5 ? .30 : i > 8 ? -.16 : 0;
    box(sx + swing * .5, Y + 1.06, ZM - .05, .092, 2.02, .010, col.poly,
        { hard: true, mode: 18, alpha: i < 5 ? .30 : .22, gloss: .55, rz: swing * .10,
          tag: '门帘' });
  }
  box(DX, Y + 2.08, ZM - .05, DW - .04, .05, .04, col.steelD, { hard: true, gloss: .34 });

  // ---- 水电改造 on the west wall. This is the signature look of the whole floor: chases cut
  // floor-to-switch and along at socket height, red conduit for 强电 and blue for 弱电 lying in
  // them, 86 mm back boxes let in with their tails taped off, and the chalk that was snapped
  // before any of it was cut still on the plaster either side.
  //
  // A chase cannot be recessed in a renderer with no boolean geometry, so it is drawn as a dark
  // band 6 mm off the wall between two pale broken lips 14 mm off it. That reads as a groove from
  // anywhere a body can stand, and the conduit half-buried in it does the rest.
  const CW = .085;
  function chaseV(wx, sg, z, y0h, len) {
    box(wx + sg * .006, Y + y0h + len / 2, z, .012, len, CW, col.chase,
        { hard: true, gloss: .05 });
    for (const s of [-1, 1])
      box(wx + sg * .014, Y + y0h + len / 2, z + s * (CW / 2 + .012), .014, len, .024, col.chaseL,
          { hard: true, gloss: .06 });
  }
  function chaseH(wx, sg, yh, z0, z1) {
    box(wx + sg * .006, Y + yh, (z0 + z1) / 2, .012, CW, z1 - z0, col.chase,
        { hard: true, gloss: .05 });
    for (const s of [-1, 1])
      box(wx + sg * .014, Y + yh + s * (CW / 2 + .012), (z0 + z1) / 2, .014, .024, z1 - z0,
          col.chaseL, { hard: true, gloss: .06 });
  }
  // an 86 型 back box with no faceplate and its tails taped off — the object that says 装修 more
  // plainly than anything else on a wall
  function backBox(wx, sg, y, z, live) {
    box(wx + sg * .012, Y + y, z, .024, .088, .088, C('#c9b98a'), { hard: true, gloss: .18 });
    box(wx + sg * .026, Y + y, z, .012, .072, .072, C('#4b4438'), { hard: true, gloss: .12 });
    if (!live) return;
    for (const [c, o] of [[col.red, -.018], [col.blue, .014], [C('#d8d3c4'), .000]]) {
      cyl(wx + sg * .052, Y + y + .014, z + o, .0055, .080, c,
          { rz: sg > 0 ? -.55 : .55, rx: .30, gloss: .30, tag: '电线' });
      cyl(wx + sg * .072, Y + y + .048, z + o, .009, .028, C('#3a3f44'),
          { rz: sg > 0 ? -.75 : .75, gloss: .16 });
    }
  }
  (function westWallServices() {
    const wx = X0, sg = 1;
    chaseH(wx, sg, .32, -4.30, 2.60);
    chaseH(wx, sg, 1.32, 1.10, 2.70);
    cyl(wx + .020, Y + .32, (-4.10 + 1.20) / 2, .0155, 5.30, col.red,
        { rx: PI / 2, gloss: .28, tag: '电线' });
    cyl(wx + .020, Y + .356, (-4.10 + 0.30) / 2, .0155, 4.40, col.blue,
        { rx: PI / 2, gloss: .28, tag: '电线' });
    cyl(wx + .020, Y + 1.32, (1.25 + 2.60) / 2, .0155, 1.35, col.red,
        { rx: PI / 2, gloss: .28, tag: '电线' });
    for (const [cz, yh, len, c, live] of [[-3.40, .32, 1.02, col.red, true],
                                          [-1.60, .32, 1.02, col.blue, true],
                                          [0.40, .32, 1.02, col.red, false],
                                          [2.10, 1.32, 1.16, col.red, true]]) {
      chaseV(wx, sg, cz, yh, len);
      cyl(wx + .020, Y + yh + (len - .10) / 2, cz, .0155, len - .10, c, { gloss: .28 });
      backBox(wx, sg, yh + len, cz, live);
    }
    for (const cz of [-3.40, -1.60]) backBox(wx, sg, .30, cz, false);
    // chalk snapped before any of it was cut — still on the plaster either side of the chases
    for (const [yh, z0, z1, c] of [[1.45, -4.30, 2.70, col.red], [.45, -4.30, 2.60, col.red],
                                   [1.86, -2.60, 2.10, col.blue]])
      box(wx + .009, Y + yh, (z0 + z1) / 2, .010, .012, z1 - z0, c,
          { hard: true, gloss: .04, alpha: .72 });
    // and the spray, which is how the electrician and the plumber shout at each other
    G(wx + .014, Y + 1.66, -3.40, PI / 2, '插座', { size: .10, gap: .022, color: col.redL,
                                                    alpha: .85 });
    G(wx + .014, Y + 1.66, -1.60, PI / 2, '开关', { size: .10, gap: .022, color: col.redL,
                                                    alpha: .85 });
    G(wx + .014, Y + 2.08, 0.40, PI / 2, '弱电', { size: .095, gap: .020, color: col.blueL,
                                                   alpha: .85 });
    G(wx + .014, Y + 2.08, 2.10, PI / 2, '强电', { size: .095, gap: .020, color: col.redL,
                                                   alpha: .85 });
    G(wx + .014, Y + .78, 1.20, PI / 2, '水', { size: .17, color: col.blueL, alpha: .8 });
    // a big sprayed ring round the one thing nobody is to touch: the riser
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * PI * 2;
      box(wx + .012, Y + .78 + Math.sin(a) * .30, 1.20 + Math.cos(a) * .30, .010, .052, .052,
          col.blueL, { hard: true, gloss: .04, alpha: .7 });
    }
  })();

  // ---- the same treatment, lighter, on the south wall between the windows, and the pipes that
  // were pulled out and left leaning in the corner.
  (function southWallServices() {
    const sz = ZS;
    for (const cx of [-0.30, 3.42]) {
      box(cx, Y + 1.05, sz + .006, CW, 2.10, .012, col.chase, { hard: true, gloss: .05 });
      for (const s of [-1, 1])
        box(cx + s * (CW / 2 + .012), Y + 1.05, sz + .014, .024, 2.10, .014, col.chaseL,
            { hard: true, gloss: .06 });
      cyl(cx, Y + 1.05, sz + .020, .0155, 2.00, col.red, { gloss: .28, tag: '电线' });
    }
    for (const cx of [-0.30, 3.42]) {
      box(cx, Y + 2.16, sz + .012, .088, .088, .024, C('#c9b98a'), { hard: true, gloss: .18 });
      box(cx, Y + 2.16, sz + .026, .072, .072, .012, C('#4b4438'), { hard: true, gloss: .12 });
    }
    G(0.60, Y + 1.76, sz + .014, 0, '灯', { size: .13, color: col.redL, alpha: .85 });
    G(-2.20, Y + 1.10, sz + .014, 0, '拆', { size: .20, color: col.redL, alpha: .8 });
    // PPR water pipe and conduit offcuts leaning in the south-west corner
    for (let i = 0; i < 4; i++)
      cyl(X0 + .32 + i * .06, ST + .78, ZS + .30, .0135, 1.56, C('#5fa05f'),
          { rz: .10 + i * .012, rx: -.06, gloss: .32 });
    for (let i = 0; i < 3; i++)
      cyl(X0 + .60 + i * .05, ST + .70, ZS + .38, .020, 1.40, C('#c9c4b6'),
          { rz: -.12 - i * .014, rx: -.05, gloss: .26 });
    shade(X0 + .48, ZS + .34, .55, .40, .30);
  })();

  // ---- the windows, built as shallow bays in front of the openings rather than holes through
  // them: anything at z < ZS is behind a one-sided wall and does not exist from in here. Twenty-
  // eight metres up, so the view is mostly sky with the tops of the next blocks in it — and both
  // are still half covered in the milky film that goes on before the plastering and comes off at
  // the very end.
  function southWindow(a, b) {
    const cx = (a + b) / 2, w = b - a, bz = ZS + .012, skyH = WHEAD - WSILL;
    const p = box(cx, Y + (WSILL + WHEAD) / 2, bz, w - .04, skyH - .04, .012, col.sky,
                  { hard: true, mode: 1, glow: .035 });
    if (A.sky) A.sky(p);
    box(cx, Y + WSILL + .22, bz + .010, w - .06, .40, .008, col.skyLo,
        { hard: true, mode: 1, glow: .028 });
    for (const [ox, tw, th, layer] of [[-.86, .30, .62, 0], [-.44, .22, .40, 1], [-.04, .38, .78, 0],
                                       [.36, .24, .50, 1], [.72, .32, .66, 0]]) {
      const q = box(cx + ox * w / 2, Y + WSILL + th / 2, bz + .020, tw, th, .010,
                    layer ? col.near : col.far, { hard: true, mode: 1, glow: .018 });
      if (A.city) A.city(layer, q);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 2; j++) {
          const lw = box(cx + ox * w / 2 + (j - .5) * tw * .44,
                         Y + WSILL + th * (.28 + i * .22), bz + .028, tw * .16, .026, .006,
                         C('#ffdda0'), { hard: true, mode: 1, glow: .04 });
          if (A.city) A.city(2, lw);
        }
    }
    // the reveal: four plaster returns boxing the view in so it reads as a recess
    for (const [ry, rx2, rh, rw] of [[WSILL - .055, cx, .11, w + .22],
                                     [WHEAD + .055, cx, .11, w + .22],
                                     [(WSILL + WHEAD) / 2, a - .055, skyH, .11],
                                     [(WSILL + WHEAD) / 2, b + .055, skyH, .11]])
      box(rx2, Y + ry, ZS + .058, rw, rh, .115, col.plasterD,
          { hard: true, gloss: .08, ...M4.plaster });
    const wf = (yh, xc, hh, ww) => box(xc, Y + yh, ZS + .105, ww, hh, .05, col.alu,
                                       { hard: true, gloss: .38, ...M4.metal });
    wf(WSILL + .02, cx, .06, w + .06);
    wf(WHEAD - .02, cx, .06, w + .06);
    wf((WSILL + WHEAD) / 2, a + .03, skyH, .06);
    wf((WSILL + WHEAD) / 2, b - .03, skyH, .06);
    wf((WSILL + WHEAD) / 2, cx, skyH, .05);
    box(cx, Y + (WSILL + WHEAD) / 2, ZS + .085, w - .06, skyH - .06, .010, C('#cfdde4'),
        { hard: true, mode: 18, alpha: .12, gloss: .78, tag: '窗户' });
    // the protective film: still on the western half, hanging off the eastern one
    box(a + w * .27, Y + (WSILL + WHEAD) / 2, ZS + .128, w * .50, skyH - .05, .008, C('#dee3dd'),
        { hard: true, mode: 18, alpha: .62, gloss: .30, tag: '塑料布' });
    box(b - w * .17, Y + WHEAD - .34, ZS + .128, w * .30, .58, .008, C('#dee3dd'),
        { hard: true, mode: 18, alpha: .55, gloss: .30, rz: .22 });
    box(cx, Y + WSILL - .075, ZS + .17, w + .24, .05, .24, C('#b9b3a5'),
        { hard: true, gloss: .22, ...M4.cast });
    box(cx, Y + WSILL - .046, ZS + .17, w + .16, .010, .18, col.dust,
        { hard: true, gloss: .03, alpha: .5 });
    // a pale patch on the screed under it. The renderer only shafts real sun through World.WIN,
    // which belongs to the 客厅 on deck 2, so daylight up here is painted rather than cast.
    glow(Mx.trs(cx, FL + .030, ZS + 1.55, 0, w + .55, 1, 2.60), C('#fff0cf'), .16, true);
  }
  southWindow(W1x[0], W1x[1]);
  southWindow(W2x[0], W2x[1]);
  (function eastWindow() {
    const cz = (EWz[0] + EWz[1]) / 2, w = EWz[1] - EWz[0];
    const p = box(X1 - .012, Y + 1.85, cz, .012, .48, w - .04, col.skyLo,
                  { hard: true, mode: 1, glow: .03 });
    if (A.sky) A.sky(p);
    box(X1 - .085, Y + 1.85, cz, .010, .46, w - .06, C('#dee3dd'),
        { hard: true, mode: 18, alpha: .66, gloss: .30 });
    for (const [ry, rz2, rh, rw] of [[1.57, cz, .09, w + .18], [2.13, cz, .09, w + .18],
                                     [1.85, EWz[0] - .045, .56, .09],
                                     [1.85, EWz[1] + .045, .56, .09]])
      box(X1 - .055, Y + ry, rz2, .11, rh, rw, col.plasterD, { hard: true, gloss: .08 });
    glow(Mx.trs(X1 - 1.10, FL + .030, cz, 0, 1.90, 1, w + .50), C('#ffefcd'), .10, true);
  })();

  // ---- the partitions that are being built. One in 加气块, laid in courses and stopped exactly
  // where the bricklayer stopped; one in 轻钢龙骨 with no board on it at all, so you see straight
  // through the studs into the room beyond. Between them they turn 12 × 8 m of empty screed into
  // somewhere with a plan, which is the difference between a room and a car park.
  const W1X = 2.40, W1S = W1X - .06, W1N = W1X + .06;
  (function blockWall() {
    wall(W1S, Y + H / 2, 2.75, .90, H, -PI / 2, col.block, { gloss: .07, ...M4.cast });
    wall(W1N, Y + H / 2, 2.75, .90, H, PI / 2, col.block, { gloss: .07, ...M4.cast });
    box(W1X, Y + H - .04, 2.75, .13, .08, .90, col.mortar, { hard: true, gloss: .06 });
    // 加气块 is 600 × 200, so a recessed joint every 200 mm
    for (let i = 1; i <= 12; i++)
      for (const [px] of [[W1S - .008], [W1N + .008]])
        box(px, Y + i * .20, 2.75, .014, .016, .90, col.blockD, { hard: true, gloss: .05 });
    // the unfinished run: five courses laid, the sixth half laid, mortar wet on top of it
    const runZ0 = -0.40, runZ1 = 1.20, runC = (runZ0 + runZ1) / 2, runL = runZ1 - runZ0;
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 3; j++)
        box(W1X, Y + .02 + i * .20 + .10, runZ0 + .30 + j * .60, .12, .188, .58, col.block,
            { hard: true, gloss: .07, ...M4.cast, tag: '砖' });
    for (let j = 0; j < 2; j++)
      box(W1X, Y + 1.13, runZ0 + .30 + j * .60, .12, .188, .58, col.block,
          { hard: true, gloss: .07, ...M4.cast, tag: '砖' });
    box(W1X, Y + 1.235, runC, .128, .022, runL, col.mortar, { hard: true, gloss: .08 });
    // the line the bricklayer is working to, and the plumb bob hanging off the end of it
    box(W1X, Y + 1.44, runC, .008, .008, runL + .30, C('#d8cf9a'), { hard: true, gloss: .10 });
    cyl(W1X, Y + 1.20, runZ1 + .12, .009, .48, C('#d8cf9a'), { gloss: .10 });
    taper(W1X, Y + .90, runZ1 + .12, .030, .10, .030, C('#c8ac52'), { rx: PI, gloss: .48 });
    shade(W1X, runC, .40, runL + .30, .34);
    shade(W1X, 2.75, .40, .95, .30);
    // the tile samples taped up in a row on the face you see walking in
    const samples = [col.tile, col.tileE, col.tileB, C('#c8b89a')];
    for (let i = 0; i < samples.length; i++)
      box(W1N + .014, Y + 1.50, 2.75 + (i - 1.5) * .24, .012, .21, .21, samples[i],
          { hard: true, gloss: .44, ...MAT.tile, tag: '瓷砖' });
    for (let i = 0; i < samples.length; i++)
      box(W1N + .010, Y + 1.34, 2.75 + (i - 1.5) * .24, .008, .05, .10, C('#e6e0cf'),
          { hard: true, gloss: .06 });
  })();
  stop(W1S, W1N, 2.30, 3.20);
  stop(W1S, W1N, -0.40, 1.20);

  (function studWall() {
    // 轻钢龙骨 at 400 centres, a track top and bottom, and no board on it — the frame you can see
    // the next room through, which is the most 装修 thing in the flat after the chases.
    const sz = 0.40, oL = 4.30, oR = 5.30;
    for (const [ax, bx] of [[W1N, oL], [oR, X1]]) {
      box((ax + bx) / 2, Y + .025, sz, bx - ax, .05, .09, col.galv,
          { hard: true, gloss: .40, ...M4.metal });
      box((ax + bx) / 2, CY - .025, sz, bx - ax, .05, .09, col.galv,
          { hard: true, gloss: .40, ...M4.metal });
      for (let x = ax + .10; x < bx - .05; x += .40) {
        box(x, Y + H / 2, sz, .05, H - .05, .09, col.galv,
            { hard: true, gloss: .38, ...M4.metal, tag: '龙骨' });
        box(x, Y + 1.30, sz - .048, .05, .05, .012, col.steelD, { hard: true, gloss: .34 });
      }
      box((ax + bx) / 2, Y + 1.28, sz, bx - ax - .06, .045, .045, col.galv,
          { hard: true, gloss: .38, ...M4.metal });
    }
    for (const ox of [oL, oR])
      for (const s of [-1, 1])
        box(ox + s * .03, Y + H / 2, sz, .05, H - .05, .09, col.galv,
            { hard: true, gloss: .38, ...M4.metal });
    box((oL + oR) / 2, Y + 2.12, sz, oR - oL + .10, .06, .09, col.galv,
        { hard: true, gloss: .38, ...M4.metal });
    // three sheets of 石膏板 leaning against it, waiting to go on
    for (let i = 0; i < 3; i++)
      box(3.30 + i * .034, Y + 1.22, sz - .34 - i * .012, .028, 2.44, 1.18, C('#dcd6c6'),
          { hard: true, gloss: .10, rz: .07 + i * .006, tag: '石膏板' });
    shade(3.36, sz - .38, .40, 1.30, .34);
  })();
  stop(W1N, 4.30, 0.34, 0.46);
  stop(5.30, X1, 0.34, 0.46);
  stop(3.20, 3.48, -0.55, 0.34);

  // ---- the ceiling rose that was, and the wires that are. One light point in the middle of the
  // main space with its fitting off and its tails wrapped in tape, which is what every 装修 flat's
  // ceiling looks like from the first day to the last.
  box(-1.20, CY - .020, -1.00, .16, .028, .16, C('#c2bcb0'), { hard: true, gloss: .10 });
  for (const [o, c] of [[-.03, col.red], [.00, C('#3a3f44')], [.03, C('#6ea24f')]]) {
    cyl(-1.20 + o, CY - .10, -1.00, .006, .17, c, { rz: o * 3, gloss: .26, tag: '电线' });
    cyl(-1.20 + o, CY - .19, -1.00, .011, .05, C('#2f3338'), { gloss: .14 });
  }
  for (const [cx, cz] of [[1.30, 1.90], [-3.60, 1.40]]) {
    box(cx, CY - .020, cz, .13, .026, .13, C('#c2bcb0'), { hard: true, gloss: .10 });
    cyl(cx, CY - .10, cz, .010, .16, col.red, { rz: .2, gloss: .26 });
  }

  // ==================================================================== the work
  //
  // Everything a 装修 site keeps on the floor, placed so the hero lamp rakes across all of it and
  // so the walk from the doorway to the far corner is never blocked.

  const LX = -0.70, LZ = -0.90, LY = 1.52;
  (function workLamp() {
    // 500 W on a yellow tripod: one hard source, low, in a grey shell, and the whole reason this
    // floor is worth walking into.
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * PI * 2 + .4;
      cyl(LX + Math.sin(a) * .21, ST + .32, LZ + Math.cos(a) * .21, .014, .68, col.yellowD,
          { rz: Math.sin(a) * .30, rx: -Math.cos(a) * .30, gloss: .28, tag: '灯' });
      box(LX + Math.sin(a) * .34, ST + .012, LZ + Math.cos(a) * .34, .07, .022, .07, col.rubber,
          { hard: true, gloss: .16 });
    }
    cyl(LX, ST + .70, LZ, .026, .18, col.steelD, { gloss: .40 });
    cyl(LX, ST + 1.10, LZ, .020, .70, col.alu, { gloss: .44, tag: '灯' });
    const HY = ST + LY;
    box(LX, HY, LZ, .34, .21, .18, col.yellow, { gloss: .30, ry: -.55, tag: '灯' });
    box(LX + .055, HY, LZ + .080, .30, .17, .012, col.lampW,
        { hard: true, mode: 1, glow: .13, ry: -.55, gloss: .40, tag: '灯' });
    for (let i = -2; i <= 2; i++)
      box(LX + .062, HY + i * .038, LZ + .092, .30, .010, .010, col.steelX,
          { hard: true, gloss: .40, ry: -.55 });
    box(LX - .10, HY - .13, LZ - .05, .13, .10, .10, col.yellowD, { gloss: .26, ry: -.55 });
    // the yellow flex, snaking away across the screed
    let px = LX, pz = LZ;
    for (const [qx, qz] of [[-1.30, -1.50], [-1.90, -1.10], [-2.30, -0.30], [-2.05, 0.30]]) {
      const dx = qx - px, dz = qz - pz;
      cyl((px + qx) / 2, ST + .014, (pz + qz) / 2, .011, Math.hypot(dx, dz), col.yellow,
          { rx: PI / 2, ry: Math.atan2(dx, dz), gloss: .24, tag: '电线' });
      px = qx; pz = qz;
    }
    shade(LX, LZ, .82, .82, .40);
    // The pool it throws, painted: no renderer without global illumination will make one. Kept
    // low — at .30 and .22 the screed under it went to white paper and the lamp stopped reading
    // as a hard source at all, because there was nothing left for it to be brighter than.
    glow(Mx.trs(LX + .55, FL + .036, LZ + .70, 0, 4.60, 1, 4.20), C('#ffe6b4'), .16);
    glow(Mx.trs(LX + .20, FL + .042, LZ + .25, 0, 2.10, 1, 2.10), C('#fff0cd'), .13);
  })();
  stop(LX - .40, LX + .40, LZ - .40, LZ + .40);
  // The hero, and two much weaker fills so the far corners are grey rather than black. Three
  // modest lamps, not one enormous one.
  light(LX + .18, Y + LY + .02, LZ + .16, C('#fff1d2'), .92, 8.20);
  light(-4.30, Y + 1.05, 1.90, C('#e8ecec'), .18, 5.00);
  light(4.20, Y + 1.30, -2.20, C('#e6eaec'), .16, 4.60);

  // ---- 水泥 and 沙子: the two heaps every 装修 flat has, against the west wall where the lamp
  // catches them side-on.
  (function materials() {
    const bx = -5.05, bz = -3.50;
    for (let i = 0; i < 7; i++) {
      const row = Math.floor(i / 3), k = i % 3;
      box(bx + (k - 1) * .07, ST + .10 + row * .19, bz + (k - 1) * .30, .48, .19, .70, col.kraft,
          { gloss: .10, ry: (k - 1) * .07 + row * .04, tag: '水泥' });
      G(bx + (k - 1) * .07 + .25, ST + .10 + row * .19, bz + (k - 1) * .30, PI / 2, '水泥',
        { size: .088, gap: .018, color: col.kraftD });
    }
    box(bx - .10, ST + .58, bz - .12, .48, .16, .68, col.kraftD, { gloss: .10, ry: .18 });
    ball(bx + .06, ST + .52, bz - .48, .22, .09, .18, C('#a8a49b'), { gloss: .06 });
    ball(bx + .10, ST + .04, bz - .62, .30, .06, .24, C('#9d9a92'), { gloss: .05 });
    flat(bx + .10, FL + .018, bz - .66, .95, .80, C('#a5a29a'), { mode: 7, gloss: .04, alpha: .8 });
    shade(bx, bz, 1.35, 1.30, .40);

    // the sand, tipped straight onto the screed and shovelled at from one side
    const sx = -4.40, sz = 1.90;
    ball(sx, ST + .16, sz, .78, .34, .70, col.sand, { gloss: .06, tag: '沙子' });
    ball(sx + .30, ST + .10, sz - .34, .46, .20, .40, col.sandD, { gloss: .06, tag: '沙子' });
    ball(sx - .34, ST + .07, sz + .30, .38, .14, .34, col.sand, { gloss: .06, tag: '沙子' });
    flat(sx, FL + .012, sz, 2.10, 1.90, col.sandD, { mode: 7, gloss: .04, alpha: .62 });
    shade(sx, sz, 1.90, 1.75, .34);
    cyl(sx + .42, ST + .74, sz + .30, .017, 1.30, C('#9d7c4c'), { rz: .34, rx: -.14, gloss: .18 });
    box(sx + .68, ST + .12, sz + .40, .24, .30, .04, col.steel,
        { hard: true, gloss: .48, rz: .34, rx: -.14, tag: '工具' });
    cyl(sx + .18, ST + 1.36, sz + .14, .020, .13, C('#7d6440'), { rz: PI / 2 + .34, gloss: .2 });

    // The mortar tub, half full, with the trowel laid across the rim. Set well south of the sand:
    // the two colliders inflate to meet each other if they are on the same line across the room,
    // and between them they sealed the whole west half at z 1.7.
    const tx = -2.80, tz = 0.55;
    taper(tx, ST + .16, tz, .30, .32, .30, col.rubber, { rx: PI, gloss: .18, tag: '灰桶' });
    cyl(tx, ST + .32, tz, .335, .030, C('#3d4145'), { gloss: .22, tag: '灰桶' });
    cyl(tx, ST + .25, tz, .285, .022, C('#a6a49b'), { gloss: .12 });
    box(tx + .10, ST + .36, tz - .16, .22, .012, .10, col.steel,
        { hard: true, gloss: .55, ry: .5, tag: '工具' });
    box(tx + .24, ST + .39, tz - .22, .11, .035, .035, C('#6f5636'), { gloss: .18, ry: .5 });
    flat(tx, FL + .018, tz, 1.20, 1.10, C('#a9a69d'), { mode: 7, gloss: .05, alpha: .55 });
    shade(tx, tz, .78, .78, .38);
  })();
  stop(-5.70, -4.40, -4.15, -2.85);
  stop(-5.20, -3.60, 1.10, 2.70);
  stop(-3.18, -2.42, 0.17, 0.93);

  // ---- 瓷砖 in stacks. Tile on edge is one of the few genuinely vertical things in the room, so
  // it goes where it breaks up the long west run.
  (function tiles() {
    const tx = -1.30, tz = 2.50;
    for (let s = 0; s < 3; s++)
      for (let i = 0; i < 8; i++)
        box(tx - .34 + s * .34 + i * .022, ST + .31, tz, .020, .60, .60,
            i % 3 === 0 ? col.tileE : col.tile,
            { hard: true, gloss: .42, ...MAT.tile, ry: s * .04, tag: '瓷砖' });
    box(tx, ST + .015, tz, 1.20, .03, .70, col.pine, { hard: true, gloss: .14 });
    for (let i = 0; i < 9; i++)
      box(tx + .95, ST + .04 + i * .021, tz - .12, .62, .020, .62, i % 2 ? col.tile : col.tileE,
          { hard: true, gloss: .42, ...MAT.tile, ry: (i % 3 - 1) * .03, tag: '瓷砖' });
    box(tx + 1.16, ST + .32, tz + .46, .60, .60, .022, col.tileB,
        { hard: true, gloss: .48, ...MAT.tile, rx: .22, tag: '瓷砖' });
    shade(tx + .30, tz, 2.30, .95, .36);
  })();
  stop(-1.95, -0.05, 2.10, 2.95);

  // ---- the scaffold: two trestles and three boards, which is how a ceiling gets skimmed here.
  // A board at 1.05 m is also the only horizontal surface in the flat, so it is where the tools,
  // the thermos and the noodles have all ended up.
  (function scaffold() {
    const bz = -2.05, by = ST + 1.02;
    for (const tx of [-4.55, -2.55]) {
      for (const [sx, sz] of [[-.34, -.30], [.34, -.30], [-.34, .30], [.34, .30]])
        cyl(tx + sx * .55, ST + .50, bz + sz, .022, 1.00, col.steelD,
            { rz: -sx * .16, rx: -sz * .12, gloss: .40 });
      box(tx, ST + 1.00, bz, .80, .05, .16, col.steelD, { hard: true, gloss: .40 });
      box(tx, ST + .46, bz, .70, .035, .035, col.steelD, { hard: true, gloss: .40 });
      shade(tx, bz, .95, .80, .30);
    }
    for (let i = 0; i < 3; i++)
      box(-3.55, by + .022, bz - .30 + i * .30, 2.60, .042, .28, col.pine,
          { hard: true, gloss: .14, ...M4.timber, ry: (i - 1) * .006, tag: '架子' });
    for (let i = 0; i < 9; i++)
      box(-4.30 + i * .20, by + .046, bz - .30 + (i % 3) * .30, .10, .006, .09, C('#e2ded2'),
          { hard: true, gloss: .10, alpha: .8 });
    // the tools that live on it: a spirit level, a trowel, a tin of primer
    box(-2.95, by + .075, bz - .26, .62, .055, .09, col.yellow,
        { hard: true, gloss: .30, ry: .12, tag: '工具' });
    box(-2.95, by + .075, bz - .258, .20, .058, .05, C('#2b6f4a'),
        { hard: true, mode: 18, alpha: .7, gloss: .5, ry: .12 });
    box(-3.70, by + .062, bz + .02, .26, .030, .14, col.steel,
        { hard: true, gloss: .55, ry: -.3, tag: '工具' });
    box(-3.86, by + .085, bz + .06, .13, .040, .045, C('#6f5636'), { gloss: .18, ry: -.3 });
    cyl(-4.32, by + .12, bz - .18, .045, .20, C('#b03a2c'), { gloss: .34 });
    cyl(-4.32, by + .235, bz - .18, .030, .04, col.steel, { gloss: .5 });
    // the thermos and the bowl, on an upturned bucket beside the boards
    const kx = -2.10, kz = -2.60;
    taper(kx, ST + .15, kz, .32, .30, .32, C('#b03a2c'), { gloss: .28 });
    cyl(kx, ST + .30, kz, .118, .022, C('#8f2e22'), { gloss: .30 });
    cyl(kx - .05, ST + .44, kz + .02, .042, .26, C('#5f7f6a'), { gloss: .34, tag: '保温杯' });
    cyl(kx - .05, ST + .59, kz + .02, .036, .04, C('#c9c4b6'), { gloss: .30, tag: '保温杯' });
    cyl(kx + .12, ST + .35, kz - .04, .075, .08, C('#e6e0d2'), { gloss: .30, tag: '碗' });
    ball(kx + .12, ST + .40, kz - .04, .062, .015, .062, C('#d8c58f'), { gloss: .22 });
    for (const s of [-1, 1])
      cyl(kx + .16 + s * .012, ST + .46, kz - .10, .0045, .21, C('#d8c9a8'),
          { rz: .34, ry: .6 + s * .1, gloss: .18 });
    shade(kx, kz, .46, .46, .34);
  })();
  stop(-5.30, -1.80, -2.55, -1.55);

  // ---- 人字梯, the step ladder, open and standing where the lamp throws the longest shadow off it.
  (function ladder() {
    const lx = 0.75, lz = 1.05, LH = 1.86, spread = .42;
    for (const s of [-1, 1])
      for (const o of [-.20, .20])
        cyl(lx + s * spread / 2, ST + LH / 2, lz + o, .022, LH, col.alu,
            { rz: -s * .12, gloss: .46, ...M4.metal, tag: '梯子' });
    for (let i = 1; i <= 5; i++) {
      box(lx - spread / 2 + .02, ST + i / 6 * LH, lz, .30, .030, .42, col.alu,
          { hard: true, gloss: .44, ...M4.metal, tag: '梯子' });
      if (i % 2 === 0)
        box(lx + spread / 2 - .02, ST + i / 6 * LH, lz, .12, .026, .40, col.alu,
            { hard: true, gloss: .44, ...M4.metal });
    }
    box(lx, ST + LH + .02, lz, spread + .18, .045, .46, col.alu,
        { hard: true, gloss: .42, ...M4.metal, tag: '梯子' });
    cyl(lx + .10, ST + LH + .12, lz + .10, .085, .16, C('#d9d4c6'), { gloss: .30, tag: '油漆' });
    cyl(lx + .10, ST + LH + .21, lz + .10, .080, .012, C('#e8e4d8'), { gloss: .20 });
    cyl(lx - .14, ST + LH + .07, lz - .12, .034, .21, C('#c9c2ae'), { rz: PI / 2, gloss: .16 });
    // a 安全帽 hooked over the top, because it is always hooked over something
    ball(lx - .06, ST + LH + .14, lz + .22, .105, .085, .115, col.yellow,
         { gloss: .30, tag: '安全帽' });
    box(lx - .06, ST + LH + .07, lz + .22, .24, .022, .26, col.yellowD,
        { hard: true, gloss: .26, tag: '安全帽' });
    shade(lx, lz, .78, .62, .40);
  })();
  stop(0.30, 1.20, 0.60, 1.50);

  // ---- 油漆 and the dust sheets. The pails are under the window where the light off the screed
  // catches the white of them; the sheet is over whatever was worth keeping.
  (function paintAndSheets() {
    const px = 1.55, pz = -3.55;
    for (let i = 0; i < 4; i++) {
      const r = i < 3 ? 0 : 1, ox = (i % 3 - 1) * .34, oz = (i % 2) * .22;
      cyl(px + ox, ST + .16 + r * .32, pz + oz, .155, .32,
          i === 1 ? C('#d8d2c2') : C('#e2ded2'), { gloss: .28, tag: '油漆' });
      cyl(px + ox, ST + .325 + r * .32, pz + oz, .150, .020, C('#c2bcae'),
          { gloss: .22, tag: '油漆' });
      if (i !== 1)
        box(px + ox, ST + .17 + r * .32, pz + oz - .157, .20, .13, .012, C('#b9c7d2'),
            { hard: true, gloss: .18 });
    }
    // one open, with the brush across it and a run of white down the side of the pail
    cyl(px - .34, ST + .345, pz + .22, .145, .016, C('#efece2'), { gloss: .30 });
    box(px - .30, ST + .38, pz + .16, .17, .022, .05, C('#a8794a'), { hard: true, gloss: .22 });
    flat(px - .10, FL + .018, pz + .06, 1.30, 1.10, C('#ded9cc'),
         { mode: 7, gloss: .06, alpha: .55 });
    shade(px, pz + .10, 1.30, 1.00, .38);

    // the dust sheet over a heap — a stripped 暖气片 and the old skirting, by the shape of it
    const sx = 2.85, sz = -2.10;
    ball(sx, ST + .30, sz, .70, .32, .48, col.sheet, { gloss: .06, tag: '塑料布' });
    ball(sx + .48, ST + .20, sz + .30, .46, .22, .34, col.sheet, { gloss: .06, tag: '塑料布' });
    box(sx - .20, ST + .12, sz - .40, 1.30, .24, .30, col.sheet,
        { gloss: .06, ry: .2, tag: '塑料布' });
    for (const o of [-.30, .10, .50])
      box(sx + o, ST + .58, sz + o * .2, .10, .018, .90, C('#c6c1b3'),
          { hard: true, gloss: .05, ry: .12 });
    shade(sx + .10, sz, 2.10, 1.50, .36);

    // Rolls of 防水 membrane and a coil of 电线. Both are hard against a wall rather than in the
    // middle of the 玄关: the walk in from the doorway runs due south along x 3.90 and the body is
    // 0.60 m wide to `clampMove`, so anything left in that lane seals the flat. It did, once.
    for (let i = 0; i < 3; i++)
      cyl(2.66 + i * .04, ST + .18, 2.70 - i * .17, .175, .94, C('#3b4048'),
          { rx: PI / 2, rz: .10, gloss: .18 });
    for (let i = 0; i < 5; i++)
      cyl(5.10, ST + .06 + i * .022, 2.30, .155 - i * .012, .020,
          i % 2 ? C('#b5382a') : C('#2f5f9b'), { gloss: .30, tag: '电线' });
    shade(2.72, 2.55, .60, 1.15, .34);
    shade(5.10, 2.30, .42, .42, .30);
  })();
  stop(0.95, 2.15, -3.95, -3.10);
  stop(1.95, 3.70, -2.85, -1.35);
  stop(2.48, 2.92, 2.15, 3.20);
  stop(4.90, 5.30, 2.10, 2.50);

  // ---- dust in the air. Four faint slabs standing across the beam were tried here and taken out
  // again, and the reason is worth keeping: every translucent prop in this building is drawn over
  // every deck of it (see ticket 4 at the foot of this file), so a 1.3 m emissive haze panel on
  // floor 10 is also a 1.3 m haze panel across floors 3 and 11. The dust is carried by the pool on
  // the floor and by the drifts on the landing instead, both of which are opaque.
  //
  // What does stand in the beam is real: the flex, the tripod legs and the ladder, all of which
  // throw a hard shadow off a single low source, which is what this floor is lit for.

  // ==================================================================== the landing's fixtures
  //
  // 楼梯, 安全出口 and 消防栓 — the three things `HOME_SHARED_USE` in js/game.js offers an action
  // for on any deck, and the three this floor was the only one of the ten to carry none of. A
  // Beijing landing with no green sign does not exist, and a floor mid-装修 is precisely the one
  // the 物业 come and check.
  //
  // Built at F9's coordinates, one storey down. A stair that moves between floors is not a stair,
  // and the whole point of eleven landings on one footprint is that the player learns where things
  // are once. F9's run is at x = X1, z = 4.60, so this one is too.

  // ---- 楼梯间, surface-mounted on the east wall. The door never opens — deck 11 is somebody
  // else's file — so it wants no hole behind it and no collider beyond the wall's own.
  const SZ = 4.60, SW = .95, STH = 2.06, sf = d => X1 - d;
  for (const s of [-1, 1])
    box(sf(.045), Y + (STH + .07) / 2, SZ + s * (SW / 2 + .035), .09, STH + .07, .07, col.steelD,
        { hard: true, gloss: .30, ...M4.metal });
  box(sf(.045), Y + STH + .035, SZ, .09, .07, SW + .14, col.steelD,
      { hard: true, gloss: .30, ...M4.metal });
  box(sf(.030), Y + (STH - .04) / 2, SZ, .06, STH - .04, SW - .05, C('#9aa0a2'),
      { hard: true, gloss: .26, tag: '楼梯', ...M4.metal });
  box(sf(.062), Y + 1.34, SZ, .012, .70, SW - .17, C('#8b9294'), { hard: true, gloss: .24 });
  box(sf(.075), Y + 1.02, SZ - .30, .05, .05, .40, col.steelX, { hard: true, gloss: .5 });
  cyl(sf(.098), Y + 1.02, SZ - .30, .020, .09, col.steel, { rx: PI / 2, gloss: .55 });
  G(sf(.066), Y + 1.72, SZ, -PI / 2, '安全出口', { size: .085, gap: .016, color: C('#1e7a45') });
  G(sf(.066), Y + .62, SZ, -PI / 2, '禁止堆放杂物', { size: .056, gap: .012, color: col.redD });
  // The dust the 装修 has put on this door too, and the smear where a hand pushed it open.
  box(sf(.058), Y + .20, SZ, .010, .34, SW - .14, col.dust, { hard: true, gloss: .03, alpha: .42 });
  box(sf(.058), Y + 1.02, SZ - .28, .010, .22, .26, col.dust,
      { hard: true, gloss: .03, alpha: .22 });
  // and the green box over it, on the emissive path so it reads without behaving like a lamp
  box(X1 - .035, Y + STH + .19, SZ, .06, .155, .40, C('#1e7a45'),
      { hard: true, gloss: .26, tag: '安全出口' });
  box(X1 - .068, Y + STH + .19, SZ, .006, .125, .365, C('#4ec489'),
      { hard: true, mode: 1, glow: .14, tag: '安全出口' });
  box(X1 - .068, Y + STH + .19, SZ - .155, .006, .085, .055, C('#dff3e6'),
      { hard: true, mode: 1, glow: .14, tag: '安全出口' });
  G(X1 - .068, Y + STH + .19, SZ + .04, -PI / 2, '安全出口',
    { size: .086, gap: .012, color: col.white, mode: 1, glow: .16 });

  // ---- 消火栓, on the landing face of the partition at the west end, where the run of wall is
  // clear of every front door. One cabinet, one hose, one extinguisher, one collider.
  const FHX = -5.30, FHZ = PN + .11;
  box(FHX, Y + 1.14, FHZ, .70, 1.00, .22, col.red, { hard: true, gloss: .30, tag: '消防栓' });
  box(FHX, Y + 1.14, FHZ + .112, .60, .90, .010, C('#82251b'), { hard: true, gloss: .34, tag: '消防栓' });
  box(FHX - .01, Y + 1.20, FHZ + .118, .40, .58, .008, C('#3d4a4e'),
      { hard: true, gloss: .62, alpha: .55 });
  cyl(FHX - .01, Y + 1.20, FHZ + .06, .17, .12, C('#8c1f18'), { rx: PI / 2, gloss: .18 });
  cyl(FHX - .01, Y + 1.20, FHZ + .09, .07, .07, col.redD, { rx: PI / 2, gloss: .3 });
  cyl(FHX + .24, Y + .82, FHZ + .10, .055, .022, col.steelD, { rx: PI / 2, gloss: .5 });
  box(FHX + .29, Y + 1.62, FHZ + .112, .10, .10, .006, C('#e8dfc6'), { hard: true, gloss: .10 });
  G(FHX, Y + 1.76, FHZ + .112, 0, '消火栓', { size: .115, gap: .022, color: col.white });
  G(FHX, Y + .70, FHZ + .112, 0, '火警119', { size: .058, gap: .012, color: C('#dca42a') });
  // The extinguisher beside it, and the film of building dust that has settled on both.
  cyl(FHX + .52, FL + .27, FHZ + .06, .075, .48, col.red, { gloss: .34, tag: '消防栓' });
  taper(FHX + .52, FL + .55, FHZ + .06, .15, .10, .15, col.red, { gloss: .34 });
  cyl(FHX + .52, FL + .63, FHZ + .06, .020, .09, col.steelD, { gloss: .5 });
  box(FHX + .52, FL + .30, FHZ + .135, .11, .16, .012, col.white, { hard: true, gloss: .1 });
  box(FHX, Y + .70, FHZ + .118, .68, .16, .006, col.dust, { hard: true, gloss: .02, alpha: .40 });
  shade(FHX + .52, FHZ + .06, .24, .24, .28);
  shade(FHX, FHZ, .78, .34, .26, FL + .010);
  stop(FHX - .38, FHX + .38, PN, PN + .24);
  stop(FHX + .40, FHX + .64, PN, PN + .20);

  // ---- 建筑垃圾, bagged and stacked against the landing wall between the hydrant and the lift.
  // This is what the 物业 argue about: the bags are supposed to go down the same evening and they
  // never do. Woven polypropylene, half of them split, all of them grey.
  for (const [bx, bz, br, bh, bc] of [[-4.10, PN + .26, .10, .40, '#c8c2ae'],
                                      [-3.72, PN + .22, -.22, .34, '#bdb9a6'],
                                      [-4.30, PN + .60, .38, .30, '#c4bfae'],
                                      [-3.44, PN + .55, -.05, .26, '#b6b2a0']]) {
    taper(bx, FL + bh / 2, bz, .46, bh, .40, C(bc), { gloss: .10, ry: br, mode: 7 });
    box(bx, FL + bh - .015, bz, .30, .05, .24, C(bc), { hard: true, gloss: .08, ry: br });
    cap(bx, FL + bh + .03, bz, .020, .16, .020, C('#8d8878'), { rz: PI / 2, ry: br, gloss: .12 });
    shade(bx, bz, .62, .56, .34, FL + .008);
  }
  box(-3.90, FL + .10, PN + .95, .70, .20, .34, C('#8f8a7a'), { hard: true, gloss: .06, ry: .18 });
  for (let i = 0; i < 4; i++)
    box(-3.90 + (i % 2 ? .16 : -.14), FL + .215 + i * .012, PN + .95 + (i - 1.5) * .04,
        .30, .012, .22, i % 2 ? C('#b8b2a0') : C('#a9a392'), { hard: true, gloss: .10, ry: i * .5 });
  shade(-3.90, PN + .95, .90, .52, .30, FL + .008);
  stop(-4.55, -3.20, PN, PN + .82);
  thing('垃圾', -3.90, Y + .50, PN + .78, '装修垃圾还堆在楼道里。',
    'The building waste is still piled in the corridor.',
    '垃圾 lājī — rubbish. 建筑垃圾 is what comes out of a flat being gutted.',
    { focus: [-3.90, PN + 1.35], reach: 2.0, tag: '垃圾' });

  // ---- 石膏板 and 木方, leaning on the west wall inside the flat: the next stage, delivered and
  // not started. Board on edge is the only genuinely vertical thing in a room this far apart.
  for (let i = 0; i < 5; i++)
    box(X0 + .16 + i * .028, Y + .82, -2.20, .022, 1.62, 1.20, i % 2 ? C('#d8d2c2') : C('#cdc6b4'),
        { hard: true, gloss: .10, rz: .055 });
  box(X0 + .30, Y + .015, -2.20, .34, .03, 1.24, col.plyD, { hard: true, gloss: .12, ...M4.timber });
  for (let i = 0; i < 6; i++)
    box(X0 + .58, Y + .06 + i * .052, -2.10 + (i % 2) * .05, .05, .05, 1.90, col.pine,
        { hard: true, gloss: .14, ry: (i % 3 - 1) * .012, ...M4.timber });
  shade(X0 + .40, -2.20, .70, 1.50, .34);
  stop(X0, X0 + .72, -3.15, -1.25);
  thing('石膏板', X0 + .24, Y + 1.30, -2.20, '石膏板还靠在墙上没上。',
    'The plasterboard is still leaning against the wall.',
    '石膏 plaster + 板 board. 吊顶 diàodǐng — the false ceiling it is going up as.',
    { focus: [X0 + 1.10, -2.20], reach: 2.0, tag: '石膏板' });

  // ==================================================================== the crew, and the clock
  //
  // 装修队. Every trace of a crew was already on this floor — the runner, the permit, the 500 W
  // lamp, the scaffold, the ladder — and no crew, which made 231 draws of worksite read as an
  // abandoned one. Two men actually standing here are lane 8's roster rows to add and mine to make
  // room for; what belongs in a scene file is everything the two of them put down when they
  // stopped for lunch, and that is what this is.
  //
  // All of it is inside the flat, off the walking lane, and none of it is a collider except the
  // bench: a player who cannot walk through a worksite cannot see the worksite.
  (function crew() {
    const KX = -1.60, KZ = -4.10;
    // The bench they sit on: a scaffold board across two paint pails, which is every site in China.
    for (const s of [-1, 1]) {
      cyl(KX + s * .62, ST + .17, KZ, .155, .34, C('#c7b489'), { gloss: .28 });
      cyl(KX + s * .62, ST + .345, KZ, .158, .02, C('#a8946c'), { hard: true, gloss: .22 });
    }
    box(KX, ST + .375, KZ, 1.70, .035, .27, col.ply, { hard: true, gloss: .16, ...M4.timber });
    shade(KX, KZ, 1.90, .50, .34, ST + .006);
    stop(KX - .88, KX + .88, KZ - .20, KZ + .20);
    // Two hi-vis jackets, one over the end of the bench and one dropped on the floor. The colour
    // is the whole read: nothing else on this floor is this saturated except the conduit.
    box(KX + .74, ST + .43, KZ + .02, .40, .12, .30, C('#d8a520'), { gloss: .10, ry: .18 });
    box(KX + .80, ST + .26, KZ + .10, .22, .34, .24, C('#d8a520'), { gloss: .10, rz: .12 });
    for (const s of [-1, 1])
      box(KX + .74, ST + .455, KZ + s * .11, .38, .035, .05, C('#d9d6c8'),
          { hard: true, gloss: .38, mode: 1, glow: .05, ry: .18 });
    box(KX - 1.20, ST + .05, KZ + .34, .52, .07, .42, C('#c99a1e'), { gloss: .10, ry: -.42 });
    box(KX - 1.20, ST + .075, KZ + .34, .40, .030, .06, C('#d9d6c8'),
        { hard: true, gloss: .38, mode: 1, glow: .04, ry: -.42 });
    shade(KX - 1.20, KZ + .34, .70, .58, .30, ST + .004);
    // Two pairs of boots under the bench, one pair still upright and one kicked over.
    for (const s of [-1, 1])
      cap(KX - .30 + s * .10, ST + .055, KZ - .30, .085, .075, .26, C('#3a352e'),
          { ry: s * .09, gloss: .16 });
    cap(KX + .18, ST + .075, KZ - .34, .085, .26, .075, C('#3f3a32'),
        { rz: PI / 2, ry: .5, gloss: .16 });
    cap(KX + .32, ST + .075, KZ - .26, .085, .26, .075, C('#3f3a32'),
        { rz: PI / 2, ry: .8, gloss: .16 });
    shade(KX, KZ - .30, .95, .30, .30, ST + .004);
    // A second 安全帽 on the bench beside the first one hanging on the ladder, and the gloves.
    ball(KX - .52, ST + .48, KZ - .02, .115, .085, .115, C('#dca42a'), { gloss: .30 });
    cyl(KX - .52, ST + .40, KZ - .02, .128, .022, C('#c08e18'), { hard: true, gloss: .28 });
    for (const s of [-1, 1])
      box(KX - .18 + s * .07, ST + .40, KZ + .06, .10, .022, .19, C('#9d8c66'),
          { hard: true, gloss: .08, ry: s * .22 });
    // Lunch: two 一次性 foam boxes, a pair of chopsticks and the tea flask's twin.
    for (const [bx, br] of [[KX + .10, .06], [KX + .34, -.14]]) {
      box(bx, ST + .425, KZ + .05, .22, .07, .16, C('#e6e2d6'), { hard: true, gloss: .14, ry: br });
      box(bx, ST + .462, KZ + .05, .21, .012, .15, C('#d8d3c2'), { hard: true, gloss: .18, ry: br });
    }
    for (const s of [-1, 1])
      cap(KX + .22 + s * .012, ST + .475, KZ + .18, .006, .21, .006,
          C('#c9b183'), { rz: PI / 2, ry: .22 + s * .06, gloss: .18 });
    cyl(KX - .82, ST + .105, KZ + .12, .042, .21, C('#2f6f8e'), { gloss: .34 });
    cyl(KX - .82, ST + .225, KZ + .12, .044, .04, C('#b8bcc0'), { gloss: .5 });
    // The site radio, which is the only thing on this floor that is not grey and not broken.
    box(KX + .96, ST + .49, KZ - .16, .26, .16, .11, C('#3a3d42'), { hard: true, gloss: .26 });
    cyl(KX + .90, ST + .49, KZ - .217, .052, .012, C('#7d848a'), { rx: PI / 2, gloss: .40 });
    cyl(KX + 1.05, ST + .50, KZ - .217, .020, .012, C('#b8482f'),
        { rx: PI / 2, mode: 1, glow: .07, gloss: .40 });
    cap(KX + 1.07, ST + .70, KZ - .16, .006, .38, .006, col.steel, { rz: -.22, gloss: .5 });
    // 烟头. Nobody has swept up, because the sweeping is the last day.
    for (let i = 0; i < 5; i++)
      cap(KX - .55 + i * .28, ST + .006, KZ - .62 + (i % 3) * .12, .008, .046, .008,
          i % 2 ? C('#e4dfcc') : C('#c8a86a'), { rz: PI / 2, ry: i * 1.1, gloss: .06 });
    // 墨斗 the chalk-line reel that snapped every line on these walls, and the tape beside it.
    box(KX + .58, ST + .43, KZ + .16, .13, .09, .10, C('#2f3236'), { hard: true, gloss: .22, ry: .3 });
    cyl(KX + .58, ST + .43, KZ + .105, .034, .014, C('#3f5f9b'), { rx: PI / 2, gloss: .30 });
    cap(KX + .44, ST + .395, KZ + .22, .006, .30, .006, C('#3f5f9b'),
        { rz: PI / 2, ry: .8, gloss: .10 });
    ball(KX + .40, ST + .40, KZ + .30, .028, .026, .028, C('#c7c1ae'), { gloss: .16 });
    thing('工人', KX, Y + .62, KZ + .34, '装修队的师傅在这儿吃饭。',
      'The renovation crew eat their lunch here.',
      '工人 gōngrén — a worker. 师傅 shīfu is what you actually call one to his face.',
      { focus: [KX, KZ + .95], reach: 2.0, tag: '工人' });
  })();

  // ---- 电钻 the drill, on the floor by the chase it cut, with its case open beside it. This is
  // the object the whole floor is heard as: `HomeF10.noiseAt(minutes, day)` at the top of this file
  // answers whether it is running, F9 and F11 render their notices off the same call, and one line
  // in js/game.js's fixture block turns it into a sound (ticket 6 at the foot of this file).
  (function drill() {
    const RX = -4.10, RZ = -0.90;
    box(RX, ST + .075, RZ, .21, .15, .30, C('#2f3236'), { hard: true, gloss: .30, ry: .34 });
    box(RX + .04, ST + .075, RZ - .16, .13, .13, .13, C('#d8a520'), { hard: true, gloss: .26, ry: .34 });
    cyl(RX + .10, ST + .10, RZ + .21, .026, .19, col.steel, { rx: PI / 2, gloss: .55, ry: .34 });
    cap(RX + .10, ST + .10, RZ + .40, .009, .22, .009, C('#8e949a'), { rx: PI / 2, gloss: .55 });
    cyl(RX - .02, ST + .045, RZ - .06, .028, .09, C('#3d4045'), { gloss: .24 });
    cap(RX - .40, ST + .020, RZ + .30, .014, .96, .014, C('#2b2e31'),
        { rz: PI / 2, ry: .8, gloss: .18 });
    box(RX - .62, ST + .045, RZ - .28, .46, .09, .34, C('#b8412c'), { hard: true, gloss: .22, ry: -.26 });
    box(RX - .62, ST + .095, RZ - .28, .42, .012, .30, C('#2f3236'), { hard: true, gloss: .12, ry: -.26 });
    for (let i = 0; i < 4; i++)
      cap(RX - .74 + i * .075, ST + .105, RZ - .28, .010, .19, .010, C('#9aa0a6'),
          { rz: PI / 2, ry: -.26, gloss: .5 });
    shade(RX, RZ, .60, .60, .34, ST + .004);
    shade(RX - .62, RZ - .28, .58, .46, .30, ST + .004);
    thing('电钻', RX, Y + .34, RZ + .30, '电钻放在地上，还插着电。',
      'The drill is on the floor, still plugged in.',
      '电 electricity + 钻 to bore. 打眼 dǎ yǎn is what a 师傅 calls using it.',
      { focus: [RX + .90, RZ + .30], reach: 1.8, tag: '电钻' });
  })();

  // ---- 水平仪 on its tripod in the middle of the room, switched off. The one tool on this floor
  // that is worth more than the man using it, which is why it goes home in the van every night.
  (function level() {
    const VX = 2.20, VZ = 0.95;
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 + .4;
      cap(VX + Math.cos(a) * .21, ST + .43, VZ + Math.sin(a) * .21, .016, .90, .016, C('#c9cdd2'),
          { rz: -Math.cos(a) * .21, rx: Math.sin(a) * .21, gloss: .48 });
      box(VX + Math.cos(a) * .34, ST + .012, VZ + Math.sin(a) * .34, .05, .024, .05, col.rubber,
          { hard: true, gloss: .16 });
    }
    cyl(VX, ST + .90, VZ, .045, .10, C('#7d848a'), { gloss: .5 });
    box(VX, ST + 1.02, VZ, .16, .18, .15, C('#d8a520'), { hard: true, gloss: .28 });
    box(VX, ST + 1.05, VZ - .078, .10, .07, .008, C('#3a3d42'), { hard: true, gloss: .5 });
    shade(VX, VZ, .70, .70, .30, ST + .004);
    thing('水平仪', VX, Y + 1.10, VZ - .32, '水平仪架在屋子中间。',
      'The laser level is on its tripod in the middle of the room.',
      '水平 level + 仪 instrument. 打线 dǎ xiàn — to shoot the lines it draws on the wall.',
      { focus: [VX, VZ - .95], reach: 1.8, tag: '水平仪' });
  })();

  // ---- 切割机, the wet tile saw on its folding stand, parked over the tile stacks with its blade
  // guard up and a bucket under the outfall. It is the loudest object in the building and the
  // reason the notice opposite asks for the middle of the day off.
  (function tileSaw() {
    const WX = -0.95, WZ = 2.30;
    for (const s of [-1, 1]) {
      cap(WX + s * .38, ST + .28, WZ - .16, .022, .58, .022, col.steelX, { rx: -.16, gloss: .5 });
      cap(WX + s * .38, ST + .28, WZ + .16, .022, .58, .022, col.steelX, { rx: .16, gloss: .5 });
      box(WX + s * .38, ST + .010, WZ, .07, .02, .40, col.rubber, { hard: true, gloss: .18 });
    }
    box(WX, ST + .57, WZ, 1.00, .05, .44, col.steel, { hard: true, gloss: .40, ...M4.metal });
    box(WX, ST + .615, WZ, .92, .04, .36, C('#c3c8cc'), { hard: true, gloss: .46, ...M4.metal });
    box(WX + .30, ST + .70, WZ, .22, .14, .26, C('#d8a520'), { hard: true, gloss: .26 });
    cyl(WX + .06, ST + .70, WZ, .105, .012, C('#7d848a'), { rz: PI / 2, gloss: .60 });
    taper(WX + .12, ST + .74, WZ, .30, .16, .22, C('#c99a1e'), { hard: true, gloss: .24, rz: -.5 });
    cap(WX - .40, ST + .66, WZ - .17, .012, .34, .012, col.rubber, { rz: PI / 2, gloss: .20 });
    cyl(WX - .52, ST + .12, WZ - .30, .105, .24, C('#3f6f8e'), { gloss: .26 });
    cyl(WX - .52, ST + .23, WZ - .30, .095, .02, C('#8d9a86'), { hard: true, gloss: .34, alpha: .8 });
    for (let i = 0; i < 3; i++)
      box(WX - .18 + i * .16, ST + .645, WZ + .04, .13, .012, .13, col.tile,
          { hard: true, gloss: .26, ry: i * .3 });
    flat(WX, FL + .004, WZ - .46, 1.30, .70, C('#a49f90'), { mode: 7, gloss: .05, alpha: .55 });
    shade(WX, WZ, 1.30, .70, .40);
    stop(WX - .60, WX + .60, WZ - .30, WZ + .30);
    thing('切割机', WX, Y + .90, WZ - .34, '切割机就摆在瓷砖旁边。',
      'The tile saw is set up next to the tiles.',
      '切 to cut + 割 to sever + 机 machine. 切砖 is what it does all afternoon.',
      { focus: [WX, WZ - 1.00], reach: 1.9, tag: '切割机' });
  })();

  // ---- 竣工日期, added to the permit. The sheet already printed the hours and no end, so the
  // floor was permanently mid-gut: nothing about it on day 90 was different from day 4. The date
  // comes off `HomeF10.RENO_HOURS.doneDay`, which is also what silences `noiseAt` when the clock
  // passes it, so the sign and the sound cannot drift apart.
  box(NX, Y + 1.20, NZ + .004, .40, .10, .006, C('#e0d6bd'), { hard: true, gloss: .05, ry: -.015 });
  G(NX - .09, Y + 1.20, NZ + .016, 0, '竣工', { size: .034, gap: .007, color: col.grey });
  G(NX + .07, Y + 1.20, NZ + .016, 0, HomeF10.RENO_HOURS.doneHz,
    { size: .026, gap: .005, color: col.ink });
  // and the progress chart the 队长 keeps beside it: five stages, the first three struck through.
  box(NX + .52, Y + 1.10, NZ, .30, .40, .014, C('#e9e4d2'), { hard: true, gloss: .05, ry: .03 });
  G(NX + .52, Y + 1.25, NZ + .012, 0, '施工进度', { size: .036, gap: .008, color: col.redD });
  for (let i = 0; i < 5; i++) {
    const gy = Y + 1.16 - i * .058;
    G(NX + .46, gy, NZ + .012, 0, ['拆除', '水电', '防水', '瓦工', '油工'][i],
      { size: .028, gap: .006, color: i < 3 ? col.grey : col.ink });
    if (i < 3)
      box(NX + .46, gy, NZ + .014, .13, .006, .004, col.redD, { hard: true, gloss: .04 });
    else
      box(NX + .615, gy, NZ + .014, .028, .028, .004, C('#cfc8b2'), { hard: true, gloss: .06 });
  }

  // ==================================================================== the zones
  //
  // Walkable space. `clampMove` keeps the body inside the union of these and `A.stop` carves them,
  // so this is one rectangle per room plus one straddling the doorway — without that last one the
  // flat and the landing are two regions that merely touch: you can see through the opening and
  // never walk through it. `setFloor(10)` refuses this deck outright if none of these is here.
  A.zone({ id: 'f10corr', x0: X0, x1: X1, z0: ZM, z1: ZN, light: [0.60, Y + H - .34, 4.10] });
  A.zone({ id: 'f10', x0: X0, x1: X1, z0: ZS, z1: ZM, light: [LX + .20, Y + LY + .10, LZ + .20] });
  A.zone({ id: 'f10door', x0: DL, x1: DR, z0: ZM - .70, z1: ZM + .70,
           light: [DX, Y + H - .40, ZM] });
  // The room box `R.setRoom` measures ambient and the camera's wall clearance against. Left alone
  // it would be the flat's on deck 2 — 5.70 — which is twenty-two metres below this floor, and the
  // whole deck would shade as though it were pressed flat against a ceiling.
  A.deckH(CY);

  // ==================================================================== the words
  //
  // Every focus below stands in genuinely clear floor, and every reused tag is metres away in x/z
  // from the same tag on deck 2 — `pick` resolves a tag to the *nearest* thing wearing it and the
  // comparison is 2-D, so a 通知 up here at x 5.16 and one downstairs at x -0.95 never collide.
  TH('装修', 0.60, Y + 1.30, 0.20, '这套房子正在装修。', 'This flat is being renovated.',
     '装 to fit out + 修 to repair. 装修 is the whole job — walls, wiring, tiling, paint.',
     1.60, 0.60, 3.6);
  TH('水泥', -5.05, Y + .45, -3.50, '墙边堆着几袋水泥。',
     'Some bags of cement are stacked against the wall.',
     '水 water + 泥 mud. 一袋水泥 is one bag of it.', -4.00, -3.30, 2.2);
  TH('沙子', -4.40, Y + .30, 1.90, '地上倒了一堆沙子。', 'A heap of sand is tipped on the floor.',
     '沙 sand + 子, the noun ending. 沙子和水泥 mixed together make 砂浆.', -3.10, 1.70, 2.2);
  TH('瓷砖', -1.30, Y + .55, 2.50, '瓷砖还没贴上去。', 'The tiles have not gone up yet.',
     '瓷 porcelain + 砖 brick. 贴瓷砖 is to lay tile.', -1.20, 1.75, 2.1);
  TH('电线', X0 + .10, Y + 1.34, -1.60, '墙上的电线还露在外面。',
     'The wires are still hanging out of the wall.',
     '电 electricity + 线 line, thread. 电线管 is the conduit it runs in.', -4.90, -0.90, 2.3);
  TH('梯子', 0.75, Y + 1.20, 1.05, '房间中间放着一把梯子。',
     'A step ladder is standing in the middle of the room.',
     '梯 is the 梯 of 楼梯 and of 电梯 — a ladder, a stair, a lift.', 1.75, 1.20, 2.0);
  TH('油漆', 1.55, Y + .40, -3.55, '几桶油漆还没开。', 'Several tins of paint are still unopened.',
     '油 oil + 漆 lacquer. 刷油漆 is to paint a wall.', 1.60, -2.70, 2.1);
  TH('工具', -2.95, Y + 1.14, -2.31, '工具都放在架子上。', 'The tools are all left up on the boards.',
     '工 work + 具 implement. 一件工具, one tool.', -2.90, -1.05, 2.3);
  TH('灰桶', -2.80, Y + .38, 0.55, '灰桶里还有半桶灰。', 'The tub is still half full of mortar.',
     '灰 ash, mortar + 桶 bucket — what the 瓦工 mixes in.', -1.85, 0.55, 2.0);
  TH('塑料布', 2.85, Y + .45, -2.10, '东西上盖着塑料布。', 'A plastic sheet covers the things.',
     '塑料 plastic + 布 cloth. The 布 that covers everything for a month.', 1.50, -2.10, 2.2);
  TH('门帘', DX, Y + 1.20, ZM - .12, '门口挂着一道塑料门帘。', 'A plastic curtain hangs in the doorway.',
     '门 door + 帘 hanging screen. It keeps the dust on one side of it.', DX, ZM + .30, 1.7);
  TH('窗户', (W1x[0] + W1x[1]) / 2, Y + 1.55, ZS + .10, '窗户上还贴着保护膜。',
     'The windows still have their protective film on.',
     '窗 window + 户 door-leaf; together, the fitting.', -2.40, -3.60, 2.3);
  TH('安全帽', 0.69, Y + 1.95, 1.27, '梯子上挂着一顶安全帽。', 'A hard hat hangs on the ladder.',
     '安全 safe + 帽 hat.', 1.75, 1.20, 2.1);
  TH('保温杯', -2.15, Y + .52, -2.58, '师傅的保温杯放在桶上。',
     "The workman's flask is standing on an upturned bucket.",
     '保温 to keep warm + 杯 cup. Everybody on a site here carries one.', -1.35, -2.58, 1.9);
  TH('装修许可证', NX, Y + 1.56, PN + .04, '门口贴着装修许可证。',
     'The renovation permit is taped up by the door.',
     '许可证 is a permit: 许可 to permit + 证 certificate.', NX, 3.85, 1.8);
  TH('通知', NX + .52, Y + 1.50, PN + .04, '邻居贴了一张通知。', 'A neighbour has put up a notice.',
     '通 to pass through + 知 to know: to inform.', 5.50, 3.90, 1.9);
  // 门牌 rather than 邻居. `pick` resolves a tag to the nearest *thing* wearing it and the
  // comparison is 2-D only, so with twelve decks stacked on one footprint every floor that
  // teaches 邻居 at its own neighbours' doors is contesting the same three square metres —
  // measured, there are three other 邻居 within a metre of this spot in x/z, on decks 2, 7
  // and 9. The plate screwed to the leaf is a word this floor can own outright, and it is the
  // one that actually says which flat you are looking at.
  TH('楼梯', X1 - .10, Y + 1.10, SZ, '楼梯在东头，装修的东西都从这儿搬上来。',
     'The stairs are at the east end; everything for the works comes up them.',
     '楼 storey + 梯 ladder. The lift is boarded, so the crew use these.', 5.30, 4.30, 2.1);
  TH('安全出口', X1 - .10, Y + 2.25, SZ, '安全出口在东头。', 'The emergency exit is at the east end.',
     '安全 safe + 出口 exit. The green sign is the same in every building in the country.',
     5.30, 4.30, 2.3);
  TH('门牌', 4.05, Y + 1.84, ZN - .16, '门牌上写着一〇〇五。', 'The plate on the door reads 1005.',
     '门 door + 牌 plate, sign. 门牌号 is the number itself.', 4.05, 5.20, 2.0);
  TH('防盗门', 5.20, Y + 1.10, PN + .28, '拆下来的防盗门靠在墙上。',
     'The security door that came off is leaning against the wall.',
     '防 to guard against + 盗 theft + 门 door.', 5.20, 4.10, 2.0);
  TH('手推车', 5.72, Y + .80, 4.72, '走廊里放着一辆手推车。', 'A barrow is parked in the corridor.',
     '手 hand + 推 to push + 车 vehicle.', 4.95, 4.20, 2.2);

  HomeF10.built = true;
  return HomeF10;
};

// ---------------------------------------------------------------------------------------------
// FIVE THINGS FOR THE SHELL AND THE HUB, kept here rather than in a report that will be lost.
// The first three are js/world.js; 4 and 5 are js/game.js and js/build.js, and both of them are
// the whole tower's problem rather than this floor's — every floor builder will hit them.
//
// 1. THERE IS NO LIFT LANDING ON ANY DECK EXCEPT 0 AND 2. `buildShafts` runs its landing loop as
//    `for (const f of [0, 2])`, so decks 3..12 get no doors, no surround, no floor indicator, no
//    call panel, no shaft walls and no `doorStops` entry. `goFloor(10)` and the ride itself are
//    fully generalised and do work — the car arrives at deck 10 and its own leaves open — but they
//    open onto a hole in a wall nobody built. TOWER.md's Wave 0 lists "generates one landing per
//    deck in buildShell", and it is the one item of that wave which has not landed.
//    This file leaves the whole of that geometry free: the boarding it builds stands at
//    LIFT.z0 - .06 and the opening in it is x 2.06 .. 2.94 by 2.14 high, which clears the shell's
//    jambs (z 4.90 .. 5.02), its steel surround (4.865 .. 4.915) and its leaves (5.1075) with at
//    least 25 mm to spare. Adding the landing needs no edit here.
//
// 2. `carZone` IS ONLY PUSHED INTO ZONE[0] AND ZONE[2] (js/world.js:1056 and 1066). On every other
//    deck the body that steps out of the car is clamped by that deck's own zones instead. It
//    happens to work here, because this floor's landing zone spans the shaft footprint — but it
//    means the camera framing and the room lamp treat the inside of the car as corridor on decks
//    3..12. One line: push `carZone` into every deck that has a landing.
//
// 3. `rideFloor(dir, finished)` (js/world.js:311) is still the two-stop version — 'up' answers 2
//    and 'down' answers 0 whatever deck you are standing on. Nothing here touches it, but any
//    caller using it rather than `goFloor` lands on the wrong floor from up here.
//
// 4. EVERY DECK'S PROPS ARE SUBMITTED ON EVERY DECK. `hiddenProp`/`hiddenAt` in js/game.js cull
//    on x and z only — they are the wall cutaway and they have no y or deck test — so `paintScene`
//    walks all twelve decks' geometry on every frame. Measured standing on deck 10 with all twelve
//    floors built: 822 props on this deck, 15,136 elsewhere in the same draw list. Every render of
//    this floor carries a pale second image of other floors over it. It reads as a translucent
//    overlay but it is not a transparency-sort bug: of those 15,136, zero are translucent, so
//    whatever is coming through is opaque geometry that the depth buffer is not keeping out.
//    Whoever owns js/game.js should give `hiddenAt` the deck test it never needed with two floors:
//    hide anything whose y is more than a storey from `World.deckY(World.level())`. That is also
//    twelve times less geometry per frame, which this renderer will feel.
//
// 5. `pick` RESOLVES A TAG TO THE NEAREST THING IN TWO DIMENSIONS (js/build.js). With twelve decks
//    stacked on one 12 × 11 m footprint, every word that more than one floor teaches is contested
//    by whichever floor happens to have put its focus nearest in x/z — and floors naturally agree
//    about where things go, because they share a plan. Measured from deck 10 at various points in
//    the build: 邻居 within 0.21 m of another deck's 邻居, 窗户 within 0.32, 门帘 within 0.30,
//    门牌 within 1.31. Standing on floor 10 and clicking a neighbour's door can answer with floor
//    7's sentence. This floor dodges the worst of it by teaching 门牌 rather than 邻居, but that is
//    a workaround and it costs the tower a word. The fix is one line in `pick`'s tie-break: rank
//    candidates by 3-D distance from the hit, or drop any whose y is more than a storey away.
