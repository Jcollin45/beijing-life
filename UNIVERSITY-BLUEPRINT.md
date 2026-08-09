# 北京文华大学 · expanded campus masterplan

A build-ready replacement plan for `js/campus.js`. This is an exterior campus plan, not a loose
wish list: every building, path, wall run, portal, collision box, repeated object group, and
integration change has a coordinate or a generation rule. The two existing interior scenes
(`classroom` and `library`) remain separate places and connect through the portal anchors below.

Read coordinates in metres in the game's existing convention:

- `+x` = east, `-x` = west, `+z` = north/inward from the main gate, `y` = up.
- Yaw `0` faces `+z`; `Math.PI / 2` faces `+x`; `Math.PI` faces `-z`.
- `box(x,y,z,sx,sy,sz)` uses a centre and **full** dimensions. `flat()` does the same in x/z.
- A `model()` y coordinate is its floor anchor; a primitive box's y coordinate is its centre.
- Base ground is `y=0`; surface overlays are `y=.004..012`; shadows are normally `y=.020`.
- The player is a 0.30 m radius body. Visible meshes never collide automatically: every hard
  footprint listed here needs a `solid()`, and every major building needs a `blocker()`.

This plan keeps the current south gate and metro identity, fixes the unsafe metro spawn, aligns the
whole campus on the existing `x=-3` ceremonial axis, and moves the currently overlapping building
masses into four readable districts.

---

## 1. Outcome and organizing idea

The current map is a 37.2 × 25.2 m walk zone trying to hold a teaching block, library, canteen,
dormitory, court, bicycle park, station, and forecourt. Several authored footprints overlap:

- the canteen collider intersects the bicycle shelter;
- the basketball court intersects the dormitory and library areas;
- the teaching collider seals both north corners against the canteen and library;
- the classroom return and metro arrival are inside collision clearance.

The replacement is a compact urban campus, **96 m east-west by 80 m north-south**, organized as:

1. **Arrival court** (`z=-13..18`): metro, historic gate, security, campus map, flag plaza,
   bicycle hub, canteen, dormitory, printing, and the existing student-life objects.
2. **Academic quad** (`x=-28..28, z=18..63`): an uninterrupted central spine, two shaded lawns,
   a marked jogging loop, outdoor study, and Teaching Block One as the north terminus.
3. **West academic/service edge** (`x=-48..-28`): canteen, administration/international services,
   and the science/innovation building, with deliveries kept on the wall side.
4. **East student-life edge** (`x=28..48`): dormitory, basketball court, student centre/clinic,
   and library. No food deliveries or court noise crosses the quiet quad.

The visual language remains the one already established in `campus.js`: rendered concrete, brick
plinths, stone caps, recessed windows, external AC units, blue wayfinding, red/gold institutional
signs, galvanized steel, bicycles, practical hardscape, and warm pools of light at night.

---

## 2. Frozen coordinate contract

```js
const CAMPUS_CONTRACT = window.CampusContract = Object.freeze({
  layoutVersion: 2,
  x0: -48.0, x1: 48.0,
  z0: -13.0, z1: 67.0,
  cx:   0.0, cz: 27.0,
  w:   96.0, d: 80.0,
  spawn: Object.freeze({ x: -11.40, z: -9.35, yaw: 0 }),
});

// Compatibility metadata. Outdoor movement must use the explicit zones below,
// not assume a symmetric z extent around the origin.
const RX = 48.0;
const RZ = 40.0;
const GROUND = { x: 0, z: 27, w: 104, d: 88 };
const AXIS_X = -3.0;
const SPAWN = CAMPUS_CONTRACT.spawn;
const OUT = SPAWN;
```

The base ground extends 4 m past the perimeter on every side so wall footings, gate aprons, and
camera views never expose the edge. The movement zones deliberately overlap one another and cross
the wall line only at gates; perimeter-wall solids, not zone edges, enforce the boundary. Three
short gate aprons make every open gateway end at a visible rail or kerb rather than an invisible
zone clamp.

### Walkable zones

| zone id | x range | z range | purpose / light anchor |
|---|---:|---:|---|
| `campus-south` | `-47.80..47.80` | `-13.40..18.80` | arrival + student life; light `(-3,4,-1)` |
| `campus-core` | `-28.40..28.40` | `18.00..66.60` | academic quad; light `(-3,4,36)` |
| `campus-west` | `-47.80..-27.60` | `18.00..66.60` | admin/science edge; light `(-35,4,44)` |
| `campus-east` | `27.60..47.80` | `18.00..66.60` | centre/library edge; light `(36,4,44)` |
| `main-gate-apron` | `-6.35..0.35` | `-15.70..-12.60` | gate pavement; light `(-3,4,-1)` |
| `west-gate-apron` | `-50.70..-47.00` | `17.30..22.70` | west pavement; light `(-35,4,44)` |
| `east-gate-apron` | `47.00..50.70` | `17.30..22.70` | east pavement; light `(36,4,44)` |

`roomAt(x,z,previousRoomId)` should return the first zone containing the point, with the three apron
zones checked before the four campus zones. If none contains it, resolve the prior string ID back to
a zone object and then fall back to `campus-south`; never return the raw third argument or any object
without a three-number `light`:

```js
function roomAt(x, z, previousRoomId) {
  const hit = zones.find(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
  return hit || zones.find(r => r.id === previousRoomId) || campusSouth;
}
```

Gate-apron outer edges receive visible rails and matching solids.
Every adjoining pair overlaps by at least 0.80 m. This is mandatory: `clampMove` insets a candidate
zone by the 0.30 m player radius and only considers zones containing the previous point, so zones
that merely touch are impassable. Preserve these overlaps if a boundary is edited.

---

## 3. Masterplan at a glance

```text
                                      NORTH  +z
 z=67  ┌───────────────────────────────┬──── service gate ────┬─────────┐
       │ SCIENCE / INNOVATION          │  TEACHING BLOCK ONE  │ LIBRARY │
 z=52  │ x -43..-28, z 40..62         │  x -19..13, 52..63   │ 30..43 │
       │                    ┌───────────┴──────────────────────┤ 38..62 │
 z=48  │ entrance ──────────┤     NORTH PROMENADE             ├─entry──│
       │                    │  shaded academic quad           │        │
       │ ADMIN              │  lawns + jogging loop + study   │ STUDENT│
 z=24  │ -43..-29, 24..36  │                                 │ CENTRE │
 z=20  ├──── west gate ─────┴──── CROSS PROMENADE ────────────┴ east ──┤
       │ CANTEEN      bicycle hub     FLAG / ARRIVAL       COURT       │
 z= 0  │ -43..-29                    x=-3                 DORMITORY    │
       │          metro       MAIN GATE + SECURITY        30..43      │
 z=-13 └─────────────── wall / gate / apron ───────────────────────────┘
       x=-48                    x=-3                                  x=48
```

The central axis is never occupied by a building mass. The flag plinth splits the marked spine, but
the full paved forecourt supplies broad bypasses on both sides; Teaching Block One is moved north so
the path terminates at its entrance instead of colliding with its wall.

---

## 4. Perimeter walls, gates, and visible scene edges

### 4.1 Standard wall recipe

Every perimeter run is a 0.36 m thick, 2.20 m high red-brick wall with a rendered inner face and a
stone cap. For a horizontal run `(x0..x1 at z)`:

```js
box((x0+x1)/2, 1.10, z, x1-x0, 2.20, .36, held(col.brickD,S.brick),
    { hard:true, mode:11, gloss:G.matte, ...S.brick });
box((x0+x1)/2, 2.26, z, x1-x0+.10, .12, .46, col.stoneL,
    { hard:true, mode:13, gloss:.18 });
// insideSign is +1 on south walls and -1 on north walls.
box((x0+x1)/2, 1.10, z + insideSign*.20, x1-x0, 2.00, .04,
    held(col.render,S.rend), { hard:true, mode:14, gloss:G.matte, ...S.rend });
solid(x0, x1, z-.18, z+.18);
```

For a vertical run, swap x/z dimensions and use `insideSign=+1` on west walls / `-1` on east
walls. Give each wall run its own tag (`围墙-SW`, `围墙-EN`, etc.) rather than one campus-wide wall
tag. Add a `blocker` with `top=2.45` to the same AABB.

### 4.2 Exact wall runs

