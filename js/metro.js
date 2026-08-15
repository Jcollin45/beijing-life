// 地铁站 — the subway station, and the way to everywhere this game has not built yet.
//
// A Beijing station of the plain kind: a tiled concourse under a low slab ceiling, a bank of
// ticket machines against one wall, a line of turnstiles across the middle, and beyond them a
// platform with square columns down it, a yellow line along the edge, platform screen doors and
// a train standing at them with its doors open.
//
// The room is one station and serves as all of them. Which station you are standing in is state,
// not geometry: `setStation` rewrites the hanging name sign a character at a time, moves the
// "you are here" ring on the line map, and repoints the way out at the right piece of pavement.
// That is what makes the line extensible — a new district is a row in STATIONS and a spot on the
// street, not another room.
//
// Same convention as every other interior: the one daylight opening is on the -z wall, which
// here is the stairwell, so what comes down it is a shaft of sky at the bottom of the steps.
// 地铁 — MetroFit, the zone registry. See METRO.md.
//
// The fifth of these (FlatFit, StreetFit, AirFit, and now this), same shape, same reason: it is
// what lets fifteen agents fill one station without fifteen of them editing this file.
//
//     MetroFit['gates'] = A => { ... };                      // the builder, run once at build
//     MetroFit['gates'].tick = (t, body, clock) => { ... };  // optional, for anything that moves
//
// `A` is the toolkit, handed over below `build()` — read the note there before moving the call.
const MetroFit = {};

