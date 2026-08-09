# 地铁 — the metro army

An AI team design plan for the subway. The metro is the clearest case yet for the camera-as-
ownership model, because of a striking asymmetry the docs state outright: **best machinery in the
game, thinnest content.** 2,620 lines, only 10 `thing()`s, one mute NPC, zero dialogue lines — and
a `trainAt(clock)` timetable, a 闸机 gate, a passing-train light sweep, and a collider-aware
commuter walk-graph that *other scenes are told to copy* (`UPGRADES.md:242,339,340`).

So unlike the airport (which was already rich and needed a split + screen-fix), the metro needs
almost no new machinery. It needs **people, dialogue, verbs, and life** — and that content maps
cleanly onto the zones the cameras already frame. Read alongside `AGENT_ARMY.md`, `AIRPORT.md`
(the camera-ownership precedent), and `STREET.md`. Inherits the three rules.

## Why the metro, and what's actually left

Verified against the code, not the stale doc numbers:

1. **Best machinery, thinnest content** — `UPGRADES.md:309` and the §7 ranking (`:235`) both say it,
   and it's *still true*: 0.38 things-per-100-lines, the lowest density of any transport scene
   (rail, after its lift, is now 0.94). The line growth from 1,523→2,620 since the doc was written
   was almost all lighting/materials polish — the **gap has widened, not closed.**
2. **Nobody talks.** One authored NPC (`站务员`), mute by design (`data.js:780`). The 服务中心 clerk is
   a prop relief, not an NPC. The commuters are mute. **Zero dialogue lines live in the metro.**
3. **The screens lie** — `UPGRADES.md:520,433`. The ticket-machine screens are static halfway-through
   transactions *"a touchscreen nobody can touch that changed by itself would be a worse lie than one
   that does not move"* (`metro.js:951`). The fare/board UI is decorative.
4. **No verbs to do** — you can't buy a 票, can't 充值 a 交通卡, can't 换乘. The whole fare/boarding
   flow lives in `game.js` modals (`openTicket`/`openTravel`), and the in-world machines are props.
5. **The vocab cluster is untaught** — `UPGRADES.md:652`: 高峰/挤/末班车/方向/终点站/转/A出口/号线/
   站台/屏蔽门. A daily commuter's whole vocabulary, absent.

Plus: no 便利店 or ATM on the concourse (`UPGRADES.md:309`), no 扶梯 (`UPGRADES.md:313`), no train-
interior passengers (`UPGRADES.md:538`), and the 交通卡 has no balance/friction (`BIG-UPDATES.md:325`, S13).

The good news, and why this plan is lighter on engine work than the others: **the machinery is
done.** `trainAt(clock)` is a pure function every scene envies. The split is mostly so fifteen
agents can fill the content without queuing behind a 2,620-line file.

## The camera is the unit of ownership (the model that fits the metro best)

The metro is already the **most-shot interior in the game** — ~33 audit shots (`91-metro` through
`98-travel` plus the `W1–W6` material audits, `.audit.js:457-636`), spanning every zone *and every
animated state* (approach / berth / board / close / depart / gate-open / peak-crowd / night). The
shots even carry `pre` blocks that drive the real `Metro.tick` / `Metro.openGate` / `Metro.placeTrain`
/ `g.tickStation` machinery.

So the camera-ownership model fits the metro better than any scene so far: **each agent owns a zone
and the shots that view it, and "working" is defined by the shot's `pre` block passing** — i.e. the
gate agent's acceptance test is `94b-gateopen` showing an open lane, the train agent's is
`97g-boarding` showing a commuter mid-doorway. The screenshot *is* the contract, and the contract
already exercises the machinery.

## The zone + camera contract (fixed up front)

The station is `12.8 m × 10.4 m × 3.30 m` (`RX=6.4, RZ=5.2, H=3.30`), single-level, split by the
gate line at `GATEZ = -1.55` into concourse (`-z`) and platform (`+z`). Fifteen agents, each a zone
or sub-system + its camera shot(s). Shots marked ◆ exist today; ✦ are new and the owning agent adds
them to `.audit.js`.

