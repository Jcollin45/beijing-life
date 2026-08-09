# 街 · 新总图 — the street, re-planned

A blueprint, not a patch. Part 1 is everything the street currently contains, with the coordinate
it actually stands at, read out of the source rather than remembered. Part 2 is why the present
plan cannot hold any more. Part 3 is the new layout. Part 4 is the move table: every item, from
where it is to where it goes.

Read alongside `STREET.md` (which planned the *files*; this plans the *ground*), `ART.md` and each
district's own header comment. Coordinates in metres, the scene's own frame: **+x east, +z north**,
body forward is `(sin yaw, cos yaw)`.

---

## Part 0 — the frame as built

```
                    z +48.65 ┌──────────────┐
                             │  酒店 HOTEL  │  x 41.10, z 14.55..48.65
                             └──────────────┘
   z +43 ┌────────────┐
         │ 医院 HOSP  │  x 23.38, z 9.00..43.00
   z +13.5└───────────┘═══════════════════════╗  road zone ends
                       ║   朝阳北路 ROAD      ║  x 24.0..39.8
   z   0  ━━━━━━━━━━━━━╬══════════════════════╣  ← the only crossing, z -2.50..2.10
     胡同 HUTONG       ║  carriageway 27.5..37.5
   x -27 ─────────────25.5                    ║  far building line x 41.60
   z -2.35..3.35                              ║
   z -13.5                                    ╚═══════════════════════
```

Four walkable zones (`street.js:3947`), touching at corners, switching on hard thresholds:

| zone | x | z | what it is |
|---|---|---|---|
| `alley` | −27.0 .. 25.5 | −2.35 .. 3.35 | the hutong. **5.70 m wide**, 52.5 m long |
| `west` | −32.2 .. −25.0 | −3.10 .. 6.40 | the dead-end square |
| `road` | 24.0 .. 39.8 | −13.5 .. 13.5 | carriageway + both pavements |
| `hospital-road` | 23.2 .. 27.4 | 12.8 .. 42.8 | the hospital spine |
| `hotel-forecourt` | *(street-hotel.js)* | | the arrival court |

---

## Part 1 — everything we have

### 1.1 Buildings and the ground they stand on

| # | thing | now at | file |
|---|---|---|---|
| B1 | **十八号楼**, your block. 12 decks, 34.10 m to the roof slab | x −16.5 .. 11.5, face z −2.95 | `street.js:125` |
| B2 | corner block, closes the alley's east end | x 12.0 .. 23.4, face z −3.05 | `street.js:3115` |
| B3 | the walk-up opposite, north side west of your block | x ~ −27 .. −14, z 3.95+ | `street.js:2299` |
| B4 | west dead-end building, two storeys | x −33.4 building line | `street.js:2253` |
| B5 | courtyard walls, five runs, 2.55 m high, face z 3.74 | −27→−14, −11.2→−1.2, 1.6→3.2, 6.0→12.4, 15.2→24.0 | `street.js:1714` |
| B6 | the far parade: six-storey blocks over ~40 shop units | x 41.60 building line, z −53 .. 53 | `street.js:2738` |
| B7 | 医院 hospital, skin + tower | x 23.38, z 9.00 .. 43.00 | `street-hospital.js:43` |
| B8 | 酒店 hotel, podium + tower | x 41.10, z 14.55 .. 48.65 | `street-hotel.js:26` |
| B9 | middle-distance city, 44 plain masses | 52–157 m out | `street.js:3149` |
| B10 | the CBD, in the haze | far | `street.js:3668` |

### 1.2 Doors — everywhere you can actually go

**This is the list that matters most.** Eleven ways out of the street, and where they are today:

| # | door | now at | goes to |
|---|---|---|---|
| D1 | **单元门** — your own stairwell, 门斗 porch | x 0.00, z −2.95 | `home` |
| D2 | 老李面馆 | x −5.45, z −2.95 | (enterable frontage) |
| D3 | 幸福超市 | x 9.15, z −2.95 | `超市` |
| D4 | 夜市 gateway | x 4.60, z 3.95 | `nightmarket` |
| D5 | 地铁站 · 杨柳胡同 | x 19.40, z 2.30 | `metro` |
| D6 | 地铁站 · 商务区 | x 38.70, z −5.20 | `metro` |
| D7 | 公司 office lobby | x 41.60, z 2.20 | `office` |
| D8 | 药店 pharmacy | x 41.60, z −3.70 (door −2.90) | `pharmacy` |
| D9 | 北京新天地 mall | x 41.60, z −9.20 | `mall` |
| D10 | 大超市 hypermarket | x 41.60, z 6.50 | `market` |
| D11 | 银行 bank | x 40.55, z −2.20 | `bank` |
| D12 | 医院 main + 急诊 | x 23.38, z 22.20 / 35.55 | `hospital` |
| D13 | 酒店 entrance | x 41.10, z 28.40 | `hotel` |

