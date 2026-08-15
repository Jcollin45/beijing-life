// 车流 — the traffic on 马路, and the only thing in this district that has ever had somewhere to be.
//
// STREET.md's problem 2, in the street's own words (js/street.js): *"traffic. Nothing moves, but an
// empty six-lane road in Beijing reads as wrong."* Five cars and a bus were placed once as immutable
// geometry and never revisited — `car()` returns nothing, so there was never a handle to move, and
// `wheel()` is a static alloy. This file does not try to animate those five: it cannot reach them,
// and they are somebody else's geometry. It builds its own fleet, keeps a handle on every part of
// it, and drives the lot from `StreetFit['traffic'].tick`. The old static fleet is omitted whenever
// this district is present, so the bus bay and live lanes never contain two vehicles at once.
//
// ---------------------------------------------------------------------------------------------
// WHAT A BEIJING ROAD LOOKS LIKE, and what that made me build
//
// 1. **Two motor lanes, not six.** The published right-of-way gives each kerb a 非机动车道, one
//    southbound motor lane, the double yellow, then one northbound motor lane.
//
// 2. **Measured activity beats a vehicle wall.** 25–30 km/h reads as an urban road; stacking every
//    family into one close view hides the buildings and reads as a motor show. The live motor fleet
//    is one working route bus; cycles and a moped provide independent, much smaller rhythms.
//
// 3. **The queue at the 红绿灯 is the density.** Traffic that respects the lights concentrates
//    itself exactly where you are standing to look at it, and then releases. That single rule does
//    more for how busy the road reads than another six cars would.
//
// 4. **The bus stops.** A 公交车 that drives past its own stop at a constant speed is scenery. This
//    one docks against the protected boarding island, opens its doors, dwells, indicates, and pulls
//    away without driving through the cycle track. The former kerb swing crossed the refuge and the
//    zebra before it had returned to the motor lane; a platform stop is the honest geometry here.
//
// ---------------------------------------------------------------------------------------------
// WHICH WAY THE TRAFFIC GOES — measured, because the district disagrees with itself
//
// China drives on the right, so every vehicle has its kerb on its right. The one fixed piece of
// evidence on this road is the 公交车站: it is on the WEST pavement (`RD0 - 2.6`). A bus serving a
// west-kerb stop must have that kerb on its right, so the west half of the carriageway travels
// toward **+z** and the east half toward **-z**. That also makes -z north, which agrees with
// street.js calling the block at negative z "your block, north side" and with `S.road.north` being
// the east side. Four independent facts, all lining up.
//
// The five static cars in street.js do not line up with any of them: the east-side three are built
// at `ry = 0` (nose toward +z) and the west-side two at `ry = π`. Every one is pointing the wrong
// way up its own lane, which is left-hand traffic. One more reason they should go.
//
// ---------------------------------------------------------------------------------------------
// PERFORMANCE — `.audit.js:327` records that this street is FILL-RATE-BOUND, not geometry-bound,
// and STREET.md makes `44-parade` a mandatory canary for anything that moves. Three decisions
// follow from that, and they are why this file looks the way it does:
//
//   - **No new draw calls.** Every prop here is built with the batcher's default corner radius and
//     one of four material keys js/street.js already uses in bulk (`softBox` mode 0, `box` hard,
//     `cyl`, `box` mode 1). `build.js` batches on mesh + mode + round + textures and carries colour,
//     gloss and glow per instance, so two-hundred-odd vehicle parts join batches that already
//     exist and cost their instance rows and nothing else. Colour is free; a new `round` would not
//     have been. The only unbatched props here are the route/livery glyphs, which is what readable
//     operator information costs anywhere.
//   - **Cheaper than what it replaces.** street.js's `car()` is about 93 props for the saloon and
//     105 for the SUV — near 500 for its five, plus thirty for the parked bus. This deliberately
//     sparse working-bus fleet comes in far under that; the cycle controller preserves smaller
//     useful street rhythms without duplicating a failed motor silhouette into the queue.
//   - **No point lights, and the light pools are recycled.** Only eight lights reach the shader and
//     the street's own lamps want them. Headlights are emissive geometry, which is per-instance and
//     free; the pools they throw on the tarmac are two `glow` quads passed round the nearest
//     vehicles and folded away to a speck by day, because an additive quad at alpha 0 still costs
//     every pixel it covers.
//
// Matrices: a vehicle going straight gets two floats written per part per frame — m[12] and m[14]
// off a stored `m0` — rather than a 4×4 multiply. The bus's shallow dock builds one pivot and
// multiplies through it, the shape js/world.js's `moveRider` uses.
StreetFit['traffic'] = S => {
  const p0 = S.props.length;
  const { C } = S;
  const HALF_PI = Math.PI / 2;
  const sm = u => { const k = u < 0 ? 0 : u > 1 ? 1 : u; return k * k * (3 - 2 * k); };

  // ---------------------------------------------------------------- the road, read off the paint
  // Anchored on the road district's measured contract. This is a two-lane motor road with a cycle
  // track on each side; the previous third motor lane was centred at x 36.30, directly in the east
  // cycle track.
  const MID = (S.RD0 + S.RD1) / 2;          // the shell's double-yellow datum
  const ROAD_SIG = (() => {
    try { return StreetFit['road'] && StreetFit['road'].signal; } catch (_) { return null; }
  })();
  const LANE_SB = ROAD_SIG && ROAD_SIG.lanes ? ROAD_SIG.lanes.south : 31.07;
  const LANE_NI = ROAD_SIG && ROAD_SIG.lanes ? ROAD_SIG.lanes.north : 33.92;
  const BIKE_W = ROAD_SIG && ROAD_SIG.lanes ? ROAD_SIG.lanes.bikeW : 26.545;
  const BIKE_E = ROAD_SIG && ROAD_SIG.lanes ? ROAD_SIG.lanes.bikeE : 36.295;
  // Stop at the painted bars, on the approach side of the zebra. The road contract names these by
  // geographic side; the west lane travels +z and therefore uses the negative-z bar.
  const STOP_SB = ROAD_SIG && ROAD_SIG.stopLine ? ROAD_SIG.stopLine.north : -4.00;
  const STOP_NB = ROAD_SIG && ROAD_SIG.stopLine ? ROAD_SIG.stopLine.south : 3.60;
  // The ring. Each lane is a loop of road `SPAN` long: a vehicle that runs off one end reappears at
  // the other with the car in front of it still in front of it, so the following model never sees a
  // seam and nothing has to be spawned or destroyed. `S.road.z0/z1` (±13.5) are the walkable zone's
  // bounds, not a recycle distance — wrapping there would pop a car into being thirteen metres from
  // your face.
  //
  // ±58 rather than ±46, for a reason that only showed up once the thing was running: a ring has to
  // be long enough that a whole green phase does not take a car all the way round it. At ±46 the
  // cars released by one green came back and joined the back of the same queue before the next red,
  // the loop saturated, and the entire road settled into a permanent 4 km/h crawl — dense, but the
  // wrong kind of dense. At ±58 (116 m) a lap is longer than a cycle and the road breathes. The
  // wrap itself is 58 m up a road you are looking across rather than along, and ~28% fogged.
  // Both pavements now continue well beyond the original road zone (hotel to z≈48, hospital to
  // z≈43). Recycle behind the fog at ±120. The longer ring is also a visual headway: even a full
  // red phase cannot pull the complete fleet into one wall of vehicles at the crossing.
  const HALF = 120, SPAN = HALF * 2;

  // ---------------------------------------------------------------- colours
  // Ordinary Chinese city traffic: mostly white, silver, black and grey, with one 出租车 in it.
  // Colour is a per-instance value in the batch, so the whole spread is free.
  const GLASS = C('#242c34'), TINT = C('#39454f'), TYRE = C('#17191b'), SPOKE = C('#8d949a'),
        TRIM = C('#23282d'), ARCH = C('#14171a'),
        HEAD = C('#e4f1ff'), TAIL = C('#e0392a'), AMBER = C('#e8a02c'),
        PLATE_G = C('#2e7a45');

  const V = [], LANES = [], POOLS = [];

  // ---------------------------------------------------------------- the parts bin
  //
  // Every vehicle is built standing at its lane's x with u = 0, and then moved. The build matrix of
  // each part is kept as `m0`, so the tick only ever adds an offset to it — the same contract the
  // pigeons and the washing in js/street.js already work to.
  function vehicle(lane, o) {
    const v0 = o.v0 === undefined ? 7 : o.v0;
    const initial = .56 + (V.length % 5) * .065;
    const v = {
      lane, u: o.u, x0: lane.x, base: lane.base, sgn: lane.sgn,
      // Build at the authored starting coordinate. A paused first street frame must show a spaced
      // fleet, not every body stacked at z=0 waiting for the first tick to place it.
      z0: lane.sgn * o.u,
      // Staggered rolling starts avoid the fleet accelerating in mechanical lockstep.
      v: o.still ? 0 : v0 * initial, v0,
      len: o.len || 4.5, wid: o.wid || 1.85, hgt: o.hgt || 1.55,
      dec: o.dec || 3.0, acc: o.acc || 1.7, brake: o.brake || 4.2, gapMin: o.gapMin || 3.15,
      // A generous, varied time reserve keeps a moving stream from settling into one mechanical
      // bumper-to-bumper chain. The physical reserve remains at a stop, so a red light still has
      // visible air between silhouettes instead of making a single slab across the shopfronts.
      headway: o.headway === undefined ? 1.10 + (V.length % 4) * .16 : o.headway,
      turns: !!o.turns, yaw: 0, xoff: 0, braking: false, brakeK: 0, still: !!o.still,
      keepOb: !!o.still, tag: o.tag,
      wheelR: o.wheelR || .32, rolled: 0, sol: null,
      parts: [], m0: [], slide: [], spin: [], head: [], tail: [], sign: [], ind: [], shadow: null,
    };
    V.push(v);
    if (lane.list) lane.list.push(v);
    return v;
  }

  // A part, in vehicle space: `fw` runs along the length toward the nose, `side` across it, `up` is
  // world height. The same frame js/street.js's own `car()` used, so the two are comparable.
  //
  // `ob` is dropped from everything that moves. It is the pick ray's hit box and it is frozen at
  // the build position, so a moving prop that kept one would swallow the cursor somewhere the car
  // no longer is — and worse, an untagged prop that is hit returns no thing at all, which would
  // have put a hole in the middle of the road through which the 红绿灯 could not be clicked.
  function put(v, kind, fw, up, side, len, hgt, wid, color, o = {}) {
    const s = Math.sin(v.base), c = Math.cos(v.base);
    const x = v.x0 + s * fw + c * side, z = v.z0 + c * fw - s * side;
    const opt = { ...o, ry: v.base };
    if (v.tag) opt.tag = v.tag;
    const p = kind === 'cap' ? S.cap(x, up, z, wid, hgt, len, color, opt)
            : kind === 'ball' ? S.ball(x, up, z, wid / 2, hgt / 2, len / 2, color, opt)
            : S.box(x, up, z, wid, hgt, len, color,
                    kind === 'hard' ? { ...opt, hard: true } : opt);
    if (!v.keepOb) delete p.ob;
    // `dynamic` selects the moving-detail cull as well as the updater. Every authored vehicle in
    // this release moves; retaining the generic `still` option must not silently downgrade a
    // future properly bayed vehicle's wheels or glazing.
    p.dynamic = true;
    v.parts.push(p); v.m0.push(Float32Array.from(p.m)); v.slide.push(0);
    return p;
  }


  // Writing on the vehicle. `face` is the panel's own yaw relative to the vehicle: 0 is the front,
  // -90° the kerb flank. Glyph TEXT is `mode: 1` with no glow of its own — the brief on emissive
  // glyphs is unambiguous, and the black blind behind it is what carries the light.
  function text(v, fw, up, side, face, str, o) {
    const s = Math.sin(v.base), c = Math.cos(v.base);
    for (const g of S.glyphs(v.x0 + s * fw + c * side, up, v.z0 + c * fw - s * side,
                             v.base + face, str, o)) {
      if (!v.keepOb) delete g.ob;
      g.dynamic = true;
      v.parts.push(g); v.m0.push(Float32Array.from(g.m)); v.slide.push(0);
      // A lit blind comes up with the hour but must never take the brake lights' pulse with it,
      // so it is its own group rather than being filed with the tail lamps.
      if (o.mode === 1) { g.g0 = o.glow || 0; v.sign.push(g); }
    }
  }

  // A real open wheel. Filled tyre/rim cylinders became grey-black pucks in the player-height
  // metro view; eight overlapping rubber arcs keep a continuous outline and leave daylight around
  // a small hub. Three spoke bars spin, while the tyre arcs only need the fleet's cheap translation.
  function wheel(v, fw, side, dia, tread) {
    const s = Math.sin(v.base), c = Math.cos(v.base);
    const N = 8, rr = dia * .43, tube = dia * .095;
    const seg = rr * 2 * Math.sin(Math.PI / N) * 1.15;
    for (let i = 0; i < N; i++) {
      const a = i * Math.PI * 2 / N;
      const pfw = fw + Math.cos(a) * rr, py = dia / 2 + Math.sin(a) * rr;
      const x = v.x0 + s * pfw + c * side, z = v.z0 + c * pfw - s * side;
      const p = S.cap(x, py, z, tube, seg, tube, TYRE,
        { ry: v.base, rx: -a, gloss: .20 });
      if (!v.keepOb) delete p.ob;
      p.dynamic = true;
      v.parts.push(p); v.m0.push(Float32Array.from(p.m)); v.slide.push(0);
    }
    const x = v.x0 + s * fw + c * side, z = v.z0 + c * fw - s * side;
    const hub = S.cyl(x, dia / 2, z, dia * .085, tread * .78, TRIM,
      { rz: HALF_PI, ry: v.base, gloss: .38 });
    if (!v.keepOb) delete hub.ob;
    hub.dynamic = true;
    v.parts.push(hub); v.m0.push(Float32Array.from(hub.m)); v.slide.push(0);
    for (let k = 0; k < 3; k++) {
      const phase = k * Math.PI / 3;
      const b = S.box(x, dia / 2, z, .032, tread * .82, dia * .64, SPOKE,
        { hard: true, rz: HALF_PI, ry: v.base, gloss: .44 });
      if (!v.keepOb) delete b.ob;
      b.dynamic = true;
      // Build the same T · Ry · Rz · Ry(phase) · S matrix that `place` writes. Without the final
      // phase on the paused first frame, all three spokes occupy one exact transform until the
      // traffic controller receives its first tick.
      b.m.set(M.mul(M.trans(x, dia / 2, z), M.mul(M.rotY(v.base),
        M.mul(M.rotZ(HALF_PI), M.mul(M.rotY(phase),
          M.scale(.032, tread * .82, dia * .64))))));
      v.spin.push({ p: b, fw, side, y: dia / 2, phase,
                    S: M.scale(.032, tread * .82, dia * .64),
                    a: new Float32Array(16), b: new Float32Array(16), c: new Float32Array(16) });
    }
  }

  // An emissive lamp, filed into one of the vehicle's lamp groups so the tick can bring the lot up
  // with the hour without knowing what any of them are attached to.
  function lamp(v, list, fw, up, side, len, hgt, wid, color, base) {
    const p = put(v, 'hard', fw, up, side, len, hgt, wid, color, { mode: 1, glow: base });
    p.g0 = base; list.push(p);
    return p;
  }


  // ---------------------------------------------------------------- 公交车 — the 623路
  //
  // Long, square, and the only vehicle out here with a job. Livery and route are kept the same as
  // the parked bus in js/street.js so that deleting that one does not change what the stop is for:
  // 623路 to 杨柳胡同, the route the 公交车站 sign and the `thing` on the shelter both already teach.
  function bus(lane, u) {
    // 11.455 × 2.82 × 3.22 m is the complete emitted envelope, not just the blue shell: destination
    // glyphs, folded/open door faces, marker lamps and both mirrors are inside it at every state.
    // The same longitudinal number drives following, stop-line, body-yield and collider sweeps.
    const v = vehicle(lane, { u, len: 11.455, wid: 2.82, hgt: 3.22,
                              v0: 6.4, dec: 2.4, acc: 1.0,
                              brake: 3.0, gapMin: 3.6, turns: true, wheelR: .49 });
    const BLUE = C('#2f7ea8'), CREAM = C('#e6e2d6'), SKIRT = C('#28323a'), BGLASS = TINT;
    v.isBus = true; v.state = 'run'; v.dwell = 0; v.doorK = 0; v.lap = 0; v.serving = true;
    // The straight run retains 19 cm each side. The eased 16 cm platform docking offset is allowed
    // only beside the protected island: the offside clearance grows to 35 cm while the kerb-side
    // door gap closes to a deliberate 20 cm. The emitted mirror and the conservative 2.82 m moving
    // collider retain three centimetres at dwell, enough for their shallow approach tangent never
    // to consume the platform's 1.50 m clear passenger strip.
    v.dockX = -.16;
    // The old bus was one cuboid with details pasted onto it. Two overlapping rounded
    // volumes now establish a lower waist and passenger cell, with a separate crowned roof.
    put(v, 'ball', 0, 1.17, 0, 10.92, 1.16, 2.30, BLUE, { mode: 7, gloss: .38 });
    put(v, 'ball', -.08, 2.16, 0, 10.72, 1.46, 2.24, BLUE, { mode: 7, gloss: .38 });
    put(v, 'ball', 0, 2.95, 0, 10.72, .28, 2.18, CREAM, { mode: 7, gloss: .28 });
    // Soft front/rear shoulder caps take the shed-like corners off the 2.30 m blue core; mirrors
    // and flank detail bring the audited published traffic envelope to 2.82 m.
    put(v,'ball',5.18,1.55,0,.76,1.56,2.20,BLUE,{mode:7,gloss:.36});
    put(v,'ball',-5.20,1.55,0,.72,1.52,2.18,BLUE,{mode:7,gloss:.36});
    // The skirt in three lengths with the arches as the gaps between them, the same trick the cars
    // use. Run as one 11 m band it covered the whole visible height of every wheel and the bus sat
    // on a black plinth with nothing turning under it.
    // The end segments stop 5 cm short of the body's own ends. Flush with them, the skirt's end
    // face and the body's end face were the same plane.
    for (const [fw, len] of [[5.00, 1.10], [0, 5.10], [-5.00, 1.10]])
      put(v, 'soft', fw, .44, 0, len, .58, 2.26, SKIRT, { gloss: .28 });
    for(const fw of [3.55,-3.55])
      put(v,'hard',fw,.56,0,1.18,.88,1.94,ARCH,{gloss:.08});
    // Glass: the screen, the back window, and two strips a side — not one, because the doors stand
    // exactly where an unbroken strip would be and two coplanar faces on the same plane is the
    // failure this project has paid for three times.
    put(v, 'hard', 5.60, 2.06, 0, .10, 1.30, 2.06, BGLASS, { gloss: .74 });
    put(v, 'hard', -5.60, 2.10, 0, .10, 1.10, 2.00, BGLASS, { gloss: .74 });
    // Split windscreen, wipers and rear centre mullion give both ends real scale.
    put(v,'hard',5.655,2.06,0,.035,1.31,.085,TRIM,{gloss:.34});
    put(v,'hard',-5.655,2.10,0,.035,1.11,.080,TRIM,{gloss:.34});
    for(const side of [-1,1])
      put(v,'hard',5.67,1.72,side*.38,.025,.035,.68,SPOKE,
        {rz:side*.28,gloss:.46});
    for (const side of [-1, 1]) {
      // Individual softly cornered panes replace the two black side slabs.  The kerb flank leaves
      // gaps for both working doors; the offside keeps the ordinary ten-window rhythm.
      const panes = side < 0
        ? [2.82, 1.75, .68, -.40, -2.65, -3.73, -4.76]
        : [4.42, 3.36, 2.30, 1.24, .18, -.88, -1.94, -3.00, -4.06, -5.02];
      for (const fw of panes) {
        const rake=fw>4.2?-.10:fw<-4.4?.10:0;
        put(v, 'hard', fw, 2.10, side * 1.155, .86, .80, .040, BGLASS,
          { rx:rake, gloss:.78 });
      }
      put(v, 'soft', 5.10, 2.46, side * 1.17, .22, .30, .30, TRIM, { gloss: .56 });
      for(const fw of [4.91,3.88,2.82,1.76,.70,-.36,-1.92,-3.20,-4.42])
        put(v,'hard',fw,2.10,side*1.180,.065,1.08,.035,TRIM,{gloss:.30});
      // Cream civic livery belt with the Beijing operator name in the paint.
      // Stand the belt 8 mm proud of the mullions. Their former shared outer plane made every
      // belt/mullion crossing coplanar; this offset also leaves the glyphs 9.5 mm off their host.
      put(v,'hard',-.30,1.46,side*1.188,8.70,.13,.035,CREAM,{gloss:.30});
      text(v,-.30,1.46,side*1.205,side*HALF_PI,'北京公交',
        {size:.135,gap:.030,color:TRIM,gloss:.16,lift:.010});
      // Long-stalked mirrors and black glass faces, tucked into the front corner.
      put(v,'hard',5.18,2.20,side*1.14,.38,.040,.16,TRIM,{gloss:.42});
      put(v,'ball',5.28,2.24,side*1.29,.22,.18,.20,TRIM,{mode:7,gloss:.56});
      put(v,'hard',5.28,2.24,side*1.395,.17,.12,.018,GLASS,{gloss:.82});
    }
    // 目的地牌. A bus with a blank front is not a bus in service, and the number on the blind is
    // what a passenger fifty metres up the pavement reads to decide whether to run for it.
    put(v, 'hard', 5.63, 2.74, 0, .12, .30, 2.10, S.col.black, { gloss: .28 });
    text(v, 5.69, 2.74, 0, 0, '623路',
      { size: .21, gap: .03, color: C('#f4c85e'), mode: 1, glow: .26, lift: .014 });
    // and again on the kerb flank by the front door, in the paint, where you read it from the stop
    put(v, 'hard', 3.60, 2.36, -1.17, 1.16, .42, .03, C('#eceae2'), { gloss: .24 });
    text(v, 3.60, 2.36, -1.195, -HALF_PI, '623',
      { size: .28, gap: .05, color: C('#1f2a33'), gloss: .14, lift: .012 });
    // 车门. Two doorways on the kerb side, two leaves each, sliding apart into the body. They open
    // only while the bus is actually standing at the stop, which is the whole reason a bus is not
    // a box with wheels.
    for (const dfw of [3.95, -1.55]) for (const s of [-1, 1]) {
      const slide=s*.60;
      put(v, 'hard', dfw + s * .33, 1.72, -1.160, .64, 2.06, .09, C('#3b4a55'), { gloss: .62 });
      v.slide[v.slide.length - 1] = slide;
      put(v,'hard',dfw+s*.33,2.04,-1.212,.49,1.14,.025,BGLASS,{gloss:.76});
      v.slide[v.slide.length-1]=slide;
      put(v,'hard',dfw+s*.52,1.58,-1.222,.032,.54,.022,SPOKE,{gloss:.48});
      v.slide[v.slide.length-1]=slide;
    }
    for (const fw of [3.55, -3.55]) for (const side of [-.91, .91])
      wheel(v, fw, side, .98, .30);
    for (const side of [-1, 1]) lamp(v, v.head, 5.62, .70, side * .90, .08, .22, .34, HEAD, .05);
    for (const side of [-1, 1]) lamp(v, v.tail, -5.62, .92, side * .92, .08, .26, .30, TAIL, .06);
    put(v,'hard',5.61,.38,0,.16,.28,2.20,TRIM,{gloss:.36});
    put(v,'hard',-5.61,.38,0,.16,.28,2.16,TRIM,{gloss:.36});
    put(v,'hard',5.70,.40,0,.055,.18,.52,PLATE_G,{gloss:.26});
    put(v,'hard',-5.70,.40,0,.055,.18,.52,PLATE_G,{gloss:.26});
    // Rear identity and engine ventilation break up the formerly blank blue end wall.  A route
    // blind, split glass, grille slats and tall lamp stacks are visible in the far-parade camera.
    put(v,'hard',-5.675,2.64,0,.035,.30,1.54,S.col.black,{gloss:.26});
    text(v,-5.705,2.64,0,Math.PI,'623路',
      {size:.175,gap:.028,color:C('#f4c85e'),mode:1,glow:.24,lift:.010});
    put(v,'hard',-5.682,1.26,0,.030,.36,1.44,SKIRT,{gloss:.26});
    for(const y of [1.14,1.26,1.38])
      put(v,'hard',-5.704,y,0,.012,.030,1.16,SPOKE,{gloss:.34});
    for(const side of [-1,1]) {
      lamp(v,v.tail,-5.705,1.31,side*.94,.025,.58,.16,TAIL,.07);
      lamp(v,v.ind,-5.708,.96,side*.94,.025,.13,.16,AMBER,.025);
    }
    // Two low-profile roof HVAC pods and marker lamps complete the Beijing city-bus silhouette.
    for(const fw of [-2.55,1.15])
      put(v,'ball',fw,3.13,0,1.30,.18,1.56,CREAM,{mode:7,gloss:.28});
    for(const end of [-1,1]) for(const side of [-1,1])
      lamp(v,v.sign,end*5.25,3.02,side*1.03,.08,.055,.16,AMBER,.035);
    // 转向灯. The bus indicates out of the stop before it moves, which is the one moment on this
    // road when a signal actually means something. A lamp on the offside corner alone would be
    // invisible from the pavement you are standing on, so it wears flank repeaters as well —
    // which is what a real one has and is the only part of it you can see from the shelter.
    for (const side of [-1, 1]) {
      lamp(v, v.ind, 5.05, .82, side * 1.14, .30, .14, .06, AMBER, 0);
      lamp(v, v.ind, -5.62, .70, side * .40, .08, .18, .26, AMBER, 0);
    }
    return v;
  }

  // ---------------------------------------------------------------- build the fleet
  //
  // Preserve a lane contract in each direction even though this intentionally sparse service
  // currently occupies only the west-side southbound lane. Both outside tracks belong to cycles.
  function lane(x, base, uStop, ring) {
    const L = { x, base, sgn: base ? -1 : 1, uStop, list: ring === false ? null : [] };
    if (ring !== false) LANES.push(L);
    return L;
  }
  const SB = lane(LANE_SB, 0, STOP_SB);                    // +z, west of the centre line
  lane(LANE_NI, Math.PI, -STOP_NB);                        // -z, inner, intentionally clear
  // All two-wheelers now belong to street-cycles.js. Keeping a second scooter controller here put
  // two incompatible rider rigs half a metre apart and let them overlap the refuge and each other.

  // One source-audited motor body: the rounded 623 route bus above. It starts well north of the
  // crossing, stays inside the west motor lane, and docks longitudinally against the protected
  // platform. The rejected compact-van and saloon silhouettes remain absent; cycles and the moped
  // provide the smaller independent rhythms without turning the road into a vehicle wall.
  bus(SB, -60);

  // ---------------------------------------------------------------- colliders
  // A vehicle you can walk through is worse than no vehicle at all. Each gets an axis-aligned solid
  // that follows it, held OPEN while it is moving faster than walking pace: a stopped queue and a
  // bus standing at its stop is something you have to walk round, and a moving bus is not
  // something a collider should be shoving the body sideways out of the way of.
  // Moving solids are born OPEN but already fitted to their visible frame-zero positions. This
  // preserves the no-shove rule while making emitted/declared/collision envelopes agree before the
  // first tick as well as at a dwell; a placeholder hundreds of metres away hid frame-zero drift.
  for (const v of V) {
    const z = v.sgn * v.u;
    v.sol = S.solid(v.x0 - v.wid * .5, v.x0 + v.wid * .5,
      z - v.len * .5, z + v.len * .5);
    v.sol.open = !v.still;
    v.shadow = S.shade(v.x0, z, v.wid * .92, v.len * .80, v.isBus ? .30 : .24);
  }

  // ---------------------------------------------------------------- 车灯 pools
  // One, shared, handed each frame to the route bus when its lights are on. Parked
  // underground at a millimetre across while it is daylight rather than merely faded to nothing:
  // an additive quad at alpha 0 still shades every pixel it covers, and this street's whole frame
  // cost is fill rate.
  for (let i = 0; i < 1; i++)
    POOLS.push(S.glow(M.trs(0, -60, 0, 0, .001, 1, .001), C('#ffe6c2'), 0));

  StreetFit['traffic'].state = { V, LANES, POOLS, SPAN, HALF, sm, emergencyActive:false };
  StreetFit['traffic'].propCount = S.props.length - p0;
};

