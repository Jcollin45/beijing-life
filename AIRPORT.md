# 机场 — the airport army

An AI team design plan for improving the airport, built around one idea: **the camera is the unit
of ownership.** Each of the fifteen agents owns a physical zone *and* the camera shot(s) that view
it, so each agent builds its part and self-verifies against its own viewpoint instead of every
agent queuing behind one global Verifier pass on a shared screenshot block.

Read alongside `AGENT_ARMY.md` (the discipline), `STREET.md` (the closest split precedent), and
`cabin.js` (the plane interior this scene boards into). Inherits the three rules.

## Why the airport, and what's actually left

The airport is already the richest transport scene in the game — 3,211 lines, 22 `thing()`s, a
live seven-flight schedule, a PA announcer, an aircraft that takes off and lands, a security gate
that opens, seven enterable shops, four named NPCs. The `UPGRADES.md` airport list (`:545-595`)
reads today as a record of things already fixed, not a backlog. So this is a **split + deepen the
genuine gaps** job, not a green-field build. Three real gaps, verified against the code:

1. **The screens lie.** `UPGRADES.md:433` — the kiosks, the X-ray scan image, and the gate display
   are bar-UI coloured rectangles, not real glyphs. A terminal is a building made of screens, and
   the most important ones are fake.
2. **Every flight except 上海 is an ellipsis.** `game.js:5556` — for every destination but Shanghai,
   `takeFlight()` time-skips back to the airport. A ¥5,800 ticket to 纽约 and the plane never goes.
3. **It's a 3,211-line monolith.** Can't be parallelised until it splits — the same state `street.js`
   was in before `STREET.md`.

Plus the smaller real gaps: shallow dialogue for the four named agents (`UPGRADES.md:633`), no
fast-travel home (`UPGRADES.md:191`), no ambient soundbed of its own, factories trapped here
(`UPGRADES.md:332`), and a day-one player dropped into the richest scene with no onboarding.

## The camera is the unit of ownership (the redesign)

The earlier airport plan split the file into space files + system files and had one Verifier render
the whole 13-shot block after every change. This plan inverts that. **Each agent owns a zone and the
camera shot(s) that view it**, declared in the contract table below. Consequences, all good:

- **Self-verification.** An agent renders *its own* shot(s) — `node .audit.js <its-shot>` — inspects
  the PNG, and knows its part is right without waiting on a global pass. The Verifier becomes a
  coordinator of fifteen self-checks plus a few cross-zone canaries, not a bottleneck.
- **No thin agents.** The previous version's honest problem was that fourteen was real and fifteen
  was padding. Once a zone needs its own camera to be verified, it earns its own agent — so the
  smoking room, the baggage belt, the kiosks each become a real agent rather than being folded into
  a neighbour. Fifteen is now where the work naturally lives.
- **The contract is visual.** An agent that ships its zone but leaves its shot black or broken has
  not finished, even if the code boots. The screenshot *is* the acceptance criterion.

The audit harness already works this way: a shot is `{ n, w:'airport', t, p:[x,z,yaw], y, c:[yaw,
pitch, dist], body:0 }` in `.audit.js`, rendered to `.audit-<n>.png` (`:706-718`). The fifteen agents
each **own their rows in that file** — the shot's camera is theirs to frame and theirs to pass.

**The one thing the camera-first rule forces:** every agent is now *spatial*. The cross-cutting
state machines (the live schedule, the PA announcer, the soundbed) are not viewpoints, so they stop
being separate agents and become **shared state mounted on the shell**, owned by the Mech, read by
the spatial agents through one API. This is cleaner than the last version's system-files: there is
no "PA agent" with no camera — there is the shell's PA, and the gate agent's shot shows the speaker
calling your flight.

## The zone + camera contract (fixed up front)

The hall is `44 m × 17 m × 7.2 m` (`RX=22, RZ=8.5, H=7.20`), split by the security partition at
`SEC=2.40` into landside (`-x`) and airside (`+x`), both facing the curtain wall on `-z`. Fifteen
agents, each a zone + its camera shot(s). Shots marked ◆ exist today (`D1–DD`); shots marked ✦ are
new and the owning agent adds them to `.audit.js`.

