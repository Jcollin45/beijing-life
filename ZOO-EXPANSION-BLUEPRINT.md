# 动物园扩建总图 — Zoo Expansion Master Blueprint

This is a construction specification, not a mood board. It expands the existing zoo from a
`44 × 32 m` core to a `116 × 86 m` campus while leaving the current gate, spawn, subway, seven
habitats, interaction identities and saved player coordinates in their existing scene frame. Four
core furnishings and the guide map are explicitly relocated where the new central spine requires
clearance; those moves are listed below rather than hidden in implementation code.

The machine-readable source of truth is
[`ZOO-EXPANSION-BLUEPRINT.json`](ZOO-EXPANSION-BLUEPRINT.json). If a coordinate in prose ever
disagrees with the JSON, use the JSON and correct this document in the same change.

The finished plan contains:

- **9,976 m²** inside the wall, versus 1,408 m² today — **7.09× the current area**
- the **seven existing habitats**, preserved in place
- **fourteen new outdoor habitat zones**
- a separate **six-zone Tropical House** interior
- three primary north–south walks, three cross avenues, a wetland boardwalk and a separated staff
  service patrol network
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

This document describes blueprint revision **2**. The JSON carries a canonical SHA-256 geometry
hash; `zoo-blueprint-check.js` recomputes it over every placement-bearing section.

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
| Guide map | current `(-16.2,-13.8)` → new `(-16.2,-9)` | redraw for the larger site; focus `(-15.2,-9)` |
| Kiosk | centre `(6,-14.95)` | preserve zoo-local `USE_AT.zoo['小卖部']` |
| Panda garden | centre `(-12,-7.45)`, solid half-size `1.52` | preserve two clear approach branches |
| Four staff gates | `(-16,.7)`, `(-12,13.5)`, `(16,2.6)`, `(8.3,13.5)` | preserve current keeper-route agreement |

### Required core clearance moves

These five moves are part of the canonical plan. They open P104 from the old north cross while
preserving every habitat rectangle and the arrival spawn.

| ID | Object | From | To | Reason |
|---|---|---|---|---|
| PF-MAP | guide map | `(-16.2,-13.8)` | `(-16.2,-9)` | clear entry paving and restore its sight line |
| PF-RELOC-TREE-01 | tree | `(-2,9.6)` | `(-16.2,9.8)` | remove trunk from P104 |
| PF-RELOC-TREE-02 | tree | `(-2.4,14.6)` | `(14.8,10.8)` | clear the P104/P04 threshold |
| PF-RELOC-BIN-01 | bin | `(-3.4,15.15)` | `(16.3,11.8)` | clear the accessible envelope |
| PF-RELOC-LAMP-01 | lamp | `(0,15.45)` | `(16.2,9.5)` | clear the accessible envelope |

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

B01 stays entirely inside the site at `x[-58,-55.5] z[19.5,28.5]`. Only its south pier strip
`z[19.5,20.5]` and north pier strip `z[27.5,28.5]` are solid. The middle passage
`z[20.5,27.5]` is clear to `y=4.1`; P117 passes beneath the roof.

---

## 5. Circulation plan

### Public network

| ID | Centreline | Width | Surface | Role |
|---|---|---:|---|---|
| P101 | `(-50.5,-13.2) → (-20,-13.2)` | 3.6 | paving | west extension of south loop |
| P102 | `(20,-13.2) → (50.5,-13.2)` | 3.6 | paving | east extension of south loop |
| P103 | `x=-19, z14.4→64` | 4.0 | dark paving | West Zoo Avenue |
| P104 | `x=-2, z5.5→64` | 5.0 | paving | continuous Central Conservation Walk from P06 |
| P105 | `x=19, z14.4→64` | 4.0 | dark paving | East Zoo Avenue |
| P106 | `z=18, x-50→50` | 4.0 | paving | first cross avenue; stops inside service lanes |
| P107 | `z=40, x-50→50` | 4.0 | paving | conservation cross avenue; stops inside service lanes |
| P108 | `z=64, x-50→50` | 4.0 | dark paving | north promenade |
| P110 | `x=-36.5, z-13.2→18` | 2.6 | timber | continuous wetland boardwalk |
| P112 | `x=-36.5, z20→38` | 2.6 | stone | highlands walk |
| P114 | `x=39, z20→38` | 2.8 | paving | north savannah walk |
| P115 | `x=39, z-13.2→18` | 2.8 | paving | continuous south savannah walk |
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
| S201 | `x=-53.5, z-11→68.2` | 2.4 | west service lane |
| S202 | `x=53.5, z-11→68.2` | 2.4 | east service lane |
| S203 | `z=68.2, x-53.5→53.5` | 2.4 | north service lane |
| S204 | `z=44.5, x-53.5→-51` | 2.8 | operations entry spur; ends at west gate |
| S205 | `(53.5,45.5)→(58,45.5)` | 3.5 | east service-gate approach |
| S206 | `(40,68.2)→(40,70)` | 4.0 | north emergency-gate approach |

