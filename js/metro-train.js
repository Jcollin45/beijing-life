// 🚆 Train car interior — The car: seat run, grab poles, interior ads, strip map, sliding doors, destination blind — AND passengers, which it has never had
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    the car at z = 4.25 (CARZ)
//   camera  96-train, 96-interior (new)
//
// The car: seat run, grab poles, interior ads, strip map, sliding doors, destination blind — AND
// passengers, which it has never had. TAG EVERY INTERIOR PROP `地铁` OR IT WILL NOT TRAVEL, and
// tag nothing that stays on the platform. That is the metro's one load-bearing rule.
//
// WHAT THE SHELL ALREADY BUILT, so that nothing here is built twice (js/metro.js, "地铁 the
// train"): the floor slab, the far wall, the roof and its lit tube, ONE undivided 12.2 m bench
// along the far wall, eleven floor-to-ceiling poles, a small strip map and two ads on the far
// wall, the flank panels with their exterior glazing and livery, the ten sliding door leaves and
// their frames, and the destination blind with the four slots `setStation` writes the terminus
// into. **The sliding leaves and the blind belong to the shell** — a leaf takes two transforms,
// the car's and its own, and anything of this zone's stuck to one would travel with the car and
// then stand still while the door opened. Everything below is fixed to the car's shell, never to
// a leaf.
//
// The camera IS the acceptance test, and the metro's shots are stronger than any other scene's:
// many carry a `pre` block that drives the REAL machinery — Metro.tick, Metro.openGate,
// Metro.placeTrain, g.tickStation — so a passing shot is a passing state machine, not just a
// pretty picture. Render yours with `node .audit.js 96-train`, open the PNG, and look at it.
// A zone whose code boots but whose shot is black, empty or unchanged has not shipped.
//
// ---------------------------------------------------------------------------------------------
// THE m0 RULE — metro-specific, load-bearing, and the one that has no equivalent elsewhere
//
// `setStation(hz)` rewrites signs, floor inlays, the map ring and the exit in place, and `tick`
// moves flaps, boards and the train. All of that works off a REST MATRIX captured after the scene
// finishes building. If your zone adds a prop that will later be rewritten or moved, register it:
//
//     A.rest(myProp);
//
// ...or the shell will fight it and it will snap back to a matrix nobody meant. Props tagged
// `地铁` are collected automatically — that is how the car interior travels with the train.
// Tag interior props `地铁`; never tag anything that stays on the platform.
//
// EVERY prop below goes through `bx`, `cy`, `cp` or `say`, and those four are the only places in
// this file that call a builder. All four stamp `tag:'地铁'` themselves and push what they made
// onto `MINE`, so there is no way to add geometry to this zone and forget the tag. The failure
// this file exists to avoid is a seat run hanging in mid-air over the track after the train has
// pulled out, and the way to make it impossible is to remove the opportunity to type the tag
// wrongly rather than to remember to type it. `MetroFit['train'].census()` hands the list back so
// a harness can check it against `api.props.filter(p => p.tag === '地铁')` instead of by eye.
//
// Nothing here calls `A.rest`. `rest` is for props a zone moves or rewrites ITSELF; everything in
// the car is moved by the shell's own `placeTrain`, off the `m0` it captures from the `地铁` tag.
// The only per-frame writes below are `color` and `glow` on the strip-map dots, and neither of
// those touches a matrix or the cull data derived from one.
//
// And nothing here is tagged that stays behind. This zone builds nothing outside the car: no
// platform prop, no screen-door glass (the Doors agent's 屏蔽门 leaves are one zone over), no
// trackside (the Track agent's). The whole of it lives between x ±6.30 and z 3.43 .. 5.03.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET — read this before you add anything
//
// The metro is one of the healthiest scenes in the game: ~10.9 ms a frame (90+ fps) with 1,590
// props. It is thin on CONTENT, not on performance, and fifteen agents filling it is exactly how
// that changes. Your budget is **160 props** — lower than the airport's, because this room is a
// third of the size and you are much closer to everything in it.
//
//   * Props BATCH by mesh + mode + corner radius + bevel + textures. Twenty identical seats are
//     one draw call. Twenty seats in twenty colours are STILL one draw call — colour, gloss,
//     alpha and glow travel per instance. Vary those freely; they are free.
//   * ANYTHING TRANSLUCENT (alpha < 0.999) DOES NOT BATCH, one draw call each, because batching
//     reorders drawing and transparency depends on order. Screen doors and chiller glass earn it;
//     budget **8** and no more.
//   * Glyphs DO batch now (as of 2026-08-04 the atlas cell became a per-instance attribute — the
//     street went from 978 glyph draws a frame to two batches). Real Chinese on every sign is
//     cheap, and this is a game about reading Chinese. Use real characters everywhere.
//   * A distinct `round`, `bevel`, `mat` or `matScale` value starts a NEW batch. Pick one tile
//     scale and one concrete scale and stay with them.
//   * If you tick, allocate NOTHING per frame and write matrices in place.
//
// Check yourself: `node .fpscheck.js metro` must stay under 16.7 ms median. Take your own baseline
// BEFORE you build — the machine varies run to run. If your zone pushes it over, say so in your
// report rather than shipping it quietly.
//
// THIS ZONE SPENDS ZERO OF THE TRANSLUCENT BUDGET, and the temptation was real: the interior face
// of the flank is exactly where you would reach for glass. It does not need any. A window seen
// from inside a train that is underground looks at a tunnel wall 40 cm away, so the honest
// material is an opaque near-black panel in a bright frame — which reads as glazing, batches with
// every other hard box in the room, and costs one draw call for all six of them together. The
// shell's exterior panes keep their alpha; nothing added here has one.
//
// ---------------------------------------------------------------------------------------------
// PASSENGERS — the expensive half of this file, and why the head count is a constant
//
// A person is not a prop. Props batch; a figure is 50–113 draws before batching, and while the
// collector batches them down to about twenty calls whatever the crowd, each body still pays for
// its own posing every frame — gaitPose, activityPose, traitPose, saccade — and its own
// triangles. Profiling the shopping centre put 38% of the whole frame in figure work. The car is
// never more than 12 m from the camera and `Perf.q.npcFar` is 62 m, so nothing in here is ever
// culled by distance; the frustum test in `npcRange` is the only relief there is.
//
// So the head count is a constant, EIGHT, and it sits ON TOP of the crowd agent's twenty-six.
// The two are kept apart by construction rather than by agreement:
//
//   * this file's people carry NO `commuter` flag, and that is not tidiness. `.stationcheck.js`
//     measures the station's crowd with `NPCS.filter(n => n.commuter)`, and — the one that would
//     actually have broken something — the `97g-boarding` shot spins the simulation until
//     `n.commuter && n.awake && !n.riding && n.z > EDGEZ - .2 && n.z < WALK.carZ - .3` is true of
//     somebody. The near bench below sits at z 3.62, which is inside that window. A passenger of
//     mine carrying `commuter` would satisfy the predicate on the first iteration, the loop would
//     break before anyone had walked a step, and the crowd agent's boarding canary would quietly
//     become a photograph of a stationary platform.
//   * they are awake only while the car is at the platform. `npcAwake` reads `n.hours` before
//     anything else, so the tick swings `hours` between [0,24] and [0,0] as the train comes and
//     goes. The car is in the tunnel for 39 minutes of every hour, and eight figures posed inside
//     a shut carriage nobody can see into is 39 minutes an hour of figure work for nothing.
//
// They ride the train the same way the props do and for the same reason — except that an NPC is
// not in `api.props` and cannot be collected by tag, so the tick writes `n.x = x0 + train.x` from
// the same `trainAt(clock)` the shell is about to place the car with, in the same frame, one
// statement before it does. `updateNPCs` runs BEFORE `scene.tick` and `drawNPCs` after it
// (js/game.js:3853, :8171, :8579), so the write lands between the two and there is never a frame
// where a passenger and the seat under them disagree.
//
// `n.wait` is topped up every frame instead of the waypoint being moved. `updateNPCs` takes the
// `n.wait > 0` branch before it ever measures the distance to the target, so a body that is
// always waiting never walks, never spins `n.ground` up, and keeps its `activityPose` — which
// only applies under `want === 0 && n.ground < 0.10`. Chasing a moving waypoint instead would
// have the whole carriage jogging up the aisle after the train it is already sitting in.
// ---------------------------------------------------------------------------------------------

