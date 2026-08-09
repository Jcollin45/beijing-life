// ✈️ Apron + parked aircraft — The widebody at stand B12 — livery 中国国际航空, reg B-2589 — plus tugs and GPU/water services
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    behind the curtain wall, -z  (AZ = -21.5)
//   camera  D2-plane
//
// The widebody at stand B12 — livery 中国国际航空, reg B-2589 — plus tugs and GPU/water services.
// Seen through WIN from BOTH halves of the hall. THE CURTAIN WALL AND WIN BELONG TO THE SHELL;
// build behind them, never through them. D2 is one of the Verifier's two cross-zone canaries.
//
// The camera IS the acceptance test. Render your shot with `node .audit.js D2-plane`, open the
// PNG, and look at it. A zone whose code boots but whose shot is black, empty, or unchanged has
// not shipped. You own your row(s) in .audit.js and nobody else's.
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
// Check yourself: `node .fpscheck.js airport` must stay under 16.7 ms median. If your zone pushes
// it over, say so in your report rather than shipping it.
//
// ---------------------------------------------------------------------------------------------
// WHAT THIS FILE ADDS, AND WHY IT IS WHERE IT IS
//
// The shell already builds the aeroplane, the stand paint, the B11/B12/B13 numbers, two baggage
// tug trains, the GPU and the water bowser. None of that is duplicated here. What this file adds
// is the servicing that happens *at* the aircraft, and the reason it goes there is a measurement
// rather than a preference.
//
// The curtain wall stands on a stone kerb 1.25 m high at z = -7.91. From D2 — eye about 2.15 m
// at z = +2.6 — the ray that grazes the top of that kerb meets the ground at z = -22.5. So from
// inside this room **the apron floor is invisible until you are past the aeroplane**: everything
// closer than that is seen only from about 0.4 m up, and anything ankle-high in the near half of
// the apron is hidden by masonry however carefully it is placed. That is why the shell's own
// sixteen cones cannot be found in the shot, and why adding more of them at z = -19 would have
// bought nothing.
//
// What clears the kerb is height. So the additions are the tall half of a turnaround — a catering
// body up at the galley door on its scissors, a belt loader with its ramp into the aft hold, a
// lavatory bowser, a pushback tug with its bar laid out ready, a train of loaded containers under
// the wing — all of them in the band z -22.2 .. -16.0, which is where the fuselage is and where
// they are read against white paint rather than against grey concrete. Two floodlight masts stand
// beyond the stand at z = -28.5, where the ground *is* visible, and they are what the field has
// after dark.
//
// The one rule that decided every x below: the glazing runs -17.60 to 19.20 and the piers either
// side of it are solid, so the nose of the aircraft (x 23+) and everything parked at it is behind
// masonry from every seat in the building. Nothing here is placed forward of x 19.
//
// ---------------------------------------------------------------------------------------------
// THE D2 ROW IS DELIBERATELY UNTOUCHED
//
// This zone owns its row in .audit.js and has spent none of it. D2-plane is one of the Verifier's
// two cross-zone canaries — the whole point of it is that it is the *same* view through shared
// geometry every time, so that an apron edit which breaks the glass view from landside shows up
// as a difference rather than as a reframing. Re-aiming a canary to flatter the zone that owns it
// is how a canary stops being one. If a future pass wants a tighter apron shot, add a new row
// rather than moving this one.
//
// ---------------------------------------------------------------------------------------------
// IF THIS VIEW EVER LOOKS WRONG, CHECK THESE FOUR FIRST
//
// Four placements here were corrected off the first render of D2 rather than off arithmetic, and
// each one is the kind that arithmetic gets wrong. They are the first things to re-measure if the
// shot ever stops reading:
//
//   1. The catering body's height and x. It must not stand taller than the fuselage crown, and its
//      projection must clear the red fin — which is a screen-space test, not a world-space one:
//      the truck is 4 m nearer the eye than the tail, so clearing the fin by two metres of apron
//      is not clearing it at all.
//   2. The belt loader's mass. Its ramp runs in z and D2 looks down -z, so the ramp foreshortens
//      to a bar. It survives as a solid wedge and dies as an open frame — do not "lighten" it.
//   3. Anything parked between x -4.6 and x 6 at z -19. The shell's second tug tows three carts
//      across that band at z -15.1, and whatever goes behind them disappears.
//   4. The masts' x. A mast stands 5 m behind the aeroplane, so anywhere in x -2 .. 24 its lower
//      half is behind fuselage and what is left is a lamp head floating on a stub.
//
// ---------------------------------------------------------------------------------------------