### 1.3 Shopfronts and trade

| # | thing | now at | file |
|---|---|---|---|
| S1 | **幸福超市** — fascia, 3 display windows, striped awning, LED ribbon, crates, water tray | x 7.60, frontage 4.50..10.70 | `street.js:1454` |
| S2 | **老李面馆** — render front, tiled stallriser, 2 windows, strip curtain, lantern, menu case, stools | x −7.00, frontage −9.50..−4.50 | `street.js:1628` |
| S3 | **五金电器** — glazed frontage + three units (A dead, B trading, C closing) | x 17.80, units 14.25..21.36 | `street.js:3129`, `street-retail.js:495` |
| S4 | three **lock-ups**: 修鞋配钥匙 / 打印复印 / 杨柳小卖部, travelling shutters | x −14.07 / −12.21 / −10.35 | `street-alley.js:356` |
| S5 | **早餐 cart** — steamers, wok, 油条, 茶叶蛋, 煎饼 griddle, 保温桶, 煤气罐, price list, queue | x −8.60, z 2.40. Trades 05:00–10:30 | `street.js:1803`, `street-stall.js` |
| S6 | **报刊亭** newsstand, six mastheads | x 20.80, z −2.05 | `street.js:3228` |
| S7 | **修车** bicycle-repair pitch | x ~ −16.9, z −1.15 | `street.js:3330` |
| S8 | 侧招 box signs ×3: 超市 / 面馆 / 五金 | x 3.05 / −3.95 / 16.62, all y 2.55 | `street-retail.js` |
| S9 | vertical hanging banners: 烟酒茶叶, 手机维修 | x 4.10 / 11.10 | `street.js:3218` |
| S10 | the far parade's ~40 units, seeded names, 1-in-4 shuttered | x 41.60, z −53..53 | `street.js:2764` |
| S11 | 干洗 rail, drinks cabinet, mop bin, trike, fridge | scattered −4.12 .. 19.7 | `street-retail.js` |
| S12 | 志愿服务站 red-and-white stall | x 40.20, z 7.00 | `street-civic.js:603` |

### 1.4 The road, as a machine

| # | thing | now at | file |
|---|---|---|---|
| R1 | carriageway, 9.84 m clear between kerb faces | x 27.58 .. 37.42 | `street-road.js:85` |
| R2 | 西侧非机动车道 / 南行 / 北行 / 东侧非机动车道 | 27.80–30.20 / 30.20–32.50 / 32.50–35.10 / 35.10–37.42 | `street-road.js:86` |
| R3 | the crossing, two-stage, + 安全岛 refuge | z −2.50..2.10; island x 29.30..30.20, z −3.60..3.00 | `street-road.js:90` |
| R4 | 停止线 north / south | z −4.00 / 3.60 | `street-road.js:95` |
| R5 | 红绿灯 — 66 s cycle, three pedestrian heads, countdown | mast at the crossing | `street-road.js:124` |
| R6 | 机非隔离栏 rail | x 30.14 | `street-road.js:94` |
| R7 | **公交车站** — shelter, glass, bench, route board, backlit advert, parked bus | x 24.90, z −12.00 | `street.js:2387` |
| R8 | moving traffic — cars + the 公交车 running its route | both motor lanes | `street-traffic.js` |
| R9 | moving cycles — bike flow, e-scooters, 外卖 riders, 三轮车, walked bikes, child on the rack | bike lanes + the hutong at z 0.34 / 1.08 | `street-cycles.js` |
| R10 | 共享单车 rack, kerbside bay | road, west kerb | `street-cycles.js:937` |
| R11 | street lamps ×4, road trees ×4 | x 25.6 / 39.4, z −9..11 | `street.js:2382` |
| R12 | gullies, manholes, made-good patches, bollards, pavement railing | throughout | `street.js`, `street-road.js` |

### 1.5 Civic fabric — the far pavement

