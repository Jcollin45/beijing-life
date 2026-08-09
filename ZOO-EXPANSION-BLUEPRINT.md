# 动物园扩建总图 — Zoo Expansion Master Blueprint

This is a construction specification, not a mood board. It expands the existing zoo from a
`44 × 32 m` core to a `116 × 86 m` campus while leaving the current gate, spawn, subway, seven
habitats, interactions, keeper routes and saved player coordinates exactly where they are.

The machine-readable source of truth is
[`ZOO-EXPANSION-BLUEPRINT.json`](ZOO-EXPANSION-BLUEPRINT.json). If a coordinate in prose ever
disagrees with the JSON, use the JSON and correct this document in the same change.

The finished plan contains:

- **9,976 m²** inside the wall, versus 1,408 m² today — **7.09× the current area**
- the **seven existing habitats**, preserved in place
- **fourteen new outdoor habitat zones**
- a separate **six-zone Tropical House** interior
- three primary north–south walks, three cross avenues, a wetland boardwalk and a staff service ring
- a conservation centre, animal hospital, quarantine building, feed kitchen, two rest hubs,
  secondary gate, first aid, water stations, maps, seating, bins, lighting and deterministic planting

---

## 1. Coordinate contract

All dimensions are metres in the existing `zoo` scene frame.

| Quantity | Meaning |
|---|---|
| `+x` | east |
| `−x` | west |
| `+z` | north |
| `−z` | south |
| `+y` | up; outdoor grade is `y = 0.000` |
| yaw `0` | faces north / `+z` |
| yaw `π/2` | faces east / `+x` |
| yaw `π` | faces south / `−z` |
| yaw `−π/2` | faces west / `−x` |
| rectangle | ordered as `x0 < x1`, `z0 < z1` |
| object point | `[x, y, z]` in code; `[x, z]` in plan tables |

Precision is `0.01 m` in plan, `0.001 m` vertically and `0.05 m` when sampling routes. Primitives
use centre coordinates and full dimensions, matching `Build.scene`. The body radius is `0.30 m`.
No corridor is accepted from its drawn width alone: subtract collider thickness, then another
`0.60 m` for a body touching both sides.

### Site envelope

```text
wall line       x = -58 .. 58       z = -16 .. 70
public zone     x = -57.4 .. 57.4   z = -15.4 .. 69.4
outdoor grade   y = 0
south spawn     (-12.0, -13.4), yaw 0
west spawn      (-55.2,  24.0), yaw π/2
tropical return ( 23.2,  52.0), yaw π/2
```

The south boundary stays at `z = -16`. The expansion grows west, east and north, so an old save
inside the current zoo does not move.

---

## 2. Master plan

North is up. The drawing is schematic; the tables and JSON carry exact extents.

```text
 z=70  ┌────────────────────── service road / emergency gate ──────────────────────┐
       │  OPERATIONS       RED PANDA     CONSERVATION CENTRE       TROPICAL HOUSE  │
 z=64  ├══════════════════════ NORTH PROMENADE ═════════════════════════════════════┤
       │  hospital +       H30           B05 ─ glazed bridge ─ B06    B08 indoor   │
       │  quarantine                    H33 GOLDEN MONKEY              exhibits     │
 z=42  ├══════════════════ CONSERVATION CROSS AVENUE z=40 ══════════════════════════┤
       │ H20 TAKIN │walk│ H21 SNOW   H31 WATERFOWL │central│ H32 FARM │RHINO│LION  │
       │           │-36.5│ LEOPARD     + pavilion  │ x=-2  │          │walk x=39   │
 z=20  ├════════════════════ FIRST CROSS AVENUE z=18 ════════════════════════════════┤
       │ H11 HIPPO │wet │ H13 CRANE       existing north loop       H40 │ H41     │
       │ H10 OTTER │walk│ H12 FLAMINGO    HERITAGE CORE             ELEP│ SAVANNAH│
 z=-12 ├════════════════════ current south walk / extensions ════════════════════════┤
 z=-16 └───────────────┬──── existing SOUTH GATE x=-12 ────┬────────────────────────┘
                     x=-58                                  x=58
```

### District schedule

| ID | District | Bounds `x × z` | Primary character |
|---|---|---|---|
| D0 | South Gate & Heritage Core | `[-22,22] × [-16,16]` | existing civic garden; preserve |
| D1 | Western Wetlands | `[-52,-22] × [-12,16]` | water, reeds, willows, timber |
| D2 | Western Highlands | `[-52,-22] × [20,38]` | rock, pine, shaded glass |
| D3 | China Conservation Campus | `[-34,18] × [42,64]` | native species, research, classrooms |
| D4 | Lake & Family Discovery | `[-18,18] × [20,38]` | waterfowl, farm, tea and picnic |
| D5 | Eastern Savannah | `[22,52] × [-12,38]` | paddocks, moats, overlooks |
| D6 | Tropical House | `[22,52] × [42,64]` | separate indoor scene |
| D7 | Operations & Veterinary | `[-52,-35] × [42,64]` | staff-only care and logistics |

