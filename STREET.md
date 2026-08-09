# 街 — the street army

An AI team design plan for upgrading the hutong outside the apartment: the clunky entrances, the
dead-still traffic, and the designs that feel off. In the style of `AGENT_ARMY.md` and `TOWER.md`,
cut to the real shape of `js/street.js`.

Read alongside `APARTMENT.md` (the building on the other side of the door), `PLAN.md` §6 (the
stated direction for the street), and `BIG-UPDATES.md` §4.3 (the open traversal questions S2/S16/S18).

## The three problems, located precisely

### 1. Entrances feel clunky — because they are a frame-instant teleport

The seam between street and lobby is three hard cuts stacked:

- **`setPlace` is instant.** `game.js:6407` does `P.x = sp.x; P.z = sp.z; P.yaw = sp.yaw` and
  `game.js:6416` hard-snaps the camera (`CAM.tYaw = CAM.yaw = sp.yaw`). No fade, no crossfade, no
  door-open beat. You are at the lobby door one frame and standing on the pavement the next.
- **Every door lands at the scene's default spawn.** The shared `门`/`楼` verbs use `def.go`
  (`game.js:7539`), never `th.exit`, so you always arrive at `scene.spawn`
  (`street.js:3688`: `{x: DOOR+0.1, z: -1.35, yaw: π/2}`) no matter which door you took.
- **The street stairwell is a painted illusion.** `street.js:1199–1329` builds a forced-perspective
  flight of stairs behind a folded security door — flat, not walkable. Stepping into it is pressing
  a button; there is no vestibule you pass through. The lobby's own 门斗 vestibule
  (`home-lobby.js:442`, plane `PZ = -4.94`) exists but nothing connects the two visually.

### 2. Traffic does not move — by design, then never revisited

The defining comment is `street.js:2281`: *"traffic. Nothing moves, but an empty six-lane road in
Beijing reads as wrong."* So five cars and a bus were placed once as immutable geometry and left.

- `car()` (`street.js:2317`) returns nothing — it builds straight into the prop list. There is no
  handle to move. `wheel()` (`street.js:2289`) is a static alloy; no spin.
- The five cars are placed at `street.js:2532–2537`, two northbound (east of centre), three
  southbound. The bus (`street.js:2488`) is one parked box at the stop.
- The `tick` loop (`street.js:3577–3639`) animates exactly four things — breakfast stall, pigeons,
  steam, laundry. **There is no vehicle update path.** Moving traffic is a fifth system added from
  scratch.

