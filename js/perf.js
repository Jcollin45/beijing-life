// Frame rate: measure it, show it, and act on it.
//
// The renderer has no idea what machine it is on. A recent laptop draws this street at 120 fps
// and an old integrated chip at 25, and the difference is mostly fill rate: the shadow pass
// draws the world a second time, and the canvas may be running at twice the CSS resolution on
// a retina display. Both are worth paying for when there is headroom and the first things that
// should go when there is not.
//
// So: a rolling frame-time meter, and a ladder of quality levels the game walks up and down on
// its own. The rules that matter are the ones that stop it flickering between levels —
// separate thresholds for dropping and raising, several bad windows before a drop, more good
// ones before a climb, and a hard rule that a single very long frame is a stall (a place
// change, a garbage collection, the tab coming back) and not a frame rate at all.
const Perf = (() => {
  // ---- the ladder. 0 is everything on; each step down gives back roughly a third of the
  // frame. `scale` is a multiplier on the canvas resolution, which is by far the biggest lever.
  //
  // `smallFar` / `smallR`: beyond that many metres, stop drawing props whose bounding radius is
  // under that many metres. Three and a half thousand props survive the frustum test in the
  // middle of the street and most of them are a bicycle bell or a peg on a washing line, two
  // pixels across and one full draw call each. Culling by apparent size keeps every wall, roof
  // and tree and throws away the things nobody could see anyway — which on a slow machine
  // matters more than resolution, because the cost there is draw calls, not fill.
  const LEVELS = [
    // `bloom` is the post chain: a multisampled scene target, a bright pass and four half-size
    // blur passes. It is bought with fill rate, which is the one thing the bottom two tiers are
    // short of — they exist because a machine could not hold the 60 Hz budget without giving
    // something up,
    // and a glow around the lanterns is the easiest thing in the game to give up.
    // `rain` is the fraction of the weather's particles that get drawn. Each drop is its own draw
    // call, so a heavy shower is a couple of hundred of them a frame — cheap next to three thousand
    // props, but not free, and the bottom tier is short of exactly this. Halving the count reads as
    // lighter rain rather than as no rain, which is the right thing to lose.
    // ---- how far you can see, and why these numbers just changed
    //
    // `smallFar`/`smallR` drop anything smaller than smallR beyond smallFar. That is the thing
    // you notice as popping: walk forward and the bins, the bottles, the shelf goods and the
    // signage arrive in a wave a few metres ahead of you. It was tuned when every prop cost its
    // own draw call plus ten uniform uploads, so throwing away the small ones at distance was
    // most of the frame budget on the lower tiers.
    //
    // Instanced drawing removed that cost: the street went from 8,376 draw calls a frame to 424,
    // the mall from 9,928 to 1,077, and the depth pass from 6,727 to 31. A distant small prop is
    // now a few extra instances in a buffer that was being uploaded anyway. So the cull is gone
    // entirely on the top two tiers and pushed a long way out on the bottom two.
    //
    // `npcFar` was held back on the first pass through these numbers because people were the one
    // thing still drawn the old way, fifty to a hundred draw calls each. They are collected and
    // instanced now — every person in the room, their clothes, faces and whatever they are
    // carrying, comes out as about twenty calls a frame whatever the crowd — so the reason for
    // holding it back is gone and these are roughly doubled.
    //
    // What is left is not free: each extra person is still their own triangles, and fill rate is
    // what the bottom tiers are short of. But it is now the *only* cost, where before it was that
    // plus a draw call per body part. 95 m covers the shopping centre end to end and most of the
    // terminal; past that a figure is a few pixels tall and the far LOD it drops to has already
    // thrown away everything you could have seen.
    // ---- `minPx` and `shadowMinR`: how small a thing has to be before it stops being drawn.
    //
    // `smallFar`/`smallR` above are a blunt pair — "past 48 m, drop anything under 32 cm" — and
    // they were switched off entirely on the top two tiers when instancing landed, on the
    // reasoning that a distant small prop is now a few extra floats in a buffer. That reasoning
    // held for the *draw call* and not for anything else. The shopping centre draws 15,546 props
    // in a frame, and every one of them is still a bounding-sphere test, a matrix copied into the
    // instance buffer, and its share of two megabytes uploaded to the GPU. Most of them are a
    // jar on a shelf on the far side of an atrium, two pixels across.
    //
    // `minPx` asks the question that actually matters: how many pixels high is this thing from
    // here. A sphere of radius r at depth w covers about `r * fy * H / w` pixels, so the test is
    // one multiply and it is correct at every distance, every field of view and every window
    // size — where a fixed 48 m threshold is wrong the moment somebody resizes the window or
    // zooms the camera. It also scales itself with the quality ladder for free, because H is the
    // drawing buffer and the ladder is already shrinking that.
    //
    // 1.4 px at 高 is below what a stable raster sample can show. Low and Basic raise the static
    // cutoff only after the frame ladder has established that the fuller tiers miss the display
    // budget. Moving street users have their own much lower cutoff, while NPC range and authored
    // character identity remain separate settings.
    //
    // `shadowMinR` is the same idea for the depth pass, where apparent size is meaningless
    // because the camera is the sun. What matters there is the shadow map's own resolution:
    // 1280 texels across a 48 m box is 38 mm a texel, so a prop under about 10 cm across cannot
    // cast a shadow more than three texels wide and is being blurred away by the soft-shadow
    // filter regardless. It used to be `smallR * 1.4`, which on the top two tiers was zero — the
    // depth pass drew the entire street a second time including every bottle cap.
    // High keeps the complete lighting chain and the widest view distance. At 0.90 resolution a
    // Retina screen still renders at 1.8 device pixels per CSS pixel, while saving 19% of every
    // full-screen/MRT pass. A 1280 shadow remains above Medium's 1024 tier. Neither setting changes
    // character geometry, texture choice, pose or same-identity LOD selection.
    { name: '高',  en: 'high',   scale: 0.90, shadow: 1280, shadowHalf: 24, bloom: 0.62, ao: 0.55,
      npcFar: 62, lod0: 4.5, lod1: 11, smallFar: 999, smallR: 0, rain: 1.00,
      minPx: 1.4, dynamicMinPx: 1.4, shadowMinR: 0.10, glyphAssist: 1 },
    { name: '中',  en: 'medium', scale: 0.84, shadow: 1024, shadowHalf: 20, bloom: 0.55, ao: 0.40,
      npcFar: 52, lod0: 3.5, lod1: 8, smallFar: 999, smallR: 0, rain: 0.80,
      minPx: 1.6, dynamicMinPx: 1.6, shadowMinR: 0.15, glyphAssist: 1 },
    { name: '低',  en: 'low',    scale: 0.70, shadow: 768,  shadowHalf: 16, bloom: 0,    ao: 0,
      npcFar: 40, lod0: 2.5, lod1: 6, smallFar: 48, smallR: 0.32, rain: 0.55,
      minPx: 4.2, dynamicMinPx: 2.4, shadowMinR: 0.26, glyphAssist: 0 },
    // The fallback tier is the 60 Hz safety net, not a different cast. It keeps every nearby
    // resident/vehicle and the same authored character assets, but uses the validated far mesh
    // sooner and stops submitting sub-pixel street fittings. Half-resolution on a Retina canvas
    // is still one physical pixel per CSS pixel; 0.60 needlessly oversampled the screen after the
    // machine had already proved that it could not meet the frame budget at the fuller tiers.
    { name: '最低', en: 'basic',  scale: 0.50, shadow: 0,    shadowHalf: 0,  bloom: 0,    ao: 0,
      npcFar: 30, lod0: 2.0, lod1: 4.5, smallFar: 18, smallR: 0.85, rain: 0.20,
      minPx: 18.0, dynamicMinPx: 2.5, shadowMinR: 0.40, glyphAssist: 0 },
  ];

  // ---- how small is too small, indoors. APARTMENT-TODO item 422.
  //
  // `minPx` at 最低 is 18.0: nothing under eighteen pixels high is submitted at all. Outdoors that
  // is the setting doing exactly its job — a bicycle bell across the hutong is two pixels and one
  // more instance in a buffer nobody can resolve. Indoors it inverts. In the apartment, eighteen
  // pixels at a normal indoor camera distance is the cutlery, the light switches, the bowls, the
  // door handles and the tap: most of what makes a flat read as somebody's home rather than as a
  // box with furniture in it. A tier that deletes all of that has switched the art direction off
  // as surely as the same tier's `shadow: 0` does.
  //
  // The decision item 422 asks for, then, is not "may the flat reach 最低" — it may, that tier is
  // the 60 Hz safety net and 60 fps outranks looks. It is *what 最低 is allowed to take away
  // indoors*, and the answer is: not this. The static size cull is capped at the 低 value for the
  // places named here. It is the cheapest part of the tier to give back — the expensive levers are
  // `scale` (0.50, a quarter of the pixels) and `shadow` (0, a whole pass), and both are untouched,
  // as is `dynamicMinPx`, which is already 2.5 everywhere.
  //
  // Cost, and it is a real one: an apartment at 最低 now submits its small props again. Flat 202
  // draws 165 calls over 22,353 props with the whole tower in one scene, so the cull is a bounding
  // sphere test and an instance slot per prop, not a draw call per prop (see the instancing note
  // above). Measure before adding a second place to this table.
  //
  // WIRING: `setPlace` below is a no-op until something calls it. js/game.js is not this lane's
  // file; the one line it needs is `Perf.setPlace(name)` beside the existing `Perf.forget()` at
  // js/game.js:11675, which already runs on every place change. Queued as item 422 cross-file.
  // Until that lands the cap is inert and the ladder behaves exactly as before.
  // 4.2 is 低's value, i.e. the cap gives back exactly one tier of static size culling and no more.
  const homeMinPx = 4.2;                // 高层公寓 · 十八号楼 — the flat and its tower
  const PLACE_MIN_PX = { home: homeMinPx };
  let place = '';
  // The derived quality object MUST be stable between changes. js/game.js:14817 uses `c.q !== PQ`
  // as its cull-cache invalidation key, so handing back a fresh object each frame would rebuild
  // that cache every frame — a capped minPx that costs more than it buys. Built once per
  // (level, place) and cached.
  let qCache = null, qCacheFor = '';
  function quality() {
    const base = LEVELS[level];
    const cap = PLACE_MIN_PX[place];
    if (cap === undefined || !(base.minPx > cap)) return base;
    const key = level + '@' + place;
    if (qCacheFor !== key) { qCache = { ...base, minPx: cap }; qCacheFor = key; }
    return qCache;
  }

  // Stay close to a 60 Hz budget: 17.8 ms leaves a small scheduling/vsync margin without letting
  // a sustained 45–55 fps view sit indefinitely on a tier the machine cannot hold. Climbing back
  // is the harder judgement, and getting it wrong here made the ladder a one-way ratchet.
  //
  // It used to ask for an average under 13.2 ms before raising a level. On a display running at
  // 60 Hz with vsync on, a flawless frame is 16.7 ms and it is not possible to do better: the
  // hardware will not hand back a frame any sooner however much headroom the GPU has. So 16.7 sat
  // in the dead band between raising and dropping, `goodRun` never counted past zero, and the only
  // direction the ladder could move was down. Three seconds of a hitch — a place change, a garbage
  // collection, a busy end of the street — cost two levels, and forty seconds of perfect 60 fps
  // afterwards brought back neither. Over a session it walked down to the bottom and stayed there,
  // which is the game rendering soft, shadowless and short-sighted on a machine well able to do
  // better, and looks exactly like a rendering bug rather than a policy one.
  //
  // So the raise threshold is measured against what this display can actually deliver rather than
  // against a number. FLOOR is the shortest believable frame seen lately; the game raises when the
  // average is within a whisker of it, meaning the frame is finishing early and waiting for the
  // screen.
  const DROP_MS = 17.8, RAISE_MS = 13.2;
  const RAISE_OF_FLOOR = 1.12;        // "comfortably at the cap"
  let floorMs = 16.7;                 // learned, then allowed to drift up so it can re-learn
  let floorBest = 16.7;               // the best frame ever seen here, which caps that drift
  let floorCand = 0;                  // a proposed new floor, waiting to be seen a second time
  const FLOOR_CREEP = 0.004;          // ms per frame — about a quarter of a millisecond a second
  const WINDOW_MS = 500;              // how long each judgement is averaged over
  const BAD_RUN = 2, GOOD_RUN = 6;    // consecutive windows before stepping down / up
  // Longer than this is not a frame, it is a stall. Relative to what a frame costs on this display:
  // 250 ms fixed is fifteen missed frames at 60 Hz and thirty-six at 144 Hz, so the faster the
  // screen the more genuine jank had to be swallowed before the ladder was allowed to notice it.
  const STALL_FRAMES = 15, STALL_FLOOR = 120;
  const stallMs = () => Math.max(STALL_FLOOR, floorMs * STALL_FRAMES);
  const WARMUP_MS = 2000;             // shaders compile and worlds build in the first frames

  let level = 0, auto = true, hold = false;
  let fps = 60, frameMs = 16.7;       // both smoothed, for display
  let winStart = 0, winFrames = 0, winMs = 0, badRun = 0, goodRun = 0;
  let started = 0, stalls = 0, changed = 0;
  let onChange = null;
  // A level that was tried and could not be held. Without this, a machine sitting right on the
  // boundary raises, fails, drops, waits, raises again — visible as the picture and the shadows
  // pulsing every few seconds, which is worse than simply staying one level down.
  let raisedTo = -1, raisedAt = -1e9, blockedLevel = -1, blockedUntil = -1e9;
  // And how long to leave it before trying that level again, tripling every time the same level
  // fails. A machine that sits right on the boundary between two levels will fail the one above
  // every time it is offered, and a fixed wait means the picture and the shadows keep pulsing for
  // as long as the game is open. Backing off converges: twenty seconds, a minute, three minutes,
  // and then it has effectively accepted where it is. The first failure at a *different* level
  // starts the count again, because moving to a quiet room genuinely does change the answer.
  let blockedFor = 20000, blockedFails = 0;
  const BLOCK_MIN = 20000, BLOCK_MAX = 300000, GIVE_UP_AFTER = 3;

  // Why the ladder is where it is. "Settled at 最低" is the same observation whether the room truly
  // cannot do better or the ladder tried once, was unlucky in the two windows straight after a
  // level change, and stopped asking — and those want opposite fixes. Reconstructing that from a
  // single end-state reading is guesswork; recording each decision as it is taken is not.
  // Bounded, allocation-free in the steady state (nothing changes level in a steady state), and
  // read only by a harness or a console.
  const LOG = [];
  let lastAvg = 0;
  // One definition, because there were briefly two and they disagreed: the clamp went into the
  // decision in tick() and the `raiseMs` accessor kept the old expression, so a diagnostic run
  // reported a threshold of 17.84 ms while the ladder was actually using 16.91. A readout that
  // contradicts the logic it describes is worse than no readout — it is what the log was added to
  // stop happening.
  function raiseThreshold() {
    return Math.min(DROP_MS * 0.95, Math.max(RAISE_MS, floorMs * RAISE_OF_FLOOR));
  }

  function apply(reason) {
    changed = performance.now();
    if (LOG.length >= 32) LOG.shift();
    LOG.push({ at: Math.round(changed), level, reason, avg: +lastAvg.toFixed(2),
               blocked: blockedLevel, sinceRaise: Math.round(changed - raisedAt) });
    if (onChange) onChange(quality(), level, reason);
  }

  return {
    // Called once, with the function that pushes the settings into the renderer and the game.
    init(fn) {
      onChange = fn; started = performance.now(); winStart = started; apply('init');
      // Coming back to a tab that has been in the background: the timestamps are stale, the first
      // frames are cold, and judging them drops the quality of a game nobody was looking at. Same
      // treatment as a fresh start, and a level that was written off gets another chance — a
      // machine that has finished thermally throttling, or stopped sharing the GPU with whatever
      // was in the foreground, is genuinely a different machine from the one that failed.
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        started = performance.now(); winStart = started;
        winFrames = 0; winMs = 0; badRun = goodRun = 0;
        if (blockedUntil === Infinity) { blockedUntil = started + BLOCK_MAX; blockedFails = 0; }
      });
    },

    // Called at the top of every frame with the timestamp rAF was given.
    tick(now, ms) {
      // Smoothed for the readout. Two different time constants: the number settles quickly
      // enough to be useful and slowly enough to be readable.
      // One smoothed quantity, and the frame rate derived from it. Smoothing the two separately
      // let them disagree on screen — 58 fps beside 121 ms — which makes the readout useless.
      if (ms < stallMs()) {
        frameMs += (ms - frameMs) * 0.10;
        fps = 1000 / Math.max(frameMs, 0.5);
        // What this display can do at its best. Anything under 4 ms is not a frame, it is two
        // callbacks in the same tick; the slow creep upward lets the figure re-learn if the window
        // moves to a screen with a different refresh rate.
        // ---- and a new floor has to be seen twice before it is believed.
        //
        // `ms > 4` was meant to reject two callbacks landing in one tick, and it is not enough. A
        // resumed tab issues a burst; a scene build hands back a frame the compositor never showed;
        // either produces something well over 4 ms and well under what the display can really
        // deliver. Believing a single one of those redefines "as fast as this screen goes"
        // permanently, because `floorBest` moves with it and the creep above is capped at
        // `floorBest * 1.35`.
        //
        // That is fatal rather than untidy, and it is *why the mall sat at 最低*. The raise
        // threshold is `floorMs * RAISE_OF_FLOOR`; a floor poisoned to 5 ms asks for a 5.6 ms frame
        // on a screen whose best possible frame is 16.7. Nothing can ever meet it, so the ladder
        // stops climbing for good and stays wherever load-in dropped it — measured settling at tier
        // 3 with a 15-second settle and again with a 60-second one, while tier 2 held a flawless
        // 60 Hz lock when pinned. It is the one-way ratchet warned about at the top of this file,
        // reached from the other direction.
        //
        // Corroboration costs one frame of latency. Two consecutive short frames of similar length
        // are a real display; one on its own is a scheduling artefact.
        if (ms > 4 && ms < floorMs) {
          if (floorCand > 0 && ms < floorCand * 1.35) {
            floorMs = Math.max(ms, floorCand);
            floorBest = Math.min(floorBest, floorMs);
            floorCand = 0;
          } else floorCand = ms;
        }
        // The creep is there so the figure can re-learn on a different screen, but it was
        // unconditional: sit in a menu for an hour and the floor drifts all the way to 20 ms, the
        // raise threshold goes with it, and the ladder quietly decides a 144 Hz machine is a slow
        // one. It may drift a little way above the best frame ever measured, and no further.
        else { floorCand = 0; floorMs = Math.min(Math.min(20, floorBest * 1.35), floorMs + FLOOR_CREEP); }
      } else {
        stalls++;
      }
      if (!auto || hold || now - started < WARMUP_MS) return;

      // Stalls are excluded from the average outright. Headless Chrome only runs a frame when
      // something forces one, so every frame there is a "stall" — which is exactly right: the
      // screenshot harness must never be able to talk the game down a quality level.
      if (ms < stallMs()) { winFrames++; winMs += ms; }
      if (now - winStart < WINDOW_MS) return;
      const avg = winFrames >= 4 ? winMs / winFrames : 0;
      if (avg) lastAvg = avg;      // for the decision log; see apply()
      winStart = now; winFrames = 0; winMs = 0;
      if (!avg) return;                       // not enough real frames to judge anything

      // A level change is itself disruptive, so leave a moment before judging the result.
      if (now - changed < 900) { badRun = goodRun = 0; return; }
      // ---- the raise threshold must sit BELOW the drop threshold, or there is no hysteresis.
      //
      // Under vsync a window average is not continuous. With a fraction p of frames missing a
      // refresh it is `floor + floor*p` — 16.7 at p=0, 18.4 at p=0.1, 20 at p=0.2. Feed that into
      // the two thresholds as they were: drop above 17.8 means p > 6.6%, raise below
      // floor*1.12 = 18.7 means p < 9.4%. **The raise band was wider than the drop band**, so a room
      // losing 7% of its frames was simultaneously "good enough to climb" and "bad enough to drop".
      // It climbed, failed, dropped, and did it again for as long as the game was open — measured
      // in the mall as a limit cycle across all four tiers roughly every twenty seconds, which is
      // the picture and the shadows pulsing that the note beside `blockedLevel` above describes.
      //
      // Clamping raise below drop restores a real dead zone: climb only when the frame is very
      // nearly perfect (p under ~1%), drop only when it is clearly not (p over 6.6%), and in
      // between leave it alone. `RAISE_OF_FLOOR` still governs on a machine whose floor is far
      // under the 60 Hz budget, where the absolute numbers are not the binding constraint: a
      // 144 Hz screen keeps its 13.2 and is untouched by the clamp.
      //
      // On a display slower than the budget — a 30 Hz panel, floor 33.3 — "achievable" and "below
      // the drop threshold" cannot both hold, because `DROP_MS` is an absolute tied to 60 fps. That
      // conflict is not resolvable here and does not need to be: such a machine cannot reach the
      // target at any tier, every window reads as a drop, and sitting at the bottom is the right
      // answer rather than climbing into a cycle it can never win.
      const raiseAt = raiseThreshold();
      if (avg > DROP_MS) { badRun++; goodRun = 0; }
      else if (avg < raiseAt) { goodRun++; badRun = 0; }
      else { badRun = goodRun = 0; }
      if (badRun >= BAD_RUN && level < LEVELS.length - 1) {
        // Failing this soon after climbing means the level above is out of reach on this machine
        // with this view. Remember it rather than trying again in six windows' time.
        if (now - raisedAt < 4000 && raisedTo >= 0) {
          const again = blockedLevel === raisedTo;
          blockedFor = again ? Math.min(BLOCK_MAX, blockedFor * 3) : BLOCK_MIN;
          blockedFails = again ? blockedFails + 1 : 1;
          blockedLevel = raisedTo;
          // Three failures at the same level is an answer, not a coincidence. Stop asking until
          // something happens that could change it — which is what forget() is for, and what a walk
          // into a different room is.
          blockedUntil = blockedFails >= GIVE_UP_AFTER ? Infinity : now + blockedFor;
        }
        level++; badRun = 0; apply('slow');
      } else if (goodRun >= GOOD_RUN && level > 0) {
        if (level - 1 === blockedLevel && now < blockedUntil) { goodRun = 0; return; }
        level--; goodRun = 0;
        raisedTo = level; raisedAt = now;
        apply('fast');
      }
    },

    // What the rest of the game should be doing right now.
    get q() { return quality(); },

    // Which room the player is in, for PLACE_MIN_PX above. Safe to call with anything, including
    // a name that has no cap and a name that does not exist; safe to call every frame, because it
    // returns immediately unless the name actually changed. Only re-pushes the quality when the
    // cap it produces is genuinely different, so entering or leaving an uncapped room at a tier
    // above 最低 costs nothing at all.
    setPlace(name) {
      const n = name == null ? '' : String(name);
      if (n === place) return;
      const before = quality();
      place = n;
      if (quality() !== before) apply('place');
    },
    get place() { return place; },
    get fps() { return fps; },
    get frameMs() { return frameMs; },
    get level() { return level; },
    get auto() { return auto; },
    get stalls() { return stalls; },
    // The shortest frame this display has handed back, and the average the ladder wants before it
    // will climb. Worth being able to read: they are the two numbers that decide how sharp the
    // game is allowed to be.
    get floorMs() { return floorMs; },
    get raiseMs() { return raiseThreshold(); },

    // Which level the ladder has given up on, and for how long. Read-only, and the only way to tell
    // "this room genuinely cannot do better" from "the ladder tried once, was unlucky, and stopped
    // asking" — which look identical from outside and want opposite fixes. `until: Infinity` means
    // it has stopped asking entirely until forget() or a room change.
    get blocked() {
      return { level: blockedLevel, fails: blockedFails, until: blockedUntil,
               msLeft: blockedUntil === Infinity ? Infinity
                     : Math.max(0, blockedUntil - performance.now()) };
    },
    // Every level change this session, oldest first: when, to what, why, the window average that
    // caused it, and how long after the last climb it happened. `sinceRaise` under 4000 on a 'slow'
    // row is the signature of a climb being judged on its own cost.
    get log() { return LOG.slice(); },

    // Cycling goes auto → high → medium → low → basic → auto, so the reading is always
    // honest about whether the game or the player chose the current level.
    cycle() {
      if (auto) { auto = false; level = 0; }
      else if (level < LEVELS.length - 1) level++;
      else auto = true;
      badRun = goodRun = 0;
      apply('manual');
      return this.label;
    },
    // The screenshot harness pins the level so shots are comparable between runs.
    setHold(v) { hold = !!v; },

    // Forget which levels were found to be out of reach, because the reason they were is no longer
    // true. A room is not a street: the apartment draws four hundred props and the hutong three and
    // a half thousand, so a level that could not be held out there may be easy indoors. Called on
    // every place change, and the reason walking inside makes the picture sharpen.
    forget() {
      blockedLevel = -1; blockedUntil = -1e9; blockedFor = BLOCK_MIN; blockedFails = 0;
      badRun = goodRun = 0;
      // And re-learn what the display can do, rather than carrying a number that may be wrong
      // forever. Corroboration above makes a poisoned floor unlikely, not impossible — it takes two
      // stray short frames in a row — and a poisoned floor is silent and permanent: `floorBest`
      // caps the creep, so nothing ever walks it back, and the ladder simply stops climbing. Since
      // this runs on every room change (js/game.js), the worst case becomes "wrong until the player
      // walks through a door" instead of "wrong until the tab is closed". A genuinely fast display
      // re-learns in two frames, because two consecutive fast frames corroborate each other.
      floorMs = floorBest = 16.7; floorCand = 0;
    },
    setLevel(i) { auto = false; level = Math.max(0, Math.min(LEVELS.length - 1, i | 0)); apply('manual'); },
    // Hand the decision back to the frame rate. The settings panel needs this: cycling round
    // through every level to reach 自动 again is fine for a keypress and no good for a button.
    //
    // Handing control back hands it back from the top. Leaving the level where the player had
    // pinned it meant 自动 kept whatever they had last chosen by hand — a level picked once, and
    // then saved, rendered every later session soft and shadowless until the ladder had climbed
    // all the way back, which takes the better part of twelve seconds and looks like a bug.
    // What the machine can do now is a question for the frame rate, not for a stale choice.
    setAuto(v) {
      auto = !!v;
      badRun = goodRun = 0;
      if (!auto) return;
      level = 0;
      started = performance.now();     // re-arm the warmup: do not judge the frames a change costs
      apply('auto');
    },
    get levels() { return LEVELS.map(l => ({ name: l.name, en: l.en })); },
    get label() { return `${LEVELS[level].name}${auto ? '' : ' ·'}`; },
  };
})();
