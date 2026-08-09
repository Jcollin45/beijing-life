#!/usr/bin/env node
'use strict';

// Generates the construction-grade companion to ZOO-EXPANSION-BLUEPRINT.json.
// This file is the authored source; the JSON, Markdown and HTML outputs are deterministic.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const parent = JSON.parse(fs.readFileSync(path.join(ROOT, 'ZOO-EXPANSION-BLUEPRINT.json'), 'utf8'));
const PI = Math.PI;
const r3 = n => Math.round(n * 1000) / 1000;
const center = r => [r3((r[0] + r[1]) / 2), r3((r[2] + r[3]) / 2)];
const dims = r => [r3(r[1] - r[0]), r3(r[3] - r[2])];

function item(id, label, archetype, at, size, material, collision, purpose, extra = {}) {
  const out = { id, label, archetype, at, size, material, collision, purpose, ...extra };
  if (out.yaw === undefined) out.yaw = 0;
  return out;
}

function volume(id, label, archetype, rect, y0, height, material, collision, purpose, extra = {}) {
  return {
    id, label, archetype, rect, y0, height, material, collision, purpose, ...extra,
  };
}

function surface(id, label, rect, y, material, purpose, extra = {}) {
  return {
    id, label, archetype: 'surface-rect', rect, y, material, collision: 'none', purpose, ...extra,
  };
}

const materials = [
  ['M-GRASS', 'grass', '#58733e', 'grass', 17, 0.07],
  ['M-MEADOW', 'meadow grass', '#73864d', 'grass', 17, 0.07],
  ['M-FOREST', 'forest floor', '#415b36', 'earth', 17, 0.06],
  ['M-SAND', 'washed habitat sand', '#b9a06f', 'sand', 10, 0.07],
  ['M-MUD', 'compacted habitat mud', '#6b583c', 'mud', 10, 0.18],
  ['M-EARTH', 'compacted brown earth', '#8a6545', 'earth', 10, 0.07],
  ['M-WATER', 'clean habitat water', '#365f67', 'water', 16, 0.52],
  ['M-WATER-LIGHT', 'shallow clean water', '#4d7e82', 'water', 16, 0.58],
  ['M-CONCRETE', 'broom-finished concrete', '#918c83', 'concrete', 9, 0.08],
  ['M-CONCRETE-DARK', 'dark wet concrete', '#6f6a62', 'concrete', 9, 0.08],
  ['M-ROCK', 'cast habitat rock', '#77766f', 'concrete', 10, 0.06],
  ['M-ROCK-LIGHT', 'highlight habitat rock', '#99978e', 'concrete', 10, 0.06],
  ['M-TIMBER', 'sealed exterior timber', '#72563e', 'wood', 6, 0.16],
  ['M-TIMBER-DARK', 'dark structural timber', '#513d2f', 'wood', 6, 0.14],
  ['M-BAMBOO', 'living bamboo', '#7c9a44', 'foliage', 15, 0.12],
  ['M-FOLIAGE', 'broadleaf foliage', '#487139', 'foliage', 15, 0.08],
  ['M-PINE', 'pine foliage', '#315a40', 'foliage', 15, 0.06],
  ['M-WILLOW', 'wetland planting', '#668c49', 'foliage', 15, 0.08],
  ['M-STEEL', 'powder-coated steel', '#58636a', 'steel', 1, 0.52],
  ['M-STEEL-DARK', 'dark powder-coated steel', '#343d42', 'steel', 1, 0.48],
  ['M-GLASS', 'laminated safety glass', '#789aa0', 'glass', 1, 0.90],
  ['M-MESH', 'black zoo mesh', '#202529', 'steel', 1, 0.36],
  ['M-BRICK', 'red civic brick', '#9c503f', 'brick', 1, 0.08],
  ['M-RENDER', 'warm plaster render', '#ded2bb', 'plaster', 1, 0.07],
  ['M-ROOF-GREEN', 'green glazed roof tile', '#355f4b', 'rooftile', 1, 0.17],
  ['M-ROOF-RED', 'dark red roof tile', '#74392f', 'rooftile', 1, 0.17],
  ['M-CERAMIC', 'white sanitary ceramic', '#edf1eb', 'none', 1, 0.40],
  ['M-FOOD-STEEL', 'food-safe stainless steel', '#aab3b6', 'steel', 1, 0.60],
  ['M-RUBBER', 'animal-safe rubber', '#cb772f', 'none', 1, 0.28],
  ['M-SCREEN', 'lit information screen', '#3574a0', 'none', 1, 0.20],
  ['M-RED-LIGHT', 'low red nocturnal light', '#b63e31', 'none', 1, 0.20],
].map(([id, label, color, texture, renderMode, gloss]) =>
  ({ id, label, color, texture, renderMode, gloss }));

const archetypes = [
  { id:'surface-rect', anchor:'top-centre', primitives:['flat'], dimensionRule:'rect + y', solidDefault:false },
  { id:'pool-volume', anchor:'water-surface-centre', primitives:['flat','optional basin walls'], dimensionRule:'rect + depth', solidDefault:false },
  { id:'rock-cluster', anchor:'ground-centre', primitives:['five ellipsoids'], generator:{ offsets:[[0,0,1],[-0.46,0.18,0.66],[0.42,0.12,0.72],[-0.15,-0.38,0.58],[0.34,-0.32,0.48]] }, solidDefault:false },
  { id:'ground-log', anchor:'centre', primitives:['capsule','two branch capsules'], dimensionRule:'size is bounding box', solidDefault:false },
  { id:'tree', anchor:'trunk-base', primitives:['cylinder','foliage balls/tapers'], collisionFootprint:[0.56,0.56], solidDefault:true },
  { id:'bamboo-clump', anchor:'ground-centre', primitives:['canes','nodes','leaf sprays'], generator:{ spiral:2.399 }, collisionFootprint:[1.1,1.1], solidDefault:true },
  { id:'animal-shelter', anchor:'ground-centre', primitives:['posts','roof'], dimensionRule:'size is roof envelope', solidDefault:false },
  { id:'animal-den', anchor:'ground-centre', primitives:['mass','dark opening'], dimensionRule:'rect + height', solidDefault:false },
  { id:'feed-trough', anchor:'ground-centre', primitives:['box basin'], defaultSize:[1.35,0.34,0.55], solidDefault:false },
  { id:'water-trough', anchor:'ground-centre', primitives:['four curb boxes','water surface'], defaultSize:[1.88,0.36,0.88], solidDefault:false },
  { id:'scrub-post', anchor:'ground-centre', primitives:['cylinder'], defaultSize:[0.32,1.5,0.32], solidDefault:false },
  { id:'climbing-frame', anchor:'ground-centre', primitives:['posts','logs','ropes'], dimensionRule:'size is full envelope', solidDefault:false },
  { id:'nest-platform', anchor:'ground-centre', primitives:['cylinder','nest litter'], solidDefault:false },
  { id:'habitat-camera', anchor:'pole-base', primitives:['pole','camera box'], defaultSize:[0.22,3.2,0.22], solidDefault:false },
  { id:'floor-drain', anchor:'top-centre', primitives:['slotted plate'], defaultSize:[0.45,0.03,0.45], solidDefault:false },
  { id:'keeper-safe-zone', anchor:'top-centre', primitives:['surface marking','equipment hook'], defaultSize:[1.2,0.02,1.2], solidDefault:false },
  { id:'box-fixture', anchor:'ground-centre', primitives:['box'], dimensionRule:'size is full bounding box', solidDefault:'by placement' },
  { id:'cylinder-fixture', anchor:'ground-centre', primitives:['cylinder'], dimensionRule:'size is diameter,height,diameter', solidDefault:'by placement' },
  { id:'counter', anchor:'ground-centre', primitives:['cabinet mass','worktop'], solidDefault:true },
  { id:'table', anchor:'ground-centre', primitives:['top','legs'], solidDefault:true },
  { id:'chair', anchor:'ground-centre', primitives:['seat','back','legs'], solidDefault:false },
  { id:'cabinet', anchor:'ground-centre', primitives:['case','doors','handles'], solidDefault:true },
  { id:'shelf', anchor:'ground-centre', primitives:['case','shelves','contents blocks'], solidDefault:true },
  { id:'sanitary-fixture', anchor:'ground-centre', primitives:['ceramic bowl/basin','fittings'], solidDefault:true },
  { id:'display-case', anchor:'ground-centre', primitives:['plinth','glass hood','specimen'], solidDefault:true },
  { id:'screen', anchor:'face-centre', primitives:['backing','lit face'], solidDefault:false },
  { id:'light-fixture', anchor:'mount-centre', primitives:['housing','emissive face'], solidDefault:false },
  { id:'mesh-enclosure', anchor:'ground-centre', primitives:['posts','mesh grid','roof mesh'], solidDefault:false },
  { id:'wall-run', anchor:'ground-centre', primitives:['box'], dimensionRule:'rect + y0 + height', solidDefault:true },
  { id:'door-opening', anchor:'threshold-centre', primitives:[], dimensionRule:'side + range + clear height', solidDefault:false },
];