District rectangles are planning ownership areas and may touch. Habitat and building footprints
inside them may not overlap unless one explicitly owns the other, as the tea pavilion owns its lake
island.

---

## 3. What survives from the current zoo

Do not rebuild the existing core from memory. Preserve these source coordinates.

### Existing habitat contract

| ID | Habitat | Bounds | Public side | Legal focus |
|---|---|---|---|---|
| H00 | 企鹅 penguin | `x[-6,0] z[-11,-5.5]` | `z0` | `(-3,-13)` |
| H01 | 长颈鹿 giraffe | `x[5,14] z[-11,-5.5]` | `z0` | `(9.5,-13)` |
| H02 | 熊猫 panda | `x[-16,-8] z[-2.5,4]` | `x1` | `(-6,0.75)` |
| H03 | 孔雀 peacock | `x[-4,2] z[-2.5,4]` | `z0` | `(-1,-4.5)` |
| H04 | 大象 elephant | `x[6,16] z[-2.5,4]` | `x0` | `(4,0.75)` |
| H05 | 猴子 monkey | `x[-13,-5] z[7,13.5]` | `z0` | `(-9,5)` |
| H06 | 老虎 tiger | `x[1,10] z[7,13.5]` | `z0` | `(5.5,5)` |

Keep the eager `ZOO_PENS` table outside `Lazy('Zoo', ...)`. `data.js` reads it at boot. In the
eventual data-driven build, derive `ZOO_PENS` from the seven `existingHabitatBounds` records without
constructing the outdoor scene.

### Existing fixed infrastructure

| Object | Coordinate / footprint | Instruction |
|---|---|---|
| Main gate | centre `(-12,-16)`, opening `x[-15.6,-8.4]` | preserve visible opening, body opening and camera opening |
| Spawn | `(-12,-13.4)`, yaw `0` | preserve; Metro arrives here |
| Subway | centre `(-19.2,-14.7)` | preserve station key `动物园` and its reachable focus |
| Ticket office | centre `(-5.6,-14.5)` | preserve zoo-local `USE_AT.zoo['售票处']` |
| Guide map | centre `(-16.2,-13.8)` | redraw it for the larger site; do not move the board |
| Kiosk | centre `(6,-14.95)` | preserve zoo-local `USE_AT.zoo['小卖部']` |
| Panda garden | centre `(-12,-7.45)`, solid half-size `1.52` | preserve two clear approach branches |
| Four staff gates | `(-16,.7)`, `(-12,13.5)`, `(16,2.6)`, `(8.3,13.5)` | preserve current keeper-route agreement |

### Existing core path rectangles

| ID | Exact rectangle |
|---|---|
| P00 entry plaza | `x[-16.5,-7.5] z[-16,-9.6]` |
| P01 south loop | `x[-20,20] z[-14.4,-12]` |
| P02 west loop | `x[-20.5,-17.5] z[-13,13]` |
| P03 east loop | `x[17.5,20.5] z[-13,13]` |
| P04 north loop | `x[-20,20] z[13.1,15.7]` |
| P05 south cross | `x[-19,19] z[-5.3,-2.7]` |
| P06 north cross | `x[-19,19] z[4.2,6.8]` |
| P07 west link | `x[-7.7,-5.3] z[-4.3,5.7]` |
| P08 east link | `x[2.8,5.2] z[-4.3,5.7]` |
| P09 west entrance branch | `x[-15.65,-13.45] z[-9.7,-3.9]` |
| P10 east entrance branch | `x[-10.55,-8.35] z[-9.7,-3.9]` |
| P11 giraffe south link | `x[3,5] z[-13.2,-4.1]` |

### Demolition, exactly

Remove the visible geometry, body solid and camera blocker for all three runs:

- old north wall: `z = 16`, `x = -22..22`
- old west wall: `x = -22`, `z = -16..16`
- old east wall: `x = 22`, `z = -16..16`

Keep the old south wall and gate. Leaving any of those three old collision runs behind would make
the new districts visible but unreachable.

---

## 4. Outer wall and gates

The outer wall is `0.40 m` thick, `2.40 m` high red brick with green tile coping. Each visible run
gets one matching axis-aligned body solid and one camera blocker to `y = 2.80`. Never make a collider
per brick bay.