| # | thing | now at |
|---|---|---|
| C1 | 地铁站 商务区: stair pit, canopy, name board, roundel, 出入口 letter, 线路图, 盲道, 安检, night grille, handrail, bin | x 38.70, z −5.20 |
| C2 | 药店: green fascia, cross, three-shelf window, two-leaf door, queue rail | x 41.60, z −3.70 |
| C3 | 公司: granite surround, two glass leaves, shallow lobby, turnstiles, tenant board, 保安 podium, brass plate | x 41.60, z 2.20 |
| C4 | 银行: stone skin, glass hall, ATM bay, canopy | x 40.55, z −2.20 |
| C5 | 信箱 post box | x 40.15, z −6.95 |
| C6 | 环卫 sweeper's cart + bamboo broom | x 40.05, z −9.55 |
| C7 | 公示栏 community notice board | x 40.25, z 8.60 |
| C8 | smokers' corner: standing ashtray + planters | x ~40.3 |
| C9 | the courier's trolley and parcel stack | x 40.30, z 3.24 |
| C10 | bike rank, square to the frontage | x ~40.4 |
| C11 | clipped-box hedge in stone planters | the civic stretch |
| C12 | the camera on its mast | over the civic stretch |

### 1.6 The hutong's own life

| # | thing | now at |
|---|---|---|
| H1 | washing, three lines | x −24.0, −19.6, −14.6, all z ~1.6 |
| H2 | 晒被子 quilts over the coping, 08:00–16:36 | x 10.60, wall coping |
| H3 | 广场舞 — six women, speaker trolley, 17:54–20:24 | x −6.1 .. −4.55, z −0.20 |
| H4 | 象棋 — two men, board, bulb, 18:45– | x −18.30 / −16.90, z −2.56 |
| H5 | 马扎 folding stools, 18:30– | alley |
| H6 | 躺椅 — the man asleep, 11:18–15:18 | x −1.00, z −2.40 |
| H7 | the cat ×2 (wall at 5.40; sunning at 16.40) | courtyard coping |
| H8 | the dog, asleep | against the courtyard wall |
| H9 | pigeon lofts ×2 + the flock, 92 s cycle | courtyard roofs |
| H10 | 公用水龙头 shared tap | west end |
| H11 | 垃圾分类 four bins under the slogan banner | under the wired banner |
| H12 | 蜂窝煤 briquettes | alley wall |
| H13 | 咸菜坛子 pickle crocks ×3 | x −10.20, z 3.46 |
| H14 | 电表箱 meter box | x 2.40, wall |
| H15 | 卫星天线 ×2 | behind the courtyard wall |
| H16 | 跳房子 chalk hopscotch | x 3.40, z −1.90 |
| H17 | festival lanterns, two runs | across the alley |
| H18 | 横幅 red slogan banner | courtyard wall |
| H19 | 快递 parcel stack | by the stairwell |
| H20 | birdcage in a tree; dates on another | alley trees |
| H21 | 石狮子 pair, 门墩 stones, gatehouses | at the walkable gate |
| H22 | 大白菜 winter cabbage + loaded flatbed trike | against the wall |
| H23 | 公厕 sign | alley |
| H24 | trees: 5 in the alley, 3 behind the wall, +1 per courtyard | x −20.0, −9.4, −2.6, 4.6, 16.4 |
| H25 | services: gas risers x −16.28 / −2.30, meters x 11.40, riser x 15.60, hose reel, hydrant x 17.90 | block face |
| H26 | steam off the drains and the steamers | drains + cart |
| H27 | 阿姨's stool by the gate | at the gate |
| H28 | puddles ×4 | −16.2, −3.4, 6.8, 22.4 |

### 1.7 The west square

| # | thing | now at |
|---|---|---|
| W1 | 象棋 table, board mid-game, four stools + folding chair + upended crate | x −29 .. −27, z ~1.3 |
| W2 | the 大爷 kit: flasks, fan, radio, cigarettes, chalk score | the table |
| W3 | 猫 curled under the west stool | x −28.2 |
| W4 | 鸟笼 on the trellis | over the table |
| W5 | the old wall: 拆 in a circle, bricked-up window, 消防通道 stencil, 小广告 numbers | x −33.2 .. −23.6 |
| W6 | 狗 on a rice-sack mat | against the wall |
| W7 | the courtyard gate you can walk through: doors, 影壁 screen wall, canopy, number plate, 石榴 in a pot, 水缸 | z 6.4 wall |
| W8 | two bikes against the boundary wall | east of the gate |