const coreHabitats = [
  {
    id:'H00-penguin', label:'企鹅池', species:['企鹅'], bounds:[-6,0,-11,-5.5], publicSide:'z0',
    population:[
      { id:'H00/A01', name:'企鹅', profile:'penguin', scale:1.00, hours:[6,22] },
      { id:'H00/A02', name:'企鹅二', profile:'penguin', scale:1.00, hours:[6,22] },
      { id:'H00/A03', name:'企鹅三', profile:'penguin', scale:0.84, hours:[6,22] },
    ],
    contents:[
      surface('H00/S01','wet concrete habitat floor',[-6,0,-11,-5.5],0.006,'M-CONCRETE-DARK','primary substrate'),
      volume('H00/W01','main swimming pool','pool-volume',[-4.8,-0.4,-9.45,-5.85],0,0.72,'M-WATER','none','swimming and cooling',{ waterLevel:0.01, basinSlope:'1:8 to 0.72m' }),
      item('H00/O01','west haul-out rock','rock-cluster',[-4.7,0,-6.6],[2.4,0.82,2.0],'M-ROCK','none','dry resting and visual cover',{ seed:'H00-rock-01' }),
      item('H00/O02','four-step east haul-out','climbing-frame',[-1.4,0,-9.15],[2.4,0.42,1.24],'M-CONCRETE','none','accessible pool exit',{ stepCount:4, riser:0.1, tread:0.3, yaw:0 }),
      item('H00/O03','nest box A','animal-den',[-4.6,0,-5.95],[0.78,0.62,0.62],'M-ROCK','none','covered nest'),
      item('H00/O04','nest box B','animal-den',[-3.65,0,-5.95],[0.78,0.62,0.62],'M-ROCK','none','covered nest'),
      item('H00/O05','fish feed tray','feed-trough',[-4.75,0,-9.85],[0.85,0.18,0.55],'M-FOOD-STEEL','none','keeper feeding point'),
      item('H00/O06','pool floor drain','floor-drain',[-2.6,-0.7,-7.65],[0.45,0.03,0.45],'M-STEEL','none','pool filtration intake'),
      item('H00/O07','keeper safety square','keeper-safe-zone',[-5.25,0.02,-10.25],[1.0,0.02,1.0],'M-CONCRETE','none','keeper entry landing'),
      item('H00/O08','habitat camera','habitat-camera',[-5.55,0,-6.0],[0.22,3.2,0.22],'M-STEEL-DARK','none','welfare monitoring',{ facing:[-2.6,-7.65] }),
    ],
    activityAnchors:[
      { id:'H00/Z01', label:'swim centre', at:[-2.6,0,-7.65], acts:['swim'] },
      { id:'H00/Z02', label:'haul-out', at:[-1.4,0.42,-9.15], acts:['preen','lie'] },
      { id:'H00/Z03', label:'feed station', at:[-4.75,0,-9.85], acts:['eat'] },
    ],
  },
  {
    id:'H01-giraffe', label:'长颈鹿草场', species:['长颈鹿'], bounds:[5,14,-11,-5.5], publicSide:'z0',
    population:[
      { id:'H01/A01', name:'长颈鹿', profile:'giraffe', scale:1.00, hours:[6,21] },
      { id:'H01/A02', name:'长颈鹿二', profile:'giraffe', scale:0.82, hours:[6,21] },
    ],
    contents:[
      surface('H01/S01','sand paddock floor',[5,14,-11,-5.5],0.006,'M-SAND','primary substrate'),
      item('H01/O01','west browse tree','tree',[7.2,0,-7.1],[2.1,3.9,2.1],'M-FOLIAGE','none','natural browse and shade',{ trunkHeight:3.4 }),
      item('H01/O02','east browse tree','tree',[12.0,0,-7.5],[2.1,3.9,2.1],'M-FOLIAGE','none','natural browse and shade',{ trunkHeight:3.4 }),
      item('H01/O03','low water trough','water-trough',[8.15,0,-8.95],[1.88,0.36,0.88],'M-CONCRETE','none','drinking station',{ waterMaterial:'M-WATER' }),
      item('H01/O04','raised keeper feeding deck','climbing-frame',[10.9,0,-7.2],[3.6,3.85,2.2],'M-TIMBER','none','high browse presentation',{ deckY:3.26, fourPosts:true }),
      item('H01/O05','seven-slot browse rack','climbing-frame',[10.9,3.26,-8.26],[3.4,0.8,0.2],'M-TIMBER-DARK','none','holds leafy browse',{ slotCount:7 }),
      item('H01/O06','sand drainage channel','floor-drain',[9.2,0.01,-10.25],[3.2,0.03,0.35],'M-STEEL','none','surface drainage'),
      item('H01/O07','keeper safety square','keeper-safe-zone',[13.2,0.02,-6.25],[1.0,0.02,1.0],'M-CONCRETE','none','service-gate landing'),
      item('H01/O08','habitat camera','habitat-camera',[5.45,0,-6.0],[0.22,3.6,0.22],'M-STEEL-DARK','none','welfare monitoring',{ facing:[10,-8] }),
    ],
    activityAnchors:[
      { id:'H01/Z01', label:'browse face', at:[10.9,0,-8.55], acts:['browse'] },
      { id:'H01/Z02', label:'water trough', at:[8.15,0,-8.95], acts:['drink'] },
      { id:'H01/Z03', label:'open grazing', at:[7.8,0,-7.9], acts:['graze'] },
    ],
  },
  {
    id:'H02-panda', label:'熊猫馆', species:['熊猫'], bounds:[-16,-8,-2.5,4], publicSide:'x1',
    population:[
      { id:'H02/A01', name:'熊猫', profile:'panda', scale:1.00, hours:[7,20] },
      { id:'H02/A02', name:'熊猫二', profile:'panda', scale:0.78, hours:[7,20] },
    ],
    contents:[
      surface('H02/S01','grass yard',[-16,-8,-2.5,4],0.006,'M-GRASS','primary substrate'),
      item('H02/O01','south bamboo clump','bamboo-clump',[-14.6,0,-0.9],[2.2,3.6,2.2],'M-BAMBOO','body','feeding cover',{ caneCount:9 }),
      item('H02/O02','north-west bamboo clump','bamboo-clump',[-14.8,0,2.5],[2.2,3.9,2.2],'M-BAMBOO','body','feeding cover',{ caneCount:8 }),
      item('H02/O03','north-centre bamboo clump','bamboo-clump',[-12.4,0,3.0],[2.2,3.3,2.2],'M-BAMBOO','body','feeding cover',{ caneCount:6 }),
      item('H02/O04','heated panda house','box-fixture',[-14.1,0,0.75],[3.5,3.0,3.9],'M-RENDER','camera-blocker','indoor retreat',{ roofMaterial:'M-ROOF-GREEN', opening:{ side:'x1', width:1.4, height:2.1 }, signage:'熊猫馆' }),
      item('H02/O05','south climbing frame','climbing-frame',[-10.4,0,-0.6],[0.8,0.85,2.5],'M-TIMBER','body','climbing and resting'),
      item('H02/O06','north climbing frame','climbing-frame',[-11.2,0,1.9],[0.8,0.85,2.5],'M-TIMBER','body','climbing and resting'),
      item('H02/O07','drinking bowl','water-trough',[-9.35,0,2.9],[0.9,0.22,0.65],'M-ROCK','none','fresh drinking water',{ waterMaterial:'M-WATER-LIGHT' }),
      item('H02/O08','cooling stone','box-fixture',[-9.6,0,-1.45],[1.4,0.24,1.0],'M-ROCK-LIGHT','none','summer resting slab'),
      item('H02/O09','keeper safety square','keeper-safe-zone',[-15.3,0.02,0.7],[1.0,0.02,1.0],'M-CONCRETE','none','west service-gate landing'),
      item('H02/O10','habitat camera','habitat-camera',[-8.45,0,3.5],[0.22,3.2,0.22],'M-STEEL-DARK','none','welfare monitoring',{ facing:[-12,0.75] }),
    ],
    activityAnchors:[
      { id:'H02/Z01', label:'bamboo feeding', at:[-13.6,0,-0.5], acts:['eat','graze'] },
      { id:'H02/Z02', label:'climb structure', at:[-10.4,0.7,-0.6], acts:['climb','sit'] },
      { id:'H02/Z03', label:'cooling stone', at:[-9.6,0.24,-1.45], acts:['lie'] },
    ],
  },
  {
    id:'H03-peacock', label:'孔雀鸟舍', species:['孔雀'], bounds:[-4,2,-2.5,4], publicSide:'z0',
    population:[
      { id:'H03/A01', name:'孔雀', profile:'peacock', scale:1.00, hours:[6,21] },
      { id:'H03/A02', name:'孔雀二', profile:'peacock', scale:0.88, hours:[6,21] },
    ],
    contents:[
      surface('H03/S01','aviary grass floor',[-4,2,-2.5,4],0.006,'M-MEADOW','primary substrate'),
      item('H03/O01','full-height aviary cage','mesh-enclosure',[-1,0,0.75],[6,4.2,6.5],'M-MESH','camera-blocker','flight containment',{ grid:1.0, roofGrid:1.2, cornerPost:0.13 }),
      item('H03/O02','diagonal timber perch', 'ground-log',[-1.8,1.4,1.35],[2.6,0.12,0.12],'M-TIMBER','none','roosting',{ yaw:1.44 }),
      item('H03/O03','north-east shrub','tree',[1.35,0,3.28],[1.1,1.1,1.1],'M-FOLIAGE','none','cover and nesting'),
      item('H03/O04','grain feeder','feed-trough',[-2.8,0,2.7],[0.75,0.24,0.55],'M-FOOD-STEEL','none','daily feeding'),
      item('H03/O05','dust bath','pool-volume',[0.45,0,1.4],[1.15,0.12,0.9],'M-SAND','none','dust bathing',{ depth:0.12 }),
      item('H03/O06','shallow drinker','water-trough',[-2.75,0,-1.5],[0.8,0.18,0.55],'M-CERAMIC','none','fresh drinking water'),
      item('H03/O07','keeper safety square','keeper-safe-zone',[1.25,0.02,3.35],[0.9,0.02,0.9],'M-CONCRETE','none','service landing'),
      item('H03/O08','habitat camera','habitat-camera',[1.55,0,-1.95],[0.22,3.2,0.22],'M-STEEL-DARK','none','welfare monitoring',{ facing:[-1,1] }),
    ],
    activityAnchors:[
      { id:'H03/Z01', label:'display lawn', at:[-0.4,0,0.6], acts:['display','graze'] },
      { id:'H03/Z02', label:'perch', at:[-1.8,1.4,1.35], acts:['preen','sit'] },
      { id:'H03/Z03', label:'feeder', at:[-2.8,0,2.7], acts:['eat'] },
    ],
  },
  {
    id:'H04-elephant', label:'大象院', species:['大象'], bounds:[6,16,-2.5,4], publicSide:'x0',
    population:[
      { id:'H04/A01', name:'大象', profile:'elephant', scale:1.00, hours:[6,21] },
      { id:'H04/A02', name:'大象二', profile:'elephant', scale:0.60, hours:[6,21] },
    ],
    contents:[
      surface('H04/S01','sand yard',[6,16,-2.5,4],0.006,'M-SAND','primary substrate'),
      item('H04/O01','mud wallow outer basin','pool-volume',[13,0,0.75],[4.2,0.25,3.4],'M-MUD','none','dusting and cooling',{ innerWaterSize:[1.72,0.12,1.05] }),
      item('H04/O02','east rock cluster','rock-cluster',[14.65,0,3.05],[2.3,1.05,2.0],'M-ROCK','none','scratching and visual cover'),
      item('H04/O03','open elephant shelter','animal-shelter',[13.6,0,-0.5],[4.8,4.0,4.2],'M-CONCRETE-DARK','camera-blocker','shade and rain cover',{ roofMaterial:'M-ROOF-RED', postSize:0.46 }),
      item('H04/O04','suspended enrichment ball','climbing-frame',[11.55,0,-0.32],[0.7,3.4,0.7],'M-RUBBER','none','moving enrichment',{ pivotY:3.38, swingRadius:1.45 }),
      item('H04/O05','drinking trough','water-trough',[8.2,0,2.5],[1.9,0.42,0.9],'M-CONCRETE','none','fresh drinking water'),
      item('H04/O06','scrub post','scrub-post',[9.3,0,-0.8],[0.42,2.4,0.42],'M-TIMBER-DARK','none','skin care and enrichment'),
      item('H04/O07','keeper safety square','keeper-safe-zone',[15.25,0.02,2.6],[1.0,0.02,1.0],'M-CONCRETE','none','east service-gate landing'),
      item('H04/O08','habitat camera','habitat-camera',[6.55,0,3.45],[0.24,4.0,0.24],'M-STEEL-DARK','none','welfare monitoring',{ facing:[12,0.5] }),
    ],
    activityAnchors:[
      { id:'H04/Z01', label:'wallow', at:[13,0,0.75], acts:['dust','drink'] },
      { id:'H04/Z02', label:'shelter shade', at:[13.6,0,-0.5], acts:['graze','lie'] },
      { id:'H04/Z03', label:'water trough', at:[8.2,0,2.5], acts:['drink'] },
    ],
  },
  {
    id:'H05-monkey', label:'猴山', species:['猴子'], bounds:[-13,-5,7,13.5], publicSide:'z0',
    population:[
      { id:'H05/A01', name:'猴子', profile:'monkey', scale:1.00, hours:[6,21] },
      { id:'H05/A02', name:'猴子二', profile:'monkey', scale:1.00, hours:[6,21] },
      { id:'H05/A03', name:'猴子三', profile:'monkey', scale:0.72, hours:[7,20] },
      { id:'H05/A04', name:'猴子四', profile:'monkey', scale:0.76, hours:[7,20] },
    ],
    contents:[
      surface('H05/S01','hard enclosure floor',[-13,-5,7,13.5],0.006,'M-CONCRETE-DARK','primary substrate'),
      volume('H05/W01','continuous water moat','pool-volume',[-12.4,-5.6,7.6,12.9],0,0.55,'M-WATER','none','animal containment and swimming'),
      item('H05/O01','central dry island','box-fixture',[-9,0,10.25],[5.2,0.16,4.4],'M-CONCRETE-DARK','none','dry activity surface'),
      item('H05/O02','monkey hill','rock-cluster',[-9,0,10.7],[5.8,2.15,4.8],'M-ROCK','camera-blocker','climbing and lookout',{ liftProfile:{ rx:2.9, rz:2.4, height:1.95 } }),
      item('H05/O03','west front ledge','box-fixture',[-10.8,0,8.9],[1.15,0.55,0.78],'M-ROCK','none','low climbing step'),
      item('H05/O04','centre front ledge','box-fixture',[-9,0,8.7],[1.3,0.72,0.78],'M-ROCK','none','low climbing step'),
      item('H05/O05','east front ledge','box-fixture',[-7.2,0,9.05],[1.05,0.48,0.78],'M-ROCK','none','low climbing step'),
      item('H05/O06','hilltop dead tree','climbing-frame',[-8.2,2.15,10.65],[1.6,2.1,1.0],'M-TIMBER-DARK','none','climbing and lookout'),
      item('H05/O07','rope traverse','climbing-frame',[-9,2.6,10.4],[4.2,0.12,2.8],'M-TIMBER','none','brachiation enrichment'),
      item('H05/O08','keeper feed basket','feed-trough',[-11.6,0,11.8],[0.75,0.32,0.55],'M-FOOD-STEEL','none','scatter-feed staging'),
      item('H05/O09','keeper safety square','keeper-safe-zone',[-12.1,0.02,12.75],[0.9,0.02,0.9],'M-CONCRETE','none','north service-gate landing'),
      item('H05/O10','habitat camera','habitat-camera',[-5.5,0,12.9],[0.22,3.6,0.22],'M-STEEL-DARK','none','welfare monitoring',{ facing:[-9,10.5] }),
    ],
    activityAnchors:[
      { id:'H05/Z01', label:'hill crest', at:[-9,1.95,10.7], acts:['climb','sit','groom'] },
      { id:'H05/Z02', label:'front ledges', at:[-9,0.72,8.8], acts:['sit','groom'] },
      { id:'H05/Z03', label:'feed basket', at:[-11.6,0,11.8], acts:['eat'] },
    ],
  },
  {
    id:'H06-tiger', label:'老虎山林', species:['老虎'], bounds:[1,10,7,13.5], publicSide:'z0',
    population:[{ id:'H06/A01', name:'老虎', profile:'tiger', scale:1.00, hours:[6,22] }],
    contents:[
      surface('H06/S01','long grass yard',[1,10,7,13.5],0.006,'M-GRASS','primary substrate'),
      item('H06/O01','west shade outcrop','rock-cluster',[2,0,12.95],[2.4,1.35,2.0],'M-ROCK','none','shade and lookout'),
      item('H06/O02','east shade outcrop','rock-cluster',[9,0,12.95],[2.4,1.35,2.0],'M-ROCK','none','shade and lookout'),
      item('H06/O03','fallen branching trunk','ground-log',[7.1,0.26,9.4],[3.2,0.48,0.48],'M-TIMBER','none','scratching and cover',{ yaw:0.4 }),
      item('H06/O04','fourteen-clump long grass zone','tree',[4.6,0,9.3],[5.6,0.7,3.3],'M-WILLOW','none','concealment',{ clumpCount:14, noTrunk:true }),
      item('H06/O05','shallow cooling pool','pool-volume',[2.4,0,8.35],[2.0,0.28,1.35],'M-WATER','none','summer cooling',{ depth:0.28 }),
      item('H06/O06','meat feed hatch','feed-trough',[8.7,0,12.0],[0.95,0.30,0.65],'M-FOOD-STEEL','none','protected feeding station'),
      item('H06/O07','keeper safety square','keeper-safe-zone',[8.3,0.02,12.75],[1.0,0.02,1.0],'M-CONCRETE','none','north service-gate landing'),
      item('H06/O08','habitat camera','habitat-camera',[1.45,0,12.95],[0.22,3.6,0.22],'M-STEEL-DARK','none','welfare monitoring',{ facing:[5.5,10] }),
    ],
    activityAnchors:[
      { id:'H06/Z01', label:'open grass', at:[5.3,0,9.2], acts:['graze','sit'] },
      { id:'H06/Z02', label:'west outcrop shade', at:[2.4,0.9,12.2], acts:['lie'] },
      { id:'H06/Z03', label:'cooling pool', at:[2.4,0,8.35], acts:['drink','lie'] },
    ],
  },
];

