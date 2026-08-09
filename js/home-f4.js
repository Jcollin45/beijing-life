// F4 物业·活动室 — the community floor
//
// Registered into FlatFit (declared at the top of js/world.js). The deck contract is TOWER.md's:
// FlatFit key 'f4' -> deck 4 -> y 9.30. Every height below is written `Y + h` off `A.y0`, never
// off a literal, because a room that hardcodes its deck builds itself in the lobby.
//
// WHAT THE SHELL GIVES A FLOOR ABOVE THE SECOND, WHICH IS ALMOST NOTHING.
//
// `buildShell` in js/world.js pours a floor, a ceiling and four walls for deck 0 and deck 2 and
// for no other deck; `buildShafts` builds its landings inside `for (const f of [0, 2])`. So on
// deck 4 there is no slab, no ceiling, no perimeter wall, no shaft enclosure and no lift doors —
// this file is the shell as well as the fit-out, and if it did not pour a floor the deck would be
// a hole. The one thing the shell does own everywhere is the car itself, which travels.
//
// The landing built here is therefore provisional, and it takes itself out of the build the
// moment the shell grows one: `shellLanding` below scans `A.props` for anything the shell has
// already put in the shaft mouth at this deck's height, and skips the whole block if it finds it.
// See the ticket at the foot of this file.
//
// WHAT THIS FLOOR IS.
//
// 物业管理处 and the 活动室, which in a Beijing estate are the same room seen from two sides: a
// service window with a queue rail and a fee board on one side of a partition, and on the other a
// hall with a table-tennis table, a 麻将 table, a stage, stacked plastic chairs and the outdoor
// steel exercise machines brought indoors. Over the window, red: this is a 党群服务站 and every
// one of them carries the same gold-on-red fascia. It is a public floor, so it is one open plan
// rather than a corridor of doors, and that is what makes it worth lighting properly — a grid of
// fluorescent battens overhead, a glazed wall to the street on the -z side, and the service
// hatch glowing in the corner of it.
//
// THE PLAN, in the building's own coordinates:
//
//   x -6.0 .. 6.0, z -5.0 .. 6.2, clear height 2.72
//
//   z  4.9 .. 6.2   x -0.4..1.4  LIFT_B (dead shaft)   x 1.6..3.4  LIFT (working)
//   x -6.0 .. -1.6, z 1.9 .. 6.2   物业办公室 — enclosed, seen through its hatch and its door
//   x -1.6 ..  6.0, z 3.2 .. 4.9   the landing, with the 公告栏 down its west wall
//   x  3.5 ..  6.0, z 4.9 .. 6.2   阅览角 — 报刊架, bookshelf, the water dispenser
//   x -6.0 ..  6.0, z -5.0 .. 3.2  活动室 — the hall
//   z -5.0                          the window wall
const HomeF4 = { built: false };

// ---------------------------------------------------------------- 收费标准, as data
//
// The estate's published rates. They are rendered onto the fee board in the service window below,
// and F6's flatshare reads them for its own 水电费 ledger two floors up — which is the point:
// there is one set of rates in this building and one place they are written down. Before this they
// were a local array inside the builder, so F6's whiteboard quoted totals with no unit and no rate
// behind them and the two could not be told apart from a guess.
//
// Top level, not inside the builder. `Object.keys(FlatFit)` runs the builders in script order, so
// f6 builds BEFORE f4 and would read an empty object if this lived in the closure. Every
// js/home-*.js top-level statement has run by the time World's Lazy body calls `build()`.
HomeF4.FEES = [
  { hz: '物业服务费', rate: '2.10', unit: '元/㎡·月', key: 'property' },
  { hz: '电梯运行费', rate: '8.00', unit: '元/户·月', key: 'lift' },
  { hz: '公共水电费', rate: '0.35', unit: '元/㎡·月', key: 'utilities' },
  { hz: '生活垃圾费', rate: '6.00', unit: '元/户·月', key: 'refuse' },
  { hz: '地面车位费', rate: '150.00', unit: '元/月', key: 'parking' },
];
HomeF4.feeRate = key => {
  const f = HomeF4.FEES.find(r => r.key === key);
  return f ? f.rate + ' ' + f.unit : '';
};

// ---------------------------------------------------------------- 公告栏, as data
//
// What the estate has taped up, and when. Every sheet carries the day window it is current for, so
// the board is dated rather than eternal: the 停水 notice for the ninth is a notice about the
// ninth, and on the tenth it is a sheet with 已过期 stamped across it that nobody has taken down —
// which is what a real 公告栏 looks like and why it is worth reading twice.
//
// `noticeFor` is pure and allocation-free per call, so a caller may ask it every second without
// thinking about it. It answers -1 before, 0 during, 1 after. The geometry for every sheet is
// built once; `HomeF4.setDay` only moves the alpha on the stamps, so nothing here rebuilds and
// nothing here ticks.
HomeF4.NOTICES = [
  { id: 'water',  from: 6,  to: 9  },
  { id: 'lift',   from: 8,  to: 12 },
  { id: 'refuse', from: 1,  to: 400 },   // the recycling rules do not expire
  { id: 'cat',    from: 1,  to: 21 },
  { id: 'dance',  from: 1,  to: 400 },   // nor does the dance troupe
];
HomeF4.noticeFor = (id, day) => {
  const n = HomeF4.NOTICES.find(r => r.id === id);
  if (!n) return 0;
  const d = day === undefined || day === null ? 1 : day;
  return d < n.from ? -1 : d > n.to ? 1 : 0;
};

