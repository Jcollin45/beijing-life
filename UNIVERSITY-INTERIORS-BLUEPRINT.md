# 北京文华大学 · complete interior construction blueprint

This is the implemented, construction-grade interior companion to `UNIVERSITY-BLUEPRINT.md`. The exterior campus layout stays fixed. This blueprint audits every occupiable campus building, preserves the two existing place keys, and defines every floor, room, door, major fixture, safety object, coordinate, finish, portal and build rule used by the runtime.

The machine-readable source of truth is [`UNIVERSITY-INTERIORS-BLUEPRINT.json`](UNIVERSITY-INTERIORS-BLUEPRINT.json). Re-run `node tools/generate-university-interiors-blueprint.js` after any authored change. If prose and JSON disagree, use the JSON and regenerate this file.

Blueprint version **2** · exterior layout **2** · canonical hash `c171e9088ac1408b85bdd6f177657af3b863d9879164ce7da54fcbf4f377fcef`.

## 1. Audit result

Before this construction pass, only two university interiors existed, and both were single representative rooms. B03–B08 were opaque exterior masses with decorative doors/windows and no registered indoor place. The metro mouth already connected to Metro and is not part of this interior scope.

| Building | Current state | What is missing |
| --- | --- | --- |
| B01 | polished-representative-room | The hand-built scene remains a polished 9.2 × 8.0 m seminar alias for B01/F2/WEST; the complete lobby, corridors, stairs, lift, toilets and all five floors are supplied by B01 floorsPlan. |
| B02 | partial-representative-room | Only one 12 × 11 m grand reading room exists; no security lobby, full stacks, group rooms, archives, toilets, stairs, lift or other floors are represented. |
| B03 | none | Exterior opening and silhouettes only; no room, portal or interior props. |
| B04 | none | Exterior entrance and parcel lockers only; no lobby, bedrooms, washrooms, stairs, lift or interior props. |
| B05 | generated-complete | The exterior previously exposed only an entrance/service interaction; B05 floorsPlan now supplies a complete four-floor civic administration interior with public services, departments, meeting and executive suites, protected stairs, accessible lift/WC and secure records. |
| B06 | none | Exterior entrance/stair-tower skin only; no walkable labs, safety equipment, stairs, lift or interior props. |
| B07 | none | Two exterior doors and window silhouettes only; no activity-centre or clinic rooms. |
| B08 | none | Exterior guardhouse shell/window only; no walkable interior and no exterior door portal. |

### Existing-room corrections required

**B01 · classroom**


**B02 · library**

- The 4.8 m room height conflicts with the exterior 3.2 m floor pitch unless it is declared double-height.
- Reading-table legs extend beyond the authored tabletop width.
- Shelf carcasses and horizontal shelves do not share the same z extent.
- Exported window half-extents are written as full dimensions and the window normal is ambiguous.

## 2. Coordinate and construction contract

- Coordinates are metres. In every building-local plan, `+x` is campus east, `+z` is campus north and `+y` is up.
- Room rectangles are `[x0,x1,z0,z1]`. Fixture points are `[x,y,z]`. `box()` dimensions are full dimensions.
- Each building publishes its exact local-to-campus transform. Upper floors should be separate indoor scenes with their deck reset to local `y=0`; the JSON keeps absolute building y metadata.
- Prefabs are deterministic composite objects. An instance coordinate plus the prefab component design is the exhaustive object instruction; builders must not invent filler.
- Every visible solid needs one deliberate collision footprint. Glyphs, chair legs, books and decorative subparts do not get individual colliders.

## 3. Scope and totals

| Quantity | Count |
| --- | --- |
| buildings | 8 |
| floors | 28 |
| rooms | 205 |
| fixtureInstances | 4854 |
| beds | 47 |
| studentSeatPairs | 2 |
| labBenches | 25 |
| autoCompletedDoors | 47 |
| normalizedCirculationRoutes | 1 |
| completedStairSafetyFixtures | 58 |

## 4. Building summary

| ID | Building | Floors | Local envelope | Current / planned |
| --- | --- | --- | --- | --- |
| B01 | 第一教学楼 | 5 | x[-16, 16] z[-5.5, 5.5] | partial-existing |
| B02 | 图书馆 | 4 | x[-6.5, 6.5] z[-12, 12] | partial-existing |
| B03 | 学生食堂 | 1 | x[-7, 7] z[-9.5, 9.5] | new-interior |
| B04 | 学生宿舍 | 6 | x[-6.5, 6.5] z[-8, 8] | new-interior |
| B05 | 行政楼 · 国际学生中心 | 4 | x[-7, 7] z[-6, 6] | new-interior |
| B06 | 科学与创新楼（实验楼） | 4 | x[-7.5, 7.5] z[-11, 11] | new-interior |
| B07 | 学生活动中心 · 校医院 | 3 | x[-6.5, 6.5] z[-5.5, 5.5] | new-interior |
| B08 | 门卫 · 访客室 | 1 | x[-3, 3] z[-2.7, 2.7] | new-interior |

## B01 · 第一教学楼

A measured university teaching block planned from circulation outward: 1.20 m primary routes, 0.90 m cross-aisles, clear 1.15 m protected-stair landings, restrained 16–18-seat classrooms, a two-block 20-place accessible lecture room, seven- to nine-station computing rooms, aligned acoustic ceiling zones, operable curtain-and-window bands and distinct floor identities without freestanding corridor clutter.

Exterior footprint: `x[-19,13] z[52,63]`. Local envelope: `x[-16, 16] z[-5.5, 5.5]`. Transform: `-3 + localX`, `57.5 + localZ`.

### Portals

| Portal | Campus anchor | Campus return | Local spawn | Place key |
| --- | --- | --- | --- | --- |
| B01/PUBLIC | [-3,52] | [-3,47.2,0] | [0,0,-4.25,0] | campus_b01_f1 |
| B01/LEGACY-CLASSROOM | B01/F2/WEST | — | — | classroom |

### Floor and room schedule

#### Floor 1 · elevation 0 m · 190 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B01/F1/WEST | 101阶梯教室 | x[-12.6, -3.4] z[-5, 3] | classroom | 49 | north [-4.6,0,3] w1.05 → B01/F1/CORRIDOR<br>west [-12.6,0,-2.1] w1.2 → B01/F1/STAIR-W |
| B01/F1/CENTRE | 门厅与导览 | x[-3.2, 3.2] z[-5, 3] | public | 29 | north [0,0,3] w1.05 → B01/F1/CORRIDOR<br>south [0,0,-5.5] w3.2 → campus |
| B01/F1/EAST | 102无障碍教室 | x[3.4, 12.6] z[-5, 3] | classroom | 57 | north [11.4,0,3] w1.05 → B01/F1/CORRIDOR<br>east [12.6,0,-2.1] w1.2 → B01/F1/STAIR-E |
| B01/F1/STAIR-W | 西安全楼梯 | x[-15.5, -12.8] z[-5, 0.8] | service | 7 | east [-12.8,0,-2.1] w1.2 → B01/F1/WEST |
| B01/F1/WC-W | 西侧卫生间 | x[-15.5, -12.8] z[1, 5] | service | 6 | east [-12.8,0,4.025] w1.2 → B01/F1/CORRIDOR |
| B01/F1/STAIR-E | 东安全楼梯 | x[12.8, 15.5] z[-5, 0.8] | service | 7 | west [12.8,0,-2.1] w1.2 → B01/F1/EAST |
| B01/F1/LIFT-E | 电梯与无障碍卫生间 | x[12.8, 15.5] z[1, 5] | service | 13 | west [12.8,0,4.025] w1.2 → B01/F1/CORRIDOR |

Circulation: `B01/F1/CORRIDOR` x[-12.8, 12.8] z[3.1, 4.95], clear 1.85 m; `B01/F1/ENTRY` x[-1.65, 1.65] z[-5.5, 3.1], clear 3.3 m.

#### Floor 2 · elevation 3.3 m · 192 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B01/F2/WEST | 201教室 | x[-12.6, -3.4] z[-5, 3] | classroom | 54 | north [-4.6,3.3,3] w1.05 → B01/F2/CORRIDOR<br>west [-12.6,3.3,-2.1] w1.2 → B01/F2/STAIR-W |
| B01/F2/CENTRE | 教师答疑室 | x[-3.2, 3.2] z[-5, 3] | office | 25 | north [0,3.3,3] w1.05 → B01/F2/CORRIDOR |
| B01/F2/EAST | 202教室 | x[3.4, 12.6] z[-5, 3] | classroom | 57 | north [11.4,3.3,3] w1.05 → B01/F2/CORRIDOR<br>east [12.6,3.3,-2.1] w1.2 → B01/F2/STAIR-E |
| B01/F2/STAIR-W | 西安全楼梯 | x[-15.5, -12.8] z[-5, 0.8] | service | 7 | east [-12.8,3.3,-2.1] w1.2 → B01/F2/WEST |
| B01/F2/WC-W | 西侧卫生间 | x[-15.5, -12.8] z[1, 5] | service | 6 | east [-12.8,3.3,4.025] w1.2 → B01/F2/CORRIDOR |
| B01/F2/STAIR-E | 东安全楼梯 | x[12.8, 15.5] z[-5, 0.8] | service | 7 | west [12.8,3.3,-2.1] w1.2 → B01/F2/EAST |
| B01/F2/LIFT-E | 电梯与无障碍卫生间 | x[12.8, 15.5] z[1, 5] | service | 13 | west [12.8,3.3,4.025] w1.2 → B01/F2/CORRIDOR |

Circulation: `B01/F2/CORRIDOR` x[-12.8, 12.8] z[3.1, 4.95], clear 1.85 m; `B01/F2/CENTRE-ROUTE` x[-0.6, 0.6] z[-4.85, 4.95], clear 1.2 m.

#### Floor 3 · elevation 6.6 m · 163 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B01/F3/WEST | 301语言实验室 | x[-12.6, -3.4] z[-5, 3] | classroom | 38 | north [-4.6,6.6,3] w1.05 → B01/F3/CORRIDOR<br>west [-12.6,6.6,-2.1] w1.2 → B01/F3/STAIR-W |
| B01/F3/CENTRE | 小组学习区 | x[-3.2, 3.2] z[-5, 3] | classroom | 28 | north [0,6.6,3] w1.05 → B01/F3/CORRIDOR |
| B01/F3/EAST | 302计算机教室 | x[3.4, 12.6] z[-5, 3] | classroom | 40 | north [11.4,6.6,3] w1.05 → B01/F3/CORRIDOR<br>east [12.6,6.6,-2.1] w1.2 → B01/F3/STAIR-E |
| B01/F3/STAIR-W | 西安全楼梯 | x[-15.5, -12.8] z[-5, 0.8] | service | 7 | east [-12.8,6.6,-2.1] w1.2 → B01/F3/WEST |
| B01/F3/WC-W | 西侧卫生间 | x[-15.5, -12.8] z[1, 5] | service | 6 | east [-12.8,6.6,4.025] w1.2 → B01/F3/CORRIDOR |
| B01/F3/STAIR-E | 东安全楼梯 | x[12.8, 15.5] z[-5, 0.8] | service | 7 | west [12.8,6.6,-2.1] w1.2 → B01/F3/EAST |
| B01/F3/LIFT-E | 电梯与无障碍卫生间 | x[12.8, 15.5] z[1, 5] | service | 13 | west [12.8,6.6,4.025] w1.2 → B01/F3/CORRIDOR |

Circulation: `B01/F3/CORRIDOR` x[-12.8, 12.8] z[3.1, 4.95], clear 1.85 m; `B01/F3/CENTRE-ROUTE` x[-0.6, 0.6] z[-4.85, 4.95], clear 1.2 m.

