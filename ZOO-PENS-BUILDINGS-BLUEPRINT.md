# Zoo Pens and Buildings — Complete Contents Construction Blueprint

Status: **construction-ready** · revision **1** · parent zoo revision **2**

Content hash: `sha256:cb8cd1ea95de8bd4df7f9904b93d440eef0ccf4062bf81ddf9818b65903acc3c`

This document is the human-readable companion to `ZOO-PENS-BUILDINGS-BLUEPRINT.json`. The JSON is canonical. Load it only after the parent revision/hash matches `ZOO-EXPANSION-BLUEPRINT.json`.

## Construction contract

- Units are metres. World X points east, Y points up, and Z points north.
- `at` is `[x,y,z]`; `size` is full `[width,height,depth]`; `rect` is `[x0,x1,z0,z1]`.
- Yaw 0 faces north/+Z; +π/2 faces east/+X.
- Build only records marked `build-v1`. Records marked `existing-r2` document geometry already present and prevent duplicates.
- Base IDs belong to the first structural primitive; generated child parts use `/G01`, `/G02`, and so on.
- Every public focus must remain standable for a 0.30m-radius actor.

## Scope and totals

- 21 outdoor habitats: 7 preserved core + 14 expansion habitats
- 9 site buildings/structures
- 7 Tropical House rooms/exhibits
- 409 exact content records; 237 are additive build-v1 placements
- 31 material definitions and 30 construction archetypes
- 8 local outdoor fixture interactions extend the parent thing cap from 75 to 83

## Build sequence

0. **CV1-P00 — validate parent and content revisions.** schema; parent.geometryHash; contentHash; stable IDs.
1. **CV1-P01 — compile shells, room partitions and habitat barriers.** building shell runs; door cuts; public/animal/service gates.
2. **CV1-P02 — compile substrates and water.** surface-rect; pool-volume; drains.
3. **CV1-P03 — compile large habitat structures.** shelters; dens; rock clusters; trees; climbing frames.
4. **CV1-P04 — compile feeding, drinking and keeper infrastructure.** troughs; safe zones; cameras; service cabinets.
5. **CV1-P05 — compile building fit-out.** counters; sanitary fixtures; furniture; display cases; storage.
6. **CV1-P06 — compile Tropical House fit-out and environmental systems.** terrariums; aquarium fixtures; mist; heat; red light; filtration.
7. **CV1-P07 — compile learning and interaction layer.** screens; signs; things; focus points; bilingual copy.
8. **CV1-P08 — spawn animals and bind activity anchors.** population; activityAnchors; hours; acts.
9. **CV1-P09 — run construction acceptance suite.** containment; clearance; reachability; collision; budgets; hash.

## Outdoor habitat contents

### H00-penguin — 企鹅池

Bounds: `[-6, 0, -11, -5.5]` · public side: `z0` · species: 企鹅

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H00/S01 | wet concrete habitat floor | rect [-6, 0, -11, -5.5] | M-CONCRETE-DARK | none | existing-r2 | primary substrate |
| H00/W01 | main swimming pool | rect [-4.8, -0.4, -9.45, -5.85] · y 0…0.72 | M-WATER | none | existing-r2 | swimming and cooling |
| H00/O01 | west haul-out rock | at (-4.7, 0, -6.6) · size (2.4 × 0.82 × 2) | M-ROCK | none | existing-r2 | dry resting and visual cover |
| H00/O02 | four-step east haul-out | at (-1.4, 0, -9.15) · size (2.4 × 0.42 × 1.24) | M-CONCRETE | none | existing-r2 | accessible pool exit |
| H00/O03 | nest box A | at (-4.6, 0, -5.95) · size (0.78 × 0.62 × 0.62) | M-ROCK | none | build-v1 | covered nest |
| H00/O04 | nest box B | at (-3.65, 0, -5.95) · size (0.78 × 0.62 × 0.62) | M-ROCK | none | build-v1 | covered nest |
| H00/O05 | fish feed tray | at (-4.75, 0, -9.85) · size (0.85 × 0.18 × 0.55) | M-FOOD-STEEL | none | build-v1 | keeper feeding point |
| H00/O06 | pool floor drain | at (-2.6, -0.7, -7.65) · size (0.45 × 0.03 × 0.45) | M-STEEL | none | build-v1 | pool filtration intake |
| H00/O07 | keeper safety square | at (-5.25, 0.02, -10.25) · size (1 × 0.02 × 1) | M-CONCRETE | none | build-v1 | keeper entry landing |
| H00/O08 | habitat camera | at (-5.55, 0, -6) · size (0.22 × 3.2 × 0.22) | M-STEEL-DARK | none | build-v1 | welfare monitoring |

Animal population/activity anchors:

- H00/A01: 企鹅 —  · hours 6–22
- H00/A02: 企鹅二 —  · hours 6–22
- H00/A03: 企鹅三 —  · hours 6–22

### H01-giraffe — 长颈鹿草场

Bounds: `[5, 14, -11, -5.5]` · public side: `z0` · species: 长颈鹿

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H01/S01 | sand paddock floor | rect [5, 14, -11, -5.5] | M-SAND | none | existing-r2 | primary substrate |
| H01/O01 | west browse tree | at (7.2, 0, -7.1) · size (2.1 × 3.9 × 2.1) | M-FOLIAGE | none | existing-r2 | natural browse and shade |
| H01/O02 | east browse tree | at (12, 0, -7.5) · size (2.1 × 3.9 × 2.1) | M-FOLIAGE | none | existing-r2 | natural browse and shade |
| H01/O03 | low water trough | at (8.15, 0, -8.95) · size (1.88 × 0.36 × 0.88) | M-CONCRETE | none | existing-r2 | drinking station |
| H01/O04 | raised keeper feeding deck | at (10.9, 0, -7.2) · size (3.6 × 3.85 × 2.2) | M-TIMBER | none | existing-r2 | high browse presentation |
| H01/O05 | seven-slot browse rack | at (10.9, 3.26, -8.26) · size (3.4 × 0.8 × 0.2) | M-TIMBER-DARK | none | existing-r2 | holds leafy browse |
| H01/O06 | sand drainage channel | at (9.2, 0.01, -10.25) · size (3.2 × 0.03 × 0.35) | M-STEEL | none | build-v1 | surface drainage |
| H01/O07 | keeper safety square | at (13.2, 0.02, -6.25) · size (1 × 0.02 × 1) | M-CONCRETE | none | build-v1 | service-gate landing |
| H01/O08 | habitat camera | at (5.45, 0, -6) · size (0.22 × 3.6 × 0.22) | M-STEEL-DARK | none | build-v1 | welfare monitoring |

Animal population/activity anchors:

- H01/A01: 长颈鹿 —  · hours 6–21
- H01/A02: 长颈鹿二 —  · hours 6–21

### H02-panda — 熊猫馆

Bounds: `[-16, -8, -2.5, 4]` · public side: `x1` · species: 熊猫

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H02/S01 | grass yard | rect [-16, -8, -2.5, 4] | M-GRASS | none | existing-r2 | primary substrate |
| H02/O01 | south bamboo clump | at (-14.6, 0, -0.9) · size (2.2 × 3.6 × 2.2) | M-BAMBOO | body | existing-r2 | feeding cover |
| H02/O02 | north-west bamboo clump | at (-14.8, 0, 2.5) · size (2.2 × 3.9 × 2.2) | M-BAMBOO | body | existing-r2 | feeding cover |
| H02/O03 | north-centre bamboo clump | at (-12.4, 0, 3) · size (2.2 × 3.3 × 2.2) | M-BAMBOO | body | existing-r2 | feeding cover |
| H02/O04 | heated panda house | at (-14.1, 0, 0.75) · size (3.5 × 3 × 3.9) | M-RENDER | camera-blocker | existing-r2 | indoor retreat |
| H02/O05 | south climbing frame | at (-10.4, 0, -0.6) · size (0.8 × 0.85 × 2.5) | M-TIMBER | body | existing-r2 | climbing and resting |
| H02/O06 | north climbing frame | at (-11.2, 0, 1.9) · size (0.8 × 0.85 × 2.5) | M-TIMBER | body | existing-r2 | climbing and resting |
| H02/O07 | drinking bowl | at (-9.35, 0, 2.9) · size (0.9 × 0.22 × 0.65) | M-ROCK | none | build-v1 | fresh drinking water |
| H02/O08 | cooling stone | at (-9.6, 0, -1.45) · size (1.4 × 0.24 × 1) | M-ROCK-LIGHT | none | build-v1 | summer resting slab |
| H02/O09 | keeper safety square | at (-15.3, 0.02, 0.7) · size (1 × 0.02 × 1) | M-CONCRETE | none | build-v1 | west service-gate landing |
| H02/O10 | habitat camera | at (-8.45, 0, 3.5) · size (0.22 × 3.2 × 0.22) | M-STEEL-DARK | none | build-v1 | welfare monitoring |

Animal population/activity anchors:

- H02/A01: 熊猫 —  · hours 7–20
- H02/A02: 熊猫二 —  · hours 7–20

### H03-peacock — 孔雀鸟舍

Bounds: `[-4, 2, -2.5, 4]` · public side: `z0` · species: 孔雀

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H03/S01 | aviary grass floor | rect [-4, 2, -2.5, 4] | M-MEADOW | none | existing-r2 | primary substrate |
| H03/O01 | full-height aviary cage | at (-1, 0, 0.75) · size (6 × 4.2 × 6.5) | M-MESH | camera-blocker | existing-r2 | flight containment |
| H03/O02 | diagonal timber perch | at (-1.8, 1.4, 1.35) · size (2.6 × 0.12 × 0.12) | M-TIMBER | none | existing-r2 | roosting |
| H03/O03 | north-east shrub | at (1.35, 0, 3.28) · size (1.1 × 1.1 × 1.1) | M-FOLIAGE | none | existing-r2 | cover and nesting |
| H03/O04 | grain feeder | at (-2.8, 0, 2.7) · size (0.75 × 0.24 × 0.55) | M-FOOD-STEEL | none | build-v1 | daily feeding |
| H03/O05 | dust bath | at (0.45, 0, 1.4) · size (1.15 × 0.12 × 0.9) | M-SAND | none | build-v1 | dust bathing |
| H03/O06 | shallow drinker | at (-2.75, 0, -1.5) · size (0.8 × 0.18 × 0.55) | M-CERAMIC | none | build-v1 | fresh drinking water |
| H03/O07 | keeper safety square | at (1.25, 0.02, 3.35) · size (0.9 × 0.02 × 0.9) | M-CONCRETE | none | build-v1 | service landing |
| H03/O08 | habitat camera | at (1.55, 0, -1.95) · size (0.22 × 3.2 × 0.22) | M-STEEL-DARK | none | build-v1 | welfare monitoring |

Animal population/activity anchors:

- H03/A01: 孔雀 —  · hours 6–21
- H03/A02: 孔雀二 —  · hours 6–21

### H04-elephant — 大象院

