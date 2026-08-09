# 京华大酒店 · Jinghua Grand Hotel

> **Building a floor?** Read `HOTEL-TENANT.md`, not another `js/hotel-f*.js`. It carries the whole
> per-floor contract — shell frame, builder order, api, palette, partition ownership, the reserved
> collider footprints and the lift/landing contract — in one page instead of a 15–55 KB module.
>
> **Numbered work list:** `HOTEL-TODO.md` (H001–H340), with dispatch lanes at the bottom.
>
> Sections marked **as implemented** were read off the code on 2026-08-08 and describe what exists.
> Everything else is a promise still being built against.

## Promise

The hotel is Beijing Life's dominant civic landmark and a complete playable building, not a
skyline prop. It must read from the hutong, command the Business District on approach, reward a
slow walk through every public room, and remain structured for a later hotel-work chapter.

The visual register is contemporary Chinese luxury: warm limestone, dark walnut, restrained
lacquer red, aged bronze, celadon, silk, ink-wash art, ginkgo and lattice geometry. It must avoid
both anonymous international-hotel beige and theme-park pastiche. Chinese character comes through
proportion, craft, material, art and hospitality rituals rather than covering every surface in red
and gold.

## Site and exterior

- Name: `京华大酒店` / `JINGHUA GRAND HOTEL`.
- Site: a new hotel forecourt continuing the far Business District pavement north of the
  hypermarket. The entrance faces west toward a landscaped arrival court; the tower rises behind
  a broad podium and remains legible from the hutong skyline.
- Street return contract: `HOTEL_OUT`, on clear paving in front of the revolving/sliding entrance.
- The exterior needs a real porte-cochère, taxi/drop-off lane, bell stand, planters, stone lions or
  abstract guardian forms, transparent arrival vestibule, lobby depth, vertical bilingual sign,
  occupied window variation, roof lantern/crown and aircraft-warning lights.
- Automatic doors must reveal a modeled vestibule and lobby. Interior entrance doors must reveal a
  modeled forecourt, drop-off lane and opposite streetscape. No opening may expose a shell wall,
  clear colour or a shallow light card.
- The base, podium, tower and crown need separate silhouettes. At least three step-backs prevent it
  reading as one extruded slab. The crown should reinterpret dougong/bracket and pavilion rhythm in
  a modern steel/bronze assembly, not place a fake temple roof on a tower.

## Playable vertical programme — as implemented

The tower may advertise more storeys in its facade. **Thirteen levels are authored and built**, plus
the lift car as a fourteenth scene: `HOTEL_FLOORS` (`js/hotel.js:24-77`) is the single source of
truth, and `js/game.js:57-60` registers all fourteen scene keys. There is no unbuilt level. Floor 4
is a real, authored floor — there is no superstition workaround anywhere in the code.

`Programme` below is each floor's own `programme` field. `Built rooms` is that floor's
`cameraRoom(...)` registrations — every one in the hotel comes from a `js/hotel-f*.js` module; the
three fit-out modules register none. It is a **proxy** for the authored plan, not a render: it proves
a room was named and enclosed, not that it looks finished. `Accent` is the floor's identity colour
from `HOTEL_FLOORS.accent`; it already drives the lift landing's colour rail and the floor
directory's highlight.

