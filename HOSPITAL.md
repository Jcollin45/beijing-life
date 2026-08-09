# 医院 — the hospital army

An AI team design plan for building 医院 — a multi-department public hospital — as the next major
building. The documented #1 new-place gap: `BIG-UPDATES.md:367` (N1) *"医院. Registration (挂号),
departments, a doctor, a prescription. The other half of 药店, and the harder half,"* and `PLAN.md:450`.

Read alongside `APARTMENT.md` (the building-split precedent), `STREET.md` (the street army that
gets the hospital's door), and `pharmacy.js` (the smaller room the hospital completes). Inherits
`AGENT_ARMY.md`'s discipline: one file one writer, serial hub for `game.js`/`vocab.js`, verifier
gate, no git so no rollback.

## Why a hospital, and what it teaches

The pharmacy shipped its vocabulary and explicitly left the loop open — `PLAN.md:261`: *"There is no
illness system behind it,"* and `BIG-UPDATES.md:317` (S9): *"Health and illness — closes the loop
药店 opened."* The hospital is the other half. It teaches the survival Chinese no existing scene
touches: 挂号 (register), 科室 (departments), 挂什么科 (which department), 症状 (symptoms), 抽血
(blood draw), 化验单 (test results), 输液 (an IV drip — the rows-of-chairs room that is *the* image
of a Chinese hospital), 住院 (admission), 探视 (visiting a patient), 药方 (the prescription you carry
back to 药房 and then to 药店). A player who can name every object in their flat still cannot tell
anyone they feel unwell. This room is where they learn.

It is also the right *shape* for this codebase: a multi-department public hospital (门诊楼) is a
spine corridor with clinics off both sides — which splits into files the way the apartment split
`world.js` into `home-<room>.js`. Same move, third time — and at fifteen agents, split as fine as
the apartment's eleven rooms.

## The enabling pattern (already proven twice)

A `Lazy('Hospital', () => {…})` factory in `js/hospital.js` owns the **shell** — the envelope,
the spine corridor, the entrance, `RX/RZ/H`, `WIN`, the lighting — and a **`HospFit` registry**,
the mirror of the apartment's `FlatFit` (`world.js:844`) and the street's `StreetFit. Each
department registers a builder in its own `js/hosp-<dept>.js`:

```js
HospFit['registration'] = A => { … };
```

…handed an `A` toolkit (centre-anchored `box/cyl/wall/flat/glyph`, `solid`, `shade`, `light`,
`thing` — the same surface `pharmacy.js:36` uses, but in world y, not floor-relative, exactly as
`APARTMENT.md`'s "Y IS WORLD Y" rule). The shell calls every registered builder at build time and
dispatches each department's tick-fn. This is `FlatFit` word for word, applied to a hospital.

**The shell owns:**
- The envelope: floor, walls, ceiling, skirting, the spine corridor running the length of the
  building, department thresholds.
- The entrance: a street door (the `-z` end, matching `pharmacy.js:210`) + the door out (`th.exit =
  { place:'street', at: HOSPITAL_OUT }`, the pattern at `street.js:2697`/`2920`).
- The contracts: `RX/RZ/H` (feed `R.setRoom`), `WIN` (the glazing daylight shafts through), `OUT`
  (the street arrival point), `setNight`, and the `HospFit` registry + tick dispatch.
- **One new load-bearing fixture:** `Pharmacy.loop` — the hospital's 药房 writes a `药方` into the
  shared illness state, which the street's 药店 reads when you take it there to fill. This is the
  `WIN`/`rail` equivalent: named in this contract, owned by one department, read elsewhere.

**The departments own:** everything inside their four walls — the consultation desk, the drip
chairs, the X-ray lightbox — and the `thing()` calls that teach their words. Each posts
`USE`/`vocab` tickets to the Hub.

## The space contract (fixed up front, like APARTMENT.md)

One storey, a 门诊楼 outpatient floor, so every department is on `y = 0` and no second deck is
needed (unlike the tower). Frozen so fifteen agents build at once without measuring off a neighbour:

```
HOSPITAL  : x -16.0 .. 16.0   z -12.0 .. 14.0   H 3.20
SPINE     : x  -2.4 ..  2.4   z -10.0 .. 12.5            the corridor everything branches off

挂号大厅 block (the entrance end, z  6.5 .. 13.5)
  挂号窗口     x -16.0 ..  -6.0                          the registration windows
  收费窗口     x  -6.0 ..  -2.4                          fees / payment
  分诊台       x   2.4 ..   8.0                          triage desk
  大厅·叫号     x   8.0 ..  16.0                          waiting + number board

clinics block (z  0.0 .. 5.5)
  内科         x -16.0 ..  -2.4                          internal medicine
  外科         x   2.4 ..   8.0                          surgery
  儿科         x   8.0 ..  16.0                          paediatrics — added for fifteen-way

diagnostics block (z -6.0 .. -1.0)
  化验·抽血     x -16.0 ..  -2.4                          blood draw + results window
  影像         x   2.4 ..  16.0                           X-ray + CT (lead door)

treatment block (z -12.0 .. -7.0)
  输液室       x  -9.0 ..  -2.4                           IV drip room — rows of chairs
  药房         x   2.4 ..   9.0                           dispensary — owns Pharmacy.loop
  急诊         x   9.0 ..  16.0                           emergency — added for fifteen-way
```

- **H 3.20**, a touch taller than a flat (2.60) — hospitals have high decks for the services and
  the glass. Departments are still `A.y0 + h` from the shell, never bare heights.
- **The spine is the contract's spine:** every department opens onto it, and the body walks it to
  get between them. A department that blocks its own threshold breaks the building, not itself.
- **挂号大厅 owns the street entrance** (the `-z` end of the spine), the way 客厅 owns `WIN` and
  主卧 owns `rail`. It is where you arrive and where `spawn` is.
- **药房 owns `Pharmacy.loop`** — the 药方 the doctor wrote goes here, then to the street 药店. The
  only cross-scene hook; one writer, named here.
- **Two departments added to reach fifteen** are 儿科 (paediatrics — a clinic with a clearly
  different subject and vocab: 孩子/发烧/疫苗) and 急诊 (emergency — the night-facing entrance,
  the 担架 stretcher, 挂急诊). Both are real parts of a Chinese 门诊楼, not padding.

The lesson carried from `APARTMENT.md`: a corridor's stated depth is not its walkable depth —
subtract what stands in it, subtract 0.60 for the body, and check what is left. The spine's
4.8 m leaves ~3.6 m after wall thickness and door reveals, comfortable for two-way traffic past a
trolley, which a hospital corridor has to carry.

## Why fifteen, not nine

A coarser nine-department split (registration, waiting, internal, surgery, lab, imaging, IV,
dispensary, ward) serialises work that doesn't need to be. The 挂号 hall is not one room — it is a
挂号 window, a 收费 window, a triage desk, and a waiting/叫号 area that share no geometry and teach
different words. The pharmacy-style "sub-spaces of one footprint" split (counter / stock / islands
in `pharmacy.js`) applies to the hospital's blocks too. And a fifteen-way build earns its own
system-roles the way the street's `Traffic`/`Cycles` did: the illness-state loop and the 叫号
queue are real subsystems that deserve a named owner rather than being smuggled into a department
file. Splitting to fifteen puts fifteen files in fifteen hands with **zero new contention** — each
still owns a distinct file. The only cost is the Hub drains more tickets, which is what its
batching window is for.

## The roster

Inherits `AGENT_ARMY.md` tiers. New/specialised roles marked ✦.

### Tier 0 — Command

**🎖️ The Foreman** — unchanged. Holds the file-lock ledger, dispatches waves, never touches code.
Owns this space contract as the single source of truth every agent reads.

### Tier 1 — Engine

**✦ 🏗️ Hospital Mech** — owns `js/hospital.js` (the shell + registry) for the whole build. Runs
**alone first** to land the shell and the `HospFit` registry, behaviour-identical to the proven
`FlatFit`/`StreetFit` pattern: the `Build.scene` factory, the envelope, the spine corridor, the
street door + `th.exit`, `RX/RZ/H`, `WIN`, `OUT`, `setNight`, the registry dispatch loop (mirror of
`world.js:844`). Full audit after each step. The only agent allowed in `js/hospital.js` for the
whole build. *Hands the system agents their hooks and the department agents their thresholds.*

### Tier 1.5 — Serial hubs (unchanged discipline)

**📝 The Hub** — owns `js/game.js` + `js/vocab.js`. For the hospital: adds the `PLACES.hospital`
row (`game.js:54`), the `USE['医院']` entry with `go:'hospital'`, and serializes every `USE`/vocab
ticket the departments post. Also owns the **street door wiring** on the street side (a ticket from
the Mech, applied in `street-civic.js`/`street.js` as `th.exit = { place:'hospital', at: HOSPITAL_OUT }`).
**🗣️ Scribe** — owns `js/talk.js`. The consultation dialogue (哪儿不舒服？疼不疼？), the 挂号
clerk, the nurse calling 号 — the conversation that carries the symptoms vocab.
**📖 Lexicographer** — `vocab.js` via the Hub. The whole 挂号/科室/症状 cluster, hundreds of entries,
pure data — the biggest single content item in the build.

### Tier 1 — Parallel builders (one file each, fully parallel — 15 at once)

Split into the **13 department/sub-space files** plus **2 system files**, so fifteen agents each
own a distinct file. All run at once after the Mech lands the shell.

**挂号大厅 block — the entrance, split into four sub-space files (the 挂号 hall is not one room):**

- **🚪 挂号窗口 Registration Agent** — `js/hosp-registration.js`. **Owns the street entrance and
  `spawn`.** The 挂号 windows, the department-directory board (挂什么科), the queue lines, the entry
  doors. The first room and the one that teaches 挂号, which is the door-vocab to the whole building.
- **💳 收费窗口 Cashier Agent** — `js/hosp-cashier.js`. The 收费 window, the 刷卡 reader, the 发票
  receipt, the payment queue. Teaches 收费/付钱/刷卡/发票 — numbers-under-pressure vocab, the S7 gap
  (`BIG-UPDATES.md:313`). *Split from registration: 挂号 and 收费 are two separate counters in every
  Chinese hospital, and putting them in one file would have conflated two teachers.*
- **🏥 分诊台 Triage Agent** — `js/hosp-triage.js`. The triage nurse's desk, the 体温计, the blood-
  pressure cuff, the first person who asks 你哪里不舒服. The room that decides 挂什么科 — the router.
- **🪑 候诊·叫号 Waiting Agent** — `js/hosp-waiting.js`. The waiting area, rows of seats, the 叫号
  number display. The room you spend the most real time in, teaching 候诊/等一下/几号.

**clinics block — three consultation rooms, each a different subject:**

- **🩺 内科 Internal Medicine Agent** — `js/hosp-internal.js`. The consultation: doctor's desk,
  examination couch, stethoscope, the computer the doctor types your 病历 into. The room where the
  症状 vocab lands (头疼/发烧/咳嗽/肚子疼). **Writes the 药方 into `Pharmacy.loop`.**
- **🔪 外科 Surgery Agent** — `js/hosp-surgery.js`. Consultation + a glimpse of an operating theatre
  through a door. 缝针/伤口/换药 vocab. Higher-drama language, smaller footprint.
- **🧒 儿科 Paediatrics Agent** — `js/hosp-paeds.js`. A clinic with a child-scale chair, a weight/
  height chart, 疫苗 vaccine cold-box. Teaches 孩子/发烧/疫苗/量体温 — the family-language angle no
  other department has.

**diagnostics block — two rooms:**

- **🧪 化验·抽血 Lab Agent** — `js/hosp-lab.js`. The phlebotomy chair, sample racks, the results-
  collection window, 化验单. Teaches 抽血/验血/结果, the "come back in two hours" loop.
- **📡 影像 Radiology Agent** — `js/hosp-imaging.js`. The X-ray lightbox with films on it, the CT
  scanner ring behind a lead-lined door, 拍片/CT/片子. The most visually distinctive department.

**treatment block — three rooms:**

- **💧 输液室 IV Room Agent** — `js/hosp-iv.js`. **Rows of chairs with drip stands — the image of a
  Chinese hospital.** 输液/吊瓶/滴, the slow hour you spend there. The room that earns the sitting
  system (already in the game) for real.
- **💊 药房 Dispensary Agent** — `js/hosp-dispensary.js`. The take-home window, 药方 collection,
  rows of boxes (reuses `pharmacy.js`'s `shelfWall` idiom). **Reads the 药方 from `Pharmacy.loop`,
  dispenses, and is the bridge to the street 药店.** Pairs with the Loop agent.
- **🚑 急诊 Emergency Agent** — `js/hosp-er.js`. The night-facing ambulance entrance, the 担架
  stretcher, the 挂急诊 desk. Teaches 急诊/担架/抢救 — the urgent register. Open at hours the rest
  of the hospital is not, the S1 opening-hours gap (`BIG-UPDATES.md:297`).

**system roles — the two subsystems that deserve their own owner, not a smuggled department file:**

- **✦ 🧬 Loop Agent (illness state)** — owns `js/hosp-loop.js`. The `Pharmacy.loop` object itself
  and its API: 内科 writes a 药方, 药房 reads it, the street 药店 fills it (S9, `BIG-UPDATES.md:317`).
  The one piece of cross-department mutable state — kept in its own file so 内科/药房/药店 write
  through a narrow API instead of reaching into each other. *Coordinates with the Mech (who mounts
  the loop onto the shell) and with every department that touches a patient state.*
- **✦ 🔢 Queue Agent (叫号 system)** — owns `js/hosp-queue.js`. The 取号 → 等待 → 叫到你的号 state
  machine that registration hands you and waiting calls. Its own file because it is read by 挂号,
  分诊, 候诊, and every clinic's door — exactly the "one subsystem, many readers" case that earns a
  dedicated owner (the same reason the street split `Traffic` and `Cycles` into their own files).

The existing `pharmacy.js` is **touched only by the Loop agent** (to read the 药方), through the
Hub if an edit is needed. No new writer on it.

### Tier 2 — Gate

**🔬 The Verifier** — unchanged, read-only. For the hospital the L3 render adds **one audit shot
per sub-space** (standing in the spine looking into each clinic/counter) plus a full-corridor shot
for the spine, so a sub-space that fails to register or lands off-contract is caught as a picture,
not a stack trace.

### Tier 3 — Quality

**👁️ Reviewer** — unchanged.
**✦ 🩺 Clinical Editor** — read-only specialist reviewer, the hospital's equivalent of the tower's
Cultural Editor and the street's Urbanist. Enforces "reads as a Chinese public hospital, not a
Western clinic": the 挂号/收费 split, the 输液 room of chairs (not private rooms), the 叫号 system
(not names), the lead door on 影像, the ward as open-bay beds (if added). This is the role that
stops fifteen rooms from being fifteen Western rooms with Chinese labels.

## The contention map

Only three files are serial; the fifteen builders parallelize once the Mech lands the shell:

- **`js/hospital.js`** — the Mech, alone, for the whole build.
- **`js/game.js` + `js/vocab.js`** — the Hub, serial, draining tickets. `PLACES.hospital` and the
  illness state's UI live here too.
- **Each of the fifteen `js/hosp-*.js`** — its own writer. **Fifteen agents run at once** after Wave 0.

### Concurrency — what runs at once, during Waves 1–2

```
Foreman (orchestrating)
├── 15 × Builders                                         ← PARALLEL (distinct files)
│      挂号 · 收费 · 分诊 · 候诊 ·
│      内科 · 外科 · 儿科 · 化验 · 影像 ·
│      输液 · 药房 · 急诊 · Loop · Queue
├── Scribe (talk.js — the consultation + 挂号 dialogue)    ← PARALLEL (independent file)
├── Hub (game.js + vocab.js + the street door ticket)      ← SERIAL queue, draining tickets
├── Verifier                                              ← shared, request-driven
└── Clinical Editor                                       ← background, per-room review
```

**~19 agents live** at peak, but only **one editing `game.js` at a time** (the Hub) and **one hand
ever in `js/hospital.js`** (the Mech). Fifteen files in fifteen hands, zero contention — exactly
the `AGENT_ARMY.md` model, sized to this building. The two shared subsystems (`Pharmacy.loop` and
the 叫号 queue) are the only cross-builder coupling, and both are owned by their own agent with a
narrow API, so they serialize by construction rather than by the Hub.

## The waves

### Wave 0 — Shell + registry + system stubs (serial, alone)
**Hospital Mech** lands `js/hospital.js`: the `Lazy` factory, the envelope + spine corridor, the
street door + `th.exit`, `RX/RZ/H`, `WIN`, `OUT`, `setNight`, and the `HospFit` registry dispatch
loop. The Loop agent lands the `Pharmacy.loop` stub and API; the Queue agent lands the 叫号 state
machine stub. Full audit after each step. *Done when the building boots, the spine renders, and
every slot calls into a no-op stub without error.* Nothing else starts until this is in.

### Wave 1 — Land every room (fifteen parallel)
Each builder ships a **readable room first**: four walls, its signature prop (the 挂号 window, the
drip chair, the X-ray lightbox, the 担架), one `thing()`. The Hub wires `PLACES.hospital` and the
street door. **End of Wave 1: you can walk the spine, enter all thirteen rooms, and read each at a
glance; the loop and queue answer no-ops.** Per-room audit gate.

### Wave 2 — The consultation + content blast (fifteen parallel)
Fill the rooms: the consultation dialogue (Scribe), the full symptoms/科室/药方 vocab
(Lexicographer via the Hub), the illness-state loop wired through 内科 → 药房 → 药店, the 叫号 queue
wired through 挂号 → 候诊 → clinics. The biggest content wave; safest place to run hot. Clinical
Editor reviews each room as it lands.

### Wave 3 — The loop closes
The 药方 you get from 内科, collect at 药房, and take to the street 药店 to fill — the S9 loop that
"closes the loop 药店 opened." Mostly Loop agent + Internal + Dispensary + the pharmacy, coordinated
through the Hub.

### Rough cost / time

| Wave | Agents live | Parallelism | Est. wall-clock |
|---|---|---|---|
| 0 Shell + stubs | 1 Mech (+ Loop/Queue stubs) | none — serial | half a day |
| 1 Land rooms | 15 + Hub + Scribe + Verifier + Clinical ≈ 19 | **15×** | 1–2 days |
| 2 Content + loop | ≈ 19 | **15×** | 2–3 days |
| 3 Loop closes | 4–5 (Loop + Internal + Dispensary + pharmacy + Hub) | low | half a day |

The fifteen-way split is where the speedup lives: fifteen rooms/sub-systems are fifteen independent
files, so the consultation, the drip room, the X-ray, the cashier and the 叫号 queue all land in the
same wave instead of queuing behind one author — exactly the pattern that took the apartment to
eleven rooms and the street to nine districts.

## The three rules (unchanged)

1. **One file, one writer** — the Mech is the only hand in `js/hospital.js`; the Hub the only hand
   in `game.js`/`vocab.js`; each of the fifteen builders its own writer. The illness-state loop and
   the 叫号 queue are written through their own agent's API only.
2. **Nothing merges without the Verifier** — and for the hospital, one spine audit shot plus one
   per room is mandatory, because a room that lands off-contract looks fine on its own and breaks
   the corridor.
3. **The hub serializes contention** — fifteen builders post tickets; the Hub drains them in order.
   Its batching window matters more at fifteen-way than it did at nine.

## What must not break (the load-bearing list)

- **`PLACES`** (`game.js:54`) gains `hospital` — the Hub's one registry edit.
- **`th.exit = { place:'street', at: HOSPITAL_OUT }`** — the hospital's door out, mirroring
  `pharmacy.js:265`. The street gains a matching door (`th.exit = { place:'hospital', … }`) as a
  Hub ticket into `street-civic.js`.
- **`Pharmacy.loop`** — the 药方 bridge to the street 药店. Owned by the Loop agent, written by 内科,
  read by 药房 and `pharmacy.js`. One new named fixture, declared in this contract the way `WIN`/`rail`
  are declared in `APARTMENT.md`.
- **The 叫号 queue** — the take-a-number state read by 挂号/分诊/候诊/every clinic door. Owned by
  the Queue agent.
- **The sitting system** — the 输液室 uses it; must not regress.
- **`pharmacy.js`** must keep working unchanged — the hospital extends its loop, it does not rewrite it.

## Minimum viable version (still 4 agents, ~70% of the value)

Foreman · Hospital Mech · Registration Agent · Internal Medicine Agent, with the Verifier run by
hand. Land Wave 0 + the two rooms that carry the core loop: you 挂号, see the doctor, get a 药方,
collect it at 药房. That alone teaches 挂号/症状/药方 — the documented gap — and closes the 药店 loop.
The other thirteen builders (收费, 分诊, 候诊, 外科, 儿科, 化验, 影像, 输液, 急诊, Ward if added, Loop,
Queue, Dispensary depth) queue behind the Mech's contract, which is the one thing that has to land first.