These lanes are not public path zones. If the scene retains one large walkable zone, keep them
closed with compound fences and staff gates; do not rely on a different paving color to enforce
access.

The only public/service overlap is `CROSS-G02-WEST` at `(-53.5,24)`, where P117 crosses S201. It is
a `4 m` raised red table with pedestrian priority, a staff stop line and removable bollards. Every
other public avenue ends at `x=±50`, leaving positive clearance to the service lanes.

### Network topology

The three old north exits become P103, P104 and P105:

- P103 continues the current west loop at `x=-19`.
- P104 starts on P06 at `(-2,5.5)`, rises through the gap between the existing monkey and tiger
  pens, and reaches the north promenade without an unpaved break.
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
| H10 | 水獭 otter | `x[-50,-39] z[-9,-1]` | `x1 / (-37.25,-5)` | BA-WET-GLASS | `x0 @ z=-5`, 1.8 |
| H11 | 河马 hippo | `x[-50,-39] z[2,15]` | `x1 / (-37.25,8.5)` | BA-HIPPO | `x0 @ z=12`, 2.4 |
| H12 | 火烈鸟 flamingo | `x[-34,-24] z[-9,3.5]` | `x0 / (-35.75,-2.75)` | BA-AVIARY-LOW | `x1 @ z=-3`, 1.5 |
| H13 | 丹顶鹤 crane | `x[-34,-24] z[6,15]` | `x0 / (-35.75,10.5)` | BA-AVIARY-TALL | `x1 @ z=12.5`, 1.5 |
| H20 | 羚牛 takin | `x[-50,-39] z[26,37]` | `x1 / (-37.25,31.5)` | BA-HIGHLAND-RAIL | `x0 @ z=33`, 2.2 |
| H21 | 雪豹 snow leopard | `x[-34,-24] z[26,37]` | `x0 / (-35.75,31.5)` | BA-HIGHLAND-GLASS | `x1 @ z=34`, 1.5 |
| H30 | 小熊猫 red panda | `x[-34,-24] z[43,52]` | `x1 / (-20.5,47.5)` | BA-FINE-MESH | `x0 @ z=49`, 1.5 |
| H31 | 天鹅 / 鸳鸯 waterfowl | `x[-16,-6] z[22,36]` | `x1 / (-4.2,29)` | water edge rail | `z1 @ x=-14`, 1.8 |
| H32 | 山羊 / 兔子 family farm | `x[2,16.5] z[22,36]` | `x0 / (0.2,29)` | timber fence, double gate | `x1 @ z=33`, 2.0 |
| H33 | 金丝猴 golden monkey | `x[2,16.5] z[43,52]` | `x0 / (0.2,47.5)` | cable mesh + glass bay | `x1 @ z=49`, 1.6 |
| H40 | 亚洲象 elephant reserve | `x[24,36.5] z[-10,15]` | `x0 / (20.2,2.5)` | dry moat + cable | `x1 @ z=11`, 3.0 |
| H41 | 斑马 / 羚羊 / 长颈鹿 | `x[41.5,50] z[-10,15]` | `x0 / (40,2.5)` | dry moat + rail | `x1 @ z=10`, 2.8 |
| H42 | 犀牛 rhino | `x[24,36.5] z[23,37]` | `x0 / (20.5,30)` | BA-RHINO-MOAT | `x1 @ z=34`, 2.8 |
| H43 | 狮子 lion | `x[41.5,50] z[24,37]` | `x0 / (40,30.5)` | BA-BIGCAT-GLASS | `x1 @ z=34`, 2.0 |

### Habitat wall compiler

Every habitat has four derived, labeled boundary runs:

```text
HW-<habitat>-x0: x=bounds.x0, z=bounds.z0..bounds.z1
HW-<habitat>-x1: x=bounds.x1, z=bounds.z0..bounds.z1
HW-<habitat>-z0: z=bounds.z0, x=bounds.x0..bounds.x1
HW-<habitat>-z1: z=bounds.z1, x=bounds.x0..bounds.x1
```

Subtract `gate.center ± gate.width/2` from the matching run in visible, keeper-body and camera
layers. The player uses a separate full habitat rectangle, while keepers use the cut perimeter;
that distinction keeps public visitors out without sealing staff gates. Generated child IDs are
stable. H31 additionally cuts `x=-6, z[28.2,29.8]` for its public bridge; H32 cuts
`x=2, z[28.1,29.9]` for its supervised double gate; H40 cuts `x=24, z[0.8,3.2]` for X01.

| Archetype | Public / back height | Thickness | Camera top | Material family |
|---|---:|---:|---:|---|
| BA-WET-GLASS | 1.25 / 1.80 | .12 | 1.40 | glass, stone, dark mesh |
| BA-HIPPO | 1.45 / 2.00 | .18 | 1.60 | glass, concrete, earth |
| BA-AVIARY-LOW | .90 / 2.40 | .08 | 0 | dark mesh and planting |
| BA-AVIARY-TALL | 1.10 / 3.80 | .08 | 3.80 | flight mesh and rail |
| BA-HIGHLAND-RAIL | 1.15 / 2.00 | .16 | 1.40 | stone, steel, rock |
| BA-HIGHLAND-GLASS | 2.20 / 3.20 | .14 | 3.20 | glass, rock, mesh |
| BA-FINE-MESH | 2.60 / 3.00 | .08 | 3.00 | fine mesh and planting |
| BA-LAKE-EDGE | .95 / .45 | .10 | 0 | bronze rail, planted bank |
| BA-FAMILY-TIMBER | 1.10 / 1.50 | .14 | 0 | timber |
| BA-PRIMATE-MESH | 3.80 / 4.20 | .10 | 4.20 | cable mesh and glass |
| BA-SAVANNAH-MOAT | .95 / 2.40 | .16 | 1.20 | moat, cable, reinforced wall |
| BA-RHINO-MOAT | 1.10 / 2.20 | .18 | 1.40 | concrete moat and rail |
| BA-BIGCAT-GLASS | 2.40 / 3.20 | .14 | 3.20 | glass, rock, dark mesh |

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

### Animal transfer crossing

X01 is the only surface transfer: elephant corridor `x[16,24] z[0.8,3.2]`. Its four interlocked
gates are at `(16,2)`, `(17.5,2)`, `(20.5,2)` and `(24,2)`, all width `2.4`. Normal state is
**animal gates closed / P03 public path open**. The game may open it only after closing both public
crossing shutters and confirming that no player or visitor occupies the corridor.

The earlier giraffe link was removed because a surface line to H41 crossed H40. H41 receives its
own roster; any future shared giraffe access must be a separately modeled grade-separated tunnel or
bridge, never an undeclared corridor through the elephant habitat.

---

## 7. Buildings

| ID | Building | Footprint | Height | Public entrance |
|---|---|---|---:|---|
| B01 | West Gate pavilion | `x[-58,-55.5] z[19.5,28.5]` | 4.6 | clear passage `z[20.5,27.5]` |
| B02 | West restroom | `x[-34,-28.5] z[20.7,24.5]` | 3.2 | `(-31.2,20.7)`, width 1.6 |
| B03 | East rest hub | `x[42,50] z[20.7,23]` | 3.2 | `(46,20.7)`, width 2.0 |
| B04 | Lake tea pavilion | `x[-12.8,-9.2] z[27.5,31.5]` | 4.2 | `(-9.2,29)`, width 1.6 |
| B05 | Conservation west wing | `x[-17,-6] z[55,62]` | 5.2 | `(-11.5,55)`, width 2.2 |
| B06 | Conservation east wing | `x[2,16.5] z[55,62]` | 5.2 | `(9,55)`, width 2.2 |
| B06b | Glazed bridge gallery | `x[-6,2] z[58,61]`, `y0=4.2` | 3.0 | connects wings above P104 |
| B07 | Operations campus | `x[-51,-37] z[42.5,61.5]` | 4.5 max | staff only |
| B08 | Tropical House | `x[25,50] z[44,62]` | 7.2 | `(25,52)`, width 3.2 |

