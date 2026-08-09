# 门脸 — the storefront upgrade list

Everything worth doing to the district's shopfronts and the ground in front of them, after the
re-plan (`STREET-BLUEPRINT.md`) and the datum landed. Each item names the file, the constraint it
must respect, and **the check that decides whether it is done** — an item with no check is not a
ticket, it is a wish.

## The five rules every item obeys

1. **The datum is not negotiable.** `S.FASCIA 3.46 / S.FASCIAH .68` for name boards,
   `S.BLADE 2.55 / S.BLADEH .56` for 侧招, published on the `S` contract (`street.js:138`). A new
   sign that picks its own height re-makes the fault the whole re-plan existed to fix.
2. **Emissive quads are the budget.** `.audit.js:327` records this district **fill-rate bound**.
   `street-retail.js:12`: *"a glowing glyph is a light-mask quad and three dozen of them lay a
   half-transparent copy of the scene over the top of it."* Anything `mode: 1` with `glow > 0` is
   counted before it is added. Geometry is cheap here; glow is not.
3. **Nothing in the walkable band without measuring.** The alley's body limit is z −2.05 .. 3.05;
   the west footway's is x ≥ 24.30; the lane's zone is x 39.30..58.30, z −11.90..−6.50. Props in
   the unreachable strip need no collider — props outside it need one, and each one narrows a
   street that is already 5.70 m wide at its worst.
4. **Verify on the live site.** `https://jcollin45.github.io/beijing-life/` — push, wait, look.
   A screenshot off `:8000` is not verification (`.claude/CLAUDE.md`).
5. **One file, one owner.** The lane assignments at the bottom exist so two agents never hold the
   same file.

---

## A · The shopfront itself — the eleven named shops

| # | item | file | constraint | done when |
|---|---|---|---|---|
| A1 | **卷帘门 housings.** Every Chinese shop has a roller-shutter box over its glass. The parade's units have shutters; 老李面馆, 幸福超市 and 五金电器 have none — their glass just stops. | `street.js` | the box sits under the fascia band (top ≤ 3.12) and clear of the 超市 awning at 3.16 | a 20–26 cm housing across each of the three, visible in an elevation shot from z 3.05 |
| A2 | **门帘 / strip curtains** on 超市 and 五金. 面馆 has one and it is the best thing on that frontage. | `street-retail.js` | `alpha` ≤ .35, and no collider — they hang inside the unreachable strip | both doorways read as passable from 10 m |
| A3 | **营业时间 plates.** A small hours plate beside every door. Six shops, six plates. | `street-retail.js` | `mode: 1`, **no glow** — text is geometry, the plate is not lit | readable at `reach`, and the hours match `HOURS` in `street-retail.js:60` |
| A4 | **支付 decals** — payment stickers on every glass door. The single most characteristic thing on a Chinese shopfront and the district has none. **GENERIC MARKS ONLY: 扫码支付 / 可刷卡 / 移动支付.** ~~微信支付 / 支付宝~~ — this ticket originally named two real companies' trademarks, both lanes implemented it correctly, and seven of them shipped live before the gate caught it. Nothing in this game carries a real brand; that is why the billboard says 可乐, the shared bikes wear an invented operator's colour and the office plate says 文化传媒. | `street-retail.js`, `street-lane.js` | flat quads on the glass, `mode: 1` no glow, ≤ 18 cm, **no real brand, ever** | at least two per door on all eleven named shops, and `grep -r '微信\|支付宝' js/` returns nothing |
| A5 | **营业执照 / 健康证** frames inside the glass — the pair of framed certificates every shop hangs where the street can see them. | `street-retail.js` | behind the pane, so no `ob`, no tag | visible through the glass on 面馆, 超市, 药店, the lane's four |
| A6 | **A-boards (立牌)** on the pavement — the folding sign with today's price on it. | `street-retail.js`, `street-lane.js` | needs a collider **only** if it stands outside the unreachable strip; measure each | three in the alley, two in the lane, none narrowing a run below 3.35 m |
| A7 | **Awnings for 面馆 and 五金.** Only 超市 has one, so its stretch reads richer than its neighbours' for no reason in the fiction. | `street.js` | front edge ≤ z ez+1.30 (the 超市's), top clear of the blade band at 2.83 | three awnings on the alley, all with the same projection |
| A8 | **门牌号** — a small enamel number plate on every shop and lock-up. The block has them on flats and nothing on shops. | `street-retail.js` | blue enamel, the same plate the 单元门 uses | eleven plates, numbers consistent with the alley's own numbering |
| A9 | **Transom division** in the shopfront glass. Every pane in the district is one sheet; a real shopfront has a fanlight over the door and a mullion rhythm. | `street.js`, `street-lane.js` | steel `G.metal`, ≤ 9 cm, no new panes | the lane's four and the alley's three read as joinery, not a sheet |
| A10 | **A shutter half down at close** on the lane's units, the way `street-retail.js` already does it for 五金 unit C. | `street-lane.js` | one prop per unit, matrix written on the frame the hour changes — never per frame | at 21:30 two of the four are shut and two are not |
| A11 | **Interior depth for the parade's 22 units.** Each is a lit pane with nothing behind it; from the west footway they read as forty light boxes. | `street.js` | **one** shared dark reveal box per unit, no new emissive | at 12:00 the parade reads as rooms; emissive quad count unchanged |
| A12 | **A second 侧招 rank.** Three box signs in the whole district. The lane and the west footway have none. | `street-lane.js`, `street-civic.js` | `S.BLADE / S.BLADEH`, and count the glow budget before adding | four more, all on the datum |