| Key | Display | Programme (`programme` / `short`) | Built rooms | Accent |
| --- | --- | --- | --- | --- |
| `hotelB1` | B1 | 后勤 · 洗衣 · 员工区 · 工程与保安 — 后勤服务层 | dock, goods yard, laundry, linen/housekeeping store + bay, staff hall, canteen, lockers/changing, engineering, security, BOH corridor, lift landing | `#5f817b` |
| `hotel` | 1 | 大堂 · 前台 · 礼宾 · 茶廊 — 大堂 | lobby, vestibule, reception, concierge, luggage, tea lounge, water court, gallery, grand stair, lift hall, service hall, BOH | `#9a3028` |
| `hotel2` | 2 | 中餐厅 · 全日餐厅 · 私宴 · 明档厨房 — 餐饮 | Chinese restaurant, all-day dining, tea lounge, three private rooms, show kitchen + show bay, back kitchen, kitchen pass, host gallery, service hall, lift landing | `#5c806f` |
| `hotel3` | 3 | 宴会厅 · 婚礼沙龙 · 会议 · 商务中心 — 宴会会议 | ballroom, second hall, pre-function gallery, wedding salon, four meeting rooms + meeting lobby, business centre, art bay, store, directory niche, lift lobby | `#8c573f` |
| `hotel4` | 4 | 水疗 · 泳池 · 健身 · 更衣 — 康体水疗 | pool, spa reception, arrival, three treatment rooms + couple room, sauna, steam, wet area, men's/women's changing, relaxation lounge, gym, court, linen, service, corridor | `#3f7880` |
| `hotel5` | 5 | 标准客房 · 无障碍客房 · 客房部工作间 — 客房 | rooms 501/502 (standard), 503 (accessible) with bath + vestibule, guest corridor, stair lobby, linen pantry, service hall, lift landing | `#7d6854` |
| `hotel6` | 6 | 家庭客房 · 连通房 · 儿童阅读游戏廊 · 客用茶水间 — 家庭客房 | rooms 601/602 + connecting suite 606, three baths, family lounge/reading gallery, guest pantry, housekeeping, linen store, equipment store, engineering, service corridor, stair lobby, lift landing | `#9a6658` |
| `hotel7` | 7 | 酒店式公寓 · 共享办公 · 早餐厨房 · 自助洗衣 · 静心阅读 — 长住公寓 | residences 701/702/703 (703 with bedroom + bath), co-working, breakfast kitchen, self-service laundry, quiet reading room, residence corridor, linen, service lobby, lift landing | `#57786d` |
| `hotel8` | 8 | 豪华客房 · 转角景观房 — 豪华客房 | six deluxe rooms 801/802/803/805/807 and corner 808, each with its own bath, guest corridor, west lobby, east and north galleries, linen, service, lift landing | `#76624c` |
| `hotel9` | 9 | 精选套房 · 茶艺沙龙 · 棋牌室 · 书法雅集 · 服务茶水间 — 文化会所 | junior suite (living, bedroom, dressing, bath), tea salon, games room, calligraphy room, club gallery, service pantry, lift landing | `#85683e` |
| `hotel10` | 10 | 行政酒廊 · 早餐 · 图书室 · 商务桌 — 行政楼层 | executive lounge, breakfast service, library, reading room, business alcove, boardroom, club gallery, club and service pantries, service hall, lift landing | `#785a36` |
| `hotel11` | 11 | 套房 · 起居 · 餐厅 · 石材浴室 — 京华套房 | signature suite (foyer, living, dining, bedroom, master bath, stone bath, dressing, study, tea lounge, pantry) **and** a second suite 1102 (entry, living, study, bedroom, bath), east/west galleries, west vestibule, linen, lift lobby | `#8f463c` |
| `hotel12` | 12 | 中餐厅 · 云端酒廊 · 露台 — 云端餐厅 | rooftop Chinese dining, sky lounge, two private dining rooms + private gallery, west gallery, terrace, pantry, lift landing | `#a66d32` |
| `hotelLift` | — | the passenger car itself, a scene you ride in | car, control panel, modeled destination landing | per-floor rail |

Do not make thirteen copies of one corridor. Shared shell helpers are encouraged, but each authored
level must have a distinct plan, palette, focal moment and reason to visit.

**Where this table was previously wrong:** it named ten levels and omitted `hotel6`, `hotel7` and
`hotel9`, all three of which are fully built (`js/hotel-f6.js`, `js/hotel-f7.js`, `js/hotel-f9.js`).
It also understated floors 2, 3, 4, 8, 11 and 12, each of which has more authored rooms than the old
promise described.

## Fixed constants — as implemented

These are measured, in the code, and must not be re-derived by eye. Full detail in
`HOTEL-TENANT.md`; this is the short list every agent needs.