```
CONCOURSE  (z -5.20 .. -1.55)
  1  🚉 Arrivals·Stairs        z -5.2..-4.0  x-5   ◆ 91-metro, 91b-stairs, 96-crowd
                                                     the stairwell up + the first thing you see
  2  🎟️ Ticket machines        z -5.2..-4.0  x-3.3 ◆ 92-tickets, 92b-faretable, 94c-machine
                                                     the 3 TVMs + the 票价表 — improvement 3 lands here
  3  🛎️ Service centre         z -5.2..-4.0  x+    ◆ 92c-service
                                                     服务中心 — the clerk becomes a real NPC (improvement 2)
  4  🗺️ Line map·wayfinding    -z wall +x    ◆ 93-linemap
                                                     the 7-dot map, 在建/终点, the 换乘 sign
  5  🏪 Concourse shop          concourse side  ✦ 95-shop
                                                     the missing 便利店 (UPGRADES:309)
  6  💳 ATM + 充值              concourse side  ✦ 95-atm
                                                     the missing ATM + the 交通卡 top-up verb

GATE LINE  (z -1.55)
  7  🚇 闸机 Turnstiles         z -1.55              ◆ 94-gates, 94b-gateopen
                                                     the gate line — 刷卡/闸机 verbs + the green/red lamps

PLATFORM  (z -1.55 .. 3.30)
  8  🪑 Platform furniture      z 0..3.3            ◆ 95-platform, 97-platwide
                                                     columns, benches, bins, fire cabinet, 当心站台间隙
  9  🟡 Platform edge·PSD       z 3.30              ◆ 97c-board
                                                     yellow line, tactile strip, screen doors, the board
 10  🚪 Platform doors          z 3.30              ✦ 95-doors
                                                     the 屏蔽门 + the next-train board content (improvement 3)

TRACK + TRAIN  (z 3.30 .. 5.20)
 11  🚆 Train car interior      z 4.25              ◆ 96-train, ✦ 96-interior
                                                     the car: seats, ads, strip map — + passengers (UPGRADES:538)
 12  🕳️ Trackside·tunnel        z 3.12..5.2         ◆ 97-notrain, 97b-arriving
                                                     the running tunnel, signals, bore-glow, the sweep

CROSS-CUTTING  (state, not a viewpoint → shared on the shell)
 13  🕐 Schedule·board agent    the timetable       ◆ 97c-board (+ every state shot)
                                                     owns trainAt()/writeBoard() — read by platform + train
 14  📢 PA + soundbed agent     heard everywhere    ◆ 96-crowd, 96c-night
                                                     the announcements + the ambient bed (UPGRADES:394,395)
 15  🚶 Crowd agent             the commuters       ◆ 96-crowd, 96b-onsteps, 97g-boarding
                                                     the WALK graph + commuter legs — 高峰 density (improvement 4)
```

- **`GATEZ = -1.55` is the spine** — concourse is `z < GATEZ`, platform is `z > GATEZ`. A zone that
  straddles it puts you on the wrong side of the gates.
- **`WIN` is the stairwell mouth** (`metro.js:60`) — the only daylight opening, owned by the shell.
- **Everything tagged `地铁` rides the train.** An agent dressing the car interior must tag props
  `地铁` or they won't travel — and must not tag anything that should stay on the platform.
- **The `m0`/rest-matrix convention.** Sign slots, board slots, gate flaps, clerk, train props all
  keep a rest matrix captured after `finish()` (`metro.js:2597`). Any agent adding a rewritable prop
  must follow it or `setStation`/`tick` will fight it. **This is the metro-specific load-bearing rule
  the other plans didn't have.**

## Why fifteen (the honest version)