// The car's own numbers, and every one of them derived from the shell's contract rather than
// measured off a screenshot. Kept outside the builder because the tick and the roster both read
// them, and the roster is folded into NPCS at page load — long before a station exists.
const MetroTrain = (() => {
  const HALF = 6.30;                 // the car runs x -6.30 .. 6.30
  const CARZ = 4.25;
  const FRONT = CARZ - .85;          // 3.40, centre of the flank the doors are in
  const BACK = CARZ + .82;           // 5.07, centre of the far wall
  const NEARW = FRONT + .036;        // 3.436, its INNER face — everything builds out from here in +z
  const FARW = BACK - .046;          // 5.024, the far wall's inner face
  const FLOORY = .10;                // top of the car's floor slab: 6 cm above the platform
  const TUBEY = 2.50;                // underside of the ceiling's lit tube, which the rails hang off
  // The spans of solid flank between the door openings, and the door centres. Taken from the
  // shell's own PANELX/DOORX rather than recomputed: a panel list that disagreed with the one the
  // wall was built from would hang a window over a doorway.
  const PANELX = [[-6.30, -5.79], [-4.45, -3.23], [-1.89, -.67], [.67, 1.89],
                  [3.23, 4.45], [5.79, 6.30]];
  const DOORX = [-5.12, -2.56, 0, 2.56, 5.12];
  const WIDE = PANELX.filter(([a, b]) => b - a > .9);      // the four you can seat anybody in
  const ENDS = [PANELX[0], PANELX[PANELX.length - 1]];     // the two 51 cm ends: 爱心专座

  // One seat pitch for the whole car — 0.61, which is the pitch every other seat run in this game
  // uses and, not by coincidence, comfortably clear of the 0.45 m `.sitcheck.js` calls two people
  // in one seat. The pans top out at 0.56, which is 0.46 above the car's own floor and where a
  // metro bench actually is. `SEATY` is that 0.46 and is what the roster hands the pose, because
  // `seatY` is measured from the feet and the feet are on the car floor, not on the platform.
  const PITCH = .61, PAN_TOP = .56, SEATY = PAN_TOP - FLOORY;
  const FAR_Z = BACK - .29;                    // centre of the far bench's cushions
  const NEAR_Z = NEARW + .225;                 // centre of the near bench's cushions
  const SIT_FAR_Z = BACK - .27, SIT_NEAR_Z = NEARW + .19;   // where the hips go on each

  // Eight blues off one blue. A carriage of one colour repeated twenty times is a shelf with a
  // stripe painted on it; eight mouldings that have faded differently is a train. Colour is a
  // per-instance attribute, so all twenty-two cushions plus the two priority ones are still one
  // draw call however many of these there are.
  const SEATC = ['#2f5f88', '#33668f', '#2b587e', '#356b93', '#2e6285', '#31628b',
                 '#2a5479', '#376d97'];

  return { HALF, CARZ, FRONT, BACK, NEARW, FARW, FLOORY, TUBEY, PANELX, DOORX, WIDE, ENDS,
           PITCH, PAN_TOP, SEATY, FAR_Z, NEAR_Z, SIT_FAR_Z, SIT_NEAR_Z, SEATC,
           MINE: [],           // every prop this file made, in build order — the tagging proof
           DOTS: [],           // the strip-map dots, five doors' worth of seven
           PAX: [],            // { n, x0, z0 } — a passenger and where they sit when berthed
           HRS_ON: [0, 24], HRS_OFF: [0, 0],   // swung by the tick; see npcAwake
           hereIx: -1 };       // which station the lit dot is showing
})();