| id | centre `(x,z)` | full size `(x,z)` | solid AABB | note |
|---|---:|---:|---:|---|
| `W-SW` | `(-27.875,-13)` | `40.25 × .36` | `x -48..-7.75, z -13.18..-12.82` | south wall west of main gate |
| `W-SE` | `(24.875,-13)` | `46.25 × .36` | `x 1.75..48, z -13.18..-12.82` | south wall east of main gate |
| `W-WS` | `(-48,2)` | `.36 × 30` | `x -48.18..-47.82, z -13..17` | west wall south of side gate |
| `W-WN` | `(-48,45)` | `.36 × 44` | `x -48.18..-47.82, z 23..67` | west wall north of side gate |
| `W-ES` | `(48,2)` | `.36 × 30` | `x 47.82..48.18, z -13..17` | east wall south of side gate |
| `W-EN` | `(48,45)` | `.36 × 44` | `x 47.82..48.18, z 23..67` | east wall north of side gate |
| `W-NW` | `(-8.5,67)` | `79 × .36` | `x -48..31, z 66.82..67.18` | north wall west of service gate |
| `W-NE` | `(43.5,67)` | `9 × .36` | `x 39..48, z 66.82..67.18` | north wall east of service gate |

### 4.3 Gates

| id | opening | construction | collision / edge treatment |
|---|---|---|---|
| `G-MAIN` | south, clear `x=-6.65..0.65` | preserve current piers at `(-7.2,-13)` and `(1.2,-13)`, 1.10 m square × 4.20 m; truss centred `(-3,-13)`, red/gold `北京文华大学`; lions at `(-6,-12.7)` and `(0,-12.7)`; stele `(3.6,-11.6)` | keep clear through the gate; apron ends at a 0.18 m curb and pedestrian rail centred `(-3,-15.90)`, solid `x=-6.7..0.7,z=-16.05..-15.75` |
| `G-WEST` | west wall, `z=17..23` | 0.80 m square × 3.20 m stone piers at `(-48,17)` and `(-48,23)`; blue `西门` board at y 3.45 | open to apron; outer rail at x `-50.90`, solid `x=-51.05..-50.75,z=17..23` |
| `G-EAST` | east wall, `z=17..23` | same recipe; `东门` board; piers `(48,17)`, `(48,23)` | open to apron; outer rail at x `50.90`, solid `x=50.75..51.05,z=17..23` |
| `G-NORTH` | north wall, `x=31..39` | service gate with two 4 m steel sliding leaves, sign `后勤通道`, warning lamp at `(35,3.1,66.7)` | closed in v2: one solid `x=31..39,z=66.70..67.05`; no apron zone |

The wall, gate piers, apron rails, and walk-zone edges must land together. Do not leave a visible
opening against an invisible clamp.

Side-gate boards are `2.2×.46×.12` m (width/height/depth), centred at y=3.45; the west board is at
`(-47.88,3.45,20)`, yaw `Math.PI/2`, and the east board at `(47.88,3.45,20)`, yaw
`-Math.PI/2`. The closed north leaves are steel boxes centred `(33,1.25,66.78)` and
`(37,1.25,66.78)`, each `4×2.5×.12`; their single collision AABB remains the table value. Every
apron end rail is a 1.10 m high steel box whose x/z footprint equals its listed solid AABB; centre
y=.55. Gate-pier mesh footprints and solids are identical. The main truss/name/lion meshes are
copied without dimensional changes from the existing `campus.js` component.

---

## 5. Ground and circulation schedule

All paths reuse `S.path` at a 0.54 m material repeat. Main ceremonial paving is pale; service paving
is darker; court and jogging marks use asphalt. Paint and inset strips sit 0.003–0.006 m above their
supporting surface.

| id | centre `(x,z)` | size `(w,d)` | surface | role |
|---|---:|---:|---|---|
| `P-FORECOURT` | `(-1,-.25)` | `42 × 24.5` | pale paving | arrival court, `x=-22..20,z=-12.5..12` |
| `P-SPINE` | `(-3,19.7)` | `5.2 × 64.6` | pale wide slabs | gate to teaching steps, `z=-12.6..52` |
| `P-CROSS` | `(0,20)` | `96 × 4.8` | pale wide slabs | west gate to east gate, `x=-48..48,z=17.6..22.4` |
| `P-QUAD-S` | `(-3,22)` | `50 × 4` | pale paving | south side of academic loop |
| `P-QUAD-N` | `(-3,50)` | `50 × 4` | pale paving | north promenade / teaching forecourt |
| `P-QUAD-W` | `(-22,35)` | `4 × 26` | pale paving | west loop, `z=22..48` |
| `P-QUAD-E` | `(20,35)` | `4 × 26` | pale paving | east loop, `z=22..48` |
| `P-CANTEEN` | `(-25.5,2.5)` | `7 × 4` | darker paving | east canteen door to forecourt |
| `P-DORM` | `(25,-2)` | `10 × 4` | darker paving | arrival court to west dorm door |
| `P-ADMIN` | `(-26.5,30)` | `5 × 4` | pale paving | admin entry to west loop |
| `P-STUDENT` | `(26,28.5)` | `8 × 9` | pale paving | shared student-centre / clinic entry plaza |
| `P-SCIENCE` | `(-25,50)` | `6 × 4` | pale paving | science entry to north promenade |
| `P-LIBRARY` | `(26,50)` | `8 × 4` | pale paving | library entry to north promenade |
| `P-BIKE` | `(-16.5,3)` | `13 × 10` | darker paving | bicycle shelter pad |
| `P-COURT` | `(36,13)` | `14 × 8` | asphalt | compact basketball court; 1 m clear of east service lane |
| `P-W-SERVICE` | `(-45.5,27)` | `3 × 76` | dark concrete | wall-side deliveries, broken around west gate |
| `P-E-SERVICE` | `(45.5,27)` | `3 × 76` | dark concrete | maintenance / fire access, broken around east gate |
| `P-N-SERVICE` | `(0,65)` | `90 × 3` | dark concrete | rear fire/service link, `z=63.5..66.5` |

`P-W-SERVICE` and `P-E-SERVICE` are rendered as separate runs on either side of their gate gaps.
They are scenery/maintenance lanes, not moving vehicle systems in v2.

### Quad landscape and jogging line

- West shaded lawn: `x=-18..-6.4, z=24..46`, flat centre `(-12.2,35)`, size `11.6 × 22`.
- East shaded lawn: `x=.4..18, z=24..46`, flat centre `(9.2,35)`, size `17.6 × 22`.
- Lawn kerbs are 0.18 m wide × 0.14 m high and visual-only—do **not** call `solid()`, because this
  engine's 2D solids are infinitely high and would turn a step-over kerb into a wall. Exact runs:
  west lawn north `x=-18..-6.4,z=46`, east edge `x=-6.4,z=24..46`, south segments
  `x=-18..-17.2` and `-14.8..-9.2` at z=24, and west-edge segments z=`24..28.8`,
  `31.2..40.8`,`43.2..46` at x=-18. East lawn north `x=.4..18,z=46`, west edge
  `x=.4,z=24..46`, south segments x=`.4..9.8`,`12.2..18` at z=24, and east-edge segments
  z=`24..28.8`,`31.2..40.8`,`43.2..46` at x=18. Every omitted interval is a bench-pad opening.
- Jogging centreline: `(-19.0,23.0) → (19.0,23.0) → (19.0,47.0) → (-19.0,47.0) → close`.
  Draw a 0.12 m red line with 0.45 m corner dots and metre marks every 10 m. It is paint only,
  not a collider. One lap is approximately 124 m and teaches `跑步` without consuming more land.
- Tactile route: draw a 0.30 m yellow strip through the exact main polyline
  `(-11.4,-9.35)→(-6,-7.5)→(-3,-7.5)→(-3,4.8)→(-5,4.8)→(-5,8.2)→(-3,8.2)→(-3,50)`;
  the west detour clears the flag plinth. Branch A continues `(-3,50)→(27.3,50)` to the library;
  Branch B ends at `(-3,48.4)` for the classroom doors. Use 0.10 m long raised bars every .30 m,
  y=.014; tactile geometry is visual-only and has no solid.

---

## 6. Building schedule

Dimensions below are outer wall lines. Collision boxes add 0.20 m. Steps and entrance canopies
project into paths but never reduce a clear path below 2.0 m.

