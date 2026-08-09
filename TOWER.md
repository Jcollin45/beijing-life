# 高层 — the twelve-floor tower army

An AI team outline for growing the building from two decks to twelve real floors — every
button on the lift panel does something, no floor is a lie — in the style of `AGENT_ARMY.md`.
Read alongside `APARTMENT.md` (the flat's coordinate contract) and `AGENT_ARMY.md` (the roster
discipline this inherits: one file one writer, serial hub for `game.js`/`vocab.js`, verifier
gate, no git so no rollback).

## The one fact that drives the design

The tower **was** a two-deck machine hardcoded across `js/world.js`. It is not any more — every
row below was generalized in Wave 0 and `js/world.js` has run on 13 decks since. **`TOWER-STATE.md`
is the record of what landed; read it before this file.** The table is kept as navigation, with the
line numbers re-measured this wave rather than the ones this file shipped with — a stale line
number in a table whose whole purpose is navigation costs every reader a grep.

| Where | Line now | What it does now |
|---|---|---|
| `STOREY`, `FLOORS`, `DECK` | `world.js:172-174` | `DECK` is **generated**, 13 entries, `DECK[n] = n===0 ? 0 : (n-1)*3.10` |
| `SHAFT_DECKS` | `world.js:229-230` | deck 0 and 2..12; `STAIR_DECKS` is a copy of it (`world.js:235`) |
| `ZONE/SOL` | `world.js:286` | plain objects, keyed by any deck |
| `SHA/GLO` | `world.js:295` | same |
| `deckDecals()` | `world.js:314` | buckets each decal to the deck whose y-range contains it |
| `setFloor(n)` | `world.js:327` | takes any deck |
| `rideFloor(dir, finished)` | `world.js:353` | multi-stop; see also the indicator note at `world.js:3102` — it is **not** `rideFloor` |
| `roomAt()` | `world.js:365` | routes by the current deck's zone list |
| `DECK_OF` | `world.js:1031` | `{lobby:0, lift:0, corridor:2}` then `f3..f11` and `roof:12`, generated |
| `HOME_FLOORS` | `game.js:7393` | twelve rows |

The twelve-button wall panel in `js/home-lift.js` is already there as flavour. The job is to make
it tell the truth.

**Will a 37 m tower even render?** Yes, and the reason is worth recording: `R.setRoom` is
re-stated per deck inside `setFloor` (`world.js:267`, `floor===0 ? LOBBY.h : DECK[2]+FLAT.h`), so
the camera is never inside a 37 m room — it is always on one ~2.6–3.0 m deck. Only the lift shaft
accumulates height, and you ride it enclosed in the car. So twelve decks is a *state* problem
(which deck am I on, which doors open), not a *view-distance* problem.

## The deck contract (fixed up front, like APARTMENT.md)

Frozen so twelve agents can build at once instead of queuing behind the shell. The existing two
are untouched — `deck 0` and `deck 2` stay exactly where they are (save files, the FlatFit
default of `2`, and the flat itself all depend on it).

```
deck  0  F1  大堂          y  0.00     ← exists (lobby)
deck  2  F2  你的家 202    y  3.10     ← exists (your flat + corridor)
deck  3  F3  老李家         y  6.20     retired-couple neighbour you can visit
deck  4  F4  物业·活动室    y  9.30     community office, gym, notice boards
deck  5  F5  小王家         y 12.40     young family
deck  6  F6  学生合租       y 15.50     student flatshare
deck  7  F7  老师家         y 18.60     a teacher — study-forward
deck  8  F8  厨师家         y 21.70     a chef — kitchen-forward
deck  9  F9  新婚           y 24.80     newlyweds, half-furnished
deck 10  F10 装修中         y 27.90     renovation in progress — bare concrete, great vocab
deck 11  F11 邻居           y 31.00     ordinary residential
deck 12  F12 屋顶           y 34.10     roof — drying yard, water tanks, the city vista
```

- **Storey is 3.10**, the value `DECK[2]` already has. `deckY(n) = n === 0 ? 0 : (n - 1) * 3.10`.
- **Deck 1 stays unused** to preserve the existing "the lift is the ride, not a place you stand"
  convention and the FlatFit default of `2`. Floors F2..F12 map to decks 2..12.
- The **F3–F11 household assignment is the human's to reshuffle**; what matters for the army is
  that each floor is a distinct `home-<floor>.js` file with one writer. The spread above is chosen
  for *language* value — each household teaches a different vocab cluster (family, food, study,
  professions), which is the point of the game.
- **Two things stay load-bearing exactly as in `APARTMENT.md`:** `World.WIN` (the 客厅 window the
  renderer shafts daylight through) and `World.rail` (the 主卧 clothes rail the outfit system
  reads). The 屋顶 adds a third named fixture — a `ROOF_VISTA` the camera can look out from —
  and the Surgeon must wire it the same way `WIN` is wired.

## File ownership

The dispatch is over — the building is built. What a reader needs now is which of the 22
`js/home-*.js` modules owns what, so two agents do not write the same corner. **One file, one
writer.** For the conventions each of these modules is written against — the `FlatFit` seam, the
build order, where a floor may add colliders — read `APARTMENT-TENANT.md`, not a sibling module.

