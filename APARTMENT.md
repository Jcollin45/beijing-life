# 高层公寓 — the high-rise apartment

Replaced the single-room flat with a building you arrive at, ride up through, and live in.
**This is built.** Twelve storeys, lobby, two shafts, corridor, flat 202, nine neighbour floors and
a roof all exist in `js/world.js` plus 21 `js/home-*.js` modules. Read this file for the coordinate
contract; read `APARTMENT-TENANT.md` before adding a room, and `TOWER-STATE.md` for what landed.

## Why this shape

The old `home` was one room, 7.0 × 5.5 m, plus a bathroom off it — `RX 3.5, RZ 2.75, H 2.72`,
`js/world.js` at 2,917 lines, with forty-five things you could touch. Both numbers are stale: the file was
measured at 2,917 lines this wave and is still growing (3,133 at last count, six lanes live in it),
and the tower registers 114 interactables, of which `.flatcheck.js --full` reaches 112. The old
room's constants survive only in the legacy block at `js/world.js:1459`; the live envelope is
`js/world.js:256`.

Everything else in the game still treats this as *the flat*: `game.js` calls
`R.setRoom(World.RX, World.H, World.RZ)` and hangs the window shaft off `World.WIN`, the outfit
system reads `World.rail`, and the 外卖员 courier walks to its door. That is why the building was
grown around the same scene key rather than bolted on beside it.

The vertical machinery is shared with the shopping centre rather than reinvented: a `DECK` array, a
working 电梯, `setFloor`, `deckY` and `P.lift`.

## The sequence

Four spaces, in the order you meet them.

### L0 · 大堂 the lobby — `y = 0`

What a Beijing residential lobby actually contains, which is more than a Western one:

- Double glazed entrance doors to 杨柳胡同, and an airlock vestibule
- **门卫室** — the security desk, manned. 保安 is already a character type in this game
- **信箱** — the mailbox wall, one small door per flat
- **快递柜** — parcel lockers. Universal in China now, and it connects to the courier who
  already delivers here
- Lift lobby: two lift doors, call buttons, a floor indicator above each
- **通知栏** notice board — building notices are excellent readable Chinese
- Two chairs, a 发财树 in a pot, a mirror
- The stair door, marked 安全出口

### L1 · 电梯 the lift — the ride

A real car, not a fade: doors, a button panel you press, a floor indicator that counts,
a handrail, a mirrored back wall, and the advertising frame every Chinese lift has.

### L2 · 走廊 your corridor — `y = DECK[2]`

- Six doors. Only yours opens; the rest are neighbours with their own numbers
- Shoes and a folded pushchair outside a door or two — corridors here are storage
- A window at the far end, a fire hose cabinet, a bicycle against the wall

### L3 · 你的家 the flat — `y = DECK[2]`, through your door

Ten rooms, all built. The dispatch that built them is over; what a reader needs now is which module
owns which room, because only seven of the ten got a file of their own and the other three were
annexed by neighbours. Undocumented annexation is how two agents build the same corner.

| # | Room | Owner | Contains |
|---|---|---|---|
| 1 | **玄关** entry | `js/home-entry.js` | Shoe cabinet, coat hooks, key dish, the doormat you step over |
| 2 | **客厅** living | `js/home-living.js` | Sofa, TV, tea table — **owns `World.WIN`** and the city view |
| 3 | **餐厅** dining | `js/home-dining.js` | Table, chairs, the everyday clutter of one |
| 4 | **厨房** kitchen | `js/home-kitchen.js` | Hob, extractor, fridge, sink, wok, rice cooker |
| 5 | **主卧** master bed | `js/home-bedroom.js` | Bed, wardrobe — **provides `World.rail`** |
| 6 | **次卧** second bed | `js/home-second.js` | A room that is half spare, half junk, which is what they are |
| 7 | **书房** study | `js/home-second.js` (annexed) | Desk, computer, bookshelf |
| 8 | **卫生间** bathroom | `js/home-bath.js` | The old bath zone, expanded properly |
| 9 | **阳台** balcony | `js/home-bath.js` (annexed) | Washing machine and drying rack — laundry lives on the balcony here, not in a utility room |
| 10 | **储藏 + 走道** storage and the flat's internal hall | `js/home-entry.js` + `js/home-living.js` (annexed, split) | Ties the other nine together |

