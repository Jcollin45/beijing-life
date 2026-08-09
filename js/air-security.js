// 🛡️ Security — 安检 — the arch, the glass flaps, the X-ray scanner
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    x 2.0 .. 3.2  (the SEC = 2.40 spine)
//   camera  D5-security
//
// 安检 — the arch, the glass flaps, the X-ray scanner. IMPROVEMENT 1 ALSO LANDS HERE: the scan
// image is a coloured rectangle and must become a real render of the bag. Owns the flap/lamp
// tick (openSecurity, GATE_HOLD). THE ONE ZONE THAT TOUCHES THE SPINE — do not move SEC.
//
// The camera IS the acceptance test. Render your shot with `node .audit.js D5-security`, open the
// PNG, and look at it. A zone whose code boots but whose shot is black, empty, or unchanged has
// not shipped. You own your row(s) in .audit.js and nobody else's.
//
// ---------------------------------------------------------------------------------------------
// WHAT THIS FILE IS AND IS NOT, AS OF WAVE 1
//
// Wave 0 landed the `AirFit` registry and the `A` toolkit, but it did NOT lift the security
// channel out of `build()` — the partition, the arch, the flaps, the belt, the trays, the two
// officers, the gantry and the 出口 door are all still built inline in js/airport.js:1910-2128,
// and the shell still drives the flap/lamp animation from its own `tick` (js/airport.js:3191).
// So this file DEEPENS what is already there rather than rebuilding it. Building a second arch
// on top of the shell's would double every prop in the busiest 6 m of the terminal, and the two
// copies would z-fight.
//
// The one thing that had to be *replaced* rather than added to is the scan picture. The shell
// draws it as three small emissive rectangles (airport.js:2072-2075) — literally the bug in
// AIRPORT.md improvement 1, "the screens lie" — and this file cannot delete them, because
// js/airport.js belongs to the Mech. So the operator's monitor here is a full-size console
// display built *in front of* the shell's little pair, deep enough in x that the three fake bars
// and the small dark panel behind them are entirely inside its body and never rendered. There is
// a ticket in the report asking the Mech to delete those four lines; until it lands, the fake is
// buried rather than removed, and nothing in the room shows it.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET — read this before you add anything
//
// The airport draws at ~15.6 ms a frame today (60+ fps) with 4,141 props. Fifteen zones adding
// freely is how that becomes 30 ms. Your budget is **250 props**, and the rules that decide
// whether a prop is cheap or expensive are not obvious:
//
//   * Props BATCH by mesh + mode + corner radius + bevel + textures. Fifty identical seats are
//     one draw call. Fifty seats in fifty slightly different colours are still one draw call —
//     colour, gloss, alpha and glow travel per instance. Vary those freely.
//   * ANYTHING TRANSLUCENT (alpha < 0.999) DOES NOT BATCH, one draw call each, because batching
//     reorders drawing and transparency depends on order. Haze, glass, steam: use them where they
//     earn it and count them.
//   * Glyphs DO batch now (as of 2026-08-04 — the atlas cell is a per-instance attribute), so
//     real writing is cheap. Use real characters; that is the whole point of the game.
//   * A distinct `round`, `bevel`, `mat` or `matScale` value starts a NEW batch. Reuse the
//     shell's materials off `A` (A.M_STONE, A.M_METAL, …) rather than inventing your own.
//
// Every prop in this file is opaque. The zone adds **zero** translucent draws: the two glass
// flaps and the two lead curtain panels the shell already builds are the whole of security's
// transparency spend, and the rubber strips added here are opaque black rubber, which is what
// a real lead curtain is.
//
// Check yourself: `node .fpscheck.js airport` must stay under 16.7 ms median. If your zone pushes
// it over, say so in your report rather than shipping it.
//
// ---------------------------------------------------------------------------------------------

