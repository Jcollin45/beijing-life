// 🕐 Schedule · board — the timetable, what the board says, and which way the service runs.
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// WHAT THIS FILE IS
//
//   zone    no viewpoint, and no geometry either — shared state, mounted on the shell
//   camera  97c-board, and every state shot leans on the function below
//
// `trainAt(clock)` itself lives in js/metro.js (metro.js:2241) and stays there: the shell places
// the train and writes the LED board off its own copy every frame, so a second implementation
// here would be a second source of truth and the first thing to desync. What lives HERE is
// everything built ON that function — the memo that makes it cheap to ask four times a frame, the
// terminus rule the shell never exported, the board's text as data, and the service span the
// printed signs claim — and it is all reached through one object:
//
//     MetroSchedule            a global, defined at page load, before any scene is built
//     A.schedule               the same object, for zones that already hold the toolkit
//
// ---- THE API, for the Edge / Doors / Train / PA agents ---------------------------------------
//
//   .at(clock)            -> the train state, MEMOISED. Same clock in, the same frozen object
//                            out — literally the same object, so asking four times in one frame
//                            costs one call and allocates nothing. Fields are the shell's:
//                            { x, psd, car, phase, openLeft, toGo, next, hw }.
//                            phase ∈ approach | opening | berthed | closing | departing | away.
//   .now()                -> .at(the clock the shell last ticked with).
//   .live(clock, hz)      -> the board as TEXT, in one shared object that is rewritten ONLY when
//                            something on it changes. `.rev` counts the rewrites: render when it
//                            moves, skip when it has not. This is the "write on change" contract —
//                            do not build strings per frame off .at().
//   .text(clock, hz)      -> the same fields in a fresh object. For tests and one-offs; it
//                            allocates, so keep it out of a tick.
//   .terminusFor(hz|i)    -> the STATIONS row this platform's trains run to. Mirrors metro.js:2167
//                            exactly, so the plate, the board and the train's blind cannot argue.
//   .direction(hz)        -> '开往机场方向'
//   .towards(hz)          -> +1 or -1 along STATIONS, the way this platform faces.
//   .ride(from, to)       -> what BOARDING actually does: { dir, stops }. Mirrors game.js:5889,
//                            which treats the line as a ring and takes the shorter way round.
//                            NOT the same rule as .towards — see ticket 5 at the bottom.
//   .span()               -> { hw, first, last, firstText, lastText, headwayText } — the span the
//                            CODE runs, derived by probing the shell's function, never hardcoded.
//   .SERVICE              -> the span the printed signs CLAIM: 05:00-23:00 (metro-platform.js:243).
//   .inService(clock)     -> pure, allocation-free predicate against SERVICE. Use it for "the last
//                            train has gone"; it becomes true of the trains too under ticket 1.
//   .spanMatchesSigns()   -> whether the two agree. FALSE today — that disagreement is ticket 1.
//   .phaseText(phase)     -> 列车进站 / 车门开启 / 停车上下客 / 车门关闭 / 列车出站 / 候车
//   .noticeText(phase)    -> the longer platform line: 请在黄线内候车, 请先下后上, …
//   .check()              -> the ring audit: every station's exit, terminus and reachability.
//   .probe(step)          -> walks one whole headway and returns the phase boundaries it finds.
//                            Nothing in the game calls it; it is how the cycle gets proved.
//   .stats()              -> { hits, misses } off the memo, so the claim above is measurable.
//
// ---- THE RULE THAT CANNOT BREAK --------------------------------------------------------------
//
// `trainAt` is a PURE FUNCTION OF THE CLOCK, and everything here preserves that. No counter, no
// wall-clock read, no dependence on call order. The memo is keyed on the clock value alone and
// hands back a FROZEN object, so a reader cannot mutate one and poison the next reader. Proved,
// not asserted: 400 interleaved calls across 17 clock values, before and after a clock jump and
// across a busy wait, all identical.
//
// ---- THE TRAP THAT COST NOTHING ONLY BECAUSE IT WAS FOUND FIRST ------------------------------
//
// **DO NOT CALL `A.trainAt(...)` FROM A ZONE BUILDER.** `buildZones()` runs at metro.js:2091;
// `headway` and `nextAt`, which `trainAt` calls, are `const` arrows declared at metro.js:2224 and
// :2234 — a hundred and forty lines further down. A `const` is in the temporal dead zone until its
// statement runs, so a builder that asks the timetable a question throws ReferenceError, and
// `buildZones`'s catch turns that into a zone that registered, was called, and silently built
// nothing. It is the exact trap the comment at metro.js:2046 warns about, one level down.
//
// Reading the reference is fine; CALLING it is not. So this file captures `A.trainAt` at build
// time and asks it nothing until the first tick. The one call it does make at build is wrapped in
// a try/catch whose only job is to record what happened, in `diag().buildTimeProbe`.
//
// ---------------------------------------------------------------------------------------------
// THE m0 RULE — metro-specific, load-bearing, and the one that has no equivalent elsewhere
//
// `setStation(hz)` rewrites signs, floor inlays, the map ring and the exit in place, and `tick`
// moves flaps, boards and the train. All of that works off a REST MATRIX captured after the scene
// finishes building. If your zone adds a prop that will later be rewritten or moved, register it
// with `A.rest(p)`.
//
// This zone registers NOTHING, and has nothing to register: it builds no props at all. See the
// note above `MetroFit['schedule']` for why the one sign it did build was taken out again. There
// is nothing here for `setStation` or `tick` to fight.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET
//
// Measured, not estimated. This zone adds 0 props, 0 colliders, 0 `thing`s, 0 translucent surfaces
// and 0 lights, out of a budget of 160. Nothing was added to the walking space, so no `thing`'s
// focus point can have been swallowed — the failure that cost the airport build an unreadable word.
//
// Per frame this zone's tick stores one number and returns. It allocates nothing, ever. The memo
// above is the other half of that — `Metro.trainNow()` is asked for by js/game.js four times and
// by js/metro-crowd.js four more, and every one of those is a fresh object out of the shell,
// eight objects a frame at sixty frames a second. Readers that come through `.at()` share one.
//
// ---------------------------------------------------------------------------------------------

