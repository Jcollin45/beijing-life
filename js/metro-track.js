// 🕳️ Trackside · tunnel — The running tunnel, the rails, the two bore mouths, the signals, the bore-glow and the passing- train light sweep
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    z 3.12..5.2, behind the doors
//   camera  97-notrain, 97b-arriving
//
// The running tunnel, the rails, the two bore mouths, the signals, the bore-glow and the passing-
// train light sweep. Owns the second unseen train (PASS_EVERY = 34 s).
//
// ---------------------------------------------------------------------------------------------
// WHAT WAS ALREADY HERE, AND WHY THIS FILE BUILDS WHAT IT BUILDS
//
// METRO.md hands this zone "the rails and their chairs, the two bore mouths, the tunnel lining
// rings, the cable trays down the wall, the signal heads, the distance markers, the bore-glow and
// the sweep". Measured against js/metro.js rather than against the table, most of the first half
// of that list ALREADY EXISTS in the shell and is not extractable, because metro.js is the Mech's
// file and locked:
//
//   metro.js:372 trackside()   the bed, 25 sleepers, both running rails, the conductor rail, the
//                              rear tunnel wall, BOTH bore mouths with their concrete rings, a
//                              signal lamp at each mouth, and four painted converging lamps up
//                              each bore.
//   metro.js:369 boreGlow[]    the two mouth washes, driven by metro.js:2531 off trainAt().
//   metro.js:2039 sweep        one floor glow on the PLATFORM at z EDGEZ-.95, driven by the
//                              shell's own PASS_EVERY=34 timer at metro.js:2342/2546.
//
// So this file does NOT rebuild any of that. It builds what measurement says is missing, and the
// measurement that decided every placement below is the SIGHTLINE, not the plan:
//
//   * The platform screen wall (metro.js:1313) is 2.20 m tall at z 3.30. The 97-notrain and
//     97b-arriving eye sits at y~1.8, z~-2.9. The ray that grazes the screen top reaches the rear
//     tunnel wall (z 5.12) at about y 2.3. EVERYTHING BELOW y 2.3 ON THE TRACKSIDE IS BEHIND A
//     2.2 m WALL from every camera and every place a player can stand.
//   * The berthed car's floor slab (metro.js:1581) is y -.02..0.10 and spans z 3.38..5.12 — it
//     swallows the sleepers and both rails whole. Its roof is y 2.57..2.75, its back wall face is
//     z 5.105, and the tunnel wall face is z 5.12: FIFTEEN MILLIMETRES of clear space.
//
//   Consequence, and it is the finding worth carrying out of this zone: rail chairs, fastenings,
//   a drainage channel and a cess walkway — the things the plan asks for by name — cannot be seen
//   by anybody, ever. They are under a floor slab, behind a wall, in an unlit hole. Building them
//   would spend props on geometry with no viewer. They are not built. The trackside reads instead
//   from the one surface that IS in view: the band of tunnel wall and crown ABOVE the screen and
//   ABOVE the train, which is exactly the band a Beijing platform with half-height 屏蔽门 shows
//   you, and which was previously flat black.
//
// The 1.5 cm rule is why the cable run is at haunch height rather than at waist height: cables in
// a bored tunnel are hung high, above the train's dynamic envelope, precisely because the bottom
// of the bore is full of train. The physically correct place is also the only visible one.
//
// ---------------------------------------------------------------------------------------------
// THE m0 RULE
//
// Nothing in this zone rewrites a prop matrix. The two signal repeaters change `color` and `glow`
// only — the same thing metro.js:2512 does to the shell's own signal lamps, and neither `color`
// nor `glow` touches the cull data the draw loop reads off `m`. They are still registered with
// `A.rest()` so that an `m0` exists if anyone later decides to move them.
//
// The sweep is four `glow` quads. Glows are NOT props: build.js:179 pushes them to their own list
// and game.js:8621 draws them in a separate additive pass, so they never enter the rest pass at
// all — which is why the shell's own sweep glow (metro.js:2039) is not rested either. Writing
// `g.m` and `g.a` every frame is the sanctioned way to move one.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET
//
// Budget 160 props / 8 translucent. This zone spends about 58 props and FOUR glows, and adds no
// translucent props at all. Everything batches: one box batch at mode 1 (ribs + the mouth ring
// crowns), one lit box batch (trays, brackets, plates, signal hoods), one cyl batch (cables +
// lamps), one glyph batch. No `mat`, no `matScale`, one `round`/`bevel` setting throughout.
//
// The tick allocates nothing: the four glow matrices are rewritten in place through M.trs/M.mul
// into the object the builder made, and a moving glow keeps the quad it was built with.
//
// ---------------------------------------------------------------------------------------------