// The three colours a dot on the strip map is ever painted. Resolved once at load rather than
// every time the station changes, and out here because `C` lives in js/gl.js and `col` lives
// inside metro.js's closure where the tick cannot reach it.
const MetroDot = { here: C('#c74533'), past: C('#9c9890'), ahead: C('#2f6392') };

MetroFit['train'] = A => {
  const { box, cyl, cap, glyphs } = A;
  const { C, G, col } = A;
  const T = MetroTrain;

  // THE TAG, IN FOUR PLACES AND NOWHERE ELSE. Every builder call in this zone goes through one of
  // these, none of them can be called without stamping `地铁`, and all of them record what they
  // made. See the header: the point is that there is no second place to get it wrong.
  T.MINE.length = 0; T.DOTS.length = 0;
  const keep = p => { T.MINE.push(p); return p; };
  const bx = (x, y, z, sx, sy, sz, c, o) => keep(box(x, y, z, sx, sy, sz, c, { ...o, tag: '地铁' }));
  const cy = (x, y, z, r, h, c, o) => keep(cyl(x, y, z, r, h, c, { ...o, tag: '地铁' }));
  const cp = (x, y, z, sx, sy, sz, c, o) => keep(cap(x, y, z, sx, sy, sz, c, { ...o, tag: '地铁' }));
  const say = (x, y, z, yaw, text, o) => {
    const g = glyphs(x, y, z, yaw, text, { ...o, tag: '地铁' });
    for (const p of g) T.MINE.push(p);
    return g;
  };

  // Two facings, and getting them the wrong way round is the one mistake in here that leaves no
  // trace at all: a quad is single-sided, so writing on the near wall at yaw π is not a mirrored
  // sign, it is nothing. The near wall's inner face looks toward +z, which is yaw 0. The far
  // wall's looks toward -z, which is yaw π.
  const NEARYAW = 0, FARYAW = Math.PI;

  // ================================================================ 座位 the seat runs
  // The shell built one bench, along the far wall, as a single 12.2 m slab of blue. That is the
  // right shape for a carriage seen through a doorway from four metres away and the wrong one for
  // a carriage seen from inside, which is what 96-interior is: a bench with no divisions in it is
  // a shelf, and what makes a metro bench read as seats is that a person's width is drawn on it.
  // So the slab stays and gains a run of cushions laid on top at the 0.61 pitch, 2 cm proud.
  //
  // There is a second reason, and it is a harness rather than a picture. `.sitcheck.js` asks, of
  // every NPC with a seated `act`, whether there is a prop of seat height under the hips — and it
  // throws out anything over 2.5 m across first, because a floor slab whose top happens to land
  // at half a metre contains every spot in the room and would pass everybody. The shell's bench
  // is 12.2 m long. Seating anybody on it as built reports NO SEAT, and reports it correctly: as
  // far as that harness can tell there is no seat there, only a wall of blue.
  const farSeatX = [];
  for (let k = 0; k < 20; k++) {
    const x = -5.795 + k * T.PITCH;
    farSeatX.push(x);
    bx(x, T.PAN_TOP - .05, T.FAR_Z, .56, .10, .44, C(T.SEATC[k % T.SEATC.length]),
       { hard: true, mode: 7, gloss: G.fabric });
  }

  // The near bench: two seats in each of the four wide spans of flank, which is the only place on
  // this side there is any wall to put a back against — the other four metres of it is doorway.
  // Beijing runs seats down both sides of a car between the doors, and this side had none, which
  // from inside read as one bench facing a blank grey partition twelve metres long.
  const nearSeatX = [];
  for (const [x0, x1] of T.WIDE) {
    const cx = (x0 + x1) / 2, w = x1 - x0;
    for (const s of [-1, 1]) {
      const x = cx + s * T.PITCH / 2;
      nearSeatX.push(x);
      bx(x, T.PAN_TOP - .05, T.NEAR_Z, .56, .10, .44,
         C(T.SEATC[(nearSeatX.length * 3) % T.SEATC.length]),
         { hard: true, mode: 7, gloss: G.fabric });
    }
    // One moulded back per span rather than one per seat, because the back of a metro bench is a
    // single pressing and the divisions are in the pan. Kept under 60 cm of nothing and over 15 cm
    // of nothing in the other axis on purpose: `.sitcheck.js` reads a slab 0.28–0.60 by 0.15–0.45
    // standing 0.60–0.95 up as a BUILT-IN SEATED FIGURE and would report the passenger in front of
    // it as sitting inside somebody. 1.20 by 0.07 is a backrest by that test and by the eye both.
    bx(cx, .82, T.NEARW + .042, w - .02, .58, .07, C('#28527a'),
       { hard: true, mode: 7, gloss: G.fabric });
  }

  // 爱心专座 the priority seats, one at each end of the car past the outermost door — which is
  // where every line in Beijing puts them, and in a different colour, which is the whole of how
  // they are recognised at a glance. The end spans are 51 cm of flank and take exactly one each.
  for (const [x0, x1] of T.ENDS) {
    const cx = (x0 + x1) / 2;
    bx(cx, T.PAN_TOP - .05, T.NEAR_Z, .46, .10, .44, C('#9a3f36'),
       { hard: true, mode: 7, gloss: G.fabric });
    bx(cx, .82, T.NEARW + .042, .48, .58, .07, C('#7e332c'),
       { hard: true, mode: 7, gloss: G.fabric });
    // The sticker over it: four characters at 7 cm on a red ground, which is what the decal on a
    // Beijing priority seat is. 爱心专座 has been sitting in js/vocab.js since the intercity train
    // was built with nothing anywhere in the world saying it.
    bx(cx, 1.34, T.NEARW + .010, .44, .27, .008, C('#b4453b'),
       { hard: true, mode: 1, glow: .12 });
    say(cx, 1.34, T.NEARW + .017, NEARYAW, '爱心专座',
        { size: .072, gap: .016, color: col.white, mode: 1, glow: .10 });
  }

  // ================================================================ 车窗 the windows, from inside
  // The shell glazes the OUTSIDE of the flank — `carWindows`, the band a passing train lights from
  // behind one panel at a time. Those quads face -z, out at the platform, so from inside the car
  // the flank was twelve metres of undifferentiated grey with a bench in front of it.
  //
  // Same band and the same height as the exterior glazing, so the two agree if a wide shot ever
  // catches both, built on the inner face and facing +z. Opaque, for the reason in the header.
  //
  // 30 cm narrower than the span it is set into, not 12, and that 15 cm of bare flank at each end
  // is not margin — it is the door pillar, and it is the only place left on this wall for the
  // 当心夹手 and 报警 below. A window and an advert sized to the full panel leave a carriage with
  // nowhere to put the two things every Chinese carriage has beside a door.
  // The four wide spans only. The two 51 cm ends would take a 21 cm slot of a window, which is a
  // letterbox rather than a window, and the end of a carriage is a solid panel in real stock
  // anyway — it is where the priority seat and its decal go, three lines up.
  const PIER = .30;
  for (const [x0, x1] of T.WIDE) {
    const cx = (x0 + x1) / 2, w = x1 - x0;
    bx(cx, 2.14, T.NEARW + .010, w - PIER, .86, .010, col.steelP, { hard: true, gloss: .34 });
    bx(cx, 2.14, T.NEARW + .018, w - PIER - .10, .74, .008, C('#1e242a'),
       { hard: true, mode: 1, gloss: .55 });
  }

  // ================================================================ 广告 what is in the frames
  // The band between the seat backs and the window sills, which is where a Chinese carriage keeps
  // its advertising and where this one kept none. Two characters and a four-character line each,
  // because at 1.1 m across seen down the length of a car that is what survives — a paragraph of
  // body copy here is a grey smear.
  //
  // All four are invented, as everything on a wall in this game has to be. A metro carriage is
  // nothing but branding, so these are four businesses that do not exist: a tea, a noodle shop, a
  // pair of shoes and a night school. The night school is the one that earns its place — 夜校招生
  // on the wall of a commuter train is a specific thing about this city at this hour.
  const ADS = [['#1d5f6b', '云茶', '清心一口'],
               ['#8a3a2c', '好面', '一碗到底'],
               ['#2f6b3d', '竹风', '走遍全城'],
               ['#2b3f63', '学堂', '夜校招生']];
  T.WIDE.forEach(([x0, x1], i) => {
    const cx = (x0 + x1) / 2, w = x1 - x0;
    const [c, head, strap] = ADS[i % ADS.length];
    bx(cx, 1.43, T.NEARW + .010, w - PIER - .02, .52, .008, C(c),
       { hard: true, mode: 1, glow: .13 });
    say(cx, 1.55, T.NEARW + .017, NEARYAW, head,
        { size: .17, gap: .05, color: col.white, mode: 1, glow: .12 });
    say(cx, 1.28, T.NEARW + .017, NEARYAW, strap,
        { size: .068, gap: .020, color: col.cream, mode: 1, glow: .06 });
  });

  // ================================================================ 线路图 over every door
  // The strip map, in the one place a Chinese carriage puts it: the head of each door opening, so
  // it is read standing with your back to the seats waiting to get off. Seven dots for the seven
  // stations on this line, the one you are standing in picked out in red, the ones behind you
  // greyed and the ones ahead in the line's own blue — and the tick swings it as `setStation`
  // moves the room from one stop to the next. It is the only thing in the car that knows where it
  // is, and a route diagram that showed the same dot lit at every station would be a decoration.
  //
  // Fourteen centimetres of height between the top of the door opening and the underside of the
  // roof, so there is no room for names at this size — and a dot row with a lit position is what
  // the real one is legible as from inside the car anyway. The names are on the platform's map,
  // one zone over.
  const N_STOP = A.STATIONS.length;
  const MAPW = 1.16, dotStep = MAPW / (N_STOP - 1);
  T.DOORX.forEach((dx) => {
    bx(dx, 2.485, T.NEARW + .008, 1.26, .125, .008, col.white,
       { hard: true, mode: 1, glow: .08 });
    bx(dx, 2.485, T.NEARW + .014, MAPW, .020, .006, col.blue, { hard: true, mode: 1 });
    const row = [];
    for (let k = 0; k < N_STOP; k++)
      row.push(cy(dx - MAPW / 2 + k * dotStep, 2.485, T.NEARW + .020, .024, .008,
                  col.blue, { rx: Math.PI / 2, mode: 1 }));
    T.DOTS.push(row);
  });
  // No 二号线 caption under these, and the reason is worth writing down because it was here and
  // came out again. There is no WALL at a door opening — the flank spans stop either side of it —
  // so the card above the head of the door is a panel hanging in a hole, which is what a real one
  // is and reads correctly as a solid box. A line of text under it is a bare single-sided quad
  // with nothing behind it, floating in the doorway at 2.32 m with the platform visible through
  // the gap around every character. The shell already writes 二号线 on the far wall of the car
  // (metro.js, the strip map over the centre door), so the line number is said once, on a surface
  // that exists.

  // ================================================================ 扶手 and 吊环
  // What you actually hold on to, of which the car had one third: eleven floor-to-ceiling poles
  // and nothing overhead at all. A metro without a rail down the length of it and a row of handles
  // swinging off it is a metro nobody stands up in, and 高峰 in this city is a car with more
  // people standing than sitting.
  //
  // Two rails, one over each bench, hung off the ceiling tube rather than off the poles: the poles
  // are on the centre line at z 4.07 and a rail brought out to a bench from there would cross the
  // aisle diagonally. `rz` turns the capsule's long axis from +y onto x — in `Build.transform` the
  // rotation is applied before the scale, so the length still goes in `sy`.
  const RAILY = 1.98, RAILZ = [T.NEARW + .51, T.FARW - .52];
  for (const rz of RAILZ) {
    cp(0, RAILY, rz, .024, 11.90, .024, col.chrome, { rz: Math.PI / 2, gloss: G.metal });
    // Stopped at the tube rather than at the roof: the lit strip is 4 cm of ceiling at 2.50 to
    // 2.54 running z 3.80 to 4.90, and both rails are under it, so a dropper carried up to the
    // roof slab would stand inside the light.
    for (const x of [-4.2, 4.2])
      cp(x, (RAILY + T.TUBEY) / 2, rz, .018, T.TUBEY - RAILY, .018, col.chrome,
         { gloss: G.metal });
  }

  // 吊环. Eight of them along the near rail at an uneven spacing, because a row of handles at a
  // dead-regular pitch is a fence. Two props each — the webbing strap and the grip. The grip is a
  // short horizontal bar rather than a ring, which is what the newer stock on this line carries,
  // and — the practical half — a ring with enough boxes in it to have a hole is five props apiece,
  // and forty props of handle in a carriage is the whole budget spent on jewellery.
  for (const x of [-5.35, -4.28, -3.05, -1.92, .58, 1.74, 2.96, 5.28]) {
    bx(x, 1.855, RAILZ[0], .026, .22, .012, col.cream,
       { hard: true, mode: 7, gloss: G.fabric });
    cp(x, 1.735, RAILZ[0], .022, .13, .022, col.charcoal, { rz: Math.PI / 2, gloss: .30 });
  }

  // ================================================================ the small print
  // Both of these go on a PIER — the 15 cm of bare flank the window and the advert above and
  // beside them were shortened to leave. Written as `panel edge minus a margin` rather than as a
  // number read off a screenshot, because the two numbers that decide where the pier is are the
  // panel's own end and `PIER`, and a hand-typed x drifts the moment either of them moves.
  //
  // 报警, the emergency handle every carriage in the country carries beside the last door and this
  // one did not: on the pier at the +x end of the outermost wide panel, at the height a hand goes
  // for it. `4.45` is where that panel stops and the last doorway starts.
  bx(4.45 - .08, 1.62, T.NEARW + .010, .13, .26, .010, C('#a83a2e'),
     { hard: true, mode: 1, glow: .18 });
  say(4.45 - .08, 1.62, T.NEARW + .018, NEARYAW, '报警',
      { size: .052, gap: .010, color: col.white, mode: 1, glow: .12, vertical: true });
  // 当心夹手 down the pier of the centre door, which is the doorway 96-train looks straight into.
  // Another headword that has been in js/vocab.js since the intercity train was built, with
  // nothing anywhere in the world saying it.
  bx(-.67 - .08, 1.74, T.NEARW + .010, .12, .40, .008, col.yellow,
     { hard: true, mode: 1, glow: .10 });
  say(-.67 - .08, 1.74, T.NEARW + .017, NEARYAW, '当心夹手',
      { size: .056, gap: .014, color: col.charcoal, mode: 1, vertical: true });

  // ================================================================ 乘客 where the eight sit
  // Worked out here rather than written into the roster, because the roster is at file scope and
  // is folded into NPCS at page load — long before anybody has walked into a station — and these
  // positions come off the seat runs above. `reseat` copies them onto the cast rows, which have
  // been waiting in NPCS since the game started, parked outside the room.
  //
  // Which seats: two together on the far bench, three more spread down it, two on the near bench
  // opposite a gap, and one on their feet in the aisle. Nobody directly across the aisle from
  // anybody, and every pair at least the 0.61 pitch apart, because `.sitcheck.js` calls two people
  // closer than 0.45 m two people in one seat and it is right to.
  MetroFit['train'].reseat([
    { at: [farSeatX[2], T.SIT_FAR_Z], yaw: FARYAW, act: 'sit' },
    { at: [farSeatX[3], T.SIT_FAR_Z], yaw: FARYAW, act: 'phone' },
    { at: [farSeatX[8], T.SIT_FAR_Z], yaw: FARYAW, act: 'read' },
    { at: [farSeatX[13], T.SIT_FAR_Z], yaw: FARYAW, act: 'sit' },
    { at: [farSeatX[17], T.SIT_FAR_Z], yaw: FARYAW, act: 'phone' },
    { at: [nearSeatX[1], T.SIT_NEAR_Z], yaw: NEARYAW, act: 'sit' },
    { at: [nearSeatX[4], T.SIT_NEAR_Z], yaw: NEARYAW, act: 'read' },
    // The one on his feet, in the 68 cm of aisle between the two benches, with the pole at x -2.24
    // right where his hand is. Facing down the car, which is where somebody holding a pole with
    // one hand looks.
    //
    // The x is picked against the CROWD agent's list as well as against this zone's own geometry.
    // `WALK.hide` is where js/metro-crowd.js parks somebody who has boarded, and it widened that
    // list to the four wide panel spans ±30 cm — which is x ±0.98, ±1.58, ±3.54, ±4.14, at z 4.25,
    // i.e. standing in this aisle. -2.05 is 0.47 m off the nearest of them, which is the width of
    // two shoulders, and it is the only reason this file's one stander is not sharing a body with
    // one of theirs at eight in the morning.
    { at: [-2.05, 4.18], yaw: Math.PI * .5, act: 'wait' },
  ]);
};