// -------------------------------------------------------------------------------------------
// 动 — what moves.
//
// One pass a frame: the signal, then each lane's car-following, then the matrices. Nothing is
// allocated per frame. Turning vehicles and the one light pool reuse fixed scratch matrices.
StreetFit['traffic'].tick = (() => {
  // 红绿灯. Read the road district's signal contract instead of keeping a second, shorter cycle.
  // The visual lamps, pedestrian phase, bicycles and motor traffic now all use the same clock.
  const GREEN = 30, AMBER = 3, RED = 33, CYCLE = GREEN + AMBER + RED;
  let T = 0, last = -1;
  const HIDDEN = M.trs(0, -60, 0, 0, .001, 1, .001);
  const RZ90 = M.rotZ(Math.PI / 2);
  const sa = new Float32Array(16), sb = new Float32Array(16),
        sc = new Float32Array(16), sp = new Float32Array(16), sm4 = new Float32Array(16);
  const U_ORDER = (a, b) => a.u - b.u;
  const LAMP_ORDER = (a, b) => a.lampDist - b.lampDist;
  const nearLights = [];

  const roadSignal = () => {
    try {
      const r = StreetFit['road'];
      return r && r.signal && typeof r.signal.phase === 'function' ? r.signal : null;
    } catch (_) { return null; }
  };
  const phaseAt = t => {
    const r = roadSignal();
    if (r) return r.phase(t);
    const p = ((t % CYCLE) + CYCLE) % CYCLE;
    return p < GREEN ? 'green' : p < GREEN + AMBER ? 'amber' : 'red';
  };
  StreetFit['traffic'].signal = () => {
    const r = roadSignal();
    if (r) return { phase: r.phase(T), cycle: r.cycle, green: GREEN, amber: AMBER,
                    red: r.cycle - GREEN - AMBER, left: r.secs(T),
                    emergency: !!(r.emergency && r.emergency.active(T)) };
    const p = ((T % CYCLE) + CYCLE) % CYCLE;
    return { phase: phaseAt(T), cycle: CYCLE, green: GREEN, amber: AMBER, red: RED,
             left: p < GREEN ? GREEN - p : p < GREEN + AMBER ? GREEN + AMBER - p : CYCLE - p };
  };

  const smooth = u => { const k = u < 0 ? 0 : u > 1 ? 1 : u; return k * k * (3 - 2 * k); };
  // How far into the evening the lamps are. game.js brings the street's own lighting up at
  // `daylight(mins).day < 0.5`, which its keyframes put at about 19:00 and 06:30; this is the same
  // crossing written as a ramp, so headlights come on with the shop signs rather than after them.
  const dusk = h => h < 6.0 ? 1 : h < 7.1 ? 1 - smooth((h - 6.0) / 1.1)
                  : h < 18.2 ? 0 : h < 19.5 ? smooth((h - 18.2) / 1.3) : 1;

  // ---- one vehicle's speed for this frame. `gap` is clear road to whatever is in front, whether
  // that is the car ahead or a red light. The square-root law is the honest one — it hands back the
  // speed from which `dec` would still stop you in the room that is left — and it is what makes a
  // queue build backwards from the stop line by itself instead of having to be scripted.
  function drive(v, gap, dt) {
    // Keep a time-based reserve while rolling, then close to the authored physical gap as the queue
    // stops. A fixed reserve made every free-running pair settle at the same visible spacing.
    const reserve = v.gapMin + v.v * v.headway;
    const want = Math.min(v.v0, Math.sqrt(Math.max(0, 2 * v.dec * (gap - reserve))));
    const d = want - v.v;
    v.v += d > 0 ? Math.min(d, v.acc * dt) : Math.max(d, -v.brake * dt);
    if (v.v < 0) v.v = 0;
    v.braking = want < v.v - .06 || (v.v < .3 && gap < 8);
    // Braking has a finite rate, but penetration cannot. Cap this frame's travel to the physical
    // room that was measured before integrating, so a slow frame can never step through a leader
    // or a red-light stop line.
    const free = Math.max(0, gap - v.gapMin);
    const asked = v.v * dt, moved = Math.min(asked, free);
    if (moved + 1e-6 < asked) {
      v.v = dt > 0 ? moved / dt : 0;
      v.braking = true;
    }
    v.u += moved;
    v.rolled = (v.rolled + moved / v.wheelR) % (Math.PI * 2);
    // Lamps have filaments and LEDs have driver response; neither toggles between zero and full
    // intensity every time the following law hovers around its threshold. Attack quickly, release
    // more slowly, and keep the response independent of frame rate.
    v.brakeK += ((v.braking ? 1 : 0) - v.brakeK) *
      (1 - Math.exp(-(v.braking ? 10 : 5) * Math.max(0, dt)));
  }

  const STOP_U = -12.0;                              // the shelter, in the southbound lane's own u

  function step(dt, clockT, body) {
    const st = StreetFit['traffic'].state;
    const { V, LANES, SPAN, HALF } = st;
    T = Number.isFinite(clockT) ? clockT : T + dt;
    const sig = roadSignal();
    st.emergencyActive = !!(sig && sig.emergency && sig.emergency.active(T));
    const ph = phaseAt(T);
    const hold = ph !== 'green';

    for (const L of LANES) {
      if (L.list.length > 1) L.list.sort(U_ORDER);
      for (let i = 0; i < L.list.length; i++) {
        const v = L.list[i];
        if (v.still) continue;
        // The next thing ahead that is still in the lane. `aside` remains part of the generic ring
        // contract, although the protected-stop bus now stays in line and is deliberately followed.
        let lead = null;
        if (!(v.isBus && v.aside)) {
          for (let k = 1; k < L.list.length; k++) {
            const cand = L.list[(i + k) % L.list.length];
            if (cand === v) break;
            if (!cand.aside) { lead = cand; break; }
          }
        }
        let gap = 1e4;
        if (lead) {
          let du = lead.u - v.u;
          if (du <= 0) du += SPAN;                   // the car in front is round the loop
          gap = du - v.len / 2 - lead.len / 2;
        }
        // A body in the carriageway is a dynamic obstacle, not something a moving open collider may
        // ghost through. Measure it in this lane's own direction so either stream uses the same law.
        if (body && Number.isFinite(body.x) && Number.isFinite(body.z)) {
          const vx = v.x0 + v.xoff;
          if (Math.abs(body.x - vx) < v.wid * .5 + .40) {
            const bu = v.sgn * body.z, du = bu - v.u;
            if (du > -v.len * .5 - .5 && du < 38)
              gap = Math.min(gap, du - v.len * .5 - .36);
          }
        }
        // The bus now docks against a boarding island while remaining inside the motor lane. The
        // cycle stream runs behind the platform, so it is no longer a longitudinal leader for it.
        // The light, treated as a stationary obstacle parked on the stop line.
        if (hold && v.u < L.uStop) {
          const gs = L.uStop - v.u - v.len / 2;
          // Nobody in this city stands on the brakes for an amber they are already under.
          if (!(ph === 'amber' && gs < v.v * 1.5))
            // `drive` reserves gapMin for a leader. Offset that reserve here so the bumper comes to
            // rest 35 cm before the paint instead of 1.7 m back from it.
            gap = Math.min(gap, gs + v.gapMin - .35);
        }
        // and the bus's own stop, which is an obstacle it puts in front of itself. Written so that
        // the braking law's own resting point — gap === gapMin — lands the bus exactly on STOP_U.
        // Written as a plain distance to the stop it came to rest 3.2 m short of it, which is
        // 20 cm outside the window that starts the dwell, so the bus stood at the kerb with its
        // doors shut for the rest of the run and gridlocked the lane behind it.
        if (v.isBus) {
          if (v.state === 'stopping') gap = Math.min(gap, STOP_U + v.gapMin - v.u);
          else if (v.state === 'dwell' || v.state === 'pull') gap = -1;
        }
        drive(v, gap, dt);
        if (v.u > HALF) {
          v.u -= SPAN;
          // A new lap. The bus serves the stop every other one: this route loop is 240 m round, and
          // a bus in the stop every lap would read as a depot, not a service.
          if (v.isBus) { v.lap++; v.serving = v.lap % 2 === 0; v.state = 'run'; }
        }
      }
    }

    // ---- the 公交车's route.
    //
    // The stop is a protected in-lane platform stop. `bay` is the eased 16 cm docking state used by
    // the doors and dwell harness. The shift begins 48 m out and is rate-limited over 36 m: that
    // keeps the eleven-metre body's swept offside edge at the lane's 15 cm reserve rather than
    // making a short, visually subtle steering angle become a large rear-corner intrusion.
    for (const v of V) {
      if (!v.isBus) continue;
      if (v.state === 'run' && v.serving && v.u > STOP_U - 24 && v.u < STOP_U - 1)
        v.state = 'stopping';
      if (v.state === 'stopping' && v.v < .18 && v.u > STOP_U - 3.6 && v.bay > .96) {
        v.state = 'dwell'; v.dwell = 9.0;
      }
      if (v.state === 'dwell') {
        v.dwell -= dt;
        // open over a second and a quarter, shut again a second and a half before it goes
        v.doorK = v.dwell > 7.75 ? smooth((9.0 - v.dwell) / 1.25)
                : v.dwell > 1.5 ? 1 : smooth(v.dwell / 1.5);
        if (v.dwell <= 0) { v.state = 'pull'; v.doorK = 0; v.wait = 0; }
      } else if (v.state !== 'stopping') v.doorK = 0;
      // One second of indicator before departure. The bus never left the motor lane, so cars queue
      // behind it and there is no unsafe merge-gap search (or deadlock with that same queue) to do.
      if (v.state === 'pull') {
        v.wait += dt;
        if (v.wait >= 1.0) { v.state = 'merge'; v.mergeU = v.u; }
      }
      // Arm the dock state on a long approach and release it over the same measured distance.
      const want = !v.serving ? 0
        : v.state === 'stopping' ? 1
        : v.state === 'dwell' || v.state === 'pull' ? 1
        : v.state === 'merge' ? Math.max(0, 1 - (v.u - v.mergeU) / 36)
        : v.u > STOP_U - 48 && v.u < STOP_U ? smooth((v.u - (STOP_U - 48)) / 36) : 0;
      if (v.bay === undefined) v.bay = 0;
      // Rate limited per metre travelled, not per second, so the swing is a path and not a slide —
      // and so a bus standing still cannot move sideways at all.
      const ds = v.v * dt, rate = ds / 36;
      let nextBay = v.bay + Math.max(-rate, Math.min(rate, want - v.bay));
      let nextXoff = v.dockX * nextBay;
      v.bay = nextBay;
      const prev = v.xoff;
      v.xoff = nextXoff;
      // Heading off the path actually taken. Guarded: with ds at zero the quotient is meaningless,
      // and the bus is not turning anyway because the line above could not have moved it.
      const dxdu = ds > 1e-4 ? (v.xoff - prev) / ds : 0;
      const yawTarget = Math.asin(Math.max(-.22, Math.min(.22, dxdu))) * (v.base ? -1 : 1);
      // Ease the shallow dock tangent so the eleven-metre body never snaps between headings.
      v.yaw += (yawTarget - v.yaw) * (1 - Math.exp(-8 * Math.max(0, dt)));
      // This is an in-lane stop: the queue behind waits instead of overtaking through the opposing
      // lane. `aside` is deliberately never true.
      v.aside = false;
      if (v.state === 'merge' && v.u - v.mergeU >= 36 && v.bay < .01) v.state = 'run';
      const blink = (v.state === 'dwell' && v.dwell < 2.4)
                 || v.state === 'pull' || v.state === 'merge';
      for (const p of v.ind) p.glow = blink && (T % .8) < .45 ? .9 : 0;
    }
  }

  // ---- write the matrices. Two floats a part for anything going straight, one pivot multiply for
  // anything that is turning, and one rebuild per wheel for the spin.
  function place(v) {
    const z = v.sgn * v.u, x = v.x0 + v.xoff;
    const dx = v.xoff, dz = z - v.z0;
    const turning = v.turns && Math.abs(v.yaw) > 1e-4;
    if (turning) {
      M.trans(-v.x0, 0, -v.z0, sa);
      M.rotY(v.yaw, sb);
      M.mul(sb, sa, sc);
      M.trans(x, 0, z, sa);
      M.mul(sa, sc, sp);
    }
    const s = Math.sin(v.base), c = Math.cos(v.base);
    for (let i = 0; i < v.parts.length; i++) {
      const p = v.parts[i], m0 = v.m0[i], sl = v.slide[i] * (v.doorK || 0);
      if (turning) {
        let src = m0;
        if (sl) { sm4.set(m0); sm4[12] += s * sl; sm4[14] += c * sl; src = sm4; }
        M.mul(sp, src, p.m);
        p.cx = p.m[12]; p.cy = p.m[13]; p.cz = p.m[14];
      } else {
        // The rotation half of m0 never changes for a vehicle going straight, and p.m still holds
        // it from the frame the part was built on, so only the translation column is written.
        const m = p.m;
        m[12] = m0[12] + dx + s * sl; m[14] = m0[14] + dz + c * sl;
        p.cx = m[12]; p.cz = m[14];
      }
    }
    // wheels: T · Ry(heading) · Rz(90°) · Ry(rolled) · S
    const ry = v.base + v.yaw, cs = Math.cos(ry), sn = Math.sin(ry);
    for (const w of v.spin) {
      M.rotY(ry, w.a);
      M.mul(w.a, RZ90, w.b);
      M.rotY(v.rolled + (w.phase || 0), w.a);
      M.mul(w.b, w.a, w.c);
      M.mul(w.c, w.S, w.p.m);
      w.p.m[12] = x + sn * w.fw + cs * w.side;
      w.p.m[13] = w.y;
      w.p.m[14] = z + cs * w.fw - sn * w.side;
      w.p.cx = w.p.m[12]; w.p.cy = w.p.m[13]; w.p.cz = w.p.m[14];
    }
    if (v.shadow) {
      const m = v.shadow.m, ry0 = v.base + v.yaw, c0 = Math.cos(ry0), s0 = Math.sin(ry0);
      const sw = v.wid * .94, sd = v.len * .82;
      m[0] = c0 * sw; m[1] = 0; m[2] = -s0 * sw; m[3] = 0;
      m[4] = 0; m[5] = 1; m[6] = 0; m[7] = 0;
      m[8] = s0 * sd; m[9] = 0; m[10] = c0 * sd; m[11] = 0;
      m[12] = x; m[13] = .021; m[14] = z; m[15] = 1;
    }
    if (v.sol) {
      const c2 = Math.abs(cs), s2 = Math.abs(sn);
      const hw = (s2 * v.len + c2 * v.wid) / 2, hd = (c2 * v.len + s2 * v.wid) / 2;
      v.sol.x0 = x - hw; v.sol.x1 = x + hw;
      v.sol.z0 = z - hd; v.sol.z1 = z + hd;
      v.sol.open = v.v > .55;
    }
  }

  // ---- two affordances for the harnesses, and for anyone with the console open.
  //
  // `show(false)` drops the entire fleet eighty metres underground and stops the tick. It is here
  // because STREET.md makes `44-parade` a mandatory perf canary for anything that moves, and the
  // only honest way to measure what moving traffic costs on a fill-rate-bound street is to take the
  // same picture twice from the same camera in the same process, with the fleet and without it.
  // `Perf.frameMs` cannot be used for this headless: it rejects any frame longer than a stall, and
  // headless Chrome only runs a frame when a screenshot forces one, so the readout sits at whatever
  // it settled on before the harness took over and reports the same number for every shot.
  let hidden = false, parked = false;
  StreetFit['traffic'].show = on => { hidden = !on; };
  function bury(down) {
    const st = StreetFit['traffic'].state;
    if (!st) return;
    for (const v of st.V) {
      for (let i = 0; i < v.parts.length; i++) {
        const p = v.parts[i];
        p.m[13] = v.m0[i][13] - down; p.cy = p.m[13];
      }
      for (const w of v.spin) { w.p.m[13] = w.y - down; w.p.cy = w.p.m[13]; }
      if (v.sol) v.sol.open = down > 0;
      if (v.shadow) v.shadow.m[13] = down ? -80 : .021;
    }
    for (const g of st.POOLS) { g.a = 0; g.m.set(HIDDEN); }
  }

  // Step the whole road forward without waiting for frames. Headless Chrome only runs a frame when
  // a screenshot forces one, so a harness that wants a settled queue at the light cannot get one by
  // sleeping — it calls this.
  StreetFit['traffic'].sim = secs => {
    if (!StreetFit['traffic'].state) return;
    const n = Math.max(1, Math.round(secs * 30));
    for (let i = 0; i < n; i++) step(1 / 30);
    for (const v of StreetFit['traffic'].state.V) place(v);
  };

  const distTo = (v, px, pz) =>
    (v.x0 + v.xoff - px) ** 2 + (v.sgn * v.u - pz) ** 2;

  return (t, body, mins) => {
    const st = StreetFit['traffic'].state;
    if (!st) return;
    if (hidden !== parked) { parked = hidden; bury(hidden ? 80 : 0); }
    if (hidden) { last = t; return; }
    // The street only ticks while you are standing in it, so `t` jumps by however long you were
    // indoors. Clamped, or stepping back out of the 超市 teleports the whole fleet down the road.
    const dt = last < 0 ? 1 / 60 : Math.max(0, Math.min(1 / 15, t - last));
    last = t;
    step(dt, t, body);

    const night = dusk(mins === undefined ? 13 : (mins / 60) % 24);
    const { V, POOLS } = st;
    for (const v of V) {
      place(v);
      // A parked car does not sit at the kerb with its headlights on. Its tail lamps still pick up
      // a little, because that is what a reflector does and a wholly dark car at night is a hole.
      for (const p of v.head) p.glow = p.g0 + (v.still ? 0 : night * .70);
      for (const p of v.tail) p.glow = p.g0 + night * (v.still ? .12 : .30) + v.brakeK * .55;
      for (const p of v.sign) p.glow = p.g0 + night * .30;
    }

    // ---- the pool of light a headlight throws on the tarmac, passed round the two nearest
    // vehicles. Folded away entirely by day: see the note where they are built.
    if (night < .04) {
      for (const g of POOLS) if (g.a) { g.a = 0; g.m.set(HIDDEN); }
      return;
    }
    const px = body ? body.x : 0, pz = body ? body.z : 0;
    nearLights.length = 0;
    for (const v of V) if (v.head.length && !v.still) {
      v.lampDist = distTo(v, px, pz);
      nearLights.push(v);
    }
    nearLights.sort(LAMP_ORDER);
    for (let i = 0; i < POOLS.length; i++) {
      const v = nearLights[i], g = POOLS[i];
      if (!v) { g.a = 0; g.m.set(HIDDEN); continue; }
      const heading = v.base + v.yaw;
      const fx = Math.sin(heading), fz = Math.cos(heading);
      const reach = v.len / 2 + 3.6;
      const w = v.wid * 2.0, d = 8.4;
      // Write T * Ry * S into the pool's existing matrix. `M.trs` allocated four Float32Arrays
      // every night frame, and using `v.base` made a docking bus turn away from its own light pool.
      const m = g.m, c = Math.cos(heading), s = Math.sin(heading);
      m[0] = c * w; m[1] = 0; m[2] = -s * w; m[3] = 0;
      m[4] = 0; m[5] = 1; m[6] = 0; m[7] = 0;
      m[8] = s * d; m[9] = 0; m[10] = c * d; m[11] = 0;
      m[12] = v.x0 + v.xoff + fx * reach; m[13] = .026;
      m[14] = v.sgn * v.u + fz * reach; m[15] = 1;
      g.a = night * .24;
    }
  };
})();
