# 北京生活 — Upgrade Plan

Six upgrades, chosen 2026-08-01, in the order they should be built. The order is not preference:
each item is placed where it is because of what it makes cheaper for the ones after it.

Baseline measured before any of this landed, so the claims below can be checked:

- `node .bootcheck.js` — no boot overlay, no fails, no errors.
- 31 scripts, 2445 KB of JavaScript, load event at 899 ms (localhost, no-store, uncompressed).
- Heaviest: `game.js` 432 KB, `street.js` 199 KB, `airport.js` 184 KB, `metro.js` 158 KB,
  `mall.js` 142 KB, `data.js` 138 KB.
- All 18 places are constructed at load, not on arrival (`game.js:1365` — `PLACES` holds
  constructed scene objects, not factories).

---

## 1. Module split and load pipeline — DONE (2026-08-02), except the download half

Boot went from **899 ms to 274 ms**, and script evaluation from 456 ms to 188 ms. Thirteen of the
eighteen rooms are no longer built at boot; they are built the first time somebody stands in them.

What landed:

- `js/lazy.js` — a place is now a promise to build a place. `Lazy('Mall', () => {...})` hands back a
  proxy that runs the body on first real access. Every scene file changed by exactly two lines.
- The `NEEDS` integrity check moved from load time to build time (`Lazy.expect`), so a stale build is
  still caught, at the door of the room instead of the door of the game.
- `initNPC` / `addNPC` in `game.js` — the roster stopped being a fixed list. Crowds generated off a
  room's own geometry (the food court's diners, the carriage's passengers, the cabin's twenty-two,
  the station's commuters) arrive when that room is built.
- Things and their DOM labels are adopted per room rather than all eighteen rooms' worth up front.
- `Lazy.why(name)` names the line that built a room, which is how the remaining five were found.

Still built at boot, and why: **World** (you are standing in it), **Street** (next door, and the
title reel's second shot), **Diner** and **Zoo** (the NPC roster reads their geometry to place
people), **Metro** (the always-visible `#map` HUD reads `Metro.STATIONS` on the first frame).
Prying those last two apart means separating each file's data tables from its geometry — worth
doing, not worth blocking on.

**Not done: deferring the download.** All 31 files (2.4 MB) still arrive at boot. Doing it at
runtime would force travel to become asynchronous across dozens of synchronous call sites —
`setPlace` is called by doors, the title reel, the station map and the save loader — for a win the
title screen already hides. The right shape is a release build (concatenate + compress) rather than
runtime lazy loading. Flagged for the user rather than guessed at.

**Verified:** `boot`, `things`, `save` (8/8), `tester` (9/9) green; `places` green — every door
walks, `"errors": []` — though it now runs 3:12 against a stale 110 s budget, which the mall (the
heaviest room, 4976 props) blew past before this work.

**Pre-existing failures, confirmed not caused by this** by re-running under forced eager
construction, where they reproduce identically. All postdate the 2026-07-28 baseline. Then fixed:

### `sit` — 19 wrong → 0

Two different things wearing one label. Thirteen were zoo animals: a panda's 'sit' is a ground pose
out of the animal rig, and the harness — written about people and furniture — was reporting pandas,
a tiger and seven monkeys as hovering over missing stools. That check now skips animals. The other
six were real, and all three people are now on stools that exist:

- 顾客四 ate three meals a day in the diner at a spot with no stool within 65 cm of it.
- 顾客二 sat in the middle of the night market's table rather than at it.
- 小李 was given `act:'play'`, which is 打麻将 — a seated pose reaching for a table. On the campus
  sports ground, with no table and no stool, it sat him in mid-air six hours a day, while all his
  lines are about basketball. He stands up now.

### `seat` — 6/12 → 13/13

Not a seating bug at all. The chain broke four steps earlier: the gate number is not on the boarding
card — it is announced, and you learn it by listening, reading the departures board, or asking the
desk. The harness predates that requirement, so it walked a passenger who had never been told a gate
number straight at the gate, where 登机口 correctly refused her, and every check after it failed in
sympathy. The harness now reads the board first. The game was right throughout.

### `cabin` — 78/86 → 84/86

