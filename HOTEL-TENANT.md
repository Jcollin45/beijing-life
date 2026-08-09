# Fitting out a hotel floor

Read this instead of opening another `js/hotel-f*.js`. Each floor module is 15–55 KB and almost all
of it is that one floor's own millwork; the contract underneath is on this page. Open a sibling
module only when you need a worked example of something this page names — `js/hotel-f5.js`'s header
comment is the best one, because it documents its own measured plan.

Everything below was read off the code on 2026-08-08. Where the code and `HOTEL.md` disagree, the
code is right and `HOTEL.md` has been corrected to match.

## The registration

```js
HotelFit.register('hotel7', A => { /* build this floor */ });   // keyed by SCENE key
HotelFit.hotel7 = A => { … };                                   // equivalent older idiom
```

`js/hotel.js:90-102`. `register` throws at load if the key is not one of the thirteen in
`HOTEL_FLOORS`, or if the builder is not a function. **Multiple registrations for one floor are
composed, not replaced** — they run in registration order, which is load order.

Three sibling registries, all declared in `js/hotel.js` and all safe to write from a floor module:

| registry | what it is |
|---|---|
| `HotelFit[key]` | the builder. One or more functions. |
| `HotelUse[key]['<tag>']` | floor-local `USE` rows. `Object.assign(HotelUse.hotel7, {…})`. |
| `HotelCast` | NPC rows. Push; guard against double-push, the file may load twice in a harness. |

`HotelUse` gets first refusal over `USE_AT` and the global `USE`, but **only while that hotel floor
is the active place** (`js/game.js:10751`). So a floor may give 茶桌 a floor-specific action without
disturbing 茶桌 anywhere else in the city. Two modules assigning the same key on the same floor: the
later assign wins, and the per-floor modules load after the fit-out modules.

## Builder order — the thing that catches people

`index.html:1739-1745` loads, in this order:

```
hotel, hotel-lift, hotel-public, hotel-guests, hotel-service,     <- fit-out modules
hotel-fB1, hotel-f1 … hotel-f12                                    <- per-floor architecture
```

**Fit-out modules register first, so their builder runs first and their furniture is placed first.**
The per-floor architecture module composes second and lays its partitions *around* furniture that
already exists. That is deliberate: it is why a partition line has to be checked against what the
fit-out already put there, and why a floor module that assumes an empty plate produces walls through
beds. The fit-out coverage is:

- `hotel-public.js` — `hotel`, `hotel2`, `hotel3`
- `hotel-guests.js` — `hotel5`, `hotel8`, `hotel10`, `hotel11`, `hotel12`
- `hotel-service.js` — `hotelB1`, `hotel4`
- `hotel-f6.js`, `hotel-f7.js`, `hotel-f9.js` — **no separate fit-out module**; these floors carry
  their own fit-out inside the per-floor file, so there is only one builder to compose
- `hotel-f10.js` — has **both**: `hotel-guests.js` runs first, then `hotel-f10.js` adds more fit-out
  *and* the architecture. Two builders, in that order.

The shell also has a `starter()` fallback (`js/hotel.js:452-501`) that runs **only when no fit is
registered for that floor**. Every floor now has one, so `starter()` is dead code in practice — do
not build against it.

## The frame

World coordinates, not a shop-local frame. The plate is centred on the origin.

```
RX 22   RZ 15   H 4.35        A.RX / A.RZ / A.H — a 44 m x 30 m x 4.35 m plate
walkable                       -21.70 … 21.70  x  -14.70 … 14.70   (baseZone, hotel.js:688)
lift bank        x 18.15, car centres z -7.20 / -3.70 / -0.20; the CENTRE car is the authored one
service lift     x 18.15, z 5.10
lift landing     [16.15, -3.70]      arrival from a ride is [15.55, -3.70] facing -x
fire stair       x -18.0, z -7.1     landing [-16.0, -7.1]; arrival [-15.65, -7.10] facing +x
scene spawn      [15.6, -3.70] facing -x      — floor 1 instead spawns at [0, -12.25] facing +z
route            A.route — passenger [16.0,-3.7], service [16.0,5.1], stair [-16.0,-7.1],
                 plus guestSpine and serviceSpine waypoint lists (hotel.js:114-133)
```

The lift landing, the stair landing and the guest spine are the floor's skeleton. A partition that
seals any of them off strands the player on a level they cannot leave.

## The api

`A` is assembled at `js/hotel.js:668-673`. Destructure it or qualify as `A.foo(…)` — calling a
primitive you never pulled off `A` throws at runtime and `node --check` passes it happily.