const habitatOps = {
  'H10-otter': [
    item('H10/OPS01','fish preparation tray','feed-trough',[-42.0,0,-7.3],[0.9,0.25,0.6],'M-FOOD-STEEL','none','daily scatter-feed point'),
    item('H10/OPS02','pool circulation drain','floor-drain',[-47.2,-0.68,-6.9],[0.45,0.03,0.45],'M-STEEL','none','filtration intake'),
    item('H10/OPS03','keeper safety square','keeper-safe-zone',[-49.45,0.02,-5.0],[0.9,0.02,1.4],'M-CONCRETE','none','dry service-gate landing'),
    item('H10/OPS04','habitat camera','habitat-camera',[-39.55,0,-1.55],[0.22,3.2,0.22],'M-STEEL-DARK','none','pool and bank monitoring',{ facing:[-45,-5] }),
  ],
  'H11-hippo': [
    item('H11/OPS01','pool circulation drain','floor-drain',[-47.7,-1.18,11.8],[0.55,0.03,0.55],'M-STEEL','none','filtration intake'),
    item('H11/OPS02','hose bib and wash post','scrub-post',[-40.0,0,13.8],[0.24,1.1,0.24],'M-STEEL','none','wash-down water supply'),
    item('H11/OPS03','keeper safety square','keeper-safe-zone',[-49.4,0.02,12.0],[1.0,0.02,1.6],'M-CONCRETE','none','dry service-gate landing'),
    item('H11/OPS04','habitat camera','habitat-camera',[-39.55,0,2.55],[0.24,3.8,0.24],'M-STEEL-DARK','none','pool and bank monitoring',{ facing:[-45,9] }),
  ],
  'H12-flamingo': [
    item('H12/OPS01','supplement feeder','feed-trough',[-32.1,0,-7.1],[0.8,0.18,0.55],'M-FOOD-STEEL','none','mineral feed'),
    item('H12/OPS02','shallow-water drain','floor-drain',[-31.9,-0.16,0.7],[0.42,0.03,0.42],'M-STEEL','none','wetland drain'),
    item('H12/OPS03','keeper safety square','keeper-safe-zone',[-24.55,0.02,-3.0],[0.8,0.02,1.2],'M-CONCRETE','none','service-gate landing'),
    item('H12/OPS04','habitat camera','habitat-camera',[-24.5,0,3.0],[0.22,3.2,0.22],'M-STEEL-DARK','none','flock monitoring',{ facing:[-29,-3] }),
  ],
  'H13-crane': [
    item('H13/OPS01','grain feeder','feed-trough',[-25.7,0,13.5],[0.8,0.2,0.55],'M-FOOD-STEEL','none','daily grain feed'),
    item('H13/OPS02','marsh drain','floor-drain',[-32.0,-0.12,8.1],[0.42,0.03,0.42],'M-STEEL','none','water-level control'),
    item('H13/OPS03','keeper safety square','keeper-safe-zone',[-24.55,0.02,13.2],[0.8,0.02,1.1],'M-CONCRETE','none','service landing'),
    item('H13/OPS04','habitat camera','habitat-camera',[-33.5,0,14.5],[0.22,3.2,0.22],'M-STEEL-DARK','none','nest and marsh monitoring',{ facing:[-29,10] }),
  ],
  'H20-takin': [
    item('H20/OPS01','stone water trough','water-trough',[-41.2,0,28.2],[1.3,0.34,0.7],'M-ROCK','none','fresh drinking water'),
    item('H20/OPS02','salt lick block','box-fixture',[-43.2,0,35.1],[0.45,0.55,0.45],'M-ROCK-LIGHT','none','mineral enrichment'),
    item('H20/OPS03','keeper safety square','keeper-safe-zone',[-49.4,0.02,33.0],[1.0,0.02,1.2],'M-CONCRETE','none','service-gate landing'),
    item('H20/OPS04','habitat camera','habitat-camera',[-39.5,0,36.5],[0.22,3.5,0.22],'M-STEEL-DARK','none','slope monitoring',{ facing:[-45,32] }),
  ],
  'H21-snow-leopard': [
    item('H21/OPS01','chilled feeding shelf','feed-trough',[-25.2,0,27.6],[0.9,0.32,0.65],'M-FOOD-STEEL','none','protected meat feed'),
    item('H21/OPS02','high lookout ledge','box-fixture',[-31.6,0,34.8],[1.8,1.5,1.0],'M-ROCK','none','elevated resting'),
    item('H21/OPS03','keeper safety square','keeper-safe-zone',[-24.65,0.02,34.0],[0.8,0.02,1.0],'M-CONCRETE','none','dry service landing'),
    item('H21/OPS04','habitat camera','habitat-camera',[-33.5,0,26.5],[0.22,3.5,0.22],'M-STEEL-DARK','none','den and shelf monitoring',{ facing:[-29,32] }),
  ],
  'H30-red-panda': [
    item('H30/OPS01','bamboo feed shelf','feed-trough',[-32.4,1.05,44.5],[1.1,0.18,0.55],'M-TIMBER','none','raised feed point'),
    item('H30/OPS02','canopy mist nozzle','light-fixture',[-28,3.7,50.4],[0.18,0.18,0.18],'M-STEEL','none','summer cooling mist',{ system:'water-mist' }),
    item('H30/OPS03','keeper safety square','keeper-safe-zone',[-33.4,0.02,49.0],[0.9,0.02,1.0],'M-CONCRETE','none','service-gate landing'),
    item('H30/OPS04','habitat camera','habitat-camera',[-24.5,0,43.5],[0.22,3.8,0.22],'M-STEEL-DARK','none','canopy monitoring',{ facing:[-28,47] }),
  ],
  'H31-waterfowl-lake': [
    item('H31/OPS01','floating feed station','feed-trough',[-13.8,0.04,25.0],[0.9,0.12,0.7],'M-TIMBER','none','controlled waterfowl feed'),
    item('H31/OPS02','lake overflow drain','floor-drain',[-7.5,-0.63,34.3],[0.55,0.03,0.55],'M-STEEL','none','lake water-level control'),
    item('H31/OPS03','life ring cabinet','cabinet',[-9.45,0,27.9],[0.55,0.85,0.22],'M-STEEL','none','public water safety'),
    item('H31/OPS04','habitat camera','habitat-camera',[-15.5,0,35.5],[0.22,3.2,0.22],'M-STEEL-DARK','none','lake and nest monitoring',{ facing:[-11,29] }),
  ],
  'H32-family-farm': [
    item('H32/OPS01','goat feed trough','feed-trough',[8.8,0,33.9],[1.35,0.34,0.55],'M-FOOD-STEEL','none','supervised visitor feeding'),
    item('H32/OPS02','rabbit drinker','water-trough',[14.8,0,27.2],[0.7,0.25,0.5],'M-CERAMIC','none','fresh drinking water'),
    item('H32/OPS03','contact-yard double gate','door-opening',[2,0,29],[0.2,1.4,1.8],'M-TIMBER','threshold','controlled public entry',{ interlock:true }),
    item('H32/OPS04','habitat camera','habitat-camera',[16.0,0,22.5],[0.22,3.2,0.22],'M-STEEL-DARK','none','contact yard monitoring',{ facing:[8,29] }),
  ],
  'H33-golden-monkey': [
    item('H33/OPS01','fruit feed basket','feed-trough',[4.0,1.2,44.6],[0.8,0.3,0.6],'M-FOOD-STEEL','none','raised feeding'),
    item('H33/OPS02','heated drinker','water-trough',[14.7,0,45.0],[0.75,0.3,0.55],'M-CERAMIC','none','freeze-safe water'),
    item('H33/OPS03','keeper safety square','keeper-safe-zone',[15.7,0.02,49.0],[0.8,0.02,1.0],'M-CONCRETE','none','service landing'),
    item('H33/OPS04','habitat camera','habitat-camera',[2.5,0,51.5],[0.22,4.0,0.22],'M-STEEL-DARK','none','climbing network monitoring',{ facing:[9,47.5] }),
  ],
  'H40-elephant-reserve': [
    item('H40/OPS01','high-capacity drinker','water-trough',[25.6,0,11.8],[2.2,0.48,1.0],'M-CONCRETE','none','fresh drinking water'),
    item('H40/OPS02','sand pile','rock-cluster',[34.5,0,12.7],[2.0,0.75,1.8],'M-SAND','none','dusting enrichment'),
    item('H40/OPS03','keeper safety square','keeper-safe-zone',[24.7,0.02,-7.7],[1.1,0.02,1.3],'M-CONCRETE','none','service-gate landing'),
    item('H40/OPS04','habitat camera','habitat-camera',[36.0,0,14.5],[0.24,4.2,0.24],'M-STEEL-DARK','none','reserve monitoring',{ facing:[30,3] }),
  ],
  'H41-mixed-savannah': [
    item('H41/OPS01','mineral lick','box-fixture',[48.7,0,-7.6],[0.5,0.55,0.5],'M-ROCK-LIGHT','none','mineral enrichment'),
    item('H41/OPS02','low hay feeder','feed-trough',[44.5,0,4.2],[1.35,0.34,0.55],'M-FOOD-STEEL','none','zebra and antelope feed'),
    item('H41/OPS03','keeper safety square','keeper-safe-zone',[49.3,0.02,-7.4],[0.9,0.02,1.0],'M-CONCRETE','none','service landing'),
    item('H41/OPS04','habitat camera','habitat-camera',[42.0,0,14.5],[0.24,4.0,0.24],'M-STEEL-DARK','none','savannah monitoring',{ facing:[46,3] }),
  ],
  'H42-rhino': [
    item('H42/OPS01','heavy water trough','water-trough',[26.2,0,34.7],[1.8,0.42,0.9],'M-CONCRETE','none','fresh drinking water'),
    item('H42/OPS02','mineral feed block','box-fixture',[27.0,0,31.0],[0.55,0.55,0.55],'M-ROCK-LIGHT','none','mineral enrichment'),
    item('H42/OPS03','keeper safety square','keeper-safe-zone',[35.8,0.02,34.0],[0.9,0.02,1.0],'M-CONCRETE','none','service landing'),
    item('H42/OPS04','habitat camera','habitat-camera',[24.5,0,23.5],[0.24,3.8,0.24],'M-STEEL-DARK','none','wallow monitoring',{ facing:[31,30] }),
  ],
  'H43-lion': [
    item('H43/OPS01','protected meat hatch','feed-trough',[48.7,0,26.0],[1.0,0.32,0.7],'M-FOOD-STEEL','none','keeper feeding station'),
    item('H43/OPS02','fresh water basin','water-trough',[43.2,0,35.4],[1.1,0.32,0.65],'M-ROCK','none','drinking water'),
    item('H43/OPS03','keeper safety square','keeper-safe-zone',[49.2,0.02,34.0],[0.8,0.02,1.0],'M-CONCRETE','none','service landing'),
    item('H43/OPS04','habitat camera','habitat-camera',[42.0,0,24.5],[0.24,3.8,0.24],'M-STEEL-DARK','none','kopje and shade monitoring',{ facing:[46,30] }),
  ],
};

const objectNames = {
  'rock-cluster':'rock cluster','rock-slope':'rock slope','rock-shelf':'rock shelf',kopje:'kopje',
  'shade-rock':'shade rock','log':'ground log','deadfall-log':'deadfall log','scrub-log':'scrub log',
  den:'animal den','rabbit-shelter':'rabbit shelter','heated-shelter':'heated shelter',
  'keeper-landing':'keeper landing','shade-shelter':'shade shelter','feed-trough':'feed trough',
  'water-trough':'water trough',feeder:'feeder','feed-pan':'feed pan','scrub-post':'scrub post',
  'nest-island':'nest island','reed-bed':'reed bed','nest-platform':'nest platform',
  'shallow-pool':'shallow pool','mud-wallow':'mud wallow',pine:'pine tree','hay-rack':'hay rack',
  'browse-rack':'browse rack','tree-climb':'tree climb','climbing-tower':'climbing tower',
  'rope-bridge':'rope bridge','nest-box':'nest box','tea-pavilion':'tea pavilion',
  footbridge:'footbridge',barn:'barn',handwash:'handwash station','hay-bale':'hay bale',
  'rope-network':'rope network',acacia:'acacia tree',
};

function parentGround(h, g, i) {
  const id = `${h.id}/S${String(i + 1).padStart(2, '0')}`;
  if (g.rect) {
    const water = /water|pool/.test(g.kind);
    return volume(id, g.kind.replaceAll('-', ' '), water ? 'pool-volume' : 'surface-rect',
      g.rect, water ? -(g.depth || 0.15) : 0, water ? (g.depth || 0.15) : 0.02,
      /water|pool/.test(g.kind) ? 'M-WATER' : /sand|scree|island/.test(g.kind) ? 'M-SAND' :
        /mud/.test(g.kind) ? 'M-MUD' : /forest/.test(g.kind) ? 'M-FOREST' :
          /rock/.test(g.kind) ? 'M-ROCK' : 'M-MEADOW', 'none', 'primary habitat substrate',
      { sourceKind:g.kind });
  }
  return {
    id, label:g.kind.replaceAll('-', ' '), archetype:'surface-rect', centres:g.centres,
    radius:0.72, y:0.02, material:'M-MUD', collision:'none', purpose:'mud nesting islands',
  };
}

function parentObject(h, o, i) {
  const id = `${h.id}/O${String(i + 1).padStart(2, '0')}`;
  const label = objectNames[o.type] || o.type;
  const c = o.rect ? center(o.rect) : null;
  const d = o.rect ? dims(o.rect) : null;
  const p = o.at ? [o.at[0], 0, o.at[1]] : c ? [c[0], 0, c[1]] : null;
  if (/rock-cluster|rock-slope|rock-shelf|kopje|shade-rock/.test(o.type)) {
    const s = o.scale || (d ? Math.min(...d) * 0.34 : 1.2), ht = o.height || 1.3;
    return item(id,label,'rock-cluster',p,[r3(s*2.4),ht,r3(s*2.0)],'M-ROCK','none',
      'climbing, shade and habitat structure',{ source:o, seed:`${h.id}-${id}` });
  }
  if (/^(log|deadfall-log|scrub-log)$/.test(o.type))
    return item(id,label,'ground-log',p,[o.type==='scrub-log'?2:3,0.48,0.4],'M-TIMBER','none',
      'scratching and enrichment',{ yaw:o.yaw || 0, source:o });
  if (/^(den|rabbit-shelter|heated-shelter)$/.test(o.type))
    return volume(id,label,'animal-den',o.rect,0,1.24,'M-ROCK','none','covered retreat',{ source:o });
  if (o.type === 'keeper-landing')
    return surface(id,label,o.rect,0.016,'M-CONCRETE','dry staff entry landing',{ source:o });
  if (o.type === 'shade-shelter')
    return item(id,label,'animal-shelter',p,[d[0],o.height||3.2,d[1]],'M-TIMBER-DARK','none',
      'shade and rain cover',{ source:o });
  if (/^(feed-trough|water-trough|feeder|feed-pan)$/.test(o.type))
    return item(id,label,o.type==='water-trough'?'water-trough':'feed-trough',p,
      o.type==='feed-pan'?[0.85,0.34,0.85]:[1.35,0.34,0.55],
      o.type==='water-trough'?'M-WATER-LIGHT':'M-FOOD-STEEL','none','feeding or drinking station',{ source:o });
  if (o.type === 'scrub-post')
    return item(id,label,'scrub-post',p,[0.32,1.5,0.32],'M-TIMBER-DARK','none','rubbing enrichment',{ source:o });
  if (o.type === 'nest-island')
    return item(id,label,'nest-platform',p,[2*(o.radius||1),0.2,2*(o.radius||1)],'M-EARTH','none','nesting',{ source:o });
  if (o.type === 'reed-bed')
    return item(id,label,'tree',p,[2.2,1.2,2.2],'M-WILLOW','none','wetland cover',{ count:o.count||16, noTrunk:true, source:o });
  if (o.type === 'nest-platform')
    return item(id,label,'nest-platform',p,[1.44,0.2,1.44],'M-TIMBER','none','raised nesting',{ source:o });
  if (/^(shallow-pool|mud-wallow)$/.test(o.type))
    return volume(id,label,'pool-volume',o.rect,0,o.type==='shallow-pool'?0.22:0.18,
      o.type==='shallow-pool'?'M-WATER-LIGHT':'M-MUD','none','water or wallow enrichment',{ source:o });
  if (/^(pine|acacia)$/.test(o.type))
    return item(id,label,'tree',p,[2.8,o.height||5.2,2.8],o.type==='pine'?'M-PINE':'M-FOLIAGE','body',
      'shade and browse',{ species:o.type, source:o });
  if (/^(hay-rack|browse-rack)$/.test(o.type))
    return item(id,label,'climbing-frame',p,[1.6,o.height||1.7,0.6],'M-TIMBER','none','elevated feed rack',{ source:o });
  if (/^(tree-climb|climbing-tower)$/.test(o.type))
    return item(id,label,'climbing-frame',p,[3.2,o.height||4,3.2],'M-TIMBER-DARK','none','climbing enrichment',{ source:o });
  if (o.type === 'rope-bridge') {
    const dx=o.to[0]-o.from[0], dz=o.to[1]-o.from[1], len=Math.hypot(dx,dz);
    return item(id,label,'climbing-frame',[(o.from[0]+o.to[0])/2,o.height,(o.from[1]+o.to[1])/2],
      [r3(len),0.13,0.13],'M-TIMBER','none','canopy crossing',{ yaw:r3(-Math.atan2(dz,dx)), source:o });
  }
  if (o.type === 'nest-box')
    return item(id,label,'animal-den',[o.at[0],o.height||2.4,o.at[1]],[0.7,0.72,0.65],'M-TIMBER','none',
      'raised retreat',{ mountingHeight:o.height||2.4, source:o });
  if (o.type === 'tea-pavilion')
    return { id,label,archetype:'building-reference',building:o.building,collision:'inherited',purpose:'island pavilion',source:o };
  if (o.type === 'footbridge')
    return volume(id,label,'box-fixture',o.rect,0.42,0.16,'M-TIMBER','body','public bridge to pavilion',{ rails:true, source:o });
  if (o.type === 'barn')
    return volume(id,label,'box-fixture',o.rect,0,o.height||3.5,'M-BRICK','camera-blocker','animal shelter and feed store',
      { roofMaterial:'M-ROOF-GREEN', source:o });
  if (o.type === 'handwash')
    return item(id,label,'sanitary-fixture',p,[0.5,1.24,0.5],'M-STEEL','body','visitor hand washing',{ source:o });
  if (o.type === 'hay-bale')
    return item(id,label,'cylinder-fixture',p,[0.96,0.92,0.96],'M-SAND','none','climbing and forage',{ yaw:PI/2, source:o });
  if (o.type === 'rope-network')
    return volume(id,label,'climbing-frame',o.rect,0,o.height||3.2,'M-TIMBER','none','climbing network',{ source:o });
  return item(id,label,'box-fixture',p || [0,0,0],d?[d[0],0.7,d[1]]:[0.72,0.7,0.72],
    'M-ROCK','none','habitat enrichment',{ source:o });
}