| Wall ID | Run | Range | Opening after it |
|---|---|---|---|
| W001 | south, `z=-16` | `x=-58..-15.6` | main gate begins |
| W002 | south, `z=-16` | `x=-8.4..58` | main gate ends |
| W003 | west, `x=-58` | `z=-16..20.5` | west gate begins |
| W004 | west, `x=-58` | `z=27.5..70` | west gate ends |
| W005 | east, `x=58` | `z=-16..42` | service gate begins |
| W006 | east, `x=58` | `z=49..70` | service gate ends |
| W007 | north, `z=70` | `x=-58..36` | emergency gate begins |
| W008 | north, `z=70` | `x=44..58` | emergency gate ends |

| Gate | Opening | Width | Access | Normal state |
|---|---|---:|---|---|
| G01 South Main | `z=-16, x[-15.6,-8.4]` | 7.2 | public | open |
| G02 West Secondary | `x=-58, z[20.5,27.5]` | 7.0 | public | open |
| G03 East Service | `x=58, z[42,49]` | 7.0 | staff | closed |
| G04 North Emergency | `z=70, x[36,44]` | 8.0 | staff/emergency | closed |

The west gate is a secondary public arrival, not a replacement entrance. Its spawn is
`(-55.2,24)`, facing east. Admission remains the current flavor/economy interaction in the first
implementation wave; a true ticketed turnstile is a separate saved-state feature and must not be
quietly invented while moving geometry.

---

## 5. Circulation plan

### Public network

| ID | Centreline | Width | Surface | Role |
|---|---|---:|---|---|
| P101 | `(-56,-13.2) → (-20,-13.2)` | 3.6 | paving | west extension of south loop |
| P102 | `(20,-13.2) → (56,-13.2)` | 3.6 | paving | east extension of south loop |
| P103 | `x=-19, z14.4→64` | 4.0 | dark paving | West Zoo Avenue |
| P104 | `x=-2, z13.5→64` | 5.0 | paving | Central Conservation Walk |
| P105 | `x=19, z14.4→64` | 4.0 | dark paving | East Zoo Avenue |
| P106 | `z=18, x-54→54` | 4.0 | paving | first cross avenue |
| P107 | `z=40, x-54→54` | 4.0 | paving | conservation cross avenue |
| P108 | `z=64, x-54→54` | 4.0 | dark paving | north promenade |
| P109 | `z=-10.5, x-54→-19` | 3.0 | timber/paving | wetland south connector |
| P110 | `x=-36.5, z-11→16` | 2.6 | timber | wetland boardwalk |
| P111 | `z=16.5, x-36.5→-19` | 2.5 | paving | wetland north connector |
| P112 | `x=-36.5, z20→38` | 2.6 | stone | highlands walk |
| P113 | `z=-12.2, x19→39` | 3.0 | paving | savannah south connector |
| P114 | `x=39, z20→38` | 2.8 | paving | north savannah walk |
| P115 | `x=39, z-11→16` | 2.8 | paving | south savannah walk |
| P116 | `(19,52) → (25,52)` | 5.0 | red paving | Tropical House forecourt |
| P117 | `(-57.4,24) → (-36.5,24)` | 4.0 | red paving | west gate approach |
| P118 | `z=53.5, x-19→19` | 3.0 | paving | conservation centre front walk |

All listed public paths are accessible. Long routes receive a rest point at least every `45 m`.
Maximum running slope is `1:20`; maximum cross slope is `1:50`. This plan is level, so do not add
decorative steps later. Tactile guides run from both public gates to their nearest map board and
from the three main avenues to the Tropical House and conservation centre doors.

### Staff network

| ID | Centreline | Width | Purpose |
|---|---|---:|---|
| S201 | `x=-53.5, z-11→67` | 2.4 | west service lane |
| S202 | `x=53.5, z-11→67` | 2.4 | east service lane |
| S203 | `z=67, x-53.5→53.5` | 2.4 | north service lane |
| S204 | `z=57, x-53.5→-35` | 2.8 | operations spur |

These lanes are not public path zones. If the scene retains one large walkable zone, keep them
closed with compound fences and staff gates; do not rely on a different paving color to enforce
access.

### Network topology

The three old north exits become P103, P104 and P105:

- P103 continues the current west loop at `x=-19`.
- P104 rises through the `6 m` gap between the existing monkey and tiger pens at `x=-2`.
- P105 continues the current east loop at `x=19`.

This is why the old core is preserved rather than re-centred. The new network grows naturally out
of three already-clear corridors.

---

## 6. Outdoor habitat schedule

Every habitat record owns its bounds, public side, focus, barrier, ground patches, service gate,
objects and normalized animal slots. The compiler derives signs, collision and schedules from that
record. No builder may type the rectangle again in `data.js`.