### 1.8 People — 32, and what they are doing

| act | count | note |
|---|---|---|
| `dance` | 6 | 广场舞, evening only |
| `PATROL` | 8 | **all eight are the school run — 06:48 to 08:12 and gone** |
| `sit` | 5 | chess pair, the napper, the stool sitters |
| `wait` | 4 | |
| `vend` | 3 | 超市老板, the cart, one more |
| `work` | 2 | 李师傅 at the repair pitch |
| `play` | 2 | 豆豆 |
| `sweep` | 1 | |
| `buy` | 1 | |

Named: 王阿姨, 李师傅, 超市老板, 小陈, 豆豆. Plus the hotel's bell porter on a route
(`street-hotel.js:383`) and the hospital's own cast.

---

## Part 2 — why the present plan cannot hold any more

Six findings, each measured off the source, not judged by eye.

**1. Seven of the thirteen doors are on one line.** 公司, 药店, 北京新天地, 大超市, 银行,
地铁站商务区 and the whole 40-unit parade all stand on `x = 41.60` facing west, inside
`z −13.5 .. 13.5`. That is **27 m of pavement carrying more than half the city.** You cross one
road and everything in the game is in a row in front of you.

**2. The block's ground floor is arithmetically full.** Your block runs x −16.5 .. 11.5. On it:
老李面馆 −9.50..−4.50, the 单元门 canopy −1.75..1.75, 幸福超市 4.50..10.70, gas risers at −16.28
and −2.30, the lock-up terrace −14.90..−9.52, `wallJunk` −16.07..−15.00. **There is no run of face
left wider than 1.66 m.** That is why the 小卖部 was standing through the noodle shop's window
until this week: there was nowhere legal to put it.

**3. The hutong is 5.70 m wide and its narrowest clear slice is 1.25 m** (`street-alley.js`'s own
measurement, against the real `clampMove` at r = 0.30). Everything the district wants to add —
dancing, chess, stalls, seating, traffic, bicycles — is being fitted into a corridor narrower than
a domestic hallway is long. Six women dance 广场舞 at x −6.1..−4.55 in it.

**4. Two frontage orientations in the whole district.** The alley's shops face **+z**; the parade
faces **−x**. Nothing faces south, nothing faces east. The sun does the same thing to every shop in
the game, all day, and there is not one corner anywhere — every frontage is a straight run.

**5. One crossing, at z −2.50..2.10.** The road is a 9.84 m barrier with a single controlled gap.
Every trip between the two halves of the city goes through the same eight metres of paint.

**6. The west pavement is 27 m long, 2.7 m wide, and has a bus stop on it.** It is the pavement the
player stands on every time they come out of the hutong, and it is the emptiest ground in the
district.

---

## Part 3 — the new layout

### The move

**Stop treating the road as the edge of the map and make it the middle of a junction.** The hutong
currently dies into it. Instead, the hutong crosses it and continues east as a **步行街** — a paved
pedestrian lane, no carriageway — and the far parade turns the corner into it.

That single change buys all six findings at once: a corner, a south-facing frontage, a second
reason to cross, somewhere to unload the shelf, somewhere to put a square, and room on the block.

```
              z +48.65 ┌──────────────┐
                       │  酒店 HOTEL  │
   z +43 ┌──────┐      └──────────────┘
         │ 医院 │
   z +13.5└─────┤═══════════════════════╗
   ╔═══════════╗║                       ║   x 41.6
   ║  西口广场  ║║   朝阳北路            ║   ┌──────────────────────────┐
   ║  W SQUARE ║║                       ║   │                          │
   ╚═══════════╝║  ← W pavement takes   ║   │   新天地步行街            │
   x-33  x-25   ║    the bank + civic   ║   │   PEDESTRIAN LANE        │
        杨柳胡同 ═══════╬═══════════════════╬═══┤   x 41.6 → 60.0          │
   x -27 ────────────25.5   ↑crossing   ║   │   z  -4.0 .. 4.0         │
                            ↓ 2nd one   ║   └──────────────────────────┘
   z -13.5                             ═╝    ← south-facing frontage, and a CORNER
```

### The four places, and what each is *for*