// ---- module state, filled by the builder and read by the tick -------------------------------
// Declared out here rather than inside the builder because the tick is a sibling of it, not a
// closure inside it. Everything the tick touches is allocated once, at build: the tick runs every
// frame in the busiest room in the game and must not allocate.
const AirSec = {
  ok: false,          // did the builder finish? a tick against a half-built zone throws
  isOpen: null,       // A.securityIsOpen, stashed — the shell owns the barrier, this only reads it
  sweep: null,        // the scan head travelling across the picture
  z0: 0, zw: 0,       // where it travels between
  cells: [],          // the eight progress cells along the top of the screen
  alert: [],          // the four bars of the flag drawn round the bottle
  pips: [],           // the two lamps on the officer's sign
  status: [],         // the 请复检 line, which changes colour with the lane
  wasOpen: null,
  // The four colours the tick swaps between. Pre-built, because `p.color = X` is a reference
  // swap and `p.color = C('#…')` is an allocation on every frame of the busiest room in the
  // game. Filled by the builder off `A.C` rather than at module scope off the global `C`: this
  // file must not read anything at load time that another zone's file could still be changing.
  openC: null, shutC: null, cellOn: null, cellOff: null,
};

AirFit['security'] = A => {
  const { box, cyl, cap, glyphs, solid, thing, shade } = A;
  const { C, G, col } = A;
  const { SEC, LANE } = A;

  // The datums the shell laid this channel out on. Restated, not guessed: these are the same
  // expressions js/airport.js:2006 and :2060 use, so the console and the belt this file builds
  // onto are the console and the belt that are already there.
  const XZ = LANE.z0 - 1.60;              // -1.05  the X-ray belt centreline
  const OPZ = XZ - 1.15;                  // -2.20  the operator's console
  const AMZ = (LANE.z0 + LANE.z1) / 2;    //  1.30  the middle of the walk lane
  const PI = Math.PI;

  // =============================================================== 1. the picture on the screen
  //
  // The whole of AIRPORT.md improvement 1, for this zone. What was here was three coloured
  // rectangles on a 0.55 m panel; what a real 安检机 operator looks at is a wide picture of the
  // inside of the case, drawn in the four colours a dual-energy scanner separates the world into:
  //
  //     orange   organic — clothes, food, paper, plastic. Most of a suitcase is this.
  //     green    mixed / light inorganic — a drinks bottle, a cable, a charger.
  //     blue     metal. The denser it is, the darker, down to near-black for keys and coins.
  //     dark     the case is transparent; only what is in it and the frame of it show at all.
  //
  // So the picture is built as a stack of flat emissive plates — a case in outline, an organic
  // fill, a dense core where the clothes are packed, and then the things a bag actually has in
  // it: a laptop, the two rails of a telescopic handle, a bottle, a shoe, a coil of cable, a
  // handful of keys. Every one is a `box` with `hard:true, mode:1`, which means round 0, bevel 0
  // and one shared batch key — the entire picture is ONE draw call, and its colours, which are
  // the only thing that distinguishes a bottle from a bag, are per-instance and free.
  //
  // Read against the room, which is the point of it: the case halfway through the lead curtain at
  // SEC − .82 is a dark blue-grey hard-shell with a handle, and the case on the screen is a
  // hard-shell with a telescopic handle. The player can check the screen against the belt.
  AirSec.openC = C('#7fe0a4'); AirSec.shutC = C('#e07a4a');
  AirSec.cellOn = C('#7fd8c4'); AirSec.cellOff = C('#22424a');
  //
  // GRADED FOR THE POST CHAIN, NOT FOR THE SWATCH. Emissive panels go through bloom, and the
  // first cut of this picture used the colours above at glow .28 across the board: every orange
  // in it bleached to the same flat yellow, the bright case outline and the mid organic fill
  // ended at identical luminance, and the whole thing came back as exactly the coloured
  // rectangle this zone exists to get rid of. The values below are darker than an X-ray looks
  // on a spec sheet *because* they are about to be lifted, and the glow is spent where the
  // reading is — bright on the shell of the case, low on the large organic fill, lowest on the
  // dense material, so the picture still has a dark end after the bloom has had it.
  const XR = {
    field: C('#050f16'),   // the screen itself, before anything is drawn on it
    belt:  C('#12303a'),   // the belt line under the case
    edge:  C('#e8a33e'),   // the shell of the case, which is the brightest thing in the picture
    org:   C('#a35f1c'),   // organic
    orgL:  C('#c98a3c'),
    orgD:  C('#6d3a11'),   // organic, densely packed
    met:   C('#2a5ea8'),   // metal
    metD:  C('#111f45'),   // dense metal
    grn:   C('#2f7d63'),   // mixed
    grnD:  C('#134438'),
    alert: C('#d4402c'),   // the flag the machine throws round something it wants a look at
    sweep: C('#cfeaff'),
    ui:    C('#8fd8c4'),
    uiD:   C('#122b33'),
  };
  // How hard each material burns. One place, so the picture can be re-graded as a picture.
  const GW = { edge: .22, org: .10, orgL: .15, orgD: .05, met: .17, metD: .05,
               grn: .14, grnD: .07, belt: .08 };

  // Where the monitor stands, and the one number in this file that is easy to get wrong. Both
  // screens here face −x, so *smaller x is nearer the viewer*, and the whole assembly has to be
  // stacked front to back in that direction: bezel −0.177, picture −0.161…−0.171, glass −0.150,
  // casing centred on 0.00 and 0.28 thick. The first cut of this had the glass at −0.144 and the
  // casing front face at −0.1925 — the casing was in FRONT of its own screen, and the shot came
  // back a plain black slab with the picture sealed inside it. Anything moved here moves against
  // the layer stack below.
  //
  // The casing spans x −0.14 … 0.14, which is what buries the shell's three fake scan bars at
  // −0.095…−0.075 and its small dark panel at −0.07…−0.05. That containment is the whole reason
  // it is this deep; see the note at the top of the file.
  const MY = 1.42;
  box(SEC - 2.40, MY, OPZ, .28, .74, 1.00, col.charcoal,
    { tag: '安检', hard: true, gloss: .30 });
  // the glass of it, standing 1.8 cm proud of the casing the way a bezel-less panel does
  box(SEC - 2.55, MY, OPZ, .016, .60, .86, XR.field,
    { tag: '安检', hard: true, mode: 1, glow: .07 });

  // The picture area, in normalised coordinates so the layout can be read as a picture rather
  // than as forty-one sets of world metres. u runs 0→1 left to right *as seen from the queue*
  // (the screen faces −x, and a camera looking +x has +z on its right), v runs 0→1 bottom to top.
  const IY = 1.40, IH = .38, IW = .72;
  const uZ = u => OPZ - IW / 2 + u * IW;
  const vY = v => IY - IH / 2 + v * IH;
  // Each layer stands 1.2 mm in front of the one under it, so the nine of them are 1.1 cm deep in
  // total and all of them sit behind the front of the bezel. Higher layer = smaller x = nearer
  // the viewer = drawn on top, which is the order the picture is written in below.
  const face = lay => SEC - 2.5608 - lay * .0012;
  const sq = (u0, v0, u1, v1, c, lay, gw) => box(
    face(lay), (vY(v0) + vY(v1)) / 2, (uZ(u0) + uZ(u1)) / 2,
    .006, Math.max(.004, (v1 - v0) * IH), Math.max(.004, (u1 - u0) * IW), c,
    { tag: '安检', hard: true, mode: 1, glow: gw === undefined ? .10 : gw });

  // [u0, v0, u1, v1, colour, layer] — the case, and what is in it.
  const PIC = [
    [.00, .050, 1.0, .082, XR.belt, 0, GW.belt],   // the belt running under it
    // The case. Drawn as a bright shell with the soft fill inset inside it, so the outline
    // survives as an outline instead of merging with what it contains — and set in from the
    // edges of the picture, because a bag that fills its own frame is a rectangle again.
    [.135, .190, .875, .795, XR.edge, 1, GW.edge],
    [.152, .212, .858, .773, XR.org, 2, GW.org],
    [.190, .108, .268, .188, XR.metD, 2, GW.metD], // wheels, under the case, not in it
    [.742, .108, .820, .188, XR.metD, 2, GW.metD],
    [.430, .797, .600, .838, XR.grn, 2, GW.grn],   // the grab handle over the top
    [.430, .762, .462, .805, XR.grn, 2, GW.grn],
    [.568, .762, .600, .805, XR.grn, 2, GW.grn],
    [.268, .270, .762, .652, XR.orgD, 3, GW.orgD], // clothes, packed hard in the middle
    [.168, .310, .262, .585, XR.orgD, 3, GW.orgD],
    [.180, .548, .470, .730, XR.met, 4, GW.met],   // a laptop, lying flat across the top
    [.200, .570, .450, .708, XR.metD, 5, GW.metD],
    [.276, .224, .306, .770, XR.met, 5, GW.met],   // the two rails of the telescopic handle
    [.704, .224, .734, .770, XR.met, 5, GW.met],
    [.582, .282, .682, .590, XR.grn, 5, GW.grn],   // a bottle, which is why the flag goes up
    [.478, .224, .596, .324, XR.orgD, 5, GW.orgD], // a shoe, in the bottom corner
    [.322, .300, .436, .412, XR.grn, 5, GW.grn],   // a coil of cable
    [.762, .330, .852, .424, XR.metD, 5, GW.metD], // keys and coins
    [.602, .590, .662, .642, XR.grnD, 6, GW.grnD], // the cap of the bottle
    [.352, .332, .406, .380, XR.org, 6, GW.org],   // the hole in the middle of the coil
    [.200, .690, .450, .706, XR.met, 6, GW.met],   // the lid line of the laptop
    // Speckle. A scan is a noisy picture and a picture with no noise in it reads as a diagram —
    // six flecks is enough to stop the fill looking like flat paint.
    [.340, .676, .376, .706, XR.orgL, 6, GW.orgL],
    [.530, .690, .570, .722, XR.orgL, 6, GW.orgL],
    [.640, .678, .676, .710, XR.orgL, 6, GW.orgL],
    [.508, .432, .540, .470, XR.orgL, 6, GW.orgL],
    [.780, .556, .818, .594, XR.orgL, 6, GW.orgL],
    [.212, .246, .248, .280, XR.orgL, 6, GW.orgL],
  ];
  for (const [u0, v0, u1, v1, c, lay, gw] of PIC) sq(u0, v0, u1, v1, c, lay, gw);

  // The flag the machine throws round the bottle. Four bars rather than a filled rectangle,
  // because a filled one would hide what it is pointing at, and because a hollow red box is what
  // every threat-detection overlay in the world draws. It blinks; see the tick.
  const [au0, av0, au1, av1] = [.556, .256, .872, .672];
  AirSec.alert.length = 0;
  AirSec.alert.push(
    sq(au0, av1 - .018, au1, av1, XR.alert, 7, .30),
    sq(au0, av0, au1, av0 + .018, XR.alert, 7, .30),
    sq(au0, av0, au0 + .011, av1, XR.alert, 7, .30),
    sq(au1 - .011, av0, au1, av1, XR.alert, 7, .30));

  // The scan head. A bright bar that crosses the picture once every 3.2 s, which is the one
  // thing that makes a screen read as a machine that is working rather than a printed poster.
  AirSec.sweep = sq(0, .055, .016, .865, XR.sweep, 8, .46);
  AirSec.z0 = uZ(.012); AirSec.zw = uZ(.988) - uZ(.012);

  // ---- the chrome round the picture: the two strips and what is written on them
  sq(.00, 1.055, 1.0, 1.300, XR.uiD, 1, .10);     // the title strip above the picture
  sq(.00, -.235, 1.0, -.045, XR.uiD, 1, .10);     // the status strip below it
  // the key: what the three colours mean, which is the one thing a passenger reading over the
  // operator's shoulder could actually learn from this screen
  sq(.040, -.200, .080, -.085, XR.org, 2, .40);
  sq(.270, -.200, .310, -.085, XR.met, 2, .40);
  sq(.500, -.200, .540, -.085, XR.grn, 2, .40);
  // eight cells that fill behind the scan head
  AirSec.cells.length = 0;
  for (let i = 0; i < 8; i++)
    AirSec.cells.push(sq(.448 + i * .0325, 1.105, .476 + i * .0325, 1.255, AirSec.cellOff, 2, .06));

  // Real writing on it. `lift` puts each character 12 mm proud of the plate it is written on, so
  // the glyphs sit in front of the strips and behind the bezel.
  const GX = face(1);
  const scr = (txt, u, y, size, c, gw) =>
    glyphs(GX, y, uZ(u), -PI / 2, txt,
      { size, gap: size * .26, color: c, mode: 1, glow: gw === undefined ? .36 : gw, tag: '安检' });
  scr('行李检查', .152, vY(1.180), .054, XR.ui);
  scr('通道一', .862, vY(1.180), .054, XR.ui);
  scr('有机', .160, vY(-.140), .046, XR.orgL, .30);
  scr('金属', .390, vY(-.140), .046, XR.met, .34);
  scr('混合', .620, vY(-.140), .046, XR.grn, .32);
  AirSec.status.length = 0;
  for (const g of scr('请复检', .865, vY(-.140), .050, XR.alert, .42)) AirSec.status.push(g);

  // The bezel, last and nearest the eye: four bars framing the glass so the layered picture reads
  // as something *inside* a monitor rather than a stack of plates floating over a desk. Its front
  // face is at −0.184, ahead of the frontmost picture layer at −0.1734, so nothing in the picture
  // can poke through the frame.
  const BZX = SEC - 2.577;
  for (const [by, bz, bh, bw] of [[MY + .30, 0, .04, .90], [MY - .30, 0, .04, .90],
                                  [MY, -.43, .64, .04], [MY, .43, .64, .04]])
    box(BZX, by, OPZ + bz, .014, bh, bw, col.charcoal, { tag: '安检', hard: true, gloss: .34 });

  // The wash of the screen onto the operator's hands and the desk in front of it. The shell
  // already lights her from behind the monitors; this is the picture itself, which is a 0.86 m
  // panel of orange and blue at glow .3 and would otherwise light nothing at all.
  A.light(SEC - 2.80, 1.42, OPZ, [0.62, 0.74, 0.92], .26, 1.9);

  // =============================================================== 2. the tunnel curtains
  //
  // The shell hangs one 1.10 m panel at each mouth. A lead curtain is not a panel, it is a comb
  // of heavy rubber strips, and the difference is visible in one specific place: the case at
  // SEC − .82 is halfway through the landside mouth, and strips let it *part* them. The three
  // middle strips on the landside are hung 0.32 m short because the case is holding them up.
  const RUB = C('#1c1f24');
  for (const [cx, lifted] of [[SEC - .93, true], [SEC + .93, false]])
    for (let i = 0; i < 7; i++) {
      const dz = -.48 + i * .16;
      const rides = lifted && Math.abs(dz) <= .24;
      const y0 = rides ? .92 : .60;
      box(cx, (y0 + 1.40) / 2, XZ + dz, .035, 1.40 - y0, .145, RUB,
        { tag: '安检', hard: true, gloss: .12, ry: (i - 3) * .018 });
    }

  // =============================================================== 3. the roller tables
  //
  // In and out. The powered belt only runs the length of the machine; what a passenger actually
  // puts a tray down on, and takes it off, is a gravity roller table at each end — and their
  // absence was why the belt appeared to begin and end in mid-air.
  const roller = (cx, len, n, tag) => {
    box(cx, .42, XZ, len, .18, 1.00, col.steelD,
      { tag, hard: true, gloss: G.metal, ...A.M_METAL });
    for (const s of [-1, 1])
      cyl(cx + s * (len / 2 - .12), .20, XZ, .045, .40, col.steelD, { tag, gloss: G.metal });
    const pitch = (len - .14) / n;
    for (let i = 0; i < n; i++)
      cyl(cx - len / 2 + .07 + (i + .5) * pitch, .545, XZ, .042, .92, col.chrome,
        { tag, gloss: G.metal, rx: PI / 2 });
    shade(cx, XZ, len + .16, 1.10, .34);
  };
  roller(SEC - 3.05, .80, 6, '安检');          // x −1.05 .. −0.25, landside, in front of the belt
  roller(SEC + 2.97, .70, 5, '托盘');          // x  5.02 ..  5.72, airside, where the trays come off
  solid(SEC - 3.50, SEC - 2.60, XZ - .55, XZ + .55);
  solid(SEC + 2.57, SEC + 3.37, XZ - .55, XZ + .55);

  // The trays coming off the airside end, stacked the way a 安检 tray return actually is: a
  // wheeled cage with a leaning pile in it, because somebody has to wheel them back round.
  const TRAY = C('#3c4653');
  box(SEC + 3.02, .28, XZ + 1.00, .62, .56, .96, col.slab,
    { tag: '托盘', hard: true, gloss: .24, ...A.M_METAL });
  for (const s of [-1, 1])
    cyl(SEC + 3.02 + s * .22, .05, XZ + 1.00, .055, .10, col.charcoal, { tag: '托盘', gloss: .30 });
  for (let i = 0; i < 5; i++) {
    box(SEC + 3.02, .60 + i * .052, XZ + 1.00, .52, .05, .84, TRAY,
      { tag: '托盘', hard: true, gloss: .28, ry: (i % 2 ? .022 : -.014) });
    box(SEC + 3.02, .623 + i * .052, XZ + 1.00, .42, .012, .72, C('#586576'),
      { tag: '托盘', hard: true, gloss: .30, ry: (i % 2 ? .022 : -.014) });
  }
  solid(SEC + 2.66, SEC + 3.38, XZ + .48, XZ + 1.52);
  thing('托盘', SEC + 3.02, 1.05, XZ + 1.00, '请把托盘放回这里。',
    'Put the tray back here, please.',
    '托 to hold up + 盘 tray. 放回 to put back. The stack by the end of the belt is where they go.',
    { focus: [SEC + 2.30, XZ + 1.00], reach: 2.0 });

  // =============================================================== 4. 请出示登机牌
  //
  // The one sentence this whole zone is about, over the stand where it is said. Landside, facing
  // −x, which is the direction the queue arrives from — the same way the officer faces. The two
  // pips on it are the lane's own state, read off the shell's barrier in the tick below: red
  // while it is shut, green while somebody is being let through.
  const SGX = SEC - 1.45, SGZ = LANE.z1 + .10;
  cap(SGX, 1.50, SGZ, .035, .84, .035, col.steelD, { tag: '安检', gloss: G.metal });
  box(SGX, 1.92, SGZ, .05, .30, 1.10, col.blueSign, { tag: '安检', hard: true, gloss: .20 });
  glyphs(SGX - .033, 1.92, SGZ, -PI / 2, '请出示登机牌',
    { size: .125, gap: .033, color: col.white, mode: 1, glow: .55, tag: '安检' });
  AirSec.pips.length = 0;
  for (const s of [-1, 1])
    AirSec.pips.push(box(SGX - .034, 2.14, SGZ + s * .36, .04, .07, .17, AirSec.shutC,
      { tag: '安检', hard: true, mode: 1, glow: .34 }));

  // the lane number, hung off the gantry beam the shell already put across the mouth of the
  // channel. 安检通道 — a Chinese checkpoint numbers its lanes and says so overhead.
  for (const s of [-1, 1])
    cap(SEC - 1.90, 2.96, .20 + s * .52, .012, .20, .012, col.steelD, { gloss: G.metal });
  box(SEC - 1.90, 2.82, .20, .06, .34, 1.34, col.blueSign,
    { tag: '安检', hard: true, gloss: .20 });
  glyphs(SEC - 1.935, 2.82, .20, -PI / 2, '安检通道',
    { size: .19, gap: .05, color: col.white, mode: 1, glow: .55, tag: '安检' });

  // =============================================================== 5. 禁止携带 — the poster
  //
  // On the landside face of the partition beside the belt slot, where the queue stands still long
  // enough to read it. Three roundels with a bar through them: a bottle, a lighter, a blade.
  const PZ = -2.90, PX = SEC - .33;
  box(PX, 1.62, PZ, .04, 1.12, .92, col.white, { tag: '安检', hard: true, gloss: .16 });
  glyphs(PX - .026, 2.02, PZ, -PI / 2, '禁止携带',
    { size: .155, gap: .04, color: col.redD, mode: 1, glow: .10, tag: '安检' });
  for (let i = 0; i < 3; i++) {
    const pz = PZ - .28 + i * .28;
    cyl(PX - .040, 1.44, pz, .115, .012, col.cream, { tag: '安检', gloss: .14, rz: PI / 2 });
    // what it is: a bottle, a lighter, a blade — three silhouettes, one box each plus a neck
    if (i === 0) {
      box(PX - .050, 1.42, pz, .008, .13, .07, col.charcoal, { tag: '安检', hard: true });
      box(PX - .050, 1.51, pz, .008, .05, .03, col.charcoal, { tag: '安检', hard: true });
    } else if (i === 1) {
      box(PX - .050, 1.42, pz, .008, .13, .06, col.charcoal, { tag: '安检', hard: true });
      box(PX - .050, 1.51, pz, .008, .04, .02, col.charcoal, { tag: '安检', hard: true });
    } else {
      box(PX - .050, 1.45, pz, .008, .03, .17, col.charcoal, { tag: '安检', hard: true, rx: .5 });
      box(PX - .050, 1.39, pz - .05, .008, .035, .07, col.charcoal, { tag: '安检', hard: true });
    }
    box(PX - .058, 1.44, pz, .008, .028, .23, col.red, { tag: '安检', hard: true, rx: -PI / 4 });
  }

  // =============================================================== 6. airside — 请整理物品
  //
  // The bench everybody repacks at, against the airside face of the partition and clear of the
  // lane, because the walk out of the arch is the one line through this zone that must stay open.
  box(SEC + .85, .42, 2.90, .55, .84, 1.60, col.slab,
    { tag: '安检', hard: true, gloss: .24, ...A.M_STONE });
  box(SEC + .85, .87, 2.90, .62, .06, 1.70, col.steelD,
    { tag: '安检', hard: true, gloss: G.metal });
  // The collider is deliberately shorter than the bench it stands under. `clampMove` inflates it
  // by the 0.30 m body radius, so a collider running to z 2.15 would put its inflated edge on
  // LANE.z1 = 2.05 and start eating the one walkable lane in the building. 2.45 leaves a 0.30 m
  // margin between the inflated bench and the mouth of the lane, measured, not eyeballed.
  solid(SEC + .55, SEC + 1.15, 2.45, 3.55);
  glyphs(SEC + .46, 1.70, 2.90, -PI / 2, '请整理物品',
    { size: .12, gap: .035, color: col.jade, mode: 1, glow: .22, tag: '安检' });

  // the bin the bottles go in, landside of the arch and south of the lane
  const BNZ = LANE.z0 - .75;
  cyl(SEC - 1.45, .32, BNZ, .21, .64, col.steelD,
    { tag: '安检', gloss: G.metal, ...A.M_METAL });
  cyl(SEC - 1.45, .67, BNZ, .22, .06, col.charcoal, { tag: '安检', gloss: .30 });
  cyl(SEC - 1.45, .71, BNZ, .13, .03, col.black, { tag: '安检', gloss: .20 });
  solid(SEC - 1.68, SEC - 1.22, BNZ - .23, BNZ + .23);

  AirSec.isOpen = A.securityIsOpen;
  AirSec.wasOpen = null;
  AirSec.ok = true;
};