// ---------------------------------------------------------------------------------------------
// 乘客 the eight, and how they join the roster
//
// Hung on `MetroFit['train'].cast` at FILE SCOPE, for the same reason js/metro-crowd.js hangs its
// twenty there: game.js folds every zone's cast into `NPCS` while it is loading (js/game.js:1091),
// which is long before `Lazy` has built a station for anybody to stand in. Each row then goes
// through the same `initNPC` as somebody written into data.js — `makeLook` resolves the wardrobe,
// a face seed comes off the roster index, the temperament name becomes a temperament.
//
// A carriage on 二号线 at eight in the morning, which is a narrower set of people than a concourse
// is: everybody here has already got on, so nobody is hurrying and nobody is dragging luggage.
// Four of the eight are looking at a phone or a book, because that is what a carriage is.
//
// NO `commuter` FLAG — see the header; it would break the crowd agent's boarding shot.
// NO `lines`. `initNPC` only gives somebody a `th` in `scene.things` if they have dialogue, and a
// thing needs a dictionary row (`.thingcheck.js`) in js/vocab.js, which is the Hub's file and not
// this one. The Scribe is welcome to all eight of them; the ticket is in the report.
const TRAIN_WHO = [
  // Two together, mid-car: a man on his way to an office, and the woman beside him who has been
  // aboard since the terminus and is a long way into something on her phone.
  { t: 'weary', look: { skin:'#d3a67f', hair:'#241f1d', hairStyle:'short', top:'#ddd8c8',
      pants:'#2e343d', shoe:'#33373c', jacket:'#3a4a63', collar:'shirt', glasses:true,
      bag:'shoulder', bagColor:'#463b32', tall:1.02, wide:1.01, age:.34 } },
  { t: 'bored', look: { skin:'#c9926a', hair:'#2a2320', hairStyle:'bun', top:'#e0d6c2',
      pants:'#39414c', shoe:'#e4ded0', sleeve:'short', collar:'vneck', vest:'#7d5567',
      bag:'tote', bagColor:'#8d6a44', tall:.95, wide:.92 } },
  // A student with a book open on her knees, which is the single most Beijing thing in a carriage
  // at this hour and was completely absent from this game's only train.
  { t: 'patient', look: { skin:'#e0b085', hair:'#302925', hairStyle:'braid', top:'#4a6c5a',
      pants:'#2b3340', shoe:'#e9e2d5', collar:'hood', pack:true, packColor:'#3f6350',
      tall:.94, wide:.88, youth:.45, headScale:1.03 } },
  // The one who has made this journey twice a day for twenty years, in the polo, taking up a seat
  // and a half. Down the length of a car the silhouette is the whole of what tells him apart.
  { t: 'steady', look: { skin:'#bd8a5f', hair:'#1d1917', hairStyle:'buzz', top:'#5f6347',
      pants:'#333a44', shoe:'#cfc9bb', collar:'polo', sleeve:'half', beard:'stubble',
      tall:1.03, wide:1.17, age:.42 } },
  { t: 'eager', look: { skin:'#a86e46', hair:'#1e1a18', hairStyle:'short', top:'#b8563f',
      pants:'#3d434c', shoe:'#4a4b46', collar:'crew', sleeve:'short',
      tall:1.01, wide:.99, youth:.30 } },
  // The two on the near bench, backs to the doors. The grey one of them is where the argument
  // about a priority seat starts in every carriage in this country.
  { t: 'frail', look: { skin:'#cba079', hair:'#c0bcb4', hairStyle:'perm', top:'#ddd5c3',
      pants:'#3d444c', shoe:'#2b3034', jacket:'#4a5a63', collar:'turtle',
      tall:.88, wide:1.00, stoop:.17 } },
  { t: 'shy', look: { skin:'#e8ba90', hair:'#231d1a', hairStyle:'bob', top:'#e6dfcd',
      pants:'#454b56', shoe:'#ebe4d7', collar:'crew', sleeve:'short', glasses:true,
      tall:.97, wide:.90 } },
  // On his feet by the pole, off a site, with the hat still on. Standing is what most of a Beijing
  // carriage is doing, and one figure is the cheapest way this file can say so.
  { t: 'brash', look: { skin:'#b07a4e', hair:'#1e1a18', hairStyle:'short', top:'#5d6470',
      pants:'#4a4638', shoe:'#4a4b46', collar:'crew', sleeve:'short', beard:'stubble',
      hat:'hard', hatColor:'#d8b23c', tall:1.07, wide:1.08, age:.30 } },
];
// 乘客四十一 upward. game.js's own six on the concourse are 乘客十 to 乘客十五 and the crowd
// agent's twenty are 乘客二十一 to 乘客四十, so this run starts where that one stops: two people
// with the same headword in one room are one word in the list and two labels on top of each other.
const TRAIN_NUM = ['四十一', '四十二', '四十三', '四十四',
                   '四十五', '四十六', '四十七', '四十八'];