Bounds: `[6, 16, -2.5, 4]` · public side: `x0` · species: 大象

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H04/S01 | sand yard | rect [6, 16, -2.5, 4] | M-SAND | none | existing-r2 | primary substrate |
| H04/O01 | mud wallow outer basin | at (13, 0, 0.75) · size (4.2 × 0.25 × 3.4) | M-MUD | none | existing-r2 | dusting and cooling |
| H04/O02 | east rock cluster | at (14.65, 0, 3.05) · size (2.3 × 1.05 × 2) | M-ROCK | none | existing-r2 | scratching and visual cover |
| H04/O03 | open elephant shelter | at (13.6, 0, -0.5) · size (4.8 × 4 × 4.2) | M-CONCRETE-DARK | camera-blocker | existing-r2 | shade and rain cover |
| H04/O04 | suspended enrichment ball | at (11.55, 0, -0.32) · size (0.7 × 3.4 × 0.7) | M-RUBBER | none | existing-r2 | moving enrichment |
| H04/O05 | drinking trough | at (8.2, 0, 2.5) · size (1.9 × 0.42 × 0.9) | M-CONCRETE | none | build-v1 | fresh drinking water |
| H04/O06 | scrub post | at (9.3, 0, -0.8) · size (0.42 × 2.4 × 0.42) | M-TIMBER-DARK | none | build-v1 | skin care and enrichment |
| H04/O07 | keeper safety square | at (15.25, 0.02, 2.6) · size (1 × 0.02 × 1) | M-CONCRETE | none | build-v1 | east service-gate landing |
| H04/O08 | habitat camera | at (6.55, 0, 3.45) · size (0.24 × 4 × 0.24) | M-STEEL-DARK | none | build-v1 | welfare monitoring |
| H04/O09 | wallow overflow drain | at (14.35, -0.23, 0.75) · size (0.45 × 0.03 × 0.45) | M-STEEL | none | build-v1 | mud-wallow level control and washout |

Animal population/activity anchors:

- H04/A01: 大象 —  · hours 6–21
- H04/A02: 大象二 —  · hours 6–21

### H05-monkey — 猴山

Bounds: `[-13, -5, 7, 13.5]` · public side: `z0` · species: 猴子

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H05/S01 | hard enclosure floor | rect [-13, -5, 7, 13.5] | M-CONCRETE-DARK | none | existing-r2 | primary substrate |
| H05/W01 | continuous water moat | rect [-12.4, -5.6, 7.6, 12.9] · y 0…0.55 | M-WATER | none | existing-r2 | animal containment and swimming |
| H05/O01 | central dry island | at (-9, 0, 10.25) · size (5.2 × 0.16 × 4.4) | M-CONCRETE-DARK | none | existing-r2 | dry activity surface |
| H05/O02 | monkey hill | at (-9, 0, 10.7) · size (5.8 × 2.15 × 4.8) | M-ROCK | camera-blocker | existing-r2 | climbing and lookout |
| H05/O03 | west front ledge | at (-10.8, 0, 8.9) · size (1.15 × 0.55 × 0.78) | M-ROCK | none | existing-r2 | low climbing step |
| H05/O04 | centre front ledge | at (-9, 0, 8.7) · size (1.3 × 0.72 × 0.78) | M-ROCK | none | existing-r2 | low climbing step |
| H05/O05 | east front ledge | at (-7.2, 0, 9.05) · size (1.05 × 0.48 × 0.78) | M-ROCK | none | existing-r2 | low climbing step |
| H05/O06 | hilltop dead tree | at (-8.2, 2.15, 10.65) · size (1.6 × 2.1 × 1) | M-TIMBER-DARK | none | existing-r2 | climbing and lookout |
| H05/O07 | rope traverse | at (-9, 2.6, 10.4) · size (4.2 × 0.12 × 2.8) | M-TIMBER | none | build-v1 | brachiation enrichment |
| H05/O08 | keeper feed basket | at (-11.6, 0, 11.8) · size (0.75 × 0.32 × 0.55) | M-FOOD-STEEL | none | build-v1 | scatter-feed staging |
| H05/O09 | keeper safety square | at (-12.1, 0.02, 12.75) · size (0.9 × 0.02 × 0.9) | M-CONCRETE | none | build-v1 | north service-gate landing |
| H05/O10 | habitat camera | at (-5.5, 0, 12.9) · size (0.22 × 3.6 × 0.22) | M-STEEL-DARK | none | build-v1 | welfare monitoring |
| H05/O11 | moat filtration intake | at (-11.85, -0.53, 8.1) · size (0.45 × 0.03 × 0.45) | M-STEEL | none | build-v1 | water circulation and safe draw-down |

Animal population/activity anchors:

- H05/A01: 猴子 —  · hours 6–21
- H05/A02: 猴子二 —  · hours 6–21
- H05/A03: 猴子三 —  · hours 7–20
- H05/A04: 猴子四 —  · hours 7–20

### H06-tiger — 老虎山林

Bounds: `[1, 10, 7, 13.5]` · public side: `z0` · species: 老虎

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H06/S01 | long grass yard | rect [1, 10, 7, 13.5] | M-GRASS | none | existing-r2 | primary substrate |
| H06/O01 | west shade outcrop | at (2, 0, 12.95) · size (2.4 × 1.35 × 2) | M-ROCK | none | existing-r2 | shade and lookout |
| H06/O02 | east shade outcrop | at (9, 0, 12.95) · size (2.4 × 1.35 × 2) | M-ROCK | none | existing-r2 | shade and lookout |
| H06/O03 | fallen branching trunk | at (7.1, 0.26, 9.4) · size (3.2 × 0.48 × 0.48) | M-TIMBER | none | existing-r2 | scratching and cover |
| H06/O04 | fourteen-clump long grass zone | at (4.6, 0, 9.3) · size (5.6 × 0.7 × 3.3) | M-WILLOW | none | existing-r2 | concealment |
| H06/O05 | shallow cooling pool | at (2.4, 0, 8.35) · size (2 × 0.28 × 1.35) | M-WATER | none | build-v1 | summer cooling |
| H06/O06 | meat feed hatch | at (8.7, 0, 12) · size (0.95 × 0.3 × 0.65) | M-FOOD-STEEL | none | build-v1 | protected feeding station |
| H06/O07 | keeper safety square | at (8.3, 0.02, 12.75) · size (1 × 0.02 × 1) | M-CONCRETE | none | build-v1 | north service-gate landing |
| H06/O08 | habitat camera | at (1.45, 0, 12.95) · size (0.22 × 3.6 × 0.22) | M-STEEL-DARK | none | build-v1 | welfare monitoring |
| H06/O09 | cooling-pool drain | at (2.4, -0.27, 8.35) · size (0.38 × 0.03 × 0.38) | M-STEEL | none | build-v1 | pool filtration and cleaning |

Animal population/activity anchors:

- H06/A01: 老虎 —  · hours 6–22

### H10-otter — 水獭栖息地

Bounds: `[-50, -39, -9, -1]` · public side: `x1` · species: 水獭

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H10-otter/S01 | water | rect [-49, -43, -8, -2] · y -0.7…0 | M-WATER | none | existing-r2 | primary habitat substrate |
| H10-otter/S02 | rock bank | rect [-43, -39.5, -8.5, -1.5] · y 0…0.02 | M-ROCK | none | existing-r2 | primary habitat substrate |
| H10-otter/O01 | rock cluster | at (-42.4, 0, -3.1) · size (3.36 × 1.3 × 2.8) | M-ROCK | none | existing-r2 | climbing, shade and habitat structure |
| H10-otter/O02 | ground log | at (-45.6, 0, -6.5) · size (3 × 0.48 × 0.4) | M-TIMBER | none | existing-r2 | scratching and enrichment |
| H10-otter/O03 | animal den | rect [-49.5, -47, -3.4, -1.3] · y 0…1.24 | M-ROCK | none | existing-r2 | covered retreat |
| H10-otter/O04 | keeper landing | rect [-50, -49, -5.9, -4.1] | M-CONCRETE | none | existing-r2 | dry staff entry landing |
| H10/OPS01 | fish preparation tray | at (-42, 0, -7.3) · size (0.9 × 0.25 × 0.6) | M-FOOD-STEEL | none | build-v1 | daily scatter-feed point |
| H10/OPS02 | pool circulation drain | at (-47.2, -0.68, -6.9) · size (0.45 × 0.03 × 0.45) | M-STEEL | none | build-v1 | filtration intake |
| H10/OPS03 | keeper safety square | at (-49.45, 0.02, -5) · size (0.9 × 0.02 × 1.4) | M-CONCRETE | none | build-v1 | dry service-gate landing |
| H10/OPS04 | habitat camera | at (-39.55, 0, -1.55) · size (0.22 × 3.2 × 0.22) | M-STEEL-DARK | none | build-v1 | pool and bank monitoring |

Animal population/activity anchors:

- H10-otter/A01: 水獭 — (-47.25, 0, -6.2) · swim · hours 7–20
- H10-otter/A02: 水獭 — (-45.05, 0, -3.4) · swim · hours 7–20
- H10-otter/A03: 水獭 — (-41.42, 0, -6.6) · lie · hours 7–20
- H10-otter/A04: 水獭 — (-42.52, 0, -3) · eat · hours 7–20

### H11-hippo — 河马栖息地

Bounds: `[-50, -39, 2, 15]` · public side: `x1` · species: 河马

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H11-hippo/S01 | water | rect [-48.8, -42.5, 3, 13.8] · y -1.2…0 | M-WATER | none | existing-r2 | primary habitat substrate |
| H11-hippo/S02 | sand | rect [-42.5, -39.5, 3, 13.8] · y 0…0.02 | M-SAND | none | existing-r2 | primary habitat substrate |
| H11-hippo/O01 | shade shelter | at (-41.3, 0, 12.4) · size (3.4 × 3.2 × 3.8) | M-TIMBER-DARK | none | existing-r2 | shade and rain cover |
| H11-hippo/O02 | feed trough | at (-41, 0, 5) · size (1.35 × 0.34 × 0.55) | M-FOOD-STEEL | none | existing-r2 | feeding or drinking station |
| H11-hippo/O03 | scrub post | at (-41.2, 0, 8.1) · size (0.32 × 1.5 × 0.32) | M-TIMBER-DARK | none | existing-r2 | rubbing enrichment |
| H11-hippo/O04 | keeper landing | rect [-50, -48.8, 10.8, 13.2] | M-CONCRETE | none | existing-r2 | dry staff entry landing |
| H11/OPS01 | pool circulation drain | at (-47.7, -1.18, 11.8) · size (0.55 × 0.03 × 0.55) | M-STEEL | none | build-v1 | filtration intake |
| H11/OPS02 | hose bib and wash post | at (-40, 0, 13.8) · size (0.24 × 1.1 × 0.24) | M-STEEL | none | build-v1 | wash-down water supply |
| H11/OPS03 | keeper safety square | at (-49.4, 0.02, 12) · size (1 × 0.02 × 1.6) | M-CONCRETE | none | build-v1 | dry service-gate landing |
| H11/OPS04 | habitat camera | at (-39.55, 0, 2.55) · size (0.24 × 3.8 × 0.24) | M-STEEL-DARK | none | build-v1 | pool and bank monitoring |

Animal population/activity anchors:

- H11-hippo/A01: 河马 — (-47.25, 0, 6.55) · swim · hours 7–20
- H11-hippo/A02: 河马 — (-45.6, 0, 11.36) · swim · hours 7–20
- H11-hippo/A03: 河马 — (-41.64, 0, 7.85) · lie · hours 7–20
- H11-hippo/A04: 河马 — (-41.42, 0, 4.6) · eat · hours 7–20

### H12-flamingo — 火烈鸟栖息地