| Constant | Value | Source |
| --- | --- | --- |
| `HOTEL_OUT` — street return point | `{x: 39.18, z: 28.40, yaw: -π/2}` | `js/hotel.js:8` |
| Interior arrival from the street | `{x: 0, z: -12.25, yaw: 0}` | `js/street-hotel.js:283`, and the floor-1 scene `spawn` |
| Plate | `RX 22, RZ 15, H 4.35` — 44 m × 30 m × 4.35 m | `HOTEL_CORE`, `js/hotel.js:104` |
| Walkable extent | `-21.70 … 21.70` × `-14.70 … 14.70` | `baseZone`, `js/hotel.js:688` |
| Lift bank | `x 18.15`, car centres `z -7.20 / -3.70 / -0.20`; **centre car is the authored one** | `HOTEL_CORE.lift` |
| Service lift | `x 18.15, z 5.10` | `HOTEL_CORE.lift.service` |
| Lift landing / ride arrival | landing `[16.15, -3.70]`; arrival `[15.55, -3.70]` facing -x | `HOTEL_CORE`, `js/game.js:10680` |
| Fire stair | `x -18.0, z -7.1`, landing `[-16.0, -7.1]`; arrival `[-15.65, -7.10]` facing +x | `HOTEL_CORE.stairs`, `js/game.js:9982` |
| Scene spawn (floors other than 1) | `{x: 15.6, z: -3.70, yaw: -π/2}` | `js/hotel.js:680` |

**One inconsistency worth knowing:** `HOTEL_CORE.entrance.inside` is `[0, -12.55]`, but both the
street door's `exit.at` and floor 1's own `spawn` put the player at `z -12.25`. The `-12.55` value is
not used for arrival. Do not "fix" one to match the other without checking who reads it.

## Departments — as implemented

`HOTEL_DEPARTMENTS` (`js/hotel.js:10-22`) is a frozen roster of nine, each with `key`, `hz`, `en` and
the floors it claims. It is exported to `game.js` and reachable from a harness; it exists so a future
workplace chapter has a written seam rather than a grep.

| Key | 中文 | Floors claimed |
| --- | --- | --- |
| `front-office` | 前厅部 | `hotel` |
| `concierge` | 礼宾部 | `hotel` |
| `housekeeping` | 客房部 | `hotelB1`, `hotel5`, `hotel6`, `hotel7`, `hotel8`, `hotel9`, `hotel11` |
| `food-beverage` | 餐饮部 | `hotel2`, `hotel9`, `hotel10`, `hotel12` |
| `banqueting` | 宴会部 | `hotel3` |
| `spa` | 水疗中心 | `hotel4` |
| `security` | 保安部 | `hotelB1`, `hotel` |
| `engineering` | 工程部 | `hotelB1`, `hotel12` |
| `laundry` | 洗衣房 | `hotelB1` |

Note the gaps: `hotel4` claims spa only and no housekeeping; `hotel3` claims banqueting only. If a
career task needs a department on a floor it does not currently claim, that is a change to
`js/hotel.js`, which means a request, not an edit.

The eleven stable fixture tags in `HOTEL_CORE.tags` are the other half of the seam and must keep
their names — a tag is interaction wiring, not a label: 前台, 礼宾部, 行李车, 客房, 布草间, 洗衣房,
宴会厅, 厨房, 客房服务, 工程部, 员工入口.

## Elevator contract — as implemented

What is built (`js/hotel-lift.js`, the shell's vertical core in `js/hotel.js:213-346`, and
`openHotelFloors` at `js/game.js:9961`):

- A limestone/bronze portal holds **three** passenger cars on every floor; the centre one is
  authored and rides, the outer two are sealed and make the bank read. One service lift sits apart at
  `z 5.10` with its own portal and landing treatment.
- The car is a real space: walnut panels in bronze frames, continuous handrails on brackets, a dark
  reflective rear panel (deliberately suggested, not a real-time reflection), cove lighting, a
  bilingual control panel with all thirteen stops, a floor display and up/down chevrons.
- Landing doors ease open on approach and closed on walk-away, on every landing. The centre car's
  landing barrier is a `solid` whose `open` flag follows the door state, so the leaves are never a
  collider themselves.
- Choosing a floor is a **ride, not a cut**: `HotelLift.begin(from,to)` runs
  `closing → moving → opening → arrive → idle`, the player is moved into the `hotelLift` scene, the
  floor display advances through the intervening storeys, and `game.js` re-places them on the
  destination landing when the controller fires `arrive`.