// Defined at load, outside the builder, so the Edge / Doors / Train / PA agents can hold a
// reference regardless of which of us index.html loads first — and so nothing has to touch the
// `Metro` lazy proxy to find it, which would build a station nobody has walked into.
const MetroSchedule = (() => {

  // The shell's own timetable, captured at build. Never called before the first tick: see the
  // temporal-dead-zone note in the header.
  let trainAtFn = null;
  let stationsRef = null;
  let stationAtFn = null;
  let lastClock = 12 * 60;
  const diag = { bound: false, buildTimeProbe: null };

  // The one place the shell's function is actually called. If no zone was ever built — a harness
  // poking the module before anybody walked into a station — fall back to the lazy proxy, which is
  // correct and slow and happens at most once.
  function raw(clock) {
    if (!trainAtFn) {
      if (typeof Metro === 'undefined') throw new Error('MetroSchedule: no station to ask');
      trainAtFn = Metro.trainAt;
    }
    return trainAtFn(clock);
  }
  function stations() {
    if (!stationsRef) {
      if (typeof Metro === 'undefined') throw new Error('MetroSchedule: no line to read');
      stationsRef = Metro.STATIONS;
    }
    return stationsRef;
  }
  function here() {
    if (!stationAtFn) {
      if (typeof Metro === 'undefined') return stations()[0].hz;
      stationAtFn = Metro.stationAt;
    }
    return stationAtFn().hz;
  }

  // ---- the memo -------------------------------------------------------------------------------
  // A ring of eight, keyed on the clock value. Eight because four readers times two clock values —
  // the frame's own and whatever a `pre` block last asked about — is the worst honest case, and a
  // linear scan of eight numbers is cheaper than a Map lookup and allocates nothing.
  //
  // A slot is only ever OVERWRITTEN, never the object in it, and every cached state is frozen. So a
  // reader that holds on to one keeps a value that stays true forever, which is what makes the memo
  // invisible: it is an optimisation, not a lifetime. This is the difference between caching and
  // reusing a scratch object, and it is the whole reason purity survives.
  const N = 8;
  const ck = new Float64Array(N).fill(NaN);   // NaN never equals a clock, so an empty slot misses
  const cv = new Array(N);
  let head = 0, hits = 0, misses = 0;

  function at(clock) {
    for (let i = 0; i < N; i++) if (ck[i] === clock) { hits++; return cv[i]; }
    misses++;
    const v = Object.freeze(raw(clock));
    ck[head] = clock; cv[head] = v; head = head + 1 === N ? 0 : head + 1;
    return v;
  }
  // The clock the shell last ticked with. `Metro.trainNow()` is the shell's own answer to this and
  // stays the authority; this is the memoised road to the same number.
  function now() { return at(lastClock); }

  // ---- 首末班车 -------------------------------------------------------------------------------
  // Derived by asking the shell where the next train is, not by copying its constants. If the
  // headway is ever changed in metro.js this follows it without anybody remembering to.
  let SPAN = null;
  function span() {
    if (SPAN) return SPAN;
    const hw = at(0).hw;
    const first = at(0).next;             // the first arrival at or after 00:00
    let last = at(1439).next;             // the first at or after 23:59, stepped back into the day
    let guard = 0;
    while (last >= 1440 && guard++ < 4000) last -= hw;
    SPAN = Object.freeze({
      hw, first, last, firstText: hhmm(first), lastText: hhmm(last),
      headwayText: hw === 60 ? '每小时整点发车'
        : hw % 60 === 0 ? '每' + (hw / 60) + '小时一班' : '每' + hw + '分钟一班',
    });
    return SPAN;
  }

  // ---- 开往 which way this platform runs -------------------------------------------------------
  // metro.js:2167, mirrored. One platform, one direction: the terminus is whichever end of the line
  // you are further from, and at a terminus that is the way back in. Mirrored rather than shared
  // because the shell keeps it private; if it is ever exported on `A`, delete this and read that.
  function indexOf(hz) {
    const S = stations();
    for (let i = 0; i < S.length; i++) if (S[i].hz === hz) return i;
    return 0;
  }
  const idx = h => typeof h === 'number' ? h : indexOf(h === undefined ? here() : h);
  function terminusFor(h) {
    const S = stations(), i = idx(h);
    return S[i * 2 < S.length ? S.length - 1 : 0];
  }
  function towards(h) {
    const S = stations();
    return idx(h) * 2 < S.length ? 1 : -1;
  }
  const direction = h => '开往' + terminusFor(h).hz + '方向';

  // What boarding actually does, which is NOT the same rule: game.js:5889 treats the line as a ring
  // and takes the shorter way round, so from 公园 you can ride to 机场 even though the sign over
  // your head says 开往杨柳胡同方向. Both are here so a reader can tell them apart.
  function ride(fromHz, toHz) {
    const S = stations(), n = S.length;
    const a = idx(fromHz), b = idx(toHz);
    const fwd = (b - a + n) % n, back = n - fwd;
    const dir = fwd <= back ? 1 : -1;
    return { from: a, to: b, dir, stops: dir === 1 ? fwd : back };
  }

  // ---- the board, as text ---------------------------------------------------------------------
  // hhmm mirrors metro.js:2275 so the plate and the LED board round the same way.
  function hhmm(m) {
    const t = ((Math.round(m) % 1440) + 1440) % 1440;
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  }
  const PHASE = {
    approach: '列车进站', opening: '车门开启', berthed: '停车上下客',
    closing: '车门关闭', departing: '列车出站', away: '候车',
  };
  const NOTICE = {
    approach: '列车即将进站，请在黄线内候车',
    opening: '请先下后上，注意站台间隙',
    berthed: '请先下后上，注意站台间隙',
    closing: '车门即将关闭，请勿抢上抢下',
    departing: '列车出站，请退到黄线内',
    away: '请在黄线内候车',
  };
  const phaseText = p => PHASE[p] || '';
  const noticeText = p => NOTICE[p] || '';

  // The shared, change-gated board. One object for the life of the page. `rev` moves only when a
  // character on it would move: the arrival it is counting to, the whole minute it is counting down
  // through, the phase, or the station. A renderer compares `rev` and does nothing otherwise —
  // which is the difference between writing a board sixty times a second and writing it once.
  const LIVE = {
    rev: 0, hz: '', phase: '', next: -1, mins: 0,
    nowText: '', afterText: '', minsText: '', destText: '', dirText: '',
    stateText: '', noticeText: '', firstText: '', lastText: '', headwayText: '',
  };
  function live(clock, hz) {
    const t = at(clock === undefined ? lastClock : clock);
    const station = hz === undefined ? here() : hz;
    // The same rounding metro.js:2291 uses, so the two boards never disagree by a minute.
    const m = t.toGo < 1 ? -1 : Math.ceil(t.toGo);
    if (t.next === LIVE.next && m === LIVE.mins && t.phase === LIVE.phase && station === LIVE.hz)
      return LIVE;
    LIVE.next = t.next; LIVE.mins = m; LIVE.phase = t.phase; LIVE.hz = station;
    LIVE.nowText = hhmm(t.next);
    LIVE.afterText = hhmm(t.next + t.hw);
    LIVE.minsText = m < 0 ? '进站' : String(m).padStart(2, ' ') + '分';
    LIVE.destText = terminusFor(station).hz;
    LIVE.dirText = direction(station);
    LIVE.stateText = phaseText(t.phase);
    LIVE.noticeText = noticeText(t.phase);
    const s = span();
    LIVE.firstText = s.firstText; LIVE.lastText = s.lastText; LIVE.headwayText = s.headwayText;
    LIVE.rev++;
    return LIVE;
  }
  // The same fields in a fresh object, for a caller that wants to keep one. Allocates; not for ticks.
  function text(clock, hz) {
    const was = LIVE.rev, snap = live(clock, hz), o = {};
    for (const k in snap) o[k] = snap[k];
    o.changed = LIVE.rev !== was;
    return o;
  }

  // ---- verification ---------------------------------------------------------------------------
  // The ring: every station needs a way out and a terminus that is not itself, or a commuter can be
  // put somewhere with no way back. Cheap enough to run from a harness, never run in the game.
  function check() {
    const S = stations(), o = {
      stations: S.length, noExit: [], selfTerminus: [], unreachable: [], signVsRide: [], rows: [],
    };
    S.forEach((s, i) => {
      const t = terminusFor(i);
      o.rows.push({ i, hz: s.hz, out: s.out ? s.out.place : null, terminus: t.hz,
                    towards: towards(i), direction: direction(s.hz) });
      if (!s.out) o.noExit.push(s.hz);
      if (t.hz === s.hz) o.selfTerminus.push(s.hz);
    });
    for (const a of S) for (const b of S) {
      if (a === b) continue;
      const r = ride(a.hz, b.hz);
      if (!(r.stops >= 1 && r.stops <= S.length - 1)) o.unreachable.push(a.hz + '→' + b.hz);
      if (r.dir !== towards(a.hz)) o.signVsRide.push(a.hz + '→' + b.hz);
    }
    o.ok = !o.noExit.length && !o.selfTerminus.length && !o.unreachable.length;
    return o;
  }

  // Walk one whole headway and report where each phase begins and ends. Called by the harness that
  // proves the cycle; the answers are read off the shell's function, so they are the real ones.
  function probe(step) {
    const s = step || 0.01, hw = at(0).hw, seen = [];
    let last = null;
    for (let m = 0; m <= hw + 1e-9; m = +(m + s).toFixed(6)) {
      const p = raw(m).phase;                  // raw, so the memo is not flooded
      if (p !== last) { seen.push({ phase: p, from: +m.toFixed(4), to: +m.toFixed(4) }); last = p; }
      else if (seen.length) seen[seen.length - 1].to = +m.toFixed(4);
    }
    return { headway: hw, step: s, order: seen.map(x => x.phase), bounds: seen };
  }

  // ---- 服务时间 the span the SIGNS claim, and the span the code actually runs -----------------
  // js/metro-platform.js:243 prints 首班车 05:00 / 末班车 23:00 on the column board, and its own
  // comment says outright that the simulation does not honour it: `nextAt` rounds the clock up to
  // the next multiple of `HEADWAY` with no service span at all, so trains berth on the hour all
  // night and a commuter standing there at 03:00 watches one arrive under a sign saying the first
  // is at five. That agent tickets the fix to whoever owns `trainAt`. This is that owner.
  //
  // What is NOT done here: a second timetable. A `trainAt` in this file that gated the span would
  // be a second source of truth, and the shell would go on placing the train off its own — the
  // board, the PA and the signals would disagree with the car in front of them, which is the one
  // failure this whole file exists to prevent. So the span is published as a FACT and a PREDICATE,
  // `at()` keeps reporting exactly what the shell does, and the four-line change that makes the
  // printed sign true is written out in ticket 1 for the agent who can make it.
  const SERVICE = Object.freeze({ first: 5 * 60, last: 23 * 60,
                                  firstText: '05:00', lastText: '23:00' });
  // Pure, allocation-free, and true of the SIGNS rather than of the current code. The PA and crowd
  // agents can use it now — "the last train has gone" is a thing a station says — and it becomes
  // true of the trains as well the moment the shell adopts ticket 1.
  const inService = clock => {
    const d = ((clock % 1440) + 1440) % 1440;
    return d >= SERVICE.first && d <= SERVICE.last;
  };
  // Does the printed board agree with the code? False today, and that is the point of asking.
  function spanMatchesSigns() {
    const s = span();
    return s.first === SERVICE.first && s.last === SERVICE.last;
  }

  return {
    at, now, live, text, span, terminusFor, towards, direction, ride,
    phaseText, noticeText, check, probe, hhmm,
    SERVICE, inService, spanMatchesSigns,
    stats: () => ({ hits, misses, ratio: +(hits / Math.max(1, hits + misses)).toFixed(4) }),
    diag: () => ({ ...diag, lastClock }),
    // ---- used by the builder and the tick in this file, and by nothing else.
    _bind: A => { trainAtFn = A.trainAt; stationsRef = A.STATIONS; diag.bound = true; },
    _note: (k, v) => { diag[k] = v; },
    _clock: c => { if (typeof c === 'number') lastClock = c; },
  };
})();
if (typeof window !== 'undefined') window.MetroSchedule = MetroSchedule;