Bounds: `[-34, -24, -9, 3.5]` · public side: `x0` · species: 火烈鸟

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H12-flamingo/S01 | shallow water | rect [-33, -25, -8, 1.7] · y -0.18…0 | M-WATER | none | existing-r2 | primary habitat substrate |
| H12-flamingo/S02 | mud islands | centres (-30.5, -4.5), (-27.2, -1.4) | M-MUD | none | existing-r2 | mud nesting islands |
| H12-flamingo/O01 | nest island | at (-30.5, 0, -4.5) · size (2.2 × 0.2 × 2.2) | M-EARTH | none | existing-r2 | nesting |
| H12-flamingo/O02 | reed bed | at (-26, 0, 0.5) · size (2.2 × 1.2 × 2.2) | M-WILLOW | none | existing-r2 | wetland cover |
| H12-flamingo/O03 | feed pan | at (-27, 0, -6.8) · size (0.85 × 0.34 × 0.85) | M-FOOD-STEEL | none | existing-r2 | feeding or drinking station |
| H12-flamingo/O04 | keeper landing | rect [-25, -24, -3.75, -2.25] | M-CONCRETE | none | existing-r2 | dry staff entry landing |
| H12/OPS01 | supplement feeder | at (-32.1, 0, -7.1) · size (0.8 × 0.18 × 0.55) | M-FOOD-STEEL | none | build-v1 | mineral feed |
| H12/OPS02 | shallow-water drain | at (-31.9, -0.16, 0.7) · size (0.42 × 0.03 × 0.42) | M-STEEL | none | build-v1 | wetland drain |
| H12/OPS03 | keeper safety square | at (-24.55, 0.02, -3) · size (0.8 × 0.02 × 1.2) | M-CONCRETE | none | build-v1 | service-gate landing |
| H12/OPS04 | habitat camera | at (-24.5, 0, 3) · size (0.22 × 3.2 × 0.22) | M-STEEL-DARK | none | build-v1 | flock monitoring |

Animal population/activity anchors:

- H12-flamingo/A01: 火烈鸟 — (-30.5, 0, -4.625) · graze · hours 7–20
- H12-flamingo/A02: 火烈鸟 — (-27.5, 0, -1.5) · graze · hours 7–20
- H12-flamingo/A03: 火烈鸟 — (-28.5, 0, -5.875) · preen · hours 7–20

### H13-crane — 丹顶鹤栖息地

Bounds: `[-34, -24, 6, 15]` · public side: `x0` · species: 丹顶鹤

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H13-crane/S01 | marsh | rect [-33, -25, 7, 12] · y 0…0.02 | M-MEADOW | none | existing-r2 | primary habitat substrate |
| H13-crane/S02 | grass | rect [-33, -25, 12, 14] · y 0…0.02 | M-MEADOW | none | existing-r2 | primary habitat substrate |
| H13-crane/O01 | reed bed | at (-31, 0, 9) · size (2.2 × 1.2 × 2.2) | M-WILLOW | none | existing-r2 | wetland cover |
| H13-crane/O02 | nest platform | at (-27, 0, 12.8) · size (1.44 × 0.2 × 1.44) | M-TIMBER | none | existing-r2 | raised nesting |
| H13-crane/O03 | shallow pool | rect [-32.5, -27, 7.3, 10.5] · y 0…0.22 | M-WATER-LIGHT | none | existing-r2 | water or wallow enrichment |
| H13/OPS01 | grain feeder | at (-25.7, 0, 13.5) · size (0.8 × 0.2 × 0.55) | M-FOOD-STEEL | none | build-v1 | daily grain feed |
| H13/OPS02 | marsh drain | at (-32, -0.12, 8.1) · size (0.42 × 0.03 × 0.42) | M-STEEL | none | build-v1 | water-level control |
| H13/OPS03 | keeper safety square | at (-24.55, 0.02, 13.2) · size (0.8 × 0.02 × 1.1) | M-CONCRETE | none | build-v1 | service landing |
| H13/OPS04 | habitat camera | at (-33.5, 0, 14.5) · size (0.22 × 3.2 × 0.22) | M-STEEL-DARK | none | build-v1 | nest and marsh monitoring |

Animal population/activity anchors:

- H13-crane/A01: 丹顶鹤 — (-30.5, 0, 8.7) · graze · hours 7–20
- H13-crane/A02: 丹顶鹤 — (-27.5, 0, 11.4) · display · hours 7–20
- H13-crane/A03: 丹顶鹤 — (-26.5, 0, 13.2) · sit · hours 7–20

### H20-takin — 羚牛栖息地

Bounds: `[-50, -39, 26, 37]` · public side: `x1` · species: 羚牛

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H20-takin/S01 | rock grass | rect [-49.5, -39.5, 26.5, 36.5] · y 0…0.02 | M-ROCK | none | existing-r2 | primary habitat substrate |
| H20-takin/O01 | rock slope | at (-45, 0, 32) · size (6.24 × 1.3 × 5.2) | M-ROCK | none | existing-r2 | climbing, shade and habitat structure |
| H20-takin/O02 | pine tree | at (-47.5, 0, 28.5) · size (2.8 × 5.2 × 2.8) | M-PINE | body | existing-r2 | shade and browse |
| H20-takin/O03 | hay rack | at (-41, 0, 34) · size (1.6 × 1.7 × 0.6) | M-TIMBER | none | existing-r2 | elevated feed rack |
| H20/OPS01 | stone water trough | at (-41.2, 0, 28.2) · size (1.3 × 0.34 × 0.7) | M-ROCK | none | build-v1 | fresh drinking water |
| H20/OPS02 | salt lick block | at (-43.2, 0, 35.1) · size (0.45 × 0.55 × 0.45) | M-ROCK-LIGHT | none | build-v1 | mineral enrichment |
| H20/OPS03 | keeper safety square | at (-49.4, 0.02, 33) · size (1 × 0.02 × 1.2) | M-CONCRETE | none | build-v1 | service-gate landing |
| H20/OPS04 | habitat camera | at (-39.5, 0, 36.5) · size (0.22 × 3.5 × 0.22) | M-STEEL-DARK | none | build-v1 | slope monitoring |

Animal population/activity anchors:

- H20-takin/A01: 羚牛 — (-46.15, 0, 33.15) · graze · hours 7–20
- H20-takin/A02: 羚牛 — (-41.2, 0, 33.7) · eat · hours 7–20
- H20-takin/A03: 羚牛 — (-43.95, 0, 28.75) · lie · hours 7–20

### H21-snow-leopard — 雪豹栖息地

Bounds: `[-34, -24, 26, 37]` · public side: `x0` · species: 雪豹

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H21-snow-leopard/S01 | rock scree | rect [-33.5, -24.5, 26.5, 36.5] · y 0…0.02 | M-SAND | none | existing-r2 | primary habitat substrate |
| H21-snow-leopard/O01 | rock shelf | at (-28.5, 0, 32) · size (2.88 × 2.8 × 2.4) | M-ROCK | none | existing-r2 | climbing, shade and habitat structure |
| H21-snow-leopard/O02 | animal den | rect [-27, -24.5, 35, 36.5] · y 0…1.24 | M-ROCK | none | existing-r2 | covered retreat |
| H21-snow-leopard/O03 | deadfall log | at (-30.5, 0, 28.5) · size (3 × 0.48 × 0.4) | M-TIMBER | none | existing-r2 | scratching and enrichment |
| H21/OPS01 | chilled feeding shelf | at (-25.2, 0, 27.6) · size (0.9 × 0.32 × 0.65) | M-FOOD-STEEL | none | build-v1 | protected meat feed |
| H21/OPS02 | high lookout ledge | at (-31.6, 0, 34.8) · size (1.8 × 1.5 × 1) | M-ROCK | none | build-v1 | elevated resting |
| H21/OPS03 | keeper safety square | at (-24.65, 0.02, 34) · size (0.8 × 0.02 × 1) | M-CONCRETE | none | build-v1 | dry service landing |
| H21/OPS04 | habitat camera | at (-33.5, 0, 26.5) · size (0.22 × 3.5 × 0.22) | M-STEEL-DARK | none | build-v1 | den and shelf monitoring |
| H21/OPS05 | heated alpine drinker | at (-33.4, 0, 26.6) · size (1 × 0.26 × 0.7) | M-ROCK | none | build-v1 | freeze-protected drinking water |
| H21/OPS06 | meltwater drainage channel | at (-29.5, 0.01, 26.25) · size (3 × 0.03 × 0.35) | M-STEEL | none | build-v1 | keeps the rock shelf dry and ice-free |

Animal population/activity anchors:

- H21-snow-leopard/A01: 雪豹 — (-28.2, 0, 32.38) · sit · hours 7–20
- H21-snow-leopard/A02: 雪豹 — (-25.5, 0, 34.58) · lie · hours 7–20
- H21-snow-leopard/A03: 雪豹 — (-30.5, 0, 28.75) · graze · hours 7–20

### H30-red-panda — 小熊猫栖息地

Bounds: `[-34, -24, 43, 52]` · public side: `x1` · species: 小熊猫

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H30-red-panda/S01 | forest floor | rect [-33.5, -24.5, 43.5, 51.5] · y 0…0.02 | M-FOREST | none | existing-r2 | primary habitat substrate |
| H30-red-panda/O01 | tree climb | at (-28, 0, 47) · size (3.2 × 4 × 3.2) | M-TIMBER-DARK | none | existing-r2 | climbing enrichment |
| H30-red-panda/O02 | rope bridge | at (-28.5, 2.1, 46.5) · size (5.831 × 0.13 × 0.13) | M-TIMBER | none | existing-r2 | canopy crossing |
| H30-red-panda/O03 | nest box | at (-25.5, 2.4, 50.5) · size (0.7 × 0.72 × 0.65) | M-TIMBER | none | existing-r2 | raised retreat |
| H30/OPS01 | bamboo feed shelf | at (-32.4, 1.05, 44.5) · size (1.1 × 0.18 × 0.55) | M-TIMBER | none | build-v1 | raised feed point |
| H30/OPS02 | canopy mist nozzle | at (-28, 3.7, 50.4) · size (0.18 × 0.18 × 0.18) | M-STEEL | none | build-v1 | summer cooling mist |
| H30/OPS03 | keeper safety square | at (-33.4, 0.02, 49) · size (0.9 × 0.02 × 1) | M-CONCRETE | none | build-v1 | service-gate landing |
| H30/OPS04 | habitat camera | at (-24.5, 0, 43.5) · size (0.22 × 3.8 × 0.22) | M-STEEL-DARK | none | build-v1 | canopy monitoring |
| H30/OPS05 | shallow stone drinker | at (-25, 0, 51.3) · size (0.9 × 0.2 × 0.65) | M-ROCK | none | build-v1 | fresh drinking water beneath the canopy |
| H30/OPS06 | misting runoff drain | at (-32, 0.01, 52) · size (0.42 × 0.03 × 0.42) | M-STEEL | none | build-v1 | prevents saturated forest substrate |

Animal population/activity anchors:

- H30-red-panda/A01: 小熊猫 — (-28, 0, 47.05) · climb · hours 7–20
- H30-red-panda/A02: 小熊猫 — (-26.5, 0, 49.75) · eat · hours 7–20
- H30-red-panda/A03: 小熊猫 — (-31.2, 0, 47.95) · lie · hours 7–20

### H31-waterfowl-lake — 天鹅／鸳鸯栖息地