- **Ride duration is `1.35 + |level difference| × 0.58` seconds** (`rideSeconds`,
  `js/hotel-lift.js:18`). Game time advanced is separate: `max(1, ceil(|level difference| × 0.45))`
  minutes.
- Lift state is deterministic and inspectable. `HotelLift.state()` returns `currentKey`, `sourceKey`,
  `targetKey`, `current`, `target`, `phase`, `direction`, `openness`, `progress`, `elapsed`,
  `duration`, `display`, `diagnostic`. `HotelLift.diagnostic(phase, progress, from, to)` freezes any
  point of the ride, which is how `.audit.js` shoots `HT-LIFT-travel` and `HT-LIFT-arrive`.
- Save/restore cannot strand the player. `toSave()` writes only `{v:1, currentKey, phase:'landing'}`
  and `restore()` normalises anything — including a corrupt or mid-ride record — to an idle, open,
  solid-floor landing. `safeLanding()` resolves a live ride to a real floor (past the halfway point
  it resolves to the destination), and `game.js:10434` uses it when the saved place was `hotelLift`.
- The fire stair is the second route and is restricted to **adjacent authored stops**, tested on
  `order` (the contiguous authored stop index) rather than `level`, which is what makes B1↔1
  adjacent. Non-adjacent rows are greyed out in the picker *and* refused in `onPick`. Cost is
  `max(2, |level difference| × 2)` minutes and `max(1, |level difference| × 1.4)` rest.
- Camera framing in the car is `{pitch: .29, dist: 3.75, lookY: 1.20}` with a single 2.6 m × 2.7 m
  camera zone, and the car scene ships a modeled destination landing beyond the opening so the doors
  never open onto metal.

**Where the implementation differs from what was specified here before:**

- The floor panel and the floor directory list thirteen stops, not ten.
- The refusal wording is not one string. `js/game.js:12086` speaks
  `安全楼梯只通相邻开放层。` whenever the stair picker opens, and the actual refusal on a
  non-adjacent pick (`js/game.js:9980`) is `安全楼梯一次走到相邻开放层。` Both are reachable; they
  are different lines.
- Nothing gates the lift on a key card, a room grade or an opening hour. Every floor is reachable by
  anyone at any time. That is `HOTEL-TODO.md` H105/H146, not a defect in the lift.
- Arrival audio is `TrainAudio.liftCue('close' | 'move' | 'arrive' | 'ding')`. There is no spoken
  Chinese floor announcement yet (H083).

## Motion and life

- Arrival: automatic doors, taxis/drop-off cars, luggage trolley, bell staff and revolving-door or
  sliding-door movement.
- Lobby: subtle water, tea steam, chandelier variation, clock/arrival boards, luggage wheels and
  guest/reception gestures.
- Restaurants: kitchen flame/steam/extractor motion, rotating lazy Susan where appropriate, tea
  pour/eating/service gestures and occupied tables.
- Ballroom: chandelier shimmer, programmable event lighting, operable-partition state and a staged
  banquet/wedding setup that reads from the pre-function hall.
- Spa/pool: water motion/caustics, pool-edge reflections, towel/steam cues and fitness equipment.
- Guest floors: housekeeping cart, opening room doors, curtains, bedside lights, television and
  sleeping/waking/reading/eating guest actions.
- Service level: laundry drums, conveyors/carts, kitchen/service traffic and maintenance indicators.
- Rooftop: lantern sway linked to weather, restrained signage, plant movement and distant traffic.

All motion uses conservative cull bounds, scene-local ticks, distance/floor gates and deterministic
diagnostic state. Interaction timing and colliders remain authoritative.

## Future workplace readiness

Do not implement a full career chapter yet, but build the physical and data seams it will need:

- Departments: the nine in `HOTEL_DEPARTMENTS`. Built — see the departments table above for the
  roster and the floors each one claims.
- Staff routes connect staff entrance/lockers, service lift, pantries, kitchens, linen rooms,
  guestroom doors and public destinations without crossing walls.