| id | building | footprint `(x0..x1, z0..z1)` | height / floors | public face and entry |
|---|---|---|---|---|
| `B01` | 第一教学楼 | `-19..13, 52..63` | 17.70 m / 5 | south; `(-3,52)`, building focus `(-3,47.0)` |
| `B02` | 图书馆 | `30..43, 38..62` | 14.00 m / 4 | west; `(30,50)`, focus `(27.3,50)` |
| `B03` | 学生食堂 | `-43..-29, -7..12` | 5.80 m / 1 | east; `(-29,2.5)`, focus `(-26.6,2.5)` |
| `B04` | 学生宿舍 | `30..43, -9..7` | 19.00 m / 6 | west; `(30,-2)`, focus `(27.4,-2)` |
| `B05` | 行政楼·国际学生中心 | `-43..-29, 24..36` | 13.60 m / 4 | east; `(-29,30)`, focus `(-26.6,30)` |
| `B06` | 科学与创新楼 | `-43..-28, 40..62` | 16.20 m / 4 | east; `(-28,50)`, focus `(-25.5,50)` |
| `B07` | 学生活动中心·校医院 | `30..43, 23..34` | 10.20 m / 3 | west; centre door `(30,27)`, clinic door `(30,31)` |
| `B08` | 门卫·访客室 | `6.4..12.4, -12.4..-7.0` | 3.20 m / 1 | west/south; service window `(6.4,-9.5)` |

### 6.1 Shared exterior grammar

All multi-storey blocks use these rules unless their own section overrides them:

- Main walls: `S.rend` or `S.lib`, `mode:14`, concrete repeat 2.4–3.0 m.
- Plinth: brick facing to y=2.20, 0.30 m proud of the public face, `S.brick`, `mode:11`.
- String course: 0.18 m high at each floor line, 0.22 m deep.
- Roof: 0.60 m parapet plus 0.10 m stone/tile cap.
- Window: dark reveal, inset sky pane, vertical/horizontal steel bars, stone sill. The existing
  `campus.js` helper is named `fwin`; export it as `fwinZ` and define the perpendicular helper below.
  Here `w` spans x in `fwinZ`, spans z in `fwinX`, and `n` is the outward sign on that axis:

```js
const fwinZ = fwin;
function fwinX(x, y, z, w, h, n = -1) {
  const d = q => x + n * q;
  box(d(.030), y, z, .06, h + .14, w + .14, col.glassDark,
    {hard:true, gloss:.20});
  const warm = rnd();
  pane(box(d(.055), y, z, .02, h, w, col.glassDay,
    {hard:true, mode:1, gloss:G.glass}), warm);
  box(d(.070), y, z, .02, h, .045, col.steel,
    {hard:true, gloss:G.metal});
  box(d(.070), y, z, .02, .045, w, col.steel,
    {hard:true, gloss:G.metal});
  box(d(.085), y - h / 2 - .055, z, .17, .07, w + .26, col.renderD,
    {hard:true, gloss:G.paint});
  return warm;
}
// The fit toolkit exposes both keys explicitly:
kit.fwinZ = fwinZ;
kit.fwinX = fwinX;
```
- AC units: only above ground floor, on roughly one of every three window bays using the stable
  formula `(bay + floor*2) % 3 === 0`; `bay` and `floor` are zero-based indices.
- Public entrance: 2.4–3.6 m glazed opening, two or three shallow steps, 2.8–4.0 m canopy, bilingual
  blue directory sign, red/gold primary Chinese name.
- Every public door has a 2.0 m clear waiting rectangle outside its collider and a `thing()` focus
  within that rectangle.

For any entrance that does not override its steps/canopy, let `n` be the outward unit normal and
`t` the facade direction. Add three visual-only (no `solid`) step boxes at wall offsets
`.22,.52,.82`, full heights `.18,.12,.06`, widths `doorWidth+.8`, and depth `.34`; their bottoms
sit at y=0. Add a canopy at wall offset 1.15, y=3.10, full dimensions
`2.40×.26×(doorWidth+1.0)` with x/z swapped for north/south doors. Its two .18 m square columns sit
at offset 2.20 and `t=±(doorWidth/2+.35)` and receive `.24×.24` solids. This puts columns beyond the
2.0 m waiting rectangle. B05 and B06 use the whole default. B01 overrides the whole kit; B02,
B04, and B07 override the canopy mesh only and retain the default steps/column placement.

Non-public facades use a deterministic bay rule rather than invented windows: for each wall, start
1.8 m from a corner and step by 3.2 m while at least 1.8 m remains; at each upper floor place a
`1.75×1.45` window centred `floorBase+1.35` m above that deck. Skip a bay whose centre is within
1.2 m of an authored entrance, stair tower, sign, case, or service door. Public-facade schedules in
the building sections override this rule.

### 6.2 B01 — 第一教学楼

- Mass: centre `(-3,8.85,57.5)`, size `32 × 17.70 × 11`.
- Five floors at 3.30 m; parapet/cap brings the visible top to 18.35 m.
- South facade windows: 8 bays at `x=[-17,-13,-9,-5,-1,3,7,11]`; floors `f=1..4`; window centre
  y=`f*3.30+1.30`, size `2.50 × 1.60`.
- Entrance: centre `(-3,52)`, four glass leaves centred at x `[-5.4,-3.8,-2.2,-.6]`; canopy centre
  `(-3,3.10,49.9)`, size `10 × .34 × 4.2`; columns `x=-7.2,1.2`, z=48.5.
- Three steps: centres z=`48.4,48.9,49.4`, heights `.18,.36,.54`, widths `9.6,9.0,8.4`.
- Signs: `第一教学楼` over the doors at `(-3,3.48,51.82)`, slogan `厚德博学` on the parapet.
- Outdoor study tables: two groups at `(-11,46)` and `(5,46)`, each 1.4 × .8 m with two stools,
  open book, individual table solid only. The `(5,46)` table retains the `书桌` interaction.
- Body solid: `x=-19.20..13.20,z=51.80..63.20`.
- Camera blocker: same x/z, top 18.70.
- Interactions:
  - `教学楼` position `(-3,4.30,48.8)`, focus `(-3,47.0)`, reach 3.0.
  - `教室` position `(-3,3.00,51.3)`, focus `(-3,48.4)`, reach 2.8; `go:'classroom'` remains in USE.
  - Classroom return becomes `{x:-3,z:47.20,yaw:0}`; this is 4.6 m south of the mass solid.

### 6.3 B02 — 图书馆

- Mass: centre `(36.5,7.0,50)`, size `13 × 14 × 24`, using `S.lib`.
- Four floors at 3.20 m plus parapet. Quiet west face toward the quad; no door faces the court.
- West facade: 7 tall bays at `z=[40,43.3,46.6,49.9,53.2,56.5,59.8]`; reveal size
  `.20 × 8.0 × 2.25`, pane at x=29.92, sill at y=1.8. Upper transoms at y=3.2,6.4,9.6.
- Entrance recess: west face, centre `(30,1.55,50)`, opening `.45 × 3.10 × 3.20`; glazed leaves
  at x=29.76. Canopy centre `(28.9,3.20,50)`, size `2.4 × .26 × 4.4`.
- Vertical sign `图书馆` at `(29.70,3.70,52.8)`, yaw `-Math.PI/2`.
- Six bicycle hoops outside the library at x=27.8, z=`54..59` in 1 m steps; no loose bikes on
  the entry line.
- Body solid: `x=29.80..43.20,z=37.80..62.20`; blocker top 14.60.
- `图书馆` interaction position `(29.55,2.60,50)`, focus `(27.30,50)`, reach 2.6; attach existing
  `.exit={place:'library',at:{x:1.4,z:-3.3,yaw:.02*Math.PI}}`.
- Library interior return becomes `{x:27.20,z:50,yaw:Math.PI/2}`.

### 6.4 B03 — 学生食堂

- Mass: centre `(-36,2.90,2.5)`, size `14 × 5.80 × 19`, rendered plaster `S.plas`.
- East wall has a tiled lower 1.40 m band. Public opening centre `(-29,1.55,2.5)`, wall-axis width
  4.2 m; roller shutter stored at y=3.35. Warm interior slab and three silhouettes remain.
- Red vertical fascia `学生食堂` centred `(-28.72,4.25,4.0)`, yaw `Math.PI/2`.
- Menu board at `(-28.78,1.75,-1.0)`; retain today's four dish/price rows.
- Vending machine moves to `(-28.35,1.10,8.0)`, focus `(-26.9,8.0)`.
- Jianbing cart moves to `(-26.0,1.0,-3.5)`, customer focus `(-24.2,-3.5)`; queue marks run south
  at `(-24.2,-3.5),(-24.2,-4.7),(-24.2,-5.9)`, entirely west of the bicycle shelter pad and
  outside the canteen waiting rectangle `x=-28.8..-26.8,z=.1..4.9`.
