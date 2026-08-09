// 🛩️ Runway + moving aircraft — The take-off/land sim: flierTick, 17 s of movement then a 15 s gap,
// retracting gear, blinking wingtips. Plus the field the movement happens on: touchdown zone,
// centreline and edge lighting, the taxiway off the apron, the windsock, the PAPI, the
// distance-to-go boards and the rotating beacon.
//
// Registered into AirFit (declared at the top of js/airport.js). See AIRPORT.md for the full
// zone + camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    -z far  (RUNZ = -43.5)
//   camera  DD-airnight + D-runway
//
// The take-off/land sim: flierTick, 17 s of movement then a 15 s gap, retracting gear, blinking
// wingtips. The most elaborate animation in any transport scene. Register your motion on
// AirFit['runway'].tick. DD is the Verifier's second cross-zone canary.
//
// ---------------------------------------------------------------------------------------------
// WHO FLIES THE AEROPLANE, AND WHY IT IS NOT THIS FILE
//
// The aircraft geometry, `flyFlier`, `placeFlier` and `flierTick` live in the shell (js/airport.js
// :970-1055, :3058-3152) and this file must not touch that file. The obvious move — take the
// schedule over from here by calling `Airport.holdFlier` every frame, which switches `flierTick`
// off — was tried on paper and rejected for two reasons, both of which would have been found only
// after shipping:
//
//   1. `flierLamps` is a closure variable in the shell. Nothing hands it out. Hold the aeroplane
//      and `flierTick` stops running, which means the red and green wingtip lamps stop being
//      driven and freeze at whatever glow they last had — which, on the first frame, is zero. The
//      "blinking wingtips" in the brief would have died in the act of claiming to own them.
//   2. `holdFlier` is how every harness in the tree freezes the aeroplane for a picture
//      (.diag-flier.js:148, and both of this zone's own audit rows below). A tick that calls it
//      every frame makes that impossible: `pre` sets the pose, the next frame overwrites it, and
//      every runway screenshot in the repo becomes a picture of an empty runway.
//
// So the shell keeps flying it and this file reads it. Everything that moves here is this file's
// own geometry, placed each frame from where the shell's aeroplane actually is: the anti-collision
// strobes and the belly beacon that follow it, the tyre smoke at the moment it touches down, the
// engine haze behind it on the take-off roll, its shadow on the runway, and the PAPI beside the
// runway that reads its height on the approach. That is a deeper movement than the one that was
// here before and it costs the shell nothing.
//
// HOW THE AEROPLANE IS READ. `Airport.flierAt()` is the documented accessor and it works, but it
// builds an object and two strings on every call, and this runs every frame. So the fuselage prop
// is found once, by its build signature, and read straight off its matrix from then on: zero
// allocation, and `p.cy === -99` is the shell's own "off the board" marker. If the signature ever
// stops matching, the API call is the fallback and the zone degrades to three small allocations a
// frame rather than to nothing at all.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET
//
// 133 props, 4 of them translucent, against a budget of 250 and 12. What makes that cheap is
// not the count:
//
//   * Every piece of runway paint and every light fitting is `box` + `mode 1` with no `round`,
//     `bevel`, `mat` or `matScale` of its own — which is the shell's own key for the centreline
//     and the edge lights, so ~100 props here join a batch that already exists and add zero draw
//     calls. The colours differ freely; colour, gloss, alpha and glow travel per instance.
//   * The four lamps that follow the aeroplane are `ball` + `mode 1`, which is the key the shell's
//     own three wingtip lamps use. Seven lamps, one call.
//   * The four translucent puffs are one draw call each and are the only ones. They collapse to a
//     zero matrix when idle, so for most of the cycle they cost a cull test.
//
// A moving prop keeps the bounding sphere it was built with — for a batched prop that sphere is
// packed into `b.cull` at build time and reading `p.cx` afterwards would change nothing. The four
// lamps travel 180 m, so they are marked `fixed` with a sphere that covers the whole runway rather
// than being culled against the spot they were built on. The four puffs are translucent, so they
// are never batched, so their `p.cx/cy/cz` *are* read live and are updated as they move.
//
// `node .fpscheck.js airport` before: 10.3 ms median, 14.5 p95, 375 calls. After: see the report.
//
// ---------------------------------------------------------------------------------------------

