# 京华大酒店 · Hotel Upgrade Checklist

> **Numbered so briefs can cite ranges instead of restating work** (same convention as
> `MALL-TODO.md`). An agent brief should say "do H095–H118", not re-describe the stay loop.
>
> The contract this is measured against is `HOTEL.md`. Where this file and `HOTEL.md` disagree,
> `HOTEL.md` is stale — section A exists to fix that.
>
> ### Key
> - `[ ]` pending · `[~]` in progress · `[x]` done **and** verified by something that would have
>   failed if it were broken · `[-]` wontfix, with the reason written on the line.
>
> ### What is already built (do not rebuild it)
> The hotel exists and is large: `js/hotel.js` (shell, `HOTEL_OUT`, `HOTEL_FLOORS`,
> `HOTEL_DEPARTMENTS`), `js/hotel-lift.js`, three fit-out modules (`hotel-public.js`,
> `hotel-guests.js`, `hotel-service.js`), thirteen per-floor architecture modules
> (`hotel-fB1.js`, `hotel-f1.js` … `hotel-f12.js`), and the street seam in `js/street-hotel.js`.
> All are loaded eagerly by `index.html:1739-1745`. This checklist is about the gap between that
> geometry and a hotel that *does* something.
>
> ### The three findings that shaped this list
> 1. **The hotel is in no standing harness.** `.places.js` covers ~40 scene keys and not one
>    hotel key; `.thingcheck.js` does not reach it either. `.hotelcheck.js` (568 lines) exists but
>    is not in the `.verify.js` suite, alongside four orphan one-offs (`.hotel6-proof.js`,
>    `.hotel7check.js`, `.hotel9check.js`, `.hotel9proof.js`). Nothing regression-guards 14 scenes.
> 2. **The hotel is not wired into any simulation system.** `grep -l hotel` across `disrupt.js`,
>    `story.js`, `career.js`, `pantry.js`, `weather.js`, `talk.js`, `shop.js`, `metro.js` returns
>    nothing. Checking in is a single `Data.USE` row (`hotel-public.js:1512`) that grants `mood:4`
>    and a pose. You cannot book, sleep, be charged, or leave with anything changed. Against the
>    stated project direction — consequence between locations, not more rooms — this is the whole
>    point of the building being unfinished.
> 3. **`HOTEL.md`'s level contract was unmet.** The doc's table named ten authored levels; the code
>    has thirteen floors plus the lift car (`hotel6`, `hotel7`, `hotel9` were built and
>    undocumented). **Fixed 2026-08-08 by H001–H012.**
>    ~~The `HT-` camera set covers exterior, lift, B1 and public floors 1–3 only — floors 4 through
>    12 have no named persistent camera.~~ **This half was wrong when written and is wrong now:**
>    `.audit.js` holds 129 explicitly named `HT-` cameras plus a landing/overview pair generated for
>    all thirteen floors (`.audit.js:121`, `:1611`), including full `HT4-*` … `HT12-*` sets. What is
>    genuinely open in section C is the *review* — nobody has looked at them in one pass (H051), and
>    there is no index (H055) and no mobile/night variants (H053, H054). Read section C with that
>    correction; several of its items are already satisfied by existing cameras.

---

## A · Contract and documentation truth-up
*Owner: `HOTEL.md`, this file. No code.*

- [x] **H001** — Add `hotel6`, `hotel7`, `hotel9` to the authored-levels table in `HOTEL.md` with
  their real programme and palette, read from `HOTEL_FLOORS` in `js/hotel.js:24+`.
- [x] **H002** — Reconcile the table's `Programme` column against each floor module's actual rooms;
  correct any level whose built content diverged from the promise.
- [x] **H003** — Replace the "Parallel ownership" section: it describes work as future that is done.
  Rewrite it as the current file-ownership map so a fleet can be dispatched without collisions.
- [x] **H004** — Record the measured `HOTEL_OUT` (`{x:39.18, z:28.40, yaw:-π/2}`) and the interior
  arrival point (`{x:0, z:-12.25, yaw:0}`, `street-hotel.js:283`) in `HOTEL.md` as fixed constants.
- [x] **H005** — Document the `HOTEL_DEPARTMENTS` roster (nine departments) and the floors each
  claims, so the future workplace chapter has a written seam rather than a grep.
- [x] **H006** — Write down the lift contract as implemented (`level` vs `order`, stair adjacency,
  travel duration rule) rather than as specified; note any place the implementation differs.
- [x] **H007** — Add a "how to verify the hotel" section naming the harness, the camera list and
  the two commands, matching the style of `HOTEL.md`'s acceptance section.
- [x] **H008** — Write a `HOTEL-TENANT.md`-equivalent: the ~4 KB brief a cold floor agent reads
  instead of a 40–130 KB floor module. Model it on `MALL-TENANT.md`.
- [x] **H009** — In that brief, record the per-floor conventions a new agent gets wrong: builder
  order (fit-out modules load *before* per-floor architecture, `index.html:1740-1745`), partition
  ownership, and where a floor may and may not add colliders.
- [x] **H010** — Note in `ART.md` (or link from it) the hotel's material kit, so hotel work is
  measured against the same surface-ownership table as the rest of the game.
- [x] **H011** — Cross-link `HOTEL.md` from `PLAN.md` / `BIG-UPDATES.md` so the hotel stops being
  discoverable only by filename.
