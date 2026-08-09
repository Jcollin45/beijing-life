// 🚶 Crowd — The WALK graph and the commuter legs, plus 高峰 rush-hour density: IMPROVEMENT 4
//
// Registered into MetroFit (declared at the top of js/metro.js). See METRO.md for the full zone +
// camera contract. This file is yours alone; nothing else in the build writes to it.
//
// ---------------------------------------------------------------------------------------------
// THE CONTRACT
//
//   zone    the commuters — shared state on the shell
//   camera  96-crowd, 96b-onsteps, 97g-boarding
//
// The WALK graph and the commuter legs, plus 高峰 rush-hour density: IMPROVEMENT 4. The crush is
// what makes a metro read as a metro. This is the collider-aware routing the docs want lifted
// into the rest of the game, so keep it clean enough to generalise.
//
// ---------------------------------------------------------------------------------------------
// WHY THIS FILE HAS ITS OWN PEOPLE
//
// js/game.js already walks six commuters round a seven-stage loop, and that loop is good: it buys
// a ticket, taps a real turnstile, queues at a screen door, boards a real train and rides away on
// it. What it cannot do is get bigger from out here. `COMMUTERS`, `commuterLegs`, `stationEnter`
// and `claimSpot` all live inside game.js's IIFE, so there is no way to add a seventh person to
// that loop or to change a leg of it from a zone file.
//
// What there IS is the roster fold: a zone hangs its people on `MetroFit[k].cast` and game.js
// pushes them through its own `initNPC` before the game starts (js/game.js:1091). So the twenty
// extra bodies below are ordinary NPCs — same wardrobe pass, same face seeds, same temperaments
// as anybody written into data.js — and everything about their BEHAVIOUR lives here:
//
//   * the LOOKS, in the cast at the bottom of this file;
//   * the ROUTER — a lane graph over `Metro.WALK`, every edge validated against the room's real
//     solids at build time, and a Dijkstra over it that hands back the corners. This is the piece
//     `UPGRADES.md:340` wants lifted out of the metro: nothing in `G` below knows it is in a
//     station. Give it points, edges and a collider and it gives back routes;
//   * the LEGS — the same seven stages the six authored commuters walk, expressed as destinations
//     rather than as hand-written corners, so the router picks the corridors. Move a bench and
//     these re-route; the hand-written ones walk through it;
//   * the DISPATCHER, which is the important trick. Each stage's last leg carries a `done` that
//     hands out the next stage, so the whole loop runs off `updateNPCs` — which every harness
//     calls — rather than off this zone's `tick`. Headless Chrome renders one frame in three, so
//     a crowd that only walks when `Metro.tick` runs is a crowd that does not walk in any
//     screenshot but its own.
//
// `tick` is left with the four things that genuinely need a frame: density against the clock, the
// crush (nudging standing bodies out of each other), 先下后上 (a queue standing aside for somebody
// getting off), and pulling anybody trackside back out of the world if a train leaves under them.
//
// ---------------------------------------------------------------------------------------------
// THE m0 RULE — metro-specific, load-bearing, and the one that has no equivalent elsewhere
//
// `setStation(hz)` rewrites signs, floor inlays, the map ring and the exit in place, and `tick`
// moves flaps, boards and the train, all off a REST MATRIX captured after the scene finishes
// building. A zone that adds a prop it will later move must register it with `A.rest(p)`.
//
// This zone builds NO props at all — it is people, and a person is an NPC, not a prop — so it has
// nothing to register. `zonesBuilt()` reports `crowd` with props 0, things 0, ok true, and that is
// the correct answer for it rather than a swallowed throw.
//
// ---------------------------------------------------------------------------------------------
// THE FRAME BUDGET — why the head count is a constant and not a feeling
//
// A person is not a prop. Props batch; a figure is 50–113 draws before batching, and while the
// collector does batch them down to about twenty calls whatever the crowd size, each body still
// pays for its own posing every frame (gaitPose, shape, arm, surf) and its own triangles.
// Profiling the shopping centre put 38% of the whole frame in figure work.
//
// And there is no distance falloff to hide behind: `Perf.q.npcFar` is 62 m at the top tier and
// this station is 12.8 m across, so EVERY person in it is always inside the draw distance.
// Frustum culling in `npcRange` is the only thing that saves anything and it is already there.
//
// So the budget is a HEAD COUNT — `PEAK` below — and it counts game.js's six as well as this
// file's twenty. Measured with `node .fpscheck.js metro` at 08:00, not at midday.
// ---------------------------------------------------------------------------------------------