| ID | Headline species | Bounds | Public side / focus | Barrier concept | Service gate |
|---|---|---|---|---|---|
| H10 | 水獭 otter | `x[-50,-39] z[-9,-1]` | `x1 / (-37.6,-5)` | low glass + rock bank | `x0 @ z=-5`, 1.8 |
| H11 | 河马 hippo | `x[-50,-39] z[2,15]` | `x1 / (-37.6,8.5)` | glass + water setback | `x0 @ z=12`, 2.4 |
| H12 | 火烈鸟 flamingo | `x[-34,-24] z[-9,3.5]` | `x0 / (-35.4,-2.75)` | low mesh + ditch | `x1 @ z=-3`, 1.5 |
| H13 | 丹顶鹤 crane | `x[-34,-24] z[6,15]` | `x0 / (-35.4,10.5)` | planted rail + flight mesh | `x1 @ z=12.5`, 1.5 |
| H20 | 羚牛 takin | `x[-50,-39] z[26,37]` | `x1 / (-37.6,31.5)` | stone, rail, dry moat | `x0 @ z=33`, 2.2 |
| H21 | 雪豹 snow leopard | `x[-34,-24] z[26,37]` | `x0 / (-35.4,31.5)` | rock-framed glass | `x1 @ z=34`, 1.5 |
| H30 | 小熊猫 red panda | `x[-34,-24] z[43,52]` | `x1 / (-20.8,47.5)` | planted fine mesh | `x0 @ z=49`, 1.4 |
| H31 | 天鹅 / 鸳鸯 waterfowl | `x[-16,-6] z[22,36]` | `x1 / (-4.2,29)` | water edge rail | `z1 @ x=-14`, 1.8 |
| H32 | 山羊 / 兔子 family farm | `x[2,16.5] z[22,36]` | `x0 / (0.2,29)` | timber fence, double gate | `x1 @ z=33`, 2.0 |
| H33 | 金丝猴 golden monkey | `x[2,16.5] z[43,52]` | `x0 / (0.2,47.5)` | cable mesh + glass bay | `x1 @ z=49`, 1.6 |
| H40 | 亚洲象 elephant reserve | `x[24,36.5] z[-10,15]` | `x0 / (20.2,2.5)` | dry moat + cable | `x1 @ z=11`, 3.0 |
| H41 | 斑马 / 羚羊 / 长颈鹿 | `x[41.5,50] z[-10,15]` | `x0 / (40,2.5)` | dry moat + rail | `x1 @ z=10`, 2.8 |
| H42 | 犀牛 rhino | `x[24,36.5] z[23,37]` | `x0 / (20.8,30)` | concrete dry moat | `x1 @ z=34`, 2.8 |
| H43 | 狮子 lion | `x[41.5,50] z[23,37]` | `x0 / (40,30)` | overlook glass | `x1 @ z=34`, 2.0 |

### Habitat-specific fixed objects

These are mandatory silhouettes, not optional dressing.

| Habitat | Objects |
|---|---|
| H10 | pool `[-49,-43]×[-8,-2]`, rock bank, log `(-45.6,-6.5)`, den `[-49.5,-47]×[-3.4,-1.3]` |
| H11 | pool `[-49.5,-42.5]×[3,13.8]`, sand bank, shelter `[-43,-39.6]×[10.5,14.3]`, trough, scrub post |
| H12 | shallow water `[-33,-25]×[-8,1.7]`, islands `(-30.5,-4.5)` and `(-27.2,-1.4)`, reeds, feed pan |
| H13 | marsh `[-33,-25]×[7,12]`, pool `[-32.5,-27]×[7.3,10.5]`, reeds and nest platform |
| H20 | rock slope `(-45,32)`, pine `(-47.5,28.5)`, hay rack `(-41,34)` |
| H21 | rock shelf `(-28.5,32)` to `y=2.8`, den `[-26.5,-24.5]×[34,36.5]`, deadfall log |
| H30 | climbing tree `(-28,47)`, rope bridge `(-31,48)→(-26,45)` at `y=2.1`, nest box |
| H31 | water `[-15.5,-7]×[23,35]`, island `[-12.8,-9.2]×[27.5,31.5]`, east footbridge |
| H32 | barn `[11.5,16]×[31,35.5]`, contact yard, handwash `(0.9,32.8)`, hay and rabbit shelter |
| H33 | climbing tower `(9,47.5)` to `y=5.5`, rope network `[5,14]×[45,50]`, heated shelter |
| H40 | pool `[25.5,30]×[-8,-3]`, wallow `[29,35]×[7,13]`, shade shelter, scrub post, feeder |
| H41 | browse rack `(47.5,8)` to `y=4.8`, acacia `(45,-2)`, trough `(43.5,11)` |
| H42 | wallow `[29,35]×[29,35]`, shelter `[31,36]×[24,28]`, scrub log `(27.5,27)` |
| H43 | kopje `(46,30)` to `y=2.4`, shade rock `[47,49.5]×[33,36.5]`, deadfall log |

The JSON also defines every animal slot as normalized `u,v`, substrate and allowed act. Resolve a
slot to world space only after inset by that species' safe radius. Unknown species must not be
added to the roster until the corresponding `ANIMALS` rig exists.