#### Floor 4 · elevation 9.9 m · 199 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B01/F4/WEST | 401教室 | x[-12.6, -3.4] z[-5, 3] | classroom | 54 | north [-4.6,9.9,3] w1.05 → B01/F4/CORRIDOR<br>west [-12.6,9.9,-2.1] w1.2 → B01/F4/STAIR-W |
| B01/F4/CENTRE | 教学准备室 | x[-3.2, 3.2] z[-5, 3] | office | 31 | north [0,9.9,3] w1.05 → B01/F4/CORRIDOR |
| B01/F4/EAST | 402教室 | x[3.4, 12.6] z[-5, 3] | classroom | 57 | north [11.4,9.9,3] w1.05 → B01/F4/CORRIDOR<br>east [12.6,9.9,-2.1] w1.2 → B01/F4/STAIR-E |
| B01/F4/STAIR-W | 西安全楼梯 | x[-15.5, -12.8] z[-5, 0.8] | service | 7 | east [-12.8,9.9,-2.1] w1.2 → B01/F4/WEST |
| B01/F4/WC-W | 西侧卫生间 | x[-15.5, -12.8] z[1, 5] | service | 6 | east [-12.8,9.9,4.025] w1.2 → B01/F4/CORRIDOR |
| B01/F4/STAIR-E | 东安全楼梯 | x[12.8, 15.5] z[-5, 0.8] | service | 7 | west [12.8,9.9,-2.1] w1.2 → B01/F4/EAST |
| B01/F4/LIFT-E | 电梯与无障碍卫生间 | x[12.8, 15.5] z[1, 5] | service | 13 | west [12.8,9.9,4.025] w1.2 → B01/F4/CORRIDOR |

Circulation: `B01/F4/CORRIDOR` x[-12.8, 12.8] z[3.1, 4.95], clear 1.85 m; `B01/F4/CENTRE-ROUTE` x[-0.6, 0.6] z[-4.85, 4.95], clear 1.2 m.

#### Floor 5 · elevation 13.2 m · 160 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B01/F5/WEST | 501研讨室 | x[-12.6, -3.4] z[-5, 3] | classroom | 35 | north [-4.6,13.2,3] w1.05 → B01/F5/CORRIDOR<br>west [-12.6,13.2,-2.1] w1.2 → B01/F5/STAIR-W |
| B01/F5/CENTRE | 教师办公室 | x[-3.2, 3.2] z[-5, 3] | office | 29 | north [0,13.2,3] w1.05 → B01/F5/CORRIDOR |
| B01/F5/EAST | 502计算机教室 | x[3.4, 12.6] z[-5, 3] | classroom | 40 | north [11.4,13.2,3] w1.05 → B01/F5/CORRIDOR<br>east [12.6,13.2,-2.1] w1.2 → B01/F5/STAIR-E |
| B01/F5/STAIR-W | 西安全楼梯 | x[-15.5, -12.8] z[-5, 0.8] | service | 7 | east [-12.8,13.2,-2.1] w1.2 → B01/F5/WEST |
| B01/F5/WC-W | 西侧卫生间 | x[-15.5, -12.8] z[1, 5] | service | 6 | east [-12.8,13.2,4.025] w1.2 → B01/F5/CORRIDOR |
| B01/F5/STAIR-E | 东安全楼梯 | x[12.8, 15.5] z[-5, 0.8] | service | 7 | west [12.8,13.2,-2.1] w1.2 → B01/F5/EAST |
| B01/F5/LIFT-E | 电梯与无障碍卫生间 | x[12.8, 15.5] z[1, 5] | service | 13 | west [12.8,13.2,4.025] w1.2 → B01/F5/CORRIDOR |

Circulation: `B01/F5/CORRIDOR` x[-12.8, 12.8] z[3.1, 4.95], clear 1.85 m; `B01/F5/CENTRE-ROUTE` x[-0.6, 0.6] z[-4.85, 4.95], clear 1.2 m.

The exact coordinate, size, yaw, material, collision, purpose and prefab ID for every fixture on these floors is in the JSON building record.

## B02 · 图书馆

A measured four-floor university library: clear security threshold and side-on reader-services desk; human-scale stacks with 1.20 m or wider face and cross aisles; a 1.50 m minimum quiet spine; reading tables oriented with full chair pull-back; daylit window benches; acoustically separated group pods; digital reading, silent special-collections reading and compact staff consultation areas; two remote protected stairs on every floor; wall-mounted signs and a restrained ceiling rhythm.

Exterior footprint: `x[30,43] z[38,62]`. Local envelope: `x[-6.5, 6.5] z[-12, 12]`. Transform: `36.5 + localX`, `50 + localZ`.

### Portals

| Portal | Campus anchor | Campus return | Local spawn | Place key |
| --- | --- | --- | --- | --- |
| B02/PUBLIC | [30,50] | [27.2,50,1.5707963267948966] | [-5,0,0,1.5707963267948966] | campus_b02_f1 |
| B02/LEGACY-READING | B02/F2/NORTH | — | — | library |

### Floor and room schedule

#### Floor 1 · elevation 0 m · 122 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B02/F1/LOBBY | 入口与安检 | x[-6.15, -2.25] z[-2.4, 2.4] | public | 12 | east [-2.25,0,-0.3] w1.8 → B02/F1/HALL |
| B02/F1/CIRC | 借还书处 | x[-2.05, 0.9] z[-4.5, 0.55] | library | 9 | north [-0.6,0,0.55] w1.2 → B02/F1/HALL |
| B02/F1/NEW | 新书与综合阅览 | x[-6.15, 0.9] z[2.65, 11.6] | library | 22 | south [-0.575,0,2.65] w1.2 → B02/F1/HALL |
| B02/F1/READ | 无障碍阅览区 | x[1.7, 6.15] z[1, 11.6] | library | 23 | west [1.7,0,7.8] w1.2 → B02/F1/EGRESS-NW |
| B02/F1/PROCESS | 图书加工与办公室 | x[-6.15, 0.9] z[-11.6, -4.75] | office | 19 | east [0.9,0,-5.375] w1.2 → B02/F1/SERVICE-SPINE |
| B02/F1/CORE | 楼梯与电梯 | x[1.1, 6.15] z[-11.6, -5.35] | service | 10 | north [2.25,0,-5.35] w1.2 → B02/F1/SERVICE-SPINE |
| B02/F1/WC | 卫生间 | x[3.55, 6.15] z[-3.85, -0.9] | service | 8 | west [3.55,0,-2.375] w1.2 → B02/F1/SERVICE-SPINE |
| B02/F1/STAIR-NW | 西北安全楼梯 | x[-5.95, -3.15] z[7, 11.35] | service | 10 | east [-3.15,0,7.8] w1.1 → B02/F1/EGRESS-NW |

Circulation: `B02/F1/PUBLIC-THRESHOLD` x[-6.5, -4.1] z[-1.2, 1.2], clear 2.4 m; `B02/F1/HALL` x[-2.05, 3.4] z[-0.8, 2.55], clear 2 m; `B02/F1/SERVICE-SPINE` x[1.1, 3.4] z[-6, -0.8], clear 1.5 m; `B02/F1/NORTH-SPINE` x[1.7, 3.4] z[2.4, 8.55], clear 1.7 m; `B02/F1/EGRESS-NW` x[-3.15, 3.4] z[7.05, 8.55], clear 1.5 m.

#### Floor 2 · elevation 3.2 m · 123 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B02/F2/SOUTH | 人文社科书库 | x[-6.15, 0.9] z[-11.6, -0.7] | library | 31 | east [0.9,3.2,-2.95] w1.2 → B02/F2/SPINE |
| B02/F2/NORTH | 大阅览室 | x[-6.15, 0.9] z[-0.45, 11.6] | library | 28 | east [0.9,3.2,7.8] w1.2 → B02/F2/EGRESS-NW |
| B02/F2/EAST | 小组学习室 | x[3.55, 6.15] z[-0.7, 11.6] | library | 21 | west [3.55,3.2,5.5] w1.2 → B02/F2/SPINE |
| B02/F2/CORE | 楼梯与电梯 | x[1.1, 6.15] z[-11.6, -5.35] | service | 10 | north [2.25,3.2,-5.35] w1.2 → B02/F2/SPINE |
| B02/F2/WC | 卫生间 | x[3.55, 6.15] z[-3.85, -0.9] | service | 8 | west [3.55,3.2,-2.375] w1.2 → B02/F2/SPINE |
| B02/F2/STAIR-NW | 西北安全楼梯 | x[-5.95, -3.15] z[7, 11.35] | service | 10 | east [-3.15,3.2,7.8] w1.1 → B02/F2/EGRESS-NW |

Circulation: `B02/F2/SPINE` x[1.1, 3.4] z[-5.2, 11.6], clear 1.5 m; `B02/F2/EGRESS-NW` x[-3.15, 3.4] z[7.05, 8.55], clear 1.5 m.

#### Floor 3 · elevation 6.4 m · 121 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B02/F3/SOUTH | 科学期刊书库 | x[-6.15, 0.9] z[-11.6, -0.7] | library | 29 | east [0.9,6.4,-2.95] w1.2 → B02/F3/SPINE |
| B02/F3/NORTH | 电子阅览室 | x[-6.15, 0.9] z[-0.45, 11.6] | library | 26 | east [0.9,6.4,7.8] w1.2 → B02/F3/EGRESS-NW |
| B02/F3/EAST | 小组学习室 | x[3.55, 6.15] z[-0.7, 11.6] | library | 21 | west [3.55,6.4,5.5] w1.2 → B02/F3/SPINE |
| B02/F3/CORE | 楼梯与电梯 | x[1.1, 6.15] z[-11.6, -5.35] | service | 10 | north [2.25,6.4,-5.35] w1.2 → B02/F3/SPINE |
| B02/F3/WC | 卫生间 | x[3.55, 6.15] z[-3.85, -0.9] | service | 8 | west [3.55,6.4,-2.375] w1.2 → B02/F3/SPINE |
| B02/F3/STAIR-NW | 西北安全楼梯 | x[-5.95, -3.15] z[7, 11.35] | service | 10 | east [-3.15,6.4,7.8] w1.1 → B02/F3/EGRESS-NW |

Circulation: `B02/F3/SPINE` x[1.1, 3.4] z[-5.2, 11.6], clear 1.5 m; `B02/F3/EGRESS-NW` x[-3.15, 3.4] z[7.05, 8.55], clear 1.5 m.

#### Floor 4 · elevation 9.6 m · 110 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B02/F4/SOUTH | 特藏与档案 | x[-6.15, 0.9] z[-11.6, -0.7] | library | 32 | east [0.9,9.6,-2.95] w1.2 → B02/F4/SPINE |
| B02/F4/NORTH | 安静阅览室 | x[-6.15, 0.9] z[-0.45, 11.6] | library | 22 | east [0.9,9.6,7.8] w1.2 → B02/F4/EGRESS-NW |
| B02/F4/EAST | 馆员办公室 | x[3.55, 6.15] z[-0.7, 11.6] | office | 12 | west [3.55,9.6,5] w1.2 → B02/F4/SPINE |
| B02/F4/CORE | 楼梯与电梯 | x[1.1, 6.15] z[-11.6, -5.35] | service | 10 | north [2.25,9.6,-5.35] w1.2 → B02/F4/SPINE |
| B02/F4/WC | 卫生间 | x[3.55, 6.15] z[-3.85, -0.9] | service | 8 | west [3.55,9.6,-2.375] w1.2 → B02/F4/SPINE |
| B02/F4/STAIR-NW | 西北安全楼梯 | x[-5.95, -3.15] z[7, 11.35] | service | 10 | east [-3.15,9.6,7.8] w1.1 → B02/F4/EGRESS-NW |

Circulation: `B02/F4/SPINE` x[1.1, 3.4] z[-5.2, 11.6], clear 1.5 m; `B02/F4/EGRESS-NW` x[-3.15, 3.4] z[7.05, 8.55], clear 1.5 m.

