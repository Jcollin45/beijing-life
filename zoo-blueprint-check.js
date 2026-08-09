#!/usr/bin/env node
'use strict';

// Pure-data contract check for ZOO-EXPANSION-BLUEPRINT.json. This deliberately does not load the
// game: the blueprint is meant to be safe before GL, Assets, Build or the lazy Zoo scene exists.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = path.join(__dirname, 'ZOO-EXPANSION-BLUEPRINT.json');
const errors = [];
const error = (code, id, message) => errors.push({ code, id, message });
const assert = (ok, code, id, message) => { if (!ok) error(code, id, message); };
const finite = n => typeof n === 'number' && Number.isFinite(n);
const near = (a, b, eps = 1e-7) => Math.abs(a - b) <= eps;
const grid = (n, step = .01) => finite(n) && near(n / step, Math.round(n / step), 1e-6);
const rect = q => Array.isArray(q)
  ? { x0:q[0], x1:q[1], z0:q[2], z1:q[3] }
  : q;
const ordered = q => q && [q.x0,q.x1,q.z0,q.z1].every(finite) && q.x0 < q.x1 && q.z0 < q.z1;
const insideRect = (q, s, pad = 0) => q.x0 >= s.x0-pad && q.x1 <= s.x1+pad &&
  q.z0 >= s.z0-pad && q.z1 <= s.z1+pad;
const overlap = (a, b, pad = 0) => Math.min(a.x1,b.x1) > Math.max(a.x0,b.x0)-pad &&
  Math.min(a.z1,b.z1) > Math.max(a.z0,b.z0)-pad;
const contains = (q, p, pad = 0) => p[0] > q.x0-pad && p[0] < q.x1+pad &&
  p[1] > q.z0-pad && p[1] < q.z1+pad;
const pointSegmentDistance = (p, a, b) => {
  const dx = b[0]-a[0], dz = b[1]-a[1], dd = dx*dx+dz*dz;
  const t = dd ? Math.max(0, Math.min(1, ((p[0]-a[0])*dx + (p[1]-a[1])*dz) / dd)) : 0;
  return Math.hypot(p[0]-a[0]-t*dx, p[1]-a[1]-t*dz);
};
const pathDistance = (p, q) => {
  let d = Infinity;
  for (let i=1; i<q.centerline.length; i++)
    d = Math.min(d, pointSegmentDistance(p, q.centerline[i-1], q.centerline[i]));
  return d;
};
const segmentRect = (a, b, width) => ({
  x0:Math.min(a[0],b[0])-width/2, x1:Math.max(a[0],b[0])+width/2,
  z0:Math.min(a[1],b[1])-width/2, z1:Math.max(a[1],b[1])+width/2,
});
const segmentsIntersect = (a,b,c,d) => {
  const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  const on=(p,q,r)=>near(cross(p,q,r),0)&&r[0]>=Math.min(p[0],q[0])-1e-7&&
    r[0]<=Math.max(p[0],q[0])+1e-7&&r[1]>=Math.min(p[1],q[1])-1e-7&&
    r[1]<=Math.max(p[1],q[1])+1e-7;
  const x1=cross(a,b,c), x2=cross(a,b,d), x3=cross(c,d,a), x4=cross(c,d,b);
  return (x1*x2<0&&x3*x4<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);
};
const segmentDistance = (a,b,c,d) => segmentsIntersect(a,b,c,d) ? 0 : Math.min(
  pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),
  pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));
const polylineDistance = (a,b) => {
  let d=Infinity;
  for(let i=1;i<a.centerline.length;i++) for(let j=1;j<b.centerline.length;j++)
    d=Math.min(d,segmentDistance(a.centerline[i-1],a.centerline[i],b.centerline[j-1],b.centerline[j]));
  return d;
};
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value==='object') return `{${Object.keys(value).sort().map(k=>
    `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
};