const expansionHabitats = parent.habitats.map(h => ({
  id:h.id,
  label:h.species.join('／') + '栖息地',
  district:h.district,
  species:h.species,
  bounds:[h.bounds.x0,h.bounds.x1,h.bounds.z0,h.bounds.z1],
  publicSide:h.publicSide,
  viewingPath:h.viewingPath,
  publicFocus:h.focus,
  barrierSource:{ file:'ZOO-EXPANSION-BLUEPRINT.json', habitat:h.id, archetype:h.barrier.archetypeId },
  gates:{ service:h.serviceGate || null, public:h.publicGates || [], animal:h.animalGates || [] },
  population:h.animalSlots.map((s,i)=>({
    id:`${h.id}/A${String(i+1).padStart(2,'0')}`,
    slotId:s.id,
    species:h.species[i % h.species.length],
    at:[r3(h.bounds.x0+(h.bounds.x1-h.bounds.x0)*s.uv[0]),0,
      r3(h.bounds.z0+(h.bounds.z1-h.bounds.z0)*s.uv[1])],
    act:s.act,
    hours:[7,20],
  })),
  contents:[
    ...h.ground.map((g,i)=>parentGround(h,g,i)),
    ...h.objects.map((o,i)=>parentObject(h,o,i)),
    ...(habitatOps[h.id] || []),
  ],
  activityAnchors:h.animalSlots.map((s,i)=>({
    id:`${h.id}/Z${String(i+1).padStart(2,'0')}`,
    label:s.id,
    at:[r3(h.bounds.x0+(h.bounds.x1-h.bounds.x0)*s.uv[0]),0,
      r3(h.bounds.z0+(h.bounds.z1-h.bounds.z0)*s.uv[1])],
    acts:[s.act],
  })),
}));