Bounds: `[-16, -6, 22, 36]` · public side: `x1` · species: 天鹅、鸳鸯

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H31-waterfowl-lake/S01 | water | rect [-15.5, -7, 23, 35] · y -0.65…0 | M-WATER | none | existing-r2 | primary habitat substrate |
| H31-waterfowl-lake/S02 | island | rect [-12.8, -9.2, 27.5, 31.5] · y 0…0.02 | M-SAND | none | existing-r2 | primary habitat substrate |
| H31-waterfowl-lake/O01 | tea pavilion | reference only | inherited | inherited | existing-r2 | island pavilion |
| H31-waterfowl-lake/O02 | footbridge | rect [-9.2, -6, 28.2, 29.8] · y 0.42…0.58 | M-TIMBER | body | existing-r2 | public bridge to pavilion |
| H31-waterfowl-lake/O03 | nest island | at (-14, 0, 32.5) · size (1.8 × 0.2 × 1.8) | M-EARTH | none | existing-r2 | nesting |
| H31/OPS01 | floating feed station | at (-13.8, 0.04, 25) · size (0.9 × 0.12 × 0.7) | M-TIMBER | none | build-v1 | controlled waterfowl feed |
| H31/OPS02 | lake overflow drain | at (-7.5, -0.63, 34.3) · size (0.55 × 0.03 × 0.55) | M-STEEL | none | build-v1 | lake water-level control |
| H31/OPS03 | life ring cabinet | at (-9.45, 0, 27.9) · size (0.55 × 0.85 × 0.22) | M-STEEL | none | build-v1 | public water safety |
| H31/OPS04 | habitat camera | at (-15.5, 0, 35.5) · size (0.22 × 3.2 × 0.22) | M-STEEL-DARK | none | build-v1 | lake and nest monitoring |

Animal population/activity anchors:

- H31-waterfowl-lake/A01: 天鹅 — (-13, 0, 25.5) · swim · hours 7–20
- H31-waterfowl-lake/A02: 鸳鸯 — (-13.5, 0, 33.2) · swim · hours 7–20
- H31-waterfowl-lake/A03: 天鹅 — (-11, 0, 29.7) · preen · hours 7–20

### H32-family-farm — 山羊／兔子栖息地

Bounds: `[2, 16.5, 22, 36]` · public side: `x0` · species: 山羊、兔子

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H32-family-farm/S01 | meadow | rect [2.5, 16, 22.5, 35.5] · y 0…0.02 | M-MEADOW | none | existing-r2 | primary habitat substrate |
| H32-family-farm/S02 | sand contact yard | rect [2.5, 7, 26, 32] · y 0…0.02 | M-SAND | none | existing-r2 | primary habitat substrate |
| H32-family-farm/O01 | barn | rect [11.5, 16, 31, 35.5] · y 0…3.5 | M-BRICK | camera-blocker | existing-r2 | animal shelter and feed store |
| H32-family-farm/O02 | handwash station | at (0.9, 0, 32.8) · size (0.5 × 1.24 × 0.5) | M-STEEL | body | existing-r2 | visitor hand washing |
| H32-family-farm/O03 | hay bale | at (9, 0, 25.5) · size (0.96 × 0.92 × 0.96) | M-SAND | none | existing-r2 | climbing and forage |
| H32-family-farm/O04 | rabbit shelter | rect [12, 15.5, 23, 26] · y 0…1.24 | M-ROCK | none | existing-r2 | covered retreat |
| H32/OPS01 | goat feed trough | at (8.8, 0, 33.9) · size (1.35 × 0.34 × 0.55) | M-FOOD-STEEL | none | build-v1 | supervised visitor feeding |
| H32/OPS02 | rabbit drinker | at (14.8, 0, 27.2) · size (0.7 × 0.25 × 0.5) | M-CERAMIC | none | build-v1 | fresh drinking water |
| H32/OPS03 | contact-yard double gate | at (2, 0, 29) · size (0.2 × 1.4 × 1.8) | M-TIMBER | threshold | build-v1 | controlled public entry |
| H32/OPS04 | habitat camera | at (16, 0, 22.5) · size (0.22 × 3.2 × 0.22) | M-STEEL-DARK | none | build-v1 | contact yard monitoring |

Animal population/activity anchors:

- H32-family-farm/A01: 山羊 — (9.975, 0, 26.9) · climb · hours 7–20
- H32-family-farm/A02: 兔子 — (12.15, 0, 31.8) · eat · hours 7–20
- H32-family-farm/A03: 山羊 — (13.89, 0, 25.08) · lie · hours 7–20

### H33-golden-monkey — 金丝猴栖息地

Bounds: `[2, 16.5, 43, 52]` · public side: `x0` · species: 金丝猴

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H33-golden-monkey/S01 | forest rock | rect [2.5, 16, 43.5, 51.5] · y 0…0.02 | M-FOREST | none | existing-r2 | primary habitat substrate |
| H33-golden-monkey/O01 | climbing tower | at (9, 0, 47.5) · size (3.2 × 5.5 × 3.2) | M-TIMBER-DARK | none | existing-r2 | climbing enrichment |
| H33-golden-monkey/O02 | rope network | rect [5, 14, 45, 50] · y 0…3.2 | M-TIMBER | none | existing-r2 | climbing network |
| H33-golden-monkey/O03 | heated shelter | rect [13, 16, 49, 51.5] · y 0…1.24 | M-ROCK | none | existing-r2 | covered retreat |
| H33/OPS01 | fruit feed basket | at (4, 1.2, 44.6) · size (0.8 × 0.3 × 0.6) | M-FOOD-STEEL | none | build-v1 | raised feeding |
| H33/OPS02 | heated drinker | at (14.7, 0, 45) · size (0.75 × 0.3 × 0.55) | M-CERAMIC | none | build-v1 | freeze-safe water |
| H33/OPS03 | keeper safety square | at (15.7, 0.02, 49) · size (0.8 × 0.02 × 1) | M-CONCRETE | none | build-v1 | service landing |
| H33/OPS04 | habitat camera | at (2.5, 0, 51.5) · size (0.22 × 4 × 0.22) | M-STEEL-DARK | none | build-v1 | climbing network monitoring |

Animal population/activity anchors:

- H33-golden-monkey/A01: 金丝猴 — (9.25, 0, 47.5) · climb · hours 7–20
- H33-golden-monkey/A02: 金丝猴 — (7.075, 0, 48.85) · groom · hours 7–20
- H33-golden-monkey/A03: 金丝猴 — (12.875, 0, 46.15) · eat · hours 7–20

### H40-elephant-reserve — 亚洲象栖息地

Bounds: `[24, 36.5, -10, 15]` · public side: `x0` · species: 亚洲象

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H40-elephant-reserve/S01 | grass | rect [24.5, 36, -9.5, 14.5] · y 0…0.02 | M-MEADOW | none | existing-r2 | primary habitat substrate |
| H40-elephant-reserve/S02 | mud wallow | rect [29, 35, 7, 13] · y 0…0.02 | M-MUD | none | existing-r2 | primary habitat substrate |
| H40-elephant-reserve/S03 | pool | rect [25.5, 30, -8, -3] · y -0.15…0 | M-WATER | none | existing-r2 | primary habitat substrate |
| H40-elephant-reserve/O01 | shade shelter | at (33.5, 0, -4.5) · size (5 × 4.2 × 7) | M-TIMBER-DARK | none | existing-r2 | shade and rain cover |
| H40-elephant-reserve/O02 | scrub post | at (27, 0, 6) · size (0.32 × 1.5 × 0.32) | M-TIMBER-DARK | none | existing-r2 | rubbing enrichment |
| H40-elephant-reserve/O03 | feeder | at (33, 0, 4) · size (1.35 × 0.34 × 0.55) | M-FOOD-STEEL | none | existing-r2 | feeding or drinking station |
| H40/OPS01 | high-capacity drinker | at (25.6, 0, 11.8) · size (2.2 × 0.48 × 1) | M-CONCRETE | none | build-v1 | fresh drinking water |
| H40/OPS02 | sand pile | at (34.5, 0, 12.7) · size (2 × 0.75 × 1.8) | M-SAND | none | build-v1 | dusting enrichment |
| H40/OPS03 | keeper safety square | at (24.7, 0.02, -7.7) · size (1.1 × 0.02 × 1.3) | M-CONCRETE | none | build-v1 | service-gate landing |
| H40/OPS04 | habitat camera | at (36, 0, 14.5) · size (0.24 × 4.2 × 0.24) | M-STEEL-DARK | none | build-v1 | reserve monitoring |
| H40/OPS05 | pool filtration intake | at (27.2, -0.7, -5.5) · size (0.55 × 0.03 × 0.55) | M-STEEL | none | build-v1 | main pool filtration and draw-down |
| H40/OPS06 | wallow overflow drain | at (34.2, -0.18, 11.8) · size (0.5 × 0.03 × 0.5) | M-STEEL | none | build-v1 | mud-wallow level control |

Animal population/activity anchors:

- H40-elephant-reserve/A01: 亚洲象 — (27.5, 0, -5) · drink · hours 7–20
- H40-elephant-reserve/A02: 亚洲象 — (33, 0, 9.5) · dust · hours 7–20
- H40-elephant-reserve/A03: 亚洲象 — (31.75, 0, 1.25) · graze · hours 7–20

### H41-mixed-savannah — 斑马／羚羊／长颈鹿栖息地

Bounds: `[41.5, 50, -10, 15]` · public side: `x0` · species: 斑马、羚羊、长颈鹿

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H41-mixed-savannah/S01 | dry grass | rect [42, 49.5, -9.5, 14.5] · y 0…0.02 | M-MEADOW | none | existing-r2 | primary habitat substrate |
| H41-mixed-savannah/S02 | sand | rect [42, 46, 7, 14] · y 0…0.02 | M-SAND | none | existing-r2 | primary habitat substrate |
| H41-mixed-savannah/O01 | browse rack | at (47.5, 0, 8) · size (1.6 × 4.8 × 0.6) | M-TIMBER | none | existing-r2 | elevated feed rack |
| H41-mixed-savannah/O02 | acacia tree | at (45, 0, -2) · size (2.8 × 5.5 × 2.8) | M-FOLIAGE | body | existing-r2 | shade and browse |
| H41-mixed-savannah/O03 | water trough | at (43.5, 0, 11) · size (1.35 × 0.34 × 0.55) | M-WATER-LIGHT | none | existing-r2 | feeding or drinking station |
| H41/OPS01 | mineral lick | at (48.7, 0, -7.6) · size (0.5 × 0.55 × 0.5) | M-ROCK-LIGHT | none | build-v1 | mineral enrichment |
| H41/OPS02 | low hay feeder | at (44.5, 0, 4.2) · size (1.35 × 0.34 × 0.55) | M-FOOD-STEEL | none | build-v1 | zebra and antelope feed |
| H41/OPS03 | keeper safety square | at (49.3, 0.02, -7.4) · size (0.9 × 0.02 × 1) | M-CONCRETE | none | build-v1 | service landing |
| H41/OPS04 | habitat camera | at (42, 0, 14.5) · size (0.24 × 4 × 0.24) | M-STEEL-DARK | none | build-v1 | savannah monitoring |

Animal population/activity anchors:

- H41-mixed-savannah/A01: 斑马 — (47.45, 0, 8) · browse · hours 7–20
- H41-mixed-savannah/A02: 羚羊 — (44.9, 0, -1.25) · graze · hours 7–20
- H41-mixed-savannah/A03: 长颈鹿 — (43.625, 0, 10) · drink · hours 7–20

### H42-rhino — 犀牛栖息地

