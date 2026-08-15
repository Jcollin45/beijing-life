'use strict';

// Browser-free acceptance check for the expanded university campus. It executes the real matrix
// and scene builders in a VM, stubbing only the renderer upload seam, then validates geometry,
// performance, collision clearance, and walkability from the canonical metro-side spawn.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const builders = Object.create(null);
const meshes = new Map();
const failures = [];
let passed = 0;

function check(name, ok, detail = '') {
  if (ok) { passed++; return; }
  failures.push(name + (detail ? ` — ${detail}` : ''));
}

function color(hex) {
  const value = String(hex).replace('#', '');
  const full = value.length === 3 ? [...value].map(ch => ch + ch).join('') : value;
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255);
}

const context = {
  console,
  C: color,
  Glyphs: {
    need: text => String(text),
    role: () => 'body',
    isHan: ch => /[\u3400-\u9fff]/u.test(ch),
    rect: () => [0, 0, 1, 1],
  },
  Lazy(name, builder) {
    builders[name] = builder;
    return Object.freeze({ lazyName: name });
  },
  R: {
    gl: {},
    hasMesh: name => meshes.has(name),
    mesh(name, pos, nor, uv, idx) {
      if (!meshes.has(name)) meshes.set(name, { pos, nor, uv, idx });
      return meshes.get(name);
    },
  },
  Weather: { now: { wind: .18 } },
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

function run(file) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  vm.runInContext(source, context, { filename: file });
}

run('js/math.js');
run('js/build.js');
run('js/campus.js');
for (const file of [
  'js/campus-boundary.js',
  'js/campus-academic.js',
  'js/campus-west.js',
  'js/campus-east.js',
  'js/campus-furniture.js',
  'js/campus-life.js',
]) run(file);

const scene = builders.Campus();
const contract = context.CampusContract;
const near = (a, b, epsilon = .011) => Math.abs(a - b) <= epsilon;
const hasSolid = (x0, x1, z0, z1) => scene.solids.some(s =>
  near(s.x0, x0) && near(s.x1, x1) && near(s.z0, z0) && near(s.z1, z1));

check('layout version', contract.layoutVersion === 2, contract.layoutVersion);
check('campus bounds', contract.x0 === -48 && contract.x1 === 48 &&
  contract.z0 === -13 && contract.z1 === 67, JSON.stringify(contract));
check('canonical spawn', near(contract.spawn.x, -11.4) && near(contract.spawn.z, -9.35) &&
  near(contract.spawn.yaw, 0), JSON.stringify(contract.spawn));
check('seven overlapping walk zones', scene.zones.length === 7, scene.zones.length);
check('all zones have a light anchor', scene.zones.every(zone =>
  Array.isArray(zone.light) && zone.light.length === 3 && zone.light.every(Number.isFinite)));
check('33 interactions', scene.things.length === 33, scene.things.length);
check('182 solids', scene.solids.length === 182, scene.solids.length);
check('23 camera blockers', scene.blockers.length === 23, scene.blockers.length);
check('33 authored point lights', scene.lights.length === 33, scene.lights.length);
check('prop ceiling', scene.props.length <= 3200, scene.props.length);
const colorCalls = scene.batches.length + scene.loose.length;
check('submitted color-call ceiling', colorCalls <= 220, colorCalls);

const requiredThings = [
  '教学楼', '教室', '书桌', '打印', '图书馆', '食堂', '售货机', '煎饼', '大学',
  '自行车', '布告板', '篮球场', '宿舍', '地铁站', '校园地图', '学生服务中心',
  '行政楼', '实验楼', '活动中心', '校医院', '校园快递柜', '门卫', '跑道',
];
for (const label of requiredThings)
  check(`interaction ${label}`, scene.things.some(thing => thing.hz === label));
const campusEntries = [
  ['教室','campus_b01_f1'], ['图书馆','campus_b02_f1'], ['食堂','campus_canteen'],
  ['宿舍','campus_dorm_f1'], ['行政楼','campus_admin_f1'], ['实验楼','campus_science_f1'],
  ['活动中心','campus_student_f1'], ['校医院','campus_clinic_f1'], ['门卫','campus_security'],
];
for (const [label,destination] of campusEntries)
  check(`${label} exterior entry destination`,scene.things.some(t=>t.hz===label&&t.exit&&t.exit.place===destination));