The exact coordinate, size, yaw, material, collision, purpose and prefab ID for every fixture on these floors is in the JSON building record.

## B03 · 学生食堂

A working 30-place campus canteen with a recognisable daily rhythm: eight correctly oriented dining tables sit on a measured 1.20 m aisle grid beneath warm pendants and washable acoustic rafts; three tables provide wheelchair transfer bays without squeezing the customer sight aisle; deep composed window bays follow the east facade; and restrained brick, oak, blue textile and bilingual daily-service graphics give the hall an authentic student identity. A numbered 1.50 m south-to-north queue progresses from trays through four unmistakable composed silhouettes—a guarded oak steam-rice counter, open stainless induction range beneath a hood, low monitored tofu cold-well with a compact condiment caddy, and open-leg dark-oak braise portioning table—to payment and pickup, while the north return feeds a physically separate dirty wash room. The west back-of-house maintains continuous storage, changing, clean-prep, hot-line and wash-up routes under colour-accurate task lighting, hygiene signage and live production/temperature boards.

Exterior footprint: `x[-43,-29] z[-7,12]`. Local envelope: `x[-7, 7] z[-9.5, 9.5]`. Transform: `-36 + localX`, `2.5 + localZ`.

### Portals

| Portal | Campus anchor | Campus return | Local spawn | Place key |
| --- | --- | --- | --- | --- |
| B03/PUBLIC | [-29,2.5] | [-26.6,2.5,-1.5707963267948966] | [5.6,0,0,-1.5707963267948966] | campus_canteen |

### Required facade cuts

- **B03/EXIT-S:** Add a 1.50 m south emergency exit at campus (-35.65,-7.0); do not use the obstructed west delivery-screen gap as the public second exit.

### Floor and room schedule

#### Floor 1 · elevation 0 m · 194 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B03/F1/DINING | 学生餐厅 | x[0.2, 6.6] z[-8.9, 8.9] | canteen | 92 | south [0.35,0,-9.5] w1.5 → campus<br>west [0.2,0,-7.85] w1.2 → B03/F1/QUEUE-SPINE |
| B03/F1/SERVE | 售饭区 | x[-2.65, 0] z[-8.9, 5.9] | kitchen | 34 | west [-2.65,0,-8.2] w0.9 → B03/F1/SERVICE-ENTRY<br>west [-2.65,0,3.725] w0.95 → B03/F1/CLEAN-PASS |
| B03/F1/RETURN | 餐具回收 | x[-2.65, 1.15] z[6.1, 8.9] | kitchen | 8 | west [-2.65,0,8.45] w0.9 → B03/F1/DISH-STAFF |
| B03/F1/KITCHEN | 净菜与热厨 | x[-6.6, -2.65] z[-1.5, 4.7] | kitchen | 18 | west [-7,0,3] w1.2 → campus-service<br>east [-2.65,0,3.725] w0.95 → B03/F1/CLEAN-PASS<br>south [-3.55,0,-1.5] w1.2 → B03/F1/BOH-CLEAN<br>north [-5.4,0,4.7] w1.2 → B03/F1/DIRTY |
| B03/F1/DIRTY | 餐具洗消间 | x[-6.6, -2.65] z[4.7, 8.9] | kitchen | 10 | south [-5.4,0,4.7] w1.2 → B03/F1/KITCHEN<br>east [-2.65,0,8.45] w0.9 → B03/F1/DISH-STAFF |
| B03/F1/STORE | 冷藏与干货储藏 | x[-6.6, -2.65] z[-8.9, -5] | service | 9 | east [-2.65,0,-8.2] w0.9 → B03/F1/SERVICE-ENTRY<br>north [-3.25,0,-5] w1.2 → B03/F1/BOH-CLEAN |
| B03/F1/WC | 员工卫生间 | x[-6.6, -4.45] z[-5, -1.5] | service | 10 | east [-4.45,0,-2.6] w1 → B03/F1/BOH-CLEAN |
| B03/F1/CHANGE | 员工更衣与清洁通道 | x[-4.45, -2.65] z[-5, -1.5] | service | 5 | south [-3.25,0,-5] w1.2 → B03/F1/BOH-CLEAN<br>north [-3.55,0,-1.5] w1.2 → B03/F1/BOH-CLEAN<br>west [-4.45,0,-2.6] w1 → B03/F1/BOH-CLEAN |

Circulation: `B03/F1/QUEUE-SPINE` x[-0.35, 1.15] z[-7.9, 5.85], clear 1.5 m; `B03/F1/ENTRY` x[0.2, 7] z[-2.42, 2.42], clear 2.4 m; `B03/F1/EGRESS-S` x[-0.4, 1.45] z[-9.5, -8], clear 1.5 m; `B03/F1/DINING-AISLE` x[3.225, 4.425] z[-7.6, 7.6], clear 1.2 m; `B03/F1/DINING-CROSS-S` x[1.15, 6.3] z[-5.72, -4.48], clear 1.2 m; `B03/F1/DINING-CROSS-N` x[1.15, 6.3] z[4.48, 5.72], clear 1.2 m; `B03/F1/RETURN-LANE` x[-0.35, 1.15] z[6.1, 8.25], clear 1.5 m; `B03/F1/SERVE-STAFF` x[-2.6, -1.4] z[-8.65, 5.75], clear 1.2 m; `B03/F1/SERVICE-ENTRY` x[-3.25, -1.4] z[-8.65, -7.75], clear 0.9 m; `B03/F1/CLEAN-PASS` x[-3.25, -1.4] z[3.25, 4.2], clear 0.95 m; `B03/F1/DISH-STAFF` x[-3.25, -1.4] z[8, 8.9], clear 0.9 m; `B03/F1/BOH-CLEAN` x[-3.95, -2.75] z[-5, -0.15], clear 1.2 m; `B03/F1/KITCHEN-AISLE` x[-5.55, -3.6] z[-1.2, 2.75], clear 1.95 m; `B03/F1/WASH-AISLE` x[-5.65, -3.55] z[5, 8.5], clear 2.1 m; `B03/F1/STORE-AISLE` x[-5.6, -3.4] z[-8.5, -5.95], clear 2.2 m; `B03/F1/WC-TURN` x[-6.2, -4.7] z[-3.45, -1.95], clear 1.5 m.

The exact coordinate, size, yaw, material, collision, purpose and prefab ID for every fixture on these floors is in the JSON building record.

## B04 · 学生宿舍

Six-floor, 47-bed student residence conceived as a warm lived-in home: upholstered blue headwalls, facade-aligned curtained windows in every upper twin room, layered bedside lighting, rugs and pinboards; a genuine single-resident accessible ground-floor room with a 1.50 m turn and 0.90 m bed-transfer, desk and wardrobe approaches; a timber-and-plant arrival lobby; continuous acoustic corridor runners and floor-color bands; properly furnished lounges, parcel room, washrooms, lift lobbies and top-floor laundry/study club. Life safety and access take precedence over the former 60-bed target: the south-east twin bay is now a full-height, 1.08 m protected dog-leg stair, giving every level two independent 60-minute stairs whose anchors are 15.31 m apart.

Exterior footprint: `x[30,43] z[-9,7]`. Local envelope: `x[-6.5, 6.5] z[-8, 8]`. Transform: `36.5 + localX`, `-1 + localZ`.

### Portals

| Portal | Campus anchor | Campus return | Local spawn | Place key |
| --- | --- | --- | --- | --- |
| B04/PUBLIC | [30,-2] | [27.4,-2,1.5707963267948966] | [-5.2,0,-1,1.5707963267948966] | campus_dorm_f1 |

### Floor and room schedule

#### Floor 1 · elevation 0 m · 125 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B04/F1/A01 | 101无障碍宿舍 | x[-6.1, -1.2] z[-7.6, -3.9] | dorm | 19 | east [-1.2,0,-5.75] w1 → B04/F1/CORRIDOR |
| B04/F1/LOBBY | 门厅与值班台 | x[-6.1, -1.2] z[-3.7, 0] | public | 14 | east [-1.2,0,-1.85] w1.2 → B04/F1/CORRIDOR |
| B04/F1/MAIL | 邮件与管理员室 | x[1.2, 6.1] z[-3.7, 0] | office | 10 | west [1.2,0,-1.85] w1.2 → B04/F1/CORRIDOR |
| B04/F1/LOUNGE-W | 公共客厅 | x[-6.1, -1.2] z[0.2, 3.9] | dorm | 8 | east [-1.2,0,2.05] w1.2 → B04/F1/CORRIDOR |
| B04/F1/LOUNGE-E | 自习室 | x[1.2, 6.1] z[0.2, 3.9] | dorm | 15 | west [1.2,0,2.05] w1.2 → B04/F1/CORRIDOR |
| B04/F1/STAIR | 楼梯 | x[-6.1, -3.25] z[4.2, 7.6] | service | 5 | east [-3.25,0,4.75] w1 → B04/F1/LIFT |
| B04/F1/LIFT | 电梯 | x[-3.05, -1.2] z[4.2, 7.6] | service | 4 | west [-3.05,0,4.75] w1 → B04/F1/STAIR<br>east [-1.2,0,4.75] w1 → B04/F1/CORRIDOR |
| B04/F1/WASH | 无障碍盥洗与淋浴室 | x[1.2, 6.1] z[4.2, 7.6] | service | 14 | west [1.2,0,5] w1 → B04/F1/CORRIDOR |
| B04/F1/STAIR-SE | 东南侧安全楼梯 | x[1.2, 6.1] z[-7.6, -3.9] | service | 6 | west [1.2,0,-4.4] w0.9 → B04/F1/CORRIDOR |

Circulation: `B04/F1/CORRIDOR` x[-1, 1] z[-7.6, 7.6], clear 2 m; `B04/F1/ENTRY` x[-6.5, -1] z[-2.3, 0.3], clear 2.6 m.

#### Floor 2 · elevation 3 m · 282 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B04/F2/201 | 201双人宿舍 | x[-6.1, -1.2] z[-7.6, -3.9] | dorm | 44 | east [-1.2,3,-5.75] w0.92 → B04/F2/CORRIDOR |
| B04/F2/202 | 202双人宿舍 | x[-6.1, -1.2] z[-3.7, 0] | dorm | 44 | east [-1.2,3,-1.85] w0.92 → B04/F2/CORRIDOR |
| B04/F2/203 | 203双人宿舍 | x[-6.1, -1.2] z[0.2, 3.9] | dorm | 44 | east [-1.2,3,2.05] w0.92 → B04/F2/CORRIDOR |
| B04/F2/205 | 205双人宿舍 | x[1.2, 6.1] z[-3.7, 0] | dorm | 44 | west [1.2,3,-1.85] w0.92 → B04/F2/CORRIDOR |
| B04/F2/206 | 206双人宿舍 | x[1.2, 6.1] z[0.2, 3.9] | dorm | 44 | west [1.2,3,2.05] w0.92 → B04/F2/CORRIDOR |
| B04/F2/STAIR | 楼梯 | x[-6.1, -3.25] z[4.2, 7.6] | service | 5 | east [-3.25,3,4.75] w1 → B04/F2/LIFT |
| B04/F2/LIFT | 电梯 | x[-3.05, -1.2] z[4.2, 7.6] | service | 4 | west [-3.05,3,4.75] w1 → B04/F2/STAIR<br>east [-1.2,3,4.75] w1 → B04/F2/CORRIDOR |
| B04/F2/WASH | 公共盥洗室 | x[1.2, 6.1] z[4.2, 7.6] | service | 15 | west [1.2,3,5] w1 → B04/F2/CORRIDOR |
| B04/F2/STAIR-SE | 东南侧安全楼梯 | x[1.2, 6.1] z[-7.6, -3.9] | service | 6 | west [1.2,3,-4.4] w0.9 → B04/F2/CORRIDOR |