let bp;
try { bp = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
catch (e) {
  console.error(`FAIL — cannot parse ${path.basename(FILE)}: ${e.message}`);
  process.exit(1);
}

assert(bp.schema === 'chinesegame.zoo-expansion/v1', 'SCHEMA', 'root',
  `unexpected schema ${JSON.stringify(bp.schema)}`);
assert(Number.isInteger(bp.revision) && bp.revision > 0, 'REVISION', 'root',
  'revision must be a positive integer');
assert(bp.units === 'metres', 'UNITS', 'root', 'units must be metres');

const geometryPayload = {
  revision:bp.revision, site:bp.site, districts:bp.districts, preservation:bp.preservation,
  outerWalls:bp.outerWalls, gates:bp.gates, paths:bp.paths,
  controlledCrossings:bp.controlledCrossings, habitatBarrierSystem:bp.habitatBarrierSystem,
  habitats:bp.habitats, buildings:bp.buildings,
  animalTransferCrossings:bp.animalTransferCrossings, objectSchedules:bp.objectSchedules,
  planting:bp.planting, wayfinding:bp.wayfinding, routes:bp.routes, interactions:bp.interactions,
};
const geometryHash='sha256:'+crypto.createHash('sha256').update(stable(geometryPayload)).digest('hex');
assert(bp.geometryHash===geometryHash,'GEOMETRY_HASH','root',
  `declared ${bp.geometryHash}; calculated ${geometryHash}`);
if (process.argv.includes('--print-hash')) console.log(geometryHash);

const site = bp.site && bp.site.bounds;
assert(ordered(site), 'SITE_BOUNDS', 'site', 'site bounds must be finite, ordered and non-zero');
if (!ordered(site)) finish();
const area = (site.x1-site.x0)*(site.z1-site.z0);
assert(near(area, bp.site.areaSquareMetres), 'SITE_AREA', 'site',
  `declared ${bp.site.areaSquareMetres}, calculated ${area}`);
assert(near(bp.site.expansionFactor, area/bp.site.existingAreaSquareMetres, .01),
  'SITE_FACTOR', 'site', 'expansionFactor does not match the declared areas');

// IDs that are intended to be globally addressable by the future compiler.
const ids = new Map();
function ownId(item, group) {
  if (!item || item.id === undefined) return;
  const id = String(item.id);
  if (ids.has(id)) error('DUPLICATE_ID', id, `also declared in ${ids.get(id)}; now in ${group}`);
  else ids.set(id, group);
}
for (const [group, list] of [
  ['districts',bp.districts], ['outerWalls',bp.outerWalls], ['gates',bp.gates],
  ['paths',bp.paths], ['habitats',bp.habitats], ['buildings',bp.buildings],
  ['preservation.existingHabitatBounds',bp.preservation.existingHabitatBounds],
  ['preservation.existingCorePaths',bp.preservation.existingCorePaths],
  ['visitorLoops',bp.routes.visitorLoops], ['keeperRoutes',bp.routes.keeperRoutes],
]) for (const item of list || []) ownId(item, group);
ownId(bp.routes.serviceCart, 'serviceCart');
ownId(bp.routes.accessibleTour, 'accessibleTour');
for (const [group,list] of Object.entries(bp.objectSchedules || {}))
  for (const item of list || []) ownId(item, `objectSchedules.${group}`);
const tropical = (bp.buildings || []).find(q => q.id === 'B08-tropical-house')?.scene;
if (tropical) {
  for (const [group,list] of [['tropical.rooms',tropical.rooms],['tropical.paths',tropical.paths],
    ['tropical.objects',tropical.objects],['tropical.doors',tropical.doors]])
    for (const item of list || []) ownId(item, group);
}

const districts = new Map((bp.districts || []).map(q => [q.id,q]));
for (const d of bp.districts || []) {
  assert(ordered(d.bounds), 'DISTRICT_BOUNDS', d.id, 'bounds must be ordered');
  if (ordered(d.bounds)) assert(insideRect(d.bounds, site), 'DISTRICT_SITE', d.id, 'outside site');
}

// Convert preserved path rectangles to the same centerline representation as new paths.
const pathMap = new Map((bp.paths || []).map(q => [q.id,q]));
for (const p of bp.preservation.existingCorePaths || []) {
  const q = p.rect, w = q.x1-q.x0, d = q.z1-q.z0;
  pathMap.set(p.id, w >= d
    ? { id:p.id, access:'public', centerline:[[q.x0,(q.z0+q.z1)/2],[q.x1,(q.z0+q.z1)/2]], width:d }
    : { id:p.id, access:'public', centerline:[[(q.x0+q.x1)/2,q.z0],[(q.x0+q.x1)/2,q.z1]], width:w });
}

const refs = new Set([...pathMap.keys(), ...(bp.gates || []).map(q=>q.id),
  ...(bp.buildings || []).map(q=>q.id)]);
for (const p of bp.paths || []) {
  assert(finite(p.width) && p.width > 0, 'PATH_WIDTH', p.id, 'width must be positive');
  if (p.access === 'public') assert(p.width >= bp.engineContract.minimumPublicPathWidth,
    'PATH_PUBLIC_WIDTH', p.id, `width ${p.width} is below public minimum`);
  if (p.access === 'public' && p.accessible) assert(p.width >= bp.engineContract.minimumAccessiblePathWidth,
    'PATH_ACCESS_WIDTH', p.id, `width ${p.width} is below accessible minimum`);
  assert(Array.isArray(p.centerline) && p.centerline.length >= 2, 'PATH_POINTS', p.id,
    'centerline needs at least two points');
  for (const q of p.centerline || []) {
    assert(Array.isArray(q) && q.length === 2 && q.every(finite), 'PATH_POINT', p.id,
      `bad point ${JSON.stringify(q)}`);
    if (q.length === 2) assert(q[0]>=site.x0 && q[0]<=site.x1 && q[1]>=site.z0 && q[1]<=site.z1,
      'PATH_SITE', p.id, `point ${q} outside site`);
  }
  for (let i=1; i<(p.centerline||[]).length; i++) {
    const a=p.centerline[i-1], b=p.centerline[i];
    assert(near(a[0],b[0]) || near(a[1],b[1]), 'PATH_ORTHOGONAL', p.id,
      `segment ${i} is diagonal`);
  }
  for (const id of p.connects || []) assert(refs.has(id), 'PATH_REFERENCE', p.id,
    `unresolved connection ${id}`);
}

for (const h of bp.habitats || []) {
  assert(districts.has(h.district), 'HABITAT_DISTRICT', h.id, `unknown district ${h.district}`);
  assert(ordered(h.bounds), 'HABITAT_BOUNDS', h.id, 'bounds must be ordered');
  if (ordered(h.bounds)) assert(insideRect(h.bounds, site), 'HABITAT_SITE', h.id, 'outside site');
  assert(Array.isArray(h.focus) && h.focus.length===2 && h.focus.every(finite),
    'HABITAT_FOCUS', h.id, 'focus must be [x,z]');
  if (ordered(h.bounds) && h.focus?.length===2)
    assert(!contains(h.bounds,h.focus), 'HABITAT_FOCUS_INSIDE', h.id, 'focus is inside habitat');
  const p = pathMap.get(h.viewingPath);
  assert(!!p, 'HABITAT_PATH', h.id, `unknown viewing path ${h.viewingPath}`);
  if (p && h.focus?.length===2) assert(pathDistance(h.focus,p) <= p.width/2 + 1e-6,
    'HABITAT_FOCUS_PATH', h.id,
    `focus is ${pathDistance(h.focus,p).toFixed(2)}m from ${p.id}; half-width is ${(p.width/2).toFixed(2)}m`);
  assert(h.serviceGate && Array.isArray(h.serviceGate.center) && h.serviceGate.center.length===2,
    'HABITAT_GATE', h.id, 'service gate needs a [x,z] center');
  for (const s of h.animalSlots || []) {
    assert(Array.isArray(s.uv) && s.uv.length===2 && s.uv.every(n=>finite(n)&&n>0&&n<1),
      'ANIMAL_SLOT', `${h.id}/${s.id}`, 'uv must lie strictly inside 0..1');
  }
}

for (let i=0; i<(bp.habitats||[]).length; i++)
  for (let j=i+1; j<bp.habitats.length; j++) {
    const a=bp.habitats[i], b=bp.habitats[j];
    assert(!overlap(a.bounds,b.bounds), 'HABITAT_OVERLAP', `${a.id}/${b.id}`, 'footprints overlap');
  }

// Public path surfaces may touch a habitat edge, but may not have positive area inside one.
for (const p of (bp.paths||[]).filter(q=>q.access==='public'))
  for (let i=1; i<p.centerline.length; i++) {
    const q=segmentRect(p.centerline[i-1],p.centerline[i],p.width);
    for (const h of bp.habitats || []) assert(!overlap(q,h.bounds), 'PATH_HABITAT',
      `${p.id}/${h.id}`, 'public path surface enters habitat');
  }

const buildingRects = [];
for (const b of bp.buildings || []) {
  assert(ordered(b.footprint), 'BUILDING_BOUNDS', b.id, 'footprint must be ordered');
  if (ordered(b.footprint)) assert(insideRect(b.footprint,site,b.id==='B01-west-gate-pavilion'?.6:0),
    'BUILDING_SITE', b.id, 'outside allowed site/entrance overhang');
  buildingRects.push([b.id,b.footprint]);
  const local = new Set();
  for (const room of b.rooms || []) {
    assert(!local.has(room.id), 'BUILDING_ROOM_ID', `${b.id}/${room.id}`, 'duplicate room ID');
    local.add(room.id);
    const q=rect(room.rect);
    assert(ordered(q), 'BUILDING_ROOM_BOUNDS', `${b.id}/${room.id}`, 'room rect is invalid');
    if (ordered(q)) assert(insideRect(q,b.footprint), 'BUILDING_ROOM_FOOTPRINT',
      `${b.id}/${room.id}`, 'room leaves building footprint');
  }
}
for (let i=0; i<(bp.habitats||[]).length; i++)
  for (const [id,q] of buildingRects) {
    const intentional = bp.habitats[i].id==='H31-waterfowl-lake' && id==='B04-lake-pavilion';
    assert(intentional || !overlap(bp.habitats[i].bounds,q), 'HABITAT_BUILDING',
      `${bp.habitats[i].id}/${id}`, 'unrelated footprints overlap');
  }

for (const w of bp.outerWalls || []) {
  assert(['x','z'].includes(w.axis), 'WALL_AXIS', w.id, `bad axis ${w.axis}`);
  assert(finite(w.at) && Array.isArray(w.range) && w.range.length===2 &&
    w.range.every(finite) && w.range[0]<w.range[1], 'WALL_RANGE', w.id, 'invalid wall run');
  assert(w.bodySolid===true && finite(w.cameraBlockerTop), 'WALL_COLLISION', w.id,
    'outer wall needs body solid and camera blocker top');
}
for (const g of bp.gates || []) assert(g.width >= bp.engineContract.minimumClearOpening,
  'GATE_WIDTH', g.id, `opening ${g.width} below minimum`);

// Every declared service gate appears on at least one keeper route. This catches the easy mistake
// of building a habitat that nobody can ever service.
const keeperPoints = (bp.routes.keeperRoutes || []).flatMap(r=>r.waypoints || []);
for (const h of bp.habitats || []) {
  const g=h.serviceGate.center;
  assert(keeperPoints.some(p=>near(p[0],g[0])&&near(p[1],g[1])), 'KEEPER_GATE_ROUTE', h.id,
    `no keeper route visits gate (${g[0]},${g[1]})`);
}

for (const r of bp.routes.keeperRoutes || []) {
  const pts=r.waypoints || [];
  for (let k=1;k<pts.length;k++) {
    const a=pts[k-1], b=pts[k], len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const n=Math.max(1,Math.ceil(len/bp.coordinateSystem.precision.route));
    for (let i=1;i<n;i++) {
      const t=i/n, p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
      const h=(bp.habitats||[]).find(q=>contains(q.bounds,p));
      if (!h) continue;
      const g=h.serviceGate.center;
      const viaGate=(near(a[0],g[0])&&near(a[1],g[1])) ||
        (near(b[0],g[0])&&near(b[1],g[1]));
      if (!viaGate) error('KEEPER_HABITAT_ENTRY',r.id,
        `segment ${k} enters ${h.id} away from gate (${g[0]},${g[1]})`);
      break;
    }
  }
}

// Public visitor routes: closed, inside the public zone, and clear of every habitat and ground-level
// planned building when sampled at the same 5 cm cadence required by the blueprint.
const publicZone = bp.site.publicZone;
const routeObstacles = (bp.habitats||[]).map(h=>[h.id,h.bounds]).concat(
  buildingRects.filter(([id])=>!['B01-west-gate-pavilion','B06b-conservation-bridge'].includes(id)));
for (const r of bp.routes.visitorLoops || []) {
  const pts=r.waypoints || [];
  assert(r.loop===true && pts.length>2, 'VISITOR_LOOP', r.id, 'must be a closed loop');
  if (pts.length>2) assert(near(pts[0][0],pts.at(-1)[0])&&near(pts[0][1],pts.at(-1)[1]),
    'VISITOR_CLOSURE', r.id, 'first and last points differ');
  for (const p of pts) assert(p[0]>=publicZone.x0&&p[0]<=publicZone.x1&&
    p[1]>=publicZone.z0&&p[1]<=publicZone.z1, 'VISITOR_ZONE', r.id, `point ${p} outside public zone`);
  for (let k=1;k<pts.length;k++) {
    const a=pts[k-1], b=pts[k], len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const n=Math.max(1,Math.ceil(len/bp.coordinateSystem.precision.route));
    for (let i=1;i<n;i++) {
      const t=i/n, p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
      const hit=routeObstacles.find(([,q])=>contains(q,p,bp.engineContract.playerRadius));
      if (hit) { error('VISITOR_COLLISION',r.id,`segment ${k} hits ${hit[0]} near (${p[0].toFixed(2)},${p[1].toFixed(2)})`); break; }
    }
  }
}

if (tropical) {
  const local=tropical.localBounds;
  assert(ordered(local), 'TROPICAL_BOUNDS', tropical.id, 'local bounds invalid');
  for (const room of tropical.rooms || []) {
    const q=rect(room.rect);
    assert(ordered(q), 'TROPICAL_ROOM', room.id, 'room bounds invalid');
    if (ordered(q)) assert(insideRect(q,local), 'TROPICAL_ROOM_SITE', room.id, 'outside local bounds');
  }
  assert(tropical.exit?.destination==='zoo', 'TROPICAL_EXIT', tropical.id, 'exit must return to zoo');
  assert(Array.isArray(tropical.exit?.arrival) && tropical.exit.arrival.length===2,
    'TROPICAL_ARRIVAL', tropical.id, 'exit arrival must be [x,z]');
}

// Geometry is authored on a centimetre plan grid. Yaws and ratios are deliberately excluded.
for (const d of bp.districts || []) for (const n of Object.values(d.bounds))
  assert(grid(n), 'GRID', d.id, `${n} is off the 0.01m grid`);
for (const h of bp.habitats || []) {
  for (const n of Object.values(h.bounds)) assert(grid(n), 'GRID', h.id, `${n} is off-grid`);
  for (const n of h.focus || []) assert(grid(n), 'GRID', h.id, `${n} is off-grid`);
}
for (const p of bp.paths || []) {
  assert(grid(p.width), 'GRID', p.id, `width ${p.width} is off-grid`);
  for (const q of p.centerline || []) for (const n of q) assert(grid(n), 'GRID', p.id, `${n} is off-grid`);
}

finish();

function finish() {
  errors.sort((a,b)=>a.code.localeCompare(b.code)||String(a.id).localeCompare(String(b.id))||
    a.message.localeCompare(b.message));
  if (errors.length) {
    console.error(`FAIL — ${errors.length} zoo blueprint error${errors.length===1?'':'s'}`);
    for (const e of errors) console.error(`${e.code}\t${e.id}\t${e.message}`);
    process.exit(1);
  }
  console.log(`PASS — zoo expansion blueprint r${bp.revision}`);
  console.log(`${bp.districts.length} districts · ${bp.habitats.length} new outdoor habitats · `+
    `${bp.paths.length} planned paths · ${bp.buildings.length} buildings · ${ids.size} stable IDs`);
}