MetroFit['crowd'] = A => {

  // ---------------------------------------------------------------- 高峰 the head count
  // 26 in the room at the two peaks, thinning through the day to one or two at eleven at night.
  // game.js's own six are inside this number, so this file supplies at most twenty.
  const PEAK = 26, POOL = 20;
  const BODY = .30;                     // the radius clampMove inflates every collider by
  const WALK_R = .26;                   // and the one the per-frame walk clamp uses — see `tick`

  const W = A.WALK;
  const { RZ, SX, GATEZ, EDGEZ, CARZ, DOORX } = A;
  const hall = W.hall, spine = W.spine;
  const LANES = [...W.inLane, ...W.outLane].sort((a, b) => a - b);

  // ---------------------------------------------------------------- 走位 widening the graph
  // The station's walk graph was drawn for six people and every list in it is exactly as long as
  // it needs to be for six: three consoles, five painted door marks, four hidden spots inside the
  // car. Twenty-six people want more places to stand than that, and `claimSpot` in game.js answers
  // "everything is taken" by putting somebody a body-length behind the last person — which for six
  // is a queue of two and for twenty-six is eight people in one spot.
  //
  // So the two shared lists grow, and they grow for game.js's six as well, which is the point: a
  // wider graph is a wider graph for everybody in the room.
  //
  //   queue  five door marks become five queues two deep. The second file sits 58 cm back, clear
  //          of the columns (they end at z 1.25) and behind the walking spine. It shares the
  //          door's x exactly, because boarding walks straight up in z from the mark through the
  //          screen-door opening — the clear opening is 66 cm, so a queue spot offset sideways
  //          would walk its owner into a pier.
  //   hide   the four wide spans of the car's flank take two people each, 30 cm either side of
  //          centre. The span is 1.22 m across, so a body at 30 cm is still behind panel.
  const QUEUE_BACK = .58;
  const marks = [];
  for (const x of DOORX) marks.push({ x, z: EDGEZ - .90 });
  for (const x of DOORX) marks.push({ x, z: EDGEZ - .90 - QUEUE_BACK });
  W.queue.length = 0;
  for (const q of marks) W.queue.push(q);

  const spans = W.hide.map(h => h.x);
  W.hide.length = 0;
  for (const x of spans) { W.hide.push({ x: x - .30, z: CARZ }); W.hide.push({ x: x + .30, z: CARZ }); }

  // Two lists that are this file's own, because widening them would move where game.js's six
  // stand and there is no need to.
  //
  //   machQ  one place in the queue behind each console.
  //   gateQ  how far back of the reader the second person in a 进站 queue stands. Only two deep,
  //          and that is the room's fault rather than a choice: the concourse is 3.65 m from the
  //          ticket wall to the gate line, the walking lane is at z -3.00 and the reader is at
  //          -2.35, so a third place in the queue would be standing in the lane. Everybody past
  //          the second waits on the lane and steps up as it clears, which is what a gate line in
  //          a cramped concourse actually looks like. 出站 gets no depth at all: on the platform
  //          side there is exactly one metre between the back of the cabinets and the front of
  //          the benches, which is one person and no more.
  //   gateLane  the cross-room lane on the PLATFORM side of the gates, halfway between the
  //          cabinets (they end at GATEZ + .52) and the benches (they start at z .02). It is the
  //          only way to reach the outer 出站 lane from the platform: a straight walk up from
  //          either outer lane goes through a litter bin at x ±2.30.
  W.machQ = W.mach.map(m => ({ x: m.x, z: m.z + .62 }));
  W.gateQ = [0, .60];
  W.gateLane = GATEZ + 1.05;
  // Which side of the stairwell you walk on. Everybody keeps right, so coming down (heading +z)
  // that is -x and going up (heading -z) it is +x — two files on the flight instead of three
  // tracks of people walking through each other.
  W.stairSide = .34;
  //   well   somewhere to STAND at the head of the flight, which is the one standing area in this
  //          room that had no list. Every other one — consoles, gate readers, painted marks, spots
  //          inside the car — is a list somebody owns a place in, and the stairwell was a single
  //          hard-coded point that this file put everybody on: `anchorFor` case 0 returned
  //          `stairTop.x - stairSide` with no index in it at all, so a reseat that handed stage 0
  //          to four people put four people at exactly (-5.44, -7.90), d = 0. It is also the one
  //          place `separate()` cannot help, because the well is outside the room's zone box and
  //          the clamp there would fling a body back into the concourse. So it gets a list.
  //
  //          Five lanes at 44 cm, one row, 50 cm behind `stairTop`. Three constraints fix those
  //          numbers and there is no room to round them:
  //            * behind the daylight panel. Its front face is at -RZ - 2.11 and a body is 20 cm
  //              deep, so anything at z < -7.51 is out of sight; -8.40 is well clear, and shallow
  //              enough that the sight line up the well over the soffit has not changed much from
  //              the -7.90 that is already proven.
  //            * inside the flight. `Metro.liftAt` returns 0 beyond |x - SX| > 1.15 — a body there
  //              would stand at floor level inside the stairwell — and the well's tiled cheeks
  //              have their inner faces at SX ± 1.14. ±0.88 plus a 22 cm shoulder is 1.10.
  //            * clear of game.js's own six, who stand at `stairTop.z` on lanes of ±0.42
  //              (js/game.js:577). One row 50 cm behind them clears all three of those lanes by
  //              50 cm, which no interleaving in x alone could do: their three lanes and a 42 cm
  //              separation between two crowds do not both fit across 2.3 m of well.
  //
  //          Two rows of five, because 进站 holds a spot until it sets off down the flight and 出口
  //          holds one for the whole walk across the concourse, so a reseat can want eight at once.
  //          Deeper is better hidden, not worse: what closes the well is the daylight panel at
  //          -7.31, and the further back a body stands the steeper the line that would have to
  //          clear the top of it. Min separation 44 cm across and 55 cm back, both over the 42 cm
  //          the harness calls sharing a place.
  const WELLZ = W.stairTop.z - .50;
  W.well = [];
  for (let r = 0; r < 2; r++)
    for (let k = -2; k <= 2; k++)
      W.well.push({ x: W.stairTop.x + k * .44, z: WELLZ - r * .55 });

  // ---------------------------------------------------------------- the router
  //
  // THIS IS THE PART MEANT TO BE LIFTED (UPGRADES.md:340). It knows nothing about metros: give it
  // points, the pairs that may be walked between, and the room's solids, and it hands back the
  // corners of a route that never crosses one. Everything station-specific is in `layout()`.
  //
  // Why a graph at all, when the old six walked hand-written corners: a hand-written corner is
  // only correct until somebody moves a bench. `Metro.solids` is the truth, every edge is tested
  // against it once at build time, and an edge that has stopped being walkable is dropped and
  // counted rather than quietly walking a body through a column.
  const G = {
    x: [], z: [], adj: [], n: 0,
    // Scratch, allocated once. Dijkstra over fifty nodes runs a few times a second — once per
    // commuter per leg — and it must not make garbage every time.
    dist: [], prev: [], seen: [],
    node(x, z) {
      for (let i = 0; i < this.n; i++)
        if (Math.abs(this.x[i] - x) < 1e-4 && Math.abs(this.z[i] - z) < 1e-4) return i;
      this.x.push(x); this.z.push(z); this.adj.push([]);
      this.dist.push(0); this.prev.push(-1); this.seen.push(false);
      return this.n++;
    },
    link(a, b) {
      if (a === b || this.adj[a].indexOf(b) >= 0) return;
      this.adj[a].push(b); this.adj[b].push(a);
    },
    // Nearest node to a loose point, for "route me from wherever I happen to be standing".
    near(x, z) {
      let best = 0, bd = Infinity;
      for (let i = 0; i < this.n; i++) {
        const d = (this.x[i] - x) ** 2 + (this.z[i] - z) ** 2;
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    },
    // Dijkstra, O(n²), which over fifty nodes is a few tens of microseconds and needs no heap.
    path(a, b, out) {
      out.length = 0;
      for (let i = 0; i < this.n; i++) {
        this.dist[i] = Infinity; this.prev[i] = -1; this.seen[i] = false;
      }
      this.dist[a] = 0;
      for (;;) {
        let u = -1, bd = Infinity;
        for (let i = 0; i < this.n; i++)
          if (!this.seen[i] && this.dist[i] < bd) { bd = this.dist[i]; u = i; }
        if (u < 0 || u === b) break;
        this.seen[u] = true;
        const ad = this.adj[u];
        for (let k = 0; k < ad.length; k++) {
          const v = ad[k];
          const d = bd + Math.hypot(this.x[v] - this.x[u], this.z[v] - this.z[u]);
          if (d < this.dist[v]) { this.dist[v] = d; this.prev[v] = u; }
        }
      }
      if (this.dist[b] === Infinity) return false;
      for (let i = b; i >= 0; i = this.prev[i]) out.push(i);
      out.reverse();
      return true;
    },
  };
  W.graph = G;

  // The room's colliders, and the clamp. The same arithmetic as build.js's `clampMove`, rewritten
  // to write its answer into two module-level numbers rather than return a pair: this runs once
  // per standing body per frame at the peak, and a two-element array per call is twenty-six
  // allocations a frame for nothing.
  // `WSOL` is the same list with the room's three DOORWAYS taken out of it — the platform edge
  // (everything beyond it is the train, and walking into a train is the point of a station), the
  // mouth of the stairwell (a hole in the -z wall people walk through) and the gate lane barriers
  // (which open when somebody taps). Those are the same three exemptions `.stationcheck.js` makes
  // and the same three the census names. It exists because `tick` now clamps this file's own
  // twenty against the furniture every frame, and clamping them against a doorway would stop
  // them boarding, stop them leaving and strand anybody whose gate failed to open.
  let SOL = null, WSOL = null, ZONE = null, CX = 0, CZ = 0;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  // `list` and `zone` default to the room-clamp behaviour every existing caller wants. The walk
  // clamp passes WSOL and zone false: the head of the stairs is outside the zone box by
  // construction, so applying it there would fling a body back down into the concourse.
  function clampXZ(x, z, r, list, zone) {
    CX = x; CZ = z;
    const SL = list || SOL;
    if (!SL) return;
    if (ZONE && zone !== false) {
      CX = cl(CX, ZONE.x0 + r, ZONE.x1 - r); CZ = cl(CZ, ZONE.z0 + r, ZONE.z1 - r);
    }
    for (let i = 0; i < SL.length; i++) {
      const s = SL[i];
      if (s.open) continue;
      if (CX > s.x0 - r && CX < s.x1 + r && CZ > s.z0 - r && CZ < s.z1 + r) {
        const dl = CX - (s.x0 - r), dr = (s.x1 + r) - CX;
        const db = CZ - (s.z0 - r), df = (s.z1 + r) - CZ;
        const mn = Math.min(dl, dr, db, df);
        if (mn === dl) CX = s.x0 - r;
        else if (mn === dr) CX = s.x1 + r;
        else if (mn === db) CZ = s.z0 - r;
        else CZ = s.z1 + r;
      }
    }
  }
  // Is a point walkable at all — the exact question the report's "nobody is inside a collider"
  // proof asks. Clamping a point to itself is the whole test.
  function clear(x, z, r) {
    clampXZ(x, z, r === undefined ? BODY : r);
    return Math.abs(CX - x) < 1e-6 && Math.abs(CZ - z) < 1e-6;
  }
  // And a segment, sampled at 12 cm. Coarser than that and a body walks the corner off a bench.
  function segClear(x0, z0, x1, z1, r) {
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / .12));
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      if (!clear(x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, r)) return false;
    }
    return true;
  }
  // Nearest walkable point to a wanted one. Every standing spot this file invents goes through it,
  // so a spot can be written down as roughly where it should be and still be provably legal.
  function snap(x, z, r) { clampXZ(x, z, r === undefined ? BODY : r); return { x: CX, z: CZ }; }
  W.clear = clear; W.segClear = segClear; W.snap = snap;

  // ---------------------------------------------------------------- the station's own lanes
  // The node set, in the shape the room actually is: two clear cross-room lanes — the concourse
  // hall in front of the machines, the platform spine behind the columns — with spurs off them.
  // Every corner a body may turn at is a node and every spur is a straight run in one axis,
  // because every diagonal across this room hits something.
  const NODE = {};
  let dropped = 0, weak = 0, blockedSpots = 0;
  // A spur — a console, a painted mark. If the geometry says a body cannot walk it, it is not
  // there, and the router simply routes round it.
  function linkChecked(a, b) {
    if (segClear(G.x[a], G.z[a], G.x[b], G.z[b], BODY)) G.link(a, b);
    else dropped++;
  }
  // A trunk — the two lanes, the two cross corridors, the gate columns. These are the room's
  // authored routes and the six commuters already in it walk them, so a failed check here is
  // news rather than a reason to disconnect half the station: the edge stays and is counted.
  // `weak` in the census is the number of authored lanes the geometry disagrees with.
  function linkVital(a, b) {
    if (!segClear(G.x[a], G.z[a], G.x[b], G.z[b], BODY)) weak++;
    G.link(a, b);
  }
  // A standing spot of this file's own, snapped onto walkable floor before it becomes a node.
  function spot(p) {
    if (clear(p.x, p.z, BODY)) return p;
    blockedSpots++;
    const s = snap(p.x, p.z, BODY);
    p.x = s.x; p.z = s.z;
    return p;
  }
  const nearestOf = (list, x) =>
    list.reduce((b, v) => (Math.abs(v - x) < Math.abs(b - x) ? v : b), list[0]);

  function layout() {
    // ---- the concourse lane, and the flight down to it
    const hallXs = [...new Set([SX + .30, ...W.mach.map(m => m.x), ...LANES])].sort((a, b) => a - b);
    const hallN = hallXs.map(x => G.node(x, hall));
    for (let i = 1; i < hallN.length; i++) linkVital(hallN[i - 1], hallN[i]);
    NODE.hallAt = x => G.node(nearestOf(hallXs, x), hall);
    // The stairwell is a hole in the -z wall, so the two nodes in it are outside the room's
    // walkable zone by construction and cannot be validated against it — the wall these pass
    // through is the doorway.
    const top = G.node(SX, W.stairTop.z), foot = G.node(SX, W.stairFoot.z);
    G.link(top, foot);
    G.link(foot, G.node(SX + .30, hall));
    NODE.top = top; NODE.foot = foot;
    // ---- the three consoles, each with one place in the queue behind it
    // A CONSOLE YOU CAN ACTUALLY REACH. `W.mach` is game.js's list and stands somebody at
    // MFZ + .33 = -4.15, while the machine bank's collider ends at MFZ + .04 = -4.44 — which
    // inflated by a 30 cm body reaches -4.14. The authored spot is ONE CENTIMETRE inside it, so
    // `segClear` failed, `linkChecked` dropped all three console spurs, and every commuter who
    // decided to buy a ticket got `legsTo`'s no-route fallback: stand still where you are, for the
    // 4.5-to-9-second dwell meant for buying one. Two of them did that in the same place at the
    // foot of the stairs for six seconds in the pure-node run.
    //
    // Snapped to walkable floor with 2 cm to spare rather than moving game.js's list, which its own
    // six are standing on and which is not this file's to rewrite. `census().droppedEdges` is the
    // number that says whether this is still true.
    W.machAt = W.mach.map(m => snap(m.x, m.z, BODY + .02));
    W.mach.forEach((m, i) => {
      const q = spot(W.machQ[i]);
      const qn = G.node(q.x, q.z), f = G.node(W.machAt[i].x, W.machAt[i].z);
      linkChecked(G.node(m.x, hall), qn);
      linkChecked(qn, f);
    });
    // ---- the lane on the platform side of the gates, and then the gate columns themselves.
    // Everything within a metre of the gate line is authored rather than validated: the barrier
    // IS a solid until somebody taps it, and tapping is what a commuter does at it, so a
    // clearance test there measures a door and calls it a wall.
    const gateLaneN = LANES.map(x => G.node(x, W.gateLane));
    for (let i = 1; i < gateLaneN.length; i++) linkVital(gateLaneN[i - 1], gateLaneN[i]);
    NODE.gateQ = {};
    NODE.gateLaneAt = x => G.node(nearestOf(LANES, x), W.gateLane);
    for (const lx of LANES) {
      const inbound = W.inLane.indexOf(lx) >= 0;
      // Where you stand to tap, and where you come out. 进站 taps from the concourse; 出站 taps
      // from the platform.
      const wait = G.node(lx, GATEZ + (inbound ? -W.tap : W.tap));
      const past = G.node(lx, GATEZ + (inbound ? W.tap : -W.tap));
      G.link(wait, past);                                   // through the barrier
      NODE.gateQ[lx] = [wait];
      if (inbound) {
        // A queue behind the reader, on the concourse side where there is room for one.
        let prev = wait;
        for (let k = 1; k < W.gateQ.length; k++) {
          const s = spot({ x: lx, z: GATEZ - W.tap - W.gateQ[k] });
          const n = G.node(s.x, s.z);
          linkVital(prev, n); prev = n;
          NODE.gateQ[lx].push(n);
        }
        linkVital(G.node(lx, hall), prev);
        G.link(past, G.node(lx, W.gateLane));               // out onto the platform-side lane
      } else {
        G.link(G.node(lx, W.gateLane), wait);               // in off the platform-side lane
        linkVital(past, G.node(lx, hall));                  // out into the concourse
      }
    }
    // ---- the platform spine, and the two cross corridors that reach it. Those two are the only
    // runs between the gate line and the platform that miss the columns, the benches and the bins.
    const spineXs = [...new Set([...W.cross, ...DOORX])].sort((a, b) => a - b);
    const spineN = spineXs.map(x => G.node(x, spine));
    for (let i = 1; i < spineN.length; i++) linkVital(spineN[i - 1], spineN[i]);
    for (const cx of W.cross) linkVital(G.node(cx, W.gateLane), G.node(cx, spine));
    NODE.spineAt = x => G.node(nearestOf(spineXs, x), spine);
    // ---- each door: the back of its queue, its painted mark, the doorway, the car. Beyond the
    // platform edge everything is train, so those are authored — walking into the car is the
    // point of them.
    DOORX.forEach(x => {
      const back = G.node(x, EDGEZ - .90 - QUEUE_BACK), mark = G.node(x, EDGEZ - .90);
      linkVital(G.node(x, spine), back);
      linkVital(back, mark);
      const brd = G.node(x, W.board), car = G.node(x, CARZ);
      G.link(mark, brd); G.link(brd, car);
    });
    // ---- along the inside of the car, so somebody who boarded at one door can walk to a hidden
    // spot behind a different span of its flank.
    const carXs = [...new Set([...DOORX, ...W.hide.map(h => h.x)])].sort((a, b) => a - b);
    const carN = carXs.map(x => G.node(x, CARZ));
    for (let i = 1; i < carN.length; i++) G.link(carN[i - 1], carN[i]);
  }

  // ---------------------------------------------------------------- state
  // `lastBoard` and `lastOff` are the two traffic regulators game.js has and this file did not:
  // when somebody last stepped aboard, and when somebody last stepped off. Both in game-clock
  // minutes. Without them twenty people used one doorway on one frame.
  const S = { ready: false, mine: [], theirs: [], N: null,
              lastClock: -1e9, frame: 0, lastTap: -1e9, route: [],
              lastBoard: -1e9, lastOff: -1e9 };
  MetroFit['crowd'].state = S;

  Lazy.onBuild('Metro', mod => {
    try { start(mod); }
    catch (e) { console.error('MetroFit crowd.start: ' + (e && e.message)); }
  });

  function start(mod) {
    if (S.ready) return;
    SOL = mod.solids || null;
    ZONE = (mod.zones && mod.zones[0]) || null;
    // The three doorways, found by their own extents rather than by index, so a solid added or
    // reordered in metro.js cannot silently turn one of them back into a wall.
    if (SOL) {
      const RX = A.RX;
      const doorway = s =>
        // the platform edge: the whole width of the room, everything past it is train
        (Math.abs(s.z0 - (EDGEZ - .18)) < 1e-6 && Math.abs(s.x0 + RX) < 1e-6)
        // the mouth of the stairwell: a hole in the -z wall
        || (Math.abs(s.z0 + RZ) < 1e-6 && Math.abs(s.z1 - (-RZ + .28)) < .02)
        // the gate lane barriers: solid until somebody taps, and tapping is what a commuter does
        || Math.abs(s.z1 - (GATEZ + .34)) < 1e-6;
      WSOL = SOL.filter(s => !doorway(s));
    }
    layout();
    // This zone's twenty, which game.js pushed through `initNPC` at load off
    // `MetroFit['crowd'].cast` — the same array, so they are reachable here without going near
    // the roster. Everything they need that `initNPC` does not set was written into the cast row.
    S.mine = MetroFit['crowd'].cast.filter(n => n.th);
    if (!S.mine.length) {
      // The roster fold did not run, which means this build of game.js has no `MetroFit[k].cast`.
      // Say so once, loudly, rather than shipping a station that is quietly still empty.
      console.error('MetroFit crowd: the cast was never folded into the roster');
      return;
    }
    // game.js's own six, if the harness handle is up. They are only READ — for the head count,
    // for 先下后上 and for keeping out of their way — so an absent roster costs the crowd its
    // manners, not its existence.
    const g = typeof window !== 'undefined' && window.__game;
    S.N = g && Array.isArray(g.NPCS) ? g.NPCS : null;
    S.theirs = S.N ? S.N.filter(n => n.commuter && n.place === 'metro' && !n.crowd) : [];
    // Somewhere to stand is held by whoever is standing in it: one array per list, the same
    // length, holding the person or null. No allocation to claim or release.
    own(W.mach); own(W.queue); own(W.hide); own(W.well);
    W.inLane.own = new Array(W.inLane.length * W.gateQ.length).fill(null);
    W.outLane.own = new Array(W.outLane.length).fill(null);
    S.ready = true;
    // Put the hour's crowd in the room NOW, at build, rather than waiting for the first tick.
    // Headless Chrome runs a frame only when a screenshot forces one, and within that frame
    // `updateNPCs` runs before `scene.tick` — so a station that populates itself on its first
    // tick photographs empty, and the crowd turns up one shot late. This is also simply correct
    // for the player: the room is full the instant it exists.
    let now = 8 * 60;
    try { now = g.state().minutes; } catch (e) { /* no handle, or no state yet */ }
    S.lastClock = now;
    reseat(now);
  }
  const own = list => { list.own = new Array(list.length).fill(null); };

  // Everything `updateNPCs` would have done for somebody who was out of the world when it last
  // ran. Without it a body placed by `scene.tick` is not `awake` and has no `pose`, and
  // `npcRange` skips exactly those two cases — so the frame that puts them in the room is a
  // frame they are not drawn on. The neutral pose lasts one frame; the walk cycle takes over on
  // the next.
  function wake(c) {
    c.awake = true;
    if (!c.pose && typeof POSE !== 'undefined') c.pose = { ...POSE };
    c.th.pos[0] = c.x; c.th.pos[2] = c.z;
    c.th.focus[0] = c.x; c.th.focus[1] = c.z;
    try { c.lift = Metro.liftAt(c.x, c.z); } catch (e) { c.lift = 0; }
  }


  // ---------------------------------------------------------------- claiming somewhere to stand
  // Nobody shares a console, a place in a gate queue, a painted mark or a spot inside the car.
  // `prefer` is where to start looking, so a claim degrades to the next nearest rather than to the
  // far end of the platform. Returns -1 when everything is taken, and the caller has to have an
  // answer for that — see the queue-behind-the-queue in stages 1, 2 and 5.
  // TWO CROWDS, ONE LIST. `W.mach`, `W.queue` and `W.hide` are game.js's arrays — this file only
  // widened two of them — and game.js claims a place in them with its own `claimSpot`, which scans
  // `COMMUTERS` and cannot see anybody in here. `take` scans `list.own`, which game.js never
  // writes. So the two mechanisms were disjoint over shared lists and both could hand out slot 5:
  // .stationcheck.js caught 乘客二十四 and 乘客十二 standing 37 cm apart on the same painted mark,
  // both carrying doorIx 5, for 76 frames.
  //
  // Only one direction of this is fixable from here — game.js still cannot see our claims — so a
  // double-booking is now half as likely rather than impossible. See the report: the other half is
  // `claimSpot` at js/game.js:554, which would have to read `list.own` as well.
  //
  // The field names line up for the three shared lists (machIx, doorIx, hideIx); `gateIx` is this
  // file's own name and nobody over there carries one, so the scan is a cheap no-op for the lanes.
  function theirsHold(c, field, k) {
    for (let i = 0; i < S.theirs.length; i++) {
      const o = S.theirs[i];
      if (o !== c && !o.gone && o[field] === k) return true;
    }
    return false;
  }
  function take(list, c, field, prefer) {
    drop(list, c, field);
    const from = prefer === undefined ? (c.seed + c.pick) % list.length : prefer;
    for (let i = 0; i < list.length; i++) {
      const k = (from + i) % list.length;
      if (!list.own[k] && !theirsHold(c, field, k)) { list.own[k] = c; c[field] = k; return k; }
    }
    c[field] = -1;
    return -1;
  }
  // Somewhere of their own to stand at the head of the flight. Held across a claim so that the
  // reseat anchor, the first waypoint of 进站 and the last of 出口 are all the SAME point rather
  // than three that have to agree; released by `release` when they leave the well.
  //
  // The fallback when all five are taken is a second row rather than a shared spot: the whole
  // point of this list is that no two bodies stand on one place, and handing out a duplicate the
  // moment the room gets busy would give that up exactly when it shows.
  function wellSpot(c) {
    if (c.wellIx != null && c.wellIx >= 0 && W.well.own[c.wellIx] === c) return W.well[c.wellIx];
    const k = take(W.well, c, 'wellIx');
    if (k >= 0) return W.well[k];
    return { x: W.stairTop.x + ((c.seed % 5) - 2) * .44, z: W.well[0].z - 1.10 };
  }
  function drop(list, c, field) {
    const k = c[field];
    if (k == null || k < 0) { c[field] = null; return; }
    if (list.own && list.own[k] === c) list.own[k] = null;
    c[field] = null;
  }
  function nearestIx(list, x) {
    let b = 0;
    for (let i = 1; i < list.length; i++)
      if (Math.abs(list[i].x - x) < Math.abs(list[b].x - x)) b = i;
    return b;
  }
  function release(c) {
    drop(W.mach, c, 'machIx'); drop(W.queue, c, 'doorIx');
    // THE TWO LANE LISTS SHARE ONE FIELD NAME, so they cannot be released with two `drop` calls.
    // `drop` reads the slot out of `c[field]`, clears `own[slot]` only if it is this person's, and
    // then NULLS THE FIELD — so `drop(W.inLane, …)` on somebody holding an outbound slot cleared
    // nothing, nulled `gateIx`, and `drop(W.outLane, …)` then found `k == null` and returned. The
    // outbound slot stayed owned by a body that had left the station.
    //
    // Two of those leak both 出站 lanes, and every commuter after that falls into stage 5's "both
    // lanes busy" branch, which stands them on the spine and re-asks for ever. Measured in
    // .crowdsim.js: eighteen of twenty stuck at 出站 within an hour of game time, in a heap at
    // W.cross[1]. `.stationcheck.js` never saw it — 900 frames is one reseat and half a headway.
    const k = c.gateIx;
    if (k != null && k >= 0) {
      if (W.inLane.own && W.inLane.own[k] === c) W.inLane.own[k] = null;
      if (W.outLane.own && W.outLane.own[k] === c) W.outLane.own[k] = null;
    }
    c.gateIx = null;
    drop(W.well, c, 'wellIx');
  }
  // Their own steady share of a range, from their own stream rather than Math.random, so a
  // replayed run is the same run.
  function rnd(c) { c.rs = (c.rs * 1103515245 + 12345) & 0x7fffffff; return (c.rs >>> 8) / 8388608; }
  const span = (c, a, b) => a + rnd(c) * (b - a);

  // ---------------------------------------------------------------- the legs
  // A stage is a destination and a thing to do when you get there; the corners in between come out
  // of the router. `off` is applied to the two lane nodes only — the cross corridors are one-way
  // by convention (cross[0] in, cross[1] out) so there is no opposing traffic on either to walk
  // through, and they are 2.2 m apart between the middle columns where an offset track would clip
  // the granite base of one.
  function legsTo(c, tx, tz, speed) {
    const out = [];
    if (!G.path(G.near(c.x, c.z), G.near(tx, tz), S.route)) {
      // No route at all — which should be impossible, and is exactly the case that used to march
      // somebody into a wall for ever. Stand still and ask again in a moment.
      out.push({ at: [c.x, c.z], dwell: .6, face: c.yaw, act: 'wait' });
      return out;
    }
    for (let i = 1; i < S.route.length; i++) {
      const k = S.route[i];
      let x = G.x[k], z = G.z[k];
      if (Math.abs(z - hall) < 1e-4 || Math.abs(z - spine) < 1e-4) z += c.off;
      out.push({ at: [x, z], speed });
    }
    if (!out.length) out.push({ at: [tx, tz], speed });
    else { const last = out[out.length - 1]; last.at[0] = tx; last.at[1] = tz; }
    return out;
  }
  // The same, from a point they are not standing on yet — the tail of a hand-authored run.
  function legsFrom(c, fx, fz, tx, tz, speed) {
    const wx = c.x, wz = c.z;
    c.x = fx; c.z = fz;
    const legs = legsTo(c, tx, tz, speed);
    c.x = wx; c.z = wz;
    return legs;
  }
  // The last leg of a stage carries the handover. `updateNPCs` shifts the leg, nulls the errand
  // and only then calls `done`, so assigning the next stage from inside it is safe — and it is
  // what keeps this crowd walking under `tickNPCs` alone.
  function chain(legs, fn) {
    const last = legs[legs.length - 1], was = last.done;
    last.done = () => { if (was) was(); fn(); };
    return legs;
  }

  const nextStage = c => { c.stage = (c.stage + 1) % 7; setStage(c); };

  function setStage(c) {
    // Where they stand if the chain ever breaks: exactly where they are, so a broken loop is
    // somebody standing still rather than somebody marching across the room.
    c.spots[0].at[0] = c.x; c.spots[0].at[1] = c.z;
    switch (c.stage) {
      // ---- 进站. Down the flight, keeping right, and then either to a console or — as most of
      // this line does — straight at the gates on a 交通卡. Three consoles for twenty-six people
      // is not a shortage worked around, it is what a Beijing concourse looks like.
      case 0: {
        // A fresh console and a fresh doorway every lap, so the same person does not wear a
        // groove between one machine and one screen door.
        c.pick++;
        const side = -W.stairSide;
        // Their own place at the head of the flight, and it is let go the moment they set off down
        // it — the well is a place to stand for a second, not a seat. Standing there used to be a
        // constant, `stairTop.x - stairSide`, shared by all twenty AND 8 cm off one of the three
        // lanes game.js gives its own six (js/game.js:577), which is how four people ended up on
        // one point and three separate pairs came out of one spot.
        const w = wellSpot(c);
        const legs = [
          { at: [w.x, w.z], dwell: span(c, .2, 1.1), face: 0,
            done: () => drop(W.well, c, 'wellIx') },
          { at: [W.stairFoot.x + side, W.stairFoot.z], speed: 1.02 },
        ];
        const k = rnd(c) < .22 ? take(W.mach, c, 'machIx') : -1;
        if (k >= 0) {
          const m = W.machAt[k];
          for (const l of legsFrom(c, W.stairFoot.x + side, W.stairFoot.z, m.x, m.z))
            legs.push(l);
          const last = legs[legs.length - 1];
          last.dwell = span(c, 4.5, 9.0); last.face = Math.PI; last.act = 'buy';
        } else {
          legs.push({ at: [W.stair.x, hall + c.off] });
        }
        c.errand = chain(legs, () => nextStage(c));
        return;
      }
      // ---- 闸机. Take a place in one of the two 进站 queues, tap, and go through while the lane
      // is open. The gates are not faked: this calls the same `Metro.openGate` the player's own
      // fare does, so the flaps really slide and the arrow really goes green.
      case 1: {
        drop(W.mach, c, 'machIx');
        const slot = take(W.inLane, c, 'gateIx');
        if (slot < 0) {
          // Both queues full: wait on the concourse lane in front of the gates and try again.
          // A knot of people short of the gate line is exactly what eight in the morning is.
          const lx = W.inLane[c.seed % W.inLane.length];
          const legs = legsTo(c, lx, hall + c.off);
          const last = legs[legs.length - 1];
          last.dwell = span(c, .6, 1.5); last.face = 0; last.act = 'wait';
          c.errand = chain(legs, () => setStage(c));
          return;
        }
        const li = slot % W.inLane.length, qi = Math.floor(slot / W.inLane.length);
        c.laneX = W.inLane[li];
        c.gateQi = qi;
        const n = NODE.gateQ[c.laneX][qi];
        const legs = legsTo(c, G.x[n], G.z[n]);
        const last = legs[legs.length - 1];
        last.dwell = span(c, .5, 1.2); last.face = 0; last.act = 'wait';
        // Only the person at the reader taps. Second in the queue stands, and steps up to the
        // reader when it frees — which is the difference between a queue and two people walking
        // into a turnstile at once.
        c.errand = chain(legs, () => (qi === 0 ? tap(c, true) : stepUp(c)));
        return;
      }
      // ---- 候车. Up the inbound corridor and onto a painted mark, or into the file behind one.
      case 2: {
        // Preferred from a mark rather than from anywhere in the list, so the five painted marks
        // fill before the five places behind them. `take` scans forward and wraps, so the file
        // behind a door is still reached once every mark is taken.
        const k = take(W.queue, c, 'doorIx', (c.seed + c.pick) % DOORX.length);
        if (k < 0) {
          const x = DOORX[c.seed % DOORX.length];
          const legs = legsTo(c, x, spine + c.off);
          const last = legs[legs.length - 1];
          last.dwell = span(c, .8, 1.8); last.face = 0; last.act = 'wait';
          c.errand = chain(legs, () => setStage(c));
          return;
        }
        const q = W.queue[k];
        const legs = legsTo(c, q.x, q.z);
        const last = legs[legs.length - 1];
        last.dwell = span(c, .4, 1.1); last.face = 0; last.act = 'wait';
        c.markX = q.x; c.markZ = q.z;
        c.errand = chain(legs, () => nextStage(c));
        return;
      }
      // ---- 上车. Handled by `hold`, because whether it is time to move depends on a train that
      // may or may not be there and the leg queue has no way to say "wait until".
      case 3: hold(c); return;
      // ---- 下车. Back in the world behind the car's flank, on a later train, and off it through
      // the nearest doorway. What is seen of this is somebody stepping out of the car.
      case 4: {
        const hi = c.hideIx != null && c.hideIx >= 0 ? c.hideIx : nearestIx(W.hide, c.x);
        const h = W.hide[hi];
        // OUT OF THE NEAREST DOOR, whether or not its painted mark happens to be free. This used
        // to be `take(W.queue, …)`, and `take` scans forward and WRAPS — so somebody standing at
        // one end of the car whose nearest mark was claimed was sent the length of the platform
        // INSIDE the train to get off at the other end. That walk is trackside for every second of
        // it, and four of them at once is most of what "people went through the doors at once" was
        // counting. Which mark is free decides whether they claim one, not which door they use.
        const dx0 = DOORX.reduce((b, x) => (Math.abs(x - h.x) < Math.abs(b - h.x) ? x : b), DOORX[0]);
        const near = nearestIx(W.queue, dx0);
        if (!W.queue.own[near] && !theirsHold(c, 'doorIx', near)) take(W.queue, c, 'doorIx', near);
        const d = { x: dx0, z: EDGEZ - .90 };
        c.alighting = true;
        const legs = [
          { at: [h.x, CARZ], dwell: span(c, .3, 1.2), face: Math.PI },
          { at: [d.x, CARZ], speed: 1.00, done: () => drop(W.hide, c, 'hideIx') },
          { at: [d.x, W.board], speed: 1.50 },
          { at: [d.x, EDGEZ - .90], done: () => { c.alighting = false; } },
        ];
        for (const l of legsFrom(c, d.x, EDGEZ - .90, d.x, spine + c.off)) legs.push(l);
        c.errand = chain(legs, () => { drop(W.queue, c, 'doorIx'); nextStage(c); });
        return;
      }
      // ---- 出站. Back down the outbound corridor and out through one of the 出站 lanes.
      case 5: {
        const slot = take(W.outLane, c, 'gateIx');
        if (slot < 0) {
          // Both 出站 lanes busy: wait back on the spine rather than stand in the doorway of the
          // gate line. There is one metre between the cabinets and the benches and it holds one
          // person per lane, so the overflow of a rush hour waits on the platform.
          const legs = legsTo(c, W.cross[1], spine + c.off);
          const last = legs[legs.length - 1];
          last.dwell = span(c, .6, 1.5); last.face = Math.PI; last.act = 'wait';
          c.errand = chain(legs, () => setStage(c));
          return;
        }
        c.laneX = W.outLane[slot];
        const n = NODE.gateQ[c.laneX][0];
        const legs = legsTo(c, G.x[n], G.z[n]);
        const last = legs[legs.length - 1];
        last.dwell = span(c, .5, 1.2); last.face = Math.PI; last.act = 'wait';
        c.errand = chain(legs, () => tap(c, false));
        return;
      }
      // ---- 出口. Across the concourse and away up the steps, keeping right on the other side of
      // the well from whoever is coming down. Out of the world at the top, and back later as
      // somebody else's journey: walking to the foot of the stairs and turning round to buy
      // another ticket is the same lie as boarding a train and stepping off it again.
      default: {
        const side = W.stairSide;
        const w = wellSpot(c);
        const legs = legsTo(c, W.stairFoot.x + side, W.stairFoot.z);
        legs.push({ at: [w.x, w.z], speed: .98 });
        c.errand = chain(legs, () => {
          c.gone = true; c.byTrain = false;
          // `back` is only where they stand the frame they come back, and by then somebody else
          // may have the spot — so the return in `tick` claims a fresh one rather than trusting
          // this. Kept as the fallback for the one frame between.
          c.back = { x: w.x, z: w.z };
          c.away = span(c, 9, 26) * gap();
          release(c);
          c.stage = 6;                       // the next handout starts the loop again at 进站
        });
        return;
      }
    }
  }

  // Second in a 进站 queue: stand until the reader in front is free, then take it. Re-asked every
  // four tenths of a second, the same shape as the stand at a screen door — the leg queue has no
  // way to say "wait until", and a short stand-still re-issued is cheaper than teaching it one.
  function stepUp(c) {
    // Slot k is lane (k % lanes) at depth (k / lanes), so the head of this lane's queue is its
    // own lane index.
    const head = W.inLane.indexOf(c.laneX);
    if (!W.inLane.own[head] || W.inLane.own[head] === c) {
      if (take(W.inLane, c, 'gateIx', head) === head) {
        c.gateQi = 0;
        const n = NODE.gateQ[c.laneX][0];
        c.errand = chain([{ at: [G.x[n], G.z[n]], speed: .95, face: 0 }], () => tap(c, true));
        return;
      }
    }
    c.errand = [{ at: [c.x, c.z], dwell: .4, face: 0, act: 'wait', done: () => stepUp(c) }];
  }

  // Somebody else's fare, through the same gate the player's goes through. The sound is
  // rate-limited: twenty-six people tapping through in ninety seconds is a real gate line, and
  // twenty-six chimes a second is not.
  function tap(c, inbound) {
    const now = performance.now() / 1000;
    let opened = false;
    try { opened = Metro.openGate(inbound, c.laneX, now) !== null; } catch (e) { /* no gate yet */ }
    if (typeof TrainAudio !== 'undefined' && now - S.lastTap > .45) {
      S.lastTap = now;
      TrainAudio.gate('tap');
      if (opened) TrainAudio.gate('flap');
    }
    const to = inbound ? GATEZ + W.tap : GATEZ - W.tap;
    // Through the lane while it is open, which is the one place anybody in this room hurries.
    c.errand = chain([{ at: [c.laneX, to], speed: 1.46 }], () => {
      drop(inbound ? W.inLane : W.outLane, c, 'gateIx');
      nextStage(c);
    });
  }

  // The stage-3 stand, re-issued every four tenths of a second rather than held for a fixed time.
  // Being shut in is a successful boarding — that is the point of getting on a train — but the
  // walk over the gap takes about two seconds, so it only starts with real dwell left. And
  // 先下后上: nobody steps into a doorway somebody is coming out of.
  function hold(c) {
    // The mark was let go somewhere — go and claim another rather than wait at nothing.
    if (c.doorIx == null || c.doorIx < 0) { c.stage = 2; setStage(c); return; }
    // Second in the file at this door. Only the front row boards: somebody stepping past the
    // person in front of them and out through the same 66 cm doorway is the artefact this
    // removes, and stepping up as the mark clears is what a queue at a 屏蔽门 does anyway.
    if (c.doorIx >= DOORX.length) {
      const front = c.doorIx - DOORX.length;
      // `theirsHold` as well as `own`, or `take` would skip a mark game.js is standing on and hand
      // back a DIFFERENT door while `markX` still pointed at this one — somebody owning one mark
      // and boarding through another.
      if (!W.queue.own[front] && !theirsHold(c, 'doorIx', front)
          && take(W.queue, c, 'doorIx', front) === front) {
        const q = W.queue[front];
        c.markX = q.x; c.markZ = q.z;
        c.errand = chain([{ at: [q.x, q.z], speed: .95, face: 0 }], () => hold(c));
        return;
      }
      c.errand = [{ at: [c.x, c.z], dwell: .4, face: 0, act: 'wait', done: () => hold(c) }];
      return;
    }
    let t = null;
    try { t = Metro.trainNow(); } catch (e) { /* not built */ }
    const dx = c.markX === undefined ? c.x : c.markX;
    // ONE AT A TIME THROUGH THE DOORS. game.js regulates its own six with `lastBoardAt` and a gap
    // that narrows at the end of the dwell (js/game.js:9625); this file was written without an
    // equivalent, so all five painted marks satisfied the condition on the same frame and all five
    // set off together. .stationcheck.js counted seven bodies beyond the platform edge at once.
    //
    // In game-clock minutes, which is the clock everything else here runs on and which advances at
    // one minute per real second — `performance.now()` is useless for this because the harness
    // steps hundreds of simulated frames inside one real millisecond.
    //
    // Wide early in the dwell so they trickle through, and under half that at the end of it: with
    // the doors about to close, somebody still on the mark hurries aboard rather than watching it
    // go. 0.9 is measured rather than chosen — .crowdsim.js sweeps it, and 1.2 leaves three people
    // on the platform when the train goes while 0.5 puts six bodies past the edge at once.
    const gapNow = t && t.openLeft < 6.0 ? .4 : .9;
    if (t && t.psd > .85 && t.openLeft > 1.5 && !doorwayBusy(dx, c)
        && S.lastClock - S.lastBoard >= gapNow) {
      S.lastBoard = S.lastClock;
      // BESIDE THE DOOR THEY CAME IN BY, not wherever in the car is free. `take` scans forward and
      // WRAPS, so once the spots nearest a door were taken it handed back one at the far end of an
      // 12.8 m car — an eight-second shuffle, during every second of which that body is still
      // trackside and still being counted as somebody in the doorway. Five people boarding 1.2 min
      // apart were eight seconds each and .stationcheck.js saw all five at once.
      //
      // So: the nearest spot, or its neighbour, or share the nearest. Sharing is honest here and
      // nowhere else in this file — the two of them are behind the same 1.22 m panel for under a
      // second before both leave the world, which is a crowded car rather than two bodies in one
      // place, and a queue for a standing spot inside a train is not a thing that happens.
      const near = nearestIx(W.hide, dx);
      let hi = -1;
      for (const k of [near, near + 1, near - 1])
        if (k >= 0 && k < W.hide.length && !W.hide.own[k]) { hi = take(W.hide, c, 'hideIx', k); break; }
      const h = hi >= 0 ? W.hide[hi] : W.hide[near];
      c.errand = chain([
        { at: [dx, W.board], speed: 1.50 },
        // Aboard, and the doorway is somebody else's to queue at again.
        { at: [dx, CARZ], dwell: span(c, .3, .8), face: Math.PI,
          done: () => drop(W.queue, c, 'doorIx') },
        // Down the car at a shuffle. Nobody strides once they are aboard.
        { at: [h.x, CARZ], speed: 1.15 },
      ], () => {
        c.gone = true; c.byTrain = true; c.back = h;
        c.away = span(c, 7, 20) * gap();
        c.stage = 3;                          // the next handout is stage 4, stepping off
      });
      return;
    }
    c.errand = [{ at: [c.x, c.z], dwell: .4, face: 0, act: 'wait', done: () => hold(c) }];
  }
  // Is anybody stepping off through this doorway right now. The band runs from the platform edge
  // to the middle of the car, which is the whole of the crossing.
  function doorwayBusy(x, me) {
    for (let i = 0; i < S.mine.length; i++) {
      const o = S.mine[i];
      if (o === me || o.gone || !o.alighting) continue;
      if (Math.abs(o.x - x) < .70 && o.z > EDGEZ - .55 && o.z < CARZ - .20) return true;
    }
    for (let i = 0; i < S.theirs.length; i++) {
      const o = S.theirs[i];
      // game.js advances its stage counter as the legs are handed out, so somebody walking the
      // 下车 legs is carrying stage 5.
      if (o.gone || o.stage !== 5) continue;
      if (Math.abs(o.x - x) < .70 && o.z > EDGEZ - .55 && o.z < CARZ - .20) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- 高峰 how full the room is
  // The shape of the day is game.js's — twenty-four numbers, a sharp morning hump and a longer
  // evening one — read through `stationBusy()` so there is one curve in the game rather than two
  // that can disagree. The copy below is the fallback if that export ever goes away.
  const HOURS = [0, 0, 0, 0, 0, .10, .40, .85, 1.00, .70, .42, .46,
                 .54, .44, .36, .42, .64, .92, 1.00, .78, .52, .34, .18, .06];
  function busy(clock) {
    const g = typeof window !== 'undefined' && window.__game;
    if (g && typeof g.stationBusy === 'function') return g.stationBusy();
    const h = (((clock / 60) % 24) + 24) % 24, i = Math.floor(h) % 24;
    return HOURS[i] + (HOURS[(i + 1) % 24] - HOURS[i]) * (h - Math.floor(h));
  }
  // Trains are minutes apart at the peaks and much further apart at night, so somebody who has
  // just watched one go waits proportionally longer for the next.
  const gap = () => 1 + (1 - busy(S.lastClock)) * 1.7;
  const inRoom = list => { let k = 0; for (let i = 0; i < list.length; i++) if (!list[i].gone) k++; return k; };
  // How many of this file's twenty belong in the room: the hour's whole head count, less however
  // many of game.js's six are in it, because those are governed by that file's own arithmetic.
  const wantMine = clock =>
    Math.max(0, Math.min(POOL, Math.round(busy(clock) * PEAK) - inRoom(S.theirs)));

  // ---------------------------------------------------------------- the tick
  MetroFit['crowd'].tick = (t, body, clock) => {
    if (!S.ready) return;
    // The shell hands over wall-clock seconds rather than a delta, and some of the shots step it
    // by 1/30 while others hand it 1e12 to park an animation — so it is differenced here and
    // clamped to something a frame could plausibly be.
    const dt = S.lastT === undefined ? 1 / 60 : Math.min(.10, Math.max(0, t - S.lastT));
    S.lastT = t;
    // game.js's six, if they were not reachable when this zone started. `window.__game` is
    // assigned on the last line of that file's IIFE, and something in this build touches `Metro`
    // before then — so at build time the handle can genuinely not be up yet. Resolved once, here,
    // and then never looked for again.
    if (!S.N) {
      const g = typeof window !== 'undefined' && window.__game;
      if (g && Array.isArray(g.NPCS)) {
        S.N = g.NPCS;
        S.theirs = S.N.filter(n => n.commuter && n.place === 'metro' && !n.crowd);
      }
    }
    // The clock in this game jumps — a shift, a night's sleep, a flight — and a crowd that was
    // right at eight in the morning is wrong at three. A jump is the one moment the room may
    // rearrange, because nothing was on screen the frame before.
    if (Math.abs(clock - S.lastClock) > 5) { S.lastClock = clock; reseat(clock); }
    S.lastClock = clock;
    const train = Metro.trainNow();
    // ---- anybody trackside once the doors have shut went with the train. This runs every frame:
    // it is the only thing between a closing door and a body left standing on the ballast.
    //
    // The threshold is the doors CLOSED rather than closing, and that 8% matters: the car's flank
    // is what hides somebody leaving the world, and until the leaves have met there is a gap in it
    // to be seen through. Closed but not yet moving is the one frame where a body can be taken out
    // of the world with a metre of steel in front of it.
    if (train.psd < .08) for (let i = 0; i < S.mine.length; i++) {
      const c = S.mine[i];
      if (c.gone || c.z <= EDGEZ) continue;
      c.gone = true; c.byTrain = true; c.alighting = false;
      c.back = W.hide[nearestIx(W.hide, c.x)];
      c.away = 4 + (i % 7) * 1.6;
      c.errand = null; c.stage = 3;
      release(c); drop(W.hide, c, 'hideIx');
    }
    // ---- who is due back, and whether the hour still wants them. Nobody is ever pulled out of
    // the room to meet the number — they finish the journey they are on and the crowd thins as
    // they go, which is how a station actually empties. This only governs who is let back in.
    let awake = 0;
    for (let i = 0; i < S.mine.length; i++) if (!S.mine[i].gone) awake++;
    const want = wantMine(clock);
    for (let i = 0; i < S.mine.length; i++) {
      const c = S.mine[i];
      if (!c.gone) continue;
      c.away -= dt;
      if (c.away > 0) continue;
      if (awake >= want) { c.away = 3 + (i % 5); continue; }
      // Somebody who left on a train has to arrive on one, and needs enough dwell left to walk out
      // of it before the doors shut. Getting off is the longer of the two walks.
      if (c.byTrain && !(train.psd > .9 && train.openLeft > 6.0)) { c.away = .5; continue; }
      // And spaced, the same way boarding is. A platform fills by ones and twos between trains, not
      // in a batch on each: without this the whole backlog stepped out of one car on one frame,
      // which is half of what "seven people went through the doors at once" was counting.
      if (c.byTrain && clock - S.lastOff < 1.2) { c.away = .3; continue; }
      if (c.byTrain) S.lastOff = clock;
      // Somebody coming back down the steps claims a fresh place at the head of them: the one they
      // left from was released when they went, and standing on it again without asking is how two
      // bodies end up in one spot behind the daylight panel.
      const b = c.byTrain ? (c.back || W.hide[0]) : wellSpot(c);
      c.x = b.x; c.z = b.z;
      c.yaw = c.byTrain ? Math.PI : 0;
      c.ground = 0; c.gone = false; c.errand = null;
      c.stage = c.byTrain ? 3 : 6;            // nextStage takes them to 4 (off) or 0 (in)
      awake++;
      nextStage(c);
      wake(c);
    }
    // ---- and anybody with no legs at all, because a `done` was missed somewhere
    for (let i = 0; i < S.mine.length; i++) {
      const c = S.mine[i];
      if (!c.gone && (!c.errand || !c.errand.length)) setStage(c);
    }
    // ---- and back out of the furniture. Neither of these allocates.
    //
    // THE ROUTER IS COLLIDER-AWARE AND THE WALKER IS NOT. Every edge in `G` is tested against the
    // room's real solids at build time, but `updateNPCs` turns a corner as soon as it is within
    // 30 cm of the waypoint (`arrival`, js/game.js:5258) — so what a body actually walks is a
    // chord across each corner, not the lane. The one run between the gate line and the platform
    // passes the columns with 5 cm to spare at a body radius, and .stationcheck.js caught four
    // people up to 15 cm into one: 乘客二十九 at (1.03, 0.59) walking to (0.75, 2.11), and
    // 乘客三十 at (4.54, 1.32) pushed off the spine by the crush and never clamped back.
    //
    // `separate` already had the clamp and only reached it when somebody was actually being
    // pushed — `if (px === 0 && pz === 0) continue` returns before it — so a body walking alone
    // into a column was never corrected. This is the same arithmetic `clampMove` does for the
    // player, run on this file's own twenty every frame.
    //
    // 26 cm, not the 30 the graph was validated at, deliberately: an edge that `segClear` passed
    // at 30 keeps 4 cm of slack under this, so a lane the geometry only just allows cannot become
    // a lane nobody can walk. The harness measures shoulders at 22 cm and fails past 6 cm of
    // overlap, so 26 leaves 10 cm of margin on the check as well.
    S.frame++;
    for (let i = 0; i < S.mine.length; i++) {
      const c = S.mine[i];
      if (c.gone || c.z > EDGEZ) continue;
      clampXZ(c.x, c.z, WALK_R, WSOL, false);
      c.x = CX; c.z = CZ;
    }
    doorwayDance(train);
    // Every frame, not every other one. The nudge is capped at 5 cm a call, so on alternate frames
    // two people who had ended up 37 cm apart took half a second to walk out of each other — over
    // the twelve frames .stationcheck.js calls standing in the same place. At full rate the same
    // pair clears in a quarter of that and the pure-node sweep goes from 14 sharing frames to 0
    // across every hour of the day. It is 20 bodies against 19 each and a clamp only for the ones
    // actually being pushed; see the note above the walk clamp for what that costs.
    separate();
  };

  // 先下后上, and the lean. Two things a Beijing platform does that a Western one does not: the
  // queue leans in as the train comes down the tunnel, and it opens out of the way of whoever is
  // stepping off before it closes up again. Both are written into the standing leg's own waypoint
  // rather than into the body, or the walker would immediately walk back to the old one. Nobody is
  // ever leaned past EDGEZ - .78, which is behind the yellow line.
  function doorwayDance(train) {
    const lean = train.phase === 'approach'
      ? Math.min(1, 1 - train.toGo / 2.2) * .22 : 0;
    for (let i = 0; i < S.mine.length; i++) {
      const c = S.mine[i];
      if (c.gone || c.stage !== 3 || c.markX === undefined) continue;
      const leg = c.errand && c.errand.length === 1 ? c.errand[0] : null;
      if (!leg || leg.act !== 'wait') continue;
      const aside = doorwayBusy(c.markX, c) ? (c.seed & 1 ? .42 : -.42) : 0;
      leg.at[0] = c.markX + aside;
      leg.at[1] = Math.min(EDGEZ - .78, c.markZ + lean);
    }
  }

  // Nobody stands inside anybody else. A crush is bodies close together, not bodies in the same
  // place, and with twenty-six of them in a 12.8 m room the difference is the whole read.
  //
  // Only this file's people are moved — game.js's six are walking to waypoints its own tick hands
  // out, and pushing them would be two systems fighting over one body — and only while they are
  // standing still, so a nudge never fights a stride. Every nudge goes through the same collider
  // clamp the player does, so being pushed out of one person can never push somebody into a
  // column.
  const SEP = .52;
  function separate() {
    const mine = S.mine, theirs = S.theirs;
    for (let i = 0; i < mine.length; i++) {
      const c = mine[i];
      if (c.gone || c.ground > .22 || c.z > EDGEZ || c.z < -RZ + .30) continue;
      let px = 0, pz = 0;
      for (let j = 0; j < mine.length; j++) {
        if (j === i) continue;
        const o = mine[j];
        if (o.gone || o.z > EDGEZ) continue;
        const dx = c.x - o.x, dz = c.z - o.z, d2 = dx * dx + dz * dz;
        if (d2 > SEP * SEP || d2 < 1e-6) continue;
        const d = Math.sqrt(d2), k = (SEP - d) * .5;
        px += dx / d * k; pz += dz / d * k;
      }
      for (let j = 0; j < theirs.length; j++) {
        const o = theirs[j];
        if (o.gone || o.z > EDGEZ) continue;
        const dx = c.x - o.x, dz = c.z - o.z, d2 = dx * dx + dz * dz;
        if (d2 > SEP * SEP || d2 < 1e-6) continue;
        const d = Math.sqrt(d2), k = (SEP - d) * .7;
        px += dx / d * k; pz += dz / d * k;
      }
      if (px === 0 && pz === 0) continue;
      const m = Math.hypot(px, pz), cap = .05;
      if (m > cap) { px = px / m * cap; pz = pz / m * cap; }
      clampXZ(c.x + px, c.z + pz, BODY);
      const leg = c.errand && c.errand.length === 1 ? c.errand[0] : null;
      if (leg && Math.hypot(leg.at[0] - c.x, leg.at[1] - c.z) < .45) {
        leg.at[0] += CX - c.x; leg.at[1] += CZ - c.z;
      }
      c.x = CX; c.z = CZ;
    }
  }

  // The clock has jumped, so put the hour's crowd in the room and spread it round the loop — the
  // same reasoning as game.js's `stationEnter`, for this file's twenty. Without it you come down
  // the steps at two in the morning to find the people who were here at eight standing exactly
  // where you left them, mid-stride.
  //
  // Each stage is entered at a plausible place for it rather than at the first corner of its
  // route, or a reseat puts everybody who is between the stairs and the gates in a heap at the
  // foot of the flight.
  // `i` is HOW MANY PEOPLE ARE ALREADY IN THIS STAGE, not the person's index in the roster, and
  // that is the whole of the fix. It used to be the roster index, and the roster index is exactly
  // the number the stage was picked with — `startable[(i * 3 + 1) % L]` — so within one stage the
  // surviving indices formed an arithmetic run whose step shared factors with every list length
  // here. With five startable stages the step was 5 and `DOORX[i % 5]` was the same door for all
  // four of them; with six it was 2, `(i * 3 + 1) % 6` only ever produced two of the six stages,
  // and ten people went to `inLane[i % 2]` with i always even — one x, three z, ten bodies.
  // Counting within the stage cannot alias: it walks each list one place at a time.
  function anchorFor(c, s, i) {
    switch (s) {
      // A claimed place at the head of the flight, not a constant. This one had no `i` in it at
      // all, so every person a reseat put into 进站 landed on the same point.
      case 0: { const w = wellSpot(c); return [w.x, w.z]; }
      case 1: return [spread(W.inLane, i), hall + c.off];
      // Spread along the lane just past the gates rather than all on the inbound corridor: a
      // reseat drops three or four people into each stage at once, and one anchor for all of
      // them is a heap that takes a second to walk itself apart.
      case 2: return [spread(LANES, i), W.gateLane];
      case 4: return [W.hide[i % W.hide.length].x, CARZ];
      case 5: return [spread(DOORX, i), spine + c.off];
      default: return [spread(W.outLane, i), hall + c.off];
    }
  }
  // The x for the i-th person into a stage, once round the list and then beside it. The wrap has
  // to move them ACROSS the lane, not along it: `c.off` is the only other term in these anchors
  // and it is ±26 cm, which is under the 42 cm the harness calls standing in the same place — so
  // two people who wrapped onto one lane were still sharing it however their tracks differed.
  // 46 cm, alternating either side, and row 0 is exactly the list so that a list nobody wraps off
  // — the eight spots inside the car — is left on its hidden spots untouched.
  function spread(list, i) {
    const row = Math.floor(i / list.length);
    const dx = row === 0 ? 0 : (row % 2 ? .46 : -.46) * Math.ceil(row / 2);
    return list[i % list.length] + dx;
  }
  function reseat(clock) {
    if (!S.ready) return;
    const want = wantMine(clock);
    let t = null;
    try { t = Metro.trainNow(); } catch (e) { /* not built */ }
    // Stages 3 and 4 begin trackside — in a doorway and inside the car — so they are only
    // available to start on when there is a car there to be inside. Stage 3 is never a start:
    // it is a stand at a painted mark, and somebody dropped into it away from one would wait for
    // a train in the middle of the concourse.
    const startable = t && t.psd > .9 ? [0, 1, 2, 4, 5, 6] : [0, 1, 2, 5, 6];
    // 7, not 3. A stride of 3 against six startable stages has gcd 3, so `(i * 3 + 1) % 6` takes
    // exactly two values and four of the six stages were never handed out at all — everybody went
    // to 闸机 or 出站. 7 is coprime with both 5 and 6, so every stage gets its share either way.
    const filled = {};
    for (let i = 0; i < S.mine.length; i++) {
      const c = S.mine[i];
      release(c); drop(W.hide, c, 'hideIx');
      c.errand = null; c.alighting = false; c.markX = undefined; c.ground = 0;
      if (i < want) {
        const s = startable[(i * 7 + 1) % startable.length];
        const nth = filled[s] || 0;
        filled[s] = nth + 1;
        const at = anchorFor(c, s, nth);
        c.x = at[0]; c.z = at[1];
        c.gone = false;
        c.stage = (s + 6) % 7;
        nextStage(c);
        c.yaw = s === 6 || s === 5 ? Math.PI : 0;
        wake(c);
        continue;
      }
      // The rest are out of the world, half of them up the steps and half aboard a train, so that
      // when the hour turns they come back from both directions rather than all out of one car.
      c.gone = true; c.awake = false; c.byTrain = i % 2 === 0;
      // Only the by-train half of this is read: somebody coming back down the steps claims a fresh
      // place at the head of them in `tick` rather than standing on whatever they left from, which
      // by then belongs to somebody else. The stair value is the one-frame fallback.
      c.back = c.byTrain ? W.hide[i % W.hide.length] : W.well[i % W.well.length];
      c.x = c.back.x; c.z = c.back.z;
      c.away = 1 + (i % 9) * 1.4;
      c.stage = c.byTrain ? 3 : 6;
    }
  }

  // ---------------------------------------------------------------- read-only, for the harness
  // Three questions a screenshot cannot answer: how many people are in the room at this hour, is
  // every one of them standing on floor a body could actually stand on, and is the walk graph
  // still connected. The report's density table and its collider proof both come out of here.
  function closestPair() {
    const all = [...S.theirs, ...S.mine].filter(c => !c.gone && c.z < EDGEZ);
    let best = 99;
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++)
        best = Math.min(best, Math.hypot(all[i].x - all[j].x, all[i].z - all[j].z));
    return best;
  }
  MetroFit['crowd'].census = () => {
    const rows = [];
    const add = (c, mine) => {
      if (c.gone) return;
      rows.push({ hz: c.hz, mine, stage: c.stage,
                  x: +c.x.toFixed(2), z: +c.z.toFixed(2),
                  // Three places in this room are doorways rather than obstacles, and a
                  // clearance test at one of them measures a door and calls it a wall: the
                  // stairwell mouth, the gate lanes (which open when somebody taps — the same
                  // three exemptions .stationcheck.js makes), and everything trackside, which is
                  // inside the train by design. Excused, and said out loud rather than hidden.
                  where: c.z > EDGEZ - .05 ? 'train'
                       : c.z < -RZ + .30 ? 'stairs'
                       : Math.abs(c.z - GATEZ) < .95 ? 'gate' : 'floor' });
    };
    for (const c of S.theirs) add(c, false);
    for (const c of S.mine) add(c, true);
    const onFloor = rows.filter(r => r.where === 'floor');
    return {
      total: rows.length, theirs: inRoom(S.theirs), mine: inRoom(S.mine),
      want: Math.round(busy(S.lastClock) * PEAK), busy: +busy(S.lastClock).toFixed(3),
      onFloor: onFloor.length,
      inSolid: onFloor.filter(r => !clear(r.x, r.z, BODY)),
      // Closest two bodies anywhere in the room, which is the crush measured rather than judged.
      closest: +closestPair().toFixed(2),
      nodes: G.n, edges: G.adj.reduce((a, l) => a + l.length, 0) / 2,
      droppedEdges: dropped, weakEdges: weak, movedSpots: blockedSpots,
      rows,
    };
  };
};

