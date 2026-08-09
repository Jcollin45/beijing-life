// 电梯 — the fit-out of the lift car
//
// Registered into FlatFit (declared at the top of js/world.js). See APARTMENT.md for the fixed
// coordinate contract.
//
// ---------------------------------------------------------------------------------------------
// WHO OWNS WHAT. This file used to build a whole second lift — its own landings, its own leaves,
// its own state machine. It does not any more, because js/world.js now builds the car and drives
// the ride, and two lifts in one shaft is nine kinds of z-fight. The division is the one written
// over `buildCar` in world.js: "Structure only — floor, walls, ceiling, light and the two leaves
// — because js/home-lift.js fits it out."
//
//   world.js  the shaft, both landings, the leaves, the car's five faces, the car light, and
//             `CAR.y` / `callLift` / `tick` — the ride itself.
//   this file  everything you can see from inside the car: floor finish, dado, mirror, handrail,
//             操作盘, the notices, the 广告框, the ceiling grille and the camera. All of it goes
//             through `A.rides`, which is what makes it travel with the car.
//
// Nothing here reaches into world.js. It builds props, hands them to `A.rides`, and exposes a
// small object the shell can drive if and when it wants the indicator to count.
//
// One thing in the list above is not fixed: the 广告框 draws from `POSTERS`, three boards keyed to
// the day — a 家政 card, a 诚聘 notice and an estate agent's. It is the cheapest recurring
// readable-Chinese surface in the game, because a rider stands still in front of it for up to
// 7.5 seconds, and it held one poster forever. The frame costs the same whichever is up.
//
// ---------------------------------------------------------------------------------------------
// RE-MEASURED ONTO THE SHELL'S OWN CAR. Read this before moving anything in here.
//
// This file was laid out against a car that no longer exists. The shell has since moved the shaft
// back, dropped the floor slab flush with the deck and narrowed the doors, and none of those
// reached this file — so the whole fit-out was built 35 cm in front of the car, 7 cm above its
// floor, with a door opening 20 cm wider than the one the leaves cover. What that actually looked
// like is worth writing down, because it is the reason the numbers below are derived and not
// chosen: the button panel stood inside the door frame, the mirror hung in the air a foot short of
// the back wall, and the handrail ran out through the front of the car into the corridor.
//
//                       was                  came from
//   car centre z        4.300                (LIFT.z0 + LIFT.z1) / 2
//   inside z         3.670 .. 4.930          front face / back wall
//   floor top y         0.090                CARFY
//   door opening x   2.000 .. 3.000          DOORW, which had gone 1.00 → 0.80
//
// The handrail is the one that keeps being named because it is the one that shows: a rail leaving
// the car through its own front wall is visible from the landing. What stops it happening again is
// not a number, it is `R` — the local alias for `A.rides` defined below, which every prop in this
// file goes through. A prop handed to `A.rides` is re-based off the car's transform each frame, so
// re-measuring the shell moves the rail with the car instead of leaving it in the shaft. Anything
// in here built with a bare `box(...)` rather than `R(box(...))` is the next version of this bug.
//
// No current values are written in that table on purpose. The shaft has since moved a third time —
// the upstairs corridor was 0.14 m of standing room and the whole back of the building went out to
// z 6.2 — and any number written down here would already be stale again. Every surface in this
// file is now derived from `A.CAR`, which js/world.js fills in from the constants it actually
// builds the car from. There are no literal positions left in here, and that is the fix: the
// drift was never a wrong number, it was a *copied* one.
//
// THE CAR FRONT STILL HAS HOLES IN IT, and plugging them is this file's job. The shell's front
// face is two 0.18 m pieces at the outer corners; the leaves cover the DOORW in the middle. That
// leaves a slot either side the full height of the opening, plus one above the leaves, where the
// car is open to the shaft. The returns and transom below plug all three, and they stand 10 mm
// behind the leaves' back face — so an open leaf slides out of sight behind them, which is what a
// return is for anyway.
//
// ---------------------------------------------------------------------------------------------
// The floor numbers. This panel has always had twelve buttons and used to light two of them: the
// other ten were "the floors this lift also serves and the game does not model", which was the
// only way to have twelve storeys of building and two storeys of geometry agree with each other.
//
// TOWER.md's whole premise is that that compromise ends — "the job is to make it tell the truth" —
// so every button now maps to a real deck. `World.deckLive(n)` is what says whether anybody has
// built that floor yet, and the floor picker in js/game.js greys the ones nobody has. The button
// is honest about the building; the picker is honest about the game.
// `HomeLift.NUM` and `HomeLift.FLAT` are read by the 信箱 in the lobby and the six doors on each
// landing, so floor numbering comes off one constant rather than a second guess.
const HomeLift = {
  DECK: [0, 0, 3.10],
  DECKS: (() => { const a = [0]; for (let n = 2; n <= 12; n++) a.push(n); return a; })(),
  // deck index → the number printed on the button. Deck 0 is floor 1; deck N is floor N.
  NUM: (() => { const o = { 0: 1 }; for (let n = 2; n <= 12; n++) o[n] = n; return o; })(),
  FLAT: '202',                    // so the corridor's six doors are 201..206
  FLOORS: 12,                     // buttons on the panel — and now every one of them is a floor
  built: false,
  things: [],                     // the vocab objects inside the car, each tagged .homeCar
  // Safe no-ops until the builder has run, so a caller wired up early cannot throw.
  tick() {}, setShown() {}, shown() { return 1; },
  inside() { return false; },        // until the builder replaces it with the measured one
};