Bounds: `[24, 36.5, 23, 37]` · public side: `x0` · species: 犀牛

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H42-rhino/S01 | sand mud | rect [24.5, 36, 23.5, 36.5] · y 0…0.02 | M-SAND | none | existing-r2 | primary habitat substrate |
| H42-rhino/O01 | mud wallow | rect [29, 35, 29, 35] · y 0…0.18 | M-MUD | none | existing-r2 | water or wallow enrichment |
| H42-rhino/O02 | shade shelter | at (33.5, 0, 26) · size (5 × 3.6 × 4) | M-TIMBER-DARK | none | existing-r2 | shade and rain cover |
| H42-rhino/O03 | scrub log | at (27.5, 0, 27) · size (2 × 0.48 × 0.4) | M-TIMBER | none | existing-r2 | scratching and enrichment |
| H42/OPS01 | heavy water trough | at (26.2, 0, 34.7) · size (1.8 × 0.42 × 0.9) | M-CONCRETE | none | build-v1 | fresh drinking water |
| H42/OPS02 | mineral feed block | at (27, 0, 31) · size (0.55 × 0.55 × 0.55) | M-ROCK-LIGHT | none | build-v1 | mineral enrichment |
| H42/OPS03 | keeper safety square | at (35.8, 0.02, 34) · size (0.9 × 0.02 × 1) | M-CONCRETE | none | build-v1 | service landing |
| H42/OPS04 | habitat camera | at (24.5, 0, 23.5) · size (0.24 × 3.8 × 0.24) | M-STEEL-DARK | none | build-v1 | wallow monitoring |
| H42/OPS05 | wallow overflow drain | at (34.2, -0.18, 34) · size (0.5 × 0.03 × 0.5) | M-STEEL | none | build-v1 | mud-wallow level control and washout |

Animal population/activity anchors:

- H42-rhino/A01: 犀牛 — (32.5, 0, 32.52) · dust · hours 7–20
- H42-rhino/A02: 犀牛 — (27.75, 0, 27.9) · eat · hours 7–20
- H42-rhino/A03: 犀牛 — (33.375, 0, 25.8) · lie · hours 7–20

### H43-lion — 狮子栖息地

Bounds: `[41.5, 50, 24, 37]` · public side: `x0` · species: 狮子

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| H43-lion/S01 | dry grass rock | rect [42, 49.5, 24.5, 36.5] · y 0…0.02 | M-ROCK | none | existing-r2 | primary habitat substrate |
| H43-lion/O01 | kopje | at (46, 0, 30) · size (2.88 × 2.4 × 2.4) | M-ROCK | none | existing-r2 | climbing, shade and habitat structure |
| H43-lion/O02 | shade rock | at (48.25, 0, 34.75) · size (2.04 × 1.3 × 1.7) | M-ROCK | none | existing-r2 | climbing, shade and habitat structure |
| H43-lion/O03 | deadfall log | at (44, 0, 25.5) · size (3 × 0.48 × 0.4) | M-TIMBER | none | existing-r2 | scratching and enrichment |
| H43/OPS01 | protected meat hatch | at (48.7, 0, 26) · size (1 × 0.32 × 0.7) | M-FOOD-STEEL | none | build-v1 | keeper feeding station |
| H43/OPS02 | fresh water basin | at (43.2, 0, 35.4) · size (1.1 × 0.32 × 0.65) | M-ROCK | none | build-v1 | drinking water |
| H43/OPS03 | keeper safety square | at (49.2, 0.02, 34) · size (0.8 × 0.02 × 1) | M-CONCRETE | none | build-v1 | service landing |
| H43/OPS04 | habitat camera | at (42, 0, 24.5) · size (0.24 × 3.8 × 0.24) | M-STEEL-DARK | none | build-v1 | kopje and shade monitoring |

Animal population/activity anchors:

- H43-lion/A01: 狮子 — (46.175, 0, 30.5) · sit · hours 7–20
- H43-lion/A02: 狮子 — (48.3, 0, 34.14) · lie · hours 7–20
- H43-lion/A03: 狮子 — (44.05, 0, 27.25) · graze · hours 7–20

## Building shells, rooms and fixtures

### B01-west-gate-pavilion — brick piers and green tile roof

Footprint: `[-58, -55.5, 19.5, 28.5]` · y 0…4.6 · shell: `gate-pavilion`

Shared/exterior fixtures:

| Stable ID | Object | Exact placement | Build state | Purpose |
|---|---|---|---|---|
| B01/FIX01 | south ticket reader | at (-56.05, 0, 21.1) · size (0.28 × 1.1 × 0.34) | build-v1 | secondary-entry ticket validation |
| B01/FIX02 | north ticket reader | at (-56.05, 0, 26.9) · size (0.28 × 1.1 × 0.34) | build-v1 | secondary-entry ticket validation |
| B01/FIX03 | entry status screen | at (-55.62, 2.25, 24) · size (0.05 × 0.75 × 1.9) | build-v1 | hours, ticket status and accessible route |
| B01/FIX04 | emergency intercom | at (-55.64, 0.95, 22.3) · size (0.08 × 0.3 × 0.22) | build-v1 | visitor assistance |
| B01/FIX05 | passage ceiling light A | at (-56.75, 4.15, 22) · size (0.65 × 0.08 × 0.18) | build-v1 | night entry illumination |
| B01/FIX06 | passage ceiling light B | at (-56.75, 4.15, 26) · size (0.65 × 0.08 × 0.18) | build-v1 | night entry illumination |

### B02-west-restroom — rendered masonry and green roof

Footprint: `[-34, -28.5, 20.7, 24.5]` · y 0…3.2 · shell: `masonry-public-building`

#### B02-west-restroom/women

Room rect: `[-34, -31.4, 21, 24.2]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B02/women/FIX01 | west toilet | at (-33.35, 0, 23.25) · size (0.55 × 0.75 × 0.72) | M-CERAMIC | body | existing-r2 |
| B02/women/FIX02 | east toilet | at (-32.15, 0, 23.25) · size (0.55 × 0.75 × 0.72) | M-CERAMIC | body | existing-r2 |
| B02/women/FIX03 | west cubicle partition | at (-33.35, 0, 23.55) · size (1.02 × 1.5 × 0.08) | M-RENDER | body | existing-r2 |
| B02/women/FIX04 | east cubicle partition | at (-32.15, 0, 23.55) · size (1.02 × 1.5 × 0.08) | M-RENDER | body | existing-r2 |
| B02/women/FIX05 | washbasin A | at (-33.25, 0, 21.55) · size (0.62 × 0.88 × 0.38) | M-CERAMIC | none | existing-r2 |
| B02/women/FIX06 | washbasin B | at (-32.25, 0, 21.55) · size (0.62 × 0.88 × 0.38) | M-CERAMIC | none | existing-r2 |
| B02/women/FIX07 | mirror strip | at (-32.75, 1.42, 21.05) · size (1.8 × 0.65 × 0.03) | M-GLASS | none | build-v1 |
| B02/women/FIX08 | hand dryer | at (-31.55, 1.1, 21.35) · size (0.28 × 0.35 × 0.18) | M-CERAMIC | none | build-v1 |
| B02/FIX-L01 | ceiling light women | at (-32.6, 2.85, 22.6) · size (0.8 × 0.06 × 0.22) | M-CERAMIC | none | build-v1 |

#### B02-west-restroom/accessible-family

Room rect: `[-31.2, -29, 21, 24.2]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B02/family/FIX01 | accessible toilet | at (-30.15, 0, 23.42) · size (0.62 × 0.88 × 0.56) | M-CERAMIC | body | existing-r2 |
| B02/family/FIX02 | accessible basin | at (-29.4, 0, 22) · size (0.72 × 0.86 × 0.4) | M-CERAMIC | none | existing-r2 |
| B02/family/FIX03 | folding transfer rail | at (-29.55, 0.72, 23.33) · size (0.72 × 0.07 × 0.07) | M-STEEL | none | existing-r2 |
| B02/family/FIX04 | baby changing table | at (-30.65, 0, 21.55) · size (0.75 × 0.92 × 0.52) | M-CERAMIC | body | build-v1 |
| B02/family/FIX05 | emergency pull cord | at (-29.15, 1.1, 23.65) · size (0.08 × 1.8 × 0.08) | M-RED-LIGHT | none | build-v1 |
| B02/FIX-L02 | ceiling light family | at (-30.1, 2.85, 22.6) · size (0.7 × 0.06 × 0.22) | M-CERAMIC | none | build-v1 |

### B03-east-rest-hub — timber canopy and stone service wall

Footprint: `[42, 50, 20.7, 23]` · y 0…3.2 · shell: `masonry-public-building`

Shared/exterior fixtures:

| Stable ID | Object | Exact placement | Build state | Purpose |
|---|---|---|---|---|
| B03/FIX-L01 | hub ceiling light A | at (44, 2.85, 21.85) · size (0.75 × 0.06 × 0.22) | build-v1 | counter lighting |
| B03/FIX-L02 | hub ceiling light B | at (47.8, 2.85, 21.85) · size (0.75 × 0.06 × 0.22) | build-v1 | toilet lighting |

#### B03-east-rest-hub/snack-counter

Room rect: `[42.5, 45.5, 21, 22.7]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B03/snack/FIX01 | snack service counter | at (44, 0, 21.62) · size (2.7 × 1.38 × 0.72) | M-TIMBER-DARK | body | existing-r2 |
| B03/snack/FIX02 | point-of-sale terminal | at (43.25, 1.25, 21.35) · size (0.32 × 0.28 × 0.24) | M-SCREEN | none | build-v1 |
| B03/snack/FIX03 | under-counter chiller | at (44.45, 0, 22.2) · size (0.9 × 0.86 × 0.55) | M-FOOD-STEEL | body | build-v1 |
| B03/snack/FIX04 | three-bay display shelf | at (44, 1.42, 22.52) · size (2.62 × 0.9 × 0.28) | M-TIMBER | none | existing-r2 |
| B03/snack/FIX05 | menu screen | at (42.62, 1.9, 21.86) · size (0.06 × 0.7 × 1.15) | M-SCREEN | none | build-v1 |

#### B03-east-rest-hub/toilets

Room rect: `[46, 49.5, 21, 22.7]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B03/toilets/FIX01 | toilet A | at (47, 0, 22.08) · size (0.55 × 0.75 × 0.72) | M-CERAMIC | body | existing-r2 |
| B03/toilets/FIX02 | toilet B | at (48.25, 0, 22.08) · size (0.55 × 0.75 × 0.72) | M-CERAMIC | body | existing-r2 |
| B03/toilets/FIX03 | cubicle partition A | at (47, 0, 22.5) · size (1 × 1.55 × 0.08) | M-RENDER | body | existing-r2 |
| B03/toilets/FIX04 | cubicle partition B | at (48.25, 0, 22.5) · size (1 × 1.55 × 0.08) | M-RENDER | body | existing-r2 |
| B03/toilets/FIX05 | washbasin | at (49.05, 0, 21.45) · size (0.66 × 0.86 × 0.38) | M-CERAMIC | none | existing-r2 |
| B03/toilets/FIX06 | mirror | at (49.46, 1.38, 21.45) · size (0.03 × 0.64 × 0.72) | M-GLASS | none | build-v1 |

### B04-lake-pavilion — open timber tea pavilion with green tile roof

Footprint: `[-12.8, -9.2, 27.5, 31.5]` · y 0…4.2 · shell: `open-pavilion`

Shared/exterior fixtures:

| Stable ID | Object | Exact placement | Build state | Purpose |
|---|---|---|---|---|
| B04/FIX05 | life ring cabinet | at (-12.45, 0.5, 27.85) · size (0.55 × 0.85 × 0.22) | build-v1 | water safety |
| B04/FIX-L01 | pavilion pendant | at (-11, 3.6, 29.5) · size (0.46 × 0.34 × 0.46) | build-v1 | evening pavilion light |

#### B04-lake-pavilion/tea-counter