- Rear delivery door at `(-43,1.25,5.5)` opens only visually to the west service lane. The service
  screen is centred `(-44.10,1.10,5.5)`, size `.12×2.20×5.0`, solid
  `x=-44.16..-44.04,z=3..8`. Two locked gas cages at `(-44.55,.75,4.2)` and
  `(-44.55,.75,6.8)` are `.70×1.50×1.00` each; one combined solid is
  `x=-44.90..-44.20,z=3.70..7.30`. They leave the western 2.1 m of the visual service lane clear.
- Body solid: `x=-43.20..-28.80,z=-7.20..12.20`; blocker top 6.20.
- `食堂` interaction `(-28.55,2.4,2.5)`, focus `(-26.6,2.5)`, reach 2.6.

### 6.5 B04 — 学生宿舍

- Mass: centre `(36.5,9.50,-1)`, size `13 × 19 × 16`, six floors at 3.0 m.
- West facade: five window bays at z=`[-7,-4, -1,2,5]`, floors `1..5`; 1.75 × 1.50 m windows.
- West entrance `(30,1.60,-2)`, 2.60 m wide; canopy `(28.9,3.10,-2)`, size `2.4 × .28 × 3.6`;
  three steps project to x=28.6.
- Name `学生宿舍` at `(29.78,3.55,-2)`, yaw `-Math.PI/2`.
- Parcel lockers: 12 blue/grey doors in a 3 × 4 grid centred `(29.55,1.20,3.5)`; locker solid
  `x=29.25..29.75,z=1.55..5.45`; `校园快递柜` focus `(27.8,3.5)`. Delivery trolley centre
  `(27.8,.48,5.2)`, size `.80×.96×.60`, solid `x=27.40..28.20,z=4.90..5.50`.
- Two roof laundry frames, centred `(34,19.75,-3)` and `(39,19.75,1)`, are each
  `2.4×1.4×.08` steel rectangles with three wire lines and no body solid. Override the common AC rule with
  exactly six west-facade units at `(bay,floor)=[(0,2),(1,4),(2,1),(3,3),(4,2),(4,5)]`, where
  bay `0..4` maps to z=`[-7,-4,-1,2,5]` and floor `1..5` maps to y=`floor*3+1.35`.
- Body solid: `x=29.80..43.20,z=-9.20..7.20`; blocker top 20.0.
- `宿舍` interaction `(29.55,4.0,-2)`, focus `(27.4,-2)`, reach 2.6.

### 6.6 B05 — 行政楼 · 国际学生中心

- Mass: centre `(-36,6.80,30)`, size `14 × 13.60 × 12`, four floors at 3.1 m.
- East entrance `(-29,1.55,30)`, 3.20 m wide with a 4.2 m canopy and two stone columns.
- East facade window bays at z=`[25.5,28.5,31.5,34.5]`, floors `1..3`.
- Primary sign `行政楼`; blue subordinate board `国际学生中心 / International Student Centre`.
- Exterior directory O07 is wall-mounted at `(-28.70,1.65,27)`, size `.16×1.70×1.80` (x/y/z),
  facing the east path and fully covered by the building body solid.
- Two flag sockets at `(-27.2,25.5)` and `(-27.2,34.5)`; each has a .24 m square base solid and
  a .05 m radius pole. Flags remain below the roofline and outside the clear entrance rectangle
  `x=-28.8..-26.8,z=28.1..31.9`.
- Body solid: `x=-43.20..-28.80,z=23.80..36.20`; blocker top 14.20.
- Interactions: `行政楼` focus `(-26.6,30)` and `学生服务中心` focus `(-26.6,27)`.
  The student-services action is the authoritative source of the persistent `学生证` used by the
  mall cinema discount.

### 6.7 B06 — 科学与创新楼

- Mass: centre `(-35.5,8.10,51)`, size `15 × 16.20 × 22`, four floors at 3.65 m.
- East entrance `(-28,1.60,50)`, 3.20 m wide; glass stair tower footprint
  `x=-28.60..-27.55,z=55..60`, height 16.2 m, on the northeast corner; it is covered by the B06
  body collision and gets no separate solid. Add the blue `实验室` directory beside the door.
- East facade bays at z=`[42,45.5,49,52.5,56,59.5]`, floors `1..3`; alternate bays use a taller
  lab-window transom. South wall has four ordinary office windows.
- Roof objects: six exhaust stacks at x=`[-40.5,-38.5,-36.5,-34.5,-32.5,-30.5]`, z=58.5,
  heights 1.1/1.5 alternating; one screened mechanical box at `(-40,16.7,43)`.
- Ground display: sealed glass innovation case at `(-25.6,1.25,54)`, 1.8 × 1.8 × .7 m, outside
  the through-route.
- Body solid: `x=-43.20..-27.80,z=39.80..62.20`; blocker top 16.90.
- `实验楼` interaction position `(-27.55,3.0,50)`, focus `(-25.5,50)`, reach 2.6.

### 6.8 B07 — 学生活动中心 · 校医院

- Mass: centre `(36.5,5.10,28.5)`, size `13 × 10.20 × 11`, three floors at 3.0 m.
- West facade is split by use, not by color: student-centre door at `(30,27)`, clinic door at
  `(30,31)`, each 2.20 m wide with a shared 8 m canopy centred `(28.9,3.05,29)`.
- Signs: `学生活动中心` above the south door; green cross and `校医院` above the north door.
- Ground windows reveal a club notice wall in the south half and clinic waiting silhouettes in the
  north half. Do not create a false enterable interior until a separate place exists.
- Body solid: `x=29.80..43.20,z=22.80..34.20`; blocker top 10.80.
- Interactions: `学生服务中心` is **not** duplicated here; use `活动中心` at focus `(27.4,27)` and
  `校医院` at `(27.4,31)`. Distinct global labels prevent accidental reuse of unrelated USE rows.

### 6.9 B08 — 门卫 · 访客室

- Mass: centre `(9.4,1.60,-9.7)`, size `6 × 3.20 × 5.4`, plaster with a brick plinth.
- Sliding window on west face at x=6.36,z=-9.5; south window looks toward the main gate.
- Roof sign `门卫`; barrier control panel, wall clock, desk silhouette, and two CCTV cameras.
- Body solid: `x=6.20..12.60,z=-12.60..-6.80`; blocker top 3.60.
- Guard standing point `(4.8,-9.6)` stays outside every solid and outside the main spine.

---

## 7. Outdoor object manifest

This section is exhaustive for non-building authored objects. Repeated fixtures use arrays so an
AI can build them without inventing coordinates. Do not add filler between these points until the
navigation and prop budgets pass.

### 7.1 Historic arrival objects

| object | coordinate / rule | collider |
|---|---|---|
| university gate | existing geometry, centred `(-3,-13)` | two pier solids plus lion plinths; clear gap remains open |
| stone stele | centre `(3.6,1.10,-11.6)`, size `2.4×2.2×.44` | `x=2.2..5.0,z=-12.0..-11.2` |
| stone lions | `(-6,-12.7)` and `(0,-12.7)` | `.68 × .56` each |
| metro mouth | retain centre `(-11.4,-11.7)` and signs | existing `x=-13.5..-10.1,z=-12..-9.9` solid; spawn moved clear |
| campus map | board centre `(15,1.55,-2.5)`, width 3.2, facing south; `校园地图` | `x=13.3..16.7,z=-2.75..-2.35` |
| noticeboard | three panels centre `(9,1.50,-2.5)`, total width 6.2, facing south | `x=5.9..12.1,z=-2.8..-2.2` |
| flagpole | `(-3,4.2,6.5)`, 8.4 m pole, 1.4 m square plinth | `x=-3.8..-2.2,z=5.7..7.3` |
| school seal mosaic | flat centre `(-3,.014,11.5)`, diameter 2.6 m | none |
| print kiosk | centre `(-10.5,.60,15)`, size `1.6×1.2×1.0`, hatch faces south | `x=-11.35..-9.65,z=14.45..15.55` |