const buildingFixtures = {
  'B01-west-gate-pavilion': [
    item('B01/FIX01','south ticket reader','box-fixture',[-56.05,0,21.1],[0.28,1.1,0.34],'M-STEEL-DARK','body','secondary-entry ticket validation',{ interaction:{ tag:'检票', focus:[-57.0,21.1], reach:1.5 } }),
    item('B01/FIX02','north ticket reader','box-fixture',[-56.05,0,26.9],[0.28,1.1,0.34],'M-STEEL-DARK','body','secondary-entry ticket validation'),
    item('B01/FIX03','entry status screen','screen',[-55.62,2.25,24.0],[0.05,0.75,1.9],'M-SCREEN','none','hours, ticket status and accessible route',{ yaw:PI/2, interaction:{ tag:'西门', focus:[-57.0,24], reach:2.0 } }),
    item('B01/FIX04','emergency intercom','box-fixture',[-55.64,0.95,22.3],[0.08,0.3,0.22],'M-STEEL','none','visitor assistance',{ yaw:PI/2 }),
    item('B01/FIX05','passage ceiling light A','light-fixture',[-56.75,4.15,22.0],[0.65,0.08,0.18],'M-CERAMIC','none','night entry illumination',{ lumens:1100, temperatureK:3000 }),
    item('B01/FIX06','passage ceiling light B','light-fixture',[-56.75,4.15,26.0],[0.65,0.08,0.18],'M-CERAMIC','none','night entry illumination',{ lumens:1100, temperatureK:3000 }),
  ],
  'B02-west-restroom': [
    item('B02/women/FIX01','west toilet','sanitary-fixture',[-33.35,0,23.25],[0.55,0.75,0.72],'M-CERAMIC','body','women restroom toilet',{ room:'women' }),
    item('B02/women/FIX02','east toilet','sanitary-fixture',[-32.15,0,23.25],[0.55,0.75,0.72],'M-CERAMIC','body','women restroom toilet',{ room:'women' }),
    item('B02/women/FIX03','west cubicle partition','box-fixture',[-33.35,0,23.55],[1.02,1.5,0.08],'M-RENDER','body','privacy partition',{ room:'women' }),
    item('B02/women/FIX04','east cubicle partition','box-fixture',[-32.15,0,23.55],[1.02,1.5,0.08],'M-RENDER','body','privacy partition',{ room:'women' }),
    item('B02/women/FIX05','washbasin A','sanitary-fixture',[-33.25,0,21.55],[0.62,0.88,0.38],'M-CERAMIC','none','hand washing',{ room:'women' }),
    item('B02/women/FIX06','washbasin B','sanitary-fixture',[-32.25,0,21.55],[0.62,0.88,0.38],'M-CERAMIC','none','hand washing',{ room:'women' }),
    item('B02/women/FIX07','mirror strip','screen',[-32.75,1.42,21.05],[1.8,0.65,0.03],'M-GLASS','none','mirror',{ room:'women' }),
    item('B02/women/FIX08','hand dryer','box-fixture',[-31.55,1.1,21.35],[0.28,0.35,0.18],'M-CERAMIC','none','hand drying',{ room:'women' }),
    item('B02/family/FIX01','accessible toilet','sanitary-fixture',[-30.15,0,23.42],[0.62,0.88,0.56],'M-CERAMIC','body','accessible family toilet',{ room:'accessible-family' }),
    item('B02/family/FIX02','accessible basin','sanitary-fixture',[-29.4,0,22.0],[0.72,0.86,0.4],'M-CERAMIC','none','accessible hand washing',{ room:'accessible-family' }),
    item('B02/family/FIX03','folding transfer rail','ground-log',[-29.55,0.72,23.33],[0.72,0.07,0.07],'M-STEEL','none','toilet transfer support',{ room:'accessible-family', yaw:PI/2 }),
    item('B02/family/FIX04','baby changing table','cabinet',[-30.65,0,21.55],[0.75,0.92,0.52],'M-CERAMIC','body','family changing station',{ room:'accessible-family' }),
    item('B02/family/FIX05','emergency pull cord','light-fixture',[-29.15,1.1,23.65],[0.08,1.8,0.08],'M-RED-LIGHT','none','accessible alarm',{ room:'accessible-family' }),
    item('B02/FIX-L01','ceiling light women','light-fixture',[-32.6,2.85,22.6],[0.8,0.06,0.22],'M-CERAMIC','none','room lighting',{ room:'women', lumens:1400, temperatureK:3500 }),
    item('B02/FIX-L02','ceiling light family','light-fixture',[-30.1,2.85,22.6],[0.7,0.06,0.22],'M-CERAMIC','none','room lighting',{ room:'accessible-family', lumens:1000, temperatureK:3500 }),
  ],
  'B03-east-rest-hub': [
    item('B03/snack/FIX01','snack service counter','counter',[44.0,0,21.62],[2.7,1.38,0.72],'M-TIMBER-DARK','body','snack sales and pickup',{ room:'snack-counter', interaction:{ tag:'小卖部', focus:[44,20.15], reach:2.0 } }),
    item('B03/snack/FIX02','point-of-sale terminal','box-fixture',[43.25,1.25,21.35],[0.32,0.28,0.24],'M-SCREEN','none','sales terminal',{ room:'snack-counter' }),
    item('B03/snack/FIX03','under-counter chiller','cabinet',[44.45,0,22.2],[0.9,0.86,0.55],'M-FOOD-STEEL','body','cold drinks storage',{ room:'snack-counter' }),
    item('B03/snack/FIX04','three-bay display shelf','shelf',[44.0,1.42,22.52],[2.62,0.9,0.28],'M-TIMBER','none','packaged snacks display',{ room:'snack-counter', bays:3 }),
    item('B03/snack/FIX05','menu screen','screen',[42.62,1.9,21.86],[0.06,0.7,1.15],'M-SCREEN','none','bilingual menu',{ room:'snack-counter', yaw:PI/2 }),
    item('B03/toilets/FIX01','toilet A','sanitary-fixture',[47.0,0,22.08],[0.55,0.75,0.72],'M-CERAMIC','body','visitor toilet',{ room:'toilets' }),
    item('B03/toilets/FIX02','toilet B','sanitary-fixture',[48.25,0,22.08],[0.55,0.75,0.72],'M-CERAMIC','body','visitor toilet',{ room:'toilets' }),
    item('B03/toilets/FIX03','cubicle partition A','box-fixture',[47.0,0,22.50],[1.0,1.55,0.08],'M-RENDER','body','privacy partition',{ room:'toilets' }),
    item('B03/toilets/FIX04','cubicle partition B','box-fixture',[48.25,0,22.50],[1.0,1.55,0.08],'M-RENDER','body','privacy partition',{ room:'toilets' }),
    item('B03/toilets/FIX05','washbasin','sanitary-fixture',[49.05,0,21.45],[0.66,0.86,0.38],'M-CERAMIC','none','hand washing',{ room:'toilets' }),
    item('B03/toilets/FIX06','mirror','screen',[49.46,1.38,21.45],[0.03,0.64,0.72],'M-GLASS','none','mirror',{ room:'toilets', yaw:PI/2 }),
    item('B03/FIX-L01','hub ceiling light A','light-fixture',[44.0,2.85,21.85],[0.75,0.06,0.22],'M-CERAMIC','none','counter lighting',{ lumens:1300, temperatureK:3300 }),
    item('B03/FIX-L02','hub ceiling light B','light-fixture',[47.8,2.85,21.85],[0.75,0.06,0.22],'M-CERAMIC','none','toilet lighting',{ lumens:1300, temperatureK:3500 }),
  ],
  'B04-lake-pavilion': [
    item('B04/tea/FIX01','tea service counter','counter',[-11.55,0.5,29.5],[1.5,1.05,3.0],'M-TIMBER-DARK','body','tea preparation and sales',{ room:'tea-counter', interaction:{ tag:'茶亭', focus:[-9.0,29], reach:2.2 } }),
    item('B04/tea/FIX02','hot-water boiler','cylinder-fixture',[-12.0,1.1,30.25],[0.42,0.75,0.42],'M-FOOD-STEEL','none','tea water heating',{ room:'tea-counter' }),
    item('B04/tea/FIX03','handwash sink','sanitary-fixture',[-12.0,0.5,28.7],[0.6,0.9,0.45],'M-FOOD-STEEL','none','staff hand washing',{ room:'tea-counter' }),
    item('B04/tea/FIX04','tea shelf','shelf',[-12.2,0.5,29.5],[0.32,1.9,1.8],'M-TIMBER','body','tea and cup storage',{ room:'tea-counter' }),
    item('B04/seating/FIX01','communal tea table','table',[-10.1,0.5,29.5],[0.82,0.82,1.55],'M-TIMBER','body','visitor seating',{ room:'seating' }),
    item('B04/seating/FIX02','stool north','chair',[-9.65,0.5,30.2],[0.42,0.48,0.42],'M-TIMBER','none','visitor seat',{ room:'seating' }),
    item('B04/seating/FIX03','stool south','chair',[-9.65,0.5,28.8],[0.42,0.48,0.42],'M-TIMBER','none','visitor seat',{ room:'seating' }),
    item('B04/seating/FIX04','lake binocular','box-fixture',[-9.55,1.1,30.85],[0.28,1.35,0.28],'M-STEEL-DARK','body','waterfowl viewing',{ room:'seating', interaction:{ tag:'望远镜', focus:[-9.0,30.4], reach:1.5 } }),
    item('B04/FIX05','life ring cabinet','cabinet',[-12.45,0.5,27.85],[0.55,0.85,0.22],'M-STEEL','none','water safety'),
    item('B04/FIX-L01','pavilion pendant','light-fixture',[-11.0,3.6,29.5],[0.46,0.34,0.46],'M-ROOF-RED','none','evening pavilion light',{ lumens:900, temperatureK:2700 }),
  ],
  'B05-conservation-west': [
    ...[[-15.45,56.7],[-13.35,56.7],[-15.45,58.25],[-13.35,58.25],[-15.45,59.8],[-13.35,59.8]].map((p,i)=>
      item(`B05/classroom/DESK${String(i+1).padStart(2,'0')}`,`classroom desk ${i+1}`,'table',[p[0],0,p[1]],[1.2,0.72,0.48],'M-TIMBER','body','student work surface',{ room:'classroom' })),
    ...[[-15.45,56.35],[-13.35,56.35],[-15.45,57.9],[-13.35,57.9],[-15.45,59.45],[-13.35,59.45]].map((p,i)=>
      item(`B05/classroom/CHAIR${String(i+1).padStart(2,'0')}`,`classroom chair ${i+1}`,'chair',[p[0],0,p[1]],[0.45,0.82,0.45],'M-TIMBER','none','student seat',{ room:'classroom', yaw:0 })),
    item('B05/classroom/FIX01','teaching wall','screen',[-14.25,1.85,61.27],[3.5,1.35,0.08],'M-SCREEN','none','bilingual conservation lesson wall',{ room:'classroom', interaction:{ tag:'保护动物', focus:[-14.25,60.0], reach:2.0 } }),
    item('B05/classroom/FIX02','teacher desk','table',[-14.25,0,60.65],[1.6,0.76,0.62],'M-TIMBER-DARK','body','instructor work surface',{ room:'classroom' }),
    item('B05/classroom/FIX03','equipment cabinet','cabinet',[-16.1,0,60.35],[0.55,1.9,1.35],'M-TIMBER-DARK','body','class materials storage',{ room:'classroom' }),
    ...[[-10.1,57.2],[-8.0,57.2],[-10.1,59.6],[-8.0,59.6]].map((p,i)=>
      item(`B05/gallery/CASE${String(i+1).padStart(2,'0')}`,`panda science display ${i+1}`,'display-case',[p[0],0,p[1]],[1.25,1.25,0.72],'M-GLASS','body','panda conservation specimen and model',{ room:'panda-lab-gallery' })),
    item('B05/gallery/FIX05','genetics touchscreen','screen',[-6.72,1.35,56.8],[0.08,0.9,1.25],'M-SCREEN','none','interactive genetics exhibit',{ room:'panda-lab-gallery', yaw:-PI/2, interaction:{ tag:'熊猫保护', focus:[-8.0,56.8], reach:2.0 } }),
    item('B05/gallery/FIX06','lab viewing window','box-fixture',[-6.55,1.6,59.8],[0.08,1.6,2.4],'M-GLASS','none','view into offstage conservation lab',{ room:'panda-lab-gallery', yaw:PI/2 }),
    item('B05/FIX-L01','classroom light row','light-fixture',[-14.3,4.4,58.5],[0.24,0.08,4.5],'M-CERAMIC','none','classroom lighting',{ lumens:3200, temperatureK:3800 }),
    item('B05/FIX-L02','gallery light row','light-fixture',[-9.0,4.4,58.5],[0.24,0.08,4.5],'M-CERAMIC','none','gallery lighting',{ lumens:2800, temperatureK:3500 }),
  ],
  'B06-conservation-east': [
    item('B06/aid/FIX01','examination couch','table',[4.15,0,57.18],[0.95,0.82,2.05],'M-CERAMIC','body','first-aid examination',{ room:'first-aid' }),
    item('B06/aid/FIX02','medicine cabinet','cabinet',[5.42,0,57.78],[0.72,2.04,0.42],'M-RENDER','body','first-aid supplies',{ room:'first-aid' }),
    item('B06/aid/FIX03','oxygen cylinder','cylinder-fixture',[3.25,0,56.25],[0.32,1.35,0.32],'M-STEEL','body','emergency oxygen',{ room:'first-aid' }),
    item('B06/aid/FIX04','clinical sink','sanitary-fixture',[5.45,0,56.1],[0.6,0.9,0.45],'M-FOOD-STEEL','none','hand washing',{ room:'first-aid' }),
    item('B06/aid/FIX05','AED cabinet','cabinet',[2.62,1.3,57.8],[0.18,0.55,0.48],'M-RED-LIGHT','none','public defibrillator',{ room:'first-aid', interaction:{ tag:'急救', focus:[3.3,57.8], reach:1.5 } }),
    ...[[7.35,56.8],[8.25,58.3],[7.35,60.0]].map((p,i)=>
      item(`B06/exhibition/PLINTH${String(i+1).padStart(2,'0')}`,`conservation plinth ${i+1}`,'display-case',[p[0],0,p[1]],[0.74,1.6,0.74],'M-RENDER','body','rotating conservation object',{ room:'exhibition' })),
    item('B06/exhibition/FIX04','species recovery wall','screen',[6.62,1.65,60.85],[0.08,1.35,2.6],'M-SCREEN','none','species recovery timeline',{ room:'exhibition', yaw:PI/2, interaction:{ tag:'保育展', focus:[7.5,60.5], reach:1.8 } }),
    ...[56.5,58.1,59.7].map((z,i)=>
      item(`B06/shop/SHELF${String(i+1).padStart(2,'0')}`,`library shelf ${i+1}`,'shelf',[15.55,0,z],[0.6,2.45,1.18],'M-TIMBER-DARK','body','books and learning materials',{ room:'library-shop' })),
    item('B06/shop/FIX04','sales counter','counter',[11.0,0,56.25],[2.25,1.05,0.62],'M-TIMBER-DARK','body','bookshop checkout',{ room:'library-shop', interaction:{ tag:'图书商店', focus:[11.0,55.3], reach:1.8 } }),
    item('B06/shop/FIX05','central book table','table',[12.6,0,59.0],[1.6,0.78,0.85],'M-TIMBER','body','featured books',{ room:'library-shop' }),
    item('B06/shop/FIX06','children reading bench','chair',[10.5,0,60.7],[1.8,0.78,0.55],'M-TIMBER','body','reading seat',{ room:'library-shop', yaw:PI }),
    item('B06/FIX-L01','first-aid ceiling light','light-fixture',[4.25,4.4,57.0],[0.25,0.08,2.2],'M-CERAMIC','none','clinical lighting',{ lumens:2400, temperatureK:4000 }),
    item('B06/FIX-L02','exhibition track light','light-fixture',[7.75,4.45,58.6],[0.2,0.1,4.2],'M-CERAMIC','none','exhibit lighting',{ lumens:2800, temperatureK:3500 }),
    item('B06/FIX-L03','shop ceiling light','light-fixture',[12.8,4.4,58.6],[0.25,0.08,4.2],'M-CERAMIC','none','shop lighting',{ lumens:3000, temperatureK:3300 }),
  ],
  'B06b-conservation-bridge': [
    item('B06b/FIX01','west lift car','box-fixture',[-6.55,0,59.5],[1.4,4.2,2.6],'M-GLASS','body','accessible bridge lift',{ levels:[0,4.2], interaction:{ tag:'电梯', focus:[-7.7,59.5], reach:1.7 } }),
    item('B06b/FIX02','east lift car','box-fixture',[2.55,0,59.5],[1.4,4.2,2.6],'M-GLASS','body','accessible bridge lift',{ levels:[0,4.2], interaction:{ tag:'电梯', focus:[3.7,59.5], reach:1.7 } }),
    item('B06b/FIX03','west bridge display','display-case',[-4.2,4.2,60.55],[1.35,1.25,0.32],'M-GLASS','none','conservation success model',{ room:'bridge-gallery' }),
    item('B06b/FIX04','centre bridge display','display-case',[-1.8,4.2,60.55],[1.35,1.25,0.32],'M-GLASS','none','migration corridor model',{ room:'bridge-gallery' }),
    item('B06b/FIX05','east bridge display','display-case',[0.6,4.2,60.55],[1.35,1.25,0.32],'M-GLASS','none','field research model',{ room:'bridge-gallery' }),
    item('B06b/FIX06','bridge audio station','box-fixture',[-2.0,4.2,58.35],[0.45,1.2,0.32],'M-SCREEN','none','animal-call listening point',{ room:'bridge-gallery', interaction:{ tag:'动物声音', focus:[-2.0,59.0], reach:1.5 } }),
    item('B06b/FIX-L01','bridge light strip','light-fixture',[-2.0,6.8,59.5],[6.5,0.08,0.14],'M-CERAMIC','none','gallery lighting',{ lumens:2600, temperatureK:3300 }),
  ],
  'B07-operations-campus': [
    item('B07/hospital/FIX01','veterinary exam table','table',[-47.0,0,49.1],[2.05,1.11,0.78],'M-CERAMIC','body','animal examination',{ room:'animal-hospital' }),
    item('B07/hospital/FIX02','imaging screen','screen',[-49.0,1.78,49.68],[0.04,1.2,1.52],'M-SCREEN','none','radiography display',{ room:'animal-hospital' }),
    item('B07/hospital/FIX03','imaging console','cabinet',[-49.25,0,48.2],[0.75,1.1,0.6],'M-STEEL-DARK','body','imaging controls',{ room:'animal-hospital' }),
    item('B07/hospital/FIX04','recovery kennel A','box-fixture',[-45.0,0,51.4],[1.55,1.35,1.2],'M-STEEL','body','post-treatment recovery',{ room:'animal-hospital' }),
    item('B07/hospital/FIX05','recovery kennel B','box-fixture',[-45.0,0,53.0],[1.55,1.35,1.2],'M-STEEL','body','post-treatment recovery',{ room:'animal-hospital' }),
    item('B07/hospital/FIX06','surgical prep sink','sanitary-fixture',[-49.1,0,53.55],[1.0,0.92,0.55],'M-FOOD-STEEL','body','clinical hand washing',{ room:'animal-hospital' }),
    item('B07/hospital/FIX07','medicine refrigerator','cabinet',[-44.5,0,48.0],[0.75,1.9,0.75],'M-FOOD-STEEL','body','temperature-controlled medicine',{ room:'animal-hospital' }),
    item('B07/hospital/FIX08','public viewing window','box-fixture',[-47.0,0.76,42.5],[3.4,2.36,0.1],'M-GLASS','threshold','visitor view into animal hospital',{ room:'animal-hospital', allowOutside:'south public viewing facade', interaction:{ tag:'动物医院', focus:[-47,40.0], reach:2.6 } }),
    ...[[-49.0,57.0],[-46.6,57.0],[-49.0,59.25],[-46.6,59.25]].map((p,i)=>
      item(`B07/quarantine/PEN${String(i+1).padStart(2,'0')}`,`quarantine pen ${i+1}`,'mesh-enclosure',[p[0],0,p[1]],[1.8,2.2,1.6],'M-STEEL','body','isolated animal holding',{ room:'quarantine' })),
    item('B07/quarantine/FIX05','wash-down drain','floor-drain',[-45.0,0,58.0],[0.45,0.03,3.8],'M-STEEL','none','quarantine cleaning',{ room:'quarantine' }),
    item('B07/quarantine/FIX06','PPE cabinet','cabinet',[-49.55,0,56.0],[0.45,1.9,0.9],'M-STEEL','body','protective equipment',{ room:'quarantine' }),
    item('B07/feed/FIX01','food preparation table','table',[-41.5,0,49.1],[1.8,0.9,0.75],'M-FOOD-STEEL','body','animal diet preparation',{ room:'feed-kitchen' }),
    item('B07/feed/FIX02','double sink','sanitary-fixture',[-42.55,0,51.35],[0.75,0.92,1.0],'M-FOOD-STEEL','body','food washing',{ room:'feed-kitchen' }),
    item('B07/feed/FIX03','walk-in chiller','cabinet',[-40.55,0,51.1],[0.8,2.4,1.45],'M-FOOD-STEEL','body','cold feed storage',{ room:'feed-kitchen' }),
    item('B07/feed/FIX04','dry-feed shelving','shelf',[-42.55,0,47.6],[0.55,2.1,1.1],'M-STEEL','body','dry feed storage',{ room:'feed-kitchen' }),
    item('B07/feed/FIX05','platform scale','box-fixture',[-40.8,0,48.0],[0.85,0.12,0.85],'M-STEEL','none','portion weighing',{ room:'feed-kitchen' }),
    ...[-42.55,-42.1,-41.65,-41.2,-40.75,-40.3].map((x,i)=>
      item(`B07/lockers/LOCKER${String(i+1).padStart(2,'0')}`,`staff locker ${i+1}`,'cabinet',[x,0,55.65],[0.45,1.9,0.48],'M-STEEL-DARK','body','staff clothing storage',{ room:'staff-lockers' })),
    item('B07/lockers/FIX07','changing bench','chair',[-41.5,0,54.1],[1.8,0.48,0.48],'M-TIMBER','body','staff changing',{ room:'staff-lockers' }),
    item('B07/lockers/FIX08','staff washbasin','sanitary-fixture',[-40.3,0,53.35],[0.65,0.9,0.45],'M-CERAMIC','none','hand washing',{ room:'staff-lockers' }),
    ...[-42.5,-41.7,-40.9,-40.1].map((x,i)=>
      item(`B07/yard/CRATE${String(i+1).padStart(2,'0')}`,`transport crate ${i+1}`,'box-fixture',[x,0,58.75],[0.62,0.76,0.72],'M-STEEL-DARK','body','animal transport equipment',{ room:'service-yard' })),
    item('B07/yard/FIX05','service-cart bay','surface-rect',[-40.0,0,60.0],[1.8,0.02,0.9],'M-CONCRETE','none','cart parking',{ room:'service-yard' }),
    item('B07/yard/FIX06','hose reel','box-fixture',[-42.7,1.1,60.2],[0.2,0.65,0.65],'M-STEEL','none','yard wash-down',{ room:'service-yard' }),
    item('B07/FIX-L01','hospital clinical light','light-fixture',[-47.0,4.15,50.8],[0.3,0.08,4.6],'M-CERAMIC','none','clinical lighting',{ lumens:4200, temperatureK:4200 }),
    item('B07/FIX-L02','operations yard floodlight','light-fixture',[-43.2,3.8,59.8],[0.4,0.28,0.35],'M-CERAMIC','none','service-yard lighting',{ lumens:5200, temperatureK:4000 }),
  ],
  'B08-tropical-house': [
    item('B08/FIX01','public portal threshold','door-opening',[25,0,52],[0.16,2.6,3.2],'M-GLASS','threshold','transition to zoo_tropical',{ interaction:{ tag:'热带馆', focus:[23,52], reach:2.3 }, destination:'zoo_tropical' }),
    item('B08/FIX02','staff-only east gate','box-fixture',[50,0,59],[0.18,2.36,2.4],'M-STEEL-DARK','camera-blocker','staff service access'),
    item('B08/FIX03','Tropical House title sign','screen',[24.88,3.6,52],[0.08,0.8,4.2],'M-SCREEN','none','building identification',{ yaw:-PI/2 }),
    item('B08/FIX04','entry canopy light','light-fixture',[24.7,3.2,52],[0.45,0.12,2.8],'M-CERAMIC','none','portal lighting',{ lumens:1800, temperatureK:3000 }),
  ],
};