### Waterfowl lake collision

The lake is visually one rectangle but collision is five water rectangles around a walkable island
and bridge:

```text
south water [-15.5,-7.0] × [23.0,27.5]
north water [-15.5,-7.0] × [31.5,35.0]
west water  [-15.5,-12.8] × [27.5,31.5]
east upper  [-9.2,-7.0] × [29.8,31.5]
east lower  [-9.2,-7.0] × [27.5,28.2]
bridge      [-9.2,-6.0] × [28.2,29.8] — walkable
island      [-12.8,-9.2] × [27.5,31.5] — walkable
```

Do not block the full H31 rectangle. That would make the pavilion decorative and unreachable.

### Animal transfer crossings

Two after-hours transfer links make the old large-mammal yards useful as day rooms:

- X01 elephant: `x[16,24] z[0.8,3.2]`
- X02 giraffe: `x[14,41.5] z[-8.8,-6.6]`

They cross public paths. Their normal state is **animal gates closed / public path open**. The game
may only open them after it has closed every public crossing shutter and confirmed no player or
visitor occupies the corridor. The first implementation may leave them permanently shut.

---

## 7. Buildings

| ID | Building | Footprint | Height | Public entrance |
|---|---|---|---:|---|
| B01 | West Gate pavilion | `x[-58.5,-55.5] z[19.5,28.5]` | 4.6 | gate opening at `z=24` |
| B02 | West restroom | `x[-34,-28.5] z[20.7,24.5]` | 3.2 | `(-31.2,20.7)`, width 1.6 |
| B03 | East rest hub | `x[42,50] z[20.7,22.6]` | 3.2 | `(46,20.7)`, width 2.0 |
| B04 | Lake tea pavilion | `x[-12.8,-9.2] z[27.5,31.5]` | 4.2 | `(-9.2,29)`, width 1.6 |
| B05 | Conservation west wing | `x[-17,-6] z[55,62]` | 5.2 | `(-11.5,55)`, width 2.2 |
| B06 | Conservation east wing | `x[2,16.5] z[55,62]` | 5.2 | `(9,55)`, width 2.2 |
| B06b | Glazed bridge gallery | `x[-6,2] z[58,61]`, `y0=4.2` | 3.0 | connects wings above P104 |
| B07 | Operations campus | `x[-51,-35] z[42.5,62.5]` | 4.5 max | staff only |
| B08 | Tropical House | `x[25,50] z[44,62]` | 7.2 | `(25,52)`, width 3.2 |

The bridge has `4.10 m` clear beneath it. Its body solids and blocker begin at `y=4.2`; a ground-
height AABB across P104 would sever the main route.

### Operations campus internal schedule

| Room | Bounds | Function |
|---|---|---|
| Animal hospital | `x[-50,-42] z[46,54.5]` | exam, imaging, treatment and recovery |
| Quarantine | `x[-50,-42] z[55.5,61.5]` | isolated stalls and airlock |
| Feed kitchen | `x[-41,-36] z[46,52]` | dry/cold feed preparation |
| Staff lockers | `x[-41,-36] z[53,56]` | changing, records and break room |
| Service yard | `x[-41,-36] z[57,61.5]` | cart, bins and deliveries |

The compound fence follows `x[-51,-35] z[42.5,62.5]`, is `2.40 m` high and has only two gates:
west `(-51,57)`, width `3.0`; east `(-35,47)`, width `2.4`.

---

## 8. Tropical House local plan

The shell sits in the outdoor zoo, but the interior is a separate `zoo_tropical` scene. This avoids
mixing outdoor sun/fog with humid indoor light, keeps culling reasonable and gives the building a
real cutaway.

Local coordinates remain `+x east`, `+z north`.

```text
 local z=10   ┌──────────────┬──── atrium ────┬───────────────┐
              │ T03 reptiles │                │ T04 butterfly │ T05 nocturnal
 local z=3    ├──────────────┤                ├───────────────┤
              │              │ T06 rainforest │               │
 local z=-3   ├──────────────┤    atrium      ├───────────────┤
              │ T01 alligator│                │ T02 aquarium  │
 local z=-10  └──────────────┴────────────────┴───────────────┘
              x=-13  lobby/entry              service   x=13
```

### Interior envelope and openings

```text
local bounds  x[-13,13] z[-10,10], height 6.4
main door     x=-13, z[-2,2], width 4.0
exit door     x=-13, z[5.2,7.2], width 2.0
service door  x= 13, z[6.0,8.4], width 2.4
spawn         (-11.5,0), yaw π/2
world return  (23.2,52), yaw π/2
```

### Interior exhibit schedule