Six of the eight were one failure: the harness flew for a fixed 95 seconds, and the flight has since
grown a taxi, a take-off roll and an approach, so the aeroplane was cut off mid-descent and never
landed. It now flies until the wheels are down. The rest were expectations describing a shorter
flight — an exact phase list, "the first cue is the flaps" when there is now a door and a pushback
before it, "the last cue is touchdown" when the aeroplane now reverses, brakes and taxis in after
it, and a landing test naming an event (`land`) and a phase (`landed`) that no longer exist.

**Two left, deliberately not touched, because they look like real staging regressions rather than
stale assertions — loosening them would hide something true:**

1. *the captain is mid-briefing while the belts are checked.* He is not: the belt check lands at
   27.1 s and the captain's lines fall at 8.8 s and 30.9 s, so the staging the check describes has
   drifted apart as the flight lengthened.
2. *the belt check takes the pose away again.* It does not.

### Untouched

`pa` (no convolver on the first announcement) and `talk` (ten unbaked 小林 clips — an audio bake
gap, not a code fault).

## 1b. The original plan for this item

**The concern, stated once.** This project's design is *no build step*, and that is not an
accident: `package.json` says so, `index.html` explains the ordered-script loader and its
build-token cache defeat, `serve.py` exists to make plain files safe to edit, and roughly twenty
test harnesses (`.verify.js`, `.audit.js`, `.bootcheck.js`, `.shoptest.js`, …) drive the real page
in Chrome and depend on the globals those scripts define. Dropping a bundler in front of that
breaks the harnesses, the dev loop, and the one integrity check (`NEEDS`) that catches a half-stale
build. So the goal here — stop paying for eighteen cities to reach one flat — is delivered without
a bundler.

**What gets built.**

- A scene registry: `PLACES` becomes factories, not constructed objects. A place is built the
  first time it is entered and cached from then on.
- Lazy script loading for the scene files, using the same per-load build token and the same
  `NEEDS` shape as the existing loader, so a half-stale scene is still caught. The core
  (`math`, `perf`, `gl`, `vocab`, `glyphs`, `build`, `figure`, `weather`, `data`, `game`) stays
  eager; the eighteen places and their audio load on demand.
- A prefetch for the places reachable from where you are standing, so travel never blocks on a
  network round trip.
- A loading state that is honest — the game already has a boot overlay; arriving somewhere
  new gets the same treatment rather than a frozen frame.
- Optional, and only if it costs nothing: a `npm run build` that concatenates and minifies for
  release while leaving the plain-file dev path exactly as it is.

**Done when:** load event well under the 899 ms baseline with the same first frame; `.bootcheck.js`,
`.verify.js` and `.places.js` all still pass; travelling to every one of the eighteen places works
from a cold load.

## 2. Job / career simulation — DONE (2026-08-02)

`js/career.js` is new and holds all of it: state and rules, no geometry, no drawing. game.js asks it
questions at the card punch, at the whiteboard and at midnight.

**The week.** `day` was a bare counter; day 1 is now 星期一 and the seven weekday words plus 周末 are
in the dictionary. Saturday and Sunday are not workdays, which is what gives 周末 a meaning.

**Attendance, and a reason to turn up.** The punch pays the twenty 全勤 has always promised, and a
run of on-time mornings adds five a day on top of it, to a cap — ¥20, ¥25, ¥30 across three days,
nothing for arriving after 9:30, nothing for letting yourself in on a Saturday. Missing a weekday
without asking for it off is now an absence on a record that remembers; it used to cost precisely
nothing, so a fortnight asleep and a fortnight of work were the same fortnight.

**请假.** A day the manager signs off is not an absence. That is the whole difference between a
holiday and not turning up, and it is now a word you use rather than a word you read.

**Four ranks — 实习生 → 职员 → 主管 → 经理.** Each multiplies everything the whiteboard pays, so a
promotion arrives in the wallet on the very next job (¥190 → ¥238 at the first rung). Getting one
needs days served, jobs finished, **and vocabulary mastered** — and the last of those is the point.
主管 is not given to somebody who cannot read 请假, 报销 or 会议, because those are the words the job
is made of. It is the only requirement in the game that cannot be ground out by pressing Q at a
desk, and when you ask too early the manager reads back exactly which words you are still missing:

