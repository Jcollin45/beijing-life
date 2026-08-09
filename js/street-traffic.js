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
// 1. **Two motor lanes, not six.** `RD1 - RD0` is 10 m. The corrected paint says: a 非机动车道 at
//    either kerb, one southbound motor lane, the double yellow, then one northbound motor lane.
//
// 2. **Dense and slow beats fast and sparse.** 25–30 km/h with cars closing on each other is the
//    picture; a clear road with three cars doing 60 is a motorway. So: short following distances, a
//    spread of desired speeds so the gaps open and shut, and one driver leaving twenty metres to
//    the car in front, because there is always one.
//
// 3. **The queue at the 红绿灯 is the density.** Traffic that respects the lights concentrates
//    itself exactly where you are standing to look at it, and then releases. That single rule does
//    more for how busy the road reads than another six cars would.
//
// 4. **The bus stops.** A 公交车 that drives past its own stop at a constant speed is scenery. This
//    one cuts across the bike lane to the kerb the way they do, opens its doors, dwells, indicates,
//    and pulls back out.
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
//     gloss and glow per instance, so four hundred-odd vehicle parts join batches that already
//     exist and cost their instance rows and nothing else. Colour is free; a new `round` would not
//     have been. The only unbatched props in here are the seven glyphs on the bus, which is what a
//     route number costs anywhere.
//   - **Cheaper than what it replaces.** street.js's `car()` is about 93 props for the saloon and
//     105 for the SUV — near 500 for its five, plus thirty for the parked bus. This whole moving
//     fleet, seventeen vehicles, comes in under that. Deleting the static five is a net reduction.
//   - **No point lights, and the light pools are recycled.** Only eight lights reach the shader and
//     the street's own lamps want them. Headlights are emissive geometry, which is per-instance and
//     free; the pools they throw on the tarmac are four `glow` quads passed round the four nearest
//     vehicles and folded away to a speck by day, because an additive quad at alpha 0 still costs
//     every pixel it covers.
//
// Matrices: a vehicle going straight gets two floats written per part per frame — m[12] and m[14]
// off a stored `m0` — rather than a 4×4 multiply. The ones that turn (the bus into its stop, the
// 电动车 weaving) build one pivot and multiply through it, the shape js/world.js's `moveRider` uses.
StreetFit['traffic'] = S => {
  const { C } = S;
  const HALF_PI = Math.PI / 2;
  const sm = u => { const k = u < 0 ? 0 : u > 1 ? 1 : u; return k * k * (3 - 2 * k); };

  // ---------------------------------------------------------------- the road, read off the paint
  // Anchored on the road district's measured contract. This is a two-lane motor road with a cycle
  // track on each side; the previous third motor lane was centred at x 36.30, directly in the east
  // cycle track.
  const MID = (S.RD0 + S.RD1) / 2;          // 32.5, the double yellow
  const ROAD_SIG = (() => {
    try { return StreetFit['road'] && StreetFit['road'].signal; } catch (_) { return null; }
  })();
  const LANE_SB = ROAD_SIG && ROAD_SIG.lanes ? ROAD_SIG.lanes.south : 31.35;
  const LANE_NI = ROAD_SIG && ROAD_SIG.lanes ? ROAD_SIG.lanes.north : 33.80;
  const BIKE_W = ROAD_SIG && ROAD_SIG.lanes ? ROAD_SIG.lanes.bikeW : 29.00;
  const BIKE_E = ROAD_SIG && ROAD_SIG.lanes ? ROAD_SIG.lanes.bikeE : 36.26;
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
  // z≈43). Recycle behind the fog at ±82 so no vehicle can teleport ten metres from a player at
  // either destination.
  const HALF = 82, SPAN = HALF * 2;

  // ---------------------------------------------------------------- colours
  // Ordinary Chinese city traffic: mostly white, silver, black and grey, with one 出租车 in it.
  // Colour is a per-instance value in the batch, so the whole spread is free.
  const GLASS = C('#242c34'), TINT = C('#39454f'), TYRE = C('#17191b'), SPOKE = C('#8d949a'),
        TRIM = C('#23282d'), ARCH = C('#14171a'),
        HEAD = C('#e4f1ff'), TAIL = C('#e0392a'), AMBER = C('#e8a02c'),
        PLATE_G = C('#2e7a45'), PLATE_B = C('#1f4f8f');
  const BODIES = [
    C('#e7e8e4'), C('#b7babe'), C('#22262b'), C('#5b6169'), C('#dcdde0'),
    C('#8fa3b0'), C('#d9dad4'), C('#6d3230'), C('#9aa0a4'), C('#2e3a4a'),
  ];

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
      // Staggered rolling starts avoid fourteen cars accelerating in mechanical lockstep.
      v: o.still ? 0 : v0 * initial, v0,
      len: o.len || 4.5, wid: o.wid || 1.85,
      dec: o.dec || 3.0, acc: o.acc || 1.7, brake: o.brake || 4.2, gapMin: o.gapMin || 1.7,
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
    // `dynamic` selects the moving-detail cull as well as the updater. The parked teaching car
    // keeps its pick collider, but must retain the same complete silhouette as the rolling fleet
    // instead of losing its wheels to the aggressive static-scenery fallback tier.
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

  // A wheel: the tyre, which is a cylinder and could not show that it was turning if it wanted to,
  // and one bright bar across the hub, which is the entire point. A car sliding along on static
  // wheels reads worse than a parked one. The bar's matrix is rebuilt whole every frame — it is the
  // only thing in the fleet whose rotation changes — so it stays out of the translate list.
  function wheel(v, fw, side, dia, tread) {
    const s = Math.sin(v.base), c = Math.cos(v.base);
    const x = v.x0 + s * fw + c * side, z = v.z0 + c * fw - s * side;
    const t = S.cyl(x, dia / 2, z, dia / 2, tread, TYRE, { rz: HALF_PI, ry: v.base, gloss: .18 });
    if (!v.keepOb) delete t.ob;
    t.dynamic = true;
    v.parts.push(t); v.m0.push(Float32Array.from(t.m)); v.slide.push(0);
    // One inset alloy dish on the visible outer face gives the tyre a wheel well, rim and hub
    // without adding six spoke instances to every wheel in the fleet.  The existing bright bar
    // still spins over it, so the vehicle retains the visual motion that the traffic audit relies
    // on while the wheel no longer reads as a black puck with a silver sticker through its centre.
    const out = Math.sign(side) || 1, rimSide = side + out * (tread * .52);
    const rx = v.x0 + s * fw + c * rimSide, rz = v.z0 + c * fw - s * rimSide;
    const rim = S.cyl(rx, dia / 2, rz, dia * .36, .022, SPOKE,
      { rz: HALF_PI, ry: v.base, gloss: .44 });
    if (!v.keepOb) delete rim.ob;
    rim.dynamic = true;
    v.parts.push(rim); v.m0.push(Float32Array.from(rim.m)); v.slide.push(0);
    const b = S.box(x, dia / 2, z, .085, tread * 1.6, dia * .62, SPOKE,
      { hard: true, rz: HALF_PI, ry: v.base, gloss: .42 });
    if (!v.keepOb) delete b.ob;
    b.dynamic = true;
    v.spin.push({ p: b, fw, side, y: dia / 2,
                  S: M.scale(.085, tread * 1.6, dia * .62),
                  a: new Float32Array(16), b: new Float32Array(16), c: new Float32Array(16) });
  }

  // An emissive lamp, filed into one of the vehicle's lamp groups so the tick can bring the lot up
  // with the hour without knowing what any of them are attached to.
  function lamp(v, list, fw, up, side, len, hgt, wid, color, base) {
    const p = put(v, 'hard', fw, up, side, len, hgt, wid, color, { mode: 1, glow: base });
    p.g0 = base; list.push(p);
    return p;
  }

  // ---------------------------------------------------------------- 汽车 — the saloon and the SUV
  //
  // Twenty-six props. The hull runs nearly the full length and closes the wheel arches from just
  // above the tyres; three fillers hang below it and the two GAPS between them ARE the arches. That
  // is js/street.js's own hard-won shape and it is right: sculpting a car from stacked horizontal
  // slabs gives a pile of shelves with daylight between them, and a body narrower than the track
  // gives four lugs and no visible wheels at all. The glasshouse is three slices stepped back and
  // up with a roof long enough to bury the top one — a short roof leaves the slices showing as flat
  // trays stacked on the boot lid, which is the trap that comment was written about.
  function car(lane, u, o = {}) {
    const tall = !!o.tall;
    const body = o.body || BODIES[V.length % BODIES.length];
    const lift = tall ? .15 : 0, dia = tall ? .72 : .64;
    const v = vehicle(lane, { u, len: 4.70, wid: 1.83, v0: o.v0, dec: o.dec, tag: o.tag,
                              gapMin: o.gapMin, wheelR: dia / 2, still: o.still });
    const HB = .48 + lift, HT = 1.02 + lift;         // hull bottom / top: fw -2.20 .. 2.22
    const FB = .22 + lift, FT = .50 + lift;          // filler bottom / top
    put(v, 'soft', .01, (HB + HT) / 2, 0, 4.42, HT - HB, 1.83, body, { gloss: .58 });
    put(v, 'soft', 0, (FB + FT) / 2, 0, 1.90, FT - FB, 1.80, body, { gloss: .58 });
    put(v, 'soft', 1.985, (FB + FT) / 2, 0, .53, FT - FB, 1.78, body, { gloss: .58 });
    put(v, 'soft', -1.985, (FB + FT) / 2, 0, .53, FT - FB, 1.78, body, { gloss: .58 });
    // Low ellipsoidal shoulder caps break the bonnet and boot out of the long centre slab.  They
    // overlap the hull rather than adding height, preserving the vehicle's exact traffic bounds.
    put(v, 'ball', 1.54, HT-.025, 0, 1.12, .24, 1.68, body,
      {mode:7,gloss:.58});
    put(v, 'ball', -1.58, HT-.015, 0, .82, .22, 1.64, body,
      {mode:7,gloss:.58});
    // The wheel house behind the tyre. With body colour showing in the corners of the arch the
    // opening read as a square notch cut in the flank with a wheel bolted on outside it; dark, and
    // the same corners become shadow between the tyre and the wing.
    for (const fw of [1.35, -1.35])
      put(v, 'hard', fw, .40 + lift, 0, dia + .12, .60, 1.42, ARCH, { gloss: .08 });
    // Every slice bites twenty millimetres into the one below it. Butted face to face they would be
    // coplanar, which is the failure that has taken this game down three times.
    put(v, 'ball', -.20, 1.245 + lift, 0, 2.55, .67, 1.68, GLASS,
      { mode: 7, gloss: .82 });
    put(v, 'ball', -.34, 1.505 + lift, 0, 1.82, .14, 1.64, o.roof || body,
      { mode: 7, gloss: .62 });
    // Explicit raked front/rear panes, a B-pillar and sill line make the stepped glasshouse read
    // as one cabin rather than three dark trays. Flush handles are deliberately thin and inset.
    put(v, 'hard', 1.02, 1.225+lift, 0, .075, .50, 1.50, GLASS,
      {rx:-.30,gloss:.84});
    put(v, 'hard', -1.19, 1.225+lift, 0, .075, .46, 1.46, GLASS,
      {rx:.38,gloss:.84});
    for(const side of [-1,1]) {
      put(v, 'hard', -.18, 1.24+lift, side*.855, .11, .48, .035, TRIM,
        {gloss:.30});
      put(v, 'hard', -.15, 1.005+lift, side*.875, 2.18, .035, .025, SPOKE,
        {gloss:.48});
      for(const fw of [.50,-.60])
        put(v, 'hard', fw, .88+lift, side*.920, .28, .035, .020, SPOKE,
          {gloss:.54});
    }
    // A muted driver silhouette on the left-hand window gives the cabin scale and occupancy without
    // turning every moving car into an unbatched transparent object.
    put(v, 'ball', .48, 1.255 + lift, -.875, .25, .27, .035, C('#b78a6d'),
      { mode: 7, gloss: .10 });
    put(v, 'hard', .30, 1.055 + lift, -.878, .38, .30, .024, C('#303b47'),
      { gloss: .08 });
    // Bumpers. Each is pushed back far enough to bite into both the hull and the filler behind it:
    // a bumper hung off the very end of the nose floats a hand clear of the car with daylight
    // between, which is exactly how the first pass of this read from the far pavement.
    // FB + .16 and .34 deep, not FB + .15 and .30: at .30 the bumper's underside landed on exactly
    // the same plane as the filler's, and two faces on one plane is the failure this project has
    // paid for three times. Bracketing the filler top and bottom cannot be coplanar with either.
    put(v, 'hard', 2.28, FB + .16, 0, .16, .34, 1.72, TRIM, { gloss: .38 });
    put(v, 'hard', -2.30, FB + .16, 0, .16, .34, 1.66, TRIM, { gloss: .38 });
    for(const end of [-1,1]) for(const side of [-1,1])
      put(v, 'ball', end*2.25, FB+.17, side*.69, .18, .24, .34, TRIM,
        {mode:7,gloss:.38});
    // 车灯. One slim daytime-running strip a side at the top of the nose, which is what every new
    // Chinese car has, and a full-width bar across the tail, which is what every one of them has at
    // the other end. Both are the emissive thing you can see from the alley after dark. Both are
    // set INTO the panel they sit on rather than onto its face, for the same reason as the bumpers.
    for (const side of [-1, 1])
      lamp(v, v.head, 2.24, HT - .18, side * .58, .08, .09, .50, HEAD, .05);
    lamp(v, v.tail, -2.22, HT - .13, 0, .10, .10, 1.52, TAIL, .06);
    // 车牌. Green is a new-energy plate and blue an ordinary one. Half this fleet is electric,
    // which in this city is if anything conservative.
    const plate=(V.length % 2) ? PLATE_G : PLATE_B;
    put(v, 'hard', -2.405, FB + .17, 0, .07, .14, .44, plate,{ gloss: .26 });
    put(v, 'hard',  2.385, FB + .17, 0, .07, .14, .44, plate,{ gloss: .26 });
    // Mirrors, on stalks that reach back INTO the flank. Hung off `side * 1.00` they stood fifteen
    // millimetres clear of a body whose half-width is .915 and floated beside the doors.
    for (const side of [-1, 1]) {
      put(v, 'soft', 1.05, 1.04 + lift, side * .92, .20, .10, .22, TRIM, { gloss: .60 });
      put(v, 'hard', 1.05, 1.04+lift, side*1.035, .15, .065, .018, GLASS,
        {gloss:.82});
      put(v, 'hard', 1.17, .99+lift, side*.885, .13, .032, .10, TRIM,
        {gloss:.44});
    }
    for (const fw of [1.35, -1.35]) for (const side of [-.79, .79]) wheel(v, fw, side, dia, .20);
    // 出租车 roof sign, lit whether or not it is dark: a cab showing its light is a cab that is free.
    // In `sign`, not `tail`, or it would flash every time the driver touched the brakes.
    if (o.taxi) {
      lamp(v, v.sign, .10, 1.545 + lift, 0, .52, .15, .22, AMBER, .34);
      // Beijing cabs carry a pale roof, a narrow belt and 出租 on the illuminated roof box.
      for(const side of [-1,1]) {
        put(v,'hard',-.05,.83+lift,side*.925,2.88,.075,.022,o.roof||AMBER,
          {gloss:.42});
        text(v,.10,1.55+lift,side*.125,side*HALF_PI,'出租',
          {size:.070,gap:.014,color:TRIM,gloss:.18,lift:.006});
      }
    }
    return v;
  }

  // ---------------------------------------------------------------- 面包车 — compact city van
  // One fleet slot uses a Wuling-like high-roof van silhouette.  It keeps the saloon's exact
  // 4.70 x 1.83 traffic envelope and speed contract; only the compound geometry is different.
  function van(lane,u,o={}) {
    const body=o.body||BODIES[(V.length+3)%BODIES.length], dia=.68;
    const v=vehicle(lane,{u,len:4.70,wid:1.83,v0:o.v0,dec:o.dec,tag:o.tag,
      gapMin:o.gapMin,wheelR:dia/2,still:o.still});
    // Low rocker, tall passenger cell and a separate dropped bonnet make a small van rather than
    // a saloon stretched upward.  All volumes overlap so no daylight opens between stacked parts.
    put(v,'soft',0,.63,0,4.40,.72,1.83,body,{gloss:.54});
    put(v,'soft',-.38,1.26,0,3.25,.82,1.76,body,{gloss:.54});
    put(v,'ball',1.73,.91,0,1.08,.46,1.75,body,{mode:7,gloss:.54});
    put(v,'soft',-.42,1.72,0,3.22,.14,1.73,body,{gloss:.58});
    // Shadowed wheel houses remain behind the tyres rather than painting square black notches on
    // top of the body.  A slim central rocker joins them below the sliding doors.
    for(const fw of [1.38,-1.38])
      put(v,'hard',fw,.43,0,dia+.13,.57,1.42,ARCH,{gloss:.08});
    put(v,'hard',0,.28,0,1.70,.23,1.69,TRIM,{gloss:.28});
    // Raked windscreen, rear glass and three separately framed side windows.
    put(v,'hard',1.27,1.33,0,.075,.64,1.51,GLASS,{rx:-.18,gloss:.84});
    put(v,'hard',-2.04,1.32,0,.070,.58,1.47,GLASS,{gloss:.82});
    for(const side of [-1,1]) {
      for(const [fw,len] of [[.63,.73],[-.30,.78],[-1.25,.74]])
        put(v,'hard',fw,1.35,side*.885,len,.52,.035,GLASS,{gloss:.82});
      for(const fw of [.18,-.80,-1.68])
        put(v,'hard',fw,1.34,side*.902,.075,.64,.030,TRIM,{gloss:.28});
      // Sliding-door track, shut line and inset pull handle.
      put(v,'hard',-.72,.94,side*.913,1.70,.035,.025,SPOKE,{gloss:.46});
      put(v,'hard',-.20,.64,side*.918,.028,.52,.022,TRIM,{gloss:.24});
      put(v,'hard',-.96,.91,side*.930,.28,.045,.018,SPOKE,{gloss:.52});
      // Stalked side mirror with a real glass face.
      put(v,'hard',1.20,1.20,side*.86,.18,.035,.12,TRIM,{gloss:.42});
      put(v,'ball',1.10,1.25,side*.99,.18,.12,.18,TRIM,{mode:7,gloss:.58});
      put(v,'hard',1.10,1.25,side*1.085,.14,.075,.016,GLASS,{gloss:.82});
    }
    // Roof pressings and a compact rear HVAC blister add scale without a bulky roof rack.
    for(const fw of [-1.42,-.65,.12,.78])
      put(v,'soft',fw,1.805,0,.035,.035,1.54,SPOKE,{gloss:.38});
    put(v,'ball',-1.48,1.82,0,.52,.11,.70,TRIM,{mode:7,gloss:.36});
    // Shaped bumpers, corner lamps and Chinese plates front and rear.
    put(v,'hard',2.28,.36,0,.18,.30,1.68,TRIM,{gloss:.36});
    put(v,'hard',-2.30,.36,0,.18,.30,1.64,TRIM,{gloss:.36});
    for(const side of [-1,1]) {
      lamp(v,v.head,2.25,.76,side*.58,.075,.17,.42,HEAD,.05);
      lamp(v,v.tail,-2.26,.84,side*.64,.075,.24,.30,TAIL,.06);
      lamp(v,v.ind,2.27,.59,side*.75,.070,.10,.16,AMBER,.025);
    }
    const plate=(V.length%2)?PLATE_G:PLATE_B;
    put(v,'hard',2.385,.37,0,.065,.14,.44,plate,{gloss:.26});
    put(v,'hard',-2.405,.37,0,.065,.14,.44,plate,{gloss:.26});
    for(const fw of [1.38,-1.38]) for(const side of [-.79,.79]) wheel(v,fw,side,dia,.20);
    return v;
  }

  // ---------------------------------------------------------------- 公交车 — the 623路
  //
  // Long, square, and the only vehicle out here with a job. Livery and route are kept the same as
  // the parked bus in js/street.js so that deleting that one does not change what the stop is for:
  // 623路 to 杨柳胡同, the route the 公交车站 sign and the `thing` on the shelter both already teach.
  function bus(lane, u) {
    const v = vehicle(lane, { u, len: 11.2, wid: 2.30, v0: 6.4, dec: 2.4, acc: 1.0,
                              brake: 3.0, gapMin: 2.8, turns: true, wheelR: .49 });
    const BLUE = C('#2f7ea8'), CREAM = C('#e6e2d6'), SKIRT = C('#28323a'), BGLASS = TINT;
    v.isBus = true; v.state = 'run'; v.dwell = 0; v.doorK = 0; v.lap = 0; v.serving = true;
    put(v, 'soft', 0, 1.74, 0, 11.2, 2.14, 2.30, BLUE, { gloss: .38 });
    put(v, 'soft', 0, 2.92, 0, 10.9, .26, 2.22, CREAM, { gloss: .28 });
    // Soft front/rear shoulder caps take the shed-like corners off the main volume without
    // changing the bus's published 11.2 x 2.55 traffic envelope.
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
      put(v, 'hard', 1.75, 2.10, side * 1.155, 3.40, 1.02, .05, BGLASS, { gloss: .74 });
      put(v, 'hard', -3.75, 2.10, side * 1.155, 2.80, 1.02, .05, BGLASS, { gloss: .74 });
      put(v, 'soft', 5.10, 2.46, side * 1.17, .22, .30, .30, TRIM, { gloss: .56 });
      for(const fw of [.55,1.55,2.55,-2.75,-3.70,-4.65])
        put(v,'hard',fw,2.10,side*1.180,.075,1.08,.035,TRIM,{gloss:.30});
      // Cream civic livery belt with the Beijing operator name in the paint.
      put(v,'hard',-.30,1.46,side*1.180,8.70,.13,.035,CREAM,{gloss:.30});
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

  // ---------------------------------------------------------------- 三轮车 — the delivery trike
  // 快递三轮: the boxed electric three-wheeler that carries most of what this city buys. Slow,
  // kerbside, and the reason the nearside lane never runs at the speed of the one beside it.
  function trike(lane, u) {
    const v = vehicle(lane, { u, len: 2.85, wid: 1.16, v0: 4.7, dec: 2.6, acc: 1.1,
                              brake: 3.4, gapMin: 1.3, wheelR: .27 });
    const BOX = C('#2f6f4f'), FRAME = C('#3a4046');
    put(v, 'soft', -.62, .92, 0, 1.62, 1.00, 1.14, BOX, { gloss: .30 });
    put(v, 'soft', -.62, 1.45, 0, 1.66, .08, 1.18, C('#e6e2d6'), { gloss: .24 });
    // Cargo-door reveal, rounded roof cap and high-visibility corner tape make this recognisably
    // a Beijing 快递 trike instead of a green crate carried by three wheels.
    put(v,'hard',-1.445,.93,0,.035,.76,.92,C('#285d44'),{gloss:.24});
    put(v,'hard',-1.468,.93,0,.018,.62,.045,SPOKE,{gloss:.44});
    for(const side of [-1,1]) {
      put(v,'hard',-1.47,.72,side*.38,.020,.42,.075,AMBER,{mode:1,glow:.025});
      text(v,-.62,1.00,side*.585,side*HALF_PI,'快递',
        {size:.18,gap:.045,color:C('#f3efe2'),gloss:.12,lift:.008});
    }
    put(v,'ball',-.62,1.49,0,1.45,.14,1.08,C('#e6e2d6'),{mode:7,gloss:.24});
    put(v, 'soft', .74, 1.04, 0, .78, 1.16, .96, FRAME, { gloss: .42 });
    put(v, 'hard', 1.12, 1.30, 0, .06, .52, .82, TINT, { gloss: .74 });
    put(v,'hard',.72,1.31,-.49,.62,.48,.025,TINT,{gloss:.72});
    for(const side of [-1,1]) {
      put(v,'hard',.98,1.46,side*.42,.22,.030,.12,FRAME,{gloss:.42});
      put(v,'ball',1.02,1.49,side*.51,.14,.11,.15,FRAME,{mode:7,gloss:.54});
      put(v,'hard',1.02,1.49,side*.59,.10,.07,.014,GLASS,{gloss:.80});
    }
    put(v, 'hard', .10, .42, 0, 2.60, .18, 1.06, FRAME, { gloss: .36 });
    put(v, 'cap', .84, 1.74, 0, .40, .58, .34, C('#31527a'), { gloss: .12 });
    put(v, 'ball', .86, 2.06, 0, .26, .30, .26, C('#c39a76'), { gloss: .10 });
    put(v, 'hard', 1.00, 1.45, 0, .05, .05, .78, FRAME, { gloss: .48 });
    // Eyes and a mouth are vehicle parts, not world props, so the face stays attached when the
    // trike moves and turns.
    for (const side of [-1, 1])
      put(v, 'ball', 1.005, 2.09, side * .045, .026, .032, .026, C('#241b18'), { gloss: .10 });
    put(v, 'hard', 1.010, 2.025, 0, .020, .012, .070, C('#7f443d'), { gloss: .08 });
    lamp(v, v.head, 1.36, .42, 0, .10, .16, .22, HEAD, .05);
    lamp(v, v.tail, -1.45, .98, 0, .08, .10, .70, TAIL, .07);
    put(v,'hard',1.39,.25,0,.10,.17,.66,TRIM,{gloss:.34});
    put(v,'hard',-1.49,.28,0,.10,.18,.90,TRIM,{gloss:.34});
    put(v,'hard',-1.55,.53,0,.045,.13,.36,PLATE_B,{gloss:.25});
    put(v,'ball',1.05,.48,0,.62,.12,.34,FRAME,{mode:7,gloss:.32});
    for(const side of [-.50,.50])
      put(v,'ball',-.95,.50,side,.64,.12,.27,FRAME,{mode:7,gloss:.32});
    wheel(v, 1.05, 0, .54, .14);
    for (const side of [-.50, .50]) wheel(v, -.95, side, .54, .16);
    return v;
  }

  // ---------------------------------------------------------------- build the fleet
  //
  // One motor lane each way, with the spread of desired speeds providing the opening and closing
  // gaps that a second lane used to fake. Both outside tracks belong to bicycles and mopeds.
  function lane(x, base, uStop, ring) {
    const L = { x, base, sgn: base ? -1 : 1, uStop, list: ring === false ? null : [] };
    if (ring !== false) LANES.push(L);
    return L;
  }
  const SB = lane(LANE_SB, 0, STOP_SB);                    // +z, west of the centre line
  const NI = lane(LANE_NI, Math.PI, -STOP_NB);             // -z, inner
  const PARK = lane(38.80, Math.PI, 0, false);              // legal-direction kerbside parking
  // All two-wheelers now belong to street-cycles.js. Keeping a second scooter controller here put
  // two incompatible rider rigs half a metre apart and let them overlap the refuge and each other.

  // Southbound: six cars/vans plus the bus. The bus is born beyond the visible crossing rather than
  // as an eleven-metre solid laid across the zebra while it accelerates from rest.
  car(SB, -78, { v0: 7.4, body: BODIES[0] });
  bus(SB, -60);
  car(SB, -38, { v0: 6.8, body: BODIES[3] });
  car(SB, -20, { v0: 7.9, body: BODIES[6] });
  van(SB, 13, { v0: 6.2, body: BODIES[9] });
  car(SB, 35, { v0: 8.2, body: BODIES[1] });
  car(SB, 59, { v0: 7.5, tall: true, body: BODIES[8] });
  // northbound, with the 出租车 in it
  car(NI, -74, { v0: 8.6, body: BODIES[2] });
  car(NI, -50, { v0: 8.0, body: C('#243a5e'), roof: C('#c9a24a'), taxi: true });
  car(NI, -26, { v0: 8.8, body: BODIES[4] });
  car(NI, -8, { v0: 7.6, tall: true, body: BODIES[5] });
  // Somebody always leaves too much room. A low `dec` is a driver who brakes early, which in this
  // model is exactly a driver sitting twenty metres off the car in front while everybody behind
  // them closes right up.
  car(NI, 16, { v0: 7.0, dec: 1.2, gapMin: 3.4, body: BODIES[7] });
  car(NI, 42, { v0: 8.2, body: BODIES[1] });
  van(NI, 67, { v0: 7.0, body: BODIES[9] });

  // One deliberately parked teaching car keeps 车 interactive without leaving a frozen vehicle
  // in a live lane. It faces the same -z direction as the adjacent east-side traffic and leaves a
  // walkable strip behind it on the broad pavement.
  car(PARK, 11.60, { v0: 0, still: true, tag: '车', body: BODIES[3] });
  S.thing('车', 38.80, 1.25, -11.60, '这辆车停在路边。',
    'This car is parked at the side of the road.',
    '车 chē means a vehicle. You also see it in 自行车, 电动车 and 公交车.',
    { focus: [40.20, -11.60], reach: 2.5, tag: '车' });

  // ---------------------------------------------------------------- colliders
  // A vehicle you can walk through is worse than no vehicle at all. Each gets an axis-aligned solid
  // that follows it, held OPEN while it is moving faster than walking pace: a stopped queue and a
  // bus standing at its stop are things you have to walk round, and a car doing 25 km/h is not
  // something a collider should be shoving the body sideways out of the way of.
  // Born open and nowhere. A solid is live from the moment `finish` collects it, and the tick that
  // gives it its real bounds does not run until the first frame in the street — so eighteen boxes
  // sitting at (0, 0) with `open: false` would have been eighteen invisible colliders stacked on the
  // paving outside your own front door for however long that took.
  for (const v of V) {
    const z = v.sgn * v.u;
    v.sol = v.still
      ? S.solid(v.x0 - v.wid * .5, v.x0 + v.wid * .5, z - v.len * .5, z + v.len * .5)
      : S.solid(0, 0, -900, -900);
    v.sol.open = !v.still;
    v.shadow = S.shade(v.x0, z, v.wid * .92, v.len * .80, v.isBus ? .30 : .24);
  }

  // ---------------------------------------------------------------- 车灯 pools
  // Four, shared, handed each frame to the four nearest vehicles with their lights on. Parked
  // underground at a millimetre across while it is daylight rather than merely faded to nothing:
  // an additive quad at alpha 0 still shades every pixel it covers, and this street's whole frame
  // cost is fill rate.
  for (let i = 0; i < 4; i++)
    POOLS.push(S.glow(M.trs(0, -60, 0, 0, .001, 1, .001), C('#ffe6c2'), 0));

  StreetFit['traffic'].state = { V, LANES, POOLS, SPAN, HALF, sm };
};

// -------------------------------------------------------------------------------------------
// 动 — what moves.
//
// One pass a frame: the signal, then each lane's car-following, then the matrices. Nothing is
// allocated per frame except the pivot for the three vehicles that turn and the four light pools.
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
                    red: r.cycle - GREEN - AMBER, left: r.secs(T) };
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
    const want = Math.min(v.v0, Math.sqrt(Math.max(0, 2 * v.dec * (gap - v.gapMin))));
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

  const cycleState = () => {
    try { return StreetFit['cycles'] && StreetFit['cycles'].state; } catch (_) { return null; }
  };

  // Clear road from the bus's nose to a rider already using the kerbside track. Once the bus is
  // laterally clear of the motor lane, cyclists — not cars in the old lane — become its leaders.
  function busCycleGap(v) {
    const cs = cycleState();
    if (!cs) return Infinity;
    const bx = v.x0 + v.xoff, bz = v.sgn * v.u;
    let best = Infinity;
    for (const q of cs.all) {
      if (q.stowed || q.lane.axis !== 'z') continue;
      const turnSweep = v.isBus ? .62 : 0;
      if (Math.abs(q.px - bx) > v.wid * .5 + q.wide + .32 + turnSweep) continue;
      const du = (q.pz - bz) * v.sgn;
      if (du < -v.len * .5 || du > 34) continue;
      const gap = du - (v.len + q.len) * .5;
      if (gap < best) best = gap;
    }
    return best;
  }

  // Swept lateral envelope for pulling into the stop. A rider beside the bus owns the bike lane;
  // the bus holds its current line until that envelope is empty instead of sliding through them.
  function busCycleSweepClear(v, nextXoff) {
    const cs = cycleState();
    if (!cs) return true;
    const x0 = v.x0 + v.xoff, x1 = v.x0 + nextXoff, bz = v.sgn * v.u;
    // A turning eleven-metre body sweeps its nose roughly 0.6 m outside the straight sidewall.
    const turnSweep = .62;
    const left = Math.min(x0, x1) - v.wid * .5 - .24 - turnSweep;
    const right = Math.max(x0, x1) + v.wid * .5 + .24 + turnSweep;
    for (const q of cs.all) {
      if (q.stowed || q.lane.axis !== 'z') continue;
      if (q.px + q.wide < left || q.px - q.wide > right) continue;
      if (Math.abs(q.pz - bz) < (v.len + q.len) * .5 + .90) return false;
    }
    return true;
  }

  function step(dt, clockT, body) {
    const st = StreetFit['traffic'].state;
    const { V, LANES, SPAN, HALF } = st;
    T = Number.isFinite(clockT) ? clockT : T + dt;
    const ph = phaseAt(T);
    const hold = ph !== 'green';

    for (const L of LANES) {
      if (L.list.length > 1) L.list.sort(U_ORDER);
      for (let i = 0; i < L.list.length; i++) {
        const v = L.list[i];
        if (v.still) continue;
        // The next thing ahead that is still IN the lane. Anything that has pulled aside — which is
        // the bus, in its bay — has to be seen through, or the queue that builds behind a bus at a
        // stop it has already got out of the way for is a queue for no reason.
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
        if (v.isBus && v.bay > .02) gap = Math.min(gap, busCycleGap(v));
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
          // A new lap. The bus serves the stop every other one: this route is 92 m round, and a bus
          // in the stop twice a minute is a depot, not a service.
          if (v.isBus) { v.lap++; v.serving = v.lap % 2 === 0; v.state = 'run'; }
        }
      }
    }

    // ---- the 公交车's route.
    //
    // The bay is a state variable that eases toward a target, not a function of `u`. As a function
    // of `u` the bus came back out of the stop on a fixed ramp whether or not there was anything
    // coming, and since traffic overtakes it while it is out of the lane, it merged straight into
    // the side of whatever had just passed it. A bus waits for a gap. So does this one, and while
    // it waits it drives on up the bike lane with its indicator going, which is precisely what they
    // do and is the most recognisable thing a Beijing bus does apart from stopping.
    for (const v of V) {
      if (!v.isBus) continue;
      if (v.state === 'run' && v.serving && v.u > STOP_U - 48 && v.u < STOP_U - 1)
        v.state = 'stopping';
      if (v.state === 'stopping' && v.v < .18 && v.u > STOP_U - 3.6) {
        v.state = 'dwell'; v.dwell = 9.0;
      }
      if (v.state === 'dwell') {
        v.dwell -= dt;
        // open over a second and a quarter, shut again a second and a half before it goes
        v.doorK = v.dwell > 7.75 ? smooth((9.0 - v.dwell) / 1.25)
                : v.dwell > 1.5 ? 1 : smooth(v.dwell / 1.5);
        if (v.dwell <= 0) { v.state = 'pull'; v.doorK = 0; v.wait = 0; }
      } else if (v.state !== 'stopping') v.doorK = 0;
      // Is there room to rejoin? Nothing in the lane from fifteen metres back to nine ahead. There
      // is deliberately no forced timeout: merging through a car after an arbitrary wait is still
      // a collision. The bus remains stopped in its bay until the ring opens a safe gap.
      if (v.state === 'pull') {
        v.wait += dt;
        let clear = true;
        for (const o of v.lane.list) {
          if (o === v || o.aside) continue;
          let du = o.u - v.u;
          if (du > HALF) du -= SPAN; else if (du < -HALF) du += SPAN;
          const envelope = (v.len + o.len) * .5;
          if (du < 0) {
            const rearGap = -du - envelope;
            const closing = Math.max(0, o.v - v.v);
            if (rearGap < 8 + closing * 3.8) { clear = false; break; }
          } else {
            const frontGap = du - envelope;
            if (frontGap < 9 + v.v * 1.6) { clear = false; break; }
          }
        }
        // Cyclists queue behind the bus while it occupies their track. A rider beside or just ahead
        // must clear before the bus starts across; riders already stopped behind do not deadlock it.
        const cs = cycleState();
        if (clear && cs) {
          const bz = v.sgn * v.u;
          for (const q of cs.all) {
            if (q.stowed || q.lane.axis !== 'z') continue;
            const dz = (q.pz - bz) * v.sgn;
            if (Math.abs(q.px - (v.x0 - 1.2 * v.sgn)) < 2.2 && dz > -2.0 && dz < 13) {
              clear = false; break;
            }
          }
        }
        if (clear) { v.state = 'merge'; v.mergeU = v.u; }
      }
      // Where it wants to be, across the 非机动车道: hard against the kerb from the approach until
      // it has somewhere to go, and back out on a long, shallow swing once it has.
      const want = !v.serving ? 0
        : v.state === 'stopping' ? smooth((v.u - (STOP_U - 48)) / 40)
        : v.state === 'dwell' || v.state === 'pull' ? 1
        : v.state === 'merge' ? 1 - smooth((v.u - v.mergeU) / 40)
        : v.u > STOP_U - 26 && v.u < STOP_U ? smooth((v.u - (STOP_U - 26)) / 18) : 0;
      if (v.bay === undefined) v.bay = 0;
      // Rate limited per metre travelled, not per second, so the swing is a path and not a slide —
      // and so a bus standing still cannot move sideways at all.
      const ds = v.v * dt, rate = ds / 25;
      let nextBay = v.bay + Math.max(-rate, Math.min(rate, want - v.bay));
      let nextXoff = -2.42 * nextBay * v.sgn;
      if (nextBay > v.bay && !busCycleSweepClear(v, nextXoff)) {
        nextBay = v.bay;
        nextXoff = v.xoff;
      }
      v.bay = nextBay;
      const prev = v.xoff;
      v.xoff = nextXoff;
      // Heading off the path actually taken. Guarded: with ds at zero the quotient is meaningless,
      // and the bus is not turning anyway because the line above could not have moved it.
      const dxdu = ds > 1e-4 ? (v.xoff - prev) / ds : 0;
      const yawTarget = Math.asin(Math.max(-.22, Math.min(.22, dxdu))) * (v.base ? -1 : 1);
      // A cyclist can pause the lateral sweep for one step. The path remains collision-authority,
      // but the long bus no longer snaps perfectly straight for that frame and back on the next.
      v.yaw += (yawTarget - v.yaw) * (1 - Math.exp(-8 * Math.max(0, dt)));
      // Out of the lane, and therefore not something the queue behind has to wait for.
      // Rejoin the motor following order as soon as the physical envelopes overlap, not after most
      // of the lateral swing is already complete.
      v.aside = v.bay > .94;
      if (v.state === 'merge' && v.u - v.mergeU >= 40 && v.bay < .01) v.state = 'run';
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
      M.rotY(v.rolled, w.a);
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
    for (const g of st.POOLS) { g.a = 0; g.m = HIDDEN; }
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

    // ---- the pool of light a headlight throws on the tarmac, passed round the four nearest
    // vehicles. Folded away entirely by day: see the note where they are built.
    if (night < .04) {
      for (const g of POOLS) if (g.a) { g.a = 0; g.m = HIDDEN; }
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
      if (!v) { g.a = 0; g.m = HIDDEN; continue; }
      const fx = Math.sin(v.base + v.yaw), fz = Math.cos(v.base + v.yaw);
      const reach = v.len / 2 + 3.6;
      const w = v.wid * 2.0, d = 8.4;
      g.m = M.trs(v.x0 + v.xoff + fx * reach, .026, v.sgn * v.u + fz * reach, v.base,
                  Math.abs(fz) * w + Math.abs(fx) * d, 1, Math.abs(fz) * d + Math.abs(fx) * w);
      g.a = night * .24;
    }
  };
})();