The flag plinth leaves two 1.8 m marked lanes inside the 5.2 m spine, while the surrounding paved
forecourt provides more than 4 m of unobstructed bypass on either side. The gate/truss, flag/plinth,
seal mosaic, teaching steps/canopy/door, and their interaction glyphs are the complete axial-object
exception list. Nothing else may be placed inside `x=-6..0,z=-12..52`.

### 7.2 Bicycle hub

- Pad: `x=-23..-10,z=-2..8`.
- Canopy: centre `(-16.5,2.76,3)`, size `12.4 × .12 × 9.2`, tarpaulin `S.tarp`.
- Posts: x=`[-22,-16.5,-11]`, z=`[-1.5,7.5]`, six 0.15 m diameter posts with individual
  `0.22 × 0.22` solids.
- Rack strips: `x=-22..-11,z=-.70..1.10` and `x=-22..-11,z=4.90..6.70`; these two AABBs
  are the only body solids for the packed bicycle rows.
- Bikes: for each row `{z:0.20,yaw:0}` and `{z:5.80,yaw:Math.PI}`, create 16 bikes at
  `x=-21.75 + i*.70`, `i=0..15`. Keep the central aisle `z=1.10..4.90` clear.
- Charging cabinet: centre `(-10.7,.90,3.0)`, size `.80×1.80×.45`, focus `(-9.5,3.0)`;
  six numbered charging sockets and solid `x=-11.15..-10.25,z=2.55..3.45`.
- `自行车` interaction position `(-10.3,1.1,5.8)`, focus `(-8.9,5.8)`, reach 2.2.

Shared/stray bicycles, each `[x,z,yaw]`:

```js
[
  [-8.0,-7.5,.20], [3.0,-7.0,-.30], [18.0,-5.0,.50], [24.0,-5.5,1.20],
  [-25.0,11.5,.10], [-8.0,18.0,.60], [9.0,18.0,-.25], [24.0,18.0,.15],
  [-25.0,23.0,1.40], [-18.0,48.0,.20], [18.0,48.0,-.20], [27.0,33.0,.80],
]
```

These are scenery only; no additional `solid()` is needed for single bicycles. Keep all twelve at
least 0.65 m off the centreline of the nearest path.

### 7.3 Trees

Use the existing `tree(cx,cz,h)` helper. Heights cycle `[5.6,6.0,6.3]`; each trunk gets the existing
0.56 m square solid and a 2.8 m shade. Exact centres:

```js
const CAMPUS_TREES = [
  [-26,-10],[25,-10],[-26,16],[26,16],
  [-19,-8],[-11,-6],[20,-9],[21,-5],[-22,13],[18,13],
  [-16,26],[-9,28],[-16,39],[-9,43],
  [5,26],[13,28],[6,39],[14,43],
  [-26,45],[25,26],[26,39],[25,47],
];
```

No crown may overhang a primary sign by more than 25% of its width when seen from the sign's focus.

### 7.4 Lamp standards

Reuse the existing 4.6 m standard, emissive lens, ground glow, and `B.light`. The renderer submits
only the nearest eight outdoor lights, so all may exist but they must share one primitive/material
batch. Exact centres:

```js
const CAMPUS_LAMPS = [
  [-7,-8],[1,-8],[-7,2],[1,2],[-7,12],[1,12],
  [-12,25],[1,25],[-7,36],[1,36],[-12,48],[6,48],
  [-24,28],[-24,40],[22,28],[22,40],
  [-26.5,5.5],[27,1.5],[25,9],[23,17],
];
```

Each pole solid is `x=lx-.13..lx+.13,z=lz-.13..lz+.13`. Lamp pools are 6 m square, alpha 0.30 at
full night. Every standard calls `B.light(lx,4.40,lz,[1,.88,.66],.95,4.6)`. Add the following
fixed entrance/task lights; the last two numbers are power and radius and all use `[1,.86,.62]`.
Only the renderer's nearest eight are submitted.

```js
const CAMPUS_LOCAL_LIGHTS = [
  ['main-gate',-3,3.8,-12.2,1.10,5.5], ['metro',-11.4,2.7,-10.2,.90,4.0],
  ['print',-10.5,2.0,14.5,.70,3.0],    ['canteen',-27.6,3.0,2.5,1.05,5.0],
  ['dorm',28.5,3.0,-2,.85,4.5],        ['admin',-27.5,3.0,30,.85,4.5],
  ['science',-26.5,3.0,50,.90,4.8],    ['teaching',-3,3.4,49.5,1.10,5.5],
  ['student',28.5,3.2,27,.80,4.2],     ['clinic',28.5,3.2,31,.80,4.2],
  ['library',28.5,3.2,50,1.00,5.0],   ['security',5.9,2.7,-9.5,.70,3.5],
  ['court',36,4.5,13,1.10,8.0],
];
```

### 7.5 Benches and outdoor study

Benches use the current 1.56 m four-slat seat with two stone legs. All yaw values are radians.

```js
const CAMPUS_BENCHES = [
  [-8,-3,0],[2,-3,0],[18,3.5,Math.PI],[-8,10,0],[3,7,Math.PI],
  [-16,23.5,0],[15,23.5,0],[-17,30,Math.PI/2],[-17,42,Math.PI/2],
  [17,30,-Math.PI/2],[17,42,-Math.PI/2],[-8,25,0],[11,25,0],
  [24,35.5,-Math.PI/2],[25,54,-Math.PI/2],
  [27,11.5,Math.PI/2],
];
```

Each bench solid is its rotated conservative AABB with 0.10 m padding. Only benches `(-8,-3)`,
`(-17,30)`, `(17,30)`, and `(25,54)` get `长椅` interaction anchors; the rest remain scenery.

```js
const INTERACTIVE_BENCHES = [
  { at:[-8,.48,-3],  focus:[-8,-2.1] },
  { at:[-17,.48,30], focus:[-16,30] },
  { at:[17,.48,30],  focus:[16,30] },
  { at:[25,.48,54],  focus:[24,54] },
]; // reach 1.8 for every row
```

Teaching-block study tables are specified in B01. Add two picnic-study tables on the lawn pads at
`(-12,34)` and `(10,34)`, each 1.8 × 1.0 m with four fixed stools. Their pads are 3.2 × 2.6 m;
only the western table receives a second `书桌` anchor, reusing the existing study action.

### 7.6 Water, waste, and service objects

```js
const FOUNTAINS = [
  [4.5,-4.5],[-9,17],[8,23.2],[-18,46.5],[18,46.5],[-24.5,33.5],[27,35.5],[25,13],
];
const SORTING_BINS = [
  [-20,-5],[18,-7],[-24.8,10.5],[26,-6.5],[-15,16],[11,23],
  [-25.5,38],[27,42],[-25,58],[25,61.5],[-27,14],[27,7.5],
];
const FIRE_FIXTURES = [
  {id:'F01',at:[-28.72,1.25,10], kind:'cabinet-x'}, // canteen east facade
  {id:'F02',at:[29.72,1.25,6],   kind:'cabinet-x'}, // dorm west facade
  {id:'F03',at:[-43.18,1.25,30], kind:'cabinet-x'}, // admin west facade
  {id:'F04',at:[-26,.52,40],     kind:'standpipe'},
  {id:'F05',at:[43.18,1.25,25],  kind:'cabinet-x'}, // student-centre east facade
  {id:'F06',at:[29.72,1.25,38.8],kind:'cabinet-x'}, // library west facade
  {id:'F07',at:[-21,.52,62],     kind:'standpipe'},
  {id:'F08',at:[18,.52,62],      kind:'standpipe'},
];
```

- Fountains use the existing teal column, basin, spout, `0.48 × 0.48` solid. The first three and
  the two library/science fountains get the exact `饮水机` anchors below; repeated anchors reuse
  the same action.
- Each sorting station has four `0.38×0.86×0.48` m bins centred at
  `x=bx+[-.66,-.22,.22,.66],y=.43,z=bz`, in the order
  `可回收物 / 厨余垃圾 / 有害垃圾 / 其他垃圾`. Use one combined solid
  `x=bx-.95..bx+.95,z=bz-.275..bz+.275`; all rows face `-z`.
- `cabinet-x` is a red wall box `.18×.90×.72` m (x/y/z), already covered by its building body
  solid; do not add a duplicate solid. `standpipe` is a red 0.14 m radius × 1.04 m cylinder with a
  chrome cap and exact solid `x=fx-.18..fx+.18,z=fz-.18..fz+.18`. The three standpipes are at
  least 0.80 m from the nearest through-route edge.