> 还不行。还要6个活儿，这些词还没学会：打卡、上班、下班、工资。

**Twenty new dictionary rows** — 工资 请假 迟到 会议 报销 邮件 办公室 面试 升职 实习生 职员 主管, the
seven weekdays and 周末.

**The whiteboard is the hub.** It now opens with the weekday, your rank and what the next rung
wants, prices every job at your rank, greys out the jobs that are not on the clock (and everything,
at the weekend), and carries 请假 and 升职 as rows of their own.

**Save.** `career` is a new optional field. An old save has none, and `Career.load` starts that
player at the bottom rather than inventing a history for them — the save version deliberately does
not move, so old saves stay readable.

**Verified:** `boot`, `save` 8/8, `things`, `dict` 4001/4001, `tester` 9/9, `sit` all green. A
scripted week in the browser gives ¥20/¥25/¥30, zero when late, zero on Saturday; 请假 excuses the
day; 升职 refuses with the missing words and then promotes.

**One regression found and fixed in passing:** the streak bonus initially paid ¥24 on the first
morning, breaking the game's own documented 全勤二十 (`.shoptest.js` caught it). The run bonus now
starts from the *second* morning, so a single punctual Monday still pays exactly twenty.

**Not done, and deliberately:** colleagues who react to you belong with affinity in item 3, not
here; and the email/form interactions are vocabulary only so far — the words are in, the paperwork
is not.