FlatFit['f4'] = A => {
  if (!A || typeof A.box !== 'function' || !A.zone) {
    console.warn('home-f4: toolkit A missing box/zone — floor 4 not built');
    return HomeF4;
  }
  const { C, M, MAT } = A;
  const box = A.box, cyl = A.cyl, ball = A.ball, wall = A.wall, flat = A.flat;
  const cap = A.cap || A.capsule || A.box;
  const taper = A.taper || A.box;
  const ceilQ = A.ceiling || A.flat;
  const glyph = A.glyph || (() => []);
  const flatText = A.flatText || (() => []);
  const stop = A.stop || (() => null);
  const thing = A.th || (() => null);
  const light = A.light || (() => null);
  const shade = A.shade || (() => null);
  const glowPool = A.glow || (() => null);
  const sky = A.sky || (p => p);
  const city = A.city || (() => null);
  const PI = Math.PI;

  // ------------------------------------------------------------------ the coordinate contract
  const Y = A.y0;                                   // deck 4 — 9.30 under the contract
  const X0 = -6.0, X1 = 6.0, Z0 = -5.0, Z1 = 6.2;
  const H = 2.72, CY = Y + H;                       // clear height, and the ceiling plane
  const LF = A.LIFT   || { x0: 1.6, x1: 3.4, z0: 4.9, z1: 6.2 };
  const LB = A.LIFT_B || { x0: -0.4, x1: 1.4, z0: 4.9, z1: 6.2 };
  const DOORW = 0.80, DOORH = 2.10;
  const CXL = (LF.x0 + LF.x1) / 2;                  // the working shaft's centreline

  // The office block, and the two lines everything in this file is measured against.
  const OFX = -1.6;        // its east wall — the 公告栏 hangs on this
  const OFZ = 1.9;         // its front wall — the service window is in this
  const CUPX = -0.45;      // the dead shaft's west flank, which closes the pocket behind the board

  // Floor layers. Kept far enough apart that nothing is ever coplanar: the field quads at +4 mm,
  // anything laid over them at +14, the contact shadows at +22, and everything that stands on the
  // floor at +26. Ten millimetres is the rule; these are ten or more at every step.
  const FLD = Y + .004, MAT_Y = Y + .014, SHY = Y + .022, FL = Y + .026;

  // ------------------------------------------------------------------ has the shell caught up?
  //
  // Computed before this file builds anything, so it can only ever see the shell's work. If
  // js/world.js has grown per-deck landings, everything in the LANDING section below is skipped
  // and the shell's doors are the ones you see.
  const shellLanding = !!(A.props && A.props.some(p => {
    const m = p && p.m;
    return m && m[13] > Y + .05 && m[13] < Y + H &&
           m[14] > LF.z0 - .70 && m[14] < LF.z0 + .45 &&
           m[12] > LF.x0 - 1.20 && m[12] < LF.x1 + 1.20;
  }));

  // ------------------------------------------------------------------ palette
  // Public building, not a home: cream paint over a grey-green dado, beige floor tile, grey
  // terrazzo where the walking is, and then the two colours this room actually owns — the red of
  // 党群服务站 signage and the yellow-green of estate gym steel.
  const col = {
    wall:  C('#ccc5b5'), wallD: C('#c7bfab'), dado: C('#93a099'), dadoT: C('#6f7d77'),
    // The hall floor is 4% off its old #d5c9b0. It used to be drawn in mode 9 — the shader's
    // procedural pavement — which multiplies the surface down by about 7% on average through the
    // dirt in its joints. Mode 9 is gone below, replaced by the real tile photograph, so that
    // darkening had to be put back into the paint or the largest surface in the room would have
    // gained texture and lost value at the same time.
    ceil:  C('#c9c4b9'), tile:  C('#c9bda3'),
    stone: C('#b0a99c'), stoneD:C('#918a7e'), vinyl: C('#9aa3a2'),
    steel: C('#b2b8bd'), steelD:C('#8b9298'), steelX:C('#697076'),
    alu:   C('#c3c9cd'), glass: C('#cfdde4'), dark:  C('#3d4348'),
    red:   C('#ae2318'), redD:  C('#7d160f'), redL:  C('#c9382a'),
    gold:  C('#e5bc63'), ink:   C('#241c16'), grey:  C('#7d848a'),
    paper: C('#d4cfc2'), paperY:C('#d9d1bb'), paperB:C('#c7cdd1'),
    green: C('#1e7a45'), greenL:C('#4ec489'),
    white: C('#d0cec6'), warm:  C('#fbf3dc'), dead:  C('#bbb8ae'),
    woodD: C('#5d4229'), woodL: C('#b08d5f'),
    navy:  C('#2b3a52'), blue:  C('#1f6fb2'), lime:  C('#c3d13f'),
    plastic:C('#c0392b'),
    sky:   C('#b7cfe2'), skyLo: C('#d6e0e6'), towerF:C('#9db0be'), towerN:C('#7f93a3'),
    leaf:  C('#4a7b42'), leafD: C('#33603a'), terra: C('#a2603f'),
    skin:  C('#d9ab86'), hair:  C('#241d1a'), shirt: C('#cbcdcd'),
    rubber:C('#3a3f42'), felt:  C('#2c6a52'),
  };
  const PLAST  = { hard: true, gloss: .12, ...MAT.plaster };
  const METAL  = { hard: true, gloss: .52, ...MAT.metal };
  const SLABM  = { hard: true, gloss: .40, ...MAT.slab };
  const TIMBER = { hard: true, gloss: .20, ...MAT.timber };

  // ------------------------------------------------------------------ the material kit (ART.md)
  //
  // `matScale` is METRES PER REPEAT, and the one number that has to be right. Tiles141 carries a
  // 6x6 grid inside one repeat, so the tile you actually get is matScale / 6:
  //
  //   MAT.tile's .34  ->  57 mm    a mosaic, and below this renderer's mip floor at room
  //                                distance, which is why this floor read as flat white with
  //                                a grid drawn on it rather than as tile at all
  //   1.80            ->  300 mm   the domestic bathroom tile in ART.md's table
  //   2.70            ->  450 mm   what is under this room
  //
  // 450 is the call, not 300: this is a public activity hall on a landing shared by twelve
  // floors, and an institutional floor is laid in large-format tile precisely because there is
  // less grout in it to mop. A 300 mm tile across 12 x 8 m would also put roughly 1,100 grout
  // lines in frame, which at this camera distance is back to being a grid drawn on white.
  //
  // `matAmt` is detail, not lift — the shader divides the sample by this photograph's own
  // measured mean (js/gl.js `uMatMean` <- `textureMean(opt.mat)`), so raising it adds contrast
  // around the colour the scene chose without moving the average. That is what makes it safe to
  // push here on a room that is already washing bright.
  const FLOORT = { mat: 'tile',    matScale: 2.70, matAmt: .28, nrmAmt: .50 };
  // Upholstery, and a limit worth recording so the next person does not spend a render cycle on
  // it: at a CORRECT .35 m repeat Fabric081C's threads are 2–5 mm, which at this room's orbit
  // distance is well under one pixel and mips to flat. A weave is a close-up material and cannot
  // be made to read at 7.5 m without lying about the size of the cloth. So the work here is done
  // by nrmAmt — height, which perturbs the shading across the whole form — and not by matAmt,
  // which is colour and would only wash the red out. .78 rather than ART.md's .60 for that reason.
  const SOFT   = { mat: 'fabric',  matScale: .35,  matAmt: .28, nrmAmt: .78 };
  // Painted steel tube: frames, legs, undercarriages. `metal` is near-featureless and carries a
  // large lift, so matAmt stays low and this entry is really here for the normal map's relief.
  const FRAME  = { mat: 'metal',   matScale: .55,  matAmt: .16, nrmAmt: .50 };
  // Table carcasses. The same photograph MAT.timber already uses at the same .90, with the
  // height turned up — a 麻将 table's apron is chipboard with a grain printed on it.
  const CARC   = { mat: 'wood',    matScale: .90,  matAmt: .30, nrmAmt: .50 };
  // Fired clay, for the planters. There is no terracotta in the kit; `concrete` at a fine scale
  // is the closest thing in it to the grain of an unglazed pot.
  const CLAY   = { mat: 'concrete', matScale: .60, matAmt: .15, nrmAmt: .42 };
  // Ceiling: flatter than a wall. .65 rather than ART.md's 2.40 — the measured note in
  // js/assets.js is explicit that plaster wants 0.60–0.65 indoors and that at 2.40 a single
  // trowel swirl comes out a metre wide. Where the two disagree, the measurement wins.
  const CEILM  = { mat: 'plaster', matScale: .65,  matAmt: .13, nrmAmt: .40 };

  // ------------------------------------------------------------------ contact shadow, corrected
  //
  // `A.shade(x, z, w, d, a, y)` is drawn as mode 2 in js/gl.js, and mode 2 is a RADIAL quadratic
  // falloff over the patch, not a flat one:
  //
  //     r = |uv - .5| * 2 ;  alpha = a * (1 - r)^2
  //
  // So the patch is an ellipse inscribed in the quad, darkest at the middle and reaching zero at
  // the edge midpoints — and past zero, at sqrt(2), in the corners. The consequence is the whole
  // reason the furniture on this floor did not sit on it: a patch sized to an object's own
  // FOOTPRINT is already at zero exactly where that object's legs come down.
  //
  // The 乒乓球台 was the worst case and is worth the arithmetic. Its patch was 2.90 x 1.70, so
  // semi-axes 1.45 and .85; its four feet stand at (±1.18, ±.60), which is
  //     r = sqrt((1.18/1.45)^2 + (.60/.85)^2) = 1.08
  // and 1.08 > 1. The table was carrying a soft smudge under the middle of the net and exactly
  // nothing under the four parts of it that touch the floor. The 麻将 table (legs at r = .89 ->
  // 0.4% of a), its chairs (legs at r = .94 -> 0.09% of a) and the 发财树 pots (rim at r = .70)
  // were all the same mistake at different sizes.
  //
  // No single radial patch can fix a corner-legged object: oversize it until the corners fall
  // inside and the quadratic has already thrown the alpha away. So grounding is two layers —
  // one broad soft patch for the mass overhead, plus one tight patch per foot, centred ON the
  // foot so it sits at r = 0 and gets the full `a`. The tight ones are what ground it.
  //
  // These cost nothing to add: js/game.js collects every patch into a single instanced mode-2
  // batch (`R.beginCollect()` before the `scene.shadows` loop), so this is instance data, not
  // draw calls.
  const foot = (x, z, r = .17, a = .50) => shade(x, z, r * 2, r * 2, a, SHY);

  // Writing always stands 12 mm off the face it is written on, along the yaw it is given, so the
  // face passed in is the front of the plate and the yaw is the one the reader is looking at.
  const G = (x, y, z, yaw, text, o) => glyph(x, y, z, yaw, text, { color: col.ink, ...o });
  // A thing you can look at and say. `focus` is a spot the body can genuinely stand on — the
  // colliders below inflate by the 0.30 m body radius, so every focus here has been kept at least
  // that far off whatever it belongs to.
  const TH = (hz, x, y, z, zh, en, note, fx, fz, reach = 1.9, tag) =>
    thing(hz, x, y, z, zh, en, note, { focus: [fx, fz], reach, tag: tag || hz });

  // ===================================================================== 1. THE SLAB
  //
  // Laid as adjoining rectangles rather than one field with borders over it: two quads on one
  // plane is the stripe the coplanar rule exists for, and a floor is the largest plane in a room.
  // Beige 600 tile in the hall, grey terrazzo where the walking is, grey vinyl in the office.
  // The hall, in 450 mm institutional tile. Both quads have to carry the same entry: they are one
  // floor field split in two to keep the tile and the terrazzo off a shared plane, and a different
  // scale on either side of x=-1.6 would put a seam down the middle of the room.
  //
  // These used to be `mode: 9`, which is not tile — it is the shader's procedural PAVEMENT, a
  // hardcoded 0.62 m slab grid with hash-varied slab tone and dirt in the joints. That grid is
  // what was in the render, and the tile photograph laid over it at MAT.tile's .34 was a 57 mm
  // mosaic that mips to nothing by the time it is 4 m from the eye. So the room's largest surface
  // was a street pavement wearing an invisible material. Mode 9 also earns nothing else indoors —
  // its wet/snow branch in js/gl.js is gated on `uIndoor < 0.5` — so it is dropped outright rather
  // than left to fight the real grout for the same pixels at a frequency it does not share.
  flat(0, FLD, -1.55, X1 - X0, 6.9, col.tile, { gloss: .16, ...FLOORT });                 // hall
  flat(2.2, FLD, 2.55, 7.6, 1.3, col.tile, { gloss: .16, ...FLOORT });                    // hall neck
  flat(-3.8, FLD, 4.05, 4.4, 4.3, col.vinyl, { mode: 9, gloss: .28, ...MAT.slab });       // office
  flat(2.2, FLD, 4.05, 7.6, 1.7, col.stone, { mode: 9, gloss: .44, ...MAT.slab });        // landing
  flat(-1.025, FLD, 5.55, 1.15, 1.3, col.stone, { mode: 9, gloss: .44, ...MAT.slab });    // pocket
  flat(4.75, FLD, 5.55, 2.5, 1.3, col.stone, { mode: 9, gloss: .44, ...MAT.slab });       // 阅览角
  // The joint between tile and terrazzo, which every one of these floors has as a brass strip.
  box(2.2, MAT_Y, 3.20, 7.6, .010, .04, C('#a98d52'), { hard: true, gloss: .55 });
  box(OFX + .02, MAT_Y, 4.05, .04, .010, 1.7, C('#a98d52'), { hard: true, gloss: .55 });

  // ===================================================================== 2. CEILING AND WALLS
  ceilQ(0, CY, (Z0 + Z1) / 2, X1 - X0, Z1 - Z0, col.ceil, { gloss: .07, glow: .02, ...CEILM });
  // Perimeter. Every quad in this renderer is single-sided and faces its yaw, so each of these
  // faces into the room: +z at the south wall, -z at the north, +x at the west, -x at the east.
  wall(0, Y + H / 2, Z0, X1 - X0, H, 0, col.wall, PLAST);
  wall(0, Y + H / 2, Z1, X1 - X0, H, PI, col.wall, PLAST);
  wall(X0, Y + H / 2, (Z0 + Z1) / 2, Z1 - Z0, H, PI / 2, col.wall, PLAST);
  wall(X1, Y + H / 2, (Z0 + Z1) / 2, Z1 - Z0, H, -PI / 2, col.wall, PLAST);
  // Skirting, standing 45 mm off each wall so it is a moulding and not a stripe in the paint.
  box(0, Y + .075, Z0 + .045, X1 - X0, .15, .09, col.stoneD, SLABM);
  box(0, Y + .075, Z1 - .045, X1 - X0, .15, .09, col.stoneD, SLABM);
  box(X0 + .045, Y + .075, (Z0 + Z1) / 2, .09, .15, Z1 - Z0, col.stoneD, SLABM);
  box(X1 - .045, Y + .075, (Z0 + Z1) / 2, .09, .15, Z1 - Z0, col.stoneD, SLABM);

  // --- the dado. One band of grey-green paint at hand height is the single thing that stops a
  // painted public room reading as a white box, and every 活动室 in the country has one. Boxes
  // standing proud of the wall, in runs that stop clear of the openings.
  const DY0 = Y + .15, DH = 1.02, DYC = DY0 + DH / 2;
  function dado(axis, plane, sgn, runs) {
    for (const [a0, a1] of runs) {
      const c = (a0 + a1) / 2, L = a1 - a0;
      if (L <= .05) continue;
      const put = (y, h, d, w, colr, g) => axis === 'x'
        ? box(c, y, d, L, h, w, colr, { hard: true, gloss: g })
        : box(d, y, c, w, h, L, colr, { hard: true, gloss: g });
      put(DYC, DH, plane + sgn * .016, .032, col.dado, .16);
      put(DY0 + DH + .015, .030, plane + sgn * .022, .044, col.dadoT, .22);
    }
  }
  dado('x', Z1, -1, [[X0, CUPX], [LF.x1 + .10, X1]]);
  dado('z', X0, 1, [[Z0, 1.62]]);
  dado('z', X1, -1, [[Z0, -0.90], [2.30, 3.45], [4.68, 4.95]]);
  dado('x', OFZ, -1, [[X0, -5.34], [-3.56, -2.64], [-1.86, OFX]]);
  dado('z', OFX, 1, [[OFZ, 3.24]]);

  // ===================================================================== 3. THE WINDOW WALL
  //
  // A shallow bay standing in front of the solid south wall rather than a hole through it: the
  // wall on this deck is this file's, but there is no outside modelled at 9 m up and a real
  // opening would look into the void. So the view is painted at the back of a 0.18 m reveal, the
  // glazing hangs in front of it, and every part of it is at z > Z0.
  //
  // Five bays between 0.30 m piers. Sill 0.95, head 2.26 — a community room glazed to the street,
  // which is what puts daylight in the hall and is half of why this floor is worth looking at.
  const WSILL = .95, WTOP = 2.26, WZ = Z0 + .012;
  const BAYS = [];
  for (let i = 0; i < 5; i++) {
    const c = -4.32 + i * 2.16;
    BAYS.push([c - .93, c + .93, c]);
  }
  // The view: sky, the block opposite, and the tops of the trees in the courtyard four floors
  // down. Registered with A.sky / A.city so the whole wall follows the hour without this file
  // knowing what the hour is. Big areas, so the glow stays in the .02–.04 band.
  for (const [b0, b1, bc] of BAYS) {
    const bw = b1 - b0;
    sky(box(bc, Y + (WSILL + WTOP) / 2, WZ, bw, WTOP - WSILL, .012, col.sky,
            { hard: true, mode: 1, glow: .034 }));
    sky(box(bc, Y + WSILL + .26, WZ + .008, bw, .52, .008, col.skyLo,
            { hard: true, mode: 1, glow: .028 }));
    // the block opposite — far layer behind, near layer in front of it
    for (const [ox, tw, th, lay] of [[-.66, .40, 1.02, 0], [-.18, .30, .72, 0],
                                     [.26, .46, 1.16, 1], [.72, .26, .58, 1]]) {
      const p = box(bc + ox, Y + WSILL + th / 2, WZ + .016 + lay * .008, tw, th, .008,
                    lay ? col.towerN : col.towerF, { hard: true, mode: 1, glow: .018 });
      city(lay, p);
    }
    // a scatter of lit windows in it, which come on by themselves at dusk
    for (let k = 0; k < 5; k++) {
      const p = box(bc - .60 + k * .30, Y + WSILL + .34 + (k % 3) * .26, WZ + .030,
                    .046, .034, .006, C('#f6d79a'), { hard: true, mode: 1, glow: 0 });
      city(2, p);
    }
    // and the courtyard trees at the bottom of the frame
    for (let k = 0; k < 4; k++)
      ball(bc - .60 + k * .40, Y + WSILL + .06, WZ + .038, .17, .10, .008, col.leafD,
           { mode: 1, glow: .012 });
  }
  // The reveal: plaster returns boxing the whole run in, so it reads as a recess and not as a
  // picture hung on the wall.
  box(0, Y + WSILL - .06, Z0 + .09, 10.9, .12, .18, col.wallD, PLAST);
  box(0, Y + WTOP + .07, Z0 + .09, 10.9, .14, .18, col.wallD, PLAST);
  for (const [b0, b1] of [[-6.0, -5.25], [-3.39, -3.25], [-1.23, -1.09], [.93, 1.07],
                          [3.09, 3.23], [5.25, 6.0]])
    box((b0 + b1) / 2, Y + (WSILL + WTOP) / 2, Z0 + .09, b1 - b0, WTOP - WSILL + .04, .18,
        col.wallD, PLAST);
  // aluminium frame, a transom and a mullion per bay, and the pane
  const wf = (x, y, z, sx, sy, sz) => box(x, y, z, sx, sy, sz, col.alu, METAL);
  for (const [b0, b1, bc] of BAYS) {
    wf(bc, Y + WSILL + .03, Z0 + .175, b1 - b0 + .06, .06, .06);
    wf(bc, Y + WTOP - .03, Z0 + .175, b1 - b0 + .06, .06, .06);
    wf(bc, Y + WSILL + .68, Z0 + .175, b1 - b0, .05, .05);
    for (const s of [-1, 0, 1])
      wf(bc + s * (b1 - b0) / 2, Y + (WSILL + WTOP) / 2, Z0 + .175, .055, WTOP - WSILL, .055);
    // the pane: barely there, but enough to catch the battens overhead
    box(bc, Y + (WSILL + WTOP) / 2, Z0 + .155, b1 - b0 - .08, WTOP - WSILL - .07, .010,
        col.glass, { hard: true, mode: 18, alpha: .12, gloss: .80 });
    // One leaf of each west bay hung open on its top hinge, which is how these are always found.
    // Kept at z Z0 + .22: the zone holds the body at Z0 + .30, so anything further into the room
    // than this is a pane of glass through somebody's chest.
    if (bc < 0)
      box(bc + .42, Y + WSILL + .40, Z0 + .22, .74, .60, .028, col.glass,
          { hard: true, mode: 18, alpha: .16, gloss: .78, rx: -.26 });
  }
  // The sill inside, and the daylight it throws on the tile.
  box(0, Y + WSILL - .10, Z0 + .27, 10.9, .07, .26, col.white,
      { hard: true, gloss: .30, tag: '窗户' });
  // Five pools rather than one wash, and kept low: these are 6 m² each on a floor that is already
  // taking the window's own light, and at .10 the whole south half of the hall went to white paper.
  for (const [, , bc] of BAYS)
    glowPool(M.trs(bc, Y + .020, Z0 + 1.45, 0, 1.90, 1, 2.60), C('#fff0cf'), .06, true);

  // ===================================================================== 4. CEILING SERVICES
  //
  // A grid of surface battens, which is what lights every hall of this kind — not downlights, and
  // not one bright lamp. Twin tube, steel body, and one in four dead, because one always is.
  const BATTENS = [];
  for (const z of [-3.62, -1.42, .78]) for (const x of [-4.30, -1.45, 1.40, 4.25])
    BATTENS.push([x, z, 1]);
  BATTENS.push([-4.60, 3.05, 1], [-2.55, 5.05, 1], [-4.60, 5.55, 0]);       // office
  BATTENS.push([0.55, 3.85, 1], [4.30, 3.85, 1], [4.75, 5.55, 1]);          // landing, 阅览角
  BATTENS.push([-1.45, 2.55, 0]);                                          // one dead over the neck
  for (const [bx, bz, alive] of BATTENS) {
    box(bx, CY - .055, bz, 1.30, .09, .17, col.steelD, { hard: true, gloss: .34, ...MAT.metal });
    for (const s of [-1, 1])
      box(bx, CY - .115, bz + s * .045, 1.20, .05, .05, alive ? col.warm : col.dead,
          { hard: true, mode: alive ? 1 : 0, glow: alive ? .11 : 0, gloss: .10 });
    box(bx, CY - .145, bz, 1.24, .012, .15, alive ? C('#fff8e6') : col.dead,
        { hard: true, mode: alive ? 1 : 0, glow: alive ? .05 : 0 });
  }
  // The sprinkler mains and their heads, three runs across the floor, and the lighting trunking.
  for (const pz of [-3.10, 1.30, 4.55]) {
    for (let i = 0; i < 4; i++)
      cyl(X0 + 1.5 + i * 3.0, CY - .20, pz, .034, 3.0, col.redD,
          { rz: PI / 2, gloss: .34, ...MAT.metal });
    for (let i = 0; i < 5; i++) {
      cyl(X0 + 1.3 + i * 2.4, CY - .255, pz, .015, .07, C('#8a6828'), { gloss: .5 });
      ball(X0 + 1.3 + i * 2.4, CY - .292, pz, .024, .019, .024, C('#b98c3e'), { gloss: .55 });
    }
  }
  box(0, CY - .050, -2.05, X1 - X0, .05, .07, col.white, { hard: true, gloss: .12 });
  box(0, CY - .050, 2.10, X1 - X0, .05, .07, col.white, { hard: true, gloss: .12 });
  // Two ceiling fans, because a hall this size is not air-conditioned and never has been. Kept
  // tight to the ceiling and slim: a blade drawn at furniture proportions is a plank, and hung a
  // third of a metre down it crosses half the frame from anywhere in the room.
  for (const [fx, fz] of [[-2.20, -2.60], [2.40, -2.60]]) {
    cyl(fx, CY - .11, fz, .018, .20, col.steelX, { gloss: .45 });
    cyl(fx, CY - .23, fz, .060, .07, col.white, { gloss: .30 });
    for (let k = 0; k < 4; k++) {
      const ca = Math.abs(Math.cos(k * PI / 2)), sa = Math.abs(Math.sin(k * PI / 2));
      box(fx + Math.cos(k * PI / 2) * .30, CY - .245, fz + Math.sin(k * PI / 2) * .30,
          ca * .48 + .07, .009, sa * .48 + .07, C('#6f5537'), { hard: true, gloss: .22 });
    }
  }

  // --- the lights that light the room, as opposed to the fittings that say where they are.
  // Only eight reach the shader and game.js keeps the nearest to the eye, so these are three over
  // the hall and one each over the places you stand still.
  light(-2.60, CY - .32, -2.20, [1.00, .97, .90], .36, 5.4);
  light(2.20, CY - .32, -1.70, [1.00, .97, .90], .36, 5.4);
  light(0.20, CY - .32, 1.60, [1.00, .96, .88], .30, 4.8);
  light(-4.00, Y + 2.34, 4.00, [1.00, .95, .86], .32, 3.8);      // inside the office
  light(1.20, CY - .30, 3.90, [1.00, .97, .91], .26, 4.2);       // the landing
  light(4.80, CY - .28, 5.45, [1.00, .96, .89], .22, 3.0);       // 阅览角
  light(5.30, Y + 2.46, 0.70, [1.00, .93, .80], .26, 3.4);       // the stage
  light(0.00, Y + 1.30, -4.10, [.90, .95, 1.00], .18, 5.2);      // the window wall's own bounce

  // ===================================================================== 5. ZONES AND COLLIDERS
  //
  // `roomAt` hands back the first zone that contains the body, so the specific ones are registered
  // before the catch-all; and the catch-all is what makes the whole floor walkable — `clampMove`
  // keeps the body inside the union of the zones it is *already* standing in, so two adjoining
  // rectangles with no overlap are two rooms with a wall between them. One rectangle over the
  // whole footprint, and then colliders for everything solid.
  A.zone({ id: 'f4-lift', x0: OFX, x1: 3.5, z0: 3.2, z1: Z1,
           light: [1.20, Y + 2.36, 4.40], ceil: CY - .06 });
  A.zone({ id: 'f4-read', x0: 3.5, x1: X1, z0: 4.6, z1: Z1,
           light: [4.80, Y + 2.30, 5.50], ceil: CY - .06 });
  // The office is a room now, not a shopfront: its own lamp and its own cutaway box, because
  // behind the fascia the ceiling is 40 mm lower than the hall's and the light is a strip over the
  // desks, and neither of those reads if the whole floor shares one.
  //
  // Registered AFTER the two above, and that ordering is load-bearing. `roomAt` (js/world.js:343)
  // falls back to `zs[0]` for a body outside every zone, so whichever zone is registered first is
  // the floor's default — and `.towercheck.js` starts its landing flood fill from that zone. With
  // the office first, the fill began at the office lamp, which sat inside the sofa's collider, and
  // the whole landing measured as 0 reachable cells. First place stays with the lift landing.
  //
  // The lamp is at x -2.40, in the open lane described over the colliders below, and not over the
  // desks: a light position that is inside a collider is a start point no flood fill can leave.
  A.zone({ id: 'f4-office', x0: X0, x1: OFX, z0: OFZ, z1: Z1,
           light: [-2.40, Y + 2.42, 4.30], ceil: CY - .10 });
  // The games end of the hall, along the window wall. Registered before the catch-all so `roomAt`
  // finds it first: the 棋牌 and 麻将 tables sit 4 m south of the hall's own pendant and were lit
  // by it, which is why that corner read flat against a window wall at dusk.
  A.zone({ id: 'f4-games', x0: X0, x1: 4.20, z0: Z0, z1: -1.90,
           light: [-1.60, Y + 2.30, -3.30], ceil: CY - .06 });
  A.zone({ id: 'f4', x0: X0, x1: X1, z0: Z0, z1: Z1,
           light: [0, Y + 2.48, -0.90], ceil: CY - .06, near: 6.0 });
  A.deckH(Y + H);
  HomeF4.built = true;

  // The office block, in two runs with the staff doorway left open between them.
  //
  // It used to be one rectangle over the whole block, which is what made the 党群服务站 a frontage:
  // the south wall already has a real opening at x -2.60 .. -1.90 with a header over it (section 7
  // builds the jambs and the head as separate wall runs), the interior faces are already built,
  // and the only thing stopping a body walking through it was this collider.
  //
  // `clampMove` inflates every collider by the 0.30 m body radius, so a 0.70 m opening is a 0.10 m
  // slot and unusable. The gap below is 1.10 m of collider — x -2.75 .. -1.65 — which leaves a
  // genuine 0.50 m of clear run, and it is deliberately WIDER than the drawn aperture rather than
  // narrower: the wall the eye sees stops at -2.60, so the body passes through the hole it can see
  // rather than being clipped by a jamb 150 mm inside it. See section 13 for the room behind it.
  // Its WALLS, not its volume. The block used to be one solid rectangle because you could never
  // be inside it; now that the door is open the colliders have to trace the two walls the office
  // actually has, and let the building's own perimeter do the other two — the catch-all zone below
  // is inset by the body radius at X0 and Z1, so the west and north walls need nothing here.
  stop(-6.4, -3.10, OFZ - .10, OFZ + .10);   // the south wall, west of the door
  stop(-1.70, -1.50, OFZ - .10, OFZ + .10);  // and its east jamb
  stop(-1.70, -1.50, OFZ, 6.4);              // the east wall, the one the 公告栏 hangs on
  stop(CUPX, 1.50, 4.85, 6.35);                         // the dead shaft
  stop(1.50, CXL - DOORW / 2, 4.85, 6.35);              // the working shaft's west pier
  stop(CXL + DOORW / 2, 3.55, 4.85, 6.35);              // and its east pier
  stop(CXL - DOORW / 2, CXL + DOORW / 2, 4.88, 5.10);   // the landing doors themselves

  // ===================================================================== 6. THE LANDING
  //
  // Provisional — see the head of this file and the ticket at the foot. Skipped entirely the day
  // js/world.js builds landings on every deck.
  if (!shellLanding) {
    const ZF = LF.z0;                             // both shafts stand on the same plane
    // The dead shaft first: no opening, a pair of doors that have not moved in a year and the
    // notice taped over them. This is what the second lift in a Beijing tower always is.
    wall((LB.x0 + LB.x1) / 2, Y + H / 2, ZF - .012, LB.x1 - LB.x0 + .10, H, PI, col.wall, PLAST);
    box((LB.x0 + LB.x1) / 2, Y + 1.03, ZF - .040, 1.06, 2.06, .030, col.wallD,
        { hard: true, gloss: .14 });
    for (const s of [-1, 1])
      box((LB.x0 + LB.x1) / 2 + s * .27, Y + 1.03, ZF - .062, .50, 2.02, .022, C('#9aa1a6'),
          { hard: true, gloss: .30, ...MAT.metal });
    box((LB.x0 + LB.x1) / 2, Y + 2.30, ZF - .058, .52, .28, .05, col.dark,
        { hard: true, gloss: .32 });
    G((LB.x0 + LB.x1) / 2, Y + 2.30, ZF - .090, PI, '—', { size: .14, color: col.grey });
    box((LB.x0 + LB.x1) / 2, Y + 1.60, ZF - .086, .46, .32, .020, col.paper,
        { hard: true, gloss: .05, ry: .03 });
    G((LB.x0 + LB.x1) / 2, Y + 1.69, ZF - .100, PI, '此梯检修',
      { size: .054, gap: .010, color: col.redD });
    G((LB.x0 + LB.x1) / 2, Y + 1.59, ZF - .100, PI, '请乘一号梯', { size: .042, gap: .008 });
    G((LB.x0 + LB.x1) / 2, Y + 1.49, ZF - .100, PI, '物业服务中心',
      { size: .032, gap: .006, color: col.grey });
    // its west flank, which is the only side of it anyone stands beside
    wall(CUPX, Y + H / 2, (ZF + Z1) / 2, Z1 - ZF, H, -PI / 2, col.wallD, PLAST);

    // The working shaft. Same construction the shell uses downstairs: a plaster face across the
    // mouth with the opening cut in it, a brushed surround standing 2 cm proud, the leaves behind
    // the face so they read as recessed, and the indicator over the top.
    const hw = DOORW / 2;
    box(CXL, Y + (DOORH + H) / 2, ZF + .06, DOORW + 1.20, H - DOORH, .12, col.wall, PLAST);
    for (const s of [-1, 1])
      box(CXL + s * (hw + .30), Y + DOORH / 2, ZF + .06, .60, DOORH, .12, col.wall, PLAST);
    for (const s of [-1, 1])
      box(CXL + s * (hw + .07), Y + DOORH / 2 + .05, ZF - .01, .14, DOORH + .10, .05, col.steelD,
          { hard: true, gloss: .55, tag: '电梯', ...MAT.metal });
    box(CXL, Y + DOORH + .075, ZF - .01, DOORW + .42, .14, .05, col.steelD,
        { hard: true, gloss: .55, tag: '电梯', ...MAT.metal });
    for (const s of [-1, 1]) {
      box(CXL + s * DOORW / 4, Y + DOORH / 2, ZF + .13, DOORW / 2, DOORH, .045, C('#7e868c'),
          { hard: true, gloss: .34, tag: '电梯', ...MAT.metal });
      box(CXL + s * DOORW / 4, Y + DOORH / 2, ZF + .105, DOORW / 2 - .05, DOORH - .10, .012,
          C('#8d959b'), { hard: true, gloss: .34, tag: '电梯' });
    }
    box(CXL, Y + DOORH + .34, ZF - .015, .52, .30, .06, col.dark,
        { hard: true, gloss: .34, tag: '电梯' });
    G(CXL, Y + DOORH + .34, ZF - .050, PI, '四',
      { size: .17, color: C('#ff9a4d'), mode: 1, glow: .16, tag: '电梯' });
    // the shaft's east flank, seen from the 阅览角
    wall(3.50, Y + H / 2, (ZF + Z1) / 2, Z1 - ZF, H, PI / 2, col.wallD, PLAST);
    // the call panel between the two sets of doors
    const px = 1.50;
    box(px, Y + 1.12, ZF - .04, .13, .22, .04, C('#d9d4c8'),
        { hard: true, gloss: .34, tag: '电梯' });
    for (const [dy, ch] of [[.045, '▲'], [-.045, '▼']]) {
      box(px, Y + 1.12 + dy, ZF - .062, .055, .055, .012, C('#ffbe6a'),
          { hard: true, mode: 1, glow: .16, tag: '电梯' });
      G(px, Y + 1.12 + dy, ZF - .076, PI, ch, { size: .038, color: C('#4a3316'), gloss: .12 });
    }
    // 四层 on the jamb, which is the only place a Chinese landing says which floor you are on
    box(CXL + hw + .30, Y + 1.72, ZF - .012, .26, .26, .020, col.paper,
        { hard: true, gloss: .06 });
    G(CXL + hw + .30, Y + 1.75, ZF - .028, PI, '四层',
      { size: .075, gap: .012, color: col.redD });
    G(CXL + hw + .30, Y + 1.63, ZF - .028, PI, '物业·活动室',
      { size: .028, gap: .005, color: col.grey });
  }

  // ===================================================================== 7. 物业办公室
  //
  // The block is x -6.0 .. -1.6, z 1.9 .. 6.2, and you never go in: what the floor gives you is
  // its front — a service window with a counter under it, a sliding glass hatch across it, a queue
  // rail in front of it and a fee board beside it. Everything behind the glass is built to be seen
  // through the opening and through the half-open door, and no further.
  const HW0 = -5.30, HW1 = -3.60;                    // the service opening
  // The staff door. Widened from 0.70 m to 1.40 m, and that is not decoration.
  //
  // `clampMove` inflates every collider by the 0.30 m body radius, so an opening loses 0.60 m of
  // its width before a body can use it: 0.70 m becomes a 0.10 m slot nobody gets through, and the
  // office stays a frontage whatever the collider says. 1.20 m would give a 0.60 m clear run,
  // which is passable and is the TIGHT standard. It is not the SAFE one — `.flatcheck.js` measures
  // openings at 0.80 m clear, which is the width at which a body does not have to be threaded
  // through, and five rooms in flat 202 are being widened for exactly that. 1.40 m gives 0.80 m.
  //
  // The frame, the head and the plate below are all written off DR0/DR1, so they follow it.
  const DR0 = -3.10, DR1 = -1.70;                    // the staff door
  const CTOP = 1.02, HTOP = 1.86;                    // counter top, and the head of the opening
  for (const [a0, a1] of [[X0, HW0], [HW1, DR0], [DR1, OFX]])
    wall((a0 + a1) / 2, Y + H / 2, OFZ, a1 - a0, H, PI, col.wall, PLAST);
  wall((HW0 + HW1) / 2, Y + (HTOP + H) / 2, OFZ, HW1 - HW0, H - HTOP, PI, col.wall, PLAST);
  wall((HW0 + HW1) / 2, Y + CTOP / 2, OFZ, HW1 - HW0, CTOP, PI, col.wallD, PLAST);
  wall((DR0 + DR1) / 2, Y + (2.05 + H) / 2, OFZ, DR1 - DR0, H - 2.05, PI, col.wall, PLAST);
  // and the same wall seen from inside, so the office is a room and not three walls
  for (const [a0, a1] of [[X0, HW0], [HW1, DR0], [DR1, OFX]])
    wall((a0 + a1) / 2, Y + H / 2, OFZ + .014, a1 - a0, H, 0, col.wallD, PLAST);
  // its east wall, both faces
  wall(OFX, Y + H / 2, (OFZ + Z1) / 2, Z1 - OFZ, H, PI / 2, col.wall, PLAST);
  wall(OFX - .014, Y + H / 2, (OFZ + Z1) / 2, Z1 - OFZ, H, -PI / 2, col.wallD, PLAST);
  // its own ceiling and skirting, 4 cm under the hall's so the two planes never argue
  ceilQ(-3.8, CY - .04, 4.05, 4.4, 4.3, C('#e2ddd0'), { gloss: .07, glow: .02, ...CEILM });
  box(-3.8, Y + .075, OFZ + .06, 4.4, .15, .09, col.stoneD, SLABM);
  box(OFX - .06, Y + .075, 4.05, .09, .15, 4.3, col.stoneD, SLABM);

  // --- the red fascia. This is the thing that makes it a 党群服务站 and not a reception desk:
  // gold on red, the whole width of the block, above everything else on the wall.
  box(-3.8, Y + 2.40, OFZ - .045, 4.40, .40, .09, col.red, { hard: true, gloss: .14 });
  box(-3.8, Y + 2.615, OFZ - .052, 4.40, .035, .10, col.gold, { hard: true, gloss: .30 });
  box(-3.8, Y + 2.185, OFZ - .052, 4.40, .035, .10, col.gold, { hard: true, gloss: .30 });
  G(-3.86, Y + 2.40, OFZ - .100, PI, '金桥园社区党群服务站',
    { size: .155, gap: .026, color: col.gold, gloss: .16, tag: '党群服务站' });
  // the roundel at the east end of it
  cyl(-1.86, Y + 2.40, OFZ - .086, .135, .022, col.gold, { rx: PI / 2, gloss: .34 });
  cyl(-1.86, Y + 2.40, OFZ - .100, .115, .012, col.redD, { rx: PI / 2, gloss: .20 });
  G(-1.86, Y + 2.40, OFZ - .112, PI, '★', { size: .13, color: col.gold, gloss: .30 });
  // and the line every one of these carries under it, on the blank western end of the wall rather
  // than over the hatch — the 物业服务窗口 plate is already there and two plaques on one plane at
  // one height is the stripe the coplanar rule is about.
  box(-5.63, Y + 1.62, OFZ - .030, .62, .17, .028, col.redD, { hard: true, gloss: .12 });
  G(-5.63, Y + 1.62, OFZ - .050, PI, '为人民服务', { size: .078, gap: .010, color: col.gold });

  // --- the counter. Stone top, projecting 0.30 into the hall, with a kick and a laminate front.
  const CZ = OFZ - .30;                              // the front edge of the counter top
  box(-4.45, Y + CTOP - .045, OFZ - .15, 1.94, .09, .60, C('#cbc4b2'), SLABM);
  box(-4.45, Y + CTOP / 2 - .03, OFZ - .12, 1.86, CTOP - .09, .48, C('#8f6f4c'), TIMBER);
  box(-4.45, Y + .10, OFZ - .16, 1.86, .20, .40, col.stoneD, SLABM);
  // The brass nose on the front edge of the stone, which is where it can actually be seen: the
  // laminate front stops at OFZ - .36 and the top oversails it by 9 cm.
  box(-4.45, Y + CTOP - .045, CZ - .155, 1.94, .09, .022, C('#a98d52'), { hard: true, gloss: .5 });
  shade(-4.45, OFZ - .16, 2.10, .74, .30, SHY);
  // the sliding glass hatch: two panes in an aluminium track, the left one slid open behind the
  // right, which is how a 物业 window is always found while somebody is on duty
  box(-4.45, Y + CTOP + .045, OFZ - .035, 1.78, .05, .07, col.alu, METAL);
  box(-4.45, Y + HTOP - .035, OFZ - .035, 1.78, .05, .07, col.alu, METAL);
  // Both leaves parked over the east half of the opening — that is what "slid open" looks like,
  // and it leaves 0.8 m of genuinely open hatch on the west half for the clerk to talk through.
  // Two panes on one plane would be a stripe, so they are 8 mm apart in z, in their own tracks.
  box(-3.99, Y + (CTOP + HTOP) / 2 + .02, OFZ - .052, .84, HTOP - CTOP - .10, .010, col.glass,
      { hard: true, mode: 18, alpha: .17, gloss: .82 });
  box(-4.07, Y + (CTOP + HTOP) / 2 + .02, OFZ - .022, .84, HTOP - CTOP - .10, .010, col.glass,
      { hard: true, mode: 18, alpha: .17, gloss: .82 });
  cyl(-4.44, Y + 1.42, OFZ - .070, .012, .16, col.steelD, { gloss: .5 });
  cyl(-4.52, Y + 1.42, OFZ - .040, .012, .16, col.steelD, { gloss: .5 });
  // the little speaking grille everyone shouts through anyway, drilled through the parked pane
  box(-3.80, Y + 1.30, OFZ - .070, .13, .13, .012, col.steelX, { hard: true, gloss: .45 });
  // the light in the opening, which is the warmest thing on this floor
  box(-4.45, Y + HTOP - .085, OFZ + .12, 1.66, .045, .10, C('#fff0cd'),
      { hard: true, mode: 1, glow: .09 });
  glowPool(M.trs(-4.45, Y + CTOP + .014, OFZ - .16, 0, 1.90, 1, .58), C('#ffe6b8'), .12);

  // --- what is on the counter.
  // 印台 and 公章 — the ink pad open, the stamp stood on its end beside it.
  box(-3.86, Y + CTOP + .022, OFZ - .22, .10, .035, .10, col.redD,
      { hard: true, gloss: .30, tag: '公章' });
  box(-3.86, Y + CTOP + .043, OFZ - .22, .085, .010, .085, C('#8c1410'),
      { hard: true, gloss: .22, tag: '公章' });
  box(-3.86, Y + CTOP + .050, OFZ - .34, .12, .012, .10, col.dark, { hard: true, gloss: .26 });
  cyl(-3.99, Y + CTOP + .050, OFZ - .35, .036, .048, col.woodD, { gloss: .30, tag: '公章' });
  cyl(-3.99, Y + CTOP + .096, OFZ - .35, .015, .048, col.woodL, { gloss: .30, tag: '公章' });
  // the ledger, a pen on a chain, and the box of forms
  box(-4.98, Y + CTOP + .026, OFZ - .22, .32, .042, .24, col.paperY,
      { hard: true, gloss: .06, ry: .06 });
  box(-4.98, Y + CTOP + .049, OFZ - .22, .29, .006, .21, col.paper,
      { hard: true, gloss: .04, ry: .06 });
  G(-4.98, Y + CTOP + .053, OFZ - .27, 0, '来访登记', { size: .028, gap: .006, color: col.grey });
  cyl(-4.76, Y + CTOP + .028, OFZ - .30, .006, .13, col.navy, { rz: PI / 2, ry: .3, gloss: .4 });
  box(-4.24, Y + CTOP + .040, OFZ - .34, .18, .07, .13, C('#c9c2ae'), { hard: true, gloss: .08 });
  // a jar of tea and the office plant, both on the staff side of the glass
  cyl(-5.02, Y + CTOP + .075, OFZ + .12, .039, .15, C('#cfe0d2'),
      { alpha: .55, gloss: .70, tag: '茶杯' });
  cyl(-5.02, Y + CTOP + .048, OFZ + .12, .034, .09, C('#8a7a34'), { gloss: .20 });
  cyl(-5.02, Y + CTOP + .155, OFZ + .12, .040, .014, col.redL, { gloss: .30 });
  cyl(-3.70, Y + CTOP + .060, OFZ + .13, .070, .12, col.terra, { gloss: .18 });
  for (let i = 0; i < 7; i++)
    ball(-3.70 + Math.cos(i * 1.9) * .06, Y + CTOP + .16 + (i % 3) * .035,
         OFZ + .13 + Math.sin(i * 1.9) * .06, .055, .030, .050, i % 2 ? col.leaf : col.leafD,
         { gloss: .18 });

  // --- 服务窗口 sign hung over the opening, and the opening hours beside it.
  box(-4.45, Y + 2.00, OFZ - .028, .90, .16, .026, col.white, { hard: true, gloss: .20 });
  G(-4.45, Y + 2.00, OFZ - .046, PI, '物业服务窗口', { size: .085, gap: .016, color: col.redD });
  // The hours, in the 0.37 m of wall between the top of the fee board and the foot of the fascia.
  // It used to hang at y 1.90 with a 0.34 m face, which put its bottom third on the same plane as
  // the top of the board below it.
  box(-3.10, Y + 2.00, OFZ - .034, .84, .28, .022, col.paper, { hard: true, gloss: .06 });
  G(-3.10, Y + 2.086, OFZ - .050, PI, '服务时间', { size: .044, gap: .009, color: col.redD });
  G(-3.10, Y + 2.016, OFZ - .050, PI, '8:30—17:30', { size: .036, gap: .006 });
  G(-3.10, Y + 1.952, OFZ - .050, PI, '午休 12:00—13:00', { size: .028, gap: .005, color: col.grey });
  G(-3.10, Y + 1.894, OFZ - .050, PI, '报修 6688-2100', { size: .028, gap: .005, color: col.grey });

  // --- 收费标准. The fee board, with numbers on it, which is the densest piece of readable
  // Chinese on this floor and the reason the brief put a 物业 window here at all.
  const FBX = -3.10, FBY = Y + 1.44, FBZ = OFZ - .022;
  box(FBX, FBY, FBZ, .90, .74, .026, col.white, { hard: true, gloss: .16, tag: '收费标准' });
  box(FBX, FBY + .305, FBZ - .016, .90, .13, .010, col.red,
      { hard: true, gloss: .14, tag: '收费标准' });
  G(FBX, FBY + .305, FBZ - .032, PI, '收费标准', { size: .072, gap: .016, color: col.gold });
  // Rendered from `HomeF4.FEES` at the top of this file, so the board and F6's ledger cannot drift.
  const FEES = HomeF4.FEES.map(f => [f.hz, f.rate + ' ' + f.unit]);
  FEES.forEach(([k, v], i) => {
    const fy = FBY + .175 - i * .088;
    G(FBX - .265, fy, FBZ - .020, PI, k, { size: .042, gap: .007 });
    G(FBX + .215, fy, FBZ - .020, PI, v, { size: .034, gap: .004, color: C('#5d3b1c') });
    box(FBX, fy - .044, FBZ - .018, .82, .004, .004, C('#c3bba6'), { hard: true });
  });
  G(FBX, FBY - .300, FBZ - .020, PI, '经业主大会表决通过　监督电话 12345',
    { size: .026, gap: .004, color: col.grey });

  // --- 一米线. The yellow line on the floor and the queue rail behind it. Both of these are in
  // every service hall in the country and neither exists in a Western one.
  box(-4.45, MAT_Y, OFZ - .96, 2.30, .008, .055, C('#e0b52c'), { hard: true, gloss: .12 });
  flatText(-4.45, MAT_Y + .006, OFZ - 1.06, 0, '请在一米线外等候',
           { size: .095, gap: .020, color: C('#c8a02a'), gloss: .08 });
  for (const qx of [-5.55, -3.35]) {
    cyl(qx, FL + .012, OFZ - .70, .115, .024, col.steelX, { gloss: .5 });
    cyl(qx, FL + .46, OFZ - .70, .028, .90, col.steel, { gloss: .58, ...MAT.metal });
    cyl(qx, FL + .92, OFZ - .70, .034, .05, col.steelD, { gloss: .58 });
    shade(qx, OFZ - .70, .30, .30, .30, SHY);
  }
  box(-4.45, FL + .90, OFZ - .70, 2.16, .048, .012, C('#8c1d16'), { hard: true, gloss: .16 });
  stop(-5.70, -3.20, 1.10, 1.90);

  // --- the office interior, built to be seen through the hatch and nothing more.
  //
  // The back counter stands at OFZ + .86, not against the wall: the service counter's own carcass
  // reaches OFZ + .12 and a clerk is 0.21 m deep, so anything nearer than about OFZ + .60 puts a
  // desk pedestal through the person sitting at it. The gap it leaves — OFZ + .12 to OFZ + .62 —
  // is the half metre a chair actually needs.
  const DKZ = OFZ + .86;
  box(-4.20, Y + .74, DKZ, 2.60, .05, .48, C('#9d7c52'), TIMBER);
  box(-4.20, Y + .36, DKZ + .02, 2.44, .70, .40, C('#cbc3b0'), { hard: true, gloss: .12 });
  shade(-4.20, DKZ, 2.70, .58, .30, SHY);
  // a monitor, a keyboard, a stack of files and the desk fan
  box(-3.55, Y + 1.02, DKZ + .10, .46, .30, .035, col.dark, { hard: true, gloss: .40 });
  box(-3.55, Y + 1.02, DKZ + .076, .42, .26, .010, C('#2d4a63'),
      { hard: true, mode: 1, glow: .05 });
  box(-3.55, Y + .81, DKZ + .10, .13, .12, .10, col.dark, { hard: true, gloss: .35 });
  box(-3.62, Y + .78, DKZ - .12, .36, .022, .14, C('#d7d2c6'), { hard: true, gloss: .12 });
  for (const [bx, bh, bc] of [[-5.10, .16, C('#b8443a')], [-5.10, .13, C('#3e6ba0')],
                              [-4.86, .19, C('#4c7a44')]])
    box(bx, Y + .765 + bh / 2, DKZ + .02, .22, bh, .30, bc, { hard: true, gloss: .10, ry: .05 });
  cyl(-2.98, Y + 1.02, DKZ + .04, .105, .05, C('#e7e3d6'), { rx: PI / 2, gloss: .30 });
  cyl(-2.98, Y + .89, DKZ + .04, .022, .26, col.steelD, { gloss: .40 });

  // --- 钥匙墙. The key cabinet on the back wall behind the desk: every flat's spare, on a hook,
  // with a wooden tag. It is directly opposite the hatch, which is the only reason it is visible.
  const KX = -4.35, KZ = Z1 - .10;
  box(KX, Y + 1.52, KZ, 1.30, .84, .10, C('#c8c2b0'), { hard: true, gloss: .18, tag: '钥匙' });
  box(KX, Y + 1.52, KZ - .054, 1.20, .74, .010, C('#7d6a4d'),
      { hard: true, gloss: .14, tag: '钥匙' });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) {
    const kx = KX - .52 + c * .13, ky = Y + 1.80 - r * .175;
    cyl(kx, ky, KZ - .066, .006, .026, col.steel, { rx: PI / 2, gloss: .55 });
    if ((r * 9 + c) % 7 === 3) continue;                 // a few are out with somebody
    box(kx, ky - .048, KZ - .072, .026, .052, .006, col.paperY, { hard: true, gloss: .08 });
    box(kx, ky - .088, KZ - .072, .012, .034, .005, col.steelD, { hard: true, gloss: .5 });
  }
  box(KX, Y + 2.02, KZ - .058, .40, .09, .012, col.redD, { hard: true, gloss: .14 });
  G(KX, Y + 2.02, KZ - .072, PI, '备用钥匙', { size: .050, gap: .010, color: col.gold });

  // --- 锦旗, the embroidered banner of thanks a grateful resident brought in. Every 物业 office
  // has at least one and it is always on the wall you can see from the window.
  box(-2.30, Y + 1.72, Z1 - .06, .46, .62, .020, col.red, { hard: true, gloss: .10 });
  box(-2.30, Y + 1.72, Z1 - .074, .40, .55, .006, col.redL, { hard: true, gloss: .10 });
  G(-2.30, Y + 1.86, Z1 - .086, PI, '尽职尽责', { size: .052, gap: .010, color: col.gold });
  G(-2.30, Y + 1.72, Z1 - .086, PI, '为民解忧', { size: .052, gap: .010, color: col.gold });
  G(-2.30, Y + 1.56, Z1 - .086, PI, '业主　张玉兰　敬赠',
    { size: .026, gap: .004, color: col.gold });
  for (let i = 0; i < 9; i++)
    cyl(-2.51 + i * .052, Y + 1.38, Z1 - .078, .005, .10, col.gold, { gloss: .30 });

  // --- the staff. One on duty at the window, one at the desk behind her. Low-poly, seated, and
  // built only from the waist up because a service counter is 1.02 m tall and nothing below that
  // has ever been seen from the hall.
  // `yaw` is the way the clerk faces. Front is (sin yaw, cos yaw) and the wearer's right is
  // (-cos yaw, sin yaw) — worth writing down, because a placket put on (−cos, sin) instead of
  // (sin, cos) ends up down the person's side and the uniform stops reading as a uniform.
  function clerk(x, z, yaw, vest, hair) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const fx = s, fz = c, rx = -c, rz = s;
    cap(x, Y + .84, z, .30, .58, .21, vest, { ry: yaw, gloss: .12 });
    box(x, Y + 1.06, z, .30, .22, .21, col.shirt, { ry: yaw, gloss: .10 });
    box(x + fx * .105, Y + 1.06, z + fz * .105, .12, .21, .010, vest, { ry: yaw, gloss: .12 });
    cyl(x, Y + 1.20, z, .055, .10, col.skin, { gloss: .10 });
    ball(x, Y + 1.34, z, .095, .115, .095, col.skin, { gloss: .10 });
    ball(x - fx * .014, Y + 1.39, z - fz * .014, .102, .092, .102, hair, { gloss: .16 });
    for (const sd of [-1, 1]) {
      ball(x + sd * rx * .085, Y + 1.33, z + sd * rz * .085, .045, .085, .045, hair, { gloss: .16 });
      cap(x + sd * rx * .21, Y + .94, z + sd * rz * .21, .085, .40, .085, vest,
          { ry: yaw, rz: sd * .18, gloss: .12 });
    }
    // a name badge, which is most of what a 物业 uniform is
    box(x + fx * .118 + rx * .085, Y + 1.02, z + fz * .118 + rz * .085, .075, .028, .008,
        col.white, { hard: true, ry: yaw, gloss: .20 });
  }
  // The one on duty sits behind the open half of the hatch, where she can actually be seen; the
  // second is behind the parked glass, turned to the screen.
  clerk(-4.85, OFZ + .40, PI, col.navy, col.hair);
  clerk(-3.85, OFZ + .44, PI - .55, C('#3a4a63'), C('#2b2320'));
  // and a third chair pushed back from the desk with a jacket over it
  box(-3.05, Y + .46, OFZ + .40, .42, .05, .40, C('#3f4a52'), { gloss: .14, ry: .35 });
  cyl(-3.05, Y + .23, OFZ + .40, .030, .46, col.steelD, { gloss: .40 });
  cyl(-3.05, Y + .015, OFZ + .40, .21, .03, col.steelX, { gloss: .40 });
  box(-3.11, Y + .74, OFZ + .58, .40, .50, .09, C('#3f4a52'), { gloss: .14, ry: .35 });
  box(-3.11, Y + .78, OFZ + .52, .44, .46, .07, C('#5a4d3c'), { gloss: .10, ry: .35 });

  // --- the staff door, half open on the office, and the fabric curtain beside it.
  for (const s of [-1, 1])
    box((DR0 + DR1) / 2 + s * .38, Y + 1.06, OFZ - .045, .07, 2.12, .10, col.woodD, TIMBER);
  box((DR0 + DR1) / 2, Y + 2.09, OFZ - .045, .84, .07, .10, col.woodD, TIMBER);
  // Standing fully open against the inside of the east return, not parked across the opening: a
  // leaf in the middle of a doorway is a leaf the body has to walk through, and this one has no
  // collider of its own to say so. Hinged at DR1, swung back 80 degrees.
  box(DR1 + .30, Y + 1.01, OFZ + .40, .66, 2.00, .05, C('#8a6a48'),
      { hard: true, gloss: .22, ry: 1.44 });
  box(DR1 + .30, Y + 1.44, OFZ + .41, .42, .60, .012, C('#a9c4cc'),
      { hard: true, mode: 18, alpha: .35, gloss: .70, ry: 1.44 });
  // the 门帘 pushed to the west jamb, clear of the run
  box(DR0 + .09, Y + 1.30, OFZ - .075, .22, 1.70, .028, C('#9c3b30'), { gloss: .06, rz: .03 });
  box((DR0 + DR1) / 2, Y + 2.16, OFZ - .062, .50, .12, .016, col.white,
      { hard: true, gloss: .18 });
  G((DR0 + DR1) / 2, Y + 2.16, OFZ - .078, PI, '办公区　非请勿入',
    { size: .036, gap: .006, color: col.redD });

  // ===================================================================== 7b. 办公室 the back office
  //
  // What is behind the counter, now that you can walk in. Everything below stands north of the
  // clerks' desk at z 2.76 and south of the north wall, which is 3.2 m of floor that used to be
  // empty because nobody could ever see it.
  //
  // A 物业 office in a Beijing estate is four things: a wall of ring binders, a wall map of the
  // 小区 with the blocks numbered on it, a water cooler, and a sofa nobody sits on because it is
  // covered in files. That is what this is.
  {
    const OZ2 = 4.30;                        // the back half's centre line in z
    // THE LANE. The staff door opens at x -3.00 .. -1.80 and the office's east wall collider ends
    // at x -1.50, so the body's clear run into this room is x -2.85 .. -1.80 once `clampMove` has
    // inflated everything by the 0.30 m radius. Every collider below therefore ends at or west of
    // **x = -3.15**, which leaves that 1.05 m lane open from the door to the back wall.
    //
    // This is not a style rule, it is the bug this room shipped with for one run: the sofa ended at
    // x -3.00 and the copier began at x -2.32, which inflate to -2.70 and -2.62 — an 0.08 m gap,
    // and a sealed office. Anything added here must respect the same number.
    const LANE_W = -3.15;                    // no floor collider in this room may reach east of it
    // ---- 档案柜, the file wall along the west side. Six bays of ring binders, and the reason a
    // 物业 office smells of paper. LOD is not needed: the binders are one box per bay, not one
    // per binder — the colour banding does the work a hundred spines would.
    for (let i = 0; i < 4; i++) {
      const cz = 2.95 + i * .92;
      box(X0 + .27, Y + 1.02, cz, .46, 2.04, .88, C('#9a9384'), { hard: true, gloss: .16, ...METAL });
      box(X0 + .50, Y + 1.02, cz, .012, 1.96, .84, C('#8b8577'), { hard: true, gloss: .22 });
      for (let r = 0; r < 4; r++) {
        box(X0 + .46, Y + .38 + r * .48, cz, .06, .04, .82, C('#7d7768'), { hard: true, gloss: .20 });
        box(X0 + .42, Y + .58 + r * .48, cz, .30, .34, .78,
            [C('#8a5a3c'), C('#3f5f7a'), C('#7a6a3c'), C('#6a4a5c')][(i + r) % 4],
            { hard: true, gloss: .10 });
        box(X0 + .29, Y + .58 + r * .48, cz, .04, .30, .78, C('#e6e0cd'), { hard: true, gloss: .06 });
      }
      G(X0 + .275, Y + 1.98, cz, -PI / 2, ['一', '二', '三', '四'][i],
        { size: .052, gap: .010, color: col.ink });
    }
    stop(X0, X0 + .56, 2.45, 6.10);
    shade(X0 + .30, OZ2, .70, 3.60, .28, SHY);

    // ---- 小区平面图, the estate plan on the north wall. Nine blocks, a road through the middle
    // and a red dot where you are, which is the single most 物业 object there is.
    const MPX = -3.70, MPZ = 6.10;
    box(MPX, Y + 1.62, MPZ, 2.10, 1.30, .05, C('#e9e4d4'), { hard: true, gloss: .12 });
    box(MPX, Y + 1.62, MPZ - .030, 2.02, 1.22, .010, C('#dfe6e2'), { hard: true, gloss: .16 });
    box(MPX, Y + 2.31, MPZ - .034, 2.10, .16, .012, col.red, { hard: true, gloss: .14 });
    G(MPX, Y + 2.31, MPZ - .046, 0, '金桥园小区平面图',
      { size: .078, gap: .016, color: col.gold });
    for (let i = 0; i < 9; i++) {
      const bx = MPX - .78 + (i % 3) * .78, bz = 1.98 - Math.floor(i / 3) * .40;
      box(bx, Y + bz, MPZ - .038, .48, .22, .006, C('#b9bfae'), { hard: true, gloss: .10 });
      G(bx, Y + bz, MPZ - .046, 0, (i + 1) + '号楼', { size: .030, gap: .005, color: col.ink });
    }
    box(MPX, Y + 1.36, MPZ - .038, 1.94, .05, .006, C('#c6bda6'), { hard: true, gloss: .08 });
    cyl(MPX + .78, Y + 1.58, MPZ - .044, .030, .006, col.red,
        { rx: PI / 2, mode: 1, glow: .05 });
    G(MPX + .78, Y + 1.46, MPZ - .046, 0, '本楼', { size: .028, gap: .005, color: col.redD });

    // ---- 饮水机, the water cooler, and the crate of empty bottles beside it that never goes back.
    const WCX = -3.75, WCZ = 5.70;
    box(WCX, Y + .46, WCZ, .38, .92, .38, C('#dfdcd2'), { hard: true, gloss: .30 });
    box(WCX, Y + .60, WCZ - .195, .26, .22, .012, C('#7d848a'), { hard: true, gloss: .40 });
    for (const [s, hc] of [[-1, '#c0392b'], [1, '#2f74b5']])
      cyl(WCX + s * .07, Y + .78, WCZ - .20, .020, .05, C(hc), { rx: PI / 2, gloss: .40 });
    taper(WCX, Y + 1.12, WCZ, .34, .40, .34, C('#a9c9d8'),
          { mode: 18, alpha: .40, gloss: .74 });
    cyl(WCX, Y + 1.36, WCZ, .075, .10, C('#3f6f8e'), { gloss: .30 });
    box(WCX - .52, Y + .17, WCZ - .06, .52, .34, .38, C('#3f6f4f'), { hard: true, gloss: .18 });
    for (const s of [-1, 1])
      taper(WCX - .52 + s * .12, Y + .46, WCZ - .06, .30, .30, .30, C('#b9cdd6'),
            { mode: 18, alpha: .34, gloss: .70 });
    shade(WCX, WCZ, .58, .58, .34, SHY);
    shade(WCX - .52, WCZ - .06, .62, .48, .30, SHY);
    stop(WCX - .82, Math.min(WCX + .26, LANE_W), WCZ - .30, WCZ + .24);

    // ---- the sofa nobody sits on, and what is on it.
    const SFX = -4.05, SFZ = 3.30;
    box(SFX, Y + .21, SFZ, 1.70, .42, .74, C('#6a6f6a'), { hard: true, gloss: .12 });
    box(SFX, Y + .48, SFZ + .28, 1.66, .58, .18, C('#767c76'), { hard: true, gloss: .12, rx: -.10 });
    for (const s of [-1, 1])
      box(SFX + s * .80, Y + .40, SFZ, .12, .40, .72, C('#767c76'), { hard: true, gloss: .12 });
    for (const s of [-1, 1])
      box(SFX + s * .42, Y + .44, SFZ - .04, .78, .10, .62, C('#7d827c'), { hard: true, gloss: .10 });
    box(SFX - .48, Y + .58, SFZ - .04, .46, .18, .34, C('#c9c2ac'), { hard: true, gloss: .08, ry: .18 });
    box(SFX - .48, Y + .70, SFZ - .04, .42, .06, .30, C('#b8b0a0'), { hard: true, gloss: .08, ry: -.10 });
    box(SFX + .58, Y + .56, SFZ + .02, .34, .14, .26, C('#8a5a3c'), { hard: true, gloss: .12, ry: -.22 });
    shade(SFX, SFZ, 1.94, .90, .30, SHY);
    stop(SFX - .90, Math.min(SFX + .90, LANE_W), SFZ - .42, SFZ + .40);

    // ---- 复印机 on its stand against the east wall, with the ream of paper on top and the
    // recycling box under the outfeed. It is what produces every sheet on the 公告栏 outside.
    const CPX = -4.55, CPZ = 5.92;          // west of LANE_W, in the corner beside the file wall
    box(CPX, Y + .32, CPZ, .60, .64, .72, C('#8b8577'), { hard: true, gloss: .18, ...METAL });
    box(CPX, Y + .82, CPZ, .66, .38, .78, C('#d5d1c6'), { hard: true, gloss: .30 });
    box(CPX, Y + 1.03, CPZ, .60, .06, .70, C('#c3bfb4'), { hard: true, gloss: .34 });
    box(CPX - .26, Y + .96, CPZ, .12, .10, .40, C('#3a3d42'), { hard: true, gloss: .44 });
    box(CPX - .32, Y + .90, CPZ, .05, .012, .34, col.paper, { hard: true, gloss: .05 });
    box(CPX, Y + 1.12, CPZ - .24, .30, .12, .22, col.paper, { hard: true, gloss: .06, ry: .10 });
    cyl(CPX + .12, Y + 1.07, CPZ - .30, .020, .012, C('#4f8a5c'), { rx: PI / 2, mode: 1, glow: .06 });
    cyl(CPX + .06, Y + 1.07, CPZ - .30, .016, .010, C('#c9382a'), { rx: PI / 2, gloss: .34 });
    box(CPX + .40, Y + .16, CPZ - .46, .34, .32, .28, C('#3f6f8e'), { hard: true, gloss: .16, ry: -.18 });
    for (let i = 0; i < 3; i++)
      box(CPX + .40, Y + .30 + i * .010, CPZ - .46, .28, .010, .22, col.paper,
          { hard: true, gloss: .04, ry: -.18 + i * .06 });
    shade(CPX, CPZ, .78, .90, .30, SHY);
    stop(CPX - .34, Math.min(CPX + .34, LANE_W), CPZ - .40, CPZ + .34);

    // ---- the strip light over the desks, which is what the office zone's lamp is standing in for.
    box(-3.90, CY - .10, 3.40, 1.20, .05, .13, C('#e6e2d4'), { hard: true, gloss: .24 });
    box(-3.90, CY - .14, 3.40, 1.12, .03, .10, C('#fff6de'), { hard: true, mode: 1, glow: .11 });
    light(-3.90, CY - .24, 3.40, C('#f4f1e2'), .44, 3.60);
    box(-2.40, CY - .10, 5.30, 1.20, .05, .13, C('#e6e2d4'), { hard: true, gloss: .24 });
    box(-2.40, CY - .14, 5.30, 1.12, .03, .10, C('#fff6de'), { hard: true, mode: 1, glow: .10 });
    light(-2.40, CY - .24, 5.30, C('#f4f1e2'), .36, 3.20);

    TH('办公室', -3.70, Y + 1.30, 4.60, '物业办公室，白天有人。',
       'The estate office; somebody is in during the day.',
       '办 to handle + 公 public affairs + 室 room. 办公 is to work at a desk.', -3.20, 4.10, 3.0);
    TH('平面图', MPX, Y + 1.62, MPZ - .20, '墙上挂着小区平面图。',
       'A plan of the estate hangs on the wall.',
       '平面 flat surface, plan + 图 drawing. 本楼 means "this building".', MPX, 5.30, 2.0);
    TH('档案', X0 + .40, Y + 1.30, 3.85, '档案柜里都是住户的资料。',
       'The filing cabinets hold every resident’s paperwork.',
       '档案 dàng’àn — a file, a record. Everybody in this country has one.', -5.10, 3.85, 2.0);
    TH('饮水机', WCX, Y + 1.00, WCZ - .34, '办公室角落有一台饮水机。',
       'There is a water cooler in the corner of the office.',
       '饮 to drink + 水 water + 机 machine. 接水 jiē shuǐ — to get a cup from it.',
       WCX - .10, WCZ - .80, 1.7);
  }

  // ===================================================================== 8. 公告栏
  //
  // Down the office's east wall, facing the lift: the first thing you see when the doors open, and
  // the best readable Chinese in the building. A glazed aluminium case with five sheets in it,
  // plus the one taped to the outside of the glass because whoever wrote it had no key.
  // 75 mm off the wall, not 60: the case is 110 mm deep, so at 60 its back face landed 5 mm
  // from the wall quad behind it, which is inside the 10 mm the coplanar rule asks for.
  const BX = OFX + .075, BZC = 4.55;
  box(BX, Y + 1.52, BZC, .11, 1.28, 2.52, col.alu, { hard: true, gloss: .40, ...MAT.metal });
  box(BX + .036, Y + 1.52, BZC, .04, 1.14, 2.38, C('#e9e4d6'),
      { hard: true, gloss: .10, tag: '公告栏' });
  box(BX + .066, Y + 1.52, BZC, .012, 1.10, 2.34, C('#cfe0e6'),
      { hard: true, mode: 18, alpha: .16, gloss: .84, tag: '公告栏' });
  // its head, in red, and the little lamp inside the top of the case
  box(BX + .010, Y + 2.24, BZC, .13, .19, 2.52, col.red,
      { hard: true, gloss: .14, tag: '公告栏' });
  G(BX + .080, Y + 2.24, BZC, PI / 2, '社区公告栏',
    { size: .115, gap: .024, color: col.gold, tag: '公告栏' });
  box(BX + .050, Y + 2.09, BZC, .05, .035, 2.28, C('#fff3d8'),
      { hard: true, mode: 1, glow: .06 });

  // The notices. Real ones: what an estate actually tapes up, in the order it tapes them.
  //
  // Every line is kept to 15 characters or fewer, because the sheet is 0.40 m wide and `glyphs`
  // lays a string out at `size + gap` per character with no wrapping — one 18-character line runs
  // 0.55 m and hangs out of both sides of the paper it is written on.
  const NOTES = [
    [3.55, col.paper, '停　水　通　知', col.redD, 'water', [
      '因管网检修，定于',
      '八月九日（周六）',
      '8:00—17:00 停水',
      '请提前储水，谅解。',
      '　　金桥园物业中心'], 0],
    [4.05, col.paperB, '电梯年检通知', col.redD, 'lift', [
      '二号电梯八月十二日',
      '进行年度检验，',
      '当日停用，请乘一号梯',
      '或走安全通道。',
      '　　金桥园物业中心'], 0],
    [4.55, C('#e3ece0'), '垃圾分类', col.green, 'refuse', [
      '厨余垃圾　可回收物',
      '有害垃圾　其他垃圾',
      '定时投放：',
      '早 6:30—9:00',
      '晚 18:00—20:30'], 1],
    [5.05, col.paperY, '寻　猫　启　事', col.redD, 'cat', [
      '橘白色公猫，戴红项圈',
      '八月一日三号楼走失',
      '见到请联系王阿姨',
      '3-501　必有酬谢'], 2],
    [5.55, col.paper, '舞蹈队排练', C('#8a3fa0'), 'dance', [
      '每周二、四',
      '19:00—20:30',
      '地点：四层活动室',
      '欢迎新老队员参加',
      '领队　李阿姨'], 0],
  ];
  const expired = [];                       // the stamps, so one setter can drive all of them
  for (const [nz, sheet, title, tcol, id, lines, kind] of NOTES) {
    const tilt = (Math.round(nz * 10) % 3 - 1) * .012;   // nothing on a notice board is straight
    box(BX + .050, Y + 1.50, nz, .010, .52, .40, sheet,
        { hard: true, gloss: .04, rx: tilt, tag: '通知' });
    G(BX + .062, Y + 1.705, nz, PI / 2, title, { size: .036, gap: .006, color: tcol });
    box(BX + .062, Y + 1.665, nz, .004, .005, .34, tcol, { hard: true });
    lines.forEach((ln, i) =>
      G(BX + .062, Y + 1.605 - i * .068, nz, PI / 2, ln,
        { size: .023, gap: .003, color: col.ink }));
    // the red seal on the ones the office issued, the four bins on the recycling one, the cat on
    // the cat — each notice looks like the kind of notice it is
    if (kind === 0) {
      cyl(BX + .062, Y + 1.30, nz - .128, .036, .004, C('#b03225'),
          { ry: PI / 2, rz: PI / 2, alpha: .8 });
      cyl(BX + .066, Y + 1.30, nz - .128, .028, .003, sheet, { ry: PI / 2, rz: PI / 2 });
    }
    if (kind === 1)
      for (let k = 0; k < 4; k++)
        box(BX + .062, Y + 1.30, nz + .135 - k * .09, .006, .07, .062,
            [col.green, C('#2f74b5'), C('#c0392b'), C('#6d7378')][k],
            { hard: true, gloss: .12 });
    if (kind === 2) {
      box(BX + .062, Y + 1.34, nz, .006, .17, .22, C('#d8944e'), { hard: true, gloss: .10 });
      ball(BX + .066, Y + 1.40, nz, .004, .045, .052, col.white, { gloss: .10 });
      ball(BX + .068, Y + 1.27, nz, .004, .030, .038, C('#b8402f'), { gloss: .10 });
    }
    // ---- the date line and the 已过期 stamp.
    //
    // Every sheet now says which day it is about and whether that day has been. The stamp is one
    // box and one glyph per notice, built once and driven by alpha — the game clock passes the
    // date and a red 已过期 comes up across the sheet that nobody has taken down. That is the
    // whole of "dated and rotating": no rebuild, no second set of sheets, and no per-frame work.
    const win = HomeF4.NOTICES.find(r => r.id === id);
    if (win && win.to < 400) {
      G(BX + .062, Y + 1.245, nz, PI / 2, '有效期至 ' + win.to + ' 日',
        { size: .018, gap: .002, color: col.grey });
      const stampBox = box(BX + .074, Y + 1.52, nz, .004, .17, .34, C('#b03225'),
        { hard: true, gloss: .04, rz: .18, alpha: 0, tag: '通知' });
      const stampInk = box(BX + .078, Y + 1.52, nz, .003, .12, .29, col.paper,
        { hard: true, gloss: .04, rz: .18, alpha: 0 });
      G(BX + .082, Y + 1.52, nz, PI / 2, '已过期',
        { size: .066, gap: .014, color: C('#b03225'), rz: .18 });
      expired.push({ id, box: stampBox, ink: stampInk });
    }
  }
  // One setter, and every stamp on the board agrees with the clock. `day` is the game day the way
  // js/game.js keeps it; nothing calls this yet, which is the ticket at the foot of this file.
  HomeF4.setDay = day => {
    HomeF4.day = day;
    for (const e of expired) {
      const on = HomeF4.noticeFor(e.id, day) > 0 ? 1 : 0;
      e.box.alpha = on * .82;
      e.ink.alpha = on * .82;
    }
  };
  HomeF4.setDay(HomeF4.day === undefined ? 1 : HomeF4.day);
  // and the one taped to the outside of the glass, crooked, in biro
  box(BX + .086, Y + 1.06, 3.90, .008, .26, .30, col.white, { hard: true, gloss: .04, rx: .06 });
  G(BX + .096, Y + 1.14, 3.90, PI / 2, '收废品', { size: .045, gap: .008, color: C('#2b4a86') });
  G(BX + .096, Y + 1.08, 3.90, PI / 2, '纸箱　旧家电',
    { size: .026, gap: .004, color: C('#2b4a86') });
  G(BX + .096, Y + 1.00, 3.90, PI / 2, '13800000000',
    { size: .020, gap: .003, color: C('#2b4a86') });
  for (const [ty, tz] of [[.10, .13], [.10, -.13], [-.10, .13], [-.10, -.13]])
    box(BX + .092, Y + 1.06 + ty, 3.90 + tz, .003, .022, .045, C('#dfd8c4'), { hard: true });

  // --- 党员先锋岗 board on the office wall north of the case: red, and this is what these carry.
  box(BX, Y + 1.62, 6.00, .07, 1.30, .34, col.red, { hard: true, gloss: .14 });
  G(BX + .046, Y + 1.86, 6.00, PI / 2, '党员先锋岗',
    { size: .088, gap: .018, color: col.gold, vertical: true });
  G(BX + .046, Y + 1.14, 6.00, PI / 2, '亮身份　践承诺',
    { size: .034, gap: .007, color: col.gold });

  // ===================================================================== 9. 活动室 — the hall
  //
  // --- the sports mat under the table-tennis end. Green PVC, the way every one of these halls
  // covers the tile where the playing is.
  flat(0.60, MAT_Y, -1.00, 4.60, 3.30, col.felt, { mode: 7, gloss: .10 });
  flat(0.60, MAT_Y + .004, -1.00, 4.44, 3.14, C('#2f7057'), { mode: 7, gloss: .10 });

  // --- 乒乓球台. 2.74 by 1.525, top at 0.76, the long axis running east–west so both ends have
  // their run clear of the window wall and of the stage.
  const TX = 0.60, TZ = -1.00, TT = FL + .76;
  // The 44 mm slab is the carcass, and what you see of it is its edge: a table-tennis top is a
  // chipboard core, so the grain goes here. The 6 mm playing skin laid on it at the next line is
  // PAINT and is deliberately left bare — wood at .90 across a 2.74 m playing surface would draw
  // floorboards down the middle of the court.
  box(TX, TT - .022, TZ, 2.74, .044, 1.525, C('#1d5f52'), { hard: true, gloss: .30, ...CARC });
  box(TX, TT + .003, TZ, 2.70, .006, 1.49, C('#20695b'),
      { hard: true, gloss: .34, tag: '乒乓球台' });
  for (const [lx, lz, lw, ld] of [[TX, TZ - .755, 2.74, .022], [TX, TZ + .755, 2.74, .022],
                                  [TX - 1.360, TZ, .022, 1.525], [TX + 1.360, TZ, .022, 1.525],
                                  [TX, TZ, 2.74, .016]])
    box(lx, TT + .009, lz, lw, .006, ld, col.white, { hard: true, gloss: .20 });
  // the frame and the folding undercarriage
  for (const s of [-1, 1]) {
    box(TX + s * 1.18, TT - .30, TZ, .05, .52, .05, col.steelX,
        { hard: true, gloss: .40, ...FRAME });
    box(TX + s * 1.18, TT - .56, TZ, .07, .05, 1.30, col.steelX,
        { hard: true, gloss: .40, ...FRAME });
    for (const t of [-1, 1]) {
      cyl(TX + s * 1.18, FL + .045, TZ + t * .60, .055, .09, col.rubber, { gloss: .20 });
      box(TX + s * .70, TT - .16, TZ + t * .58, 1.00, .05, .05, col.steelX,
          { hard: true, gloss: .40, ...FRAME });
    }
  }
  // the net, its posts, and what is always lying on the table
  box(TX, TT + .085, TZ, .012, .1525, 1.60, C('#1c2226'),
      { hard: true, gloss: .10, alpha: .9 });
  box(TX, TT + .160, TZ, .016, .022, 1.62, col.white, { hard: true, gloss: .14 });
  for (const s of [-1, 1]) cyl(TX, TT + .085, TZ + s * .80, .014, .18, col.steelD, { gloss: .45 });
  for (const [px, pz, pr] of [[TX - .82, TZ + .42, .5], [TX + .95, TZ - .48, -1.1]]) {
    box(px, TT + .022, pz, .155, .014, .145, C('#8c3a2c'),
        { hard: true, gloss: .22, ry: pr, tag: '球拍' });
    box(px, TT + .030, pz, .140, .006, .130, C('#1c1c1c'), { hard: true, gloss: .16, ry: pr });
    box(px + Math.sin(pr) * .13, TT + .022, pz + Math.cos(pr) * .13, .035, .014, .11, col.woodL,
        { hard: true, gloss: .20, ry: pr });
  }
  ball(TX + .35, TT + .026, TZ + .60, .020, .020, .020, C('#f2ead2'),
       { gloss: .24, tag: '乒乓球' });
  ball(TX - 1.55, FL + .020, TZ + .90, .020, .020, .020, C('#f2ead2'), { gloss: .24 });
  // Grounding the table, in three layers, for the reason set out at the head of this file.
  //   1. the mass overhead. Broad and soft, and eased from .30 to .24 because it is no longer
  //      being asked to do a job it cannot do — the feet carry that now.
  shade(TX, TZ, 2.90, 1.70, .24, SHY);
  //   2. the two side rails. The undercarriage runs the length of the table at z = TZ ± .60, and
  //      a band under each is the shadow the table's bulk actually casts on a still day indoors.
  //      2.70 x .34 puts its semi-axes at 1.35 and .17, so the band is dark all the way along the
  //      rail instead of only beneath the net.
  for (const t of [-1, 1]) shade(TX, TZ + t * .60, 2.70, .34, .19, SHY);
  //   3. the four feet, which are what make it sit down. Each patch is centred on its own foot,
  //      so the foot is at r = 0 and takes the full alpha, and .40 m across against a 110 mm
  //      rubber foot leaves a tight dark core with about 145 mm of falloff around it.
  for (const s of [-1, 1]) for (const t of [-1, 1])
    foot(TX + s * 1.18, TZ + t * .60, .20, .54);
  // The table itself is 2.74 x 1.525 and the undercarriage does not oversail it, so the collider is
  // the table plus a centimetre — `clampMove` already spends 0.30 m of body radius on every side
  // of this and the hall is only 8 m deep.
  stop(TX - 1.38, TX + 1.38, TZ - .78, TZ + .78);
  // a score board on a stand at the end of the table
  box(TX + 1.72, FL + .52, TZ + .62, .30, .22, .05, col.dark, { hard: true, gloss: .28 });
  G(TX + 1.72, FL + .52, TZ + .585, 0, '7:9',
    { size: .075, gap: .014, color: C('#ffb257'), mode: 1, glow: .10 });
  cyl(TX + 1.72, FL + .21, TZ + .62, .018, .62, col.steelD, { gloss: .42, ...FRAME });
  cyl(TX + 1.72, FL + .012, TZ + .62, .13, .024, col.steelX, { gloss: .42, ...FRAME });
  // A single centred post, so this patch was already at r = 0 where it matters and only needed
  // tightening onto the 130 mm base plate rather than spreading over 300 mm of clean tile.
  shade(TX + 1.72, TZ + .62, .34, .34, .48, SHY);

  // --- 麻将桌. Square, four chairs, and a game abandoned in the middle of it: the walls still
  // standing, one player's hand face-up in front of them, three discards in the well.
  const MX = -3.60, MZ = -2.60, MT = FL + .75;
  box(MX, MT - .035, MZ, 1.00, .07, 1.00, col.woodD, { hard: true, gloss: .18, ...CARC });
  box(MX, MT + .004, MZ, .92, .012, .92, C('#2f6a4e'),
      { hard: true, mode: 7, gloss: .06, tag: '麻将' });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    cyl(MX + sx * .41, FL + .36, MZ + sz * .41, .028, .72, col.woodD, { gloss: .20, ...CARC });
  // Its legs stand at (±.41, ±.41), which on the old 1.30 patch was r = .89 and therefore 0.4% of
  // the alpha — four legs touching a floor that had no record of them.
  shade(MX, MZ, 1.30, 1.30, .26, SHY);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    foot(MX + sx * .41, MZ + sz * .41, .13, .48);
  // the four walls of tiles, doubled, the way they are built before a hand
  const tileC = C('#efe7d2'), tileB = C('#2f7a5e');
  for (let w = 0; w < 4; w++) {
    const a = w * PI / 2, dx = Math.cos(a), dz = Math.sin(a);
    for (let i = 0; i < 9; i++) {
      const t = (i - 4) * .052;
      const px = MX + dx * .30 - dz * t, pz = MZ + dz * .30 + dx * t;
      for (const ly of [0, .034]) {
        box(px, MT + .019 + ly, pz, .046, .032, .028, tileC,
            { hard: true, gloss: .22, ry: -a });
        box(px + dx * .015, MT + .019 + ly, pz + dz * .015, .018, .028, .026, tileB,
            { hard: true, gloss: .18, ry: -a });
      }
    }
  }
  // one player's hand, stood up facing them, and three discards face-up in the well
  for (let i = 0; i < 7; i++)
    box(MX - .16 + i * .053, MT + .038, MZ + .40, .048, .066, .026, tileC,
        { hard: true, gloss: .22 });
  for (const [dx2, dz2, mk] of [[-.06, .02, '中'], [.05, -.04, '发'], [.12, .07, '東']]) {
    box(MX + dx2, MT + .017, MZ + dz2, .048, .026, .066, tileC,
        { hard: true, gloss: .22, ry: dz2 * 4 });
    G(MX + dx2, MT + .031, MZ + dz2 - .002, 0, mk,
      { size: .034, color: mk === '中' ? col.red : col.green, gloss: .10 });
  }
  for (const s of [-1, 1])
    ball(MX + .30 + s * .035, MT + .026, MZ - .30, .017, .017, .017, col.white, { gloss: .30 });
  // four red plastic chairs, one pushed back
  // `yaw` is the direction the chair faces, so the back goes on the other side of the seat from
  // it: (-sin, +cos) rather than (-sin, -cos). With the sign the other way round every chair round
  // this table had its back between the sitter and the tiles.
  // The seat and the back take `fabric`, and that is a judgement worth stating rather than
  // hiding: the comment above calls these plastic, and a monobloc chair is not upholstered. But a
  // 麻将 chair is the one seat in the room that is, because people sit in it for four hours —
  // these are the red vinyl-over-foam pads on a painted tube frame that every estate hall owns,
  // and the weave at .35 with .28 of amount is what stops the seat and the back reading as two
  // red blocks. The stacked chairs against the east wall are left as plastic; see section 9.
  // The legs get `metal`, which is what a painted steel tube is.
  function stoolChair(x, z, yaw, c) {
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    box(x, FL + .44, z, .40, .045, .40, c, { gloss: .22, ry: yaw, ...SOFT });
    box(x - sn * .19, FL + .70, z + cs * .19, .40, .50, .05, c,
        { gloss: .22, ry: yaw, ...SOFT });
    const legs = [[-.16, -.16], [.16, -.16], [-.16, .16], [.16, .16]]
      .map(([ox, oz]) => [x + cs * ox - sn * oz, z + sn * ox + cs * oz]);
    for (const [lx, lz] of legs)
      cyl(lx, FL + .22, lz, .017, .44, C('#9e2d22'), { gloss: .24, ...FRAME });
    // A .48 patch put these legs at r = .94, i.e. 0.09% of the alpha. The chairs were the loudest
    // "unfinished" thing in the room partly because they were floating a millimetre off the tile.
    // 17 mm tube gets a small patch: .11 m across is a shadow, .30 m would be a pool of ink.
    shade(x, z, .52, .52, .20, SHY);
    for (const [lx, lz] of legs) foot(lx, lz, .055, .52);
  }
  stoolChair(MX, MZ + .78, 0, col.plastic);
  stoolChair(MX, MZ - .78, PI, col.plastic);
  stoolChair(MX - .80, MZ, PI / 2, col.plastic);
  stoolChair(MX + .86, MZ - .12, -PI / 2 + .3, col.plastic);
  stop(MX - 1.02, MX + 1.06, MZ - 1.04, MZ + 1.02);
  // the tea, the thermos and the ashtray, which are as much a part of a 麻将 table as the tiles
  cyl(MX + .40, MT + .075, MZ + .34, .036, .15, C('#cfe0d2'),
      { alpha: .55, gloss: .70, tag: '茶杯' });
  cyl(MX + .40, MT + .046, MZ + .34, .031, .09, C('#8a7a34'), { gloss: .20 });
  cyl(MX - .40, MT + .125, MZ - .30, .048, .25, C('#b8443a'), { gloss: .30, tag: '暖瓶' });
  cyl(MX - .40, MT + .262, MZ - .30, .030, .04, col.steel, { gloss: .5 });
  cyl(MX + .38, MT + .016, MZ - .36, .055, .022, C('#8d949a'), { gloss: .40 });

  // --- 舞台. A 0.30 m platform against the east wall with a red curtain behind it and a banner
  // across the top of it, which is what a community hall stage is everywhere in China.
  const SX0 = 4.50, SX1 = 6.00, SZ0 = -0.80, SZ1 = 2.20, SH = .30;
  box((SX0 + SX1) / 2, FL + SH / 2, (SZ0 + SZ1) / 2, SX1 - SX0, SH, SZ1 - SZ0,
      C('#8a6a48'), TIMBER);
  flat((SX0 + SX1) / 2, FL + SH + .006, (SZ0 + SZ1) / 2, SX1 - SX0 - .03, SZ1 - SZ0 - .03,
       C('#9a7852'), { mode: 3, gloss: .28, ...MAT.timber });
  box(SX0 + .02, FL + SH / 2, (SZ0 + SZ1) / 2, .05, SH, SZ1 - SZ0, C('#8c2b20'),
      { hard: true, gloss: .14 });
  for (const sz of [SZ0 + .025, SZ1 - .025])
    box((SX0 + SX1) / 2 + .05, FL + SH / 2, sz, SX1 - SX0 - .10, SH, .05, C('#8c2b20'),
        { hard: true, gloss: .14 });
  box(SX0 + .05, FL + SH + .012, (SZ0 + SZ1) / 2, .06, .022, SZ1 - SZ0 - .06, C('#a98d52'),
      { hard: true, gloss: .50 });
  shade((SX0 + SX1) / 2, (SZ0 + SZ1) / 2, 1.80, 3.30, .22, SHY);
  // A platform is a straight edge meeting the floor, and a radial patch is the wrong shape for
  // one: on the 1.80 patch the stage's own front edge sat at r = .83 and took 3% of the alpha, so
  // the one line in the room that has to read as "this thing rests on that thing" read as a seam.
  // A narrow strip laid ALONG the edge is dark for its whole length and falls off 170 mm either
  // side, which is what the base of a 300 mm riser actually does.
  shade(SX0, (SZ0 + SZ1) / 2, .34, SZ1 - SZ0 + .10, .42, SHY);
  stop(SX0 - .05, 6.35, SZ0 - .05, SZ1 + .05);
  // the curtain: vertical folds, so it reads as cloth and not as a red wall
  for (let i = 0; i < 16; i++) {
    const cz = SZ0 + .10 + i * ((SZ1 - SZ0 - .20) / 15);
    cyl(X1 - .10 - (i % 2) * .022, Y + 1.42, cz, .062, 2.32, i % 2 ? C('#8e1f18') : col.red,
        { gloss: .10, mat: 'fabric', matScale: .5, matAmt: .28, nrmAmt: .30 });
  }
  box(X1 - .13, Y + 2.62, (SZ0 + SZ1) / 2, .10, .10, SZ1 - SZ0 + .10, col.woodD, TIMBER);
  // the banner. White on red, hung across the whole of the back wall over the stage.
  // X1 - .30, not X1 - .17: the curtain folds are 0.062 m cylinders standing at x 5.82 .. 5.96,
  // so a banner at 5.81 hangs inside the cloth instead of across the front of it.
  box(X1 - .30, Y + 2.34, (SZ0 + SZ1) / 2, .04, .38, SZ1 - SZ0 + .06, col.red,
      { hard: true, gloss: .12, tag: '横幅' });
  G(X1 - .325, Y + 2.34, (SZ0 + SZ1) / 2, -PI / 2, '邻里一家亲　共建文明社区',
    { size: .175, gap: .034, color: col.white, tag: '横幅' });
  // 电子琴 on its X-stand at the front of the stage, which is the piano a 活动室 actually owns
  const PXK = 5.05, PZK = 1.35, PYK = FL + SH + .70;
  box(PXK, PYK, PZK, .38, .085, 1.28, C('#22262a'), { hard: true, gloss: .30, tag: '电子琴' });
  box(PXK - .04, PYK + .052, PZK, .27, .022, 1.20, C('#f0ece0'),
      { hard: true, gloss: .24, tag: '电子琴' });
  for (let k = 0; k < 17; k++) {
    if (k % 7 === 2 || k % 7 === 6) continue;
    box(PXK - .085, PYK + .066, PZK - .56 + k * .07, .17, .022, .034, C('#17191c'),
        { hard: true, gloss: .30 });
  }
  box(PXK + .14, PYK + .056, PZK - .40, .09, .026, .30, C('#2b3138'), { hard: true, gloss: .34 });
  box(PXK + .14, PYK + .070, PZK - .40, .06, .006, .22, C('#4f7d92'),
      { hard: true, mode: 1, glow: .05 });
  for (const s of [-1, 1]) {
    cyl(PXK, PYK - .35, PZK + s * .40, .020, .78, col.steelX, { rz: .30, gloss: .40 });
    cyl(PXK, PYK - .35, PZK + s * .40, .020, .78, col.steelX, { rz: -.30, gloss: .40 });
  }
  // a music stand, a mic on a boom at the front edge, and the speaker beside it
  box(4.78, FL + SH + .96, .20, .05, .32, .40, col.dark, { hard: true, gloss: .24, rx: -.35 });
  box(4.78, FL + SH + .97, .20, .02, .28, .34, col.paper, { hard: true, gloss: .05, rx: -.35 });
  cyl(4.78, FL + SH + .48, .20, .015, .96, col.steelX, { gloss: .42 });
  cyl(4.72, FL + SH + .58, -.40, .016, 1.16, col.dark, { gloss: .34 });
  cyl(4.72, FL + SH + 1.16, -.40, .022, .13, C('#1c1f22'), { rz: .5, gloss: .30 });
  cyl(4.72, FL + SH + .015, -.40, .16, .026, col.dark, { gloss: .30 });
  box(4.72, FL + SH + .92, 2.05, .30, .60, .26, C('#26292d'), { hard: true, gloss: .24 });
  cyl(4.72, FL + SH + .74, 1.925, .095, .03, C('#3c4045'), { rx: PI / 2, gloss: .30 });
  cyl(4.72, FL + SH + 1.06, 1.925, .055, .03, C('#3c4045'), { rx: PI / 2, gloss: .30 });
  for (const s of [-1, 1])
    cyl(4.72 + s * .16, FL + SH + .30, 2.05, .016, .62, col.steelX, { rz: s * .12, gloss: .40 });
  shade(4.72, 2.05, .40, .40, .28, FL + SH + .012);
  // 文化活动室 over the stage, on the wall above the banner
  box(X1 - .08, Y + 2.66, SZ0 - .60, .05, .22, .90, col.white, { hard: true, gloss: .18 });
  G(X1 - .112, Y + 2.66, SZ0 - .60, -PI / 2, '文化活动室',
    { size: .120, gap: .024, color: col.redD });

  // --- the stacked plastic chairs. Two towers against the east wall, which is where they live
  // between the meeting and the film night.
  for (const [cx, cz, n] of [[5.62, 2.72, 8], [5.62, 3.14, 7]]) {
    for (let i = 0; i < n; i++) {
      const yb = FL + .40 + i * .085, tw = i * .006;
      box(cx, yb, cz, .40 + tw, .045, .40 + tw, i % 2 ? col.plastic : C('#b8352a'),
          { gloss: .22, ry: .02 * (i % 2) });
      box(cx + .18, yb + .26, cz, .05, .48, .40 + tw, i % 2 ? col.plastic : C('#b8352a'),
          { gloss: .22 });
    }
    // Left as plastic on purpose. A stacking monobloc is moulded polypropylene and has no cloth on
    // it anywhere; only the 麻将 chairs in section 9 are upholstered. What these were missing was
    // never a material, it was the floor: eight seats of stacked chair is 40 kg standing on four
    // 17 mm tubes, and the tubes had no shadow under them.
    for (const [ox, oz] of [[-.16, -.16], [.16, -.16], [-.16, .16], [.16, .16]]) {
      cyl(cx + ox, FL + .20, cz + oz, .017, .40, C('#8e2a20'), { gloss: .24, ...FRAME });
      foot(cx + ox, cz + oz, .055, .54);
    }
    shade(cx, cz, .58, .58, .22, SHY);
  }
  stop(5.32, 6.35, 2.42, 3.40);

  // --- 健身角. The outdoor steel machines every estate has, brought indoors and bolted to the
  // floor of the hall — yellow-green frames, blue moving parts, and the instruction plate that
  // nobody reads.
  flat(-5.30, MAT_Y, 0.55, 1.30, 2.60, C('#4a4f52'), { mode: 7, gloss: .12 });
  const GFX = -5.42;
  // 太极揉推器 — two discs on a frame, turned by hand
  cyl(GFX, FL + .62, -0.15, .045, 1.24, col.lime,
      { gloss: .34, ...MAT.metal, tag: '健身器材' });
  cyl(GFX, FL + .015, -0.15, .13, .03, col.steelX, { gloss: .40 });
  box(GFX + .10, FL + 1.10, -0.15, .18, .07, .74, col.lime, { hard: true, gloss: .34 });
  for (const s of [-1, 1]) {
    cyl(GFX + .21, FL + 1.10, -0.15 + s * .30, .215, .045, col.blue,
        { rz: PI / 2, gloss: .38, tag: '健身器材' });
    cyl(GFX + .245, FL + 1.10, -0.15 + s * .30, .195, .012, C('#3f8ed0'),
        { rz: PI / 2, gloss: .30 });
    cyl(GFX + .26, FL + 1.22, -0.15 + s * .30, .020, .09, col.steel,
        { rz: PI / 2, gloss: .55 });
  }
  // The three machines are each a single mast on a 260 mm base plate, and every one of these
  // patches is centred on the machine's spread rather than on its mast, which left the one place
  // it touches the floor at about a tenth of the alpha. The broad patch stays for the mass; the
  // mast gets its own.
  shade(GFX + .12, -0.15, .60, .90, .26, SHY);
  foot(GFX, -0.15, .15, .50);
  // 漫步机 — the air walker, its two legs hanging at rest and slightly apart
  cyl(GFX, FL + .58, 0.80, .045, 1.16, col.lime, { gloss: .34, ...MAT.metal, tag: '健身器材' });
  cyl(GFX, FL + .015, 0.80, .13, .03, col.steelX, { gloss: .40 });
  box(GFX + .12, FL + 1.14, 0.80, .22, .07, .60, col.lime, { hard: true, gloss: .34 });
  for (const [s, tilt] of [[-1, .22], [1, -.15]]) {
    cyl(GFX + .30, FL + .66, 0.80 + s * .24, .020, .98, col.blue, { rx: tilt, gloss: .38 });
    box(GFX + .30, FL + .18, 0.80 + s * .24 + tilt * .42, .26, .05, .13, col.steelX,
        { hard: true, gloss: .34 });
  }
  for (const s of [-1, 1])
    cyl(GFX + .14, FL + 1.02, 0.80 + s * .26, .020, .44, col.blue,
        { rx: PI / 2, rz: .2, gloss: .38 });
  shade(GFX + .18, 0.80, .60, .80, .26, SHY);
  foot(GFX, 0.80, .15, .50);
  // 上肢牵引器 — the overhead pulley, its two handles hanging on cords at different heights
  cyl(GFX, FL + .96, 1.72, .045, 1.92, col.lime, { gloss: .34, ...MAT.metal, tag: '健身器材' });
  cyl(GFX, FL + .015, 1.72, .13, .03, col.steelX, { gloss: .40 });
  box(GFX + .16, FL + 1.88, 1.72, .34, .08, .62, col.lime, { hard: true, gloss: .34 });
  for (const [s, drop] of [[-1, .52], [1, .30]]) {
    cyl(GFX + .30, FL + 1.88 - drop / 2, 1.72 + s * .24, .006, drop, C('#d9d3c2'), { gloss: .18 });
    cyl(GFX + .30, FL + 1.88 - drop - .05, 1.72 + s * .24, .022, .17, col.blue,
        { rx: PI / 2, gloss: .38 });
  }
  shade(GFX + .18, 1.72, .55, .70, .24, SHY);
  foot(GFX, 1.72, .15, .50);
  // the sign over the corner and one instruction plate
  box(X0 + .07, Y + 2.28, 0.80, .05, .26, 1.40, col.white, { hard: true, gloss: .18 });
  G(X0 + .115, Y + 2.32, 0.80, PI / 2, '健　身　角',
    { size: .105, gap: .020, color: col.redD });
  G(X0 + .115, Y + 2.19, 0.80, PI / 2, '使用前请阅读说明　儿童须有人陪同',
    { size: .038, gap: .006, color: col.grey });
  // The plate faces +x, so its writing goes at GFX - .088 — twelve millimetres in FRONT of the
  // face at GFX - .080. At GFX - .128 it was behind the plate and invisible.
  box(GFX - .10, FL + 1.44, -0.15, .04, .20, .30, col.paper, { hard: true, gloss: .08 });
  G(GFX - .088, FL + 1.49, -0.15, PI / 2, '太极揉推器',
    { size: .034, gap: .005, color: col.ink });
  G(GFX - .088, FL + 1.41, -0.15, PI / 2, '每次 3—5 分钟',
    { size: .026, gap: .004, color: col.grey });
  // The machines reach x = -5.09 at their furthest (the pulley head), so the collider stops at
  // -4.98 rather than -4.72 and gives a quarter of a metre of the hall back.
  stop(-6.35, -4.98, -0.72, 1.92);

  // --- the spare table-tennis table folded against the west wall, and the booking notice over it.
  box(X0 + .16, FL + .78, -3.20, .18, 1.52, 1.42, C('#1d5f52'),
      { hard: true, gloss: .26, rz: .04 });
  box(X0 + .27, FL + .78, -3.20, .06, 1.44, 1.30, col.steelX,
      { hard: true, gloss: .34, rz: .04 });
  shade(X0 + .30, -3.20, .40, 1.50, .30, SHY);
  box(X0 + .07, Y + 1.62, -1.95, .05, .34, .48, col.paper, { hard: true, gloss: .06 });
  G(X0 + .115, Y + 1.72, -1.95, PI / 2, '场地使用', { size: .048, gap: .009, color: col.redD });
  G(X0 + .115, Y + 1.645, -1.95, PI / 2, '乒乓球　每次 40 分钟', { size: .028, gap: .004 });
  G(X0 + .115, Y + 1.575, -1.95, PI / 2, '请到物业窗口登记', { size: .028, gap: .004 });
  G(X0 + .115, Y + 1.505, -1.95, PI / 2, '爱护器材　用后归位',
    { size: .026, gap: .004, color: col.grey });

  // --- 意见箱 and 值班表, on the wall east of the service window. The two things a Beijing 物业
  // office is legally obliged to have on show and the two nobody looks at, which is precisely why
  // a floor that wants to read as a real 物业 office needs them.
  {
    const IX = -2.42, IZ = OFZ - .040;
    box(IX, Y + 1.42, IZ, .30, .40, .10, C('#3f6f4f'), { hard: true, gloss: .26, tag: '意见箱' });
    box(IX, Y + 1.56, IZ - .052, .22, .020, .012, C('#25412f'), { hard: true, gloss: .34 });
    box(IX, Y + 1.26, IZ - .052, .26, .09, .008, col.white, { hard: true, gloss: .12 });
    G(IX, Y + 1.26, IZ - .062, PI, '意见箱', { size: .040, gap: .008, color: col.ink });
    cyl(IX + .10, Y + 1.40, IZ - .054, .012, .010, C('#a98d52'), { rx: PI / 2, gloss: .48 });
    // the duty roster beside it: a week of names in a grid, which is what 值班 looks like
    box(IX + .62, Y + 1.46, IZ - .006, .62, .52, .022, col.white, { hard: true, gloss: .14 });
    box(IX + .62, Y + 1.66, IZ - .020, .62, .12, .006, col.red, { hard: true, gloss: .12 });
    G(IX + .62, Y + 1.66, IZ - .030, PI, '值班表', { size: .048, gap: .010, color: col.gold });
    for (let i = 0; i < 5; i++) {
      const ry3 = Y + 1.54 - i * .072;
      G(IX + .44, ry3, IZ - .026, PI, ['一', '二', '三', '四', '五'][i],
        { size: .030, gap: .005, color: col.ink });
      G(IX + .74, ry3, IZ - .026, PI, ['王', '李', '张', '王', '刘'][i],
        { size: .030, gap: .005, color: C('#5d3b1c') });
      box(IX + .62, ry3 - .036, IZ - .024, .56, .003, .003, C('#c3bba6'), { hard: true });
    }
    TH('意见箱', IX, Y + 1.42, IZ - .18, '墙上挂着一个意见箱。',
       'There is a suggestions box on the wall.',
       '意见 an opinion, a complaint + 箱 box. Nobody has ever seen it opened.',
       IX, OFZ - .80, 1.7, '意见箱');
  }

  // ===================================================================== 9a. 借阅台
  //
  // The lending desk the 阅览角 never had. Two shelves of books and a rack of newspapers make a
  // place to stand and read; a desk with a card drawer, a date stamp and a ledger is what makes it
  // somewhere you go twice — you take a title away and the estate expects it back.
  //
  // In the pocket east of the lift, west of the newspaper rack, against the north wall.
  {
    // In the hall, against the landing wall west of the shafts — NOT in the pocket east of the
    // lift, where it stood for one run at x 3.05, z 5.80. The working shaft is x 1.6 .. 3.4,
    // z 4.9 .. 6.2 and the car sits at (2.50, 5.55): that desk's collider was x 2.41 .. 3.69,
    // z 5.44 .. 6.20, which is INSIDE THE LIFT. Inflated by the body radius it covered the car
    // completely, so no body could stand in the car and the whole of F4 measured as 0 reachable
    // cells — every fixture on the floor, including the ones that predate this lane, unreachable.
    // Anything placed near the core has to be checked against LIFT/LIFT_B, not just against the
    // other furniture.
    const BDX = 0.55, BDZ = 2.55;
    box(BDX, Y + .38, BDZ, 1.10, .76, .56, C('#9d7c52'), { hard: true, gloss: .18, ...CARC });
    box(BDX, Y + .78, BDZ, 1.22, .05, .64, C('#8a6a48'), { hard: true, gloss: .26, ...CARC });
    box(BDX, Y + .755, BDZ - .33, 1.22, .10, .03, C('#a98d52'), { hard: true, gloss: .46 });
    for (let r = 0; r < 3; r++)
      box(BDX - .32, Y + .24 + r * .22, BDZ - .28, .40, .18, .014, C('#b8a882'),
          { hard: true, gloss: .20 });
    for (let r = 0; r < 3; r++)
      cyl(BDX - .32, Y + .24 + r * .22, BDZ - .295, .020, .012, C('#a98d52'),
          { rx: PI / 2, gloss: .48 });
    // the card index on top, the date stamp and its pad, and the ledger left open
    box(BDX + .34, Y + .89, BDZ + .04, .34, .17, .40, C('#7d6340'), { hard: true, gloss: .20 });
    for (let i = 0; i < 9; i++)
      box(BDX + .34, Y + .955, BDZ + .04 - .16 + i * .036, .30, .012, .026, col.paper,
          { hard: true, gloss: .04, rx: (i % 3 - 1) * .02 });
    cyl(BDX + .02, Y + .84, BDZ + .10, .038, .07, C('#3a3d42'), { gloss: .26 });
    cyl(BDX + .02, Y + .90, BDZ + .10, .026, .06, C('#8a6a48'), { gloss: .20 });
    cyl(BDX + .13, Y + .815, BDZ + .12, .050, .022, C('#c9382a'), { gloss: .22 });
    box(BDX - .28, Y + .815, BDZ + .06, .44, .012, .32, col.paper,
        { hard: true, gloss: .05, ry: .12 });
    box(BDX - .28, Y + .822, BDZ + .06, .40, .003, .28, C('#dfd8c4'), { hard: true, ry: .12 });
    for (let i = 0; i < 5; i++)
      box(BDX - .28, Y + .826, BDZ - .04 + i * .052, .34, .002, .004, C('#8d9aa4'),
          { hard: true, ry: .12 });
    cap(BDX - .10, Y + .84, BDZ - .14, .006, .14, .006, C('#2b4f86'),
        { rz: PI / 2, ry: .5, gloss: .40 });
    // the sign, and the two rules under it that every 阅览室 in the country has
    box(BDX, Y + 1.62, BDZ + .34, .84, .30, .04, col.redD, { hard: true, gloss: .14 });
    G(BDX, Y + 1.66, BDZ + .312, PI, '图书借阅', { size: .072, gap: .015, color: col.gold });
    G(BDX, Y + 1.55, BDZ + .312, PI, '每次两册　借期两周',
      { size: .030, gap: .005, color: C('#e8d8a8') });
    // and a shelf of what there is to borrow, above the desk
    box(BDX, Y + 1.24, BDZ + .28, 1.20, .04, .26, C('#9d7c52'), { hard: true, gloss: .20, ...CARC });
    for (let i = 0; i < 14; i++)
      box(BDX - .52 + i * .080, Y + 1.38, BDZ + .27, .062, .24, .20,
          [C('#8a3f34'), C('#3f5f7a'), C('#4f7a52'), C('#8a6a3c'), C('#5d4a6a')][i % 5],
          { hard: true, gloss: .12, rz: i === 9 ? .16 : 0, tag: '书' });
    shade(BDX, BDZ, 1.34, .76, .30, SHY);
    stop(BDX - .64, BDX + .64, BDZ - .36, BDZ + .40);
    TH('借书', BDX, Y + 1.00, BDZ - .42, '借书要登记，一次两本。',
       'To borrow you sign the ledger: two at a time.',
       '借 to borrow + 书 book. 还书 huán shū is to give it back. 借期 — the loan period.',
       BDX, BDZ - 1.00, 1.9, '借书');
  }

  // ===================================================================== 9b. 棋牌桌
  //
  // A Beijing 活动室 always runs two games side by side and this one ran one. F3 owns 象棋 as a
  // private board in 老李's flat; this is the public one — a folding baize table with a 象棋 board
  // painted on it, a 围棋 set in its two bowls, and four stools, because the 棋牌 half of the room
  // is what the other half of the retired men come up for.
  //
  // South of the 乒乓球台 and clear of it: the table's colliders reach z -2.90 and the tennis
  // table's start at -1.78, so there is 1.1 m of walking between them.
  {
    const QX = -0.20, QZ = -3.70, QT = FL + .74;
    box(QX, QT - .030, QZ, 1.24, .06, 1.24, C('#8a6a48'), { hard: true, gloss: .18, ...CARC });
    box(QX, QT + .006, QZ, 1.16, .012, 1.16, C('#2f6a4e'),
        { hard: true, mode: 7, gloss: .06, tag: '棋牌' });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      cyl(QX + sx * .50, FL + .35, QZ + sz * .50, .026, .70, col.steelD, { gloss: .34, ...METAL });
      foot(QX + sx * .50, QZ + sz * .50, .12, .46);
    }
    // the 象棋 board painted on the baize: the river across the middle and the two palaces
    box(QX, QT + .014, QZ, .78, .004, .86, C('#d8c9a4'), { hard: true, gloss: .08, tag: '棋牌' });
    for (let i = 0; i < 9; i++)
      box(QX - .34 + i * .085, QT + .017, QZ, .004, .003, .82, C('#7a6440'), { hard: true });
    for (let i = 0; i < 10; i++)
      box(QX, QT + .017, QZ - .38 + i * .0845, .74, .003, .004,
          i === 4 || i === 5 ? C('#a89060') : C('#7a6440'), { hard: true });
    box(QX, QT + .019, QZ, .74, .003, .085, C('#e2d6b4'), { hard: true, gloss: .06 });
    G(QX - .16, QT + .021, QZ, 0, '楚河', { size: .052, gap: .012, color: C('#7a5a34'), rx: -PI / 2 });
    G(QX + .17, QT + .021, QZ, 0, '汉界', { size: .052, gap: .012, color: C('#7a5a34'), rx: -PI / 2 });
    // the pieces: two colours, discs, and a handful off the board where they were taken
    for (let i = 0; i < 11; i++) {
      const px = QX - .30 + (i % 6) * .12, pz = QZ - .30 + Math.floor(i / 6) * .60;
      cyl(px, QT + .028, pz, .030, .016, i % 2 ? C('#8a2f24') : C('#3a352e'), { gloss: .22 });
    }
    for (let i = 0; i < 5; i++)
      cyl(QX + .48, QT + .026 + i * .014, QZ - .34 + (i % 2) * .05, .030, .014,
          i % 2 ? C('#8a2f24') : C('#3a352e'), { gloss: .22 });
    // the 围棋 bowls, lidded, on the far corner
    for (const s of [-1, 1]) {
      taper(QX + .40 + s * .001, QT + .050, QZ + .40 + s * .18, .22, .10, .22,
            C('#6a4a2c'), { gloss: .26 });
      ball(QX + .40, QT + .108, QZ + .40 + s * .18, .105, .045, .105,
           C('#5d4026'), { gloss: .30 });
    }
    // the tea, the ashtray and the folded newspaper that live on every one of these tables
    cyl(QX - .48, QT + .075, QZ - .42, .042, .15, C('#cfd8d2'), { mode: 18, alpha: .40, gloss: .74 });
    cyl(QX - .48, QT + .140, QZ - .42, .044, .020, C('#b8342a'), { gloss: .30 });
    cyl(QX - .44, QT + .026, QZ + .40, .075, .022, C('#8d949a'), { gloss: .34 });
    box(QX + .10, QT + .020, QZ - .48, .30, .008, .18, C('#e0dccb'), { hard: true, gloss: .05, ry: .22 });
    shade(QX, QZ, 1.60, 1.60, .26, SHY);
    stop(QX - .70, QX + .70, QZ - .70, QZ + .70);
    // four stools, two of them pulled out
    for (const [ox, oz, or_] of [[-1.00, 0, .1], [1.00, .08, -.2], [0, -1.02, .4], [.14, 1.00, -.5]]) {
      cyl(QX + ox, FL + .21, QZ + oz, .155, .42, C('#7d6340'), { gloss: .20, ...CARC });
      cyl(QX + ox, FL + .425, QZ + oz, .175, .04, C('#96774c'), { hard: true, gloss: .22, ry: or_ });
      foot(QX + ox, QZ + oz, .19, .44);
      stop(QX + ox - .20, QX + ox + .20, QZ + oz - .20, QZ + oz + .20);
    }
    TH('棋牌', QX, Y + .90, QZ - .80, '活动室里还有一张棋牌桌。',
       'The activity room has a card-and-chess table as well.',
       '棋 board game + 牌 cards. 棋牌室 is the room these two live in together.',
       QX, QZ - 1.30, 2.0, '棋牌');
    TH('象棋', QX, Y + .82, QZ + .10, '桌上摆着一盘没下完的象棋。',
       'An unfinished game of Chinese chess is set out on the table.',
       '象 elephant + 棋 board game. 楚河汉界 — the river across the middle of every board.',
       QX - 1.00, QZ - .10, 1.7, '象棋');
  }

  // ===================================================================== 9c. 快递柜
  //
  // The parcel locker, in the pocket between the office's east wall and the dead shaft — which is
  // the exact spot the comment over the 公告栏 calls "the pocket behind the board", and the reason
  // it was left clear. A bank of lockers in the estate office is the single most repeated reason a
  // Beijing resident goes to this floor, and it costs one cabinet and one keypad, not a system.
  //
  // Three columns, five rows, and the doors are one box each with a number on it rather than a
  // frame plus a leaf plus a hinge: at 1.4 m away that is what a locker door is, and fifteen of
  // them modelled properly would be ninety props for a thing nobody opens twice.
  {
    const KX = -1.02, KZ = 5.94, KW = 1.06, KD = .44, KH = 1.92;
    box(KX, Y + KH / 2, KZ, KW, KH, KD, C('#3f5f7a'), { hard: true, gloss: .30, tag: '快递柜' });
    box(KX, Y + KH + .05, KZ, KW + .06, .10, KD + .06, C('#33506a'),
        { hard: true, gloss: .26, tag: '快递柜' });
    box(KX, Y + KH + .22, KZ - .02, KW - .04, .24, .06, C('#c9382a'),
        { hard: true, gloss: .18, tag: '快递柜' });
    G(KX, Y + KH + .22, KZ - .054, PI, '智能快递柜',
      { size: .086, gap: .018, color: C('#f4efdf'), tag: '快递柜' });
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 3; c++) {
        const dx = KX - .34 + c * .34, dy = Y + .28 + r * .34;
        box(dx, dy, KZ - KD / 2 - .012, .31, .31, .014, C('#4b6e8a'),
            { hard: true, gloss: .34, tag: '快递柜' });
        box(dx + .12, dy, KZ - KD / 2 - .022, .026, .050, .010, C('#c9ced2'),
            { hard: true, gloss: .50 });
        G(dx - .09, dy + .10, KZ - KD / 2 - .026, PI, String(r * 3 + c + 1),
          { size: .034, gap: .006, color: C('#dfe6ea') });
      }
    // the screen and the keypad on the end column, which is what makes it 智能 rather than a shelf
    box(KX + .40, Y + 1.42, KZ - KD / 2 - .014, .30, .40, .020, C('#22282e'),
        { hard: true, gloss: .52, tag: '快递柜' });
    box(KX + .40, Y + 1.48, KZ - KD / 2 - .026, .26, .26, .006, C('#3f7f8e'),
        { hard: true, mode: 1, glow: .10 });
    G(KX + .40, Y + 1.52, KZ - KD / 2 - .034, PI, '取件',
      { size: .052, gap: .010, color: C('#eaf4f2'), mode: 1, glow: .12 });
    G(KX + .40, Y + 1.44, KZ - KD / 2 - .034, PI, '输入取件码',
      { size: .026, gap: .004, color: C('#9fc4c2'), mode: 1, glow: .08 });
    for (let i = 0; i < 12; i++)
      box(KX + .34 + (i % 3) * .06, Y + 1.28 - Math.floor(i / 3) * .055, KZ - KD / 2 - .022,
          .046, .042, .008, C('#4b5259'), { hard: true, gloss: .40 });
    cyl(KX + .40, Y + 1.68, KZ - KD / 2 - .026, .026, .010, C('#c9382a'),
        { rx: PI / 2, mode: 1, glow: .08 });
    // the parcels that did not fit, stacked on the floor beside it the way they always are
    for (const [bx, bz, bw, bh, bd, br] of [[KX - .74, KZ - .18, .40, .28, .32, .22],
                                            [KX - .70, KZ - .16, .34, .22, .28, -.34],
                                            [KX - .78, KZ + .16, .30, .20, .26, .10]])
      box(bx, Y + bh / 2 + (bz > KZ ? .00 : .00) + (bw < .35 ? .28 : 0), bz, bw, bh, bd,
          C('#ab8f62'), { hard: true, gloss: .10, ry: br, mode: 11 });
    box(KX - .74, Y + .30, KZ - .34, .26, .012, .006, C('#e6e0cd'), { hard: true, gloss: .06 });
    shade(KX, KZ, KW + .30, KD + .40, .34, SHY);
    shade(KX - .74, KZ - .02, .58, .62, .28, SHY);
    stop(KX - .58, KX + .58, KZ - .30, KZ + .28);
    stop(KX - .96, KX - .52, KZ - .40, KZ + .34);
    TH('快递', KX, Y + 1.30, KZ - .40, '快递柜在电梯口旁边。',
       'The parcel lockers are beside the lift.',
       '快 fast + 递 to deliver. 取件码 qǔjiànmǎ — the code that opens your door.',
       KX + .10, KZ - .95, 1.9, '快递柜');
  }

  // ===================================================================== 10. 阅览角
  //
  // The reading corner, in the pocket east of the lift: a newspaper rack, one bookcase and the
  // water dispenser with the big blue bottle, because that is all that fits in 2.5 by 1.3.
  const RRX = 4.35, RRZ = Z1 - .16;
  box(RRX, FL + .90, RRZ + .06, 1.30, 1.80, .10, C('#8a6a48'), TIMBER);
  for (let r = 0; r < 4; r++) {
    const ry2 = FL + 1.52 - r * .40;
    box(RRX, ry2, RRZ - .09, 1.24, .035, .26, C('#9d7c52'),
        { hard: true, gloss: .20, rx: .18 });
    box(RRX, ry2 - .12, RRZ - .16, 1.24, .05, .05, col.steelD, { hard: true, gloss: .40 });
    for (let c = 0; c < 3; c++) {
      const px = RRX - .40 + c * .40;
      box(px, ry2 + .020, RRZ - .105, .34, .008, .24,
          [col.paper, col.paperB, col.paperY][(r + c) % 3],
          { hard: true, gloss: .05, rx: .18, tag: '报纸' });
      G(px, ry2 + .048, RRZ - .112, PI, ['社区报', '晚报', '参考'][(r + c) % 3],
        { size: .030, gap: .005, color: col.ink });
    }
  }
  box(RRX, FL + 1.78, RRZ - .02, 1.30, .16, .07, col.redD, { hard: true, gloss: .14 });
  G(RRX, FL + 1.78, RRZ - .062, PI, '报　刊　架', { size: .075, gap: .016, color: col.gold });
  shade(RRX, RRZ, 1.40, .40, .30, SHY);
  stop(3.60, 5.10, 5.92, 6.35);

  // --- the bookcase on the east wall of the alcove
  const SHX = X1 - .16;
  box(SHX, FL + .92, 5.48, .30, 1.84, 1.00, C('#8a6a48'), TIMBER);
  for (let r = 0; r < 4; r++) {
    const sy = FL + .34 + r * .44;
    box(SHX - .01, sy, 5.48, .28, .028, .96, C('#9d7c52'), { hard: true, gloss: .20 });
    let bz = 5.04;
    while (bz < 5.90) {
      const bw = .022 + (Math.round(bz * 100) % 5) * .006;
      const bh = .21 + (Math.round(bz * 70) % 3) * .028;
      box(SHX - .04, sy + .016 + bh / 2, bz + bw / 2, .19, bh, bw,
          [C('#8d3b2f'), C('#2f5b86'), C('#4a7145'), C('#7a6330'),
           C('#5c4470')][(r + Math.round(bz * 20)) % 5],
          { hard: true, gloss: .12, tag: '书' });
      bz += bw + .004;
    }
  }
  box(SHX + .02, FL + 1.88, 5.48, .26, .12, .70, col.redD, { hard: true, gloss: .14 });
  G(SHX - .118, FL + 1.88, 5.48, -PI / 2, '图书角', { size: .062, gap: .012, color: col.gold });
  shade(SHX, 5.48, .40, 1.10, .30, SHY);
  stop(5.62, 6.35, 4.85, 6.10);

  // --- 饮水机 with the blue bottle, and the paper cups on the wall beside it
  const WDX = 5.38, WDZ = 6.00;
  box(WDX, FL + .48, WDZ, .34, .96, .34, C('#eceade'), { hard: true, gloss: .26, tag: '饮水机' });
  box(WDX, FL + .74, WDZ - .175, .26, .30, .012, C('#cdd4d6'), { hard: true, gloss: .40 });
  for (const [s, c] of [[-1, C('#c0392b')], [1, C('#2f6ea8')]]) {
    cyl(WDX + s * .07, FL + .66, WDZ - .20, .014, .10, c,
        { rx: PI / 2, gloss: .40, tag: '饮水机' });
    box(WDX + s * .07, FL + .73, WDZ - .215, .035, .07, .020, c, { hard: true, gloss: .35 });
  }
  box(WDX, FL + .43, WDZ - .19, .22, .022, .06, col.steelX, { hard: true, gloss: .45 });
  // the bottle: 18.9 litres, upside down in the neck, with the water line in it
  taper(WDX, FL + 1.02, WDZ, .28, .12, .28, C('#bcd8e2'),
        { mode: 18, alpha: .38, gloss: .74, tag: '饮水机' });
  cyl(WDX, FL + 1.30, WDZ, .145, .46, C('#bcd8e2'),
      { mode: 18, alpha: .34, gloss: .74, tag: '饮水机' });
  cyl(WDX, FL + 1.22, WDZ, .132, .30, C('#8fc3d6'), { mode: 18, alpha: .55, gloss: .60 });
  cyl(WDX, FL + 1.54, WDZ, .105, .06, C('#2f6ea8'), { gloss: .40 });
  box(WDX, FL + 1.30, WDZ - .148, .14, .17, .010, col.white, { hard: true, gloss: .20 });
  G(WDX, FL + 1.33, WDZ - .160, PI, '桶装水', { size: .036, gap: .006, color: C('#1e5a8a') });
  G(WDX, FL + 1.26, WDZ - .160, PI, '18.9L', { size: .021, gap: .003, color: col.grey });
  cyl(WDX + .26, FL + .95, WDZ - .02, .042, .30, C('#dcd7c8'), { gloss: .18 });
  shade(WDX, WDZ, .46, .46, .32, SHY);
  stop(5.14, 5.62, 5.76, 6.35);
  box(4.90, Y + 1.62, Z1 - .04, .30, .20, .020, col.paper, { hard: true, gloss: .06 });
  G(4.90, Y + 1.66, Z1 - .056, PI, '请节约用水', { size: .036, gap: .006, color: col.green });
  G(4.90, Y + 1.58, Z1 - .056, PI, '开水烫手　小心', { size: .026, gap: .004, color: col.redD });
  // 阅览角 over the mouth of the alcove
  box(3.90, Y + 2.34, 4.94, .74, .20, .05, col.white, { hard: true, gloss: .18 });
  G(3.90, Y + 2.34, 4.908, PI, '阅　览　角', { size: .092, gap: .018, color: col.redD });

  // ===================================================================== 11. WHAT EVERY FLOOR HAS
  //
  // 消火栓 in the pocket behind the notice board, on the dead shaft's west flank.
  const HX = CUPX - .12, HZ = 5.50;
  box(HX, Y + 1.16, HZ, .22, 1.00, .70, col.red, { hard: true, gloss: .30, tag: '消防栓' });
  box(HX - .112, Y + 1.16, HZ, .010, .90, .60, col.redD,
      { hard: true, gloss: .34, tag: '消防栓' });
  box(HX - .128, Y + 1.22, HZ - .01, .008, .58, .40, C('#3d4a4e'),
      { hard: true, gloss: .62, alpha: .55 });
  cyl(HX - .06, Y + 1.22, HZ - .01, .17, .12, C('#8c1f18'), { rz: PI / 2, gloss: .18 });
  cyl(HX - .09, Y + 1.22, HZ - .01, .07, .07, col.redD, { rz: PI / 2, gloss: .30 });
  G(HX - .124, Y + 1.78, HZ, -PI / 2, '消火栓', { size: .105, gap: .020, color: col.white });
  G(HX - .124, Y + .72, HZ, -PI / 2, '火警119', { size: .052, gap: .010, color: col.gold });
  // Hard into the north corner. The pocket only gives 0.55 m of standing room between the office
  // wall and the shaft, and a pair of extinguishers in the middle of it is a pair you walk through.
  for (const [ex, ez] of [[CUPX - .38, 6.00], [CUPX - .19, 6.02]]) {
    cyl(ex, FL + .27, ez, .072, .48, col.red, { gloss: .34, tag: '灭火器' });
    taper(ex, FL + .55, ez, .15, .10, .15, col.red, { gloss: .34 });
    cyl(ex, FL + .63, ez, .019, .09, col.steelD, { gloss: .5 });
    box(ex, FL + .30, ez - .078, .11, .16, .012, col.white, { hard: true, gloss: .10 });
  }
  shade(CUPX - .28, 6.01, .52, .26, .30, SHY);
  // the mop, the bucket and the bin, in the same corner, because that is where they always are
  cyl(OFX + .22, FL + .70, 5.95, .014, 1.36, C('#9a7c4e'), { rz: .12, rx: -.05, gloss: .18 });
  cap(OFX + .38, FL + .10, 5.95, .10, .16, .22, C('#d8d3c2'), { gloss: .06 });
  cyl(OFX + .46, FL + .14, 5.72, .135, .28, C('#3f6f96'), { gloss: .28 });
  cyl(OFX + .46, FL + .27, 5.72, .118, .012, C('#8d9aa0'), { gloss: .30 });
  shade(OFX + .40, 5.84, .55, .55, .28, SHY);

  // --- 安全出口 and the fire stair, at the east end of the landing, where it is on every deck.
  const SZS = 4.05, SW = .95, STOP = 2.06;
  for (const s of [-1, 1])
    box(X1 - .045, Y + (STOP + .07) / 2, SZS + s * (SW / 2 + .035), .09, STOP + .07, .07,
        col.steelD, { hard: true, gloss: .30, ...MAT.metal });
  box(X1 - .045, Y + STOP + .035, SZS, .09, .07, SW + .14, col.steelD,
      { hard: true, gloss: .30, ...MAT.metal });
  box(X1 - .030, Y + (STOP - .04) / 2, SZS, .06, STOP - .04, SW - .05, C('#9aa0a2'),
      { hard: true, gloss: .26, tag: '楼梯', ...MAT.metal });
  box(X1 - .062, Y + 1.34, SZS, .012, .70, SW - .17, C('#8b9294'), { hard: true, gloss: .24 });
  box(X1 - .075, Y + 1.02, SZS - .30, .05, .05, .40, col.steelX, { hard: true, gloss: .5 });
  cyl(X1 - .098, Y + 1.02, SZS - .30, .019, .09, col.steel, { rx: PI / 2, gloss: .55 });
  G(X1 - .066, Y + 1.72, SZS, -PI / 2, '安全出口', { size: .085, gap: .016, color: col.green });
  G(X1 - .066, Y + .62, SZS, -PI / 2, '禁止堆放杂物', { size: .054, gap: .010, color: col.redD });
  box(X1 - .035, Y + STOP + .19, SZS, .06, .155, .40, col.green,
      { hard: true, gloss: .26, tag: '安全出口' });
  box(X1 - .080, Y + STOP + .19, SZS, .006, .125, .365, col.greenL,
      { hard: true, mode: 1, glow: .13, tag: '安全出口' });
  G(X1 - .080, Y + STOP + .19, SZS, -PI / 2, '安全出口',
    { size: .086, gap: .012, color: col.white, mode: 1, glow: .16 });
  // The wall-mounted ones. `sgn` is which way along z the face looks, and the arrow always points
  // at the stair in world space — on a face looking -z the reader's right hand is world -x, so
  // "east" is drawn '←' there and '→' on a face looking +z. Backwards, this sends somebody into
  // the window wall in a fire.
  function exitSign(x, y, z, sgn, arrow) {
    const yaw = sgn > 0 ? 0 : PI, f = d => z + sgn * d;
    const w = arrow ? .46 : .38;
    // f(.072), not f(.058): the body is 0.055 deep and centred at f(.028), so its near face is
    // at f(.0555) and a lit panel at f(.058) shared a plane with it to half a millimetre.
    box(x, y, f(.028), w, .155, .055, col.green,
        { hard: true, gloss: .26, tag: '安全出口' });
    box(x, y, f(.072), w - .035, .125, .006, col.greenL,
        { hard: true, mode: 1, glow: .13, tag: '安全出口' });
    G(x - (arrow ? .062 : 0), y, f(.072), yaw, '安全出口',
      { size: arrow ? .072 : .082, gap: .010, color: col.white, mode: 1, glow: .16 });
    if (arrow) G(x + .175, y, f(.072), yaw, sgn > 0 ? '→' : '←',
                 { size: .095, color: col.white, mode: 1, glow: .16 });
  }
  // Two over the window head in the hall and one in the 阅览角. All three stand above the window
  // reveal rather than in it: the reveal returns are 0.18 m deep boxes across the whole run, and a
  // sign hung at head height would be inside one.
  exitSign(4.20, Y + 2.34, Z1, -1);                  // the 阅览角's north wall
  exitSign(-3.60, Y + 2.52, Z0, 1);                  // west end of the hall
  exitSign(2.60, Y + 2.52, Z0, 1);                   // east end of the hall

  // --- the plants. Two 发财树 in ceramic pots, which is what a Chinese public room decorates with.
  function moneyTree(x, z, s = 1) {
    cyl(x, FL + .21 * s, z, .21 * s, .42 * s, C('#9b5f3f'),
        { gloss: .26, tag: '发财树', ...CLAY });
    cyl(x, FL + .43 * s, z, .215 * s, .04 * s, C('#7e4a30'), { gloss: .30, ...CLAY });
    cyl(x, FL + .46 * s, z, .18 * s, .03 * s, C('#5c4a35'), { gloss: .10 });
    for (let i = 0; i < 3; i++)
      cyl(x + (i - 1) * .035 * s, FL + .82 * s, z + (i % 2 - .5) * .04 * s, .022 * s, .72 * s,
          C('#7d6a4a'), { rz: (i - 1) * .07, gloss: .18, tag: '发财树' });
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4, r = (.13 + (i % 3) * .075) * s;
      ball(x + Math.cos(a) * r, FL + (1.06 + (i % 4) * .085) * s, z + Math.sin(a) * r,
           .112 * s, .038 * s, .092 * s, i % 3 ? col.leaf : col.leafD, { ry: a, gloss: .20 });
    }
    // A pot is a solid cylinder, not a set of legs, so it wants one patch at roughly its own
    // footprint. It used to be .84 at alpha .62 — deliberately oversized to twice the pot's radius,
    // because mode 2 faded radially and a patch any smaller left the rim at 9% of its alpha, i.e.
    // no shadow at the only place the join is visible. That compensation is obsolete: mode 2 now
    // has a flat core reaching the corners (see js/gl.js), and the oversized patch read as a 42 cm
    // smudge fading well past the tile the pot stands on.
    //
    // .56 puts the flat core out to 12.6 cm and zero at 28 cm, so the .21 m base sits in the
    // rolloff and gets a 7 cm penumbra. .38 rather than .62 because the old alpha was chosen to
    // survive the crush; the room's other broad patches sit at .20-.30 and its tight foot patches
    // at .48-.54.
    shade(x, z, .56 * s, .56 * s, .38, SHY);
  }
  moneyTree(-1.10, 1.10, 1.0);
  moneyTree(3.86, 3.14, .92);
  stop(-1.42, -0.78, 0.78, 1.42);
  stop(3.56, 4.16, 2.84, 3.44);
  // a bin by the lift, and the wet-floor sign that has stood there since the mopping
  cyl(3.72, FL + .30, 4.42, .155, .60, C('#4a5054'), { gloss: .26, tag: '垃圾桶' });
  cyl(3.72, FL + .61, 4.42, .160, .04, C('#2f3438'), { gloss: .30 });
  cyl(3.72, FL + .60, 4.42, .120, .03, C('#1b1e21'), { gloss: .10 });
  shade(3.72, 4.42, .38, .38, .30, SHY);
  box(0.10, FL + .38, 2.90, .28, .76, .22, C('#e0b52c'), { hard: true, gloss: .22, ry: .35 });
  // PI + .35, not .35: a glyph faces (sin yaw, cos yaw), so at the sign's own yaw the writing
  // points into the plastic instead of out of it.
  for (const [gy, gt] of [[.48, '小心'], [.38, '地滑']])
    G(0.10 - Math.sin(.35) * .125, FL + gy, 2.90 - Math.cos(.35) * .125, PI + .35, gt,
      { size: .056, gap: .010, color: col.ink });
  shade(0.10, 2.90, .34, .30, .28, SHY);

  // --- 电子屏, the little red scrolling sign over the landing that every 物业 puts up. Both faces
  // are built and each carries its own glyphs: hung across an open plan it is read from the hall on
  // one side and from the lift on the other, and a single-sided one is a black bar from half the
  // room. The panel and the writing on each side stand clear of the body, never level with it.
  box(1.00, Y + 2.36, 3.28, 1.60, .24, .07, col.dark, { hard: true, gloss: .34 });
  for (const [sgn, yaw] of [[-1, PI], [1, 0]]) {
    box(1.00, Y + 2.36, 3.28 + sgn * .042, 1.50, .16, .010, C('#180a08'),
        { hard: true, gloss: .40 });
    G(1.00, Y + 2.36, 3.28 + sgn * .056, yaw, '欢迎光临　请文明使用活动室',
      { size: .088, gap: .016, color: C('#ff5a3c'), mode: 1, glow: .14 });
  }

  // ===================================================================== 12. THE WORDS
  //
  // Every focus below is a spot the body can genuinely stand on: the colliders above inflate by
  // the 0.30 m body radius, so a focus tucked against the thing it belongs to is a focus the
  // player is pushed straight out of, and a word focused there never lights up.
  TH('物业', -4.45, Y + 1.40, OFZ - .10, '物业在四楼办公。',
     'The management office is on the fourth floor.',
     '物 things + 业 property: the company that runs the estate.', -4.45, 0.70, 2.4);
  TH('收费标准', FBX, FBY, FBZ, '公告上写着收费标准。', 'The board lists the fee schedule.',
     '收费 to charge + 标准 standard. 物业费 is 2.10 元 a square metre a month.',
     -3.10, 0.70, 2.4);
  TH('公章', -3.92, Y + CTOP + .10, OFZ - .28, '盖个章就行了。', 'One stamp and it is done.',
     '公 public + 章 seal. The red 印泥 beside it is the ink pad.', -4.05, 0.70, 2.2);
  TH('钥匙', KX, Y + 1.52, KZ - .07, '备用钥匙都挂在墙上。', 'The spare keys all hang on the wall.',
     '钥匙 — one word, two characters, neither used on its own.', -4.60, 0.70, 2.4);
  TH('公告栏', BX + .07, Y + 1.55, BZC, '公告栏上贴满了通知。',
     'The notice board is covered in notices.',
     '公告 announcement + 栏 a railed frame.', -0.95, 4.10, 2.0);
  TH('通知', BX + .07, Y + 1.50, 3.55, '通知说这周六停水。',
     'The notice says the water is off on Saturday.',
     '通 to pass through + 知 to know: to inform.', -0.95, 3.55, 1.9);
  TH('垃圾分类', BX + .07, Y + 1.50, 4.55, '垃圾要分四类。', 'Rubbish is sorted into four kinds.',
     '厨余 kitchen waste, 可回收 recyclable, 有害 hazardous, 其他 the rest.', -0.95, 4.30, 1.9);
  TH('活动室', 1.20, Y + 1.60, 0.60, '活动室里有人打乒乓球。',
     'Somebody is playing table tennis in the activity room.',
     '活动 activity + 室 room.', 1.20, 1.60, 3.6);
  TH('乒乓球台', TX, TT + .10, TZ, '乒乓球台在中间。', 'The table-tennis table is in the middle.',
     '乒乓 is the sound of it; 球 ball, 台 table.', TX, TZ + 1.45, 2.2);
  TH('麻将', MX, MT + .08, MZ, '几个老人在打麻将。',
     'A few of the old folk are playing mahjong.',
     '打麻将 — you 打 mahjong the same way you 打 a ball.', MX + 1.60, MZ + .20, 2.2);
  TH('舞台', (SX0 + SX1) / 2, FL + SH + .40, SZ0 + .60, '舞台上放着一台电子琴。',
     'A keyboard stands on the stage.',
     '舞 to dance + 台 platform.', 3.90, 0.20, 2.6);
  TH('电子琴', PXK, PYK + .10, PZK, '电子琴是社区买的。', 'The keyboard belongs to the community.',
     '电子 electronic + 琴 a stringed or keyed instrument.', 3.90, 1.35, 2.2);
  TH('横幅', X1 - .20, Y + 2.34, (SZ0 + SZ1) / 2, '横幅上写着“邻里一家亲”。',
     'The banner reads "neighbours are one family".',
     '横 horizontal + 幅 a length of cloth.', 3.90, 0.70, 3.4);
  TH('健身器材', GFX + .20, FL + 1.10, 0.80, '健身器材摆在墙边。',
     'The exercise machines stand along the wall.',
     '健身 to keep fit + 器材 equipment.', -4.32, 0.55, 2.2);
  TH('报纸', RRX, FL + 1.52, RRZ - .12, '报刊架上有今天的报纸。', "Today's paper is on the rack.",
     '报 to report + 纸 paper. 报刊 covers papers and magazines together.', RRX, 5.40, 2.0);
  TH('饮水机', WDX, FL + 1.20, WDZ - .16, '饮水机上有一桶水。',
     'There is a bottle on the water cooler.',
     '饮 to drink + 水 water + 机 machine.', 4.75, 5.35, 2.0);
  TH('书', SHX - .06, FL + 1.20, 5.48, '书架上都是旧书。', 'The shelves are all old books.',
     '书 book — and 书架 the shelf it stands on.', 5.00, 5.30, 2.0);
  TH('消防栓', HX - .10, Y + 1.20, HZ, '墙上有一个消火栓。',
     'There is a fire hydrant on the wall.',
     '消 extinguish + 防 guard against + 栓 a valve.', -1.05, 5.30, 2.0);
  TH('安全出口', X1 - .10, Y + STOP + .19, SZS, '安全出口在东边。',
     'The emergency exit is at the east end.',
     '安全 safe + 出口 exit.', 5.20, SZS, 2.2);
  TH('楼梯', X1 - .10, Y + 1.10, SZS, '楼梯就在旁边。', 'The stairs are right beside it.',
     '楼 storey + 梯 ladder. 电梯 is the lift.', 4.85, 3.55, 2.2);
  TH('窗户', 0, Y + 1.55, Z0 + .28, '一整面墙都是窗户。', 'One whole wall is windows.',
     '窗 window + 户 door-leaf; together, the fitting.', 0, -4.10, 2.4);
  TH('发财树', -1.10, FL + 1.00, 1.10, '门口摆着一棵发财树。',
     'A money tree stands by the door.',
     '发财 to get rich + 树 tree. Every office has one.', -0.40, 0.60, 2.0);
  TH('党群服务站', -3.20, Y + 2.40, OFZ - .10, '这里是党群服务站。',
     'This is the Party and community service point.',
     '党 the Party + 群 the masses + 服务站 service point. The red sign is standard.',
     -3.20, 0.65, 3.2);

  return HomeF4;
};