`ls js/home-*.js` yields eight flat modules, not ten, and the eighth — `js/home-walls.js` — is the
partition builder, not a room. The three annexations, one per line so they are greppable:

- **书房** is built inside `js/home-second.js`
- **阳台** is built inside `js/home-bath.js`
- **走道** is split across `js/home-entry.js` (the 玄关 end) and `js/home-living.js` (the far end)

Anything added to those three rooms goes in the annexing module, not in a new file.

## The coordinate contract

**Read these off the code, not off memory.** Every number below was checked against `js/world.js`
this wave; the previous version of this table was wrong in four places and lanes had been building
to the code and ignoring the document all day.

```
STOREY = 3.10;  FLOORS = 12;                              // js/world.js:172-173
DECK   = [];  for (n = 0; n <= FLOORS; n++)               // js/world.js:174
           DECK[n] = n === 0 ? 0 : (n - 1) * STOREY;      // 13 entries, DECK[12] = 34.10
LOBBY  : x -6.0 .. 6.0     z -5.0 .. 6.2     h DECK[2]-.08   // js/world.js:197
CORR   : x -6.0 .. 6.0     z  3.2 .. 6.2     H 2.60          // js/world.js:198
FLAT   : x -6.0 .. 6.0     z -5.0 .. 3.2     H 2.60          // js/world.js:199
LIFT   : x  1.6 .. 3.4     z  4.9 .. 6.2     car 1.8 × 1.3   // js/world.js:214
LIFT_B : x -0.4 .. 1.4     z  4.9 .. 6.2     car 1.8 × 1.3   // js/world.js:215
```

`DECK` is **13 entries, generated**, not a literal. Deck 0 is the lobby at y 0; decks 2..12 are
F2..F12 at `(n-1) × 3.10`. Deck 1 does not exist as a walkable floor — the lobby is 一层. Anything
written against a two- or three-entry `DECK` is against a shape this file has not had since Wave 0
of `TOWER.md`; see `TOWER-STATE.md`.

**The corridor-width postmortem, restated against the geometry that shipped.** The first version of
this table put the corridor at `z 3.2 .. 5.0` — 1.8 m deep — and then stood both lift shafts inside
it at `z 3.6 .. 5.0`. That leaves a 0.40 m strip in front of the lifts, and `clampMove` inflates
every collider by the body radius of 0.30, so the flat's wall pushed you to `z > 3.59` while the
shaft piers pushed you to `z < 3.25`. No z satisfies both. Measured against the real
`World.clampMove`, walking east from the west end stopped dead at x = −0.80 and west from the front
door at x = 3.80: **you could not reach your own front door from the lift.**

What shipped is deeper than that fix: the back wall moved twice (`js/home-lobby.js:9-11` records
both moves) and now sits at `z 6.2`, with the shafts pushed back to `z 4.9` and ending flush against
it. The clear walking strip in front of the lifts is therefore `z 3.2 .. 4.9` — **1.70 m gross,
0.91 m of standing room once the body radius is spent on both sides**, which is `js/world.js:213`'s
own arithmetic. Measured orbits confirm it: the corridor gives 2.20 m and the flat 1.90–2.97 m.

The lesson survives the arithmetic that produced it: a corridor's *stated* depth is not its walkable
depth. Subtract whatever stands in it, then subtract 0.60 for the body, and check what is left. Do
not place a wall, door or gap by eye — flood-fill it (`node .flatcheck.js`, `node .towercheck.js`).

Inside the flat, rooms are laid against the same `(x, z)` grid:

```
玄关     x  2.6 .. 5.2   z  1.6 .. 3.2
客厅     x -1.4 .. 3.4   z -1.6 .. 1.6      ← the window wall is z = -1.6
餐厅     x  3.4 .. 6.0   z -1.6 .. 1.6
厨房     x  3.4 .. 6.0   z -5.0 .. -1.6
主卧     x -6.0 .. -2.6  z -1.4 .. 3.2
次卧     x -6.0 .. -2.6  z -5.0 .. -1.4
书房     x -2.6 .. -1.4  z -5.0 .. -1.4
卫生间   x -1.4 .. 1.4   z -5.0 .. -1.6
阳台     x  1.4 .. 3.4   z -5.0 .. -1.6
走道     x -2.6 .. 2.6   z  1.6 .. 3.2
```

## What must not break

These are load-bearing and every agent has to respect them. Cited, so nobody greps for them again:

| symbol | where | why |
|---|---|---|
| `World.RX`, `World.RZ`, `World.H` | `js/world.js:256` | feed `R.setRoom`; they describe the flat's envelope, and `RZ` is `LOBBY.z1` |
| `World.WIN` | `js/world.js:260` | the window the renderer shafts daylight through. The 客厅 owns it (`js/home-living.js:1007`) |
| `World.rail` | `js/world.js:91` | the clothes rail the outfit system indexes into. The 主卧 fills it (`js/home-bedroom.js:82`) |
| `STOREY`, `FLOORS`, `DECK` | `js/world.js:172-174` | 13 generated entries. Never a literal |
| `LOBBY`, `CORR`, `FLAT` | `js/world.js:197-199` | the three room boxes |
| `LIFT`, `LIFT_B` | `js/world.js:214-215` | both shafts, `z 4.9 .. 6.2` |
| `SHAFT_DECKS` | `js/world.js:229-230` | deck 0 and 2..12 — **not** "0 and 2" |
| `DECK_OF` | `js/world.js:1031` | which deck a `FlatFit` key builds on. Missing row ⇒ deck 2, on top of your living room |

- The tower's **114 registered interactables** must survive any move, re-homed into the right rooms.
  `node .flatcheck.js --full` reaches 112 of them (155/155 checks); flat 202's own eight modules
  declare 96.
- The **courier** must still reach a door.

## How to verify the apartment

Run these before reporting anything in this building. Prefer the pure-node ones; the rest take the
render gate (`.render-gate.js`).

| command | what it proves | cost |
|---|---|---|
| `node .flatcheck.js` | flood-fills flat 202 from inside the front door; the only thing that catches a door leaf hung across its own opening. `--full` walks every interactable | gate |
| `node .towercheck.js` | every deck 0 and 2..12 has floor, ceiling, shell and a reachable landing | gate, ~110 s |
| `node .liftcheck.js` | the car, both shafts and the landings, as a flood fill (it was a straight-line walk and reported a false failure) | gate |
| `node .dictcheck.js --home` | every `th`/`TH`/`thing` headword in `js/home-*.js` teaches a word in `js/vocab.js` | pure node, ~2 s |
| `node .bootcheck.js` | `bootOverlay:false, fails:[], errors:[]` | ~300 s timeout |
| `AUDIT_PORT=<unique> node .audit.js APT-F` | renders the flat. **Open the PNGs** | gate |
| `node .fpscheck.js home` | read `ms` and `p95Ms`, not `fps`. `hotelLift` is the control at 3.0/5.0 ms | gate, real GPU |
| `node .pixdiff.js APT-` | compares the frames above against `.pixbase/`. `--record` accepts new ones | pure node |

### The camera index

Six prefixes, all in `.audit.js`, all rendered by `AUDIT_PORT=<unique> node .audit.js <prefix>`.
A prefix is an argument, so `node .audit.js APT-` renders the whole building and `node .audit.js
APT-R-kitchen` renders one room. Deliberately **not** a line count of the file: an earlier version
of this section pinned one and it was stale within the day.