Room rect: `[-12.3, -10.8, 28, 31]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B04/tea/FIX01 | tea service counter | at (-11.55, 0.5, 29.5) · size (1.5 × 1.05 × 3) | M-TIMBER-DARK | body | build-v1 |
| B04/tea/FIX02 | hot-water boiler | at (-12, 1.1, 30.25) · size (0.42 × 0.75 × 0.42) | M-FOOD-STEEL | none | build-v1 |
| B04/tea/FIX03 | handwash sink | at (-12, 0.5, 28.7) · size (0.6 × 0.9 × 0.45) | M-FOOD-STEEL | none | build-v1 |
| B04/tea/FIX04 | tea shelf | at (-12.2, 0.5, 29.5) · size (0.32 × 1.9 × 1.8) | M-TIMBER | body | build-v1 |

#### B04-lake-pavilion/seating

Room rect: `[-10.7, -9.5, 28, 31]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B04/seating/FIX01 | communal tea table | at (-10.1, 0.5, 30.2) · size (0.82 × 0.82 × 1.25) | M-TIMBER | body | build-v1 |
| B04/seating/FIX02 | stool north | at (-9.65, 0.5, 30.92) · size (0.42 × 0.48 × 0.42) | M-TIMBER | none | build-v1 |
| B04/seating/FIX03 | stool south | at (-9.65, 0.5, 29.42) · size (0.42 × 0.48 × 0.42) | M-TIMBER | none | build-v1 |
| B04/seating/FIX04 | lake binocular | at (-9.55, 1.1, 30.85) · size (0.28 × 1.35 × 0.28) | M-STEEL-DARK | body | build-v1 |

### B05-conservation-west — brick, timber screens and green tile

Footprint: `[-17, -6, 55, 62]` · y 0…5.2 · shell: `masonry-public-building`

Shared/exterior fixtures:

| Stable ID | Object | Exact placement | Build state | Purpose |
|---|---|---|---|---|
| B05/FIX-L01 | classroom light row | at (-14.3, 4.4, 58.5) · size (0.24 × 0.08 × 4.5) | build-v1 | classroom lighting |
| B05/FIX-L02 | gallery light row | at (-9, 4.4, 58.5) · size (0.24 × 0.08 × 4.5) | build-v1 | gallery lighting |

#### B05-conservation-west/classroom

Room rect: `[-16.5, -12, 55.5, 61.5]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B05/classroom/DESK01 | classroom desk 1 | at (-15.45, 0, 56.7) · size (1.2 × 0.72 × 0.48) | M-TIMBER | body | existing-r2 |
| B05/classroom/DESK02 | classroom desk 2 | at (-13.35, 0, 56.7) · size (1.2 × 0.72 × 0.48) | M-TIMBER | body | existing-r2 |
| B05/classroom/DESK03 | classroom desk 3 | at (-15.45, 0, 58.25) · size (1.2 × 0.72 × 0.48) | M-TIMBER | body | existing-r2 |
| B05/classroom/DESK04 | classroom desk 4 | at (-13.35, 0, 58.25) · size (1.2 × 0.72 × 0.48) | M-TIMBER | body | existing-r2 |
| B05/classroom/DESK05 | classroom desk 5 | at (-15.45, 0, 59.8) · size (1.2 × 0.72 × 0.48) | M-TIMBER | body | existing-r2 |
| B05/classroom/DESK06 | classroom desk 6 | at (-13.35, 0, 59.8) · size (1.2 × 0.72 × 0.48) | M-TIMBER | body | existing-r2 |
| B05/classroom/CHAIR01 | classroom chair 1 | at (-15.45, 0, 56.35) · size (0.45 × 0.82 × 0.45) | M-TIMBER | none | build-v1 |
| B05/classroom/CHAIR02 | classroom chair 2 | at (-13.35, 0, 56.35) · size (0.45 × 0.82 × 0.45) | M-TIMBER | none | build-v1 |
| B05/classroom/CHAIR03 | classroom chair 3 | at (-15.45, 0, 57.9) · size (0.45 × 0.82 × 0.45) | M-TIMBER | none | build-v1 |
| B05/classroom/CHAIR04 | classroom chair 4 | at (-13.35, 0, 57.9) · size (0.45 × 0.82 × 0.45) | M-TIMBER | none | build-v1 |
| B05/classroom/CHAIR05 | classroom chair 5 | at (-15.45, 0, 59.45) · size (0.45 × 0.82 × 0.45) | M-TIMBER | none | build-v1 |
| B05/classroom/CHAIR06 | classroom chair 6 | at (-13.35, 0, 59.45) · size (0.45 × 0.82 × 0.45) | M-TIMBER | none | build-v1 |
| B05/classroom/FIX01 | teaching wall | at (-14.25, 1.85, 61.27) · size (3.5 × 1.35 × 0.08) | M-SCREEN | none | existing-r2 |
| B05/classroom/FIX02 | teacher desk | at (-14.25, 0, 60.65) · size (1.6 × 0.76 × 0.62) | M-TIMBER-DARK | body | build-v1 |
| B05/classroom/FIX03 | equipment cabinet | at (-16.1, 0, 60.35) · size (0.55 × 1.9 × 1.35) | M-TIMBER-DARK | body | build-v1 |

#### B05-conservation-west/panda-lab-gallery

Room rect: `[-11.5, -6.5, 55.5, 61.5]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B05/gallery/CASE01 | panda science display 1 | at (-10.1, 0, 57.2) · size (1.25 × 1.25 × 0.72) | M-GLASS | body | existing-r2 |
| B05/gallery/CASE02 | panda science display 2 | at (-8, 0, 57.2) · size (1.25 × 1.25 × 0.72) | M-GLASS | body | existing-r2 |
| B05/gallery/CASE03 | panda science display 3 | at (-10.1, 0, 59.6) · size (1.25 × 1.25 × 0.72) | M-GLASS | body | existing-r2 |
| B05/gallery/CASE04 | panda science display 4 | at (-8, 0, 59.6) · size (1.25 × 1.25 × 0.72) | M-GLASS | body | existing-r2 |
| B05/gallery/FIX05 | genetics touchscreen | at (-6.72, 1.35, 56.8) · size (0.08 × 0.9 × 1.25) | M-SCREEN | none | build-v1 |
| B05/gallery/FIX06 | lab viewing window | at (-6.55, 1.6, 59.8) · size (0.08 × 1.6 × 2.4) | M-GLASS | none | build-v1 |

### B06-conservation-east — brick, timber screens and green tile

Footprint: `[2, 16.5, 55, 62]` · y 0…5.2 · shell: `masonry-public-building`

Shared/exterior fixtures:

| Stable ID | Object | Exact placement | Build state | Purpose |
|---|---|---|---|---|
| B06/FIX-L01 | first-aid ceiling light | at (4.25, 4.4, 57) · size (0.25 × 0.08 × 2.2) | build-v1 | clinical lighting |
| B06/FIX-L02 | exhibition track light | at (7.75, 4.45, 58.6) · size (0.2 × 0.1 × 4.2) | build-v1 | exhibit lighting |
| B06/FIX-L03 | shop ceiling light | at (12.8, 4.4, 58.6) · size (0.25 × 0.08 × 4.2) | build-v1 | shop lighting |

#### B06-conservation-east/first-aid

Room rect: `[2.5, 6, 55.5, 58.5]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B06/aid/FIX01 | examination couch | at (4.15, 0, 57.18) · size (0.95 × 0.82 × 2.05) | M-CERAMIC | body | existing-r2 |
| B06/aid/FIX02 | medicine cabinet | at (5.42, 0, 57.78) · size (0.72 × 2.04 × 0.42) | M-RENDER | body | existing-r2 |
| B06/aid/FIX03 | oxygen cylinder | at (3.25, 0, 56.25) · size (0.32 × 1.35 × 0.32) | M-STEEL | body | existing-r2 |
| B06/aid/FIX04 | clinical sink | at (5.45, 0, 56.1) · size (0.6 × 0.9 × 0.45) | M-FOOD-STEEL | none | build-v1 |
| B06/aid/FIX05 | AED cabinet | at (2.62, 1.3, 57.8) · size (0.18 × 0.55 × 0.48) | M-RED-LIGHT | none | build-v1 |

#### B06-conservation-east/exhibition

Room rect: `[6.5, 9, 55.5, 61.5]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B06/exhibition/PLINTH01 | conservation plinth 1 | at (7.35, 0, 56.8) · size (0.74 × 1.6 × 0.74) | M-RENDER | body | existing-r2 |
| B06/exhibition/PLINTH02 | conservation plinth 2 | at (8.25, 0, 58.3) · size (0.74 × 1.6 × 0.74) | M-RENDER | body | existing-r2 |
| B06/exhibition/PLINTH03 | conservation plinth 3 | at (7.35, 0, 60) · size (0.74 × 1.6 × 0.74) | M-RENDER | body | existing-r2 |
| B06/exhibition/FIX04 | species recovery wall | at (6.62, 1.65, 60.85) · size (0.08 × 1.35 × 2.6) | M-SCREEN | none | build-v1 |

#### B06-conservation-east/library-shop

Room rect: `[9.5, 16, 55.5, 61.5]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B06/shop/SHELF01 | library shelf 1 | at (15.55, 0, 56.5) · size (0.6 × 2.45 × 1.18) | M-TIMBER-DARK | body | existing-r2 |
| B06/shop/SHELF02 | library shelf 2 | at (15.55, 0, 58.1) · size (0.6 × 2.45 × 1.18) | M-TIMBER-DARK | body | existing-r2 |
| B06/shop/SHELF03 | library shelf 3 | at (15.55, 0, 59.7) · size (0.6 × 2.45 × 1.18) | M-TIMBER-DARK | body | existing-r2 |
| B06/shop/FIX04 | sales counter | at (11, 0, 56.25) · size (2.25 × 1.05 × 0.62) | M-TIMBER-DARK | body | existing-r2 |
| B06/shop/FIX05 | central book table | at (12.6, 0, 59) · size (1.6 × 0.78 × 0.85) | M-TIMBER | body | build-v1 |
| B06/shop/FIX06 | children reading bench | at (10.5, 0, 60.7) · size (1.8 × 0.78 × 0.55) | M-TIMBER | body | build-v1 |

### B06b-conservation-bridge — glazed bridge over central walk

Footprint: `[-6, 2, 58, 61]` · y 4.2…7.2 · shell: `elevated-glazed-bridge`

Shared/exterior fixtures:

| Stable ID | Object | Exact placement | Build state | Purpose |
|---|---|---|---|---|
| B06b/FIX01 | west lift car | at (-6.55, 0, 59.5) · size (1.4 × 4.2 × 2.6) | existing-r2 | accessible bridge lift |
| B06b/FIX02 | east lift car | at (2.55, 0, 59.5) · size (1.4 × 4.2 × 2.6) | existing-r2 | accessible bridge lift |
| B06b/FIX-L01 | bridge light strip | at (-2, 6.8, 59.5) · size (6.5 × 0.08 × 0.14) | build-v1 | gallery lighting |

#### B06b-conservation-bridge/bridge-gallery

Room rect: `[-6, 2, 58, 61]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B06b/FIX03 | west bridge display | at (-4.2, 4.2, 60.55) · size (1.35 × 1.25 × 0.32) | M-GLASS | none | existing-r2 |
| B06b/FIX04 | centre bridge display | at (-1.8, 4.2, 60.55) · size (1.35 × 1.25 × 0.32) | M-GLASS | none | existing-r2 |
| B06b/FIX05 | east bridge display | at (0.6, 4.2, 60.55) · size (1.35 × 1.25 × 0.32) | M-GLASS | none | existing-r2 |
| B06b/FIX06 | bridge audio station | at (-2, 4.2, 58.35) · size (0.45 × 1.2 × 0.32) | M-SCREEN | none | build-v1 |

