// 🚪 Platform doors — The 屏蔽门 sliding leaves and their door numbers
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    platform edge, z = 3.30
//   camera  95-doors (new)
//
// The 屏蔽门 sliding leaves and their door numbers. Beijing has platform screen doors, not open
// platforms — the Transit Editor is checking exactly that.
//
// The camera IS the acceptance test, and the metro's shots are stronger than any other scene's:
// many carry a `pre` block that drives the REAL machinery — Metro.tick, Metro.openGate,
// Metro.placeTrain, g.tickStation — so a passing shot is a passing state machine, not just a
// pretty picture. Render yours with `node .audit.js 95-doors`, open the PNG, and look at it.
// A zone whose code boots but whose shot is black, empty or unchanged has not shipped.
//
// ---------------------------------------------------------------------------------------------
// WHAT WAS ALREADY HERE, AND WHERE THIS ZONE'S EDGE ACTUALLY IS
//
// The brief for this zone said "build the leaves". The leaves were already built. js/metro.js
// carries the whole screen-door carcass in its own platform-edge section: six piers at PIERX, the
// fixed lights either side of every bay, the ten sliding leaves in `panes` (four steel members and
// one 30%-alpha pane each), the 号门 number plates on the west jamb of every doorway, the header,
// the 号线色 band and the two next-train boards. `placeTrain` slides `panes` by
//
//     off = -leaf.dir * (1 - psd) * PSD_SLIDE      // PSD_SLIDE = .33, metro.js:200
//
// every frame. `panes` and `PSD_SLIDE` are closure-local to the shell and are not on `A`.
//
// So a second set of leaves would have been ten leaves of z-fighting geometry in the same bays,
// and re-numbering the doors would have put two plates on one pier. What was genuinely missing is
// everything a Beijing 屏蔽门 carries that this one did not: the 请勿倚靠 notice on the glass, a
// closing edge you can see, the interlock lamp that says whether the doorway is live, and the
// 紧急解锁装置 beside every door. That is what this file builds, and it builds it ONTO the shell's
// leaves rather than beside them.
//
// The exact ground this file occupies, so the boundary is on the record:
//
//   moving, carried by the shell's ten leaves (x quoted at the OPEN/built position, ±.33 shut)
//     请勿倚靠 bar      x dx±.61 ±.21    y 1.5375 .. 1.6625   z 3.230 .. 3.238
//     请勿倚靠 glyphs   x dx±.61 ±.184   y 1.559  .. 1.641    z 3.226
//     closing edge      x dx±(.2555...2775 inboard of the leaf centre)
//                                        y 0.18   .. 2.04     z 3.238 .. 3.294
//   static, on the shell's header
//     interlock bezel   x dx ±.15        y 2.3325 .. 2.4175   z 3.197 .. 3.225
//     interlock lens    x dx ±.095       y 2.3525 .. 2.3975   z 3.184 .. 3.198
//   static, on the shell's pier, in the clear band between the 号门 plate and the pier top
//     紧急解锁 housing  x dx-1.08 ±.1125 y 1.915  .. 2.085    z 3.220 .. 3.250
//     紧急解锁 lever    x dx-1.08 ±.05   y 1.9575 .. 2.0125   z 3.206 .. 3.228
//     紧急解锁 glyphs   x dx-1.08 ±.1015 y 2.1125 .. 2.1575   z 3.228
//
// Nothing here goes past z 3.30 — the Track agent's side of the glass is untouched. Nothing here
// is on the floor, on the yellow line, on the 盲道, on a pier below y 1.90 or on the next-train
// board — the Edge agent's fixed structure is untouched. NO COLLIDER IS ADDED BY THIS FILE.
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
// Every one of the sixty props this file hangs on a leaf goes through `A.rest`. There is a second
// trap underneath that rule which the shell's own comment does not spell out: the rest pass runs
// `p.m0 = p.m`, so `m0` and `m` are THE SAME Float32Array. Writing `p.m[12]` in a tick therefore
// writes `p.m0[12]` too, and after one frame the rest matrix is wherever the doors happened to be.
// The shell dodges it by allocating a fresh matrix every frame (`M.mul` in `placeTrain`); this
// file dodges it by taking one copy per prop on the first tick and writing in place forever after,
// which is what the frame budget below asks for.
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
// This zone spends 100 props and **ZERO translucent props**. The glass it writes on is already
// there and already costs its 30 draw calls; a decal is paint, and paint is opaque. Every prop
// here is `hard: true` with no `mat`, and every glyph is a plain atlas quad, so the whole zone
// folds into batches the shell had already opened — 0 new draw calls by construction.
//
// Check yourself: `node .fpscheck.js metro` must stay under 16.7 ms median. Take your own baseline
// BEFORE you build — the machine varies run to run. If your zone pushes it over, say so in your
// report rather than shipping it quietly.
//
// ---------------------------------------------------------------------------------------------