// Parked well outside the room until the zone builds and `reseat` seats them. Written out rather
// than read off `Metro`, because touching that module here would build a station nobody has walked
// into yet, which is the whole point of js/lazy.js.
const TRAIN_PARKED = [0, 40];

MetroFit['train'].cast = TRAIN_WHO.map((w, i) => ({
  hz: '乘客' + TRAIN_NUM[i], place: 'metro', look: w.look, temper: w.t,
  // Nobody in a carriage turns round to look at whoever just got on, and a seated body that yaws
  // away from its bench puts its legs through the cushion. The gaze system further down
  // `updateNPCs` still gives each of them a glance on their own thirty-second clock, which is
  // what noticing somebody actually looks like.
  faceLock: true,
  seatY: MetroTrain.SEATY,
  // Awake means "the car is at this platform", swung by the tick. See the header.
  hours: [0, 24],
  spots: [{ h0: 0, h1: 24, at: TRAIN_PARKED.slice(), face: 0, act: 'sit' }],
}));

// Put the cast in the seats the builder worked out, and remember where each of them is when the
// train is berthed. Called from the builder, so it runs whenever the room is built and is safe to
// run twice: `Lazy` can rebuild a scene, and these roster rows outlive it.
MetroFit['train'].reseat = (seats) => {
  const T = MetroTrain, cast = MetroFit['train'].cast;
  T.PAX.length = 0;
  for (let i = 0; i < cast.length && i < seats.length; i++) {
    const n = cast[i], s = seats[i];
    n.spots[0].at[0] = s.at[0]; n.spots[0].at[1] = s.at[1];
    n.spots[0].face = s.yaw; n.spots[0].act = s.act;
    n.x = s.at[0]; n.z = s.at[1]; n.yaw = s.yaw; n.face = s.yaw;
    n.lift = T.FLOORY;
    // A standing body has no seat to drop its hips to. It makes no difference to a 'wait' pose,
    // but `.sitcheck.js` reads `seatY` off the roster and a stander carrying a seat height is a
    // person that harness would have to be told to ignore.
    n.seatY = s.act === 'wait' ? undefined : T.SEATY;
    n.ground = 0; n.wait = 4; n.leg = 0;
    T.PAX.push({ n, x0: s.at[0], z0: s.at[1] });
  }
};