- Key fixtures have stable tags/focus points (`前台`, `礼宾部`, `行李车`, `客房`, `布草间`, `洗衣房`,
  `宴会厅`, `厨房`, `客房服务`, `工程部`, `员工入口`).
- A `HotelCast` roster and exported department/floor metadata allow future shifts/tasks to attach
  without remodeling the building.
- Back-of-house looks cared for and operational, not like unfinished grey space hidden from guests.

## Graphics and performance bar

- Material hierarchy must survive close views: stone, wood, metal, textile, glass and water should
  not share the same roughness response.
- Major rooms need foreground/midground/background composition and controlled sightlines, including
  something worth seeing through every important doorway.
- Signs are bilingual where a real luxury hotel would be; Chinese remains primary. Typography is
  crisp at walking distance and uses the glyph atlas safely.
- Mirrors may be suggested with dark reflective glazing unless a verified render path exists; do
  not ship expensive broken reflections.
- Repeated rooms/facade bays use helpers and seeded variation. Scene-local motion and lazy floor
  construction keep the hotel from taxing unrelated places.
- The hotel should still boot and navigate on the project's software-rendered test setup.

**Truth-up:** floor *construction* is already lazy — every floor is a `Lazy(...)` and is not built
until the player stands in it. Floor *loading* is not: all eighteen hotel script files are eager in
`index.html:1739-1745`, and no hotel module uses `js/lazy.js`'s deferred download. Nobody has
measured what that costs at boot (`HOTEL-TODO.md` H297). There is also no recorded prop or draw-count
baseline for any hotel floor (H293, H020), so "does not tax unrelated places" is currently a design
intent rather than a measurement.

## Camera and acceptance contract

Persistent `.audit.js` cameras use `HT-` prefixes. **The registry is much larger than this document
used to claim:** 129 explicitly named `HT-` cameras, plus a `HT-<floor>-landing` / `HT-<floor>-overview`
pair generated for all thirteen floors from `HOTEL_AUDIT_FLOORS` (`.audit.js:121`, `:1611`). Coverage
as built:

- Exterior and threshold: `HT-EXT-wide`, `HT-EXT-arrival`, `HT-EXT-night`, `HT-DOOR-outside`,
  `HT1-vestibule-inward`, `HT1-vestibule-outward`.
- Lift: `HT-LIFT-call`, `HT-LIFT-car`, `HT-LIFT-panel13`, `HT-LIFT-travel`, `HT-LIFT-arrive`. The last
  three drive the controller through `HotelLift.diagnostic(...)` in their `pre:` hook.
- Every floor: a `HT-<floor>-landing` and `HT-<floor>-overview`, plus a named per-floor set —
  `HT1-*` (11 views), `HT2-*`, `HT3-*`, `HT5-*`, `HT6-*`, `HT7-*`, `HT8-*`, `HT9-*`, `HT10-*`,
  `HT11-*`, `HT12-*`, `HT-B1-*`, `HT4-*`, and the two service-route views `HT-SVC-B1-route` and
  `HT-SVC-4-route`.

So the old claim that "floors 4 through 12 have no named persistent camera" is false — that was true
of an earlier state of `.audit.js` and is repeated in `HOTEL-TODO.md`'s framing note for section C.
What is genuinely open is the *review*: nobody has looked at all of them in one pass, there is no
`.hotel-cameras.md` index recording what each proves and when it was last checked (`HOTEL-TODO.md`
H055), and there is no mobile or night variant for most floors (H053, H054).

**Do not edit `.audit.js`.** It is shared. Needing a new named view is a request, not an edit.

## How to verify the hotel — as implemented

| What | Command | State |
| --- | --- | --- |
| Syntax | `node --check js/hotel-f<n>.js` after **every** edit | always available |
| Boot | `node .bootcheck.js` — wants `bootOverlay:false, fails:[], errors:[]` | always available |
| Render | `AUDIT_PORT=<unique> node .audit.js <HT-shot names>`, then **open the PNGs** | 129+ `HT-` cameras |
| Colour + doors | `node .places.js` — all fourteen hotel scene keys are registered (`.places.js:84-88`, added 2026-08-08) | live |
| Journey | `node .hotelcheck.js` — builds every scene, walks both entrance directions, checks stair adjacency, the ride's distance-proportional progress, and a save taken between floors | exists, **not in `.verify.js`** |
| Frame rate | `node .fpscheck.js <place>` — read `ms` and `p95Ms`, not `fps` | run centrally, never beside another render |