**Pre-existing, found while verifying, not mine:** `.shoptest.js` fails seven subway checks because
the line has seven stations and the harness expects six — 商务区 arrived with the mall on 2026-08-01.
Some of those failures ("one five stops off is quoted at the five-stop fare", "the way out of 机场
points into the district itself") suggest the fare table and exits may not have been updated for the
seventh station, which is worth a look on its own.

## 2b. The original plan for this item

`office.js` is 461 lines and the thinnest major scene; the whiteboard jobs are a stub. This is the
smallest of the four content items and it builds the progression scaffolding — shifts, a calendar,
gates that read `Vocab.mastered` — that item 3 then reuses instead of inventing.

- Shifts with real hours against the existing clock, and consequences for missing them.
- Colleagues who are people rather than props: names, desks, a reason to speak to each.
- Workplace Chinese as the content: emails, meeting lines, forms, 请假 / 加班 / 报销 vocabulary
  that the dictionary does not currently carry.
- Promotion gated on words actually mastered, not on hours logged.

**Done when:** a week of in-game shifts can be worked end to end, pay and mood move, and a
promotion fires off vocabulary mastery.

## 大超市 — the hypermarket (2026-08-02)

`js/market.js`. **26 × 19 m, 2,859 props, thirteen departments** — by a wide margin the largest room
in the game. Reached from the far pavement at the east end of the road, so it is a walk from the
alley or two stops on the subway to 商务区.

**It is a second shop, not a bigger one.** 幸福超市 off the alley stays exactly what it is: 7.2 × 6 m
and five things, which is right for a 便利店 on the ground floor of a walk-up. Knowing which shop you
go to for what is itself a thing you learn about living here.

**The layout is the real one, and it is not decoration:** fresh around the perimeter where the
services are — produce down one side, butcher, fish tanks and hot deli across the back, dairy and
freezers down the other — dry goods in four gondola runs through the middle, checkouts across the
front. Walking it in that order is walking a real shop, so the vocabulary arrives in the order a
real shop teaches it. Everything is a generator (gondola, produce table, service counter, chiller,
freezer bin, checkout lane, trolley) rather than a list of boxes, or it would be nine thousand lines.

**Sixty-eight new dictionary rows**, grouped by the department they are found in, because that is
how they are learned — you do not learn 茄子 from a list, you learn it from the sign over the box.
Vegetables, fruit, cuts of meat, fish, dairy, frozen, rice-flour-grain-oil, snacks, household, the
deli, and the words the transaction is made of: 称重, 结账, 小票, 打折, 一盒, 一袋.

### Two bugs, and the second one was mine from item 1

**The aisle signs were blank blue planks.** The glyphs were placed facing *into* six centimetres of
steel — in the one room whose entire premise is that you find the soy sauce by reading the sign over
the aisle. Fixed by pointing each face away from the board.

**Then they were still blank, and that was a regression I had introduced weeks of work earlier.**
`Glyphs.upload()` is called once at boot, under a comment reading "after every scene has registered
its text" — which was true when every scene was built at load, and stopped being true the moment I
made rooms lazy in item 1. A room now registers its signage when you first walk into it, long after
the atlas was built and handed to the renderer. **The airport alone asks for 75 characters that were
not in the sheet at boot**, and every one of them had been drawing as an empty cell: a departures
board of blank rectangles, in a game about reading. The atlas is now re-uploaded whenever a
freshly-built room adds characters — eighteen uploads across a whole session. Verified by rendering
the departures board, which is fully legible again.

**Also caught by the harness:** `大超市` was a thing on the street with no dictionary row. Named the
shop everywhere except the dictionary.

**Verified:** `boot`, `save` 8/8, `things`, `dict` 4486/4486, `sit`, `tester` 9/9 green; `places`
walks every door with `"errors": []`.

**Two of the four pillars are done** — the departments themselves, and the vocabulary depth. Still
to build: **a real shopping trip** (a list to fulfil, the 称重 scale, a trolley you push, checkout
lanes with queues, 扫码 and a receipt) and **staff and shoppers** (butcher, fishmonger, cashiers,
a guard, customers with trolleys, and the 欢迎光临 PA).

## 5. New city scenes — 药店 DONE (2026-08-02)

`js/pharmacy.js`. The chemist's has been on the parade since the street got its signs: a board, a
name in characters, a lit window, and a thing you could walk up to and be taught 药店 from. It had
no door. Now the same thing you learn the word from is the way in, and where you come back out is
recorded as the street builds itself, because which unit the sign lands on is decided by a seeded
stream (`Street.PHARMACY_OUT`).

**Twenty new dictionary rows** — 药 感冒 发烧 头疼 嗓子疼 肚子疼 咳嗽 生病 疼 药方 创可贴 口罩 体温计
药剂师 医生 医院 柜台 感冒药. Being ill is the most predictable reason a person ends up speaking a
language they are still learning, and it was the one situation this game could not say a word
about: a player could name every object in their flat and not tell anybody they felt unwell.

**你哪儿不舒服？** The counter asks the one question the shop exists for, and the four answers are
the lesson: 感冒 · 发烧 · 头疼 · 咳嗽, each priced, each mending something different, each going into
the notebook as you say it. There is no illness system behind it and it does not need one — the
player who has stood there once knows how to say 我头疼.

**Two bugs of my own, caught in the room:** the 168 boxes of medicine were built *inside* the shelf
carcass, so the wall the room is about was a blank white cupboard; and the purchases used a `cost`
field that does not exist, so plasters, masks and a thermometer were all free. Both fixed and
verified — ¥4 / ¥10 / ¥18, and 头疼 costs ¥20 and lifts mood 68 → 84.

## 6. The street, made livelier — motion and the stall's day (2026-08-02)

Two of the four things chosen. The hutong had no `tick` at all: everything in it was a photograph.

**Motion.** The loft's own comment says a roofline without pigeons is missing the thing that circles
over it — and then the birds sat on the boards for good. They fly now: the whole flock goes up every
ninety seconds or so, banks round the courtyards for half a minute with each bird on its own radius,
and settles back on the board it left. The steamers steam (each puff climbs a metre and fades), and
the washing swings from its pegs with an amplitude taken from the weather — a gale and a still day
looked identical on a street whose own weather system has had a wind in it for months.

**The stall keeps hours.** 早餐 trades 05:00–10:30 and is wheeled away after it; 122 props park off
the map, the steamers stop, and the verbs went with them — 早餐 and 包子 had no opening hours at all,
so with the cart gone the alley still sold you breakfast off it at midnight.

**Verified:** `boot`, `save` 8/8, `things`, `dict` 4081/4081, `sit`, `tester` 9/9 green; the alley
audit view renders unchanged; `shop` still fails only its seven known stale subway checks.

### The sound bed — DONE (2026-08-02)

Every interior in this game has had a floor of sound under it for months — platform, terminal,
noodle shop, atrium — and the one place you spend most of your time had none. Step out of the front
door and the city stopped existing. A silent street is not a quiet street; it is a rendering of one.

Outdoors is a different problem from a room, and the answer is not reverb: a room is one space with
a texture, a street is a set of distances. So `hutongBed` is four layers mixed by where the hour and
the weather have got to, not one loop that is on or off — the four-lane at the east end (a low bed
that never quite goes, because that road never quite empties), the wash of the district above it,
sparrows in the scholar trees, and rain in two bands, the hiss on asphalt and the harder rattle on
the tile roofs either side. Wind rides on top of all of it from the weather. The one-shots on top —
a bicycle bell, an e-scooter past the alley mouth, a shutter, a dog two courtyards away, somebody's
television through an open window — are drawn from a list that **changes with the hour**, so half
five in the morning is shutters and one scooter and eight in the evening is televisions and dogs.

**Levels were set against the rooms that already exist, not in the abstract.** The first pass put
the alley in the rain at 0.029 on the bus, against the subway platform's 0.020 and the noodle shop's
0.013 — an alley louder than a platform. Rebalanced, and measured with the random one-shots
suppressed so the bed could be read on its own:

| | bus level |
|---|---|
| 03:00, dead of night | 0.0025 |
| 14:00, ordinary afternoon | 0.0047 |
| 06:24, dawn chorus | 0.0063 |
| 08:12, rush hour | 0.0090 |
| 14:00, rain | 0.0116 |
| *(reference: mall 0.0028 · noodle shop 0.0130 · subway platform 0.0200)* | |

**Verified:** `speech`, `music`, `boot`, `save` 8/8, `things` green; `pa` fails on the same
pre-existing convolver issue and nothing else; no console errors.

### Then it turned out to be annoying to actually sit in — fixed (2026-08-02)

Measuring levels tells you nothing about whether a thing is pleasant to be near, and the first
version was not. Three faults, all the same underlying mistake — composing a street out of pitches:

1. **A distinct event every ~7 seconds** (an 4.3 s timer firing 62% of the time), forever, in a
   quiet alley. Now an 11 s check that passes 26% of the time: **one event every ~43 seconds**.
2. **Round-robin order**, so it was the same seven-second *sequence* forever. Now picked at random
   with no immediate repeat, so there is no pattern to lock onto.
3. **Pure sine tones** for the bell, dog and a five-note television melody. A sustained pure pitch
   reads as an alarm however quiet it is, and a five-note melody through a window is a ringtone.
   Everything sharp now starts with a noise transient and decays fast, because that is what small
   metal objects do; the television is unintelligible mid-band mush, because no melody survives a
   wall; the dog is a muffled noise burst. **The car horn is gone entirely** — it is aggressive by
   design, which is its job, and that is not ambience. Levels are about a third of what they were.

Also fixed: the sparrows were a 2.7 Hz tremolo on a narrow band at 3.6 kHz, which is a broken
speaker rather than a hedge. Now 0.42 Hz on a wider band at 2.65 kHz.

Cue peaks now sit at 0.007–0.010 against a 0.0047 bed — audible, not startling, and the loudest of
them is still below the noodle shop's steady 0.0130.

**And an off switch.** 环境音 in the pause menu turns every room bed off — street, platform, noodle
shop, atrium, terminal — takes effect where you are standing rather than at the next door, and
persists. Ambience is the most personal setting in a game; it should not be tuned until nobody
minds it, it should be switchable.

### And then the one-shots came out altogether (2026-08-02)

Tuning them down was not enough, and on reflection it was never going to be. A bell, a scooter, a
shutter, a dog and a television were built, softened to noise-based transients, spaced to one every
forty seconds and picked at random — and **a discrete event in an otherwise steady field still reads
as an interruption every single time**, because interrupting is what discrete events are for. You
cannot fix that with level or spacing; the category is wrong for something you sit inside for hours.

So the street is now only what is continuous: **the road** at the east end, swelling through the
rush hours and never quite gone, and **the birds** in the scholar trees, in at dawn and out by dusk.
Rain and wind stay, because they are not effects — they are the weather being audible, and a rainy
day that sounds identical to a dry one is the same failure the silent street was. Everything else —
`hutongCue`, `hutongCueList`, `hutongClock`, the timer and its state — is deleted rather than
disabled, so there is nothing to switch back on by accident.

**Verified after removal:** `boot`, `save` 8/8, `things`, `dict` 4081/4081, `sit`, `tester` 9/9,
`speech`, `music` all green.

**Still to do on the street:** the rest of the day's shape (school run, 广场舞 in the evening,
shutters coming down one by one, deliveries), and the neighbours with routines and dialogue — the
latter needs voice baking for any new lines.