| prefix | shots | what it is for |
|---|---|---|
| `APT-F` | `APT-F01`..`APT-F12` | one overview per physical storey at 13:00 — the floor-by-floor gate. Pinned at exactly twelve by TODO item 410; a thirteenth two-digit label would read as a thirteenth storey |
| `APT-N` | `APT-N01`..`APT-N12` | the same twelve eyes at 21:00. Lamps, window tints and the roof's city vista are only ever accepted in daylight otherwise |
| `APT-R` | `APT-R-entry` … `APT-R-hall` | one camera per room of flat 202 on deck 2, named for the room, in this document's own room order. Before these, ten rooms shared `APT-F02` |
| `APT-CORR` | `-01` `-02` `-09` | the landing: east along its 12 m, flat 202's own front door, and a deck-9 landing that is not yours |
| `APT-LIFT` | `-01` `-02` | the car — from the landing with the doors open on deck 2, and from inside it on deck 6. The car is deck 1, which `APT-F` deliberately skips |
| `APT-SUN` | four times of day | the daylight patch on deck 3, proving the shaft moves on a storey that is not the one the window was authored from |
| `APT-ELEV` | the tower from the street | exterior |

Camera arithmetic that bites, and is why these numbers are not round: the shot's `c` is
`[yaw, pitch, distance]` and the camera orbits **behind** the eye, so a distance longer than the
clear run behind the eye puts it through a wall — and every surface in this renderer is
single-sided, so the frame comes back as the unlit back of the room rather than as an obvious
error. Inside the 1.30 m lift car that limit is about 0.40 m; in the corridor the eye must leave
room before the back wall at `z 6.2`. Pitch has its own trap: a `.36` pitch hits the low apartment
ceiling limiter and silently collapses a requested 7.2 m overview into a close-up.

**A render proves nothing about walkability.** `TOWER-STATE.md` makes this point and it is the one
that keeps costing time here: a fixture can look perfectly placed in a shot and be unreachable, and
a door leaf can be hung across the opening it serves without a single pixel looking wrong. Only the
flood fills answer that question. Note that flood fill *understates* — a room packed tight enough
that no cell has four open neighbours reads as blocked, so "0 stranded" means something only beside
"every registered room has measurable reachable area."

Measured this wave, so nobody re-derives it: `.flatcheck.js --full` **155/155 with 112/112
interactables**; `.towercheck.js` **5/7 with all twelve floors clean**; `.dictcheck.js --home`
**11096/11096**; frame rate **med 21.1 ms / p95 27.7 ms** against the 16.67 target, GPU-bound, at
**23,729 props** (against `STATE.md:108`'s 21.1 / 53.2 / 22,353 — the p95 halved, the median did
not). The flat orbits 1.90–2.97 m, the corridor 2.20 m. **The median is over budget and this
building does not meet rule 1 today.**

## Culturally, not generically

A Chinese flat is not a Western one with Chinese labels:

- Shoes come off at the 玄关. A shoe cabinet by the door is not decoration, it is the rule
- Laundry dries on the **阳台**, on a rack or a pulley line, not in a machine
- The kitchen is often behind a door, because of the wok and the smoke
- 热水壶 thermos, 电饭煲 rice cooker, 保温杯 on the desk
- 春联 red couplets at the door, a 福 character, a wall calendar
- Slippers inside. Tea things on the table. A drying rack of vegetables or chillies
- Air-conditioner units on the balcony wall and a water heater in the bathroom

---

## What lane 5 measured, so nobody re-derives it

Findings, not theories — `STATE.md` is where disproved theories go; this is the other half. Every
line here was true of the code at the time it was written and cost real time to establish.

### The two arrival points, as fixed constants

Both halves of the front door now exist as named constants, the way `HOTEL.md` records `HOTEL_OUT`:

| constant | value | where | when it applies |
|---|---|---|---|
| `HOME_LOBBY_ENTRY` | `{ x: 0, z: -3.48, yaw: 0 }` | `js/game.js` | arriving, and **only** when no `at` is passed |
| `HOME_OUT` | `{ x: DOOR + .1, z: -1.35, yaw: PI/2 }` | `js/street.js`, exported on the scene | leaving by the 单元门 |

`HOME_OUT` is the scene's `spawn` object itself, not a copy, so the two can never drift.

**The trap in `HOME_LOBBY_ENTRY`:** `js/game.js:10614` computes
`homeLobbyArrival = name === 'home' && started && cameFrom !== 'home' && !at`, and only that path
calls `World.setFloor(0)`. Passing an arrival point when entering the building therefore *suppresses*
both the lobby spawn and the floor reset, and drops the player into the tower on whatever deck they
were last on. `js/street-entry.js` sets `porch.exit = { place: 'home' }` with **no** `at` for exactly
this reason.

### The 小卖部 already exists — do not build a second one

**杨柳小卖部** is in the ground floor of the block itself, `js/street-alley.js:398`
(烟酒 · 冷饮 · 话费充值). It is the compound's shop. A second one on this frontage would be two
shopfronts a few metres apart, which is how duplicate tenants get built by two agents in one wave.

### Four things that were true when this section was written

1. **The 门卫室 was unmanned.** `grep -rn "place: 'home'" js/` found one character in the whole
   building and it was the courier, while `js/data.js` offered 跟保安打招呼 against a booth staged
   as "stepped out". The chair is now square to the desk at x 4.86, z −2.15 facing −x, and the desk
   lamp keeps hours; the 保安 roster row is lane 2's and the rig is lane 8's.
2. **The 快递柜 was not wired to the courier it was built for.** `js/game.js` teleports him to the
   flat door on deck 2 and clears him again; the lockers never received anything. The room side now
   exposes `World.setParcel(mine)` and `World.setLocker(n, full)`; the game side is queued.
3. **There was no stairwell behind either 安全出口 sign.** `grep -c STAIR_DECKS js/world.js` was 0.
   Both the lobby's sign and the landing's 楼梯 interactable pointed at the outside of the building.
   `buildStair` now builds a landing on every deck the shaft serves and a full flight on decks 0 and
   2 — the only two with a door looking into it — and `World.goStair(±1)` is the route when the lift
   refuses. It has **no walkable zone** on purpose: both fire doors never open, and a zone behind a
   shut leaf is either dead props or a bug.
4. **The street block was six storeys against the tower's twelve.** `js/street.js` declared
   `FL = 2.86, FLOORS = 6` — a 17.2 m walk-up in front of a building whose roof `js/world.js` puts at
   y 34.10. It is now `FL = 3.10, FLOORS = 12`, matching `STOREY` and `DECK[n] = (n-1)*3.10`
   exactly, with the window grid stopping at deck 11 because deck 12 is the roof.

### The address, which was stated three ways and wrong twice

The flat is **202, on deck 2**. It is 3号楼 1单元, in 杨柳胡同十八号. Three surfaces carried it and
two were wrong: the 楼 interactable said 三层, and the street letterbox bank ran 101..402 under a
comment reading "301 is your own" — on numbers the game advertises as digit practice. There are no
1xx flats: deck 1 is the lobby (一层 大堂 / 二层至十一层 住户).

### Two coordinate notes

`js/street.js` publishes `FACADE_LOD = 3`: bays above the third storey drop their railings, laundry
and AC boxes. Doubling the block's height at full detail would have doubled its prop count.

The forecourt is 0.90 m deep in practice. The alley's walkable zone stops at `z0 = −2.35` and
`clampMove` spends the 0.30 m body radius on top, so **the body cannot stand north of z = −2.05**
anywhere on this street. Everything lane 5 added to the frontage — the 无障碍坡道, the 电动车车位,
the 垃圾 pair, the 晾衣 line and the 马扎 — is north of that line and carries no collider, which is
why none of it can block the way to the door.