- Storm drains: place 0.45 m grates at `(-21,-10),(19,-10),(-21,16),(19,16),(-27,47),(27,47),
  (-44,30),(44,30)`. Add two 0.60 m manhole covers at `(-3,-1)` and `(-3,40)`. No solids.

```js
const INTERACTIVE_FOUNTAINS = [
  { at:[4.5,.78,-4.5], focus:[4.5,-3.7] },
  { at:[-9,.78,17],    focus:[-9,17.8] },
  { at:[8,.78,23.2],   focus:[8,22.4] },
  { at:[-18,.78,46.5], focus:[-18,47.3] },
  { at:[18,.78,46.5],  focus:[18,47.3] },
]; // reach 1.6 for every row
```

### 7.7 Wayfinding, campus services, and small authored props

| id | coordinate | content / construction |
|---|---:|---|
| `S01` | `(15,-2.5)` | campus map, south-facing, `校园地图` interaction |
| `S02` | `(3,16)` | four-way fingerpost: `教学楼 / 图书馆 / 食堂 / 宿舍` |
| `S03` | `(-24,20)` | west district board: `食堂 / 行政楼 / 实验楼` |
| `S04` | `(22,20)` | east district board: `宿舍 / 活动中心 / 校医院 / 图书馆` |
| `S05` | `(-24,49)` | `实验楼 ← / 第一教学楼 →` |
| `S06` | `(22,49)` | `第一教学楼 ← / 图书馆 →` |
| `O01` | `(29.55,1.20,3.5)` | 12-door parcel locker; solid `x=29.25..29.75,z=1.55..5.45`; label `校园快递柜` |
| `O02` | `(-10.7,.90,3)` | `.80×1.80×.45` bicycle charging cabinet; solid is specified in §7.2 |
| `O03` | `(-26,-3.5)` | animated jianbing cart; solid `x=-27.25..-24.70,z=-4.20..-2.80` |
| `O04` | `(-28.35,1.05,8)` | east-facing vending machine `.72×2.10×.70`; solid `x=-28.72..-27.98,z=7.62..8.38` |
| `O05` | `(29.70,1.55,27)` | wall-mounted club notice case `.16×1.60×1.60`; no extra solid |
| `O06` | `(29.70,1.55,31)` | wall-mounted clinic board `.16×1.60×1.60`; no extra solid |
| `O07` | `(-28.70,1.65,27)` | wall-mounted services directory `.16×1.70×1.80`; no extra solid |
| `O08` | `(29.70,1.25,49)` | wall-mounted returns/hour plate `.16×1.50×1.20`; no extra solid |
| `O09` | `(-25.6,1.25,54)` | glass case `1.8×1.8×.7`; solid `x=-26.55..-24.65,z=53.55..54.45` |
| `O10` | `(5.55,.42,-8.0)` | folding guard stool `.38×.42×.38` + thermos; solid `x=5.36..5.74,z=-8.19..-7.81` |

Wayfinding posts are 2.35 m tall, blue panels with white glyphs, and a `0.22 × 0.22` post solid.
Signs must be readable from the listed path before any tree crown or bike row.

`S02..S06` face `-z`: one `.12×2.35×.12` post centred at y=1.175 and one arm per slash-separated
destination. Arm `i` is centred at y=`2.18-i*.34`, size `1.85×.28×.08`; alternate its arrow left
and right according to the text. Their combined body solid is only the `.22×.22` post AABB. S01
uses a `3.20×1.80×.18` panel centred `(15,1.55,-2.5)` with the already-listed AABB. The historic
noticeboard copies the existing three-panel recipe exactly, translated to `(9,-2.5)`.

### 7.8 Basketball court

- Surface: `x=29..43,z=9..17`, asphalt with cream boundary.
- Centre line x=36, centre circle radius 1.1 m; key rectangles at x=30.0..33.2 and
  x=38.8..42.0; dotted arcs use 18 small marks per end.
- Hoops: posts at `(29.65,13)` and `(42.35,13)`, each with a `0.40 × 0.40` solid; backboards face
  inward; rim y=3.05. Put loose ball `(36.2,.13,11.8)`.
- The single sideline bench is the manifest point `(27,11.5)`; the north-south approach strip
  `x=27.6..28.9,z=9..17` remains clear.
- Five low chain-link segments, 2.6 m high and 0.12 m thick: north `x=29..43,z=16.94..17.06`;
  south `x=29..43,z=8.94..9.06`; east `x=42.94..43.06,z=9..17`; west-south
  `x=28.94..29.06,z=9..14.2`; west-north `x=28.94..29.06,z=16.6..17`. Use those exact AABBs as
  solids; the northwest opening `z=14.2..16.6` is a 2.4 m gate and is clear of the west hoop.
- `篮球场` interaction position `(29.15,1.7,15.4)`, focus `(27.6,15.4)`, reach 2.2.

---

## 8. Collision, camera, and navigation contract

### 8.1 Major solids and blockers

```js
const BUILDING_COLLIDERS = [
  ['教学楼', -19.20, 13.20, 51.80, 63.20, 18.70],
  ['图书馆',  29.80, 43.20, 37.80, 62.20, 14.60],
  ['食堂',   -43.20,-28.80, -7.20, 12.20,  6.20],
  ['宿舍',    29.80, 43.20, -9.20,  7.20, 20.00],
  ['行政楼', -43.20,-28.80, 23.80, 36.20, 14.20],
  ['实验楼', -43.20,-27.80, 39.80, 62.20, 16.90],
  ['活动中心',29.80, 43.20, 22.80, 34.20, 10.80],
  ['门卫',     6.20, 12.60,-12.60, -6.80,  3.60],
];
```

For each row call `solid(x0,x1,z0,z1)` and `blocker(x0,x1,z0,z1,top)`. Do not use one giant solid
for the bicycle canopy, court, study area, benches, or gate; those need walkable gaps.

### 8.2 Minimum clearances

- Primary spine and cross promenade: 4.4 m minimum clear after solids; target 5.2/4.8 m as drawn.
- Academic loop: 3.4 m body-clear minimum.
- District connectors: 2.2 m body-clear minimum.
- Door waiting areas: 2.0 m deep and door width + 0.6 m wide.
- Between any two unrelated solids: at least 1.2 m; on a through-route: at least 2.0 m.
- Every `thing.focus` point must be outside all solids by at least 0.35 m and reachable from SPAWN.
- Camera blockers belong only to building masses and perimeter walls, never trees or furniture.

### 8.3 NPC rule

Generic NPC motion is not clamped against Campus solids, and ordinary timed spots still make a rig
walk in a straight line when its schedule window changes. Mark the three rows below
`campusStatic:true` and add a **deferred-snap** branch: when their active spot changes, never hand the
new coordinate to the generic mover. If Campus is not the current place, immediately set x/z/face
to the new spot; if Campus is current, retain the old spot and queue the new one until `setPlace`
leaves Campus. Apply the queued/current spot before Campus is rendered on the next entry. Thus every
listed coordinate is a stationary 0.35 m clearance disc and no route between spots is implied.
Free patrols require a later Campus-specific pathfinder over the occupancy grid in §8.4.

### 8.4 Required automated route check

Create a 0.25 m occupancy grid over every walk zone, inflate every solid by 0.30 m, flood-fill from
SPAWN, and assert reachability of every interaction focus. Also assert each reciprocal scene return
is in the flood-filled set. This catches the current classroom/metro failures before visual review.

---

## 9. Portal and gameplay wiring

### 9.1 Reciprocal scene transitions

| transition | outbound anchor | return / arrival |
|---|---|---|
| metro → campus | `js/metro.js` University Town row | `{place:'campus',at:{x:-11.40,z:-9.35,yaw:0}}` |
| campus → metro | existing `地铁站` thing | keep station `大学城`; focus must move to `(-11.4,-9.15)` |
| campus → classroom | B01 `教室` anchor | existing `go:'classroom'` |
| classroom → campus | classroom door exit | `{place:'campus',at:{x:-3,z:47.20,yaw:0}}` |
| campus → library | B02 `图书馆` anchor | existing library interior arrival unchanged |
| library → campus | library door exit | `{place:'campus',at:{x:27.20,z:50,yaw:Math.PI/2}}` |

Add `classroom:'大学城'` and `library:'大学城'` to the `DISTRICT` mapping so the two campus interiors
do not identify as 杨柳胡同.