## 3. Story campaign and NPC relationships — DONE (2026-08-02), except reactive dialogue

`js/story.js` is new: the record of who you have got through to, and the arc.

**Affinity moves on understanding, and on nothing else.** It reads Talk's `ok` — the same evidence
the vocabulary system trusts — so a person you have followed knows you and a person you have stood
in front of eighty times without following once does not. Mishearing costs nothing: somebody trying
to keep up and failing is not being rude, and a penalty there would teach the player to avoid the
conversations they most need. Four rungs: 陌生 · 面熟 · 朋友 · 老朋友.

**A bug in my own design, caught before it shipped.** The rungs were first written at 3 / 8 / 16
conversations. The content cannot support that: a script in `talk.js` is two or three turns,
`Talk.next` retires a turn for good once you answer it, the longest script anybody has is **three**,
and **twenty-six** understood conversations exist in the entire game. 朋友 and 老朋友 were therefore
unreachable, which made chapters 3 and 5 impossible to finish — an unwinnable game, from a number
that looked reasonable in isolation. The rungs are now 1 / 2 / 3, so 老朋友 means "you followed
everything this person ever asked you", and every chapter has been driven to completion in the
browser to prove it. The comment in the file says not to raise them without lengthening the scripts,
because the two numbers are the same number.

**Five chapters — 落脚 · 上班 · 熟人 · 远行 · 落地.** Every gate is a count the game was already
keeping: words met and mastered, rank reached, jobs finished, districts stood in, people understood,
whether you have been to 外滩. None of them is a marker to walk to. You finish a chapter by living
in a way that satisfies it and are then told what it was.