Take the render gate (`.render-gate.js`, 3 slots) before anything that launches headless Chrome, and
give each `.audit.js` invocation its own `AUDIT_PORT`. Never edit source while `.verify.js` runs.

Gaps a verifier should know about, all tracked in `HOTEL-TODO.md` section B:

- `.hotelcheck.js` is **not registered in `.verify.js`**, so nothing hotel-shaped runs in the standing
  suite (H016). Four orphan one-offs also survive at repo root: `.hotel6-proof.js`, `.hotel7check.js`,
  `.hotel9check.js`, `.hotel9proof.js` (H017).
- `.thingcheck.js` does not reach hotel scenes, so "every interactive thing has a dictionary row" is
  unproven for the hotel (H015).
- `.verify.js:77` still says "all eleven places build" (H014).
- There is no hotel row in `.baseline.json`, so prop/draw-count drift is uncaught (H020).

Acceptance still requires clean syntax and boot; street-to-hotel and hotel-to-street traversal; every
floor reachable by lift and stairs; saved floor/room restored safely; doors revealing real adjacent
spaces; zero dead interaction labels; representative desktop/mobile renders; and **visual inspection
of every `HT-` camera rather than successful screenshot generation alone**.

## File ownership — as implemented

The split below is what exists on disk, not a plan. Each row is a lane that can be dispatched
without collisions. `HOTEL-TODO.md` carries the same lanes with item ranges attached.

| Files | Owns |
| --- | --- |
| `js/hotel.js` | the shell: `HOTEL_OUT`, `HOTEL_FLOORS`, `HOTEL_DEPARTMENTS`, `HOTEL_CORE`, `HOTEL_ROUTES`, `HotelFit` / `HotelUse` / `HotelCast`, the per-floor plate, perimeter, lift bank, service-lift portal, fire-stair vestibule, floor directory, and floor 1's vestibule and street context. **Contended — request, do not edit.** |
| `js/hotel-lift.js` | the car scene and the ride controller. **Contended.** |
| `js/hotel-public.js` | fit-out for `hotel`, `hotel2`, `hotel3` + their `HotelUse` rows and public cast |
| `js/hotel-guests.js` | fit-out for `hotel5`, `hotel8`, `hotel10`, `hotel11`, `hotel12` + guest cast |
| `js/hotel-service.js` | fit-out for `hotelB1`, `hotel4` + service cast |
| `js/hotel-fB1.js` … `js/hotel-f12.js` | one file per authored level: that floor's architecture, partitions, doors and camera rooms. Floors 6, 7, 9 and 10 also carry their own fit-out here. **One owner per file; never edit another floor's.** |
| `js/street-hotel.js` | the forecourt, porte-cochère, tower exterior, night application, the street-side door and the three exterior NPCs |
| `js/game.js` | scene registration (`:57-60`), `openHotelFloors` (`:9961`), the `HotelLift.bind` hooks (`:10676`), save/restore (`:10246`, `:10306`, `:10421`, `:10434`), `HotelUse` dispatch (`:10751`), the travel-list row (`:7915`). **Contended — request, do not edit.** |
| `js/data.js` | the two lift/stair `USE` rows (`:2630`, `:2632`). **Contended.** |
| `js/vocab.js` | hotel vocabulary. **Contended.** |
| `HOTEL.md`, `HOTEL-TENANT.md`, `HOTEL-TODO.md` | this contract, the per-floor brief, the work list |
| `.hotelcheck.js`, `.places.js`, `.verify.js`, `.thingcheck.js` | the harness lane |
| `.audit.js` | the camera registry. Shared; requests only. |

Agents share the core constants and the elevator contract, and do not edit one another's modules. If
the shell does not give a floor what it needs, that is a report to the lead, not a reach into
`js/hotel.js`.