The lane geometry already encodes direction (northbound east of the centre line at
`(RD0+RD1)/2 + 2.6`, southbound west), and the road extents `RD0=27.5 / RD1=37.5` along z are the
natural recycle bounds. The audio bed for traffic already exists (`PLAN.md:294` — *"that road never
quite empties"*); only the visual is missing.

### 3. Designs feel off — the documented gaps

From `BIG-UPDATES.md` and `PLAN.md`, in the team's own words:

- **S18 — bicycles.** *"The single most Beijing form of transport, absent."* `bike()`
  (`street.js:502`) builds parked bikes only; none move.
- **S16 — a continuous street.** *"Rooms are discrete scenes reached through doors. Whether the
  hutong and the road should be one traversable space is the biggest open question about the game's
  shape."* The three zones (`street.js:3691`) switch at hard x-thresholds; the road feels detached.
- **S2 — the day's shape.** `PLAN.md:364`: no school run, no 广场舞 in the evening, shutters coming
  down one by one. The street is the same at every hour except the breakfast stall.
- **The six-lane comment vs the 10 m road.** `street.js:2281` says "six-lane"; the carriageway is
  `RD1-RD0 = 10 m` (`street.js:1064`), which is three lanes, not six. A read-as-wrong scale issue.

## The contention reality — and the move that unlocks the army

`js/street.js` is **one 3,702-line file**. Unlike the apartment — which `APARTMENT.md` split into
eleven `home-<room>.js` files through a `FlatFit` registry so eleven authors could work at once —
the street is monolithic. A naive "give every agent the file" means five agents rewrite
`street.js` at once and you get a merge nightmare with no git to undo it (see `AGENT_ARMY.md:17`).

**The enabling move is the same one the apartment already made:** split `street.js` into a
`StreetFit` registry of per-district files, each handed an `S` toolkit (the mirror of the flat's
`A`). The apartment split one shell into eleven rooms; the street splits one shell into **nine
districts**, carved fine enough that nine authors work at once. They fall out of the existing zone
structure (`street.js:3691`) plus its building rows:

```
StreetFit['entry']    → js/street-entry.js     the door seam: a real vestibule, per-door arrivals
StreetFit['alley']    → js/street-alley.js     the hutong: residential fronts, courtyards, cat, neighbours
StreetFit['stall']    → js/street-stall.js     the breakfast stall, baozi, 豆浆, steam, market life
StreetFit['road']     → js/street-road.js      carriageway, lanes, crossing, sidewalks, bus stop, 红绿灯
StreetFit['traffic']  → js/street-traffic.js   the moving cars + bus                       (owns .tick)
StreetFit['cycles']   → js/street-cycles.js    bicycles + e-scooters in motion — S18       (owns .tick)
StreetFit['retail']   → js/street-retail.js    the parade's shops: 超市, 餐馆, 购物中心, 夜市
StreetFit['civic']    → js/street-civic.js     the parade's civic: 公司, 药店, both metro mouths
StreetFit['west']     → js/street-west.js      the chess players, courtyard end, gatehouse, lions
```

Each district registers a **builder** (`StreetFit['x'] = S => {…}`) and optionally a **tick-fn**
(`StreetFit['x'].tick = (t,body,mins) => {…}`) for anything that moves — `traffic` and `cycles`
are the two that need one, so the Mech wires **two** tick hooks, not one. The shell left in
`street.js` owns the floor, the zone declarations, `roomAt`, `spawn`, `setNight`/`setWind`, and the
tick dispatch — and calls every registered builder and tick-fn. This is `FlatFit` word for word,
applied to a street.

**Why nine, not five.** A coarser split (alley / road / traffic / parade / west) serialises the
work that doesn't need to be: the stall and the alley's residential fronts share no geometry; the
parade's shops and its civic buildings share no door; the cars and the bikes are different vehicles
on different lanes. Splitting them apart puts nine files in nine hands instead of five files in
five, with zero new contention — each still owns a distinct file. The only cost is that the Hub
drains more tickets, which is what its batching is for.

**This split is the prerequisite for the whole army.** Until it lands, the street is serial.

## The roster

Inherits `AGENT_ARMY.md` tiers. New/specialised roles marked ✦.

### Tier 0 — Command

**🎖️ The Foreman** — unchanged. Holds the file-lock ledger, dispatches waves, never touches code.

### Tier 1 — Engine (runs ALONE, before anyone else)

**✦ 🏗️ Street Mech** — the `Refactor Mech` equivalent, owns the split. Runs with every other street
agent paused, full audit (`node .verify.js`) between each extraction. In order:
1. Carve `street.js` into the `StreetFit` registry + the nine district files above, **byte-for-byte
   behaviour preserved** (this is a move, not a redesign). Full audit after.
2. Publish the **district contract** (the `S` toolkit + per-district coordinate bounds, mirroring
   `APARTMENT.md`'s coordinate table) as the single source every builder reads.
3. Hand the traffic agent its tick-fn hook and the road agent its zone.

*Why alone:* until the registry exists, a district agent writing into `street.js` is writing into a
file eight other agents also have open.

### Tier 1.5 — Serial hubs (unchanged discipline)

**📝 The Hub** — owns `js/game.js` + `js/vocab.js`. For the street: the `setPlace` transition
polish (problem 1) lives here because `setPlace` is in `game.js:6388`. Also serializes every
`USE`/vocab ticket the district builders post.
**🗣️ Scribe** — owns `js/talk.js`. The neighbours' routines and the day's shape (S2): dialogue for
the school run, the 广场舞 crowd, the shutters-down hour.
**📖 Lexicographer** — `vocab.js` content via the Hub (汽车, 自行车 in motion, 红绿灯 phases, etc.).

### Tier 1 — Parallel district builders (one file each, fully parallel)

Each owns one `js/street-<district>.js`, reads the district contract, posts `USE`/vocab tickets to
the Hub. All nine run at once after the Mech lands — that is the whole point of the finer split.

- **✦ 🚪 Entry Agent** — owns `js/street-entry.js` (problem 1, the street half). Replaces the
  forced-perspective stairwell illusion (`street.js:1199`) with a real walkable vestibule matching
  the lobby's 门斗, and sets `th.exit = { place:'home', at:<vestibule-arrival> }` so the door lands
  at a specific point, not the default spawn. Pairs with the Hub (the `setPlace` fade) and the
  apartment's lobby agent for the matching interior half.
- **🏚️ Alley Agent** — owns `js/street-alley.js`. Residential fronts, the courtyards, the cat on the
  wall, the laundry line, the neighbours' routines. The day's-shape props (S2): shutters that come
  down at close, 广场舞 in the evening.
- **🥟 Stall Agent** — owns `js/street-stall.js`. The breakfast stall, baozi, 豆浆, the steamer
  steam, the flower stall. Owns the stall's own hours toggle (already in `tick`, `street.js:3580`)
  so the entry/alley agents don't have to know about it.
- **🛣️ Road Agent** — owns `js/street-road.js`. The carriageway, lane markings, the crossing,
  sidewalks, bus stop, the 红绿灯. Fixes the six-lane-vs-10 m scale mismatch (problem 3): widen the
  road or correct the comment — measured against `World.clampMove` for walkability, the way
  `APARTMENT.md` measured the corridor.
- **✦ 🚦 Traffic Agent** — owns `js/street-traffic.js` (problem 2). Turns the five static `car()`
  calls into **moving instances**: each gets a handle, a lane, a speed, a recycle at the road
  extents (`z` past `RD1` wraps to `RD0`); wheels spin; the bus runs its route and dwells at the
  stop. Registers a `.tick` into `StreetFit`. Respects the lights at the crossing
  (`street.js:2571` 红绿灯) so cars pause on red. *Coordinates with Road (lights) and the Mech (tick
  hook).*
- **✦ 🚲 Cycles Agent** — owns `js/street-cycles.js` — the S18 fix ("the single most Beijing form of
  transport, absent"). Bicycles in motion in the painted bike lane (`street.js:1079`), e-scooters
  weaving, the shared bike racks. Registers the **second** `.tick`. *Split from Traffic on purpose:
  bikes and cars are different vehicles on different lanes at different speeds — keeping them in
  one file would have been a false economy. Both tick-fns are dispatched by the shell; order is the
  Mech's contract to fix.*
- **🛒 Retail Agent** — owns `js/street-retail.js`. The parade's shops: 超市, 餐馆, 购物中心, 夜市
  mouth. Each door is a `thing()` + a Hub ticket for its `USE` row — the pattern
  `AGENT_ARMY.md:103` spells out.
- **🏛️ Civic Agent** — owns `js/street-civic.js`. The parade's civic buildings: 公司, 药店, both
  metro mouths (`metroMouth()` ×2, `street.js:2905`/`2970`). Same door→ticket pattern as Retail.
- **🌳 West Agent** — owns `js/street-west.js`. The chess players, the courtyard end, the gatehouse
  and stone lions, the 狗 by the wall.

### Tier 2 — Gate

**🔬 The Verifier** — unchanged, read-only. For the street, the L3 render **must** re-run `25-road`
and `28-night` after any traffic change, plus `44-parade` as the perf canary (`.audit.js:327`:
this street is **fill-rate-bound, not geometry-bound** — moving traffic adds draw calls and the
canary will catch a regression the static-shot audit won't).

### Tier 3 — Quality

**👁️ Reviewer** — unchanged.
**✦ 🏙️ Urbanist** — read-only specialist reviewer, the street's equivalent of the tower's Cultural
Editor. Enforces "reads as Beijing, not as a Western street with Chinese signs": the road width and
lane count actually match a real 北京 road; the bikes are the majority vehicle, not cars; the
crossing is the Chinese two-stage kind; the shutters and 广场舞 happen at real hours. This is the
role that stops the traffic fix from turning the hutong into a highway.

## The contention map

Only three files are serial; the nine districts are free to parallelize once the Mech lands:

- **`js/street.js`** — the Mech, alone, for the split; then the shell is stable and district agents
  never touch it.
- **`js/game.js` + `js/vocab.js`** — the Hub, serial, draining tickets. The `setPlace` fade (problem
  1) lives here too.
- **Each `js/street-<district>.js`** — its own writer. **Nine district agents run at once** after
  Wave 0.

### Concurrency — what runs at once, during Waves 1–2

```
Foreman (orchestrating)
├── 9 × District Builders                              ← PARALLEL (distinct files)
│      Entry · Alley · Stall · Road · Traffic ·
│      Cycles · Retail · Civic · West
├── Scribe (talk.js — neighbour routines, S2)          ← PARALLEL (independent file)
├── Hub (game.js + vocab.js, + the setPlace fade)      ← SERIAL queue, draining tickets
├── Verifier                                           ← shared, request-driven
└── Urbanist                                           ← background, per-district review
```

**~12 agents live** at peak, but only **one editing `game.js` at a time** (the Hub) and **one hand
ever in `street.js`** (the Mech, during Wave 0 only). The nine district files are the parallelism,
and the file-lock ledger is what makes it safe — exactly the `AGENT_ARMY.md` model, sized to this
scene. The Hub is the throughput limiter by design; with nine districts posting tickets, its
batching window is what keeps `game.js` from thrashing.

## The waves

### Wave 0 — Split (serial, alone)
**Street Mech** carves `street.js` into `StreetFit` + nine files, behaviour-identical, and publishes
the district contract (including the two tick-fn hooks for Traffic and Cycles). Full audit after
each extraction. *Done when `node .verify.js` is green and the five PNGs (`21-alley`, `25-road`,
`26-skyline`, `27-west`, `44-parade`) are pixel-stable.* Nothing else starts until this is in.

### Wave 1 — The three headline fixes (nine parallel, highest visibility)
All nine district agents start, but the three that fix the stated problems land first and gate the
rest:
- **Traffic Agent** ships moving cars + bus (problem 2). Re-renders `25-road`, `28-night`, `44-parade`.
- **Cycles Agent** ships moving bicycles + e-scooters (S18). Same re-renders.
- **Entry Agent + Hub** ship the door seam: the Entry Agent's real vestibule (the street half) +
  the Hub's `setPlace` fade (problem 1, the `game.js` half), coordinated so the fade covers the
  door-open beat.
*The other six (Alley, Stall, Road, Retail, Civic, West) are already running in parallel filling
their districts; this wave just says which ones are gating.*

### Wave 2 — Content + design (nine parallel)
All nine districts fill out: Alley/Stall add the day's-shape props (S2), Road fixes the six-lane
scale mismatch (problem 3), Retail/Civic wire every door through Hub tickets. **Scribe** writes the
routines and dialogue, **Lexicographer** the vocab, **Urbanist** reviews each district as it lands.

### Wave 3 — Continuity pass
Address S16 (the continuous-street question) now that the districts are real: smooth the zone
thresholds at `x=24.6` / `x=-26.2` (`street.js:3697`), make the road-to-alley walk feel like one
street. Mostly Mech + Road/Alley agents.

### Rough cost / time

| Wave | Agents live | Parallelism | Est. wall-clock |
|---|---|---|---|
| 0 Split | 1 (Mech) | none — serial | half a day |
| 1 Headline fixes | 9 districts + Hub + Scribe + Verifier + Urbanist ≈ 13 | **9×** on the districts | 1–2 days |
| 2 Content + design | ≈ 13 | **9×** | 2–3 days |
| 3 Continuity | 2–3 (Mech + Road/Alley) | low | half a day |

The nine-way split is where the dramatic speedup lives: problems 1–3 are independent files, so the
three headline fixes all land in the same wave instead of queueing behind one author.

## The three rules (unchanged)

1. **One file, one writer** — the Mech is the only hand in `street.js`; the Hub the only hand in
   `game.js`/`vocab.js`; each of the nine districts its own writer.
2. **Nothing merges without the Verifier** — and for anything that moves (Traffic, Cycles), the
   perf canary `44-parade` is mandatory, not optional.
3. **The hub serializes contention** — the nine district builders post tickets; the Hub drains them
   in order. Its batching window matters more at nine-way than it did at five.

## Minimum viable version (still 4 agents, ~70% of the value)

Foreman · Street Mech · Traffic Agent · Hub, with the Verifier run by hand. Land Wave 0 + the
traffic fix + the `setPlace` fade. That alone fixes two of the three problems (traffic moves, doors
stop snapping). The other eight district agents — and the full nine-way parallel build — queue
behind the Mech's contract, which is the one thing that has to land first.