const tropicalRoomContents = {
  'T00-lobby': [
    item('T00/FIX01','information desk','counter',[-10.0,0,1.4],[1.85,0.91,0.82],'M-TIMBER-DARK','body','maps and visitor assistance',{ interaction:{ tag:'服务台', focus:[-10,0.4], reach:2.0 } }),
    item('T00/FIX02','whole-house map','screen',[-10.5,0,-2.2],[0.10,2.42,1.55],'M-SCREEN','body','local plan, entry, exit and exhibits',{ yaw:PI/2, interaction:{ tag:'导游图', focus:[-9.1,-2.2], reach:2.1 } }),
    item('T00/FIX03','entry ticket reader','box-fixture',[-11.9,0,-1.25],[0.28,1.05,0.32],'M-STEEL-DARK','body','entry count and ticket validation'),
    item('T00/FIX04','brochure rack','shelf',[-12.35,0,2.0],[0.28,1.55,0.75],'M-TIMBER','body','multilingual leaflets'),
    item('T00/FIX05','stroller parking rail','ground-log',[-11.65,0,2.2],[1.6,0.65,0.08],'M-STEEL','none','stroller parking',{ yaw:0 }),
    item('T00/FIX06','queue rail west','ground-log',[-11.3,0,-0.6],[1.8,0.9,0.07],'M-STEEL','none','entry queue management',{ yaw:0 }),
    item('T00/FIX07','queue rail east','ground-log',[-10.55,0,-0.6],[1.8,0.9,0.07],'M-STEEL','none','entry queue management',{ yaw:0 }),
    item('T00/FIX08','accessible-route switch','box-fixture',[-10.05,1.0,-1.95],[0.16,0.32,0.28],'M-SCREEN','none','accessible route overlay control',{ interaction:{ tag:'无障碍路线', focus:[-9.4,-1.9], reach:1.5 } }),
    item('T00/L01','lobby ceiling light','light-fixture',[-11.2,5.8,0],[0.3,0.08,3.0],'M-CERAMIC','none','lobby lighting',{ lumens:2200, temperatureK:3200 }),
  ],
  'T01-crocodile': [
    volume('T01/S01','crocodile pool','pool-volume',[-7.7,-2.3,-8.2,-4.2],-0.75,0.75,'M-WATER','none','swimming and submersion',{ depth:0.75, filtration:'T01/FIX07' }),
    volume('T01/S02','mud basking shelf','surface-rect',[-7.1,-3.1,-6.35,-4.75],0,0.06,'M-MUD','none','basking shelf'),
    item('T01/FIX01','basking rock','rock-cluster',[-6.45,0,-7.5],[1.7,0.55,1.4],'M-ROCK-LIGHT','none','heated basking point'),
    item('T01/FIX02','submerged log','ground-log',[-3.6,-0.18,-7.1],[2.4,0.34,0.34],'M-TIMBER-DARK','none','submerged cover',{ yaw:0.35 }),
    item('T01/FIX03','reed planting','tree',[-7.25,0,-3.65],[1.0,1.2,1.0],'M-WILLOW','none','visual cover',{ noTrunk:true, clumpCount:14 }),
    item('T01/FIX04','overhead heat lamp','light-fixture',[-6.45,3.8,-7.5],[0.42,0.28,0.42],'M-RED-LIGHT','none','basking heat',{ lumens:450, temperatureK:2400, heat:true }),
    item('T01/FIX05','protected meat hatch','feed-trough',[-2.65,0,-4.1],[0.85,0.24,0.55],'M-FOOD-STEEL','none','keeper feeding'),
    item('T01/FIX06','pool floor drain','floor-drain',[-7.1,-0.73,-7.75],[0.42,0.03,0.42],'M-STEEL','none','pool filtration intake'),
    item('T01/FIX07','filter cabinet','cabinet',[-2.35,0,-8.05],[0.55,1.5,0.85],'M-STEEL','body','pool filtration plant'),
    item('T01/FIX08','temperature sensor','box-fixture',[-2.25,1.2,-4.0],[0.12,0.22,0.18],'M-SCREEN','none','air and water monitoring'),
  ],
  'T02-river-aquarium': [
    volume('T02/S01','main aquarium water volume','pool-volume',[2.25,6.75,-8.25,-3.25],-2.2,2.2,'M-WATER','none','sturgeon and schooling fish display',{ waterLevel:2.2, frontGlassHeight:2.4 }),
    item('T02/FIX01','west river rock group','rock-cluster',[3.0,0,-7.45],[1.6,0.85,1.4],'M-ROCK','none','underwater shelter'),
    item('T02/FIX02','east river rock group','rock-cluster',[6.1,0,-6.2],[1.8,0.95,1.5],'M-ROCK-LIGHT','none','underwater shelter'),
    item('T02/FIX03','driftwood trunk','ground-log',[4.8,0.25,-7.0],[3.2,0.32,0.32],'M-TIMBER-DARK','none','river habitat structure',{ yaw:-0.45 }),
    item('T02/FIX04','aquatic plant bed A','tree',[2.8,0,-4.1],[0.9,1.15,0.9],'M-WILLOW','none','aquatic planting',{ noTrunk:true, clumpCount:18 }),
    item('T02/FIX05','aquatic plant bed B','tree',[6.2,0,-7.8],[0.9,1.2,0.9],'M-WILLOW','none','aquatic planting',{ noTrunk:true, clumpCount:18 }),
    item('T02/FIX06','bubble diffuser line','floor-drain',[4.5,-1.9,-8.0],[3.0,0.06,0.12],'M-STEEL','none','oxygenation',{ bubbles:18 }),
    item('T02/FIX07','filter return grille','floor-drain',[6.72,0.9,-5.8],[0.06,1.5,0.65],'M-STEEL','none','filtered water return',{ yaw:PI/2 }),
    item('T02/FIX08','keeper feed hatch','feed-trough',[6.45,2.25,-8.0],[0.55,0.18,0.45],'M-FOOD-STEEL','none','staff-only feeding hatch'),
    item('T02/FIX09','tank information monitor','screen',[6.95,1.45,-2.98],[1.1,0.72,0.06],'M-SCREEN','none','water temperature and species facts',{ allowOutside:'public-side interpretation face', interaction:{ tag:'中华鲟', focus:[6.2,-2.1], reach:2.2, aliasOf:'TTH-T02-01' } }),
  ],
  'T03-reptile': [
    volume('T03/FIX01','snake terrarium','mesh-enclosure',[-7.7,-4.9,3.35,8.15],0,2.4,'M-GLASS','camera-blocker','snake climate enclosure',{ front:'z0', meshTop:true }),
    volume('T03/FIX02','lizard terrarium','mesh-enclosure',[-4.65,-2.3,3.35,8.15],0,2.4,'M-GLASS','camera-blocker','lizard climate enclosure',{ front:'z0', meshTop:true }),
    item('T03/FIX03','snake climbing branch','ground-log',[-6.0,0.95,6.4],[3.8,0.26,0.26],'M-TIMBER','none','snake climbing',{ yaw:0.18 }),
    item('T03/FIX04','snake hide box','animal-den',[-6.85,0,4.25],[0.75,0.42,0.62],'M-ROCK','none','covered retreat'),
    item('T03/FIX05','snake heat lamp','light-fixture',[-6.1,2.15,5.65],[0.36,0.25,0.36],'M-RED-LIGHT','none','basking heat',{ heat:true }),
    item('T03/FIX06','lizard basking rock','rock-cluster',[-3.8,0,6.7],[1.35,0.62,1.15],'M-ROCK-LIGHT','none','basking platform'),
    item('T03/FIX07','lizard hide box','animal-den',[-2.85,0,4.15],[0.68,0.38,0.58],'M-ROCK','none','covered retreat'),
    item('T03/FIX08','lizard heat lamp','light-fixture',[-3.8,2.2,6.7],[0.36,0.25,0.36],'M-RED-LIGHT','none','basking heat',{ heat:true }),
    item('T03/FIX09','humidity monitor','screen',[-4.8,1.45,3.08],[0.72,0.35,0.06],'M-SCREEN','none','terrarium climate status'),
    item('T03/FIX10','keeper service cabinet','cabinet',[-7.5,0,8.15],[0.55,1.4,0.55],'M-STEEL','body','reptile tools and feed'),
  ],
  'T04-butterfly': [
    volume('T04/S01','west tropical planting bed','surface-rect',[2.3,4.0,3.35,8.15],0,0.18,'M-FOREST','none','nectar planting'),
    volume('T04/S02','east tropical planting bed','surface-rect',[5.0,6.7,3.35,8.15],0,0.18,'M-FOREST','none','nectar planting'),
    item('T04/FIX01','nectar tray A','feed-trough',[3.0,0.85,5.3],[0.65,0.08,0.65],'M-RUBBER','none','butterfly feeding'),
    item('T04/FIX02','nectar tray B','feed-trough',[6.0,0.85,6.3],[0.65,0.08,0.65],'M-RUBBER','none','butterfly feeding'),
    item('T04/FIX03','chrysalis cabinet','display-case',[6.55,0,7.7],[0.42,1.65,0.9],'M-GLASS','body','visible butterfly emergence',{ interaction:{ tag:'蝴蝶', focus:[5.8,7.3], reach:1.6, aliasOf:'TTH-T04-01' } }),
    item('T04/FIX04','mist nozzle west','light-fixture',[3.4,4.2,5.0],[0.15,0.15,0.15],'M-STEEL','none','humidity control',{ system:'water-mist' }),
    item('T04/FIX05','mist nozzle east','light-fixture',[5.8,4.2,7.1],[0.15,0.15,0.15],'M-STEEL','none','humidity control',{ system:'water-mist' }),
    item('T04/FIX06','west airlock sign','screen',[2.05,2.3,5.8],[0.06,0.5,1.1],'M-SCREEN','none','keep both doors closed',{ yaw:PI/2 }),
    item('T04/FIX07','east airlock sign','screen',[6.95,2.3,5.8],[0.06,0.5,1.1],'M-SCREEN','none','keep both doors closed',{ yaw:-PI/2 }),
    item('T04/FIX08','floor drain','floor-drain',[4.5,0,8.0],[0.45,0.03,0.45],'M-STEEL','none','greenhouse drainage'),
  ],
  'T05-nocturnal': [
    volume('T05/FIX01','dark mesh flight volume','mesh-enclosure',[9.15,11.35,3.2,5.85],0,5.45,'M-MESH','camera-blocker','fruit bat flight space'),
    item('T05/FIX02','high roost beam','ground-log',[10.25,4.85,4.5],[2.1,0.18,0.18],'M-TIMBER-DARK','none','bat roost',{ yaw:PI/2 }),
    item('T05/FIX03','cave roost box A','animal-den',[9.55,3.65,5.65],[0.65,0.62,0.45],'M-ROCK','none','dark retreat'),
    item('T05/FIX04','cave roost box B','animal-den',[10.95,3.65,5.65],[0.65,0.62,0.45],'M-ROCK','none','dark retreat'),
    item('T05/FIX05','fruit feeder','feed-trough',[10.25,1.65,3.65],[0.85,0.18,0.55],'M-FOOD-STEEL','none','fruit feeding'),
    item('T05/FIX06','red service light A','light-fixture',[9.5,4.6,3.4],[0.35,0.18,0.35],'M-RED-LIGHT','none','low-impact keeper light',{ lumens:120, temperatureK:1800 }),
    item('T05/FIX07','red service light B','light-fixture',[11.0,4.6,5.6],[0.35,0.18,0.35],'M-RED-LIGHT','none','low-impact keeper light',{ lumens:120, temperatureK:1800 }),
    item('T05/FIX08','wash-down drain','floor-drain',[9.5,0,5.5],[0.42,0.03,0.42],'M-STEEL','none','enclosure cleaning'),
  ],
  'T06-atrium': [
    item('T06/FIX01','canopy tree','tree',[0,0,4.8],[3.5,5.5,3.5],'M-FOLIAGE','body','atrium canopy and shade'),
    item('T06/FIX02','rock waterfall','box-fixture',[0,0,7.4],[1.8,4.5,0.6],'M-ROCK','camera-blocker','central water feature'),
    volume('T06/FIX03','waterfall receiving pool','pool-volume',[-1.7,1.7,5.5,8.1],0,0.38,'M-WATER','none','waterfall basin',{ allowOutside:'atrium pool overlaps the TP06 public path by design' }),
    item('T06/FIX04','west rock group','rock-cluster',[-0.75,0,6.9],[1.4,0.75,1.2],'M-ROCK','none','pool edge'),
    item('T06/FIX05','east rock group','rock-cluster',[0.85,0,6.5],[1.4,0.75,1.2],'M-ROCK-LIGHT','none','pool edge'),
    item('T06/FIX06','south canopy vine','climbing-frame',[0,1.0,-5.8],[1.7,4.2,1.4],'M-FOLIAGE','none','vertical planting'),
    item('T06/FIX07','north canopy vine','climbing-frame',[0,1.0,2.2],[1.7,4.2,1.4],'M-FOLIAGE','none','vertical planting'),
    item('T06/FIX08','mist nozzle south','light-fixture',[0,5.2,-3.0],[0.15,0.15,0.15],'M-STEEL','none','humidity control',{ system:'water-mist' }),
    item('T06/FIX09','mist nozzle north','light-fixture',[0,5.2,3.5],[0.15,0.15,0.15],'M-STEEL','none','humidity control',{ system:'water-mist' }),
    item('T06/FIX10','pool floor drain','floor-drain',[0,-0.36,7.25],[0.45,0.03,0.45],'M-STEEL','none','waterfall filtration intake'),
    item('T06/FIX11','rainforest sound post','box-fixture',[1.5,0,0.0],[0.32,1.2,0.32],'M-SCREEN','body','rainforest sound interaction',{ allowOutside:'public atrium-path edge', interaction:{ tag:'雨林声音', focus:[1.0,0], reach:1.5 } }),
  ],
};

const tropicalScene = (() => {
  const scene = parent.buildings.find(b=>b.id==='B08-tropical-house').scene;
  return {
    id:'zoo_tropical',
    coordinateSpace:'local',
    bounds:[scene.localBounds.x0,scene.localBounds.x1,scene.localBounds.z0,scene.localBounds.z1],
    height:scene.height,
    spawn:scene.spawn,
    exit:scene.exit,
    wallRuns:scene.outerWalls,
    doors:scene.doors,
    paths:scene.paths,
    restNiches:scene.restNiches,
    staffPaths:scene.staffPaths,
    rooms:scene.rooms.map(room=>({
      ...room,
      contents:tropicalRoomContents[room.id] || [],
    })),
    sharedObjects:[
      item('TROP/REST01','west rest bench','chair',[-11.2,0,4.2],[1.65,0.85,0.55],'M-TIMBER','body','visitor rest',{ interaction:{ tag:'长椅', focus:[-10.72,4.2], reach:1.9 } }),
      item('TROP/REST02','east rest bench','chair',[11.2,0,0],[1.65,0.85,0.55],'M-TIMBER','body','visitor rest',{ yaw:-PI/2, interaction:{ tag:'长椅', focus:[10.72,0], reach:1.9 } }),
      item('TROP/BIN01','waste bin','cylinder-fixture',[-10.4,0,4.7],[0.5,0.74,0.5],'M-STEEL','body','visitor waste disposal',{ interaction:{ tag:'垃圾桶', focus:[-9.6,4.7], reach:1.7 } }),
      item('TROP/EXIT01','illuminated exit sign','screen',[-12.6,2.4,6.2],[0.08,0.45,1.45],'M-SCREEN','none','marked public exit',{ yaw:PI/2, interaction:{ tag:'出口', focus:[-11.2,6.2], reach:2.0 } }),
      item('TROP/SERVICE01','cleaning cart','box-fixture',[11.8,0,7.4],[0.65,1.05,1.0],'M-STEEL','body','staff cleaning equipment'),
      item('TROP/SERVICE02','environment control panel','screen',[12.72,1.35,6.8],[0.08,0.9,1.1],'M-SCREEN','none','temperature, humidity and water controls',{ yaw:-PI/2 }),
    ],
  };
})();