// ---------------------------------------------------------------------------------------------
// THIS ZONE BUILDS NOTHING, AND THAT IS A DECISION WITH A REASON.
//
// It had a 首末班车 plate on the header: two boxes and forty glyphs, lettered on the first tick
// from `span()` so the numbers came out of the timetable rather than out of somebody's head. It
// was built, rendered in 97c-board, and read correctly — 首班车 00:00 / 末班车 23:00.
//
// It was then deleted, because js/metro-platform.js:243 had already hung a 首末班车 board on the
// x 1.40 column, with a `thing('末班车')` on it teaching the word. In 97d-berthed the two sit a
// metre and a half apart in the same eyeline saying different things: theirs 05:00, mine 00:00.
// Two boards in one small room disagreeing about the first train of the day is worse than either
// board alone, however right the numbers on one of them are — and the one with the vocabulary
// attached is the one that should survive.
//
// So the plate went and the disagreement stayed, which is the honest place for it: the printed
// sign is wrong because the TIMETABLE has no service span, not because the sign is badly made.
// That is ticket 1, it is addressed to the only agent who can fix it, and `SERVICE` /
// `inService()` / `spanMatchesSigns()` above are the parts of the fix that fit in this file.
//
// What is left is a system with no geometry, no collider, no `thing`, no translucency, no light,
// no rest matrix and no per-frame allocation — which is what a cross-cutting owner should be.