```
geometry   box cyl ball capsule taper flat glyphs shade glow thing        (Build.scene primitives)
collision  solid(x0,x1,z0,z1)        the only thing that stops a body. EXTENTS, not centre+size.
camera     blocker(x0,x1,z0,z1,top)  stops the eye only. Mirror it onto every solid you place.
           cameraRoom(id,x0,x1,z0,z1,near)   register the room you just enclosed
colour     col (see palette below), C('#rrggbb'), light(...), luminous(p, day, night)
motion     onTick(fn)   scene-local, dispatched once a frame. Do not start your own timer.
metadata   RX RZ H floor meta levels departments core route state B
```

`A.state` is the live `hotelState` object: `{floor, landing:{open,floor}, entrance:{open,near}}`.
Read it; the shell owns writing it.

`A.room` is `HotelRoom` (`js/hotel.js`), the guestroom fixtures a guest can leave as they found them
— H113. Three tri-states, `curtain` / `lamp` / `tv`, tied to the live booking and saved in
`bjlife.save.v1`. A fixture tick reads it in one line and keeps its own clock rule as the default:

```js
onTick((t,body,mins)=>{ const h=hours(mins);
  const closed = A.room.on('curtain', h>=22.4 || h<6.6);   // the clock, unless the guest chose
  … });
```

With no booking, or on a floor the guest is not staying on, `on()` returns the clock's own answer
and the fixture behaves exactly as it always has. `A.room.set(k, 0|1|null)` is the write; `null`
hands the fixture back to the hour. **The three fixtures in `js/hotel-guests.js` (`curtains`, `lamp`,
`television`, :295 :321 :347) and the static ones in `js/hotel-f6.js:261` / `js/hotel-f7.js:244` do
not read it yet** — that one line each, and a card to set it from, is what closes H113.

## Palette — what `HOTEL_FLOORS` gives your floor

Four hex fields per floor (`js/hotel.js:24-77`) become `A.col`, and they are the reason thirteen
floors are one building rather than thirteen sketches:

- `accent` — the floor's identity colour. `A.col.accent`. Also drives the floor directory's
  highlight and the one accent line on the lift landing, so it is visible before you build anything.
  The landing itself is no longer the same room in thirteen colours: `js/hotel.js:436-600` derives a
  landing character from `level` (a band: work / arrival / public / guest / club), from the floor's
  first `HOTEL_DEPARTMENTS` entry (its secondary material) and from `order % 3` (the plan of the
  floor plane). Proportion and material, not a repainted disc. It is the shell's; report, don't edit.
- `wall` → `A.col.wall`, `floor` → `A.col.stone`, `dark` → `A.col.dark`.

Everything else in `A.col` is **shared across all thirteen floors and must not be re-tinted**:
`wallD ceiling stoneL bronze bronzeD bronzeL walnut walnutL lacquer celadon jade ink glass glassD
warm white steel red green water carpet`. Use `A.C('#rrggbb')` for anything genuinely local.
`A.meta` also carries `display hz py en programme short level order` for signage and labels.

## Partition ownership

| Surface | Owner |
|---|---|
| Floor plate, perimeter walls, ceiling, cove lights | `js/hotel.js` shell. `nocut`, do not touch. |
| Lift bank, service lift portal, fire stair vestibule, floor directory totem | shell |
| Lobby vestibule, automatic doors, forecourt/street context seen through them | shell, floor 1 only |
| Furniture, fixtures, soft goods, signage inside a room | that floor's fit-out module |
| Interior partitions, door openings, jambs, heads, reveals | that floor's `hotel-f*.js` module |

If a surface is shared with the vertical core, it is the shell's. Report it; do not reach into
`js/hotel.js`.

## Where a floor may not put a collider

The shell already owns these footprints. A `solid()` overlapping one of them either does nothing or
seals the core.

```
lift bank        x 17.70 … 18.81, z -10.00 … 2.62   (the middle span, z -4.99 … -2.41, is the
                                                     landing barrier and OPENS with the doors —
                                                     never overlay a static solid on it)
service lift     x 17.87 … 18.55, z  3.55 … 6.65
fire stair       x -21.94 … -17.84, z -8.86 … -5.34
directory totem  x  13.15 … 13.95, z  9.47 … 11.63
```

The perimeter is **not** a `solid()`. The body is held in by `baseZone` (the walkable-zone clamp in
`build.js:471`), and the eye by four `blocker()` calls. Do not add perimeter colliders.

## The collider traps

- **`hard: true` is not collision.** `build.js:48` uses it to choose the sharp-edged `box` mesh over
  `softBox`, and nothing in `clampMove` has ever read it. A partition built with `box(…,{hard:true})`
  alone is a wall you walk through.
- **A partition is two calls**: `box(cx,cy,cz,w,h,d,colour,{hard:true})` for what you see, and
  `solid(x0,x1,z0,z1)` for what stops you. Box takes centre+size, solid takes min/max.
- **A doorway is not a gap in the geometry.** `solid` has no height and no opening. Split the run
  into two solids with clear space between them and hang the head above as geometry with no solid.
- **`clampMove` inflates every collider by the 0.30 m body radius**, so an opening needs ~0.60 m of
  clear run before a body fits at all. Aim for a 0.90–1.10 m clear opening.