// ---------------------------------------------------------------------------------------------
// 乘客 — the twenty, and how they join the roster
//
// Hung on `MetroFit['crowd'].cast` at FILE SCOPE, not inside the builder, because game.js folds
// every zone's cast into `NPCS` while it is loading (js/game.js:1091) — long before anybody walks
// into a station and builds one. Each of these then goes through the same `initNPC` as a person
// written into data.js: `makeLook` resolves the wardrobe, a face seed comes off the roster index,
// the temperament name becomes a temperament, and a `th` is made for them. Nothing here reaches
// into that file's scope, and nothing here needs `window.__game`.
//
// A Beijing concourse at eight in the morning is a specific set of people rather than twenty
// variations on one: office workers under a shoulder bag, students under a backpack, somebody off
// a night shift, two 阿姨 with shopping, a builder, a grandfather going one stop. What separates
// them at concourse distance is silhouette — the pack, the width, the hat — long before it is
// colour, so no two here share a shape.
//
// No `lines`, so `initNPC` gives them a reach of -1 and they are never selectable and never in the
// word list. They are the crowd. The 服务中心 clerk and the 站务员 are the people you talk to.
const CROWD_WHO = [
  { t: 'brisk',    look: { skin:'#d9ab84', hair:'#221d1b', hairStyle:'short', top:'#e8e2d2', pants:'#2c323b',
      shoe:'#2f343a', jacket:'#2f3f57', collar:'shirt', bag:'shoulder', bagColor:'#3c3630',
      tall:1.02, wide:.99 } },
  { t: 'bustling', look: { skin:'#c98f66', hair:'#241f1c', hairStyle:'bun', top:'#d8dfe2', pants:'#3b4350',
      shoe:'#e6e0d2', collar:'vneck', sleeve:'short', bag:'tote', bagColor:'#8a6b46',
      tall:.94, wide:.91 } },
  { t: 'steady',   look: { skin:'#c08a5d', hair:'#1c1815', hairStyle:'buzz', top:'#4c5a48', pants:'#333944',
      shoe:'#cec7b8', collar:'polo', sleeve:'half', pack:true, packColor:'#37404b',
      tall:1.05, wide:1.10 } },
  { t: 'weary',    look: { skin:'#d5a67f', hair:'#2e2723', hairStyle:'braid', top:'#7d5d6c', pants:'#2a3240',
      shoe:'#e7e0d3', collar:'crew', bag:'tote', bagColor:'#4e5c46',
      tall:.93, wide:.89, youth:.40 } },
  { t: 'brash',    look: { skin:'#a97046', hair:'#1d1917', hairStyle:'short', top:'#59606b', pants:'#4b4739',
      shoe:'#4a4b46', collar:'crew', sleeve:'short', beard:'stubble', hat:'hard', hatColor:'#cf9f30',
      tall:1.07, wide:1.11 } },
  { t: 'bored',    look: { skin:'#cd9b73', hair:'#9f9b93', hairStyle:'short', top:'#d5cebc', pants:'#343b45',
      shoe:'#3a3f45', jacket:'#4b5040', collar:'shirt', beard:'moustache', beardColor:'#98948b',
      bag:'tote', bagColor:'#7b6850', tall:.95, wide:1.05, stoop:.09 } },
  { t: 'brisk',    look: { skin:'#e0b48c', hair:'#1f1b19', hairStyle:'short', top:'#f0ece2', pants:'#26303f',
      shoe:'#2a2f35', collar:'shirt', glasses:true, pack:true, packColor:'#2d3540',
      tall:1.00, wide:.96 } },
  { t: 'steady',   look: { skin:'#c4915f', hair:'#282220', hairStyle:'bun', top:'#b8543f', pants:'#333a44',
      shoe:'#ddd6c6', collar:'crew', sleeve:'short', bag:'shoulder', bagColor:'#2f3a48',
      tall:.96, wide:.98 } },
  { t: 'bustling', look: { skin:'#d2a077', hair:'#231e1b', hairStyle:'short', top:'#3f6a63', pants:'#2f3742',
      shoe:'#e2dbcd', collar:'hood', pack:true, packColor:'#8a6a3c',
      tall:.97, wide:.93, youth:.55 } },
  { t: 'weary',    look: { skin:'#b9835a', hair:'#8d887f', hairStyle:'buzz', top:'#cdc6b4', pants:'#3d4450',
      shoe:'#42474d', collar:'polo', beard:'stubble', beardColor:'#8d887f', bag:'tote',
      bagColor:'#5c4f3e', tall:.92, wide:1.06, stoop:.16, age:.62 } },
  { t: 'brisk',    look: { skin:'#dcb089', hair:'#1e1a18', hairStyle:'braid', top:'#e6dfcd', pants:'#2a3140',
      shoe:'#33383e', jacket:'#6d4b52', collar:'shirt', bag:'shoulder', bagColor:'#3a3630',
      tall:.96, wide:.92 } },
  { t: 'bored',    look: { skin:'#c58f63', hair:'#252020', hairStyle:'short', top:'#4a5566', pants:'#333a44',
      shoe:'#cfc8ba', collar:'crew', sleeve:'short', glasses:true, tall:1.03, wide:1.00 } },
  { t: 'steady',   look: { skin:'#d6a880', hair:'#2b2521', hairStyle:'bun', top:'#dcd5c3', pants:'#39414c',
      shoe:'#e4ded0', collar:'vneck', vest:'#5b6f7d', bag:'tote', bagColor:'#7d6a44',
      tall:.94, wide:.95 } },
  { t: 'brash',    look: { skin:'#b07a4d', hair:'#1b1715', hairStyle:'buzz', top:'#8a6a3c', pants:'#414a3a',
      shoe:'#45463f', collar:'crew', sleeve:'short', hat:'cap', hatColor:'#2f3742',
      tall:1.06, wide:1.08 } },
  { t: 'bustling', look: { skin:'#e2b590', hair:'#221d1a', hairStyle:'short', top:'#eae4d6', pants:'#2d3543',
      shoe:'#2e343a', jacket:'#39485c', collar:'shirt', glasses:true, bag:'shoulder',
      bagColor:'#43392f', tall:1.01, wide:.97 } },
  { t: 'weary',    look: { skin:'#c08a5f', hair:'#9b968d', hairStyle:'short', top:'#c2bcab', pants:'#3a414c',
      shoe:'#3d4249', collar:'polo', beard:'moustache', beardColor:'#9b968d',
      tall:.93, wide:1.02, stoop:.13, age:.58 } },
  { t: 'brisk',    look: { skin:'#d09a70', hair:'#241f1d', hairStyle:'braid', top:'#456b58', pants:'#2b3340',
      shoe:'#e9e2d5', collar:'hood', pack:true, packColor:'#3f5f50',
      tall:.95, wide:.90, youth:.48 } },
  { t: 'steady',   look: { skin:'#bb8455', hair:'#1f1b18', hairStyle:'short', top:'#5d6347', pants:'#343b46',
      shoe:'#cdc6b7', collar:'polo', sleeve:'half', bag:'shoulder', bagColor:'#3f4249',
      tall:1.04, wide:1.14 } },
  { t: 'bored',    look: { skin:'#dfb389', hair:'#272120', hairStyle:'bun', top:'#d9d2c0', pants:'#2f3641',
      shoe:'#e0d9cb', collar:'crew', sleeve:'short', bag:'tote', bagColor:'#93693f',
      tall:.96, wide:.94 } },
  { t: 'bustling', look: { skin:'#c99366', hair:'#221e1c', hairStyle:'short', top:'#37414f', pants:'#43494f',
      shoe:'#3a3f45', collar:'crew', pack:true, packColor:'#b2402d', tall:1.00, wide:1.03 } },
];