(() => {
  registerAirportAmbient('apron-ramp-crew-west', 6.60, -16.20, 0,
    { hz:'地勤', roleClass:'apron', top:'#e8622a',
      look:{hat:'cap',hatColor:'#e8e4d8'}, source:'air-apron', speed:.78,
      patrol:[[6.60,-16.20],[7.80,-16.20],[7.80,-17.10],[6.60,-16.20]] });
  registerAirportAmbient('apron-ramp-crew-east', 14.90, -16.40, 0,
    { hz:'地勤', roleClass:'apron', top:'#e8622a',
      look:{hat:'cap',hatColor:'#e8e4d8'}, source:'air-apron', speed:.82,
      patrol:[[14.90,-16.40],[13.70,-16.80],[14.10,-17.35],[14.90,-16.40]] });

  // File-scope state for the tick. Inside an IIFE and not at the top level: a classic script's
  // top-level `let` is a shared global lexical binding, and fifteen zone files declaring `slats`
  // at once is a SyntaxError that takes the whole game down before a line of it runs.
  let slats = null;      // the belt loader's belt, and the two cases riding up it
  let beacons = null;    // the rotating amber lamps, flashed rather than spun
  let mastLamps = null;  // the floodlight heads, which come up after dark
  let mastPools = null;  // and the patch each one lays on the concrete

  AirFit['apron'] = A => {
    const { box, cyl, ball, cap, taper, glyphs, glow, thing, shade } = A;
    const { C, G, col } = A;

    // The shell's aircraft, restated so nothing here measures off a guess. AZ is the apron datum
    // on A; the aeroplane sits 2 m beyond it with its nose to +x.
    const AZ = A.AZ;                                  // -21.5
    const PZ = AZ - 2.0, PX = 11.0, PY = 3.10;        // fuselage axis: z -23.5, y 3.10
    const SKIN = PZ + 1.55;                           // -21.95, the +z skin at axis height

    // Two colours the ground fleet shares, so five vehicles read as one operator's fleet rather
    // than as five separate props. Deliberately *not* the aircraft's #ebe6da: a white box parked
    // against a white fuselage at twenty-five metres is a white fuselage.
    const FLEET = C('#cfd6d2'), FLEETD = C('#8f979b'), DARK = C('#20262b');

    // ------------------------------------------------------------------ 航空配餐 the catering hi-lift
    //
    // A catering truck is the one piece of ground equipment whose whole shape is vertical: the
    // body goes up on its scissors until its floor is the aircraft's floor, and the silhouette
    // that makes is a box hanging in the air beside a fuselage with nothing under it but lattice.
    // That is the single most legible thing on an apron from inside a terminal, which is why it
    // is the first thing built here and why it is parked at the aft galley door, on the tail side
    // of the wing where the hall has a clear line to it.
    // x 3.55, and both digits were paid for. Further -x and the body's projection lands on the red
    // fin: the truck is 4 m nearer the eye than the tail is, so an object that clears the fin by
    // two metres of apron still covers it on screen. Further +x and the body's flank goes through
    // the wing — the wing box is swept, and its most -x corner reaches x 4.59 at z -22.1, so the
    // real limit is 4.55 and not the 5.2 the unrotated box would suggest.
    const KX = 3.55;
    box(KX, .62, -18.60, 2.10, .44, 4.20, FLEETD, { gloss: .26 });
    for (const ox of [-.96, .96])
      for (const oz of [-1.25, 1.20])
        cyl(KX + ox, .38, -18.60 + oz, .38, .30, col.black, { rz: Math.PI / 2, gloss: .22 });
    box(KX, 1.42, -16.90, 1.95, 1.50, 1.80, FLEET, { gloss: .30 });
    // The windscreen, and every other window on this apron: a dark glossy panel at full opacity.
    // Glass that is actually see-through does not batch, and eleven translucent cab windows out
    // here would be eleven draw calls to show a driver's seat nobody can resolve from the lounge.
    box(KX, 1.62, -16.03, 1.70, .70, .06, DARK, { hard: true, mode: 1, gloss: .55 });
    // the scissors. Four arms, crossed in the z-y plane, which is the plane the terminal sees.
    for (const ox of [-.80, .80])
      for (const a of [.40, -.40])
        box(KX + ox, 1.85, -19.20, .13, 2.30, .13, col.steelD,
          { hard: true, rx: a, gloss: G.metal });
    // The body, at the aft galley door. 1.85 tall and floored at 2.85, which is the door sill: the
    // first version stood 2.20 tall on a 2.96 floor, so its roof cleared the crown of the fuselage
    // and the whole vehicle read as a shed parked in front of an aeroplane rather than as a truck
    // serving one. Nothing out here should be taller than what it is serving.
    box(KX, 3.775, -19.30, 2.00, 1.85, 3.20, FLEET, { gloss: .28 });
    box(KX, 3.05, -19.30, 2.04, .26, 3.24, col.blue, { hard: true, mode: 1 });
    box(KX, 4.75, -19.30, 2.10, .10, 3.30, C('#6f7a80'), { hard: true, gloss: .24 });
    // The platform bridging body to fuselage, at the galley door sill. Its far edge is at the skin
    // radius for its own height rather than at the axis radius — 2.87 m is 0.23 below the axis, so
    // the skin has barely started to curve and the platform lands on it.
    box(KX, 2.87, -21.55, 1.50, .10, .80, col.steelD, { hard: true, gloss: G.metal });
    for (const ox of [-.68, .68])
      box(KX + ox, 3.31, -21.55, .06, .78, .06, col.steelD, { hard: true, gloss: G.metal });
    box(KX, 3.67, -21.55, 1.42, .06, .06, col.steelD, { hard: true, gloss: G.metal });
    // 航空配餐 on the face the terminal looks at, which is +z. On the +x flank it would be turned
    // 68° away from the D2 camera and shear into six pixels of nothing.
    glyphs(KX, 3.95, -17.68, 0, '航空配餐',
      { size: .30, gap: .12, color: col.blue, mode: 1 });
    const kb = box(KX, 2.28, -16.90, .22, .14, .20, col.amber,
      { hard: true, mode: 1, glow: .26 });
    shade(KX, -18.80, 2.90, 5.20, .34);

    // ------------------------------------------------------------------ 传送带车 the belt loader
    //
    // At the aft hold, aft of everything. Two things about this vehicle were learned from the first
    // render of D2 and are the reason it looks the way it does.
    //
    // First, its ramp runs in z, and D2 looks down -z. A diagonal in the depth axis foreshortens to
    // a horizontal bar: the ramp that is the whole identity of a belt loader was invisible as a
    // ramp. So it is built as a solid wedge — deck, deep dark side plates, a closed underside —
    // rather than as an open frame. A mass still reads end-on; a lattice does not.
    //
    // Second, the first version stood at x 4.30, which is directly behind the shell's second tug
    // and its four-post canopy. Two open frames 2 m apart in depth are not two vehicles, they are
    // scaffolding. x 1.00 puts it in the gap between that tug's carts, where its dark wedge is
    // read against white fuselage instead of against another vehicle's posts.
    const LX = 1.00;
    const RZ0 = -18.55, RY0 = .78, RZ1 = -22.20, RY1 = 2.20;      // ramp foot and head
    const RLEN = Math.hypot(RZ1 - RZ0, RY1 - RY0), RANG = Math.atan2(RY1 - RY0, RZ0 - RZ1);
    const RMY = (RY0 + RY1) / 2, RMZ = (RZ0 + RZ1) / 2;
    box(LX, .56, -17.40, 1.55, .44, 2.60, FLEETD, { gloss: .26 });
    for (const ox of [-.72, .72])
      for (const oz of [-.90, .90])
        cyl(LX + ox, .34, -17.40 + oz, .34, .28, col.black, { rz: Math.PI / 2, gloss: .22 });
    box(LX, 1.15, -16.40, 1.40, 1.30, 1.10, FLEET, { gloss: .28 });
    box(LX, RMY, RMZ, 1.14, .14, RLEN, C('#8d9298'), { hard: true, rx: RANG, gloss: .22 });
    for (const ox of [-.60, .60])
      box(LX + ox, RMY + .16, RMZ, .08, .46, RLEN, C('#3b4048'),
        { hard: true, rx: RANG, gloss: .26 });
    box(LX, RMY - .19, RMZ, .92, .24, RLEN * .92, C('#4a4f55'),
      { hard: true, rx: RANG, gloss: .22 });
    // The belt itself. Six slats and two cases, positioned from one parameter u along the ramp, so
    // the tick moves them by writing two floats into each matrix — no allocation, no rebuild.
    // `on` is how far up the ramp the piece starts; `lift` holds a case clear of the slats.
    slats = [];
    const rideAt = (u, lift) => [LX, RY0 + .08 + lift + u * (RY1 - RY0), RZ0 - u * (RZ0 - RZ1)];
    for (let i = 0; i < 6; i++) {
      const [x, y, z] = rideAt(i / 6, 0);
      // span .96, not 1: at the very head of the ramp a slat's far edge is inside the skin, and a
      // conveyor that posts a slat through the side of an aeroplane once a cycle is worse than a
      // conveyor that stops four centimetres short of it.
      slats.push({ p: box(x, y, z, 1.06, .05, .17, C('#3b4048'), { hard: true, rx: RANG }),
                   u0: i / 6, lift: 0, span: .96 });
    }
    for (const [u0, c] of [[.18, C('#5a4a3c')], [.66, C('#33445c')]]) {
      const [x, y, z] = rideAt(u0, .17);
      slats.push({ p: box(x, y, z, .70, .30, .48, c, { gloss: .24, rx: RANG }),
                   u0, lift: .17, span: .86 });
    }
    glyphs(LX, 1.22, -15.83, 0, '京翔地服', { size: .20, gap: .05, color: col.blue, mode: 1 });
    const lb = box(LX, 1.90, -16.40, .20, .13, .18, col.amber,
      { hard: true, mode: 1, glow: .24 });
    shade(LX, -18.80, 2.00, 6.40, .32);

    // ------------------------------------------------------------------ 污水车 the lavatory bowser
    //
    // Under the tail, lying along the fuselage rather than square to it, because that is how a
    // bowser parks and because a tank on its side is the one ground-vehicle shape that is not a
    // box. Its cab faces -x, away from the catering truck: turned the other way it drove straight
    // through the hi-lift's chassis.
    //
    // x -6.40 rather than under the fin, because the shell's second tug tows three carts west from
    // x 5 to x -3.6 at z -15.1, and every one of those sits between this camera and the tail. The
    // bowser was entirely behind the third cart. Past x -4.6 the row ends and it is in clear air.
    const WX = -6.40, WZ = -19.60;
    box(WX, .60, WZ, 3.50, .38, 1.55, col.charcoal, { gloss: .24 });
    cyl(WX, 1.42, WZ, .66, 2.90, C('#e4e8e6'), { rz: Math.PI / 2, gloss: .36 });
    for (const ox of [-.85, .85])
      cyl(WX + ox, 1.42, WZ, .70, .10, col.steelD, { rz: Math.PI / 2, gloss: G.metal });
    for (const ox of [-1.15, 1.25])
      for (const oz of [-.60, .60])
        cyl(WX + ox, .34, WZ + oz, .34, .26, col.black, { rz: Math.PI / 2, gloss: .22 });
    box(WX - 2.15, 1.10, WZ, 1.30, 1.30, 1.50, FLEET, { gloss: .28 });
    box(WX - 2.82, 1.32, WZ, .06, .62, 1.30, DARK, { hard: true, mode: 1, gloss: .55 });
    cyl(WX, 2.32, WZ - .50, .32, .24, col.charcoal, { rx: Math.PI / 2, gloss: .24 });
    glyphs(WX, 1.62, WZ + .72, 0, '污水车', { size: .28, gap: .06, color: col.jade, mode: 1 });
    shade(WX - .40, WZ, 5.20, 2.20, .32);

    // ------------------------------------------------------------------ 牵引车 the pushback tug + towbar
    //
    // The shell's note says a tractor at the nose would be a prop nobody can see, and it is right:
    // the nose is at x 27 and the glazing stops at 19.20. But a tug that has not coupled up yet
    // stands off the stand with its bar laid out on the concrete pointing at the gear it is about
    // to take, and *that* is inside the opening. It also says something the parked aeroplane
    // cannot: this one is leaving.
    const TX = 15.20, TZ = -18.90;
    box(TX, .68, TZ, 3.10, .78, 2.00, col.blue, { gloss: .30, ry: .10 });
    box(TX + .95, 1.55, TZ, 1.30, 1.00, 1.70, FLEET, { gloss: .28, ry: .10 });
    box(TX + .32, 1.62, TZ, .06, .58, 1.45, DARK, { hard: true, mode: 1, gloss: .55, ry: .10 });
    box(TX + .95, 1.62, TZ + .84, 1.20, .58, .06, DARK,
      { hard: true, mode: 1, gloss: .55, ry: .10 });
    for (const ox of [-1.00, 1.20])
      for (const oz of [-.70, .70])
        cyl(TX + ox, .36, TZ + oz, .36, .30, col.black, { rz: Math.PI / 2, gloss: .22 });
    glyphs(TX, .96, TZ + 1.06, 0, '京翔地服', { size: .22, gap: .05, color: col.white, mode: 1 });
    const tb = box(TX + .95, 2.14, TZ, .22, .14, .20, col.amber,
      { hard: true, mode: 1, glow: .26 });
    // the bar. Along x, clear of the outboard engine, which ends at x 13.9 and hangs to z -19.15.
    cap(TX - 2.60, .44, TZ, .20, 3.40, .20, col.yellow, { rz: Math.PI / 2, gloss: .30 });
    box(TX - 4.45, .44, TZ, .60, .42, .74, col.charcoal, { gloss: .26 });
    for (const oz of [-.42, .42])
      cyl(TX - 2.90, .22, TZ + oz, .22, .16, col.black, { rz: Math.PI / 2, gloss: .22 });
    shade(TX - 1.20, TZ, 7.00, 2.40, .30);

    // ------------------------------------------------------------------ 集装箱 the container train
    //
    // Three loaded ULDs on their dollies, under the wing between the engines and the trailing
    // edge. They fill the one part of this view that had nothing in it at all — the gap between
    // the belly of the aircraft and the top of the kerb — and they cap at 2.04 m because the wing
    // above them is at 2.23.
    for (const dx of [7.40, 9.80, 12.20]) {
      box(dx, .44, -17.90, 2.10, .16, 1.45, FLEETD, { hard: true, gloss: .24 });
      for (const ox of [-.72, .72])
        cyl(dx + ox, .22, -17.90, .22, .18, col.black, { rz: Math.PI / 2, gloss: .22 });
      box(dx, 1.28, -17.90, 1.90, 1.52, 1.30, C('#c2c7c4'), { gloss: .22 });
      box(dx, 1.28, -17.23, 1.55, 1.20, .04, C('#8e9694'), { hard: true, mode: 1, gloss: .20 });
    }
    shade(9.80, -17.90, 8.00, 1.90, .28);

    // ------------------------------------------------------------------ 轮挡 chocks, and cones
    //
    // Both are on the borderline of what the kerb allows: at the main gear the sight-line clears
    // the ground by 10 cm, so a chock shows its top third and a cone shows its tip. They are here
    // because they cost nothing — same mesh, same mode, same everything as the shell's sixteen, so
    // they land in a batch that is already being drawn — and because the gate lounge's own shots
    // look along the glass at a much flatter angle and get all of them.
    for (const [ox, rz] of [[-.95, .35], [.95, -.35]])
      box(PX - 1.0 + ox, .15, PZ + 2.20, .40, .28, .34, col.yellow, { hard: true, rz });
    for (const [cx, cz] of [[-5.40, -17.05], [-3.00, -17.35], [5.90, -17.10],
                            [14.60, -17.30], [17.40, -17.05], [18.60, -17.35]])
      taper(cx, .22, cz, .34, .44, .34, col.orange, { gloss: .18 });

    // ------------------------------------------------------------------ 地勤 the ramp crew
    //
    // Two of them, hand-built rather than `agent()`d, because `agent` is not on the toolkit and
    // these are 25 m away through 20% glass where a figure is forty pixels tall. What has to be
    // right at that size is one thing: the vest has to be a colour nothing else out here is. The
    // shell made the same call for its tug drivers and picked the same orange.
    // ------------------------------------------------------------------ 灯塔 the floodlight masts
    //
    // Beyond the stand at z -28.5, which is the near edge of the ground the kerb actually lets you
    // see. By day they are two thin verticals that give the field a scale it did not have; after
    // dark they are the only reason the apron is not a black rectangle with an aeroplane in it.
    // Emissive heads and a painted patch on the concrete, not real lights: the renderer ranks the
    // eight nearest lamps every frame, and two out here would have taken two of them off the hall
    // fittings that the shell chose them for.
    //
    // BOTH ON THE WEST SIDE, and that is forced. A mast stands 5 m further back than the aeroplane
    // does, so anywhere in x -2 .. 24 its lower 4.6 m is behind the fuselage and what is left is a
    // lamp head floating on a stub of pole with no ground under it. The first version put one at
    // x 21 and it looked exactly like that. The fuselage ends at x -2, the tail surfaces at -5.7,
    // so -8 and -14 are the two places on this field where a mast can be seen standing on it.
    mastLamps = []; mastPools = [];
    for (const mx of [-8.00, -14.00]) {
      cyl(mx, 4.60, -28.50, .15, 9.20, col.steelD, { gloss: G.metal });
      box(mx, 9.35, -28.50, 2.30, .28, .55, C('#4a4f55'), { hard: true, gloss: .26 });
      mastLamps.push(box(mx, 9.14, -28.22, 2.05, .26, .34, C('#fff2cf'),
        { hard: true, mode: 1, glow: .06 }));
      mastPools.push(glow(M.trs(mx, .02, -27.20, 0, 15.0, 1, 12.0), C('#ffe9c0'), 0));
    }

    beacons = [kb, lb, tb];

    // ------------------------------------------------------------------ the word for it
    //
    // At the glass, on the airside half, looking at the loader and the container train. `focus`
    // points the camera out of the window rather than at the pane, the way the shell's two 飞机
    // things do — and this is deliberately not tagged 飞机, so it does not fight them for `pick`.
    thing('行李车', 4.40, 2.20, -A.RZ - .40,
      '地勤正在把行李装上飞机。',
      'The ramp crew are loading the bags onto the aircraft.',
      '行李车 the baggage cart. 地勤 ground staff, 装 to load, 传送带 the conveyor belt.',
      { focus: [4.30, -19.40], reach: 3.20 });
  };

  // Anything that moves registers here and the shell dispatches it once a frame. Do not start your
  // own timer: `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in
  // minutes. A tick that throws is dropped for the rest of the run rather than stopping the
  // terminal.
  //
  // Three things move, and none of them allocates. The belt runs, which is written straight into
  // m[13]/m[14] — the translation columns of a matrix whose rotation and scale never change, so
  // there is no matrix to rebuild and no array to make. The beacons flash, which is one float on
  // an instance attribute. And the floodlights come up with the clock, which is how this zone gets
  // a night without reaching into the shell's `setNight`.
  //
  // Bounding spheres are deliberately left alone: they are packed into the batch's cull array at
  // build and are what an animated prop is meant to keep. A slat travels 3.9 m inside a loader
  // that is either wholly on screen or wholly off it.
  AirFit['apron'].tick = (t, body, clock) => {
    if (slats) {
      // 0.13 of the ramp a second — a belt slow enough to read as a belt rather than as a flicker.
      const w = (t * .13) % 1;
      for (const s of slats) {
        const u = ((s.u0 + w) % 1) * s.span;
        const p = s.p.m;
        p[13] = .86 + s.lift + u * 1.42;
        p[14] = -18.55 - u * 3.65;
      }
    }
    // Night, off the game clock: full dark before 06:12 and after 20:24, with an hour of ramp at
    // each end so the beacons do not switch on between two frames of a dusk shot.
    let nf = 0;
    if (clock < 372) nf = 1;
    else if (clock < 432) nf = (432 - clock) / 60;
    else if (clock > 1164) nf = Math.min(1, (clock - 1164) / 60);
    if (beacons) {
      // Flashed between a floor and a peak rather than switched on and off. An audit shot renders
      // exactly one frame, so a beacon that spends half its cycle dark is a beacon that is missing
      // from half the screenshots ever taken of this apron.
      const f = .55 + .45 * Math.sin(t * 4.4);
      for (let i = 0; i < beacons.length; i++)
        beacons[i].glow = (.10 + .26 * f) * (1 + nf * 1.6);
    }
    if (mastLamps) {
      for (const p of mastLamps) p.glow = .06 + nf * .52;
      for (const g of mastPools) g.a = nf * .13;
    }
  };
})();