Circulation: `B04/F2/CORRIDOR` x[-1, 1] z[-7.6, 7.6], clear 2 m.

#### Floor 3 · elevation 6 m · 284 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B04/F3/301 | 301双人宿舍 | x[-6.1, -1.2] z[-7.6, -3.9] | dorm | 44 | east [-1.2,6,-5.75] w0.92 → B04/F3/CORRIDOR |
| B04/F3/302 | 302双人宿舍 | x[-6.1, -1.2] z[-3.7, 0] | dorm | 44 | east [-1.2,6,-1.85] w0.92 → B04/F3/CORRIDOR |
| B04/F3/303 | 303双人宿舍 | x[-6.1, -1.2] z[0.2, 3.9] | dorm | 44 | east [-1.2,6,2.05] w0.92 → B04/F3/CORRIDOR |
| B04/F3/305 | 305双人宿舍 | x[1.2, 6.1] z[-3.7, 0] | dorm | 44 | west [1.2,6,-1.85] w0.92 → B04/F3/CORRIDOR |
| B04/F3/306 | 306双人宿舍 | x[1.2, 6.1] z[0.2, 3.9] | dorm | 44 | west [1.2,6,2.05] w0.92 → B04/F3/CORRIDOR |
| B04/F3/STAIR | 楼梯 | x[-6.1, -3.25] z[4.2, 7.6] | service | 5 | east [-3.25,6,4.75] w1 → B04/F3/LIFT |
| B04/F3/LIFT | 电梯 | x[-3.05, -1.2] z[4.2, 7.6] | service | 4 | west [-3.05,6,4.75] w1 → B04/F3/STAIR<br>east [-1.2,6,4.75] w1 → B04/F3/CORRIDOR |
| B04/F3/WASH | 公共盥洗室 | x[1.2, 6.1] z[4.2, 7.6] | service | 15 | west [1.2,6,5] w1 → B04/F3/CORRIDOR |
| B04/F3/STAIR-SE | 东南侧安全楼梯 | x[1.2, 6.1] z[-7.6, -3.9] | service | 6 | west [1.2,6,-4.4] w0.9 → B04/F3/CORRIDOR |

Circulation: `B04/F3/CORRIDOR` x[-1, 1] z[-7.6, 7.6], clear 2 m.

#### Floor 4 · elevation 9 m · 286 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B04/F4/401 | 401双人宿舍 | x[-6.1, -1.2] z[-7.6, -3.9] | dorm | 44 | east [-1.2,9,-5.75] w0.92 → B04/F4/CORRIDOR |
| B04/F4/402 | 402双人宿舍 | x[-6.1, -1.2] z[-3.7, 0] | dorm | 44 | east [-1.2,9,-1.85] w0.92 → B04/F4/CORRIDOR |
| B04/F4/403 | 403双人宿舍 | x[-6.1, -1.2] z[0.2, 3.9] | dorm | 44 | east [-1.2,9,2.05] w0.92 → B04/F4/CORRIDOR |
| B04/F4/405 | 405双人宿舍 | x[1.2, 6.1] z[-3.7, 0] | dorm | 44 | west [1.2,9,-1.85] w0.92 → B04/F4/CORRIDOR |
| B04/F4/406 | 406双人宿舍 | x[1.2, 6.1] z[0.2, 3.9] | dorm | 44 | west [1.2,9,2.05] w0.92 → B04/F4/CORRIDOR |
| B04/F4/STAIR | 楼梯 | x[-6.1, -3.25] z[4.2, 7.6] | service | 5 | east [-3.25,9,4.75] w1 → B04/F4/LIFT |
| B04/F4/LIFT | 电梯 | x[-3.05, -1.2] z[4.2, 7.6] | service | 4 | west [-3.05,9,4.75] w1 → B04/F4/STAIR<br>east [-1.2,9,4.75] w1 → B04/F4/CORRIDOR |
| B04/F4/WASH | 公共盥洗室 | x[1.2, 6.1] z[4.2, 7.6] | service | 15 | west [1.2,9,5] w1 → B04/F4/CORRIDOR |
| B04/F4/STAIR-SE | 东南侧安全楼梯 | x[1.2, 6.1] z[-7.6, -3.9] | service | 6 | west [1.2,9,-4.4] w0.9 → B04/F4/CORRIDOR |

Circulation: `B04/F4/CORRIDOR` x[-1, 1] z[-7.6, 7.6], clear 2 m.

#### Floor 5 · elevation 12 m · 283 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B04/F5/501 | 501双人宿舍 | x[-6.1, -1.2] z[-7.6, -3.9] | dorm | 44 | east [-1.2,12,-5.75] w0.92 → B04/F5/CORRIDOR |
| B04/F5/502 | 502双人宿舍 | x[-6.1, -1.2] z[-3.7, 0] | dorm | 44 | east [-1.2,12,-1.85] w0.92 → B04/F5/CORRIDOR |
| B04/F5/503 | 503双人宿舍 | x[-6.1, -1.2] z[0.2, 3.9] | dorm | 44 | east [-1.2,12,2.05] w0.92 → B04/F5/CORRIDOR |
| B04/F5/505 | 505双人宿舍 | x[1.2, 6.1] z[-3.7, 0] | dorm | 44 | west [1.2,12,-1.85] w0.92 → B04/F5/CORRIDOR |
| B04/F5/506 | 506双人宿舍 | x[1.2, 6.1] z[0.2, 3.9] | dorm | 44 | west [1.2,12,2.05] w0.92 → B04/F5/CORRIDOR |
| B04/F5/STAIR | 楼梯 | x[-6.1, -3.25] z[4.2, 7.6] | service | 5 | east [-3.25,12,4.75] w1 → B04/F5/LIFT |
| B04/F5/LIFT | 电梯 | x[-3.05, -1.2] z[4.2, 7.6] | service | 4 | west [-3.05,12,4.75] w1 → B04/F5/STAIR<br>east [-1.2,12,4.75] w1 → B04/F5/CORRIDOR |
| B04/F5/WASH | 公共盥洗室 | x[1.2, 6.1] z[4.2, 7.6] | service | 15 | west [1.2,12,5] w1 → B04/F5/CORRIDOR |
| B04/F5/STAIR-SE | 东南侧安全楼梯 | x[1.2, 6.1] z[-7.6, -3.9] | service | 6 | west [1.2,12,-4.4] w0.9 → B04/F5/CORRIDOR |

Circulation: `B04/F5/CORRIDOR` x[-1, 1] z[-7.6, 7.6], clear 2 m.

#### Floor 6 · elevation 15 m · 229 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B04/F6/601 | 601双人宿舍 | x[-6.1, -1.2] z[-7.6, -3.9] | dorm | 44 | east [-1.2,15,-5.75] w0.92 → B04/F6/CORRIDOR |
| B04/F6/602 | 602双人宿舍 | x[-6.1, -1.2] z[-3.7, 0] | dorm | 44 | east [-1.2,15,-1.85] w0.92 → B04/F6/CORRIDOR |
| B04/F6/604 | 604双人宿舍 | x[1.2, 6.1] z[-3.7, 0] | dorm | 44 | west [1.2,15,-1.85] w0.92 → B04/F6/CORRIDOR |
| B04/F6/LAUNDRY | 洗衣房 | x[-6.1, -1.2] z[0.2, 3.9] | service | 21 | east [-1.2,15,2.05] w1.2 → B04/F6/CORRIDOR |
| B04/F6/STUDY | 顶层自习室 | x[1.2, 6.1] z[0.2, 3.9] | dorm | 12 | west [1.2,15,2.05] w1.2 → B04/F6/CORRIDOR |
| B04/F6/STAIR | 楼梯 | x[-6.1, -3.25] z[4.2, 7.6] | service | 5 | east [-3.25,15,4.75] w1 → B04/F6/LIFT |
| B04/F6/LIFT | 电梯 | x[-3.05, -1.2] z[4.2, 7.6] | service | 4 | west [-3.05,15,4.75] w1 → B04/F6/STAIR<br>east [-1.2,15,4.75] w1 → B04/F6/CORRIDOR |
| B04/F6/WASH | 公共盥洗室 | x[1.2, 6.1] z[4.2, 7.6] | service | 15 | west [1.2,15,5] w1 → B04/F6/CORRIDOR |
| B04/F6/STAIR-SE | 东南侧安全楼梯 | x[1.2, 6.1] z[-7.6, -3.9] | service | 6 | west [1.2,15,-4.4] w0.9 → B04/F6/CORRIDOR |

Circulation: `B04/F6/CORRIDOR` x[-1, 1] z[-7.6, 7.6], clear 2 m.

The exact coordinate, size, yaw, material, collision, purpose and prefab ID for every fixture on these floors is in the JSON building record.

## B05 · 行政楼 · 国际学生中心

A measured four-floor civic university administration building planned from movement outward. Every public room has a 1.20 m route and every service or lift area has a clear 1.50 m turn; desk rows retain 0.90 m work aisles. Rounded composed oak desks, separately oriented chairs, real service counters, filing cabinets and meeting tables replace generic block grids. Deep-set framed windows, split acoustic ceiling rafts, coherent linear and pendant lighting, terrazzo thresholds, quiet vinyl, dark oak and restrained brass datums form a calm civic palette. Staff monitors, files, clocks, coat rails and a single ceremonial arrival wall add credible use without freestanding decorative clutter.

Exterior footprint: `x[-43,-29] z[24,36]`. Local envelope: `x[-7, 7] z[-6, 6]`. Transform: `-36 + localX`, `30 + localZ`.

### Portals

| Portal | Campus anchor | Campus return | Local spawn | Place key |
| --- | --- | --- | --- | --- |
| B05/PUBLIC | [-29,30] | [-26.6,30,-1.5707963267948966] | [5.6,0,0,-1.5707963267948966] | campus_admin_f1 |

### Required facade cuts

- **B05/EXIT-W:** Add a 1.20 m protected-stair discharge on west wall at campus (-43,26.55).
- **B05/EXIT-N:** Add a 1.20 m protected-stair discharge on north wall at campus (-30.7,36).

### Floor and room schedule

#### Floor 1 · elevation 0 m · 152 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B05/F1/A | 学生证与注册 | x[-4, 0.5] z[-5.6, -1.3] | b05-office | 25 | north [-1.75,0,-1.3] w1 → B05/F1/CORRIDOR |
| B05/F1/B | 入口门厅与总服务台 | x[0.7, 6.6] z[-5.6, -1.3] | b05-public | 34 | north [3.65,0,-1.3] w1 → B05/F1/CORRIDOR<br>east [7,0,0] w3.2 → campus |
| B05/F1/C | 国际学生咨询 | x[-4, 0.5] z[1.3, 5.6] | b05-office | 25 | south [-1.75,0,1.3] w1 → B05/F1/CORRIDOR |
| B05/F1/D | 等候与材料填写 | x[0.7, 3.8] z[1.3, 5.6] | b05-public | 22 | south [2.25,0,1.3] w1 → B05/F1/CORRIDOR |
| B05/F1/STAIR-W | 西侧安全楼梯 | x[-6.6, -4.3] z[-5.6, -1.3] | service | 6 | west [-7,0,-3.45] w1.2 → campus-service<br>north [-5.45,0,-1.3] w1.2 → B05/F1/CORRIDOR |
| B05/F1/LIFT-WC | 电梯与无障碍卫生间 | x[-6.6, -4.3] z[1.3, 5.6] | service | 10 | south [-5.45,0,1.3] w1.2 → B05/F1/CORRIDOR |
| B05/F1/STAIR-E | 东侧安全楼梯 | x[4, 6.6] z[1.3, 5.6] | service | 7 | south [5.3,0,1.3] w1.2 → B05/F1/CORRIDOR<br>north [5.3,0,6] w1.2 → campus-service |