// Everything the builder hands the tick. Declared before the builder rather than after it, and
// under a name nobody else will pick: fifteen zone files share one global script scope.
let RUNWAY_ST = null;

// One flash of an anti-collision strobe: a 90 ms peak and a 120 ms decay. Declared out here rather
// than in the tick because an arrow function written inside the tick is a fresh function object
// sixty times a second, which is exactly the kind of allocation this file is not allowed.
function runwayFlash(q) {
  return q < 0 || q >= .21 ? 0 : q < .09 ? 1 : 1 - (q - .09) / .12;
}

AirFit['runway'] = A => {
  const { box, cyl, ball, flat, glyphs, shade } = A;
  const { C, G, col } = A;

  const RZC = A.RUNZ;          // -43.5, the runway centreline
  const RX0 = 2.0;             // the runway's own x datum, the shell's
  const PAINT = { hard: true, mode: 1 };                 // the batch every marking joins
  const LAMP  = { hard: true, mode: 1, glow: .04 };      // …and every light fitting

  // Kept for the tick. Assigned here, read there; if the builder threw before it got this far the
  // tick finds `null` and does nothing rather than throwing every frame until it is switched off.
  const S = {
    props: A.props, fp: null, probed: false, fy0: 2.80, fx0: 0,
    night: -1, lit: [], rz: RZC,
    lamps: [], lampOff: null, papi: [], beacon: null, sock: [], sockAt: null,
    smoke: [], haze: [], shadow: null,
    // the movement, tracked across frames rather than asked for
    phase: 0,          // 0 nothing  1 approach  2 rollout  3 take-off roll  4 climb-out
    touchT: -99, touchX: 0,
    M0: new Float32Array(16), M1: new Float32Array(16), M2: new Float32Array(16),
  };

  // A prop whose glow follows the clock. `litten` belongs to the shell and is not on `A`, so the
  // ramp is done here off the game clock instead — see `runwayNight`, which is the same
  // curve js/game.js grades the daylight from.
  const lit = (p, base, gain) => { p.g0 = base; p.gk = gain; S.lit.push(p); return p; };

  // ---------------------------------------------------------------- 跑道标志 the markings
  //
  // The shell paints the surface, the dashed centreline and the piano keys at both ends. What it
  // has not got is the part of a runway a passenger actually looks at: the ladder of touchdown-zone
  // bars and the two fat aiming-point blocks. The thresholds are at x ±96/100 and neither is in
  // frame from anywhere in the terminal — the hall sees roughly x -54..+46 — so this goes where it
  // can be seen rather than where a tape measure would put it.

  // Side stripes. Two continuous lines are what turn a grey band into a runway at 45 m: the eye
  // reads the pair of edges long before it reads anything written between them.
  for (const s of [-1, 1])
    box(RX0, .016, RZC + s * 5.02, 224, .03, .30, col.white, PAINT);

  // The touchdown zone. Groups of bars either side of the centreline, thinning as they run out,
  // with the aiming point at x +22 — which is where the shell's landing curve actually puts the
  // aeroplane a couple of metres off the surface, so the marking and the movement agree.
  for (const [bx, n] of [[-34, 3], [-20, 3], [-6, 2], [8, 2], [36, 1], [50, 1]])
    for (const s of [-1, 1])
      for (let i = 0; i < n; i++)
        box(bx, .016, RZC + s * (1.55 + i * .74), 3.40, .03, .46, col.white, PAINT);
  for (const s of [-1, 1])
    box(22, .016, RZC + s * 2.35, 9.0, .03, 1.35, col.white, PAINT);

  // ---------------------------------------------------------------- 跑道灯 the lighting
  //
  // The shell's edge lights sit at 11.2 m, which by day is invisible and after dark is a dotted
  // line rather than a line. Halving it costs nothing now that the markings batch — same mesh,
  // same mode, same key — so the infill goes in between, and the centreline gets its own row of
  // white in the gaps between the dashes. Three converging lines is what a runway is at night, and
  // it is most of what DD-airnight has to look at.
  for (let i = -7; i <= 5; i++)
    for (const s of [-1, 1])
      lit(box(RX0 + (i + .5) * 11.2, .10, RZC + s * 5.30, .34, .20, .34,
        C('#e8a94a'), LAMP), .04, .42);
  for (let i = -12; i <= 11; i++)
    lit(box(RX0 + i * 5.4 + 2.7, .07, RZC, .34, .14, .34, C('#fff1d2'), LAMP), .04, .46);

  // ---------------------------------------------------------------- 滑行道 the taxiway
  // How the aeroplane gets from the stand to the runway, which the scene has never said. Blue
  // edge lighting, because blue is the one colour on an airfield that means "not the runway" and
  // it reads as that from inside the hall without a caption.
  // Run from -38.7 to -30.3 so it actually touches both: the runway edge is at -38 and the apron
  // slab stops at -30.5, and a taxiway with grass at either end is a car park.
  const TX = 4.0, TZ = -34.5;
  flat(TX, -.052, TZ, 9.0, 8.4, col.apron, { mode: 9, gloss: .16, ...A.M_ASPH });
  box(TX, -.044, TZ, .26, .02, 7.6, col.yellow, PAINT);
  for (const sx of [TX - 5.1, TX + 5.1])
    for (const tz of [-37.6, -35.4, -33.2, -31.4])
      lit(box(sx, .10, tz, .30, .20, .30, C('#3f6fd8'), LAMP), .04, .40);

  // ---------------------------------------------------------------- 风向袋 the windsock
  // The one thing on an airfield that is always moving and is moving because of the weather rather
  // than because of a schedule. Five metres of mast reads at 38 m where a metre of anything does
  // not, which is the whole reason it is here and not, say, a set of runway edge markers.
  const WX = -18.0, WZ = -34.9, WY = 5.42;
  S.sockAt = [WX, WY, WZ];
  cyl(WX, .16, WZ, .58, .32, col.steelD, { gloss: G.metal });
  cyl(WX, 2.75, WZ, .13, 5.30, col.white, { gloss: G.paint });
  for (const by of [1.45, 3.45]) cyl(WX, by, WZ, .145, .60, col.red, { gloss: G.paint });
  cyl(WX - .10, WY, WZ, .52, .16, col.steel, { rz: Math.PI / 2, gloss: G.metal });
  // Three sleeves, built lying along -x from the mouth. The tick swings the lot about the mast
  // head: a sock that hangs dead still is worse than no sock, because it says the air is doing
  // nothing and everything else in the shot says it is not.
  S.sock = [
    cyl(WX - .78, WY, WZ, .48, 1.20, col.orange, { rz: Math.PI / 2, gloss: G.fabric }),
    cyl(WX - 1.86, WY, WZ, .38, .96, col.white, { rz: Math.PI / 2, gloss: G.fabric }),
    cyl(WX - 2.76, WY, WZ, .27, .84, col.orange, { rz: Math.PI / 2, gloss: G.fabric }),
  ];
  for (const p of S.sock) { p.m0 = p.m; p.m = new Float32Array(p.m0); }
  lit(box(WX + .95, .30, WZ + .55, .26, .22, .20, C('#ffeec0'), PAINT), 0, .55);
  lit(ball(WX, 5.74, WZ, .17, .17, .17, C('#ff4a3a'), { mode: 1, glow: .10 }), .10, .45);

  // ---------------------------------------------------------------- 目视进近坡度指示器 the PAPI
  // Four lights beside the touchdown zone that tell an approaching pilot whether they are high or
  // low, and the only fitting on an airfield whose *colour* is information. Driven off the
  // aeroplane's actual height in the tick, so it walks white → white/red → red as it comes in.
  const PX = -24.0;
  for (let i = 0; i < 4; i++) {
    const pz = -37.4 + i * .90;
    box(PX, .40, pz, .76, .56, .50, col.steelD, { gloss: G.metal });
    S.papi.push(lit(box(PX - .40, .42, pz, .06, .34, .38, C('#ffffff'), PAINT), .30, .34));
  }

  // ---------------------------------------------------------------- 跑道剩余距离牌 distance-to-go
  // Black boards with one big numeral, counting the runway down in the direction everything here
  // rolls. Four of them across the frame is a row of receding verticals, which is depth, and the
  // numerals are real glyphs because that is the entire point of the game.
  for (const [dx, d] of [[-34, '4'], [-12, '3'], [12, '2'], [34, '1']]) {
    box(dx, 1.30, -36.5, 2.40, 1.50, .14, col.black, PAINT);
    for (const s of [-1, 1]) box(dx + s * .90, .32, -36.5, .13, .64, .13, col.steelD,
      { hard: true, gloss: G.metal });
    for (const g of glyphs(dx, 1.30, -36.5 + .09, 0, d,
      { size: 1.05, color: col.white, mode: 1, glow: .05 })) lit(g, .05, .34);
  }

  // ---------------------------------------------------------------- 机场灯标 the beacon
  // Green and white, alternating, the way every airfield in the world says "this is an aerodrome"
  // after dark. Seven metres up on the grass between the apron and the runway, on the sight line
  // from both of this zone's cameras.
  cyl(14.0, 3.60, -33.6, .15, 7.20, col.steelD, { gloss: G.metal });
  box(14.0, 7.45, -33.6, .84, .56, .74, col.steel, { hard: true, gloss: G.metal });
  S.beacon = ball(14.0, 7.45, -33.6, .40, .34, .40, C('#ffffff'), { mode: 1, glow: 0 });

  // ---------------------------------------------------------------- what follows the aeroplane
  //
  // Built at the aeroplane's own rest position so the numbers below read as offsets from its
  // centre, then flown from there. `fixed` keeps `finish` from deriving a bounding sphere off that
  // matrix: these travel 180 m and the sphere a batched prop is culled against is frozen at build
  // time, so they are given one that covers the whole movement instead of being culled against the
  // spot they happen to have been written at.
  const strobe = (dx, dy, dz, c, r) => {
    const p = ball(0, S.fy0, RZC, r, r, r, c, { mode: 1, glow: 0 });
    p.fixed = true; p.cx = RX0; p.cy = 16; p.cz = RZC; p.r = 130;
    // The scale the builder chose, remembered, because the tick rewrites the matrix in place and
    // has to put it back after collapsing the lamp for the gap between movements. Read off the
    // matrix rather than restated as a literal, so changing `r` above cannot desynchronise them.
    p.s0 = p.m[0];
    S.lamps.push(p); return [dx, dy, dz];
  };
  // Two white anti-collision strobes just aft of the wingtips, one on the tail cone, and the red
  // beacon under the belly. The shell's three lamps are the navigation lights — steady red and
  // green at the tips and the landing light in the nose; these are the other half of the fit, and
  // the double-flash below is the pattern a real one fires rather than a sine wave.
  const off = [
    ...strobe(-2.60, -.50, 15.40, C('#ffffff'), .30),
    ...strobe(-2.60, -.50, -15.40, C('#ffffff'), .30),
    ...strobe(-16.60, -.10, 0, C('#ffffff'), .26),
    ...strobe(-1.00, -1.95, 0, C('#ff4a34'), .28),
  ];
  S.lampOff = new Float32Array(off);

  // Tyre smoke, and the haze off the engines on the roll. Built at the size they reach so their
  // bounding sphere is honest, and collapsed to nothing until there is something to smoke about.
  // Four translucent props is four draw calls and they are the only four in this zone.
  for (const s of [-1, 1]) {
    const p = ball(0, .55, RZC + s * 3.30, 3.20, 2.00, 2.60, C('#d5cec1'),
      { mode: 1, alpha: .01 });
    S.smoke.push(p);
  }
  for (const s of [-1, 1]) {
    const p = ball(-9.0, 1.20, RZC + s * 5.40, 2.60, 1.20, 1.40, C('#8f8a7e'),
      { mode: 1, alpha: .01 });
    S.haze.push(p);
  }
  // NOT collapsed here. `finish` derives the bounding sphere from the matrix it finds, and a prop
  // parked at a zero matrix gets radius 0, which the apparent-size test then culls for the rest of
  // the run — a puff that can never be drawn however hard it smokes. The tick collapses them on its
  // first pass instead, which is before anything is painted: js/game.js calls `scene.tick` at the
  // top of the frame and `paintScene` at the bottom of it.

  // And the shadow it drags down the runway. Not a prop — `shade` returns the quad itself, which
  // is the only reason a moving thing in this engine can have one.
  S.shadow = shade(0, RZC, 26, 11, .30, .022);
  if (S.shadow) { S.shadow.a0 = .30; S.shadow.a = 0; }

  RUNWAY_ST = S;
};