| **A13** | **Interior depth for the two ANCHORS.** A11 gave the parade's 22 units a dark reveal so they stopped reading as light boxes. 大超市 and 北京新天地 are the same construction at the largest scale in the district and did not get it: a `COOLI`/`WARMI` box at `glow .07` behind a `.62`-alpha pane. On the far parade that was read across a 9.84 m road; in a 6.80 m lane you stand **4 m** from 9.6 m of it and it is a featureless blown-out white wall. Found by verifying C2 on the live site at 18:00. | `street-lane.js` | reuse A11's reveal — one dark box, **no new emissive**; the aisle/shelf hint can be plain geometry | at (48.5, −7.2) looking at the doors, the glazing reads as a room with depth, not a lit panel; emissive count unchanged |

## B · The ground in front of them

| # | item | file | constraint | done when |
|---|---|---|---|---|
| B1 | **Goods on the pavement for the lane's four units.** `street-retail.js`'s header makes the case: "A Chinese shop's stock starts outside its door." The lane has planters and nothing else. | `street-lane.js` | the lane is 6.80 m; nothing may take it below 3.40 m clear | crates/racks outside at least three of the four, measured against `clampMove` |
| B2 | **Deliveries.** A 三轮车 backed up to a door with its load half off. There is one outside 超市 and nowhere else. | `street-lane.js`, `street-civic.js` | one per district; collider measured | one in the lane, one on the far parade |
| B3 | **Bins.** The lane has none; the west footway has one at (25.90, −6.60). | `street-lane.js` | against a frontage, in the unreachable strip | two in the lane, one more on the west footway |
| B4 | **Cycle parking at the lane mouth.** Shared bikes bank up outside a 步行街 — `street-cycles.js:937` put the rack on the east kerb, which is right, but nothing marks the lane's own mouth. | `street-lane.js` | outside the lane zone (z < −12.60 or on the far pavement strip x 39.6..41.2) | a marked bay with 4–6 machines, no collider needed if it is in the strip |
| B5 | **A-board / stanchion clutter at the mouth** so the lane reads as somewhere to go from the crossing. | `street-lane.js` | must not narrow the 6.80 m mouth below 4 m | visible from the west footway at (26, −9) |
| B6 | **Pavement wear.** The alley has puddles and made-good patches; the lane's paving is uniform. | `street-lane.js` | `flat` only, no collider, ≤ 6 quads | the lane's floor stops reading as new tile |
| B7 | **The west footway between 药店 and 银行.** 0.20 m of blank render between two shopfronts and nothing on the pavement in front of them but a bin. | `street-civic.js` | body limit x 24.30; everything west of it is free | a downpipe, a meter box, a bollard line, a fire point |
| B8 | **The corner block's east elevation, the parts with no shop.** z −13.5..−13.3 and −3.6..−3.05 are blank render at the ends of the run. | `street-civic.js` | no new mass | a service door, a downpipe, a wall-mounted air-con bank |
| B9 | **Kerbside loading marks** outside the shops that take deliveries. | `street-road.js` | `flat`, paint colours from that file's palette | a marked bay on the west kerb by 银行 |
| B10 | **人行横道 signing on the second crossing.** The first has three pedestrian heads and a countdown; the second has paint and nothing to say what it is. | `street-road.js` | no signal, no phase — it is uncontrolled by design | a blue pictogram plate each side, matching the first crossing's plate |