const knownExisting = new Set([
  'H00/S01','H00/W01','H00/O01','H00/O02',
  'H01/S01','H01/O01','H01/O02','H01/O03','H01/O04','H01/O05',
  'H02/S01','H02/O01','H02/O02','H02/O03','H02/O04','H02/O05','H02/O06',
  'H03/S01','H03/O01','H03/O02','H03/O03',
  'H04/S01','H04/O01','H04/O02','H04/O03','H04/O04',
  'H05/S01','H05/W01','H05/O01','H05/O02','H05/O03','H05/O04','H05/O05','H05/O06',
  'H06/S01','H06/O01','H06/O02','H06/O03','H06/O04',
  'B02/women/FIX01','B02/women/FIX02','B02/women/FIX03','B02/women/FIX04',
  'B02/women/FIX05','B02/women/FIX06','B02/family/FIX01','B02/family/FIX02','B02/family/FIX03',
  'B03/snack/FIX01','B03/snack/FIX04','B03/toilets/FIX01','B03/toilets/FIX02',
  'B03/toilets/FIX03','B03/toilets/FIX04','B03/toilets/FIX05',
  ...Array.from({length:6},(_,i)=>`B05/classroom/DESK${String(i+1).padStart(2,'0')}`),
  'B05/classroom/FIX01',
  ...Array.from({length:4},(_,i)=>`B05/gallery/CASE${String(i+1).padStart(2,'0')}`),
  'B06/aid/FIX01','B06/aid/FIX02','B06/aid/FIX03',
  ...Array.from({length:3},(_,i)=>`B06/exhibition/PLINTH${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:3},(_,i)=>`B06/shop/SHELF${String(i+1).padStart(2,'0')}`),
  'B06/shop/FIX04','B06b/FIX01','B06b/FIX02','B06b/FIX03','B06b/FIX04','B06b/FIX05',
  'B07/hospital/FIX01','B07/hospital/FIX02','B07/hospital/FIX04','B07/hospital/FIX05','B07/hospital/FIX08',
  'B08/FIX01','B08/FIX02',
  'T00/FIX01','T00/FIX02','T01/S02','T03/FIX03','T03/FIX06','T05/FIX01',
  'T06/FIX01','T06/FIX02','T06/FIX03','T06/FIX04','T06/FIX05',
  'TROP/REST01','TROP/REST02','TROP/BIN01','TROP/EXIT01',
]);

function implementationStatus(id) {
  if (knownExisting.has(id)) return 'existing-r2';
  if (/^H(?:1\d|2\d|3\d|4\d)-[^/]+\/[SO]\d/.test(id)) return 'existing-r2';
  return 'build-v1';
}

function tagContents(list) {
  return list.map(q => ({ ...q, implementationStatus:implementationStatus(q.id) }));
}

function subtract(lo, hi, cuts) {
  const ordered=cuts.map(q=>[Math.max(lo,q[0]),Math.min(hi,q[1])])
    .filter(q=>q[1]>q[0]).sort((a,b)=>a[0]-b[0]);
  const merged=[];
  for(const q of ordered){const last=merged.at(-1);if(!last||q[0]>last[1])merged.push(q.slice());else last[1]=Math.max(last[1],q[1]);}
  const out=[];let p=lo;
  for(const q of merged){if(q[0]>p)out.push([p,q[0]]);p=Math.max(p,q[1]);}
  if(p<hi)out.push([p,hi]);
  return out;
}

function doorSide(b, d) {
  const f=b.footprint, [x,z]=d.at;
  const options=[['x0',Math.abs(x-f.x0)],['x1',Math.abs(x-f.x1)],['z0',Math.abs(z-f.z0)],['z1',Math.abs(z-f.z1)]];
  return options.sort((a,c)=>a[1]-c[1])[0][0];
}

function genericWallRuns(b) {
  if (['B01-west-gate-pavilion','B04-lake-pavilion','B06b-conservation-bridge','B07-operations-campus'].includes(b.id)) return [];
  const f=b.footprint,t=0.18, doors=[...(b.publicDoors||[]),...(b.serviceDoors||[])];
  const out=[];
  for(const side of ['x0','x1','z0','z1']) {
    const lo=side[0]==='x'?f.z0:f.x0,hi=side[0]==='x'?f.z1:f.x1;
    const cuts=doors.filter(d=>doorSide(b,d)===side).map(d=>{
      const v=side[0]==='x'?d.at[1]:d.at[0];return [v-d.width/2,v+d.width/2];
    });
    subtract(lo,hi,cuts).forEach((r,i)=>{
      const id=`${b.id}/WALL-${side.toUpperCase()}-${String(i+1).padStart(2,'0')}`;
      const rect=side[0]==='x'?[f[side]-t/2,f[side]+t/2,r[0],r[1]]:
        [r[0],r[1],f[side]-t/2,f[side]+t/2];
      out.push({id,side,range:r,rect,y0:0,height:b.height,thickness:t,
        material:b.id==='B08-tropical-house'?'M-GLASS':'M-BRICK',collision:'body+camera'});
    });
  }
  return out;
}

const partitions = {
  'B02-west-restroom':[
    {id:'B02/PART01',axis:'z',at:-31.3,range:[21,24.2],opening:[21,22.05],height:2.65,thickness:0.12},
  ],
  'B03-east-rest-hub':[
    {id:'B03/PART01',axis:'z',at:45.75,range:[21,22.7],opening:[21,22.05],height:2.65,thickness:0.12},
  ],
  'B05-conservation-west':[
    {id:'B05/PART01',axis:'z',at:-12.2,range:[56,61],opening:[58.05,59.25],height:3,thickness:0.12},
  ],
  'B06-conservation-east':[
    {id:'B06/PART01',axis:'z',at:6.25,range:[55.5,58.5],opening:[56.15,57.35],height:3,thickness:0.12},
    {id:'B06/PART02',axis:'z',at:9.6,range:[56,61],opening:[58.25,59.45],height:3,thickness:0.12},
  ],
};

const buildings = parent.buildings.map(b => {
  const fixtures=tagContents(buildingFixtures[b.id]||[]);
  const shell = b.id==='B01-west-gate-pavilion' ? {
    type:'gate-pavilion', solidSegments:b.solidSegments, clearPassage:b.clearPassage,
    roof:{ y:b.height, overhang:0.25, material:'M-ROOF-GREEN' },
  } : b.id==='B04-lake-pavilion' ? {
    type:'open-pavilion', deckY:0.5, posts:[[-12.58,27.72],[-12.58,31.28],[-9.42,27.72],[-9.42,31.28]],
    postSize:[0.2,3.7,0.2], roof:{ y:4.2,size:[4.25,0.2,4.65],material:'M-ROOF-GREEN' },
    apron:b.entranceApron,
  } : b.id==='B06b-conservation-bridge' ? {
    type:'elevated-glazed-bridge', floorY:b.y0, topY:b.y0+b.height,
    floorRect:[b.footprint.x0,b.footprint.x1,b.footprint.z0,b.footprint.z1],
    glazedSides:[{side:'z0',height:b.height},{side:'z1',height:b.height}],
    openEnds:['x0','x1'], clearanceBelow:b.clearanceBelow,
    lifts:[[-7.25,-5.85,58.2,60.8],[1.85,3.25,58.2,60.8]],
  } : b.id==='B07-operations-campus' ? {
    type:'staff-campus', perimeterFence:b.perimeterFence, serviceDoors:b.serviceDoors,
    internalDriveAisles:b.internalDriveAisles,
  } : {
    type:b.id==='B08-tropical-house'?'glass-greenhouse':'masonry-public-building',
    wallRuns:genericWallRuns(b), roof:{ y:b.height, material:b.id==='B08-tropical-house'?'M-GLASS':'M-ROOF-GREEN' },
  };
  const rooms=(b.rooms||[]).map(room=>({
    ...room,
    fixtures:fixtures.filter(q=>q.room===room.id),
  }));
  return {
    id:b.id,label:b.style,district:b.district||null,footprint:[b.footprint.x0,b.footprint.x1,b.footprint.z0,b.footprint.z1],
    y0:b.y0||0,height:b.height,style:b.style,publicDoors:b.publicDoors||[],serviceDoors:b.serviceDoors||[],
    shell,partitions:partitions[b.id]||[],rooms,
    sharedFixtures:fixtures.filter(q=>!q.room),
  };
});

const habitats=[...coreHabitats.map(h=>({
  ...h,district:'D0',coordinateSpace:'zoo-world',
  barrierSource:{file:'js/zoo.js',contract:'ZOO_PENS + pen()'},
  gates:{service:parent.preservation.existingStaffGates.filter(g=>g.owner===h.id),public:[],animal:[]},
  contents:tagContents(h.contents),
})),...expansionHabitats.map(h=>({...h,coordinateSpace:'zoo-world',contents:tagContents(h.contents)}))];

tropicalScene.rooms=tropicalScene.rooms.map(r=>({...r,contents:tagContents(r.contents)}));
tropicalScene.sharedObjects=tagContents(tropicalScene.sharedObjects);

const buildPhases = [
  {id:'CV1-P00',order:0,label:'validate parent and content revisions',includes:['schema','parent.geometryHash','contentHash','stable IDs']},
  {id:'CV1-P01',order:1,label:'compile shells, room partitions and habitat barriers',includes:['building shell runs','door cuts','public/animal/service gates']},
  {id:'CV1-P02',order:2,label:'compile substrates and water',includes:['surface-rect','pool-volume','drains'],rule:'water before rocks; floors before fixtures'},
  {id:'CV1-P03',order:3,label:'compile large habitat structures',includes:['shelters','dens','rock clusters','trees','climbing frames']},
  {id:'CV1-P04',order:4,label:'compile feeding, drinking and keeper infrastructure',includes:['troughs','safe zones','cameras','service cabinets']},
  {id:'CV1-P05',order:5,label:'compile building fit-out',includes:['counters','sanitary fixtures','furniture','display cases','storage']},
  {id:'CV1-P06',order:6,label:'compile Tropical House fit-out and environmental systems',includes:['terrariums','aquarium fixtures','mist','heat','red light','filtration']},
  {id:'CV1-P07',order:7,label:'compile learning and interaction layer',includes:['screens','signs','things','focus points','bilingual copy']},
  {id:'CV1-P08',order:8,label:'spawn animals and bind activity anchors',includes:['population','activityAnchors','hours','acts']},
  {id:'CV1-P09',order:9,label:'run construction acceptance suite',includes:['containment','clearance','reachability','collision','budgets','hash']},
];

const validation = {
  numericTolerance:0.001,
  rules:[
    'Every record with geometry has one globally unique stable id.',
    'Zoo-world records use metres and [x,y,z]; Tropical House records use local metres.',
    'A habitat content anchor or rect must lie within its declared habitat bounds unless purpose is a public-side interaction.',
    'A room fixture must lie within its room rect; shared fixtures must lie within the building footprint or named apron.',
    'Every material and archetype reference must resolve.',
    'Every public interaction has a unique tag/thing owner, standable focus and reach no greater than 2.8m.',
    'Water surfaces declare depth, drain or filtration ownership, and an animal-safe egress where required.',
    'Keeper service landings remain dry, at least 0.8m wide, and do not overlap feeding anchors or deep water.',
    'Fixtures marked body own exact plan-view collision; fixtures marked none never add collision.',
    'All light fixtures declare purpose; exhibit heat/red lights are excluded from visitor-area white-light budgets.',
    'The runtime builds only implementationStatus=build-v1; existing-r2 prevents duplicate geometry.',
  ],
  acceptance:[
    {id:'AC01',test:'schema/revision/hash exact'},
    {id:'AC02',test:'all stable IDs unique'},
    {id:'AC03',test:'all placements finite and dimensions positive'},
    {id:'AC04',test:'all habitat placements contained or explicitly exempt'},
    {id:'AC05',test:'all room fixtures assigned and contained'},
    {id:'AC06',test:'all material and archetype references resolve'},
    {id:'AC07',test:'all build-v1 records compiled exactly once'},
    {id:'AC08',test:'public path and focus collision sweeps pass at player radius 0.30m'},
    {id:'AC09',test:'outdoor 180-solid/55-blocker and render-chunk budgets remain valid'},
    {id:'AC10',test:'Tropical House entry/exit, walk-through butterfly room and local interactions remain reachable'},
  ],
};

const blueprint = {
  schema:'chinesegame.zoo-contents/v1',revision:1,status:'construction-ready',
  title:'Zoo Pens and Buildings — Complete Contents Construction Blueprint',
  parent:{file:'ZOO-EXPANSION-BLUEPRINT.json',schema:parent.schema,revision:parent.revision,geometryHash:parent.geometryHash},
  coordinateSystem:{
    units:'metres',axes:{x:'east/west; east positive',y:'up; ground is 0 unless stated',z:'north/south; north positive'},
    yaw:'radians about +Y; 0 faces +z, +pi/2 faces +x',
    at:'[x,y,z] is the archetype anchor defined in archetypes',
    size:'[width-x,height-y,depth-z] gives full extents before yaw',
    rect:'[x0,x1,z0,z1] with x0<x1 and z0<z1',
    precision:0.001,
  },
  engineContract:{
    playerRadius:0.30,defaultInteractionReach:2.0,maxInteractionReach:2.8,
    collisionModes:['none','body','threshold','camera-blocker','body+camera','inherited'],
    implementationSelector:'implementationStatus === "build-v1"',
    idOwnership:'first rendered structural primitive owns the base ID; children use /Gnn',
  },
  materials,archetypes,habitats,buildings,tropicalScene,buildPhases,validation,
};

function stable(value) {
  if (Array.isArray(value)) return '['+value.map(stable).join(',')+']';
  if (value && typeof value==='object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
blueprint.contentHash='sha256:'+crypto.createHash('sha256').update(stable(blueprint)).digest('hex');

function allContent(bp) {
  return [
    ...bp.habitats.flatMap(h=>h.contents),
    ...bp.buildings.flatMap(b=>[...b.sharedFixtures,...b.rooms.flatMap(r=>r.fixtures)]),
    ...bp.tropicalScene.rooms.flatMap(r=>r.contents),
    ...bp.tropicalScene.sharedObjects,
  ];
}

function fmtAt(q) {
  if(q.at)return `at (${q.at.join(', ')}) · size (${q.size.join(' × ')})`;
  if(q.rect)return `rect [${q.rect.join(', ')}]${q.height!==undefined?` · y ${q.y0||0}…${r3((q.y0||0)+q.height)}`:''}`;
  if(q.centres)return `centres ${q.centres.map(c=>`(${c.join(', ')})`).join(', ')}`;
  return 'reference only';
}

function markdown(bp) {
  const contents=allContent(bp),planned=contents.filter(q=>q.implementationStatus==='build-v1');
  const lines=[
    '# Zoo Pens and Buildings — Complete Contents Construction Blueprint','',
    `Status: **${bp.status}** · revision **${bp.revision}** · parent zoo revision **${bp.parent.revision}**`,
    '',`Content hash: \`${bp.contentHash}\``,
    '',
    'This document is the human-readable companion to `ZOO-PENS-BUILDINGS-BLUEPRINT.json`. The JSON is canonical. Load it only after the parent revision/hash matches `ZOO-EXPANSION-BLUEPRINT.json`.',
    '',
    '## Construction contract','',
    '- Units are metres. World X points east, Y points up, and Z points north.',
    '- `at` is `[x,y,z]`; `size` is full `[width,height,depth]`; `rect` is `[x0,x1,z0,z1]`.',
    '- Yaw 0 faces north/+Z; +π/2 faces east/+X.',
    '- Build only records marked `build-v1`. Records marked `existing-r2` document geometry already present and prevent duplicates.',
    '- Base IDs belong to the first structural primitive; generated child parts use `/G01`, `/G02`, and so on.',
    '- Every public focus must remain standable for a 0.30m-radius actor.',
    '',
    '## Scope and totals','',
    `- ${bp.habitats.length} outdoor habitats: 7 preserved core + 14 expansion habitats`,
    `- ${bp.buildings.length} site buildings/structures`,
    `- ${bp.tropicalScene.rooms.length} Tropical House rooms/exhibits`,
    `- ${contents.length} exact content records; ${planned.length} are additive build-v1 placements`,
    `- ${bp.materials.length} material definitions and ${bp.archetypes.length} construction archetypes`,
    '',
    '## Build sequence','',
    ...bp.buildPhases.map(p=>`${p.order}. **${p.id} — ${p.label}.** ${p.includes.join('; ')}.`),
    '',
    '## Outdoor habitat contents','',
  ];
  for(const h of bp.habitats){
    lines.push(`### ${h.id} — ${h.label}`,'',
      `Bounds: \`[${h.bounds.join(', ')}]\` · public side: \`${h.publicSide}\` · species: ${h.species.join('、')}`,'',
      '| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |','|---|---|---|---|---|---|---|');
    for(const q of h.contents)lines.push(`| ${q.id} | ${q.label} | ${fmtAt(q)} | ${q.material||'inherited'} | ${q.collision} | ${q.implementationStatus} | ${q.purpose} |`);
    lines.push('','Animal population/activity anchors:','',
      ...(h.population||[]).map(a=>`- ${a.id}: ${a.name||a.species} — ${a.at?`(${a.at.join(', ')}) · `:''}${a.act||''}${a.hours?` · hours ${a.hours.join('–')}`:''}`),'');
  }
  lines.push('## Building shells, rooms and fixtures','');
  for(const b of bp.buildings){
    lines.push(`### ${b.id} — ${b.label}`,'',`Footprint: \`[${b.footprint.join(', ')}]\` · y ${b.y0}…${r3(b.y0+b.height)} · shell: \`${b.shell.type}\``,'');
    const shared=b.sharedFixtures;
    if(shared.length){
      lines.push('Shared/exterior fixtures:','','| Stable ID | Object | Exact placement | Build state | Purpose |','|---|---|---|---|---|');
      shared.forEach(q=>lines.push(`| ${q.id} | ${q.label} | ${fmtAt(q)} | ${q.implementationStatus} | ${q.purpose} |`));lines.push('');
    }
    for(const room of b.rooms){
      lines.push(`#### ${b.id}/${room.id}`,'',`Room rect: \`[${room.rect.join(', ')}]\``,'',
        '| Stable ID | Object | Exact placement | Material | Collision | Build state |','|---|---|---|---|---|---|');
      room.fixtures.forEach(q=>lines.push(`| ${q.id} | ${q.label} | ${fmtAt(q)} | ${q.material} | ${q.collision} | ${q.implementationStatus} |`));
      if(!room.fixtures.length)lines.push('| — | No loose fixtures; structural passage/room only | — | — | — | existing-r2 |');
      lines.push('');
    }
  }
  lines.push('## Tropical House local-coordinate fit-out','',
    `Local bounds: \`[${bp.tropicalScene.bounds.join(', ')}]\` · height ${bp.tropicalScene.height}m · all coordinates in this section are local to \`zoo_tropical\`.`, '');
  for(const room of bp.tropicalScene.rooms){
    lines.push(`### ${room.id} — ${room.label}`,'',`Rect: \`[${room.rect.join(', ')}]\``,'',
      '| Stable ID | Object | Exact placement | Material | Collision | Build state | Purpose |','|---|---|---|---|---|---|---|');
    room.contents.forEach(q=>lines.push(`| ${q.id} | ${q.label} | ${fmtAt(q)} | ${q.material} | ${q.collision} | ${q.implementationStatus} | ${q.purpose} |`));
    lines.push('');
  }
  lines.push('## Acceptance checklist','',...bp.validation.acceptance.map(a=>`- [ ] **${a.id}:** ${a.test}`),'',
    '## AI build instruction','',
    '1. Load and validate the parent blueprint first.','2. Load this JSON and verify `contentHash`.','3. Compile phases CV1-P01 through CV1-P08 in order.','4. Build only `build-v1` placements; use `existing-r2` as collision/reference geometry.','5. Run all AC01–AC10 checks. A build is incomplete if any stable ID is missing, duplicated, displaced, or unreachable.','');
  return lines.join('\n');
}

function html(bp) {
  const compact={habitats:bp.habitats.map(h=>({id:h.id,label:h.label,bounds:h.bounds,items:h.contents})),
    buildings:bp.buildings.map(b=>({id:b.id,label:b.label,bounds:b.footprint,items:[...b.sharedFixtures,...b.rooms.flatMap(r=>r.fixtures)],rooms:b.rooms.map(r=>({id:r.id,rect:r.rect}))})),
    tropical:bp.tropicalScene.rooms.map(r=>({id:r.id,label:r.label,bounds:r.rect,items:r.contents}))};
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Zoo Pens & Buildings Construction Blueprint</title>
<style>
:root{color-scheme:dark;background:#111814;color:#edf3eb;font:14px/1.45 system-ui,-apple-system,sans-serif}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0,#1e3124,#111814 42%);min-height:100vh}.app{max-width:1440px;margin:auto;padding:24px}.top{display:flex;gap:18px;align-items:end;justify-content:space-between;flex-wrap:wrap;border-bottom:1px solid #405044;padding-bottom:16px}.eyebrow{color:#b3c7b4;letter-spacing:.12em;text-transform:uppercase;font-size:11px}h1{font-size:clamp(24px,4vw,44px);line-height:1.05;margin:6px 0}.hash{font:12px ui-monospace,monospace;color:#9fb2a3}.controls{display:flex;gap:10px;flex-wrap:wrap}button,select{background:#1c2a21;color:#edf3eb;border:1px solid #526355;padding:9px 12px;border-radius:7px}button.active{background:#d8b84f;color:#172018;border-color:#d8b84f}.layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:18px;margin-top:18px}.map,.details{background:#17221b;border:1px solid #35453a;border-radius:10px}.map{padding:14px}.details{padding:18px;min-height:520px}.svgwrap{width:100%;aspect-ratio:1.35;min-height:480px}svg{width:100%;height:100%;display:block}.frame{fill:#101712;stroke:#6f806f;stroke-width:.14}.room{fill:#304137;stroke:#9eb2a0;stroke-width:.09}.item-existing{fill:#66836c;stroke:#d2dfd3;stroke-width:.05}.item-build{fill:#d4aa3f;stroke:#fff1bd;stroke-width:.07}.item-hit{fill:transparent;cursor:pointer}.label{fill:#edf3eb;font-size:.42px;paint-order:stroke;stroke:#152019;stroke-width:.12px}.minor{fill:#b9c7bb;font-size:.28px}.details h2{margin:0 0 4px}.details h3{font-size:13px;color:#d6bc61;margin:18px 0 6px}.grid{display:grid;grid-template-columns:110px 1fr;gap:7px 10px;margin-top:14px}.grid dt{color:#aabaae}.grid dd{margin:0;word-break:break-word}.list{max-height:250px;overflow:auto;border-top:1px solid #35453a;margin-top:14px;padding-top:10px}.row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #27352c;cursor:pointer}.row:hover{color:#f3d97d}.legend{display:flex;gap:18px;margin-top:10px;color:#b9c7bb;font-size:12px}.sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px}.existing{background:#66836c}.build{background:#d4aa3f}@media(max-width:900px){.layout{grid-template-columns:1fr}.details{min-height:0}.svgwrap{min-height:390px}}@media(max-width:520px){.app{padding:14px}.svgwrap{min-height:320px}.details{padding:14px}}
</style></head><body><main class="app"><header class="top"><div><div class="eyebrow">Construction contract · revision ${bp.revision}</div><h1>Zoo Pens & Buildings</h1><div class="hash">${bp.contentHash}</div></div><div class="controls"><button data-mode="habitats" class="active">Outdoor pens</button><button data-mode="buildings">Buildings</button><button data-mode="tropical">Tropical House</button><select id="place" aria-label="Select plan"></select></div></header><div class="layout"><section class="map"><div class="svgwrap"><svg id="plan" role="img" aria-label="Selected construction plan"></svg></div><div class="legend"><span><i class="sw existing"></i>existing r2</span><span><i class="sw build"></i>build v1</span></div></section><aside class="details"><h2 id="title"></h2><div id="subtitle" class="hash"></div><dl class="grid" id="facts"></dl><h3>Contents</h3><div class="list" id="items"></div></aside></div></main>
<script>
const DATA=${JSON.stringify(compact)};let mode='habitats',selected=null;const svg=document.getElementById('plan'),select=document.getElementById('place');
const el=id=>document.getElementById(id);const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function options(){select.innerHTML=DATA[mode].map((q,i)=>'<option value="'+i+'">'+esc(q.id+' — '+q.label)+'</option>').join('');selected=DATA[mode][0];draw()}
function geom(q){if(q.rect)return{r:q.rect};if(q.at&&q.size)return{r:[q.at[0]-q.size[0]/2,q.at[0]+q.size[0]/2,q.at[2]-q.size[2]/2,q.at[2]+q.size[2]/2]};if(q.centres){const xs=q.centres.map(c=>c[0]),zs=q.centres.map(c=>c[1]);return{r:[Math.min(...xs)-.7,Math.max(...xs)+.7,Math.min(...zs)-.7,Math.max(...zs)+.7]}}return null}
function draw(){const q=selected,b=q.bounds,pad=Math.max(1,Math.max(b[1]-b[0],b[3]-b[2])*.08),x0=b[0]-pad,x1=b[1]+pad,z0=b[2]-pad,z1=b[3]+pad;svg.setAttribute('viewBox',x0+' '+(-z1)+' '+(x1-x0)+' '+(z1-z0));let s='<rect class="frame" x="'+b[0]+'" y="'+(-b[3])+'" width="'+(b[1]-b[0])+'" height="'+(b[3]-b[2])+'"/>';(q.rooms||[]).forEach(r=>s+='<rect class="room" x="'+r.rect[0]+'" y="'+(-r.rect[3])+'" width="'+(r.rect[1]-r.rect[0])+'" height="'+(r.rect[3]-r.rect[2])+'"/><text class="minor" x="'+((r.rect[0]+r.rect[1])/2)+'" y="'+(-((r.rect[2]+r.rect[3])/2))+'" text-anchor="middle">'+esc(r.id)+'</text>');q.items.forEach((it,i)=>{const g=geom(it);if(!g)return;const r=g.r,cls=it.implementationStatus==='build-v1'?'item-build':'item-existing';s+='<rect class="'+cls+'" x="'+r[0]+'" y="'+(-r[3])+'" width="'+Math.max(.08,r[1]-r[0])+'" height="'+Math.max(.08,r[3]-r[2])+'"/><rect class="item-hit" data-i="'+i+'" x="'+r[0]+'" y="'+(-r[3])+'" width="'+Math.max(.3,r[1]-r[0])+'" height="'+Math.max(.3,r[3]-r[2])+'"/>';if((r[1]-r[0])>.55&&(r[3]-r[2])>.4)s+='<text class="label" x="'+((r[0]+r[1])/2)+'" y="'+(-((r[2]+r[3])/2))+'" text-anchor="middle">'+esc(it.id.split('/').at(-1))+'</text>'});svg.innerHTML=s;svg.querySelectorAll('[data-i]').forEach(n=>n.onclick=()=>showItem(q.items[+n.dataset.i]));el('title').textContent=q.id+' — '+q.label;el('subtitle').textContent='bounds ['+b.join(', ')+']';el('facts').innerHTML='<dt>Items</dt><dd>'+q.items.length+'</dd><dt>Build v1</dt><dd>'+q.items.filter(x=>x.implementationStatus==='build-v1').length+'</dd><dt>Existing r2</dt><dd>'+q.items.filter(x=>x.implementationStatus!=='build-v1').length+'</dd>';el('items').innerHTML=q.items.map((it,i)=>'<div class="row" data-row="'+i+'"><span>'+esc(it.id)+'</span><span>'+esc(it.label)+'</span></div>').join('');el('items').querySelectorAll('[data-row]').forEach(n=>n.onclick=()=>showItem(q.items[+n.dataset.row]))}
function showItem(it){el('title').textContent=it.id;el('subtitle').textContent=it.label;const placement=it.at?'('+it.at.join(', ')+') · '+it.size.join(' × '):it.rect?'['+it.rect.join(', ')+']':it.centres?JSON.stringify(it.centres):'reference';el('facts').innerHTML='<dt>Placement</dt><dd>'+esc(placement)+'</dd><dt>Archetype</dt><dd>'+esc(it.archetype)+'</dd><dt>Material</dt><dd>'+esc(it.material||'inherited')+'</dd><dt>Collision</dt><dd>'+esc(it.collision)+'</dd><dt>State</dt><dd>'+esc(it.implementationStatus)+'</dd><dt>Purpose</dt><dd>'+esc(it.purpose)+'</dd>'}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));mode=b.dataset.mode;options()});select.onchange=()=>{selected=DATA[mode][+select.value];draw()};options();
</script></body></html>`;
}

const jsonPath=path.join(ROOT,'ZOO-PENS-BUILDINGS-BLUEPRINT.json');
const mdPath=path.join(ROOT,'ZOO-PENS-BUILDINGS-BLUEPRINT.md');
const htmlPath=path.join(ROOT,'zoo-pens-buildings-blueprint.html');
fs.writeFileSync(jsonPath,JSON.stringify(blueprint,null,2)+'\n');
fs.writeFileSync(mdPath,markdown(blueprint));
fs.writeFileSync(htmlPath,html(blueprint));
const content=allContent(blueprint),planned=content.filter(q=>q.implementationStatus==='build-v1');
console.log(`wrote ${path.basename(jsonPath)}, ${path.basename(mdPath)}, ${path.basename(htmlPath)}`);
console.log(`${content.length} content records; ${planned.length} build-v1; hash ${blueprint.contentHash}`);