// The daylight curve, restated. `daylight()` in js/game.js mutates a shared object and allocates
// nine arrays doing it, which is fine once a frame in the renderer and not fine a second time in
// here — so only the two numbers that decide whether the field lights are on are copied out.
const RUNWAY_AMT = [[0, .13], [4.6, .18], [6.4, .72], [8.2, 1.42], [13, 1.72],
                    [16.6, 1.52], [18.6, 1.02], [19.9, .38], [21.4, .16], [24, .13]];
function runwayNight(mins) {
  const h = ((mins / 60) % 24 + 24) % 24;
  let i = 0;
  while (i < RUNWAY_AMT.length - 2 && RUNWAY_AMT[i + 1][0] <= h) i++;
  const a = RUNWAY_AMT[i], b = RUNWAY_AMT[i + 1];
  const r = (h - a[0]) / Math.max(1e-6, b[0] - a[0]);
  const amt = a[1] + (b[1] - a[1]) * (r * r * (3 - 2 * r));
  return 1 - Math.min(1, Math.max(0, (amt - 0.14) / 1.3));
}

// Anything that moves registers here and the shell dispatches it once a frame. `t` is wall-clock
// seconds, `body` is the player, `clock` is the game clock in minutes. A tick that throws is
// dropped for the rest of the run rather than stopping the terminal — so this one is written to
// be un-throwable: every handle it uses is checked, and the one call into the shell is guarded.
AirFit['runway'].tick = (t, body, clock) => {
  const S = RUNWAY_ST;
  if (!S) return;

  // ---- 1. the field lighting, when the hour has actually moved.
  // Roughly a hundred props take a glow write here, so it is done on a change and not on a frame:
  // the clock advances a minute a second and this settles for ~60 frames between edits.
  if (typeof clock === 'number') {
    const n = runwayNight(clock);
    if (Math.abs(n - S.night) > .004) {
      S.night = n;
      for (const p of S.lit) p.glow = p.g0 + n * p.gk;
    }
  }
  const night = S.night < 0 ? 0 : S.night;

  // ---- 2. where the aeroplane is.
  // Found once by its build signature — the only 30 m capsule on the runway centreline — and read
  // off its matrix from then on, which is free. `cy === -99` is what `placeFlier` writes when it
  // takes the aeroplane off the board, so it is the honest answer to "is anything out there".
  if (!S.probed) {
    S.probed = true;
    for (const p of S.props) {
      const o = p.ob;
      if (p.mesh === 'capsule' && o && o.x === 0 && o.z === S.rz && o.sy === 30) {
        S.fp = p; S.fy0 = o.y; S.fx0 = o.x; break;
      }
    }
  }
  let flying = false, fx = 0, alt = 0;
  if (S.fp) {
    flying = S.fp.cy !== -99;
    fx = S.fp.m[12] - S.fx0;
    alt = S.fp.m[13] - S.fy0;
  } else if (typeof Airport !== 'undefined') {
    // The signature stopped matching. Three small allocations a frame beats an empty runway.
    try {
      const st = Airport.flierAt();
      if (st) { flying = !st.hidden; fx = st.x; alt = st.y - S.fy0; }
    } catch (_) { S.probed = true; }
  }
  if (alt < 0) alt = 0;

  // ---- 3. which half of the cycle this is.
  // Not asked for: `Airport.flier()` would answer it and allocate twice doing so, and the answer
  // is already in the two numbers above. A movement that arrives high is an arrival; one that
  // arrives on the wheels is a departure; the rest is watching for the moment it changes. Written
  // against x and y rather than against elapsed time on purpose — headless Chrome runs this at one
  // to three frames a second and anything phrased as a duration is wrong there.
  if (!flying) S.phase = 0;
  else if (S.phase === 0) {
    // Caught partway in, which under a harness is the normal case. The two curves only overlap in
    // altitude, never in altitude *and* x: at 0.3-3 m a departure is between x -28 and +1 and an
    // arrival between +24 and +40, and below 0.3 m an arrival has already passed +30.
    S.phase = alt > 3.0 ? 1 : alt > .30 ? (fx > 10 ? 1 : 4) : fx > 30 ? 2 : 3;
  } else if (S.phase === 1 && alt <= .12) {
    S.phase = 2; S.touchT = t; S.touchX = fx;      // main wheels down
  } else if (S.phase === 3 && alt > .30) S.phase = 4;
  const climbing = S.phase === 4, approach = S.phase === 1;

  // ---- 4. the lights on the aeroplane.
  // A real anti-collision strobe fires twice in quick succession and then waits about a second;
  // the sine wave that was here reads as a lamp on a dimmer. The belly beacon is the slow red one
  // underneath, which is on from pushback and is the light that says the engines are running.
  const ph = t - Math.floor(t / 1.35) * 1.35;
  const flash = Math.max(runwayFlash(ph), runwayFlash(ph - .30));
  const bcn = .30 + .70 * Math.pow(Math.max(0, Math.sin(t * 4.4)), 6);
  const lamps = S.lamps, off = S.lampOff;
  for (let i = 0; i < lamps.length; i++) {
    const p = lamps[i], m = p.m, o = i * 3;
    if (!flying) { p.glow = 0; m[0] = m[5] = m[10] = 0; continue; }
    m[0] = m[5] = m[10] = p.s0;
    m[12] = fx + off[o];
    m[13] = S.fy0 + alt + off[o + 1];
    m[14] = S.rz + off[o + 2];
    // The ember under the flash is not decoration. A xenon head is a white lens and reads as a
    // dot between flashes; without it these lamps are invisible in eight frames out of nine, and
    // a still of DD-airnight would be a coin toss on whether the aeroplane has any lights at all.
    p.glow = i === 3 ? bcn : .14 + flash * 1.45;
  }

  // ---- 5. the PAPI, reading the approach.
  // Two white over two red is on slope; all four white is high and all four red is low. The shell's
  // descent is far steeper than a real 3° path, so the bands are set off that curve rather than off
  // a protractor: what matters is that the pair of lights walks through the sequence while the
  // aeroplane comes down, which is the thing a passenger at the glass would actually notice.
  const papi = S.papi;
  if (papi.length === 4) {
    // How many units show white. Resting indication is the on-slope 2 when nothing is inbound.
    let white = 2;
    if (approach || S.phase === 2) {
      const h = alt;
      white = h > 22 ? 4 : h > 13 ? 3 : h > 4.5 ? 2 : h > 1.2 ? 1 : 0;
    }
    for (let i = 0; i < 4; i++) {
      // Unit 0 is the one nearest the runway and is the last to go white, which is the way the
      // real bar is read: the inner lights turn red first as you sink below the path.
      const isWhite = i >= 4 - white;
      const c = papi[i].color;
      c[0] = 1; c[1] = isWhite ? 1 : .22; c[2] = isWhite ? .94 : .16;
      papi[i].glow = papi[i].g0 + night * papi[i].gk + (isWhite ? .10 : 0);
    }
  }

  // ---- 6. the beacon, turning.
  // One white flash and one green a revolution, and dark by day: a beacon burning at noon is a
  // lamp, and a beacon that never comes on at all is a pole.
  const bp = S.beacon;
  if (bp) {
    const r = t / 2.40, u = r - Math.floor(r);
    const w = u < .10 ? 1 - u / .10 : 0;
    const g = (u > .50 && u < .60) ? 1 - (u - .50) / .10 : 0;
    const c = bp.color;
    c[0] = g > w ? .40 : 1; c[1] = 1; c[2] = g > w ? .58 : .92;
    bp.glow = Math.max(w, g) * (.25 + 1.15 * night);
  }

  // ---- 7. the windsock.
  // Weather drives it if weather.js is there and a light breeze if it is not. Calm hangs it down
  // the mast, a blow lifts it to the horizontal, and it hunts about the vertical the whole time,
  // because a sock that points steadily at one bearing is a painted arrow.
  const sock = S.sock, at = S.sockAt;
  if (sock.length === 3 && at) {
    let w = .28;
    if (typeof Weather !== 'undefined' && Weather.now && typeof Weather.now.wind === 'number')
      w = .18 + Weather.now.wind * .74;
    const gust = w * (.82 + .18 * Math.sin(t * 1.7) + .10 * Math.sin(t * 3.9 + 1.1));
    const droop = 1.30 * (1 - Math.min(1, gust));
    const yaw = .34 * Math.sin(t * .63) + .13 * Math.sin(t * 1.51 + .4);
    const M0 = S.M0, M1 = S.M1, M2 = S.M2;
    M.trans(at[0], at[1], at[2], M0);
    M.rotY(yaw, M1);
    M.mul(M0, M1, M2);
    M.rotZ(droop, M1);
    M.mul(M2, M1, M0);
    M.trans(-at[0], -at[1], -at[2], M1);
    M.mul(M0, M1, M2);
    for (const p of sock) M.mul(M2, p.m0, p.m);
  }

  // ---- 8. the smoke, the haze and the shadow.
  const smoke = S.smoke;
  const age = t - S.touchT;
  for (let i = 0; i < smoke.length; i++) {
    const p = smoke[i], m = p.m;
    if (S.phase !== 2 || age < 0 || age > 2.2) {
      if (m[0] !== 0) { m[0] = m[5] = m[10] = 0; p.cy = -99; p.alpha = .01; }
      continue;
    }
    const k = age / 2.2;                      // 0 at the puff, 1 when it is gone
    const s = .40 + k * 1.10;
    m[0] = 3.20 * s; m[5] = 2.00 * s * .8; m[10] = 2.60 * s;
    m[12] = S.touchX - 2.2 + k * 9.0;
    m[13] = .35 + k * 1.5;
    m[14] = S.rz + (i ? 3.30 : -3.30);
    p.cx = m[12]; p.cy = m[13]; p.cz = m[14];
    p.alpha = .46 * (1 - k) * (1 - k);
  }
  const haze = S.haze;
  // Behind the engines while the wheels are still on the ground and the thrust is up, thinning as
  // it climbs away. Off entirely on an arrival: an aeroplane on the rollout is at idle.
  const hz = S.phase === 3 ? .30 : climbing && alt < 9 ? .30 * (1 - alt / 9) : 0;
  for (let i = 0; i < haze.length; i++) {
    const p = haze[i], m = p.m;
    if (hz <= .002) {
      if (m[0] !== 0) { m[0] = m[5] = m[10] = 0; p.cy = -99; p.alpha = .01; }
      continue;
    }
    m[0] = 5.20; m[5] = 2.40; m[10] = 2.80;
    m[12] = fx - 10.5;
    m[13] = S.fy0 + alt - 1.30;
    m[14] = S.rz + (i ? 5.40 : -5.40);
    p.cx = m[12]; p.cy = m[13]; p.cz = m[14];
    p.alpha = hz;
  }
  const sh = S.shadow;
  if (sh) {
    if (!flying || alt > 14) sh.a = 0;
    else {
      const m = sh.m, k = 1 - alt / 14;
      m[0] = 26 * (1 + alt * .05); m[10] = 11 * (1 + alt * .05);
      m[12] = fx; m[14] = S.rz + alt * .10;
      sh.a = sh.a0 * k * k;
    }
  }
};