The airport reached fifteen because every camera-worthy zone earned an agent. The metro reaches
fifteen the same way, but its zones are *smaller* — so the honest split is: **ten spatial zones**
(stairs, machines, service, map, shop, ATM, gates, furniture, edge/PSD, train interior, trackside
— that's eleven) **plus three cross-cutting system owners** (schedule, PA/soundbed, crowd) **plus
the shell Mech.** That's the natural fifteen for this scene.

The two that would be padding in any other scene but are real here: **the shop and the ATM** are
*documented absences* (`UPGRADES.md:309`) — a Chinese metro concourse without a 便利店 reads as
wrong the way an empty road did. They earn their agent by being a camera and a verb each.

## The enabling move (fifth time)

Carve `metro.js` into a **`MetroFit` registry** — the mirror of `FlatFit`/`StreetFit`/`HospFit`/
`AirFit`. The shell left in `metro.js` owns the envelope (`RX/RZ/H`), `WIN`, the gate line, the one
declared zone, `spawn`, `setNight`, the `m0` capture pass, the `setStation` rewrite machinery, and
**mounts the cross-cutting state** (`trainAt`, `writeBoard`, the PA, the `WALK` graph, commuter
density) the spatial agents read through `A`. Each zone registers a builder in its own
`js/metro-<zone>.js`. The shell calls every builder at build time and dispatches the per-zone
tick-fns (gate flaps, board, ads, clerk, train, sweep, crowd).

This is the lightest split of the five plans, because the metro's machinery is already cohesive and
the work is content, not systems.

## The roster

### Tier 0 — Command

**🎖️ The Foreman** — holds the file-lock ledger **and the `.audit.js` row-lock ledger**; owns the
zone+camera contract; never touches code.

### Tier 1 — Engine

**✦ 🏗️ Metro Mech** — owns `js/metro.js` (the shell + registry + shared state) for the whole build.
Runs **alone first** to carve the monolith into `MetroFit`, byte-for-byte, and to mount the
schedule/PA/crowd as shell state. Publishes the zone+camera contract and the `m0` convention. Full
audit after each extraction; every existing shot (including the state-machine `pre` shots) must stay
green. *The only agent in `js/metro.js`.*
**✦ 🔧 Factory Surgeon** — owns `js/build.js`. Pulls `batten/cabinet/lane/column/bench/tiledWall`
out into shared factories — they are already duplicated in rail/airport. Runs **alone, between
waves**, full audit per extraction (every scene imports `build.js`).

### Tier 1.5 — Serial hubs

**📝 The Hub** — `js/game.js` + `js/vocab.js`. **Improvement 4's friction lives here** — the 交通卡
balance/top-up (`BIG-UPDATES.md:325`, S13) and the in-world buy-a-票/充值 verbs (moving flow out of
the `game.js` modals onto the in-world machines). Also the vocab cluster (`UPGRADES.md:652`) and
every `USE` ticket.
**🗣️ Scribe** — `js/talk.js`. **Improvement 1 lands here** — the metro's *first* dialogue. The clerk,
the 站务员 attendant, a lost tourist asking 换乘, a 高峰 commuter. The biggest single content gap.
**📖 Lexicographer** — `vocab.js` via the Hub. The 高峰/挤/末班车/方向/终点站/转/A出口/号线/站台/屏蔽门
cluster, hundreds of entries.

### Tier 1 — The fifteen zone agents (one file + one camera each, fully parallel)

Each owns **its `js/metro-<zone>.js` and its shot row(s) in `.audit.js`**, builds to the contract,
renders its own shot to self-verify, and posts `USE`/vocab tickets to the Hub. All fifteen run at
once after the Mech lands the shell.

**Concourse (6):**

- **🚉 Arrivals·Stairs** (`metro-stairs.js`, ◆ 91-metro / 91b-stairs / 96-crowd) — the stairwell up
  to the street, the daylight panel, the first thing a commuter sees. Owns `spawn`'s view and the
  body-removal plane (`metro.js:867`).
- **🎟️ Ticket machines** (`metro-tickets.js`, ◆ 92-tickets / 92b-faretable / 94c-machine) — the 3
  TVMs + the 票价表. **Improvement 3 lands here:** the screens become real station-select/fare UI, not
  static decorative transactions (`UPGRADES.md:520`). Self-verifies against 94c-machine.
- **🛎️ Service centre** (`metro-service.js`, ◆ 92c-service) — 服务中心. **Improvement 2 lands here:**
  the clerk silhouette becomes a real NPC with dialogue — the metro's first conversation. Teaches
  交通卡/充值/问路.
- **🗺️ Line map·wayfinding** (`metro-map.js`, ◆ 93-linemap) — the 7-dot line map, the "you are here"
  ring, 在建/终点站 marks, the 换乘 sign. Teaches 换乘/方向/终点站 — words in the help text but not
  yet teachable (`UPGRADES.md:309`).
- **🏪 Concourse shop** (`metro-shop.js`, ✦ 95-shop) — the **missing 便利店** (`UPGRADES.md:309`).
  Drinks, snacks, a clerk. A Chinese metro concourse without one reads as wrong.
- **💳 ATM + 充值** (`metro-atm.js`, ✦ 95-atm) — the **missing ATM** + the 交通卡 top-up verb. Pairs
  with the Hub (which owns the card-balance state).

**Gate line (1):**

- **🚇 闸机 Turnstiles** (`metro-gates.js`, ◆ 94-gates / 94b-gateopen) — the 5-cabinet / 4-lane gate
  line. Owns the 刷卡/闸机 verbs and the green/red lane lamps. Self-verifies against the open-lane
  shot (`94b-gateopen`'s `pre` calls `Metro.openGate`).

**Platform (3):**

- **🪑 Platform furniture** (`metro-platform.js`, ◆ 95-platform / 97-platwide) — the 4 dressed
  columns, 2 benches, bins, fire cabinet, 当心站台间隙. The room you wait in.
- **🟡 Platform edge·PSD** (`metro-edge.js`, ◆ 97c-board) — the yellow line, tactile 盲道 strip,
  screen-door piers, the next-train board. Owns the board content (reads the Schedule agent's
  `trainAt`).
- **🚪 Platform doors** (`metro-doors.js`, ✦ 95-doors) — the 屏蔽门 sliding leaves + door numbers.
  Improvement 3's board content pairs with this.

**Track + train (2):**

- **🚆 Train car interior** (`metro-train.js`, ◆ 96-train / ✦ 96-interior) — the car: seat run, grab
  poles, interior ads, strip map, sliding doors, destination blind. **Adds passengers**
  (`UPGRADES.md:538`). *Must tag props `地铁` or they won't travel — the metro-specific rule.*
- **🕳️ Trackside·tunnel** (`metro-track.js`, ◆ 97-notrain / 97b-arriving) — the running tunnel,
  rails, two mouths, signals, bore-glow, the passing-train light sweep. Owns the second unseen train
  (`PASS_EVERY=34s`).

**Cross-cutting systems (3) — state, not a viewpoint, mounted on the shell:**

- **✦ 🕐 Schedule·board agent** (`metro-schedule.js`, ◆ 97c-board + every state shot) — owns
  `trainAt(clock)` / `writeBoard()` / `terminusFor()`. The pure-function timetable every other scene
  is told to copy (`UPGRADES.md:339` — the `Schedule` helper generalisation earns its file here). Read
  by the edge, doors, and train agents.
- **✦ 📢 PA + soundbed agent** (`metro-pa.js`, ◆ 96-crowd / 96c-night) — the finite announcement
  vocabulary (`due30`/`due3`/`near`/`due1`) + the **ambient soundbed** the metro already has
  (`UPGRADES.md:394`) expanded with SFX (`UPGRADES.md:395`). Heard everywhere, owned once.
- **✦ 🚶 Crowd agent** (`metro-crowd.js`, ◆ 96-crowd / 96b-onsteps / 97g-boarding) — the `WALK` graph
  + commuter legs (`game.js:492`) + **高峰 density** (improvement 4). Owns the collider-aware routing
  `UPGRADES.md:340` wants generalised. The most state-machine-heavy content agent.

### Tier 2 — Gate

**🔬 The Verifier** — read-only. Under camera-first ownership it trusts each agent's self-rendered
shot for in-zone correctness, and owns the **cross-zone canaries**: the state-machine shots whose
`pre` blocks drive the real machinery — `94b-gateopen`, `97g-boarding`, `97e-leaving`, `96-crowd` —
re-rendered after any change to the gates, train, schedule, or crowd, because those cross every zone.

### Tier 3 — Quality

**👁️ Reviewer** — unchanged.
**✦ 🚇 Transit Editor** — read-only specialist reviewer (the metro's Cultural Editor). Enforces
"reads as a Beijing metro, not a Western tube": the 屏蔽门 (not open platforms), the 高峰 crush, the
交通卡 (not paper tickets as default), the 便利店 on the concourse, the 换乘 sign, the A出口/B出口
lettering, the 进站/出站 split. Stops fifteen zones from being fifteen Western gates with Chinese labels.

## The contention map

- **`js/metro.js`** — the Mech, alone, for the whole build.
- **`js/build.js`** — the Factory Surgeon, alone, between waves.
- **`js/game.js` + `js/vocab.js`** — the Hub, serial. The 交通卡 friction and in-world verbs live here.
- **`.audit.js`** — *shared, row-locked.* Each agent edits only its own shot rows; the Foreman's
  ledger grants one agent at a time the rows for its zone. The Mech owns the structural rows.
- **Each of the fifteen `js/metro-<zone>.js`** — its own writer. **Fifteen agents run at once** after
  Wave 0.

### Concurrency — what runs at once, during Waves 1–2

```
Foreman (orchestrating, holds the .audit.js row-lock ledger)
├── 15 × Zone/System Builders                              ← PARALLEL (distinct files + shots)
│      Stairs · Tickets · Service · Map · Shop · ATM ·
│      Gates · Platform · Edge · Doors · Train · Track ·
│      Schedule · PA · Crowd
├── Scribe (talk.js — the metro's FIRST dialogue)          ← PARALLEL (independent file)
├── Hub (game.js + vocab.js + 交通卡 friction)             ← SERIAL queue, draining tickets
├── Verifier (state-machine canaries only)                 ← shared, request-driven
└── Transit Editor                                         ← background, per-zone review
```

**~19 agents live** at peak, but only **one editing `game.js`** (Hub), **one in `build.js`** (Surgeon,
between waves), **one ever in `metro.js`** (Mech), and **one per `.audit.js` row**. Fifteen files in
fifteen hands, each self-verifying against its own camera.

## The waves

### Wave 0 — Split + factory extraction (serial, alone)
**Metro Mech** carves `metro.js` into `MetroFit` + shell, byte-for-byte, mounts the schedule/PA/crowd
as shell state, and partitions the existing shots to their new owners. Full audit after each
extraction; every existing shot — including the state-machine `pre` shots — must stay green. Then the
**Factory Surgeon** runs alone, between Wave 0 and Wave 1. *Done when `node .verify.js` is green and
all ~33 metro PNGs are unchanged.* Nothing else starts until both land.

### Wave 1 — The headline improvements (fifteen parallel, three gating)
All fifteen agents start, but the three that fix the stated gaps gate the rest:
- **Service** (92c-service) ships improvement 2 — the metro's first real NPC dialogue.
- **Tickets** (94c-machine) ships improvement 3 — real station-select/fare screens.
- **Crowd** (96-crowd) ships improvement 4 — 高峰 density, the crush that makes a metro read as one.
*The other twelve are already running in parallel; this wave says which gate.*

### Wave 2 — Content + dialogue (fifteen parallel)
Fill the gaps: the Scribe's dialogue trees, the shop/ATM, the train-interior passengers, the
vocab cluster, the 交通卡 friction. Transit Editor reviews each zone as it lands, against its own shot.

### Wave 3 — Generalisation pass
The two patterns the docs want lifted from the metro into the whole game: the `Schedule` helper
(`UPGRADES.md:339`) and the collider-aware `WALK` routing (`UPGRADES.md:340`). Mostly Schedule agent +
Crowd agent + the Factory Surgeon, coordinated through the Hub.

### Rough cost / time

| Wave | Agents live | Parallelism | Est. wall-clock |
|---|---|---|---|
| 0 Split + factories | 1 Mech, then 1 Surgeon | none — serial | 1 day |
| 1 Headline fixes | 15 + Hub + Scribe + Verifier + Transit ≈ 19 | **15×** | 1–2 days |
| 2 Content + dialogue | ≈ 19 | **15×** | 2 days |
| 3 Generalisation | 3–4 (Schedule + Crowd + Surgeon + Hub) | low | half a day |

This is the **fastest content win per agent** of any plan so far: the machinery is done, so every
agent is adding people/words/verbs, not systems. A metro with dialogue, a working ticket machine, a
便利店, and a 高峰 crowd lands in roughly the time the airport's screen-fix took.

## The three rules (unchanged, with the metro clause)

1. **One file, one writer** — the Mech in `metro.js`; the Surgeon in `build.js` (between waves); the
   Hub in `game.js`/`vocab.js`; each zone its own writer. The schedule/PA/crowd write through their
   own API on the shell.
2. **Nothing merges without the Verifier** — and here "the Verifier" means *the agent's own shot
  passes*, including the state-machine `pre` shots, plus the Verifier's cross-zone canaries. An agent
   that has not rendered its shot has not finished.
3. **The hub serialises contention, the row-lock serialises `.audit.js`, and the `m0` convention
   serialises rewritable props.** The third clause is metro-specific: any agent adding a sign, board
   slot, gate flap, clerk, or train prop must follow the rest-matrix capture or `setStation`/`tick`
   will fight it. The Mech owns the `m0` pass; agents request rest matrices through `A`.

## What must not break (the load-bearing list)

- **`trainAt(clock)` is pure** — `metro.js:2159`. Every state shot's `pre` depends on it. The Schedule
  agent must keep it a pure function of `clockNow`, or the board, the PA, and the signals desync.
- **`setStation(hz)` rewrites in place** — name signs, floor inlays, the map ring, the exit
  destination (`metro.js:2039`). A zone agent that adds a rewritable prop must register it for this
  pass or it won't change between stations.
- **The `门` exit contract** — `exitThing.exit = s.out` is rewritten by `setStation` (`metro.js:2069`).
  An agent adding a second way out (a 扶梯 to a mezzanine, `UPGRADES.md:313`) must not stomp it.
- **The `地铁` tag** — anything tagged `地铁` moves with the train (`metro.js:2611`). Interior props
  must carry it; platform props must not.
- **The boarding flow** — `board(toHz)` (`game.js:5807`) → `train` scene → `alight()` → `setStation`.
  The Train and Schedule agents must keep `trainNow().phase === 'berthed'` meaningful.
- **The seven-station ring** — every `STATIONS` row has an `out`; the commuter/crowd agents must not
  strand the player at a station with no exit.

## Minimum viable version (4 agents, ~70% of the value)

Foreman · Metro Mech · Service agent · Scribe, with the Verifier run by hand. Land Wave 0 +
improvement 2 (the metro's first dialogue) — because the single biggest gap is that *nobody talks*,
and the machinery is already good enough to carry a conversation. The other fourteen zones queue
behind the Mech's split, each taking its own camera and self-verification from there.

---

## Why this plan is the highest content-per-agent of the five

The apartment/tower/street/hospital/airport each needed *both* systems and content. The metro
needs almost only content — its machinery is the part other scenes copy. So all fifteen agents are
adding people, words, verbs, or life, against a machine that already works. That makes this the
fastest rating-move of the six plans: the metro is thin *only* because it's empty, and empty is the
cheapest thing to fix.