// The shell's own numbers for the second, unseen train, mirrored here so this zone's light agrees
// with the shell's to the frame. See THE SYNC NOTE on `tick` below for why this is a copy and not
// a read, and ticket T1 in the report for the one-line change to js/metro.js that would fix it.
const TRACK_PASS_EVERY = 34;    // metro.js:2342
const TRACK_PASS_DUR   = 6.4;   // metro.js:2342
const TRACK_APPROACH   = 2.2;   // metro.js:2232

// Everything the tick touches. Module scope so `tick` and `probe` can reach it. `trkA` is the
// toolkit itself: `A` is handed to the BUILDER only, and the tick needs `A.trainAt` — which is
// wrapped in metro.js:2071 precisely so it resolves at call time rather than at hand-over.
let trkA = null;
let trkRake = null, trkCrown = null, trkFlare = [], trkLamps = [];
let trkPassAt = 0, trkPassing = -1, trkPassLeft = true, trkAmp = 0, trkSx = 0;
let trkRX = 6.4;
// 红 / 黄 / 绿. Built in the builder, where `A.C` is in hand.
let TRK_RED = null, TRK_AMBER = null, TRK_GREEN = null;

MetroFit['track'] = A => {
  const { box, cyl, glyphs, glow, thing } = A;
  const { C, G, col } = A;
  const { RX, RZ, EDGEZ } = A;
  trkA = A;
  trkRX = RX;
  TRK_RED = C('#e0644c'); TRK_AMBER = C('#e8b23a'); TRK_GREEN = C('#4fd68c');

  // The face of the rear tunnel wall (metro.js:385 puts the wall at z 5.12..5.20) and the two
  // heights that matter: the top of the berthed car's roof, and the top of the screen wall.
  const WALLZ = RZ - .08;          // 5.12, the face a viewer sees
  const ROOFTOP = 2.75;            // metro.js:1588, the car roof's upper face
  const CROWN = 3.06;              // as high as anything goes before the ceiling slab

  // ---------------------------------------------------------------- 管片 the lining rings
  // Eleven ribs down the rear wall at 1.16 m, which is about the pitch a segmental ring is built
  // at. They start at y 2.26 — under the sightline computed in the header, so their feet are lost
  // behind the screen the way a real ring is lost behind the platform — and stop at the crown.
  //
  // 1 cm proud of the wall, and that is not timidity: the berthed car's back face is at z 5.105
  // and the wall is at 5.12, so a rib 1 cm deep clears a standing train by five millimetres. Any
  // thicker and the tunnel grows through the back of the carriage.
  //
  // Their real job is not to be looked at. A travelling light on a featureless black wall is a
  // blob; the same light crossing eleven ribs is a train going past. The sweep below is what
  // makes them worth the eleven props, and they are what makes the sweep read as motion.
  const RIB_N = 11, RIB_X0 = -5.80, RIB_DX = 1.16;
  const RIBY = (2.26 + CROWN) / 2, RIBH = CROWN - 2.26;
  const dark = { hard: true, mode: 1 };
  for (let i = 0; i < RIB_N; i++)
    box(RIB_X0 + i * RIB_DX, RIBY, WALLZ - .005, .085, RIBH, .01, col.boreL, dark);

  // ---- and the same trick on the two mouth faces. The shell paints depth up each bore with four
  // converging lamps (metro.js:423); these are the ring crowns those lamps hang from, receding to
  // the same vanishing point so the two readings agree instead of arguing.
  //
  // The 5 cm offset is the shell's and it is load-bearing: the mouth face is a 6 cm slab centred
  // on ±6.38 and the berthed car ends at ±6.30, so 6.30..6.35 is the only band a mark can sit in
  // and be seen both with a train in and with the platform empty.
  {
    const mz = (EDGEZ - .18 + RZ) / 2, mw = RZ - (EDGEZ - .18);   // 4.16, 2.08
    const BORE_H = 2.62;
    const vpy = BORE_H * .42, vpz = mz - .12;   // the shell's vanishing point, metro.js:421
    const y0 = 2.40, z0 = mz, d0 = mw * .84;
    for (const s of [-1, 1]) {
      const mx = s * (RX - .02);
      for (let k = 0; k < 3; k++) {
        const u = (k + 1) / 4;
        box(mx - s * .05, y0 + (vpy - y0) * u, z0 + (vpz - z0) * u,
          .008, .026, d0 * (1 - u * .62), col.boreL, dark);
      }
    }
  }

  // ---------------------------------------------------------------- 电缆桥架 the cable run
  // The one thing in this zone that is in view whatever the train is doing, because it sits above
  // both the screen wall and the roof of a berthed car. Two racks and four cables at the haunch,
  // carried on a bracket at every ring.
  //
  // Lit, not mode 1: the centre batten (metro.js:1937) runs at z 2.60 with its lights at y 3.08
  // and a radius of 3.8, so the haunch is about 2.6 m from a real light and picks up a genuine
  // fall-off along the wall. That fall-off is the only modelling in this room that says the
  // tunnel is a different place from the platform, so it is worth being lit for.
  const steelish = { hard: true, gloss: .22 };
  const TRAY = [2.845, 2.975];
  for (const ty of TRAY) box(0, ty, 5.06, 12.68, .045, .075, col.granite, steelish);
  for (let i = 0; i < RIB_N; i++)
    box(RIB_X0 + i * RIB_DX, 2.91, 5.07, .05, .22, .10, col.granite, steelish);
  // The cables themselves, two to a rack. A cyl laid along x by rz — same as the shell's signal
  // lamps, so they land in the same batch.
  // Both racks run 5.0225..5.0975 in z, so the cables are set at 5.040 and 5.078 to sit in them.
  const lie = { rz: Math.PI / 2, gloss: .10 };
  for (const [cy, cz, cc] of [[2.896, 5.040, col.black],    [2.896, 5.078, col.charcoal],
                              [3.026, 5.040, col.charcoal], [3.026, 5.078, col.black]])
    cyl(0, cy, cz, .028, 12.6, cc, lie);

  // ---------------------------------------------------------------- 标志 what a tunnel carries
  // Three plates in the slot between the top of the screen wall and the underside of a berthed
  // car's roof — the one horizontal band of tunnel a waiting passenger can actually read. The
  // signs a Beijing running tunnel carries and nothing invented: the live-rail warning, a
  // kilometre post, and a speed restriction.
  //
  // Real characters at .11, which at the eight metres these cameras stand off is about the
  // smallest that survives; smaller and the apparent-size cull drops them before the eye does.
  const SIGNS = [
    [-4.05, '当心触电', col.red,     col.white],
    [    0, 'K2+150',   col.cream,   col.charcoal],
    [ 4.05, '限速65',   col.yellow,  col.charcoal],
  ];
  for (const [sx, txt, plate, ink] of SIGNS) {
    box(sx, 2.46, WALLZ - .02, [...txt].length * .142 + .13, .26, .022, plate, steelish);
    glyphs(sx, 2.46, WALLZ - .034, Math.PI, txt,
      { size: .11, gap: .032, color: ink, mode: 1, glow: .06 });
  }

  // ---------------------------------------------------------------- 信号 the repeaters
  // The shell's two signal lamps (metro.js:400) sit at y 1.62 — which the measurement in the
  // header says is behind the screen wall from every camera, and behind the car's flank whenever
  // one is standing. So the station's signals were, in practice, never visible.
  //
  // These are their repeaters, mounted on the side wall above the bore ring at y 2.86, which is
  // above the screen, above a berthed roof, and in shot from the middle of the platform. Three
  // aspects rather than the shell's two, because a tunnel signal that only ever says stop or go
  // has nothing to say about a train that is on its way: 红 while the road is occupied, 黄 while
  // one is closing on the platform, 绿 when the road is clear.
  for (const s of [-1, 1]) {
    box(s * (RX - .12), 2.86, 4.30, .22, .05, .05, col.steelD, steelish);
    box(s * (RX - .35), 2.86, 4.30, .10, .28, .16, col.charcoal, steelish);
    trkLamps.push(A.rest(cyl(s * (RX - .41), 2.86, 4.30, .052, .03, C('#e0644c'),
      { rz: Math.PI / 2, mode: 1, glow: .34 })));
  }

  // 隧道. The zone's own noun, and the metro had no word for the hole its trains come out of. The
  // focus is on the platform at the west end — the mirror of the shell's 信号 at the east end
  // (metro.js:1565, focus [5.45, 2.45]) — because the label itself hangs 2.9 m up in a tunnel
  // nobody can walk into, and a focus point out there could never be reached.
  //
  // Checked clear of both existing focus points on this side of the gates: 信号 at [5.45, 2.45]
  // and 地铁 at [0, 1.90]. This one is at [-4.60, 2.45], 1.5 m from the nearer of them.
  thing('隧道', -(RX - .35), 2.86, 4.30, '车从隧道里出来。',
    'The train comes out of the tunnel.',
    '隧道 tunnel. 地铁在隧道里跑；洞 is a hole, 隧道 is a bored one. 限速 speed limit.',
    { focus: [-4.60, EDGEZ - .85], reach: 1.7 });

  // ---------------------------------------------------------------- 对面的车 the second train
  // The one you never see. The shell throws its light on the PLATFORM floor (metro.js:2589) and
  // through the windows of the car standing here — which is the light after it has come round the
  // corner. What was missing is the light in the tunnel itself, and physically that is the part
  // that happens first and brightest: the train is in the bore, so the bore lights, and what
  // reaches a passenger over the top of the 屏蔽门 is a band of it travelling along the crown.
  //
  // Four glows and no more. Additive, no depth write, invisible at a = 0, and mode 5 fades them
  // off at all four edges, which is what light in a tunnel does and what a box cannot do: an
  // unlit box at glow 0 still draws its own colour, so a pale panel hung up there would be a pale
  // panel up there all day.
  //
  // They are placed ABOVE the screen wall on purpose. A glow behind the 屏蔽门 glass is depth-
  // tested against it (game.js:8595 drops the depth MASK, not the depth TEST), so the honest
  // place for this light is the band that has nothing in front of it — which is also the band a
  // real platform shows you.
  const LIGHT = C('#c6d2dc');
  // The rake down the rear wall: a tall soft quad travelling in x, facing back into the room.
  // rotX(π/2) stands the quad up, then rotY(π) turns it to face -z — in that order, because a
  // yaw applied to a normal still pointing at the ceiling moves nothing.
  trkRake = glow(M.mul(M.trans(0, 2.55, 5.09),
    M.mul(M.rotY(Math.PI), M.mul(M.rotX(Math.PI / 2), M.scale(5.0, 1, 1.9)))), LIGHT, 0);
  // The wash on the crown, seen from underneath, so the quad is turned over: rotX(π) takes the
  // normal from +y to -y. Without it the only face pointing at the camera is a back face and the
  // whole effect is culled — silently, which is the way this fails.
  trkCrown = glow(M.mul(M.trans(0, 3.22, 4.30),
    M.mul(M.rotX(Math.PI), M.scale(5.6, 1, 1.9))), LIGHT, 0);
  // And a flare in each mouth as it runs in and out of the bore. These can never fight the
  // shell's own boreGlow: that one only lights in phase `approach`/`departing`, and a pass is
  // gated on phase `away`, so the two are never on in the same frame.
  for (const s of [-1, 1]) {
    const mz = (EDGEZ - .18 + RZ) / 2, mw = RZ - (EDGEZ - .18);
    trkFlare.push(glow(M.mul(M.trans(s * 6.33, 2.62 * .40, mz),
      M.mul(M.rotY(-s * Math.PI / 2),
        M.mul(M.rotX(Math.PI / 2), M.scale(mw * .74, 1, 2.62 * .70)))), LIGHT, 0));
  }
};