| place | x, z | its job | how it differs from now |
|---|---|---|---|
| **杨柳胡同** | −27 .. 25.5, z −2.35 .. 3.35 | where you live. Everyday, domestic, slow. | Loses the hardware trade counter and the newsstand to the road. Gains room. |
| **杨柳西口广场** | −33.4 .. −25, z −3.1 .. 6.4 | the neighbourhood's social square | Stops being a dead end. Takes 广场舞, chess, the stools, the tap, the dog. |
| **朝阳北路** | 24 .. 39.8, z −13.5 .. 13.5 | the working road | **Its west pavement becomes a frontage** instead of empty paving. Second crossing at z −11. |
| **新天地步行街** | 41.6 .. 60, z −4 .. 4 | the shopping lane | **New.** Takes the mall, the hypermarket, and half the parade's units. |

### The three rules the new plan is built on

1. **No two doors of the same kind within 20 m.** Today 药店 (z −3.70), 银行 (−2.20) and 公司
   (2.20) are inside six metres of each other on one wall. In the new plan a destination gets a
   frontage, not a slot in a queue.
2. **Every zone has at least two frontage orientations.** The hutong keeps north-facing shops but
   gains the corner block's **west return** at x 12.0. The 步行街 has both sides. The road's west
   pavement faces **east** — the first east-facing frontage in the game.
3. **The datum travels.** `FASCIA 3.46 / FASCIAH .68` and `BLADE 2.55 / BLADEH .56` (published on
   `S`, `street.js:138`) apply to *every* frontage in the district, including the new lane. One
   sign line for the whole city is what makes a city look built rather than assembled.

---

## Part 4 — the move table

`→` is the new position. Items not listed do not move.

### 4.1 Doors

| door | from | → | why |
|---|---|---|---|
| **单元门** D1 | 0.00, −2.95 | **unchanged** | everything else is measured off it |
| 幸福超市 D3 | 9.15, −2.95 | **unchanged** | the shop under your own flat is the point of it |
| 老李面馆 D2 | −5.45, −2.95 | **unchanged** | |
| 夜市 D4 | 4.60, 3.95 | → **17.60, 3.95** | the market mouth goes at the *end* of the hutong, not its middle; the courtyard run 15.2–24.0 is where a gate that size fits |
| 地铁站 杨柳胡同 D5 | 19.40, 2.30 | → **23.20, 2.30** | a hutong gets its station at its mouth; frees 15.2–21 for the 夜市 gate |
| 地铁站 商务区 D6 | 38.70, −5.20 | → **38.70, −11.60** | pairs with the new south crossing and the bus stop; stops three transport modes stacking on one 10 m of pavement |
| 公司 D7 | 41.60, 2.20 | **unchanged** | the office tower is the one thing that *should* front a main road |
| 药店 D8 | 41.60, −3.70 | → **26.60, −4.40** (west pavement, east-facing) | a chemist belongs on the side you walk out onto, opposite the bus stop. **First east-facing shopfront in the game.** |
| 北京新天地 D9 | 41.60, −9.20 | → **47.20, 3.60** (步行街, south-facing) | a mall entrance wants a plaza in front of it, not a kerb |
| 大超市 D10 | 41.60, 6.50 | → **54.00, −3.60** (步行街, north-facing) | the anchor at the far end, so the lane has a reason to be walked to the end of |
| 银行 D11 | 40.55, −2.20 | → **26.40, 1.80** (west pavement) | a branch goes where the bus stops and the crowd waits |
| 医院 D12 | 23.38, 22.20 | **unchanged** | |
| 酒店 D13 | 41.10, 28.40 | **unchanged** | |

### 4.2 Shopfronts

| item | from | → |
|---|---|---|
| S3 **五金电器** + units A/B/C | 17.80, z −3.05 | → **corner block's west return, x 12.00, facing −x** — the first return frontage in the district, and it puts the hardware shop on the corner where a trade counter goes |
| S4 lock-up terrace ×3 | −14.07 / −12.21 / −10.35 | → **−15.60 / −13.74 / −11.88**, and the west gas riser to −16.90 — the run shifts 1.5 m west so the terrace clears 老李面馆 by a full bay instead of 2 cm |
| S6 **报刊亭** newsstand | 20.80, −2.05 | → **25.60, −8.20** (west pavement) — a newsstand belongs at a bus stop |
| S10 the ~40 parade units | 41.60, z −53..53 | → **20 stay** on x 41.60 (z −13.5..13.5 as now); **20 re-deal down the 步行街**, ten a side, x 44..58 |
| S12 志愿服务站 | 40.20, 7.00 | → **26.00, 5.40** (west pavement) — these stand on corners, and there was no corner |
| S5 早餐 cart | −8.60, 2.40 | **unchanged** — it is right outside your door and that is correct |
| S7 修车 pitch | −16.90, −1.15 | → **−22.40, −1.30** — moves west with the residential half |
| S8 the three 侧招 | 3.05 / −3.95 / 16.62 | 超市 and 面馆 unchanged; **五金 → the corner return at x 12.00**, still on `BLADE` |