FlatFit['lift'] = A => {
  // The shell owner may land a build here before the toolkit is complete. A throw in one room
  // stops the game booting for the other nine, so bail quietly instead.
  // `A.CAR` as well as the two builders: every measurement in this file is derived from it, so
  // without it there is nothing to build against and a silent bail beats a throw that stops the
  // other nine rooms booting.
  if (!A || typeof A.box !== 'function' || typeof A.rides !== 'function'
        || !A.CAR || A.CAR.doorH === undefined) return HomeLift;

  const { box, ball, flat, C, MAT, G } = A;
  const cap = A.cap || A.box;
  const glyph = A.glyph || (() => []);
  const th = A.th || (() => null);

  // `rides` is the whole mechanism: a prop handed to it is recorded at the height it was built —
  // which is deck 0, because the car is built in the lobby — and lifted by `CAR.y` every frame.
  // Everything below is wrapped in it, including the glyphs, or the writing stays in the lobby
  // while the notice board it is written on goes upstairs.
  const R = p => A.rides(p);
  const Rg = g => { if (g) for (const p of g) A.rides(p); return g; };
  // `A.flat` and `A.wall` push their quad and return nothing — see build.js — so `rides` cannot
  // be handed the result the way it can for a box. Take it off the end of the props array
  // instead. Without this the whole floor finish stays in the lobby while the car climbs, and
  // there is nothing to see until the day the ride is wired up, which is the worst kind of bug.
  const Rf = (...a) => {
    const n = A.props.length;
    flat(...a);
    return A.props.length > n ? A.rides(A.props[A.props.length - 1]) : null;
  };

  // ---------------------------------------------------------------- the numbers
  //
  // Every plane in a 1.66 m box of parallel panels, written down once, because the only way this
  // room goes wrong is two of them landing on the same plane.
  //
  // Not one of them is a literal. Every number below is derived from `A.CAR`, which js/world.js
  // fills in from the constants it builds the car out of, and the offsets are the shell's own —
  // the side walls are 0.07 thick, the front face stands 0.030 in from the shaft line, the back
  // wall 0.070 in from the far side, the ceiling slab is 0.10 deep. That is the whole of the fix
  // described at the head of this file: the moment a literal appears here it starts drifting away
  // from the car the first time the shaft moves, and the shaft has now moved twice.
  // `CR`, not `C` — `C` is the colour function destructured out of the toolkit above.
  const CR = A.CAR;
  const CX = CR.x;
  const IX0 = CX - CR.side, IX1 = CX + CR.side;  // side walls, inside faces
  const ZF = CR.z - CR.d / 2;                    // the shaft line: the car's front plane
  const IZ0 = ZF + .030;                         // front face, inside
  const IZ1 = CR.z + CR.d / 2 - .070;            // back wall, inside
  const FY = CR.floor;                           // car floor, top face — flush with the deck
  const CY = CR.ceil;                            // ceiling, underside
  const DX0 = CX - CR.door / 2, DX1 = CX + CR.door / 2;  // the door opening in x
  const DH = CR.doorH;                           // and its height
  // The returns stand 10 mm behind the leaves' back face. The leaves are 0.05 thick centred on
  // ZF + .030, so they end at ZF + .055 and park clear of the side walls; they pass behind these
  // without touching and are hidden by them from inside the car. 40 mm of visible return.
  const RZ0 = ZF + .065, RZ1 = ZF + .105, RZC = (RZ0 + RZ1) / 2, RZT = RZ1 - RZ0;
  // The middle of the floor you actually stand on: behind the returns, in front of the back wall.
  const CZ = (RZ1 + IZ1) / 2;

  // ---------------------------------------------------------------- palette and materials
  //
  // A lift car is four finishes and nothing else: hairline stainless, a dark floor, a mirror and
  // a lit ceiling. The variety has to come from what is stuck to the walls, which is where this
  // one gets its Chinese from — the button panel, the two notices, the inspection label and the
  // advertising frame.
  const K = {
    steel:  C('#b1b7bc'),   // the car's own hairline stainless
    steelD: C('#767d85'),   // trim, dado, handrail, brackets
    steelL: C('#ccd2d6'),   // panel faces, beads — a shade brighter than the walls
    mirror: C('#c6d3da'),
    stone:  C('#41454b'),   // the floor field
    stoneL: C('#565c65'),   // its border band
    screen: C('#12181d'),   // indicator face, camera dome
    amber:  C('#ffb44a'),   // the digits, and a pressed button
    jade:   C('#4f9a72'),
    red:    C('#bf3a2c'),
    paper:  C('#efe9d8'),
    ink:    C('#2c2c2c'),
    gold:   C('#d5b063'),
  };
  // The shell's own metal preset, used unchanged: matAmt .28, nrmAmt .30. Nothing in here needs a
  // local correction table; if a surface still reads wrong it is the material, not this room.
  // Written as literals rather than as `MAT.metal` / `MAT.slab`: the values are the shell's, but
  // a one-identifier spread is invisible to the material-coverage sweep, which read this car as
  // having no materials at all when every steel surface in it is textured.
  const MET  = { mat: 'metal',  matScale: .50,  matAmt: .28, nrmAmt: .30 };
  const SLAB = { mat: 'paving', matScale: .70,  matAmt: .26, nrmAmt: .30 };

  // =============================================================== the front: returns + transom
  //
  // The three pieces that make the car a box rather than a box with slots cut in it. See note 1.
  const tag = '电梯';
  for (const [x0, x1] of [[IX0, DX0], [DX1, IX1]])
    R(box((x0 + x1) / 2, (FY + DH) / 2, RZC, x1 - x0, DH - FY, RZT, K.steel,
      { hard: true, gloss: .46, tag, ...MET }));
  // the transom, abutting the two returns at y = DH rather than overlapping them
  R(box(CX, (DH + CY) / 2, RZC, IX1 - IX0, CY - DH, RZT, K.steel,
    { hard: true, gloss: .46, tag, ...MET }));

  // 注意安全 down the left-hand return, in the red it is always in. The return's visible face is
  // z 3.720 and the glyph stands 4 mm off it.
  Rg(glyph((IX0 + DX0) / 2, FY + 1.470, RZ1, 0, '注意安全',
    { size: .062, gap: .018, color: K.red, mode: 1, glow: .10, tag, vertical: true, lift: .004 }));

  // =============================================================== the floor
  //
  // Two inset quads and a threshold plate, all laid a few millimetres over the shell's slab at
  // FY — the house step for floor quads, which the lobby's own four-band floor uses.
  // The grooved sill you step over, 30 mm behind the returns and clear of the leaves entirely.
  const SILL = RZ1 + .030;                            // 4.135
  Rf(CX, FY + .018, SILL, DX1 - DX0, .056, K.steelD, { mode: 9, gloss: .60, tag, ...MET });
  for (const dz of [-.017, 0, .017])
    Rf(CX, FY + .024, SILL + dz, DX1 - DX0 - .020, .006, K.screen, { mode: 9, gloss: .30, tag });
  // The field, starting behind the sill rather than under it — two floor quads 6 mm apart and
  // overlapping is the one arrangement that stripes at a grazing angle, which is the only angle a
  // floor is ever seen at.
  const FZ0 = SILL + .050, FZ1 = IZ1 - .040, FZC = (FZ0 + FZ1) / 2, FZD = FZ1 - FZ0;
  Rf(CX, FY + .006, FZC, IX1 - IX0 - .130, FZD, K.stoneL,
    { mode: 9, gloss: .40, tag, ...SLAB });
  Rf(CX, FY + .012, FZC, IX1 - IX0 - .270, FZD - .140, K.stone,
    { mode: 9, gloss: .44, tag, ...SLAB });

  // =============================================================== the walls: dado
  //
  // A single 2.14 m sheet of one grey is the thing that makes a lift read as a lift-shaped hole,
  // so each wall is split at 0.96 by a dark lower panel and a bead along its top. Faces, not
  // centres: wall 1.670 → dado 1.695 → bead 1.710, and the mirror image on the other side.
  const DADO_TOP = FY + .870;
  const dado = (x, y, z, sx, sz, bsx, bsz) => {
    R(box(x, (FY + .020 + DADO_TOP) / 2, z, sx, DADO_TOP - FY - .020, sz, K.steelD,
      { hard: true, gloss: .38, tag, ...MET }));
    // The bead is deliberately thicker than it looks: its tail is buried inside the shell's own
    // wall box and only the 15 mm standing proud of the dado is ever seen. A thinner one sat
    // 7.5 mm off the dado, which is inside the margin where two near-parallel faces stripe.
    R(box(x, DADO_TOP + .010, z, bsx, .026, bsz, K.steelL, { hard: true, gloss: .64, tag }));
  };
  // The button panel is on the -x wall and the dado has to stop short of it, so both are measured
  // off one number. `PZ` is the panel's centre, `PD` its depth; the panel itself is built below.
  const PZ = RZ1 + .155, PD = .215;
  const DB = IZ1 - .0125;                             // where a dado ends at the back wall
  // -x wall, from 27 mm clear of the panel to the back corner. That gap is what makes it read as
  // the panel wall rather than as a dado with a box stuck on it.
  const D0 = PZ + PD / 2 + .027;                      // 4.395
  dado(IX0 + .0125, 0, (D0 + DB) / 2, .025, DB - D0, .055, DB - D0);
  // +x wall, the full depth from the door return back, and the back wall under the mirror.
  dado(IX1 - .0125, 0, (RZ1 + DB) / 2, .025, DB - RZ1, .055, DB - RZ1);
  dado(CX, 0, DB, 1.540, .025, 1.540, .055);

  // =============================================================== the mirror
  //
  // On the back wall, above the rail, where a Chinese car keeps it. Faces again: wall 5.230 →
  // bezel 5.185 → pane 5.160. The four bezel bars abut the pane rather than overlapping it, so
  // there is no square centimetre where two faces share a plane.
  const MBT = .035, MPT = .025;
  const MB = IZ1 - .045 + MBT / 2;               // bezel: 5.185..5.220
  const MP = IZ1 - .070 + MPT / 2;               // pane:  5.160..5.185
  const mx0 = 1.814, mx1 = 3.186, my0 = FY + 1.042, my1 = FY + 1.918, bar = .024;
  for (const [bx, by, bw, bh] of [
    [CX, my1 + bar / 2, mx1 - mx0 + bar * 2, bar], [CX, my0 - bar / 2, mx1 - mx0 + bar * 2, bar],
    [mx0 - bar / 2, (my0 + my1) / 2, bar, my1 - my0], [mx1 + bar / 2, (my0 + my1) / 2, bar, my1 - my0]])
    R(box(bx, by, MB, bw, bh, MBT, K.steelL, { hard: true, gloss: .66, tag }));
  R(box(CX, (my0 + my1) / 2, MP, mx1 - mx0, my1 - my0, MPT, K.mirror,
    { hard: true, gloss: .88, alpha: .92, tag }));
  // One pale streak down it, 12 mm proud of the pane, which is what sells a flat quad as glass.
  R(box(CX - .38, (my0 + my1) / 2, MP - MPT / 2 - .012, .085, my1 - my0 - .09, .012, K.steelL,
    { hard: true, mode: 1, glow: .05, alpha: .30, tag }));

  // =============================================================== the handrail
  //
  // 38 mm brushed tube at 900 above the car floor, along the back wall and both sides, standing
  // 70 mm off the wall on three brackets a run. The capsule mesh runs along local Y, so the
  // length goes in sy and rx / rz turn it into z or x.
  const RY = FY + .900;
  R(cap(CX, RY, IZ1 - .075, .019, 1.320, .019, K.steelD,
    { rz: Math.PI / 2, gloss: .58, tag, ...MET }));
  for (const bx of [DX0, CX, DX1])
    R(box(bx, RY, IZ1 - .025, .030, .030, .052, K.steelD, { hard: true, gloss: .55, tag }));
  // The -x run starts clear of the button panel; the +x run has the whole wall and starts just
  // behind the door return.
  for (const [wx, s, z0, z1] of [[IX0, 1, PZ + PD / 2 + .052, IZ1 - .080],
                                 [IX1, -1, RZ1 + .045, IZ1 - .080]]) {
    R(cap(wx + s * .070, RY, (z0 + z1) / 2, .019, z1 - z0, .019, K.steelD,
      { rx: Math.PI / 2, gloss: .58, tag, ...MET }));
    for (const bz of [z0 + .10, (z0 + z1) / 2, z1 - .08])
      R(box(wx + s * .030, RY, bz, .052, .030, .030, K.steelD, { hard: true, gloss: .55, tag }));
  }

  // =============================================================== 操作盘, the button panel
  //
  // On the -x wall beside the door, where your hand is when you walk in. Faces reading out from
  // the wall at 1.670: plate 1.710, ring 1.723, button 1.739. Everything on this wall is written
  // at yaw +π/2, which turns a glyph's local +z into world +x — it faces into the car.
  const YAW = Math.PI / 2;
  R(box(1.690, FY + 1.190, PZ, .040, 1.020, PD, K.steelL,
    { hard: true, gloss: .52, tag, ...MET }));

  // ---- the car's own floor indicator, at the top of the panel.
  //
  // Twelve floors need two digit slots and there is no way to redraw a glyph, so every digit that
  // could appear is built once at its slot and switched by alpha. Fifteen quads buys an indicator
  // that really counts, which is the whole difference between a ride and a fade — and until the
  // shell calls `HomeLift.tick` it simply sits at 1, which is where the car is.
  R(box(1.712, FY + 1.570, PZ, .020, .120, .180, K.screen,
    { hard: true, mode: 1, glow: .06, gloss: .30, tag }));
  const DIG = { tens: null, ones: [], up: null, dn: null };
  {
    // Sized so the widest reading — '1' '2' '▲' across three slots — still lands inside the
    // 0.180 screen: at .052 the outer slots reach ±0.082 of 0.090.
    const y = FY + 1.570, sz = .052, step = sz * .80;
    // local +x maps to world -z at this yaw, so a slot to the reader's left is the larger z
    const put = (off, ch, gl) => {
      const g = Rg(glyph(1.722, y, PZ - off, YAW, ch,
        { size: sz, color: K.amber, mode: 1, glow: gl, alpha: 0, tag, lift: .006 }));
      return (g && g[0]) || null;
    };
    DIG.tens = put(-step, '1', .22);
    for (let d = 0; d <= 9; d++) DIG.ones.push(put(0, String(d), .22));
    DIG.up = put(step * 1.35, '▲', .18);
    DIG.dn = put(step * 1.35, '▼', .18);
  }

  // ---- the floor buttons. Odd numbers up the left column, even up the right, lowest at the
  // bottom — the layout of every panel in the country. Only NUM's two are wired to a stop; the
  // rest are the floors you do not live on, and are dark.
  // Printed number → deck index, for all twelve. This was `{ 1: 0, 2: 2 }` and the other ten
  // buttons were dark decoration; TOWER.md's whole premise is that the panel should tell the
  // truth, so every button now maps to a real deck. Whether that deck has anything built on it is
  // a separate question and `World.deckLive` answers it — the button is honest about the building,
  // the floor picker in js/game.js is honest about the game.
  const LIVE = { 1: 0 };
  for (let n = 2; n <= HomeLift.FLOORS; n++) LIVE[n] = n;
  const buttons = {};
  // One glyph per button, never two: an earlier pass drew the dull character and then a coloured
  // one a millimetre in front of it to tint 开 and 铃, which is two identical quads on the same
  // spot and stripes. The colour is an argument instead.
  function press(bz, by, ch, o = {}) {
    R(box(1.716, by, bz, .014, .046, .046, K.steelD, { hard: true, gloss: .50, tag }));
    const face = R(ball(1.729, by, bz, .010, .017, .017, o.face || K.steelL,
      { hard: true, mode: 1, glow: o.glow === undefined ? .03 : o.glow, gloss: .55, tag }));
    Rg(glyph(1.739, by, bz, YAW, ch,
      { size: .022, gap: .004, color: o.ink || K.steelD, mode: 1,
        glow: o.inkGlow === undefined ? .05 : o.inkGlow, tag, lift: .005 }));
    return face;
  }
  const COLZ = [PZ + .048, PZ - .048];           // [odd, even] — the reader's left, then right
  for (let row = 0; row < 6; row++) {
    const by = FY + .960 + row * .072;
    for (let c = 0; c < 2; c++) {
      const n = row * 2 + c + 1;
      buttons[n] = LIVE[n] !== undefined
        ? press(COLZ[c], by, String(n), { face: K.paper, glow: .10, ink: K.ink, inkGlow: .13 })
        : press(COLZ[c], by, String(n));
    }
  }
  // 地下车库 below 1, 警铃 beside it in the red every one of these is, and 开门 / 关门 at the
  // bottom under the thumb.
  press(COLZ[0], FY + .888, '-1');
  press(COLZ[1], FY + .888, '铃', { ink: K.red, inkGlow: .14 });
  // 开门 is the one button on this panel that reports something real: `tick` lights its face for
  // as long as the doors are actually standing open.
  const bOpen = press(COLZ[0], FY + .800, '开', { ink: K.jade, inkGlow: .12 });
  press(COLZ[1], FY + .800, '关', { ink: K.ink, inkGlow: .06 });

  // =============================================================== the two notices
  //
  // 电梯使用标志 is the most Chinese object in the car: small, dull, and legally required. Both
  // cards hang above the dado on the panel wall, faces at 1.688 with the writing 4 mm off that.
  function card(z, yc, h, d, lines) {
    R(box(1.679, yc, z, .018, h, d, K.paper, { hard: true, mode: 1, glow: .04, gloss: .12, tag }));
    for (const [dy, s, txt, cc] of lines)
      Rg(glyph(1.688, yc + dy, z, YAW, txt,
        { size: s, gap: s * .12, color: cc, mode: 1, glow: .02, tag, lift: .004 }));
  }
  // The card widths are set by the longest line, not the other way round: a glyph run is
  // `n * (size + gap) - gap` wide and overflows its board silently, so every line below has been
  // measured against the card it is written on. The dado underneath runs D0..DB — 4.395..5.218,
  // 0.82 m — which is what these two have to share, and 乘梯须知 lost 40 mm of board to fit. Its
  // longest line is 0.339 and the board is 0.440, so it still has room.
  // The card is 60 mm taller than it was, for one line: this is the certificate everybody in a
  // Chinese lift reads and it carried no 年检 date and no 维保 record at all, on a building whose
  // lobby board announces 电梯年检 / 二号梯停用 (js/home-lobby.js). The two now agree — one shaft
  // is out, this one is in date, and the last service was three days into the month.
  card(D0 + .180, FY + 1.195, .330, .360, [   // z 4.395..4.755
    [.130, .042, '电梯使用标志', K.red],                    // .277
    [.072, .030, '使用单位 本楼物业', K.ink],                // .299
    [.022, .028, '设备编号 D-0202', K.ink],                 // .342
    [-.028, .024, '载重1000公斤 13人', K.ink],              // .347
    [-.076, .024, '年检有效期至二〇二七年三月', K.ink],       // .347
    [-.124, .022, '维保单位 京安电梯', K.ink]]);             // .195
  card(DB - .225, FY + 1.230, .300, .440, [   // z 4.773..5.213
    [.098, .046, '乘梯须知', K.red],                        // .200
    [.026, .034, '请勿倚靠轿门', K.ink],                     // .224
    [-.030, .034, '禁止扒门 严禁超载', K.ink],                // .339
    [-.086, .034, '故障时请按警铃等待', K.ink]]);             // .339

  // =============================================================== 广告框
  //
  // Every residential lift in China has a lit frame on the wall, and what is in it is always the
  // same three trades. On the +x wall, above the rail. Faces: wall 3.330 → frame 3.294 → poster
  // 3.282, and the poster is inset 50 mm inside the frame all round, so the frame reads as one.
  R(box(3.312, FY + 1.450, CZ + .020, .036, .900, .700, K.steelD,
    { hard: true, gloss: .44, tag, ...MET }));
  R(box(3.295, FY + 1.450, CZ + .020, .026, .800, .600, K.paper,
    { hard: true, mode: 1, glow: .09, gloss: .16, tag }));
  // Three posters, not one. This is the cheapest recurring readable-Chinese surface in the game:
  // the player stands still in front of it for up to 7.5 seconds every time they go home, and it
  // held one fixed 家政 card forever. The trades are the three that actually paper these frames —
  // a cleaner, a hiring notice and an estate agent's board.
  //
  // Picked at build off the day, not swapped at runtime: these are baked glyph quads and a
  // runtime swap would mean rebuilding six of them for a thing nobody reads twice in one ride.
  // The whole frame is one prop plus one poster whichever is up, so the rotation is free.
  const POSTERS = [[
    [.300, .078, '家政保洁', K.red],
    [.190, .046, '擦玻璃 通下水', K.ink],
    [.120, .046, '换锁芯 修家电', K.ink],
    [.010, .040, '二十四小时上门', K.ink],
    [-.070, .040, '本楼住户八折', K.gold],
    [-.180, .032, '物业审核 张贴一个月', K.steelD]], [
    [.300, .078, '诚聘', K.red],
    [.190, .046, '超市理货 收银', K.ink],
    [.120, .046, '包吃住 月休四天', K.ink],
    [.010, .040, '十八至四十五岁', K.ink],
    [-.070, .040, '面议 待遇从优', K.gold],
    [-.180, .032, '物业审核 张贴一个月', K.steelD]], [
    [.300, .078, '房屋租售', K.red],
    [.190, .046, '本小区两居', K.ink],
    [.120, .046, '南北通透 精装', K.ink],
    [.010, .040, '看房随时', K.ink],
    [-.070, .040, '中介费一个月', K.gold],
    [-.180, .032, '物业审核 张贴一个月', K.steelD]]];
  for (const [dy, s, txt, cc] of POSTERS[new Date().getDay() % POSTERS.length])
    Rg(glyph(3.282, FY + 1.450 + dy, CZ + .020, -Math.PI / 2, txt,
      { size: s, gap: s * .12, color: cc, mode: 1, glow: .04, tag, lift: .004 }));

  // =============================================================== the ceiling
  //
  // The shell's own lit panel covers x 1.86..3.14, z 4.26..5.04 and its underside is at 2.125, so
  // both of these sit in the bare border outside it and hang from 2.140. The grille was 30 mm over
  // that edge in x and is now 10 mm clear of it.
  R(box(1.760, CY - .008, CZ, .180, .016, .440, K.steelD, { hard: true, gloss: .50, tag, ...MET }));
  for (let i = 0; i < 4; i++)
    R(box(1.760, CY - .028, CZ - .150 + i * .10, .150, .012, .016, K.screen,
      { hard: true, gloss: .30, tag }));
  // 应急灯 — the emergency light, on the ceiling border beside the grille. Two props: the battery
  // box and its lens. It burns at almost nothing now and is the fitting a 停电 has to bring up
  // when the shell's own car light goes out; the pattern to copy on the driving side is `emLight`
  // in js/home-lobby.js, placed beside the 安全出口 there. Item 90 (js/disrupt.js) is what wires
  // it, and that file is nobody's in this wave — recorded in .reports/data-rows-queue.md.
  R(box(3.010, CY - .008, CZ - .330, .200, .020, .110, K.steelD,
    { hard: true, gloss: .46, tag, ...MET }));
  R(box(3.010, CY - .026, CZ - .330, .150, .014, .070, C('#dff0e0'),
    { hard: true, mode: 1, glow: .03, tag }));
  // The camera, in the front corner over your shoulder, where every one of them is.
  R(box(3.210, CY - .010, RZ1 + .075, .110, .020, .110, K.steelD, { hard: true, gloss: .48, tag }));
  R(ball(3.210, CY - .052, RZ1 + .075, .046, .038, .046, K.screen,
    { hard: true, mode: 1, gloss: .70, tag }));

  // =============================================================== the things you can name
  //
  // Four, spread so no two share a focus. Their `pos` is recorded at deck 0 with the car; `tick`
  // below carries them up with it, because a word that stays in the lobby while the mirror it
  // names goes upstairs is a word about nothing.
  const carThings = [];
  for (const [hz, tx, ty, tz, fx, fz, sen, tr, note] of [
    ['按钮', 1.78, FY + 1.19, PZ, 2.30, PZ + .16,
     '请按二楼。', 'Press the second floor, please.', '按 to press + 钮 button.'],
    ['扶手', 1.74, FY + .90, CZ + .23, 2.30, CZ + .18,
     '站稳，扶好扶手。', 'Stand steady, hold the handrail.', '扶 to support + 手 hand.'],
    ['镜子', 2.60, FY + 1.47, IZ1 - .08, 2.55, CZ + .03,
     '电梯里的镜子照得很清楚。', 'The mirror in the lift is very clear.', '镜 mirror + 子, the noun ending.'],
    ['广告', 3.28, FY + 1.45, CZ + .02, 2.72, CZ + .02,
     '电梯里贴着家政广告。', 'There is a housekeeping advert in the lift.', '广 wide + 告 to tell.'],
  ]) {
    const t = th(hz, tx, ty, tz, sen, tr, note, { focus: [fx, fz], reach: 1.3 });
    if (t) { t.homeCar = true; carThings.push(t); HomeLift.things.push(t); }
  }
  const thingY0 = carThings.map(t => t.pos[1]);

  // =============================================================== the indicator, and the hook
  //
  // `shown` is the number on the display, `arrow` is -1 / 0 / +1. Both are set by `tick`, which
  // the shell should call once a frame with `CAR.y`; with nothing calling it the car does not
  // move either, so a static 1 is the honest reading and not a bug.
  const DECK = HomeLift.DECK;
  const NUM = HomeLift.NUM;
  let shown = -1, arrow = 0;

  function setShown(n, dir) {
    n = n < 1 ? 1 : n > 99 ? 99 : Math.round(n);
    dir = dir > 0 ? 1 : dir < 0 ? -1 : 0;
    if (n === shown && dir === arrow) return;
    shown = n; arrow = dir;
    const t = n >= 10, o = n % 10;
    if (DIG.tens) DIG.tens.alpha = t ? 1 : 0;
    for (let d = 0; d <= 9; d++) if (DIG.ones[d]) DIG.ones[d].alpha = d === o ? 1 : 0;
    if (DIG.up) DIG.up.alpha = dir > 0 ? 1 : 0;
    if (DIG.dn) DIG.dn.alpha = dir < 0 ? 1 : 0;
    // The live buttons light for the floor the car is going to, and go out when it gets there.
    for (const k in LIVE) {
      const b = buttons[k];
      if (!b) continue;
      const lit = dir !== 0 && Number(k) === n;
      b.color = lit ? K.amber : K.paper;
      b.glow = lit ? .22 : .10;
    }
  }

  // One call a frame, from world.js's own `tick`, right after it has set `CAR.y`:
  //
  //     HomeLift.tick(CAR.y, doorK);
  //
  // The count comes out of the height and so does the arrow; `doorK` lights 开门 while the doors
  // are standing open, which is the one thing on this panel you can see happen. The shaft is
  // 3.10 m and the building is twelve storeys; what a passenger sees of a lift is the number, so
  // the number is what is honest here: it runs 1 → 2 across the ride and lands exactly.
  let lastY = null, lastK = -1;
  function tick(carY, doorK) {
    if (typeof doorK === 'number' && doorK !== lastK) {
      lastK = doorK;
      if (bOpen) { bOpen.color = doorK > .02 ? K.jade : K.steelL; bOpen.glow = doorK > .02 ? .20 : .03; }
    }
    const y = typeof carY === 'number' ? carY : DECK[0];
    // carry the vocab objects with the car
    const dy = y - DECK[0];
    for (let i = 0; i < carThings.length; i++) carThings[i].pos[1] = thingY0[i] + dy;
    // and count
    // The number is read straight off the height, which is what a real indicator does — deck 0 is
    // floor 1 at y 0 and every storey above it is 3.10, so floor = 1 + y / 3.10. It counts through
    // the floors it passes rather than interpolating between two endpoints, which is the whole
    // difference between an indicator and a progress bar.
    const STOREY = (A.STOREY || 3.10);
    const n = 1 + (y - DECK[0]) / STOREY;
    let dir = 0;
    if (lastY !== null) {
      const d = y - lastY;
      if (d > 1e-4) dir = 1; else if (d < -1e-4) dir = -1;
    }
    lastY = y;
    setShown(n, dir);
  }

  Object.assign(HomeLift, {
    built: true,
    tick, setShown,
    shown() { return shown; },
    carThings,
    // The inside of the car in (x, z), for anything that wants to know whether the body is aboard.
    inside(x, z) { return x > IX0 && x < IX1 && z > RZ1 && z < IZ1; },
    // The fit-out's own measurements, for a sibling that wants to stand something at the door.
    CAR: { x: CX, z: CZ, ix0: IX0, ix1: IX1, iz0: RZ1, iz1: IZ1, floor: FY, ceil: CY,
           doorX0: DX0, doorX1: DX1, doorH: DH, doorZ: IZ0 },
  });

  setShown(NUM[0], 0);
  return HomeLift;
};