Circulation: `B05/F1/CORRIDOR` x[-6.6, 6.6] z[-1.1, 1.1], clear 2.2 m.

#### Floor 2 · elevation 3.1 m · 174 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B05/F2/A | 财务处 | x[-4, 0.5] z[-5.6, -1.3] | b05-office | 29 | north [-1.75,3.1,-1.3] w1 → B05/F2/CORRIDOR |
| B05/F2/B | 人事处 | x[0.7, 6.6] z[-5.6, -1.3] | b05-office | 33 | north [3.65,3.1,-1.3] w1 → B05/F2/CORRIDOR |
| B05/F2/C | 教务处 | x[-4, 0.5] z[1.3, 5.6] | b05-office | 29 | south [-1.75,3.1,1.3] w1 → B05/F2/CORRIDOR |
| B05/F2/D | 档案室 | x[0.7, 3.8] z[1.3, 5.6] | b05-office | 28 | south [2.25,3.1,1.3] w1 → B05/F2/CORRIDOR |
| B05/F2/STAIR-W | 西侧安全楼梯 | x[-6.6, -4.3] z[-5.6, -1.3] | service | 6 | west [-7,3.1,-3.45] w1.2 → campus-service<br>north [-5.45,3.1,-1.3] w1.2 → B05/F2/CORRIDOR |
| B05/F2/LIFT-WC | 电梯与无障碍卫生间 | x[-6.6, -4.3] z[1.3, 5.6] | service | 10 | south [-5.45,3.1,1.3] w1.2 → B05/F2/CORRIDOR |
| B05/F2/STAIR-E | 东侧安全楼梯 | x[4, 6.6] z[1.3, 5.6] | service | 7 | south [5.3,3.1,1.3] w1.2 → B05/F2/CORRIDOR<br>north [5.3,3.1,6] w1.2 → campus-service |

Circulation: `B05/F2/CORRIDOR` x[-6.6, 6.6] z[-1.1, 1.1], clear 2.2 m.

#### Floor 3 · elevation 6.2 m · 158 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B05/F3/A | 培训室 | x[-4, 0.5] z[-5.6, -1.3] | b05-office | 25 | north [-1.75,6.2,-1.3] w1 → B05/F3/CORRIDOR |
| B05/F3/B | 综合行政办公室 | x[0.7, 6.6] z[-5.6, -1.3] | b05-office | 33 | north [3.65,6.2,-1.3] w1 → B05/F3/CORRIDOR |
| B05/F3/C | 院系联络办公室 | x[-4, 0.5] z[1.3, 5.6] | b05-office | 29 | south [-1.75,6.2,1.3] w1 → B05/F3/CORRIDOR |
| B05/F3/D | 国际项目会议室 | x[0.7, 3.8] z[1.3, 5.6] | b05-office | 21 | south [2.25,6.2,1.3] w1 → B05/F3/CORRIDOR |
| B05/F3/STAIR-W | 西侧安全楼梯 | x[-6.6, -4.3] z[-5.6, -1.3] | service | 6 | west [-7,6.2,-3.45] w1.2 → campus-service<br>north [-5.45,6.2,-1.3] w1.2 → B05/F3/CORRIDOR |
| B05/F3/LIFT-WC | 电梯与无障碍卫生间 | x[-6.6, -4.3] z[1.3, 5.6] | service | 10 | south [-5.45,6.2,1.3] w1.2 → B05/F3/CORRIDOR |
| B05/F3/STAIR-E | 东侧安全楼梯 | x[4, 6.6] z[1.3, 5.6] | service | 7 | south [5.3,6.2,1.3] w1.2 → B05/F3/CORRIDOR<br>north [5.3,6.2,6] w1.2 → campus-service |

Circulation: `B05/F3/CORRIDOR` x[-6.6, 6.6] z[-1.1, 1.1], clear 2.2 m.

#### Floor 4 · elevation 9.3 m · 153 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B05/F4/A | 校务会议室 | x[-4, 0.5] z[-5.6, -1.3] | b05-office | 23 | north [-1.75,9.3,-1.3] w1 → B05/F4/CORRIDOR |
| B05/F4/B | 校长与副校长办公室 | x[0.7, 6.6] z[-5.6, -1.3] | b05-office | 32 | north [3.65,9.3,-1.3] w1 → B05/F4/CORRIDOR |
| B05/F4/C | 校史与机要档案 | x[-4, 0.5] z[1.3, 5.6] | b05-office | 28 | south [-1.75,9.3,1.3] w1 → B05/F4/CORRIDOR |
| B05/F4/D | 宣传与翻译 | x[0.7, 3.8] z[1.3, 5.6] | b05-office | 20 | south [2.25,9.3,1.3] w1 → B05/F4/CORRIDOR |
| B05/F4/STAIR-W | 西侧安全楼梯 | x[-6.6, -4.3] z[-5.6, -1.3] | service | 6 | west [-7,9.3,-3.45] w1.2 → campus-service<br>north [-5.45,9.3,-1.3] w1.2 → B05/F4/CORRIDOR |
| B05/F4/LIFT-WC | 电梯与无障碍卫生间 | x[-6.6, -4.3] z[1.3, 5.6] | service | 10 | south [-5.45,9.3,1.3] w1.2 → B05/F4/CORRIDOR |
| B05/F4/STAIR-E | 东侧安全楼梯 | x[4, 6.6] z[1.3, 5.6] | service | 7 | south [5.3,9.3,1.3] w1.2 → B05/F4/CORRIDOR<br>north [5.3,9.3,6] w1.2 → campus-service |

Circulation: `B05/F4/CORRIDOR` x[-6.6, 6.6] z[-1.1, 1.1], clear 2.2 m.

The exact coordinate, size, yaw, material, collision, purpose and prefab ID for every fixture on these floors is in the JSON building record.

## B06 · 科学与创新楼（实验楼）

A visibly layered four-floor science building: a fixed glazed prototype niche and composed reception establish the showcase lobby; wet teaching and clean/dirty preparation zones lead to distinct analytical, organic and foundation chemistry laboratories with visible roof-riser extraction headers; biology, microbiology and controlled-light microscopy suites sit below physics, robotics/maker, AI and glazed research spaces. Deep facade-aligned laboratory windows, washable wall datums, color-coded service trunks, ribbed sealed ceiling fields, high-CRI work lights, protected-core luminaires, observation glazing, PPE thresholds, plants and bilingual programme signs form one coherent technical architecture without filler blocks.

Exterior footprint: `x[-43,-28] z[40,62]`. Local envelope: `x[-7.5, 7.5] z[-11, 11]`. Transform: `-35.5 + localX`, `51 + localZ`.

### Portals

| Portal | Campus anchor | Campus return | Local spawn | Place key |
| --- | --- | --- | --- | --- |
| B06/PUBLIC | [-28,50] | [-25.5,50,-1.5707963267948966] | [6,0,-1,-1.5707963267948966] | campus_science_f1 |

### Required facade cuts

- **B06/EXIT-SW:** Add a 1.20 m protected-stair discharge on west wall at campus (-43,42.55).

### Floor and room schedule

#### Floor 1 · elevation 0 m · 152 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B06/F1/WS | 普通教学实验室 | x[-7.1, -1.1] z[-6.1, -0.2] | lab | 23 | east [-1.1,0,-3.15] w1.5 → B06/F1/CORRIDOR<br>south [-6.5,0,-6.1] w1.2 → B06/F1/STAIR-SW |
| B06/F1/WN | 准备、收货与安全储藏 | x[-7.1, -1.1] z[0.2, 10.6] | lab | 31 | east [-1.1,0,5.4] w1 → B06/F1/CORRIDOR |
| B06/F1/ES | 安全培训与展示 | x[1.1, 7.1] z[-10.6, -2.2] | classroom | 23 | west [1.1,0,-6.4] w1 → B06/F1/CORRIDOR |
| B06/F1/EM | 门厅与门禁 | x[1.1, 7.1] z[0.2, 4.5] | public | 21 | west [1.1,0,2.35] w1 → B06/F1/CORRIDOR<br>east [7.5,0,-1] w3.2 → campus |
| B06/F1/STAIR-SW | 西南安全楼梯 | x[-7.1, -4.4] z[-10.6, -6.3] | service | 7 | west [-7.5,0,-8.45] w1.2 → campus-service<br>north [-6.5,0,-6.3] w1.2 → B06/F1/WS |
| B06/F1/CORE-NE | 玻璃楼梯 · 电梯 · 卫生间 | x[1.1, 7.1] z[4.7, 10.6] | service | 24 | west [1.1,0,5.7] w1.2 → B06/F1/CORRIDOR |

Circulation: `B06/F1/CORRIDOR` x[-0.9, 0.9] z[-10.6, 10.6], clear 1.8 m; `B06/F1/ENTRY` x[0.9, 7.5] z[-2, 0.1], clear 2.1 m.

#### Floor 2 · elevation 3.65 m · 202 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B06/F2/WS | 分析化学实验室 | x[-7.1, -1.1] z[-6.1, -0.2] | lab | 36 | east [-1.1,3.65,-3.15] w1.5 → B06/F2/CORRIDOR<br>south [-6.5,3.65,-6.1] w1.2 → B06/F2/STAIR-SW |
| B06/F2/WN | 有机化学教学实验室 | x[-7.1, -1.1] z[0.2, 10.6] | lab | 53 | east [-1.1,3.65,5.4] w1.5 → B06/F2/CORRIDOR |
| B06/F2/ES | 基础化学实验室 | x[1.1, 7.1] z[-10.6, -2.2] | lab | 30 | west [1.1,3.65,-6.4] w1.5 → B06/F2/CORRIDOR |
| B06/F2/EM | 化学品分类储藏 | x[1.1, 7.1] z[0.2, 4.5] | lab | 18 | west [1.1,3.65,2.35] w1 → B06/F2/CORRIDOR |
| B06/F2/STAIR-SW | 西南安全楼梯 | x[-7.1, -4.4] z[-10.6, -6.3] | service | 7 | west [-7.5,3.65,-8.45] w1.2 → campus-service<br>north [-6.5,3.65,-6.3] w1.2 → B06/F2/WS |
| B06/F2/CORE-NE | 玻璃楼梯 · 电梯 · 卫生间 | x[1.1, 7.1] z[4.7, 10.6] | service | 24 | west [1.1,3.65,5.7] w1.2 → B06/F2/CORRIDOR |

Circulation: `B06/F2/CORRIDOR` x[-0.9, 0.9] z[-10.6, 10.6], clear 1.8 m; `B06/F2/ENTRY` x[0.9, 7.5] z[-2, 0.1], clear 2.1 m.

#### Floor 3 · elevation 7.3 m · 167 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B06/F3/WS | 生物教学实验室 | x[-7.1, -1.1] z[-6.1, -0.2] | lab | 24 | east [-1.1,7.3,-3.15] w1.5 → B06/F3/CORRIDOR<br>south [-6.5,7.3,-6.1] w1.2 → B06/F3/STAIR-SW |
| B06/F3/WN | 显微镜与细胞实验室 | x[-7.1, -1.1] z[0.2, 10.6] | lab | 29 | east [-1.1,7.3,5.4] w1 → B06/F3/CORRIDOR |
| B06/F3/ES | 微生物实验室 | x[1.1, 7.1] z[-10.6, -2.2] | lab | 34 | west [1.1,7.3,-6.4] w1.5 → B06/F3/CORRIDOR |
| B06/F3/EM | 冷藏与样品室 | x[1.1, 7.1] z[0.2, 4.5] | lab | 17 | west [1.1,7.3,2.35] w1 → B06/F3/CORRIDOR |
| B06/F3/STAIR-SW | 西南安全楼梯 | x[-7.1, -4.4] z[-10.6, -6.3] | service | 7 | west [-7.5,7.3,-8.45] w1.2 → campus-service<br>north [-6.5,7.3,-6.3] w1.2 → B06/F3/WS |
| B06/F3/CORE-NE | 玻璃楼梯 · 电梯 · 卫生间 | x[1.1, 7.1] z[4.7, 10.6] | service | 24 | west [1.1,7.3,5.7] w1.2 → B06/F3/CORRIDOR |