| ID | Exhibit | Local bounds | Species | Public focus |
|---|---|---|---|---|
| T00 | 热带馆大厅 lobby | `x[-12.7,-8.5] z[-2.5,2.5]` | — | `(-10.2,0)` |
| T01 | 鳄鱼湿地 | `x[-8,-2] z[-8.5,-3]` | 扬子鳄 | `(-5,-2.1)` |
| T02 | 长江水族 | `x[2,11.5] z[-8.5,-3]` | 中华鲟, fish | `(6.8,-2.1)` |
| T03 | 爬行动物馆 | `x[-8,-2] z[3,8.5]` | 蛇, 蜥蜴 | `(-5,2.1)` |
| T04 | 蝴蝶温室 | `x[2,7.5] z[3,8.5]` | 蝴蝶 | `(1.1,5.8)` |
| T05 | 夜行动物 | `x[8.5,11.5] z[2,8.5]` | 果蝠 | `(7.6,5.2)` |
| T06 | 雨林中庭 | `x[-1,1] z[-8.5,8.5]` | planting/waterfall | `(0,0)` |

Mandatory interior objects are the lobby desk `(-10,1.4)`, map `(-10.5,-2.2)`, waterfall
`(0,7.4)`, canopy tree `(0,4.8)`, benches `(-8.7,0)` and `(8,0)`, bin `(-9.5,2.8)` and illuminated
exit sign `(-12.6,6.2)`. Exact y and yaw values are in the JSON.

---

## 9. Furniture, light and planting

All planned placements have stable IDs. Never seed a whole district with one mutable random stream:
adding one tree must not reshuffle every later tree.

### Object counts and ID ranges

| Type | IDs | Count | Placement source |
|---|---|---:|---|
| new benches | BN101–BN120 | 20 | JSON `objectSchedules.benches` |
| new bins | BI101–BI112 | 12 | JSON `objectSchedules.bins` |
| new outdoor lamps | L101–L129 | 29 | JSON `objectSchedules.lamps` |
| guide maps | M100–M105 | 6 including existing | JSON `mapBoards` |
| water stations | WS101–WS105 | 5 | JSON `waterStations` |
| first aid | FA101 | 1 | `(4,42.3)` |
| perimeter trees | fixed coordinate triples | 20 | JSON `planting.perimeterTrees` |
| district trees | fixed coordinate triples | 20 | JSON `planting.districtTrees` |
| wetland willows | fixed coordinate triples | 4 | JSON `wetlandWillows` |
| highland pines | fixed coordinate triples | 4 | JSON `highlandPines` |

For benches, `faceYaw` means the direction the seated visitor looks. The bench helper must convert
that to the correct slat/backrest transform and place its interaction focus on the front side. Each
bench gets its own `thing('长椅', ...)`; no singleton interaction is allowed.

Bins and lamps sit on verges, never on a path centreline. Lamp position is also the authoritative
point for its emissive head, point light, glow pool and narrow body solid. At most **12 outdoor point
lights** may be active in one frame; the renderer only uses the nearest eight.

### Planting rules

- Tree triples are `[x,z,height]`.
- Every trunk gets a `0.56 × 0.56 m` body solid, not a crown-sized collider.
- Keep a `2.0 m` clear sight cone around every map and a `1.5 m` clear envelope around every focus.
- Foliage may use wind mode; rocks, lamps, statues, signs and architecture may not.
- Habitat-specific plants are owned by their habitat ID. Public shade trees are owned by their path
  or district so habitat rebuilding cannot move them.
- Hedges are visual separators only unless explicitly listed as walls. Split them at every gate,
  crossing, map, queue and view bay.

---

## 10. Wayfinding and learning layer

District identity is repeated in four places: map color, rail accent, pavement medallion and
fingerpost arm. Color never carries the meaning alone; every mark also has Chinese text and a shape
or location cue.

| Junction | Ground label | Fingerpost destinations |
|---|---|---|
| `(-19,18)` | 湿地 / 山地 | 西部湿地, 西部山地, 南门 |
| `(-2,18)` | 湖区 / 亲子 | 湖区, 亲子园, 南门 |
| `(19,18)` | 草原 | 东部草原, 热带馆, 南门 |
| `(-19,40)` | 中国保护 | 动物医院, 小熊猫, 西门 |
| `(-2,40)` | 保育中心 | 保育中心, 金丝猴, 湖区 |
| `(19,40)` | 热带馆 | 热带馆, 狮子, 北环路 |

Every new habitat receives one interpretation board at its public focus. The board must provide:

1. one large Chinese headword;
2. pinyin;
3. one compact English gloss;
4. two short Chinese facts using known or newly added vocabulary;
5. a district accent strip;
6. a silhouette or relief portrait;
7. a tagged pickable backing box;
8. a matching local `thing` with a standable focus.

