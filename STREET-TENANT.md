# 街 — the district contract

**Read this instead of `js/street.js`.** That file is 4,000 lines and has no header contract, which
is why the storefront wave's four lanes each spent about ten turns re-deriving the same constants
out of it — roughly 600k input-equivalents per wave, measured. Everything a district builder needs
is below. Same job `MALL-TENANT.md` and `HOTEL-TENANT.md` do for their buildings.

If a number here disagrees with the source, the source wins and **this file is wrong and must be
fixed** — a contract nobody trusts costs more than no contract.

---

## What the shell owns, and what it does not

`js/street.js` owns the floor, the zone declarations, `roomAt`, `spawn`, `setNight`/`setWind`, the
tick dispatch, and the *fabric*: the carriageway and its paint, the courtyard walls and gatehouses,
your block and its shopfronts, the corner block, the far parade, the trees, the lamps, the
middle-distance city. It calls every registered district builder from `buildDistricts()`.

Districts register against `StreetFit` and each owns exactly one file. **Never edit another
district's file.** The registry is `StreetFit['<name>'] = S => {…}`, optionally with
`StreetFit['<name>'].tick = (t, body, mins) => {…}` for anything that moves.

Live districts: `entry alley stall road traffic cycles retail civic west hospital hotel bank lane`.

## `S`, the toolkit

Builders: `box cyl ball taper flat glyphs cap solid blocker glow thing light shade` plus
`C G col` (colour, gloss constants, the palette) and `props` / `things` getters.

Coordinate contract on `S`: `AX0 AX1 AZ SZ NB DOOR RD0 RD1 SW1 SHOPX`, the `road` sub-object
(`z0 z1 mid north south bikeW bikeE`), and the sign datum below. A district that measures off a
neighbour instead of off `S` is the bug this contract exists to stop.

`shade` is wrapped rather than passed straight through: `build.js`'s returns nothing, so a district
with a MOVING prop had no handle on its contact shadow. `S.shade` returns the pushed record.

## The sign datum — not negotiable

```
S.FASCIA  3.46   S.FASCIAH  .68     name boards, band 3.12 .. 3.80
S.BLADE   2.55   S.BLADEH   .56     侧招 box signs, band 2.27 .. 2.83
```

Both come out of measured clear bands on the block: brick plinth 0 .. 1.40, string course
2.89 .. 3.11 (`FL - .10`, 0.22 deep), first balcony slab 3.82 .. 3.92 (`f=1`, `y - .78` at
`FL + 1.55`), `FL = 3.10`.

Before this existed, three boards on one wall sat at 2.96 / 3.42 / 3.50 with three depths and three
glyph sizes, and three 侧招 at 2.20 / 2.60 / 3.22 — one above the string course and two below it.
**Never pick a sign height.** `js/street-retail.js`'s own numbers were once taken when `FL` was 2.86
and were 24 cm stale in every one of them.

## Zones, and where the body can actually stand

| zone | x | z | body limit after `clampMove` r = 0.30 |
|---|---|---|---|
| `alley` | −27.0 .. 25.5 | −2.35 .. 3.35 | z −2.05 .. 3.05. **5.70 m wide; narrowest slice 1.25 m** |
| `west` | −32.2 .. −25.0 | −3.10 .. 6.40 | the square: 7.2 × 9.5 m |
| `road` | 24.0 .. 39.8 | −13.5 .. 13.5 | **x ≥ 24.30**, and ≤ 39.50 |
| `hospital-road` | 23.2 .. 27.4 | 12.8 .. 42.8 | the hospital spine, x 25.2 |
| `hotel-forecourt` | 37.35 .. 40.92 | 12.78 .. 48.25 | `S.HOTEL_ZONE` |
| `lane` | 39.30 .. 58.30 | −11.90 .. −6.50 | `S.LANE_ZONE`, the 步行街 |

The last two are published by their districts onto `S` and spread into `zones` by the shell. That
is the only way a district can add walkable ground.

**Three unreachable strips**, where props need no collider at all:
- alley south, z −2.85 .. −2.05 (0.80 m) against the block and the shopfronts;
- alley north, z 3.05 .. 3.74 (0.69 m) against the courtyard wall;
- west footway, x 23.30 .. 24.30 (1.00 m) in front of 银行 and 药店;
- far pavement, x 39.50 .. 41.60 in front of the parade.

## Building lines and frontages

```
z −2.95   NB.z1, your block's shopfront plane, x −16.5 .. 11.5, faces +z
z −3.05   the corner block's north face, x 12.0 .. 23.4, faces +z   (五金电器)
x  23.42  the corner block's EAST elevation, faces +x               (银行, 药店)
x  41.60  FX, the far building line, faces −x                       (公司, the parade)
z  3.95   CWZ, the courtyard wall line, face 3.74, top 2.55
x  41.60 .. 59.00, z −12.60 .. −5.80   新天地步行街, two frontages facing each other
```