## C · Life in front of the shops

| # | item | file | constraint | done when |
|---|---|---|---|---|
| C1 | **People in the lane.** It has four shops, two anchors and nobody. | `street-lane.js` (a `LaneCast`, the `StreetCast` pattern) | **no new bodies beyond six**; the district already carries 32 and is fill-rate bound | 4–6 in the lane between 10:00 and 21:00, at least two on routes |
| C2 | **A queue.** `排队` exists at the breakfast stall and nowhere else, and it is one of the most useful words on the street. | `street-lane.js` | reuse the stall's own pattern | a queue at 大超市's doors at a plausible hour |
| C3 | **A shopkeeper in a doorway.** Every one of these shops is unattended. | `street-lane.js` | `spots`, not patrols — a shopkeeper stands | two, one per side |
| C4 | **Shop cat.** The alley has two; the trading half has none. | `street-lane.js` | one prop, no tick | asleep on something warm in the lane |
| C5 | **Hours that differ.** The lane's four units light and unlight together off one `tick`. | `street-lane.js` | one write per state change, never per frame | at 21:00 the lane is not uniformly lit |

## D · Sign craft — the thing that makes a street read as a street

| # | item | file | constraint | done when |
|---|---|---|---|---|
| D1 | **灯箱 depth.** The boards are boxes now; the *lit* part is still a flat face. A real light box has a returned edge that glows on its own. | `street.js` | one extra quad per named shop only — eleven, not fifty | the eleven read as light boxes at 19:00 |
| D2 | **One valance strip for the whole parade run** rather than none. Currently the units have no lit lip because a glowing quad each is the documented ceiling; **one strip across each block** is the same read for one quad. (22 units across 7 blocks — the "40" this doc and `street.js` both claimed was never counted.) | `street.js` | one per procedural block, not per unit | the parade has a continuous lit line at 19:00, and the emissive count rises by the number of blocks, not units |
| D3 | **Vertical banners on more shops.** Two exist (烟酒茶叶, 手机维修) and they are the most Chinese thing on the wall. | `street-retail.js` | `mode: 1`, no glow on the text | two more in the alley, two in the lane |
| D4 | **A sign that has failed.** One dead tube, one letter out, one board sun-bleached. Every real parade has one and it is what stops forty units reading as a texture. | `street.js` | zero cost — colour only | one bleached board and one dark unit on the parade |
| D5 | **Bilingual under-text** on the two or three signs a learner most needs, in the pinyin style the HUD uses. | `street-retail.js` | `mode: 1`, no glow, ≤ 0.12 | 药店, 面包房, 超市 carry it |
| D6 | **Festival dressing.** 春联 on shop doors at New Year, 开业花篮 outside a new one. The alley has couplets on residential gates and none on shops. | `street-retail.js` | reuse the alley's own couplet geometry | shop couplets on at least three frontages |

## Verified by the lead, on the live origin — items a lane could not frame itself

Read off `jcollin45.github.io`, not `:8000`. Recorded here because each was left honestly
unverified in a lane's report, and an item nobody looked at is not done.

| item | camera | what was read |
|---|---|---|
| **A13** | (48.5, −7.2) — the ticket's own point, chase dist 0.12 to clear the mall portal | 大超市's glazing renders as a mid-grey interior with shelf and aisle lines and a light border, where it was a flat blown-out white panel. **Closed.** |
| **C4** | (44.6, −10.3) looking west, fov 0.75 | the cat, ginger, curled on the top bread crate outside 面包房 at (43.13, −11.98, y 0.61). **Closed.** |
| **C2** | (52.4, −9.0) at 18:00 | two 顾客 at 大超市's doors, (52.1, −11.1) and (52.1, −10.6), one on `act:'phone'`. **Closed.** |
| **B5** | (26.0, −9.0), the west footway | the gateway carries — 新天地步行街 in gold on the beam, 全场五折 on the pier, the lane and its festoon behind. **Closed.** |
| **blade fix** | (0.50, 2.20) | 超市 reads gold-on-red. It was a blank box before `CASE = .065`. **Closed.** |
| **五金 blade** | (18.80, 1.10) | reads, but its **top half is behind L1's awning valance** — confirmed, and the reason the awning moves rather than the datum. **OPEN, with L1.** |
| **A5** | — | **never framed by anyone.** The certificate pairs may not exist. **OPEN, with L2.** |