New vocabulary is enumerated in JSON under `interactions.newHeadwords`. Add those rows to
`vocab.js` before registering their things. New zoo-specific transactions belong inside the
existing `USE_AT.zoo` object. Do not create a second `zoo:` literal and silently replace the first.

---

## 11. Living routes

### Visitor loops

The JSON provides three closed patrols:

- `R-VIS-WEST`: south gate → wetlands → highlands → conservation campus → central return
- `R-VIS-EAST`: south gate → savannah → Tropical House → north promenade → central return
- `R-VIS-FAMILY`: lake → family farm → conservation centre → north loop

Patrol coordinates are path centrelines, not habitat focuses. Give paired family members translated
copies separated by `0.45–0.55 m`; do not put them on the same points and hope collision separates
them.

### Keepers and service

- `R-KEEP-WEST` begins at the operations campus and serves highlands and wetlands.
- `R-KEEP-CENTRAL` serves the waterfowl dock, family farm and golden monkeys.
- `R-KEEP-EAST` crosses the conservation avenue and serves rhino, lion and savannah.
- `R-SERVICE-RING` is a cart loop on S201–S203.

Keepers may enter habitats only through their declared service gates. Outside the mall, current NPC
movement is not generally collision-clamped, so every consecutive route segment must itself be
clear and must approach a gate square-on.

### Animal schedules

Animal positions are derived from normalized habitat slots, not absolute coordinates. Supported
existing acts are `graze`, `browse`, `drink`, `sit`, `lie`, `eat`, `groom`, `climb`, `swim`,
`display`, `preen` and `dust`. Add a rig and pose support before rostering a species that the current
figure system does not know. Unknown species must fail validation rather than disappear.

---

## 12. Art and graphics specification

The visual goal is a Chinese civic garden with ecological districts, not another larger grid of
identical grey pens.

| District | Ground | Barrier | Planting | Landmark |
|---|---|---|---|---|
| Heritage | green lawn, stone paths | brick/concrete/tile | mature deciduous | panda garden + gate |
| Wetlands | dark water, wet grass, timber | glass, dark mesh, reeds | willow, reed beds | boardwalk |
| Highlands | scree, rock, pine litter | rock, dark steel, glass | pine, sparse shrub | snow-leopard shelf |
| Conservation | bamboo mulch, red paving | brick, timber, planted mesh | bamboo/maple | bridge gallery |
| Lake/Family | water, meadow, tea stone | bronze rail, timber fence | willow/flower meadow | lake pavilion |
| Savannah | dry grass, sand, red earth | moats, sandstone, cable | acacia-like canopy | lion kopje |
| Tropical | humid dark stone | brick, steel, glass | dense canopy | atrium waterfall |

Rules for the scene compiler:

- architectural boxes use `{hard:true}`;
- rigid objects never use foliage shader mode;
- water uses the existing water mode with restrained motion;
- map/sign glyphs keep full detail to `28 m`, then collapse to the board silhouette;
- tree crown proxies replace full trees beyond `34 m`;
- habitat clutter becomes structural silhouettes beyond `26 m`;
- district geometry is chunked into `core`, `west`, `central`, `east` and `north-buildings`;
- render builders remain lazy even though blueprint bounds remain eager.

### Budget

| Budget | Outdoor | Tropical House |
|---|---:|---:|
| total props | ≤ 5,200 | ≤ 1,800 |
| visible outdoor props | ≤ 2,300 | — |
| batch signatures | ≤ 60 | ≤ 35 |
| loose dynamic props | ≤ 80 | included above |
| things | ≤ 75 | included in scene total |
| body solids | ≤ 180 | proportional |
| camera blockers | ≤ 55 | proportional |
| point lights defined | ≤ 48 | local budget |
| point lights active | ≤ 12 | local budget |

These are blueprint ceilings, not targets. Current zoo baseline is roughly 1,660 props, 31 batch
signatures, 21 things, 64 solids, 15 blockers and 11 lights.

---

## 13. Data and file architecture

Recommended final ownership:

```text
js/zoo-blueprint.js       eager, frozen JSON-compatible geometry and IDs
js/zoo.js                 lazy outdoor compiler and current core art
js/zoo-west.js            wetlands + highlands compiler
js/zoo-central.js         lake + conservation compiler
js/zoo-east.js            savannah compiler
js/zoo-tropical.js        separate indoor scene
js/data.js                roster/dialogue only; derives slots from blueprint
js/vocab.js               new headwords
zoo-blueprint-check.js    pure-Node structural/spatial validator
```

Do not put callbacks, `Math.random`, decoded materials, `Build` calls or `C(...)` values in the
blueprint data. It must be safe to evaluate before GL initialization. Use stable string material
keys and convert them inside the lazy compiler.

Every generated cluster receives its own seed derived from `(revision, globalSeed, objectId)`. The
compiler produces a canonical geometry hash from sorted IDs and quantized numeric values.