// Anything that moves registers here and the shell dispatches it once a frame. Do not start your
// own timer: `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in minutes.
// A tick that throws is dropped for the rest of the run rather than stopping the terminal.
//
// NOTE ON OWNERSHIP: the flaps and the arch lamps are still driven by js/airport.js:3191-3205 off
// its own `secBar`/`secArrow`/`secLamp`, which are locals of the shell's `build()`. This zone
// cannot take that over without editing js/airport.js, which belongs to the Mech — so it *reads*
// the barrier through `A.securityIsOpen()` and drives its own signage off it. See the ticket in
// the report: once the flap block moves here, it goes in this function and nothing else changes.
//
// Allocates nothing. Writes matrices in place, swaps pre-built colour arrays by reference.
AirFit['security'].tick = t => {
  if (!AirSec.ok) return;
  // ---- the scan head, one pass across the picture every 3.2 s
  const k = (t % 3.2) / 3.2;
  const z = AirSec.z0 + k * AirSec.zw;
  const p = AirSec.sweep;
  p.m[14] = z; p.cz = z;
  // ---- and the eight cells filling in behind it
  const lit = (k * 8) | 0;
  for (let i = 0; i < 8; i++) {
    const c = AirSec.cells[i];
    const on = i <= lit;
    c.color = on ? AirSec.cellOn : AirSec.cellOff;
    c.glow = on ? .34 : .06;
  }
  // ---- the flag round the bottle, blinking the way a live overlay does
  const b = .18 + .30 * (0.5 + 0.5 * Math.sin(t * 5.4));
  for (let i = 0; i < AirSec.alert.length; i++) AirSec.alert[i].glow = b;
  // ---- the lane's own state, on the officer's sign. Read, never written: the barrier is the
  // shell's, and two writers on one flag is how a gate ends up open and red at the same time.
  const open = AirSec.isOpen ? !!AirSec.isOpen() : false;
  if (open !== AirSec.wasOpen) {
    AirSec.wasOpen = open;
    for (let i = 0; i < AirSec.pips.length; i++)
      AirSec.pips[i].color = open ? AirSec.openC : AirSec.shutC;
    for (let i = 0; i < AirSec.status.length; i++)
      AirSec.status[i].color = open ? AirSec.openC : AirSec.shutC;
  }
};
