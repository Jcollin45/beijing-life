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
          solid, blocker, shade, glow, thing } = B;

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
  const RD0 = 27.5, RD1 = 37.5;           // the road
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
  const HOME_OUT = { x: DOOR + .1, z: -1.35, yaw: Math.PI * .5 };

  // ---- the things that move. Collected as the street is built and driven by `tick`, which the
  // loop calls for whichever place you are standing in. Until this existed the hutong was a
  // photograph: the loft's pigeons never left the boards, the steamers never steamed, and the
  // washing hung dead still on a street whose own weather system has a wind in it.
  const birds = [], steam = [], wash = [], stall = [];
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
        box(cx, base - .19, cz + s * (half + .30), len + .30, .09, .13,
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
    // The street face of the gate mass. Everything you are meant to see — couplets, canopy,
    // lanterns, drum stones — belongs in front of this. Hung off `z + something` it all ended
    // up inside the courtyard, invisible from the only side you can stand on.
    const F = z - .36;
    // jambs and lintel in brick, framing a 1.6 m opening
    for (const s of [-1, 1])
      box(x + s * 1.05, 1.45, z, .50, 2.90, .70, col.brickL,
        { hard: true, mode: 11, gloss: G.matte, ...BRICK });
    box(x, 2.72, z, 2.60, .34, .70, col.brickL,
      { hard: true, mode: 11, ...BRICK });
    // raised stone threshold you have to step over
    box(x, .085, z, 1.90, .17, .90, col.stoneD, { hard: true, gloss: .22 });
    for (const s of [-1, 1]) {
      // 门墩 drum stone, sat on the street side of the threshold
      cyl(x + s * .74, .30, F + .06, .17, .38, col.stoneD, { gloss: .24 });
      box(x + s * .74, .085, F + .06, .44, .17, .44, col.stoneD, { hard: true, gloss: .22 });
    }
    // The doors sit back in the reveal, not on the face of the wall. Named homes stand open
    // far enough for their resident to pass through; the leaf furniture is placed in the same
    // hinged frame so the studs and handle follow the door instead of floating on the wall.
    for (const s of [-1, 1]) {
      const a = -s * (named ? .82 : .09), ca = Math.cos(a), sa = Math.sin(a);
      const hx = x + s * .80, hz = z - .02;
      const at = (lx, lz) => [hx + ca * lx + sa * lz, hz - sa * lx + ca * lz];
      const [dx, dz] = at(-s * .40, 0);
      box(dx, 1.18, dz, .78, 2.02, .075, doorCol,
        { hard: true, gloss: .26, ry: a, ...T });
      for (let r = 0; r < 4; r++) for (let c = -1; c <= 1; c++) {
        const [sx, sz] = at(-s * .40 + c * .22, -.045);
        ball(sx, .62 + r * .42, sz, .032, .032, .022,
          col.gold, { gloss: G.metal, ...T });
      }
      const [kx, kz] = at(-s * .68, -.06);
      capsule(kx, 1.02, kz, .055, .16, .055, col.gold,
        { rx: Math.PI / 2, ry: a, gloss: G.metal, ...T });
    }
    // 对联 couplets pasted flat on the street face of each jamb, and a banner over the lintel.
    // Lit paper, not emissive: as glowing panels they read as orange plastic signage.
    // Gold ink, not black. Near-black characters on the red paper read as holes punched
    // through the couplet, which from a couple of metres looked like damage.
    // The pair read as a pair: 上联 on the right as you face the gate, 下联 on the left, and the
    // 横批 across the lintel above them.
    const LIAN = ['春满乾坤福满门', '天增岁月人增寿'];
    for (const s of [-1, 1]) {
      box(x + s * 1.05, 1.42, F - .01, .22, 1.46, .012, col.red, { hard: true, gloss: .10 });
      B.glyphs(x + s * 1.05, 1.42, F - .012, Math.PI, LIAN[s > 0 ? 1 : 0],
        { size: .17, gap: .022, vertical: true, color: col.goldL, gloss: .18, lift: .008 });
    }
    box(x, 2.56, F - .01, 1.70, .26, .012, col.red, { hard: true, gloss: .10 });
    B.glyphs(x, 2.56, F - .012, Math.PI, '万象更新',
      { size: .20, gap: .12, color: col.goldL, gloss: .18, lift: .008 });
    // canopy: a small pitched roof carried on two brackets, overhanging the alley
    for (const s of [-1, 1])
      box(x + s * 1.00, 2.78, F - .22, .17, .19, .72, col.redD, { hard: true, gloss: G.wood });
    tileRoof(x, F - .30, 3.10, 1.70, 2.94, .44);
    // lanterns hung under the eaves, lit after dark
    for (const s of [-1, 1]) lantern(x + s * 1.30, 2.34, F - .48, s === 1 && tagIt);

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
    // Tyre, then a bright rim ring on each face, then the hub. Without the rim the wheel was
    // a solid black disc; a real spoked wheel is too many primitives to be worth it here.
    for (const fw of (o.front === false ? [-.52] : [-.52, .52])) {
      put('cyl', fw, .335, 0, .67, .050, .67, col.black, { rz: Math.PI / 2, gloss: .26 });
      for (const side of [-.028, .028]) {
        put('cyl', fw, .335, side, .58, .010, .58, col.steel, { rz: Math.PI / 2, gloss: G.metal });
        put('cyl', fw, .335, side * 1.4, .50, .010, .50, col.charcoal,
          { rz: Math.PI / 2, gloss: .22 });
      }
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
      birds.push({ parts: [body, head, tail], m0: [body.m, head.m, tail.m],
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
      // A stack of stackable crates, the perforated kind every shop in China gets its stock in.
      // Two columns, one of them a crate shorter, because a level stack reads as masonry.
      for (const [ox, h] of [[-.34, 4], [.34, 3]])
        for (let i = 0; i < h; i++) {
          const k = jit(x + ox, i * 3.7 + z);
          box(x + ox, .095 + i * .19, z + (k - .5) * .10, .62, .19, .44,
            CR[(i + (ox > 0 ? 2 : 0)) % 4], { hard: true, gloss: .28, ry: (k - .5) * .22 });
          box(x + ox, .185 + i * .19, z + (k - .5) * .10, .54, .015, .36,
            tint(CR[(i + (ox > 0 ? 2 : 0)) % 4], .78), { hard: true, gloss: .24,
              ry: (k - .5) * .22 });
        }
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
      box(x - .04, .17, z - n * .06, .86, .34, .52, C('#3b6f9c'),
        { hard: true, gloss: .22, ry: .09, round: .06 });
      box(x - .04, .35, z - n * .06, .80, .06, .46, C('#33608a'),
        { hard: true, gloss: .20, ry: .09 });
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
    put('box', -.06, .30, 0, .96, .16, .34, body, { gloss: .34 });          // floor pan
    put('box', -.40, .58, 0, .46, .58, .32, body, { gloss: .34 });          // body over the wheel
    put('box', -.36, .84, 0, .52, .12, .30, col.black, { gloss: .26 });     // saddle
    put('box', -.62, .96, 0, .34, .10, .28, col.black, { gloss: .26 });     // pillion pad
    put('taper', .40, .62, 0, .34, .62, .30, body, { rx: -.14, gloss: .34 });   // front shroud
    put('capsule', .40, .96, 0, .05, .48, .05, col.steelD, { gloss: .36 });
    put('capsule', .40, 1.02, 0, .035, .58, .035, col.charcoal,
      { rz: Math.PI / 2, gloss: .34 });                                      // bars
    for (const side of [-.30, .30]) {
      put('capsule', .40, 1.14, side, .018, .20, .018, col.steelD, { gloss: G.metal });
      put('box', .40, 1.24, side, .09, .06, .04, col.charcoal, { gloss: .40 });
    }
    put('box', .52, .74, 0, .22, .14, .10, col.frame, { gloss: .44 });       // headlight
    // The quilt: a padded apron over the bars with sleeves at the ends, in the loudest
    // pattern the market had. Flat and plain it read as a bin bag hung on the handlebars.
    // Sized to the bars and the rider's shins. At 0.74 m square it was a coloured cube with a
    // wheel poking out of the bottom, and the scooter under it could not be seen at all.
    if (quilt) {
      put('box', .30, .94, 0, .58, .40, .30, quilt, { mode: 7, gloss: G.fabric, round: .05 });
      put('box', .26, .66, 0, .48, .34, .26, quilt, { mode: 7, gloss: G.fabric, round: .05 });
      for (const side of [-.27, .27])
        put('box', .32, .99, side, .14, .22, .20, quilt, { mode: 7, gloss: G.fabric, round: .04 });
      for (let i = 0; i < 2; i++)
        put('box', .30, .84 + i * .18, 0, .60, .025, .32, col.cream,
          { mode: 7, gloss: G.fabric });
      put('box', .295, .94, 0, .22, .34, .32, col.cream, { mode: 7, gloss: G.fabric });
    }
    put('box', -.70, .74, 0, .34, .34, .40, col.charcoal, { gloss: .30 });   // top box
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
      const O = { mode: 7, gloss: G.fabric, round: .02, ry: tilt, tag };
      // Everything hangs from `y`, not from somewhere below it. Slung 30 cm under the pegs
      // the wash floated, and from underneath the pegs read as confetti stuck to the sky.
      if (i % 3 === 1) {                                    // trousers, waist up on the line
        box(x, y - .15, cz, .30, .24, .05, cl, O);
        for (const t of [-1, 1])
          box(x + t * .080, y - .52, cz, .135, .52, .05, cl, { ...O, rz: t * .03 });
      } else if (i % 3 === 2) {                             // a towel or a sheet, plain
        box(x, y - .38, cz, .42, .74, .05, cl, O);
      } else {                                              // shirt, sleeves hanging out
        box(x, y - .32, cz, .34, .50, .05, cl, O);
        for (const t of [-1, 1]) {
          box(x + t * .25, y - .24, cz, .19, .15, .05, cl, { ...O, rz: -t * .5 });
          box(x + t * .32, y - .44, cz, .13, .30, .05, cl, O);
        }
        box(x, y - .06, cz, .26, .05, .05, cl, O);          // shoulders on a hanger
        capsule(x, y + .01, cz, .012, .14, .012, col.steel, { rz: -.9, gloss: .34 });
      }
      for (const t of [-1, 1])                              // pegs, gripping the line itself
        box(x + t * .095, y + .015, cz, .032, .065, .04,
          [col.plastic, col.paintY, col.blue][(i + (t > 0 ? 1 : 0)) % 3],
          { hard: true, gloss: .34 });
    }
    // The whole line, with the height of the rail it swings from and a phase of its own, so two
    // lines on the same wall do not move as one sheet.
    wash.push({ props: B.props.slice(first), m0: B.props.slice(first).map(p => p.m),
                y, phase: wash.length * 1.7 });
  }

  // ---------------------------------------------------------------- the build
  // 地铁站 a subway entrance: a stair pit in the pavement with balustrades either side, a canopy
  // over the back of it, the line's roundel on the fascia and a totem by the kerb with the
  // station name running down it. The steps go down into shadow and that is all they need to do —
  // the station itself is a separate place.
  //
  // Every mouth on this street leads to the same room, so each one carries the name of the station
  // it comes out at. They share the word 地铁站 and therefore the verb, but not the tag: two things
  // with one tag and `pick` always hands back the first of them, so standing at the office
  // entrance would be told the hutong one was too far away.
  function metroMouth(cx, cz, station) {
    const tag = 'metro' + (++mouths);
    const T = { tag };
    // The pit. A dark floor with pale tread nosings lying on it, closer together as they run in:
    // there is no digging a hole in a ground plane, and perspective does the rest.
    flat(cx, .012, cz + .16, 2.12, 1.72, col.black, { gloss: .08, ...T });
    for (let i = 0; i < 6; i++)
      box(cx, .016, cz - .58 + i * .22 - i * i * .012, 1.86, .01, .055,
        i < 3 ? col.kerb : col.stoneD, { hard: true, ...T, gloss: .14 });
    // balustrades, the kerb round the opening, and a handrail running down each side
    for (const s of [-1, 1]) {
      box(cx + s * 1.16, .48, cz + .16, .16, .96, 1.84, col.stone,
        { hard: true, gloss: G.matte, ...T });
      box(cx + s * 1.16, .98, cz + .16, .22, .07, 1.90, col.kerb,
        { hard: true, gloss: .20, ...T });
      capsule(cx + s * .88, .70, cz + .06, .028, 1.70, .028, col.steelD,
        { rx: Math.PI / 2 - .34, gloss: G.metal, ...T });
    }
    box(cx, .05, cz - .78, 2.48, .10, .16, col.kerb, { hard: true, gloss: .20, ...T });
    // the canopy over the back of the flight, on two posts
    for (const s of [-1, 1])
      box(cx + s * 1.22, 1.30, cz + 1.10, .13, 2.60, .13, col.steelD,
        { hard: true, gloss: G.metal, ...T });
    box(cx, 2.62, cz + .52, 2.90, .12, 2.00, col.render, { hard: true, gloss: G.paint, ...T });
    box(cx, 2.72, cz + .52, 2.70, .10, 1.80, col.renderD, { hard: true, gloss: G.paint, ...T });
    // the fascia, the roundel and the words, all facing the way you walk up to it
    box(cx, 2.40, cz - .46, 2.90, .34, .10, col.blueSign, { hard: true, gloss: .26, ...T });
    // Everything written on this thing faces -z, which is the side you walk up to it from.
    // At yaw 0 all three of them faced the courtyard wall behind and the fascia was a blank
    // blue band with a white disc on it.
    for (const g of B.glyphs(cx + .34, 2.40, cz - .52, Math.PI, '地铁站',
        { size: .20, gap: .05, color: col.white, mode: 1, tag }))
      litten(g, .9);
    cyl(cx - .92, 2.40, cz - .53, .145, .03, col.white,
      { rz: Math.PI / 2, mode: 1, gloss: .20, ...T });
    for (const g of B.glyphs(cx - .92, 2.40, cz - .56, Math.PI, '地',
        { size: .17, gap: 0, color: col.blueSign, mode: 1, tag }))
      litten(g, .5);
    // the totem out by the kerb, with the station's own name down it
    box(cx - 1.90, 1.55, cz - .70, .16, 3.10, .16, col.steelD,
      { hard: true, gloss: G.metal, ...T });
    box(cx - 1.90, 2.60, cz - .74, .52, 1.60, .14, col.blueSign,
      { hard: true, gloss: .26, ...T });
    for (const g of B.glyphs(cx - 1.90, 2.58, cz - .82, Math.PI, station,
        { size: .17, gap: .05, vertical: true, color: col.white, mode: 1, tag }))
      litten(g, .9);
    // Sized to the stair pit, not a metre wider than it on one side.
    //
    // This was `cx - 2.05, cx + 1.30` — asymmetric, and nothing in the mouth is. The pit is the
    // `flat` above: 2.12 × 1.72 centred on (cx, cz + .16). At the 商务区 mouth (cx 38.70) the old
    // box ran x 36.65..40.00, so it started 0.85 m WEST OF THE KERB at RD1 = 37.5 — a metre of
    // carriageway blocked with no geometry in it — and then took all but the last metre of a 3.4 m
    // footway. Measured with clampMove at the 0.30 body radius, the far pavement had 0.00 m of
    // clear run from z -6 to -4 and again from z -14 to -9; two district agents reported the
    // footway severed and the mall's own label out of reach.
    //
    // Still tight: a 2.12 m stair in a 3.4 m footway leaves about 0.65 m of clear walking past it,
    // which is a squeeze rather than a wall. Widening the footway is the Road district's call.
    solid(cx - 1.16, cx + 1.16, cz - .80, cz + 1.12);
    shade(cx, cz + .2, 3.4, 2.4, .30);
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
    for (let z = -90; z < 90; z += 4.2)
      flat((RD0 + RD1) / 2 + 2.6, .008, z, .16, 2.3, col.paintW, { gloss: .10 });
    for (const o of [-.10, .10])
      flat((RD0 + RD1) / 2 + o, .008, 0, .12, 186, col.paintY, { gloss: .10 });
    for (let i = 0; i < 9; i++)
      flat(RD0 + .8 + i * 1.06, .009, -.2, .62, 4.6, col.paintW, { gloss: .10 });
    // painted bike lane hugging the near kerb
    flat(RD0 + 1.5, .006, 0, 2.4, 188, C('#6b5148'), { mode: 10, gloss: .18, ...ROAD });
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
      flat(RD0 + 3.0 + (i % 3) * 2.7, .0055, pz, 1.5 + (i % 3) * .7, 2.2 + (i % 2) * 1.4,
        PATCH, { mode: 10, gloss: .20, mat: 'concrete', matScale: 2.10, matAmt: .14 });
    }
    // Bollards along the kerb either side of the crossing, which is how a Chinese city stops
    // scooters riding up onto the footway.
    for (let i = 0; i < 12; i++) {
      const bz = (i < 6 ? -3.9 - i * 1.35 : 3.9 + (i - 6) * 1.35);
      cyl(RD0 - .52, .38, bz, .055, .76, col.steel, { gloss: .46 });
      cyl(RD0 - .52, .77, bz, .055, .05, C('#c8382a'), { gloss: .40 });
      capsule(RD0 - .52, .80, bz, .052, .05, .052, col.steel, { gloss: .48 });
    }
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
    // Painted render on a 1980s walk-up. Mode 14 already puts the broad patchiness and the damp
    // at the bottom of the wall on it; `plaster` supplies the fine tooth of the render itself,
    // which is what the mode's low-frequency noise has never had. A big scale on purpose — a
    // render coat has no repeat, and anything under a metre here turned the block into tiling.
    box(nbx, NBH / 2, nbz, nbw, NBH, nbd, col.render,
      { hard: true, mode: 14, gloss: G.paint, ...RENDER });
    // Brick plinth, a string course at first-floor level, and the parapet. The plinth is a
    // facing on the front wall, not a solid to the building's full depth — given `nbd` it
    // became a 28 by 15 metre brick slab lying over the alley at waist height.
    box(nbx, .70, NB.z1 + .04, nbw + .10, 1.40, .34, col.brick,
      { hard: true, mode: 11, gloss: G.matte, ...BRICK });
    box(nbx, FL - .10, NB.z1 + .06, nbw + .12, .22, .12, col.band, { hard: true, gloss: G.paint });
    box(nbx, NBH + .28, nbz, nbw + .22, .56, nbd + .18, col.renderD,
      { hard: true, gloss: G.paint });
    box(nbx, NBH + .60, nbz, nbw + .30, .10, nbd + .26, col.tileD,
      { hard: true, gloss: .2, ...RTILE });
    // The balconies stand a metre proud of the facade, so the camera has to stop clear of
    // them too or it ends up parked inside somebody's railing.
    blocker(NB.x0, NB.x1, NB.z0, NB.z1 + 1.15, NBH);
    solid(NB.x0 - .12, NB.x1 + .12, NB.z0, NB.z1 + .10);

    // window grid. Bays are on a 3.4 m pitch; the ground floor is shops and the stairwell,
    // so it gets its own treatment further down.
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
    for (const bx of bays) {
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
        if (isDoor) {           // stairwell: tall narrow slot windows, lit by the 声控灯 behind
          fwin(bx, y, NB.z1, 1.05, 1.35, { frame: false, warm: .92 });
          continue;
        }
        // roughly a third of the bays are the glazed-in balconies everyone builds
        if ((bx * 7 + f * 3) % 5 < 2) {
          box(bx, y - .78, NB.z1 + .52, 3.00, .10, 1.05, col.renderD,
            { hard: true, gloss: G.paint });
          if (lod === 0) {
            // An open railing: a kick plate at the bottom, a handrail on top, balusters
            // between. A solid infill panel read as a teal board bolted to the facade.
            box(bx, y - .68, NB.z1 + 1.02, 3.00, .26, .07, col.railD, { hard: true, gloss: .3 });
            box(bx, y + .18, NB.z1 + 1.02, 3.04, .07, .10, col.rail, { hard: true, gloss: .34 });
            for (let i = -6; i <= 6; i++)
              capsule(bx + i * .22, y - .28, NB.z1 + 1.03, .022, .90, .022, col.rail,
                { gloss: .34 });
            // The balcony strip light. One emissive ball per occupied balcony, lod 0 only: this
            // is the whole of the block's own night glow above the shopfronts, and until it
            // existed your building was the one dark thing on a street of lit ones.
            if (warm > .55)
              litten(ball(bx + .95, y + .60, NB.z1 + .60, .05, .05, .05, C('#ffeec4'),
                { mode: 1, glow: .04 }), .85);
          } else {
            // Above lod 0 the balusters collapse into the panel they read as from that distance.
            box(bx, y - .48, NB.z1 + 1.02, 3.00, .86, .07, col.railD, { hard: true, gloss: .3 });
            box(bx, y + .18, NB.z1 + 1.02, 3.04, .07, .10, col.rail, { hard: true, gloss: .34 });
          }
          fwin(bx - .78, y + .18, NB.z1, 1.28, 1.45, wo);
          fwin(bx + .78, y + .18, NB.z1, 1.28, 1.45, wo);
          if (lod === 0 && jit(bx, f * 5.3) > .45) for (let i = 0; i < 3; i++)  // laundry on rail
            box(bx - .6 + i * .6, y - .58, NB.z1 + 1.06, .44, .70, .05,
              [col.white, col.blue, col.plastic, col.cream][(jit(bx + i * 2.1, f) * 4) | 0],
              { mode: 7, gloss: G.fabric, ry: (jit(bx, f + i) - .5) * .1 });
        } else {
          fwin(bx, y, NB.z1, 2.05, 1.50, wo);
          if (lod === 0 && jit(bx * 1.7, f) > .35) acBox(bx + 1.35, y - 1.05, NB.z1);
        }
      }
      // roof clutter above each bay: water tanks, vents, a solar heater
      if (rnd() > .4) {
        cyl(bx + .4, NBH + 1.15, nbz + 4.5, .55, 1.10, col.steel, { gloss: .36 });
        box(bx + .4, NBH + .62, nbz + 4.5, 1.4, .10, 1.4, col.steelD, { hard: true, gloss: .3 });
      }
      if (rnd() > .5) {
        for (let i = 0; i < 7; i++)
          cyl(bx - .7 + i * .17, NBH + .95, nbz + 2.2, .07, 1.30, col.steel,
            { rx: -.55, gloss: .40 });
        cyl(bx, NBH + 1.45, nbz + 1.5, .30, 1.20, col.white, { rz: Math.PI / 2, gloss: .3 });
      }
      if (rnd() > .6) box(bx, NBH + 1.0, nbz + 6.4, .9, .9, .9, col.renderD,
        { hard: true, gloss: G.paint });
    }
    // downpipes, and the cable tray that feeds every flat
    for (const bx of [NB.x0 + .35, -4.2, 4.0, NB.x1 - .35])
      capsule(bx, NBH / 2, NB.z1 + .11, .085, NBH, .085, col.renderD, { gloss: .26 });
    for (let f = 1; f < FLOORS; f++)
      capsule(nbx, f * FL + .34, NB.z1 + .10, .035, nbw - .6, .035, col.black,
        { rz: Math.PI / 2, gloss: .3 });

    // ---- the stairwell entrance you come out of
    const ez = NB.z1;
    // A brick surround with a genuinely dark stairwell behind it, so the doorway reads as a
    // way in rather than a panel stuck on the wall.
    box(DOOR, 1.32, ez + .03, 3.00, 2.64, .26, col.brickL,
      { hard: true, mode: 11, gloss: G.matte, ...BRICK });
    box(DOOR, 1.20, ez - .34, 1.98, 2.32, .70, C('#191c20'), { hard: true, gloss: .12 });
    // The flight, in forced perspective. That dark box is 70 cm deep but it is *inside* the
    // block, which is one opaque volume, so only the last centimetre of it clears the facade —
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
    // concrete canopy on two brackets
    box(DOOR, 2.82, ez + .60, 3.50, .22, 1.32, col.renderD, { hard: true, gloss: G.paint });
    box(DOOR, 2.97, ez + .60, 3.64, .09, 1.44, col.tileD,
      { hard: true, mode: 13, gloss: .2, ...RTILE });
    for (const s of [-1, 1])
      box(DOOR + s * 1.52, 2.26, ez + .50, .18, .96, .98, col.renderD,
        { hard: true, rz: s * .20, gloss: G.paint });
    // Both leaves of the security door standing open, folded back against the reveal. Nearly
    // shut they swung out across the pavement and read as two loose black flaps.
    for (const s of [-1, 1]) {
      // Folded almost flat to the facade. At 66 degrees each leaf stood out into the
      // pavement as a black slab with nothing behind it.
      box(DOOR + s * 1.32, 1.16, ez + .22, .76, 2.16, .06, col.charcoal,
        { hard: true, gloss: .34, ry: -s * 1.46, tag: '楼' });
      for (let i = 0; i < 6; i++)
        capsule(DOOR + s * 1.32, 1.50 + i * .11, ez + .25, .016, .62, .016, col.steelD,
          { rz: Math.PI / 2, ry: -s * 1.46, gloss: G.metal, tag: '楼' });
    }
    // reveal frame, so the opening reads as a hole in a wall and not a painted rectangle
    for (const s of [-1, 1])
      box(DOOR + s * 1.03, 1.20, ez + .14, .12, 2.36, .22, col.charcoal,
        { hard: true, gloss: .28 });
    box(DOOR, 2.42, ez + .14, 2.18, .12, .22, col.charcoal, { hard: true, gloss: .28 });
    // unit plate, bare bulb, letterboxes and the notice board beside the door
    box(DOOR, 2.56, ez + .18, 1.10, .30, .05, col.blueSign, { hard: true, gloss: .3, tag: '楼' });
    for (let i = 0; i < 4; i++)
      box(DOOR - .38 + i * .25, 2.56, ez + .21, .16, .18, .02, col.white,
        { hard: true, mode: 1, tag: '楼' });
    litten(ball(DOOR, 2.62, ez + .52, .09, .11, .09, C('#ffeec4'),
      { mode: 1, glow: .3 }), 1.0);
    lampPools.push(glow(M.trs(DOOR, .03, ez + .9, 0, 4.6, 1, 4.0), C('#ffcf96'), 0));
    // The bulb over your own front door. This is the one light in the district the player stands
    // directly under every single night, and until now the brick around it was lit by nothing:
    // the pool on the paving was there, the bulb was there, and the doorway itself stayed the
    // same value at midnight as at noon.
    B.light(DOOR, 2.45, ez + .62, [1.0, .88, .70], .55, 4.6);
    // bank of letterboxes on one side of the door, notice board on the other
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
    box(DOOR + 2.32, 1.45, ez + .16, .95, 1.25, .12, col.redD, { hard: true, gloss: .28 });
    // The four slips on the notice board used to be blank rectangles of card, which on the one
    // surface in the district whose entire purpose is writing was a strange thing to leave. Real
    // hutong boards carry exactly this: the water going off, the rent falling due, somebody's
    // room to let, and the recycling scheme nobody follows.
    const SLIPS = [['通知', '停水'], ['通知', '房租'], ['招租', '一间'], ['垃圾分类', '谢谢']];
    for (let i = 0; i < 4; i++) {
      // One `rnd()` per slip, exactly as before — the value is kept now so the writing tilts with
      // the paper it is on instead of hanging square on a crooked notice.
      const jr = (rnd() - .5) * .06;
      const nx = DOOR + 2.32 - .2 + (i % 2) * .40, ny = 1.72 - ((i / 2) | 0) * .52;
      box(nx, ny, ez + .23, .34, .44, .02,
        [col.cream, col.white, col.paintY, col.cream][i],
        { hard: true, mode: 1, ry: jr, tag: '通知' });
      const ink = i === 2 ? col.redD : col.charcoal;
      B.glyphs(nx, ny + .145, ez + .245, jr, SLIPS[i][0],
        { size: .075, gap: .012, color: ink, gloss: .08, lift: .006, tag: '通知' });
      B.glyphs(nx, ny + .020, ez + .245, jr, SLIPS[i][1],
        { size: .062, gap: .010, color: col.charcoal, gloss: .08, lift: .006, tag: '通知' });
      // Two ruled lines of body copy nobody is meant to read, which is what the rest of a notice
      // always is. Glyphs at this size came out as grey mush and cost four quads a line.
      for (let k = 0; k < 2; k++)
        box(nx, ny - .105 - k * .055, ez + .243, .24, .012, .004, C('#8d8a83'),
          { hard: true, ry: jr, gloss: .06, tag: '通知' });
    }
    thing('通知', DOOR + 2.32, 2.22, ez + .30, '门口的通知说明天停水。',
      'The notice by the door says the water is off tomorrow.',
      '通知 is a notice or an announcement — the noun and the verb are the same word.',
      { focus: [DOOR + 2.32, ez + 1.45], reach: 2.0 });
    solid(DOOR - 2.9, DOOR + 2.9, ez - .1, ez + .42);
    // The way in. This used to sit at y 3.05 with a 2.6 m reach — three metres up the facade —
    // so going home meant pressing a wall above your own head. It stands at the door mouth now,
    // at the height of the handle, which is STREET.md problem 1 the other way round.
    thing('楼', DOOR, 1.55, ez + .34, '我住在这个楼里，二层。',
      'I live in this building, on the second floor.',
      '楼 is a building of more than one storey. Yours is 3号楼, and your flat is 202.',
      { focus: [DOOR, ez + 1.9], reach: 2.2 });
    // Your own balcony, from the outside. The bay at x 2.50 on the first storey above the shops
    // is deck 2 — `(bx * 7 + f * 3) % 5` makes it one of the glazed-in ones — and deck 2 is the
    // landing `js/home-corridor.js` builds and the flat you live in. Looking up at the washing on
    // your own rail from the alley is the cheapest proof the game can offer that the inside and
    // the outside of this building are the same building.
    thing('阳台', 2.50, 1.70, NB.z1 + 1.25, '二层那个阳台是我家的。',
      'That balcony on the second floor is mine.',
      '阳台 is a balcony. In Beijing it is glazed in and it is where the washing goes.',
      { focus: [2.50, NB.z1 + 2.6], reach: 2.6 });

    // ---- 超市 the corner shop, in the ground floor of the same block
    const SHOPDOOR = SHOP + 1.55;
    // The white fascia is thinner than it was and the dark lining now sits inside it rather than
    // on its face. That opens 18 cm between the lining and the glass. Before, the fascia was a
    // 26 cm slab with the glass stuck on the front of it and the lining stuck on the front of
    // that, so there was no cavity at all: three display windows with literally nothing behind
    // them, and from the alley the shop offered the player two blue rectangles and a door.
    box(SHOP, 1.55, ez + .00, 6.20, 3.10, .14, col.white, { hard: true, gloss: .30 });
    box(SHOP, 1.35, ez + .02, 5.40, 2.50, .10, col.charcoal, { hard: true, gloss: .30 });
    // Three display windows stop before the entrance; the old fourth pane made the whole
    // frontage one unbroken sheet of glass, so there was no visual answer to "where is the door?"
    for (const gx of [-1.9, -.65, .65])
      pane(box(SHOP + gx, 1.42, ez + .27, 1.14, 2.30, .04, col.glassDay,
        { hard: true, mode: 1, gloss: G.glass, tag: '超市' }), .96);
    for (const gx of [-2.55, -1.28, 0, .99])
      box(SHOP + gx, 1.35, ez + .29, .09, 2.42, .07, col.steel, { hard: true, gloss: G.metal });
    box(SHOP, 2.62, ez + .30, 5.5, .12, .07, col.steel, { hard: true, gloss: G.metal });
    // A9 · the transom. Every pane in the district was one sheet of glass between two mullions;
    // a real shopfront divides the head off as a fanlight and puts a bar up the middle of it. The
    // display run only — 4.00 m centred on SHOP - .70, which is the stallriser's own span, so the
    // bar stops clear of the door reveal at 8.42 instead of running through it the way the head
    // rail above does. Steel, 7 cm, and no new panes: the glass behind is the glass that was here.
    box(SHOP - .70, 2.16, ez + .30, 4.00, .07, .07, col.steel, { hard: true, gloss: G.metal });
    for (const gx of [-1.9, -.65, .65])
      box(SHOP + gx, 2.37, ez + .30, .06, .38, .07, col.steel, { hard: true, gloss: G.metal });
    // Stallriser, head and two end returns, closing the new cavity. Without them the glass stood
    // 18 cm off the wall with daylight round all four edges of it: from a low camera the paving ran
    // on under the shopfront into a void, and from either side you looked straight along the
    // recess. These four boxes are what every real shopfront has round its window for exactly the
    // same reason.
    box(SHOP - .70, .135, ez + .17, 4.00, .27, .22, col.charcoal,
      { hard: true, gloss: .28 });
    box(SHOP - .70, 2.66, ez + .17, 4.00, .20, .22, col.white, { hard: true, gloss: .28 });
    for (const ox of [-2.62, 1.22])
      box(SHOP + ox, 1.42, ez + .17, .16, 2.30, .22, col.white, { hard: true, gloss: .28 });
    // What is in the cavity: three tiers of shelving with stock on them. This window is the one
    // place in the district where the player can see what a 超市 sells without going in, so the
    // goods are the kinds of thing whose silhouette says what it is from two metres away —
    // cartons, cup noodles, bottles — and not tiny labelled packets that would be mush.
    const STOCK = [C('#c4452f'), C('#2f6f9c'), C('#d8a92f'), C('#3f7f5c'),
                   C('#b8622f'), C('#8a5a9c')];
    for (let w = 0; w < 3; w++) {
      const gx = SHOP + [-1.9, -.65, .65][w];
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
    signBoard(SHOP, FASCIA, ez + .10, 5.00, FASCIAH, col.red, col.goldL, '幸福超市');
    // The red-and-white striped awning over the door end. Geometry unchanged — it is now the
    // profile the other two alley frontages are built to, so `awning()` draws all three.
    awning(SHOP, 2.92, ez, 9, col.red, col.white);
    // A1 · the 卷帘门 housing. 2.86 .. 3.10, which lands its top flush with the white surround
    // and 2 cm under the fascia board's own bottom edge at FASCIA - FASCIAH/2 = 3.12. Its
    // underside clears the awning by 8 cm: the sheet tilts UP away from the wall (rx -.30 puts
    // the front edge high), so its rear corner at z ez+.13 is the low point at 2.68.
    shutterBox(SHOP, 2.98, ez + .00, 6.20, .24);

    // A dedicated double glass door. The red surround, gold handles and bright transom are
    // deliberately stronger than the window mullions, while the dark reveal makes the glass
    // read as depth instead of another blue rectangle pasted onto the facade.
    box(SHOPDOOR, 1.40, ez + .32, 1.46, 2.60, .18, col.charcoal,
      { hard: true, gloss: .30, tag: '超市' });
    box(SHOPDOOR, 2.51, ez + .43, 1.28, .28, .07, col.red,
      { hard: true, gloss: .28, tag: '超市' });
    for (const s of [-1, 1]) {
      pane(box(SHOPDOOR + s * .30, 1.35, ez + .43, .54, 1.98, .045, col.glassDay,
        { hard: true, mode: 1, gloss: G.glass, tag: '超市' }), .98);
      box(SHOPDOOR + s * .59, 1.35, ez + .47, .075, 2.05, .055, col.red,
        { hard: true, gloss: .28, tag: '超市' });
      capsule(SHOPDOOR + s * .14, 1.34, ez + .51, .026, .48, .026, col.goldL,
        { gloss: G.metal, tag: '超市' });
    }
    box(SHOPDOOR, 1.35, ez + .49, .075, 2.04, .055, col.red,
      { hard: true, gloss: .28, tag: '超市' });
    box(SHOPDOOR, 2.78, ez + .49, 1.20, .36, .07, col.redD,
      { hard: true, gloss: .28, tag: '超市' });
    B.glyphs(SHOPDOOR, 2.78, ez + .54, 0, '入口',
      { size: .25, gap: .12, color: col.goldL, mode: 1, glow: .14, lift: .008, tag: '超市' });
    litten(ball(SHOPDOOR + .82, 2.69, ez + .58, .065, .075, .055, C('#ffe4a8'),
      { mode: 1, glow: .20, tag: '超市' }), .9);
    // The bulb over the 超市 door. Its own emissive ball is 6 cm across and lights nothing;
    // this is what puts the crates, the water tray and whoever is buying from them into the
    // light the shop is actually spilling onto its own pavement.
    B.light(SHOPDOOR + .60, 2.50, ez + .95, [1.0, .86, .64], .48, 4.2);
    entryMat(SHOPDOOR, ez + 1.05, '超市');

    // crates of vegetables and a stack of water out front
    // Kept to the display-window side: the fifth crate used to sit squarely in front of the
    // implied entrance and taught the player, quite reasonably, that this was not the way in.
    for (let i = 0; i < 3; i++) {
      const cx = SHOP - 2.6 + i * 1.15, h = .30 + (i % 2) * .16;
      box(cx, h / 2, ez + .95, 1.00, h, .70, pick([col.plastic, col.blue, col.teal]),
        { hard: true, gloss: .30, tag: '超市' });
      for (let k = 0; k < 6; k++)
        ball(cx - .3 + (k % 3) * .3, h + .07, ez + .78 + ((k / 3) | 0) * .32,
          .13, .10, .13, pick([col.green, col.plastic, col.paintY, col.greenL]),
          { gloss: .26, tag: '超市' });
    }
    // The water. This was a single blue cube 1.1 m tall, which taught nothing and — since the
    // service door upstairs was added after it — stood squarely across the right-hand half of
    // that door, so the shop owner went home through a crate of mineral water. It is a tray of
    // bottles now, at the other end of the frontage where there is nothing behind it, because
    // eight bottles you can count is the whole point: 瓶 is a measure word and a measure word
    // needs something to measure.
    const WTX = SHOP - 2.35, WTZ = ez + .44;
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
    // The frontage stops at 3.10, which is where 超市's white surround stops, so the fascia band
    // above sits on one line across both. At 3.24 it stood 14 cm proud of its neighbour for no
    // reason anybody could name from the alley, and the board over it had to start higher to clear
    // it — which is where the two boards' 46 cm of disagreement came from in the first place.
    box(RST, 1.55, ez + .06, 5.00, 3.10, .26, col.render,
      { hard: true, mode: 14, gloss: .26, ...RENDER });
    // The tiled stallriser every small Chinese shopfront has. Small wall tile, so the repeat is
    // the tile: .30 m rather than the render's 2.6, which is the difference between a tiled
    // plinth and a smear of the same photograph the wall above it is wearing.
    box(RST, .40, ez + .19, 5.00, .80, .10, col.tileL,
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
      box(RST + mx, 1.675, ez + .28, .09, 2.03, .10, col.steel, { hard: true, gloss: G.metal });
    // A9 · the transom, on the same steel as the mullions and stopping on the outer two of them
    // (RST-2.22 .. RST+.52, so 2.83 m centred on RST-.85). 2.28 divides a 1.91 m sheet into a
    // 1.53 m light and a 35 cm fanlight, and the fanlight gets a bar up the middle of each bay.
    // No new panes: the glass is the glass that was already here, and this is joinery over it.
    box(RST - .85, 2.28, ez + .28, 2.83, .07, .10, col.steel, { hard: true, gloss: G.metal });
    for (const gx of [-1.55, -.15])
      box(RST + gx, 2.485, ez + .28, .06, .35, .10, col.steel, { hard: true, gloss: G.metal });
    // the doorway itself, at the +x end, standing open behind its strip curtain. A deep dark
    // reveal and red jambs separate it from the windows; the warm interior is set farther back
    // so the curtain now reads as something you can walk through instead of an opaque panel.
    const RSTDOOR = RST + 1.55;
    box(RSTDOOR, 1.44, ez + .22, 1.30, 2.42, .16, col.charcoal,
      { hard: true, gloss: .28, tag: '餐馆' });
    litten(box(RSTDOOR, 1.34, ez + .36, 1.04, 2.02, .04, C('#76543a'),
      { hard: true, mode: 1, glow: .04, tag: '餐馆' }), 1.5);
    for (const s of [-1, 1])
      box(RSTDOOR + s * .59, 1.42, ez + .43, .11, 2.36, .12, col.red,
        { hard: true, gloss: .24, tag: '餐馆' });
    for (let i = 0; i < 7; i++)
      box(RST + 1.13 + i * .14, 1.34, ez + .34, .13, 1.86, .02, col.frame,
        { hard: true, mode: 1, alpha: .30, gloss: .5, ry: (rnd() - .5) * .06, tag: '餐馆' });
    box(RSTDOOR, 2.72, ez + .46, 1.26, .38, .08, col.redD,
      { hard: true, gloss: .28, tag: '餐馆' });
    B.glyphs(RSTDOOR, 2.72, ez + .51, 0, '入口',
      { size: .25, gap: .12, color: col.goldL, mode: 1, glow: .14, lift: .008, tag: '餐馆' });
    // One open door leaf folded against the right jamb supplies a silhouette and a handle even
    // when the transparent curtain itself catches the sky and becomes hard to read.
    box(RSTDOOR + .70, 1.36, ez + .67, .48, 2.08, .07, col.redD,
      { hard: true, ry: -.72, gloss: .24, tag: '餐馆' });
    capsule(RSTDOOR + .57, 1.35, ez + .82, .028, .42, .028, col.goldL,
      { ry: -.72, gloss: G.metal, tag: '餐馆' });
    entryMat(RSTDOOR, ez + 1.05, '餐馆');
    // A7 · the awning, and A1 · the housing over it. Same projection as 超市's — the point of the
    // item is that one frontage in three having an awning made its neighbours read as the poor
    // relations. Eight slats, 4.90 m, inside the 5.00 m frontage. The awning's low rear corner is
    // at 2.68 and this shopfront's mullions stop at 2.69, so the sheet passes 2.7 cm over the
    // window head rather than through it. The housing sits on the frontage's own top at 3.10.
    awning(RST, 2.92, ez, 7, col.red, col.cream);
    shutterBox(RST, 2.98, ez + .06, 4.90, .24);
    signBoard(RST, FASCIA, ez + .10, 4.60, FASCIAH, col.red, col.goldL, '老李面馆');
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
    // two plastic stools and a folding table on the pavement, the summer overflow
    for (const [sx2, sz2] of [[RST - 2.30, ez + .78], [RST - 1.75, ez + .95]]) {
      taper(sx2, .21, sz2, .30, .42, .30, col.plastic, { gloss: .30 });
      box(sx2, .43, sz2, .32, .04, .32, col.plastic, { hard: true, gloss: .30 });
    }
    box(RST - 2.05, .62, ez + 1.30, .90, .05, .60, col.frame, { hard: true, gloss: .28 });
    for (const [ox, oz] of [[-.36, -.22], [.36, -.22], [-.36, .22], [.36, .22]])
      capsule(RST - 2.05 + ox, .31, ez + 1.30 + oz, .022, .62, .022, col.steelD,
        { gloss: G.metal });
    // The extract vent, which is what you smell from the far end of the alley. Dropped from 2.30
    // to 1.90 to clear the 侧招 band (2.27..2.83): street-retail.js hangs 面馆's box sign on this
    // same pier, and at 2.30 the two occupied the same 40 cm of wall. Still in the strip the body
    // can never reach, so nothing about the walk changes.
    box(RST + 2.90, 1.90, ez + .34, .44, .44, .40, col.steelD, { hard: true, gloss: G.metal });
    cyl(RST + 2.90, 1.90, ez + .58, .17, .18, col.steel, { rx: Math.PI / 2, gloss: G.metal });
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
    brickRun(15.2, 24.0, CWZ, CW);
    gateHouse(-12.6, { name:'陈家', number:'12', door:C('#8b3f31'), plaque:col.blueSign,
      detail:'commuter' });
    gateHouse(.2, { name:'王家', number:'14', door:col.red, plaque:col.redD,
      detail:'flowers', tag:true });
    gateHouse(13.8, { name:'豆豆家', number:'16', door:C('#87513c'), plaque:col.teal,
      detail:'child' });
    // the courtyards themselves: roofs stepping back from the wall, and trees over it
    // Each courtyard is four ranges round a paved yard: the front range against the street
    // wall, the main hall at the back, and a side range each way with its ridge turned.
    for (const [cx, len] of [[-19.5, 12], [-6.5, 11], [7.0, 10], [19.5, 9]]) {
      flat(cx, .01, CWZ + 5.4, len, 10.0, col.paveD, { mode: 9, gloss: .14, ...PAVE });
      tileRoof(cx, CWZ + 2.0, len - 1.0, 3.4, 2.60, .95);
      tileRoof(cx, CWZ + 9.0, len - 1.6, 3.8, 2.95, 1.10);
      // Bricks, an aerial, a vent and grass on each of them. The front range is skipped on the
      // two courtyards that keep pigeons: the loft stands on that ridge, and a row of ridge
      // bricks laid straight through the middle of it is exactly the class of mistake this
      // scene has made before.
      if (cx !== -19.5 && cx !== 7.0) roofJunk(cx, CWZ + 2.0, 3.55, len - 1.0, 3.4, .95);
      roofJunk(cx, CWZ + 9.0, 4.05, len - 1.6, 3.8, 1.10);
      for (const s of [-1, 1])
        tileRoof(cx + s * (len / 2 - 1.5), CWZ + 5.5, 3.6, 3.0, 2.50, .85, true);
      // walls under the ranges, so the roofs are not floating over an empty yard
      box(cx, 1.30, CWZ + 3.8, len - 1.0, 2.60, .45, col.brick,
        { hard: true, mode: 11, gloss: G.matte, ...BRICK });
      box(cx, 1.48, CWZ + 7.6, len - 1.6, 2.95, .45, col.brick,
        { hard: true, mode: 11, gloss: G.matte, ...BRICK });
      for (const s of [-1, 1])
        box(cx + s * (len / 2 - 1.5), 1.25, CWZ + 5.5, 1.4, 2.50, 3.4, col.brick,
          { hard: true, mode: 11, gloss: G.matte, ...BRICK });
      // a tree in the middle of the yard, the way there always is
      tree(cx + (len % 3 > 1 ? 1.1 : -1.1), CWZ + 5.6, .85, false);
      blocker(cx - len / 2, cx + len / 2, CWZ + .3, CWZ + 11, 4.4);
    }
    tree(-17.0, CWZ + 4.2, 1.15, false);
    tree(-4.0, CWZ + 4.6, 1.0, false);
    tree(10.5, CWZ + 4.4, 1.1, false);
    // a mid-rise behind the courtyards so the district does not end at a roofline
    for (const [bx, bw, bh] of [[-22, 20, 19], [2, 22, 16], [24, 18, 22]]) {
      box(bx, bh / 2, CWZ + 26, bw, bh, 16, col.renderD,
        { hard: true, mode: 14, gloss: G.paint, ...RENDER });
      for (let f = 0; f < Math.floor(bh / 3); f++)
        for (let i = 0; i < Math.floor(bw / 3.2); i++)
          pane(box(bx - bw / 2 + 1.6 + i * 3.2, 2.2 + f * 3.0, CWZ + 18.0,
            1.7, 1.3, .10, col.glassDay, { hard: true, mode: 1 }), rnd());
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
    // a limewashed panel with a faded painted slogan on it, weathered nearly away
    box(-8.0, 1.78, CWZ - .27, 2.90, .95, .02, C('#a9a294'), { hard: true, gloss: .08, tag: '墙' });
    B.glyphs(-8.0, 1.78, CWZ - .29, Math.PI, '注意防火',
      { size: .40, gap: .22, color: C('#8f6a5c'), gloss: .06, tag: '墙', lift: .008 });
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
    tree(-9.4, -2.10, 1.0, false);
    tree(-2.6, SZ - .55, 1.1, true);
    // The tree that stood at x 4.6 is GONE, and it is the only prop in the district deleted rather
    // than moved. At scale .95 its crown filled x 3.4 .. 5.8 and y 2.6 .. 5.0, and 幸福超市's board
    // runs 5.10 .. 10.10 at y 3.12 .. 3.80 — so the biggest sign on the street was read through a
    // tree from every position west of it, which is every position you approach it from. There is
    // nowhere on this stretch to move it to: the 超市 blade is at x 3.05, the 单元门 canopy ends at
    // 1.75, and its trunk has to stand in the 0.90 m unreachable strip. Four alley trees, not five.
    tree(16.4, SZ - .55, 1.05, false);
    // One more at the east end. Blueprint 4.4 also moved this one to 13.2; that is struck — the
    // courtyard wall has a GATE gap at 12.4..15.2 and a tree at 13.2 stands in front of somebody's
    // door. 22.0 fills the run past the 地铁站 instead, with its crown at 20.8..23.2, clear of the
    // metro canopy which ends at 20.5.
    tree(22.0, SZ - .55, 1.0, false);
    tree(-20.0, -2.10, 1.0, false);

    // 早餐 breakfast stall: a cart with steamer baskets, a wok, a folding table and stools
    //
    // It trades in the morning and it packs up. Everything built between here and the end of the
    // stall is collected into `stall`, so `tick` can take it off the pavement after ten — a
    // breakfast stall steaming away at two in the morning is the clearest way a street can tell
    // you it is a painting. The keeper's own hours have said 5–14 for months; the cart never knew.
    const stallFrom = B.props.length;
    const sx = -8.6, sz = SZ - .95;
    box(sx, .48, sz, 2.30, .10, 1.05, col.steel, { hard: true, gloss: .40, tag: '早餐' });
    box(sx, .24, sz, 2.10, .44, .90, col.steelD, { hard: true, gloss: .34, tag: '早餐' });
    for (const [ox, oz] of [[-1.0, -.42], [1.0, -.42], [-1.0, .42], [1.0, .42]])
      cyl(sx + ox, .09, sz + oz, .10, .18, col.black, { gloss: .3 });
    // Steamer stack: three closed baskets with a fourth standing open on top of them, the buns
    // in that one, and the lid off and leaning against the cart. The five 包子 used to sit in
    // the wok next door, floating in hot oil, which is a 汤圆 and a completely different
    // breakfast — 包子 are steamed, and a stall that fries them is telling the player a lie
    // about the word it is teaching them.
    for (let i = 0; i < 3; i++)
      cyl(sx - .62, .60 + i * .13, sz, .34, .13, col.canvas,
        { gloss: G.wood, ry: i * .12, tag: '早餐' });
    cyl(sx - .62, 1.00, sz, .34, .14, col.canvas, { gloss: G.wood, ry: .34, tag: '早餐' });
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
    cyl(sx + .55, .56, sz, .34, .14, col.charcoal, { gloss: .44, tag: '早餐' });
    cyl(sx + .55, .605, sz, .30, .02, C('#3b3025'), { gloss: .74, tag: '早餐' });     // the oil
    for (let i = 0; i < 4; i++)
      capsule(sx + .40 + i * .10, .655, sz - .13 + (i % 2) * .24, .028, .34, .028,
        C('#c9903f'), { rz: Math.PI / 2, ry: -.34 + i * .16, gloss: .30, tag: '早餐' });
    cyl(sx + .84, .70, sz - .22, .095, .02, col.steel,
      { rx: -.30, gloss: G.metal, tag: '早餐' });
    capsule(sx + 1.02, .76, sz - .34, .016, .34, .016, col.trunkL,
      { rz: Math.PI / 2 - .55, gloss: G.wood, tag: '早餐' });
    // Red awning, pitched forward and set back over the cart. Flat and centred, it simply
    // roofed the whole stall and hid it from anything above eye level.
    // Front poles shorter than the back ones, so the canvas falls toward the alley.
    for (const [ox, oz, oy] of [[-1.3, -.80, 2.06], [1.3, -.80, 2.06],
                                [-1.3, .74, 2.52], [1.3, .74, 2.52]])
      capsule(sx + ox, oy / 2, sz + oz, .035, oy, .035, col.steelD, { gloss: .34 });
    // Striped canvas with a hanging valance, rather than one plain sheet: at nearly three
    // metres square a single red slab reads as a tarpaulin dropped on four poles. Pitched
    // down toward the customer, not away: sloping back it stood up as a striped hoarding
    // facing the alley, and the valance hung along the wall behind the cart.
    for (let i = 0; i < 8; i++)
      box(sx - 1.25 + i * .36, 2.30, sz - .04, .36, .09, 1.60,
        i % 2 ? col.cream : col.red, { hard: true, rx: -.29, gloss: .24, tag: '早餐' });
    box(sx, 1.94, sz - .81, 2.90, .26, .08, col.redD, { hard: true, gloss: .24, tag: '早餐' });
    for (let i = 0; i < 10; i++)
      ball(sx - 1.30 + i * .29, 1.81, sz - .81, .145, .075, .05,
        col.redD, { gloss: .24, tag: '早餐' });
    signBoard(sx, 1.96, sz - .70, 1.90, .36, col.redD, col.paintY, '早餐包子', -1, .5);
    // 豆浆. The stall's own text has always promised soy milk with the buns and there was nothing
    // whatever to pour it out of, so the word had no object to hang on. This is the urn every one
    // of these carts has: a stainless drum on a crate, a tap at the front, a lid with a handle,
    // and the sleeve of paper cups beside it.
    // Tucked against the east end of the cart rather than out in front of it: at the obvious spot
    // on the customer's side it stood half a metre from the man waiting for his buns and filled
    // the whole of the close shot of the stall.
    const UX = sx + 1.47, UZ = sz + .18;
    // The crate is 62 cm across, not 46: at 46 the stack of cups beside the drum stood 7 cm past the
    // end of it and floated, and there is no room between drum and crate edge to pull them in.
    box(UX, .21, UZ, .62, .42, .40, col.plastic, { hard: true, gloss: .28, tag: '豆浆' });
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
    box(PBX, 1.20, PBZ, .54, .60, .012, col.canvas, { hard: true, gloss: .10, tag: '早餐' });
    box(PBX, 1.20, PBZ + .006, .48, .54, .004, C('#dcd2b8'), { hard: true, gloss: .08, tag: '早餐' });
    for (const [k, row] of [[0, '包子一元'], [1, '油条一元'], [2, '豆浆两元']])
      B.glyphs(PBX, 1.38 - k * .18, PBZ - .008, Math.PI, row,
        { size: .095, gap: .012, color: col.charcoal, gloss: .06, lift: .006, tag: '早餐' });
    for (const t of [-1, 1])
      capsule(PBX + t * .24, 1.42, PBZ + .03, .008, .09, .008, col.steelD,
        { rz: Math.PI / 2 - .7, gloss: G.metal, tag: '早餐' });
    // folding table with two stools tucked under it, and a stack of spares
    box(sx + 2.4, .55, sz - .35, 1.20, .06, .70, col.canvas, { hard: true, gloss: .24 });
    for (const [ox, oz] of [[-.5, -.28], [.5, -.28], [-.5, .28], [.5, .28]])
      capsule(sx + 2.4 + ox, .28, sz - .35 + oz, .035, .54, .035, col.steel, { gloss: .34 });
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
    stall.push(...B.props.slice(stallFrom).map(p => ({ p, m0: p.m })));

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
    // 共享单车 in a rack: nose out into the alley, side by side. Turned along the row they
    // overlapped each other by half a length and read as a heap of scrap.
    for (let i = 0; i < 7; i++)
      bike(2.9 + i * .72, -2.10, (rnd() - .5) * .14,
        i % 2 ? col.bikeY : col.bikeB, true, false);
    box(5.06, .18, -2.42, 5.6, .10, .12, col.paintY, { hard: true, gloss: .3 });
    thing('自行车', -5.0, 1.35, SZ - .30, '我的自行车在楼下。',
      'My bicycle is downstairs.',
      '自行车 — "self-run vehicle". 骑 qí is the verb for riding one.',
      { focus: [-5.0, SZ - 1.6], reach: 2.2 });

    // 快递 delivery trike, parked with its crates open
    const kx = 9.6, kz = SZ - .70;
    box(kx, .60, kz, 1.70, .90, 1.15, col.plastic, { hard: true, gloss: .30, tag: '快递' });
    box(kx, 1.10, kz, 1.60, .12, 1.05, col.white, { hard: true, gloss: .3, tag: '快递' });
    for (let i = 0; i < 3; i++)
      box(kx - .4 + i * .4, 1.28, kz + (rnd() - .5) * .4, .38, .30, .34, col.canvas,
        { hard: true, gloss: .18, ry: rnd(), tag: '快递' });
    box(kx - 1.35, .70, kz, .60, .70, .70, col.charcoal, { hard: true, gloss: .3, tag: '快递' });
    capsule(kx - 1.35, 1.12, kz, .03, .60, .03, col.steel, { rz: Math.PI / 2, gloss: G.metal });
    for (const [ox, oz] of [[-1.45, 0], [.62, -.56], [.62, .56]])
      cyl(kx + ox, .27, kz + oz, .54, .10, col.black, { rx: Math.PI / 2, gloss: .26 });
    solid(kx - 1.8, kx + 1.0, kz - .7, kz + .7);
    shade(kx, kz, 3.2, 1.7, .32);
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

    for (const [bx, bz] of [[-13.4, -2.05], [7.0, SZ - .40], [20.5, -2.05]]) {
      box(bx, .48, bz, .78, .96, .70, col.tarp, { hard: true, gloss: .30 });
      box(bx, .99, bz, .82, .10, .74, col.charcoal, { hard: true, gloss: .30 });
      box(bx, 1.06, bz + .05, .40, .06, .30, col.charcoal, { hard: true, rx: -.4, gloss: .3 });
      box(bx + .5, .40, bz, .10, .80, .50, col.plastic, { hard: true, gloss: .3 });
      shade(bx, bz, 1.5, 1.4, .34);
      solid(bx - .5, bx + .6, bz - .45, bz + .45);
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
    wallJunk(8.0, 3.20, 0, -1);          // more crates, east of the market piers
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
    // Set at x -12.0, which is the only gap on that side wide enough: the bin stands at -13.4 and
    // finishes at -12.85, the tree grate at -9.4 starts at -10.15, the steam off the drain cover
    // at -13.0 is a quarter of a metre clear, and the gas riser at -10.9 is on the wall behind.
    const px1 = -12.0, pz1 = -2.24;
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
    // The wires from the first pole land on this one: the same five heights, run back east so
    // the two spans meet instead of ending a metre and a half apart in the air.
    for (let i = 0; i < 5; i++) {
      const y = 7.1 - (i % 2) * .6;
      capsule(px1 + 1.55, y - .58 - i * .04, pz1 + .04 - i * .05, .019, 3.4, .019, col.black,
        { rz: Math.PI / 2 - .10, gloss: .2 });
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
    // -24.0..-21.6, -19.6..-16.4 (that one in street-alley.js) and -14.6..-10.7. It also reads
    // as a real street — the washing end of a hutong and the trading end of it are not the same
    // fifty metres.
    capsule(-12.4, 3.08, 1.55, .016, 6.0, .016, col.steel, { rz: Math.PI / 2 + .05, gloss: .3 });
    washing(-14.6, 3.04, 1.58, 6, -.012, '衣服');
    // a second, shorter line at the west end
    capsule(-22.7, 2.99, 1.70, .016, 4.2, .016, col.steel, { rz: Math.PI / 2 - .04, gloss: .3 });
    washing(-24.0, 2.95, 1.66, 4, .01);
    // Six shirts, two pairs of trousers and a towel strung over the alley, and no word on any of
    // them. 衣服 is in the dictionary and was reachable nowhere in the district — the flat teaches
    // it off the wardrobe, so a player who never opened the wardrobe never met it.
    thing('衣服', -12.60, 2.90, 1.56, '衣服晾在外面，明天就干了。',
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
    for (const s of [-1, 1]) {
      // the two piers the gap is between
      box(MK + s * 2.30, 2.60, MZ + .70, 1.80, 5.20, 2.20, col.brick,
        { hard: true, mode: 11, gloss: G.matte, ...BRICK });
      box(MK + s * 2.30, 5.32, MZ + .70, 1.96, .28, 2.36, col.brickD, { hard: true, gloss: G.matte });
    }
    blocker(MK - 3.3, MK - 1.3, MZ - .3, MZ + 2.0, 6.0);
    blocker(MK + 1.3, MK + 3.3, MZ - .3, MZ + 2.0, 6.0);
    solid(MK - 3.3, MK - 1.35, MZ - .30, MZ + 1.9);
    solid(MK + 1.35, MK + 3.3, MZ - .30, MZ + 1.9);
    // the lintel over the gap, and the board on it
    box(MK, 3.40, MZ + .18, 2.90, .34, .50, col.brickD, { hard: true, mode: 11, gloss: G.matte, ...BRICK });
    box(MK, 4.10, MZ + .04, 2.70, .96, .12, col.charcoal, { hard: true, gloss: .20, tag: '夜市' });
    // The two characters, in tube light. `litten` at a high factor is what makes them come on:
    // by day they are a dull red plate on a dark board and after dark they are the brightest
    // thing in the alley.
    for (const g of B.glyphs(MK, 4.14, MZ + .11, 0, '夜市',
      { size: .56, gap: .16, color: C('#e04a3a'), mode: 1, glow: .10, tag: '夜市', lift: .01 }))
      litten(g, 2.4);
    for (const s of [-1, 1])
      litten(box(MK + s * 1.16, 4.10, MZ + .12, .05, .74, .04, C('#48c07a'),
        { hard: true, mode: 1, glow: .06, tag: '夜市' }), 2.0);
    // The far wall of the lane behind the gap, so the gate is not a hole through to the sky. Lit
    // rather than emissive and deliberately *not* on the `litten` list: put on it, this panel came
    // up with the lanterns after dark and the gateway filled with a sheet of white light. What you
    // should see through there is a dim brick wall with somebody else's bulbs on it.
    box(MK, 1.70, MZ + 1.85, 2.80, 3.40, .10, C('#3a322c'),
      { hard: true, mode: 11, gloss: G.matte, ...BRICK, tag: '夜市' });
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

    // ---- the west end: a dead end closed by a two-storey brick building, with a small square
    // in front of it. The building used to overlap the square you stand in, so the camera slid
    // straight inside it and the whole view became one blank sheet of brickwork.
    const WX = -33.4;                                  // the building line at the dead end
    box(WX - 6.0, 4.15, -3.25, 12.0, 8.30, 23.5, col.brick,
      { hard: true, mode: 11, gloss: G.matte, ...BRICK });
    tileRoof(WX - 6.0, -3.25, 12.0, 23.5, 8.30, 2.5);
    blocker(WX - 12.4, WX, -15.2, 8.7, 11.2);
    solid(WX - 12.4, WX, -15.2, 8.8);
    // Its face onto the square. A dead end you are going to look at every time you walk west
    // needs something on it: windows, a door, a meter box, a bike against the wall.
    for (const wz of [-4.8, -1.6, 3.9, 6.4]) for (const wy of [1.60, 4.75]) {
      box(WX + .04, wy, wz, .08, 1.34, 1.62, col.glassDark, { hard: true, gloss: .20 });
      pane(box(WX + .08, wy, wz, .03, 1.18, 1.46, col.glassDay,
        { hard: true, mode: 1, gloss: G.glass }), rnd());
      box(WX + .12, wy - .74, wz, .24, .08, 1.82, col.stone, { hard: true, gloss: .22 });
      if (wy > 3.0) box(WX + .30, wy - 1.02, wz + .95, .44, .56, .82, col.white,
        { hard: true, gloss: .26 });
    }
    box(WX + .06, 1.06, 1.20, .12, 2.12, 1.24, col.red, { hard: true, gloss: .26 });
    box(WX + .13, 1.06, 1.20, .03, 1.90, .05, col.redD, { hard: true });
    box(WX + .30, .09, 1.20, .56, .18, 1.60, col.stoneD, { hard: true, gloss: .22 });
    // Li Shifu lives behind the red door. A nameplate, porch light and repair bag tie the
    // anonymous west-end facade to the mechanic the player sees every day.
    box(WX + .15, 1.62, .34, .05, .68, .42, col.blueSign, { hard: true, gloss: .30 });
    B.glyphs(WX + .18, 1.62, .34, Math.PI / 2, '李家',
      { size: .18, gap: .05, vertical: true, color: col.white, mode: 1, lift: .008 });
    litten(ball(WX + .22, 2.36, 1.20, .075, .085, .075, C('#ffe3a6'),
      { mode: 1, glow: .22 }), .9);
    box(WX + .34, .27, 2.12, .44, .38, .68, col.charcoal,
      { gloss: .22, round: .04 });
    capsule(WX + .56, .56, 2.12, .035, .54, .035, col.steel,
      { rz: .65, gloss: G.metal });
    box(WX + .22, 1.55, -6.7, .34, .72, .52, col.steelD, { hard: true, gloss: .32 });
    bike(WX + .80, -5.6, .08, col.bikeO, false, false);

    // masses closing the square north and south, so it is the end of a lane and not a shelf
    // of paving with the empty horizon showing past it
    box(-29.0, 5.20, -12.6, 10.0, 10.40, 19.2, col.brick,
      { hard: true, mode: 11, gloss: G.matte, ...BRICK });
    tileRoof(-29.0, -12.6, 10.0, 19.2, 10.40, 2.6);
    blocker(-34.0, -24.0, -22.2, -3.0, 13.0);
    solid(-34.0, -24.0, -22.2, -2.95);
    brickRun(-33.2, -23.6, 7.4, 2.55);
    box(-29.0, 3.10, 13.5, 10.0, 6.20, 11.0, col.brick,
      { hard: true, mode: 11, gloss: G.matte, ...BRICK });
    tileRoof(-29.0, 13.5, 10.0, 11.0, 6.20, 1.9);
    blocker(-34.0, -24.0, 8.0, 19.0, 8.2);

    // ---- the alley's north side west of your own block: another walk-up, plainer than yours.
    // Without it the alley had open ground along one side for eleven metres.
    box(-21.9, 5.60, -10.2, 10.8, 11.20, 14.6, col.render,
      { hard: true, mode: 14, gloss: G.paint, ...RENDER });
    box(-21.9, .70, -2.98, 10.9, 1.40, .34, col.brick, { hard: true, mode: 11, gloss: G.matte, ...BRICK });
    box(-21.9, 11.50, -10.2, 11.0, .50, 14.8, col.renderD, { hard: true, gloss: G.paint });
    blocker(-27.3, -16.5, -17.6, -2.90, 11.2);
    solid(-27.3, -16.4, -17.6, -2.85);
    for (let f = 1; f < 4; f++) for (let i = 0; i < 3; i++) {
      const wx = -25.4 + i * 3.5;
      fwin(wx, f * 2.80 + 1.60, -2.90, 1.95, 1.40);
      if (rnd() > .45) acBox(wx + 1.30, f * 2.80 + .55, -2.90);
    }

    tree(-29.2, 3.4, 1.25, false);
    // mahjong table under it, four stools, and a thermos
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
    solid(-29.7, -28.3, -.1, 1.3);
    shade(-29.0, .6, 2.6, 2.6, .3);

    // ============================================================ the road, east end
    // pavement, tactile strip, railings, lamps, and the bus stop
    for (let z = -14; z <= 14; z += 2.4)
      flat(RD0 - 1.4, .007, z, 1.0, 2.0, col.paintY, { gloss: .14 });
    for (let z = -13; z <= 13; z += 2.6) {
      if (Math.abs(z) < 3.4) continue;                     // gap at the crossing
      for (let i = 0; i < 2; i++)
        capsule(RD0 - .55, .62, z + i * 1.3, .035, 1.20, .035, col.steel, { gloss: .4 });
      capsule(RD0 - .55, 1.16, z + .65, .04, 2.6, .04, col.steel,
        { rx: Math.PI / 2, gloss: .4 });
      capsule(RD0 - .55, .66, z + .65, .03, 2.6, .03, col.steel,
        { rx: Math.PI / 2, gloss: .4 });
    }
    lamp(RD0 - 1.9, -9.0); lamp(RD0 - 1.9, 5.0); lamp(RD1 + 1.9, -3.0); lamp(RD1 + 1.9, 11.0);
    lamp(-8.0, -2.3, 1); lamp(12.0, -2.3, 1);
    // -5.2 → 6.5. This is the same fault as the tree that used to stand at x 4.6 in the alley:
    // at (25.4, -5.2) its crown filled the view of 药店's door and fascia from every position on
    // the footway south of it. 6.5 is opposite the alley mouth, where the west side has no
    // frontage at all and a tree is just a tree.
    tree(RD0 - 2.1, 6.5, 1.1, false); tree(RD0 - 2.1, 9.4, 1.0, false);
    // The tree that stood at (39.6, -8.0) is GONE — the third time this fault has turned up
    // today and the third time there was nowhere to move it to. It stood in the mouth of
    // 新天地步行街 (js/street-lane.js opens the lane at z -12.60 .. -5.80), directly under the
    // gateway arch, and the far pavement's remaining gaps are the 2.48 m between the metro canopy
    // and the bike rank and the 1.4 m between the notice board and a hedge planter. A tree in a
    // street entrance is worse than one tree fewer.
    tree(RD1 + 2.1, 6.0, 1.15, false);

    // The shelter is at the KERB now, not the back of the footway. 北京银行 skins the corner
    // block's east elevation at z -11.40 .. -7.10 (js/street-bank.js) and this shelter is 7.30 m
    // of glass centred on z -12.0 — at RD0 - 2.6 it stood squarely across the branch's own
    // frontage. RD0 - 1.35 puts its glass at 26.99, 29 cm inside the kerb face at 27.28, and
    // leaves a 1.0 m lane between it and the shop windows, which is where a pavement's walking
    // room actually is: shops at the back, shelter at the kerb, people between.
    const bsx = RD0 - 1.35, bsz = -12.0;
    box(bsx, 3.05, bsz, 1.90, .16, 7.40, col.steelD, { hard: true, gloss: .36 });
    box(bsx - .1, 3.18, bsz, 2.10, .06, 7.60, col.steel, { hard: true, gloss: .44 });
    for (const oz of [-3.4, 0, 3.4])
      capsule(bsx + .8, 1.52, bsz + oz, .07, 3.05, .07, col.steelD, { gloss: .36 });
    box(bsx + .84, 1.70, bsz, .07, 2.40, 7.30, col.glassDay,
      { hard: true, alpha: .26, gloss: G.glass });
    box(bsx - .55, .60, bsz + 1.4, .50, .07, 3.10, col.steel, { hard: true, gloss: .4 });
    for (const oz of [.2, 2.6])
      box(bsx - .55, .32, bsz + oz, .40, .56, .08, col.steelD, { hard: true, gloss: .36 });
    // route panel and a backlit advert, both lit at night
    box(bsx - .3, 1.90, bsz - 2.6, .10, 1.90, 1.05, col.blue, { hard: true, gloss: .34, tag: '公交车站' });
    litten(box(bsx - .38, 1.90, bsz - 2.6, .03, 1.72, .90, col.white,
      { hard: true, mode: 1, glow: .12, tag: '公交车站' }), .8);
    for (let i = 0; i < 7; i++)
      box(bsx - .40, 2.55 - i * .19, bsz - 2.6, .02, .09, .62, col.charcoal,
        { hard: true, mode: 1, tag: '公交车站' });
    litten(box(bsx + .95, 1.75, bsz + 3.9, .06, 2.00, 1.20, C('#ffe6c0'),
      { hard: true, mode: 1, glow: .2 }), .9);
    lampPools.push(glow(M.trs(bsx, .03, bsz, 0, 5.0, 1, 9.0), C('#ffd9a4'), 0));
    // The backlit advert is the only real light source in the shelter, and a bus shelter after
    // dark is lit by exactly that and nothing else. Cool-warm rather than tungsten: it is a
    // fluorescent lightbox behind a printed sheet.
    B.light(bsx + .70, 1.80, bsz + 3.3, [1.0, .93, .82], .45, 4.6);
    B.light(bsx - .10, 2.30, bsz - 2.0, [1.0, .94, .86], .30, 3.4);
    solid(bsx - .7, bsx + .9, bsz - 3.8, bsz + 3.8);
    // The focus used to be at bsx - 2.0, which is x 22.9 — outside the road zone, whose west edge is
    // 24.0, and behind the shelter's own collider, which pushes the body out to 26.1. The nearest
    // spot it was possible to stand was 3.20 m from a focus with a reach of 3.0, so this label had
    // never once come up. It sits on the pavement side of the shelter now.
    thing('公交车站', bsx - .4, 3.55, bsz, '公交车站在马路对面。',
      'The bus stop is across the road.',
      '公交车 the bus + 站 the stop. 地铁站 is the subway.',
      { focus: [bsx + 1.55, bsz], reach: 2.4 });
    thing('马路', RD0 + 4.0, .70, 3.6, '过马路要看红绿灯。',
      'Crossing the road, watch the lights.',
      '马路 mǎlù — "horse road", the everyday word for a street.',
      { focus: [RD0 + 1.2, 3.4], reach: 3.2, tag: '马路' });
    flat(RD0 + 4.0, .012, 3.6, 2.0, 2.0, col.asphalt,
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

    // A NIO-shaped electric car: long low nose, one slim daytime-running light drawn right
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

      // ---- the face. NIO's signature is one hairline of daytime-running light drawn right
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
    const busX = RD0 + 1.9, busZ = -12.4;
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
      { focus: [26.40, busZ + 3.00], reach: 2.8 });
    }
    // The five static cars are GONE, and it is worth recording why rather than just that.
    //
    // js/street-traffic.js now runs a real fleet — thirteen cars, a 623路 bus that dwells at the
    // stop and waits for a gap before merging, e-bikes filtering past the queue, all braking on a
    // shared 45 s signal. Leaving these five in gave the road two fleets, one of them frozen.
    //
    // But they were also wrong, which nobody had noticed in the years they sat here. The comment
    // that used to be on this line said "northbound lanes east of the centre line, southbound west
    // of it" — and then built the east side at `ry = 0` and the west at `ry = Math.PI`, which is
    // left-hand traffic. All five pointed the wrong way up their own lanes. The parked bus below
    // faces +z and is correct, so the cars disagreed with the bus in the same scene. One of them,
    // at x 28.9, was parked in the painted bike lane.
    //
    // Deleting them is a net saving: ~520 props of static fleet out, 449 props of moving fleet in.
    //
    // `车` moved with them — js/street-traffic.js builds a parked 汽车 at (38.8, -11.6) carrying
    // the tag and its own `thing`, so the word survives and now sits on a car that is parked on
    // purpose rather than one abandoned mid-lane.
    // The 车 word went with them. It stood at (32.85, -3.60), which was the sand-coloured saloon's
    // roof — with the car deleted it would have hung over an empty lane, and its focus point was in
    // the middle of moving traffic. js/street-traffic.js carries it now, on a car that is parked.
    //
    // The lesson it was written for is worth keeping and has moved with it: 车 on its own is any
    // vehicle, and it is the character the player has already met three times over in 自行车,
    // 电动车 and 公交车 without ever being told what it means alone.

    // traffic light on its mast, counting down
    const tlx = RD0 - 1.1, tlz = -3.9, TL = { tag: '红绿灯' };
    cyl(tlx, .20, tlz, .28, .40, col.stoneD, { gloss: .2, ...TL });
    taper(tlx, 3.1, tlz, .28, 5.8, .28, col.charcoal, { gloss: .34, ...TL });
    capsule(tlx, 5.85, tlz + 1.9, .10, 4.0, .10, col.charcoal,
      { rx: Math.PI / 2, gloss: .34, ...TL });
    box(tlx, 5.35, tlz + 3.7, .42, 1.20, .38, col.charcoal, { hard: true, gloss: .34, ...TL });
    const lights = [[.42, '#c8382a'], [0, '#d8b83a'], [-.42, '#3fa05a']];
    lights.forEach(([oy, hex], i) => {
      litten(cyl(tlx, 5.35 + oy, tlz + 3.90, .13, .06, C(hex),
        { rx: Math.PI / 2, mode: 1, glow: i === 0 ? .5 : .04, ...TL }), i === 0 ? 1.0 : .1);
    });
    box(tlx, 4.45, tlz + 3.7, .38, .48, .34, col.charcoal, { hard: true, gloss: .34, ...TL });
    litten(box(tlx, 4.45, tlz + 3.89, .26, .34, .03, C('#3a1608'),
      { hard: true, mode: 1, glow: .10, ...TL }), .4);
    // The countdown, with a number on it. It was a plain orange rectangle, and the one thing a
    // Chinese pedestrian signal always shows is two big digits. They do not count: the street is
    // the only place the game never calls a per-frame tick on, so nothing here can change with the
    // clock — the red lamp above has been hardcoded on for the same reason. A static 28 at least
    // agrees with the static red; a blank panel agreed with nothing.
    for (const g of B.glyphs(tlx, 4.45, tlz + 3.91, 0, '28',
        { size: .30, gap: .02, color: C('#f06a2c'), mode: 1, glow: .45, lift: .008, ...TL }))
      litten(g, 1.0);
    solid(tlx - .3, tlx + .3, tlz - .3, tlz + .3);
    thing('红绿灯', tlx, 5.90, tlz + 3.70, '红灯停，绿灯行。',
      'Red light stop, green light go.',
      '红 red + 绿 green + 灯 light. The number counts the seconds down.',
      { focus: [25.60, tlz + 3.70], reach: 2.6 });

    // ---- the far side of the road: shopfronts under six storeys of flats.
    //
    // TWENTY-TWO units, not forty. Counted 2026-08-09 by running the builder: blocks are
    // 13 + rnd()*8 m long and each carries `round(len / 4.8)` units, and this file said "forty"
    // in five places while STOREFRONT-UPGRADES.md repeated it. Nothing was built wrong — but D2's
    // saving is 22 valance strips down to 7, not 40 down to 7, and A11 is 22 reveals.
    // The road runs north-south, so the frontage has to face -x and the blocks have to be a
    // row along z. Built as a row along x, only the first one faced the street at all: the
    // rest queued up behind it, the road had no built edge, and a camera swung round behind
    // the player on the far pavement ended up a metre from a blank flank filling the screen.
    const FX = 41.6;                                  // the building line
    // The lane's mouth. js/street-lane.js opens 新天地步行街 through this frontage at
    // z -12.60 .. -5.80 — the 6.80 m 北京新天地's portal used to occupy — so the parade stops
    // short of it and starts again on the other side. A block that would straddle the gap is cut
    // back to it; one that would start inside it is skipped; and a cut that would leave a sliver
    // under 4 m gives the sliver to the gap, because 3 m of six-storey block is not a building.
    const GZ0 = -12.60, GZ1 = -5.80;
    let fz = -54, nearUnit = 0;
    while (fz < 52) {
      if (fz >= GZ0 && fz < GZ1) { fz = GZ1; continue; }
      let len = 13 + rnd() * 8;
      if (fz < GZ0 && fz + len > GZ0) {
        len = GZ0 - fz;
        if (len < 4) { fz = GZ1; continue; }
      }
      const bh = 15.5 + rnd() * 6, dep = 17 + rnd() * 7;
      const cz = fz + len / 2, cx = FX + dep / 2;
      box(cx, bh / 2, cz, dep, bh, len, col.render, { hard: true, mode: 14, gloss: G.paint, ...RENDER });
      box(cx, bh + .30, cz, dep + .22, .60, len + .22, col.renderD, { hard: true, gloss: G.paint });
      // dark shopfront band at street level, with a canopy over it
      box(FX + .14, 2.15, cz, .34, 4.30, len, col.charcoal, { hard: true, gloss: .30 });
      box(FX - .10, 4.50, cz, .55, .28, len + .24, col.renderD, { hard: true, gloss: G.paint });
      blocker(FX, cx + dep / 2, cz - len / 2, cz + len / 2, bh);
      solid(FX - .12, cx + dep / 2, cz - len / 2, cz + len / 2);

      // window grid on the road face
      const bays = Math.max(2, Math.round(len / 3.5));
      const floors = Math.max(2, Math.floor((bh - 5.6) / 2.85));
      for (let f = 0; f < floors; f++) for (let i = 0; i < bays; i++) {
        const wz = cz - len / 2 + (i + .5) * (len / bays), wy = 6.2 + f * 2.85;
        box(FX - .03, wy, wz, .07, 1.62, 2.16, col.glassDark, { hard: true, gloss: .20 });
        pane(box(FX - .07, wy, wz, .03, 1.46, 2.00, col.glassDay,
          { hard: true, mode: 1, gloss: G.glass }), rnd());
        box(FX - .10, wy - .88, wz, .20, .08, 2.36, col.renderD, { hard: true, gloss: G.paint });
        if (rnd() > .5) {                            // condenser on its bracket
          box(FX - .32, wy - 1.18, wz + .92, .44, .58, .84, col.white, { hard: true, gloss: .26 });
          for (let k = -2; k <= 2; k++)
            box(FX - .53, wy - 1.18, wz + .92 + k * .13, .03, .44, .05, col.steelD,
              { hard: true, gloss: .30 });
        }
      }

      // lit shopfronts and a signboard over each
      const shops = Math.max(1, Math.round(len / 4.8));
      for (let i = 0; i < shops; i++) {
        const sw = len / shops, sz2 = cz - len / 2 + (i + .5) * sw;
        // Which unit of the reachable run this is. `nearUnit` counts only the strip of far
        // pavement a body can stand on (|z| < 11.5) and it used to be incremented forty lines
        // down, inside the name override. Hoisted here because D4 has to decide before the board
        // colour is drawn; the VALUE is unchanged — nothing between the two sites read it.
        const near = Math.abs(sz2) < 11.5 ? ++nearUnit : 0;
        // D4 · the parade's two failures. Every real run of forty shopfronts has one board the
        // sun has taken and one unit with its sign out, and their absence is most of why forty
        // units read as a repeated texture rather than forty businesses. Both are COLOUR ONLY —
        // same props, same count, and the dark one gives an emissive quad back rather than
        // adding one. Placed on the reachable stretch so they are seen, not inferred.
        const bleached = near === 2, dead = near === 4;
        pane(box(FX - .08, 1.80, sz2, .06, 2.50, sw - .55, col.glassDay,
          { hard: true, mode: 1, gloss: G.glass }), dead ? .10 : .95);
        // A11 · the reveal. Each unit was a lit pane with the block's charcoal band 2 cm behind
        // it, so from the west footway the parade read as forty light boxes and not forty rooms.
        // ONE box per unit and no new emissive: a dark panel inset from the glass on every side,
        // which is what turns a sheet into an opening with something behind it. It has to live in
        // the 2 cm slot between the glass's back face at FX-.05 and the band's front face at
        // FX-.03 — anything deeper is behind an opaque face, and every surface in this renderer
        // is single-sided, so there is no building a box you can see the inside of.
        box(FX - .041, 1.66, sz2, .012, 2.10, sw - .95, col.black, { hard: true, gloss: .10 });
        let board = pick([col.red, col.blue, col.paintY, col.teal]);
        if (bleached) board = [board[0] * .34 + .52, board[1] * .34 + .50, board[2] * .34 + .46];
        // Kept as a reference so the two units that get a thing can be tagged after their name is
        // known. The tag cannot be passed at construction because the name is drawn from the random
        // stream *after* the board colour is, and swapping those two `pick` calls round would
        // re-deal every sign and every colour on the parade.
        // Deeper, with the same lit valance the alley's boards now carry. The parade is read
        // across a 9.84 m carriageway; a 20 cm panel at that distance is a colour, not a sign.
        const boardProp = box(FX - .20, 3.72, sz2, .28, .84, sw - .30, board,
          { hard: true, gloss: .30 });
        box(FX - .14, 4.19, sz2, .34, .10, sw - .20, board, { hard: true, gloss: .26 });
        // NO lit valance on the parade, and that is the district's own rule rather than restraint.
        // js/street-retail.js:12 records what a mode-1 glowing quad costs here: "a glowing glyph
        // is a light-mask quad and three dozen of them lay a half-transparent copy of the scene
        // over the top of it. That is a mistake this project has already paid for once." There are
        // FORTY units on this parade. The eleven named shops — the five off `signBoard`, the four
        // in the lane and its two anchors — get a lit lip; forty anonymous ones do not, and they
        // keep the deeper board and the bigger glyphs, which cost nothing but geometry.
        //
        // If the valance is ever wanted here, it is one strip for the whole run rather than one
        // per unit: same read, one quad.
        let signTag;
        // The name of the shop, in characters, not a row of blank cream squares — which is what
        // this was: every business on the far side of the road advertised ■■■. The whole premise
        // of the game is that the street is covered in writing the player is learning, and the
        // named shops on the near side were given real signs long ago. This is the other forty.
        let name = pick(SHOPNAMES);
        // Which unit each of the two taught names lands on cannot be left to the shuffle. The parade
        // is 106 m long and the strip of far pavement the body can actually stand on is only
        // z -13.5 to 13.5 of it, and the first 面包房 the seeded stream produced stood at z 45.6 —
        // a thing whose focus is thirty-two metres outside every walkable zone, which is a thing
        // that does not exist. It has presumably never once been reachable.
        //
        // So: the first unit inside the reachable strip takes whichever name is still owed, and so
        // does the third and any after it. Everything else on the parade keeps the name the stream
        // gave it. A unit that has already drawn one of the two by itself is left alone.
        if (near) {
          const owed = TEACH.filter(w => !taught.has(w));
          if (owed.length && !owed.includes(name) && (near === 1 || near >= 3))
            name = owed[0];
        }
        const span = sw - .70, gsz = Math.min(.64, span / name.length * .92);
        // The first pharmacy and the first bakery on the parade get a thing, so their names can be
        // asked about. The rest stay scenery on purpose.
        //
        // Every one of these signs was unreadable in the sense that matters: the glyphs are geometry,
        // the dictionary is only ever reached through a thing you walk up to, and there was no thing
        // on any of forty shopfronts. So the street was covered in writing the player could look at
        // and never ask about — which is a strange state for a game whose whole subject is reading
        // the street. Two of them is the right number to start with: a learner needs 药店 and 面包房
        // long before 五金店, and a label on every unit would be a wall of text rather than
        // a parade of shops.
        //
        // Which unit they land on is decided by the seeded RNG that picks the names, so it is stable
        // between runs — with the one override above, which is what stops a name landing thirty
        // metres past the end of the pavement.
        if (TEACH.includes(name) && !taught.has(name)) {
          taught.add(name);
          // The board and its characters become pickable, so the cursor can be pointed at the sign
          // from across the road. Every other unit on the parade stays untagged and unpickable.
          signTag = name;
          boardProp.tag = name;
          const say = ['面包房的面包很新鲜。', 'The bread at the bakery is fresh.',
                       '面包 bread + 房 room, in the sense of a workshop. Not 面 — that is noodles.'];
          // Standing spot on the far pavement, clear of the shopfront glazing and the road.
          const th = thing(name, FX - .34, 3.72, sz2, say[0], say[1], say[2],
            { focus: [FX - 2.30, sz2], reach: 2.4 });
        }
        // A bleached board keeps dark ink whatever it started as: the pale ground it has faded to
        // gives cream nothing to read against, and `board === col.paintY` cannot match any more
        // because bleaching builds a new array rather than one of the palette's own.
        for (const g of B.glyphs(FX - .36, 3.72, sz2, -Math.PI / 2, name,
            { size: gsz, gap: gsz * .16,
              color: (bleached || board === col.paintY) ? col.charcoal : col.cream,
              mode: 1, glow: dead ? 0 : .22, lift: .014, tag: signTag }))
          // The dead unit's characters are NOT littened, which is the whole of D4's second half:
          // its sign stays dark through the night curve while its forty neighbours come up.
          { if (!dead) litten(g, .9); }
        // Roughly one unit in four has the shutter down. A parade where every single door is
        // open and lit at every hour of the day is a stage set.
        if (rnd() > .74) {
          // The shutter itself gets the corrugated-steel sample; the slat battens laid over it
          // stay plain, because they are the *large* ribs and the material is the small ones.
          // Both together is what a roller shutter actually has, and it is the one surface on
          // this parade with a texture you could name from across the road.
          box(FX - .13, 1.62, sz2, .12, 3.06, sw - .60, col.steel,
            { hard: true, gloss: .40, ...SHUT });
          const slats = Math.max(6, Math.round(3.0 / .19));
          for (let k = 0; k < slats; k++)
            box(FX - .20, .16 + k * (2.98 / slats), sz2, .02, .05, sw - .62, col.steelD,
              { hard: true, gloss: .34 });
          box(FX - .21, 3.20, sz2, .16, .16, sw - .52, col.steelD, { hard: true, gloss: .36 });
        } else {
          // Open: a planter either side of the doorway, which is what every one of these has.
          for (const os of [-1, 1]) {
            const pz = sz2 + os * (sw / 2 - .55);
            taper(FX - .62, .21, pz, .40, .42, .40, col.stoneD, { gloss: .22 });
            ball(FX - .62, .52, pz, .26, .20, .26, col.greenD, { mode: 15, gloss: .12 });
            ball(FX - .62, .68, pz, .19, .17, .19, col.green, { mode: 15, gloss: .12 });
          }
        }
        lampPools.push(glow(M.trs(FX - 2.2, .03, sz2, 0, 4.6, 1, sw + 2.6), C('#ffb877'), 0));
      }
      // D2 · one lit valance for the whole block. The comment above records why there is none per
      // unit — `street-retail.js:12`, forty mode-1 glowing quads laying forty half-transparent
      // copies of the scene over it — and then says what to do instead: "one strip for the whole
      // run rather than one per unit: same read, one quad." This is that. The parade gets the
      // continuous lit line at the foot of its fascia that every Chinese shopping street has, and
      // the emissive count goes up by the number of BLOCKS (7) and not the number of units (40).
      // 3.26 is the board's own bottom edge (3.72 - .84/2 = 3.30) less the strip's half-depth;
      // FX - .37 puts it 3 cm proud of the board face at FX - .34.
      litten(box(FX - .37, 3.26, cz, .05, .08, len - .40, C('#ffe9c4'),
        { hard: true, mode: 1, glow: .10 }), 1.1);
      // What is on top of a Chinese city block: a satellite dish or two, a water tank on legs
      // and a whip antenna. The parapet was a clean line all the way down the road.
      for (let k = 0; k < 2; k++) {
        const rz = cz - len / 2 + (k + .7) * (len / 2.4), rx = FX + 2.2 + k * 3.4;
        cyl(rx, bh + .90, rz, .06, 1.20, col.steelD, { gloss: .34 });
        taper(rx, bh + 1.62, rz, .96, .34, .96, col.white,
          { rx: -.55, gloss: .26 });
        cyl(rx, bh + 1.72, rz, .05, .40, col.steelD, { rx: -.55, gloss: .34 });
      }
      cyl(FX + 5.6, bh + 1.05, cz + 1.4, .34, 1.50, C('#8d9298'), { gloss: .34 });
      for (const os of [-1, 1]) for (const oz2 of [-1, 1])
        cyl(FX + 5.6 + os * .24, bh + .18, cz + 1.4 + oz2 * .24, .04, .40, col.steelD,
          { gloss: .34 });
      capsule(FX + 1.4, bh + 2.30, cz - 2.6, .035, 4.40, .035, col.steelD, { gloss: .36 });
      fz += len + .5;
    }
    // ---- 公司 the office you work in, four floors up in one of these blocks. Its lobby
    // entrance is cut into the frontage the procedural row above has already built, so it is
    // drawn slightly proud of it: a granite surround, two tall glass leaves, and the company's
    // plate on the wall. This is the one door in the game you have to cross a road to reach.
    const OFZ = 2.20;
    // The surround is a frame now — two jambs and a head — where it used to be one solid
    // 3.6 x 4.1 m block of granite sitting directly behind the leaves. That is why the only door
    // in the game you have to cross a road to reach showed, through two storeys of glass, a flat
    // brown rectangle with a glow painted on the outside of it.
    //
    // The frame has to be a frame rather than a hole cut in the block because the block is one
    // opaque volume and there is no cutting a hole in one. The jambs land on the outer edges of
    // the glazing, the head starts above the mullions, and the granite threshold that was already
    // there closes the bottom.
    for (const oz of [-1.62, 1.62])
      box(FX - .30, 2.05, OFZ + oz, .62, 4.10, .36, col.stone, { hard: true, gloss: .26 });
    box(FX - .30, 3.43, OFZ, .62, 1.34, 3.60, col.stone, { hard: true, gloss: .26 });
    box(FX - .58, .07, OFZ, .34, .14, 3.10, col.stone, { hard: true, gloss: .28 });
    // The back of the lobby, set as far back as it can go and still hide what the procedural
    // parade has already built on this stretch of frontage — its shopfront glass, its signboard
    // and, when the seeded shuffle puts one here, its roller shutter. All of those live at
    // x >= FX - .21, so this wall stands at FX - .32 and buries the lot.
    box(FX - .27, 1.45, OFZ, .10, 2.90, 3.60, col.stoneD, { hard: true, gloss: .30 });
    for (const s of [-1, 1]) {
      pane(box(FX - .66, 1.42, OFZ + s * .68, .05, 2.60, 1.24, col.glassDay,
        { hard: true, mode: 1, gloss: G.glass, tag: '公司' }), .98);
      capsule(FX - .76, 1.20, OFZ + s * .30, .030, .90, .030, col.steel,
        { gloss: G.metal, tag: '公司' });
    }
    // ---- the lobby itself, in the 36 cm between the glass and that back wall. Shallow, but a
    // floor, a ceiling and a lit cove give it a top and a bottom, and depth in a dark interior
    // seen through glass comes from those two planes far more than from the distance between them.
    // The emissive panel this replaces was hung *outside* the glass, which is why it read as a
    // stain on the window rather than as a room.
    box(FX - .475, .015, OFZ, .35, .03, 3.30, C('#26282c'),
      { hard: true, gloss: .70, tag: '公司' });
    box(FX - .475, 2.70, OFZ, .35, .14, 3.40, col.stoneD, { hard: true, gloss: .24, tag: '公司' });
    litten(box(FX - .50, 2.56, OFZ, .26, .05, 3.10, C('#ffe8c2'),
      { hard: true, mode: 1, glow: .05, tag: '公司' }), 1.4);
    box(FX - .46, .022, OFZ, .30, .012, 1.60, C('#1c1e21'),
      { hard: true, gloss: .30, tag: '公司' });                          // the entrance mat
    // The lift, straight in from the door. One lift and not a bank of them: at this depth two
    // would each be half a metre wide and read as lockers. Every layer steps a couple of
    // centimetres toward the glass — surround, then doors, then the shut line — because lower x
    // is nearer the road here, and built the other way round the doors sat inside their own
    // frame and the frame's face hid them completely.
    box(FX - .300, 1.35, OFZ - .65, .05, 2.66, 1.28, col.charcoal,
      { hard: true, gloss: .30, tag: '公司' });
    for (const s of [-1, 1])
      box(FX - .335, 1.08, OFZ - .65 + s * .27, .04, 2.12, .53, col.steel,
        { hard: true, gloss: .56, tag: '公司' });
    box(FX - .355, 1.08, OFZ - .65, .02, 2.12, .02, col.charcoal,
      { hard: true, gloss: .30, tag: '公司' });
    litten(box(FX - .345, 2.40, OFZ - .65, .04, .18, .34, C('#f4b95e'),
      { hard: true, mode: 1, glow: .12, tag: '公司' }), 1.0);
    // The floor the lift is showing, over its door. It is the same 四层 that is on the plate
    // outside, which is the only reason to put a number there at all.
    for (const g of B.glyphs(FX - .370, 2.40, OFZ - .65, -Math.PI / 2, '4',
        { size: .12, gap: 0, color: C('#2a1c08'), mode: 1, lift: .006, tag: '公司' }))
      litten(g, .3);
    box(FX - .350, 1.05, OFZ - .05, .04, .30, .10, col.steelD,
      { hard: true, gloss: .40, tag: '公司' });                          // the call plate
    // Two turnstile pedestals, which is what is actually inside the door of every office block in
    // the city and the one piece of lobby furniture shallow enough to fit here honestly.
    for (const oz of [.95, 1.55]) {
      box(FX - .46, .50, OFZ + oz, .30, 1.00, .26, col.charcoal,
        { hard: true, gloss: .34, tag: '公司' });
      box(FX - .46, 1.02, OFZ + oz, .32, .05, .28, col.steelD,
        { hard: true, gloss: .50, tag: '公司' });
      litten(box(FX - .46, 1.05, OFZ + oz, .12, .02, .14, C('#7fe0a0'),
        { hard: true, mode: 1, glow: .10, tag: '公司' }), .9);
    }
    // The tenant board between the lift and the barriers. Four floors of company names, of which
    // one is the company the player works for.
    box(FX - .32, 1.55, OFZ + .42, .04, .74, .40, col.charcoal,
      { hard: true, gloss: .34, tag: '公司' });
    for (const [k, row] of [[0, '四层 文化传媒'], [1, '三层 律师'], [2, '二层 会计']])
      B.glyphs(FX - .345, 1.76 - k * .21, OFZ + .42, -Math.PI / 2, row,
        { size: .052, gap: .008, color: col.cream, mode: 1, lift: .006, tag: '公司' });
    for (const oz of [-1.42, -.06, 1.42])
      box(FX - .68, 1.42, OFZ + oz, .09, 2.68, .12, col.steel, { hard: true, gloss: G.metal });
    box(FX - .70, 2.86, OFZ, .14, .22, 3.00, col.steelD, { hard: true, gloss: G.metal });
    // the company's plate beside the door, and the floor it is on
    box(FX - .68, 1.72, OFZ - 1.98, .06, .58, .46, col.steelD, { hard: true, gloss: .44 });
    glyphs(FX - .72, 1.84, OFZ - 1.98, -Math.PI / 2, '文化传媒',
      { size: .10, gap: .01, color: col.cream, mode: 1, vertical: true, tag: '公司' });
    glyphs(FX - .72, 1.52, OFZ - 1.98, -Math.PI / 2, '四层',
      { size: .09, gap: .02, color: col.steel, mode: 1, tag: '公司' });
    // The sign has to face -x, down the road, and signBoard only ever builds them facing ±z,
    // so this one is made by hand: a tall panel with the name running down it.
    box(FX - .82, 5.35, OFZ, .30, 2.80, .90, col.blueSign, { hard: true, gloss: .30 });
    box(FX - .70, 5.35, OFZ, .18, 2.80, .30, col.steelD, { hard: true, gloss: G.metal });
    for (const g of B.glyphs(FX - .98, 5.35, OFZ, -Math.PI / 2, '文化传媒',
        { size: .40, gap: .18, vertical: true, color: col.white, mode: 1, glow: .10 }))
      litten(g, .85);
    solid(FX - .95, FX, OFZ - 1.85, OFZ + 1.85);
    // Keep the camera out of the vestibule as well as the body. The general far-side blocker only
    // starts at FX, so before the surround was opened up an orbit that swung round behind the
    // player at this door put the eye inside a block of granite; now it would put the eye inside
    // the lobby, looking out through the back of its own walls, which are single-sided. Capped at
    // 4.2 m so a high camera can still see over the frontage.
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
    metroMouth(38.70, -5.20, '商务区');
    thing('公司', FX - .80, 3.20, OFZ, '我在一家小公司上班，四层。',
      'I work at a small company, on the fourth floor.',
      '公 public + 司 to manage. 上班 is to go to work, 下班 to knock off.',
      { focus: [FX - 2.0, OFZ], reach: 2.6 });

    // a billboard standing on the roofline, facing the road
    for (const s of [-1, 1])
      box(FX + 1.0, 15.0, 8.0 + s * 5.6, .40, 6.0, .40, col.charcoal, { hard: true, gloss: .3 });
    box(FX + .90, 20.4, 8.0, .50, 5.4, 13.0, col.charcoal, { hard: true, gloss: .3 });
    litten(box(FX + .60, 20.4, 8.0, .12, 4.7, 12.2, C('#dfe6ea'),
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
    box(FX + .52, 19.70, 4.30, .06, .95, 1.58, col.cream, { hard: true, mode: 1 });
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
        { hard: true, mode: 1, glow: .10 }), .9);
    }

    // ---- the corner block that closes the east end of the alley, and plain masses filling
    // the near side of the road beyond it. Without them the pavement ran off into open ground.
    const czb = -3.05;
    // Its former 16 m depth overlapped the fire station's north wing by five metres. End it at
    // the shared party line instead of leaving two complete buildings in the same volume.
    const czSouth = -14.40, czDepth = czb - czSouth, czMid = (czb + czSouth) / 2;
    box(17.6, 7.6, czMid, 11.4, 15.2, czDepth, col.render, { hard: true, mode: 14, gloss: G.paint, ...RENDER });
    box(17.8, .70, czb - .04, 11.7, 1.40, .34, col.brick, { hard: true, mode: 11, gloss: G.matte, ...BRICK });
    box(17.8, 15.7, czMid, 11.9, .56, czDepth + .2, col.renderD, { hard: true, gloss: G.paint });
    blocker(12.0, 23.4, czSouth, czb, 15.2);
    solid(12.0, 23.4, czSouth, czb + .10);
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
    // The former anonymous south mass is now the authored fire station. Preserve the 32 random
    // draws from its old window grid so removing the placeholder does not re-deal later scenery.
    for (let i = 0; i < 32; i++) rnd();
    for (const [mz, md] of [[26, 34]]) {
      box(16.7, 7.0, mz, 13.0, 14.0, md, col.renderD, { hard: true, mode: 14, gloss: G.paint, ...RENDER });
      blocker(10.5, 23.2, mz - md / 2, mz + md / 2, 14.0);
      solid(10.5, 23.2, mz - md / 2, mz + md / 2);
      for (let f = 0; f < 4; f++) for (let i = 0; i < 8; i++)
        pane(box(23.1, 3.4 + f * 3.0, mz - md / 2 + 2.4 + i * ((md - 4.8) / 7), .12, 1.5, 2.0,
          col.glassDay, { hard: true, mode: 1 }), rnd(), true);
    }
    // and one continuous stop so the eye can never slip past the far building line
    // Cut at the lane's mouth. js/street-lane.js builds its own side blocks and its own end, so
    // the stop that keeps the eye from slipping past the far building line is not needed there —
    // and left whole it would have stood across the entrance.
    for (const [bz0, bz1] of [[-70, -12.60], [-5.80, 70]])
      blocker(FX, FX + 40, bz0, bz1, 15.5);

    // ---- the middle distance. Without this the built district simply stops and the ground
    // runs out to the horizon as a bare plain, which is the one thing that gives the whole
    // illusion away. These are plain masses: at eighty metres and half-lost in smog, that is
    // all a city block is.
    for (let i = 0; i < 44; i++) {
      const a = -1.15 + i * .052 + rnd() * .02;
      const dist = 52 + rnd() * 105;
      const bx = Math.sin(a) * dist * 1.05 + 46, bz = Math.cos(a) * dist * .6 + 30;
      const bh = 9 + rnd() * rnd() * 34, bw = 16 + rnd() * 26;
      const bd = bw * (.6 + rnd() * .7);
      box(bx, bh / 2, bz, bw, bh, bd, col.renderD,
        { hard: true, mode: 14, gloss: .18 });
      const rows = Math.max(2, Math.floor(bh / 3.4));
      // Window bands sit on the face, which means measuring off the block's own depth. Taken
      // off its width they were buried inside most blocks and floated free of the rest.
      for (let r = 1; r < rows; r++)
        pane(box(bx, r * (bh / rows) + 1.1, bz - bd / 2 + .04, bw * .84, 1.5, .3,
          col.glassDay, { hard: true, mode: 1 }), rnd() > .5 ? .9 : 0, true);
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
      flat(px, .012, pz, pw * .72, pd * .72, C('#2f343a'), { gloss: .95 });
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

    // ---- 报刊亭: the newsstand kiosk near the mouth of the alley
    const kx2 = 20.8, kz2 = -2.05;
    box(kx2, 1.10, kz2, 2.10, 2.20, 1.30, C('#2f6f5e'), { hard: true, gloss: .30 });
    box(kx2, 2.30, kz2, 2.40, .16, 1.60, col.tileD,
      { hard: true, mode: 13, gloss: .22, ...RTILE });
    box(kx2, 2.46, kz2 + .10, 2.30, .18, 1.30, C('#2f6f5e'), { hard: true, gloss: .28 });
    box(kx2, 1.42, kz2 + .66, 1.62, 1.00, .06, col.charcoal, { hard: true, gloss: .30 });
    box(kx2, .78, kz2 + .70, 1.70, .16, .30, C('#245a4c'), { hard: true, gloss: .28 });
    signBoard(kx2, 2.02, kz2 + .62, 1.60, .34, C('#245a4c'), col.paintY, '报刊亭', 1, .7);
    // The stock. These were six coloured rectangles lying on their sides — landscape, which no
    // magazine has ever been — and blank, on the one prop in the district that exists to sell
    // print. They stand portrait now with a masthead on each, and the covers below the fold are
    // the second thing on this street after the shop parade that is worth stopping to read.
    const MASTS = ['读者', '时尚', '汽车', '体育', '故事', '中国'];
    for (let i = 0; i < 6; i++) {
      const mx = kx2 - .58 + (i % 3) * .58, my = 1.06 + ((i / 3) | 0) * .44;
      const mc = [col.plastic, col.paintY, col.blue, col.cream, col.teal, col.redL][i];
      box(mx, my, kz2 + .80, .30, .40, .04, mc, { hard: true, gloss: .22 });
      // A pale band across the top for the masthead to sit on. Ink straight onto a mid-blue or
      // a mid-green cover disappeared; every real cover puts its name on white or on a block.
      box(mx, my + .145, kz2 + .823, .28, .09, .006, col.cream, { hard: true, gloss: .16 });
      B.glyphs(mx, my + .145, kz2 + .828, 0, MASTS[i],
        { size: .066, gap: .008, color: i === 3 ? col.blueSign : col.redD,
          gloss: .10, lift: .005 });
      // Two ruled bands lower down, standing in for the cover lines. Glyphs at that size came out
      // as grey fur and cost eight quads a cover.
      for (let k = 0; k < 2; k++)
        box(mx - .04, my - .06 - k * .07, kz2 + .823, .19 - k * .05, .022, .006,
          C('#efe9dc'), { hard: true, gloss: .12 });
    }
    // Folded newspapers on the counter, weighted down with a length of pipe, which is how every
    // one of these keeps its stock from going down the alley in the wind. No mastheads on these:
    // `glyphs` always stands its quads up, so writing on a surface lying flat is edge-on to the
    // camera and invisible. The two papers pegged over the wire above them carry the names.
    for (let i = 0; i < 3; i++) {
      const px3 = kx2 - .52 + i * .52;
      box(px3, .885, kz2 + .70, .46, .05, .32, C('#d8d2c2'),
        { hard: true, gloss: .10, ry: (i - 1) * .06 });
      box(px3, .922, kz2 + .70, .44, .03, .30, C('#cfc8b6'),
        { hard: true, gloss: .10, ry: (i - 1) * .06 });
    }
    capsule(kx2, .95, kz2 + .58, .012, 1.50, .012, col.steelD,
      { rz: Math.PI / 2, gloss: G.metal });
    // Two papers pegged to the front lip of the counter, hanging down its face. Below the counter
    // rather than above it, because everything above is display board and magazine: hung there
    // they were 10 cm behind the covers and the covers hid them completely.
    for (const [ox, name] of [[-.44, '北京日报'], [.46, '晚报']]) {
      box(kx2 + ox, .42, kz2 + .82, .52, .46, .012, C('#d8d2c2'),
        { hard: true, gloss: .08, ry: ox * .1 });
      B.glyphs(kx2 + ox, .55, kz2 + .828, 0, name,
        { size: .085, gap: .012, color: col.charcoal, gloss: .06, lift: .005 });
      for (let k = 0; k < 3; k++)
        box(kx2 + ox, .38 - k * .075, kz2 + .827, .42 - k * .06, .022, .006,
          C('#c2bcaa'), { hard: true, gloss: .06 });
      for (const t of [-1, 1])
        box(kx2 + ox + t * .18, .65, kz2 + .825, .04, .06, .03, col.plastic,
          { hard: true, gloss: .30 });
    }
    solid(kx2 - 1.2, kx2 + 1.2, kz2 - .75, kz2 + .85);
    shade(kx2, kz2 + .1, 2.8, 2.0, .40);

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
        const p = ball(sx2 + (i - 1) * .12, .30 + i * .34, sz2, .26 - i * .05, .20, .26 - i * .05,
          C('#e8e6e0'), { mode: 1, alpha: .13 - i * .035 });
        // The pair at x -13 are drain covers and steam all day; the pair by the stall belong to
        // the steamers and knock off with them.
        steam.push({ p, x: sx2 + (i - 1) * .12, y0: .30, z: sz2, stall: sx2 > 0,
                     r: .26 - i * .05, a0: .13 - i * .035, phase: i / 3 });
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
    // A `cyl` stands on its axis, so a wheel leant against a wall needs rx: a quarter turn
    // puts the disc in the x-y plane, facing the alley. Without it the spare tyres hung on
    // the wall as flat black bars.
    cyl(rx0 - 2.15, .35, ez + .34, .34, .05, col.black,
      { rx: Math.PI / 2 - .12, rz: .10, gloss: .26 });
    cyl(rx0 - 2.15, .35, ez + .37, .22, .02, col.steel,
      { rx: Math.PI / 2 - .12, rz: .10, gloss: G.metal });
    for (const [tx, ty] of [[rx0 - 2.30, 1.42], [rx0 - 2.30, 2.02], [rx0 - 1.86, 1.72]]) {
      cyl(tx, ty, ez + .22, .30, .06, col.black, { rx: Math.PI / 2, gloss: .24 });
      cyl(tx, ty, ez + .24, .17, .03, col.charcoal, { rx: Math.PI / 2, gloss: .22 });
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
    scooter(-24.6, SZ - .55, Math.PI * .9, C('#4a6f5a'), null);
    scooter(24.6, -2.00, .06, col.frame, C('#6b4f8f'));
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
    const CABBAGE = [C('#c3cc9a'), C('#b7c48c'), C('#cad3a4')];
    for (let i = 0; i < 14; i++) {
      const r = (i / 5) | 0, c = i % 5;
      ball(-24.60 + c * .30, .14 + r * .24, CWZ - .62 + (r % 2) * .06,
        .155, .12, .17, CABBAGE[i % 3],
        { gloss: .18, ry: i * .7, tag: '白菜' });
    }
    thing('白菜', -24.00, .70, CWZ - .62, '冬天大家都买很多白菜。',
      'Everyone buys a lot of cabbage for the winter.',
      '白 white + 菜 vegetable. 大白菜 is the Beijing winter staple.',
      { focus: [-24.00, CWZ - 2.0], reach: 2.0 });
    // the trike it came on
    // The stack and its trike move west with the repair pitch — 大白菜 against a courtyard wall
    // for the winter is the residential half's image, not the shopping end's.
    const tx0 = -22.00, tz0 = CWZ - .95;
    box(tx0, .52, tz0, 1.60, .12, 1.00, col.trunkL, { hard: true, gloss: G.wood });
    for (const t of [-1, 1])
      box(tx0, .68, tz0 + t * .48, 1.60, .34, .06, col.trunkL, { hard: true, gloss: G.wood });
    box(tx0 - .95, .60, tz0, .34, .60, .34, col.charcoal, { hard: true, gloss: .30 });
    capsule(tx0 - .98, .98, tz0, .028, .52, .028, col.steel, { rz: Math.PI / 2, gloss: G.metal });
    for (const [ox, oz] of [[-1.05, 0], [.55, -.48], [.55, .48]])
      cyl(tx0 + ox, .30, tz0 + oz, .58, .09, col.black, { rx: Math.PI / 2, gloss: .26 });
    for (let i = 0; i < 8; i++)
      ball(tx0 - .55 + (i % 4) * .38, .74 + ((i / 4) | 0) * .22, tz0 + ((i % 2) ? .18 : -.18),
        .16, .13, .18, CABBAGE[(i + 1) % 3], { gloss: .18, ry: i, tag: '白菜' });
    solid(tx0 - 1.3, tx0 + .9, tz0 - .6, tz0 + .6);
    shade(tx0, tz0, 3.0, 1.6, .30);

    // ---- services on the face of the block: meters, the gas riser, a hose reel, a hydrant
    // The cabinet that used to sit at -6.6 is gone: the noodle shop's frontage is there now.
    // The two western risers moved out of the lock-up terrace js/street-alley.js stands on this
    // face (-14.90 .. -9.52): -14.2 was behind 修鞋配钥匙 and -10.9 was inside 打印复印, pipe
    // through shutter, and a 6.2 m capsule inside a housing is invisible from every angle there
    // is. -16.28 is the block's west corner, 6 cm clear of the wallJunk in front of it; -2.30 is
    // the pier between the noodle shop and the 单元门, which is where a riser goes anyway.
    for (const [mx, kind] of [[-2.30, 1], [11.4, 0], [15.6, 1], [-16.28, 1]]) {
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

    // ---- 快递 the day's parcels, stacked by the stairwell where the courier leaves them
    for (const [px2, py2, pw2, ph2, pd2, pr] of [
        [-3.62, .17, .52, .34, .40, .10], [-3.58, .49, .46, .30, .36, -.22],
        [-3.20, .15, .38, .30, .32, .40], [-3.70, .76, .34, .24, .30, .18],
        [-3.16, .43, .34, .26, .28, -.35]]) {
      box(px2, py2, ez + .52, pw2, ph2, pd2, col.canvas,
        { hard: true, gloss: .16, ry: pr, tag: '快递' });
      box(px2, py2 + ph2 / 2 + .002, ez + .52, pw2 * .30, .01, pd2 + .01, C('#b8a88c'),
        { hard: true, ry: pr, tag: '快递' });
    }
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
      flat(ax, .009, az, aw - .30, ad - .24, C('#867f70'),
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
    box(-19.4, 2.34, -2.32, .78, .40, .05, col.blueSign, { hard: true, gloss: .34 });
    B.glyphs(-19.4, 2.34, -2.28, 0, '公厕',
      { size: .28, gap: .08, color: col.white, mode: 1, lift: .008 });
    box(-19.4, 2.02, -2.32, .78, .26, .05, col.white, { hard: true, gloss: .30 });
    // the arrow: a shaft and two barbs, which reads at a distance where a triangle does not
    box(-19.34, 2.02, -2.285, .46, .07, .02, col.blueSign, { hard: true });
    for (const t of [-1, 1])
      box(-19.58, 2.02 + t * .05, -2.285, .16, .07, .02, col.blueSign,
        { hard: true, rz: -t * .72 });
    // The 公厕 itself: a low grey-brick block with a tiled pitch, tucked against the boundary wall
    // on the far side of the dead-end square. That is where these are — never on the alley itself,
    // always round a corner in whatever widening the lane happens to have — and the square was the
    // only piece of ground in the district with room for one. It carries the verb that is already
    // in the game for the Bund's toilets, so the hutong finally has somewhere to go that is not
    // your own flat.
    const PTX = -27.20, PTZ = 6.15, PT = { tag: '公共厕所' };
    box(PTX, 1.45, PTZ, 4.00, 2.90, 2.00, col.brick,
      { hard: true, mode: 11, gloss: G.matte, ...BRICK, ...PT });
    tileRoof(PTX, PTZ, 4.30, 2.30, 2.90, .55);
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
      box(PTX + ox, 1.02, PTZ - .96, .88, 2.00, .12, C('#191c20'),
        { hard: true, gloss: .12, ...PT });
      // A concrete threshold you step over, and two floor strips receding behind it, narrower and
      // darker as they go. There are only 14 cm between the front of the jambs and the front of that
      // dark box, so the depth cue has to be the step and the taper rather than any real distance —
      // the same trick, and the same constraint, as the subway steps down the road.
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
      B.glyphs(PTX + ox, 2.44, PTZ - 1.14, 0, ch,
        { size: .28, gap: 0, color: pc, mode: 1, lift: .008, ...PT });
    }
    // The sign over the middle, lit like the rest of the district's signage.
    box(PTX, 2.44, PTZ - 1.06, 1.50, .44, .10, col.blueSign,
      { hard: true, gloss: .28, ...PT });
    for (const g of B.glyphs(PTX, 2.44, PTZ - 1.13, 0, '公共厕所',
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
    box(PTX + 1.78, .44, PTZ - 1.26, .44, .88, .40, col.tarp, { hard: true, gloss: .30 });
    box(PTX + 1.78, .91, PTZ - 1.26, .48, .08, .44, col.charcoal, { hard: true, gloss: .30 });
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
      box(tx, th / 2, tz, tw, th, tw * .8, shell,
        { hard: true, mode: 14, gloss: .2 });
      if (rnd() > .5) box(tx, th + 3, tz, tw * .55, 6, tw * .45, shell,
        { hard: true, gloss: .2 });
      // window grid, dense enough to read as a tower at this distance
      const rows = Math.min(26, Math.floor(th / 4.4));
      for (let r = 1; r < rows; r++) {
        pane(box(tx, r * (th / rows) + 1.4, tz - tw * .41, tw * .82, 2.2, .3,
          col.glassDay, { hard: true, mode: 1 }), rnd() > .45 ? .9 : 0, true);
        // the pale spandrel between floors, which is what gives a tower its banding
        box(tx, r * (th / rows) + 3.0, tz - tw * .40, tw * .84, 1.5, .26,
          band, { hard: true, gloss: .24 });
      }
    }
    // one tapered landmark, so the skyline has a shape you recognise
    const zx = 96, zz = 78;
    for (let i = 0; i < 7; i++) {
      const f = i / 7, w = 30 - f * 11 + f * f * 7;
      box(zx, 14 + i * 28, zz, w, 28, w * .9, col.blue,
        { hard: true, mode: 14, gloss: .3 });
    }
    // The name, up in the crown. This is the one building on the skyline the eye goes to and it was
    // anonymous, which for a district whose whole subject is reading what is written on it is a
    // strange omission — the towers on the horizon are the largest characters available.
    //
    // On both visible faces. The player is roughly south-west of it, so the -x and -z elevations are
    // each about 44 degrees off, and a run on one face only was legible from half the district. No
    // backing panel: the characters are mounted straight onto the shell, which is how these are done
    // and which also stops a corner-mounted slab from floating clear of the building.
    for (const [gx, gz, gy] of [[zx, zz - 12.2, Math.PI], [zx - 13.4, zz, -Math.PI / 2]])
      for (const g of B.glyphs(gx, 172, gz, gy, '国贸中心',
          { size: 5.6, gap: 1.1, vertical: true, color: C('#e8eef2'),
            mode: 1, glow: .10, lift: .35 })) litten(g, .95);
    litten(box(zx, 200, zz, 6, 8, 6, C('#ff6a4a'), { hard: true, mode: 1, glow: .4 }), 1.0);
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
  //   x  -27.0 .. 25.5   the alley           x 27.5 .. 37.5  the carriageway
  //   x  -32.2 .. -25.0  the west courtyard  x 41.0          far pavement edge
  //   z  -2.35 .. 3.35   the walkable band   northbound lanes are EAST of (RD0+RD1)/2
  //
  // Named `S`, not `SHOP` — `SHOP` is already the x of the 超市 shopfront, forty lines up. That
  // collision is exactly the kind of thing the district contract exists to stop happening again.
  const S = {
    // the builders, straight off the shell's own scene
    box, cyl, ball, taper, flat, glyphs, solid, blocker, glow, thing,
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
    AX0, AX1, AZ, SZ, NB, DOOR, RD0, RD1, SW1, SHOPX: SHOP,
    // The shopfront datum, so a district never picks a sign height by eye. See the block comment
    // where these are declared for the clear bands they come out of.
    FASCIA, FASCIAH, BLADE, BLADEH,
    get PHARMACY_OUT() { return PHARMACY_OUT; },
    // The road's own numbers, so traffic and cycles agree without measuring — and these are now
    // MEASURED off the paint rather than derived from the centre line, because the derived ones
    // were wrong and two districts built against them.
    //
    // `mid ± 2.6` gave south 29.90 and north 35.10. The road district then measured the shell:
    // 9.84 m clear between kerb faces, laid out as a 支路 — a bike lane each side and one motor
    // lane each way. 29.90 is *inside the west bike lane*, and 35.10 is a lane LINE, not a centre.
    // A car driven down either is a car in a bike lane, which is exactly what the five static cars
    // this street shipped with were doing.
    //
    //   27.80–30.20  西侧非机动车道      30.20–32.50  南行 (travelling +z)
    //   32.50–35.10  北行 (travelling -z) 35.10–37.42  东侧非机动车道
    road: { z0: -13.5, z1: 13.5, mid: (RD0 + RD1) / 2,
            north: 33.80, south: 31.35, bikeW: 29.00, bikeE: 36.26,
            // kept so anything written against the old names still runs, pointing at the real lanes
            get lanes() { return { bikeW: 29.00, south: 31.35, north: 33.80, bikeE: 36.26 }; } },
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
        if (b.wasFlying) { b.parts.forEach((p, i) => { p.m = b.m0[i]; }); b.wasFlying = false; }
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
      b.parts.forEach((p, i) => { p.m = M.mul(pivot, b.m0[i]); });
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
        p.m = m;
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
      { id: 'road',  x0: 24.0, x1: SW1 - 1.2, z0: -13.5, z1: 13.5, light: [RD0 - 1.9, 6.2, 5.0] },
      // Hospital-side pavement only. It overlaps the road zone by 70 cm at the south end so the
      // two are genuinely connected after clampMove spends the 30 cm body radius on each edge.
      // Stopping at the west kerb preserves the controlled crossing: this is not a second road.
      { id: 'hospital-road', x0: 23.2, x1: RD0 - .1, z0: 12.8, z1: 42.8,
        light: [25.3, 5.0, 24.0] },
      // The fire-station module publishes its connected public apron after it builds.
      ...(S.FIRE_ZONE ? [S.FIRE_ZONE] : []),
      // street-hotel.js extends the east pavement north of the hypermarket. Kept in that module's
      // coordinate contract so the arrival court and its walkable boundary cannot drift apart.
      ...(S.HOTEL_ZONE ? [S.HOTEL_ZONE] : []),
      // js/street-lane.js's 步行街, published the same way. It overlaps the road zone at
      // x 39.30..39.80 so the two are genuinely connected after clampMove takes the body radius.
      ...(S.LANE_ZONE ? [S.LANE_ZONE] : []),
    ],
    roomAt(x, z, prev) {
      const zs = this.zones;
      const fireZone=zs.find(q=>q.id==='fire-station-front');
      if(fireZone&&x>=fireZone.x0&&x<=fireZone.x1&&z>=fireZone.z0&&z<=fireZone.z1)
        return fireZone;
      const hotelZone=zs.find(q=>q.id==='hotel-forecourt');
      if(hotelZone&&x>=hotelZone.x0&&x<=hotelZone.x1&&z>=hotelZone.z0&&z<=hotelZone.z1)
        return hotelZone;
      if (z > 12.8 && x > 23.0 && x < RD0) return zs[3];
      if (x > 24.6) return zs[2];
      if (x < -26.2) return zs[1];
      return zs[0];
    },
  });
});