// 门灯 the interlock lamp's three states, made once at load and swapped by reference every frame.
// Colour and glow are per-instance and therefore free; allocating three arrays a frame to carry
// them would not be. The green is the shell's own LAMP_OPEN, so the lamp over the doorway and the
// lamp on the turnstile that let you through agree with each other about what green means.
const PSD_LAMP = {
  lock: C('#8e2f22'), lockGlow: .09,      // interlocked, no release: the forty quiet minutes
  live: C('#4fd68c'), liveGlow: .16,      // released, and it brightens as the leaves part
  warn: C('#f0a53c'), warnGlow: .40,      // 关门 — the flash that is trying to stop you
};

MetroFit['doors'] = A => {
  const { box, glyphs, thing, col } = A;
  const { EDGEZ, DOORX } = A;

  // ---- the shell's leaf geometry, restated because it is not on `A`.
  //
  // metro.js builds each leaf at `dx + s * .61` with a .56 m bottom rail, so a leaf reaches .28 m
  // to either side of its own centre, and "shut" is the position where the two leaves of a bay
  // touch on the door's centre line: `dx + s * .28`. The travel is the difference, .33 — which is
  // the shell's own PSD_SLIDE, arrived at from the leaf's dimensions rather than copied on trust.
  // If the Mech ever moves the leaves these three numbers move with them; see the ticket in the
  // report asking for PSD_SLIDE and `panes` to be published on `A` so this cannot drift silently.
  const LEAF_X = .61;                  // leaf centre offset at the OPEN/built position
  const LEAF_HALF = .28;               // half the leaf's width
  const SLIDE = LEAF_X - LEAF_HALF;    // .33 — must equal metro.js's PSD_SLIDE

  // Everything this file hangs on a leaf, with the direction that leaf travels in. Registered
  // through `A.rest` on the way in, because a prop that moves and has no rest matrix is the one
  // failure this scene is built to prevent.
  const movers = [];
  const carry = (p, dir) => { movers.push({ p, dir, bx: 0 }); A.rest(p); return p; };
  const lamps = [];

  for (let i = 0; i < DOORX.length; i++) {
    const dx = DOORX[i];

    for (const s of [-1, 1]) {
      const lx = dx + s * LEAF_X;
      // 请勿倚靠 in near-black on amber, the single most Beijing thing a screen door carries and
      // the one this platform did not have. On the SLIDING leaves rather than the fixed lights,
      // because an open leaf parks across almost the whole of the fixed light beside it (the bay
      // runs .33...93 from the door centre, the parked leaf .33...89) — a notice on the fixed
      // glass would be legible for the forty minutes an hour when there is nothing to lean on and
      // hidden for the fifteen when there is.
      //
      // Both leaves carry it, which is what a run of them looks like in a real station and is also
      // what makes the shut state read: two notices meeting in the middle of a doorway is a closed
      // door; one notice off to one side is a door somebody is standing in.
      //
      // mode 1 for the bar and for the lettering. The bar is emissive amber and the characters are
      // emissive near-black, which is what a decal backlit by the car's own interior looks like,
      // and it is how the shell's 号门 plates are made two metres away. The bar is .42 across
      // inside a .46 pane and the four characters span .367 inside the bar — both sized off the
      // glass rather than by eye, because a decal that overhangs its own leaf is a decal on air.
      carry(box(lx, 1.60, EDGEZ - .066, .42, .125, .008, col.yellow,
        { hard: true, mode: 1, glow: .07 }), s);
      for (const g of glyphs(lx, 1.60, EDGEZ - .070, Math.PI, '请勿倚靠',
        { size: .082, gap: .013, color: col.black, mode: 1, lift: .004 })) carry(g, s);
      // The closing edge. Steel on steel the leaves met in a line nobody could see: 13 m of pale
      // frame with a hairline down the middle of every bay. A metro's door edge is marked because
      // it is the part that comes at you, and 2.2 cm of orange down the leading stile is all of it.
      //
      // Set INSIDE the leading stile rather than proud of it. Proud, the two edges of a shut bay
      // overlap by 28 mm and spend the fifteen-minute dwell z-fighting each other in the exact
      // middle of the frame; flush, they stop 5 mm apart, which is a shut door. y 0.18..2.04 is
      // the clear run between the leaf's own bottom and top rails.
      carry(box(lx - s * .2665, 1.11, EDGEZ - .034, .022, 1.86, .056, col.orange,
        { hard: true, gloss: .14 }), s);
    }

    // 门灯 the interlock lamp, one over every doorway, on the header above the 号线色 band.
    //
    // This is the piece that makes the doors mean something rather than merely move. A screen door
    // is interlocked with the train: the platform side cannot be released until a car is berthed
    // with its own doors enabled, and the lamp over the opening is how the platform is told which
    // of those it is looking at. Locked is a dull red, live is green and brightens as the leaves
    // part, and the closing 0.9 minutes flash amber — the 关门 warning, which is the one moment on
    // a platform when a light is trying to stop you rather than inform you.
    //
    // y 2.375 is the only clear band on the header: the 号线色 stripe ends at 2.315 and the header
    // itself at 2.44. z 3.197..3.225 puts the bezel flush against the header's own face, and the
    // hanging station-name sign at z 2.00 clears the sightline from the painted mark by 12 cm.
    box(dx, 2.375, EDGEZ - .089, .30, .085, .028, col.charcoal, { hard: true, gloss: .30 });
    lamps.push(box(dx, 2.375, EDGEZ - .109, .19, .045, .014, PSD_LAMP.lock,
      { hard: true, mode: 1, glow: PSD_LAMP.lockGlow }));

    // 紧急解锁装置 the emergency release, on the pier beside every door.
    //
    // Every screen door in the country has one, and it is the reason a passenger is willing to
    // stand behind glass on a platform at all: the doors can be released from the platform side by
    // hand when the interlock has failed. A green box, a handle, and the four characters.
    //
    // On the pier and not on the fixed light, for the same reason the notice is not — the parked
    // leaf covers the fixed light. The pier is the only surface in this bay visible in every state
    // of the doors, and the band between the shell's 号门 plate (which ends at 1.865) and the top
    // of the pier (2.20) is the only part of it still free: the lightboxes take .30 to 1.58. So
    // the release stacks directly above the number of the door it belongs to, which is also how
    // anybody would describe where it is.
    const px = dx - 1.08;
    box(px, 2.00, EDGEZ - .065, .225, .17, .03, col.jade, { hard: true, gloss: .26 });
    box(px, 1.985, EDGEZ - .083, .10, .055, .022, col.red, { hard: true, gloss: .34 });
    glyphs(px, 2.135, EDGEZ - .068, Math.PI, '紧急解锁',
      { size: .045, gap: .008, color: col.white, mode: 1, glow: .06, lift: .004 });
  }

  // 屏蔽门 itself, which is on the roadmap's list of the metro's untaught words (UPGRADES.md:652)
  // and is the one word this zone exists for. Focused on the painted queue mark of the fourth
  // door: `A.WALK.queue` is the shell's own list of where a body stands to board, so the focus
  // point is one the walk graph already guarantees is clear rather than a spot picked off a
  // drawing. Reach 1.9 keeps it local to that door — the shell's 地铁 verb sits on the centre line
  // with a 2.4 m reach and has to keep winning where a body actually boards.
  //
  // No collider is added anywhere in this file, so nothing here can swallow the focus point of
  // 地铁, of the lightbox words on the piers, or of its own.
  thing('屏蔽门', DOORX[3], 1.62, EDGEZ - .34,
    '屏蔽门开了才能上车。', 'You can only board once the screen doors open.',
    '屏 to screen + 蔽 to shield + 门 door. Beijing platforms are walled off by them; they are '
    + 'interlocked with the train and open only while it is standing at the platform.',
    { focus: [DOORX[3], EDGEZ - .90], reach: 1.9 });

  // ---------------------------------------------------------------- what the tick has to know
  // Handed over as one object built ONCE, here, the way the gate zone hands over its lanes. The
  // tick allocates nothing and looks nothing up.
  MetroFit['doors'].rig = { movers, lamps, slide: SLIDE, trainAt: A.trainAt, ready: false };
};