// Anything that moves registers here and the shell dispatches it once a frame, BEFORE the shell's
// own train placement, so you can read the clock it is about to act on.
//
// THE SYNC NOTE. The state machine below is a line-for-line copy of the shell's at metro.js:2546.
// That is deliberate and it is exact, not approximate: this tick is dispatched from the top of
// Metro.tick (metro.js:2488) with the same `t` and the same `clock` the shell is about to use, and
// runs BEFORE the shell's own copy in the same frame — so identical inputs through identical code
// leave both in the identical state, and this zone's light and the shell's floor sweep move as one
// object. It is a copy because `passing`/`passAt`/`passLeft` are private to metro.js and nothing
// on the api or on `A` exposes them. Ticket T1 asks the Mech for `passNow()`; until then, a change
// to PASS_EVERY, PASS_DUR or APPROACH in metro.js must be mirrored in the three constants at the
// top of this file. The failure mode if it is not is benign — the tunnel light leads or lags the
// floor sweep — but it is a lie, so it is worth the ticket.
MetroFit['track'].tick = (t, body, clock) => {
  // A tick that runs before its own builder did — or after it threw — has nothing to drive.
  if (!trkA) return;
  const train = trkA.trainAt(clock);
  if (!train) return;

  // ---- the second train, on the shell's timer. See THE SYNC NOTE above.
  if (!trkPassAt) trkPassAt = t + 9;
  if (trkPassing < 0 && t >= trkPassAt && train.phase === 'away'
      && train.toGo > TRACK_APPROACH + TRACK_PASS_DUR) {
    trkPassing = t;
    trkPassLeft = !trkPassLeft;
  }
  if (trkPassing >= 0 && t > trkPassing + TRACK_PASS_DUR) {
    trkPassing = -1;
    trkPassAt = t + TRACK_PASS_EVERY;
  }
  const k = trkPassing < 0 ? 0 : (t - trkPassing) / TRACK_PASS_DUR;
  const amp = trkPassing < 0 ? 0 : Math.sin(Math.min(1, Math.max(0, k)) * Math.PI);
  const sx = (trkPassLeft ? -1 : 1) * (trkRX + 3.2) * (1 - k * 2);
  trkAmp = amp; trkSx = sx;

  // ---- and where its light falls. Matrices written in place; nothing allocated that the frame
  // does not already own, and a moving glow keeps the quad it was built with.
  if (trkRake) {
    trkRake.a = amp * .30;
    trkRake.m = M.mul(M.trans(sx, 2.55, 5.09),
      M.mul(M.rotY(Math.PI), M.mul(M.rotX(Math.PI / 2), M.scale(5.0, 1, 1.9))));
  }
  if (trkCrown) {
    trkCrown.a = amp * .20;
    trkCrown.m = M.mul(M.trans(sx * .92, 3.22, 4.30),
      M.mul(M.rotX(Math.PI), M.scale(5.6, 1, 1.9)));
  }
  // The mouths brighten as it runs into and out of the bore, which is where the light of a train
  // you cannot see actually is: up the tunnel, before and after it crosses the platform.
  if (trkFlare.length === 2) {
    const lip = 5.2, span = 4.4;
    trkFlare[0].a = amp * Math.min(1, Math.max(0, (-sx - lip) / span)) * .55;
    trkFlare[1].a = amp * Math.min(1, Math.max(0, (sx - lip) / span)) * .55;
  }

  // ---- 信号 three aspects, off the same timetable that placed the train. Colour and glow only:
  // neither touches the cull data, which is why these need no matrix rewrite.
  if (trkLamps.length === 2) {
    const clear = train.phase === 'away';
    const soon = clear && train.toGo <= TRACK_APPROACH + 2;
    const c = !clear ? TRK_RED : soon ? TRK_AMBER : TRK_GREEN;
    for (const p of trkLamps) { p.color = c; p.glow = clear && !soon ? .30 : .40; }
  }
};

// Read-only, for the harness. The sweep is the most atmospheric thing in this station and it is
// entirely invisible to a still frame taken at the wrong second, so it needs to be measurable:
// an animation nobody can measure is one that quietly stops working. Drive it by calling
// Metro.tick(t, g.P, clock) with a rising `t` and read this between calls — never by waiting on
// the wall clock, because headless Chrome runs this game at one to three frames a second.
MetroFit['track'].probe = () => ({
  passing: trkPassing >= 0,
  amp: +trkAmp.toFixed(4),
  x: +trkSx.toFixed(3),
  rake: trkRake ? +trkRake.a.toFixed(4) : null,
  crown: trkCrown ? +trkCrown.a.toFixed(4) : null,
  flareW: trkFlare[0] ? +trkFlare[0].a.toFixed(4) : null,
  flareE: trkFlare[1] ? +trkFlare[1].a.toFixed(4) : null,
  aspect: trkLamps[0] ? trkLamps[0].color : null,
});