const scienceEntry=scene.things.find(t=>t.hz==='实验楼'&&t.exit&&t.exit.place==='campus_science_f1');
check('science entrance interaction is on the visible threshold',!!scienceEntry&&
  near(scienceEntry.focus[0],-27.43)&&near(scienceEntry.focus[1],50)&&scienceEntry.reach>=2.8,
  scienceEntry&&JSON.stringify({focus:scienceEntry.focus,reach:scienceEntry.reach}));
const dataSource=fs.readFileSync(path.join(ROOT,'js/data.js'),'utf8');
const campusUse=dataSource.match(/\n  campus:\s*\{([\s\S]*?)\n  \},\n  \/\/ ---- 大堂/);
check('campus-specific entry action table',!!campusUse);
for(const [label] of campusEntries)
  check(`${label} has a free campus entry action`,!!campusUse&&new RegExp(`['"]${label}['"]\\s*:`).test(campusUse[1])&&
    !new RegExp(`['"]${label}['"]\\s*:[^}]*\\bpay\\s*:`).test(campusUse[1]));
check('four interactive benches', scene.things.filter(t => t.hz === '长椅').length === 4);
check('five interactive fountains', scene.things.filter(t => t.hz === '饮水机').length === 5);
check('two interactive study tables', scene.things.filter(t => t.hz === '书桌').length === 2);

const major = [
  ['B01', -19.20, 13.20, 51.80, 63.20],
  ['B02', 29.80, 43.20, 37.80, 62.20],
  ['B03', -43.20, -28.80, -7.20, 12.20],
  ['B04', 29.80, 43.20, -9.20, 7.20],
  ['B05', -43.20, -28.80, 23.80, 36.20],
  ['B06', -43.20, -27.80, 39.80, 62.20],
  ['B07', 29.80, 43.20, 22.80, 34.20],
  ['B08', 6.20, 12.60, -12.60, -6.80],
];
for (const [id, x0, x1, z0, z1] of major)
  check(`${id} body solid`, hasSolid(x0, x1, z0, z1));

const wallSolids = [
  [-48, -7.75, -13.18, -12.82], [1.75, 48, -13.18, -12.82],
  [-48.18, -47.82, -13, 17], [-48.18, -47.82, 23, 67],
  [47.82, 48.18, -13, 17], [47.82, 48.18, 23, 67],
  [-48, 31, 66.82, 67.18], [39, 48, 66.82, 67.18], [31, 39, 66.70, 67.05],
];
wallSolids.forEach((solid, i) => check(`wall/gate solid ${i + 1}`, hasSolid(...solid)));

const FOCUS_CLEAR = .35;
const blockedFocus = scene.things.filter(t => scene.solids.some(s => !s.open &&
  t.focus[0] > s.x0 - FOCUS_CLEAR && t.focus[0] < s.x1 + FOCUS_CLEAR &&
  t.focus[1] > s.z0 - FOCUS_CLEAR && t.focus[1] < s.z1 + FOCUS_CLEAR));
check('all interaction focuses clear solids by .35 m', blockedFocus.length === 0,
  blockedFocus.map(t => t.hz).join(', '));

const tactile = [...meshes].filter(([name]) => name.startsWith('campus-tactile-v2-'));
const tactileVertices = tactile.reduce((sum, [, data]) => sum + data.pos.length / 3, 0);
const tactileTriangles = tactile.reduce((sum, [, data]) => sum + data.idx.length / 3, 0);
const tactileBars = (tactileVertices - tactile.length * 24) / 24;
check('ten tactile route meshes including the clear ramp approach branch', tactile.length === 10, tactile.length);
check('333 literal tactile bars', tactileBars === 333, tactileBars);
check('tactile mesh vertex contract', tactileVertices === 8232, tactileVertices);
check('tactile mesh triangle contract', tactileTriangles === 4116, tactileTriangles);
check('tactile strip/bar heights', tactile.every(([, data]) => {
  const ys = new Set();
  for (let i = 1; i < data.pos.length; i += 3) ys.add(+data.pos[i].toFixed(6));
  return ys.has(0) && ys.has(.004) && ys.has(.006) && Math.max(...ys) === .006;
}));

const accessRamps=scene.props.filter(prop=>prop.accessibleRamp),
  accessLandings=scene.props.filter(prop=>prop.accessibleLanding),
  accessRampTactile=scene.props.filter(prop=>prop.accessibleRampTactile),
  accessRampEdges=scene.props.filter(prop=>prop.accessibleRampEdge),
  accessRampHandrails=scene.props.filter(prop=>prop.accessibleRampHandrail),
  accessLandingTactile=scene.props.filter(prop=>prop.accessibleLandingTactile),
  accessGroundBranches=scene.props.filter(prop=>prop.accessibleTactileBranch),
  accessById=new Map(accessRamps.map(prop=>[prop.accessibleRamp,prop]));