**Memory.** Everywhere you have stood, everyone you have understood and how often, and every
clock-in — the raw material chapters read, and the state item 4 will need for context.

**Surfaced in the notebook,** above the word list: the chapter, its blurb, what it still wants as
chips, the counters behind each, and 认识的人 — the people who know you, with their rung.

**Save.** A new optional `story` field, same rule as the career: an old save has no history invented
for it, and the save version does not move.

**Verified:** `boot`, `save` 8/8, `things`, `dict` 4001/4001, `sit`, `tester` 9/9 green. Affinity
proved to move only on understanding (six wrong answers left 王阿姨 a stranger; three right ones made
her a familiar face), and all five chapters driven to close in order.

**Not done, and it is the real gap:** NPCs do not yet *say* anything different at higher affinity.
The relationship is real, visible and gates the arc, but their lines are the same lines. Fixing that
properly means far more written dialogue per person — twenty-six conversations is thin for a game
about talking to people — which is precisely what item 4 exists to solve. Doing it by hand first
would be work thrown away.

## 3b. The original plan for this item

The backbone, and the item that changes the save format — which is why it comes before the LLM work
rather than after.

- Per-NPC affinity, persisted, moved by conversation quality rather than by talking a lot.
- Chapters: a multi-week arc with a beginning, gates, and an end, replacing "three rotating daily
  goals forever" as the reason to play tomorrow.
- Memory: NPCs refer to what you did, what you bought, where you went, whether you turned up.
- Unlocks — favours, places, deeper dialogue — hung off affinity and chapter, not off money.
- A save migration, because every existing save predates all of this.

**Done when:** a new game reaches chapter two through play, an old save loads without losing
anything, and at least four NPCs respond differently at low and high affinity.

## 4. LLM-driven dialogue

Layers on item 3 — affinity and chapter state are the context the model needs.

**The one thing to decide before it is built:** this is the only item that sends anything off this
machine, and it turns a local static page into one that needs an API key or a proxy. The game must
stay fully playable with no key: scripted `Talk` trees remain the fallback, and the LLM path is an
enhancement that degrades to exactly today's behaviour when absent.

- Claude API behind the NPCs, constrained to the player's known vocabulary so the model cannot
  answer in words the player has never met.