### 9.2 Existing interaction moves

| label | new thing position `(x,y,z)` | focus `(x,z)` |
|---|---:|---:|
| 教学楼 | `(-3,4.3,48.8)` | `(-3,47.0)` |
| 教室 | `(-3,3.0,51.3)` | `(-3,48.4)` |
| 书桌 | `(5,.74,46)` | `(5,44.8)` |
| 打印 | `(-10.5,1.1,15)` | `(-10.5,13.6)` |
| 图书馆 | `(29.55,2.6,50)` | `(27.3,50)` |
| 食堂 | `(-28.55,2.4,2.5)` | `(-26.6,2.5)` |
| 售货机 | `(-28.35,1.1,8)` | `(-26.9,8)` |
| 煎饼 | `(-26,2.0,-3.5)` | `(-24.2,-3.5)` |
| 大学 | `(-3,5.6,-12.4)` | `(-3,-10.4)` |
| 自行车 | `(-10.3,1.1,5.8)` | `(-8.9,5.8)` |
| 布告板 | `(9,2.72,-2.8)` | `(9,-4.0)` |
| 篮球场 | `(29.15,1.7,15.4)` | `(27.6,15.4)` |
| 宿舍 | `(29.55,4,-2)` | `(27.4,-2)` |
| 地铁站 | `(-11.4,2.92,-11.9)` | `(-11.4,-9.15)` |
| 长椅 | exact `INTERACTIVE_BENCHES` rows in §7.5 | exact focus per row |
| 饮水机 | exact `INTERACTIVE_FOUNTAINS` rows in §7.6 | exact focus per row |

### 9.3 New interactions

Use distinct global labels; `USE` is keyed by Chinese text across the whole game.

| label | coordinate / focus | base behavior |
|---|---|---|
| 校园地图 | thing `(15,2.55,-2.6)`, focus `(15,-4.0)`, reach 2.2 | `secs:2.4,mins:4,gain:{mood:2},pose:{type:'stand'}` |
| 学生服务中心 | thing `(-28.62,2.20,27)`, focus `(-26.6,27)`, reach 2.5 | `secs:3,mins:6,gain:{mood:4},pose:{type:'talk'}`; issue persistent `学生证` |
| 行政楼 | thing `(-28.75,3.20,30)`, focus `(-26.6,30)`, reach 2.6 | `secs:2.4,mins:5,gain:{mood:1},pose:{type:'talk'}` |
| 实验楼 | thing `(-27.55,3.00,50)`, focus `(-25.5,50)`, reach 2.6 | `secs:2.2,mins:4,gain:{mood:2},pose:{type:'stand'}`; no false portal |
| 活动中心 | thing `(29.55,3.20,27)`, focus `(27.4,27)`, reach 2.6 | `secs:2.6,mins:6,gain:{mood:5},pose:{type:'stand'}` |
| 校医院 | thing `(29.55,3.20,31)`, focus `(27.4,31)`, reach 2.6 | `secs:3,mins:10,gain:{rest:4},pose:{type:'talk'}`; no `go` yet |
| 校园快递柜 | thing `(29.45,1.20,3.5)`, focus `(27.8,3.5)`, reach 2.2 | `secs:1.8,mins:2,gain:{mood:1},pose:{type:'press'}`; never call apartment `快递柜` |
| 跑道 | thing `(-19,.03,35)`, focus `(-19,35)`, reach 1.2 | `secs:3.2,mins:12,gain:{rest:-12,food:-5,mood:8},pose:{type:'walk'}` |

`学生证` closes an existing game loop: the mall cinema already expects a student-ID source. This
building is its single authoritative source; do not mint the item from multiple campus objects.
Use this exact durable contract in `game.js`:

```js
let campusLife = { studentId:false };
function issueStudentId() {
  const fresh = !campusLife.studentId;
  campusLife.studentId = true;
  if (!mallBought.includes('学生证')) mallBought.push('学生证');
  if (fresh) saveGame();
  return fresh;
}
// saveGame blob:
campusLife: { studentId:!!campusLife.studentId },
// loadGame, immediately after restoring mallBought:
campusLife = { studentId:!!s.campusLife?.studentId };
if (campusLife.studentId && !mallBought.includes('学生证')) mallBought.push('学生证');
```

Use this exact data flag and completion hook; `USE` rows do not support arbitrary callbacks:

```js
USE['学生服务中心'] = {
  zh:'办学生证', py:'bàn xuéshēngzhèng', en:'get a student card',
  secs:3, mins:6, gain:{mood:4}, pose:{type:'talk'}, studentId:true,
  done:'学生证办好了，请收好。', doneTr:'Your student card is ready. Keep it safe.',
  repeatDone:'学生证已经办过了。', repeatDoneTr:'Your student card has already been issued.'
};
// Inside stopUse(), after `let spoke = null`, and inside `if (finished)`:
if (def.studentId) {
  const fresh = issueStudentId();
  spoke = fresh ? [def.done, def.doneTr] : [def.repeatDone, def.repeatDoneTr];
}
```

This branch only runs on completion, not cancellation, and `spoke` already takes precedence over the
generic `def.done` output at the end of `stopUse()`. Re-inserting the card after load is the bridge to
`CinemaSys.hasStudentId()`, even after more than 24 later purchases have pushed it out of the truncated
`bought` save list. New Game resets `campusLife.studentId=false`; expose it in `__game.state()` for a
persistence harness.

### 9.4 Save migration for the new footprint

Existing v1 saves restore a campus `x/z/yaw` verbatim, and many coordinates that were formerly open
become walls in this layout. `campus.js` publishes the top-level `window.CampusContract` before its
Lazy scene closure, so `game.js` can write
`layouts:{campus:window.CampusContract.layoutVersion}` into the existing save blob. During
`loadGame()`, before `setPlace`, normalize a campus save whose marker is absent or differs:

```js
const cc = window.CampusContract;
if (savedPlace === 'campus' && s.layouts?.campus !== cc.layoutVersion)
  savedAt = { ...cc.spawn };
```

This is a one-time layout migration, not a save-format bump: old `v:1` lives remain readable and
the next autosave records the marker. Also run `spawnSafe` in a test against the migrated point after
the Campus scene is constructed; the canonical spawn itself must never rely on rescue movement.

---

## 10. NPC and activity anchors

All coordinates below are clear of the planned solids. Existing three people keep their rigs and
dialogue identities, receive new timed spots, and use the deferred-snap contract in §8.3.

```js
const CAMPUS_SPOTS = {
  xiaozhou_student: [
    {h0:7,h1:11,at:[-5.0,-7.5],face:Math.PI,act:'wait'},
    {h0:11,h1:13,at:[-24.0,2.5],face:-Math.PI/2,act:'wait'},
    {h0:13,h1:17,at:[27.0,50.0],face:Math.PI/2,act:'wait'},
    {h0:17,h1:22,at:[3.0,29.0],face:Math.PI,act:'wait'},
  ],
  'campus-teacher-chen-laoshi': [
    {h0:8,h1:12,at:[-3.0,47.0],face:Math.PI,act:'wait'},
    {h0:12,h1:14,at:[-26.0,30.0],face:-Math.PI/2,act:'wait'},
    {h0:14,h1:18,at:[-8.0,45.0],face:0,act:'wait'},
  ],
  'campus-student-xiao-li': [
    {h0:8,h1:11,at:[-10.5,13.2],face:Math.PI,act:'wait'},
    {h0:11,h1:12,at:[-24.0,1.0],face:-Math.PI/2,act:'wait'},
    {h0:12,h1:14,at:[36.0,11.0],face:.15*Math.PI,act:'wait'},
    {h0:14,h1:18,at:[6.0,31.0],face:0,act:'wait'},
    {h0:18,h1:22,at:[36.0,13.0],face:.15*Math.PI,act:'wait'},
  ],
};
```

Optional v2 crowd anchors, added only after route/performance checks: guard `(4.8,-9.6)`, canteen
worker `(-27.0,-1.8)`, services clerk `(-24.8,27.8)`, clinic nurse `(26.0,32.5)`, four student waits
at `(-8,20),(8,20),(-10,42),(10,42)`. They use the same deferred-snap mode, not free patrols.

Narrative corrections required with the move:

- Either add multi-floor library destinations later or change “the fourth floor is quietest” to
  “the north reading room is quietest.”
- Chen's office line becomes true because the administration block now exists.
- Correct the “four stops back into town” campus copy to the actual station ordering.