### B07-operations-campus — staff-only masonry and mesh compound

Footprint: `[-51, -37, 42.5, 61.5]` · y 0…4.5 · shell: `staff-campus`

Shared/exterior fixtures:

| Stable ID | Object | Exact placement | Build state | Purpose |
|---|---|---|---|---|
| B07/FIX-L01 | hospital clinical light | at (-47, 4.15, 50.8) · size (0.3 × 0.08 × 4.6) | build-v1 | clinical lighting |
| B07/FIX-L02 | operations yard floodlight | at (-43.2, 3.8, 59.8) · size (0.4 × 0.28 × 0.35) | build-v1 | service-yard lighting |

#### B07-operations-campus/animal-hospital

Room rect: `[-50, -44, 47, 54.5]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B07/hospital/FIX01 | veterinary exam table | at (-47, 0, 49.1) · size (2.05 × 1.11 × 0.78) | M-CERAMIC | body | existing-r2 |
| B07/hospital/FIX02 | imaging screen | at (-49, 1.78, 49.68) · size (0.04 × 1.2 × 1.52) | M-SCREEN | none | existing-r2 |
| B07/hospital/FIX03 | imaging console | at (-49.25, 0, 48.2) · size (0.75 × 1.1 × 0.6) | M-STEEL-DARK | body | build-v1 |
| B07/hospital/FIX04 | recovery kennel A | at (-45, 0, 51.4) · size (1.55 × 1.35 × 1.2) | M-STEEL | body | existing-r2 |
| B07/hospital/FIX05 | recovery kennel B | at (-45, 0, 53) · size (1.55 × 1.35 × 1.2) | M-STEEL | body | existing-r2 |
| B07/hospital/FIX06 | surgical prep sink | at (-49.1, 0, 53.55) · size (1 × 0.92 × 0.55) | M-FOOD-STEEL | body | build-v1 |
| B07/hospital/FIX07 | medicine refrigerator | at (-44.5, 0, 48) · size (0.75 × 1.9 × 0.75) | M-FOOD-STEEL | body | build-v1 |
| B07/hospital/FIX08 | public viewing window | at (-47, 0.76, 42.5) · size (3.4 × 2.36 × 0.1) | M-GLASS | threshold | existing-r2 |

#### B07-operations-campus/quarantine

Room rect: `[-50, -44, 55.5, 60.5]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B07/quarantine/PEN01 | quarantine pen 1 | at (-49, 0, 57) · size (1.8 × 2.2 × 1.6) | M-STEEL | body | build-v1 |
| B07/quarantine/PEN02 | quarantine pen 2 | at (-46.6, 0, 57) · size (1.8 × 2.2 × 1.6) | M-STEEL | body | build-v1 |
| B07/quarantine/PEN03 | quarantine pen 3 | at (-49, 0, 59.25) · size (1.8 × 2.2 × 1.6) | M-STEEL | body | build-v1 |
| B07/quarantine/PEN04 | quarantine pen 4 | at (-46.6, 0, 59.25) · size (1.8 × 2.2 × 1.6) | M-STEEL | body | build-v1 |
| B07/quarantine/FIX05 | wash-down drain | at (-45, 0, 58) · size (0.45 × 0.03 × 3.8) | M-STEEL | none | build-v1 |
| B07/quarantine/FIX06 | PPE cabinet | at (-49.55, 0, 56) · size (0.45 × 1.9 × 0.9) | M-STEEL | body | build-v1 |

#### B07-operations-campus/feed-kitchen

Room rect: `[-43, -40, 47, 52]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B07/feed/FIX01 | food preparation table | at (-41.5, 0, 49.1) · size (1.8 × 0.9 × 0.75) | M-FOOD-STEEL | body | build-v1 |
| B07/feed/FIX02 | double sink | at (-42.55, 0, 51.35) · size (0.75 × 0.92 × 1) | M-FOOD-STEEL | body | build-v1 |
| B07/feed/FIX03 | walk-in chiller | at (-40.55, 0, 51.1) · size (0.8 × 2.4 × 1.45) | M-FOOD-STEEL | body | build-v1 |
| B07/feed/FIX04 | dry-feed shelving | at (-42.55, 0, 47.6) · size (0.55 × 2.1 × 1.1) | M-STEEL | body | build-v1 |
| B07/feed/FIX05 | platform scale | at (-40.8, 0, 48) · size (0.85 × 0.12 × 0.85) | M-STEEL | none | build-v1 |

#### B07-operations-campus/staff-lockers

Room rect: `[-43, -40, 53, 56]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B07/lockers/LOCKER01 | staff locker 1 | at (-42.55, 0, 55.65) · size (0.45 × 1.9 × 0.48) | M-STEEL-DARK | body | build-v1 |
| B07/lockers/LOCKER02 | staff locker 2 | at (-42.1, 0, 55.65) · size (0.45 × 1.9 × 0.48) | M-STEEL-DARK | body | build-v1 |
| B07/lockers/LOCKER03 | staff locker 3 | at (-41.65, 0, 55.65) · size (0.45 × 1.9 × 0.48) | M-STEEL-DARK | body | build-v1 |
| B07/lockers/LOCKER04 | staff locker 4 | at (-41.2, 0, 55.65) · size (0.45 × 1.9 × 0.48) | M-STEEL-DARK | body | build-v1 |
| B07/lockers/LOCKER05 | staff locker 5 | at (-40.75, 0, 55.65) · size (0.45 × 1.9 × 0.48) | M-STEEL-DARK | body | build-v1 |
| B07/lockers/LOCKER06 | staff locker 6 | at (-40.3, 0, 55.65) · size (0.45 × 1.9 × 0.48) | M-STEEL-DARK | body | build-v1 |
| B07/lockers/FIX07 | changing bench | at (-41.5, 0, 54.1) · size (1.8 × 0.48 × 0.48) | M-TIMBER | body | build-v1 |
| B07/lockers/FIX08 | staff washbasin | at (-40.3, 0, 53.35) · size (0.65 × 0.9 × 0.45) | M-CERAMIC | none | build-v1 |

#### B07-operations-campus/service-yard

Room rect: `[-43, -40, 57, 60.5]`

| Stable ID | Object | Exact placement | Material | Collision | Build state |
|---|---|---|---|---|---|
| B07/yard/CRATE01 | transport crate 1 | at (-42.5, 0, 58.75) · size (0.62 × 0.76 × 0.72) | M-STEEL-DARK | body | build-v1 |
| B07/yard/CRATE02 | transport crate 2 | at (-41.7, 0, 58.75) · size (0.62 × 0.76 × 0.72) | M-STEEL-DARK | body | build-v1 |
| B07/yard/CRATE03 | transport crate 3 | at (-40.9, 0, 58.75) · size (0.62 × 0.76 × 0.72) | M-STEEL-DARK | body | build-v1 |
| B07/yard/CRATE04 | transport crate 4 | at (-40.1, 0, 58.75) · size (0.62 × 0.76 × 0.72) | M-STEEL-DARK | body | build-v1 |
| B07/yard/FIX05 | service-cart bay | at (-40, 0, 60) · size (1.8 × 0.02 × 0.9) | M-CONCRETE | none | build-v1 |
| B07/yard/FIX06 | hose reel | at (-42.7, 1.1, 60.2) · size (0.2 × 0.65 × 0.65) | M-STEEL | none | build-v1 |

### B08-tropical-house — brick plinth, steel greenhouse frame and green roof

Footprint: `[25, 50, 44, 62]` · y 0…7.2 · shell: `glass-greenhouse`

Shared/exterior fixtures:

| Stable ID | Object | Exact placement | Build state | Purpose |
|---|---|---|---|---|
| B08/FIX01 | public portal threshold | at (25, 0, 52) · size (0.16 × 2.6 × 3.2) | existing-r2 | transition to zoo_tropical |
| B08/FIX02 | staff-only east gate | at (50, 0, 59) · size (0.18 × 2.36 × 2.4) | existing-r2 | staff service access |
| B08/FIX03 | Tropical House title sign | at (24.88, 3.6, 52) · size (0.08 × 0.8 × 4.2) | build-v1 | building identification |
| B08/FIX04 | entry canopy light | at (24.7, 3.2, 52) · size (0.45 × 0.12 × 2.8) | build-v1 | portal lighting |

## Tropical House local-coordinate fit-out

Local bounds: `[-13, 13, -10, 10]` · height 6.4m · all coordinates in this section are local to `zoo_tropical`.

### T00-lobby — 热带馆大厅

Rect: `[-12.7, -10, -2.5, 2.5]`

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| T00/FIX01 | information desk | at (-10, 0, 1.4) · size (1.85 × 0.91 × 0.82) | M-TIMBER-DARK | body | existing-r2 | maps and visitor assistance |
| T00/FIX02 | whole-house map | at (-10.5, 0, -2.2) · size (0.1 × 2.42 × 1.55) | M-SCREEN | body | existing-r2 | local plan, entry, exit and exhibits |
| T00/FIX03 | entry ticket reader | at (-11.9, 0, -1.25) · size (0.28 × 1.05 × 0.32) | M-STEEL-DARK | body | build-v1 | entry count and ticket validation |
| T00/FIX04 | brochure rack | at (-12.35, 0, 2) · size (0.28 × 1.55 × 0.75) | M-TIMBER | body | build-v1 | multilingual leaflets |
| T00/FIX05 | stroller parking rail | at (-11.65, 0, 2.2) · size (1.6 × 0.65 × 0.08) | M-STEEL | none | build-v1 | stroller parking |
| T00/FIX06 | queue rail west | at (-11.3, 0, -0.6) · size (1.8 × 0.9 × 0.07) | M-STEEL | none | build-v1 | entry queue management |
| T00/FIX07 | queue rail east | at (-10.55, 0, -0.6) · size (1.8 × 0.9 × 0.07) | M-STEEL | none | build-v1 | entry queue management |
| T00/FIX08 | accessible-route switch | at (-10.05, 1, -1.95) · size (0.16 × 0.32 × 0.28) | M-SCREEN | none | build-v1 | accessible route overlay control |
| T00/L01 | lobby ceiling light | at (-11.2, 5.8, 0) · size (0.3 × 0.08 × 3) | M-CERAMIC | none | build-v1 | lobby lighting |

### T01-crocodile — 鳄鱼湿地

Rect: `[-8, -2, -8.5, -3]`

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| T01/S01 | crocodile pool | rect [-7.7, -2.3, -8.2, -4.2] · y -0.75…0 | M-WATER | none | build-v1 | swimming and submersion |
| T01/S02 | mud basking shelf | rect [-7.1, -3.1, -6.35, -4.75] · y 0…0.06 | M-MUD | none | existing-r2 | basking shelf |
| T01/FIX01 | basking rock | at (-6.45, 0, -7.5) · size (1.7 × 0.55 × 1.4) | M-ROCK-LIGHT | none | build-v1 | heated basking point |
| T01/FIX02 | submerged log | at (-3.6, -0.18, -7.1) · size (2.4 × 0.34 × 0.34) | M-TIMBER-DARK | none | build-v1 | submerged cover |
| T01/FIX03 | reed planting | at (-7.25, 0, -3.65) · size (1 × 1.2 × 1) | M-WILLOW | none | build-v1 | visual cover |
| T01/FIX04 | overhead heat lamp | at (-6.45, 3.8, -7.5) · size (0.42 × 0.28 × 0.42) | M-RED-LIGHT | none | build-v1 | basking heat |
| T01/FIX05 | protected meat hatch | at (-2.65, 0, -4.1) · size (0.85 × 0.24 × 0.55) | M-FOOD-STEEL | none | build-v1 | keeper feeding |
| T01/FIX06 | pool floor drain | at (-7.1, -0.73, -7.75) · size (0.42 × 0.03 × 0.42) | M-STEEL | none | build-v1 | pool filtration intake |
| T01/FIX07 | filter cabinet | at (-2.35, 0, -8.05) · size (0.55 × 1.5 × 0.85) | M-STEEL | body | build-v1 | pool filtration plant |
| T01/FIX08 | temperature sensor | at (-2.25, 1.2, -4) · size (0.12 × 0.22 × 0.18) | M-SCREEN | none | build-v1 | air and water monitoring |