// Anything that moves registers here and the shell dispatches it once a frame, BEFORE the shell's
// own train placement, so you can read the clock it is about to act on. Do not start your own
// timer. `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in minutes.
// A tick that throws is dropped for the rest of the run rather than stopping the station.
MetroFit['train'].tick = (t, body, clock) => {
  const T = MetroTrain;

  // ---- 乘客 riding with the car.
  //
  // The same `trainAt(clock)` the shell is about to hand `placeTrain`, one statement before it
  // does, so eight passengers and the twenty-two seats under them are placed off one number in
  // one frame. `updateNPCs` has already run this frame and `drawNPCs` has not, which is exactly
  // the window this needs.
  const train = Metro.trainAt(clock);
  // In the room at all. The car is 12.6 m long and the room 12.8 m across, so past 8 m of travel
  // whatever is left inside is behind the tunnel mouth. The doors are shut at any x this is false
  // at, and nobody can see into a shut carriage.
  const aboard = train.x > -8 && train.x < 8;
  for (let i = 0; i < T.PAX.length; i++) {
    const p = T.PAX[i], n = p.n;
    n.hours = aboard ? T.HRS_ON : T.HRS_OFF;
    if (!aboard) continue;
    n.x = p.x0 + train.x;
    n.z = p.z0;
    // The car's floor is a slab standing on the platform's own level, so its top is 10 cm up and a
    // passenger placed on the room's floor is buried to the ankle. `updateNPCs` writes this from
    // `scene.liftAt`, which knows about the stairwell and nothing else; the car is the second
    // storey in this room and it belongs to whoever built it.
    n.lift = T.FLOORY;
    // Never walk. See the header: `updateNPCs` takes the waiting branch before it ever measures
    // the distance to the target, and this is what keeps eight seated people seated while the
    // thing they are sitting in travels thirteen metres.
    n.wait = 4;
    n.ground = 0;
  }

  // ---- 线路图 the lit dot, the only part of the car that knows which station this is.
  // Deliberately cheap: nothing is touched unless the station has actually changed, and when it
  // has, the writes are `color` and `glow` — neither of which is part of the cull data the draw
  // loop reads off a matrix, so this cannot fight `placeTrain` for ownership of anything.
  const st = Metro.stationAt();
  if (st) {
    const S = Metro.STATIONS;
    let ix = 0;
    for (let k = 0; k < S.length; k++) if (S[k].hz === st.hz) { ix = k; break; }
    if (ix !== T.hereIx) {
      T.hereIx = ix;
      for (let d = 0; d < T.DOTS.length; d++) {
        const row = T.DOTS[d];
        for (let k = 0; k < row.length; k++) {
          // Behind you grey, ahead of you the line's own blue, and where you are standing red and
          // lit. A map that only ever shows the whole line tells a passenger nothing they did not
          // already know when they got on.
          row[k].color = k === ix ? MetroDot.here : k < ix ? MetroDot.past : MetroDot.ahead;
          row[k].glow = k === ix ? .55 : 0;
        }
      }
    }
  }
};

// What this zone put in the room, for the harness that has to prove the tagging rather than trust
// it. Everything in `MINE` must also be in `api.props.filter(p => p.tag === '地铁')`, and nothing
// in `MINE` may still be where it was built once `Metro.placeTrain` has moved the car.
MetroFit['train'].census = () => ({
  props: MetroTrain.MINE.length,
  tagged: MetroTrain.MINE.filter(p => p.tag === '地铁').length,
  translucent: MetroTrain.MINE.filter(p => p.alpha !== undefined && p.alpha < .999).length,
  pax: MetroTrain.PAX.length,
  awake: MetroTrain.PAX.filter(p => p.n.awake).length,
  doors: MetroTrain.DOTS.length,
  here: MetroTrain.hereIx,
});