Circulation: `B06/F3/CORRIDOR` x[-0.9, 0.9] z[-10.6, 10.6], clear 1.8 m; `B06/F3/ENTRY` x[0.9, 7.5] z[-2, 0.1], clear 2.1 m.

#### Floor 4 · elevation 10.95 m · 169 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B06/F4/WS | 物理与电子实验室 | x[-7.1, -1.1] z[-6.1, -0.2] | lab | 23 | east [-1.1,10.95,-3.15] w1 → B06/F4/CORRIDOR<br>south [-6.5,10.95,-6.1] w1.2 → B06/F4/STAIR-SW |
| B06/F4/WN | 机器人与制作实验室 | x[-7.1, -1.1] z[0.2, 10.6] | lab | 35 | east [-1.1,10.95,5.4] w1 → B06/F4/CORRIDOR |
| B06/F4/ES | 数据与人工智能实验室 | x[1.1, 7.1] z[-10.6, -2.2] | classroom | 27 | west [1.1,10.95,-6.4] w1 → B06/F4/CORRIDOR |
| B06/F4/EM | 研究办公室与项目评审 | x[1.1, 7.1] z[0.2, 4.5] | classroom | 18 | west [1.1,10.95,2.35] w1 → B06/F4/CORRIDOR |
| B06/F4/STAIR-SW | 西南安全楼梯 | x[-7.1, -4.4] z[-10.6, -6.3] | service | 7 | west [-7.5,10.95,-8.45] w1.2 → campus-service<br>north [-6.5,10.95,-6.3] w1.2 → B06/F4/WS |
| B06/F4/CORE-NE | 玻璃楼梯 · 电梯 · 卫生间 | x[1.1, 7.1] z[4.7, 10.6] | service | 24 | west [1.1,10.95,5.7] w1.2 → B06/F4/CORRIDOR |

Circulation: `B06/F4/CORRIDOR` x[-0.9, 0.9] z[-10.6, 10.6], clear 1.8 m; `B06/F4/ENTRY` x[0.9, 7.5] z[-2, 0.1], clear 2.1 m.

The exact coordinate, size, yaw, material, collision, purpose and prefab ID for every fixture on these floors is in the JSON building record.

## B07 · 学生活动中心 · 校医院

A measured split-use student and health hub with two unmistakable but compatible identities. Warm 3000–3400 K pendants, oak, brick, blue textile, live club schedules, visible project work, correctly segmented safety mirrors and barres, floor formation marks, studio-care details and composed media/rehearsal equipment animate the south student-centre rooms. North of the protected threshold, pale green ceilings, clinical laminate, hand-hygiene stations, privacy glazing, sound masking, acoustic confidentiality layers, dimmable counselling light, a grouped health-demonstration screen/CPR/AED wall and calm bilingual wayfinding create a quieter health setting. Interior glazing now follows the exact ground and upper exterior window rhythm, with frosted lower layers only where privacy requires them. Both identities meet only at a protected, self-closing core threshold; the two external arrivals, north and south stairs, accessible lift and colour-coded routes remain legible on every floor.

Exterior footprint: `x[30,43] z[23,34]`. Local envelope: `x[-6.5, 6.5] z[-5.5, 5.5]`. Transform: `36.5 + localX`, `28.5 + localZ`.

### Portals

| Portal | Campus anchor | Campus return | Local spawn | Place key |
| --- | --- | --- | --- | --- |
| B07/STUDENT | [30,27] | [27.4,27,1.5707963267948966] | [-5.2,0,-1.5,1.5707963267948966] | campus_student_f1 |
| B07/CLINIC | [30,31] | [27.4,31,1.5707963267948966] | [-5.2,0,2.5,1.5707963267948966] | campus_clinic_f1 |

### Floor and room schedule

#### Floor 1 · elevation 0 m · 149 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B07/F1/SC-LOBBY | 学生活动中心门厅 | x[-6.1, -2] z[-3.05, -0.75] | public | 10 | west [-6.5,0,-1.5] w2.2 → campus<br>north [-2.65,0,-0.75] w1.2 → B07/F1/DUAL-COR<br>south [-2.65,0,-3.05] w1 → B07/F1/SC-COMMONS |
| B07/F1/SC-COMMONS | 社团公共区 | x[-6.1, -0.8] z[-5.1, -3.25] | activity | 12 | north [-2.65,0,-3.25] w1 → B07/F1/SC-LOBBY |
| B07/F1/SC-OFFICE | 学生会办公室 | x[-1.8, 1.6] z[-3.05, -0.75] | office | 10 | north [0.7,0,-0.75] w1 → B07/F1/DUAL-COR |
| B07/F1/SC-MULTI | 多功能活动室 | x[1.8, 3.6] z[-5.1, -0.75] | activity | 16 | north [2.7,0,-0.75] w1.2 → B07/F1/DUAL-COR |
| B07/F1/CL-WAIT | 校医院候诊 | x[-6.1, -2.2] z[0.75, 5.1] | clinic | 31 | west [-6.5,0,2.5] w2.2 → campus<br>south [-2.8,0,0.75] w1.2 → B07/F1/DUAL-COR<br>east [-2.2,0,3.8] w1.1 → B07/F1/CL-TREAT |
| B07/F1/CL-EXAM | 校医诊室 | x[-2, 1.55] z[0.75, 2.55] | clinic | 11 | south [-0.3,0,0.75] w1 → B07/F1/DUAL-COR |
| B07/F1/CL-TREAT | 治疗与观察 | x[-2, 1.55] z[2.75, 5.1] | clinic | 11 | west [-2,0,3.8] w1.1 → B07/F1/CL-WAIT |
| B07/F1/CL-PHARM | 校内药房 | x[1.75, 3.6] z[0.75, 5.1] | clinic | 10 | south [2.65,0,0.75] w1.2 → B07/F1/DUAL-COR |
| B07/F1/STAIR-S | 南安全楼梯 | x[3.8, 6.1] z[-5.1, -2.6] | service | 6 | north [4.95,0,-2.6] w1.2 → B07/F1/LIFT |
| B07/F1/LIFT | 电梯与防火前室 | x[3.8, 6.1] z[-2.4, 0.8] | service | 5 | west [3.8,0,-0.65] w1.2 → B07/F1/DUAL-COR<br>south [4.95,0,-2.4] w1.2 → B07/F1/STAIR-S<br>north [4.95,0,0.8] w1.2 → B07/F1/STAIR-N |
| B07/F1/STAIR-N | 北安全楼梯 | x[3.8, 6.1] z[1, 5.1] | service | 7 | south [4.95,0,1] w1.2 → B07/F1/LIFT |

Circulation: `B07/F1/DUAL-COR` x[-6.1, 3.8] z[-0.65, 0.65], clear 1.3 m; `B07/F1/LIFT/ACCESS-ROUTE` x[2.4, 3.8] z[-1, -0.1], clear 0.9 m.

#### Floor 2 · elevation 3 m · 135 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B07/F2/DANCE | 舞蹈与排练室 | x[-6.1, 3.6] z[-5.1, -1.1] | activity | 35 | north [-3.2,3,-1.1] w1.2 → B07/F2/DUAL-COR<br>north [2.7,3,-1.1] w1.2 → B07/F2/DUAL-COR |
| B07/F2/SC-WC | 活动中心无障碍卫生间 | x[-6.1, -3.8] z[-0.9, 0.8] | service | 11 | east [-3.8,3,0] w1 → B07/F2/DUAL-COR |
| B07/F2/COUNSEL1 | 心理咨询一 | x[-6.1, -3.2] z[1.1, 5.1] | clinic | 16 | east [-3.2,3,1.72] w1 → B07/F2/COUNSEL-SUITE |
| B07/F2/COUNSEL2 | 心理咨询二与私密前室 | x[-3, -0.1] z[1.1, 5.1] | clinic | 16 | south [-0.7,3,1.1] w1 → B07/F2/COUNSEL-SUITE<br>west [-3,3,1.72] w1 → B07/F2/COUNSEL1 |
| B07/F2/OBSERVE | 治疗观察室 | x[0.1, 3.6] z[1.1, 5.1] | clinic | 15 | south [1.85,3,1.1] w1.2 → B07/F2/DUAL-COR |
| B07/F2/STAIR-S | 南安全楼梯 | x[3.8, 6.1] z[-5.1, -2.6] | service | 8 | north [4.95,3,-2.6] w1.2 → B07/F2/LIFT |
| B07/F2/LIFT | 电梯与防火前室 | x[3.8, 6.1] z[-2.4, 0.8] | service | 6 | west [3.8,3,-0.65] w1.2 → B07/F2/DUAL-COR<br>south [4.95,3,-2.4] w1.2 → B07/F2/STAIR-S<br>north [4.95,3,0.8] w1.2 → B07/F2/STAIR-N |
| B07/F2/STAIR-N | 北安全楼梯 | x[3.8, 6.1] z[1, 5.1] | service | 9 | south [4.95,3,1] w1.2 → B07/F2/LIFT |

Circulation: `B07/F2/DUAL-COR` x[-3.8, 3.8] z[-1, 1], clear 2 m; `B07/F2/COUNSEL-SUITE` x[-3, -0.1] z[1.1, 2.3], clear 1.2 m; `B07/F2/LIFT/ACCESS-ROUTE` x[2.4, 3.8] z[-1, -0.1], clear 0.9 m.

#### Floor 3 · elevation 6 m · 131 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B07/F3/MEDIA | 学生媒体室 | x[-6.1, -1.4] z[-5.1, -1.1] | activity | 21 | north [-2.1,6,-1.1] w1.2 → B07/F3/DUAL-COR |
| B07/F3/PROJECT | 社团项目室 | x[-1.2, 3.6] z[-5.1, -1.1] | activity | 21 | north [2.7,6,-1.1] w1.2 → B07/F3/DUAL-COR |
| B07/F3/HEALTH | 健康教育室 | x[-6.1, -0.8] z[1.1, 5.1] | clinic | 23 | south [-1.55,6,1.1] w1.2 → B07/F3/DUAL-COR |
| B07/F3/ADMIN | 校医院办公室 | x[-0.6, 1.7] z[1.1, 5.1] | office | 12 | south [0.55,6,1.1] w1 → B07/F3/DUAL-COR |
| B07/F3/STAFF | 医务人员休息与储藏 | x[1.9, 3.6] z[1.1, 5.1] | clinic | 11 | south [2.75,6,1.1] w1 → B07/F3/DUAL-COR |
| B07/F3/STAIR-S | 南安全楼梯 | x[3.8, 6.1] z[-5.1, -2.6] | service | 8 | north [4.95,6,-2.6] w1.2 → B07/F3/LIFT |
| B07/F3/LIFT | 电梯与防火前室 | x[3.8, 6.1] z[-2.4, 0.8] | service | 6 | west [3.8,6,-0.65] w1.2 → B07/F3/DUAL-COR<br>south [4.95,6,-2.4] w1.2 → B07/F3/STAIR-S<br>north [4.95,6,0.8] w1.2 → B07/F3/STAIR-N |
| B07/F3/STAIR-N | 北安全楼梯 | x[3.8, 6.1] z[1, 5.1] | service | 9 | south [4.95,6,1] w1.2 → B07/F3/LIFT |

Circulation: `B07/F3/DUAL-COR` x[-3.8, 3.8] z[-1, 1], clear 2 m; `B07/F3/LIFT/ACCESS-ROUTE` x[2.4, 3.8] z[-1, -0.1], clear 0.9 m.