---

## 11. Materials, batching, and asset policy

Keep the current eleven campus surface presets and luminance compensation. Add no new outdoor model
dependency in the first build. The procedural `fwin`, `acBox`, `tree`, `bike`, bench, sign, and lamp
recipes already batch well and match the rest of the game.

Useful school desks, chairs, chalkboards, books, planters, safety objects, and lab props exist under
`assets/models`, but most are not runtime-manifested. If later interiors use them, update all three
asset contracts together:

1. `MANIFEST` entry in `js/assets.js`;
2. the `ROOMS.Campus` warm set;
3. `ASSET_ROOM.campus = 'Campus'`.

Otherwise `Lazy('Campus')` can cache a primitive fallback before the models arrive. Imported models
still need manual solids.

### Performance budget

- Outdoor campus ceiling: **3,200 props**, **220 submitted color-pass calls**, and no more than
  **8 submitted point lights** at once.
- Repeated facade pieces must share mesh/mode/material options so instancing can batch them.
- Animate only the existing flag, cart steam, selected window lighting, and at most one court ball.
- Trees do not animate individually. Crowd members use existing rig LODs.
- Use culling spheres on large flag/canopy movers and `dynamic:true` only where world centres change.
- If the finished scene exceeds the ceiling, remove tiny roof/service detail before cutting paths,
  signs, doors, or interaction landmarks.

---

## 12. Implementation architecture

Do not grow `campus.js` from 949 lines into a single several-thousand-line file. Use a small campus
fit registry, mirroring the already-proven split patterns elsewhere in the project.

| file | ownership |
|---|---|
| `js/campus.js` | frozen coordinate contract, palette/materials, shared helpers, registry, night/tick dispatch, `finish()` |
| `js/campus-boundary.js` | ground, perimeter walls, all gates, metro, security pavilion, arrival apron |
| `js/campus-academic.js` | Teaching B01, Library B02, quad lawns, jogging line, study areas |
| `js/campus-west.js` | Canteen B03, Admin B05, Science B06, west service objects |
| `js/campus-east.js` | Dorm B04, Student Centre/Clinic B07, court, east service objects |
| `js/campus-furniture.js` | tree/lamp/bench/fountain/bin/bike/sign arrays and their exact builders |
| `js/campus-life.js` | flag/cart animation registrations, optional campus route validation hooks |

`campus.js` exposes a toolkit containing the primitive builders, palette, surfaces, held-color
helper, light/night registries, and fixed constants. Each fit file appends geometry through that
toolkit and returns optional `tick`/`setNight` callbacks. Load all fit files after `campus.js` and
before `classroom.js`/`library.js` in `index.html`.

Use this deterministic registry contract before the `Lazy('Campus',...)` declaration:

```js
const CampusFits = window.CampusFits = {
  rows: [],
  register(id, order, build) {
    if (this.rows.some(r => r.id === id)) throw new Error(`duplicate Campus fit: ${id}`);
    this.rows.push({id, order, build});
  },
};
// Each fit file: CampusFits.register('boundary', 10, kit => ({tick?,setNight?}));
```

Inside the Lazy builder, create `kit`, sort a copy with `(a,b)=>a.order-b.order ||
a.id.localeCompare(b.id)`, call every `build(kit)` exactly once, then compose returned hooks in that
same order. The engine supplies absolute seconds, not a delta; implement
`Campus.tick(t, player, gameMinutes)` and forward all three arguments unchanged to every
`hook.tick(t, player, gameMinutes)` in registry order. Preserve any hook events by flattening array
returns and wrapping scalar returns, then return the combined array (or `undefined` when empty).
`setNight(n)` runs every night hook and finally the shared window/lamp updater. Call `B.finish()` only
after every fit has built. Required order IDs:
`boundary:10, academic:20, west:30, east:40, furniture:50, life:60`.

Shared-file integration changes are serialized after geometry lands:

- `js/classroom.js`: new campus return.
- `js/library.js`: new campus return.
- `js/metro.js`: safe campus arrival.
- `js/data.js`: corrected-rig NPC spot arrays, `campusStatic:true`, and the new distinct USE rows.
- `js/game.js`: `DISTRICT`, deferred-snap branch, `CampusContract` layout migration, and the exact
  `campusLife.studentId` save/load/issuance contract in §9.3.
- `js/vocab.js`: new university words only.

---

## 13. Build order

1. **Contract/refactor:** introduce the fit registry without changing rendered output; boot and
   campus smoke test must remain green.
2. **Land and boundary:** expand ground/zones, build wall runs/gate aprons, and verify every visible
   edge matches movement limits.
3. **Circulation:** build the spine, cross promenade, quad loop, lawns, tactile route, and jogging
   marks before placing architecture.
4. **Move legacy masses:** relocate teaching, library, canteen, dorm, bike hub, court, print kiosk,
   noticeboard, and flag. Update reciprocal exits and NPC coordinates in the same change.
5. **Add new masses:** administration, science, student centre/clinic, and security pavilion.
6. **Furnish:** apply the exact arrays for trees, lamps, benches, water, waste, signs, and bicycles.
7. **Gameplay:** add map/student-card/clinic/track/locker actions; fix DISTRICT and narrative copy.
8. **Validation:** source checks, navigation flood-fill, portal tests, day/night visual captures,
   and performance profile. Only then add optional crowd anchors.

---

## 14. Acceptance checklist

### Geometry and navigation

- [ ] Campus bounds are `x=-48..48,z=-13..67`; ground covers `x=-52..52,z=-17..71`.
- [ ] Every perimeter wall run, gate pier, building, fence, post, table, bench, and service object
      that should block the body has an explicit solid.
- [ ] No major building AABBs overlap. Canteen/bikes, court/dorm, and court/library are separated.
- [ ] Spawn, metro focus, classroom return, and library return are outside inflated solids.
- [ ] A marker-less v1 save last written anywhere in the old campus resumes at canonical SPAWN;
      a v2-layout campus save at a legal coordinate resumes exactly where it was written.
- [ ] A 0.30 m radius flood-fill reaches every interaction focus from SPAWN.
- [ ] A simulated 0.30 m body crosses all south/core/west/east zone seams and each open apron in
      both directions; every `roomAt` result, including aprons/fallback, has a valid light triple.
- [ ] Primary routes retain 4.4 m clear; no door waiting area is narrower than 2.0 m.
- [ ] NPC timed spots and their 0.35 m clearance discs do not intersect solids.
- [ ] A Campus schedule-window change never hands a straight-line target to generic NPC motion;
      queued deferred snaps apply only off-scene/before the next Campus render.

### Visual organization

- [ ] From the main gate, the `x=-3` spine, flag, quad, and teaching entrance read as one axis.
- [ ] Red/gold names identify institutions; blue signs carry wayfinding; green marks only clinic.
- [ ] Quiet library edge has no vendor, loading dock, or court doorway facing it.
- [ ] Deliveries remain on the west service lane; bicycles never occupy the spine.
- [ ] Every facade has a plinth, floor rhythm, recessed windows, sill/cap, entrance, and readable name.
- [ ] Wall openings end at visible aprons/rails, never invisible clamps.

### Runtime and integration

- [ ] `node --check` passes for every changed JS file and the normal boot/place checks pass.
- [ ] Metro ↔ campus, classroom ↔ campus, and library ↔ campus work both ways.
- [ ] `classroom` and `library` identify as 大学城 in district UI.
- [ ] Student ID is issued once and recognized by the cinema path.
- [ ] Student ID remains recognized after 30 later purchases, save/reload, and a repeat service-centre
      visit; `校园快递柜` never reads or clears `HomeLife` apartment parcels.
- [ ] The court's 2.4 m northwest gate remains reachable and clear of its hoop, bench, and fence
      after 0.30 m inflation.
- [ ] Day, dusk, rain, and midnight captures have no black facades, floating glyphs, z-fighting,
      missing ground, or lightless entrance slabs.
- [ ] Scene remains within 3,200 props / 220 submitted color calls, with only nearest 8 lights active.
- [ ] The visual map renders at 320 px and 736 px in light/dark themes with all building footprints,
      circulation, gate states, and fixture symbols visible and no clipped coordinate labels.

When these checks pass, the university is complete as an exterior gameplay district. New interiors
for the canteen, dormitory, clinic, administration, or science building can be added later without
moving the masterplan: their door and return coordinates are already reserved above.