// ---------------------------------------------------------------------------------------------
// TICKETS — kept here rather than in a report that will be lost.
//
// 1. FOR js/world.js. `buildShafts` still builds its landings inside `for (const f of [0, 2])`,
//    and `buildShell` pours a floor, a ceiling and four walls for those two decks only. So every
//    floor above the second is its own shell, including this one, and the landing in section 6
//    above is a stand-in for one the shell should own. It removes itself automatically:
//    `shellLanding` scans A.props for anything already standing in the shaft mouth at this deck's
//    height and skips the whole block when it finds it — so the day world.js grows a per-deck
//    landing, nothing here has to change and nothing here will z-fight it.
//
//    Two consequences worth naming while it is still this way round:
//      * `goFloor(n)` in world.js is still `const to = n === 0 ? 0 : 2`, so the car cannot be sent
//        to deck 4 at all. This floor is reachable only by `World.setFloor(4)` today.
//      * the door collider laid here (`stop(CXL ± DOORW/2, 4.88, 5.10)`) never opens, because
//        `doorStops` is the shell's and only has entries for decks 0 and 2. When the shell takes
//        the landing over, it takes that with it.
//
// 1b. THREE THINGS IN THE ENGINE THAT ASSUME ONE DECK, found while lighting this floor. None of
//    them is fatal and none is this file's to fix, but all three make an upper floor look flatter
//    than the lobby does and they will hit every one of F3..F12 the same way.
//
//      * `A.rug(x, z, w, d, bands)` (js/build.js) lays its quads at a hardcoded y of 0.005 and its
//        fringe at 0.010 — world y, not deck y. On any deck above the ground it draws the rug in
//        the lobby. Nothing here uses it; the floor coverings above are `flat` at `Y + .014`.
//      * `openness()` in js/gl.js measures `toFloor = max(p.y, 0)` from world zero, so on deck 4
//        every surface scores the full "well clear of the floor" ambient and nothing gets the
//        contact darkening the lobby gets for free. This floor compensates with about forty
//        `A.shade` patches; a floor that does not will read as if it is floating.
//      * `B.lights` is one global list and js/game.js ranks it by distance in x/z only, ignoring y
//        (game.js:7706). A lamp in the flat on deck 2 is therefore exactly as "near" as one on
//        deck 4 directly above it, and with twelve floors furnished the eight slots the shader has
//        will mostly be spent on lamps in other buildings-worth of rooms. Filtering the list by
//        the current deck before that sort is a two-line change and it is the single thing that
//        would most improve how every floor above the second is lit.
//
// 2. FOR js/game.js — USE_AT.home rows for the words this floor posts. The verbs are ones the room
//    actually supports; none of them need new machinery.
//
//      '公告栏'   看公告     kàn gōnggào      read the notice board       2.8s / 5 min  mood +3
//      '收费标准' 看收费标准 kàn shōufèi biāozhǔn  read the fee schedule  2.4s / 4 min
//      '物业'     找物业     zhǎo wùyè        ask at the management window 3.0s / 6 min mood +4
//      '乒乓球台' 打乒乓球   dǎ pīngpāngqiú   play table tennis  6.0s / 30 min mood +14 rest -6
//      '麻将'     看打麻将   kàn dǎ májiàng   watch the mahjong           3.0s / 10 min mood +8
//      '电子琴'   弹琴       tán qín          play the keyboard           5.0s / 20 min mood +12
//      '健身器材' 锻炼       duànliàn         use the machines   5.5s / 25 min mood +10 rest -8
//      '报纸'     看报       kàn bào          read the paper              3.2s / 15 min mood +6
//      '饮水机'   接水       jiē shuǐ         fill a cup                  1.8s / 2 min
//      '书'       借书       jiè shū          borrow a book               2.4s / 6 min  mood +5
//      '发财树' / '安全出口' / '消防栓' already exist in USE_AT.home and want no second row.
//
// 3. FOR js/vocab.js — the clusters this floor teaches, none of which the game has yet:
//      物业 · 物业费 · 收费标准 · 公告栏 · 通知 · 停水 · 年检 · 垃圾分类 · 公章 · 钥匙
//      活动室 · 舞台 · 横幅 · 乒乓球 · 麻将 · 电子琴 · 健身器材 · 报刊架 · 饮水机 · 党群服务站
//
// 4. FOR whoever owns the NPCs (game.js `NPCS`). The two clerks behind the hatch are geometry, not
//    people: they do not move, turn or speak. A `{ hz:'物业', place:'home', deck:4 }` NPC standing
//    at (-4.40, 2.24) facing -z would replace the seated one in section 7 outright, and the 广场舞
//    rehearsal on the notice board is an obvious hook for a second one in the hall.