Lane convention, written down because a first draft got it backwards on both sides: **`n` is a
frontage's outward normal along z, +1 south and −1 north.** In front is `zf + n·d`; the mass behind
is `zf − n·WALL/2`; glyphs face `n > 0 ? 0 : π`.

## The doors, and which frame their `at` is in

`exit.at` is a coordinate in the **destination** scene, not in the street. The return leg lives in
the destination's own `OUT` constant and *that* is a street coordinate. Getting these the wrong way
round is silent — `setPlace` falls back to the scene's spawn.

| door | street side | goes to | return `OUT` |
|---|---|---|---|
| 单元门 | 0.00, −2.95 | `home` | `street-entry.js` |
| 老李面馆 | −5.45, −2.95 | frontage | — |
| 幸福超市 | 9.15, −2.95 | `超市` | — |
| 夜市 | 4.60, 3.95 | `nightmarket` | — |
| 地铁站 杨柳胡同 / 商务区 | 19.40, 2.30 / 38.70, −5.20 | `metro` | — |
| 公司 | 41.60, 2.20 | `office` | `office-core.js` OFFICE_OUT |
| 药店 | 23.38, −5.25 | `pharmacy` | `Street.PHARMACY_OUT` = (24.68, −3.65, +π/2) |
| 银行 | 23.42, −9.25 | `bank` | `bank.js` BANK_OUT = (24.62, −9.25, +π/2) |
| 北京新天地 | 46.60, −5.80 | `mall` | `mall.js` OUT = (46.60, −8.35, π) |
| 大超市 | 52.80, −12.60 | `market` | `market.js` OUT = (52.80, −10.05, 0) |
| 医院 / 急诊 | 23.38, 22.20 / 35.55 | `hospital` | `street-hospital.js` |
| 酒店 | 41.10, 28.40 | `hotel` | `hotel.js` HOTEL_OUT |

Facing convention: forward is `(sin yaw, cos yaw)`. Glyph yaw 0 looks along **+z**; −π/2 is −x,
+π/2 is +x, π is −z. An exit's yaw faces the body **away** from the shop, the way you leave one.

## The traps this district has already paid for

1. **Emissive quads are the budget.** `.audit.js:327` records the street **fill-rate bound, not
   geometry bound**. `mode: 1` with `glow > 0` is a light-mask quad; three dozen of them lay a
   half-transparent copy of the scene over the top of it (`street-retail.js:12`). Sign TEXT is
   `mode: 1` with **no** glow — the panel behind it is the lit part. Geometry is cheap here.
2. **Panels are `box`es, not `flat` quads.** A quad is single-sided and vanishes from behind.
   `flat` is for ground markings only.
3. **No two faces share a plane.** The smallest offset anywhere in the district is 14 mm.
4. **Moving props need `p.cx/cy/cz` rewritten with `p.m`,** or `finish()`'s cached centre culls
   them while they are on screen. And `pick()` ray-tests `p.ob`, which is the BUILD position and
   never moves — strip `ob` off anything that moves or it blocks every label behind it.
5. **A rotation about a pivot must use the prop's own pivot.** `tick`'s washing rotated each line
   about the world origin, throwing garments `|x|·sin(a)` up and down — 3.2 m in a gale.
6. **`buildDistricts()` is called after `S` is declared,** not from inside `build()`. Called from
   inside, every builder's argument is in the temporal dead zone, the try/catch swallows it, and
   the whole registry is dead while `.bootcheck.js` reports the game clean.
7. **Never place anything by eye.** Drive the real `Street.clampMove` at r = 0.30.

## Verification

The canonical URL is **https://jcollin45.github.io/beijing-life/** and a screenshot off `:8000`
does not count (`.claude/CLAUDE.md`). Push, wait ~70 s, look. Two things that will waste your time
if you do not know them:

- **`CAM.fx/fz` is a smoothed follow point.** Teleporting the body with `P.x/P.z` does not move the
  camera; it eases over several seconds. Set `CAM.fx = CAM.px = P.x` and `CAM.fz = CAM.pz = P.z` or
  every screenshot is framed from where the camera used to be.
- **A deploy watcher that checks only your new file will lie.** `index.html` carries the script
  list and deploys separately; check it too, or you will debug a district that was never loaded.

Driving a door over a debugging connection: `E` inspects, **`Q` acts**. Dispatch a real
`KeyboardEvent('keydown', {key:'q'})` on `window`, then call `__game.tickUse(0.25)` in a loop —
the page is rAF-throttled between tool calls, so the action will not otherwise progress.