The bridge has `4.10 m` clear beneath it. Its body solids and blocker begin at `y=4.2`; a ground-
height AABB across P104 would sever the main route.

### Operations campus internal schedule

| Room | Bounds | Function |
|---|---|---|
| Animal hospital | `x[-50,-44] z[47,54.5]` | exam, imaging, treatment and recovery |
| Quarantine | `x[-50,-44] z[55.5,60.5]` | isolated stalls and airlock |
| Feed kitchen | `x[-43,-40] z[47,52]` | dry/cold feed preparation |
| Staff lockers | `x[-43,-40] z[53,56]` | changing, records and break room |
| Service yard | `x[-43,-40] z[57,60.5]` | cart, bins and deliveries |

The compound fence follows `x[-51,-37] z[42.5,61.5]`, is `2.40 m` high and has two gates: west
`(-51,44.5)`, width `3.0`, and east `(-37,44.6)`, width `2.4`. Exact labeled fence runs are:

```text
B07-FW01 x=-51 z42.5..43.0    B07-FW02 x=-51 z46.0..61.5
B07-FW03 x=-37 z42.5..43.4    B07-FW04 x=-37 z45.8..61.5
B07-FW05 z=42.5 x-51..-37     B07-FW06 z=61.5 x-51..-37
```

The internal south vehicle court is `x[-50,-37.3] z[43.2,46]`; the east aisle is
`x[-39.5,-37.3] z[44.5,60.5]`. Neither overlaps a room. S204 ends at the west gate instead of
pretending the room footprints are drivable. The east gate opens into a `3 m` court between the
fence and H30; keeper routes dogleg to `x=-35.5` before turning south.