---

## 14. Build sequence

### Phase 0 — contract and validator

- Add the eager blueprint module, schema checks and geometry hash.
- Capture current day/night/wide references.
- Add pure-Node checks for IDs, references, wall cuts, bounds, focuses and route sampling.
- Make no visual change.

### Phase 1 — perimeter and circulation

- Expand the ground and public zone.
- Remove the three old perimeter runs and their collision.
- Build W001–W008 and G02–G04.
- Build P101–P118 and S201–S204 without habitats.
- Prove both spawns reach every reserved habitat focus.

### Phase 2 — visitor infrastructure

- Build west gate, rest hubs, maps, fingerposts, water, first aid, benches, bins and lamps.
- Verify local tags and focuses.
- Add planting only after circulation passes.

### Phase 3 — western districts

- Build H10–H13, then H20–H21.
- Water habitats come after the boardwalk is collision-clean.
- Add western keeper route only when every gate segment is verified.

### Phase 4 — central districts

- Build H31 water collision before B04 pavilion and bridge.
- Build H32, H30 and H33.
- Build conservation wings and elevated bridge last so ground clearance can be audited.

### Phase 5 — eastern savannah

- Build H40–H43 and their large-scale silhouettes.
- Keep transfer corridors locked until an interlock exists.
- Add the east keeper and service routes.

### Phase 6 — Tropical House

- Build outdoor shell and transition.
- Build the separate interior envelope, routes and six exhibits.
- Verify round-trip arrival, time, state and camera settings.

### Phase 7 — living systems

- Add rigs, schedules, keepers, visitors, dialogue, actions and vocabulary.
- Update deliberate animal-count expectations in boot tests.
- Give new named NPCs unique `npcId`, `rig` and `storyKey` values.

### Phase 8 — graphics and release

- Finish materials, vegetation, water, night lighting, LOD and culling.
- Add old-save migration only for coordinates invalidated by removed wall solids.
- Run the full acceptance gate below.

Each phase must leave a complete, playable loop. A phase may not depend on a later habitat to make
its paths reachable.

---

## 15. Acceptance contract

The included `zoo-blueprint-check.js` must fail on every one of these:

1. duplicate ID or unresolved reference;
2. non-finite, reversed, off-grid or out-of-bounds geometry;
3. a gate cut that differs between visible wall, body solid and camera blocker;
4. overlapping habitats, protected path envelopes or unrelated buildings;
5. a disconnected public or accessible path graph;
6. an opening narrower than its access contract;
7. a public focus inside a habitat, collider or water solid;
8. a focus outside its assigned path envelope or unreachable from a public spawn;
9. a tagged prop with no matching local thing;
10. an animal slot outside the safe habitat inset or on the wrong substrate;
11. a keeper entering anywhere except a service gate;
12. a route sample displaced by `clampMove` at the actor radius;
13. a public route on a staff path or animal route outside its habitat;
14. an unknown species, act, object archetype, material or vocabulary word;
15. a Tropical House exit that returns to the wrong place, coordinate or yaw;
16. a scene exceeding a prop, batch, solid, blocker or active-light budget;
17. a geometry hash that changes without a blueprint revision.

### Required project checks once implemented

```sh
node --check js/zoo-blueprint.js
node --check js/zoo.js
node --check js/zoo-tropical.js
node zoo-blueprint-check.js
node .thingcheck.js zoo
node .sitcheck.js zoo
node .bootcheck.js
node .places.js
node .glyphcheck.js
node .audit.js Z
npm run zoo
node .fpscheck.js zoo
PLAY=1 LEVEL=0 node .fpscheck.js zoo
PLAY=1 node .fpscheck.js zoo
```

Open the audit images. Required cameras are south arrival, wetland wide, highlands rail, lake bridge,
conservation centre, savannah wide, Tropical House lobby, Tropical House atrium, north promenade,
west gate, rain and 21:00 lighting. A render does not prove reachability; route and focus flood checks
remain mandatory.

---

## 16. Instructions to the building AI

1. Read the entire JSON before editing code.
2. Preserve all D0 coordinates and existing interaction identities.
3. Implement the phases in order; do not scatter partial habitats across the whole map.
4. Compile repeated geometry from IDs and schedules; do not copy coordinates into multiple files.
5. Keep every new tagged object paired with a local thing and legal focus.
6. Use exact wall/gate intervals. Never approximate an opening by eye.
7. Run the pure geometry validator after every wall, path, habitat or route change.
8. Stop and fix the first disconnected focus before adding decoration.
9. Keep the Tropical House separate from outdoor rendering and acoustics.
10. Record intentional coordinate changes by incrementing `revision` and updating the geometry hash.

The plan is intentionally additive: the current zoo remains a complete South Heritage Core while
the new districts can be built and released one at a time.