### 4.3 The road

| item | from | → |
|---|---|---|
| R7 **公交车站** | 24.90, −12.00 | → **24.90, −6.00** — pulled to the middle of the west pavement so the new frontage has a crowd to face |
| R3 the crossing | z −2.50..2.10 | **unchanged**, and a **second crossing at z −11.00 .. −8.40**, uncontrolled, with its own refuge notch — the road stops being a single gate |
| R5 红绿灯 | at the crossing | **unchanged**; the new south crossing is a zebra with belisha posts, not a second signal |
| R10 共享单车 rack | west kerb | → **the 步行街 mouth, x 42.4, z −4.6** — shared bikes bank up where a pedestrian street begins |
| R9 cycles flow | lanes + hutong | **unchanged in the lanes**; the hutong lanes shift to z 0.20 / 1.20 to clear the widened south footway |
| C5 post box | 40.15, −6.95 | → **26.10, −9.40** (west pavement) |
| C6 环卫 sweeper's cart | 40.05, −9.55 | → **24.60, 8.20** |
| C7 公示栏 notice board | 40.25, 8.60 | → **−26.20, 4.10** (the west square) — a community notice board belongs where the community sits |
| C9 courier's trolley | 40.30, 3.24 | **unchanged** — it serves the office |
| C11 hedge, C12 camera | civic stretch | **unchanged** |

### 4.4 The hutong's life

| item | from | → |
|---|---|---|
| H3 **广场舞** ×6 + speaker | −6.1 .. −4.55, z −0.20 | → **the west square, x −29.6 .. −27.2, z 3.20** — six people cannot dance in a 5.70 m alley; the square is 7.2 × 9.5 m |
| H4 **象棋** pair | −18.30 / −16.90, z −2.56 | → **the west square, x −28.4 / −27.0, z 1.30** — joins the table, stools and birdcage that `street-west.js` already built there and nobody sits at |
| H5 马扎 stools | alley | → **the west square**, round the same table |
| H1 washing ×3 lines | −24.0 / −19.6 / −14.6 | **unchanged** — moved this week off the shopfronts; the residential half is where they belong |
| H6 躺椅 napper | −1.00, −2.40 | → **−19.80, −2.30** — out of the doorway view, into the quiet half |
| H16 跳房子 chalk | 3.40, −1.90 | **unchanged** |
| H22 大白菜 + trike | wall | → **−24.60, 2.90** |
| H24 alley trees | −20.0, −9.4, −2.6, 4.6, 16.4 | → **−20.0, −9.4, −2.6, 13.2, 21.0** — the tree at 4.6 comes out; it stands across 幸福超市's board (crown x 3.4..5.8, y 2.6..5.0) and hides the biggest sign on the street |
| H8 dog, H27 阿姨's stool | alley | → **the west square** |
| everything else in 1.6 | | **unchanged** |

### 4.5 People

No new people. The count is right; the distribution is not.

| change | detail |
|---|---|
| the 8 school-run patrols | keep their route, but **only 4 stay on `H.school`**. The other 4 get all-day windows — `[8.2, 19.4]`, `[10.4, 21.2]`, `[9.0, 18.3]`, `[6.6, 20.1]` — so the hutong is never empty of movement between 08:12 and midnight, which today it is |
| the 4 `wait` and 1 `buy` | become two-point patrols on the west pavement and the 步行街; a person waiting for eleven hours is not waiting |
| the 1 `sweep` | becomes a route down the alley — a sweeper who does not move is the one static figure nobody can explain |
| 广场舞 ×6, 象棋 ×2, 躺椅 ×1, vendors ×3, 李师傅 | stay static. They are static **on purpose** and moving them would be the mistake |

---

## Part 5 — what this costs, honestly