## E · Measurement — the item that gates the rest

| # | item | file | done when |
|---|---|---|---|
| **E1** | **A frame-rate number for the district, before and after this list.** Nothing in today's work has been measured for cost; see `memory: frame-rate-measurement` for the flag that can actually time a frame and the two traps that lie. | harness | a before/after ms figure at the same camera on the live site, recorded here |
| E2 | **An emissive-quad census.** Count `mode: 1, glow > 0` props in the street scene now, and after. The ceiling is documented but the current number is not. | harness | a number in this file |

### E1 · answered 2026-08-09 — no regression, but the district misses 60 fps and always did

Three runs each, quiet machine, exclusive gate slot, `ANGLE Metal Renderer: Apple M3`.

| | med ms | p95 ms | props |
|---|---|---|---|
| before (`2a9c079`) | 9.7 / 9.3 / 8.8 → **9.3** | 22.9 / 20.0 / 19.6 → **20.0** | 15,848 |
| after (live, `b07a3900`) | 9.7 / 8.9 / 9.1 → **9.1** | 22.9 / 19.5 / 18.9 → **19.5** | 16,740 |

**This wave cost nothing measurable** — both deltas are inside run-to-run spread. But **p95 ~19–20 ms
against a 16.7 ms budget is ~50 fps at the 95th percentile** while the median reports >100 fps. That
is pre-existing and still open.

Two things this cost to learn, both worth keeping:
- **The installed Google Chrome headless is wedged on this machine** (hangs at init, never binds
  devtools). Every harness works again with
  `export CHROME=".../ms-playwright/chromium_headless_shell-1234/chrome-mac-arm64/../chrome-headless-shell-mac-arm64/chrome-headless-shell"`.
- **`.fpscheck.js:347` and `.audit.js:2194` hardcode `http://127.0.0.1:8000`**, so neither can
  measure the live site the project's own rule requires. Both need a URL env var.

### E2 · answered 2026-08-09 — +13 emissive quads

Counted on the built scene (`scene.props`, `mode === 1 && glow > 0`), **pinned to 19:00** — `glow` is
rewritten by the day/night tick, so an unpinned census is not reproducible (it drifted 1,680→1,684
across two runs before pinning). A source grep cannot answer this: it conflates the `glow:` material
property with `build.js`'s `glow()` floor-pool helper, and misses every procedural loop.

| | props | mode 1 | **emissive** |
|---|---|---|---|
| before (`2a9c079`) | 15,848 | 2,838 | **1,719** |
| after (live) | 16,740 | 3,295 | **1,732** |
| delta | +892 | +457 | **+13** |

**Budget respected.** The +457 new `mode: 1` props carry no glow — the cheap form A3/A4/D3/D5 ask
for. D2 confirmed as one quad per block, not per unit. L4 added zero emissive.

> Full gate report, including a REJECT on item A4, in `.reports/GATE-storefronts.md`.

---

## Lane assignments — one file, one owner

| lane | files | items |
|---|---|---|
| **L1 · shell** | `js/street.js` | A1, A7, A9 (alley half), A11, D1, D2, D4 |
| **L2 · alley dressing** | `js/street-retail.js` | A2, A3, A4 (alley half), A5, A6 (alley half), A8, D3 (alley half), D5, D6 |
| **L3 · the lane** | `js/street-lane.js` | A4 (lane half), A6 (lane half), A9 (lane half), A10, A12 (lane half), B1–B6, C1–C5, D3 (lane half) |
| **L4 · civic + road** | `js/street-civic.js`, `js/street-road.js` | A12 (footway half), B7, B8, B9, B10 |
| **gate** | read-only | re-verifies every lane's claims on the live site, owns E1 and E2 |

`js/street-alley.js`, `js/street-west.js`, `js/street-stall.js`, `js/street-cycles.js` and
`js/street-traffic.js` are **not** in any lane. Nothing here needs them.