- [x] **H012** — Close `BIG-UPDATES.md` **N8** ("A hotel. Checking in, room problems, checking
  out.") or restate it as the stay-loop items in section F — it currently reads as unstarted.

---

## B · Verification: get the hotel into the standing suite
*Owner: `.verify.js`, `.places.js`, `.thingcheck.js`, `.hotelcheck.js`. Highest leverage in the file.*

- [x] **H013** — Add all fourteen hotel scene keys (`hotelB1`, `hotel`, `hotel2`…`hotel12`,
  `hotelLift`) to `.places.js` so every hotel prop is colour-checked and every door is walked.
- [x] **H014** — Update `.verify.js:77`'s `what:` string; "all eleven places build" is already
  wrong and will be wronger.
- [x] **H015** — Extend `.thingcheck.js` to reach hotel scenes so "every interactive thing has a
  dictionary row" covers the hotel's interactions too.
- [x] **H016** — Register `.hotelcheck.js` in the `.verify.js` harness table with a real `secs`
  budget and a one-line `what:` in the house style.
- [x] **H017** — Fold `.hotel6-proof.js`, `.hotel7check.js`, `.hotel9check.js` and `.hotel9proof.js`
  into `.hotelcheck.js` as named cases; delete the orphans.
- [x] **H018** — Give `.hotelcheck.js` an env-overridable port (it already has `HOTELCHECK_PORT`)
  and confirm it takes the render gate, per the harness rules.
- [x] **H019** — Make `.hotelcheck.js` print a verdict (`N/N passed` + one line per failure), not a
  state dump, and print enough on first failure to diagnose without a re-run.
- [x] **H020** — Add a hotel row to `.baseline.json` so drift in prop/draw counts is caught.
- [x] **H021** — Harness case: street → hotel → street traversal in both directions lands the
  player on solid floor with the expected yaw.
- [x] **H022** — Harness case: every authored floor is reachable by lift from every other.
- [x] **H023** — Harness case: the fire stair only connects *adjacent* authored floors, and refuses
  non-adjacent requests (`game.js:12086` claims this — prove it).
- [x] **H024** — Harness case: a save taken mid-ride restores to a safe landing, never inside the
  shaft (`game.js:10246` `hotelSafe` is the code under test).
- [x] **H025** — Harness case: zero dead interaction labels across all fourteen scenes.
- [x] **H026** — Harness case: no prop in any hotel scene is missing a colour.
- [x] **H027** — Harness case: every seat that is sat on is a real seat, one occupant each (mirror
  the existing `sit` harness's rule for hotel cast).
- [x] **H028** — Harness case: every line any hotel character says has baked audio (mirror `speech`).
- [x] **H029** — Harness case: every hotel `Data.USE` row has a matching dictionary entry and a
  reachable focus point.
- [x] **H030** — Harness case: no camera in the hotel starts inside geometry (the known mall trap).
- [x] **H031** — Harness case: floor discs and thin slabs have real thickness — the other known
  mall trap — on all thirteen levels.
- [x] **H032** — Record in `.agent-ledger.json` what the hotel harness proves, so the next agent
  does not re-derive it.

---

## C · Camera coverage (`HT-` registry)
*Owner: the audit camera registry. `HOTEL.md:117-123` specifies this and it is unmet.*

- [x] **H033** — Decide and document where persistent `HT-` cameras live (they are currently only
  strings, and `.audit.js` holds eight scratch views). Give them a file that survives.
  *Settled 2026-08-08: they live in `.audit.js` (139 named rows + 26 generated = 165), and
  `.hotel-cameras.md` is the index that says which camera covers what.*
- [x] **H034** — `HT-EXT-wide`, `HT-EXT-arrival`, `HT-EXT-night`, `HT-DOOR-outside` — confirm each
  still frames what its name claims after the street work.
  *All four rendered and viewed 2026-08-08. Three findings, none fatal: the left ~55% of
  `HT-EXT-wide` is featureless haze so the "lower buildings provide scale" claim in its own comment
  is not met; `HT-EXT-night` catches the crown beacons in their low phase, so it cannot prove H065
  (`js/street-hotel.js:373` lights one in four per phase — the camera needs the phase pinned);
  `HT-DOOR-outside` shows the lane, markings, taxi and opposite block correctly, but the forecourt
  stand-in (`js/hotel.js:583`, a bare 9.5 × 5.3 m `stoneL` slab) has no porte-cochère columns,
  guardians or trees, so the view out of the lobby does not match the arrival court in
  `HT-EXT-arrival`.*
- [ ] **H035** — `HT-4-landing` and `HT-4-signature` (spa reception / pool).
- [ ] **H036** — `HT-5-landing` and `HT-5-signature` (standard corridor / room 501).
- [ ] **H037** — `HT-6-landing` and `HT-6-signature` (family floor / connecting rooms).
- [ ] **H038** — `HT-7-landing` and `HT-7-signature` (serviced residence / co-work).
- [ ] **H039** — `HT-8-landing` and `HT-8-signature` (deluxe corner room).
- [ ] **H040** — `HT-9-landing` and `HT-9-signature` (junior suite / cultural club).
- [ ] **H041** — `HT-10-landing` and `HT-10-signature` (executive lounge).
- [ ] **H042** — `HT-11-landing` and `HT-11-signature` (suite living sequence).
- [ ] **H043** — `HT-12-landing` and `HT-12-signature` (rooftop dining / terrace).
- [ ] **H044** — `HT-ROOM-day` and `HT-ROOM-night` on one representative guestroom.
- [ ] **H045** — `HT-BATH` on a guestroom bathroom.
- [ ] **H046** — `HT-SVC-route` walking the back-of-house path from staff entry to a guest floor.
- [ ] **H047** — `HT-ROOF-skyline` framing the city from the terrace.
- [ ] **H048** — `HT-POOL-caustics` — the water surface is the hotel's most expensive-looking
  material claim; it needs its own view.
- [x] **H049** — `HT-BALL-set` — ballroom in its staged banquet state, read from the pre-function hall.
  *Covered by the existing `HT3-ballroom-stage` and `HT3-prefunction`; no new camera needed. Both
  viewed 2026-08-08 and both show real defects, routed to the floor-3 lane: the flanking flower
  arrangements have blossom ellipsoids detached in mid-air with clear background between them and
  any stem (worst in `HT3-ballroom-stage`, same fault in `HT-PUB3-signature` and
  `HT-PUB3-overview`, so it is one recipe and not three placements); two gold trim bars project
  from the left end of the pre-function counter and end unsupported, the upper one crossing a
  staff figure. Separately, `HT-PUB3-overview` shows banquet place settings sunk into the tabletop
  — each plate reads as a thin crescent with its body below the surface — and chopsticks
  overhanging the rim into space. Chair backs on this floor are **correct**: the pad sits proud of
  the frame with its own thickness, so the buried-inset fault is not present here.*
- [x] **H050** — `HT-LOBBY-through` — a sightline that proves something is worth seeing through the
  main doorway, per `HOTEL.md:105`.
  *Covered by the existing `HT-DOOR-outside`; no new camera needed. Viewed 2026-08-08: the doorway
  does show modeled depth (road, lane markings, taxi, occupied facade opposite) and never clear
  colour, so `HOTEL.md:105` is met. See the H034 note for the forecourt mismatch.*
- [-] **H051** — Render every `HT-` camera and *look at each one*. Screenshot generation succeeding
  is not the acceptance criterion; `HOTEL.md:127` says so explicitly.
  *2026-08-08: 55 of 165 rendered clean and opened — exterior, lift car and landings, floors 1, 2,
  3 and B1. **110 not yet looked at**: floors 4, 5, 6, 7, 8, 9, 10, 11, 12 and the ten new
  mobile/night rows. Two live lanes broke the engine mid-sweep and the render gate has been
  unusable since ~15:05 — `js/game.js:10805` (const `room` shadows the module-scope binding at
  `js/game.js:1981`, so the assignment at `js/game.js:10881` throws and every `setPlace` dies) and
  `js/gl.js:3936` (`bindTexture` given a non-`WebGLTexture`, so every frame is the 没加载好 card).
  The floor-5 batch was rendered into the second of those and all eleven PNGs were deleted as
  worthless. Resume by re-running the per-floor batches once a one-shot smoke test reports
  `"errors": []`.*
- [x] **H052** — File one checklist item per camera that comes back wrong; do not batch-pass them.
  *Done for the 55 viewed — one finding per camera, listed against H035–H050 and in the review
  report. No camera was passed as part of a group.*
- [-] **H053** — Add a mobile-viewport variant of `HT-EXT-wide` and `HT-PUB1-overview`.
  *`HT-EXT-wide-mobile` and `HT-PUB1-overview-mobile` added at 390×844. `.audit.js` gained per-shot
  `vw`/`vh`, re-applied on every row so a mobile shot cannot resize the tail of a run. Neither has
  been rendered yet — the engine broke before they could be shot.*
- [-] **H054** — Add a night variant of at least one interior camera per authored floor.
  *Eight added — `HT1-lobby-night`, `HT2-all-day-night`, `HT3-prefunction-night`, `HT4-pool-night`,
  `HT6-family-library-night`, `HT7-residential-hall-night`, `HT9-cultural-club-night`,
  `HT10-executive-lounge-night` — each its floor's signature camera with only the clock changed.
  With the five that already existed, all thirteen authored floors now have one. None rendered yet.*
- [x] **H055** — Keep a `.hotel-cameras.md` index: name, what it proves, last verified date.
  *Written 2026-08-08. Carries all 165 cameras grouped by floor, the two pre-flight checks that
  catch a dead engine and a stale tree, and the measured note that three concurrent audits are
  about twice as slow overall as one.*
- [ ] **H056** — Delete the ~70 stale `.audit-HOTEL-*`, `.hotel*-*.png` and `.polish-hotel*.png`
  screenshots at repo root once the registry replaces them.

---

## D · Arrival, exterior, street seam
*Owner: `js/street-hotel.js`, `js/hotel-f1.js`, `js/hotel-public.js`.*

- [x] **H057** — Verify the porte-cochère reads as a covered drop-off from `HOTEL_OUT`, not as a
  canopy floating over paving.
- [x] **H058** — Taxi/drop-off lane: cars actually arrive, wait, and leave rather than sitting parked.
- [-] **H059** — Bell staff meet arriving cars and move luggage; the trolley has a route, not a spot.
  *Wontfix here, split reason. There is no bell-staff figure and adding one is a `place:'street'` cast
  row in `js/data.js`, which lane 5 does not own — that is a request. The trolley's route is blocked
  by the forecourt plan, measured: the clear corridor between the taxi envelope (`x ≤ 38.73`) and the
  ginkgo planters (`x ≥ 39.18`) is 0.45 m against a trolley 1.12 m wide, and the z gap between the
  north planter (ends 30.08) and the north guardian (starts 31.73) is 1.65 m against a trolley 1.65 m
  deep — one legal centre point, where it stands. Its old ±0.35 m sine drove it 0.30 m through the
  planter stonework; that is cut to ±0.10. A real bell round needs the guardian/ginkgo line re-planned.*
- [x] **H060** — Automatic doors ease open on approach and closed on departure, with no blocking
  collider on the leaves.
- [x] **H061** — Standing outside, the doorway shows a modeled vestibule and lobby depth — never a
  shell wall or a light card (`HOTEL.md:25-27`).
- [x] **H062** — Standing inside, the doorway shows the forecourt, the drop-off lane and the
  opposite streetscape.
- [x] **H063** — Base, podium, tower and crown have four distinct silhouettes with at least three
  step-backs (`street-hotel.js` reports `tower.height 93.05`).
- [x] **H064** — The crown reinterprets dougong/bracket rhythm in steel and bronze; check it is not
  a temple roof on a tower.
- [x] **H065** — Aircraft warning lights on the crown, pulsing, visible from the hutong at night.
- [x] **H066** — Occupied-window variation is seeded, not random per frame, and changes with the
  clock (`street-hotel.js` tracks `tower.windows`).
- [x] **H067** — Night application (`_applyNight`, `street-hotel.js:292`) covers every exterior
  emitter, including the new ones added by this section.
- [x] **H068** — Vertical bilingual sign, Chinese primary, crisp at walking distance in the glyph atlas.
- [x] **H069** — Guardian forms (lions or abstract) flank the arrival court at a believable scale.
- [x] **H070** — Landscaped arrival court: planting, paving change, and something that moves in wind.
- [x] **H071** — The hotel is legible from the hutong skyline — check from a street camera, not only
  from the forecourt.
- [x] **H072** — Approach from the metro / Business District reads as an approach; no abrupt
  pavement seam at the hypermarket boundary.
- [x] **H073** — Weather: rain darkens the forecourt paving and the canopy sheds; wind moves the
  planting. Read the day from `disrupt.js`, do not roll locally.
- [x] **H074** — Doorman and concierge (`周礼宾`, `street-hotel.js:332`) have idle behaviour that is
  not a loop of the same gesture.
- [-] **H075** — Luggage left at the bell stand persists for the visit rather than resetting on
  scene rebuild. *Wontfix: the premise is false and the feature does not exist. `Lazy` has no drop
  path (`js/lazy.js:90-94` registers, `real()` caches, nothing clears `rec.mod`), so the street scene
  builds exactly once per page and nothing resets. There is also no luggage-drop mechanic to persist
  — that is the stay system, lane 2 (`js/stay.js`).*
- [~] **H076** — Exterior draw cost measured and recorded; the hotel must not tax the street when
  the player is nowhere near it. *Prop count recorded: **1070** props for the whole hotel exterior
  (`StreetFit.hotel.propCount`), 350 lit windows, tower height 93.05. Motion is distance-gated at
  `hypot(px-39, pz-31) < 75`. Frame cost not recorded — the machine did not go quiet enough for a
  valid `.fpscheck.js street` reading during this lane.*

---

## E · Vertical core: lift, stairs, landings
*Owner: `js/hotel-lift.js`, `js/hotel.js`, the lift branches in `js/game.js` (~9960–10060, 12084+).*

- [x] **H077** — At least three passenger lifts and one service lift are *visually* present on every
  public floor, even though one car is authored.
- [x] **H078** — The authored car has stone/bronze walls, handrail, mirror surface, bilingual floor
  panel, direction lantern and position display.
- [x] **H079** — Car camera never clips the mirror, ceiling or door jamb during the full ride.
- [x] **H080** — Landing doors ease open on approach and closed on walk-away, on every one of the
  thirteen landings.
- [x] **H081** — Ride is a state, not a cut: doors close, indicators advance, the car moves for a
  duration proportional to `|level difference|`, destination doors open.
- [x] **H082** — Ride audio: car hum, arrival chime, door mechanism — ducked correctly against
  ambience.
- [-] **H083** — Floor announcement in Chinese on arrival, with the floor's `hz` from `HOTEL_FLOORS`.
  *Blocked, not declined. `hotel-lift.js` has the `hz` and fires `hooks.arrive(key)`; the announcement
  needs a `say`/`toast` call in `js/game.js` (contended, `:10685-10691`) and a baked voice line from
  lane 4. Adding an unbound `hooks.announce` here would be dead code. Request both.*
- [x] **H084** — `HotelLift.state()` exposes current floor, target, phase, direction, openness and
  progress; assert each is inspectable from the harness.
- [-] **H085** — `HotelLift.toSave()` / `restore()` round-trip every one of those fields.
  *Wontfix — the item contradicts the code and the code is right. `toSave()` deliberately writes only
  `{v:1, currentKey, phase:'landing'}` and `restore()` normalises anything, including a corrupt or
  mid-ride record, to an idle open landing (`hotel-lift.js:94-104`, and its comment records the bug
  that produced the rule: restoring a live ride left the old moving controller alive while the saved
  body resumed on a landing). Round-tripping `phase`/`progress`/`openness` would restore a player
  into a moving shaft. H024 and H312 want exactly what the code does. Nothing to change.*
- [x] **H086** — `HotelLift.safeLanding()` is exercised by a test that saves mid-ride.
- [x] **H087** — `HotelLift.syncLanding()` is called on every scene entry that is a hotel floor
  (`game.js:10557`) — prove no floor is missed.
- [x] **H088** — Fire stair connects adjacent authored floors only, with the refusal line
  `安全楼梯只通相邻开放层。` reachable and correct.
- [-] **H089** — The stair is a modeled route, not a teleport panel: landing, flight, door.
  *Landing and door are built (`hotel.js:350-372`: enclosed vestibule, stone jambs, red leaf, 安全楼梯
  and 安全出口 signage, solid + mirrored blocker). The flight is not, and building one would put
  geometry behind an opaque door that no camera can reach — invisible props on all thirteen floors.
  Making it visible means animating the stair leaf like the lift landing doors, which is a shell
  change worth doing deliberately rather than as a side effect of this lane.*
- [-] **H090** — Service lift is usable from B1 to guest floors for the staff route, with its own
  landing treatment. *Landing treatment is built (`hotel.js:294-319`: limestone portal, recessed dark
  reveal, its own bordered landing, brass/ink threshold bars, 服务梯 signage, portal solid + blocker).
  Usable is blocked: a `thing('服务梯', …)` with no `USE` row is a dead interaction label, which the
  acceptance bar forbids, and the lift/stair rows live in `js/data.js:2628-2634` (contended). Request
  a `服务梯` row with `hotelFloors:'service'` and this becomes a two-line change here.*
- [x] **H091** — Floor panel shows B1 through 12 with the correct `display` strings and no floor 4
  superstition workaround that contradicts `HOTEL_FLOORS`.
- [x] **H092** — Lift lobby on each floor has its own identity per `HOTEL_FLOORS` accent colour, not
  one repeated lobby thirteen times.
- [-] **H093** — Waiting in a lift lobby occasionally produces another guest or a staff member
  arriving — the vertical core is where hotel life is most visible. *Out of lane. The shell's `A` api
  has no figure primitive, and a cast row added from `js/hotel.js` would place a figure on all
  thirteen floors at once. `HotelCast` and the per-floor rosters are lane 8. Figures are also the
  most expensive thing in a room, so this wants a density decision, not a shell hook.*
- [x] **H094** — Measure ride frame cost on the software test setup; the car must not stutter.
  *`node .fpscheck.js hotelLift` (real GPU, `--use-angle=metal`): **fps 105, fps95 80** — a p95 frame
  of 12.5 ms against the 16.7 ms budget, `pass: true`. The car is **402 props**, the lightest scene in
  the hotel by a factor of five, and its per-frame work is nine scalar glow writes plus the door and
  display matrices. Caveat: taken at load 7 with the fleet still working, so the true figure is
  better, not worse. Re-measure on a quiet machine if it is ever marginal.*

---

> **Simulation pass landed 2026-08-08 (no browser — a frame-rate run held the gate).** Verified by
> `node .staycheck.js` 126/126, `node .staymoney.js` 44/44, `node .hotelweek.js` 116/116 — all pure
> node, no render gate. Every new rule was proved by breaking the code and watching the check go
> red: 19 mutations, 19 caught.
>
> What landed: H108 (`Stay.staffAccess` reads `Career.hotelStaff`), H139 (`favours.upgrade` wired —
> one grade up, **no price moves**, so the desk's printed ¥ stays honest by construction), H150
> (due vocabulary seeds which room problem you get *and* `Disrupt.hotelBias` shapes the day's hotel
> event), H153 (`minibar`/`serviceArrived` write dated lots to `js/pantry.js`), H158 (money balance
> farmed against both new paths), plus a one-減免-per-stay cap that closes the food-mint the pantry
> wire would otherwise have opened.
>
> **What is still open here is open because the caller lives in a locked file, not because the rule
> is missing.** H105 needs `js/hotel-lift.js`; H106/H113/H115/H116/H121/H127/H128 need the guest
> floor modules or `js/game.js`; H109/H111/H112 need `js/game.js`'s sleep and save; H137/H140/H141
> need cast rows and a frame-rate measurement. The module-side answer already exists for most of
> them — `canEnterFloor`, `opensDoor`, `sleepFactor`, `breakfast`, `housekeep`, `sendLaundry`,
> `minibar`, `serviceDue` — so those are wiring jobs, not design jobs.

## F · The stay loop — book, key, sleep, problems, check out
*Owner: a new small module, `js/stay.js`. Pattern: `career.js` / `story.js` — ~200 lines, pure state
and rules, draws nothing, knows about no room, answers questions `game.js` asks. Do **not** add this
to `game.js` (13,577 lines).*

**Booking**

- [x] **H095** — Create `js/stay.js` with the module shape used by `career.js`; register it in
  `index.html`'s `FILES` list next to `career`/`story`/`pantry`/`disrupt`.
- [x] **H096** — Model a booking: floor key, room number, rate, nights, check-in day, check-out day.
- [x] **H097** — Room grades priced from the floor: standard (5), family (6), residence (7), deluxe
  (8), junior suite (9), suite (11). Rates in ¥, consistent with the game's existing economy block.
- [x] **H098** — Availability is finite and dated. A room is not bookable if it is already occupied
  for those nights — reuse the dated-lot thinking from `pantry.js` rather than a scalar count.
- [x] **H099** — Reception interaction becomes a real transaction: choose nights and grade, pay,
  receive a key card. Replace the `mood:4` placeholder at `hotel-public.js:1512`.
- [x] **H100** — Payment goes through the wallet, and fails gracefully with too little money — the
  `shop` harness's economy path is the reference.
- [x] **H101** — Booking a room the player cannot afford offers the cheaper grade rather than a
  dead end.
- [x] **H102** — Deposit taken at check-in and returned at check-out, as a real Chinese hotel does
  (押金) — it is also a genuine numbers-under-pressure language moment.
- [x] **H103** — ID is asked for at check-in (身份证 / 护照). The player having or not having it is a
  state, not a formality.

**Key and access**

- [x] **H104** — The key card is an inventory item with a floor and room number on it.
- [ ] **H105** — The lift refuses guest floors without a key card, and says why in Chinese.
- [ ] **H106** — The booked room door opens; every other guestroom door stays shut with a line, not
  a silent no-op.
- [x] **H107** — Losing / leaving the key card is recoverable at reception, at a cost in minutes.
- [x] **H108** — The card also opens the B1 staff locker path only if the player is staff (seam for
  the future work chapter, `hotel-service.js:1126` already references 房卡).

**The night**

- [ ] **H109** — Sleeping in the booked room advances the day and restores sleep, using the same
  rollover the flat uses — not a hotel-local clock.
- [x] **H110** — A night in the hotel is charged once per night, not per sleep action.
- [ ] **H111** — Sleep quality varies: floor, grade, and whether there is noise (see H117) change
  how much sleep is restored.
- [ ] **H112** — Waking in the hotel puts the player in the room, not in the lobby, after a reload.
- [ ] **H113** — Curtains, bedside lights and the television are usable and their state persists
  across the night.
- [~] **H114** — Breakfast is included at certain grades and served only during a window on floor 2
  or 10; arriving late is a real outcome, not a blocked door.
- [ ] **H115** — Room service can be ordered by phone and arrives after a delay, delivered by a
  staff member who walks there.
- [ ] **H116** — Housekeeping services the room while the player is out, and the room state shows it.

**Room problems — the language content of N8**

- [x] **H117** — Seed one problem per stay from a small set: no hot water (没热水), air conditioning
  broken (空调坏了), noisy neighbour (隔壁太吵), wrong room type, no towels (没有毛巾), card
  demagnetised.
- [x] **H118** — Each problem is reportable by phone or at reception, in Chinese.
- [x] **H119** — Reporting it correctly gets it fixed; misunderstanding produces a *recoverable
  story* — the wrong thing arrives, or it takes longer — never a "wrong answer" screen. This is the
  standing design rule for the whole project.
- [x] **H120** — Comprehension has a material outcome here: understanding the reply changes minutes
  lost, whether the fix lands tonight, and whether a discount is offered. This is one of the two
  remaining systemic gaps in the codebase — the hotel is a good place to close it.
- [ ] **H121** — Engineering staff physically walk from B1 to the room to fix it, using the staff
  route, on the service lift.

**Check-out**

- [x] **H122** — Check-out settles the bill: room nights, minibar, room service, laundry, less deposit.
- [x] **H123** — An itemised bill the player must actually read — receipts are the most honest
  reading exercise the game has.
- [x] **H124** — Late check-out is negotiable and costs money; the negotiation is in Chinese.
- [x] **H125** — Luggage storage after check-out at the bell desk, retrievable later the same day.
- [x] **H126** — Leaving without checking out has a consequence rather than being silently allowed.
- [ ] **H127** — Minibar consumption is tracked and appears on the bill — a small mechanism that
  makes the room feel watched in the way a real hotel is.
- [ ] **H128** — Laundry sent from the room comes back the next day, via B1.
- [x] **H129** — All stay state joins the `bjlife.save.v1` schema **and** its loader guard.
- [x] **H130** — A corrupt or partial stay block in a save must not stop the game booting — the
  `save` harness already tests this shape for other systems.

---

## G · Cross-location consequence
*Owner: `js/stay.js`, `js/disrupt.js`, `js/story.js`, `js/career.js`, `js/data.js`. The point of the
whole exercise: leaving the hotel should change somewhere else.*

> **Lane 3 landed 2026-08-08.** Verified by `node .hotelweek.js` (98/98, pure node, no render gate)
> and `node .hotelhours.js` (7/7, browser, 63 outlets timed). `.staycheck.js` 87/87 and
> `.staydesk.js` 51/51 still pass; `.bootcheck.js` clean.
>
> `[~]` in this section means one specific thing: **the rule exists and is checked, but the one call
> that makes the player feel it lives in a file this lane may not write.** Those calls are listed in
> `.agent-ledger.json` under `hotelWires.wiresStillNeeded`, and the two that matter most are both in
> `js/stay.js` — `fill` at line 121 should read `Disrupt.hotelFill(d)`, and the rate should go
> through `Disrupt.hotelRate`. `.hotelweek.js` applies the first of those to a copy of `js/stay.js`
> in a sandbox and proves the hotel then genuinely sells out, so the patch is pre-verified.
>
> The harness also found three holes in other lanes' files and prints them every run as `KNOWN`:
> `js/stay.js` `waive` is uncapped (a live free-money path via `js/talk.js:1470`), the late
> check-out fee is charged twice (`js/hotel-public.js:1682` **and** `js/stay.js:361`), and
> `js/hotel-f3.js:690` / `js/hotel-f8.js:1281` register their `HotelUse` rows inside the builder
> rather than at load, so `js/data.js` cannot patch them.

- [x] **H131** — The hotel answers `disrupt.js`'s day rather than rolling its own weather: a storm
  fills the hotel (stranded travellers), a clear day empties it.
- [~] **H132** — A cancelled flight (`disrupt.js` already wires weather → flights) drives walk-in
  demand and pushes rates up; rooms can genuinely sell out.
- [~] **H133** — Sold out means sold out: the player must go somewhere else, and that is a real
  outcome the map supports.
- [~] **H134** — Airport → hotel is a natural chain; a late landing should make the last check-in
  window matter.
- [~] **H135** — Metro closing time interacts with returning to the hotel late.
- [x] **H136** — Staying in the hotel instead of the flat means rent is still due but sleep is not
  free — a genuine money/time tradeoff.
- [ ] **H137** — Hotel guests met on a floor can reappear elsewhere in the city; NPC depth over NPC
  count is the standing rule.
- [~] **H138** — Reception staff remember a returning guest — favours, complaints, whether the
  player was understood, whether they were habitually late. `story.js` affinity is the existing
  mechanism.
- [x] **H139** — A complaint handled well changes what is offered next stay (upgrade, late check-out
  granted without argument).
- [ ] **H140** — The banquet floor (3) can be hosting an event that draws NPCs from other locations
  on a given day.
- [ ] **H141** — A wedding on floor 3 is visible from the lobby and changes lobby traffic that day.
- [~] **H142** — Rooftop restaurant (12) requires a booking made earlier in the day — a plan that
  can be missed.
- [~] **H143** — Spa (4) has opening hours and requires an appointment.
- [x] **H144** — **Opening hours generally**: every hotel outlet gets a `d.open` window. `useLabel`
  already honours one; almost nothing outside the shop and diner uses it. This is a data job.
- [x] **H145** — Reception is 24h; the restaurants, spa, gym, business centre and executive lounge
  are not. Getting this wrong is what makes a building feel like a diorama.
- [~] **H146** — Executive lounge (10) access is gated on room grade, not on a flag.
- [x] **H147** — The hotel appears as a destination in the travel/place list with a real cost in
  minutes from each district (`game.js:7915` has the row — check the `mins:5` is honest).
- [x] **H148** — Money spent in the hotel comes out of the same wallet as everywhere else and shows
  in the same ledger.
- [x] **H149** — Career seam: a hotel shift becomes *possible* without remodeling — the departments,
  routes and tags in `hotel.js` are already there. Do not build the chapter; prove the seam by
  attaching one task to it.
- [x] **H150** — Due-vocabulary biasing: when hotel/service topic words are due, the day is more
  likely to produce a hotel-shaped event (a booking problem, a delivery, a lost key).
- [~] **H151** — Tag every hotel vocabulary row with one of the twelve closed topics so H150 can
  work at all (see section H).
- [ ] **H152** — A hotel stay leaves a trace in the flat: a receipt, a key card not returned, a bag.
- [~] **H153** — Groceries/pantry: room-service food and the minibar are real dated lots, not a
  scalar, consistent with `pantry.js`.
- [x] **H154** — Nothing in the hotel fires events at listeners; it *answers questions* about the
  day, the way `disrupt.js` deliberately does.
- [x] **H155** — The hotel's simulation ticks are scene-local and gated by floor and distance; an
  empty hotel must cost the street nothing.
- [x] **H156** — Seven-day simulated run: the hotel must not produce two identical days.
- [x] **H157** — Seven-day run: check no state grows unbounded (bookings, guests, bills).
- [x] **H158** — Seven-day run: money in and out balances; no free money path through the hotel.
- [x] **H159** — Write the seven-day hotel run as a harness case, not a manual play-through.
  *`.hotelcheck.js` (`week`) proves nothing grows unbounded or leaks an NPC across seven clock
  rollovers. The rest is now in `.hotelweek.js` — pure node, no browser, no render gate: it loads
  `weather`, `disrupt`, `stay`, `story` and `career` into a vm and plays a week. 98/98, and it
  prints its own KNOWN list for the three holes it found in other lanes' files.*
- [x] **H160** — Record in `.agent-ledger.json` which cross-location wires are live, so the next
  agent does not rebuild one.

---

## H · Language: vocabulary, dialogue, speech
*Owner: `js/vocab.js` (via Hub), `js/talk.js` (Scribe), the `Data.USE` rows in the hotel modules,
and the baked-voice pipeline.*

- [x] **H161** — Audit the hotel vocabulary block (`vocab.js` around 1718–1731+). Most rows are
  three-field; the fourth topic field is what makes review invisible.
  *Audited: 17 of the 28 rows it started with were untagged. **The count, with its rule: rows
  between the 京华大酒店 section heading and the end of `RAW`, excluding blank and `#` lines —
  278 rows, 242 tagged** as of this edit. A count of 284 taken from the gate uses a wider anchor
  and is not in conflict; the rule above is the one these figures are measured by.*
  *The block is, and the tagging rule it was tagged by is written at the head of the section so the next
  row follows it. It grew from 28 to 273 in three steps: the words the trees needed, then the ten
  stay-loop words lane 2 asked for, then the 72 headwords `.thingcheck.js` named.*
- [x] **H162** — Add the fourth topic field to every hotel row from the closed set of twelve.
  *Re-reviewed once the notebook started grouping by this column, which made the tags visible to a
  player for the first time. **277 rows, 238 tagged, 39 untagged.** Headings as they now read:
  家里 · indoors 71 · 交际 · people 51 · 工作 · work 45 · 方向 · getting around 27 · 吃的 · food 18 ·
  钱 · money 14 · 时间 · time 7 · 数字 · numbers 4 · 交通 · transport 2.*
  *Five rows moved because they read wrongly to somebody browsing: 酒店, 宾馆 and 招待所 are now
  untagged (see H169), and 入住 / 订房 moved from home to money, which puts checking in beside
  checking out under 钱 · money instead of splitting the pair across two headings.*
  *Closed for H151 too. Six of the eight remaining three-field rows are tagged — 水疗, 证件, 签字
  and 刷 as `money` (all four are what happens at a counter, which is what
  `Disrupt.SERVICE_TOPICS` means by service language), 露台 and 京华套房 as `home` (a terrace and a
  room grade, filed with the other grades). Measured reaching the mechanism rather than assumed:
  with the six overdue, `Disrupt.serviceDue()` moves **0 to 0.5** and all six appear in
  `Vocab.dueByTopic` under their own topic.*
  *问题 and 需要 stay three-field **on purpose, re-confirmed rather than carried over**. A day
  cannot be about "problems" or about "needing", so any of the twelve would be a lie told to make
  a counter go up. The remaining two are the answer, not the remainder.*
  *A 13th `hotel` topic is **not available from `js/vocab.js` alone and would crash the notebook**:
  `renderBook` at `game.js:2639` does `BOOK_TOPICS[t][0]` for every `t of Vocab.TOPICS`, and a topic
  with no `BOOK_TOPICS` entry throws `Cannot read properties of undefined` as soon as one word
  carries it. Adding one needs a matching `game.js` edit, which is a contended file.*
  *home 76 · social 49 · work 45 · direction 25 · food 18 · money 12 · time 7 · number 4 ·
  transport 2. The 35 left untagged are deliberate — 露台, 水疗, 桑拿房, 青铜亭, the artworks, the
  house names and a few general words. None of them can key a day, and a wrong tag does not merely
  fail to help: it makes the world stage the wrong scene.*
  *The 42 staff and guest roles are tagged **social**, not work, on the doctrine's own exception:
  work is for the colleagues you do the job with, and the player is a guest here. When the workplace
  chapter lands they move; not before.*
- [x] **H163** — Confirm `.dictcheck.js` still passes with the widened rows.
  *Final: **1690 entries, 8454/8454**, against the harness lane's repaired `.dictcheck.js`. The
  earlier 1620/8101 figure was taken against the broken one and meant less than it looked: its
  `/[=(){};]/` "code, not data" filter was discarding 70 rows — 4% of the dictionary — from **every**
  check, not only the tone check, because a gloss like `(possessive)` or `nose; an elephant's trunk`
  has the same shape as code to that filter. Those rows were getting no field count, no tone check
  and no duplicate-headword check at all. A `vm` evaluation of `js/vocab.js` now agrees with the
  text scan at 1690, which is what closes the truncation class as well.*
  *`node .dictcheck.js` — **1620 entries read, 8101/8101 checks passed**, from 1374 / 6871 before.
  Run after every single edit, not once at the end. **And `.dictcheck.js` alone is not enough:** it
  reads the file as text with a regex, so it cannot see a backtick inside the word list, and neither
  can `node --check` — both passed on a comment I added that ended the RAW template literal and
  truncated the dictionary at that line. Caught by evaluating vocab.js in a vm and counting DICT.
  It really evaluates to 1685 entries; the textual count is lower because dictcheck skips rows whose
  gloss contains a bracket.*
- [x] **H164** — Vocabulary for booking: 单人间, 标准间, 大床房, 套房, 押金, 身份证, 几晚, 含早餐.
  *All eight present, plus 入住 订房 房价 房卡 房号 证件 签字 晚, and the five remaining
  `Stay.GRADES` names the booking panel prints.*
- [x] **H165** — Vocabulary for problems: 空调, 热水, 毛巾, 吵, 坏了, 修, 换房间.
  *All seven, plus 隔壁 修好 报修 房型 消磁 加床 问题 and the three objects that arrive when you
  nodded at a sentence you did not follow — 电扇 浴巾 耳塞.*
- [x] **H166** — Vocabulary for service: 客房服务, 叫醒服务, 送餐, 洗衣, 打扫.
  *All five, plus 电话 下午 服务费.*
- [x] **H167** — Vocabulary for checkout: 退房, 结账, 发票, 收据, 寄存行李.
  *All five, plus 账单 房费 消费 多收 迷你吧 延迟退房 寄存 减免.*
- [x] **H168** — Vocabulary for the building: floor names, department names, the nine
  `HOTEL_DEPARTMENTS` labels.
  *All nine labels are now rows. Floor names are 楼层, 地下一层 and 顶楼 — 一楼 through 十二楼 are
  left to decompose over the existing 一…十二 and 楼, which they already do.*
- [x] **H169** — Disambiguate 饭店 / 酒店 / 宾馆 / 招待所 explicitly — `vocab.js:691` already flags the
  confusion and the hotel is where it should be taught.
  *All four are now **untagged**, revisited once the notebook began grouping by this column and
  printing `home` as 家里 · indoors. A building you sleep in for two nights is not the player's own
  flat, and none of the twelve topics is a kind of building — filing 招待所 under "indoors" would
  tell the player something false about the word. Untagged is an answer.*
  *宾馆 and 招待所 added, 酒店's gloss sharpened, and the four are contrasted in a comment in the
  hotel block. 饭店 stays where it is on line 691 and stays untagged: it means two different
  buildings and a word that votes for two events chooses neither.*
- [x] **H170** — **`talk.js` has no hotel conversation trees at all.** Add the check-in tree.
  *Eight scripts, 27 turns, 87 lines. Check-in is 林若 (`talk.js:933`), four turns: the document,
  the grade, the nights, the floor and breakfast. It deliberately books nothing — the transaction
  with a wallet in it belongs to the reception picker.*
- [x] **H171** — Talk tree: reporting a room problem, with a recoverable misunderstanding branch.
  *许管家 (`talk.js:1001`). Turn 1's wrong branch is 那我明天再说 — lifted verbatim from
  `Stay.PROBLEMS` aircon `slip` — and it carries `does:{heard:false}`, so the fan arrives, the
  turn stays open and she asks again. No failure screen anywhere in it.*
- [x] **H172** — Talk tree: ordering room service by phone.
  *罗小燕 (`talk.js:1072`), opening on 喂 so it reads as a telephone.*
- [x] **H173** — Talk tree: asking the concierge for directions or a recommendation.
  *周礼宾 (`talk.js:1115`), four turns.*
- [x] **H174** — Talk tree: check-out and the bill, including querying a charge.
  *沈经理 (`talk.js:1166`). The bill turn says three numbers out loud and one of them is wrong;
  querying it is a right answer.*
- [x] **H175** — Talk tree: negotiating late check-out.
  *沈经理 turn 3, priced off `Stay.lateQuote` — free to 14:00, half a night to 18:00.*
- [x] **H176** — Talk tree: restaurant seating and ordering on floor 2.
  *叶青 seats you (`talk.js:1217`), 吴晴 takes the order (`talk.js:1252`).*
- [x] **H177** — Talk tree: a small-talk exchange with a returning-guest branch that reads `story.js`
  affinity.
  *高迎 (`talk.js:1297`). The `when` is `s.knows >= 2` — `Story.knows`, not anything about the
  hotel — and 2 is the 面熟 threshold in story.js, so he starts recognising you on the same
  conversation the notebook does.*
- [~] **H178** — Every tree reaches an ending; the `talk` harness must cover them.
  *The content half holds and the harness half does not, so this stays open.*
  *`node .talkcheck.js`: **22 people, 69 turns, 246 spoken lines, 207 branches walked**, all eight
  hotel people run out of questions and go back to remarks, and every hotel line has a clip. An
  earlier note here said 243 lines and 208 branches: those were real numbers from the run **before**
  the 许管家 rewrite, not a different way of counting. Rewriting her turn 0 as six situational
  variants took it from four replies to three (−1 branch) and added three of her replies to the
  spoken set (+3 lines). The final run and the gate's independent run agree exactly at 246/207.*
  *What blocks the tick: `.talkcheck.js` dies at its own line 241 with `Cannot read properties of
  undefined (reading 'NPCS')`, exit 1, so sections 6 and 7 never run. It reloads the page and waits
  a fixed 2,600 ms before reading `window.__game`, which is not enough on a loaded machine — it
  fails identically on the unmodified tree, so it is a harness bug and not hotel content. The fix is
  to poll for `window.__game` instead of sleeping past it, in a file lane 4 does not own. The two
  claims it never reaches are proved separately for the hotel — see H179.*
- [x] **H179** — Comprehension (`ok`) must land on something material in at least the problem and
  bill trees — not only affinity and the SRS grade.
  *`does` on an option, landed by `land()` at `talk.js:1488` through `Stay`. Twelve options carry
  one. Understanding 许管家 calls `Stay.report(key, true, day)` and the fault is fixed tonight;
  misunderstanding her calls it with `false` and costs 45 minutes and the evening. Querying the
  minibar line calls `Stay.waive` and the bill really goes down.*
- [x] **H180** — Politeness register: hotel staff speak more formally than street NPCs. 您 not 你.
  This is a teaching point the game currently has nowhere to make.
  *Checked mechanically, not by eye: every ask, `yes` and `then` in all eight scripts is scanned
  for a bare 你 and there is none. 您's dictionary gloss now names the contrast.*
- [x] **H181** — 客气 / 别客气 finally has a situation to live in; use it.
  *别客气 is 许管家's closing line and is handed over as a new word. 客气 is inside 周礼宾's last
  ask — 您太客气了，这是我们的工作 — because only a word in an *ask* is graded.*
- [x] **H182** — Bake voices for every new hotel line; the `speech` harness must pass.
  *`node .dumplines.js && .venv-tts/bin/python .bake-voices.py`, twice: **259 clips made in all, 0
  failed, 917 in the manifest**. `.talkcheck.js` reports **0 unbaked lines for all eight hotel
  people**, including 高迎's returning-guest variant and all six of 许管家's. `.speechcheck.js` went
  from **81 failures to 27**, and none of the 27 is a hotel conversation line — they are barks other
  lanes added to their cast after the dump was taken, so a re-bake once the fleet settles clears
  them.*
  *Two people elsewhere in the game are still fully unbaked, and the diagnosis in `UPGRADES.md` T6
  — "ten unbaked 小林 clips, an audio bake gap" — is **wrong**. Both are one-line bugs in files lane
  4 does not own:*
  - *小林's ten clips **are baked**, under `收银员|小林|…`. There are two people called 小林
    (`data.js:1187` 空乘二 on the aeroplane, `data.js:1283` 收银员 in the shop) and `.talkcheck.js`
    resolves the script key with `NPCS.find(x => x.name === name || x.hz === name)`, which returns
    the cabin attendant first and then looks the shop cashier's clips up under `空乘二|小林|…`.
    `talk.js`'s own `keyFor()` was fixed for exactly this in the 小赵 case; the harness never was.*
  - *咖啡师 has 16 lines and **cannot be baked at all** as things stand. `.dumplines.js:72` opens
    with `if (!n.lines) continue;`, and the airport barista (`airport.js:118`) is a crowd row with
    no `lines` array — everything they say lives in a conversation tree. A person whose only speech
    is a tree is dropped by the dump before their tree is ever read. Moving that guard below the
    `Talk.linesOf` call two lines down fixes it, and then one bake finishes them.*
- [x] **H183** — Lobby and lift announcements are baked audio, not text-only.
  *Unblocked and done. The table lane 4 was looking for is `HotelCore.NOTICES` (`js/hotel.js:93`,
  exported at `:753`) — **not `Hotel.NOTICES`**, which would be floor 1's Lazy scene proxy and
  would build a 2,353-prop lobby to read a string table and then return `undefined`. This building
  is the one place where the module and the place are different objects.*
  *Lane 5 filled the 29 lift and floor keys from `HOTEL_FLOORS.hz`. Lane 4 wrote the eight lobby
  and paging lines beneath them (`js/hotel.js:103-120`) — 您 and 请 throughout, built from words
  the dictionary knows so the subtitle glosses. **All 37 strings are baked**: `pa|<text>`, the same
  single announcer voice as the platform and the shopping centre, reachable through
  `Speech.noticeClip(text)`. Verified by reading the manifest back: 37/37 present, 0 failed, 954
  clips in all.*
  *One caveat the next agent needs: `.dumplines.js` still has no clause for `HotelCore.NOTICES`, so
  these were appended to `.audio-bake/lines.json` by hand before baking. **The next unrelated bake
  will not know about them** — they survive only because `.bake-voices.py` merges the previous
  manifest with `setdefault`. The durable fix is one line in `.dumplines.js` beside the `mall` one:
  `const hotel = (typeof HotelCore !== 'undefined' && HotelCore.NOTICES ? Object.values(HotelCore.NOTICES) : []);`
  folded into the `notices` array. That file belongs to the harness lane.*
  *Not verified: nothing plays these yet. A caller in `hotel-lift.js` / `hotel-public.js` is still
  needed, and that is floor-module work rather than language work.*
- [x] **H184** — Signage Chinese is checked by a native-plausibility pass, not machine translation.
  *Read every bilingual sign pair in the eighteen hotel modules — 51 painted strings. The Chinese
  is sound: 明档 for a show kitchen, 松鹤延年 as a private-room name, 布草间, and invented houses
  (京华, 云端, 天际) with no real brand anywhere. Four are translated-sounding rather than wrong,
  all of them in files lane 4 does not own, listed here for whoever does:*
  - *`hotel-public.js` `抵达信息 / ARRIVALS` — airport language on a hotel lobby board. A hotel
    says 今日抵店 or 到店信息.*
  - *`hotel-service.js` `放松茶廊 / RELAXATION TEA` — 放松 as a modifier reads back-translated; a
    Chinese spa says 静休区 or 茶歇区.*
  - *`hotel-service.js` `毛巾站 / TOWELS` — "towel station" in Chinese dress. 毛巾领取处, or just 毛巾.*
  - *`hotel-public.js` `今日活动 / TODAY EVENTS` — the Chinese is exactly right; the English wants
    the apostrophe: TODAY'S EVENTS.*
- [x] **H185** — Bilingual signs where a real luxury hotel would have them; Chinese primary
  everywhere.
  *Holds. **The rule, since the first count of this was ambiguous and understated:** the population
  is a call to a sign or panel helper whose signature is `(…, zh, en, …)` — `hotel-f1.js:541`,
  `hotel-guests.js:60`, `hotel-f6.js:200` and the `zPanel` family. Counted over all 19 hotel modules
  that is **119** pairs of Chinese-then-ALL-CAPS literals, or **233** if mixed-case English counts
  as a sign; 5,795 Chinese string literals appear in those modules in all, most of them tags and
  prop names rather than anything painted. An earlier note in this file said 51: that was distinct
  pairs after `sort -u`, over four modules, and it understated the population — it did not change
  the verdict.*
  *Chinese-primary is verified structurally rather than by counting, which is the only way it can
  be: the helpers put `zh` at glyph size .17 and `en` at .066 beneath it, so primacy is a property
  of the helper and every caller inherits it. A first pass appeared to find 30 English-first pairs;
  all 30 are a regex artefact straddling the `en` and `tag` arguments of one call
  (`sign(…, '行李房', 'LUGGAGE', '行李房')`), not a sign anywhere. Back-of-house doors — 布草间,
  员工通道, 工程间 — carry English too, which is what a hotel of this class does. Nothing to change.*
- [x] **H186** — Every new sign string is crisp at walking distance and uses the glyph atlas safely.
  *Lane 4 added no sign strings — its output is dictionary rows and spoken dialogue — so this was
  run as an audit of the existing ones instead. Every hanzi on every hotel sign resolves in the
  atlas, but not always from its own module: `松鹤延年` at `hotel-public.js:924` needs 松, 鹤 and 延,
  and none of the three is in that file's own `Glyphs.need`. It renders today only because
  `hotel-f12.js` happens to register them and every hotel module loads eagerly. Not a bug now; one
  latent coupling, and the fix is three characters added to `hotel-public.js:13`. Crispness at
  walking distance was **not** checked — that needs rendered shots and belongs with the camera
  review in section C.*

---

## I · Cast, departments and hotel life
*Owner: `js/hotel-guests.js`, `js/cast-catalog.js`, `js/street-hotel.js`, `js/figure.js` (rigs).*

- [x] **H187** — Count the roster honestly: 15 guest entries in `hotel-guests.js`, 3 in
  `street-hotel.js`, 5 distinct `hotel-` rigs. Thirteen floors is thin on that.
  Counted live, not from source: `CastCatalog.hotelRoster()` reports **63 rows — 44 staff, 19
  guests** across all thirteen floors, and `gaps.floors` is empty (nobody is alone on a floor all
  day). The brief's figures were an undercount; the roster is thin in a different place. The real
  ceiling is **rigs, not rows**: hotel12 owns one rig of its own and tops up from an 8-deep pool,
  so nine concurrent people at dinner cannot all have distinct faces. Fixing that needs
  `js/assets.js` + new .glb, which this lane does not own.
- [x] **H188** — One named, recurring character per department (nine total) with a face, a name, a
  temper and a routine.
  `hotelRoster().gaps.departments` is now **empty** — all nine departments have at least one named
  character. Five were already there and had a name and a temper but a single all-day spot, which
  is a mannequin with a job title; they now have real days. 马建国 works a night desk, a morning
  round of the plant bank and an afternoon at the status board; 沈雅 moves from reception to the
  tea table at 14:00; 孙伟 works 18:00-06:00 across two positions and hands over to **柏松**, a new
  named day officer, at six. Floor 12 gained four named F&B characters (石岩 the bartender, 邹平 in
  the pantry, 闵佳 on the host stand, 常悦 in the dining room) and 祁川, engineering's roof
  technician — the first time HOTEL_DEPARTMENTS' claim that engineering covers B1 *and* 12 has
  been true.
- [ ] **H189** — Reception staff on a shift pattern: the night person is not the day person.
- [ ] **H190** — Housekeeping cart moves along a floor and its owner works rooms in order.
- [ ] **H191** — Bell staff move luggage between the forecourt, the store and the lifts.
- [ ] **H192** — Kitchen and service staff use the service lift and the back-of-house corridors, and
  never cross a wall.
- [ ] **H193** — Assert the staff routes are walkable — flood-fill, do not place a route by eye. The
  project has been burned by eye-placed geometry before.
- [ ] **H194** — Guests in corridors: doors opening, someone waiting for a lift, a trolley outside a
  room.
- [ ] **H195** — Restaurant floors have occupied tables with eating, pouring and service gestures.
- [ ] **H196** — Ballroom has a staged banquet with people in it, readable from the pre-function hall.
- [ ] **H197** — Spa and pool have plausible occupancy that respects the opening hours from H143.
- [ ] **H198** — Executive lounge has a small, club-like population, not a crowd.
- [x] **H199** — Rooftop restaurant is busier at night and closed in bad weather (reads `disrupt.js`).
  Busier at night by hour windows: the floor is empty before 10:30 and has nine people on it at
  19:00. Closed in bad weather by `hotel-f12.js:866-895` — the terrace rows carry a
  `hotel12-deck-` id and their `hours` are blanked when `Disrupt.today(day).sev >= 0.60`, which is
  storm (.68), snow (.76) and fog (.92) but not wind (.42) or rain (.24). The 露台门 card changes
  its sentence to say so. Measured: `A.state.terrace.open` is true on the calendar's wind day and
  false under `Weather.force('fog')`.
- [ ] **H200** — Guest actions on guest floors: sleeping, waking, reading, eating, watching
  television — `HOTEL.md:79-80` asks for these by name.
- [x] **H201** — B1 has staff at the canteen and lockers at plausible hours.
  The day 员工 eats at 06:00-09:00 and 11:30-14:00 and is on the changing bench 18:00-22:00; a new
  夜班员工 eats at 23:00-02:00 and changes out at 05:30-06:30, which is the only hour the locker
  room had anybody in it. All four spots verified against a real seat by the prop scan game.js
  uses (员工餐椅 at 0.53, 更衣长凳 at 0.57).
- [ ] **H202** — Every hotel figure passes the `figure` harness front and back.
- [ ] **H203** — Uniforms are department-distinct and read correctly at walking distance.
- [ ] **H204** — Per-figure draw budget respected on crowded floors — the known wardrobe trap.
- [x] **H205** — Nobody is sitting on a non-seat, and no seat has two occupants (`sit` harness rule).
  `.hotelcheck.js`: *every seated hotel figure is on a real seat* and *no hotel seat has two
  occupants* both pass, hotel-wide, in the 714/717 run. Independently on this lane's three floors:
  15/15 seated spots resolve to a real prop top and 0 pairs fall inside the 0.44 m
  `claimNPCSeat` radius during overlapping hours.
- [ ] **H206** — Chair orientation is correct throughout — there is already a
  `.hotel-chair-orientation-audit.png` at repo root, so this has been a problem here.
- [ ] **H207** — Cast density scales down with quality level.
- [x] **H208** — A `HotelCast` roster export exists with department and floor metadata, so future
  shifts attach without remodeling (`HOTEL.md:97`).
  `CastCatalog.hotelRoster()` returns `{count, staff, guests, byDepartment, byFloor, unresolved,
  gaps}`. An explicit `dept` on the row wins; otherwise the department is inferred from the Chinese
  title, most specific first, so 水疗接待员 is spa and not front office. `dept` is now written on
  all 13 staff rows in `js/hotel-service.js` and all 6 in `js/hotel-f12.js`. Seven rows still
  resolve to nothing (食客, 家庭住客, 小住客, 长住客人, 长住住客, 书法导师, 会所住客) — all in
  files this lane does not own.
- [ ] **H209** — Named staff remember the player across visits (see H138).
- [ ] **H210** — No character is a silent mannequin: everyone reachable has at least one line.

---

## J · Per-floor fit-out
*Owner: one agent per floor file. These do not touch each other.*

**B1 — `js/hotel-fB1.js`**
- [x] **H211** — Laundry drums and conveyors actually move, on a scene-local tick.
- [x] **H212** — Loading dock has deliveries arriving on a schedule, not parked forever.
- [x] **H213** — Staff lockers, canteen and the housekeeping store look used, not stored.
- [x] **H214** — Engineering and security have working indicators (a board, a monitor wall).
- [x] **H215** — Back-of-house is cared for and operational, not grey space (`HOTEL.md:99`).

**1 — `js/hotel-f1.js`, `js/hotel-public.js`**
- [ ] **H216** — Lobby composition has real foreground/midground/background; check from the entry.
- [ ] **H217** — Reception, concierge and bell desk each have a reason to walk to them.
- [ ] **H218** — Tea lounge is occupiable and serves at plausible hours.
- [ ] **H219** — Grand stair connects to floor 2 as a walkable route.
- [ ] **H220** — Water feature and planting have subtle motion; tea steam rises.
- [ ] **H221** — Arrival board / clocks show real in-game time.
- [ ] **H222** — Monumental ink artwork is a real focal moment, not wall texture.

**2 — `js/hotel-f2.js`**
- [x] **H223** — Show kitchen has flame, steam and extractor motion.
- [x] **H224** — Chinese restaurant has lazy Susans that turn on occupied tables.
- [x] **H225** — Private dining rooms are enterable and distinct from one another.
- [x] **H226** — All-day dining and the Chinese restaurant do not share a palette.
- [x] **H227** — Back kitchen connects to the service lift.

**3 — `js/hotel-f3.js`**
- [x] **H228** — Ballroom has an operable-partition state that visibly changes the room.
- [x] **H229** — Chandeliers shimmer; event lighting is programmable and used.
- [x] **H230** — Wedding salon and meeting rooms are distinct programmes, not one room twice.
- [ ] **H231** — Pre-function gallery frames the ballroom — the sightline is the whole point.
- [x] **H232** — Business centre is usable.

**4 — `js/hotel-f4.js`**
- [x] **H233** — Pool water has motion and caustics that survive a close view.
- [x] **H234** — Pool-edge reflection is either right or deliberately suggested — never expensive
  and broken (`HOTEL.md:109`).
- [ ] **H235** — Gym equipment is usable and someone is using it.
- [x] **H236** — Treatment rooms are enterable and quiet — a different lighting identity from the pool.
- [x] **H237** — Changing rooms connect properly and are not a dead end.

**5 — `js/hotel-f5.js`**
- [ ] **H238** — Two complete guestrooms plus the accessible room, each genuinely different.
- [ ] **H239** — The accessible room is correct, not a standard room with a label.
- [~] **H240** — Corridor has a runner, framed prints and door numbering that matches the booking system.
  Runner was already there. Five real hung paintings with titles replace the blank silk bays
  (`hotel-guests.js` fit5), rendered in `HT5-overview`. Room directory board covering 501–512 added
  at `hotel-f5.js:495` — **not rendered**, no `HT5-` camera looks at the landing's west wall.
  Assumes `stay.js` keeps `roomNo = level*100 + i + 1` and `standard.rooms = 12`.
- [ ] **H241** — Housekeeping pantry is stocked and reachable from the service lift.

**6 — `js/hotel-f6.js`**
- [ ] **H242** — Connecting rooms actually connect, with a door that opens.
- [ ] **H243** — Children's reading/play gallery is used by figures at plausible hours.
- [ ] **H244** — Guest pantry works as an interaction, not decoration.

**7 — `js/hotel-f7.js`**
- [ ] **H245** — Serviced residences have kitchens that differ from the guestroom pattern.
- [ ] **H246** — Co-working area is usable and populated during the day only.
- [ ] **H247** — Self-service laundry works and takes time.
- [ ] **H248** — Breakfast kitchen has an opening window.

**8 — `js/hotel-f8.js`**
- [ ] **H249** — Corner room's view is worth the corner; check the window camera.
- [ ] **H250** — Window seating is sittable.
- [x] **H251** — Material step-up from floor 5 is visible side by side, not just described.
  Floors 5, 6 and 8 all carried the identical blank-panel motif (silk field, one raked bronze rod,
  one lacquer dot). Now three registers: 5F plain panelling + hung ink paintings, 6F folk paper-cut
  and family photographs, 8F backlit silk behind a cast bronze fret. Verified by rendering
  `HT5-overview`, `HT6-family-arrival` and `HT8-overview` in one pass and comparing them.

**9 — `js/hotel-f9.js`**
- [ ] **H252** — Junior suite reads as a sequence of spaces, not one big room.
- [ ] **H253** — Cultural club / calligraphy space has a reason to visit and something to do.
- [ ] **H254** — Dressing area, pantry and bath portals frame real spaces.

**10 — `js/hotel-f10.js`**
- [ ] **H255** — Executive lounge is club-like: walnut, brass, skyline glazing.
- [ ] **H256** — Breakfast service runs in a window and is visibly cleared afterwards.
- [ ] **H257** — Library/business tables are usable.
- [ ] **H258** — Access gate (H146) is felt at the door, not only in code.

**11 — `js/hotel-f11.js`**
- [ ] **H259** — Full suite sequence: living, dining, bedroom, bath, each with its own light.
- [ ] **H260** — Stone bath survives a close view.
- [ ] **H261** — Curated art differs from the lobby's register.
- [~] **H262** — Butler service lane works.
  `备餐间` (the butler pantry, the floor end of the lane) had a `thing` and no action, so its card
  was blank; `.hotelcheck.js` called it a dead interaction label. `hotel-f11.js` now registers
  备餐间 / 云锦茶室 / 衣帽间 / 主浴 / 电梯前厅 at load time. The lane's *motion* — a butler who
  walks a tray from the pantry to a suite — is not built.

**12 — `js/hotel-f12.js`**
- [x] **H263** — Rooftop dining and sky lounge are distinguishable rooms.
  Flood-filled at r=0.30: 云端中餐厅 131.1 m2, 天际酒廊 175.9 m2, 观景露台 218.6 m2, 备餐间 42.8, two
  包间 20.3/18.3, 西廊 120.1, lift landing 53.3 — all reachable, 0 stranded cells. Read off
  `.audit-HT12-chinese-dining` / `-sky-lounge` / `-terrace`: different palette, different ceiling,
  different focal object in each. The partitions were already in this file when lane 8 arrived;
  what this lane added is the verification and the people in them.
- [x] **H264** — Terrace is walkable and the city panorama holds up.
  218.6 m2 of deck, every cell reachable from the lift landing. Panorama checked at 19:00 and
  21:00 (`.audit-HT12-terrace`, `-skyline-night`): night soffit, stars, tower silhouettes and lit
  windows above a continuous parapet, no band of lit shell ceiling anywhere.
- [x] **H265** — Lantern sway is linked to weather, from `disrupt.js`.
  `hotel-f12.js:852-895` now asks `Disrupt.today(Weather.now.day).sev` and no longer rolls
  anything of its own; `Weather.now.wind` stays only as the within-day envelope. Measured through
  `A.state.terrace`: sev 0.42 on the calendar's own wind day, 0.92 under `Weather.force('fog')`.
- [x] **H266** — Planting is wind-aware.
  The 风雨花园 blades are on the same `swayers` list as the lanterns, so they lean on the same
  disrupt-derived gain, a beat behind. NOT SEPARATELY RENDERED: the `HT12-weather-garden` camera
  sits at z 11.4 looking north and the planters are at z 2.45, so that shot never contains them —
  reported rather than ticked on a screenshot that does not show the thing.
- [x] **H267** — Distant traffic is visible and moving.
  Visible in `.audit-HT12-skyline-night` as warm and red dashes along the band above the parapet.
  NOT THIS LANE'S CODE: it is built in `js/hotel-guests.js:1622-1629` (14 lights on a scene tick),
  which lane 8 does not own. One frame proves visible; the motion is read off the source.
- [x] **H268** — Bronze pavilion frame reads as structure, not a decal.
  Eight `cyl` posts (not capsules), dougong-derived brackets, two 15.2 m cross beams, four 7 m
  purlins and 13 rafters — visible as depth in `.audit-HT12-terrace` and `-skyline-night`. Already
  in the file before lane 8; verified, not authored, here.

**All floors**
- [ ] **H269** — No two authored floors share a plan, palette and focal moment
  (`HOTEL.md:50-51`) — check them side by side, not one at a time.
- [ ] **H270** — Something is worth seeing through every important doorway on every floor.

---

## K · Graphics and material bar
*Owner: `js/hotel*.js` fit-out, measured against `ART.md`.*

- [ ] **H271** — Stone, wood, metal, textile, glass and water do not share a roughness response.
- [ ] **H272** — Limestone reads as limestone at arm's length in the lobby.
- [ ] **H273** — Dark walnut reads as timber, not brown plastic.
- [ ] **H274** — Aged bronze has a distinct specular from polished brass.
- [ ] **H275** — Lacquer red is restrained and appears where lacquer would be.
- [ ] **H276** — Celadon and silk are present on the floors that claim them.
- [ ] **H277** — Carpet reads as carpet in corridors and the ballroom.
  Open, with two dead ends closed off (2026-08-08). Carpets carry the shared `cloth` recipe
  (`fabric`, matScale .52, matAmt .26, nrmAmt .46) and it reads correctly on *vertical* textile —
  canteen booth backs, the ballroom silk bays, the floor-2 panel. It does **not** read on a floor
  carpet at overview distance.
  - **matScale is not the fault.** A dedicated 1.60 m `rug` tuple was tried on all 12 carpet
    `flat()`s and rendered in `HT1-tea-water` and `HT3-prefunction`: no visible change at either
    camera. Reverted, because a second batch key (`build.js:329-331`) for no gain is pure cost.
  - **matAmt is the wrong lever.** A mid-dark carpet (`#654947`) at matAmt .26 has too little
    contrast to show at that distance, and `ART.md` is explicit that raising matAmt to force a
    texture visible produces a muddy surface and a brighter room, not detail.
  - Untried, recorded as a note only, not a recommendation acted on: a lighter carpet value to give
    the map headroom to sit in, or an authored pattern (border, motif, tonal blocking) rather than
    a noise texture — the pre-function gallery's own ginkgo scroll motif already reads at exactly
    the distance the material does not.
- [ ] **H278** — Glass is glass: the vestibule, the ballroom partitions, the rooftop glazing.
- [ ] **H279** — No surface in the hotel is an untextured flat colour at close range.
- [ ] **H280** — The hotel avoids anonymous international-hotel beige.
- [ ] **H281** — The hotel avoids theme-park pastiche; Chinese character comes from proportion,
  craft and ritual, not red-and-gold everywhere (`HOTEL.md:9-13`).
- [ ] **H282** — Ginkgo and lattice geometry appear as a motif across floors, at different scales.
- [ ] **H283** — Ink-wash artwork is used deliberately and is not the same image repeated.
- [ ] **H284** — Lighting identity per floor matches the `HOTEL_FLOORS` accent, and reads at night.
- [ ] **H285** — Night lighting exists on every floor, not just the exterior and lobby.
- [ ] **H286** — Repeated bays and rooms use helpers with seeded variation, never copy-paste.
- [ ] **H287** — Mirrors are dark reflective glazing unless a verified render path exists.
- [ ] **H288** — Contact shadows and floor glows are used consistently with the rest of the game.
- [ ] **H289** — Facade bay variation survives being looked at from the street.
- [ ] **H290** — Signage typography is consistent across all thirteen floors.
- [ ] **H291** — Before/after renders for any material change, from the same `HT-` camera.
- [ ] **H292** — A side-by-side sheet of all thirteen floors, to catch the sameness H269 is about.

---

## L · Performance and assets
*Owner: `js/assets.js`, `js/lazy.js`, `index.html`, `js/perf.js`.*

- [ ] **H293** — Measure drawn-prop count per hotel floor and record it. There is no baseline today.
- [ ] **H294** — Measure frame cost per floor at all four quality levels (mirror the `perf` harness).
  **hotel10 — what has been disproved, so nobody re-derives it.** One quiet sweep (2026-08-08,
  Chrome count verified 1) had hotel10 alone missing 60 Hz at p95 16.3 / 17.9 / 20.5 ms, median
  7–8, with `gpuP95 15.72` under budget against `cpuP95 18.3` — i.e. CPU. A second lane could not
  reproduce that split and read hotel10 at cpuMed 4.6 / cpuP95 6.9 against hotel11's 3.8 / 5.5,
  with GPU the larger term in both — **but its machine was not quiet** (load average 45.7, `bird`
  at 98.7% CPU, and the `hotelLift` control reading 10.8 then 28.1 ms against its quiet 5.0), so
  that run is void by the control. **Both readings are unsettled; a third clean one is needed.**
  Dead ends, do not spend on them again: per-frame `.color`/`.glow` mutation is not unique to
  hotel10 (`hotel-fB1.js` does it at 7 sites and passes); and the `A.onTick` count is **per floor
  file, not per composed scene** — hotel10's scene also takes 8 callbacks from `fit10` in
  `hotel-guests.js`, while hotel5 composes more and passes. The one contention-independent outlier
  found so far is **`instances` per frame: hotel10 2280 against hotel11 1014**, at 2590/2550 props
  and 78/72 calls — 2.25× the geometry submitted per frame on an open-plan floor with 14 camera
  rooms against hotel11's 23. That points at **occlusion, not allocation**.
- [ ] **H295** — Trust comparisons, not absolute milliseconds, on the software rasteriser — the
  project has already been wrong about this once and no optimisation should be done on those
  numbers alone.
- [ ] **H296** — Confirm the hotel still boots and navigates on the software-rendered test setup.
- [ ] **H297** — All thirteen hotel modules load eagerly from `index.html:1739-1745`. Measure what
  that costs at boot; `js/lazy.js` exists and no hotel module uses it.
- [ ] **H298** — Move per-floor construction behind lazy floor building if the boot cost justifies it.
- [ ] **H299** — Any new art asset must be accounted for against the eager preload contract in
  `js/assets.js` before being added — this is a standing project rule.
- [ ] **H300** — CC0/public-domain art assets only; staged, not written over live assets.
- [ ] **H301** — Scene-local ticks everywhere; no hotel motion runs while the player is on the street.
- [ ] **H302** — Distance and floor gates on all motion (`HOTEL.md:84-85`). **Measured 2026-08-08:
  floor gate passes; the distance gate is on only 8 of 46 tick bodies. 38 run unconditionally.**
- [ ] **H303** — Conservative cull bounds on every animated prop.
- [ ] **H304** — Cast density and prop detail respond to quality level. **Measured 2026-08-08: 1 of
  18 modules reads `Perf.q` or an LOD level, against 1,224 repeated-prop loops. Detail does still
  respond globally through `minPx` 1.4→18.0 across the ladder (`js/perf.js:24`), so this is a
  missing per-module gate, not a dead ladder.**
- [ ] **H305** — No hotel tick allocates per frame. **Measured 2026-08-08: 120 `M.mul`/`M.trans`/
  `M.rotY` call sites sit inside tick bodies, many in loops, each allocating a `new Float32Array(16)`
  (`js/math.js:7,17,19`). Worst case `js/hotel-public.js:1086` — per lazy susan, per dish, per flame,
  per steam puff, per fan, every frame. `M.mul(a,b,out)` already takes an out-param, so the fix is a
  hoisted scratch matrix, not a new abstraction. Plus 8 constant object literals rebuilt per frame,
  e.g. `js/hotel-f2.js:692`.**
- [ ] **H306** — **Measured 2026-08-08: 32 helper names are declared in 3+ modules, ~54 KB upper
  bound. `chair(A,c,x,z,yaw,…)` exists five times — `hotel-f7.js:282`, `hotel-f9.js:208`,
  `hotel-guests.js:200`, `hotel-service.js:135`, `hotel-public.js:95`.** Check for duplicated
  geometry helpers across the thirteen floor modules; a shared
  helper is cheaper than thirteen copies.
- [ ] **H307** — Delete dead code left behind by the floor build-out. **Measured 2026-08-08:
  genuinely dead are `hotel-f4.js:212-213` (`jade`, `teal`), `hotel-f8.js:177` (`TAU`) and
  `hotel-service.js:85` (`xSign()`). The nine `Hotel*Fit` handles are NOT dead — three were merely
  unverified in `index.html`'s NEEDS list and have been added.**
- [ ] **H308** — Delete the ~70 stale hotel PNGs at repo root (see H056) — they are ~60 MB.
- [ ] **H309** — Mobile render of the lobby, one guest floor and the rooftop.
- [ ] **H310** — Desktop and mobile representative renders recorded as the acceptance evidence
  `HOTEL.md:126` asks for.

---

## M · Save, restore and data integrity
*Owner: `js/game.js` save block (~10231–10440), `js/stay.js`.*

- [x] **H311** — Saved hotel floor restores to that floor, not to the lobby.
- [x] **H312** — Saved lift state restores without stranding the player in transit.
- [x] **H313** — Saved booking, key card and bill survive a reload.
- [x] **H314** — Saved room-problem state survives a reload.
- [x] **H315** — Saved guest and staff positions do not need to survive; confirm they re-seed
  deterministically instead.
- [x] **H316** — A save from before the hotel stay system existed still loads.
- [x] **H317** — A corrupt hotel block does not stop the game booting.
- [~] **H318** — The `save` harness gains hotel cases.
  *Partial, and deliberately: `.savecheck.js` is not a lane 1 file. The hotel save cases live in
  `.hotelcheck.js` instead — mid-ride save early and late, and a pre-lift legacy save — which is
  the same coverage in a file this lane owns. Checked while there: `.savecheck.js` does NOT have
  the `beforeunload` hole lane 2 hit; its `tamper()` navigates first and rewrites the slot from
  inside the freshly loaded page, so the save-on-unload cannot overwrite the tampering.*
- [x] **H319** — Every new persistent field is in the `bjlife.save.v1` schema *and* the loader guard
  — the standing rule for new state.
- [x] **H320** — No hotel state is written outside the save (no stray localStorage keys).
- [x] **H321** — Day rollover while in the hotel is handled by the same code as everywhere else.
- [x] **H322** — Time spent in the lift counts against the clock.
- [x] **H323** — Money changes in the hotel appear in whatever ledger the rest of the game uses.
- [x] **H324** — A new game starts with no hotel state and no phantom booking.

---

## N · UI, onboarding and accessibility
*Owner: `js/game.js` UI, `js/data.js`.*

- [x] **H325** — The floor panel is readable and operable on a phone viewport.
- [x] **H326** — The floor panel says what is on each floor, using `HOTEL_FLOORS.short`.
- [x] **H327** — Every interaction label states what will happen and how long it takes.
- [ ] **H328** — No interaction label is dead — this is an acceptance requirement, not a nicety.
- [x] **H329** — The bill is legible at mobile sizes.
- [x] **H330** — Booking UI does not require reading English.
- [x] **H331** — Pinyin support follows the same rules as the rest of the game.
- [x] **H332** — Colour is never the only carrier of state on the lift panel or the floor list.
- [x] **H333** — Contrast on signage and UI meets the project's existing bar.
- [x] **H334** — Keyboard navigation reaches every hotel interaction.
- [ ] **H335** — The hotel is discoverable: a first-time player should learn it exists without a
  wiki. A street sign and a travel-list row are the minimum.
- [ ] **H336** — A first stay teaches the loop by doing it, not by a panel of text.
- [x] **H337** — Toasts during a lift ride do not stack or overlap.
- [x] **H338** — Error states (no money, no key, closed outlet) all say something in Chinese first.
- [x] **H339** — The notebook shows hotel vocabulary grouped usefully.
- [x] **H340** — Nothing in the hotel produces a "wrong answer" screen. Ever. Misunderstanding is a
  story, not a failure.

---

## Dispatch lanes (no two lanes touch the same file)

| Lane | Items | Files owned |
| --- | --- | --- |
| **1 · Harness** | H013–H032, H159, H318 | `.verify.js`, `.places.js`, `.thingcheck.js`, `.hotelcheck.js`, orphan `.hotel*` harnesses |
| **2 · Stay system** | H095–H130, H311–H324 | new `js/stay.js`, save block in `js/game.js` |
| **3 · Systemic wiring** | H131–H160 | `js/disrupt.js`, `js/story.js`, `js/career.js`, `js/data.js` |
| **4 · Language** | H161–H186 | `js/vocab.js`, `js/talk.js`, speech bake |
| **5 · Exterior + core** | H057–H094 | `js/street-hotel.js`, `js/hotel.js`, `js/hotel-lift.js` |
| **6 · Public floors** | H216–H237, H211–H215 | `hotel-fB1/f1/f2/f3/f4.js`, `hotel-public.js` |
| **7 · Guest floors** | H238–H262 | `hotel-f5/f6/f7/f8/f9/f10/f11.js`, `hotel-guests.js` |
| **8 · Rooftop + cast** | H263–H270, H187–H210 | `hotel-f12.js`, `hotel-service.js`, `cast-catalog.js` |
| **9 · Cameras + art** | H033–H056, H271–H292 | camera registry, render passes |
| **10 · Perf + docs** | H293–H310, H001–H012, H325–H340 | `assets.js`, `lazy.js`, `index.html`, `HOTEL.md` |

**Order that matters:** lane 1 first (nothing else is provable without it), then lane 2 (lane 3 has
nothing to wire without it). Lanes 5–9 are independent and can run in parallel from the start.