The exact coordinate, size, yaw, material, collision, purpose and prefab ID for every fixture on these floors is in the JSON building record.

## B08 · 门卫 · 访客室

A compact 24-hour security pavilion with an exterior-only visitor transaction and a separate controlled staff entrance. The preserved west window aligns exactly with a shallow composed service counter, protected pass ledge and guard-controlled badge cabinet; visitors never enter the secure workroom. The fully revealed south window has an aligned interior glazing assembly, sill, head and jambs, while the command feature moves to the solid north wall. The detailed four-screen console retains the exterior desk silhouette and its north-facing chair directly addresses both desk monitors and the command display without blocking daylight. Clear glazed sidelights preserve views to the staff vestibule. Woven acoustic reveals flank the live surveillance wall, while perimeter bays keep parcels, uniforms, first aid and drinks away from displays. The compact WC uses a pocket door, side-wall toilet and correctly paired south-wall basin and mirror. Oak wall cladding, blue/sage/sand textiles, dark steel, brass and a real acoustic ceiling form one disciplined material system.

Exterior footprint: `x[6.4,12.4] z[-12.4,-7]`. Local envelope: `x[-3, 3] z[-2.7, 2.7]`. Transform: `9.4 + localX`, `-9.7 + localZ`.

### Portals

| Portal | Campus anchor | Campus return | Local spawn | Place key |
| --- | --- | --- | --- | --- |
| B08/STAFF | [11.2,-7] | [11.2,-5.8,3.141592653589793] | [1.8,0,1.65,3.141592653589793] | campus_security |

### Required facade cuts

- **B08/DOOR-N:** Add a 0.95 m north-facing staff door centred at campus (11.2,-7.0); preserve the west service window at (6.4,-9.5).

### Floor and room schedule

#### Floor 1 · elevation 0 m · 49 fixture instances

| Room ID | Label | Exact clear bounds | Finish | Fixtures | Doors |
| --- | --- | --- | --- | --- | --- |
| B08/F1/WORK | 门卫值班室 | x[-2.82, 1.15] z[-2.4, 2.4] | security | 25 | east [1.15,0,1.55] w1.2 → B08/F1/CLEAR |
| B08/F1/WC | 值班卫生间 | x[1.35, 2.7] z[-2.4, -0.25] | service | 6 | north [2.05,0,-0.25] w0.9 → B08/F1/ENTRY |
| B08/F1/ENTRY | 员工入口与储物 | x[1.35, 2.7] z[-0.05, 2.4] | security | 7 | north [1.8,0,2.7] w0.95 → campus<br>west [1.35,0,1.55] w1.2 → B08/F1/CLEAR<br>south [2.05,0,-0.05] w0.9 → B08/F1/WC |

Circulation: `B08/F1/CLEAR` x[0.7, 1.65] z[-0.1, 2.4], clear 0.95 m.

The exact coordinate, size, yaw, material, collision, purpose and prefab ID for every fixture on these floors is in the JSON building record.

## 13. Material and finish schedule

| ID | Label | Colour | Texture | Gloss |
| --- | --- | --- | --- | --- |
| M-TERRAZZO | warm grey terrazzo | #b9b4aa | terrazzo | 0.16 |
| M-TILE-LIGHT | light porcelain tile | #d7d2c8 | tile | 0.18 |
| M-TILE-DARK | charcoal anti-slip tile | #666b6e | tile | 0.12 |
| M-VINYL | quiet warm-grey resilient floor | #aaa69d | none | 0.08 |
| M-OAK | sealed oak | #8b6847 | wood | 0.22 |
| M-OAK-DARK | dark stained oak | #5d4530 | wood | 0.2 |
| M-RUBBER | sports/acoustic rubber | #59636a | none | 0.06 |
| M-EPOXY | pale laboratory epoxy | #b7c1bf | none | 0.2 |
| M-KITCHEN-EPOXY | red-brown non-slip kitchen epoxy | #8c6254 | none | 0.1 |
| M-WALL-WARM | warm washable plaster | #ddd6c9 | plaster | 0.08 |
| M-WALL-WHITE | cool washable plaster | #dedfdb | plaster | 0.08 |
| M-WALL-GREEN | clinic pale green wall | #c9d8cd | plaster | 0.08 |
| M-BRICK | interior red brick accent | #9b5546 | brick | 0.08 |
| M-ACOUSTIC | perforated acoustic panel | #c9c1b4 | none | 0.06 |
| M-GLASS | laminated safety glass | #91adb7 | glass | 0.82 |
| M-STEEL | powder-coated steel | #7f898f | steel | 0.55 |
| M-STEEL-DARK | dark steel | #41494f | steel | 0.48 |
| M-BRASS | satin brass | #b08a4a | metal | 0.46 |
| M-STAINLESS | food/clinical stainless steel | #b8c0c3 | steel | 0.66 |
| M-WOOD-DESK | beech classroom furniture | #bc9168 | wood | 0.2 |
| M-BOARD-GREEN | green chalkboard | #2f5d4a | none | 0.06 |
| M-WHITEBOARD | white enamel board | #ecece7 | none | 0.28 |
| M-SCREEN | lit information screen | #3d6f91 | none | 0.2 |
| M-FABRIC-BLUE | blue upholstery | #476887 | fabric | 0.04 |
| M-FABRIC-RED | muted red upholstery | #8c4e43 | fabric | 0.04 |
| M-FABRIC-SAND | sand woven textile | #c7b49b | fabric | 0.035 |
| M-FABRIC-SAGE | sage woven textile | #789083 | fabric | 0.035 |
| M-CLINIC | white clinical laminate | #e5ece8 | none | 0.32 |
| M-CERAMIC | white sanitary ceramic | #edf0eb | none | 0.4 |
| M-LAB-BLUE | laboratory cabinet blue | #577484 | none | 0.22 |
| M-SAFETY-YELLOW | safety yellow | #d6ad36 | none | 0.18 |
| M-SAFETY-RED | fire-safety red | #a83b30 | none | 0.2 |
| M-PLANT | interior foliage | #4f7440 | foliage | 0.08 |

## 14. Prefab schedule

Prefab anchors are part of the coordinate contract. Each instance in JSON supplies an exact anchor, size, yaw and material; the design below defines its component parts.