- **Every surface is single-sided.** Mirror each `solid` with a `blocker` on the same footprint or
  the chase camera slides through and shows the unlit back of the wall the player stands behind.
- **`cameraRoom` rectangles are appended to the scene's `zones`** (`hotel.js:690`), and `zones` is
  the walkable-region union in `clampMove`. A room nested inside `baseZone` changes nothing, which is
  why the shell says camera rooms do not affect walking — but a room registered *outside*
  ±21.70 / ±14.70 would extend the walkable region past the shell. Keep them inside the plate.
- **Nested camera rooms register before the room that contains them**, so the smallest authored
  volume wins (`roomAt`, `hotel.js:706-717`).

## Never place a wall or a door by eye

Flood-fill it with the scene's own `clampMove` at r = 0.30 from the lift landing `[15.6, -3.70]`,
before you build and after every wall. A finished floor is several reachable regions joined by
door-width necks, with **zero** cells that are standable but walled off. Flood fill understates: a
room packed tight enough that no cell has four open neighbours reads as blocked, so "0 stranded"
only means something alongside "every authored room has measurable reachable area."

## The lift and landing contract, as implemented

- **Ride.** `HotelLift.begin(from,to)` (`hotel-lift.js:41`) returns `true`, `'busy'`, `'here'` or
  `'invalid'`. Phases run `closing → moving → opening → arrive → idle`. Duration is
  `1.35 + |level difference| × 0.58` seconds (`rideSeconds`, `hotel-lift.js:18`). The player is put
  inside the `hotelLift` scene for the ride; on arrival `game.js:10676-10684` sets the destination
  floor at `[15.55, -3.70]` facing -x.
- **Landings.** Your floor does not animate the lift doors. The shell's tick calls
  `HotelLift.landingOpen(key, near)` and eases the centre car's two leaves and the landing barrier
  (`hotel.js:331-346`). Leave `x 17.70 … 18.81, z -4.99 … -2.41` clear.
- **Floor panel.** The car panel and the floor totem both list all thirteen stops from
  `HOTEL_FLOORS`. There is no floor-4 superstition workaround; 4 is a real, authored floor.
- **Stairs.** `openHotelFloors('stairs')` (`game.js:9961`) greys out and refuses anything whose
  `order` is not adjacent — `order`, not `level`, which is what makes B1↔1 adjacent. Cost is
  `max(2, |level difference| × 2)` minutes and `max(1, |level difference| × 1.4)` rest.
- **Save.** `HotelLift.toSave()` writes only `{v:1, currentKey, phase:'landing'}`, and `restore()`
  forces any saved or corrupt record to an idle, open, solid-floor landing. A save taken mid-ride
  cannot strand the player. Nothing a floor module does needs to participate in this.

## The rules that get broken

- **60 fps in every location outranks any visual improvement.** Floor 5 measures ~4.5–5.5 ms median
  and 8–10 ms p95 on the real GPU at quality 高, against a 16.7 ms budget, at ~80 draw calls. That is
  real headroom and partitions *buy* frame time back by occluding what is behind them — but keep a
  floor under about 2,600 props, and report the prop count before and after.
- Colour, gloss, alpha and glow travel per instance and are **free**; props batch by mesh + mode +
  round + bevel + textures. Anything with `alpha < 0.999` does **not** batch and costs a draw call
  each, so glazing and water are the expensive category.
- **Figures are the most expensive thing you can add.** A visible queue is 3–5 people. LOD-gate
  anything repeated. Nothing per-frame that can be per-second, and no motion that ticks while the
  player is on another floor.
- **No real brand names or logos, ever**, in either language, including art, signage and packaging.
  The hotel is 京华大酒店 and that is the only fixed name.
- Signs are bilingual where a real luxury hotel would be; Chinese stays primary. Call
  `Glyphs.need('…')` for every character you write, or it renders blank.
- **A tag is interaction wiring, not a label** (`build.js:439`). Renaming one silently kills that
  object's card. The eleven shell tags in `HOTEL_CORE.tags` are the workplace chapter's attachment
  points and must keep their names: 前台 礼宾部 行李车 客房 布草间 洗衣房 宴会厅 厨房 客房服务
  工程部 员工入口.
- **Do not edit** `js/hotel.js`, `js/hotel-lift.js`, `js/game.js`, `js/gl.js`, `index.html`, or
  another floor's module. If the shell does not give you what you need, report it.
- `node --check js/hotel-f<n>.js` after **every** edit, not once at the end. A backtick inside a
  template literal ends the string mid-statement, and that has broken this project three times.

The engine traps that bite hardest here — `clampMove` returning an array, `cyl` taking a radius
while `capsule` takes a full width, a capsule being a limb rather than a rod, glyph facing at yaw 0
being +z — are in `.claude/agents/coder.md` and are not repeated on this page.