### T02-river-aquarium — 长江水族

Rect: `[2, 7, -8.5, -3]`

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| T02/S01 | main aquarium water volume | rect [2.25, 6.75, -8.25, -3.25] · y -2.2…0 | M-WATER | none | build-v1 | sturgeon and schooling fish display |
| T02/FIX01 | west river rock group | at (3, 0, -7.45) · size (1.6 × 0.85 × 1.4) | M-ROCK | none | build-v1 | underwater shelter |
| T02/FIX02 | east river rock group | at (6.1, 0, -6.2) · size (1.8 × 0.95 × 1.5) | M-ROCK-LIGHT | none | build-v1 | underwater shelter |
| T02/FIX03 | driftwood trunk | at (4.8, 0.25, -7) · size (3.2 × 0.32 × 0.32) | M-TIMBER-DARK | none | build-v1 | river habitat structure |
| T02/FIX04 | aquatic plant bed A | at (2.8, 0, -4.1) · size (0.9 × 1.15 × 0.9) | M-WILLOW | none | build-v1 | aquatic planting |
| T02/FIX05 | aquatic plant bed B | at (6.2, 0, -7.8) · size (0.9 × 1.2 × 0.9) | M-WILLOW | none | build-v1 | aquatic planting |
| T02/FIX06 | bubble diffuser line | at (4.5, -1.9, -8) · size (3 × 0.06 × 0.12) | M-STEEL | none | build-v1 | oxygenation |
| T02/FIX07 | filter return grille | at (6.72, 0.9, -5.8) · size (0.06 × 1.5 × 0.65) | M-STEEL | none | build-v1 | filtered water return |
| T02/FIX08 | keeper feed hatch | at (6.45, 2.25, -8) · size (0.55 × 0.18 × 0.45) | M-FOOD-STEEL | none | build-v1 | staff-only feeding hatch |
| T02/FIX09 | tank information monitor | at (6.95, 1.45, -2.98) · size (1.1 × 0.72 × 0.06) | M-SCREEN | none | build-v1 | water temperature and species facts |

### T03-reptile — 爬行动物馆

Rect: `[-8, -2, 3, 8.5]`

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| T03/FIX01 | snake terrarium | rect [-7.7, -4.9, 3.35, 8.15] · y 0…2.4 | M-GLASS | camera-blocker | build-v1 | snake climate enclosure |
| T03/FIX02 | lizard terrarium | rect [-4.65, -2.3, 3.35, 8.15] · y 0…2.4 | M-GLASS | camera-blocker | build-v1 | lizard climate enclosure |
| T03/FIX03 | snake climbing branch | at (-6, 0.95, 6.4) · size (3.8 × 0.26 × 0.26) | M-TIMBER | none | existing-r2 | snake climbing |
| T03/FIX04 | snake hide box | at (-6.85, 0, 4.25) · size (0.75 × 0.42 × 0.62) | M-ROCK | none | build-v1 | covered retreat |
| T03/FIX05 | snake heat lamp | at (-6.1, 2.15, 5.65) · size (0.36 × 0.25 × 0.36) | M-RED-LIGHT | none | build-v1 | basking heat |
| T03/FIX06 | lizard basking rock | at (-3.8, 0, 6.7) · size (1.35 × 0.62 × 1.15) | M-ROCK-LIGHT | none | existing-r2 | basking platform |
| T03/FIX07 | lizard hide box | at (-2.85, 0, 4.15) · size (0.68 × 0.38 × 0.58) | M-ROCK | none | build-v1 | covered retreat |
| T03/FIX08 | lizard heat lamp | at (-3.8, 2.2, 6.7) · size (0.36 × 0.25 × 0.36) | M-RED-LIGHT | none | build-v1 | basking heat |
| T03/FIX09 | humidity monitor | at (-4.8, 1.45, 3.08) · size (0.72 × 0.35 × 0.06) | M-SCREEN | none | build-v1 | terrarium climate status |
| T03/FIX10 | keeper service cabinet | at (-7.5, 0, 8.15) · size (0.55 × 1.4 × 0.55) | M-STEEL | body | build-v1 | reptile tools and feed |

### T04-butterfly — 蝴蝶温室

Rect: `[2, 7, 3, 8.5]`

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| T04/S01 | west tropical planting bed | rect [2.3, 4, 3.35, 8.15] · y 0…0.18 | M-FOREST | none | build-v1 | nectar planting |
| T04/S02 | east tropical planting bed | rect [5, 6.7, 3.35, 8.15] · y 0…0.18 | M-FOREST | none | build-v1 | nectar planting |
| T04/FIX01 | nectar tray A | at (3, 0.85, 5.3) · size (0.65 × 0.08 × 0.65) | M-RUBBER | none | build-v1 | butterfly feeding |
| T04/FIX02 | nectar tray B | at (6, 0.85, 6.3) · size (0.65 × 0.08 × 0.65) | M-RUBBER | none | build-v1 | butterfly feeding |
| T04/FIX03 | chrysalis cabinet | at (6.55, 0, 7.7) · size (0.42 × 1.65 × 0.9) | M-GLASS | body | build-v1 | visible butterfly emergence |
| T04/FIX04 | mist nozzle west | at (3.4, 4.2, 5) · size (0.15 × 0.15 × 0.15) | M-STEEL | none | build-v1 | humidity control |
| T04/FIX05 | mist nozzle east | at (5.8, 4.2, 7.1) · size (0.15 × 0.15 × 0.15) | M-STEEL | none | build-v1 | humidity control |
| T04/FIX06 | west airlock sign | at (2.05, 2.3, 5.8) · size (0.06 × 0.5 × 1.1) | M-SCREEN | none | build-v1 | keep both doors closed |
| T04/FIX07 | east airlock sign | at (6.95, 2.3, 5.8) · size (0.06 × 0.5 × 1.1) | M-SCREEN | none | build-v1 | keep both doors closed |
| T04/FIX08 | floor drain | at (4.5, 0, 8) · size (0.45 × 0.03 × 0.45) | M-STEEL | none | build-v1 | greenhouse drainage |

### T05-nocturnal — 夜行动物

Rect: `[9, 11.5, 3, 6]`

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| T05/FIX01 | dark mesh flight volume | rect [9.15, 11.35, 3.2, 5.85] · y 0…5.45 | M-MESH | camera-blocker | existing-r2 | fruit bat flight space |
| T05/FIX02 | high roost beam | at (10.25, 4.85, 4.5) · size (2.1 × 0.18 × 0.18) | M-TIMBER-DARK | none | build-v1 | bat roost |
| T05/FIX03 | cave roost box A | at (9.55, 3.65, 5.65) · size (0.65 × 0.62 × 0.45) | M-ROCK | none | build-v1 | dark retreat |
| T05/FIX04 | cave roost box B | at (10.95, 3.65, 5.65) · size (0.65 × 0.62 × 0.45) | M-ROCK | none | build-v1 | dark retreat |
| T05/FIX05 | fruit feeder | at (10.25, 1.65, 3.65) · size (0.85 × 0.18 × 0.55) | M-FOOD-STEEL | none | build-v1 | fruit feeding |
| T05/FIX06 | red service light A | at (9.5, 4.6, 3.4) · size (0.35 × 0.18 × 0.35) | M-RED-LIGHT | none | build-v1 | low-impact keeper light |
| T05/FIX07 | red service light B | at (11, 4.6, 5.6) · size (0.35 × 0.18 × 0.35) | M-RED-LIGHT | none | build-v1 | low-impact keeper light |
| T05/FIX08 | wash-down drain | at (9.5, 0, 5.5) · size (0.42 × 0.03 × 0.42) | M-STEEL | none | build-v1 | enclosure cleaning |

### T06-atrium — 雨林中庭

Rect: `[-1, 1, -8.5, 8.5]`

| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |
|---|---|---|---|---|---|---|
| T06/FIX01 | canopy tree | at (0, 0, 4.8) · size (3.5 × 5.5 × 3.5) | M-FOLIAGE | body | existing-r2 | atrium canopy and shade |
| T06/FIX02 | rock waterfall | at (0, 0, 7.4) · size (1.8 × 4.5 × 0.6) | M-ROCK | camera-blocker | existing-r2 | central water feature |
| T06/FIX03 | waterfall receiving pool | rect [-1.7, 1.7, 5.5, 8.1] · y 0…0.38 | M-WATER | none | existing-r2 | waterfall basin |
| T06/FIX04 | west rock group | at (-0.75, 0, 6.9) · size (1.4 × 0.75 × 1.2) | M-ROCK | none | existing-r2 | pool edge |
| T06/FIX05 | east rock group | at (0.85, 0, 6.5) · size (1.4 × 0.75 × 1.2) | M-ROCK-LIGHT | none | existing-r2 | pool edge |
| T06/FIX06 | south canopy vine | at (0, 1, -5.8) · size (1.7 × 4.2 × 1.4) | M-FOLIAGE | none | build-v1 | vertical planting |
| T06/FIX07 | north canopy vine | at (0, 1, 2.2) · size (1.7 × 4.2 × 1.4) | M-FOLIAGE | none | build-v1 | vertical planting |
| T06/FIX08 | mist nozzle south | at (0, 5.2, -3) · size (0.15 × 0.15 × 0.15) | M-STEEL | none | build-v1 | humidity control |
| T06/FIX09 | mist nozzle north | at (0, 5.2, 3.5) · size (0.15 × 0.15 × 0.15) | M-STEEL | none | build-v1 | humidity control |
| T06/FIX10 | pool floor drain | at (0, -0.36, 7.25) · size (0.45 × 0.03 × 0.45) | M-STEEL | none | build-v1 | waterfall filtration intake |
| T06/FIX11 | rainforest sound post | at (1.5, 0, 0) · size (0.32 × 1.2 × 0.32) | M-SCREEN | body | build-v1 | rainforest sound interaction |

## Acceptance checklist

- [ ] **AC01:** schema/revision/hash exact
- [ ] **AC02:** all stable IDs unique
- [ ] **AC03:** all placements finite and dimensions positive
- [ ] **AC04:** all habitat placements contained or explicitly exempt
- [ ] **AC05:** all room fixtures assigned and contained
- [ ] **AC06:** all material and archetype references resolve
- [ ] **AC07:** all build-v1 records compiled exactly once
- [ ] **AC08:** public path and focus collision sweeps pass at player radius 0.30m
- [ ] **AC09:** outdoor 180-solid/55-blocker and render-chunk budgets remain valid
- [ ] **AC10:** Tropical House entry/exit, walk-through butterfly room and local interactions remain reachable

## AI build instruction

1. Load and validate the parent blueprint first.
2. Load this JSON and verify `contentHash`.
3. Compile phases CV1-P01 through CV1-P08 in order.
4. Build only `build-v1` placements; use `existing-r2` as collision/reference geometry.
5. Run all AC01–AC10 checks. A build is incomplete if any stable ID is missing, duplicated, displaced, or unreachable.