```
LANDSIDE  (x -22.0 .. 2.40, stone floor)
  1  🛈 Info·Entrance     x -22..-15      ◆ DB-info        the info island + metro arrival + spawn view
  2  🛫 Ticket            x -16..-12      ◆ DA-tickets     售票处, 陈姐's window
  3  🧾 Check-in bank     x  -8.5..-2     ◆ D3-checkin     the 5-desk 值机 bank
  4  🛄 Baggage belt      x  -2..-0.5     ✦ D-belt         the 行李托运 oversize belt (moving cases)
  5  🖥️ Kiosks            x -22..-19  z+  ✦ D-kiosks       自助值机 — improvement 1: real screens
  6  📋 Departure board   -x wall         ◆ D4-flights     the live 7×6 board (shot at a time it says something)
  7  🏪 Convenience    x -9.25..-7.0 z -2.9..-0.1 ✦ D-conv    便利店
  8  🛡️ Security          x  2.0..3.2     ◆ D5-security    安检 — improvement 1: the X-ray scan screen

AIRSIDE   (x 2.40 .. 22.0, carpet)
  9  🥃 Duty-free         x  8..14        ◆ D8-duty        免税店 bottle wall
 10  ☕ Café               x 14..19        ◆ D9-cafe        咖啡, the barista
 11  🚬 Smoking room     x 4.4..8.0 z 6.9..7.7 ✦ D-smoke    the haze vitrine (striking, camera-worthy)
 12  🚻 Toilets+charging  x  6..8   z 1..3       ✦ D-wc       洗手间 / 充电站 cluster
 13  🚪 Gate + lounge     x 15..22        ◆ D7-gate + ◆ DC-lounge   登机口 — improvement 1: the gate screen

APRON     (behind the curtain wall, -z)
 14  ✈️ Apron + parked aircraft   -z      ◆ D2-plane       the B12 stand, livery 中国国际航空
 15  🛩️ Runway + moving aircraft  -z far  ◆ DD-airnight + ✦ D-runway   the take-off/land sim
```

- **CORRECTED TWICE, 2026-08-04, measured against the code.** The 便利店 was the second one. Its
  row put it in the strip along the curtain wall; the shell's three `seatRun`s at x -7.60 fill
  z -3.24..-6.96 and leave **1.49 m** to the glass — not enough to stand a customer in front of a
  serve-over counter once `clampMove` inflates every collider by the 0.30 m body radius. The shop
  would have sealed its own doorstep, and no render would have shown it. It now stands in the one
  genuinely empty pocket in that zone, x -9.25..-7.00, z -2.90..-0.10, touching no curtain wall —
  so the apron and runway cameras look straight past it.

- **CORRECTED 2026-08-04, measured against the code.** This table originally put the smoking room
  on `-z` and the toilets on `+z`. It is the other way round: `airport.js:2141` builds the 吸烟室 at
  `SMX = 6.20`, `RZ - 1.60` to `RZ - 0.80` — z 6.9..7.7, hard against the **+z** wall, with
  `solid(4.30, 8.10, 6.80, 8.50)` under it. Two agents were dispatched onto the same ground before
  anyone measured, and it was the toilets agent that noticed, by building there and finding a glass
  box already in the way. The rule this cost: **a zone table is a claim about the code, and has to
  be checked against the code rather than against the last version of the plan.**

- **`SEC = 2.40` is the spine.** Everything landside is `x < SEC`, everything airside `x > SEC`,
  and `roomAt` switches on it (`airport.js:3197`). A zone that straddles it breaks the lighting split.
- **The curtain wall / `WIN` is owned by the shell**, read by every `-z`-facing zone. The apron and
  runway agents build *behind* it, through the hole — their cameras (D2, DD) are the glass views,
  and those views are the fragile cross-zone canaries (see Verifier).
- **`H 7.20`** — the tallest interior in the game; `A.y0 + h` always, never bare heights.
- **Each shot is the acceptance test for its zone.** An agent whose PNG is black, broken, or
  unchanged-where-it-should-have-changed has not merged, regardless of how the code boots.

## The enabling move (fourth time)

Carve `airport.js` into an **`AirFit` registry** — the mirror of `FlatFit`/`StreetFit`/`HospFit`. The
shell left in `airport.js` owns the envelope, the curtain wall / `WIN`, the partition line, the two
zones, `spawn`, `setNight`, the registry dispatch, and — new in this version — **the shared state
the spatial agents read**: `FLIGHTS`, `statusOf`/`gateOf`/`checkinOpen` (the schedule), `NOTICES` +
`announce` (the PA), and the soundbed hook. Each zone registers a builder in its own `js/air-<zone>.js`:

```js
AirFit['security'] = A => { … };
```

…handed the `A` toolkit, building to the contract. The shell mounts the shared state on `A` so a
zone reads `A.statusOf(no)` rather than reaching across files — the same narrow-API discipline the
hospital plan used for `Pharmacy.loop`. The moving things (the belt, the runway aircraft, the
security flaps, the agents' breathing) register tick-fns the shell dispatches.

## The roster

### Tier 0 — Command

**🎖️ The Foreman** — holds the file-lock ledger and the zone+camera contract; never touches code.

### Tier 1 — Engine

**✦ 🏗️ Airport Mech** — owns `js/airport.js` (the shell + registry + shared state) for the whole
build. Runs **alone first** to carve the monolith into `AirFit`, byte-for-byte, and to mount the
schedule/PA/soundbed as shell state the spatial agents read through `A`. Publishes the zone+camera
contract. Full audit after each extraction. *The only agent in `js/airport.js` for the whole build,
and the owner of the cross-cutting systems that are no longer separate agents.*
**✦ 🔧 Factory Surgeon** — owns `js/build.js`. Pulls `toilets/seatRun/trolley/palm/planter/charger/
gantry/slots` into shared factories (`UPGRADES.md:332`). Runs **alone, between waves** — every scene
imports `build.js`, so one writer, full audit per extraction.

### Tier 1.5 — Serial hubs

**📝 The Hub** — `js/game.js` + `js/vocab.js`. Improvement 2 (the second playable destination,
`takeFlight()` `game.js:5518`) and fast-travel home live here; also drains every `USE`/vocab ticket.
**🗣️ Scribe** — `js/talk.js`. The four named agents' dialogue depth (`UPGRADES.md:633`).
**📖 Lexicographer** — `vocab.js` via the Hub.

### Tier 1 — The fifteen zone agents (one file + one camera each, fully parallel)

Each owns **its `js/air-<zone>.js` and its row(s) in `.audit.js`**, builds to the contract, renders
its own shot to self-verify, and posts `USE`/vocab tickets to the Hub. All fifteen run at once after
the Mech lands the shell. Grouped by side for readability; they are peers.

**Landside (8):**

- **🛈 Info·Entrance** (`air-info.js`, ◆ DB-info) — the 问询处 island + the metro arrival (`DX=-20.20`).
  The first thing a passenger sees; owns the spawn-adjacent view. Teaches 请问/航班/登机口.
- **🛫 Ticket** (`air-ticket.js`, ◆ DA-tickets) — 售票处, 陈姐's window, the speak-hole, queue rails.
  Where you buy the 机票 — the start of the whole chain.
- **🧾 Check-in bank** (`air-checkin.js`, ◆ D3-checkin) — the 5-desk 值机 bank (positions 1–4 open,
  5 closed), 小许 at position 2. Hands you the 登机牌 + seat.
- **🛄 Baggage belt** (`air-belt.js`, ✦ D-belt) — the 行李托运 oversize belt. **Owns the belt tick-fn**
  (cases ride into the hood every 7 s, `beltTick`). A moving system with its own close-up camera —
  exactly the case that earns a separate agent under camera-first ownership.
- **🖥️ Kiosks** (`air-kiosks.js`, ✦ D-kiosks) — the 自助值机 machines. **Improvement 1 lands here:**
  the kiosk screens become real glyph displays, not bar-UI. Self-verifies against D-kiosks.
- **📋 Departure board** (`air-board.js`, ◆ D4-flights) — the live 7×6 matrix on the `-x` wall. Reads
  the shell's `statusOf`; shot at 10:00 when flights are saying something.
- **🏪 Convenience** (`air-shop.js`, ✦ D-conv) — the 便利店 (chiller, noodle shelf, clerk).
- **🛡️ Security** (`air-security.js`, ◆ D5-security) — the 安检 arch, glass flaps, X-ray scanner.
  **Improvement 1 lands here too:** the X-ray scan image becomes a real glyph render of the bag,
  not a coloured rectangle. Owns the flap/lamp tick (`openSecurity`, `GATE_HOLD`).

**Airside (5):**

- **🥃 Duty-free** (`air-dutyfree.js`, ◆ D8-duty) — the 免税店 bottle wall (56 bottles, 7 shapes),
  DUTY shelf-edge prices. Teaches 烟/酒/香水/免税.
- **☕ Café** (`air-cafe.js`, ◆ D9-cafe) — the espresso machine, price board, 咖啡师.
- **🚬 Smoking room** (`air-smoke.js`, ✦ D-smoke) — the glass vitrine with its two haze volumes, ash
  bin, smoker. A real Chinese airside fixture; the haze is the most camera-worthy small space here,
  which is why it has its own agent and shot.
- **🚻 Toilets + charging** (`air-wc.js`, ✦ D-wc) — 洗手间 (男/女) + 充电站. Teaches 洗手/充电.
- **🚪 Gate + lounge** (`air-gate.js`, ◆ D7-gate + ◆ DC-lounge) — the 登机口 podium + lounge seating +
  airbridge door (`BRX=18.20`, boards `cabin`). **Improvement 1 lands here:** the gate screen that
  calls your flight becomes real glyphs. Owns `walkToGate`. *Two shots because the gate and the
  lounge are the two airside viewpoints that matter.*

**Apron (2):**

- **✈️ Apron + parked aircraft** (`air-apron.js`, ◆ D2-plane) — the widebody at stand B12 (livery
  中国国际航空, reg B-2589), tugs, GPU/water services. Seen through `WIN` from both halves; owns the
  most photographed still in the scene.
- **🛩️ Runway + moving aircraft** (`air-runway.js`, ◆ DD-airnight + ✦ D-runway) — the take-off/land
  sim (`flierTick`: 17 s movement + 15 s gap, retracting gear, blinking wingtips). The single most
  elaborate animation in any transport scene; D-runway is a new motion shot that catches it mid-roll.

### Tier 2 — Gate

**🔬 The Verifier** — read-only, but its job changes under camera-first ownership. It no longer
re-renders the whole `D1–DD` block after every change. Instead:
- **Per-agent self-check (L3):** each agent renders and inspects *its own* shot(s) before reporting
  done. The Verifier trusts these for the zone's internal correctness.
- **Cross-zone canaries (the Verifier's own job):** the two views that look *through* shared
  geometry — `D2-plane` and `DD-airnight` (the glass/apron/runway view from both halves) — are
  re-rendered by the Verifier after any change to the curtain wall, `WIN`, the apron, or the runway,
  because an apron edit that looks fine in D2 can break the glass view from landside. These two are
  the only shots the Verifier owns outright.

### Tier 3 — Quality

**👁️ Reviewer** — unchanged.
**✦ 🛫 Operations Editor** — read-only specialist reviewer (the airport's Cultural Editor). Enforces
"reads as a real Chinese international terminal": 国航/东航/南航/海航 short-names on the PA, the
国内/国际 gantry split, the smoking room, baijiu-and-cigarettes duty-free stock, the boarding-card
seat number. Stops fifteen zones from being fifteen Western gates with Chinese labels.

## The contention map

- **`js/airport.js`** — the Mech, alone, for the whole build.
- **`js/build.js`** — the Factory Surgeon, alone, between waves.
- **`js/game.js` + `js/vocab.js`** — the Hub, serial.
- **`.audit.js`** — *shared, but partitioned by ownership.* Each agent edits only its own shot
  row(s); the Foreman's lock ledger treats `.audit.js` rows like files (an agent holds the lock on
  `D5-security` while it works). The Mech owns the structural rows no agent does. This is the one
  new contention surface the camera-first design creates, and the row-lock is how it stays safe.
- **Each of the fifteen `js/air-<zone>.js`** — its own writer. **Fifteen agents run at once** after
  Wave 0.

### Concurrency — what runs at once, during Waves 1–2

```
Foreman (orchestrating, holds the .audit.js row-lock ledger)
├── 15 × Zone Builders                                     ← PARALLEL (distinct files + shots)
│      Info · Ticket · Check-in · Belt · Kiosks · Board ·
│      Shop · Security · Duty-free · Café · Smoke · WC ·
│      Gate · Apron · Runway
├── Scribe (talk.js — the four agents' dialogue trees)     ← PARALLEL (independent file)
├── Hub (game.js + vocab.js + second destination)          ← SERIAL queue, draining tickets
├── Verifier (cross-zone canaries D2/DD only)              ← shared, request-driven
└── Operations Editor                                      ← background, per-zone review
```

**~19 agents live** at peak, but only **one editing `game.js`** (Hub), **one in `build.js`**
(Surgeon, between waves), **one ever in `airport.js`** (Mech), and **one per `.audit.js` row**.
Fifteen zone files in fifteen hands, each self-verifying against its own camera — so the Verifier
stops being the bottleneck it was in the shared-block model.

## The waves

### Wave 0 — Split + factory extraction (serial, alone)
**Airport Mech** carves `airport.js` into `AirFit` + shell, byte-for-byte, mounts the schedule/PA/
soundbed as shell state, and partitions the existing `D`-shots to their new owners. Full audit after
each extraction; every existing PNG must stay pixel-stable. Then the **Factory Surgeon** runs alone,
between Wave 0 and Wave 1. *Done when `node .verify.js` is green and all 13 existing airport PNGs
are unchanged.* Nothing else starts until both land.

### Wave 1 — The headline improvements (fifteen parallel, three gating)
All fifteen zone agents start, but the three that fix the stated gaps gate the rest:
- **Kiosks** (D-kiosks), **Security** (D5-security), **Gate** (D7-gate) ship improvement 1 — real
  glyph screens on the kiosks, the X-ray image, and the gate display. Each self-verifies its own shot.
- **Hub** ships improvement 2 — a second playable destination (Xi'an or Chengdu as a real
  `setPlace`, not a time-skip).
*The other twelve are already running in parallel; this wave says which gate.*

### Wave 2 — Depth + dialogue (fifteen parallel)
Fill the gaps: the Scribe's four dialogue trees, each zone's polish, the fast-travel home, vocab
depth. Operations Editor reviews each zone as it lands, against that zone's own shot.

### Wave 3 — Onboarding pass
The airport as tutorial arc (`PLAN.md` Q5/Q8). Mostly Hub + Scribe + story.js — gating the chain so
the first visit teaches 值机/安检/登机口 without the full schedule overwhelming a beginner.

### Rough cost / time

| Wave | Agents live | Parallelism | Est. wall-clock |
|---|---|---|---|
| 0 Split + factories | 1 Mech, then 1 Surgeon | none — serial | 1 day |
| 1 Headline fixes | 15 + Hub + Scribe + Verifier + Ops ≈ 19 | **15×** | 1–2 days |
| 2 Depth + dialogue | ≈ 19 | **15×** | 2 days |
| 3 Onboarding | 3–4 (Hub + Scribe + story) | low | half a day |

## The three rules (the third one gains a clause)

1. **One file, one writer** — the Mech in `airport.js`; the Surgeon in `build.js` (between waves);
   the Hub in `game.js`/`vocab.js`; each zone its own writer.
2. **Nothing merges without the Verifier** — but under camera-first ownership, "the Verifier" now
   means *the agent's own shot passes*, plus the Verifier's two cross-zone canaries (D2/DD). An agent
   that has not rendered and inspected its own PNG has not finished.
3. **The hub serializes contention — and the row-lock serialises `.audit.js`.** Fifteen agents share
   one shot file; the Foreman's lock ledger grants one agent at a time the row(s) for its zone.

## What must not break

- **The boarding chain** — 售票处 → 值机 → 安检 → 登机口 → `boardCabin()` → `cabin.js`. The longest
  chain of things-to-do in the game; spans four zones, so four agents must agree on it.
- **`WIN` / the curtain wall** — owned by the shell; the apron/runway cameras (D2/DD) look through it.
- **The PA ↔ board agreement** — `airport.js:104`: the screen and the loudspeaker cannot disagree.
  Both now read the shell's `statusOf`; the Board and Gate agents must not cache a stale copy.
- **The runway aircraft** (`flierTick`) and **the security flaps** — the two state-machine animations;
  each moves to its zone file but must keep ticking via the shell's dispatch.
- **The seven-flight schedule** — every alternate gate has a baked announcement clip; the Mech's
  shell state must not invalidate them.

## Minimum viable version (4 agents, ~70% of the value)

Foreman · Airport Mech · Kiosks agent · Hub, with the Verifier (and its two canaries) run by hand.
Land Wave 0 + improvement 1 (the kiosk screens stop lying) + improvement 2 (a second playable
destination). That fixes two of the three real gaps and unblocks the other twelve zones, which queue
behind the Mech's split — each then taking its own camera and its own self-verification from there.