// 乘客二十一 upward: game.js's own six are 乘客十 to 乘客十五, and two people in one room with the
// same name is a thing the picker would have to disambiguate for no reason.
const CROWD_NUM = ['二十一','二十二','二十三','二十四','二十五','二十六','二十七','二十八',
                   '二十九','三十','三十一','三十二','三十三','三十四','三十五','三十六',
                   '三十七','三十八','三十九','四十'];

// The head of the stairwell, written out rather than read off `Metro.WALK`: this runs at load and
// touching the module here would build a station nobody has walked into yet, which is the whole
// point of js/lazy.js. `reseat` moves every one of them the moment the room does exist.
const CROWD_HIDDEN = [-5.10, -7.90];         // SX, -RZ - 2.70

MetroFit['crowd'].cast = CROWD_WHO.map((w, i) => ({
  hz: '乘客' + CROWD_NUM[i], place: 'metro', look: w.look, temper: w.t,
  // `commuter` is what `npcAwake` reads to mean "in the world unless they have boarded a train",
  // and it is what every metro harness filters the roster by — so this crowd is measured by the
  // same tools as the six. `crowd` is how this file tells its own people from those six.
  commuter: true, crowd: true,
  // Strangers in a station do not turn round to look at you. See `faceLock` in updateNPCs.
  faceLock: true,
  // A concourse pace. The player walks at 1.55; three speeds so a group crossing the room does
  // not move as one object. `initNPC` multiplies this by the temperament's own pace.
  speed: 1.24 + (i % 3) * .07,
  stage: 0, pick: i, rs: 12345 + i * 7919,
  gone: true, away: 1 + i * .35, byTrain: false, back: null,
  machIx: null, doorIx: null, hideIx: null, gateIx: null, wellIx: null, laneX: 0,
  alighting: false, markX: undefined, markZ: 0,
  // Their own track across the room. The concourse lane and the platform spine are shared by
  // everybody, so on one exact line two people going opposite ways walk straight through each
  // other; three tracks 26 cm apart put them shoulder to shoulder, which is what a concourse
  // looks like. The offsets are inside the clearances — the widest is still 10 cm off a column.
  off: ((i % 3) - 1) * .26,
  // Where they stand if the loop ever runs dry, and what `initNPC` reads their starting position
  // from. Behind the daylight panel at the head of the steps, which is where somebody who is not
  // in the room yet belongs.
  spots: [{ h0: 0, h1: 24, at: CROWD_HIDDEN.slice(), face: 0, act: 'wait' }],
}));
