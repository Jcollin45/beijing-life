// 胡同 — the neighbourhood outside the front door. A grey-brick alley in 朝阳区: the 1980s
// walk-up you live in on the north side, courtyard houses opposite, a breakfast stall, a
// corner shop, bicycles, scholar trees, and at the east end a real road with buses and the
// CBD towers standing in the smog behind it.
// ---------------------------------------------------------------------------------------------
// 街 — StreetFit, the district registry. See STREET.md.
//
// This file is 3,700 lines and one writer, which makes every improvement to the street serial. The
// apartment solved the same problem by splitting one shell into eleven rooms behind `FlatFit`, and
// this is that move applied to a street: each district registers a builder here, in its own file,
// and the shell below calls them all.
//
//     StreetFit['traffic'] = S => { ... };            // the builder
//     StreetFit['traffic'].tick = (t, body, mins) => { ... };   // optional, for anything that moves
//
// `S` is the street's toolkit, the mirror of the flat's `A` — see `SHOP` at the end of this file
// for exactly what is on it. Two districts need a tick (traffic and cycles), so the shell
// dispatches every registered one rather than a single hook.
//
// A district that throws does not take the street down: one bad district is one missing district.
const StreetFit = {};

const Street = Lazy('Street', () => {

  const col = {
    // 青砖 grey brick, the colour everything traditional here is built from.
    // Warmed off neutral. At a flat grey the whole district read as a concrete model of itself:
    // fired clay keeps a little iron in it even when it is grey, and the small push toward
    // yellow is what separates brick from render standing next to it. Luminance is held where
    // it was — one directional light and no bounce means a darker wall is a darker street.
    brick: C('#918a7e'), brickD: C('#71695e'), brickL: C('#a59c8d'),
    // 青瓦 roof tile. Kept close together: the eaves course and the ridge lie flat and take
    // the full midday sun, so any lighter tone on them reads as galvanised sheet. Pulled off
    // blue and down a little since: at #6c7075 across two dozen roofs the district's whole
    // roofscape was one sheet of painted steel, and soot on a Beijing roof is not blue.
    tile: C('#67686a'), tileD: C('#55565a'), tileL: C('#71716f'),
    stone: C('#938c80'), stoneD: C('#706a5e'), kerb: C('#b2aa9b'),
    pave: C('#8d8577'), paveD: C('#777061'), asphalt: C('#4a4844'),
    paintY: C('#d9b444'), paintW: C('#d3cdbc'),
    render: C('#b6b0a1'), renderD: C('#9e968a'), band: C('#8d968f'),
    rail: C('#7d8a86'), railD: C('#5d6a67'), frame: C('#d8dbd8'),
    glassDay: C('#9fb6c4'), glassNight: C('#ffcf87'), glassDark: C('#3d4650'),
    red: C('#9d3728'), redD: C('#7a2a1e'), redL: C('#b8452f'),
    gold: C('#c9992f'), goldL: C('#e0b850'), cream: C('#e6dcc6'),
    green: C('#4f6f3a'), greenL: C('#688a46'), greenD: C('#3b5730'),
    trunk: C('#5b4a38'), trunkL: C('#75604a'),
    steel: C('#a7adb2'), steelD: C('#7b8288'), black: C('#22262b'),
    charcoal: C('#33383d'), white: C('#eceae2'),
    blueSign: C('#1f4f8f'), blue: C('#3d6f96'), teal: C('#4c8a86'),
    bikeY: C('#e0bb2c'), bikeB: C('#2f86bd'), bikeO: C('#d9662f'),
    plastic: C('#c5453a'), tarp: C('#3f6d55'), canvas: C('#c9b493'),
    dirt: C('#6f6455'), hazeGround: C('#403e39'),
  };
  const G = { matte: .05, wood: .20, paint: .16, metal: .58, glass: .80, fabric: .04 };

  // ---- what the district is made of.
  //
  // A tiling surface photograph read triplanar in world space, spread over the whole scene from
  // one place so that two walls built by two different helpers are the same brick. `matScale` is
  // the size of one repeat in metres, set to what the thing physically is — a course of 青砖, a
  // sett, a pantile — not to whatever looked least obviously tiled on the first surface it was
  // tried on. The `mode:` shading stays on underneath all of it: the modes draw the courses, the
  // slab joints and the render's damp, and the material is the grain *inside* them.
  //
  // `matAmt` is NOT one number reused across the table, and that is the whole point of this
  // block. The shader normalises a sample against a mid-grey — `base *= mix(1, t/0.22, amt)` —
  // so what a given amt does to the palette depends entirely on how bright that particular
  // photograph happens to be, and these eleven are nowhere near each other. Measured, as the
  // multiplier each one puts on the colour at amt 0.34:
  //
  //     plaster ×1.46   concrete ×1.41   tile ×1.6    brick ×1.26/0.95/0.86 (warm)
  //     paving  ×1.15   steel    ×1.00   asphalt ×0.78   rooftile ×0.71
  //
  // A flat 0.34 everywhere would therefore have lifted every rendered wall in the district by
  // half a stop and dropped every roof by a third of one — on a scene lit by one directional
  // light with no bounce, where the palette comments above say in as many words that luminance
  // was held where it was on purpose. So each amt below is chosen to land its own material
  // within a few per cent of 1.0 and no higher: the texture is here to stop these surfaces
  // being flat, not to relight the district.
  //
  // Two of the eleven are deliberately not used at all. `asphalt` (Road007) has lane markings
  // baked into it — tiled across a 130 m carriageway that is a lattice of white stripes laid
  // over the painted lines this scene already draws as geometry — so the road takes the neutral
  // concrete grain instead. `metal` measures ×4.4 and would turn anything it touched white.
  const BRICK  = { mat: 'brick',    matScale: .90,  matAmt: .18 };
  const BRICKD = { mat: 'brick',    matScale: .90,  matAmt: .15 };  // the grimy splash courses
  const RTILE  = { mat: 'rooftile', matScale: 1.60, matAmt: .20 };
  const PAVE   = { mat: 'paving',   matScale: 1.30, matAmt: .30 };
  const ROAD   = { mat: 'concrete', matScale: 3.00, matAmt: .14 };
  const RENDER = { mat: 'plaster',  matScale: 2.60, matAmt: .14 };
  const CONCR  = { mat: 'concrete', matScale: .95,  matAmt: .12 };
  const WTILE  = { mat: 'tile',     matScale: .30,  matAmt: .16 };
  // The one material in the table that measures dead neutral, so the shutters can have it at
  // full strength: corrugation and nothing else.
  const SHUT   = { mat: 'steel',    matScale: .55,  matAmt: .40 };

  // A colour nudged in value and in warmth, so a part that gets built twenty times can carry its
  // own character without twenty entries in the table. `v` scales the whole thing, `w` leans it
  // warm (positive) or cool (negative). Used for the roofs and the shutters, both of which were
  // one colour repeated across the district — which is what makes a row of buildings read as a
  // row of copies of one building.
  const tint = (c, v, w = 0) => [
    Math.min(1, Math.max(0, c[0] * (v + w))),
    Math.min(1, Math.max(0, c[1] * v)),
    Math.min(1, Math.max(0, c[2] * (v - w)))];
  // Stable per-position jitter in 0..1. Hashed off where a thing is rather than drawn from the
  // build's random stream, so adding one of these never shifts a later decision in the district.
  const jit = (a, b) => { const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
                          return h - Math.floor(h); };

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, flat, glyphs,
          solid, blocker: rawBlocker, shade, glow, thing } = B;
  // Every entry in Street's camera-blocker list is opaque architectural fabric: a complete
  // building mass, returned gate, pavilion or transit shell. None is a chair/pole-sized obstacle
  // that should force a close-up. Author the policy once at the scene boundary so district modules
  // cannot accidentally omit it when they add another facade. Build.blocker still owns the exact
  // measured bounds and whitelists metadata; this wrapper adds only the Street-wide orbit identity.
  const blocker = (x0, x1, z0, z1, top = 400, opts) =>
    rawBlocker(x0, x1, z0, z1, top, { ...(opts || {}), orbit:true });

  // ---------------------------------------------------------------- dimensions
  const AZ = 2.35;                        // walkable edge on the building side
  const AX0 = -27.0, AX1 = 25.5;          // alley extent
  // Storey height and storey count of your own block. These are not free numbers: `js/world.js`
  // builds the inside of this building as twelve decks at 3.10 m (`STOREY`, `DECK[n] =
  // (n-1)*3.10`), with deck 12 — the roof `js/home-roof.js` hangs washing on — at y 34.10. The
  // exterior used to say six storeys at 2.86, topping out at 17.2: half the building you live in.
  // FLOORS counts decks the way world.js does, so deck 12 is the roof and the window grid stops
  // at deck 11.
  const FL = 3.10, FLOORS = 12;           // storey height and deck count, matching js/world.js
  const NB = { x0: -16.5, x1: 11.5, z0: -18.0, z1: -2.95 };   // your block's footprint
  // Parapet top. DECK[FLOORS] = (FLOORS-1)*FL = 34.10 is the roof slab; 0.9 above it is the wall
  // you see over from the alley.
  const NBH = FL * (FLOORS - 1) + 0.9;
  const TOPDECK = FLOORS - 1;             // highest deck with windows in it (11)
  // Facade detail level. Above the third storey nothing on this wall resolves from the alley —
  // measured, a baluster is under a pixel by deck 4 — so the bays above it drop their railings,
  // their laundry and their AC boxes and keep only the glazing. Doubling the block's height at
  // full detail would have doubled its prop count; this keeps it near where it was.
  const FACADE_LOD = 3;                   // full detail at deck <= FACADE_LOD + 1
  const DOOR = 0;                         // x of your stairwell entrance
  const SHOP = 7.6;                       // x of the 超市 shopfront

  // ---- the shopfront datum. One height for every name board on the alley's south frontage and
  // one for every 侧招 hung under them, because a parade whose signs each sit where their own
  // author measured is a parade that reads as clutter however good each sign is. Before this,
  // three boards on one wall sat at 2.96 / 3.42 / 3.50 with three different depths (0.74 / 0.92 /
  // 0.84) and three glyph sizes, and the three box signs under them at 2.20 / 2.60 / 3.22 — one
  // of them above the string course and two below it.
  //
  // Both numbers are the clear band, measured off this file's own constants and not off a
  // screenshot:
  //
  //   0.00 .. 1.40   brick plinth                    2.89 .. 3.11   string course (FL - .10, .22)
  //   3.82 .. 3.92   first balcony slab (f=1, y - .78 at FL + 1.55)
  //
  // So the boards take 3.12 .. 3.80 — the whole of the gap between the course and the balconies —
  // and the 侧招 take 2.27 .. 2.83, the last clear band under the course. The corner block east
  // of the gap has no course, and its window grid was re-pitched to FL to let it share the line.
  //
  // `js/street-retail.js` reads both off `S` rather than re-measuring: its own numbers were taken
  // when FL was 2.86 and were 24 cm stale in every one of them.
  const FASCIA = 3.46, FASCIAH = .68;     // name-board centre and depth
  const BLADE = 2.55, BLADEH = .56;       // 侧招 centre and depth, under the string course

  // The courtyard side sits well back: at five metres across, the camera could never get
  // far enough from either wall to look at anything square on.
  const CW = 2.55, CWZ = 3.95, SZ = 3.35;
  // Continuous right-of-way contract, west frontage to east frontage. RD0/RD1 are the kerb
  // construction datums; KW/KE are the actual road-side faces. The 14.00 m face-to-face section
  // preserves two cycle tracks, a protected median/platform and one motor lane each way without
  // stealing the 4.06 m east footway needed by the 商务区 metro entrance.
  const RD0 = 25.34, RD1 = 37.50, KW = RD0 + .08, KE = RD1 - .08;
  const BW0 = KW, BW1 = 27.67, PL0 = BW1, PL1 = 29.47;
  const MS0 = PL1, MS1 = 32.67, MN0 = MS1, MN1 = 35.17, BE0 = MN1, BE1 = KE;
  const ROAD_C = MS1;
  const SW1 = 41.0;                       // far pavement edge

  // Emissive things whose brightness rides the clock, and glass that reflects the sky by
  // day and shows a lit room at night.
  const litProps = [], panes = [], lampPools = [];
  let mouths = 0;             // how many subway entrances have been built, for their tags
  function litten(p, k) { litProps.push({ p, k }); return p; }
  // `deep` glass is knocked well back from the sky it reflects: on a tower five hundred
  // metres off, panes the colour of the sky vanish into it and leave a blank slab.
  // Each pane gets a fixed character of its own, hashed off where it is rather than drawn from
  // the build's random stream — consuming numbers here would shift every later decision in the
  // district. `j` is how bright this particular sheet of glass is, `w` how warm the room behind
  // it burns at night. A facade painted one flat value is a spreadsheet, not a building.
  function pane(p, warm, deep, mine) {
    const o = p.ob || { x: 0, y: 0, z: 0 };
    const h = Math.sin(o.x * 12.9898 + o.y * 4.1414 + o.z * 78.233) * 43758.5453;
    const j = h - Math.floor(h), h2 = h * 7.31, j2 = h2 - Math.floor(h2);
    // 406. `mine` marks a pane of 十八号楼's own flat 202, whose light is the player's switch
    // rather than a hash. Everything else on the block is a neighbour and stays fixed.
    panes.push({ p, warm, deep, j, j2, y: o.y, mine });
    return p;
  }

  // What the shops on the far side of the road are. Ordinary parade businesses, the sort whose
  // names a learner reads a hundred times before anybody teaches them.
  // Where the pharmacy door ended up, for pharmacy.js to come back out of.
  // The chemist is a building on the WEST footway now (js/street-civic.js), not a unit on the far
  // parade, so this is a constant rather than something a random shuffle discovers. pharmacy.js
  // reads it off the scene as `Street.PHARMACY_OUT`; the district reads it off `S`.
  let PHARMACY_OUT = { x: 24.68, z: -3.65, yaw: Math.PI / 2 };
  // Where you stand after stepping out of your own 单元门. The inbound half of the pair is
  // `HOME_LOBBY_ENTRY` in js/game.js; this is the outbound half, and it is exported so a caller
  // can arrive at the door it left by instead of falling through to the scene default.
  // Stand in the alley centre rather than tight against the entrance reveal. At z=-.20 the
  // recessed portal is 2.00 m behind the body, remains within every interaction's 2.2 m reach,
  // and the full player-height camera can establish the street without filling half the frame
  // with the door surround.
  const HOME_OUT = { x: DOOR + .1, z: -.20, yaw: Math.PI * .5 };

  // ---- the things that move. Collected as the street is built and driven by `tick`, which the
  // loop calls for whichever place you are standing in. Until this existed the hutong was a
  // photograph: the loft's pigeons never left the boards, the steamers never steamed, and the
  // washing hung dead still on a street whose own weather system has a wind in it.
  const birds = [], steam = [], wash = [], stall = [];
  const moveDynamic = (p, m) => {
    p.m = m;
    p.cx = m[12]; p.cy = m[13]; p.cz = m[14];
  };
  const HIDDEN = M.trs(0, -60, 0, 0, .001, .001, .001);
  let stallUp = null;                    // whether the cart is on the pavement right now
  let windK = 0;                         // how hard it is blowing, set from the weather
  // 药店 is out of this list too — see TEACH below. A plain unlettered copy across the road from
  // the real chemist is the same confusion as a pickable one, minus the cursor. Dropping a name
  // re-deals every later draw from the seeded stream, so the parade's signs move; they are
  // scenery and they are stable between runs, which is all they ever had to be.
  const SHOPNAMES = ['五金店', '理发店', '便利店', '手机店', '面包房', '干洗店',
                     '水果店', '文具店', '花店', '茶叶店', '包子铺', '眼镜店', '快递'];
  // Which of those names has already been given a thing. Two of the forty units on the parade get
  // one — see the shop loop for why — and this is what stops the third pharmacy getting one too.
  // 药店 is NOT taught from the parade any more. It used to be one of these forty units, and
  // js/street-civic.js moved its `thing` across the road to the real shop — which left the unit's
  // BOARD behind, still lettered 药店 and still pickable, so the same chemist was signed twice,
  // eighteen metres apart, on opposite sides of the road. That is the exact fault this street was
  // being cleaned up for. The door is created where the shop is now; the parade teaches 面包房 and
  // 药店 is taught off a green fascia and a lit cross, which is a better place to learn it anyway.
  const TEACH = ['面包房'];
  const taught = new Set();

  let seed = 0x5eed1;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = a => a[(rnd() * a.length) | 0];

  // The named street residents do not vanish at the edge of the map at bedtime: each has a
  // real threshold in the neighbourhood. `inside` is just far enough through the opening to
  // put the body behind the wall; `outside` is the clear paving immediately in front of it.
  // game.js walks those two points in order, so leaving and coming home both pass through the
  // visible door rather than clipping through the nearest stretch of wall.
  const homes = {
    chen: { name:'陈家', inside:[-12.60, 4.72], outside:[-12.60, 3.08], leave:7.20, back:20.45 },
    wang: { name:'王家', inside:[   .20, 4.72], outside:[   .20, 3.08], leave:5.80, back:21.20 },
    dou:  { name:'豆豆家', inside:[ 13.80, 4.72], outside:[ 13.80, 3.08], leave:7.90, back:20.10 },
    li:   { name:'李家', inside:[-33.92, 1.20], outside:[-32.38, 1.20], leave:6.85, back:19.15 },
    shop: { name:'楼上', inside:[ 10.55,-3.62], outside:[ 10.55,-1.98], leave:6.70, back:22.20 },
  };

  // ---------------------------------------------------------------- parts
  // A run of 青砖 wall with a tiled coping: the boundary that defines every hutong.
  function brickRun(x0, x1, z, h, t = .42, o = {}) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    // The tiling brick photograph goes *inside* mode 11's courses, not instead of them: the mode
    // still draws the bed joints and the perpends, and the material puts the grain of fired clay
    // between them. .9 m a repeat puts the sample's courses at about 10 cm, which is a brick.
    // Held at a low amt on purpose: Bricks104 is bright English red, and at the strength the
    // other scenes use it the whole of 青砖 grey-brick 朝阳区 came out the colour of Reading.
    box(cx, h / 2, z, w, h, t, col.brick,
      { hard: true, mode: 11, gloss: G.matte, ...BRICK, ...o });
    // Two courses of tile laid flat, then a half-round ridge along the top. All three face
    // straight up, so they run darker than the wall: at the wall's own tone they became a
    // silver pinstripe along the top of every boundary in the district.
    box(cx, h + .035, z, w, .07, t + .16, col.tileD,
      { hard: true, mode: 13, gloss: .16, ...RTILE });
    box(cx, h + .095, z, w, .06, t + .09, C('#545458'),
      { hard: true, mode: 13, gloss: .16, ...RTILE });
    capsule(cx, h + .145, z, .075, w, .075, col.tileD, { rz: Math.PI / 2, gloss: .18 });
    // The splash course. Every wall in this city is darker for the first half-metre off the
    // paving — road spray, bicycle tyres, forty winters of grit thrown up off the alley — and a
    // wall running one clean tone from its coping to the ground is the surest sign a street was
    // modelled rather than lived on. Two bands rather than one: the very bottom is nearly black
    // with wet, and it fades out rather than stopping at a line. Still mode 11, so the courses
    // carry straight through the join instead of the dirt reading as a separate plinth.
    if (o.grime !== false) {
      // Same material and the same scale as the wall above, so the courses AND the clay grain
      // both run straight through the join. A different scale down here would have put a seam
      // across every wall in the district exactly where the dirt is trying not to be one.
      box(cx, .155, z, w, .31, t + .03, tint(col.brick, .74, .014),
        { hard: true, mode: 11, gloss: G.matte, ...BRICKD });
      box(cx, .40, z, w, .20, t + .015, tint(col.brick, .87, .008),
        { hard: true, mode: 11, gloss: G.matte, ...BRICKD });
    }
    solid(x0, x1, z - t / 2 - .1, z + t / 2 + .1);
  }

  // Pitched grey-tile roof. Two slabs leaning on a ridge, with eaves overhanging the wall
  // below — the overhang and the shadow under it are most of what says "courtyard house".
  // `alongZ` turns the ridge ninety degrees, which the side ranges of a courtyard need: with
  // every range pitched the same way the yard read as a lumber yard rather than a 四合院.
  function tileRoof(cx, cz, len, span, base, rise, alongZ) {
    const half = span / 2, slope = Math.hypot(half, rise), a = Math.atan2(rise, half);
    const R = Math.PI / 2;
    // Every roof in the district was the same two greys, which over two dozen of them made the
    // whole roofscape one material extruded twenty times — the flattest thing in any raised view.
    // Each roof now takes its own value and its own lean toward soot or toward bleached, hashed
    // off where it stands so it is stable and costs nothing.
    const j = jit(cx, cz), v = .88 + j * .24, w = (j - .5) * .06;
    const TL = tint(col.tile, v, w), TD = tint(col.tileD, v, w);
    // The pantile photograph, laid at the size a real 青瓦 course is. It reads triplanar in world
    // space, so a slab that has been pitched by `rx` still gets the texture running with the
    // roof rather than sliding across it. Kept low, and for the opposite reason to the brick:
    // this sample is near-black — it measures a 0.71 multiplier at the amt the other scenes use
    // — and two dozen roofs a third of a stop darker is a third of a stop off the whole district.
    for (const s of [-1, 1]) {
      // Slabs are thick on purpose. At 8 cm they were seen almost edge-on from the street
      // and read as sheets of black paper rather than a course of tiles.
      // The eaves course carries on at the pitch rather than levelling off. Laid flat it
      // faced straight up, took the whole of the midday sun and turned into a bright silver
      // band running the length of every roof in the district.
      // The two pitches are not quite the same tone either. One of them faces the weather and
      // one of them faces the yard, and a roof whose halves are identical folds flat at the ridge.
      const SL = tint(TL, 1 + s * .045), SD = tint(TD, 1 + s * .045);
      if (alongZ) {
        // `ry` is applied after the scale, so for a turned ridge the extents are still given
        // in the slab's own frame: length along local x, thickness in y, slope depth in z.
        // Written the other way round the eaves course came out as a metre-wide plate lying
        // across the roof and poking out past both gable ends.
        box(cx + s * half / 2, base + rise / 2, cz, len, .15, slope,
          SL, { hard: true, mode: 13, ry: R, rx: s * a, gloss: .20, ...RTILE });
        box(cx + s * (half + .17), base - .07, cz, len + .34, .13, .40,
          SD, { hard: true, mode: 13, ry: R, rx: s * a, gloss: .18, ...RTILE });
        box(cx + s * (half + .30), base - .19, cz, len + .30, .09, .13,
          col.trunk, { hard: true, ry: R, gloss: G.wood });
      } else {
        // `rx` positive tilts a slab's face toward +z, so the south slab (s = +1) takes +a
        // and the north slab -a. Signed the other way round — as this was — both slabs lean
        // inward: the roof becomes a valley with its eaves standing a metre above the ridge,
        // and from any raised camera the district read as rows of dark troughs.
        box(cx, base + rise / 2, cz + s * half / 2, len, .15, slope,
          SL, { hard: true, mode: 13, rx: s * a, gloss: .20, ...RTILE });
        box(cx, base - .07, cz + s * (half + .17), len + .34, .13, .40,
          SD, { hard: true, mode: 13, rx: s * a, gloss: .18, ...RTILE });
        box(cx, base - .18, cz + s * (half + .30), len + .30, .09, .13,
          col.trunk, { hard: true, gloss: G.wood });
      }
    }
    capsule(cx, base + rise + .06, cz, .10, len + .16, .10, TD,
      alongZ ? { rx: R, gloss: .20, ...RTILE } : { rz: R, gloss: .20, ...RTILE });
    // Gable ends: a rake board following each slope, and brick closing the wall behind it.
    // Stepped brickwork here read as a staircase poking out through the tiles, and from the
    // alley a row of courtyards looked like a builder's yard.
    const RK = tint(TL, .90);
    for (const s of [-1, 1]) {
      const end = len / 2 + .05;
      for (const t of [-1, 1]) {
        if (alongZ) box(cx + t * half / 2, base + rise / 2, cz + s * end,
          .14, .19, slope, RK, { hard: true, ry: R, rx: t * a, gloss: .22 });
        else box(cx + s * end, base + rise / 2, cz + t * half / 2,
          .14, .19, slope, RK, { hard: true, rx: t * a, gloss: .22 });
      }
      // brick infill under the rake, held inside the roof line
      const inset = len / 2 - .16;
      if (alongZ) box(cx, base - .30, cz + s * inset, span * .88, .90, .30, col.brick,
        { hard: true, mode: 11, gloss: G.matte, ...BRICK });
      else box(cx + s * inset, base - .30, cz, .30, .90, span * .88, col.brick,
        { hard: true, mode: 11, gloss: G.matte, ...BRICK });
    }
  }

  // 门楼 — the gate into a courtyard: stone threshold, a pair of drum stones, red doors with
  // gold studs, couplets down each jamb, a lantern, and its own little tiled canopy.
  function gateHouse(x, meta) {
    const named = meta && typeof meta === 'object' ? meta : null;
    const tagIt = meta === true || !!(named && named.tag);
    const z = CWZ, T = tagIt ? { tag: '大门' } : {};
    const doorCol = named && named.door ? named.door : col.red;
    // Three addresses, three construction histories. The old version changed the flowerpot by
    // each door but repeated the same 2.6 m brick rectangle and roof three times; from player
    // height that still read as cloned scenery. Keep a common hutong-gate grammar while changing
    // the opening, pier proportions, ridge height, roof offset and couplet at each household.
    const gp = named && named.detail === 'commuter' ?
      { open:1.48, pier:.56, top:2.78, roofW:2.82, roofD:1.42, base:2.91, rise:.34,
        off:-.08, brick:col.brickD, lian:['平安即是家门福','孝友可为子弟箴'], head:'四季平安' } :
      named && named.detail === 'child' ?
      { open:1.62, pier:.48, top:2.72, roofW:3.02, roofD:1.50, base:2.86, rise:.39,
        off:.10, brick:tint(col.brickL, .92, .012), lian:['一院春光随燕舞','满庭笑语伴花开'], head:'春满人间' } :
      { open:1.74, pier:.46, top:3.00, roofW:3.34, roofD:1.78, base:3.06, rise:.50,
        off:0, brick:col.brickL, lian:['春满乾坤福满门','天增岁月人增寿'], head:'万象更新' };
    const gateW = gp.open + gp.pier * 2;
    // The street face of the gate mass. Everything you are meant to see — couplets, canopy,
    // lanterns, drum stones — belongs in front of this. Hung off `z + something` it all ended
    // up inside the courtyard, invisible from the only side you can stand on.
    const F = z - .36;
    // Separate jambs and a lintel leave a real dark opening between them. Short side returns and
    // stone feet make each pier read as masonry construction rather than a board pasted on a wall.
    for (const s of [-1, 1])
      box(x + s * (gp.open / 2 + gp.pier / 2), gp.top / 2, z, gp.pier, gp.top, .70, gp.brick,
        { hard: true, mode: 11, gloss: G.matte, ...BRICK });
    box(x, gp.top - .17, z, gateW, .34, .70, gp.brick,
      { hard: true, mode: 11, ...BRICK });
    for (const s of [-1, 1]) {
      const px = x + s * (gp.open / 2 + gp.pier / 2);
      box(px, .11, F + .03, gp.pier + .14, .22, .62, col.stoneD,
        { hard: true, gloss: .22 });
      box(px, gp.top + .035, z, gp.pier + .12, .07, .82, col.stone,
        { hard: true, gloss: .20 });
    }
    // raised stone threshold you have to step over
    box(x, .085, z, gp.open + .24, .17, .90, col.stoneD, { hard: true, gloss: .22 });
    for (const s of [-1, 1]) {
      // 门墩 drum stone, sat on the street side of the threshold
      const dx = x + s * (gp.open / 2 - .07);
      cyl(dx, .30, F + .06, .17, .38, col.stoneD, { gloss: .24 });
      box(dx, .085, F + .06, .44, .17, .44, col.stoneD, { hard: true, gloss: .22 });
    }
    // The doors sit back in the reveal, not on the face of the wall. Named homes stand open
    // far enough for their resident to pass through; the leaf furniture is placed in the same
    // hinged frame so the studs and handle follow the door instead of floating on the wall.
    for (const s of [-1, 1]) {
      const swing = named && named.detail === 'commuter' ? .70 :
        named && named.detail === 'child' ? .92 : .80;
      const a = -s * (named ? swing + (s > 0 ? .08 : -.04) : .09);
      const ca = Math.cos(a), sa = Math.sin(a);
      const hx = x + s * gp.open / 2, hz = z - .02;
      const at = (lx, lz) => [hx + ca * lx + sa * lz, hz - sa * lx + ca * lz];
      const leafW = gp.open / 2 - .025;
      const [dx, dz] = at(-s * leafW / 2, 0);
      box(dx, 1.18, dz, leafW, 2.02, .075,
        s > 0 ? tint(doorCol, .93, .008) : doorCol,
        { hard: true, gloss: .26, ry: a, ...T });
      for (let r = 0; r < 4; r++) for (let c = -1; c <= 1; c++) {
        const [sx, sz] = at(-s * leafW / 2 + c * leafW * .28, -.045);
        ball(sx, .62 + r * .42, sz, .032, .032, .022,
          col.gold, { gloss: G.metal, ...T });
      }
      const [kx, kz] = at(-s * (leafW - .12), -.06);
      capsule(kx, 1.02, kz, .055, .16, .055, col.gold,
        { rx: Math.PI / 2, ry: a, gloss: G.metal, ...T });
    }
    // 对联 couplets pasted flat on the street face of each jamb, and a banner over the lintel.
    // Lit paper, not emissive: as glowing panels they read as orange plastic signage.
    // Gold ink, not black. Near-black characters on the red paper read as holes punched
    // through the couplet, which from a couple of metres looked like damage.
    // The pair read as a pair: 上联 on the right as you face the gate, 下联 on the left, and the
    // 横批 across the lintel above them.
    for (const s of [-1, 1]) {
      const px = x + s * (gp.open / 2 + gp.pier / 2);
      const paperH = gp.top > 2.9 ? 1.54 : 1.34;
      box(px, 1.39, F - .01, .21, paperH, .012, col.red, { hard: true, gloss: .10 });
      B.glyphs(px, 1.39, F - .012, Math.PI, gp.lian[s > 0 ? 1 : 0],
        { size:.16, gap:.021, vertical:true, color:col.goldL, gloss:.18, lift:.008 });
    }
    const headY = gp.top - .29;
    box(x, headY, F - .01, gp.open + .06, .24, .012, col.red,
      { hard: true, gloss: .10 });
    B.glyphs(x, headY, F - .012, Math.PI, gp.head,
      { size:.18, gap:.10, color:col.goldL, gloss:.18, lift:.008 });
    // canopy: a small pitched roof carried on two brackets, overhanging the alley
    for (const s of [-1, 1])
      box(x + s * (gp.open / 2 + .18), gp.base - .15, F - .18, .15, .18, .66,
        col.redD, { hard: true, gloss: G.wood });
    tileRoof(x + gp.off, F - .30, gp.roofW, gp.roofD, gp.base, gp.rise);
    // lanterns hung under the eaves, lit after dark
    for (const s of [-1, 1])
      lantern(x + gp.off + s * (gp.roofW / 2 - .28), gp.base - .58, F - .46,
        s === 1 && tagIt);

    // A household plaque and one small family-specific clue. The three gates share the same
    // bones, as neighbouring courtyard houses do, but no longer look like cloned scenery.
    if (named) {
      const plaque = named.plaque || col.blueSign;
      box(x + 1.58, 1.72, F - .01, .42, .72, .045, plaque,
        { hard: true, gloss: .28 });
      B.glyphs(x + 1.58, 1.72, F - .04, Math.PI, named.name,
        { size: .17, gap: .035, vertical: true, color: col.cream, mode: 1, lift: .008 });
      // Blue enamel house numbers, deliberately different so the plaques still identify a
      // doorway when the name is too small to read from the middle of the alley.
      box(x - 1.58, 2.10, F - .01, .46, .25, .04, col.blueSign,
        { hard: true, gloss: .30 });
      B.glyphs(x - 1.58, 2.10, F - .04, Math.PI, named.number,
        { size: .16, gap: .02, color: col.white, mode: 1, lift: .008 });

      if (named.detail === 'commuter') {
        // Xiao Chen's folded umbrella, parcel shelf and work shoes: somebody who comes and
        // goes every day, not an ornamental gate nobody uses.
        box(x - 1.76, .50, F - .28, .72, .08, .32, col.trunkL,
          { hard: true, gloss: G.wood });
        for (const s of [-1, 1])
          capsule(x - 1.76 + s * .27, .25, F - .28, .025, .50, .025, col.steelD,
            { gloss: G.metal });
        box(x - 1.90, .62, F - .28, .28, .18, .24, col.canvas,
          { hard: true, gloss: .12 });
        for (const s of [-1, 1])
          box(x - 1.72 + s * .17, .08, F - .52, .25, .10, .42, col.charcoal,
            { gloss: .18, ry: s * .08 });
        capsule(x + 1.86, .74, F - .34, .035, 1.30, .035, C('#46566a'),
          { rz: .10, gloss: .32 });
      } else if (named.detail === 'flowers') {
        // Wang Ayi's pots, clipped into neither the drum stones nor the walk line.
        for (const [ox, h, c] of [[-1.82,.34,C('#a2603d')],[1.92,.27,C('#8f5439')]]) {
          taper(x + ox, h / 2, F - .35, .38, h, .38, c, { gloss: .22 });
          cyl(x + ox, h + .02, F - .35, .16, .035, col.dirt, { gloss: .10 });
          for (let i = 0; i < 5; i++) {
            const a = i * 1.257;
            capsule(x + ox + Math.sin(a) * .08, h + .23, F - .35 + Math.cos(a) * .08,
              .025, .42, .025, col.greenL, { rz: (i - 2) * .09, gloss: .14 });
            ball(x + ox + Math.sin(a) * .13, h + .45, F - .35 + Math.cos(a) * .13,
              .05, .045, .05, i % 2 ? col.redL : col.goldL, { gloss: .18 });
          }
        }
      } else if (named.detail === 'child') {
        // Doudou's pinwheel and chalk marks. The bright, low detail distinguishes this house
        // from the adult doorways even before the child walks out of it.
        capsule(x - 1.82, .56, F - .36, .025, 1.08, .025, col.trunkL,
          { rz: -.08, gloss: G.wood });
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3;
          ball(x - 1.82 + Math.cos(a) * .16, 1.10 + Math.sin(a) * .16, F - .37,
            .075, .035, .045, [col.redL,col.paintY,col.blue][i % 3],
            { gloss: .26, ry: a });
        }
        ball(x - 1.82, 1.10, F - .40, .045, .035, .045, col.goldL, { gloss: .30 });
        for (let i = 0; i < 4; i++)
          box(x - .62 + i * .34, .014, F - .70 - (i % 2) * .16, .24, .012, .035,
            [col.cream,col.paintY,col.blue,col.redL][i],
            { hard: true, ry: (i - 1.5) * .18, gloss: .08 });
      }
    }
    solid(x - 1.4, x + 1.4, z - .5, z + .55);
    // The body already cannot cross this masonry envelope, so the third-person camera must obey
    // the same truth. Without a camera blocker, looking back at the home entrance from mid-alley
    // placed the 4.8 m orbit behind the opposite gate and *inside* its angled red leaves; two door
    // panels then consumed two-thirds of the view. Keeping the authored gate intact and shortening
    // the camera on its street side fixes every rotation, not just that one pair of leaves.
    // 王家 sits directly opposite 十八号楼. Its neighbouring brick return is part of the same
    // camera truth even though the body's collider remains the measured 2.8 m gate envelope:
    // without this shallow funnel, an oblique orbit can clear the gate AABB and park behind the
    // blank back of that return. Starting the camera-only footprint at the return makes the orbit
    // guide continuously around the returned mass instead of finding that false pocket.
    const camHalf = tagIt ? 3.25 : 1.4;
    blocker(x - camHalf, x + camHalf, z - .5, z + .55, gp.top + .55);
    if (tagIt) {
      thing('大门', x, 3.20, z + .30, '这是一个老四合院的大门。',
        'This is the gate of an old courtyard house.',
        '大门 is the gate onto the street. 门 alone is any door.',
        { focus: [x, z - 1.2], reach: 2.4 });
      thing('灯笼', x + 1.42, 2.80, z + .10, '晚上灯笼是红色的。',
        'At night the lanterns glow red.',
        '灯 lamp + 笼 cage. Hung in pairs, always an odd sort of even.',
        { focus: [x + 1.4, z - 1.1], reach: 2.2 });
    }
  }

  function lantern(x, y, z, tagIt) {
    const T = tagIt ? { tag: '灯笼' } : {};
    capsule(x, y + .30, z, .022, .30, .022, col.charcoal, { gloss: G.metal });
    cyl(x, y + .16, z, .055, .05, col.gold, { gloss: G.metal, ...T });
    litten(ball(x, y, z, .175, .155, .175, col.red, { gloss: .30, glow: .10, ...T }), .55);
    cyl(x, y + .145, z, .075, .045, col.goldL, { gloss: G.metal, ...T });
    cyl(x, y - .15, z, .075, .045, col.goldL, { gloss: G.metal, ...T });
    for (let i = 0; i < 5; i++)
      capsule(x + (i - 2) * .035, y - .27, z, .012, .18, .012, col.gold, { gloss: .30 });
    lampPools.push(glow(M.trs(x, .02, z, 0, 2.2, 1, 2.2), C('#ff9c5e'), 0));
  }

  // 国槐 — the scholar trees that shade every hutong. Trunk, a few real branches, then
  // clustered foliage: a single lollipop sphere reads as a cartoon, a handful does not.
  function tree(x, z, s, tagIt) {
    const T = tagIt ? { tag: '树' } : {};
    // cast-iron grate around the base, and the dirt inside it
    flat(x, .006, z, 1.5 * s, 1.5 * s, col.dirt, { gloss: .10 });
    for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]])
      box(x + a * .72 * s, .04, z + b * .72 * s, a ? .10 : 1.5 * s, .08, b ? .10 : 1.5 * s,
        col.steelD, { hard: true, gloss: .30 });
    // Trunk as three stacked cylinders. A single taper narrows to a third of its base, which
    // on a two-metre trunk is a traffic cone, and the whitewash then bulged out through it.
    cyl(x, .52 * s, z, .225 * s, 1.05 * s, col.paintW, { gloss: .14, ...T });   // limewashed
    cyl(x, 1.50 * s, z, .205 * s, .95 * s, col.trunk, { gloss: G.matte, ...T });
    cyl(x, 2.30 * s, z, .165 * s, .70 * s, col.trunkL, { gloss: G.matte, ...T });
    // Limbs kept short enough to finish inside the crown. Longer ones came out through the
    // foliage as dark spikes, which is what made the tree read as a pincushion.
    for (let i = 0; i < 5; i++) {
      const a = i * 1.257 + rnd() * .35, lean = .66 + rnd() * .22, L = (.95 + rnd() * .4) * s;
      capsule(x + Math.sin(a) * L * .32, (2.55 + rnd() * .3) * s, z + Math.cos(a) * L * .32,
        .12 * s, L, .12 * s, col.trunk, { ry: a, rz: lean, gloss: G.matte, ...T });
    }
    // The crown is a lot of small clusters on a flattened dome, not a few big spheres. At
    // three or four spheres a tree reads as a lollipop however carefully they are placed.
    // Crown pulled in and lifted since: at a 1.28 m ring of 0.82 m clusters the canopy was
    // three and a half metres across at head height and filled two thirds of every frame
    // looking along the alley. Five tones rather than three, because a dozen clusters in
    // three greens reads as a pattern.
    const rings = [[3.30, .88, 5, .62], [3.92, 1.10, 7, .72],
                   [4.50, .82, 6, .68], [4.98, .38, 3, .62], [5.22, 0, 1, .66]];
    // The crown gets its own five tones rather than the scene's green, and they are a long way
    // duller than they were. At col.green / col.greenL the canopy was the most saturated thing
    // in the district by a distance — a row of park-brochure trees over a grey hutong, and the
    // one object in every alley view that said "rendered" out loud. A 国槐 in Beijing carries a
    // fortnight of road dust and stands under a white haze: the green it reads as is an olive.
    // Kept at the same luminance so the canopy still separates from the roofs behind it.
    const FOLIAGE = [C('#5b6a41'), C('#757f50'), C('#46512f'), C('#7a8452'), C('#525f3a')];
    // Which of the five tones each ring is allowed. Taking them in sequence all the way up the
    // tree spread the pale greens evenly through the crown, and a crown with its lightest leaf
    // as likely to be underneath as on top is a green cloud. Light on top, dark below — which is
    // where a canopy's depth actually comes from.
    const TONE = [[2, 4, 4], [4, 0, 2], [0, 3, 0], [1, 3, 1], [1, 3, 1]];
    // The shadow the mass above throws on the mass below, as one flattened dark cluster tucked
    // under the middle of the crown. One primitive, and it is the difference between a canopy
    // with an inside and a bunch of balloons.
    ball(x, 3.16 * s, z, 1.22 * s, .40 * s, 1.22 * s, C('#3a4429'),
      { gloss: .08, mode: 15, ...T });
    let li = 0, ri = 0;
    for (const [ry0, rad, n, cr] of rings) {
      const tone = TONE[ri++];
      for (let i = 0; i < n; i++, li++) {
        const a = li * 2.399 + ry0;
        const j = .82 + rnd() * .34;
        ball(x + Math.sin(a) * rad * s, (ry0 + (rnd() - .5) * .30) * s,
          z + Math.cos(a) * rad * s,
          cr * j * s, cr * j * .78 * s, cr * j * s,
          FOLIAGE[tone[i % 3]], { gloss: .12, mode: 15, ...T });
      }
    }
    shade(x, z, 3.4 * s, 3.4 * s, .30);
    solid(x - .42 * s, x + .42 * s, z - .42 * s, z + .42 * s);
    if (tagIt) thing('树', x, 3.2 * s, z, '胡同里有很多老树。',
      'There are a lot of old trees in the hutong.',
      'These are 国槐, scholar trees. Beijing plants them everywhere.',
      { focus: [x, z - 1.3], reach: 2.2 });
  }

  // A bicycle, built from the parts you actually notice: two dark wheels, a frame, bars,
  // a saddle and usually a basket.
  //
  // `o.front === false` builds it with the front wheel off. The repair pitch used to call this
  // with both wheels on while a spare stood propped against the wall beside it and two more hung
  // above, so the two halves of that corner contradicted each other: a man with his tools laid
  // out and nothing to mend.
  function bike(x, z, ry, frame, basket, tagIt, o = {}) {
    const T = tagIt ? { tag: '自行车' } : {};
    const s = Math.sin(ry), c = Math.cos(ry);
    const at = (fw, up, side) => [x + s * fw + c * side, up, z + c * fw - s * side];
    const put = (mesh, fw, up, side, sx, sy, sz, color, o = {}) => {
      const p = at(fw, up, side);
      return B.shape(mesh, p[0], p[1], p[2], sx, sy, sz, color,
        { ry, ...o, ...T });
    };
    // Open tyre arcs, three real spokes and a hub. Layering smaller cylinders over a tyre did not
    // make a rim: at player height every parked bicycle was still a solid black disc, and a rank
    // of them became a wall. Eight overlapping arcs cost little enough for this sparse parked set
    // and, crucially, leave actual daylight through the wheel.
    for (const fw of (o.front === false ? [-.52] : [-.52, .52])) {
      const wr = .305, wn = 8, seg = 2 * wr * Math.sin(Math.PI / wn) * 1.10;
      for (let k = 0; k < wn; k++) {
        const a = k * Math.PI * 2 / wn;
        put('capsule', fw + Math.cos(a) * wr, .335 + Math.sin(a) * wr, 0,
          .023, seg, .023, col.black, { rz: a, gloss: .26 });
      }
      for (let k = 0; k < 3; k++)
        put('capsule', fw, .335, 0, .008, .54, .008, col.steel,
          { rz: k * Math.PI / 3, gloss: G.metal });
      put('cyl', fw, .335, 0, .11, .09, .11, col.steel, { rz: Math.PI / 2, gloss: G.metal });
    }
    put('capsule', 0, .50, 0, .05, 1.02, .05, frame, { rz: Math.PI / 2, gloss: .34 });
    put('capsule', -.24, .60, 0, .045, .55, .045, frame, { rz: .52, gloss: .34 });
    put('capsule', .34, .60, 0, .042, .62, .042, frame, { rz: -.34, gloss: .34 });
    put('capsule', -.42, .48, 0, .04, .40, .04, frame, { rz: -.30, gloss: .34 });
    put('box', -.14, .68, 0, .21, .055, .12, col.black, { gloss: .30 });      // saddle
    put('capsule', .52, .96, 0, .028, .46, .028, col.steel, { rz: Math.PI / 2, gloss: G.metal });
    put('capsule', .50, .82, 0, .03, .30, .03, col.steelD, { gloss: G.metal });
    for (const side of [-.16, .16])
      put('capsule', .14, .20, side, .034, .12, .034, col.black, { rz: Math.PI / 2, gloss: .3 });
    if (basket) {
      put('taper', .46, .78, 0, .30, .24, .24, col.steelD, { gloss: .34 });
      put('box', .46, .90, 0, .26, .04, .20, col.canvas, { gloss: G.fabric, mode: 7 });
    }
    put('box', -.30, .86, 0, .30, .04, .22, col.steelD, { gloss: .34 });      // rear rack
    shade(x, z, 1.7, .9, .26);
  }

  // A facade window: dark reveal for depth, glass, a frame cross, a concrete sill. The
  // glass takes the sky by day and a lit room at night.
  function fwin(x, y, z, w, h, o = {}) {
    const n = o.n === undefined ? 1 : o.n;           // which way the wall faces in z
    const d = q => z + n * q;
    box(x, y, d(.030), w + .13, h + .13, .06, col.glassDark, { hard: true, gloss: .20 });
    // Whether anybody is home behind this pane. Drawn from the build's random stream by default;
    // `o.warm` lets a caller key it to something real instead — your own block keys it to the
    // decks `js/world.js` actually furnishes, so the facade reports the tower's occupancy rather
    // than a coin toss.
    const warm = o.warm === undefined ? rnd() : o.warm;
    pane(box(x, y, d(.055), w, h, .02, col.glassDay,
      { hard: true, mode: 1, gloss: G.glass }), warm, undefined, o.mine);
    if (o.frame !== false) {
      box(x, y, d(.070), .045, h, .02, col.frame, { hard: true, gloss: G.paint });
      box(x, y, d(.070), w, .045, .02, col.frame, { hard: true, gloss: G.paint });
    }
    box(x, y - h / 2 - .055, d(.085), w + .26, .07, .17, col.renderD,
      { hard: true, gloss: G.paint });
    return warm;
  }

  // The split air-conditioner bolted outside every window, with its bracket and drip pipe.
  function acBox(x, y, z, n = 1) {
    box(x, y, z + n * .28, .84, .58, .40, col.white, { hard: true, gloss: .26 });
    for (let i = -2; i <= 2; i++)
      box(x + i * .13, y, z + n * .49, .05, .44, .03, col.steelD, { hard: true, gloss: .3 });
    for (const s of [-1, 1])
      box(x + s * .34, y - .34, z + n * .26, .06, .10, .34, col.steelD, { hard: true, gloss: .3 });
    capsule(x + .40, y - .62, z + n * .10, .026, .70, .026, col.white, { gloss: .2 });
  }

  // Street lamp: a tapered post, a swan neck each side, and a warm pool underneath.
  function lamp(x, z, arms = 2) {
    cyl(x, .18, z, .26, .36, col.stoneD, { gloss: .22 });
    taper(x, 3.0, z, .30, 5.6, .30, col.steelD, { gloss: .34 });
    cyl(x, 5.85, z, .10, .40, col.steelD, { gloss: .34 });
    for (let i = 0; i < arms; i++) {
      const s = arms === 1 ? 1 : (i ? 1 : -1);
      capsule(x, 6.12, z + s * .62, .07, 1.35, .07, col.steelD,
        { rx: -s * 1.19, gloss: .34 });
      taper(x, 6.32, z + s * 1.20, .52, .22, .34, col.steel, { rx: Math.PI, gloss: .40 });
      litten(box(x, 6.20, z + s * 1.20, .44, .05, .28, C('#fff0cc'),
        { hard: true, mode: 1, glow: .2 }), 1.0);
      lampPools.push(glow(M.trs(x, .03, z + s * 1.20, 0, 6.5, 1, 6.5), C('#ffd79a'), 0));
      // The three things a street light is, and it needs all three. The emissive box above is
      // what the lantern looks like; the pool is the soft patch on the paving that no point
      // light without bounce will ever produce; this is the one that actually lights the kerb,
      // the railings and anybody standing under it. Radius is street-lighting scale rather than
      // room scale — a 3 m falloff six metres up reaches nothing but the top of the post.
      B.light(x, 6.05, z + s * 1.20, [1.0, .84, .62], .60, 9.5);
    }
    solid(x - .3, x + .3, z - .3, z + .3);
  }

  // Shop signage: a board with what it says written on it, glowing after dark. `n` is which
  // way the board faces along z, so the same helper serves a shopfront and a kiosk turned round.
  //
  // These used to be blocks of colour, one per character, on the grounds that a sign reads as a
  // sign at any distance. It does — but the entire premise of the game is that the street is
  // covered in writing the player is learning, and a shop called ■■ teaches nobody anything.
  function signBoard(x, y, z, w, h, base, ink, text, n = 1, glowK = .9) {
    // A 门头 is a BOX, and the depth is most of why one reads from the end of the street. At 16 cm
    // this was a panel; at 26 it throws a shadow down its own face in raking light and the top
    // drip catches the sky. The two together are the difference between a sign painted on a wall
    // and a sign hung off one.
    box(x, y, z + n * .13, w, h, .26, base, { hard: true, gloss: .30 });
    box(x, y, z + n * .27, w - .10, h - .10, .02, base, { hard: true, mode: 1 });
    // A drip over the top and a LIT VALANCE under the bottom. The valance is what a Chinese
    // shopfront actually has and what this street had none of: a bright horizontal line at the
    // foot of every board, which at night is the shop's whole outline and by day still reads as
    // an edge. Emissive, not a light — one lit strip a shop, on a district that is fill-rate
    // bound, where forty point lights would not be.
    box(x, y + h / 2 + .05, z + n * .17, w + .10, .10, .34, base, { hard: true, gloss: .26 });
    const lit = [Math.min(1, ink[0] * .55 + .45), Math.min(1, ink[1] * .55 + .45),
                 Math.min(1, ink[2] * .55 + .45)];
    litten(box(x, y - h / 2 - .04, z + n * .28, w - .06, .07, .03, lit,
      { hard: true, mode: 1, glow: .10 }), glowK * 1.25);
    // 灯箱 return. The board is a box and the valance under it is lit, but the lit part was still
    // one flat face: a 灯箱 is a tray of light and what says so is the RETURN — the edge that runs
    // round the tray and glows on its own, so the sign reads as thick from an oblique angle
    // instead of collapsing to a painted panel. ONE quad per board, matched to the valance, which
    // is the whole of the budget: `.audit.js:327` has this district fill-rate bound and
    // `street-retail.js:12` costs a mode-1 glowing quad at half a transparent scene copy. Eleven
    // named shops carry one; the forty anonymous units on the parade do not.
    litten(box(x, y + h / 2 - .02, z + n * .285, w - .06, .05, .025, lit,
      { hard: true, mode: 1, glow: .07 }), glowK * .9);
    // Sized to fill the board. 0.82 of the panel rather than 0.70, and 0.92 of the run rather than
    // 0.86: the datum fixed WHERE every sign sits, and the next thing a street needs is for the
    // writing on them to be big enough to read while you are still deciding whether to cross.
    const size = Math.min(h * .82, (w - .18) / Math.max(1, text.length) * .92);
    for (const g of B.glyphs(x, y, z + n * .28, n > 0 ? 0 : Math.PI, text,
        { size, gap: size * .14, color: ink, mode: 1, glow: .32, lift: .015 }))
      litten(g, glowK);
    lampPools.push(glow(M.trs(x, .03, z + n * 1.6, 0, w + 3.0, 1, 4.2), C('#ffb877'), 0));
    // Shop signage is the other half of this district's night lighting, and on the alley it is
    // most of it: two lamps light fifty metres of hutong and everything else you can see after
    // dark is somebody's shopfront. Set out in front of the board so the wall it is mounted on
    // is lit *by* it rather than from inside itself.
    B.light(x, y - .30, z + n * .80, [1.0, .74, .46], .45, w + 3.0);
  }

  // 遮阳篷 — the shop awning, one profile for the whole alley. Before this only 幸福超市 had one,
  // so its stretch of frontage read richer than 老李面馆's and 五金电器's for no reason anybody
  // could name from the street. The PROJECTION is 超市's own and is not a free number: slats
  // 1.30 m deep at rx -.30 hung on z + .78, which puts the front rail on z + 1.34 (front face
  // z + 1.39) and the sheet between y-.24 at the wall and y+.24 at the front. At y 2.92 that is
  // the 2.68 .. 3.16 band the 超市 has always occupied — under the shutter housing at 2.86 and
  // clear of the fascia at 3.12.
  //
  // `skip` breaks the run for a projecting sign: 五金's 侧招 hangs at x 16.62 on the shared
  // BLADE line (2.27 .. 2.83) and the awning's own rear edge is at 2.68, so the two want the
  // same 15 cm of air. A real frontage breaks its awning round the sign rather than either one
  // moving, and that is what this does.
  //
  // THE VALANCE BREAKS WITH IT, and the first pass at this did not — which is the whole of the
  // bug L2 found and the lead confirmed off the live site at (18.80, 1.10). Skipping two slats
  // opened 1.20 m of daylight in the canvas and then ran a solid 6.10 m rail straight across it
  // at y 2.49 .. 2.71, through the middle of a 侧招 whose panel is 2.27 .. 2.83 and whose case
  // reaches z czb+1.345 — 5 mm short of the rail's own back face. A gap in the slats with a bar
  // across it is not a gap: the sign's upper character was behind the bar and only the lower one
  // read. The datum does not move, so the rail is cut to the same opening the canvas has —
  // measured off the skipped slats' own edges rather than off a number typed here, so the two
  // can never disagree again.
  function awning(x, y, z, n, c1, c2, skip) {
    let g0 = Infinity, g1 = -Infinity;               // the canvas opening, if there is one
    for (let i = 0; i < n; i++) {
      const sx = x + (i - (n - 1) / 2) * .60;
      if (skip !== undefined && Math.abs(sx - skip) < .45) {
        g0 = Math.min(g0, sx - .30); g1 = Math.max(g1, sx + .30); continue;
      }
      box(sx, y, z + .78, .60, .10, 1.30, i % 2 ? c2 : c1, { hard: true, rx: -.30, gloss: .24 });
    }
    const x0 = x - n * .30 - .05, x1 = x + n * .30 + .05;
    for (const [a, b] of (g1 > g0 ? [[x0, g0], [g1, x1]] : [[x0, x1]]))
      if (b - a > .10)
        box((a + b) / 2, y - .32, z + 1.34, b - a, .22, .10, c2, { hard: true, gloss: .24 });
  }

  // 卷帘门 housing — the boxed-in roller drum every Chinese shopfront has over its glass. Three
  // of the alley's did not: the glass simply stopped and the sign started, which is why the
  // fascia band read as painted onto the wall rather than bolted to a shop. It lives in the one
  // clear band there is: above the frontage head and below the boards, so top <= 3.12 where
  // FASCIA - FASCIAH/2 puts the bottom of every name board on this street. No collider — the
  // drum is at 2.9 m and `solid()` is a 2D footprint with no height, so one here would wall off
  // the pavement in front of the shop it belongs to.
  //
  // MEASURED ON THE LIVE SITE, and it is the one thing about this pair that is not obvious: an
  // awning and a shutter housing want the SAME band of wall. The 超市's sheet spans 2.68 .. 3.16
  // and the housing 2.86 .. 3.10, so a housing the same width as the awning in front of it is
  // invisible from the alley — A1's own check ("visible in an elevation shot") fails on exactly
  // the frontages A7 gives an awning to. Neither item can move: the board's bottom edge is at
  // 3.12 and the window heads are at 2.66 .. 2.90. So the housing is made WIDER than the awning
  // instead — 35 cm proud at each end on 超市, 30 on 面馆, 60 on 五金 — and what reads from the
  // street is the drum running out past the canvas, which is what a real one does.
  function shutterBox(x, y, z, w, h) {
    box(x, y, z + .13, w, h, .26, col.steel, { hard: true, gloss: .34, ...SHUT });
    box(x, y - h / 2 + .02, z + .25, w + .04, .05, .05, col.steelD, { hard: true, gloss: .36 });
    for (const s of [-1, 1])
      box(x + s * (w / 2 + .03), y, z + .13, .06, h + .05, .28, col.steelD,
        { hard: true, gloss: .34 });
  }

  // A repeated threshold language for places the player can actually enter. The painted mat
  // and inward chevron sit out on the paving where the third-person camera sees them; the same
  // red-and-gold treatment on both businesses teaches that this is an actionable doorway, not
  // another decorative window or residential gate.
  function entryMat(x, z, tag) {
    box(x, .026, z, 1.34, .035, .86, col.redD,
      { hard: true, gloss: .14, tag });
    box(x, .048, z + .31, 1.12, .016, .065, col.goldL,
      { hard: true, gloss: .16, tag });
    for (const s of [-1, 1])
      box(x + s * .13, .050, z - .09, .075, .018, .48, col.goldL,
        { hard: true, ry: s * .54, gloss: .16, tag });
  }

  // Static figures. The player has a rigged body driven by the game loop; these are scenery,
  // built straight into the scene. An alley with nobody in it reads as a film set however much
  // clutter you put in it.
  const SKINS = ['#e2ae88', '#d69f78', '#c68e68', '#eab994'].map(C);
  // The people who used to be built here are neighbours now, drawn by the shared figure rig in
  // figure.js and given somewhere to be and something to do in game.js. Assembled out of
  // capsules and balls as static props they had no faces, no hands and no movement, and beside
  // a figure off the real rig they were the worst thing on the street. What stays here is the
  // furniture they use: the stools, the birdcage, the counter, the broom.

  // A paper lantern on a string, for the runs that cross the alley on festival wire.
  function miniLantern(x, y, z, col1) {
    capsule(x, y + .12, z, .014, .16, .014, col.charcoal, { gloss: .3 });
    litten(ball(x, y, z, .085, .075, .085, col1, { gloss: .30, glow: .10 }), .45);
    for (let i = 0; i < 3; i++)
      capsule(x + (i - 1) * .022, y - .11, z, .008, .09, .008, col.gold, { gloss: .3 });
  }

  // 石狮子 — a stone lion on its plinth, flanking a gate. At this scale the head, the mane
  // and the raised paw are the whole of what anyone reads, so that is all it is.
  function stoneLion(x, z, s) {
    const S = col.stone, D = col.stoneD, T = { tag: '石狮子' };
    // plinth
    box(x, .21, z, .62, .42, .58, D, { hard: true, gloss: .24, ...T });
    box(x, .45, z, .52, .07, .50, S, { hard: true, gloss: .26, ...T });
    // Seated: haunches at the back, chest standing up in front, head over the chest. Built
    // as one lump with a ball for a head it read as a heap of grey stones on a box.
    box(x, .68, z + .11, .34, .42, .32, S, { gloss: .24, round: .09, ...T });
    box(x, .78, z - .11, .30, .50, .26, S, { gloss: .24, round: .09, ...T });
    ball(x, 1.08, z - .13, .145, .145, .145, S, { gloss: .26, ...T });
    // The mane rings the whole head from behind it, not just over the top. Arced across the
    // crown only, it sat up like a wig and the lion read as a poodle.
    for (let i = 0; i < 8; i++) {
      const a = i * .785;
      ball(x + Math.sin(a) * .155, 1.07 + Math.cos(a) * .148, z + .02,
        .050, .050, .048, D, { gloss: .22, ...T });
    }
    ball(x, 1.04, z - .26, .075, .065, .065, S, { gloss: .26, ...T });       // muzzle
    ball(x, 1.03, z - .31, .022, .02, .02, col.charcoal, { gloss: .30, ...T });
    for (const t of [-1, 1]) {
      ball(x + t * .062, 1.10, z - .26, .022, .022, .02, col.charcoal, { gloss: .34, ...T });
      ball(x + t * .10, 1.19, z - .09, .05, .06, .045, D, { gloss: .24, ...T });
      // front legs, straight down the face of the chest
      box(x + t * .105, .60, z - .23, .10, .32, .13, S, { hard: true, gloss: .26, ...T });
      box(x + t * .105, .47, z - .28, .12, .07, .20, D, { hard: true, gloss: .26, ...T });
    }
    // The ball under a raised forepaw is the traditional tell, but at this size the raised
    // leg and the ball together read as a heap of grey blocks in front of the chest. A ball
    // resting between both paws says the same thing and keeps the silhouette clean.
    //
    // A pair is not two of the same lion, and the audit that asked for these to be made
    // symmetric had the tradition backwards: the 雄狮 keeps a 绣球 under his paw and the 雌狮
    // keeps a cub under hers. What was actually wrong is that only one of them had anything at
    // all, so the left plinth read as an unfinished carving with a lion sitting on it.
    if (s > 0) {
      ball(x, .53, z - .34, .095, .095, .095, D, { gloss: .28, ...T });
      // Two crossed seams over the ball. Plain, it was a boulder; the seams are the only thing
      // at this size that says embroidered silk.
      for (const t of [-1, 1])
        capsule(x, .53, z - .355, .011, .17, .011, S, { rz: t * .80, gloss: .30, ...T });
    } else {
      // The cub, rolled onto its back against her forepaw, which is how it is nearly always
      // carved. Stood up on its feet it came out the same size and shape as the ball opposite
      // and the pair went back to looking identical.
      ball(x + .02, .50, z - .32, .078, .062, .088, D, { gloss: .26, ...T });
      ball(x - .07, .57, z - .37, .050, .048, .048, D, { gloss: .26, ...T });
      for (const t of [-1, 1])
        ball(x - .07 + t * .036, .615, z - .39, .021, .023, .019, S, { gloss: .24, ...T });
      // Paws in the air. Both legs on the same side of the body, because from the alley you
      // only ever see the cub from one side and legs on the far side are wasted primitives.
      for (const t of [-1, 1])
        capsule(x + .055, .565, z - .345 + t * .050, .015, .11, .015, D,
          { rz: 1.05 + t * .18, gloss: .26, ...T });
    }
    capsule(x, .84, z + .26, .05, .34, .05, S, { rx: -.6, gloss: .26, ...T });
    solid(x - .36, x + .36, z - .34, z + .32);
    shade(x, z, 1.0, .9, .34);
  }

  // 鸽子笼 — the pigeon loft on somebody's roof, and its birds. Half of old Beijing keeps
  // racing pigeons, and a roofline without one is missing the thing that circles over it.
  function pigeonLoft(x, y, z) {
    box(x, y + .06, z, 1.90, .12, 1.00, col.trunk, { hard: true, gloss: G.wood });
    box(x, y + .52, z + .10, 1.70, .80, .74, col.trunkL, { hard: true, gloss: G.wood });
    box(x, y + .52, z - .30, 1.70, .80, .06, col.charcoal, { hard: true, gloss: .30 });
    for (let i = 0; i < 9; i++)                                  // wire mesh, read as bars
      capsule(x - .78 + i * .195, y + .52, z - .34, .014, .74, .014, col.steel, { gloss: G.metal });
    for (const t of [-1, 1])
      box(x, y + .52 + t * .37, z - .34, 1.74, .05, .05, col.trunk,
        { hard: true, gloss: G.wood });
    box(x, y + .98, z + .06, 2.00, .09, .96, col.tileD,
      { hard: true, mode: 13, gloss: .20, ...RTILE });
    box(x, y + .14, z - .58, 1.50, .05, .44, col.trunkL, { hard: true, gloss: G.wood });
    // the birds: on the landing board, on the loft roof, and one on the ridge
    //
    // Kept, rather than built and forgotten. The note at the top of this function says a roofline
    // without a loft is missing the thing that circles over it — and then the birds sat on the
    // boards for good, which is a loft missing the same thing. `tick` flies them: a few times an
    // hour the whole flock goes up, turns over the courtyards for half a minute and settles again.
    for (const [bx, by, bz, br] of [[x - .5, y + .20, z - .68, .4], [x + .1, y + .20, z - .72, -1.1],
                                    [x + .62, y + 1.09, z + .12, 2.2], [x - .42, y + 1.09, z - .16, .6]]) {
      const body = ball(bx, by + .055, bz, .055, .062, .085, col.frame, { gloss: .16, ry: br });
      const head = ball(bx + Math.sin(br) * .08, by + .10, bz + Math.cos(br) * .08, .032, .036, .032,
        col.steelD, { gloss: .16 });
      const tail = box(bx - Math.sin(br) * .09, by + .06, bz - Math.cos(br) * .09, .05, .03, .09,
        col.steelD, { hard: true, ry: br, gloss: .16 });
      const parts = [body, head, tail];
      for (const p of parts) p.dynamic = true;
      birds.push({ parts, m0: [body.m, head.m, tail.m],
                   x: bx, y: by + .06, z: bz, ry: br,
                   // Each bird leaves and lands a little after the one beside it, and takes its own
                   // radius round the roof, or four pigeons fly as one object.
                   lag: birds.length * .55, r: 3.4 + birds.length * .9,
                   h: 2.2 + (birds.length % 3) * .8 });
    }
  }

  // What is actually on a courtyard roof. Two dozen bare pitched slabs was the flattest thing in
  // every raised view of this district — from the loft, from the fifth floor, from anywhere the
  // camera got above two metres, the hutong was a field of clean grey wedges. A real 青瓦 slope
  // carries half-bricks laid along the ridge where the mortar has gone, a television aerial
  // nobody took down when the cable went in, a soil vent, and grass growing out of the courses.
  //
  // Everything here is placed off `jit`, never off `rnd()`. These are called from the middle of
  // the build and a draw from the random stream would shift every later decision in the district,
  // down to which of the parade's units have their shutters down.
  function roofJunk(cx, cz, ridgeY, len, span, rise) {
    const j = jit(cx * 3.1, cz * 1.7);
    const half = span / 2;
    // Half-bricks along the ridge. They sit on top of the cap course, which is a capsule of
    // radius .10 centred .06 above the ridge line, so its crown is at ridgeY + .16.
    const n = 3 + ((j * 4) | 0);
    for (let i = 0; i < n; i++) {
      const t = (i + .5) / n - .5, bx = cx + t * len * .74, k = jit(bx * 5.3, cz + i);
      box(bx, ridgeY + .21, cz + (k - .5) * .30, .25, .10, .12, col.brickD,
        { hard: true, mode: 11, ry: (k - .5) * 1.4, gloss: G.matte });
    }
    // The aerial. A mast, five elements getting shorter toward the top, and a stay wire back
    // to the ridge — without the stay it stood dead vertical and read as a lamppost on a roof.
    const ax = cx + (j - .5) * len * .52;
    capsule(ax, ridgeY + 1.02, cz + .22, .020, 1.70, .020, col.steelD, { gloss: G.metal });
    for (let i = 0; i < 5; i++)
      capsule(ax, ridgeY + 1.10 + i * .18, cz + .22, .011, .86 - i * .11, .011, col.steelD,
        { rz: Math.PI / 2, gloss: G.metal });
    capsule(ax + .26, ridgeY + .52, cz + .16, .008, .80, .008, col.charcoal,
      { rz: .62, gloss: .26 });
    // A soil vent through the back pitch, with its cowl. Sunk far enough down the slope that
    // the pipe's foot is under the tiles rather than standing on top of them.
    const vx = cx - (j - .5) * len * .36, vd = half * .62;
    const vy = ridgeY - (vd / half) * rise;
    cyl(vx, vy + .30, cz + vd, .075, .74, col.renderD, { gloss: .22 });
    cyl(vx, vy + .70, cz + vd, .105, .07, col.charcoal, { gloss: .26 });
    // Grass in the courses. Three tufts, on the foliage shader so they pick up the same season
    // tint as the trees rather than sitting there as three flat green pebbles.
    for (let i = 0; i < 3; i++) {
      const k = jit(cx + i * 4.1, cz * 2.3 + i);
      ball(cx + (k - .5) * len * .82, ridgeY + .15, cz + (jit(k, i) - .5) * .8,
        .14, .09, .12, C('#5d5f3c'), { gloss: .10, mode: 15 });
    }
  }

  // The clutter that piles up against the foot of a wall and never moves: crates, a gas bottle,
  // a bucket, a coil of hose, a folded tarpaulin, a stack of bricks. The single biggest gap
  // between this alley and a photograph of one is how much of this there is per metre, and none
  // of it needs to be interesting on its own — it needs to be there.
  //
  // `kind` picks what the pile is; `n` is the direction from the wall out into the alley, so it
  // is +1 against the block on the north side and -1 against the courtyard wall on the south.
  // Getting that sign backwards is what put the first coil of hose half a metre out in mid-air.
  // Nothing here takes a tag: an untagged prop is scenery, and the district already has as many
  // words in it as a player can hold.
  function wallJunk(x, z, kind, n = 1) {
    const CR = [C('#3d6f8c'), C('#8a4a3c'), C('#4f7a58'), C('#8a7a3c')];
    if (kind === 0) {
      // Four open returnable crates in an uneven low stack. Seven opaque coloured boxes became
      // literal toy masonry beside 垃圾分类; thin rails, corner posts and visible contents keep the
      // same lived-in stock cue while letting the brick wall and air show through every crate.
      const makeCrate = (cx, base, cz, color, ry, loaded) => {
        const w = .58, d = .40, h = .19, rail = .035, ca = Math.cos(ry), sa = Math.sin(ry);
        const at = (ox, oz) => [cx + ca * ox + sa * oz, cz - sa * ox + ca * oz];
        for (const oz of [-.12, 0, .12]) {
          const [px, pz] = at(0, oz);
          box(px, base + .018, pz, .51, .035, .040, color, { hard:true, ry, gloss:.24 });
        }
        for (const yy of [base + .065, base + .155]) {
          for (const oz of [-d / 2 + rail / 2, d / 2 - rail / 2]) {
            const [px, pz] = at(0, oz);
            box(px, yy, pz, w, rail, rail, color, { hard:true, ry, gloss:.26 });
          }
          for (const ox of [-w / 2 + rail / 2, w / 2 - rail / 2]) {
            const [px, pz] = at(ox, 0);
            box(px, yy, pz, rail, rail, d, color, { hard:true, ry, gloss:.26 });
          }
        }
        for (const ox of [-w / 2 + rail / 2, w / 2 - rail / 2])
          for (const oz of [-d / 2 + rail / 2, d / 2 - rail / 2]) {
            const [px, pz] = at(ox, oz);
            capsule(px, base + h / 2, pz, .016, h, .016, color, { gloss:.26 });
          }
        if (loaded) {
          for (let q = 0; q < 4; q++) {
            const [px, pz] = at(-.17 + (q % 2) * .31, -.09 + ((q / 2) | 0) * .18);
            ball(px, base + .18, pz, .075, .055, .075,
              q % 2 ? C('#b46b43') : C('#87975b'), { gloss:.12, ry:q * .7 });
          }
        }
      };
      const crates = [
        [-.34, .00, -.015, -.07, false], [.31, .00, .025, .06, false],
        [-.30, .20, .005, .04, true],    [.30, .20, -.020, -.09, true],
      ];
      crates.forEach(([ox, base, oz, ry, loaded], i) =>
        makeCrate(x + ox, base, z + oz, CR[i % CR.length], ry, loaded));
    } else if (kind === 1) {
      // 液化气罐 the bottled-gas cylinder that every hutong kitchen still runs on, its regulator,
      // and a red plastic bucket beside it with a mop standing in it.
      cyl(x, .34, z, .155, .62, C('#b8a83f'), { gloss: .34 });
      cyl(x, .655, z, .125, .04, C('#8d7f2f'), { gloss: .36 });
      for (let i = 0; i < 3; i++)
        box(x + Math.sin(i * 2.09) * .10, .72, z + Math.cos(i * 2.09) * .10, .05, .12, .05,
          col.steelD, { hard: true, gloss: G.metal });
      cyl(x, .755, z, .06, .05, col.steelD, { gloss: G.metal });
      taper(x + .42, .13, z + n * .10, .30, .26, .30, C('#b03a2e'), { rx: Math.PI, gloss: .32 });
      capsule(x + .40, .62, z + n * .08, .022, .96, .022, col.trunkL, { rz: .13, gloss: G.wood });
      capsule(x + .34, 1.10, z + n * .06, .055, .16, .055, C('#b8b0a0'), { gloss: .10 });
    } else if (kind === 2) {
      // A coil of hose on a nail, a folded blue tarpaulin, and a bundle of cane. There is no
      // torus in the mesh set, so the coil is a ring of short capsules — the same trick the
      // repair pitch uses for its inner tube, which is the only thing that reads as coiled.
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        capsule(x + Math.cos(a) * .21, 1.34 + Math.sin(a) * .21, z - n * .28,
          .028, .116, .028, C('#3f6f4a'), { rz: a, gloss: .30 });
      }
      capsule(x, 1.60, z - n * .34, .011, .10, .011, col.steelD, { gloss: G.metal });
      // A compact hinged toolbox, recessed against the wall. The old .86 × .52 m blue chest
      // breached the legal body edge and read as one bright cuboid in front of 修鞋. A tapered
      // case, separate lid, hinge, handle, latches and feet keep the same lived-in cue while its
      // whole envelope stays in the unreachable wall strip at both call sites.
      const tbx = x - .04, tbz = z - n * .24;
      taper(tbx, .17, tbz, .70, .28, .32, C('#3b6f9c'), { gloss: .22, ry: .09 });
      box(tbx, .21, tbz + n * .165, .54, .16, .018, C('#315d84'),
        { hard:true, gloss:.20, ry:.09 });
      box(tbx, .35, tbz, .74, .06, .36, C('#33608a'),
        { hard:true, gloss:.20, ry:.09, round:.035 });
      capsule(tbx, .34, tbz - n * .185, .014, .64, .014, col.steelD,
        { rz:Math.PI / 2 + .09, gloss:G.metal });
      for (const s of [-1, 1]) {
        capsule(tbx + s * .16, .43, tbz, .012, .16, .012, col.steelD,
          { rz:s * .20, gloss:G.metal });
        box(tbx + s * .18, .30, tbz + n * .190, .08, .10, .025, col.steel,
          { hard:true, gloss:G.metal, ry:.09 });
        ball(tbx + s * .27, .035, tbz, .035, .035, .035, col.black, { gloss:.20 });
      }
      capsule(tbx, .49, tbz, .014, .34, .014, col.steelD,
        { rz:Math.PI / 2, gloss:G.metal });
      for (let i = 0; i < 5; i++)
        capsule(x + .58, .74, z - n * .18 + (i - 2) * .035, .022, 1.46, .022,
          i % 2 ? C('#b7a172') : C('#a08d63'), { rz: .17 + (i - 2) * .02, gloss: .14 });
    } else {
      // A pile of salvaged brick and a stack of flattened cardboard tied with string, which is
      // what everybody's recycling looks like the day before the 收废品 man comes round.
      for (let i = 0; i < 11; i++) {
        const r = (i / 4) | 0, c = i % 4, k = jit(x + i, z * 1.3);
        box(x - .30 + c * .23, .045 + r * .09, z + (k - .5) * .22, .22, .09, .11,
          k > .5 ? col.brickD : tint(col.brick, .82, .01),
          { hard: true, mode: 11, ry: (k - .5) * .5, gloss: G.matte });
      }
      for (let i = 0; i < 4; i++)
        box(x + .74, .22 + i * .035, z - n * .06, .70, .035, .50, C('#a8926e'),
          { hard: true, gloss: .12, ry: .11 + i * .05 });
      capsule(x + .74, .34, z - n * .06, .010, .54, .010, C('#c9c2ae'),
        { rz: Math.PI / 2, gloss: .10 });
    }
  }

  // 电动车 — the e-scooter half the city rides, with the quilted 挡风被 buttoned over the
  // bars all winter and never taken off.
  // `tag` is optional and only the pair by the alley mouth take it, so the cursor can be pointed at
  // one. An untagged prop is invisible to `pick`, and 电动车 could only ever be found by standing in
  // the right place with nothing on screen to say why.
  function scooter(x, z, ry, body, quilt, tag) {
    const s = Math.sin(ry), c = Math.cos(ry);
    const put = (mesh, fw, up, side, sx, sy, sz, color, o = {}) =>
      B.shape(mesh, x + s * fw + c * side, up, z + c * fw - s * side,
        sx, sy, sz, color, { ry, tag, ...o });
    for (const fw of [-.44, .40]) {
      put('cyl', fw, .21, 0, .42, .11, .42, col.black, { rz: Math.PI / 2, gloss: .24 });
      put('cyl', fw, .21, 0, .26, .12, .26, col.steel, { rz: Math.PI / 2, gloss: G.metal });
      put('cyl', fw, .21, 0, .11, .14, .11, col.steelD, { rz: Math.PI / 2, gloss: G.metal });
    }
    // Moulded, overlapping volumes rather than a stack of coloured cartons.  The tyre shoulders,
    // step-through deck and two separate seat pads now keep their own curved silhouettes in the
    // exact views down the alley and across the metro mouth.
    put('ball', -.06, .30, 0, .48, .08, .17, body, { mode: 7, gloss: .34 });
    put('ball', -.40, .58, 0, .23, .29, .16, body, { mode: 7, gloss: .34 });
    put('ball', -.36, .84, 0, .26, .06, .15, col.black, { mode: 7, gloss: .26 });
    put('ball', -.62, .96, 0, .17, .05, .14, col.black, { mode: 7, gloss: .26 });
    put('taper', .40, .62, 0, .34, .62, .30, body, { rx: -.14, gloss: .34 });   // front shroud
    put('capsule', .40, .96, 0, .05, .48, .05, col.steelD, { gloss: .36 });
    put('capsule', .40, 1.02, 0, .035, .58, .035, col.charcoal,
      { rz: Math.PI / 2, gloss: .34 });                                      // bars
    for (const side of [-.30, .30]) {
      put('capsule', .40, 1.14, side, .018, .20, .018, col.steelD, { gloss: G.metal });
      put('ball', .40, 1.24, side, .045, .030, .020, col.charcoal,
        { mode: 7, gloss: .40 });
    }
    put('ball', .52, .74, 0, .11, .07, .05, col.frame, { mode: 1, gloss: .44 });
    // The quilt: a padded apron over the bars with sleeves at the ends, in the loudest
    // pattern the market had. Flat and plain it read as a bin bag hung on the handlebars.
    // Sized to the bars and the rider's shins. At 0.74 m square it was a coloured cube with a
    // wheel poking out of the bottom, and the scooter under it could not be seen at all.
    if (quilt) {
      put('ball', .30, .94, 0, .29, .20, .15, quilt, { mode: 7, gloss: G.fabric });
      put('ball', .26, .66, 0, .24, .17, .13, quilt, { mode: 7, gloss: G.fabric });
      for (const side of [-.27, .27])
        put('ball', .32, .99, side, .07, .11, .10, quilt, { mode: 7, gloss: G.fabric });
      for (let i = 0; i < 2; i++)
        put('box', .30, .84 + i * .18, 0, .60, .025, .32, col.cream,
          { mode: 7, gloss: G.fabric });
      put('box', .295, .94, 0, .22, .34, .32, col.cream, { mode: 7, gloss: G.fabric });
    }
    // A rounded lockable pod with a separate lid, latch and rear reflector.  It remains useful
    // storage without becoming the dominant square in every distant scooter silhouette.
    put('ball', -.70, .74, 0, .19, .18, .21, col.charcoal, { mode: 7, gloss: .30 });
    put('ball', -.70, .925, 0, .18, .035, .20, col.steelD, { mode: 7, gloss: .34 });
    put('box', -.906, .72, 0, .020, .075, .14, C('#b84235'),
      { hard: true, mode: 1, gloss: .34 });
    put('capsule', -.70, .965, 0, .014, .20, .014, col.steel,
      { rz: Math.PI / 2, gloss: G.metal });
    solid(x - .55, x + .55, z - .55, z + .55);
    shade(x, z, 1.6, 1.0, .30);
  }

  // A dog asleep against a wall, which is where every hutong dog is at two in the afternoon.
  function dog(x, z, ry) {
    const s = Math.sin(ry), c = Math.cos(ry);
    const coat = C('#c69a63'), coatD = C('#a67c4c');
    const put = (mesh, fw, up, side, sx, sy, sz, color, o = {}) =>
      B.shape(mesh, x + s * fw + c * side, up, z + c * fw - s * side,
        sx, sy, sz, color, { ry, ...o, tag: '狗' });
    // Sitting, not lying. Lying down it was a tan capsule with a stick beside it and the head
    // floated clear of the body; sitting up, the chest and the head stack vertically and the
    // silhouette says dog from any angle.
    put('ball', -.16, .21, 0, .19, .20, .20, coat, { gloss: .16 });          // haunches
    put('box', .06, .34, 0, .25, .46, .28, coat, { round: .09, gloss: .16 }); // chest
    put('ball', .09, .62, 0, .125, .125, .135, coat, { gloss: .16 });        // head
    put('ball', .21, .58, 0, .07, .055, .06, coatD, { gloss: .18 });         // muzzle
    put('ball', .265, .585, 0, .026, .024, .024, col.charcoal, { gloss: .34 });
    for (const t of [-1, 1]) {
      put('ball', .17, .655, t * .055, .028, .022, .025, col.charcoal, { gloss: .34 });
      put('box', .01, .72, t * .085, .06, .11, .05, coatD, { rz: t * .30, gloss: .16 });
      put('capsule', .17, .12, t * .085, .07, .26, .07, coat, { gloss: .16 });  // front legs
      put('ball', .21, .035, t * .085, .05, .035, .065, coatD, { gloss: .18 });
      put('ball', -.06, .06, t * .145, .07, .05, .11, coat, { gloss: .16 });    // hind feet
    }
    // tail curled round on the ground behind
    put('capsule', -.30, .07, .10, .05, .30, .05, coatD, { rz: Math.PI / 2 - .3, gloss: .16 });
    shade(x, z, 1.1, .7, .32);
    thing('狗', x, .55, z, '那只狗在墙边睡觉。', 'That dog is asleep by the wall.',
      '一只狗 — 只 again, the same measure word as for the cat.',
      { focus: [x, z - 1.3], reach: 2.0 });
  }

  // Washing on a line. Shirts get sleeves and trousers get legs: as plain rectangles the
  // whole line read as sheets of card pegged over the alley.
  //
  // `tag` is optional and only the alley's own line takes one: the garments are the only clothes
  // anywhere in the district, and 衣服 was a word the player could see fifty times a day from
  // their own doorstep and never once be told.
  function washing(x0, y, z, n, dz = 0, tag) {
    const kinds = [C('#e7e3d8'), C('#7f96a8'), col.cream, C('#a8695c'), C('#6f8f8c'),
                   C('#b9c2b0'), C('#8f7f9c')];
    // Everything this function makes gets collected as it is made, so `tick` can swing it from the
    // line it hangs on. A hutong is full of other people's washing and none of it ever moved, on a
    // street where the weather system has had a wind in it for months.
    const first = B.props.length;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * .78, cz = z + i * dz, cl = kinds[(i * 3 + 1) % kinds.length];
      const tilt = ((i * 7) % 5 - 2) * .04;
      const O = { mode: 7, gloss: G.fabric, ry: tilt, tag };
      // Everything hangs from `y`, not from somewhere below it. Slung 30 cm under the pegs
      // the wash floated, and from underneath the pegs read as confetti stuck to the sky.
      if (i % 3 === 1) {                                    // trousers, soft waist and two legs
        capsule(x, y - .10, cz, .045, .28, .018, cl,
          { ...O, rz: Math.PI / 2 + tilt });
        for (const t of [-1, 1]) {
          ball(x + t * .075, y - .37 - t * .018, cz, .085, .255, .020, cl,
            { ...O, rz: t * .055 });
          capsule(x + t * .075, y - .61 - t * .018, cz - .003, .018, .115, .012,
            C('#d6d0c5'), { ...O, rz: Math.PI / 2 + t * .08 });
        }
      } else if (i % 3 === 2) {                             // folded towel, scalloped and draped
        for (let q = -1; q <= 1; q++) {
          const qx = x + q * .105;
          ball(qx, y - .36 + (q === 0 ? .018 : -.018) - q * .012, cz + q * .012,
            .120, .345 - Math.abs(q) * .018, .028, cl,
            { ...O, ry:tilt + q * .035, rz:q * .045 });
          capsule(qx, y - .12, cz - .006, .012, .32, .010, C('#dad4c9'),
            { ...O, rz: Math.PI / 2 + q * .02 });
        }
        // Two short shadowed folds turn the broad cloth face and stop it reading as a card.
        // Unequal lengths and angles carry the drape into the deliberately crooked hem below.
        capsule(x - .070, y - .40, cz - .031, .010, .205, .007, tint(cl, .66, -.015),
          { ...O, rz:-.08 });
        capsule(x + .055, y - .43, cz - .033, .009, .165, .007, tint(cl, .72, -.010),
          { ...O, rz:.11 });
        for (const q of [-1, 0, 1])
          ball(x + q * .105, y - .68 - q * .018 + Math.abs(q) * .012,
            cz + q * .012, .105, .034, .026, cl, { ...O, rz:q * .05 });
      } else {                                              // shirt with rounded body and sleeves
        ball(x, y - .32, cz, .185, .255, .022, cl, O);
        capsule(x, y - .105, cz, .034, .30, .016, cl,
          { ...O, rz: Math.PI / 2 + tilt });
        for (const t of [-1, 1]) {
          capsule(x + t * .245, y - .28, cz, .046, .27, .018, cl,
            { ...O, rz: -t * .55 });
          ball(x + t * .315, y - .395, cz, .052, .065, .020, cl, O);
        }
        // short hanger and contrasting collar keep the silhouette legible without a broad slab
        capsule(x, y + .01, cz, .012, .14, .012, col.steel,
          { rz: -.9, gloss: .34, tag });
        capsule(x, y - .105, cz - .022, .010, .105, .010, C('#ddd8ce'),
          { rz: Math.PI / 2, gloss: G.fabric, tag });
      }
      for (const t of [-1, 1])                              // pegs, gripping the line itself
        box(x + t * .095, y + .015, cz, .032, .065, .04,
          [col.plastic, col.paintY, col.blue][(i + (t > 0 ? 1 : 0)) % 3],
          { hard: true, gloss: .34 });
    }
    // The whole line, with the height of the rail it swings from and a phase of its own, so two
    // lines on the same wall do not move as one sheet.
    const props = B.props.slice(first);
    for (const p of props) p.dynamic = true;
    wash.push({ props, m0: props.map(p => p.m), y, phase: wash.length * 1.7 });
  }

  // ---------------------------------------------------------------- the build
  // 地铁站 a subway entrance: a stair pit in the pavement with balustrades either side, a canopy
  // over the back of it, the line's roundel on the fascia and a station blade fixed to a rear
  // canopy column. The steps go down into shadow and that is all they need to do —
  // the station itself is a separate place.
  //
  // Every mouth on this street leads to the same room, so each one carries the name of the station
  // it comes out at. They share the word 地铁站 and therefore the verb, but not the tag: two things
  // with one tag and `pick` always hands back the first of them, so standing at the office
  // entrance would be told the hutong one was too far away.
  function metroMouth(cx, cz, station) {
    const tag = 'metro' + (++mouths);
    const T = { tag };
    // A real opening, not a dark decal inside a stone bathtub. The well is the only broad plane;
    // everything round it is a thin edge, a rail or a transparent panel. Eight separate treads
    // tighten into the shadow so the approach reads as a flight at player height without raising
    // an opaque stair block above the paving plane.
    flat(cx, .012, cz + .14, 1.88, 1.74, col.black, { gloss: .06, ...T });
    for (let i = 0; i < 8; i++) {
      const z = cz - .65 + i * .205 - i * i * .0045;
      box(cx, .018, z, 1.72 - i * .025, .012, .145,
        i < 3 ? col.kerb : col.stoneD, { hard:true, gloss:.14, ...T });
      box(cx, .029, z - .070, 1.76 - i * .025, .018, .026, col.kerb,
        { hard:true, gloss:.20, ...T });
    }

    // Segmented retaining toes, slim uprights and glass infill keep both sides visibly open. The
    // rail slopes down into the station; its posts shorten with it, so it cannot read as a pair of
    // metre-high masonry slabs flanking the mouth.
    const RZ = [-.59, -.10, .39, .86];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const z = cz + RZ[i], h = .76 - i * .075;
        box(cx + s * .97, .075, z, .11, .15, .40, col.stoneD,
          { hard:true, gloss:.18, ...T });
        capsule(cx + s * .97, .16 + h / 2, z, .026, h, .026, col.steelD,
          { gloss:G.metal, ...T });
        if (i < 3)
          box(cx + s * .97, .52 - i * .037, z + .245, .030, .50 - i * .035, .40,
            col.glassDay, { hard:true, mode:1, alpha:.34, gloss:G.glass, ...T });
      }
      capsule(cx + s * .97, .72, cz + .13, .032, 1.78, .032, col.steel,
        { rx:Math.PI / 2 + .13, gloss:G.metal, ...T });
    }
    // Only the corner shoes cross the front line. The 1.76 m centre stays physically and visually
    // open all the way to the tactile warning strip supplied by street-civic.js.
    for (const s of [-1, 1])
      box(cx + s * .92, .055, cz - .78, .20, .11, .18, col.kerb,
        { hard:true, gloss:.20, ...T });

    // A light cantilever canopy: two rear columns, three cross-members, longitudinal ribs and six
    // translucent polycarbonate leaves. There is no front post in the four-metre approach cone and
    // no roof slab; the structure and the sky remain legible through each other from below.
    for (const s of [-1, 1]) {
      box(cx + s * .97, 1.38, cz + .90, .080, 2.76, .080, col.steelD,
        { hard:true, gloss:G.metal, ...T });
      box(cx + s * .97, 2.73, cz + .31, .060, .075, 1.32, col.steelD,
        { hard:true, gloss:G.metal, rx:-.035, ...T });
      capsule(cx + s * .97, 2.30, cz + .72, .026, .78, .026, col.steelD,
        { rx:-.72, gloss:G.metal, ...T });
    }
    for (const dz of [-.31, .29, .89])
      box(cx, 2.75 + (dz + .31) * .035, cz + dz, 2.18, .070, .060, col.steelD,
        { hard:true, gloss:G.metal, ...T });
    for (let i = 0; i < 6; i++) {
      const x = cx - .875 + i * .35;
      box(x, 2.79, cz + .30, .22, .030, 1.28, col.glassDay,
        { hard:true, mode:1, alpha:.42, gloss:G.glass, rx:-.035, ...T });
      box(x - .175, 2.815, cz + .30, .020, .035, 1.31, col.steel,
        { hard:true, gloss:G.metal, rx:-.035, ...T });
    }

    // The portal is recessed behind the canopy nose. Doubled jambs and a shadowed inner lintel
    // make the depth explicit while leaving 1.48 m clear between the supports.
    for (const s of [-1, 1]) {
      box(cx + s * .82, 1.12, cz + .79, .085, 2.14, .11, col.steelD,
        { hard:true, gloss:G.metal, ...T });
      box(cx + s * .75, 1.10, cz + .91, .055, 2.02, .08, col.charcoal,
        { hard:true, gloss:.24, ...T });
    }
    box(cx, 2.18, cz + .79, 1.72, .10, .11, col.steelD,
      { hard:true, gloss:G.metal, ...T });
    box(cx, 2.07, cz + .91, 1.54, .065, .08, col.charcoal,
      { hard:true, gloss:.24, ...T });

    // A framed three-part fascia hangs from the front cross-member. Its narrow face carries the
    // universal word and a correctly oriented roundel; the station-specific board and exit plate
    // are fitted into the open slots by street-civic.js.
    box(cx - .18, 2.51, cz - .355, 1.22, .26, .035, col.blueSign,
      { hard:true, gloss:.26, ...T });
    for (const x of [cx - .79, cx + .43])
      box(x, 2.51, cz - .335, .035, .30, .080, col.steelD,
        { hard:true, gloss:G.metal, ...T });
    for (const g of B.glyphs(cx - .05, 2.51, cz - .382, Math.PI, '地铁站',
        { size:.165, gap:.045, color:col.white, mode:1, tag }))
      litten(g, .75);
    cyl(cx - .73, 2.51, cz - .392, .125, .025, col.white,
      { rx:Math.PI / 2, mode:1, gloss:.20, ...T });
    cyl(cx - .73, 2.51, cz - .420, .092, .020, col.blueSign,
      { rx:Math.PI / 2, mode:1, gloss:.20, ...T });
    for (const g of B.glyphs(cx - .73, 2.51, cz - .442, Math.PI, '地',
        { size:.115, gap:0, color:col.white, mode:1, tag }))
      litten(g, .45);

    // The station blade is fixed to a rear canopy column at both mouths. The old freestanding
    // 商务区 mast occupied the kerb-side approach and the 杨柳胡同 mast sat on the crossing camera's
    // first sightline; integrated brackets keep the same station-name cue without another pole.
    const bladeSide = station === '杨柳胡同' ? 1 : -1;
    const bladeX = cx + bladeSide * 1.10, bladeZ = cz + .82;
    for (const y of [1.36, 2.17])
      box(bladeX - bladeSide * .08, y, bladeZ, .18, .035, .045, col.steelD,
        { hard:true, gloss:G.metal, ...T });
    box(bladeX, 1.76, bladeZ - .035, .32, .92, .045, col.blueSign,
      { hard:true, gloss:.26, ...T });
    for (const g of B.glyphs(bladeX, 1.76, bladeZ - .065, Math.PI, station,
        { size:.125, gap:.028, vertical:true, color:col.white, mode:1, tag }))
      litten(g, .72);
    // Sized to the stair pit, not a metre wider than it on one side.
    //
    // This was `cx - 2.05, cx + 1.30` — asymmetric, and nothing in the mouth is. The visible well
    // is now 1.88 × 1.74 centred on (cx, cz + .14). At the former 商务区 datum (cx 38.70) the old
    // box ran x 36.65..40.00, so it started 0.85 m WEST OF THE KERB at RD1 = 37.5 — a metre of
    // carriageway blocked with no geometry in it — and then took all but the last metre of a 3.4 m
    // footway. Measured with clampMove at the 0.30 body radius, the far pavement had 0.00 m of
    // clear run from z -6 to -4 and again from z -14 to -9; two district agents reported the
    // footway severed and the mall's own label out of reach.
    //
    // The ground-contact parts finish at cx±1.025. A 2.06 m collider protects the complete toes
    // and columns without charging the footway for empty paving. Combined with the kerb-aligned
    // 商务区 datum and frontage-edge walk zone below, this preserves a measured 2.00 m continuous
    // building-side path; the former 2.32 m footprint left only 1.65 m in the playable realm.
    solid(cx - 1.03, cx + 1.03, cz - .80, cz + 1.12);
    shade(cx, cz + .18, 2.72, 2.30, .26);
    const th = thing('地铁站', cx, 2.92, cz - .60, '坐地铁比走路快。',
      'The subway is faster than walking.',
      '地铁 subway + 站 stop. Down the steps, buy a ticket, and go.',
      { tag, focus: [cx, cz - 1.85], reach: 2.4 });
    th.station = station;
    return th;
  }

  function build() {
    // ============================================================ ground
    // Hazy ground out to well past the point where fog has swallowed everything, so there is
    // never void under the horizon. It has to be a grid rather than one enormous quad: a
    // two-triangle plane 1600 m across has every vertex either behind the eye or beyond the
    // far plane, and the clipper emitted only one of the two triangles — which showed up as a
    // hard diagonal edge with the sky visible through the floor.
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++)
      flat(60 + (i - 4) * 130, -.03, 20 + (j - 4) * 130, 130.4, 130.4,
        col.hazeGround, { gloss: .04 });
    // The paving slab under the whole district. Mode 9 rules the joints between the big slabs;
    // the material is the stone inside them, at 1.3 m a repeat — which puts the sample's own
    // setts at about 14 cm, the size a real one is. At the half-metre it was first tried at they
    // came out at 7 cm and the whole footway shimmered into gravel the moment the camera moved.
    flat(-2, 0, 1.0, 78, 34, col.pave, { mode: 9, gloss: .16, ...PAVE });
    // pavement down the full length of the road, both sides; the alley's own slab only
    // reached a dozen metres either way and the footway ran out into bare ground
    flat(32.2, 0, 0, 18.4, 188, col.pave, { mode: 9, gloss: .16, ...PAVE });
    // The carriageway, in concrete grain rather than the asphalt sample — see the note on the
    // table above: Road007 carries painted lane markings, and this road already draws its own
    // in the right places twenty lines further down.
    flat((RD0 + RD1) / 2, .004, 0, RD1 - RD0, 188, col.asphalt,
      { mode: 10, gloss: .22, ...ROAD });
    // kerbs down both sides of the road
    for (const [x, s] of [[RD0, -1], [RD1, 1]]) {
      box(x + s * .07, .07, 0, .30, .19, 188, col.kerb,
        { hard: true, gloss: .20, ...CONCR });
      box(x + s * .30, .015, 0, .22, .05, 188, col.paveD, { hard: true, mode: 9, ...PAVE });
    }
    // lane dashes, the double centre line, and a zebra crossing at the alley mouth
    for (let z = -90; z < 90; z += 4.2) {
      if (Math.abs(z + .2) < 3.0) continue;
      flat(BE0, .008, z, .16, 2.3, col.paintW, { gloss: .10 });
    }
    for (const o of [-.10, .10])
      flat(ROAD_C + o, .008, 0, .12, 186, col.paintY, { gloss: .10 });
    for (let x = KW + .52; x < KE - .20; x += 1.18)
      flat(x, .009, -.2, .66, 4.6, col.paintW, { gloss: .10 });
    // Painted west cycle track, exactly the same 2.25 m band the road/cycle controllers publish.
    flat((BW0 + BW1) / 2, .006, 0, BW1 - BW0, 188, C('#6b5148'),
      { mode: 10, gloss: .18, ...ROAD });
    // What a road surface is actually made of: cast covers, gully grates at the kerb line, and
    // the darker rectangles where it has been dug up and made good. A six-lane carriageway of
    // unbroken asphalt with paint on it is the one thing a real road never is.
    const MANH = C('#4a4640'), GRATE = C('#33373a'), PATCH = C('#33352f');
    for (let i = 0; i < 7; i++) {
      const mz = -46 + i * 15.5 + (i % 3) * 2.4, mx = RD0 + 4.2 + (i % 2) * 3.6;
      cyl(mx, .009, mz, .38, .012, MANH, { hard: true, mode: 10, gloss: .30 });
      cyl(mx, .015, mz, .30, .010, C('#413d38'), { hard: true, gloss: .26 });
      for (let k = 0; k < 3; k++)
        box(mx, .021, mz - .18 + k * .18, .48, .006, .05, C('#35322d'),
          { hard: true, gloss: .22 });
    }
    for (let i = 0; i < 9; i++) {
      const gz = -50 + i * 12.5;
      if (Math.abs(gz) < 3.6) continue;                  // not through the crossing
      box(RD0 + .34, .010, gz, .34, .020, .74, GRATE, { hard: true, gloss: .34 });
      for (let k = 0; k < 5; k++)
        box(RD0 + .34, .022, gz - .28 + k * .14, .26, .008, .05, col.black, { hard: true });
    }
    for (let i = 0; i < 8; i++) {
      const pz = -44 + i * 13.1 + (i % 4) * 3.1;
      flat(RD0 + 3.0 + (i % 3) * 2.7, .010, pz, 1.5 + (i % 3) * .7, 2.2 + (i % 2) * 1.4,
        PATCH, { mode: 10, gloss: .20, mat: 'concrete', matScale: 2.10, matAmt: .14 });
    }
    // The west footway is the complete 2.00 m branch-street minimum, not a 2.00 m slab with a
    // bollard row removed from it. Scooter control belongs at the authored crossing/platform
    // edges in street-road.js, leaving this continuous building-to-kerb strip unobstructed.
    // drain channel down the middle of the alley, plus covers
    flat(0, .006, -1.62, 52, .34, col.paveD, { mode: 9, gloss: .26, ...PAVE });
    for (let x = -24; x < 24; x += 6.5) {
      box(x, .012, -1.62, .58, .03, .40, col.steelD, { hard: true, gloss: .34 });
      for (let i = 0; i < 5; i++)
        box(x - .2 + i * .1, .028, -1.62, .04, .02, .32, col.black, { hard: true });
    }

    // ============================================================ your block, north side
    const nbx = (NB.x0 + NB.x1) / 2, nbz = (NB.z0 + NB.z1) / 2;
    const nbw = NB.x1 - NB.x0, nbd = NB.z1 - NB.z0;
    // This is one address, but it is not one extrusion. Three construction phases meet at
    // narrow movement joints: the older west wing is set back, the stair tower steps forward
    // above its porch, and the east wing has its own roof line. From the alley those offsets cast
    // the long vertical shadows a real 28 m frontage needs; a texture cannot do that work.
    const homeWings = [
      { x0: NB.x0, x1: -3.25, face: NB.z1 - .24, top: NBH - .65,
        tone: tint(col.render, .98, .018) },
      { x0: -3.25, x1: 3.25, face: NB.z1 + .25, top: NBH + 1.00,
        tone: tint(col.render, 1.025, -.010), upper: true },
      { x0: 3.25, x1: NB.x1, face: NB.z1 - .36, top: NBH + .15,
        tone: tint(col.render, .955, -.018) },
    ];
    const wingAt = x => x < -3.25 ? homeWings[0] : x > 3.25 ? homeWings[2] : homeWings[1];
    for (const w of homeWings) {
      const ww = w.x1 - w.x0, wx = (w.x0 + w.x1) / 2;
      const bottom = w.upper ? FL : 0;
      box(wx, bottom + (w.top - bottom) / 2, (NB.z0 + w.face) / 2,
        ww, w.top - bottom, w.face - NB.z0, w.tone,
        { hard: true, mode: 14, gloss: G.paint, ...RENDER });
      // The projected stair wing still needs an honest ground-floor wall behind the vestibule.
      if (w.upper)
        box(wx, FL / 2, (NB.z0 + NB.z1) / 2, ww, FL, NB.z1 - NB.z0, col.render,
          { hard: true, mode: 14, gloss: G.paint, ...RENDER });

      const groundFace = w.upper ? NB.z1 : w.face;
      box(wx, .70, groundFace + .07, ww + .08, 1.40, .30, col.brick,
        { hard: true, mode: 11, gloss: G.matte, ...BRICK });
      box(wx, FL - .10, w.face + .06, ww + .10, .22, .12, col.band,
        { hard: true, gloss: G.paint });

      // A parapet is a perimeter, not another full-depth storey. Front and back runs plus short
      // returns keep the roof silhouette legible from the high camera without capping each wing
      // with another giant box.
      box(wx, w.top + .27, w.face - .02, ww + .14, .54, .28, col.renderD,
        { hard: true, gloss: G.paint });
      box(wx, w.top + .27, NB.z0 + .08, ww + .14, .54, .22, col.renderD,
        { hard: true, gloss: G.paint });
      for (const sx of [w.x0 + .08, w.x1 - .08])
        box(sx, w.top + .27, (NB.z0 + w.face) / 2, .22, .54, w.face - NB.z0,
          col.renderD, { hard: true, gloss: G.paint });
      box(wx, w.top + .58, w.face + .02, ww + .20, .08, .34, col.tileD,
        { hard: true, gloss: .20, ...RTILE });
    }
    // Recessed movement joints make the offsets read as deliberate wings rather than intersecting
    // primitives. They start above the shops, where the original construction would have split.
    for (const [x, z, h] of [[-3.25, NB.z1 + .27, NBH - .70], [3.25, NB.z1 + .27, NBH + .05]])
      box(x, FL + (h - FL) / 2, z, .16, h - FL, .16, col.charcoal,
        { hard: true, gloss: .12 });
    // The balconies stand almost a metre proud of the facade, so the camera has to stop clear of
    // them too or it ends up parked inside somebody's railing.
    // The apartment is the deepest shell in the street. The scene-level blocker wrapper gives it
    // the same full-radius contract as every other opaque Street mass, while this explicit marker
    // documents the original north-block regression and remains harmlessly idempotent.
    blocker(NB.x0, NB.x1, NB.z0, NB.z1 + 1.15, NBH, { orbit: true });
    solid(NB.x0 - .12, NB.x1 + .12, NB.z0, NB.z1 + .10);

    // Window grid. Bays stay on the original 3.4 m pitch so flat 202 and its interaction retain
    // their address, but each bay now has one job all the way up: window, balcony, or stair slot.
    // That vertical order is what was missing from the old floor-by-floor checkerboard.
    const bays = [];
    for (let bx = NB.x0 + 1.9; bx < NB.x1 - 1.2; bx += 3.42) bays.push(bx);
    // 406. Which bay is yours. Flat 202 is the deck-2 flat off the landing js/home-corridor.js
    // builds, so its street face is the bay next to the 单元门 — the nearest one that is not the
    // stairwell slot. This is a convention, not a measured correspondence: js/world.js's interior
    // (x, z) and this facade were never laid out against each other, and nothing in the flat can
    // see which pane the street picked.
    // Reduced without a seed, over the filtered list. Seeding with `bays[0]` was wrong and would
    // have gone unnoticed: bays[0] can itself be the stairwell bay, and being nearest the door is
    // exactly what wins the comparison, so the flag would have landed on the slot windows.
    const homeTowerBays = bays.filter(b => Math.abs(b - DOOR) >= 1.8);
    const homeTowerBx = homeTowerBays.length
      ? homeTowerBays.reduce((a, b) => Math.abs(b - DOOR) < Math.abs(a - DOOR) ? b : a)
      : null;
    for (let bi = 0; bi < bays.length; bi++) {
      const bx = bays[bi], wing = wingAt(bx), face = wing.face;
      // Three things decide a bay, and all three are new with the block's real height:
      //
      //   deck   f is the storey above the ground floor, so it stands on deck f + 1. Deck 12 is
      //          the roof — `js/home-roof.js` hangs washing up there — so the grid stops at 11.
      //   lod    why twelve storeys do not cost twice what six did. Above the third storey a
      //          baluster is under a pixel from anywhere you can stand on this street, so those
      //          bays keep the glazing and the balcony slab and drop the railing, the laundry
      //          and the AC box.
      //   warm   whether anybody is home behind the bay. Decks 2..11 are all furnished inside
      //          (js/home-corridor.js for 2, js/home-f3..f11 above it), so the whole grid is
      //          occupied and the variation is per flat rather than per storey. Hashed off the
      //          bay and the deck rather than pulled from `rnd()`, so adding six storeys does
      //          not reshuffle every later random decision in the district — see `jit` above.
      for (let f = 1; f < FLOORS; f++) {
        const deck = f + 1;
        if (deck > TOPDECK) continue;
        const y = f * FL + 1.55;
        const lod = f <= FACADE_LOD ? 0 : 1;
        const warm = .18 + jit(bx * 3.7, deck * 1.9) * .82;
        const isDoor = Math.abs(bx - DOOR) < 1.8;
        // Yours only on deck 2. The eleven storeys above are neighbours and keep their hash.
        const wo = (deck === 2 && bx === homeTowerBx && !isDoor)
          ? { warm, mine: true } : { warm };
        if (isDoor) {           // one aligned stair slot, lit by the 声控灯 behind
          fwin(DOOR, y, face, 1.02, 1.46, { frame: false, warm: .92 });
          for (const s of [-1, 1])
            box(DOOR + s * .66, y, face + .08, .10, 1.72, .18, col.band,
              { hard: true, gloss: G.paint });
          continue;
        }
        // Alternate vertical stacks. The open rail survives at distance; reducing its post count
        // is cheaper and more truthful than replacing it with the solid teal panel used before.
        if (bi % 2 === 1) {
          box(bx, y - .78, face + .43, 2.92, .10, .86, col.renderD,
            { hard: true, gloss: G.paint });
          for (const s of [-1, 1])
            box(bx + s * 1.41, y - .22, face + .40, .10, 1.42, .80, col.renderD,
              { hard: true, gloss: G.paint });
          box(bx, y - .67, face + .86, 2.90, .15, .06, col.railD,
            { hard: true, gloss: .30 });
          box(bx, y + .18, face + .87, 2.98, .065, .09, col.rail,
            { hard: true, gloss: .34 });
          const railStep = lod ? .60 : .30;
          for (let rx = -1.20; rx <= 1.201; rx += railStep)
            capsule(bx + rx, y - .27, face + .88, .021, .90, .021, col.rail,
              { gloss: .34 });
          if (lod === 0 && warm > .55)
            litten(ball(bx + .94, y + .58, face + .50, .05, .05, .05, C('#ffeec4'),
              { mode: 1, glow: .04 }), .85);
          fwin(bx - .76, y + .16, face, 1.24, 1.48, wo);
          fwin(bx + .76, y + .16, face, 1.24, 1.48, wo);
          if (lod === 0 && jit(bx, f * 5.3) > .45) for (let i = 0; i < 3; i++)  // laundry on rail
            box(bx - .6 + i * .6, y - .58, face + .91, .44, .70, .05,
              [col.white, col.blue, col.plastic, col.cream][(jit(bx + i * 2.1, f) * 4) | 0],
              { mode: 7, gloss: G.fabric, ry: (jit(bx, f + i) - .5) * .1 });
        } else {
          fwin(bx, y, face, 2.05, 1.50, wo);
          // Paired narrow piers hold the window stack together as a vertical bay.
          for (const s of [-1, 1])
            box(bx + s * 1.20, y, face + .06, .10, 1.78, .12, col.band,
              { hard: true, gloss: G.paint });
          if (lod === 0 && jit(bx * 1.7, f) > .35) acBox(bx + 1.35, y - 1.05, face);
        }
      }
      // Preserve the shell's established random stream: the former roof lottery consumed three
      // values per bay. Equipment is organised below, but later districts must not reshuffle.
      rnd(); rnd(); rnd();
    }
    // Roof plant is clustered into believable service zones rather than scattered above every bay.
    for (const tx of [-11.25, -9.85]) {
      cyl(tx, homeWings[0].top + .98, nbz + 3.9, .48, .90, col.steel, { gloss: .36 });
      box(tx, homeWings[0].top + .23, nbz + 3.9, .55, .46, .55, col.steelD,
        { hard: true, gloss: .28 });
      box(tx, homeWings[0].top + .50, nbz + 3.9, 1.15, .08, 1.15, col.steelD,
        { hard: true, gloss: .30 });
    }
    box(DOOR, homeWings[1].top + .92, nbz + 1.8, 3.10, 1.84, 2.60, col.renderD,
      { hard: true, mode: 14, gloss: G.paint, ...RENDER });
    box(DOOR, homeWings[1].top + 1.87, nbz + 1.8, 3.28, .08, 2.78, col.tileD,
      { hard: true, gloss: .20, ...RTILE });
    for (let i = 0; i < 8; i++)
      cyl(6.10 + i * .20, homeWings[2].top + .82, nbz + 2.0, .065, 1.28, col.steel,
        { rx: -.55, gloss: .40 });
    cyl(6.80, homeWings[2].top + 1.30, nbz + 1.35, .28, 1.15, col.white,
      { rz: Math.PI / 2, gloss: .30 });

    // Downpipes follow their own wing planes. Only two service bands cross each wing, replacing
    // the eleven full-width cables that made the frontage read like graph paper.
    for (const px of [NB.x0 + .35, -4.2, 4.0, NB.x1 - .35]) {
      const w = wingAt(px);
      capsule(px, w.top / 2, w.face + .11, .085, w.top, .085, col.renderD, { gloss: .26 });
    }
    for (const w of homeWings) for (const y of [FL + .34, FL * 6 + .34])
      capsule((w.x0 + w.x1) / 2, y, w.face + .10, .035, w.x1 - w.x0 - .35, .035, col.black,
        { rz: Math.PI / 2, gloss: .30 });

    // ---- the stairwell entrance you come out of
    const ez = NB.z1;
    // Separate brick jambs and a lintel reveal the wall between them. The former 3 m brick panel
    // was another rectangle pasted over the block and made the doorway look drawn on.
    for (const s of [-1, 1])
      box(DOOR + s * 1.22, 1.30, ez + .03, .56, 2.60, .26, col.brickL,
        { hard: true, mode: 11, gloss: G.matte, ...BRICK });
    box(DOOR, 2.50, ez + .03, 3.00, .28, .26, col.brickL,
      { hard: true, mode: 11, gloss: G.matte, ...BRICK });
    box(DOOR, 1.20, ez - .34, 1.98, 2.32, .70, C('#191c20'), { hard: true, gloss: .12 });
    // The flight, in forced perspective. That dark box is 70 cm deep but it is *inside* the
    // opaque ground-floor wall, so only the last centimetre of it clears the facade —
    // which is why the way into your own building read as a charcoal rectangle painted on the
    // brick. There is no carving a hole in a box, so the stairs are drawn the way the subway
    // steps are: nosings on a dark ground, each one narrower, higher and further back than the
    // last, climbing to the right. The 22 cm of reveal between the frame's jambs is the whole
    // stage, and the jambs and lintel close it on three sides for free.
    const STEPS = 7, TREAD = C('#6b675e'), RISER = C('#25282c');
    for (let i = 0; i < STEPS; i++) {
      // The rise compresses as it goes up and the treads narrow: both are what perspective does
      // to a real flight, and doing one without the other gave a ladder leaning on a wall.
      const ty = .15 + i * .195 - i * i * .012, tw = .62 - i * .039;
      const tcx = DOOR - .30 + i * .078, tz = ez + .205 - i * .022;
      box(tcx, ty, tz, tw * 2, .045, .05, TREAD, { hard: true, gloss: .18, tag: '楼' });
      box(tcx, ty - .09, tz - .012, tw * 2, .14, .04, RISER, { hard: true, gloss: .10, tag: '楼' });
    }
    // Handrail up the open side, 90 cm above the nosings and following the same line. Its angle is
    // the rise over the run *in the picture*, not in world z — the flight is only 15 cm deep, so a
    // rail with any real depth to it lay flat. The balusters land on treads 1, 3 and 5 rather than
    // on a spacing of their own, which is the only way they meet both the tread and the rail.
    capsule(DOOR - .065, 1.525, ez + .14, .020, 1.06, .020, col.steelD,
      { rz: -.459, gloss: G.metal, tag: '楼' });
    for (const i of [1, 3, 5])
      capsule(DOOR - .30 + i * .078, .15 + i * .195 - i * i * .012 + .45, ez + .14,
        .016, .90, .016, col.steelD, { gloss: G.metal, tag: '楼' });
    // The landing light at the top of the first flight, which is the only thing in there that
    // is ever lit. Deep enough in that it never competes with the porch bulb outside.
    litten(ball(DOOR + .42, 1.94, ez + .09, .050, .055, .050, C('#ffe0aa'),
      { mode: 1, glow: .06, tag: '楼' }), .55);
    // A compact wall hood protects the door without becoming another porch over HOME_OUT.
    // Its front edge is z=-2.51, 1.16 m behind the arrival point, and it is only as wide as the
    // stone portal in street-entry.js. Small wall corbels replace the old diagonal porch braces.
    box(DOOR, 2.82, ez + .22, 2.52, .18, .38, col.renderD, { hard: true, gloss: G.paint });
    box(DOOR, 2.94, ez + .22, 2.64, .06, .44, col.tileD,
      { hard: true, mode: 13, gloss: .2, ...RTILE });
    for (const s of [-1, 1])
      box(DOOR + s * .96, 2.63, ez + .16, .12, .34, .22, col.renderD,
        { hard: true, gloss: G.paint });
    // street-entry.js supplies the closed glazed leaves. The former folded security leaves have
    // gone: even against the jambs they projected as loose black slabs in the arrival frame.
    // reveal frame, so the opening reads as a hole in a wall and not a painted rectangle
    for (const s of [-1, 1])
      box(DOOR + s * 1.03, 1.20, ez + .14, .12, 2.36, .22, col.charcoal,
        { hard: true, gloss: .28 });
    box(DOOR, 2.42, ez + .14, 2.18, .12, .22, col.charcoal, { hard: true, gloss: .28 });
    // street-entry.js owns the address plate and one sensor lamp, avoiding two signs and two bulbs
    // stacked on the same lintel. The letterboxes remain flush on the west side of the door.
    box(DOOR - 2.30, 1.35, ez + .16, .82, 1.05, .14, col.steelD, { hard: true, gloss: .34 });
    // Eight identical blank doors read as a ventilation grille. Each one carries its flat number
    // and a slot, and three of them have not been emptied — which is the only thing that says
    // anybody lives behind them. The numbers are also the cheapest digit-reading practice on the
    // street, which is exactly why they have to be right: 202 is your own.
    //
    // They were 101..402, and two of those floors do not exist. Deck 1 is the lobby —
    // `js/home-lobby.js:1047` puts 大堂 on 一层 and 住户 on 二层至十一层 — so there is no 1xx flat
    // in this building, and the flat you live in is 202 on deck 2 (`js/home-corridor.js` builds
    // 201..206 on that landing). The bank shows the bottom two landings; the full one-door-per-flat
    // wall is the 信箱 inside the lobby.
    const FLATNO = ['201', '202', '203', '204', '205', '206', '301', '302'];
    for (let r = 0; r < 4; r++) for (let c = -1; c <= 1; c += 2) {
      const bx2 = DOOR - 2.30 + c * .19, by2 = .95 + r * .26, n = r * 2 + (c > 0 ? 1 : 0);
      box(bx2, by2, ez + .24, .34, .22, .02, col.charcoal, { hard: true, gloss: .3, tag: '楼' });
      box(bx2, by2 + .055, ez + .255, .20, .022, .01, C('#15181b'),
        { hard: true, gloss: .20, tag: '楼' });                                   // the slot
      B.glyphs(bx2 - .085, by2 - .045, ez + .256, 0, FLATNO[n],
        { size: .050, gap: .004, color: col.steel, gloss: .16, lift: .004, tag: '楼' });
      ball(bx2 + .13, by2 - .02, ez + .257, .015, .015, .008, col.steelD,
        { gloss: G.metal, tag: '楼' });                                           // the lock
      // Post left in the slot. Angled out and down, the way a letter that did not quite go in
      // sits; pushed straight out it read as a white tab, like a label on a filing drawer.
      if (n === 1 || n === 4 || n === 6) {
        box(bx2 + .02, by2 + .085, ez + .305, .24, .015, .13, col.cream,
          { hard: true, gloss: .10, rx: -.42, ry: .06, tag: '楼' });
        if (n === 4) capsule(bx2 - .06, by2 + .11, ez + .33, .028, .22, .028, C('#c6c0ae'),
          { rz: Math.PI / 2 - .30, gloss: .08, tag: '楼' });                      // a rolled paper
      }
    }
    // The red metre-high cabinet sat just 2.2 m down HOME_OUT's eastward sightline. A single paper
    // notice now lives flush on the entry's east jamb. Consume its former four jitter draws so
    // removing the cabinet does not reshuffle any later seeded street detail.
    for (let i = 0; i < 4; i++) rnd();
    thing('通知', DOOR + 1.34, 1.48, ez + .44, '门口的通知说明天停水。',
      'The notice by the door says the water is off tomorrow.',
      '通知 is a notice or an announcement — the noun and the verb are the same word.',
      { focus: [DOOR + 1.02, -1.72], reach: 2.0 });
    solid(DOOR - 2.9, DOOR + 2.9, ez - .1, ez + .42);
    // The way in. This used to sit at y 3.05 with a 2.6 m reach — three metres up the facade —
    // so going home meant pressing a wall above your own head. It stands at the door mouth now,
    // at the height of the handle, which is STREET.md problem 1 the other way round.
    thing('楼', DOOR, 1.55, ez + .34, '我住在这个楼里，二层。',
      'I live in this building, on the second floor.',
      '楼 is a building of more than one storey. Yours is 3号楼, and your flat is 202.',
      { focus: [DOOR, ez + 1.9], reach: 2.2 });
    // Your own balcony, from the outside. The vertical bay at x 2.50 on the first storey above the
    // shops is deck 2, and deck 2 is the
    // landing `js/home-corridor.js` builds and the flat you live in. Looking up at the washing on
    // your own rail from the alley is the cheapest proof the game can offer that the inside and
    // the outside of this building are the same building.
    thing('阳台', 2.50, 1.70, NB.z1 + 1.25, '二层那个阳台是我家的。',
      'That balcony on the second floor is mine.',
      '阳台 is a balcony. In Beijing it is glazed in and it is where the washing goes.',
      { focus: [2.50, NB.z1 + 2.6], reach: 2.6 });

    // ---- 超市 the corner shop, in the ground floor of the same block
    const SHOPDOOR = SHOP + 1.55;
    const SHOPGREEN = C('#2f6049'), SHOPGREEN_D = C('#1d4233'),
          SHOPCREAM = C('#f0e8d5');
    // A recessed dark shop interior, framed by individual piers and a head beam. The former white
    // 6.2 m rectangle covered the wall like a billboard; these pieces leave the building visible
    // between storefront and upper wing and give every opening a real return.
    box(SHOP - .55, 1.42, ez - .10, 5.22, 2.84, .12, col.charcoal,
      { hard: true, gloss: .22, tag: '超市' });
    for (const px of [SHOP - 2.92, SHOP + .82, SHOP + 2.34])
      box(px, 1.45, ez + .12, .28, 2.90, .36, SHOPGREEN_D,
        { hard: true, gloss: .28, tag: '超市' });
    box(SHOP - .30, 2.76, ez + .12, 5.52, .36, .36, SHOPGREEN_D,
      { hard: true, gloss: .28, tag: '超市' });
    // Three display windows now end at the entrance jamb instead of running 40 cm behind the
    // door. That small overlap was why the double doors never separated from the glass wall.
    const shopWindowOffsets = [-2.15, -.95, .25];
    for (const gx of shopWindowOffsets)
      pane(box(SHOP + gx, 1.42, ez + .27, 1.05, 2.30, .04, col.glassDay,
        { hard: true, mode: 1, gloss: G.glass, tag: '超市' }), .96);
    for (const gx of [-2.72, -1.56, -.36, .82])
      box(SHOP + gx, 1.35, ez + .29, .075, 2.42, .07, SHOPGREEN,
        { hard: true, gloss: G.metal });
    box(SHOP - .95, 2.62, ez + .30, 3.54, .10, .07, SHOPGREEN,
      { hard: true, gloss: G.metal });
    // A9 · the transom. Every pane in the district was one sheet of glass between two mullions;
    // a real shopfront divides the head off as a fanlight and puts a bar up the middle of it. The
    // display run only — 4.00 m centred on SHOP - .70, which is the stallriser's own span, so the
    // bar stops clear of the door reveal at 8.42 instead of running through it the way the head
    // rail above does. Steel, 7 cm, and no new panes: the glass behind is the glass that was here.
    box(SHOP - .95, 2.16, ez + .30, 3.54, .07, .07, SHOPGREEN,
      { hard: true, gloss: G.metal });
    for (const gx of shopWindowOffsets)
      box(SHOP + gx, 2.37, ez + .30, .06, .38, .07, SHOPGREEN,
        { hard: true, gloss: G.metal });
    // Stallriser, head and two end returns, closing the new cavity. Without them the glass stood
    // 18 cm off the wall with daylight round all four edges of it: from a low camera the paving ran
    // on under the shopfront into a void, and from either side you looked straight along the
    // recess. These four boxes are what every real shopfront has round its window for exactly the
    // same reason.
    box(SHOP - .95, .135, ez + .17, 3.54, .27, .22, SHOPGREEN_D,
      { hard: true, gloss: .28 });
    box(SHOP - .95, 2.66, ez + .17, 3.54, .20, .22, SHOPGREEN_D,
      { hard: true, gloss: .28 });
    // What is in the cavity: three tiers of shelving with stock on them. This window is the one
    // place in the district where the player can see what a 超市 sells without going in, so the
    // goods are the kinds of thing whose silhouette says what it is from two metres away —
    // cartons, cup noodles, bottles — and not tiny labelled packets that would be mush.
    const STOCK = [C('#c4452f'), C('#2f6f9c'), C('#d8a92f'), C('#3f7f5c'),
                   C('#b8622f'), C('#8a5a9c')];
    for (let w = 0; w < 3; w++) {
      const gx = SHOP + shopWindowOffsets[w];
      for (const s of [-1, 1])
        box(gx + s * .53, 1.25, ez + .15, .04, 1.90, .14, col.steelD,
          { hard: true, gloss: .34, tag: '超市' });
      for (let t = 0; t < 3; t++) {
        const sy = .62 + t * .66;
        box(gx, sy, ez + .16, 1.02, .028, .15, col.steel, { hard: true, gloss: .40, tag: '超市' });
        // The yellow price rail along the front edge of each shelf. It is the single detail that
        // turns a shelf into a shop shelf, and it is also the only part of this that survives
        // being seen through glass at a grazing angle.
        box(gx, sy + .048, ez + .235, .98, .055, .012, col.paintY,
          { hard: true, gloss: .18, tag: '超市' });
        // One kind of goods per tier, chosen by index and never by `rnd()`: a call to the build's
        // random stream here would shift every later decision in the district, down to which of
        // the parade's units have their shutters down.
        for (let i = 0; i < 4; i++) {
          const ix = gx - .36 + i * .24, c = STOCK[(w * 5 + t * 2 + i) % STOCK.length];
          if (t === 0) {                                    // cartons stood on end
            box(ix, sy + .175, ez + .15, .175, .30, .11, c,
              { hard: true, gloss: .20, tag: '超市' });
            box(ix, sy + .288, ez + .145, .14, .05, .10, col.cream,
              { hard: true, gloss: .18, tag: '超市' });
          } else if (t === 1) {
            // Cup noodles, lids on. `rx: Math.PI` because the taper mesh is wide at its base and
            // narrows upward — right for a lampshade or a plant pot, upside down for a cup, which
            // came out as a funnel standing on its spout.
            taper(ix, sy + .095, ez + .15, .165, .17, .165, c,
              { rx: Math.PI, gloss: .24, tag: '超市' });
            cyl(ix, sy + .188, ez + .15, .090, .015, col.cream, { gloss: .20, tag: '超市' });
          } else {                                          // bottles
            cyl(ix, sy + .12, ez + .15, .048, .22, c, { gloss: .52, tag: '超市' });
            cyl(ix, sy + .247, ez + .15, .026, .04, col.cream, { gloss: .40, tag: '超市' });
          }
        }
      }
    }
    signBoard(SHOP - .15, FASCIA, ez + .02, 5.35, FASCIAH,
      SHOPGREEN_D, SHOPCREAM, '幸福超市');
    // A compact glass-and-metal hood marks only the entrance. It projects 76 cm rather than the
    // old full-frontage 1.39 m awning, keeping the upper home bays open in the HOME_OUT camera.
    box(SHOPDOOR, 2.91, ez + .37, 1.66, .075, .76, C('#aab9b2'),
      { hard: true, mode: 18, alpha: .42, gloss: .72, rx: -.10, tag: '超市' });
    box(SHOPDOOR, 2.86, ez + .73, 1.72, .08, .06, SHOPGREEN_D,
      { hard: true, gloss: .30, tag: '超市' });

    // A dedicated double glass door. Green powder-coated aluminium and cream wayfinding make the
    // modern convenience store unmistakable beside the noodle shop's timber and oxblood paint.
    box(SHOPDOOR, 1.40, ez + .32, 1.46, 2.60, .18, col.charcoal,
      { hard: true, gloss: .30, tag: '超市' });
    box(SHOPDOOR, 2.51, ez + .43, 1.28, .28, .07, SHOPGREEN,
      { hard: true, gloss: .28, tag: '超市' });
    for (const s of [-1, 1]) {
      pane(box(SHOPDOOR + s * .30, 1.35, ez + .43, .54, 1.98, .045, col.glassDay,
        { hard: true, mode: 1, gloss: G.glass, tag: '超市' }), .98);
      box(SHOPDOOR + s * .59, 1.35, ez + .47, .075, 2.05, .055, SHOPGREEN,
        { hard: true, gloss: .28, tag: '超市' });
      capsule(SHOPDOOR + s * .14, 1.34, ez + .51, .026, .48, .026, col.goldL,
        { gloss: G.metal, tag: '超市' });
    }
    box(SHOPDOOR, 1.35, ez + .49, .075, 2.04, .055, SHOPGREEN,
      { hard: true, gloss: .28, tag: '超市' });
    box(SHOPDOOR, 2.78, ez + .49, 1.20, .36, .07, SHOPGREEN_D,
      { hard: true, gloss: .28, tag: '超市' });
    B.glyphs(SHOPDOOR, 2.78, ez + .54, 0, '入口',
      { size: .25, gap: .12, color: SHOPCREAM, mode: 1, glow: .14, lift: .008, tag: '超市' });
    litten(ball(SHOPDOOR + .82, 2.69, ez + .58, .065, .075, .055, C('#ffe4a8'),
      { mode: 1, glow: .20, tag: '超市' }), .9);
    // The bulb over the 超市 door. Its own emissive ball is 6 cm across and lights nothing;
    // this is what puts the crates, the water tray and whoever is buying from them into the
    // light the shop is actually spilling onto its own pavement.
    B.light(SHOPDOOR + .60, 2.50, ez + .95, [1.0, .86, .64], .48, 4.2);
    box(SHOPDOOR, .026, ez + .83, 1.34, .035, .62, SHOPGREEN_D,
      { hard: true, gloss: .14, tag: '超市' });
    for (let i = -5; i <= 5; i++)
      box(SHOPDOOR + i * .105, .049, ez + .83, .025, .012, .52, SHOPGREEN,
        { hard: true, gloss: .18, tag: '超市' });

    // A single recessed produce rack replaces loose pavement crates. The same stock and random
    // calls remain, but the shop now keeps its threshold and pedestrian line clear.
    box(SHOP - 1.32, .36, ez + .02, 2.74, .64, .28, SHOPGREEN_D,
      { hard: true, gloss: .28, tag: '超市' });
    box(SHOP - 1.32, .68, ez + .03, 2.82, .055, .30, col.steel,
      { hard: true, gloss: .36, tag: '超市' });
    for (let i = 0; i < 3; i++) {
      const cx = SHOP - 2.15 + i * .82, h = .20 + (i % 2) * .08;
      box(cx, .48, ez + .12, .72, h, .22, pick([col.plastic, col.blue, col.teal]),
        { hard: true, gloss: .30, tag: '超市' });
      for (let k = 0; k < 6; k++)
        ball(cx - .22 + (k % 3) * .22, .62 + ((k / 3) | 0) * .09,
          ez + .12 + ((k / 3) | 0) * .07, .10, .075, .10,
          pick([col.green, col.plastic, col.paintY, col.greenL]),
          { gloss: .26, tag: '超市' });
    }
    // The water. This was a single blue cube 1.1 m tall, which taught nothing and — since the
    // service door upstairs was added after it — stood squarely across the right-hand half of
    // that door, so the shop owner went home through a crate of mineral water. It is a tray of
    // bottles now, at the other end of the frontage where there is nothing behind it, because
    // eight bottles you can count is the whole point: 瓶 is a measure word and a measure word
    // needs something to measure.
    const WTX = SHOP + .05, WTZ = ez + .08;
    box(WTX, .05, WTZ, .84, .10, .28, col.blue, { hard: true, gloss: .34, tag: '瓶' });
    for (let i = 0; i < 4; i++) for (const r of [-.07, .07]) {
      const bx2 = WTX - .315 + i * .21;
      cyl(bx2, .26, WTZ + r, .045, .32, C('#a8c4cf'), { gloss: .62, tag: '瓶' });
      cyl(bx2, .175, WTZ + r, .047, .09, C('#7fa8b8'), { gloss: .58, tag: '瓶' });  // the label
      cyl(bx2, .435, WTZ + r, .026, .05, col.blue, { gloss: .44, tag: '瓶' });      // the cap
    }
    // Two off the next layer, laid on their sides across the top, which is what the last of a
    // pack looks like once anybody has bought from it.
    for (const [ox, oz] of [[-.20, .00], [.16, -.02]])
      capsule(WTX + ox, .50, WTZ + oz, .045, .30, .045, C('#a8c4cf'),
        { rz: Math.PI / 2, ry: oz * 6, gloss: .62, tag: '瓶' });
    // The price card leans against the end of the tray. No roll on it: `glyphs` cannot be rolled,
    // only yawed, so a tilted card would have had level writing on it. And the writing goes in
    // front of the card in +z, because the alley is south of this wall and lower z is further away
    // — behind it, the card ate the price.
    box(WTX + .48, .30, WTZ - .06, .22, .30, .015, col.cream,
      { hard: true, gloss: .12, tag: '瓶' });
    B.glyphs(WTX + .48, .34, WTZ - .04, 0, '两块',
      { size: .085, gap: .012, color: col.redD, gloss: .08, lift: .006, tag: '瓶' });
    shade(WTX, WTZ, 1.2, .7, .28);
    thing('瓶', WTX, .70, WTZ, '一瓶水两块钱。', 'A bottle of water is two kuai.',
      '瓶 is the measure word for bottles: 一瓶水, 两瓶啤酒.',
      { focus: [WTX, ez + 1.55], reach: 2.0 });
    // A separate service door to the flat above the shop. The owner no longer disappears into
    // a sheet of shop glass at closing time; this narrow blue entrance is his route upstairs.
    const SHOPHOME = homes.shop.outside[0];
    box(SHOPHOME, 1.34, ez + .34, 1.02, 2.48, .16, col.charcoal,
      { hard: true, gloss: .28 });
    box(SHOPHOME, 1.30, ez + .45, .84, 2.30, .08, col.blueSign,
      { hard: true, gloss: .30 });
    box(SHOPHOME, 2.31, ez + .50, .70, .16, .03, col.glassDark,
      { hard: true, mode: 1, gloss: .45 });
    ball(SHOPHOME - .27, 1.24, ez + .50, .045, .045, .025, col.gold,
      { gloss: G.metal });
    box(SHOPHOME, 2.72, ez + .42, 1.06, .32, .08, col.blueSign,
      { hard: true, gloss: .30 });
    B.glyphs(SHOPHOME, 2.72, ez + .47, 0, '楼上',
      { size: .20, gap: .08, color: col.white, mode: 1, lift: .008 });
    litten(ball(SHOPHOME + .62, 2.48, ez + .48, .065, .075, .055, C('#ffe2a0'),
      { mode: 1, glow: .20 }), .85);
    B.light(SHOPHOME + .45, 2.32, ez + .82, [1.0, .85, .62], .34, 3.0);
    solid(SHOP - 3.2, SHOP + 3.6, ez - .1, ez + 1.35);
    shade(SHOP, ez + .95, 7.0, 1.8, .30);
    thing('超市', SHOPDOOR, 3.08, ez + .48, '超市就在楼下，七点开门。',
      'The supermarket is right downstairs. It opens at seven.',
      '超市 chāoshì — literally "super market". A 小卖部 is the smaller kind.',
      { focus: [SHOPDOOR, ez + 1.65], reach: 2.5 });

    // ---- 老李面馆 the noodle place, the other side of the stairwell from the shop. You can
    // walk into this one, so the frontage has to read as an entrance and not a picture of one:
    // a door you can see through at the near end, and the room beyond it lit from inside.
    const RST = -7.0;
    const NOODLEWOOD = C('#68452f'), NOODLEWOOD_D = C('#3d2a20'),
          NOODLEOX = C('#812f25'), NOODLESTONE = C('#514b43');
    // Old tile and dark timber make a shop assembled from piers, sill and head — not a second
    // five-metre render rectangle. The warm backing is set behind the glazing, giving the counter
    // and bowls a room to occupy instead of floating on the wall plane.
    box(RST - .10, 1.43, ez - .12, 4.72, 2.86, .12, C('#31251f'),
      { hard: true, gloss: .18, tag: '餐馆' });
    for (const px of [RST - 2.42, RST + .56, RST + 2.42])
      box(px, 1.48, ez + .12, .34, 2.96, .36, NOODLEWOOD_D,
        { hard: true, gloss: G.wood, tag: '餐馆' });
    box(RST, 2.77, ez + .12, 5.00, .38, .36, NOODLEWOOD_D,
      { hard: true, gloss: G.wood, tag: '餐馆' });
    // The tiled stallriser belongs only under the window run; the doorway meets a separate stone
    // threshold below. That break is small, but it is what makes the door an opening.
    box(RST - .85, .40, ez + .19, 2.82, .80, .14, col.tileL,
      { hard: true, gloss: .32, ...WTILE });
    // No white backing behind the glass: pane() already gives it the sky by day and a lit room
    // by night, and an emissive white sheet on top of that turned both windows into glare.
    // Window head at 2.66, which is 超市's head (its own head rail is at 2.56..2.76) and its door
    // transom. Sill unchanged at 0.75, on the tiled stallriser. Two shopfronts on one wall whose
    // openings stopped 30 cm apart was the other half of what made this row read as scattered:
    // the eye lines up the tops of holes in a wall long before it reads what is written above
    // them. The mullions run 9 cm below the sill and 3 cm past the head, as they did.
    for (const gx of [-1.55, -.15])
      pane(box(RST + gx, 1.705, ez + .25, 1.28, 1.91, .05, col.glassDay,
        { hard: true, mode: 1, gloss: G.glass, tag: '餐馆' }), .97);
    for (const mx of [-2.22, -.88, .52])
      box(RST + mx, 1.675, ez + .28, .09, 2.03, .10, NOODLEWOOD,
        { hard: true, gloss: G.wood });
    // A9 · the transom, on the same steel as the mullions and stopping on the outer two of them
    // (RST-2.22 .. RST+.52, so 2.83 m centred on RST-.85). 2.28 divides a 1.91 m sheet into a
    // 1.53 m light and a 35 cm fanlight, and the fanlight gets a bar up the middle of each bay.
    // No new panes: the glass is the glass that was already here, and this is joinery over it.
    box(RST - .85, 2.28, ez + .28, 2.83, .07, .10, NOODLEWOOD,
      { hard: true, gloss: G.wood });
    for (const gx of [-1.55, -.15])
      box(RST + gx, 2.485, ez + .28, .06, .35, .10, NOODLEWOOD,
        { hard: true, gloss: G.wood });
    // A compact timber counter and bowls sit behind the glass. Their depth and repeated round
    // silhouettes make this read as a working noodle room before the painted words are legible.
    box(RST - 1.55, .93, ez + .02, 1.16, .82, .34, NOODLEWOOD,
      { hard: true, gloss: G.wood, tag: '餐馆' });
    box(RST - 1.55, 1.36, ez + .05, 1.24, .08, .40, C('#b08b63'),
      { hard: true, gloss: .22, tag: '餐馆' });
    for (let i = 0; i < 3; i++) {
      taper(RST - 1.90 + i * .35, 1.46, ez + .14, .15, .12, .15, col.cream,
        { rx: Math.PI, gloss: .22, tag: '餐馆' });
      capsule(RST - 1.90 + i * .35, 1.55, ez + .14, .012, .26, .012, col.steelD,
        { rz: Math.PI / 2, gloss: G.metal, tag: '餐馆' });
    }
    // the doorway itself, at the +x end, standing open behind its strip curtain. A deep dark
    // reveal and red jambs separate it from the windows; the warm interior is set farther back
    // so the curtain now reads as something you can walk through instead of an opaque panel.
    const RSTDOOR = RST + 1.55;
    box(RSTDOOR, 1.44, ez + .22, 1.30, 2.42, .16, col.charcoal,
      { hard: true, gloss: .28, tag: '餐馆' });
    litten(box(RSTDOOR, 1.34, ez + .36, 1.04, 2.02, .04, C('#76543a'),
      { hard: true, mode: 1, glow: .04, tag: '餐馆' }), 1.5);
    for (const s of [-1, 1])
      box(RSTDOOR + s * .59, 1.42, ez + .43, .11, 2.36, .12, NOODLEOX,
        { hard: true, gloss: .24, tag: '餐馆' });
    // Seven calls preserve the former strip curtain's RNG footprint. The entrance is now an open,
    // glazed timber leaf rather than a translucent plastic wall across a professional frontage.
    for (let i = 0; i < 7; i++) rnd();
    box(RSTDOOR, 2.72, ez + .46, 1.26, .38, .08, NOODLEOX,
      { hard: true, gloss: .28, tag: '餐馆' });
    B.glyphs(RSTDOOR, 2.72, ez + .51, 0, '入口',
      { size: .25, gap: .12, color: col.goldL, mode: 1, glow: .14, lift: .008, tag: '餐馆' });
    // One glazed door leaf folded against the right jamb supplies a silhouette and a handle.
    pane(box(RSTDOOR + .70, 1.36, ez + .67, .48, 2.08, .035, col.glassDay,
      { hard: true, mode: 1, ry: -.72, gloss: G.glass, tag: '餐馆' }), .98);
    box(RSTDOOR + .70, 2.38, ez + .67, .52, .08, .06, NOODLEWOOD,
      { hard: true, ry: -.72, gloss: G.wood, tag: '餐馆' });
    box(RSTDOOR + .70, .34, ez + .67, .52, .08, .06, NOODLEWOOD,
      { hard: true, ry: -.72, gloss: G.wood, tag: '餐馆' });
    capsule(RSTDOOR + .57, 1.35, ez + .82, .028, .42, .028, col.goldL,
      { ry: -.72, gloss: G.metal, tag: '餐馆' });
    box(RSTDOOR, .035, ez + .78, 1.28, .06, .48, NOODLESTONE,
      { hard: true, mode: 9, gloss: .16, tag: '餐馆' });
    box(RSTDOOR, .070, ez + .98, 1.18, .025, .05, col.goldL,
      { hard: true, gloss: .28, tag: '餐馆' });
    // A short traditional canvas shade covers the dining window only. Five narrow panels and a
    // timber front rail give it depth without masking the upper home facade in the close view.
    for (let i = 0; i < 5; i++)
      box(RST - .85 + (i - 2) * .55, 2.91, ez + .45, .55, .075, .78,
        i % 2 ? col.cream : NOODLEOX,
        { hard: true, rx: -.18, gloss: .22, tag: '餐馆' });
    box(RST - .85, 2.72, ez + .83, 2.82, .16, .07, NOODLEWOOD_D,
      { hard: true, gloss: G.wood, tag: '餐馆' });
    signBoard(RST, FASCIA, ez + .04, 4.60, FASCIAH, NOODLEOX, col.goldL, '老李面馆');
    // 面 painted big on the glass, a red lantern at the door, and the menu case beside it
    glyphs(RST - .85, 1.62, ez + .31, 0, '牛肉面',
      { size: .34, gap: .14, color: col.redD, mode: 1, alpha: .9 });
    miniLantern(RST + 2.45, 2.48, ez + .42, col.red);
    box(RST + 2.42, 1.52, ez + .20, .56, .84, .09, col.charcoal, { hard: true, gloss: .30 });
    litten(box(RST + 2.42, 1.52, ez + .26, .48, .74, .02, col.cream,
      { hard: true, mode: 1, glow: .12, tag: '餐馆' }), .7);
    for (let i = 0; i < 5; i++)
      box(RST + 2.42, 1.80 - i * .15, ez + .275, .38, .05, .01, col.charcoal,
        { hard: true, mode: 1, tag: '餐馆' });
    // A wall-hugging waiting bench keeps the summer cue without turning the corridor into dining
    // furniture. It stays entirely inside the shop's existing solid strip.
    box(RST - 1.72, .46, ez + .30, 1.46, .10, .28, NOODLEWOOD,
      { hard: true, gloss: G.wood, tag: '餐馆' });
    for (const s of [-1, 1])
      capsule(RST - 1.72 + s * .54, .23, ez + .29, .022, .46, .022, col.steelD,
        { gloss: G.metal, tag: '餐馆' });
    // Compact extraction on the east pier, below both the fascia and street-retail's blade sign.
    box(RST + 2.36, 2.08, ez + .26, .34, .34, .26, col.steelD,
      { hard: true, gloss: G.metal });
    cyl(RST + 2.36, 2.08, ez + .42, .125, .12, col.steel,
      { rx: Math.PI / 2, gloss: G.metal });
    solid(RST - 2.6, RST + 3.2, ez - .1, ez + .52);
    shade(RST, ez + .60, 5.6, 1.2, .28);
    thing('餐馆', RST + 1.55, 2.58, ez + .40, '这家面馆的牛肉面很好吃。',
      'The beef noodles at this noodle shop are very good.',
      '餐 meal + 馆 establishment. A 面馆 is a noodle shop specifically.',
      { focus: [RST + 1.55, ez + 1.55], reach: 2.4 });

    // ============================================================ courtyards, south side
    brickRun(AX0, -14.0, CWZ, CW);
    brickRun(-11.2, -1.2, CWZ, CW);
    // Broken at x 3.2–6.0: that is the mouth of the night-market lane, and a gateway with the
    // courtyard wall still run across it is a gateway you can read and cannot walk through.
    // The piers and the lintel are built with the rest of the market entrance further down.
    brickRun(1.6, 3.2, CWZ, CW);
    brickRun(6.0, 12.4, CWZ, CW);
    // Stop at the road-zone face. The former x=24.00 end projected 58 cm into the authored
    // two-metre west footway and reduced its r=.45 camera/body section to 1.43 m at this corner.
    brickRun(15.2, 23.40, CWZ, CW);
    gateHouse(-12.6, { name:'陈家', number:'12', door:C('#8b3f31'), plaque:col.blueSign,
      detail:'commuter' });
    gateHouse(.2, { name:'王家', number:'14', door:col.red, plaque:col.redD,
      detail:'flowers', tag:true });
    gateHouse(13.8, { name:'豆豆家', number:'16', door:C('#87513c'), plaque:col.teal,
      detail:'child' });
    // These are four properties, not one roof kit stamped four times. Every long front and rear
    // range is split at a real movement joint into an older hall and a later ear room. The
    // different ridge heights, depths and side-wing offsets remain legible above the street wall;
    // below them, bay-sized masonry, gable returns and courtyard-facing openings replace the four
    // 9–12 m blank slabs the live geometry probe found at z 7.75 / 11.55.
    const yards = [
      { cx:-19.5, len:12.0, tone:tint(col.brick, .82, -.006), tree:[.55,5.35],
        front:[[.42,2.46,.78,-.10],[.58,2.70,.92,.08]],
        rear: [[.62,3.12,1.02,.10],[.38,2.66,.76,-.06]],
        sides:[[-1,3.20,2.42,.72,-.18],[1,3.78,2.64,.88,.22]] },
      { cx:-6.5, len:11.0, tone:tint(col.brick, .94, .008), tree:[-1.25,5.75],
        front:[[.55,2.82,1.02,.06],[.45,2.54,.76,-.08]],
        rear: [[.36,2.82,.82,-.12],[.64,3.26,1.14,.08]],
        sides:[[-1,3.72,2.72,.90,.18],[1,3.28,2.46,.70,-.20]] },
      { cx:7.0, len:10.0, tone:tint(col.brick, .89, -.012), tree:[.75,5.45],
        front:[[.34,2.48,.70,-.14],[.66,2.76,.94,.10]],
        rear: [[.53,3.22,1.12,.04],[.47,3.02,.86,-.10]],
        sides:[[-1,3.10,2.40,.68,-.26],[1,3.88,2.74,.96,.16]] },
      { cx:19.5, len:9.0, tone:tint(col.brick, .98, .014), tree:[-1.0,5.80],
        front:[[.61,2.44,.74,.08],[.39,2.72,.88,-.12]],
        rear: [[.68,2.92,.90,-.08],[.32,3.38,1.18,.14]],
        sides:[[-1,3.82,2.62,.84,.24],[1,3.06,2.36,.66,-.22]] },
    ];
    const splitRange = (cx, total, parts, gap = .18) => {
      const usable = total - gap * (parts.length - 1), out = [];
      let left = cx - total / 2;
      for (const p of parts) {
        const w = usable * p[0];
        out.push({ x:left + w / 2, w, base:p[1], rise:p[2], dz:p[3] });
        left += w + gap;
      }
      return out;
    };
    const rangeShell = (yard, role, zc, total, span, parts, faceN) => {
      const segs = splitRange(yard.cx, total, parts);
      // The cx=7 front range straddles the authored 3.2..6.0 night-market mouth. Keep its roof as a
      // believable covered passage, but subtract that aperture from both masonry elevations, their
      // shoes and any internal phase return. Every other courtyard range follows the original path.
      const passage = role === 'front' && yard.cx === 7.0 ? [3.2, 6.0] : null;
      const wallPieces = (cx, w) => {
        if (!passage) return [[cx, w]];
        const lo = cx - w / 2, hi = cx + w / 2, out = [];
        if (lo < passage[0]) {
          const r = Math.min(hi, passage[0]);
          if (r - lo > .04) out.push([(lo + r) / 2, r - lo]);
        }
        if (hi > passage[1]) {
          const l = Math.max(lo, passage[1]);
          if (hi - l > .04) out.push([(l + hi) / 2, hi - l]);
        }
        return out;
      };
      for (let si = 0; si < segs.length; si++) {
        const q = segs[si], rz = zc + q.dz;
        tileRoof(q.x, rz, q.w, span, q.base, q.rise);
        const bays = Math.max(2, Math.ceil(q.w / 2.55));
        const bw = q.w / bays;
        // Both long elevations are assembled in address-sized bays. Eight-centimetre recessed
        // joints and alternating brick values create depth without punching extra colliders into
        // a courtyard the player never enters.
        for (let bi = 0; bi < bays; bi++) {
          const bx = q.x - q.w / 2 + bw * (bi + .5);
          const bt = tint(yard.tone, .96 + ((bi + si) % 3) * .035,
            ((bi + si) % 2 ? .006 : -.006));
          for (const [pc, pw] of wallPieces(bx, bw - .08))
            for (const n of [-1, 1])
              box(pc, q.base / 2, rz + n * (span / 2 - .16), pw, q.base, .28, bt,
                { hard:true, mode:11, gloss:G.matte, ...BRICK });
          // A short stone shoe under each bay, never a continuous pasted-on plinth.
          for (const [pc, pw] of wallPieces(bx, bw - .16))
            box(pc, .17, rz + faceN * (span / 2 + .015), pw, .34, .12, col.stoneD,
              { hard:true, gloss:.20 });
        }
        for (const s of [-1, 1]) {
          const ex = q.x + s * (q.w / 2 - .14);
          if (passage && ex > passage[0] && ex < passage[1]) continue;
          box(ex, q.base / 2, rz, .28, q.base, span - .32, yard.tone,
            { hard:true, mode:11, gloss:G.matte, ...BRICK });
        }

        // The courtyard side has a door in the larger phase and a paired timber window in the
        // ear room. Warmth is explicit rather than random, preserving the scene RNG stream.
        const fz = rz + faceN * (span / 2 + .025);
        if (si === 0 && !passage) {
          box(q.x, 1.02, fz + faceN * .02, .82, 1.94, .075,
            tint(col.redD, .82 + (yard.cx + 25) * .004), { hard:true, gloss:.20 });
          for (const s of [-1, 1])
            box(q.x + s * .47, 1.02, fz + faceN * .04, .08, 2.08, .10, col.trunk,
              { hard:true, gloss:G.wood });
          box(q.x, 2.04, fz + faceN * .04, 1.02, .10, .10, col.trunk,
            { hard:true, gloss:G.wood });
        } else if (si !== 0) {
          fwin(q.x, 1.42, fz, Math.min(1.48, q.w - .50), 1.08,
            { n:faceN, warm:.32 + ((yard.cx + si * 7) % 5 + 5) % 5 * .10 });
        }
      }
      return segs;
    };

    for (let yi = 0; yi < yards.length; yi++) {
      const y = yards[yi];
      flat(y.cx, .01, CWZ + 5.4, y.len, 10.0, col.paveD, { mode:9, gloss:.14, ...PAVE });
      const front = rangeShell(y, 'front', CWZ + 2.0, y.len - 1.0, 3.20, y.front, 1);
      const rear = rangeShell(y, 'rear', CWZ + 9.0, y.len - 1.6, 3.65, y.rear, -1);

      // Retain the old six deterministic roof-service clusters, now on actual main phases rather
      // than laid through a joint. roofJunk uses jit(), never rnd().
      if (yi === 1 || yi === 3) {
        const q = front[front[0].w > front[1].w ? 0 : 1];
        roofJunk(q.x, CWZ + 2.0 + q.dz, q.base + q.rise, q.w, 3.20, q.rise);
      }
      {
        const q = rear[rear[0].w > rear[1].w ? 0 : 1];
        roofJunk(q.x, CWZ + 9.0 + q.dz, q.base + q.rise, q.w, 3.65, q.rise);
      }

      // Side ranges keep the four-sided courtyard plan, but one is always an older low service
      // wing and the other a later family wing. Their unequal lengths and offsets stop the yards
      // forming a repeated row of cross-gabled boxes.
      for (const [s, slen, base, rise, dz] of y.sides) {
        const sx = y.cx + s * (y.len / 2 - 1.48), sz = CWZ + 5.45 + dz;
        tileRoof(sx, sz, slen, 2.82, base, rise, true);
        for (const n of [-1, 1])
          box(sx + n * 1.25, base / 2, sz, .26, base, slen - .30, y.tone,
            { hard:true, mode:11, gloss:G.matte, ...BRICK });
        for (const n of [-1, 1])
          box(sx, base / 2, sz + n * (slen / 2 - .14), 2.50, base, .26, y.tone,
            { hard:true, mode:11, gloss:G.matte, ...BRICK });
      }

      // One drainage/service point per household, tucked against its rear range: a basin on a
      // masonry stand, downpipe, and trapped gully. These sit inside the existing blocker and add
      // no street obstruction.
      const svcX = y.cx + (yi % 2 ? -1 : 1) * (y.len * .24), svcZ = CWZ + 7.10;
      box(svcX, .35, svcZ, .64, .70, .42, tint(y.tone, .82),
        { hard:true, mode:11, gloss:G.matte, ...BRICK });
      taper(svcX, .73, svcZ - .03, .50, .16, .42, col.stone,
        { rx:Math.PI, gloss:.24 });
      capsule(svcX + .28, 1.18, svcZ + .10, .025, 1.78, .025, col.steelD,
        { gloss:G.metal });
      cyl(svcX, .035, svcZ - .44, .16, .035, col.charcoal, { gloss:.18 });

      // Same four tree calls and the same scale as before: positions gain asymmetry without
      // changing how many random values the tree helper consumes.
      tree(y.cx + y.tree[0], CWZ + y.tree[1], .85, false);
      if (y.cx === 7.0) {
        // The passage is a real connected route, not only a visual hole. Preserve the courtyard's
        // blocker everywhere except the same 2.8 m aperture cut through its front range.
        blocker(y.cx - y.len / 2, 3.2, CWZ + .3, CWZ + 11, 4.4);
        blocker(6.0, y.cx + y.len / 2, CWZ + .3, CWZ + 11, 4.4);
      } else blocker(y.cx - y.len / 2, y.cx + y.len / 2, CWZ + .3, CWZ + 11, 4.4);
    }
    tree(-17.0, CWZ + 4.2, 1.15, false);
    tree(-4.0, CWZ + 4.6, 1.0, false);
    tree(10.5, CWZ + 4.4, 1.1, false);
    // Two local mid-rises complete the courtyard skyline.  Each old address was one anonymous
    // 20–22 m beige cuboid with a window grid pasted on its face; from the sorting bins it filled
    // nearly the entire sky.  These retain the same parcels and exact 66 random window draws, but
    // resolve as independent wings around real air gaps, with unequal setbacks, returned façades and
    // independently stepped roofs.  They remain scenery only: no solid or blocker is introduced.
    const courtBackdrops = [
      { bx:-22, bw:20, bh:19, coreX:-23.15,
        wings:[
          { x:-17.55, z:CWZ+27.35, w:8.70, d:12.40, h:19.0, away: 1,
            shell:C('#818d91'), upper:C('#a1aaab'), taper:true },
        ] },
      { bx:2, bw:22, bh:16, coreX:1.05,
        wings:[
          { x:-4.75, z:CWZ+25.90, w:8.50, d:15.30, h:16.0, away:-1,
            shell:C('#9a8f80'), upper:C('#b2a899'), taper:true },
          { x:7.35, z:CWZ+27.40, w:9.30, d:12.30, h:12.8, away: 1,
            shell:C('#7f8b91'), upper:C('#9aa6aa'), taper:false },
        ] },
    ];
    for (const b of courtBackdrops) {
      // The narrow recessed stair core is visibly behind the gap rather than bridging it.  Its
      // vertical glass strip gives scale while preserving at least 2.4 m of open silhouette.
      const coreH = Math.min(10.8, b.bh * .64), coreZ = CWZ + 30.1;
      box(b.coreX, coreH / 2, coreZ, 1.75, coreH, 5.20, col.charcoal,
        { hard:true, mode:14, gloss:.20, ...RENDER });
      for (let y = 2.0; y < coreH - .5; y += 2.45)
        pane(box(b.coreX, y, coreZ - 2.64, 1.05, 1.42, .07, col.glassDay,
          { hard:true, mode:1, gloss:G.glass }), (y * 10 | 0) % 2 ? .80 : 0, true);

      for (const w of b.wings) {
        const baseH = Math.min(4.75, w.h * .34);
        const upperH = w.h - baseH, uw = w.w * .84, ud = w.d * .82;
        const ux = w.x + w.away * .28, uz = w.z + .54;
        box(w.x, baseH / 2, w.z, w.w, baseH, w.d, w.shell,
          { hard:true, mode:14, gloss:G.paint, ...RENDER });
        const upperShape = w.taper ? taper : box;
        upperShape(ux, baseH + upperH / 2, uz, uw, upperH, ud, w.upper,
          { hard:true, mode:14, gloss:G.paint, ...RENDER });

        // A perimeter parapet and corner piers articulate each wing without restoring a roof slab.
        const cap = tint(w.upper, .78, -.01), top = w.h + .10;
        for (const sx of [-1, 1])
          box(ux + sx * (uw / 2 - .08), top, uz, .16, .20, ud + .12, cap,
            { hard:true, gloss:.24 });
        for (const sz of [-1, 1])
          box(ux, top, uz + sz * (ud / 2 - .08), uw, .20, .16, cap,
            { hard:true, gloss:.24 });
        for (const sx of [-1, 1])
          box(w.x + sx * (w.w / 2 - .13), baseH / 2, w.z - w.d / 2 - .055,
            .26, baseH, .13, cap, { hard:true, gloss:.24 });

        // Both side elevations are real façades, not anonymous 12–16 m depth faces.  Recessed
        // three-bay windows begin on the base and continue up both the gap-facing and outer
        // returns.  Tapered wings shrink the window line with height, so no pane floats beyond
        // the sloping upper shell.  Warmth is index-derived and consumes no random draws.
        for (let y = 2.20, k = 0; y < w.h - .55; y += 3.0, k++) {
          const upper = y > baseH, frac = upper ? (y - baseH) / upperH : 0;
          const scale = upper && w.taper ? 1 - .28 * Math.min(1, frac) : 1;
          const mx = upper ? ux : w.x, mz = upper ? uz : w.z;
          const mw = (upper ? uw : w.w) * scale, md = (upper ? ud : w.d) * scale;
          for (const sx of [-1, 1]) {
            const faceX = mx + sx * (mw / 2 + .055);
            for (const [j, oz] of [-.27, 0, .27].entries()) {
              const wz = mz + md * oz;
              box(faceX, y, wz, .10, 1.34, 1.42, col.glassDark,
                { hard:true, gloss:.20 });
              pane(box(faceX + sx * .035, y, wz, .025, 1.20, 1.24,
                col.glassDay, { hard:true, mode:1, gloss:G.glass }),
                (k + j + (sx > 0)) % 2 ? .82 : 0, true);
            }
          }
          // The rear elevation is also visible on a long courtyard oblique. Three recessed bays
          // stop that return becoming the same blank plane from the opposite direction.
          const backZ = mz + md / 2 + .035;
          for (const [j, ox] of [-.27, 0, .27].entries())
            fwin(mx + mw * ox, y, backZ, 1.30, 1.18,
              { n:1, warm:(k + j) % 2 ? .78 : 0 });
        }
      }

      // Preserve the original f-then-i draw order exactly.  A grid point in the deliberate gap
      // still consumes its old draw but builds nothing; points on a wing gain a recessed fwin.
      const floors = Math.floor(b.bh / 3), bays = Math.floor(b.bw / 3.2);
      for (let f = 0; f < floors; f++) for (let i = 0; i < bays; i++) {
        const warm = rnd(), wx = b.bx - b.bw / 2 + 1.6 + i * 3.2, y = 2.2 + f * 3.0;
        const w = b.wings.find(q => wx > q.x - q.w / 2 + .45 && wx < q.x + q.w / 2 - .45 && y < q.h - .45);
        if (!w) continue;
        const baseH = Math.min(4.75, w.h * .34), upper = y > baseH;
        const mw = upper ? w.w * .84 : w.w;
        const mx = upper ? w.x + w.away * .28 : w.x;
        if (wx < mx - mw / 2 + .42 || wx > mx + mw / 2 - .42) continue;
        const mz = upper ? w.z + .54 : w.z, md = upper ? w.d * .82 : w.d;
        fwin(wx, y, mz - md / 2 - .035, 1.62, 1.26, { n:-1, warm });
      }
    }

    // ---- the cat, on the courtyard wall where cats always are
    const catX = 5.4, catY = CW + .30, catZ = CWZ - .10;
    ball(catX, catY, catZ, .21, .15, .13, col.charcoal, { gloss: .18, tag: '猫' });
    ball(catX - .26, catY + .09, catZ, .105, .10, .095, col.charcoal, { gloss: .18, tag: '猫' });
    for (const s of [-1, 1])
      box(catX - .30, catY + .19, catZ + s * .055, .07, .09, .05, col.charcoal,
        { hard: true, rz: s * .2, tag: '猫' });
    capsule(catX + .24, catY + .10, catZ, .045, .42, .045, col.charcoal,
      { rz: -1.0, gloss: .18, tag: '猫' });
    thing('猫', catX, catY + .42, catZ, '墙上有一只猫。', 'There is a cat on the wall.',
      '一只猫 — 只 is the measure word for most animals.',
      { focus: [catX, catZ - 1.4], reach: 2.2 });
    thing('墙', -8.0, 1.9, CWZ - .3, '这些墙都是老青砖的。',
      'These walls are all old grey brick.',
      '青砖 qīngzhuān is the grey brick every hutong is built from.',
      { focus: [-8.0, CWZ - 1.9], reach: 2.2, tag: '墙' });
    box(-8.0, 1.30, CWZ - .24, 2.6, 2.30, .05, col.brick,
      { hard: true, mode: 11, gloss: G.matte, ...BRICK, tag: '墙' });
    // A faded slogan painted directly onto the brick. The former fresh 2.9 m white backing panel
    // read as a billboard/cuboid in every market view; real courtyard limewash has worn away and
    // left the masonry visible between the brush strokes.
    B.glyphs(-8.0, 1.78, CWZ - .273, Math.PI, '注意防火',
      { size: .40, gap: .22, color: C('#8f6a5c'), gloss: .035, tag: '墙', lift: .006 });
    // The other thing written on every wall in this city, sprayed on by hand through a stencil
    // and never painted out: a drain-clearing man and his phone number. Painted, not lit — as an
    // emissive panel it would come up after dark as an orange sign, which spray paint does not do.
    // Yaw is Math.PI like everything else on this wall: the alley is at lower z, so the glyphs
    // have to face -z or they render into the brick and come out blank.
    B.glyphs(-16.9, 2.02, CWZ - .23, Math.PI, '疏通下水道',
      { size: .19, gap: .05, color: C('#3f4a58'), gloss: .05, lift: .006 });
    B.glyphs(-16.9, 1.78, CWZ - .23, Math.PI, '13501268',
      { size: .17, gap: .03, color: C('#3f4a58'), gloss: .05, lift: .006 });
    // and a second hand, further down, half scrubbed off
    B.glyphs(9.7, 2.08, CWZ - .23, Math.PI, '开锁',
      { size: .22, gap: .06, color: C('#5c4a44'), gloss: .05, lift: .006 });

    // ============================================================ alley furniture
    // Trees go tight against one edge or the other. Planted down the middle they blocked
    // both the walk and every view along the alley.
    // Removed the former x=-9.4 street tree. Its trunk sat only 12 cm from the convenience-store
    // frontage and its crown covered the shop name from both approaches; moving that same crown
    // along this already occupied kerb merely transfers the obstruction to another door. Consume
    // the helper's 64 random draws so every later authored variation remains bit-for-bit stable.
    for (let i = 0; i < 64; i++) rnd();
    tree(-2.6, SZ - .55, 1.1, true);
    // The tree that stood at x 4.6 is GONE, and it is the only prop in the district deleted rather
    // than moved. At scale .95 its crown filled x 3.4 .. 5.8 and y 2.6 .. 5.0, and 幸福超市's board
    // runs 5.10 .. 10.10 at y 3.12 .. 3.80 — so the biggest sign on the street was read through a
    // tree from every position west of it, which is every position you approach it from. There is
    // nowhere on this stretch to move it to: the 超市 blade is at x 3.05, the 单元门 canopy ends at
    // 1.75, and its trunk has to stand in the 0.90 m unreachable strip. Four alley trees, not five.
    tree(16.4, SZ - .55, 1.05, false);
    // The former x=22 east-end tree stood inside the first four metres of the zebra/crossing
    // establishing view. Its trunk and crown pinched the metro mouth, so this release stays open.
    tree(-20.0, -2.10, 1.0, false);

    // 早餐 breakfast stall: a cart with steamer baskets, a wok, a folding table and stools
    //
    // It trades in the morning and it packs up. Everything built between here and the end of the
    // stall is collected into `stall`, so `tick` can take it off the pavement after ten — a
    // breakfast stall steaming away at two in the morning is the clearest way a street can tell
    // you it is a painting. The keeper's own hours have said 5–14 for months; the cart never knew.
    const stallFrom = B.props.length;
    const sx = -8.6, sz = SZ - .95;
    // Eight stainless deck strips on an open ladder chassis. The former full top and lower block
    // fused into a 2.3 m metal chest; the wheel axles, crossmembers and wall-side paving are now
    // visible through the cart from every approach.
    for (let i = 0; i < 8; i++)
      box(sx, .48, sz - .455 + i * .13, 2.22, .055, .095, col.steel,
        { hard: true, gloss: .40, tag: '早餐' });
    for (const oz of [-.43, .43])
      box(sx, .34, sz + oz, 2.14, .075, .065, col.steelD,
        { hard: true, gloss: .34, tag: '早餐' });
    for (const ox of [-1.02, 0, 1.02])
      box(sx + ox, .34, sz, .065, .075, .86, col.steelD,
        { hard: true, gloss: .34, tag: '早餐' });
    for (const [ox, oz] of [[-1.02, -.43], [1.02, -.43], [-1.02, .43], [1.02, .43]])
      capsule(sx + ox, .38, sz + oz, .022, .25, .022, col.steelD,
        { gloss: G.metal, tag: '早餐' });
    // Two real axles and four vertical wheels. The old upright cylinders were black pucks lying on
    // the paving; these turn around the x axis and expose hubs on both ends of the cart.
    for (const oz of [-.38, .38]) {
      capsule(sx, .16, sz + oz, .022, 1.98, .022, col.steelD,
        { rz: Math.PI / 2, gloss: G.metal, tag: '早餐' });
      for (const ox of [-1.02, 1.02]) {
        cyl(sx + ox, .16, sz + oz, .14, .065, col.black,
          { rz: Math.PI / 2, gloss: .30, tag: '早餐' });
        cyl(sx + ox, .16, sz + oz, .045, .078, col.steel,
          { rz: Math.PI / 2, gloss: G.metal, tag: '早餐' });
      }
    }
    // Steamer stack: three closed baskets with a fourth standing open on top of them, the buns
    // in that one, and the lid off and leaning against the cart. The five 包子 used to sit in
    // the wok next door, floating in hot oil, which is a 汤圆 and a completely different
    // breakfast — 包子 are steamed, and a stall that fries them is telling the player a lie
    // about the word it is teaching them.
    // Each basket has its own dark upper/lower rim and ten bamboo uprights. Four plain, perfectly
    // aligned cylinders merged into one beige faceted carton at player height; tiny offsets and
    // visible joinery make the stack unmistakably round without changing its footprint.
    const STEAMER_BODY = [C('#bca06c'), C('#c9ad77'), C('#b29461'), C('#c4a873')];
    const STEAMER_RIM = C('#8f7147'), STEAMER_SLAT = C('#a98554');
    const steamerBasket = (i, y, h, dx, dz) => {
      const bx = sx - .62 + dx, bz = sz + dz, rad = .34;
      cyl(bx, y, bz, rad, h, STEAMER_BODY[i],
        { gloss: G.wood, ry: i * .12, tag: '早餐' });
      for (const sy2 of [-1, 1])
        cyl(bx, y + sy2 * (h / 2 - .012), bz, rad + .012, .024, STEAMER_RIM,
          { gloss: G.wood, tag: '早餐' });
      for (let k = 0; k < 10; k++) {
        const a = k * Math.PI / 5;
        capsule(bx + Math.cos(a) * (rad - .012), y, bz + Math.sin(a) * (rad - .012),
          .007, h - .038, .007, STEAMER_SLAT, { gloss: G.wood, tag: '早餐' });
      }
    };
    steamerBasket(0, .60, .13, -.012, .006);
    steamerBasket(1, .73, .13,  .010, -.006);
    steamerBasket(2, .86, .13, -.006, .008);
    steamerBasket(3, 1.00, .14, 0, 0);
    cyl(sx - .62, 1.015, sz, .30, .02, C('#c9b07c'), { gloss: .14, tag: '早餐' });   // bamboo mat
    for (let i = 0; i < 6; i++) {
      const a = i * 1.047, r = i < 5 ? .17 : 0;
      const bx2 = sx - .62 + Math.cos(a) * r, bz2 = sz + Math.sin(a) * r;
      // Tagged 包子 and not 早餐: both are things with verbs of their own, and hovering the buns
      // should offer to eat one rather than to sit down to the whole breakfast.
      ball(bx2, 1.10, bz2, .078, .062, .078, col.cream, { gloss: .22, tag: '包子' });
      // The pleated twist on the crown. Without it a baozi is a bread roll, or a dumpling, or
      // at this scale a pebble, and 包子 is the one word this stall exists to teach.
      ball(bx2, 1.152, bz2, .030, .022, .030, C('#e4dece'), { gloss: .20, tag: '包子' });
    }
    // The lid, off and stood on edge against the end of the cart where the vendor put it down.
    taper(sx - 1.34, .34, sz + .08, .66, .16, .66, col.canvas,
      { gloss: G.wood, rz: Math.PI / 2 - .28, tag: '早餐' });
    for (let i = 0; i < 3; i++)
      ball(sx - .62 + (rnd() - .5) * .2, 1.35 + i * .26, sz, .22 - i * .04, .16, .22 - i * .04,
        C('#e8e6e0'), { mode: 1, alpha: .16 - i * .04 });
    // The wok now does what a wok on a Beijing breakfast cart is actually for: 油条, four of them
    // lying across the oil to drain, and the wire skimmer they were lifted out with.
    // A crossed burner cradle and four short risers keep the wok off the deck; without them it read
    // as a bowl glued directly to the cart top, with no heat source despite the gas bottle behind it.
    capsule(sx + .55, .525, sz, .018, .50, .018, col.steelD,
      { rz: Math.PI / 2, gloss: G.metal, tag: '早餐' });
    capsule(sx + .55, .525, sz, .018, .50, .018, col.steelD,
      { rx: Math.PI / 2, gloss: G.metal, tag: '早餐' });
    for (const [dx, dz] of [[-.21, 0], [.21, 0], [0, -.21], [0, .21]])
      capsule(sx + .55 + dx, .545, sz + dz, .014, .09, .014, col.steelD,
        { gloss: G.metal, tag: '早餐' });
    cyl(sx + .55, .56, sz, .34, .14, col.charcoal, { gloss: .44, tag: '早餐' });
    cyl(sx + .55, .605, sz, .30, .02, C('#3b3025'), { gloss: .74, tag: '早餐' });     // the oil
    for (let i = 0; i < 4; i++)
      capsule(sx + .40 + i * .10, .655, sz - .13 + (i % 2) * .24, .028, .34, .028,
        C('#c9903f'), { rz: Math.PI / 2, ry: -.34 + i * .16, gloss: .30, tag: '早餐' });
    cyl(sx + .84, .70, sz - .22, .095, .02, col.steel,
      { rx: -.30, gloss: G.metal, tag: '早餐' });
    capsule(sx + 1.02, .76, sz - .34, .016, .34, .016, col.trunkL,
      { rz: Math.PI / 2 - .55, gloss: G.wood, tag: '早餐' });
    // Red awning, pitched toward the customer. Front poles are shorter than the back ones; feet,
    // perimeter tubes and sloping rafters make this a demountable stall frame rather than four
    // sticks touching a thick striped roof.
    for (const [ox, oz, oy] of [[-1.3, -.80, 2.06], [1.3, -.80, 2.06],
                                [-1.3, .74, 2.52], [1.3, .74, 2.52]])
    {
      capsule(sx + ox, oy / 2, sz + oz, .035, oy, .035, col.steelD,
        { gloss: .34, tag: '早餐' });
      box(sx + ox, .025, sz + oz, .15, .035, .15, col.steelD,
        { hard: true, gloss: G.metal, tag: '早餐' });
    }
    for (const [pz, py] of [[-.80, 2.06], [.74, 2.52]])
      capsule(sx, py, sz + pz, .026, 2.68, .026, col.steelD,
        { rz: Math.PI / 2, gloss: G.metal, tag: '早餐' });
    for (const ox of [-1.30, -.65, 0, .65, 1.30])
      capsule(sx + ox, 2.29, sz - .03, .020, 1.60, .020, col.steelD,
        { rx: Math.PI / 2 - .29, gloss: G.metal, tag: '早餐' });
    // Ten thin, individually tensioned canvas strips with breathing gaps over those rafters. Their
    // 24 mm edge is cloth scale; the former 9 cm extrusion read as roof tiles from player height.
    for (let i = 0; i < 10; i++)
      box(sx - 1.215 + i * .27, 2.30 + (i % 2) * .003, sz - .04, .235, .024, 1.54,
        i % 2 ? col.cream : col.red,
        { hard: true, mode: 7, rx: -.29, gloss: .24, tag: '早餐' });
    // Eight separate valance tabs on the front tube. The middle four carry 早餐包子 and the gaps
    // leave the vendor, steam and stock visible instead of replacing them with a fascia board.
    const cartName = ['', '', '早', '餐', '包', '子', '', ''];
    for (let i = 0; i < 8; i++) {
      const vx = sx + 1.19 - i * .34, vc = i % 2 ? col.cream : col.redD;
      capsule(vx, 2.02, sz - .815, .006, .10, .006, col.steelD,
        { gloss: G.metal, tag: '早餐' });
      box(vx, 1.92, sz - .825, .24, .18, .014, vc,
        { hard: true, mode: 7, gloss: .24, tag: '早餐' });
      ball(vx, 1.83, sz - .825, .12, .035, .012, vc,
        { gloss: .24, tag: '早餐' });
      if (cartName[i])
        B.glyphs(vx, 1.93, sz - .838, Math.PI, cartName[i],
          { size: .115, gap: .02, color: i % 2 ? col.redD : col.paintY,
            gloss: .12, lift: .006, tag: '早餐' });
    }
    // 豆浆. The stall's own text has always promised soy milk with the buns and there was nothing
    // whatever to pour it out of, so the word had no object to hang on. This is the urn every one
    // of these carts has: a stainless drum on a crate, a tap at the front, a lid with a handle,
    // and the sleeve of paper cups beside it.
    // Tucked against the east end of the cart rather than out in front of it: at the obvious spot
    // on the customer's side it stood half a metre from the man waiting for his buns and filled
    // the whole of the close shot of the stall.
    const UX = sx + 1.47, UZ = sz + .18;
    // The 62 cm returnable crate is open slatwork: broad enough for the cup sleeve, but never a blue
    // cuboid under the urn. Four floor boards, two rail courses and corner posts carry the load.
    for (const oz of [-.15, -.05, .05, .15])
      box(UX, .025, UZ + oz, .56, .04, .06, col.plastic,
        { hard: true, gloss: .28, tag: '豆浆' });
    for (const yy of [.11, .34]) {
      for (const oz of [-.18, .18])
        box(UX, yy, UZ + oz, .62, .045, .04, col.plastic,
          { hard: true, gloss: .28, tag: '豆浆' });
      for (const ox of [-.29, .29])
        box(UX + ox, yy, UZ, .04, .045, .40, col.plastic,
          { hard: true, gloss: .28, tag: '豆浆' });
    }
    for (const ox of [-.29, .29]) for (const oz of [-.18, .18])
      capsule(UX + ox, .21, UZ + oz, .018, .42, .018, col.plastic,
        { gloss: .28, tag: '豆浆' });
    cyl(UX, .72, UZ, .165, .58, col.steel, { gloss: .52, tag: '豆浆' });
    cyl(UX, .445, UZ, .172, .05, col.steelD, { gloss: .44, tag: '豆浆' });
    taper(UX, 1.035, UZ, .34, .09, .34, col.steel, { gloss: .50, tag: '豆浆' });
    capsule(UX, 1.11, UZ, .014, .13, .014, col.steelD, { rz: Math.PI / 2, gloss: G.metal, tag: '豆浆' });
    // The tap. A drum with no tap is a bin, and this is the whole difference between the two.
    box(UX, .60, UZ - .20, .07, .10, .09, col.steelD, { hard: true, gloss: .46, tag: '豆浆' });
    capsule(UX, .535, UZ - .225, .014, .10, .014, col.steelD, { gloss: G.metal, tag: '豆浆' });
    capsule(UX + .04, .655, UZ - .225, .012, .09, .012, col.charcoal,
      { rz: Math.PI / 2 - .5, gloss: .34, tag: '豆浆' });
    // A red paper band round the drum with the word on it, because a stainless cylinder says
    // nothing at all and this one has a name.
    cyl(UX, .82, UZ, .168, .17, col.red, { gloss: .28, tag: '豆浆' });
    B.glyphs(UX, .82, UZ - .176, Math.PI, '豆浆',
      { size: .105, gap: .02, color: col.goldL, gloss: .16, lift: .006, tag: '豆浆' });
    // The sleeve of cups. Flipped: the taper mesh is wide at its base and narrows upward, so left
    // alone a paper cup is a funnel.
    for (let i = 0; i < 3; i++)
      taper(UX + .24, .49 + i * .045, UZ + .04, .13, .16, .13, col.white,
        { rx: Math.PI, gloss: .22, ry: i * .4, tag: '豆浆' });
    shade(UX, UZ, 1.0, .9, .28);
    thing('豆浆', UX, 1.34, UZ, '一碗豆浆，热的。', 'A bowl of soy milk, hot.',
      '豆 bean + 浆 thick liquid. Sweet or salty, and people argue about which.',
      { focus: [UX, sz - 1.40], reach: 2.0 });
    // The price list, wired to the front awning pole at the height a customer reads it from. A
    // stall with a sign saying only 早餐包子 and no prices is a stall nobody has ever bought
    // from; this is also where the numbers and 元 turn up in the wild rather than in a menu.
    const PBX = sx - 1.30, PBZ = sz - .84;
    for (const ox of [-.27, .27])
      capsule(PBX + ox, 1.20, PBZ + .012, .010, .64, .010, col.steelD,
        { gloss: G.metal, tag: '早餐' });
    for (const y of [.88, 1.52])
      box(PBX, y, PBZ + .012, .56, .035, .025, col.steelD,
        { hard: true, gloss: G.metal, tag: '早餐' });
    for (const [k, row] of [[0, '包子一元'], [1, '油条一元'], [2, '豆浆两元']]) {
      const py = 1.39 - k * .19;
      box(PBX, py, PBZ, .46, .135, .010, k % 2 ? C('#e5dcc4') : C('#dcd2b8'),
        { hard: true, mode: 7, gloss: .08, tag: '早餐' });
      B.glyphs(PBX, py, PBZ - .012, Math.PI, row,
        { size: .084, gap: .010, color: col.charcoal, gloss: .06, lift: .006, tag: '早餐' });
    }
    for (const y of [.96, 1.44])
      capsule(PBX, y, PBZ + .04, .006, .12, .006, col.steelD,
        { rx: Math.PI / 2, gloss: G.metal, tag: '早餐' });
    // folding table with two stools tucked under it, and a stack of spares. Five top strips on two
    // crossrails and braced splayed legs replace the old 1.2 × .7 m canvas slab.
    const tableX = sx + 2.4, tableZ = sz - .35;
    for (let i = 0; i < 5; i++)
      box(tableX, .55, tableZ - .28 + i * .14, 1.16, .045, .10, col.canvas,
        { hard: true, gloss: .24 });
    for (const ox of [-.50, .50])
      box(tableX + ox, .515, tableZ, .045, .06, .66, col.steelD,
        { hard: true, gloss: G.metal });
    for (const [ox, oz] of [[-.5, -.25], [.5, -.25], [-.5, .25], [.5, .25]])
      capsule(tableX + ox, .28, tableZ + oz, .030, .54, .030, col.steel,
        { rx: oz < 0 ? .12 : -.12, gloss: .34 });
    capsule(tableX, .19, tableZ, .018, 1.02, .018, col.steelD,
      { rz: Math.PI / 2, gloss: G.metal });
    // Pushed in under the lip on the customer side, half under and half out, which is where a
    // stool that somebody stood up from ends. These used to sit at sz + .55 and sz + .30 — that
    // is to say between the table and the courtyard wall, one of them a metre west of the table
    // and the other a metre east of it, belonging to no table at all.
    for (const [ox, oz] of [[2.08, -.59], [2.72, -.56]]) {
      taper(sx + ox, .17, sz + oz, .32, .34, .32, col.plastic, { gloss: .30 });
      box(sx + ox, .35, sz + oz, .34, .04, .34, col.plastic, { hard: true, gloss: .30 });
    }
    for (let i = 0; i < 5; i++)
      taper(sx + 3.9, .20 + i * .07, sz - .5, .32, .34, .32, col.plastic,
        { gloss: .30, ry: i * .2 });
    // Somebody's half-finished breakfast on the table: a plate with a bitten baozi on it, a paper
    // cup of 豆浆 with a straw, and the disposable chopsticks still in their sleeve. A bare table
    // in front of an occupied stall reads as furniture in a showroom.
    const TBX = sx + 2.28, TBZ = sz - .48;
    cyl(TBX, .595, TBZ, .125, .015, col.white, { gloss: .30 });
    cyl(TBX, .607, TBZ, .105, .010, C('#e2ded2'), { gloss: .26 });
    ball(TBX - .03, .655, TBZ + .01, .070, .056, .070, col.cream, { gloss: .22 });
    ball(TBX - .03, .702, TBZ + .01, .028, .020, .028, C('#e4dece'), { gloss: .20 });
    // The bite: a wedge of the darker filling showing where the crown has gone.
    ball(TBX + .035, .662, TBZ - .02, .034, .034, .034, C('#8a5a3f'), { gloss: .18 });
    taper(TBX + .30, .645, TBZ + .06, .13, .17, .13, col.white, { rx: Math.PI, gloss: .24 });
    cyl(TBX + .30, .735, TBZ + .06, .062, .012, C('#efe6d2'), { gloss: .20 });
    capsule(TBX + .32, .795, TBZ + .04, .008, .17, .008, C('#c4452f'),
      { rz: .30, gloss: .40 });                                            // the straw
    for (const t of [-1, 1])
      capsule(TBX - .30, .592, TBZ + .05 + t * .012, .006, .21, .006, C('#d8cdae'),
        { rz: Math.PI / 2, ry: .10, gloss: .14 });
    box(TBX - .30, .593, TBZ + .05, .075, .022, .055, col.white,
      { hard: true, ry: .10, gloss: .10 });                                 // the paper sleeve
    solid(sx - 1.3, sx + 1.3, sz - .6, sz + .6);
    shade(sx, sz, 3.2, 2.0, .34);
    thing('早餐', sx, 2.55, sz - .2, '早餐吃包子和豆浆。',
      'For breakfast, baozi and soy milk.',
      '早 early + 餐 meal. The stall is gone by ten.',
      { focus: [sx, sz - 1.9], reach: 2.2 });
    // Moved with the buns. It used to stand over the wok, so asking about 包子 pointed the label
    // at a pan of oil.
    thing('包子', sx - .62, 1.36, sz, '两个包子，一块五。', 'Two baozi, one fifty.',
      'Steamed, filled, and the cheapest breakfast in the city.',
      { focus: [sx - .6, sz - 1.6], reach: 1.9 });
    // Everything from the cart to the last baozi, so it can be wheeled away after the morning.
    // The things themselves stay where they are: a word you have walked up to before should not
    // stop existing because the cart has gone, and 早餐 out of hours already refuses politely.
    stall.push(...B.props.slice(stallFrom).map(p => {
      if (!p.stateOwner) p.stateOwner = 'base:breakfast-stall';
      return { p, m0: p.m };
    }));

    // bicycles: a leaning row against the courtyard wall, plus shared bikes by the shop
    bike(-15.0, SZ - .30, .16, col.bikeO, true, false);
    bike(-13.6, SZ - .30, -.10, col.charcoal, false, false);
    // Two more under the slogan banner at the west end, which is the emptiest stretch of wall in
    // the alley and the one the camera looks straight down in half the shots. Their handlebars
    // reach 1.35 m and the banner starts at 1.64, so they pass under it rather than through it.
    bike(-19.6, SZ - .30, .12, col.bikeB, false, false);
    bike(-21.2, SZ - .28, -.14, C('#7a4630'), true, false);
    bike(-5.0, SZ - .30, .08, col.teal, true, true);
    bike(-3.8, SZ - .30, -.06, col.bikeB, false, false);
    // The old 共享单车 rank is gone from this narrow frontage. Even reduced from seven machines
    // to four it filled HOME_OUT with sixteen near-black wheel faces, while street-cycles.js now
    // provides a proper marked kerbside bay on the main road. Preserve all seven old random draws
    // so the rest of the deterministic street is not re-seeded.
    const rackLean = Array.from({ length: 7 }, () => (rnd() - .5) * .14);
    void rackLean;
    thing('自行车', -5.0, 1.35, SZ - .30, '我的自行车在楼下。',
      'My bicycle is downstairs.',
      '自行车 — "self-run vehicle". 骑 qí is the verb for riding one.',
      { focus: [-5.0, SZ - 1.6], reach: 2.2 });

    // 快递 delivery trike. The old version was one waist-high plastic cuboid with three over-size
    // wheels stuck to it: from the walking line it read as a road barrier, not a vehicle. This is
    // the open cargo tricycle used by neighbourhood couriers — a visible chassis, fork and saddle
    // in front, paired rear wheels, and a light welded parcel cage instead of an opaque van body.
    const kx = 9.6, kz = SZ - .70, KT = { tag: '快递' }, KPAINT = C('#365f68');
    const parcelPose = Array.from({ length: 3 }, () => [(rnd() - .5) * .34, rnd()]);
    // Chassis and cargo deck: thin structural members, with air visible beneath and through them.
    box(kx - .18, .43, kz, 2.30, .10, .12, col.steelD,
      { hard: true, gloss: G.metal, ...KT });
    box(kx + .28, .58, kz, 1.30, .10, 1.02, KPAINT,
      { hard: true, gloss: .30, ...KT });
    for (const zSide of [-.50, .50]) {
      capsule(kx + .28, .78, kz + zSide, .026, 1.26, .026, col.steel,
        { rz: Math.PI / 2, gloss: G.metal, ...KT });
      capsule(kx + .28, 1.43, kz + zSide, .026, 1.26, .026, col.steel,
        { rz: Math.PI / 2, gloss: G.metal, ...KT });
      for (const ox of [-.60, .60])
        capsule(kx + .28 + ox, 1.10, kz + zSide, .026, .66, .026, col.steel,
          { gloss: G.metal, ...KT });
    }
    for (const ox of [-.32, .28])
      capsule(kx + ox, 1.10, kz - .50, .020, .66, .020, col.steelD,
        { gloss: G.metal, ...KT });
    // Parcel cartons are allowed to be boxes; none is left as a featureless block. Every carton
    // gets a taped seam and sits at a different angle inside the open cage.
    for (let i = 0; i < 3; i++) {
      const px = kx - .10 + i * .36, pz = kz + parcelPose[i][0], pr = parcelPose[i][1];
      box(px, .84 + (i % 2) * .10, pz, .34 + (i === 1 ? .08 : 0), .38, .32,
        i === 2 ? C('#b89b74') : col.canvas,
        { hard: true, gloss: .16, ry: pr, ...KT });
      box(px, 1.032 + (i % 2) * .10, pz, .09, .012, .33,
        C('#d8c6a2'), { hard: true, gloss: .12, ry: pr, ...KT });
    }
    // Saddle, pedals, head tube, fork and handlebars make the otherwise empty front third read as
    // something that can actually be ridden rather than another bin parked against the wall.
    taper(kx - .72, .75, kz, .22, .12, .30, col.charcoal, { gloss: .28, ...KT });
    capsule(kx - .72, .58, kz, .024, .38, .024, col.steelD,
      { rz: -.14, gloss: G.metal, ...KT });
    cyl(kx - .68, .43, kz, .12, .035, col.steel, { gloss: G.metal, ...KT });
    for (const zSide of [-.075, .075])
      capsule(kx - 1.23, .61, kz + zSide, .024, .74, .024, col.steelD,
        { rz: -.34, gloss: G.metal, ...KT });
    capsule(kx - 1.10, .98, kz, .026, .48, .026, col.steelD,
      { rz: -.20, gloss: G.metal, ...KT });
    capsule(kx - 1.05, 1.16, kz, .022, .58, .022, col.steel,
      { rx: Math.PI / 2, gloss: G.metal, ...KT });
    ball(kx - 1.29, .91, kz, .075, .065, .075, col.cream,
      { hard: true, mode: 1, glow: .02, ...KT });
    // Properly scaled tyres, inset rims and hubs. The rear mudguards sit just above the tyre arc.
    for (const [ox, oz] of [[-1.45, 0], [.66, -.52], [.66, .52]]) {
      cyl(kx + ox, .29, kz + oz, .29, .09, col.black,
        { rx: Math.PI / 2, gloss: .24, ...KT });
      cyl(kx + ox, .29, kz + oz, .18, .105, col.steel,
        { rx: Math.PI / 2, gloss: G.metal, ...KT });
      cyl(kx + ox, .29, kz + oz, .055, .12, col.charcoal,
        { rx: Math.PI / 2, gloss: .34, ...KT });
    }
    for (const oz of [-.52, .52])
      capsule(kx + .66, .60, kz + oz, .035, .54, .035, KPAINT,
        { rz: Math.PI / 2, gloss: .30, ...KT });
    // A small supported fleet plate, not a full cargo-box billboard.
    box(kx + .28, 1.18, kz - .525, .70, .25, .025, KPAINT,
      { hard: true, gloss: .30, ...KT });
    B.glyphs(kx + .28, 1.18, kz - .543, Math.PI, '快递',
      { size: .145, gap: .035, color: col.white, mode: 1, lift: .006, ...KT });
    solid(kx - 1.72, kx + .96, kz - .60, kz + .60);
    shade(kx - .06, kz, 3.0, 1.45, .28);
    thing('快递', kx, 1.75, kz, '快递到了，放在门口。',
      'The delivery came. It is by the door.',
      '快 fast + 递 to hand over. The word for every parcel in China.',
      { focus: [kx, kz - 1.8], reach: 2.0 });

    // potted flowers along the wall, bins, a broom, bricks
    for (const [px, pz, s] of [[-11.6, SZ - .25, 1], [-11.1, SZ - .25, .8], [11.9, SZ - .30, .9],
                               [12.4, SZ - .25, 1.1], [2.1, SZ - .25, .85]]) {
      taper(px, .17 * s, pz, .34 * s, .34 * s, .34 * s, C('#a2603d'), { gloss: .22, tag: '花' });
      cyl(px, .34 * s, pz, .155 * s, .04, col.dirt, { tag: '花' });
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05;
        capsule(px + Math.sin(a) * .09 * s, (.46 + rnd() * .12) * s, pz + Math.cos(a) * .09 * s,
          .03, .30 * s, .03, col.greenL, { rz: (rnd() - .5) * .5, tag: '花' });
        ball(px + Math.sin(a) * .15 * s, (.63 + rnd() * .1) * s, pz + Math.cos(a) * .15 * s,
          .055 * s, .05 * s, .055 * s, pick([col.plastic, col.paintY, col.white]),
          { gloss: .2, tag: '花' });
      }
    }
    thing('花', -11.35, .95, SZ - .25, '门口有几盆花。',
      'There are a few pots of flowers by the door.',
      '一盆花 — 盆 is the measure word for a potted plant.',
      { focus: [-11.35, SZ - 1.5], reach: 1.9 });

    // One shared wheeled bin in a measured service bay replaces three chest-and-side-box
    // assemblies scattered through the walking line. The worst stood directly across 修鞋/打印;
    // the east one also occupied the newsstand's footprint. This west bay is against plain wall,
    // clear of the repair pitch, public-toilet post, tree and relocated utility pole.
    {
      const bx = -20.80, bz = -2.78;
      taper(bx, .47, bz, .56, .82, .50, col.tarp, { gloss: .25 });
      // Recessed service panel, supported lid, hinge and pull: five readable parts rather than a
      // coloured cuboid with a second coloured cuboid glued to its side.
      box(bx, .49, bz - .258, .38, .45, .024, tint(col.tarp, .78),
        { hard: true, gloss: .20 });
      box(bx, .92, bz + .01, .62, .10, .56, col.charcoal,
        { hard: true, rx: -.06, gloss: .30 });
      capsule(bx, .91, bz + .275, .020, .54, .020, col.steelD,
        { rz: Math.PI / 2, gloss: G.metal });
      capsule(bx, .76, bz + .285, .018, .40, .018, col.steelD,
        { rz: Math.PI / 2, gloss: G.metal });
      box(bx, .50, bz - .274, .22, .10, .018, col.cream,
        { hard: true, gloss: .16 });
      // Axle, inset tyres and foot pedal keep the object visibly mobile and wall-serviced.
      capsule(bx, .16, bz + .20, .024, .62, .024, col.steelD,
        { rz: Math.PI / 2, gloss: G.metal });
      for (const ox of [-.27, .27]) {
        cyl(bx + ox, .16, bz + .20, .105, .07, col.black,
          { rz: Math.PI / 2, gloss: .24 });
        cyl(bx + ox, .16, bz + .20, .050, .076, col.steel,
          { rz: Math.PI / 2, gloss: G.metal });
      }
      box(bx, .10, bz - .29, .22, .05, .12, col.steelD,
        { hard: true, rx: -.16, gloss: G.metal });
      shade(bx, bz, .86, .80, .25);
      solid(bx - .31, bx + .31, bz - .28, bz + .28);
    }
    // The 扫帚 leaning against the wall. It was a stick with a beige box on the end, which at any
    // distance is a spade. A hutong broom is a fan of sorghum straw bound to the handle in two
    // places, and the fan is the whole of what makes it readable as a broom.
    capsule(14.2, .78, SZ - .22, .04, 1.55, .04, col.trunkL, { rz: .22, gloss: G.wood });
    for (let i = 0; i < 7; i++) {
      const t = (i - 3) / 3;
      capsule(14.33 + t * .10, .19, SZ - .22 + (i % 3 - 1) * .022, .024, .42, .024,
        i % 2 ? C('#c2ad72') : C('#ab9660'), { rz: .22 + t * .30, gloss: .14 });
    }
    for (const by of [.40, .48])
      capsule(14.29, by, SZ - .22, .010, .14, .010, col.steelD,
        { rz: Math.PI / 2, gloss: G.metal });
    for (let i = 0; i < 9; i++)
      box(18.6 + (i % 3) * .24, .05 + ((i / 3) | 0) * .10, SZ - .25, .22, .10, .10,
        col.brickD, { hard: true, mode: 11 });

    // The rest of what is piled against the foot of these two walls. Every one of these sits in a
    // stretch that was measured empty first — between the banner and the leaning bikes, between
    // the parcel trike and the flowerpots, between the tree grate and the brick pile — because
    // the way this scene goes wrong is a prop dropped through something already standing there.
    wallJunk(-18.0, 3.30, 0, -1);        // crates, west of 陈家's gate
    wallJunk(-16.6, 3.32, 1, -1);        // gas bottle, bucket and mop beside them
    // Open returnable crates east of the market frame. This is the one kind-0 wallJunk call that
    // shares the gateway view: its old seven nested cuboids made four bright masonry courses and
    // pushed their front rim to z 2.93. Five lower slatted crates sit at z >= 3.12, with produce in
    // the two open tops; no RNG, tag or collider is added.
    {
      const jx = 8.0, jz = 3.34;
      const CR = [C('#3d6f8c'), C('#8a4a3c'), C('#4f7a58'), C('#8a7a3c')];
      const crate = (cx, base, cz, color, ry) => {
        const w = .58, d = .38, h = .18, rail = .035, ca = Math.cos(ry), sa = Math.sin(ry);
        const at = (ox, oz) => [cx + ca * ox + sa * oz, cz - sa * ox + ca * oz];
        for (const oz of [-.12, 0, .12]) {
          const [px, pz] = at(0, oz);
          box(px, base + .018, pz, .52, .035, .04, color,
            { hard:true, ry, gloss:.24 });
        }
        for (const yy of [base + .065, base + .155]) {
          for (const oz of [-d / 2 + rail / 2, d / 2 - rail / 2]) {
            const [px, pz] = at(0, oz);
            box(px, yy, pz, w, rail, rail, color, { hard:true, ry, gloss:.26 });
          }
          for (const ox of [-w / 2 + rail / 2, w / 2 - rail / 2]) {
            const [px, pz] = at(ox, 0);
            box(px, yy, pz, rail, rail, d, color, { hard:true, ry, gloss:.26 });
          }
        }
        for (const ox of [-w / 2 + rail / 2, w / 2 - rail / 2])
          for (const oz of [-d / 2 + rail / 2, d / 2 - rail / 2]) {
            const [px, pz] = at(ox, oz);
            capsule(px, base + h / 2, pz, rail * .50, h, rail * .50, color,
              { gloss:.26 });
          }
      };
      for (const [ox, levels] of [[-.31, 3], [.31, 2]]) {
        let topZ = jz;
        for (let i = 0; i < levels; i++) {
          const k = jit(jx + ox, i * 3.7 + 3.20), ry = (k - .5) * .12;
          topZ = jz + (k - .5) * .035;
          crate(jx + ox, i * .20, topZ, CR[(i + (ox > 0 ? 2 : 0)) % 4], ry);
        }
        for (let i = 0; i < 6; i++) {
          const a = i * 2.399, r = i ? .06 + (i % 2) * .035 : 0;
          ball(jx + ox + Math.cos(a) * r, levels * .20 - .015, topZ + Math.sin(a) * r,
            .045, .040, .045, i % 2 ? C('#c46a35') : C('#a9b85a'), { gloss:.22 });
        }
      }
    }
    wallJunk(11.05, 3.30, 1, -1);        // a second bottle by number 16
    wallJunk(17.75, 3.28, 2, -1);        // hose, tarpaulin and canes by the brick pile
    wallJunk(-15.6, -2.36, 2, 1);        // the same against the block, west of the meters
    wallJunk(16.3, -2.52, 3, 1);         // brick and cardboard outside the hardware shop

    // The splash course on the two brick plinths along the north side, matching the one
    // `brickRun` now lays on every courtyard wall. Only over the stretches that are actually
    // plain plinth: the shop, the noodle place and the stairwell all have their own frontages
    // standing in that 30 cm, and a dirt band run blindly the full length of the block would
    // have gone straight through three of them.
    for (const [gx, gw, gz] of [[-13.15, 6.70, NB.z1 + .04], [-21.9, 10.80, -2.98]]) {
      box(gx, .155, gz, gw, .31, .38, tint(col.brick, .74, .014),
        { hard: true, mode: 11, gloss: G.matte, ...BRICKD });
      box(gx, .40, gz, gw, .20, .36, tint(col.brick, .87, .008),
        { hard: true, mode: 11, gloss: G.matte, ...BRICKD });
    }

    // the pole, its transformer, and the bundle of wires that crosses the alley
    const px0 = 1.4;
    taper(px0, 4.2, -2.20, .34, 8.6, .34, C('#9a9186'), { gloss: .22 });
    box(px0, 7.0, -2.20, 1.30, .14, .14, col.steelD, { hard: true, gloss: .3 });
    box(px0, 7.6, -2.20, 1.00, .12, .12, col.steelD, { hard: true, gloss: .3 });
    for (const o of [-.55, -.18, .18, .55]) {
      cyl(px0 + o, 7.14, -2.20, .06, .16, col.tarp, { gloss: .5 });
      cyl(px0 + o, 7.74, -2.20, .05, .14, col.tarp, { gloss: .5 });
    }
    cyl(px0 - .42, 5.9, -2.20, .28, .95, col.steelD, { gloss: .34 });
    box(px0 + .34, 5.5, -2.20, .50, .70, .34, col.steel, { hard: true, gloss: .34 });
    solid(px0 - .4, px0 + .4, -2.45, -1.95);
    // wires: to the wall opposite, along the alley, and a sagging bundle to the block
    for (let i = 0; i < 5; i++) {
      const y = 7.1 - (i % 2) * .6, sag = .35 + i * .06;
      capsule(px0, y - sag, .3 + i * .04, .022, 5.4, .022,
        col.black, { rz: Math.PI / 2, rx: 0, gloss: .2 });
      capsule(px0 + 6.0, y - .12, -2.16 - i * .05, .020, 12.0, .020, col.black,
        { rz: Math.PI / 2 + .04, gloss: .2 });
      capsule(px0 - 6.0, y - .10, -2.16 - i * .05, .020, 12.0, .020, col.black,
        { rz: Math.PI / 2 - .03, gloss: .2 });
    }
    // ---- the second pole, at the west end of the same run.
    //
    // Those five wires ran twelve metres west out of the first pole and then stopped in mid-air
    // over the middle of the alley, which is the one thing overhead cable never does. It goes to
    // a pole. And the west half of the hutong had nothing at all above two metres in it: the
    // whole upper third of every view down that way was blank render and sky, where a Beijing
    // alley is a net of cable, brackets and drop loops the entire length of it.
    //
    // Relocated to the real walk-up/service joint. At x=-12 the complete 76 cm collider sealed the
    // print-shop address and put its meter cabinet in the walking band. Here it is tight to the
    // wall, clear of the rebuilt facades and chess ensemble, while still terminating the cable run.
    const px1 = -16.85, pz1 = -2.78;
    taper(px1, 3.9, pz1, .32, 8.0, .32, C('#93897c'), { gloss: .22 });
    // A concrete pole, so it takes the two cast bands every one of them has round it, and a
    // painted number. Without them it was a plain grey cone and read as scaffolding.
    for (const by of [1.30, 4.60])
      cyl(px1, by, pz1, .175, .09, C('#857b6e'), { gloss: .20 });
    box(px1, 6.62, pz1, 1.16, .12, .12, col.steelD, { hard: true, gloss: .3 });
    for (const o of [-.46, -.15, .15, .46]) {
      cyl(px1 + o, 6.76, pz1, .055, .15, col.tarp, { gloss: .5 });
      // stub of wire off each insulator, turned back along the run
      capsule(px1 + o, 6.86, pz1 + .06, .014, .22, .014, col.black, { rx: .9, gloss: .2 });
    }
    // The wires from the first pole land on this one. The east span still finishes at x=-10.6;
    // each new connector is measured between that endpoint and this deeper service-line pole and
    // yawed through x/z, so relocating the pole does not leave a cable hanging in mid-air.
    for (let i = 0; i < 5; i++) {
      const y = 7.1 - (i % 2) * .6;
      const joinX = px0 - 12.0, joinZ = -2.16 - i * .05;
      const poleZ = pz1 + .04 - i * .05;
      const dx = joinX - px1, dz = joinZ - poleZ;
      capsule((px1 + joinX) / 2, y - .40 - i * .02, (poleZ + joinZ) / 2,
        .019, Math.hypot(dx, dz), .019, col.black,
        { ry: -Math.atan2(dz, dx), rz: Math.PI / 2, gloss: .2 });
      // and on west toward the dead end, dropping as they go
      if (i < 3) capsule(px1 - 5.2, y - .74 - i * .05, pz1 - .10 - i * .06, .019, 10.4, .019,
        col.black, { rz: Math.PI / 2 + .05, gloss: .2 });
    }
    // Two drops down the pole into a meter cabinet, and the slack coiled on a bracket — which is
    // where all the mess on a Chinese utility pole actually is. Straight cable alone reads as
    // telegraph; it is the coil and the tails that read as this city.
    for (const [ox, oz] of [[-.13, .17], [.10, .17]])
      capsule(px1 + ox, 4.35, pz1 + oz, .016, 4.60, .016, col.black, { rz: ox * .02, gloss: .24 });
    box(px1 + .02, 1.86, pz1 + .26, .42, .56, .22, col.steelD, { hard: true, gloss: .34 });
    box(px1 + .02, 1.86, pz1 + .38, .32, .44, .03, col.charcoal, { hard: true, gloss: .30 });
    box(px1 + .02, 1.94, pz1 + .40, .20, .16, .02, C('#8d968f'), { hard: true, gloss: .26 });
    for (let i = 0; i < 14; i++) {
      const a = i * Math.PI / 7;
      capsule(px1 - .34 + Math.cos(a) * .29, 3.20 + Math.sin(a) * .29, pz1 + .06,
        .022, .134, .022, C('#1e2126'), { rz: a, gloss: .26 });
    }
    capsule(px1 - .34, 3.52, pz1 + .16, .012, .22, .012, col.steelD,
      { rx: Math.PI / 2, gloss: G.metal });
    solid(px1 - .38, px1 + .38, pz1 - .28, pz1 + .28);
    // Laundry strung across the alley, because it always is — but well clear of your own
    // doorway, where it hung straight across the view of the door you come out of.
    // Kept over the south half of the alley. Strung down the middle it hung a metre in front
    // of the camera in every view along the hutong.
    // Both lines are in the RESIDENTIAL half of the hutong now, and that is a rule, not a taste:
    // a line hangs at y 2.4 .. 3.0 across the middle of the alley, one and a half metres in front
    // of the camera in every view along it, and the fascia band the shops now share starts at
    // 3.12. So washing over a shopfront is washing over its name — the second line used to sit at
    // x 16.3..18.7, dead centre of 五金电器's 6.4 m board at 14.6..21.0, and js/street-alley.js's
    // third line sat at 2.86..6.06 in front of 幸福超市 and the 夜市 gateway. From the pavement
    // you could not read either sign.
    //
    // West of x -9.5 there is no shopfront on either side, which is where the three of them go:
    // -23.8..-22.2, -19.6..-16.4 (that one in street-alley.js) and -14.35..-12.0. It also reads
    // as a real street — the washing end of a hutong and the trading end of it are not the same
    // fifty metres.
    capsule(-12.95, 3.08, 2.52, .016, 4.15, .016, col.steel,
      { rz: Math.PI / 2 + .035, gloss: .3 });
    washing(-14.35, 3.04, 2.55, 4, -.010, '衣服');
    // a second, shorter line at the west end
    capsule(-22.85, 2.99, 2.66, .016, 3.20, .016, col.steel,
      { rz: Math.PI / 2 - .03, gloss: .3 });
    washing(-23.80, 2.95, 2.63, 3, .010);
    // Seven small mixed garments sit behind the main gate view, and no word is printed on any of
    // them. 衣服 is in the dictionary and was reachable nowhere in the district — the flat teaches
    // it off the wardrobe, so a player who never opened the wardrobe never met it.
    thing('衣服', -12.80, 2.84, 2.54, '衣服晾在外面，明天就干了。',
      'The washing is out. It will be dry tomorrow.',
      '衣服 covers everything you wear. 一件衣服 — 件 is its measure word.',
      { focus: [-12.60, .40], reach: 2.4 });

    // the blue enamel street plate on the corner of the wall
    box(23.0, 2.30, CWZ - .24, 1.90, .48, .06, col.blueSign, { hard: true, gloss: .34, tag: '胡同' });
    B.glyphs(23.0, 2.30, CWZ - .28, Math.PI, '杨柳胡同',
      { size: .30, gap: .12, color: col.white, mode: 1, tag: '胡同', lift: .008 });
    thing('胡同', 21.0, 2.90, CWZ - .30, '我住在一条胡同里。', 'I live down a hutong.',
      'A 胡同 is one of the old alleys. The plate gives its name.',
      { focus: [21.5, 1.2], reach: 2.6 });

    // ---- 夜市 the mouth of the night market, in the north wall towards the east end.
    //
    // A gap between two buildings that is a service lane by day and the best-smelling forty metres
    // in the district after seven. What the player sees from here is deliberately almost nothing
    // in the afternoon — a dark slot with a shut gate across it and a dead sign over the top — and
    // then the same slot at eight with the sign lit, the light of a hundred bulbs coming out of it
    // and smoke drifting across the alley. The whole point of the place is that it is not there
    // all day, so the entrance has to make the difference visible from thirty metres.
    // It goes in the *courtyard* wall on the south side rather than in the shop line opposite, and
    // that is not an aesthetic choice. The north side of the alley between the block and the
    // subway entrance is solid shopfronts — a lit pane and a fascia every four metres — and a
    // gateway cut into it lands on top of somebody's window, which is exactly what the first
    // attempt did: the gap filled with the glow of a shop interior and the lane behind it was
    // never drawn, because a shopfront was standing in front of it. The courtyard run is a plain
    // brick wall for eleven metres, which is what a side lane actually opens off.
    const MK = 4.60;                                  // x of the market gate
    const MZ = CWZ;                                   // the courtyard wall line
    // The 2.8 m break in the courtyard wall is the opening; the entrance should frame it, not
    // bury it in two 1.8 m masonry towers. Four narrow steel posts make a shallow portal with a
    // front and a back face. Stone shoes take the posts down to the paving, side ties reveal the
    // frame's 78 cm depth from an oblique view, and knee braces explain how the crossbeams stay up.
    // Nothing crosses the opening below 3.18 m, leaving a clean player-height view into the lane.
    const MH = 1.50, MF = MZ - .18, MR = MZ + .61;
    for (const s of [-1, 1]) {
      const px = MK + s * MH;
      // Two-piece shoes, small enough to read as foundations rather than replacement piers.
      box(px, .10, MZ + .20, .46, .20, .88, col.stoneD,
        { hard: true, mode: 12, gloss: .16 });
      box(px, .25, MZ + .20, .34, .10, .66, col.stone,
        { hard: true, mode: 12, gloss: .18 });
      for (const pz of [MF, MR]) {
        box(px, 1.76, pz, .16, 2.96, .16, col.charcoal,
          { hard: true, gloss: .28, tag: '夜市' });
        // Base plate and four visible fixings: the post is bolted down, not balanced on the shoe.
        box(px, .34, pz, .28, .035, .28, col.steelD, { hard: true, gloss: G.metal });
        for (const dx of [-.09, .09]) for (const dz of [-.09, .09])
          ball(px + dx, .37, pz + dz, .018, .010, .018, col.steel, { gloss: G.metal });
      }
      box(px, 3.20, (MF + MR) / 2, .16, .12, MR - MF + .16, col.steelD,
        { hard: true, gloss: G.metal, tag: '夜市' });
      // Paired knee braces on both elevations. Their open triangles make the load path visible
      // without putting a solid shoulder back into the gateway.
      for (const pz of [MF, MR]) {
        capsule(px - s * .22, 3.04, pz, .030, .54, .030, col.steelD,
          { rz: s * .78, gloss: G.metal, tag: '夜市' });
        capsule(px, 2.78, pz + (pz === MF ? .19 : -.19), .025, .42, .025, col.steelD,
          { rx: pz === MF ? -.62 : .62, gloss: G.metal, tag: '夜市' });
      }
    }
    blocker(MK - 3.3, MK - 1.3, MZ - .3, MZ + 2.0, 6.0);
    blocker(MK + 1.3, MK + 3.3, MZ - .3, MZ + 2.0, 6.0);
    solid(MK - 3.3, MK - 1.35, MZ - .30, MZ + 1.9);
    solid(MK + 1.35, MK + 3.3, MZ - .30, MZ + 1.9);
    // Two slender crossbeams, with short depth ties between them: a real portal frame in plan,
    // not a lintel slab pasted onto the front elevation.
    for (const pz of [MF, MR])
      box(MK, 3.30, pz, MH * 2 + .18, .16, .16, col.charcoal,
        { hard: true, gloss: .28, tag: '夜市' });
    for (const sx of [-.92, .92])
      box(MK + sx, 3.30, (MF + MR) / 2, .10, .12, MR - MF + .16, col.steelD,
        { hard: true, gloss: G.metal, tag: '夜市' });

    // 夜市 is mounted as two open sign cages. The old 2.7 × .96 m charcoal board hid the frame
    // and turned the entrance into a billboard; these rails keep the characters legible by day
    // while the lane, sky and bulb strings remain visible between and around them.
    for (const s of [-1, 1]) {
      const gx = MK + s * .42;
      // Top/bottom rails frame the cage; the slimmer centre rail is the actual mounting carrier
      // for the character. Without it the ink sat 31 cm from any solid support in an otherwise
      // honest open frame — readable, but physically floating.
      for (const [y, h] of [[3.60, .045], [3.96, .030], [4.30, .045]])
        box(gx, y, MF - .02, .70, h, .055, col.steelD,
          { hard: true, gloss: G.metal, tag: '夜市' });
      for (const x of [gx - .33, gx + .33])
        box(x, 3.95, MF - .02, .045, .74, .055, col.steelD,
          { hard: true, gloss: G.metal, tag: '夜市' });
      capsule(gx, 4.43, MF + .18, .018, .30, .018, col.steelD,
        { rx: Math.PI / 2, gloss: G.metal, tag: '夜市' });
    }
    for (const g of B.glyphs(MK, 3.96, MF - .06, Math.PI, '夜市',
      { size: .48, gap: .18, color: C('#e04a3a'), mode: 1, glow: .10, tag: '夜市', lift: .01 }))
      litten(g, 2.4);
    for (const s of [-1, 1])
      litten(capsule(MK + s * 1.23, 3.95, MF - .065, .022, .64, .022, C('#48c07a'),
        { gloss: .34, glow: .06, tag: '夜市' }), 2.0);

    // Receding side returns replace the wall that used to close the lane only 1.85 m behind the
    // threshold. Short brick bays, their capped joints, three cross-wires and progressively
    // smaller bulbs give a measured six metres of depth while keeping the central 2.56 m open.
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const rz = MZ + 1.16 + i * 1.02;
        box(MK + s * 1.37, 1.20, rz, .18, 2.40, .86,
          tint(C('#4b443d'), .92 + i * .02),
          { hard: true, mode: 11, gloss: G.matte, ...BRICK, tag: '夜市' });
        box(MK + s * 1.37, 2.43, rz, .26, .06, .92, col.tileD,
          { hard: true, mode: 13, gloss: .16, ...RTILE });
      }
    }
    for (let row = 0; row < 3; row++) {
      // Below the covered passage eaves, with 2.15 m minimum bulb clearance. At the former 3.08 m
      // height every lamp sat inside/above the retained courtyard roof and vanished from the lane.
      const rz = MZ + 1.22 + row * 1.72, yy = 2.45 - row * .07;
      capsule(MK, yy, rz, .010, 2.58, .010, col.black,
        { rz: Math.PI / 2, gloss: .18 });
      for (const ox of [-.84, 0, .84]) {
        capsule(MK + ox, yy - .08, rz, .006, .15, .006, col.black, { gloss: .18 });
        litten(ball(MK + ox, yy - .18, rz, .055 - row * .006, .065 - row * .006,
          .055 - row * .006, C('#f3b45f'),
          { mode: 1, glow: .05, gloss: .18, tag: '夜市' }), 1.9);
      }
    }
    // and the warm spill of the market itself out through the gap. A pool on the ground rather
    // than a panel standing in the opening: the first version was an emissive strip and it read
    // as a lightbox bolted into the gateway, which is not what light coming out of a doorway
    // looks like. On the `lampPools` list, so it comes up with the street lamps and is off at noon.
    lampPools.push(glow(M.trs(MK, .04, MZ - .60, 0, 3.4, 1, 3.0), C('#f0a860'), 0));
    lampPools.push(glow(M.trs(MK, .04, MZ + 1.30, 0, 2.7, 1, 2.6), C('#ffb070'), 0));
    // What comes out of the night-market gateway. The two pools are the light on the ground;
    // this is the same light on the brick piers either side of the gap, which is most of what
    // tells you from down the alley that there is somewhere lit through there.
    B.light(MK, 2.10, MZ - .30, [1.0, .70, .42], .55, 5.0);
    thing('夜市', MK, 2.60, MZ - .10, '晚上七点以后夜市才开。',
      'The night market only opens after seven in the evening.',
      '夜 night + 市 market. Everything in there is 小吃 — street food — and it is the one ' +
      'place in the neighbourhood that is busier at nine than at noon.',
      { focus: [MK, MZ - 1.40], reach: 2.6 });

    // ---- the west end. A shell builder keeps a pitched house honest without making it a single
    // opaque cuboid: bay-sized front/back masonry, visible end returns, then a roof. It is local to
    // this compound so the rest of street.js keeps its authored geometry and RNG stream.
    const shellHouse = (cx, cz, w, d, h, rise, tone, alongZ = false) => {
      const nx = Math.max(2, Math.ceil(w / 2.55)), nz = Math.max(2, Math.ceil(d / 2.55));
      for (const s of [-1, 1]) for (let i = 0; i < nx; i++) {
        const bw = w / nx, bx = cx - w / 2 + bw * (i + .5);
        box(bx, h / 2, cz + s * (d / 2 - .15), bw - .07, h, .30,
          tint(tone, .95 + ((i + (s > 0 ? 1 : 0)) % 3) * .035),
          { hard:true, mode:11, gloss:G.matte, ...BRICK });
      }
      for (const s of [-1, 1]) for (let i = 0; i < nz; i++) {
        const bd = d / nz, bz = cz - d / 2 + bd * (i + .5);
        box(cx + s * (w / 2 - .15), h / 2, bz, .30, h, bd - .07,
          tint(tone, .94 + ((i + (s > 0 ? 2 : 0)) % 3) * .04),
          { hard:true, mode:11, gloss:G.matte, ...BRICK });
      }
      tileRoof(cx, cz, alongZ ? d : w, alongZ ? w : d, h, rise, alongZ);
    };

    // 李家 is five joined building phases around a narrow rear yard, not a 12 × 23.5 m block.
    // All four east faces remain exactly on WX, preserving the live door reach and the original
    // solid/blocker footprint, while the depths, eaves and ridges step away behind them.
    const WX = -33.4;                                  // the building line at the dead end
    const liPhases = [
      { z:-12.10, d:5.55, w:5.80, h:5.35, r:1.00, c:tint(col.brick,.78,-.010) },
      { z:-6.57,  d:5.35, w:6.35, h:6.05, r:1.18, c:tint(col.brick,.88, .002) },
      { z:-.48,   d:6.48, w:5.20, h:7.15, r:1.36, c:tint(col.brick,.98, .008) },
      { z:4.78,   d:3.82, w:4.55, h:4.72, r:.86,  c:tint(col.brick,.83,-.006) },
      { z:7.22,   d:1.02, w:4.20, h:4.28, r:.72,  c:tint(col.brick,.76,-.012) },
    ];
    for (const p of liPhases)
      shellHouse(WX - p.w / 2, p.z, p.w, p.d, p.h, p.r, p.c, true);
    blocker(WX - 12.4, WX, -15.2, 8.7, 11.2);
    solid(WX - 12.4, WX, -15.2, 8.8);

    // Eight windows, and exactly eight random warmth draws as before. They no longer sit in a
    // repeated 4 × 2 grid: each construction phase has its own sill, proportion and upper datum.
    const liWindows = [
      [-12.25,1.48,1.28,1.16,0],[-12.02,4.08,1.08,1.22,1],
      [-7.55,1.60,1.48,1.24,0],[-6.35,4.58,1.24,1.30,1],
      [-2.32,1.66,1.34,1.34,0],[-2.56,5.32,1.52,1.36,1],
      [4.12,1.48,1.16,1.18,0],[5.22,3.46,1.02,1.08,1],
    ];
    for (const [wz, wy, ww, wh, ac] of liWindows) {
      box(WX + .035, wy, wz, .07, wh + .16, ww + .16, col.glassDark,
        { hard:true, gloss:.20 });
      pane(box(WX + .075, wy, wz, .025, wh, ww, col.glassDay,
        { hard:true, mode:1, gloss:G.glass }), rnd());
      box(WX + .10, wy, wz, .04, .055, ww, col.frame, { hard:true, gloss:G.paint });
      box(WX + .10, wy, wz, .04, wh, .055, col.frame, { hard:true, gloss:G.paint });
      box(WX + .13, wy - wh / 2 - .065, wz, .24, .08, ww + .20, col.stone,
        { hard:true, gloss:.22 });
      if (ac) {
        // Proper condenser: cabinet, louvred face, brackets and a drain line—not a white cube.
        const az = wz + ww / 2 + .62;
        box(WX + .28, wy - .86, az, .42, .54, .76, col.white,
          { hard:true, gloss:.25, round:.035 });
        for (let k = -2; k <= 2; k++)
          box(WX + .505, wy - .86 + k * .085, az, .028, .042, .60, col.steelD,
            { hard:true, gloss:.28 });
        for (const s of [-1, 1])
          box(WX + .15, wy - 1.18, az + s * .27, .34, .07, .06, col.steelD,
            { hard:true, gloss:G.metal });
        capsule(WX + .13, wy - 1.47, az + .34, .022, .62, .022, col.white,
          { gloss:.20 });
      }
    }

    // 李家的 recessed-looking entrance. The frame, returned jambs, transom and bracketed tile hood
    // project toward the square, leaving the leaf in shadow while ending at x=-33.00—still 80 cm
    // behind WEST's live clamp and 62 cm behind the outside point at (-32.38,1.20).
    box(WX + .055, 1.08, 1.20, .07, 2.16, 1.28, C('#34231f'),
      { hard:true, gloss:.12 });
    for (const s of [-1, 1])
      box(WX + .16, 1.23, 1.20 + s * .72, .32, 2.46, .22, col.brickL,
        { hard:true, mode:11, gloss:G.matte, ...BRICK });
    box(WX + .16, 2.36, 1.20, .32, .22, 1.66, col.brickL,
      { hard:true, mode:11, gloss:G.matte, ...BRICK });
    for (const s of [-1, 1])
      box(WX + .10, 1.06, 1.20 + s * .31, .07, 2.08, .60,
        s > 0 ? tint(col.red,.90) : col.red, { hard:true, gloss:.24 });
    box(WX + .13, 2.13, 1.20, .08, .10, 1.20, col.trunk, { hard:true, gloss:G.wood });
    for (const s of [-1, 1])
      box(WX + .18, 2.48, 1.20 + s * .64, .36, .15, .13, col.trunk,
        { hard:true, gloss:G.wood, rz:-.18 });
    box(WX + .18, 2.63, 1.20, .44, .12, 1.92, col.tileD,
      { hard:true, mode:13, gloss:.18, rz:-.10, ...RTILE });
    capsule(WX + .36, 2.59, 1.20, .050, 1.94, .050, col.tileD,
      { rx:Math.PI / 2, gloss:.18, ...RTILE });
    box(WX + .30, .09, 1.20, .56, .18, 1.60, col.stoneD,
      { hard:true, gloss:.22 });
    // Li Shifu lives behind the red door. An enamel plate, caged porch light and repair bag tie
    // the residential entrance to the mechanic the player sees every day.
    box(WX + .15, 1.62, .34, .05, .68, .42, col.blueSign, { hard: true, gloss: .30 });
    B.glyphs(WX + .18, 1.62, .34, Math.PI / 2, '李家',
      { size: .18, gap: .05, vertical: true, color: col.white, mode: 1, lift: .008 });
    litten(ball(WX + .22, 2.36, 1.20, .075, .085, .075, C('#ffe3a6'),
      { mode: 1, glow: .22 }), .9);
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      capsule(WX + .31 + Math.cos(a) * .09, 2.36 + Math.sin(a) * .09, 1.20,
        .008, .20, .008, col.steelD, { rz:a, gloss:G.metal });
    }
    box(WX + .34, .27, 2.12, .44, .38, .68, col.charcoal,
      { gloss: .22, round: .04 });
    capsule(WX + .56, .56, 2.12, .035, .54, .035, col.steel,
      { rz: .65, gloss: G.metal });
    // Meter cabinet assembled from a weather hood, recessed board and three round meters.
    box(WX + .12, 1.56, -6.70, .18, .92, 1.02, col.steelD,
      { hard:true, gloss:.30, round:.035 });
    box(WX + .225, 1.56, -6.70, .045, .72, .82, col.charcoal,
      { hard:true, gloss:.18 });
    for (let k = -1; k <= 1; k++) {
      cyl(WX + .265, 1.67, -6.70 + k * .25, .105, .035, col.glassDay,
        { rz:Math.PI / 2, gloss:G.glass });
      capsule(WX + .27, 1.40, -6.70 + k * .25, .012, .10, .012, col.white,
        { gloss:.20 });
    }
    box(WX + .28, 2.08, -6.70, .42, .08, 1.12, col.steel,
      { hard:true, gloss:G.metal, rz:-.10 });
    for (const z of [-13.9,-4.2,2.58,7.55])
      capsule(WX + .15, 2.10, z, .045, 4.10, .045, col.steelD, { gloss:.26 });
    bike(WX + .80, -5.6, .08, col.bikeO, false, false);

    // The north and south edges are clusters of houses with alleys between their rear ranges—not
    // two giant closure blocks. Their existing colliders remain byte-for-byte the same.
    // The walk-up closes the east half; these ranges stop at its west return instead of occupying
    // the same volume. The old closure and walk-up overlapped for 3.3 m in x.
    shellHouse(-30.70, -6.05, 6.60, 6.10, 6.70, 1.18, tint(col.brick,.79,-.008));
    shellHouse(-30.40, -12.85, 6.80, 5.90, 8.15, 1.32, tint(col.brick,.72,-.012));
    shellHouse(-29.90, -19.40, 7.80, 4.80, 6.25, 1.00, tint(col.brick,.75,-.006));
    blocker(-34.0, -24.0, -22.2, -3.0, 13.0);
    solid(-34.0, -24.0, -22.2, -2.95);
    brickRun(-33.2, -23.6, 7.4, 2.55);
    shellHouse(-31.10, 11.10, 5.60, 6.05, 5.20, .88, tint(col.brick,.90,.004));
    shellHouse(-26.45, 11.55, 3.90, 6.90, 6.65, 1.16, tint(col.brick,.78,-.008));
    shellHouse(-29.00, 16.65, 8.80, 4.55, 5.75, .96, tint(col.brick,.84,.002));
    blocker(-34.0, -24.0, 8.0, 19.0, 8.2);

    // ---- the alley's north-side walk-up: three wings around one stair, each with a setback and
    // its own parapet. Perimeter walls are built in bays, so no tagged or untagged mega-box remains.
    const flatWing = (cx, cz, w, d, h, face, tone) => {
      const nx = Math.max(2, Math.ceil(w / 2.45)), nz = Math.max(2, Math.ceil(d / 2.65));
      for (const s of [-1, 1]) for (let i = 0; i < nx; i++) {
        const bw = w / nx, bx = cx - w / 2 + bw * (i + .5);
        box(bx, h / 2, cz + s * (d / 2 - .15), bw - .07, h, .30,
          tint(tone, .97 + ((i + (s > 0 ? 1 : 0)) % 3) * .025),
          { hard:true, mode:14, gloss:G.paint, ...RENDER });
        box(bx, .66, cz + s * (d / 2 + .015), bw - .12, 1.32, .11, col.brick,
          { hard:true, mode:11, gloss:G.matte, ...BRICK });
        box(bx, h + .26, cz + s * (d / 2 - .04), bw - .03, .52, .22, col.renderD,
          { hard:true, gloss:G.paint });
      }
      for (const s of [-1, 1]) for (let i = 0; i < nz; i++) {
        const bd = d / nz, bz = cz - d / 2 + bd * (i + .5);
        box(cx + s * (w / 2 - .15), h / 2, bz, .30, h, bd - .07, tone,
          { hard:true, mode:14, gloss:G.paint, ...RENDER });
        box(cx + s * (w / 2 - .04), h + .26, bz, .22, .52, bd - .04, col.renderD,
          { hard:true, gloss:G.paint });
      }
      flat(cx, h + .025, cz, w - .42, d - .42, col.charcoal, { gloss:.16 });
    };
    const walkWings = [
      { x:-25.25,z:-8.00,w:4.10,d:9.60,h:10.82,face:-3.20,c:tint(col.render,.94,-.010) },
      { x:-21.90,z:-7.30,w:2.55,d:8.80,h:12.18,face:-2.90,c:tint(col.render,1.04,.006) },
      { x:-18.65,z:-8.28,w:3.85,d:9.86,h:11.36,face:-3.35,c:tint(col.render,.98,.012) },
    ];
    for (const w of walkWings) flatWing(w.x, w.z, w.w, w.d, w.h, w.face, w.c);
    blocker(-27.3, -16.5, -17.6, -2.90, 11.2);
    solid(-27.3, -16.4, -17.6, -2.85);
    for (let f = 1; f < 4; f++) for (let i = 0; i < 3; i++) {
      const wx = -25.4 + i * 3.5;
      const wing = walkWings[i], fy = f * 2.80 + 1.60;
      fwin(wx, fy, wing.face, i === 1 ? 1.10 : 1.72, i === 1 ? 1.62 : 1.34);
      if (rnd() > .45) acBox(wx + (i === 2 ? -1.12 : 1.08), fy - 1.02, wing.face);
    }
    // One projected balcony stack on each family wing, and an aligned slot over the stair. Rail,
    // kick plate and side returns keep these from reading as slabs bolted to a rendered cube.
    for (const [bx, by, bz] of [[-25.40,7.25,-3.20],[-18.40,4.45,-3.35],[-18.40,10.02,-3.35]]) {
      box(bx, by - .72, bz + .42, 1.92, .13, .76, col.renderD,
        { hard:true, gloss:G.paint });
      for (const s of [-1, 1])
        box(bx + s * .91, by - .22, bz + .42, .10, 1.10, .74, col.renderD,
          { hard:true, gloss:G.paint });
      capsule(bx, by + .26, bz + .82, .030, 1.84, .030, col.rail,
        { rz:Math.PI / 2, gloss:.34 });
      for (let k = -3; k <= 3; k++)
        capsule(bx + k * .27, by - .20, bz + .82, .018, .88, .018, col.rail,
          { gloss:.34 });
    }
    // A sheltered common entrance makes the central wing a stair, not a third window column.
    box(-21.90, 1.18, -2.82, 1.18, 2.34, .08, C('#24282b'), { hard:true, gloss:.12 });
    for (const s of [-1, 1])
      box(-21.90 + s * .67, 1.24, -2.75, .18, 2.48, .26, col.brickL,
        { hard:true, mode:11, gloss:G.matte, ...BRICK });
    box(-21.90, 2.39, -2.75, 1.52, .22, .26, col.brickL,
      { hard:true, mode:11, gloss:G.matte, ...BRICK });
    for (const s of [-1, 1])
      box(-21.90 + s * .35, 1.16, -2.69, .05, 2.14, .58, col.glassDark,
        { hard:true, mode:1, gloss:G.glass });
    box(-21.90, 2.67, -2.54, 1.86, .12, .70, col.renderD,
      { hard:true, gloss:G.paint, rz:-.05 });
    for (const s of [-1, 1])
      box(-21.90 + s * .68, 2.46, -2.69, .12, .34, .46, col.renderD,
        { hard:true, gloss:G.paint });
    box(-21.18, 1.64, -2.54, .08, .52, .40, col.blueSign,
      { hard:true, gloss:.30 });
    B.glyphs(-21.15, 1.64, -2.54, 0, '二单元',
      { size:.13, gap:.03, vertical:true, color:col.white, mode:1, lift:.006 });
    // A real stair overrun on the middle wing: four returned walls, an access leaf, coping and
    // drainage. The former single 4.5 m³ roof box looked like a crate dropped on the building.
    const HX = -21.90, HZ = -7.15, HY = 12.82;
    box(HX, HY, HZ - .96, 1.66, 1.28, .18, col.renderD,
      { hard:true, mode:14, gloss:G.paint, ...RENDER });
    for (const s of [-1, 1])
      box(HX + s * .74, HY, HZ, .18, 1.28, 1.92, tint(col.renderD, .96 + s * .025),
        { hard:true, mode:14, gloss:G.paint, ...RENDER });
    for (const s of [-1, 1])
      box(HX + s * .53, HY, HZ + .96, .42, 1.28, .18, col.renderD,
        { hard:true, mode:14, gloss:G.paint, ...RENDER });
    box(HX, HY + .50, HZ + .96, .64, .28, .18, col.renderD,
      { hard:true, mode:14, gloss:G.paint, ...RENDER });
    box(HX, HY - .11, HZ + 1.065, .64, 1.02, .055, col.charcoal,
      { hard:true, gloss:.18 });
    for (let k = -2; k <= 2; k++)
      box(HX, HY - .20 + k * .14, HZ + 1.10, .48, .035, .02, col.steelD,
        { hard:true, gloss:.30 });
    flat(HX, HY + .675, HZ, 1.98, 2.30, col.charcoal, { gloss:.16 });
    for (const s of [-1, 1])
      box(HX + s * .90, HY + .73, HZ, .10, .14, 2.28, col.renderD,
        { hard:true, gloss:G.paint });
    capsule(HX + .88, HY - .03, HZ - .80, .028, 1.46, .028, col.steelD,
      { gloss:.30 });
    // Separate condenser and aerial clusters over the family wings, never one repeated object
    // above every bay.
    for (const s of [-1, 1])
      cyl(-25.55 + s * .58, 11.48, -8.10, .38, .66, col.steel,
        { gloss:.34 });
    for (let k = 0; k < 7; k++)
      cyl(-18.92 + k * .17, 11.92, -8.55, .055, .96, col.steel,
        { rx:-.55, gloss:.40 });

    // The square's scholar tree lives on the far western shoulder now. At (-29.2,3.7) its
    // whitewashed trunk stood directly across the centered 公厕 approach and made the two entries
    // read as slits. This position keeps its grate clear of the gate focus, water butt, 李家 door,
    // chess and mahjong; the slightly younger crown still shades the corner without filling it.
    tree(-32.0, 3.0, 1.05, false);
    // mahjong table in the open square, four stools, and a thermos
    box(-29.0, .74, .6, 1.15, .08, 1.15, col.tarp, { hard: true, gloss: .2, mode: 7 });
    for (const [ox, oz] of [[-.48, -.48], [.48, -.48], [-.48, .48], [.48, .48]])
      capsule(-29.0 + ox, .37, .6 + oz, .045, .72, .045, col.trunkL, { gloss: G.wood });
    for (const [ox, oz] of [[-1.05, 0], [1.05, 0], [0, -1.05], [0, 1.05]]) {
      box(-29.0 + ox, .42, .6 + oz, .38, .06, .38, col.trunkL, { hard: true, gloss: G.wood });
      for (const [a, b] of [[-.14, -.14], [.14, -.14], [-.14, .14], [.14, .14]])
        capsule(-29.0 + ox + a, .21, .6 + oz + b, .032, .40, .032, col.trunk, { gloss: G.wood });
    }
    // 麻将. Fourteen tiles used to lie flat on the cloth in two tidy rows of seven, three
    // centimetres thick, which at this size read as a packet of crackers tipped out on a table.
    // A mahjong table is recognisable from ten metres away for exactly one reason: the tiles
    // stand on edge in long straight rows, backs to the middle. So they stand — a hand in front
    // of each of the two men who are actually sitting there, a two-tier wall across the far side
    // where the next hand comes from, and five discards face-up in the centre.
    const MJ = C('#e8e2cf'), MJB = C('#39685a'), MJI = C('#2f4f6f');
    // Nine to a hand, not ten. At ten the row reached z .97 and the far tile pushed into the wall
    // across the top of the table.
    for (const [hx, out] of [[-29.46, -1], [-28.54, 1]])
      for (let i = 0; i < 9; i++) {
        const tz = .60 + (i - 4) * .082;
        box(hx, .833, tz, .036, .106, .076, MJ, { hard: true, gloss: .34 });
        // The green back faces the middle of the table and the printed face turns toward whoever
        // is holding it, which is the way round that makes a hand read as a hand. Both sides the
        // same colour and the rows were a run of white fence posts.
        box(hx - out * .020, .833, tz, .004, .094, .064, MJB, { hard: true, gloss: .30 });
      }
    for (let i = 0; i < 9; i++) for (let k = 0; k < 2; k++)
      box(-29.33 + i * .083, .800 + k * .038, 1.03, .077, .036, .106, MJ,
        { hard: true, gloss: .32 });
    for (let i = 0; i < 5; i++)
      box(-29.16 + (i % 3) * .095, .796, .54 + ((i / 3) | 0) * .10, .076, .028, .106,
        MJ, { hard: true, gloss: .34, ry: (i - 2) * .09 });
    for (let i = 0; i < 5; i++)
      box(-29.16 + (i % 3) * .095, .812, .54 + ((i / 3) | 0) * .10, .034, .004, .058,
        MJI, { hard: true, gloss: .26, ry: (i - 2) * .09 });
    // The 暖壶 — the enamelled vacuum flask the tea comes out of. It was a bare red cylinder
    // hanging seventy centimetres off the ground beside the table with nothing under it and no
    // cap on it. It stands on the paving now, which is where these always are, with its cork, its
    // bail handle and a jam jar of tea next to it.
    const HWX = -28.16, HWZ = 1.30;
    cyl(HWX, .155, HWZ, .108, .31, col.plastic, { gloss: .34 });
    cyl(HWX, .19, HWZ, .110, .09, col.cream, { gloss: .26 });
    taper(HWX, .335, HWZ, .216, .07, .216, col.plastic, { gloss: .32 });
    cyl(HWX, .385, HWZ, .062, .04, col.steel, { gloss: .44 });
    cyl(HWX, .418, HWZ, .050, .03, col.trunkL, { gloss: G.wood });
    for (const t of [-1, 1])
      capsule(HWX + t * .105, .30, HWZ, .010, .10, .010, col.steelD, { gloss: G.metal });
    capsule(HWX, .368, HWZ, .009, .21, .009, col.steelD,
      { rz: Math.PI / 2, gloss: G.metal });
    cyl(HWX + .19, .055, HWZ - .05, .045, .11, C('#8a7a4a'), { gloss: .58 });
    cyl(HWX + .19, .115, HWZ - .05, .046, .012, col.steelD, { gloss: .40 });
    // Keep the table collider but fit it to the table/apron rather than the whole stool circle.
    // street-west's tightened chess collider leaves a 1.25 m northern body corridor. South of the
    // table the tree no longer forms the other edge at all: its inflated collider is 1.26 m west
    // and .91 m south-west of the table's, leaving the whole public-facility apron open.
    solid(-29.7, -28.3, .15, 1.05);
    shade(-29.0, .6, 2.6, 2.6, .3);

    // ============================================================ the road, east end
    // pavement, tactile strip, railings, lamps, and the bus stop
    for (let z = -14; z <= 14; z += 2.4)
      flat(RD0 - 1.4, .007, z, 1.0, 2.0, col.paintY, { gloss: .14 });
    // The former footway railing consumed the exact 2.00 m branch-street minimum. Protection now
    // lives in the continuous 1.80 m median/platform; the footway remains a genuine clear route.
    // The shelter has its own two luminaires and pavement pool. A second full-height lamp at
    // the stop stood inside BANK_OUT's five-metre orbit and turned the civic pocket into a thicket.
    // Keep the far-side approach triangle open and hold every fixture in a kerb furnishing band.
    // At (39.4,-3.0) the first 60 cm footprint stood between the stop line and zebra; merely moving
    // it to z=4.5 left it mid-footway.  x=RD1+.50 puts both east lamps beside the kerb and preserves
    // a continuous two-metre-plus building-side route past the office return and the tree pit.
    // Preserve the lamp/tree rhythm in the protected median. `tree()` supplies a real 1.5 m pit,
    // cast-iron grate, root footprint, shadow and collider; all three positions are beyond the
    // south stop line and outside both crossing sight triangles.
    const medianX = (PL0 + PL1) / 2;
    lamp(medianX, 5.0); lamp(RD1 + .50, 4.5); lamp(RD1 + .50, 11.0);
    lamp(-8.0, -2.3, 1); lamp(12.0, -2.3, 1);
    // -5.2 → 6.5. This is the same fault as the tree that used to stand at x 4.6 in the alley:
    // at (25.4, -5.2) its crown filled the view of 药店's door and fascia from every position on
    // the footway south of it. 6.5 is opposite the alley mouth, where the west side has no
    // frontage at all and a tree is just a tree.
    tree(medianX, 6.5, 1.1, false); tree(medianX, 9.4, 1.0, false);
    // The tree that stood at (39.6, -8.0) is GONE — the third time this fault has turned up
    // today and the third time there was nowhere to move it to. It stood in the mouth of
    // 新天地步行街 (js/street-lane.js opens the lane at z -12.60 .. -5.80), directly under the
    // gateway arch, and the far pavement's remaining gaps are the 2.48 m between the metro canopy
    // and the bike rank and the 1.4 m between the notice board and a hedge planter. A tree in a
    // street entrance is worse than one tree fewer.
    // This tree shares the same kerb furnishing band as the two lamps.  Its former x=39.60 pit
    // combined with the office return to leave only 1.70 m of usable pavement.
    tree(RD1 + .50, 6.0, 1.15, false);

    // The stop is a protected island stop, not furniture in a two-metre footway. The canopy spans
    // the 27.67..29.47 platform, while every ground-contact part is held inside its WESTERN
    // 30 cm furnishing strip (27.67..27.97). That leaves a measured 1.50 m clear platform strip
    // to the bus swept envelope at x29.47 and keeps the west cycle bypass entirely separate.
    const bsx = 28.40, furnishX = 27.82, bsz = -12.0;
    // Six-and-a-half metres still shelters the full bench and route panel, while pulling its north
    // end back from the bank camera. Three separately framed panes keep it transparent and avoid
    // rebuilding the former advert as one sheet of tinted glass.
    // Pull the roof south with the occupied bench/panes.  Its old north edge at z=-8.8 was not a
    // collider, but it still filled BANK_OUT's entire upper-right orbit; z=-10.3 now leaves the
    // passenger crossing open to sky while the covered furniture remains under 4.9 m of canopy.
    ball(bsx, 3.05, bsz - .75, .95, .10, 2.35, col.steelD,
      { mode: 7, gloss: .36 });
    ball(bsx - .1, 3.18, bsz - .75, 1.05, .055, 2.45, col.steel,
      { mode: 7, gloss: .44 });
    // The north bay is deliberately open: it is the 2.3 m passenger route from the shop-side
    // footway to the island crossing, not a third pane and post squeezed into that turn.
    for (const oz of [-2.8, 0])
      capsule(furnishX, 1.52, bsz + oz, .07, 3.05, .07, col.steelD, { gloss: .36 });
    for (const oz of [-2.10, 0])
      box(furnishX, 1.70, bsz + oz, .07, 2.40, 1.80, col.glassDay,
        { hard: true, alpha: .26, gloss: G.glass });
    // A shallow perch and its supports share the same furnishing strip; a conventional 50 cm
    // bench would be dishonest on a 1.80 m island because it leaves less than 1.50 m clear.
    box(furnishX, .60, bsz + .75, .26, .07, 2.10, col.steel,
      { hard: true, gloss: .4 });
    for (const oz of [-.1, 1.5])
      box(furnishX, .32, bsz + oz, .26, .56, .08, col.steelD,
        { hard: true, gloss: .36 });
    // Framed route panel and a small ceiling luminaire, both lit at night. The former 2.00×1.20 m
    // blank advert at the north end sat directly between BANK_OUT and the branch and is removed.
    box(furnishX, 1.90, bsz - 2.6, .10, 1.90, 1.05, col.blue,
      { hard: true, gloss: .34, tag: '公交车站' });
    litten(box(furnishX + .070, 1.90, bsz - 2.6, .03, 1.72, .90, col.white,
      { hard: true, mode: 1, glow: .12, tag: '公交车站' }), .8);
    for (let i = 0; i < 7; i++)
      box(furnishX + .090, 2.55 - i * .19, bsz - 2.6, .02, .09, .62, col.charcoal,
        { hard: true, mode: 1, tag: '公交车站' });
    litten(box(furnishX + .08, 2.92, bsz + 1.55, .26, .035, .10, C('#fff0d0'),
      { hard: true, mode: 1, glow: .14 }), .52);
    lampPools.push(glow(M.trs(bsx, .03, bsz, 0, 5.0, 1, 9.0), C('#ffd9a4'), 0));
    // Cool-warm shelter lighting rather than a blank luminous billboard.
    B.light(furnishX, 2.55, bsz + 1.55, [1.0, .93, .82], .34, 3.6);
    B.light(bsx - .10, 2.30, bsz - 2.0, [1.0, .94, .86], .30, 3.4);
    // Collide only what is physically there. The old one-piece 1.6 × 6.5 m rectangle filled the
    // empty shelter interior and left the passenger crossing a 25 cm centre-line slot after body
    // inflation. These three measured solids protect glass, route panel and bench while leaving a
    // 2.3 m visible turn at the north end.
    solid(PL0, PL0 + .30, bsz - 3.15, bsz + .95);             // framed back panes
    solid(PL0, PL0 + .30, bsz - 3.18, bsz - 2.02);           // route panel
    solid(PL0, PL0 + .30, bsz - .35, bsz + 1.85);            // perch and supports
    // The teaching focus is on the west footway at the authored passenger crossing; it never
    // spawns a body into either cycle flow or onto the island furniture.
    thing('公交车站', bsx, 3.55, bsz, '公交车站在马路对面。',
      'The bus stop is across the road.',
      '公交车 the bus + 站 the stop. 地铁站 is the subway.',
      { focus: [24.42, -9.55], reach: 5.0 });
    thing('马路', ROAD_C, .70, 3.6, '过马路要看红绿灯。',
      'Crossing the road, watch the lights.',
      '马路 mǎlù — "horse road", the everyday word for a street.',
      { focus: [24.42, 3.4], reach: 3.2, tag: '马路' });
    flat(ROAD_C, .012, 3.6, 2.0, 2.0, col.asphalt,
      { mode: 10, gloss: .22, ...ROAD, tag: '马路' });

    // ---- traffic. Nothing moves, but an empty six-lane road in Beijing reads as wrong.
    const GLASS = C('#2b333c'), TYRE = C('#161819'), RIM = C('#c4c9cd'),
          RIMD = C('#4b5257'), TRIM = C('#282d32'), CHROME = C('#9ba2a8'),
          SPOKE = C('#868d93'), PLATE = C('#2f7a45'), PLATEW = C('#e9efe9'),
          DRL = C('#e6f4ff'), TAIL = C('#e2482f'), CALIP = C('#b1332a');

    // The alloy has to sit proud of the tyre. A cylinder is solid, so a rim modelled inside
    // the tread width is simply never seen — which is why these used to be plain black discs.
    function wheel(raw, fw, side, dia) {
      const r = dia / 2, tread = dia * .30, f = tread / 2, out = Math.sign(side) || 1;
      raw('cyl', fw, r, side, dia, tread, dia, TYRE, { rz: Math.PI / 2, gloss: .20 });
      raw('cyl', fw, r, side + out * (f + .010), dia * .78, .020, dia * .78, RIMD,
        { rz: Math.PI / 2, gloss: .38 });
      // Six turbine arms from three bars through the hub, then the cap. Bright silver arms on a
      // near-black dish is the highest contrast on the whole car, and at any distance the wheel
      // stopped being a wheel and became a white asterisk stuck to the flank. The arms are a
      // machined grey now and the dish behind them is lifted well off black, so the gaps between
      // them read as shadow between spokes instead of as holes through the car.
      for (let k = 0; k < 3; k++)
        raw('box', fw, r, side + out * (f + .028), .022, dia * .70, dia * .098, SPOKE,
          { hard: true, rx: k * Math.PI / 3, gloss: .44 });
      raw('cyl', fw, r, side + out * (f + .044), dia * .26, .020, dia * .26, SPOKE,
        { rz: Math.PI / 2, gloss: .40 });
      raw('cyl', fw, r, side + out * (f + .058), dia * .11, .016, dia * .11, TRIM,
        { rz: Math.PI / 2, gloss: .52 });
      raw('box', fw - r * .34, r * .68, side + out * (f + .020), .022, dia * .22, dia * .10,
        CALIP, { hard: true, gloss: .40 });
    }

    // A low electric crossover: long nose, one slim daytime-running light drawn right
    // across the front, a glasshouse blacked out into the roof, flush handles, the roof lidar
    // pod, and big turbine alloys sitting nearly flush with the flanks. Built length-first —
    // the old one had a 4.3 m hull lying across the road on a 2.8 m wheelbase down it.
    // `tag` is optional and exactly one of the five carries it, so the cursor can be pointed at a
    // car and asked what 车 means. Untagged props are invisible to `pick`, and a thing that can only
    // be found by standing in the right place is half a thing.
    function car(x, z, ry, kind, body, tag) {
      const s = Math.sin(ry), c = Math.cos(ry);
      // Car space: `fw` along the length, `side` across it, `up` is world height. `raw` hands
      // the world axes straight through for parts that carry their own rotation.
      // `dry` is a part's own yaw relative to the car. Passing `ry` in the options would
      // replace the car's heading instead of adding to it.
      const raw = (mesh, fw, up, side, sx, sy, sz, color, o = {}) =>
        B.shape(mesh, x + s * fw + c * side, up, z + c * fw - s * side,
          sx, sy, sz, color, { tag, ...o, ry: ry + (o.dry || 0) });
      const put = (mesh, fw, up, side, len, hgt, wid, color, o = {}) =>
        raw(mesh, fw, up, side, wid, hgt, len, color, o);

      const suv = kind === 'suv';
      // One body volume spanning the whole car does the bridging over both wheels, and three
      // fillers hang below it — front overhang, rocker, rear overhang. The gaps between the
      // fillers ARE the wheel arches, and the body's underside closes them just above the
      // tyre. Sculpting this from stacked horizontal slabs gave a pile of shelves with
      // daylight between them; holding the body narrower than the track gave four lugs and
      // no visible wheels at all.
      const K = suv
        ? { dia: .82, tr: .865, bodyY: .98, bodyH: .44, fillY: .50, fillH: .56, belt: .18,
            seg: [[2.16, .64], [0, 1.94], [-2.16, .66]],
            gh: [[-.18, 1.325, 2.92, .25, 1.88], [-.28, 1.525, 2.66, .15, 1.86],
                 [-.36, 1.655, 2.40, .11, 1.82]],
            cap: [-.42, 1.745, 2.18, .07, 1.78],
            roof: C('#1a1e22'), clad: C('#22262a'), rails: true }
        : { dia: .72, tr: .858, bodyY: .81, bodyH: .38, fillY: .45, fillH: .50, belt: .16,
            seg: [[2.14, .68], [0, 2.08], [-2.14, .70]],
            // Glass nearly as wide as the body. Inset 13 cm a side it left a pale ledge round
            // the whole cabin and the slices read as a stack of trays on the boot lid.
            // Rear glass laid back as far as the windscreen. Near vertical it gave the car an
            // estate's tail and a boot deck as long as the bonnet.
            gh: [[-.15, 1.105, 2.60, .21, 1.86], [-.23, 1.285, 2.14, .15, 1.84],
                 [-.28, 1.405, 1.72, .09, 1.80]],
            // The cap is the roof, and it has to be one. At 1.43 m it covered the top slice and
            // left the two under it showing 20 cm of flat glass each, so from any camera above
            // waist height the car wore three dark trays stacked on its back. Long and wide
            // enough to bury them, the same slices become the windscreen and the fastback.
            cap: [-.305, 1.455, 1.94, .105, 1.80],
            roof: null, clad: TRIM, rails: false };
      const AX = 1.445, TOP = K.bodyY + K.bodyH / 2, BOT = K.bodyY - K.bodyH / 2;
      const FBOT = K.fillY - K.fillH / 2;
      // The hull closes the wheel arches and carries the bonnet; the shoulder above it stops
      // short of the front axle, which is the only thing that gives the car a bonnet at all.
      const HULLH = K.bodyH - K.belt + .02, HTOP = BOT + HULLH;
      // The bonnet steps down twice on its way to the bumper. One flat plane from the
      // windscreen to the nose read as a table top, and the whole car as a pickup.
      const NOSE1 = HTOP - .06, NOSE = HTOP - .13;

      // ---- bodywork. Radii are kept near the renderer's default. The rounded-box path goes
      // wrong on shallow panels well before its own clamp bites: at 0.05 m on a half-metre
      // panel these volumes rendered as thin plates with the road visible between them, while
      // the identical boxes at 0.02 come out solid.
      const RB = .022, RS = .016;
      // The hull runs nearly the whole length and closes both arches from just above the
      // tyres. It stops short of the nose so the bonnet can drop again.
      put('softBox', -.26, BOT + HULLH / 2, 0, 4.24, HULLH, 1.96, body,
        { round: RB, gloss: .62 });
      for (const [fw, len] of K.seg)
        put('softBox', fw, K.fillY, 0, len, K.fillH, 1.96, body, { round: RB, gloss: .62 });
      // The shoulder: doors, boot lid, and the sill the side glass sits on. Ends level with
      // the base of the windscreen. Previously the hull ran the full length at full height
      // and the lower nose panels were simply buried inside it, so every car was a 4.6 m
      // brick with one flat plane from bumper to boot.
      put('softBox', -.62, TOP - K.belt / 2, 0, 3.44, K.belt, 1.94, body,
        { round: RB, gloss: .62 });
      put('softBox', 2.00, BOT + (NOSE1 - BOT) / 2, 0, .42, NOSE1 - BOT, 1.94, body,
        { round: RS, gloss: .62 });
      put('softBox', 2.31, BOT + (NOSE - BOT) / 2, 0, .36, NOSE - BOT, 1.92, body,
        { round: RS, gloss: .62 });
      // The wheel house, filling the arch opening behind the tyre. The gap between the fillers
      // is the arch, and with body colour showing in its corners it read as a square notch cut
      // out of the flank with a wheel bolted on outside it. Dark, and the corners become
      // shadow. Held inboard of the tread so it cannot poke through the sidewall.
      for (const fw of [AX, -AX])
        put('box', fw, (K.fillY + FBOT) / 2 + .11, 0, K.dia + .10,
          BOT - FBOT + .02, 1.46, C('#15181b'), { hard: true, gloss: .10 });
      // SUV cladding, in the same three lengths as the body fillers. Run as one 4.36 m strip
      // it crossed both arches a centimetre outboard of the tread and hid the bottom half of
      // every wheel, so the car sat in a black band with four hub caps in it.
      if (suv) for (const side of [-1, 1]) {
        for (const [fw, len] of K.seg)
          put('softBox', fw, FBOT + .16, side * .985, len - .05, .30, .09, K.clad,
            { round: RS, gloss: .40 });
        for (const fw of [AX, -AX])
          put('softBox', fw, BOT - .015, side * .985, K.dia + .20, .09, .10, K.clad,
            { round: RS, gloss: .40 });
      }

      // ---- the face. A hairline daytime-running light is drawn right
      // across the nose, with the real lamps set low and separate underneath it.
      put('box', 2.44, FBOT + .22, 0, .18, .32, 1.30, TRIM, { hard: true, gloss: .50 });
      put('box', 2.36, FBOT + .06, 0, .34, .12, 1.56, TRIM, { hard: true, gloss: .40 });
      for (const side of [-1, 1]) {
        // hung off the bonnet line, not the beltline: the nose sits a hand lower than the doors
        litten(put('box', 2.485, NOSE - .06, side * .32, .05, .05, .54, DRL,
          { hard: true, mode: 1, glow: .16 }), .9);
        litten(put('box', 2.475, NOSE - .10, side * .78, .05, .05, .44, DRL,
          { hard: true, mode: 1, glow: .16, dry: side * .06 }), .9);
        put('box', 2.47, NOSE - .28, side * .60, .10, .22, .30, C('#0e1114'),
          { hard: true, gloss: .74 });
        litten(put('box', 2.51, NOSE - .27, side * .60, .04, .10, .16, C('#dfe4e0'),
          { hard: true, mode: 1, glow: .04 }), .85);
        put('box', 2.42, FBOT + .24, side * .62, .12, .24, .18, C('#12161a'),
          { hard: true, gloss: .50 });
      }
      put('softBox', 2.50, NOSE - .02, 0, .04, .09, .15, CHROME, { round: .008, gloss: .72 });
      // The plate. New-energy cars in China wear a green one, and it is the single cheapest
      // detail that stops a car reading as a shape and starts it reading as a car.
      for (const [fw, dep] of [[2.505, .03], [-2.555, .03]]) {
        put('box', fw, FBOT + .21, 0, dep, .15, .46, PLATE, { hard: true, gloss: .30 });
        put('box', fw + Math.sign(fw) * .012, FBOT + .21, 0, .01, .09, .38, PLATEW,
          { hard: true, gloss: .24 });
      }
      // bonnet shut lines where the nose steps down
      put('box', 1.80, NOSE1 + .005, 0, .02, .02, 1.82, C('#3a4046'), { hard: true });
      put('box', 2.14, NOSE + .005, 0, .02, .02, 1.78, C('#3a4046'), { hard: true });

      // ---- glasshouse and roof. Each slice is shorter and set further back than the one
      // under it, which is what draws the windscreen rake and the fastback at the other end.
      for (const [fw, gy, len, hgt, wid] of K.gh)
        put('softBox', fw, gy, 0, len, hgt, wid, GLASS, { round: RS, gloss: .84 });
      put('softBox', K.cap[0], K.cap[1], 0, K.cap[2], K.cap[3], K.cap[4], K.roof || body,
        { round: RS, gloss: .70 });
      if (K.rails) for (const side of [-1, 1])
        put('softBox', K.cap[0], K.cap[1] + K.cap[3] / 2 + .03, side * .58,
          K.cap[2] - .30, .07, .09, TRIM, { round: .012, gloss: .44 });
      // the roof pod carrying the lidar, the tell of a new Chinese EV
      put('softBox', K.gh[K.gh.length - 1][0] + K.gh[K.gh.length - 1][2] / 2 - .14,
        K.cap[1] + .04, 0, .30, .12, .34,
        C('#202428'), { round: RS, gloss: .60 });

      // ---- doors, flush handles, mirrors
      for (const side of [-1, 1]) {
        put('box', -.30, TOP - .015, side * .972, 3.10, .035, .04, CHROME,
          { hard: true, gloss: .70 });
        put('box', K.gh[0][0], K.gh[0][1] - K.gh[0][3] / 2 + .02, side * (K.gh[0][4] / 2 + .01),
          K.gh[0][2] - .10, .035, .03, CHROME, { hard: true, gloss: .70 });
        // B-pillar in body colour, so the side glass reads as two windows and not one slab
        put('softBox', K.gh[0][0] + .10, K.gh[0][1] + .03, side * (K.gh[0][4] / 2 + .005),
          .10, K.gh[0][3] + .10, .04, body, { round: .012, gloss: .62 });
        for (const fw of [.84, -.12, -1.08])
          put('box', fw, K.bodyY - .04, side * .995, .024, K.bodyH * .62, .024, C('#1c2026'),
            { hard: true });
        for (const fw of [.38, -.58])
          put('box', fw, TOP - .15, side * .997, .28, .05, .03, CHROME,
            { hard: true, gloss: .72 });
        put('box', 1.04, K.gh[0][1] - .04, side * .90, .09, .05, .16, TRIM,
          { hard: true, gloss: .40 });
        put('softBox', 1.08, K.gh[0][1] - .06, side * 1.03, .19, .11, .17, TRIM,
          { round: .014, gloss: .66 });
      }

      // ---- tail: a boot lip, then the full-width bar every one of these cars has
      put('softBox', -1.98, TOP + .045, 0, .70, .09, 1.70, body, { round: RS, gloss: .62 });
      litten(put('box', -2.535, TOP - .07, 0, .05, .08, 1.46, TAIL,
        { hard: true, mode: 1, glow: .30 }), .9);
      for (const side of [-1, 1])
        litten(put('box', -2.525, TOP - .07, side * .62, .06, .13, .26, TAIL,
          { hard: true, mode: 1, glow: .34 }), .95);
      put('box', -2.48, FBOT + .22, 0, .18, .32, 1.42, TRIM, { hard: true, gloss: .46 });
      put('box', -2.40, FBOT + .06, 0, .28, .12, 1.50, C('#1a1e22'), { hard: true, gloss: .38 });

      for (const fw of [AX, -AX]) for (const side of [-K.tr, K.tr]) wheel(raw, fw, side, K.dia);

      // Footprint and shadow follow the car round, so a turned car is not boxed broadside.
      const hw = Math.abs(s) * 2.30 + Math.abs(c) * 1.02;
      const hd = Math.abs(c) * 2.30 + Math.abs(s) * 1.02;
      shade(x, z, hw * 2.2, hd * 2.2, .42);
      solid(x - hw, x + hw, z - hd, z + hd);
    }
    // 公交车 — the fallback display bus. The traffic district owns a live 623路 that uses this bay;
    // keeping the old model and collider underneath it made the live bus drive through a duplicate
    // every time it served the stop. Only build this fallback when live traffic is unavailable.
    if (!StreetFit['traffic']) {
    const busX = 31.07, busZ = -12.4;
    box(busX, 1.62, busZ, 2.62, 2.36, 11.4, C('#2f7ea8'), { gloss: .40, round: .22 });
    box(busX, 2.72, busZ, 2.48, .30, 11.0, C('#e6e2d6'), { hard: true, gloss: .30 });
    box(busX, .34, busZ, 2.56, .40, 11.2, C('#28323a'), { hard: true, gloss: .30 });
    for (const side of [-1, 1]) for (let i = 0; i < 7; i++)
      pane(box(busX + side * 1.30, 1.98, busZ - 4.6 + i * 1.55, .06, 1.00, 1.34,
        col.glassDay, { hard: true, mode: 1 }), .9);
    pane(box(busX, 1.90, busZ + 5.72, 2.30, 1.24, .06, col.glassDay,
      { hard: true, mode: 1, tag: '公交车' }), .9);
    litten(box(busX, .96, busZ + 5.74, 1.70, .34, .06, C('#f4c85e'),
      { hard: true, mode: 1, glow: .22, tag: '公交车' }), .9);
    // The destination blind, above the windscreen where a bus wears it. A bus with a blank front
    // is not a bus in service, and this one is stopped at a stop with somebody waiting at it —
    // the route number and the terminus are the two pieces of writing on the whole vehicle that a
    // passenger actually has to read, and there were neither.
    box(busX, 2.66, busZ + 5.78, 2.16, .28, .05, col.black,
      { hard: true, gloss: .30, tag: '公交车' });
    for (const g of B.glyphs(busX - .78, 2.66, busZ + 5.81, 0, '623',
        { size: .19, gap: .02, color: C('#f4c85e'), mode: 1, glow: .22, lift: .008,
          tag: '公交车' })) litten(g, .9);
    for (const g of B.glyphs(busX + .48, 2.66, busZ + 5.81, 0, '杨柳胡同',
        { size: .175, gap: .035, color: C('#f4c85e'), mode: 1, glow: .22, lift: .008,
          tag: '公交车' })) litten(g, .9);
    // The route number again on the flank by the front door, in the paint. This is the one a
    // passenger fifty metres up the pavement reads to decide whether to run.
    for (const side of [-1, 1]) {
      box(busX + side * 1.33, 2.30, busZ + 3.90, .03, .40, 1.00, col.white,
        { hard: true, gloss: .26, tag: '公交车' });
      B.glyphs(busX + side * 1.36, 2.30, busZ + 3.90, side * Math.PI / 2, '623路',
        { size: .26, gap: .04, color: C('#1f2a33'), gloss: .14, lift: .008, tag: '公交车' });
    }
    for (const oz of [-3.9, 3.6]) for (const side of [-1, 1])
      cyl(busX + side * 1.16, .48, busZ + oz, .48, .34, C('#1b1e22'),
        { rz: Math.PI / 2, gloss: .26 });
    shade(busX, busZ, 3.6, 12.4, .44);
    solid(busX - 1.5, busX + 1.5, busZ - 5.9, busZ + 5.9);
    // Eleven and a half metres of bus and no word on it. 公交车站 was taught from the shelter and
    // the vehicle itself was scenery, which is the wrong way round for a learner: you read the
    // number on the bus long before you read the name of the stop.
    thing('公交车', busX - 1.40, 1.70, busZ + 3.40, '623路，去杨柳胡同。',
      'Number 623, going to Yangliu Hutong.',
      '公交 public transport + 车 vehicle. 路 after a number means a route: 623路.',
      { focus: [28.60, busZ + 3.00], reach: 2.8 });
    }
    // The five static cars are GONE, and it is worth recording why rather than just that.
    //
    // js/street-traffic.js now runs one live 623路 bus at the protected stop. Beside it,
    // street-cycles.js owns one delivery moped in the west track and one bicycle in the east
    // track, all three obeying the road district's shared 66 s signal; its separate walked bicycle
    // remains in the hutong. Leaving these five static cars in gave the road a second frozen fleet.
    //
    // But they were also wrong, which nobody had noticed in the years they sat here. The comment
    // that used to be on this line said "northbound lanes east of the centre line, southbound west
    // of it" — and then built the east side at `ry = 0` and the west at `ry = Math.PI`, which is
    // left-hand traffic. All five pointed the wrong way up their own lanes. The parked bus below
    // faces +z and is correct, so the cars disagreed with the bus in the same scene. One of them,
    // at x 28.9, was parked in the painted bike lane.
    //
    // Deleting them remains a net saving: the moving traffic and cycle districts together are
    // under five hundred props and no parked teaching car occupies a footway or distant view.
    // The former standalone 车 label went too: its focus was in live traffic, and moving pick boxes
    // are deliberately forbidden. The character remains visible and taught in the safe, reachable
    // 自行车, 电动车 and 公交车站 interactions.

    // traffic light on its mast, counting down
    // A two-metre footway has no spare signal-pole strip. The shared mast moves to the protected
    // platform's west 30 cm furnishing band, clear of both cycle flow and the bus swept envelope.
    // Its former 56 cm base was larger than a real signal post; this measured 24 cm post and its
    // exact 30 cm collider leave the same 1.50 m platform route as the shelter supports.
    const tlx = 27.82, tlz = -5.90, tlhz = -.20, TL = { tag: '红绿灯' };
    cyl(tlx, .16, tlz, .14, .32, col.stoneD, { gloss: .2, ...TL });
    taper(tlx, 3.1, tlz, .12, 5.8, .12, col.charcoal, { gloss: .34, ...TL });
    capsule(tlx, 5.85, (tlz + tlhz) / 2, .10, tlhz - tlz + .30, .10, col.charcoal,
      { rx: Math.PI / 2, gloss: .34, ...TL });
    box(tlx, 5.35, tlhz, .42, 1.20, .38, col.charcoal, { hard: true, gloss: .34, ...TL });
    const lights = [[.42, '#c8382a'], [0, '#d8b83a'], [-.42, '#3fa05a']];
    lights.forEach(([oy, hex], i) => {
      litten(cyl(tlx, 5.35 + oy, tlhz + .20, .13, .06, C(hex),
        { rx: Math.PI / 2, mode: 1, glow: i === 0 ? .5 : .04, ...TL }), i === 0 ? 1.0 : .1);
    });
    box(tlx, 4.45, tlhz, .38, .48, .34, col.charcoal, { hard: true, gloss: .34, ...TL });
    litten(box(tlx, 4.45, tlhz + .19, .26, .34, .03, C('#3a1608'),
      { hard: true, mode: 1, glow: .10, ...TL }), .4);
    // The countdown, with a number on it. It was a plain orange rectangle, and the one thing a
    // Chinese pedestrian signal always shows is two big digits. They do not count: the street is
    // the only place the game never calls a per-frame tick on, so nothing here can change with the
    // clock — the red lamp above has been hardcoded on for the same reason. A static 28 at least
    // agrees with the static red; a blank panel agreed with nothing.
    for (const g of B.glyphs(tlx, 4.45, tlhz + .21, 0, '28',
        { size: .30, gap: .02, color: C('#f06a2c'), mode: 1, glow: .45, lift: .008, ...TL }))
      litten(g, 1.0);
    solid(PL0, PL0 + .30, tlz - .18, tlz + .18);
    thing('红绿灯', tlx, 5.90, tlhz, '红灯停，绿灯行。',
      'Red light stop, green light go.',
      '红 red + 绿 green + 灯 light. The number counts the seconds down.',
      { focus: [24.42, tlhz], reach: 2.6 });

    // ---- the far side of the road: shopfronts under six storeys of flats.
    //
    // The hotel parcel is a true hole in the generated row. Long southern parcels are each
    // composed as two addresses, while the lane flanks, office and post-hotel parcel retain their
    // own identities; the current deterministic cut resolves to seven visibly separate addresses.
    // The road runs north-south, so the frontage has to face -x and the blocks have to be a
    // row along z. Built as a row along x, only the first one faced the street at all: the
    // rest queued up behind it, the road had no built edge, and a camera swung round behind
    // the player on the far pavement ended up a metre from a blank flank filling the screen.
    const FX = 41.6;                                  // the building line
    const OFZ = 2.20;                                 // 京华大厦 / 公司 entrance
    // The lane's mouth. js/street-lane.js opens 新天地步行街 through this frontage at
    // z -12.60 .. -5.80 — the 6.80 m 北京新天地's portal used to occupy — so the parade stops
    // short of it and starts again on the other side. A block that would straddle the gap is cut
    // back to it; one that would start inside it is skipped; and a cut that would leave a sliver
    // under 4 m gives the sliver to the gap, because 3 m of six-storey block is not a building.
    const GZ0 = -12.60, GZ1 = -5.80;
    // 京华大酒店 owns this whole frontage. Its transparent lobby begins in front of FX and the
    // old parade's boards showed through it, so this is a true parcel reservation: no mass,
    // shopfront, blocker or solid from the procedural row is built inside the hotel envelope.
    const HZ0 = 14.55, HZ1 = 48.65;
    // Seven authored material/massing families sit on the same seeded address parcels. Nothing in
    // this table draws from `rnd()`: the parcel lengths, glazing warmth, sign names and shutters
    // therefore keep their established deal. The difference is architectural, not a reshuffle.
    const PARADE_STYLE = [
      { wall:tint(col.render, .94, .030), wall2:tint(col.renderD, 1.02, .018),
        trim:col.brickD, frame:col.charcoal, setback:.10, step:.24, split:.56,
        roof:[0, .58], rhythm:0, finish:RENDER },
      { wall:tint(col.render, 1.01, -.030), wall2:tint(col.band, .91, -.020),
        trim:col.stoneD, frame:col.steelD, setback:.42, step:-.16, split:.43,
        roof:[.72, 0], rhythm:1, finish:CONCR },
      { wall:tint(col.render, .89, -.015), wall2:tint(col.renderD, .88, -.025),
        trim:col.greenD, frame:col.charcoal, setback:.24, step:.31, split:.61,
        roof:[.18, .82], rhythm:2, finish:RENDER },
      { wall:tint(col.brickL, .90, .035), wall2:tint(col.brick, .91, .025),
        trim:col.brickD, frame:col.charcoal, setback:.34, step:-.18, split:.48,
        roof:[.62, .10], rhythm:3, finish:BRICK },
      { wall:tint(col.render, 1.035, .022), wall2:tint(col.renderD, 1.04, .010),
        trim:col.gold, frame:col.steelD, setback:.13, step:.35, split:.52,
        roof:[.12, .68], rhythm:1, finish:WTILE },
      { wall:tint(col.band, .91, -.030), wall2:tint(col.renderD, .90, -.018),
        trim:col.blue, frame:col.charcoal, setback:.48, step:-.21, split:.58,
        roof:[.78, 0], rhythm:2, finish:CONCR },
      { wall:tint(col.render, .96, .010), wall2:tint(col.brickL, .88, .030),
        trim:col.redD, frame:col.charcoal, setback:.26, step:.20, split:.45,
        roof:[.08, .72], rhythm:0, finish:RENDER },
    ];
    const OFFICE_STYLE = {
      wall:tint(col.renderD, .84, -.018), wall2:tint(col.render, .87, -.025),
      trim:col.stone, frame:col.steelD, setback:.40, step:.16, split:.46,
      roof:[.90, .18], rhythm:4, finish:CONCR,
    };
    const NOTCH_X = FX + 1.40;                       // 2.4 m throat, then the lane widens
    let fz = -54, nearUnit = 0, addressIndex = 0, styleIndex = 0;
    let officeBayZ0 = OFZ - 1.85;
    while (fz < 52) {
      if (fz >= GZ0 && fz < GZ1) { fz = GZ1; continue; }
      if (fz >= HZ0 && fz < HZ1) { fz = HZ1; continue; }
      let len = 13 + rnd() * 8;
      if (fz < GZ0 && fz + len > GZ0) {
        len = GZ0 - fz;
        if (len < 4) {
          // Keep the street-line mouth exact even when the seeded cut leaves a 1–3 m remnant.
          // Extending a six-storey slab would make the forbidden sliver; this is instead a low,
          // glazed corner pavilion attached to the preceding address. It occupies only the 1.4 m
          // throat, then stops at the widened lane boundary z=-13.60.
          const pz = fz + len / 2, ph = 4.34, pst = PARADE_STYLE[
            Math.max(0, styleIndex - 1) % PARADE_STYLE.length];
          box((FX + NOTCH_X) / 2, ph / 2, pz, NOTCH_X - FX, ph, len, pst.wall2,
            { hard:true, mode:14, gloss:G.paint, ...pst.finish });
          box(FX - .035, 1.72, pz, .07, 2.84, Math.max(.72, len - .24), col.black,
            { hard:true, gloss:.12 });
          pane(box(FX - .075, 1.72, pz, .025, 2.56, Math.max(.58, len - .40), col.glassDay,
            { hard:true, mode:1, gloss:G.glass }), .82);
          box(FX - .14, .38, pz, .24, .54, Math.max(.66, len - .32), pst.trim,
            { hard:true, gloss:G.paint });
          box(FX - .14, 3.18, pz, .24, .14, Math.max(.66, len - .32), pst.frame,
            { hard:true, gloss:.30 });
          // Glazed return faces into the lane; the one-metre dog-leg is a short stone arrival wall,
          // not a full-depth exposed side of the neighbouring block.
          box((FX + NOTCH_X) / 2, 1.58, GZ0 - .025,
            NOTCH_X - FX, 3.16, .05, col.charcoal, { hard:true, gloss:.24 });
          pane(box((FX + NOTCH_X) / 2, 1.68, GZ0 - .055,
            NOTCH_X - FX - .18, 2.44, .025, col.glassDay,
            { hard:true, mode:1, gloss:G.glass }), .80);
          box(NOTCH_X - .035, 1.62, GZ0 - .50, .07, 3.24, .90, pst.trim,
            { hard:true, gloss:G.paint });
          solid(FX - .12, NOTCH_X, fz, GZ0);
          blocker(FX, NOTCH_X, fz, GZ0, ph);
          fz = GZ1;
          continue;
        }
      }
      if (fz < HZ0 && fz + len > HZ0) {
        len = HZ0 - fz;
        if (len < 4) { fz = HZ1; continue; }
      }
      const bh = 15.5 + rnd() * 6, dep = 17 + rnd() * 7;
      const rawZ0 = fz, rawZ1 = fz + len, cz = fz + len / 2, rear = FX + dep;
      const southLaneFlank = Math.abs(rawZ1 - GZ0) < .01;
      const northLaneFlank = Math.abs(rawZ0 - GZ1) < .01;
      const southHotelFlank = Math.abs(rawZ1 - HZ0) < .01;
      const laneFlank = southLaneFlank || northLaneFlank;
      const officeAddress = rawZ0 <= OFZ && rawZ1 >= OFZ;
      // Long parcels south of the lane each hold two independently dressed addresses. Short lane
      // flanks remain single corner addresses, keeping the deterministic row within the requested
      // five-to-seven-building range instead of turning every seeded parcel into one oversized slab.
      const splitAddresses = rawZ1 < GZ0 - .01;
      const st = officeAddress ? OFFICE_STYLE : PARADE_STYLE[styleIndex % PARADE_STYLE.length];
      const wingStyle = splitAddresses
        ? [PARADE_STYLE[styleIndex % PARADE_STYLE.length],
           PARADE_STYLE[(styleIndex + 1) % PARADE_STYLE.length]]
        : [st, st];

      // Ordinary parcels surrender 42 cm at each party wall. With the seeded 50 cm parcel gap,
      // that makes a legible 1.34 m fire/service slot between addresses. At the lane mouth the
      // frontage instead meets the exact -12.60/-5.80 datum: the release happens only after the
      // 1.40 m throat, where the deeper mass steps a further metre away on either side.
      const visZ0 = rawZ0 + (northLaneFlank ? 0 : .42);
      const visZ1 = rawZ1 - (southLaneFlank ? 0 : .42);
      const deepZ0 = northLaneFlank ? GZ1 + 1.00 : visZ0;
      const deepZ1 = southLaneFlank ? GZ0 - 1.00 : visZ1;
      const shopCount = Math.max(1, Math.round(len / 4.8));
      const splitUnits = Math.max(1, Math.min(shopCount - 1,
        Math.round(shopCount * wingStyle[0].split)));
      // Building joints land between shop leases, never through a pane or a signboard.
      const splitZ = rawZ0 + splitUnits * (len / shopCount);
      const seam = splitAddresses ? 1.10 : .16;
      const wings = [
        { z0:visZ0, z1:splitZ - seam / 2, front:FX + wingStyle[0].setback,
          top:bh + wingStyle[0].roof[0], wall:wingStyle[0].wall, st:wingStyle[0] },
        { z0:splitZ + seam / 2, z1:visZ1,
          front:FX + wingStyle[1].setback + (splitAddresses ? 0 : wingStyle[1].step),
          top:bh + wingStyle[1].roof[1], wall:wingStyle[1].wall2, st:wingStyle[1] },
      ];
      const frontAt = z => z < splitZ ? wings[0].front : wings[1].front;

      // Each address is two offset wings, and each wing is front/rear construction rather than a
      // single giant cuboid. The split lets the two lane-flanking parcels lose their deep metre
      // without taking a bite from the street opening or leaving a blank full-depth return.
      for (let wi = 0; wi < wings.length; wi++) {
        const w = wings[wi], throatRear = Math.min(NOTCH_X, rear);
        if (throatRear > w.front)
          box((w.front + throatRear) / 2, w.top / 2, (w.z0 + w.z1) / 2,
            throatRear - w.front, w.top, w.z1 - w.z0, w.wall,
            { hard:true, mode:14, gloss:G.paint, ...w.st.finish });
        const rz0 = northLaneFlank && wi === 0 ? Math.max(w.z0, deepZ0) : w.z0;
        const rz1 = southLaneFlank && wi === 1 ? Math.min(w.z1, deepZ1) : w.z1;
        if (rear > throatRear && rz1 > rz0) {
          const rearW = rear - throatRear, rearD = rz1 - rz0;
          const rearX = (throatRear + rear) / 2, rearZ = (rz0 + rz1) / 2;
          box((throatRear + rear) / 2, w.top / 2, (rz0 + rz1) / 2,
            rearW, w.top, rearD, w.wall,
            { hard:true, mode:14, gloss:G.paint, ...w.st.finish });
          // Deep service backs are outside the walking strip but remain visible along the fire
          // slots and high camera. A returned stair window and full coping make them architecture,
          // not unarticulated backing boxes.
          const serviceH = Math.min(5.2, w.top * .36), serviceD = Math.min(2.6, rearD * .55);
          box(rear + .045, w.top * .58, rearZ, .09, serviceH, serviceD, col.glassDark,
            { hard:true, gloss:.22 });
          pane(box(rear + .095, w.top * .58, rearZ, .025, serviceH - .28,
            serviceD - .24, col.glassDay, { hard:true, mode:1, gloss:G.glass }), .24);
          const py = w.top + .18;
          for (const zEdge of [rz0 + .09, rz1 - .09])
            box(rearX, py, zEdge, rearW + .18, .36, .18, w.st.trim,
              { hard:true, gloss:G.paint });
          for (const xEdge of [throatRear + .09, rear - .09])
            box(xEdge, py, rearZ, .18, .36, Math.max(.18, rearD - .18), w.st.trim,
              { hard:true, gloss:G.paint });
        }

        // Perimeter parapets, not another full-depth storey laid over the address. Unequal heights
        // and the movement joint below make six address silhouettes from the same economical kit.
        box(w.front - .02, w.top + .30, (w.z0 + w.z1) / 2,
          .24, .60, w.z1 - w.z0 + .10, w.st.trim, { hard:true, gloss:G.paint });
        box((w.front + Math.min(rear, w.front + 1.10)) / 2, w.top + .30,
          wi ? w.z1 - .06 : w.z0 + .06, Math.min(1.10, rear - w.front), .60, .22,
          w.st.trim, { hard:true, gloss:G.paint });
      }
      if (splitAddresses) {
        // The fire slot remains open at the pavement and is closed only by a gate 1.4 m deep.
        box(FX + 1.46, 1.28, splitZ, .08, 2.56, seam - .20, col.charcoal,
          { hard:true, gloss:.24 });
        for (const oz of [-.30, 0, .30]) capsule(FX + 1.40, 1.28, splitZ + oz,
          .025, 2.28, .025, col.steelD, { gloss:.34 });
      } else {
        box((wings[0].front + wings[1].front) / 2, 2.65, splitZ,
          Math.abs(wings[1].front - wings[0].front) + .26, 5.30, seam, col.charcoal,
          { hard:true, gloss:.16 });
      }

      // Navigation keeps the authored parcel footprint. Only the two lane flanks are split: the
      // west mouth is still exactly 6.80 m wide through x=43.0, while the deep solid and camera
      // blocker retreat to z=-13.60/-4.80 with the widened internal lane.
      if (laneFlank) {
        blocker(FX, NOTCH_X, rawZ0, rawZ1, bh);
        solid(FX - .12, NOTCH_X, rawZ0, rawZ1);
        blocker(NOTCH_X, rear, deepZ0, deepZ1, bh);
        solid(NOTCH_X, rear, deepZ0, deepZ1);
      } else {
        blocker(FX, rear, rawZ0, rawZ1, bh);
        solid(FX - .12, rear, rawZ0, rawZ1);
      }

      // A glazed 1.4 m throat return and a windowed side elevation make the widened lane pocket a
      // real corner, not the exposed end of an opaque procedural box. Everything stays flush with
      // the parcel boundary; there are no bins, planters or projecting signs in the stopping area.
      if (laneFlank) {
        const side = southLaneFlank ? -1 : 1;
        const throatZ = southLaneFlank ? GZ0 : GZ1;
        const deepZ = southLaneFlank ? deepZ1 : deepZ0;
        const laneStyle = southLaneFlank ? wings[1].st : wings[0].st;
        const throatFront = Math.min(wings[0].front, wings[1].front);
        const throatW = Math.max(.30, NOTCH_X - throatFront - .10);
        box(throatFront + throatW / 2, 1.55, throatZ + side * .033,
          throatW, 3.10, .05, col.charcoal, { hard:true, gloss:.24 });
        pane(box(throatFront + throatW / 2, 1.67, throatZ + side * .063,
          throatW - .20, 2.48, .025, col.glassDay,
          { hard:true, mode:1, gloss:G.glass }), .82);
        for (const px of [NOTCH_X + 1.15, NOTCH_X + 3.55, NOTCH_X + 5.95]) {
          if (px + .80 >= rear) continue;
          box(px, 6.55, deepZ + side * .043, 1.72, 1.78, .07, col.glassDark,
            { hard:true, gloss:.20 });
          pane(box(px, 6.55, deepZ + side * .083, 1.54, 1.60, .025, col.glassDay,
            { hard:true, mode:1, gloss:G.glass }), .42);
          box(px, 5.58, deepZ + side * .071, 1.94, .10, .10, laneStyle.trim,
            { hard:true, gloss:G.paint });
        }
        // The one-metre dog-leg is faced as an arrival wall with a lit directory panel, rather
        // than a continuous return capable of hiding the lane module's shifted shopfronts.
        box(NOTCH_X - .043, 1.62, (throatZ + deepZ) / 2,
          .07, 3.24, Math.abs(throatZ - deepZ) - .10, laneStyle.trim,
          { hard:true, gloss:G.paint });
        litten(box(NOTCH_X - .083, 1.72, (throatZ + deepZ) / 2,
          .025, 1.54, .48, C('#f2e3c4'), { hard:true, mode:1, glow:.03 }), .45);
      }

      // window grid on the road face
      const bays = Math.max(2, Math.round(len / 3.5));
      const floors = Math.max(2, Math.floor((bh - 5.6) / 2.85));
      for (let f = 0; f < floors; f++) for (let i = 0; i < bays; i++) {
        const wz = cz - len / 2 + (i + .5) * (len / bays), wy = 6.2 + f * 2.85;
        const warmRoll = rnd(), acRoll = rnd();       // established two draws per upper window
        const face = frontAt(wz), wing = wz < splitZ ? wings[0] : wings[1], wst = wing.st;
        const inSeam = wz > wings[0].z1 && wz < wings[1].z0;
        const ww = wst.rhythm === 1 ? 1.48 : wst.rhythm === 4 ? 2.24 : 1.88;
        const wh = wst.rhythm === 2 ? 1.78 : 1.58;
        if (!inSeam && wy + wh / 2 < wing.top - .18) {
          box(face - .035, wy, wz, .07, wh + .18, ww + .18, col.glassDark,
            { hard:true, gloss:.20 });
          pane(box(face - .075, wy, wz, .025, wh, ww, col.glassDay,
            { hard:true, mode:1, gloss:G.glass }), warmRoll);
          box(face - .11, wy - wh / 2 - .10, wz, .18, .10, ww + .34, wst.trim,
            { hard:true, gloss:G.paint });
          if (wst.rhythm === 1 || wst.rhythm === 4)
            for (const os of [-1, 1]) box(face - .11, wy, wz + os * (ww / 2 + .10),
              .18, wh + .28, .08, wst.frame, { hard:true, gloss:.30 });
          if (wst.rhythm === 2 && f % 2 === 0)
            box(face - .15, wy + wh / 2 + .11, wz, .22, .10, ww + .40, wst.trim,
              { hard:true, gloss:G.paint });
        }
        if (!inSeam && acRoll > .72 && f < 2 && wst.rhythm !== 4) { // fewer, aligned condensers
          box(face - .34, wy - 1.18, wz + ww * .43, .42, .55, .72, col.white,
            { hard:true, gloss:.26 });
          for (let k = -2; k <= 2; k++)
            box(face - .56, wy - 1.18, wz + ww * .43 + k * .11, .03, .40, .04, col.steelD,
              { hard:true, gloss:.30 });
        }
      }

      // Recessed, framed shopfronts. The glass remains just proud of the opaque procedural shell,
      // but the piers, stallriser and lintel sit another 11 cm toward the street: a real reveal in
      // silhouette, without the old continuous charcoal band or full-width canopy.
      const shops = shopCount;
      for (let i = 0; i < shops; i++) {
        const sw = len / shops, sz2 = cz - len / 2 + (i + .5) * sw;
        // Which unit of the reachable run this is. `nearUnit` counts only the strip of far
        // pavement a body can stand on (|z| < 11.5) and it used to be incremented deep inside the
        // name override. Hoisted here because the fade decision happens before the board
        // colour is drawn; the VALUE is unchanged — nothing between the two sites read it.
        const near = Math.abs(sz2) < 11.5 ? ++nearUnit : 0;
        // Two ordinary failures keep the leases from reading as a perfect repeated texture: one
        // board the sun has taken and one unit with its sign out. Both are COLOUR ONLY —
        // same props, same count, and the dark one gives an emissive quad back rather than
        // adding one. Placed on the reachable stretch so they are seen, not inferred.
        const bleached = near === 2, dead = near === 4;
        let board = pick([col.red, col.blue, col.paintY, col.teal]);
        if (bleached) board = [board[0] * .34 + .52, board[1] * .34 + .50, board[2] * .34 + .46];
        let name = pick(SHOPNAMES);
        const officeUnit = officeAddress && Math.abs(sz2 - OFZ) < Math.max(2.15, sw * .48);
        if (near && !officeUnit) {
          const owed = TEACH.filter(w => !taught.has(w));
          if (owed.length && !owed.includes(name) && (near === 1 || near >= 3))
            name = owed[0];
        }
        const shutterRoll = rnd();                   // established third per-shop draw
        if (officeUnit) {
          officeBayZ0 = sz2 - sw / 2 + .06;
          continue;                                  // RNG/name slot kept; portal owns this bay
        }

        const face = frontAt(sz2), wing = sz2 < splitZ ? wings[0] : wings[1], wst = wing.st;
        const splitEdge = splitAddresses && Math.abs(Math.abs(sz2 - splitZ) - sw / 2) < .02;
        const splitClear = splitEdge ? .78 : 0;
        const openingW = sw - .58 - splitClear;
        box(face - .025, 1.82, sz2, .06, 2.76, openingW, col.black,
          { hard:true, gloss:.10 });
        pane(box(face - .065, 1.85, sz2, .025, 2.48, openingW - .18, col.glassDay,
          { hard:true, mode:1, gloss:G.glass }), dead ? .10 : .95);
        for (const os of [-1, 1]) box(face - .18, 1.82,
          sz2 + os * (openingW / 2 + .12), .28, 3.64, .24, wst.frame,
          { hard:true, gloss:.30 });
        box(face - .18, .42, sz2, .28, .58, openingW, wst.trim,
          { hard:true, gloss:G.paint });
        box(face - .18, 3.12, sz2, .28, .16, openingW, wst.frame,
          { hard:true, gloss:.30 });
        const doorZ = sz2 + openingW * .27;
        box(face - .11, 1.82, doorZ, .12, 2.48, .08, wst.frame, { hard:true, gloss:.34 });
        capsule(face - .20, 1.52, doorZ - .16, .025, .48, .025, col.steel,
          { gloss:G.metal });
        box(face - .24, .061, sz2, .42, .11, openingW - .18, col.stone,
          { hard:true, gloss:.26 });

        let signTag;
        const boardProp = box(face - .22, 3.72, sz2, .28, .84, sw - .30 - splitClear, board,
          { hard:true, gloss:.30 });
        box(face - .15, 4.18, sz2, .30, .08, sw - .22 - splitClear, wst.trim,
          { hard:true, gloss:G.paint });
        const span = sw - .70 - splitClear, gsz = Math.min(.64, span / name.length * .92);
        if (TEACH.includes(name) && !taught.has(name)) {
          taught.add(name);
          signTag = name;
          boardProp.tag = name;
          const say = ['面包房的面包很新鲜。', 'The bread at the bakery is fresh.',
                       '面包 bread + 房 room, in the sense of a workshop. Not 面 — that is noodles.'];
          thing(name, face - .28, 3.72, sz2, say[0], say[1], say[2],
            { focus: [FX - 2.30, sz2], reach: 2.4 });
        }
        for (const g of B.glyphs(face - .38, 3.72, sz2, -Math.PI / 2, name,
            { size: gsz, gap: gsz * .16,
              color: (bleached || board === col.paintY) ? col.charcoal : col.cream,
              mode: 1, glow: dead ? 0 : .22, lift: .014, tag: signTag }))
          { if (!dead) litten(g, .9); }
        if (shutterRoll > .74) {
          box(face - .20, 1.66, sz2, .12, 2.92, sw - .66 - splitClear, col.steel,
            { hard:true, gloss:.40, ...SHUT });
          const slats = Math.max(6, Math.round(3.0 / .19));
          for (let k = 0; k < slats; k++)
            box(face - .27, .20 + k * (2.82 / slats), sz2, .02, .045,
              sw - .68 - splitClear, col.steelD,
              { hard:true, gloss:.34 });
          box(face - .28, 3.16, sz2, .16, .16, sw - .58 - splitClear, col.steelD,
            { hard:true, gloss:.36 });
        } else {
          // Displays stay behind the glass. Repeated pavement planters were the street-level
          // obstruction in the old parade and left nowhere to stop, turn, or read a sign.
          box(face - .020, 1.02, sz2 - openingW * .23, .04, .74, openingW * .32,
            tint(wst.trim, 1.08), { hard:true, gloss:.24 });
          box(face - .08, 1.46, sz2 - openingW * .23, .04, .08, openingW * .28,
            col.cream, { hard:true, gloss:.22 });
        }
        lampPools.push(glow(M.trs(FX - 2.2, .03, sz2, 0, 4.6, 1, sw + 2.6), C('#ffb877'), 0));
      }
      // One economical light lip per offset wing. Split parcels stop at the fire slot instead of
      // bridging two buildings with the old continuous luminous line.
      for (const w of wings)
        litten(box(w.front - .31, 3.26, (w.z0 + w.z1) / 2,
          .04, .07, w.z1 - w.z0 - .18, C('#ffe9c4'),
          { hard:true, mode:1, glow:.08 }), .9);

      // Roof plant is clustered differently by address. A single tank, stair head or dish gives
      // the silhouette a use; two identical dishes plus one identical tank on every roof did not.
      if (addressIndex % 3 === 0) {
        box(FX + 3.10, bh + .78, cz - 1.1, 2.20, 1.56, 2.35, st.wall2,
          { hard:true, mode:14, gloss:G.paint, ...st.finish });
        box(FX + 3.10, bh + 1.59, cz - 1.1, 2.34, .08, 2.49, st.trim,
          { hard:true, gloss:G.paint });
      } else if (addressIndex % 3 === 1) {
        cyl(FX + 4.40, bh + 1.03, cz + .8, .40, 1.46, C('#8d9298'), { gloss:.34 });
        for (const os of [-1, 1]) for (const oz2 of [-1, 1])
          cyl(FX + 4.40 + os * .25, bh + .22, cz + .8 + oz2 * .25,
            .04, .42, col.steelD, { gloss:.34 });
      } else {
        cyl(FX + 3.25, bh + .88, cz, .06, 1.16, col.steelD, { gloss:.34 });
        taper(FX + 3.25, bh + 1.55, cz, .88, .34, .88, col.white,
          { rx:-.55, gloss:.26 });
        cyl(FX + 3.25, bh + 1.68, cz, .05, .38, col.steelD, { rx:-.55, gloss:.34 });
      }
      capsule(FX + 1.45, bh + 2.05, cz - 2.2, .035, 3.80, .035, col.steelD,
        { gloss:.36 });

      // A recessed service gate marks alternating fire gaps but does not close the pavement edge.
      if (!southLaneFlank && !southHotelFlank && rawZ1 < 51.5 && addressIndex % 2 === 0) {
        box(FX + 1.46, 1.25, rawZ1 + .25, .08, 2.50, .42, col.charcoal,
          { hard:true, gloss:.24 });
        for (const oz of [-.12, 0, .12]) capsule(FX + 1.40, 1.25, rawZ1 + .25 + oz,
          .025, 2.24, .025, col.steelD, { gloss:.34 });
      }
      fz += len + .5;
      addressIndex += splitAddresses ? 2 : 1;
      if (!officeAddress) styleIndex += splitAddresses ? 2 : 1;
    }
    // ---- 京华大厦 / 公司. The procedural office address deliberately leaves this one shop bay
    // undrawn. A 36 cm glass skin pasted over a random shop is replaced by a stone portal with an
    // actual shadow line: the doors sit behind the jamb faces and the lift/tenant wall sits another
    // 40 cm behind them. The masonry begins at x=41.12 and its flush plaques sit only centimetres
    // proud, leaving more than three metres of clear far pavement to the carriageway.
    const portalFront = FX - .48, portalGlass = FX - .10, portalBack = FX + .30;
    // The seeded lease is wider on its south side than the centred entrance. Continue the stone
    // base to the actual lease line and articulate it with joints, instead of leaving two metres
    // of unexplained blank render beside the doors.
    const officeSideZ0 = officeBayZ0, officeSideZ1 = OFZ - 1.25;
    if (officeSideZ1 > officeSideZ0) {
      box((portalFront + FX + .10) / 2, 2.15, (officeSideZ0 + officeSideZ1) / 2,
        FX + .10 - portalFront, 4.30, officeSideZ1 - officeSideZ0, col.stone,
        { hard:true, gloss:.26, tag:'公司' });
      for (const k of [1, 2]) {
        const jz = officeSideZ0 + (officeSideZ1 - officeSideZ0) * k / 3;
        box(portalFront - .01, 2.15, jz, .04, 3.84, .025, col.stoneD,
          { hard:true, gloss:.22, tag:'公司' });
      }
    }
    for (const oz of [-1.12, 1.12])
      box((portalFront + FX + .10) / 2, 2.15, OFZ + oz,
        FX + .10 - portalFront, 4.30, .26, col.stone, { hard:true, gloss:.26, tag:'公司' });
    box((portalFront + FX + .10) / 2, 3.87, OFZ,
      FX + .10 - portalFront, .86, 2.50, col.stone, { hard:true, gloss:.26, tag:'公司' });
    // Short side reveals and a dark rear wall establish the lobby depth without an awning or
    // freestanding sign on the walking line.
    for (const oz of [-1.01, 1.01])
      box((portalGlass + portalBack) / 2, 1.48, OFZ + oz,
        portalBack - portalGlass, 2.96, .14, col.stoneD, { hard:true, gloss:.24, tag:'公司' });
    box(portalBack, 1.48, OFZ, .08, 2.96, 2.14, C('#24282d'),
      { hard:true, gloss:.18, tag:'公司' });
    box((portalFront + portalBack) / 2, .045, OFZ,
      portalBack - portalFront, .09, 2.22, col.stoneD, { hard:true, gloss:.42, tag:'公司' });
    box((portalGlass + portalBack) / 2, 2.96, OFZ,
      portalBack - portalGlass, .12, 2.10, col.stoneD, { hard:true, gloss:.24, tag:'公司' });
    litten(box((portalGlass + portalBack) / 2, 2.86, OFZ,
      portalBack - portalGlass - .06, .035, 1.86, C('#ffe6bd'),
      { hard:true, mode:1, glow:.04, tag:'公司' }), 1.15);

    // Symmetrical glazed leaves with a transom and proper centre/edge mullions. The stone frame is
    // 38 cm proud of these panes, which supplies the entrance shadow while keeping the threshold
    // behind the pavement edge.
    for (const s of [-1, 1]) {
      pane(box(portalGlass, 1.50, OFZ + s * .45, .045, 2.72, .82, col.glassDay,
        { hard:true, mode:1, gloss:G.glass, tag:'公司' }), .98);
      capsule(portalGlass - .055, 1.26, OFZ + s * .18, .028, .84, .028, col.steel,
        { gloss:G.metal, tag:'公司' });
    }
    for (const oz of [-.90, 0, .90])
      box(portalGlass - .04, 1.50, OFZ + oz, .08, 2.78, .10, col.steelD,
        { hard:true, gloss:G.metal, tag:'公司' });
    box(portalGlass - .04, 2.88, OFZ, .08, .12, 1.90, col.steelD,
      { hard:true, gloss:G.metal, tag:'公司' });
    box((portalFront + portalGlass) / 2, .061, OFZ,
      portalGlass - portalFront, .11, 2.02, col.stone, { hard:true, gloss:.30, tag:'公司' });
    box(portalFront - .01, .028, OFZ, .30, .035, 1.24, C('#1c1e21'),
      { hard:true, gloss:.28, tag:'公司' });

    // 京华大厦 is the address; 文化传媒 is a tenant. Separating those two labels fixes the old
    // vertical company billboard, which made a small fourth-floor firm look like the whole tower.
    for (const g of B.glyphs(portalFront - .02, 3.88, OFZ, -Math.PI / 2, '京华大厦',
        { size:.28, gap:.052, color:col.charcoal, mode:1, glow:.035, lift:.012, tag:'公司' }))
      litten(g, .52);
    box(portalFront - .03, 1.70, OFZ - 1.48, .08, .68, .48, col.steelD,
      { hard:true, gloss:.46, tag:'公司' });
    glyphs(portalFront - .08, 1.84, OFZ - 1.48, -Math.PI / 2, '文化传媒',
      { size:.105, gap:.012, color:col.cream, mode:1, vertical:true, tag:'公司' });
    glyphs(portalFront - .08, 1.47, OFZ - 1.48, -Math.PI / 2, '四层',
      { size:.09, gap:.02, color:col.steel, mode:1, tag:'公司' });

    // Lift, tenant directory and two slim access pedestals sit on the rear plane. Their x order is
    // now honest: road -> frame -> glass -> furniture -> rear wall.
    box(portalBack - .055, 1.34, OFZ - .46, .035, 2.64, .88, col.charcoal,
      { hard:true, gloss:.30, tag:'公司' });
    for (const s of [-1, 1])
      box(portalBack - .085, 1.07, OFZ - .46 + s * .18, .025, 2.10, .35, col.steel,
        { hard:true, gloss:.56, tag:'公司' });
    box(portalBack - .105, 1.07, OFZ - .46, .018, 2.10, .02, col.charcoal,
      { hard:true, gloss:.30, tag:'公司' });
    litten(box(portalBack - .10, 2.38, OFZ - .46, .025, .18, .30, C('#f4b95e'),
      { hard:true, mode:1, glow:.10, tag:'公司' }), .85);
    for (const g of B.glyphs(portalBack - .13, 2.38, OFZ - .46, -Math.PI / 2, '4',
        { size:.12, gap:0, color:C('#2a1c08'), mode:1, lift:.006, tag:'公司' }))
      litten(g, .25);
    box(portalBack - .10, 1.46, OFZ + .40, .025, .78, .52, col.charcoal,
      { hard:true, gloss:.34, tag:'公司' });
    for (const [k, row] of [[0, '四层 文化传媒'], [1, '三层 律师'], [2, '二层 会计']])
      B.glyphs(portalBack - .13, 1.68 - k * .21, OFZ + .40, -Math.PI / 2, row,
        { size:.052, gap:.008, color:col.cream, mode:1, lift:.006, tag:'公司' });
    for (const oz of [.68, .92]) {
      box(FX + .04, .48, OFZ + oz, .26, .96, .16, col.charcoal,
        { hard:true, gloss:.34, tag:'公司' });
      box(FX + .04, .98, OFZ + oz, .28, .045, .18, col.steelD,
        { hard:true, gloss:.50, tag:'公司' });
      litten(box(FX + .04, 1.01, OFZ + oz, .10, .018, .09, C('#7fe0a0'),
        { hard:true, mode:1, glow:.08, tag:'公司' }), .7);
    }
    solid(FX - .95, FX, OFZ - 1.85, OFZ + 1.85);
    // Preserve the authored vestibule body/camera contract; it still leaves a 3.15 m clear strip
    // from the carriageway to its west edge, and the visible portal itself begins another .47 m in.
    blocker(FX - .95, FX, OFZ - 1.85, OFZ + 1.85, 4.2);
    // ---- 北京新天地 and 大超市 are NOT here any more.
    //
    // Both are on 新天地步行街 now (js/street-lane.js), the pedestrian lane that opens through
    // this frontage at z -12.60 .. -5.80 — which is the 6.80 m the mall's own portal used to
    // occupy, and the only stretch of this pavement that was ever going to be free. Seven of the
    // district's thirteen doors stood on this one 27 m line; with 银行 and 药店 across the road
    // and these two off it, three do.
    //
    // Deleted rather than left dark: the procedural parade above already builds ordinary shop
    // units the whole length of the frontage, so removing the two portals reveals a continuous
    // row of them rather than leaving a hole. The mouth is the gap the loop leaves at GZ0..GZ1.

    // ---- 地铁站 the 商务区 entrance, on the far pavement outside the office tower
    // Kerb-align the entrance: its ground footprint is 37.40..39.60, leaving the official
    // branch-street 2.00 m clear path to the x=41.60 frontage.  The old x=38.70 centre spent an
    // avoidable 20 cm of that path while leaving unused paving beside the kerb.
    metroMouth(38.45, -5.20, '商务区');
    thing('公司', FX - .80, 3.20, OFZ, '我在一家小公司上班，四层。',
      'I work at a small company, on the fourth floor.',
      '公 public + 司 to manage. 上班 is to go to work, 下班 to knock off.',
      { focus: [FX - 2.0, OFZ], reach: 2.6 });

    // a billboard standing on the roofline, facing the road
    for (const s of [-1, 1])
      box(FX + 1.0, 15.0, 8.0 + s * 5.6, .40, 6.0, .40, col.charcoal, { hard: true, gloss: .3 });
    box(FX + .90, 20.4, 8.0, .50, 5.4, 13.0, col.charcoal, { hard: true, gloss: .3 });
    litten(box(FX + .59, 20.4, 8.0, .12, 4.7, 12.2, C('#dfe6ea'),
      { hard: true, mode: 1, glow: .1 }), .7);
    // The advert. This was four coloured squares in a row on a blank lightbox — the visual
    // equivalent of the ■■ shop signs that were taken off the parade below it. A billboard eight
    // storeys up over a six-lane road is the largest piece of writing in the district and it said
    // nothing. It sells cola now: a bottle cut out on the left and the copy running right, which
    // is the layout of every roadside board in the city.
    //
    // Ink on the lit panel rather than a red field with white ink. The panel is the lightbox that
    // comes up after dark, and covering it changed a billboard into an unlit hoarding at midnight.
    // The bottle takes two shoulder cones, not one. The taper mesh only narrows to 72% of its base,
    // so a single cone from a 1.55 m body left a 1.12 m mouth with a 42 cm neck stuck in it — a step
    // that is perfectly visible from the road, which is eleven metres away, not a hundred.
    box(FX + .46, 19.60, 4.30, .18, 2.50, 1.55, C('#8d2320'), { gloss: .50 });
    taper(FX + .46, 21.20, 4.30, .18, .70, 1.55, C('#8d2320'), { gloss: .50 });
    taper(FX + .46, 21.70, 4.30, .18, .40, 1.10, C('#8d2320'), { gloss: .50 });
    box(FX + .46, 22.15, 4.30, .18, .55, .70, C('#8d2320'), { hard: true, gloss: .50 });
    box(FX + .48, 22.55, 4.30, .20, .30, .82, col.gold, { hard: true, gloss: G.metal });
    box(FX + .54, 19.70, 4.30, .06, .95, 1.58, col.cream, { hard: true, mode: 1 });
    B.glyphs(FX + .48, 19.70, 4.30, -Math.PI / 2, '可乐',
      { size: .58, gap: .10, color: C('#8d2320'), gloss: .10, lift: .02 });
    for (const g of B.glyphs(FX + .48, 21.20, 9.90, -Math.PI / 2, '冰镇可乐',
        { size: 1.55, gap: .28, color: C('#8d2320'), mode: 1, glow: .12, lift: .02 }))
      litten(g, .8);
    for (const g of B.glyphs(FX + .48, 19.10, 9.00, -Math.PI / 2, '清爽一夏',
        { size: .80, gap: .14, color: col.charcoal, mode: 1, lift: .02 }))
      litten(g, .5);
    // Floodlights on the top rail, aimed down at the board. They are why a billboard is legible
    // at ten at night, and the board had none.
    for (const oz of [4.0, 8.0, 12.0]) {
      capsule(FX + .74, 23.05, oz, .05, .60, .05, col.steelD, { rz: .6, gloss: .34 });
      taper(FX + .40, 23.20, oz, .34, .30, .34, col.steelD, { rx: 1.9, gloss: .38 });
      litten(box(FX + .28, 23.10, oz, .05, .18, .28, C('#fff2d2'),
        { hard: true, mode: 1, glow: .10, tag:'广告照明' }), .9);
    }

    // ---- the corner block that closes the east end of the alley, and plain masses filling
    // the near side of the road beyond it. Without them the pavement ran off into open ground.
    const czb = -3.05;
    box(17.6, 7.6, czb - 8.0, 11.4, 15.2, 16.0, col.render, { hard: true, mode: 14, gloss: G.paint, ...RENDER });
    box(17.8, .70, czb - .04, 11.7, 1.40, .34, col.brick, { hard: true, mode: 11, gloss: G.matte, ...BRICK });
    box(17.8, 15.7, czb - 8.0, 11.9, .56, 16.2, col.renderD, { hard: true, gloss: G.paint });
    blocker(12.0, 23.4, czb - 16.1, czb, 15.2);
    solid(12.0, 23.4, czb - 16.1, czb + .10);
    // On FL, not on the 2.86 this was built to. Two reasons, and the second is the one that
    // matters: a block four metres from the one you live in with a different storey height reads
    // as a mistake, and at 2.86 the lowest window sat at 3.66 — through the fascia band the
    // 五金电器 board now shares with the two shops west of the gap. At FL it starts at 3.90 and
    // the whole street gets one sign line. Top row lands at 14.70, still under the 15.42 parapet.
    for (let f = 1; f < 5; f++) for (let i = 0; i < 3; i++) {
      const wx = 13.6 + i * 4.2;
      fwin(wx, f * FL + 1.55, czb, 2.05, 1.50);
      // Not on the first deck. `f * FL + .50` puts a deck-1 condenser at y 3.60, which is inside
      // the 3.12 .. 3.80 the 五金电器 board occupies and 15 cm proud of its face — so the two the
      // seeded stream happened to place, at x 14.95 and 19.15, stood over the board and ate a
      // character each. Found while proving the awning had stopped hiding the 侧招: the sign was
      // clear and 器 still was not. The `rnd()` is still CONSUMED on deck 1 and only the draw is
      // skipped, because dropping the call re-deals every later decision in the district — down
      // to which of the parade's units have their shutters down.
      if (rnd() > .4 && f > 1) acBox(wx + 1.35, f * FL + .50, czb);
    }
    pane(box(17.8, 1.70, czb + .16, 7.20, 2.40, .07, col.glassDay,
      { hard: true, mode: 1, gloss: G.glass }), .95);
    // A9 · joinery on the district's largest sheet of glass — 7.20 m with not one division in it.
    // The mullions go on the party lines rather than a rhythm of this file's own choosing:
    // js/street-retail.js divides this frontage into three tenancies at x 14.25..16.35,
    // 16.45..19.70 and 19.80..21.36, so 16.40 and 19.75 are the 10 cm gaps between them and a
    // 9 cm bar lands in each with 5 mm to spare. A bar anywhere else would stand across one of
    // that file's doorways, which are built PROUD of this glass. Ends at 14.24 and 21.36.
    for (const mx of [14.24, 16.40, 19.75, 21.36])
      box(mx, 2.15, czb + .19, .09, 1.50, .09, col.steel, { hard: true, gloss: G.metal });
    // A7 · the awning. Same 1.30 m projection as the other two, broken at 16.62 where
    // street-retail.js hangs unit B's 侧招 on the shared BLADE line: 2.27..2.83 against the
    // awning's own 2.68 rear edge is the same air, and the awning is what gives way.
    awning(17.8, 2.92, czb, 10, col.blueSign, col.cream, 16.62);
    // A1 · the housing. 2.90 .. 3.11: bottom on this frontage's glass head at 2.90 — 28 cm higher
    // than 超市's, because this shopfront is taller — and top 1 cm under the 五金电器 board.
    shutterBox(17.8, 3.005, czb + .00, 7.30, .21);
    signBoard(17.8, FASCIA, czb + .04, 6.40, FASCIAH, col.blue, col.cream, '五金电器');
    // ---- 地铁站 the 杨柳胡同 entrance, at the east end of the alley against the courtyard wall.
    // Which is where they go: a hutong gets its station mouth at the mouth of the hutong. Not at
    // x 15 — number 16's gate is at 13.8 and the canopy stood on its threshold.
    metroMouth(19.40, 2.30, '杨柳胡同');
    // The former anonymous south mass at x 10.5..23.2, z -54..-14 is now the authored
    // 杨柳消防救援站 (js/street-firestation.js). Keep the 32 random draws its window grid used so
    // removing that placeholder cannot re-deal the middle-distance skyline or any later street
    // detail. The north mass remains the structural shell skinned by street-hospital.js.
    for (let i = 0; i < 32; i++) rnd();
    for (const [mz, md] of [[26, 34]]) {
      // street-hospital.js now supplies the complete lower wings, returned elevations and tower.
      // The old 13 x 14 x 34 m visual placeholder sat coplanar in front of that authored work and
      // became a blank cuboid from the east cycle track. Keep its physical site contract below,
      // but do not draw a second building over the finished hospital.
      blocker(10.5, 23.2, mz - md / 2, mz + md / 2, 14.0);
      solid(10.5, 23.2, mz - md / 2, mz + md / 2);
      // The anonymous shell's 32 pasted road panes are superseded by the grouped windows in
      // street-hospital.js. Consume their stream positions without leaving floating/copanar glass.
      for (let i = 0; i < 32; i++) rnd();
    }
    // and one continuous stop so the eye can never slip past the far building line
    // Cut at the lane's mouth. js/street-lane.js builds its own side blocks and its own end, so
    // the stop that keeps the eye from slipping past the far building line is not needed there —
    // and left whole it would have stood across the entrance.
    for (const [bz0, bz1] of [[-70, -12.60], [-5.80, 70]])
      blocker(FX, FX + 40, bz0, bz1, 15.5);

    // ---- the middle distance. Without this the built district simply stops and the ground
    // runs out to the horizon as a bare plain, which is the one thing that gives the whole
    // illusion away.
    //
    // Nine seeded parcels sit in the exact view north along the road. They cannot use the old
    // plain-mass treatment: parcels 16, 18, 19 and 20 overlap into one beige elevation, with #18
    // alone spanning x 15.97..48.32 at z 57.29..79.01. From the crossing that hid the sky, the
    // CBD and even the fact that these were separate buildings. Those nine keep their generated
    // bearings, heights and every rnd() draw, but are narrowed onto two building lines around an
    // 11 m visual continuation of the carriageway. Setback upper wings, returned glazing and
    // different cladding make depth readable through the haze. They are distant scenery only:
    // this loop has never added a solid or camera blocker, and still does not.
    const MID_CLAD = [[C('#7f898d'), C('#a3a9a7')], [C('#8f887c'), C('#b9afa0')],
                      [C('#727f89'), C('#a8b3b7')], [C('#8d8274'), C('#b8aa98')]];
    // Two or three recessed bays per face. A single long glass ribbon on alternate floors left
    // the transverse player views as blank cartons with stripes; these compact groups make every
    // exposed return a real elevation while sharing the floor's one deterministic warmth draw.
    const midBayFaces = [];
    const midBays = (axis, face, centre, y, span, warm) => {
      const offsets = span > 10.5 ? [-.29, 0, .29] : [-.25, .25];
      const width = Math.min(1.46, span * (offsets.length === 3 ? .18 : .27));
      for (let k = 0; k < offsets.length; k++) {
        const at = centre + span * offsets[k];
        const slot = { axis, face, lo:at - width / 2, hi:at + width / 2,
          y0:y - .68, y1:y + .68 };
        const covered = midBayFaces.some(q => q.axis === slot.axis &&
          Math.abs(q.face - slot.face) <= .002 &&
          Math.min(q.hi, slot.hi) - Math.max(q.lo, slot.lo) > .01 &&
          Math.min(q.y1, slot.y1) - Math.max(q.y0, slot.y0) > .01);
        if (covered) continue;
        midBayFaces.push(slot);
        const p = axis === 'z'
          ? box(at, y, face, width, 1.36, .16, col.glassDay,
              { hard:true, mode:1, gloss:G.glass })
          : box(face, y, at, .16, 1.36, width, col.glassDay,
              { hard:true, mode:1, gloss:G.glass });
        pane(p, (k + (y * 10 | 0)) % 3 ? warm : warm * .38, true);
      }
    };
    for (let i = 0; i < 44; i++) {
      const a = -1.15 + i * .052 + rnd() * .02;
      const dist = 52 + rnd() * 105;
      const bx = Math.sin(a) * dist * 1.05 + 46, bz = Math.cos(a) * dist * .6 + 30;
      const bh = 9 + rnd() * rnd() * 34, bw = 16 + rnd() * 26;
      const bd = bw * (.6 + rnd() * .7);
      const rows = Math.max(2, Math.floor(bh / 3.4));
      const roadEndParcel = i >= 13 && i <= 22 && i !== 15;
      // Eighteen well-spaced middle-distance addresses read as a city; forty-four overlapping
      // shells read as a wall and cost the frame. Preserve every skipped parcel's one warmth draw
      // per floor so the downstream CBD seed remains byte-stable. i=1 stays as a split proof site.
      if (!roadEndParcel && i !== 1 && i % 4 !== 0) {
        for (let r = 1; r < rows; r++) rnd();
        continue;
      }
      if (!roadEndParcel) {
        // The old generic path emitted every other parcel as one 16–42 m cuboid, then pasted
        // windows on only its south face. Those enormous blank returns were visible from the
        // lane, hotel and courtyard even through the distance haze. Broad parcels are now two
        // independently set-back wings around a real slot; narrower parcels remain one compact
        // stepped address. No collision is added and the floor loop still consumes exactly one
        // random warmth draw per row, preserving every downstream seeded detail.
        const side = bx < 31.5 ? -1 : 1;
        const count = i === 1 || bw > 26 ? 2 : 1;
        const [shell, trim] = MID_CLAD[(i * 5 + 1) % MID_CLAD.length];
        const profiles = [];
        for (let j = 0; j < count; j++) {
          const s = count === 1 ? 0 : (j ? 1 : -1);
          const ww = count === 1
            ? Math.min(18, Math.max(9.2, bw * .54))
            : Math.min(12.4, Math.max(7.2, bw * .30));
          const wd = Math.min(17.0, Math.max(7.4, bd * (.42 + j * .035)));
          const slot = count === 1 ? 0 : Math.min(9.2, bw * .24);
          const wx = bx + s * slot;
          // i=1 is the transverse-view proof parcel. An x-only split projects back into one mass
          // when the player looks west, so its paired wings also leave a real 1m+ notch along z.
          const zSplit = count === 1 ? 0 : i === 1 ? s * 5.15 : (j ? .70 : -.55);
          const wz = bz + zSplit + ((i % 3) - 1) * .26;
          const wh = bh * (count === 2 && j === (i & 1) ? .82 : 1);
          const baseH = Math.min(5.8, Math.max(3.8, wh * .27));
          const uw = ww * (.66 + ((i + j) % 3) * .065);
          const ud = wd * (.70 + ((i + j + 1) % 3) * .055);
          const ux = wx + side * ww * (.07 + ((i + j) % 2) * .035);
          const uz = wz + (j ? .48 : -.38);
          const upperH = Math.max(.8, wh - baseH);
          const splitY = upperH > 11 ? baseH + upperH * .58 : null;
          const lowerTop = splitY || wh;

          box(wx, baseH / 2, wz, ww, baseH, wd, tint(shell, .88, -.006),
            { hard:true, mode:14, gloss:.18 });
          box(ux, (baseH + lowerTop) / 2, uz, uw, lowerTop - baseH, ud, shell,
            { hard:true, mode:14, gloss:.20 });
          let tx = ux, tz = uz, tw = uw, td = ud;
          if (splitY) {
            tw = uw * .72; td = ud * .76;
            tx = ux + side * uw * .10; tz = uz + (j ? .34 : -.28);
            box(tx, (splitY + wh) / 2, tz, tw, wh - splitY, td,
              tint(shell, 1.04, .006), { hard:true, mode:14, gloss:.21 });
          }
          box(wx, baseH + .08, wz, ww + .20, .16, wd + .16, trim,
            { hard:true, gloss:.22 });
          box(tx, wh + .09, tz, tw + .22, .18, td + .18, trim,
            { hard:true, gloss:.23 });
          const groundY=Math.min(2.15,baseH*.52), groundWarm=(i+j)%3?.10:.035;
          midBays('z',wz-wd/2-.055,wx,groundY,ww,groundWarm);
          midBays('z',wz+wd/2+.055,wx,groundY,ww,groundWarm*.78);
          midBays('x',wx-ww/2-.055,wz,groundY,wd,groundWarm*.84);
          midBays('x',wx+ww/2+.055,wz,groundY,wd,groundWarm*.84);
          profiles.push({ wx, wz, ww, wd, ux, uz, uw, ud, wh, baseH,
                          splitY, tx, tz, tw, td });
        }

        for (let r = 1; r < rows; r++) {
          const y = r * (bh / rows) + 1.1;
          const warm = rnd() > .5 ? .9 : 0;
          for (let j = 0; j < profiles.length; j++) {
            const q = profiles[j];
            if (y > q.wh - .45) continue;
            const upper = y > q.baseH;
            let px = upper ? q.ux : q.wx, pz = upper ? q.uz : q.wz;
            let pw = upper ? q.uw : q.ww, pd = upper ? q.ud : q.wd;
            if (upper && q.splitY && y > q.splitY) {
              px=q.tx; pz=q.tz; pw=q.tw; pd=q.td;
            }
            midBays('z', pz - pd / 2 - .055, px, y, pw, warm);
            midBays('z', pz + pd / 2 + .055, px, y, pw, warm * .78);
            midBays('x', px - pw / 2 - .055, pz, y, pd, warm * .84);
            midBays('x', px + pw / 2 + .055, pz, y, pd, warm * .84);
          }
        }
        continue;
      }

      // i 13/14/16/17 are the west building line, i 18..22 the east. The generated centre is
      // retained whenever it already clears the road-end aperture; only the overlapping parcels
      // are pushed outward. Depth is reduced as well, so one long side wall cannot close the gap
      // again from a camera a few metres off the centre line.
      const side = i < 18 ? -1 : 1;
      const generatedW = Math.min(15, bw * (.36 + (i % 3) * .025));
      // Parcels 13 and 14 overlapped by six metres in the transverse cycle-track view. Preserve
      // their generated floors and warmth stream, but resolve them as two addresses with a real
      // 0.88 m fire slot while keeping the established x26..37 road-end aperture untouched.
      const aw = i === 13 ? 10.0 : i === 14 ? 8.20 : generatedW;
      const ax = i === 13 ? 10.82 : i === 14 ? 20.80
        : side < 0 ? Math.min(bx, 26 - aw / 2) : Math.max(bx, 37 + aw / 2);
      const ad = Math.min(15, Math.max(7.5, bd * .32));
      const baseH = Math.min(6.4, Math.max(4.4, bh * .30));
      const upperH = bh - baseH;
      const upperW = aw * (.60 + (i % 3) * .07);
      const upperD = ad * (.70 + ((i + 1) % 3) * .05);
      const upperX = ax + side * aw * (.08 + (i % 2) * .035);
      const upperZ = bz + (i % 2 ? .80 : -.60);
      const [shell, trim] = MID_CLAD[(i * 3) % MID_CLAD.length];
      const splitY = upperH > 11 ? baseH + upperH * .58 : null;
      const lowerTop = splitY || bh;

      box(ax, baseH / 2, bz, aw, baseH, ad, tint(shell, .90, -.004),
        { hard:true, mode:14, gloss:.18 });
      box(upperX, (baseH + lowerTop) / 2, upperZ,
        upperW, lowerTop - baseH, upperD, shell,
        { hard:true, mode:14, gloss:.20 });
      let topX=upperX, topZ=upperZ, topW=upperW, topD=upperD;
      if (splitY) {
        topW=upperW*.70; topD=upperD*.76;
        topX=upperX+side*upperW*.11; topZ=upperZ+(i%2?.34:-.28);
        box(topX,(splitY+bh)/2,topZ,topW,bh-splitY,topD,tint(shell,1.04,.006),
          {hard:true,mode:14,gloss:.21});
      }
      box(ax, baseH + .10, bz, aw + .24, .20, ad + .18, trim,
        { hard:true, gloss:.23 });
      box(topX, bh + .10, topZ, topW + .28, .20, topD + .24, trim,
        { hard:true, gloss:.24 });
      const groundY=Math.min(2.20,baseH*.52), groundWarm=i%3?.10:.035;
      midBays('z',bz-ad/2-.055,ax,groundY,aw,groundWarm);
      midBays('z',bz+ad/2+.055,ax,groundY,aw,groundWarm*.78);
      midBays('x',ax-aw/2-.055,bz,groundY,ad,groundWarm*.84);
      midBays('x',ax+aw/2+.055,bz,groundY,ad,groundWarm*.84);

      // Exactly one rnd() per authored floor, as before. The same warmth value serves the front
      // and all four returned bay groups; no extra randomness shifts the CBD anchors below.
      for (let r = 1; r < rows; r++) {
        const y = r * (bh / rows) + 1.1;
        const upper = y > baseH;
        let px = upper ? upperX : ax, pz = upper ? upperZ : bz;
        let pw = upper ? upperW : aw, pd = upper ? upperD : ad;
        if (upper && splitY && y > splitY) {
          px=topX; pz=topZ; pw=topW; pd=topD;
        }
        const warm = rnd() > .5 ? .9 : 0;
        midBays('z', pz - pd / 2 - .055, px, y, pw, warm);
        midBays('z', pz + pd / 2 + .055, px, y, pw, warm * .78);
        midBays('x', px - pw / 2 - .055, pz, y, pd, warm * .84);
        midBays('x', px + pw / 2 + .055, pz, y, pd, warm * .84);
      }
    }

    // A porous service court between the playable road and the spaced middle-distance addresses.
    // Thinning the old overlapping parcels restored sky and performance, but leaving the world
    // plane exposed made the transverse cycle-track view look like a black vacant canyon. This is
    // scenery only: paved court, one narrow service street, planted islands and slim lamps, with
    // no solid, blocker, interaction or random draw.
    flat(-4.0,.006,60.0,53.0,39.0,col.paveD,{mode:9,gloss:.10,...PAVE});
    flat(-4.0,.010,60.0,7.4,39.0,C('#4b5052'),{mode:9,gloss:.08});
    flat(-9.0,.011,60.0,2.3,39.0,tint(col.pave,.92),{mode:9,gloss:.10,...PAVE});
    flat( 1.0,.011,60.0,2.3,39.0,tint(col.pave,.92),{mode:9,gloss:.10,...PAVE});
    for(let z=44;z<=78;z+=6)
      flat(-4.0,.014,z,.10,2.20,col.cream,{gloss:.16});
    for(const [x,z,s] of [[-13.0,45.5,.84],[4.8,49.0,.72],[-12.2,58.0,.76],
                           [5.1,63.0,.82],[-13.4,71.5,.70],[4.4,76.0,.76]]){
      taper(x,.22,z,s*1.32,.44,s*1.06,C('#858983'),{gloss:.16,mode:9});
      cyl(x,.92,z,.085,1.52,C('#6a5745'),{gloss:.16});
      for(const [dx,dz,sc] of [[-.24,-.10,.42],[.20,-.05,.46],[.02,.22,.40]])
        ball(x+dx,1.78,z+dz,sc,.38,sc,C('#657d58'),{mode:15,gloss:.08});
    }
    // These stand on the near service walk, where their light can actually be read from the
    // cycle track.  The first version put four edge-on 16 cm heads 35--45 m away: their meshes
    // were technically emissive, but at the authored player camera they were sub-pixel dark
    // ticks and the whole court still looked unsafe.  A broadside cut-off head, a short curved
    // arm and a wider pool give the court a real night rhythm without point lights or collision.
    for(const [x,z] of [[17.2,46.5],[6.4,55.0],[17.2,65.0],[6.4,74.0]]){
      cyl(x,2.18,z,.042,4.36,C('#646b6e'),{gloss:.36});
      capsule(x,4.24,z-.18,.034,.42,.034,C('#70787a'),
        {rx:Math.PI/2,gloss:.40});
      box(x,4.32,z-.37,.18,.10,.72,C('#737b7d'),{hard:true,gloss:.42});
      litten(box(x,4.265,z-.37,.14,.038,.58,C('#fff0c2'),
        {hard:true,mode:1,glow:.08,gloss:.54}),1.15);
      lampPools.push(glow(M.trs(x,.020,z-.38,0,5.4,1,6.4),C('#ffc878'),0));
      lampPools.push(glow(M.trs(x,.022,z-.38,0,2.5,1,3.2),C('#ffe0a4'),0));
    }

    // ============================================================ people and street life
    // Everyone stands clear of the middle of the alley, so the walk stays open.
    const APRON = C('#b8443a'), TEAL = C('#3d7f7a'), MAROON = C('#7a3a3f'),
          OLIVE = C('#5c6248'), CREAMTOP = C('#cfc4ae'), NAVY = C('#2b3a52');
    // the breakfast stall: someone behind the steamers, someone waiting for their baozi
    // an old man on a stool against the courtyard wall, under a hanging bird cage
    const oldX = 4.6, oldZ = SZ - .62;
    taper(oldX, .17, oldZ, .30, .34, .30, col.trunkL, { gloss: G.wood });
    // The cage hangs off a bracket bolted to the courtyard wall behind him. On a horizontal
    // stub in mid-air it floated, and on a floor stand it read as a standard lamp.
    capsule(oldX - .95, 2.14, CWZ - .48, .026, .62, .026, col.steelD,
      { rx: Math.PI / 2, gloss: G.metal });
    capsule(oldX - .95, 1.98, CWZ - .34, .020, .40, .020, col.steelD,
      { rx: -.85, gloss: G.metal });
    box(oldX - .95, 2.10, CWZ - .22, .10, .18, .06, col.steelD, { hard: true, gloss: .34 });
    const cageZ = CWZ - .76;
    capsule(oldX - .95, 2.02, cageZ, .012, .22, .012, col.steelD, { gloss: G.metal });
    cyl(oldX - .95, 1.68, cageZ, .17, .42, C('#c9ad72'), { gloss: G.wood });
    for (let i = 0; i < 10; i++)
      capsule(oldX - .95 + Math.sin(i * .628) * .165, 1.68, cageZ + Math.cos(i * .628) * .165,
        .012, .42, .012, C('#8d7548'), { gloss: G.wood });
    cyl(oldX - .95, 1.91, cageZ, .19, .05, C('#8d7548'), { gloss: G.wood });
    ball(oldX - .95, 1.63, cageZ - .06, .045, .05, .04, C('#c8b45e'), { gloss: .2 });
    // the courier by his trike, and two neighbours over the mahjong table at the west end
    // waiting for the bus, and someone walking up to the shop

    // ---- festival wire: two runs of small lanterns across the alley
    for (const [lx, ly] of [[-1.2, 3.35], [12.6, 3.35]]) {
      capsule(lx, ly, .5, .014, 6.6, .014, col.charcoal,
        { rz: Math.PI / 2 + .04, gloss: .30 });
      for (let i = 0; i < 7; i++)
        miniLantern(lx - 2.4 + i * .80, ly - .28 - Math.cos((i - 3) * .5) * .10, .5 - i * .015,
          i % 2 ? col.red : C('#c8562f'));
    }
    // sparrows lined up along the power lines
    for (const [bx, by, n] of [[3.4, 6.94, 5], [-6.2, 7.02, 4], [16.0, 6.96, 3]])
      for (let i = 0; i < n; i++) {
        const px = bx + i * .34;
        ball(px, by + .055, -2.18, .038, .045, .055, C('#4a4239'), { gloss: .12 });
        ball(px + .045, by + .075, -2.18, .022, .022, .022, C('#3a342d'), { gloss: .12 });
      }

    // ---- puddles left in the hollows of the paving
    for (const [px, pz, pw, pd] of [[-3.4, -1.75, 1.5, .8], [6.8, 1.9, 1.1, .7],
                                    [-16.2, .4, 1.8, 1.0], [22.4, -1.6, 1.3, .8]]) {
      flat(px, .011, pz, pw, pd, C('#3b4046'), { gloss: .92 });
      flat(px, .015, pz, pw * .72, pd * .72, C('#2f343a'), { gloss: .95 });
    }

    // ---- hanging shop banners, the vertical kind on every Chinese shopfront
    for (const [hx, hcol, htext] of [[SHOP - 3.5, col.red, '烟酒茶叶'],
                                     [SHOP + 3.5, col.blueSign, '手机维修']]) {
      capsule(hx, 3.05, ez + .55, .018, .60, .018, col.steelD, { rz: Math.PI / 2, gloss: .3 });
      box(hx, 2.30, ez + .80, .34, 1.44, .04, hcol, { hard: true, gloss: .26 });
      for (const g of B.glyphs(hx, 2.30, ez + .82, 0, htext,
          { size: .26, gap: .08, vertical: true, color: col.cream, mode: 1, glow: .18 }))
        litten(g, .8);
    }

    // ---- 报刊亭: a wall-integrated open news rack near the mouth of the alley.
    // Even the earlier shallow kiosk still sat inside WILLOW_OUT's normal camera orbit: a 25° turn
    // put the camera inside its canopy. This is now part of the shopfront — three shelves, slender
    // jambs and a 12 cm flashing, all behind the legal body edge, with no freestanding collider.
    const kx2 = 20.55, kz2 = -2.82, NEWS = C('#2f6f5e'), NEWSD = C('#245a4c');
    for (const ox of [-.72, .72])
      box(kx2 + ox, 1.23, kz2 + .035, .055, 2.04, .080, NEWS,
        { hard:true, gloss:.28 });
    for (const y of [.67, 1.17, 1.67]) {
      box(kx2, y, kz2 + .055, 1.48, .050, .10, NEWSD,
        { hard:true, gloss:.28 });
      for (const ox of [-.66, .66])
        capsule(kx2 + ox, y - .14, kz2 + .015, .012, .28, .012, col.steelD,
          { rx:ox * .12, gloss:G.metal });
    }
    // Open slatted lower return bay: stock can be seen through it instead of another green box.
    for (const oz of [-.035, .035])
      box(kx2, .12, kz2 + oz, 1.38, .045, .032, NEWS, { hard:true, gloss:.26 });
    for (const x0 of [kx2 - .68, kx2, kx2 + .68])
      capsule(x0, .35, kz2 + .02, .015, .54, .015, NEWS, { gloss:.26 });
    box(kx2, 2.22, kz2 - .005, 1.62, .055, .12, col.tileD,
      { hard:true, mode:13, gloss:.22, rx:-.05, ...RTILE });
    signBoard(kx2, 2.04, kz2 + .085, 1.38, .27, NEWSD, col.paintY, '报刊亭', 1, .7);
    // The stock. These were six coloured rectangles lying on their sides — landscape, which no
    // magazine has ever been — and blank, on the one prop in the district that exists to sell
    // print. They stand portrait now with a masthead on each, and the covers below the fold are
    // the second thing on this street after the shop parade that is worth stopping to read.
    const MASTS = ['读者', '时尚', '汽车', '体育', '故事', '中国'];
    for (let i = 0; i < 6; i++) {
      const mx = kx2 - .58 + (i % 3) * .58, my = 1.06 + ((i / 3) | 0) * .44;
      const mc = [col.plastic, col.paintY, col.blue, col.cream, col.teal, col.redL][i];
      box(mx, my, kz2 + .125, .30, .40, .022, mc, { hard: true, gloss: .22 });
      // A pale band across the top for the masthead to sit on. Ink straight onto a mid-blue or
      // a mid-green cover disappeared; every real cover puts its name on white or on a block.
      box(mx, my + .145, kz2 + .140, .28, .09, .006, col.cream, { hard: true, gloss: .16 });
      B.glyphs(mx, my + .145, kz2 + .146, 0, MASTS[i],
        { size: .066, gap: .008, color: i === 3 ? col.blueSign : col.redD,
          gloss: .10, lift: .005 });
      // Two ruled bands lower down, standing in for the cover lines. Glyphs at that size came out
      // as grey fur and cost eight quads a cover.
      for (let k = 0; k < 2; k++)
        box(mx - .04, my - .06 - k * .07, kz2 + .140, .19 - k * .05, .022, .006,
          C('#efe9dc'), { hard: true, gloss: .12 });
    }
    // Folded newspapers on the counter, weighted down with a length of pipe, which is how every
    // one of these keeps its stock from going down the alley in the wind. No mastheads on these:
    // `glyphs` always stands its quads up, so writing on a surface lying flat is edge-on to the
    // camera and invisible. The two papers pegged over the wire above them carry the names.
    for (let i = 0; i < 3; i++) {
      const px3 = kx2 - .52 + i * .52;
      box(px3, .725, kz2 + .085, .46, .05, .12, C('#d8d2c2'),
        { hard: true, gloss: .10, ry: (i - 1) * .06 });
      box(px3, .762, kz2 + .090, .44, .03, .10, C('#cfc8b6'),
        { hard: true, gloss: .10, ry: (i - 1) * .06 });
    }
    capsule(kx2, .80, kz2 + .13, .012, 1.38, .012, col.steelD,
      { rz: Math.PI / 2, gloss: G.metal });
    // Two papers pegged to the front lip of the counter, hanging down its face. Below the counter
    // rather than above it, because everything above is display board and magazine: hung there
    // they were 10 cm behind the covers and the covers hid them completely.
    for (const [ox, name] of [[-.44, '北京日报'], [.46, '晚报']]) {
      box(kx2 + ox, .40, kz2 + .145, .52, .42, .012, C('#d8d2c2'),
        { hard: true, gloss: .08, ry: ox * .1 });
      B.glyphs(kx2 + ox, .53, kz2 + .153, 0, name,
        { size: .085, gap: .012, color: col.charcoal, gloss: .06, lift: .005 });
      for (let k = 0; k < 3; k++)
        box(kx2 + ox, .36 - k * .070, kz2 + .152, .42 - k * .06, .022, .006,
          C('#c2bcaa'), { hard: true, gloss: .06 });
      for (const t of [-1, 1])
        box(kx2 + ox + t * .18, .62, kz2 + .150, .04, .06, .03, col.plastic,
          { hard: true, gloss: .30 });
    }
    shade(kx2, kz2 + .02, 1.7, .35, .22);

    // ---- satellite dishes and a few aerials on your own block
    for (const [dx, dy] of [[-11.4, 8.2], [-4.6, 14.1], [6.8, 5.4], [9.4, 11.0]]) {
      capsule(dx, dy, NB.z1 + .22, .026, .34, .026, col.steelD, { rz: Math.PI / 2, gloss: .34 });
      taper(dx, dy, NB.z1 + .48, .52, .16, .52, col.white, { rx: -1.25, gloss: .30 });
      capsule(dx, dy + .04, NB.z1 + .40, .02, .22, .02, col.steelD, { rx: -1.25, gloss: .34 });
    }

    // ---- steam off the drain covers, and off the steamer baskets
    //
    // Three puffs each, and they used to hang at exactly the height they were built at for the
    // whole game. Steam that does not rise is fog. `tick` walks each puff up its own metre and
    // starts it again at the bottom, fading as it goes, so the stall reads as working.
    for (const [sx2, sz2] of [[-13.0, -1.62], [6.5, -1.62]])
      for (let i = 0; i < 3; i++) {
        const x = sx2 + (i - 1) * .12, y0 = .30;
        const r = .26 - i * .05, a0 = .13 - i * .035, phase = i / 3;
        const u = phase, grow = 1 + u * 1.5;
        const p = ball(x, y0 + u * 1.05, sz2, r, .20, r,
          C('#e8e6e0'), { mode: 1, alpha: .13 - i * .035 });
        // Initialise on the tick trajectory and retain one conservative cull envelope around its
        // full 1.05 m rise. Steam is a translucent loose draw, not a dynamic batch, so its packed
        // cull centre is intentionally fixed around the complete authored motion.
        p.m = M.trs(x, y0 + u * 1.05, sz2, 0, r * grow, .20 * grow, r * grow);
        p.alpha = a0 * (1 - u) * (1 - u) * 1.6;
        p.fixed = true;
        p.cx = x; p.cy = y0 + .525; p.cz = sz2;
        p.r = .595 + .5 * Math.hypot(r * 2.5, .50, r * 2.5);
        p.stateOwner = 'base:steam';
        // The pair at x -13 are drain covers and steam all day; the pair by the stall belong to
        // the steamers and knock off with them.
        steam.push({ p, x, y0, z: sz2, stall: sx2 > 0, r, a0, phase });
      }

    // ---- 阿姨's stool, by the gate where she sits most of the day. She is drawn by the figure
    // rig in game.js and knows to sit down here; without something under her she was sitting on
    // the paving in mid-alley.
    taper(1.9, .17, 1.55, .32, .34, .32, col.trunkL, { gloss: G.wood });
    box(1.9, .37, 1.55, .34, .04, .34, col.trunkL, { hard: true, gloss: G.wood });
    shade(1.9, 1.55, .8, .8, .30);

    // ---- 石狮子 flanking the gate you can actually walk up to, set out on the street side
    // so they read from the alley rather than from a courtyard you never stand in.
    for (const s of [-1, 1]) stoneLion(.2 + s * 1.70, CWZ - .95, s);
    thing('石狮子', 1.90, 1.30, CWZ - .95, '大门两边有两个石狮子。',
      'There are two stone lions either side of the gate.',
      '石 stone + 狮子 lion. They come in pairs and always have.',
      { focus: [1.9, CWZ - 2.2], reach: 2.2 });

    // ---- pigeon lofts on two of the courtyard roofs, and a bird on the wall coping
    pigeonLoft(-18.6, 3.55, CWZ + 2.0);
    pigeonLoft(8.2, 3.55, CWZ + 2.0);

    // ---- 修车 the bicycle-repair pitch: a wheel off, a pump, a crate of tools and the man
    // who has been doing it on this corner for thirty years.
    // -22.40, not -17.8. Blueprint 4.2: the pitch moves west with the residential half, now that
    // the trading half of the hutong is everything east of the lock-ups. Clear of the scooter
    // parked at -24.60 by 0.90 m at the bike's widest, and the washing overhead is at y 2.4..3.0.
    const rx0 = -22.40, rz0 = -1.30, RP = { tag: '修车' };
    // The bench, the tools and the crate carry the tag, so the corner can be pointed at as well as
    // stood in front of. Nothing here was pickable before, which for a thing whose focus was also
    // out of reach meant the word could not be got at at all.
    box(rx0, .30, rz0, 1.20, .06, .60, col.steelD, { hard: true, gloss: .34, ...RP });  // bench
    for (const [ox, oz] of [[-.5, -.24], [.5, -.24], [-.5, .24], [.5, .24]])
      capsule(rx0 + ox, .15, rz0 + oz, .035, .30, .035, col.steelD, { gloss: .34, ...RP });
    for (let i = 0; i < 5; i++)                                   // tools laid out on it
      box(rx0 - .42 + i * .21, .35, rz0 - .06, .05, .04, .26,
        [col.steel, col.charcoal, col.plastic, col.steel, col.paintY][i],
        { hard: true, gloss: .44, ry: (i % 2) * .3, ...RP });
    box(rx0 + 1.05, .22, rz0 - .05, .52, .44, .40, col.trunkL,
      { hard: true, gloss: G.wood, ...RP });
    for (let i = 0; i < 4; i++)                                   // odds and ends in the crate
      ball(rx0 + .90 + (i % 2) * .30, .48, rz0 - .16 + ((i / 2) | 0) * .22,
        .055, .05, .055, [col.steel, col.charcoal, col.plastic, col.steel][i],
        { gloss: .40, ...RP });
    // The bike he is working on, and its front wheel off and propped against the wall. Built
    // freehand as an upturned frame it came out as three orange sticks and two floating discs;
    // the bike helper already knows what a bicycle looks like.
    // Front wheel off, which is the whole point of the pitch: a spare stood against the wall, three
    // more hanging above it, a man with his tools laid out — and a bicycle with both wheels on, so
    // nothing in this corner was being mended.
    bike(rx0 - 1.30, rz0 + .12, .07, col.bikeO, false, false, { front: false });
    // The fork, and the brick it is resting on. `bike()` has never modelled a fork because the
    // wheel always filled that space, so taking the wheel off left a hand's width of daylight
    // between the frame and the ground with the bike hanging in it.
    const FKA = .07, FKS = Math.sin(FKA), FKC = Math.cos(FKA);
    const fkx = rx0 - 1.30 + FKS * .50, fkz = rz0 + .12 + FKC * .50;
    for (const t of [-1, 1])
      capsule(fkx + FKC * t * .045, .52, fkz - FKS * t * .045, .022, .40, .022, col.bikeO,
        { ry: FKA, rx: -.16, gloss: .34 });
    box(fkx + FKS * .05, .16, fkz + FKC * .05, .30, .32, .24, col.brickD,
      { hard: true, mode: 11, ry: FKA, gloss: G.matte });
    // Open repair wheels: articulated tyre arcs, a separate rim and real spokes. The old pair of
    // filled cylinders became four black pucks from the square and hid the wall behind them.
    const repairWheel = (cx, cy, wz, r, tag) => {
      const tyreN = 16, tyreR = r * .86;
      for (let i = 0; i < tyreN; i++) {
        const a = i * Math.PI * 2 / tyreN;
        capsule(cx + Math.cos(a) * tyreR, cy + Math.sin(a) * tyreR, wz,
          r * .105, tyreR * .42, r * .055, C('#25282b'),
          { rz: a, gloss: .28, tag });
      }
      const rimN = 12, rimR = r * .58;
      for (let i = 0; i < rimN; i++) {
        const a = i * Math.PI * 2 / rimN;
        capsule(cx + Math.cos(a) * rimR, cy + Math.sin(a) * rimR, wz - .010,
          .012, rimR * .54, .009, col.steel,
          { rz: a, gloss: G.metal, tag });
      }
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        capsule(cx + Math.cos(a) * rimR * .48, cy + Math.sin(a) * rimR * .48, wz - .014,
          .009, rimR * .96, .007, col.steelD,
          { rz: a - Math.PI / 2, gloss: G.metal, tag });
      }
      ball(cx, cy, wz - .018, .038, .038, .020, col.steelD, { gloss: G.metal, tag });
    };
    repairWheel(rx0 - 2.15, .35, ez + .34, .34, '修车');
    for (const [tx, ty] of [[rx0 - 2.30, 1.42], [rx0 - 2.30, 2.02], [rx0 - 1.86, 1.72]]) {
      repairWheel(tx, ty, ez + .22, .30, '修车');
      capsule(tx, ty + .30, ez + .17, .012, .10, .012, col.steelD, { gloss: G.metal });
    }
    // A coiled 内胎 on a nail beside the tyres. There is no torus in the mesh set, so it is a ring
    // of short capsules end to end — twelve of them read as a loop of rubber at this size, where a
    // flat black annulus read as a hole in the wall.
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      // `rz` is the tangent angle, not the radius angle: rotZ(a) turns the capsule's own +y axis
      // to (-sin a, cos a), which is exactly the tangent at a. Signed the other way the segments
      // splayed outward and the ring came out as a star.
      capsule(rx0 - 1.30 + Math.cos(a) * .155, 1.60 + Math.sin(a) * .155, ez + .21,
        .026, .092, .026, C('#22252a'), { rz: a, gloss: .30 });
    }
    capsule(rx0 - 1.30, 1.80, ez + .15, .010, .09, .010, col.steelD, { gloss: G.metal });
    capsule(rx0 - 1.30, 1.375, ez + .21, .012, .10, .012, col.steel,
      { gloss: G.metal });                                            // the valve stem
    // floor pump, a stool, and the pressure gauge board
    cyl(rx0 + .40, .28, rz0 + .34, .09, .56, col.plastic, { gloss: .34 });
    capsule(rx0 + .40, .68, rz0 + .34, .022, .38, .022, col.steel, { gloss: G.metal });
    box(rx0 + .40, .90, rz0 + .34, .16, .10, .06, col.charcoal, { hard: true, gloss: .34 });
    taper(rx0 - .05, .19, rz0 + .48, .30, .38, .30, col.trunkL, { gloss: G.wood });
    box(rx0 - .05, .39, rz0 + .48, .32, .04, .32, col.trunkL, { hard: true, gloss: G.wood });
    signBoard(rx0, 1.80, ez + .12, 1.10, .40, col.blueSign, col.white, '修车', 1, .5);
    solid(rx0 - 2.2, rx0 + 1.4, rz0 - .5, rz0 + .7);
    shade(rx0 - .4, rz0 + .1, 4.4, 1.8, .30);
    // The focus was at rz0 - 1.9, which is z -3.9: past the alley's own walkable edge at -2.35 and
    // behind this pitch's collider, which pushes the body back out to -1.0. The closest anyone could
    // stand was 2.55 m from a focus with a reach of 2.4, so 李师傅's corner has never been readable.
    // It faces down the alley now, on the side you actually walk past on.
    thing('修车', rx0, 1.30, rz0 - .2, '这里可以修自行车。',
      'You can get a bicycle fixed here.',
      '修 to repair + 车 vehicle. Every alley has one of these.',
      { focus: [rx0, rz0 + 1.10], reach: 2.2 });

    // ---- e-scooters, the quilted kind, parked where everyone parks them
    scooter(12.9, -2.05, .12, col.frame, C('#b8425c'), '电动车');
    scooter(14.6, -2.05, -.08, col.charcoal, C('#2f6f8f'), '电动车');
    // Two untagged duplicates are deliberately omitted.  The west one sat in the exact 公共厕所
    // establishing camera; the east one filled the metro2/crossing foreground.  Neither taught a
    // word, and the retained tagged pair plus the live road moped already establish the family.
    thing('电动车', 13.2, 1.35, -2.05, '楼下停着很多电动车。',
      'A lot of e-scooters are parked downstairs.',
      '电动车 — electric vehicle. The quilt over the bars is a 挡风被.',
      { focus: [13.2, -.6], reach: 2.2 });

    // ---- the dog, asleep in the sun against the courtyard wall
    // Turned to face the alley. Nose to the wall you saw nothing but a beige lump.
    // Into 杨柳西口 with the dancers and the chess. Against the square's own north wall
    // (brickRun -33.2..-23.6 at z 7.4, face 7.19), a metre off it, facing south into the square —
    // the same relationship it had to the courtyard wall in the alley.
    dog(-31.20, 6.10, Math.PI - .55);
    // Its bowl. Every hutong stray has one, put out by whoever on the alley has decided it is
    // theirs, and without it the animal is scenery rather than somebody's dog. Placed off the
    // dog's own heading rather than at a fixed offset — dropped straight down +x it landed behind
    // the animal's shoulder where a bowl is no use to anyone.
    const DBA = Math.PI - .55;
    const DBX = 3.7 + Math.sin(DBA) * .62, DBZ = CWZ - .80 + Math.cos(DBA) * .62;
    cyl(DBX, .035, DBZ, .125, .07, col.steelD, { gloss: .44, tag: '碗' });
    cyl(DBX, .062, DBZ, .104, .022, C('#3f4a52'), { gloss: .94, tag: '碗' });
    cyl(DBX, .074, DBZ, .130, .016, col.steel, { gloss: .48, tag: '碗' });
    thing('碗', DBX, .48, DBZ, '狗的碗里有水。', "There is water in the dog's bowl.",
      '一个碗 — and 一碗面 is a bowl of noodles. The same word does both jobs.',
      { focus: [4.35, 1.45], reach: 1.8 });

    // ---- 大白菜 stacked against the wall for the winter, and a flatbed trike loaded with it
    // One palette, used by both loads. The stack against the wall was three greens and the load on
    // the trike beside it was a fourth green of its own, so the cabbage that had just come off the
    // trike was visibly a different vegetable from the cabbage stacked two metres away.
    const CABBAGE = [C('#b7c48c'), C('#c7d09d'), C('#aab97d')];
    const cabbageAt = (cx, cy, cz, i) => {
      const base = CABBAGE[i % CABBAGE.length];
      ball(cx, cy, cz, .135, .105, .145, base,
        { gloss: .14, ry: i * .63, tag: '白菜' });
      // Overlapping outer leaves and pale ribs break the old smooth egg silhouette. Every offset
      // is deterministic so this street's authored RNG stream and all downstream parcels stay put.
      for (let q = 0; q < 6; q++) {
        const a = q * Math.PI / 3 + i * .31;
        ball(cx + Math.cos(a) * .070, cy + Math.sin(a) * .032,
          cz - .052 + Math.sin(a) * .020, .078, .070, .050,
          CABBAGE[(i + q + 1) % CABBAGE.length],
          { gloss: .12, ry: a, rz: Math.sin(a) * .22, tag: '白菜' });
      }
      for (const a of [-.62, 0, .62])
        capsule(cx + Math.sin(a) * .030, cy + Math.cos(a) * .015, cz - .108,
          .008, .115, .006, C('#e1e3b9'),
          { rz: a, gloss: .12, tag: '白菜' });
    };
    const cabbageRows = [4, 3, 2];
    let cabbageIndex = 0;
    for (let r = 0; r < cabbageRows.length; r++) {
      const count = cabbageRows[r];
      for (let c = 0; c < count; c++) {
        cabbageAt(-24.55 + r * .14 + c * .31, .135 + r * .225,
          CWZ - .62 + (r % 2) * .045, cabbageIndex++);
      }
    }
    thing('白菜', -24.00, .70, CWZ - .62, '冬天大家都买很多白菜。',
      'Everyone buys a lot of cabbage for the winter.',
      '白 white + 菜 vegetable. 大白菜 is the Beijing winter staple.',
      { focus: [-24.00, CWZ - 2.0], reach: 2.0 });
    // The former second cabbage flatbed is deliberately gone. Its 1.60 m slab deck, 1.16 m tyres
    // and 2.20 × 1.20 m collider sat physically through the sorting-bin bay at x -22 and hid the
    // entire north wall. This street already has a framed courier trike here and a live delivery
    // trike on the road; another parked vehicle added duplication, not life. The winter cabbage
    // stack above retains the scene, word, focus point and interaction without blocking the route.

    // ---- services on the face of the block: meters, the gas riser, a hose reel, a hydrant
    // The cabinet that used to sit at -6.6 is gone: the noodle shop's frontage is there now.
    // The two western risers moved out of the lock-up terrace js/street-alley.js stands on this
    // face (-14.90 .. -9.52): -14.2 was behind 修鞋配钥匙 and -10.9 was inside 打印复印, pipe
    // through shutter, and a 6.2 m capsule inside a housing is invisible from every angle there
    // is. -16.28 is the block's west corner, 6 cm clear of the wallJunk in front of it; -2.30 is
    // the pier between the noodle shop and the 单元门, which is where a riser goes anyway.
    for (const [mx, kind] of [[-3.45, 1], [11.4, 0], [15.6, 1], [-16.28, 1]]) {
      if (kind === 0) {                                   // electricity meters, doors open
        box(mx, 1.42, ez + .20, 1.00, .78, .18, col.steelD, { hard: true, gloss: .34 });
        box(mx, 1.42, ez + .30, .90, .68, .03, col.charcoal, { hard: true, gloss: .30 });
        for (let i = 0; i < 6; i++)
          box(mx - .32 + (i % 3) * .32, 1.56 - ((i / 3) | 0) * .28, ez + .33,
            .22, .18, .04, col.frame, { hard: true, gloss: .30 });
        box(mx, 1.02, ez + .22, .12, .60, .10, col.charcoal, { hard: true, gloss: .30 });
      } else {                                            // gas riser, painted yellow
        capsule(mx, 3.10, ez + .16, .045, 6.20, .045, col.paintY, { gloss: .34 });
        box(mx, 1.30, ez + .20, .34, .44, .22, col.paintY, { hard: true, gloss: .30 });
        box(mx, 1.30, ez + .32, .24, .30, .03, col.frame, { hard: true, gloss: .34 });
        capsule(mx + .22, 1.62, ez + .16, .03, .44, .03, col.paintY, { rz: -.7, gloss: .34 });
        for (const y of [.55, 2.30, 4.10])
          box(mx, y, ez + .16, .16, .07, .18, col.steelD, { hard: true, gloss: .34 });
      }
    }
    // fire hose cabinet by the shop, and a hydrant on the kerb line
    box(17.9, 1.30, ez + .22, .84, 1.10, .22, col.red, { hard: true, gloss: .34 });
    box(17.9, 1.34, ez + .34, .70, .90, .03, col.redD, { hard: true, gloss: .28 });
    box(17.9, 1.34, ez + .36, .46, .60, .02, col.glassDark, { hard: true, mode: 1 });
    box(17.9, 1.94, ez + .24, .90, .16, .24, col.redD, { hard: true, gloss: .30 });
    for (let i = 0; i < 3; i++)
      box(17.65 + i * .25, 1.94, ez + .37, .14, .12, .02, col.white,
        { hard: true, mode: 1 });
    cyl(-2.9, .34, -2.10, .13, .68, col.red, { gloss: .34 });
    cyl(-2.9, .72, -2.10, .16, .10, col.redD, { gloss: .34 });
    for (const t of [-1, 1])
      cyl(-2.9 + t * .16, .50, -2.10, .07, .10, col.redD, { rz: Math.PI / 2, gloss: .34 });
    // the cable bundle everyone's television hangs off, stapled along the plinth
    for (let i = 0; i < 3; i++)
      capsule(nbx, 1.56 + i * .07, ez + .13, .022, nbw - .4, .022, col.black,
        { rz: Math.PI / 2, gloss: .26 });

    // ---- 横幅 the red slogan banner, wired flat along the courtyard wall
    box(-21.2, 1.95, CWZ - .26, 5.60, .62, .04, col.red, { hard: true, gloss: .18 });
    B.glyphs(-21.2, 1.95, CWZ - .29, Math.PI, '垃圾分类从我做起',
      { size: .42, gap: .16, color: col.cream, mode: 1, lift: .008 });
    for (const s of [-1, 1])
      capsule(-21.2 + s * 2.80, 1.95, CWZ - .24, .012, .70, .012, col.steelD, { gloss: .3 });

    // ---- 快递. Five loose cartons made a little beige wall beside HOME_OUT. A low open courier
    // cage keeps deliveries off the paving; soft mailers, tied sacks and flat envelopes provide
    // the same lived-in cue without stacking cuboids in the first view out of the building.
    const PKX = -3.42, PKZ = ez + .52, PKTAG = { tag: '快递' };
    for (let i = 0; i < 6; i++)
      box(PKX, .095, PKZ - .25 + i * .10, 1.06, .035, .060, col.steelD,
        { hard: true, gloss: G.metal, ...PKTAG });
    for (const ox of [-.52, .52]) for (const oz of [-.27, .27])
      capsule(PKX + ox, .43, PKZ + oz, .018, .70, .018, col.steelD,
        { gloss: G.metal, ...PKTAG });
    for (const y of [.26, .58]) {
      for (const oz of [-.27, .27])
        capsule(PKX, y, PKZ + oz, .016, 1.04, .016, col.steel,
          { rz: Math.PI / 2, gloss: G.metal, ...PKTAG });
      for (const ox of [-.52, .52])
        capsule(PKX + ox, y, PKZ, .016, .54, .016, col.steel,
          { rx: Math.PI / 2, gloss: G.metal, ...PKTAG });
    }
    for (const ox of [-.42, .42]) {
      ball(PKX + ox, .055, PKZ + .31, .075, .075, .045, col.black,
        { gloss: .20, ...PKTAG });
      capsule(PKX + ox, .09, PKZ + .25, .012, .12, .012, col.steelD,
        { rx: Math.PI / 2, gloss: G.metal, ...PKTAG });
    }
    // Soft poly mailers sag rather than hold a carton profile. Seams, address sleeves and tied
    // necks make each item legible as a different delivery.
    const MAIL = [C('#c8bda5'), C('#9eaaad'), C('#b6a98f')];
    for (const [i, ox, oy, oz, rx, rz] of [[0,-.27,.29,-.08,.25,-.18],
                                           [1, .18,.25, .08,.22, .24],
                                           [2, .02,.48,-.04,.18,-.10]]) {
      ball(PKX + ox, oy, PKZ + oz, rx, .16, rz < 0 ? .18 : .16, MAIL[i],
        { mode: 7, gloss: .10, rz, ...PKTAG });
      capsule(PKX + ox, oy + .13, PKZ + oz, .009, rx * 1.45, .009, C('#7f7462'),
        { rz: Math.PI / 2 + rz, gloss: .10, ...PKTAG });
      box(PKX + ox, oy + .03, PKZ + oz - .17, .16, .09, .006, C('#e2ded1'),
        { hard: true, ry: rz, gloss: .08, ...PKTAG });
    }
    // Two flat document envelopes lean in the back of the cage, and one tied mailing tube lies
    // across the floor. Their thin profiles cannot merge into another parcel wall.
    for (const [ox, y, r] of [[-.24,.46,-.16],[.28,.40,.20]]) {
      box(PKX + ox, y, PKZ + .20, .36, .025, .27, C('#b99d70'),
        { hard: true, ry: r, rz: -.22, gloss: .10, ...PKTAG });
      capsule(PKX + ox, y + .015, PKZ + .20, .008, .30, .008, C('#d4c8ae'),
        { rz: Math.PI / 2 + r, gloss: .10, ...PKTAG });
    }
    capsule(PKX, .18, PKZ - .11, .055, .62, .055, C('#a98e63'),
      { rz: Math.PI / 2, gloss: .12, ...PKTAG });
    for (const ox of [-.28, .28])
      capsule(PKX + ox, .18, PKZ - .11, .008, .20, .008, C('#d4c8ae'),
        { rx: Math.PI / 2, gloss: .10, ...PKTAG });
    shade(-3.4, ez + .55, 1.6, 1.2, .30);

    // ---- a birdcage hung in one of the trees, and dates on another
    capsule(4.6, 2.62, -2.30, .012, .30, .012, col.charcoal, { gloss: .3 });
    cyl(4.6, 2.28, -2.30, .17, .38, col.trunkL, { gloss: G.wood });
    for (let i = 0; i < 8; i++)
      capsule(4.6 + Math.sin(i * .785) * .165, 2.28, -2.30 + Math.cos(i * .785) * .165,
        .010, .38, .010, col.trunk, { gloss: G.wood });
    cyl(4.6, 2.47, -2.30, .18, .05, col.trunk, { gloss: G.wood });
    ball(4.62, 2.20, -2.30, .045, .05, .06, C('#c8b45e'), { gloss: .2 });
    for (let i = 0; i < 14; i++) {
      const a = i * 2.399;
      ball(16.4 + Math.sin(a) * (1.4 + (i % 3) * .5), 3.4 + (i % 4) * .55,
        SZ - .55 + Math.cos(a) * (1.2 + (i % 3) * .4),
        .055, .075, .055, C('#b8562f'), { gloss: .30 });
    }

    // ---- the paving itself. Eight metres of it read straight down the middle of every view
    // along the alley, and a clean slab is the one surface that never looks lived on: patched
    // repairs, a couple of settled slabs, chalk, and the bits nobody sweeps up.
    // Patches are relaid slabs, not tarmac: at asphalt tone and asphalt grain they read as
    // dark mats dropped on the pavement.
    for (const [ax, az, aw, ad] of [[-5.6, .9, 2.6, 1.7], [8.4, -.7, 3.2, 2.0],
                                    [-19.2, 1.2, 2.2, 1.5], [15.6, .6, 2.8, 1.8],
                                    [1.8, -.9, 2.0, 1.4]]) {
      // Relaid slabs, and they are relaid: the same paving material at a slightly different
      // repeat, which is exactly what a patch of newer slabs next to older ones looks like.
      flat(ax, .008, az, aw, ad, col.paveD, { mode: 9, gloss: .15, ...PAVE });
      flat(ax, .012, az, aw - .30, ad - .24, C('#867f70'),
        { mode: 9, gloss: .17, mat: 'paving', matScale: 1.05, matAmt: .28 });
    }
    for (const [cx2, cz2] of [[-6.4, -.5], [3.4, 1.4], [-13.0, 1.0], [11.2, 1.3]])
      for (let i = 0; i < 3; i++)
        flat(cx2 + (i - 1) * .42 + (i % 2) * .1, .0095, cz2 + (i % 2) * .38,
          .40, .40, C('#a8a293'), { gloss: .08 });
    // a sheet of newspaper, a dropped cabbage leaf, two flattened cardboard boxes
    flat(-2.2, .010, 1.75, .42, .30, C('#c6c0ae'), { gloss: .06, ry: .5 });
    flat(19.1, .010, 1.10, .34, .26, C('#b6c48e'), { gloss: .12, ry: 1.1 });
    for (const [fx, fz, fr] of [[-16.4, -1.05, .3], [12.6, 2.55, -.7]])
      flat(fx, .011, fz, .78, .58, col.canvas, { gloss: .10, ry: fr });

    // ---- 公厕 the public toilet sign, because the hutong has no plumbing and everyone knows
    // where it is. A pole, a blue plate, and an arrow down the alley.
    //
    // Both halves of this were wrong. The plate faced -z — into the wall it is bolted half a metre
    // in front of — so from the alley you saw the blank back of it and the writing was sandwiched
    // against the brickwork. And the arrow pointed east down the alley at nothing at all, because
    // there was no toilet anywhere in the district. The plate turns round to face the walk, the
    // arrow turns west, and what it points at is built immediately below.
    // Left untagged on purpose. It is a direction sign and not the toilet: tagged, pointing at it
    // would raise the label for a thing whose focus is eight metres away round a corner, and the
    // pick code would correctly report that thing as out of reach — which is a strange answer to
    // give about a plate the player is standing directly under.
    capsule(-19.4, 1.30, -2.32, .035, 2.60, .035, col.steelD, { gloss: .34 });
    box(-19.4, 2.34, -2.32, .78, .40, .05, col.blueSign,
      { hard:true, gloss:.34, round:.055 });
    for (const s of [-1, 1])
      capsule(-19.4 + s * .37, 2.34, -2.31, .018, .34, .018, col.steel,
        { gloss:G.metal });
    B.glyphs(-19.4, 2.34, -2.28, 0, '公厕',
      { size: .28, gap: .08, color: col.white, mode: 1, lift: .008 });
    box(-19.4, 2.02, -2.32, .78, .26, .05, col.white, { hard: true, gloss: .30 });
    // the arrow: a shaft and two barbs, which reads at a distance where a triangle does not
    box(-19.34, 2.02, -2.285, .46, .07, .02, col.blueSign, { hard: true });
    for (const t of [-1, 1])
      box(-19.58, 2.02 + t * .05, -2.285, .16, .07, .02, col.blueSign,
        { hard: true, rz: -t * .72 });
    // The 公厕 itself: a low grey-brick facility with a tiled pitch, tucked against the boundary wall
    // on the far side of the dead-end square. That is where these are — never on the alley itself,
    // always round a corner in whatever widening the lane happens to have — and the square was the
    // only piece of ground in the district with room for one. It carries the verb that is already
    // in the game for the Bund's toilets, so the hutong finally has somewhere to go that is not
    // your own flat.
    const PTX = -27.20, PTZ = 6.15, PT = { tag: '公共厕所' };
    // A real shell around two rooms: rear wall in three construction bays, two returned gables,
    // front corner piers and a plumbing spine. The old 23.2 m³ tagged monolith is gone; the door
    // openings are now actual voids with a back wall to look into.
    for (let i = 0; i < 3; i++)
      box(PTX - 1.30 + i * 1.30, 1.45, PTZ + .86, 1.22, 2.90, .28,
        tint(col.brick, .91 + i * .045, i === 1 ? .006 : -.004),
        { hard:true, mode:11, gloss:G.matte, ...BRICK, ...PT });
    for (const s of [-1, 1]) {
      box(PTX + s * 1.86, 1.45, PTZ, .28, 2.90, 1.72, col.brickD,
        { hard:true, mode:11, gloss:G.matte, ...BRICK, ...PT });
      box(PTX + s * 1.72, 1.45, PTZ - .91, .56, 2.90, .26, col.brick,
        { hard:true, mode:11, gloss:G.matte, ...BRICK, ...PT });
    }
    box(PTX, 1.45, PTZ + .04, .28, 2.90, 1.58, col.brickD,
      { hard:true, mode:11, gloss:G.matte, ...BRICK, ...PT });
    // The lower splash course is also bayed; no decorative strip bridges both doorways.
    for (const x of [PTX - 1.70, PTX, PTX + 1.70])
      box(x, .34, PTZ + .87, x === PTX ? 1.18 : .98, .68, .08, col.brickD,
        { hard:true, mode:11, gloss:G.matte, ...BRICK, ...PT });
    tileRoof(PTX, PTZ, 4.30, 2.30, 2.90, .55);
    for (const x of [PTX - 1.38, PTX + 1.34]) {
      cyl(x, 3.48, PTZ + .18, .075, .74, col.steelD, { gloss:.30, ...PT });
      taper(x, 3.86, PTZ + .18, .24, .16, .18, col.steel,
        { rx:Math.PI, gloss:G.metal, ...PT });
    }
    for (const [ox, ch, pc] of [[-1.00, '男', C('#7fb8e0')], [1.00, '女', C('#e08fa8')]]) {
      // The doorway is a jamb-jamb-lintel frame standing proud of the wall face at PTZ - 1.00, with
      // the dark of the room set just inside the face. Built the intuitive way — one brick surround
      // with a dark box behind it — neither would ever be seen: the surround is opaque and covers
      // the whole opening, and the mass behind it is opaque too, so there is nothing for a reveal to
      // sit in. The stairwell across the district has the same shape for the same reason.
      for (const t of [-1, 1])
        box(PTX + ox + t * .57, 1.12, PTZ - 1.07, .26, 2.24, .16, col.brickL,
          { hard: true, mode: 11, gloss: G.matte, ...BRICK, ...PT });
      box(PTX + ox, 2.28, PTZ - 1.07, 1.40, .20, .16, col.brickL,
        { hard: true, mode: 11, gloss: G.matte, ...BRICK, ...PT });
      // With the monolithic body removed, the doorway can carry real depth. Pale tiled returns
      // lead to a privacy screen 1.56 m inside; a black panel on the facade was just another slab.
      for (const t of [-1, 1])
        box(PTX + ox + t * .46, 1.03, PTZ - .18, .08, 2.02, 1.58, col.cream,
          { hard:true, mode:14, gloss:.14, ...RENDER, ...PT });
      flat(PTX + ox, .018, PTZ - .18, .78, 1.58, col.stoneD,
        { gloss:.18, ...PT });
      box(PTX + ox, 1.02, PTZ + .60, .88, 2.00, .12, C('#353a3c'),
        { hard:true, gloss:.12, ...PT });
      for (let k = 0; k < 4; k++)
        box(PTX + ox - .30 + k * .20, 1.15, PTZ + .525, .035, 1.42, .02, col.stone,
          { hard:true, gloss:.16, ...PT });
      // A concrete threshold you step over, and two floor strips leading into the tiled return.
      // The strips narrow toward the privacy screen, reinforcing the real 1.56 m room depth without
      // putting another opaque facade slab across either opening.
      box(PTX + ox, .045, PTZ - 1.13, .96, .09, .10, col.stoneD,
        { hard: true, gloss: .20, ...PT });
      box(PTX + ox, .095, PTZ - 1.055, .78, .010, .045, col.kerb,
        { hard: true, gloss: .16, ...PT });
      box(PTX + ox, .100, PTZ - 1.025, .60, .010, .035, col.stoneD,
        { hard: true, gloss: .16, ...PT });
      // One leaf standing open against the brickwork, hinged on the outer side of each door so the
      // two swing away from each other and the pictograms above stay clear.
      const hs = ox < 0 ? -1 : 1;
      box(PTX + ox + hs * .60, .98, PTZ - 1.30, .46, 1.94, .06, C('#4a6f5a'),
        { hard: true, gloss: .26, ry: -hs * 1.02, ...PT });
      capsule(PTX + ox + hs * .44, .98, PTZ - 1.44, .022, .18, .022, col.steelD,
        { ry: -hs * 1.02, gloss: G.metal, ...PT });
      box(PTX + ox, 2.44, PTZ - 1.10, .42, .42, .05, col.white,
        { hard: true, gloss: .30, ...PT });
      B.glyphs(PTX + ox, 2.44, PTZ - 1.14, Math.PI, ch,
        { size: .28, gap: 0, color: pc, mode: 1, lift: .008, ...PT });
    }
    // The sign over the middle, lit like the rest of the district's signage.
    box(PTX, 2.44, PTZ - 1.06, 1.50, .44, .10, col.blueSign,
      { hard: true, gloss: .28, ...PT });
    for (const g of B.glyphs(PTX, 2.44, PTZ - 1.13, Math.PI, '公共厕所',
        { size: .28, gap: .06, color: col.white, mode: 1, lift: .008, ...PT }))
      litten(g, .9);
    // A bare bulb under the eaves at the east end. Hung over the middle it was inside the eaves
    // board, which overhangs to z 4.83 at 2.77 m — the roof helper's front course is lower than it
    // looks from the numbers, and anything at head height on the centre line disappears into it.
    litten(ball(PTX + 1.85, 2.62, PTZ - 1.20, .070, .080, .070, C('#ffe3a6'),
      { mode: 1, glow: .06, ...PT }), .9);
    lampPools.push(glow(M.trs(PTX, .03, PTZ - 1.9, 0, 5.0, 1, 3.6), C('#ffcf96'), 0));
    // The standpipe and the gully at the west end, which is where the whole lane washes its mop
    // out. A 公厕 with no tap on the outside wall is a 公厕 nobody has ever cleaned. All of this
    // furniture is kept clear of the two door openings at PTX ± 1.00, which each want 44 cm either
    // side of them: the bin started life in front of the 女 door.
    capsule(PTX - 1.94, .58, PTZ - 1.14, .026, 1.16, .026, col.steelD, { gloss: G.metal, ...PT });
    box(PTX - 1.94, 1.06, PTZ - 1.20, .10, .12, .14, col.steelD, { hard: true, gloss: .42, ...PT });
    capsule(PTX - 1.94, .96, PTZ - 1.28, .014, .14, .014, col.steelD,
      { rx: -1.2, gloss: G.metal, ...PT });
    flat(PTX - 1.94, .010, PTZ - 1.42, .60, .44, col.paveD, { mode: 9, gloss: .30, ...PAVE });
    for (let k = 0; k < 4; k++)
      box(PTX - 1.94, .016, PTZ - 1.55 + k * .085, .44, .012, .035, col.black, { hard: true });
    capsule(PTX - 1.72, .70, PTZ - 1.16, .020, 1.36, .020, col.trunkL, { rz: .16, gloss: G.wood });
    capsule(PTX - 1.84, .06, PTZ - 1.16, .085, .16, .085, C('#8d8a83'), { gloss: .14 });
    cyl(PTX - 1.55, .14, PTZ - 1.30, .135, .28, C('#c8382a'), { gloss: .32 });
    // Cleaning bin with a tapered body, hinged lid, pedal and wheels—not another waist-high box.
    taper(PTX + 1.78, .43, PTZ - 1.26, .52, .82, .44, col.tarp,
      { gloss:.28, ...PT });
    box(PTX + 1.78, .88, PTZ - 1.24, .52, .07, .48, col.charcoal,
      { hard:true, gloss:.30, rz:-.06, round:.035, ...PT });
    capsule(PTX + 1.78, .94, PTZ - 1.06, .018, .30, .018, col.steelD,
      { rz:Math.PI / 2, gloss:G.metal, ...PT });
    box(PTX + 1.78, .08, PTZ - 1.51, .20, .05, .16, col.steelD,
      { hard:true, gloss:G.metal, rz:.08, ...PT });
    for (const s of [-1, 1])
      ball(PTX + 1.78 + s * .19, .055, PTZ - 1.15, .055, .055, .045, col.black,
        { gloss:.22, ...PT });
    solid(PTX - 2.10, PTX + 2.10, PTZ - 1.18, PTZ + 1.10);
    blocker(PTX - 2.10, PTX + 2.10, PTZ - 1.18, PTZ + 1.10, 3.60);
    shade(PTX, PTZ - .3, 4.8, 3.0, .30);
    thing('公共厕所', PTX, 1.90, PTZ - 1.20, '胡同里没有厕所，大家都上公共厕所。',
      'The hutong has no toilets — everyone uses the public one.',
      '公共 public + 厕所 toilet. The 公厕 sign at the alley mouth points the way.',
      { focus: [PTX + .40, PTZ - 2.00], reach: 2.4 });

    // ---- and the CBD, standing off in the haze
    //
    // Cladding, five ways. All 34 of these were the same single grey, shell and crown alike, which
    // made the CBD one material extruded 34 times — the one thing a real skyline never is. Each
    // tower now takes a shell and the spandrel that goes with it: blue glass, white stone, the old
    // warm grey, bronze, and a pale green-grey.
    //
    // Picked by index rather than from the random stream. This is the last loop in the build that
    // draws from `rnd()`, but a call inserted here would still shift the height, width and bearing
    // of every tower after it, and the skyline is a shot with a baseline against it.
    //
    // The glass is deliberately left alone. Pane colour is recomputed from the sky in setNight on
    // every frame, so whatever base colour is handed in here is overwritten before it is ever drawn;
    // the only variation glass can carry is the per-pane jitter setNight already hashes off position.
    const CLAD = [[C('#6f7f8c'), C('#8a99a4')], [C('#a8a49a'), C('#c4c0b4')],
                  [col.renderD, col.render], [C('#7c7568'), C('#968e80')],
                  [C('#8d968f'), C('#a9b1a9')]];
    const towers = [];
    for (let i = 0; i < 34; i++) {
      const a = -.85 + i * .052 + rnd() * .03;
      const dist = 120 + rnd() * 260;
      const tx = Math.sin(a) * dist * .9 + 60, tz = Math.cos(a) * dist * .55 + 40;
      const th = 44 + rnd() * rnd() * 130, tw = 14 + rnd() * 20;
      const [shell, band] = CLAD[(i * 7) % CLAD.length];
      towers.push([tx, tz, tw, th]);
      // Three joined setbacks, not one extrusion. Their offsets and proportions are keyed to the
      // index, so the random stream (and therefore every established skyline anchor) is unchanged.
      // At street distance this reads as podium / shoulder / crown while still costing only two
      // more masses than the former featureless tower box.
      const bh = Math.min(15, th * .18), mh = th * (.48 + (i % 3) * .035), uh = th - bh - mh;
      const ox = ((i % 3) - 1) * tw * .065, oz = (i % 2 ? 1 : -1) * tw * .045;
      const mw = tw * (.92 - (i % 4) * .035), md = tw * (.72 + (i % 3) * .035);
      const ux = tx + ox * 1.55, uz = tz + oz * 1.65;
      const uw = mw * (.72 + (i % 2) * .08), ud = md * (.72 + ((i + 1) % 3) * .05);
      // Tower 12 lands directly behind the northbound carriageway. Even with three setbacks its
      // 20.8 m-wide shoulder still projected as one blank wall at player height. Keep the seeded
      // parcel, height and all later random draws, but open that shoulder into two genuinely
      // separate wings: the taller one holds the west edge while a shorter wing sits farther back
      // to the east. Their 11 m sky notch continues the road aperture instead of capping it.
      const roadEndSplit = i === 12;
      const roadEndProfiles = roadEndSplit ? [
        { x:tx-tw*.30, z:tz,        w:tw*.50, d:tw*.76, y0:0,     y1:bh,
          c:tint(shell,.94,-.006), side: 1 },
        { x:tx+tw*.68, z:tz+tw*.18,w:tw*.42, d:tw*.60, y0:0,     y1:bh,
          c:tint(shell,.88, .004), side:-1 },
        { x:tx+ox-tw*.21, z:tz+oz, w:mw*.52, d:md*.83, y0:bh,    y1:bh+mh,
          c:shell,                  side: 1 },
        { x:tx+tw*.69, z:tz+tw*.22,w:mw*.38, d:md*.67, y0:bh,    y1:bh+mh*.70,
          c:tint(shell,.90,-.006), side:-1 },
        { x:ux-tw*.21, z:uz-.45,   w:uw*.62, d:ud*.78, y0:bh+mh,y1:th,
          c:tint(shell,1.04,.006), side: 1 },
        { x:tx+tw*.715,z:tz+tw*.245,w:uw*.44,d:ud*.58,y0:bh+mh*.70,
          y1:bh+mh*.70+uh*.58, c:tint(shell,.98,.003), side:-1 },
      ] : null;
      if (roadEndSplit) {
        for (const p of roadEndProfiles) {
          box(p.x, (p.y0 + p.y1) / 2, p.z, p.w, p.y1 - p.y0, p.d, p.c,
            { hard:true, mode:14, gloss:.22 });
          // A thin roof edge makes each setback legible through haze without bridging the notch.
          box(p.x, p.y1 + .10, p.z, p.w + .20, .20, p.d + .18, band,
            { hard:true, gloss:.25 });
        }
      } else {
        box(tx, bh / 2, tz, tw * 1.10, bh, tw * .88, tint(shell,.94,-.006),
          { hard:true, mode:14, gloss:.20 });
        box(tx + ox, bh + mh / 2, tz + oz, mw, mh, md, shell,
          { hard:true, mode:14, gloss:.22 });
        box(ux, bh + mh + uh / 2, uz, uw, uh, ud, tint(shell,1.04,.006),
          { hard:true, mode:14, gloss:.24 });
      }
      const hasCrown = rnd() > .5;
      if (hasCrown) {
        const crownProfiles = roadEndSplit
          ? [roadEndProfiles[4], roadEndProfiles[5]]
          : [{x:ux,z:uz,w:uw,d:ud,y1:th,c:shell}];
        for (const p of crownProfiles) {
          box(p.x, p.y1 + 1.25, p.z, p.w * .72, 2.50, p.d * .70, band,
            { hard:true, gloss:.26 });
          for(const sx of [-1,1])
            box(p.x + sx * p.w * .30, p.y1 + 3.20, p.z, .22, 3.90, p.d * .52, p.c,
              { hard:true, gloss:.24 });
        }
      }
      // A profile query keeps ribbons attached to the setback they belong to. The old grid drew
      // only the south face and left every side a blank slab; alternate rows now return around the
      // west face, while using exactly the same one rnd() call per authored floor as before.
      const profilesAt = roadEndSplit
        ? y => roadEndProfiles.filter(p => y > p.y0 && y < p.y1)
        : y => [y < bh ? {x:tx,z:tz,w:tw*1.10,d:tw*.88,side:-1}
          : y < bh + mh ? {x:tx+ox,z:tz+oz,w:mw,d:md,side:-1}
          : {x:ux,z:uz,w:uw,d:ud,side:-1}];
      const rows = Math.min(26, Math.floor(th / 4.4));
      for (let r = 1; r < rows; r++) {
        const y=r*(th/rows)+1.35,warm=rnd()>.45?.9:0;
        for (const p of profilesAt(y)) {
          pane(box(p.x,y,p.z-p.d/2-.08,p.w*(roadEndSplit?.68:.76),2.05,.18,col.glassDay,
            {hard:true,mode:1}),warm,true);
          if((r+i)%2===0)
            pane(box(p.x+p.side*(p.w/2+.08),y,p.z,.18,2.05,p.d*.64,col.glassDay,
              {hard:true,mode:1}),warm*.82,true);
          // A narrow expressed floor edge every second row gives scale without restoring the old
          // 1.5 m opaque band; on the split parcel it stops at each wing's inner return.
          if(r%2===0)
            box(p.x,y+1.18,p.z-p.d/2-.07,p.w*(roadEndSplit?.76:.80),.18,.16,band,
              {hard:true,gloss:.24});
        }
      }
    }
    // one tapered landmark, so the skyline has a shape you recognise
    const zx = 96, zz = 78;
    for (let i = 0; i < 7; i++) {
      const f = i / 7, w = 30 - f * 11 + f * f * 7;
      box(zx, 14 + i * 28, zz, w, 28, w * .9, col.blue,
        { hard: true, mode: 14, gloss: .3 });
      // Two room bands return around both elevations visible from the playable south-west. Their
      // changing width follows the taper instead of pasting one window grid across seven tiers.
      for (const wy of [7 + i * 28, 21 + i * 28]) {
        box(zx, wy, zz - w * .45 - .05, w * .72, 2.38, .10, col.glassDark,
          { hard:true, gloss:.22 });
        pane(box(zx, wy, zz - w * .45 - .105, w * .68, 2.08, .025, col.glassDay,
          { hard:true, mode:1, gloss:G.glass }), (i + (wy > 14 + i * 28 ? 1 : 0)) % 3 ? .18 : 0, true);
        box(zx - w * .50 - .05, wy, zz, .10, 2.38, w * .62, col.glassDark,
          { hard:true, gloss:.22 });
        pane(box(zx - w * .50 - .105, wy, zz, .025, 2.08, w * .58, col.glassDay,
          { hard:true, mode:1, gloss:G.glass }), (i + (wy > 14 + i * 28 ? 2 : 0)) % 4 ? .16 : 0, true);
      }
    }
    // The name, up in the crown. This is the one building on the skyline the eye goes to and it was
    // anonymous, which for a district whose whole subject is reading what is written on it is a
    // strange omission — the towers on the horizon are the largest characters available.
    //
    // On both visible faces. The player is roughly south-west of it, so the -x and -z elevations are
    // each about 44 degrees off, and a run on one face only was legible from half the district. No
    // backing panel: the characters are mounted straight onto the shell, which is how these are done
    // and which also stops a corner-mounted slab from floating clear of the building.
    // The word spans tiers 5 and 6. Their shared crown width is 25.714 m; using the base's former
    // 13.4/12.2 offsets left the glyph planes 0.89/0.98 m out in empty air once the tower tapered.
    // Start each run `lift - 2 cm` inside the actual crown face, so glyphs()'s outward lift puts
    // the ink exactly 2 cm proud of masonry on both elevations.
    const crownF = 5 / 7, crownW = 30 - crownF * 11 + crownF * crownF * 7;
    const crownSignInset = .35 - .02;
    for (const [gx, gz, gy] of [
      [zx, zz - crownW * .45 + crownSignInset, Math.PI],
      [zx - crownW * .50 + crownSignInset, zz, -Math.PI / 2],
    ])
      for (const g of B.glyphs(gx, 172, gz, gy, '国贸中心',
          { size: 5.6, gap: 1.1, vertical: true, color: C('#e8eef2'),
            mode: 1, glow: .10, lift: .35 })) litten(g, .95);
    litten(box(zx, 200, zz, 6, 8, 6, C('#ff6a4a'),
      { hard: true, mode: 1, glow: .4, tag:'国贸中心' }), 1.0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      box(zx + sx * 3.09, 200, zz + sz * 3.09, .18, 7.70, .18, col.steelD,
        { hard:true, gloss:G.metal, tag:'国贸中心' });
    for (const s of [-1, 1]) {
      box(zx, 200, zz + s * 3.05, .22, 6.80, .10, col.steelD,
        { hard:true, gloss:G.metal, tag:'国贸中心' });
      box(zx + s * 3.05, 200, zz, .10, 6.80, .22, col.steelD,
        { hard:true, gloss:G.metal, tag:'国贸中心' });
    }
    box(zx, 204.08, zz, 6.42, .18, 6.42, col.steel,
      { hard:true, gloss:G.metal, tag:'国贸中心' });
  }

  build();

  // ---------------------------------------------------------------- day / night
  // Signs, lamps and lit windows come up as the daylight goes. Glass reflects the sky while
  // it is light and shows a room behind it once it is not.
  // ---------------------------------------------------------------- 动 what moves
  //
  // One tick for the whole street, called by the loop with the wall clock in seconds. Everything
  // here is cheap on purpose: three matrix rebuilds per bird, one per puff of steam, one per item
  // of washing, and all of it skipped when you are not standing in the street.
  //
  // The flock is the reason this exists. Pigeons in this city do not sit — they go up together,
  // turn over the courtyards for half a minute with the whistles on their tails, and come back to
  // the same board. So: perched most of the time, and every eighty seconds or so, up.
  const FLIGHT = 26, CYCLE = 92;

  // 早餐 trades 05:00–10:30 and then it is gone. `mins` is the game clock, which the loop hands to
  // every scene tick; this is the first thing on the street that has ever read it.
  const STALL_OPEN = 5.0, STALL_SHUT = 10.5;

  // ---------------------------------------------------------------- S, the district toolkit
  //
  // The street's mirror of the flat's `A`. Everything a district needs to build with, plus the
  // coordinate contract, so no district measures off a neighbour.
  //
  //   x  -27.0 .. 25.5   the alley           x 25.42 .. 37.42 the carriageway
  //   x  -32.2 .. -25.0  the west courtyard  x 41.0          far pavement edge
  //   z  -2.35 .. 3.35   the walkable band   northbound lanes are EAST of (RD0+RD1)/2
  //
  // Named `S`, not `SHOP` — `SHOP` is already the x of the 超市 shopfront, forty lines up. That
  // collision is exactly the kind of thing the district contract exists to stop happening again.
  const S = {
    // the builders, straight off the shell's own scene
    box, cyl, ball, taper, modelOr:B.modelOr, flat, glyphs, solid, blocker, glow, thing,
    // `shade` wrapped rather than passed straight through: build.js's pushes its quad and returns
    // nothing, so a district that wants a MOVING prop to carry a contact shadow has no handle on
    // it. By day the shadow map covers the traffic; at night `fakeShadows` turns on and a fleet
    // with no ground contact floats. Returning the pushed record costs nothing and fixes it.
    shade: (...a) => { const n = B.shadows.length; shade(...a);
                       return B.shadows.length > n ? B.shadows[B.shadows.length - 1] : null; },
    cap: capsule, light: B.light,
    get props() { return B.props; }, get things() { return B.things; },
    C, G, col,
    // the coordinate contract
    AX0, AX1, AZ, SZ, NB, DOOR, RD0, RD1, KW, KE, BW0, BW1, PL0, PL1,
    MS0, MS1, MN0, MN1, BE0, BE1, ROAD_C, SW1, SHOPX: SHOP,
    // The shopfront datum, so a district never picks a sign height by eye. See the block comment
    // where these are declared for the clear bands they come out of.
    FASCIA, FASCIAH, BLADE, BLADEH,
    get PHARMACY_OUT() { return PHARMACY_OUT; },
    // The road's own numbers, so traffic and cycles agree without measuring — and these are now
    // MEASURED off the paint rather than derived from the centre line, because the derived ones
    // were wrong and two districts built against them.
    //
    //   25.42–27.67  西侧非机动车道      27.67–29.47  protected median/platform
    //   29.47–32.67  南行 (travelling +z) 32.67–35.17  北行 (travelling -z)
    //   35.17–37.42  东侧非机动车道
    road: { z0: -13.5, z1: 13.5, mid: ROAD_C,
            north: 33.92, south: 31.07, bikeW: 26.545, bikeE: 36.295,
            // kept so anything written against the old names still runs, pointing at the real lanes
            get lanes() { return { bikeW: 26.545, south: 31.07,
              north: 33.92, bikeE: 36.295 }; } },
  };

  buildDistricts();

  // Every district that has registered itself, each in its own file.
  //
  // Called from HERE, below `S`, and not from the end of `build()` where it was — because `S` is a
  // `const` declared after `build()` is invoked, so calling this from inside `build` put every
  // district's argument in the temporal dead zone. Each builder threw
  // `Cannot access 'S' before initialization`, the try/catch below swallowed it, and the whole
  // registry was dead while `.bootcheck.js` reported the game clean: it listens to
  // `Log.entryAdded`, which a `console.error` does not raise. Nine agents were building into a
  // street that never called them.
  //
  // Props pushed from here still land before `B.finish()`, which is the only ordering that
  // actually matters.
  function buildDistricts() {
    for (const k in StreetFit) {
      const f = StreetFit[k];
      if (typeof f !== 'function') continue;
      try { f(S); } catch (e) { console.error('StreetFit ' + k + ': ' + (e && e.message)); }
    }
  }

  function tick(t, body, mins) {
    // ---- the districts that move. Two of them do — the traffic and the bicycles — and both are
    // their own file. Dispatched before the shell's own four so a district can read the clock the
    // shell is about to act on. A district whose tick throws is dropped for the rest of the run
    // rather than taking the street's own animation down with it.
    for (const k in StreetFit) {
      const f = StreetFit[k];
      if (!f || typeof f.tick !== 'function') continue;
      try { f.tick(t, body, mins); }
      catch (e) { console.error('StreetFit ' + k + '.tick: ' + (e && e.message)); f.tick = null; }
    }
    // ---- 早餐. On the pavement in the morning, wheeled away for the rest of the day. Written
    // once per change rather than per frame: this is 180-odd matrices and it moves twice a day.
    if (mins !== undefined) {
      const h = (mins / 60) % 24;
      const up = h >= STALL_OPEN && h < STALL_SHUT;
      if (up !== stallUp) {
        stallUp = up;
        for (const s of stall) s.p.m = up ? s.m0 : HIDDEN;
      }
    }

    // ---- 鸽子. `u` runs 0..1 across one launch-circle-land; outside the flight window they sit.
    const cyc = t % CYCLE;
    for (const b of birds) {
      const local = cyc - b.lag;
      const flying = local > 0 && local < FLIGHT;
      if (!flying) {
        // Back on the board, in the matrices they were built with. Only written on the frame the
        // flight ends, not every frame: a perched bird costs nothing.
        if (b.wasFlying) { b.parts.forEach((p, i) => moveDynamic(p, b.m0[i])); b.wasFlying = false; }
        continue;
      }
      b.wasFlying = true;
      const u = local / FLIGHT;
      // Up fast, round for the middle of it, down slower. `lift` is the height above the loft.
      const rise = u < .18 ? u / .18 : u > .78 ? (1 - u) / .22 : 1;
      const ease = rise * rise * (3 - 2 * rise);
      const ang = u * Math.PI * 2 * 1.6 + b.lag;
      const cx = b.x + Math.cos(ang) * b.r * ease;
      const cz = b.z + Math.sin(ang) * b.r * ease;
      const cy = b.y + ease * b.h + Math.sin(t * 5 + b.lag) * .06 * ease;
      // Banking into the turn, and facing the way it is going.
      const face = ang + Math.PI / 2;
      const bank = M.mul(M.rotY(face - b.ry), M.rotZ(-ease * .35));
      const pivot = M.mul(M.trans(cx, cy, cz), M.mul(bank, M.trans(-b.x, -b.y, -b.z)));
      b.parts.forEach((p, i) => moveDynamic(p, M.mul(pivot, b.m0[i])));
    }

    // ---- 蒸汽. Each puff climbs a metre over four seconds and fades out as it goes, then starts
    // again at the basket. Offset per puff so the column is continuous rather than pulsing.
    for (const s of steam) {
      // Nothing steams off a cart that has gone home. The drain covers keep going; the baskets
      // are part of the stall, and stopped with it.
      if (s.stall && stallUp === false) { s.p.m = HIDDEN; continue; }
      const u = ((t * .26) + s.phase) % 1;
      const y = s.y0 + u * 1.05;
      const grow = 1 + u * 1.5;
      s.p.m = M.trs(s.x + Math.sin(t * .8 + s.phase * 6) * .07 * u, y, s.z,
                    0, s.r * grow, .20 * grow, s.r * grow);
      s.p.alpha = s.a0 * (1 - u) * (1 - u) * 1.6;
    }

    // ---- 衣服. Swung from the rail, not translated: a shirt pegged to a line pivots about the
    // pegs. Amplitude follows the weather, so a still day hangs still and a gale moves the lot.
    const gust = .035 + windK * .16;
    for (const w of wash) {
      const a = Math.sin(t * (.9 + windK * .8) + w.phase) * gust
              + Math.sin(t * 2.3 + w.phase * 2) * gust * .3;
      // Each garment pivots on ITS OWN pegs. The line used to be rotated as one rigid body about
      // `M.trans(0, w.y, 0)` — the world origin — so every shirt was swung about a point up to
      // nineteen metres away and thrown |x|·sin(a) up and down with it. On the east line at
      // x 16.3..18.7 that is 0.6 m of heave on a still day and 3.2 m in a gale, in antiphase with
      // the west line at x -14.6, which is what read as the whole street bouncing. The rotation
      // itself was right; only the pivot was wrong, so the fix is the translation column and
      // nothing else. `M.mul` leaves z alone, a garment's own x IS its pivot x, and dy is how far
      // it hangs below the line.
      const R = M.rotZ(a), ca = Math.cos(a), sa = Math.sin(a);
      w.props.forEach((p, i) => {
        const m0 = w.m0[i], m = M.mul(R, m0), dy = m0[13] - w.y;
        m[12] = m0[12] - dy * sa;
        m[13] = w.y + dy * ca;
        moveDynamic(p, m);
      });
    }
  }

  // How hard it is blowing, 0..1, from the weather in game.js. The washing is the only thing out
  // here that shows it, which is why a windy day used to look exactly like a still one.
  function setWind(k) { windK = Math.max(0, Math.min(1, k || 0)); }

  // 406. Whether the light is on in flat 202, pushed in from js/game.js's per-room `lightsOn`
  // (item 403) once a frame beside setNight. Defaults on: a scene built before anybody has told
  // it otherwise should look like a lived-in flat, not an empty one.
  let homeLit = true;
  function setHomeLit(v) { homeLit = !!v; }

  function setNight(k, skyRefl) {
    const soft = k * k * (3 - 2 * k);
    for (const { p, k: kk } of litProps) p.glow = (p.glow0 === undefined
      ? (p.glow0 = p.glow || 0) : p.glow0) + soft * kk * .95;
    for (const g of lampPools) g.a = soft * .30;
    for (const { p, warm, deep, j, j2, y, mine } of panes) {
      // A neighbour's pane either has someone home or it does not, and that never changes on you.
      // Yours does: it is your own light switch, seen from the pavement.
      const on = mine ? homeLit : warm > .35;
      // Glass does not hand the sky back at full strength. Painted with the raw sky colour —
      // which is what this did — every window in the district came out a flat white rectangle
      // at midday, a facade of light boxes, and the only ones that read as glass were the
      // `deep` ones on the far towers that happened to be knocked back. So: knock all of them
      // back, cool them off, and mix toward the dark of the room behind, because most of what
      // you see in a window is not the sky at all.
      //
      // Height decides the mix. A pane six floors up is looking at open sky; one at street
      // level is looking at the wall opposite and the underside of a tree, which is dark.
      const lift = Math.min(1, Math.max(0, (y - 1.2) / 14));
      const k = (deep ? .50 : .40 + lift * .26) * (.86 + j * .28);
      const dk = deep ? .05 : .052 + j2 * .030;      // the room behind, never quite black
      const day = [skyRefl[0] * k + dk * .82, skyRefl[1] * k + dk * .90, skyRefl[2] * k + dk];
      p.color = day;
      if (soft > .02) {
        const w = on ? soft : soft * .10;
        // Not one bulb repeated up the whole block: some rooms burn tungsten-warm, some are
        // a cooler white, and the strength varies with how deep into the flat the light is.
        const warmth = .82 + j * .36;
        p.color = [
          day[0] * (1 - w) + (on ? Math.min(1, .90 * warmth + .08) : .13) * w,
          day[1] * (1 - w) + (on ? Math.min(1, .74 * warmth) : .15) * w,
          day[2] * (1 - w) + (on ? Math.min(1, .40 + j2 * .34) : .19) * w,
        ];
      }
      p.glow = on ? soft * (.20 + j2 * .16) : 0;
    }
  }

  return B.finish({
    setNight, setHomeLit, tick, setWind, homes,
    get PHARMACY_OUT() { return PHARMACY_OUT; },
    indoor: false, cutaway: false, near: .22, far: 900,
    // Measured 2026-08-08 against the other daylight outdoor scenes. At `expose: .50` the district
    // was the darkest place in the game: a pure-node luminance histogram of the audit frames put
    // 27-west at mean .266 with 88% of the frame under 40% and *nothing at all* above 70%, and
    // 24-stall at .280 — against park .328/.397 and campus .347/.398 on the same measure. A hutong
    // is grey by design and the palette above is deliberately so, but a grey district at midday
    // still needs a sunlit band at the top of its range; without one the props read as plastic
    // however well they are built. .50 was also the lowest expose of the five daylight outdoor
    // scenes (campus/park .52, shanghai .54, chengdu .56). Raised to the top of that family rather
    // than past it. This is one uniform (js/gl.js:2557) — no primitive, material or light is added,
    // so the change cannot cost a frame.
    fogNear: 18, fogD: .0078, expose: .56,
    // Where the body stands after stepping out of the stairwell. Every other building in the
    // district publishes this as a named constant the caller can arrive at — HOTEL_OUT
    // (js/hotel.js:8), OFFICE_OUT (js/office-core.js:11), PHARMACY_OUT above — and the one
    // building the player lives in had only an unnamed `spawn` and a bare `homeDoor` pair with
    // no yaw in it. `spawn` is HOME_OUT, not a copy of it, so the two can never drift.
    spawn: HOME_OUT,
    HOME_OUT,
    homeDoor: [DOOR, NB.z1 + .5],
    zones: [
      { id: 'alley', x0: AX0, x1: AX1, z0: -AZ, z1: SZ, light: [DOOR, 2.6, NB.z1 + .6] },
      { id: 'west',  x0: -32.2, x1: -25.0, z0: -3.1, z1: 6.4, light: [-29, 3.0, .6] },
      // The former `road` rectangle extended from x24.0 to x39.8, making both live motor lanes
      // legal public realm at every z.  In particular, a player could ignore a red signal and
      // cross at z=2.70, just north of the zebra.  Author the right-of-way as its real components:
      // the west footway, the controlled zebra, the protected island/platform and the short
      // shelter-to-platform crossing over the west cycle track. Bounds describe the actual
      // surfaces, not radius-padded wishful space: clampMove spends its .45 m envelope inside
      // each one. The motor lanes therefore exist visually and for traffic, but never become
      // public walkable area outside these two authored crossings.
      { id: 'road', x0: 23.42, x1: KW, z0: -13.5, z1: 13.5,
        light: [24.42, 6.2, 5.0] },
      { id: 'road-zebra', x0: 23.42, x1: 41.48, z0: -2.50, z1: 2.10,
        light: [ROAD_C, 5.2, -.20] },
      { id: 'road-platform', x0: PL0, x1: PL1, z0: -14.80, z1: 3.00,
        light: [(PL0 + PL1) / 2, 4.6, -8.5] },
      { id: 'road-bus-crossing', x0: 23.42, x1: PL1, z0: -11.20, z1: -7.90,
        light: [26.4, 4.2, -9.55] },
      // Hospital-side pavement only. It overlaps the road zone by 1.25 m at the south end. That
      // keeps a 35 cm shared centre band under the strict 0.45 m control-envelope audit; the old
      // one-metre overlap technically joined, but left a seam only ten centimetres wide.
      // Stopping at the west kerb preserves the controlled crossing: this is not a second road.
      // A narrow throat crosses the last 1.25 m of the base road room without making the new west
      // cycle lane public. Beyond the live road end, the hospital keeps a 2.22 m building-side
      // patient footway; the protected cycle track remains an independent transport surface.
      // Their r=.45 centre cores overlap the throat by 45 cm without exposing the cycle route.
      { id: 'hospital-throat', x0: 23.2, x1: KW, z0: 12.25, z1: 14.75,
        light: [24.3, 5.0, 13.4] },
      { id: 'hospital-road', x0: 23.2, x1: KW, z0: 13.40, z1: 42.8,
        light: [24.3, 5.0, 24.0] },
      // The fire-station apron mirrors the hospital spine on the south side. It overlaps the
      // road zone by 70 cm at z -13.5..-12.8, but stops west of the kerb: a connected public
      // frontage and never an uncontrolled route across the carriageway.
      ...(S.FIRE_ZONE ? [S.FIRE_ZONE] : []),
      // street-hotel.js extends the east pavement north of the hypermarket. Kept in that module's
      // coordinate contract so the arrival court and its walkable boundary cannot drift apart.
      ...(S.HOTEL_ZONE ? [S.HOTEL_ZONE] : []),
      // js/street-lane.js publishes a road-width throat and a wider internal room. Their overlap
      // creates the deliberate spatial release without widening the hole through the parade.
      ...(S.LANE_THROAT_ZONE ? [S.LANE_THROAT_ZONE] : []),
      ...(S.LANE_ZONE ? [S.LANE_ZONE] : []),
      // Continue only the EAST pavement along the complete generated parade. This makes every
      // distant shop focus reachable without extending the broad `road` room into an uncontrolled
      // crossing: after the 30 cm body inset its west edge is x=38.10, safely east of kerb x=37.50.
      // The east edge follows the real x=41.48 collision face; the collider itself supplies the
      // body setback instead of wasting 23 cm of otherwise continuous public pavement.
      { id:'far-east-pavement', x0:KE, x1:41.48, z0:-58.0, z1:71.0,
        light:[39.8, 5.0, 0] },
      // A 30 cm overlap with the alley is not enough once clampMove insets both zones by the body
      // radius. The covered night-market passage starts at z 2.10, giving a 1.25 m transition
      // overlap and retaining 35 cm at the strict 0.45 m audit envelope.
      // Its 2.80 m structural width leaves 2.20 m of real body-centre clearance and ends beyond
      // the last receding return.
      { id:'night-market-passage', x0:3.2, x1:6.0, z0:2.10, z1:10.20,
        light:[4.60, 3.0, 5.2] },
    ],
    roomAt(x, z, prev) {
      const zs = this.zones;
      // Check every authored extension before the broad road rectangle. Previously `x > 24.6`
      // swallowed the lane even though clampMove could enter it, so lighting/camera context never
      // followed the player past the gateway.
      for (const id of ['night-market-passage', 'road-zebra', 'road-platform',
        'road-bus-crossing', 'hospital-throat', 'fire-station-front', 'hotel-forecourt',
        'lane', 'lane-throat', 'far-east-pavement']) {
        const zone=zs.find(q=>q.id===id);
        if(zone&&x>=zone.x0&&x<=zone.x1&&z>=zone.z0&&z<=zone.z1) return zone;
      }
      if (z > 12.8 && x > 23.0 && x < RD0)
        return zs.find(q=>q.id==='hospital-road') || zs[0];
      if (x > 24.6) return zs.find(q=>q.id==='road') || zs[0];
      if (x < -26.2) return zs[1];
      return zs[0];
    },
  });
});