const exactSegment=(prop,key,id,a,b)=>prop?.[key]===id&&prop.from?.join(',')===a.join(',')&&
  prop.to?.join(',')===b.join(','),
  slopedFaceEndpoints=(prop,upper)=>[-.5,.5].map(lx=>prop.m[13]+prop.m[1]*lx+
    (upper?1:-1)*Math.abs(prop.m[5])*.5).sort((a,b)=>a-b),
  horizontalTop=prop=>prop.m[13]+Math.abs(prop.m[5])*.5;
check('B01 and B02 have exact 1:12 accessible entrance ramps',
  accessRamps.length===2&&['ACC-B01','ACC-B02'].every(id=>accessById.has(id))&&
  accessRamps.every(prop=>near(prop.grade,1/12,.000001)&&prop.clearWidth>=1.50&&
    near(prop.run/prop.rise,12,.000001)&&near(Math.abs(prop.m[0]),prop.run,.000001)&&
    near(Math.abs(prop.m[1]),prop.rise,.000001)),
  accessRamps.map(prop=>`${prop.accessibleRamp}:${prop.run}/${prop.rise}/${prop.clearWidth}`).join(','));
check('ramp and landing walking faces are flush at grade, rise and door elevations',
  accessRamps.every(prop=>{
    const deck=slopedFaceEndpoints(prop,true),tactile=accessRampTactile.find(candidate=>
      candidate.accessibleRampTactile===prop.accessibleRamp),touch=tactile&&slopedFaceEndpoints(tactile,false);
    return near(deck[0],0,.001)&&near(deck[1],prop.rise,.001)&&
      near(touch?.[0],0,.001)&&near(touch?.[1],prop.rise,.001);
  })&&accessLandings.every(prop=>near(horizontalTop(prop),prop.height,.001))&&
  accessLandingTactile.every(prop=>{
    const landing=accessLandings.find(candidate=>candidate.accessibleLanding===prop.accessibleLandingTactile);
    return landing&&near(prop.m[13]-Math.abs(prop.m[5])*.5,landing.height,.001);
  }),
  accessRamps.map(prop=>`${prop.accessibleRamp}:deck=${slopedFaceEndpoints(prop,true).map(v=>v.toFixed(3))}`+
    `/tactile=${slopedFaceEndpoints(accessRampTactile.find(candidate=>candidate.accessibleRampTactile===prop.accessibleRamp),false).map(v=>v.toFixed(3))}`).join(' '));
check('both ramps retain tactile strips, full landings, two edge kerbs and complete handrails',
  accessLandings.length===2&&accessRampTactile.length===2&&accessRampEdges.length===4&&
  ['ACC-B01','ACC-B02'].every(id=>accessLandings.some(prop=>prop.accessibleLanding===id)&&
    accessRampTactile.some(prop=>prop.accessibleRampTactile===id)&&
    accessRampEdges.filter(prop=>prop.accessibleRampEdge===id).length===2&&
    accessRampHandrails.filter(prop=>prop.accessibleRampHandrail===id&&prop.part==='rail').length===2&&
    accessRampHandrails.filter(prop=>prop.accessibleRampHandrail===id&&prop.part==='post').length===6));
const b01Landing=accessLandings.find(prop=>prop.accessibleLanding==='ACC-B01'),
  b02Landing=accessLandings.find(prop=>prop.accessibleLanding==='ACC-B02');
check('ramp landings physically meet both facade thresholds and the final teaching step',
  b01Landing?.bounds?.[2]<=49.65&&b01Landing.bounds[3]>=51.76&&
  b02Landing?.bounds?.[0]<=28.16&&b02Landing.bounds[1]>=29.76,
  `B01=${b01Landing?.bounds?.join(',')} B02=${b02Landing?.bounds?.join(',')}`);