- Live grading of what the player produces, feeding the same SRS the rest of the game feeds.
- Baked voices for the fixed lines; streamed TTS only for what the model invents.
- Key handling: never in the repo, never in `localStorage` in plain sight, entered by the player or
  proxied — decided at build time with the user.

**Done when:** an unscripted conversation runs inside a known-vocabulary constraint, grades into
the SRS, and pulling the key returns the game to today's scripted behaviour with nothing broken.

## 5. New city scenes

Two real holes in the dictionary, one optional third.

- 医院 / 药店 — hospital and pharmacy. Survival Chinese the game does not teach at all: symptoms,
  body parts, 挂号, prescriptions.
- 银行 / 邮局 — bank and post office. Numbers under pressure, forms, ID, addresses.
- Optional: 健身房 or KTV, if the first two land cleanly.

Each is a `Build.scene` room, dictionary rows, baked voices, and `Data.USE` entries — the pattern
every existing scene already follows.

**Done when:** each new place passes the same audit the others do (`.audit.js` shots, `.places.js`,
no camera inside geometry, no thin discs) and its vocabulary is reachable through play.

### 京华大酒店 — built since this item was written

The hotel outgrew "a new city scene" and has its own contract. Fourteen scene keys are built and
registered (`hotelB1`, `hotel`, `hotel2`…`hotel12`, `hotelLift`), across eighteen script files.

- `HOTEL.md` — the contract: programme per floor, fixed constants, the elevator contract as
  implemented, file ownership, and how to verify.
- `HOTEL-TENANT.md` — the ~9 KB brief a floor agent reads **instead of** a 15–55 KB floor module.
- `HOTEL-TODO.md` — the numbered work list, H001–H340, with dispatch lanes.

Geometry is largely done; the *stay loop* is not. Checking in is still a single `HotelUse` row
granting `mood:4`. You cannot book, sleep, be charged, or leave with anything changed, and no hotel
key appears in `disrupt.js`, `story.js`, `career.js` or `pantry.js`. That gap is `HOTEL-TODO.md`
sections F and G, and it is the same "consequence between locations" goal as the rest of this plan.

### 高层公寓 十八号楼 — home, and also built since this item was written

`home` is no longer one room. It is a twelve-storey apartment tower off 杨柳胡同: 大堂 the lobby on
deck 0, two lift shafts with a real multi-stop car, 走廊 your corridor and **flat 202** on deck 2,
nine neighbour floors on decks 3–11, and 屋顶 the roof on deck 12. One scene key — `home` — over
thirteen decks, built by `js/world.js` plus 22 `js/home-*.js` modules.

- `APARTMENT.md` — the contract: the coordinate table, the ten-room owner map, what must not break,
  and how to verify. **Its coordinate numbers were wrong in four places until 2026-08-08**; read the
  current file, not a memory of it.
- `APARTMENT-TENANT.md` — the brief a floor agent reads **instead of** a 1,100–2,100 line module:
  the `FlatFit` seam, `DECK_OF`, build order, where a floor may add colliders, deck stamping.
- `TOWER.md` — the file-ownership map. `TOWER-STATE.md` — what has already landed.
- `APARTMENT-TODO.md` — the numbered work list, marks written by `.checklist.js`.

It matters to this plan for the same reason the hotel does, and more: it is the one place a player
returns to hundreds of times, so it is where cross-location consequence has to be *felt*. The gap is
the same shape — geometry is largely done, the living loop is not. **And it is the one location
measurably over budget: med 21.1 ms / p95 27.7 ms against 16.67 at 23,729 props, GPU-bound.**

## 6. Rendering overhaul

Last, deliberately. It is the only item with no learning payoff, and doing it before the scene split
in item 1 means doing it twice.

- Instanced crowds — the crowd systems in `game.js` are the biggest per-frame cost.
- LOD on figures and distant scenery.
- Shadow and ambient-occlusion quality, post-stack cleanup.

**Done when:** frame time improves against `.perfcheck.js` at equal or better quality, on the same
machine, with `.audit.js` shots showing no regression.

---

## Working rules

- `node .verify.js` is the gate. Never edit source while it runs.
- Every item ends with the harnesses green, not with "it looked right".
- Items 2–5 each touch the save format; each ships its own migration and `node .savecheck.js` passes
  against a save written before it.