const Metro = Lazy('Metro', () => {
  const col = {
    // 地面 polished granite. A good deal darker and warmer than it was, and this is the single
    // change that does most for the room. Every surface in here used to sit within a few percent
    // of white, and the floor is the largest of them: at #cfcbc2 under five battens, two coves,
    // a stairwell wash and ten reflection pools it clipped flat, and a clipped floor is not a
    // polished one. What you lose when it clips is exactly what makes stone worth looking at —
    // the pools of light, the shade under every bench and column, the slab-to-slab tone the mode 9
    // shader is drawing. Darker stone is what lets the light on it read as light.
    // `floorL` is the pale stone the station name is cut into, which has to stay light because it
    // is inlaid into a near-black granite band.
    floor: C('#a8a294'), floorL: C('#dcd6c8'),
    grout: C('#948d80'), tile: C('#ddd6c4'), tileD: C('#bdb6a6'),
    wall: C('#d0cbbe'), ceil: C('#c9c4b8'), slab: C('#aea89e'),
    steel: C('#9ba3a9'), steelD: C('#6c7378'), chrome: C('#c2c8cc'),
    white: C('#f1efe8'), cream: C('#e6e0d2'), charcoal: C('#31363c'), black: C('#1b1e22'),
    red: C('#b2402d'), redD: C('#87301f'), gold: C('#d0a03a'), goldL: C('#e6c257'),
    jade: C('#3d7361'), jadeL: C('#5b9a83'), blue: C('#2f6392'), blueL: C('#5b8cb4'),
    navy: C('#26354a'), yellow: C('#dcb02f'), orange: C('#cf7a2b'),
    // The dado deepened with the rest. A pale blue band on pale tile is a change of tint; a real
    // station's lower field is dark enough that the join reads as a line from the far end of the
    // platform, which is the whole job of a dado.
    tileB: C('#6d879e'), granite: C('#45484d'), plenum: C('#33363a'), panel: C('#d5d0c3'),
    band: C('#7f7c74'), steelP: C('#8f979d'),
    // 4000 K, not 6500. The tubes in this ceiling were painted a cool near-white and the room came
    // out the colour of a fridge. A metro is lit warm-white and the difference between the two is
    // most of what separates a Beijing concourse from a laboratory.
    glass: C('#b6cdda'), tube: C('#fdf4dd'), rail: C('#6c7278'), ballast: C('#4a4741'),
    // The running tunnel. Near-black and unlit, because the only thing in a tunnel that is lit is
    // whatever is coming out of it.
    bore: C('#14181d'), boreL: C('#2a3038'), sleeper: C('#3a3733'),
    car: C('#c9ced2'), carD: C('#9aa1a7'), seatB: C('#2f5f88'),
  };
  const G = { matte: .06, wood: .20, paint: .16, metal: .58, glass: .80, fabric: .05 };
  // What the little display on a turnstile shows: green and you may, red and you may not.
  const LAMP_OPEN = C('#4fd68c'), LAMP_SHUT = C('#c8452f');

  const B = Build.scene({ fabricGloss: G.fabric });
  const { box, cyl, ball, capsule, taper, modelOr, wall, flat, glyphs,
          solid, shade, glow, thing } = B;

  // ---------------------------------------------------------------- dimensions
  const RX = 6.4, RZ = 5.2, H = 3.30;
  const SX = -5.10;                       // x of the stairwell up to the street
  const WIN = { x: SX, y: 2.30, z: -RZ + .06, hw: .90, hh: .80 };
  const GATEZ = -1.55;                    // the line of turnstiles
  // Four lanes and the five cabinets that make them. 1.50 apart = a 1.10 lane plus a 0.40
  // cabinet, so each cabinet is shared by the two lanes either side of it and the run closes up
  // with no gaps to walk through. The first two are 进站, the last two 出站.
  const LANEX = [-2.25, -.75, .75, 2.25];
  const CABX = [-3.00, -1.50, 0, 1.50, 3.00];
  const GATE_HOLD = 6.0;                  // seconds a lane stays open after you tap
  const EDGEZ = 3.30;                     // the platform edge and its screen doors
  const CARZ = 4.25;                      // centre of the train standing at them
  // Where the platform stops and the trackside starts, and how tall the tunnel bore is. The end
  // walls are cut back to TRACKZ so a train can run out through the ends of the room.
  const TRACKZ = EDGEZ - .18, BORE_H = 2.62;
  // Where the doors are, and therefore where the openings in the screen and in the car both go.
  // Six piers, five doors, and a door on the centre line — because the middle of the platform is
  // where you end up standing, and with a pier there you walked up to the train and faced a wall.
  const PIERX = [-6.40, -3.84, -1.28, 1.28, 3.84, 6.40];
  const DOORX = [-5.12, -2.56, 0, 2.56, 5.12];
  // The car's flank, as the spans of panel left between those openings.
  const PANELX = [[-6.30, -5.79], [-4.45, -3.23], [-1.89, -.67], [.67, 1.89],
                  [3.23, 4.45], [5.79, 6.30]];
  // 自动售票机 the three machines against the -z wall: their centres, the centre of each body and
  // the front face it presents. Up here rather than down in the ticket-hall section because the
  // standing positions in WALK are worked out from them.
  const MACHX = [-3.36, -2.24, -1.12];
  const MBZ = -RZ + .42, MFZ = MBZ + .30;

  // ---------------------------------------------------------------- 走位 where a body may stand
  // The station's own list of the points a route on foot is allowed to bend at. game.js walks
  // commuters through this room, and NPCs are integrated straight along their heading with no
  // reference to the collider at all, so every corner has to come from here rather than be
  // guessed at from the far side of the module. A guess is not a near miss: a straight line from
  // the ticket machines to the gate line passes through two turnstile cabinets, and one from the
  // gates to a platform door goes through a column and then a bench.
  //
  // `hall` and `spine` are the two clear cross-room lanes — one in the concourse, in front of the
  // machines and short of the cabinets, and one on the platform beyond the columns and the benches.
  // Routes run along those and turn at right angles, because every diagonal across this room hits
  // something. The numbers are checked against the solids: machines end at MFZ + .04, cabinets
  // start at GATEZ - .52, the columns sit at z .70 to 1.20 and the benches at z .02 to .62.
  // ---------------------------------------------------------------- 楼梯 how high the floor is
  // The flight up to the street is the one part of this station whose floor is not at zero, and
  // people walk up and down it. Eight treads of .18 rising away from the well mouth, reported here
  // as a height at a point so that anything walking through the room can be stood on it. Given as
  // a ramp along the nosings rather than as eight discrete steps: what makes a climb read as a
  // climb is the stride, and a body snapping up 18 cm at a time reads as a lift, not a staircase.
  // The first .30 m is the step up onto the bottom tread, which is a real 18.5 cm rise.
  const STAIR_RISE = .18, STAIR_GOING = .26, STAIR_N = 8, STAIR_Z0 = -RZ - .01;
  function liftAt(x, z) {
    if (Math.abs(x - SX) > 1.15) return 0;            // not in the well
    const into = STAIR_Z0 - z;                        // metres past the mouth, going up
    if (into <= 0) return 0;
    return Math.min(1, into / .30) * .185
         + Math.min(STAIR_N - 1, Math.max(0, (into - .30) / STAIR_GOING)) * STAIR_RISE;
  }

  const WALK = {
    stair: { x: SX + .30, z: -RZ + .34 },             // the foot of the steps, clear of the well
    // Squared up with the flight, and then the head of it. The top is 22 cm past the daylight
    // panel that closes the well, which is the second place in this room where somebody can be
    // taken out of the world unseen: at 1.44 m up, a body there is behind that panel from the
    // chest down, behind the panel above it and the landing slab over the head, and behind the
    // top two treads below. Walking up out of sight is what a flight of stairs is for.
    stairFoot: { x: SX, z: -RZ + .25 },
    // Well behind the panel, not level with it. A walker stops when it is within 30 cm of its
    // waypoint, so a target on the panel line leaves them standing in front of it, lit, at the top
    // of the flight — which is the one thing this spot exists to prevent.
    stairTop: { x: SX, z: -RZ - 2.70 },
    // The one clear run between the gate line and the platform. The columns sit at z .65 to 1.25,
    // the benches at .02 to .62 and the two litter bins at x ±2.30, so a straight walk up from
    // either outer lane goes through a bin. Everything crosses at these two, which is also where
    // the station's own tactile paving runs.
    cross: [LANEX[1], LANEX[2]],
    mach: MACHX.map(x => ({ x, z: MFZ + .33 })),      // an arm's length off each console
    inLane: [LANEX[0], LANEX[1]],                     // 进站, the two lanes set inward
    outLane: [LANEX[2], LANEX[3]],                    // 出站
    hall: -3.00,
    // Far enough off the columns that three parallel walking tracks all clear them: they end at
    // z 1.25, and the innermost track plus a shoulder comes to 1.35.
    spine: EDGEZ - 1.45,
    queue: DOORX.map(x => ({ x, z: EDGEZ - .90 })),   // the painted mark at each screen door
    board: EDGEZ + .30,                               // through the opening and over the gap
    // Inside the car, behind the wide spans of panel between its doors. This is the only place in
    // the room where a body can be added to the world or taken out of it without being watched:
    // the car's flank is opaque along those spans, the floor slab hides the feet under it, and a
    // screen-door pier stands in front of each one as well. Somebody who boards walks down the
    // car to here and is gone; somebody arriving on the next train appears here and walks out.
    hide: PANELX.filter(([a, b]) => b - a > .9).map(([a, b]) => ({ x: (a + b) / 2, z: CARZ })),
    carZ: CARZ,
    gateZ: GATEZ,
    tap: .80,                                         // how far short of the line you stop to tap
  };

  // ---------------------------------------------------------------- 线路 the line
  // Six stations, of which two exist. `out` is where the street door puts you when you leave at
  // that station; a station with no `out` is 在建 — dug, signed, and not open. Adding a district
  // later means giving one of these an `out` and building the place it comes out in.
  const STATIONS = [
    { hz:'杨柳胡同', py:'Yángliǔ Hútòng', en:'Willow Lane',
      // The street entrance solid begins at z=1.50.  z=.70 lands at the authored check focus with
      // 80 cm to the structure, so even the strict .45 m transition envelope arrives legally.
      out: { place:'street', at: { x: 19.4, z: .70, yaw: Math.PI * .5 } } },
    { hz:'商务区', py:'Shāngwùqū', en:'Business District',
      // This mouth faces south: the previous rear return at z=-4.10 was inside its entrance solid.
      // Return beside the route-map/check focus, a full 1.10 m beyond the structure's south face.
      out: { place:'street', at: { x: 38.45, z: -7.10, yaw: Math.PI } } },
    // The coordinates are written out rather than read off each scene, so that metro.js does not
    // have to load after four other files to know where its own line goes.
    { hz:'大学城', py:'Dàxuéchéng', en:'University Town',
      out: { place:'campus', at: { x: -11.40, z: -9.35, yaw: 0 } } },
    { hz:'火车站', py:'Huǒchēzhàn', en:'Railway Station',
      out: { place:'rail', at: { x: -6.10, z: -4.80, yaw: Math.PI * .10 } } },
    { hz:'公园', py:'Gōngyuán', en:'The Park',
      out: { place:'park', at: { x: -8.00, z: -9.40, yaw: 0 } } },
    // 动物园 sits between the park and the airport, which is where Beijing's own zoo station sits
    // on line 4 — a stop out from the middle of town, on the way to nowhere else. The street door
    // comes up at the west end of the entrance plaza, a few steps inside the gate.
    { hz:'动物园', py:'Dòngwùyuán', en:'The Zoo',
      out: { place:'zoo', at: { x: -12.00, z: -13.40, yaw: 0 } } },
    // The subway comes up at the west end of the terminal, landside. It used to come up at
    // x 8.8, which after the hall was rebuilt is on the far side of 安检 — arriving by train
    // walked you straight into the gate lounge without a boarding card.
    { hz:'机场', py:'Jīchǎng', en:'The Airport',
      out: { place:'airport', at: { x: -19.60, z: 5.60, yaw: Math.PI * .86 } } },
  ];

  const litProps = [], panes = [];
  // The train, and the two sets of doors. `carProps` is collected after the build by tag rather
  // than pushed to as it goes, so anything anybody adds to the car later moves with it for free.
  let carProps = [];
  const carLeaves = [];
  // How far each kind of leaf travels from the open position it is built in to meeting in the
  // middle. The screen door's clear opening is 0.66 and the car's is 1.22, which is why they differ.
  const PSD_SLIDE = .33, CAR_SLIDE = .61;
  function litten(p, k) { litProps.push({ p, k }); return p; }
  // Everything the tick moves. A prop can be changed after it is built -- setStation has always
  // rewritten the name boards this way -- and `glow` and `color` are the two fields that cost
  // nothing to change, because neither one touches the cull data the draw loop reads.
  const failing = [];        // fluorescent tubes on their way out
  const edgeLamps = [];      // the lights along the platform edge
  const leds = [];           // the segments of the next-train board
  const carWindows = [];     // the window band down the flank of the car
  const carLights = [];      // its interior tubes
  // The four character slots on the car's destination blind. Written by `setStation`, but into `m0`
  // rather than `m`, because everything tagged 地铁 is re-placed from `m0` every frame by `placeTrain`.
  const blindSlots = [];
  let sweep = null;          // the light of the unseen train, thrown along the platform

  let seed = 0x3e7a01;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = a => a[(rnd() * a.length) | 0];

  // The pieces `setStation` rewrites: four character slots on the hanging sign, the ring on the
  // line map, and the door out.
  const nameSlots = [], nameSlots2 = [];
  // Two more sets of four, laid into the platform floor. Eight props in one array, read as `k % 4`
  // the same way the hanging signs' slots are.
  const floorSlots = [];
  let hereRing = null, exitThing = null;
  // The departure boards' rewritable fields: the next train's time, the minutes to it, and the time
  // of the one after. Characters, not textures — the same trick setStation uses on the name boards,
  // where the glyph a prop draws is a field on the prop and the layout is not. Two boards, both
  // saying the same thing, because one in the middle is behind the hanging sign.
  const boards = [];

  // ---------------------------------------------------------------- parts
  // A fluorescent batten, which is the only kind of light a station of this age has.
  function batten(cx, cz, len, dying = 0) {
    box(cx, H - .06, cz, len, .10, .24, col.steel, { hard: true, gloss: G.metal });
    const tube = litten(box(cx, H - .135, cz, len - .12, .04, .18, col.tube,
      { hard: true, mode: 1, glow: .48 }), .8);
    // One tube in a station is always going. It is not a flicker on a timer -- a dying fluorescent
    // strikes, holds, drops out, and strikes again at intervals of its own, and `phase` is what
    // keeps two of them from failing in step, which would read as the room having a heartbeat.
    if (dying) failing.push({ p: tube, glow: .48, phase: dying * 5.7, rate: .7 + dying * .43 });
    // Five battens, two coves and the stairwell all pool light on the same floor, and together
    // they were washing the tile out to flat white. Each one contributes less than it used to.
    glow(M.trs(cx, .02, cz, 0, len + 1.8, 1, 3.0), C('#f8efdc'), .062);
    // ---- and the light itself, which until now the room did not have. The two lines above are
    // what the fitting *looks* like — an emissive tube and a painted pool on the stone — and
    // neither of them lit anything: a column standing directly under a batten was shaded by the
    // ambient term alone and came out exactly as bright on the side away from it.
    //
    // Real point lights, spread along the run rather than one in the middle of it, because that is
    // the difference between a station and a room with a bulb in it. A metro is lit by continuous
    // ceiling runs and what you read off the tile is a long even wash with a slight scallop under
    // each fitting; one light on a nine-metre batten is a spotlight over the middle of the
    // platform with both ends of it falling away into grey. `n` comes off the length at about one
    // every 3.6 m, which puts the five battens at eight lights in total — the renderer's whole
    // budget, so nothing is ever sorted away and nothing pops as the camera walks the platform.
    //
    // 4000 K, the same warm white the tube is painted (`col.tube`), because a room lit a different
    // colour from the fitting lighting it is the tell of light that was added afterwards.
    // Radius is where a light stops being this light's business: at 3.8 m the wash from one batten
    // reaches the next one along and no further, which is what makes the run read as a run rather
    // than as separate lamps.
    const n = Math.max(1, Math.round(len / 3.6));
    for (let i = 0; i < n; i++)
      B.light(cx + (i - (n - 1) / 2) * (len / n), H - .22, cz,
        [1.00, 0.96, 0.87], .30, 3.8);
  }

  // 闸机 the turnstiles, as five shared cabinets with four lanes between them.
  //
  // The lanes are 1.10 m clear, which is wider than a real turnstile aisle, because the body has
  // a 30 cm collision radius and a 55 cm aisle leaves a channel you cannot reliably steer into.
  // Each lane is a barrier in the collider that opens when you tap, and a pair of glass flaps that
  // slide back into the cabinets when it does. Walking through is the whole point: the fare buys
  // you the opening, not a change of coordinates.
  const lanes = [];
  // The cabinet: a dark stainless carcass on a black plinth with a bright cap, and a recessed
  // panel down each side. Built as one plain grey box it read as a plinth with coloured card
  // lying on top of it, which is a lectern, not a turnstile.
  function cabinet(cx) {
    const T = { tag: '闸机' };
    box(cx, .06, GATEZ, .44, .12, .99, col.charcoal, { ...T, hard: true, gloss: .26 });
    // The carcass takes `steel` at a 36 cm repeat, which over that texture's fifteen ribs puts a
    // line every 2.4 cm: the fine flutes a gate cabinet's stainless side is pressed with, read at
    // the distance somebody stands to tap a card. `metal` is the name that sounds right and is the
    // trap: that texture averages 0.97 linear against the shader's 0.22 mid grey, so at any usable
    // `matAmt` it does not texture a surface, it doubles it — with it on, the whole gate line came
    // out as white slabs with a photograph of somebody else's machinery faintly printed across
    // them. `steel` averages 0.23, near enough dead neutral, so it changes what the surface is
    // without touching what it is worth.
    box(cx, .56, GATEZ, .40, .90, .95, col.steelD,
      { ...T, gloss: .38, mat: 'steel', matScale: .36, matAmt: .34 });
    for (const s of [-1, 1])
      box(cx + s * .205, .56, GATEZ, .02, .70, .78, col.steel,
        { ...T, hard: true, gloss: G.metal });
    box(cx, 1.03, GATEZ, .44, .06, .99, col.chrome, { ...T, hard: true, gloss: G.metal });
    box(cx, 1.07, GATEZ, .40, .03, .93, col.slab, { ...T, hard: true, gloss: .30 });
    solid(cx - .22, cx + .22, GATEZ - .52, GATEZ + .52);
    shade(cx, GATEZ, .70, 1.25, .26);
  }
  // A lane: the flaps that close it, the reader you tap, and the little display that says whether
  // it is going to let you through.
  function lane(cx, inbound) {
    const T = { tag: '闸机' };
    const dir = inbound ? -1 : 1;           // which side of the line you approach from
    const az = GATEZ + dir * .36;
    // The flaps, closed. A pane and a bright edge each, so they read at a glance even at 50%
    // alpha; `m0` is kept so the tick can slide each one back into its cabinet.
    const flaps = [];
    for (const s of [-1, 1]) {
      // Alpha .30, not .50. At a half a 54 by 80 cm pane of mode-1 glass is a lit white slab, and
      // four lanes of them were the brightest thing on the concourse: from the ticket hall the
      // gate line read as eight illuminated boards standing on plinths. A turnstile flap is
      // polycarbonate you can see the next person's shoes through, and what makes it read is the
      // bright edge rail on top of it rather than the pane.
      flaps.push(box(cx + s * .28, .62, GATEZ, .54, .80, .05, col.glass,
        { ...T, hard: true, mode: 1, alpha: .30, gloss: G.glass }));
      flaps.push(box(cx + s * .035, .62, GATEZ, .07, .82, .09, col.chrome,
        { ...T, hard: true, gloss: G.metal }));
    }
    // 刷卡 the reader, a raised pod on the cabinet to your right with a lit plate on top of it
    // A dark pad with a small lit ring on it. A bright gold plate the size of a postcard is what
    // you notice about the whole gate line from across the room, and it is a sticky note.
    //
    // Tagged 刷卡 and not 闸机, which is the whole of the difference between a machine and the
    // thing you do to it. The gate's own verb has always been labelled 刷卡, so the word was
    // written on the screen the moment you used one and was still not in the dictionary — you
    // could tap a card fifty times without 刷卡 ever coming up for review. The pod is the part
    // you actually touch, so it carries the word; the carcass, the flaps and the arrow stay 闸机.
    // Nothing about the gate flow moves with it: game.js chooses a verb by distance to a thing's
    // focus point, not by what the cursor is resting on.
    const CD = { tag: '刷卡' };
    const rx2 = cx + .60;
    box(rx2, 1.13, GATEZ + dir * .28, .20, .14, .22, col.charcoal,
      { ...CD, hard: true, gloss: .30, rx: dir * .22 });
    box(rx2, 1.205, GATEZ + dir * .30, .17, .02, .18, col.black,
      { ...CD, hard: true, mode: 1, rx: dir * .22 });
    litten(cyl(rx2, 1.222, GATEZ + dir * .30, .046, .012, col.goldL,
      { ...CD, mode: 1, glow: .26, rx: dir * .22 }), .5);
    // No card outline printed on the pod, deliberately. The note above is about exactly that
    // temptation: anything the size of a card on top of this reads as a card left lying there.
    // The display on the cabinet to your left: a dark LED panel with a chevron lit on it, red for
    // shut and green for open. A coloured plate with a dark chevron on it is the wrong way round —
    // on a real gate the panel is black and it is the arrow that changes colour.
    //
    // +dir, not -dir: the panel goes on the face you walk up to, which is the same side of the
    // line the display itself is on. On the other face it lit the half of the room behind it.
    box(cx - .60, 1.24, az, .30, .26, .07, col.steelD, { ...T, hard: true, gloss: .34 });
    box(cx - .60, 1.24, az + dir * .045, .25, .21, .02, col.black,
      { ...T, hard: true, mode: 1 });
    // A chevron, as two bars meeting at a point. Three stacked bars of decreasing width read as a
    // hamburger menu, not as an arrow.
    const lamps = [-1, 1].map(s => litten(
      box(cx - .60 + s * .045, 1.235, az + dir * .058, .14, .034, .01, LAMP_SHUT,
        { ...T, hard: true, mode: 1, glow: .34, rz: -s * .70 }), .6));
    const bar = solid(cx - .55, cx + .55, GATEZ - .34, GATEZ + .34);
    lanes.push({ cx, inbound, flaps, lamps, bar, k: 0, until: 0, open: false });
  }

  // ---------------------------------------------------------------- 轨道 the running tunnel
  // The bed, the road and the two holes in the ends of the room the train comes out of. There is
  // only 9.5 cm of clear space behind a berthed car — its back wall is at z 5.105 and the room ends
  // at 5.20 — so there is nowhere back there for cable trays or anything else with depth. What
  // makes the tunnel read is therefore not what is behind the train but the two dark mouths at the
  // ends, which is also what a platform actually looks like.
  const signals = [];
  // The wash in each tunnel mouth, which the tick brightens when a train is in it. Two entries, in
  // the order the mouths are built: index 0 is the -x end, which is the end trains arrive from.
  const boreGlow = [];
  // The pools of light on the platform outside each doorway, which only exist while the doors do.
  const doorGlows = [];
  function trackside() {
    // The bed, dark and unlit.
    flat(0, .002, (TRACKZ + RZ) / 2, RX * 2, RZ - TRACKZ, col.bore, { gloss: .08 });
    // Sleepers, then the two running rails at the gauge the car stands on. All of it under the
    // car's floor slab, so it is the empty platform that gets a railway and not the carriage.
    for (let i = -12; i <= 12; i++)
      box(i * .52, .008, CARZ, .20, .016, 1.66, col.sleeper, { hard: true, gloss: .12 });
    for (const s of [-1, 1])
      box(0, .020, CARZ + s * .72, RX * 2, .026, .055, col.rail, { hard: true, gloss: .62 });
    // The conductor rail, out on the platform side of the road where the gap already is.
    box(0, .045, TRACKZ + .30, RX * 2, .065, .05, col.steelD, { hard: true, gloss: G.metal });
    // The tunnel wall, in the last 8 cm before the room ends. Unlit: a lit surface back here reads
    // as another wall of the room, and the one thing this has to look like is somewhere else.
    box(0, 1.55, RZ - .04, RX * 2, 3.10, .08, col.bore, { hard: true, mode: 1, gloss: .06 });

    // ---- the two mouths. A dark face across the whole aperture at each end of the room, which is
    // both what a tunnel looks like from a platform and what hides the train once it has left: a
    // departing car passing x 6.41 is behind this and stops being drawn on it by depth alone.
    for (const s of [-1, 1]) {
      const mx = s * (RX - .02), mz = (TRACKZ + RZ) / 2, mw = RZ - TRACKZ;
      box(mx, BORE_H / 2, mz, .06, BORE_H, mw, col.bore, { hard: true, mode: 1 });
      // A concrete ring round it, so the hole has an edge rather than fading into the tile.
      box(s * (RX - .12), BORE_H + .09, mz, .22, .18, mw + .10, col.granite,
        { hard: true, gloss: .30, mat: 'concrete', matScale: .90, matAmt: .32 });
      box(s * (RX - .12), BORE_H / 2, TRACKZ + .04, .22, BORE_H, .20, col.granite,
        { hard: true, gloss: .30, mat: 'concrete', matScale: .90, matAmt: .32 });
      // 信号 the signal at the mouth: red while the road is occupied, green when it is clear. The
      // one thing in a tunnel that is lit, and it is lit because of what the timetable is doing.
      cyl(s * (RX - .26), 1.62, TRACKZ + .30, .05, .10, col.charcoal,
        { rz: Math.PI / 2, gloss: .30, tag: '信号' });
      signals.push(litten(cyl(s * (RX - .30), 1.62, TRACKZ + .30, .038, .03, C('#e0644c'),
        { rz: Math.PI / 2, mode: 1, glow: .34, tag: '信号' }), .4));
      // ---- what is up the tunnel. The mouth is a flat dark face — it has to be, because it is also
      // what hides a departed train — so there is no seeing into it, and depth has to be painted on
      // rather than built. Four lamps in a row, each one smaller, dimmer and nearer the centre of the
      // aperture than the last, which is what a lit tunnel actually looks like from a platform: not a
      // corridor of light but a line of points converging on a vanishing point.
      //
      // Drawn on the face and 1 cm proud of it, so they never fight it for pixels. The centre they
      // converge on is a third of the way up the bore and a little toward the platform side, because
      // that is where the road goes: a vanishing point in the middle of the aperture reads as a
      // target painted on the wall.
      // Not `litten`. A tunnel lamp does not know what time it is, and the night hook adds to
      // whatever it finds — putting these on it would brighten the inside of a tunnel at midnight.
      //
      // The 5 cm offsets matter and are not padding. The mouth face is a 6 cm slab centred on
      // ±6.38, so it occupies 6.35 to 6.41: anything within 3 cm of the centre line is *inside* it
      // and invisible. And the berthed car ends at ±6.30, so the band between 6.30 and 6.35 is the
      // only place a lamp can go and be seen both with a train in and with the platform empty.
      const vpy = BORE_H * .42, vpz = mz - .12;
      const y0 = BORE_H * .74, z0 = mz + mw * .30;
      for (let k = 0; k < 4; k++) {
        const u = (k + 1) / 5;                       // 0 at the mouth, 1 at the vanishing point
        box(mx - s * .05, y0 + (vpy - y0) * u, z0 + (vpz - z0) * u,
          .008, .030 * (1 - u * .7), .075 * (1 - u * .6), C('#f0e2b8'),
          { hard: true, mode: 1, glow: .30 * (1 - u * .55) });
      }
      // The glow in the mouth, dark until a train is in the bore, which is the only movement a
      // tunnel mouth in this room can have and it had none.
      //
      // A `glow` quad and not a prop. An unlit box at glow 0 still renders its own colour, so a pale
      // box hung across the aperture is a pale rectangle in the tunnel all day and only *slightly*
      // paler than the one the train makes. A glow is additive with no depth write, invisible at
      // a = 0, and mode 5 fades it off at all four edges — which is what light up a tunnel does.
      //
      // Standing the quad up takes rotX(π/2) and *then* a yaw, in that order, so the matrix is
      // yaw · rotX: rotating about y first cannot move a normal that is still pointing at the
      // ceiling. The yaw is -s·π/2 so each mouth faces into the room; the wrong sign is not dimmer,
      // it is gone, because back faces are culled.
      boreGlow.push(glow(M.mul(M.trans(mx - s * .035, BORE_H * .40, mz),
        M.mul(M.rotY(-s * Math.PI / 2),
          M.mul(M.rotX(Math.PI / 2), M.scale(mw * .80, 1, BORE_H * .78)))),
        C('#b6c8d6'), 0));
    }
  }

  // ---------------------------------------------------------------- 墙 one tiled wall face
  // Everything is built outward from the wall plane along the face normal, in layers that never
  // share a plane with anything else: granite skirting, a coloured lower field, a stainless
  // divider, a pale field above it, the joints, and pilasters to break up a ten-metre run.
  //
  // Depths matter more than they look. The old wall gave the skirting the same thickness as the
  // tile behind it, so the two z-fought along the whole length of the room, and it put the
  // horizontal and vertical joints at the same depth, so every crossing flickered — which is what
  // a dashed line halfway up a tiled wall turns out to be.
  //
  //   0.00  the wall plane
  //   0.10  tile field
  //   0.115 vertical joints   (proud of the field, behind everything else)
  //   0.12  horizontal joints (proud of the verticals, so crossings cannot fight)
  //   0.13  the divider
  //   0.15  skirting
  //   0.17  pilasters
  const DADO = 1.28;                      // top of the coloured lower field
  function tiledWall(cx, cz, len, nx, nz, opt = {}) {
    const ax = nz !== 0;                  // the run is along x when the face looks along z
    // d out from the plane, u along the wall, w long, h tall, t thick
    const put = (d, u, y, w, h, t, c, o = {}) =>
      box(cx + (ax ? u : nx * d), y, cz + (ax ? nz * d : u),
          ax ? w : t, h, ax ? t : w, c, { hard: true, ...o });
    // The fields carry a little glow. A wall of pale tile lit from one lamp in the middle of the
    // room comes out khaki: the colour you paint it is not the colour you get, and the way to a
    // pale tile is to let it hold some light of its own.
    //
    // Both fields carry the `tile` material at a repeat of 78 cm. `matScale` is the size of the
    // whole photograph and this one holds six tiles across it, so what that actually sets is a
    // 13 cm tile — four of them to each 52 cm bay of the grout drawn below, which keeps the two
    // grids commensurate instead of merely near each other. It is worth writing the arithmetic
    // down because both ways of getting it wrong look like something else: at the 30 cm a wall
    // tile sounds like it wants, the six tiles inside it come out at 5 cm and the wall is mosaic;
    // at 1.56 they come out at 26 cm, two to a column face, and this texture's tile-to-tile tone
    // swing is wide enough that a 50 cm column reads as stained rather than tiled. Thirteen
    // centimetres is also simply what these walls are: a 150 mm glazed tile is what every Beijing
    // station of this vintage is lined with.
    put(.075, 0, .13, len, .26, .15, col.granite,
      { gloss: .34, mat: 'concrete', matScale: .90, matAmt: .30 });
    put(.05, 0, (.26 + DADO) / 2, len, DADO - .26, .10, col.tileB,
      { gloss: .32, glow: .06, mat: 'tile', matScale: .78, matAmt: .30 });
    put(.065, 0, DADO + .035, len, .07, .13, col.chrome, { gloss: G.metal, glow: .10 });
    put(.05, 0, (DADO + .07 + H) / 2, len, H - DADO - .07, .10, col.tile,
      { gloss: .30, glow: .12, mat: 'tile', matScale: .78, matAmt: .30 });
    for (const y of [.52, 1.04, 1.80, 2.32, 2.84])
      put(.105, 0, y, len, .014, .024, col.grout, { glow: .06 });
    const n = Math.floor(len / .52);
    for (let i = 0; i <= n; i++)
      put(.10, -len / 2 + (len - n * .52) / 2 + i * .52, (.28 + H) / 2, .014, H - .28, .024,
        col.grout, { glow: .06 });
    for (const u of opt.pilasters || [])
      put(.085, u, (.26 + H) / 2, .14, H - .26, .17, col.steelP,
        { gloss: G.metal, mat: 'steel', matScale: .50, matAmt: .34 });
  }

  // A square column, tiled, with the skirting band every one of them has.
  //
  // `dress` is what hangs on the concourse face of it, and it is the reason four columns are not
  // one column drawn four times. A real platform column is the most heavily used mounting surface
  // in the station — the map that is nearer than the one by the gates, the way out, the extinguisher
  // that has to be within thirty metres of anywhere, the camera. Bare, all four read as structure
  // rather than as furniture, and a bare tiled box repeated at 2.8 m centres is wallpaper.
  //
  // `face` is which side it hangs on, and it matters more than it looks. This platform has exactly
  // two directions of travel: off the train and out, which faces -z and therefore reads the +z faces,
  // and in from the gates to wait, which faces +z and reads the -z faces. So the way out goes on the
  // train side, where somebody who has just got off will meet it, and the map and the notices go on
  // the concourse side, where somebody who has time to read them is walking. Signage on both faces
  // doubles the props to show half of them to the back of somebody's head.
  //
  // `along(u)` is u metres to the *reader's right* on whichever face it is, and `out(d)` is d metres
  // proud of it. Both flip with the face, because yaw π mirrors x on screen: written the same way
  // for both sides, an arrow pointing right on one column points left on the next one along.
  // Characters inside a single `glyphs` call are safe either way — the run and the glyph's own
  // texture axis mirror together — it is only separately placed pieces that have to be told.
  function column(cx, cz, dress, face = -1) {
    // The same tile at the same repeat as the walls, because it is the same tile: a column and the
    // wall behind it are clad out of one pallet in a real station, and reading triplanar in world
    // space is what makes that true here without a single UV — the courses run round all four
    // faces and carry on across the wall beyond at the same size and in the same phase.
    box(cx, H / 2, cz, .50, H, .50, col.tile,
      { hard: true, gloss: .30, glow: .12, mat: 'tile', matScale: .78, matAmt: .30 });
    box(cx, .13, cz, .56, .26, .56, col.granite,
      { hard: true, gloss: .34, mat: 'concrete', matScale: .90, matAmt: .28 });
    box(cx, H - .08, cz, .58, .16, .58, col.panel, { hard: true, gloss: .20, glow: .16 });
    for (let i = 1; i < 6; i++)
      box(cx, i * .52, cz, .52, .012, .52, col.grout, { hard: true, glow: .06 });
    solid(cx - .30, cx + .30, cz - .30, cz + .30);
    // The dark smear a polished floor puts under a column. See the reflection note at the end of
    // `build`: there are no real reflections here, and the light pools that stand in for them can
    // only add. What a column does to a floor is the opposite — it takes light away, twice, once as
    // the contact shadow and once as its own image lying in the stone — so it is a shadow quad,
    // sized wider than the column and squarer than a cast shadow would be.
    shade(cx, cz, 1.15, 1.15, .20);
    shade(cx, cz, .70, .70, .26);
    if (!dress) return;
    const f = face;
    const fz = cz + f * .25;               // the tiled face the signage hangs on
    const yaw = f < 0 ? Math.PI : 0;       // both faces are read from the room, not from inside
    const out = d => fz + f * d;           // d metres proud of that face
    const along = u => cx + f * u;         // u metres to the reader's right

    // 线路图 a strip map, the kind that is a bar with dots and no names, mounted at reading height.
    // Nearer than the big one by the gates and nowhere near as useful, which is exactly why real
    // platforms have both: this one answers "how many more stops", not "where does the line go".
    if (dress === 'map') {
      box(cx, 1.62, out(.015), .40, .56, .03, col.white, { hard: true, gloss: .22 });
      box(cx, 1.62, out(.032), .35, .50, .01, col.cream, { hard: true, mode: 1 });
      glyphs(cx, 1.80, out(.042), yaw, '二号线',
        { size: .052, gap: .012, color: col.blue, mode: 1 });
      box(cx, 1.60, out(.040), .28, .020, .01, col.blue, { hard: true, mode: 1 });
      for (let k = 0; k < 6; k++)
        cyl(along(-.14 + k * .056), 1.60, out(.046), .018, .008, k ? col.blue : col.red,
          { rx: Math.PI / 2, mode: 1 });
      glyphs(cx, 1.44, out(.042), yaw, '下一站商务区',
        { size: .036, gap: .006, color: col.charcoal, mode: 1 });
    }
    // 出口 the way out, as the pillar sign with an arrow that every column in a Chinese station
    // carries. On the train side: this is read by somebody who has just stepped off and is looking
    // for the gates, and nobody standing on the concourse needs telling where the stairs are.
    if (dress === 'exit') {
      box(cx, 2.30, out(.015), .46, .22, .03, col.jade, { hard: true, gloss: .24 });
      glyphs(along(-.10), 2.30, out(.035), yaw, '出口',
        { size: .115, gap: .03, color: col.white, mode: 1 });
      // an arrow, as a shaft and two barbs meeting at a point — the same two-bar chevron the
      // stairwell and the gate displays already use, and for the reason recorded there: a row of
      // bars of decreasing length reads as a bar chart, not as a point.
      box(along(.15), 2.30, out(.035), .11, .022, .01, col.white, { hard: true, mode: 1 });
      for (const s of [-1, 1])
        box(along(.175), 2.30 + s * .026, out(.035), .055, .020, .01, col.white,
          { hard: true, mode: 1, rz: s * .7 });
    }
    // 灭火器 the extinguisher in its bracket, which is on a column rather than a wall because that
    // is where the reach rule puts it: the middle of a platform is further from every wall than any
    // other point in the room.
    if (dress === 'fire') {
      box(cx, .92, out(.03), .13, .30, .06, col.steelD, { hard: true, gloss: G.metal });
      cyl(cx, .88, out(.10), .062, .34, col.red, { gloss: .34 });
      // Wide end down. `taper` narrows toward +y, which is the way a bottle's shoulder goes and the
      // wrong way up for anything conical you want standing on its point.
      taper(cx, 1.09, out(.10), .118, .05, .118, col.red, { gloss: .34 });
      cyl(cx, 1.145, out(.10), .017, .07, col.charcoal, { gloss: .30 });
      // the hose, hooked over the neck and hanging down the side of the bottle
      capsule(along(.062), 1.03, out(.10), .016, .17, .016, col.black, { rz: .22, gloss: .26 });
      box(cx, .96, out(.165), .085, .10, .01, col.cream, { hard: true, gloss: .20 });
      glyphs(cx, 1.30, out(.035), yaw, '灭火器',
        { size: .048, gap: .010, color: col.redD, mode: 1 });
    }
    // The camera and the loudspeaker, high up where the services go. A bullet camera on a bracket,
    // tilted down at the platform edge — a plain box up there is a junction box, and what makes a
    // camera read as a camera is that it is aimed at something.
    if (dress === 'watch') {
      box(cx, 2.62, out(.015), .11, .13, .03, col.panel, { hard: true, gloss: .24 });
      box(cx, 2.58, out(.05), .06, .07, .08, col.steelD, { hard: true, gloss: G.metal });
      // 1.82 rad, not π/2. A cyl's axis is +y and rotX(a) swings it to (0, cos a, sin a), so π/2
      // lays it dead level and pointing into the room; a quarter of a radian past that drops the
      // far end 14 cm and aims it at the platform edge, which is the thing it is there to watch.
      cyl(cx, 2.52, out(.10), .050, .22, col.charcoal, { rx: f * 1.82, gloss: .34 });
      cyl(cx, 2.492, out(.215), .036, .02, col.black,
        { rx: f * 1.82, mode: 1, gloss: G.glass });
      // and the horn the arrival announcement comes out of. Wide end into the room: `taper` is wide
      // at -y, so rx π/2 puts the mouth at -z and -rx π/2 puts it at +z.
      taper(cx, 2.14, out(.10), .19, .14, .19, col.slab, { gloss: .26, rx: -f * Math.PI / 2 });
      cyl(cx, 2.14, out(.03), .045, .05, col.charcoal, { rx: Math.PI / 2, gloss: .30 });
    }
  }

  // A bench: a steel frame and four slats, which is what a platform seat is everywhere.
  //
  // `left` is what somebody left on it. Two empty benches read as a set nobody has walked through
  // yet, and the fix for that is not a moulded person sitting on one — there are no seated bodies in
  // this file and a grey lump on a bench is worse than an empty bench. It is the litter. A folded
  // newspaper on the seat and a cup under the far end say the same thing about the room and cost
  // eight props instead of a mannequin.
  function bench(cx, cz, left) {
    for (const s of [-1, 1]) {
      box(cx + s * .62, .22, cz, .07, .44, .40, col.steelD, { hard: true, gloss: G.metal });
      box(cx + s * .62, .02, cz, .16, .04, .46, col.steelD, { hard: true, gloss: G.metal });
    }
    for (let i = 0; i < 4; i++)
      box(cx, .45, cz - .15 + i * .10, 1.36, .05, .085, col.blueL,
        { hard: true, gloss: .30 });
    box(cx, .70, cz + .22, 1.36, .40, .05, col.blueL, { hard: true, rx: -.14, gloss: .30 });
    solid(cx - .74, cx + .74, cz - .28, cz + .32);
    shade(cx, cz, 1.8, .9, .24);
    // A soft dark pool under the seat as well as the cast shadow above. The slats are 45 cm up with
    // daylight nowhere near them, so the floor under a bench is the darkest patch of tile in the
    // room and was exactly as bright as the tile beside it.
    shade(cx, cz + .02, 1.30, .55, .22, .012);
    // 报纸 a folded evening paper, dropped on the seat where somebody was sitting. Ry'd off square,
    // because nothing anybody puts down lands parallel to the thing they put it on, and a newspaper
    // squared up with the slats reads as part of the bench.
    if (left === 'paper') {
      box(cx - .34, .487, cz + .01, .27, .018, .19, col.cream,
        { ry: .21, gloss: .12, round: .004 });
      // the fold, and the masthead band across the top of it
      box(cx - .34, .498, cz + .06, .27, .006, .085, C('#dcd6c6'), { ry: .21, gloss: .10 });
      box(cx - .40, .499, cz - .05, .12, .004, .022, col.charcoal,
        { hard: true, ry: .21, gloss: .10 });
      box(cx - .28, .499, cz - .02, .17, .004, .010, col.band, { hard: true, ry: .21 });
      box(cx - .28, .499, cz + .00, .17, .004, .010, col.band, { hard: true, ry: .21 });
    }
    // and a paper cup left standing under the other one. On the floor, not on the seat: a cup left
    // on a bench falls off, and the one place a cup survives on a platform is tucked against a leg.
    if (left === 'cup') {
      // A straight cyl, not a taper. `taper` narrows to .36 of its base and only upward, so a cup
      // built from one is either a golf tee or, flipped, a funnel — the flare on a real paper cup
      // is far too slight to be worth the wrong silhouette.
      cyl(cx + .52, .046, cz - .17, .030, .092, col.white, { gloss: .18 });
      cyl(cx + .52, .091, cz - .17, .033, .010, C('#8c4a2a'), { gloss: .22 });
      cyl(cx + .52, .028, cz - .17, .031, .020, col.band, { gloss: .16 });
      shade(cx + .52, cz - .17, .17, .17, .26, .010);
    }
  }

  // ---- set dressing the tick animates. Declared up here because `build` fills them, and a const
  // declared further down the module is still in its temporal dead zone while build is running.
  //
  // The station clock: a face on the end wall, so its hands sweep about the x axis — the length of
  // a hand runs up the wall at twelve o'clock and the rotation carries it round from there.
  // Where its centre is, up here rather than inside `build`, because `setClockHands` rebuilds every
  // hand matrix from scratch every frame and used to repeat the two numbers as literals. Two copies
  // of a pivot is one copy too many: move the clock and the hands stay behind on the old wall.
  const clockHands = {}, CLY = 2.56, CLZ = .95;
  // The four backlit poster boxes. A fluorescent lightbox is never quite steady: the tube warms and
  // drifts, and there is always one in a station on its way out.
  const adPanels = [];
  // The clerk behind the service window: her torso and shoulders, her head, the forearm on the ledge,
  // and the point on the stool she turns about.
  const clerk = { body: [], head: null, arm: null, pivot: null };

  function build() {
    // ================================================================ shell
    // The floor is mode 9, which draws its own slab grid, so it gets no drawn-on joints: the old
    // ones ran at 1.05 and 1.15 against the shader's own pitch and the floor came out as two
    // grids at odds with each other. What it gets instead is a dark inlay border and, further
    // down, a tactile guidance strip, which is what a station floor actually has on it.
    // Gloss .44, not .26. This stone is polished, and polish is the only thing standing in for the
    // reflections the renderer does not do: the pools under the battens, the shade under the
    // benches and the smear under every column all read off the specular term, and at .26 they were
    // matte patches on a matte floor.
    // The material on top of that: a tiling surface read triplanar in world space (js/assets.js),
    // which needs no UVs and repeats at a real size in metres.
    //
    // `concrete` and not `paving`, which is the obvious pick and the wrong one. PavingStones138 is
    // a field of 5 cm setts; at any repeat small enough for the stones to read, the concourse
    // turns into a cobbled lane, and at any repeat large enough to stop that they are boulders.
    // Mode 9 is already drawing the slab: what the material has to add is what is *inside* a slab,
    // and that is grain and cloud, not a second set of joints. 2.4 m puts one soft drift of tone
    // across four slabs, which is how a polished floor actually varies.
    //
    // `matAmt` is not just how visible the texture is, it is how much brighter it makes the
    // surface: the shader divides the sample by 0.22 — mid grey — so anything paler than that
    // multiplies the colour up rather than tinting it. Concrete034 averages 0.48 linear, which is
    // a 29% lift at the .24 used here and 34% at .28, and this is the one surface in the room
    // where that matters most: the note at the top of `col` darkened this stone on purpose, and
    // the light pooled on it only reads as light because the stone under it is not already white.
    // It is the reason every number in this file's material pass is at the low end — the palette
    // was chosen deliberately, and the texture is here to stop surfaces being flat rather than to
    // repaint the station.
    flat(0, 0, 0, RX * 2, RZ * 2, col.floor,
      { mode: 9, gloss: .44, mat: 'concrete', matScale: 2.40, matAmt: .24 });
    // The border, as a pair rather than one line: a dark band with a pale fillet inside it. Every
    // stone floor laid in China gets a 波打线 like this round the edge of the field, and one grey
    // stripe on grey stone is a scuff mark — it is the two of them together, one dark and one
    // light, that read as a border laid on purpose.
    for (const [x, z, w, d] of [[0, -RZ + .55, RX * 2 - 1.1, .16], [0, RZ - .55, RX * 2 - 1.1, .16],
                                [-RX + .55, 0, .16, RZ * 2 - 1.1], [RX - .55, 0, .16, RZ * 2 - 1.1]])
      flat(x, .004, z, w, d, col.granite, { gloss: .40 });
    for (const [x, z, w, d] of [[0, -RZ + .74, RX * 2 - 1.5, .05], [0, RZ - .74, RX * 2 - 1.5, .05],
                                [-RX + .74, 0, .05, RZ * 2 - 1.5], [RX - .74, 0, .05, RZ * 2 - 1.5]])
      flat(x, .0045, z, w, d, col.floorL, { gloss: .38 });
    // ---- 顶 the ceiling. A suspended metal-panel ceiling on a dark plenum: strips of panel with
    // the reveal between them showing through, cross joints, three lit coffers with the battens
    // down them, and the duct and sprinkler run that no station is without. A single flat quad is
    // the one surface in a room you cannot put anything in front of, so it has to carry itself.
    // Flat, and shallow. Ribs hanging 16 cm below the panel line turned the whole ceiling into a
    // lattice of beams — a pergola, not a station. What it needs is a continuous field of panel
    // with the reveal between the strips reading as a thin dark line, the battens hanging below it
    // as the fittings they are, and the services running along one side.
    B.props.push({ mesh: 'quad', color: col.plenum, mode: 1, alpha: 1,
      m: M.mul(M.trans(0, H, 0), M.mul(M.rotZ(Math.PI), M.scale(RX * 2, 1, RZ * 2))) });
    // Thin, and lifted. A downward-facing surface catches almost no light, so an unlit ceiling
    // panel comes out the colour of milk chocolate however pale you paint it: the panels carry a
    // glow of their own and the joints do not, which is what makes them read as joints.
    for (let i = 0; i < 13; i++)
      box(0, H - .015, -RZ + .40 + i * .80, RX * 2 - .14, .03, .77, col.panel,
        { hard: true, gloss: .20, glow: .22 });
    // The cross joints, a shade below the panels so no crossing shares a plane with anything. They
    // carry a glow of their own too, just less than the panels: unlit against lit panels a 3 cm
    // joint reads as a timber beam, and nine of them running the length of the room read as a
    // pergola over the platform.
    for (let i = -4; i <= 4; i++)
      box(i * 1.28, H - .045, 0, .022, .035, RZ * 2 - .14, col.grout,
        { hard: true, gloss: .18, glow: .13 });
    // a duct down one side and a sprinkler run down the other, below the panels where you would
    // see them. No service band across the gate line: the two hanging signs are already there.
    // The duct takes `steel`. Its repeat is 55 cm and it holds fifteen ribs across, so the
    // corrugation lands about every 3.7 cm — trunking, at the size trunking is pressed. It is the
    // one run of plant in the room that is meant to look like plant rather than like finish, and a
    // flat pale box ten metres long above head height is a beam.
    box(-RX + .78, H - .20, .40, .42, .28, RZ * 2 - 1.4, col.panel,
      { hard: true, gloss: .28, glow: .22, mat: 'steel', matScale: .55, matAmt: .32 });
    for (let i = 0; i < 9; i++) {
      const pz = -RZ + .70 + i * 1.15;
      cyl(RX - .88, H - .17, pz, .03, 1.16, col.redD, { rx: Math.PI / 2, gloss: .34 });
      // 喷淋头 a sprinkler head on every second length of pipe. They were a bare red pipe, which is a
      // pipe — what makes a sprinkler run read as one is the heads hanging off it, and there is
      // nothing else on a ceiling shaped like one. A boss where it screws into the main, a short
      // drop, the two arms of the yoke and the deflector plate across the bottom, plus the little
      // glass bulb that has to break before any of it does anything.
      // Every second length, and nothing past the platform edge: the main already runs the full depth
      // of the room, which puts its last two lengths over the running line, and a sprinkler head
      // hanging over live track is one of the few things a station genuinely does not have.
      if (i % 2 || pz > EDGEZ - .2) continue;
      cyl(RX - .88, H - .21, pz, .035, .05, col.redD, { gloss: .30 });
      cyl(RX - .88, H - .265, pz, .017, .07, col.chrome, { gloss: G.metal });
      for (const s of [-1, 1])
        box(RX - .88 + s * .026, H - .315, pz, .010, .07, .012, col.chrome,
          { hard: true, gloss: G.metal });
      cyl(RX - .88, H - .352, pz, .033, .006, col.chrome, { gloss: G.metal });
      cyl(RX - .88, H - .305, pz, .006, .035, C('#c8452f'), { mode: 1, gloss: G.glass });
    }
    // ---- what else is on a station ceiling, because it is never only panel. A suspended ceiling in
    // a Chinese public building carries four things you can name from the floor: recessed downlights
    // between the battens, smoke detectors, the speakers the concourse announcements come out of,
    // and a camera dome over anywhere money changes hands. None of them is big, and together they
    // are the difference between a ceiling and a lid — this was 13 m by 10 of unbroken panel with
    // nothing mounted on it anywhere, which is the one thing a ceiling never is.
    //
    // All of it placed clear of the battens (z -3.40, .30 and 2.60), of the duct (x -5.83 to -5.41)
    // and of the sprinkler main (x 5.52): a downlight inside a light fitting is a hole in it.
    for (const dz of [-4.55, -2.25]) for (const dx of [-4.60, -1.90, 1.90, 4.60]) {
      cyl(dx, H - .032, dz, .088, .024, col.panel, { gloss: .26, glow: .10 });
      cyl(dx, H - .050, dz, .070, .014, col.steelP, { gloss: G.metal });
      litten(cyl(dx, H - .058, dz, .062, .010, C('#fff1d4'), { mode: 1, glow: .50 }), .55);
      // and its own small pool on the stone below, which is where a downlight is actually seen
      glow(M.trs(dx, .02, dz, 0, 1.55, 1, 1.55), C('#f9f0dc'), .030);
    }
    // 烟感 the smoke detectors: a white disc with a red pilot in it, which is the whole of what one
    // looks like from three metres down.
    for (const [sx, sz] of [[-5.00, -1.10], [0.40, -4.10], [-2.20, .90], [3.20, 1.70],
                            [5.00, -3.00]]) {
      cyl(sx, H - .042, sz, .054, .022, col.white, { gloss: .22, glow: .08 });
      cyl(sx, H - .056, sz, .030, .012, col.panel, { gloss: .20 });
      cyl(sx + .022, H - .060, sz, .006, .008, C('#d8503a'), { mode: 1, glow: .22 });
    }
    // 广播 the ceiling speakers. The horns on the platform columns announce the platform; the
    // concourse is announced from up here and had nothing to be announced from.
    for (const [sx, sz] of [[-3.90, -2.10], [2.90, -4.30], [-2.60, 1.90], [4.20, 2.20]]) {
      cyl(sx, H - .034, sz, .105, .028, col.panel, { gloss: .24, glow: .10 });
      cyl(sx, H - .056, sz, .082, .016, col.grout, { gloss: .18 });
      cyl(sx, H - .062, sz, .022, .008, col.charcoal, { gloss: .24 });
    }
    // 摄像头 a camera dome over the gate line and another over the platform: half a dark ball on a
    // white collar. The shape is the whole of it and there is nothing else on a ceiling shaped
    // like one.
    for (const [sx, sz] of [[-1.00, -1.95], [2.20, 1.30]]) {
      cyl(sx, H - .045, sz, .098, .028, col.white, { gloss: .24, glow: .08 });
      ball(sx, H - .075, sz, .088, .072, .088, C('#2b3036'), { gloss: .42 });
    }
    // ---- 墙 three tiled faces. The +z wall stays plaster: the screen doors and the train cover
    // every centimetre of it. The -z run stops at the stairwell rather than crossing it.
    const STAIRW = 1.15;
    for (const [x, y, z, w, h, yaw] of [
      [0, H / 2, RZ, RX * 2, H, Math.PI],
      // The two end walls stop at the platform edge instead of running the full depth, because the
      // trackside beyond it is where the running tunnel goes and a train has to be able to come out
      // of it. What is left above each opening is a lintel, added after this list.
      [-RX, H / 2, (-RZ + TRACKZ) / 2, TRACKZ + RZ, H, Math.PI / 2],
      [RX, H / 2, (-RZ + TRACKZ) / 2, TRACKZ + RZ, H, -Math.PI / 2],
      [-RX, (BORE_H + H) / 2, (TRACKZ + RZ) / 2, RZ - TRACKZ, H - BORE_H, Math.PI / 2],
      [RX, (BORE_H + H) / 2, (TRACKZ + RZ) / 2, RZ - TRACKZ, H - BORE_H, -Math.PI / 2],
      [(SX + STAIRW + RX) / 2, H / 2, -RZ, RX - SX - STAIRW, H, 0],
      [(-RX + SX - STAIRW) / 2, H / 2, -RZ, SX - STAIRW + RX, H, 0],
      [SX, (2.70 + H) / 2, -RZ, STAIRW * 2, H - 2.70, 0],
    ]) wall(x, y, z, w, h, yaw, col.wall,
      { mode: 4, mat: 'plaster', matScale: .62, matAmt: .12, nrm: null });
    // The pilasters go where nothing is mounted. One standing 17 cm off the wall behind a board
    // that stands 3 cm off it does not break up the run, it z-fights with the back of the board.
    // Tiled only as far as the platform edge. Past that is tunnel, and tunnels are not tiled.
    // The pilaster offsets are measured along the run, so shortening the run moves them: these are
    // the old absolute positions minus the new centre, with the ones that fell on the trackside
    // dropped rather than dragged back into the room.
    const sideRun = TRACKZ + RZ, sideMid = (-RZ + TRACKZ) / 2;
    tiledWall(-RX, sideMid, sideRun, 1, 0, { pilasters: [-4.25 - sideMid, .40 - sideMid] });
    tiledWall(RX, sideMid, sideRun, -1, 0, { pilasters: [-1.20 - sideMid, 1.60 - sideMid] });
    tiledWall((SX + STAIRW + RX - .10) / 2, -RZ, RX - SX - STAIRW - .10, 0, 1,
      { pilasters: [-1.145, 4.625] });
    // the reveal down the side of the stairwell opening
    box(SX + STAIRW + .08, 1.35, -RZ + .09, .16, 2.70, .18, col.granite,
      { hard: true, gloss: .30 });
    box(SX, 2.78, -RZ + .09, STAIRW * 2 + .32, .16, .18, col.granite,
      { hard: true, gloss: .30 });

    // ================================================================ 出口 the stairs up
    // A flight going up into daylight, through a real hole in the -z wall and into a lightwell
    // beyond it. It used to be a solid charcoal slab across the opening with the flight built
    // behind it, so the one thing in the room that says "underground" was a black rectangle.
    const sz0 = -RZ + .10;
    // the well: two tiled cheeks, a soffit over the flight, and a landing wall at the head of it
    // The well starts at z = -5.24, clear of the wall plane at -5.20 and of the tiled face in
    // front of it: a cheek whose front face landed on -5.10 shared a plane with the tile and the
    // two of them fought for the whole height of the opening.
    for (const s of [-1, 1]) {
      box(SX + s * 1.22, 1.45, -RZ - 1.10, .16, 2.90, 2.12, col.tile,
        { hard: true, gloss: .30, mat: 'tile', matScale: .78, matAmt: .30 });
      box(SX + s * 1.22, .13, -RZ - 1.10, .20, .26, 2.16, col.granite,
        { hard: true, gloss: .34, mat: 'concrete', matScale: .90, matAmt: .28 });
    }
    box(SX, 2.86, -RZ - 1.10, 2.60, .22, 2.12, col.slab,
      { hard: true, gloss: .22, mat: 'concrete', matScale: 1.40, matAmt: .26 });
    // the flight, rising away from the room, with a nosing on every tread
    // Cast concrete, at a repeat well over a tread's going, so the grain runs across the flight
    // rather than restarting on every step — eight identically textured treads is a stack of
    // stickers, and what makes a poured stair read as poured is that it was poured in one piece.
    for (let i = 0; i < 8; i++) {
      box(SX, .09 + i * .18, -RZ - .15 - i * .26, 2.10, .19, .28, col.slab,
        { hard: true, gloss: .22, mat: 'concrete', matScale: 1.10, matAmt: .28 });
      box(SX, .185 + i * .18, -RZ - .28 - i * .26, 2.10, .022, .035, col.yellow,
        { hard: true, mode: 1 });
    }
    // What is up there: daylight at the head of the flight, and the wash of it down the steps.
    litten(box(SX, 1.86, -RZ - 2.14, 2.20, 1.42, .06, C('#dae4ea'),
      { hard: true, mode: 1, glow: .40 }), -.6);
    litten(box(SX, 2.66, -RZ - 2.12, 2.24, .28, .06, C('#f2f6f8'),
      { hard: true, mode: 1, glow: .52 }), -.7);
    litten(box(SX, 1.50, -RZ - 2.08, 2.16, .05, .04, C('#eef4f7'),
      { hard: true, mode: 1, glow: .34 }), -.5);
    // ---- and what the daylight is daylight *of*. Those three panels are a lightbox: bright, and
    // saying nothing except "not indoors". What is missing is a street, and the street cannot be
    // built up there — the big panel is also what takes a body out of the world at the head of the
    // flight, which is why `WALK.stairTop` sits 56 cm behind it. Anything put beyond it is invisible
    // and anything put *instead* of it puts commuters back on stage.
    //
    // So it stays exactly as it is and the street is painted in front of it, in bands: the pavement
    // you step out onto, the kerb, the block across the road with its windows, and sky above that,
    // which is the panel itself showing through. It is a backdrop and it is meant to be — 17 cm of
    // depth between the top tread and the panel is not enough for anything else, and a flat elevation
    // seen from the bottom of a flight of stairs at a steep angle is exactly what a real one looks
    // like through a stairwell opening.
    const upZ = -RZ - 2.09;
    box(SX, 1.53, upZ, 2.12, .17, .01, C('#b9bcbc'), { hard: true, mode: 1, glow: .26 });
    box(SX, 1.625, upZ, 2.12, .025, .01, C('#8a8d8d'), { hard: true, mode: 1, glow: .18 });
    box(SX, 1.86, upZ, 2.12, .44, .01, C('#a8aeb2'), { hard: true, mode: 1, glow: .22 });
    // four windows in it, dark, because a window across the street in daylight is a dark hole
    for (let i = 0; i < 4; i++)
      box(SX - .78 + i * .52, 1.88, upZ + .008, .20, .28, .01, C('#5c666e'),
        { hard: true, mode: 1, glow: .10 });
    // and the silhouettes, in front of the lot: a newel post each side of the opening and the top
    // rail of the railing that goes round every one of these entrances, with a bollard beyond it.
    // Near-black — against a panel glowing at .40 anything with its own colour reads as a painted
    // shape rather than as something standing between you and the light.
    for (const s of [-1, 1]) {
      box(SX + s * .92, 1.80, -RZ - 2.02, .07, .70, .07, col.black,
        { hard: true, mode: 1, glow: .02 });
      box(SX + s * .92, 2.16, -RZ - 2.02, .09, .05, .09, col.black,
        { hard: true, mode: 1, glow: .02 });
    }
    box(SX, 2.13, -RZ - 2.02, 1.90, .05, .05, col.black, { hard: true, mode: 1, glow: .02 });
    box(SX, 1.78, -RZ - 2.02, 1.90, .035, .035, col.black, { hard: true, mode: 1, glow: .02 });
    // Two posts and two rails and no more. A bollard went in beyond the right-hand post and came
    // straight back out: there are 15 cm of clear width between that post and the cheek of the well,
    // so anything standing there overlaps the post, and two near-black shapes 3 cm apart against a
    // bright panel do not read as two objects — they read as one lump with a bite out of it.
    glow(M.trs(SX, .02, -RZ + .95, 0, 2.8, 1, 2.6), C('#dfe9f2'), .11);
    for (const s of [-1, 1]) {
      capsule(SX + s * .96, 1.02, sz0 - .95, .028, 2.30, .028, col.chrome,
        { rx: -.62, gloss: G.metal });
    }
    // 出口 over the opening, and the arrow that goes with it
    box(SX, 2.86, sz0 + .16, 1.30, .34, .07, col.jade, { hard: true, gloss: .24 });
    glyphs(SX - .16, 2.86, sz0 + .20, 0, '出口',
      { size: .19, gap: .06, color: col.white, mode: 1 });
    // a chevron pointing up the steps, as two bars meeting at a point. Three bars of decreasing
    // height in a row read as a bar chart.
    for (const s of [-1, 1])
      box(SX + .48, 2.86 + s * .035, sz0 + .20, .13, .028, .01, col.white,
        { hard: true, mode: 1, rz: s * .78 });
    exitThing = thing('门', SX, 2.62, sz0 + .60, '上去，出站。', 'Up the steps and out.',
      'The same 门 as every other way out. 出站 is to leave a station.',
      { focus: [SX, sz0 + 1.50], reach: 2.1 });
    exitThing.exit = STATIONS[0].out;
    solid(SX - 1.20, SX + 1.20, -RZ, sz0 + .18);

    // ================================================================ 自动售票机 the ticket hall
    // Three machines against the -z wall between the stairs and the line map, the fare table over
    // the top of them, and a queue line painted on the floor in front. Each machine is a sloped
    // console: a lit touchscreen with a strip of the line down it, a card pad, a coin slot, a note
    // slot, and the tray the ticket drops into.
    // The -z wall is at z = -RZ and the room is in front of it, so everything on this wall builds
    // outward in +z: the machine's back is against the tile and its screen, slots and tray are all
    // on the far side of its own body. Built at -RZ + .13 they were inside the wall, and the whole
    // bank read as three blank grey cupboards.
    MACHX.forEach((mx, i) => {
      const T = { tag: '售票机' };
      // The generated fixture may replace the moulded carcass, but the authored display, fare
      // controls, collider and language interaction below remain authoritative and deterministic.
      modelOr('metro_ticket_machine', mx, 0, MBZ, 1, { ...T, gloss:.30 }, () => {
        box(mx, .74, MBZ, .96, 1.48, .56, col.steelD,
          { ...T, gloss: .34, mat: 'steel', matScale: .40, matAmt: .32 });
        box(mx, 1.50, MBZ, 1.00, .07, .60, col.chrome, { ...T, hard: true, gloss: G.metal });
        // the console shelf, raked toward you, and the screen standing above it
        box(mx, 1.20, MFZ - .10, .92, .07, .34, col.slab,
          { ...T, hard: true, rx: .38, gloss: .28 });
      });
      box(mx, 1.20, MFZ + .02, .74, .56, .04, col.charcoal, { ...T, hard: true, gloss: .34 });
      litten(box(mx, 1.20, MFZ + .05, .64, .46, .02, C('#173a4a'),
        { ...T, hard: true, mode: 1, glow: .26 }), .5);
      // ---- what is actually on the screen. It used to be a strip of the line, six dots and the
      // word 买票 floating in the middle of a blue field, which is a poster rather than a machine:
      // nothing on it was a control, nothing said what a journey cost, and the one part that could
      // have taught something — the name of the station you are buying a ticket to — was not there.
      //
      // So it is now a transaction caught halfway through, and each of the three machines is
      // halfway through a different one. Destination, fare and the two buttons all agree with the
      // 票价表 hanging above them: 商务区 is one stop and three yuan, 公园 four and four, 机场 six
      // and five. Static, because a touchscreen nobody can touch that changed by itself would be a
      // worse lie than one that does not move.
      //
      // 机场 moved from five stops to six when 动物园 was opened between it and 公园, and the fare
      // did not move with it: the top band is 五六站 五元, so the sixth stop costs what the fifth
      // did. That is the one thing inserting a station into the middle of a line changes
      // everywhere at once — the machines, the table above them and `FARES` in game.js all have to
      // agree, and they are the three places a new stop is easiest to forget.
      const [dest, fare, di] = [['商务区', '三元', 1], ['公园', '四元', 4],
                                ['机场', '五元', 6]][i];
      // the header band, which is the one part of a Chinese TVM screen that is always the same
      box(mx, 1.395, MFZ + .058, .62, .062, .01, C('#2b6f86'),
        { ...T, hard: true, mode: 1, glow: .30 });
      glyphs(mx - .21, 1.395, MFZ + .066, 0, '买票',
        { size: .050, gap: .014, color: C('#eaf6f8'), mode: 1, tag: '售票机' });
      glyphs(mx + .13, 1.395, MFZ + .066, 0, '选择车站',
        { size: .040, gap: .010, color: C('#a9d3dd'), mode: 1, tag: '售票机' });
      // the line, drawn across the screen as a bar with the six stops on it, and the one this
      // machine is selling a ticket to lit up. The bright dot used to be `i * 2`, which was three
      // machines each highlighting a different arbitrary stop; now it is the destination named two
      // rows below, so the two halves of the screen are describing the same journey.
      box(mx, 1.30, MFZ + .065, .50, .022, .01, C('#7fd8e0'),
        { ...T, hard: true, mode: 1, glow: .30 });
      for (let k = 0; k < 6; k++)
        box(mx - .25 + k * .10, 1.30, MFZ + .07, .036, .036, .01,
          k === di ? C('#ffd66b') : k === 0 ? C('#f0f6f8') : C('#bfe6ec'),
          { ...T, hard: true, mode: 1, glow: k === di ? .38 : .28 });
      // 到 and the name of the station, on a field of its own so it reads as a chosen value
      // rather than as more of the same blue. A three-character name is 2 cm wider than a
      // two-character one and the field is sized for the longer of them, because a box that
      // shrink-wraps the text makes the two-character machines look like a different model.
      box(mx, 1.185, MFZ + .058, .46, .085, .01, C('#0f2d3c'),
        { ...T, hard: true, mode: 1, glow: .16 });
      glyphs(mx - .175, 1.185, MFZ + .068, 0, '到',
        { size: .050, gap: 0, color: C('#8fc4d2'), mode: 1, tag: '售票机' });
      glyphs(mx + .045, 1.185, MFZ + .068, 0, dest,
        { size: .056, gap: .014, color: C('#ffe9b0'), mode: 1, tag: '售票机' });
      // 车费, which is the number the fare table exists to teach and the one thing a ticket
      // machine in a game about learning Chinese has no excuse for not saying
      glyphs(mx - .175, 1.088, MFZ + .068, 0, '车费',
        { size: .046, gap: .012, color: C('#a9d3dd'), mode: 1, tag: '售票机' });
      glyphs(mx + .085, 1.088, MFZ + .068, 0, fare,
        { size: .058, gap: .014, color: C('#ffd66b'), mode: 1, glow: .12, tag: '售票机' });
      // 确认 and 取消, the two buttons every one of these screens ends with. Green and grey, the
      // green one brighter, because on a real machine the one you are meant to press is lit.
      for (const [bx, bw, c, txt, tc, gl] of [
        [mx - .155, .26, C('#2f7d52'), '确认', C('#e8f7ec'), .34],
        [mx + .165, .22, C('#3b4a54'), '取消', C('#c3ced4'), .16]]) {
        box(bx, 1.012, MFZ + .058, bw, .072, .01, c, { ...T, hard: true, mode: 1, glow: gl });
        glyphs(bx, 1.012, MFZ + .068, 0, txt,
          { size: .046, gap: .012, color: tc, mode: 1, tag: '售票机' });
      }
      // 刷卡 the card pad on the shelf, and a service light up on the fascia
      box(mx + .30, 1.10, MFZ - .10, .18, .03, .18, col.jadeL,
        { ...T, hard: true, mode: 1, glow: .22, rx: .38 });
      // and on the middle machine, a card left on the pad by whoever used it last. The whole bank
      // of three is otherwise untouched, which is the thing that makes a row of machines read as a
      // showroom: somebody is always halfway through at one of them. Raked with the shelf, or it
      // floats off the front edge of it — the shelf is tipped .38 rad toward you and a card laid
      // flat on a raked surface is a card standing on one corner.
      if (i === 1) {
        box(mx + .30, 1.121, MFZ - .112, .086, .004, .054, col.blue,
          { ...T, hard: true, gloss: .34, rx: .38 });
        box(mx + .317, 1.124, MFZ - .120, .022, .004, .017, col.gold,
          { ...T, hard: true, gloss: G.metal, rx: .38 });
      }
      litten(box(mx - .40, 1.42, MFZ + .02, .05, .05, .02,
        i === 1 ? C('#e0644c') : C('#7fe0a4'), { ...T, hard: true, mode: 1, glow: .30 }), .5);
      // coins in, notes in, ticket out
      box(mx + .28, .86, MFZ + .01, .09, .02, .04, col.black, { ...T, hard: true, gloss: .30 });
      box(mx - .12, .82, MFZ + .01, .24, .03, .04, col.black, { ...T, hard: true, gloss: .30 });
      box(mx, .62, MFZ, .34, .11, .05, col.black, { ...T, hard: true, gloss: .26 });
      box(mx, .56, MFZ + .02, .30, .02, .03, col.chrome, { ...T, hard: true, gloss: G.metal });
      solid(mx - .52, mx + .52, -RZ, MFZ + .04);
    });
    // 票价表 the fare table. Real numbers, because a board with four ruled lines on it teaches
    // nothing and this one is the only place in the game that says what a journey costs.
    const FZ = -RZ + .14;
    box(-2.24, 2.26, FZ, 3.20, .96, .06, col.blue, { hard: true, gloss: .24 });
    box(-2.24, 2.26, FZ + .045, 3.06, .84, .02, col.navy, { hard: true, mode: 1 });
    glyphs(-3.30, 2.56, FZ + .07, 0, '票价表',
      { size: .13, gap: .04, color: col.white, mode: 1 });
    glyphs(-1.00, 2.56, FZ + .07, 0, '自动售票机',
      { size: .10, gap: .03, color: C('#9fc0d8'), mode: 1 });
    [['一两站', '三元'], ['三四站', '四元'], ['五六站', '五元']].forEach(([n, p], i) => {
      const y = 2.32 - i * .17;
      glyphs(-3.10, y, FZ + .07, 0, n,
        { size: .095, gap: .025, color: C('#dfe8ee'), mode: 1 });
      glyphs(-2.36, y, FZ + .07, 0, p,
        { size: .095, gap: .025, color: col.goldL, mode: 1 });
    });
    glyphs(-1.10, 2.32, FZ + .07, 0, '交通卡二十元',
      { size: .085, gap: .02, color: C('#dfe8ee'), mode: 1 });
    glyphs(-1.10, 2.15, FZ + .07, 0, '刷卡便宜一元',
      { size: .085, gap: .02, color: C('#7fe0a4'), mode: 1 });
    glyphs(-1.10, 1.98, FZ + .07, 0, '可以充值',
      { size: .085, gap: .02, color: C('#dfe8ee'), mode: 1 });
    // where the queue goes
    flat(-2.24, .006, -RZ + 1.16, 3.30, .05, col.yellow, { gloss: .12 });
    for (let i = 0; i < 3; i++)
      flat(MACHX[i], .006, -RZ + .96, .50, .05, col.yellow, { gloss: .12 });
    thing('售票机', -2.24, 1.76, -RZ + .34, '在售票机买票。',
      'Buy a ticket from the machine.',
      '售 to sell + 票 ticket + 机 machine. 单程票 a single; 交通卡 a travel card.',
      { focus: [-2.24, -RZ + 1.50], reach: 2.2 });

    // ================================================================ 服务中心 the service window
    // A window in the +x wall of the concourse with somebody behind it. It sells nothing: it is
    // where you find out what station you are in, what the fare is, and what 补票 means.
    // The room is at -x of this wall, so the window builds outward in -x and the carcass has to be
    // a frame with a hole in it: piers, a header, a sill. Built as one slab with the glass and the
    // sign tucked inside its thickness, the whole thing was a blank grey panel.
    const svz = -3.60, SVX = RX - .30, SVF = SVX - .17;
    const SV = { tag: '服务中心' };
    for (const s of [-1, 1])
      box(SVX, 1.40, svz + s * 1.02, .34, 2.80, .86, col.tile,
        { hard: true, gloss: .30, mat: 'tile', matScale: .78, matAmt: .30 });
    box(SVX, 2.42, svz, .34, .76, 1.18, col.tile,
      { hard: true, gloss: .30, mat: 'tile', matScale: .78, matAmt: .30 });
    box(SVX, .52, svz, .34, 1.04, 1.18, col.tile,
      { hard: true, gloss: .30, mat: 'tile', matScale: .78, matAmt: .30 });
    // what is behind the glass: a lit back wall and the clerk's own ledge
    litten(box(SVX + .12, 1.54, svz, .04, .96, 1.14, C('#e2e8e0'),
      { ...SV, hard: true, mode: 1, glow: .24 }), .5);
    box(SVX + .02, 1.08, svz, .28, .08, 1.14, col.slab, { ...SV, hard: true, gloss: .26 });
    // and somebody behind it, as a head and a pair of shoulders against the light, which is all
    // you see of the person in a booth like this
    // As a box and a ball at three-quarter alpha this was a grey lump — not dark enough to be a
    // silhouette and not shaped enough to be a person. Darker, with sloped shoulders, a neck
    // between the two and a forearm resting on the ledge inside, and it reads as somebody sitting
    // there, which is the entire point of putting a window in a wall.
    //
    // And she moves. Not the shape — the shape is right — but the fact that she held it. This room
    // has a train on a timetable, four gate lanes that open, a failing tube, a marching board, a
    // sweeping clock and a chasing edge light, and the one thing in it that was supposed to be alive
    // was the only thing that never changed by a millimetre. `clerk` collects her pieces and the tick
    // turns them about the stool: a long slow shift of weight, a shorter glance on top of it, and the
    // head a little more than the body, because a person looks before they turn.
    //
    // The pivot is the base of the torso rather than her centre, since somebody on a stool turns
    // about the stool. Turned about the middle of the chest, her hips swung out through the wall.
    clerk.pivot = [SVX + .06, 1.21, svz - .08];
    clerk.body = [
      box(SVX + .06, 1.36, svz - .08, .06, .30, .50, col.charcoal,
        { ...SV, hard: true, mode: 1, alpha: .86 }),
      ...[-1, 1].map(s => ball(SVX + .06, 1.50, svz - .08 + s * .20, .030, .085, .095,
        col.charcoal, { ...SV, mode: 1, alpha: .86 })),
      capsule(SVX + .06, 1.575, svz - .08, .028, .095, .048, col.charcoal,
        { ...SV, mode: 1, alpha: .86 }),
    ];
    clerk.head = ball(SVX + .06, 1.705, svz - .08, .034, .112, .102, col.charcoal,
      { ...SV, mode: 1, alpha: .88 });
    // The forearm is not on the lean. An arm resting on a ledge stays on the ledge while its owner
    // shifts about behind it — carried round with the shoulders it slid along the counter and then
    // back, which reads as somebody polishing it.
    clerk.arm = box(SVX - .01, 1.145, svz + .17, .16, .055, .21, col.charcoal,
      { ...SV, hard: true, mode: 1, alpha: .80 });
    // then the glazing, after it, so the light reads through
    box(SVF + .02, 1.58, svz, .03, .92, 1.14, col.glass,
      { ...SV, hard: true, mode: 1, alpha: .34, gloss: G.glass });
    box(SVF + .01, 1.05, svz, .05, .06, 1.18, col.charcoal, { ...SV, hard: true, gloss: .28 });
    box(SVF + .01, 2.07, svz, .05, .08, 1.18, col.charcoal, { ...SV, hard: true, gloss: .28 });
    // the speak-hole, the tray under it, and the shelf you put your ticket on
    cyl(SVF, 1.42, svz, .07, .04, col.steelD, { ...SV, rz: Math.PI / 2, gloss: G.metal });
    box(SVF - .04, 1.10, svz, .14, .03, .40, col.chrome, { ...SV, hard: true, gloss: G.metal });
    box(SVF - .13, 1.00, svz, .28, .07, 1.32, col.slab, { ...SV, hard: true, gloss: .26 });
    // 交通卡 a travel card lying on the ledge, waiting to be topped up. The fare table two walls
    // away has said 交通卡二十元 and 可以充值 since it was built, and until now the card itself was a
    // word on a poster — the one object in the station the whole fare system is about did not exist.
    // On the ledge and not in a machine's tray, because this is where you put it down: 充值 is done
    // at the window, and a card in the tray would be a card somebody has walked off without.
    //
    // Not `hard`, so it keeps the softBox corner radius. A card is 8.5 cm of rounded plastic and a
    // sharp-cornered one at this size reads as a chip of tile broken off the wall behind it.
    // Tagged 交通卡 and not `...SV`. Spreading the window's tag over it made the card part of the
    // service centre as far as the cursor is concerned: clicking it selected 服务中心, and the 交通卡
    // thing could only ever be found by standing next to it. A thing whose tag no prop wears is a
    // word with nothing to point at.
    const CARDX = SVF - .17, CARDZ = svz - .30, CT = { tag: '交通卡' };
    box(CARDX, 1.0405, CARDZ, .086, .004, .054, col.blue, { ...CT, gloss: .34, round: .006 });
    // the gold chip, and the pale band the numbers are printed on
    box(CARDX + .022, 1.0435, CARDZ - .014, .022, .004, .017, col.gold,
      { ...CT, hard: true, gloss: G.metal });
    box(CARDX - .020, 1.0435, CARDZ + .015, .036, .004, .010, col.cream,
      { ...CT, hard: true, gloss: .22 });
    thing('交通卡', CARDX, 1.10, CARDZ, '我想充值。', 'I would like to top it up.',
      '交通 transport + 卡 card. 充值 is to top up; 刷卡 is what you then do with it.',
      { focus: [SVF - .85, CARDZ], reach: 1.5 });
    box(SVF - .06, 2.34, svz, .10, .40, 1.60, col.jade, { ...SV, hard: true, gloss: .24 });
    for (const g of glyphs(SVF - .12, 2.34, svz, -Math.PI / 2, '服务中心',
        { size: .17, gap: .05, color: col.white, mode: 1, tag: '服务中心' })) litten(g, .9);
    glyphs(SVF - .02, 1.90, svz - .74, -Math.PI / 2, '补票',
      { size: .10, gap: .03, color: col.redD, mode: 1, tag: '服务中心' });
    glyphs(SVF - .02, 1.90, svz + .62, -Math.PI / 2, '问路',
      { size: .10, gap: .03, color: col.charcoal, mode: 1, tag: '服务中心' });
    solid(SVF - .32, RX, svz - 1.48, svz + 1.48);
    thing('服务中心', SVF - .40, 1.60, svz, '请问，这是哪一站？',
      'Excuse me — which station is this?',
      '服务 service + 中心 centre. 补票 is to pay the difference on a ticket.',
      { focus: [SVF - 1.60, svz], reach: 2.0 });

    // ================================================================ 线路图 the line map
    // The line as a bar with a dot per station and the names hanging under them, and a ring
    // round the one you are standing in.
    // Built outward from the wall in +z, same as the fare table, and the dots turned about x so
    // they are discs facing the room: about z a disc stands on edge and a station is a white bar.
    //
    // All six stations are open now. They were not when this was written — the comment here said
    // "two of them are open" and the 线路图 note taught 在建 as the word for the other four — and the
    // rest of the line got built underneath both of them without either being corrected. The map
    // itself was always honest, because it reads `s.out` rather than a hardcoded count, so the dots
    // went blue one at a time as each district was built and nobody noticed the prose had gone
    // stale. The grey path below is kept for the next station added without a place to come up in;
    // as of now nothing takes it.
    const lmx = 3.00, lmy = 1.72, LZ = -RZ + .14;
    box(lmx, lmy, LZ, 4.60, 1.60, .06, col.white, { hard: true, gloss: .22 });
    box(lmx, lmy, LZ + .045, 4.44, 1.46, .02, col.cream, { hard: true, gloss: .18 });
    glyphs(lmx - 1.55, lmy + .60, LZ + .07, 0, '二号线',
      { size: .12, gap: .04, color: col.blue, mode: 1 });
    // Seven stops now, not six. At the old 70 cm pitch the seventh dot landed at +2.45 on a board
    // whose inner panel is 4.44 wide — 23 cm off the end of the map, hanging in clear air beside
    // it. The pitch is derived from the count rather than written down, so the next district to
    // open does not reintroduce the same bug.
    const dotStep = Math.min(.70, 3.60 / Math.max(1, STATIONS.length - 1));
    const dot0 = lmx - dotStep * (STATIONS.length - 1) / 2, dotY = lmy + .30;
    box(lmx, dotY, LZ + .065, dotStep * (STATIONS.length - 1) + .16, .055, .01, col.blue,
      { hard: true, mode: 1, tag: '线路图' });
    STATIONS.forEach((s, i) => {
      const x = dot0 + i * dotStep;
      cyl(x, dotY, LZ + .085, .058, .012, s.out ? col.blue : col.steelD,
        { rx: Math.PI / 2, mode: 1, tag: '线路图' });
      cyl(x, dotY, LZ + .095, .034, .012, col.white,
        { rx: Math.PI / 2, mode: 1, tag: '线路图' });
      glyphs(x, dotY - .34, LZ + .07, 0, s.hz,
        { size: .082, gap: .012, vertical: true, mode: 1, tag: '线路图',
          color: s.out ? col.charcoal : col.steelD });
      // 在建 under anything with nowhere to come up. Under the name rather than beside the dot: the
      // dot pitch is 70 cm and two characters at the pitch of the names would collide with the
      // neighbour's, which is what a map does not do.
      if (!s.out)
        glyphs(x, 1.40, LZ + .07, 0, '在建',
          { size: .052, gap: .012, color: col.orange, mode: 1, tag: '线路图' });
      // 终点站 at both ends, which is the one fact a line map has to carry that a list of stops does
      // not: which way round the line runs, and therefore which train on the platform is yours.
      if (i === 0 || i === STATIONS.length - 1) {
        // Outboard of the dot, not through it. Behind the dot a .17 tall cap shows as two 2 cm
        // stubs poking out top and bottom of a 12 cm disc, which reads as a printing fault.
        box(x + (i ? .11 : -.11), dotY, LZ + .066, .035, .17, .01, col.navy,
          { hard: true, mode: 1, tag: '线路图' });
        glyphs(x, dotY + .19, LZ + .07, 0, '终点站',
          { size: .050, gap: .010, color: col.navy, mode: 1, tag: '线路图' });
      }
    });
    // The ring that says where you are: behind the dots and wider, so it shows as a red edge round
    // one of them. Moved by `setStation`, so it has to be one prop.
    hereRing = cyl(dot0, dotY, LZ + .075, .086, .012, col.red,
      { rx: Math.PI / 2, mode: 1, tag: '线路图' });
    // The key, bottom left. Two rows: what the red ring means and what a grey dot would mean. A map
    // with a "you are here" marker and nothing saying so is a map with a red smudge on it.
    cyl(lmx - 2.02, 1.11, LZ + .075, .048, .012, col.red,
      { rx: Math.PI / 2, mode: 1, tag: '线路图' });
    cyl(lmx - 2.02, 1.11, LZ + .085, .030, .012, col.blue,
      { rx: Math.PI / 2, mode: 1, tag: '线路图' });
    glyphs(lmx - 1.72, 1.11, LZ + .07, 0, '本站',
      { size: .054, gap: .012, color: col.charcoal, mode: 1, tag: '线路图' });
    thing('线路图', lmx, lmy + .82, -RZ + .24, '线路图上有六个站。',
      'There are six stations on the line map.',
      '线路 route + 图 diagram. 终点站 is the far end of the line; 本站 is this one.',
      { focus: [lmx, -RZ + 1.60], reach: 2.2 });

    // ================================================================ 闸机 the gates
    // A railing across the room with four turnstiles in the middle of it. The railing is solid,
    // so the only way onto the platform is through a gate, and a gate wants a ticket.
    for (const s of [-1, 1]) {
      const w = RX - 3.20;
      box(s * (RX + 3.20) / 2, .58, GATEZ, w, 1.16, .16, col.steel,
        { hard: true, gloss: G.metal, mat: 'steel', matScale: .50, matAmt: .34 });
      box(s * (RX + 3.20) / 2, 1.19, GATEZ, w + .04, .06, .20, col.chrome,
        { hard: true, gloss: G.metal });
      for (let i = 0; i < 4; i++)
        box(s * (3.40 + i * .80), .58, GATEZ, .07, 1.16, .20, col.steelD,
          { hard: true, gloss: G.metal });
      // the railing either side of the turnstiles is the only part of this line you cannot cross
      solid(Math.min(s * RX, s * 3.20), Math.max(s * RX, s * 3.20),
        GATEZ - .55, GATEZ + .55);
    }
    for (const cx of CABX) cabinet(cx);
    LANEX.forEach((cx, i) => lane(cx, i < 2));
    // 进站 / 出站 over the two halves of the gate line, hanging from the ceiling.
    for (const [hx, txt, c] of [[-1.50, '进站', col.jade], [1.50, '出站', col.gold]]) {
      box(hx, 2.62, GATEZ - .02, 1.10, .34, .05, c, { hard: true, gloss: .24 });
      glyphs(hx, 2.62, GATEZ - .05, Math.PI, txt,
        { size: .17, gap: .06, color: col.white, mode: 1 });
      glyphs(hx, 2.62, GATEZ + .01, 0, txt,
        { size: .17, gap: .06, color: col.white, mode: 1 });
      for (const s of [-1, 1])
        capsule(hx + s * .44, 2.90, GATEZ, .012, .30, .012, col.steelD, { gloss: G.metal });
    }
    // One thing for the whole line of them, reaching far enough along it to be usable from any
    // lane and from either side — the verb opens a gate, it does not carry you through one, so it
    // has to be within reach of wherever you are standing when you decide to tap.
    thing('闸机', 0, 1.46, GATEZ - .40, '刷卡进站。', 'Tap your card and walk through.',
      '闸 gate + 机 machine. 刷卡 is to tap a card; 进站 in, 出站 out.',
      { focus: [0, GATEZ - .95], reach: 3.5 });
    // 刷卡 the verb, as a word of its own. One thing for all four readers — `pick` resolves a tag
    // to the nearest thing wearing it, and with one there is nothing to resolve. Its reach is
    // deliberately shorter than the gate's and its focus nearer the line, so walking up to the
    // barrier still selects 闸机 and Q still means "tap and go through": this is a word to read,
    // not a second way to open a gate.
    thing('刷卡', LANEX[0] + .60, 1.31, GATEZ - .30, '在闸机上刷卡。',
      'Tap your card on the reader.',
      '刷 to swipe or brush + 卡 card. Said of a travel card, a canteen card, a door badge.',
      { focus: [LANEX[0] + .60, GATEZ - .40], reach: 1.0 });

    // ================================================================ the platform
    // Four columns, four different jobs. The two outer ones face the train, because what an
    // arriving passenger wants is the way out and a camera looking at where they are standing; the
    // two inner ones face the concourse, because a strip map and an extinguisher are read on the
    // way in. Identical and bare, all four were structure — and structure repeated at 2.8 m centres
    // is wallpaper.
    column(-4.20, .95, 'exit', 1); column(-1.40, .95, 'map', -1);
    column(1.40, .95, 'fire', -1); column(4.20, .95, 'watch', 1);
    bench(-3.30, .30, 'paper'); bench(3.30, .30, 'cup');
    // 站台 the yellow line along the edge, with the tactile strip inside it
    flat(0, .006, EDGEZ - .62, RX * 2, .16, col.yellow, { gloss: .12 });
    for (let i = -25; i <= 25; i++)
      cyl(i * .25, .012, EDGEZ - .62, .028, .012, col.steelD, { gloss: .30 });
    flat(0, .005, EDGEZ - .40, RX * 2, .22, col.tileD, { mode: 9, gloss: .18 });
    // 候车灯 the lights set into the platform edge. Dark most of the time and running along the
    // edge when a train is coming, which is the one piece of signage in a station that is telling
    // you something about the next thirty seconds rather than about the network.
    for (let i = -12; i <= 12; i++)
      edgeLamps.push({ p: box(i * .50, .020, EDGEZ - .50, .22, .014, .05, C('#e8b23a'),
        { hard: true, mode: 1, glow: 0 }), t: (i + 12) / 24 });

    // ---- platform screen doors. The piers and the top rail are opaque and go up now; the glass
    // in them is translucent and therefore has to wait until after the train, because a
    // see-through prop still writes depth and glass hung a hand's width in front of a train
    // deletes the train.
    //
    // Five piers with four bays between them, which is a four-door car. Every bay has its doors
    // slid open, leaving a real gap to see the train through — the whole point of standing here.
    // Glazed right across, the platform edge was a white sheet.
    // The piers and, below, the header they carry take `steel` at 60 cm, which is a rib every
    // 4 cm and about fifty-five of them up a 2.2 m pier: ribbed steel cladding, which is what a
    // screen-door pier is faced in. Coarser than the gates' on purpose, because it is read from
    // further away — a grain sized for arm's length is a grey smear from the back of the platform.
    // This is 13 m of the same steel directly in front of everybody waiting, and one flat colour
    // across it is most of what made the whole platform edge read as a single white sheet with
    // slots cut in it.
    for (const px of PIERX)
      box(px, 1.10, EDGEZ, .70, 2.20, .10, col.steel,
        { hard: true, gloss: G.metal, mat: 'steel', matScale: .60, matAmt: .34 });
    // 灯箱 the poster boxes on the screen-door piers, which is where the advertising in a Chinese
    // metro actually is. A platform's four bare walls carry four lightboxes between them; its
    // platform edge is 13 m of pier at eye height directly in front of everybody waiting, and it
    // carried nothing at all — six blank steel slabs, which is what made the whole edge read as one
    // white sheet with slots in it.
    //
    // Only the four inner piers. The two at ±6.40 are half buried in the end wall of the room, and
    // a poster centred on one is a poster cut in half by a corner.
    //
    // Everything here stops below y 1.58, because the door-number plates start at 1.655 — the pier
    // is a shared mounting surface and the number is the one thing on it that has to be read.
    // The depth stack, outward from the pier face at z 3.25: frame 3.22, panel and band 3.21,
    // the picture 3.197, the lettering in front of all of it. The band and the lit panel are on the
    // same plane and therefore must not overlap in y, which is why the panel starts at .67 and the
    // band ends at .63 rather than the two being sized by eye.
    for (const [px, c, pic, txt, strap] of [
      [-3.84, C('#1b4d78'), C('#8fc8e8'), '银行', '存钱方便'],
      [-1.28, C('#752232'), C('#e6b0a0'), '电影', '本周上映'],
      [1.28, C('#1d5c50'), C('#9fd8c4'), '旅游', '去看看'],
      [3.84, C('#6a4a1c'), C('#e8cf92'), '招聘', '找工作']]) {
      box(px, .94, EDGEZ - .065, .62, 1.28, .03, col.charcoal, { hard: true, gloss: .28 });
      litten(box(px, 1.10, EDGEZ - .080, .54, .86, .02, c,
        { hard: true, mode: 1, glow: .22 }), .55);
      litten(box(px, .53, EDGEZ - .080, .54, .20, .02, col.cream,
        { hard: true, mode: 1, glow: .22 }), .45);
      // the picture, as one block of a paler tint of the ground. At 34 cm across seen from four
      // metres that is as much of an advertisement as survives, and a drawn object at this size is
      // a smudge — the wall boxes are 1.5 m wide and can afford a phone and a bottle; these cannot.
      box(px, 1.18, EDGEZ - .097, .34, .50, .012, pic, { hard: true, mode: 1, glow: .26 });
      glyphs(px, .53, EDGEZ - .094, Math.PI, txt,
        { size: .105, gap: .034, color: col.charcoal, mode: 1 });
      glyphs(px, .80, EDGEZ - .094, Math.PI, strap,
        { size: .066, gap: .020, color: col.white, mode: 1 });
      // and what it puts back into the stone in front of it, the same way the wall boxes do
      glow(M.trs(px, .018, EDGEZ - .72, 0, .95, 1, 1.15), c, .050);
    }
    // 车门 the door numbers, one plate per doorway on the pier to its left. Five doors, numbered
    // 1 to 5 from the west end, which is the numbering a Beijing platform actually carries and the
    // whole reason it is there: "第三个门" is how anybody in this station tells anybody else where
    // to stand, and until now there was nothing on the platform edge to count.
    //
    // On the pier and not over the door. The header above the opening is where the next-train
    // boards live and a number up there competes with the one thing on this platform that has to be
    // read from thirty metres; a number at 1.75 m on the jamb beside you is read by the person
    // standing at that door and by nobody else, which is correct.
    //
    // The plate faces -z. yaw π mirrors x, so the digit is placed at the pier's own x and the plate
    // centred on it — a two-piece layout here would have come out with the number on the wrong side
    // of its own frame.
    // Twenty centimetres inboard of the pier's centre line, which is the half of it nearer the door
    // it numbers. Centred, the number for door 1 would have been at x -6.40 — the pier there is half
    // buried in the end of the room and the plate would have gone into the tunnel-mouth face with it.
    DOORX.forEach((dx, i) => {
      const px = dx - 1.08;               // the west jamb of this doorway
      box(px, 1.76, EDGEZ - .06, .17, .21, .02, col.navy, { hard: true, gloss: .26 });
      glyphs(px, 1.79, EDGEZ - .075, Math.PI, String(i + 1),
        { size: .105, gap: 0, color: col.white, mode: 1, glow: .10 });
      glyphs(px, 1.685, EDGEZ - .075, Math.PI, '号门',
        { size: .036, gap: .006, color: C('#9fc0d8'), mode: 1 });
    });
    for (const dx of DOORX) {
      // Each leaf is a frame with a big pane in it, not a slab. Solid, the run of them was a flat
      // pale field the same value as the train behind it, and the platform edge read as a wall
      // with two slots cut in it.
      // The fixed glazing either side of the opening, which the sliding leaves park in front of.
      // Without it the bay is a 1.86 m hole with two 0.56 m leaves in it: parked outward they very
      // nearly close it and the geometry looked right, but the moment the doors could shut it was
      // obvious that two leaves cannot cover three leaves' worth of bay, and the outer third of
      // every bay was open track. A metre behind the platform edge, so the leaves clear it.
      for (const s of [-1, 1]) {
        const fx = dx + s * .63;
        for (const t of [-1, 1])
          box(fx + t * .27, 1.10, EDGEZ + .01, .055, 2.20, .06, col.steel,
            { hard: true, gloss: G.metal });
        box(fx, .09, EDGEZ + .01, .60, .18, .06, col.steel, { hard: true, gloss: G.metal });
        box(fx, 2.12, EDGEZ + .01, .60, .16, .06, col.steel, { hard: true, gloss: G.metal });
        // The transom, which is the third rail every one of these fixed lights has and the reason
        // a 2.20 m panel of glass does not read as a hole. It belongs to the fixed light and only
        // to the fixed light: it was found here as one 1.90 m box laid across the whole bay at the
        // piers' own depth, which put a steel bar through the middle of the doorway people walk
        // through and ran it through the sliding leaves, their panes and the fixed frames on the
        // way — four layers this file keeps a millimetre apart everywhere else. At 60 cm on the
        // fixed panel it is the same member as the two above and below it, and the opening it used
        // to cross is clear.
        box(fx, 1.32, EDGEZ + .01, .60, .07, .06, col.steel, { hard: true, gloss: G.metal });
      }
      // Each leaf is collected rather than just its x, because the leaves slide now: they are
      // built in the open position and PSD_SLIDE is how far in they travel to meet in the middle.
      for (const s of [-1, 1]) {
        const lx = dx + s * .61;
        const leaf = { x: lx, dir: s, props: [] };
        for (const t of [-1, 1])
          leaf.props.push(box(lx + t * .25, 1.10, EDGEZ - .03, .055, 2.20, .06, col.steel,
            { hard: true, gloss: G.metal }));
        leaf.props.push(box(lx, .09, EDGEZ - .03, .56, .18, .06, col.steel,
          { hard: true, gloss: G.metal }));
        leaf.props.push(box(lx, 2.12, EDGEZ - .03, .56, .16, .06, col.steel,
          { hard: true, gloss: G.metal }));
        panes.push(leaf);
      }
      // where people queue, painted on the floor at each door
      flat(dx, .007, EDGEZ - .90, .64, .06, col.yellow, { gloss: .12 });
    }
    box(0, 2.30, EDGEZ, RX * 2, .28, .15, col.steel,
      { hard: true, gloss: G.metal, mat: 'steel', matScale: .60, matAmt: .30 });
    // 号线色 the line's own colour, run the whole length of the header above the doors. Every metro
    // in China identifies its platforms this way and it costs one box: 13 m of blue across the top
    // of the screen doors is what stops the platform edge reading as a white wall with holes in it,
    // and it is the only band in the room wide enough to be seen from the gate line.
    //
    // At y 2.26 rather than lower: the sliding leaves' top rails finish at 2.20 and a band that
    // overlapped them would travel behind a moving door. Not mode 1 — this is paint, not a
    // lightbox, and mode 1 with a glow on a painted band is how a wall stripe turns into a lamp.
    box(0, 2.26, EDGEZ - .09, RX * 2, .11, .04, col.blue, { hard: true, gloss: .34, glow: .08 });
    box(0, 2.72, EDGEZ + .06, RX * 2, .58, .10, col.wall,
      { hard: true, gloss: G.paint, mat: 'plaster', matScale: .62, matAmt: .12, nrm: null });
    // 下一车 the next-train board, on the header over the screen doors. A dark panel with a row of
    // segments across it, and the segments march. Standing still it is a painted stripe; moving,
    // it is the one thing in the room that is plugged in.
    // Two rows of it: the next train and the one after, each with the time it is due, plus a
    // countdown in minutes and a bar of segments along the bottom that marches faster the nearer the
    // train is. Every number on it comes off the same timetable the train itself runs to, so the
    // board physically cannot disagree with what turns up — which is the only reason to have one.
    // Two of them, one either side of the hanging station-name sign rather than one in the middle
    // behind it. Centred, a board is exactly where that sign hangs 1.3 m in front of it, and the
    // only part of the board you could read was the two words at the ends. Real platforms space
    // their boards along the header for the same reason.
    //
    // Everything here is in *screen* x. The board reads off the -z face at yaw π, and yaw π mirrors
    // x, so a model coordinate and a screen coordinate run opposite ways: one conversion at the
    // point of building, and then the layout below reads left to right like the text does.
    const face = EDGEZ - .045;
    const put = (sx, y, size, colour, ch) => glyphs(-sx, y, face, Math.PI, ch,
      { size, gap: 0, color: colour, mode: 1, glow: .34 })[0];
    const row = (str, sx, y, size, colour, step) =>
      [...str].map((ch, i) => put(sx + i * step, y, size, colour, ch));
    // Narrow, and inboard of the columns. A wide board reaches into the shadow the columns at
    // x ±1.40 throw across the header from anywhere near the back of the platform, and what got
    // hidden was the middle of it, which is the part with the time on. From the painted mark where
    // you actually stand to wait, the header is a metre in front of your face and clear of both.
    for (const bs of [-2.35, 2.35]) {
      box(-bs, 2.76, EDGEZ - .01, 2.40, .52, .03, col.black, { hard: true, gloss: .30 });
      row('下一班', bs - 1.10, 2.89, .098, C('#8fa7bd'), .128);
      row('之后', bs - 1.10, 2.65, .082, C('#6f8598'), .112);
      // 开往 and where to, which the board managed to leave out for as long as it has existed: it
      // said when a train was coming and never once where it was going, and "when" without "where"
      // is the half of a departure board nobody needs. The roadmap asked for 本次终点站; the board is
      // 2.4 m wide with two rows of times already on it, and 开往 is what these boards actually say.
      //
      // On the second row and not the first, because the terminus is not a fact about the next train
      // — it is a fact about the platform. Both trains on this board go to the same place, so saying
      // it once, low and dim, is right; saying it twice would imply a choice that does not exist.
      row('开往', bs + .16, 2.65, .078, C('#6f8598'), .102);
      boards.push({
        now:  row('00:00', bs - .58, 2.89, .132, C('#ffc24a'), .152),
        mins: row('00分',  bs + .48, 2.89, .132, C('#ffc24a'), .168),
        next: row('00:00', bs - .60, 2.65, .100, C('#c9922e'), .118),
        // Four slots, because the longest terminus on this line is 杨柳胡同. Left-aligned rather
        // than centred — a dot-matrix board pads to the right, and re-centring is only worth the
        // arithmetic on the hanging name signs, which are read as a name and not as a field.
        // '站' four times is a placeholder and never shows: `setStation` runs at the bottom of the
        // module and overwrites all four. A space would not do — `glyphs` skips spaces and returns
        // fewer props than characters, so a blank row hands back a row of undefined.
        dest: row('站站站站', bs + .45, 2.65, .096, C('#e8dcc0'), .118),
      });
      // The bar of segments along the bottom, which marches faster the nearer the train is.
      for (let i = 0; i < 12; i++)
        leds.push({ p: box(-(bs - 1.05 + i * .19), 2.53, EDGEZ - .028, .13, .05, .012,
          C('#f0a83c'), { hard: true, mode: 1, glow: .10 }), i });
    }
    solid(-RX, RX, EDGEZ - .18, RZ);
    // the gap between platform and train, and a rail catching the light down in it
    flat(0, .004, EDGEZ + .06, RX * 2, .10, col.black, { gloss: .10 });
    box(0, .012, EDGEZ + .08, RX * 2, .02, .03, col.rail, { hard: true, gloss: .62 });

    // ---- the hanging station-name signs, which are the one thing in here that changes.
    //
    // Four character slots per face and both faces lettered, because a platform sign printed on
    // one side only is a blank board to half the platform — and the half that got the blank side
    // was everyone who had just walked in through the gates.
    //
    // A shorter name blanks its slots from the right and shifts what is left back to the middle:
    // the character a prop draws is a field on the prop, but the layout is not.
    //
    // The π faces are laid out in reverse. yaw π mirrors x on screen, so slots running left to
    // right in the model read right to left on the board, and 杨柳胡同 came out 同胡柳杨.
    for (const zz of [GATEZ + 1.30, EDGEZ - 1.30]) {
      box(0, 2.60, zz, 2.10, .44, .06, col.white, { hard: true, gloss: .24 });
      for (const yaw of [0, Math.PI]) {
        const f = yaw ? -1 : 1;
        box(0, 2.60, zz + f * .035, 2.00, .36, .01, col.blue, { hard: true, mode: 1 });
        const into = yaw ? nameSlots : nameSlots2;
        for (let i = 0; i < 4; i++)
          into.push(glyphs(f * (-.72 + i * .48), 2.60, zz + f * .045, yaw, '站',
            { size: .21, gap: 0, color: col.white, mode: 1 })[0]);
      }
      for (const s of [-1, 1])
        capsule(s * .86, 2.92, zz, .012, .40, .012, col.steelD, { gloss: G.metal });
    }
    // ---- and the same name set into the floor, which every Beijing platform of this vintage has:
    // a band of darker granite across the concourse side of the platform with the station's name
    // laid into it. It is the one piece of signage you read without looking up, and the reason it is
    // worth the trouble is that it is the only writing in the room a body walks over.
    //
    // Laying characters flat is not something `glyphs` does. It always stands its quads up with a
    // rotX(π/2), because everything else in this game that is written is written on a wall. The base
    // quad is horizontal with u along +x and v along +z, and v = 0 is the top of the glyph cell — so
    // on the floor, untouched, a character's head points at -z and it reads upside down to anybody
    // walking off the concourse. rotY(π) turns both axes at once and fixes it, which is why the
    // matrix below is built here rather than asked for: it is the one rotation `glyphs` cannot do.
    // Two of them, in the bays between the columns either side of the middle, because the roadmap is
    // right that a real platform repeats the name along its length — and because the one place it
    // cannot go is the middle. The 盲道 runs up the platform at x -0.75 and its ribs stand 6 mm
    // higher than any floor inlay can, so a band centred on the room has a yellow tactile strip
    // crossing it and one character with a corduroy stripe over half of it.
    const inlayZ = EDGEZ - 1.95;
    for (const ix of [-2.80, 2.80]) {
      flat(ix, .0045, inlayZ, 1.94, .46, col.granite, { gloss: .30 });
      flat(ix, .0050, inlayZ, 1.78, .34, C('#565a60'), { gloss: .34 });
      for (let i = 0; i < 4; i++) {
        // Registered with the atlas the way `glyphs` does it, then given a matrix of its own.
        // Descending x, not ascending: for a reader walking off the concourse the viewer's left is
        // world +x, so the first character of the name has to sit at the *largest* x or the whole
        // name reads backwards — the same trap as the yaw π faces on the hanging signs, one axis over.
        Glyphs.need('站');
        const p = { mesh: 'quad', ch: '站', color: col.floorL, mode: 0, gloss: .28, alpha: 1,
          m: M.mul(M.trans(ix + .615 - i * .41, .0058, inlayZ), M.mul(M.rotY(Math.PI),
               M.scale(.29, 1, .29))) };
        B.props.push(p);
        floorSlots.push(p);
      }
    }

    // ================================================================ 轨道 the trackside
    // What is behind the train. Until the train started coming and going nobody had ever needed it,
    // because a berthed car fills this from one end wall to the other — and that is exactly why it
    // has to exist now: the moment a train pulls out, an empty platform backed by glazed tile is a
    // room with a hole in it rather than a station.
    //
    // Everything on the bed has to sit under y 0.10, because the car's own floor slab runs from
    // z 3.38 to 5.12 at y -0.02 to 0.10 and is what hides all of this while a train is in. Anything
    // taller pokes up through the floor and is seen from inside the carriage.
    trackside();
    // 信号 the word, on the lamp at the east mouth. It has been changing colour off the timetable
    // since the timetable existed — red while the road is occupied, green once the train has gone —
    // and it was the only thing in the room doing something that meaningful with nothing to call it.
    //
    // The focus is on the platform, not at the signal: the signal is 30 cm past the platform edge and
    // the collider stops you 3.12, so a focus point on the lamp itself can never be reached and the
    // label would never light. Standing at the east end and looking down the track is close enough.
    thing('信号', RX - .30, 1.78, TRACKZ + .30, '信号是绿的，车走了。',
      'The signal is green — the train has gone.',
      '信号 signal, also a phone signal: 没信号 is no reception. 绿 green, 红 red.',
      { focus: [RX - .95, EDGEZ - .85], reach: 1.7 });

    // ================================================================ 地铁 the train
    // Standing at the platform with its doors open, and built as a shell rather than a block: a
    // floor, a roof, a back wall and the panels between the doors, so that through an open door
    // you see a lit interior with a seat run along it. As one solid box — which is how it started
    // — every window, seat and grab pole was inside the volume and the train was a white slab.
    //
    // Its floor is level with the platform, 6 cm up, and the bogies and track are under the floor
    // plane where they belong: hung below at rail height they showed through the door openings as
    // three brown stripes, and a passenger would have had an 80 cm climb.
    const T = { tag: '地铁' };
    const half = 6.30, back = CARZ + .82, front = CARZ - .85;
    box(0, .04, CARZ, half * 2, .12, 1.74, col.carD, { ...T, hard: true, gloss: .28 });
    // Warm, and carrying a little light of its own. Painted the same cool pale as the platform, the
    // inside of the car was the one thing an open door could not show you: you looked through a
    // 1.2 m opening in a white wall at another white wall. What a lit train looks like from a
    // platform is a warm box, and the whole reason the doorway is worth looking at is the contrast.
    box(0, 1.36, back, half * 2, 2.52, .07, C('#eadfc9'),
      { ...T, hard: true, gloss: .26, glow: .10 });
    box(0, 2.66, CARZ, half * 2, .18, 1.78, col.carD, { ...T, hard: true, gloss: .30 });
    carLights.push(litten(box(0, 2.52, CARZ + .10, half * 2 - .3, .04, 1.10, C('#fff3da'),
      { ...T, hard: true, mode: 1, glow: .55 }), .3));
    // the seat run along the far side, and the poles you hold on to
    box(0, .48, back - .30, half * 2 - .4, .12, .48, col.seatB,
      { ...T, hard: true, mode: 7, gloss: G.fabric });
    box(0, .82, back - .09, half * 2 - .4, .58, .07, col.seatB,
      { ...T, hard: true, mode: 7, gloss: G.fabric });
    for (let i = 0; i < 11; i++)
      capsule(-5.60 + i * 1.12, 1.30, CARZ - .18, .022, 2.42, .022, col.chrome,
        { ...T, gloss: G.metal });
    // ---- what is on the far wall of the car, above the seat backs. Everything here is placed at a
    // door opening rather than spread evenly along the wall, because the flank is opaque between the
    // doors and anything behind a panel is a prop nobody will ever see: the car is only ever looked
    // into through a 1.22 m gap. Three openings are wide enough to be worth dressing from the
    // platform — the centre one and the two either side of it.
    //
    // The wall's inner face is at `back - .035`, so these build outward in -z and read at yaw π.
    const IW = back - .045;
    // 线路图 the strip map over the centre door, which is where every Chinese car puts it: a bar
    // with a dot per stop and no names at this size, and the stop you are at picked out in red.
    box(0, 1.56, IW, 1.10, .22, .02, col.white, { ...T, hard: true, gloss: .22 });
    box(0, 1.54, IW - .012, .96, .030, .01, col.blue, { ...T, hard: true, mode: 1 });
    for (let k = 0; k < 6; k++)
      cyl(-.40 + k * .16, 1.54, IW - .022, .026, .008, k ? col.blue : col.red,
        { ...T, rx: Math.PI / 2, mode: 1 });
    glyphs(0, 1.645, IW - .012, Math.PI, '二号线',
      { size: .048, gap: .010, color: col.blue, mode: 1, tag: '地铁' });
    // and two of the small ads that live above the windows of every carriage. Two characters each,
    // because at 55 cm across and seen through a doorway from four metres away that is all that
    // survives — a paragraph of body copy here is a grey smear.
    for (const [ax, c, txt] of [[-2.56, col.jade, '好茶'], [2.56, col.redD, '手机']]) {
      box(ax, 1.56, IW, .58, .40, .02, c, { ...T, hard: true, gloss: .24 });
      box(ax, 1.44, IW - .012, .50, .11, .01, col.cream, { ...T, hard: true, mode: 1 });
      glyphs(ax, 1.66, IW - .014, Math.PI, txt,
        { size: .13, gap: .04, color: col.white, mode: 1, tag: '地铁' });
      glyphs(ax, 1.44, IW - .020, Math.PI, txt === '手机' ? '新款' : '清香',
        { size: .062, gap: .018, color: col.charcoal, mode: 1, tag: '地铁' });
    }
    // the panels between the doors, the windows in them and the livery band across the lot
    for (const [x0, x1] of PANELX) {
      const w = x1 - x0, cx = (x0 + x1) / 2;
      box(cx, 1.36, front, w, 2.52, .06, col.car, { ...T, gloss: .34 });
      // Kept, because a train going past on the far side lights these from behind one at a time,
      // and that travelling brightness is the only way to see an unseen train.
      carWindows.push({ p: box(cx, 2.20, front - .035, w - .26, .84, .02, C('#39434b'),
        { ...T, hard: true, mode: 1, alpha: .92, gloss: .5 }), x: cx });
      // The frame round the glass, and a mullion down the middle of the wide panels. Without it the
      // flank of the car was one dark stripe 12 m long: six windows of three different widths, all
      // the same colour and all the same height, read as a single painted band rather than as
      // glazing, and the thing that gives a carriage its rhythm is the bay between one window and
      // the next. Rubber-black, not body colour — a pale frame at this thickness turns into a grid.
      const fr = C('#5b6167');
      for (const t of [-1, 1]) {
        box(cx, 2.20 + t * .445, front - .045, w - .22, .05, .015, fr,
          { ...T, hard: true, gloss: .30 });
        box(cx + t * (w - .245) / 2, 2.20, front - .045, .05, .94, .015, fr,
          { ...T, hard: true, gloss: .30 });
      }
      // Panels over 90 cm get a centre post. The two 51 cm end panels do not: a mullion down a
      // window that narrow leaves two 20 cm lights and reads as a louvre.
      if (w > .90)
        box(cx, 2.20, front - .045, .042, .90, .015, fr, { ...T, hard: true, gloss: .30 });
      box(cx, 1.30, front - .035, w, .16, .02, col.blue, { ...T, hard: true, mode: 1 });
      box(cx, 1.12, front - .035, w, .12, .02, col.carD, { ...T, hard: true, gloss: .28 });
    }
    // the door leaves, slid into the panels, and the frame round each opening. The leaves are
    // collected too: they move with the car like everything else tagged 地铁, and then again on top
    // of that when the doors work, so they are the one thing in here with two transforms on it.
    for (const dx of DOORX) {
      for (const s of [-1, 1])
        carLeaves.push({ dir: s, p: box(dx + s * .78, 1.36, front - .05, .34, 2.44, .04, col.carD,
          { ...T, hard: true, gloss: .32 }) });
      box(dx, 2.60, front - .02, 1.40, .06, .05, col.carD, { ...T, hard: true, gloss: .30 });
      box(dx, .14, front - .02, 1.40, .06, .05, col.carD, { ...T, hard: true, gloss: .30 });
    }
    // the destination blind over the middle of the car
    box(0, 2.44, front - .05, 1.30, .24, .03, col.black, { ...T, hard: true, gloss: .30 });
    litten(box(0, 2.44, front - .07, 1.20, .16, .02, C('#e6a63a'),
      { ...T, hard: true, mode: 1, glow: .34 }), .6);
    // and what it says, which until now was nothing: a blank amber strip on the front of a train,
    // in a station whose entire business is which train goes where. Four slots and the same terminus
    // the platform board is showing, so a passenger reading the board and then the train cannot be
    // told two different things.
    //
    // These are written by `setStation` into `m0`, not `m`. Every prop tagged 地铁 is re-placed from
    // its own `m0` by `placeTrain` on every single frame, so a slot parked by writing `m` would be
    // back on the blind a sixtieth of a second later — which is exactly the bug that would have
    // shown up as 机场 with a ghost 同 behind it.
    for (let i = 0; i < 4; i++)
      blindSlots.push(glyphs(-(-.27 + i * .18), 2.44, front - .085, Math.PI, '站',
        { size: .135, gap: 0, color: col.black, mode: 1, tag: '地铁' })[0]);

    // Now the glass in the screen doors, after the train and not before it. The fixed lights first,
    // then the sliding ones, so a leaf parked over a fixed panel is the nearer of the two.
    // Two lights per fixed panel now, not one, because the transom added above runs between them
    // at y 1.285 to 1.355. One 1.86 m pane with a bar laid over the middle of it shares a plane
    // with the bar's own front face for 60 cm of its width, and the pair of them fight for those
    // pixels the whole length of the platform. Glazing stops where the member starts, which is
    // how every other join in this file is built.
    for (const dx of DOORX) for (const s of [-1, 1]) {
      box(dx + s * .63, .7475, EDGEZ + .03, .50, 1.075, .02, col.glass,
        { hard: true, mode: 1, alpha: .30, gloss: G.glass });
      box(dx + s * .63, 1.7125, EDGEZ + .03, .50, .715, .02, col.glass,
        { hard: true, mode: 1, alpha: .30, gloss: G.glass });
    }
    // Each sliding pane joins its own leaf, so it travels with the frame it is set into rather than
    // staying put while the frame goes.
    for (const leaf of panes)
      leaf.props.push(box(leaf.x, 1.14, EDGEZ - .05, .46, 1.86, .02, col.glass,
        { hard: true, mode: 1, alpha: .30, gloss: G.glass }));
    thing('地铁', 0, 1.40, EDGEZ + .20, '坐地铁去哪儿？', 'Where are you taking the subway to?',
      '地 ground + 铁 iron. 坐地铁 is to take the subway; 换乘 is to change lines.',
      { focus: [0, EDGEZ - 1.40], reach: 2.4 });

    // ================================================================ signage and lighting
    // The things that make a station a station: an exit arrow at the far end, a no-smoking sign,
    // a bin, a clock, and a wall of adverts nobody looks at.
    // ---- 灯箱 the backlit poster boxes. Four of them, two a side, on the bare stretches of tile:
    // a dark frame, a lit ground, a white band across the bottom and two characters on it. Six
    // metres of blank tile with a line of tiny red text in the middle of it is not a wall.
    //
    // Two of the four are products now. All four used to be civic copy — 二号线, 欢迎乘车, 文明出行,
    // 一路平安 — which is four notices from the same office in four colours, and a station where
    // nobody has bought the advertising is a station nobody uses. A phone and a bottle of tea are
    // what is actually in those frames, and each of them gets a crude picture of the thing on sale
    // above its slogan, because an advert with no product in it is a notice with a price on it.
    //
    // `kind` is which of the two it is; the civic pair have none and are left exactly as they were.
    const ADS = [[-1, -2.20, col.blue, '地铁', '二号线', null],
                 [-1, 2.60, C('#1d5f6b'), '手机', '看得更清楚', 'phone'],
                 [1, .00, col.red, '出行', '文明出行', null],
                 [1, 3.60, C('#2f6b3d'), '饮料', '冰红茶三元', 'drink']];
    for (const [s, az, c, txt, strap, kind] of ADS) {
      const wx = s * (RX - .10);
      box(wx, 1.72, az, .12, 1.44, 1.72, col.charcoal, { hard: true, gloss: .28 });
      adPanels.push(litten(box(wx - s * .05, 1.78, az, .03, 1.22, 1.50, c,
        { hard: true, mode: 1, glow: .20 }), .6));
      litten(box(wx - s * .058, 1.22, az, .03, .26, 1.50, col.cream,
        { hard: true, mode: 1, glow: .22 }), .5);
      for (const g of glyphs(wx - s * .075, 1.22, az, -s * Math.PI / 2, txt,
          { size: .17, gap: .06, color: col.charcoal, mode: 1 })) litten(g, .3);
      // The strapline sits high on the civic panels, where it always did, and low on the product
      // ones so the picture has the top two thirds of the frame. A slogan across the middle of a
      // photograph is what a badly made advert looks like, and this is a well made one.
      for (const g of glyphs(wx - s * .075, kind ? 1.62 : 2.16, az, -s * Math.PI / 2, strap,
          { size: kind ? .135 : .19, gap: kind ? .05 : .07, color: col.white, mode: 1 }))
        litten(g, .5);
      // 手机 a phone, held up on the poster the way every phone is on every phone poster: the body,
      // the screen inside it, and the pale band of a picture on the screen. Flat to the panel, so
      // it is a printed phone and not a phone screwed to the wall.
      // Everything in a frame has to live between y 1.35 and 2.39. The lit ground is 1.22 tall
      // centred on 1.78 and the cream band across the bottom takes the rest; a picture sized by eye
      // rather than off those two numbers pokes out of the top of the lightbox, which is a poster
      // taller than the frame it is in.
      if (kind === 'phone') {
        box(wx - s * .066, 2.02, az - s * .06, .012, .60, .32, col.charcoal,
          { hard: true, mode: 1, glow: .06 });
        litten(box(wx - s * .074, 2.02, az - s * .06, .012, .54, .27, C('#8fd8e6'),
          { hard: true, mode: 1, glow: .30 }), .4);
        box(wx - s * .080, 2.16, az - s * .06, .010, .18, .21, C('#f2f7d8'),
          { hard: true, mode: 1, glow: .22 });
        // and the copy, up in the corner where a price goes
        glyphs(wx - s * .078, 2.10, az + s * .44, -s * Math.PI / 2, '新款',
          { size: .105, gap: .03, color: C('#ffe08a'), mode: 1 });
      }
      // 饮料 a bottle of iced tea. A cylinder cannot lie flat against a poster without reading as a
      // pipe on the wall, so it is boxes: body, neck, cap, label. At this size the silhouette is the
      // whole of it and the silhouette of a bottle is four rectangles.
      if (kind === 'drink') {
        box(wx - s * .066, 1.94, az - s * .30, .012, .48, .26, C('#9b6a2c'),
          { hard: true, mode: 1, glow: .10 });
        box(wx - s * .066, 2.25, az - s * .30, .012, .13, .12, C('#9b6a2c'),
          { hard: true, mode: 1, glow: .10 });
        box(wx - s * .068, 2.35, az - s * .30, .012, .07, .15, col.gold,
          { hard: true, mode: 1, glow: .16 });
        litten(box(wx - s * .074, 1.94, az - s * .30, .012, .28, .27, col.cream,
          { hard: true, mode: 1, glow: .24 }), .4);
        glyphs(wx - s * .080, 1.94, az - s * .30, -s * Math.PI / 2, '红茶',
          { size: .105, gap: .03, color: C('#8c3a24'), mode: 1 });
        // the cold, as three short strokes leaning off the shoulder of the bottle
        for (let k = 0; k < 3; k++)
          box(wx - s * .070, 1.80 + k * .17, az + s * .22, .010, .13, .022, C('#bfe6ec'),
            { hard: true, mode: 1, glow: .26, rx: s * .5 });
      }
    }
    // ---- 禁止吸烟 as a plate rather than four red characters floating on the tile
    for (const [s, az] of [[-1, -3.70], [1, -1.70]]) {
      const wx = s * (RX - .10);
      box(wx, 1.70, az, .10, .52, .80, col.white, { hard: true, gloss: .24 });
      box(wx - s * .045, 1.70, az, .02, .44, .72, col.cream, { hard: true, mode: 1 });
      // a red ring, a cigarette across the middle of it and the bar through the lot, because a
      // ring on its own is a smudge and the sign is the one thing on this wall you must read
      cyl(wx - s * .06, 1.82, az, .105, .02, col.red,
        { rz: s * Math.PI / 2, mode: 1, gloss: .20 });
      cyl(wx - s * .07, 1.82, az, .072, .02, col.white,
        { rz: s * Math.PI / 2, mode: 1, gloss: .20 });
      box(wx - s * .078, 1.82, az, .01, .022, .10, col.charcoal, { hard: true, mode: 1 });
      box(wx - s * .078, 1.845, az - .055, .01, .016, .022, C('#e8965a'),
        { hard: true, mode: 1 });
      box(wx - s * .086, 1.82, az, .01, .026, .20, col.red,
        { hard: true, mode: 1, rx: s * .78 });
      glyphs(wx - s * .065, 1.56, az, -s * Math.PI / 2, '禁止吸烟',
        { size: .075, gap: .02, color: col.redD, mode: 1 });
    }
    // A third one, low, on the end of the bench run — the one place in this room where somebody
    // sits down and gets their cigarettes out, and the only sign they can see from there was 1.70 m
    // up a wall six metres behind them. Small, and a decal rather than a plate: 1.02 m up a column
    // is where a sticker goes, and a framed sign at that height is something you walk into.
    // On the column at the east end of the bench run, on its concourse face — the column at x 1.40
    // carries the extinguisher on that face and a decal at this height lands inside the bracket. The
    // ring goes to the reader's left and the characters to their right, which under yaw π means the
    // ring is at +x and the text at -x: the mirroring catches every two-piece layout in this file.
    {
      const cx = 4.20, cz = .95 - .25;
      box(cx, 1.02, cz - .022, .30, .17, .01, col.white, { hard: true, gloss: .22 });
      cyl(cx + .095, 1.02, cz - .030, .058, .012, col.red, { rx: Math.PI / 2, mode: 1 });
      cyl(cx + .095, 1.02, cz - .036, .040, .012, col.white, { rx: Math.PI / 2, mode: 1 });
      box(cx + .095, 1.02, cz - .040, .056, .012, .01, col.charcoal, { hard: true, mode: 1 });
      box(cx + .095, 1.02, cz - .044, .014, .100, .01, col.red,
        { hard: true, mode: 1, rz: .78 });
      glyphs(cx - .055, 1.02, cz - .036, Math.PI, '禁烟',
        { size: .062, gap: .014, color: col.redD, mode: 1 });
    }
    // ---- 消防栓 the fire cabinet, which every one of these rooms has one of
    //
    // Its glass had nothing behind it, and the one thing that makes a hose cabinet read as one is
    // that you can see the coil through the door. It could not simply be added, either: the cabinet
    // was a solid red slab with a dark plate and a pane layered onto its face — which is how most of
    // the flat things in this file are built, and is the one shape that cannot have an inside.
    //
    // So it is a frame with a hole in it now, two piers and a header and a sill and a back, exactly
    // like the service window twenty metres away and for exactly the same reason. Contents first,
    // glazing last, so the light reads through the pane instead of over it.
    //
    // The depth stack runs on a 2 cm grid outward from the tile, because a recess is the one place in
    // this file where a millimetre of arithmetic shows: a coil starting 5 mm behind the plate it is
    // supposed to be lying on renders as a ring with a bite out of it. Tile face -6.30, back plate
    // -6.28, the three rings at -6.25, -6.23 and -6.21, the hub at -6.195, the glass at -6.155.
    {
      const wx = -RX + .10, fz = -4.80;
      box(wx + .02, .90, fz, .02, 1.10, .70, col.charcoal, { hard: true, gloss: .22 });
      for (const s of [-1, 1])
        box(wx + .06, .90, fz + s * .31, .22, 1.10, .08, col.red, { hard: true, gloss: .30 });
      box(wx + .06, 1.35, fz, .22, .20, .70, col.red, { hard: true, gloss: .30 });
      box(wx + .06, .45, fz, .22, .20, .70, col.red, { hard: true, gloss: .30 });
      // the hose, wound on its drum and seen end-on through the glass. Three rings and a hub rather
      // than a spiral: at 19 cm across a spiral is four pixels of difference and twenty times the props.
      [[.188, .05], [.152, .07], [.115, .09]].forEach(([r, d], k) =>
        cyl(wx + d, 1.02, fz - .06, r, .02, k === 1 ? C('#8d2f1e') : C('#a03824'),
          { rz: Math.PI / 2, gloss: .22 }));
      cyl(wx + .105, 1.02, fz - .06, .055, .02, col.steelD,
        { rz: Math.PI / 2, gloss: G.metal });
      // the branch pipe on its clip below the drum, and the landing valve beside it
      capsule(wx + .07, .68, fz - .10, .020, .16, .020, col.chrome, { rz: .20, gloss: G.metal });
      cyl(wx + .06, .70, fz + .20, .044, .022, col.red, { rz: Math.PI / 2, gloss: .30 });
      cyl(wx + .085, .70, fz + .20, .011, .05, col.charcoal, { rz: Math.PI / 2, gloss: .30 });
      // then the pane, after everything it is there to show
      box(wx + .145, .90, fz, .02, .70, .54, col.glass,
        { hard: true, mode: 1, alpha: .34, gloss: G.glass });
      cyl(wx + .155, .90, fz + .22, .016, .11, col.chrome, { rz: Math.PI / 2, gloss: G.metal });
      glyphs(wx + .165, 1.36, fz, Math.PI / 2, '消防',
        { size: .11, gap: .04, color: col.white, mode: 1 });
    }
    // On the platform, not the concourse: it is a warning about the gap at the train, and the
    // concourse wall it used to be on is where the service window went.
    glyphs(RX - .14, 1.98, 2.30, -Math.PI / 2, '当心站台间隙',
      { size: .10, gap: .03, color: col.redD, mode: 1 });
    // ---- 钟 the station clock, on the -x wall at the concourse end of the platform.
    //
    // Which wall it is on decides which way its hands go, and this one is right — worth saying,
    // because rail.js's was not and the fix there found the rule. A face is read from the room, so on
    // the -x wall the viewer looks in -x, their up is +y and their right works out as -z; three
    // o'clock is therefore at -z, and `setClockHands` swings the hands about x with a *negative*
    // angle, which is exactly what sends a hand from +y toward -z. On a +z wall the same code reads
    // mirrored and nine o'clock points at the three.
    cyl(-RX + .16, CLY, CLZ, .22, .07, col.white, { rz: Math.PI / 2, gloss: .28 });
    cyl(-RX + .21, CLY, CLZ, .19, .02, col.cream, { rz: Math.PI / 2, mode: 1 });
    // The marks. Twelve of them, long at the quarters, laid out in the same y/z plane the hands
    // sweep in: y = cos and z = -sin of the hour angle, and each mark turned about x by -a so it
    // stands radial. Placed with sin on z and no minus, they came out anticlockwise — the same
    // mirroring the hands have to answer, one prop at a time.
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, r = .168, long = i % 3 === 0;
      box(-RX + .222, CLY + Math.cos(a) * r, CLZ - Math.sin(a) * r,
        .008, long ? .034 : .020, long ? .014 : .009, col.charcoal,
        { hard: true, mode: 1, rx: -a });
    }
    // and 12 / 3 / 6 / 9 in the four corners of the dial, inboard of the marks. Digits, not 十二 —
    // a Beijing platform clock has Arabic numerals on it, and a two-character 汉字 numeral at this
    // size on a 38 cm dial is a smudge.
    for (const [n, dy, dz] of [['12', .112, 0], ['3', 0, -.112],
                               ['6', -.112, 0], ['9', 0, .112]])
      glyphs(-RX + .222, CLY + dy, CLZ + dz, Math.PI / 2, n,
        { size: .052, gap: .004, color: col.charcoal, mode: 1 });
    // The hands. They used to be two boxes at a hardcoded angle apiece — half past ten, for
    // ever, on a wall directly above a departure board counting the minutes down. Kept as their
    // rest pose here and turned every frame by `setClockHands` below, off the same clock the board
    // and the timetable read.
    clockHands.hour = box(-RX + .23, CLY, CLZ, .012, .12, .016, col.charcoal,
      { hard: true, gloss: .30 });
    clockHands.min = box(-RX + .235, CLY, CLZ, .010, .17, .012, col.charcoal,
      { hard: true, gloss: .30 });
    // 秒针 the second hand, thin and red and longer than the other two, with a stub of counterweight
    // behind the centre — which is the detail that makes a sweep hand read as one rather than as a
    // scratch on the dial.
    //
    // It runs on the game's clock like everything else in this room, and the game's clock is
    // compressed sixty to one: a minute of it is a second of yours. So this hand goes round once a
    // real second. That is fast, and it is the honest answer — the minute hand beside it already
    // completes a revolution every real minute, and a second hand driven off real time instead would
    // be the only clock in the station that disagreed with the timetable, the board, the announcer
    // and the clock in the corner of the screen. A station where the trains keep compressed time and
    // the clock on the wall does not is a station with a broken clock in it.
    clockHands.sec = box(-RX + .242, CLY, CLZ, .006, .19, .006, C('#b8402c'),
      { hard: true, mode: 1, gloss: .30 });
    clockHands.tail = box(-RX + .242, CLY, CLZ, .009, .05, .009, C('#b8402c'),
      { hard: true, mode: 1, gloss: .30 });
    // the boss over the middle, last and furthest out, so it covers all four spindles
    cyl(-RX + .250, CLY, CLZ, .017, .012, col.charcoal, { rz: Math.PI / 2, gloss: .30 });
    // ---- 垃圾桶 a bin by each bench. Two bodies, not one: Beijing sorts its rubbish and every bin
    // in a public building is a pair, blue for 可回收 and grey for 其他垃圾, with the two words on the
    // lids. A single drum is the one thing a station bin never is, and the pair reads at a distance
    // because of the colour difference rather than because of the labels.
    //
    // Narrower than the single one was, so the pair occupies the same footprint and the collider it
    // hands the walk router is unchanged — the two commuter routes across the platform are worked out
    // from bins at x ±2.30 with a 40 cm span, and widening that puts NPCs through a bin.
    for (const bx of [-2.30, 2.30]) {
      for (const [s, c, txt] of [[-1, col.blue, '回收'], [1, col.steelD, '其他']]) {
        cyl(bx + s * .095, .33, .30, .092, .66, c, { gloss: .32 });
        cyl(bx + s * .095, .675, .30, .100, .05, col.charcoal, { gloss: .28 });
        // the flap in the lid, which is the only part of a bin anybody looks at
        box(bx + s * .095, .703, .30, .105, .012, .105, c, { hard: true, gloss: .30 });
        // The word goes on a flat label plate rather than straight onto the drum. Written on the
        // cylinder it floated: at 5 cm either side of the axis of a 9 cm drum the surface has already
        // fallen 4 cm away, so the outer characters hang in mid-air off the curve. Two characters,
        // not three — 可回收 at a size that fits an 11 cm plate is a grey blur.
        box(bx + s * .095, .50, .212, .11, .09, .008, col.cream, { hard: true, gloss: .20 });
        glyphs(bx + s * .095, .50, .212, Math.PI, txt,
          { size: .042, gap: .008, color: c, mode: 1 });
      }
      // One shared plinth under the pair, which is how they are actually mounted, and it hides the
      // gap between the two drums that would otherwise show the floor through the middle of the bin.
      box(bx, .025, .30, .40, .05, .22, col.charcoal, { hard: true, gloss: .26 });
      solid(bx - .20, bx + .20, .10, .50);
    }
    batten(-3.60, -3.40, 4.40); batten(2.40, -3.40, 5.60, 1);
    batten(-3.30, .30, 5.20); batten(3.30, .30, 5.20, 2);
    batten(0, 2.60, 9.20);
    // ---- 灯槽 a lit cove down the top of both long walls. One bulb over the middle of the floor
    // leaves ten metres of tile falling away into grey at both ends; a cove washes the tile from
    // above, which is what makes a room this shape look like anything.
    for (const s of [-1, 1]) {
      box(s * (RX - .26), H - .16, 0, .22, .12, RZ * 2 - .5, col.slab,
        { hard: true, gloss: .24, mat: 'steel', matScale: .45, matAmt: .28 });
      // The light itself, in lengths rather than as one line. A ten-metre unbroken glow is a strip of
      // neon, and this is a cove full of fluorescent tubes: 1.2 m of tube, a 6 cm gap, a lamp holder
      // at each joint. The gaps are what make it read as a run of fittings, and the holders are what
      // make it read as a fitting at all — that is the whole of this change, and it is why the pieces
      // are built from a tube count and a pitch instead of one long box.
      const runZ = RZ * 2 - .6, tubes = 8, pitch = runZ / tubes;
      for (let i = 0; i < tubes; i++) {
        const tz = -runZ / 2 + pitch * (i + .5);
        litten(box(s * (RX - .17), H - .21, tz, .05, .04, pitch - .06, C('#fff2d8'),
          { hard: true, mode: 1, glow: .30 }), .7);
        // the holder at the near end of each tube, and a bracket up into the cove behind it
        box(s * (RX - .17), H - .21, tz - pitch / 2 + .022, .058, .052, .034, col.steelP,
          { hard: true, gloss: G.metal });
        box(s * (RX - .215), H - .175, tz - pitch / 2 + .022, .05, .05, .022, col.steelD,
          { hard: true, gloss: G.metal });
      }
      // and a cap on the far end of the last one, so the run finishes instead of stopping
      box(s * (RX - .17), H - .21, runZ / 2 - .022, .058, .052, .034, col.steelP,
        { hard: true, gloss: G.metal });
      glow(M.trs(s * (RX - 1.1), .02, 0, 0, 2.6, 1, RZ * 2 - 1.0), C('#f6efe2'), .06);
    }

    // ---- 盲道 the tactile guidance path. It comes down the stairs, crosses the concourse, goes
    // through the middle of the gate line and out to the platform edge, because that is the one
    // route through a station that has to be walkable without looking at it.
    // Ribs across the strip, not a pair of studs every 30 cm — tactile paving is corduroy, and
    // grey squares on yellow at that spacing read as a ladder painted on the floor.
    const TAC = C('#d8b62e'), TACD = C('#a4861d');
    // `tag` is set on one leg only. Every rib carries an `ob` and therefore a cursor target, so
    // tagging all four runs would put a 盲道 hit box under most of the floor of the station; the leg
    // the word's own label stands on is enough to click, and it keeps the cutaway group small.
    function tacRun(x0, z0, x1, z1, tag) {
      const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
      const alongX = Math.abs(dx) > Math.abs(dz);
      flat((x0 + x1) / 2, .005, (z0 + z1) / 2,
        alongX ? len + .30 : .30, alongX ? .30 : len + .30, TAC, { gloss: .14 });
      const n = Math.max(1, Math.round(len / .15));
      for (let i = 0; i <= n; i++) {
        const t = i / n, cx = x0 + dx * t, cz = z0 + dz * t;
        box(cx, .011, cz, alongX ? .055 : .24, .010, alongX ? .24 : .055, TACD,
          { hard: true, gloss: .16, tag });
      }
    }
    tacRun(SX, -RZ + .30, SX, -3.10);
    tacRun(SX, -3.10, LANEX[1], -3.10);
    tacRun(LANEX[1], -3.10, LANEX[1], EDGEZ - 1.00, '盲道');
    // and a run along the platform behind the yellow line, so the path arrives somewhere instead
    // of stopping dead in the middle of the floor
    tacRun(DOORX[1], EDGEZ - 1.00, DOORX[3], EDGEZ - 1.00);
    // 盲道 the word for it. Sixty metres of tactile paving has run through this room since it was
    // built and none of it was teachable, which is the one thing in a station that is worth teaching
    // for reasons other than transport: 无障碍 access is signed everywhere in China and this is the
    // most visible piece of it. On the concourse leg where the two runs meet, which is a corner
    // somebody walks past on the way to the gates rather than a spot they have to go looking for.
    //
    // Its pos is 12 cm up. A label anchored on the floor projects to the player's feet and the
    // discovery test then finds it behind their own body; a hand's width off the ground puts it just
    // above the paving, which is where a label pointing at the floor has to sit.
    thing('盲道', LANEX[1], .12, -2.55, '盲道是给盲人走的。',
      'The tactile path is for blind passengers.',
      '盲 blind + 道 way. 无障碍 is step-free or accessible; both are signed all over China.',
      { focus: [LANEX[1] - .55, -2.55], reach: 1.4 });

    // ---- what the floor gives back. Polished tile under a lit sign carries a smeared copy of it,
    // and that reflection is most of what makes a station floor look like stone rather than paper.
    //
    // Real reflections mean drawing the room again upside down. These are the emissive things only,
    // as stretched additive pools lying where their reflection would be: it is the same trick as
    // the light pool under a lamp, aimed at the wall instead of at the ceiling. Eight quads, no
    // depth writes, and no geometry -- which is why it is affordable at all.
    for (const [s, az, c] of ADS)
      glow(M.trs(s * (RX - 1.30), .018, az, 0, 2.30, 1, 1.55), c, .055);
    for (const zz of [GATEZ + 1.30, EDGEZ - 1.30])
      glow(M.trs(0, .018, zz + .62, 0, 2.30, 1, 1.35), col.blue, .050);
    // The columns and the benches were left out of all this, and they are the largest things standing
    // on the floor. They could not be *added* to it, though, because a `glow` only ever adds light and
    // what a dark object does to polished stone is take it away: a tiled column reflected in a floor
    // is a dark smear under it, not a bright one. So their half of the effect is `shade` instead, in
    // `column` and `bench` where each one is built — a wide soft pool for the image in the stone and a
    // tighter darker one for the contact. Naming it here because this is where somebody will come
    // looking for it, and finding only the lit things in the list is what made it look deliberate.
    //
    // The gate line gets one too, since it is 12 m of steel and glass standing on the same tile and
    // was doing nothing to it either. One pool for the whole run rather than one per cabinet: at 55 cm
    // deep the five of them overlap, and five overlapping shadow quads on one strip of floor stack
    // into a black band.
    shade(0, GATEZ, RX * 2 - .4, 1.30, .13, .014);
    // And the big one: the light out of the train's open doors, lying across the platform in front
    // of them. One pool per doorway rather than a strip down the whole platform, and tied to how far
    // open the doors are — so it arrives with the train, spreads as the doors part, and goes with it.
    // Warm, because the inside of a car is warm and the concourse is not, and that difference is
    // most of what makes a lit train read as a lit train from the platform.
    for (const dx of DOORX)
      doorGlows.push(glow(M.trs(dx, .019, EDGEZ - .62, 0, 2.0, 1, 1.45), C('#ffe6bb'), 0));
    // The travelling one, parked dark until a train goes by behind the car.
    sweep = glow(M.trs(0, .020, EDGEZ - .95, 0, 3.2, 1, 1.9), C('#cfe0ea'), 0);
  }

  build();

  // ---------------------------------------------------------------- A, the zone toolkit
  //
  // The station's mirror of the flat's `A`, the street's `S` and the terminal's `A`. Declared HERE,
  // below `build()`, with `buildZones()` called below it — see the same note in js/airport.js. A
  // `const` is in the temporal dead zone until its statement runs, so dispatching the registry from
  // inside `build()` makes every zone builder throw on its first line, the catch swallows it, and
  // `.bootcheck.js` reports the game perfectly clean. That is what happened to js/street.js and it
  // cost nine agents a day of work.
  //
  // Functions are wrapped rather than passed by reference so they resolve at call time: `trainAt`,
  // `writeBoard` and `setStation` are declared further down, and a zone that ticks will be calling
  // them long after this object was made.
  const A = {
    // ---- the builders, straight off the shell's own scene
    box, cyl, ball, cap: capsule, taper, wall, flat, glyphs, solid, glow, thing, light: B.light,
    // Wrapped so a zone with a MOVING prop gets a handle on its contact shadow; build.js's `shade`
    // pushes its quad and returns nothing. Same fix as the street's and the terminal's.
    shade: (...a) => { const n = B.shadows.length; shade(...a);
                       return B.shadows.length > n ? B.shadows[B.shadows.length - 1] : null; },
    get props() { return B.props; }, get things() { return B.things; },
    C, G, col,
    // ---- the coordinate contract (METRO.md, "the zone + camera contract")
    //   the room is 12.8 x 10.4 x 3.30;  GATEZ = -1.55 is the spine: concourse z < GATEZ,
    //   platform z > GATEZ.  WIN is the stairwell mouth and belongs to the SHELL.
    RX, RZ, H, SX, WIN, GATEZ, EDGEZ, CARZ, DOORX,
    STATIONS, WALK,
    // ---- the shell's shared state. A zone READS these; only the shell writes them.
    trainAt: (clock) => trainAt(clock),
    writeBoard: (train) => writeBoard(train),
    setStation: (hz) => setStation(hz),
    // ---- THE m0 CONVENTION, and this is the metro-specific rule that has no equivalent in the
    // other four scenes. Sign slots, board slots, gate flaps, the clerk and every train prop keep
    // the matrix they were built with, captured AFTER `finish()` — which is where each prop's cull
    // data is worked out from the matrix it finds. A prop your zone intends to rewrite or move
    // later must be registered here, or `setStation` and `tick` will fight it and it will snap back
    // to a matrix nobody meant.
    //
    // Anything tagged `地铁` is collected automatically and needs no call: that is how the car
    // interior travels. Tag interior props `地铁`; do NOT tag anything that stays on the platform.
    rest: p => { if (p) zoneRest.push(p); return p; },
  };

  // Declared above the call, not below it: a `const` used by a function that runs before its
  // declaration is a temporal-dead-zone throw, and this file's own catch would swallow it into a
  // silent empty station.
  const zoneRest = [];
  const zoneLog = [];
  buildZones();

  // Every zone that has registered itself, each in its own js/metro-<zone>.js.
  //
  // `zonesBuilt` answers the question js/street.js could not: did the registry actually run, and
  // did each zone put anything in the room. A zone that registered, was called, threw on its first
  // line and was swallowed by the catch looks — from every angle including a clean .bootcheck.js —
  // exactly like a zone nobody has written yet.
  function buildZones() {
    for (const k in MetroFit) {
      const f = MetroFit[k];
      if (typeof f !== 'function') continue;
      const before = B.props.length, thBefore = B.things.length;
      try {
        f(A);
        zoneLog.push({ zone: k, props: B.props.length - before,
                       things: B.things.length - thBefore, ok: true });
      } catch (e) {
        zoneLog.push({ zone: k, props: 0, things: 0, ok: false, error: String(e && e.message) });
        console.error('MetroFit ' + k + ': ' + (e && e.message));
      }
    }
  }

  // ---------------------------------------------------------------- which station this is
  // The room is every station on the line. Rewrite the two name signs a character at a time,
  // slide the ring on the line map, and repoint the way out at the right piece of street.
  const PARKED = M.trs(0, -60, 0, 0, .001, .001, .001);
  const dot0 = 3.00 - 1.75, dotStep = .70;
  let current = null;
  function setStation(hz) {
    if (hz === current) return;
    const i = Math.max(0, STATIONS.findIndex(s => s.hz === hz));
    const s = STATIONS[i];
    current = s.hz;
    const chars = [...s.hz];
    // Centre what there is: a three-character name left in four slots sits hard against one edge
    // of the board with a hole where the fourth used to be. The shift goes the other way on the
    // faces turned through π, because those mirror x.
    for (const [slots, dir] of [[nameSlots, -1], [nameSlots2, 1]]) {
      const off = (4 - chars.length) * .24 * dir;
      slots.forEach((p, k) => {
        const i = k % 4;                 // both boards share one array of slots per facing
        if (i >= chars.length) { p.m = PARKED; p.cx = 0; p.cy = -60; p.cz = 0; return; }
        p.ch = chars[i];
        p.m = M.mul(M.trans(off, 0, 0), p.m0);
        p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
      });
    }
    // The floor inlays. Same job as the hanging signs and the opposite arithmetic: those run their
    // slots up in x and shift a short name one way, these run down in x and shift it the other.
    floorSlots.forEach((p, k) => {
      const j = k % 4;
      if (j >= chars.length) { p.m = PARKED; p.cx = 0; p.cy = -60; p.cz = 0; return; }
      p.ch = chars[j];
      p.m = M.mul(M.trans(-(4 - chars.length) * .205, 0, 0), p.m0);
      p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    });
    hereRing.m = M.mul(M.trans(i * dotStep, 0, 0), hereRing.m0);
    hereRing.cx = hereRing.m[12];
    exitThing.exit = s.out || STATIONS[0].out;
    writeDest(i);
    return s;
  }
  const stationAt = () => STATIONS.find(s => s.hz === current) || STATIONS[0];

  // ---------------------------------------------------------------- 开往 where this train is going
  // One platform, one direction. A real station of this size has two roads and a train on each, and
  // this room has one — so the honest reading of it is that this is the platform for the direction
  // with more line still in front of it, and the terminus it names is whichever end of the line you
  // are further from. At a terminus the rule gives the only answer there is: the way back in.
  //
  // Written into the two platform boards and onto the front of the train from one place, because the
  // failure to avoid is a board saying 机场 over a car whose blind says 杨柳胡同. It is not part of
  // `writeBoard`: that function is a pure function of the clock and has to stay one, and where the
  // train is going is a fact about which station you are standing in, not about what time it is.
  function terminusFor(i) {
    return STATIONS[i * 2 < STATIONS.length ? STATIONS.length - 1 : 0];
  }
  function writeDest(i) {
    const name = [...terminusFor(i).hz];
    for (const b of boards) if (b.dest) slots(b.dest, name.join(''));
    // The blind's slots go through `m0`, since `placeTrain` rebuilds `m` from it every frame.
    blindSlots.forEach((p, k) => {
      if (!p.home) return;                       // not captured yet: still inside `build`
      // `cy` is set here and not left to `placeTrain`, which only ever rewrites `cx`. Without it a
      // parked slot keeps the cull centre it was built with, passes the frustum test and costs a
      // draw call every frame to render a millimetre of nothing sixty metres underground.
      if (k >= name.length) { p.m0 = PARKED; p.cy = -60; return; }
      p.ch = name[k];
      p.m0 = p.home;
      p.cy = p.home[13];
    });
  }

  // ---------------------------------------------------------------- 闸机 opening a lane
  // `openGate` is called when a fare has been accepted. It picks the nearest lane set the way you
  // are going, opens its barrier at once so you can start walking, and hands back the middle of
  // the lane so the game can line you up with it — a step sideways, not a step through.
  function openGate(entering, px, t) {
    let best = null, bd = Infinity;
    for (const L of lanes) {
      if (L.inbound !== entering) continue;
      const d = Math.abs(L.cx - px);
      if (d < bd) { bd = d; best = L; }
    }
    if (!best) return null;
    best.open = true;
    best.until = t + GATE_HOLD;
    best.bar.open = true;
    return best.cx;
  }
  const gateOpen = () => lanes.filter(L => L.open).map(L => L.cx);

  // ---------------------------------------------------------------- 时刻表 the timetable
  // Trains run to a clock, and the clock is the game's own. That clock is compressed sixty to one —
  // a minute of it is a second of yours — so a headway that reads plausibly on the board is also
  // the headway you actually wait, and the two cannot both be ideal: twelve minutes between trains
  // at the peak is a little sparse for a metro, and it is the shortest gap the arrival, the dwell
  // and the departure will fit inside without the platform never being empty. It is the honest
  // choice of the two, because the clock is on screen in the corner and a board that disagreed with
  // it would be the kind of lie you notice.
  //
  // Minutes, and all of them divisors of an hour so the times on the board fall where a timetable's
  // times fall rather than drifting across the hour.
  // One an hour, on the hour. The board therefore reads 13:00, 14:00, 15:00, which is as legible as a
  // timetable gets, and the clock in the corner of the screen agrees with it exactly.
  //
  // It used to vary with the hour — fifteen minutes at the peaks, thirty at night. The crowd still
  // does; the trains no longer do. What an hourly headway buys, besides being what was asked for, is
  // room for a long dwell: at sixty minutes between trains a fifteen-minute stand is neither here nor
  // there, and fifteen minutes of this clock is fifteen seconds of yours to walk up and get on.
  const HEADWAY = 60;
  const headway = () => HEADWAY;
  // What happens between one scheduled arrival and the next, in minutes of it. The train berths
  // exactly on its scheduled minute, so the approach happens in the minutes before that time and
  // everything else after: doors open, stand, doors shut, pull out, and an empty platform until the
  // next one is close enough to be on its way in.
  // The whole cycle is 21.2 minutes of the hour: two and a bit coming in, a moment for the doors, a
  // fifteen-minute stand, the doors again, and two and a bit going out. The other thirty-nine minutes
  // the platform is empty and the board is counting down, which is the half of this worth watching.
  const APPROACH = 2.2, DOOR_MIN = .9, DWELL = 15.0, DEPART = 2.2;
  const RUN = 13.2;                       // how far out it has to go to be behind the tunnel mouth
  const nextAt = clock => Math.ceil(clock / headway(clock)) * headway(clock);

  // Where the train is and how open the doors are, worked out from the clock rather than
  // accumulated frame by frame. Being a pure function of the time is the whole point: this game's
  // clock jumps — a night's sleep, an eight-hour shift, a flight to Shanghai — and a state machine
  // that had been counting would come back mid-slide with its doors half open, where this simply
  // reports wherever the timetable says the train should be.
  function trainAt(clock) {
    const hw = headway(clock);
    const next = nextAt(clock);
    const toGo = next - clock;                       // minutes until it berths
    const since = clock - (next - hw);               // minutes since the last one berthed
    // Coming in: the last stretch before its time, decelerating into the platform.
    if (toGo <= APPROACH) {
      const u = 1 - toGo / APPROACH;
      return { x: -RUN * (1 - u) * (1 - u), psd: 0, car: 0, phase: 'approach',
               openLeft: 0, toGo, next, hw };
    }
    if (since <= DOOR_MIN) {
      const k = since / DOOR_MIN;
      return { x: 0, psd: k, car: k, phase: 'opening',
               openLeft: DOOR_MIN + DWELL - since, toGo, next, hw };
    }
    if (since <= DOOR_MIN + DWELL)
      return { x: 0, psd: 1, car: 1, phase: 'berthed',
               openLeft: DOOR_MIN + DWELL - since, toGo, next, hw };
    if (since <= DOOR_MIN + DWELL + DOOR_MIN) {
      const k = 1 - (since - DOOR_MIN - DWELL) / DOOR_MIN;
      return { x: 0, psd: k, car: k, phase: 'closing', openLeft: 0, toGo, next, hw };
    }
    const out = since - DOOR_MIN - DWELL - DOOR_MIN;
    if (out <= DEPART) {
      const u = out / DEPART;
      return { x: RUN * u * u, psd: 0, car: 0, phase: 'departing',
               openLeft: 0, toGo, next, hw };
    }
    return { x: RUN, psd: 0, car: 0, phase: 'away', openLeft: 0, toGo, next, hw };
  }
  // ---- the board's contents. Row one is always the *next* arrival, which while a train is standing
  // at the platform means the one after it — which is what a real board tells you, because the train
  // in front of you is not information.
  const hhmm = m => {
    const t = ((Math.round(m) % 1440) + 1440) % 1440;
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  };
  function slots(row, str) {
    row.forEach((p, i) => {
      const ch = str[i];
      // A blank is a parked glyph, not a space: a transparent quad still writes depth.
      if (!ch || ch === ' ') { p.m = PARKED; p.cx = 0; p.cy = -60; p.cz = 0; return; }
      p.ch = ch;
      p.m = p.m0; p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    });
  }
  function writeBoard(train) {
    const now = hhmm(train.next), after = hhmm(train.next + train.hw);
    // Under a minute off, it says it is coming in rather than counting down to a zero.
    const mins = train.toGo < 1 ? '进站'
      : String(Math.ceil(train.toGo)).padStart(2, ' ') + '分';
    for (const b of boards) { slots(b.now, now); slots(b.next, after); slots(b.mins, mins); }
  }

  // The one question the rest of the game asks: can somebody get on right now.
  const trainHere = () => {
    const s = trainAt(clockNow);
    return s.phase === 'berthed' || s.phase === 'opening';
  };

  // ---------------------------------------------------------------- 列车 where the train is
  // One place that puts the train somewhere and the two sets of doors at some point between shut
  // and open, so the state machine below only has to decide three numbers and nothing else in this
  // file has to know how the car is assembled.
  //
  // `x` is metres along the platform from berthed, negative for still coming and positive for gone.
  // `psd` and `car` are 0 shut to 1 open. The car's leaves take both transforms — the car's position
  // and their own travel — which is why they are re-placed after the body rather than with it.
  function placeTrain(x, psd, car) {
    for (const p of carProps) {
      p.m = M.mul(M.trans(x, 0, 0), p.m0);
      p.cx = p.m[12];
      if (p.ob) p.ob.x = p.obx0 + x;
    }
    for (const L of carLeaves) {
      const off = x - L.dir * (1 - car) * CAR_SLIDE;
      L.p.m = M.mul(M.trans(off, 0, 0), L.p.m0);
      L.p.cx = L.p.m[12];
      if (L.p.ob) L.p.ob.x = L.p.obx0 + off;
    }
    for (const leaf of panes) {
      const off = -leaf.dir * (1 - psd) * PSD_SLIDE;
      for (const p of leaf.props) {
        p.m = M.mul(M.trans(off, 0, 0), p.m0);
        p.cx = p.m[12];
        if (p.ob) p.ob.x = p.obx0 + off;
      }
    }
  }

  // ---------------------------------------------------------------- what moves
  // A train goes through the far tunnel every so often. It is never seen: the car standing at this
  // platform fills the room from wall to wall, so there is nowhere to put a tunnel mouth and nothing
  // to see through it. What there is instead is the light of it running along the flank of the car
  // and across the floor, and the sound of it crossing your head -- which is what a train you
  // cannot see actually consists of, and it needs no geometry at all.
  //
  // `t` is a clock since the page loaded, not a delta, and it only advances while somebody is
  // standing in this room. Coming back after ten minutes away therefore finds a train already due,
  // which is right: arriving on a platform as one goes past is the best possible first second.
  const PASS_EVERY = 34, PASS_DUR = 6.4, PASS_WARN = 4.0;
  let passAt = 0, passing = -1, passLeft = true;
  // The game clock, in minutes since midnight, handed in by the tick. The timetable is the one thing
  // in this room that runs on the world's time rather than on seconds since the page loaded.
  let clockNow = 12 * 60;
  function setAds(t) {
    for (let i = 0; i < adPanels.length; i++) {
      const p = adPanels[i], base = p.glow0 === undefined ? (p.glow0 = p.glow) : p.glow0;
      // Each box breathes on its own slow clock, so the wall never pulses as one object.
      let k = 1 + Math.sin(t * (.31 + i * .07) + i * 2.1) * .06;
      // And the third one is failing: a fast flutter with an occasional longer drop-out, which is
      // exactly what a tube at the end of its life does.
      if (i === 2) {
        const f = Math.sin(t * 17.3) * Math.sin(t * 5.1);
        k *= .82 + .18 * f * f - (Math.sin(t * .7) > .93 ? .55 : 0);
      }
      p.glow = base * k;
    }
  }
  // ---------------------------------------------------------------- 服务员 the clerk, breathing
  // She is built as a flat relief facing out of the window — 6 cm thick at the torso, 3.4 cm at the
  // head — because that is all a silhouette needs. Which means the axis matters, and it is not the
  // one you would reach for: the window is in the +x wall and is read from -x, so *everything that
  // moves along x is invisible*. A yaw about the spine, which is the natural thing to give somebody
  // on a stool, displaces her shoulders straight up the view direction and cannot be seen at all.
  // What can be seen is z, across the opening, and that comes from a rotation about x.
  //
  // So it is a sway: the body leaning left and right about the base of the stool, two periods that do
  // not divide into each other so it never settles into a rhythm — twenty-three seconds for the
  // weight and nine for the smaller movement over the top of it. Two degrees, no more. The head
  // takes a little more than the body, because a head leads a lean rather than following it.
  //
  // Rotating a prop about a point that is not its own origin is translate · rotate · un-translate
  // applied to the matrix it was built with — the sandwich the gate flaps get to skip by sliding
  // along an axis through their own centres.
  function setClerk(t) {
    if (!clerk.pivot) return;
    const [px, py, pz] = clerk.pivot;
    const lean = (p, a) => {
      p.m = M.mul(M.trans(px, py, pz),
        M.mul(M.rotX(a), M.mul(M.trans(-px, -py, -pz), p.m0)));
      p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
    };
    // The head is 49 cm above the pivot, which is the number that sets the amplitude: every
    // hundredth of a radian here is half a centimetre at the head. At .105 total — the first thing
    // tried — she swung 10 cm from side to side, which is not a person shifting on a stool, it is a
    // person rocking. Two degrees puts the head through about 4 cm over twenty seconds.
    const a = Math.sin(t * .273) * .020 + Math.sin(t * .71 + 1.7) * .006;
    for (const p of clerk.body) lean(p, a);
    lean(clerk.head, a + Math.sin(t * .71 + 1.7) * .012);
    // and the arm, which shifts a few millimetres on the ledge on a clock of its own rather than
    // travelling with the shoulders: an arm resting on a counter stays on the counter.
    lean(clerk.arm, Math.sin(t * .19 + .8) * .011);
  }

  function setClockHands(mins) {
    if (!clockHands.hour) return;
    const hand = (p, x, len, w, ang) => {
      p.m = M.mul(M.trans(x, CLY, CLZ),
        M.mul(M.rotX(ang), M.mul(M.trans(0, len / 2, 0), M.scale(w, len, w * 1.3))));
      p.cx = p.m[12];
    };
    // Twelve hours for the hour hand, one for the minute, and the sign puts them going clockwise
    // as seen from the platform rather than backwards.
    //
    // Shorter than they were. A hand runs from the pivot out to its full length, and the minute hand
    // was 27 cm long on a dial whose white rim is 22 cm in radius — five centimetres of it stuck out
    // past the edge of the clock, which reads as a spike driven through the face. There were no
    // numerals on it to be crowded before, which is presumably how it went unnoticed. The three now
    // stop inside the marks at .168, except the sweep hand, which is meant to cross them.
    hand(clockHands.hour, -RX + .23, .115, .016, -(mins % 720) / 720 * Math.PI * 2);
    hand(clockHands.min, -RX + .235, .162, .012, -(mins % 60) / 60 * Math.PI * 2);
    // 秒针 the sweep hand and its counterweight, on the fraction of a game minute — one revolution
    // per minute of this world, which is one second of yours. The tail is the same angle plus π,
    // which is what puts it out the back of the boss instead of on top of the hand it belongs to.
    if (clockHands.sec) {
      const sa = -(mins % 1) * Math.PI * 2;
      hand(clockHands.sec, -RX + .242, .185, .006, sa);
      hand(clockHands.tail, -RX + .242, .050, .010, sa + Math.PI);
    }
  }

  // ---------------------------------------------------------------- 广播 what the platform says
  // The loudspeaker's own lines, read by the announcer at bake time exactly the way the station
  // names are. A countdown rather than one call, because what a platform PA is for is telling you
  // how much longer you are going to be standing here.
  //
  // The minutes are the game's own minutes, and the game's clock is compressed — a shower takes
  // four seconds and costs twenty-five minutes of the day. The platform is no different: the
  // countdown runs across the thirty-four seconds between trains, and the chase along the platform
  // edge, the board over the screen doors and this announcement are all describing the same
  // approaching train rather than three unrelated pieces of movement.
  const NOTICES = {
    // The half-hour call, which at an hourly headway goes out on the half hour: the one piece of
    // information a platform can give you that changes what you do next, because half an hour is
    // long enough to go back up the steps and come down again.
    due30: '下一趟列车三十分钟后到站。',
    due3: '下一趟列车三分钟后到站。',
    due2: '下一趟列车两分钟后到站。',
    due1: '下一趟列车一分钟后到站。',
    near: '列车即将进站，请在黄线内候车。',
  };
  // Seconds before the train, and what gets said at each. Chosen by how far off the train actually
  // is rather than run off a timer of its own, so a platform walked back onto halfway through a gap
  // picks the countdown up where it really is instead of starting it again from three minutes.
  //
  // One line per approach, and never within SAY_GAP of the last thing said. Saying all four of
  // these on every train put an announcement into the room every eight seconds, which is a
  // fairground rather than a station: the horn is the loudest thing in here and it stops meaning
  // anything if it never shuts up. Which line comes round is rotated instead, so one train is
  // announced three minutes out and the next is announced as it arrives — and since each line is
  // true of whichever train is next when it plays, nothing has to be tracked to keep it honest.
  // Each of these lines is only true at one moment, so which line is chosen decides when it plays:
  // 三分钟后到站 goes out three minutes before the train and 即将进站 as it comes in. That is new —
  // until there was a timetable these were counting down to an unseen train in the far tunnel and
  // the minutes in them were decorative. Now the platform cannot say anything that is not so.
  //
  // One announcement per train and never two inside SAY_GAP minutes of each other, so at a
  // twelve-minute peak headway roughly every third train gets announced rather than all of them:
  // the horn is the loudest thing in the room and stops meaning anything if it never stops.
  const SAY_LINES = [['due3', 3.0], ['due2', 2.0], ['near', 0.7], ['due1', 1.0]];
  const SAY_GAP = 26;
  let saidFor = -1, lastSay = -1e9, sayTurn = 0;
  // The half-hour warning, which is outside that rotation and outside SAY_GAP on purpose. The
  // rotation exists to keep the last three minutes before a train from turning into a fairground;
  // this line is nowhere near those minutes. At an hourly headway it goes out at the midpoint with
  // half an hour of quiet on either side of it, so it is the opposite problem, and it gets said for
  // every train rather than one in four.
  //
  // WARN_WINDOW is what keeps it honest. The state machine is a pure function of the clock, so
  // "toGo has come down past thirty" has to be tested as an interval rather than a moment or
  // walking onto the platform at twenty minutes to would be greeted with news of a half-hour wait.
  // One game minute is one real second and a frame advances the clock by a sixtieth of that, so the
  // window is about sixty frames wide: wide enough that it cannot be stepped over, narrow enough
  // that the words are true to within a minute. A clock that jumps across it — a shower, a shift —
  // skips the warning, which is right, because the half hour it was about went by while you were
  // somewhere else.
  const WARN_AT = 30, WARN_WINDOW = 1.0;
  let warnedFor = -1;
  let lastPhase = '';

  function tick(t, body, clock) {
    if (typeof clock === 'number') clockNow = clock;
    // ---- the zones that move, each in its own file. Dispatched first so a zone can read the
    // clock the shell is about to act on. A zone whose tick throws is dropped for the rest of the
    // run rather than taking the station's own animation down with it.
    for (const k in MetroFit) {
      const f = MetroFit[k];
      if (!f || typeof f.tick !== 'function') continue;
      try { f.tick(t, body, clockNow); }
      catch (e) { console.error('MetroFit ' + k + '.tick: ' + (e && e.message)); f.tick = null; }
    }
    // ---- 列车 the train itself, on its timetable. Placed from the clock every frame, which is also
    // what makes it survive the clock jumping: there is nothing here to get out of step.
    // Everything this room wants played this frame. A list rather than one name, because a train
    // berthing makes three sounds at once — a chime, the station's name and the doors — and handing
    // back only the first of them was how the old single-event return would have lost the other two.
    const out = [];
    const train = trainAt(clockNow);
    placeTrain(train.x, train.psd, train.car);
    // ---- 钟 the clock on the end wall, which for a long time said half past ten under a board
    // counting down in real minutes.
    setClockHands(clockNow);
    setAds(t);
    setClerk(t);
    // ---- 下一班 the board. Written from the same numbers that just placed the train.
    writeBoard(train);
    // The light out of the doors, which arrives with the train and widens as the doors part.
    for (const g of doorGlows) g.a = train.psd * train.psd * .13;
    // 信号 red while the road is occupied, green once the train has gone.
    for (const s of signals) {
      const clear = train.phase === 'away';
      s.color = clear ? LAMP_OPEN : LAMP_SHUT;
      s.glow = clear ? .30 : .38;
    }
    // ---- the mouths. Dark except when there is a train in one, and then it is the *right* one: the
    // west bore lights as the train comes in and the east bore as it goes out, because that is the
    // direction this platform runs. Before this the two holes in the ends of the room were the only
    // part of the station that never changed — a train would come out of an unlit tunnel and leave
    // into one, and the light of a train is visible up a bore long before the train is.
    //
    // Off the same numbers that placed the car, so the brightening cannot get out of step with it: on
    // the way in it grows as `x` closes on zero, and on the way out it fades as the car runs off.
    //
    // The shape is `inBore`: nothing while the train is still deeper than the bore is long, brightest
    // when it is inside the bore about to come out, and nothing again once it is in the room and its
    // own lights are doing the work. Both ends are zero at the phase boundaries on purpose — an
    // easing that peaked at the moment the phase changed put a visible flash in the mouth on the
    // frame the state machine switched over.
    if (boreGlow.length === 2) {
      const inBore = d => Math.min(1, Math.max(0, (RUN - d) / (RUN - 6.4)))
                        * Math.min(1, Math.max(0, d / 6.4));
      // `a`, not `glow` — these are entries in the glow list, and the draw loop reads their alpha.
      boreGlow[0].a = train.phase === 'approach' ? inBore(-train.x) * .40 : 0;
      boreGlow[1].a = train.phase === 'departing' ? inBore(train.x) * .40 : 0;
    }
    // ---- the other road. A train on the far track, never seen, which used to be the only train
    // this station had — there was nowhere to put a tunnel mouth and nothing to see through it. Now
    // that there is a real one it stays, because a two-track metro does have trains going the other
    // way, but it only goes by while this platform is empty: two rumbles on top of each other is
    // one rumble nobody can place, and the arrival is the one that has to be heard.
    // Room for the whole of it before the next arrival, too. Gating on "away" alone let the far road
    // start a pass a second before this platform's own train came in, and the two rumbles a second
    // apart were one rumble nobody could place.
    if (!passAt) passAt = t + 9;
    if (passing < 0 && t >= passAt && train.phase === 'away'
        && train.toGo > APPROACH + PASS_DUR) {
      passing = t;
      passLeft = !passLeft;
      out.push('passing');
    }
    if (passing >= 0 && t > passing + PASS_DUR) {
      passing = -1;
      passAt = t + PASS_EVERY;
    }
    // ---- 广播 the half-hour call, on the way down past thirty minutes to go. Once per train and
    // outside the rotation below, which it can never collide with: that one has nothing to say until
    // three minutes to go. If the headway were ever shortened under half an hour this simply stops
    // happening — toGo would never reach thirty — which is the right way for it to fail.
    if (train.next !== warnedFor
        && train.toGo <= WARN_AT && train.toGo > WARN_AT - WARN_WINDOW) {
      warnedFor = train.next;
      out.push('say:due30');
    }
    // ---- 广播 the announcement, counted down against the real next arrival.
    if (train.next !== saidFor && clockNow - lastSay >= SAY_GAP) {
      const [line, at] = SAY_LINES[sayTurn % SAY_LINES.length];
      if (train.toGo <= at) {
        saidFor = train.next; sayTurn++; lastSay = clockNow;
        out.push('say:' + line);
      }
    }
    // ---- and the sounds the train itself makes, on the frames it changes what it is doing.
    if (train.phase !== lastPhase) {
      if (train.phase === 'approach') out.push('passing');
      // The chime and the station name, which is what a platform says when a train berths at it.
      if (train.phase === 'opening') { out.push('arrive'); out.push('doors-open'); }
      if (train.phase === 'closing') out.push('doors-close');
      lastPhase = train.phase;
    }
    // How far through it we are, and how loud it is: nothing, up, over, down, nothing.
    const k = passing < 0 ? 0 : (t - passing) / PASS_DUR;
    const amp = passing < 0 ? 0 : Math.sin(Math.min(1, Math.max(0, k)) * Math.PI);
    // Where its light is, running the length of the platform and out the other end.
    const sx = (passLeft ? -1 : 1) * (RX + 3.2) * (1 - k * 2);

    // ---- its light on the floor, and through the windows of the car standing here
    if (sweep) {
      sweep.a = amp * .17;
      sweep.m = M.trs(sx, .020, EDGEZ - .95, 0, 3.6, 1, 2.0);
    }
    for (const w of carWindows) {
      const near = Math.max(0, 1 - Math.abs(w.x - sx) / 3.4);
      w.p.glow = amp * near * near * .55;
    }
    // A small liberty, and a real one: on an older system a train drawing current off the same rail
    // pulls the lights in the next car down a little. It is barely visible and it is what ties the
    // train you cannot see to the one you can.
    for (const c of carLights) c.glow = (c.glow || 0) - amp * .06;

    // ---- 候车灯 the edge lights, which run along the edge while a train is due. Driven by the
    // timetable now rather than by the unseen train in the far tunnel: these are telling you about
    // the train you are waiting for, and there is finally one of those to tell you about.
    const due = train.phase === 'away'
      ? Math.max(0, 1 - (train.toGo - APPROACH) / 3.0)
      : 1;
    for (const L of edgeLamps) {
      // A light running from one end to the other, faster as the train gets closer.
      const chase = (L.t - t * (.55 + due * .75)) % 1;
      const band = Math.max(0, 1 - Math.abs((chase < 0 ? chase + 1 : chase) - .5) * 5);
      L.p.glow = .015 + due * band * band * .70;
    }

    // ---- 下一车 the board, marching. Slowly when there is nothing coming, quickly when there is.
    for (const L of leds) {
      const march = Math.sin(L.i * .42 - t * (1.5 + due * 4.0));
      L.p.glow = .04 + Math.max(0, march) * (.16 + due * .34);
    }

    // ---- the tubes that are going. A dying fluorescent strikes, holds, and drops out, and it does
    // it on its own clock -- two of them failing in step would read as the room having a pulse.
    for (const f of failing) {
      const u = (t * f.rate + f.phase) % 6.2;
      // Alight for most of the cycle, then a stutter at the end of it.
      const out = u > 5.1 ? (Math.sin(u * 48) > -.1 ? 1 : .10) : 1;
      const strike = u > 5.1 && u < 5.25 ? 1.35 : 1;
      f.p.glow = f.glow * out * strike;
    }

    // The flaps slide, the lamp changes colour and the arrow lights. A lane will not shut on
    // somebody standing in it, however long they take about it.
    for (const L of lanes) {
      if (L.open && t > L.until) {
        const inLane = body && Math.abs(body.x - L.cx) < .62
          && Math.abs(body.z - GATEZ) < .55;
        if (!inLane) { L.open = false; L.bar.open = false; }
      }
      for (const p of L.lamps) p.color = L.open ? LAMP_OPEN : LAMP_SHUT;
      const want = L.open ? 1 : 0;
      if (Math.abs(L.k - want) < .002) { L.k = want; continue; }
      L.k += (want - L.k) * .16;
      // Four sliding props per lane: a pane and a bright edge on each leaf, and both leaves of a
      // pair go the same way as the one they belong to.
      L.flaps.forEach((p, i) => {
        const s = i < 2 ? -1 : 1;
        p.m = M.mul(M.trans(s * L.k * .56, 0, 0), p.m0);
        p.cx = p.m[12];
      });
    }
    // Handed back rather than played from here: the room knows what its own train is doing, and
    // game.js is where every sound in this game is triggered from.
    return out.length ? out : null;
  }

  function setNight(k) {
    // Underground, so almost nothing changes — only the daylight down the stairwell, which is
    // why those two props are `litten` with a negative weight.
    const soft = k * k * (3 - 2 * k);
    for (const { p, k: kk } of litProps)
      p.glow = (p.glow0 === undefined ? (p.glow0 = p.glow || 0) : p.glow0) + soft * kk * .26;
  }

  const api = B.finish({
    // What each registered zone contributed, and whether it threw on the way. See buildZones.
    zonesBuilt: () => zoneLog.map(z => ({ ...z })),
    setNight, setStation, stationAt, STATIONS, GATEZ, EDGEZ, LANEX, WALK, NOTICES,
    tick, openGate, gateOpen, liftAt, placeTrain, trainAt, trainHere,
    // What the timetable says, for the parts of the game that have to agree with it: the gate will
    // not let you onto a train that is not there, and the crowd only boards while the doors are open.
    trainNow: () => trainAt(clockNow),
    // Read-only, for the harness: where the clock's hands are pointing and how bright each poster
    // box is. Both are animated, and an animation nobody can measure is an animation that quietly
    // stops working.
    clockHands: () => (clockHands.hour
      ? { hour: [clockHands.hour.m[13], clockHands.hour.m[14]],
          min: [clockHands.min.m[13], clockHands.min.m[14]] } : null),
    adGlows: () => adPanels.map(p => +p.glow.toFixed(4)),
    RX, RZ, H, WIN, OUT: STATIONS[0].out,
    label: '地铁站', labelK: '地铁站 · metro',
    indoor: true, cutaway: true, near: .05, far: 40, expose: 1,
    // In at the bottom of the steps, facing the gates.
    spawn: { x: SX + .30, z: -RZ + 1.35, yaw: Math.PI * .06 },
    zones: [{ id: 'metro', x0: -RX, x1: RX, z0: -RZ, z1: RZ, light: [0, H - .40, .20] }],
    roomAt() { return this.zones[0]; },
  });
  // The sign slots keep the matrix they were built with, so `setStation` can shift a short name
  // back to the middle of the board. Captured after `finish`, which is where the cull data for
  // each prop is worked out from the matrix it finds.
  for (const p of [...nameSlots, ...nameSlots2, ...floorSlots, hereRing]) p.m0 = p.m;
  // The boards' slots keep theirs too, because a blank position is a parked glyph rather than a
  // space: a transparent glyph quad still writes depth and would punch a hole in the board.
  for (const b of boards)
    for (const p of [...b.now, ...b.mins, ...b.next, ...b.dest]) p.m0 = p.m;
  // Same for the gate flaps, which slide along x when a lane opens.
  for (const L of lanes) for (const p of L.flaps) p.m0 = p.m;
  // And the clerk, who is turned about the stool rather than translated, so every one of her pieces
  // needs the matrix it was built with to turn from.
  for (const p of [...clerk.body, clerk.head, clerk.arm]) p.m0 = p.m;
  // And the train. Collected by tag so that anything added to the car later comes along without
  // anybody remembering to register it, which is the failure this would otherwise be waiting for.
  // `obx0` is kept as well as `m0`: `ob` is the box the cursor is tested against, and a train that
  // has left the station must not still be clickable where it used to be standing.
  carProps = api.props.filter(p => p.tag === '地铁');
  for (const p of carProps) { p.m0 = p.m; if (p.ob) p.obx0 = p.ob.x; }
  for (const leaf of panes) for (const p of leaf.props) { p.m0 = p.m; if (p.ob) p.obx0 = p.ob.x; }
  // The blind's slots keep a third copy, `home`, on top of `m` and `m0`. `setStation` writes their
  // `m0` — parking a slot means putting PARKED there — so it needs somewhere to have kept the real
  // one, or a four-character terminus after a two-character one would find nothing to come back to.
  for (const p of blindSlots) p.home = p.m0;
  // And every prop a zone registered through `A.rest`. Same pass, same reason, same place: after
  // `finish`, because that is where the cull data is read off the matrix.
  for (const p of zoneRest) { p.m0 = p.m; if (p.ob) p.obx0 = p.ob.x; }
  setStation('杨柳胡同');
  return api;
});