B06 includes first-aid room `x[2.5,6] z[55.5,58.5]`. Its public fixture is `(4.25,55.2)` with
focus `(4.25,53.5)` on P118. The animal-hospital viewing window is on B07's south facade at
`(-47,42.5)` with public focus `(-47,40)` on P107.

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
exit trigger  (-12.4,6.2), bound to trop-exit
world return  (23.2,52), yaw π/2
```

Wall runs are `TW01 x=-13,z[-10,-2]`, `TW02 x=-13,z[2,5.2]`,
`TW03 x=-13,z[7.2,10]`, `TW04 x=13,z[-10,6]`, `TW05 x=13,z[8.4,10]`,
`TW06 z=-10,x[-13,13]`, and `TW07 z=10,x[-13,13]`. Every run is `0.30 m` thick,
`6.40 m` high, body-solid and a camera blocker to `y=6.40`. Those split east-wall runs are what
make the service opening physically real.

### Interior exhibit schedule

| ID | Exhibit | Local bounds | Species | Public focus |
|---|---|---|---|---|
| T00 | 热带馆大厅 lobby | `x[-12.7,-10] z[-2.5,2.5]` | — | `(-10.2,0)` |
| T01 | 鳄鱼湿地 | `x[-8,-2] z[-8.5,-3]` | 扬子鳄 | `(-5,-2.1)` |
| T02 | 长江水族 | `x[2,7] z[-8.5,-3]` | 中华鲟, fish | `(6.2,-2.1)` |
| T03 | 爬行动物馆 | `x[-8,-2] z[3,8.5]` | 蛇, 蜥蜴 | `(-5,2.1)` |
| T04 | 蝴蝶温室 | `x[2,7] z[3,8.5]` | 蝴蝶 | `(1.1,5.8)` |
| T05 | 夜行动物 | `x[9,11.5] z[3,6]` | 果蝠 | `(8.1,4.5)` |
| T06 | 雨林中庭 | `x[-1,1] z[-8.5,8.5]` | planting/waterfall | `(0,0)` |

### Interior path rectangles

| ID | Local rectangle | Clear width | Connection |
|---|---|---:|---|
| TP01 | `x[-12.7,-1] z[-2,2]` | 4.0 | main door to loops/atrium |
| TP02 | `x[-10,-8] z[-8.5,8.5]` | 2.0 | west loop |
| TP03 | `x[7,9] z[-8.5,8.5]` | 2.0 | east loop; no aquarium overlap |
| TP04 | `x[-10,9] z[-3,-1]` | 2.0 | south cross |
| TP05 | `x[-10,9] z[1,3]` | 2.0 | north cross |
| TP06 | `x[-2,2] z[-8.5,8.5]` | 4.0 | atrium walk |
| TP07 | `x[-13,-8] z[5.2,7.2]` | 2.0 | marked exit spur |
| TS01 | `x[9,13] z[6,8.4]` | 2.4 | staff-only service path |

Rest niches are `TN01 x[-12,-10] z[3.3,5.1]` and
`TN02 x[9,12] z[-1,1]`. Mandatory interior objects are lobby desk `(-10,1.4)`, map
`(-10.5,-2.2)`, waterfall `(0,7.4)`, canopy tree `(0,4.8)`, benches `(-11.2,4.2)` and
`(11.2,0)`, bin `(-10.8,3.6)` and illuminated exit sign `(-12.6,6.2)`. The six species things
`TTH-T01-01` through `TTH-T05-01` give 蛇 and 蜥蜴 separate boards rather than merging their
headwords.

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
| first aid | FA101 | 1 | `(4.25,55.2)` in B06 |
| accessible route sign | AR101 | 1 | `(3.8,20.8)` |
| perimeter trees | PT101–PT112 | 12 | JSON `planting.perimeterTrees` |
| district trees | DT101–DT110 | 10 | JSON `planting.districtTrees` |
| wetland willows | WW101–WW104 | 4 | JSON `wetlandWillows` |
| highland pines | HP101–HP104 | 4 | JSON `highlandPines` |

For benches, `faceYaw` means the direction the seated visitor looks. The bench helper must convert
that to the correct slat/backrest transform and place its interaction focus on the front side. Each
bench gets its own `thing('长椅', ...)`; no singleton interaction is allowed.

Fixture footprints are explicit: bench half-extents `0.75 × 0.28`, bin radius `.22`, lamp radius
`.16`, map-board half-extents `.50 × .28`, water-station radius `.25`, and accessible-sign
half-extents `.42 × .24`. Bins and lamps sit on verges, never on a path centreline. Lamp position is also the authoritative
point for its emissive head, point light, glow pool and narrow body solid. At most **12 outdoor point
lights** may be active in one frame; the renderer only uses the nearest eight.

### Planting rules

- Every tree is `{id, at:[x,z], height, owner}`; anonymous coordinate triples are forbidden.
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

Every listed species receives its own interpretation board and local thing. Single-species
habitats have one; H31 has two, H32 has two and H41 has three. Their eighteen explicit records are
`HT-H10-01` through `HT-H43-01` in JSON, so 天鹅/鸳鸯, 山羊/兔子 and
斑马/羚羊/长颈鹿 never collapse into one ambiguous tag. Each board must provide:

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

Every M100–M105, WS101–WS105, FA101 and AR101 record carries an explicit `thingId`, focus and
reach. Repeated visible tags such as `导游图` and `饮水处` are intentional: the complete set of local
things makes nearest-tag resolution local at every fixture. AR101 uses `无障碍路线` and toggles the
accessible-route overlay, so that required headword is not orphaned.

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
- `R-SERVICE-PATROL` is an explicit out-and-back cart patrol on S201–S203; it is not falsely marked
  as a loop.

Keepers may enter habitats only through their declared service gates. Outside the mall, current NPC
movement is not generally collision-clamped, so every consecutive route segment must itself be
clear and must approach a gate square-on.

All three keeper routes start in B07's south court at `(-38,44.6)`, pass the east gate
`(-37,44.6)`, dogleg through `(-35.5,44.6)` and only then turn south to `(-35.5,40)`. Fifteen
`KFS-*` records define the final keeper-only or timed-shared approach to every habitat/service door;
there is no route centred on the operations fence.

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
- Build the canonical 15 public expansion paths and S201–S206 without habitats.
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
- Keep X01 locked until its four-gate interlock exists; there is no surface giraffe corridor.
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
18. a declared path connection whose physical envelopes do not meet;
19. a visitor-route sample outside player-inset public paving;
20. an uncontrolled public/service path overlap;
21. a fixture or tree collar intruding a protected path envelope;
22. a transfer corridor crossing an unrelated habitat;
23. a Tropical House path below `2.0 m`, disconnected path, sealed door or room overlap;
24. a mixed habitat species without its own board/thing record;
25. a keeper route through an operations room or anywhere other than a declared gate/aisle.

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