| item | cost | note |
|---|---|---|
| re-siting inside existing zones (4.2, 4.3, 4.4, 4.5) | **numbers only** | every one of these is an x/z edit in a file that already builds the thing |
| the **west pavement frontage** (药店, 银行, newsstand, 志愿服务站) | **medium** | needs a building line at x ~26.9 facing east, and the `road` zone's x0 pulled from 24.0 to ~24.6. The buildings themselves already exist; they are being re-skinned onto a new wall |
| the **corner return** for 五金电器 | **medium** | the corner block already stands at x 12.0..23.4; this is its west elevation, which is currently blank |
| the **second crossing** at z −11 | **small** | `street-road.js` already has the paint, ramp, tactile and refuge functions |
| the **新天地步行街** | **large — the one real build** | a new zone, a paved lane, two frontages, and the mall/hypermarket re-fronted onto it |
| **cheaper fallback for the 步行街** | | if the lane is too much: turn the far parade's south end into a **west-facing return at z −13.5**, giving a corner and a south-facing frontage without a new zone. Buys findings 4 and 1 partly, not 5 |

## Part 5b — BUILD LOG. What has landed, and what the ground said no to

Wave 1 is **built, pushed and verified on jcollin45.github.io** (19:00 and 12:00, camera at
(−25.6, −1.4) and (3.4, 3.05)):

| built | detail |
|---|---|
| 广场舞 → 杨柳西口 | speaker to (−28.60, 4.60), all six dancers offset by the same (−22.60, +1.32) so the formation and each woman's facing are bit-identical. Lead re-run west to the dead-end building; both labels were carrying the old pitch's z as a literal and now read off `x`/`z` |
| tree x 4.6 **deleted** | crown x 3.4–5.8 at y 2.6–5.0 against a board at x 5.10–10.10, y 3.12–3.80. Nowhere on that stretch to move it to. Four alley trees now, not five |
| 躺椅 −1.00 → −3.20 | it stood dead centre of the 单元门 |

**Four moves in Part 4 did not survive being measured. They are struck, with the number that
killed them — do not re-propose them:**

- **夜市 4.60 → 17.60.** The gate needs a *gap* in the courtyard wall and 3.2–6.0 is one; 17.60
  lands mid-run in `brickRun(15.2, 24.0)` and the wall has to be cut. Its own comment already
  measured this. **Stays at 4.60.**
- **象棋 → the square.** The board sits in the 0.80 m strip the body can never reach and narrows
  the alley by nothing. Moving it also puts a second board 1.5 m from `street-west.js`'s. **Stays.**
- **报刊亭 → the west footway.** The kiosk is 2.10 m in x; the footway is 3.28 m clear. It would
  leave 0.83 m. **Stays at 20.80.**
- **the lock-up terrace 1.5 m west.** Runs into `wallJunk` at −16.07..−15.00 and the gas riser at
  −16.28. The 2 cm it currently leaves to 老李面馆 is two shopfronts abutting, which is what they
  do. **Stays at −14.07 / −12.21 / −10.35.**

**And one correction that changes wave 2** (drawn on `STREET-PLAN.html`, sheet A02): the west-side
frontage cannot be at x ≈ 26.9 — that is hard against the kerb face at 27.58. It is **x 23.30**,
the corner block's own east elevation, which already stands there as blank wall. `road.x0` moves
24.0 → 23.35. **五金电器 therefore does not move at all**: it becomes the corner's other face,
hardware onto the hutong and civic onto the road, and the district's first corner costs nothing.

**Wave 2's real cost, now known.** `street-bank.js` and the 药店 section of `street-civic.js` are
built facing **−x**, parameterised off `FACE`/`FX` with `FACE − d` at 24 sites in the bank alone.
Facing them east is a sign flip on every offset plus the glyph yaws, plus moving `BANK_OUT` and
`PHARMACY_OUT`, which `bank.js` and `pharmacy.js` read. Mechanical, but it is a careful pass over
two files with two doors at the end of it — not the "medium, numbers mostly" this document called
it before the drawing existed.

## Part 6 — the order to build it in

1. **4.4 and 4.5** — the hutong's life and the people. Numbers only, no new geometry, and it is the
   half the player is standing in.
2. **4.2 lock-ups + trees + newsstand.** Numbers only.
3. **The corner return** for 五金电器. One new elevation, and it proves the return-frontage pattern
   before the west pavement depends on it.
4. **The west pavement frontage.** The biggest win per metre of new geometry in the whole plan.
5. **The second crossing.**
6. **The 步行街**, last, when there is something on the other side of the road worth walking to.

Nothing in 1–3 blocks on anything in 4–6, so 1–3 can land as one wave.