| File | Deck | Owns |
|---|---|---|
| `js/world.js` | all | the shell, both shafts, the ride, `FlatFit`, `DECK_OF`, `setFloor`. **Contended — do not edit without the lock** |
| `js/home-lobby.js` | 0 | 大堂: 门卫室, 信箱, 快递柜, 通知栏, the vestibule |
| `js/home-lift.js` | 0 (rides) | the car fit-out — mirror, handrail, ad frame, the indicator that counts 1→12 |
| `js/home-corridor.js` | 2 | 走廊: the six landing doors, the fire hose cabinet, the end window |
| `js/home-entry.js` | 2 | 玄关, and the 玄关 end of 走道 |
| `js/home-living.js` | 2 | 客厅 (**owns `World.WIN`**), and the far end of 走道 |
| `js/home-dining.js` | 2 | 餐厅 |
| `js/home-kitchen.js` | 2 | 厨房 |
| `js/home-bedroom.js` | 2 | 主卧 (**fills `World.rail`**) |
| `js/home-second.js` | 2 | 次卧, and 书房 annexed into it |
| `js/home-bath.js` | 2 | 卫生间, and 阳台 annexed into it |
| `js/home-walls.js` | 2 | **every partition in the flat.** Runs last, reads `roomBoxes`. No room file builds a wall |
| `js/home-life.js` | 2 | the flat's lived-in layer across rooms — not a room, do not treat it as one |
| `js/home-f3.js` | 3 | neighbour household. **Its header at :10-12 is stale** — see below |
| `js/home-f4.js` | 4 | 物业·活动室. (There is no `home-community.js`; that name in earlier drafts was never built) |
| `js/home-f5.js` … `js/home-f9.js` | 5–9 | one neighbour household each |
| `js/home-f10.js` | 10 | 装修中 — bare concrete, deliberately the cheapest floor |
| `js/home-f11.js` | 11 | neighbour household |
| `js/home-roof.js` | 12 | 屋顶: drying rack, 晾衣 line, water tanks, dishes, the city vista |

**Known stale, not yet fixed:** `js/home-f3.js:10-12` still tells the next reader that `buildShell`
and `buildShafts` run "for decks 0 and 2 only". That was true when ten floor files were written
around it and is false now — `buildShafts` runs over `SHAFT_DECKS` (`js/world.js:229-230`), which is
deck 0 and 2..12. `TOWER-STATE.md` records the fix; the comment was never updated.

`js/game.js` and `js/vocab.js` are contended by every location in the game, not just this one. A
tower change that needs a `USE` row, an `NPCS` entry or a headword is **queued to whoever holds the
lock**, not made in place.

### Tier 2 — Gate

**🔬 The Verifier** — unchanged, read-only, the gate. Three levels as in `AGENT_ARMY.md`. For the
tower the L3 render adds **one audit shot per deck** (the lift doors open on each) so a floor that
silently falls back to deck 2 is caught as a picture, not a stack trace.

### Tier 3 — Quality

**👁️ Reviewer** — unchanged.
**✦ 🏮 Cultural Editor** — a specialist read-only reviewer this project earns and a generic one
does not. `APARTMENT.md`'s whole "Culturally, not generically" section is the standard: shoes off
at the 玄关, laundry on the 阳台, 春联 at the door, the thermos and the rice cooker. Every
neighbour floor and the roof get a Cultural-Editor pass before the Verifier's "done" sticks — a
fluent-floor check that the 厨师家 actually has a wok and a rice cooker, that the 屋顶 actually
dries laundry the way 北京 does. This is the role that stops twelve floors from being twelve
Western apartments with Chinese labels.

## The contention map

Only two files are serial; everything else is free to parallelize:

- **`js/world.js`** — the Surgeon, alone, for the whole build. The single biggest risk and the
  single biggest prerequisite.
- **`js/game.js` + `js/vocab.js`** — the Hub, serial, draining tickets from every floor builder.
- Every `js/home-<floor>.js` — its own writer. **~12 agents can run at once** once the Surgeon's
  generalization is in.

## The waves

### Wave 0 — Generalize (serial, alone)
**Tower Surgeon** lifts the two-deck assumption and publishes the deck contract. Full audit after
each edit; each edit is a checkpoint. Done when `setFloor(6)` actually puts you on deck 6 and the
flat (deck 2) still boots clean. *Nothing else is safe to start until this is in.*

### Wave 1 — Land every floor (parallel)
Each floor builder ships a **minimal stub first**: a landing, a corridor, a door — enough that the
button is honest. F10 装修中 lands first as the Surgeon's proof. The Hub wires all 12 `HOME_FLOORS`
rows. **End of Wave 1: all twelve buttons work, ten floors are empty rooms.** Parallel; per-deck
audit gate.

### Wave 2 — Content blast (parallel)
Fill the floors. Props, interactables, `thing()` calls; every content need posts a Hub ticket;
the Scribe writes the neighbours. This is the `AGENT_ARMY.md` Wave 1 equivalent — biggest item
count, safest place to run hot. Cultural Editor reviews each floor as it lands.

### Wave 3 — The ride (mostly Shaft Architect + Surgeon)
Multi-stop scheduler feel: floor-indicator count-up, the passing-deck whoosh, shaft lighting per
deck, the ad frame. `home-lift.js` work plus ride-tuning in `world.js`. Lower concurrency,
higher polish.

### Wave 4 — Review pass
Cultural Editor + Reviewer over the whole tower; rejected floors go back to their builder.

## The three rules (unchanged from AGENT_ARMY.md)

1. **One file, one writer.** The Surgeon is the only hand in `world.js`; the Hub the only hand in
   `game.js`/`vocab.js`; each floor its own writer.
2. **Nothing merges without the Verifier.** Workers do not self-certify — optimistic "done" is
   exactly the bug the Verifier exists for.
3. **The hub serializes contention.** Floor builders post tickets; the Hub drains them in order.

## Minimum viable version (4 agents, ~70% of the value)

Foreman · Tower Surgeon · one Neighbour Builder (F3 老李家, the highest-language floor) · Hub, with
the Verifier run by hand. Land Wave 0 + F3. The other nine floors queue behind it — each is
self-contained once the Surgeon's contract is in.
