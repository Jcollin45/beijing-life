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
// ---------------------------------------------------------------------------------------------
// CONTRACT — read this instead of the file.
//
// One global, `Perf`. js/game.js drives it: `Perf.init(fn)` once (game.js:21), `Perf.tick(now, ms)`
// at the top of every frame (game.js:16528), `Perf.forget()` and `Perf.setPlace(name)` on every
// room change (game.js:14073-14076). Everything else reads `Perf.q`.
//
//   READ      q  fps  frameMs  level  auto  stalls  floorMs  raiseMs  levels  label  place
//             blocked -> { level, fails, until, msLeft }      why the ladder stopped climbing
//             log     -> [{ at, level, reason, avg, blocked, sinceRaise }]   every level change
//             hitches -> see below                                          every long frame
//   WRITE     init(fn)  tick(now, ms)  setPlace(name)  forget()  cycle()  setLevel(i)
//             setAuto(v)  setHold(v)          setHold pins the level for the screenshot harness
//             setHitchLog(v)                  the ONLY switch for the hitch log; off in release
//
// THE HITCH LOG. Off unless a harness calls `Perf.setHitchLog(true)` — nothing in the game calls
// it, so a released build registers no observer, installs no shim and runs one boolean test per
// frame. On, it records every frame over `HITCH_MS` (40) into a 64-deep ring.
//
// What it costs when on, measured in the page (ANGLE Metal, M3) against an empty loop of the same
// shape: `performance.now()` 108 ns, the MessageChannel reply 2,945 ns of main-thread dispatch, and
// the heap read **3,696 ns at load average 8, 4,726 ns at load average 10**. Roughly **7 µs a
// frame**, 0.04% of a 16.7 ms budget, of which the heap read is half. Occupancy figures, not
// latency — the round-trip time of the message is not a cost and must not be quoted as one.
//
// Two traps in measuring that, both of which have already produced wrong numbers here:
//   * `performance.memory` builds a fresh snapshot object on every property read. Timed on a
//     CACHED MemoryInfo the field costs 2 ns; timed through `performance` it costs ~3,700, and
//     reading the object alone and discarding it costs the same 3,740 — so the price is the
//     snapshot, not the field. A 17 ns reading of this is a cached object and is not what this
//     file does.
//   * `performance.now()` in this page is clamped to ~100 µs, so timing ONE call of anything
//     returns 0 or 100 µs and nothing in between. Only loop averages mean anything. A per-frame
//     timing of the heap read taken that way came back as 24,583 ns, which is quantisation.
//
// A GPU-side timer would answer what the dark time is doing, and is NOT added here.
// `EXT_disjoint_timer_query_webgl2` is present on this platform. Cost if a later lane wants it:
// two GL calls a frame plus a result poll, and the result cannot be read on the frame that made it
// without stalling the pipeline — it lands one to three frames later and can come back disjoint.
// It also times GPU *execution* of submitted work, not presentation or the vsync wait, so it
// cannot by itself explain a frame that is long with an idle main thread. It needs the context,
// which lives in js/gl.js, not here.
//
//   Perf.hitches -> { on, overMs, seen, lost, list: [record] }
//   record       -> { at, w0,        window of the frame: previous and current tick entry,
//                                    both performance.now()
//                     wallMs,        at - w0. The frame as this file measured it, and the ONLY
//                                    denominator jsMs may be divided by
//                     ms,            the frame as the ladder measured it — see the warning below
//                     level, place,  what the game was rendering at the time
//                     tags: [],      see the vocabulary below
//                     jsMs,          main-thread time from tick entry until the frame's task was
//                                    drained; -1 = not measurable that frame
//                     gapMs,          wallMs - jsMs: the dark time, end of one callback to the
//                                    start of the next. -1 when jsMs is
//                     loafMs,        Chrome's own long-animation-frame duration for this frame:
//                                    frame start to the end of its rendering work. 0 = the browser
//                                    did not report one (frames under 50 ms never are)
//                     preMs,         of loafMs, before the rendering steps: other tasks in the frame
//                     rafMs,         of loafMs, the animation-frame callbacks — the game's own work
//                     styleMs,       of loafMs, style, layout and paint
//                     scriptMs,      the browser's own attribution summed over scripts[]. Overlaps
//                                    preMs and rafMs — never add it to them
//                     blockMs,       the entry's blockingDuration
//                     taskMs,        longest overlapping 'longtask' entry, 0 if none
//                     tex, mesh,     R.texture / R.mesh+R.skinMesh calls made during the frame
//                     meshes: [],    up to 4 mesh names, e.g. "rig:xiaochen:lod2#12"
//                     assets: [],    up to 4 files whose fetch finished inside the frame
//                     heapMb }       signed JS heap change across the frame
//   `seen` counts every hitch including those the ring dropped; `lost` counts the dropped ones.
//   `list` is a shallow copy — the records are live and a late observer entry can still add a tag,
//   so read it once, at the end of a run.
//
// THE INVARIANT, because two of these are not the same clock and one consumer has already been
// caught by it:
//
//     -1 <= jsMs <= wallMs        ALWAYS. Both start at the previous tick entry, on
//                                 performance.now(); a reply that had not arrived by this tick
//                                 reports -1 rather than a number spanning two frames.
//     jsMs + gapMs === wallMs     ALWAYS, exactly: both are cut from the one interval [w0, at]
//                                 on the one clock. gapMs is -1 whenever jsMs is.
//                                 `gapMs` is a LOWER BOUND on the dark time — jsMs runs to the
//                                 reply task, so any unrelated task in between is charged to jsMs.
//                                 A big gapMs is solid; a small one does not prove the browser was
//                                 busy in our code.
//     loafMs vs wallMs            NOT nested and NOT comparable as a share. The browser's frame and
//                                 this file's tick-to-tick interval start at different instants,
//                                 and loafMs stops when the frame's rendering work ends, before
//                                 presentation. `loafMs > wallMs` and `loafMs === 0` are both
//                                 ordinary. Use it to split a frame, never to measure one.
//     preMs + rafMs + styleMs === loafMs   exactly, when the entry was reported: three adjacent
//                                 spans cut from the browser's own four timestamps. `scriptMs` is
//                                 an attribution that overlaps the first two and must never be
//                                 added to them.
//     jsMs vs ms                  NOT COMPARABLE. Never form jsMs / ms; `jsMs > ms` is ordinary
//                                 and means nothing is wrong. `ms` is the difference between two
//                                 rAF *timestamps* — vsync-aligned frame starts, which precede the
//                                 callback by however late it was dispatched — and js/game.js
//                                 rebases it to 0 on a backwards or >60 s sample (game.js:396-401),
//                                 so `ms` can even be 0 on a frame that genuinely took a second.
//                                 Measured live on 2026-08-14: jsMs 86 on an ms 83.2 frame.
//     wallMs vs ms                the same frame through two clocks, and NEITHER BOUNDS THE OTHER.
//                                 Measured both ways inside one run on 2026-08-14: ms 50 with
//                                 wallMs 52.1, and ms 51.9 with wallMs 43.9. The difference is the
//                                 rAF dispatch delay, which moves from frame to frame. Use wallMs
//                                 for anything about this file's own measurements, `ms` for
//                                 anything about the ladder, and do not convert between them.
//   A hitch is recorded when EITHER exceeds the threshold, so neither clock's blind spot hides one.
//
// TAG VOCABULARY, and the evidence behind each. Nothing here is inferred from frame time alone.
//   task          jsMs took at least half of wallMs, or a 'longtask' entry overlapped the frame.
//   texture/mesh  the upload shim counted a call to R.texture / R.mesh / R.skinMesh.
//   asset         a 'resource' timing entry finished inside the frame; `assets` names the files.
//   gc            the heap shrank by more than a megabyte across the frame.
//   unattributed  none of the above AND jsMs was measured and small: the time went somewhere the
//                 page cannot see. With `jsMs: -1` it means "not proven" and nothing more.
// Not tagged, and why: shader first-use compile (every program links in gl.js init, so there is
// none after boot; driver-side pipeline specialisation is invisible to JS and lands under
// `unattributed`), and batch rebuild (built in js/game.js, which exposes no counter — it currently
// shows up as `task`).
// ---------------------------------------------------------------------------------------------
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
      minPx: 1.4, dynamicMinPx: 1.4, shadowMinR: 0.10, glyphAssist: 1, aniso: 4 },
    { name: '中',  en: 'medium', scale: 0.84, shadow: 1024, shadowHalf: 20, bloom: 0.55, ao: 0.40,
      npcFar: 52, lod0: 3.5, lod1: 8, smallFar: 999, smallR: 0, rain: 0.80,
      minPx: 1.6, dynamicMinPx: 1.6, shadowMinR: 0.15, glyphAssist: 1, aniso: 4 },
    { name: '低',  en: 'low',    scale: 0.70, shadow: 768,  shadowHalf: 16, bloom: 0,    ao: 0,
      npcFar: 40, lod0: 2.5, lod1: 6, smallFar: 48, smallR: 0.32, rain: 0.55,
      minPx: 4.2, dynamicMinPx: 2.4, shadowMinR: 0.26, glyphAssist: 0, aniso: 2 },
    // The fallback tier is the 60 Hz safety net, not a different cast. It keeps every nearby
    // resident/vehicle and the same authored character assets, but uses the validated far mesh
    // sooner and stops submitting sub-pixel street fittings. Half-resolution on a Retina canvas
    // is still one physical pixel per CSS pixel; 0.60 needlessly oversampled the screen after the
    // machine had already proved that it could not meet the frame budget at the fuller tiers.
    { name: '最低', en: 'basic',  scale: 0.50, shadow: 0,    shadowHalf: 0,  bloom: 0,    ao: 0,
      npcFar: 30, lod0: 2.0, lod1: 4.5, smallFar: 18, smallR: 0.85, rain: 0.20,
      minPx: 18.0, dynamicMinPx: 2.5, shadowMinR: 0.40, glyphAssist: 0, aniso: 1 },
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

  const AUTO_TIER_KEY = 'bjlife.perf-tier.v1';
  function initialAutoLevel() {
    try {
      const saved = Number(localStorage.getItem(AUTO_TIER_KEY));
      if (Number.isSafeInteger(saved) && saved >= 0 && saved < LEVELS.length)
        return Math.min(2, saved); // never cold-start at the emergency tier
    } catch (_) {}
    const coarse = typeof matchMedia === 'function' && matchMedia('(any-pointer:coarse)').matches;
    const memory = typeof navigator !== 'undefined' ? Number(navigator.deviceMemory) : 0;
    const pixels = typeof innerWidth === 'number' && typeof innerHeight === 'number'
      ? innerWidth * innerHeight * Math.min(2, Number(devicePixelRatio) || 1) ** 2 : 0;
    return coarse || (memory > 0 && memory <= 4) || pixels > 3500000 ? 1 : 0;
  }
  let level = initialAutoLevel(), auto = true, hold = false;
  let fps = 60, frameMs = 16.7;       // both smoothed, for display
  let winStart = 0, winFrames = 0, winMs = 0, badRun = 0, goodRun = 0;
  // ---- ONE CLOCK. `tick(now, ms)` is not handed `performance.now()`: js/game.js passes `frameNow`,
  // a virtual accumulator seeded at game.js:402 and advanced by `frameNow + rawMs` at :16724, where
  // `rawMs` is zero on a non-finite, backwards or over-60-s sample. It therefore only ever falls
  // BEHIND the wall clock, and the lag is permanent — background the tab for ten minutes and
  // `frameNow` is ten minutes behind for the rest of the session.
  //
  // So every ladder timestamp must come from the same clock the ladder is compared against, and
  // none of them may be read from `performance.now()`. Doing that gives `now - started` a large
  // negative value, which reads as "still warming up" and stops the ladder judging anything at all
  // — the failure is silent, permanent, and looks like the ladder having no effect. `started` is
  // armed with the sentinel -1 instead: the next tick stamps it from `now`, which is both correct
  // and shorter than passing a clock in. `tnow` is that same clock for the callers that are not
  // inside tick(). The hitch log below is a different instrument and deliberately keeps
  // `performance.now()`: it measures wall time and says so (`wallMs`).
  let started = -1, stalls = 0, changed = 0, tnow = 0;
  let onChange = null;
  // A level that was tried and could not be held. Without this, a machine sitting right on the
  // boundary raises, fails, drops, waits, raises again — visible as the picture and the shadows
  // pulsing every few seconds, which is worse than simply staying one level down.
  //
  // ONE ENTRY PER LEVEL, not one scalar. `blockedLevel`/`blockedUntil` used to be single values,
  // and a single value can remember one blocked tier: block a second and the first is gone,
  // including a tier the ladder had given up on permanently. Reproduced against the previous
  // source — three failures at 高 set `{level:0, fails:3, until:Infinity}`, one later failure at 中
  // overwrote it with `{level:1, fails:1}`, and the ladder climbed back into 高 27 s afterwards
  // with no room change and no tab return. The backoff was lost with it: `fails` reset to 1, so
  // GIVE_UP_AFTER could never be reached while two tiers were failing alternately.
  let raisedTo = -1, raisedAt = -1e9;
  const blockedUntil = LEVELS.map(() => -1e9);
  // And how long to leave it before trying that level again, tripling every time the same level
  // fails. A machine that sits right on the boundary between two levels will fail the one above
  // every time it is offered, and a fixed wait means the picture and the shadows keep pulsing for
  // as long as the game is open. Backing off converges: twenty seconds, a minute, three minutes,
  // and then it has effectively accepted where it is. Per level, so a failure at one tier no longer
  // restarts another tier's count — that reset is what let two tiers failing alternately keep each
  // other at twenty seconds for ever, and it is the one place `blocked.fails` now reads differently
  // from the scalar version it replaced. `lastBlocked` is for the readout only: it is the level most
  // recently blocked, expired or not, which is what `blocked` reported before and what
  // .fpscheck.js:1274 stores on every census row.
  const blockedFor = LEVELS.map(() => 0), blockedFails = LEVELS.map(() => 0);
  let lastBlocked = -1;
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

  // ---- the hitch log: what was actually happening during a frame that took 40 ms.
  //
  // The ladder above judges 500 ms windows, and a window average hides the thing that made the
  // player notice: one frame of 125 ms among 599 good ones reads as 16.9 ms average and as a
  // dropped tier. So this records the individual long frames and, more to the point, what
  // evidence exists for what ran during each of them.
  //
  // Every tag below is something the browser or the renderer can be asked directly. Nothing is
  // inferred from frame time alone, because a tag that is really a guess is worse than no tag —
  // it sends the next lane to rewrite a system that was innocent.
  //
  //   task   the frame's own main-thread task took at least half of the frame. Measured directly:
  //          a message is posted to a MessageChannel at tick entry, and the reply cannot run until
  //          the task holding the animation-frame callbacks — the game's whole update and draw —
  //          has finished. `jsMs` is that length, on every hitch, whether or not it earned the tag.
  //          A PerformanceObserver 'longtask' entry overlapping the frame also sets it and raises
  //          `taskMs`, but is not relied on: Chrome only reports tasks over 50 ms, so longtask
  //          alone cannot see a 40–49 ms hitch — exactly the band this campaign is hunting. That
  //          gap is why `jsMs` exists; an independent 77.6 ms busy-wait was reported
  //          `unattributed` by the longtask-only version of this file on 2026-08-14.
  //   asset  a 'resource' entry finished inside the frame — a rig, a texture, a glTF, audio.
  //          `assets` holds the file names, so "which rig" is answered, not just "an asset".
  //   texture / mesh   R.texture / R.mesh / R.skinMesh were called during the frame (counted by
  //          a shim installed only while the log is on). This is the GPU upload itself, which is
  //          the half of "asset arrival" that costs the frame rather than the network half.
  //   gc     the JS heap is smaller at the end of the frame than at the start, by more than a
  //          megabyte. Only a collection does that. `heapMb` carries the signed delta.
  //          Chrome-only (performance.memory) and quantised, so treat it as presence evidence.
  //   unattributed   a long frame with none of the above, which now means something specific:
  //          `jsMs` was measured and the frame's own JS task did NOT dominate it, no upload, no
  //          asset, no collection. The time went somewhere the page cannot see — driver-side
  //          pipeline specialisation on first sight of a state combination, the compositor, or the
  //          GPU. Read `jsMs` on the record before believing that: `jsMs: -1` means the measurement
  //          itself was unavailable that frame, and then `unattributed` only means "not proven",
  //          which is a weaker claim and must not be counted as evidence of a GPU cause.
  //
  // Two named candidates are NOT here, deliberately:
  //   * material/shader first-use compile — every program in gl.js is created and linked inside
  //     init (gl.js:3134, 3186, 3198, 3235, 3265). There is no lazy compile to observe after
  //     boot. What can still cost a frame is the driver specialising a pipeline the first time a
  //     state combination is drawn, and that is invisible to JS; it lands under `unattributed`.
  //   * batch rebuild — the batches are built and refilled in js/game.js, which this lane does
  //     not own and which exposes no counter. Attributing it needs one line there; until then a
  //     rebuild shows up as `task` (it is main-thread JS) with no finer breakdown.
  const HITCH_MS = 40;          // a frame longer than this is an event, not a frame rate
  const HITCH_KEEP = 64;        // ring buffer: newest kept, `lost` counts what fell off
  const EVIDENCE_KEEP = 32;     // observer entries retained; a frame only ever looks at recent ones
  const GC_DROP = 1 << 20;      // heap shrinking by a megabyte across one frame
  const HITCHES = [];
  let hitchOn = false, hitchSeen = 0, hitchLost = 0, hitchAt = 0, hitchHeap = 0;
  const tasks = [], loads = [], loafs = [], observers = [];
  let upTex = 0, upMesh = 0, upNames = [], hasMem = false, wrapped = false, loafOK = false;
  // `performance.memory` hands back a fresh snapshot object on every property read, and the numbers
  // inside one are frozen when it is made. Holding a reference to it therefore reports the same heap
  // size forever — measured on 2026-08-14 as a heap delta of exactly 0.00 MB across 800 MB of
  // deliberate allocation. Read it through `performance` every time, or do not read it at all.
  const heapNow = () => (hasMem ? performance.memory.usedJSHeapSize : 0);

  // ---- how long the frame's own JS took, without a hook at the end of the frame.
  //
  // A message posted to a MessageChannel is a task, and a task cannot start until the running one
  // finishes. Post one at tick entry and its reply lands the moment the animation-frame callback —
  // the game's entire update and draw — has returned, so `jsEnd - jsStart` is the length of that
  // task. It is the only way to separate "our JS was slow" from "the frame was long for a reason
  // outside our JS" from inside this file, and unlike 'longtask' it has no 50 ms floor.
  // `jsSeq` guards it: a reply that never arrived, or arrived for an older frame, reports -1 rather
  // than a number made of two unrelated timestamps.
  let jsPort = null, jsStart = 0, jsEnd = 0, jsSeq = 0, jsAck = -1;
  function jsTimerOn() {
    if (jsPort || typeof MessageChannel !== 'function') return;
    const ch = new MessageChannel();
    ch.port1.onmessage = e => { if (e.data === jsSeq) { jsEnd = performance.now(); jsAck = e.data; } };
    jsPort = ch.port2;
  }

  function observe(type, into) {
    const types = (typeof PerformanceObserver === 'function'
      && PerformanceObserver.supportedEntryTypes) || [];
    if (types.indexOf(type) < 0) return false;
    try {
      // Held in `observers` on purpose: an observer nothing references is allowed to be collected.
      const po = new PerformanceObserver(list => {
        for (const e of list.getEntries()) {
          into.push(e);
          if (into.length > EVIDENCE_KEEP) into.shift();
          patch(e, type);
        }
      });
      po.observe({ type, buffered: false });
      observers.push(po);
      return true;
    } catch (_) { return false; }
  }

  // Count GPU uploads by wrapping the three renderer entry points that make them. Rare calls, so
  // the shim costs nothing per frame; it is installed only when the log is turned on, and each
  // wrapper is inert again the moment it is turned off.
  function wrapUploads() {
    if (wrapped) return true;
    let gfx = null;
    try { gfx = R; } catch (_) { return false; }   // typeof throws on a const not yet evaluated
    if (!gfx) return false;
    const hook = (name, bump) => {
      const fn = gfx[name];
      if (typeof fn !== 'function') return;
      gfx[name] = function () {
        if (hitchOn) bump(arguments[0]);
        return fn.apply(this, arguments);
      };
    };
    hook('texture', () => { upTex++; });
    hook('mesh', n => { upMesh++; if (upNames.length < 4) upNames.push(String(n)); });
    hook('skinMesh', n => { upMesh++; if (upNames.length < 4) upNames.push(String(n)); });
    wrapped = true;
    return true;
  }

  const shortName = n => {
    const s = String(n);
    return s.slice(s.lastIndexOf('/') + 1, s.lastIndexOf('/') + 41);
  };

  function tagHitch(h, name) {
    if (h.tags.indexOf(name) >= 0) return false;
    const u = h.tags.indexOf('unattributed');
    if (u >= 0) h.tags.splice(u, 1);
    h.tags.push(name);
    return true;
  }

  // A PerformanceObserver hands its entries over in a task of its own, and that task is not
  // guaranteed to run before the next animation frame. Measured 2026-08-14: a fetch issued inside
  // a deliberately long frame produced its 'resource' entry *after* the frame had already been
  // recorded, so the hitch it belongs to was logged as `unattributed` while the evidence for it sat
  // one task away. Entries are therefore matched in both directions — the ring below covers early
  // delivery, and this covers late. Only the last few hitches are candidates; an entry cannot be
  // more than a frame or two behind.
  function patch(e, type) {
    const asset = type === 'resource';
    const t0 = asset ? e.responseEnd : e.startTime;
    const t1 = asset ? e.responseEnd : e.startTime + e.duration;
    for (let i = HITCHES.length - 1, n = 0; i >= 0 && n < 3; i--, n++) {
      const h = HITCHES[i];
      if (!(t1 > h.w0 && t0 < h.at)) continue;
      if (asset) { if (h.assets.length < 4) h.assets.push(shortName(e.name)); tagHitch(h, 'asset'); }
      else if (type === 'long-animation-frame') { if (h.loafMs <= 0) putLoaf(h, e); }
      else { h.taskMs = Math.max(h.taskMs, +e.duration.toFixed(1)); tagHitch(h, 'task'); }
      return;
    }
  }

  // Chrome's long-animation-frame entry: the only thing on this platform that splits a frame from
  // the inside. Four timestamps, so three spans that add up exactly:
  //
  //   startTime ......... the frame began
  //   renderStart ....... the rendering steps began. Everything before it is other tasks that ran
  //                       in this frame -> `preMs`
  //   styleAndLayoutStart the animation-frame callbacks are done. renderStart to here is the
  //                       game's own rAF work -> `rafMs`, which should track this file's `jsMs`
  //   startTime+duration  the frame's work ended -> `styleMs` is style, layout and paint
  //
  // `scriptMs` is the browser's own attribution summed over `scripts[]` and is NOT a fourth span —
  // it overlaps preMs and rafMs, so it must never be added to them. An earlier version of this
  // function called the whole renderStart-to-end span `renderMs` and produced scriptMs 120 +
  // renderMs 122.7 inside a loafMs of 136.3, which is what a wrong decomposition looks like.
  // Frames under 50 ms are never reported, so `loafMs: 0` means "not reported", never "no work".
  function putLoaf(h, e) {
    const end = e.startTime + e.duration, rs = e.renderStart || 0, ss = e.styleAndLayoutStart || 0;
    h.loafMs = +e.duration.toFixed(1);
    h.preMs = rs > 0 ? +(rs - e.startTime).toFixed(1) : 0;
    h.rafMs = rs > 0 && ss > 0 ? +(ss - rs).toFixed(1) : 0;
    h.styleMs = ss > 0 ? +(end - ss).toFixed(1) : 0;
    h.blockMs = +(e.blockingDuration || 0).toFixed(1);
    let sc = 0;
    for (const x of (e.scripts || [])) sc += x.duration;
    h.scriptMs = +sc.toFixed(1);
  }

  // Called first thing in tick() when the log is on, with the frame time the ladder was given.
  // `ms` is the interval between this tick and the previous one, so everything compared here is
  // sampled at tick entry and differenced over exactly that interval.
  function hitchFrame(ms) {
    const t = performance.now(), from = hitchAt || t - ms;
    hitchAt = t;
    const heap = heapNow(), heapWas = hitchHeap;
    hitchHeap = heap;
    const tex = upTex, meshes = upMesh, names = upNames;
    if (tex || meshes) { upTex = 0; upMesh = 0; upNames = []; }  // per-frame, never cumulative
    // ---- `wall` is the denominator, and `ms` is NOT.
    //
    // `ms` is the ladder's number: game.js hands tick() the difference between two rAF *timestamps*
    // (game.js:16521), which are vsync-aligned frame start times, then rebases it to 0 on any
    // sample that is non-finite, backwards, or more than MAX_FRAME_FORWARD_GAP ahead
    // (game.js:396-401). `jsMs` is wall clock from this file's own tick entry. Different origins:
    // an rAF callback runs at or after its timestamp, so the two are offset by however late the
    // callback was dispatched, and `jsMs > ms` is a perfectly ordinary reading — measured live by
    // the .fpscheck.js lane as `jsMs 86` on an `ms 83.2` frame, which is not a defect in either
    // number and is a defect in comparing them.
    //
    // `wall` fixes that by measuring the same interval `jsMs` starts from: previous tick entry to
    // this one, both `performance.now()`. `jsMs <= wall` then holds by construction rather than by
    // luck — `jsStart` IS the previous tick entry, and a reply that had not arrived by this tick
    // reports -1 instead of a number.
    const wall = t - from;
    const jsMs = jsPort ? (jsAck === jsSeq && jsEnd > jsStart ? jsEnd - jsStart : -1) : -1;
    if (jsPort) { jsStart = t; jsSeq = (jsSeq + 1) & 0xffff; jsPort.postMessage(jsSeq); }
    // Either clock may see a hitch the other misses: `ms` is 0 on a frame longer than
    // MAX_FRAME_FORWARD_GAP or on a backwards timestamp, and `wall` includes dispatch delay the
    // ladder never judges. Record on either, and carry both.
    if (!(wall > HITCH_MS || ms > HITCH_MS)) return;

    let taskMs = 0;
    for (const e of tasks)
      if (e.startTime < t && e.startTime + e.duration > from) taskMs = Math.max(taskMs, e.duration);
    const assets = [];
    for (const e of loads)
      if (e.responseEnd > from && e.responseEnd <= t && assets.length < 4) assets.push(shortName(e.name));

    const tags = [];
    // Half the frame is the line between "the frame was long because our JS was" and "our JS ran
    // inside a frame that was long for another reason". A 44 ms frame with 43 ms of JS is the first;
    // a 44 ms frame with 5 ms of JS is the second, and calling both `task` would hide the split the
    // census needs. Against `wall`, never against `ms` — see the note above.
    if (taskMs || jsMs > wall * 0.5) tags.push('task');
    if (tex) tags.push('texture');
    if (meshes) tags.push('mesh');
    if (assets.length) tags.push('asset');
    if (heapWas && heap < heapWas - GC_DROP) tags.push('gc');
    if (!tags.length) tags.push('unattributed');

    hitchSeen++;
    // ---- the dark time. Milestone 3.
    //
    // `jsMs` covers tick entry to the end of that frame's task. `gapMs` is everything else in the
    // same window and the same clock: end of one callback to the start of the next — vsync wait,
    // compositing, GPU submission, or the tab simply not being scheduled. Exact by construction,
    // `jsMs + gapMs === wallMs`, because both are cut from the one interval [w0, at].
    // It is a floor on the true dark time, not an estimate of it: `jsMs` is measured to the reply
    // task, so any other task the browser ran in between is counted as ours, which makes `gapMs`
    // the smaller of the two. A large `gapMs` is therefore trustworthy; a small one is not
    // evidence that the browser was idle.
    const gapMs = jsMs < 0 ? -1 : Math.max(0, wall - jsMs);
    // `w0`/`at` are the frame's own window, kept so a late-arriving observer entry can find the
    // frame it belongs to (see patch above).
    const rec = { at: t, w0: from, ms: +ms.toFixed(1), wallMs: +wall.toFixed(1),
                  level, place, tags,
                  jsMs: jsMs < 0 ? -1 : +jsMs.toFixed(1),
                  gapMs: gapMs < 0 ? -1 : +gapMs.toFixed(1),
                  loafMs: 0, preMs: 0, rafMs: 0, styleMs: 0, scriptMs: 0, blockMs: 0,
                  taskMs: +taskMs.toFixed(1), tex, mesh: meshes, assets,
                  meshes: names.length ? names : undefined,
                  heapMb: heapWas ? +((heap - heapWas) / 1048576).toFixed(2) : 0 };
    HITCHES.push(rec);
    for (const e of loafs)
      if (e.startTime + e.duration > from && e.startTime < t) { putLoaf(rec, e); break; }
    if (HITCHES.length > HITCH_KEEP) { HITCHES.shift(); hitchLost++; }
  }

  function apply(reason) {
    changed = tnow;                    // the ladder's clock, never performance.now() — see `tnow`
    if (LOG.length >= 32) LOG.shift();
    LOG.push({ at: Math.round(changed), level, reason, avg: +lastAvg.toFixed(2),
               blocked: lastBlocked, sinceRaise: Math.round(changed - raisedAt) });
    if (auto) try { localStorage.setItem(AUTO_TIER_KEY, String(level)); } catch (_) {}
    if (onChange) onChange(quality(), level, reason);
  }

  return {
    // Called once, with the function that pushes the settings into the renderer and the game.
    init(fn) {
      onChange = fn; started = -1; apply('init');
      // Coming back to a tab that has been in the background: the timestamps are stale, the first
      // frames are cold, and judging them drops the quality of a game nobody was looking at. Same
      // treatment as a fresh start, and a level that was written off gets another chance — a
      // machine that has finished thermally throttling, or stopped sharing the GPU with whatever
      // was in the foreground, is genuinely a different machine from the one that failed.
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        started = -1; badRun = goodRun = 0;
        for (let i = 0; i < blockedUntil.length; i++)
          if (blockedUntil[i] === Infinity) { blockedUntil[i] = tnow + BLOCK_MAX; blockedFails[i] = 0; }
      });
    },

    // Called at the top of every frame with the timestamp rAF was given.
    tick(now, ms) {
      if (hitchOn) hitchFrame(ms);
      // The one place the ladder's clock is read. Arming here rather than in the four callers is
      // what makes a cross-clock comparison impossible to write by accident: nothing outside this
      // line ever stamps a ladder timestamp, and a warmup armed while the page is not rendering
      // starts when the frames do, which is what "warm up" means.
      tnow = now;
      if (started < 0) { started = now; winStart = now; winFrames = 0; winMs = 0; }
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
          const lv = raisedTo;
          blockedFor[lv] = blockedFails[lv] ? Math.min(BLOCK_MAX, blockedFor[lv] * 3) : BLOCK_MIN;
          blockedFails[lv]++;
          // Three failures at the same level is an answer, not a coincidence. Stop asking until
          // something happens that could change it — which is what forget() is for, and what a walk
          // into a different room is. Per level, so a failure at one tier cannot cancel another's.
          blockedUntil[lv] = blockedFails[lv] >= GIVE_UP_AFTER ? Infinity : now + blockedFor[lv];
          lastBlocked = lv;
        }
        level++; badRun = 0; apply('slow');
      } else if (goodRun >= GOOD_RUN && level > 0) {
        if (now < blockedUntil[level - 1]) { goodRun = 0; return; }
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
    // The level most recently blocked, expired or not — the same four values, with the same
    // meanings, that this returned before the bookkeeping went per level. An expired block is still
    // the answer to "why did the ladder sit there", so it keeps being reported with `msLeft: 0`
    // rather than disappearing. The one value that legitimately differs from the scalar version is
    // `fails`, which no longer resets when a *different* tier fails: that reset was the defect.
    get blocked() {
      const i = lastBlocked;
      const until = i < 0 ? -1e9 : blockedUntil[i];
      return { level: i, fails: i < 0 ? 0 : blockedFails[i], until,
               msLeft: i < 0 ? 0 : until === Infinity ? Infinity : Math.max(0, until - tnow) };
    },
    // Every level change this session, oldest first: when, to what, why, the window average that
    // caused it, and how long after the last climb it happened. `sinceRaise` under 4000 on a 'slow'
    // row is the signature of a climb being judged on its own cost.
    get log() { return LOG.slice(); },

    // Every frame over HITCH_MS since the log was turned on, with what the page could prove was
    // running during it. Same shape as `blocked` above — a plain object a harness can read in one
    // eval — and `seen` is the count that survives the ring buffer, so a census can report how many
    // hitches happened even when more than HITCH_KEEP of them did.
    //   `Perf.hitches` -> { on, overMs, seen, lost, list: [{ at, ms, level, place, tags, taskMs,
    //                       tex, mesh, assets, meshes, heapMb }] }
    get hitches() {
      return { on: hitchOn, overMs: HITCH_MS, seen: hitchSeen, lost: hitchLost,
               // Whether Chrome is reporting long-animation-frame here. Without it every `loafMs`
               // is 0 and that 0 means "unavailable", not "no render work" — a consumer that
               // cannot tell those apart will read a platform gap as a measurement.
               loaf: loafOK,
               list: HITCHES.slice() };
    },
    // Off in release: a released game logs nothing and installs neither observer nor shim, so the
    // whole instrument is one boolean test at the top of tick(). A harness turns it on the same way
    // it pins a level — one call through the page, `Perf.setHitchLog(true)`, after the game boots.
    // Returns whether it is on. It stays on without PerformanceObserver — the frame times, the
    // upload counts and the heap delta still record; only the `task` and `asset` tags go missing.
    setHitchLog(v) {
      const on = !!v;
      hitchOn = on;
      if (!on) return false;
      // Turning it on twice is deliberately allowed and is not a reset of the log: perf.js loads
      // before gl.js (index.html:1991), so an enable that happens before the renderer exists gets
      // no upload shim, and the only way back from that is to ask again.
      hitchAt = performance.now();
      hasMem = typeof performance !== 'undefined' && !!performance.memory;
      hitchHeap = heapNow();
      upTex = 0; upMesh = 0; upNames = [];
      if (!observers.length) {
        observe('longtask', tasks); observe('resource', loads);
        // Chrome's own per-frame breakdown. Free — the browser is already timing this.
        loafOK = observe('long-animation-frame', loafs);
      }
      jsTimerOn();
      wrapUploads();
      return hitchOn;
    },

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
      // Re-arm the warmup, exactly as coming back to a visible tab does above and as setAuto does
      // below, and for the same stated reason: do not judge the frames a change costs. A place
      // change is the largest change in the game — the scene builds, rigs stream, and the first
      // frames after it are 40-250 ms, which is under stallMs() and therefore counted at full
      // weight into the window average. Two such windows is a tier, the room then sits in the dead
      // band between the raise and drop thresholds, and the tier never comes back for that visit.
      // That made an identical entry settle at a different tier each time it was measured: 10 of
      // 21 places disagreed across three cold entries (.reports/ladder-analysis.md). The three
      // callers of this statement must stay identical; .laddercheck.js is the check.
      started = -1;
      blockedUntil.fill(-1e9); blockedFor.fill(0); blockedFails.fill(0); lastBlocked = -1;
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
      level = initialAutoLevel();
      started = -1;                    // re-arm the warmup: do not judge the frames a change costs
      apply('auto');
    },
    get levels() { return LEVELS.map(l => ({ name: l.name, en: l.en })); },
    get label() { return `${LEVELS[level].name}${auto ? '' : ' ·'}`; },
  };
})();