| ID | Label | Default size | Anchor | Review facing | Component design |
| --- | --- | --- | --- | --- | --- |
| PF-WALL-RUN | architectural-layer | 1 × 0.12 × 1 | centre | omnidirectional | Panelized architectural assembly; floors receive recessed borders, ceiling rafts separated baffles, glazing frames and mullions, and vertical panels shadow joints or fabric pleats. Full dimensions come from the instance size. |
| PF-DOOR-SINGLE | door-single | 0.98 × 2.12 × 0.08 | threshold | local-negative-z | Painted leaf, frame, lever, vision panel and swing metadata. |
| PF-DOOR-DOUBLE | door-double | 1.8 × 2.22 × 0.1 | threshold | local-negative-z | Two glazed leaves, frame, pull rails and clear-opening metadata. |
| PF-EXIT-SIGN | exit-sign | 0.48 × 0.22 × 0.06 | face-centre | local-negative-z | Green bilingual EXIT/出口 face with low emissive glow. |
| PF-ROOM-SIGN | room-sign | 0.46 × 0.24 × 0.04 | face-centre | local-negative-z | Blue bilingual room plate; instance supplies text. |
| PF-DIRECTORY | directory-screen | 1.2 × 1.7 × 0.1 | floor | local-negative-z | Freestanding or wall directory with floor map and accessible route. |
| PF-CEILING-LIGHT | ceiling-panel | 1.2 × 0.06 × 0.28 | ceiling-centre | omnidirectional | LED panel, diffuser and real point-light anchors. |
| PF-PENDANT | pendant-light | 0.42 × 0.3 × 0.42 | ceiling-centre | omnidirectional | Shade, warm emitter and suspension stem. |
| PF-EMERGENCY-LIGHT | emergency-light | 0.32 × 0.12 × 0.1 | face-centre | local-negative-z | Battery emergency luminaire. |
| PF-ALARM | fire-alarm | 0.16 × 0.24 × 0.08 | face-centre | local-negative-z | Manual call point and audible beacon. |
| PF-EXTINGUISHER | extinguisher-cabinet | 0.42 × 0.72 × 0.18 | floor | local-negative-z | Recessed red cabinet, extinguisher bottle and label. |
| PF-AED | aed-cabinet | 0.52 × 0.58 × 0.18 | face-centre | local-negative-z | Public AED cabinet, green light and bilingual label. |
| PF-FIRST-AID | first-aid-cabinet | 0.52 × 0.68 × 0.2 | face-centre | local-negative-z | Lockable first-aid cabinet with marked cross. |
| PF-STAIR | stair-flight | 2.5 × 3 × 4.8 | floor | omnidirectional | Two-flight stair, landing, 1.10 m rails and tactile nosings. |
| PF-LIFT | lift-car | 1.7 × 2.45 × 1.7 | floor | local-negative-z | Accessible lift car, doors, panel, handrail and floor display. |
| PF-BENCH | bench | 1.8 × 0.84 × 0.58 | floor | local-positive-z | Four-leg bench with back and two seat positions. |
| PF-CHAIR | chair | 0.46 × 0.84 × 0.48 | floor | local-positive-z | Seat, back and four legs; instance yaw is seated facing. |
| PF-STOOL | lab-stool | 0.38 × 0.56 × 0.38 | floor | omnidirectional | Height-adjustable round stool and five-foot base. |
| PF-WAIT-CHAIRS | waiting-chair-bank | 1.9 × 0.84 × 0.62 | floor | local-positive-z | Three linked seats on steel beam. |
| PF-STUDENT-DESK-2 | two-seat-student-desk | 1.4 × 0.78 × 0.82 | floor | local-negative-z | Desk top, skirt, four legs, two stools, book and pencil case. |
| PF-LECTURE-SEAT | lecture-seat | 0.58 × 0.88 × 0.82 | floor | local-positive-z | Fixed padded seat with folding writing tablet. |
| PF-TEACHER-PODIUM | teacher-podium | 1.25 × 1.18 × 0.72 | floor | local-negative-z | Lectern, worktop, lockable cabinet and cable grommet. |
| PF-COMPUTER-DESK | computer-workstation | 1.2 × 0.76 × 0.72 | floor | local-negative-z | Desk, ergonomic chair, monitor, keyboard, mouse and under-desk tower. |
| PF-LANGUAGE-DESK | language-workstation | 1.1 × 0.76 × 0.72 | floor | local-negative-z | Computer workstation plus headset, microphone and divider. |
| PF-CHALKBOARD | chalkboard | 5.4 × 1.5 × 0.1 | face-centre | local-negative-z | Green board, wood frame, chalk tray, chalk and lesson glyph layer. |
| PF-WHITEBOARD | whiteboard | 3.2 × 1.2 × 0.08 | face-centre | local-negative-z | Magnetic board, marker tray and four marker blocks. |
| PF-PROJECTOR | ceiling-projector | 0.32 × 0.18 × 0.42 | ceiling-centre | local-negative-z | Projector body, mount, lens and low-glow emitter. |
| PF-SCREEN | projection-screen | 2.4 × 1.5 × 0.06 | face-centre | local-negative-z | Roll case, matte screen and lower weight bar. |
| PF-CLOCK | wall-clock | 0.46 × 0.46 × 0.06 | face-centre | local-negative-z | Dial, 12 marks and animated hour/minute hands. |
| PF-FLAG | wall-flag | 0.72 × 0.48 × 0.04 | face-centre | local-negative-z | Red fabric panel with gold hanging bar. |
| PF-BOOKCASE | bookcase | 0.9 × 2 × 0.38 | floor | local-negative-z | Five shelves, deterministic mixed books and label strip. |
| PF-BOOKSTACK | double-book-stack | 1 × 2.2 × 3 | floor | local-negative-z | Two-sided six-shelf stack with end classification panel and books. |
| PF-READING-TABLE | four-seat-reading-table | 2.4 × 0.8 × 1.35 | floor | omnidirectional | Oak table, four chairs, baize inlay, books and banker lamp. |
| PF-CIRC-DESK | circulation-desk | 2.8 × 1.05 × 0.9 | floor | local-negative-z | Accessible return section, computer, scanner, task lamp and sign. |
| PF-SELF-CHECK | self-check-kiosk | 0.52 × 1.35 × 0.5 | floor | local-negative-z | Touchscreen, RFID pad, receipt slot and status lamp. |
| PF-SECURITY-GATE | library-security-gate | 0.16 × 1.65 × 0.62 | floor | local-negative-z | Transparent RFID gate leaf with status light. |
| PF-SHELF | storage-shelf | 1 × 2 × 0.48 | floor | local-negative-z | Five powder-coated shelves and labelled contents blocks. |
| PF-FILE-CABINET | file-cabinet | 0.9 × 1.35 × 0.48 | floor | local-negative-z | Lockable four-drawer cabinet with label holders. |
| PF-OFFICE-DESK | office-workstation | 1.5 × 0.76 × 0.75 | floor | local-negative-z | Desk, task chair, monitor, keyboard, phone and drawer pedestal. |
| PF-MEETING-TABLE | meeting-table | 2.8 × 0.76 × 1.15 | floor | omnidirectional | Cable-managed table; chairs are separate exact instances. |
| PF-SIDE-TABLE | side-table | 0.55 × 0.48 × 0.55 | floor | local-negative-z | Compact rounded top, recessed apron, four tapered legs and low steel stretcher. |
| PF-SERVICE-COUNTER | service-counter | 2.4 × 1.05 × 0.82 | floor | local-negative-z | Accessible counter section, two terminals and privacy screen. |
| PF-CANTEEN-TABLE | four-seat-canteen-table | 1.45 × 0.76 × 1.15 | floor | omnidirectional | Laminate table with four fixed stools. |
| PF-TRAY-RACK | tray-rack | 0.72 × 1.25 × 0.52 | floor | local-negative-z | Tray shelves, chopstick cups and sanitizer dispenser. |
| PF-SERVING-COUNTER | heated-serving-counter | 2 × 1.15 × 0.86 | floor | local-negative-z | Stainless counter, three food pans, sneeze guard and menu plate. |
| PF-CASHIER | cashier-station | 1.25 × 1.05 × 0.78 | floor | local-negative-z | Counter, POS screen, scanner and payment sign. |
| PF-DISH-RETURN | dish-return | 2 × 1.15 × 0.82 | floor | local-negative-z | Tray aperture, belt, scrape bin and return sign. |
| PF-KITCHEN-RANGE | commercial-range | 1.8 × 0.92 × 0.82 | floor | local-negative-z | Two wok rings, controls, splashback and gas-isolation label. |
| PF-HOOD | extract-hood | 2.2 × 0.72 × 1.05 | ceiling-centre | local-negative-z | Stainless canopy, baffles, light and suppression nozzles. |
| PF-PREP-TABLE | prep-table | 1.8 × 0.9 × 0.75 | floor | omnidirectional | Stainless worktop, undershelf and colour-coded boards. |
| PF-SINK-DOUBLE | double-sink | 1.4 × 0.92 × 0.72 | floor | local-negative-z | Two stainless bowls, taps, drainboard and splashback. |
| PF-FRIDGE | upright-fridge | 0.82 × 2 × 0.82 | floor | local-negative-z | Two-door refrigerator, thermometer and ventilation grille. |
| PF-FREEZER | upright-freezer | 0.82 × 2 × 0.82 | floor | local-negative-z | Lockable freezer, thermometer and ventilation grille. |
| PF-HANDWASH | handwash-basin | 0.52 × 0.88 × 0.42 | floor | local-negative-z | Basin, sensor tap, soap, towel unit and splashback. |
| PF-WATER | water-dispenser | 0.42 × 1.2 × 0.42 | floor | local-negative-z | Hot/cold dispenser, bottle and cup rack. |
| PF-BIN | waste-bin | 0.42 × 0.68 × 0.42 | floor | local-negative-z | Lidded bin with stream label. |
| PF-PLANT | potted-plant | 0.58 × 1.35 × 0.58 | floor | omnidirectional | Weighted pot, soil and deterministic foliage cluster. |
| PF-BED | single-bed | 2 × 0.58 × 0.92 | floor | omnidirectional | Frame, mattress, pillow, sheet and folded quilt. |
| PF-DORM-DESK | dorm-study-desk | 1.05 × 0.76 × 0.58 | floor | local-negative-z | Desk, chair, task lamp, books and power strip. |
| PF-WARDROBE | wardrobe | 0.9 × 2.15 × 0.6 | floor | local-negative-z | Two-door wardrobe, handles, top locker and clothes rail. |
| PF-SHOE-RACK | shoe-rack | 0.8 × 0.55 × 0.32 | floor | local-negative-z | Three shelves with deterministic shoe pairs. |
| PF-AC | indoor-ac-unit | 0.82 × 0.28 × 0.22 | face-centre | local-negative-z | Wall split-unit body, grille and status lamp. |
| PF-LAUNDRY | washer-dryer | 0.68 × 1.75 × 0.72 | floor | local-negative-z | Stacked washer/dryer with doors and control panels. |
| PF-LOCKERS | locker-bank | 1.8 × 1.9 × 0.5 | floor | local-negative-z | Six ventilated steel lockers with number plates. |
| PF-LAB-BENCH | laboratory-bench | 2.4 × 0.92 × 0.82 | floor | local-negative-z | Chemical-resistant worktop, cabinets, service taps and sockets. |
| PF-FUME-HOOD | fume-hood | 1.5 × 2.35 × 0.88 | floor | local-negative-z | Sash, work chamber, extraction plenum and service controls. |
| PF-LAB-SINK | laboratory-sink | 0.8 × 0.92 × 0.65 | floor | local-negative-z | Chemical-resistant sink, gooseneck tap and drying pegs. |
| PF-EYEWASH | eyewash-shower | 0.65 × 2.25 × 0.65 | floor | local-negative-z | Twin eyewash heads, pull shower and floor drain. |
| PF-MICROSCOPE | microscope-station | 1.2 × 0.92 × 0.72 | floor | local-negative-z | Bench, stool, microscope, task light and specimen tray. |
| PF-ROBOTICS | robotics-bench | 2 × 0.92 × 0.9 | floor | local-negative-z | Work bench, tool board, solder extraction and robot model. |
| PF-EXAM-COUCH | exam-couch | 1.95 × 0.78 × 0.72 | floor | omnidirectional | Adjustable couch, paper roll, step and privacy curtain track. |
| PF-CLINIC-CABINET | clinical-cabinet | 0.8 × 2 × 0.45 | floor | local-negative-z | Lockable clinical storage with labelled trays. |
| PF-MED-FRIDGE | medicine-fridge | 0.68 × 1.85 × 0.68 | floor | local-negative-z | Lockable monitored refrigerator. |
| PF-PHARMACY | pharmacy-counter | 2 × 1.05 × 0.72 | floor | local-negative-z | Dispensing counter, privacy screen, terminal and medicine drawers. |
| PF-DANCE-MIRROR | dance-mirror | 3.2 × 2 × 0.04 | face-centre | local-negative-z | Safety-backed mirror with timber barre. |
| PF-MUSIC-RACK | music-storage | 1.2 × 1.8 × 0.48 | floor | local-negative-z | Instrument cubbies and labelled cases. |
| PF-SPEAKER | wall-speaker | 0.42 × 0.72 × 0.28 | face-centre | local-negative-z | Tapered loudspeaker cabinet, protective grille, twin drivers, status lamp and wall bracket. |
| PF-ART-TABLE | art-table | 1.8 × 0.78 × 0.9 | floor | omnidirectional | Washable table, four stools, cutting mat and supply caddy. |
| PF-CCTV-DESK | security-console | 2.2 × 0.82 × 0.82 | floor | local-negative-z | Desk, chair, four CCTV screens, radio and barrier controls. |
| PF-KEY-CABINET | key-cabinet | 0.72 × 1.05 × 0.18 | face-centre | local-negative-z | Lockable numbered key board. |
| PF-COAT-RAIL | coat-hook-rail | 0.9 × 0.38 × 0.12 | face-centre | local-negative-z | Oak mounting rail with five individual brass double hooks and concealed wall brackets. |
| PF-ELECTRICAL-CABINET | electrical-cabinet | 0.58 × 1.15 × 0.16 | face-centre | local-negative-z | Recessed framed distribution cabinet with hinged door, breaker rows, warning plate and latch. |
| PF-TOILET | toilet | 0.72 × 0.78 × 0.55 | floor | local-negative-z | Pan, cistern, seat and grab-rail option. |
| PF-SHOWER | shower-cubicle | 0.95 × 2.15 × 0.95 | floor | local-negative-z | Non-slip tray, tiled partitions, curtain, mixer and hooks. |
| PF-BASIN | washbasin | 0.62 × 0.88 × 0.45 | floor | local-negative-z | Basin, tap, soap, mirror and hand dryer. |
| PF-CLEANING | cleaning-cupboard | 0.8 × 2.05 × 0.58 | floor | local-negative-z | Mop sink, shelves, hooks, warning signs and folded cart. |

## 15. Accessibility and life safety

- **ACC-B01:** Add a 1:12 ramp, 1.50 m clear, beside the B01 steps from campus grade to the entrance landing; tactile route must reach the ramp landing.
- **ACC-B02:** Add a 1:12 ramp, 1.50 m clear, beside the B02 west steps without blocking the bicycle hoops.
- **ACC-ALL:** Keep 1.20 m clear public routes, 1.50 m turning circles at lifts/accessible WCs, 0.90 m clear doors, lever hardware, high-contrast nosings and bilingual/tactile room signs.

- Every occupied upper floor has two independent protected stairs; lift is not counted as an exit.
- Every floor has explicit exit signs, emergency lights, alarm call point and extinguisher. Higher-risk rooms add their own equipment.
- Clinic and activity-centre routes are separated by a 60-minute self-closing fire door.
- Canteen public egress uses the east main door and new south exit; the obstructed west delivery gap is service-only.
- Science lab doors, storage controls and safety fixtures are gameplay geometry only; a real laboratory would still require licensed engineering and code review.

## 16. Runtime implementation

| File | Ownership |
| --- | --- |
| js/campus-interior-core.js | all 28 data-driven floor scenes, shared materials/prefabs, shells, partitions, fixtures, lighting, collisions, portals and lift/stair travel |
| js/campus-academic.js | B01/B02 exterior entry portals |
| js/campus-west.js | B03/B05/B06 exterior entry portals |
| js/campus-east.js | B04/B07 exterior entry portals |
| js/campus-boundary.js | B08 guardhouse entry portal |
| js/classroom.js | corrected legacy university seminar scene |
| js/library.js | corrected legacy detailed reading-room scene |
| index.html + js/game.js + js/data.js | blueprint loading, place registration, preview deep links and shared interactions |

Implemented in this order: 1. shared floor/prefab shell → 2. B03 and B08 single-floor proof scenes → 3. B04/B05/B06/B07 floor families → 4. B01/B02 legacy-preserving expansion → 5. portal wiring and exterior facade cuts → 6. collision, interaction and performance validation.

Acceptance requires reciprocal portals, legal spawns outside collision, floor switching, two protected exits on occupied upper floors, accessible routes, room light isolation, collision/camera blockers, day/night rendering, save compatibility, and normal boot/place/static checks.