// Anything that moves registers here and the shell dispatches it once a frame, BEFORE the shell's
// own train placement, so you can read the clock it is about to act on. Do not start your own
// timer. `t` is wall-clock seconds, `body` is the player, `clock` is the game clock in minutes.
// A tick that throws is dropped for the rest of the run rather than stopping the station.
//
// The whole of this zone's movement is a pure function of `A.trainAt(clock).psd`, read fresh every
// frame and never cached, so it cannot disagree with the leaf it is painted on: the shell works
// out `-dir * (1 - psd) * PSD_SLIDE` from that same number a few lines later in the same frame.
// Nothing here counts, accumulates or remembers, which is why a clock that jumps — a night's
// sleep, a shift, a flight — finds the notices exactly where the leaves under them are.
MetroFit['doors'].tick = (t, body, clock) => {
  const rig = MetroFit['doors'].rig;
  if (!rig) return;
  const movers = rig.movers, lamps = rig.lamps;

  // One pass, once, after the shell's rest capture: take each prop its OWN matrix.
  //
  // `A.rest` runs `p.m0 = p.m`, which leaves the two names pointing at one Float32Array. Writing
  // `p.m[12]` in place — which is what a tick that allocates nothing has to do — would therefore
  // move the rest matrix along with the prop, and one frame later "shut" would mean wherever the
  // door had got to. The copy is the fix, it costs sixty allocations once, and after it `m0` is
  // the position these props were built in and can never be anything else.
  if (!rig.ready) {
    for (let i = 0; i < movers.length; i++) if (!movers[i].p.m0) return;
    for (let i = 0; i < movers.length; i++) {
      const it = movers[i], p = it.p;
      it.bx = p.m0[12];
      p.m = new Float32Array(p.m0);
    }
    rig.ready = true;
  }

  const train = rig.trainAt(clock);
  const psd = train.psd, phase = train.phase;

  // How far in from the built (open) position the leaves are this frame. Identical arithmetic to
  // metro.js's `placeTrain`, off the identical `psd`.
  const shut = (1 - psd) * rig.slide;
  for (let i = 0; i < movers.length; i++) {
    const it = movers[i], p = it.p, off = -it.dir * shut, x = it.bx + off;
    p.m[12] = x;
    p.cx = x;
    // `ob` is the box the cursor is tested against. Glyph quads have none; the plates do, and a
    // plate whose pick box stayed where the door used to be is the same bug as a train that is
    // still clickable after it has left.
    if (p.ob) p.ob.x = p.obx0 + off;
  }

  // The lamp. `psd > 0` is not the test: `psd` is 0 both when the train is still two minutes out
  // and when it has gone, and 'closing' has a `psd` that is briefly indistinguishable from
  // 'opening'. The phase is the only thing that separates a door about to release from one about
  // to bite, so the phase is what is read.
  let c = PSD_LAMP.lock, g = PSD_LAMP.lockGlow;
  if (phase === 'opening' || phase === 'berthed') {
    c = PSD_LAMP.live; g = PSD_LAMP.liveGlow + .24 * psd;
  } else if (phase === 'closing') {
    c = PSD_LAMP.warn; g = Math.sin(t * 14) > 0 ? PSD_LAMP.warnGlow : .06;
  }
  for (let i = 0; i < lamps.length; i++) { lamps[i].color = c; lamps[i].glow = g; }
};
