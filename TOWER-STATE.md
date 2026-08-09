# 高层 — where the tower actually is

Updated 2026-08-05 after the whole-tower apartment acceptance pass. TOWER.md is the *plan*; this is
the *state*. Where they disagree, this is right.

## Done

**Wave 0 — `js/world.js` is generalised to twelve decks.** TOWER.md still writes this in the future
tense; it has landed.

- `DECK` is 13 entries from `STOREY = 3.10`, `FLOORS = 12`. `deckY(n) = n===0 ? 0 : (n-1)*3.10`.
  Deck 1 is deliberately unused; deck 12 (roof) is y 34.10.
- `ZONE/SOL/SHA/GLO` keyed by any deck. `deckDecals()` buckets to the highest deck at or below.
- `setFloor(n)` takes any deck and **refuses one with no zones** — warns and falls back. `goFloor(n)`
  returns `'unbuilt'` for the same case. This is the safety property that let twelve agents build in
  parallel without landing on top of each other.
- `roomAt()` routes decks other than 0 and 2 to that deck's own zones.
- Toolkit for floor builders: `A.zone(...)` (**required**, or the floor does not exist),
  `A.deckH(...)` (**effectively required above deck 2** — without it `setFloor` hands the shader
  deck 2's room box and the floor renders flat and grey), `A.STOREY`, `A.FLOORS`. Api: `deckLive(n)`,
  `decks()`, `roomBoxes`.
- The ride is multi-stop: `rideSecs(from,to)` scales with storeys travelled, capped at 7.5 s.
- `HOME_FLOORS` and the car's floor indicator cover all twelve; floors with no builder are greyed.

**All twelve floors built,** one file each, all `node --check` clean with `node .bootcheck.js` green.
F1 大堂 (`home-lobby.js`) and F2 走廊 (`home-corridor.js`) are graphics passes over existing rooms;
the other ten are new:

| deck | file | lines | deck | file | lines |
|---|---|---|---|---|---|
| 3 老李家 | `home-f3.js` | 1851 | 8 厨师家 | `home-f8.js` | 1771 |
| 4 物业·活动室 | `home-f4.js` | 1340 | 9 新婚 | `home-f9.js` | 1423 |
| 5 小王家 | `home-f5.js` | 1686 | 10 装修中 | `home-f10.js` | 1114 |
| 6 学生合租 | `home-f6.js` | 1648 | 11 邻居 | `home-f11.js` | 2115 |
| 7 老师家 | `home-f7.js` | 1922 | 12 屋顶 | `home-roof.js` | 1080 |

**Engine bugs found by the agents and fixed.** Every one was measured, not guessed:

1. **Every deck's geometry drew on every deck.** 822 props on deck 10 against 15,136 from elsewhere,
   none translucent. `world.js` now stamps `p.deck` / `th.deck` on every prop and thing as its room
   builds; `hiddenProp` culls the rest. `-1` = rides the lift car, `undefined` = shell, both kept.
2. **Interactables were offered across decks.** Measured at (0, 4) on deck 11: 31 things in reach,
   at least 8 belonging to decks 2 and 3 directly below. `inReach` now tests `th.deck`.
3. **No floor above the second had contact shading.** `openness()` did `max(p.y, 0.0)` — height above
   *world zero* — so on deck 7 the smoothstep saturated everywhere. New `uDeckY` uniform; `R.setDeck`.
4. **`uRoom.y` was being handed 5.70 while geometry sat at 18–21 m,** so every surface read as jammed
   against a ceiling. `setFloor` now passes an absolute per-deck ceiling.
5. **Plaster (`uMode == 4`) keyed its gradient and noise hash to world y,** collapsing into diagonal
   banding above ~18 m. Now deck-relative.
6. **Lights were ranked in the ground plane only,** so the eight slots that reach the shader were
   filled by lamps on decks you cannot see. Filtered by deck first.
7. **`A.rug()` drew rugs in the lobby** from every upper floor (hardcoded world y 0.005). Wrapped in
   `world.js` rather than changed in `build.js`, since every other scene is single-storey.

## The lift landings — FIXED

`buildShafts` now runs over `SHAFT_DECKS` (0 and 2..12) rather than `[0, 2]`, so every floor has
real doors, a surround, a floor indicator, a call panel, moving `leaves` and an opening `doorStops`
collider. `carZone` is pushed into every deck's `ZONE`, so the inside of the car is its own room
wherever it stops. `rideFloor` answers "one live floor that way" instead of the two-stop answer.

**Unconditional, not `decks()`, and that matters.** `buildShafts` runs inside `buildShell`, which
runs BEFORE the FlatFit loop — at that point no deck above the second has registered a zone, so
`deckLive` would answer no for all of them. The building has twelve floors whether or not somebody
has furnished them; `goFloor` is what refuses to take you to an empty one.

Also fixed: the landing indicator read `f === 0 ? '一' : '二'`, so every one of the ten new floors
was labelled 二. It reads the same deck→floor mapping the car's panel uses now, so the landing and
the button agree by construction.

**The stand-ins are reconciled.** Every authored floor now recognizes the shell landing (newer files
through `A.shellLanding`, the first three through their existing geometry probe): the shell owns one
moving pair of landing doors, one call button and one collider per storey. Floor-specific files keep
only their real surrounding architecture. F12 still builds the lift overrun above corridor height,
but no longer lays a second portal, threshold, call button or blocker over the shell landing.

Verified by riding: `goFloor(7)`, `goFloor(12)` and `goFloor(4)` each arrive with
`door: "open", open: 1`. A render of deck 7 shows both shafts clad, both indicators reading 七, the
call panel, and the 电梯 prompt correctly refusing with 等一下 while the car is moving.

## A harness lesson worth keeping

`.liftcheck.js` used to walk the corridor east along a **fixed z 3.9** and reported "stops dead at
x -4.75" the day F2 furnished it. That was the harness being wrong, not the game: at x -4.70 the
clear run is z 4.15..4.90, because the bicycle and shoe rack stand against the south wall and the
walking lane moves north round them. A player steps round furniture; a straight line does not.

It is a flood fill from the lift doors now, and it asks the only question that matters — are the two
ends of the landing connected. Same method as `.flatcheck.js`. A straight-line walk answers a
question nobody asked, and will keep failing every time somebody puts a bicycle down.

## Apartment acceptance now covered

- `HOME_USE_FLOOR` gives each furnished upper floor two local, meaningful actions. The action router
  keys them by physical deck, so a verb on F7 cannot drive an identically named fixture on F2.
- Every thing authored on F1–F12 has a dictionary row. Two harnesses, two different jobs, and this
  line used to credit the wrong one — which sends the next agent to extend the wrong file:
  - `.thingcheck.js` is the join. It walks the live scenes and checks every registered thing against
    the learning data, so it is what stands between a new prop and a silent blank prompt
    (`.thingcheck.js:1`). Measured 2026-08-08: 1958/1984, with all 26 missing rows outside `home`.
  - `.dictcheck.js` checks the dictionary against itself — three fields a line, no duplicate
    headwords (`.dictcheck.js:20` says so in as many words). `--home` adds a static, browser-free
    scan of the 21 `js/home-*.js` modules for headwords with no row: 11102/11102 on the same date.
    That scan reads source text, not the built scene, so it is a cheap early warning and not a
    substitute for the live join.
- Flat 202 now has a complete fitted kitchen and bathroom/laundry balcony. Its front door is a
  single moving leaf with one collider; the number plate, 福 sign and hardware travel with it.
- The home map enters the F1 lobby. The HUD, arrival toast, goal and save all use the actual storey;
  loading a save made during a ride lands safely at a real served floor.
- The living-room sky and city tints use the toolkit registration functions, so the window follows
  the time of day again.
- `.towercheck.js` rides the real car from F1 to F12, opens every landing, flood-fills every floor,
  verifies local vocab/actions/hazards, checks the Flat 202 front door in both states, and reloads a
  saved upper-floor life. `.audit.js APT-F` renders one acceptance frame for every physical storey.

- The tower is now inside two harnesses it used to be outside of. `.perfcheck.js` walks every live
  deck and reads the draw count on each, which is the only standing guard on the `prop.deck` stamp —
  before that stamp existed, deck 10 drew 822 props of its own and 15,136 belonging to other floors,
  and nothing would have caught it coming back. `.savecheck.js` now reaches F9 by riding the car
  (`World.goFloor`) rather than teleporting with `World.setFloor`, and checks the reload puts the
  rider back with the car at rest; the teleport path is kept alongside it, not replaced.
- `node .pixdiff.js APT` diffs the twelve storey frames, the four times of day and the three street
  elevations against recorded baselines in `.pixbase/`. Pure node, no browser, no render slot, so
  the order is always: render with `.audit.js`, then diff. `--record` accepts the current frames.
  Baselines recorded 2026-08-08 are simply whatever `.audit.js` last wrote — they are a change
  detector, not a blessed picture of a correct render.

## How to check a floor

`node .flatcheck.js` flood-fills Flat 202 from just inside its front door, checks the closed/open
door collider directly, and measures every interactable against reachable body positions.
`node .towercheck.js` performs the same check on all twelve storeys and exercises the complete lift,
actions, save and reload path. None of those guarantees are visible in a render. Walk the floor,
then run `node .audit.js APT-F` and look at it too.
