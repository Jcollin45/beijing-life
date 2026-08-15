// 客舱 — inside the aeroplane, at 10,000 metres.
//
// Every other vehicle in this game is a way of getting somewhere that you sit through. This one is
// the destination for the better part of an hour of play: you board it, find the seat printed on
// your card, put the belt on because somebody comes down the aisle and checks, listen to the flight
// deck read the safety briefing in Chinese, and are offered something to eat halfway. The flight
// used to be a line of toast and a jump cut. It is a room now.
//
// The layout is a widebody premium cabin: two-three-two, seven abreast, six rows, twin aisles. That
// is a deliberate choice and not the cheapest one — a narrowbody three-three would have been two
// seat blocks instead of three and one aisle instead of two — but 2-3-2 is what the reference is,
// and more to the point twin aisles are what let a trolley and a player pass each other, which the
// snack service needs.
//
// Widths, and why they are not to scale. Seven seats at 0.52 and two aisles at 1.48 make 6.60 m
// across, where the real cabin this is drawn from is about 5.5 and its aisles are 0.50. The seats
// are honest; the aisles are three times over.
//
// That is not laziness, it is the camera. `clampMove` insets a zone by the body radius of 0.30 at
// each side, so a scale 0.50 aisle leaves nothing at all to walk in — but walking is the easy half.
// The view is third person, over the shoulder, and in a 1.03 m aisle between seat backs 1.4 m tall
// the camera spends the whole flight inside the upholstery: the first version of this cabin was
// built at 1.03 and the player's own back filled two thirds of the frame. At 1.48 there is 0.88 m
// of clear floor after the body radius and enough room behind the shoulder to see the cabin the
// seats are in. `train.js` widens its centre aisle beyond scale for the same reason and says so.
//
// Forward is -z. The seats face it, the bulkhead and the galley curtains close the front of the
// cabin, and the rear galley is at +z where you come in. Which means the view down the cabin from
// the spawn point is the view in the reference photograph: six rows of seat backs, the bulkhead
// beyond them, and the curtains either side of it.
const Cabin = Lazy('Cabin', () => {
  const col = {
    // Upholstery. Three tones and a highlight, because a seat is a dark crown, a gold shell and a
    // grey-brown pan, and dropping any one of them turns forty-two seats into forty-two boxes.
    crown: C('#4a3b2f'), crownL: C('#5d4b3c'),
    // Your own seat. Blue, and specifically not the jade it was first drawn in: the player's own
    // shirt is teal, they stand in the middle of the frame filling a third of it, and a jade seat
    // behind a teal back is not a landmark, it is camouflage. Blue against a cabin of golds and
    // browns is the one hue in here that belongs to nothing else.
    mineShell: C('#3a6ea8'), mineMark: C('#8ccdff'),
    shell: C('#8e7448'), shellL: C('#c2a473'), shellD: C('#5f4d30'),
    pan: C('#6f665a'), panL: C('#847a6c'),
    arm: C('#9a8a6e'), armD: C('#6d6151'),
    // The cabin itself: warm off-white everywhere, which is what makes the gold read as gold.
    // Warm off-white, a step down from where these started. The cabin is lit by a cove running its
    // whole length and these surfaces are the ones facing it, so at #d9d0bf and #ddd4c3 the port
    // wall and the bin above it clipped to flat white and the entire left half of the frame lost
    // every edge it had. Still reads as a cream cabin; it just leaves the highlights room to go.
    panel: C('#c6bda9'), panelD: C('#a89f8d'), ceil: C('#d5cdba'), ceilD: C('#bab2a0'),
    bin: C('#cbc1ad'), binD: C('#a49c8b'), trim: C('#bab3a7'),
    // A dark blue carpet with a lighter figure in it. The reference has a patterned navy floor and
    // it is most of why the cabin reads as warm — there is a cool note under all that gold.
    // The figure in the carpet is two shades up from the ground, not five. At #2f3a56 against
    // #263049 the pattern read as pale panels lying on the floor rather than as a weave.
    carpet: C('#252e44'), carpetL: C('#2a3450'),
    curtain: C('#4b4139'), curtainD: C('#39312a'),
    steel: C('#b0a99e'), chrome: C('#ddd7cc'), black: C('#1b1c1f'), charcoal: C('#2e3238'),
    glass: C('#bed4e4'), sky: C('#a8c8e2'), skyHi: C('#cfe2f0'), cloud: C('#f2f6fa'),
    // What is under the aeroplane. Three of them, because it is three different things at three
    // points in the flight: concrete while you are on it, farmland once you are off it, and the
    // washed-out nothing of ground seen through six kilometres of haze on the way up.
    ground: C('#6d7a63'), groundD: C('#55604c'), apron: C('#8d8e88'), apronD: C('#75766f'),
    // The sky gets deeper as you climb, which is the one thing everybody has noticed out of a window.
    skyHigh: C('#5f8fc4'),
    // And at night it is none of those. 21:15 to Bangkok is a different aeroplane from 08:20 to
    // Shanghai and the room had no idea what time it was.
    skyNight: C('#0a1020'), groundNight: C('#0d1219'), star: C('#dfe8f6'),
    // A city from six kilometres up: sodium, not white.
    cityLight: C('#ffcf85'),
    // The lights on the outside of the aeroplane. The beacon is the red one that turns, the strobe is
    // the white one that cracks twice a second and is the brightest thing on the airframe.
    beacon: C('#ff3b28'), strobe: C('#ffffff'),
    // 情景照明. Mood lighting, which is the single thing that makes a modern cabin look like one: the
    // ceiling is washed a different colour at each part of the flight. Boarding is cool blue, the
    // climb is neutral, the meal is warm, the approach is a sunrise, and a night cruise is deep
    // indigo with the screens the only other light in the room.
    // Boarding and night are allowed to be colours; the two daytime ones are barely tinted whites.
    // At #ffcf8e the cruise wash turned three square metres of cream ceiling to mud — a washed ceiling
    // at cruise is a warm white, and the mood lighting earns its keep at the ends of the range.
    moodBoard: C('#4a7fc0'), moodClimb: C('#f0e8da'), moodCruise: C('#ffeedb'),
    moodDescend: C('#ffb98c'), moodNight: C('#2036a8'),
    // A headrest cover, which is the one detail that stops a row of seats reading as brown boxes.
    antimacassar: C('#e8e2d2'),
    green: C('#3fae6a'), amber: C('#e0a847'), red: C('#b2402d'), lit: C('#ffeec4'),
    // An idle IFE screen is a dark panel with a backlight behind it, not a lit blue rectangle.
    // At #16203a emissive these were the brightest thing in the cabin and forty-two of them read
    // as a wall of televisions; a powered screen with nothing on it is nearly black.
    screen: C('#0d1220'), screenOn: C('#1d2f4d'),
    white: C('#f4f1e9'), cream: C('#e9e2d2'), tray: C('#8d7f66'),
  };
  const G = { matte: .06, paint: .16, metal: .56, glass: .78, fabric: .05 };
  // ---- surface. `mat` names a tiling photograph read triplanar in world space (js/assets.js),
  // `matScale` is one repeat in metres and `matAmt` is how far it may move the colour underneath.
  //
  // Four of them, because an aeroplane interior really is only four surfaces: upholstery, moulded
  // panel, carpet and bare metal. Named rather than written out at each call for the same reason
  // `col` is: a cabin whose seats are two different fabrics because one call got a different
  // number is a fault nobody would ever find by reading.
  //
  // The scales are what the thing physically is. Seat cloth repeats every 26 cm, which is about
  // the width of the weave on an economy cushion, and carpet pile every 30. A moulded sidewall
  // panel has no pattern at all, so 1.6 m is chosen to be *larger* than most of what it is on —
  // one repeat spread across a whole panel reads as unevenness in the moulding, not as tiling.
  //
  // The amounts are all low and that is the whole discipline of this. Every colour above was
  // argued down to a specific value against a specific reference; a texture at .7 throws that
  // away and repaints the cabin whatever colour the photograph happened to be. These are here to
  // stop ten square metres of cream plastic being a flat fill.
  //
  // The panel amount is the lowest of the four and it was the one that had to be measured rather
  // than reasoned about. The material is a painted plaster with a stipple in it, and at .30 across
  // 2.6 m by 10.4 of ceiling the cabin came out sprayed with artex — a domestic ceiling, and the
  // most confidently wrong thing in the room. At .17 the same photograph reads as the unevenness of
  // a moulded panel, which is what it was wanted for. The rule that came out of it: the bigger the
  // surface, the less of the texture it can take, because a large plane shows you the pattern
  // rather than the grain.
  const SEAT_MAT   = { mat: 'fabric',  matScale: .26, matAmt: .34 };
  const PANEL_MAT  = { mat: 'plaster', matScale: 1.6, matAmt: .17 };
  const CARPET_MAT = { mat: 'fabric',  matScale: .30, matAmt: .24 };
  const METAL_MAT  = { mat: 'metal',   matScale: .34, matAmt: .34 };
  // Nothing emissive gets any of them. A cove, a wash, a belt sign, a screen and the sky outside
  // the glass are all mode 1, which is a colour written straight out with no lighting on it, and a
  // photograph of plaster multiplied into a light source is a dirty light source.

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, flat, glyphs, solid, shade, glow, thing } = B;

  // ---------------------------------------------------------------- dimensions
  const RX = 3.30, RZ = 5.20, H = 2.24;
  // Seven seats across, in three blocks. Written out rather than computed: the numbers are the
  // layout, and a reader should be able to see the two aisles in them.
  const SEATW = .52;
  const COLS = [-3.04, -2.52,   -0.52, 0, 0.52,   2.52, 3.04];
  // Which block each column belongs to, for the colliders and for the walk-out side.
  const BLOCK = [0, 0, 1, 1, 1, 2, 2];
  const AISLE = 1.52;                     // the two aisle centrelines, at ±this
  // The side bins, and their aisle-side edge. Both outboard of the aisle, which runs from 0.78 to
  // 2.26: the first version put the valance at 1.98 and dropped it to y 1.47, so the bin overhung the
  // aisle by 28 cm at below head height. Standing in that aisle you would have hit your head on it,
  // and looking down the cabin it was a ten-metre pale slab forty centimetres from the camera that
  // filled the left half of the frame and hid the seats it was supposed to sit over.
  const BINX = 2.78, BINEDGE = 2.30;
  const ROWZ = [-3.10, -2.16, -1.22, -0.28, .66, 1.60];   // 0.94 pitch, six rows
  const ROW0 = 21;                        // the row number printed on the first one
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const BULK = -4.10;                     // the bulkhead, ahead of row 1
  const GALLEY = 3.05;                    // the rear galley wall, behind the last row

  // Things the tick moves.
  const litProps = [], pools = [];
  // Seeded, like every other random in this project: a flight should be turbulent in the same places
  // every time it is flown, or a bug in the shake is a bug nobody can reproduce.
  let seed = 0x5f3a19;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const skyPanes = [], clouds = [], wingProps = [];
  // The ground out of the window, the things on it that make its motion visible, the shades over the
  // panes, and the two rows of characters on the bulkhead display.
  const groundPanes = [], groundBits = [], shadeSlats = [];
  // Night: stars above the haze, a city going past underneath, and the two flashing lights on the
  // wing. `nightK` comes from the game clock — see setNight, which every interior in this game is
  // handed and which this room ignored completely until now.
  const stars = [], cityLights = [], beaconProps = [], strobeProps = [], deckProps = [], rainDrops = [];
  const destinationBits = [];
  const trafficProps = [];
  const DEST_STYLE = {
    '上海':{ color:'#8ca4b8', accent:'#e6b86b', shape:'tower' },
    '广州':{ color:'#83a9a0', accent:'#f0c873', shape:'city' },
    '成都':{ color:'#6f8974', accent:'#c7d7b0', shape:'hills' },
    '海口':{ color:'#4a93a6', accent:'#e6d39a', shape:'ocean' },
    '纽约':{ color:'#7f899a', accent:'#f5c96b', shape:'skyline' },
    '东京':{ color:'#8191a8', accent:'#f2e8da', shape:'mountain' },
    '曼谷':{ color:'#58918b', accent:'#e7bc61', shape:'river' },
  };
  let destStyle = DEST_STYLE['上海'];
  let weatherWet = 0, weatherWind = 0, weatherKind = 'clear';
  // The ceiling wash that carries the mood colour, and the headrest covers.
  const washProps = [], ceilPanels = [];
  // The real lamps, as opposed to the emissive props that stand for them. `coveLights` is the row
  // down the ceiling, `readLight` is the one over your own chair — see `shell` and `setEquipmentAt`.
  // Their colour is written into every frame by the tick, which is where the mood lighting lives.
  const coveLights = [];
  let readLight = null;
  // What a cove is before the mood colour is mixed into it: a warm white, a little under daylight.
  const COVE_LIGHT = [1.00, 0.93, 0.82];
  let nightK = 0;
  // The sky's own two colours for this minute of the day, handed in by the frame loop. Started at the
  // one o'clock values so a room built before the first tick is not black.
  const skyTop = [0.30, 0.52, 0.80], skyLow = [0.62, 0.72, 0.84];
  const infoAlt = [], infoEta = [];
  const beltSigns = [], beltLamps = [], screens = [], readLamps = [], rowTags = [];
  const coveProps = [];
  const curtainLeaves = [];
  // Two galley carts. They were declared here and never built — the trolley round was a crew member
  // walking an empty aisle saying the words — so this is the thing itself: a body on castors with a
  // worktop, a handle, and the drinks and the meal trays on top of it. Two, because a twin-aisle
  // cabin is served by two, and because that is the whole reason this cabin has two aisles.
  const trolleys = [];
  // The patch of light beside your own seat. Built once and moved, and kept out of `pools` so that
  // nothing else dims it.
  let minePool = null;
  function litten(p, k) { litProps.push({ p, k }); return p; }
  function pool(m, c, a) { const g = glow(m, c, a); g.a0 = a; pools.push(g); return g; }

  Glyphs.need('安全带请系好出口紧急舱门救生衣氧气面罩禁止吸烟前方卫生间' +
              '客舱乘务员机长欢迎乘坐航班ABCDEFG0123456789');

  // ---------------------------------------------------------------- the tube
  // A fuselage is a cylinder and a cabin is the flat-floored room inside it, so the walls lean in
  // at the top and the ceiling is a shallow arch. Built as a stepped set of panels rather than a
  // real curve: at the angles this room is ever seen from, five steps a side read as round and cost
  // five draw calls instead of a mesh the renderer has no way to make.
  function shell() {
    // floor, and the figure in the carpet
    // Carpet, on a cloth material rather than on mode 9 alone. Mode 9 is the paving shader and it
    // is kept, because its 62 cm grid is what has been drawing the seam pattern in this floor since
    // it was built; the fabric on top of it is the pile. Two grids at once was the risk and 40 cm
    // against 62 is deliberately not a multiple of it, so they never line up into a single stronger
    // grid — which is exactly what 31 or 62 would have done.
    flat(0, .01, 0, RX * 2, RZ * 2, col.carpet, { mode: 9, gloss: .10, ...CARPET_MAT });
    for (let i = -10; i <= 10; i++)
      for (const s of [-1, 1])
        flat(s * (AISLE + .30), .014, i * .52 + (i % 2 ? .16 : 0), .34, .30, col.carpetL,
          { mode: 9, gloss: .10, ...CARPET_MAT });
    // The aisle runners, a shade lighter where forty thousand people have walked.
    for (const s of [-1, 1])
      flat(s * AISLE, .013, 0, 1.30, RZ * 2, col.carpetL, { mode: 9, gloss: .12, ...CARPET_MAT });

    for (const s of [-1, 1]) {
      // The side wall, in steps, leaning in as it rises.
      // Contiguous, and that is the whole point of writing them out: the first set ran .25-.35 and
      // then .63-1.09, leaving a 28 cm slot the full length of the cabin at shin height through
      // which the wing outside was plainly visible from the aisle.
      //   y span:   0.00-0.40   0.40-1.00   1.00-1.60   1.60-1.96   1.96-2.24
      const STEPS = [[.20, .40, 0], [.70, .60, .02], [1.30, .60, .07],
                     [1.78, .36, .17], [2.10, .28, .34]];
      for (const [y, h, inset] of STEPS)
        box(s * (RX - inset), y, 0, .10, h, RZ * 2, col.panel,
          { hard: true, gloss: G.paint, ...PANEL_MAT });
      // The dado rail above the floor, and the skirting under it.
      box(s * (RX - .04), .60, 0, .13, .05, RZ * 2, col.panelD,
        { hard: true, gloss: .22, ...PANEL_MAT });
      box(s * (RX - .01), .06, 0, .14, .12, RZ * 2, col.panelD,
        { hard: true, gloss: .20, ...PANEL_MAT });
    }
    // The ceiling: a centre panel and two arched flanks, the flanks tilted to meet the bins.
    //
    // Every one of these is a single quad turned over to face the floor, and that is not a saving
    // — it is the contract the camera relies on. Backface culling is on for the whole game, and the
    // camera is allowed to back out through a ceiling on the understanding that the ceiling then
    // culls and you look down into the room. Built as boxes, as these were, the top faces survive:
    // pull the camera back far enough in here, or arrive without the seated camera being applied,
    // and the eye sits a few centimetres above y=H staring at the outside of a lid, which fills the
    // frame with flat pale grey and a diagonal seam where the tilted flank meets the centre panel.
    const ceilPanel = (x, y, w, tilt) => {
      // Its own colour array, so the mood lighting can tint the panel itself rather than only a strip
      // beside it. A washed ceiling is a large area very slightly coloured; tinting one thin light and
      // leaving three square metres of cream next to it fools nobody, which is what the first version
      // of this looked like.
      // Materialled, and it is the single largest area in the room: 2.6 m by 10.4 of one cream
      // value is what the note above about rhythm is really complaining about, and a rib every
      // 90 cm fixes the length of it without doing anything for the plane in between the ribs.
      // Spread rather than written out, so this panel cannot drift away from the walls it meets.
      const p = { mesh: 'quad', color: [...col.ceil], gloss: G.paint, ...PANEL_MAT,
        m: M.mul(M.trans(x, y, 0), M.mul(M.rotZ(tilt + Math.PI), M.scale(w, 1, RZ * 2))) };
      B.props.push(p);
      ceilPanels.push(p);
      return p;
    };
    ceilPanel(0, H, 2.60, 0);
    // Rhythm. The centre panel is 2.6 m by 10.4 and was one uninterrupted cream plane, which is what
    // made the whole room read as flat however good the lighting on it was — train.js records learning
    // the same thing about its own roof. A recessed spine down the middle and a rib every 90 cm give
    // the eye something to measure the length of the cabin against.
    box(0, H - .035, 0, .34, .05, RZ * 2 - .2, col.ceilD,
      { hard: true, gloss: G.paint, ...PANEL_MAT });
    for (let i = -5; i <= 5; i++) {
      box(0, H - .045, i * .94, 2.44, .03, .05, col.ceilD,
        { hard: true, gloss: .12, ...PANEL_MAT });
      // The air-return slots either side of the spine, which is where the rhythm comes from in life.
      for (const s of [-1, 1])
        box(s * .62, H - .05, i * .94 + .47, .30, .02, .10, col.charcoal,
          { hard: true, mode: 1, glow: .01 });
    }
    for (const s of [-1, 1]) {
      ceilPanel(s * 1.94, H - .08, 1.40, s * .22);
      // The cove: a lit slot where the ceiling meets the bin, which is the whole light of the
      // cabin in the reference and the reason the gold looks warm rather than yellow.
      // Dim, for something ten metres long. A cove is a slot of indirect light, not a strip light:
      // at .40 over the full length these two were brighter than the windows and the cabin came out
      // as a white tube. The glow is what the slot itself reads as; the room is lit by the pool.
      const cove = box(s * 1.24, H - .12, 0, .09, .05, RZ * 2 - .3, [...col.lit],
        { hard: true, mode: 1, glow: .11 });
      cove.glow0 = .11;
      coveProps.push(cove);
      litten(cove, .4);
      // And a broad, very dim wash on the ceiling flank above the cove, which is what actually carries
      // the mood colour. The cove is a slot you can see; this is the light coming out of it. Wide and
      // faint on purpose — at cove brightness it would be a second strip light, and what a washed
      // ceiling looks like is a large area barely tinted.
      const wash = box(s * 1.86, H - .055, 0, 1.30, .03, RZ * 2 - .5, [...col.moodCruise],
        { hard: true, mode: 1, glow: .16, rz: s * .22 });
      wash.glow0 = .16;
      washProps.push(wash);
      // ---- and the light itself, which is the thing none of the three above actually are.
      //
      // The cove is an emissive slot: it is bright, and it lights nothing. The wash is a second
      // emissive slab standing for the light coming out of the slot, and it lights nothing either.
      // The pool below is an additive quad painted on the carpet, and it lights nothing. So until
      // now the only reason anything in this cabin was lit at all was the single overhead bulb
      // game.js hangs in the middle of the room and one window's worth of sky — a ten-metre tube
      // lit by one point at the centre of it, which is why the two ends of it went flat.
      //
      // One per row per side. That is twelve, and the renderer takes eight: game.js ranks them by
      // distance to the eye every frame and drops the far ones, which in a tube is exactly right —
      // the four you lose are always the ones at the other end of the cabin behind two rows of
      // headrests. A cove is a continuous slot and twelve points along it is the cheapest honest
      // stand-in for one.
      //
      // Just below and inboard of the slot, so it reaches the ceiling flank above it and the seat
      // crowns and the aisle below it, which is the whole spread of a real cove.
      //
      // The power is small and it is small for a measured reason. Eight of these reach the shader
      // at once and four of them are within a metre and a half of the eye, so they add rather than
      // take turns: at .22 each the near seat backs, the headrest covers and the sidewall all went
      // to flat white and the room lost every edge it had — the same clipping the cove glow and the
      // window panes were each talked down from further up this file. The scene tone-maps at
      // expose .88 and there is no headroom above that to spend.
      for (const z of ROWZ)
        coveLights.push(B.light(s * 1.58, H - .22, z, [...COVE_LIGHT], .12, 2.30));
      // A ten-metre additive quad lying on the floor is nearly edge-on to a camera standing in the
      // aisle, which is the worst case for one: it covers a large part of the frame and adds light
      // to all of it. Kept, because the aisle does need a floor wash, but at half strength.
      pool(M.trs(s * AISLE, .03, 0, 0, 1.6, 1, RZ * 2), C('#ffe9c2'), .018);
    }
  }

  // ---------------------------------------------------------------- 行李架 the overhead bins
  // Two side runs and a centre run, which is the giveaway that this is a widebody: a single-aisle
  // aeroplane has no middle bin because there is nothing under it but the aisle.
  function bins() {
    for (const s of [-1, 1]) {
      // The bin body, leaning out over the seats, and the lid line across its face.
      box(s * BINX, 1.96, 0, 1.04, .50, RZ * 2, col.bin,
        { hard: true, rz: s * .10, gloss: G.paint, ...PANEL_MAT });
      box(s * BINEDGE, 1.86, 0, .18, .38, RZ * 2, col.binD,
        { hard: true, gloss: .20, ...PANEL_MAT });
      // One latch and one lid seam per bay, so the run reads as doors and not as a shelf.
      // The catch and the seam are the two pieces of bare metal on the whole run — everything
      // around them is moulded panel — so they get the metal rather than the plaster, at a repeat
      // small enough that a 6 cm catch gets some of it rather than one flat corner of one tile.
      for (let i = 0; i < 8; i++) {
        const z = -RZ + .70 + i * 1.28;
        box(s * (BINEDGE - .03), 1.94, z, .06, .28, .05, col.binD,
          { hard: true, gloss: .24, ...METAL_MAT, matScale: .11 });
        box(s * (BINEDGE - .06), 1.82, z, .07, .05, 1.20, col.chrome,
          { hard: true, gloss: G.metal, ...METAL_MAT, matAmt: .28 });
      }
      // A run of full-length strips under each seat column used to go here — six boxes ten metres
      // long, one per outboard seat, which from the aisle read as continuous shelving rather than
      // as a service panel and which the centre seat never got at all, because Math.sign(0) is 0
      // and matched neither side. The bin's own edge does the job.
    }
    // The centre bin, squarer than the side runs and sized to the block it hangs over.
    box(0, 1.98, 0, 1.50, .44, RZ * 2 - .6, col.bin,
      { hard: true, gloss: G.paint, ...PANEL_MAT });
    box(0, 1.74, 0, 1.54, .08, RZ * 2 - .6, col.binD, { hard: true, gloss: .20, ...PANEL_MAT });
    for (let i = 0; i < 7; i++)
      box(0, 1.76, -RZ + 1.0 + i * 1.28, .07, .28, .05, col.binD,
        { hard: true, gloss: .24, ...METAL_MAT, matScale: .11 });

    // Reading lights and the 安全带 sign, under the side bins, one cluster per row.
    for (const s of [-1, 1]) for (const z of ROWZ) {
      for (const o of [-.34, 0, .34])
        readLamps.push(box(s * (BINX - .22), 1.705, z + o, .09, .03, .09, col.lit,
          { hard: true, mode: 1, glow: .05 }));
      // The lit belt-and-no-smoking pair. Amber when the belt sign is on.
      const sign = box(s * (BINEDGE - .01), 1.74, z - .30, .05, .12, .26, col.amber,
        { hard: true, mode: 1, glow: .06 });
      beltLamps.push(sign);
    }
  }

  // ---------------------------------------------------------------- 舷窗 the windows
  // Oval, in pairs between the frames, with the sky behind them. `flat` would have been cheaper but
  // a window is a hole with a thickness: the reveal is what makes it read as 8 cm of fuselage
  // rather than a sticker, and it is the one detail that says aeroplane from every seat.
  function windows() {
    // The sky first and the glazing after it. Transparent props still write depth, so glass built
    // before what is behind it deletes what is behind it — the mistake `world.js` records making
    // with its tower block and `train.js` with its tunnel.
    for (const s of [-1, 1]) {
      // Emissive, because there is no sun out here to light them, but only just: these are two
      // slabs ten metres long a few centimetres outside a thin wall, and at .18 they lit the cabin
      // through it. Bright enough to read as daylight in a 25 cm porthole, dim enough not to be the
      // room's light source.
      skyPanes.push(box(s * (RX + .34), 1.28, 0, .06, 1.30, RZ * 2, [...col.sky],
        { hard: true, mode: 1, glow: .07 }));
      // A band of haze along the bottom of the view: the top of the cloud deck, which is what is
      // actually out of a window at cruise. Kept separate so `setView` can drop it on the ground.
      skyPanes.push(box(s * (RX + .33), .82, 0, .05, .34, RZ * 2, [...col.skyHi],
        { hard: true, mode: 1, glow: .09 }));
    }
    // The ground, as its own band below the haze. A window at the gate used to look out on flat grey,
    // which is the one thing an aeroplane window never shows: standing on the apron you see concrete
    // and painted lines going past, on the climb you see a landscape dropping away and draining into
    // haze, and at altitude you see none of it. Separate from the sky and the haze so `setView` can
    // raise the horizon, take the colour out of it, and finally take it away altogether.
    for (const s of [-1, 1]) {
      const p = box(s * (RX + .32), .52, 0, .05, .74, RZ * 2, [...col.apron],
        { hard: true, mode: 1, glow: .06 });
      p.x0 = s * (RX + .32);     // kept, because setView rebuilds this matrix every frame
      groundPanes.push(p);
    }
    // Things standing on it. These are the whole point of the ground band: at the gate nothing moves
    // and the aeroplane is parked, and the instant they start sliding aft the aeroplane is taxiing.
    // Without them the taxi phase was audible and invisible.
    for (let i = 0; i < 18; i++) {
      const s = i % 2 ? 1 : -1, z = -RZ + (i / 18) * RZ * 2;
      const p = box(s * (RX + .30), .26 + (i % 3) * .10, z, .04,
        .12 + (i % 4) * .07, .50 + (i % 5) * .40,
        i % 3 ? [...col.apronD] : [...col.groundD], { hard: true, mode: 1, glow: .05 });
      p.m0 = p.m;
      groundBits.push({ p, s, z0: z });
    }
    // The deck itself, for the seconds you spend inside it: one slab per side filling the whole window
    // band, so the view is white and nothing else. Not a cloud — a cloud has a shape and an edge, and
    // the point of being in one is that there is neither.
    for (const s of [-1, 1]) {
      const p = box(s * (RX + .22), 1.20, 0, .06, 1.80, RZ * 2, col.cloud,
        { hard: true, mode: 1, glow: .34, alpha: 0 });
      p.m0 = p.m;
      p.m = M.trs(0, -99, 0, 0, 0, 0, 0); p.cy = -99;
      deckProps.push(p);
    }
    // Clouds: a handful of slabs out beyond the glass that scroll aft while the aeroplane flies.
    for (let i = 0; i < 14; i++) {
      const s = i % 2 ? 1 : -1, z = -RZ + (i / 14) * RZ * 2 + (i % 3) * .4;
      clouds.push({ p: ball(s * (RX + .26), .72 + (i % 4) * .10, z,
        .70 + (i % 5) * .22, .16, .90, col.cloud, { mode: 1, glow: .30 }), s, z0: z });
    }
    // Stars, above the haze band, for the half of the timetable that goes out after dark. Placed on a
    // fixed lattice rather than at random so they do not cluster, and jittered by index so the
    // lattice does not read as one.
    for (let i = 0; i < 26; i++) {
      const s = i % 2 ? 1 : -1, z = -RZ + ((i * 7) % 26) / 26 * RZ * 2;
      const p = ball(s * (RX + .30), 1.42 + ((i * 5) % 9) * .055, z + (i % 3) * .22,
        .018, .018, .018, col.star, { mode: 1, glow: .60, alpha: 0 });
      p.m0 = p.m;
      // Out of the world until it is dark, for the same reason as everything else in here.
      p.m = M.trs(0, -99, 0, 0, 0, 0, 0); p.cy = -99;
      stars.push(p);
    }
    // A city underneath, which is the whole reason a night climb is worth looking at. Sodium orange,
    // and they scroll with the ground rather than with the cloud, so they go past at the speed the
    // concrete does.
    for (let i = 0; i < 30; i++) {
      const s = i % 2 ? 1 : -1, z = -RZ + (i / 30) * RZ * 2;
      const p = ball(s * (RX + .28), .18 + ((i * 3) % 7) * .075, z + (i % 4) * .18,
        .022, .014, .022, col.cityLight, { mode: 1, glow: .70, alpha: 0 });
      p.m0 = p.m;
      cityLights.push({ p, z0: z + (i % 4) * .18 });
    }
    // Destination skyline used during the last few minutes. The silhouette changes colour and
    // profile with the city: blue water for Haikou, green hills for Chengdu, a pale mountain for
    // Tokyo, a dense lit skyline for New York and Shanghai. It is intentionally low-poly scenery
    // seen through a small window, where shape and motion matter more than distant detail.
    for (const s of [-1, 1]) for (let i = 0; i < 16; i++) {
      const z = -RZ + (i / 16) * RZ * 2;
      const h = .10 + ((i * 7) % 9) * .045;
      const p = box(s * (RX + .24), .22 + h / 2, z, .10, h, .30 + (i % 3) * .14,
        C(destStyle.color), { hard:true, mode:1, glow:.05, alpha:0 });
      p.m0 = p.m; destinationBits.push({ p, z0:z, i });
    }
    // Another aircraft crossing the opposite track at cruise. It is rare and brief, which makes
    // noticing it feel like a moment rather than another permanent decoration outside the glass.
    const traffic = [
      box(RX + .28, 1.42, 0, .10, .09, .72, C('#d9e1e5'), { hard:true, mode:1, glow:.07 }),
      box(RX + .28, 1.42, 0, .62, .025, .18, C('#c6d0d6'), { hard:true, mode:1, glow:.06 }),
      box(RX + .28, 1.49, .28, .20, .15, .06, C('#b44b42'), { hard:true, mode:1, glow:.10 }),
    ];
    for (const p of traffic) {
      p.m0 = p.m; p.m = M.trs(0,-99,0,0,0,0,0); p.cy = -99; trafficProps.push(p);
    }
    // The wing, out of the windows at rows four and five, which is where it is on this aeroplane.
    for (const s of [-1, 1]) {
      wingProps.push(box(s * (RX + .95), .58, 1.15, 1.90, .16, 3.60, C('#dcdedc'),
        { hard: true, mode: 1, glow: .12, ry: s * .10 }));
      wingProps.push(box(s * (RX + 1.62), .64, 2.30, .70, .10, .90, C('#c8ccce'),
        { hard: true, mode: 1, glow: .12 }));
      // The red anti-collision beacon at the wing root, and the white strobe at the tip. These are on
      // whenever the engines are running, which is the point of them — an aeroplane with no lights
      // blinking on the wing is a model of an aeroplane.
      beaconProps.push(ball(s * (RX + .60), .48, .30, .055, .045, .055, [...col.beacon],
        { mode: 1, glow: 0 }));
      strobeProps.push(ball(s * (RX + 1.94), .66, 2.30, .050, .040, .050, [...col.strobe],
        { mode: 1, glow: 0 }));
    }
    for (const p of wingProps) p.m0 = p.m;

    for (const s of [-1, 1]) for (let i = 0; i < 12; i++) {
      const z = -RZ + .62 + i * .86;
      // the reveal, then the pane, then the shade above it
      box(s * (RX - .02), 1.28, z, .10, .50, .40, col.white,
        { hard: true, gloss: .24, ...PANEL_MAT });
      box(s * (RX - .05), 1.28, z, .05, .38, .30, col.panelD,
        { hard: true, gloss: .18, ...PANEL_MAT });
      box(s * (RX - .085), 1.28, z, .03, .32, .25, col.glass,
        { hard: true, alpha: .30, gloss: G.glass });
      // The shade. Stowed it is this lip above the pane; pulled down it covers the pane, and
      // `setView` slides it. A cabin at altitude is a patchwork of shades up and down — which is
      // most of what the wall of a cabin looks like — and they all go up for the approach, because
      // that is a thing crew actually make everybody do.
      const sl = box(s * (RX - .045), 1.53, z, .06, .06, .32, col.panel,
        { hard: true, gloss: .20,
          // At full travel the panel is 48 cm high and 21 cm lower. `finish` packs its cull sphere
          // while it is still a six-centimetre lip, so reserve the complete pull-down now.
          fixed: true, cx: s * (RX - .045), cy: 1.32, cz: z, r: .38 });
      // A fixed per-window number rather than a random one, so the same windows are down every
      // flight and the wall does not reshuffle itself while you are looking at it.
      shadeSlats.push({ p: sl, s, z, r: ((i * 7 + (s > 0 ? 4 : 0)) % 11) / 11, at: 0 });
      // A few streaks on the outer pane when departure or approach is wet. They are attached to the
      // glass rather than spawned as particles, so rain remains cheap even in the densest room.
      if (i % 2 === 0) {
        const p = box(s * (RX - .105), 1.34 - (i % 3) * .08, z + .04, .012, .22, .012,
          [...col.skyHi], { hard:true, mode:1, glow:.10, alpha:0 });
        p.ry = s * .18; rainDrops.push(p);
      }
    }
  }

  // ---------------------------------------------------------------- 座位 one seat
  // Built facing -z, which is forward. The pieces, front to back: a pan on a plinth, a shaped back
  // with a gold insert and pale piping, a dark crown over the top of it, and on the back of that
  // crown a screen and a tray — because what you see of a seat from the aisle is the back of the
  // one in front, and that is the surface the reference spends all its detail on.
  // Which way round a seat goes, since getting it wrong is invisible in the code and glaring on
  // screen. The occupant faces -z, because -z is forward and `th.seat.yaw` is Math.PI and yaw 0
  // faces +z in this project. So the backrest is at LARGER z than the pan — behind the shoulders —
  // and the screen and tray are on the aft face of that backrest, where the row behind can reach
  // them. The first version of this had the back at z - .26, in front of the person sitting in it:
  // forty-two people facing into their own upholstery, and from the aisle a continuous gold wall
  // with the cushions apparently stuck on the outside of it.
  function seat(x, z, o = {}) {
    const c = col.shell;
    const T = { tag: '座位' };
    // Every upholstered piece of a seat comes off this one object, which is why the material goes
    // here rather than on twelve calls: forty-two chairs upholstered in two different weaves
    // because one call was missed is not something anybody would find by reading the file.
    // mode 7 is the renderer's own woven-fabric shader and it stays — it is a fine variation at a
    // few centimetres, and the photograph is the coarse one at a quarter of a metre.
    const F = { ...T, mode: 7, gloss: G.fabric, ...SEAT_MAT };
    // plinth and rails
    box(x, .11, z + .04, .30, .16, .30, col.black, { ...T, hard: true, gloss: .20 });
    for (const s of [-1, 1])
      box(x + s * .21, .07, z, .06, .10, .58, col.steel,
        { ...T, hard: true, gloss: G.metal, ...METAL_MAT, matScale: .18 });
    // the pan, and the cushion proud of it
    box(x, .43, z - .02, SEATW - .02, .14, .54, col.pan, F);
    box(x, .505, z - .05, SEATW - .07, .07, .48, col.panL, F);
    // Soft side bolsters and a lumbar pad give the cushion a real upholstered profile rather than
    // one flat slab. Small, but repeated down the aisle they are what make the cabin read premium.
    for (const s of [-1, 1])
      box(x + s * (SEATW / 2 - .065), .555, z - .04, .055, .075, .44, col.crownL,
        { ...F, rx:.04 });
    box(x, .86, z + .17, SEATW - .16, .24, .055, col.panL, { ...F, rx:.06 });
    // the back: shell, gold insert, piping. Reclined a little, the way a seat is.
    box(x, .92, z + .28, SEATW - .02, .84, .16, col.shellD, { ...F, rx: .05 });
    const shellAt = B.props.length;
    box(x, .93, z + .22, SEATW - .12, .74, .06, c, { ...F, rx: .05 });
    for (const s of [-1, 1])
      box(x + s * (SEATW / 2 - .045), .93, z + .23, .035, .72, .07, col.shellL,
        { ...F, rx: .05 });
    // The crown, deep enough to be seen over the top of the back from further down the cabin — and
    // therefore the one piece of a seat that is worth marking. Handed back for that reason.
    const crown = box(x, 1.40, z + .29, SEATW - .04, .26, .20, col.crown, F);
    box(x, 1.40, z + .20, SEATW - .13, .21, .04, col.crownL, F);
    // The seat marker: a strip standing proud of the crown, dark until this turns out to be your
    // seat. It sits at 1.60 rather than flush at 1.545 on purpose — crowns top out at 1.53, so a
    // flush strip is hidden behind the two rows in front of it from anywhere down the aisle, which
    // is exactly where you are standing when you need to find your seat. Twelve centimetres proud
    // clears them.
    // The headrest cover. One box a seat, and it is the highest-value box in this room: forty-two
    // seat backs of one flat brown read as cartons, and a pale cover across the top of each one is
    // what an aeroplane seat actually looks like from behind. Wrapped over the crown, so it shows a
    // little on the front face too the way a real one does.
    // Sized to the back it wraps, which the first attempt at this was not: the back spans y 0.50 to
    // 1.34 and a 30 cm cover centred at 1.38 stood a hand's width clear above the seat and in front of
    // it, so forty-two of them read as white cartons balanced on the chairs. A cover is a band over
    // the top 20 cm of the back and nothing more.
    box(x, 1.24, z + .28, SEATW - .03, .19, .175, col.antimacassar,
      { ...F, rx: .05, gloss: .10 });
    box(x, 1.30, z + .17, SEATW - .16, .15, .055, col.white,
      { ...F, rx:.06, gloss:.08 });
    const mark = box(x, 1.60, z + .29, SEATW - .06, .05, .18, col.crown,
      { ...T, hard: true, mode: 1, glow: 0 });
    // The aft face of the back: the screen, the tray and the literature pocket, which are what the
    // person in the row behind is actually looking at for three hours.
    box(x, 1.06, z + .37, SEATW - .12, .30, .025, col.screen,
      { ...T, hard: true, mode: 1, glow: .05 });
    screens.push(B.props[B.props.length - 1]);
    // The tray, stowed. Close to the shell it is set into: in pale grey it read as a white bar
    // ruled across every seat back in the cabin, which is the one thing a stowed tray is not.
    // The stowed tray is moulded panel, not cloth, and it is the surface the person behind looks
    // at for three hours — so it takes the panel material rather than the seat's.
    box(x, .80, z + .37, SEATW - .10, .24, .03, col.shellD,
      { ...T, hard: true, gloss: .20, ...PANEL_MAT });
    box(x, .68, z + .385, SEATW - .18, .025, .02, col.armD, { ...T, hard: true, gloss: .30 });
    box(x, .58, z + .37, SEATW - .10, .18, .05, col.shellD, F);
    return { shell: B.props[shellAt], mark, crown };
  }

  // Armrests, cupholders and the belt across the pan — the row, rather than the seat, because an
  // armrest belongs to two seats and drawing it per seat drew it twice in the same place.
  function rowFittings(z) {
    const EDGES = [];
    for (let b = 0; b < 3; b++) {
      const cs = COLS.filter((_, i) => BLOCK[i] === b);
      EDGES.push([cs[0] - SEATW / 2, cs[cs.length - 1] + SEATW / 2]);
      for (let i = 0; i <= cs.length; i++) {
        const ax = i === 0 ? cs[0] - SEATW / 2
          : i === cs.length ? cs[cs.length - 1] + SEATW / 2
            : (cs[i - 1] + cs[i]) / 2;
        box(ax, .62, z + .06, .10, .12, .50, col.arm,
          { tag: '座位', hard: true, gloss: .22 });
        box(ax, .69, z - .06, .08, .04, .26, col.armD,
          { tag: '座位', hard: true, gloss: .26 });
        // The cupholder pair on the centre console, which the reference makes a feature of.
        if (i > 0 && i < cs.length)
          cyl(ax, .70, z + .26, .055, .05, col.cream,
            { tag: '座位', hard: true, gloss: .30 });
      }
      // The belt: two straps and a buckle lying on each pan.
      for (const cx of cs) {
        box(cx, .555, z + .04, SEATW - .16, .025, .10, col.charcoal,
          { tag: '安全带', hard: true, gloss: .22 });
        box(cx + .05, .565, z + .04, .07, .03, .12, col.red,
          { tag: '安全带', hard: true, gloss: .34 });
      }
    }
    return EDGES;
  }

  // ---------------------------------------------------------------- 屏幕 the screen in front of you
  // Forty-two seat-back screens have been lit and blank since the cabin was built. This puts a moving
  // map on the one you can actually see — the back of the seat in front of yours — with the route, the
  // two ends of it, and a little aeroplane that crosses it as the flight goes. It is the single most
  // looked-at object on a real flight and it was a dark rectangle.
  //
  // Built once at the origin and moved to whichever seat is in front of yours, rather than forty-two
  // times: only one of them is ever in front of you. Moved in setMySeat and not per frame, because a
  // seat does not move — the only thing that moves every frame is the aeroplane on the route.
  const mapProps = [], mapDest = [];
  let mapPlane = null, mapBase = null, mapRoute = 0;
  function makeMap() {
    Glyphs.need('上海广州成都海口纽约东京曼谷');
    const add = p => { p.m0 = p.m; mapProps.push(p); return p; };
    // The map itself: a lit panel a whisker in front of the dark screen it sits on.
    add(box(0, 1.06, .388, SEATW - .17, .25, .004, col.screenOn,
      { hard: true, mode: 1, glow: .17 }));
    mapRoute = SEATW - .25;
    // The route, and a dot at each end of it.
    add(box(0, 1.00, .391, mapRoute, .005, .003, col.lit, { hard: true, mode: 1, glow: .26 }));
    for (const o of [-1, 1])
      add(box(o * mapRoute / 2, 1.00, .392, .014, .014, .003, col.cream,
        { hard: true, mode: 1, glow: .22 }));
    // And the aeroplane on it, which is the part anybody actually watches.
    mapPlane = add(box(0, 1.00, .394, .026, .011, .005, col.green,
      { hard: true, mode: 1, glow: .46 }));
    // Where it is going, across the top.
    for (const g of glyphs(0, 1.14, .393, 0, '000',
      { size: .042, gap: .008, color: col.cream, mode: 1, glow: .30 })) {
      g.m0 = g.m; mapProps.push(g); mapDest.push(g);
    }
    for (const p of mapProps) { p.m = M.trs(0, -99, 0, 0, 0, 0, 0); p.cy = -99; }
  }
  // Put the whole thing on the back of the seat in front of `st`. The front row has a bulkhead in
  // front of it rather than a seat, and there is nothing to hang a screen on — that row reads the
  // flight off the bulkhead display instead, which is exactly what a bulkhead row does in life.
  function setMapAt(st) {
    mapBase = null;
    const ahead = st && SEATS.find(o => o.letter === st.letter
      && Math.abs(o.z - (st.z - (ROWZ[1] - ROWZ[0]))) < .01);
    if (!ahead) {
      for (const p of mapProps) { p.m = M.trs(0, -99, 0, 0, 0, 0, 0); p.cy = -99; }
      return;
    }
    mapBase = M.trs(ahead.x, 0, ahead.z, 0, 1, 1, 1);
    for (const p of mapProps) {
      p.m = M.mul(mapBase, p.m0);
      p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    }
  }
  function setMapDest(text) {
    const s = String(text || '');
    mapDest.forEach((g, i) => {
      const ch = s[i];
      if (!ch || !mapBase) { g.m = GONE; g.cx = 0; g.cy = -99; g.cz = 0; return; }
      g.ch = ch;
      g.m = M.mul(mapBase, g.m0);
      g.cx = g.m[12]; g.cy = g.m[13]; g.cz = g.m[14];
    });
  }
  // The aeroplane along the route, once a frame. Everything else on the map is nailed down.
  function setMapPlane() {
    if (!mapBase || !mapPlane) return;
    const x = (flightU - .5) * mapRoute;
    mapPlane.m = M.mul(mapBase, M.mul(M.trans(x, 0, 0), mapPlane.m0));
    mapPlane.cx = mapPlane.m[12]; mapPlane.cy = mapPlane.m[13]; mapPlane.cz = mapPlane.m[14];
  }

  // ---------------------------------------------------------------- 洗手间 the lavatories
  // Two modules in the rear corners, aft of the last row, where the cabin is clear from side to side —
  // the same strip the crew cross by, and the only part of this room a body can walk across.
  //
  // The interesting thing about a lavatory on an aeroplane is not the room, which you never see. It is
  // that you cannot go when you want to. The belt sign owns it: on the ground, through the climb and
  // all the way down the answer is no. On the fourteen-hour service to New York that makes the cruise
  // the only time you can go, and being told to sit down and wait is the whole of what it is like.
  const lavLamps = [], lavBusyText = [], lavFreeText = [];
  let lavBusy = false;
  // The call button and its lamp. One of each, moved to whichever seat is yours rather than forty-two
  // of them, because only one of them could ever be pressed.
  let bellLamp = null, bellThing = null, bellOn = false;
  let trayProp = null, readProp = null, ventProp = null, bagProp = null, chargeProp = null;
  let trayThing = null, readThing = null, ventThing = null, screenThing = null, bagThing = null;
  let shadeThing = null, reclineThing = null, chargeThing = null;
  const equipment = { tray:false, reading:false, air:false, screen:true, bag:true,
                      recline:false, shade:false, shadeManual:false, charging:false };
  function lavatories() {
    Glyphs.need('有人无洗手间');
    for (const s of [-1, 1]) {
      // The module, and its door on the inboard face.
      box(s * 2.72, 1.05, 2.52, .95, 2.10, .75, col.panel,
        { hard: true, gloss: G.paint, ...PANEL_MAT });
      box(s * 2.72, 2.13, 2.52, .95, .06, .75, col.panelD,
        { hard: true, gloss: .20, ...PANEL_MAT });
      box(s * 2.24, 1.00, 2.52, .05, 1.90, .62, col.panelD,
        { hard: true, gloss: .22, ...PANEL_MAT });
      box(s * 2.20, .98, 2.72, .05, .14, .05, col.chrome,
        { hard: true, gloss: G.metal, ...METAL_MAT, matScale: .11 });
      // The occupancy plate, which is the only part of a lavatory anybody ever reads. Green and red,
      // and the word on it, both driven from `setLav`.
      const lamp = box(s * 2.21, 1.74, 2.52, .03, .15, .34, [...col.green],
        { hard: true, mode: 1, glow: .26 });
      litten(lamp, .5);
      lavLamps.push(lamp);
      const yaw = s * Math.PI / 2;
      for (const g of glyphs(s * 2.18, 1.74, 2.52, yaw, '无人',
        { size: .085, gap: .012, color: col.black, mode: 1, glow: .05 })) {
        g.m0 = g.m; lavFreeText.push(g);
      }
      for (const g of glyphs(s * 2.18, 1.74, 2.52, yaw, '有人',
        { size: .085, gap: .012, color: col.cream, mode: 1, glow: .10 })) {
        g.m0 = g.m;
        // Parked from the start, or both words are on the plate until the first tick arrives.
        g.m = M.trs(0, -99, 0, 0, 0, 0, 0); g.cy = -99;
        lavBusyText.push(g);
      }
      for (const g of glyphs(s * 2.19, 1.40, 2.52, yaw, '洗手间',
        { size: .075, gap: .010, color: col.cream, mode: 1, glow: .12 })) litten(g, .4);
      // A body cannot walk through it. The seat colliders stop at ROWZ[last] + .46, so without this
      // the corner is open floor and you would stand inside the cubicle to use it.
      solid(s > 0 ? 2.24 : -3.20, s > 0 ? 3.20 : -2.24, 2.14, 2.90);
      thing('洗手间', s * 2.22, 1.55, 2.52,
        '我去一趟洗手间。', 'I am going to the lavatory.',
        '洗 to wash + 手 hand + 间 room.',
        { focus: [s * 1.80, 2.52], reach: 1.5 });
    }
  }
  // Free, engaged, or not now — and the third is the one that matters. Reported as a word rather than
  // a boolean because the reason you cannot go is different from the fact that you cannot.
  // Put the button over a seat, or take it out of the world when there is no seat of yours to put it
  // over. On the aisle side of the seat's own overhead panel, and reachable from the aisle.
  function setBellAt(st) {
    if (!bellLamp || !bellThing) return;
    if (!st) {
      bellLamp.m = M.trs(0, -99, 0, 0, 0, 0, 0); bellLamp.cy = -99;
      bellThing.reach = -1;
      return;
    }
    const x = st.x + (st.aisle > st.x ? .18 : -.18);
    bellLamp.m = M.trs(x, 1.66, st.z - .10, 0, .10, .04, .10);
    bellLamp.cx = x; bellLamp.cy = 1.66; bellLamp.cz = st.z - .10;
    bellThing.pos[0] = x; bellThing.pos[1] = 1.66; bellThing.pos[2] = st.z - .10;
    bellThing.focus[0] = st.aisle; bellThing.focus[1] = st.z;
    bellThing.reach = 1.6;
  }
  function setBell(on) {
    bellOn = !!on;
    if (!bellLamp) return;
    const c = bellOn ? col.amber : col.panelD;
    for (let i = 0; i < 3; i++) bellLamp.color[i] = c[i];
    bellLamp.glow = bellOn ? .48 : 0;
  }

  // Everything a passenger can reach from their own chair follows that chair in the same way as
  // the service button. It makes the cabin feel usable without multiplying six interactive labels
  // by forty-two seats. The visible tray, reading lamp, vent and carry-on also report their state.
  function setEquipmentAt(st) {
    const hide = p => { if (!p) return; p.m = M.trs(0, -99, 0, 0, 0, 0, 0); p.cy = -99; };
    const disable = th => { if (th) th.reach = -1; };
    if (!st) {
      [trayProp, readProp, ventProp, bagProp, chargeProp].forEach(hide);
      [trayThing, readThing, ventThing, screenThing, bagThing,
       shadeThing, reclineThing, chargeThing].forEach(disable);
      if (readLight) readLight.on = false;
      return;
    }
    const side = st.aisle > st.x ? 1 : -1;
    const aheadZ = st.z - .48;
    // Horizontal when open; parked while stowed because the fixed seat model already draws the
    // vertical table on the seat back.
    if (equipment.tray) {
      trayProp.m = M.trs(st.x, .73, aheadZ, 0, SEATW - .12, .035, .38);
      trayProp.cx = st.x; trayProp.cy = .73; trayProp.cz = aheadZ;
    } else hide(trayProp);
    readProp.m = M.trs(st.x + side * .10, 1.76, st.z - .10, 0, .08, .025, .08);
    readProp.cx = readProp.m[12]; readProp.cy = readProp.m[13]; readProp.cz = readProp.m[14];
    readProp.glow = equipment.reading ? .82 : .04;
    // The lamp and the light it casts, moved together. A shade below the lens rather than at it,
    // so the cone lands on the tray and the lap and not on the underside of the bin it is set into.
    if (readLight) {
      readLight.x = readProp.cx; readLight.y = 1.66; readLight.z = readProp.cz;
      readLight.on = !!equipment.reading;
    }
    ventProp.m = M.trs(st.x - side * .10, 1.76, st.z - .10, 0, .07, .025, .07);
    ventProp.cx = ventProp.m[12]; ventProp.cy = ventProp.m[13]; ventProp.cz = ventProp.m[14];
    ventProp.glow = equipment.air ? .28 : .02;
    chargeProp.m = M.trs(st.x + side * .20, .68, st.z - .02, 0, .055, .025, .055);
    chargeProp.cx = chargeProp.m[12]; chargeProp.cy = chargeProp.m[13]; chargeProp.cz = chargeProp.m[14];
    chargeProp.glow = equipment.charging ? .62 : .03;
    if (equipment.bag) {
      bagProp.m = M.trs(st.x, 1.70, st.z + .02, 0, .32, .18, .28);
      bagProp.cx = bagProp.m[12]; bagProp.cy = bagProp.m[13]; bagProp.cz = bagProp.m[14];
    } else hide(bagProp);
    const place = (th, x, y, z) => {
      th.pos[0] = x; th.pos[1] = y; th.pos[2] = z;
      th.focus[0] = st.aisle; th.focus[1] = st.z; th.reach = 1.65;
    };
    place(trayThing, st.x, .82, aheadZ);
    place(readThing, st.x + side * .10, 1.76, st.z - .10);
    place(ventThing, st.x - side * .10, 1.76, st.z - .10);
    place(screenThing, st.x, 1.08, aheadZ);
    place(bagThing, st.x, 1.70, st.z + .02);
    place(shadeThing, st.x - side * .20, .70, st.z - .02);
    place(reclineThing, st.x + side * .10, .67, st.z + .15);
    place(chargeThing, st.x + side * .20, .68, st.z - .02);
    for (const p of mapProps) {
      p.alpha = equipment.screen ? 1 : .08;
      if (p.glow0 === undefined) p.glow0 = p.glow || 0;
      p.glow = equipment.screen ? p.glow0 : 0;
    }
  }
  function securePhase() {
    return !['gate', 'cruise', 'arrived', 'landed'].includes(phase);
  }
  function toggleEquipment(key) {
    if (!(key in equipment)) return 'unknown';
    if ((key === 'tray' || key === 'recline') && securePhase() && !equipment[key]) return 'secure';
    if (key === 'bag') {
      if (phase !== 'arrived') return 'secure';
      equipment.bag = !equipment.bag;
    } else if (key === 'shade') {
      equipment.shadeManual = true; equipment.shade = !equipment.shade;
    } else equipment[key] = !equipment[key];
    setEquipmentAt(mine);
    return equipment[key] ? 'on' : 'off';
  }
  function secureEquipment() {
    equipment.tray = false; equipment.recline = false;
    setEquipmentAt(mine);
  }

  function lavState() {
    if (phase === 'gate') return 'free';
    if (phase !== 'cruise') return 'belted';
    return lavBusy ? 'busy' : 'free';
  }
  function setLav() {
    // Somebody else is in there for eight seconds out of every twenty-four of the cruise. Derived
    // from the phase clock rather than from a random number, so it is the same on every flight and a
    // test can say when it is engaged.
    lavBusy = phase === 'cruise' && Math.floor(phaseT / 8) % 3 === 1;
    const busy = lavState() !== 'free';
    for (const p of lavLamps) {
      const c = busy ? col.red : col.green;
      for (let i = 0; i < 3; i++) p.color[i] = c[i];
      p.glow = busy ? .30 : .22;
    }
    // One word or the other, never both. Parked rather than made transparent — see the ceiling.
    for (const g of lavFreeText) { g.m = busy ? GONE : g.m0; g.cy = busy ? -99 : g.m0[13]; }
    for (const g of lavBusyText) { g.m = busy ? g.m0 : GONE; g.cy = busy ? g.m0[13] : -99; }
  }

  // ---------------------------------------------------------------- 餐车 the trolley
  // Built once at the origin facing -z, with every piece keeping the matrix it was built with. The
  // whole cart is then placed each frame by multiplying one translate-and-turn through all of them —
  // the same trick the clouds use, and the reason a cart costs fifteen matrix multiplies a frame
  // rather than fifteen rebuilt props.
  //
  // Sized against the aisle rather than against a real cart: the aisle in here is 1.48 m because the
  // whole cabin is drawn at three times scale so a third-person camera fits down it, and a 30 cm cart
  // in a 1.48 m aisle reads as a toy. 0.56 is what looks right, which is the rule this room has
  // followed since the seats.
  function makeTrolley() {
    const g = [];
    const add = p => { p.m0 = p.m; g.push(p); return p; };
    // The body: a steel box with three horizontal ribs, which is the whole visual signature of one.
    add(box(0, .46, 0, .56, .92, .78, col.steel, { hard: true, gloss: G.metal }));
    for (let i = 0; i < 3; i++)
      add(box(0, .24 + i * .26, -.40, .52, .04, .03, col.chrome, { hard: true, gloss: G.metal }));
    add(box(0, .04, 0, .50, .08, .72, col.charcoal, { hard: true, gloss: .20 }));
    // Four visible castors. The cart already travels with the crew; these small dark spheres make
    // that movement read as equipment rolling down an aisle rather than a cupboard sliding over it.
    for (const x of [-.21, .21]) for (const z of [-.29, .29])
      add(ball(x, .035, z, .045, .045, .045, col.black, { hard: true, gloss: .24 }));
    // The worktop, and the handle at the pushing end.
    add(box(0, .94, 0, .60, .04, .82, col.chrome, { hard: true, gloss: G.metal }));
    for (const s of [-1, 1])
      add(box(s * .26, 1.02, .38, .04, .14, .04, col.chrome, { hard: true, gloss: G.metal }));
    add(box(0, 1.09, .38, .56, .04, .04, col.chrome, { hard: true, gloss: G.metal }));
    // What is on it. Cups on one half, meal trays on the other, and the pot at the back — which is
    // the order a cart is actually laid out, drinks to hand and hot food behind.
    for (let i = 0; i < 6; i++)
      add(cyl(-.16 + (i % 3) * .16, 1.00, -.30 + Math.floor(i / 3) * .17, .048, .10,
        i % 2 ? col.white : col.cream, { hard: true, gloss: .30 }));
    add(cyl(.20, 1.03, -.26, .075, .16, col.charcoal, { hard: true, gloss: G.metal }));
    for (let i = 0; i < 2; i++)
      add(box(-.02 + i * .22, .98, .16, .20, .05, .26, col.tray, { hard: true, gloss: .18 }));
    add(box(.10, 1.01, .16, .14, .02, .18, col.amber, { hard: true, gloss: .22 }));
    // Parked off the world until a round starts. Collapsed rather than made transparent: an alpha-0
    // prop still writes depth, and a cart-shaped hole in the carpet is worse than no cart. Culling
    // is packed from the parked matrix, too, so every piece reserves one conservative sphere over
    // both aisles and the complete service run before it is collapsed.
    for (const p of g) {
      p.fixed = true; p.cx = 0; p.cy = .56; p.cz = (BULK + GALLEY) / 2; p.r = 4.8;
      p.m = M.trs(0, -99, 0, 0, 0, 0, 0);
    }
    trolleys.push(g);
  }

  // ---------------------------------------------------------------- the ends of the cabin
  // The bulkhead the cabin faces, with the two curtains either side of the centre aisle. In the
  // reference these are drawn back against the frames and there is a lit panel between them, which
  // is what gives the far end of the cabin somewhere to be rather than a wall.
  function bulkhead() {
    box(0, 1.10, BULK, RX * 2 - .2, 2.20, .12, col.panel,
      { hard: true, gloss: G.paint, ...PANEL_MAT });
    box(0, 2.06, BULK - .01, RX * 2 - .2, .30, .14, col.panelD,
      { hard: true, gloss: .20, ...PANEL_MAT });
    // The lit panel between the curtains: a warm screen with the carrier's name across it.
    litten(box(0, 1.34, BULK + .08, 1.90, .96, .05, C('#8fb0c4'),
      { hard: true, mode: 1, glow: .09 }), .3);
    for (const g of glyphs(0, 1.70, BULK + .12, 0, '燕河航空',
      { size: .18, gap: .07, color: col.cream, mode: 1, glow: .30 })) litten(g, .8);
    // And under the name, the two numbers every cabin display in the world shows: how high you are
    // and how much longer this is going to take. Built as fixed slots that get written into rather
    // than as text, because the text changes every second and a glyph is a quad with a character on
    // it — see `slotsInto`, and the station's departure board, which does the same thing.
    //
    // Every character either row can ever show has to be in the atlas before the first frame, so it
    // is registered here. A character asked for later arrives as a blank.
    Glyphs.need('0123456789米分剩余在地面已到达');
    for (const [row, y, size] of [[infoAlt, 1.44, .13], [infoEta, 1.20, .12]]) {
      // Seven slots, which is '10600米' with room to spare and '剩余130分' exactly.
      for (const g of glyphs(0, y, BULK + .12, 0, '0000000',
        { size, gap: size * .18, color: col.lit, mode: 1, glow: .34 })) {
        g.m0 = g.m; litten(g, .8); row.push(g);
      }
    }
    // The two doorways through it, at the aisles, and a curtain drawn back beside each.
    for (const s of [-1, 1]) {
      box(s * AISLE, 1.02, BULK, .96, 2.04, .16, C('#1a1c20'), { hard: true, gloss: .10 });
      for (const o of [-.40, .40]) {
        const cx = s * AISLE + o;
        // A heavy cloth curtain, so it takes the cloth — coarser than a seat cover, which is what
        // a galley curtain is.
        const p = box(cx, 1.06, BULK + .12, .30, 2.02, .14, col.curtain,
          { mode: 7, gloss: .08, ...SEAT_MAT, matScale: .34 });
        curtainLeaves.push(p);
        // the folds, which is what stops it being a plank
        for (let k = -1; k <= 1; k++)
          box(cx + k * .09, 1.06, BULK + .19, .05, 1.98, .05, col.curtainD,
            { mode: 7, gloss: .06, ...SEAT_MAT, matScale: .34 });
      }
      // 出口 over each doorway, lit green, which is the one bright colour in the reference.
      litten(box(s * AISLE, 2.02, BULK + .14, .40, .16, .04, col.green,
        { hard: true, mode: 1, glow: .30 }), .8);
    }
    shade(0, BULK + .3, RX * 2, 1.2, .20);
  }

  // The rear galley, which is where you come in and where the trolley lives.
  function galley() {
    box(0, 1.10, GALLEY, RX * 2 - .2, 2.20, .14, col.panelD,
      { hard: true, gloss: G.paint, ...PANEL_MAT });
    for (const s of [-1, 1]) {
      // the two doorways, and the lit 出口 over them
      box(s * AISLE, 1.02, GALLEY, .96, 2.04, .18, C('#1a1c20'), { hard: true, gloss: .10 });
      litten(box(s * AISLE, 2.02, GALLEY - .14, .40, .16, .04, col.green,
        { hard: true, mode: 1, glow: .30 }), .8);
      // stowage: a stack of drawers and a coffee urn, tagged so the galley is pickable
      // A galley is the one part of a cabin that is honestly made of metal — stainless carriers,
      // drawer fronts and an urn — where everything forward of the curtain is painted panel. It is
      // worth the difference: the aft end of the cabin has read as more cream plastic until now.
      box(s * 2.20, .68, GALLEY - .42, 1.10, 1.36, .70, col.trim,
        { tag: '茶水间', hard: true, gloss: .26, ...METAL_MAT, matScale: .46 });
      for (let i = 0; i < 3; i++)
        box(s * 2.20, .38 + i * .34, GALLEY - .78, 1.00, .06, .04, col.steel,
          { tag: '茶水间', hard: true, gloss: G.metal, ...METAL_MAT });
      box(s * 2.20, 1.52, GALLEY - .42, .34, .32, .30, col.chrome,
        { tag: '茶水间', hard: true, gloss: G.metal, ...METAL_MAT, matScale: .22 });
    }
    shade(0, GALLEY - .4, RX * 2, 1.2, .20);
  }

  // ---------------------------------------------------------------- build
  windows();          // outside first, so the glazing blends over it
  shell();
  bins();
  bulkhead();
  galley();
  makeTrolley(); makeTrolley();   // one per aisle
  lavatories();
  makeMap();

  const SEATS = [];
  for (let r = 0; r < ROWZ.length; r++) {
    const z = ROWZ[r];
    for (let i = 0; i < COLS.length; i++) {
      const x = COLS[i];
      const parts = seat(x, z);
      // The seat letter, on the back of the headrest, facing the way you walk in. This is how a
      // person actually finds a seat on an aeroplane — you read the letters off the tops of the
      // seat backs as you come down the aisle — and without them the boarding card said 21C and
      // the cabin gave you no way whatsoever to know which of forty-two chairs that was.
      // Small and quiet. At .075 in cream at glow .14 these came out as bright white capitals four
      // inches tall floating over the headrests — the loudest thing in the cabin, competing with the
      // one seat that is actually supposed to catch the eye. A seat letter is a discreet mark you
      // read from a metre away, not signage.
      for (const g of glyphs(x, 1.452, z + .405, 0, LETTERS[i],
        { size: .045, gap: 0, color: col.armD, mode: 1, glow: .04 })) litten(g, .2);
      SEATS.push({ x, z, row: ROW0 + r, letter: LETTERS[i], block: BLOCK[i],
                   id: (ROW0 + r) + LETTERS[i], shell: parts.shell, mark: parts.mark,
                   crown: parts.crown,
                   // Which aisle you get out into, and where you stand to sit down.
                   aisle: BLOCK[i] === 0 ? -AISLE : BLOCK[i] === 2 ? AISLE
                     : (x < 0 ? -AISLE : x > 0 ? AISLE : -AISLE) });
    }
    rowFittings(z);
    // The row placard, on the aisle face of the aisle-end seat of each block. This is the cue that
    // actually works from the far end of the cabin: a headrest marker is behind every headrest
    // between you and it, but the aisle face of a seat is in clear line of sight all the way down.
    // Dark until it is your row, and then lit — see setMySeat.
    // Four of them: both aisle faces of the centre block, and the aisle face of each outer pair. The
    // x is the seat edge and the yaw is whichever way the aisle is from it, written out rather than
    // derived because getting a sign facing into the upholstery is invisible in the code.
    //
    // Placard-sized, and that took two goes. At 0.30 by 0.16 the first pair were blank panels the
    // size of a paperback bolted to the side of a seat — from the aisle they read as a rendering
    // fault rather than as signage, which is exactly how I first diagnosed them. A seat placard is
    // small and has the row number printed on it, and the number is the reason it is legible at all.
    for (const [px, yaw] of [[COLS[1] + SEATW / 2 + .012, Math.PI / 2],
                             [COLS[2] - SEATW / 2 - .012, -Math.PI / 2],
                             [COLS[4] + SEATW / 2 + .012, Math.PI / 2],
                             [COLS[5] - SEATW / 2 - .012, -Math.PI / 2]]) {
      const tag = box(px, 1.19, z + .06, .015, .105, .17, col.crownL,
        { tag: '座位', hard: true, mode: 1, glow: 0 });
      rowTags.push({ p: tag, z });
      for (const g of glyphs(px + Math.sign(yaw) * .012, 1.19, z + .06, yaw,
        String(ROW0 + r), { size: .062, gap: .006, color: col.cream, mode: 1, glow: .16 }))
        rowTags.push({ p: g, z, glyph: true });
    }
    // The row number, on the aisle edge of the overhead bin, facing into the aisle — which is
    // where a real cabin puts it and, more usefully, out of the way. Set in the middle of the
    // aisle at first, where six pairs of digits hung in mid-air at head height.
    for (const s of [-1, 1])
      for (const g of glyphs(s * (BINEDGE - .10), 1.74, z - .18, s * Math.PI / 2,
        String(ROW0 + r), { size: .085, gap: .012, color: col.cream, mode: 1, glow: .12 }))
        litten(g, .4);
  }
  // Three colliders, one per seat block, spanning every row: you cannot walk between rows anyway,
  // and one box per block is three draw-free colliders instead of eighteen.  The aft face follows
  // the visible seat-back equipment, whose furthest face is z + .385.  The old +.46 added 7.5 cm
  // of invisible seat and, together with the conservative rear zone, sealed the cross-aisle for a
  // .45 m comfort envelope even though the model left a walkable galley in plain view.
  for (let b = 0; b < 3; b++) {
    const cs = COLS.filter((_, i) => BLOCK[i] === b);
    solid(cs[0] - SEATW / 2 - .03, cs[cs.length - 1] + SEATW / 2 + .03,
      ROWZ[0] - .34, ROWZ[ROWZ.length - 1] + .39);
  }
  shade(0, 0, RX * 2, RZ * 2, .16);
  minePool = glow(M.trs(0, -9, 0, 0, 1.5, 1, 1.5), C('#a8d4ff'), 0);

  // ---------------------------------------------------------------- the things
  SEATS.forEach(st => {
    const th = thing('座位', st.x, 1.02, st.z,
      '这是我的座位吗？', 'Is this my seat?',
      '座 to sit + 位 place. 靠窗 by the window, 靠走廊 on the aisle.',
      { focus: [st.aisle, st.z], reach: 1.45 });
    th.seat = { type: 'sit', at: [st.x, st.z + .04], yaw: Math.PI, seatY: .50 };
    th.labelGroup = 'cabin-seats';
    th.cabinSeat = st.id;
    st.th = th;
  });
  for (const s of [-1, 1]) {
    const th = thing('安全带', s * AISLE * .55, .70, ROWZ[2],
      '请系好安全带。', 'Please fasten your seat belt.',
      '系 to fasten + 安全带 safety belt. 安全 safe + 带 a strap.',
      { focus: [s * AISLE, ROWZ[2]], reach: 1.5 });
    th.labelGroup = 'cabin-belts';
  }
  for (const s of [-1, 1]) {
    const th = thing('行李架', s * 1.98, 1.80, ROWZ[1],
      '包放行李架上。', 'Put the bag in the overhead bin.',
      '行李 luggage + 架 rack. 放 to put.',
      { focus: [s * AISLE, ROWZ[1]], reach: 1.5 });
    th.labelGroup = 'cabin-bins';
  }
  for (const s of [-1, 1]) {
    const th = thing('舷窗', s * (RX - .08), 1.28, ROWZ[4] - .2,
      '从舷窗往外看，都是云。', 'Out of the window it is all cloud.',
      '舷 the side of a ship or aircraft + 窗 window.',
      { focus: [s * AISLE, ROWZ[4]], reach: 1.7 });
    th.labelGroup = 'cabin-windows';
  }
  // 服务铃. One button, and it moves to whichever seat is yours — see setMySeat. The captain has been
  // telling you to press it if you need anything since the room was built and there has never been
  // one to press. Above your own seat on the panel, where it is on a real aeroplane, and it lights
  // while the call is outstanding so you can see that you have in fact rung it.
  bellLamp = box(0, 1.66, 0, .10, .04, .10, [...col.panelD], { hard: true, mode: 1, glow: 0 });
  bellThing = thing('服务铃', 0, 1.66, 0,
    '请问，能给我一杯水吗？', 'Excuse me, could I have a glass of water?',
    '服务 service + 铃 bell. 按 to press.',
    { focus: [0, 0], reach: 1.6 });
  bellThing.labelGroup = 'cabin-bell';
  setBellAt(null);

  // Personal seat equipment. These begin outside the room and are placed over the assigned seat
  // by setMySeat, so every boarding card gets the same complete, working set of controls.
  trayProp = box(0, -99, 0, .40, .035, .38, [...col.tray],
    { tag:'小桌板', hard:true, gloss:.24 }); trayProp.cy = -99;
  readProp = box(0, -99, 0, .08, .025, .08, [...col.lit],
    { tag:'阅读灯', hard:true, mode:1, glow:0 }); readProp.cy = -99;
  // 阅读灯, the light rather than the lamp. The prop above is the lens in the overhead panel and it
  // has been going from glow .04 to .82 since it was built without a single photon coming out of
  // it — on a dimmed night cruise you switched on your reading light and the page in front of you
  // did not change. Tight and warm, because that is exactly what one is: a 1.1 m pool over one
  // chair that leaves the passenger in the next seat asleep. Off, and out of the world, until a
  // seat is yours and the switch is on — see `setEquipmentAt`.
  readLight = B.light(0, -99, 0, [1.00, 0.89, 0.70], .50, 1.05);
  readLight.on = false;
  ventProp = cyl(0, -99, 0, .07, .025, [...col.chrome],
    { tag:'出风口', hard:true, mode:1, glow:0 }); ventProp.cy = -99;
  bagProp = box(0, -99, 0, .32, .18, .28, C('#425d78'),
    { tag:'手提行李', hard:true, gloss:.20, rx:.04 }); bagProp.cy = -99;
  chargeProp = box(0, -99, 0, .055, .025, .055, [...col.green],
    { tag:'充电口', hard:true, mode:1, glow:0 }); chargeProp.cy = -99;
  trayThing = thing('小桌板', 0, -99, 0, '请把小桌板收好。', 'Please stow the tray table.',
    '小 small + 桌 table + 板 board.', { focus:[0,0], reach:-1 });
  readThing = thing('阅读灯', 0, -99, 0, '我打开阅读灯。', 'I turn on the reading light.',
    '阅读 to read + 灯 light.', { focus:[0,0], reach:-1 });
  ventThing = thing('出风口', 0, -99, 0, '我把出风口打开。', 'I open the air vent.',
    '出风 air comes out + 口 opening.', { focus:[0,0], reach:-1 });
  screenThing = thing('屏幕', 0, -99, 0, '屏幕上显示飞行路线。', 'The screen shows the flight route.',
    '屏幕 screen or display.', { focus:[0,0], reach:-1 });
  bagThing = thing('手提行李', 0, -99, 0, '我的手提行李在行李架上。',
    'My carry-on is in the overhead bin.', '手提 carried by hand + 行李 luggage.',
    { focus:[0,0], reach:-1 });
  shadeThing = thing('遮光板', 0, -99, 0, '我调一下舷窗遮光板。',
    'I adjust the window shade.', '遮 to cover + 光 light + 板 panel.', { focus:[0,0], reach:-1 });
  reclineThing = thing('靠背', 0, -99, 0, '我把座椅靠背向后调。',
    'I recline the seat back.', '靠 to lean + 背 back.', { focus:[0,0], reach:-1 });
  chargeThing = thing('充电口', 0, -99, 0, '我给手机充电。',
    'I charge my phone.', '充电 to charge + 口 port.', { focus:[0,0], reach:-1 });
  trayThing.cabinEquip = 'tray'; readThing.cabinEquip = 'reading';
  ventThing.cabinEquip = 'air'; screenThing.cabinEquip = 'screen'; bagThing.cabinEquip = 'bag';
  shadeThing.cabinEquip = 'shade'; reclineThing.cabinEquip = 'recline';
  chargeThing.cabinEquip = 'charging';
  [trayThing, readThing, ventThing, screenThing, bagThing,
   shadeThing, reclineThing, chargeThing].forEach((th, i) => {
    th.labelGroup = 'cabin-equip-' + i;
  });

  // The destination door is a real exit, not a cutscene. It only becomes usable once the aircraft
  // is parked and the belt sign is off; until then its action explains why the player must wait.
  const exitThing = thing('舱门', 0, 1.18, GALLEY - .18,
    '舱门已经打开，可以下飞机了。', 'The aircraft door is open; we can deplane.',
    '舱 cabin + 门 door.', { focus:[0, GALLEY - .70], reach:1.6 });
  exitThing.exitPlane = true;
  const cockpitThing = thing('驾驶舱', 0, 1.34, BULK + .14,
    '驾驶舱里有飞行仪表和窗外摄像头。',
    'The flight deck has working instruments and an exterior camera.',
    '驾驶 to operate + 舱 compartment.', { focus:[-AISLE, BULK + .48], reach:1.8 });
  cockpitThing.cockpitView = true;

  thing('茶水间', 2.20, 1.10, GALLEY - .90, '乘务员在茶水间准备饮料。',
    'The crew are making up the drinks in the galley.',
    '茶 tea + 水 water + 间 room — the galley.',
    { focus: [AISLE, GALLEY - 1.30], reach: 1.8 });

  // ---------------------------------------------------------------- 机长广播 the briefing
  // What the flight deck says, in order, and it is the real thing rather than a paraphrase: a
  // Chinese pre-departure PA is a fixed piece of language and half the reason to build this room is
  // that a learner hears it end to end with nothing to do but listen.
  //
  // Read by the captain, not by the cabin crew — a third announcer, baked under his own key space,
  // and audibly a man in his fifties on a cabin intercom rather than either of the two announcers
  // in the terminals. `BRIEF` is what the bake enumerates, in this order, and `cap:<i>` is the event
  // game.js looks up in it.
  // Six lines, and it was nine. The nine were the whole of a real briefing and that turned out to
  // be the wrong target: measured against the baked clips, four of them keyed up before the
  // previous one had finished and the farewell was still playing three seconds after the wheels
  // were down, so what it sounded like was a man talking over himself for the length of the
  // flight. Cut to the parts a passenger actually needs — who is flying you, buckle up, we are
  // level, we are going down, goodbye — and each one now has silence on both sides of it.
  //
  // The retained wording keeps the established timing; the two carrier-name lines were rebaked
  // with the fictional 燕河 identity. Dropped: the phones-and-no-smoking line, the
  // do-not-leave-your-seat line, and the twenty-minutes-out weather report. They are the three a
  // passenger tunes out.
  const BRIEF = [
    '女士们，先生们，欢迎乘坐燕河航班。我是本次航班的机长。',
    // The one line that has to be heard, so it goes out on its own into the climb.
    '飞机很快就要起飞了，请您系好安全带，收起小桌板，调直座椅靠背。',
    '我们将要飞往上海，飞行时间大约两个小时十分钟。',
    '我们已经到达巡航高度，请您坐好，需要帮助请按服务铃。',
    // The descent, in two parts rather than three: that you are going down, and the goodbye as the
    // gear comes out.
    '各位旅客，飞机已经开始下降。请您回到座位，系好安全带，收起小桌板。',
    '飞机马上就要着陆了。感谢您乘坐燕河的航班，希望您旅途愉快，欢迎下次再来。',
  ];
  // Which line goes out at which point of which phase. Written as a table rather than buried in the
  // tick so the whole briefing can be read in one place and reordered without touching the machine.
  //
  // These fractions are not taste, they are arithmetic: each line's baked clip runs .44s behind the
  // PA tone, and the next line may not key up until the previous one has stopped. `.capsched.js`
  // reads this table and the clip manifest and fails the build if any pair of them collides, so a
  // number changed here without checking that is caught rather than shipped.
  const CAP_AT = [
    ['pushback', .08, 0],
    ['taxi', .18, 1], ['climb', .28, 2],
    ['cruise', .10, 3],
    ['descend', .06, 4], ['approach', .28, 5],
  ];

  // ---------------------------------------------------------------- what the game drives
  // The cabin has six states and they are the six things an aeroplane is: standing at the gate with
  // the door open, taxiing out, climbing, level at cruise, coming down, and on the ground somewhere
  // else. Everything animated in here reads off `phase` and `speed` rather than keeping a clock of
  // its own, so the engine note, the window scroll, the shake and the belt sign cannot disagree.
  //
  // The durations are in real seconds and they are short. A two-hour flight is not two hours of
  // play, and the honest ceiling for how long a player will sit still watching cloud go past is
  // about a minute — long enough for the briefing to finish, the belts to be checked and a drink to
  // come round, which is exactly the content this room has.
  // The climb is 21 s and not 16 because the belt check has to fit inside it. Six rows at a 0.7 s
  // dwell plus about twelve metres of walking is roughly eighteen seconds, and the sign going off
  // while a member of crew is still working her way aft looks like she is behind rather than like
  // the aeroplane is early.
  // The descent is 17 s and not 13 because two announcements have to fit inside it — the one
  // telling you it has begun and the goodbye — and at 13 s the farewell was still being read out
  // when the wheels touched, so the last thing the captain says in the game was cut off by the
  // landing. Four seconds buys it 1.7 s of clear air before touchdown.
  // Gate-to-gate rather than four abstract blocks. The short ground phases are long enough for
  // their sound and visual cues to register, while the useful cabin time remains in climb/cruise.
  const PHASES = [
    ['pushback', 7], ['taxi', 10], ['takeoff', 8], ['climb', 21],
    ['cruise', 34], ['descend', 14], ['approach', 12], ['landing', 6], ['taxiIn', 9],
  ];
  let phase = 'gate', speed = 0, beltOn = 1, scroll = 0, shake = 0;
  let phaseT = 0, phaseI = -1, said = new Set(), fired = new Set();
  // ---- turbulence. Not a constant wobble: air is smooth for a while and then it is not, and the
  // difference between those two states is most of what being in an aeroplane feels like. `chop` is
  // the current bump, decaying; `nextChop` is when the next one is due. Rough on the way up and the
  // way down, where you are in the weather, and only occasional at altitude, where you are above it.
  let chop = 0, nextChop = 0, roughOn = false;
  // How far through the current phase, and how far through the whole flight. Both are read by the
  // window view and the bulkhead display, and both are derived from the sequence every frame rather
  // than counted separately, so nothing out of the window can disagree with the engine note.
  let phaseU = 0, flightU = 0;
  // The ground scrolls on its own clock, not the cloud one: on the apron you are doing walking pace
  // and the concrete crawls, while the cloud at altitude has to shift to read as speed at all.
  let groundScroll = 0;
  // How much of the cabin lighting is on. Dimmed for take-off and landing, which is the single most
  // recognisable thing a cabin does, and full at the gate and at cruise.
  let lightK = 1, lightWant = 1;

  function setBelt(on) {
    beltOn = on ? 1 : 0;
    for (const p of beltLamps) {
      p.color = beltOn ? col.amber : col.panelD;
      p.glow = beltOn ? .42 : .05;
    }
  }
  // Which of the six the aeroplane is in. `speed` is 0 to 1 and is what the engine bed, the window
  // scroll and the shake all run off, so the room cannot get out of step with itself.
  function setPhase(p) {
    phase = p;
    phaseT = 0;
    phaseI = PHASES.findIndex(q => q[0] === p);
    if (p === 'gate' || p === 'arrived') { setBelt(false); speed = 0; }
    if (p === 'gate') {
      equipment.tray = false; equipment.reading = false; equipment.air = false;
      equipment.screen = true; equipment.bag = true; equipment.recline = false;
      equipment.shade = false; equipment.shadeManual = false; equipment.charging = false;
      setEquipmentAt(mine);
    }
    if (p === 'pushback' || p === 'taxi' || p === 'takeoff' || p === 'climb'
      || p === 'descend' || p === 'approach' || p === 'landing' || p === 'taxiIn') setBelt(true);
    if (p === 'cruise') setBelt(false);
  }
  // Push off. Called by the game once you are actually in your own seat, because a briefing that
  // starts while you are still stowing a bag in the aisle is a briefing about somebody else.
  function startFlight() {
    if (phase !== 'gate') return false;
    said = new Set(); fired = new Set();
    setPhase('pushback');
    return true;
  }
  const flying = () => phase !== 'gate' && phase !== 'arrived' && phase !== 'landed';
  // Where your own seat is, so it can be picked out of forty-two identical ones. `id` is the string
  // off the boarding card — 21A — and an unknown one simply highlights nothing.
  let mine = null;
  function setMySeat(id) {
    mine = SEATS.find(s => s.id === id) || null;
    for (const s of SEATS) {
      const on = s === mine;
      s.th.sentence = on ? '这是我的座位。' : '这是我的座位吗？';
      s.th.tr = on ? 'This is my seat.' : 'Is this my seat?';
      // Three things at once, because one of them is not enough in a cabin this brown: the insert
      // goes jade, the headrest strip lights up, and — the part that actually does the work — the
      // seat gets a label group of its own. Labels are deduplicated per group and there are
      // forty-two seats in one group, so only the nearest of them is ever drawn; a group with one
      // member in it is a label that hangs over your seat from the far end of the cabin.
      // The crown is the piece that matters. The gold insert faces the person sitting in the seat,
      // so colouring it marks a surface nobody walking down the aisle can see — which is what the
      // first version of this did, and the marked seat was invisible from every standing position in
      // the cabin. The crown is what you look at from behind, so the crown is what changes.
      if (s.crown) s.crown.color = on ? [...col.mineShell] : [...col.crown];
      if (s.shell) s.shell.color = on ? [...col.mineShell] : [...col.shell];
      if (s.mark) {
        s.mark.color = on ? [...col.mineMark] : [...col.crown];
        s.mark.glow = on ? .55 : 0;
      }
      s.th.labelGroup = on ? 'cabin-myseat' : 'cabin-seats';
    }
    // The call button follows your seat, and a new seat means any outstanding call is off.
    setBellAt(mine);
    setBell(false);
    setEquipmentAt(mine);
    // And so does the moving map, onto the back of whatever is in front of you.
    setMapAt(mine);
    setMapDest(destName);
    // The four aisle placards on your row, lit. Four rather than one because you may come down
    // either aisle and your seat may be in any block, and a cue you can only see from one side of
    // the cabin is a cue that is missing half the time.
    for (const t of rowTags) {
      const on = mine && Math.abs(t.z - mine.z) < .01;
      // The digits on the placard stay cream and just get brighter; it is the plate behind them that
      // changes colour, so a lit placard reads as a number on a blue ground rather than as blue text.
      if (t.glyph) { t.p.glow = on ? .55 : .16; continue; }
      t.p.color = on ? [...col.mineMark] : [...col.crownL];
      t.p.glow = on ? .70 : 0;
    }
    // And a pool of light on the floor beside it, which is what you see first if the seat itself is
    // behind a row of headrests.
    if (minePool) {
      minePool.a = mine ? .20 : 0;
      if (mine) minePool.m = M.trs(mine.aisle * .74, .022, mine.z, 0, 1.5, 1, 1.5);
    }
    return mine;
  }
  const mySeat = () => mine;
  const seatOf = id => SEATS.find(s => s.id === id) || null;

  // The view. On the ground the windows show the apron and the haze band sits on the horizon; in
  // the air they show sky over a cloud deck, and the clouds go aft at whatever the aeroplane is
  // doing. Nothing out there is going anywhere — it is the clouds that move, which from inside is
  // the same thing and a great deal cheaper than moving the aeroplane.
  // How high the aeroplane is: 0 on the ground, 1 at cruise. Everything out of the window is a
  // function of this one number, which is why it is worth naming — the sky colour, where the horizon
  // sits, whether there is any ground left to see, whether there is cloud in the way of it, and
  // whether the shades are down. Read off the phase and its progress rather than integrated, so it
  // cannot drift out of step with the sequence or with the engine note.
  const altOf = () => phase === 'takeoff' ? phaseU * .06
    : phase === 'climb' ? .06 + phaseU * .94
    : phase === 'cruise' ? 1
    : phase === 'descend' ? 1 - phaseU * .76
    : phase === 'approach' ? .24 * (1 - phaseU) + .02
    : phase === 'landing' ? .02 * (1 - phaseU)
    : 0;
  // Mixes b into a and leaves the result in the prop's own colour array. The panes were built with
  // `[...col.sky]` rather than the palette entry itself precisely so this can write into them
  // without allocating three floats per pane per frame — and without repainting the palette, which
  // is shared with every other room.
  const mixInto = (p, a, b, k) => {
    for (let i = 0; i < 3; i++) p.color[i] = a[i] + (b[i] - a[i]) * k;
  };
  const GONE = M.trs(0, -99, 0, 0, 0, 0, 0);
  const GREY = C('#b9c4c8');

  function setView(t, dt) {
    const alt = altOf();
    const air = alt > .02;
    // Lift bends a wing upward, turbulence lets it breathe. Only a few centimetres at cabin scale,
    // but against the horizon that slow flex is one of the clearest proofs this is an aircraft.
    const wingFlex = alt * .045 + chop * .055 + Math.sin(t * 2.1) * chop * .018;
    for (const p of wingProps) {
      p.m = M.mul(M.trans(0, wingFlex, 0), p.m0);
      p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    }
    const rainK = weatherWet * Math.max(0, 1 - alt / .48);
    for (let i = 0; i < rainDrops.length; i++) {
      rainDrops[i].alpha = rainK * (.34 + (i % 3) * .13);
      rainDrops[i].glow = .06 + rainK * .12;
    }
    // ---- the sky. Flat overcast grey while you are still on the concrete, because what you can see
    // of the sky out of a window seat on the ground is not sky; then blue, deepening as you climb.
    // Two panes a side: the tall one is the sky above the horizon and takes the zenith colour, the
    // short band under it is the horizon and takes the horizon colour. Both come off the game's own
    // daylight curve, which is what gets dawn and dusk for nothing — and then the higher you are the
    // deeper the zenith goes, because that is a thing altitude does that the ground curve cannot know.
    skyPanes.forEach((p, i) => {
      const horizonBand = i % 2 === 1;
      mixInto(p, GREY, horizonBand ? skyLow : skyTop, Math.min(1, alt * 6));
      if (!horizonBand && alt > .30) mixInto(p, p.color, col.skyNight, (alt - .30) / .70 * .35);
      // Toned down from .10+.09. These are ten-metre emissive slabs a few centimetres outside a thin
      // wall, and at the old level every window in the cabin blew to flat white — a bright rectangle
      // with no sky in it, which is the one thing a window must not be. Low enough now that the pane
      // shows the colour that was mixed into it.
      p.glow = (.045 + alt * .05) * (1 - nightK * .82);
    });
    const lightning = weatherKind === 'storm' && alt < .58
      && ((t * 1.73) % 8.4 < .09 || ((t * 1.73) % 8.4 > .20 && (t * 1.73) % 8.4 < .27));
    if (lightning) for (const p of skyPanes) p.glow = .72;
    // ---- stars. Only at altitude, because from the apron you are looking at airport floodlights, and
    // only once it is properly dark.
    const starK = nightK * Math.min(1, Math.max(0, (alt - .18) / .30));
    for (const p of stars) {
      // Collapsed rather than made transparent when they are not wanted. These sit outside the glass,
      // in front of the sky panes, and a transparent prop still writes depth — twenty-six of them at
      // alpha 0 is twenty-six small holes punched in a daylight sky.
      if (starK <= .02) {
        if (p.cy !== -99) { p.m = GONE; p.cx = 0; p.cy = -99; p.cz = 0; p.alpha = 0; }
        continue;
      }
      if (p.cy === -99) { p.m = p.m0; p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14]; }
      p.alpha = starK * .95;
    }
    // ---- the ground. Concrete on the apron, farmland once the wheels are up, and from about a third
    // of the way up, six kilometres of haze between you and it — so it drains toward the colour of
    // the sky and then goes out altogether. The band shrinks as it goes, which is the actual reason
    // the world looks flatter the higher you are.
    const hazed = Math.max(0, (alt - .30) / .70);
    for (const p of groundPanes) {
      mixInto(p, col.apron, col.ground, Math.min(1, alt * 8));
      mixInto(p, p.color, col.sky, hazed * .85);
      mixInto(p, p.color, col.groundNight, nightK);
      // Collapsed rather than faded once the cloud deck is under you: a transparent prop still writes
      // depth and would punch a hole in the sky behind it.
      p.m = alt > .90 ? GONE
        : M.trs(p.x0, .52 - hazed * .22, 0, 0, .05, .74 * (1 - hazed * .55), RZ * 2);
      p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    }
    // ---- and the things standing on it, which are the whole point of the ground band. At the gate
    // they are still and the aeroplane is parked; the instant they start sliding aft it is taxiing.
    // Before this the taxi was audible and completely invisible.
    for (const g of groundBits) {
      if (alt > .55) { g.p.m = GONE; g.p.cy = -99; continue; }
      const z = ((g.z0 + groundScroll + RZ) % (RZ * 2 + 4)) - RZ;
      g.p.m = M.mul(M.trans(0, 0, z - g.z0), g.p.m0);
      g.p.cx = g.p.m[12]; g.p.cy = g.p.m[13]; g.p.cz = g.p.m[14];
      g.p.alpha = Math.max(0, 1 - Math.max(0, (alt - .30) / .25));
    }
    // ---- the city underneath, at night, while there is still ground to see it on. This is the good
    // bit: on a 21:15 departure the climb is a floor of orange going past under the wing.
    const cityK = nightK * Math.max(0, Math.min(1, 1 - Math.abs(alt - .34) / .34));
    for (const c of cityLights) {
      if (cityK <= .02) { c.p.m = GONE; c.p.cy = -99; c.p.alpha = 0; continue; }
      const z = ((c.z0 + groundScroll * .55 + RZ) % (RZ * 2 + 4)) - RZ;
      c.p.m = M.mul(M.trans(0, 0, z - c.z0), c.p.m0);
      c.p.cx = c.p.m[12]; c.p.cy = c.p.m[13]; c.p.cz = c.p.m[14];
      c.p.alpha = cityK;
    }
    // The destination appears below the wing on approach, then grows and slows toward the gate.
    const destK = (phase === 'approach' || phase === 'landing' || phase === 'taxiIn')
      ? Math.max(0, Math.min(1, 1 - alt * 2.8)) : 0;
    for (const d of destinationBits) {
      if (destK <= .02) { d.p.m = GONE; d.p.cy = -99; d.p.alpha = 0; continue; }
      const z = ((d.z0 + groundScroll * .72 + RZ) % (RZ * 2 + 2)) - RZ;
      let scaleY = 1;
      if (destStyle.shape === 'hills') scaleY = .55 + (d.i % 5) * .12;
      if (destStyle.shape === 'mountain' && d.i === 8) scaleY = 2.8;
      if (destStyle.shape === 'ocean') scaleY = .24;
      d.p.m = M.mul(M.trans(0, 0, z - d.z0), M.mul(M.scale(1, scaleY, 1), d.p.m0));
      d.p.cx = d.p.m[12]; d.p.cy = d.p.m[13]; d.p.cz = d.p.m[14]; d.p.alpha = destK;
      d.p.glow = .04 + nightK * .22 * (d.i % 3 === 0 ? 1 : .35);
    }
    const trafficOn = phase === 'cruise' && phaseU > .34 && phaseU < .52;
    for (const p of trafficProps) {
      if (!trafficOn) { p.m = GONE; p.cy = -99; continue; }
      const z = -RZ + ((phaseU - .34) / .18) * RZ * 2;
      p.m = M.mul(M.trans(0, Math.sin(t * 1.4) * .015, z), p.m0);
      p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    }
    // ---- the beacon and the strobe. Both run whenever the aeroplane is working, and both are lights
    // rather than paint, so they read at night and are just about visible by day.
    const running = phase !== 'gate' && phase !== 'landed';
    // The beacon is a rotating light seen from the side: on for a moment, off for most of a second.
    const beat = running ? Math.pow(Math.max(0, Math.sin(t * 3.2)), 6) : 0;
    for (const p of beaconProps) p.glow = beat * (.55 + nightK * .45);
    // Two cracks in quick succession, then a gap — which is what a strobe actually does and is why it
    // reads as an aeroplane and not as a lamp.
    const ph = running ? (t * 1.15) % 1 : -1;
    const flash = ph < 0 ? 0 : (ph < .06 || (ph > .13 && ph < .19)) ? 1 : 0;
    // Capped at 1. A strobe is the brightest thing on an airframe but the renderer's glow is not a
    // headroom knob, and at 1.4 this clipped to a white blob with no shape in it.
    for (const p of strobeProps) p.glow = flash * (.78 + nightK * .22);
    // ---- cloud. None on the ground, none on the first part of the climb, thickest at altitude,
    // which is the order you actually meet it in.
    const cloudK = Math.max(0, Math.min(1, (alt - .28) / .34));
    // ---- and going through it. There is a height at which you are not above the deck or below it,
    // you are in it, and the window goes white and stays white for a few seconds. It is the most
    // recognisable moment of any approach and the cloud simply used to fade out through it.
    // Narrow, centred on the deck, and it applies going up as well as coming down.
    const inDeck = Math.max(0, 1 - Math.abs(alt - .40) / .085);
    for (const p of deckProps) {
      if (inDeck <= .02) {
        if (p.cy !== -99) { p.m = GONE; p.cx = 0; p.cy = -99; p.cz = 0; p.alpha = 0; }
        continue;
      }
      if (p.cy === -99) { p.m = p.m0; p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14]; }
      p.alpha = inDeck * .96;
      p.glow = .34 * inDeck * (1 - nightK * .7);
    }
    for (const c of clouds) {
      if (!c.p.m0) continue;
      if (cloudK <= 0) { c.p.m = GONE; c.p.cy = -99; c.p.alpha = 0; continue; }
      const z = ((c.z0 + scroll + RZ) % (RZ * 2 + 4)) - RZ;
      c.p.m = M.mul(M.trans(0, 0, z - c.z0), c.p.m0);
      c.p.cx = c.p.m[12]; c.p.cy = c.p.m[13]; c.p.cz = c.p.m[14];
      c.p.alpha = cloudK;
    }
    // ---- the shades. Some down at altitude, every one of them up for the approach, because that is
    // a thing crew actually make everybody do. Eased rather than snapped: a shade is a thing a hand
    // moves, and twenty-four of them flicking at once reads as a fault in the game.
    const want = alt > .55 ? 1 : 0;
    for (const sl of shadeSlats) {
      const personal = equipment.shadeManual && mine
        && Math.sign(mine.x || mine.aisle) === sl.s && Math.abs(sl.z - mine.z) < .48;
      const target = personal ? (equipment.shade ? 1 : 0) : want && sl.r < .45 ? 1 : 0;
      sl.at += (target - sl.at) * Math.min(1, (dt || 0) * 1.1);
      const h = .06 + sl.at * .42;
      sl.p.m = M.trs(sl.s * (RX - .045), 1.53 - sl.at * .21, sl.z, 0, .06, h, .32);
      sl.p.cx = sl.p.m[12]; sl.p.cy = sl.p.m[13]; sl.p.cz = sl.p.m[14];
    }
    for (const p of wingProps) p.alpha = air ? 1 : .35;
  }

  // ---- the bulkhead display. Slots written into, not text rebuilt: see `slotsInto`.
  const ALT_CRUISE = 10600;
  // How long this flight actually is, in minutes. Set by whoever put you on the aeroplane — see
  // `Cabin.setBlock` and `boardCabin` — because it is a fact about the flight and not about the room:
  // Shanghai is two hours and New York is fourteen, and the display used to count down 130 minutes to
  // both of them. Defaulted to the Shanghai service, which is the one the briefing is written for.
  let blockMins = 130;
  // Where this one is going. Set by whoever put you aboard, and defaulted to the service the briefing
  // is written for so a cabin reached without a ticket still says something true.
  let destName = '上海';
  function slotsInto(row, str) {
    // Centred in the row, so a three-character message does not sit hard against the left edge.
    const pad = Math.max(0, Math.floor((row.length - str.length) / 2));
    row.forEach((p, i) => {
      const ch = str[i - pad];
      // A blank is a parked glyph and not a space: a transparent quad still writes depth.
      if (!ch || ch === ' ') { p.m = GONE; p.cx = 0; p.cy = -99; p.cz = 0; return; }
      p.ch = ch;
      p.m = p.m0; p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    });
  }
  function writeInfo() {
    const alt = altOf();
    // To the nearest hundred metres, the way a cabin display rounds it.
    const m = Math.round(alt * ALT_CRUISE / 100) * 100;
    // On the runway it says so rather than reading 0米, which looks like a display that has not
    // been plugged in. Tested on the altitude and not the phase, so it covers the taxi and the first
    // seconds of the roll both.
    slotsInto(infoAlt, alt <= .005 ? '在地面' : m + '米');
    slotsInto(infoEta, phase === 'landed' || phase === 'arrived' ? '已到达'
      : '剩余' + Math.max(0, Math.round((1 - flightU) * blockMins)) + '分');
  }

  let lastT = 0;
  function tick(t, body, clock) {
    // Real elapsed seconds, clamped. A tab left in the background hands back a dt of several
    // seconds on the frame it comes forward, which would step the whole flight in one go.
    // 0.05 and not 0.1, and it has to be the same number the frame loop clamps its own dt to — see
    // `const dt = Math.min(0.05, ...)` in game.js. The clamp is here so a backgrounded tab cannot
    // step the whole flight on the frame it comes forward, and 0.05 does that just as well. What the
    // mismatch did was let the aeroplane outrun the people in it: on any frame slower than 50 ms the
    // sequence advanced up to twice as far as the crew walking down the aisle, so on a machine
    // dropping frames the service round never finished and a member of crew was still standing in the
    // aisle with a cart when the wheels touched. It is invisible at 60 fps, where both get the true
    // dt and agree, which is why it took a headless harness — where a frame takes a second — to show
    // it. Two clocks for one room is the bug; the number is just where it was written down.
    const dt = Math.min(.05, Math.max(0, t - lastT));
    lastT = t;
    const out = [];

    // ---- the sequence. Each phase runs for its own number of seconds and then hands over.
    if (phaseI >= 0) {
      const [name, secs] = PHASES[phaseI];
      phaseT += dt;
      const u = Math.min(1, phaseT / secs);
      // The captain, on the intercom, at the points in the flight where he actually speaks.
      CAP_AT.forEach(([ph, at, line], i) => {
        if (ph !== name || u < at || said.has(i)) return;
        said.add(i);
        out.push('cap:' + line);
      });
      // 安全演示. Both crew come to the front of the cabin and read the safety demonstration off
      // their own hands while the captain is still welcoming you aboard. It goes out early in the
      // taxi so that it is over before the roll, which is when it is actually done, and it is the
      // one thing two members of crew do in unison rather than one at each end of the cabin.
      if (name === 'pushback' && u >= .18 && !fired.has('demo')) {
        fired.add('demo'); out.push('crew:demo');
      }
      // The cabin crew. The belt check goes down the aisle while the briefing is being read, which
      // is the whole point of the timing: they are two halves of the same two minutes.
      if (name === 'climb' && u >= .10 && !fired.has('check')) {
        fired.add('check'); out.push('crew:check');
      }
      // And the trolley, once the belt sign is off and the aeroplane is level.
      // .12 and not .22. The service is two crew walking the length of the cabin and stopping at
      // every row, which measures about 27 seconds against a 34-second cruise — starting a fifth of
      // the way in left it two seconds short of getting the carts home before the descent, and a
      // descent handing out the secure round would take the carts off them mid-aisle.
      if (name === 'cruise' && u >= .12 && !fired.has('snack')) {
        fired.add('snack'); out.push('crew:snack');
      }
      // One unscripted cabin moment per trip. The game chooses the actual situation from the
      // destination and weather, so it varies without interrupting every flight repeatedly.
      if (name === 'cruise' && u >= .64 && !fired.has('cabin-event')) {
        fired.add('cabin-event'); out.push('event:cabin');
      }
      // The cabin-secure round on the way down: cups collected, trays stowed, and somebody looking
      // at whether you are in your seat. It is the third thing crew do on a flight and the cabin
      // used to go quiet for the whole descent without it.
      // Early in the descent, not a seventh of the way in. The secure round has to be *finished*
      // before the wheels touch — crew are strapped in for a landing — and at .14 of a 17-second
      // descent there was not time left to walk the cabin and get back.
      if (name === 'descend' && u >= .02 && !fired.has('secure')) {
        fired.add('secure'); secureEquipment(); out.push('crew:secure');
      }
      // ---- the mechanical noises, at the points in the flight where they actually happen. These
      // are the cues that make the sequence read as an aeroplane rather than as a room with a
      // timetable: the flaps run out before the roll, the gear comes up shortly after rotation, it
      // goes back down on the approach, and the wheels hit at the end.
      const cue = (k, at) => {
        if (u < at || fired.has(name + k)) return;
        fired.add(name + k); out.push('cue:' + k);
      };
      if (name === 'pushback') { cue('door', .05); cue('pushback', .30); }
      if (name === 'taxi') cue('flap', .30);
      if (name === 'takeoff') { cue('spool', .08); cue('runway', .25); }
      if (name === 'climb') cue('gear', .16);
      if (name === 'approach') { cue('flap', .12); cue('gear', .44); }
      if (name === 'landing') { cue('touchdown', .62); cue('reverse', .68); }
      if (name === 'taxiIn') cue('brake', .78);
      if (u >= 1) {
        if (phaseI < PHASES.length - 1) {
          setPhase(PHASES[phaseI + 1][0]);
          out.push('phase:' + phase);
          if (phase === 'cruise') out.push('belt:off');
          if (phase === 'descend') out.push('belt:on');
        } else {
          setPhase('arrived'); phaseI = -1;
          out.push('belt:off'); out.push('cue:door'); out.push('arrive:gate');
        }
      }
    }

    // How hard the aeroplane is working. Climb is the loud one, cruise is steady, the gate is
    // nothing at all — and the number is shared with the audio so the two agree by construction.
    const want = phase === 'pushback' ? .16 : phase === 'taxi' || phase === 'taxiIn' ? .28
      : phase === 'takeoff' ? 1 : phase === 'climb' ? .86
      : phase === 'cruise' ? .58 : phase === 'descend' ? .46
      : phase === 'approach' ? .38 : phase === 'landing' ? .72 * (1 - phaseU) + .22 : 0;
    speed += (want - speed) * Math.min(1, dt * 1.1);
    scroll += speed * 9.0 * dt;
    // The apron only moves when the aeroplane is rolling on it, and it moves at the speed of a bus
    // rather than the speed of the cloud deck.
    groundScroll += (phase === 'pushback' ? -1.2
      : phase === 'taxi' || phase === 'taxiIn' ? 2.6
      : phase === 'takeoff' ? 14.0
      : phase === 'climb' ? 7.0
      : phase === 'landing' ? 11.0 * (1 - phaseU) + 2.5 : 0) * dt;
    // Where we are in this phase, and in the flight as a whole. Cheap — four entries — and doing it
    // here means the view and the display cannot be a frame out of step with the sequence.
    {
      let done = 0, total = 0;
      for (let i = 0; i < PHASES.length; i++) {
        if (i < phaseI) done += PHASES[i][1];
        total += PHASES[i][1];
      }
      if (phaseI >= 0) { done += phaseT; phaseU = Math.min(1, phaseT / PHASES[phaseI][1]); }
      flightU = phase === 'arrived' || phase === 'landed' ? 1
        : total ? Math.min(1, done / total) : 0;
    }
    setView(t, dt);
    writeInfo();
    setLav();
    setMapPlane();
    // ---- turbulence. A bump arrives, peaks in about a fifth of a second and dies away over a
    // couple of seconds, and the interval between them is what says which part of the flight you
    // are in. Nothing at the gate, obviously.
    const rough = (phase === 'takeoff' || phase === 'landing' ? 1
      : phase === 'climb' ? .82 : phase === 'descend' || phase === 'approach' ? .72
      : phase === 'cruise' ? .30
      : phase === 'pushback' || phase === 'taxi' || phase === 'taxiIn' ? .18 : 0)
      * (1 + weatherWind * .35);
    if (rough > 0) {
      if (!nextChop) nextChop = t + 2;
      if (t >= nextChop) {
        // Rough air comes in patches, so the gap is short when it is rough and long when it is not.
        chop = Math.min(1, chop + (.35 + rnd() * .65) * rough);
        nextChop = t + (rough > .6 ? 1.1 + rnd() * 2.6 : 4 + rnd() * 9);
      }
    }
    chop = Math.max(0, chop - dt * .55);
    // ---- and when it is genuinely rough, the aeroplane says so. The belt sign comes on, somebody
    // tells you to sit down, and it goes off again when the air smooths out — which is the one thing
    // that happens on a flight because of what the flight is doing rather than because of where it has
    // got to in a script. Hysteresis on purpose: a threshold with no gap under it would chime the
    // sign a dozen times through one patch of rough air.
    if (!roughOn && chop > .62) {
      roughOn = true;
      out.push('rough:on');
      if (phase === 'cruise') setBelt(true);
    } else if (roughOn && chop < .16) {
      roughOn = false;
      out.push('rough:off');
      // Only the cruise had the sign off to begin with; on the way up or down it stays on regardless.
      if (phase === 'cruise') setBelt(false);
    }
    // A cabin at altitude is never quite still even between bumps. Two slow sines and a fast one,
    // all tiny: the steady part is measured in millimetres and it is the difference between a room
    // and a photograph of a room. The bump on top of it is measured in centimetres.
    shake = speed * .0045 + chop * .028;
    // ---- the lights. Down for the take-off roll and the approach, up at the gate and at cruise.
    lightWant = phase === 'pushback' || phase === 'taxi' || phase === 'takeoff'
      || phase === 'climb' ? .34
      : phase === 'descend' || phase === 'approach' || phase === 'landing' ? .42 : 1;
    // And a night cruise is dimmed for sleeping, which is the single most recognisable difference
    // between a day flight and a night one from inside the cabin. The screens and the reading lights
    // then carry the room, which is exactly what they do at three in the morning.
    lightWant *= 1 - nightK * .55;
    lightK += (lightWant - lightK) * Math.min(1, dt * 1.4);
    const j = Math.sin(t * 1.7) * .6 + Math.sin(t * 4.3) * .3 + Math.sin(t * 11.0) * .1;
    // ---- 情景照明. What colour the ceiling is washed, which is the thing that makes the room read as
    // a modern cabin rather than as a beige tube. It follows the flight, and at night it goes indigo
    // over the top of whatever the phase asked for — the two are multiplied rather than chosen between,
    // because a night approach is still an approach.
    const mood = phase === 'gate' || phase === 'pushback' || phase === 'taxi' ? col.moodBoard
      : phase === 'takeoff' || phase === 'climb' ? col.moodClimb
      : phase === 'descend' || phase === 'approach' || phase === 'landing' ? col.moodDescend
      : col.moodCruise;
    for (const p of coveProps) {
      mixInto(p, col.lit, mood, .55);
      mixInto(p, p.color, col.moodNight, nightK * .70);
      p.glow = p.glow0 * (.18 + lightK * .82);
    }
    // The ceiling itself, tinted. Gently — a quarter of the way to the mood colour by day, further at
    // night, because a night cabin really is blue rather than slightly blue.
    for (const p of ceilPanels) {
      mixInto(p, col.ceil, mood, .40 * (.35 + lightK * .65));
      mixInto(p, p.color, col.moodNight, nightK * .55);
    }
    for (const p of washProps) {
      mixInto(p, mood, mood, 0);
      mixInto(p, p.color, col.moodNight, nightK * .80);
      // The wash is brightest when the cabin lights are up; dimmed for take-off it is nearly gone,
      // which is correct — the mood lighting goes down with everything else.
      p.glow = p.glow0 * (.25 + lightK * .95);
    }
    // ---- and the twelve real lamps in the ceiling, which is where the mood lighting stops being a
    // painted strip and becomes the colour the room is actually lit by. The cove props above and
    // these are two halves of one fitting: the slot you can see, and the light it throws.
    //
    // Pulled less far toward the mood than the wash is. A wash is the colour of the slot and can be
    // frankly blue; the light in the room is a warm white the slot has tinted, and taking it all the
    // way to #4a7fc0 at boarding would have put twenty-two faces under a photographic gel.
    // Night is the exception and goes further, because a night cabin really is blue.
    for (const L of coveLights) {
      for (let i = 0; i < 3; i++) {
        const warm = COVE_LIGHT[i] + (mood[i] - COVE_LIGHT[i]) * .34;
        L.col[i] = warm + (col.moodNight[i] - warm) * (nightK * .50);
      }
      // Never quite out. Even a cabin dimmed for landing has the coves at a trickle, and a point
      // light at zero power is a row of surfaces that snap flat rather than fade.
      L.power = .025 + lightK * .115;
    }
    for (const p of readLamps) p.glow = (.05 + (1 - speed) * .02) * (.4 + lightK * .6);
    // The screens stay on when the lights go down — they are the only thing lit in a dimmed cabin,
    // which is exactly why a dimmed cabin looks the way it does.
    for (const p of screens) p.glow = phase === 'gate' ? .03
      : (.07 + j * .006) * (1 + (1 - lightK) * 1.5);
    // The belt signs brighten for a second when they change, the way a real one chimes and catches
    // the eye. Driven off phaseT so it happens on the change and not on a timer of its own.
    const fresh = Math.max(0, 1 - phaseT / 1.2);
    for (const p of beltLamps) p.glow = (beltOn ? .42 : .05) + (beltOn ? fresh * .35 : 0);
    return out.length ? out : null;
  }

  const PHASE_NAME = {
    gate:['登机','boarding'], pushback:['推出','pushback'], taxi:['滑行','taxi'],
    takeoff:['起飞','take-off'], climb:['爬升','climb'], cruise:['巡航','cruise'],
    descend:['下降','descent'], approach:['进近','approach'], landing:['着陆','landing'],
    taxiIn:['进港','taxi to gate'], arrived:['已到达','arrived'], landed:['已到达','arrived'],
  };
  // A small body response shared by the player and seated passengers. It is deliberately posture,
  // not camera shake: take-off pushes shoulders into the seat, braking brings them forward, and a
  // bump makes hands grip the armrests. That is what makes other people prove the aircraft moved.
  function motionPose(g, who, now) {
    const s = ((who || 0) % 7) * .31;
    const bump = chop * Math.sin(now * .013 + s);
    if (!who && equipment.recline) g.recline = (g.recline || 0) + .13;
    if (phase === 'takeoff' || phase === 'climb') g.recline = (g.recline || 0) + .07 + speed * .04;
    if (phase === 'landing' || phase === 'taxiIn') g.torsoPitch = (g.torsoPitch || 0) + .06 * phaseU;
    g.torsoYaw = (g.torsoYaw || 0) + bump * .08;
    g.headYaw = (g.headYaw || 0) - bump * .12;
    if (chop > .30) {
      g.shL = Math.min(g.shL || 0, -.18); g.shR = Math.min(g.shR || 0, -.18);
      g.elbL = Math.min(g.elbL || 0, -1.05); g.elbR = Math.min(g.elbR || 0, -1.05);
      g.grip = Math.max(g.grip || 0, .80);
    }
    return g;
  }

  const api = B.finish({
    tick, setBelt, setPhase, startFlight, flying, setMySeat, mySeat, seatOf, SEATS,
    // How long this flight is. The captain's briefing is still the Shanghai one — it is baked audio
    // and it says 上海 and two hours ten out loud — but everything the room draws or counts comes
    // from here, so a fourteen-hour service counts down fourteen hours.
    setBlock(mins) { blockMins = Math.max(20, mins || 130); },
    blockMins: () => blockMins,
    // Where this aeroplane is going, for the map on the seat in front of you.
    setDest(name) {
      destName = String(name || ''); setMapDest(destName);
      destStyle = DEST_STYLE[destName] || DEST_STYLE['上海'];
      const c = C(destStyle.color), a = C(destStyle.accent);
      destinationBits.forEach((d, i) => {
        const use = i % 4 === 0 ? a : c;
        for (let k = 0; k < 3; k++) d.p.color[k] = use[k];
      });
    },
    // Read back off the map itself rather than recomputed, so a test checks what is drawn.
    map: () => ({
      on: !!mapBase,
      dest: mapDest.filter(g => g.cy > -50).map(g => g.ch).join(''),
      planeAt: mapPlane && mapPlane.cy > -50 ? +mapPlane.m[12].toFixed(3) : null,
      inCloud: deckProps.some(p => p.alpha > .3),
    }),
    // Where a trolley is. Called every frame from the crew's own position while a round is running,
    // and with `show` false the rest of the time. `i` is which aisle: 0 is port, 1 starboard.
    trolley(i, x, z, yaw, show) {
      const g = trolleys[i];
      if (!g) return;
      if (!show) {
        if (g[0].cy !== -99) for (const p of g) { p.m = GONE; p.cx = 0; p.cy = -99; p.cz = 0; }
        return;
      }
      const base = M.trs(x, 0, z, yaw, 1, 1, 1);
      for (const p of g) {
        p.m = M.mul(base, p.m0);
        p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
      }
    },
    trolleyShown: () => trolleys.filter(g => g[0].cy !== -99).length,
    trolleyState: () => trolleys.map((g, i) => ({
      aisle: i,
      shown: g[0].cy !== -99,
      x: g[0].cy !== -99 ? +g[0].m[12].toFixed(3) : null,
      z: g[0].cy !== -99 ? +g[0].m[14].toFixed(3) : null,
    })),
    // 'free', 'busy' (somebody is in there) or 'belted' (the sign is on and you are not going).
    lavState,
    // The call button over your own seat: whether it is lit, and turning it on and off.
    setBell, bellLit: () => bellOn,
    toggleEquipment, secureEquipment, motionPose,
    equipment: () => ({ ...equipment, secure:securePhase() }),
    // What time it is outside. Handed to every interior in the game by the frame loop; this room was
    // the only one that threw it away, so a 21:15 departure to Bangkok looked like lunchtime.
    setNight(n, zenith, horizon) {
      nightK = Math.max(0, Math.min(1, n || 0));
      // The sky out of the window is the real one for this minute, not a blue and a navy with a fade
      // between them: dawn is orange at the horizon and still dark overhead, and that is a thing you
      // can only see from an aeroplane at six in the morning.
      if (zenith) for (let i = 0; i < 3; i++) skyTop[i] = zenith[i];
      if (horizon) for (let i = 0; i < 3; i++) skyLow[i] = horizon[i];
    },
    setWeather(kind, wet, wind) {
      weatherKind = kind || 'clear';
      weatherWet = Math.max(0, Math.min(1, wet || 0));
      weatherWind = Math.max(0, Math.min(1, wind || 0));
    },
    night: () => +nightK.toFixed(3),
    // What the two window panes are actually painted, for the harness: the tall one and the band under
    // it, read off the props rather than recomputed.
    skyColours: () => ({
      high: skyPanes[0].color.map(v => +v.toFixed(3)),
      horizon: skyPanes[1].color.map(v => +v.toFixed(3)),
    }),
    // Where the camera should be nudged this frame. Three incommensurate frequencies per axis so the
    // motion never reads as a loop, scaled by how hard the aeroplane is working and by whatever
    // turbulence is going on. Handed out rather than applied here because the camera lives in
    // game.js and a scene has no business reaching into it.
    shakeAt(t) {
      const a = shake;
      if (a < 1e-5) return null;
      return [Math.sin(t * 37.1) * a * .55 + Math.sin(t * 11.3) * a * .45,
              Math.sin(t * 43.7) * a + Math.sin(t * 7.9) * a * .5,
              Math.sin(t * 29.3) * a * .35];
    },
    shake: () => +shake.toFixed(5), chop: () => +chop.toFixed(3),
    // `lights` has to answer to two callers that want different things from it, and the collision
    // is not hypothetical — it silently deleted every lamp in this cabin the first time the row
    // above was declared.
    //
    // `B.finish` returns its own `lights`, the array of real lamps it collected, and then spreads
    // these extras *over* it. game.js reads `scene.lights` as that array: it tests `.length` and
    // then `.filter`s it down to the eight nearest the eye. A plain `() => lightK` passes the
    // truthiness test and then fails the `.length` one, because the length of a zero-argument
    // function is 0 — so the guard took its else branch, `R.setLights(null)` ran every frame, and
    // the cabin was lit by nothing while looking exactly as though it had been given twelve lamps.
    //
    // Meanwhile `.diag-cabin.js` calls `Cabin.lights()` for the dimmer level and has since long
    // before there were any lamps to confuse it with. Both are right, so this is both: the
    // accessor, carrying the two array properties game.js actually touches. `length` on a function
    // is configurable, which is the only reason this is possible rather than a rename.
    lights: (() => {
      const f = () => +lightK.toFixed(3);
      Object.defineProperty(f, 'length', { value: B.lights.length, configurable: true });
      f.filter = fn => B.lights.filter(fn);
      return f;
    })(),
    // And the lamps themselves, plainly, for anything that would rather ask than unpick the above.
    lamps: () => B.lights.map(l => ({ x: +l.x.toFixed(2), y: +l.y.toFixed(2), z: +l.z.toFixed(2),
      on: l.on !== false, power: +l.power.toFixed(3),
      col: l.col.map(v => +v.toFixed(3)) })),
    // What the flight deck says, in the order it says it. The bake reads this and game.js looks a
    // `cap:<i>` event up in it, exactly as it does with Metro.NOTICES and Airport.NOTICES.
    BRIEF, CAP_AT, PHASES, AISLE, ROWZ, BULK, GALLEY,
    // What is out of the window, for the harness: the altitude everything else is derived from, and
    // the two lines currently on the bulkhead display, read back off the glyphs rather than
    // recomputed so the test is checking what is actually drawn.
    view: () => ({
      alt: +altOf().toFixed(3), flightU: +flightU.toFixed(3), phase,
      phaseZh: (PHASE_NAME[phase] || [phase, phase])[0],
      phaseEn: (PHASE_NAME[phase] || [phase, phase])[1],
      speed: +speed.toFixed(3), belt: !!beltOn, weather: weatherKind,
      groundVisible: groundPanes.filter(p => p.cy > -50).length,
      groundMoving: groundBits.filter(p => p.p.cy > -50 && (p.p.alpha === undefined
        || p.p.alpha > .05)).length,
      groundScroll: +groundScroll.toFixed(2),
      cloudsVisible: clouds.filter(c => c.p.cy > -50 && c.p.alpha > .05).length,
      shadesDown: shadeSlats.filter(s => s.at > .5).length,
      night: +nightK.toFixed(2),
      starsOut: stars.filter(p => p.alpha > .05).length,
      cityBelow: cityLights.filter(c => c.p.alpha > .05).length,
      // Both flash, so what a test can ask is whether they ever light rather than whether they are
      // lit on the frame it happened to look.
      beaconGlow: +Math.max(...beaconProps.map(p => p.glow)).toFixed(3),
      strobeGlow: +Math.max(...strobeProps.map(p => p.glow)).toFixed(3),
      cabinLight: +lightK.toFixed(3),
      rough: roughOn,
      alt1: infoAlt.filter(p => p.cy > -50).map(p => p.ch).join(''),
      eta1: infoEta.filter(p => p.cy > -50).map(p => p.ch).join(''),
    }),
    // The row numbers and the seat letters that actually exist in here. Exported because the
    // boarding card has to name one of them: `seatRow` in game.js used to invent a row between 12
    // and 37 out of the departure time, and this cabin has six rows, so five cards in six sent the
    // player looking for a seat that was not on the aeroplane.
    ROWNUMS: ROWZ.map((_, i) => ROW0 + i), LETTERS,
    RX, RZ, H,
    // The window the shader throws daylight through, and it has to be ONE window rather than the
    // whole side of the aeroplane. Declared as hw: RZ to begin with — the full 10.4 m — which asked
    // the renderer to project direct sun through a slot the length of the cabin and washed the
    // entire room to white. A cabin has twenty-four small windows and the shader takes one opening,
    // so this is one of them, at the middle of the port side; the rest of the light in here is the
    // ceiling cove, which is also true of the real thing.
    WIN: { x: -RX, y: 1.28, z: 0, hw: .34, hh: .28 },
    // Read-only, for the harness.
    phase: () => phase, speed: () => +speed.toFixed(3), belt: () => beltOn,
    seatIds: () => SEATS.map(s => s.id),
    label: '客舱', labelK: '客舱 · on board',
    indoor: true, cutaway: true, near: .05, far: 60, expose: .88,
    // The cabin asks for its own camera, because the standard indoor one does not fit inside an
    // aeroplane. These are the numbers boarding already used for the walk to your seat; having the
    // room declare them means every other way in — a reload of a save made on board, most of all —
    // arrives with the same view instead of hanging the eye above the bins.
    camera: { pitch: .24, dist: 2.4, lookY: 1.15, maxDist: 3.6 },
    // You come in through the rear galley, looking up the cabin at six rows of seat backs and the
    // bulkhead beyond them — which is the view in the reference photograph.
    spawn: { x: -AISLE, z: GALLEY - .85, yaw: Math.PI },
    // The rear boundary is the visible front face of the .14 m galley wall.  clampMove applies
    // the body radius itself; subtracting another .34 here double-inset the room and trapped an
    // arrival in one aisle.  Keeping the authored floor to the wall face preserves exact visual
    // collision while leaving the real rear cross-aisle available at both .30 and .45 m radii.
    zones: [{ id: 'cabin', x0: -RX + .22, x1: RX - .22, z0: BULK + .34, z1: GALLEY - .07,
              light: [0, H - .30, 0] }],
    roomAt() { return this.zones[0]; },
  });

  // After `finish`, so every cloud is measured where it was built before its wrap starts.
  for (const c of clouds) c.p.m0 = c.p.m;
  // The trolley spheres were deliberately packed over the service aisles above. Mark the object
  // state parked only after `finish` has copied those reserved centres into its cull arrays.
  for (const g of trolleys) for (const p of g) p.cy = -99;
  setPhase('gate');
  setView(0);
  return api;
});