check('tactile route stays visible from the campus spine, up both ramps and across both landings',
  accessGroundBranches.length===3&&
  accessGroundBranches.some(prop=>exactSegment(prop,'accessibleTactileBranch','ACC-B01',[-3,44.8],[8.5,44.8]))&&
  accessGroundBranches.some(prop=>exactSegment(prop,'accessibleTactileBranch','ACC-B01',[8.5,44.8],[8.5,50]))&&
  accessGroundBranches.some(prop=>exactSegment(prop,'accessibleTactileBranch','ACC-B02',[7.68,50],[26,50]))&&
  accessRampTactile.some(prop=>exactSegment(prop,'accessibleRampTactile','ACC-B01',[7.68,50],[1.2,50]))&&
  accessRampTactile.some(prop=>exactSegment(prop,'accessibleRampTactile','ACC-B02',[26,50],[28.16,50]))&&
  accessLandingTactile.length===3&&
  accessLandingTactile.some(prop=>exactSegment(prop,'accessibleLandingTactile','ACC-B01',[1.2,50],[-3,50]))&&
  accessLandingTactile.some(prop=>exactSegment(prop,'accessibleLandingTactile','ACC-B01',[-3,50],[-3,51.76]))&&
  accessLandingTactile.some(prop=>exactSegment(prop,'accessibleLandingTactile','ACC-B02',[28.16,50],[29.76,50])));
check('ramp kerbs are the only new collision strips and leave each 1.50 m centre route open',
  hasSolid(1.20,7.68,49.15,49.25)&&hasSolid(1.20,7.68,50.75,50.85)&&
  hasSolid(26.00,28.16,49.15,49.25)&&hasSolid(26.00,28.16,50.75,50.85)&&
  !scene.solids.some(s=>s.x0<=4.44&&s.x1>=4.44&&s.z0<50&&s.z1>50)&&
  !scene.solids.some(s=>s.x0<=27.08&&s.x1>=27.08&&s.z0<50&&s.z1>50));
const accessRouteRects=[
  [-3,8.5,44.05,45.55], [7.75,9.25,44.80,50], [7.68,26,49.25,50.75],
  [1.20,7.68,49.25,50.75], [-3,1.20,49.25,50.75], [-3.75,-2.25,50,51.70],
  [26,28.16,49.25,50.75], [28.16,29.76,49.25,50.75],
];
check('the complete 1.50 m ramp and tactile centreline stays clear of every collision solid',
  accessRouteRects.every(([x0,x1,z0,z1])=>!scene.solids.some(s=>
    s.x0<x1-.001&&s.x1>x0+.001&&s.z0<z1-.001&&s.z1>z0+.001)),
  accessRouteRects.filter(([x0,x1,z0,z1])=>scene.solids.some(s=>
    s.x0<x1-.001&&s.x1>x0+.001&&s.z0<z1-.001&&s.z1>z0+.001)).map(bounds=>bounds.join(',')).join('|'));

const serviceMeshNames = [
  'b01-steel', 'b01-sills', 'b02-steel', 'b02-sills',
  'b04-steel', 'b04-sills', 'b05-steel', 'b05-sills',
  'b06-steel', 'b06-sills', 'b07-steel', 'b07-sills',
].map(id => `campus-service-${id}-v1`).sort();
const serviceMeshes = [...meshes]
  .filter(([name]) => name.startsWith('campus-service-'))
  .sort(([a], [b]) => a.localeCompare(b));
const serviceProps = scene.props.filter(prop =>
  typeof prop.mesh === 'string' && prop.mesh.startsWith('campus-service-'));
const serviceVertices = serviceMeshes.reduce((sum, [, data]) => sum + data.pos.length / 3, 0);
const serviceTriangles = serviceMeshes.reduce((sum, [, data]) => sum + data.idx.length / 3, 0);
check('twelve service-facade accent meshes',
  serviceMeshes.map(([name]) => name).join('|') === serviceMeshNames.join('|'),
  serviceMeshes.map(([name]) => name).join(', '));
check('twelve service-facade accent props', serviceProps.length === 12, serviceProps.length);
check('230 complete service-window accent sets',
  serviceVertices === 16560 && serviceTriangles === 8280,
  `${serviceVertices} vertices / ${serviceTriangles} triangles`);
check('service accents have exact culling and no pick boxes', serviceProps.every(prop =>
  prop.fixed === true && Number.isFinite(prop.cx) && Number.isFinite(prop.cy) &&
  Number.isFinite(prop.cz) && prop.cy > 0 && Number.isFinite(prop.r) && prop.r > 0 &&
  prop.ob === null));