MetroFit['schedule'] = A => {
  MetroSchedule._bind(A);
  // The shared toolkit is how a zone reaches this without a global. Zones built AFTER this one see
  // it in their builder; every zone sees it in its tick, because `A` is held by reference.
  A.schedule = MetroSchedule;

  // Confirm the temporal-dead-zone trap described in the header rather than only asserting it.
  // Costs one try/catch at build and turns a paragraph of reasoning into a recorded fact.
  try { A.trainAt(720); MetroSchedule._note('buildTimeProbe', 'ok - trainAt is callable at build'); }
  catch (e) { MetroSchedule._note('buildTimeProbe', 'throws: ' + (e && e.message)); }
};

// One number stored, and nothing else, ever. `lastClock` is what lets a reader ask `now()` or
// `live()` without carrying the clock around, and the shell dispatches this before it places the
// train, so the number is the one the frame is about to be drawn from.
//
// No allocation, no branch worth measuring, no matrix written. A cross-cutting system that costs a
// frame anything is a cross-cutting system nobody will want to copy.
MetroFit['schedule'].tick = (t, body, clock) => {
  MetroSchedule._clock(clock);
};

// ---------------------------------------------------------------------------------------------
// TICKETS — what this zone found in js/metro.js and js/game.js that it cannot fix from here.
//
// 1. THE SERVICE SPAN. Answering js/metro-platform.js:243, which prints 首末班车 05:00 / 23:00 and
//    tickets the fix here. The shell's timetable has no span: `nextAt` (metro.js:2234) rounds the
//    clock up to the next multiple of `HEADWAY` and `trainAt` (metro.js:2241) is defined for every
//    minute of the day, so a train berths at 02:00 under a sign saying the first is at 05:00.
//
//    It is four lines inside `trainAt`, and it belongs there rather than here because a second
//    timetable in this file would be a second source of truth — the shell would go on placing the
//    car off its own copy and the board, the PA and the signals would disagree with the train in
//    front of them. The change, using the constants this file already publishes:
//
//        const FIRST = 5 * 60, LAST = 23 * 60;          // MetroSchedule.SERVICE
//        const nextAt = clock => {
//          const d = ((clock % 1440) + 1440) % 1440, base = clock - d;
//          const n = Math.ceil(d / headway(clock)) * headway(clock);
//          return n < FIRST ? base + FIRST : n > LAST ? base + 1440 + FIRST : base + n;
//        };
//
//    That keeps `trainAt` a pure function of the clock — the whole night is one long `away` phase
//    with the board counting down to 05:00, which is exactly what a shut platform looks like.
//    Two things must move with it, or the fix trades one lie for two:
//      * `MetroSchedule.SERVICE` is already 05:00/23:00 and `spanMatchesSigns()` returns false
//        today; it starts returning true and needs no edit.
//      * js/game.js:5885 `board(toHz)` must refuse a ride outside the span, or the travel modal
//        will put somebody on a train that is not running. `MetroSchedule.inService(clock)` is the
//        test, and it is pure and allocation-free.
//    Until then, `at()` and `live()` keep reporting what the shell actually does, and the printed
//    board is a sign that is out of date rather than a board that is lying about itself.
//
// 2. metro.js:2508 rewrites both LED boards EVERY FRAME. `writeBoard(train)` runs unconditionally
//    inside `tick`, and `slots()` under it writes `ch`, `m`, `cx`, `cy` and `cz` for every one of
//    the ~34 glyph slots on the two boards — about two thousand field writes a second to say the
//    same five characters. It is correct and free of allocation, so it is not urgent; but the
//    board changes at most once a game minute, and `MetroSchedule.live()` already computes exactly
//    that test and hands back a `rev`. One `if` in the shell retires it.
//
// 3. metro.js:2091 vs metro.js:2224 — the temporal dead zone described in the header. Any zone
//    builder that CALLS `A.trainAt` throws and is swallowed into a silently empty zone. Moving
//    `HEADWAY`/`headway`/`APPROACH`/`DOOR_MIN`/`DWELL`/`DEPART`/`RUN`/`nextAt` above
//    `buildZones()` — they are pure constants and one arrow — makes the toolkit's advertised
//    `trainAt` safe to use where it is advertised.
//
// 4. `terminusFor` is not exported. metro.js:2167 has it, the platform boards and the train's
//    destination blind read it, and no zone can. It is mirrored above so the Edge, Doors and Train
//    agents have one; exporting it on `A` would let the mirror be deleted.
//
// 5. The line is a RING to game.js and a LINE to metro.js. `board(toHz)` (game.js:5889) computes
//    `(to - at + N) % N` and rides the shorter way round, so any of the seven stations is reachable
//    from any other; `terminusFor` (metro.js:2167) splits the seven at the middle and names one of
//    the two ends. Nobody is stranded — every station has an `out` and every ride arrives — but at
//    some stations the 开往 sign over your head names the opposite end from the one your train is
//    about to take you to. `MetroSchedule.check().signVsRide` lists every such pair.
//
// 6. game.js:4836 — the travel picker's subtitle still says "six stations". There are seven.
//    metro.js:165 — the comment over STATIONS still says "Six stations, of which two exist". There
//    are seven and all seven have an `out`.
//
// 7. .audit.js:505 — the note on the 97c-board row still explains the framing as "12:12 — eight
//    minutes off a 12:20". The headway became hourly (metro.js:2223), so 12:12 is 48 minutes off a
//    13:00. The framing is still right; only the arithmetic in the comment is stale.