const STEP = .25, BODY = .30;
const x0 = -52, x1 = 52, z0 = -17, z1 = 71;
const nx = Math.round((x1 - x0) / STEP) + 1;
const nz = Math.round((z1 - z0) / STEP) + 1;
const key = (ix, iz) => iz * nx + ix;
const point = (ix, iz) => [x0 + ix * STEP, z0 + iz * STEP];
const safe = (x, z) => scene.zones.some(q =>
  x >= q.x0 + BODY && x <= q.x1 - BODY && z >= q.z0 + BODY && z <= q.z1 - BODY) &&
  !scene.solids.some(s => !s.open && x > s.x0 - BODY && x < s.x1 + BODY &&
    z > s.z0 - BODY && z < s.z1 + BODY);
function nearestSafe(x, z) {
  const cx = Math.round((x - x0) / STEP), cz = Math.round((z - z0) / STEP);
  for (let ring = 0; ring < 12; ring++) for (let dz = -ring; dz <= ring; dz++)
    for (let dx = -ring; dx <= ring; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
      const ix = cx + dx, iz = cz + dz;
      if (ix < 0 || ix >= nx || iz < 0 || iz >= nz) continue;
      const p = point(ix, iz);
      if (safe(p[0], p[1])) return [ix, iz];
    }
  return null;
}

const start = nearestSafe(contract.spawn.x, contract.spawn.z);
const reached = new Uint8Array(nx * nz), queue = start ? [start] : [];
if (start) reached[key(start[0], start[1])] = 1;
for (let head = 0; head < queue.length; head++) {
  const [ix, iz] = queue[head];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ax = ix + dx, az = iz + dz;
    if (ax < 0 || ax >= nx || az < 0 || az >= nz || reached[key(ax, az)]) continue;
    const p = point(ax, az);
    if (!safe(p[0], p[1])) continue;
    reached[key(ax, az)] = 1;
    queue.push([ax, az]);
  }
}
function reachable(x, z) {
  const cell = nearestSafe(x, z);
  if (!cell || !reached[key(cell[0], cell[1])]) return false;
  const p = point(cell[0], cell[1]);
  return Math.hypot(p[0] - x, p[1] - z) <= .55;
}
check('spawn enters occupancy graph', !!start);
check('all interaction focuses flood-fill reachable', scene.things.every(t =>
  reachable(t.focus[0], t.focus[1])), scene.things.filter(t =>
  !reachable(t.focus[0], t.focus[1])).map(t => t.hz).join(', '));
check('both ramp grade and threshold endpoints are in the live campus movement component',
  accessRamps.every(prop=>reachable(prop.low[0],prop.low[1])&&reachable(prop.high[0],prop.high[1])),
  accessRamps.filter(prop=>!reachable(prop.low[0],prop.low[1])||!reachable(prop.high[0],prop.high[1]))
    .map(prop=>prop.accessibleRamp).join(','));
// A zone centre may deliberately sit inside a building mass (the west/east districts do), so
// connectivity is proved by a reachable safe cell inside each zone rather than by that arbitrary
// centre point.
const zoneConnected = zone => {
  const ax0 = Math.max(0, Math.ceil((zone.x0 + BODY - x0) / STEP));
  const ax1 = Math.min(nx - 1, Math.floor((zone.x1 - BODY - x0) / STEP));
  const az0 = Math.max(0, Math.ceil((zone.z0 + BODY - z0) / STEP));
  const az1 = Math.min(nz - 1, Math.floor((zone.z1 - BODY - z0) / STEP));
  for (let iz = az0; iz <= az1; iz++) for (let ix = ax0; ix <= ax1; ix++) {
    const p = point(ix, iz);
    if (safe(p[0], p[1]) && reached[key(ix, iz)]) return true;
  }
  return false;
};
check('all seven zones join the component', scene.zones.every(zoneConnected));
check('classroom return reachable', reachable(-3, 47.2));
check('library return reachable', reachable(27.2, 50));
check('metro focus reachable', reachable(-11.4, -9.15));

const total = passed + failures.length;
for (const failure of failures) console.error('FAIL ' + failure);
console.log(JSON.stringify({
  props: scene.props.length,
  colorCalls,
  batches: scene.batches.length,
  loose: scene.loose.length,
  things: scene.things.length,
  solids: scene.solids.length,
  blockers: scene.blockers.length,
  lights: scene.lights.length,
  tactileVertices,
  tactileTriangles,
  serviceVertices,
  serviceTriangles,
  reachableCells: queue.length,
}));
console.log(`\n${passed}/${total} browser-free campus checks passed`);
if (failures.length) process.exitCode = 1;
